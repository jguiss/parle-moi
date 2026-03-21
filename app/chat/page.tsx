"use client";

import { useEffect } from "react";
import { VideoChat } from "@/components/VideoChat";
import { ToastContainer } from "@/components/Toast";
import { useMediaStream } from "@/hooks/useMediaStream";

export default function ChatPage() {
  const media = useMediaStream();

  useEffect(() => {
    media.startStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <ToastContainer />
      <VideoChat media={media} />
    </>
  );
}
