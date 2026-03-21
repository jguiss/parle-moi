import initSqlJs, { Database as SqlJsDatabase } from "sql.js";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import { SCHEMA } from "./schema";
import { seedDemoData } from "./seed-demo";

const DB_PATH = process.env.DB_PATH || join(process.cwd(), "data", "parle-moi.db");

let db: SqlJsDatabase | null = null;
let saveInterval: ReturnType<typeof setInterval> | null = null;

export async function getDb(): Promise<SqlJsDatabase> {
  if (db) return db;

  const SQL = await initSqlJs();

  const dir = dirname(DB_PATH);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  if (existsSync(DB_PATH)) {
    const buffer = readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Enable WAL-like pragmas for performance
  db.run("PRAGMA journal_mode = MEMORY;");
  db.run("PRAGMA foreign_keys = ON;");

  // Run schema
  db.run(SCHEMA);

  // Migrate: add columns if missing (for existing DBs)
  try { db.run("ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0;"); } catch { /* already exists */ }
  try { db.run("ALTER TABLE users ADD COLUMN disabled INTEGER DEFAULT 0;"); } catch { /* already exists */ }

  // Seed admin account
  await seedAdmin(db);

  // Seed demo data (fake users, calls, messages)
  await seedDemoData(db);

  // Auto-save every 5 seconds
  saveInterval = setInterval(() => {
    saveDb();
  }, 5000);

  return db;
}

export function saveDb(): void {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  const dir = dirname(DB_PATH);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(DB_PATH, buffer);
}

export function closeDb(): void {
  if (saveInterval) {
    clearInterval(saveInterval);
    saveInterval = null;
  }
  if (db) {
    saveDb();
    db.close();
    db = null;
  }
}

// Helper: run a query and return all rows as typed objects
export function queryAll<T>(database: SqlJsDatabase, sql: string, params: unknown[] = []): T[] {
  const stmt = database.prepare(sql);
  stmt.bind(params as (string | number | null | Uint8Array)[]);
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return results;
}

// Helper: run a query and return first row
export function queryOne<T>(database: SqlJsDatabase, sql: string, params: unknown[] = []): T | undefined {
  const results = queryAll<T>(database, sql, params);
  return results[0];
}

// Helper: run a statement (INSERT, UPDATE, DELETE)
export function run(database: SqlJsDatabase, sql: string, params: unknown[] = []): void {
  database.run(sql, params as (string | number | null | Uint8Array)[]);
}

// Seed admin account if it doesn't exist
async function seedAdmin(database: SqlJsDatabase): Promise<void> {
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "jguiss@gmail.com";
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin123!";
  const existing = queryOne(database, "SELECT id FROM users WHERE email = ?", [ADMIN_EMAIL]);
  if (existing) {
    // Ensure admin flag is set
    run(database, "UPDATE users SET is_admin = 1 WHERE email = ?", [ADMIN_EMAIL]);
    return;
  }
  const adminId = uuid();
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  run(database, "INSERT INTO users (id, email, name, password_hash, email_verified, is_admin) VALUES (?, ?, ?, ?, 1, 1)",
    [adminId, ADMIN_EMAIL, "Admin", passwordHash]);
  console.log("[DB] Admin account seeded for", ADMIN_EMAIL);
}
