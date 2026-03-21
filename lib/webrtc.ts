const iceServers: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

// Add TURN server if configured
if (
  typeof window !== "undefined" &&
  process.env.NEXT_PUBLIC_TURN_URL &&
  process.env.NEXT_PUBLIC_TURN_USER &&
  process.env.NEXT_PUBLIC_TURN_PASS
) {
  iceServers.push({
    urls: process.env.NEXT_PUBLIC_TURN_URL,
    username: process.env.NEXT_PUBLIC_TURN_USER,
    credential: process.env.NEXT_PUBLIC_TURN_PASS,
  });
}

export const iceConfig: RTCConfiguration = {
  iceServers,
};

export function createPeerConnection(): RTCPeerConnection {
  return new RTCPeerConnection(iceConfig);
}
