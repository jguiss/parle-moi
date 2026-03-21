import { createServer } from "http";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { Server } from "socket.io";
import { getDb, queryAll, queryOne, run, saveDb, closeDb } from "./db";
import { addToQueue, removeFromQueue, findMatch, getQueueSize } from "./matchmaking";
import { createRoom, removeUserFromRoom, getPartner } from "./rooms";
import { verifyToken, JwtPayload } from "./middleware/auth";
import { apiLimiter } from "./middleware/rateLimit";
import { updateStreak } from "./services/reputation";
import { checkAndAwardBadges } from "./services/badges";
import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import friendRoutes from "./routes/friends";
import messageRoutes from "./routes/messages";
import historyRoutes from "./routes/history";
import reportRoutes from "./routes/reports";
import adminRoutes from "./routes/admin";

const PORT = parseInt(process.env.API_PORT || process.env.PORT || "3001", 10);
const CORS_ORIGIN_RAW = process.env.CORS_ORIGIN || "http://localhost:3000";
const CORS_ORIGIN = CORS_ORIGIN_RAW.includes(",") ? CORS_ORIGIN_RAW.split(",").map(s => s.trim()) : CORS_ORIGIN_RAW;

const app = express();
const httpServer = createServer(app);

// --- Security middleware ---
app.use(helmet({
  contentSecurityPolicy: false,  // handled by Next.js
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true,
}));
app.use(express.json({ limit: "1mb" }));
app.use(apiLimiter);

// --- API routes ---
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/admin", adminRoutes);

// --- Health check ---
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// --- Socket.io ---
const io = new Server(httpServer, {
  cors: { origin: CORS_ORIGIN, methods: ["GET", "POST"], credentials: true },
  pingTimeout: 20000,
  pingInterval: 10000,
});

// Socket auth middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token as string | undefined;
  if (token) {
    try {
      const payload = verifyToken(token);
      (socket.data as { user: JwtPayload }).user = payload;
    } catch {
      // Anonymous user, that's fine
    }
  }
  next();
});

interface JoinQueueFilters {
  region?: string;
  country?: string;
  language?: string;
  gender?: string;
  tags?: string[];
  latitude?: number;
  longitude?: number;
  nearbyRadius?: number;
}

// Track socket -> userId mapping and active calls
const socketToUser = new Map<string, string>();
const activeCallTimers = new Map<string, { startedAt: number; callId: number | null }>();

let connectedCount = 0;

io.on("connection", async (socket) => {
  connectedCount++;
  const userId = (socket.data as { user?: JwtPayload }).user?.userId || null;
  if (userId) {
    socketToUser.set(socket.id, userId);
    // Update streak
    const db = await getDb();
    updateStreak(db, userId);
  }

  console.log(`[+] ${socket.id} (user: ${userId || "anon"}) connected (${connectedCount} online)`);

  socket.on("join-queue", async (filters?: JoinQueueFilters) => {
    let blockedIds: string[] = [];
    let reputation = 5;

    if (userId) {
      const db = await getDb();
      const blocks = queryAll<{ blocked_id: string }>(db,
        "SELECT blocked_id FROM blocks WHERE blocker_id = ?", [userId]);
      const blockedBy = queryAll<{ blocker_id: string }>(db,
        "SELECT blocker_id FROM blocks WHERE blocked_id = ?", [userId]);
      blockedIds = [
        ...blocks.map((b) => b.blocked_id),
        ...blockedBy.map((b) => b.blocker_id),
      ];
      const user = queryOne<{ reputation_score: number; name: string }>(db,
        "SELECT reputation_score, name FROM users WHERE id = ?", [userId]);
      if (user) reputation = user.reputation_score;
    }

    addToQueue({
      socketId: socket.id,
      userId,
      region: filters?.region || "worldwide",
      country: filters?.country || null,
      language: filters?.language || null,
      gender: filters?.gender || null,
      tags: filters?.tags || [],
      latitude: filters?.latitude ?? null,
      longitude: filters?.longitude ?? null,
      nearbyRadius: filters?.nearbyRadius ?? null,
      reputation,
    });

    const db = await getDb();
    const match = findMatch(socket.id, db, blockedIds);
    if (match) {
      const room = createRoom(socket.id, match.socketId);
      socket.join(room.id);
      const matchSocket = io.sockets.sockets.get(match.socketId);
      if (matchSocket) matchSocket.join(room.id);

      // Get partner names
      const myName = userId ? queryOne<{ name: string }>(db, "SELECT name FROM users WHERE id = ?", [userId])?.name : null;
      const partnerName = match.userId ? queryOne<{ name: string }>(db, "SELECT name FROM users WHERE id = ?", [match.userId])?.name : null;

      // Start call history record
      let callId: number | null = null;
      if (userId && match.userId) {
        run(db, "INSERT INTO call_history (user_a, user_b) VALUES (?, ?)", [userId, match.userId]);
        const lastCall = queryOne<{ id: number }>(db,
          "SELECT id FROM call_history WHERE user_a = ? AND user_b = ? ORDER BY id DESC LIMIT 1",
          [userId, match.userId]);
        callId = lastCall?.id || null;
      }

      const callStart = Date.now();
      activeCallTimers.set(socket.id, { startedAt: callStart, callId });
      activeCallTimers.set(match.socketId, { startedAt: callStart, callId });

      socket.emit("matched", {
        partnerId: match.socketId,
        partnerUserId: match.userId,
        partnerName,
        isInitiator: true,
        callId,
      });

      io.to(match.socketId).emit("matched", {
        partnerId: socket.id,
        partnerUserId: userId,
        partnerName: myName,
        isInitiator: false,
        callId,
      });

      console.log(`[M] ${socket.id} <-> ${match.socketId}`);
    }
  });

  socket.on("leave-queue", () => {
    removeFromQueue(socket.id);
  });

  socket.on("signal", (data: { to: string; signal: unknown }) => {
    io.to(data.to).emit("signal", { from: socket.id, signal: data.signal });
  });

  socket.on("add-friend", async (data: { partnerUserId: string }) => {
    if (!userId || !data.partnerUserId) return;
    const db = await getDb();
    run(db, "INSERT OR IGNORE INTO friends (user_id, friend_id) VALUES (?, ?)", [userId, data.partnerUserId]);
    run(db, "INSERT OR IGNORE INTO friends (user_id, friend_id) VALUES (?, ?)", [data.partnerUserId, userId]);
    socket.emit("friend-added", { friendId: data.partnerUserId });
  });

  socket.on("report-user", async (data: { reportedUserId: string; reason: string }) => {
    if (!userId || !data.reportedUserId) return;
    const db = await getDb();
    run(db, "INSERT INTO reports (reporter_id, reported_id, reason) VALUES (?, ?, ?)",
      [userId, data.reportedUserId, data.reason.slice(0, 500)]);
    socket.emit("report-submitted");
  });

  socket.on("block-user", async (data: { blockedUserId: string }) => {
    if (!userId || !data.blockedUserId) return;
    const db = await getDb();
    run(db, "INSERT OR IGNORE INTO blocks (blocker_id, blocked_id) VALUES (?, ?)",
      [userId, data.blockedUserId]);
    run(db, "DELETE FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)",
      [userId, data.blockedUserId, data.blockedUserId, userId]);
    socket.emit("user-blocked");
  });

  socket.on("rate-call", async (data: { callId: number; rating: number }) => {
    if (!userId || !data.callId) return;
    const db = await getDb();
    const call = queryOne<{ user_a: string; user_b: string }>(db,
      "SELECT user_a, user_b FROM call_history WHERE id = ?", [data.callId]);
    if (!call) return;

    const rating = Math.max(1, Math.min(5, Math.round(data.rating)));
    if (call.user_a === userId) {
      run(db, "UPDATE call_history SET rating_a = ? WHERE id = ?", [rating, data.callId]);
    } else if (call.user_b === userId) {
      run(db, "UPDATE call_history SET rating_b = ? WHERE id = ?", [rating, data.callId]);
    }

    const partnerId = call.user_a === userId ? call.user_b : call.user_a;
    const { updateReputation } = await import("./services/reputation");
    updateReputation(db, partnerId, rating);
    await checkAndAwardBadges(db, userId);
  });

  socket.on("next", async () => {
    await endCall(socket.id);
    removeFromQueue(socket.id);
  });

  socket.on("disconnect", async () => {
    connectedCount--;
    await endCall(socket.id);
    removeFromQueue(socket.id);
    socketToUser.delete(socket.id);
    console.log(`[-] ${socket.id} disconnected (${connectedCount} online)`);
  });
});

async function endCall(socketId: string): Promise<void> {
  const callTimer = activeCallTimers.get(socketId);
  const partnerId = removeUserFromRoom(socketId);

  if (callTimer?.callId) {
    const duration = Math.floor((Date.now() - callTimer.startedAt) / 1000);
    const db = await getDb();
    run(db, "UPDATE call_history SET duration = ? WHERE id = ?", [duration, callTimer.callId]);
  }

  activeCallTimers.delete(socketId);
  if (partnerId) {
    activeCallTimers.delete(partnerId);
    io.to(partnerId).emit("partner-left");
  }
}

// Broadcast online count every 5 seconds
setInterval(() => {
  io.emit("queue-count", connectedCount);
}, 5000);

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\nShutting down...");
  closeDb();
  process.exit(0);
});

process.on("SIGTERM", () => {
  closeDb();
  process.exit(0);
});

// Start
(async () => {
  await getDb();
  console.log("Database initialized");

  httpServer.listen(PORT, () => {
    console.log(`Signaling + API server running on port ${PORT}`);
  });
})();
