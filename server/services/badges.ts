import { Database as SqlJsDatabase } from "sql.js";
import { queryAll, queryOne, run } from "../db";

export const BADGE_TYPES = {
  NEWCOMER_WELCOME: "newcomer_welcome",   // First call
  GLOBE_TROTTER: "globe_trotter",         // Talked to 20 different countries
  POLYGLOT: "polyglot",                   // 3 different languages
  REGULAR: "regular",                     // 100 calls
  SOCIAL_BUTTERFLY: "social_butterfly",   // 10 friends
  STREAK_7: "streak_7",                   // 7-day streak
  STREAK_30: "streak_30",                 // 30-day streak
  TOP_RATED: "top_rated",                 // Reputation score >= 4.5 with 50+ ratings
} as const;

export type BadgeType = typeof BADGE_TYPES[keyof typeof BADGE_TYPES];

export const BADGE_INFO: Record<BadgeType, { name: string; description: string; icon: string }> = {
  [BADGE_TYPES.NEWCOMER_WELCOME]: { name: "Newcomer Welcome", description: "Completed your first call", icon: "wave" },
  [BADGE_TYPES.GLOBE_TROTTER]: { name: "Globe-trotter", description: "Talked to people from 20 different countries", icon: "globe" },
  [BADGE_TYPES.POLYGLOT]: { name: "Polyglot", description: "Connected with 3 different languages", icon: "languages" },
  [BADGE_TYPES.REGULAR]: { name: "Regular", description: "Completed 100 calls", icon: "star" },
  [BADGE_TYPES.SOCIAL_BUTTERFLY]: { name: "Social Butterfly", description: "Made 10 friends", icon: "users" },
  [BADGE_TYPES.STREAK_7]: { name: "Week Warrior", description: "7-day streak", icon: "fire" },
  [BADGE_TYPES.STREAK_30]: { name: "Monthly Master", description: "30-day streak", icon: "trophy" },
  [BADGE_TYPES.TOP_RATED]: { name: "Top Rated", description: "High reputation with 50+ ratings", icon: "heart" },
};

export async function checkAndAwardBadges(db: SqlJsDatabase, userId: string): Promise<BadgeType[]> {
  const awarded: BadgeType[] = [];

  const existingBadges = queryAll<{ badge_type: string }>(db, "SELECT badge_type FROM badges WHERE user_id = ?", [userId]);
  const hasBadge = (type: BadgeType) => existingBadges.some((b) => b.badge_type === type);

  const awardIfNew = (type: BadgeType) => {
    if (!hasBadge(type)) {
      run(db, "INSERT OR IGNORE INTO badges (user_id, badge_type) VALUES (?, ?)", [userId, type]);
      awarded.push(type);
    }
  };

  // Newcomer Welcome: first call
  const callCount = queryOne<{ cnt: number }>(db,
    "SELECT COUNT(*) as cnt FROM call_history WHERE user_a = ? OR user_b = ?", [userId, userId]);
  if (callCount && callCount.cnt >= 1) awardIfNew(BADGE_TYPES.NEWCOMER_WELCOME);

  // Regular: 100 calls
  if (callCount && callCount.cnt >= 100) awardIfNew(BADGE_TYPES.REGULAR);

  // Globe-trotter: 20 different countries
  const countryCount = queryOne<{ cnt: number }>(db, `
    SELECT COUNT(DISTINCT u.country) as cnt FROM call_history ch
    JOIN users u ON (u.id = CASE WHEN ch.user_a = ? THEN ch.user_b ELSE ch.user_a END)
    WHERE (ch.user_a = ? OR ch.user_b = ?) AND u.country IS NOT NULL
  `, [userId, userId, userId]);
  if (countryCount && countryCount.cnt >= 20) awardIfNew(BADGE_TYPES.GLOBE_TROTTER);

  // Polyglot: 3 different languages
  const langCount = queryOne<{ cnt: number }>(db, `
    SELECT COUNT(DISTINCT u.language) as cnt FROM call_history ch
    JOIN users u ON (u.id = CASE WHEN ch.user_a = ? THEN ch.user_b ELSE ch.user_a END)
    WHERE (ch.user_a = ? OR ch.user_b = ?) AND u.language IS NOT NULL
  `, [userId, userId, userId]);
  if (langCount && langCount.cnt >= 3) awardIfNew(BADGE_TYPES.POLYGLOT);

  // Social Butterfly: 10 friends
  const friendCount = queryOne<{ cnt: number }>(db,
    "SELECT COUNT(*) as cnt FROM friends WHERE user_id = ?", [userId]);
  if (friendCount && friendCount.cnt >= 10) awardIfNew(BADGE_TYPES.SOCIAL_BUTTERFLY);

  // Streak badges
  const user = queryOne<{ streak_days: number }>(db, "SELECT streak_days FROM users WHERE id = ?", [userId]);
  if (user) {
    if (user.streak_days >= 7) awardIfNew(BADGE_TYPES.STREAK_7);
    if (user.streak_days >= 30) awardIfNew(BADGE_TYPES.STREAK_30);
  }

  // Top Rated
  const reputation = queryOne<{ reputation_score: number; total_ratings: number }>(db,
    "SELECT reputation_score, total_ratings FROM users WHERE id = ?", [userId]);
  if (reputation && reputation.reputation_score >= 4.5 && reputation.total_ratings >= 50) {
    awardIfNew(BADGE_TYPES.TOP_RATED);
  }

  return awarded;
}
