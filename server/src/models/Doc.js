import mongoose from "mongoose";

const collaboratorSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["viewer", "editor"], default: "viewer" },
  },
  { _id: false }
);

const docSchema = new mongoose.Schema(
  {
    title: { type: String, default: "Untitled document", trim: true, maxlength: 120 },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    collaborators: [collaboratorSchema],
    // Link sharing: anyone logged in with the link gets this role. "none" = off.
    linkRole: { type: String, enum: ["none", "viewer", "editor"], default: "none" },
    // The whole Yjs document stored as binary. This IS the document content.
    yjsState: { type: Buffer, default: null },
    // Plain-text copy of the content, kept only for search and card previews.
    contentText: { type: String, default: "" },
  },
  { timestamps: true }
);

docSchema.index({ "collaborators.user": 1 });

export const Doc = mongoose.model("Doc", docSchema);
