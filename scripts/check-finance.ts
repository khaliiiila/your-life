import assert from "node:assert/strict";
import { db } from "../lib/db";
import { getDashboardData } from "../lib/dashboard";

async function run(){const before=await getDashboardData();const source=before.wallets[0],destination=before.wallets[1];assert(source&&destination,"At least two wallets required");const client=await db.connect();try{await client.query("BEGIN");const id=`check_${Date.now()}`;await client.query("INSERT INTO transactions (id,type,wallet_id,amount,category,description,date) VALUES ($1,'expense',$2,1000,'transfer','check',CURRENT_DATE),($3,'income',$4,1000,'transfer','check',CURRENT_DATE)",[`${id}_out`,source.id,`${id}_in`,destination.id]);const after=await getDashboardData();assert.deepEqual(after.flow,before.flow);assert.equal(after.totalBalance,before.totalBalance);assert.equal(before.netWorth,before.totalBalance+Number(before.investments.value)+Number(before.debts.receivable)-Number(before.debts.owed));console.log("Financial regression check passed.");}finally{await client.query("ROLLBACK");client.release();await db.end();}}
run().catch(error=>{console.error(error);process.exitCode=1;});
