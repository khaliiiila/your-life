import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "..");

const DATABASE_PATH = process.env.DATABASE_PATH ?? path.join(rootDir, "data", "keuangan.db");

export function createBackup(backupDir?: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
  const directory = backupDir ?? path.join(rootDir, "backups");
  
  fs.mkdirSync(directory, { recursive: true });
  
  const backupFilename = `keuangan_backup_${timestamp}.db`;
  const backupPath = path.join(directory, backupFilename);
  
  const db = new Database(DATABASE_PATH);
  const backupDb = new Database(backupPath);
  
  // Get all tables and their data
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as Array<{ name: string }>;
  
  for (const table of tables) {
    const rows = db.prepare(`SELECT * FROM "${table.name}"`).all() as Array<Record<string, unknown>>;
    
    if (rows.length > 0) {
      const columns = Object.keys(rows[0]) as string[];
      
      // Create table in backup
      const createTableSql = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name=?`).get(table.name) as string;
      backupDb.exec(createTableSql);
      
      // Insert data
      const insertStmt = backupDb.prepare(`INSERT INTO "${table.name}" (${columns.map(c => `"${c}"`).join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`);
      for (const row of rows) {
        insertStmt.run(Object.values(row) as Array<string | number | boolean | null>);
      }
    }
  }
  
  // Copy pragma settings
  backupDb.pragma("journal_mode = WAL");
  backupDb.pragma("foreign_keys = ON");
  
  db.close();
  backupDb.close();
  
  console.log(`✅ Backup created: ${backupPath}`);
  return backupPath;
}

export function listBackups(backupDir?: string): string[] {
  const directory = backupDir ?? path.join(rootDir, "backups");
  
  if (!fs.existsSync(directory)) {
    return [];
  }
  
  const files = fs.readdirSync(directory);
  return files.filter((f: string) => f.startsWith("keuangan_backup_")).sort().reverse();
}

export function getLatestBackup(backupDir?: string): string | null {
  const backups = listBackups(backupDir);
  return backups[0] ?? null;
}

// Auto-backup before migration
export function autoBackupBeforeMigration(): string | null {
  const latest = getLatestBackup();
  if (!latest) {
    console.log("🔄 Creating initial backup before migration...");
    return createBackup();
  }
  console.log(`📦 Existing backup found: ${latest}`);
  return null;
}

// CLI usage
if (process.argv[1] === import.meta.filename) {
  const action = process.argv[2];
  
  switch (action) {
    case "backup":
      createBackup();
      break;
    case "list":
      console.log("Backups:");
      listBackups().forEach(b => console.log(`  - ${b}`));
      break;
    case "auto":
      autoBackupBeforeMigration();
      break;
    default:
      console.log("Usage:");
      console.log("  tsx scripts/backup-database.ts backup   - Create new backup");
      console.log("  tsx scripts/backup-database.ts list      - List all backups");
      console.log("  tsx scripts/backup-database.ts auto      - Auto-backup before migration");
  }
}