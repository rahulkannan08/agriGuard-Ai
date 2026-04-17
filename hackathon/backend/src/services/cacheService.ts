import { LRUCache } from 'lru-cache';
import crypto from 'crypto';
import { AnalysisResult } from '../lib/types';

const cache = new LRUCache<string, AnalysisResult>({
  max: 100,              // Max 100 cached predictions
  ttl: 1000 * 60 * 30,   // 30 minute TTL
});

export function getCachedPrediction(imageBase64: string): AnalysisResult | undefined {
  const hash = hashImage(imageBase64);
  return cache.get(hash);
}

export function cachePrediction(imageBase64: string, result: AnalysisResult): void {
  const hash = hashImage(imageBase64);
  cache.set(hash, result);
}

export function clearCache(): void {
  cache.clear();
}

export function getCacheStats() {
  return {
    size: cache.size,
    max: cache.max,
  };
}

function hashImage(imageBase64: string): string {
  return crypto.createHash('md5').update(imageBase64).digest('hex');
}
