import fs from "fs";
import path from "path";
import crypto from "crypto";
import { pool } from "./db";
import { transaction } from "./transaction";

export async function runMigrations(initialize = false): Promise<void> {
  await transaction(async client => {
    await client.query("SELECT pg_advisory_xact_lock(178442361)");
    if (initialize) {
      const existing = await client.query("SELECT to_regclass('users') AS users, to_regclass('organizations') AS organizations");
      if (existing.rows[0].users || existing.rows[0].organizations) throw new Error("Database already initialized; run migrate instead");
      await client.query(fs.readFileSync(path.resolve(__dirname, "../../database/schema.sql"), "utf8"));
    }
    await client.query("CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
    const directory = path.resolve(__dirname, "../../database");
    for (const name of fs.readdirSync(directory).filter(name => /^migration_\d+.*\.sql$/.test(name)).sort()) {
      const sql = fs.readFileSync(path.join(directory, name), "utf8");
      const hash = (value: string) => crypto.createHash("sha256").update(value).digest("hex");
      // Git can check out SQL with LF or CRLF. Preserve checks against actual SQL changes.
      const normalized = sql.replace(/\r\n/g, "\n");
      const checksum = hash(normalized);
      const previous = (await client.query("SELECT checksum FROM schema_migrations WHERE name = $1", [name])).rows[0];
      if (previous) {
        if (![checksum, hash(sql), hash(normalized.replace(/\n/g, "\r\n"))].includes(previous.checksum)) throw new Error("Applied migration changed: " + name);
        continue;
      }
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)", [name, checksum]);
      console.log("Applied " + name);
    }
  });
}
if (require.main === module) {
  runMigrations(process.argv.includes("--init")).catch(error => {
    console.error("Migration failed:", error.code || error.message);
    process.exitCode = 1;
  }).finally(() => pool.end());
}
