/**
 * SWR Configuration with caching strategy
 * Reduces unnecessary API calls while keeping data fresh
 */

import { cache, cachedFetcher } from './cache';
import type { SWRConfiguration } from 'swr';

// Default SWR configuration
export const swrConfig: SWRConfiguration = {
  // Revalidate when window gets focus
  revalidateOnFocus: false,
  
  // Revalidate when user comes back online
  revalidateOnReconnect: true,
  
  // Don't revalidate on mount if data exists
  revalidateIfStale: true,
  
  // Keep previous data while revalidating
  keepPreviousData: true,
  
  // Dedupe requests within 2 seconds
  dedupingInterval: 2000,
  
  // Retry on error
  errorRetryCount: 3,
  errorRetryInterval: 5000,
  
  // Cache time: 5 minutes for most data
  focusThrottleInterval: 5000,
};

// Specific configurations for different data types
export const settingsConfig: SWRConfiguration = {
  ...swrConfig,
  // Settings change less frequently, can cache longer
  revalidateIfStale: false,
  dedupingInterval: 10000, // 10 seconds
};

export const modelsConfig: SWRConfiguration = {
  ...swrConfig,
  // Models can be cached, but should refresh when settings might have changed
  revalidateIfStale: true,
  dedupingInterval: 5000, // 5 seconds
};

export const providersConfig: SWRConfiguration = {
  ...swrConfig,
  // Providers rarely change
  revalidateIfStale: false,
  dedupingInterval: 10000, // 10 seconds
};

// Helper to create fetcher with cache invalidation callback
export function createCachedFetcher<T>(cacheKey: string, maxAge?: number) {
  return async (url: string) => {
    const data = await cachedFetcher<T>(url, cacheKey, maxAge);
    return data;
  };
}

// Helper to invalidate cache after mutation
export function invalidateCacheAfterMutation(keys: string[]) {
  keys.forEach(key => cache.invalidate(key));
}
