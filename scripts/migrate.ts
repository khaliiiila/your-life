import { autoBackupBeforeMigration } from "./backup-database";
import "../lib/db";

// Auto backup before migration
const latestBackup = autoBackupBeforeMigration();

if (!latestBackup) {
  console.log("🔄 New database created (no existing schema).");
} else {
  console.log(`✅ Database migrations applied.`);
}
