import { useState, useEffect } from "react";
import { Card, Button } from "../../shared/ui";
import api from "../../shared/lib/axios";
import { useUsers } from "../../shared/hooks/useUsers";
import { toast } from "react-toastify";
import styles from "./AchievementsPage.module.css";

export const AchievementsPage = () => {
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAwardModal, setShowAwardModal] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState(null);
  const [editingAchievement, setEditingAchievement] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [revokeSelectedUserId, setRevokeSelectedUserId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [revokeSearchQuery, setRevokeSearchQuery] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [iconMode, setIconMode] = useState("pack"); // "pack" | "upload"
  const [activePack, setActivePack] = useState(null);
  const [selectedIconPackItemId, setSelectedIconPackItemId] = useState(null);

  const { users } = useUsers();

  const loadActivePack = async () => {
    try {
      const { data } = await api.get("/icon-pack/active?type=ACHIEVEMENT");
      setActivePack(data);
    } catch {
      setActivePack(null);
    }
  };

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    icon: "",
    rarity: "common",
  });

  useEffect(() => {
    fetchAchievements();
  }, []);

  const fetchAchievements = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/achievement/find-all");
      setAchievements(res.data);
    } catch (err) {
      setError("Failed to load achievements");
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
      await api.post("/achievement/create-achievement", data);
      setShowCreateModal(false);
      setFormData({ name: "", description: "", icon: "", rarity: "common" });
      setPhotoFile(null);
      setSelectedIconPackItemId(null);
      fetchAchievements();
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || "Failed to create achievement";
      toast.error(errorMsg);
      console.error(err);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const data = new FormData();
      data.append("name", formData.name);
      if (iconMode === "upload" && photoFile) {
        data.append("photo", photoFile);
      } else if (iconMode === "pack" && selectedIconPackItemId) {
        data.append("iconPackItemId", String(selectedIconPackItemId));
      }
      await api.put(
        `/achievement/update-achievement/${editingAchievement.id}`,
        data,
      );
      setEditingAchievement(null);
      setFormData({ name: "", description: "", icon: "", rarity: "common" });
      setPhotoFile(null);
      setSelectedIconPackItemId(null);
      fetchAchievements();
      toast.success("Achievement updated successfully!");
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || "Failed to update achievement";
      toast.error(errorMsg);
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this achievement?")) return;
    try {
      await api.delete(`/achievement/delete-achievement/${id}`);
      fetchAchievements();
      toast.success("Achievement deleted successfully!");
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || "Failed to delete achievement";
      toast.error(errorMsg);
      console.error(err);
    }
  };

  const handleAwardAchievement = async () => {
    if (!selectedUserId || !selectedAchievement) return;
    try {
      await api.post("/achievement/award", {
        userId: parseInt(selectedUserId),
        achievementId: selectedAchievement.id,
      });
      setShowAwardModal(false);
      setSelectedUserId("");
      setSelectedAchievement(null);
      setSearchQuery("");
      toast.success("Achievement awarded successfully!");
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || "Failed to award achievement";
      toast.error(errorMsg);
      console.error(err);
    }
  };

  const handleRevokeAchievement = async () => {
    if (!revokeSelectedUserId || !selectedAchievement) return;
    try {
      await api.post("/achievement/revoke", {
        userId: parseInt(revokeSelectedUserId),
        achievementId: selectedAchievement.id,
      });
      setShowRevokeModal(false);
      setRevokeSelectedUserId("");
      setSelectedAchievement(null);
      setRevokeSearchQuery("");
      toast.success("Achievement revoked successfully!");
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || "Failed to revoke achievement";
      toast.error(errorMsg);
      console.error(err);
    }
  };

  const openCreateModal = () => {
    setFormData({ name: "", description: "", icon: "", rarity: "common" });
    setPhotoFile(null);
    setSelectedIconPackItemId(null);
    setIconMode("pack");
    setEditingAchievement(null);
    setShowCreateModal(true);
    loadActivePack();
  };

  const openEditModal = (achievement) => {
    setFormData({
      name: achievement.name || "",
      description: achievement.description || "",
      icon: achievement.icon || "",
      rarity: achievement.rarity || "common",
    });
    setPhotoFile(null);
    setSelectedIconPackItemId(null);
    setIconMode("pack");
    setEditingAchievement(achievement);
    setShowCreateModal(true);
    loadActivePack();
  };

  const openAwardModal = (achievement) => {
    setSelectedAchievement(achievement);
    setShowAwardModal(true);
  };

  const openRevokeModal = (e, achievement) => {
    e.stopPropagation();
    setSelectedAchievement(achievement);
    setRevokeSelectedUserId("");
    setRevokeSearchQuery("");
    setShowRevokeModal(true);
  };

  const closeRevokeModal = () => {
    setShowRevokeModal(false);
    setSelectedAchievement(null);
    setRevokeSelectedUserId("");
    setRevokeSearchQuery("");
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setEditingAchievement(null);
    setPhotoFile(null);
    setSelectedIconPackItemId(null);
    setFormData({ name: "", description: "", icon: "", rarity: "common" });
  };

  const closeAwardModal = () => {
    setShowAwardModal(false);
    setSelectedAchievement(null);
    setSelectedUserId("");
    setSearchQuery("");
  };

  if (loading) return <div className={styles.loading}>Loading...</div>;
  if (error) return <div className={styles.error}>{error}</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Achievements</h1>
        <Button onClick={openCreateModal}>Create Achievement</Button>
      </div>

      <div className={styles.grid}>
        {achievements.map((achievement) => (
          <Card
            key={achievement.id}
            className={styles.achievementCard}
            onClick={() => openAwardModal(achievement)}
          >
            <div className={styles.achievementImageWrap}>
              {achievement.imageUrl ? (
                <img
                  src={achievement.imageUrl}
                  alt={achievement.name}
                  className={styles.achievementImage}
                />
              ) : (
                <div className={styles.achievementPlaceholder}>🏆</div>
              )}
            </div>
            <h3 className={styles.achievementTitle}>{achievement.name}</h3>
            <div
              className={styles.actions}
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openEditModal(achievement)}
              >
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => openRevokeModal(e, achievement)}
              >
                Revoke
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(achievement.id)}
              >
                Delete
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {showCreateModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>
                {editingAchievement ? "Edit Achievement" : "Create Achievement"}
              </h2>
              <button className={styles.closeButton} onClick={closeModal}>
                ×
              </button>
            </div>
            <form onSubmit={editingAchievement ? handleUpdate : handleCreate}>
              <div className={styles.formGroup}>
                <label>Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              {!editingAchievement && (
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
                      No active achievement pack. Go to Icon Packs to create and
                      activate one, or use Upload photo.
                    </p>
                  )}
                </div>
              )}
              {editingAchievement && (
                <div className={styles.formGroup}>
                  <label>
                    Icon{" "}
                    <span className={styles.opt}>
                      optional — leave blank to keep current
                    </span>
                  </label>
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
                      No active achievement pack. Go to Icon Packs to create and
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
                  {editingAchievement ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showRevokeModal && selectedAchievement && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Revoke Achievement</h2>
              <button className={styles.closeButton} onClick={closeRevokeModal}>
                ×
              </button>
            </div>
            <div className={styles.achievementInfo}>
              <div
                className={styles.achievementImageWrap}
                style={{ margin: "0 auto 0.5rem" }}
              >
                {selectedAchievement.imageUrl ? (
                  <img
                    src={selectedAchievement.imageUrl}
                    alt={selectedAchievement.name}
                    className={styles.achievementImage}
                  />
                ) : (
                  <div className={styles.achievementPlaceholder}>🏆</div>
                )}
              </div>
              <h3>{selectedAchievement.name}</h3>
            </div>
            <div className={styles.formGroup}>
              <label>Search User</label>
              <input
                type="text"
                placeholder="Search by username or email..."
                value={revokeSearchQuery}
                onChange={(e) => setRevokeSearchQuery(e.target.value)}
              />
            </div>
            <div className={styles.userList}>
              {users
                .filter(
                  (user) =>
                    user.login
                      ?.toLowerCase()
                      .includes(revokeSearchQuery.toLowerCase()) ||
                    user.email
                      ?.toLowerCase()
                      .includes(revokeSearchQuery.toLowerCase()),
                )
                .slice(0, 10)
                .map((user) => (
                  <div
                    key={user.id}
                    className={`${styles.userItem} ${
                      revokeSelectedUserId === user.id.toString()
                        ? styles.selected
                        : ""
                    }`}
                    onClick={() => setRevokeSelectedUserId(user.id.toString())}
                  >
                    <div className={styles.userAvatar}>
                      {user.login
                        ? user.login.charAt(0).toUpperCase()
                        : user.email.charAt(0).toUpperCase()}
                    </div>
                    <div className={styles.userDetails}>
                      <div className={styles.userName}>
                        {user.login || user.email.split("@")[0]}
                      </div>
                      <div className={styles.userEmail}>{user.email}</div>
                    </div>
                    {revokeSelectedUserId === user.id.toString() && (
                      <div className={styles.checkmark}>✓</div>
                    )}
                  </div>
                ))}
            </div>
            <div className={styles.modalActions}>
              <Button type="button" variant="ghost" onClick={closeRevokeModal}>
                Cancel
              </Button>
              <Button
                onClick={handleRevokeAchievement}
                disabled={!revokeSelectedUserId}
              >
                Revoke Achievement
              </Button>
            </div>
          </div>
        </div>
      )}

      {showAwardModal && selectedAchievement && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Award Achievement</h2>
              <button className={styles.closeButton} onClick={closeAwardModal}>
                ×
              </button>
            </div>
            <div className={styles.achievementInfo}>
              <div
                className={styles.achievementImageWrap}
                style={{ margin: "0 auto 0.5rem" }}
              >
                {selectedAchievement.imageUrl ? (
                  <img
                    src={selectedAchievement.imageUrl}
                    alt={selectedAchievement.name}
                    className={styles.achievementImage}
                  />
                ) : (
                  <div className={styles.achievementPlaceholder}>🏆</div>
                )}
              </div>
              <h3>{selectedAchievement.name}</h3>
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
                    <div className={styles.userAvatar}>
                      {user.login
                        ? user.login.charAt(0).toUpperCase()
                        : user.email.charAt(0).toUpperCase()}
                    </div>
                    <div className={styles.userDetails}>
                      <div className={styles.userName}>
                        {user.login || user.email.split("@")[0]}
                      </div>
                      <div className={styles.userEmail}>{user.email}</div>
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
              <Button
                onClick={handleAwardAchievement}
                disabled={!selectedUserId}
              >
                Award Achievement
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
