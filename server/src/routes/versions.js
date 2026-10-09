import { Router } from "express";
import { Version } from "../models/Version.js";
import { withDoc } from "../middleware/withDoc.js";
import { HttpError, asyncHandler, assertObjectId } from "../utils/http.js";
import { cleanString } from "../utils/validate.js";
import { getCurrentState, restoreSnapshot } from "../socket/index.js";
import { stateToText } from "../utils/yjsText.js";

const router = Router({ mergeParams: true }); // gives access to :id from the parent route
const MAX_VERSIONS = 50;

async function snapshot(docId, userId, label) {
  const state = await getCurrentState(docId);
  const text = state && state.length ? stateToText(state) : "";
  if (!text.trim()) throw new HttpError(400, "This document is empty, nothing to save yet");
  const version = await Version.create({
    doc: docId,
    label,
    createdBy: userId,
    yjsState: state,
    preview: text.slice(0, 1500),
  });
  const extra = await Version.find({ doc: docId }).sort({ createdAt: -1 }).skip(MAX_VERSIONS).select("_id");
  if (extra.length) await Version.deleteMany({ _id: { $in: extra.map((v) => v._id) } });
  return version;
}

const present = (v) => ({
  id: String(v._id),
  label: v.label,
  createdAt: v.createdAt,
  createdBy: v.createdBy ? { id: String(v.createdBy._id), name: v.createdBy.name } : null,
});

router.get(
  "/",
  withDoc("viewer"),
  asyncHandler(async (req, res) => {
    const versions = await Version.find({ doc: req.doc._id })
      .select("-yjsState -preview")
      .sort({ createdAt: -1 })
      .populate("createdBy", "name");
    res.json({ versions: versions.map(present) });
  })
);

router.get(
  "/:versionId",
  withDoc("viewer"),
  asyncHandler(async (req, res) => {
    assertObjectId(req.params.versionId, "Version");
    const v = await Version.findOne({ _id: req.params.versionId, doc: req.doc._id })
      .select("-yjsState")
      .populate("createdBy", "name");
    if (!v) throw new HttpError(404, "Version not found");
    res.json({ version: { ...present(v), preview: v.preview } });
  })
);

router.post(
  "/",
  withDoc("editor"),
  asyncHandler(async (req, res) => {
    const label = req.body.label ? cleanString(req.body.label, { field: "Label", max: 80 }) : "Manual save";
    const v = await snapshot(req.doc._id, req.userId, label);
    await v.populate("createdBy", "name");
    res.status(201).json({ version: present(v) });
  })
);

router.post(
  "/:versionId/restore",
  withDoc("editor"),
  asyncHandler(async (req, res) => {
    assertObjectId(req.params.versionId, "Version");
    const target = await Version.findOne({ _id: req.params.versionId, doc: req.doc._id });
    if (!target) throw new HttpError(404, "Version not found");

    // Safety net: keep the current content so the restore itself can be undone.
    try {
      await snapshot(req.doc._id, req.userId, "Before restore");
    } catch {
      /* empty document: nothing to back up */
    }
    await restoreSnapshot(String(req.doc._id), target.yjsState);
    res.json({ ok: true });
  })
);

export default router;
