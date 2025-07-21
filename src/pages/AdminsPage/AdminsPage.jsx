import { useEffect, useState } from "react";
import styles from "./AdminsPage.module.css";
import api from "../../shared/lib/axios";
import { Card, Button } from "../../shared/ui";

export const AdminsPage = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [editData, setEditData] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createData, setCreateData] = useState({
    login: "",
    password: "",
    email: "",
  });
  const [actionLoading, setActionLoading] = useState(false);

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/find-all");
      setAdmins(res.data);
    } catch (e) {
      setError("Failed to load admins");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleEdit = (admin) => {
    setSelectedAdmin({ ...admin });
    setEditData({
      login: admin.login,
      oldPassword: "",
      newPassword: "",
      email: admin.email,
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const payload = {
        login: editData.login ?? selectedAdmin.login ?? "",
        email: editData.email ?? selectedAdmin.email ?? "",
        oldPassword: editData.oldPassword ?? "",
        newPassword: editData.newPassword ?? "",
      };
      await api.put(`/admin/${selectedAdmin.id}`, payload);
      setSelectedAdmin(null);
      setEditData(null);
      fetchAdmins();
    } catch (err) {
      if (err?.response?.data?.message) {
        setError(
          Array.isArray(err.response.data.message)
            ? err.response.data.message.join(", ")
            : err.response.data.message
        );
      } else {
        setError("Failed to update admin");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this admin?")) return;
    setActionLoading(true);
    try {
      await api.delete(`/admin/${id}`);
      fetchAdmins();
    } catch {
      setError("Failed to delete admin");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await api.post("/admin/create-admin", createData);
      setShowCreate(false);
      setCreateData({ login: "", password: "", email: "" });
      fetchAdmins();
    } catch {
      setError("Failed to create admin");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className={styles.adminsPage}>
      <div className={styles.header}>
        <h1>Admins Management</h1>
        <Button onClick={() => setShowCreate(true)} variant="primary">
          Add Admin
        </Button>
      </div>
      {error && <div className={styles.error}>{error}</div>}
      {loading ? (
        <div>Loading...</div>
      ) : (
        <Card className={styles.adminsCard}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Login</th>
                <th>Email</th>
                <th>Status</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => (
                <tr key={admin.id}>
                  <td>{admin.login}</td>
                  <td>{admin.email}</td>
                  <td>{admin.status}</td>
                  <td>{admin.role?.name}</td>
                  <td>
                    <Button
                      size="sm"
                      variant="primary"
                      style={{ marginRight: "8px" }}
                      onClick={() => handleEdit(admin)}
                      disabled={actionLoading}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="error"
                      onClick={() => handleDelete(admin.id)}
                      disabled={actionLoading}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      {/* Edit Modal */}
      {selectedAdmin && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <form onSubmit={handleEditSubmit} className={styles.modalForm}>
              <h2>Edit Admin</h2>
              <label>
                <span>Login</span>
                <input
                  value={editData.login}
                  onChange={(e) =>
                    setEditData({ ...editData, login: e.target.value })
                  }
                  required
                />
              </label>
              <label>
                <span>Email</span>
                <input
                  value={editData.email}
                  onChange={(e) =>
                    setEditData({ ...editData, email: e.target.value })
                  }
                  required
                />
              </label>
              <label>
                <span>Old password</span>
                <input
                  value={editData.oldPassword}
                  onChange={(e) =>
                    setEditData({ ...editData, oldPassword: e.target.value })
                  }
                  type="password"
                  placeholder="Enter current password to change password"
                  autoComplete="current-password"
                />
              </label>
              <label>
                <span>New password</span>
                <input
                  value={editData.newPassword}
                  onChange={(e) =>
                    setEditData({ ...editData, newPassword: e.target.value })
                  }
                  type="password"
                  placeholder="Enter new password"
                  autoComplete="new-password"
                />
              </label>
              <div className={styles.modalActions}>
                <Button type="submit" disabled={actionLoading}>
                  Save
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setSelectedAdmin(null)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Create Modal */}
      {showCreate && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <form onSubmit={handleCreate} className={styles.modalForm}>
              <h2>Add Admin</h2>
              <label>
                Login
                <input
                  value={createData.login}
                  onChange={(e) =>
                    setCreateData({ ...createData, login: e.target.value })
                  }
                  required
                />
              </label>
              <label>
                <span>Password</span>
                <input
                  value={createData.password}
                  onChange={(e) =>
                    setCreateData({ ...createData, password: e.target.value })
                  }
                  required
                  type="text"
                />
              </label>
              <label>
                Email
                <input
                  value={createData.email}
                  onChange={(e) =>
                    setCreateData({ ...createData, email: e.target.value })
                  }
                  required
                />
              </label>
              <div className={styles.modalActions}>
                <Button type="submit" disabled={actionLoading}>
                  Create
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
