/**
 * CCChoiceModal - Custom Element
 *
 * @module core/CCChoiceModal
 * @description Main modal orchestrator for Cute Cards choice and personalization
 *
 * @public show(config) → void - Opens modal with product config
 * @public hide() → void - Closes modal and restores state
 *
 * @example
 * const modal = document.querySelector('cc-choice-modal');
 * modal.show({ handle: 'product-handle', opener: clickedElement });
 */

// ========================================
// MODULE IMPORTS
// ========================================

import { trackEvent } from './analytics.js';
import {
  savePersonalization,
  loadPersonalization,
  clearPersonalization
} from './persistence.js';
import {
  calculateOptimalLayout,
  applyLayoutToDOM,
  readLayoutConfig
} from './layout.js';
import { renderLoadingView } from '../views/loadingView.js';
import { buildPersonaliserHTML, bindPersonaliserViewHandlers } from '../views/personaliser-view.js';
import { fetchProduct } from '../services/productService.js';
import { fetchVariantMetafields, getVariantSkus } from '../services/metafieldService.js';
import { addToCart } from '../services/cartService.js';
import { generateMessageSuggestions } from '../services/aiService.js';
import { showSuccessBanner, transformButtonToSuccess, openCartDrawerOrRedirect } from '../integrations/cartDrawer.js';
import { renderChoiceView, bindChoiceViewHandlers, injectMobileFooter } from '../views/choiceView.js';
import { renderDeliverySection } from '../views/deliverySection.js';
import { loadAllGoogleFonts, loadGoogleFont, initializeCardPreview, renderCardPreview } from '../views/messageField.js';
import { initializeRecommendationRail } from '../integrations/recsIntegration.js';
import { formatPrice } from '../utils/format.js';
import { normalizeText, escapeHtml } from '../utils/string.js';
import { showConfirmDialog } from '../utils/dialog.js';

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
// UTILITY FUNCTIONS
// ========================================

function showError(errorContainer, message) {
  if (!errorContainer) return;
  errorContainer.textContent = message;
  errorContainer.hidden = false;
}

function clearError(errorContainer) {
  if (!errorContainer) return;
  errorContainer.textContent = '';
  errorContainer.hidden = true;
}

function setupCharacterCounter(field, counter) {
  if (!field || !counter) return;

  const limit = parseInt(field.dataset.ccLimit, 10);

  function updateCounter() {
    const length = field.value.length;
    counter.textContent = `${length}/${limit}`;
  }

  field.addEventListener('input', updateCounter);
  updateCounter(); // Initialize
}

// ========================================
// CCHOICEMODAL CLASS
// ========================================

class CCChoiceModal extends HTMLElement {
  constructor() {
    super();

    // Product data loaded from .js endpoint
    this.productData = null;
    this.selectedVariantId = null;
    this.variantSkuMap = null;

    // For focus restoration on close
    this.opener = null;

    // Optimal layout caching
    this._cachedLayout = null;
    this._resizeObserver = null;
    this._resizeDebounce = null;
  }

  connectedCallback() {
    // The modal is inserted into the DOM by theme.liquid;
    // we don't need to build the DOM here, just reference elements.
    this.modalElement = this; // Wrapper
    this.dialog = this.querySelector("[data-ccc-dialog]");
    this.backdrop = this.querySelector("[data-ccc-backdrop]");
    this.body = this.querySelector("[data-ccc-body]");
    this.errorElement = this.querySelector("[data-ccc-error]");

    // Bind close handlers
    this.bindCloseHandlers();
  }

  bindCloseHandlers() {
    // Close button
    const closeBtn = this.querySelector("[data-ccc-close]");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => this.hide());
    }

    // Backdrop click
    if (this.backdrop) {
      this.backdrop.addEventListener("click", (e) => {
        if (e.target === this.backdrop) {
          this.hide();
        }
      });
    }
  }

  // Public method: Show modal
  async show({ handle, productUrl, opener = null, fromRecs = false }) {
    // Debug
    debug.log('[CC Choice] show() called with:', { handle, productUrl, opener, fromRecs });

    // Track where we came from (for focus restoration)
    this.opener = opener;

    // Clear any previous errors
    clearError(this.errorElement);

    // Show loading state
    this.body.innerHTML = renderLoadingView();

    // Show modal backdrop + dialog
    this.modalElement.hidden = false;
    this.modalElement.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    trackEvent('cc_modal_open', {
      product_handle: handle,
      source: fromRecs ? 'recommendations' : 'grid'
    });

    // History state (for back button)
    this.pushHistoryState(handle);

    // Fetch product data
    try {
      this.productData = await fetchProduct(handle);
      debug.log('[CC Choice] Product data loaded:', this.productData);

      // Load variant SKU map (for Prodigi)
      this.variantSkuMap = await this.loadVariantSkus();

      // Render the first view (choice view = size selection)
      this.buildChoiceView();

    } catch (err) {
      console.error('[CC Choice] Failed to load product:', err);
      showError(this.errorElement, 'Unable to load product details. Please try again.');
    }
  }

  // Public method: Hide modal
  hide() {
    debug.log('[CC Choice] hide() called');

    this.modalElement.hidden = true;
    this.modalElement.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';

    // Clear body content
    this.body.innerHTML = '';

    // Restore focus to the opener (grid card)
    if (this.opener && this.opener.focus) {
      this.opener.focus();
    }

    // Remove modal history state without navigating
    // Replace current state if it's a modal state, otherwise leave history alone
    if (window.history.state && window.history.state.ccModal) {
      window.history.replaceState(null, '', window.location.pathname);
    }

    trackEvent('cc_modal_close', {
      product_handle: this.productData?.handle
    });

    // Clear modal state
    this.productData = null;
    this.selectedVariantId = null;
    this.variantSkuMap = null;
    this.opener = null;
  }

  pushHistoryState(handle) {
    const url = `/products/${handle}`;
    if (!window.history.state || !window.history.state.ccModal) {
      window.history.pushState({ ccModal: true, handle }, '', url);
    }
  }

  async loadVariantSkus() {
    try {
      const skuMap = await fetchVariantMetafields(this.productData.handle);
      if (skuMap && Object.keys(skuMap).length > 0) {
        debug.log('[CC Choice] Loaded variant SKUs from metafields:', skuMap);
        return skuMap;
      }
    } catch (err) {
      debug.warn('[CC Choice] Metafield fetch failed:', err);
    }

    debug.warn('[CC Choice] No SKU map found for product:', this.productData.handle);
    return {};
  }

  // ========================================
  // VIEW: CHOICE (Size selection)
  // ========================================

  buildChoiceView() {
    debug.log('[CC Choice] buildChoiceView()');

    const product = this.productData;
    const variants = product.variants;

    // Check if we have a previously selected variant
    let preselectedVariantId = this.selectedVariantId;

    // If no variant selected yet, pick the first available one
    if (!preselectedVariantId && variants.length > 0) {
      preselectedVariantId = variants[0].id;
    }

    // Render choice view HTML
    const html = renderChoiceView({
      product: product,
      selectedVariantId: preselectedVariantId
    });
    this.body.innerHTML = html;

    // Initialize recommendation rail (if available)
    initializeRecommendationRail(product);

    // Bind event handlers via callback pattern
    requestAnimationFrame(() => {
      bindChoiceViewHandlers(this, {
        onVariantChange: (variantId) => {
          this.selectedVariantId = variantId;
          debug.log('[CC Choice] Variant changed to:', variantId);
        },
        onPersonalise: () => {
          debug.log('[CC Choice] Personalise button clicked');
          this.buildPersonaliserView();
        },
        onAddBlank: (variantId) => {
          debug.log('[CC Choice] Add blank clicked for variant:', variantId);
          this.handleBlankAdd(variantId);
        }
      });

      // Inject mobile footer if on mobile
      injectMobileFooter(this);

      // Setup layout management
      this.updateLayout();
      this.setupResizeListener();
    });
  }

  // ========================================
  // VIEW: PERSONALISER (Message + Typography)
  // ========================================

  buildPersonaliserView() {
    debug.log('[CC Choice] buildPersonaliserView()');

    const product = this.productData;
    const variant = product.variants.find(v => v.id === this.selectedVariantId);

    if (!variant) {
      console.error('[CC Choice] No variant selected!');
      return;
    }

    trackEvent('cc_personalise_open', {
      product_id: product.id,
      variant_id: variant.id,
      price: variant.price
    });

    // Load any saved personalization data
    const savedData = loadPersonalization(product.handle, variant.id);

    // Build HTML
    const html = buildPersonaliserHTML(product, variant, savedData);
    this.body.innerHTML = html;

    // Bind event handlers
    requestAnimationFrame(() => {
      bindPersonaliserViewHandlers(this, {
        product: this.productData,
        selectedVariantId: this.selectedVariantId,
        variantSkuMap: this.variantSkuMap
      }, {
        onBack: () => this.buildChoiceView(),
        onSubmit: (form) => this.handlePersonalisedAdd(form)
      });

      this.updateLayout();
      this.setupResizeListener();

      // Load Google Fonts for typography controls
      loadAllGoogleFonts();

      // Initialize canvas preview
      initializeCardPreview(this);
    });
  }

  // ========================================
  // CART ACTIONS
  // ========================================

  async handleBlankAdd(variantId) {
    debug.log('[CC Choice] handleBlankAdd() for variant:', variantId);

    const variant = this.productData.variants.find(v => v.id === variantId);
    if (!variant) {
      console.error('[CC Choice] Variant not found:', variantId);
      return;
    }

    // Build cart payload for blank card
    const payload = {
      id: variant.id,
      quantity: 1,
      properties: {
        'leave_blank': 'Yes',
        'Delivery Method': 'Mail2Me'
      }
    };

    // Get the "Add to basket" button
    const addButton = this.querySelector('[data-ccc-add-blank]');

    try {
      await addToCart(payload);

      trackEvent('cc_add_blank_success', {
        product_id: this.productData.id,
        variant_id: variant.id,
        price: variant.price
      });

      // Show success UI
      if (addButton) {
        transformButtonToSuccess(addButton);
      }
      showSuccessBanner(this.dialog);

      // Open cart drawer after brief delay
      setTimeout(() => {
        openCartDrawerOrRedirect();
        this.hide();
      }, 800);

    } catch (err) {
      console.error('[CC Choice] Add to cart failed:', err);
      showError(this.errorElement, 'Unable to add to cart. Please try again.');
    }
  }

  async handlePersonalisedAdd(form) {
    debug.log('[CC Choice] handlePersonalisedAdd()');
    debug.log('[CC Choice] Form element:', form);
    debug.log('[CC Choice] Form ID:', form?.id);
    debug.log('[CC Choice] Form action:', form?.action);

    const variant = this.productData.variants.find(v => v.id === this.selectedVariantId);
    if (!variant) {
      console.error('[CC Choice] No variant selected!');
      return;
    }

    // Extract form data
    const formData = new FormData(form);
    const insideMessage = formData.get('insideMessage') || '';
    const fontFamily = formData.get('fontFamily') || 'Playfair Display';
    const fontSize = formData.get('fontSize') || 'medium';
    const textColor = formData.get('textColor') || '#1A1A1A';
    const deliveryMethod = formData.get('deliveryMethod') || 'Mail2Me';
    const leaveBlank = formData.get('leave_blank') === 'on';

    debug.log('[CC Choice] Form data extracted:', {
      insideMessage: insideMessage.substring(0, 50) + '...',
      fontFamily,
      fontSize,
      textColor,
      deliveryMethod,
      leaveBlank
    });

    // Build cart properties
    const properties = {
      'Inside Message': leaveBlank ? '' : insideMessage,
      'Font Family': fontFamily,
      'Font Size': fontSize,
      'Text Color': textColor,
      'Delivery Method': deliveryMethod,
      '_card_template': 'classic-5x7',
      '_artwork_prompt': this.productData.title || ''
    };

    // Add Prodigi SKU if available
    const prodigiSku = this.variantSkuMap?.[this.selectedVariantId];
    if (prodigiSku) {
      properties['_prodigi_sku'] = prodigiSku;
    }

    // If leaving blank, mark it
    if (leaveBlank) {
      properties['leave_blank'] = 'Yes';
    }

    // If "Send direct", add recipient address fields
    if (deliveryMethod === 'Direct') {
      properties['Recipient Name'] = formData.get('recipientName') || '';
      properties['Address Line 1'] = formData.get('addressLine1') || '';
      properties['Address Line 2'] = formData.get('addressLine2') || '';
      properties['City'] = formData.get('city') || '';
      properties['Postcode'] = formData.get('postcode') || '';
      properties['Country'] = formData.get('country') || 'United Kingdom';
    }

    debug.log('[CC Choice] Cart properties:', properties);

    // Build cart payload
    const payload = {
      id: variant.id,
      quantity: 1,
      properties
    };

    // Get submit button
    const submitButton = form.querySelector('[type="submit"]');
    debug.log('[CC Choice] Submit button found:', submitButton);
    debug.log('[CC Choice] Submit button text:', submitButton?.textContent);

    try {
      debug.log('[CC Choice] Calling addToCart with payload:', payload);
      await addToCart(payload);

      trackEvent('cc_add_personalised_success', {
        product_id: this.productData.id,
        variant_id: variant.id,
        price: variant.price,
        has_message: !leaveBlank && insideMessage.length > 0,
        message_length: insideMessage.length,
        delivery_method: deliveryMethod
      });

      // Show success UI
      if (submitButton) {
        debug.log('[CC Choice] Transforming button to success state');
        transformButtonToSuccess(submitButton);
      }
      showSuccessBanner(this.dialog);

      // Clear saved personalization data
      clearPersonalization(this.productData.handle, variant.id);

      // Open cart drawer after brief delay
      setTimeout(() => {
        debug.log('[CC Choice] Opening cart drawer and hiding modal');
        openCartDrawerOrRedirect();
        this.hide();
      }, 800);

    } catch (err) {
      console.error('[CC Choice] Add to cart failed:', err);
      debug.error('[CC Choice] Error details:', err.message, err.stack);
      showError(this.errorElement, 'Unable to add to cart. Please try again.');

      // Re-enable submit button on error
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.classList.remove('button--loading');
      }
    }
  }

  // ========================================
  // LAYOUT MANAGEMENT (Optimal card sizing)
  // ========================================

  updateLayout() {
    const config = readLayoutConfig(this);
    if (!config) return;

    const layout = calculateOptimalLayout(config);
    applyLayoutToDOM(this, layout);

    // Cache for resize events
    this._cachedLayout = { config, layout };
  }

  setupResizeListener() {
    // Disconnect any existing observer
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
    }

    // Create new observer
    this._resizeObserver = new ResizeObserver(() => {
      clearTimeout(this._resizeDebounce);
      this._resizeDebounce = setTimeout(() => {
        this.updateLayout();
      }, 100);
    });

    // Observe the dialog element
    if (this.dialog) {
      this._resizeObserver.observe(this.dialog);
    }
  }

  // ========================================
  // CANVAS RENDERING (Card preview)
  // ========================================

  renderCardPreview(message, fontFamily = 'Playfair Display', fontSize = 'medium', textColor = '#1A1A1A') {
    renderCardPreview(this, message, fontFamily, fontSize, textColor);
  }
}

// ========================================
// EXPORT
// ========================================

export default CCChoiceModal;
