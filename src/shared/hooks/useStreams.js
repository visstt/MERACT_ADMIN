import { useState, useEffect, useCallback } from "react";
import api from "../lib/axios";

export function useStreams() {
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchStreams = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/stream/get-streams");
      setStreams(
        res.data.map((s) => ({
          id: s.id,
          title: s.name,
          streamer: s.user,
          viewers: s.spectators === "NOT_IMPLEMENTED" ? 0 : s.spectators,
          duration: s.duration,
          status: s.status,
          category: s.category,
          thumbnailUrl: s.previewFileName,
          startTime: s.startTime || null,
        }))
      );
    } catch (e) {
      setError("Failed to load streams");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStreams();
  }, [fetchStreams]);

  return { streams, loading, error, fetchStreams };
}

export function useStreamStats() {
  const [stats, setStats] = useState({
    activeStreams: 0,
    allSpectators: "-",
    adminBlocked: "-",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/stream/statistic");
      setStats(res.data);
    } catch (e) {
      setError("Failed to load stats");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, fetchStats };
}

export function useTerminateStream() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const terminate = useCallback(async (streamId) => {
    setLoading(true);
    setError("");
    try {
      await api.post(`/stream/stop-stream?id=${streamId}`);
    } catch (e) {
      setError("Failed to terminate stream");
    } finally {
      setLoading(false);
    }
  }, []);

  return { terminate, loading, error };
}
