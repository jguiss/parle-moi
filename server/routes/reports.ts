import { Router } from "express";
import { z } from "zod";
import { getDb, queryOne, run } from "../db";
import { authRequired, AuthRequest } from "../middleware/auth";
import { reportLimiter } from "../middleware/rateLimit";

const router = Router();

const reportSchema = z.object({
  reportedId: z.string().uuid(),
  reason: z.string().min(1).max(500).trim(),
});

const blockSchema = z.object({
  blockedId: z.string().uuid(),
});

// POST /api/reports
router.post("/", authRequired, reportLimiter, async (req: AuthRequest, res) => {
  const parsed = reportSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const db = await getDb();
  const { reportedId, reason } = parsed.data;
  const reporterId = req.user!.userId;

  if (reporterId === reportedId) {
    res.status(400).json({ error: "Cannot report yourself" });
    return;
  }

  const reportedUser = queryOne(db, "SELECT id FROM users WHERE id = ?", [reportedId]);
  if (!reportedUser) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  run(db, "INSERT INTO reports (reporter_id, reported_id, reason) VALUES (?, ?, ?)",
    [reporterId, reportedId, reason]);

  res.status(201).json({ message: "Report submitted" });
});

// POST /api/reports/block
router.post("/block", authRequired, async (req: AuthRequest, res) => {
  const parsed = blockSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  const db = await getDb();
  const { blockedId } = parsed.data;
  const blockerId = req.user!.userId;

  if (blockerId === blockedId) {
    res.status(400).json({ error: "Cannot block yourself" });
    return;
  }

  run(db, "INSERT OR IGNORE INTO blocks (blocker_id, blocked_id) VALUES (?, ?)",
    [blockerId, blockedId]);

  // Also remove friendship if exists
  run(db, "DELETE FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)",
    [blockerId, blockedId, blockedId, blockerId]);

  res.status(201).json({ message: "User blocked" });
});

// DELETE /api/reports/block/:blockedId
router.delete("/block/:blockedId", authRequired, async (req: AuthRequest, res) => {
  const db = await getDb();
  run(db, "DELETE FROM blocks WHERE blocker_id = ? AND blocked_id = ?",
    [req.user!.userId, req.params.blockedId]);
  res.json({ message: "User unblocked" });
});

// GET /api/reports/blocked
router.get("/blocked", authRequired, async (req: AuthRequest, res) => {
  const db = await getDb();
  const blocked = (await import("../db")).queryAll<{ blocked_id: string; name: string }>(db, `
    SELECT b.blocked_id, u.name FROM blocks b
    JOIN users u ON u.id = b.blocked_id
    WHERE b.blocker_id = ?
  `, [req.user!.userId]);

  res.json({ blocked });
});

export default router;
