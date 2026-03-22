const iceServers: RTCIceServer[] = [
  // Multiple STUN servers for redundancy
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
  { urls: "stun:stun4.l.google.com:19302" },
  // Free TURN relays for NAT traversal (mobile, restrictive networks)
  {
    urls: "turn:openrelay.metered.ca:80",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443?transport=tcp",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  // Additional free TURN servers
  {
    urls: "turn:relay.metered.ca:80",
    username: "e8dd65b92807e38a4a545c45",
    credential: "4+ooXpHiRWyjp/IT",
  },
  {
    urls: "turn:relay.metered.ca:443",
    username: "e8dd65b92807e38a4a545c45",
    credential: "4+ooXpHiRWyjp/IT",
  },
  {
    urls: "turn:relay.metered.ca:443?transport=tcp",
    username: "e8dd65b92807e38a4a545c45",
    credential: "4+ooXpHiRWyjp/IT",
  },
];

// Add custom TURN server if configured (overrides free relays)
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
  iceCandidatePoolSize: 10, // Pre-allocate ICE candidates for faster connection
};

export function createPeerConnection(): RTCPeerConnection {
  return new RTCPeerConnection(iceConfig);
}
