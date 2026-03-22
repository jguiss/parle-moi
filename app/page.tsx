"use client";

import { useState, useEffect, useCallback } from "react";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { ToastContainer } from "@/components/Toast";
import { useMediaStream } from "@/hooks/useMediaStream";
import { getSocket } from "@/lib/socket";
import { useRouter } from "next/navigation";

export default function Home() {
  const [onlineCount, setOnlineCount] = useState(0);
  const media = useMediaStream();
  const router = useRouter();

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
      socket.disconnect();
    };
  }, []);

  const handleStart = useCallback(async () => {
    // Start camera first, then navigate to live
    const s = await media.startStream();
    if (!s) return; // Camera denied
    router.push("/live");
  }, [media, router]);

  return (
    <>
      <ToastContainer />
      <WelcomeScreen
        stream={media.stream}
        cameraError={media.error}
        onlineCount={onlineCount}
        onStart={handleStart}
        isLoading={false}
      />
    </>
  );
}
