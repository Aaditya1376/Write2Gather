import { useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import { download, htmlToMarkdown, safeName, wrapHtml } from "../lib/export.js";

export default function ExportMenu({ editor, title }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, []);

  const file = safeName(title);
  const items = [
    ["Markdown (.md)", () => download(`${file}.md`, `# ${title}\n\n${htmlToMarkdown(editor.getHTML())}`, "text/markdown")],
    ["Web page (.html)", () => download(`${file}.html`, wrapHtml(title, editor.getHTML()), "text/html")],
    ["Plain text (.txt)", () => download(`${file}.txt`, `${title}\n\n${editor.getText({ blockSeparator: "\n\n" })}`, "text/plain")],
    ["Print / Save as PDF", () => window.print()],
  ];

  return (
    <div className="menu-wrap" ref={ref}>
      <button className="btn" onClick={() => setOpen(!open)}><Download size={16} /> Export</button>
      {open && (
        <div className="menu menu-right">
          {items.map(([label, fn]) => (
            <button key={label} onClick={() => { fn(); setOpen(false); }}>{label}</button>
          ))}
        </div>
      )}
    </div>
  );
}
