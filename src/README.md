# cc-choice Source Modules

This folder contains the modular source code for the Cute Cards choice modal system.

## Build System

**DO NOT edit `assets/cc-choice.js` or `assets/cc-choice.css` directly!**

All changes must be made in `src/cc-choice/**` and built using:

```bash
npm run build        # Production build
npm run build:watch  # Development (auto-rebuild)
npm run deploy       # Build + deploy to live theme
```

## Module Architecture

### Entry Point
- `index.js` - Custom element registration, grid interception, global setup

### Core (`core/`)
- `CCChoiceModal.js` - Thin orchestrator (~300 lines max)
- `constants.js` - Configuration values
- `state.js` - Shared state (if needed)

### Services (`services/`)
**Pure modules - NO DOM access**
- `productService.js` - Product JSON fetching + cache
- `metafieldService.js` - GraphQL metafield queries
- `cartService.js` - Cart API operations
- `aiService.js` - AI worker client
- `persistence.js` - localStorage helpers
- `analytics.js` - Event tracking
- `layoutService.js` - Responsive layout calculations

### Views (`views/`)
**DOM modules - render + bind only**
- `loadingView.js` - Loading spinner
- `choiceView.js` - Size selection UI
- `personaliserView.js` - Personalization form
- `messageField.js` - Message textarea behavior
- `deliverySection.js` - Delivery options + recipient fields

### Integrations (`integrations/`)
**External system bridges**
- `recsIntegration.js` - Recommendation rail integration
- `cartDrawer.js` - Cart drawer integration

### Utils (`utils/`)
**Pure utility functions**
- `string.js` - Text manipulation
- `format.js` - Price formatting
- `dom.js` - DOM helpers, scroll lock
- `dialog.js` - Confirmation dialogs

### Styles (`styles/`)
**CSS modules (bundled in order)**
- `base.css` - Modal container, backdrop
- `choice.css` - Size selection layout
- `personaliser.css` - Form layout
- `mobile.css` - Responsive overrides
- `states.css` - Animations, loading states

## Coding Rules

1. **300-line maximum** per file
   - **Exception**: `index.js` currently contains the full monolith (~3,016 lines) and will be trimmed during Phase 2-5 refactoring
2. **One concern per module**
3. **No direct DOM access** in services
4. **No business logic** in views (only render + bind)
5. **JSDoc types required** for all public interfaces
6. **No new global listeners** outside index.js

## Refactor Sequence

Current status: **Phase 1 Complete** (build system + architecture)

Next phases:
- **Phase 2**: Extract pure services (persistence, analytics, product, cart, AI)
- **Phase 3**: Split view builders
- **Phase 4**: Extract components & utilities
- **Phase 5**: Trim CCChoiceModal to orchestrator only
- **Phase 6**: Modularize CSS
- **Phase 7**: Testing & deployment

See `CLAUDE.md` for full architecture documentation.
