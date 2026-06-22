import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database, { type Database as DatabaseType } from "better-sqlite3";

const dbPath = process.env.DATABASE_PATH ?? "./data/app.db";
mkdirSync(dirname(dbPath), { recursive: true }); // ensure ./data exists

const database: DatabaseType = new Database(dbPath);
database.pragma("journal_mode = WAL"); // better read/write ; WAL:- Write Ahead Log

database.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

export { database };