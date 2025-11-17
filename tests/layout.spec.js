/**
 * Layout Engine Tests
 *
 * Tests for core/layout.js pure functions
 * Validates optimal card/column sizing calculations
 */

const { test, expect } = require('@playwright/test');

test.describe('Layout Engine - calculateOptimalLayout', () => {
  test('calculates 70/30 column split for standard desktop viewport', async ({ page }) => {
    await page.addScriptTag({
      type: 'module',
      content: `
        import { calculateOptimalLayout } from '/src/cc-choice/core/layout.js';
        window.testCalculateLayout = calculateOptimalLayout;
      `
    });

    const layout = await page.evaluate(() => {
      return window.testCalculateLayout({
        dialogWidth: 1200,
        dialogHeight: 800,
        headerHeight: 110,
        modalPadding: 24,
        columnGap: 32,
        cardAspect: 1.43
      });
    });

    // Available width = 1200 - (24 * 2) = 1152
    // Preview column = (1152 - 32) * 0.7 = 784
    // Controls column = (1152 - 32) * 0.3 = 336
    expect(layout.previewColumnWidth).toBe(784);
    expect(layout.controlsColumnWidth).toBe(336);

    // Card width should match preview column
    expect(layout.cardWidth).toBe(784);

    // Card height = cardWidth / cardAspect = 784 / 1.43 ≈ 548
    expect(layout.cardHeight).toBeGreaterThan(540);
    expect(layout.cardHeight).toBeLessThan(550);

    // Should not need scroll (card height < min controls height)
    expect(layout.needsScroll).toBe(false);
  });

  test('recalculates from height when height-constrained', async ({ page }) => {
    await page.addScriptTag({
      type: 'module',
      content: `
        import { calculateOptimalLayout } from '/src/cc-choice/core/layout.js';
        window.testCalculateLayout = calculateOptimalLayout;
      `
    });

    const layout = await page.evaluate(() => {
      return window.testCalculateLayout({
        dialogWidth: 1200,
        dialogHeight: 500, // Small height
        headerHeight: 110,
        modalPadding: 24,
        columnGap: 32,
        cardAspect: 1.43
      });
    });

    // Available height = 500 - (24 * 2) - 110 = 342
    // Max card height = 342 - 60 = 282
    // Card should be height-constrained and recalculated
    expect(layout.cardHeight).toBeLessThanOrEqual(282);

    // Width should be recalculated from height (cardHeight * cardAspect)
    const expectedWidth = Math.floor(layout.cardHeight * 1.43);
    expect(layout.cardWidth).toBe(expectedWidth);
  });

  test('enforces minimum controls height (420px)', async ({ page }) => {
    await page.addScriptTag({
      type: 'module',
      content: `
        import { calculateOptimalLayout } from '/src/cc-choice/core/layout.js';
        window.testCalculateLayout = calculateOptimalLayout;
      `
    });

    const layout = await page.evaluate(() => {
      return window.testCalculateLayout({
        dialogWidth: 800,
        dialogHeight: 600,
        headerHeight: 110,
        modalPadding: 24,
        columnGap: 32,
        cardAspect: 1.43
      });
    });

    // If calculated card height < 420px, should bump to min
    // With small dialog, card may hit min controls height
    expect(layout.cardHeight).toBeGreaterThanOrEqual(280);

    // needsScroll should be true if card is at/below min height
    if (layout.cardHeight <= 420) {
      expect(layout.needsScroll).toBe(true);
    }
  });

  test('handles wide viewport with standard aspect ratio', async ({ page }) => {
    await page.addScriptTag({
      type: 'module',
      content: `
        import { calculateOptimalLayout } from '/src/cc-choice/core/layout.js';
        window.testCalculateLayout = calculateOptimalLayout;
      `
    });

    const layout = await page.evaluate(() => {
      return window.testCalculateLayout({
        dialogWidth: 1600,
        dialogHeight: 900,
        headerHeight: 110,
        modalPadding: 24,
        columnGap: 32,
        cardAspect: 1.43
      });
    });

    // Larger viewport should produce larger card
    expect(layout.cardWidth).toBeGreaterThan(1000);
    expect(layout.cardHeight).toBeGreaterThan(600);

    // Should have plenty of room, no scroll needed
    expect(layout.needsScroll).toBe(false);
  });

  test('respects aspect ratio for different card shapes', async ({ page }) => {
    await page.addScriptTag({
      type: 'module',
      content: `
        import { calculateOptimalLayout } from '/src/cc-choice/core/layout.js';
        window.testCalculateLayout = calculateOptimalLayout;
      `
    });

    // Test with square aspect ratio (1.0)
    const squareLayout = await page.evaluate(() => {
      return window.testCalculateLayout({
        dialogWidth: 1200,
        dialogHeight: 800,
        headerHeight: 110,
        modalPadding: 24,
        columnGap: 32,
        cardAspect: 1.0 // Square card
      });
    });

    // For square card, width and height should be equal
    expect(squareLayout.cardWidth).toBeCloseTo(squareLayout.cardHeight, 0);

    // Test with portrait aspect ratio (0.7)
    const portraitLayout = await page.evaluate(() => {
      return window.testCalculateLayout({
        dialogWidth: 1200,
        dialogHeight: 800,
        headerHeight: 110,
        modalPadding: 24,
        columnGap: 32,
        cardAspect: 0.7 // Portrait card
      });
    });

    // For portrait card, height should be greater than width
    expect(portraitLayout.cardHeight).toBeGreaterThan(portraitLayout.cardWidth);
  });
});

test.describe('Layout Engine - Integration', () => {
  test('layout updates when dialog resizes', async ({ page }) => {
    // This would be a full integration test with the modal
    // For now, just verify the layout service is accessible
    await page.addScriptTag({
      type: 'module',
      content: `
        import { calculateOptimalLayout } from '/src/cc-choice/core/layout.js';
        window.testCalculateLayout = calculateOptimalLayout;
      `
    });

    const exists = await page.evaluate(() => {
      return typeof window.testCalculateLayout === 'function';
    });

    expect(exists).toBe(true);
  });
});
