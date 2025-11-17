/**
 * Choice View
 *
 * @module views/choiceView
 * @description Renders the size selection view and binds user interaction handlers
 *
 * @public renderChoiceView(config: ChoiceViewConfig) → HTMLString
 * @public bindChoiceViewHandlers(root: HTMLElement, callbacks: ChoiceViewCallbacks) → void
 * @public injectMobileFooter(dialog: HTMLElement, variant: Variant) → void
 *
 * @typedef {Object} ChoiceViewConfig
 * @property {Product} product - Shopify product data
 * @property {number} selectedVariantId - Currently selected variant ID
 * @property {string} animationMode - 'from-personalise' | 'from-loading' | 'direct'
 *
 * @typedef {Object} ChoiceViewCallbacks
 * @property {Function} onVariantChange - Called when size radio changes (variantId, price, sizeName)
 * @property {Function} onPersonalise - Called when Personalise button clicked
 * @property {Function} onAddBlank - Called when Add Blank button clicked
 *
 * @example
 * import { renderChoiceView, bindChoiceViewHandlers } from './views/choiceView.js';
 * import { formatPrice } from '../utils/format.js';
 *
 * const html = renderChoiceView({
 *   product: productData,
 *   selectedVariantId: 12345
 * });
 *
 * dialogBody.innerHTML = html;
 *
 * bindChoiceViewHandlers(dialogBody, {
 *   onVariantChange: (id, price, size) => { ... },
 *   onPersonalise: () => { ... },
 *   onAddBlank: () => { ... }
 * });
 */

import { formatPrice } from '../utils/format.js';
import { escapeHtml } from '../utils/string.js';

// ========================================
// DEBUG CONFIGURATION
// ========================================

const DEBUG = new URLSearchParams(window.location.search).has('cc_debug') || window.ccDebug === true;

const debug = {
  log: (...args) => DEBUG && console.log(...args),
  warn: (...args) => DEBUG && console.warn(...args)
};

// ========================================
// PRIVATE HELPERS
// ========================================

/**
 * Find the size option index in product options array
 * @private
 */
function findSizeOptionIndex(product) {
  if (!product.options || product.options.length === 0) {
    return 0; // Default to first option
  }

  // Look for option containing "size" in the name
  const sizeIndex = product.options.findIndex(opt => {
    if (typeof opt !== 'string') return false;
    return opt.toLowerCase().includes('size') || opt.toLowerCase().includes('card size');
  });

  // Default to first option if no "size" found
  return sizeIndex >= 0 ? sizeIndex : 0;
}

/**
 * Get descriptive badge label for size option
 * @private
 */
function getDescriptiveLabel(sizeValue) {
  const sizeLower = sizeValue.toLowerCase();

  if (sizeLower.includes('large') || sizeLower.includes('big')) {
    return 'Most Popular';
  }
  if (sizeLower.includes('giant') || sizeLower.includes('xl')) {
    return 'Makes a Statement';
  }
  if (sizeLower.includes('standard') || sizeLower.includes('medium')) {
    return 'Perfect Size';
  }
  if (sizeLower.includes('small') || sizeLower.includes('compact')) {
    return 'Sweet & Simple';
  }

  return ''; // No label
}

/**
 * Get dimensions string for size option
 * @private
 */
function getDimensions(sizeValue) {
  const sizeLower = sizeValue.toLowerCase();

  const dimensionsMap = {
    'standard': '132 × 185mm (5.2" × 7.3")',
    'large': '205 × 290mm (8.1" × 11.4")',
    'giant': '293 × 419mm (11.5" × 16.5")',
    'small': '105 × 148mm (4.1" × 5.8")',
    'a5': '148 × 210mm (5.8" × 8.3")',
    'a4': '210 × 297mm (8.3" × 11.7")',
    'a6': '105 × 148mm (4.1" × 5.8")'
  };

  for (const [key, dimensions] of Object.entries(dimensionsMap)) {
    if (sizeLower.includes(key)) {
      return dimensions;
    }
  }

  return ''; // No dimensions found
}

/**
 * Get personality description for size option
 * @private
 */
function getSizePersonality(sizeValue) {
  const sizeLower = sizeValue.toLowerCase();

  const personalityMap = {
    'standard': 'Classic card size – fits perfectly on the mantelpiece',
    'large': 'Big impact – guaranteed to stand out',
    'giant': 'Statement piece – impossible to miss',
    'small': 'Cute and compact – perfect for desks',
    'a5': 'Generous space for longer messages',
    'a4': 'Maximum canvas – for when you have lots to say',
    'a6': 'Sweet little card – big on charm',
    'square': 'Modern and bold – looks great anywhere'
  };

  for (const [key, personality] of Object.entries(personalityMap)) {
    if (sizeLower.includes(key)) {
      return personality;
    }
  }

  return ''; // No personality text
}

/**
 * Build size radio options HTML
 * @private
 */
function buildSizeRadios(product, variants, sizeOptionIndex) {
  debug.log('[Choice View] Building size radios:', {
    totalVariants: variants.length,
    sizeOptionIndex: sizeOptionIndex,
    productOptions: product.options,
    variants: variants.map(v => ({
      id: v.id,
      title: v.title,
      options: v.options,
      available: v.available
    }))
  });

  // Group variants by size option value
  const variantsBySizeOption = {};

  variants.forEach(variant => {
    const sizeValue = variant.options[sizeOptionIndex];
    debug.log(`[Choice View] Variant ${variant.id} has size: "${sizeValue}"`);
    if (!variantsBySizeOption[sizeValue]) {
      variantsBySizeOption[sizeValue] = variant;
    }
  });

  debug.log('[Choice View] Variants grouped by size:', variantsBySizeOption);

  // Build radio HTML
  let html = '';
  let isFirst = true;

  Object.entries(variantsBySizeOption).forEach(([sizeValue, variant]) => {
    // Skip "Default Title" - only show if it's the ONLY option
    const isDefaultTitle = sizeValue.toLowerCase() === 'default title' || sizeValue.toLowerCase() === 'default';
    if (isDefaultTitle && Object.keys(variantsBySizeOption).length > 1) {
      return; // Skip this option
    }

    // Get descriptive label and dimensions from variant metadata
    const descriptiveLabel = getDescriptiveLabel(sizeValue);
    const dimensions = getDimensions(sizeValue);
    const personality = getSizePersonality(sizeValue);

    // Display name: hide "Default Title" text but keep the option
    const displayName = isDefaultTitle ? 'Standard' : sizeValue;

    html += `
      <label class="ccc__size-option">
        <input
          type="radio"
          name="variant"
          value="${variant.id}"
          data-price="${variant.price}"
          data-size-name="${escapeHtml(displayName)}"
          ${isFirst ? 'checked' : ''}
          ${!variant.available ? 'disabled' : ''}
        >
        <div class="ccc__size-content">
          <div class="ccc__size-header">
            <span class="ccc__size-label">${escapeHtml(displayName)}</span>
            ${descriptiveLabel ? `<span class="ccc__size-badge">${descriptiveLabel}</span>` : ''}
          </div>
          ${dimensions ? `<span class="ccc__size-dimensions">${dimensions}</span>` : ''}
          ${personality ? `<p class="ccc__size-personality">${personality}</p>` : ''}
          <span class="ccc__size-price">${formatPrice(variant.price)}</span>
        </div>
        ${!variant.available ? '<span class="ccc__size-unavailable">Out of stock</span>' : ''}
      </label>
    `;

    isFirst = false;
  });

  return html;
}

// ========================================
// PUBLIC API
// ========================================

/**
 * Render choice view HTML
 *
 * Builds the complete size selection UI including product preview,
 * progress strip, size radios, delivery promise, and action buttons.
 *
 * @param {ChoiceViewConfig} config - View configuration
 * @returns {string} HTML string for choice view
 *
 * @example
 * const html = renderChoiceView({
 *   product: productData,
 *   selectedVariantId: 12345
 * });
 * dialogBody.innerHTML = html;
 */
export function renderChoiceView({ product, selectedVariantId }) {
  debug.log('[Choice View] Rendering choice view for:', product.handle);

  // Find the size option index
  const sizeOptionIndex = findSizeOptionIndex(product);

  // Use all variants (print-on-demand, always available)
  const variants = product.variants;

  debug.log('[Choice View] Using all variants (POD model):', variants);
  debug.log('[Choice View] Total variants:', variants.length);

  if (variants.length === 0) {
    return `<div class="ccc__error">Sorry, this product is currently out of stock.</div>`;
  }

  // Get first variant for initial display
  const firstVariant = variants[0];

  // Build HTML
  const html = `
    <div class="ccc__choice">
      <div class="ccc__product-preview">
        <img
          src="${product.featured_image}"
          alt="${escapeHtml(product.title)}"
          class="ccc__product-image"
          loading="eager"
          style="aspect-ratio: 1 / 1; width: 100%;"
          width="600"
          height="600"
        >
        <h2 id="ccc-title" class="ccc__product-title">${escapeHtml(product.title)}</h2>
        <div class="ccc__product-price">
          <span data-ccc-price aria-live="polite" aria-atomic="true">${formatPrice(firstVariant.price)}</span>
        </div>
      </div>

      <div class="ccc__options">
        <div class="ccc__progress-strip" aria-label="Shopping steps">
          <span class="ccc__progress-step ccc__progress-step--active">
            <span class="ccc__progress-dot"></span>
            Choose size
          </span>
          <span class="ccc__progress-separator">·</span>
          <span class="ccc__progress-step">
            <span class="ccc__progress-dot"></span>
            Personalise
          </span>
          <span class="ccc__progress-separator">·</span>
          <span class="ccc__progress-step">
            <span class="ccc__progress-dot"></span>
            Add to cart
          </span>
        </div>

        <h3 id="ccc-sizes-heading" class="ccc__sizes-heading">Select size</h3>
        <fieldset class="ccc__sizes" aria-labelledby="ccc-sizes-heading" role="radiogroup">
          ${buildSizeRadios(product, variants, sizeOptionIndex)}
        </fieldset>

        <div class="ccc__delivery-promise">
          <svg class="ccc__delivery-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M14 9.5V4.5C14 4.22386 13.7761 4 13.5 4H10.5L9 2H4.5C4.22386 2 4 2.22386 4 2.5V9.5M14 9.5H4M14 9.5L15.5 14H0.5L2 9.5H4M4 9.5V2.5" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>Printed today, on their doorstep in a couple of days</span>
        </div>

        <div class="ccc__actions">
          <button class="button button--primary" data-ccc-personalise data-ccc-price="${firstVariant.price}">
            Personalise — ${formatPrice(firstVariant.price)}
          </button>
          <p class="ccc__actions-caption">You'll see exactly how it looks inside before you buy</p>
          <button class="button button--secondary" data-ccc-add-blank>
            Add blank
          </button>
        </div>

        <!-- Recommendation Rail Container -->
        <div id="cc-recs-container"></div>

        <a href="${product.url}" class="ccc__more-info" target="_blank">
          <span>More information</span>
          <svg class="ccc__more-info-arrow" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 3L11 8L6 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </a>
      </div>
    </div>
  `;

  return html;
}

/**
 * Bind event handlers for choice view
 *
 * Attaches listeners for size radio changes, personalise button,
 * add blank button, and keyboard navigation.
 *
 * @param {HTMLElement} root - Root element containing the choice view
 * @param {ChoiceViewCallbacks} callbacks - Event handler callbacks
 *
 * @example
 * bindChoiceViewHandlers(dialogBody, {
 *   onVariantChange: (id, price, size) => {
 *     selectedVariantId = id;
 *     trackEvent('cc_size_select', { variant_id: id, price });
 *   },
 *   onPersonalise: () => buildPersonaliserView(),
 *   onAddBlank: () => handleBlankAdd()
 * });
 */
export function bindChoiceViewHandlers(root, callbacks) {
  const personaliseBtn = root.querySelector('[data-ccc-personalise]');
  const radios = root.querySelectorAll('input[name="variant"]');

  // Radio change - update price and selected variant with premium animation
  radios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      const variantId = parseInt(e.target.value, 10);
      const price = parseInt(e.target.dataset.price, 10);
      const sizeName = e.target.dataset.sizeName || '';
      const priceEl = root.querySelector('[data-ccc-price]');

      // Update main price display with animation
      if (priceEl) {
        priceEl.style.animation = 'none';
        setTimeout(() => {
          priceEl.textContent = formatPrice(price);
          priceEl.style.animation = 'priceChange 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
        }, 10);
      }

      // Update Personalise button with price (desktop)
      if (personaliseBtn) {
        personaliseBtn.textContent = `Personalise — ${formatPrice(price)}`;
        personaliseBtn.dataset.cccPrice = price;
      }

      // Call variant change callback
      if (callbacks.onVariantChange) {
        callbacks.onVariantChange(variantId, price, sizeName);
      }
    });
  });

  // Arrow key navigation for size radios
  radios.forEach((radio, index) => {
    radio.addEventListener('keydown', (e) => {
      let newIndex = index;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        newIndex = (index + 1) % radios.length;
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        newIndex = (index - 1 + radios.length) % radios.length;
      } else {
        return; // Not an arrow key
      }

      radios[newIndex].focus();
      radios[newIndex].checked = true;
      radios[newIndex].dispatchEvent(new Event('change', { bubbles: true }));
    });
  });

  // Personalise button (desktop)
  if (personaliseBtn) {
    personaliseBtn.addEventListener('click', () => {
      if (callbacks.onPersonalise) {
        callbacks.onPersonalise();
      }
    });
  }

  // Add blank button
  const addBlankBtn = root.querySelector('[data-ccc-add-blank]');
  if (addBlankBtn) {
    addBlankBtn.addEventListener('click', () => {
      if (callbacks.onAddBlank) {
        callbacks.onAddBlank();
      }
    });
  }
}

/**
 * Inject mobile footer with personalise button
 *
 * Creates and inserts a sticky mobile footer bar at the bottom of the dialog.
 * Removes any existing footer first to prevent duplicates.
 *
 * @param {HTMLElement} dialog - Dialog element to inject footer into
 * @param {Variant} variant - Variant data (for pricing)
 *
 * @example
 * injectMobileFooter(dialogElement, selectedVariant);
 */
export function injectMobileFooter(dialog, variant) {
  // Remove existing mobile footer if present
  const existingFooter = dialog.querySelector('.ccc__footer-mobile');
  if (existingFooter) {
    existingFooter.remove();
  }

  // Create mobile footer HTML
  const footerHTML = `
    <div class="ccc__footer-mobile">
      <button class="button button--primary" data-ccc-personalise-mobile data-ccc-price="${variant.price}">
        Personalise — ${formatPrice(variant.price)}
      </button>
    </div>
  `;

  // Insert footer as last child of dialog (after body)
  dialog.insertAdjacentHTML('beforeend', footerHTML);

  // Bind mobile button handler
  const mobileBtn = dialog.querySelector('[data-ccc-personalise-mobile]');
  if (mobileBtn && dialog._choiceViewCallbacks && dialog._choiceViewCallbacks.onPersonalise) {
    mobileBtn.addEventListener('click', () => {
      dialog._choiceViewCallbacks.onPersonalise();
    });
  }
}
