/**
 * YouTube Theater Mode - タブ状態管理モジュール
 * 複数タブでの状態管理と同期を担当
 */

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

// Node.js環境でのエクスポート
if (typeof module !== "undefined" && module.exports) {
  module.exports = TabStateManager;
}

// ブラウザ環境での使用
if (typeof window !== "undefined") {
  window.TabStateManager = TabStateManager;
}
