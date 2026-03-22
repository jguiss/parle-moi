"use client";

import { useState, useEffect, useCallback } from "react";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { VideoChat } from "@/components/VideoChat";
import { ToastContainer } from "@/components/Toast";
import { useMediaStream } from "@/hooks/useMediaStream";
import { getSocket } from "@/lib/socket";

export default function Home() {
  const [showWelcome, setShowWelcome] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const [started, setStarted] = useState(false);
  const media = useMediaStream();

  // Don't auto-start camera — mobile browsers require user gesture for getUserMedia

  // Listen for online count
  useEffect(() => {
    const socket = getSocket();
    socket.connect();

    const handleCount = (count: number) => {
      setOnlineCount(count);
    };

    socket.on("queue-count", handleCount);

    return () => {
      socket.off("queue-count", handleCount);
      if (showWelcome) {
        socket.disconnect();
      }
    };
  }, [showWelcome]);

  const handleStart = useCallback(async () => {
    let s = media.stream;
    if (!s) {
      s = await media.startStream();
    }
    if (!s) return; // Camera denied or unavailable — don't proceed
    setLeaving(true);
    setStarted(true);

    // Wait longer to ensure React state is updated with the stream
    setTimeout(() => {
      setShowWelcome(false);
    }, 500);
  }, [media]);

  return (
    <>
      <ToastContainer />

      {showWelcome && (
        <div className={leaving ? "animate-fadeOutScale" : ""}>
          <WelcomeScreen
            stream={media.stream}
            cameraError={media.error}
            onlineCount={onlineCount}
            onStart={handleStart}
            isLoading={false}
          />
        </div>
      )}

      {started && !showWelcome && <VideoChat media={media} />}
    </>
  );
}
