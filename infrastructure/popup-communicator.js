/**
 * PopupCommunicator
 * ポップアップとバックグラウンド間の通信を専門とするクラス
 * 新しいMessageBusシステムとの統合と通信エラーの適切なハンドリングを実装
 */

// 依存関係のインポート
let Logger,
  ErrorHandler,
  Result,
  AppError,
  ErrorType,
  MessageBus,
  MessageType,
  MessageTarget,
  MessagePriority;

// Node.js環境での依存関係の解決
if (typeof require !== "undefined") {
  ({ Logger } = require("./logger.js"));
  ({
    ErrorHandler,
    Result,
    AppError,
    ErrorType,
  } = require("./error-handler.js"));
  ({
    MessageBus,
    MessageType,
    MessageTarget,
    MessagePriority,
  } = require("./message-bus.js"));
}

/**
 * 通信設定
 * @typedef {Object} CommunicationConfig
 * @property {number} defaultTimeout - デフォルトタイムアウト時間（ミリ秒）
 * @property {number} maxRetries - 最大リトライ回数
 * @property {number} retryDelay - リトライ間隔（ミリ秒）
 * @property {boolean} enableHeartbeat - ハートビート機能を有効にするかどうか
 * @property {number} heartbeatInterval - ハートビート間隔（ミリ秒）
 */

/**
 * 通信状態
 * @typedef {Object} CommunicationState
 * @property {boolean} isConnected - 接続状態
 * @property {string} connectionStatus - 接続状態の詳細
 * @property {number} lastHeartbeat - 最後のハートビート時刻
 * @property {number} messagesSent - 送信メッセージ数
 * @property {number} messagesReceived - 受信メッセージ数
 * @property {number} errors - エラー数
 * @property {Array} recentErrors - 最近のエラー履歴
 */

/**
 * PopupCommunicator
 * ポップアップとバックグラウンド間の通信を専門とするクラス
 */
class PopupCommunicator {
  /**
   * PopupCommunicatorインスタンスを作成
   * @param {Object} dependencies - 依存関係
   * @param {MessageBus} dependencies.messageBus - メッセージバス
   * @param {Logger} [dependencies.logger] - ロガーインスタンス
   * @param {ErrorHandler} [dependencies.errorHandler] - エラーハンドラーインスタンス
   * @param {CommunicationConfig} [dependencies.config] - 通信設定
   */
  constructor(dependencies) {
    this.messageBus = dependencies.messageBus;
    this.logger = dependencies.logger;
    this.errorHandler = dependencies.errorHandler;

    // 通信設定
    this.config = {
      defaultTimeout: 5000,
      maxRetries: 3,
      retryDelay: 1000,
      enableHeartbeat: true,
      heartbeatInterval: 30000,
      ...dependencies.config,
    };

    // 通信状態
    this.state = {
      isConnected: false,
      connectionStatus: "disconnected",
      lastHeartbeat: 0,
      messagesSent: 0,
      messagesReceived: 0,
      errors: 0,
      recentErrors: [],
    };

    // 内部状態
    this.isInitialized = false;
    this.heartbeatTimer = null;
    this.connectionCheckTimer = null;
    this.pendingMessages = new Map(); // messageId -> { resolve, reject, timeout }
    this.messageHandlers = new Map(); // messageType -> handler
    this.connectionListeners = new Set();

    // Chrome拡張機能の環境チェック
    this.isChromeExtension = typeof chrome !== "undefined" && chrome.runtime;

    if (this.logger) {
      this.logger.debug("PopupCommunicator initialized", {
        config: this.config,
        isChromeExtension: this.isChromeExtension,
      });
    }
  }

  /**
   * PopupCommunicatorを初期化
   * @returns {Promise<Result<void>>} 初期化結果
   */
  async initialize() {
    try {
      if (this.isInitialized) {
        return Result.success();
      }

      if (this.logger) {
        this.logger.info("Initializing PopupCommunicator");
      }

      // メッセージハンドラーを登録
      this._registerMessageHandlers();

      // 接続状態を確認
      await this._checkConnection();

      // ハートビート機能を開始
      if (this.config.enableHeartbeat) {
        this._startHeartbeat();
      }

      // 定期的な接続チェックを開始
      this._startConnectionCheck();

      this.isInitialized = true;

      if (this.logger) {
        this.logger.info("PopupCommunicator initialization completed", {
          connectionStatus: this.state.connectionStatus,
        });
      }

      return Result.success();
    } catch (error) {
      const appError = new AppError("Failed to initialize PopupCommunicator", {
        type: ErrorType.INITIALIZATION_ERROR,
        cause: error,
      });

      if (this.errorHandler) {
        this.errorHandler.handleError(appError);
      }

      return Result.failure(appError);
    }
  }

  /**
   * PopupCommunicatorを破棄
   * @returns {Promise<Result<void>>} 破棄結果
   */
  async dispose() {
    try {
      if (this.logger) {
        this.logger.info("Disposing PopupCommunicator");
      }

      // タイマーを停止
      this._stopHeartbeat();
      this._stopConnectionCheck();

      // 保留中のメッセージをキャンセル
      for (const [
        messageId,
        { reject, timeout },
      ] of this.pendingMessages.entries()) {
        clearTimeout(timeout);
        reject(new Error("PopupCommunicator disposed"));
        this.pendingMessages.delete(messageId);
      }

      // リスナーをクリア
      this.connectionListeners.clear();
      this.messageHandlers.clear();

      // 状態をリセット
      this.state.isConnected = false;
      this.state.connectionStatus = "disconnected";
      this.isInitialized = false;

      return Result.success();
    } catch (error) {
      const appError = new AppError("Failed to dispose PopupCommunicator", {
        type: ErrorType.INTERNAL_ERROR,
        cause: error,
      });

      if (this.errorHandler) {
        this.errorHandler.handleError(appError);
      }

      return Result.failure(appError);
    }
  }

  /**
   * バックグラウンドにメッセージを送信
   * @param {string} type - メッセージタイプ
   * @param {Object} [data={}] - メッセージデータ
   * @param {Object} [options={}] - 送信オプション
   * @param {number} [options.timeout] - タイムアウト時間
   * @param {boolean} [options.needsResponse=false] - 応答が必要かどうか
   * @param {number} [options.priority] - メッセージ優先度
   * @param {number} [options.retries] - リトライ回数
   * @returns {Promise<Result<any>>} 送信結果
   */
  async sendToBackground(type, data = {}, options = {}) {
    if (!this.isInitialized) {
      return Result.failure("PopupCommunicator not initialized", {
        type: ErrorType.INITIALIZATION_ERROR,
      });
    }

    try {
      const sendOptions = {
        target: MessageTarget.BACKGROUND,
        timeout: options.timeout || this.config.defaultTimeout,
        needsResponse: options.needsResponse || false,
        priority: options.priority || MessagePriority.NORMAL,
      };

      if (this.logger) {
        this.logger.debug("Sending message to background", {
          type,
          data,
          options: sendOptions,
        });
      }

      // リトライ機能付きで送信
      const result = await this._sendWithRetry(
        type,
        data,
        sendOptions,
        options.retries
      );

      if (result.isSuccess()) {
        this.state.messagesSent++;
        this._updateConnectionStatus(true, "connected");
      } else {
        this._recordError(result.error);
        this._updateConnectionStatus(false, "error");
      }

      return result;
    } catch (error) {
      const appError = new AppError("Failed to send message to background", {
        type: ErrorType.COMMUNICATION_ERROR,
        cause: error,
        context: { messageType: type },
      });

      this._recordError(appError);

      if (this.errorHandler) {
        this.errorHandler.handleError(appError);
      }

      return Result.failure(appError);
    }
  }

  /**
   * アクティブなタブにメッセージを送信
   * @param {string} type - メッセージタイプ
   * @param {Object} [data={}] - メッセージデータ
   * @param {Object} [options={}] - 送信オプション
   * @returns {Promise<Result<any>>} 送信結果
   */
  async sendToActiveTab(type, data = {}, options = {}) {
    if (!this.isInitialized) {
      return Result.failure("PopupCommunicator not initialized", {
        type: ErrorType.INITIALIZATION_ERROR,
      });
    }

    try {
      // アクティブなタブを取得
      const activeTabResult = await this._getActiveTab();
      if (activeTabResult.isFailure()) {
        return activeTabResult;
      }

      const activeTab = activeTabResult.data;
      if (!activeTab.url || !activeTab.url.includes("youtube.com")) {
        return Result.failure("Active tab is not a YouTube page", {
          type: ErrorType.VALIDATION_ERROR,
          context: { url: activeTab.url },
        });
      }

      const sendOptions = {
        target: `${MessageTarget.TAB}:${activeTab.id}`,
        timeout: options.timeout || this.config.defaultTimeout,
        needsResponse: options.needsResponse || false,
        priority: options.priority || MessagePriority.NORMAL,
      };

      if (this.logger) {
        this.logger.debug("Sending message to active tab", {
          type,
          data,
          tabId: activeTab.id,
          options: sendOptions,
        });
      }

      // バックグラウンド経由でタブにメッセージを送信
      const result = await this._sendWithRetry(
        MessageType.CUSTOM,
        {
          action: "relayMessageToTab",
          tabId: activeTab.id,
          message: { type, data },
        },
        sendOptions,
        options.retries
      );

      if (result.isSuccess()) {
        this.state.messagesSent++;
      } else {
        this._recordError(result.error);
      }

      return result;
    } catch (error) {
      const appError = new AppError("Failed to send message to active tab", {
        type: ErrorType.COMMUNICATION_ERROR,
        cause: error,
        context: { messageType: type },
      });

      this._recordError(appError);

      if (this.errorHandler) {
        this.errorHandler.handleError(appError);
      }

      return Result.failure(appError);
    }
  }

  /**
   * 設定を取得
   * @returns {Promise<Result<Object>>} 設定取得結果
   */
  async getSettings() {
    return this.sendToBackground(
      MessageType.SETTINGS_GET,
      {},
      {
        needsResponse: true,
        timeout: 3000,
      }
    );
  }

  /**
   * 設定を保存
   * @param {Object} settings - 保存する設定
   * @returns {Promise<Result<void>>} 保存結果
   */
  async saveSettings(settings) {
    return this.sendToBackground(MessageType.SETTINGS_SET, settings, {
      needsResponse: true,
      timeout: 3000,
    });
  }

  /**
   * シアターモードを切り替え
   * @returns {Promise<Result<boolean>>} 切り替え結果
   */
  async toggleTheaterMode() {
    return this.sendToBackground(
      MessageType.THEATER_MODE_TOGGLE,
      {},
      {
        needsResponse: true,
        timeout: 5000,
      }
    );
  }

  /**
   * 透明度を更新
   * @param {number} opacity - 透明度
   * @returns {Promise<Result<void>>} 更新結果
   */
  async updateOpacity(opacity) {
    const result = await this.sendToBackground(
      MessageType.OPACITY_CHANGE,
      { value: opacity },
      {
        needsResponse: false,
      }
    );

    if (result.isSuccess()) {
      // アクティブなタブにも通知
      await this.sendToActiveTab(MessageType.OPACITY_CHANGE, {
        value: opacity,
      });
    }

    return result;
  }

  /**
   * メッセージハンドラーを登録
   * @param {string} type - メッセージタイプ
   * @param {Function} handler - ハンドラー関数
   * @returns {Function} ハンドラー削除関数
   */
  registerMessageHandler(type, handler) {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }

    this.messageHandlers.get(type).add(handler);

    // ハンドラー削除関数を返す
    return () => {
      const handlers = this.messageHandlers.get(type);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.messageHandlers.delete(type);
        }
      }
    };
  }

  /**
   * 接続状態変更リスナーを登録
   * @param {Function} listener - リスナー関数
   * @returns {Function} リスナー削除関数
   */
  addConnectionListener(listener) {
    this.connectionListeners.add(listener);

    // 現在の状態を即座に通知
    listener(this.state.isConnected, this.state.connectionStatus);

    return () => this.connectionListeners.delete(listener);
  }

  /**
   * 通信状態を取得
   * @returns {CommunicationState} 通信状態
   */
  getState() {
    return { ...this.state };
  }

  /**
   * 通信統計をリセット
   */
  resetStats() {
    this.state.messagesSent = 0;
    this.state.messagesReceived = 0;
    this.state.errors = 0;
    this.state.recentErrors = [];
  }

  // プライベートメソッド

  /**
   * メッセージハンドラーを登録
   * @private
   */
  _registerMessageHandlers() {
    // システム準備完了メッセージ
    this.messageBus.registerHandler(MessageType.SYSTEM_READY, (message) => {
      this._updateConnectionStatus(true, "connected");
      this.state.messagesReceived++;
    });

    // システムエラーメッセージ
    this.messageBus.registerHandler(MessageType.SYSTEM_ERROR, (message) => {
      this._handleSystemError(message);
      this.state.messagesReceived++;
    });

    // 設定変更通知
    this.messageBus.registerHandler(MessageType.SETTINGS_CHANGED, (message) => {
      this._handleSettingsChanged(message);
      this.state.messagesReceived++;
    });

    // UI更新メッセージ
    this.messageBus.registerHandler(MessageType.UI_UPDATE, (message) => {
      this._handleUIUpdate(message);
      this.state.messagesReceived++;
    });

    // カスタムメッセージハンドラー
    this.messageBus.registerHandler(MessageType.CUSTOM, (message) => {
      this._handleCustomMessage(message);
      this.state.messagesReceived++;
    });
  }

  /**
   * リトライ機能付きでメッセージを送信
   * @param {string} type - メッセージタイプ
   * @param {Object} data - メッセージデータ
   * @param {Object} options - 送信オプション
   * @param {number} [maxRetries] - 最大リトライ回数
   * @returns {Promise<Result<any>>} 送信結果
   * @private
   */
  async _sendWithRetry(type, data, options, maxRetries) {
    const retries =
      maxRetries !== undefined ? maxRetries : this.config.maxRetries;
    let lastError = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const result = await this.messageBus.send(type, data, options);

        if (result.isSuccess()) {
          if (attempt > 0 && this.logger) {
            this.logger.info(
              `Message sent successfully after ${attempt} retries`,
              {
                type,
                attempt,
              }
            );
          }
          return result;
        }

        lastError = result.error;

        // 最後の試行でない場合はリトライ
        if (attempt < retries) {
          const delay = this.config.retryDelay * Math.pow(2, attempt); // 指数バックオフ
          if (this.logger) {
            this.logger.debug(`Retrying message send in ${delay}ms`, {
              type,
              attempt: attempt + 1,
              maxRetries: retries,
            });
          }
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      } catch (error) {
        lastError = error;
        if (attempt < retries) {
          const delay = this.config.retryDelay * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    return Result.failure(lastError || "Max retries exceeded", {
      type: ErrorType.COMMUNICATION_ERROR,
      context: { messageType: type, attempts: retries + 1 },
    });
  }

  /**
   * 接続状態を確認
   * @returns {Promise<void>}
   * @private
   */
  async _checkConnection() {
    try {
      if (!this.isChromeExtension) {
        this._updateConnectionStatus(false, "not_chrome_extension");
        return;
      }

      // バックグラウンドスクリプトとの通信をテスト
      const testResult = await this.messageBus.send(
        MessageType.SYSTEM_INIT,
        { source: "popup" },
        { needsResponse: true, timeout: 2000 }
      );

      if (testResult.isSuccess()) {
        this._updateConnectionStatus(true, "connected");
      } else {
        this._updateConnectionStatus(false, "background_unreachable");
      }
    } catch (error) {
      this._updateConnectionStatus(false, "connection_error");
      if (this.logger) {
        this.logger.warn("Connection check failed", error);
      }
    }
  }

  /**
   * アクティブなタブを取得
   * @returns {Promise<Result<Object>>} アクティブタブ取得結果
   * @private
   */
  async _getActiveTab() {
    if (!this.isChromeExtension || !chrome.tabs) {
      return Result.failure("Chrome tabs API not available", {
        type: ErrorType.PERMISSION_ERROR,
      });
    }

    try {
      return new Promise((resolve) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (chrome.runtime.lastError) {
            resolve(
              Result.failure(chrome.runtime.lastError.message, {
                type: ErrorType.COMMUNICATION_ERROR,
              })
            );
          } else if (tabs && tabs.length > 0) {
            resolve(Result.success(tabs[0]));
          } else {
            resolve(
              Result.failure("No active tab found", {
                type: ErrorType.ELEMENT_NOT_FOUND,
              })
            );
          }
        });
      });
    } catch (error) {
      return Result.failure("Failed to get active tab", {
        type: ErrorType.COMMUNICATION_ERROR,
        cause: error,
      });
    }
  }

  /**
   * ハートビートを開始
   * @private
   */
  _startHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    this.heartbeatTimer = setInterval(async () => {
      try {
        const result = await this.messageBus.send(
          MessageType.SYSTEM_INIT,
          { source: "popup", heartbeat: true },
          { needsResponse: false, timeout: 1000 }
        );

        if (result.isSuccess()) {
          this.state.lastHeartbeat = Date.now();
          if (!this.state.isConnected) {
            this._updateConnectionStatus(true, "connected");
          }
        } else {
          if (this.state.isConnected) {
            this._updateConnectionStatus(false, "heartbeat_failed");
          }
        }
      } catch (error) {
        if (this.logger) {
          this.logger.debug("Heartbeat failed", error);
        }
        if (this.state.isConnected) {
          this._updateConnectionStatus(false, "heartbeat_error");
        }
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * ハートビートを停止
   * @private
   */
  _stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * 接続チェックを開始
   * @private
   */
  _startConnectionCheck() {
    if (this.connectionCheckTimer) {
      clearInterval(this.connectionCheckTimer);
    }

    this.connectionCheckTimer = setInterval(async () => {
      await this._checkConnection();
    }, 10000); // 10秒間隔
  }

  /**
   * 接続チェックを停止
   * @private
   */
  _stopConnectionCheck() {
    if (this.connectionCheckTimer) {
      clearInterval(this.connectionCheckTimer);
      this.connectionCheckTimer = null;
    }
  }

  /**
   * 接続状態を更新
   * @param {boolean} isConnected - 接続状態
   * @param {string} status - 状態の詳細
   * @private
   */
  _updateConnectionStatus(isConnected, status) {
    const previousStatus = this.state.isConnected;
    this.state.isConnected = isConnected;
    this.state.connectionStatus = status;

    // 状態が変わった場合はリスナーに通知
    if (previousStatus !== isConnected) {
      if (this.logger) {
        this.logger.info("Connection status changed", {
          isConnected,
          status,
          previousStatus,
        });
      }

      for (const listener of this.connectionListeners) {
        try {
          listener(isConnected, status);
        } catch (error) {
          if (this.logger) {
            this.logger.warn("Error in connection listener", error);
          }
        }
      }
    }
  }

  /**
   * エラーを記録
   * @param {Error} error - エラー
   * @private
   */
  _recordError(error) {
    this.state.errors++;
    this.state.recentErrors.push({
      error: error.message || String(error),
      timestamp: Date.now(),
    });

    // エラー履歴のサイズを制限
    if (this.state.recentErrors.length > 10) {
      this.state.recentErrors.shift();
    }
  }

  /**
   * システムエラーメッセージを処理
   * @param {Message} message - メッセージ
   * @private
   */
  _handleSystemError(message) {
    const { error } = message.data;
    this._recordError(error);

    // 登録されたハンドラーに通知
    const handlers = this.messageHandlers.get(MessageType.SYSTEM_ERROR);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(message);
        } catch (handlerError) {
          if (this.logger) {
            this.logger.warn("Error in system error handler", handlerError);
          }
        }
      }
    }
  }

  /**
   * 設定変更メッセージを処理
   * @param {Message} message - メッセージ
   * @private
   */
  _handleSettingsChanged(message) {
    // 登録されたハンドラーに通知
    const handlers = this.messageHandlers.get(MessageType.SETTINGS_CHANGED);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(message);
        } catch (error) {
          if (this.logger) {
            this.logger.warn("Error in settings changed handler", error);
          }
        }
      }
    }
  }

  /**
   * UI更新メッセージを処理
   * @param {Message} message - メッセージ
   * @private
   */
  _handleUIUpdate(message) {
    // 登録されたハンドラーに通知
    const handlers = this.messageHandlers.get(MessageType.UI_UPDATE);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(message);
        } catch (error) {
          if (this.logger) {
            this.logger.warn("Error in UI update handler", error);
          }
        }
      }
    }
  }

  /**
   * カスタムメッセージを処理
   * @param {Message} message - メッセージ
   * @private
   */
  _handleCustomMessage(message) {
    // 登録されたハンドラーに通知
    const handlers = this.messageHandlers.get(MessageType.CUSTOM);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(message);
        } catch (error) {
          if (this.logger) {
            this.logger.warn("Error in custom message handler", error);
          }
        }
      }
    }
  }
}

// CommonJS/ES6 両対応のエクスポート
if (typeof module !== "undefined" && module.exports) {
  module.exports = { PopupCommunicator };
} else if (typeof window !== "undefined") {
  window.PopupCommunicator = PopupCommunicator;
}
