# Cute Cards Personalization - Testing Documentation

## Overview
This document provides comprehensive testing guidance for the Cute Cards personalization feature, including debug mode usage, manual testing procedures, edge cases, and automated test specifications.

## Quick Start: Debug Mode

### Enabling Debug Mode
Add `?cc_debug=1` to any product page URL to enable debug mode.

Example:
```
https://zir0yr-xe.myshopify.com/products/your-product?cc_debug=1
```

### What Debug Mode Shows

**Console Output:**
- Status table showing:
  - Form detection (foundForm, formId)
  - Counter functionality (frontCounterWorking, insideCounterWorking)
  - Form associations (frontInputAttached, insideTextareaAttached)
  - Hidden fields count
- Self-check results table
- Color-coded status messages

**Visual Indicators:**
- **Green box shadow (3px)**: All systems operational
- **Red box shadow (3px)**: Issues detected, check console

**Self-Checks:**
1. Inside message within character limit
2. Front caption within character limit (if enabled)
3. Hidden property inputs attached to form
4. Textarea form association

## Manual Testing Checklist

### A. Character Counter Tests

- [ ] Front caption counter starts at 0/40
- [ ] Front caption counter updates live as you type
- [ ] Front caption counter counts accurately (test with 39, 40, 41 chars)
- [ ] Inside message counter starts at 0/600
- [ ] Inside message counter updates live as you type
- [ ] Inside message counter counts accurately (test with 599, 600, 601 chars)
- [ ] Counters work correctly with emoji characters
- [ ] Counters work correctly with special characters (@, #, $, %, etc.)

### B. Validation Tests

- [ ] Form submits successfully with valid inside message (1-600 chars)
- [ ] Form blocks submission with empty inside message
- [ ] Error message appears: "Please write a message inside your card."
- [ ] Error message has proper ARIA attributes (role="alert", aria-live="assertive")
- [ ] Focus moves to inside message field on error
- [ ] Form blocks submission when inside message exceeds 600 characters
- [ ] Error message shows: "Inside message is too long (max 600 characters)."
- [ ] Form blocks submission when front caption exceeds 40 characters
- [ ] Error message shows: "Front caption is too long (max 40 characters)."
- [ ] Previous errors clear when form is resubmitted
- [ ] Validation works on both desktop and mobile

### C. Form Association Tests

- [ ] Fields are outside the product form in DOM but still submit
- [ ] Hidden fields (_artwork_prompt, _card_template) are included in submission
- [ ] All field values appear in cart after submission
- [ ] Form association works with AJAX add-to-cart
- [ ] Form association works with standard form submission

### D. Theme Customizer Tests

- [ ] "Enable front caption field" toggle shows/hides front caption
- [ ] "Enable inside message field" toggle shows/hides inside message
- [ ] Front caption character limit slider (10-80) updates maxlength
- [ ] Inside message character limit slider (100-1000) updates maxlength
- [ ] Changes appear immediately in theme editor preview
- [ ] Settings persist after saving

### E. Cart Display Tests

- [ ] Properties display with user-friendly names ("Front Caption", "Inside Message")
- [ ] Inside message preserves line breaks (displays with `<br>` tags)
- [ ] Front caption displays as single line
- [ ] Properties appear in cart page (main-cart-items.liquid)
- [ ] Properties appear in cart drawer (cart-drawer.liquid)
- [ ] Properties appear in cart notification popup (cart-notification-product.liquid)
- [ ] Properties with leading underscore (_artwork_prompt, _card_template) are hidden
- [ ] Properties appear correctly in checkout
- [ ] Properties appear correctly in order confirmation email

## Edge Cases

### Text Input Edge Cases

| Test Case | Input | Expected Behavior |
|-----------|-------|-------------------|
| Empty inside message | "" | Validation error, form blocks |
| Whitespace only | "   \n\n  " | Treated as empty, validation error |
| Exactly at limit | 600 chars (inside) | Accepts, submits successfully |
| One over limit | 601 chars | Validation error |
| Multi-line message | "Line 1\nLine 2\nLine 3" | Preserves line breaks in cart |
| Windows line breaks | "Line 1\r\nLine 2" | Normalizes to \n |
| Old Mac line breaks | "Line 1\rLine 2" | Normalizes to \n |
| Emoji characters | "Hello 👋 World 🌍" | Counts emoji as 1 character each |
| Special characters | "@#$%^&*()" | Accepts, displays correctly |
| Leading/trailing spaces | "  message  " | Trims on submission |
| HTML tags | "&lt;script&gt;alert('xss')&lt;/script&gt;" | Escaped by Shopify |
| Unicode characters | "Café naïve résumé" | Accepts, displays correctly |

### Browser Compatibility

Test on:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

### Viewport Tests

- [ ] Desktop (1920x1080)
- [ ] Laptop (1366x768)
- [ ] Tablet portrait (768x1024)
- [ ] Tablet landscape (1024x768)
- [ ] Mobile (375x667)
- [ ] Mobile (414x896)

## Accessibility Checks

### Keyboard Navigation

- [ ] Tab key moves focus to front caption input
- [ ] Tab key moves focus to inside message textarea
- [ ] Tab key moves focus to submit button
- [ ] Enter key in front caption moves focus to inside message
- [ ] Shift+Tab reverses focus order
- [ ] All interactive elements have visible focus indicators

### Screen Reader Tests

Test with NVDA (Windows) or VoiceOver (Mac):

- [ ] Fieldset has accessible legend ("Personalization")
- [ ] Labels are properly associated with inputs (for/id)
- [ ] Help text is announced via aria-describedby
- [ ] Character counters are announced via aria-live="polite"
- [ ] Error messages are announced via role="alert" aria-live="assertive"
- [ ] Required field indicator is announced
- [ ] All form elements are navigable
- [ ] Submit button purpose is clear

### Color Contrast

- [ ] Labels meet WCAG AA contrast ratio (4.5:1)
- [ ] Help text meets WCAG AA contrast ratio
- [ ] Error text meets WCAG AA contrast ratio (prefer 7:1 for errors)
- [ ] Counter text is readable
- [ ] Focus indicators have sufficient contrast

### ARIA Attributes

- [ ] `aria-describedby` links inputs to help text and counters
- [ ] `aria-live="polite"` on character counters
- [ ] `role="alert"` on error container
- [ ] `aria-live="assertive"` on error container
- [ ] `aria-label="required"` on required indicator

## Performance Checks

### Page Load

- [ ] CSS loads only on product pages with personalization block
- [ ] JavaScript loads only on product pages with personalization block
- [ ] No layout shift when fields render
- [ ] Fields are usable within 1 second of page load

### Runtime Performance

- [ ] Character counter updates smoothly (no lag)
- [ ] Validation runs in <100ms
- [ ] Form submission is not delayed
- [ ] Debug mode console logs don't impact performance
- [ ] No memory leaks (test by typing 1000+ characters repeatedly)

### Network

- [ ] CSS file size is reasonable (<5kb)
- [ ] JavaScript file size is reasonable (<10kb)
- [ ] No unnecessary network requests
- [ ] Assets are cached properly

## Automated Test Specifications

### Unit Tests (Jest)

**File: tests/utils.test.js**
```javascript
describe('normalizeText', () => {
  test('trims leading and trailing whitespace', () => {
    expect(normalizeText('  hello  ')).toBe('hello');
  });

  test('normalizes Windows line breaks', () => {
    expect(normalizeText('line1\r\nline2')).toBe('line1\nline2');
  });

  test('normalizes old Mac line breaks', () => {
    expect(normalizeText('line1\rline2')).toBe('line1\nline2');
  });

  test('handles empty string', () => {
    expect(normalizeText('')).toBe('');
  });

  test('handles whitespace-only string', () => {
    expect(normalizeText('   \n\n  ')).toBe('');
  });
});
```

**File: tests/validators.test.js**
```javascript
describe('Character length validation', () => {
  test('accepts message at exactly max length', () => {
    const message = 'a'.repeat(600);
    expect(message.length).toBe(600);
  });

  test('rejects message over max length', () => {
    const message = 'a'.repeat(601);
    expect(message.length).toBeGreaterThan(600);
  });

  test('counts emoji as single character', () => {
    const message = '👋🌍💚';
    expect(message.length).toBe(3);
  });
});
```

### E2E Tests (Playwright)

**File: e2e/personalization.spec.js**
```javascript
import { test, expect } from '@playwright/test';

test.describe('Cute Cards Personalization', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to product page with debug mode
    await page.goto('/products/cute-card?cc_debug=1');

    // Wait for personalization fields to load
    await page.waitForSelector('[data-testid="cc-wrap"]');
  });

  test('shows character counter that updates live', async ({ page }) => {
    const input = page.locator('[data-testid="cc-inside-textarea"]');
    const counter = page.locator('[data-testid="cc-inside-count"]');

    await expect(counter).toHaveText('0/600');

    await input.fill('Hello world');
    await expect(counter).toHaveText('11/600');

    await input.fill('a'.repeat(600));
    await expect(counter).toHaveText('600/600');
  });

  test('prevents submission with empty inside message', async ({ page }) => {
    const submitBtn = page.locator('[name="add"]');
    const errorMsg = page.locator('[data-testid="cc-errors"]');

    await submitBtn.click();

    await expect(errorMsg).toBeVisible();
    await expect(errorMsg).toHaveText('Please write a message inside your card.');
  });

  test('prevents submission when inside message exceeds limit', async ({ page }) => {
    const input = page.locator('[data-testid="cc-inside-textarea"]');
    const submitBtn = page.locator('[name="add"]');
    const errorMsg = page.locator('[data-testid="cc-errors"]');

    // Try to submit 601 characters (maxlength should prevent typing, but test JS validation)
    await input.evaluate((el, text) => el.value = text, 'a'.repeat(601));
    await submitBtn.click();

    await expect(errorMsg).toBeVisible();
    await expect(errorMsg).toContainText('too long');
  });

  test('submits successfully with valid message', async ({ page }) => {
    const frontInput = page.locator('[data-testid="cc-front-input"]');
    const insideTextarea = page.locator('[data-testid="cc-inside-textarea"]');
    const submitBtn = page.locator('[name="add"]');

    await frontInput.fill('Happy Birthday!');
    await insideTextarea.fill('Wishing you all the best on your special day!');
    await submitBtn.click();

    // Wait for cart notification
    await page.waitForSelector('.cart-notification', { timeout: 3000 });

    // Verify properties appear in cart
    const notification = page.locator('.cart-notification');
    await expect(notification).toContainText('Front Caption');
    await expect(notification).toContainText('Happy Birthday!');
    await expect(notification).toContainText('Inside Message');
    await expect(notification).toContainText('Wishing you all the best');
  });

  test('preserves line breaks in cart display', async ({ page }) => {
    const insideTextarea = page.locator('[data-testid="cc-inside-textarea"]');
    const submitBtn = page.locator('[name="add"]');

    await insideTextarea.fill('Line 1\nLine 2\nLine 3');
    await submitBtn.click();

    await page.waitForSelector('.cart-notification', { timeout: 3000 });

    // Check that line breaks are converted to <br> tags
    const messageContent = page.locator('.cart-notification').locator('text=Line 1');
    const html = await messageContent.evaluate(el => el.parentElement.innerHTML);
    expect(html).toContain('<br>');
  });

  test('debug mode shows status in console', async ({ page }) => {
    const logs = [];
    page.on('console', msg => logs.push(msg.text()));

    await page.goto('/products/cute-card?cc_debug=1');
    await page.waitForSelector('[data-testid="cc-wrap"]');

    // Check for debug console logs
    expect(logs.some(log => log.includes('[CC Debug] Personalization Status'))).toBeTruthy();
    expect(logs.some(log => log.includes('All systems operational'))).toBeTruthy();
  });

  test('debug mode shows visual indicator', async ({ page }) => {
    await page.goto('/products/cute-card?cc_debug=1');

    const fieldset = page.locator('[data-testid="cc-wrap"]');
    const boxShadow = await fieldset.evaluate(el =>
      window.getComputedStyle(el).boxShadow
    );

    // Should show green box shadow for operational system
    expect(boxShadow).toContain('rgb(60, 179, 113)'); // #3cb371
  });
});

test.describe('Mobile viewport', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('character counter is visible on mobile', async ({ page }) => {
    await page.goto('/products/cute-card');

    const counter = page.locator('[data-testid="cc-inside-count"]');
    await expect(counter).toBeVisible();
  });

  test('validation works on mobile', async ({ page }) => {
    await page.goto('/products/cute-card');

    const submitBtn = page.locator('[name="add"]');
    const errorMsg = page.locator('[data-testid="cc-errors"]');

    await submitBtn.click();
    await expect(errorMsg).toBeVisible();
  });
});
```

## Definition of Done - Sign-off Checklist

Before deploying to production, all items must be checked:

### Functionality
- [ ] All character counters work correctly
- [ ] All validation rules work correctly
- [ ] Form submission includes all personalization data
- [ ] Properties display correctly in cart, checkout, and orders
- [ ] Line breaks are preserved in multi-line messages
- [ ] Theme customizer toggles work correctly

### Accessibility
- [ ] All WCAG AA requirements met
- [ ] Screen reader testing passed
- [ ] Keyboard navigation works completely
- [ ] Color contrast meets standards
- [ ] All ARIA attributes are correct

### Performance
- [ ] Page load time is acceptable
- [ ] No visual layout shifts
- [ ] Character counters are responsive
- [ ] No memory leaks detected

### Browser Compatibility
- [ ] Tested on Chrome, Firefox, Safari, Edge
- [ ] Tested on iOS Safari
- [ ] Tested on Android Chrome
- [ ] Works on all required viewports

### Code Quality
- [ ] Debug mode works correctly
- [ ] All self-checks pass
- [ ] No console errors in production mode
- [ ] Code follows Shopify theme standards

### Documentation
- [ ] Testing documentation is complete
- [ ] Debug mode usage is documented
- [ ] Edge cases are documented
- [ ] Known limitations are documented

### Deployment
- [ ] Tested on staging environment
- [ ] Reviewed by stakeholder
- [ ] Deployed to production
- [ ] Post-deployment verification completed

## Testing on Live Site

### Current Live URL
https://zir0yr-xe.myshopify.com

### Debug URL
https://zir0yr-xe.myshopify.com/products/YOUR-PRODUCT?cc_debug=1

### Test Account Recommendations
1. Create a test product with personalization enabled
2. Test as logged-in customer
3. Test as guest customer
4. Test with different product variants
5. Test with different quantity values
6. Test with other cart items present

## Known Limitations

1. **Browser support**: Requires modern browsers with ES6 support (2017+)
2. **JavaScript required**: Character counters require JavaScript (validation still works server-side via maxlength)
3. **Theme compatibility**: Designed for Dawn theme 15.4.0, may need adjustments for other themes
4. **Line break limit**: Very long messages (100+ lines) may affect cart display layout
5. **Emoji counting**: Some complex emoji sequences (flags, skin tones) may count as multiple characters

## Support & Troubleshooting

### Common Issues

**Issue**: Character counter doesn't update
- **Solution**: Enable debug mode, check console for errors, verify data-cc-limit attribute is present

**Issue**: Form doesn't submit personalization
- **Solution**: Check that form attribute matches product form ID, verify hidden inputs are present

**Issue**: Properties don't appear in cart
- **Solution**: Verify property names use Title Case ("Front Caption", "Inside Message"), check cart templates

**Issue**: Validation doesn't trigger
- **Solution**: Verify JavaScript loaded, check for conflicting scripts, test with debug mode

### Debug Mode Interpretation

**Green box shadow + "All systems operational"**
- Everything working correctly
- All form associations verified
- Character counters operational

**Red box shadow + "Issues detected"**
- Check status table in console
- Look for false values indicating problems
- Review self-check results for failures

## Next Steps

For advanced testing requirements:
1. Set up Jest for unit tests
2. Set up Playwright for E2E tests
3. Integrate tests into CI/CD pipeline
4. Add visual regression testing
5. Add performance monitoring
