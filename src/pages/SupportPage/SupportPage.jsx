import { useState, useEffect, useRef, useCallback } from "react";
import api from "../../shared/lib/axios";
import { toast } from "react-toastify";
import { io } from "socket.io-client";
import styles from "./SupportPage.module.css";

const SOCKET_URL = import.meta.env.VITE_API_URL.replace("/api", "");

const STATUS_LABEL = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  CLOSED: "Closed",
};

const STATUS_FILTERS = ["ALL", "OPEN", "IN_PROGRESS", "CLOSED"];

export const SupportPage = () => {
  const [tickets, setTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");

  const [activeTicket, setActiveTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const activeTicketIdRef = useRef(null);
  activeTicketIdRef.current = activeTicket?.id ?? null;

  const currentUserId = (() => {
    try {
      const p =
        JSON.parse(localStorage.getItem("profile")) ||
        JSON.parse(sessionStorage.getItem("profile"));
      return p?.id ?? null;
    } catch {
      return null;
    }
  })();

  // Fetch all tickets
  const fetchTickets = useCallback(async () => {
    setTicketsLoading(true);
    try {
      const { data } = await api.get("/support/all");
      setTickets(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load tickets");
    } finally {
      setTicketsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Connect socket once
  useEffect(() => {
    const token =
      localStorage.getItem("access") || sessionStorage.getItem("access");
    const socket = io(`${SOCKET_URL}/support`, {
      auth: { token },
      transports: ["websocket"],
    });
    socketRef.current = socket;

    socket.on("ticket:message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on("ticket:status", ({ ticketId, status }) => {
      // Update open ticket
      setActiveTicket((prev) =>
        prev && prev.id === ticketId ? { ...prev, status } : prev,
      );
      // Update list
      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, status } : t)),
      );
    });

    socket.on("connect_error", () => {
      // silent — admin can still work via REST
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Open a ticket
  const openTicket = async (ticket) => {
    if (activeTicket?.id === ticket.id) return;

    // Leave previous room
    if (activeTicketIdRef.current && socketRef.current) {
      socketRef.current.emit("ticket:leave", {
        ticketId: activeTicketIdRef.current,
      });
    }

    setTicketLoading(true);
    setActiveTicket(null);
    setMessages([]);
    try {
      const { data } = await api.get(`/support/tickets/${ticket.id}`);
      setActiveTicket(data);
      setMessages(Array.isArray(data.messages) ? data.messages : []);

      // Join WS room
      socketRef.current?.emit("ticket:join", { ticketId: ticket.id });

      // Auto promote OPEN → IN_PROGRESS
      if (data.status === "OPEN") {
        await api.patch(`/support/tickets/${ticket.id}/status`, {
          status: "IN_PROGRESS",
        });
        setActiveTicket((prev) => ({ ...prev, status: "IN_PROGRESS" }));
        setTickets((prev) =>
          prev.map((t) =>
            t.id === ticket.id ? { ...t, status: "IN_PROGRESS" } : t,
          ),
        );
      }
    } catch {
      toast.error("Failed to load ticket");
    } finally {
      setTicketLoading(false);
    }
  };

  // Change status
  const changeStatus = async (status) => {
    if (!activeTicket) return;
    try {
      await api.patch(`/support/tickets/${activeTicket.id}/status`, { status });
      setActiveTicket((prev) => ({ ...prev, status }));
      setTickets((prev) =>
        prev.map((t) => (t.id === activeTicket.id ? { ...t, status } : t)),
      );
    } catch {
      toast.error("Failed to update status");
    }
  };

  // Send reply
  const sendReply = async () => {
    const text = reply.trim();
    if (!text || !activeTicket || sending) return;
    setSending(true);
    try {
      await api.post(`/support/tickets/${activeTicket.id}/message`, {
        message: text,
      });
      setReply("");
      // Message comes in via WS
    } catch {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendReply();
    }
  };

  // Filter tickets
  const filtered =
    filter === "ALL" ? tickets : tickets.filter((t) => t.status === filter);

  const countByStatus = (s) => tickets.filter((t) => t.status === s).length;

  return (
    <div className={styles.container}>
      {/* Left panel — ticket list */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h2 className={styles.sidebarTitle}>Support Tickets</h2>
          <button
            className={styles.refreshBtn}
            onClick={fetchTickets}
            title="Refresh"
          >
            ↺
          </button>
        </div>

        {/* Filter tabs */}
        <div className={styles.filterTabs}>
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              className={`${styles.filterTab} ${filter === f ? styles.filterTabActive : ""}`}
              onClick={() => setFilter(f)}
            >
              {f === "ALL" ? `All (${tickets.length})` : null}
              {f === "OPEN" ? `Open (${countByStatus("OPEN")})` : null}
              {f === "IN_PROGRESS"
                ? `Active (${countByStatus("IN_PROGRESS")})`
                : null}
              {f === "CLOSED" ? `Closed (${countByStatus("CLOSED")})` : null}
            </button>
          ))}
        </div>

        {/* Ticket list */}
        <div className={styles.ticketList}>
          {ticketsLoading ? (
            <div className={styles.listEmpty}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div className={styles.listEmpty}>No tickets</div>
          ) : (
            filtered.map((ticket) => (
              <button
                key={ticket.id}
                className={`${styles.ticketItem} ${
                  activeTicket?.id === ticket.id ? styles.ticketItemActive : ""
                }`}
                onClick={() => openTicket(ticket)}
              >
                <div className={styles.ticketItemTop}>
                  <span className={styles.ticketItemTitle}>{ticket.title}</span>
                  <span
                    className={`${styles.statusDot} ${styles[`dot${ticket.status}`]}`}
                  />
                </div>
                <div className={styles.ticketItemMeta}>
                  <span>{ticket.user?.login || ticket.user?.email}</span>
                  <span>{ticket._count?.messages ?? 0} msgs</span>
                </div>
                <div className={styles.ticketItemStatus}>
                  {STATUS_LABEL[ticket.status]}
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Right panel — chat */}
      <main className={styles.chat}>
        {ticketLoading ? (
          <div className={styles.chatEmpty}>Loading ticket...</div>
        ) : !activeTicket ? (
          <div className={styles.chatEmpty}>
            <span>🎫</span>
            <p>Select a ticket to start responding</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className={styles.chatHeader}>
              <div className={styles.chatHeaderInfo}>
                <h3 className={styles.chatTitle}>{activeTicket.title}</h3>
                <p className={styles.chatDescription}>
                  {activeTicket.description}
                </p>
                <div className={styles.chatMeta}>
                  <span>
                    By {activeTicket.user?.login || activeTicket.user?.email}
                  </span>
                </div>
              </div>
              <div className={styles.chatHeaderActions}>
                <span
                  className={`${styles.statusBadge} ${styles[`status${activeTicket.status}`]}`}
                >
                  {STATUS_LABEL[activeTicket.status]}
                </span>
                {activeTicket.status !== "CLOSED" && (
                  <button
                    className={styles.closeTicketBtn}
                    onClick={() => changeStatus("CLOSED")}
                  >
                    Close ticket
                  </button>
                )}
                {activeTicket.status === "CLOSED" && (
                  <button
                    className={styles.reopenBtn}
                    onClick={() => changeStatus("OPEN")}
                  >
                    Reopen
                  </button>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className={styles.messages}>
              {messages.length === 0 ? (
                <div className={styles.messagesEmpty}>
                  No messages yet. Be the first to reply.
                </div>
              ) : (
                messages.map((msg) => {
                  const isAdmin =
                    msg.user?.isadmin || msg.user?.id === currentUserId;
                  return (
                    <div
                      key={msg.id}
                      className={`${styles.message} ${isAdmin ? styles.messageAdmin : styles.messageUser}`}
                    >
                      <div className={styles.messageBubble}>
                        <div className={styles.messageSender}>
                          {msg.user?.username || msg.user?.login || "User"}
                          {msg.user?.isadmin && (
                            <span className={styles.adminTag}>Admin</span>
                          )}
                        </div>
                        <p className={styles.messageText}>{msg.text}</p>
                        <span className={styles.messageTime}>
                          {new Date(msg.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply input */}
            {activeTicket.status !== "CLOSED" ? (
              <div className={styles.replyBox}>
                <textarea
                  className={styles.replyInput}
                  placeholder="Type your reply… (Enter to send, Shift+Enter for newline)"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={2}
                  disabled={sending}
                />
                <button
                  className={styles.sendBtn}
                  onClick={sendReply}
                  disabled={sending || !reply.trim()}
                >
                  {sending ? "..." : "Send"}
                </button>
              </div>
            ) : (
              <div className={styles.closedNotice}>
                This ticket is closed. Reopen it to continue the conversation.
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};
