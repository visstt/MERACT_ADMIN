import { useState, useEffect, useCallback, useRef } from "react";
import { Card, Button } from "../../shared/ui";
import api from "../../shared/lib/axios";
import { toast } from "react-toastify";
import styles from "./IconPacksPage.module.css";

const TYPES = ["ACHIEVEMENT", "RANK"];

export const IconPacksPage = () => {
  const [type, setType] = useState("ACHIEVEMENT");
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPackName, setNewPackName] = useState("");
  const [creating, setCreating] = useState(false);
  const [uploadingPackId, setUploadingPackId] = useState(null);
  const [activatingId, setActivatingId] = useState(null);
  const fileInputRefs = useRef({});

  const fetchPacks = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/icon-pack?type=${type}`);
      setPacks(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load icon packs");
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    fetchPacks();
  }, [fetchPacks]);

  // Create a new pack
  const handleCreatePack = async (e) => {
    e.preventDefault();
    if (!newPackName.trim()) return;
    setCreating(true);
    try {
      await api.post("/icon-pack", { name: newPackName.trim(), type });
      setNewPackName("");
      fetchPacks();
      toast.success("Pack created!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create pack");
    } finally {
      setCreating(false);
    }
  };

  // Upload icons to a pack
  const handleUploadIcons = async (packId, files) => {
    if (!files || files.length === 0) return;
    setUploadingPackId(packId);
    try {
      const form = new FormData();
      Array.from(files).forEach((f) => form.append("icons", f));
      const { data } = await api.post(`/icon-pack/${packId}/upload`, form);
      toast.success(
        `Uploaded ${data.uploaded ?? files.length} icon${files.length !== 1 ? "s" : ""}!`,
      );
      fetchPacks();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to upload icons");
    } finally {
      setUploadingPackId(null);
      // Reset file input
      if (fileInputRefs.current[packId]) {
        fileInputRefs.current[packId].value = "";
      }
    }
  };

  // Activate a pack
  const handleActivate = async (packId) => {
    setActivatingId(packId);
    try {
      await api.patch(`/icon-pack/${packId}/activate`, {});
      setPacks((prev) =>
        prev.map((p) => ({ ...p, isActive: p.id === packId })),
      );
      toast.success("Pack activated!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to activate pack");
    } finally {
      setActivatingId(null);
    }
  };

  // Delete a pack
  const handleDeletePack = async (packId) => {
    if (!confirm("Delete this pack and all its icons from S3?")) return;
    try {
      await api.delete(`/icon-pack/${packId}`);
      setPacks((prev) => prev.filter((p) => p.id !== packId));
      toast.success("Pack deleted");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete pack");
    }
  };

  // Delete a single icon
  const handleDeleteIcon = async (iconId, packId) => {
    try {
      await api.delete(`/icon-pack/icons/${iconId}`);
      setPacks((prev) =>
        prev.map((p) =>
          p.id === packId
            ? { ...p, icons: p.icons.filter((i) => i.id !== iconId) }
            : p,
        ),
      );
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete icon");
    }
  };

  const activePack = packs.find((p) => p.isActive);
  const totalIcons = packs.reduce(
    (sum, p) => sum + (p._count?.icons ?? p.icons?.length ?? 0),
    0,
  );

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Icon Packs</h1>
          <p className={styles.subtitle}>
            Manage icon sets for achievements and ranks
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{packs.length}</span>
          <span className={styles.statLabel}>Packs</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{totalIcons}</span>
          <span className={styles.statLabel}>Icons</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{activePack ? "✓" : "—"}</span>
          <span className={styles.statLabel}>
            {activePack ? activePack.name : "No active pack"}
          </span>
        </div>
      </div>

      {/* Type tabs */}
      <div className={styles.tabs}>
        {TYPES.map((t) => (
          <button
            key={t}
            className={`${styles.tab} ${type === t ? styles.tabActive : ""}`}
            onClick={() => setType(t)}
          >
            {t === "ACHIEVEMENT" ? "🏅 Achievements" : "🎖️ Ranks"}
          </button>
        ))}
      </div>

      {/* Create pack form */}
      <form className={styles.createForm} onSubmit={handleCreatePack}>
        <input
          className={styles.createInput}
          placeholder={`New ${type.toLowerCase()} pack name…`}
          value={newPackName}
          onChange={(e) => setNewPackName(e.target.value)}
        />
        <Button type="submit" disabled={creating || !newPackName.trim()}>
          {creating ? "Creating…" : "+ Create pack"}
        </Button>
      </form>

      {/* Pack list */}
      {loading ? (
        <div className={styles.loading}>Loading…</div>
      ) : packs.length === 0 ? (
        <div className={styles.emptyState}>
          <span>{type === "ACHIEVEMENT" ? "🏅" : "🎖️"}</span>
          <p>No packs yet. Create your first icon pack above.</p>
        </div>
      ) : (
        <div className={styles.packList}>
          {packs.map((pack) => {
            const iconCount = pack._count?.icons ?? pack.icons?.length ?? 0;
            return (
              <Card key={pack.id} className={styles.packCard}>
                {/* Pack header */}
                <div className={styles.packHeader}>
                  <div className={styles.packInfo}>
                    <span className={styles.packName}>{pack.name}</span>
                    {pack.isActive && (
                      <span className={styles.activeBadge}>✅ Active</span>
                    )}
                    <span className={styles.iconCount}>
                      {iconCount} icon{iconCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className={styles.packActions}>
                    {!pack.isActive && (
                      <Button
                        size="sm"
                        onClick={() => handleActivate(pack.id)}
                        disabled={activatingId === pack.id}
                      >
                        {activatingId === pack.id ? "…" : "Activate"}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeletePack(pack.id)}
                    >
                      🗑️
                    </Button>
                  </div>
                </div>

                {/* Upload icons */}
                <div className={styles.uploadRow}>
                  <label className={styles.uploadLabel}>
                    <input
                      ref={(el) => {
                        fileInputRefs.current[pack.id] = el;
                      }}
                      type="file"
                      accept="image/*"
                      multiple
                      hidden
                      onChange={(e) =>
                        handleUploadIcons(pack.id, e.target.files)
                      }
                    />
                    <span className={styles.uploadBtn}>
                      {uploadingPackId === pack.id
                        ? "Uploading…"
                        : "⬆ Upload icons"}
                    </span>
                  </label>
                  <span className={styles.uploadHint}>
                    PNG/SVG/WEBP, multiple allowed
                  </span>
                </div>

                {/* Icons grid */}
                {pack.icons && pack.icons.length > 0 ? (
                  <div className={styles.iconsGrid}>
                    {pack.icons.map((icon) => (
                      <div key={icon.id} className={styles.iconItem}>
                        <img
                          src={icon.url}
                          alt={icon.name}
                          className={styles.iconImg}
                          loading="lazy"
                        />
                        <button
                          className={styles.iconDeleteBtn}
                          onClick={() => handleDeleteIcon(icon.id, pack.id)}
                          title="Delete icon"
                        >
                          ×
                        </button>
                        <span className={styles.iconName}>{icon.name}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.noIcons}>
                    No icons yet — upload some above
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
