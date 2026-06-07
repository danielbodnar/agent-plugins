#!/usr/bin/env bun
/**
 * Usage: bun scripts/opt-out-check.ts <apex_domain>
 *
 * Exits 0 if the domain is safe to contact (no opt-out row).
 * Exits 1 if the domain is on the opt-out list (ABORT).
 * Exits 2 on any other error.
 *
 * Uses wrangler to query D1 rather than invoking the Cloudflare API
 * directly, so this runs anywhere a developer has wrangler set up.
 */

import { $ } from "bun";

const apex = Bun.argv[2];
if (!apex) {
  console.error("Usage: bun scripts/opt-out-check.ts <apex_domain>");
  process.exit(2);
}

const sql = `SELECT email, domain, deleted_at, source FROM opt_outs WHERE domain = '${apex.replace(/'/g, "''")}'`;

try {
  const result = await $`wrangler d1 execute outreach --remote --command=${sql} --json`.quiet();
  const parsed = JSON.parse(result.stdout.toString());
  const rows = parsed[0]?.results ?? [];

  if (rows.length === 0) {
    console.log(`No opt-out record for ${apex}. Safe to contact.`);
    process.exit(0);
  }

  console.error(`OPT-OUT MATCH for ${apex}:`);
  for (const row of rows) {
    console.error(
      `  email=${row.email} source=${row.source} deleted_at=${row.deleted_at} notes=${row.notes ?? "-"}`,
    );
  }
  console.error("ABORT: this domain is on the opt-out list.");
  process.exit(1);
} catch (err) {
  console.error("Opt-out check failed:", err);
  process.exit(2);
}
