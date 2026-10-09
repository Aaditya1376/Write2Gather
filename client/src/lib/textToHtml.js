// Converts the plain text an AI model returns into simple editor-friendly HTML.
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function textToHtml(text) {
  const blocks = text.trim().split(/\n{2,}/);
  return blocks
    .map((block) => {
      const lines = block.split("\n").filter((l) => l.trim());
      const bullets = lines.every((l) => /^\s*([-*\u2022])\s+/.test(l));
      const numbered = lines.every((l) => /^\s*\d+[.)]\s+/.test(l));
      if (bullets && lines.length) {
        return "<ul>" + lines.map((l) => `<li><p>${esc(l.replace(/^\s*([-*\u2022])\s+/, ""))}</p></li>`).join("") + "</ul>";
      }
      if (numbered && lines.length) {
        return "<ol>" + lines.map((l) => `<li><p>${esc(l.replace(/^\s*\d+[.)]\s+/, ""))}</p></li>`).join("") + "</ol>";
      }
      return `<p>${lines.map(esc).join("<br>")}</p>`;
    })
    .join("");
}

// True when the text is a single plain paragraph (can be inserted inline).
export const isSingleParagraph = (text) => !/\n/.test(text.trim());
