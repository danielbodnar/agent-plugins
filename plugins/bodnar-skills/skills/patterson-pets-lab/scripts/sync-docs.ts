#!/usr/bin/env bun
// sync-docs -- refresh the reference material from canonical upstream sources.
//
// The references/ summaries are a snapshot. This script re-fetches the live docs
// so a summary can be checked against, or regenerated from, the source of truth.
// It writes raw fetched copies under references/.cache/ and never overwrites the
// curated summaries directly; reconciling the two is a human judgment call.

import { join } from "node:path";
import { writeFile } from "./lib/fs.ts";
import { log } from "./lib/log.ts";

interface Source {
  slug: string;
  url: string;
}

const SOURCES: Source[] = [
  { slug: "agentskills-spec", url: "https://agentskills.io/specification" },
  { slug: "skill-best-practices", url: "https://agentskills.io/skill-creation/best-practices" },
  { slug: "evaluating-skills", url: "https://agentskills.io/skill-creation/evaluating-skills" },
  { slug: "cc-skills", url: "https://code.claude.com/docs/en/skills" },
  { slug: "cc-subagents", url: "https://code.claude.com/docs/en/sub-agents" },
  { slug: "cc-memory", url: "https://code.claude.com/docs/en/memory" },
  { slug: "cc-hooks", url: "https://code.claude.com/docs/en/hooks" },
  { slug: "cc-plugins", url: "https://code.claude.com/docs/en/plugins" },
];

const cacheDir = join(process.cwd(), "references", ".cache");

for (const source of SOURCES) {
  log.step(`fetching ${source.url}`);
  try {
    const res = await fetch(source.url, { headers: { "user-agent": "patterson-pets-lab/sync-docs" } });
    if (!res.ok) {
      log.warn(`${source.slug}: HTTP ${res.status}`);
      continue;
    }
    await writeFile(join(cacheDir, `${source.slug}.html`), await res.text(), true);
  } catch (err) {
    log.warn(`${source.slug}: ${(err as Error).message}`);
  }
}

log.ok(`synced ${SOURCES.length} sources into ${cacheDir}. Reconcile changes into the curated references by hand.`);
