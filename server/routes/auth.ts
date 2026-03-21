import { Router } from "express";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import { getDb, queryOne, run } from "../db";
import { signToken, authRequired, AuthRequest } from "../middleware/auth";
import { authLimiter } from "../middleware/rateLimit";
import { sendVerificationEmail } from "../services/email";

const router = Router();

const registerSchema = z.object({
  email: z.string().email().max(255),
  name: z.string().min(1).max(50).trim(),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// POST /api/auth/register
router.post("/register", authLimiter, async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten().fieldErrors });
    return;
  }

  const { email, name, password } = parsed.data;
  const db = await getDb();

  const existing = queryOne(db, "SELECT id FROM users WHERE email = ?", [email]);
  if (existing) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const userId = uuid();
  const passwordHash = await bcrypt.hash(password, 12);
  const verificationToken = uuid();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  run(db, "INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)",
    [userId, email, name, passwordHash]);

  run(db, "INSERT INTO email_verifications (user_id, token, expires_at) VALUES (?, ?, ?)",
    [userId, verificationToken, expiresAt]);

  // Fire-and-forget: don't block registration on email delivery
  sendVerificationEmail(email, name, verificationToken).catch(() => {});

  const token = signToken({ userId, email });
  res.status(201).json({
    token,
    user: { id: userId, email, name, emailVerified: false },
    message: "Account created. Please check your email to verify.",
  });
});

// POST /api/auth/login
router.post("/login", authLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const { email, password } = parsed.data;
  const db = await getDb();

  const user = queryOne<{
    id: string;
    email: string;
    name: string;
    password_hash: string;
    email_verified: number;
    reputation_score: number;
    streak_days: number;
    country: string | null;
    language: string | null;
    gender: string | null;
    is_admin: number;
    disabled: number;
  }>(db, "SELECT * FROM users WHERE email = ?", [email]);

  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  if (user.disabled) {
    res.status(403).json({ error: "Account disabled. Contact support." });
    return;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const token = signToken({ userId: user.id, email: user.email });
  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: !!user.email_verified,
      reputationScore: user.reputation_score,
      streakDays: user.streak_days,
      country: user.country,
      language: user.language,
      gender: user.gender,
      isAdmin: !!user.is_admin,
    },
  });
});

// POST /api/auth/verify
router.post("/verify", async (req, res) => {
  const { token: verificationToken } = req.body;
  if (!verificationToken || typeof verificationToken !== "string") {
    res.status(400).json({ error: "Token required" });
    return;
  }

  const db = await getDb();
  const record = queryOne<{ user_id: string; expires_at: string }>(
    db,
    "SELECT user_id, expires_at FROM email_verifications WHERE token = ?",
    [verificationToken]
  );

  if (!record) {
    res.status(404).json({ error: "Invalid verification token" });
    return;
  }

  if (new Date(record.expires_at) < new Date()) {
    res.status(410).json({ error: "Token expired" });
    return;
  }

  run(db, "UPDATE users SET email_verified = 1 WHERE id = ?", [record.user_id]);
  run(db, "DELETE FROM email_verifications WHERE user_id = ?", [record.user_id]);

  res.json({ message: "Email verified successfully" });
});

// GET /api/auth/me
router.get("/me", authRequired, async (req: AuthRequest, res) => {
  const db = await getDb();
  const user = queryOne<{
    id: string;
    email: string;
    name: string;
    email_verified: number;
    reputation_score: number;
    total_ratings: number;
    streak_days: number;
    country: string | null;
    language: string | null;
    gender: string | null;
    is_admin: number;
  }>(db, "SELECT id, email, name, email_verified, reputation_score, total_ratings, streak_days, country, language, gender, is_admin FROM users WHERE id = ?",
    [req.user!.userId]);

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const { queryAll: qAll } = await import("../db");
  const tags = qAll<{ tag: string }>(db, "SELECT tag FROM user_tags WHERE user_id = ?", [user.id]);
  const badges = qAll<{ badge_type: string; earned_at: string }>(
    db, "SELECT badge_type, earned_at FROM badges WHERE user_id = ?", [user.id]);
  const languages = qAll<{ language_code: string }>(
    db, "SELECT language_code FROM user_languages WHERE user_id = ?", [user.id]);

  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: !!user.email_verified,
      reputationScore: user.reputation_score,
      totalRatings: user.total_ratings,
      streakDays: user.streak_days,
      country: user.country,
      language: user.language,
      gender: user.gender,
      tags: tags.map((t) => t.tag),
      badges: badges.map((b) => ({ type: b.badge_type, earnedAt: b.earned_at })),
      languages: languages.map((l) => l.language_code),
      isAdmin: !!user.is_admin,
    },
  });
});

// PUT /api/auth/password
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

router.put("/password", authRequired, async (req: AuthRequest, res) => {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten().fieldErrors });
    return;
  }

  const { currentPassword, newPassword } = parsed.data;
  const db = await getDb();

  const user = queryOne<{ id: string; password_hash: string }>(
    db, "SELECT id, password_hash FROM users WHERE id = ?", [req.user!.userId]
  );

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const valid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!valid) {
    res.status(401).json({ error: "Current password is incorrect" });
    return;
  }

  const newHash = await bcrypt.hash(newPassword, 12);
  run(db, "UPDATE users SET password_hash = ? WHERE id = ?", [newHash, user.id]);

  res.json({ message: "Mot de passe modifié" });
});

export default router;
