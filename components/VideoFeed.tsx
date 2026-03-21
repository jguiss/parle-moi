"use client";

import { useRef, useEffect } from "react";

interface VideoFeedProps {
  stream: MediaStream | null;
  mirrored?: boolean;
  muted?: boolean;
  label?: string;
  children?: React.ReactNode;
}

export function VideoFeed({
  stream,
  mirrored = false,
  muted = false,
  label,
  children,
}: VideoFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative flex-1 bg-bg-deep overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className={`absolute inset-0 w-full h-full object-cover ${
          mirrored ? "scale-x-[-1]" : ""
        }`}
      />
      {!stream && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface">
          <div className="text-text-dim text-sm font-body">
            {label || "No video"}
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
