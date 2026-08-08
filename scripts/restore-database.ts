import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const ROOT_DIR = path.resolve(import.meta.dirname ?? __dirname, "..");
const DATABASE_PATH =
  process.env.DATABASE_PATH ?? path.join(ROOT_DIR, "data", "keuangan.db");
const BACKUPS_DIR = path.join(ROOT_DIR, "backups");

function listBackups(): string[] {
  if (!fs.existsSync(BACKUPS_DIR)) {
    return [];
  }
  return fs
    .readdirSync(BACKUPS_DIR)
    .filter((f) => f.endsWith(".db"))
    .sort()
    .reverse();
}

function restoreFromFile(sourcePath: string): void {
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Backup file not found: ${sourcePath}`);
  }

  console.log(`Verifying: ${sourcePath}`);
  const checkDb = new Database(sourcePath);
  try {
    const result = checkDb
      .prepare("PRAGMA integrity_check")
      .get() as { integrity_check: string };
    if (result.integrity_check !== "ok") {
      throw new Error(`Integrity check failed: ${result.integrity_check}`);
    }
  } finally {
    checkDb.close();
  }

  const destDir = path.dirname(DATABASE_PATH);
  fs.mkdirSync(destDir, { recursive: true });

  if (fs.existsSync(DATABASE_PATH)) {
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, -5);
    const preRestoreBackup = path.join(
      BACKUPS_DIR,
      `keuangan_prerestore_${timestamp}.db`
    );
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });

    const currentDb = new Database(DATABASE_PATH);
    currentDb.backup(preRestoreBackup);
    currentDb.close();
    console.log(`Current DB backed up: ${preRestoreBackup}`);
  }

  fs.copyFileSync(sourcePath, DATABASE_PATH);
  console.log(`Restored: ${DATABASE_PATH}`);
}

function main() {
  const arg = process.argv[2];

  if (!arg || arg === "list") {
    const backups = listBackups();
    if (backups.length === 0) {
      console.log("No backups found.");
      return;
    }
    console.log("Available backups:");
    backups.forEach((b, i) => console.log(`  [${i}] ${b}`));
    console.log('\nUsage: tsx scripts/restore-database.ts <index-or-path>');
    return;
  }

  let sourcePath: string;

  if (/^\d+$/.test(arg)) {
    const backups = listBackups();
    const idx = parseInt(arg, 10);
    if (idx < 0 || idx >= backups.length) {
      throw new Error(`Invalid index: ${idx}. Available: 0-${backups.length - 1}`);
    }
    sourcePath = path.join(BACKUPS_DIR, backups[idx]);
  } else {
    sourcePath = path.isAbsolute(arg) ? arg : path.join(ROOT_DIR, arg);
  }

  restoreFromFile(sourcePath);
}

main();
