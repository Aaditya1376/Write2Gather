import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, MoreVertical, Pencil, Plus, Search, Trash2, Users } from "lucide-react";
import Navbar from "../components/Navbar.jsx";
import Modal from "../components/Modal.jsx";
import { api } from "../lib/api.js";
import { timeAgo } from "../lib/format.js";
import { useToast } from "../context/ToastContext.jsx";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "owned", label: "Owned by me" },
  { id: "shared", label: "Shared with me" },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const toast = useToast();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [menuFor, setMenuFor] = useState(null);
  const [renaming, setRenaming] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const id = ++requestId.current; // ignore answers that arrive late and out of order
    try {
      const { docs } = await api.get(`/api/docs?filter=${filter}&q=${encodeURIComponent(query)}`);
      if (id === requestId.current) setDocs(docs);
    } catch (err) {
      toast.error(err.message);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [filter, query, toast]);

  // Wait 250 ms after the last keystroke before searching (debounce)
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    const close = () => setMenuFor(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  async function createDoc() {
    try {
      const { id } = await api.post("/api/docs", {});
      navigate(`/doc/${id}`);
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function rename(e) {
    e.preventDefault();
    try {
      await api.patch(`/api/docs/${renaming.id}`, { title: renaming.title });
      setRenaming(null);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function remove() {
    try {
      await api.delete(`/api/docs/${deleting.id}`);
      toast.success("Document deleted");
      setDeleting(null);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <>
      <Navbar />
      <main className="page">
        <div className="page-head">
          <div>
            <h1>Your documents</h1>
            <p className="muted">Create, search and share everything you write.</p>
          </div>
          <button className="btn btn-primary" onClick={createDoc}><Plus size={18} /> New document</button>
        </div>

        <div className="toolbar-row">
          <div className="search">
            <Search size={16} />
            <input placeholder="Search titles and content..." value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="tabs">
            {FILTERS.map((f) => (
              <button key={f.id} className={`tab ${filter === f.id ? "active" : ""}`} onClick={() => setFilter(f.id)}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid">{[1, 2, 3, 4].map((n) => <div key={n} className="doc-card skeleton" />)}</div>
        ) : docs.length === 0 ? (
          <div className="empty">
            <FileText size={40} />
            <h3>{query ? "Nothing matches your search" : "No documents yet"}</h3>
            <p className="muted">{query ? "Try a different word." : "Create your first document to get started."}</p>
            {!query && <button className="btn btn-primary" onClick={createDoc}><Plus size={18} /> New document</button>}
          </div>
        ) : (
          <div className="grid">
            {docs.map((d) => (
              <article key={d.id} className="doc-card" onClick={() => navigate(`/doc/${d.id}`)}>
                <div className="doc-card-top">
                  <span className={`badge badge-${d.role}`}>{d.role}</span>
                  {d.role === "owner" && (
                    <div className="menu-wrap" onClick={(e) => e.stopPropagation()}>
                      <button className="icon-btn" aria-label="Options" onClick={(e) => { e.stopPropagation(); setMenuFor(menuFor === d.id ? null : d.id); }}>
                        <MoreVertical size={16} />
                      </button>
                      {menuFor === d.id && (
                        <div className="menu">
                          <button onClick={() => { setRenaming({ id: d.id, title: d.title }); setMenuFor(null); }}><Pencil size={14} /> Rename</button>
                          <button className="danger" onClick={() => { setDeleting(d); setMenuFor(null); }}><Trash2 size={14} /> Delete</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <h3>{d.title}</h3>
                <p className="preview">{d.preview || "Empty document"}</p>
                <div className="doc-card-foot">
                  <span>{d.role === "owner" ? "You" : d.owner?.name} - {timeAgo(d.updatedAt)}</span>
                  {d.collaboratorCount > 0 && <span className="row gap-xs"><Users size={14} /> {d.collaboratorCount}</span>}
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {renaming && (
        <Modal title="Rename document" onClose={() => setRenaming(null)}>
          <form onSubmit={rename} className="stack">
            <input autoFocus value={renaming.title} onChange={(e) => setRenaming({ ...renaming, title: e.target.value })} maxLength={120} required />
            <div className="row end"><button type="button" className="btn" onClick={() => setRenaming(null)}>Cancel</button><button className="btn btn-primary">Save</button></div>
          </form>
        </Modal>
      )}
      {deleting && (
        <Modal title="Delete document?" onClose={() => setDeleting(null)}>
          <p>"{deleting.title}" and its comments and history will be deleted for everyone. This cannot be undone.</p>
          <div className="row end"><button className="btn" onClick={() => setDeleting(null)}>Cancel</button><button className="btn btn-danger" onClick={remove}>Delete</button></div>
        </Modal>
      )}
    </>
  );
}
