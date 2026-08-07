import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const databasePath = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "keuangan.db");

function createDatabase() {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  const db = new Database(databasePath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  db.exec("CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)");
   const migrations = [{ version: 1, sql: `
    CREATE TABLE IF NOT EXISTS wallets (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'wallet' CHECK(type IN ('wallet','bank','cash','other')),
      balance INTEGER NOT NULL DEFAULT 0, currency TEXT NOT NULL DEFAULT 'IDR', note TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS wallets (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'wallet' CHECK(type IN ('wallet','bank','cash','other')),
      balance INTEGER NOT NULL DEFAULT 0, currency TEXT NOT NULL DEFAULT 'IDR', note TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS transfers (
      id TEXT PRIMARY KEY, source_wallet_id TEXT NOT NULL REFERENCES wallets(id),
      destination_wallet_id TEXT NOT NULL REFERENCES wallets(id), amount INTEGER NOT NULL,
      fee INTEGER NOT NULL DEFAULT 0, date TEXT NOT NULL, description TEXT, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS transfers (
      id TEXT PRIMARY KEY, source_wallet_id TEXT NOT NULL REFERENCES wallets(id),
      destination_wallet_id TEXT NOT NULL REFERENCES wallets(id), amount INTEGER NOT NULL,
      fee INTEGER NOT NULL DEFAULT 0, date TEXT NOT NULL, description TEXT, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS debts (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, direction TEXT NOT NULL CHECK(direction IN ('owed_by_me','owed_to_me')),
      principal_amount INTEGER NOT NULL, due_date TEXT, status TEXT NOT NULL DEFAULT 'active', description TEXT, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS debt_payments (
      id TEXT PRIMARY KEY, debt_id TEXT NOT NULL REFERENCES debts(id), wallet_id TEXT NOT NULL REFERENCES wallets(id),
      amount INTEGER NOT NULL, date TEXT NOT NULL, note TEXT, transaction_id TEXT, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL, asset_type TEXT NOT NULL DEFAULT 'other',
      quantity REAL NOT NULL DEFAULT 1, purchase_value INTEGER NOT NULL DEFAULT 0, current_value INTEGER NOT NULL DEFAULT 0,
      valuation_date TEXT, note TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS upcoming_expenses (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, amount INTEGER NOT NULL, wallet_id TEXT REFERENCES wallets(id),
      category TEXT NOT NULL, due_date TEXT NOT NULL, recurrence TEXT NOT NULL DEFAULT 'once', status TEXT NOT NULL DEFAULT 'scheduled',
      note TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
  ` }, { version: 2, sql: `
    CREATE TABLE IF NOT EXISTS wishlists (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      target_amount INTEGER NOT NULL,
      saved_amount INTEGER NOT NULL DEFAULT 0,
      priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high')),
      target_date TEXT,
      note TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'purchased', 'cancelled')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
   ` }, { version: 2, sql: `
