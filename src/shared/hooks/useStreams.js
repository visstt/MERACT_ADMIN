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
      const res = await api.get("/admin/streams/active");
      setStreams(
        res.data.map((s) => ({
          id: s.id,
          title: s.title,
          streamer: s.streamerName || s.user?.email || "Unknown",
          streamerName: s.streamerName || s.user?.email || "Unknown",
          viewers: s.connectedUsers || 0,
          connectedUsers: s.connectedUsers || 0,
          duration: s.duration || "-",
          status: s.status,
          category: s.categoryId || "-",
          thumbnailUrl: s.previewFileName,
          startTime: s.startedAt ? new Date(s.startedAt).toLocaleString() : "-",
          likes: s.likes || 0,
          // Additional fields for stream viewer
          startLatitude: s.startLatitude,
          startLongitude: s.startLongitude,
          destinationLatitude: s.destinationLatitude,
          destinationLongitude: s.destinationLongitude,
          startedAt: s.startedAt,
          userId: s.userId,
          user: s.user,
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
      const res = await api.get("/act/statistic");
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
      await api.post(`/act/stop-act?id=${streamId}`);
    } catch (e) {
      setError("Failed to terminate stream");
    } finally {
      setLoading(false);
    }
  }, []);

  return { terminate, loading, error };
}

export function useAddLikes() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const addLikes = useCallback(async (actId, count) => {
    setLoading(true);
    setError("");
    try {
      await api.post(`/admin/streams/${actId}/add-likes`, { count });
      return true;
    } catch (e) {
      setError("Failed to add likes");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { addLikes, loading, error };
}
