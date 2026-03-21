import { Router } from "express";
import { z } from "zod";
import { getDb, queryAll, queryOne, run } from "../db";
import { authRequired, AuthRequest } from "../middleware/auth";

const router = Router();

const sendSchema = z.object({
  text: z.string().min(1).max(2000).trim(),
});

// GET /api/messages/unread/count — MUST be before /:friendId to avoid "unread" being captured as friendId
router.get("/unread/count", authRequired, async (req: AuthRequest, res) => {
  const db = await getDb();
  const result = queryOne<{ cnt: number }>(db,
    "SELECT COUNT(*) as cnt FROM messages WHERE to_user = ? AND read = 0",
    [req.user!.userId]);

  res.json({ count: result?.cnt || 0 });
});

// GET /api/messages/:friendId — conversation with a friend
router.get("/:friendId", authRequired, async (req: AuthRequest, res) => {
  const db = await getDb();
  const userId = req.user!.userId;
  const { friendId } = req.params;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
  const before = req.query.before as string | undefined;

  // Verify friendship
  const friendship = queryOne(db, "SELECT id FROM friends WHERE user_id = ? AND friend_id = ?", [userId, friendId]);
  if (!friendship) {
    res.status(403).json({ error: "Not friends" });
    return;
  }

  let sql = `
    SELECT id, from_user as fromUser, to_user as toUser, text, read, created_at as createdAt
    FROM messages
    WHERE ((from_user = ? AND to_user = ?) OR (from_user = ? AND to_user = ?))
  `;
  const params: unknown[] = [userId, friendId, friendId, userId];

  if (before) {
    sql += " AND created_at < ?";
    params.push(before);
  }

  sql += " ORDER BY created_at DESC LIMIT ?";
  params.push(limit);

  const messages = queryAll<{
    id: number;
    fromUser: string;
    toUser: string;
    text: string;
    read: number;
    createdAt: string;
  }>(db, sql, params);

  // Mark received messages as read
  run(db, "UPDATE messages SET read = 1 WHERE from_user = ? AND to_user = ? AND read = 0",
    [friendId, userId]);

  res.json({ messages: messages.reverse() });
});

// POST /api/messages/:friendId
router.post("/:friendId", authRequired, async (req: AuthRequest, res) => {
  const parsed = sendSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid message" });
    return;
  }

  const db = await getDb();
  const userId = req.user!.userId;
  const { friendId } = req.params;

  const friendship = queryOne(db, "SELECT id FROM friends WHERE user_id = ? AND friend_id = ?", [userId, friendId]);
  if (!friendship) {
    res.status(403).json({ error: "Not friends" });
    return;
  }

  run(db, "INSERT INTO messages (from_user, to_user, text) VALUES (?, ?, ?)",
    [userId, friendId, parsed.data.text]);

  res.status(201).json({ message: "Sent" });
});

export default router;
