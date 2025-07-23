#!/usr/bin/env node

/**
 * Node.js Test Runner for Opacity Functionality
 * 透明度設定機能のテスト実行
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

// Settings Manager Class
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
}

// Opacity Test Controller
class OpacityTestController {
  constructor() {
    this.currentOpacity = 0.7;
    this.overlayElement = null;
    this.settingsManager = new SettingsManager();
    this.stateChangeCallbacks = [];
  }

  async initialize() {
    const settings = await this.settingsManager.loadSettings();
    this.currentOpacity = settings.opacity;
    return settings;
  }

  async updateOpacity(opacity) {
    const previousOpacity = this.currentOpacity;

    // 透明度を0-90%に制限
    this.currentOpacity = Math.max(0, Math.min(0.9, opacity));

    // 設定を保存
    try {
      await this.settingsManager.updateSetting("opacity", this.currentOpacity);
    } catch (error) {
      console.error("Error saving opacity setting:", error);
      throw error;
    }

    // 透明度変更イベントを発火
    this.dispatchStateChangeEvent("opacityChanged", {
      previousOpacity,
      currentOpacity: this.currentOpacity,
    });

    return true;
  }

  async setDefaultOpacity() {
    return await this.updateOpacity(0.7);
  }

  getCurrentOpacity() {
    return this.currentOpacity;
  }

  async loadOpacityFromSettings() {
    try {
      const settings = await this.settingsManager.loadSettings();
      const savedOpacity = settings.opacity;

      if (savedOpacity !== this.currentOpacity) {
        this.currentOpacity = savedOpacity;
      }

      return savedOpacity;
    } catch (error) {
      console.error("Error loading opacity from settings:", error);
      throw error;
    }
  }

  dispatchStateChangeEvent(eventType, eventData = {}) {
    const event = {
      type: eventType,
      timestamp: Date.now(),
      data: eventData,
    };

    this.stateChangeCallbacks.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        console.error("Error in state change callback:", error);
      }
    });
  }

  onStateChange(callback) {
    if (typeof callback !== "function") {
      throw new Error("Callback must be a function");
    }

    this.stateChangeCallbacks.push(callback);

    return () => {
      const index = this.stateChangeCallbacks.indexOf(callback);
      if (index > -1) {
        this.stateChangeCallbacks.splice(index, 1);
      }
    };
  }
}

// Test Suite
class OpacityTestRunner {
  constructor() {
    this.passedTests = 0;
    this.totalTests = 0;
    this.opacityController = null;
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

  async testDynamicOpacityChange() {
    this.opacityController = new OpacityTestController();
    await this.opacityController.initialize();

    // 初期透明度の確認
    const initialOpacity = this.opacityController.getCurrentOpacity();
    if (initialOpacity !== 0.7) {
      this.log(
        `Invalid initial opacity: ${initialOpacity} (expected: 0.7)`,
        true
      );
      return false;
    }

    // 透明度を50%に変更
    const changeResult1 = await this.opacityController.updateOpacity(0.5);
    if (!changeResult1) {
      this.log("Opacity change failed (50%)", true);
      return false;
    }

    const newOpacity1 = this.opacityController.getCurrentOpacity();
    if (newOpacity1 !== 0.5) {
      this.log(
        `Opacity not changed correctly: ${newOpacity1} (expected: 0.5)`,
        true
      );
      return false;
    }

    // 透明度を90%に変更
    const changeResult2 = await this.opacityController.updateOpacity(0.9);
    if (!changeResult2) {
      this.log("Opacity change failed (90%)", true);
      return false;
    }

    const newOpacity2 = this.opacityController.getCurrentOpacity();
    if (newOpacity2 !== 0.9) {
      this.log(
        `Opacity not changed correctly: ${newOpacity2} (expected: 0.9)`,
        true
      );
      return false;
    }

    // 範囲外の値のテスト（上限）
    await this.opacityController.updateOpacity(1.5);
    const clampedOpacity = this.opacityController.getCurrentOpacity();
    if (clampedOpacity !== 0.9) {
      this.log(
        `Opacity upper limit not working: ${clampedOpacity} (expected: 0.9)`,
        true
      );
      return false;
    }

    // 範囲外の値のテスト（下限）
    await this.opacityController.updateOpacity(-0.5);
    const clampedOpacity2 = this.opacityController.getCurrentOpacity();
    if (clampedOpacity2 !== 0) {
      this.log(
        `Opacity lower limit not working: ${clampedOpacity2} (expected: 0)`,
        true
      );
      return false;
    }

    this.log("Dynamic opacity change functionality working correctly");
    return true;
  }

  async testDefaultOpacity() {
    if (!this.opacityController) {
      this.opacityController = new OpacityTestController();
      await this.opacityController.initialize();
    }

    // 透明度を異なる値に設定
    await this.opacityController.updateOpacity(0.5);

    // デフォルト透明度に戻す
    const defaultResult = await this.opacityController.setDefaultOpacity();
    if (!defaultResult) {
      this.log("Default opacity setting failed", true);
      return false;
    }

    const currentOpacity = this.opacityController.getCurrentOpacity();
    if (currentOpacity !== 0.7) {
      this.log(
        `Default opacity not set correctly: ${currentOpacity} (expected: 0.7)`,
        true
      );
      return false;
    }

    // 設定が保存されているか確認
    const settings =
      this.opacityController.settingsManager.getCurrentSettings();
    if (settings.opacity !== 0.7) {
      this.log(
        `Default opacity not saved in settings: ${settings.opacity}`,
        true
      );
      return false;
    }

    this.log("Default opacity (70%) setting working correctly");
    return true;
  }

  async testOpacityPersistence() {
    // 最初のコントローラーで透明度を設定
    const controller1 = new OpacityTestController();
    await controller1.initialize();

    const testOpacity = 0.6;
    await controller1.updateOpacity(testOpacity);

    // 新しいコントローラーで設定が読み込まれるか確認
    const controller2 = new OpacityTestController();
    await controller2.initialize();

    const loadedOpacity = controller2.getCurrentOpacity();
    if (Math.abs(loadedOpacity - testOpacity) > 0.001) {
      this.log(
        `Opacity not persisted: ${loadedOpacity} (expected: ${testOpacity})`,
        true
      );
      return false;
    }

    // 設定から直接読み込みテスト
    const settingsOpacity = await controller2.loadOpacityFromSettings();
    if (Math.abs(settingsOpacity - testOpacity) > 0.001) {
      this.log(
        `Opacity loading from settings failed: ${settingsOpacity} (expected: ${testOpacity})`,
        true
      );
      return false;
    }

    this.log("Opacity persistence working correctly");
    return true;
  }

  async testOpacityValidation() {
    if (!this.opacityController) {
      this.opacityController = new OpacityTestController();
      await this.opacityController.initialize();
    }

    // テストケース: 有効な透明度値
    const validOpacities = [0, 0.1, 0.3, 0.5, 0.7, 0.9];

    for (const opacity of validOpacities) {
      await this.opacityController.updateOpacity(opacity);
      const currentOpacity = this.opacityController.getCurrentOpacity();

      if (Math.abs(currentOpacity - opacity) > 0.001) {
        this.log(`Opacity ${opacity} setting failed: ${currentOpacity}`, true);
        return false;
      }
    }

    // テストケース: 無効な透明度値（範囲外）
    const invalidOpacities = [
      { input: -0.1, expected: 0 },
      { input: 1.0, expected: 0.9 },
      { input: 1.5, expected: 0.9 },
      { input: -1.0, expected: 0 },
    ];

    for (const testCase of invalidOpacities) {
      await this.opacityController.updateOpacity(testCase.input);
      const currentOpacity = this.opacityController.getCurrentOpacity();

      if (Math.abs(currentOpacity - testCase.expected) > 0.001) {
        this.log(
          `Invalid opacity ${testCase.input} clamping failed: ${currentOpacity} (expected: ${testCase.expected})`,
          true
        );
        return false;
      }
    }

    this.log("Opacity validation working correctly");
    return true;
  }

  async testImmediateReflection() {
    if (!this.opacityController) {
      this.opacityController = new OpacityTestController();
      await this.opacityController.initialize();
    }

    // 状態変更イベントのテスト
    let eventReceived = false;
    let eventData = null;

    const removeListener = this.opacityController.onStateChange((event) => {
      if (event.type === "opacityChanged") {
        eventReceived = true;
        eventData = event.data;
      }
    });

    // 透明度を変更
    await this.opacityController.updateOpacity(0.8);

    // イベントが発火されたか確認
    if (!eventReceived) {
      this.log("Opacity change event not fired", true);
      removeListener();
      return false;
    }

    if (!eventData || eventData.currentOpacity !== 0.8) {
      this.log(`Invalid event data: ${JSON.stringify(eventData)}`, true);
      removeListener();
      return false;
    }

    removeListener();
    this.log("Immediate reflection working correctly");
    return true;
  }

  async testOpacityChangeTestCases() {
    if (!this.opacityController) {
      this.opacityController = new OpacityTestController();
      await this.opacityController.initialize();
    }

    // エッジケースのテスト
    const edgeCases = [
      { input: 0, expected: 0, description: "minimum value" },
      { input: 0.9, expected: 0.9, description: "maximum value" },
      { input: 0.001, expected: 0.001, description: "very small value" },
      { input: 0.899, expected: 0.899, description: "near maximum value" },
    ];

    for (const testCase of edgeCases) {
      await this.opacityController.updateOpacity(testCase.input);
      const currentOpacity = this.opacityController.getCurrentOpacity();

      if (Math.abs(currentOpacity - testCase.expected) > 0.001) {
        this.log(
          `Edge case ${testCase.description} failed: ${currentOpacity} (expected: ${testCase.expected})`,
          true
        );
        return false;
      }
    }

    this.log("Opacity change test cases working correctly");
    return true;
  }

  async runAllTests() {
    console.log("🚀 Starting Opacity Functionality Tests...\n");

    const tests = [
      ["Dynamic Opacity Change", this.testDynamicOpacityChange],
      ["Default Opacity Setting", this.testDefaultOpacity],
      ["Opacity Persistence", this.testOpacityPersistence],
      ["Opacity Validation", this.testOpacityValidation],
      ["Immediate Reflection", this.testImmediateReflection],
      ["Opacity Change Test Cases", this.testOpacityChangeTestCases],
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
        "\n🎉 All tests passed! Opacity functionality is working correctly."
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
  const testRunner = new OpacityTestRunner();
  const success = await testRunner.runAllTests();
  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Test runner error:", error);
    process.exit(1);
  });
}

module.exports = { OpacityTestController, OpacityTestRunner };
