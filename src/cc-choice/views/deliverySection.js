/**
 * Delivery Section View
 *
 * @module views/deliverySection
 * @description Renders delivery method toggle and recipient address fields
 *
 * @public renderDeliverySection(config: DeliverySectionConfig) → HTMLString
 *
 * @typedef {Object} DeliverySectionConfig
 * @property {Object} variantSkus - { sku_bla, sku_dir } for selected variant
 *
 * @example
 * import { renderDeliverySection } from './views/deliverySection.js';
 *
 * const html = renderDeliverySection({
 *   variantSkus: { sku_bla: 'PRD-123', sku_dir: 'PRD-456' }
 * });
 *
 * // Returns: full delivery section HTML with toggle and address fields
 * // Returns: empty string if no sku_dir (Mail2Me only)
 */

// ========================================
// DEBUG CONFIGURATION
// ========================================

const DEBUG = new URLSearchParams(window.location.search).has('cc_debug') || window.ccDebug === true;

const debug = {
  log: (...args) => DEBUG && console.log(...args)
};

// ========================================
// PUBLIC API
// ========================================

/**
 * Render delivery method section with recipient address fields
 *
 * Shows Mail2Me vs Mail4Me toggle if both SKUs available.
 * Returns empty string if only Mail2Me available (no sku_dir).
 *
 * @param {DeliverySectionConfig} config - Delivery section configuration
 * @returns {string} HTML string for delivery section or empty string
 *
 * @example
 * const html = renderDeliverySection({
 *   variantSkus: { sku_bla: 'PRD-123', sku_dir: 'PRD-456' }
 * });
 */
export function renderDeliverySection({ variantSkus }) {
  // If no SKU data or no direct SKU available, don't show delivery options
  if (!variantSkus || !variantSkus.sku_dir) {
    debug.log('[Delivery Section] No delivery options - missing SKU data or sku_dir:', { variantSkus });
    return ''; // Only Mail2Me available - no toggle needed
  }

  debug.log('[Delivery Section] Showing delivery options - both Mail2Me and Mail4Me available');

  // Both Mail2Me and Mail4Me available - show toggle
  return `
    <!-- Delivery Method Section -->
    <div class="ccc__delivery-section">
      <h3 class="ccc__delivery-heading">Delivery Options</h3>

      <div class="ccc__delivery-options">
        <label class="ccc__delivery-option">
          <input
            type="radio"
            name="delivery_method"
            value="Mail2Me"
            data-ccc-delivery-radio
            checked
          >
          <div class="ccc__delivery-option-content">
            <span class="ccc__delivery-option-title">Post to me</span>
            <span class="ccc__delivery-option-desc">Sent to you with blank envelope</span>
          </div>
        </label>

        <label class="ccc__delivery-option">
          <input
            type="radio"
            name="delivery_method"
            value="Mail4Me"
            data-ccc-delivery-radio
          >
          <div class="ccc__delivery-option-content">
            <span class="ccc__delivery-option-title">Send direct to recipient</span>
            <span class="ccc__delivery-option-desc">We'll post it directly for you</span>
          </div>
        </label>
      </div>

      <!-- Recipient Address Fields (hidden by default) -->
      <div class="ccc__recipient-fields" data-ccc-recipient-fields hidden>
        <h4 class="ccc__recipient-heading">Recipient Details</h4>

        <div class="cc-field">
          <label for="cc-recipient-name" class="cc-label">
            Recipient Name <span class="required">*</span>
          </label>
          <input
            id="cc-recipient-name"
            class="cc-input field__input"
            type="text"
            name="properties[Recipient Name]"
            data-ccc-recipient-field
          >
        </div>

        <div class="cc-field">
          <label for="cc-recipient-address1" class="cc-label">
            Address Line 1 <span class="required">*</span>
          </label>
          <input
            id="cc-recipient-address1"
            class="cc-input field__input"
            type="text"
            name="properties[Recipient Address 1]"
            data-ccc-recipient-field
          >
        </div>

        <div class="cc-field">
          <label for="cc-recipient-address2" class="cc-label">
            Address Line 2 (optional)
          </label>
          <input
            id="cc-recipient-address2"
            class="cc-input field__input"
            type="text"
            name="properties[Recipient Address 2]"
          >
        </div>

        <div class="ccc__field-group">
          <div class="cc-field">
            <label for="cc-recipient-city" class="cc-label">
              City <span class="required">*</span>
            </label>
            <input
              id="cc-recipient-city"
              class="cc-input field__input"
              type="text"
              name="properties[Recipient City]"
              data-ccc-recipient-field
            >
          </div>

          <div class="cc-field">
            <label for="cc-recipient-postcode" class="cc-label">
              Postcode <span class="required">*</span>
            </label>
            <input
              id="cc-recipient-postcode"
              class="cc-input field__input"
              type="text"
              name="properties[Recipient Postcode]"
              data-ccc-recipient-field
            >
          </div>
        </div>

        <div class="cc-field">
          <label for="cc-recipient-country" class="cc-label">
            Country <span class="required">*</span>
          </label>
          <select
            id="cc-recipient-country"
            class="cc-input field__input"
            name="properties[Recipient Country]"
            data-ccc-recipient-field
          >
            <option value="GB">United Kingdom</option>
            <option value="US">United States</option>
            <option value="CA">Canada</option>
            <option value="AU">Australia</option>
            <option value="FR">France</option>
            <option value="DE">Germany</option>
            <option value="IT">Italy</option>
            <option value="ES">Spain</option>
            <option value="NL">Netherlands</option>
            <option value="IE">Ireland</option>
          </select>
        </div>
      </div>
    </div>
  `;
}
