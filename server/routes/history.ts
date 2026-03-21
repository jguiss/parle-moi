import { Router } from "express";
import { z } from "zod";
import { getDb, queryAll, queryOne, run } from "../db";
import { authRequired, AuthRequest } from "../middleware/auth";
import { updateReputation } from "../services/reputation";
import { checkAndAwardBadges } from "../services/badges";

const router = Router();

const rateSchema = z.object({
  callId: z.number(),
  rating: z.number().min(1).max(5),
});

// GET /api/history
router.get("/", authRequired, async (req: AuthRequest, res) => {
  const db = await getDb();
  const userId = req.user!.userId;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
  const offset = parseInt(req.query.offset as string) || 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const calls = queryAll<any>(db, `
    SELECT ch.*,
      CASE WHEN ch.user_a = ? THEN ub.name ELSE ua.name END as partner_name,
      CASE WHEN ch.user_a = ? THEN ub.country ELSE ua.country END as partner_country,
      CASE WHEN ch.user_a = ? THEN ub.language ELSE ua.language END as partner_language,
      CASE WHEN ch.user_a = ? THEN ch.user_b ELSE ch.user_a END as partner_id,
      CASE WHEN f.friend_id IS NOT NULL THEN 1 ELSE 0 END as is_following
    FROM call_history ch
    LEFT JOIN users ua ON ua.id = ch.user_a
    LEFT JOIN users ub ON ub.id = ch.user_b
    LEFT JOIN friends f ON f.user_id = ? AND f.friend_id = (CASE WHEN ch.user_a = ? THEN ch.user_b ELSE ch.user_a END)
    WHERE ch.user_a = ? OR ch.user_b = ?
    ORDER BY ch.started_at DESC
    LIMIT ? OFFSET ?
  `, [userId, userId, userId, userId, userId, userId, userId, userId, limit, offset]);

  // Fetch partner tags
  const enriched = calls.map((call: Record<string, unknown>) => {
    const partnerId = call.partner_id as string;
    const tags = queryAll<{ tag: string }>(db, "SELECT tag FROM user_tags WHERE user_id = ?", [partnerId]);
    return { ...call, partner_tags: tags.map((t: { tag: string }) => t.tag) };
  });

  res.json({ calls: enriched });
});

// POST /api/history/rate
router.post("/rate", authRequired, async (req: AuthRequest, res) => {
  const parsed = rateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid rating" });
    return;
  }

  const db = await getDb();
  const userId = req.user!.userId;
  const { callId, rating } = parsed.data;

  const call = queryOne<{ user_a: string; user_b: string; rating_a: number | null; rating_b: number | null }>(
    db, "SELECT user_a, user_b, rating_a, rating_b FROM call_history WHERE id = ?", [callId]);

  if (!call) {
    res.status(404).json({ error: "Call not found" });
    return;
  }

  let partnerId: string;
  if (call.user_a === userId) {
    if (call.rating_a !== null) {
      res.status(409).json({ error: "Already rated" });
      return;
    }
    run(db, "UPDATE call_history SET rating_a = ? WHERE id = ?", [rating, callId]);
    partnerId = call.user_b;
  } else if (call.user_b === userId) {
    if (call.rating_b !== null) {
      res.status(409).json({ error: "Already rated" });
      return;
    }
    run(db, "UPDATE call_history SET rating_b = ? WHERE id = ?", [rating, callId]);
    partnerId = call.user_a;
  } else {
    res.status(403).json({ error: "Not your call" });
    return;
  }

  const { newScore } = updateReputation(db, partnerId, rating);
  await checkAndAwardBadges(db, userId);
  await checkAndAwardBadges(db, partnerId);

  res.json({ message: "Rated", partnerNewScore: newScore });
});

export default router;
