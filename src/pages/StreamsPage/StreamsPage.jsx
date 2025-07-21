import { useState } from "react";
import { Card, Button } from "../../shared/ui";
import styles from "./StreamsPage.module.css";
import { getImageUrl } from "../../shared/lib/axios";
import {
  useStreams,
  useStreamStats,
  useTerminateStream,
} from "../../shared/hooks/useStreams";

const STATUS_MAP = {
  ONLINE: "live",
  OFFLINE: "offline",
};

export const StreamsPage = () => {
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const {
    streams,
    loading: streamsLoading,
    error: streamsError,
    fetchStreams,
  } = useStreams();
  const {
    stats,
    loading: statsLoading,
    error: statsError,
    fetchStats,
  } = useStreamStats();
  const { terminate, loading: terminateLoading } = useTerminateStream();

  const filteredStreams = streams
    .map((s) => ({
      ...s,
      status: STATUS_MAP[s.status] || s.status,
    }))
    .filter((stream) => {
      const matchesStatus =
        statusFilter === "all" || stream.status === statusFilter;
      const matchesCategory =
        categoryFilter === "all" || stream.category === categoryFilter;
      return matchesStatus && matchesCategory;
    });

  const handleStreamAction = async (streamId, action) => {
    if (action === "terminate") {
      await terminate(streamId);
      await fetchStreams();
      await fetchStats();
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

  // const terminateAllStreams = () => {
  //   setStreams(
  //     streams.map((stream) =>
  //       stream.status === "live"
  //         ? { ...stream, status: "terminated", viewers: 0 }
  //         : stream
  //     )
  //   );
  // };

  if (streamsLoading || statsLoading) {
    return <div>Loading...</div>;
  }
  if (streamsError || statsError) {
    return <div>Error loading streams or stats</div>;
  }
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
