import { colorForUser, initials } from "../lib/format.js";

export default function Avatar({ user, size = 32, ring = false }) {
  const name = user?.name || "?";
  return (
    <span
      className="avatar"
      title={name}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: user?.color || colorForUser(user?.id || name),
        boxShadow: ring ? "0 0 0 2px var(--bg)" : undefined,
      }}
    >
      {initials(name)}
    </span>
  );
}
