import { useEffect, useState } from "react";
import { Copy, Globe, Lock, Trash2 } from "lucide-react";
import Modal from "./Modal.jsx";
import Avatar from "./Avatar.jsx";
import { api } from "../lib/api.js";
import { useToast } from "../context/ToastContext.jsx";

export default function ShareDialog({ docId, isOwner, onClose }) {
  const toast = useToast();
  const [doc, setDoc] = useState(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("editor");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get(`/api/docs/${docId}`).then((d) => setDoc(d.doc)).catch((e) => toast.error(e.message));
  }, [docId, toast]);

  // Runs a sharing request and stores the updated document that the API returns.
  async function run(promise, okMessage) {
    setBusy(true);
    try {
      const { doc } = await promise;
      setDoc(doc);
      if (okMessage) toast.success(okMessage);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  const invite = async (e) => {
    e.preventDefault();
    await run(api.post(`/api/docs/${docId}/collaborators`, { email, role }), "Invitation sent");
    setEmail("");
  };

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/doc/${docId}`);
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy. Copy it from the address bar instead.");
    }
  }

  return (
    <Modal title="Share document" onClose={onClose} width={520}>
      {!doc ? (
        <div className="spinner" />
      ) : (
        <div className="stack">
          {isOwner && (
            <form onSubmit={invite} className="row gap-sm">
              <input type="email" required placeholder="Add people by email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ flex: 1 }} />
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
              <button className="btn btn-primary" disabled={busy}>Invite</button>
            </form>
          )}

          <ul className="people">
            <li>
              <Avatar user={doc.owner} />
              <div className="grow"><strong>{doc.owner.name}</strong><div className="muted small">{doc.owner.email}</div></div>
              <span className="muted small">Owner</span>
            </li>
            {doc.collaborators.map((c) => (
              <li key={c.user.id}>
                <Avatar user={c.user} />
                <div className="grow"><strong>{c.user.name}</strong><div className="muted small">{c.user.email}</div></div>
                {isOwner ? (
                  <>
                    <select value={c.role} disabled={busy} onChange={(e) => run(api.patch(`/api/docs/${docId}/collaborators/${c.user.id}`, { role: e.target.value }))}>
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    <button className="icon-btn" aria-label={`Remove ${c.user.name}`} disabled={busy} onClick={() => run(api.delete(`/api/docs/${docId}/collaborators/${c.user.id}`), "Access removed")}>
                      <Trash2 size={16} />
                    </button>
                  </>
                ) : (
                  <span className="muted small">{c.role}</span>
                )}
              </li>
            ))}
          </ul>

          <div className="link-box">
            <span className="link-icon">{doc.linkRole === "none" ? <Lock size={18} /> : <Globe size={18} />}</span>
            <div className="grow">
              <strong>{doc.linkRole === "none" ? "Restricted" : "Anyone with the link"}</strong>
              <div className="muted small">
                {doc.linkRole === "none" ? "Only people you invite can open this." : `Logged-in people with the link can ${doc.linkRole === "editor" ? "edit" : "view"}.`}
              </div>
            </div>
            {isOwner && (
              <select value={doc.linkRole} disabled={busy} onChange={(e) => run(api.patch(`/api/docs/${docId}/link`, { linkRole: e.target.value }))}>
                <option value="none">Off</option>
                <option value="viewer">Can view</option>
                <option value="editor">Can edit</option>
              </select>
            )}
          </div>

          <div className="row end">
            <button className="btn" onClick={copyLink}><Copy size={16} /> Copy link</button>
            <button className="btn btn-primary" onClick={onClose}>Done</button>
          </div>
        </div>
      )}
    </Modal>
  );
}
