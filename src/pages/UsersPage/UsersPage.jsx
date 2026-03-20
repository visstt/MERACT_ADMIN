import { useEffect, useState } from "react";
import { Card, Button } from "../../shared/ui";
import styles from "./UsersPage.module.css";
import {
  useUsers,
  useUserActions,
  useAdjustUser,
} from "../../shared/hooks/useUsers";
import { useUserLogs } from "../../shared/hooks/useUserLogs";
import api from "../../shared/lib/axios";
import { toast } from "react-toastify";

const STATUS_MAP = {
  ACTIVE: "active",
  WARNED: "warning",
  BLOCKED: "blocked",
};

export const UsersPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isMobileCardView, setIsMobileCardView] = useState(false);
  const [logsModalUser, setLogsModalUser] = useState(null);
  const [adjustModalUser, setAdjustModalUser] = useState(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustType, setAdjustType] = useState("points");
  const { users, loading, error, fetchUsers, setUsers } = useUsers();
  const { userAction, loading: actionLoading } = useUserActions(fetchUsers);
  const { adjustUser, loading: adjustLoading } = useAdjustUser();
  const {
    logs,
    loading: logsLoading,
    error: logsError,
    fetchUserLogs,
  } = useUserLogs();

  useEffect(() => {
    const checkMobile = () => setIsMobileCardView(window.innerWidth <= 480);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || user.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleUserRowClick = async (user) => {
    setLogsModalUser(user);
    await fetchUserLogs(user.id);
  };
  const handleUserAction = async (userId, action) => {
    await userAction(userId, action);
  };
  const closeLogsModal = () => {
    setLogsModalUser(null);
  };

  const handleOpenAdjustModal = (e, user) => {
    e.stopPropagation();
    setAdjustModalUser(user);
    setAdjustAmount("");
    setAdjustType("points");
  };

  const handleCloseAdjustModal = () => {
    setAdjustModalUser(null);
  };

  const handleAdjust = async () => {
    if (!adjustModalUser || !adjustAmount) return;
    try {
      await adjustUser(
        adjustModalUser.id,
        parseInt(adjustAmount, 10),
        adjustType,
      );
      const label = adjustType === "points" ? "Impulses" : "Echo";
      toast.success(`${label} updated for ${adjustModalUser.username}`);
      handleCloseAdjustModal();
    } catch {
      toast.error("Failed to adjust");
    }
  };
  const handleSelectUser = (userId) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };
  const handleBulkAction = (action) => {
    selectedUsers.forEach((userId) => {
      handleUserAction(userId, action);
    });
    setSelectedUsers([]);
  };
  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { label: "Active", className: "success" },
      warning: { label: "Warning", className: "warning" },
      blocked: { label: "Blocked", className: "error" },
    };
    const config = statusConfig[status] || statusConfig.active;
    return (
      <span className={`${styles.statusBadge} ${styles[config.className]}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className={styles.usersPage}>
      {logsModalUser && (
        <div className={styles.modalOverlay} onClick={closeLogsModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>
                User logs: {logsModalUser.username || logsModalUser.email}
              </h2>
              <button onClick={closeLogsModal} className={styles.closeButton}>
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              {logsLoading ? (
                <div>Loading...</div>
              ) : logsError ? (
                <div style={{ color: "red" }}>{logsError}</div>
              ) : logs.length === 0 ? (
                <div>No logs for this user</div>
              ) : (
                <div className={styles.activityList}>
                  {[...logs].reverse().map((log, i) => {
                    let dotClass = styles.info;
                    const action = log.action?.toLowerCase() || "";
                    if (action.includes("unblocked")) dotClass = styles.success;
                    else if (action.includes("warning"))
                      dotClass = styles.warning;
                    else if (action.includes("blocked"))
                      dotClass = styles.error;
                    return (
                      <div key={log.id || i} className={styles.activityItem}>
                        <div className={`${styles.activityDot} ${dotClass}`} />
                        <div className={styles.activityContent}>
                          <div className={styles.activityMessage}>
                            {log.action}
                          </div>
                          <div className={styles.activityTime}>
                            {log.timeAgo}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>User Management</h1>
          <p className={styles.subtitle}>Manage accounts and moderate users</p>
        </div>
      </div>

      <Card padding="lg" className={styles.filtersCard}>
        <div className={styles.filters}>
          <div className={styles.searchGroup}>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="warning">With warnings</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>

          {selectedUsers.length > 0 && (
            <div className={styles.bulkActions}>
              <span className={styles.selectedCount}>
                Selected: {selectedUsers.length}
              </span>
              <div className={styles.bulkButtons}>
                <Button
                  variant="warning"
                  size="sm"
                  onClick={() => handleBulkAction("warn")}
                >
                  Warn
                </Button>
                <Button
                  variant="error"
                  size="sm"
                  onClick={() => handleBulkAction("block")}
                >
                  Block
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedUsers([])}
                >
                  Cancel selection
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {!isMobileCardView && (
        <Card padding="none" className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <h2 className={styles.tableTitle}>
              User list ({filteredUsers.length})
            </h2>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUsers(filteredUsers.map((u) => u.id));
                        } else {
                          setSelectedUsers([]);
                        }
                      }}
                      checked={
                        selectedUsers.length === filteredUsers.length &&
                        filteredUsers.length > 0
                      }
                    />
                  </th>
                  <th>User</th>
                  <th>Status</th>
                  <th>Last active</th>
                  <th>Warnings</th>
                  <th>Streams</th>
                  <th>Followers</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className={
                      selectedUsers.includes(user.id) ? styles.selected : ""
                    }
                    onClick={() => handleUserRowClick(user)}
                    style={{ cursor: "pointer" }}
                  >
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleSelectUser(user.id);
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td>
                      <div className={styles.userInfo}>
                        <div className={styles.userAvatar}>
                          {user.avatarUrl ? (
                            <img
                              src={user.avatarUrl}
                              alt={user.username}
                              className={styles.userAvatarImg}
                            />
                          ) : (
                            user.username.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div className={styles.username}>{user.username}</div>
                          <div className={styles.email}>{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>{getStatusBadge(user.status)}</td>
                    <td className={styles.lastActive}>{user.lastActive}</td>
                    <td>
                      <span
                        className={`${styles.warningBadge} ${
                          user.warnings > 0 ? styles.hasWarnings : ""
                        }`}
                      >
                        {user.warnings}
                      </span>
                    </td>
                    <td>{user.streamCount}</td>
                    <td>{user.followers.toLocaleString()}</td>
                    <td>
                      <div className={styles.actions}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUserAction(user.id, "warn");
                          }}
                          disabled={user.status === "blocked"}
                        >
                          ⚠️
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUserAction(
                              user.id,
                              user.status === "blocked" ? "unblock" : "block",
                            );
                          }}
                        >
                          {user.status === "blocked" ? "✅" : "🚫"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUserAction(user.id, "delete");
                          }}
                        >
                          🗑️
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Adjust points / balance"
                          onClick={(e) => handleOpenAdjustModal(e, user)}
                        >
                          💰
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredUsers.length === 0 && (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>👥</div>
                <div className={styles.emptyTitle}>Users not found</div>
                <div className={styles.emptyText}>
                  Try changing search or filter parameters
                </div>
              </div>
            )}
          </div>
        </Card>
      )}
      {isMobileCardView && (
        <div className={styles.userCards}>
          {filteredUsers.map((user) => (
            <div
              key={user.id}
              className={styles.userCard}
              onClick={() => handleUserRowClick(user)}
              style={{ cursor: "pointer" }}
            >
              <div className={styles.userCardHeader}>
                <div className={styles.userCardAvatar}>
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.username}
                      className={styles.userAvatarImg}
                    />
                  ) : (
                    user.username.charAt(0).toUpperCase()
                  )}
                </div>
                <div className={styles.userCardInfo}>
                  <div className={styles.userCardName}>{user.username}</div>
                  <div className={styles.userCardEmail}>{user.email}</div>
                </div>
                <div>{getStatusBadge(user.status)}</div>
              </div>
              <div className={styles.userCardRow}>
                <span>Last active: {user.lastActive}</span>
                <span>Warnings: {user.warnings}</span>
              </div>
              <div className={styles.userCardRow}>
                <span>Streams: {user.streamCount}</span>
                <span>Followers: {user.followers.toLocaleString()}</span>
              </div>
              <div className={styles.userCardActions}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUserAction(user.id, "warn");
                  }}
                  disabled={user.status === "blocked"}
                >
                  ⚠️
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUserAction(
                      user.id,
                      user.status === "blocked" ? "unblock" : "block",
                    );
                  }}
                >
                  {user.status === "blocked" ? "✅" : "🚫"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUserAction(user.id, "delete");
                  }}
                >
                  🗑️
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  title="Adjust points / balance"
                  onClick={(e) => handleOpenAdjustModal(e, user)}
                >
                  💰
                </Button>
              </div>
            </div>
          ))}
          {filteredUsers.length === 0 && (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>👥</div>
              <div className={styles.emptyTitle}>Users not found</div>
              <div className={styles.emptyText}>
                Try changing search or filter parameters
              </div>
            </div>
          )}
        </div>
      )}
      {adjustModalUser && (
        <div className={styles.modalOverlay} onClick={handleCloseAdjustModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Adjust: {adjustModalUser.username}</h2>
              <button
                onClick={handleCloseAdjustModal}
                className={styles.closeButton}
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <div
                style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}
              >
                <Button
                  variant={adjustType === "points" ? "primary" : "ghost"}
                  size="sm"
                  onClick={() => setAdjustType("points")}
                >
                  ⚡ Impulses
                </Button>
                <Button
                  variant={adjustType === "balance" ? "primary" : "ghost"}
                  size="sm"
                  onClick={() => setAdjustType("balance")}
                >
                  💎 Echo
                </Button>
              </div>
              <input
                type="number"
                placeholder="Amount (negative = subtract)"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.625rem 0.75rem",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-gray-300)",
                  fontSize: "var(--font-size-base)",
                  background: "var(--color-bg, #fff)",
                  color: "var(--color-gray-800)",
                  boxSizing: "border-box",
                }}
              />
              <div
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  marginTop: "1rem",
                  justifyContent: "flex-end",
                }}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCloseAdjustModal}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleAdjust}
                  disabled={adjustLoading || !adjustAmount}
                >
                  {adjustLoading ? "Loading..." : "Apply"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
