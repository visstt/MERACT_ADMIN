import React, { useEffect, useRef, useState } from "react";
import AgoraRTC from "agora-rtc-sdk-ng";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Circle,
  Popup,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import api from "../../shared/lib/axios";
import { Button } from "../../shared/ui";
import styles from "./AdminStreamViewer.module.css";

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const parseJWT = (token) => {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

export const AdminStreamViewer = ({ streamData, onClose }) => {
  const [remoteUsers, setRemoteUsers] = useState({});
  const [agoraClient, setAgoraClient] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [showMap, setShowMap] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState(null);
  const [startLocation, setStartLocation] = useState(null);
  const [destinationLocation, setDestinationLocation] = useState(null);

  const videoContainerRef = useRef(null);
  const chatContainerRef = useRef(null);

  const channelName = `act_${streamData.id}` || "default_channel";
  const userId = useRef(
    `viewer_${Date.now()}_${Math.floor(Math.random() * 10000)}`
  );

  // Fix Leaflet marker icons
  useEffect(() => {
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl:
        "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
      shadowUrl:
        "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
    });
  }, []);

  // Initialize Agora
  useEffect(() => {
    const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
    setAgoraClient(client);

    return () => {
      if (client) {
        client.leave();
      }
    };
  }, []);

  // Join channel
  useEffect(() => {
    if (!agoraClient) return;

    const joinChannel = async () => {
      try {
        setIsConnecting(true);
        setConnectionError(null);

        console.log(
          "Getting viewer token for channel:",
          channelName,
          "userId:",
          userId.current
        );

        // Get token from API
        const tokenResponse = await api.get(
          `/act/token/${channelName}/SUBSCRIBER/uid?uid=${userId.current}&expiry=3600`
        );

        console.log("Token response:", tokenResponse.data);

        // Токен находится в response.data.token (как в рабочем коде)
        const tokenData = tokenResponse.data.token || tokenResponse.data;

        const parsedToken = parseJWT(tokenData);
        const uid = parsedToken?.uid || 0;

        console.log("Parsed UID from token:", uid);
        console.log("Joining channel:", channelName, "with uid:", uid);
        console.log("Using Agora App ID:", import.meta.env.VITE_AGORA_APP_ID);

        await agoraClient.join(
          import.meta.env.VITE_AGORA_APP_ID,
          channelName,
          tokenData,
          uid
        );

        console.log("✅ Successfully joined channel as viewer");

        // Проверяем, есть ли уже пользователи в канале
        const remoteUsers = agoraClient.remoteUsers;
        console.log(
          "📊 Remote users in channel:",
          remoteUsers.length,
          remoteUsers
        );

        // Если есть пользователи, подписываемся на них
        for (const user of remoteUsers) {
          console.log(
            "👤 Found existing user:",
            user.uid,
            "hasVideo:",
            user.hasVideo,
            "hasAudio:",
            user.hasAudio
          );
          if (user.hasVideo) {
            await agoraClient.subscribe(user, "video");
            console.log("✅ Subscribed to existing user video:", user.uid);
            setRemoteUsers((prev) => ({ ...prev, [user.uid]: user }));
            setIsVideoPlaying(true);
          }
          if (user.hasAudio) {
            await agoraClient.subscribe(user, "audio");
            user.audioTrack?.play();
          }
        }
        setIsConnecting(false);

        // Handle remote users
        console.log("📡 Setting up event listeners for remote users...");

        agoraClient.on("user-published", async (user, mediaType) => {
          console.log("🎥 User published:", user.uid, "mediaType:", mediaType);
          await agoraClient.subscribe(user, mediaType);
          console.log("✅ Subscribed to user:", user.uid, mediaType);

          if (mediaType === "video" && videoContainerRef.current) {
            console.log("📺 Playing video track for user:", user.uid);
            // Воспроизводим видео СРАЗУ, как в основном приложении
            user.videoTrack?.play(videoContainerRef.current);
            setRemoteUsers((prev) => ({ ...prev, [user.uid]: user }));
            setIsVideoPlaying(true);
            console.log("✅ Video playing for user:", user.uid);
          }

          if (mediaType === "audio") {
            console.log("🔊 Playing audio track for user:", user.uid);
            user.audioTrack?.play();
          }
        });

        agoraClient.on("user-unpublished", (user, mediaType) => {
          console.log("📴 User unpublished:", user.uid, mediaType);
          if (mediaType === "video") {
            setRemoteUsers((prev) => {
              const newUsers = { ...prev };
              delete newUsers[user.uid];
              return newUsers;
            });
          }
        });

        agoraClient.on("user-left", (user) => {
          console.log("👋 User left:", user.uid);
          setRemoteUsers((prev) => {
            const newUsers = { ...prev };
            delete newUsers[user.uid];
            return newUsers;
          });
        });
      } catch (error) {
        console.error("Error joining channel:", error);
        setIsConnecting(false);
        setConnectionError(error.message || "Failed to connect to stream");
      }
    };

    joinChannel();

    return () => {
      agoraClient.leave();
    };
  }, [agoraClient, channelName]);

  // Load chat messages
  useEffect(() => {
    const loadMessages = async () => {
      try {
        // Попробуем разные варианты URL (тихо, без логов ошибок)
        const response = await api
          .get(`/act/${streamData.id}/messages`)
          .catch(() => api.get(`/chat/${streamData.id}/messages`))
          .catch(() => null);

        if (response?.data) {
          setMessages(response.data);
        }
      } catch (error) {
        // Тихо игнорируем ошибки чата
      }
    };

    loadMessages();
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [streamData.id]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Fetch route data and build route
  useEffect(() => {
    const fetchRouteData = async () => {
      if (streamData?.startLatitude && streamData?.startLongitude) {
        const start = {
          latitude: streamData.startLatitude,
          longitude: streamData.startLongitude,
        };
        setStartLocation(start);
      }

      if (streamData?.destinationLatitude && streamData?.destinationLongitude) {
        const destination = {
          latitude: streamData.destinationLatitude,
          longitude: streamData.destinationLongitude,
        };
        setDestinationLocation(destination);

        // Build route if both start and destination exist
        if (streamData?.startLatitude && streamData?.startLongitude) {
          try {
            const response = await fetch(
              `https://router.project-osrm.org/route/v1/foot/${streamData.startLongitude},${streamData.startLatitude};${streamData.destinationLongitude},${streamData.destinationLatitude}?overview=full&geometries=geojson`
            );
            const data = await response.json();

            if (data.routes && data.routes[0]) {
              const coordinates = data.routes[0].geometry.coordinates.map(
                (coord) => [coord[1], coord[0]]
              );
              setRouteCoordinates(coordinates);
            }
          } catch (error) {
            console.error("Error fetching route:", error);
          }
        }
      }
    };

    fetchRouteData();
  }, [streamData]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      // Попробуем разные варианты URL (тихо)
      await api
        .post(`/act/${streamData.id}/message`, {
          text: newMessage,
        })
        .catch(() =>
          api.post(`/chat/send`, {
            actId: streamData.id,
            message: newMessage,
            userId: userId.current,
          })
        )
        .catch(() => null);

      setNewMessage("");
    } catch (error) {
      // Тихо игнорируем ошибки отправки
    }
  };

  const toggleMute = () => {
    const remoteUserIds = Object.keys(remoteUsers);
    if (remoteUserIds.length > 0) {
      const remoteUser = remoteUsers[remoteUserIds[0]];
      if (remoteUser?.audioTrack) {
        if (isMuted) {
          remoteUser.audioTrack.play();
        } else {
          remoteUser.audioTrack.stop();
        }
        setIsMuted(!isMuted);
      }
    }
  };

  const toggleFullscreen = () => {
    const videoEl = videoContainerRef.current?.parentElement;
    if (!document.fullscreenElement) {
      videoEl?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div className={styles.viewerOverlay} onClick={onClose}>
      <div
        className={styles.viewerContainer}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.viewerHeader}>
          <div className={styles.headerLeft}>
            <h2 className={styles.streamTitle}>{streamData.title}</h2>
            <span className={styles.streamerBadge}>
              @{streamData.streamerName}
            </span>
            <span className={styles.liveBadge}>LIVE</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>

        <div className={styles.viewerContent}>
          <div className={styles.mainContent}>
            <div className={styles.videoSection}>
              <div className={styles.videoWrapper}>
                <div ref={videoContainerRef} className={styles.videoPlayer}>
                  {connectionError ? (
                    <div className={styles.videoPlaceholder}>
                      <div className={styles.errorIcon}>⚠️</div>
                      <p className={styles.errorText}>{connectionError}</p>
                      <Button variant="primary" size="sm" onClick={onClose}>
                        Close
                      </Button>
                    </div>
                  ) : !isVideoPlaying && isConnecting ? (
                    <div className={styles.videoPlaceholder}>
                      <div className={styles.loadingSpinner}></div>
                      <p>Connecting to channel...</p>
                    </div>
                  ) : !isVideoPlaying ? (
                    <div className={styles.videoPlaceholder}>
                      <div className={styles.waitingIcon}>📡</div>
                      <p>Waiting for streamer...</p>
                      <span className={styles.waitingHint}>
                        The stream will appear when the broadcaster starts
                      </span>
                      <div
                        style={{
                          marginTop: "20px",
                          fontSize: "12px",
                          opacity: 0.7,
                        }}
                      >
                        <div>Channel: {channelName}</div>
                        <div>Viewer UID: {userId.current}</div>
                        <div>
                          Remote users: {Object.keys(remoteUsers).length}
                        </div>
                        <div>App ID: {import.meta.env.VITE_AGORA_APP_ID}</div>
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className={styles.videoControls}>
                  <Button variant="ghost" size="sm" onClick={toggleMute}>
                    {isMuted ? "🔇" : "🔊"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={toggleFullscreen}>
                    ⛶
                  </Button>
                  <div className={styles.viewerCount}>
                    👥 {streamData.connectedUsers || 0}
                  </div>
                  <div className={styles.likeCount}>
                    ❤️ {streamData.likes || 0}
                  </div>
                </div>
              </div>
              <div className={styles.mapSection}>
                <h3 className={styles.sectionTitle}>Route Map</h3>
                <button
                  className={styles.openMapButton}
                  onClick={() => setShowMap(true)}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
                      fill="currentColor"
                    />
                  </svg>
                  <span>Open Full Map</span>
                  {routeCoordinates && (
                    <span className={styles.routeInfo}>Route available</span>
                  )}
                </button>
              </div>
              ```
            </div>
          </div>

          <div className={styles.chatSection}>
            <h3 className={styles.chatHeader}>Stream Chat</h3>
            <div ref={chatContainerRef} className={styles.chatMessages}>
              {messages.length === 0 ? (
                <div className={styles.noChatMessages}>
                  No messages yet. Be the first to chat!
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div key={idx} className={styles.chatMessage}>
                    <span className={styles.chatUser}>
                      {msg.userName || msg.userId}:
                    </span>
                    <span className={styles.chatText}>
                      {msg.message || msg.text}
                    </span>
                  </div>
                ))
              )}
            </div>
            <form onSubmit={handleSendMessage} className={styles.chatInput}>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Send a message..."
                className={styles.chatInputField}
              />
              <Button type="submit" variant="primary" size="sm">
                Send
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Map Overlay */}
      {showMap && (
        <div className={styles.mapOverlay} onClick={(e) => e.stopPropagation()}>
          <button
            className={styles.closeMapButton}
            onClick={() => setShowMap(false)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M15 18L9 12L15 6"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Back
          </button>

          <MapContainer
            center={
              startLocation
                ? [startLocation.latitude, startLocation.longitude]
                : [51.505, -0.09]
            }
            zoom={15}
            style={{
              width: "100%",
              height: "100%",
              filter: "grayscale(100%) invert(1)",
            }}
            zoomControl={true}
            attributionControl={false}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />

            {/* Start point */}
            {startLocation && (
              <Circle
                center={[startLocation.latitude, startLocation.longitude]}
                radius={50}
                pathOptions={{
                  color: "black",
                  fillColor: "black",
                  fillOpacity: 0.8,
                  weight: 2,
                }}
              />
            )}

            {/* Route */}
            {routeCoordinates && routeCoordinates.length > 0 && (
              <Polyline
                positions={routeCoordinates}
                pathOptions={{
                  color: "black",
                  weight: 4,
                  opacity: 0.8,
                }}
              />
            )}

            {/* Destination */}
            {destinationLocation && (
              <Marker
                position={[
                  destinationLocation.latitude,
                  destinationLocation.longitude,
                ]}
              >
                <Popup>
                  <div style={{ color: "#000" }}>Destination</div>
                </Popup>
              </Marker>
            )}
          </MapContainer>
        </div>
      )}
    </div>
  );
};
