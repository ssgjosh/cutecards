/**
 * Cart Service
 *
 * @module services/cartService
 * @description Pure cart API operations (no DOM manipulation)
 *
 * @public addToCart(payload: CartPayload) → Promise<CartResponse>
 *
 * @typedef {Object} CartPayload
 * @property {number|string} id - Variant ID
 * @property {number} quantity - Quantity to add
 * @property {Object} properties - Line item properties (personalization, SKUs, etc.)
 *
 * @typedef {Object} CartResponse
 * @property {number} id - Item ID in cart
 * @property {number} price - Price in cents
 * @property {string} title - Product title
 * @property {number} quantity - Quantity added
 *
 * @example
 * import { addToCart } from './services/cartService.js';
 *
 * const result = await addToCart({
 *   id: 12345,
 *   quantity: 1,
 *   properties: { 'Inside Message': 'Happy Birthday!' }
 * });
 */

// ========================================
// DEBUG CONFIGURATION
// ========================================

const DEBUG = new URLSearchParams(window.location.search).has('cc_debug') || window.ccDebug === true;

const debug = {
  log: (...args) => DEBUG && console.log(...args),
  error: (...args) => console.error(...args) // Always show errors
};

// ========================================
// PUBLIC API
// ========================================

/**
 * Add item to cart via Shopify Ajax Cart API
 *
 * @param {CartPayload} payload - Cart add payload
 * @returns {Promise<CartResponse>} Cart response from Shopify
 * @throws {Error} If cart add fails
 *
 * @example
 * const result = await addToCart({
 *   id: 12345,
 *   quantity: 1,
 *   properties: {
 *     'Inside Message': 'Happy Birthday!',
 *     'Font Family': 'Playfair Display',
 *     '_prodigi_sku': 'PRD-123'
 *   }
 * });
 */
export async function addToCart(payload) {
  debug.log('[Cart Service] Adding to cart with payload:', payload);

  const response = await fetch('/cart/add.js', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.description || 'Could not add to cart');
  }

  debug.log('[Cart Service] Successfully added to cart:', result);
  return result;
}
