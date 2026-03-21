import { Router } from "express";
import { z } from "zod";
import { getDb, queryOne, queryAll, run } from "../db";
import { authRequired, AuthRequest } from "../middleware/auth";

const router = Router();

const updateProfileSchema = z.object({
  name: z.string().min(1).max(50).trim().optional(),
  country: z.string().max(2).optional(),
  language: z.string().max(10).optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

const updateTagsSchema = z.object({
  tags: z.array(z.string().min(1).max(30).trim()).max(3),
});

const updateLanguagesSchema = z.object({
  languages: z.array(z.string().min(2).max(5)).max(10),
});

// PUT /api/users/profile
router.put("/profile", authRequired, async (req: AuthRequest, res) => {
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten().fieldErrors });
    return;
  }

  const db = await getDb();
  const { name, country, language, gender, latitude, longitude } = parsed.data;

  const sets: string[] = [];
  const params: unknown[] = [];

  if (name !== undefined) { sets.push("name = ?"); params.push(name); }
  if (country !== undefined) { sets.push("country = ?"); params.push(country); }
  if (language !== undefined) { sets.push("language = ?"); params.push(language); }
  if (gender !== undefined) { sets.push("gender = ?"); params.push(gender); }
  if (latitude !== undefined) { sets.push("latitude = ?"); params.push(latitude); }
  if (longitude !== undefined) { sets.push("longitude = ?"); params.push(longitude); }

  if (sets.length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }

  params.push(req.user!.userId);
  run(db, `UPDATE users SET ${sets.join(", ")} WHERE id = ?`, params);

  res.json({ message: "Profile updated" });
});

// PUT /api/users/tags
router.put("/tags", authRequired, async (req: AuthRequest, res) => {
  const parsed = updateTagsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input. Max 3 tags, each max 30 characters." });
    return;
  }

  const db = await getDb();
  const userId = req.user!.userId;

  run(db, "DELETE FROM user_tags WHERE user_id = ?", [userId]);
  for (const tag of parsed.data.tags) {
    run(db, "INSERT INTO user_tags (user_id, tag) VALUES (?, ?)", [userId, tag.toLowerCase()]);
  }

  res.json({ message: "Tags updated", tags: parsed.data.tags });
});

// GET /api/users/tags
router.get("/tags", authRequired, async (req: AuthRequest, res) => {
  const db = await getDb();
  const tags = queryAll<{ tag: string }>(db, "SELECT tag FROM user_tags WHERE user_id = ?", [req.user!.userId]);
  res.json({ tags: tags.map((t) => t.tag) });
});

// PUT /api/users/languages
router.put("/languages", authRequired, async (req: AuthRequest, res) => {
  const parsed = updateLanguagesSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input. Max 10 languages." });
    return;
  }

  const db = await getDb();
  const userId = req.user!.userId;

  run(db, "DELETE FROM user_languages WHERE user_id = ?", [userId]);
  for (const lang of parsed.data.languages) {
    run(db, "INSERT INTO user_languages (user_id, language_code) VALUES (?, ?)", [userId, lang]);
  }

  // Also update the primary language column to the first one
  if (parsed.data.languages.length > 0) {
    run(db, "UPDATE users SET language = ? WHERE id = ?", [parsed.data.languages[0], userId]);
  }

  res.json({ message: "Languages updated", languages: parsed.data.languages });
});

// GET /api/users/languages
router.get("/languages", authRequired, async (req: AuthRequest, res) => {
  const db = await getDb();
  const langs = queryAll<{ language_code: string }>(db, "SELECT language_code FROM user_languages WHERE user_id = ?", [req.user!.userId]);
  res.json({ languages: langs.map((l) => l.language_code) });
});

// GET /api/users/:id (public profile)
router.get("/:id", async (req, res) => {
  const db = await getDb();
  const user = queryOne<{
    id: string;
    name: string;
    reputation_score: number;
    total_ratings: number;
    country: string | null;
    streak_days: number;
  }>(db, "SELECT id, name, reputation_score, total_ratings, country, streak_days FROM users WHERE id = ?",
    [req.params.id]);

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const badges = queryAll<{ badge_type: string }>(db, "SELECT badge_type FROM badges WHERE user_id = ?", [user.id]);

  res.json({
    user: {
      id: user.id,
      name: user.name,
      reputationScore: user.reputation_score,
      totalRatings: user.total_ratings,
      country: user.country,
      streakDays: user.streak_days,
      badges: badges.map((b) => b.badge_type),
    },
  });
});

export default router;
