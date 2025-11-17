# Claude Code Session Brief

## Project Overview

**Website**: Cute Cards (https://zir0yr-xe.myshopify.com)
**Business**: Personalized greeting cards with custom messages
**Platform**: Shopify
**Theme**: Dawn (customized)
**Live Theme ID**: `190802035018`

Cute Cards sells greeting cards with artwork (frogs, dogs, cats, etc.) that customers can personalize with:
- **Inside Message** (max 600 characters)
- **Font Customization** (family, size, color - 12 fonts available)
- **AI Message Suggestions** (powered by OpenRouter/GPT-4o-mini)
- **Delivery Options** (Post to me / Send direct with address capture)

The site features a Moonpig-inspired modal system that intercepts product grid clicks to show size selection and personalization options without leaving the collection page.

---

## Session Startup Process

### Every New Session:

1. **Verify Shopify CLI is installed**:
   ```bash
   shopify version
   ```
   *(Should show version 3.87.1 or higher)*

2. **Confirm working directory**:
   ```bash
   cd "C:\Users\josh.smith\Shopify Theme"
   pwd
   ```

3. **Check Shopify authentication** (if needed):
   ```bash
   shopify auth status
   ```
   *(Login if necessary: `shopify auth login`)*

4. **Verify live theme ID**:
   ```bash
   shopify theme list
   ```
   *(Look for theme #190802035018 - the live "Dawn" theme)*

5. **Ready to work!**

---

## Deployment Policy

### IMPORTANT: Push All Changes to Live

**Current Policy**: All changes should be pushed directly to the live theme (#190802035018).

**Deployment Command**:
```bash
cd "C:\Users\josh.smith\Shopify Theme"
shopify theme push --theme 190802035018 --only <file-path> --allow-live
```

**Multiple Files**:
```bash
shopify theme push --theme 190802035018 \
  --only assets/file1.js \
  --only assets/file2.css \
  --only sections/file3.liquid \
  --allow-live
```

**Notes**:
- Always use `--allow-live` flag (required for live theme)
- Use `--only` to target specific files (safer than full push)
- Test changes locally first when possible, but deploy directly to live
- No staging environment in use currently

---

## Key Project Conventions

### File Naming
- **Modal system**: `cc-*` prefix (e.g., `cc-choice.js`, `cc-recs.css`)
- **Personalization**: `cute-cards-personalise.*`
- **Sections**: Kebab-case (e.g., `main-collection-product-grid.liquid`)
- **Assets**: Kebab-case

### Code Style
- **No emojis** unless user explicitly requests them
- **Concise responses** (CLI context - monospace output)
- **Professional tone** - objective, factual
- **Track progress** with TodoWrite tool for multi-step tasks

### Analytics
- All events prefixed with `cc_*` (e.g., `cc_modal_open`, `cc_recs_view`)
- Track to both GA4 and Shopify Analytics
- Console log all events for debugging

---

## Important Technical Details

### Product Attributes (Tags)
Products are tagged with structured data for recommendations:
- `interest:{topic}` - Main subject (frogs, dogs, flowers, etc.)
- `occasion:{event}` - When to send (birthday, thank-you, etc.)
- `recipient:{person}` - Who it's for (dad, mum, friend, etc.)
- `style:{aesthetic}` - Visual style (cute, minimal, bold, etc.)
- `humour:{0-3}` - Funny scale (0=serious, 3=very funny)

See `PRODUCT_TAGGING_GUIDE.md` for full details.

### Modal System Architecture

**Key Features:**
- Grid interception on `[data-cc-card]` elements
- Backdrop click-to-close
- Nested modals for recommendations
- History management (pushState for back button)
- Product JSON prefetch on hover (<120ms opens)
- Session persistence (localStorage, 7-day expiry)
- Scroll lock (position:fixed technique)
- **Sticky footer bar** (full-width black, white buttons) - always visible at bottom

**Personalization View:**
- Card interior preview with live text rendering
- Typography controls (font family, size, color)
- AI message suggestions ("Stuck for words?")
- Leave blank option
- Delivery method toggle (Post to me / Send direct)

### Cart Properties
```json
{
  "Inside Message": "text",
  "Font Family": "Playfair Display",
  "Font Size": "medium",
  "Text Color": "#1A1A1A",
  "Delivery Method": "Mail2Me",
  "_card_template": "classic-5x7",
  "_artwork_prompt": "",
  "_prodigi_sku": "",
  "leave_blank": "Yes" // (if leaving blank)
}
```
When "Send direct" is selected, additional recipient address fields are added.

---

## Current Feature Set

### ✅ Implemented Features

1. **Choice Modal** (`cc-choice.js`, `cc-choice.css`)
   - Size/variant selection with dynamic pricing
   - Delivery promise strip
   - Arrow key navigation
   - Character counter warnings (90%+ amber, 100% red)
   - Black sticky footer bar with delivery toggle

2. **Personalization**
   - Card interior preview with live text rendering
   - Inside message (600 chars max)
   - Typography controls: 12 Google Fonts, 3 sizes, 6 colors
   - Visual preview updates in real-time
   - Text vertically centered, expands as you type
   - Leave blank option
   - Session restore prompt
   - Debounced localStorage save

3. **AI Message Suggestions** (`workers/ai-suggestions.js`)
   - Cloudflare Worker + OpenRouter API
   - GPT-4o-mini model (~$0.001/request)
   - Form: recipient name, occasion, optional details
   - Generates 3 messages: "Brief & Sweet", "Warm & Personal", "Heartfelt"
   - Click to insert into message field
   - Unlimited use (for testing - can re-enable session limits)

4. **Recommendations** (`cc-recs.js`, `cc-recs.css`, `sections/cc-recs.liquid`)
   - Client-side tag-based matching
   - Weighted scoring (interest=3x, occasion=2x, etc.)
   - Diversity constraints (max 2 per interest/style)
   - Bestseller fallback
   - Pivot chips (More like this, More {interest}, More {occasion})
   - Nested modal support
   - Session-cached product catalog (30min TTL)

5. **Analytics Tracking**
   - All events prefixed with `cc_*`
   - Track modal opens, size selection, personalization, cart adds
   - AI suggestion events: form open, generate, select
   - Recommendation events: view, impression, click, pivot
   - All events sent to GA4 and Shopify Analytics

### 🔮 Future Enhancements

- AI vision (currently blocked: Shopify CDN URLs return 404 to OpenRouter)
- PDF generation for Prodigi API integration
- Multi-buy nudge in rail
- Email capture for abandon recovery

---

## cc-choice Architecture (Do NOT Grow Another Monolith)

### CRITICAL: Build System in Use

**`assets/cc-choice.js` and `assets/cc-choice.css` are build outputs only.**

- Do NOT add new logic directly to these files.
- All changes MUST be made in `src/cc-choice/**` and compiled.
- Run `npm run build` to compile, or `npm run build:watch` for development.
- Run `npm run deploy` to build and push to live theme.

### Module Structure

```
src/cc-choice/
├── index.js (177 lines)        # Entry point - custom element registration, grid interception
├── core/
│   ├── CCChoiceModal.js (569)  # Main orchestrator class (lifecycle, views, cart)
│   ├── analytics.js            # trackEvent wrapper (GA4 + Shopify)
│   ├── persistence.js          # localStorage helpers (save/load/clear)
│   └── layout.js               # Optimal card sizing calculations
├── services/                   # Pure modules - NO DOM access
│   ├── productService.js       # /products/*.js fetching + LRU cache
│   ├── metafieldService.js     # GraphQL Storefront API (Prodigi SKUs)
│   ├── cartService.js          # /cart/add.js operations
│   └── aiService.js            # AI worker client (message suggestions)
├── views/                      # DOM modules - render + bind functions
│   ├── loadingView.js          # Loading spinner
│   ├── choiceView.js           # Size selection view
│   ├── personaliser-view.js (1,050) # Personalization form + event binding
│   ├── messageField.js         # Card preview canvas + typography
│   └── deliverySection.js      # Delivery toggle + recipient address fields
├── integrations/               # External system bridges
│   ├── recsIntegration.js      # window.ccRecs bridge (recommendation rail)
│   └── cartDrawer.js           # cart-drawer element + success UI
├── utils/                      # Pure utility functions
│   ├── string.js               # normalizeText, escapeHtml
│   ├── format.js               # formatPrice
│   └── dialog.js               # showConfirmDialog (async confirm)
└── styles/                     # CSS modules (bundled in order)
    ├── base.css                # Modal container, backdrop, scrollbar
    ├── choice.css              # Size selection layout
    ├── personaliser.css        # Form layout + sticky footer
    ├── mobile.css              # Responsive overrides
    └── states.css              # Animations, warnings (--near-limit, etc.)
```

### Ownership Rules

**A module must own exactly ONE concern:**
- Data fetching and transformation
- Rendering a specific part of the modal
- Managing a specific behavior (message autosize, AI, cart add, etc.)

**Cross-cutting concerns** (analytics, storage, feature flags) live in shared `services/*` and are consumed via imports, never via new globals.

### Coding Standards

1. **File size limit**: No single source file in `src/cc-choice/` should exceed **300 lines** or contain more than one public class.

2. **When adding a new feature**:
   - Put pure logic in `services/` (e.g., a new API call).
   - Put DOM bindings in a dedicated `views/*` module.
   - Expose a small, typed interface for `CCChoiceModal` to call.

3. **Global event listeners**: Do NOT add new `document.addEventListener` calls outside `src/cc-choice/index.js`.

4. **Window globals**: Do NOT read/write window globals from views/services except via dedicated integration modules (e.g., `analytics.js`, `recsIntegration.js`, `cartService.js`).

5. **Types & contracts**: All modules must declare explicit types (JSDoc comments minimum) for:
   - Product, Variant, VariantSkuMap
   - PersonalizationState, PersonalisedOrderPayload
   - Public interfaces for each view/service.

### Testing Expectations

- Keep tests passing when you refactor.
- When adding features, prefer adding a small test in `tests/*` rather than bolting more logic onto an existing module.
- Test behavioral changes, not implementation details.

### Build Commands

```bash
# Development (watch mode)
npm run build:watch

# Production build
npm run build

# Build + deploy to live
npm run deploy
```

### Breaking Changes to Avoid

- Must maintain `cc-choice-modal` custom element registration
- Must preserve `[data-cc-card]` click interception
- Must keep same cart payload structure (Prodigi SKUs)
- Must maintain localStorage key format for session restore

### Refactor History

**Version 4.0 (Modular Architecture)** - Completed January 2025:
- **Extracted monolithic 2,954-line `index.js` into 18 focused modules**
- **index.js reduced to 177 lines (94% reduction)** - thin orchestrator only
- **Bundle size: 53.3kb** (down from 66kb pre-refactor)
- Introduced esbuild for fast bundling (ES2020, production minification)
- CSS split into 5 semantic modules (base, choice, personaliser, mobile, states)
- All business logic moved to pure services (testable, maintainable)
- Callback pattern for view/orchestrator separation
- Module breakdown:
  - **core/**: CCChoiceModal class (569 lines), analytics, persistence, layout
  - **services/**: Pure API/data modules (no DOM dependencies)
  - **views/**: DOM rendering + event binding with callbacks
  - **integrations/**: External system bridges (cart drawer, recommendations)
  - **utils/**: Pure utility functions (string, format, dialog)

### Public API & Integration Contract

**<cc-choice-modal> Element (Single Global Instance)**

Registered once in `layout/theme.liquid` via `snippets/cc-choice-modal.liquid`.

**Public Method: `show(config)`**

```javascript
modal.show({
  handle: 'product-handle',        // Shopify handle (required)
  productUrl: '/products/...',     // canonical URL (for fallback/errors)
  opener: HTMLElement | null,      // element that triggered open (for focus restore)
  fromRecs: boolean                // opened from recommendations rail
});
```

**Public Method: `hide()`**

Closes modal, restores scroll, clears history state.

**Events Emitted**

All events use `trackEvent(eventName, properties)` and go to GA4 + Shopify Analytics:

- `cc_modal_open`, `cc_modal_close`
- `cc_size_select`, `cc_personalise_open`, `cc_add_blank_success`, `cc_add_personalised_success`
- `cc_delivery_method_changed`
- `cc_ai_*` (form_open, generate, select, copy)
- `cc_recs_*` (view, impression, click, pivot)

**Dependencies**

- Product data: `/products/{handle}.js` (Shopify JSON endpoint)
- Prodigi SKUs: `window.prodigiVariantSkus` (injected via card markup)
- Design tokens: `--brutal-*` CSS custom properties (must exist globally)
- Recommendations: `window.ccRecs` (optional, graceful degradation)

**Integration Points**

- Grid interception: `[data-cc-card]` elements (setup in `index.js`)
- History API: `pushState` for back button support
- Cart drawer: `cart-drawer` custom element refresh after add

### Module Extraction Guidelines

When refactoring the monolithic `src/cc-choice/index.js`:

**Priority Order (Low Risk → High Risk)**

1. **Extract `core/analytics.js` first** (lowest risk)
   - Pure function: `trackEvent(eventName, properties)`
   - No DOM dependencies, no state
   - Used everywhere, easy to test

2. **Extract `core/persistence.js` second**
   - `savePersonalization(handle, variantId, data)`
   - `loadPersonalization(handle, variantId)`
   - `clearPersonalization(handle, variantId)`
   - localStorage only, no DOM

3. **Extract `services/product-data.js` third**
   - `fetchProduct(handle)` → Promise<Product>
   - In-memory cache with TTL
   - No DOM, pure async

4. **Only then split views/**
   - Views have DOM dependencies and event bindings
   - Higher risk, test thoroughly

**JSDoc Contract Example**

Every module must start with:

```javascript
/**
 * Analytics Service
 *
 * @module core/analytics
 * @description Tracks user events to GA4 and Shopify Analytics
 *
 * @public trackEvent(eventName: string, properties: object) → void
 *
 * @example
 * import { trackEvent } from './core/analytics.js';
 * trackEvent('cc_size_select', { variant_id: 123, price: 399 });
 */
```

**Integration Test Pattern**

After each module extraction, add test:

```javascript
// tests/cc-choice/module-name.spec.js

import { test, expect } from '@playwright/test';

test('analytics module fires events correctly', async ({ page }) => {
  const events = [];
  await page.exposeFunction('captureEvent', (name, props) => {
    events.push({ name, props });
  });

  await page.addInitScript(() => {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push = (...args) => window.captureEvent(args[0], args[1]);
  });

  await page.click('[data-cc-card]');
  expect(events.some(e => e.name === 'cc_modal_open')).toBeTruthy();
});
```

### Data Flow Diagram

```
User Click [data-cc-card]
  ↓
index.js (grid interception)
  ↓
modal.show({ handle })
  ↓
services/product-data.fetchProduct(handle)
  ↓
views/choice-view.buildChoiceView(product)
  ↓
User selects size → core/analytics.trackEvent('cc_size_select')
  ↓
User clicks "Personalise" → views/personaliser-view.buildPersonaliserView()
  ↓
User types message → core/persistence.savePersonalization() (debounced)
  ↓
User clicks "Add to basket" → services/cart.addToCart(variant, properties)
  ↓
core/analytics.trackEvent('cc_add_personalised_success')
  ↓
integrations/cart-drawer.refresh()
  ↓
modal.hide()
```

### Refactor Workflow (For Claude)

When asked to "refactor" or "extract module X":

1. **Read** the full `src/cc-choice/index.js` to find the code
2. **Create** new module file (e.g., `src/cc-choice/core/analytics.js`)
3. **Add** JSDoc contract at top
4. **Copy** relevant functions/code to new module
5. **Export** named exports (not default)
6. **Update** `index.js` to import from new module
7. **Test** with `npm run build` (check for errors)
8. **Verify** modal behavior unchanged (manual test)
9. **Optionally** add integration test
10. **Deploy** with `npm run deploy`

---

## File Structure

```
C:\Users\josh.smith\Shopify Theme\
├── src/                      # SOURCE FILES (edit these)
│   └── cc-choice/
│       ├── index.js          # Entry point
│       ├── core/             # Modal orchestrator
│       ├── services/         # Pure business logic
│       ├── views/            # DOM render/bind functions
│       ├── integrations/     # External bridges
│       ├── utils/            # Pure utilities
│       └── styles/           # CSS modules
├── assets/                   # BUILD OUTPUT (do not edit)
│   ├── cc-choice.js          # Bundled from src/ (111KB)
│   ├── cc-choice.css         # Bundled from src/styles/ (70KB)
│   ├── cc-recs.js            # Recommendation engine
│   └── cc-recs.css           # Rail styling
├── workers/
│   ├── ai-suggestions.js     # Cloudflare Worker for AI suggestions
│   ├── wrangler.toml         # Worker config
│   └── README.md             # Deployment docs
├── sections/
│   ├── cc-recs.liquid        # Recommendation rail section
│   └── main-collection-product-grid.liquid  # Grid with data-cc-card
├── snippets/
│   ├── cc-choice-modal.liquid  # Modal HTML structure
│   └── card-product.liquid   # Product card used in grid/rail
├── layout/
│   └── theme.liquid          # Includes cc-*.js and cc-*.css
├── build.js                  # esbuild bundler
├── package.json              # Dependencies + scripts
├── PRODUCT_TAGGING_GUIDE.md  # Tagging schema and examples
└── CLAUDE.md                 # This file
```

---

## File Size, Structure & Redundancy Guidelines

The goal is to keep runtime assets small and clean, and to keep the source tree simple and obvious for AI editing, without changing behaviour.

### 1. General Principles

**All code changes for CC modal must happen under `src/cc-choice/`**
- Never hand-edit `assets/cc-choice.js` or `assets/cc-choice.css` except for emergency hotfixes
- Always run `node build.js` to regenerate assets after changes
- One bundle, many small modules (esbuild tree-shakes and minifies JS)

**No behavioural change without tests**
- When refactoring for structure/size, do not alter public interfaces
- Re-run existing tests and confirm analytics events still fire

### 2. JavaScript File Limits

**File Size Limits**
- Max 300 lines per source file in `src/cc-choice/`
- If a file exceeds 300 lines, split by responsibility

**Code Complexity Limits**
- **Max Cyclomatic Complexity**: 10 per function
- **Max Nesting Depth**: 3 levels (if/for/while)
- **Max Parameters**: 4 per function (use config objects for more)
- **Max Function Length**: 50 lines (extract helpers)

**Import Order Convention**

```javascript
// 1. External dependencies (if any)
import { debounce } from './vendor/utils.js';

// 2. Core modules
import { trackEvent } from './core/analytics.js';
import { savePersonalization } from './core/persistence.js';

// 3. Services
import { fetchProduct } from './services/product-data.js';

// 4. Views/Components
import { buildChoiceView } from './views/choice-view.js';

// 5. Utilities
import { escapeHtml, normalizeText } from './utils/dom.js';
```

### 3. CSS File Limits & Responsibilities

**File Responsibilities** (document at top of each file):

- **base.css**: `.ccc`, `.ccc__backdrop`, `.ccc__dialog`, scrollbar styling, global layout for `.ccc__body`, generic typography, close button, loading state
- **choice.css**: `.ccc__choice`, `.ccc__product-preview`, `.ccc__options`, `.ccc__size-option`, `.ccc__delivery-promise`, `.ccc__actions`, `#cc-recs-container`, `.ccc__more-info` (desktop layout only)
- **personaliser.css**: `.ccc__personaliser`, `.ccc__card-interior`, `.ccc__card-page--*`, `.ccc__message-field`, `.ccc__controls-column`, `.ccc__controls-panel`, typography controls, AI panel, `.ccc__sticky-footer` (desktop layout)
- **mobile.css**: All `@media (max-width: ...)` rules affecting CC modal, mobile layout for both choice and personaliser, `.ccc__footer-mobile`, mobile variants of `.ccc__sticky-footer`
- **states.css**: Animations, utility state classes (`--near-limit`, `--at-limit`, `--overflow`), transitions

**CSS Complexity Limits**
- **Max Selector Nesting**: 3 levels
  - ❌ `.ccc .ccc__dialog .ccc__body .ccc__personaliser .ccc__card-interior .message`
  - ✅ `.ccc__card-interior .message`
- **Prefer BEM Naming**: Flat BEM over deep nesting
- **Max Selectors per Rule**: 4 (readability limit)

**Removing CSS Duplication**

Each "component" (e.g., `.ccc__card-interior`, `.ccc__message-field`, `.ccc__sticky-footer`) should be:
- Defined once in base/choice/personaliser (desktop)
- Overridden only once in `mobile.css` (mobile)

### 4. File Size Budget

| File | Current Size | Budget | Red Line | Status |
|------|--------------|--------|----------|--------|
| assets/cc-choice.js | 64.1 KB | 80 KB | 100 KB | ✅ Under |
| assets/cc-choice.css | ~15 KB | 25 KB | 35 KB | ✅ Under |
| **Total** | **79.1 KB** | **105 KB** | **135 KB** | ✅ Under |

**Target**: Keep combined < 100 KB (gzipped ~30 KB)
**Red Line**: If > 120 KB, mandatory refactor before new features

### 5. Duplication Prevention

**Weekly Duplication Check** (run before starting new features):

```bash
# Find duplicate CSS selectors
rg "^\s*\.(ccc__[a-z-]+)\s*\{" src/cc-choice/styles --no-filename | sort | uniq -d

# Find duplicate function names
rg "^\s*function\s+([a-zA-Z]+)" src/cc-choice --no-filename | sort | uniq -d

# Find unused CSS classes (classes defined but never used in JS/Liquid)
# (Manual check - compare class names in CSS vs usage in templates/JS)
```

If duplicates found → refactor before new work.

### 6. Making Code AI-Friendly

**Short, Named Modules**
- Prefer several 80-150 line modules over a single 1,500-line file
- Each file should have a one-line JSDoc comment at top describing purpose
- Explicit code with clear naming > clever abstractions

**Descriptive Function Names, Consistent Patterns**
- `buildXView()`, `bindXHandlers()`, `updateXState()` - keep naming patterns consistent
- Avoid deep nesting where possible
- Extract inner callbacks into top-level functions inside the module (e.g., `handleSizeRadioChange`, `handleDeliveryToggleClick`)

**Keep Public API Small and Documented**
- `<cc-choice-modal>.show(config)` and `.hide()` should be the only public methods
- Record in CLAUDE.md and avoid "reaching inside" the modal from other scripts

**Inline Comments Only Where They Clarify Intent**
- High-level block comments (e.g., `// DELIVERY METHOD SECTION`) are helpful
- Line-by-line commentary is not needed

### 7. Process for Future Refactors (For Claude)

When asked to "tidy" or "optimize" CC code:

1. **Classify the change**: Is it JS logic, CSS layout, analytics, or build tooling? Work in the relevant `src/cc-choice/` subfolder.

2. **Look for reuse and duplication first**: Before adding new code, search for existing helpers or styles you can reuse. If you find two near-identical blocks, refactor into one shared place.

3. **Change sources, then rebuild**:
   - Never patch `assets/cc-choice.*` directly unless explicitly told it's an emergency hotfix
   - Use `node build.js` (or `node build.js --watch` during development)

4. **Verify behaviour & size**:
   - Run existing tests
   - Optionally check bundle sizes: `ls -lh assets/cc-choice.*`
   - Small reductions are good, but correctness is more important

5. **Leave the code slightly cleaner than you found it**:
   - Remove any now-unused helpers, CSS selectors, or imports as part of the same patch
   - Update CLAUDE.md if you introduce a new module or change an important invariant

---

## Common Tasks

### Build and Deploy Modal Changes
```bash
# Development workflow (watch mode)
npm run build:watch  # Auto-rebuild on file changes

# Production build + deploy to live
npm run deploy       # Builds and pushes to theme #190802035018

# Manual deploy (if you already ran build)
shopify theme push --theme 190802035018 \
  --only assets/cc-choice.js \
  --only assets/cc-choice.css \
  --allow-live
```

**IMPORTANT**: Always edit source files in `src/cc-choice/`, never `assets/cc-choice.js` directly!

### Deploy Cloudflare Worker (AI Suggestions)
```bash
cd "C:\Users\josh.smith\Shopify Theme\workers"
wrangler deploy

# Set API key (first time only)
wrangler secret put OPENROUTER_API_KEY
```
Worker URL: `https://cute-cards-ai-suggestions.josh-715.workers.dev`

### View Live Theme
```bash
shopify theme list
```
Or visit: https://zir0yr-xe.myshopify.com/admin/themes/190802035018/editor

---

## Troubleshooting

**Authentication issues**: `shopify auth login`
**Changes not appearing**: Hard refresh (Ctrl+Shift+R)
**Modal not opening**: Check console for errors, verify `data-cc-card` attribute
**Recommendations not showing**: Verify products have tags (format: `interest:value`)
**AI suggestions failing**: Check worker logs: `wrangler tail`

---

## Key Links

- **Store**: https://zir0yr-xe.myshopify.com
- **Admin**: https://zir0yr-xe.myshopify.com/admin
- **Theme Editor**: https://zir0yr-xe.myshopify.com/admin/themes/190802035018/editor
- **AI Worker**: https://cute-cards-ai-suggestions.josh-715.workers.dev

---

## Notes for Claude

- **User**: Josh Smith (Windows environment)
- **Style**: Direct, concise, professional. No emojis unless requested.
- **Deployment**: Always push to live (#190802035018) with `--allow-live` flag
- **Paths**: Always use absolute paths (C:\Users\josh.smith\Shopify Theme\...)
- **Tools**: Use TodoWrite for multi-step tasks

---

## SEO & Schema Architecture – 2025‑ready Brief

You are working on a Shopify theme that must have best‑in‑class SEO and AI discoverability for 2025 and beyond.

The Cute Cards Choice modal is a key UX surface, but canonical SEO must live on real pages (/products/*, /collections/*, etc.), with the modal as a progressive enhancement.

When making any change, treat this section as the source of truth.

### 1. Core Principles

**Canonical first**
- Every important URL (product, collection, blog, CMS pages) must render full HTML and JSON‑LD without JavaScript.
- Modals, drawers and AJAX views are enhancements, never the only place content exists.

**One canonical per concept**
- Each product, collection, article, etc. has exactly one canonical URL and one primary JSON‑LD representation.
- Avoid duplicate/competing schema for the same entity on the same page.

**Single design system; multiple surfaces**
- Product experience should be shared between:
  - Full product page (PDP)
  - Cute Cards Choice modal quick‑view
- Implement shared snippets/sections so both use the same structure, copy and schema where appropriate.

**Schema‑first content**
- Whenever you add UI that expresses a concept (product feature, FAQ, how‑to, rating, offer, etc.), ask:
  - "What schema type describes this?"
  - "Where should I centralise that JSON‑LD?"

### 2. URL, Meta & Canonical Strategy

**URLs**
- Keep Shopify's clean URLs: /products/handle, /collections/handle, /blogs/blog-handle/post-handle.
- Quick‑view modals may add query params (?ccq=handle) but canonical must always be the base URL.

**Head tags (per template)**
- Ensure each template sets:
  - `<title>`: concise, keyword‑rich, readable.
  - `meta[name="description"]`: human‑written summary, not keyword stuffing.
  - `link[rel="canonical"]`: points to the Shopify resource URL.
  - OpenGraph (og:*) and Twitter Card tags for social sharing (title, description, image, url, type).
  - For products, collections and blog posts, always set a specific OG image (card artwork, collection hero, post image).

**Noindex rules**
- noindex any thin/duplicate variants:
  - Search result pages with unbounded filters.
  - Non‑canonical tag/filter combinations that aren't meant to rank.
  - Internal utility pages not useful to users arriving from search.

### 3. Schema Strategy – Centralised Snippets

Create central schema snippets and reuse them across templates:

- `snippets/seo-organization-schema.liquid`
- `snippets/seo-website-schema.liquid`
- `snippets/seo-product-schema.liquid`
- `snippets/seo-collection-schema.liquid`
- `snippets/seo-breadcrumbs-schema.liquid`
- `snippets/seo-faq-schema.liquid` (for FAQ sections)
- `snippets/seo-article-schema.liquid` (for blog posts)

**Rules:**
- Use JSON‑LD (`<script type="application/ld+json">`) everywhere.
- Prefer one script per entity type per page over many fragmented blocks.
- Compose JSON‑LD with Liquid using the Shopify product, collection, article, blog, shop and settings objects.

### 4. Product Page Schema (PDP & CC layout)

For each product page (/products/handle), output:

**Product (schema.org/Product)**
- `@id` using the canonical URL + fragment (e.g. "{{ product.url }}#product").
- name, description, image (array of all key images), sku, mpn (if available), brand (brand name or shop).
- category using a descriptive string (e.g. "Greeting Card"), possibly from a metafield or collection.
- url: canonical product URL.
- inLanguage: shop locale.

**Offers (schema.org/Offer or AggregateOffer)**
- For each purchasable variant or as a single aggregate:
  - price, priceCurrency, availability, url, sku/gtin where available.
- Use priceValidUntil if there are scheduled promotions.

**AggregateRating and Review (if reviews exist)**
- aggregateRating with ratingValue, reviewCount.
- Individual Review items if you surface them on page.

**BreadcrumbList**
- Reflect the path: Home > Category > Product using ItemListElement with position, name, item.

**FAQ / HowTo (optional but powerful)**
- If a product has Q&A or "How it works" content, encode as:
  - FAQPage nested/related to the Product, or
  - HowTo if there is a step‑by‑step personalization/ordering guide.

**WebPage / ProductPage**
- Wrap with a WebPage or Product page entity that references the main Product via mainEntity.

**Implementation detail:**
- Place all PDP JSON‑LD in snippets/seo-product-schema.liquid and include it in every product template (including the CC‑brutalist product template).
- Never rely on modal‑only JSON‑LD; it must appear in the HTML for the canonical product page.

### 5. Collection & Listing Pages

For each collection URL (/collections/handle):

**CollectionPage + ItemList**
- `@type`: CollectionPage (and optionally `@type`: WebPage).
- name, description, url, image (collection image).
- mainEntity or hasPart as an ItemList:
  - List of products (or at least key products) with position, url, name, and optionally image, sku, offers price snippet.

**BreadcrumbList**
- Home > Collections > This collection or similar.

**Internal Linking**
- Make sure product card `<a>` tags use canonical product URLs.
- JS may intercept clicks to open the CC modal, but HTML must preserve those anchors for crawlers.

For site‑wide "All cards" / search result pages:
- Use SearchAction in the WebSite schema (see below) and avoid heavy additional schema on arbitrary search result URLs unless they are meaningful landing pages.

### 6. Site‑wide Schema (Home, Nav, Search)

On the homepage and/or globally:

**Organization / Brand**
- `@type`: Organization (or Brand / Store / LocalBusiness if a physical shop is important):
  - name, url, logo, sameAs (social profiles), contactPoint where relevant.

**WebSite + SearchAction**
- `@type`: WebSite with:
  - name, url.
  - potentialAction as a SearchAction with:
    - target: search URL pattern like "{{ shop.url }}/search?q={search_term_string}".
    - query-input: "required name=search_term_string".

**BreadcrumbList**
- Implement a reusable snippet for breadcrumbs and always pair visual breadcrumbs with matching schema.

### 7. Content Semantics & AI‑readable Product Data

**Semantically structured HTML**
- Use meaningful headings (h1 for product name, h2/h3 for sections), lists for features, and descriptive alt text for images.
- Avoid burying key details solely in images or generic "Read more" links.

**Rich product descriptors**
- Use metafields to store structured properties: size, material, occasion, recipient, style, humour level, etc.
- Map these to:
  - Visible UI (filters, badges, copy), and
  - additionalProperty on the Product JSON‑LD (propertyID, name, value).

**FAQ & explainer content**
- For recurring questions (delivery times, personalization rules, returns), prefer:
  - Dedicated FAQ section plus FAQPage schema.
  - Or embed product‑specific Q&A in the product template with corresponding schema.

**AI discoverability**
- Ensure descriptions are:
  - Natural language, benefit‑oriented, and unambiguous.
  - Not auto‑generated boilerplate repeated across many products.
- Keep key fields (name, description, additionalProperty) stable and accurate so shopping assistants / answer engines can extract reliable facts.

### 8. Modals, Quick‑View & SPA Behaviours

Modals (like `<cc-choice-modal>`) are UX surfaces only:
- Always render equivalent content on the canonical page.
- If modals need schema (e.g. for analytics or in‑page micro experiences), reuse the same schema snippets but avoid duplicating Product JSON‑LD at different URLs.

**History & crawlability:**
- When opening a modal from a collection, JS may:
  - Push state to show the product URL in the address bar.
  - Close on back navigation.
- This must never break direct access to the product URL as a full page.

### 9. Performance & Technical SEO Hygiene

**Critical CSS & JS**
- Avoid blocking scripts/styles in `<head>` that aren't needed for first paint of key content (product title, image, price, primary CTA).
- Defer or async non‑critical scripts, especially for analytics and heavy widgets.

**LCP & CLS**
- Ensure the main product image and title are early in the HTML, with explicit dimensions to avoid layout shift.
- Preload the hero image on product pages where reasonable.

**Internationalisation**
- If using multiple languages, ensure:
  - hreflang tags are correctly set.
  - inLanguage in schema matches the page locale.
  - Translations of titles/descriptions are aligned with schema.

### 10. Working Rules for Agents

When you (Claude) modify or add features:

**Always ask:**
- What is the canonical URL for this feature?
- Does the canonical page already have proper JSON‑LD? If not, add/update via the central schema snippets.
- Is the new UI element reflected in schema and in accessible HTML, not only in JS/React markup?

**Never:**
- Put critical Product/Offer schema exclusively in a modal or dynamically inserted fragment.
- Create multiple conflicting Product entities for the same item on a single page.

**Do:**
- Update or create schema snippets when you add new content types (FAQs, guides, videos).
- Keep schema in sync with visible content (names, prices, availability).
- Document any new schema snippet or SEO behaviour in CLAUDE.md with a short description and usage notes.

**Validation (for humans)**
- After major schema changes, humans should test representative URLs in:
  - Google Rich Results Test
  - Schema.org validator
- Aim for zero critical errors and minimal warnings.

### 11. SEO 2025/2026 Implementation Roadmap

Based on latest research (January 2025), the following enhancements bring the schema implementation to best-in-class for AI search and traditional SEO.

**Current Status: B+ (Very Strong Foundation)**

**Strengths:**
- Server-rendered JSON-LD (optimal performance)
- Excellent additionalProperty usage for personalization features
- Tag-based structured properties (interest, occasion, recipient, style, humour)
- Proper Offer/AggregateOffer handling
- Centralized schema snippets (single source of truth)
- Breadcrumbs with collection context
- Review schema readiness (awaiting app installation)

**Priority Enhancements:**

#### Phase 1: Quick Wins (This Week - 2 hours)

1. **Verify/Create WebSite + SearchAction Schema**
   - Check `snippets/seo-website-schema.liquid` exists with SearchAction
   - Enables Google search box in SERP, tells AI how to search site
   - Impact: Medium | Effort: 15 min

2. **Add ProductPage/CollectionPage Wrappers**
   - Edit `seo-product-schema.liquid`: wrap Product in ProductPage with mainEntity
   - Edit `seo-collection-schema.liquid`: link mainEntity to ItemList, add breadcrumb ref
   - **2025 Best Practice**: Page-level semantic clarity for AI systems
   - Impact: Medium-High | Effort: 30 min

3. **Expand Product additionalProperty**
   - Add: delivery_timeframe ("3-5 business days")
   - Add: material ("Premium card stock")
   - Add: dimensions per variant ("5x7 inches / 127x178mm")
   - More properties = more AI discoverability
   - Impact: Medium | Effort: 1 hour

4. **Test with Google Rich Results Test**
   - Test product page, collection page, homepage
   - Fix any critical errors
   - Impact: High (validation) | Effort: 30 min

#### Phase 2: Medium Impact (This Month - 8 hours)

5. **Enhance Top 20 Product Descriptions**
   - Rewrite with natural language (300-500 chars)
   - Benefit-oriented, answer "Why buy?" and "For whom?"
   - Map structured tags to unstructured benefits
   - **Research finding**: "35% of consumers use natural language search"
   - Impact: High | Effort: 4 hours

6. **Implement HowTo Schema for Personalization**
   - Create `snippets/seo-howto-schema.liquid`
   - 4 steps: Choose size → Add message → Customize typography → Choose delivery
   - Include on product pages or dedicated "How It Works" section
   - Appears in "How to" rich results, helps AI answer voice queries
   - Impact: Medium | Effort: 2 hours

7. **Install Review App**
   - Choose: Shopify Product Reviews (free) or Judge.me
   - Activate existing aggregateRating support
   - **Proven**: 40% CTR increase from review snippets
   - Impact: Very High | Effort: 1 hour

8. **Add 2025 Transactional Schemas**
   - Create `snippets/seo-merchant-return-policy.liquid`
     - returnPolicyCountry: "GB" (required as of March 2025)
     - returnPolicyCategory, merchantReturnDays (30), returnMethod
   - Create `snippets/seo-shipping-service.liquid`
     - deliveryCountry, businessDays (3-5), shippingRate
   - Link from Organization schema
   - Transactional transparency for AI recommendations
   - Impact: Medium (future-proofing) | Effort: 3 hours

#### Phase 3: Advanced (Q1 2025 - 12 hours)

9. **Implement ProductGroup for Variants**
   - Create `snippets/seo-productgroup-schema.liquid`
   - Use for products with 3+ variants (5x7, 7x7, A5, A4)
   - Properties: variesBy: "size", hasVariant array
   - Common properties at group level, offers at variant level
   - **Proven**: 12.71% average increase in search performance (Google, Feb 2024)
   - Impact: High | Effort: 6 hours

10. **Create Buying Guide Content**
    - "How to Choose the Perfect Birthday Card"
    - "What to Write in a Thank You Card"
    - 800-1000 words each, Article schema
    - Link to relevant products
    - AI-citeable content for "best cards for..." queries
    - Impact: Medium-High | Effort: 4 hours

11. **Enhance Collection Descriptions**
    - Rewrite top 5 collections (Birthday, Thank You, etc.)
    - Natural language, 200-300 chars
    - Keyword-rich without stuffing
    - Impact: Medium | Effort: 2 hours

#### Phase 4: Scale (Ongoing)

12. **Video Content + VideoObject Schema**
    - Create "How to Personalize" tutorial video
    - Product demo videos
    - Add `snippets/seo-video-schema.liquid`
    - Helps visual search, YouTube integration
    - Impact: Medium | Timeline: Q2 2025

13. **Knowledge Graph Development**
    - Map entity relationships (product → collection → organization)
    - Use @id references consistently throughout
    - **Research finding**: "LLMs grounded in knowledge graphs achieve 300% higher accuracy"
    - Impact: High | Timeline: Ongoing

14. **Expand Content Strategy**
    - Occasion guides (birthdays, weddings, thank you, etc.)
    - Recipient guides (for dad, for mum, for friend, etc.)
    - Message inspiration articles
    - All with Article schema, internal links to products
    - Impact: High | Timeline: Ongoing

**Expected Impact (Combined)**

Based on 2025 research findings:

| Change | Impact | Timeframe |
|--------|--------|-----------|
| ProductPage wrapper | +5-10% AI citations | 2-4 weeks |
| ProductGroup | +12% clicks (proven) | 4-6 weeks |
| Natural descriptions | +15-25% AI discoverability | 6-8 weeks |
| HowTo schema | +10% "how to" queries | 4-6 weeks |
| Review snippets | +40% CTR (proven) | Immediate |
| **Total Organic Visibility** | **+30-50%** | **3 months** |

**Testing Workflow**

After each schema change:

1. **Google Rich Results Test**
   - https://search.google.com/test/rich-results
   - Test mobile and desktop
   - Aim for zero critical errors, minimal warnings

2. **Schema.org Validator**
   - https://validator.schema.org/
   - Validates JSON-LD syntax

3. **Google Search Console**
   - Submit updated URLs for recrawl
   - Monitor "Enhancements" → Products, Breadcrumbs
   - Track impressions/clicks (30-day trend)

4. **Manual Verification**
   - View page source, confirm JSON-LD renders correctly
   - Check mobile and desktop versions identical
   - Verify prices/availability match actual product state

**New 2025 Schema Types (Emerging)**

- **ProductGroup**: For variant-rich products (launched Feb 2024, proven +12% impact)
- **MerchantReturnPolicy**: returnPolicyCountry now REQUIRED (March 2025 update)
- **ShippingService**: Detailed shipping costs + timeframes (Nov 2025)
- **HowTo**: Step-by-step guides (powerful for voice search + AI answers)

**Deprecated/Restricted**

- **FAQPage rich results**: Restricted to government/health sites only (Aug 2023)
  - Still use FAQ schema for AI understanding, but don't expect rich results
  - Focus on HowTo and Article schemas instead

**AI Discoverability Best Practices**

1. **Natural Language Descriptions**
   - Write as you'd explain to a friend
   - 300-500 characters, benefit-oriented
   - Answer "Why?", "For whom?", "What makes it special?"

2. **Structured + Unstructured Alignment**
   - If schema says "occasion: birthday", description should mention birthday
   - AI systems map structured properties to unstructured content for validation

3. **Complete additionalProperty Arrays**
   - More properties = more ways AI can filter/recommend
   - Use human-readable names and values
   - Example: "AI Message Suggestions: true" (clear) vs "ai_msgs: 1" (unclear)

4. **Entity Relationship Mapping**
   - Use @id references to link Product → Collection → Organization
   - Helps AI understand context and relationships

**Content Discipline for Scale**

As you add more products:

- **Unique Descriptions**: Avoid template boilerplate repeated across products
- **Accurate Tags**: Maintain tagging discipline (interest, occasion, recipient, style, humour)
- **Consistent Naming**: Size options, delivery methods, font names should be consistent
- **Fresh Content**: Update seasonal collections (Valentine's, Christmas, etc.)

**Quarterly Review Process**

Every 3 months:

1. Run Google Rich Results Test on 10 representative URLs
2. Check Search Console for new errors/warnings
3. Review top 20 products by traffic - enhance descriptions if needed
4. Audit new Google schema updates (subscribe to Google Search Central blog)
5. Update this roadmap with new priorities

### End goal

Every important page (product, collection, home, blog, FAQ) is:
- Fast and accessible.
- Has clean HTML with clear headings and descriptive copy.
- Emits rich, consistent JSON‑LD (Product, Offer, ItemList, FAQPage, HowTo, WebSite, Organization, BreadcrumbList, etc.).
- Works perfectly without JavaScript, while JS overlays like the CC modal enhance the experience for users.

This architecture should make the store highly discoverable and understandable to both traditional search engines and AI‑driven shopping/answer experiences.

---

**Last Updated**: January 2025
**Version**: 4.0 (modular architecture with build system)
**Previous**: 3.0 (AI suggestions + typography customization)
