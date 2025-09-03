/**
 * I18n Manager Tests
 * Tests for internationalization functionality
 */

class I18nTests {
  constructor() {
    this.testResults = [];
  }

  /**
   * Run all i18n tests
   */
  async runAllTests() {
    console.log("🌐 Running I18n Tests...");

    await this.testMessageRetrieval();
    await this.testPlaceholderSubstitution();
    await this.testFallbackMessages();
    await this.testDocumentLocalization();
    await this.testLocaleDetection();

    this.displayResults();
  }

  /**
   * Test basic message retrieval
   */
  async testMessageRetrieval() {
    const i18n = new I18nManager();

    // Test basic message retrieval
    const theaterMode = i18n.getMessage("theaterMode");
    const enabled = i18n.getMessage("enabled");
    const disabled = i18n.getMessage("disabled");

    this.assert(
      theaterMode && theaterMode !== "theaterMode",
      "Should retrieve theater mode message",
      `Got: ${theaterMode}`
    );

    this.assert(
      enabled && enabled !== "enabled",
      "Should retrieve enabled message",
      `Got: ${enabled}`
    );

    this.assert(
      disabled && disabled !== "disabled",
      "Should retrieve disabled message",
      `Got: ${disabled}`
    );
  }

  /**
   * Test placeholder substitution
   */
  async testPlaceholderSubstitution() {
    const i18n = new I18nManager();

    // Test with array substitution
    const message1 = i18n.getMessage("opacityChanged", ["75"]);
    this.assert(
      message1.includes("75"),
      "Should substitute placeholder with array",
      `Got: ${message1}`
    );

    // Test with string substitution
    const message2 = i18n.getMessage("opacityChanged", "50");
    this.assert(
      message2.includes("50"),
      "Should substitute placeholder with string",
      `Got: ${message2}`
    );
  }

  /**
   * Test fallback messages
   */
  async testFallbackMessages() {
    const i18n = new I18nManager();

    // Test non-existent key
    const fallback = i18n.getMessage("nonExistentKey");
    this.assert(
      fallback === "nonExistentKey",
      "Should return key as fallback for non-existent messages",
      `Got: ${fallback}`
    );
  }

  /**
   * Test document localization
   */
  async testDocumentLocalization() {
    const i18n = new I18nManager();

    // Create test elements
    const container = document.createElement("div");
    container.innerHTML = `
      <span data-i18n="theaterMode"></span>
      <input type="button" data-i18n="reset" />
      <div data-i18n="opacityChanged" data-i18n-substitutions='["60"]'></div>
      <span data-i18n-attr='{"title": "resetOpacityTooltip"}'></span>
    `;

    // Localize the container
    i18n.localizeDocument(container);

    const span = container.querySelector('[data-i18n="theaterMode"]');
    const button = container.querySelector('[data-i18n="reset"]');
    const div = container.querySelector('[data-i18n="opacityChanged"]');
    const attrSpan = container.querySelector("[data-i18n-attr]");

    this.assert(
      span.textContent && span.textContent !== "theaterMode",
      "Should localize span text content",
      `Got: ${span.textContent}`
    );

    this.assert(
      button.value && button.value !== "reset",
      "Should localize button value",
      `Got: ${button.value}`
    );

    this.assert(
      div.textContent && div.textContent.includes("60"),
      "Should localize with substitutions",
      `Got: ${div.textContent}`
    );

    this.assert(
      attrSpan.title && attrSpan.title !== "resetOpacityTooltip",
      "Should localize attributes",
      `Got: ${attrSpan.title}`
    );
  }

  /**
   * Test locale detection
   */
  async testLocaleDetection() {
    const i18n = new I18nManager();

    const locale = i18n.getCurrentLocale();
    this.assert(
      locale && typeof locale === "string",
      "Should detect current locale",
      `Got: ${locale}`
    );

    // Test RTL detection
    const isRTL = i18n.isRTL();
    this.assert(
      typeof isRTL === "boolean",
      "Should return boolean for RTL check",
      `Got: ${isRTL}`
    );
  }

  /**
   * Assert helper
   */
  assert(condition, message, details = "") {
    const result = {
      passed: condition,
      message: message,
      details: details,
      timestamp: new Date().toISOString(),
    };

    this.testResults.push(result);

    if (condition) {
      console.log(`✅ ${message}`, details ? `- ${details}` : "");
    } else {
      console.error(`❌ ${message}`, details ? `- ${details}` : "");
    }
  }

  /**
   * Display test results summary
   */
  displayResults() {
    const passed = this.testResults.filter((r) => r.passed).length;
    const total = this.testResults.length;

    console.log(`\n🌐 I18n Tests Complete: ${passed}/${total} passed`);

    if (passed === total) {
      console.log("🎉 All i18n tests passed!");
    } else {
      console.log("⚠️ Some i18n tests failed. Check the logs above.");
    }

    return { passed, total, results: this.testResults };
  }
}

// Export for use in test runner
if (typeof module !== "undefined" && module.exports) {
  module.exports = I18nTests;
} else if (typeof window !== "undefined") {
  window.I18nTests = I18nTests;
}
