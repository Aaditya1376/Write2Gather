import { io } from "socket.io-client";
import { BASE, getToken, refreshSession } from "./api.js";

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(BASE || undefined, {
      autoConnect: false,
      // A function, so every (re)connection uses the CURRENT access token.
      auth: (cb) => cb({ token: getToken() }),
    });

    let retried = false;
    socket.on("connect", () => {
      retried = false;
    });
    socket.on("connect_error", async (err) => {
      // Token expired while we were offline: get a new one and try once more.
      if (err.message === "unauthorized" && !retried) {
        retried = true;
        try {
          await refreshSession();
          socket.connect();
        } catch {
          /* session is gone; the API layer will send the user to /login */
        }
      }
    });
  }
  return socket;
}

export function connectSocket() {
  const s = getSocket();
  if (!s.connected && !s.active) s.connect();
  return s;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
