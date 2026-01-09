// =============================================================================
// RTR MRP - CACHE LAYER
// Uses in-memory cache (Redis disabled for Render compatibility)
// =============================================================================

// Re-export everything from memory-cache
export * from './memory-cache';
export { default } from './memory-cache';

// Log that we're using memory cache
if (typeof console !== 'undefined' && process.env.NODE_ENV !== 'test') {
  console.log('[CACHE] Using in-memory cache (Redis disabled)');
}
