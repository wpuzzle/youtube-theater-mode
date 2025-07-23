/**
 * Settings Error Handling Tests for YouTube Theater Mode
 * 設定読み込みエラー対応のテスト
 */

// Mock Chrome Storage API for testing
const mockChromeStorage = {
  data: {},
  errorMode: false,
  corruptionMode: false,
  sync: {
    get: function (keys) {
      return new Promise((resolve, reject) => {
        if (this.errorMode) {
          reject(new Error("Simulated Chrome Storage API error"));
          return;
        }

        if (Array.isArray(keys)) {
          const result = {};
          keys.forEach((key) => {
            if (this.data.hasOwnProperty(key)) {
              result[key] = this.corruptionMode
                ? this.corruptData(this.data[key])
                : this.data[key];
            }
          });
          resolve(result);
        } else if (typeof keys === "string") {
          const result = {};
          if (this.data.hasOwnProperty(keys)) {
            result[keys] = this.corruptionMode
              ? this.corruptData(this.data[keys])
              : this.data[keys];
          }
          resolve(result);
        } else {
          resolve(
            this.corruptionMode ? this.corruptData(this.data) : this.data
          );
        }
      });
    },
    set: function (items) {
      return new Promise((resolve, reject) => {
        if (this.errorMode) {
          reject(new Error("Simulated Chrome Storage API error"));
          return;
        }
        Object.assign(this.data, items);
        resolve();
      });
    },
    clear: function () {
      return new Promise((resolve, reject) => {
        if (this.errorMode) {
          reject(new Error("Simulated Chrome Storage API error"));
          return;
        }
        this.data = {};
        resolve();
      });
    },
  },
  // Helper to simulate data corruption
  corruptData: function (data) {
    if (typeof data !== "object" || data === null) return data;

    const corrupted = { ...data };

    // Corrupt some fields
    if (corrupted.theaterModeSettings) {
      corrupted.theaterModeSettings = {
        ...corrupted.theaterModeSettings,
        opacity: "invalid", // Wrong type
        isEnabled: 123, // Wrong type
        shortcutKey: null, // Null value
        version: undefined, // Undefined value
      };
    }

    return corrupted;
  },
  // Enable/disable error simulation
  setErrorMode: function (mode) {
    this.errorMode = !!mode;
  },
  // Enable/disable corruption simulation
  setCorruptionMode: function (mode) {
    this.corruptionMode = !!mode;
  },
};

// Mock chrome object
if (typeof chrome === "undefined") {
  window.chrome = {
    storage: mockChromeStorage,
    runtime: {
      lastError: null,
    },
  };
}

// Import SettingsManager from content.js
// For testing purposes, we'll define a simplified version here
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
    this.retryCount = 0;
    this.maxRetries = 3;
    this.retryDelay = 500; // ms
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
        try {
          await chrome.storage.sync.set({
            [this.settingsKey]: validatedSettings,
          });
        } catch (storageError) {
          console.error(
            "YouTube Theater Mode: Chrome Storage API error:",
            storageError
          );

          // フォールバック: localStorage を使用
          localStorage.setItem(
            this.settingsKey,
            JSON.stringify(validatedSettings)
          );
          console.warn(
            "YouTube Theater Mode: Fallback to localStorage due to Chrome Storage API error"
          );
        }
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
      this.retryCount = 0;

      return await this._loadSettingsWithRetry();
    } catch (error) {
      console.error(
        "YouTube Theater Mode: Fatal error loading settings:",
        error
      );

      // エラー時はデフォルト設定を返す
      const defaultSettings = this.initializeSettings();
      this.currentSettings = { ...defaultSettings };

      console.warn(
        "YouTube Theater Mode: Using default settings due to fatal load error"
      );
      return defaultSettings;
    }
  }

  /**
   * リトライ機能付き設定読み込み
   * @private
   * @returns {Promise<Object>} 読み込まれた設定オブジェクト
   */
  async _loadSettingsWithRetry() {
    try {
      let storedSettings = null;

      // Chrome Storage API から読み込み
      if (
        typeof chrome !== "undefined" &&
        chrome.storage &&
        chrome.storage.sync
      ) {
        try {
          const result = await chrome.storage.sync.get([this.settingsKey]);
          storedSettings = result[this.settingsKey];
        } catch (storageError) {
          console.warn(
            "YouTube Theater Mode: Chrome Storage API error:",
            storageError
          );

          // リトライ回数をチェック
          if (this.retryCount < this.maxRetries) {
            this.retryCount++;
            console.log(
              `YouTube Theater Mode: Retrying settings load (${this.retryCount}/${this.maxRetries})...`
            );

            // 遅延を入れてリトライ
            await new Promise((resolve) =>
              setTimeout(resolve, this.retryDelay)
            );
            return this._loadSettingsWithRetry();
          }

          // リトライ失敗後、localStorage にフォールバック
          console.warn(
            "YouTube Theater Mode: Falling back to localStorage after retry failures"
          );
          const stored = localStorage.getItem(this.settingsKey);
          if (stored) {
            try {
              storedSettings = JSON.parse(stored);
            } catch (parseError) {
              console.error(
                "YouTube Theater Mode: Error parsing localStorage settings:",
                parseError
              );
            }
          }
        }
      } else {
        // フォールバック: localStorage から読み込み
        console.warn(
          "YouTube Theater Mode: Chrome Storage API not available, using localStorage"
        );
        const stored = localStorage.getItem(this.settingsKey);
        if (stored) {
          try {
            storedSettings = JSON.parse(stored);
          } catch (parseError) {
            console.error(
              "YouTube Theater Mode: Error parsing localStorage settings:",
              parseError
            );
          }
        }
      }

      // 設定データの整合性チェック
      if (storedSettings) {
        const validationResult = this._validateStoredSettings(storedSettings);

        if (!validationResult.isValid) {
          console.warn(
            "YouTube Theater Mode: Stored settings validation failed:",
            validationResult.issues
          );

          // 破損した設定を修復
          storedSettings = this._repairCorruptedSettings(
            storedSettings,
            validationResult
          );

          // 修復した設定を保存
          await this.saveSettings(storedSettings);
          console.log("YouTube Theater Mode: Repaired settings saved");
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
      console.error(
        "YouTube Theater Mode: Error in _loadSettingsWithRetry:",
        error
      );

      // リトライ回数をチェック
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        console.log(
          `YouTube Theater Mode: Retrying settings load (${this.retryCount}/${this.maxRetries})...`
        );

        // 遅延を入れてリトライ
        await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
        return this._loadSettingsWithRetry();
      }

      // 全てのリトライが失敗した場合はデフォルト設定を使用
      console.warn(
        "YouTube Theater Mode: All retries failed, using default settings"
      );
      const defaultSettings = this.initializeSettings();
      this.currentSettings = { ...defaultSettings };

      // デフォルト設定を保存して次回の読み込みに備える
      try {
        await this.saveSettings(defaultSettings);
        console.log(
          "YouTube Theater Mode: Default settings saved after load failure"
        );
      } catch (saveError) {
        console.error(
          "YouTube Theater Mode: Error saving default settings:",
          saveError
        );
      }

      return defaultSettings;
    }
  }

  /**
   * 保存された設定の整合性チェック
   * @private
   * @param {Object} settings - チェック対象の設定
   * @returns {Object} チェック結果
   */
  _validateStoredSettings(settings) {
    const issues = [];

    // 必須フィールドの存在チェック
    const requiredFields = ["opacity", "isEnabled", "shortcutKey", "version"];
    requiredFields.forEach((field) => {
      if (settings[field] === undefined || settings[field] === null) {
        issues.push(`Missing required field: ${field}`);
      }
    });

    // データ型チェック
    if (
      settings.opacity !== undefined &&
      typeof settings.opacity !== "number"
    ) {
      issues.push(`Invalid opacity type: ${typeof settings.opacity}`);
    }

    if (
      settings.isEnabled !== undefined &&
      typeof settings.isEnabled !== "boolean"
    ) {
      issues.push(`Invalid isEnabled type: ${typeof settings.isEnabled}`);
    }

    if (
      settings.shortcutKey !== undefined &&
      typeof settings.shortcutKey !== "string"
    ) {
      issues.push(`Invalid shortcutKey type: ${typeof settings.shortcutKey}`);
    }

    if (
      settings.version !== undefined &&
      typeof settings.version !== "string"
    ) {
      issues.push(`Invalid version type: ${typeof settings.version}`);
    }

    // 値の範囲チェック
    if (
      typeof settings.opacity === "number" &&
      (settings.opacity < 0 || settings.opacity > 0.9)
    ) {
      issues.push(`Opacity out of range: ${settings.opacity}`);
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }

  /**
   * 破損した設定を修復
   * @private
   * @param {Object} corruptedSettings - 破損した設定
   * @param {Object} validationResult - バリデーション結果
   * @returns {Object} 修復された設定
   */
  _repairCorruptedSettings(corruptedSettings, validationResult) {
    console.log("YouTube Theater Mode: Repairing corrupted settings");

    // デフォルト設定をベースに修復
    const repairedSettings = { ...this.defaultSettings };

    // 破損していない値は保持
    Object.keys(this.defaultSettings).forEach((key) => {
      // 型チェック
      const expectedType = typeof this.defaultSettings[key];
      const actualType = typeof corruptedSettings[key];

      // 値が存在し、型が一致する場合のみ値を保持
      if (
        corruptedSettings[key] !== undefined &&
        corruptedSettings[key] !== null &&
        actualType === expectedType
      ) {
        // 数値の場合は範囲チェックも行う
        if (key === "opacity") {
          if (corruptedSettings[key] >= 0 && corruptedSettings[key] <= 0.9) {
            repairedSettings[key] = corruptedSettings[key];
          }
        } else {
          repairedSettings[key] = corruptedSettings[key];
        }
      }
    });

    // 最終使用時刻を更新
    repairedSettings.lastUsed = Date.now();

    console.log("YouTube Theater Mode: Settings repaired", {
      before: corruptedSettings,
      after: repairedSettings,
      issues: validationResult.issues,
    });

    return repairedSettings;
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
class SettingsErrorHandlingTestSuite {
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

  // Chrome Storage APIエラー時のテスト
  async testStorageApiError() {
    try {
      // エラーモードを有効化
      chrome.storage.mockChromeStorage.setErrorMode(true);

      this.settingsManager = new SettingsManager();
      const settings = await this.settingsManager.loadSettings();

      // エラーモードを無効化
      chrome.storage.mockChromeStorage.setErrorMode(false);

      // デフォルト設定が返されるか確認
      const defaultSettings = this.settingsManager.defaultSettings;
      let allDefaultsMatch = true;

      for (const key in defaultSettings) {
        if (key === "lastUsed") continue; // lastUsedは動的に設定されるため除外

        if (settings[key] !== defaultSettings[key]) {
          allDefaultsMatch = false;
          this.displayResult(
            "Storage API エラーテスト",
            false,
            `デフォルト値が返されていません: ${key} = ${settings[key]} (期待値: ${defaultSettings[key]})`
          );
          break;
        }
      }

      if (allDefaultsMatch) {
        this.displayResult(
          "Storage API エラーテスト",
          true,
          "エラー時にデフォルト設定が正しく返されました",
          settings
        );
        return true;
      }

      return false;
    } catch (error) {
      this.displayResult(
        "Storage API エラーテスト",
        false,
        `予期しないエラー: ${error.message}`
      );
      return false;
    }
  }

  // 設定データ破損時のテスト
  async testCorruptedSettings() {
    try {
      // 正常な設定を保存
      chrome.storage.mockChromeStorage.setErrorMode(false);
      chrome.storage.mockChromeStorage.setCorruptionMode(false);

      const initialSettings = {
        opacity: 0.8,
        isEnabled: true,
        shortcutKey: "Ctrl+Alt+T",
        lastUsed: Date.now(),
        version: "1.0.0",
      };

      await chrome.storage.sync.set({
        theaterModeSettings: initialSettings,
      });

      // 破損モードを有効化
      chrome.storage.mockChromeStorage.setCorruptionMode(true);

      // 破損した設定を読み込み
      this.settingsManager = new SettingsManager();
      const settings = await this.settingsManager.loadSettings();

      // 破損モードを無効化
      chrome.storage.mockChromeStorage.setCorruptionMode(false);

      // 修復された設定が返されるか確認
      if (
        typeof settings.opacity !== "number" ||
        settings.opacity < 0 ||
        settings.opacity > 0.9
      ) {
        this.displayResult(
          "設定破損テスト",
          false,
          `透明度が修復されていません: ${settings.opacity}`
        );
        return false;
      }

      if (typeof settings.isEnabled !== "boolean") {
        this.displayResult(
          "設定破損テスト",
          false,
          `isEnabledが修復されていません: ${settings.isEnabled}`
        );
        return false;
      }

      if (typeof settings.shortcutKey !== "string" || !settings.shortcutKey) {
        this.displayResult(
          "設定破損テスト",
          false,
          `shortcutKeyが修復されていません: ${settings.shortcutKey}`
        );
        return false;
      }

      this.displayResult(
        "設定破損テスト",
        true,
        "破損した設定が正しく修復されました",
        settings
      );
      return true;
    } catch (error) {
      this.displayResult(
        "設定破損テスト",
        false,
        `予期しないエラー: ${error.message}`
      );
      return false;
    }
  }

  // リトライ機能のテスト
  async testRetryMechanism() {
    try {
      // 一時的にエラーモードを有効化
      chrome.storage.mockChromeStorage.setErrorMode(true);

      // リトライ回数を記録するためのカウンター
      let retryCount = 0;

      // オリジナルの_loadSettingsWithRetryメソッドを保存
      const originalMethod = this.settingsManager._loadSettingsWithRetry;

      // メソッドをモック化してリトライをカウント
      this.settingsManager._loadSettingsWithRetry = async function () {
        retryCount++;

        // 2回目のリトライでエラーモードを無効化
        if (retryCount === 2) {
          chrome.storage.mockChromeStorage.setErrorMode(false);

          // テスト用の設定を設定
          await chrome.storage.sync.set({
            theaterModeSettings: {
              opacity: 0.5,
              isEnabled: false,
              shortcutKey: "Ctrl+Shift+T",
              lastUsed: Date.now(),
              version: "1.0.0",
            },
          });
        }

        // オリジナルのメソッドを呼び出し
        return originalMethod.call(this);
      };

      // 設定を読み込み
      const settings = await this.settingsManager.loadSettings();

      // メソッドを元に戻す
      this.settingsManager._loadSettingsWithRetry = originalMethod;

      // リトライが行われたか確認
      if (retryCount < 2) {
        this.displayResult(
          "リトライ機能テスト",
          false,
          `リトライが十分に行われていません: ${retryCount}回`
        );
        return false;
      }

      // 正しい設定が読み込まれたか確認
      if (settings.opacity !== 0.5) {
        this.displayResult(
          "リトライ機能テスト",
          false,
          `リトライ後に正しい設定が読み込まれていません: ${settings.opacity}`
        );
        return false;
      }

      this.displayResult(
        "リトライ機能テスト",
        true,
        `リトライ機能が正常に動作しました (${retryCount}回のリトライ)`,
        settings
      );
      return true;
    } catch (error) {
      this.displayResult(
        "リトライ機能テスト",
        false,
        `予期しないエラー: ${error.message}`
      );
      return false;
    }
  }

  // 全リトライ失敗時のテスト
  async testAllRetriesFailed() {
    try {
      // エラーモードを有効化
      chrome.storage.mockChromeStorage.setErrorMode(true);

      // リトライ回数を制限
      this.settingsManager.maxRetries = 3;

      // 設定を読み込み
      const settings = await this.settingsManager.loadSettings();

      // エラーモードを無効化
      chrome.storage.mockChromeStorage.setErrorMode(false);

      // デフォルト設定が返されるか確認
      const defaultSettings = this.settingsManager.defaultSettings;
      let allDefaultsMatch = true;

      for (const key in defaultSettings) {
        if (key === "lastUsed") continue; // lastUsedは動的に設定されるため除外

        if (settings[key] !== defaultSettings[key]) {
          allDefaultsMatch = false;
          this.displayResult(
            "全リトライ失敗テスト",
            false,
            `デフォルト値が返されていません: ${key} = ${settings[key]} (期待値: ${defaultSettings[key]})`
          );
          break;
        }
      }

      if (allDefaultsMatch) {
        this.displayResult(
          "全リトライ失敗テスト",
          true,
          "全リトライ失敗時にデフォルト設定が正しく返されました",
          settings
        );
        return true;
      }

      return false;
    } catch (error) {
      this.displayResult(
        "全リトライ失敗テスト",
        false,
        `予期しないエラー: ${error.message}`
      );
      return false;
    }
  }

  // 設定修復機能のテスト
  async testSettingsRepair() {
    try {
      // 破損した設定を作成
      this.settingsManager.currentSettings = {
        opacity: 1.5, // 範囲外
        isEnabled: "invalid", // 型不正
        shortcutKey: "", // 空文字
        lastUsed: "not-a-date", // 型不正
        version: null, // null値
      };

      // 修復を実行
      const repairResult = await this.settingsManager.repairSettings();

      if (!repairResult) {
        this.displayResult("設定修復機能テスト", false, "修復が失敗しました");
        return false;
      }

      // 修復された設定を確認
      const repairedSettings = this.settingsManager.getCurrentSettings();

      if (repairedSettings.opacity !== 0.7) {
        this.displayResult(
          "設定修復機能テスト",
          false,
          `透明度が修復されていません: ${repairedSettings.opacity}`
        );
        return false;
      }

      if (repairedSettings.isEnabled !== false) {
        this.displayResult(
          "設定修復機能テスト",
          false,
          `isEnabledが修復されていません: ${repairedSettings.isEnabled}`
        );
        return false;
      }

      if (repairedSettings.shortcutKey !== "Ctrl+Shift+T") {
        this.displayResult(
          "設定修復機能テスト",
          false,
          `shortcutKeyが修復されていません: ${repairedSettings.shortcutKey}`
        );
        return false;
      }

      this.displayResult(
        "設定修復機能テスト",
        true,
        "設定が正しく修復されました",
        repairedSettings
      );
      return true;
    } catch (error) {
      this.displayResult(
        "設定修復機能テスト",
        false,
        `予期しないエラー: ${error.message}`
      );
      return false;
    }
  }

  // 全テスト実行
  async runAllTests() {
    console.log("Settings Error Handling Tests - Starting all tests...");

    // テスト前の準備
    this.settingsManager = new SettingsManager();

    const tests = [
      "testStorageApiError",
      "testCorruptedSettings",
      "testRetryMechanism",
      "testAllRetriesFailed",
      "testSettingsRepair",
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
      `Settings Error Handling Tests - Completed: ${passedTests}/${totalTests} passed`
    );
  }
}

// Global test instance
let testSuite = new SettingsErrorHandlingTestSuite();

// UI Functions
async function runAllTests() {
  clearResults();
  await testSuite.runAllTests();
}

function clearResults() {
  document.getElementById("test-results").innerHTML = "";
  testSuite.testResults = [];
}

// Initialize display on page load
document.addEventListener("DOMContentLoaded", () => {
  // 初期化
});
