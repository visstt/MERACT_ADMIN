import { useState, useEffect, useCallback } from "react";
import api from "../lib/axios";

const STATUS_MAP = {
  ACTIVE: "active",
  WARNED: "warning",
  BLOCKED: "blocked",
};

export function useUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/user/all-users");
      setUsers(
        res.data
          .map((u) => ({
            id: u.id,
            username: u.login || u.email,
            email: u.email,
            status: STATUS_MAP[u.status] || "active",
            lastActive: u.lastActivity,
            warnings: u.warnings,
            streamCount: u.streams,
            followers: u.followers,
          }))
          .sort((a, b) => a.email.localeCompare(b.email))
      );
    } catch (e) {
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return { users, loading, error, fetchUsers, setUsers };
}

export function useUserActions(fetchUsers) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const userAction = useCallback(
    async (userId, action) => {
      setLoading(true);
      setError("");
      let url = "";
      if (action === "warn") url = `/user/issue-warning?userId=${userId}`;
      if (action === "block") url = `/user/block-user?userId=${userId}`;
      if (action === "unblock") url = `/user/unblock-user?userId=${userId}`;
      if (action === "delete") url = `/user/delete-user?userId=${userId}`;
      try {
        await api.post(url);
        if (fetchUsers) await fetchUsers();
      } catch (e) {
        setError("Action failed");
      } finally {
        setLoading(false);
      }
    },
    [fetchUsers]
  );

  return { userAction, loading, error };
}
