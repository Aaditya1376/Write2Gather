import mongoose from "mongoose";

const versionSchema = new mongoose.Schema(
  {
    doc: { type: mongoose.Schema.Types.ObjectId, ref: "Doc", required: true, index: true },
    label: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    yjsState: { type: Buffer, required: true },
    preview: { type: String, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Version = mongoose.model("Version", versionSchema);
