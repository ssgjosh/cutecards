/**
 * Metafield Service
 *
 * @module services/metafieldService
 * @description Fetches Prodigi SKU metafields from Shopify Storefront API with sessionStorage caching
 *
 * @public fetchVariantMetafields(handle: string) → Promise<VariantSkuMap>
 * @public getVariantSkus(variantSkuMap: VariantSkuMap, variantId: string|number) → SkuPair | null
 *
 * @typedef {Object} SkuPair
 * @property {string|null} sku_bla - SKU for "Mail to me" (blank envelope)
 * @property {string|null} sku_dir - SKU for "Send direct" (addressed envelope)
 *
 * @typedef {Object.<string, SkuPair>} VariantSkuMap - Map of variant IDs to SKU pairs
 *
 * @example
 * import { fetchVariantMetafields, getVariantSkus } from './services/metafieldService.js';
 *
 * const skuMap = await fetchVariantMetafields('birthday-card-frog');
 * const skus = getVariantSkus(skuMap, 12345);
 * console.log(skus.sku_bla, skus.sku_dir);
 */

// ========================================
// DEBUG CONFIGURATION
// ========================================

const DEBUG = new URLSearchParams(window.location.search).has('cc_debug') || window.ccDebug === true;

const debug = {
  log: (...args) => DEBUG && console.log(...args),
  warn: (...args) => DEBUG && console.warn(...args),
  error: (...args) => console.error(...args) // Always show errors
};

// ========================================
// CACHE CONFIGURATION
// ========================================

/**
 * Cache TTL for metafield data (30 minutes)
 * @type {number}
 */
const CACHE_TTL_MS = 30 * 60 * 1000;

// ========================================
// PUBLIC API
// ========================================

/**
 * Fetch variant metafields (Prodigi SKUs) for a product
 *
 * Attempts three data sources in order of preference:
 * 1. Liquid-injected data (window.prodigiVariantSkus)
 * 2. sessionStorage cache (30min TTL)
 * 3. Shopify Storefront API (GraphQL)
 *
 * @param {string} handle - Product handle
 * @returns {Promise<VariantSkuMap>} Map of variant IDs to {sku_bla, sku_dir} pairs
 *
 * @example
 * const skuMap = await fetchVariantMetafields('birthday-card-frog');
 * // Returns: { "12345": { sku_bla: "PRD-123", sku_dir: "PRD-456" }, ... }
 */
export async function fetchVariantMetafields(handle) {
  // Check if data was injected via Liquid (most reliable method)
  if (window.prodigiVariantSkus && window.prodigiVariantSkus[handle]) {
    debug.log('[CC Choice] Using Liquid-injected metafield data for:', handle);
    debug.log('[CC Choice] Injected SKU data:', window.prodigiVariantSkus[handle]);
    return window.prodigiVariantSkus[handle];
  }

  // Check sessionStorage cache second (for cached API responses)
  const cacheKey = `prodigi_skus_${handle}`;
  const cached = sessionStorage.getItem(cacheKey);

  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      // Check if cache is less than 30 minutes old
      if (Date.now() - parsed.timestamp < CACHE_TTL_MS) {
        debug.log('[CC Choice] Using cached metafield data for:', handle);
        return parsed.data;
      }
    } catch (e) {
      debug.warn('[CC Choice] Invalid metafield cache:', e);
    }
  }

  try {
    debug.log('[CC Choice] Fetching metafields via Storefront API for:', handle);

    // Fetch product data with metafields via Storefront API
    const query = `
      {
        product(handle: "${handle}") {
          variants(first: 20) {
            edges {
              node {
                id
                sku_bla: metafield(namespace: "custom", key: "sku_bla") {
                  value
                }
                sku_dir: metafield(namespace: "custom", key: "sku_dir") {
                  value
                }
              }
            }
          }
        }
      }
    `;

    const response = await fetch('/api/2024-10/graphql.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ query: query })
    });

    if (!response.ok) {
      throw new Error(`Storefront API error: ${response.status}`);
    }

    const result = await response.json();
    debug.log('[CC Choice] Storefront API response:', result);

    if (result.errors) {
      debug.error('[CC Choice] GraphQL errors:', result.errors);
      return null;
    }

    // Transform to variant ID → SKU mapping
    const skuMap = {};
    const variants = result.data?.product?.variants?.edges || [];

    debug.log('[CC Choice] Found variants:', variants.length);

    variants.forEach(edge => {
      const node = edge.node;
      // Extract numeric ID from gid://shopify/ProductVariant/12345
      const numericId = node.id.split('/').pop();

      skuMap[numericId] = {
        sku_bla: node.sku_bla?.value || null,
        sku_dir: node.sku_dir?.value || null
      };

      debug.log(`[CC Choice] Variant ${numericId}:`, {
        sku_bla: node.sku_bla?.value,
        sku_dir: node.sku_dir?.value
      });
    });

    debug.log('[CC Choice] Final SKU map:', skuMap);

    // Cache for session
    const cacheData = {
      data: skuMap,
      timestamp: Date.now()
    };
    sessionStorage.setItem(cacheKey, JSON.stringify(cacheData));

    return skuMap;

  } catch (error) {
    debug.error('[CC Choice] Failed to fetch variant metafields:', error);
    return null;
  }
}

/**
 * Get SKU pair for a specific variant
 *
 * Pure accessor function - extracts SKUs for a variant from the map.
 *
 * @param {VariantSkuMap} variantSkuMap - Map of variant IDs to SKU pairs
 * @param {string|number} variantId - Variant ID (numeric or string)
 * @returns {SkuPair|null} {sku_bla, sku_dir} or null if not found
 *
 * @example
 * const skus = getVariantSkus(skuMap, 12345);
 * if (skus) {
 *   console.log('Mail to me:', skus.sku_bla);
 *   console.log('Send direct:', skus.sku_dir);
 * }
 */
export function getVariantSkus(variantSkuMap, variantId) {
  if (!variantSkuMap || !variantId) return null;
  return variantSkuMap[variantId] || null;
}

/**
 * Clear metafield cache for a specific product or all products
 *
 * @param {string} [handle] - Product handle (if omitted, clears all metafield caches)
 *
 * @example
 * clearMetafieldCache('birthday-card-frog'); // Clear one product
 * clearMetafieldCache(); // Clear all
 */
export function clearMetafieldCache(handle) {
  if (handle) {
    const cacheKey = `prodigi_skus_${handle}`;
    sessionStorage.removeItem(cacheKey);
  } else {
    // Clear all prodigi_skus_* keys
    const keys = Object.keys(sessionStorage);
    keys.forEach(key => {
      if (key.startsWith('prodigi_skus_')) {
        sessionStorage.removeItem(key);
      }
    });
  }
}
