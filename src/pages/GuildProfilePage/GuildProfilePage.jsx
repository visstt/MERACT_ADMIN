import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api, { getImageUrl } from "../../shared/lib/axios";
import styles from "./GuildProfilePage.module.css";

export const GuildProfilePage = () => {
  const { id } = useParams();
  const [guild, setGuild] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteValue, setInviteValue] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [allUsers, setAllUsers] = useState([]);

  useEffect(() => {
    const fetchGuild = async () => {
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
    };
    fetchGuild();
  }, [id]);

  useEffect(() => {
    if (inviteOpen && allUsers.length === 0) {
      api
        .get("/user/all-users-for-guild")
        .then((res) => setAllUsers(res.data))
        .catch(() => setAllUsers([]));
    }
  }, [inviteOpen, allUsers.length]);

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
        }
      );
      setInviteOpen(false);
      setInviteValue("");
      const res = await api.get(`/guild/${id}`);
      setMembers(res.data.members || []);
    } catch (err) {
      console.error("Failed to invite user:", err);
      alert("Failed to invite user");
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
            userId: userId,
            guildId: id,
          },
        }
      );
      const res = await api.get(`/guild/${id}`);
      setMembers(res.data.members || []);
    } catch (err) {
      console.error("Failed to kick user:", err);
      alert("Failed to kick user");
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
