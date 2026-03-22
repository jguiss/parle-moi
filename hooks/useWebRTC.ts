"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { createPeerConnection } from "@/lib/webrtc";

type SignalSender = (to: string, signal: RTCSessionDescriptionInit | RTCIceCandidateInit) => void;

export type ConnectionStatus = "idle" | "connecting" | "connected" | "failed";

interface UseWebRTCOptions {
  localStream: MediaStream | null;
  sendSignal: SignalSender;
  onRemoteStream?: (stream: MediaStream) => void;
  onConnectionStateChange?: (state: ConnectionStatus) => void;
}

interface UseWebRTCReturn {
  remoteStream: MediaStream | null;
  connectionStatus: ConnectionStatus;
  createOffer: (partnerId: string) => Promise<void>;
  handleOffer: (partnerId: string, offer: RTCSessionDescriptionInit) => Promise<void>;
  handleAnswer: (answer: RTCSessionDescriptionInit) => Promise<void>;
  handleIceCandidate: (candidate: RTCIceCandidateInit) => Promise<void>;
  closeConnection: () => void;
}

export function useWebRTC({
  localStream,
  sendSignal,
  onRemoteStream,
  onConnectionStateChange,
}: UseWebRTCOptions): UseWebRTCReturn {
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("idle");
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const partnerIdRef = useRef<string | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const iceRestartAttemptedRef = useRef(false);
  const onRemoteStreamRef = useRef(onRemoteStream);
  const onConnectionStateChangeRef = useRef(onConnectionStateChange);
  onRemoteStreamRef.current = onRemoteStream;
  onConnectionStateChangeRef.current = onConnectionStateChange;

  const updateStatus = useCallback((status: ConnectionStatus) => {
    setConnectionStatus(status);
    onConnectionStateChangeRef.current?.(status);
  }, []);

  const setupPeerConnection = useCallback(
    async (partnerId: string): Promise<RTCPeerConnection> => {
      if (pcRef.current) {
        pcRef.current.close();
      }

      updateStatus("connecting");

      const pc = await createPeerConnection();
      pcRef.current = pc;
      partnerIdRef.current = partnerId;
      pendingCandidatesRef.current = [];
      iceRestartAttemptedRef.current = false;

      const newRemoteStream = new MediaStream();
      setRemoteStream(newRemoteStream);

      // Add local tracks
      if (localStream) {
        const tracks = localStream.getTracks();
        console.log(`[WebRTC] Adding ${tracks.length} local tracks to peer connection`);
        tracks.forEach((track) => {
          pc.addTrack(track, localStream);
        });
      } else {
        console.warn("[WebRTC] WARNING: No local stream when setting up peer connection!");
      }

      // Handle remote tracks
      pc.ontrack = (event) => {
        console.log(`[WebRTC] Remote track received: ${event.track.kind}`);
        event.streams[0]?.getTracks().forEach((track) => {
          newRemoteStream.addTrack(track);
        });
        onRemoteStreamRef.current?.(newRemoteStream);
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && partnerIdRef.current) {
          console.log(`[WebRTC] Sending ICE candidate: ${event.candidate.type || "unknown"} ${event.candidate.protocol || ""}`);
          sendSignal(partnerIdRef.current, event.candidate.toJSON());
        } else if (!event.candidate) {
          console.log("[WebRTC] ICE gathering complete");
        }
      };

      pc.onicegatheringstatechange = () => {
        console.log(`[WebRTC] ICE gathering state: ${pc.iceGatheringState}`);
      };

      // Monitor connection state
      pc.onconnectionstatechange = () => {
        console.log(`[WebRTC] Connection state: ${pc.connectionState}`);
        switch (pc.connectionState) {
          case "connected":
            updateStatus("connected");
            break;
          case "failed":
            updateStatus("failed");
            break;
          case "connecting":
            updateStatus("connecting");
            break;
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log(`[WebRTC] ICE connection state: ${pc.iceConnectionState}`);
        if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
          updateStatus("connected");
          iceRestartAttemptedRef.current = false;
        } else if (pc.iceConnectionState === "failed") {
          if (!iceRestartAttemptedRef.current) {
            iceRestartAttemptedRef.current = true;
            console.log("[WebRTC] ICE failed, attempting restart with new offer...");
            // restartIce() alone doesn't work — we need to create a new offer
            pc.restartIce();
            pc.createOffer({ iceRestart: true }).then(async (offer) => {
              await pc.setLocalDescription(offer);
              if (partnerIdRef.current) {
                sendSignal(partnerIdRef.current, offer);
              }
            }).catch(err => {
              console.error("[WebRTC] ICE restart offer failed:", err);
              updateStatus("failed");
            });
          } else {
            console.log("[WebRTC] ICE restart also failed, giving up");
            updateStatus("failed");
          }
        } else if (pc.iceConnectionState === "disconnected") {
          setTimeout(() => {
            if (pc.iceConnectionState === "disconnected") {
              if (!iceRestartAttemptedRef.current) {
                iceRestartAttemptedRef.current = true;
                console.log("[WebRTC] ICE disconnected, attempting restart...");
                pc.restartIce();
                pc.createOffer({ iceRestart: true }).then(async (offer) => {
                  await pc.setLocalDescription(offer);
                  if (partnerIdRef.current) {
                    sendSignal(partnerIdRef.current, offer);
                  }
                }).catch(err => console.error("[WebRTC] ICE restart offer failed:", err));
              }
            }
          }, 3000);
        }
      };

      return pc;
    },
    [localStream, sendSignal, updateStatus]
  );

  const createOffer = useCallback(
    async (partnerId: string) => {
      console.log(`[WebRTC] Creating offer for partner ${partnerId}`);
      const pc = await setupPeerConnection(partnerId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log("[WebRTC] Offer created and set as local description");
      sendSignal(partnerId, offer);
    },
    [setupPeerConnection, sendSignal]
  );

  const handleOffer = useCallback(
    async (partnerId: string, offer: RTCSessionDescriptionInit) => {
      console.log(`[WebRTC] Handling offer from partner ${partnerId}`);
      const pc = await setupPeerConnection(partnerId);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      // Process any pending ICE candidates
      for (const candidate of pendingCandidatesRef.current) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
      pendingCandidatesRef.current = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log("[WebRTC] Answer created and sent");
      sendSignal(partnerId, answer);
    },
    [setupPeerConnection, sendSignal]
  );

  const handleAnswer = useCallback(async (answer: RTCSessionDescriptionInit) => {
    const pc = pcRef.current;
    if (!pc) return;
    console.log("[WebRTC] Handling answer");
    await pc.setRemoteDescription(new RTCSessionDescription(answer));

    // Process any pending ICE candidates
    for (const candidate of pendingCandidatesRef.current) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
    pendingCandidatesRef.current = [];
  }, []);

  const handleIceCandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    const pc = pcRef.current;
    if (!pc) return;

    if (pc.remoteDescription) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } else {
      pendingCandidatesRef.current.push(candidate);
    }
  }, []);

  const closeConnection = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    partnerIdRef.current = null;
    pendingCandidatesRef.current = [];
    setRemoteStream(null);
    updateStatus("idle");
  }, [updateStatus]);

  useEffect(() => {
    return () => {
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
    };
  }, []);

  return {
    remoteStream,
    connectionStatus,
    createOffer,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    closeConnection,
  };
}
