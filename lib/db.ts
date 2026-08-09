import { Pool, type PoolClient, type QueryResultRow } from "pg";

const connectionString = process.env.DATABASE_URL ?? "postgresql://your_life:your_life@127.0.0.1:15433/your_life";
const globalWithDb = globalThis as typeof globalThis & { financePool?: Pool };

export const db = globalWithDb.financePool ?? new Pool({ connectionString });
if (process.env.NODE_ENV !== "production") globalWithDb.financePool = db;

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, values: unknown[] = []) {
  return db.query<T>(text, values);
}

export async function transaction<T>(run: (client: PoolClient) => Promise<T>) {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const result = await run(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export function nowIso() {
  return new Date().toISOString();
}

export function numbers<T extends Record<string, unknown>>(row: T, keys: string[]): T {
  const mutable = row as Record<string, unknown>;
  for (const key of keys) if (mutable[key] !== null && mutable[key] !== undefined) mutable[key] = Number(mutable[key]);
  return row;
}
