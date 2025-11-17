/**
 * Formatting Utilities
 *
 * @module utils/format
 * @description Pure formatting functions (prices, numbers, etc.)
 *
 * @public formatPrice(cents: number) → string
 *
 * @example
 * import { formatPrice } from './utils/format.js';
 * console.log(formatPrice(399)); // "£3.99"
 */

/**
 * Formats price in pence/cents to GBP string
 *
 * @param {number} cents - Price in pence (e.g., 399 for £3.99)
 * @returns {string} Formatted price with £ symbol (e.g., "£3.99")
 */
export function formatPrice(cents) {
  return `£${(cents / 100).toFixed(2)}`;
}
