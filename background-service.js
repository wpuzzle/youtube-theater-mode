/**
 * YouTube Theater Mode - Background Service Module
 * テスト可能な形式でエクスポートされたBackgroundServiceクラス
 */

// デフォルト設定
const DEFAULT_SETTINGS = {
  theaterModeEnabled: false,
  opacity: 0.7,
  keyboardShortcut: "t",
  lastUsed: null,
  version: "1.0.0",
};

// ログレベル設定
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

/**
 * BackgroundService クラス
 * 拡張機能のバックグラウンド処理を管理
 */
class BackgroundService {
  constructor() {
    this.activeTabStates = new Map(); // タブIDごとの状態を管理
    this.currentLogLevel = LOG_LEVELS.INFO;

    this.logger = {
      debug: (message, ...args) => this.log(LOG_LEVELS.DEBUG, message, ...args),
      info: (message, ...args) => this.log(LOG_LEVELS.INFO, message, ...args),
      warn: (message, ...args) => this.log(LOG_LEVELS.WARN, message, ...args),
      error: (message, ...args) => this.log(LOG_LEVELS.ERROR, message, ...args),
    };

    this.initializeExtension();
    this.setupMessageListeners();
    this.setupTabListeners();

    this.logger.info("BackgroundService initialized");
  }

  /**
   * ログ出力
   * @param {number} level - ログレベル
   * @param {string} message - メッセージ
   * @param {...any} args - 追加引数
   */
  log(level, message, ...args) {
    if (level >= this.currentLogLevel) {
      const prefix = "YouTube Theater Mode:";
      switch (level) {
        case LOG_LEVELS.DEBUG:
          console.debug(prefix, message, ...args);
          break;
        case LOG_LEVELS.INFO:
          console.log(prefix, message, ...args);
          break;
        case LOG_LEVELS.WARN:
          console.warn(prefix, message, ...args);
          break;
        case LOG_LEVELS.ERROR:
          console.error(prefix, message, ...args);
          break;
      }
    }
  }

  /**
   * 拡張機能の初期化
   */
  async initializeExtension() {
    try {
      this.logger.info("Initializing extension");

      // 設定の初期化確認
      const settings = await this.loadSettings();

      // 設定が存在しない場合は初期化
      if (!settings || Object.keys(settings).length === 0) {
        await this.saveSettings(DEFAULT_SETTINGS);
        this.logger.info("Default settings initialized");
      } else {
        // 設定の整合性チェック
        const validatedSettings = this.validateSettings(settings);
        if (JSON.stringify(validatedSettings) !== JSON.stringify(settings)) {
          await this.saveSettings(validatedSettings);
          this.logger.info("Settings validated and updated");
        }
      }

      // 拡張機能のバージョン情報を保存
      if (typeof chrome !== "undefined" && chrome.runtime) {
        const manifest = chrome.runtime.getManifest();
        await this.saveSettings({ version: manifest.version });
      }

      this.logger.info("Extension initialized successfully");
    } catch (error) {
      this.logger.error("Error initializing extension", error);
    }
  }

  /**
   * メッセージリスナーの設定
   */
  setupMessageListeners() {
    if (
      typeof chrome !== "undefined" &&
      chrome.runtime &&
      chrome.runtime.onMessage
    ) {
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        this.handleMessage(message, sender, sendResponse);
        return true; // 非同期レスポンスを示す
      });
    }
  }

  /**
   * タブ関連リスナーの設定
   */
  setupTabListeners() {
    if (typeof chrome === "undefined" || !chrome.tabs) {
      return;
    }

    // タブ更新時のリスナー
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (
        changeInfo.status === "complete" &&
        tab.url &&
        tab.url.includes("youtube.com")
      ) {
        this.logger.debug("YouTube tab updated", { tabId, url: tab.url });
        this.syncTabState(tabId, tab);
      }
    });

    // タブ切り替え時のリスナー
    chrome.tabs.onActivated.addListener(({ tabId }) => {
      chrome.tabs.get(tabId, (tab) => {
        if (tab && tab.url && tab.url.includes("youtube.com")) {
          this.logger.debug("YouTube tab activated", { tabId, url: tab.url });
          this.syncTabState(tabId, tab);
        }
      });
    });

    // タブ削除時のリスナー
    chrome.tabs.onRemoved.addListener((tabId) => {
      if (this.activeTabStates.has(tabId)) {
        this.logger.debug("Removing tab state", { tabId });
        this.activeTabStates.delete(tabId);
      }
    });
  }

  /**
   * タブの状態を同期
   * @param {number} tabId - タブID
   * @param {Object} tab - タブ情報
   */
  async syncTabState(tabId, tab) {
    try {
      if (!tab.url.includes("youtube.com/watch")) {
        return; // 動画ページのみ対象
      }

      const settings = await this.loadSettings();

      // タブの状態を保存
      this.activeTabStates.set(tabId, {
        url: tab.url,
        theaterModeEnabled: settings.theaterModeEnabled,
        opacity: settings.opacity,
        lastSync: Date.now(),
      });

      this.logger.debug("Tab state synced", {
        tabId,
        theaterModeEnabled: settings.theaterModeEnabled,
        opacity: settings.opacity,
      });
    } catch (error) {
      this.logger.error("Error syncing tab state", { tabId, error });
    }
  }

  /**
   * メッセージ処理
   * @param {Object} message - 受信メッセージ
   * @param {Object} sender - 送信元情報
   * @param {Function} sendResponse - レスポンス関数
   */
  async handleMessage(message, sender, sendResponse) {
    try {
      this.logger.debug("Message received", { action: message.action, sender });

      // 送信元のタブIDを取得
      const tabId = sender.tab ? sender.tab.id : null;

      // アクションに基づいて処理
      switch (message.action) {
        case "toggleTheaterMode":
          const toggleResult = await this.handleTheaterModeToggle(tabId);
          sendResponse(toggleResult);
          break;

        case "getSettings":
          const settings = await this.loadSettings();
          sendResponse(settings);
          break;

        case "saveSettings":
          const saveResult = await this.saveSettings(message.settings);
          sendResponse({ success: saveResult });
          break;

        case "updateOpacity":
          const opacityResult = await this.updateOpacity(
            message.opacity,
            tabId
          );
          sendResponse(opacityResult);
          break;

        case "setDefaultOpacity":
          const defaultOpacityResult = await this.setDefaultOpacity(tabId);
          sendResponse(defaultOpacityResult);
          break;

        case "getTabState":
          if (tabId) {
            const tabState = this.activeTabStates.get(tabId) || null;
            sendResponse({ success: true, tabState });
          } else {
            sendResponse({ success: false, error: "No tab ID provided" });
          }
          break;

        case "syncTabState":
          if (tabId) {
            await this.syncTabState(tabId, sender.tab);
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: "No tab ID provided" });
          }
          break;

        case "setLogLevel":
          if (
            message.level !== undefined &&
            LOG_LEVELS[message.level] !== undefined
          ) {
            this.currentLogLevel = LOG_LEVELS[message.level];
            sendResponse({ success: true, level: message.level });
          } else {
            sendResponse({ success: false, error: "Invalid log level" });
          }
          break;

        default:
          this.logger.warn("Unknown action", { action: message.action });
          sendResponse({
            success: false,
            error: `Unknown action: ${message.action}`,
          });
      }
    } catch (error) {
      this.logger.error("Error handling message", { error, message });
      sendResponse({ success: false, error: error.message || "Unknown error" });
    }
  }

  /**
   * シアターモード切り替え処理
   * @param {number} tabId - タブID
   * @returns {Promise<Object>} 処理結果
   */
  async handleTheaterModeToggle(tabId) {
    try {
      const settings = await this.loadSettings();
      const newState = !settings.theaterModeEnabled;

      await this.saveSettings({ theaterModeEnabled: newState });

      // タブ状態を更新
      if (tabId && this.activeTabStates.has(tabId)) {
        const tabState = this.activeTabStates.get(tabId);
        tabState.theaterModeEnabled = newState;
        tabState.lastSync = Date.now();
        this.activeTabStates.set(tabId, tabState);
      }

      this.logger.info("Theater mode toggled", { newState, tabId });

      return { success: true, enabled: newState };
    } catch (error) {
      this.logger.error("Error toggling theater mode", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 設定読み込み
   * @returns {Promise<Object>} 設定オブジェクト
   */
  async loadSettings() {
    try {
      if (
        typeof chrome === "undefined" ||
        !chrome.storage ||
        !chrome.storage.sync
      ) {
        return { ...DEFAULT_SETTINGS };
      }

      return new Promise((resolve) => {
        chrome.storage.sync.get(null, (result) => {
          if (chrome.runtime.lastError) {
            this.logger.error(
              "Error loading settings",
              chrome.runtime.lastError
            );
            resolve({ ...DEFAULT_SETTINGS });
          } else {
            resolve(result);
          }
        });
      });
    } catch (error) {
      this.logger.error("Error in loadSettings", error);
      return { ...DEFAULT_SETTINGS };
    }
  }

  /**
   * 設定保存
   * @param {Object} settings - 保存する設定
   * @returns {Promise<boolean>} 成功時true
   */
  async saveSettings(settings) {
    try {
      if (
        typeof chrome === "undefined" ||
        !chrome.storage ||
        !chrome.storage.sync
      ) {
        return false;
      }

      return new Promise((resolve) => {
        chrome.storage.sync.set(settings, () => {
          if (chrome.runtime.lastError) {
            this.logger.error(
              "Error saving settings",
              chrome.runtime.lastError
            );
            resolve(false);
          } else {
            this.logger.debug("Settings saved", settings);
            resolve(true);
          }
        });
      });
    } catch (error) {
      this.logger.error("Error in saveSettings", error);
      return false;
    }
  }

  /**
   * 設定のバリデーション
   * @param {Object} settings - バリデーション対象の設定
   * @returns {Object} バリデーション済み設定
   */
  validateSettings(settings) {
    const validated = { ...DEFAULT_SETTINGS };

    // 各設定項目のバリデーション
    if (typeof settings.theaterModeEnabled === "boolean") {
      validated.theaterModeEnabled = settings.theaterModeEnabled;
    }

    if (
      typeof settings.opacity === "number" &&
      settings.opacity >= 0 &&
      settings.opacity <= 0.9
    ) {
      validated.opacity = settings.opacity;
    }

    if (
      typeof settings.keyboardShortcut === "string" &&
      settings.keyboardShortcut.trim()
    ) {
      validated.keyboardShortcut = settings.keyboardShortcut;
    }

    if (settings.lastUsed && typeof settings.lastUsed === "number") {
      validated.lastUsed = settings.lastUsed;
    } else {
      validated.lastUsed = Date.now();
    }

    if (settings.version && typeof settings.version === "string") {
      validated.version = settings.version;
    }

    return validated;
  }

  /**
   * 透明度更新処理
   * @param {number} opacity - 透明度値
   * @param {number} tabId - タブID
   * @returns {Promise<Object>} 処理結果
   */
  async updateOpacity(opacity, tabId) {
    try {
      // 透明度を0-90%に制限
      const validOpacity = Math.max(0, Math.min(0.9, parseFloat(opacity)));

      await this.saveSettings({ opacity: validOpacity });

      // タブ状態を更新
      if (tabId && this.activeTabStates.has(tabId)) {
        const tabState = this.activeTabStates.get(tabId);
        tabState.opacity = validOpacity;
        tabState.lastSync = Date.now();
        this.activeTabStates.set(tabId, tabState);
      }

      this.logger.info("Opacity updated", { opacity: validOpacity, tabId });

      return {
        success: true,
        opacity: validOpacity,
        percentage: Math.round(validOpacity * 100),
      };
    } catch (error) {
      this.logger.error("Error updating opacity", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * デフォルト透明度設定処理
   * @param {number} tabId - タブID
   * @returns {Promise<Object>} 処理結果
   */
  async setDefaultOpacity(tabId) {
    try {
      const defaultOpacity = DEFAULT_SETTINGS.opacity; // 70%

      await this.saveSettings({ opacity: defaultOpacity });

      // タブ状態を更新
      if (tabId && this.activeTabStates.has(tabId)) {
        const tabState = this.activeTabStates.get(tabId);
        tabState.opacity = defaultOpacity;
        tabState.lastSync = Date.now();
        this.activeTabStates.set(tabId, tabState);
      }

      this.logger.info("Default opacity set", {
        opacity: defaultOpacity,
        tabId,
      });

      return {
        success: true,
        opacity: defaultOpacity,
        percentage: Math.round(defaultOpacity * 100),
      };
    } catch (error) {
      this.logger.error("Error setting default opacity", error);
      return { success: false, error: error.message };
    }
  }
}

// Node.js環境でのエクスポート
if (typeof module !== "undefined" && module.exports) {
  module.exports = BackgroundService;
}
