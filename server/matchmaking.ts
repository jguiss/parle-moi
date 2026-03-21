import { Database as SqlJsDatabase } from "sql.js";
import { queryAll, queryOne } from "./db";

interface QueueEntry {
  socketId: string;
  userId: string | null;
  region: string;
  country: string | null;
  language: string | null;
  gender: string | null;
  tags: string[];
  latitude: number | null;
  longitude: number | null;
  nearbyRadius: number | null; // km
  reputation: number;
  joinedAt: number;
}

const queue: QueueEntry[] = [];

export function addToQueue(entry: Partial<QueueEntry> & { socketId: string }): void {
  if (queue.some((e) => e.socketId === entry.socketId)) return;
  queue.push({
    socketId: entry.socketId,
    userId: entry.userId || null,
    region: entry.region || "worldwide",
    country: entry.country || null,
    language: entry.language || null,
    gender: entry.gender || null,
    tags: entry.tags || [],
    latitude: entry.latitude ?? null,
    longitude: entry.longitude ?? null,
    nearbyRadius: entry.nearbyRadius ?? null,
    reputation: entry.reputation ?? 5,
    joinedAt: Date.now(),
  });
}

export function removeFromQueue(socketId: string): void {
  const index = queue.findIndex((e) => e.socketId === socketId);
  if (index !== -1) queue.splice(index, 1);
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function matchScore(a: QueueEntry, b: QueueEntry): number {
  let score = 0;

  // Country match: +10
  if (a.country && b.country && a.country === b.country) score += 10;

  // Language match: +8
  if (a.language && b.language && a.language === b.language) score += 8;

  // Gender filter: must match if specified
  if (a.gender && b.gender) {
    // If user A wants a specific gender, B must match
    // We treat gender filter as a preference, not hard block
    if (a.gender === b.gender) score += 5;
  }

  // Tag overlap: +3 per shared tag
  const sharedTags = a.tags.filter((t) => b.tags.includes(t));
  score += sharedTags.length * 3;

  // Reputation bonus: prefer well-rated users
  score += (a.reputation + b.reputation) / 4;

  return score;
}

function getFollowingIds(userId: string | null, db: SqlJsDatabase | null): string[] {
  if (!userId || !db) return [];
  try {
    const rows = queryAll(db, "SELECT friend_id FROM friends WHERE user_id = ?", [userId]);
    return rows.map((r: { friend_id: string }) => r.friend_id);
  } catch { return []; }
}

export function findMatch(
  socketId: string,
  db: SqlJsDatabase | null,
  blockedIds: string[] = []
): QueueEntry | undefined {
  const userEntry = queue.find((e) => e.socketId === socketId);
  if (!userEntry) return undefined;

  // Get following list for match boosting
  const followingIds = getFollowingIds(userEntry.userId, db);

  // Filter candidates
  let candidates = queue.filter((e) => {
    if (e.socketId === socketId) return false;

    // Block check
    if (userEntry.userId && e.userId) {
      if (blockedIds.includes(e.userId)) return false;
    }

    // Region filter (if not worldwide)
    if (userEntry.region !== "worldwide" && e.region !== "worldwide") {
      if (userEntry.region !== e.region) return false;
    }

    // Country filter
    if (userEntry.country && userEntry.country !== "any") {
      if (e.country && e.country !== userEntry.country) return false;
    }

    // Language filter
    if (userEntry.language && userEntry.language !== "any") {
      if (e.language && e.language !== userEntry.language && e.language !== "any") return false;
    }

    // Nearby mode
    if (userEntry.nearbyRadius && userEntry.latitude != null && userEntry.longitude != null) {
      if (e.latitude == null || e.longitude == null) return false;
      const dist = haversineKm(userEntry.latitude, userEntry.longitude, e.latitude, e.longitude);
      if (dist > userEntry.nearbyRadius) return false;
    }

    return true;
  });

  if (candidates.length === 0) {
    // Fallback: relax filters, just avoid blocked users
    candidates = queue.filter((e) => {
      if (e.socketId === socketId) return false;
      if (userEntry.userId && e.userId && blockedIds.includes(e.userId)) return false;
      return true;
    });
  }

  if (candidates.length === 0) return undefined;

  // Sort by match score (highest first), boost followed users
  candidates.sort((a, b) => {
    let scoreA = matchScore(userEntry, a);
    let scoreB = matchScore(userEntry, b);
    // Boost score for users we follow (+15)
    if (a.userId && followingIds.includes(a.userId)) scoreA += 15;
    if (b.userId && followingIds.includes(b.userId)) scoreB += 15;
    return scoreB - scoreA;
  });

  const match = candidates[0];
  removeFromQueue(socketId);
  removeFromQueue(match.socketId);

  return match;
}

export function getQueueSize(): number {
  return queue.length;
}

export function isInQueue(socketId: string): boolean {
  return queue.some((e) => e.socketId === socketId);
}
