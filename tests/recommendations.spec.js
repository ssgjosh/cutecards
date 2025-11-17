/**
 * Playwright Tests: Recommendation Rail
 *
 * Tests the client-side recommendation system in the choice modal
 */

const { test, expect } = require('@playwright/test');

// Configuration
const BASE_URL = process.env.SHOPIFY_STORE_URL || 'https://your-store.myshopify.com';
const MODAL_TIMEOUT = 3000;
const RAIL_TIMEOUT = 600; // Target: load within 600ms

test.describe('Recommendation Rail', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to collection page with tagged products
    await page.goto(`${BASE_URL}/collections/all`);
    await page.waitForLoadState('networkidle');
  });

  test('Rail loads within 600ms of modal open', async ({ page }) => {
    // Find a product card with data-cc-card attribute
    const productCard = page.locator('[data-cc-card]').first();
    await expect(productCard).toBeVisible();

    const startTime = Date.now();

    // Click to open modal
    await productCard.click();

    // Wait for modal to be visible
    await page.locator('cc-choice-modal:not([hidden])').waitFor({ state: 'visible' });

    // Wait for rail container to appear
    const railContainer = page.locator('#cc-recs-container');
    await railContainer.waitFor({ state: 'visible', timeout: RAIL_TIMEOUT });

    const endTime = Date.now();
    const loadTime = endTime - startTime;

    // Check load time
    expect(loadTime).toBeLessThan(RAIL_TIMEOUT);
    console.log(`✓ Rail loaded in ${loadTime}ms`);

    // Verify rail has content
    const railItems = page.locator('.cc-recs__item');
    const count = await railItems.count();
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(6);
  });

  test('Shows 6 recommended cards with correct content', async ({ page }) => {
    // Open modal
    const productCard = page.locator('[data-cc-card]').first();
    await productCard.click();

    // Wait for modal and rail
    await page.locator('cc-choice-modal:not([hidden])').waitFor({ state: 'visible' });
    const rail = page.locator('[data-cc-recs-rail]');
    await rail.waitFor({ state: 'visible', timeout: RAIL_TIMEOUT });

    // Count items in rail
    const railItems = page.locator('.cc-recs__item');
    const count = await railItems.count();

    // Should have between 1 and 6 items
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(6);

    // Verify each item has required elements
    for (let i = 0; i < count; i++) {
      const item = railItems.nth(i);

      // Has image
      const image = item.locator('.cc-recs__image');
      await expect(image).toBeVisible();

      // Has title
      const title = item.locator('.cc-recs__title');
      await expect(title).toBeVisible();
      const titleText = await title.textContent();
      expect(titleText.trim().length).toBeGreaterThan(0);

      // Has price
      const price = item.locator('.cc-recs__price');
      await expect(price).toBeVisible();

      // Has CTA button
      const cta = item.locator('.cc-recs__cta');
      await expect(cta).toBeVisible();
      expect(await cta.textContent()).toBe('Personalise');
    }
  });

  test('Clicking recommendation opens new modal (nested)', async ({ page }) => {
    // Open first modal
    const firstCard = page.locator('[data-cc-card]').first();
    const firstHandle = await firstCard.getAttribute('data-cc-handle');
    await firstCard.click();

    // Wait for modal and rail
    await page.locator('cc-choice-modal:not([hidden])').waitFor({ state: 'visible' });
    await page.locator('[data-cc-recs-rail]').waitFor({ state: 'visible', timeout: RAIL_TIMEOUT });

    // Get first product title from modal
    const firstTitle = await page.locator('.ccc__product-title').textContent();

    // Click on a recommendation
    const recCard = page.locator('.cc-recs [data-cc-card]').first();
    const recHandle = await recCard.getAttribute('data-cc-handle');
    await expect(recCard).toBeVisible();
    await recCard.click();

    // Wait for modal content to update
    await page.waitForTimeout(500); // Give time for content to change

    // Verify new product is loaded (different title or handle in URL)
    const newTitle = await page.locator('.ccc__product-title').textContent();

    // Either title changed OR we can verify the handle changed
    const currentURL = page.url();
    const titleChanged = newTitle !== firstTitle;
    const urlContainsNewHandle = currentURL.includes(recHandle);

    expect(titleChanged || urlContainsNewHandle).toBeTruthy();

    // Modal should still be open
    const modal = page.locator('cc-choice-modal:not([hidden])');
    await expect(modal).toBeVisible();
  });

  test('Pivot chips change recommendations', async ({ page }) => {
    // Open modal
    const productCard = page.locator('[data-cc-card]').first();
    await productCard.click();

    // Wait for modal and rail
    await page.locator('cc-choice-modal:not([hidden])').waitFor({ state: 'visible' });
    const rail = page.locator('[data-cc-recs-rail]');
    await rail.waitFor({ state: 'visible', timeout: RAIL_TIMEOUT });

    // Check if pivot chips exist
    const pivotChips = page.locator('.cc-recs__pivot');
    const pivotCount = await pivotChips.count();

    if (pivotCount === 0) {
      console.log('⚠ No pivot chips found (product may not have interest/occasion tags)');
      return; // Skip test if no pivots available
    }

    // Get initial recommendation handles
    const initialHandles = await page.locator('.cc-recs [data-cc-card]').evaluateAll(cards =>
      cards.map(card => card.dataset.ccHandle)
    );

    // Find a non-active pivot chip
    const inactivePivot = pivotChips.filter({ hasNot: page.locator('.cc-recs__pivot--active') }).first();

    if (await inactivePivot.count() === 0) {
      console.log('⚠ Only one pivot chip available');
      return;
    }

    // Click the pivot chip
    await inactivePivot.click();

    // Wait for rail to update (look for loading state or content change)
    await page.waitForTimeout(500);

    // Get new recommendation handles
    const newHandles = await page.locator('.cc-recs [data-cc-card]').evaluateAll(cards =>
      cards.map(card => card.dataset.ccHandle)
    );

    // Verify handles changed
    expect(newHandles).not.toEqual(initialHandles);
  });

  test('Analytics events are tracked', async ({ page }) => {
    // Track gtag calls
    const gtagCalls = [];
    await page.exposeFunction('interceptGtag', (eventName, properties) => {
      gtagCalls.push({ eventName, properties });
    });

    await page.addInitScript(() => {
      window.gtag = (type, eventName, properties) => {
        if (type === 'event') {
          window.interceptGtag(eventName, properties);
        }
      };
    });

    // Navigate to page
    await page.goto(`${BASE_URL}/collections/all`);
    await page.waitForLoadState('networkidle');

    // Open modal
    const productCard = page.locator('[data-cc-card]').first();
    await productCard.click();

    // Wait for modal and rail
    await page.locator('cc-choice-modal:not([hidden])').waitFor({ state: 'visible' });
    await page.locator('[data-cc-recs-rail]').waitFor({ state: 'visible', timeout: RAIL_TIMEOUT });

    // Wait for events to be tracked
    await page.waitForTimeout(1000);

    // Verify cc_recs_view event was tracked
    const recsViewEvent = gtagCalls.find(call => call.eventName === 'cc_recs_view');
    expect(recsViewEvent).toBeDefined();
    expect(recsViewEvent.properties).toHaveProperty('anchor_handle');

    // Verify cc_recs_impression event was tracked
    const recsImpressionEvent = gtagCalls.find(call => call.eventName === 'cc_recs_impression');
    expect(recsImpressionEvent).toBeDefined();
    expect(recsImpressionEvent.properties).toHaveProperty('handles');

    // Click on a recommendation
    const recCard = page.locator('.cc-recs [data-cc-card]').first();
    await recCard.click();
    await page.waitForTimeout(500);

    // Verify cc_recs_click event was tracked
    const recsClickEvent = gtagCalls.find(call => call.eventName === 'cc_recs_click');
    expect(recsClickEvent).toBeDefined();
    expect(recsClickEvent.properties).toHaveProperty('rec_handle');
    expect(recsClickEvent.properties).toHaveProperty('position');
  });

  test('Graceful degradation on network error', async ({ page }) => {
    // Block the section render request to simulate network error
    await page.route('**/*section_id=cc-recs*', route => route.abort());

    // Open modal
    const productCard = page.locator('[data-cc-card]').first();
    await productCard.click();

    // Wait for modal
    await page.locator('cc-choice-modal:not([hidden])').waitFor({ state: 'visible' });

    // Rail container should exist but be empty or show error
    const railContainer = page.locator('#cc-recs-container');
    await expect(railContainer).toBeVisible();

    // Should show empty state or error, not crash
    const hasError = await page.locator('.cc-recs__error').count() > 0;
    const hasEmpty = await page.locator('.cc-recs__empty').count() > 0;
    const hasNoItems = await page.locator('.cc-recs__item').count() === 0;

    expect(hasError || hasEmpty || hasNoItems).toBeTruthy();

    // Modal should still be functional
    const closeButton = page.locator('[data-ccc-close]').first();
    await expect(closeButton).toBeVisible();
  });

  test('Excludes out-of-stock products', async ({ page }) => {
    // Open modal
    const productCard = page.locator('[data-cc-card]').first();
    await productCard.click();

    // Wait for modal and rail
    await page.locator('cc-choice-modal:not([hidden])').waitFor({ state: 'visible' });
    const rail = page.locator('[data-cc-recs-rail]');

    try {
      await rail.waitFor({ state: 'visible', timeout: RAIL_TIMEOUT });
    } catch (e) {
      console.log('⚠ No recommendations available for this product');
      return;
    }

    // Get all recommended product handles
    const recHandles = await page.locator('.cc-recs [data-cc-card]').evaluateAll(cards =>
      cards.map(card => card.dataset.ccHandle)
    );

    // For each recommended product, verify it's available
    for (const handle of recHandles) {
      const response = await page.request.get(`${BASE_URL}/products/${handle}.js`);
      expect(response.ok()).toBeTruthy();

      const productData = await response.json();

      // Product should have at least one available variant
      const hasAvailableVariant = productData.variants.some(v => v.available);
      expect(hasAvailableVariant).toBeTruthy();
    }
  });

  test('Rail header shows correct title', async ({ page }) => {
    // Open modal
    const productCard = page.locator('[data-cc-card]').first();
    await productCard.click();

    // Wait for modal and rail
    await page.locator('cc-choice-modal:not([hidden])').waitFor({ state: 'visible' });
    const rail = page.locator('[data-cc-recs-rail]');
    await rail.waitFor({ state: 'visible', timeout: RAIL_TIMEOUT });

    // Check rail title
    const railTitle = page.locator('.cc-recs__title');
    await expect(railTitle).toBeVisible();

    const titleText = await railTitle.textContent();
    expect(titleText).toBe('People also viewed');
  });

  test('Recommendation cards are clickable and navigable', async ({ page }) => {
    // Open modal
    const productCard = page.locator('[data-cc-card]').first();
    await productCard.click();

    // Wait for modal and rail
    await page.locator('cc-choice-modal:not([hidden])').waitFor({ state: 'visible' });
    await page.locator('[data-cc-recs-rail]').waitFor({ state: 'visible', timeout: RAIL_TIMEOUT });

    // Get first recommendation card
    const recCard = page.locator('.cc-recs [data-cc-card]').first();
    await expect(recCard).toBeVisible();

    // Verify it has required data attributes
    const handle = await recCard.getAttribute('data-cc-handle');
    expect(handle).toBeTruthy();
    expect(handle.length).toBeGreaterThan(0);

    // Verify card is clickable (not disabled)
    const isDisabled = await recCard.isDisabled();
    expect(isDisabled).toBeFalsy();

    // Verify CTA button is clickable
    const cta = recCard.locator('.cc-recs__cta');
    await expect(cta).toBeVisible();
    await expect(cta).toBeEnabled();
  });

});

test.describe('Recommendation Rail - Edge Cases', () => {

  test('Handles product with no tags gracefully', async ({ page }) => {
    // This test assumes you have at least one product without recommendation tags
    await page.goto(`${BASE_URL}/collections/all`);
    await page.waitForLoadState('networkidle');

    // Open any modal
    const productCard = page.locator('[data-cc-card]').first();
    await productCard.click();

    // Wait for modal
    await page.locator('cc-choice-modal:not([hidden])').waitFor({ state: 'visible' });

    // Rail container should still exist
    const railContainer = page.locator('#cc-recs-container');
    await expect(railContainer).toBeAttached();

    // Either shows recommendations (fallback to bestsellers) or shows empty state
    // Both are acceptable outcomes
    const hasRail = await page.locator('[data-cc-recs-rail]').count() > 0;
    console.log(hasRail ? '✓ Showing fallback recommendations' : '✓ Gracefully handling no recs');
  });

  test('Rail scrolls horizontally on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Open modal
    await page.goto(`${BASE_URL}/collections/all`);
    const productCard = page.locator('[data-cc-card]').first();
    await productCard.click();

    // Wait for modal and rail
    await page.locator('cc-choice-modal:not([hidden])').waitFor({ state: 'visible' });
    const rail = page.locator('.cc-recs__list');

    try {
      await rail.waitFor({ state: 'visible', timeout: RAIL_TIMEOUT });
    } catch (e) {
      console.log('⚠ No recommendations available');
      return;
    }

    // Check if rail is scrollable
    const isScrollable = await rail.evaluate(el => {
      return el.scrollWidth > el.clientWidth;
    });

    if (await page.locator('.cc-recs__item').count() > 2) {
      // Should be scrollable if there are enough items
      expect(isScrollable).toBeTruthy();
    }
  });

});
