/**
 * Message Field / Card Preview
 *
 * @module views/messageField
 * @description Canvas-based card interior preview with live text rendering
 *
 * @public loadAllGoogleFonts() → Promise<void>
 * @public initializeCardPreview(modal: HTMLElement) → void
 * @public renderCardPreview(modal: HTMLElement, message: string, fontFamily: string, fontSize: string, textColor: string) → void
 *
 * @example
 * import { loadAllGoogleFonts, initializeCardPreview, renderCardPreview } from './views/messageField.js';
 *
 * // Load fonts on page load
 * loadAllGoogleFonts();
 *
 * // Initialize canvas when personaliser view loads
 * initializeCardPreview(modalElement);
 *
 * // Re-render on message/font changes
 * renderCardPreview(modalElement, message, 'Playfair Display', 'medium', '#1A1A1A');
 */

// ========================================
// DEBUG CONFIGURATION
// ========================================

const DEBUG = new URLSearchParams(window.location.search).has('cc_debug') || window.ccDebug === true;

const debug = {
  log: (...args) => DEBUG && console.log(...args),
  warn: (...args) => DEBUG && console.warn(...args),
  error: (...args) => console.error(...args)
};

// ========================================
// PUBLIC API
// ========================================

/**
 * Load all Google Fonts used in font picker
 *
 * Loads all 12 fonts at once so they're available immediately in the dropdown.
 * Returns promise that resolves when fonts are ready.
 *
 * @returns {Promise<void>} Promise that resolves when fonts loaded
 *
 * @example
 * await loadAllGoogleFonts();
 * // All fonts now available for rendering
 */
export function loadAllGoogleFonts() {
  // Load all fonts at once so dropdown shows them properly
  const fonts = [
    'Playfair+Display',
    'Dancing+Script',
    'Pacifico',
    'Great+Vibes',
    'Caveat',
    'Permanent+Marker',
    'Shadows+Into+Light',
    'Cookie',
    'Satisfy',
    'Indie+Flower',
    'Lora',
    'Crimson+Text'
  ];

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${fonts.join(':wght@400;600&family=')}:wght@400;600&display=swap`;
  document.head.appendChild(link);

  debug.log('[Message Field] Loading all Google Fonts for inline editing');
  return document.fonts.ready;
}

/**
 * Load a specific Google Font
 *
 * Since all fonts are pre-loaded by loadAllGoogleFonts, this just waits for fonts.ready.
 *
 * @param {string} fontFamily - Font family name
 * @returns {Promise<void>} Promise that resolves when font ready
 *
 * @example
 * await loadGoogleFont('Playfair Display');
 */
export function loadGoogleFont(fontFamily) {
  // Fonts are already loaded by loadAllGoogleFonts, just wait for fonts.ready
  return document.fonts.ready;
}

/**
 * Initialize card preview canvas
 *
 * Sets up canvas dimensions and loads fonts.
 * Renders initial blank state.
 *
 * @param {HTMLElement} modal - Modal element containing canvas
 *
 * @example
 * initializeCardPreview(modalElement);
 */
export function initializeCardPreview(modal) {
  const canvas = modal.querySelector('[data-ccc-canvas]');
  const placeholder = modal.querySelector('[data-ccc-canvas-placeholder]');

  if (!canvas) {
    debug.error('[Message Field] Canvas not found');
    return;
  }

  // Set canvas dimensions (card interior aspect ratio)
  const container = canvas.parentElement;
  const containerWidth = container.clientWidth;

  // A5 card interior dimensions: 148mm x 210mm (roughly 1:1.4 ratio)
  // But we'll use landscape orientation for the interior (folded open)
  const aspectRatio = 2.8 / 2; // Double width when opened

  canvas.width = 1400; // High DPI for crisp text
  canvas.height = 1000;
  canvas.style.width = '100%';
  canvas.style.height = 'auto';

  debug.log('[Message Field] Canvas initialized:', { width: canvas.width, height: canvas.height });

  // Load all fonts and initial render
  loadAllGoogleFonts().then(() => {
    renderCardPreview(modal, '', 'Playfair Display', 'medium', '#1A1A1A');
  });
}

/**
 * Render card preview with message
 *
 * Draws card interior with:
 * - Cream background with subtle texture
 * - Center fold line
 * - Message text on right page with word wrap
 * - Auto-centering and font rendering
 *
 * @param {HTMLElement} modal - Modal element containing canvas
 * @param {string} message - Message text to render
 * @param {string} fontFamily - Google Font family name
 * @param {string} fontSize - Size ('small' | 'medium' | 'large')
 * @param {string} textColor - Hex color code
 *
 * @example
 * renderCardPreview(
 *   modalElement,
 *   'Happy Birthday!',
 *   'Playfair Display',
 *   'medium',
 *   '#1A1A1A'
 * );
 */
export function renderCardPreview(modal, message, fontFamily = 'Playfair Display', fontSize = 'medium', textColor = '#1A1A1A') {
  const canvas = modal.querySelector('[data-ccc-canvas]');
  const placeholder = modal.querySelector('[data-ccc-canvas-placeholder]');

  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;

  // Show/hide placeholder
  if (message.trim().length === 0) {
    if (placeholder) placeholder.removeAttribute('hidden');
    canvas.style.opacity = '0';
    return;
  } else {
    if (placeholder) placeholder.setAttribute('hidden', '');
    canvas.style.opacity = '1';
  }

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  // Card background (cream/off-white)
  ctx.fillStyle = '#FAF9F6';
  ctx.fillRect(0, 0, width, height);

  // Subtle texture/grain
  for (let i = 0; i < 1000; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const opacity = Math.random() * 0.015;
    ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
    ctx.fillRect(x, y, 1, 1);
  }

  // Center line (fold)
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 5]);
  ctx.beginPath();
  ctx.moveTo(width / 2, 0);
  ctx.lineTo(width / 2, height);
  ctx.stroke();
  ctx.setLineDash([]);

  // Left page (blank - this is where envelope would be attached)
  // Right page (message)
  const rightPageX = width / 2;
  const rightPageWidth = width / 2;
  const padding = 80;

  // Text rendering setup
  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Font size mapping (scales based on card size and ensures text fits)
  const fontSizeMap = {
    'small': 24,
    'medium': 32,
    'large': 42
  };

  const baseFontSize = fontSizeMap[fontSize] || 32;

  // Use selected Google Font with fallbacks
  ctx.font = `${baseFontSize}px "${fontFamily}", Georgia, 'Times New Roman', serif`;

  // Word wrap the message with smart fitting
  const maxWidth = rightPageWidth - (padding * 2);
  const lineHeight = baseFontSize * 1.5;
  const words = message.split(' ');
  const lines = [];
  let currentLine = '';

  words.forEach(word => {
    const testLine = currentLine + (currentLine ? ' ' : '') + word;
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && currentLine !== '') {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  // Check if text fits vertically, auto-reduce font size if needed
  let totalTextHeight = lines.length * lineHeight;
  const maxHeight = height - (padding * 2);

  if (totalTextHeight > maxHeight) {
    // Text too tall - warn user or auto-scale
    debug.warn('[Message Field] Text too tall for card:', { totalTextHeight, maxHeight, lines: lines.length });
    // Could add visual warning here
  }

  // Center the text block vertically with improved calculation
  // For textBaseline='middle', we want the center of the entire text block at height/2
  const textBlockHeight = lines.length * lineHeight;
  const textBlockTop = (height - textBlockHeight) / 2;
  const firstLineY = textBlockTop + (lineHeight / 2);

  // Render each line - center at 45% across the right page (adjusted for visual centering)
  const centerX = rightPageX + (rightPageWidth * 0.45);

  debug.log('[Message Field] Text position:', {
    canvasWidth: width,
    rightPageX,
    rightPageWidth,
    centerX,
    calculation: `${rightPageX} + (${rightPageWidth} * 0.45) = ${centerX}`
  });

  lines.forEach((line, index) => {
    const y = firstLineY + (index * lineHeight);
    ctx.fillText(line, centerX, y);
  });

  debug.log('[Message Field] Canvas rendered:', {
    messageLength: message.length,
    lines: lines.length,
    fontFamily,
    fontSize: baseFontSize,
    fitsVertically: totalTextHeight <= maxHeight
  });
}
