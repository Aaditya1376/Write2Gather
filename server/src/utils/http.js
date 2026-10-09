export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Express 4 does not catch errors from async handlers by itself. This wrapper does.
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// A MongoDB id is 24 hex characters. Anything else cannot exist, so answer 404 early.
export function assertObjectId(id, label = "id") {
  if (typeof id !== "string" || !/^[a-f\d]{24}$/i.test(id)) throw new HttpError(404, `${label} not found`);
}

export function errorMiddleware(err, _req, res, _next) {
  if (err.name === "ValidationError") return res.status(400).json({ error: err.message });
  if (err.code === 11000) return res.status(409).json({ error: "That value is already in use" });
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 ? "Something went wrong on the server" : err.message });
}
