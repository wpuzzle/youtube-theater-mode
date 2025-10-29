# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

YouTube Theater Mode is a Chrome Extension (Manifest V3) that dims non-video elements on YouTube to create a focused viewing environment. Built with pure Vanilla JavaScript (no external dependencies), it uses a modular architecture with clear separation of concerns.

## Development Commands

### Extension Development

```bash
# Load extension in Chrome
# Navigate to chrome://extensions/ → Enable "Developer mode" → Click "Load unpacked" → Select this directory

# Reload extension after changes
# Go to chrome://extensions/ → Click reload icon on the extension card

# View background service worker logs
# Go to chrome://extensions/ → Click "service worker" link under the extension

# View content script logs
# Open YouTube page → Press F12 → Console → Filter by "YouTube Theater Mode:"
```

### Testing

```bash
# Run individual test suites (in browser)
open test/test-*.html

# Run test via Node.js (where applicable)
node test/run-element-tests.js
node test/run-integration-tests.js

# Run all unit tests
node test/run-all-unit-tests.js
```

### Development Server (Optional)

```bash
# Serve test files over HTTP
python -m http.server 8000
# Then open http://localhost:8000/test/test-*.html
```

## Architecture Overview

### Three-Layer Architecture

The codebase follows a strict layered architecture pattern:

```
┌─────────────────────────────────────────┐
│     Presentation Layer                  │
│  - content.js (Theater mode control)    │
│  - popup.js/html (UI)                   │
│  - background.js (Service worker)       │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│     Business Layer                      │
│  - TheaterModeController               │
│  - TabStateManager                     │
│  - SettingsManager                     │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│     Infrastructure Layer                │
│  All shared utilities in infrastructure/│
│  - Logger, ErrorHandler                │
│  - MessageBus, StorageAdapter          │
│  - StateStore, PerformanceMonitor      │
└─────────────────────────────────────────┘
```

**Critical Rule**: Lower layers NEVER depend on upper layers. Infrastructure classes are shared across all components.

### Key Architectural Patterns

#### 1. Modular Design with Infrastructure Layer

All shared functionality lives in `infrastructure/` directory. **Always use these classes instead of re-implementing**:

- **ErrorHandler** - Exception handling with Result pattern
- **Logger** - Structured logging with levels (debug, info, warn, error)
- **MessageBus** - All component-to-component communication
- **StorageAdapter** - Chrome Storage API wrapper
- **StateStore** - Centralized state management
- **PerformanceMonitor** - Performance tracking

#### 2. Message-Based Communication

All components communicate through `MessageBus`. Never implement direct component-to-component communication.

```javascript
// Background service coordinates all interactions
// Content scripts communicate via MessageBus
// Popup communicates via MessageBus
// No direct calls between components
```

#### 3. Background Service as Single Source of Truth

The background service worker (`background.js` + `background-service.js`) is the authoritative state manager. All state changes flow through it and are propagated to active YouTube tabs.

#### 4. Element Detection with Fallbacks

YouTube's DOM structure is unstable. **Always implement multiple detection strategies with proper fallbacks**:

```javascript
// ElementDetector provides multiple fallback selectors
// Never assume YouTube DOM structure will remain stable
// Implement graceful degradation when elements aren't found
```

### Core Components

#### Background Service (`background.js`, `background-service.js`)
- Single source of truth for extension state
- Coordinates all component interactions
- Manages settings persistence via `StorageAdapter`
- Handles cross-tab state synchronization

#### Content Script (`content.js`)
- YouTube DOM manipulation and overlay injection
- Element detection with robust fallback mechanisms
- Keyboard shortcut handling (must preserve all YouTube shortcuts)
- Communicates with background via `MessageBus`

#### Popup (`popup.html`, `popup.js`, `popup.css`)
- User controls for theater mode toggle and opacity adjustment
- Real-time state display
- Settings management interface

#### Infrastructure Classes (Mandatory Usage)
- `TheaterModeController` - Overlay management and theater mode logic
- `ElementDetector` - YouTube element detection with multiple fallback strategies
- `SettingsManager` - User settings management with validation
- `TabStateManager` - Multi-tab state tracking and sync

## Development Rules

### 1. Element Detection
Always implement multiple detection strategies with fallbacks. YouTube DOM changes frequently.

```javascript
// Use ElementDetector with fallback selectors
// Never rely on a single selector
// Implement graceful degradation
```

### 2. Error Handling
Wrap all operations in try-catch using `ErrorHandler`. The extension must never break YouTube functionality.

```javascript
const result = await errorHandler.wrapAsync(async () => {
  // Your code here
});

if (result.success) {
  // Handle success
} else {
  // Handle error gracefully
}
```

### 3. State Management
- Background service is authoritative state source
- Use `StorageAdapter` for all Chrome Storage operations
- Propagate state changes to all active YouTube tabs
- Validate all settings through `SettingsManager`

### 4. Performance
- Use `PerformanceMonitor` for operation tracking
- Minimize DOM queries, cache results when possible
- Clean up event listeners and observers on component destruction

### 5. Testing
- Each component has corresponding `test/test-*.js` and `run-*-tests.js` files
- Use `infrastructure/test-framework.js` for consistent test structure
- Use `infrastructure/mock-factory.js` to mock external dependencies

## File Naming Conventions

- Core functionality: `kebab-case.js` (e.g., `theater-mode-controller.js`)
- Infrastructure: `infrastructure/kebab-case.js`
- Tests: `test/test-component-name.js` and `test/run-component-tests.js`
- HTML test harnesses: `test/test-component-name.html`

## Important Constraints

### YouTube Compatibility
**Priority #1**: Do not interfere with video player functionality or existing YouTube keyboard shortcuts. The extension must enhance, not disrupt.

### Graceful Degradation
If element detection fails due to YouTube updates, the extension must still function. Implement robust fallback mechanisms.

### Clean Architecture
Follow Single Responsibility Principle. Each class has a clear purpose. Use dependency injection for shared services.

### No External Dependencies
This is a pure Vanilla JavaScript project. Do not add npm packages or external libraries. All functionality is implemented in-house.

## Internationalization

The extension supports multiple languages via Chrome i18n API:
- Translations in `_locales/{language_code}/messages.json`
- Use `chrome.i18n.getMessage(key)` for all user-facing strings
- Language auto-detected from browser settings

Supported languages: en, ja, es, fr, de, it, ko, pt, ru, zh_CN, zh_TW

## Code Style

### JavaScript
- ES6+ features (arrow functions, template literals, destructuring)
- Class-based architecture for main components
- camelCase for variables/functions, PascalCase for classes
- Comprehensive error handling with `ErrorHandler`
- Structured logging with `Logger` (debug, info, warn, error levels)
- JSDoc comments for all classes and public methods
- **Always use infrastructure classes, never re-implement**

### CSS
- BEM-style naming conventions
- Use `!important` sparingly, only to override YouTube styles
- CSS variables for theme consistency
- Vendor prefixes for cross-browser compatibility

### HTML
- Semantic HTML5 elements
- Accessibility attributes (aria-*, role, tabindex)
- UTF-8 encoding

## Testing Strategy

Tests are organized in the `test/` directory:
- Unit tests: `test/test-*.js` and `test/run-*-tests.js`
- Integration tests: `test/run-integration-tests.js`
- Test framework: `infrastructure/test-framework.js`
- Mocking: `infrastructure/mock-factory.js`

Test on various YouTube page layouts (watch, search, channel, playlist) to ensure compatibility.

## Debugging

### Console Logs
All extension logs are prefixed with "YouTube Theater Mode:"
```javascript
// Filter in DevTools Console
"YouTube Theater Mode:"
```

### Background Service
View background service logs:
1. Navigate to `chrome://extensions/`
2. Click "service worker" link for the extension
3. DevTools opens for background service

### Content Script
Debug content script on YouTube pages:
1. Open YouTube page
2. Press F12 to open DevTools
3. Find `content.js` in Sources tab
4. Set breakpoints and debug

### Popup
Debug popup UI:
1. Right-click extension icon
2. Select "Inspect popup"
3. DevTools opens for popup

## Performance Considerations

- DOM queries are expensive - cache element references when possible
- Use `requestAnimationFrame` for DOM operations
- Clean up MutationObservers and event listeners on component destruction
- Use `PerformanceMonitor` to track slow operations
- Avoid layout thrashing (batch reads and writes)

## Common Patterns

### Dependency Injection
```javascript
class TheaterModeController {
  constructor(dependencies) {
    this.logger = dependencies.logger;
    this.errorHandler = dependencies.errorHandler;
    this.stateStore = dependencies.stateStore;
  }
}
```

### Result Pattern (instead of exceptions)
```javascript
// Functions return Result objects
const result = await errorHandler.wrapAsync(operation);

if (result.success) {
  console.log(result.data);
} else {
  logger.error("Operation failed", result.error);
}
```

### Immutable State Management
```javascript
// Never mutate state directly
const newState = {
  ...currentState,
  theaterMode: {
    ...currentState.theaterMode,
    isEnabled: !currentState.theaterMode.isEnabled
  }
};
```

## Security Considerations

- Never use `eval()` or inline event handlers (CSP compliance)
- Sanitize all user input and settings
- Validate all data through `DataValidator`
- Use `textContent` instead of `innerHTML` when possible
- Permissions are minimal: only `storage` and `activeTab` for `*.youtube.com`

## Extension Manifest (V3)

The extension uses Manifest V3 with minimal permissions:
- `storage` - For saving user settings
- `activeTab` - For content script injection
- `host_permissions` - Only `*.youtube.com`

Content scripts inject into all YouTube pages and run at `document_end`.
