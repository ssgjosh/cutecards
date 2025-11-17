/**
 * Cart Drawer Integration
 *
 * @module integrations/cartDrawer
 * @description Handles cart drawer refresh and success UI after cart operations
 *
 * @public showSuccessBanner(dialogElement: HTMLElement) → void
 * @public transformButtonToSuccess(button: HTMLElement) → void
 * @public openCartDrawerOrRedirect() → Promise<void>
 *
 * @example
 * import { showSuccessBanner, transformButtonToSuccess, openCartDrawerOrRedirect } from './integrations/cartDrawer.js';
 *
 * // After successful cart add:
 * showSuccessBanner(dialogElement);
 * transformButtonToSuccess(submitButton);
 * await openCartDrawerOrRedirect();
 */

import { formatPrice } from '../utils/format.js';

// ========================================
// DEBUG CONFIGURATION
// ========================================

const DEBUG = new URLSearchParams(window.location.search).has('cc_debug') || window.ccDebug === true;

const debug = {
  log: (...args) => DEBUG && console.log(...args),
  error: (...args) => console.error(...args)
};

// ========================================
// PUBLIC API
// ========================================

/**
 * Show success banner at top of dialog
 *
 * Creates and inserts a success banner with checkmark icon.
 * The banner will auto-animate via CSS.
 *
 * @param {HTMLElement} dialogElement - Dialog element to insert banner into
 *
 * @example
 * const dialog = document.querySelector('[role="dialog"]');
 * showSuccessBanner(dialog);
 */
export function showSuccessBanner(dialogElement) {
  if (!dialogElement) return;

  // Create success message
  const successMessage = document.createElement('div');
  successMessage.className = 'ccc__success-banner';
  successMessage.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
    <span>Added to basket!</span>
  `;

  // Insert success banner at top of dialog
  dialogElement.insertBefore(successMessage, dialogElement.firstChild);

  // Animate success banner
  requestAnimationFrame(() => {
    successMessage.style.animation = 'successSlideDown 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards';
  });
}

/**
 * Transform button to success state
 *
 * Changes button to show checkmark and "Added!" text.
 * Button will be disabled and get .button--success class.
 *
 * @param {HTMLElement} button - Button element to transform
 *
 * @example
 * const submitBtn = document.querySelector('[type="submit"]');
 * transformButtonToSuccess(submitBtn);
 */
export function transformButtonToSuccess(button) {
  if (!button) return;

  button.disabled = true;
  button.classList.add('button--success');
  button.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
    <span>Added!</span>
  `;
}

/**
 * Open cart drawer or redirect to cart page
 *
 * Attempts to:
 * 1. Find cart-drawer custom element
 * 2. Refresh cart contents via /cart.js
 * 3. Call renderContents() and open() methods
 * 4. Fallback: redirect to /cart if no drawer
 *
 * @returns {Promise<void>}
 *
 * @example
 * await openCartDrawerOrRedirect();
 * // Cart drawer opens, or user is redirected to /cart
 */
export async function openCartDrawerOrRedirect() {
  const cartDrawer = document.querySelector('cart-drawer');

  if (cartDrawer) {
    try {
      // Refresh cart data
      const response = await fetch('/cart.js');
      await response.json();

      // Render updated cart contents
      if (typeof cartDrawer.renderContents === 'function') {
        cartDrawer.renderContents();
      }

      // Open the drawer
      if (typeof cartDrawer.open === 'function') {
        cartDrawer.open();
      }
    } catch (err) {
      debug.error('[Cart Drawer] Failed to refresh cart:', err);
      // Fallback: just open drawer without refresh
      if (typeof cartDrawer.open === 'function') {
        cartDrawer.open();
      }
    }
  } else {
    // No cart drawer element found - redirect to cart page
    debug.log('[Cart Drawer] No cart drawer found, redirecting to /cart');
    window.location.href = '/cart';
  }
}
