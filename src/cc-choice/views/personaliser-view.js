/**
 * Personaliser View
 *
 * @module views/personaliser-view
 * @description Renders the personalization form UI (card preview + typography controls) and binds event handlers
 *
 * @public buildPersonaliserHTML(config) → HTMLString
 * @public bindPersonaliserViewHandlers(modal, context, callbacks) → void
 */

import { formatPrice } from '../utils/format.js';
import { trackEvent } from '../core/analytics.js';
import { clearPersonalization, savePersonalization } from '../core/persistence.js';
import { getVariantSkus } from '../services/metafieldService.js';
import { generateMessageSuggestions } from '../services/aiService.js';
import { loadAllGoogleFonts } from './messageField.js';
import { showConfirmDialog } from '../utils/dialog.js';
import { escapeHtml } from '../utils/string.js';

// ========================================
// DEBUG CONFIGURATION
// ========================================

const DEBUG = new URLSearchParams(window.location.search).has('cc_debug') || window.ccDebug === true;

const debug = {
  log: (...args) => DEBUG && console.log(...args),
  warn: (...args) => DEBUG && console.warn(...args),
  error: (...args) => console.error(...args)
};

/**
 * Build personaliser view HTML
 *
 * @param {Object} config - View configuration
 * @param {Object} config.product - Product data from Shopify
 * @param {Object} config.selectedVariant - Selected variant object
 * @param {Object|null} config.savedPersonalization - Previously saved personalization data
 * @param {string} config.formId - Unique form ID
 * @param {Function} config.escapeHtml - HTML escape function
 * @param {Function} config.getVariantDisplayName - Variant name formatter
 * @param {Function} config.buildRecipientAddressFields - Recipient fields HTML builder
 * @returns {string} Complete HTML for personaliser view
 */
export function buildPersonaliserHTML({
  product,
  selectedVariant,
  savedPersonalization,
  formId,
  escapeHtml,
  getVariantDisplayName,
  buildRecipientAddressFields
}) {
  const hasSavedData = savedPersonalization && savedPersonalization.insideMessage;

  return `
    <div class="ccc__personaliser">
      <button type="button" class="ccc__back" data-ccc-back>
        Back to size selection
      </button>

      <div class="ccc__personaliser-header">
        <img
          src="${product.featured_image}"
          alt="${escapeHtml(product.title)}"
          class="ccc__personaliser-image"
          loading="lazy"
          width="200"
          height="200"
        >
        <div class="ccc__personaliser-info">
          <h2 class="ccc__personaliser-title">${escapeHtml(product.title)}</h2>
          <p class="ccc__personaliser-variant">
            ${getVariantDisplayName(selectedVariant)} • ${formatPrice(selectedVariant.price)}
          </p>
        </div>
      </div>

      ${hasSavedData ? `
        <div class="ccc__restore-prompt" data-ccc-restore-prompt data-saved-inside="${escapeHtml(savedPersonalization.insideMessage || '')}">
          <div class="ccc__restore-content">
            <svg class="ccc__restore-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18C14.4183 18 18 14.4183 18 10C18 8.53565 17.5716 7.16959 16.8284 6.02513" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M14 6L17 3L20 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <div class="ccc__restore-text">
              <strong>Continue where you left off?</strong>
              <p>We saved your previous personalization</p>
            </div>
          </div>
          <div class="ccc__restore-actions">
            <button type="button" class="button button--small" data-ccc-restore>Restore</button>
            <button type="button" class="button button--small button--secondary" data-ccc-dismiss>Start fresh</button>
          </div>
        </div>
      ` : ''}

      <!-- Left Column: Card Preview with Caption -->
      <div class="ccc__preview-column">
        <!-- Card metadata as caption -->
        <div class="ccc__card-caption">
          <img
            src="${product.featured_image}"
            alt="${escapeHtml(product.title)}"
            class="ccc__card-caption-image"
            loading="lazy"
            width="48"
            height="48"
          >
          <div class="ccc__card-caption-info">
            <div class="ccc__card-caption-title">${escapeHtml(product.title)}</div>
            <div class="ccc__card-caption-variant">
              ${getVariantDisplayName(selectedVariant)} • ${formatPrice(selectedVariant.price)}
            </div>
          </div>
        </div>

        <h3 class="ccc__card-heading">Write your message</h3>

        <div class="ccc__card-interior" data-ccc-card-interior>
          <!-- LEFT page of card interior (blank) -->
          <div class="ccc__card-page ccc__card-page--left">
          </div>

          <!-- CENTER fold line -->
          <div class="ccc__card-fold"></div>

          <!-- RIGHT page of card interior (message area) -->
          <div class="ccc__card-page ccc__card-page--right">
            <div class="ccc__writing-area" data-ccc-writing-area>
              <textarea
                class="ccc__message-field"
                data-ccc-message-field
                placeholder="Type your message here..."
                spellcheck="false"
                autocorrect="off"
                autocapitalize="off"
                data-cc-limit="600"
                style="min-height: 100px; resize: none; overflow: hidden;"
              ></textarea>
            </div>
          </div>
        </div>

        <!-- Message trim notice -->
        <div class="ccc__message-trim-notice" data-ccc-trim-notice hidden>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
            <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/>
          </svg>
          <span>Message shortened to fit the card</span>
        </div>
      </div>

      <!-- Right Column: Unified Control Panel -->
      <div class="ccc__controls-column">
        <div class="ccc__controls-panel">
          <form id="${formId}" class="ccc__form">
            <input type="hidden" name="id" value="${selectedVariant.id}">

            <!-- Hidden textarea for form submission -->
            <textarea
              id="cc-inside-${formId}"
              name="properties[Inside Message]"
              data-cc-inside
              style="display: none;"
            ></textarea>

            <!-- Typography Header with Clear Button -->
            <div class="ccc__typography-header">
              <h4 class="ccc__section-heading">Message style</h4>
              <button type="button" class="ccc__clear-message-btn ccc__clear-message-btn--small" data-ccc-clear-btn hidden>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                </svg>
                Clear
              </button>
            </div>

            <!-- Typography Controls -->
          <div class="ccc__typography-section">
            <div class="ccc__control-row">
              <div class="ccc__control-item">
                <label class="ccc__control-label">Style</label>
                <select name="properties[Font Family]" class="ccc__font-select" data-cc-font-select>
                <option value="Playfair Display" style="font-family: 'Playfair Display', serif;">Elegant</option>
                <option value="Dancing Script" style="font-family: 'Dancing Script', cursive;">Handwritten</option>
                <option value="Pacifico" style="font-family: 'Pacifico', cursive;">Playful</option>
                <option value="Great Vibes" style="font-family: 'Great Vibes', cursive;">Fancy</option>
                <option value="Caveat" style="font-family: 'Caveat', cursive;">Casual</option>
                <option value="Permanent Marker" style="font-family: 'Permanent Marker', cursive;">Bold & Fun</option>
                <option value="Shadows Into Light" style="font-family: 'Shadows Into Light', cursive;">Friendly</option>
                <option value="Cookie" style="font-family: 'Cookie', cursive;">Whimsical</option>
                <option value="Satisfy" style="font-family: 'Satisfy', cursive;">Romantic</option>
                <option value="Indie Flower" style="font-family: 'Indie Flower', cursive;">Quirky</option>
                <option value="Lora" style="font-family: 'Lora', serif;">Traditional</option>
                <option value="Crimson Text" style="font-family: 'Crimson Text', serif;">Refined</option>
              </select>
            </div>

            <div class="ccc__control-item">
              <label class="ccc__control-label">Size</label>
              <div class="ccc__size-buttons" data-cc-size-group>
                <button type="button" class="ccc__size-btn" data-size="small">
                  <span class="ccc__size-icon" style="font-size: 18px;">A</span>
                </button>
                <button type="button" class="ccc__size-btn ccc__size-btn--active" data-size="medium">
                  <span class="ccc__size-icon" style="font-size: 24px;">A</span>
                </button>
                <button type="button" class="ccc__size-btn" data-size="large">
                  <span class="ccc__size-icon" style="font-size: 30px;">A</span>
                </button>
              </div>
              <input type="hidden" name="properties[Font Size]" value="medium" data-cc-size-input>
            </div>

            <div class="ccc__control-item">
              <label class="ccc__control-label">Colour</label>
              <div class="ccc__color-swatches" data-cc-color-group>
                <button type="button" class="ccc__color-swatch ccc__color-swatch--active" data-color="#1A1A1A" style="background: #1A1A1A;" title="Black"></button>
                <button type="button" class="ccc__color-swatch" data-color="#4A5568" style="background: #4A5568;" title="Dark Grey"></button>
                <button type="button" class="ccc__color-swatch" data-color="#2563EB" style="background: #2563EB;" title="Blue"></button>
                <button type="button" class="ccc__color-swatch" data-color="#DC2626" style="background: #DC2626;" title="Red"></button>
                <button type="button" class="ccc__color-swatch" data-color="#059669" style="background: #059669;" title="Green"></button>
                <button type="button" class="ccc__color-swatch" data-color="#7C3AED" style="background: #7C3AED;" title="Purple"></button>
              </div>
              <input type="hidden" name="properties[Text Color]" value="#1A1A1A" data-cc-color-input>
            </div>
          </div>
        </div>

            <!-- Leave Blank Toggle -->
            <label class="ccc__leave-blank">
              <input type="checkbox" data-cc-leave-blank>
              <span class="ccc__leave-blank-label">Leave blank (send without message)</span>
            </label>

            <!-- AI Help Section - after controls, collapsible -->
            <div class="ccc__ai-help-section">
              <button type="button" class="ccc__ai-help-toggle" data-ccc-ai-toggle aria-expanded="false">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z"/>
                  <path d="M2 17L12 22L22 17"/>
                  <path d="M2 12L12 17L22 12"/>
                </svg>
                Need message ideas?
              </button>
              <p class="ccc__ai-help-description">We'll suggest a few ideas – you can tweak them.</p>

              <div class="ccc__ai-help-panel ccc__ai-help-panel--collapsed" data-ccc-ai-panel>
                <div class="ccc__ai-form" data-ccc-ai-form>
                  <p class="ccc__ai-description">Let AI help you craft the perfect message</p>

                  <div class="ccc__ai-inputs">
                    <input
                      type="text"
                      placeholder="Recipient name (e.g., Mum, Sarah)"
                      data-ai-recipient
                      class="ccc__ai-input"
                    >
                    <select data-ai-occasion class="ccc__ai-input">
                      <option value="">Select occasion...</option>
                      <option value="birthday">Birthday</option>
                      <option value="thank-you">Thank you</option>
                      <option value="congratulations">Congratulations</option>
                      <option value="get-well">Get well soon</option>
                      <option value="sympathy">Sympathy</option>
                      <option value="love">Love & Romance</option>
                      <option value="friendship">Friendship</option>
                      <option value="just-because">Just because</option>
                    </select>
                    <textarea
                      placeholder="Any specific details? (optional)"
                      data-ai-details
                      class="ccc__ai-input ccc__ai-textarea"
                      rows="2"
                    ></textarea>
                  </div>

                  <button type="button" class="button button--secondary" data-ccc-ai-generate>
                    Get message ideas
                  </button>
                </div>

                <div class="ccc__ai-results" data-ccc-ai-results hidden>
                  <!-- Results populated by JS -->
                </div>

                <div class="ccc__ai-used" data-ccc-ai-used hidden>
                  <p>✨ You've used AI suggestions for this card</p>
                </div>
              </div>
            </div>

            <!-- Hidden Fields -->
            <input type="hidden" name="properties[_card_template]" value="classic-5x7">
            <input type="hidden" name="properties[_artwork_prompt]" value="">
            <input type="hidden" name="properties[_prodigi_sku]" data-ccc-prodigi-sku value="">
            <input type="hidden" name="properties[Delivery Method]" data-ccc-delivery-method value="Mail2Me">

            <!-- Error Container -->
            <div class="cc-error" role="alert" aria-live="assertive" hidden data-cc-error></div>

            <!-- Recipient address fields (shown when "Send direct" selected from footer) -->
            <div class="ccc__recipient-fields" data-ccc-recipient-fields hidden>
              <h4 class="ccc__section-heading">Recipient Address</h4>
              ${buildRecipientAddressFields()}
            </div>
          </form>
        </div>
      </div>

      <!-- Sticky Footer Bar (Desktop + Mobile) - Single CTA zone -->
      <div class="ccc__sticky-footer ccc__sticky-footer--personalise">
        <!-- Left: Delivery selection -->
        <div class="ccc__footer-delivery">
          <div class="ccc__footer-delivery-toggle">
            <button type="button" class="ccc__delivery-toggle-btn ccc__delivery-toggle-btn--active" data-footer-delivery="Mail2Me">
              Post to me
            </button>
            <button type="button" class="ccc__delivery-toggle-btn" data-footer-delivery="Mail4Me">
              Send direct
            </button>
          </div>
          <span class="ccc__footer-delivery-summary" data-ccc-footer-summary">Sent to you with blank envelope</span>
        </div>

        <!-- Right: Yellow CTA -->
        <button type="submit" form="${formId}" class="ccc__footer-cta">
          Add to basket · ${formatPrice(selectedVariant.price)}
        </button>
      </div>
    </div>
  `;
}

// ========================================
// EVENT HANDLER BINDING
// ========================================

/**
 * Bind all personaliser view event handlers
 *
 * Sets up listeners for:
 * - Back button
 * - Restore prompt
 * - Delivery method toggle
 * - Message field (autosize, clear, sync)
 * - Typography controls (font, size, color)
 * - AI suggestions
 * - Leave blank toggle
 * - Form submit
 *
 * @param {HTMLElement} modal - Modal element
 * @param {Object} context - Modal context data
 * @param {Object} context.product - Product data
 * @param {number} context.selectedVariantId - Selected variant ID
 * @param {Object} context.variantSkuMap - Variant SKU mapping
 * @param {Object} callbacks - Event callbacks
 * @param {Function} callbacks.onBack - Back button clicked
 * @param {Function} callbacks.onSubmit - Form submitted
 * @param {Function} callbacks.onAutoResize - Auto-resize function reference (for storage)
 *
 * @example
 * bindPersonaliserViewHandlers(modalElement, {
 *   product: productData,
 *   selectedVariantId: 12345,
 *   variantSkuMap: skuMap
 * }, {
 *   onBack: () => buildChoiceView(),
 *   onSubmit: (form) => handlePersonalisedAdd(form)
 * });
 */
export function bindPersonaliserViewHandlers(modal, context, callbacks) {
    const { product, selectedVariantId, variantSkuMap } = context;

  // Local state for auto-resize and observers
  let _autoResizeTextarea = null;
  let _resizeTimeout = null;
  let _cardPageResizeObserver = null;

    // Get form elements at function scope
    const insideTextarea = modal.querySelector('[data-cc-inside]');
    const insideCounter = modal.querySelector('[data-cc-inside-counter]');

    // Back button
    const backBtn = modal.querySelector('[data-ccc-back]');
    if (backBtn) {
      backBtn.addEventListener('click', () => callbacks.onBack());
    }

    // Restore prompt handlers
    const restorePrompt = modal.querySelector('[data-ccc-restore-prompt]');
    if (restorePrompt) {
      const restoreBtn = restorePrompt.querySelector('[data-ccc-restore]');
      const dismissBtn = restorePrompt.querySelector('[data-ccc-dismiss]');

      if (restoreBtn) {
        restoreBtn.addEventListener('click', () => {
          // Restore saved values
          if (insideTextarea) {
            insideTextarea.value = restorePrompt.dataset.savedInside || '';
            if (insideCounter) {
              insideCounter.textContent = `${insideTextarea.value.length}/600`;
            }
          }
          // Hide prompt with animation
          restorePrompt.style.animation = 'restorePromptFadeOut 0.3s var(--ease-out-quart) forwards';
          setTimeout(() => restorePrompt.remove(), 300);
        });
      }

      if (dismissBtn) {
        dismissBtn.addEventListener('click', () => {
          // Clear saved data and hide prompt
          clearPersonalization(product.handle, selectedVariantId);
          restorePrompt.style.animation = 'restorePromptFadeOut 0.3s var(--ease-out-quart) forwards';
          setTimeout(() => restorePrompt.remove(), 300);
        });
      }
    }

    // Delivery method handling (footer toggles only - no radios in right column)
    const recipientFields = modal.querySelector('[data-ccc-recipient-fields]');
    const prodigiSkuField = modal.querySelector('[data-ccc-prodigi-sku]');
    const deliveryMethodField = modal.querySelector('[data-ccc-delivery-method]');
    const variantSkus = getVariantSkus(variantSkuMap, selectedVariantId);
    const footerToggleButtons = modal.querySelectorAll('[data-footer-delivery]');
    const footerSummary = modal.querySelector('[data-ccc-footer-summary]');

    // Helper to update delivery method (called from footer toggles)
    const updateDeliveryMethod = (deliveryMethod) => {
      const isSendDirect = deliveryMethod === 'Mail4Me';

      // Update hidden form fields
      if (deliveryMethodField) {
        deliveryMethodField.value = deliveryMethod;
      }

      if (prodigiSkuField && variantSkus) {
        prodigiSkuField.value = isSendDirect ? variantSkus.sku_dir : variantSkus.sku_bla;
      }

      // Show/hide recipient address fields
      if (recipientFields) {
        if (isSendDirect) {
          recipientFields.hidden = false;
          recipientFields.style.animation = 'recipientFieldsFadeIn 0.4s var(--ease-out-expo) forwards';
        } else {
          recipientFields.hidden = true;
        }
      }

      // Update footer UI
      footerToggleButtons.forEach(btn => {
        if (btn.dataset.footerDelivery === deliveryMethod) {
          btn.classList.add('ccc__delivery-toggle-btn--active');
        } else {
          btn.classList.remove('ccc__delivery-toggle-btn--active');
        }
      });

      if (footerSummary) {
        footerSummary.textContent = isSendDirect
          ? "We'll post it directly for you"
          : "Sent to you with blank envelope";
      }

      // Analytics
      trackEvent('cc_delivery_method_changed', {
        product_handle: product.handle,
        delivery_method: deliveryMethod
      });

      debug.log('[CC Choice] Delivery method changed:', { deliveryMethod, sku: prodigiSkuField?.value });
    };

    // Footer toggle button clicks
    footerToggleButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        updateDeliveryMethod(btn.dataset.footerDelivery);
      });
    });

    // Set initial delivery method (defaults to Mail2Me)
    updateDeliveryMethod('Mail2Me');

    // Message field and controls
    const messageField = modal.querySelector('[data-ccc-message-field]');
    const hiddenTextarea = modal.querySelector('[data-cc-inside]');
    const fontSelect = modal.querySelector('[data-cc-font-select]');
    const sizeButtons = modal.querySelectorAll('[data-size]');
    const sizeInput = modal.querySelector('[data-cc-size-input]');
    const colorSwatches = modal.querySelectorAll('[data-color]');
    const colorInput = modal.querySelector('[data-cc-color-input]');

    // Helper to update message field styling
    const updateFieldStyle = () => {
      if (!messageField) return;

      const fontFamily = fontSelect ? fontSelect.value : 'Playfair Display';
      const fontSize = sizeInput ? sizeInput.value : 'medium';
      const textColor = colorInput ? colorInput.value : '#1A1A1A';

      const sizeMap = {
        small: '1.4rem',
        medium: '1.8rem',
        large: '2.2rem'
      };

      // Use !important so we override global brutal form styles
      // that apply font-size/color with !important to all textareas.
      messageField.style.setProperty(
        'font-family',
        `"${fontFamily}", Georgia, serif`,
        'important'
      );
      messageField.style.setProperty(
        'font-size',
        sizeMap[fontSize] || '1.8rem',
        'important'
      );
      messageField.style.setProperty('color', textColor, 'important');

      debug.log('[CC Choice] Field style updated:', { fontFamily, fontSize, textColor });
    };

    // PREMIUM FEEL: Gentle overflow check with inline guidance
    // Store last valid value that fits in the card
    let lastValidValue = '';

    // Sync message field to hidden textarea
    const syncToHiddenTextarea = () => {
      if (!messageField || !hiddenTextarea) return;
      hiddenTextarea.value = messageField.value;
    };

    // Message field input event
    if (messageField) {
      // Get container for max expansion calculation
      const cardPage = messageField.closest('.ccc__card-page--right');

      // Hard-limit auto-resize - prevents text overflow by trimming
      const autoResizeTextarea = () => {
        // Recalculate max height dynamically (viewport/orientation changes)
        const maxHeight = cardPage ? cardPage.clientHeight - 24 : 320;

        messageField.style.height = 'auto'; // Reset height
        let scrollHeight = messageField.scrollHeight;
        let wasTrimmed = false;

        // If text fits, store it and update height
        if (scrollHeight <= maxHeight) {
          messageField.style.height = scrollHeight + 'px';
          lastValidValue = messageField.value;
        } else {
          // Text overflows - trim from end until it fits
          let value = messageField.value;
          while (scrollHeight > maxHeight && value.length > 0) {
            value = value.slice(0, -1);
            messageField.value = value;
            messageField.style.height = 'auto';
            scrollHeight = messageField.scrollHeight;
            wasTrimmed = true;
          }
          messageField.style.height = scrollHeight + 'px';
          lastValidValue = messageField.value;
        }

        return wasTrimmed;
      };

      // Input handler - auto-resize and sync
      const trimNotice = modal.querySelector('[data-ccc-trim-notice]');
      let trimNoticeTimeout;

      messageField.addEventListener('input', () => {
        const wasTrimmed = autoResizeTextarea();
        syncToHiddenTextarea();

        // Show trim notice if text was trimmed
        if (wasTrimmed && trimNotice) {
          trimNotice.hidden = false;

          // Auto-hide after 4 seconds
          clearTimeout(trimNoticeTimeout);
          trimNoticeTimeout = setTimeout(() => {
            trimNotice.hidden = true;
          }, 4000);
        }
      });

      // Prevent new lines when at limit
      messageField.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          // Recalculate maxHeight for keydown check
          const maxHeight = cardPage ? cardPage.clientHeight - 24 : 320;
          const testHeight = messageField.scrollHeight + 20; // Approximate new line height
          if (testHeight > maxHeight) {
            e.preventDefault();
          }
        }
      });

      // PREMIUM FEEL: ResizeObserver for viewport/orientation changes
      if (cardPage && typeof ResizeObserver !== 'undefined') {
        const resizeObserver = new ResizeObserver(() => {
          // Debounce resize for performance
          clearTimeout(_resizeTimeout);
          _resizeTimeout = setTimeout(() => {
            autoResizeTextarea();
          }, 100);
        });
        resizeObserver.observe(cardPage);

        // Clean up on modal close
        _cardPageResizeObserver = resizeObserver;
      }

      // Store reference for external calls (font loading, etc.)
      _autoResizeTextarea = autoResizeTextarea;

      // Initial resize
      autoResizeTextarea();

      // Auto-focus on page load
      setTimeout(() => messageField.focus(), 100);
    }

    // Clear button - show/hide based on content
    const clearBtn = modal.querySelector('[data-ccc-clear-btn]');
    if (clearBtn && messageField) {
      // Function to toggle clear button visibility
      const toggleClearButton = () => {
        if (messageField.value.trim().length > 0) {
          clearBtn.hidden = false;
        } else {
          clearBtn.hidden = true;
        }
      };

      // Listen for input changes
      messageField.addEventListener('input', toggleClearButton);

      // Click handler with custom confirmation dialog
      clearBtn.addEventListener('click', async () => {
        const confirmed = await showConfirmDialog(
          'Clear your message?',
          'This will permanently delete your message. This action cannot be undone.'
        );

        if (confirmed) {
          messageField.value = '';

          // Trigger input event to resize and update
          const inputEvent = new Event('input', { bubbles: true });
          messageField.dispatchEvent(inputEvent);

          // Hide the button
          clearBtn.hidden = true;

          // Focus the field
          messageField.focus();

          // Track the clear action
          trackEvent('cc_message_cleared', {
            product_handle: product.handle,
            variant_id: selectedVariantId
          });
        }
      });

      // Initial check
      toggleClearButton();
    }

    // Font selection changes
    if (fontSelect) {
      fontSelect.addEventListener('change', () => {
        updateFieldStyle();
        // Rerun auto-resize when font changes (may trigger trim if new font is larger)
        if (_autoResizeTextarea) {
          setTimeout(() => _autoResizeTextarea(), 100);
        }
      });
    }

    // Size button clicks
    sizeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        // Remove active state from all
        sizeButtons.forEach(b => b.classList.remove('ccc__size-btn--active'));
        // Add active to clicked
        btn.classList.add('ccc__size-btn--active');
        // Update hidden input
        if (sizeInput) {
          sizeInput.value = btn.dataset.size;
        }
        updateFieldStyle();
        // Rerun auto-resize when size changes (may trigger trim if new size is larger)
        if (_autoResizeTextarea) {
          setTimeout(() => _autoResizeTextarea(), 100);
        }
      });
    });

    // Color swatch clicks
    colorSwatches.forEach(swatch => {
      swatch.addEventListener('click', () => {
        // Remove active state from all
        colorSwatches.forEach(s => s.classList.remove('ccc__color-swatch--active'));
        // Add active to clicked
        swatch.classList.add('ccc__color-swatch--active');
        // Update hidden input
        if (colorInput) {
          colorInput.value = swatch.dataset.color;
        }
        debug.log('[CC Choice] Color changed to:', swatch.dataset.color);
        updateFieldStyle();
      });
    });

    // Load all fonts and initialize message field styling
    // PREMIUM FEEL: Rerun auto-resize after fonts load to prevent visual jumps
    loadAllGoogleFonts().then(() => {
      updateFieldStyle();
      // Store reference for font-load resize
      if (messageField && _autoResizeTextarea) {
        setTimeout(() => _autoResizeTextarea(), 50);
      }
    });

    // AI Message Suggestions
    const aiToggle = modal.querySelector('[data-ccc-ai-toggle]');
    const aiPanel = modal.querySelector('[data-ccc-ai-panel]');
    const aiForm = modal.querySelector('[data-ccc-ai-form]');
    const aiResults = modal.querySelector('[data-ccc-ai-results]');
    const aiUsed = modal.querySelector('[data-ccc-ai-used]');
    const aiGenerateBtn = modal.querySelector('[data-ccc-ai-generate]');
    const aiRecipient = modal.querySelector('[data-ai-recipient]');
    const aiOccasion = modal.querySelector('[data-ai-occasion]');
    const aiDetails = modal.querySelector('[data-ai-details]');

    // Check if AI has been used for this product (session storage)
    const aiUsedKey = `ai_used_${product.handle}_${selectedVariantId}`;
    // TESTING: Disabled usage limit
    // const hasUsedAI = sessionStorage.getItem(aiUsedKey) === 'true';

    if (aiToggle && aiPanel) {
      // Remove any existing listener to prevent double-click issues
      const newAiToggle = aiToggle.cloneNode(true);
      aiToggle.parentNode.replaceChild(newAiToggle, aiToggle);

      newAiToggle.addEventListener('click', () => {
        // Toggle panel
        const isExpanded = newAiToggle.getAttribute('aria-expanded') === 'true';
        newAiToggle.setAttribute('aria-expanded', !isExpanded);
        aiPanel.classList.toggle('ccc__ai-help-panel--collapsed', isExpanded);

        if (!isExpanded) {
          // Panel is opening - smooth scroll to it
          setTimeout(() => {
            aiPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }, 50);

          trackEvent('cc_ai_form_open', {
            product_handle: product.handle,
            variant_id: selectedVariantId
          });
        }
      });
    }

    if (aiGenerateBtn) {
      aiGenerateBtn.addEventListener('click', async () => {
        // Validate inputs
        if (!aiRecipient || !aiRecipient.value.trim()) {
          alert('Please enter the recipient\'s name');
          return;
        }
        if (!aiOccasion || !aiOccasion.value) {
          alert('Please select an occasion');
          return;
        }

        // Show loading state
        aiGenerateBtn.disabled = true;
        aiGenerateBtn.textContent = 'Generating...';

        try {
          // Call AI service
          const data = await generateMessageSuggestions({
            recipient: aiRecipient.value,
            occasion: aiOccasion.value,
            details: aiDetails ? aiDetails.value : '',
            imageUrl: product.featured_image || ''
          });

          // Display suggestions with "Use this" and "Copy" buttons
          if (data.suggestions && data.suggestions.length > 0) {
            aiResults.innerHTML = data.suggestions.map((s, i) => `
              <div class="ccc__ai-suggestion-card">
                <p class="ccc__ai-suggestion-text">${escapeHtml(s.message)}</p>
                <div class="ccc__ai-suggestion-actions">
                  <button type="button" class="ccc__ai-use-btn" data-ai-use="${i}">
                    Use this
                  </button>
                  <button type="button" class="ccc__ai-copy-btn" data-ai-copy="${i}">
                    Copy
                  </button>
                </div>
              </div>
            `).join('');

            aiResults.removeAttribute('hidden');
            aiForm.setAttribute('hidden', '');

            // "Use this" buttons - populate message (keep panel open for trying other suggestions)
            aiResults.querySelectorAll('[data-ai-use]').forEach(btn => {
              btn.addEventListener('click', () => {
                const index = parseInt(btn.dataset.aiUse);
                const suggestion = data.suggestions[index];

                if (messageField) {
                  messageField.value = suggestion.message;

                  // Trigger input event to auto-resize and sync
                  const inputEvent = new Event('input', { bubbles: true });
                  messageField.dispatchEvent(inputEvent);

                  // Focus the field
                  setTimeout(() => messageField.focus(), 50);

                  // Scroll to the absolute top of the modal to see the card
                  setTimeout(() => {
                    const dialogContainer = modal.querySelector('[role="dialog"]');
                    if (dialogContainer) {
                      dialogContainer.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }, 100);
                }

                // Panel stays open so user can try different suggestions

                trackEvent('cc_ai_suggestion_use', {
                  product_handle: product.handle,
                  variant_id: selectedVariantId,
                  suggestion_index: index
                });
              });
            });

            // "Copy" buttons - copy to clipboard
            aiResults.querySelectorAll('[data-ai-copy]').forEach(btn => {
              btn.addEventListener('click', async () => {
                const index = parseInt(btn.dataset.aiCopy);
                const suggestion = data.suggestions[index];

                try {
                  await navigator.clipboard.writeText(suggestion.message);
                  btn.textContent = 'Copied!';
                  setTimeout(() => {
                    btn.textContent = 'Copy';
                  }, 2000);

                  trackEvent('cc_ai_suggestion_copy', {
                    product_handle: product.handle,
                    variant_id: selectedVariantId,
                    suggestion_index: index
                  });
                } catch (error) {
                  debug.error('Failed to copy:', error);
                }
              });
            });

            trackEvent('cc_ai_suggestions_generated', {
              product_handle: product.handle,
              variant_id: selectedVariantId,
              count: data.suggestions.length
            });
          }

        } catch (error) {
          debug.error('[CC Choice] AI generation error:', error);
          alert('Sorry, we couldn\'t generate suggestions right now. Please try again.');
        } finally {
          aiGenerateBtn.disabled = false;
          aiGenerateBtn.textContent = 'Generate Suggestions';
        }
      });
    }

    // Debounced save to localStorage
    let saveTimeout;
    const debouncedSave = () => {
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        const data = {
          insideMessage: insideTextarea ? insideTextarea.value : ''
        };
        savePersonalization(product.handle, selectedVariantId, data);
      }, 500);
    };

    if (insideTextarea) {
      insideTextarea.addEventListener('input', debouncedSave);
    }

    // Leave blank toggle - Professional blank card mode
    const leaveBlankCheckbox = modal.querySelector('[data-cc-leave-blank]');
    if (leaveBlankCheckbox && insideTextarea) {
      leaveBlankCheckbox.addEventListener('change', (e) => {
        const messageField = modal.querySelector('[data-ccc-message-field]');
        const writingArea = modal.querySelector('[data-ccc-writing-area]');
        const typographySection = modal.querySelector('.ccc__typography-section');
        const aiToggle = modal.querySelector('[data-ccc-ai-toggle]');

        if (e.target.checked) {
          // BLANK CARD MODE: completely blank, no grey boxes
          insideTextarea.disabled = true;
          insideTextarea.required = false;
          insideTextarea.value = ''; // Clear message

          if (messageField) {
            messageField.value = '';
            messageField.disabled = true;
            messageField.classList.add('ccc__message-field--blank');
            messageField.setAttribute('tabindex', '-1');
          }

          // Soften writing area (no grey fill)
          if (writingArea) {
            writingArea.classList.add('ccc__writing-area--blank');
          }

          // Dim and disable typography controls
          if (typographySection) {
            typographySection.classList.add('ccc__typography-section--disabled');
          }

          // Disable AI toggle
          if (aiToggle) {
            aiToggle.disabled = true;
            aiToggle.style.opacity = '0.4';
          }
        } else {
          // NORMAL MODE: restore everything
          insideTextarea.disabled = false;
          insideTextarea.required = true;

          if (messageField) {
            messageField.disabled = false;
            messageField.classList.remove('ccc__message-field--blank');
            messageField.removeAttribute('tabindex');
            messageField.focus();
          }

          // Restore writing area
          if (writingArea) {
            writingArea.classList.remove('ccc__writing-area--blank');
          }

          // Re-enable typography controls
          if (typographySection) {
            typographySection.classList.remove('ccc__typography-section--disabled');
          }

          // Re-enable AI toggle
          if (aiToggle) {
            aiToggle.disabled = false;
            aiToggle.style.opacity = '';
          }
        }
      });
    }

    // Enhanced focus management on load
    setTimeout(() => {
      const messageField = modal.querySelector('[data-ccc-message-field]');
      const leaveBlank = modal.querySelector('[data-cc-leave-blank]');

      // Only auto-focus if "leave blank" is not checked
      if (messageField && (!leaveBlank || !leaveBlank.checked)) {
        messageField.focus();
      }
    }, 150);

    // Form submit - use specific ID selector with retry logic
    let form = modal.querySelector('#cc-modal-form');
    debug.log('[CC Choice] Looking for form #cc-modal-form...');

    // Retry logic if form not found immediately
    if (!form) {
      debug.log('[CC Choice] Form not found on first attempt, retrying...');
      let retries = 0;
      const maxRetries = 3;
      const retryInterval = setInterval(() => {
        form = modal.querySelector('#cc-modal-form');
        retries++;

        if (form || retries >= maxRetries) {
          clearInterval(retryInterval);

          if (form) {
            debug.log(`[CC Choice] Form found after ${retries} retry(ies)`);
            attachFormSubmitHandler(modal, form, callbacks);
          } else {
            debug.error('[CC Choice] CRITICAL: Form #cc-modal-form not found after retries!');
            debug.error('[CC Choice] Modal body HTML (first 500 chars):', modal.querySelector("[data-ccc-body]").innerHTML.substring(0, 500));
            debug.error('[CC Choice] Available forms:', modal.querySelectorAll('form').length);

            // Log any forms that do exist for debugging
            modal.querySelectorAll('form').forEach(f => {
              debug.error('[CC Choice] Found form with ID:', f.id || 'no ID');
            });
          }
        } else {
          debug.log(`[CC Choice] Retry ${retries}/${maxRetries}...`);
        }
      }, 100); // Try every 100ms
    } else {
      debug.log('[CC Choice] Form found immediately, Form ID:', form?.id);
      attachFormSubmitHandler(modal, form, callbacks);
    }

}

/**
 * Helper: Attach form submit handler
 * @private
 */
function attachFormSubmitHandler(modal, form, callbacks) {
  debug.log('[Personaliser View] Attaching submit event listener to form');
  form.addEventListener('submit', (e) => {
    debug.log('[Personaliser View] Form submit event fired');
    debug.log('[Personaliser View] Event target:', e.target);
    debug.log('[Personaliser View] Form element:', form);
    debug.log('[Personaliser View] Submit button:', e.submitter);
    e.preventDefault();
    callbacks.onSubmit(form);
  });

  // Also log if any submit buttons are found
  const submitButtons = form.querySelectorAll('[type="submit"]');
  debug.log('[Personaliser View] Submit buttons found in form:', submitButtons.length);
  submitButtons.forEach((btn, i) => {
    debug.log(`[Personaliser View] Submit button ${i + 1}:`, btn.textContent.trim());
  });
}
