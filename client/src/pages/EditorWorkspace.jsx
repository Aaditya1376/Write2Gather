import { useEffect, useMemo, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link2 from "@tiptap/extension-link";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import { Check, CloudOff, History, MessageSquare, Moon, Share2, Sun, Eye } from "lucide-react";
import Avatar from "../components/Avatar.jsx";
import Logo from "../components/Logo.jsx";
import Toolbar from "../components/Toolbar.jsx";
import ShareDialog from "../components/ShareDialog.jsx";
import VersionPanel from "../components/VersionPanel.jsx";
import CommentPanel from "../components/CommentPanel.jsx";
import ExportMenu from "../components/ExportMenu.jsx";
import { api } from "../lib/api.js";
import { colorForUser } from "../lib/format.js";
import { useComments } from "../lib/useComments.js";
import { useTheme } from "../lib/useTheme.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";

// Draws the other people's cursors (a coloured caret with their name above it)
function renderCursor(user) {
  const caret = document.createElement("span");
  caret.classList.add("collab-caret");
  caret.style.borderColor = user.color;

  const label = document.createElement("span");
  label.classList.add("collab-label");
  label.style.backgroundColor = user.color;
  label.textContent = user.name;
  caret.appendChild(label);
  return caret;
}

export default function EditorWorkspace({ meta, setMeta, ydoc, provider, role, presence, online, savedAt }) {
  const { user } = useAuth();
  const toast = useToast();
  const { theme, toggle } = useTheme();
  const canEdit = role === "owner" || role === "editor";

  const [title, setTitle] = useState(meta.title);
  const [panel, setPanel] = useState(null); // "comments" | "history" | null
  const [showShare, setShowShare] = useState(false);
  const [saveState, setSaveState] = useState("saved"); // "saved" | "saving"
  const [stats, setStats] = useState({ words: 0, chars: 0 });
  const commentData = useComments(meta.id);
  const openComments = commentData.comments.filter((c) => !c.resolved).length;

  const extensions = useMemo(
    () => [
      // StarterKit's own undo history must be OFF: Yjs provides collaborative undo instead.
      StarterKit.configure({ history: false }),
      Underline,
      Link2.configure({ openOnClick: false, autolink: true }),
      Highlight,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: "Start writing..." }),
      Collaboration.configure({ document: ydoc, field: "default" }),
      CollaborationCursor.configure({
        provider,
        user: { name: user.name, color: colorForUser(user.id) },
        render: renderCursor,
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ydoc, provider]
  );

  const editor = useEditor({ extensions, editable: canEdit }, [extensions]);

  // Viewers get a read-only editor. This also reacts live when the owner changes your role.
  useEffect(() => {
    editor?.setEditable(canEdit);
  }, [editor, canEdit]);

  // word count + "Saving..." indicator
  useEffect(() => {
    if (!editor) return;
    const count = () => {
      const text = editor.getText();
      setStats({ words: text.trim() ? text.trim().split(/\s+/).length : 0, chars: text.length });
    };
    const onUpdate = () => {
      setSaveState("saving");
      count();
    };
    count();
    editor.on("update", onUpdate);
    return () => editor.off("update", onUpdate);
  }, [editor]);

  useEffect(() => {
    if (savedAt) setSaveState("saved");
  }, [savedAt]);

  async function commitTitle() {
    const next = title.trim();
    if (!next) return setTitle(meta.title);
    if (next === meta.title) return;
    try {
      const { doc } = await api.patch(`/api/docs/${meta.id}`, { title: next });
      setMeta({ ...meta, title: doc.title });
      document.title = `${doc.title} - Write2Gather`;
    } catch (err) {
      toast.error(err.message);
      setTitle(meta.title);
    }
  }

  const togglePanel = (name) => setPanel((p) => (p === name ? null : name));
  const others = presence.filter((p) => p.id !== user.id);

  const statusLabel = !online ? (
    <span className="status warn"><CloudOff size={14} /> Offline - changes will sync</span>
  ) : saveState === "saving" ? (
    <span className="status">Saving...</span>
  ) : (
    <span className="status ok"><Check size={14} /> Saved</span>
  );

  return (
    <div className="editor-page">
      <header className="editor-top">
        <Logo to="/" />
        <div className="title-wrap">
          <input
            className="title-input"
            value={title}
            disabled={!canEdit}
            maxLength={120}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            aria-label="Document title"
          />
          <div className="title-sub">
            {statusLabel}
            {!canEdit && <span className="status"><Eye size={14} /> View only</span>}
          </div>
        </div>

        <div className="editor-actions">
          <div className="presence" title={others.length ? others.map((p) => p.name).join(", ") + " here now" : "Only you are here"}>
            {others.slice(0, 4).map((p) => <Avatar key={p.id} user={p} size={30} ring />)}
            {others.length > 4 && <span className="avatar more">+{others.length - 4}</span>}
          </div>
          <button className="icon-btn" onClick={toggle} aria-label="Toggle dark mode">{theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}</button>
          <button className={`btn ${panel === "comments" ? "btn-active" : ""}`} onClick={() => togglePanel("comments")}>
            <MessageSquare size={16} /> Comments{openComments > 0 && <span className="count">{openComments}</span>}
          </button>
          <button className={`btn ${panel === "history" ? "btn-active" : ""}`} onClick={() => togglePanel("history")}><History size={16} /> History</button>
          <ExportMenu editor={editor} title={meta.title} />
          <button className="btn btn-primary" onClick={() => setShowShare(true)}><Share2 size={16} /> Share</button>
        </div>
      </header>

      <Toolbar editor={editor} disabled={!canEdit} />

      <div className="editor-body">
        <main className="paper-wrap">
          <div className="paper">
            <EditorContent editor={editor} />
          </div>
          <div className="statusbar">{stats.words} words - {stats.chars} characters</div>
        </main>

        {panel && (
          <aside className="side-panel">
            <div className="panel-title">
              {panel === "comments" ? "Comments" : "Version history"}
              <button className="icon-btn" onClick={() => setPanel(null)} aria-label="Close panel">&times;</button>
            </div>
            {panel === "comments" && <CommentPanel docId={meta.id} editor={editor} role={role} data={commentData} />}
            {panel === "history" && <VersionPanel docId={meta.id} canEdit={canEdit} />}
          </aside>
        )}
      </div>

      {showShare && <ShareDialog docId={meta.id} isOwner={role === "owner"} onClose={() => setShowShare(false)} />}
    </div>
  );
}
