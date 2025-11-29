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
  const [selectedAchievement, setSelectedAchievement] = useState(null);
  const [editingAchievement, setEditingAchievement] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const { users } = useUsers();

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
      await api.post("/achievement/create-achievement", formData);
      setShowCreateModal(false);
      setFormData({ name: "", description: "", icon: "", rarity: "common" });
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
      await api.put(
        `/achievement/update-achievement/${editingAchievement.id}`,
        formData
      );
      setEditingAchievement(null);
      setFormData({ name: "", description: "", icon: "", rarity: "common" });
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

  const openCreateModal = () => {
    setFormData({ name: "", description: "", icon: "", rarity: "common" });
    setEditingAchievement(null);
    setShowCreateModal(true);
  };

  const openEditModal = (achievement) => {
    setFormData({
      name: achievement.name || "",
      description: achievement.description || "",
      icon: achievement.icon || "",
      rarity: achievement.rarity || "common",
    });
    setEditingAchievement(achievement);
    setShowCreateModal(true);
  };

  const openAwardModal = (achievement) => {
    setSelectedAchievement(achievement);
    setShowAwardModal(true);
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setEditingAchievement(null);
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
            <div className={styles.achievementIcon}>
              {achievement.icon || "🏆"}
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
              <div className={styles.formGroup}>
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Icon (emoji)</label>
                <input
                  type="text"
                  value={formData.icon}
                  onChange={(e) =>
                    setFormData({ ...formData, icon: e.target.value })
                  }
                  placeholder="🏆"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Rarity</label>
                <select
                  value={formData.rarity}
                  onChange={(e) =>
                    setFormData({ ...formData, rarity: e.target.value })
                  }
                >
                  <option value="common">Common</option>
                  <option value="rare">Rare</option>
                  <option value="epic">Epic</option>
                  <option value="legendary">Legendary</option>
                </select>
              </div>
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
              <div className={styles.achievementIconLarge}>
                {selectedAchievement.icon || "🏆"}
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
                      .includes(searchQuery.toLowerCase())
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
