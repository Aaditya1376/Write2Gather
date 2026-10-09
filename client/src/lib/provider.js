import * as Y from "yjs";
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
  removeAwarenessStates,
} from "y-protocols/awareness";

/**
 * Connects ONE Y.Doc to the server over Socket.IO.
 *
 *  my edit          -> ydoc "update" event  -> we emit "yjs:update" to the server
 *  another person   -> server "yjs:update"  -> we apply it to our ydoc
 *
 * `awareness` carries "who is here and where is their cursor".
 * The TipTap CollaborationCursor extension reads and writes it for us.
 */
export class SocketProvider {
  constructor(ydoc, socket, docId, callbacks = {}) {
    this.ydoc = ydoc;
    this.socket = socket;
    this.docId = docId;
    this.cb = callbacks; // onReady, onRole, onPresence, onSaved, onRevoked, onError, onConnection
    this.awareness = new Awareness(ydoc);
    this.role = null;
    this.synced = false;
    this.joinedBefore = false;
    this.destroyed = false;

    this.handlers = {
      "yjs:update": (id, update) => {
        if (id !== docId) return;
        Y.applyUpdate(ydoc, new Uint8Array(update), this);
      },
      awareness: (id, update) => {
        if (id !== docId) return;
        applyAwarenessUpdate(this.awareness, new Uint8Array(update), this);
      },
      presence: (id, users) => {
        if (id === docId) this.cb.onPresence?.(users);
      },
      permission: (id, role) => {
        if (id !== docId) return;
        this.role = role;
        this.cb.onRole?.(role);
      },
      "access:revoked": (id) => {
        if (id === docId) this.cb.onRevoked?.();
      },
      saved: (id, at) => {
        if (id === docId) this.cb.onSaved?.(at);
      },
      connect: () => this.join(),
      disconnect: () => {
        this.synced = false;
        this.cb.onConnection?.(false);
      },
    };
    for (const [event, fn] of Object.entries(this.handlers)) socket.on(event, fn);

    this.onDocUpdate = (update, origin) => {
      if (origin === this) return; // it came from the server, do not send it back
      if (!this.synced || !this.canEdit()) return;
      socket.emit("yjs:update", docId, update);
    };
    ydoc.on("update", this.onDocUpdate);

    this.onAwarenessUpdate = ({ added, updated, removed }, origin) => {
      if (origin === this || !this.synced) return;
      socket.emit(
        "awareness:update",
        docId,
        encodeAwarenessUpdate(this.awareness, [...added, ...updated, ...removed])
      );
    };
    this.awareness.on("update", this.onAwarenessUpdate);

    if (socket.connected) this.join();
  }

  canEdit() {
    return this.role === "owner" || this.role === "editor";
  }

  join() {
    this.socket.emit("doc:join", this.docId, (res) => {
      if (this.destroyed) return;
      if (!res || !res.ok) {
        this.cb.onError?.((res && res.error) || "Could not open document");
        return;
      }

      this.role = res.role;
      Y.applyUpdate(this.ydoc, new Uint8Array(res.state), this);
      if (res.awareness) applyAwarenessUpdate(this.awareness, new Uint8Array(res.awareness), this);
      this.synced = true;

      // After a reconnect, push anything typed while offline. Yjs ignores what the server already has.
      if (this.joinedBefore && this.canEdit()) {
        this.socket.emit("yjs:update", this.docId, Y.encodeStateAsUpdate(this.ydoc));
      }
      this.joinedBefore = true;

      // Announce our own name/cursor right away
      if (this.awareness.getLocalState()) {
        this.socket.emit(
          "awareness:update",
          this.docId,
          encodeAwarenessUpdate(this.awareness, [this.ydoc.clientID])
        );
      }

      this.cb.onConnection?.(true);
      this.cb.onRole?.(res.role);
      this.cb.onReady?.();
    });
  }

  destroy() {
    this.destroyed = true;
    removeAwarenessStates(this.awareness, [this.ydoc.clientID], "destroy");
    this.socket.emit("doc:leave", this.docId);
    for (const [event, fn] of Object.entries(this.handlers)) this.socket.off(event, fn);
    this.ydoc.off("update", this.onDocUpdate);
    this.awareness.off("update", this.onAwarenessUpdate);
    this.awareness.destroy();
  }
}
