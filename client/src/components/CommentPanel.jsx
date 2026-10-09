import { useEffect, useState } from "react";
import { Check, MessageSquare, RotateCcw, Trash2 } from "lucide-react";
import Avatar from "./Avatar.jsx";
import { api } from "../lib/api.js";
import { timeAgo } from "../lib/format.js";
import { useToast } from "../context/ToastContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function CommentPanel({ docId, editor, role, data }) {
  const { user } = useAuth();
  const toast = useToast();
  const { comments, loading, reload } = data;
  const [text, setText] = useState("");
  const [quote, setQuote] = useState("");
  const [showResolved, setShowResolved] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [replyText, setReplyText] = useState("");

  // Remember the most recent non-empty text selection, so the comment can quote it.
  useEffect(() => {
    if (!editor) return;
    const grab = () => {
      const { from, to } = editor.state.selection;
      if (from !== to) setQuote(editor.state.doc.textBetween(from, to, " ").slice(0, 300));
    };
    grab();
    editor.on("selectionUpdate", grab);
    return () => editor.off("selectionUpdate", grab);
  }, [editor]);

  async function act(promise, okMessage) {
    try {
      await promise;
      if (okMessage) toast.success(okMessage);
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function add(e) {
    e.preventDefault();
    if (!text.trim()) return;
    await act(api.post(`/api/docs/${docId}/comments`, { text, quote }));
    setText("");
    setQuote("");
  }

  async function sendReply(e, id) {
    e.preventDefault();
    if (!replyText.trim()) return;
    await act(api.post(`/api/docs/${docId}/comments/${id}/replies`, { text: replyText }));
    setReplyText("");
    setReplyTo(null);
  }

  const visible = comments.filter((c) => showResolved || !c.resolved);
  const resolvedCount = comments.filter((c) => c.resolved).length;

  return (
    <div className="panel-body">
      <form onSubmit={add} className="stack">
        {quote && (
          <div className="quote-chip">
            <span>"{quote.length > 90 ? quote.slice(0, 90) + "..." : quote}"</span>
            <button type="button" className="link-btn" onClick={() => setQuote("")}>clear</button>
          </div>
        )}
        <textarea rows={3} placeholder={quote ? "Comment on the selected text..." : "Add a comment (select text first to quote it)"} value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} />
        <div><button className="btn btn-primary" disabled={!text.trim()}>Comment</button></div>
      </form>

      {resolvedCount > 0 && (
        <label className="check small">
          <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} /> Show resolved ({resolvedCount})
        </label>
      )}

      {loading ? (
        <div className="spinner" />
      ) : visible.length === 0 ? (
        <div className="panel-empty"><MessageSquare size={28} /><p className="muted">No comments yet.</p></div>
      ) : (
        <ul className="comment-list">
          {visible.map((c) => {
            const canResolve = c.author.id === user.id || role === "owner" || role === "editor";
            const canDelete = c.author.id === user.id || role === "owner";
            return (
              <li key={c.id} className={`comment ${c.resolved ? "resolved" : ""}`}>
                <div className="comment-head">
                  <Avatar user={c.author} size={26} />
                  <div className="grow"><strong>{c.author.name}</strong> <span className="muted small">{timeAgo(c.createdAt)}</span></div>
                  {canResolve && (
                    <button className="icon-btn" title={c.resolved ? "Reopen" : "Resolve"} aria-label={c.resolved ? "Reopen" : "Resolve"} onClick={() => act(api.patch(`/api/docs/${docId}/comments/${c.id}`, { resolved: !c.resolved }))}>
                      {c.resolved ? <RotateCcw size={15} /> : <Check size={15} />}
                    </button>
                  )}
                  {canDelete && (
                    <button className="icon-btn" title="Delete" aria-label="Delete comment" onClick={() => window.confirm("Delete this comment?") && act(api.delete(`/api/docs/${docId}/comments/${c.id}`))}>
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
                {c.quote && <blockquote className="comment-quote">{c.quote}</blockquote>}
                <p>{c.text}</p>

                {c.replies.map((r) => (
                  <div key={r.id} className="reply">
                    <Avatar user={r.author} size={22} />
                    <div><strong>{r.author.name}</strong> <span className="muted small">{timeAgo(r.createdAt)}</span><p>{r.text}</p></div>
                  </div>
                ))}

                {replyTo === c.id ? (
                  <form onSubmit={(e) => sendReply(e, c.id)} className="row gap-sm">
                    <input autoFocus placeholder="Reply..." value={replyText} onChange={(e) => setReplyText(e.target.value)} maxLength={2000} style={{ flex: 1 }} />
                    <button className="btn btn-primary" disabled={!replyText.trim()}>Send</button>
                  </form>
                ) : (
                  <button className="link-btn" onClick={() => { setReplyTo(c.id); setReplyText(""); }}>Reply</button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
