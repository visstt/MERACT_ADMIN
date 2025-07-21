import { useState, useCallback } from "react";
import api from "../lib/axios";

export function useUserLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchUserLogs = useCallback(async (userId) => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(
        `/user/activity-logs-for-user?userId=${userId}`
      );
      setLogs(res.data);
    } catch (e) {
      setError("Failed to load user logs");
    } finally {
      setLoading(false);
    }
  }, []);

  return { logs, loading, error, fetchUserLogs };
}
