import jwt from "jsonwebtoken";
import { config } from "../config.js";

// Short-lived access token (sent in the Authorization header, kept in memory on the client)
export const signAccessToken = (userId) =>
  jwt.sign({ sub: String(userId) }, config.accessSecret, { expiresIn: "15m" });

// Long-lived refresh token (stored in an HttpOnly cookie, JavaScript cannot read it)
export const signRefreshToken = (userId) =>
  jwt.sign({ sub: String(userId) }, config.refreshSecret, { expiresIn: "7d" });

export const verifyAccessToken = (token) => jwt.verify(token, config.accessSecret);
export const verifyRefreshToken = (token) => jwt.verify(token, config.refreshSecret);

export const REFRESH_COOKIE = "dr_refresh";
export const refreshCookieOptions = () => ({
  httpOnly: true,
  secure: config.isProd,
  // In production the client and API usually live on different domains, which needs "none".
  sameSite: config.isProd ? "none" : "lax",
  path: "/api/auth",
  maxAge: 7 * 24 * 60 * 60 * 1000,
});
