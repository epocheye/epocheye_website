import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'csv-parse/sync';
import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const ctxDir = path.join(root, 'contexts');

// Load environment variables from .env.local so the service key is available when creating the client.
loadEnv({ path: path.join(root, '.env.local') });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const chunk = (arr, size = 500) => {
  const batches = [];
  for (let i = 0; i < arr.length; i += size) batches.push(arr.slice(i, i + size));
  return batches;
};

const readCsv = (fileName) => {
  const filePath = path.join(ctxDir, fileName);
  const raw = fs.readFileSync(filePath, 'utf8');
  return parse(raw, { columns: true, skip_empty_lines: true, trim: true });
};

const upsertWithChunks = async (table, rows, conflict, batchSize = 500) => {
  for (const batch of chunk(rows, batchSize)) {
    const { error } = await supabaseAdmin.from(table).upsert(batch, { onConflict: conflict });
    if (error) throw new Error(`Failed to upsert into ${table}: ${error.message}`);
  }
};

const loadOrganizations = async () => {
  const siteRows = readCsv('sites.csv');
  const orgIds = Array.from(new Set(siteRows.map((r) => Number(r.org_id || 1))));
  const mapped = orgIds.map((id) => ({ id, name: `Org ${id}` }));
  await upsertWithChunks('organizations', mapped, 'id', 50);
  return mapped.length;
};

const loadSites = async () => {
  const rows = readCsv('sites.csv');
  const mapped = rows.map((r) => ({
    id: Number(r.id),
    org_id: Number(r.org_id || 1),
    name: r.name,
    max_capacity: Number(r.max_capacity) || 0,
    location: r.location || null,
    annual_visitors: r.annual_visitors_lakh
      ? Math.round(Number(r.annual_visitors_lakh) * 100000)
      : null,
  }));
  await upsertWithChunks('sites', mapped, 'id', 100);
  return mapped.length;
};

const loadZones = async () => {
  const rows = readCsv('zones.csv');
  const mapped = rows.map((r) => ({
    id: Number(r.id),
    site_id: Number(r.site_id),
    name: r.name,
    max_capacity: Number(r.max_capacity) || 0,
    zone_type: r.zone_type || null,
    created_at: r.created_at || null,
  }));
  await upsertWithChunks('zones', mapped, 'id', 200);
  return mapped.length;
};

const loadCrowdData = async () => {
  const rows = readCsv('crowd_data_30days_hourly.csv');
  const mapped = rows.map((r) => ({
    id: Number(r.id),
    site_id: Number(r.site_id),
    zone_id: Number(r.zone_id),
    timestamp: r.timestamp,
    count: Number(r.count) || 0,
    density: Number(r.density) || 0,
  }));
  await upsertWithChunks('crowd_data', mapped, 'id', 1000);
  return mapped.length;
};

async function main() {
  console.log('Seeding CSV data into Supabase...');
  const orgs = await loadOrganizations();
  console.log(`Organizations upserted: ${orgs}`);
  const sites = await loadSites();
  console.log(`Sites upserted: ${sites}`);
  const zones = await loadZones();
  console.log(`Zones upserted: ${zones}`);
  const crowd = await loadCrowdData();
  console.log(`Crowd rows upserted: ${crowd}`);
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
