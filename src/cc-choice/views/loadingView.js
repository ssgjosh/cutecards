/**
 * Loading View
 *
 * @module views/loadingView
 * @description Renders the loading spinner shown while fetching product data
 *
 * @public renderLoadingView() → string
 *
 * @example
 * import { renderLoadingView } from './views/loadingView.js';
 * modalBody.innerHTML = renderLoadingView();
 */

/**
 * Renders loading spinner HTML
 *
 * @returns {string} HTML string with loading spinner and screen reader text
 */
export function renderLoadingView() {
  return `
    <div class="ccc__loading">
      <div class="ccc__spinner" role="status" aria-live="polite">
        <svg class="ccc__spinner-svg" viewBox="0 0 50 50">
          <circle class="ccc__spinner-circle" cx="25" cy="25" r="20" fill="none" stroke-width="4"></circle>
        </svg>
        <span class="visually-hidden">Loading product options...</span>
      </div>
    </div>
  `;
}
