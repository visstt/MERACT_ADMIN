import { useState, useEffect, useRef } from "react";
import { Card, Button } from "../../shared/ui";
import api from "../../shared/lib/axios";
import { toast } from "react-toastify";
import styles from "./HeroVideoPage.module.css";

export const HeroVideoPage = () => {
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchVideo();
  }, []);

  const fetchVideo = async () => {
    setLoading(true);
    try {
      const res = await api.get("/hero-video");
      setVideo(res.data);
    } catch (err) {
      if (err.response?.status === 404) {
        setVideo(null);
      } else {
        toast.error("Failed to load hero video");
      }
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
    const url = URL.createObjectURL(file);
    setPreview(url);
  };

  const handleInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("video", selectedFile);
      await api.post("/hero-video/upload", fd);
      toast.success("Hero video uploaded!");
      setSelectedFile(null);
      if (preview) {
        URL.revokeObjectURL(preview);
        setPreview(null);
      }
      fetchVideo();
    } catch (err) {
      toast.error(err.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete the hero video?")) return;
    setDeleting(true);
    try {
      await api.delete("/hero-video");
      toast.success("Hero video deleted");
      setVideo(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const cancelPreview = () => {
    setSelectedFile(null);
    if (preview) {
      URL.revokeObjectURL(preview);
      setPreview(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Hero Video</h1>
          <p className={styles.subtitle}>
            The video shown on the main page at launch
          </p>
        </div>
      </div>

      {/* Current video */}
      <Card className={styles.section}>
        <h2 className={styles.sectionTitle}>Current video</h2>
        {loading ? (
          <div className={styles.placeholder}>Loading...</div>
        ) : video ? (
          <div className={styles.currentVideo}>
            <video
              src={video.url}
              controls
              muted
              className={styles.videoPlayer}
            />
            <div className={styles.videoMeta}>
              <span className={styles.metaItem}>
                <span className={styles.metaLabel}>Type:</span> {video.mimeType}
              </span>
              <span className={styles.metaItem}>
                <span className={styles.metaLabel}>Uploaded:</span>{" "}
                {new Date(video.createdAt).toLocaleString()}
              </span>
            </div>
            <div className={styles.videoActions}>
              <Button
                variant="error"
                size="sm"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "🗑️ Delete video"}
              </Button>
            </div>
          </div>
        ) : (
          <div className={styles.placeholder}>
            <span className={styles.placeholderIcon}>🎬</span>
            <p>No hero video uploaded yet</p>
          </div>
        )}
      </Card>

      {/* Upload */}
      <Card className={styles.section}>
        <h2 className={styles.sectionTitle}>
          {video ? "Replace video" : "Upload video"}
        </h2>

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
            <span className={styles.dropIcon}>📁</span>
            <p className={styles.dropText}>
              Drag & drop a video here or{" "}
              <span className={styles.dropLink}>click to browse</span>
            </p>
            <p className={styles.dropHint}>MP4, WebM, MOV — any video format</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className={styles.hiddenInput}
              onChange={handleInputChange}
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
    </div>
  );
};
