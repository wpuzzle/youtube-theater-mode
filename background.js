/**
 * YouTube Theater Mode - バックグラウンドスクリプト
 * 拡張機能の設定管理とメッセージ処理
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
    if (level < this.currentLogLevel) return;

    const levelNames = ["DEBUG", "INFO", "WARN", "ERROR"];
    const levelName = levelNames[level] || "UNKNOWN";
    const timestamp = new Date().toISOString();

    console.log(
      `[${timestamp}] [${levelName}] YouTube Theater Mode:`,
      message,
      ...args
    );
  }

  /**
   * 拡張機能を初期化
   */
  async initializeExtension() {
    try {
      // デフォルト設定を確認・設定
      const settings = await this.getSettings();
      if (!settings || Object.keys(settings).length === 0) {
        await this.saveSettings(DEFAULT_SETTINGS);
        this.logger.info("Default settings initialized");
      }

      this.logger.info("Extension initialized successfully");
    } catch (error) {
      this.logger.error("Failed to initialize extension", error);
    }
  }

  /**
   * メッセージリスナーを設定
   */
  setupMessageListeners() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // 非同期レスポンスを示す
    });
  }

  /**
   * タブリスナーを設定
   */
  setupTabListeners() {
    // タブが閉じられた時の処理
    chrome.tabs.onRemoved.addListener((tabId) => {
      this.activeTabStates.delete(tabId);
      this.logger.debug(`Tab ${tabId} state cleaned up`);
    });

    // タブが更新された時の処理
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (
        changeInfo.status === "complete" &&
        tab.url &&
        tab.url.includes("youtube.com")
      ) {
        this.logger.debug(`YouTube tab ${tabId} updated`);
      }
    });
  }

  /**
   * メッセージを処理
   * @param {Object} message - 受信メッセージ
   * @param {Object} sender - 送信者情報
   * @param {Function} sendResponse - レスポンス関数
   */
  async handleMessage(message, sender, sendResponse) {
    try {
      this.logger.debug("Received message", message);

      switch (message.action) {
        case "getSettings":
          const settings = await this.getSettings();
          sendResponse(settings);
          break;

        case "saveSettings":
          const success = await this.saveSettings(message.settings);
          sendResponse({ success });
          break;

        case "toggleTheaterMode":
          const toggleResult = await this.handleToggleTheaterMode(
            message,
            sender
          );
          sendResponse(toggleResult);
          break;

        case "relayMessageToTab":
          const relayResult = await this.relayMessageToTab(
            message.tabId,
            message.message
          );
          sendResponse(relayResult);
          break;

        default:
          this.logger.warn("Unknown message action", message.action);
          sendResponse({ success: false, error: "Unknown action" });
      }
    } catch (error) {
      this.logger.error("Error handling message", error);
      sendResponse({ success: false, error: error.message });
    }
  }

  /**
   * 設定を取得
   * @returns {Promise<Object>} 設定オブジェクト
   */
  async getSettings() {
    try {
      const result = await chrome.storage.sync.get(null);
      return { ...DEFAULT_SETTINGS, ...result };
    } catch (error) {
      this.logger.error("Failed to get settings", error);
      return DEFAULT_SETTINGS;
    }
  }

  /**
   * 設定を保存
   * @param {Object} settings - 保存する設定
   * @returns {Promise<boolean>} 成功フラグ
   */
  async saveSettings(settings) {
    try {
      const currentSettings = await this.getSettings();
      const updatedSettings = { ...currentSettings, ...settings };
      await chrome.storage.sync.set(updatedSettings);
      this.logger.info("Settings saved", updatedSettings);
      return true;
    } catch (error) {
      this.logger.error("Failed to save settings", error);
      return false;
    }
  }

  /**
   * シアターモード切り替えを処理
   * @param {Object} message - メッセージ
   * @param {Object} sender - 送信者
   * @returns {Promise<Object>} 処理結果
   */
  async handleToggleTheaterMode(message, sender) {
    try {
      const settings = await this.getSettings();
      const newState = !settings.theaterModeEnabled;

      await this.saveSettings({
        theaterModeEnabled: newState,
        lastUsed: Date.now(),
      });

      // タブ状態を更新
      if (sender.tab) {
        this.activeTabStates.set(sender.tab.id, {
          theaterModeEnabled: newState,
          opacity: settings.opacity,
          lastUpdated: Date.now(),
        });
      }

      this.logger.info(`Theater mode ${newState ? "enabled" : "disabled"}`);

      return {
        success: true,
        enabled: newState,
        opacity: settings.opacity,
      };
    } catch (error) {
      this.logger.error("Failed to toggle theater mode", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * タブにメッセージを中継
   * @param {number} tabId - タブID
   * @param {Object} message - メッセージ
   * @returns {Promise<Object>} 処理結果
   */
  async relayMessageToTab(tabId, message) {
    try {
      const response = await chrome.tabs.sendMessage(tabId, message);
      return { success: true, response };
    } catch (error) {
      this.logger.warn("Failed to relay message to tab", error);
      return { success: false, error: error.message };
    }
  }
}

// 拡張機能のインストール/更新イベント
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log("YouTube Theater Mode extension installed/updated", details);

  try {
    if (details.reason === "install") {
      console.log("First install - setting up default configuration");
      // デフォルト設定を初期化
      await chrome.storage.sync.set(DEFAULT_SETTINGS);
    } else if (details.reason === "update") {
      console.log(`Updated from version ${details.previousVersion}`);
      // 必要に応じて設定の移行処理を実行
      const currentSettings = await chrome.storage.sync.get(null);
      const updatedSettings = { ...DEFAULT_SETTINGS, ...currentSettings };
      await chrome.storage.sync.set(updatedSettings);
    }
  } catch (error) {
    console.error("Error during extension installation/update:", error);
  }
});

// BackgroundServiceのインスタンスを作成
const backgroundService = new BackgroundService();

// サービスワーカーの起動ログ
console.log("YouTube Theater Mode background service worker started");
