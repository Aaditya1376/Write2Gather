import { useCallback, useEffect, useState } from "react";
import { api } from "./api.js";
import { getSocket } from "./socket.js";

// Loads the comments of a document and reloads them whenever the server says they changed.
export function useComments(docId) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const { comments } = await api.get(`/api/docs/${docId}/comments`);
      setComments(comments);
    } catch {
      /* the panel simply keeps showing the old list */
    } finally {
      setLoading(false);
    }
  }, [docId]);

  useEffect(() => {
    reload();
    const socket = getSocket();
    const onChanged = (id) => id === docId && reload();
    socket.on("comments:changed", onChanged);
    return () => socket.off("comments:changed", onChanged);
  }, [docId, reload]);

  return { comments, loading, reload };
}
