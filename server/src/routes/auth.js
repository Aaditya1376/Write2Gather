import { Router } from "express";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import rateLimit from "express-rate-limit";
import { config } from "../config.js";
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

const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many password reset attempts. Please try again later." },
});

const hashResetToken = (token) => createHash("sha256").update(token).digest("hex");

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

router.post(
  "/forgot-password",
  passwordResetLimiter,
  asyncHandler(async (req, res) => {
    const email = cleanEmail(req.body.email);
    if (!config.resendApiKey || !config.passwordResetFrom) {
      throw new HttpError(503, "Password reset email is not configured. Please contact the site administrator.");
    }

    const user = await User.findOne({ email });
    if (user) {
      const token = randomBytes(32).toString("hex");
      user.passwordResetTokenHash = hashResetToken(token);
      user.passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await user.save();

      const resetUrl = `${config.clientUrl.replace(/\/$/, "")}${config.clientBasePath}/reset-password?token=${encodeURIComponent(token)}`;
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: config.passwordResetFrom,
            to: [user.email],
            subject: "Reset your Write2Gather password",
            text: `Use this link to reset your Write2Gather password. It expires in one hour: ${resetUrl}`,
            html: `<p>We received a request to reset your Write2Gather password.</p><p><a href="${resetUrl}">Reset your password</a></p><p>This link expires in one hour. If you did not request this, you can ignore this email.</p>`,
          }),
        });
        if (!response.ok) throw new Error(`Email provider returned ${response.status}`);
      } catch (error) {
        user.passwordResetTokenHash = null;
        user.passwordResetExpiresAt = null;
        await user.save();
        console.error("Password reset email could not be sent", error);
        throw new HttpError(503, "We could not send the reset email right now. Please try again later.");
      }
    }

    // Use the same response whether or not an account uses this email.
    res.json({ message: "If an account uses that email, a password reset link has been sent." });
  })
);

router.post(
  "/reset-password",
  passwordResetLimiter,
  asyncHandler(async (req, res) => {
    const token = cleanString(req.body.token, { field: "Reset token", max: 200 });
    const password = cleanPassword(req.body.password);
    const user = await User.findOne({
      passwordResetTokenHash: hashResetToken(token),
      passwordResetExpiresAt: { $gt: new Date() },
    }).select("+passwordResetTokenHash +passwordResetExpiresAt");
    if (!user) throw new HttpError(400, "This password reset link is invalid or expired. Request a new one.");

    user.passwordHash = await bcrypt.hash(password, 12);
    user.passwordChangedAt = new Date();
    user.passwordResetTokenHash = null;
    user.passwordResetExpiresAt = null;
    await user.save();
    res.json({ message: "Password updated. You can now log in with your new password." });
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
    if (user.passwordChangedAt && payload.iat < Math.floor(user.passwordChangedAt.getTime() / 1000)) {
      throw new HttpError(401, "Password changed. Please log in again.");
    }
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
