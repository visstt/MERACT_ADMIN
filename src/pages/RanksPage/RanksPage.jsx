import { useState, useEffect } from "react";
import { Card, Button } from "../../shared/ui";
import api from "../../shared/lib/axios";
import { useUsers } from "../../shared/hooks/useUsers";
import { toast } from "react-toastify";
import styles from "./RanksPage.module.css";

export const RanksPage = () => {
  const [ranks, setRanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAwardModal, setShowAwardModal] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [showUserRanksModal, setShowUserRanksModal] = useState(false);
  const [selectedRank, setSelectedRank] = useState(null);
  const [editingRank, setEditingRank] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [userRanks, setUserRanks] = useState([]);
  const [loadingUserRanks, setLoadingUserRanks] = useState(false);

  const { users } = useUsers();

  const [iconMode, setIconMode] = useState("pack"); // "pack" | "upload"
  const [activePack, setActivePack] = useState(null);
  const [selectedIconPackItemId, setSelectedIconPackItemId] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);

  const loadActivePack = async () => {
    try {
      const { data } = await api.get("/icon-pack/active?type=RANK");
      setActivePack(data);
    } catch {
      setActivePack(null);
    }
  };

  const [formData, setFormData] = useState({
    name: "",
  });

  useEffect(() => {
    fetchRanks();
  }, []);

  const fetchRanks = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/rank/find-all");
      setRanks(res.data);
    } catch (err) {
      setError("Failed to load ranks");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const data = new FormData();
      data.append("name", formData.name);
      if (iconMode === "upload" && photoFile) {
        data.append("photo", photoFile);
      } else if (iconMode === "pack" && selectedIconPackItemId) {
        data.append("iconPackItemId", String(selectedIconPackItemId));
      }
      await api.post("/rank/create-rank", data);
      setShowCreateModal(false);
      setFormData({ name: "" });
      setPhotoFile(null);
      setSelectedIconPackItemId(null);
      fetchRanks();
      toast.success("Rank created successfully!");
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Failed to create rank";
      toast.error(errorMsg);
      console.error(err);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/rank/update-rank/${editingRank.id}`, formData);
      setEditingRank(null);
      setFormData({ name: "" });
      fetchRanks();
      toast.success("Rank updated successfully!");
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Failed to update rank";
      toast.error(errorMsg);
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this rank?")) return;
    try {
      await api.delete(`/rank/delete-rank/${id}`);
      fetchRanks();
      toast.success("Rank deleted successfully!");
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Failed to delete rank";
      toast.error(errorMsg);
      console.error(err);
    }
  };

  const handleAwardRank = async () => {
    if (!selectedUserId || !selectedRank) return;
    try {
      await api.post("/rank/award", {
        userId: parseInt(selectedUserId),
        rankId: selectedRank.id,
      });
      setShowAwardModal(false);
      setSelectedUserId("");
      setSelectedRank(null);
      setSearchQuery("");
      toast.success("Rank awarded successfully!");
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Failed to award rank";
      toast.error(errorMsg);
      console.error(err);
    }
  };

  const handleRevokeRank = async () => {
    if (!selectedUserId || !selectedRank) return;
    try {
      await api.delete(`/rank/user/${selectedUserId}`, {
        data: {
          userId: parseInt(selectedUserId),
          rankId: selectedRank.id,
        },
      });
      setShowRevokeModal(false);
      setSelectedUserId("");
      setSelectedRank(null);
      setSearchQuery("");
      toast.success("Rank revoked successfully!");
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Failed to revoke rank";
      toast.error(errorMsg);
      console.error(err);
    }
  };

  const fetchUserRanks = async (userId) => {
    setLoadingUserRanks(true);
    try {
      const res = await api.get(`/rank/user/${userId}`);
      // Extract rank objects from the response
      const ranksData = res.data.map((item) => item.rank);
      setUserRanks(ranksData);
    } catch (err) {
      toast.error("Failed to load user ranks");
      console.error(err);
      setUserRanks([]);
    } finally {
      setLoadingUserRanks(false);
    }
  };

  const openCreateModal = () => {
    setFormData({ name: "" });
    setPhotoFile(null);
    setSelectedIconPackItemId(null);
    setIconMode("pack");
    setEditingRank(null);
    setShowCreateModal(true);
    loadActivePack();
  };

  const openEditModal = (rank) => {
    setFormData({
      name: rank.name || "",
    });
    setEditingRank(rank);
    setShowCreateModal(true);
  };

  const openAwardModal = (rank) => {
    setSelectedRank(rank);
    setShowAwardModal(true);
  };

  const openRevokeModal = (rank) => {
    setSelectedRank(rank);
    setShowRevokeModal(true);
  };

  const openUserRanksModal = async (user) => {
    setSelectedUserId(user.id.toString());
    setShowUserRanksModal(true);
    await fetchUserRanks(user.id);
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setEditingRank(null);
    setPhotoFile(null);
    setSelectedIconPackItemId(null);
    setFormData({ name: "" });
  };

  const closeAwardModal = () => {
    setShowAwardModal(false);
    setSelectedRank(null);
    setSelectedUserId("");
    setSearchQuery("");
  };

  const closeRevokeModal = () => {
    setShowRevokeModal(false);
    setSelectedRank(null);
    setSelectedUserId("");
    setSearchQuery("");
  };

  const closeUserRanksModal = () => {
    setShowUserRanksModal(false);
    setSelectedUserId("");
    setUserRanks([]);
  };

  if (loading) return <div className={styles.loading}>Loading...</div>;
  if (error) return <div className={styles.error}>{error}</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Ranks</h1>
        <Button onClick={openCreateModal}>Create Rank</Button>
      </div>

      <div className={styles.grid}>
        {ranks.map((rank) => (
          <Card key={rank.id} className={styles.rankCard}>
            <div className={styles.rankIcon}>🎖️</div>
            <h3 className={styles.rankTitle}>{rank.name}</h3>
            <div className={styles.actions}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openEditModal(rank)}
              >
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(rank.id)}
              >
                Delete
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => openAwardModal(rank)}
              >
                Award
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openRevokeModal(rank)}
              >
                Revoke
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <div className={styles.usersSection}>
        <h2 className={styles.sectionTitle}>Users</h2>
        <div className={styles.usersList}>
          {users.slice(0, 20).map((user) => (
            <Card
              key={user.id}
              className={styles.userCard}
              onClick={() => openUserRanksModal(user)}
            >
              <div className={styles.userAvatar}>
                {user.login
                  ? user.login.charAt(0).toUpperCase()
                  : user.email.charAt(0).toUpperCase()}
              </div>
              <div className={styles.userInfo}>
                <div className={styles.userName}>
                  {user.login || user.email.split("@")[0]}
                </div>
                <div className={styles.userEmail}>{user.email}</div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {showCreateModal && (
        <div className={styles.modal} onClick={closeModal}>
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2>{editingRank ? "Edit Rank" : "Create Rank"}</h2>
              <button className={styles.closeButton} onClick={closeModal}>
                ×
              </button>
            </div>
            <form onSubmit={editingRank ? handleUpdate : handleCreate}>
              <div className={styles.formGroup}>
                <label>Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  placeholder="Бывалый"
                />
              </div>
              {!editingRank && (
                <div className={styles.formGroup}>
                  <label>Icon</label>
                  <div className={styles.iconModeTabs}>
                    <button
                      type="button"
                      className={`${styles.iconModeTab} ${iconMode === "pack" ? styles.iconModeTabActive : ""}`}
                      onClick={() => setIconMode("pack")}
                    >
                      From pack
                    </button>
                    <button
                      type="button"
                      className={`${styles.iconModeTab} ${iconMode === "upload" ? styles.iconModeTabActive : ""}`}
                      onClick={() => setIconMode("upload")}
                    >
                      Upload photo
                    </button>
                  </div>

                  {iconMode === "upload" ? (
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setPhotoFile(e.target.files[0] || null)}
                    />
                  ) : activePack && activePack.icons?.length > 0 ? (
                    <div>
                      <p className={styles.packHint}>
                        Active pack: <b>{activePack.name}</b>
                      </p>
                      <div className={styles.iconPickerGrid}>
                        {activePack.icons.map((icon) => (
                          <button
                            key={icon.id}
                            type="button"
                            className={`${styles.iconPickerItem} ${selectedIconPackItemId === icon.id ? styles.iconPickerItemSelected : ""}`}
                            onClick={() => setSelectedIconPackItemId(icon.id)}
                            title={icon.name}
                          >
                            <img src={icon.url} alt={icon.name} />
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className={styles.noPackHint}>
                      No active rank pack. Go to Icon Packs to create and
                      activate one, or use Upload photo.
                    </p>
                  )}
                </div>
              )}
              <div className={styles.modalActions}>
                <Button type="button" variant="ghost" onClick={closeModal}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingRank ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAwardModal && selectedRank && (
        <div className={styles.modal} onClick={closeAwardModal}>
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2>Award Rank</h2>
              <button className={styles.closeButton} onClick={closeAwardModal}>
                ×
              </button>
            </div>
            <div className={styles.rankInfo}>
              <div className={styles.rankIconLarge}>🎖️</div>
              <h3>{selectedRank.name}</h3>
            </div>
            <div className={styles.formGroup}>
              <label>Search User</label>
              <input
                type="text"
                placeholder="Search by username or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className={styles.userList}>
              {users
                .filter(
                  (user) =>
                    user.login
                      ?.toLowerCase()
                      .includes(searchQuery.toLowerCase()) ||
                    user.email
                      ?.toLowerCase()
                      .includes(searchQuery.toLowerCase()),
                )
                .slice(0, 10)
                .map((user) => (
                  <div
                    key={user.id}
                    className={`${styles.userItem} ${
                      selectedUserId === user.id.toString()
                        ? styles.selected
                        : ""
                    }`}
                    onClick={() => setSelectedUserId(user.id.toString())}
                  >
                    <div className={styles.userAvatarSmall}>
                      {user.login
                        ? user.login.charAt(0).toUpperCase()
                        : user.email.charAt(0).toUpperCase()}
                    </div>
                    <div className={styles.userDetails}>
                      <div className={styles.userNameSmall}>
                        {user.login || user.email.split("@")[0]}
                      </div>
                      <div className={styles.userEmailSmall}>{user.email}</div>
                    </div>
                    {selectedUserId === user.id.toString() && (
                      <div className={styles.checkmark}>✓</div>
                    )}
                  </div>
                ))}
            </div>
            <div className={styles.modalActions}>
              <Button type="button" variant="ghost" onClick={closeAwardModal}>
                Cancel
              </Button>
              <Button onClick={handleAwardRank} disabled={!selectedUserId}>
                Award Rank
              </Button>
            </div>
          </div>
        </div>
      )}

      {showRevokeModal && selectedRank && (
        <div className={styles.modal} onClick={closeRevokeModal}>
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2>Revoke Rank</h2>
              <button className={styles.closeButton} onClick={closeRevokeModal}>
                ×
              </button>
            </div>
            <div className={styles.rankInfo}>
              <div className={styles.rankIconLarge}>🎖️</div>
              <h3>{selectedRank.name}</h3>
            </div>
            <div className={styles.formGroup}>
              <label>Search User</label>
              <input
                type="text"
                placeholder="Search by username or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className={styles.userList}>
              {users
                .filter(
                  (user) =>
                    user.login
                      ?.toLowerCase()
                      .includes(searchQuery.toLowerCase()) ||
                    user.email
                      ?.toLowerCase()
                      .includes(searchQuery.toLowerCase()),
                )
                .slice(0, 10)
                .map((user) => (
                  <div
                    key={user.id}
                    className={`${styles.userItem} ${
                      selectedUserId === user.id.toString()
                        ? styles.selected
                        : ""
                    }`}
                    onClick={() => setSelectedUserId(user.id.toString())}
                  >
                    <div className={styles.userAvatarSmall}>
                      {user.login
                        ? user.login.charAt(0).toUpperCase()
                        : user.email.charAt(0).toUpperCase()}
                    </div>
                    <div className={styles.userDetails}>
                      <div className={styles.userNameSmall}>
                        {user.login || user.email.split("@")[0]}
                      </div>
                      <div className={styles.userEmailSmall}>{user.email}</div>
                    </div>
                    {selectedUserId === user.id.toString() && (
                      <div className={styles.checkmark}>✓</div>
                    )}
                  </div>
                ))}
            </div>
            <div className={styles.modalActions}>
              <Button type="button" variant="ghost" onClick={closeRevokeModal}>
                Cancel
              </Button>
              <Button onClick={handleRevokeRank} disabled={!selectedUserId}>
                Revoke Rank
              </Button>
            </div>
          </div>
        </div>
      )}

      {showUserRanksModal && (
        <div className={styles.modal} onClick={closeUserRanksModal}>
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2>User Ranks</h2>
              <button
                className={styles.closeButton}
                onClick={closeUserRanksModal}
              >
                ×
              </button>
            </div>
            {loadingUserRanks ? (
              <div className={styles.loadingText}>Loading...</div>
            ) : userRanks.length === 0 ? (
              <div className={styles.emptyText}>
                No ranks assigned to this user
              </div>
            ) : (
              <div className={styles.userRanksList}>
                {userRanks.map((rank) => (
                  <div key={rank.id} className={styles.userRankItem}>
                    <div className={styles.rankIconSmall}>🎖️</div>
                    <div className={styles.rankName}>{rank.name}</div>
                  </div>
                ))}
              </div>
            )}
            <div className={styles.modalActions}>
              <Button type="button" onClick={closeUserRanksModal}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
