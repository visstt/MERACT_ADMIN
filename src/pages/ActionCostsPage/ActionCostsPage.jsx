import { useEffect, useMemo, useState } from "react";
import { Card, Button } from "../../shared/ui";
import api from "../../shared/lib/axios";
import { toast } from "react-toastify";
import styles from "./ActionCostsPage.module.css";

const DEFAULT_ACTIONS = [
  { actionKey: "CREATE_ACT", label: "Create Act" },
  { actionKey: "ADD_TEAM_TASK", label: "Add Team Task" },
  { actionKey: "CREATE_POLL", label: "Create Poll" },
];

export const ActionCostsPage = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(null);
  const [profile, setProfile] = useState(null);

  const isMainAdmin = profile?.role?.name === "main admin";

  useEffect(() => {
    try {
      const p = JSON.parse(
        localStorage.getItem("profile") || sessionStorage.getItem("profile"),
      );
      setProfile(p || null);
    } catch {
      setProfile(null);
    }
  }, []);

  const byKey = useMemo(
    () => new Map(rows.map((r) => [r.actionKey, r])),
    [rows],
  );

  const mergedRows = useMemo(
    () =>
      DEFAULT_ACTIONS.map((d) => ({
        actionKey: d.actionKey,
        label: d.label,
        amount: byKey.get(d.actionKey)?.amount ?? 0,
        isActive: byKey.get(d.actionKey)?.isActive ?? false,
      })),
    [byKey],
  );

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/action-costs");
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to load action costs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const updateLocal = (actionKey, patch) => {
    setRows((prev) => {
      const idx = prev.findIndex((x) => x.actionKey === actionKey);
      if (idx === -1) return [...prev, { actionKey, amount: 0, isActive: false, ...patch }];
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  };

  const saveRow = async (row) => {
    if (!isMainAdmin) return;
    setSavingKey(row.actionKey);
    try {
      await api.post("/admin/action-costs", {
        actionKey: row.actionKey,
        amount: Number(row.amount) || 0,
        isActive: Boolean(row.isActive),
      });
      toast.success(`${row.label} updated`);
      fetchData();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to save action cost");
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Action Costs</h1>
        <p className={styles.subtitle}>
          Configure wallet deductions for user actions.
        </p>
      </div>

      {!isMainAdmin && (
        <div className={styles.readonly}>
          Read-only mode: only main admin can change costs.
        </div>
      )}

      {loading ? (
        <div className={styles.loading}>Loading...</div>
      ) : (
        <div className={styles.grid}>
          {mergedRows.map((row) => (
            <Card key={row.actionKey} className={styles.card}>
              <div className={styles.rowTop}>
                <div>
                  <div className={styles.label}>{row.label}</div>
                  <div className={styles.key}>{row.actionKey}</div>
                </div>
                <label className={styles.switchWrap}>
                  <input
                    type="checkbox"
                    checked={Boolean(row.isActive)}
                    disabled={!isMainAdmin}
                    onChange={(e) =>
                      updateLocal(row.actionKey, { isActive: e.target.checked })
                    }
                  />
                  <span>{row.isActive ? "Enabled" : "Disabled"}</span>
                </label>
              </div>

              <div className={styles.controls}>
                <input
                  className={styles.input}
                  type="number"
                  min={0}
                  step={1}
                  disabled={!isMainAdmin}
                  value={row.amount}
                  onChange={(e) =>
                    updateLocal(row.actionKey, { amount: Number(e.target.value) })
                  }
                />
                <Button
                  disabled={!isMainAdmin || savingKey === row.actionKey}
                  onClick={() => saveRow(row)}
                >
                  {savingKey === row.actionKey ? "Saving..." : "Save"}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

