import { Router } from "express";
import { getDb, queryAll, queryOne, run } from "../db";
import { authRequired, AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/friends
router.get("/", authRequired, async (req: AuthRequest, res) => {
  const db = await getDb();
  const friends = queryAll<{
    friend_id: string;
    name: string;
    reputation_score: number;
    country: string | null;
    created_at: string;
  }>(db, `
    SELECT f.friend_id, u.name, u.reputation_score, u.country, f.created_at
    FROM friends f JOIN users u ON u.id = f.friend_id
    WHERE f.user_id = ?
    ORDER BY f.created_at DESC
  `, [req.user!.userId]);

  res.json({ friends });
});

// POST /api/friends/:friendId
router.post("/:friendId", authRequired, async (req: AuthRequest, res) => {
  const db = await getDb();
  const userId = req.user!.userId;
  const { friendId } = req.params;

  if (userId === friendId) {
    res.status(400).json({ error: "Cannot add yourself" });
    return;
  }

  const friend = queryOne(db, "SELECT id FROM users WHERE id = ?", [friendId]);
  if (!friend) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const existing = queryOne(db, "SELECT id FROM friends WHERE user_id = ? AND friend_id = ?", [userId, friendId]);
  if (existing) {
    res.status(409).json({ error: "Already friends" });
    return;
  }

  // Mutual friendship
  run(db, "INSERT INTO friends (user_id, friend_id) VALUES (?, ?)", [userId, friendId]);
  run(db, "INSERT OR IGNORE INTO friends (user_id, friend_id) VALUES (?, ?)", [friendId, userId]);

  res.status(201).json({ message: "Friend added" });
});

// DELETE /api/friends/:friendId
router.delete("/:friendId", authRequired, async (req: AuthRequest, res) => {
  const db = await getDb();
  const userId = req.user!.userId;
  const { friendId } = req.params;

  run(db, "DELETE FROM friends WHERE user_id = ? AND friend_id = ?", [userId, friendId]);
  run(db, "DELETE FROM friends WHERE user_id = ? AND friend_id = ?", [friendId, userId]);

  res.json({ message: "Friend removed" });
});

export default router;
