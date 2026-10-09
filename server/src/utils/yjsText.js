import * as Y from "yjs";

// TipTap stores the document in a Y.XmlFragment called "default".
export const FRAGMENT_NAME = "default";

function nodeToText(node) {
  if (node instanceof Y.XmlText) {
    return node
      .toDelta()
      .map((part) => (typeof part.insert === "string" ? part.insert : ""))
      .join("");
  }
  if (node.nodeName === "hardBreak") return "\n";

  const children = node.toArray();
  const parts = children.map(nodeToText);
  // A node that directly holds text is a "line" (paragraph, heading...). Otherwise it is a container.
  const isLine = children.some((c) => c instanceof Y.XmlText);
  return isLine ? parts.join("") : parts.filter((p) => p !== "").join("\n");
}

export function docToText(ydoc) {
  return nodeToText(ydoc.getXmlFragment(FRAGMENT_NAME));
}

export function stateToText(state) {
  const ydoc = new Y.Doc();
  try {
    if (state && state.length) Y.applyUpdate(ydoc, state);
    return docToText(ydoc);
  } finally {
    ydoc.destroy();
  }
}
