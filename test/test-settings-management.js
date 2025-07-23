/**
 * Settings Management Tests for YouTube Theater Mode
 * Chrome Storage API を使用した設定保存機能のテスト
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
        Object.assign(this.data, items);
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

// Settings Manager Class (copied from content.js for testing)
class SettingsManager {
  constructor() {
    // デフォルト設定
    this.defaultSettings = {
      opacity: 0.7, // デフォルト透明度 70%
      isEnabled: false, // 初期状態は無効
      shortcutKey: "Ctrl+Shift+T", // デフォルトショートカット
      lastUsed: null, // 最終使用時刻
      version: "1.0.0", // 設定バージョン
    };

    this.currentSettings = { ...this.defaultSettings };
    this.settingsKey = "theaterModeSettings";
    this.isLoading = false;
    this.loadPromise = null;
  }

  /**
   * 設定データの構造を定義・初期化
   * @returns {Object} 初期化された設定オブジェクト
   */
  initializeSettings() {
    console.log("YouTube Theater Mode: Initializing settings structure");

    const settings = {
      ...this.defaultSettings,
      lastUsed: Date.now(),
    };

    return this.validateSettings(settings);
  }

  /**
   * Chrome Storage API を使用した設定保存
   * @param {Object} settings - 保存する設定オブジェクト
   * @returns {Promise<boolean>} 保存成功時true
   */
  async saveSettings(settings) {
    try {
      console.log("YouTube Theater Mode: Saving settings", settings);

      // 設定データをバリデーション
      const validatedSettings = this.validateSettings(settings);

      // Chrome Storage API で保存
      if (
        typeof chrome !== "undefined" &&
        chrome.storage &&
        chrome.storage.sync
      ) {
        await chrome.storage.sync.set({
          [this.settingsKey]: validatedSettings,
        });
      } else {
        // フォールバック: localStorage を使用
        console.warn(
          "YouTube Theater Mode: Chrome Storage API not available, using localStorage"
        );
        localStorage.setItem(
          this.settingsKey,
          JSON.stringify(validatedSettings)
        );
      }

      // 現在の設定を更新
      this.currentSettings = { ...validatedSettings };

      console.log("YouTube Theater Mode: Settings saved successfully");
      return true;
    } catch (error) {
      console.error("YouTube Theater Mode: Error saving settings:", error);
      return false;
    }
  }

  /**
   * Chrome Storage API を使用した設定読み込み
   * @returns {Promise<Object>} 読み込まれた設定オブジェクト
   */
  async loadSettings() {
    // 既に読み込み中の場合は同じPromiseを返す
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

  /**
   * 実際の設定読み込み処理
   * @private
   * @returns {Promise<Object>} 読み込まれた設定オブジェクト
   */
  async _performLoadSettings() {
    try {
      console.log("YouTube Theater Mode: Loading settings");

      let storedSettings = null;

      // Chrome Storage API から読み込み
      if (
        typeof chrome !== "undefined" &&
        chrome.storage &&
        chrome.storage.sync
      ) {
        const result = await chrome.storage.sync.get([this.settingsKey]);
        storedSettings = result[this.settingsKey];
      } else {
        // フォールバック: localStorage から読み込み
        console.warn(
          "YouTube Theater Mode: Chrome Storage API not available, using localStorage"
        );
        const stored = localStorage.getItem(this.settingsKey);
        if (stored) {
          storedSettings = JSON.parse(stored);
        }
      }

      let settings;
      if (storedSettings) {
        // 保存された設定をデフォルト設定とマージ
        settings = {
          ...this.defaultSettings,
          ...storedSettings,
        };
        console.log(
          "YouTube Theater Mode: Settings loaded from storage",
          settings
        );
      } else {
        // 初回起動時はデフォルト設定を使用
        settings = this.initializeSettings();
        console.log("YouTube Theater Mode: Using default settings (first run)");

        // デフォルト設定を保存
        await this.saveSettings(settings);
      }

      // 設定をバリデーション
      const validatedSettings = this.validateSettings(settings);
      this.currentSettings = { ...validatedSettings };

      console.log(
        "YouTube Theater Mode: Settings loaded successfully",
        validatedSettings
      );
      return validatedSettings;
    } catch (error) {
      console.error("YouTube Theater Mode: Error loading settings:", error);

      // エラー時はデフォルト設定を返す
      const defaultSettings = this.initializeSettings();
      this.currentSettings = { ...defaultSettings };

      console.warn(
        "YouTube Theater Mode: Using default settings due to load error"
      );
      return defaultSettings;
    }
  }

  /**
   * 設定データのバリデーション
   * @param {Object} settings - バリデーション対象の設定オブジェクト
   * @returns {Object} バリデーション済み設定オブジェクト
   */
  validateSettings(settings) {
    if (!settings || typeof settings !== "object") {
      console.warn(
        "YouTube Theater Mode: Invalid settings object, using defaults"
      );
      return { ...this.defaultSettings };
    }

    const validated = { ...this.defaultSettings };

    // 透明度のバリデーション (0-90%)
    if (
      typeof settings.opacity === "number" &&
      settings.opacity >= 0 &&
      settings.opacity <= 0.9
    ) {
      validated.opacity = settings.opacity;
    } else if (settings.opacity !== undefined) {
      console.warn(
        `YouTube Theater Mode: Invalid opacity value: ${settings.opacity}, using default`
      );
    }

    // 有効状態のバリデーション
    if (typeof settings.isEnabled === "boolean") {
      validated.isEnabled = settings.isEnabled;
    } else if (settings.isEnabled !== undefined) {
      console.warn(
        `YouTube Theater Mode: Invalid isEnabled value: ${settings.isEnabled}, using default`
      );
    }

    // ショートカットキーのバリデーション
    if (
      typeof settings.shortcutKey === "string" &&
      settings.shortcutKey.trim()
    ) {
      validated.shortcutKey = settings.shortcutKey.trim();
    } else if (settings.shortcutKey !== undefined) {
      console.warn(
        `YouTube Theater Mode: Invalid shortcutKey value: ${settings.shortcutKey}, using default`
      );
    }

    // 最終使用時刻のバリデーション
    if (typeof settings.lastUsed === "number" && settings.lastUsed > 0) {
      validated.lastUsed = settings.lastUsed;
    } else if (settings.lastUsed !== undefined && settings.lastUsed !== null) {
      console.warn(
        `YouTube Theater Mode: Invalid lastUsed value: ${settings.lastUsed}, using default`
      );
    }

    // バージョンのバリデーション
    if (typeof settings.version === "string" && settings.version.trim()) {
      validated.version = settings.version.trim();
    } else if (settings.version !== undefined) {
      console.warn(
        `YouTube Theater Mode: Invalid version value: ${settings.version}, using default`
      );
    }

    return validated;
  }

  /**
   * 特定の設定値を更新
   * @param {string} key - 設定キー
   * @param {*} value - 設定値
   * @returns {Promise<boolean>} 更新成功時true
   */
  async updateSetting(key, value) {
    if (!this.defaultSettings.hasOwnProperty(key)) {
      console.error(`YouTube Theater Mode: Unknown setting key: ${key}`);
      return false;
    }

    const newSettings = {
      ...this.currentSettings,
      [key]: value,
      lastUsed: Date.now(),
    };

    return await this.saveSettings(newSettings);
  }

  /**
   * 現在の設定を取得
   * @returns {Object} 現在の設定オブジェクト
   */
  getCurrentSettings() {
    return { ...this.currentSettings };
  }

  /**
   * 特定の設定値を取得
   * @param {string} key - 設定キー
   * @param {*} defaultValue - デフォルト値
   * @returns {*} 設定値
   */
  getSetting(key, defaultValue = null) {
    if (this.currentSettings.hasOwnProperty(key)) {
      return this.currentSettings[key];
    }

    if (this.defaultSettings.hasOwnProperty(key)) {
      return this.defaultSettings[key];
    }

    return defaultValue;
  }

  /**
   * 設定をデフォルトにリセット
   * @returns {Promise<boolean>} リセット成功時true
   */
  async resetSettings() {
    console.log("YouTube Theater Mode: Resetting settings to defaults");

    const defaultSettings = this.initializeSettings();
    const success = await this.saveSettings(defaultSettings);

    if (success) {
      console.log("YouTube Theater Mode: Settings reset successfully");
    }

    return success;
  }

  /**
   * 設定の整合性をチェック
   * @returns {Object} チェック結果
   */
  validateCurrentSettings() {
    const issues = [];
    const settings = this.currentSettings;

    // 透明度の範囲チェック
    if (settings.opacity < 0 || settings.opacity > 0.9) {
      issues.push(`Opacity out of range: ${settings.opacity}`);
    }

    // 必須フィールドの存在チェック
    const requiredFields = ["opacity", "isEnabled", "shortcutKey"];
    requiredFields.forEach((field) => {
      if (settings[field] === undefined || settings[field] === null) {
        issues.push(`Missing required field: ${field}`);
      }
    });

    // データ型チェック
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

  /**
   * 設定の破損を修復
   * @returns {Promise<boolean>} 修復成功時true
   */
  async repairSettings() {
    console.log("YouTube Theater Mode: Repairing settings");

    const validation = this.validateCurrentSettings();

    if (validation.isValid) {
      console.log("YouTube Theater Mode: Settings are already valid");
      return true;
    }

    console.warn(
      "YouTube Theater Mode: Settings issues detected:",
      validation.issues
    );

    // 破損した設定を修復
    const repairedSettings = this.validateSettings(this.currentSettings);
    const success = await this.saveSettings(repairedSettings);

    if (success) {
      console.log("YouTube Theater Mode: Settings repaired successfully");
    } else {
      console.error("YouTube Theater Mode: Failed to repair settings");
    }

    return success;
  }
}

// Test Suite
class SettingsManagerTestSuite {
  constructor() {
    this.settingsManager = null;
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

  // 設定データ構造の定義と初期化テスト
  async testInitializeSettings() {
    try {
      this.settingsManager = new SettingsManager();
      const initialSettings = this.settingsManager.initializeSettings();

      // 必須フィールドの存在確認
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
        this.displayResult(
          "設定初期化テスト",
          false,
          `必須フィールドが不足: ${missingFields.join(", ")}`
        );
        return false;
      }

      // デフォルト値の確認
      const expectedDefaults = {
        opacity: 0.7,
        isEnabled: false,
        shortcutKey: "Ctrl+Shift+T",
        version: "1.0.0",
      };

      for (const [key, expectedValue] of Object.entries(expectedDefaults)) {
        if (initialSettings[key] !== expectedValue) {
          this.displayResult(
            "設定初期化テスト",
            false,
            `デフォルト値が不正: ${key} = ${initialSettings[key]} (期待値: ${expectedValue})`
          );
          return false;
        }
      }

      // lastUsedが適切に設定されているか確認
      if (
        typeof initialSettings.lastUsed !== "number" ||
        initialSettings.lastUsed <= 0
      ) {
        this.displayResult(
          "設定初期化テスト",
          false,
          "lastUsedが適切に設定されていません"
        );
        return false;
      }

      this.displayResult(
        "設定初期化テスト",
        true,
        "全ての必須フィールドとデフォルト値が正しく設定されました",
        initialSettings
      );
      return true;
    } catch (error) {
      this.displayResult("設定初期化テスト", false, `エラー: ${error.message}`);
      return false;
    }
  }

  // Chrome Storage API を使用した設定保存テスト
  async testSaveSettings() {
    try {
      if (!this.settingsManager) {
        this.settingsManager = new SettingsManager();
      }

      // テスト用設定データ
      const testSettings = {
        opacity: 0.8,
        isEnabled: true,
        shortcutKey: "Ctrl+Alt+T",
        lastUsed: Date.now(),
        version: "1.0.0",
      };

      // 設定保存
      const saveResult = await this.settingsManager.saveSettings(testSettings);

      if (!saveResult) {
        this.displayResult("設定保存テスト", false, "設定保存が失敗しました");
        return false;
      }

      // Chrome Storage から直接確認
      const storedData = await chrome.storage.sync.get(["theaterModeSettings"]);
      const storedSettings = storedData.theaterModeSettings;

      if (!storedSettings) {
        this.displayResult(
          "設定保存テスト",
          false,
          "Chrome Storageに設定が保存されていません"
        );
        return false;
      }

      // 保存された設定の確認
      for (const [key, value] of Object.entries(testSettings)) {
        if (storedSettings[key] !== value) {
          this.displayResult(
            "設定保存テスト",
            false,
            `保存された設定が不正: ${key} = ${storedSettings[key]} (期待値: ${value})`
          );
          return false;
        }
      }

      this.displayResult(
        "設定保存テスト",
        true,
        "Chrome Storage APIを使用した設定保存が成功しました",
        storedSettings
      );
      return true;
    } catch (error) {
      this.displayResult("設定保存テスト", false, `エラー: ${error.message}`);
      return false;
    }
  }

  // Chrome Storage API を使用した設定読み込みテスト
  async testLoadSettings() {
    try {
      if (!this.settingsManager) {
        this.settingsManager = new SettingsManager();
      }

      // 事前にテスト設定を保存
      const testSettings = {
        opacity: 0.6,
        isEnabled: false,
        shortcutKey: "Ctrl+Shift+Y",
        lastUsed: Date.now() - 1000,
        version: "1.0.0",
      };

      await chrome.storage.sync.set({ theaterModeSettings: testSettings });

      // 新しいSettingsManagerインスタンスで読み込みテスト
      const newSettingsManager = new SettingsManager();
      const loadedSettings = await newSettingsManager.loadSettings();

      // 読み込まれた設定の確認
      for (const [key, value] of Object.entries(testSettings)) {
        if (loadedSettings[key] !== value) {
          this.displayResult(
            "設定読み込みテスト",
            false,
            `読み込まれた設定が不正: ${key} = ${loadedSettings[key]} (期待値: ${value})`
          );
          return false;
        }
      }

      // 現在の設定が更新されているか確認
      const currentSettings = newSettingsManager.getCurrentSettings();
      if (JSON.stringify(currentSettings) !== JSON.stringify(loadedSettings)) {
        this.displayResult(
          "設定読み込みテスト",
          false,
          "現在の設定が適切に更新されていません"
        );
        return false;
      }

      this.displayResult(
        "設定読み込みテスト",
        true,
        "Chrome Storage APIからの設定読み込みが成功しました",
        loadedSettings
      );
      return true;
    } catch (error) {
      this.displayResult(
        "設定読み込みテスト",
        false,
        `エラー: ${error.message}`
      );
      return false;
    }
  }

  // 設定データのバリデーションテスト
  async testValidateSettings() {
    try {
      if (!this.settingsManager) {
        this.settingsManager = new SettingsManager();
      }

      // 有効な設定のテスト
      const validSettings = {
        opacity: 0.5,
        isEnabled: true,
        shortcutKey: "Ctrl+Shift+T",
        lastUsed: Date.now(),
        version: "1.0.0",
      };

      const validatedValid =
        this.settingsManager.validateSettings(validSettings);
      if (JSON.stringify(validatedValid) !== JSON.stringify(validSettings)) {
        this.displayResult(
          "バリデーションテスト",
          false,
          "有効な設定のバリデーションが失敗しました"
        );
        return false;
      }

      // 無効な設定のテスト
      const invalidSettings = {
        opacity: 1.5, // 範囲外
        isEnabled: "true", // 型が不正
        shortcutKey: "", // 空文字
        lastUsed: "invalid", // 型が不正
        version: null, // null値
      };

      const validatedInvalid =
        this.settingsManager.validateSettings(invalidSettings);

      // デフォルト値に修正されているか確認
      if (validatedInvalid.opacity !== 0.7) {
        this.displayResult(
          "バリデーションテスト",
          false,
          "無効な透明度がデフォルト値に修正されていません"
        );
        return false;
      }

      if (validatedInvalid.isEnabled !== false) {
        this.displayResult(
          "バリデーションテスト",
          false,
          "無効なisEnabledがデフォルト値に修正されていません"
        );
        return false;
      }

      if (validatedInvalid.shortcutKey !== "Ctrl+Shift+T") {
        this.displayResult(
          "バリデーションテスト",
          false,
          "無効なshortcutKeyがデフォルト値に修正されていません"
        );
        return false;
      }

      // null設定のテスト
      const nullValidated = this.settingsManager.validateSettings(null);
      if (
        JSON.stringify(nullValidated) !==
        JSON.stringify(this.settingsManager.defaultSettings)
      ) {
        this.displayResult(
          "バリデーションテスト",
          false,
          "null設定がデフォルト設定に修正されていません"
        );
        return false;
      }

      this.displayResult(
        "バリデーションテスト",
        true,
        "設定データのバリデーション機能が正常に動作しています"
      );
      return true;
    } catch (error) {
      this.displayResult(
        "バリデーションテスト",
        false,
        `エラー: ${error.message}`
      );
      return false;
    }
  }

  // 特定設定値の更新テスト
  async testUpdateSetting() {
    try {
      if (!this.settingsManager) {
        this.settingsManager = new SettingsManager();
        await this.settingsManager.loadSettings();
      }

      // 透明度の更新テスト
      const originalOpacity = this.settingsManager.getSetting("opacity");
      const newOpacity = 0.8;

      const updateResult = await this.settingsManager.updateSetting(
        "opacity",
        newOpacity
      );
      if (!updateResult) {
        this.displayResult(
          "設定更新テスト",
          false,
          "透明度の更新が失敗しました"
        );
        return false;
      }

      const updatedOpacity = this.settingsManager.getSetting("opacity");
      if (updatedOpacity !== newOpacity) {
        this.displayResult(
          "設定更新テスト",
          false,
          `透明度が正しく更新されていません: ${updatedOpacity} (期待値: ${newOpacity})`
        );
        return false;
      }

      // 無効なキーの更新テスト
      const invalidUpdateResult = await this.settingsManager.updateSetting(
        "invalidKey",
        "value"
      );
      if (invalidUpdateResult) {
        this.displayResult(
          "設定更新テスト",
          false,
          "無効なキーでの更新が成功してしまいました"
        );
        return false;
      }

      // lastUsedが更新されているか確認
      const currentSettings = this.settingsManager.getCurrentSettings();
      if (
        !currentSettings.lastUsed ||
        typeof currentSettings.lastUsed !== "number"
      ) {
        this.displayResult(
          "設定更新テスト",
          false,
          "lastUsedが適切に更新されていません"
        );
        return false;
      }

      this.displayResult(
        "設定更新テスト",
        true,
        "特定設定値の更新機能が正常に動作しています"
      );
      return true;
    } catch (error) {
      this.displayResult("設定更新テスト", false, `エラー: ${error.message}`);
      return false;
    }
  }

  // 設定整合性チェックテスト
  async testValidateCurrentSettings() {
    try {
      if (!this.settingsManager) {
        this.settingsManager = new SettingsManager();
        await this.settingsManager.loadSettings();
      }

      // 正常な設定での整合性チェック
      const validation = this.settingsManager.validateCurrentSettings();
      if (!validation.isValid) {
        this.displayResult(
          "整合性チェックテスト",
          false,
          `正常な設定で整合性エラー: ${validation.issues.join(", ")}`
        );
        return false;
      }

      // 意図的に破損した設定を作成
      this.settingsManager.currentSettings.opacity = 1.5; // 範囲外
      this.settingsManager.currentSettings.isEnabled = "invalid"; // 型不正

      const brokenValidation = this.settingsManager.validateCurrentSettings();
      if (brokenValidation.isValid) {
        this.displayResult(
          "整合性チェックテスト",
          false,
          "破損した設定で整合性チェックが通ってしまいました"
        );
        return false;
      }

      if (brokenValidation.issues.length === 0) {
        this.displayResult(
          "整合性チェックテスト",
          false,
          "破損した設定で問題が検出されませんでした"
        );
        return false;
      }

      this.displayResult(
        "整合性チェックテスト",
        true,
        "設定整合性チェック機能が正常に動作しています",
        {
          issues: brokenValidation.issues,
        }
      );
      return true;
    } catch (error) {
      this.displayResult(
        "整合性チェックテスト",
        false,
        `エラー: ${error.message}`
      );
      return false;
    }
  }

  // 設定修復テスト
  async testRepairSettings() {
    try {
      if (!this.settingsManager) {
        this.settingsManager = new SettingsManager();
        await this.settingsManager.loadSettings();
      }

      // 意図的に設定を破損
      this.settingsManager.currentSettings.opacity = -0.5; // 範囲外
      this.settingsManager.currentSettings.isEnabled = null; // null値
      this.settingsManager.currentSettings.shortcutKey = ""; // 空文字

      // 修復前の状態確認
      const preRepairValidation =
        this.settingsManager.validateCurrentSettings();
      if (preRepairValidation.isValid) {
        this.displayResult(
          "設定修復テスト",
          false,
          "破損した設定が正常と判定されました"
        );
        return false;
      }

      // 設定修復実行
      const repairResult = await this.settingsManager.repairSettings();
      if (!repairResult) {
        this.displayResult("設定修復テスト", false, "設定修復が失敗しました");
        return false;
      }

      // 修復後の状態確認
      const postRepairValidation =
        this.settingsManager.validateCurrentSettings();
      if (!postRepairValidation.isValid) {
        this.displayResult(
          "設定修復テスト",
          false,
          `修復後も設定に問題があります: ${postRepairValidation.issues.join(
            ", "
          )}`
        );
        return false;
      }

      // 修復された値の確認
      const repairedSettings = this.settingsManager.getCurrentSettings();
      if (repairedSettings.opacity < 0 || repairedSettings.opacity > 0.9) {
        this.displayResult(
          "設定修復テスト",
          false,
          "透明度が適切に修復されていません"
        );
        return false;
      }

      if (typeof repairedSettings.isEnabled !== "boolean") {
        this.displayResult(
          "設定修復テスト",
          false,
          "isEnabledが適切に修復されていません"
        );
        return false;
      }

      if (
        !repairedSettings.shortcutKey ||
        typeof repairedSettings.shortcutKey !== "string"
      ) {
        this.displayResult(
          "設定修復テスト",
          false,
          "shortcutKeyが適切に修復されていません"
        );
        return false;
      }

      this.displayResult(
        "設定修復テスト",
        true,
        "設定修復機能が正常に動作しています",
        repairedSettings
      );
      return true;
    } catch (error) {
      this.displayResult("設定修復テスト", false, `エラー: ${error.message}`);
      return false;
    }
  }

  // 全テスト実行
  async runAllTests() {
    console.log("Settings Management Tests - Starting all tests...");

    const tests = [
      "testInitializeSettings",
      "testSaveSettings",
      "testLoadSettings",
      "testValidateSettings",
      "testUpdateSetting",
      "testValidateCurrentSettings",
      "testRepairSettings",
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
      `Settings Management Tests - Completed: ${passedTests}/${totalTests} passed`
    );
  }
}

// Global test instance
let testSuite = new SettingsManagerTestSuite();

// UI Functions
async function runAllTests() {
  clearResults();
  await testSuite.runAllTests();
  await displayCurrentSettings();
}

function clearResults() {
  document.getElementById("test-results").innerHTML = "";
  testSuite.testResults = [];
}

async function resetSettings() {
  try {
    await chrome.storage.sync.clear();
    localStorage.removeItem("theaterModeSettings");

    const infoDiv = document.createElement("div");
    infoDiv.className = "test-result test-info";
    infoDiv.textContent = "設定がリセットされました";
    document.getElementById("test-results").appendChild(infoDiv);

    await displayCurrentSettings();
  } catch (error) {
    const errorDiv = document.createElement("div");
    errorDiv.className = "test-result test-fail";
    errorDiv.textContent = `設定リセットエラー: ${error.message}`;
    document.getElementById("test-results").appendChild(errorDiv);
  }
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

// Manual test functions
async function testSaveSettings() {
  await testSuite.testSaveSettings();
  await displayCurrentSettings();
}

async function testLoadSettings() {
  await testSuite.testLoadSettings();
  await displayCurrentSettings();
}

async function testValidation() {
  await testSuite.testValidateSettings();
}

async function testUpdateSetting() {
  await testSuite.testUpdateSetting();
  await displayCurrentSettings();
}

// Initialize display on page load
document.addEventListener("DOMContentLoaded", () => {
  displayCurrentSettings();
});
