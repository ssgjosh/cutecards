/**
 * Analytics Service
 *
 * @module core/analytics
 * @description Tracks user events to GA4 and Shopify Analytics
 *
 * @public trackEvent(eventName: string, properties: object) → void
 *
 * @example
 * import { trackEvent } from './core/analytics.js';
 * trackEvent('cc_size_select', { variant_id: 123, price: 399 });
 */

const DEBUG = new URLSearchParams(window.location.search).has('debug') || window.ccDebug;

const debug = {
  log: (...args) => DEBUG && console.log(...args),
  error: (...args) => console.error(...args)
};

/**
 * Tracks an event to Google Analytics (GA4) and Shopify Analytics
 *
 * @param {string} eventName - Event name (should be prefixed with cc_*)
 * @param {object} properties - Event properties/parameters
 */
export function trackEvent(eventName, properties = {}) {
  // GA4 / Google Analytics tracking
  if (typeof gtag !== 'undefined') {
    gtag('event', eventName, properties);
  }

  // Shopify Analytics
  if (typeof window.ShopifyAnalytics !== 'undefined') {
    window.ShopifyAnalytics.lib.track(eventName, properties);
  }

  debug.log('[CC Analytics]', eventName, properties);
}
