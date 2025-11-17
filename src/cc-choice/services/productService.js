/**
 * Product Service
 *
 * @module services/productService
 * @description Fetches product data from Shopify product JSON endpoint with in-memory caching
 *
 * @public fetchProduct(handle: string) → Promise<Product>
 *
 * @example
 * import { fetchProduct } from './services/productService.js';
 * const product = await fetchProduct('my-product-handle');
 * console.log(product.title, product.variants);
 */

// ========================================
// CACHE CONFIGURATION
// ========================================

/**
 * In-memory product cache for fast reopens (<120ms)
 * @type {Map<string, Product>}
 */
const productCache = new Map();

/**
 * Maximum number of products to cache (LRU eviction)
 * @type {number}
 */
const MAX_CACHE_SIZE = 10;

// ========================================
// PUBLIC API
// ========================================

/**
 * Fetch product data from Shopify product JSON endpoint
 *
 * Uses in-memory cache for fast reopens. Cache has a maximum size
 * with LRU (Least Recently Used) eviction strategy.
 *
 * @param {string} handle - Product handle (URL-safe identifier)
 * @returns {Promise<Product>} Product JSON object from Shopify
 * @throws {Error} If product not found or fetch fails
 *
 * @example
 * const product = await fetchProduct('birthday-card-frogs');
 * // Returns: { id, title, handle, variants: [...], featured_image, ... }
 */
export async function fetchProduct(handle) {
  // Check cache first (fast <120ms reopens)
  if (productCache.has(handle)) {
    // Move to end (LRU: mark as recently used)
    const product = productCache.get(handle);
    productCache.delete(handle);
    productCache.set(handle, product);
    return product;
  }

  // Fetch from Shopify product JSON endpoint
  const response = await fetch(`/products/${handle}.js`);

  if (!response.ok) {
    throw new Error(`Product not found: ${handle}`);
  }

  const product = await response.json();

  // Cache product (LRU eviction if full)
  if (productCache.size >= MAX_CACHE_SIZE) {
    // Delete oldest entry (first key in Map)
    const firstKey = productCache.keys().next().value;
    productCache.delete(firstKey);
  }
  productCache.set(handle, product);

  return product;
}

/**
 * Clear the product cache (useful for testing or after major catalog updates)
 *
 * @example
 * clearProductCache();
 */
export function clearProductCache() {
  productCache.clear();
}

/**
 * Get current cache size (useful for debugging)
 *
 * @returns {number} Number of cached products
 *
 * @example
 * console.log(`Cache has ${getProductCacheSize()} products`);
 */
export function getProductCacheSize() {
  return productCache.size;
}
