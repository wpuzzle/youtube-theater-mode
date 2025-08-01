/**
 * ContentScriptCommunicator
 * コンテンツスクリプトとバックグラウンド間の通信を専門とするクラス
 * 新しい MessageBus システムとの統合、通信の信頼性とエラーハンドリングを提供
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
  RetryManager;

// Node.js環境での依存関係の解決
if (typeof require !== "undefined") {
  ({ Logger } = require("./logger.js"));
  ({
    ErrorHandler,
    Result,
    AppError,
    ErrorType,
    RetryManager,
  } = require("./error-handler.js"));
  ({ MessageBus, MessageType, MessageTarget } = require("./message-bus.js"));
}

/**
 * 通信状態の定義
 * @readonly
 * @enum {string}
 */
const CommunicationState = {
  DISCONNECTED: "disconnected",
  CONNECTING: "connecting",
  CONNECTED: "connected",
  RECONNECTING: "reconnecting",
  ERROR: "error",
};

/**
 * メッセージの優先度
 * @readonly
 * @enum {number}
 */
const MessagePriority = {
  CRITICAL: 0, // 重要なシステムメッセージ
  HIGH: 1, // 高優先度（ユーザー操作など）
  NORMAL: 2, // 通常の優先度
  LOW: 3, // 低優先度（統計情報など）
};

/**
 * 通信統計情報
 * @typedef {Object} CommunicationStats
 * @property {number} messagesSent - 送信メッセージ数
 * @property {number} messagesReceived - 受信メッセージ数
 * @property {number} messagesSucceeded - 成功メッセージ数
 * @property {number} messagesFailed - 失敗メッセージ数
 * @property {number} averageResponseTime - 平均応答時間
 * @property {number} connectionAttempts - 接続試行回数
 * @property {number} reconnections - 再接続回数
 * @property {Date} lastSuccessfulMessage - 最後の成功メッセージ時刻
 * @property {Date} lastFailedMessage - 最後の失敗メッセージ時刻
 */

/**
 * ContentScriptCommunicator
 * コンテンツスクリプトとバックグラウンド間の通信を管理するクラス
 */
class ContentScriptCommunicator {
  /**
   * ContentScriptCommunicatorインスタンスを作成
   * @param {Object} dependencies - 依存関係オブジェクト
   * @param {Logger} dependencies.logger - ロガーインスタンス
   * @param {ErrorHandler} dependencies.errorHandler - エラーハンドラーインスタンス
   * @param {MessageBus} dependencies.messageBus - メッセージバスインスタンス
   * @param {Object} [options] - オプション
   * @param {number} [options.connectionTimeout=5000] - 接続タイムアウト時間（ミリ秒）
   * @param {number} [options.messageTimeout=10000] - メッセージタイムアウト時間（ミリ秒）
   * @param {number} [options.maxRetries=3] - 最大リトライ回数
   * @param {number} [options.reconnectDelay=1000] - 再接続遅延時間（ミリ秒）
   * @param {boolean} [options.enableHeartbeat=true] - ハートビート機能の有効化
   * @param {number} [options.heartbeatInterval=30000] - ハートビート間隔（ミリ秒）
   */
  constructor(dependencies, options = {}) {
    // 依存関係の検証
    this._validateDependencies(dependencies);

    // 依存関係の設定
    this.logger = dependencies.logger;
    this.errorHandler = dependencies.errorHandler;
    this.messageBus = dependencies.messageBus;

    // オプションの設定
    this.options = {
      connectionTimeout: options.connectionTimeout || 5000,
      messageTimeout: options.messageTimeout || 10000,
      maxRetries: options.maxRetries || 3,
      reconnectDelay: options.reconnectDelay || 1000,
      enableHeartbeat: options.enableHeartbeat !== false,
      heartbeatInterval: options.heartbeatInterval || 30000,
      ...options,
    };

    // 内部状態
    this.state = CommunicationState.DISCONNECTED;
    this.initialized = false;
    this.connectionId = null;
    this.lastHeartbeat = null;

    // 通信管理
    this.pendingMessages = new Map();
    this.messageQueue = [];
    this.connectionPromise = null;
    this.heartbeatTimer = null;
    this.reconnectTimer = null;

    // 統計情報
    this.stats = {
      messagesSent: 0,
      messagesReceived: 0,
      messagesSucceeded: 0,
      messagesFailed: 0,
      averageResponseTime: 0,
      connectionAttempts: 0,
      reconnections: 0,
      lastSuccessfulMessage: null,
      lastFailedMessage: null,
    };

    // リトライマネージャー
    this.retryManager = new RetryManager({
      maxRetries: this.options.maxRetries,
      baseDelay: 500,
      maxDelay: 5000,
      logger: this.logger,
    });

    // イベントリスナー
    this.eventListeners = new Set();
    this.messageHandlers = new Map();

    this.logger.info("ContentScriptCommunicator created", {
      options: this.options,
    });
  }

  /**
   * 依存関係を検証
   * @param {Object} dependencies - 検証対象の依存関係
   * @throws {AppError} 依存関係が不正な場合
   * @private
   */
  _validateDependencies(dependencies) {
    const required = ["logger", "errorHandler", "messageBus"];

    for (const dep of required) {
      if (!dependencies[dep]) {
        throw new AppError(`Required dependency '${dep}' is missing`, {
          type: ErrorType.INITIALIZATION_ERROR,
          context: { missingDependency: dep },
        });
      }
    }
  }

  /**
   * ContentScriptCommunicatorを初期化
   * @returns {Promise<Result<boolean>>} 初期化結果
   */
  async initialize() {
    if (this.initialized) {
      return Result.success(true);
    }

    this.logger.info("Initializing ContentScriptCommunicator");

    try {
      // メッセージハンドラーを設定
      this._setupMessageHandlers();

      // Chrome拡張機能の通信リスナーを設定
      this._setupChromeListeners();

      // バックグラウンドとの接続を確立
      const connectionResult = await this._establishConnection();
      if (connectionResult.isFailure()) {
        return connectionResult;
      }

      // ハートビート機能を開始
      if (this.options.enableHeartbeat) {
        this._startHeartbeat();
      }

      this.initialized = true;
      this.logger.info("ContentScriptCommunicator initialized successfully", {
        connectionId: this.connectionId,
        state: this.state,
      });

      return Result.success(true);
    } catch (error) {
      return Result.failure(
        this.errorHandler.handleError(error, {
          type: ErrorType.INITIALIZATION_ERROR,
          context: { phase: "initialization" },
        })
      );
    }
  }

  /**
   * メッセージハンドラーを設定
   * @private
   */
  _setupMessageHandlers() {
    // システムメッセージハンドラー
    this.messageBus.registerHandler(
      MessageType.SYSTEM_READY,
      this._handleSystemReady.bind(this)
    );

    this.messageBus.registerHandler(
      MessageType.SYSTEM_ERROR,
      this._handleSystemError.bind(this)
    );

    // 接続関連メッセージハンドラー
    this.messageHandlers.set(
      "connection_established",
      this._handleConnectionEstablished.bind(this)
    );
    this.messageHandlers.set(
      "connection_lost",
      this._handleConnectionLost.bind(this)
    );
    this.messageHandlers.set(
      "heartbeat_response",
      this._handleHeartbeatResponse.bind(this)
    );

    this.logger.debug("Message handlers set up");
  }

  /**
   * Chrome拡張機能の通信リスナーを設定
   * @private
   */
  _setupChromeListeners() {
    if (
      typeof chrome !== "undefined" &&
      chrome.runtime &&
      chrome.runtime.onMessage
    ) {
      const messageListener = (message, sender, sendResponse) => {
        this._handleChromeMessage(message, sender, sendResponse);
        return true; // 非同期応答を有効化
      };

      chrome.runtime.onMessage.addListener(messageListener);

      // クリーンアップ用にリスナーを保存
      this.eventListeners.add(() => {
        chrome.runtime.onMessage.removeListener(messageListener);
      });

      // 接続切断の監視
      if (chrome.runtime.onDisconnect) {
        const disconnectListener = () => {
          this._handleConnectionLost();
        };

        chrome.runtime.onDisconnect.addListener(disconnectListener);

        this.eventListeners.add(() => {
          chrome.runtime.onDisconnect.removeListener(disconnectListener);
        });
      }

      this.logger.debug("Chrome message listeners set up");
    } else {
      this.logger.warn("Chrome runtime API not available");
    }
  }

  /**
   * バックグラウンドとの接続を確立
   * @returns {Promise<Result<boolean>>} 接続結果
   * @private
   */
  async _establishConnection() {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.state = CommunicationState.CONNECTING;
    this.stats.connectionAttempts++;

    this.logger.info("Establishing connection to background");

    this.connectionPromise = this.retryManager.withRetry(async () => {
      // 接続確立メッセージを送信
      const connectionMessage = {
        type: "establish_connection",
        data: {
          contentScript: true,
          timestamp: Date.now(),
          tabId: await this._getCurrentTabId(),
          url: window.location.href,
        },
      };

      const response = await this._sendChromeMessage(connectionMessage, {
        timeout: this.options.connectionTimeout,
      });

      if (response && response.success && response.connectionId) {
        this.connectionId = response.connectionId;
        this.state = CommunicationState.CONNECTED;
        this.logger.info("Connection established", {
          connectionId: this.connectionId,
        });
        return true;
      } else {
        throw new Error("Failed to establish connection");
      }
    });

    try {
      const result = await this.connectionPromise;
      this.connectionPromise = null;
      return Result.success(result.data);
    } catch (error) {
      this.connectionPromise = null;
      this.state = CommunicationState.ERROR;
      return Result.failure(
        this.errorHandler.handleError(error, {
          type: ErrorType.COMMUNICATION_ERROR,
          context: { phase: "connectionEstablishment" },
        })
      );
    }
  }

  /**
   * 現在のタブIDを取得
   * @returns {Promise<number|null>} タブID
   * @private
   */
  async _getCurrentTabId() {
    try {
      if (
        typeof chrome !== "undefined" &&
        chrome.tabs &&
        chrome.tabs.getCurrent
      ) {
        return new Promise((resolve) => {
          chrome.tabs.getCurrent((tab) => {
            resolve(tab ? tab.id : null);
          });
        });
      }
    } catch (error) {
      this.logger.warn("Failed to get current tab ID", { error });
    }
    return null;
  }

  /**
   * Chrome拡張機能メッセージを送信
   * @param {Object} message - 送信するメッセージ
   * @param {Object} [options] - 送信オプション
   * @returns {Promise<any>} 応答
   * @private
   */
  _sendChromeMessage(message, options = {}) {
    return new Promise((resolve, reject) => {
      const timeout = options.timeout || this.options.messageTimeout;
      let timeoutId;

      // タイムアウト設定
      if (timeout > 0) {
        timeoutId = setTimeout(() => {
          reject(new Error(`Message timeout after ${timeout}ms`));
        }, timeout);
      }

      try {
        chrome.runtime.sendMessage(message, (response) => {
          if (timeoutId) {
            clearTimeout(timeoutId);
          }

          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      } catch (error) {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        reject(error);
      }
    });
  }

  /**
   * Chrome拡張機能メッセージを処理
   * @param {Object} message - 受信メッセージ
   * @param {Object} sender - 送信者情報
   * @param {Function} sendResponse - 応答関数
   * @private
   */
  async _handleChromeMessage(message, sender, sendResponse) {
    this.stats.messagesReceived++;

    try {
      this.logger.debug("Received Chrome message", {
        type: message.type,
        sender: sender.id,
      });

      // メッセージハンドラーを実行
      const handler = this.messageHandlers.get(message.type);
      if (handler) {
        const result = await handler(message, sender);
        sendResponse({ success: true, data: result });
        this.stats.messagesSucceeded++;
        this.stats.lastSuccessfulMessage = new Date();
      } else {
        // MessageBusに転送
        await this.messageBus.receiveMessage(message, sender);
        sendResponse({ success: true });
        this.stats.messagesSucceeded++;
        this.stats.lastSuccessfulMessage = new Date();
      }
    } catch (error) {
      this.logger.error("Error handling Chrome message", {
        error,
        messageType: message.type,
      });

      this.stats.messagesFailed++;
      this.stats.lastFailedMessage = new Date();

      sendResponse({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * メッセージを送信
   * @param {string} type - メッセージタイプ
   * @param {Object} [data={}] - メッセージデータ
   * @param {Object} [options={}] - 送信オプション
   * @returns {Promise<Result<any>>} 送信結果
   */
  async send(type, data = {}, options = {}) {
    if (this.state !== CommunicationState.CONNECTED) {
      // 接続されていない場合は再接続を試行
      const reconnectResult = await this._reconnect();
      if (reconnectResult.isFailure()) {
        return reconnectResult;
      }
    }

    const startTime = performance.now();
    this.stats.messagesSent++;

    try {
      this.logger.debug("Sending message", { type, data });

      const message = {
        type,
        data,
        connectionId: this.connectionId,
        timestamp: Date.now(),
        priority: options.priority || MessagePriority.NORMAL,
      };

      const response = await this._sendChromeMessage(message, options);

      const endTime = performance.now();
      const responseTime = endTime - startTime;
      this._updateResponseTimeStats(responseTime);

      if (response && response.success) {
        this.stats.messagesSucceeded++;
        this.stats.lastSuccessfulMessage = new Date();

        this.logger.debug("Message sent successfully", {
          type,
          responseTime: `${responseTime.toFixed(2)}ms`,
        });

        return Result.success(response.data);
      } else {
        throw new Error(response?.error || "Unknown error");
      }
    } catch (error) {
      this.stats.messagesFailed++;
      this.stats.lastFailedMessage = new Date();

      return Result.failure(
        this.errorHandler.handleError(error, {
          type: ErrorType.COMMUNICATION_ERROR,
          context: { messageType: type, data },
        })
      );
    }
  }

  /**
   * 応答時間統計を更新
   * @param {number} responseTime - 応答時間
   * @private
   */
  _updateResponseTimeStats(responseTime) {
    const totalMessages =
      this.stats.messagesSucceeded + this.stats.messagesFailed;
    if (totalMessages > 0) {
      this.stats.averageResponseTime =
        (this.stats.averageResponseTime * (totalMessages - 1) + responseTime) /
        totalMessages;
    } else {
      this.stats.averageResponseTime = responseTime;
    }
  }

  /**
   * 再接続を実行
   * @returns {Promise<Result<boolean>>} 再接続結果
   * @private
   */
  async _reconnect() {
    if (this.state === CommunicationState.RECONNECTING) {
      return this.connectionPromise || Result.success(true);
    }

    this.logger.info("Attempting to reconnect");
    this.state = CommunicationState.RECONNECTING;
    this.stats.reconnections++;

    // 少し待ってから再接続
    await new Promise((resolve) =>
      setTimeout(resolve, this.options.reconnectDelay)
    );

    return this._establishConnection();
  }

  /**
   * ハートビート機能を開始
   * @private
   */
  _startHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    this.heartbeatTimer = setInterval(async () => {
      try {
        const result = await this.send(
          "heartbeat",
          {
            timestamp: Date.now(),
          },
          {
            timeout: 5000,
            priority: MessagePriority.LOW,
          }
        );

        if (result.isSuccess()) {
          this.lastHeartbeat = new Date();
          this.logger.debug("Heartbeat successful");
        } else {
          this.logger.warn("Heartbeat failed", { error: result.error });
          this._handleConnectionLost();
        }
      } catch (error) {
        this.logger.warn("Heartbeat error", { error });
        this._handleConnectionLost();
      }
    }, this.options.heartbeatInterval);

    this.logger.debug("Heartbeat started", {
      interval: this.options.heartbeatInterval,
    });
  }

  /**
   * ハートビート機能を停止
   * @private
   */
  _stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
      this.logger.debug("Heartbeat stopped");
    }
  }

  /**
   * システム準備完了メッセージを処理
   * @param {Object} message - メッセージオブジェクト
   * @returns {Promise<any>} 処理結果
   * @private
   */
  async _handleSystemReady(message) {
    this.logger.info("System ready message received", { data: message.data });
    return { acknowledged: true };
  }

  /**
   * システムエラーメッセージを処理
   * @param {Object} message - メッセージオブジェクト
   * @returns {Promise<any>} 処理結果
   * @private
   */
  async _handleSystemError(message) {
    this.logger.error("System error message received", { data: message.data });
    return { acknowledged: true };
  }

  /**
   * 接続確立メッセージを処理
   * @param {Object} message - メッセージオブジェクト
   * @param {Object} sender - 送信者情報
   * @returns {Promise<any>} 処理結果
   * @private
   */
  async _handleConnectionEstablished(message, sender) {
    this.connectionId = message.data.connectionId;
    this.state = CommunicationState.CONNECTED;

    this.logger.info("Connection established", {
      connectionId: this.connectionId,
    });

    return { acknowledged: true };
  }

  /**
   * 接続切断を処理
   * @private
   */
  _handleConnectionLost() {
    if (this.state === CommunicationState.DISCONNECTED) {
      return;
    }

    this.logger.warn("Connection lost");
    this.state = CommunicationState.DISCONNECTED;
    this.connectionId = null;

    // ハートビートを停止
    this._stopHeartbeat();

    // 自動再接続を試行
    if (this.initialized) {
      this.reconnectTimer = setTimeout(() => {
        this._reconnect().catch((error) => {
          this.logger.error("Auto-reconnect failed", { error });
        });
      }, this.options.reconnectDelay);
    }
  }

  /**
   * ハートビート応答を処理
   * @param {Object} message - メッセージオブジェクト
   * @param {Object} sender - 送信者情報
   * @returns {Promise<any>} 処理結果
   * @private
   */
  async _handleHeartbeatResponse(message, sender) {
    this.lastHeartbeat = new Date();
    this.logger.debug("Heartbeat response received");
    return { acknowledged: true };
  }

  /**
   * 設定変更を処理
   * @param {Object} settings - 新しい設定
   * @returns {Promise<void>}
   */
  async onSettingsChanged(settings) {
    this.logger.debug("Settings changed", { settings });

    // ハートビート設定の更新
    if (settings.enableHeartbeat !== undefined) {
      this.options.enableHeartbeat = settings.enableHeartbeat;

      if (
        settings.enableHeartbeat &&
        this.state === CommunicationState.CONNECTED
      ) {
        this._startHeartbeat();
      } else {
        this._stopHeartbeat();
      }
    }

    if (settings.heartbeatInterval !== undefined) {
      this.options.heartbeatInterval = settings.heartbeatInterval;

      if (
        this.options.enableHeartbeat &&
        this.state === CommunicationState.CONNECTED
      ) {
        this._startHeartbeat(); // 新しい間隔で再開
      }
    }

    // その他の設定更新
    if (settings.messageTimeout !== undefined) {
      this.options.messageTimeout = settings.messageTimeout;
    }

    if (settings.maxRetries !== undefined) {
      this.options.maxRetries = settings.maxRetries;
      this.retryManager = new RetryManager({
        maxRetries: settings.maxRetries,
        baseDelay: 500,
        maxDelay: 5000,
        logger: this.logger,
      });
    }
  }

  /**
   * 現在の状態を取得
   * @returns {Object} 状態オブジェクト
   */
  getState() {
    return {
      initialized: this.initialized,
      state: this.state,
      connectionId: this.connectionId,
      lastHeartbeat: this.lastHeartbeat,
      stats: { ...this.stats },
      options: { ...this.options },
    };
  }

  /**
   * 統計情報を取得
   * @returns {CommunicationStats} 統計情報
   */
  getStats() {
    return {
      ...this.stats,
      connectionState: this.state,
      connectionId: this.connectionId,
      lastHeartbeat: this.lastHeartbeat,
      successRate:
        this.stats.messagesSent > 0
          ? (this.stats.messagesSucceeded / this.stats.messagesSent) * 100
          : 0,
    };
  }

  /**
   * 接続状態をチェック
   * @returns {boolean} 接続されているかどうか
   */
  isConnected() {
    return this.state === CommunicationState.CONNECTED;
  }

  /**
   * 接続の健全性をチェック
   * @returns {boolean} 接続が健全かどうか
   */
  isHealthy() {
    if (!this.isConnected()) {
      return false;
    }

    // ハートビートが有効な場合は最後のハートビート時刻をチェック
    if (this.options.enableHeartbeat && this.lastHeartbeat) {
      const timeSinceLastHeartbeat = Date.now() - this.lastHeartbeat.getTime();
      const maxHeartbeatAge = this.options.heartbeatInterval * 2; // 2回分の間隔

      return timeSinceLastHeartbeat < maxHeartbeatAge;
    }

    return true;
  }

  /**
   * ContentScriptCommunicatorを破棄
   * @returns {Promise<void>}
   */
  async destroy() {
    if (!this.initialized) {
      return;
    }

    this.logger.info("Destroying ContentScriptCommunicator");

    try {
      // ハートビートを停止
      this._stopHeartbeat();

      // 再接続タイマーを停止
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }

      // 接続を切断
      if (this.state === CommunicationState.CONNECTED) {
        try {
          await this.send(
            "disconnect",
            {
              reason: "ContentScript destroyed",
            },
            { timeout: 2000 }
          );
        } catch (error) {
          this.logger.warn("Failed to send disconnect message", { error });
        }
      }

      // イベントリスナーを削除
      for (const removeListener of this.eventListeners) {
        try {
          removeListener();
        } catch (error) {
          this.logger.warn("Error removing event listener", { error });
        }
      }
      this.eventListeners.clear();

      // 保留中のメッセージをクリア
      this.pendingMessages.clear();
      this.messageQueue = [];

      // 状態をリセット
      this.state = CommunicationState.DISCONNECTED;
      this.initialized = false;
      this.connectionId = null;

      this.logger.info("ContentScriptCommunicator destroyed successfully");
    } catch (error) {
      this.logger.error("Error during ContentScriptCommunicator destruction", {
        error,
      });
    }
  }
}

// CommonJS/ES6 両対応のエクスポート
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    CommunicationState,
    MessagePriority,
    ContentScriptCommunicator,
  };
} else if (typeof window !== "undefined") {
  window.CommunicationState = CommunicationState;
  window.MessagePriority = MessagePriority;
  window.ContentScriptCommunicator = ContentScriptCommunicator;
}
