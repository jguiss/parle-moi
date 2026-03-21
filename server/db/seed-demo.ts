import { Database as SqlJsDatabase } from "sql.js";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import { queryOne, run } from "./index";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Random integer between min and max (inclusive) */
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Random float with one decimal between min and max */
function randScore(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 10) / 10;
}

/** ISO datetime string N days ago (± some hours for variety) */
function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(randInt(8, 22), randInt(0, 59), randInt(0, 59));
  return d.toISOString().replace("T", " ").slice(0, 19);
}

// ---------------------------------------------------------------------------
// Demo user definitions
// ---------------------------------------------------------------------------

interface DemoUser {
  name: string;
  country: string;
  gender: string;
  language: string;
  tags: string[];
}

const DEMO_USERS: DemoUser[] = [
  { name: "Sophie Martin",  country: "fr", gender: "female", language: "fr", tags: ["voyage", "musique"] },
  { name: "James Wilson",   country: "gb", gender: "male",   language: "en", tags: ["gaming", "tech"] },
  { name: "Maria Garcia",   country: "es", gender: "female", language: "es", tags: ["danse", "cuisine"] },
  { name: "Yuki Tanaka",    country: "jp", gender: "female", language: "ja", tags: ["anime", "photographie"] },
  { name: "Lucas Silva",    country: "br", gender: "male",   language: "pt", tags: ["football", "musique"] },
  { name: "Emma Schmidt",   country: "de", gender: "female", language: "de", tags: ["yoga", "lecture"] },
  { name: "Ahmed Hassan",   country: "eg", gender: "male",   language: "ar", tags: ["cinema", "tech"] },
  { name: "Priya Patel",    country: "in", gender: "female", language: "hi", tags: ["danse", "cuisine"] },
];

// ---------------------------------------------------------------------------
// Messages templates
// ---------------------------------------------------------------------------

const SOPHIE_MSGS = [
  { dir: "to",   text: "Salut Sophie ! Comment vas-tu ?" },
  { dir: "from", text: "Hey ! Ça va super bien, merci 😊 Et toi ?" },
  { dir: "to",   text: "Bien ! Tu as des plans pour ce weekend ?" },
  { dir: "from", text: "Je pense visiter le nouveau musée en ville. Tu veux venir ?" },
  { dir: "to",   text: "Avec plaisir ! On se retrouve samedi matin ?" },
];

const JAMES_MSGS = [
  { dir: "from", text: "Hey! Did you catch the new game release?" },
  { dir: "to",   text: "Not yet, is it any good?" },
  { dir: "from", text: "It's amazing, you should try it this weekend" },
  { dir: "to",   text: "Will do! Thanks for the heads up 👍" },
];

const MARIA_MSGS = [
  { dir: "from", text: "Hola! Merci pour l'appel d'hier, c'était super 😄" },
  { dir: "to",   text: "De nada! On remet ça bientôt ?" },
  { dir: "from", text: "Claro que sí! La semana próxima me va bien" },
];

const EMMA_MSGS = [
  { dir: "to",   text: "Salut Emma, tu as commencé le livre dont on a parlé ?" },
  { dir: "from", text: "Oui ! Je suis déjà au chapitre 5, il est passionnant" },
  { dir: "to",   text: "Génial, j'ai hâte de le lire aussi" },
];

const PRIYA_MSGS = [
  { dir: "from", text: "Hi! Thanks for the call yesterday, really enjoyed it" },
  { dir: "to",   text: "Same here! Let's do it again soon 🙂" },
];

type MsgTemplate = { dir: "to" | "from"; text: string };

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------

export async function seedDemoData(database: SqlJsDatabase): Promise<void> {
  // Check if already seeded
  const existing = queryOne(database, "SELECT id FROM users WHERE name = ?", ["Sophie Martin"]);
  if (existing) {
    return; // already seeded
  }

  console.log("[DB] Seeding demo data...");

  const passwordHash = bcrypt.hashSync("Demo1234!", 12);

  // Get admin user id
  const admin = queryOne<{ id: string }>(database, "SELECT id FROM users WHERE email = ?", ["jguiss@gmail.com"]);
  if (!admin) {
    console.log("[DB] Admin user not found, skipping demo seed");
    return;
  }
  const adminId = admin.id;

  // ------ 1. Create users ------
  const userIds: Record<string, string> = {};

  for (const u of DEMO_USERS) {
    const id = uuid();
    const parts = u.name.toLowerCase().split(" ");
    const email = `${parts[0]}.${parts[1]}@example.com`;
    const createdAt = daysAgo(randInt(10, 60));

    run(database,
      `INSERT INTO users (id, email, name, password_hash, email_verified, reputation_score, streak_days, country, language, gender, created_at)
       VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?)`,
      [id, email, u.name, passwordHash, randScore(3.5, 5.0), randInt(0, 30), u.country, u.language, u.gender, createdAt]
    );

    // Tags
    for (const tag of u.tags) {
      run(database, "INSERT INTO user_tags (user_id, tag) VALUES (?, ?)", [id, tag]);
    }

    userIds[u.name] = id;
  }

  // ------ 2. Friendships (bidirectional) ------
  const friends = ["Sophie Martin", "Maria Garcia", "James Wilson", "Emma Schmidt", "Priya Patel"];
  for (const name of friends) {
    const friendId = userIds[name];
    const createdAt = daysAgo(randInt(5, 30));
    run(database, "INSERT INTO friends (user_id, friend_id, created_at) VALUES (?, ?, ?)", [adminId, friendId, createdAt]);
    run(database, "INSERT INTO friends (user_id, friend_id, created_at) VALUES (?, ?, ?)", [friendId, adminId, createdAt]);
  }

  // ------ 3. Call history ------
  for (const u of DEMO_USERS) {
    const otherId = userIds[u.name];
    const callCount = randInt(2, 3);
    for (let i = 0; i < callCount; i++) {
      const duration = randInt(30, 600);
      const startedAt = daysAgo(randInt(1, 30));
      // Randomly assign who is user_a / user_b
      const adminIsA = Math.random() > 0.5;
      const userA = adminIsA ? adminId : otherId;
      const userB = adminIsA ? otherId : adminId;
      // Some calls have ratings
      const ratingA = Math.random() > 0.5 ? (Math.random() > 0.3 ? 5 : 1) : null;
      const ratingB = Math.random() > 0.5 ? (Math.random() > 0.3 ? 5 : 1) : null;

      run(database,
        "INSERT INTO call_history (user_a, user_b, started_at, duration, rating_a, rating_b) VALUES (?, ?, ?, ?, ?, ?)",
        [userA, userB, startedAt, duration, ratingA, ratingB]
      );
    }
  }

  // ------ 4. Messages ------
  const msgGroups: [string, MsgTemplate[]][] = [
    ["Sophie Martin", SOPHIE_MSGS],
    ["James Wilson", JAMES_MSGS],
    ["Maria Garcia", MARIA_MSGS],
    ["Emma Schmidt", EMMA_MSGS],
    ["Priya Patel", PRIYA_MSGS],
  ];

  for (const [name, msgs] of msgGroups) {
    const otherId = userIds[name];
    // Spread messages over last 14 days, in order
    const baseDay = randInt(3, 14);
    msgs.forEach((m, i) => {
      const from = m.dir === "to" ? adminId : otherId;
      const to = m.dir === "to" ? otherId : adminId;
      const createdAt = daysAgo(baseDay - i); // newer messages have smaller offset
      // Mark older messages as read, last one maybe unread
      const read = i < msgs.length - 1 ? 1 : 0;

      run(database,
        "INSERT INTO messages (from_user, to_user, text, read, created_at) VALUES (?, ?, ?, ?, ?)",
        [from, to, m.text, read, createdAt]
      );
    });
  }

  console.log("[DB] Demo data seeded: 8 users, friendships, calls, and messages");
}
