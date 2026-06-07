/**
 * Generic batch processor for large dataset operations
 * 
 * Critical for 30k+ bookmark performance:
 * - Processes items in configurable batch sizes
 * - Adds delays between batches to prevent overwhelming Chrome/disk
 * - Provides progress reporting
 * - Supports error handling and retries
 * 
 * @module batch-processor
 */

export interface BatchOptions {
  /** Items to process per batch (default: 100) */
  batchSize?: number;
  
  /** Delay between batches in milliseconds (default: 100) */
  delayMs?: number;
  
  /** Maximum concurrent operations (default: 5) */
  maxConcurrent?: number;
  
  /** Enable progress reporting (default: true) */
  showProgress?: boolean;
  
  /** Retry failed batches (default: false) */
  retryFailedBatches?: boolean;
  
  /** Maximum retries per batch (default: 3) */
  maxRetries?: number;
}

export interface BatchProgress {
  currentBatch: number;
  totalBatches: number;
  processedItems: number;
  totalItems: number;
  percentage: number;
  elapsedMs: number;
  estimatedRemainingMs: number;
}

export type ProgressCallback = (progress: BatchProgress) => void;
export type BatchProcessor<T, R> = (batch: T[]) => Promise<R[]>;

const DEFAULT_OPTIONS: Required<BatchOptions> = {
  batchSize: 100,
  delayMs: 100,
  maxConcurrent: 5,
  showProgress: true,
  retryFailedBatches: false,
  maxRetries: 3,
};

/**
 * Process items in batches with progress reporting
 * 
 * @example
 * ```typescript
 * const bookmarks = await getBookmarks(); // 30,000 items
 * 
 * const classified = await batchOperation(
 *   bookmarks,
 *   async (batch) => {
 *     return await classifyBatch(batch);
 *   },
 *   {
 *     batchSize: 100,
 *     delayMs: 100,
 *     showProgress: true,
 *   },
 *   (progress) => {
 *     console.log(`Progress: ${progress.percentage}%`);
 *   }
 * );
 * ```
 */
export async function batchOperation<T, R>(
  items: T[],
  processor: BatchProcessor<T, R>,
  options: BatchOptions = {},
  onProgress?: ProgressCallback
): Promise<R[]> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const results: R[] = [];
  const startTime = Date.now();
  
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += opts.batchSize) {
    batches.push(items.slice(i, i + opts.batchSize));
  }
  
  const totalBatches = batches.length;
  
  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const batch = batches[batchIndex];
    let batchResults: R[] | null = null;
    let retries = 0;
    
    // Retry logic
    while (batchResults === null && retries <= opts.maxRetries) {
      try {
        batchResults = await processor(batch);
      } catch (error) {
        retries++;
        if (retries > opts.maxRetries || !opts.retryFailedBatches) {
          console.error(`Batch ${batchIndex + 1} failed after ${retries} retries:`, error);
          throw error;
        }
        console.warn(`Batch ${batchIndex + 1} failed, retrying (${retries}/${opts.maxRetries})...`);
        await delay(opts.delayMs * retries); // Exponential backoff
      }
    }
    
    if (batchResults) {
      results.push(...batchResults);
    }
    
    // Progress reporting
    if (opts.showProgress || onProgress) {
      const elapsedMs = Date.now() - startTime;
      const processedItems = (batchIndex + 1) * opts.batchSize;
      const percentage = Math.min(100, Math.round((processedItems / items.length) * 100));
      const itemsPerMs = processedItems / elapsedMs;
      const remainingItems = items.length - processedItems;
      const estimatedRemainingMs = Math.round(remainingItems / itemsPerMs);
      
      const progress: BatchProgress = {
        currentBatch: batchIndex + 1,
        totalBatches,
        processedItems: Math.min(processedItems, items.length),
        totalItems: items.length,
        percentage,
        elapsedMs,
        estimatedRemainingMs,
      };
      
      if (opts.showProgress) {
        const etaSeconds = Math.round(estimatedRemainingMs / 1000);
        console.log(
          `Progress: ${progress.percentage}% (${progress.processedItems}/${progress.totalItems}) - ` +
          `ETA: ${etaSeconds}s`
        );
      }
      
      onProgress?.(progress);
    }
    
    // Delay between batches (but not after last batch)
    if (batchIndex < totalBatches - 1) {
      await delay(opts.delayMs);
    }
  }
  
  return results;
}

/**
 * Process items with concurrency limit
 * 
 * @example
 * ```typescript
 * const urls = [...]; // 30,000 URLs
 * 
 * const metadata = await batchWithConcurrency(
 *   urls,
 *   async (url) => await fetchMetadata(url),
 *   { maxConcurrent: 10 }
 * );
 * ```
 */
export async function batchWithConcurrency<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  options: BatchOptions = {}
): Promise<R[]> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const results: R[] = [];
  const executing: Promise<void>[] = [];
  
  for (const item of items) {
    const promise = processor(item).then((result) => {
      results.push(result);
      executing.splice(executing.indexOf(promise), 1);
    });
    
    executing.push(promise);
    
    if (executing.length >= opts.maxConcurrent) {
      await Promise.race(executing);
    }
  }
  
  await Promise.all(executing);
  return results;
}

/**
 * Chunk array into batches
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Delay helper
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Format milliseconds to human-readable duration
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}
