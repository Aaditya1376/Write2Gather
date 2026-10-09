export function timeAgo(dateLike) {
  const seconds = Math.round((Date.now() - new Date(dateLike).getTime()) / 1000);
  if (seconds < 45) return "just now";
  if (seconds >= 2592000) return new Date(dateLike).toLocaleDateString();
  const units = [
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [name, size] of units) {
    if (seconds >= size) {
      const n = Math.floor(seconds / size);
      return `${n} ${name}${n > 1 ? "s" : ""} ago`;
    }
  }
  return "just now";
}

export const initials = (name = "?") =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("") || "?";

// Same formula as the server, so a person has the same colour everywhere.
export function colorForUser(userId = "") {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360}, 65%, 50%)`;
}
