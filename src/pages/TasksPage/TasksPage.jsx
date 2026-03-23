import { useState, useEffect, useCallback } from "react";
import { Card, Button } from "../../shared/ui";
import api from "../../shared/lib/axios";
import { toast } from "react-toastify";
import styles from "./TasksPage.module.css";

const isMainAdmin = () => {
  try {
    const p =
      JSON.parse(localStorage.getItem("profile")) ||
      JSON.parse(sessionStorage.getItem("profile"));
    return p?.role?.name === "main admin";
  } catch {
    return false;
  }
};

const EMPTY_FORM = { title: "", description: "", deadline: "", assigneeId: "" };

export const TasksPage = () => {
  const mainAdmin = isMainAdmin();

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState("all"); // all | done | pending

  // Only needed for main admin (assign dropdown) — load admin contacts
  const [adminContacts, setAdminContacts] = useState([]);
  useEffect(() => {
    if (!mainAdmin) return;
    api
      .get("/admin/contacts")
      .then(({ data }) => setAdminContacts(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [mainAdmin]);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const url = mainAdmin ? "/admin/tasks" : "/admin/tasks/my";
      const { data } = await api.get(url);
      setTasks(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [mainAdmin]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const body = {
        title: formData.title,
        description: formData.description || undefined,
        deadline: formData.deadline || undefined,
        assigneeId: parseInt(formData.assigneeId, 10),
      };
      await api.post("/admin/tasks", body);
      toast.success("Task created!");
      setShowModal(false);
      setFormData(EMPTY_FORM);
      fetchTasks();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create task");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (task) => {
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, isDone: !t.isDone } : t)),
    );
    try {
      const { data: updated } = await api.patch(
        `/admin/tasks/${task.id}/toggle`,
      );
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, ...updated } : t)),
      );
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update task");
      fetchTasks(); // revert
    }
  };

  const handleDelete = async (taskId) => {
    if (!confirm("Delete this task?")) return;
    try {
      await api.delete(`/admin/tasks/${taskId}`);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      toast.success("Task deleted");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete task");
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (filter === "done") return t.isDone;
    if (filter === "pending") return !t.isDone;
    return true;
  });

  const formatDeadline = (iso) => {
    if (!iso) return null;
    const d = new Date(iso);
    const now = new Date();
    const overdue = !d.isDone && d < now;
    return {
      label: d.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      overdue,
    };
  };

  const pendingCount = tasks.filter((t) => !t.isDone).length;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Tasks</h1>
          <p className={styles.subtitle}>
            {mainAdmin
              ? "Assign and track tasks for admins"
              : "Your assigned tasks"}
          </p>
        </div>
        {mainAdmin && (
          <Button
            onClick={() => {
              setFormData(EMPTY_FORM);
              setShowModal(true);
            }}
          >
            + New task
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className={styles.stats}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{tasks.length}</span>
          <span className={styles.statLabel}>Total</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{pendingCount}</span>
          <span className={styles.statLabel}>Pending</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>
            {tasks.length - pendingCount}
          </span>
          <span className={styles.statLabel}>Done</span>
        </div>
      </div>

      {/* Filter tabs */}
      <div className={styles.tabs}>
        {["all", "pending", "done"].map((f) => (
          <button
            key={f}
            className={`${styles.tab} ${filter === f ? styles.tabActive : ""}`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className={styles.loading}>Loading...</div>
      ) : filteredTasks.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>✅</span>
          <p>
            {filter === "pending"
              ? "No pending tasks"
              : filter === "done"
                ? "No completed tasks"
                : "No tasks yet"}
          </p>
        </div>
      ) : (
        <div className={styles.taskList}>
          {filteredTasks.map((task) => {
            const dl = formatDeadline(task.deadline);
            return (
              <Card
                key={task.id}
                className={`${styles.taskCard} ${task.isDone ? styles.taskDone : ""}`}
              >
                <div className={styles.taskMain}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      className={styles.checkbox}
                      checked={task.isDone}
                      onChange={() => handleToggle(task)}
                    />
                    <span className={styles.checkboxCustom} />
                  </label>
                  <div className={styles.taskContent}>
                    <div className={styles.taskTitle}>{task.title}</div>
                    {task.description && (
                      <div className={styles.taskDesc}>{task.description}</div>
                    )}
                    <div className={styles.taskMeta}>
                      {task.assignee && (
                        <span className={styles.metaChip}>
                          <span className={styles.metaAvatar}>
                            {task.assignee.avatarUrl ? (
                              <img src={task.assignee.avatarUrl} alt="" />
                            ) : (
                              (
                                task.assignee.login ||
                                task.assignee.email ||
                                "?"
                              )
                                .charAt(0)
                                .toUpperCase()
                            )}
                          </span>
                          {task.assignee.login || task.assignee.email}
                        </span>
                      )}
                      {dl && (
                        <span
                          className={`${styles.metaChip} ${dl.overdue && !task.isDone ? styles.overdue : ""}`}
                        >
                          📅 {dl.label}
                        </span>
                      )}
                      {task.isDone && task.doneAt && (
                        <span className={styles.metaChip}>
                          ✅{" "}
                          {new Date(task.doneAt).toLocaleDateString("en-US", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {mainAdmin && (
                  <button
                    className={styles.deleteBtn}
                    onClick={() => handleDelete(task.id)}
                    title="Delete task"
                  >
                    ×
                  </button>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Create modal */}
      {showModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowModal(false)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>New task</h2>
              <button
                className={styles.closeBtn}
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>
            <form className={styles.modalBody} onSubmit={handleCreate}>
              <div className={styles.formGroup}>
                <label>Title</label>
                <input
                  type="text"
                  placeholder="Task title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>
                  Description <span className={styles.opt}>optional</span>
                </label>
                <textarea
                  placeholder="Details..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                />
              </div>
              <div className={styles.formGroup}>
                <label>
                  Deadline <span className={styles.opt}>optional</span>
                </label>
                <input
                  type="datetime-local"
                  lang="en"
                  value={formData.deadline}
                  onChange={(e) =>
                    setFormData({ ...formData, deadline: e.target.value })
                  }
                />
              </div>
              <div className={styles.formGroup}>
                <label>Assign to</label>
                <select
                  value={formData.assigneeId}
                  onChange={(e) =>
                    setFormData({ ...formData, assigneeId: e.target.value })
                  }
                  required
                >
                  <option value="">Select admin...</option>
                  {adminContacts.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.login || u.email}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.modalActions}>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Creating..." : "Create"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
