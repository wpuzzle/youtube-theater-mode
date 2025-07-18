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

// 現在のログレベル
let currentLogLevel = LOG_LEVELS.INFO;

/**
 * BackgroundService クラス
 * 拡張機能のバックグラウンド処理を管理
 */
class BackgroundService {
  constructor() {
    this.logger = {
      debug: (message, ...args) => this.log(LOG_LEVELS.DEBUG, message, ...args),
      info: (message, ...args) => this.log(LOG_LEVELS.INFO, message, ...args),
      warn: (message, ...args) => this.log(LOG_LEVELS.WARN, message, ...args),
      error: (message, ...args) => this.log(LOG_LEVELS.ERROR, message, ...args),
    };

    // タブ状態管理インスタンスを作成
    this.tabStateManager = new TabStateManager();

    this.initializeExtension();
    this.setupMessageListeners();

    this.logger.info("BackgroundService initialized");
  }

  /**
   * ログ出力
   * @param {number} level - ログレベル
   * @param {string} message - メッセージ
   * @param {...any} args - 追加引数
   */
  log(level, message, ...args) {
    if (level >= currentLogLevel) {
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
      const manifest = chrome.runtime.getManifest();
      await this.saveSettings({ version: manifest.version });

      this.logger.info("Extension initialized successfully", {
        version: manifest.version,
      });
    } catch (error) {
      this.logger.error("Error initializing extension", error);
    }
  }

  /**
   * メッセージリスナーの設定
   */
  setupMessageListeners() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // 非同期レスポンスを示す
    });
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
        case "stateChanged":
          // content.jsからの状態変更通知を処理
          if (message.state && tabId) {
            await this.handleStateChange(message.state, tabId);
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: "Invalid state data" });
          }
          break;

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
            const tabState = this.tabStateManager.getTabState(tabId);
            sendResponse({ success: true, tabState });
          } else {
            sendResponse({ success: false, error: "No tab ID provided" });
          }
          break;

        case "getAllTabStates":
          const allTabStates = this.tabStateManager.getAllTabStates();
          sendResponse({ success: true, tabStates: allTabStates });
          break;

        case "getActiveTabState":
          const activeTabState = this.tabStateManager.getActiveTabState();
          sendResponse({ success: true, tabState: activeTabState });
          break;

        case "syncTabState":
          if (tabId) {
            await this.tabStateManager.syncTabState(tabId, sender.tab);
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: "No tab ID provided" });
          }
          break;

        case "syncAllTabs":
          this.tabStateManager.syncAllTabs();
          sendResponse({ success: true });
          break;

        case "setLogLevel":
          if (
            message.level !== undefined &&
            LOG_LEVELS[message.level] !== undefined
          ) {
            currentLogLevel = LOG_LEVELS[message.level];
            sendResponse({ success: true, level: message.level });
          } else {
            sendResponse({ success: false, error: "Invalid log level" });
          }
          break;

        case "relayMessageToTab":
          // ポップアップからタブへのメッセージを中継
          if (message.tabId && message.message) {
            try {
              // タブにメッセージを送信
              chrome.tabs.sendMessage(
                message.tabId,
                message.message,
                (response) => {
                  if (chrome.runtime.lastError) {
                    this.logger.warn(
                      "Error relaying message to tab",
                      chrome.runtime.lastError
                    );
                    sendResponse({
                      success: false,
                      error:
                        chrome.runtime.lastError.message ||
                        "Failed to send message to tab",
                    });
                  } else {
                    sendResponse({ success: true, response });
                  }
                }
              );
              return true; // 非同期レスポンスを示す
            } catch (error) {
              this.logger.error("Error relaying message to tab", error);
              sendResponse({
                success: false,
                error: error.message || "Unknown error",
              });
            }
          } else {
            sendResponse({
              success: false,
              error: "Invalid relay message parameters",
            });
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
      if (tabId) {
        await this.tabStateManager.updateTabState(tabId, {
          theaterModeEnabled: newState,
        });
      }

      // 全てのタブを同期
      this.tabStateManager.syncAllTabs();

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
      if (tabId) {
        await this.tabStateManager.updateTabState(tabId, {
          opacity: validOpacity,
        });
      }

      // 全てのタブを同期
      this.tabStateManager.syncAllTabs();

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
   * 状態変更処理
   * @param {Object} state - 新しい状態
   * @param {number} tabId - タブID
   * @returns {Promise<boolean>} 処理結果
   */
  async handleStateChange(state, tabId) {
    try {
      this.logger.info("State change received", { state, tabId });

      // シアターモードの状態を更新
      if (state.isActive !== undefined) {
        await this.saveSettings({ theaterModeEnabled: state.isActive });
      }

      // 透明度を更新
      if (state.opacity !== undefined) {
        await this.saveSettings({ opacity: state.opacity });
      }

      // タブ状態を更新
      if (tabId) {
        await this.tabStateManager.updateTabState(tabId, {
          theaterModeEnabled: state.isActive,
          opacity: state.opacity,
        });
      }

      // 全てのタブを同期
      this.tabStateManager.syncAllTabs();

      return true;
    } catch (error) {
      this.logger.error("Error handling state change", error);
      return false;
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
      if (tabId) {
        await this.tabStateManager.updateTabState(tabId, {
          opacity: defaultOpacity,
        });
      }

      // 全てのタブを同期
      this.tabStateManager.syncAllTabs();

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

/**
 * タブ状態管理クラス
 * 複数タブでのシアターモード状態を管理
 */
class TabStateManager {
  constructor() {
    this.tabStates = new Map(); // タブIDごとの状態を管理
    this.activeTabId = null; // 現在アクティブなタブID
    this.syncInterval = null; // 定期的な同期用インターバル
    this.syncIntervalTime = 5000; // 同期間隔（ミリ秒）

    // 初期化
    this.initialize();
  }

  /**
   * 初期化処理
   */
  initialize() {
    console.log("YouTube Theater Mode: TabStateManager initialized");

    // タブ関連イベントリスナーを設定
    this.setupTabListeners();

    // 現在のアクティブタブを取得
    this.getCurrentActiveTab();

    // 定期的な状態同期を開始
    this.startPeriodicSync();
  }

  /**
   * タブ関連イベントリスナーを設定
   */
  setupTabListeners() {
    if (typeof chrome === "undefined" || !chrome.tabs) {
      console.warn(
        "YouTube Theater Mode: Chrome API not available for tab management"
      );
      return;
    }

    // タブ更新時のリスナー
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (
        changeInfo.status === "complete" &&
        tab.url &&
        tab.url.includes("youtube.com/watch")
      ) {
        console.log(`YouTube Theater Mode: Tab ${tabId} updated`, tab.url);
        this.registerTab(tabId, tab);
      }
    });

    // タブ切り替え時のリスナー
    chrome.tabs.onActivated.addListener(({ tabId }) => {
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError) {
          console.warn(
            "YouTube Theater Mode: Error getting tab info",
            chrome.runtime.lastError
          );
          return;
        }

        if (tab && tab.url && tab.url.includes("youtube.com/watch")) {
          console.log(`YouTube Theater Mode: Tab ${tabId} activated`);
          this.setActiveTab(tabId);
          this.syncTabState(tabId);
        }
      });
    });

    // タブ削除時のリスナー
    chrome.tabs.onRemoved.addListener((tabId) => {
      if (this.tabStates.has(tabId)) {
        console.log(`YouTube Theater Mode: Tab ${tabId} removed`);
        this.unregisterTab(tabId);
      }
    });
  }

  /**
   * 現在のアクティブタブを取得
   */
  getCurrentActiveTab() {
    if (typeof chrome === "undefined" || !chrome.tabs) {
      return;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        console.warn(
          "YouTube Theater Mode: Error querying active tab",
          chrome.runtime.lastError
        );
        return;
      }

      if (tabs && tabs.length > 0) {
        const activeTab = tabs[0];
        if (activeTab.url && activeTab.url.includes("youtube.com/watch")) {
          this.setActiveTab(activeTab.id);
          this.registerTab(activeTab.id, activeTab);
        }
      }
    });
  }

  /**
   * タブを登録
   * @param {number} tabId - タブID
   * @param {Object} tab - タブ情報
   */
  async registerTab(tabId, tab) {
    try {
      // 設定を読み込み
      const settings = await this.loadSettings();

      // タブの状態を初期化
      const tabState = {
        url: tab.url,
        title: tab.title || "",
        theaterModeEnabled: settings.theaterModeEnabled || false,
        opacity: settings.opacity || 0.7,
        lastSync: Date.now(),
        isActive: this.activeTabId === tabId,
      };

      // タブ状態を保存
      this.tabStates.set(tabId, tabState);

      console.log(`YouTube Theater Mode: Tab ${tabId} registered`, tabState);

      // タブにメッセージを送信して状態を同期
      this.notifyTab(tabId, {
        action: "syncState",
        state: tabState,
      });
    } catch (error) {
      console.error(
        `YouTube Theater Mode: Error registering tab ${tabId}`,
        error
      );
    }
  }

  /**
   * タブの登録を解除
   * @param {number} tabId - タブID
   */
  unregisterTab(tabId) {
    if (this.tabStates.has(tabId)) {
      this.tabStates.delete(tabId);
      console.log(`YouTube Theater Mode: Tab ${tabId} unregistered`);

      // アクティブタブが削除された場合
      if (this.activeTabId === tabId) {
        this.activeTabId = null;

        // 他のYouTubeタブがあれば、最初のものをアクティブにする
        if (this.tabStates.size > 0) {
          const nextTabId = Array.from(this.tabStates.keys())[0];
          this.setActiveTab(nextTabId);
        }
      }
    }
  }

  /**
   * アクティブタブを設定
   * @param {number} tabId - タブID
   */
  setActiveTab(tabId) {
    const previousActiveTabId = this.activeTabId;
    this.activeTabId = tabId;

    // 以前のアクティブタブの状態を更新
    if (previousActiveTabId && this.tabStates.has(previousActiveTabId)) {
      const prevTabState = this.tabStates.get(previousActiveTabId);
      prevTabState.isActive = false;
      this.tabStates.set(previousActiveTabId, prevTabState);
    }

    // 新しいアクティブタブの状態を更新
    if (this.tabStates.has(tabId)) {
      const tabState = this.tabStates.get(tabId);
      tabState.isActive = true;
      tabState.lastSync = Date.now();
      this.tabStates.set(tabId, tabState);
    }

    console.log(`YouTube Theater Mode: Active tab set to ${tabId}`);
  }

  /**
   * タブの状態を同期
   * @param {number} tabId - タブID
   */
  async syncTabState(tabId) {
    try {
      if (!this.tabStates.has(tabId)) {
        console.warn(`YouTube Theater Mode: Cannot sync unknown tab ${tabId}`);
        return;
      }

      const tabState = this.tabStates.get(tabId);

      // 設定を読み込み
      const settings = await this.loadSettings();

      // 設定から状態を更新
      tabState.theaterModeEnabled = settings.theaterModeEnabled;
      tabState.opacity = settings.opacity;
      tabState.lastSync = Date.now();

      // 更新した状態を保存
      this.tabStates.set(tabId, tabState);

      console.log(`YouTube Theater Mode: Tab ${tabId} state synced`, tabState);

      // タブにメッセージを送信して状態を同期
      this.notifyTab(tabId, {
        action: "syncState",
        state: tabState,
      });
    } catch (error) {
      console.error(`YouTube Theater Mode: Error syncing tab ${tabId}`, error);
    }
  }

  /**
   * 全てのタブの状態を同期
   */
  syncAllTabs() {
    for (const tabId of this.tabStates.keys()) {
      this.syncTabState(tabId);
    }

    console.log(
      `YouTube Theater Mode: All tabs (${this.tabStates.size}) synced`
    );
  }

  /**
   * 定期的な状態同期を開始
   */
  startPeriodicSync() {
    // 既存のインターバルをクリア
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    // 新しいインターバルを設定
    this.syncInterval = setInterval(() => {
      if (this.tabStates.size > 0) {
        console.log(
          `YouTube Theater Mode: Periodic sync for ${this.tabStates.size} tabs`
        );
        this.syncAllTabs();
      }
    }, this.syncIntervalTime);

    console.log(
      `YouTube Theater Mode: Periodic sync started (${this.syncIntervalTime}ms)`
    );
  }

  /**
   * 定期的な状態同期を停止
   */
  stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log("YouTube Theater Mode: Periodic sync stopped");
    }
  }

  /**
   * タブにメッセージを送信
   * @param {number} tabId - タブID
   * @param {Object} message - 送信するメッセージ
   */
  notifyTab(tabId, message) {
    if (typeof chrome === "undefined" || !chrome.tabs) {
      return;
    }

    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        console.warn(
          `YouTube Theater Mode: Error sending message to tab ${tabId}`,
          chrome.runtime.lastError
        );
        return;
      }

      if (response) {
        console.log(`YouTube Theater Mode: Tab ${tabId} response:`, response);
      }
    });
  }

  /**
   * 設定を読み込み
   * @returns {Promise<Object>} 設定オブジェクト
   */
  async loadSettings() {
    return new Promise((resolve) => {
      if (
        typeof chrome === "undefined" ||
        !chrome.storage ||
        !chrome.storage.sync
      ) {
        resolve({
          theaterModeEnabled: false,
          opacity: 0.7,
        });
        return;
      }

      chrome.storage.sync.get(null, (result) => {
        if (chrome.runtime.lastError) {
          console.warn(
            "YouTube Theater Mode: Error loading settings",
            chrome.runtime.lastError
          );
          resolve({
            theaterModeEnabled: false,
            opacity: 0.7,
          });
        } else {
          resolve(result);
        }
      });
    });
  }

  /**
   * タブの状態を更新
   * @param {number} tabId - タブID
   * @param {Object} stateUpdate - 更新する状態
   */
  async updateTabState(tabId, stateUpdate) {
    try {
      if (!this.tabStates.has(tabId)) {
        console.warn(
          `YouTube Theater Mode: Cannot update unknown tab ${tabId}`
        );
        return false;
      }

      const tabState = this.tabStates.get(tabId);

      // 状態を更新
      Object.assign(tabState, stateUpdate, { lastSync: Date.now() });

      // 更新した状態を保存
      this.tabStates.set(tabId, tabState);

      console.log(`YouTube Theater Mode: Tab ${tabId} state updated`, tabState);

      // シアターモードの状態が変更された場合は設定も更新
      if (stateUpdate.theaterModeEnabled !== undefined) {
        await this.saveSettings({
          theaterModeEnabled: stateUpdate.theaterModeEnabled,
        });
      }

      // 透明度が変更された場合は設定も更新
      if (stateUpdate.opacity !== undefined) {
        await this.saveSettings({ opacity: stateUpdate.opacity });
      }

      return true;
    } catch (error) {
      console.error(`YouTube Theater Mode: Error updating tab ${tabId}`, error);
      return false;
    }
  }

  /**
   * 設定を保存
   * @param {Object} settings - 保存する設定
   * @returns {Promise<boolean>} 成功時true
   */
  async saveSettings(settings) {
    return new Promise((resolve) => {
      if (
        typeof chrome === "undefined" ||
        !chrome.storage ||
        !chrome.storage.sync
      ) {
        resolve(false);
        return;
      }

      chrome.storage.sync.set(settings, () => {
        if (chrome.runtime.lastError) {
          console.warn(
            "YouTube Theater Mode: Error saving settings",
            chrome.runtime.lastError
          );
          resolve(false);
        } else {
          console.log("YouTube Theater Mode: Settings saved", settings);
          resolve(true);
        }
      });
    });
  }

  /**
   * タブの状態を取得
   * @param {number} tabId - タブID
   * @returns {Object|null} タブの状態またはnull
   */
  getTabState(tabId) {
    return this.tabStates.has(tabId) ? { ...this.tabStates.get(tabId) } : null;
  }

  /**
   * 全てのタブの状態を取得
   * @returns {Object} タブIDをキーとする状態オブジェクト
   */
  getAllTabStates() {
    const states = {};
    for (const [tabId, state] of this.tabStates.entries()) {
      states[tabId] = { ...state };
    }
    return states;
  }

  /**
   * アクティブタブの状態を取得
   * @returns {Object|null} アクティブタブの状態またはnull
   */
  getActiveTabState() {
    return this.activeTabId && this.tabStates.has(this.activeTabId)
      ? { ...this.tabStates.get(this.activeTabId) }
      : null;
  }
}

// BackgroundService インスタンスを作成
const backgroundService = new BackgroundService();

// 拡張機能インストール時の初期設定
chrome.runtime.onInstalled.addListener((details) => {
  console.log("YouTube Theater Mode: Extension installed", details);

  if (details.reason === "install") {
    // 新規インストール時の処理
    backgroundService.initializeExtension();
  } else if (details.reason === "update") {
    // アップデート時の処理
    console.log("YouTube Theater Mode: Extension updated", {
      previousVersion: details.previousVersion,
      currentVersion: chrome.runtime.getManifest().version,
    });
  }
});
