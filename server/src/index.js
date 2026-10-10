import http from "node:http";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import { config } from "./config.js";
import { errorMiddleware } from "./utils/http.js";
import { initSocket, flushAllRooms } from "./socket/index.js";
import authRoutes from "./routes/auth.js";
import docRoutes from "./routes/docs.js";

const app = express();
app.set("trust proxy", 1); // Trust the API host's HTTPS proxy so rate limiting sees the client IP.

app.use(helmet());
app.use(cors({ origin: config.clientUrl, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.get("/api/health", (_req, res) => {
  const ok = mongoose.connection.readyState === 1;
  res.status(ok ? 200 : 503).json({ status: ok ? "ok" : "database unavailable" });
});

app.use("/api/auth", authRoutes);
app.use("/api/docs", docRoutes);

app.use("/api", (_req, res) => res.status(404).json({ error: "Not found" }));
app.use(errorMiddleware);

const server = http.createServer(app);
initSocket(server);

await mongoose.connect(config.mongoUri);
console.log("MongoDB connected");
server.listen(config.port, () => console.log(`Write2Gather API running on http://localhost:${config.port}`));

// Save every open document before the process exits, so no edits are lost on deploy/restart.
let closing = false;
async function shutdown() {
  if (closing) return;
  closing = true;
  console.log("Shutting down, saving open documents...");
  await flushAllRooms();
  await mongoose.disconnect();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
