import { verifyAccessToken } from "../utils/tokens.js";
import { HttpError } from "../utils/http.js";

// Reads "Authorization: Bearer <token>" and puts the user id on req.userId
export function requireAuth(req, _res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return next(new HttpError(401, "Please log in"));
  try {
    req.userId = verifyAccessToken(token).sub;
    next();
  } catch {
    next(new HttpError(401, "Session expired, please log in again"));
  }
}
