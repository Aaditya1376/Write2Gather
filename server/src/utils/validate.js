// Tiny validation helpers. Each one returns a clean value or throws an HttpError (400).
import { HttpError } from "./http.js";

export function cleanString(value, { field, min = 1, max = 200 }) {
  if (typeof value !== "string") throw new HttpError(400, `${field} is required`);
  const v = value.trim();
  if (v.length < min) throw new HttpError(400, `${field} must be at least ${min} character${min > 1 ? "s" : ""}`);
  if (v.length > max) throw new HttpError(400, `${field} must be at most ${max} characters`);
  return v;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export function cleanEmail(value) {
  const v = cleanString(value, { field: "Email", max: 254 }).toLowerCase();
  if (!EMAIL_RE.test(v)) throw new HttpError(400, "Please enter a valid email address");
  return v;
}

export function cleanPassword(value) {
  if (typeof value !== "string" || value.length < 8) {
    throw new HttpError(400, "Password must be at least 8 characters");
  }
  if (value.length > 100) throw new HttpError(400, "Password is too long");
  return value;
}

export function oneOf(value, allowed, field) {
  if (!allowed.includes(value)) throw new HttpError(400, `${field} must be one of: ${allowed.join(", ")}`);
  return value;
}
