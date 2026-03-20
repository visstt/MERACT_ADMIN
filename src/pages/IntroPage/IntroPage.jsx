import { useState, useEffect, useRef } from "react";
import { Card, Button } from "../../shared/ui";
import api from "../../shared/lib/axios";
import { toast } from "react-toastify";
import styles from "./IntroPage.module.css";

export const IntroPage = () => {
  const [intros, setIntros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState([]);
  const [targetUserId, setTargetUserId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchIntros();
    api
      .get("/admin/contacts")
      .then(({ data }) => setContacts(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const fetchIntros = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/intros");
      setIntros(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load intros");
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (file) => {
    if (!file || !file.type.startsWith("video/")) {
      toast.error("Please select a video file");
      return;
    }
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const cancelPreview = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("intro", selectedFile);
      const url = targetUserId
        ? `/admin/intros/upload?targetUserId=${targetUserId}`
        : "/admin/intros/upload";
      await api.post(url, fd);
      toast.success("Intro uploaded!");
      cancelPreview();
      setTargetUserId("");
      fetchIntros();
    } catch (err) {
      toast.error(err.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this intro?")) return;
    try {
      await api.delete(`/admin/intros/${id}`);
      setIntros((prev) => prev.filter((i) => i.id !== id));
      toast.success("Intro deleted");
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Intro Videos</h1>
          <p className={styles.subtitle}>
            Manage intro videos for users. Global intros are shown to everyone.
          </p>
        </div>
      </div>

      {/* Upload card */}
      <Card className={styles.section}>
        <h2 className={styles.sectionTitle}>Upload intro</h2>

        {!preview ? (
          <div
            className={`${styles.dropZone} ${dragOver ? styles.dragOver : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <span className={styles.dropIcon}>🎬</span>
            <p className={styles.dropText}>
              Drag & drop a video or{" "}
              <span className={styles.dropLink}>click to browse</span>
            </p>
            <p className={styles.dropHint}>MP4, WebM, MOV — any video format</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className={styles.hiddenInput}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileSelect(f);
              }}
            />
          </div>
        ) : (
          <div className={styles.previewArea}>
            <p className={styles.previewLabel}>
              Preview: <strong>{selectedFile?.name}</strong>
            </p>
            <video
              src={preview}
              controls
              muted
              className={styles.videoPlayer}
            />

            <div className={styles.assignRow}>
              <label className={styles.assignLabel}>
                Assign to user{" "}
                <span className={styles.opt}>leave empty = global</span>
              </label>
              <select
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                className={styles.assignSelect}
              >
                <option value="">🌐 Global (all users)</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.login || c.email}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.previewActions}>
              <Button variant="ghost" size="sm" onClick={cancelPreview}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleUpload}
                disabled={uploading}
              >
                {uploading ? "Uploading..." : "⬆️ Upload"}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Intro list */}
      <Card padding="none" className={styles.listCard}>
        <div className={styles.listHeader}>
          <h2 className={styles.sectionTitle} style={{ margin: 0 }}>
            All intros ({intros.length})
          </h2>
        </div>

        {loading ? (
          <div className={styles.placeholder}>Loading...</div>
        ) : intros.length === 0 ? (
          <div className={styles.placeholder}>
            <span>🎬</span>
            <p>No intros uploaded yet</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {intros.map((intro) => (
              <div key={intro.id} className={styles.introCard}>
                <video
                  src={intro.fileName}
                  muted
                  className={styles.introThumb}
                  onMouseEnter={(e) => e.target.play()}
                  onMouseLeave={(e) => {
                    e.target.pause();
                    e.target.currentTime = 0;
                  }}
                />
                <div className={styles.introInfo}>
                  <div className={styles.introUser}>
                    {intro.user ? (
                      <>
                        <div className={styles.userAvatar}>
                          {intro.user.avatarUrl ? (
                            <img src={intro.user.avatarUrl} alt="" />
                          ) : (
                            (intro.user.login || intro.user.email || "?")
                              .charAt(0)
                              .toUpperCase()
                          )}
                        </div>
                        <span>{intro.user.login || intro.user.email}</span>
                      </>
                    ) : (
                      <>
                        <span className={styles.globalBadge}>🌐 Global</span>
                      </>
                    )}
                  </div>
                  <button
                    className={styles.deleteBtn}
                    onClick={() => handleDelete(intro.id)}
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
