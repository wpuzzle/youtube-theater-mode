/**
 * I18n Test Runner
 * Runs internationalization tests in different environments
 */

// Import required modules
if (typeof require !== "undefined") {
  const I18nManager = require("../infrastructure/i18n-manager.js");
  const I18nTests = require("./test-i18n.js");
}

/**
 * Run i18n tests with different locale simulations
 */
async function runI18nTests() {
  console.log("🚀 Starting I18n Test Suite...\n");

  // Test 1: Current environment
  console.log("📍 Testing in current environment:");
  const tests = new I18nTests();
  await tests.runAllTests();

  // Test 2: Simulate different locales (for development)
  console.log("\n📍 Testing locale-specific functionality:");
  await testLocaleSpecificFeatures();

  // Test 3: Test message file completeness
  console.log("\n📍 Testing message file completeness:");
  await testMessageFileCompleteness();

  console.log("\n🏁 I18n Test Suite Complete!");
}

/**
 * Test locale-specific features
 */
async function testLocaleSpecificFeatures() {
  const i18n = new I18nManager();

  // Test number formatting
  console.log("Testing number formatting:");
  const number = 1234.56;
  const formatted = i18n.formatNumber(number);
  console.log(`Number ${number} formatted as: ${formatted}`);

  // Test percentage formatting
  console.log("Testing percentage formatting:");
  const percentage = 0.75;
  const formattedPercent = i18n.formatPercentage(percentage);
  console.log(`Percentage ${percentage} formatted as: ${formattedPercent}`);

  // Test RTL detection
  console.log("Testing RTL detection:");
  const isRTL = i18n.isRTL();
  console.log(`Current locale is RTL: ${isRTL}`);

  // Test current locale
  console.log("Testing locale detection:");
  const locale = i18n.getCurrentLocale();
  console.log(`Detected locale: ${locale}`);
}

/**
 * Test message file completeness
 */
async function testMessageFileCompleteness() {
  // This would ideally load and compare message files
  // For now, we'll test key message retrieval

  const i18n = new I18nManager();
  const requiredKeys = [
    "extensionName",
    "extensionDescription",
    "theaterMode",
    "enabled",
    "disabled",
    "settings",
    "backgroundOpacity",
    "reset",
    "keyboardShortcut",
    "connected",
    "disconnected",
    "loading",
    "error",
    "opacityChanged",
    "theaterModeEnabled",
    "theaterModeDisabled",
  ];

  console.log("Checking required message keys:");
  let missingKeys = [];

  requiredKeys.forEach((key) => {
    const message = i18n.getMessage(key);
    if (message === key) {
      // Message not found, using key as fallback
      missingKeys.push(key);
      console.log(`❌ Missing: ${key}`);
    } else {
      console.log(`✅ Found: ${key} = "${message}"`);
    }
  });

  if (missingKeys.length === 0) {
    console.log("🎉 All required message keys are present!");
  } else {
    console.log(`⚠️ Missing ${missingKeys.length} message keys:`, missingKeys);
  }
}

/**
 * Manual test instructions
 */
function printManualTestInstructions() {
  console.log(`
🔧 Manual Testing Instructions:

1. Language Switching Test:
   - Go to chrome://settings/languages
   - Add Japanese (日本語) if not present
   - Move Japanese to top of list
   - Restart Chrome
   - Test extension popup and UI

2. English Test:
   - Move English to top of language list
   - Restart Chrome
   - Test extension popup and UI

3. Extension Store Test:
   - Go to chrome://extensions/
   - Check extension name and description
   - Should match browser language

4. Console Testing:
   - Open DevTools on any YouTube page
   - Run: chrome.i18n.getUILanguage()
   - Run: chrome.i18n.getMessage('extensionName')
   - Run: chrome.i18n.getMessage('opacityChanged', ['75'])

5. Popup Testing:
   - Open extension popup
   - Verify all text is in correct language
   - Test tooltip messages
   - Test button labels

6. Content Script Testing:
   - Enable theater mode
   - Check accessibility announcements
   - Verify status messages

Expected Results:
- All UI text should be in the browser's primary language
- Fallback to English if translation missing
- No untranslated message keys visible
- Proper placeholder substitution
  `);
}

// Run tests if this file is executed directly
if (typeof window !== "undefined") {
  // Browser environment
  document.addEventListener("DOMContentLoaded", () => {
    runI18nTests();
    printManualTestInstructions();
  });
} else if (typeof module !== "undefined" && require.main === module) {
  // Node.js environment
  runI18nTests();
  printManualTestInstructions();
}

// Export for use in other test files
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    runI18nTests,
    testLocaleSpecificFeatures,
    testMessageFileCompleteness,
  };
}
