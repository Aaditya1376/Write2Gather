import { useCallback, useEffect, useState } from "react";
import { History, RotateCcw, Save } from "lucide-react";
import { api } from "../lib/api.js";
import { timeAgo } from "../lib/format.js";
import { useToast } from "../context/ToastContext.jsx";

export default function VersionPanel({ docId, canEdit }) {
  const toast = useToast();
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState("");
  const [selected, setSelected] = useState(null); // { ...version, preview }
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setVersions((await api.get(`/api/docs/${docId}/versions`)).versions);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [docId, toast]);

  useEffect(() => { load(); }, [load]);

  async function saveVersion(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post(`/api/docs/${docId}/versions`, { label: label.trim() || undefined });
      setLabel("");
      toast.success("Version saved");
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function open(v) {
    try {
      setSelected((await api.get(`/api/docs/${docId}/versions/${v.id}`)).version);
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function restore() {
    if (!window.confirm("Replace the current document with this version? The current content is saved as a version first, so you can undo this.")) return;
    setBusy(true);
    try {
      await api.post(`/api/docs/${docId}/versions/${selected.id}/restore`);
      toast.success("Version restored");
      setSelected(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel-body">
      {canEdit && (
        <form onSubmit={saveVersion} className="row gap-sm">
          <input placeholder="Name this version (optional)" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={80} style={{ flex: 1 }} />
          <button className="btn btn-primary" disabled={busy} title="Save a snapshot now"><Save size={16} /></button>
        </form>
      )}

      {selected ? (
        <div className="stack">
          <button className="link-btn" onClick={() => setSelected(null)}>&larr; All versions</button>
          <div><strong>{selected.label || "Version"}</strong><div className="muted small">{new Date(selected.createdAt).toLocaleString()}{selected.createdBy ? ` - ${selected.createdBy.name}` : ""}</div></div>
          <pre className="version-preview">{selected.preview || "(empty)"}</pre>
          {canEdit && <button className="btn btn-primary" onClick={restore} disabled={busy}><RotateCcw size={16} /> Restore this version</button>}
        </div>
      ) : loading ? (
        <div className="spinner" />
      ) : versions.length === 0 ? (
        <div className="panel-empty"><History size={28} /><p className="muted">No versions yet. They appear automatically while you write.</p></div>
      ) : (
        <ul className="version-list">
          {versions.map((v) => (
            <li key={v.id}>
              <button onClick={() => open(v)}>
                <strong>{v.label || "Version"}</strong>
                <span className="muted small">{timeAgo(v.createdAt)}{v.createdBy ? ` - ${v.createdBy.name}` : ""}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
