/**
 * TabStateManager
 * 新しい StateStore を使用したタブ状態管理を実装
 */

// 依存関係のインポート
let Logger,
  ErrorHandler,
  Result,
  AppError,
  ErrorType,
  StateStore,
  ActionCreator,
  ActionType;

// Node.js環境での依存関係の解決
if (typeof require !== "undefined") {
  ({ Logger } = require("./infrastructure/logger.js"));
  ({
    ErrorHandler,
    Result,
    AppError,
    ErrorType,
  } = require("./infrastructure/error-handler.js"));
  ({
    StateStore,
    ActionCreator,
    ActionType,
  } = require("./infrastructure/state-store.js"));
}

/**
 * タブ状態管理クラス
 * 複数タブでのシアターモード状態を管理
 */
class TabStateManager {
  /**
   * TabStateManagerインスタンスを作成
   * @param {Object} options - オプション
   * @param {StateStore} options.stateStore - 状態ストア
   * @param {Object} [options.logger] - ロガーインスタンス
   * @param {Object} [options.errorHandler] - エラーハンドラーインスタンス
   * @param {number} [options.syncIntervalTime=5000] - 同期間隔（ミリ秒）
   */
  constructor(options) {
    if (!options || !options.stateStore) {
      throw new Error("StateStore is required");
    }

    this.stateStore = options.stateStore;
    this.logger = options.logger;
    this.errorHandler = options.errorHandler;
    this.syncIntervalTime = options.syncIntervalTime || 5000;

    // 同期インターバル
    this.syncInterval = null;

    // 競合解決用のロック
    this.locks = new Map();
    this.lockTimeout = 5000; // ロックのタイムアウト（ミリ秒）

    // 初期化
    this.initialize();
  }

  /**
   * 初期化処理
   */
  async initialize() {
    if (this.logger) {
      this.logger.info("TabStateManager initialized");
    }

    // タブ関連イベントリスナーを設定
    this.setupTabListeners();

    // 現在のアクティブタブを取得
    await this.getCurrentActiveTab();

    // 定期的な状態同期を開始
    this.startPeriodicSync();
  }

  /**
   * タブ関連イベントリスナーを設定
   */
  setupTabListeners() {
    if (typeof chrome === "undefined" || !chrome.tabs) {
      if (this.logger) {
        this.logger.warn("Chrome API not available for tab management");
      }
      return;
    }

    // タブ更新時のリスナー
    chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
      if (
        changeInfo.status === "complete" &&
        tab.url &&
        tab.url.includes("youtube.com/watch")
      ) {
        if (this.logger) {
          this.logger.debug(`Tab ${tabId} updated`, { url: tab.url });
        }

        await this.registerTab(tabId, tab);
      }
    });

    // タブ切り替え時のリスナー
    chrome.tabs.onActivated.addListener(async ({ tabId }) => {
      try {
        const tab = await this.getTabInfo(tabId);

        if (tab && tab.url && tab.url.includes("youtube.com/watch")) {
          if (this.logger) {
            this.logger.debug(`Tab ${tabId} activated`);
          }

          await this.activateTab(tabId);
          await this.syncTabState(tabId);
        }
      } catch (error) {
        if (this.logger) {
          this.logger.warn(
            `Error handling tab activation for tab ${tabId}`,
            error
          );
        }
      }
    });

    // タブ削除時のリスナー
    chrome.tabs.onRemoved.addListener(async (tabId) => {
      const state = this.stateStore.getState();
      if (state.tabs.tabStates.has(tabId)) {
        if (this.logger) {
          this.logger.debug(`Tab ${tabId} removed`);
        }

        await this.unregisterTab(tabId);
      }
    });
  }

  /**
   * タブ情報を取得
   * @param {number} tabId - タブID
   * @returns {Promise<Object|null>} タブ情報
   */
  async getTabInfo(tabId) {
    return new Promise((resolve) => {
      if (typeof chrome === "undefined" || !chrome.tabs) {
        resolve(null);
        return;
      }

      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError) {
          if (this.logger) {
            this.logger.warn(
              `Error getting tab info for tab ${tabId}`,
              chrome.runtime.lastError
            );
          }
          resolve(null);
          return;
        }

        resolve(tab);
      });
    });
  }

  /**
   * 現在のアクティブタブを取得
   */
  async getCurrentActiveTab() {
    if (typeof chrome === "undefined" || !chrome.tabs) {
      return;
    }

    try {
      const tabs = await new Promise((resolve) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (chrome.runtime.lastError) {
            if (this.logger) {
              this.logger.warn(
                "Error querying active tab",
                chrome.runtime.lastError
              );
            }
            resolve([]);
            return;
          }

          resolve(tabs);
        });
      });

      if (tabs && tabs.length > 0) {
        const activeTab = tabs[0];
        if (activeTab.url && activeTab.url.includes("youtube.com/watch")) {
          await this.activateTab(activeTab.id);
          await this.registerTab(activeTab.id, activeTab);
        }
      }
    } catch (error) {
      if (this.logger) {
        this.logger.error("Error getting current active tab", error);
      }

      if (this.errorHandler) {
        this.errorHandler.handleError(error, {
          context: { operation: "getCurrentActiveTab" },
        });
      }
    }
  }

  /**
   * タブを登録
   * @param {number} tabId - タブID
   * @param {Object} tab - タブ情報
   */
  async registerTab(tabId, tab) {
    try {
      // 既に登録されているか確認
      const state = this.stateStore.getState();
      const isRegistered = state.tabs.tabStates.has(tabId);

      // タブ登録アクションをディスパッチ
      await this.stateStore.dispatch(
        ActionCreator.registerTab(tabId, {
          url: tab.url,
          title: tab.title || "",
        })
      );

      if (this.logger) {
        this.logger.debug(
          `Tab ${tabId} ${isRegistered ? "updated" : "registered"}`,
          {
            url: tab.url,
            title: tab.title,
          }
        );
      }

      // タブにメッセージを送信して状態を同期
      await this.notifyTab(tabId);
    } catch (error) {
      if (this.logger) {
        this.logger.error(`Error registering tab ${tabId}`, error);
      }

      if (this.errorHandler) {
        this.errorHandler.handleError(error, {
          context: { operation: "registerTab", tabId, tab },
        });
      }
    }
  }

  /**
   * タブの登録を解除
   * @param {number} tabId - タブID
   */
  async unregisterTab(tabId) {
    try {
      // タブ登録解除アクションをディスパッチ
      await this.stateStore.dispatch(ActionCreator.unregisterTab(tabId));

      if (this.logger) {
        this.logger.debug(`Tab ${tabId} unregistered`);
      }
    } catch (error) {
      if (this.logger) {
        this.logger.error(`Error unregistering tab ${tabId}`, error);
      }

      if (this.errorHandler) {
        this.errorHandler.handleError(error, {
          context: { operation: "unregisterTab", tabId },
        });
      }
    }
  }

  /**
   * アクティブタブを設定
   * @param {number} tabId - タブID
   */
  async activateTab(tabId) {
    try {
      // タブアクティブ化アクションをディスパッチ
      await this.stateStore.dispatch(ActionCreator.activateTab(tabId));

      if (this.logger) {
        this.logger.debug(`Active tab set to ${tabId}`);
      }
    } catch (error) {
      if (this.logger) {
        this.logger.error(`Error activating tab ${tabId}`, error);
      }

      if (this.errorHandler) {
        this.errorHandler.handleError(error, {
          context: { operation: "activateTab", tabId },
        });
      }
    }
  }

  /**
   * タブの状態を同期
   * @param {number} tabId - タブID
   */
  async syncTabState(tabId) {
    try {
      // 同期ロックを取得
      if (!this.acquireLock(`sync:${tabId}`)) {
        if (this.logger) {
          this.logger.debug(
            `Sync for tab ${tabId} is already in progress, skipping`
          );
        }
        return;
      }

      // タブ同期アクションをディスパッチ
      await this.stateStore.dispatch(ActionCreator.syncTab(tabId));

      // タブにメッセージを送信して状態を同期
      await this.notifyTab(tabId);

      if (this.logger) {
        this.logger.debug(`Tab ${tabId} state synced`);
      }

      // ロックを解放
      this.releaseLock(`sync:${tabId}`);
    } catch (error) {
      // ロックを解放
      this.releaseLock(`sync:${tabId}`);

      if (this.logger) {
        this.logger.error(`Error syncing tab ${tabId}`, error);
      }

      if (this.errorHandler) {
        this.errorHandler.handleError(error, {
          context: { operation: "syncTabState", tabId },
        });
      }
    }
  }

  /**
   * 全てのタブの状態を同期
   */
  async syncAllTabs() {
    try {
      // 同期ロックを取得
      if (!this.acquireLock("syncAll")) {
        if (this.logger) {
          this.logger.debug(
            "Sync for all tabs is already in progress, skipping"
          );
        }
        return;
      }

      const state = this.stateStore.getState();
      const tabIds = Array.from(state.tabs.tabStates.keys());

      if (this.logger) {
        this.logger.debug(`Syncing all tabs (${tabIds.length})`);
      }

      // 各タブを同期
      for (const tabId of tabIds) {
        await this.syncTabState(tabId);
      }

      // ロックを解放
      this.releaseLock("syncAll");
    } catch (error) {
      // ロックを解放
      this.releaseLock("syncAll");

      if (this.logger) {
        this.logger.error("Error syncing all tabs", error);
      }

      if (this.errorHandler) {
        this.errorHandler.handleError(error, {
          context: { operation: "syncAllTabs" },
        });
      }
    }
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
      const state = this.stateStore.getState();
      if (state.tabs.tabStates.size > 0) {
        if (this.logger) {
          this.logger.debug(
            `Periodic sync for ${state.tabs.tabStates.size} tabs`
          );
        }
        this.syncAllTabs();
      }
    }, this.syncIntervalTime);

    if (this.logger) {
      this.logger.info(`Periodic sync started (${this.syncIntervalTime}ms)`);
    }
  }

  /**
   * 定期的な状態同期を停止
   */
  stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;

      if (this.logger) {
        this.logger.info("Periodic sync stopped");
      }
    }
  }

  /**
   * タブにメッセージを送信
   * @param {number} tabId - タブID
   */
  async notifyTab(tabId) {
    if (typeof chrome === "undefined" || !chrome.tabs) {
      return;
    }

    try {
      const state = this.stateStore.getState();

      // タブが存在するか確認
      if (!state.tabs.tabStates.has(tabId)) {
        if (this.logger) {
          this.logger.warn(`Cannot notify unknown tab ${tabId}`);
        }
        return;
      }

      const tabState = state.tabs.tabStates.get(tabId);

      // メッセージを送信
      await new Promise((resolve) => {
        chrome.tabs.sendMessage(
          tabId,
          {
            action: "syncState",
            state: {
              theaterModeEnabled: state.theaterMode.isEnabled,
              opacity: state.theaterMode.opacity,
              isActive: tabState.isActive,
              lastSync: tabState.lastSync,
            },
          },
          (response) => {
            if (chrome.runtime.lastError) {
              if (this.logger) {
                this.logger.warn(
                  `Error sending message to tab ${tabId}`,
                  chrome.runtime.lastError
                );
              }
              resolve();
              return;
            }

            if (this.logger && response) {
              this.logger.debug(`Tab ${tabId} response:`, response);
            }

            resolve(response);
          }
        );
      });
    } catch (error) {
      if (this.logger) {
        this.logger.error(`Error notifying tab ${tabId}`, error);
      }

      if (this.errorHandler) {
        this.errorHandler.handleError(error, {
          context: { operation: "notifyTab", tabId },
        });
      }
    }
  }

  /**
   * タブの状態を更新
   * @param {number} tabId - タブID
   * @param {Object} stateUpdate - 更新する状態
   */
  async updateTabState(tabId, stateUpdate) {
    try {
      const state = this.stateStore.getState();

      // タブが存在するか確認
      if (!state.tabs.tabStates.has(tabId)) {
        if (this.logger) {
          this.logger.warn(`Cannot update unknown tab ${tabId}`);
        }
        return false;
      }

      // タブ更新アクションをディスパッチ
      await this.stateStore.dispatch(
        ActionCreator.updateTab(tabId, stateUpdate)
      );

      if (this.logger) {
        this.logger.debug(`Tab ${tabId} state updated`, stateUpdate);
      }

      return true;
    } catch (error) {
      if (this.logger) {
        this.logger.error(`Error updating tab ${tabId}`, error);
      }

      if (this.errorHandler) {
        this.errorHandler.handleError(error, {
          context: { operation: "updateTabState", tabId, stateUpdate },
        });
      }

      return false;
    }
  }

  /**
   * タブの状態を取得
   * @param {number} tabId - タブID
   * @returns {Object|null} タブの状態またはnull
   */
  getTabState(tabId) {
    const state = this.stateStore.getState();
    return state.tabs.tabStates.has(tabId)
      ? { ...state.tabs.tabStates.get(tabId) }
      : null;
  }

  /**
   * 全てのタブの状態を取得
   * @returns {Object} タブIDをキーとする状態オブジェクト
   */
  getAllTabStates() {
    const state = this.stateStore.getState();
    const states = {};

    for (const [tabId, tabState] of state.tabs.tabStates.entries()) {
      states[tabId] = { ...tabState };
    }

    return states;
  }

  /**
   * アクティブタブの状態を取得
   * @returns {Object|null} アクティブタブの状態またはnull
   */
  getActiveTabState() {
    const state = this.stateStore.getState();
    return state.tabs.activeTabId &&
      state.tabs.tabStates.has(state.tabs.activeTabId)
      ? { ...state.tabs.tabStates.get(state.tabs.activeTabId) }
      : null;
  }

  /**
   * ロックを取得
   * @param {string} lockId - ロックID
   * @returns {boolean} ロック取得成功かどうか
   * @private
   */
  acquireLock(lockId) {
    const now = Date.now();

    // 既存のロックをチェック
    if (this.locks.has(lockId)) {
      const lockTime = this.locks.get(lockId);

      // ロックがタイムアウトしていない場合
      if (now - lockTime < this.lockTimeout) {
        return false;
      }

      // タイムアウトしたロックを解放
      if (this.logger) {
        this.logger.warn(`Lock ${lockId} timed out, releasing`);
      }
    }

    // ロックを取得
    this.locks.set(lockId, now);
    return true;
  }

  /**
   * ロックを解放
   * @param {string} lockId - ロックID
   * @private
   */
  releaseLock(lockId) {
    this.locks.delete(lockId);
  }

  /**
   * リソースをクリーンアップ
   */
  dispose() {
    this.stopPeriodicSync();
    this.locks.clear();

    if (this.logger) {
      this.logger.info("TabStateManager disposed");
    }
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
