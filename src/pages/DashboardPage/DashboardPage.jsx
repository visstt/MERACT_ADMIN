import { Card, Button } from "../../shared/ui";
import styles from "./DashboardPage.module.css";
import {
  useDashboardStats,
  useDashboardActivity,
} from "../../shared/hooks/useDashboard";

export const DashboardPage = () => {
  const {
    stats,
    loading: statsLoading,
    error: statsError,
  } = useDashboardStats();
  const {
    activity,
    loading: activityLoading,
    error: activityError,
  } = useDashboardActivity();

  if (statsLoading || activityLoading) {
    return <div>Loading...</div>;
  }
  if (statsError || activityError) {
    return <div>Error loading dashboard data</div>;
  }
  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h1 className={styles.title}>Admin Panel</h1>
        <p className={styles.subtitle}>Platform status overview</p>
      </div>

      <div className={styles.statsGrid}>
        <Card variant="elevated" className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statIcon}>👥</span>
          </div>
          <div className={styles.statValue}>{stats.activeUsers}</div>
          <div className={styles.statTitle}>Active users</div>
        </Card>
        <Card variant="elevated" className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statIcon}>📺</span>
          </div>
          <div className={styles.statValue}>{stats.activeActs}</div>
          <div className={styles.statTitle}>Active acts</div>
        </Card>
        <Card variant="elevated" className={styles.statCard}>
          <div className={styles.statHeader}>
            <span className={styles.statIcon}>🏰</span>
          </div>
          <div className={styles.statValue}>{stats.activeGuilds}</div>
          <div className={styles.statTitle}>Active guilds</div>
        </Card>
      </div>

      <Card padding="lg" className={styles.activityCard}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Recent activity</h2>
          <Button variant="ghost" size="sm">
            Show all
          </Button>
        </div>

        <div className={styles.activityList}>
          {activityLoading ? (
            <div className={styles.activityMessage}>Loading...</div>
          ) : activityError ? (
            <div className={styles.activityMessage}>{activityError}</div>
          ) : activity.length === 0 ? (
            <div className={styles.activityMessage}>No activity logs</div>
          ) : (
            [...activity].reverse().map((log, i) => {
              let dotClass = styles.info;
              const action = log.action?.toLowerCase() || "";
              if (action.includes("unblocked")) dotClass = styles.success;
              else if (action.includes("warning")) dotClass = styles.warning;
              else if (action.includes("blocked")) dotClass = styles.error;
              return (
                <div key={log.id || i} className={styles.activityItem}>
                  <div className={`${styles.activityDot} ${dotClass}`} />
                  <div className={styles.activityContent}>
                    <div className={styles.activityMessage}>{log.action}</div>
                    <div className={styles.activityTime}>{log.timeAgo}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
};
