/**
 * Layout Service
 *
 * @module core/layout
 * @description Calculates optimal card and column dimensions for desktop personalise view
 *
 * Pure functions with no DOM dependencies (except measurements passed in).
 * All layout math is separated from DOM mutation for testability.
 */

/**
 * Calculate optimal layout dimensions for desktop personalise modal
 *
 * @param {Object} config - Layout configuration
 * @param {number} config.dialogWidth - Width of dialog element (px)
 * @param {number} config.dialogHeight - Height of dialog element (px)
 * @param {number} config.headerHeight - Height of personaliser header (px)
 * @param {number} config.modalPadding - Padding around modal content (px)
 * @param {number} config.columnGap - Gap between preview and controls columns (px)
 * @param {number} config.cardAspect - Card aspect ratio (width/height)
 * @returns {Object|null} Layout result or null if mobile viewport
 *
 * @example
 * const layout = calculateOptimalLayout({
 *   dialogWidth: 1200,
 *   dialogHeight: 800,
 *   headerHeight: 110,
 *   modalPadding: 24,
 *   columnGap: 32,
 *   cardAspect: 1.43
 * });
 * // => { cardWidth: 560, cardHeight: 391, ... }
 */
export function calculateOptimalLayout({
  dialogWidth,
  dialogHeight,
  headerHeight,
  modalPadding,
  columnGap,
  cardAspect
}) {
  // Measure available space
  const availableWidth = dialogWidth - (modalPadding * 2);
  const availableHeight = dialogHeight - (modalPadding * 2) - headerHeight;

  // Calculate 70/30 split for preview/controls columns
  const previewColumnWidth = (availableWidth - columnGap) * 0.7;
  const controlsColumnWidth = (availableWidth - columnGap) * 0.3;

  // Calculate card dimensions based on aspect ratio
  // Start with width-based calculation
  let cardWidth = previewColumnWidth;
  let cardHeight = cardWidth / cardAspect;

  // Check if height fits
  const minControlsHeight = 420; // Minimum height needed for controls
  const maxCardHeight = availableHeight - 60; // Leave room for heading and padding

  if (cardHeight > maxCardHeight) {
    // Height-constrained: recalculate from height
    cardHeight = maxCardHeight;
    cardWidth = cardHeight * cardAspect;
  }

  // Ensure controls fit
  if (cardHeight < minControlsHeight) {
    cardHeight = Math.min(minControlsHeight, maxCardHeight);
    cardWidth = cardHeight * cardAspect;
  }

  return {
    cardWidth: Math.floor(cardWidth),
    cardHeight: Math.floor(cardHeight),
    previewColumnWidth: Math.floor(previewColumnWidth),
    controlsColumnWidth: Math.floor(controlsColumnWidth),
    availableHeight,
    needsScroll: cardHeight < minControlsHeight
  };
}

/**
 * Apply calculated layout to DOM
 *
 * Mutates :root CSS custom properties and personaliser data attributes.
 * Separated from calculation for cleaner separation of concerns.
 *
 * @param {HTMLElement} root - Document root element (document.documentElement)
 * @param {Object} layout - Layout result from calculateOptimalLayout()
 * @param {HTMLElement} dialog - Modal dialog element
 * @returns {void}
 *
 * @example
 * const layout = calculateOptimalLayout({ ... });
 * applyLayoutToDOM(document.documentElement, layout, modalDialog);
 */
export function applyLayoutToDOM(root, layout, dialog) {
  if (!layout || !root || !dialog) return;

  // Set CSS custom properties on :root
  root.style.setProperty('--ccc-card-width', `${layout.cardWidth}px`);
  root.style.setProperty('--ccc-card-height', `${layout.cardHeight}px`);

  // Add data attributes for layout mode
  const personaliser = dialog.querySelector('.ccc__personaliser');
  if (personaliser) {
    personaliser.setAttribute('data-ccc-layout-mode', 'desktop');
    if (layout.needsScroll) {
      personaliser.setAttribute('data-ccc-scroll-mode', 'enabled');
    }
  }
}

/**
 * Read layout configuration from CSS custom properties
 *
 * @param {HTMLElement} root - Document root element
 * @returns {Object} Layout config with CSS variable values
 */
export function readLayoutConfig(root) {
  const styles = getComputedStyle(root);

  return {
    headerHeight: parseInt(styles.getPropertyValue('--ccc-header-height')) || 110,
    modalPadding: parseInt(styles.getPropertyValue('--ccc-modal-padding')) || 24,
    columnGap: parseInt(styles.getPropertyValue('--ccc-column-gap')) || 32,
    cardAspect: parseFloat(styles.getPropertyValue('--ccc-card-aspect')) || 1.43
  };
}
