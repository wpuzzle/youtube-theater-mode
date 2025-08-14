/**
 * Internationalization Manager
 * Handles localization and message translation for the extension
 */
class I18nManager {
  constructor() {
    this.currentLocale = this.detectLocale();
    this.fallbackLocale = "en";
    this.cache = new Map();
  }

  /**
   * Detect the current locale from browser settings
   * @returns {string} The detected locale code
   */
  detectLocale() {
    if (typeof chrome !== "undefined" && chrome.i18n) {
      return chrome.i18n.getUILanguage();
    }

    // Fallback for testing environments
    return navigator.language || navigator.userLanguage || "en";
  }

  /**
   * Get a localized message
   * @param {string} key - The message key
   * @param {Array|string} substitutions - Optional substitutions for placeholders
   * @returns {string} The localized message
   */
  getMessage(key, substitutions = null) {
    try {
      if (typeof chrome !== "undefined" && chrome.i18n) {
        const message = chrome.i18n.getMessage(key, substitutions);
        if (message) {
          return message;
        }
      }

      // Fallback for development/testing
      return this.getFallbackMessage(key, substitutions);
    } catch (error) {
      console.warn(`I18n: Failed to get message for key "${key}":`, error);
      return this.getFallbackMessage(key, substitutions);
    }
  }

  /**
   * Get fallback message when Chrome i18n API is not available
   * @param {string} key - The message key
   * @param {Array|string} substitutions - Optional substitutions
   * @returns {string} The fallback message
   */
  getFallbackMessage(key, substitutions) {
    // Simple fallback messages for development
    const fallbackMessages = {
      theaterMode: "Theater Mode",
      enabled: "Enabled",
      disabled: "Disabled",
      settings: "Settings",
      backgroundOpacity: "Background Opacity:",
      reset: "Reset",
      keyboardShortcut: "Keyboard Shortcut:",
      connected: "Connected",
      disconnected: "Disconnected",
      loading: "Loading...",
      error: "Error",
    };

    let message = fallbackMessages[key] || key;

    if (substitutions && Array.isArray(substitutions)) {
      substitutions.forEach((sub, index) => {
        message = message.replace(`$${index + 1}`, sub);
      });
    } else if (substitutions) {
      message = message.replace("$1", substitutions);
    }

    return message;
  }

  /**
   * Localize all elements with data-i18n attributes
   * @param {Element} container - The container element to localize (defaults to document)
   */
  localizeDocument(container = document) {
    const elements = container.querySelectorAll("[data-i18n]");

    elements.forEach((element) => {
      const key = element.getAttribute("data-i18n");
      const substitutions = element.getAttribute("data-i18n-substitutions");

      let subs = null;
      if (substitutions) {
        try {
          subs = JSON.parse(substitutions);
        } catch (e) {
          subs = substitutions.split(",");
        }
      }

      const message = this.getMessage(key, subs);

      // Handle different element types
      if (
        element.tagName === "INPUT" &&
        (element.type === "button" || element.type === "submit")
      ) {
        element.value = message;
      } else if (element.hasAttribute("placeholder")) {
        element.placeholder = message;
      } else if (element.hasAttribute("title")) {
        element.title = message;
      } else {
        element.textContent = message;
      }
    });

    // Handle elements with data-i18n-attr for specific attributes
    const attrElements = container.querySelectorAll("[data-i18n-attr]");
    attrElements.forEach((element) => {
      const attrConfig = element.getAttribute("data-i18n-attr");
      try {
        const config = JSON.parse(attrConfig);
        Object.entries(config).forEach(([attr, key]) => {
          const message = this.getMessage(key);
          element.setAttribute(attr, message);
        });
      } catch (e) {
        console.warn("I18n: Invalid data-i18n-attr format:", attrConfig);
      }
    });
  }

  /**
   * Get the current locale
   * @returns {string} The current locale code
   */
  getCurrentLocale() {
    return this.currentLocale;
  }

  /**
   * Check if the current locale is RTL (Right-to-Left)
   * @returns {boolean} True if RTL locale
   */
  isRTL() {
    const rtlLocales = ["ar", "he", "fa", "ur"];
    return rtlLocales.some((locale) => this.currentLocale.startsWith(locale));
  }

  /**
   * Format a number according to the current locale
   * @param {number} number - The number to format
   * @param {Object} options - Formatting options
   * @returns {string} The formatted number
   */
  formatNumber(number, options = {}) {
    try {
      return new Intl.NumberFormat(this.currentLocale, options).format(number);
    } catch (error) {
      return number.toString();
    }
  }

  /**
   * Format a percentage according to the current locale
   * @param {number} value - The decimal value (0-1)
   * @returns {string} The formatted percentage
   */
  formatPercentage(value) {
    return this.formatNumber(value, { style: "percent" });
  }
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = I18nManager;
} else if (typeof window !== "undefined") {
  window.I18nManager = I18nManager;
}
