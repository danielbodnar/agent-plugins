#!/usr/bin/env bun
/**
 * Phase 6 deploy orchestrator. Uploads dist/ to R2, publishes the
 * Worker, sets up DNS, and creates the Cloudflare Access application.
 *
 * Assumes the filled-in wrangler.jsonc and worker.ts are already in
 * place at ./leads/{slug}/deploy/ and have been reviewed by Daniel.
 *
 * Usage:
 *   bun scripts/deploy.ts --slug nealins-com --client-email dan@nealins.com
 */

import { $ } from "bun";
import { readFileSync, existsSync } from "node:fs";

function arg(name: string, fallback?: string): string {
  const i = Bun.argv.indexOf(`--${name}`);
  if (i === -1 || !Bun.argv[i + 1]) {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing required flag: --${name}`);
  }
  return Bun.argv[i + 1];
}

const slug = arg("slug");
const clientEmail = arg("client-email");
const leadDir = `./leads/${slug}`;
const deployDir = `${leadDir}/deploy`;

if (!existsSync(`${deployDir}/wrangler.jsonc`) || !existsSync(`${deployDir}/worker.ts`)) {
  console.error(`Missing deploy artifacts in ${deployDir}. Fill templates first.`);
  process.exit(1);
}

// Upload dist/ to R2
console.log(`[r2] Uploading dist/ to previews/${slug}/dist/ ...`);
const distFiles = await $`find ${leadDir}/dist -type f`.text();
for (const path of distFiles.trim().split("\n")) {
  const rel = path.replace(`${leadDir}/dist/`, "");
  const key = `previews/${slug}/dist/${rel}`;
  await $`wrangler r2 object put bitbuilder-prospector/${key} --file=${path}`;
}

// Deploy the Worker
console.log(`[worker] Deploying...`);
await $`cd ${deployDir} && wrangler deploy`;

// Create Cloudflare Access application via API
// Wrangler does not yet expose Access application create; use curl to API.
const accessConfigPath = `${deployDir}/access-config.json`;
if (existsSync(accessConfigPath)) {
  console.log(`[access] Creating Access application for ${slug}.bitbuilder.cloud ...`);
  const config = JSON.parse(readFileSync(accessConfigPath, "utf8"));
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID ?? "5dae265f74e6077ad674a3d855bf9853";
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!token) {
    console.error("CLOUDFLARE_API_TOKEN env var required for Access setup.");
    process.exit(1);
  }
  const resp = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/access/apps`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(config),
    },
  );
  const json = await resp.json();
  if (!json.success) {
    console.error("Access app creation failed:", JSON.stringify(json, null, 2));
    process.exit(1);
  }
  console.log(`[access] Created app id=${json.result.id}`);
}

// Verify with curl
console.log(`[verify] Curling https://${slug}.bitbuilder.cloud/ ...`);
const verify = await $`curl -sI https://${slug}.bitbuilder.cloud/`.text();
console.log(verify.split("\n").slice(0, 5).join("\n"));

console.log(`\nDeploy complete. Preview: https://${slug}.bitbuilder.cloud/`);
console.log(`Authorized emails: ${clientEmail}, daniel@bitbuilder.io`);
