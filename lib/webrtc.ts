const API_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

// Default fallback ICE servers (used until dynamic ones are fetched)
const defaultIceServers: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
  { urls: "stun:stun4.l.google.com:19302" },
];

// Cache for dynamically fetched ICE servers
let cachedIceServers: RTCIceServer[] | null = null;
let lastFetchTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function fetchIceServers(): Promise<RTCIceServer[]> {
  const now = Date.now();
  if (cachedIceServers && now - lastFetchTime < CACHE_TTL) {
    return cachedIceServers;
  }

  try {
    const resp = await fetch(`${API_URL}/api/turn-credentials`);
    const data = await resp.json();
    if (data.iceServers && Array.isArray(data.iceServers) && data.iceServers.length > 0) {
      cachedIceServers = data.iceServers;
      lastFetchTime = now;
      console.log(`[WebRTC] Fetched ${data.iceServers.length} ICE servers from API`);
      return data.iceServers;
    }
  } catch (err) {
    console.warn("[WebRTC] Failed to fetch ICE servers from API, using defaults", err);
  }

  return defaultIceServers;
}

export async function createPeerConnection(): Promise<RTCPeerConnection> {
  const iceServers = await fetchIceServers();
  const config: RTCConfiguration = {
    iceServers,
    iceCandidatePoolSize: 10,
  };
  console.log(`[WebRTC] Creating peer connection with ${iceServers.length} ICE servers`);
  return new RTCPeerConnection(config);
}
