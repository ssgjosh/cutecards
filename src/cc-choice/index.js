/**
 * Cute Cards Choice Modal - Entry Point
 *
 * @module cc-choice
 * @description Thin orchestrator for modal system
 *
 * Responsibilities:
 * - Custom element registration
 * - Grid click interception
 * - Product prefetch on hover
 * - History management (back button)
 *
 * Business logic lives in:
 * - core/CCChoiceModal.js (modal orchestrator)
 * - services/* (data/API)
 * - views/* (DOM rendering + binding)
 * - utils/* (pure functions)
 */

// ========================================
// MODULE IMPORTS
// ========================================

import CCChoiceModal from './core/CCChoiceModal.js';
import { clearExpiredPersonalizations } from './core/persistence.js';

// ========================================
// DEBUG CONFIGURATION
// ========================================

// Enable debug logging by adding ?cc_debug=1 to URL or setting window.ccDebug = true
const DEBUG = new URLSearchParams(window.location.search).has('cc_debug') || window.ccDebug === true;

// Debug-aware console wrapper
const debug = {
  log: (...args) => DEBUG && console.log(...args),
  warn: (...args) => DEBUG && console.warn(...args),
  error: (...args) => console.error(...args) // Always show errors
};

// ========================================
// INITIALIZATION
// ========================================

// Clear expired personalization data on page load
clearExpiredPersonalizations();

// Register custom element
customElements.define('cc-choice-modal', CCChoiceModal);

// ========================================
// GRID INTERCEPTION (Click Hijacking)
// ========================================

function attachClickInterceptor() {
  document.addEventListener('click', (e) => {
    // Allow browser defaults: Cmd/Ctrl/Shift/middle-click
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) {
      return; // Let browser handle modifier clicks
    }

    const cardLink = e.target.closest('[data-cc-card]');
    if (!cardLink) return;

    // Intercept the click IMMEDIATELY
    e.preventDefault();
    e.stopImmediatePropagation();
    e.stopPropagation(); // Also stop bubble phase

    const modal = document.querySelector('cc-choice-modal');
    if (!modal) {
      debug.error('[CC Choice] Modal not found in DOM');
      // Fallback: allow navigation
      window.location.href = cardLink.href;
      return;
    }

    // Pre-load metafield data from card element's data attribute
    const handle = cardLink.dataset.ccHandle;
    const variantSkusJson = cardLink.dataset.ccVariantSkus;
    if (variantSkusJson) {
      try {
        const variantSkus = JSON.parse(variantSkusJson);
        window.prodigiVariantSkus = window.prodigiVariantSkus || {};
        window.prodigiVariantSkus[handle] = variantSkus;
        debug.log('[CC Choice] Loaded SKU data from card element for:', handle, variantSkus);
      } catch (err) {
        debug.error('[CC Choice] Failed to parse variant SKUs from card element:', err);
      }
    } else {
      debug.log('[CC Choice] No variant SKU data on card element for:', handle);
    }

    // Check if this click is from a recommendation rail
    const isFromRecs = cardLink.closest('.cc-recs') !== null;

    modal.show({
      handle: handle,
      productUrl: cardLink.href,
      opener: cardLink,
      fromRecs: isFromRecs
    });
  }, true); // Capture phase - intercept before other handlers
}

// Attach as early as possible
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', attachClickInterceptor);
} else {
  // DOM already ready, attach immediately
  attachClickInterceptor();
}

// ========================================
// PREFETCH ON HOVER/FOCUS (<120ms target)
// ========================================

const prefetchCache = new Set();

function prefetchProduct(handle) {
  if (!handle || prefetchCache.has(handle)) return;

  prefetchCache.add(handle);

  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = `/products/${handle}.js`;
  link.as = 'fetch';
  document.head.appendChild(link);
}

function attachPrefetchHandlers() {
  const cards = document.querySelectorAll('[data-cc-card]');

  cards.forEach(card => {
    const handle = card.dataset.ccHandle;
    if (!handle) return;

    // Prefetch on hover (desktop)
    card.addEventListener('mouseenter', () => {
      prefetchProduct(handle);
    }, { once: true, passive: true });

    // Prefetch on focus (keyboard navigation)
    card.addEventListener('focus', () => {
      prefetchProduct(handle);
    }, { once: true, passive: true });
  });
}

// Attach prefetch handlers
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', attachPrefetchHandlers);
} else {
  attachPrefetchHandlers();
}

// Re-attach after AJAX page updates (for infinite scroll, filters, etc.)
if (typeof window.MutationObserver !== 'undefined') {
  const observer = new MutationObserver(() => {
    attachPrefetchHandlers();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

// ========================================
// HISTORY MANAGEMENT (Back Button)
// ========================================

window.addEventListener('popstate', (e) => {
  const modal = document.querySelector('cc-choice-modal');
  if (modal && !modal.hasAttribute('hidden')) {
    // PREMIUM FEEL: Properly close modal with full cleanup (position, top, width, scroll)
    // Use the hide() method to ensure all body styles are restored
    modal.hide();
  }
});
