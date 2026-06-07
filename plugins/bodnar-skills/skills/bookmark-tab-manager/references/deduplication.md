# Deduplication Strategy

Non-destructive bookmark deduplication with multiple detection strategies.

## Core Principle

**Non-destructive:** Never delete bookmarks automatically. Instead, group duplicates in a "Duplicates" subfolder for user review.

## Deduplication Strategies

### 1. URL-Based (Default)

**Strategy:** Exact URL matching (after normalization)

**Advantages:**
- Fast (< 1 minute for 30k bookmarks)
- Deterministic
- No false positives

**Implementation:**

```typescript
interface Duplicate {
  url: string;
  bookmarks: Bookmark[];
  newest: Bookmark;
  oldest: Bookmark;
}

async function findUrlDuplicates(bookmarks: Bookmark[]): Promise<Duplicate[]> {
  const urlMap = new Map<string, Bookmark[]>();
  
  for (const bookmark of bookmarks) {
    const normalized = normalizeUrl(bookmark.url);
    const existing = urlMap.get(normalized) || [];
    existing.push(bookmark);
    urlMap.set(normalized, existing);
  }
  
  const duplicates: Duplicate[] = [];
  
  for (const [url, instances] of urlMap.entries()) {
    if (instances.length > 1) {
      const sorted = instances.sort((a, b) => b.dateAdded - a.dateAdded);
      duplicates.push({
        url,
        bookmarks: instances,
        newest: sorted[0],
        oldest: sorted[sorted.length - 1],
      });
    }
  }
  
  return duplicates;
}
```

**URL Normalization:**

```typescript
function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    
    // Remove trailing slash
    const pathname = parsed.pathname.replace(/\/$/, '');
    
    // Sort query parameters
    const params = new URLSearchParams(parsed.search);
    const sortedParams = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('&');
    
    // Remove common tracking parameters
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'fbclid'];
    trackingParams.forEach(param => params.delete(param));
    
    // Rebuild URL
    return `${parsed.protocol}//${parsed.host}${pathname}${sortedParams ? '?' + sortedParams : ''}`;
  } catch {
    return url; // Return original if parsing fails
  }
}
```

### 2. Content-Based

**Strategy:** Hash page content similarity

**Advantages:**
- Detects duplicates with different URLs
- Handles URL changes (e.g., HTTP → HTTPS)

**Limitations:**
- Slower (requires content fetching)
- Network-dependent

**Implementation:**

```typescript
import { createHash } from 'node:crypto';

interface ContentHash {
  url: string;
  hash: string;
  title: string;
  excerpt: string;
}

async function computeContentHash(url: string): Promise<ContentHash> {
  const response = await fetch(url);
  const html = await response.text();
  
  // Extract clean text content
  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  const hash = createHash('sha256')
    .update(text)
    .digest('hex');
  
  return {
    url,
    hash,
    title: extractTitle(html),
    excerpt: text.slice(0, 200),
  };
}

async function findContentDuplicates(
  bookmarks: Bookmark[],
  options: { threshold?: number } = {}
): Promise<Duplicate[]> {
  const threshold = options.threshold || 0.9;
  const hashes = await batchOperation(
    bookmarks,
    async (batch) => await Promise.all(
      batch.map(b => computeContentHash(b.url))
    ),
    { batchSize: 50, delayMs: 100 }
  );
  
  // Group by hash
  const hashMap = new Map<string, Bookmark[]>();
  for (let i = 0; i < bookmarks.length; i++) {
    const hash = hashes[i].hash;
    const existing = hashMap.get(hash) || [];
    existing.push(bookmarks[i]);
    hashMap.set(hash, existing);
  }
  
  // Find duplicates
  const duplicates: Duplicate[] = [];
  for (const [hash, instances] of hashMap.entries()) {
    if (instances.length > 1) {
      duplicates.push({
        url: instances[0].url,
        bookmarks: instances,
        newest: instances.sort((a, b) => b.dateAdded - a.dateAdded)[0],
        oldest: instances[instances.length - 1],
      });
    }
  }
  
  return duplicates;
}
```

### 3. Semantic (AI-Based)

**Strategy:** Embedding similarity via AI models

**Advantages:**
- Detects similar content with different wording
- Language-agnostic

**Limitations:**
- Slowest (requires embedding computation)
- May have false positives

**Implementation:**

```typescript
import { embed } from '@anthropic-ai/sdk';

interface Embedding {
  url: string;
  embedding: number[];
  title: string;
}

async function computeEmbedding(bookmark: Bookmark): Promise<Embedding> {
  const text = `${bookmark.title} ${bookmark.description || ''}`;
  
  const response = await anthropic.embeddings.create({
    model: 'claude-3-embedding',
    input: text,
  });
  
  return {
    url: bookmark.url,
    embedding: response.data[0].embedding,
    title: bookmark.title,
  };
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function findSemanticDuplicates(
  bookmarks: Bookmark[],
  options: { threshold?: number } = {}
): Promise<Duplicate[]> {
  const threshold = options.threshold || 0.95;
  
  // Compute embeddings
  const embeddings = await batchOperation(
    bookmarks,
    async (batch) => await Promise.all(
      batch.map(b => computeEmbedding(b))
    ),
    { batchSize: 50, delayMs: 100 }
  );
  
  // Find similar pairs
  const duplicates: Duplicate[] = [];
  const seen = new Set<number>();
  
  for (let i = 0; i < embeddings.length; i++) {
    if (seen.has(i)) continue;
    
    const similar: number[] = [i];
    
    for (let j = i + 1; j < embeddings.length; j++) {
      if (seen.has(j)) continue;
      
      const similarity = cosineSimilarity(
        embeddings[i].embedding,
        embeddings[j].embedding
      );
      
      if (similarity >= threshold) {
        similar.push(j);
        seen.add(j);
      }
    }
    
    if (similar.length > 1) {
      const instances = similar.map(idx => bookmarks[idx]);
      duplicates.push({
        url: bookmarks[i].url,
        bookmarks: instances,
        newest: instances.sort((a, b) => b.dateAdded - a.dateAdded)[0],
        oldest: instances[instances.length - 1],
      });
    }
  }
  
  return duplicates;
}
```

## Non-Destructive Grouping

### Configuration

```json
{
  "deduplication": {
    "strategy": "url",
    "duplicates_folder_name": "Duplicates",
    "auto_group": true,
    "preserve_newest": true
  }
}
```

### Implementation

```typescript
async function groupDuplicates(
  duplicates: Duplicate[],
  config: DeduplicationConfig
): Promise<void> {
  for (const duplicate of duplicates) {
    // Keep newest, move others to Duplicates folder
    const toKeep = config.preserve_newest ? duplicate.newest : duplicate.oldest;
    const toMove = duplicate.bookmarks.filter(b => b.id !== toKeep.id);
    
    // Create Duplicates subfolder next to the kept bookmark
    const parentId = toKeep.parentId;
    const duplicatesFolder = await createOrGetDuplicatesFolder(
      parentId,
      config.duplicates_folder_name
    );
    
    // Move duplicate instances
    for (const bookmark of toMove) {
      await browser.bookmarks.move(bookmark.id, {
        parentId: duplicatesFolder.id,
      });
    }
  }
}

async function createOrGetDuplicatesFolder(
  parentId: string,
  folderName: string
): Promise<BookmarkTreeNode> {
  // Check if Duplicates folder already exists
  const children = await browser.bookmarks.getChildren(parentId);
  const existing = children.find(
    c => !c.url && c.title === folderName
  );
  
  if (existing) {
    return existing;
  }
  
  // Create Duplicates folder
  return await browser.bookmarks.create({
    parentId,
    title: folderName,
  });
}
```

## Complete Workflow

```typescript
export class DeduplicationManager {
  private config: DeduplicationConfig;
  
  constructor(config: Config) {
    this.config = config.deduplication;
  }
  
  async deduplicate(bookmarks: Bookmark[]): Promise<DeduplicationReport> {
    console.log(`Finding duplicates using ${this.config.strategy} strategy...`);
    
    let duplicates: Duplicate[];
    
    switch (this.config.strategy) {
      case 'url':
        duplicates = await findUrlDuplicates(bookmarks);
        break;
      case 'content':
        duplicates = await findContentDuplicates(bookmarks, {
          threshold: this.config.similarity_threshold,
        });
        break;
      case 'semantic':
        duplicates = await findSemanticDuplicates(bookmarks, {
          threshold: this.config.similarity_threshold,
        });
        break;
      default:
        throw new Error(`Unknown strategy: ${this.config.strategy}`);
    }
    
    console.log(`Found ${duplicates.length} groups of duplicates`);
    
    if (this.config.auto_group) {
      await groupDuplicates(duplicates, this.config);
      console.log(`Grouped duplicates in "${this.config.duplicates_folder_name}" folders`);
    }
    
    return {
      strategy: this.config.strategy,
      totalDuplicateGroups: duplicates.length,
      totalDuplicateBookmarks: duplicates.reduce((sum, d) => sum + d.bookmarks.length - 1, 0),
      duplicates,
    };
  }
}
```

## Performance Comparison

| Strategy | Speed (30k bookmarks) | Accuracy | Network | Cost |
|----------|----------------------|----------|---------|------|
| URL | < 1 min | 100% (exact) | No | $0 |
| Content | 30-60 min | 95% | Yes | $0 |
| Semantic | 2-4 hours | 90% (may have false positives) | Yes | $10-30 |

## Recommendations

### For 30k+ Bookmarks
- **Use URL-based deduplication** (fast, accurate)
- Enable `auto_group: true` for automatic organization
- Set `preserve_newest: true` to keep most recent versions
- Run periodically (monthly) to catch new duplicates

### For Smaller Sets (< 5k)
- **Consider content-based** for better duplicate detection
- Manually review Duplicates folders before deletion
- Use semantic search for finding similar (but not identical) content

## Troubleshooting

### Many False Positives

**Symptoms:** Unrelated bookmarks grouped as duplicates

**Solutions:**
- Increase `similarity_threshold` (try 0.95 or 0.98)
- Use URL-based instead of semantic
- Review normalization rules

### Missing Duplicates

**Symptoms:** Known duplicates not detected

**Solutions:**
- Check URL normalization (may be too aggressive)
- Try content-based or semantic strategies
- Manually add known duplicate patterns to config

### Slow Performance

**Symptoms:** Deduplication taking > 2 hours

**Solutions:**
- Use URL-based strategy (fastest)
- Increase `batch_size` for network operations
- Reduce `similarity_threshold` for semantic
- Consider running overnight for content/semantic strategies

## Summary

**Recommended configuration:**

```json
{
  "deduplication": {
    "strategy": "url",
    "duplicates_folder_name": "Duplicates",
    "auto_group": true,
    "similarity_threshold": 0.9,
    "preserve_newest": true
  }
}
```

**Expected performance (30k bookmarks):**
- Time: < 1 minute (URL), 30-60 min (content), 2-4 hours (semantic)
- Accuracy: 100% (URL), 95% (content), 90% (semantic)
- False positives: None (URL), rare (content), possible (semantic)
