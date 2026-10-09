import { Router } from "express";
import { Comment } from "../models/Comment.js";
import { withDoc } from "../middleware/withDoc.js";
import { HttpError, asyncHandler, assertObjectId } from "../utils/http.js";
import { cleanString } from "../utils/validate.js";
import { hasRole } from "../utils/permissions.js";
import { emitToDoc } from "../socket/index.js";

const router = Router({ mergeParams: true });

const person = (u) => (u ? { id: String(u._id), name: u.name } : { id: "", name: "Deleted user" });
const present = (c) => ({
  id: String(c._id),
  text: c.text,
  quote: c.quote,
  resolved: c.resolved,
  author: person(c.author),
  createdAt: c.createdAt,
  replies: c.replies.map((r) => ({ id: String(r._id), text: r.text, author: person(r.author), createdAt: r.createdAt })),
});

const load = (id) => Comment.findById(id).populate("author", "name").populate("replies.author", "name");
const changed = (docId) => emitToDoc(String(docId), "comments:changed");

// Anyone who can open the document can read and write comments.
router.get(
  "/",
  withDoc("viewer"),
  asyncHandler(async (req, res) => {
    const comments = await Comment.find({ doc: req.doc._id })
      .sort({ createdAt: 1 })
      .populate("author", "name")
      .populate("replies.author", "name");
    res.json({ comments: comments.map(present) });
  })
);

router.post(
  "/",
  withDoc("viewer"),
  asyncHandler(async (req, res) => {
    const text = cleanString(req.body.text, { field: "Comment", max: 2000 });
    const quote = typeof req.body.quote === "string" ? req.body.quote.trim().slice(0, 300) : "";
    const c = await Comment.create({ doc: req.doc._id, author: req.userId, text, quote });
    changed(req.doc._id);
    res.status(201).json({ comment: present(await load(c._id)) });
  })
);

async function findComment(req) {
  assertObjectId(req.params.commentId, "Comment");
  const c = await Comment.findOne({ _id: req.params.commentId, doc: req.doc._id });
  if (!c) throw new HttpError(404, "Comment not found");
  return c;
}

router.post(
  "/:commentId/replies",
  withDoc("viewer"),
  asyncHandler(async (req, res) => {
    const c = await findComment(req);
    c.replies.push({ author: req.userId, text: cleanString(req.body.text, { field: "Reply", max: 2000 }) });
    await c.save();
    changed(req.doc._id);
    res.status(201).json({ comment: present(await load(c._id)) });
  })
);

// Resolve / reopen: editors, owner, or the comment author
router.patch(
  "/:commentId",
  withDoc("viewer"),
  asyncHandler(async (req, res) => {
    const c = await findComment(req);
    const isAuthor = String(c.author) === req.userId;
    if (!isAuthor && !hasRole(req.role, "editor")) throw new HttpError(403, "You cannot change this comment");
    c.resolved = Boolean(req.body.resolved);
    await c.save();
    changed(req.doc._id);
    res.json({ comment: present(await load(c._id)) });
  })
);

// Delete: the author or the document owner
router.delete(
  "/:commentId",
  withDoc("viewer"),
  asyncHandler(async (req, res) => {
    const c = await findComment(req);
    if (String(c.author) !== req.userId && req.role !== "owner") throw new HttpError(403, "You cannot delete this comment");
    await c.deleteOne();
    changed(req.doc._id);
    res.json({ ok: true });
  })
);

export default router;
