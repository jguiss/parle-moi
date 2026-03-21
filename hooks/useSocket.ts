"use client";

import { useEffect, useRef, useCallback } from "react";
import { Socket } from "socket.io-client";
import { getSocket } from "@/lib/socket";

interface MatchedData {
  partnerId: string;
  isInitiator: boolean;
}

interface SignalData {
  from: string;
  signal: RTCSessionDescriptionInit | RTCIceCandidateInit;
}

interface UseSocketOptions {
  onMatched?: (data: MatchedData) => void;
  onSignal?: (data: SignalData) => void;
  onPartnerLeft?: () => void;
  onQueueCount?: (count: number) => void;
  onError?: (message: string) => void;
}

interface UseSocketReturn {
  socket: Socket;
  joinQueue: (filters?: {
    region?: string;
    country?: string;
    language?: string;
    gender?: string;
    tags?: string[];
    latitude?: number;
    longitude?: number;
    nearbyRadius?: number;
  }) => void;
  leaveQueue: () => void;
  sendSignal: (to: string, signal: RTCSessionDescriptionInit | RTCIceCandidateInit) => void;
  next: () => void;
  connect: () => void;
  disconnect: () => void;
}

export function useSocket(options: UseSocketOptions = {}): UseSocketReturn {
  const socketRef = useRef<Socket>(getSocket());
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const socket = socketRef.current;

    const handleMatched = (data: MatchedData) => {
      optionsRef.current.onMatched?.(data);
    };

    const handleSignal = (data: SignalData) => {
      optionsRef.current.onSignal?.(data);
    };

    const handlePartnerLeft = () => {
      optionsRef.current.onPartnerLeft?.();
    };

    const handleQueueCount = (count: number) => {
      optionsRef.current.onQueueCount?.(count);
    };

    const handleError = (message: string) => {
      optionsRef.current.onError?.(message);
    };

    socket.on("matched", handleMatched);
    socket.on("signal", handleSignal);
    socket.on("partner-left", handlePartnerLeft);
    socket.on("queue-count", handleQueueCount);
    socket.on("error", handleError);

    return () => {
      socket.off("matched", handleMatched);
      socket.off("signal", handleSignal);
      socket.off("partner-left", handlePartnerLeft);
      socket.off("queue-count", handleQueueCount);
      socket.off("error", handleError);
    };
  }, []);

  const connect = useCallback(() => {
    if (!socketRef.current.connected) {
      socketRef.current.connect();
    }
  }, []);

  const disconnect = useCallback(() => {
    socketRef.current.disconnect();
  }, []);

  const joinQueue = useCallback((filters?: {
    region?: string;
    country?: string;
    language?: string;
    gender?: string;
    tags?: string[];
    latitude?: number;
    longitude?: number;
    nearbyRadius?: number;
  }) => {
    socketRef.current.emit("join-queue", filters);
  }, []);

  const leaveQueue = useCallback(() => {
    socketRef.current.emit("leave-queue");
  }, []);

  const sendSignal = useCallback(
    (to: string, signal: RTCSessionDescriptionInit | RTCIceCandidateInit) => {
      socketRef.current.emit("signal", { to, signal });
    },
    []
  );

  const next = useCallback(() => {
    socketRef.current.emit("next");
  }, []);

  return {
    socket: socketRef.current,
    joinQueue,
    leaveQueue,
    sendSignal,
    next,
    connect,
    disconnect,
  };
}
