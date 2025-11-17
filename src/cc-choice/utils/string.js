/**
 * String Utilities
 *
 * @module utils/string
 * @description Pure string manipulation functions
 *
 * @public normalizeText(text: string) → string
 * @public escapeHtml(text: string) → string
 *
 * @example
 * import { normalizeText, escapeHtml } from './utils/string.js';
 * const cleaned = normalizeText(userInput); // Normalizes line breaks, trims whitespace
 * const safe = escapeHtml(userInput); // Escapes HTML special characters
 */

/**
 * Normalizes text input by converting line breaks and trimming whitespace
 *
 * @param {string} text - Raw text input
 * @returns {string} Normalized text with Unix line breaks and trimmed whitespace
 */
export function normalizeText(text) {
  return text
    .replace(/\r\n/g, '\n')  // Normalize Windows line breaks
    .replace(/\r/g, '\n')    // Normalize old Mac line breaks
    .trim();                 // Remove leading/trailing whitespace
}

/**
 * Escape HTML special characters
 *
 * Prevents XSS by escaping <, >, &, ", and ' characters.
 * Uses browser's native text node escaping for safety.
 *
 * @param {string} text - Text to escape
 * @returns {string} HTML-safe escaped text
 *
 * @example
 * escapeHtml('<script>alert("xss")</script>');
 * // Returns: '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
 */
export function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
