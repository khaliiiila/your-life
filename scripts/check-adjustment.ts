import assert from "node:assert/strict";
import { db } from "../lib/db";
import { getWallet } from "../lib/wallets";
import { getAdjustmentAnalysis, recordAdjustment } from "../lib/adjustments";

async function run() {
  const wallet = (await db.query("SELECT id FROM wallets ORDER BY created_at LIMIT 1")).rows[0] as { id: string };
  assert(wallet, "At least one wallet required");
  const before = await getWallet(wallet.id);
  assert(before, "Wallet must exist");
  const real = before.balance + 125000;
  const result = await recordAdjustment({ walletId: wallet.id, realBalance: real });
  assert.equal(result.difference, 125000, "difference must match real - recorded");
  assert.equal(result.balance, real, "balance must equal real after adjustment");
  const after = await getWallet(wallet.id);
  assert.equal(after!.balance, real, "recorded balance must be updated");
  const rows = await getAdjustmentAnalysis(wallet.id, 1);
  const current = new Date().toISOString().slice(0, 7);
  const row = rows.find((r) => r.month === current);
  assert(row, "analysis must contain current month");
  assert.equal(row.netAdjustment, 125000);
  assert.equal(row.absAdjustment, 125000);
  assert.equal(row.count, 1);
  assert.equal(row.errorRate, row.volume > 0 ? (125000 / row.volume) * 100 : 0);
  const cleaned = (await db.query("DELETE FROM transactions WHERE id=$1", [result.id])).rowCount;
  assert.equal(cleaned, 1, "cleanup must remove the test adjustment");
  console.log("Adjustment check passed.");
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.end());
