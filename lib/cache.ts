/**
 * Client-side cache utility for API responses
 * Reduces unnecessary API calls while maintaining data consistency
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  version: number;
}

const CACHE_VERSION = 1;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes default

class ClientCache {
  private storage: Storage;
  private cacheKeys = {
    settings: 'cache:settings',
    models: 'cache:models',
    providers: 'cache:providers',
    enabledModels: 'cache:models:enabled',
  };

  constructor() {
    this.storage = typeof window !== 'undefined' ? localStorage : ({} as Storage);
  }

  /**
   * Get cached data if valid
   */
  get<T>(key: string, maxAge: number = CACHE_DURATION): T | null {
    try {
      const cached = this.storage.getItem(key);
      if (!cached) return null;

      const entry: CacheEntry<T> = JSON.parse(cached);
      
      // Check version
      if (entry.version !== CACHE_VERSION) {
        this.storage.removeItem(key);
        return null;
      }

      // Check expiration
      const age = Date.now() - entry.timestamp;
      if (age > maxAge) {
        this.storage.removeItem(key);
        return null;
      }

      return entry.data;
    } catch (e) {
      console.error('Cache get error:', e);
      return null;
    }
  }

  /**
   * Set cache data
   */
  set<T>(key: string, data: T): void {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        version: CACHE_VERSION,
      };
      this.storage.setItem(key, JSON.stringify(entry));
    } catch (e) {
      console.error('Cache set error:', e);
    }
  }

  /**
   * Invalidate specific cache
   */
  invalidate(key: string): void {
    try {
      this.storage.removeItem(key);
    } catch (e) {
      console.error('Cache invalidate error:', e);
    }
  }

  /**
   * Invalidate all related caches
   */
  invalidateAll(): void {
    Object.values(this.cacheKeys).forEach(key => this.invalidate(key));
  }

  /**
   * Get cache key helpers
   */
  keys() {
    return this.cacheKeys;
  }
}

export const cache = new ClientCache();

/**
 * Fetcher with cache support
 */
export async function cachedFetcher<T>(
  url: string,
  cacheKey?: string,
  maxAge?: number
): Promise<T> {
  // Try cache first
  if (cacheKey) {
    const cached = cache.get<T>(cacheKey, maxAge);
    if (cached !== null) {
      return cached;
    }
  }

  // Fetch from API
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();

  // Update cache
  if (cacheKey) {
    cache.set(cacheKey, data);
  }

  return data;
}
