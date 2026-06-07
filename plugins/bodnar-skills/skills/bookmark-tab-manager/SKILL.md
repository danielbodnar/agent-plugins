---
name: bookmark-tab-manager
description: Manage Chrome bookmarks (30k+), tabs, tab groups, and GitHub stars (15k+) through headless Chrome automation via systemd. Handles organization, AI-powered classification (Gemini Nano/Claude), deduplication, and metadata enrichment with performance-optimized operations for large-scale datasets. Use when organizing bookmarks, managing tabs, syncing GitHub stars, or building bookmark/tab management tools.
---

# Bookmark and Tab Manager

Comprehensive Chrome bookmark and tab management system with AI-powered classification, GitHub stars sync, and performance-optimized operations for large datasets (30k+ bookmarks, 15k+ GitHub stars).

## Core Capabilities

1. **Chrome Process Management** - Launch headless Chrome via systemd template service
2. **Bookmark Organization** - Hierarchical classification, tagging, deduplication
3. **Tab Management** - Group organization, saved tab groups management
4. **GitHub Stars Sync** - Classify and organize 15k+ starred repositories
5. **AI Classification** - Hybrid Gemini Nano + Claude for intelligent categorization
6. **Performance Optimization** - Batched operations, external indexing, caching strategies

## Quick Start

### Essential Setup

1. **Initialize project:**
```bash
bun init
bun add @playwright/mcp playwright zod @evan/duckdb
bun add -d @types/node typescript @biomejs/biome
bun add @mozilla/readability unified rehype-parse remark-parse jsdom
bunx oxlint@latest --init
bunx @biomejs/biome init
```

2. **Create systemd service:** See `scripts/chrome-headless-template.service`

3. **Configure runtime:** See `references/configuration-schema.md` for complete Zod schema

### Core Workflows

**Organize bookmarks:**
```typescript
import { BookmarkManager } from './src/bookmark-manager';
const manager = new BookmarkManager({ profile: 'Default' });
await manager.organize({ strategy: 'ai-classify', batchSize: 100 });
```

**Sync GitHub stars:**
```typescript
import { GitHubStarSync } from './src/github-sync';
const sync = new GitHubStarSync({ token: process.env.GITHUB_TOKEN });
await sync.syncStars({ classify: true });
```

**Manage tabs:**
```typescript
import { TabManager } from './src/tab-manager';
const tabs = new TabManager();
await tabs.groupByDomain();
```

## Architecture Overview

### Technology Stack
- **Runtime:** Bun v1.3+, TypeScript 5.9+
- **Browser Automation:** Playwright with @playwright/mcp
- **Process Management:** systemd v258
- **Indexing:** DuckDB (primary), TypeSense (search), SQLite (cache)
- **Content Processing:** Readability.js, unified.js ecosystem
- **Validation:** Zod schemas, oxlint
- **Link Checking:** lychee

### Performance Strategy
For 30k+ bookmarks, performance is critical:
- **External indexing** (DuckDB) - Avoid Chrome API bottlenecks
- **Batch operations** - 100-5000 items per batch with delays
- **Read-once pattern** - Single initial sync, accumulate changes
- **Commit strategy** - Single batch write at end
- **Classification cache** - 30-day TTL for AI results

## Progressive Disclosure

This skill uses progressive disclosure to manage context efficiently:

### Core References (Load as needed)

**API Documentation:**
- `references/webextensions-api.md` - Bookmarks, Tabs, TabGroups APIs
- `references/chrome-devtools-protocol.md` - CDP for advanced control
- `references/github-api.md` - REST v3 & GraphQL v4 for stars sync
- `references/firefox-places.md` - SQLite schema for cross-browser import

**Configuration & Schemas:**
- `references/configuration-schema.md` - Complete Zod configuration schema
- `references/metadata-standards.md` - Open Graph, JSON-LD, Schema.org
- `references/bookmark-formats.md` - Netscape format, JSONL

**Implementation Guides:**
- `references/performance-optimization.md` - Batching, indexing, caching strategies
- `references/ai-classification.md` - Gemini Nano + Claude hybrid approach
- `references/deduplication.md` - Non-destructive duplicate handling

**Development Resources:**
- `references/typescript-patterns.md` - Bun-specific patterns, async/await
- `references/systemd-integration.md` - Service templates, environment handling
- `references/testing-validation.md` - oxlint, Zod, integration tests

### Scripts

**System Integration:**
- `scripts/chrome-headless-template.service` - systemd template service
- `scripts/setup-systemd.sh` - Install and enable Chrome service
- `scripts/profile-discovery.sh` - Auto-discover Chrome profiles

**TypeScript Boilerplate:**
- `scripts/bookmark-manager-template.ts` - Bookmark operations structure
- `scripts/classification-pipeline.ts` - AI classification workflow
- `scripts/github-sync-template.ts` - GitHub stars sync structure

**Utilities:**
- `scripts/batch-processor.ts` - Generic batching with progress
- `scripts/cache-manager.ts` - Classification cache with TTL
- `scripts/duckdb-index.ts` - External index initialization

### Assets

**Configuration Templates:**
- `assets/default-config.json` - Sane defaults for 30k+ bookmarks
- `assets/taxonomy-example.json` - Example category structure
- `assets/tsconfig.json` - TypeScript configuration
- `assets/biome.json` - Biome formatter config

**Schema Definitions:**
- `assets/bookmark-schema.zod.ts` - Zod bookmark type
- `assets/github-star-schema.zod.ts` - Zod GitHub star type
- `assets/classification-schema.zod.ts` - AI classification result

## Usage Guidelines

### When to Load References

**Always load first:**
- `references/configuration-schema.md` - For any config-related work
- `references/performance-optimization.md` - Before implementing operations

**Load for specific tasks:**
- Chrome automation → `references/webextensions-api.md`, `references/chrome-devtools-protocol.md`
- GitHub sync → `references/github-api.md`
- Metadata enrichment → `references/metadata-standards.md`
- Cross-browser import → `references/firefox-places.md`, `references/bookmark-formats.md`
- AI classification → `references/ai-classification.md`
- Deduplication → `references/deduplication.md`

### Development Workflow

1. **Read configuration schema** - Understand runtime config structure
2. **Review performance guide** - Critical for 30k+ dataset operations
3. **Select appropriate scripts** - Use templates as starting points
4. **Load relevant API references** - Only what's needed for current task
5. **Implement with Zod validation** - Runtime type safety throughout
6. **Test with batching** - Always use batch operations for large datasets

## Key Design Decisions

### Playwright over Puppeteer/Selenium
- Modern TypeScript-first API
- Official @playwright/mcp server
- CDP under the hood + WebDriver BiDi emerging
- Better balance of DX and performance

### DuckDB for External Indexing
- In-process analytical database
- Fast aggregations for 30k+ records
- Low memory footprint
- Parquet export for persistence
- Avoids Chrome Bookmarks API bottlenecks

### Hybrid AI Classification
- Gemini Nano: Fast, free, on-device for bulk
- Claude: Complex cases + confidence boost
- Configurable threshold (default 0.7)
- 30-day classification cache

### Non-Destructive Deduplication
- Create "Duplicates" subfolder
- Move all duplicate instances there
- User reviews and manually deletes
- Preserves all bookmarks for safety

## Critical Performance Patterns

### Batch Operations Template
```typescript
async function batchOperation<T>(
  items: T[],
  processor: (batch: T[]) => Promise<void>,
  options: { batchSize: number; delayMs: number }
) {
  for (let i = 0; i < items.length; i += options.batchSize) {
    const batch = items.slice(i, i + options.batchSize);
    await processor(batch);
    await new Promise(resolve => setTimeout(resolve, options.delayMs));
    console.log(`Progress: ${i + batch.length}/${items.length}`);
  }
}
```

### Read-Once Pattern
```typescript
// Good: Single read, accumulate changes, single write
const bookmarks = await chrome.bookmarks.getTree();
const changes = await processInMemory(bookmarks);
await chrome.bookmarks.applyBatch(changes);

// Bad: Multiple reads/writes in loop
for (const bookmark of bookmarks) {
  await chrome.bookmarks.update(bookmark.id, changes);
}
```

### External Index Pattern
```typescript
import duckdb from '@evan/duckdb';

// Initialize index once
const db = duckdb.Database.create(':memory:');
await db.exec('CREATE TABLE bookmarks AS SELECT * FROM read_json_auto(?)');

// Query against index
const results = await db.all('SELECT * FROM bookmarks WHERE url LIKE ?');

// Sync back to Chrome once
await chrome.bookmarks.applyBatch(results);
```

## Environment Variables

```bash
# Required
GITHUB_TOKEN=ghp_xxx                    # GitHub PAT for stars sync

# Optional
CHROME_PROFILE=Default                   # Chrome profile name
CHROME_USER_DATA_DIR=~/.config/google-chrome  # Chrome user data
GEMINI_API_KEY=xxx                      # For Gemini classification
ANTHROPIC_API_KEY=xxx                   # For Claude classification
CONFIG_PATH=~/.config/bookmark-manager/config.json
```

## Common Patterns

### Profile Discovery
```bash
# Auto-discover profiles
./scripts/profile-discovery.sh

# Or specify explicitly
export CHROME_PROFILE="Profile 1"
```

### systemd Service Management
```bash
# Enable service for specific profile
systemctl --user enable --now chrome-headless@Default.service

# Check status
systemctl --user status chrome-headless@Default.service

# View logs
journalctl --user -u chrome-headless@Default.service -f
```

### Classification with Fallback
```typescript
import { classify } from './src/classifier';

const result = await classify(bookmark, {
  provider: 'hybrid',
  confidenceThreshold: 0.7,
  fallbackToCloud: true
});
```

## Validation & Quality

- **Linting:** `bunx oxlint --fix .`
- **Formatting:** `bunx @biomejs/biome format --write .`
- **Type checking:** `bun run tsc --noEmit`
- **Link validation:** `lychee --cache bookmarks.html`

## Troubleshooting

### Chrome won't start headless
- Check `~/.config/systemd/user/chrome-headless@.service`
- Verify `CHROME_USER_DATA_DIR` path exists
- Check logs: `journalctl --user -u chrome-headless@Default.service`

### Slow performance with 30k+ bookmarks
- Ensure external indexing is enabled (DuckDB)
- Increase batch size: `performance.batch_size: 500`
- Reduce concurrent operations: `max_concurrent_operations: 3`
- Check classification cache hit rate

### GitHub API rate limiting
- Use GraphQL API for bulk operations (see `references/github-api.md`)
- Implement exponential backoff
- Cache star metadata locally

### Classification quality issues
- Adjust `confidence_threshold` (lower = more Claude escalation)
- Review taxonomy structure in config
- Check classification cache staleness (default 30 days)

## Next Steps

1. Review `references/configuration-schema.md` for complete config options
2. Read `references/performance-optimization.md` for large dataset handling
3. Examine scripts in `scripts/` directory for implementation patterns
4. Test with small bookmark subset before processing 30k+ dataset
