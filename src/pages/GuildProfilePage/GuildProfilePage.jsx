import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import api, { getImageUrl } from "../../shared/lib/axios";
import styles from "./GuildProfilePage.module.css";

const getAchievementEntity = (item) =>
  item?.achievement || item?.Achievement || item;

export const GuildProfilePage = () => {
  const { id } = useParams();
  const [guild, setGuild] = useState(null);
  const [members, setMembers] = useState([]);
  const [guildAchievements, setGuildAchievements] = useState([]);
  const [allAchievements, setAllAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteValue, setInviteValue] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [achievementId, setAchievementId] = useState("");
  const [awardLoading, setAwardLoading] = useState(false);
  const [revokeLoadingId, setRevokeLoadingId] = useState(null);
  const [achievementsLoading, setAchievementsLoading] = useState(false);

  const fetchGuild = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/guild/${id}`);
      setGuild(res.data);
      setMembers(res.data.members || []);
    } catch {
      setError("Failed to load guild");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchAchievementsCatalog = useCallback(async () => {
    try {
      const res = await api.get("/achievement/find-all");
      setAllAchievements(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error("Failed to load achievements catalog");
    }
  }, []);

  const fetchGuildAchievements = useCallback(async () => {
    setAchievementsLoading(true);
    try {
      const res = await api.get(`/achievement/guild/${id}`);
      setGuildAchievements(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error("Failed to load guild achievements");
      setGuildAchievements([]);
    } finally {
      setAchievementsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchGuild();
    fetchAchievementsCatalog();
    fetchGuildAchievements();
  }, [fetchGuild, fetchAchievementsCatalog, fetchGuildAchievements]);

  useEffect(() => {
    if (inviteOpen && allUsers.length === 0) {
      api
        .get("/user/all-users-for-guild")
        .then((res) => setAllUsers(res.data))
        .catch(() => setAllUsers([]));
    }
  }, [inviteOpen, allUsers.length]);

  const assignedAchievementIds = useMemo(
    () =>
      new Set(
        guildAchievements
          .map((item) => getAchievementEntity(item)?.id)
          .filter(Boolean),
      ),
    [guildAchievements],
  );

  const availableAchievements = useMemo(
    () =>
      allAchievements.filter(
        (achievement) => !assignedAchievementIds.has(achievement.id),
      ),
    [allAchievements, assignedAchievementIds],
  );

  const handleInvite = async () => {
    if (!inviteValue) return;
    setInviteLoading(true);
    try {
      await api.post(
        "/guild/invite-user",
        {},
        {
          params: {
            userId: inviteValue,
            guildId: id,
          },
        },
      );
      setInviteOpen(false);
      setInviteValue("");
      await fetchGuild();
      toast.success("User invited to guild");
    } catch (err) {
      console.error("Failed to invite user:", err);
      toast.error("Failed to invite user");
    } finally {
      setInviteLoading(false);
    }
  };

  const handleKick = async (userId) => {
    if (!window.confirm("Kick this user from the guild?")) return;
    try {
      await api.post(
        "/guild/kick-out-user",
        {},
        {
          params: {
            userId,
            guildId: id,
          },
        },
      );
      await fetchGuild();
      toast.success("User removed from guild");
    } catch (err) {
      console.error("Failed to kick user:", err);
      toast.error("Failed to kick user");
    }
  };

  const handleAward = async () => {
    if (!achievementId) return;
    setAwardLoading(true);
    try {
      await api.post("/achievement/guild/award", {
        guildId: Number(id),
        achievementId: Number(achievementId),
      });
      setAchievementId("");
      await fetchGuildAchievements();
      toast.success("Achievement awarded to guild");
    } catch (err) {
      console.error("Failed to award achievement:", err);
      toast.error(
        err.response?.data?.message || "Failed to award achievement",
      );
    } finally {
      setAwardLoading(false);
    }
  };

  const handleRevoke = async (value) => {
    const achievement = getAchievementEntity(value);
    if (!achievement?.id) return;

    setRevokeLoadingId(achievement.id);
    try {
      await api.post("/achievement/guild/revoke", {
        guildId: Number(id),
        achievementId: Number(achievement.id),
      });
      await fetchGuildAchievements();
      toast.success("Achievement revoked from guild");
    } catch (err) {
      console.error("Failed to revoke achievement:", err);
      toast.error(
        err.response?.data?.message || "Failed to revoke achievement",
      );
    } finally {
      setRevokeLoadingId(null);
    }
  };

  if (loading) return <div className={styles.guildProfilePage}>Loading...</div>;
  if (error) return <div className={styles.guildProfilePage}>{error}</div>;
  if (!guild) return null;

  return (
    <div className={styles.guildProfilePage}>
      <div className={styles.header}>
        <img
          className={styles.logo}
          src={
            guild.logoFileName ? getImageUrl("guild", guild.logoFileName) : ""
          }
          alt={guild.name}
        />
        <div className={styles.info}>
          <h1 className={styles.name}>{guild.name}</h1>
          <div className={styles.description}>{guild.description}</div>
        </div>
      </div>

      <div className={styles.membersBlock}>
        <div className={styles.membersHeader}>
          <h2>Members ({members.length})</h2>
          <button
            className={styles.inviteButton}
            onClick={() => setInviteOpen(true)}
          >
            Invite user
          </button>
        </div>
        <div className={styles.membersList}>
          {members.length === 0 && (
            <div className={styles.empty}>No members</div>
          )}
          {members.map((user) => (
            <div key={user.id} className={styles.memberCard}>
              <div className={styles.memberAvatar}>
                {user.login
                  ? user.login[0].toUpperCase()
                  : user.email[0].toUpperCase()}
              </div>
              <div className={styles.memberInfo}>
                <div className={styles.memberName}>
                  {user.login || user.email}
                </div>
                <div className={styles.memberEmail}>{user.email}</div>
              </div>
              <button
                className={styles.kickButton}
                onClick={() => handleKick(user.id)}
                title="Kick"
              >
                Kick
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.achievementsBlock}>
        <div className={styles.membersHeader}>
          <div>
            <h2>Guild Achievements</h2>
            <p className={styles.blockSubtitle}>
              Award achievements directly to this guild and manage issued items.
            </p>
          </div>
        </div>

        <div className={styles.achievementControls}>
          <select
            className={styles.inviteInput}
            value={achievementId}
            onChange={(e) => setAchievementId(e.target.value)}
            disabled={awardLoading || availableAchievements.length === 0}
          >
            <option value="">
              {availableAchievements.length === 0
                ? "All achievements already awarded"
                : "Select achievement..."}
            </option>
            {availableAchievements.map((achievement) => (
              <option key={achievement.id} value={achievement.id}>
                {achievement.name}
              </option>
            ))}
          </select>

          <button
            className={styles.inviteButton}
            onClick={handleAward}
            disabled={awardLoading || !achievementId}
          >
            {awardLoading ? "Awarding..." : "Award achievement"}
          </button>
        </div>

        <div className={styles.achievementsList}>
          {achievementsLoading ? (
            <div className={styles.empty}>Loading achievements...</div>
          ) : guildAchievements.length === 0 ? (
            <div className={styles.empty}>No achievements awarded yet</div>
          ) : (
            guildAchievements.map((item) => {
              const achievement = getAchievementEntity(item);
              if (!achievement?.id) return null;

              return (
                <div key={achievement.id} className={styles.achievementCard}>
                  <div className={styles.achievementMeta}>
                    {achievement.imageUrl ? (
                      <img
                        className={styles.achievementImage}
                        src={achievement.imageUrl}
                        alt={achievement.name}
                      />
                    ) : (
                      <div className={styles.achievementPlaceholder}>
                        {achievement.name?.slice(0, 1)?.toUpperCase() || "A"}
                      </div>
                    )}

                    <div className={styles.achievementInfo}>
                      <div className={styles.achievementName}>
                        {achievement.name}
                      </div>
                      {achievement.description && (
                        <div className={styles.achievementDescription}>
                          {achievement.description}
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    className={styles.kickButton}
                    onClick={() => handleRevoke(item)}
                    disabled={revokeLoadingId === achievement.id}
                  >
                    {revokeLoadingId === achievement.id
                      ? "Revoking..."
                      : "Revoke"}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {inviteOpen && (
        <div className={styles.inviteModalOverlay}>
          <div className={styles.inviteModal}>
            <h3>Invite user to guild</h3>
            <select
              className={styles.inviteInput}
              value={inviteValue}
              onChange={(e) => setInviteValue(e.target.value)}
              disabled={inviteLoading}
            >
              <option value="">Select user...</option>
              {allUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.login || u.email} ({u.email})
                </option>
              ))}
            </select>
            <div className={styles.inviteActions}>
              <button
                className={styles.cancelButton}
                onClick={() => setInviteOpen(false)}
              >
                Cancel
              </button>
              <button
                className={styles.inviteButton}
                onClick={handleInvite}
                disabled={inviteLoading || !inviteValue}
              >
                {inviteLoading ? "Inviting..." : "Invite"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
