import { useState, useEffect } from "react";
import { Card, Button } from "../../shared/ui";
import styles from "./StreamsPage.module.css";
import api, { getImageUrl } from "../../shared/lib/axios";

const STATUS_MAP = {
  ONLINE: "live",
  OFFLINE: "offline",
};

export const StreamsPage = () => {
  const [streams, setStreams] = useState([]);
  const [stats, setStats] = useState({
    activeStreams: 0,
    allSpectators: "-",
    adminBlocked: "-",
  });
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const [streamsRes, statsRes] = await Promise.all([
        api.get("/stream/get-streams"),
        api.get("/stream/statistic"),
      ]);
      setStreams(
        streamsRes.data.map((s) => ({
          id: s.id,
          title: s.name,
          streamer: s.user,
          viewers: s.spectators === "NOT_IMPLEMENTED" ? 0 : s.spectators,
          duration: s.duration,
          status: STATUS_MAP[s.status] || "live",
          category: s.category,
          thumbnailUrl: s.previewFileName,
          startTime: "qwerty", // TODO: add startTime field if available
        }))
      );
      setStats(statsRes.data);
    } catch (e) {
      setError("Failed to load streams");
    } finally {
      setLoading(false);
    }
  };

  const filteredStreams = streams.filter((stream) => {
    const matchesStatus =
      statusFilter === "all" || stream.status === statusFilter;
    const matchesCategory =
      categoryFilter === "all" || stream.category === categoryFilter;
    return matchesStatus && matchesCategory;
  });

  const handleStreamAction = async (streamId, action) => {
    if (action === "terminate") {
      try {
        await api.post(`/stream/stop-stream?id=${streamId}`);
        await fetchData();
      } catch (e) {
        alert("Failed to stop stream");
      }
    }
    // warn — not implemented
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      live: { label: "Live", className: "success" },
      offline: { label: "Stopped", className: "error" },
      terminated: { label: "Stopped", className: "error" },
    };

    const config = statusConfig[status] || statusConfig.live;
    return (
      <span className={`${styles.statusBadge} ${styles[config.className]}`}>
        {config.label}
      </span>
    );
  };

  const terminateAllStreams = () => {
    setStreams(
      streams.map((stream) =>
        stream.status === "live"
          ? { ...stream, status: "terminated", viewers: 0 }
          : stream
      )
    );
  };

  return (
    <div className={styles.streamsPage}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Stream Management</h1>
          <p className={styles.subtitle}>
            Monitoring and moderation of active streams
          </p>
        </div>
      </div>

      <div className={styles.statsCards}>
        <Card padding="lg" className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statIcon}>📺</span>
            <span className={styles.statValue}>{stats.activeStreams}</span>
          </div>
          <div className={styles.statLabel}>Active streams</div>
        </Card>

        <Card padding="lg" className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statIcon}>👥</span>
            <span className={styles.statValue}>
              {stats.allSpectators === "Not done" ? "-" : stats.allSpectators}
            </span>
          </div>
          <div className={styles.statLabel}>Total viewers</div>
        </Card>

        <Card padding="lg" className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statIcon}>🛡️</span>
            <span className={styles.statValue}>{stats.adminBlocked}</span>
          </div>
          <div className={styles.statLabel}>Terminated by admin</div>
        </Card>
      </div>

      <Card padding="lg" className={styles.filtersCard}>
        <div className={styles.filters}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">All statuses</option>
            <option value="live">Live</option>
            <option value="terminated">Terminated</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">All categories</option>
            <option value="Gaming">Gaming</option>
            <option value="Music">Music</option>
            <option value="Art">Art</option>
            <option value="Talk">Talk</option>
          </select>
        </div>
      </Card>

      <Card padding="none" className={styles.streamsCard}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>
            Active streams ({filteredStreams.length})
          </h2>
        </div>

        <div className={styles.streamsList}>
          {filteredStreams.map((stream) => (
            <div
              key={stream.id}
              className={`${styles.streamItem} ${
                stream.status === "offline" || stream.status === "terminated"
                  ? styles.inactive
                  : ""
              }`}
            >
              <div className={styles.streamThumbnail}>
                {stream.thumbnailUrl ? (
                  <img
                    src={getImageUrl("stream", stream.thumbnailUrl)}
                    alt={stream.title}
                    className={styles.streamImage}
                  />
                ) : (
                  <div className={styles.thumbnailPlaceholder}>
                    📺
                    {stream.status === "offline" && (
                      <div className={styles.stoppedLabel}>🛑 Stopped</div>
                    )}
                  </div>
                )}
                {stream.status === "live" && (
                  <div className={styles.liveIndicator}>LIVE</div>
                )}
              </div>

              <div className={styles.streamInfo}>
                <h3 className={styles.streamTitle}>{stream.title}</h3>
                <div className={styles.streamMeta}>
                  <span className={styles.streamerName}>
                    @{stream.streamer}
                  </span>
                  <span className={styles.category}>{stream.category}</span>
                  {getStatusBadge(stream.status)}
                </div>
                <div className={styles.streamStats}>
                  <span>👥 {stream.viewers.toLocaleString()} viewers</span>
                  <span>⏱️ {stream.duration}</span>
                  <span>🕒 {stream.startTime}</span>
                </div>
              </div>

              <div className={styles.streamActions}>
                <Button variant="ghost" size="sm" title="View stream">
                  👁️
                </Button>
                <Button variant="ghost" size="sm" title="View chat">
                  💬
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleStreamAction(stream.id, "warn")}
                  title="Warn streamer"
                  disabled={stream.status !== "live"}
                >
                  ⚠️
                </Button>
                <Button
                  variant="error"
                  size="sm"
                  onClick={() => handleStreamAction(stream.id, "terminate")}
                  disabled={stream.status !== "live"}
                >
                  🛑 Terminate
                </Button>
              </div>
            </div>
          ))}

          {filteredStreams.length === 0 && (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📺</div>
              <div className={styles.emptyTitle}>No streams found</div>
              <div className={styles.emptyText}>
                No streams match the selected filters
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
