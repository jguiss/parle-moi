"use client";

import { useEffect } from "react";
import { VideoChat } from "@/components/VideoChat";
import { ToastContainer } from "@/components/Toast";
import { useMediaStream } from "@/hooks/useMediaStream";

export default function LivePage() {
  const media = useMediaStream();

  useEffect(() => {
    // Start camera when entering live page
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
