import Database from "better-sqlite3";
import path from "node:path";

const dbPath = process.env.DATABASE_PATH ?? path.join(process.cwd(), "keuangan_20260804.db");
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS wallets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'wallet' CHECK(type IN ('wallet','bank','cash','other')),
    balance INTEGER NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'IDR',
    note TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

console.log('Wallets table created or already exists');
process.exit(0);
