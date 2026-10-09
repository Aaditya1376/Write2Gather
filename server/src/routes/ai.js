import { Router } from "express";
import rateLimit from "express-rate-limit";
import { config } from "../config.js";
import { requireAuth } from "../middleware/auth.js";
import { HttpError } from "../utils/http.js";

const router = Router();
router.use(requireAuth);

const PROMPTS = {
  improve: "Improve the writing: clearer, more concise, better flow. Keep the meaning and the language.",
  grammar: "Fix spelling and grammar only. Do not change the style or meaning.",
  shorten: "Make this text about half as long while keeping the key points.",
  expand: "Expand this text with more detail and examples, in the same tone.",
  summarize: "Summarize this text in a few short bullet points.",
  formal: "Rewrite this text in a professional, formal tone.",
  friendly: "Rewrite this text in a warm, friendly, casual tone.",
  continue: "Continue writing from where this text stops. Write 1 to 2 natural paragraphs. Output only the new text.",
};

const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 40,
  keyGenerator: (req) => req.userId, // limit per user, not per IP
  message: { error: "AI limit reached, try again in an hour" },
});

router.get("/status", (_req, res) => res.json({ enabled: Boolean(config.ai.key), actions: Object.keys(PROMPTS) }));

// Streams the answer back token by token using Server-Sent Events (SSE).
router.post("/", aiLimiter, async (req, res, next) => {
  try {
    if (!config.ai.key) throw new HttpError(503, "AI is not configured on this server");
    const { action, text } = req.body;
    if (!PROMPTS[action]) throw new HttpError(400, "Unknown AI action");
    if (typeof text !== "string" || !text.trim()) throw new HttpError(400, "Select or write some text first");

    const controller = new AbortController();
    res.on("close", () => controller.abort()); // user closed the panel -> stop paying for tokens

    const upstream = await fetch(`${config.ai.baseUrl}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.ai.key}` },
      body: JSON.stringify({
        model: config.ai.model,
        stream: true,
        messages: [
          { role: "system", content: `You are a writing assistant inside a document editor. ${PROMPTS[action]} Reply with only the resulting text, no preface.` },
          { role: "user", content: text.slice(0, 12000) },
        ],
      }),
    });

    if (!upstream.ok || !upstream.body) throw new HttpError(502, "The AI provider returned an error");

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const decoder = new TextDecoder();
    let buffer = "";
    for await (const chunk of upstream.body) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop(); // the last piece may be incomplete, keep it for next round
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (data === "[DONE]") continue;
        try {
          const token = JSON.parse(data).choices?.[0]?.delta?.content;
          if (token) res.write(`data: ${JSON.stringify({ token })}\n\n`);
        } catch {
          /* ignore partial JSON */
        }
      }
    }
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err) {
    if (err.name === "AbortError") return res.end();
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: "The AI stream was interrupted" })}\n\n`);
      return res.end();
    }
    next(err);
  }
});

export default router;
