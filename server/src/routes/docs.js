import { Router } from "express";
import { Doc } from "../models/Doc.js";
import { User } from "../models/User.js";
import { Version } from "../models/Version.js";
import { Comment } from "../models/Comment.js";
import { requireAuth } from "../middleware/auth.js";
import { withDoc } from "../middleware/withDoc.js";
import { HttpError, asyncHandler, assertObjectId } from "../utils/http.js";
import { cleanEmail, cleanString, oneOf } from "../utils/validate.js";
import { getRole } from "../utils/permissions.js";
import { refreshPermissions, releaseIfEmpty } from "../socket/index.js";
import versionsRouter from "./versions.js";
import commentsRouter from "./comments.js";

const router = Router();
router.use(requireAuth);

const publicUser = (u) => (u ? { id: String(u._id), name: u.name, email: u.email } : null);

// Full details of one document (used by the editor page)
function serialize(doc, role) {
  return {
    id: String(doc._id),
    title: doc.title,
    role,
    linkRole: doc.linkRole,
    owner: publicUser(doc.owner),
    collaborators: doc.collaborators
      .filter((c) => c.user)
      .map((c) => ({ user: publicUser(c.user), role: c.role })),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// LIST: ?q=search&filter=all|owned|shared
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const me = req.userId;
    const filter = ["owned", "shared"].includes(req.query.filter) ? req.query.filter : "all";
    const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 80) : "";

    const access =
      filter === "owned"
        ? { owner: me }
        : filter === "shared"
        ? { "collaborators.user": me }
        : { $or: [{ owner: me }, { "collaborators.user": me }] };

    const query = { $and: [access] };
    if (q) {
      const rx = new RegExp(escapeRegex(q), "i");
      query.$and.push({ $or: [{ title: rx }, { contentText: rx }] });
    }

    const docs = await Doc.find(query)
      .select("-yjsState")
      .sort({ updatedAt: -1 })
      .limit(200)
      .populate("owner", "name email");

    res.json({
      docs: docs.map((d) => ({
        id: String(d._id),
        title: d.title,
        role: getRole(d, me),
        owner: publicUser(d.owner),
        preview: d.contentText.replace(/\s+/g, " ").trim().slice(0, 140),
        collaboratorCount: d.collaborators.length,
        updatedAt: d.updatedAt,
      })),
    });
  })
);

// CREATE
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const title = req.body.title ? cleanString(req.body.title, { field: "Title", max: 120 }) : "Untitled document";
    const doc = await Doc.create({ title, owner: req.userId });
    res.status(201).json({ id: String(doc._id), title: doc.title });
  })
);

// READ one
router.get("/:id", withDoc("viewer"), (req, res) => {
  res.json({ doc: serialize(req.doc, req.role) });
});

// RENAME
router.patch(
  "/:id",
  withDoc("editor"),
  asyncHandler(async (req, res) => {
    req.doc.title = cleanString(req.body.title, { field: "Title", max: 120 });
    await req.doc.save();
    res.json({ doc: serialize(req.doc, req.role) });
  })
);

// DELETE (owner only)
router.delete(
  "/:id",
  withDoc("owner"),
  asyncHandler(async (req, res) => {
    const id = req.doc._id;
    await Promise.all([Doc.deleteOne({ _id: id }), Version.deleteMany({ doc: id }), Comment.deleteMany({ doc: id })]);
    await refreshPermissions(String(id)); // kicks anyone still inside
    await releaseIfEmpty(String(id));
    res.json({ ok: true });
  })
);

// ---------- sharing (owner only) ----------
// These use atomic MongoDB updates ($push / $pull / positional $) instead of editing the
// loaded document, which is simpler and avoids race conditions between two requests.

async function sharingResponse(req, res) {
  const id = String(req.doc._id);
  await refreshPermissions(id); // push new permissions to anyone currently editing
  const fresh = await Doc.findById(id)
    .select("-yjsState")
    .populate("owner", "name email")
    .populate("collaborators.user", "name email");
  res.json({ doc: serialize(fresh, req.role) });
}

router.post(
  "/:id/collaborators",
  withDoc("owner"),
  asyncHandler(async (req, res) => {
    const email = cleanEmail(req.body.email);
    const role = oneOf(req.body.role || "viewer", ["viewer", "editor"], "Role");

    const person = await User.findOne({ email });
    if (!person) throw new HttpError(404, "No Write2Gather account uses that email yet");
    if (String(person._id) === String(req.doc.owner._id)) throw new HttpError(400, "You already own this document");

    // Already a collaborator? Just change their role. Otherwise add them.
    const updated = await Doc.updateOne(
      { _id: req.doc._id, "collaborators.user": person._id },
      { $set: { "collaborators.$.role": role } }
    );
    if (updated.matchedCount === 0) {
      await Doc.updateOne({ _id: req.doc._id }, { $push: { collaborators: { user: person._id, role } } });
    }
    await sharingResponse(req, res);
  })
);

router.patch(
  "/:id/collaborators/:userId",
  withDoc("owner"),
  asyncHandler(async (req, res) => {
    assertObjectId(req.params.userId, "User");
    const role = oneOf(req.body.role, ["viewer", "editor"], "Role");
    const result = await Doc.updateOne(
      { _id: req.doc._id, "collaborators.user": req.params.userId },
      { $set: { "collaborators.$.role": role } }
    );
    if (result.matchedCount === 0) throw new HttpError(404, "That person is not a collaborator");
    await sharingResponse(req, res);
  })
);

router.delete(
  "/:id/collaborators/:userId",
  withDoc("owner"),
  asyncHandler(async (req, res) => {
    assertObjectId(req.params.userId, "User");
    await Doc.updateOne({ _id: req.doc._id }, { $pull: { collaborators: { user: req.params.userId } } });
    await sharingResponse(req, res);
  })
);

router.patch(
  "/:id/link",
  withDoc("owner"),
  asyncHandler(async (req, res) => {
    const linkRole = oneOf(req.body.linkRole, ["none", "viewer", "editor"], "linkRole");
    await Doc.updateOne({ _id: req.doc._id }, { $set: { linkRole } });
    await sharingResponse(req, res);
  })
);

// Nested resources: /api/docs/:id/versions and /api/docs/:id/comments
router.use("/:id/versions", versionsRouter);
router.use("/:id/comments", commentsRouter);

export default router;
