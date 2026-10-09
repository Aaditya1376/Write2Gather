import { useEffect, useRef, useState } from "react";
import { Copy, Sparkles, Square } from "lucide-react";
import { api } from "../lib/api.js";
import { useToast } from "../context/ToastContext.jsx";
import { isSingleParagraph, textToHtml } from "../lib/textToHtml.js";

const ACTIONS = [
  { id: "improve", label: "Improve writing" },
  { id: "grammar", label: "Fix grammar" },
  { id: "shorten", label: "Make shorter" },
  { id: "expand", label: "Make longer" },
  { id: "summarize", label: "Summarize" },
  { id: "formal", label: "Formal tone" },
  { id: "friendly", label: "Friendly tone" },
  { id: "continue", label: "Continue writing" },
];

export default function AIPanel({ editor, canEdit }) {
  const toast = useToast();
  const [enabled, setEnabled] = useState(null);
  const [selection, setSelection] = useState({ from: 0, to: 0, text: "" });
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);
  const [lastRange, setLastRange] = useState(null);
  const readerRef = useRef(null);

  useEffect(() => {
    api.get("/api/ai/status").then((s) => setEnabled(s.enabled)).catch(() => setEnabled(false));
    return () => readerRef.current?.cancel().catch(() => {});
  }, []);

  useEffect(() => {
    if (!editor) return;
    const update = () => {
      const { from, to } = editor.state.selection;
      setSelection({ from, to, text: from === to ? "" : editor.state.doc.textBetween(from, to, "\n") });
    };
    update();
    editor.on("selectionUpdate", update);
    return () => editor.off("selectionUpdate", update);
  }, [editor]);

  async function run(action) {
    const useSelection = selection.text.trim().length > 0;
    const source = useSelection ? selection.text : editor.getText();
    if (!source.trim()) return toast.error("Write or select some text first");

    setLastRange(useSelection ? { from: selection.from, to: selection.to } : null);
    setOutput("");
    setRunning(true);
    try {
      const res = await api.stream("/api/ai", { action, text: source });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "AI request failed");
      }
      const reader = res.body.getReader();
      readerRef.current = reader;
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (data === "[DONE]") continue;
          const msg = JSON.parse(data);
          if (msg.error) throw new Error(msg.error);
          if (msg.token) setOutput((o) => o + msg.token);
        }
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRunning(false);
    }
  }

  function stop() {
    readerRef.current?.cancel().catch(() => {});
    setRunning(false);
  }

  function replaceSelection() {
    if (!lastRange) return;
    const content = isSingleParagraph(output) ? output.trim() : textToHtml(output);
    try {
      editor.chain().focus().insertContentAt(lastRange, content).run();
      setOutput("");
    } catch {
      toast.error("Could not replace the text. Try Insert below instead.");
    }
  }

  function insertBelow() {
    const pos = lastRange ? editor.state.doc.resolve(Math.min(lastRange.to, editor.state.doc.content.size)).after() : editor.state.doc.content.size;
    editor.chain().focus().insertContentAt(pos, textToHtml(output)).run();
    setOutput("");
  }

  if (enabled === null) return <div className="panel-body"><div className="spinner" /></div>;
  if (!enabled) {
    return (
      <div className="panel-body">
        <div className="panel-empty">
          <Sparkles size={28} />
          <p className="muted">The AI helper is switched off. Add <code>AI_API_KEY</code> to <code>server/.env</code> and restart the server to enable it.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="panel-body">
      <p className="muted small">
        {selection.text ? `Using your selection (${selection.text.length} characters).` : "Nothing selected: the whole document will be used."}
      </p>
      <div className="chips">
        {ACTIONS.map((a) => (
          <button key={a.id} className="chip" disabled={running} onClick={() => run(a.id)}>{a.label}</button>
        ))}
      </div>

      {(output || running) && (
        <div className="ai-output">
          <div className="ai-text">{output || "Thinking..."}{running && <span className="caret" />}</div>
          <div className="row gap-sm wrap">
            {running ? (
              <button className="btn" onClick={stop}><Square size={14} /> Stop</button>
            ) : (
              <>
                {canEdit && lastRange && <button className="btn btn-primary" onClick={replaceSelection}>Replace selection</button>}
                {canEdit && <button className="btn" onClick={insertBelow}>Insert below</button>}
                <button className="btn" onClick={() => navigator.clipboard.writeText(output).then(() => toast.success("Copied"))}><Copy size={14} /> Copy</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
