import "server-only";

import { neon } from "@neondatabase/serverless";

let cachedSql = null;

export function getHeritageSql() {
  if (cachedSql) return cachedSql;

  const connectionString = process.env.HERITAGE_DB_URL;
  if (!connectionString) {
    throw new Error("Missing HERITAGE_DB_URL env var — set it to the Go backend's NEON_DB_URL");
  }

  cachedSql = neon(connectionString);
  return cachedSql;
}
