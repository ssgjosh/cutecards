/**
 * AI Service
 *
 * @module services/aiService
 * @description Client for Cute Cards AI message suggestions Cloudflare Worker
 *
 * @public generateMessageSuggestions(params: AISuggestParams) → Promise<AISuggestResponse>
 *
 * @typedef {Object} AISuggestParams
 * @property {string} recipient - Who the card is for (e.g., "Mum", "Dave")
 * @property {string} occasion - What's the occasion (e.g., "Birthday", "Thank you")
 * @property {string} [details] - Optional extra context
 * @property {string} [imageUrl] - Optional card image URL (for AI vision)
 *
 * @typedef {Object} AISuggestion
 * @property {string} message - The suggested message text
 * @property {string} tone - Tone category ("brief", "warm", or "heartfelt")
 *
 * @typedef {Object} AISuggestResponse
 * @property {AISuggestion[]} suggestions - Array of 3 suggestions (brief, warm, heartfelt)
 * @property {string} [error] - Error message if generation failed
 *
 * @example
 * import { generateMessageSuggestions } from './services/aiService.js';
 *
 * const result = await generateMessageSuggestions({
 *   recipient: 'Mum',
 *   occasion: 'Birthday',
 *   details: 'Loves gardening',
 *   imageUrl: 'https://...'
 * });
 *
 * result.suggestions.forEach(s => {
 *   console.log(`${s.tone}: ${s.message}`);
 * });
 */

// ========================================
// CONFIGURATION
// ========================================

/**
 * Cloudflare Worker URL for AI suggestions
 * @type {string}
 */
const AI_WORKER_URL = 'https://cute-cards-ai-suggestions.josh-715.workers.dev';

/**
 * Request timeout in milliseconds
 * @type {number}
 */
const REQUEST_TIMEOUT_MS = 30000; // 30 seconds

// ========================================
// DEBUG CONFIGURATION
// ========================================

const DEBUG = new URLSearchParams(window.location.search).has('cc_debug') || window.ccDebug === true;

const debug = {
  log: (...args) => DEBUG && console.log(...args),
  error: (...args) => console.error(...args) // Always show errors
};

// ========================================
// PUBLIC API
// ========================================

/**
 * Generate AI message suggestions via Cloudflare Worker
 *
 * Calls the Cute Cards AI suggestions worker which uses OpenRouter GPT-4o-mini
 * to generate three message variations: brief, warm, and heartfelt.
 *
 * @param {AISuggestParams} params - Suggestion parameters
 * @returns {Promise<AISuggestResponse>} AI-generated suggestions
 * @throws {Error} If network request fails or worker returns error
 *
 * @example
 * const result = await generateMessageSuggestions({
 *   recipient: 'Dad',
 *   occasion: 'Thank you',
 *   details: 'For helping me move house',
 *   imageUrl: 'https://cdn.shopify.com/...'
 * });
 *
 * // Returns:
 * // {
 * //   suggestions: [
 * //     { message: "Thanks Dad!", tone: "brief" },
 * //     { message: "Thank you so much Dad...", tone: "warm" },
 * //     { message: "Dear Dad, I wanted to...", tone: "heartfelt" }
 * //   ]
 * // }
 */
export async function generateMessageSuggestions({ recipient, occasion, details = '', imageUrl = '' }) {
  debug.log('[AI Service] Generating suggestions for:', { recipient, occasion, details, imageUrl });

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(AI_WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: recipient.trim(),
        occasion: occasion.trim(),
        details: details.trim(),
        imageUrl: imageUrl
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`AI worker returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    if (!data.suggestions || data.suggestions.length === 0) {
      throw new Error('No suggestions returned from AI');
    }

    debug.log('[AI Service] Successfully generated suggestions:', data.suggestions.length);
    return data;

  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      debug.error('[AI Service] Request timed out after', REQUEST_TIMEOUT_MS, 'ms');
      throw new Error('Request timed out. Please try again.');
    }

    debug.error('[AI Service] Failed to generate suggestions:', error);
    throw error;
  }
}

/**
 * Check if AI suggestions are available
 *
 * Performs a quick health check on the AI worker endpoint.
 *
 * @returns {Promise<boolean>} True if AI service is available
 *
 * @example
 * if (await isAIServiceAvailable()) {
 *   // Show "Stuck for words?" button
 * }
 */
export async function isAIServiceAvailable() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout for health check

    const response = await fetch(AI_WORKER_URL, {
      method: 'HEAD',
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    return response.ok || response.status === 405; // 405 = Method Not Allowed (worker exists but doesn't support HEAD)
  } catch (error) {
    debug.log('[AI Service] Health check failed:', error.message);
    return false;
  }
}
