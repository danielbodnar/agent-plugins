# Configuration Schema

Complete Zod schema for runtime configuration with sane defaults for 30k+ bookmark datasets.

## Configuration File Location

**Default:** `~/.config/bookmark-manager/config.json`  
**Override:** `CONFIG_PATH` environment variable or `--config` CLI argument

## Complete Zod Schema

```typescript
import { z } from 'zod';

export const ConfigSchema = z.object({
  // === Taxonomy Structure ===
  taxonomy: z.object({
    categories: z.array(z.object({
      name: z.string().min(1).max(100),
      description: z.string().optional(),
      keywords: z.array(z.string()).default([]),
      patterns: z.array(z.string()).optional(), // URL regex patterns
      subcategories: z.array(z.string()).optional(),
      color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(), // Chrome folder color
      icon: z.string().optional(),
    })),
    defaultCategory: z.string().default('Uncategorized'),
    autoClassify: z.boolean().default(true),
    preserveExisting: z.boolean().default(true), // Keep existing folder structure
  }).default({
    categories: [],
    defaultCategory: 'Uncategorized',
    autoClassify: true,
    preserveExisting: true,
  }),

  // === AI Classification Settings ===
  classification: z.object({
    provider: z.enum(['gemini', 'claude', 'hybrid']).default('hybrid'),
    confidence_threshold: z.number().min(0).max(1).default(0.7),
    batch_size: z.number().int().positive().default(50),
    cache_duration_days: z.number().int().positive().default(30),
    retry_failed: z.boolean().default(true),
    max_retries: z.number().int().positive().default(3),
    gemini_model: z.string().default('gemini-nano'),
    claude_model: z.string().default('claude-sonnet-4-20250514'),
  }).default({
    provider: 'hybrid',
    confidence_threshold: 0.7,
    batch_size: 50,
    cache_duration_days: 30,
    retry_failed: true,
    max_retries: 3,
    gemini_model: 'gemini-nano',
    claude_model: 'claude-sonnet-4-20250514',
  }),

  // === Deduplication Settings ===
  deduplication: z.object({
    strategy: z.enum(['url', 'content', 'semantic']).default('url'),
    duplicates_folder_name: z.string().default('Duplicates'),
    auto_group: z.boolean().default(true),
    similarity_threshold: z.number().min(0).max(1).default(0.9),
    preserve_newest: z.boolean().default(true), // Keep newest, move older to Duplicates
    hash_algorithm: z.enum(['md5', 'sha256']).default('sha256'),
  }).default({
    strategy: 'url',
    duplicates_folder_name: 'Duplicates',
    auto_group: true,
    similarity_threshold: 0.9,
    preserve_newest: true,
    hash_algorithm: 'sha256',
  }),

  // === Performance Settings (CRITICAL for 30k+ bookmarks) ===
  performance: z.object({
    external_index: z.enum(['duckdb', 'typesense', 'sqlite', 'none']).default('duckdb'),
    batch_size: z.number().int().positive().default(100),
    batch_delay_ms: z.number().int().nonnegative().default(100),
    max_concurrent_operations: z.number().int().positive().default(5),
    read_only_index: z.boolean().default(true), // Don't write until commit
    lazy_load: z.boolean().default(true),
    memory_limit_mb: z.number().int().positive().default(512),
    enable_progress_bar: z.boolean().default(true),
  }).default({
    external_index: 'duckdb',
    batch_size: 100,
    batch_delay_ms: 100,
    max_concurrent_operations: 5,
    read_only_index: true,
    lazy_load: true,
    memory_limit_mb: 512,
    enable_progress_bar: true,
  }),

  // === Chrome Profile Settings ===
  chrome: z.object({
    profile_name: z.string().default('Default'),
    headless: z.boolean().default(true),
    debugging_port: z.number().int().min(1024).max(65535).default(9222),
    user_data_dir: z.string().optional(),
    chrome_path: z.string().optional(),
    launch_flags: z.array(z.string()).default([
      '--disable-dev-shm-usage',
      '--disable-software-rasterizer',
      '--disable-extensions',
      '--disk-cache-size=1',
      '--media-cache-size=1',
      '--no-first-run',
      '--no-default-browser-check',
    ]),
  }).default({
    profile_name: 'Default',
    headless: true,
    debugging_port: 9222,
    launch_flags: [
      '--disable-dev-shm-usage',
      '--disable-software-rasterizer',
      '--disable-extensions',
      '--disk-cache-size=1',
      '--media-cache-size=1',
      '--no-first-run',
      '--no-default-browser-check',
    ],
  }),

  // === systemd Service Settings ===
  systemd: z.object({
    auto_start: z.boolean().default(false),
    restart_on_failure: z.boolean().default(true),
    restart_delay_sec: z.number().int().positive().default(10),
    io_scheduling_class: z.enum(['realtime', 'best-effort', 'idle']).default('best-effort'),
    io_scheduling_priority: z.number().int().min(0).max(7).default(4),
    cpu_weight: z.number().int().min(1).max(10000).default(100),
    memory_high: z.string().default('80%'),
    memory_max: z.string().default('90%'),
  }).default({
    auto_start: false,
    restart_on_failure: true,
    restart_delay_sec: 10,
    io_scheduling_class: 'best-effort',
    io_scheduling_priority: 4,
    cpu_weight: 100,
    memory_high: '80%',
    memory_max: '90%',
  }),

  // === GitHub Stars Settings ===
  github: z.object({
    enabled: z.boolean().default(false),
    sync_interval_hours: z.number().int().positive().default(24),
    classify_new_stars: z.boolean().default(true),
    merge_with_bookmarks: z.boolean().default(true),
    dedupe_against_bookmarks: z.boolean().default(true),
  }).default({
    enabled: false,
    sync_interval_hours: 24,
    classify_new_stars: true,
    merge_with_bookmarks: true,
    dedupe_against_bookmarks: true,
  }),

  // === Metadata Enrichment ===
  metadata: z.object({
    fetch_open_graph: z.boolean().default(true),
    fetch_json_ld: z.boolean().default(true),
    extract_article_content: z.boolean().default(false), // Slow for 30k+
    cache_duration_days: z.number().int().positive().default(90),
    timeout_ms: z.number().int().positive().default(5000),
    max_concurrent_fetches: z.number().int().positive().default(10),
  }).default({
    fetch_open_graph: true,
    fetch_json_ld: true,
    extract_article_content: false,
    cache_duration_days: 90,
    timeout_ms: 5000,
    max_concurrent_fetches: 10,
  }),

  // === Caching Settings ===
  cache: z.object({
    directory: z.string().default('~/.cache/bookmark-manager'),
    classification_db: z.string().default('classifications.db'),
    metadata_db: z.string().default('metadata.db'),
    external_index_file: z.string().default('bookmarks.duckdb'),
    max_size_mb: z.number().int().positive().default(1024),
  }).default({
    directory: '~/.cache/bookmark-manager',
    classification_db: 'classifications.db',
    metadata_db: 'metadata.db',
    external_index_file: 'bookmarks.duckdb',
    max_size_mb: 1024,
  }),

  // === Logging Settings ===
  logging: z.object({
    level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    file: z.string().optional(),
    console: z.boolean().default(true),
    include_timestamps: z.boolean().default(true),
  }).default({
    level: 'info',
    console: true,
    include_timestamps: true,
  }),
});

export type Config = z.infer<typeof ConfigSchema>;
```

## Sane Defaults Rationale

### Performance Settings
```json
{
  "external_index": "duckdb",
  "batch_size": 100,
  "batch_delay_ms": 100,
  "max_concurrent_operations": 5,
  "read_only_index": true
}
```

**Why:**
- **DuckDB:** In-process, no external daemon, excellent for 30k+ analytical queries
- **batch_size: 100:** Balance between throughput and API rate limits
- **batch_delay_ms: 100:** Prevents overwhelming Chrome and disk I/O
- **max_concurrent_operations: 5:** Conservative to avoid ZFS thrashing
- **read_only_index: true:** Accumulate all changes, single commit

### Classification Settings
```json
{
  "provider": "hybrid",
  "confidence_threshold": 0.7,
  "batch_size": 50,
  "cache_duration_days": 30
}
```

**Why:**
- **hybrid:** Gemini Nano first (fast, free), Claude for low-confidence (<0.7)
- **confidence_threshold: 0.7:** Proven sweet spot for quality vs. cost
- **batch_size: 50:** LLM context window optimization
- **cache_duration_days: 30:** Balance freshness vs. recomputation

### Chrome Launch Flags
```json
[
  "--disable-dev-shm-usage",
  "--disable-software-rasterizer",
  "--disable-extensions",
  "--disk-cache-size=1",
  "--media-cache-size=1"
]
```

**Why:**
- Minimize memory and disk I/O for headless operation
- No GPU/extensions needed for bookmark management
- Reduces ZFS thrashing on minimal cache sizes

## Example Configurations

### Minimal Configuration (30k+ bookmarks, performance-first)
```json
{
  "performance": {
    "external_index": "duckdb",
    "batch_size": 500,
    "batch_delay_ms": 50,
    "max_concurrent_operations": 3
  },
  "classification": {
    "provider": "gemini",
    "batch_size": 100
  },
  "metadata": {
    "extract_article_content": false
  }
}
```

### Quality-First Configuration (smaller dataset, richer metadata)
```json
{
  "classification": {
    "provider": "claude",
    "confidence_threshold": 0.9,
    "batch_size": 20
  },
  "metadata": {
    "extract_article_content": true,
    "fetch_open_graph": true,
    "fetch_json_ld": true
  },
  "performance": {
    "batch_size": 50
  }
}
```

### GitHub Stars Focused
```json
{
  "github": {
    "enabled": true,
    "sync_interval_hours": 6,
    "classify_new_stars": true,
    "merge_with_bookmarks": true,
    "dedupe_against_bookmarks": true
  },
  "classification": {
    "provider": "hybrid"
  }
}
```

## Configuration Loading

```typescript
import { ConfigSchema, type Config } from './config-schema';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export async function loadConfig(configPath?: string): Promise<Config> {
  const path = configPath || 
    process.env.CONFIG_PATH || 
    resolve(process.env.HOME!, '.config/bookmark-manager/config.json');

  try {
    const raw = await readFile(path, 'utf-8');
    const parsed = JSON.parse(raw);
    return ConfigSchema.parse(parsed); // Validates and applies defaults
  } catch (error) {
    console.warn(`Config not found at ${path}, using defaults`);
    return ConfigSchema.parse({}); // Apply all defaults
  }
}
```

## Validation

```typescript
import { ConfigSchema } from './config-schema';

// Validate configuration
const result = ConfigSchema.safeParse(userConfig);

if (!result.success) {
  console.error('Configuration validation failed:');
  console.error(result.error.format());
  process.exit(1);
}

const config = result.data; // Fully typed and validated
```

## Performance Impact Matrix

| Setting | 30k Bookmarks Impact | Memory Impact | Quality Impact |
|---------|---------------------|---------------|----------------|
| `external_index: duckdb` | 🟢 Massive speedup | 🟡 Moderate (~200MB) | 🟢 No change |
| `batch_size: 500` | 🟢 Faster | 🟡 Higher | 🟢 No change |
| `batch_delay_ms: 50` | 🟢 Faster | 🟢 No change | 🟢 No change |
| `classification.provider: gemini` | 🟢 Much faster | 🟢 Lower | 🟡 Slightly lower |
| `classification.provider: claude` | 🔴 Slower | 🟢 No change | 🟢 Higher |
| `classification.provider: hybrid` | 🟡 Moderate | 🟢 Balanced | 🟢 High |
| `metadata.extract_article_content: true` | 🔴 Much slower | 🔴 Higher | 🟢 Higher |
| `max_concurrent_operations: 10` | 🟡 Faster (risk thrashing) | 🔴 Higher | 🟢 No change |

## Recommendations by Use Case

### Large Dataset (30k+ bookmarks)
- `external_index: duckdb`
- `batch_size: 500`
- `batch_delay_ms: 50`
- `max_concurrent_operations: 3`
- `classification.provider: gemini` or `hybrid`
- `metadata.extract_article_content: false`

### Quality Over Speed (< 5k bookmarks)
- `external_index: duckdb` (still recommended)
- `batch_size: 50`
- `classification.provider: claude`
- `metadata.extract_article_content: true`
- `classification.confidence_threshold: 0.9`

### GitHub Stars Primary
- `github.enabled: true`
- `github.sync_interval_hours: 6`
- `classification.provider: hybrid`
- `github.merge_with_bookmarks: true`
- `github.dedupe_against_bookmarks: true`
