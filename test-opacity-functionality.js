/**
 * Opacity Functionality Tests for YouTube Theater Mode
 * 透明度設定機能のテスト
 */

// Mock Chrome Storage API for testing
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

// Mock chrome object
if (typeof chrome === "undefined") {
  window.chrome = {
    storage: mockChromeStorage,
  };
}

// Mock DOM elements for testing
function createMockOverlayElement() {
  const overlay = document.createElement("div");
  overlay.className = "theater-mode-overlay";
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
  overlay.style.zIndex = "9999";
  overlay.style.pointerEvents = "none";
  return overlay;
}

// Settings Manager Class (simplified for testing)
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

// Simplified Theater Mode Controller for testing opacity functionality
class OpacityTestController {
  constructor() {
    this.currentOpacity = 0.7; // デフォルト透明度 70%
    this.overlayElement = null;
    this.settingsManager = new SettingsManager();
    this.stateChangeCallbacks = [];
  }

  async initialize() {
    const settings = await this.settingsManager.loadSettings();
    this.currentOpacity = settings.opacity;
    return settings;
  }

  // オーバーレイ透明度の動的変更機能
  async updateOpacity(opacity) {
    const previousOpacity = this.currentOpacity;

    // 透明度を0-90%に制限
    this.currentOpacity = Math.max(0, Math.min(0.9, opacity));

    // オーバーレイが存在する場合は即座に反映
    if (this.overlayElement) {
      this.overlayElement.style.backgroundColor = `rgba(0, 0, 0, ${this.currentOpacity})`;
      console.log(`Opacity updated to ${this.currentOpacity * 100}%`);
    }

    // 設定を保存
    try {
      await this.settingsManager.updateSetting("opacity", this.currentOpacity);
      console.log("Opacity setting saved");
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

  // デフォルト透明度（70%）の設定
  async setDefaultOpacity() {
    return await this.updateOpacity(0.7);
  }

  // オーバーレイを作成してテスト用に表示
  createTestOverlay() {
    if (this.overlayElement) {
      this.removeTestOverlay();
    }

    this.overlayElement = createMockOverlayElement();
    this.overlayElement.style.backgroundColor = `rgba(0, 0, 0, ${this.currentOpacity})`;

    // テスト用の表示内容を追加
    const content = document.createElement("div");
    content.style.color = "white";
    content.style.fontSize = "24px";
    content.style.textAlign = "center";
    content.style.padding = "20px";
    content.innerHTML = `
      <div>Theater Mode Test Overlay</div>
      <div style="font-size: 16px; margin-top: 10px;">
        透明度: ${Math.round(this.currentOpacity * 100)}%
      </div>
    `;

    this.overlayElement.appendChild(content);
    document.body.appendChild(this.overlayElement);

    return this.overlayElement;
  }

  // テスト用オーバーレイを削除
  removeTestOverlay() {
    if (this.overlayElement && this.overlayElement.parentNode) {
      this.overlayElement.parentNode.removeChild(this.overlayElement);
      this.overlayElement = null;
    }
  }

  // 現在の透明度を取得
  getCurrentOpacity() {
    return this.currentOpacity;
  }

  // 透明度設定から読み込み
  async loadOpacityFromSettings() {
    try {
      const settings = await this.settingsManager.loadSettings();
      const savedOpacity = settings.opacity;

      if (savedOpacity !== this.currentOpacity) {
        this.currentOpacity = savedOpacity;

        // 既にオーバーレイが適用されている場合は更新
        if (this.overlayElement) {
          this.overlayElement.style.backgroundColor = `rgba(0, 0, 0, ${this.currentOpacity})`;
        }

        console.log(`Opacity loaded from settings: ${savedOpacity * 100}%`);
      }

      return savedOpacity;
    } catch (error) {
      console.error("Error loading opacity from settings:", error);
      throw error;
    }
  }

  // 状態変更イベントを発火
  dispatchStateChangeEvent(eventType, eventData = {}) {
    const event = {
      type: eventType,
      timestamp: Date.now(),
      data: eventData,
    };

    console.log(`Opacity Test: State change event - ${eventType}`, event);

    // 登録されたコールバックを実行
    this.stateChangeCallbacks.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        console.error("Error in state change callback:", error);
      }
    });
  }

  // 状態変更コールバックを登録
  onStateChange(callback) {
    if (typeof callback !== "function") {
      throw new Error("Callback must be a function");
    }

    this.stateChangeCallbacks.push(callback);

    // コールバック削除用の関数を返す
    return () => {
      const index = this.stateChangeCallbacks.indexOf(callback);
      if (index > -1) {
        this.stateChangeCallbacks.splice(index, 1);
      }
    };
  }
}

// Test Suite for Opacity Functionality
class OpacityTestSuite {
  constructor() {
    this.opacityController = null;
    this.testResults = [];
  }

  // テスト結果を表示
  displayResult(testName, passed, message = "", details = null) {
    const result = {
      name: testName,
      passed: passed,
      message: message,
      details: details,
      timestamp: new Date().toLocaleTimeString(),
    };

    this.testResults.push(result);

    const resultsDiv = document.getElementById("test-results");
    const resultDiv = document.createElement("div");
    resultDiv.className = `test-result ${passed ? "test-pass" : "test-fail"}`;

    let content = `[${result.timestamp}] ${testName}: ${
      passed ? "PASS" : "FAIL"
    }`;
    if (message) {
      content += ` - ${message}`;
    }
    if (details) {
      content += `\n詳細: ${JSON.stringify(details, null, 2)}`;
    }

    resultDiv.textContent = content;
    resultsDiv.appendChild(resultDiv);

    console.log(`Test: ${testName} - ${passed ? "PASS" : "FAIL"}`, {
      message,
      details,
    });
  }

  // オーバーレイ透明度の動的変更機能テスト
  async testDynamicOpacityChange() {
    try {
      this.opacityController = new OpacityTestController();
      await this.opacityController.initialize();

      // 初期透明度の確認
      const initialOpacity = this.opacityController.getCurrentOpacity();
      if (initialOpacity !== 0.7) {
        this.displayResult(
          "動的透明度変更テスト",
          false,
          `初期透明度が不正: ${initialOpacity} (期待値: 0.7)`
        );
        return false;
      }

      // 透明度を50%に変更
      const changeResult1 = await this.opacityController.updateOpacity(0.5);
      if (!changeResult1) {
        this.displayResult(
          "動的透明度変更テスト",
          false,
          "透明度変更が失敗しました (50%)"
        );
        return false;
      }

      const newOpacity1 = this.opacityController.getCurrentOpacity();
      if (newOpacity1 !== 0.5) {
        this.displayResult(
          "動的透明度変更テスト",
          false,
          `透明度が正しく変更されていません: ${newOpacity1} (期待値: 0.5)`
        );
        return false;
      }

      // 透明度を90%に変更
      const changeResult2 = await this.opacityController.updateOpacity(0.9);
      if (!changeResult2) {
        this.displayResult(
          "動的透明度変更テスト",
          false,
          "透明度変更が失敗しました (90%)"
        );
        return false;
      }

      const newOpacity2 = this.opacityController.getCurrentOpacity();
      if (newOpacity2 !== 0.9) {
        this.displayResult(
          "動的透明度変更テスト",
          false,
          `透明度が正しく変更されていません: ${newOpacity2} (期待値: 0.9)`
        );
        return false;
      }

      // 範囲外の値のテスト（上限）
      await this.opacityController.updateOpacity(1.5);
      const clampedOpacity = this.opacityController.getCurrentOpacity();
      if (clampedOpacity !== 0.9) {
        this.displayResult(
          "動的透明度変更テスト",
          false,
          `透明度の上限制限が機能していません: ${clampedOpacity} (期待値: 0.9)`
        );
        return false;
      }

      // 範囲外の値のテスト（下限）
      await this.opacityController.updateOpacity(-0.5);
      const clampedOpacity2 = this.opacityController.getCurrentOpacity();
      if (clampedOpacity2 !== 0) {
        this.displayResult(
          "動的透明度変更テスト",
          false,
          `透明度の下限制限が機能していません: ${clampedOpacity2} (期待値: 0)`
        );
        return false;
      }

      this.displayResult(
        "動的透明度変更テスト",
        true,
        "透明度の動的変更機能が正常に動作しています"
      );
      return true;
    } catch (error) {
      this.displayResult(
        "動的透明度変更テスト",
        false,
        `エラー: ${error.message}`
      );
      return false;
    }
  }

  // 透明度設定の即座反映機能テスト
  async testImmediateReflection() {
    try {
      if (!this.opacityController) {
        this.opacityController = new OpacityTestController();
        await this.opacityController.initialize();
      }

      // テスト用オーバーレイを作成
      const overlay = this.opacityController.createTestOverlay();

      // 初期状態の確認
      const initialStyle = window.getComputedStyle(overlay);
      const initialBgColor = initialStyle.backgroundColor;

      // 透明度を変更
      await this.opacityController.updateOpacity(0.8);

      // スタイルが即座に反映されているか確認
      const updatedStyle = window.getComputedStyle(overlay);
      const updatedBgColor = updatedStyle.backgroundColor;

      if (initialBgColor === updatedBgColor) {
        this.displayResult(
          "即座反映テスト",
          false,
          "オーバーレイのスタイルが更新されていません"
        );
        return false;
      }

      // 期待される背景色を確認
      const expectedBgColor = "rgba(0, 0, 0, 0.8)";
      if (!updatedBgColor.includes("0.8")) {
        this.displayResult(
          "即座反映テスト",
          false,
          `背景色が期待値と異なります: ${updatedBgColor}`
        );
        return false;
      }

      // テスト用オーバーレイを削除
      this.opacityController.removeTestOverlay();

      this.displayResult(
        "即座反映テスト",
        true,
        "透明度変更の即座反映機能が正常に動作しています"
      );
      return true;
    } catch (error) {
      this.displayResult("即座反映テスト", false, `エラー: ${error.message}`);
      return false;
    }
  }

  // デフォルト透明度（70%）の設定テスト
  async testDefaultOpacity() {
    try {
      if (!this.opacityController) {
        this.opacityController = new OpacityTestController();
        await this.opacityController.initialize();
      }

      // 透明度を異なる値に設定
      await this.opacityController.updateOpacity(0.5);

      // デフォルト透明度に戻す
      const defaultResult = await this.opacityController.setDefaultOpacity();
      if (!defaultResult) {
        this.displayResult(
          "デフォルト透明度テスト",
          false,
          "デフォルト透明度の設定が失敗しました"
        );
        return false;
      }

      const currentOpacity = this.opacityController.getCurrentOpacity();
      if (currentOpacity !== 0.7) {
        this.displayResult(
          "デフォルト透明度テスト",
          false,
          `デフォルト透明度が正しく設定されていません: ${currentOpacity} (期待値: 0.7)`
        );
        return false;
      }

      // 設定が保存されているか確認
      const settings =
        this.opacityController.settingsManager.getCurrentSettings();
      if (settings.opacity !== 0.7) {
        this.displayResult(
          "デフォルト透明度テスト",
          false,
          `デフォルト透明度が設定に保存されていません: ${settings.opacity}`
        );
        return false;
      }

      this.displayResult(
        "デフォルト透明度テスト",
        true,
        "デフォルト透明度（70%）の設定が正常に動作しています"
      );
      return true;
    } catch (error) {
      this.displayResult(
        "デフォルト透明度テスト",
        false,
        `エラー: ${error.message}`
      );
      return false;
    }
  }

  // 透明度変更機能のテストケース作成
  async testOpacityChangeTestCases() {
    try {
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
          this.displayResult(
            "透明度変更テストケース",
            false,
            `透明度 ${opacity} の設定が失敗: ${currentOpacity}`
          );
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
          this.displayResult(
            "透明度変更テストケース",
            false,
            `無効な透明度 ${testCase.input} の制限が失敗: ${currentOpacity} (期待値: ${testCase.expected})`
          );
          return false;
        }
      }

      this.displayResult(
        "透明度変更テストケース",
        true,
        "透明度変更の各種テストケースが正常に動作しています"
      );
      return true;
    } catch (error) {
      this.displayResult(
        "透明度変更テストケース",
        false,
        `エラー: ${error.message}`
      );
      return false;
    }
  }

  // 透明度設定の永続化テスト
  async testOpacityPersistence() {
    try {
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
        this.displayResult(
          "透明度永続化テスト",
          false,
          `透明度が永続化されていません: ${loadedOpacity} (期待値: ${testOpacity})`
        );
        return false;
      }

      // 設定から直接読み込みテスト
      const settingsOpacity = await controller2.loadOpacityFromSettings();
      if (Math.abs(settingsOpacity - testOpacity) > 0.001) {
        this.displayResult(
          "透明度永続化テスト",
          false,
          `設定からの透明度読み込みが失敗: ${settingsOpacity} (期待値: ${testOpacity})`
        );
        return false;
      }

      this.displayResult(
        "透明度永続化テスト",
        true,
        "透明度設定の永続化が正常に動作しています"
      );
      return true;
    } catch (error) {
      this.displayResult(
        "透明度永続化テスト",
        false,
        `エラー: ${error.message}`
      );
      return false;
    }
  }

  // 透明度バリデーション機能テスト
  async testOpacityValidation() {
    try {
      if (!this.opacityController) {
        this.opacityController = new OpacityTestController();
        await this.opacityController.initialize();
      }

      // 数値以外の値のテスト
      const invalidValues = [
        "0.5", // 文字列
        null, // null
        undefined, // undefined
        {}, // オブジェクト
        [], // 配列
        true, // boolean
        NaN, // NaN
      ];

      const initialOpacity = this.opacityController.getCurrentOpacity();

      for (const invalidValue of invalidValues) {
        try {
          await this.opacityController.updateOpacity(invalidValue);
          const currentOpacity = this.opacityController.getCurrentOpacity();

          // 無効な値の場合、透明度は変更されないか、適切にクランプされるべき
          if (
            typeof invalidValue === "string" &&
            !isNaN(parseFloat(invalidValue))
          ) {
            // 数値に変換可能な文字列の場合は変換されることを期待
            continue;
          } else {
            // その他の無効な値の場合は変更されないことを期待
            if (currentOpacity !== initialOpacity && !isNaN(currentOpacity)) {
              this.displayResult(
                "透明度バリデーションテスト",
                false,
                `無効な値 ${invalidValue} で透明度が変更されました: ${currentOpacity}`
              );
              return false;
            }
          }
        } catch (error) {
          // エラーが発生することも適切な動作
          console.log(
            `Expected error for invalid value ${invalidValue}:`,
            error.message
          );
        }
      }

      this.displayResult(
        "透明度バリデーションテスト",
        true,
        "透明度バリデーション機能が正常に動作しています"
      );
      return true;
    } catch (error) {
      this.displayResult(
        "透明度バリデーションテスト",
        false,
        `エラー: ${error.message}`
      );
      return false;
    }
  }

  // 全テスト実行
  async runAllTests() {
    console.log("Opacity Functionality Tests - Starting all tests...");

    const tests = [
      "testDynamicOpacityChange",
      "testImmediateReflection",
      "testDefaultOpacity",
      "testOpacityChangeTestCases",
      "testOpacityPersistence",
      "testOpacityValidation",
    ];

    let passedTests = 0;
    let totalTests = tests.length;

    for (const testName of tests) {
      try {
        const result = await this[testName]();
        if (result) {
          passedTests++;
        }
      } catch (error) {
        this.displayResult(
          testName,
          false,
          `テスト実行エラー: ${error.message}`
        );
      }
    }

    // 結果サマリー
    const summaryDiv = document.createElement("div");
    summaryDiv.className = `test-result ${
      passedTests === totalTests ? "test-pass" : "test-info"
    }`;
    summaryDiv.textContent = `テスト完了: ${passedTests}/${totalTests} 成功`;

    const resultsDiv = document.getElementById("test-results");
    resultsDiv.appendChild(summaryDiv);

    console.log(
      `Opacity Functionality Tests - Completed: ${passedTests}/${totalTests} passed`
    );
  }
}

// Global test instance
let opacityTestSuite = new OpacityTestSuite();
let demoController = new OpacityTestController();

// UI Functions
async function runAllOpacityTests() {
  clearResults();
  await opacityTestSuite.runAllTests();
  await displayCurrentSettings();
}

function clearResults() {
  document.getElementById("test-results").innerHTML = "";
  opacityTestSuite.testResults = [];
}

async function displayCurrentSettings() {
  try {
    const settingsManager = new SettingsManager();
    const settings = await settingsManager.loadSettings();

    const display = document.getElementById("current-settings");
    display.textContent = JSON.stringify(settings, null, 2);
  } catch (error) {
    const display = document.getElementById("current-settings");
    display.textContent = `設定読み込みエラー: ${error.message}`;
  }
}

// Demo functions
function updateDemoOpacity(value) {
  const opacity = value / 100;
  const overlay = document.getElementById("demo-overlay");
  const opacityValue = document.getElementById("demo-opacity-value");
  const currentOpacity = document.getElementById("current-opacity");

  overlay.style.backgroundColor = `rgba(0, 0, 0, ${opacity})`;
  opacityValue.textContent = `${value}%`;
  currentOpacity.textContent = `${value}%`;
}

async function testOpacityChange(percentage) {
  const opacity = percentage / 100;

  try {
    await demoController.initialize();
    await demoController.updateOpacity(opacity);

    // スライダーとデモを更新
    const slider = document.getElementById("opacity-slider");
    slider.value = percentage;
    updateDemoOpacity(percentage);

    // 結果を表示
    const infoDiv = document.createElement("div");
    infoDiv.className = "test-result test-info";
    infoDiv.textContent = `透明度を${percentage}%に設定しました`;
    document.getElementById("test-results").appendChild(infoDiv);

    await displayCurrentSettings();
  } catch (error) {
    const errorDiv = document.createElement("div");
    errorDiv.className = "test-result test-fail";
    errorDiv.textContent = `透明度設定エラー: ${error.message}`;
    document.getElementById("test-results").appendChild(errorDiv);
  }
}

async function resetToDefault() {
  await testOpacityChange(70);
}

// Manual test functions
async function testDynamicOpacityChange() {
  await opacityTestSuite.testDynamicOpacityChange();
  await displayCurrentSettings();
}

async function testOpacityPersistence() {
  await opacityTestSuite.testOpacityPersistence();
  await displayCurrentSettings();
}

async function testOpacityValidation() {
  await opacityTestSuite.testOpacityValidation();
}

async function testImmediateReflection() {
  await opacityTestSuite.testImmediateReflection();
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", async () => {
  await demoController.initialize();
  await displayCurrentSettings();

  // Set initial demo opacity
  const initialOpacity = demoController.getCurrentOpacity();
  const percentage = Math.round(initialOpacity * 100);
  document.getElementById("opacity-slider").value = percentage;
  updateDemoOpacity(percentage);
});
