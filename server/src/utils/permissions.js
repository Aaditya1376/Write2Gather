// Pure functions that decide "who can do what" on a document.
// Kept free of database code so they are easy to unit test.

export const RANK = { viewer: 1, editor: 2, owner: 3 };

const idOf = (x) => String(x && x._id ? x._id : x);

/**
 * Returns "owner" | "editor" | "viewer" | null for a user on a document.
 * `doc.owner` / `collaborators[].user` may be raw ids or populated user objects.
 */
export function getRole(doc, userId) {
  if (!doc || !userId) return null;
  const uid = String(userId);

  if (idOf(doc.owner) === uid) return "owner";

  let role = null;
  const entry = (doc.collaborators || []).find((c) => c.user && idOf(c.user) === uid);
  if (entry) role = entry.role;

  // Link sharing can only ever raise access, never lower it.
  const link = doc.linkRole;
  if (link && link !== "none" && (!role || RANK[link] > RANK[role])) role = link;

  return role;
}

export const canEdit = (role) => role === "owner" || role === "editor";
export const hasRole = (role, min) => !!role && RANK[role] >= RANK[min];
