import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

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

const DATABASE_PATH =
  process.env.DATABASE_PATH ?? path.join(ROOT_DIR, "data", "keuangan.db");

const PROD_APP_URL = process.env.PROD_APP_URL ?? "https://yl.infoinfo.web.id";
const DB_SYNC_SECRET = process.env.DB_SYNC_SECRET;

const BACKUPS_DIR = path.join(ROOT_DIR, "backups");

async function backupLocalDb(): Promise<string | null> {
  if (!fs.existsSync(DATABASE_PATH)) {
    console.log("No existing local DB to backup.");
    return null;
  }

  fs.mkdirSync(BACKUPS_DIR, { recursive: true });

  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .slice(0, -5);
  const backupPath = path.join(
    BACKUPS_DIR,
    `keuangan_dev_backup_${timestamp}.db`
  );

  const db = new Database(DATABASE_PATH);
  await db.backup(backupPath);
  db.close();

  console.log(`Local DB backed up: ${backupPath}`);
  return backupPath;
}

async function pullFromProduction(): Promise<Buffer> {
  if (!DB_SYNC_SECRET) {
    throw new Error(
      "DB_SYNC_SECRET is not set. Add it to your local .env file."
    );
  }

  const url = `${PROD_APP_URL}/api/admin/db-export`;
  console.log(`Fetching database from ${url} ...`);

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${DB_SYNC_SECRET}` },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Server returned ${response.status} ${response.statusText}: ${body}`
    );
  }

  const contentDisposition = response.headers.get("content-disposition") ?? "";
  const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
  const filename = filenameMatch
    ? filenameMatch[1]
    : "keuangan_unknown.db";
  console.log(`Downloaded: ${filename}`);

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

function verifyDatabase(filePath: string): void {
  const db = new Database(filePath);
  try {
    const result = db.prepare("PRAGMA integrity_check").get() as {
      integrity_check: string;
    };

    if (result.integrity_check !== "ok") {
      throw new Error(`Database integrity failed: ${result.integrity_check}`);
    }

    const { count: walletCount } = db
      .prepare("SELECT COUNT(*) as count FROM wallets")
      .get() as { count: number };

    const { count: txCount } = db
      .prepare("SELECT COUNT(*) as count FROM transactions")
      .get() as { count: number };

    const tableCount = (
      db
        .prepare(
          "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'"
        )
        .get() as { count: number }
    ).count;

    console.log(
      `Database verified: ${tableCount} tables, ${walletCount} wallets, ${txCount} transactions`
    );
  } finally {
    db.close();
  }
}

function replaceLocalDb(pulledDbPath: string): void {
  fs.mkdirSync(path.dirname(DATABASE_PATH), { recursive: true });
  fs.copyFileSync(pulledDbPath, DATABASE_PATH);
}

async function main() {
  console.log("Starting database pull...\n");

  await backupLocalDb();

  const pulledBuffer = await pullFromProduction();

  const tempFilePath = path.join(
    path.dirname(DATABASE_PATH),
    "keuangan_pull.db"
  );
  fs.writeFileSync(tempFilePath, pulledBuffer);

  try {
    verifyDatabase(tempFilePath);
  } catch (err) {
    console.error("Downloaded file failed verification:", err);
    fs.unlinkSync(tempFilePath);
    process.exit(1);
  }

  replaceLocalDb(tempFilePath);
  fs.unlinkSync(tempFilePath);

  console.log(`\nDatabase updated: ${DATABASE_PATH}`);
}

if (process.argv[1] === import.meta.filename) {
  main().catch((err) => {
    console.error("Pull failed:", err.message);
    process.exit(1);
  });
}
