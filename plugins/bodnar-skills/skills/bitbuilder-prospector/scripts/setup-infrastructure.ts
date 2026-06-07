#!/usr/bin/env bun
/**
 * Idempotently provisions the shared infrastructure:
 *   - R2 bucket: bitbuilder-prospector
 *   - D1 database: outreach
 *   - Tables: opt_outs, leads, events (with indexes)
 *
 * Safe to run multiple times. Uses wrangler.
 *
 * Usage: bun scripts/setup-infrastructure.ts
 */

import { $ } from "bun";

const BUCKET = "bitbuilder-prospector";
const DB = "outreach";

const DDL = `
CREATE TABLE IF NOT EXISTS opt_outs (
  email TEXT PRIMARY KEY,
  domain TEXT NOT NULL,
  source TEXT NOT NULL,
  deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_opt_outs_domain ON opt_outs(domain);

CREATE TABLE IF NOT EXISTS leads (
  slug TEXT PRIMARY KEY,
  domain TEXT NOT NULL,
  business_name TEXT,
  client_email TEXT,
  lead_source TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  state TEXT NOT NULL DEFAULT 'pending',
  state_changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  purchase_link_url TEXT,
  schedule_link_url TEXT,
  total_dwell_ms INTEGER DEFAULT 0,
  max_scroll_pct INTEGER DEFAULT 0,
  review_confirmed_at DATETIME,
  purchased_at DATETIME,
  scheduled_at DATETIME,
  extended_until DATETIME,
  soft_deleted_at DATETIME,
  archived_at DATETIME,
  hard_deleted_at DATETIME
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_json TEXT,
  ts DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_events_slug ON events(slug);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
`;

async function ensureR2() {
  console.log(`[r2] Ensuring bucket '${BUCKET}' exists...`);
  try {
    const result = await $`wrangler r2 bucket list --json`.quiet();
    const buckets = JSON.parse(result.stdout.toString());
    const exists = buckets.some((b: { name: string }) => b.name === BUCKET);
    if (exists) {
      console.log(`[r2] Bucket '${BUCKET}' already exists.`);
      return;
    }
  } catch {
    // fall through to create
  }
  await $`wrangler r2 bucket create ${BUCKET}`;
  console.log(`[r2] Created bucket '${BUCKET}'.`);
}

async function ensureD1() {
  console.log(`[d1] Ensuring database '${DB}' exists...`);
  try {
    const result = await $`wrangler d1 list --json`.quiet();
    const dbs = JSON.parse(result.stdout.toString());
    const exists = dbs.some((d: { name: string }) => d.name === DB);
    if (!exists) {
      await $`wrangler d1 create ${DB}`;
      console.log(`[d1] Created database '${DB}'.`);
    } else {
      console.log(`[d1] Database '${DB}' already exists.`);
    }
  } catch (err) {
    console.error(`[d1] Failed to list/create database:`, err);
    process.exit(1);
  }

  console.log(`[d1] Applying schema...`);
  const tmp = `/tmp/bitbuilder-schema-${Date.now()}.sql`;
  await Bun.write(tmp, DDL);
  await $`wrangler d1 execute ${DB} --remote --file=${tmp}`;
  console.log(`[d1] Schema applied.`);
}

await ensureR2();
await ensureD1();
console.log("\nInfrastructure ready.");
