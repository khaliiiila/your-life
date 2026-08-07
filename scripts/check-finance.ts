import assert from "node:assert/strict";
import { db } from "../lib/db";
import { getDashboardData } from "../lib/dashboard";

const before = getDashboardData();
const createdAt = new Date().toISOString();
const source = before.wallets[0];
const destination = before.wallets[1];
const testId = `check_${Date.now()}`;

db.transaction(() => {
  db.prepare("INSERT INTO transactions (id, type, wallet_id, amount, category, description, date, created_at) VALUES (?, 'expense', ?, 1000, 'transfer', 'check', date('now'), ?)").run(`${testId}_out`, source.id, createdAt);
  db.prepare("INSERT INTO transactions (id, type, wallet_id, amount, category, description, date, created_at) VALUES (?, 'income', ?, 1000, 'transfer', 'check', date('now'), ?)").run(`${testId}_in`, destination.id, createdAt);
  const after = getDashboardData();
  assert.deepEqual(after.flow, before.flow, "Transfer must not change cash flow");
  assert.equal(after.totalBalance, before.totalBalance, "Transfer must preserve total wallet balance");
  db.prepare("DELETE FROM transactions WHERE id IN (?, ?)").run(`${testId}_out`, `${testId}_in`);
})();

assert.equal(before.netWorth, before.totalBalance + before.investments.value + before.debts.receivable - before.debts.owed);
console.log("Financial regression check passed.");
