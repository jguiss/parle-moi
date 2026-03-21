"use client";

import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token = typeof window !== "undefined" ? localStorage.getItem("parle-moi-token") : null;
    socket = io(SOCKET_URL, {
      autoConnect: false,
      transports: ["websocket", "polling"],
      auth: token ? { token } : {},
    });
  }
  return socket;
}

// Recreate socket with fresh auth (call after login/logout)
export function resetSocket(): Socket {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  return getSocket();
}
