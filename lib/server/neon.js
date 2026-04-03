import "server-only";

import { neon } from "@neondatabase/serverless";

let cachedSql = null;

export function getSql() {
  if (cachedSql) return cachedSql;

  const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
  if (!connectionString) {
    throw new Error("Missing DATABASE_URL or NEON_DATABASE_URL env var");
  }

  cachedSql = neon(connectionString);
  return cachedSql;
}
