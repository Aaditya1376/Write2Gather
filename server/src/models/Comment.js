import mongoose from "mongoose";

const replySchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  text: { type: String, required: true, maxlength: 2000 },
  createdAt: { type: Date, default: Date.now },
});

const commentSchema = new mongoose.Schema(
  {
    doc: { type: mongoose.Schema.Types.ObjectId, ref: "Doc", required: true, index: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, maxlength: 2000 },
    quote: { type: String, default: "", maxlength: 300 }, // the text the comment is about
    resolved: { type: Boolean, default: false },
    replies: [replySchema],
  },
  { timestamps: true }
);

export const Comment = mongoose.model("Comment", commentSchema);
