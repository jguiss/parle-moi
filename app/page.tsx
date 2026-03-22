"use client";

import { useState, useEffect, useCallback } from "react";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { ToastContainer } from "@/components/Toast";
import { getSocket } from "@/lib/socket";
import { useRouter } from "next/navigation";

export default function Home() {
  const [onlineCount, setOnlineCount] = useState(0);
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
      // Don't disconnect — VideoChat on /live will reuse the same socket singleton
    };
  }, []);

  const handleStart = useCallback(() => {
    // Navigate to /live — camera will be started there
    router.push("/live");
  }, [router]);

  return (
    <>
      <ToastContainer />
      <WelcomeScreen
        stream={null}
        cameraError={null}
        onlineCount={onlineCount}
        onStart={handleStart}
        isLoading={false}
      />
    </>
  );
}
