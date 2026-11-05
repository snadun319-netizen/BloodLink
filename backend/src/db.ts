import { Pool, types } from "pg";
import dotenv from "dotenv";
dotenv.config();
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
// Calendar dates must not shift with the server's timezone.
types.setTypeParser(1082, value => value);

export function createPool(connectionString: string) { return new Pool({
  connectionString,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  max: 10,
  options: "-c timezone=UTC -c statement_timeout=15000 -c idle_in_transaction_session_timeout=60000",
}); }
export const pool = createPool(process.env.DATABASE_URL);
pool.on("error", () => { console.error("Unexpected database connection error"); });
