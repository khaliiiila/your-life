import Database from "better-sqlite3";
import path from "node:path";
import { Pool } from "pg";

const sourcePath=process.env.SQLITE_DATABASE_PATH??path.join(process.cwd(),"data","keuangan.db");
const sqlite=new Database(sourcePath,{readonly:true});
const pg=new Pool({connectionString:process.env.DATABASE_URL??"postgresql://your_life:your_life@127.0.0.1:15433/your_life"});
const tables=["wallets","assets","upcoming_expenses","transactions","transfers","debts","debt_payments","wishlists"];
const walletTypes:Record<string,string>={wallet:"cash",other:"cash",cash:"cash",bank:"bank",ewallet:"ewallet",credit:"credit"};

async function run(){const client=await pg.connect();try{await client.query("BEGIN");for(const table of tables){const exists=sqlite.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table);if(!exists)continue;const rows=sqlite.prepare(`SELECT * FROM "${table}"`).all() as Record<string,unknown>[];for(const source of rows){const row={...source};if(table==="wallets")row.type=walletTypes[String(row.type)]??"cash";for(const column of ["created_at","updated_at"])if(column in row&&!row[column])row[column]=new Date().toISOString();const columns=Object.keys(row);const values=columns.map(column=>row[column]);const names=columns.map(column=>`"${column}"`).join(",");const placeholders=columns.map((_,index)=>`$${index+1}`).join(",");await client.query(`INSERT INTO "${table}" (${names}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,values);}const imported=Number((await client.query(`SELECT COUNT(*) total FROM "${table}"`)).rows[0].total);if(imported!==rows.length)throw new Error(`${table}: SQLite ${rows.length}, PostgreSQL ${imported}`);console.log(`${table}: ${imported}`);}await client.query("COMMIT");}catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();sqlite.close();await pg.end();}}
run().catch(error=>{console.error(error);process.exitCode=1;});
