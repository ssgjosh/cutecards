/**
 * Recommendations Integration
 *
 * @module integrations/recsIntegration
 * @description Bridges CC Choice modal with window.ccRecs recommendation engine
 *
 * @public initializeRecommendationRail(product: Product) → void
 *
 * @typedef {Object} Product
 * @property {string} handle - Product handle
 * @property {string|string[]} tags - Product tags (structured)
 *
 * @example
 * import { initializeRecommendationRail } from './integrations/recsIntegration.js';
 *
 * initializeRecommendationRail(productData);
 * // Creates and renders recommendation rail in #cc-recs-container
 */

// ========================================
// DEBUG CONFIGURATION
// ========================================

const DEBUG = new URLSearchParams(window.location.search).has('cc_debug') || window.ccDebug === true;

const debug = {
  warn: (...args) => DEBUG && console.warn(...args)
};

// ========================================
// PUBLIC API
// ========================================

/**
 * Initialize and render recommendation rail
 *
 * Checks if window.ccRecs is loaded, parses product tags into structured format,
 * and renders recommendations into #cc-recs-container.
 *
 * Gracefully degrades if recommendation engine not loaded.
 *
 * @param {Product} product - Product data with handle and tags
 *
 * @example
 * initializeRecommendationRail({
 *   handle: 'birthday-card-frog',
 *   tags: ['interest:frogs', 'occasion:birthday', 'style:cute']
 * });
 */
export function initializeRecommendationRail(product) {
  // Check if cc-recs is loaded
  if (typeof window.ccRecs === 'undefined') {
    debug.warn('[Recs Integration] Recommendation engine not loaded');
    return;
  }

  if (!product || !product.tags) return;

  // Parse product tags to pass to rail
  const tags = Array.isArray(product.tags)
    ? product.tags
    : (product.tags || '').split(',').map(t => t.trim());

  const parsedTags = {
    interest: [],
    occasion: [],
    recipient: [],
    style: [],
    humour: []
  };

  tags.forEach(tag => {
    const tagLower = tag.toLowerCase().trim();
    const parts = tagLower.split(':');

    if (parts.length === 2) {
      const [category, value] = parts;
      if (parsedTags.hasOwnProperty(category)) {
        parsedTags[category].push(value);
      }
    }
  });

  // Create and render rail
  const rail = window.ccRecs.createRail('#cc-recs-container');
  if (rail) {
    rail.render(product.handle, parsedTags);
  }
}
