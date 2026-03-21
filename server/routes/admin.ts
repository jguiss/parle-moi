import { Router, Response, NextFunction } from "express";
import { getDb, queryAll, queryOne, run } from "../db";
import { authRequired, AuthRequest } from "../middleware/auth";

const router = Router();

// Admin middleware: checks is_admin flag
async function adminRequired(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const db = await getDb();
  const user = queryOne<{ is_admin: number }>(db, "SELECT is_admin FROM users WHERE id = ?", [req.user!.userId]);
  if (!user || !user.is_admin) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}

// GET /api/admin/users?page=1&limit=20&search=
router.get("/users", authRequired, adminRequired, async (req: AuthRequest, res) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const search = (req.query.search as string || "").trim();
  const offset = (page - 1) * limit;

  const db = await getDb();

  let countSql = "SELECT COUNT(*) as total FROM users";
  let listSql = "SELECT id, email, name, reputation_score, streak_days, country, language, gender, is_admin, disabled, created_at FROM users";
  const params: unknown[] = [];

  if (search) {
    const where = " WHERE name LIKE ? OR email LIKE ?";
    countSql += where;
    listSql += where;
    params.push(`%${search}%`, `%${search}%`);
  }

  listSql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";

  const countRow = queryOne<{ total: number }>(db, countSql, params);
  const total = countRow?.total || 0;
  const users = queryAll<{
    id: string;
    email: string;
    name: string;
    reputation_score: number;
    streak_days: number;
    country: string | null;
    language: string | null;
    gender: string | null;
    is_admin: number;
    disabled: number;
    created_at: string;
  }>(db, listSql, [...params, limit, offset]);

  res.json({
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      reputationScore: u.reputation_score,
      streakDays: u.streak_days,
      country: u.country,
      language: u.language,
      gender: u.gender,
      isAdmin: !!u.is_admin,
      disabled: !!u.disabled,
      createdAt: u.created_at,
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
});

// GET /api/admin/reports?page=1&limit=20&status=pending
router.get("/reports", authRequired, adminRequired, async (req: AuthRequest, res) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const offset = (page - 1) * limit;
  const status = req.query.status as string || "all";

  const db = await getDb();

  let countSql = "SELECT COUNT(*) as total FROM reports";
  let listSql = `SELECT r.id, r.reporter_id, r.reported_id, r.reason, r.created_at,
    u1.name as reporter_name, u1.email as reporter_email,
    u2.name as reported_name, u2.email as reported_email, u2.disabled as reported_disabled
    FROM reports r
    LEFT JOIN users u1 ON r.reporter_id = u1.id
    LEFT JOIN users u2 ON r.reported_id = u2.id`;
  const params: unknown[] = [];

  if (status === "pending") {
    const where = " WHERE u2.disabled = 0";
    countSql += " LEFT JOIN users u2p ON reports.reported_id = u2p.id" + " WHERE u2p.disabled = 0";
    listSql += where;
  }

  listSql += " ORDER BY r.created_at DESC LIMIT ? OFFSET ?";

  // Simplified count for reports
  const countRow = queryOne<{ total: number }>(db,
    status === "pending"
      ? "SELECT COUNT(*) as total FROM reports r LEFT JOIN users u ON r.reported_id = u.id WHERE u.disabled = 0 OR u.disabled IS NULL"
      : "SELECT COUNT(*) as total FROM reports",
    []);
  const total = countRow?.total || 0;

  const reports = queryAll<{
    id: number;
    reporter_id: string;
    reported_id: string;
    reason: string;
    created_at: string;
    reporter_name: string | null;
    reporter_email: string | null;
    reported_name: string | null;
    reported_email: string | null;
    reported_disabled: number | null;
  }>(db, listSql, [...params, limit, offset]);

  res.json({
    reports: reports.map((r) => ({
      id: r.id,
      reporterId: r.reporter_id,
      reportedId: r.reported_id,
      reason: r.reason,
      createdAt: r.created_at,
      reporterName: r.reporter_name,
      reporterEmail: r.reporter_email,
      reportedName: r.reported_name,
      reportedEmail: r.reported_email,
      reportedDisabled: !!r.reported_disabled,
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
});

// POST /api/admin/users/:id/disable
router.post("/users/:id/disable", authRequired, adminRequired, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const db = await getDb();

  const user = queryOne<{ id: string; is_admin: number }>(db, "SELECT id, is_admin FROM users WHERE id = ?", [id]);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  if (user.is_admin) {
    res.status(400).json({ error: "Cannot disable an admin account" });
    return;
  }

  run(db, "UPDATE users SET disabled = 1 WHERE id = ?", [id]);
  res.json({ message: "User disabled" });
});

// POST /api/admin/users/:id/enable
router.post("/users/:id/enable", authRequired, adminRequired, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const db = await getDb();

  const user = queryOne<{ id: string }>(db, "SELECT id FROM users WHERE id = ?", [id]);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  run(db, "UPDATE users SET disabled = 0 WHERE id = ?", [id]);
  res.json({ message: "User enabled" });
});

// DELETE /api/admin/reports/:id — dismiss a report
router.delete("/reports/:id", authRequired, adminRequired, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const db = await getDb();

  const report = queryOne<{ id: number }>(db, "SELECT id FROM reports WHERE id = ?", [parseInt(id)]);
  if (!report) {
    res.status(404).json({ error: "Report not found" });
    return;
  }

  run(db, "DELETE FROM reports WHERE id = ?", [parseInt(id)]);
  res.json({ message: "Report dismissed" });
});

// GET /api/admin/stats
router.get("/stats", authRequired, adminRequired, async (_req: AuthRequest, res) => {
  const db = await getDb();
  const totalUsers = queryOne<{ count: number }>(db, "SELECT COUNT(*) as count FROM users")?.count || 0;
  const disabledUsers = queryOne<{ count: number }>(db, "SELECT COUNT(*) as count FROM users WHERE disabled = 1")?.count || 0;
  const totalReports = queryOne<{ count: number }>(db, "SELECT COUNT(*) as count FROM reports")?.count || 0;
  const totalCalls = queryOne<{ count: number }>(db, "SELECT COUNT(*) as count FROM call_history")?.count || 0;

  res.json({ totalUsers, disabledUsers, totalReports, totalCalls });
});

export default router;
