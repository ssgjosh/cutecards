/**
 * CC Recommendations Engine
 * Client-side product recommendation system using tag-based matching
 *
 * Features:
 * - Tag-based scoring (interest, occasion, recipient, style)
 * - Bestseller fallback
 * - Pivot chips (More like this, More {interest}, More {occasion})
 * - Session-based product catalog caching
 * - Analytics tracking
 * - Nested modal support
 */

(function() {
  'use strict';

  // ============================================================================
  // Configuration
  // ============================================================================

  const CONFIG = {
    CACHE_KEY: 'cc_product_catalog',
    CACHE_DURATION: 1800000, // 30 minutes
    MAX_PRODUCTS: 250, // Limit for /products.json fetch
    RAIL_SIZE: 6, // Number of recommendations to show
    TAG_WEIGHTS: {
      interest: 3,
      occasion: 2,
      recipient: 2,
      style: 1,
      humour: 0.5
    },
    DIVERSITY: {
      max_per_interest: 2,
      max_per_style: 2
    }
  };

  // ============================================================================
  // Utility Functions
  // ============================================================================

  /**
   * Track analytics event
   */
  function trackEvent(eventName, properties = {}) {
    // GA4
    if (typeof gtag !== 'undefined') {
      gtag('event', eventName, properties);
    }
    // Shopify Analytics
    if (typeof window.ShopifyAnalytics !== 'undefined') {
      window.ShopifyAnalytics.lib.track(eventName, properties);
    }
    console.log('[CC Recs]', eventName, properties);
  }

  /**
   * Parse tags into structured data
   * Example: ["interest:frogs", "recipient:dad"] => { interest: ["frogs"], recipient: ["dad"] }
   */
  function parseTags(tags) {
    const parsed = {
      interest: [],
      occasion: [],
      recipient: [],
      style: [],
      humour: []
    };

    if (!tags || !Array.isArray(tags)) return parsed;

    tags.forEach(tag => {
      const tagLower = tag.toLowerCase().trim();
      const parts = tagLower.split(':');

      if (parts.length === 2) {
        const [category, value] = parts;
        if (parsed.hasOwnProperty(category)) {
          parsed[category].push(value);
        }
      }
    });

    return parsed;
  }

  /**
   * Calculate Jaccard similarity between two tag arrays
   */
  function jaccardSimilarity(arr1, arr2) {
    if (!arr1.length || !arr2.length) return 0;

    const set1 = new Set(arr1);
    const set2 = new Set(arr2);

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }

  /**
   * Format price (assumes Shopify money format)
   */
  function formatPrice(cents) {
    if (typeof Shopify !== 'undefined' && Shopify.formatMoney) {
      return Shopify.formatMoney(cents, theme.moneyFormat || '£{{amount}}');
    }
    return `£${(cents / 100).toFixed(2)}`;
  }

  /**
   * Debounce function
   */
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // ============================================================================
  // Product Catalog Manager
  // ============================================================================

  class ProductCatalog {
    constructor() {
      this.products = [];
      this.loading = false;
      this.loaded = false;
    }

    /**
     * Load product catalog from cache or API
     */
    async load() {
      if (this.loaded) return this.products;
      if (this.loading) {
        // Wait for existing load to complete
        return new Promise((resolve) => {
          const checkLoaded = setInterval(() => {
            if (this.loaded) {
              clearInterval(checkLoaded);
              resolve(this.products);
            }
          }, 100);
        });
      }

      this.loading = true;

      // Try cache first
      const cached = this.loadFromCache();
      if (cached) {
        this.products = cached;
        this.loaded = true;
        this.loading = false;
        return this.products;
      }

      // Fetch from API
      try {
        const response = await fetch(`/products.json?limit=${CONFIG.MAX_PRODUCTS}`);
        if (!response.ok) throw new Error('Failed to fetch products');

        const data = await response.json();
        this.products = data.products.map(p => ({
          handle: p.handle,
          title: p.title,
          tags: p.tags,
          parsedTags: parseTags(p.tags),
          price: p.variants?.[0]?.price || 0,
          available: p.available,
          image: p.images?.[0] || null,
          url: `/products/${p.handle}`,
          productType: p.product_type,
          vendor: p.vendor
        }));

        // Save to cache
        this.saveToCache(this.products);

        this.loaded = true;
        this.loading = false;

        return this.products;
      } catch (error) {
        console.error('[CC Recs] Failed to load product catalog:', error);
        this.loading = false;
        return [];
      }
    }

    /**
     * Load from sessionStorage
     */
    loadFromCache() {
      try {
        const cached = sessionStorage.getItem(CONFIG.CACHE_KEY);
        if (!cached) return null;

        const data = JSON.parse(cached);
        const age = Date.now() - data.timestamp;

        if (age > CONFIG.CACHE_DURATION) {
          sessionStorage.removeItem(CONFIG.CACHE_KEY);
          return null;
        }

        return data.products;
      } catch (error) {
        console.error('[CC Recs] Cache load error:', error);
        return null;
      }
    }

    /**
     * Save to sessionStorage
     */
    saveToCache(products) {
      try {
        const data = {
          timestamp: Date.now(),
          products: products
        };
        sessionStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify(data));
      } catch (error) {
        console.error('[CC Recs] Cache save error:', error);
      }
    }

    /**
     * Find product by handle
     */
    findByHandle(handle) {
      return this.products.find(p => p.handle === handle);
    }
  }

  // ============================================================================
  // Recommendation Engine
  // ============================================================================

  class RecommendationEngine {
    constructor(catalog) {
      this.catalog = catalog;
    }

    /**
     * Get recommendations for a product
     *
     * @param {string} anchorHandle - Product to get recommendations for
     * @param {string} mode - 'similar' | 'interest' | 'occasion'
     * @returns {Promise<Array>} - Array of recommended product handles
     */
    async getRecommendations(anchorHandle, mode = 'similar') {
      const startTime = performance.now();

      // Load catalog
      await this.catalog.load();

      const anchorProduct = this.catalog.findByHandle(anchorHandle);
      if (!anchorProduct) {
        console.warn('[CC Recs] Anchor product not found:', anchorHandle);
        return this.getFallbackRecommendations();
      }

      const anchorTags = anchorProduct.parsedTags;

      // Score all products
      const scored = this.catalog.products
        .filter(p => p.handle !== anchorHandle) // Exclude anchor
        .filter(p => p.available) // Only available products
        .map(product => ({
          product,
          score: this.scoreProduct(product.parsedTags, anchorTags, mode)
        }))
        .filter(item => item.score > 0) // Only products with some match
        .sort((a, b) => b.score - a.score);

      // Apply diversity constraints
      const diversified = this.diversify(scored);

      // Get top N handles
      const recommended = diversified
        .slice(0, CONFIG.RAIL_SIZE)
        .map(item => item.product.handle);

      // Fill with bestsellers if needed
      if (recommended.length < CONFIG.RAIL_SIZE) {
        const fillCount = CONFIG.RAIL_SIZE - recommended.length;
        const bestsellers = await this.getFallbackRecommendations(fillCount);
        recommended.push(...bestsellers.filter(h => !recommended.includes(h)));
      }

      const duration = performance.now() - startTime;

      trackEvent('cc_recs_match', {
        anchor_handle: anchorHandle,
        mode: mode,
        match_count: recommended.length,
        duration_ms: Math.round(duration)
      });

      return recommended.slice(0, CONFIG.RAIL_SIZE);
    }

    /**
     * Score a product against anchor tags
     */
    scoreProduct(productTags, anchorTags, mode) {
      let score = 0;

      // Mode-specific scoring
      if (mode === 'interest') {
        // Only match interest tags
        if (anchorTags.interest.length && productTags.interest.length) {
          score += jaccardSimilarity(productTags.interest, anchorTags.interest) * CONFIG.TAG_WEIGHTS.interest * 3;
        }
      } else if (mode === 'occasion') {
        // Only match occasion tags
        if (anchorTags.occasion.length && productTags.occasion.length) {
          score += jaccardSimilarity(productTags.occasion, anchorTags.occasion) * CONFIG.TAG_WEIGHTS.occasion * 3;
        }
      } else {
        // 'similar' mode - full matching
        // Interest
        if (anchorTags.interest.length && productTags.interest.length) {
          score += jaccardSimilarity(productTags.interest, anchorTags.interest) * CONFIG.TAG_WEIGHTS.interest;
        }

        // Occasion
        if (anchorTags.occasion.length && productTags.occasion.length) {
          score += jaccardSimilarity(productTags.occasion, anchorTags.occasion) * CONFIG.TAG_WEIGHTS.occasion;
        }

        // Recipient
        if (anchorTags.recipient.length && productTags.recipient.length) {
          score += jaccardSimilarity(productTags.recipient, anchorTags.recipient) * CONFIG.TAG_WEIGHTS.recipient;
        }

        // Style
        if (anchorTags.style.length && productTags.style.length) {
          score += jaccardSimilarity(productTags.style, anchorTags.style) * CONFIG.TAG_WEIGHTS.style;
        }

        // Humour
        if (anchorTags.humour.length && productTags.humour.length) {
          score += jaccardSimilarity(productTags.humour, anchorTags.humour) * CONFIG.TAG_WEIGHTS.humour;
        }
      }

      return score;
    }

    /**
     * Apply diversity constraints (max 2 per interest/style)
     */
    diversify(scoredProducts) {
      const interestCounts = {};
      const styleCounts = {};
      const result = [];

      for (const item of scoredProducts) {
        const interests = item.product.parsedTags.interest;
        const styles = item.product.parsedTags.style;

        // Check interest diversity
        let skipInterest = false;
        for (const interest of interests) {
          if (interestCounts[interest] >= CONFIG.DIVERSITY.max_per_interest) {
            skipInterest = true;
            break;
          }
        }

        // Check style diversity
        let skipStyle = false;
        for (const style of styles) {
          if (styleCounts[style] >= CONFIG.DIVERSITY.max_per_style) {
            skipStyle = true;
            break;
          }
        }

        // Skip if diversity limit reached
        if (skipInterest && skipStyle) continue;

        // Add to result
        result.push(item);

        // Update counts
        for (const interest of interests) {
          interestCounts[interest] = (interestCounts[interest] || 0) + 1;
        }
        for (const style of styles) {
          styleCounts[style] = (styleCounts[style] || 0) + 1;
        }
      }

      return result;
    }

    /**
     * Get fallback recommendations (bestsellers)
     */
    async getFallbackRecommendations(limit = CONFIG.RAIL_SIZE) {
      try {
        const response = await fetch(`/products.json?limit=${limit}&sort_by=best-selling`);
        if (!response.ok) throw new Error('Failed to fetch bestsellers');

        const data = await response.json();
        return data.products
          .filter(p => p.available)
          .map(p => p.handle)
          .slice(0, limit);
      } catch (error) {
        console.error('[CC Recs] Fallback recommendations error:', error);
        return [];
      }
    }
  }

  // ============================================================================
  // Rail Controller
  // ============================================================================

  class RecommendationRail {
    constructor(containerSelector, engine) {
      this.container = document.querySelector(containerSelector);
      if (!this.container) {
        console.warn('[CC Recs] Container not found:', containerSelector);
        return;
      }

      this.engine = engine;
      this.currentAnchor = null;
      this.currentMode = 'similar';
      this.currentHandles = [];
    }

    /**
     * Initialize and render recommendations
     */
    async render(anchorHandle, anchorTags) {
      if (!this.container) return;

      this.currentAnchor = anchorHandle;
      this.showLoading();

      try {
        // Get recommendations
        const handles = await this.engine.getRecommendations(anchorHandle, this.currentMode);
        this.currentHandles = handles;

        if (!handles.length) {
          this.showEmpty();
          return;
        }

        // Render section with handles
        await this.renderSection(handles);

        // Add pivot chips
        this.renderPivotChips(anchorTags);

        // Wire up event listeners
        this.attachEventListeners();

        // Track view
        trackEvent('cc_recs_view', {
          anchor_handle: anchorHandle,
          mode: this.currentMode,
          count: handles.length
        });

        // Track impressions
        trackEvent('cc_recs_impression', {
          anchor_handle: anchorHandle,
          handles: handles.join(',')
        });

      } catch (error) {
        console.error('[CC Recs] Render error:', error);
        this.showError();
      }
    }

    /**
     * Show loading skeleton
     */
    showLoading() {
      this.container.innerHTML = `
        <div class="cc-recs__loading">
          <div class="cc-recs__skeleton-grid">
            ${Array(CONFIG.RAIL_SIZE).fill(0).map(() => `
              <div class="cc-recs__skeleton-card">
                <div class="cc-recs__skeleton-image"></div>
                <div class="cc-recs__skeleton-title"></div>
                <div class="cc-recs__skeleton-price"></div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    /**
     * Show empty state with helpful message and link
     */
    showEmpty() {
      this.container.innerHTML = `
        <div class="cc-recs__empty">
          <p class="cc-recs__empty-message">Not finding what you're looking for?</p>
          <a href="/collections/all" class="cc-recs__empty-link">Browse all cards</a>
        </div>
      `;
    }

    /**
     * Show error state
     */
    showError() {
      this.container.innerHTML = `
        <div class="cc-recs__error">
          <p>Unable to load recommendations</p>
        </div>
      `;
    }

    /**
     * Fetch and render section
     */
    async renderSection(handles) {
      const url = `/?section_id=cc-recs&handles=${handles.join(',')}`;

      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Section fetch failed');

        const html = await response.text();

        // Extract section content (Shopify section API returns raw HTML)
        this.container.innerHTML = html;

      } catch (error) {
        console.error('[CC Recs] Section render error:', error);
        throw error;
      }
    }

    /**
     * Render pivot chips above rail
     */
    renderPivotChips(anchorTags) {
      const railElement = this.container.querySelector('[data-cc-recs-rail]');
      if (!railElement) return;

      const interest = anchorTags.interest?.[0] || null;
      const occasion = anchorTags.occasion?.[0] || null;

      const chipsHtml = `
        <div class="cc-recs__header">
          <h3 class="cc-recs__title">People also viewed</h3>
          <div class="cc-recs__pivots">
            <button
              type="button"
              class="cc-recs__pivot ${this.currentMode === 'similar' ? 'cc-recs__pivot--active' : ''}"
              data-pivot="similar"
            >
              More like this
            </button>
            ${interest ? `
              <button
                type="button"
                class="cc-recs__pivot ${this.currentMode === 'interest' ? 'cc-recs__pivot--active' : ''}"
                data-pivot="interest"
              >
                More ${interest}
              </button>
            ` : ''}
            ${occasion ? `
              <button
                type="button"
                class="cc-recs__pivot ${this.currentMode === 'occasion' ? 'cc-recs__pivot--active' : ''}"
                data-pivot="occasion"
              >
                More ${occasion}
              </button>
            ` : ''}
          </div>
        </div>
      `;

      railElement.insertAdjacentHTML('beforebegin', chipsHtml);
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
      // Pivot chip clicks
      const pivotButtons = this.container.querySelectorAll('[data-pivot]');
      pivotButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
          const oldMode = this.currentMode;
          const newMode = e.target.dataset.pivot;

          if (oldMode === newMode) return;

          trackEvent('cc_recs_pivot', {
            anchor_handle: this.currentAnchor,
            from_mode: oldMode,
            to_mode: newMode
          });

          this.currentMode = newMode;

          // Re-render with new mode
          const anchorProduct = this.engine.catalog.findByHandle(this.currentAnchor);
          await this.render(this.currentAnchor, anchorProduct.parsedTags);
        });
      });

      // Product card clicks
      const cards = this.container.querySelectorAll('[data-cc-card]');
      cards.forEach((card, index) => {
        card.addEventListener('click', (e) => {
          const handle = card.dataset.ccHandle;

          trackEvent('cc_recs_click', {
            anchor_handle: this.currentAnchor,
            rec_handle: handle,
            position: index,
            mode: this.currentMode
          });

          // Nested modal handled by cc-choice.js
          // Just track the event here
        });
      });
    }
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  // Create instances
  const catalog = new ProductCatalog();
  const engine = new RecommendationEngine(catalog);

  // Expose to global scope for cc-choice.js integration
  window.ccRecs = {
    catalog,
    engine,
    createRail: (containerSelector) => new RecommendationRail(containerSelector, engine),
    trackEvent
  };

  console.log('[CC Recs] Recommendation engine initialized');

})();
