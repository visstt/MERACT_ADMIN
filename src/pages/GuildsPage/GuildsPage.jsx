import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./GuildsPage.module.css";
import api, { getImageUrl } from "../../shared/lib/axios";

const REGIONS = ["North", "East", "South", "West"];
const TYPES = ["PvE", "PvP", "Social"];

const initialForm = {
  name: "",
  description: "",
  photoFile: null,
};

export const GuildsPage = () => {
  const [guilds, setGuilds] = useState([]);
  const [region, setRegion] = useState("All");
  const [type, setType] = useState("All");
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchGuilds = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get("/guild/find-all");
        setGuilds(res.data);
      } catch {
        setError("Failed to load guilds");
      } finally {
        setLoading(false);
      }
    };
    fetchGuilds();
  }, []);

  const openCreate = () => {
    setForm(initialForm);
    setEditId(null);
    setModalOpen(true);
  };

  const openEdit = (guild) => {
    setForm({
      name: guild.name,
      description: guild.description,
      photoFile: null,
    });
    setEditId(guild.id);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditId(null);
    setForm(initialForm);
    setError("");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("name", form.name);
      formData.append("description", form.description);
      if (form.photoFile && form.photoFile instanceof File) {
        formData.append("photo", form.photoFile);
      }

      if (editId) {
        await api.put(`/guild/${editId}`, formData);
      } else {
        await api.post("/guild/create-guild", formData);
      }

      const res = await api.get("/guild/find-all");
      setGuilds(res.data);
      setForm(initialForm);
      closeModal();
    } catch (err) {
      console.error("Error submitting guild:", err);
      setError(editId ? "Failed to update guild" : "Failed to create guild");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    setLoading(true);
    setError("");
    try {
      await api.delete(`/guild/${id}`);
      const res = await api.get("/guild/find-all");
      setGuilds(res.data);
    } catch {
      setError("Failed to delete guild");
    } finally {
      setLoading(false);
    }
  };

  const filteredGuilds = guilds.filter(
    (g) =>
      (region === "All" || g.region === region) &&
      (type === "All" || g.type === type)
  );

  return (
    <div className={styles.guildsPage}>
      <div className={styles.header}>
        <h1 className={styles.title}>Guilds</h1>
        <button
          className={styles.guildButton + " " + styles.editButton}
          onClick={openCreate}
        >
          + Create Guild
        </button>
      </div>
      <div className={styles.list}>
        {filteredGuilds.map((guild) => (
          <div
            key={guild.id}
            className={styles.guildCard}
            style={{ cursor: "pointer" }}
            onClick={(e) => {
              // Не переходить по клику на кнопки
              if (e.target.closest("button")) return;
              navigate(`/admin/guild/${guild.id}`);
            }}
          >
            <img
              src={
                guild.logoFileName
                  ? getImageUrl("guild", guild.logoFileName)
                  : guild.image
              }
              alt={guild.name}
              className={styles.guildImage}
            />
            <div className={styles.info}>
              <div className={styles.guildName}>{guild.name}</div>
              <div className={styles.guildDescription}>{guild.description}</div>

              <div className={styles.guildActions}>
                <button
                  className={styles.guildActionButton + " " + styles.editButton}
                  onClick={() => openEdit(guild)}
                  title="Edit"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M4 13.5V16h2.5l7.06-7.06-2.5-2.5L4 13.5z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M14.85 6.15a1.5 1.5 0 0 0 0-2.12l-1.88-1.88a1.5 1.5 0 0 0-2.12 0l-1.06 1.06 4 4 1.06-1.06z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                  </svg>
                  Edit
                </button>
                <button
                  className={
                    styles.guildActionButton + " " + styles.deleteButton
                  }
                  onClick={() => handleDelete(guild.id)}
                  title="Delete"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M6 8V14"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M10 8V14"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M14 8V14"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M3 5H17"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M8 5V4C8 3.44772 8.44772 3 9 3H11C11.5523 3 12 3.44772 12 4V5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <rect
                      x="4"
                      y="5"
                      width="12"
                      height="11"
                      rx="2"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                  </svg>
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {modalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <form className={styles.form} onSubmit={handleSubmit}>
              <h2>{editId ? "Edit Guild" : "Create Guild"}</h2>
              <label>
                Name
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
              </label>
              <label>
                Description
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  required
                />
              </label>
              <label>
                Photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setForm((f) => ({ ...f, photoFile: e.target.files[0] }))
                  }
                />
              </label>
              {error && <div className={styles.error}>{error}</div>}
              <div className={styles.modalActions}>
                <button
                  type="button"
                  onClick={closeModal}
                  className={styles.cancelButton}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={styles.primaryButton}
                >
                  {loading ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
