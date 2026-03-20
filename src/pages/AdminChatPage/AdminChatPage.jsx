import { useState, useEffect, useRef, useCallback } from "react";
import api from "../../shared/lib/axios";
import { toast } from "react-toastify";
import { io } from "socket.io-client";
import styles from "./AdminChatPage.module.css";

const SOCKET_URL = import.meta.env.VITE_API_URL.replace("/api", "");

export const AdminChatPage = () => {
  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [activeChatId, setActiveChatId] = useState(null);
  const [activeContact, setActiveContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const activeChatIdRef = useRef(null);

  // Keep ref in sync for socket handler closure
  activeChatIdRef.current = activeChatId;

  // Get current user id
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

  // Load contacts
  useEffect(() => {
    const fetchContacts = async () => {
      setContactsLoading(true);
      try {
        const res = await api.get("/admin/contacts");
        setContacts(res.data);
      } catch {
        toast.error("Failed to load contacts");
      } finally {
        setContactsLoading(false);
      }
    };
    fetchContacts();
  }, []);

  // Connect socket once
  useEffect(() => {
    const token =
      localStorage.getItem("access") || sessionStorage.getItem("access");
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket"],
    });
    socketRef.current = socket;

    socket.on("chat:message", (msg) => {
      if (msg.chatId === activeChatIdRef.current) {
        setMessages((prev) => {
          // avoid duplicates (optimistic update)
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const openChat = useCallback(async (contact) => {
    setActiveContact(contact);
    setMessages([]);
    setMessagesLoading(true);
    try {
      const { data: chat } = await api.post(`/admin/chat/${contact.id}`);
      const chatId = chat?.id;
      if (!chatId) {
        toast.error("Failed to open chat: no chat ID returned");
        return;
      }
      setActiveChatId(chatId);

      // Load history
      const { data: msgs } = await api.get(`/chat/${chatId}/messages`);
      console.log("[AdminChat] messages response:", msgs);
      // Handle both array and wrapped formats: { messages: [] } / { data: [] }
      const list = Array.isArray(msgs)
        ? msgs
        : Array.isArray(msgs?.messages)
          ? msgs.messages
          : Array.isArray(msgs?.data)
            ? msgs.data
            : [];
      setMessages(list);

      // Join socket room
      socketRef.current?.emit("chat:join", { chatId });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to open chat");
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  const sendMessage = async () => {
    const trimmed = text.trim();
    if (!trimmed || !activeChatId || sending) return;
    setSending(true);
    const optimisticId = `opt-${Date.now()}`;
    // Optimistic update
    setMessages((prev) => [
      ...prev,
      {
        id: optimisticId,
        text: trimmed,
        sender: { id: currentUserId },
        createdAt: new Date().toISOString(),
        _optimistic: true,
      },
    ]);
    setText("");
    try {
      const { data: msg } = await api.post(`/chat/${activeChatId}/messages`, {
        text: trimmed,
      });
      setMessages((prev) => prev.map((m) => (m.id === optimisticId ? msg : m)));
    } catch {
      toast.error("Failed to send message");
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setText(trimmed);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (iso) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString([], { day: "numeric", month: "short" });
  };

  // Group messages by date
  const safeMessages = Array.isArray(messages) ? messages : [];
  const groupedMessages = safeMessages.reduce((groups, msg) => {
    if (!msg?.createdAt) return groups;
    const dateKey = new Date(msg.createdAt).toDateString();
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(msg);
    return groups;
  }, {});

  return (
    <div className={styles.page}>
      {/* Contacts sidebar */}
      <aside className={styles.contacts}>
        <div className={styles.contactsHeader}>
          <h2 className={styles.contactsTitle}>Admins</h2>
        </div>
        {contactsLoading ? (
          <div className={styles.contactsLoading}>Loading...</div>
        ) : contacts.length === 0 ? (
          <div className={styles.contactsEmpty}>No other admins</div>
        ) : (
          <ul className={styles.contactsList}>
            {contacts.map((c) => (
              <li
                key={c.id}
                className={`${styles.contactItem} ${
                  activeContact?.id === c.id ? styles.contactActive : ""
                }`}
                onClick={() => openChat(c)}
              >
                <div className={styles.contactAvatar}>
                  {c.avatarUrl ? (
                    <img src={c.avatarUrl} alt={c.login || c.email} />
                  ) : (
                    (c.login || c.email).charAt(0).toUpperCase()
                  )}
                </div>
                <div className={styles.contactInfo}>
                  <div className={styles.contactName}>{c.login || c.email}</div>
                  <div className={styles.contactRole}>{c.email}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {/* Chat area */}
      <div className={styles.chatArea}>
        {!activeContact ? (
          <div className={styles.chatEmpty}>
            <span className={styles.chatEmptyIcon}>💬</span>
            <p>Select a contact to start chatting</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className={styles.chatHeader}>
              <div className={styles.chatHeaderAvatar}>
                {activeContact.avatarUrl ? (
                  <img
                    src={activeContact.avatarUrl}
                    alt={activeContact.login || activeContact.email}
                  />
                ) : (
                  (activeContact.login || activeContact.email)
                    .charAt(0)
                    .toUpperCase()
                )}
              </div>
              <div>
                <div className={styles.chatHeaderName}>
                  {activeContact.login || activeContact.email}
                </div>
                <div className={styles.chatHeaderEmail}>
                  {activeContact.email}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className={styles.messages}>
              {messagesLoading ? (
                <div className={styles.messagesLoading}>Loading...</div>
              ) : safeMessages.length === 0 ? (
                <div className={styles.messagesEmpty}>
                  No messages yet. Say hi!
                </div>
              ) : (
                Object.entries(groupedMessages).map(([dateKey, msgs]) => (
                  <div key={dateKey}>
                    <div className={styles.dateDivider}>
                      <span>{formatDate(msgs[0].createdAt)}</span>
                    </div>
                    {msgs.map((msg) => {
                      const isMine = msg.sender?.id === currentUserId;
                      return (
                        <div
                          key={msg.id}
                          className={`${styles.messageBubble} ${
                            isMine ? styles.mine : styles.theirs
                          } ${msg._optimistic ? styles.optimistic : ""}`}
                        >
                          <div className={styles.messageText}>{msg.text}</div>
                          <div className={styles.messageTime}>
                            {formatTime(msg.createdAt)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className={styles.inputArea}>
              <textarea
                className={styles.input}
                placeholder="Type a message… (Enter to send)"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
              />
              <button
                className={styles.sendButton}
                onClick={sendMessage}
                disabled={!text.trim() || sending}
              >
                ➤
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
