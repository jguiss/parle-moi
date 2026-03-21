import { Database as SqlJsDatabase } from "sql.js";
import { queryOne, run } from "../db";

// Rating is 1 (thumbs down) or 5 (thumbs up)
export function updateReputation(
  db: SqlJsDatabase,
  userId: string,
  rating: number
): { newScore: number; totalRatings: number } {
  const clamped = Math.max(1, Math.min(5, Math.round(rating)));

  const user = queryOne<{ reputation_score: number; total_ratings: number }>(
    db,
    "SELECT reputation_score, total_ratings FROM users WHERE id = ?",
    [userId]
  );

  if (!user) return { newScore: 5, totalRatings: 0 };

  const totalRatings = user.total_ratings + 1;
  // Weighted moving average
  const newScore =
    (user.reputation_score * user.total_ratings + clamped) / totalRatings;
  const rounded = Math.round(newScore * 100) / 100;

  run(
    db,
    "UPDATE users SET reputation_score = ?, total_ratings = ? WHERE id = ?",
    [rounded, totalRatings, userId]
  );

  return { newScore: rounded, totalRatings };
}

export function updateStreak(db: SqlJsDatabase, userId: string): number {
  const user = queryOne<{ streak_days: number; last_active: string | null }>(
    db,
    "SELECT streak_days, last_active FROM users WHERE id = ?",
    [userId]
  );

  if (!user) return 0;

  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  if (!user.last_active) {
    run(db, "UPDATE users SET streak_days = 1, last_active = ? WHERE id = ?", [today, userId]);
    return 1;
  }

  const lastDate = user.last_active.slice(0, 10);
  if (lastDate === today) return user.streak_days;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  let newStreak: number;
  if (lastDate === yesterdayStr) {
    newStreak = user.streak_days + 1;
  } else {
    newStreak = 1; // Reset streak
  }

  run(db, "UPDATE users SET streak_days = ?, last_active = ? WHERE id = ?", [newStreak, today, userId]);
  return newStreak;
}
