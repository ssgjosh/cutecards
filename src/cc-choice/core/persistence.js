/**
 * Persistence Service
 *
 * @module core/persistence
 * @description Manages localStorage for saved personalizations
 *
 * @public savePersonalization(handle, variantId, data) → void
 * @public loadPersonalization(handle, variantId) → object | null
 * @public clearPersonalization(handle, variantId) → void
 * @public clearExpiredPersonalizations() → void
 *
 * @example
 * import { savePersonalization, loadPersonalization } from './core/persistence.js';
 *
 * // Save personalization
 * savePersonalization('frog-birthday', 12345, {
 *   insideMessage: 'Happy Birthday!',
 *   fontFamily: 'Playfair Display',
 *   fontSize: 'medium',
 *   textColor: '#1A1A1A'
 * });
 *
 * // Load personalization
 * const saved = loadPersonalization('frog-birthday', 12345);
 * if (saved) {
 *   console.log('Restored:', saved.insideMessage);
 * }
 */

const DEBUG = new URLSearchParams(window.location.search).has('debug') || window.ccDebug;

const debug = {
  log: (...args) => DEBUG && console.log(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args)
};

const STORAGE_PREFIX = 'cc-pers-';
const STORAGE_EXPIRY_DAYS = 7;

/**
 * Generates storage key from product handle and variant ID
 *
 * @private
 * @param {string} handle - Product handle
 * @param {number} variantId - Variant ID
 * @returns {string} Storage key
 */
function getStorageKey(handle, variantId) {
  return `${STORAGE_PREFIX}${handle}-${variantId}`;
}

/**
 * Saves personalization data to localStorage with expiry
 *
 * @param {string} handle - Product handle
 * @param {number} variantId - Variant ID
 * @param {object} data - Personalization data to save
 */
export function savePersonalization(handle, variantId, data) {
  try {
    const key = getStorageKey(handle, variantId);
    const payload = {
      data: data,
      timestamp: Date.now(),
      expiresAt: Date.now() + (STORAGE_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
    };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch (error) {
    debug.warn('[CC Choice] Failed to save personalization:', error);
  }
}

/**
 * Loads personalization data from localStorage (if not expired)
 *
 * @param {string} handle - Product handle
 * @param {number} variantId - Variant ID
 * @returns {object|null} Personalization data or null if not found/expired
 */
export function loadPersonalization(handle, variantId) {
  try {
    const key = getStorageKey(handle, variantId);
    const stored = localStorage.getItem(key);
    if (!stored) return null;

    const payload = JSON.parse(stored);

    // Check if expired
    if (Date.now() > payload.expiresAt) {
      localStorage.removeItem(key);
      return null;
    }

    return payload.data;
  } catch (error) {
    debug.warn('[CC Choice] Failed to load personalization:', error);
    return null;
  }
}

/**
 * Clears personalization data for specific product/variant
 *
 * @param {string} handle - Product handle
 * @param {number} variantId - Variant ID
 */
export function clearPersonalization(handle, variantId) {
  try {
    const key = getStorageKey(handle, variantId);
    localStorage.removeItem(key);
  } catch (error) {
    debug.warn('[CC Choice] Failed to clear personalization:', error);
  }
}

/**
 * Clears all expired personalization data from localStorage
 * Should be called on page load to clean up old data
 */
export function clearExpiredPersonalizations() {
  try {
    const now = Date.now();
    const keysToRemove = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const payload = JSON.parse(stored);
            if (now > payload.expiresAt) {
              keysToRemove.push(key);
            }
          }
        } catch (error) {
          // Invalid JSON - remove it
          keysToRemove.push(key);
        }
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));

    if (keysToRemove.length > 0) {
      debug.log(`[CC Choice] Cleared ${keysToRemove.length} expired personalizations`);
    }
  } catch (error) {
    debug.warn('[CC Choice] Failed to clear expired personalizations:', error);
  }
}
