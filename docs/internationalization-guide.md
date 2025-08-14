# Internationalization Guide

This document explains how to add and manage multiple languages in the YouTube Theater Mode extension.

## Overview

The extension uses Chrome's built-in internationalization (i18n) API along with a custom `I18nManager` class to provide multilingual support.

## Supported Languages

Currently supported languages:

- **English** (`en`) - Primary language for international users
- **Japanese** (`ja`) - Default language (original)

## Architecture

### Core Components

1. **Chrome i18n API**: Built-in Chrome extension internationalization support
2. **I18nManager Class**: Custom wrapper for enhanced functionality and fallbacks
3. **Message Files**: JSON files containing translations for each language
4. **Language Detection**: Automatic detection based on browser settings

### File Structure

```
_locales/
├── en/
│   └── messages.json     # English translations
└── ja/
    └── messages.json     # Japanese translations (default)

infrastructure/
├── i18n-manager.js       # Main internationalization manager
└── language-detector.js  # Language detection utilities
```

## Adding New Languages

### Step 1: Create Message File

Create a new directory under `_locales/` with the language code:

```bash
mkdir _locales/[language_code]
```

Create `messages.json` with all required translations:

```json
{
  "extensionName": {
    "message": "YouTube Theater Mode",
    "description": "Name of the extension"
  },
  "extensionDescription": {
    "message": "Your translated description here",
    "description": "Description of the extension"
  }
  // ... add all other message keys
}
```

### Step 2: Update Language Detector

Add the new language to the supported languages list in `infrastructure/language-detector.js`:

```javascript
this.supportedLanguages = ["en", "ja", "your_language_code"];
```

Add display name in `getLanguageDisplayNames()`:

```javascript
getLanguageDisplayNames() {
  return {
    'en': 'English',
    'ja': '日本語',
    'your_language_code': 'Your Language Name'
  };
}
```

### Step 3: Test the Implementation

1. Open `test/test-i18n.html` in your browser
2. Test message loading and UI localization
3. Verify all messages are properly translated

## Message Keys Reference

### Core Extension Messages

| Key                    | Description           | Example (EN)                 | Example (JA)           |
| ---------------------- | --------------------- | ---------------------------- | ---------------------- |
| `extensionName`        | Extension name        | "YouTube Theater Mode"       | "YouTube Theater Mode" |
| `extensionDescription` | Extension description | "Dims non-video elements..." | "YouTube 視聴時に..."  |
| `theaterMode`          | Theater mode label    | "Theater Mode"               | "シアターモード"       |
| `enabled`              | Enabled status        | "Enabled"                    | "有効"                 |
| `disabled`             | Disabled status       | "Disabled"                   | "無効"                 |

### UI Messages

| Key                 | Description     | Example (EN)          | Example (JA)                |
| ------------------- | --------------- | --------------------- | --------------------------- |
| `settings`          | Settings header | "Settings"            | "設定"                      |
| `backgroundOpacity` | Opacity label   | "Background Opacity:" | "背景の透明度:"             |
| `reset`             | Reset button    | "Reset"               | "リセット"                  |
| `keyboardShortcut`  | Shortcut label  | "Keyboard Shortcut:"  | "キーボードショートカット:" |

### Status Messages

| Key            | Description         | Example (EN)   | Example (JA)    |
| -------------- | ------------------- | -------------- | --------------- |
| `connected`    | Connected status    | "Connected"    | "接続済み"      |
| `disconnected` | Disconnected status | "Disconnected" | "未接続"        |
| `loading`      | Loading state       | "Loading..."   | "読み込み中..." |
| `error`        | Generic error       | "Error"        | "エラー"        |

### Accessibility Messages

| Key                   | Description           | Example (EN)            | Example (JA)                       |
| --------------------- | --------------------- | ----------------------- | ---------------------------------- |
| `enableTheaterMode`   | Enable announcement   | "Enable theater mode"   | "シアターモードを有効にする"       |
| `disableTheaterMode`  | Disable announcement  | "Disable theater mode"  | "シアターモードを無効にする"       |
| `theaterModeEnabled`  | Enabled announcement  | "Theater mode enabled"  | "シアターモードが有効になりました" |
| `theaterModeDisabled` | Disabled announcement | "Theater mode disabled" | "シアターモードが無効になりました" |

## Usage in Code

### Basic Message Retrieval

```javascript
// Initialize I18n Manager
const i18nManager = new I18nManager();

// Get a simple message
const message = i18nManager.getMessage("theaterMode");

// Get a message with substitutions
const message = i18nManager.getMessage("opacityChanged", ["70"]);
```

### HTML Localization

Use `data-i18n` attributes for automatic localization:

```html
<!-- Simple text content -->
<span data-i18n="theaterMode">Theater Mode</span>

<!-- Attribute localization -->
<button data-i18n-attr='{"title":"resetOpacityTooltip"}' data-i18n="reset">
  Reset
</button>

<!-- With substitutions -->
<span data-i18n="opacityChanged" data-i18n-substitutions='["70"]'>
  Opacity changed to 70%
</span>
```

### Document Localization

```javascript
// Localize entire document
i18nManager.localizeDocument();

// Localize specific container
const container = document.getElementById("popup");
i18nManager.localizeDocument(container);
```

## Message Format

### Basic Message

```json
{
  "messageKey": {
    "message": "The actual message text",
    "description": "Description for translators"
  }
}
```

### Message with Placeholders

```json
{
  "opacityChanged": {
    "message": "Opacity changed to $OPACITY$%",
    "description": "Feedback message when opacity changes",
    "placeholders": {
      "opacity": {
        "content": "$1",
        "example": "70"
      }
    }
  }
}
```

## Best Practices

### Translation Guidelines

1. **Keep Context**: Always provide meaningful descriptions for translators
2. **Use Placeholders**: For dynamic content, use placeholders instead of string concatenation
3. **Consider Length**: Some languages may be longer/shorter than the original
4. **Cultural Sensitivity**: Consider cultural differences in messaging

### Technical Guidelines

1. **Fallback Messages**: Always provide fallback messages in `I18nManager`
2. **Error Handling**: Handle missing translations gracefully
3. **Performance**: Cache frequently used messages
4. **Testing**: Test with different languages and text lengths

### Code Organization

1. **Consistent Keys**: Use consistent naming conventions for message keys
2. **Grouping**: Group related messages logically
3. **Documentation**: Document all message keys and their usage
4. **Validation**: Validate that all required keys exist in all language files

## Testing

### Manual Testing

1. Open `test/test-i18n.html` in browser
2. Switch between languages using the test interface
3. Verify all messages display correctly
4. Test UI layout with different text lengths

### Automated Testing

```javascript
// Test message retrieval
const i18n = new I18nManager();
console.assert(i18n.getMessage("theaterMode") !== "theaterMode");

// Test fallback behavior
console.assert(i18n.getMessage("nonexistentKey") === "nonexistentKey");
```

## Troubleshooting

### Common Issues

1. **Missing Translations**: Check that all message keys exist in all language files
2. **Encoding Issues**: Ensure all files are saved as UTF-8
3. **Placeholder Errors**: Verify placeholder syntax in messages.json
4. **Fallback Not Working**: Check I18nManager fallback implementation

### Debug Tips

1. Enable console logging in `I18nManager` for debugging
2. Use browser developer tools to inspect `chrome.i18n` API
3. Test with different browser language settings
4. Validate JSON syntax in message files

## Future Enhancements

### Planned Features

1. **Dynamic Language Switching**: Allow users to change language in settings
2. **RTL Support**: Add support for right-to-left languages
3. **Pluralization**: Handle plural forms for different languages
4. **Date/Number Formatting**: Locale-specific formatting

### Contributing Translations

1. Fork the repository
2. Add your language following the steps above
3. Test thoroughly with the test page
4. Submit a pull request with your translations

For questions or help with translations, please open an issue on GitHub.
