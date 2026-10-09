// Turning the editor content into downloadable files, entirely in the browser.

export function download(filename, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const safeName = (title) => (title || "document").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-") || "document";

export function wrapHtml(title, bodyHtml) {
  const esc = title.replace(/</g, "&lt;");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${esc}</title>
<style>
body{max-width:760px;margin:40px auto;padding:0 20px;font:17px/1.7 Georgia,serif;color:#222}
h1,h2,h3{font-family:system-ui,sans-serif;line-height:1.25}
pre{background:#f4f4f6;padding:14px;border-radius:8px;overflow:auto}
code{background:#f4f4f6;padding:2px 5px;border-radius:4px}
blockquote{border-left:4px solid #ccc;margin-left:0;padding-left:16px;color:#555}
mark{background:#fff3a3}
ul[data-type="taskList"]{list-style:none;padding-left:0}
</style></head><body>
<h1>${esc}</h1>
${bodyHtml}
</body></html>`;
}

// A small HTML -> Markdown converter that understands what our editor can produce.
export function htmlToMarkdown(html) {
  const body = new DOMParser().parseFromString(html, "text/html").body;

  function list(node, depth) {
    const ordered = node.tagName === "OL";
    const isTask = node.dataset.type === "taskList";
    let n = 1;
    return [...node.children]
      .filter((li) => li.tagName === "LI")
      .map((li) => {
        const marker = isTask ? `- [${li.dataset.checked === "true" ? "x" : " "}] ` : ordered ? `${n++}. ` : "- ";
        let text = "";
        let nested = "";
        for (const child of li.childNodes) {
          if (child.nodeType === 1 && (child.tagName === "UL" || child.tagName === "OL")) nested += list(child, depth + 1);
          else if (child.nodeType === 1 && child.tagName === "LABEL") continue; // the task checkbox
          else text += convert(child, depth);
        }
        return "  ".repeat(depth) + marker + text.trim() + "\n" + nested;
      })
      .join("");
  }

  function convert(node, depth = 0) {
    if (node.nodeType === 3) return node.textContent;
    if (node.nodeType !== 1) return "";
    const tag = node.tagName.toLowerCase();
    const kids = () => [...node.childNodes].map((c) => convert(c, depth)).join("");

    switch (tag) {
      case "h1":
      case "h2":
      case "h3":
        return "#".repeat(Number(tag[1])) + " " + kids() + "\n\n";
      case "p":
        return kids() + "\n\n";
      case "strong":
      case "b":
        return `**${kids()}**`;
      case "em":
      case "i":
        return `*${kids()}*`;
      case "s":
        return `~~${kids()}~~`;
      case "mark":
        return `==${kids()}==`;
      case "code":
        return "`" + kids() + "`";
      case "pre":
        return "```\n" + node.textContent.replace(/\n$/, "") + "\n```\n\n";
      case "a":
        return `[${kids()}](${node.getAttribute("href") || ""})`;
      case "br":
        return "  \n";
      case "hr":
        return "---\n\n";
      case "blockquote":
        return (
          kids()
            .trim()
            .split("\n")
            .map((line) => "> " + line)
            .join("\n") + "\n\n"
        );
      case "ul":
      case "ol":
        return list(node, depth) + (depth === 0 ? "\n" : "");
      default:
        return kids();
    }
  }

  return [...body.childNodes].map((n) => convert(n)).join("").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}
