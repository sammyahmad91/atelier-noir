import "server-only";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";
import { seedDemo } from "./seed";

// Vercel's filesystem is read-only except /tmp, which is wiped when an instance is recycled.
const fallbackUrl = process.env.VERCEL ? "file:/tmp/atelier.db" : "file:local.db";

const client = createClient({
  url: process.env.DATABASE_URL ?? fallbackUrl,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });

const DDL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS fragrances (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  house TEXT NOT NULL,
  concentration TEXT NOT NULL,
  family TEXT NOT NULL,
  year INTEGER,
  top_notes TEXT NOT NULL,
  heart_notes TEXT NOT NULL,
  base_notes TEXT NOT NULL,
  seasons TEXT NOT NULL,
  time_of_day TEXT NOT NULL,
  intensity INTEGER NOT NULL,
  size_ml INTEGER NOT NULL,
  remaining_pct INTEGER NOT NULL,
  story TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS fragrances_user_idx ON fragrances(user_id);
CREATE TABLE IF NOT EXISTS wears (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fragrance_id TEXT NOT NULL REFERENCES fragrances(id) ON DELETE CASCADE,
  worn_at INTEGER NOT NULL,
  occasion TEXT NOT NULL,
  weather TEXT NOT NULL,
  compliments INTEGER NOT NULL DEFAULT 0,
  rating INTEGER NOT NULL,
  note TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS wears_user_idx ON wears(user_id);
CREATE INDEX IF NOT EXISTS wears_fragrance_idx ON wears(fragrance_id);
`;

let ready: Promise<void> | null = null;

/** Creates tables and the demo atelier on first use, so a fresh clone runs with zero setup. */
export function ensureDb() {
  ready ??= (async () => {
    await client.executeMultiple(`PRAGMA foreign_keys = ON;${DDL}`);
    await seedDemo(db);
  })().catch((err) => {
    ready = null;
    throw err;
  });
  return ready;
}
