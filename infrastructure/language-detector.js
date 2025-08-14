/**
 * Language Detector Utility
 * Helps detect and manage language preferences for the extension
 */
class LanguageDetector {
  constructor() {
    this.supportedLanguages = ["en", "ja"];
    this.defaultLanguage = "ja";
  }

  /**
   * Get the best matching language based on browser settings
   * @returns {string} The best matching language code
   */
  getBestMatchingLanguage() {
    if (typeof chrome !== "undefined" && chrome.i18n) {
      const browserLanguage = chrome.i18n.getUILanguage();
      return this.findBestMatch(browserLanguage);
    }

    // Fallback for testing environments
    const browserLanguages = this.getBrowserLanguages();
    for (const lang of browserLanguages) {
      const match = this.findBestMatch(lang);
      if (match !== this.defaultLanguage) {
        return match;
      }
    }

    return this.defaultLanguage;
  }

  /**
   * Get browser language preferences
   * @returns {string[]} Array of language codes in preference order
   */
  getBrowserLanguages() {
    const languages = [];

    if (navigator.languages) {
      languages.push(...navigator.languages);
    }

    if (navigator.language) {
      languages.push(navigator.language);
    }

    if (navigator.userLanguage) {
      languages.push(navigator.userLanguage);
    }

    return languages;
  }

  /**
   * Find the best matching supported language
   * @param {string} requestedLanguage - The requested language code
   * @returns {string} The best matching supported language
   */
  findBestMatch(requestedLanguage) {
    if (!requestedLanguage) {
      return this.defaultLanguage;
    }

    const requested = requestedLanguage.toLowerCase();

    // Exact match
    if (this.supportedLanguages.includes(requested)) {
      return requested;
    }

    // Language code match (e.g., 'en-US' -> 'en')
    const languageCode = requested.split("-")[0];
    if (this.supportedLanguages.includes(languageCode)) {
      return languageCode;
    }

    // No match found, return default
    return this.defaultLanguage;
  }

  /**
   * Check if a language is supported
   * @param {string} languageCode - The language code to check
   * @returns {boolean} True if the language is supported
   */
  isLanguageSupported(languageCode) {
    return this.supportedLanguages.includes(languageCode.toLowerCase());
  }

  /**
   * Get all supported languages
   * @returns {string[]} Array of supported language codes
   */
  getSupportedLanguages() {
    return [...this.supportedLanguages];
  }

  /**
   * Get language display names
   * @returns {Object} Object mapping language codes to display names
   */
  getLanguageDisplayNames() {
    return {
      en: "English",
      ja: "日本語",
    };
  }
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = LanguageDetector;
} else if (typeof window !== "undefined") {
  window.LanguageDetector = LanguageDetector;
}
