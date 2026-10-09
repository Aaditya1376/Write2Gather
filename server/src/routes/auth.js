import { Router } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { User } from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";
import { HttpError, asyncHandler } from "../utils/http.js";
import { cleanEmail, cleanPassword, cleanString } from "../utils/validate.js";
import {
  REFRESH_COOKIE,
  refreshCookieOptions,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/tokens.js";

const router = Router();

// Slow down password guessing: 30 attempts per 15 minutes per IP.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts, please try again in a few minutes" },
});

// Sends back the user + a fresh access token, and (re)sets the refresh cookie.
function startSession(res, user) {
  res.cookie(REFRESH_COOKIE, signRefreshToken(user._id), refreshCookieOptions());
  res.json({ user, accessToken: signAccessToken(user._id) });
}

router.post(
  "/register",
  authLimiter,
  asyncHandler(async (req, res) => {
    const name = cleanString(req.body.name, { field: "Name", max: 60 });
    const email = cleanEmail(req.body.email);
    const password = cleanPassword(req.body.password);

    if (await User.exists({ email })) throw new HttpError(409, "An account with this email already exists");

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, passwordHash });
    res.status(201);
    startSession(res, user);
  })
);

router.post(
  "/login",
  authLimiter,
  asyncHandler(async (req, res) => {
    const email = cleanEmail(req.body.email);
    const user = await User.findOne({ email });
    // Same message for "no such user" and "wrong password" so attackers cannot list accounts.
    const ok = user && typeof req.body.password === "string" && (await bcrypt.compare(req.body.password, user.passwordHash));
    if (!ok) throw new HttpError(401, "Incorrect email or password");
    startSession(res, user);
  })
);

// Called by the client on every page load to get a new access token from the refresh cookie.
router.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) throw new HttpError(401, "Not logged in");
    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch {
      throw new HttpError(401, "Session expired");
    }
    const user = await User.findById(payload.sub);
    if (!user) throw new HttpError(401, "Not logged in");
    startSession(res, user);
  })
);

router.post("/logout", (_req, res) => {
  res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions(), maxAge: undefined });
  res.json({ ok: true });
});

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.userId);
    if (!user) throw new HttpError(401, "Not logged in");
    res.json({ user });
  })
);

router.patch(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.userId);
    if (!user) throw new HttpError(401, "Not logged in");

    if (req.body.name !== undefined) user.name = cleanString(req.body.name, { field: "Name", max: 60 });

    if (req.body.newPassword !== undefined) {
      const matches = await bcrypt.compare(String(req.body.currentPassword || ""), user.passwordHash);
      if (!matches) throw new HttpError(400, "Current password is incorrect");
      user.passwordHash = await bcrypt.hash(cleanPassword(req.body.newPassword), 12);
    }

    await user.save();
    res.json({ user });
  })
);

export default router;
