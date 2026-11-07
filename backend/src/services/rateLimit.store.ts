import crypto from 'node:crypto';
import { Store, Options } from 'express-rate-limit';
import { pool } from '../db';

// All API instances share atomic counters. No raw client IPs are stored.
export class PostgresRateLimitStore implements Store {
  private windowMs = 60000;
  readonly localKeys = false;
  readonly prefix: string;
  constructor(private readonly scope: string) { this.prefix = `rate-limit:${scope}:`; }
  init(options: Options) { this.windowMs = options.windowMs; }
  private key(key: string) {
    if (!process.env.JWT_ACCESS_SECRET) throw new Error('JWT_ACCESS_SECRET is required for rate-limit key hashing');
    return crypto.createHmac('sha256', process.env.JWT_ACCESS_SECRET).update(`rate-limit:${this.scope}:${key}`).digest('hex');
  }
  async increment(key: string) {
    const row = (await pool.query(`INSERT INTO rate_limit_counters(key_hash, total_hits, reset_time)
      VALUES ($1, 1, NOW() + ($2::integer * INTERVAL '1 millisecond'))
      ON CONFLICT (key_hash) DO UPDATE SET
        total_hits = CASE WHEN rate_limit_counters.reset_time <= NOW() THEN 1 ELSE rate_limit_counters.total_hits + 1 END,
        reset_time = CASE WHEN rate_limit_counters.reset_time <= NOW() THEN NOW() + ($2::integer * INTERVAL '1 millisecond') ELSE rate_limit_counters.reset_time END
      RETURNING total_hits, reset_time`, [this.key(key), this.windowMs])).rows[0];
    return { totalHits: row.total_hits, resetTime: row.reset_time as Date };
  }
  async decrement(key: string) { await pool.query('UPDATE rate_limit_counters SET total_hits = GREATEST(total_hits - 1, 0) WHERE key_hash = $1', [this.key(key)]); }
  async resetKey(key: string) { await pool.query('DELETE FROM rate_limit_counters WHERE key_hash = $1', [this.key(key)]); }
}
