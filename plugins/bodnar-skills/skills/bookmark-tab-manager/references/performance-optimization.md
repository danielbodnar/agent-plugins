# Performance Optimization for Large Datasets

**Performance must be the top priority** when dealing with 30k+ bookmarks and 15k+ GitHub stars.

## The Performance Challenge

### Current State
- **Bookmarks:** 30,000+
- **GitHub Stars:** 15,000+
- **Storage:** ZFS with thrashing issues
- **Observed Performance:** Excruciatingly slow even with profile-sync-daemon

### Root Causes
1. **Chrome Bookmarks API bottleneck** - Individual bookmark operations are slow
2. **ZFS thrashing** - Many small writes cause performance degradation
3. **Synchronous operations** - Sequential processing of large datasets
4. **Memory pressure** - Loading 30k+ bookmarks into memory
5. **Network I/O** - Metadata fetching and classification API calls

## Strategy Overview

### Three-Pillar Approach
1. **External Indexing** - Avoid Chrome API bottlenecks
2. **Batch Operations** - Minimize API calls and disk writes
3. **Intelligent Caching** - Avoid redundant work

## 1. External Indexing Strategy

### Why External Indexing?

**Chrome Bookmarks API limitations:**
- Individual bookmark queries are slow (10-50ms each)
- 30k bookmarks × 50ms = **25 minutes** just to read
- Tree traversal is depth-first, not optimized for bulk operations
- No native filtering/aggregation capabilities

**External index benefits:**
- Read entire tree once: ~5-10 seconds
- Query locally: sub-millisecond for most operations
- Analytical queries (filtering, grouping) are fast
- Batch write back to Chrome once at end

### DuckDB Implementation (Recommended)

**Why DuckDB:**
- In-process analytical database (no external daemon)
- Columnar storage for fast aggregations
- Low memory footprint (~200MB for 30k records)
- Parquet export for persistence between runs
- SQL interface for complex queries
- Native Bun support via `@evan/duckdb`

**Implementation pattern:**

```typescript
import duckdb from '@evan/duckdb';
import { chrome } from 'playwright';

// 1. Read entire bookmark tree ONCE
const browser = await chrome.launch({ /* ... */ });
const bookmarks = await browser.bookmarks.getTree();

// 2. Initialize DuckDB and load data
const db = duckdb.Database.create(':memory:');
await db.exec(`
  CREATE TABLE bookmarks (
    id VARCHAR PRIMARY KEY,
    url VARCHAR,
    title VARCHAR,
    folder VARCHAR,
    date_added BIGINT,
    tags VARCHAR[]
  )
`);

// 3. Bulk insert (fast)
const stmt = db.prepare('INSERT INTO bookmarks VALUES (?, ?, ?, ?, ?, ?)');
for (const bookmark of flattenTree(bookmarks)) {
  stmt.run(
    bookmark.id,
    bookmark.url,
    bookmark.title,
    bookmark.folder,
    bookmark.dateAdded,
    bookmark.tags || []
  );
}

// 4. Query against index (sub-millisecond)
const duplicates = await db.all(`
  SELECT url, COUNT(*) as count, ARRAY_AGG(id) as ids
  FROM bookmarks
  WHERE url IS NOT NULL
  GROUP BY url
  HAVING count > 1
`);

const unclassified = await db.all(`
  SELECT * FROM bookmarks
  WHERE folder = 'Uncategorized'
  LIMIT 1000
`);

// 5. Accumulate all changes in memory
const changes: BookmarkChange[] = [];
for (const dup of duplicates) {
  changes.push({ type: 'move', id: dup.ids[1], newFolder: 'Duplicates' });
}

// 6. Single batch write to Chrome at end
await applyChanges(browser, changes);

// 7. Export index for next run
await db.exec(`
  COPY bookmarks TO 'bookmarks.parquet' (FORMAT PARQUET)
`);
```

**Performance gains:**
- Initial read: **10 seconds** (once)
- Queries: **< 100ms** (unlimited)
- Single batch write: **30-60 seconds**
- **Total: ~2 minutes** vs 25+ minutes with API-per-bookmark

### Alternative: TypeSense

**When to use:**
- Need full-text search with typo tolerance
- Want faceted filtering in UI
- Willing to run external daemon

**Setup:**
```bash
# Install TypeSense
bun add typesense

# Start TypeSense server
docker run -p 8108:8108 typesense/typesense:29 \
  --data-dir=/data --api-key=xyz
```

**Implementation:**
```typescript
import Typesense from 'typesense';

const client = new Typesense.Client({
  nodes: [{ host: 'localhost', port: 8108, protocol: 'http' }],
  apiKey: 'xyz',
});

// Create collection
await client.collections().create({
  name: 'bookmarks',
  fields: [
    { name: 'url', type: 'string' },
    { name: 'title', type: 'string' },
    { name: 'content', type: 'string' },
    { name: 'tags', type: 'string[]', facet: true },
    { name: 'category', type: 'string', facet: true },
    { name: 'date_added', type: 'int64' },
  ],
});

// Bulk import
await client.collections('bookmarks').documents().import(bookmarks, {
  action: 'upsert',
  batch_size: 1000,
});

// Fast search with typo tolerance
const results = await client.collections('bookmarks').documents().search({
  q: 'machne learning', // Typo!
  query_by: 'title,content',
  filter_by: 'category:=AI',
  per_page: 100,
});
```

## 2. Batch Operations Strategy

### The Batching Pattern

**Core principle:** Accumulate operations, execute in groups, delay between batches

```typescript
interface BatchOptions {
  batchSize: number;      // Items per batch (100-5000)
  delayMs: number;        // Delay between batches (50-200ms)
  progressCallback?: (current: number, total: number) => void;
}

async function batchOperation<T, R>(
  items: T[],
  processor: (batch: T[]) => Promise<R[]>,
  options: BatchOptions
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += options.batchSize) {
    const batch = items.slice(i, i + options.batchSize);
    const batchResults = await processor(batch);
    results.push(...batchResults);
    
    // Progress reporting
    options.progressCallback?.(i + batch.length, items.length);
    
    // Delay to prevent overwhelming disk/API
    if (i + options.batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, options.delayMs));
    }
  }
  
  return results;
}
```

### Batch Size Guidelines

| Operation Type | Recommended Batch Size | Rationale |
|----------------|------------------------|-----------|
| Classification (Gemini Nano) | 100-200 | Model context window |
| Classification (Claude) | 20-50 | API rate limits + cost |
| Metadata fetching | 50-100 | Network concurrency |
| Bookmark moves | 500-1000 | Chrome API throughput |
| GitHub stars fetch | 100 | API pagination |
| Deduplication | 5000-10000 | Memory-only operation |

### Read-Once Pattern

**Anti-pattern (SLOW):**
```typescript
// BAD: 30k API calls to Chrome
for (const bookmark of bookmarkIds) {
  const details = await chrome.bookmarks.get(bookmark.id); // SLOW
  const metadata = await fetchMetadata(details.url); // SLOW
  await chrome.bookmarks.update(bookmark.id, { title: metadata.title }); // SLOW
}
```

**Correct pattern (FAST):**
```typescript
// GOOD: Single read, process in memory, single write
const allBookmarks = await chrome.bookmarks.getTree(); // 1 call
const changes = [];

// Process in external index (DuckDB)
for (const bookmark of flattenTree(allBookmarks)) {
  const metadata = await fetchMetadataBatch([bookmark]); // Batched
  changes.push({ id: bookmark.id, title: metadata.title });
}

// Single batch commit
await chrome.bookmarks.updateBatch(changes); // 1 call
```

### Parallel vs Sequential

**When to parallelize:**
- Independent operations (metadata fetching, classification)
- I/O-bound tasks
- Network requests

**When to sequence:**
- Chrome API operations (avoid race conditions)
- ZFS writes (avoid thrashing)
- Rate-limited APIs

```typescript
// Parallel metadata fetching (GOOD for I/O)
await Promise.all(
  batches.map(batch => 
    Promise.all(batch.map(url => fetchMetadata(url)))
  )
);

// But limit concurrency to avoid overwhelming
import pLimit from 'p-limit';
const limit = pLimit(10); // Max 10 concurrent fetches

await Promise.all(
  urls.map(url => limit(() => fetchMetadata(url)))
);
```

## 3. Intelligent Caching

### Classification Cache

**Problem:** Re-classifying 30k bookmarks on every run is expensive

**Solution:** Persistent cache with TTL

```typescript
// ~/.cache/bookmark-manager/classifications.db (SQLite)
CREATE TABLE classification_cache (
  url VARCHAR PRIMARY KEY,
  category VARCHAR NOT NULL,
  confidence REAL NOT NULL,
  provider VARCHAR NOT NULL,
  timestamp INTEGER NOT NULL,
  ttl_days INTEGER DEFAULT 30
);

CREATE INDEX idx_timestamp ON classification_cache(timestamp);
```

**Implementation:**
```typescript
interface ClassificationCache {
  url: string;
  category: string;
  confidence: number;
  provider: 'gemini' | 'claude';
  timestamp: number;
  ttlDays: number;
}

async function getCachedClassification(url: string): Promise<ClassificationCache | null> {
  const result = await db.get(
    'SELECT * FROM classification_cache WHERE url = ? AND timestamp > ?',
    [url, Date.now() - (30 * 24 * 60 * 60 * 1000)]
  );
  return result;
}

async function classify(bookmark: Bookmark): Promise<Classification> {
  // Check cache first
  const cached = await getCachedClassification(bookmark.url);
  if (cached && cached.confidence >= config.confidenceThreshold) {
    return cached;
  }
  
  // Classify and cache
  const result = await classifyWithAI(bookmark);
  await db.run(
    'INSERT OR REPLACE INTO classification_cache VALUES (?, ?, ?, ?, ?, ?)',
    [bookmark.url, result.category, result.confidence, result.provider, Date.now(), 30]
  );
  
  return result;
}
```

**Cache hit rate target:** 70-80% on subsequent runs

### Metadata Cache

**Problem:** Fetching Open Graph, JSON-LD for 30k URLs is slow

**Solution:** Long-lived cache (90 days default)

```typescript
CREATE TABLE metadata_cache (
  url VARCHAR PRIMARY KEY,
  title VARCHAR,
  description VARCHAR,
  image VARCHAR,
  og_data JSON,
  json_ld JSON,
  timestamp INTEGER NOT NULL
);
```

**Selective fetching:**
```typescript
async function fetchMetadataWithCache(urls: string[]): Promise<Metadata[]> {
  // Check cache
  const cached = await db.all(
    `SELECT * FROM metadata_cache 
     WHERE url IN (${urls.map(() => '?').join(',')})
     AND timestamp > ?`,
    [...urls, Date.now() - (90 * 24 * 60 * 60 * 1000)]
  );
  
  const cachedUrls = new Set(cached.map(c => c.url));
  const missingUrls = urls.filter(url => !cachedUrls.has(url));
  
  // Fetch only missing
  const freshMetadata = await batchFetchMetadata(missingUrls, {
    batchSize: 50,
    delayMs: 100,
  });
  
  // Cache results
  for (const meta of freshMetadata) {
    await db.run(
      'INSERT OR REPLACE INTO metadata_cache VALUES (?, ?, ?, ?, ?, ?, ?)',
      [meta.url, meta.title, meta.description, meta.image, 
       JSON.stringify(meta.ogData), JSON.stringify(meta.jsonLd), Date.now()]
    );
  }
  
  return [...cached, ...freshMetadata];
}
```

## 4. systemd Optimizations

### I/O Scheduling

**Problem:** Chrome headless competes with ZFS writes

**Solution:** Lower I/O priority for Chrome service

```ini
[Service]
IOSchedulingClass=best-effort
IOSchedulingPriority=4
CPUWeight=100
MemoryHigh=80%
MemoryMax=90%
```

**Impact:** Reduces ZFS thrashing by prioritizing system I/O

### Chrome Launch Flags

```bash
--disable-dev-shm-usage          # Use /tmp instead of /dev/shm
--disable-software-rasterizer    # No GPU needed
--disable-extensions             # Faster startup
--disk-cache-size=1              # Minimal disk cache
--media-cache-size=1             # Minimal media cache
--no-first-run                   # Skip dialogs
--no-default-browser-check       # Skip browser check
--disable-background-networking  # No background requests
--disable-sync                   # No Chrome Sync during operation
```

## 5. Memory Management

### Memory Budget for 30k Bookmarks

| Component | Memory Usage | Optimization |
|-----------|--------------|--------------|
| Bookmark tree (in-memory) | ~150MB | Use streaming/chunking |
| DuckDB index | ~200MB | Use :memory: with periodic flush |
| Classification cache | ~50MB | Load on-demand |
| Metadata cache | ~100MB | Load on-demand |
| Browser (Playwright) | ~300MB | Minimal flags |
| **Total** | **~800MB** | Set `MemoryHigh=80%` |

### Chunking Large Operations

```typescript
async function processInChunks<T>(
  items: T[],
  chunkSize: number,
  processor: (chunk: T[]) => Promise<void>
): Promise<void> {
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    await processor(chunk);
    
    // Force garbage collection hint (Bun specific)
    if (global.gc) global.gc();
  }
}
```

## Performance Monitoring

### Key Metrics

```typescript
interface PerformanceMetrics {
  totalBookmarks: number;
  readTime: number;           // Time to read from Chrome
  indexBuildTime: number;     // Time to build external index
  queryTime: number;          // Average query time
  classificationTime: number; // Total classification time
  cacheHitRate: number;       // Percentage of cache hits
  writeTime: number;          // Time to write back to Chrome
  totalTime: number;          // End-to-end time
}
```

### Target Performance (30k bookmarks)

| Operation | Target Time | Notes |
|-----------|-------------|-------|
| Initial read | < 15 seconds | One-time per session |
| Index build | < 30 seconds | One-time or incremental |
| Classification (cached) | < 2 minutes | 80% cache hit rate |
| Classification (uncached) | < 20 minutes | Hybrid Gemini/Claude |
| Deduplication | < 30 seconds | Memory-only operation |
| Final write | < 60 seconds | Batch commit |
| **Total (cached)** | **< 5 minutes** | Most runs |
| **Total (cold start)** | **< 30 minutes** | First run or full reclassify |

## Common Performance Issues

### Issue: Slow initial read

**Symptoms:** Taking > 60 seconds to read bookmarks

**Diagnosis:**
```typescript
const start = Date.now();
const bookmarks = await chrome.bookmarks.getTree();
console.log(`Read ${countBookmarks(bookmarks)} bookmarks in ${Date.now() - start}ms`);
```

**Solutions:**
- Check network latency to Chrome debugging port
- Verify Chrome is running locally (not remote)
- Use `--disable-extensions` flag
- Increase `debugging_port` timeout

### Issue: ZFS thrashing

**Symptoms:** System becomes unresponsive, high I/O wait

**Diagnosis:**
```bash
iostat -x 1  # Check I/O wait times
zpool iostat -v 1  # Check ZFS pool stats
```

**Solutions:**
- Increase `batch_delay_ms` to 200-500ms
- Reduce `max_concurrent_operations` to 2-3
- Use `IOSchedulingClass=idle` for Chrome service
- Consider RAM-backed cache directory: `/dev/shm/bookmark-cache`

### Issue: High memory usage

**Symptoms:** OOM errors, system swapping

**Diagnosis:**
```bash
bun --expose-gc --max-old-space-size=512 run index.ts
```

**Solutions:**
- Use chunking for large operations
- Enable `lazy_load` in config
- Reduce `batch_size` for metadata fetching
- Use DuckDB with Parquet export (external storage)

### Issue: Slow classification

**Symptoms:** Classification taking > 30 minutes

**Diagnosis:**
```typescript
const start = Date.now();
const result = await classify(bookmark);
console.log(`Classified in ${Date.now() - start}ms`);
```

**Solutions:**
- Increase `batch_size` for classification
- Use `provider: gemini` for bulk (faster)
- Lower `confidence_threshold` (fewer Claude escalations)
- Ensure classification cache is enabled and working
- Check network latency to AI provider APIs

## Benchmarking

### Performance Test Script

```typescript
import { performance } from 'node:perf_hooks';

async function benchmark() {
  const metrics = {
    read: 0,
    index: 0,
    query: 0,
    classify: 0,
    write: 0,
  };

  // Read
  let start = performance.now();
  const bookmarks = await chrome.bookmarks.getTree();
  metrics.read = performance.now() - start;

  // Index
  start = performance.now();
  await buildIndex(bookmarks);
  metrics.index = performance.now() - start;

  // Query
  start = performance.now();
  await db.all('SELECT * FROM bookmarks WHERE url LIKE ?', ['%github%']);
  metrics.query = performance.now() - start;

  // Classify (sample)
  start = performance.now();
  await classifyBatch(bookmarks.slice(0, 100));
  metrics.classify = (performance.now() - start) / 100; // Per-item

  console.table(metrics);
}
```

### Continuous Monitoring

```typescript
// Log performance to file for analysis
import { appendFile } from 'node:fs/promises';

await appendFile('performance.jsonl', JSON.stringify({
  timestamp: Date.now(),
  bookmarkCount: bookmarks.length,
  ...metrics,
}) + '\n');
```

## Summary

**Critical path for 30k+ bookmarks:**

1. ✅ Use external indexing (DuckDB recommended)
2. ✅ Implement read-once pattern
3. ✅ Batch all operations (100-1000 items)
4. ✅ Add delays between batches (100-200ms)
5. ✅ Enable classification cache (30-day TTL)
6. ✅ Enable metadata cache (90-day TTL)
7. ✅ Optimize Chrome launch flags
8. ✅ Configure systemd I/O scheduling
9. ✅ Monitor and benchmark regularly

**Expected performance:** 2-5 minutes for most operations (with caching), 20-30 minutes for cold start.
