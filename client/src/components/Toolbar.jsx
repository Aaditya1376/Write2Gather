import {
  AlignCenter, AlignLeft, AlignRight, Bold, Code, Code2, Heading1, Heading2, Heading3, Highlighter,
  Italic, Link2, List, ListChecks, ListOrdered, Minus, Quote, Redo2, Strikethrough, Underline, Undo2,
} from "lucide-react";

function Btn({ label, active, disabled, onClick, children }) {
  return (
    <button
      type="button"
      className={`tb-btn ${active ? "active" : ""}`}
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      // keep the editor selection when clicking toolbar buttons
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

const Sep = () => <span className="tb-sep" />;

export default function Toolbar({ editor, disabled }) {
  if (!editor) return null;
  const chain = () => editor.chain().focus();
  const is = (name, attrs) => editor.isActive(name, attrs);

  function setLink() {
    const previous = editor.getAttributes("link").href || "";
    const url = window.prompt("Link address (leave empty to remove the link)", previous);
    if (url === null) return;
    if (url.trim() === "") return chain().extendMarkRange("link").unsetLink().run();
    const href = /^(https?:|mailto:)/i.test(url.trim()) ? url.trim() : `https://${url.trim()}`;
    chain().extendMarkRange("link").setLink({ href }).run();
  }

  return (
    <div className="toolbar" role="toolbar" aria-label="Formatting">
      <Btn label="Undo" disabled={disabled} onClick={() => chain().undo().run()}><Undo2 size={16} /></Btn>
      <Btn label="Redo" disabled={disabled} onClick={() => chain().redo().run()}><Redo2 size={16} /></Btn>
      <Sep />
      <Btn label="Heading 1" disabled={disabled} active={is("heading", { level: 1 })} onClick={() => chain().toggleHeading({ level: 1 }).run()}><Heading1 size={16} /></Btn>
      <Btn label="Heading 2" disabled={disabled} active={is("heading", { level: 2 })} onClick={() => chain().toggleHeading({ level: 2 }).run()}><Heading2 size={16} /></Btn>
      <Btn label="Heading 3" disabled={disabled} active={is("heading", { level: 3 })} onClick={() => chain().toggleHeading({ level: 3 }).run()}><Heading3 size={16} /></Btn>
      <Sep />
      <Btn label="Bold" disabled={disabled} active={is("bold")} onClick={() => chain().toggleBold().run()}><Bold size={16} /></Btn>
      <Btn label="Italic" disabled={disabled} active={is("italic")} onClick={() => chain().toggleItalic().run()}><Italic size={16} /></Btn>
      <Btn label="Underline" disabled={disabled} active={is("underline")} onClick={() => chain().toggleUnderline().run()}><Underline size={16} /></Btn>
      <Btn label="Strikethrough" disabled={disabled} active={is("strike")} onClick={() => chain().toggleStrike().run()}><Strikethrough size={16} /></Btn>
      <Btn label="Highlight" disabled={disabled} active={is("highlight")} onClick={() => chain().toggleHighlight().run()}><Highlighter size={16} /></Btn>
      <Btn label="Inline code" disabled={disabled} active={is("code")} onClick={() => chain().toggleCode().run()}><Code size={16} /></Btn>
      <Sep />
      <Btn label="Bullet list" disabled={disabled} active={is("bulletList")} onClick={() => chain().toggleBulletList().run()}><List size={16} /></Btn>
      <Btn label="Numbered list" disabled={disabled} active={is("orderedList")} onClick={() => chain().toggleOrderedList().run()}><ListOrdered size={16} /></Btn>
      <Btn label="Task list" disabled={disabled} active={is("taskList")} onClick={() => chain().toggleTaskList().run()}><ListChecks size={16} /></Btn>
      <Sep />
      <Btn label="Quote" disabled={disabled} active={is("blockquote")} onClick={() => chain().toggleBlockquote().run()}><Quote size={16} /></Btn>
      <Btn label="Code block" disabled={disabled} active={is("codeBlock")} onClick={() => chain().toggleCodeBlock().run()}><Code2 size={16} /></Btn>
      <Btn label="Divider" disabled={disabled} onClick={() => chain().setHorizontalRule().run()}><Minus size={16} /></Btn>
      <Btn label="Link" disabled={disabled} active={is("link")} onClick={setLink}><Link2 size={16} /></Btn>
      <Sep />
      <Btn label="Align left" disabled={disabled} active={is({ textAlign: "left" })} onClick={() => chain().setTextAlign("left").run()}><AlignLeft size={16} /></Btn>
      <Btn label="Align center" disabled={disabled} active={is({ textAlign: "center" })} onClick={() => chain().setTextAlign("center").run()}><AlignCenter size={16} /></Btn>
      <Btn label="Align right" disabled={disabled} active={is({ textAlign: "right" })} onClick={() => chain().setTextAlign("right").run()}><AlignRight size={16} /></Btn>
    </div>
  );
}
