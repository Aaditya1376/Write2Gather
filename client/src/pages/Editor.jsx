import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import * as Y from "yjs";
import { api } from "../lib/api.js";
import { connectSocket } from "../lib/socket.js";
import { SocketProvider } from "../lib/provider.js";
import { useToast } from "../context/ToastContext.jsx";
import EditorWorkspace from "./EditorWorkspace.jsx";

/**
 * This page does the "plumbing" for one document:
 *  1. loads the document details (title, owner...) over REST
 *  2. creates a Y.Doc and connects it to the server with SocketProvider
 *  3. once both are ready, renders the actual editor UI
 */
export default function Editor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [meta, setMeta] = useState(null);
  const [error, setError] = useState("");
  const [session, setSession] = useState(null); // { ydoc, provider }
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState(null);
  const [presence, setPresence] = useState([]);
  const [online, setOnline] = useState(true);
  const [savedAt, setSavedAt] = useState(null);

  // 1. document details
  useEffect(() => {
    let cancelled = false;
    setMeta(null);
    setError("");
    api
      .get(`/api/docs/${id}`)
      .then((d) => !cancelled && setMeta(d.doc))
      .catch((err) => !cancelled && setError(err.status === 404 ? "This document does not exist, or you do not have access to it." : err.message));
    return () => {
      cancelled = true;
    };
  }, [id]);

  // 2. live connection
  useEffect(() => {
    setReady(false);
    setPresence([]);
    const ydoc = new Y.Doc();
    const provider = new SocketProvider(ydoc, connectSocket(), id, {
      onReady: () => setReady(true),
      onRole: setRole,
      onPresence: setPresence,
      onSaved: setSavedAt,
      onConnection: setOnline,
      onError: setError,
      onRevoked: () => {
        toast.error("Your access to this document was removed");
        navigate("/dashboard", { replace: true });
      },
    });
    setSession({ ydoc, provider });

    return () => {
      provider.destroy();
      ydoc.destroy();
      setSession(null);
    };
  }, [id, navigate, toast]);

  useEffect(() => {
    if (meta) document.title = `${meta.title} - Write2Gather`;
    return () => {
      document.title = "Write2Gather";
    };
  }, [meta]);

  if (error) {
    return (
      <div className="center-screen stack">
        <h2>Cannot open this document</h2>
        <p className="muted">{error}</p>
        <Link className="btn btn-primary" to="/dashboard">Back to documents</Link>
      </div>
    );
  }

  if (!meta || !session || !ready) {
    return (
      <div className="center-screen stack">
        <div className="spinner" />
        <p className="muted">Opening document...</p>
      </div>
    );
  }

  return (
    <EditorWorkspace
      key={id}
      meta={meta}
      setMeta={setMeta}
      ydoc={session.ydoc}
      provider={session.provider}
      role={role || meta.role}
      presence={presence}
      online={online}
      savedAt={savedAt}
    />
  );
}
