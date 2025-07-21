import { useState, useEffect, useCallback } from "react";
import api from "../lib/axios";

export function useDashboardStats() {
  const [stats, setStats] = useState({
    activeUsers: "-",
    activeStreams: "-",
    activeGuilds: "-",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/user/statistic-blocks");
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

export function useDashboardActivity() {
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchActivity = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/user/activity-logs");
      setActivity(res.data);
    } catch (e) {
      setError("Failed to load activity logs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  return { activity, loading, error, fetchActivity };
}
