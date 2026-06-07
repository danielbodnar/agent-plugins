# AI Classification Strategy

Hybrid AI classification approach using Gemini Nano (fast, on-device) and Claude (high-quality, cloud-based) for intelligent bookmark categorization.

## Strategy Overview

### Three-Tier Classification
1. **URL Pattern Matching** (instant, free) - Rule-based classification using configured patterns
2. **Gemini Nano** (fast, free) - On-device classification for bulk operations
3. **Claude API** (slow, paid) - Cloud-based classification for low-confidence results

### Decision Flow

```typescript
async function classify(bookmark: Bookmark, config: Config): Promise<Classification> {
  // Tier 1: URL pattern matching
  const patternMatch = matchUrlPattern(bookmark.url, config.taxonomy.categories);
  if (patternMatch && patternMatch.confidence >= 0.95) {
    return { category: patternMatch.category, confidence: 1.0, provider: 'pattern' };
  }
  
  // Tier 2: Gemini Nano (on-device)
  const geminiResult = await classifyWithGemini(bookmark);
  if (geminiResult.confidence >= config.classification.confidence_threshold) {
    return geminiResult;
  }
  
  // Tier 3: Claude API (cloud, higher quality)
  const claudeResult = await classifyWithClaude(bookmark);
  return claudeResult;
}
```

## Tier 1: URL Pattern Matching

### Configuration

```json
{
  "taxonomy": {
    "categories": [
      {
        "name": "Development",
        "patterns": [
          "github\\.com",
          "gitlab\\.com",
          "bitbucket\\.org",
          "stackoverflow\\.com",
          "dev\\.to"
        ]
      }
    ]
  }
}
```

### Implementation

```typescript
interface PatternMatch {
  category: string;
  confidence: number;
  matchedPattern: string;
}

function matchUrlPattern(url: string, categories: Category[]): PatternMatch | null {
  for (const category of categories) {
    if (!category.patterns) continue;
    
    for (const pattern of category.patterns) {
      const regex = new RegExp(pattern, 'i');
      if (regex.test(url)) {
        return {
          category: category.name,
          confidence: 0.95, // High confidence for direct URL matches
          matchedPattern: pattern,
        };
      }
    }
  }
  
  return null;
}
```

### Advantages
- **Speed:** Instant, no network/computation
- **Cost:** Free
- **Accuracy:** High for known domains (GitHub, Stack Overflow, etc.)

### Limitations
- Limited to URL-only matching (no title/content analysis)
- Requires manual pattern configuration
- Can't handle ambiguous cases

## Tier 2: Gemini Nano Classification

### Overview

Gemini Nano is Google's on-device AI model optimized for:
- Fast inference (< 100ms per item)
- No API costs
- No network latency
- Privacy-preserving (data never leaves device)

### Implementation

```typescript
import { Gemini } from '@google/generative-ai';

interface GeminiClassifier {
  model: Gemini;
  taxonomy: Taxonomy;
}

async function classifyWithGemini(
  bookmark: Bookmark,
  classifier: GeminiClassifier
): Promise<Classification> {
  const prompt = buildClassificationPrompt(bookmark, classifier.taxonomy);
  
  const result = await classifier.model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.1, // Low temperature for consistency
      maxOutputTokens: 50, // Just need category name
    },
  });
  
  const response = result.response.text();
  const parsed = parseClassificationResponse(response);
  
  return {
    category: parsed.category,
    confidence: parsed.confidence,
    provider: 'gemini',
    reasoning: parsed.reasoning,
  };
}
```

### Prompt Template

```typescript
function buildClassificationPrompt(bookmark: Bookmark, taxonomy: Taxonomy): string {
  const categories = taxonomy.categories.map(c => 
    `- ${c.name}: ${c.description}`
  ).join('\n');
  
  return `
Classify this bookmark into ONE of these categories:

${categories}

Bookmark details:
- URL: ${bookmark.url}
- Title: ${bookmark.title}
- Description: ${bookmark.description || 'N/A'}

Respond in JSON format:
{
  "category": "<category name>",
  "confidence": <0.0-1.0>,
  "reasoning": "<brief explanation>"
}
`.trim();
}
```

### Batch Processing

```typescript
async function classifyBatchWithGemini(
  bookmarks: Bookmark[],
  classifier: GeminiClassifier,
  options: BatchOptions
): Promise<Classification[]> {
  return await batchOperation(
    bookmarks,
    async (batch) => {
      return await Promise.all(
        batch.map(bookmark => classifyWithGemini(bookmark, classifier))
      );
    },
    { ...options, batchSize: 100 } // Gemini can handle larger batches
  );
}
```

### Advantages
- **Speed:** 50-100ms per classification
- **Cost:** Free (on-device)
- **Privacy:** Data stays local
- **Throughput:** Can process 30k+ bookmarks in < 1 hour

### Limitations
- **Accuracy:** Lower than Claude (~80-85% vs ~95%)
- **Context:** Limited model knowledge vs. cloud models
- **Availability:** Requires compatible device/browser

## Tier 3: Claude API Classification

### Overview

Claude Sonnet 4 provides highest-quality classification for:
- Ambiguous or complex bookmarks
- Low-confidence Gemini results (< 0.7)
- Final verification pass

### Implementation

```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function classifyWithClaude(
  bookmark: Bookmark,
  taxonomy: Taxonomy
): Promise<Classification> {
  const prompt = buildClassificationPrompt(bookmark, taxonomy);
  
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 200,
    temperature: 0.1,
    messages: [{
      role: 'user',
      content: prompt,
    }],
  });
  
  const response = message.content[0].text;
  const parsed = parseClassificationResponse(response);
  
  return {
    category: parsed.category,
    confidence: parsed.confidence,
    provider: 'claude',
    reasoning: parsed.reasoning,
  };
}
```

### Batch Optimization

**Problem:** Claude API has rate limits and costs per token

**Solution:** Batch multiple bookmarks into single API call

```typescript
async function classifyBatchWithClaude(
  bookmarks: Bookmark[],
  taxonomy: Taxonomy,
  options: BatchOptions
): Promise<Classification[]> {
  const batchSize = 20; // Optimal for context window
  
  return await batchOperation(
    bookmarks,
    async (batch) => {
      const prompt = buildBatchClassificationPrompt(batch, taxonomy);
      
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        temperature: 0.1,
        messages: [{ role: 'user', content: prompt }],
      });
      
      const response = message.content[0].text;
      return parseBatchClassificationResponse(response, batch);
    },
    { ...options, batchSize, delayMs: 1000 } // Rate limit compliance
  );
}

function buildBatchClassificationPrompt(
  bookmarks: Bookmark[],
  taxonomy: Taxonomy
): string {
  const categories = taxonomy.categories.map(c => 
    `- ${c.name}: ${c.description}`
  ).join('\n');
  
  const bookmarkList = bookmarks.map((b, i) => 
    `${i + 1}. ${b.url} - "${b.title}"`
  ).join('\n');
  
  return `
Classify these ${bookmarks.length} bookmarks into categories:

Categories:
${categories}

Bookmarks:
${bookmarkList}

Respond with JSON array:
[
  {"id": 1, "category": "<name>", "confidence": <0-1>, "reasoning": "<brief>"},
  ...
]
`.trim();
}
```

### Advantages
- **Accuracy:** Highest quality (~95%+)
- **Context:** Full world knowledge
- **Reasoning:** Can explain decisions
- **Flexibility:** Handles edge cases well

### Limitations
- **Speed:** ~2-5s per API call
- **Cost:** $3 per million input tokens, $15 per million output tokens
- **Rate Limits:** 50 requests/minute (Tier 1)

## Hybrid Strategy Implementation

### Configuration

```json
{
  "classification": {
    "provider": "hybrid",
    "confidence_threshold": 0.7,
    "batch_size": 50,
    "retry_failed": true,
    "max_retries": 3
  }
}
```

### Full Implementation

```typescript
export class HybridClassifier {
  private geminiClassifier?: GeminiClassifier;
  private anthropic: Anthropic;
  private taxonomy: Taxonomy;
  private config: ClassificationConfig;
  
  constructor(config: Config) {
    this.taxonomy = config.taxonomy;
    this.config = config.classification;
    this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    
    // Initialize Gemini if available
    if (config.classification.provider === 'hybrid' || 
        config.classification.provider === 'gemini') {
      this.initializeGemini();
    }
  }
  
  async classify(bookmark: Bookmark): Promise<Classification> {
    // Check cache first
    const cached = await this.getFromCache(bookmark.url);
    if (cached) return cached;
    
    // Tier 1: URL patterns
    const patternMatch = matchUrlPattern(bookmark.url, this.taxonomy.categories);
    if (patternMatch && patternMatch.confidence >= 0.95) {
      await this.saveToCache(bookmark.url, patternMatch);
      return { ...patternMatch, provider: 'pattern' };
    }
    
    // Tier 2: Gemini (if available and enabled)
    if (this.geminiClassifier && this.config.provider !== 'claude') {
      const geminiResult = await classifyWithGemini(bookmark, this.geminiClassifier);
      
      if (geminiResult.confidence >= this.config.confidence_threshold) {
        await this.saveToCache(bookmark.url, geminiResult);
        return geminiResult;
      }
      
      // Escalate to Claude for low confidence
      if (this.config.provider === 'hybrid') {
        const claudeResult = await classifyWithClaude(bookmark, this.taxonomy);
        await this.saveToCache(bookmark.url, claudeResult);
        return claudeResult;
      }
      
      // Return Gemini result if not using hybrid
      await this.saveToCache(bookmark.url, geminiResult);
      return geminiResult;
    }
    
    // Tier 3: Claude (fallback or primary)
    const claudeResult = await classifyWithClaude(bookmark, this.taxonomy);
    await this.saveToCache(bookmark.url, claudeResult);
    return claudeResult;
  }
  
  async classifyBatch(
    bookmarks: Bookmark[],
    options?: BatchOptions
  ): Promise<Classification[]> {
    const opts = { ...this.config, ...options };
    
    return await batchOperation(
      bookmarks,
      async (batch) => {
        return await Promise.all(
          batch.map(bookmark => this.classify(bookmark))
        );
      },
      opts
    );
  }
}
```

## Performance Metrics

### Expected Throughput (30k bookmarks)

| Provider | Speed (items/min) | Total Time | Accuracy | Cost |
|----------|------------------|------------|----------|------|
| Pattern matching | Instant | < 1 min | 100% (for patterns) | $0 |
| Gemini Nano | 600-1000 | 30-50 min | 80-85% | $0 |
| Claude (batched) | 100-200 | 2-5 hours | 95%+ | $10-30 |
| **Hybrid** | **400-600** | **50-75 min** | **90-95%** | **$3-10** |

### Cost Analysis (30k bookmarks)

**Assumptions:**
- 70% cache hit rate on subsequent runs
- 80% classified by pattern/Gemini
- 20% escalated to Claude

**First run (cold cache):**
- Pattern matches: 20% (6k) - $0
- Gemini: 60% (18k) - $0
- Claude: 20% (6k) - ~$5-10

**Subsequent runs (warm cache):**
- Cached: 70% (21k) - $0
- New/changed: 30% (9k) - ~$2-3

## Best Practices

### 1. Cache Aggressively

```typescript
// 30-day cache with URL key
await db.run(`
  INSERT OR REPLACE INTO classification_cache 
  VALUES (?, ?, ?, ?, ?, ?)
`, [url, category, confidence, provider, Date.now(), 30]);
```

### 2. Batch Processing

```typescript
// Process in batches with delays
await batchOperation(bookmarks, classifyBatch, {
  batchSize: 50,
  delayMs: 100,
  showProgress: true,
});
```

### 3. Monitor Quality

```typescript
// Track confidence distribution
const stats = {
  high: results.filter(r => r.confidence >= 0.9).length,
  medium: results.filter(r => r.confidence >= 0.7 && r.confidence < 0.9).length,
  low: results.filter(r => r.confidence < 0.7).length,
};

console.log(`Quality: ${stats.high} high, ${stats.medium} medium, ${stats.low} low`);
```

### 4. Progressive Enhancement

```typescript
// Start with fast methods, refine later
const quickPass = await classifyWithGemini(bookmarks);
const lowConfidence = quickPass.filter(r => r.confidence < 0.7);
const refined = await classifyWithClaude(lowConfidence);
```

## Troubleshooting

### Low Accuracy

**Symptoms:** Many misclassifications, low confidence scores

**Solutions:**
- Review and expand taxonomy categories
- Add more URL patterns for common domains
- Lower `confidence_threshold` to escalate more to Claude
- Check prompt template clarity

### Slow Performance

**Symptoms:** Taking > 2 hours for 30k bookmarks

**Solutions:**
- Enable caching (ensure cache database exists)
- Increase `batch_size` for Gemini (up to 200)
- Use `provider: "gemini"` if accuracy is acceptable
- Check network latency to Claude API

### High Costs

**Symptoms:** Claude API costs > $50 for 30k bookmarks

**Solutions:**
- Increase `confidence_threshold` (fewer Claude escalations)
- Enable pattern matching first
- Increase cache TTL (reduce reclassification)
- Use Gemini-only mode for initial pass

## Summary

**Recommended configuration for 30k+ bookmarks:**

```json
{
  "classification": {
    "provider": "hybrid",
    "confidence_threshold": 0.75,
    "batch_size": 50,
    "cache_duration_days": 30
  }
}
```

**Expected performance:**
- Time: 50-75 minutes (first run)
- Cost: $5-10 (first run), $2-3 (subsequent)
- Accuracy: 90-95%
- Cache hit rate: 70-80% (subsequent runs)
