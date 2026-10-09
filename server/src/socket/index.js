import { Server } from "socket.io";
import * as Y from "yjs";
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate, removeAwarenessStates } from "y-protocols/awareness";
import { config } from "../config.js";
import { Doc } from "../models/Doc.js";
import { User } from "../models/User.js";
import { Version } from "../models/Version.js";
import { verifyAccessToken } from "../utils/tokens.js";
import { getRole, canEdit } from "../utils/permissions.js";
import { docToText, stateToText, FRAGMENT_NAME } from "../utils/yjsText.js";

/*
 * HOW REAL-TIME EDITING WORKS (read this first!)
 *
 * - Every open document has a "room": one Y.Doc kept in server memory.
 * - A browser edits its own copy of the Y.Doc and sends tiny binary "updates" to the server.
 * - The server applies each update to the room copy and forwards it to everyone else in the room.
 * - Yjs is a CRDT, so updates can arrive in any order and every copy still ends up identical.
 *   That means the server needs NO conflict-resolution code.
 * - After 2 seconds without changes the room is saved to MongoDB (debounced save).
 */

const SAVE_DELAY_MS = 2000;
const AUTO_VERSION_EVERY_MS = 10 * 60 * 1000;
const MAX_VERSIONS = 50;
const MAX_UPDATE_BYTES = 2 * 1024 * 1024;

const rooms = new Map(); // docId -> room
const loading = new Map(); // docId -> Promise (prevents loading the same doc twice at once)
let io = null;

export function colorForUser(userId) {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360}, 65%, 50%)`;
}

// ---------- room lifecycle ----------

async function loadRoom(docId) {
  if (rooms.has(docId)) return rooms.get(docId);
  if (loading.has(docId)) return loading.get(docId);

  const promise = (async () => {
    const stored = await Doc.findById(docId).select("yjsState");
    if (!stored) return null;

    const ydoc = new Y.Doc();
    if (stored.yjsState && stored.yjsState.length) Y.applyUpdate(ydoc, stored.yjsState);

    const room = {
      docId,
      ydoc,
      awareness: new Awareness(ydoc),
      saveTimer: null,
      dirty: false,
      lastVersionAt: Date.now(),
    };
    room.awareness.setLocalState(null); // the server itself has no cursor

    // Anything that changes the doc: schedule a save, and forward it to the room.
    ydoc.on("update", (update, origin) => {
      room.dirty = true;
      scheduleSave(room);
      const fromSocket = origin && typeof origin.to === "function";
      // Socket origin -> send to everyone EXCEPT the sender. Server origin (restore) -> send to everyone.
      if (fromSocket) origin.to(docId).emit("yjs:update", docId, update);
      else io?.to(docId).emit("yjs:update", docId, update);
    });

    // Cursor / presence updates
    room.awareness.on("update", ({ added, updated, removed }, origin) => {
      const changed = added.concat(updated, removed);
      const update = encodeAwarenessUpdate(room.awareness, changed);
      if (origin && typeof origin.to === "function") {
        // remember which awareness ids belong to this socket, so we can clean them up on disconnect
        const ids = (origin.data.awarenessIds ||= new Set());
        added.forEach((id) => ids.add(id));
        removed.forEach((id) => ids.delete(id));
        origin.to(docId).emit("awareness", docId, update);
      } else {
        io?.to(docId).emit("awareness", docId, update);
      }
    });

    rooms.set(docId, room);
    return room;
  })();

  loading.set(docId, promise);
  try {
    return await promise;
  } finally {
    loading.delete(docId);
  }
}

function scheduleSave(room) {
  clearTimeout(room.saveTimer);
  room.saveTimer = setTimeout(() => saveRoom(room).catch((e) => console.error("save failed", e)), SAVE_DELAY_MS);
}

async function saveRoom(room) {
  clearTimeout(room.saveTimer);
  room.saveTimer = null;
  if (!room.dirty) return;
  room.dirty = false;

  const state = Buffer.from(Y.encodeStateAsUpdate(room.ydoc));
  const text = docToText(room.ydoc);

  try {
    await Doc.updateOne({ _id: room.docId }, { yjsState: state, contentText: text.slice(0, 20000) });
  } catch (err) {
    room.dirty = true; // try again next time
    throw err;
  }
  io?.to(room.docId).emit("saved", room.docId, Date.now());

  // Automatic version snapshot every 10 minutes of activity
  if (text.trim() && Date.now() - room.lastVersionAt > AUTO_VERSION_EVERY_MS) {
    room.lastVersionAt = Date.now();
    await Version.create({ doc: room.docId, label: "Auto-saved", yjsState: state, preview: text.slice(0, 1500) });
    const extra = await Version.find({ doc: room.docId }).sort({ createdAt: -1 }).skip(MAX_VERSIONS).select("_id");
    if (extra.length) await Version.deleteMany({ _id: { $in: extra.map((v) => v._id) } });
  }
}

// Remove a room from memory once nobody is connected to it (after saving).
export async function releaseIfEmpty(docId) {
  const room = rooms.get(docId);
  if (!room) return;
  const members = io?.sockets.adapter.rooms.get(docId);
  if (members && members.size > 0) return;
  try {
    await saveRoom(room);
  } finally {
    clearTimeout(room.saveTimer);
    room.awareness.destroy();
    room.ydoc.destroy();
    rooms.delete(docId);
  }
}

export async function flushAllRooms() {
  await Promise.allSettled([...rooms.values()].map((room) => saveRoom(room)));
}

// ---------- helpers used by the REST routes ----------

// Latest content of a document: from memory if it is open, otherwise from the database.
export async function getCurrentState(docId) {
  const room = rooms.get(docId);
  if (room) return Buffer.from(Y.encodeStateAsUpdate(room.ydoc));
  const stored = await Doc.findById(docId).select("yjsState");
  return stored?.yjsState || null;
}

// Replace the document content with an older snapshot. Done as a normal Yjs change,
// so it is broadcast to every connected editor like any other edit.
export async function restoreSnapshot(docId, state) {
  const room = await loadRoom(docId);
  if (!room) throw new Error("Document not found");

  const snapshot = new Y.Doc();
  Y.applyUpdate(snapshot, state);
  const from = snapshot.getXmlFragment(FRAGMENT_NAME);
  const to = room.ydoc.getXmlFragment(FRAGMENT_NAME);

  room.ydoc.transact(() => {
    to.delete(0, to.length);
    to.insert(0, from.toArray().map((node) => node.clone()));
  }, "server");

  snapshot.destroy();
  await saveRoom(room);
  await releaseIfEmpty(docId);
}

export function emitToDoc(docId, event, ...args) {
  io?.to(docId).emit(event, docId, ...args);
}

async function broadcastPresence(docId) {
  if (!io) return;
  const sockets = await io.in(docId).fetchSockets();
  const seen = new Map();
  for (const s of sockets) {
    const u = s.data.user;
    if (u && !seen.has(u.id)) seen.set(u.id, { id: u.id, name: u.name, color: colorForUser(u.id) });
  }
  io.to(docId).emit("presence", docId, [...seen.values()]);
}

// Called by REST routes after sharing settings change: re-check every connected person
// and kick / downgrade them immediately, no page refresh needed.
export async function refreshPermissions(docId) {
  if (!io) return;
  const fresh = await Doc.findById(docId).select("owner collaborators linkRole");
  for (const socket of await io.in(docId).fetchSockets()) {
    const role = fresh ? getRole(fresh, socket.data.user.id) : null;
    if (!role) {
      socket.emit("access:revoked", docId);
      socket.leave(docId);
      socket.data.roles.delete(docId);
      continue;
    }
    if (socket.data.roles.get(docId) !== role) {
      socket.data.roles.set(docId, role);
      socket.emit("permission", docId, role);
    }
  }
  await broadcastPresence(docId);
}

// ---------- socket server ----------

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: config.clientUrl, credentials: true },
    maxHttpBufferSize: 5e6,
  });

  // Authenticate every connection with the same access token used for the REST API.
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      const { sub } = verifyAccessToken(token);
      const user = await User.findById(sub).select("name");
      if (!user) return next(new Error("unauthorized"));
      socket.data.user = { id: String(user._id), name: user.name };
      socket.data.roles = new Map(); // docId -> role for the rooms this socket joined
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("doc:join", async (docId, ack) => {
      if (typeof ack !== "function") return;
      try {
        const stored = await Doc.findById(docId).select("owner collaborators linkRole");
        const role = stored && getRole(stored, socket.data.user.id);
        if (!role) return ack({ ok: false, error: "No access" });

        const room = await loadRoom(docId);
        if (!room) return ack({ ok: false, error: "Not found" });

        socket.data.roles.set(docId, role);
        await socket.join(docId);

        const ids = [...room.awareness.getStates().keys()];
        ack({
          ok: true,
          role,
          state: Buffer.from(Y.encodeStateAsUpdate(room.ydoc)),
          awareness: ids.length ? encodeAwarenessUpdate(room.awareness, ids) : null,
        });
        broadcastPresence(docId);
      } catch (err) {
        console.error("doc:join failed", err);
        ack({ ok: false, error: "Could not open document" });
      }
    });

    socket.on("yjs:update", (docId, update) => {
      const room = rooms.get(docId);
      if (!room || !socket.rooms.has(docId)) return;
      if (!canEdit(socket.data.roles.get(docId))) return; // viewers cannot change the document
      if (!(update instanceof Uint8Array) || update.length > MAX_UPDATE_BYTES) return;
      try {
        Y.applyUpdate(room.ydoc, update, socket); // the "update" listener forwards it
      } catch {
        /* ignore malformed updates */
      }
    });

    socket.on("awareness:update", (docId, update) => {
      const room = rooms.get(docId);
      if (!room || !socket.rooms.has(docId) || !(update instanceof Uint8Array)) return;
      try {
        applyAwarenessUpdate(room.awareness, update, socket);
      } catch {
        /* ignore */
      }
    });

    const leave = async (docId) => {
      const room = rooms.get(docId);
      if (room && socket.data.awarenessIds?.size) {
        removeAwarenessStates(room.awareness, [...socket.data.awarenessIds], null);
        socket.data.awarenessIds.clear();
      }
      socket.leave(docId);
      socket.data.roles?.delete(docId);
      await broadcastPresence(docId);
      await releaseIfEmpty(docId);
    };

    socket.on("doc:leave", (docId) => leave(docId));
    socket.on("disconnecting", () => {
      for (const docId of [...socket.rooms]) if (docId !== socket.id) leave(docId);
    });
  });

  return io;
}
