import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  max: 10,
  options: "-c timezone=UTC -c statement_timeout=15000 -c idle_in_transaction_session_timeout=60000",
});
pool.on("error", () => { console.error("Unexpected database connection error"); });
