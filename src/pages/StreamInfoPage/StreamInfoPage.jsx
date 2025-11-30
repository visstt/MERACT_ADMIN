import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, Button } from "../../shared/ui";
import api, { getImageUrl } from "../../shared/lib/axios";
import { toast } from "react-toastify";
import styles from "./StreamInfoPage.module.css";

export const StreamInfoPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [stream, setStream] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPlayingIntro, setIsPlayingIntro] = useState(false);
  const [isPlayingOutro, setIsPlayingOutro] = useState(false);
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);

  const introRef = useRef(null);
  const outroRef = useRef(null);
  const musicRef = useRef(null);

  useEffect(() => {
    fetchStreamInfo();
  }, [id]);

  const fetchStreamInfo = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/act/get-act/${id}`);
      setStream(res.data);
    } catch (err) {
      toast.error("Failed to load stream info");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const playIntro = () => {
    if (introRef.current && stream?.introUrl) {
      introRef.current.play();
      setIsPlayingIntro(true);
      toast.info("Playing intro...");
    }
  };

  const playOutro = () => {
    if (outroRef.current && stream?.outroUrl) {
      outroRef.current.play();
      setIsPlayingOutro(true);
      toast.info("Playing outro...");
    }
  };

  const toggleMusic = () => {
    if (musicRef.current && stream?.musicUrl) {
      if (isPlayingMusic) {
        musicRef.current.pause();
        setIsPlayingMusic(false);
        toast.info("Music paused");
      } else {
        musicRef.current.play();
        setIsPlayingMusic(true);
        toast.info("Playing background music...");
      }
    }
  };

  const handleIntroEnded = () => {
    setIsPlayingIntro(false);
    // Автоматически запускаем фоновую музыку после интро
    if (stream?.musicUrl && !isPlayingMusic) {
      toggleMusic();
    }
  };

  const handleOutroEnded = () => {
    setIsPlayingOutro(false);
    toast.success("Stream ended");
  };

  const handleStartStream = async () => {
    try {
      // Запускаем интро
      playIntro();
      toast.success("Stream started with intro!");
    } catch (err) {
      toast.error("Failed to start stream");
      console.error(err);
    }
  };

  const handleEndStream = async () => {
    try {
      // Останавливаем музыку
      if (isPlayingMusic) {
        musicRef.current.pause();
        setIsPlayingMusic(false);
      }
      // Запускаем оутро
      playOutro();
      toast.info("Playing outro before ending stream...");
    } catch (err) {
      toast.error("Failed to end stream");
      console.error(err);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Loading stream info...</div>;
  }

  if (!stream) {
    return <div className={styles.error}>Stream not found</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Button variant="ghost" onClick={() => navigate("/admin/streams")}>
          ← Back to Streams
        </Button>
        <h1 className={styles.title}>{stream.name || "Stream Details"}</h1>
      </div>

      <div className={styles.content}>
        <Card className={styles.mainCard}>
          <div className={styles.streamInfo}>
            <h2>Stream Information</h2>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.label}>Title:</span>
                <span className={styles.value}>{stream.name}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>Category:</span>
                <span className={styles.value}>{stream.category}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>Status:</span>
                <span className={styles.value}>{stream.status}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>Duration:</span>
                <span className={styles.value}>{stream.duration}</span>
              </div>
            </div>
          </div>

          <div className={styles.mediaControls}>
            <h2>Media Controls</h2>

            <div className={styles.controlSection}>
              <div className={styles.controlHeader}>
                <h3>🎬 Intro</h3>
                {stream?.introUrl && (
                  <Button
                    onClick={playIntro}
                    disabled={isPlayingIntro}
                    size="sm"
                  >
                    {isPlayingIntro ? "▶️ Playing..." : "▶️ Play Intro"}
                  </Button>
                )}
              </div>
              {stream?.introUrl ? (
                <audio
                  ref={introRef}
                  src={getImageUrl("stream", stream.introUrl)}
                  onEnded={handleIntroEnded}
                  className={styles.audioPlayer}
                  controls
                />
              ) : (
                <p className={styles.noMedia}>No intro file uploaded</p>
              )}
            </div>

            <div className={styles.controlSection}>
              <div className={styles.controlHeader}>
                <h3>🎵 Background Music</h3>
                {stream?.musicUrl && (
                  <Button onClick={toggleMusic} size="sm">
                    {isPlayingMusic ? "⏸️ Pause Music" : "▶️ Play Music"}
                  </Button>
                )}
              </div>
              {stream?.musicUrl ? (
                <audio
                  ref={musicRef}
                  src={getImageUrl("stream", stream.musicUrl)}
                  loop
                  className={styles.audioPlayer}
                  controls
                />
              ) : (
                <p className={styles.noMedia}>No background music uploaded</p>
              )}
            </div>

            <div className={styles.controlSection}>
              <div className={styles.controlHeader}>
                <h3>🎬 Outro</h3>
                {stream?.outroUrl && (
                  <Button
                    onClick={playOutro}
                    disabled={isPlayingOutro}
                    size="sm"
                  >
                    {isPlayingOutro ? "▶️ Playing..." : "▶️ Play Outro"}
                  </Button>
                )}
              </div>
              {stream?.outroUrl ? (
                <audio
                  ref={outroRef}
                  src={getImageUrl("stream", stream.outroUrl)}
                  onEnded={handleOutroEnded}
                  className={styles.audioPlayer}
                  controls
                />
              ) : (
                <p className={styles.noMedia}>No outro file uploaded</p>
              )}
            </div>
          </div>

          <div className={styles.actions}>
            <Button
              onClick={handleStartStream}
              disabled={isPlayingIntro || stream.status === "ONLINE"}
            >
              🎬 Start Stream (with Intro)
            </Button>
            <Button
              variant="error"
              onClick={handleEndStream}
              disabled={isPlayingOutro || stream.status !== "ONLINE"}
            >
              🛑 End Stream (with Outro)
            </Button>
          </div>
        </Card>
      </div>

      {/* Скрытые аудио элементы для автоматического управления */}
      <audio ref={introRef} style={{ display: "none" }} />
      <audio ref={outroRef} style={{ display: "none" }} />
      <audio ref={musicRef} style={{ display: "none" }} loop />
    </div>
  );
};
