#!/usr/bin/env node

/**
 * Node.js Test Runner for Settings Management
 * Chrome Storage API を使用した設定保存機能のテスト実行
 */

// Mock Chrome Storage API for Node.js environment
const mockChromeStorage = {
  data: {},
  sync: {
    get: function (keys) {
      return new Promise((resolve) => {
        if (Array.isArray(keys)) {
          const result = {};
          keys.forEach((key) => {
            if (this.data.hasOwnProperty(key)) {
              result[key] = this.data[key];
            }
          });
          resolve(result);
        } else if (typeof keys === "string") {
          const result = {};
          if (this.data.hasOwnProperty(keys)) {
            result[keys] = this.data[keys];
          }
          resolve(result);
        } else {
          resolve(this.data);
        }
      });
    },
    set: function (items) {
      return new Promise((resolve) => {
        if (!this.data) {
          this.data = {};
        }
        Object.assign(this.data, items || {});
        resolve();
      });
    },
    clear: function () {
      return new Promise((resolve) => {
        this.data = {};
        resolve();
      });
    },
  },
};

// Mock global objects for Node.js
global.chrome = {
  storage: mockChromeStorage,
};

global.localStorage = {
  data: {},
  setItem: function (key, value) {
    this.data[key] = value;
  },
  getItem: function (key) {
    return this.data[key] || null;
  },
  removeItem: function (key) {
    delete this.data[key];
  },
};

global.console = console;

// Settings Manager Class (simplified for Node.js testing)
class SettingsManager {
  constructor() {
    this.defaultSettings = {
      opacity: 0.7,
      isEnabled: false,
      shortcutKey: "Ctrl+Shift+T",
      lastUsed: null,
      version: "1.0.0",
    };

    this.currentSettings = { ...this.defaultSettings };
    this.settingsKey = "theaterModeSettings";
    this.isLoading = false;
    this.loadPromise = null;
  }

  initializeSettings() {
    const settings = {
      ...this.defaultSettings,
      lastUsed: Date.now(),
    };
    return this.validateSettings(settings);
  }

  async saveSettings(settings) {
    try {
      const validatedSettings = this.validateSettings(settings);

      if (
        typeof chrome !== "undefined" &&
        chrome.storage &&
        chrome.storage.sync
      ) {
        await chrome.storage.sync.set({
          [this.settingsKey]: validatedSettings,
        });
      } else {
        localStorage.setItem(
          this.settingsKey,
          JSON.stringify(validatedSettings)
        );
      }

      this.currentSettings = { ...validatedSettings };
      return true;
    } catch (error) {
      console.error("Error saving settings:", error);
      return false;
    }
  }

  async loadSettings() {
    if (this.isLoading && this.loadPromise) {
      return this.loadPromise;
    }

    this.isLoading = true;
    this.loadPromise = this._performLoadSettings();

    try {
      const result = await this.loadPromise;
      return result;
    } finally {
      this.isLoading = false;
      this.loadPromise = null;
    }
  }

  async _performLoadSettings() {
    try {
      let storedSettings = null;

      if (
        typeof chrome !== "undefined" &&
        chrome.storage &&
        chrome.storage.sync
      ) {
        const result = await chrome.storage.sync.get([this.settingsKey]);
        storedSettings = result[this.settingsKey];
      } else {
        const stored = localStorage.getItem(this.settingsKey);
        if (stored) {
          storedSettings = JSON.parse(stored);
        }
      }

      let settings;
      if (storedSettings) {
        settings = {
          ...this.defaultSettings,
          ...storedSettings,
        };
      } else {
        settings = this.initializeSettings();
        await this.saveSettings(settings);
      }

      const validatedSettings = this.validateSettings(settings);
      this.currentSettings = { ...validatedSettings };
      return validatedSettings;
    } catch (error) {
      console.error("Error loading settings:", error);
      const defaultSettings = this.initializeSettings();
      this.currentSettings = { ...defaultSettings };
      return defaultSettings;
    }
  }

  validateSettings(settings) {
    if (!settings || typeof settings !== "object") {
      return { ...this.defaultSettings };
    }

    const validated = { ...this.defaultSettings };

    if (
      typeof settings.opacity === "number" &&
      settings.opacity >= 0 &&
      settings.opacity <= 0.9
    ) {
      validated.opacity = settings.opacity;
    }

    if (typeof settings.isEnabled === "boolean") {
      validated.isEnabled = settings.isEnabled;
    }

    if (
      typeof settings.shortcutKey === "string" &&
      settings.shortcutKey.trim()
    ) {
      validated.shortcutKey = settings.shortcutKey.trim();
    }

    if (typeof settings.lastUsed === "number" && settings.lastUsed > 0) {
      validated.lastUsed = settings.lastUsed;
    }

    if (typeof settings.version === "string" && settings.version.trim()) {
      validated.version = settings.version.trim();
    }

    return validated;
  }

  async updateSetting(key, value) {
    if (!this.defaultSettings.hasOwnProperty(key)) {
      return false;
    }

    const newSettings = {
      ...this.currentSettings,
      [key]: value,
      lastUsed: Date.now(),
    };

    return await this.saveSettings(newSettings);
  }

  getCurrentSettings() {
    return { ...this.currentSettings };
  }

  getSetting(key, defaultValue = null) {
    if (this.currentSettings.hasOwnProperty(key)) {
      return this.currentSettings[key];
    }
    if (this.defaultSettings.hasOwnProperty(key)) {
      return this.defaultSettings[key];
    }
    return defaultValue;
  }

  async resetSettings() {
    const defaultSettings = this.initializeSettings();
    return await this.saveSettings(defaultSettings);
  }

  validateCurrentSettings() {
    const issues = [];
    const settings = this.currentSettings;

    if (settings.opacity < 0 || settings.opacity > 0.9) {
      issues.push(`Opacity out of range: ${settings.opacity}`);
    }

    const requiredFields = ["opacity", "isEnabled", "shortcutKey"];
    requiredFields.forEach((field) => {
      if (settings[field] === undefined || settings[field] === null) {
        issues.push(`Missing required field: ${field}`);
      }
    });

    if (typeof settings.opacity !== "number") {
      issues.push(`Invalid opacity type: ${typeof settings.opacity}`);
    }

    if (typeof settings.isEnabled !== "boolean") {
      issues.push(`Invalid isEnabled type: ${typeof settings.isEnabled}`);
    }

    if (typeof settings.shortcutKey !== "string") {
      issues.push(`Invalid shortcutKey type: ${typeof settings.shortcutKey}`);
    }

    return {
      isValid: issues.length === 0,
      issues,
      settings: { ...settings },
    };
  }

  async repairSettings() {
    const validation = this.validateCurrentSettings();

    if (validation.isValid) {
      return true;
    }

    const repairedSettings = this.validateSettings(this.currentSettings);
    return await this.saveSettings(repairedSettings);
  }
}

// Test Suite
class SettingsTestRunner {
  constructor() {
    this.passedTests = 0;
    this.totalTests = 0;
    this.settingsManager = null;
  }

  log(message, isError = false) {
    const timestamp = new Date().toISOString();
    const prefix = isError ? "❌ ERROR" : "✅ INFO";
    console.log(`[${timestamp}] ${prefix}: ${message}`);
  }

  async runTest(testName, testFunction) {
    this.totalTests++;
    try {
      console.log(`\n🧪 Running test: ${testName}`);
      const result = await testFunction.call(this);
      if (result) {
        this.passedTests++;
        this.log(`Test passed: ${testName}`);
      } else {
        this.log(`Test failed: ${testName}`, true);
      }
      return result;
    } catch (error) {
      this.log(`Test error in ${testName}: ${error.message}`, true);
      return false;
    }
  }

  async testInitializeSettings() {
    this.settingsManager = new SettingsManager();
    const initialSettings = this.settingsManager.initializeSettings();

    const requiredFields = [
      "opacity",
      "isEnabled",
      "shortcutKey",
      "lastUsed",
      "version",
    ];
    const missingFields = requiredFields.filter(
      (field) => !(field in initialSettings)
    );

    if (missingFields.length > 0) {
      this.log(`Missing required fields: ${missingFields.join(", ")}`, true);
      return false;
    }

    if (initialSettings.opacity !== 0.7) {
      this.log(`Invalid default opacity: ${initialSettings.opacity}`, true);
      return false;
    }

    if (initialSettings.isEnabled !== false) {
      this.log(`Invalid default isEnabled: ${initialSettings.isEnabled}`, true);
      return false;
    }

    if (
      typeof initialSettings.lastUsed !== "number" ||
      initialSettings.lastUsed <= 0
    ) {
      this.log(`Invalid lastUsed: ${initialSettings.lastUsed}`, true);
      return false;
    }

    this.log("Settings initialization successful");
    return true;
  }

  async testSaveSettings() {
    if (!this.settingsManager) {
      this.settingsManager = new SettingsManager();
    }

    const testSettings = {
      opacity: 0.8,
      isEnabled: true,
      shortcutKey: "Ctrl+Alt+T",
      lastUsed: Date.now(),
      version: "1.0.0",
    };

    const saveResult = await this.settingsManager.saveSettings(testSettings);
    if (!saveResult) {
      this.log("Settings save failed", true);
      return false;
    }

    const storedData = await chrome.storage.sync.get(["theaterModeSettings"]);
    const storedSettings = storedData.theaterModeSettings;

    if (!storedSettings) {
      this.log("Settings not found in storage", true);
      return false;
    }

    for (const [key, value] of Object.entries(testSettings)) {
      if (storedSettings[key] !== value) {
        this.log(
          `Stored setting mismatch: ${key} = ${storedSettings[key]} (expected: ${value})`,
          true
        );
        return false;
      }
    }

    this.log("Settings save successful");
    return true;
  }

  async testLoadSettings() {
    const testSettings = {
      opacity: 0.6,
      isEnabled: false,
      shortcutKey: "Ctrl+Shift+Y",
      lastUsed: Date.now() - 1000,
      version: "1.0.0",
    };

    await chrome.storage.sync.set({ theaterModeSettings: testSettings });

    const newSettingsManager = new SettingsManager();
    const loadedSettings = await newSettingsManager.loadSettings();

    for (const [key, value] of Object.entries(testSettings)) {
      if (loadedSettings[key] !== value) {
        this.log(
          `Loaded setting mismatch: ${key} = ${loadedSettings[key]} (expected: ${value})`,
          true
        );
        return false;
      }
    }

    this.log("Settings load successful");
    return true;
  }

  async testValidateSettings() {
    if (!this.settingsManager) {
      this.settingsManager = new SettingsManager();
    }

    // Test valid settings
    const validSettings = {
      opacity: 0.5,
      isEnabled: true,
      shortcutKey: "Ctrl+Shift+T",
      lastUsed: Date.now(),
      version: "1.0.0",
    };

    const validatedValid = this.settingsManager.validateSettings(validSettings);
    if (JSON.stringify(validatedValid) !== JSON.stringify(validSettings)) {
      this.log("Valid settings validation failed", true);
      return false;
    }

    // Test invalid settings
    const invalidSettings = {
      opacity: 1.5, // out of range
      isEnabled: "true", // wrong type
      shortcutKey: "", // empty
      lastUsed: "invalid", // wrong type
      version: null, // null
    };

    const validatedInvalid =
      this.settingsManager.validateSettings(invalidSettings);

    if (validatedInvalid.opacity !== 0.7) {
      this.log("Invalid opacity not corrected to default", true);
      return false;
    }

    if (validatedInvalid.isEnabled !== false) {
      this.log("Invalid isEnabled not corrected to default", true);
      return false;
    }

    this.log("Settings validation successful");
    return true;
  }

  async testUpdateSetting() {
    if (!this.settingsManager) {
      this.settingsManager = new SettingsManager();
      await this.settingsManager.loadSettings();
    }

    const newOpacity = 0.8;
    const updateResult = await this.settingsManager.updateSetting(
      "opacity",
      newOpacity
    );

    if (!updateResult) {
      this.log("Setting update failed", true);
      return false;
    }

    const updatedOpacity = this.settingsManager.getSetting("opacity");
    if (updatedOpacity !== newOpacity) {
      this.log(
        `Setting not updated correctly: ${updatedOpacity} (expected: ${newOpacity})`,
        true
      );
      return false;
    }

    // Test invalid key
    const invalidUpdateResult = await this.settingsManager.updateSetting(
      "invalidKey",
      "value"
    );
    if (invalidUpdateResult) {
      this.log("Invalid key update should have failed", true);
      return false;
    }

    this.log("Setting update successful");
    return true;
  }

  async testValidateCurrentSettings() {
    if (!this.settingsManager) {
      this.settingsManager = new SettingsManager();
      await this.settingsManager.loadSettings();
    }

    // Test with valid settings
    const validation = this.settingsManager.validateCurrentSettings();
    if (!validation.isValid) {
      this.log(
        `Valid settings failed validation: ${validation.issues.join(", ")}`,
        true
      );
      return false;
    }

    // Test with broken settings
    this.settingsManager.currentSettings.opacity = 1.5; // out of range
    this.settingsManager.currentSettings.isEnabled = "invalid"; // wrong type

    const brokenValidation = this.settingsManager.validateCurrentSettings();
    if (brokenValidation.isValid) {
      this.log("Broken settings passed validation", true);
      return false;
    }

    if (brokenValidation.issues.length === 0) {
      this.log("No issues detected in broken settings", true);
      return false;
    }

    this.log("Current settings validation successful");
    return true;
  }

  async testRepairSettings() {
    if (!this.settingsManager) {
      this.settingsManager = new SettingsManager();
      await this.settingsManager.loadSettings();
    }

    // Break settings intentionally
    this.settingsManager.currentSettings.opacity = -0.5; // out of range
    this.settingsManager.currentSettings.isEnabled = null; // null
    this.settingsManager.currentSettings.shortcutKey = ""; // empty

    const preRepairValidation = this.settingsManager.validateCurrentSettings();
    if (preRepairValidation.isValid) {
      this.log("Broken settings reported as valid", true);
      return false;
    }

    const repairResult = await this.settingsManager.repairSettings();
    if (!repairResult) {
      this.log("Settings repair failed", true);
      return false;
    }

    const postRepairValidation = this.settingsManager.validateCurrentSettings();
    if (!postRepairValidation.isValid) {
      this.log(
        `Settings still invalid after repair: ${postRepairValidation.issues.join(
          ", "
        )}`,
        true
      );
      return false;
    }

    this.log("Settings repair successful");
    return true;
  }

  async runAllTests() {
    console.log("🚀 Starting Settings Management Tests...\n");

    const tests = [
      ["Initialize Settings", this.testInitializeSettings],
      ["Save Settings", this.testSaveSettings],
      ["Load Settings", this.testLoadSettings],
      ["Validate Settings", this.testValidateSettings],
      ["Update Setting", this.testUpdateSetting],
      ["Validate Current Settings", this.testValidateCurrentSettings],
      ["Repair Settings", this.testRepairSettings],
    ];

    for (const [testName, testFunction] of tests) {
      await this.runTest(testName, testFunction);
    }

    console.log("\n📊 Test Results Summary:");
    console.log(`✅ Passed: ${this.passedTests}`);
    console.log(`❌ Failed: ${this.totalTests - this.passedTests}`);
    console.log(`📈 Total: ${this.totalTests}`);
    console.log(
      `🎯 Success Rate: ${((this.passedTests / this.totalTests) * 100).toFixed(
        1
      )}%`
    );

    if (this.passedTests === this.totalTests) {
      console.log(
        "\n🎉 All tests passed! Settings management system is working correctly."
      );
      return true;
    } else {
      console.log("\n⚠️  Some tests failed. Please check the implementation.");
      return false;
    }
  }
}

// Run tests
async function main() {
  const testRunner = new SettingsTestRunner();
  const success = await testRunner.runAllTests();
  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Test runner error:", error);
    process.exit(1);
  });
}

module.exports = { SettingsManager, SettingsTestRunner };
