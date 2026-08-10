import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { Pool } from "pg";

const ROOT_DIR = path.resolve(import.meta.dirname ?? __dirname, "..");

function loadEnv() {
  const envPath = path.join(ROOT_DIR, ".env");
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnv();

const DATABASE_URL = process.env.DATABASE_URL;
const PROD_APP_URL = process.env.PROD_APP_URL ?? "https://yl.infoinfo.web.id";
const DB_SYNC_SECRET = process.env.DB_SYNC_SECRET;
const BACKUPS_DIR = path.join(ROOT_DIR, "backups");

if (!DATABASE_URL) throw new Error("DATABASE_URL tidak ada di .env");
if (!DB_SYNC_SECRET) throw new Error("DB_SYNC_SECRET tidak ada di .env");

function backupLocalDb(): string {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
  const backupPath = path.join(BACKUPS_DIR, `your-life-local-${timestamp}.dump`);
  const url = new URL(DATABASE_URL as string);
  const dbName = url.pathname.slice(1);
  const user = url.username || "your_life";
  const dbContainer = process.env.DB_CONTAINER ?? "your-life-db-1";
  const cmd = `docker exec ${dbContainer} pg_dump -U ${user} -d ${dbName} -Fc > "${backupPath}"`;
  console.log(`Backup lokal dibuat: ${backupPath}`);
  execSync(cmd, { shell: "/bin/sh" });
  return backupPath;
}

async function fetchDump(): Promise<string> {
  const url = `${PROD_APP_URL}/api/admin/db-export`;
  console.log(`Menarik data dari ${url} ...`);
  const response = await fetch(url, { headers: { Authorization: `Bearer ${DB_SYNC_SECRET}` } });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Server ${response.status}: ${body}`);
  }
  const sql = await response.text();
  if (!sql.includes("BEGIN;") || !sql.includes("COMMIT;")) {
    throw new Error("Dump dari server tidak valid (tidak ada transaksi BEGIN/COMMIT).");
  }
  return sql;
}

async function restore(sql: string) {
  const pool = new Pool({ connectionString: DATABASE_URL });
  try {
    await pool.query(sql);
    console.log("Restore selesai.");
  } finally {
    await pool.end();
  }
}

async function run() {
  backupLocalDb();
  const sql = await fetchDump();
  await restore(sql);
}

run().catch((error) => {
  console.error("db:pull gagal:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
