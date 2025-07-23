/**
 * MessageBus システム
 * 型安全なメッセージパッシングシステムを提供
 */

// 依存関係のインポート
let Logger, ErrorHandler, Result, AppError, ErrorType, RetryManager;

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
}

/**
 * メッセージタイプの定義
 * @readonly
 * @enum {string}
 */
const MessageType = {
  // システムメッセージ
  SYSTEM_INIT: "SYSTEM_INIT",
  SYSTEM_READY: "SYSTEM_READY",
  SYSTEM_ERROR: "SYSTEM_ERROR",
  SYSTEM_SHUTDOWN: "SYSTEM_SHUTDOWN",

  // 設定関連メッセージ
  SETTINGS_GET: "SETTINGS_GET",
  SETTINGS_SET: "SETTINGS_SET",
  SETTINGS_CHANGED: "SETTINGS_CHANGED",

  // シアターモード関連メッセージ
  THEATER_MODE_TOGGLE: "THEATER_MODE_TOGGLE",
  THEATER_MODE_SET: "THEATER_MODE_SET",
  THEATER_MODE_STATUS: "THEATER_MODE_STATUS",
  OPACITY_CHANGE: "OPACITY_CHANGE",

  // タブ関連メッセージ
  TAB_ACTIVATED: "TAB_ACTIVATED",
  TAB_UPDATED: "TAB_UPDATED",
  TAB_REMOVED: "TAB_REMOVED",

  // UI関連メッセージ
  UI_READY: "UI_READY",
  UI_ACTION: "UI_ACTION",
  UI_UPDATE: "UI_UPDATE",

  // YouTube関連メッセージ
  YOUTUBE_PAGE_DETECTED: "YOUTUBE_PAGE_DETECTED",
  YOUTUBE_PLAYER_READY: "YOUTUBE_PLAYER_READY",
  YOUTUBE_PLAYER_STATE_CHANGE: "YOUTUBE_PLAYER_STATE_CHANGE",

  // カスタムメッセージ
  CUSTOM: "CUSTOM",
};

/**
 * メッセージ送信先の定義
 * @readonly
 * @enum {string}
 */
const MessageTarget = {
  BACKGROUND: "background",
  CONTENT_SCRIPT: "content_script",
  POPUP: "popup",
  ALL: "all",
  TAB: "tab",
};

/**
 * メッセージの優先度
 * @readonly
 * @enum {number}
 */
const MessagePriority = {
  HIGH: 0,
  NORMAL: 1,
  LOW: 2,
};

/**
 * メッセージスキーマの定義
 * 各メッセージタイプに対する期待されるデータ構造
 * @type {Object<string, Object>}
 */
const MessageSchemas = {
  [MessageType.SYSTEM_INIT]: {
    version: { type: "string", required: true },
    config: { type: "object", required: false },
  },
  [MessageType.SETTINGS_SET]: {
    key: { type: "string", required: true },
    value: { type: "any", required: true },
  },
  [MessageType.THEATER_MODE_SET]: {
    enabled: { type: "boolean", required: true },
  },
  [MessageType.OPACITY_CHANGE]: {
    value: { type: "number", required: true, min: 0, max: 0.9 },
  },
  [MessageType.TAB_UPDATED]: {
    tabId: { type: "number", required: true },
    url: { type: "string", required: false },
    status: { type: "string", required: false },
  },
  // 他のメッセージタイプのスキーマを追加
};

/**
 * メッセージバリデーター
 * メッセージの構造と内容を検証
 */
class MessageValidator {
  /**
   * メッセージを検証
   * @param {string} type - メッセージタイプ
   * @param {Object} data - メッセージデータ
   * @returns {Result<boolean>} 検証結果
   */
  static validate(type, data) {
    // メッセージタイプの検証
    if (!Object.values(MessageType).includes(type)) {
      return Result.failure(`Invalid message type: ${type}`, {
        type: ErrorType.VALIDATION_ERROR,
      });
    }

    // スキーマが定義されていない場合は検証をスキップ
    const schema = MessageSchemas[type];
    if (!schema) {
      return Result.success(true);
    }

    // データがnullまたはundefinedの場合
    if (data === null || data === undefined) {
      return Result.failure("Message data is required", {
        type: ErrorType.VALIDATION_ERROR,
      });
    }

    // スキーマに基づいてデータを検証
    for (const [key, rules] of Object.entries(schema)) {
      // 必須フィールドの検証
      if (rules.required && (data[key] === undefined || data[key] === null)) {
        return Result.failure(`Required field '${key}' is missing`, {
          type: ErrorType.VALIDATION_ERROR,
          context: { field: key },
        });
      }

      // 存在する場合は型の検証
      if (data[key] !== undefined && data[key] !== null) {
        // 型の検証
        if (rules.type !== "any") {
          const actualType = Array.isArray(data[key])
            ? "array"
            : typeof data[key];
          const expectedType = rules.type;

          if (expectedType === "array" && !Array.isArray(data[key])) {
            return Result.failure(`Field '${key}' should be an array`, {
              type: ErrorType.VALIDATION_ERROR,
              context: {
                field: key,
                expected: expectedType,
                actual: actualType,
              },
            });
          } else if (expectedType !== "array" && actualType !== expectedType) {
            return Result.failure(`Field '${key}' has invalid type`, {
              type: ErrorType.VALIDATION_ERROR,
              context: {
                field: key,
                expected: expectedType,
                actual: actualType,
              },
            });
          }
        }

        // 数値の範囲検証
        if (typeof data[key] === "number") {
          if (rules.min !== undefined && data[key] < rules.min) {
            return Result.failure(`Field '${key}' is below minimum value`, {
              type: ErrorType.VALIDATION_ERROR,
              context: { field: key, min: rules.min, value: data[key] },
            });
          }
          if (rules.max !== undefined && data[key] > rules.max) {
            return Result.failure(`Field '${key}' exceeds maximum value`, {
              type: ErrorType.VALIDATION_ERROR,
              context: { field: key, max: rules.max, value: data[key] },
            });
          }
        }

        // 文字列の長さ検証
        if (typeof data[key] === "string") {
          if (
            rules.minLength !== undefined &&
            data[key].length < rules.minLength
          ) {
            return Result.failure(`Field '${key}' is too short`, {
              type: ErrorType.VALIDATION_ERROR,
              context: {
                field: key,
                minLength: rules.minLength,
                length: data[key].length,
              },
            });
          }
          if (
            rules.maxLength !== undefined &&
            data[key].length > rules.maxLength
          ) {
            return Result.failure(`Field '${key}' is too long`, {
              type: ErrorType.VALIDATION_ERROR,
              context: {
                field: key,
                maxLength: rules.maxLength,
                length: data[key].length,
              },
            });
          }
        }

        // 配列の長さ検証
        if (Array.isArray(data[key])) {
          if (
            rules.minItems !== undefined &&
            data[key].length < rules.minItems
          ) {
            return Result.failure(`Field '${key}' has too few items`, {
              type: ErrorType.VALIDATION_ERROR,
              context: {
                field: key,
                minItems: rules.minItems,
                length: data[key].length,
              },
            });
          }
          if (
            rules.maxItems !== undefined &&
            data[key].length > rules.maxItems
          ) {
            return Result.failure(`Field '${key}' has too many items`, {
              type: ErrorType.VALIDATION_ERROR,
              context: {
                field: key,
                maxItems: rules.maxItems,
                length: data[key].length,
              },
            });
          }
        }

        // 列挙型の検証
        if (rules.enum !== undefined && !rules.enum.includes(data[key])) {
          return Result.failure(`Field '${key}' has invalid value`, {
            type: ErrorType.VALIDATION_ERROR,
            context: { field: key, allowed: rules.enum, value: data[key] },
          });
        }
      }
    }

    return Result.success(true);
  }
}

/**
 * メッセージ構造体
 * 送受信されるメッセージの標準形式
 */
class Message {
  /**
   * メッセージを作成
   * @param {string} type - メッセージタイプ
   * @param {Object} [data] - メッセージデータ
   * @param {Object} [options] - メッセージオプション
   * @param {string} [options.id] - メッセージID
   * @param {string} [options.source] - 送信元
   * @param {string} [options.target] - 送信先
   * @param {number} [options.priority] - 優先度
   * @param {boolean} [options.needsResponse] - 応答が必要かどうか
   * @param {string} [options.responseToId] - 応答先メッセージID
   */
  constructor(type, data = {}, options = {}) {
    this.type = type;
    this.data = data;
    this.id = options.id || Message.generateId();
    this.timestamp = new Date().toISOString();
    this.source = options.source || "unknown";
    this.target = options.target || MessageTarget.ALL;
    this.priority =
      options.priority !== undefined
        ? options.priority
        : MessagePriority.NORMAL;
    this.needsResponse = options.needsResponse || false;
    this.responseToId = options.responseToId || null;
  }

  /**
   * ユニークなメッセージIDを生成
   * @returns {string} メッセージID
   * @static
   */
  static generateId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * このメッセージへの応答メッセージを作成
   * @param {string} type - 応答メッセージタイプ
   * @param {Object} [data] - 応答データ
   * @param {Object} [options] - 応答オプション
   * @returns {Message} 応答メッセージ
   */
  createResponse(type, data = {}, options = {}) {
    return new Message(type, data, {
      source: this.target,
      target: this.source,
      responseToId: this.id,
      ...options,
    });
  }

  /**
   * メッセージをシリアライズ
   * @returns {Object} シリアライズされたメッセージ
   */
  serialize() {
    return {
      type: this.type,
      data: this.data,
      id: this.id,
      timestamp: this.timestamp,
      source: this.source,
      target: this.target,
      priority: this.priority,
      needsResponse: this.needsResponse,
      responseToId: this.responseToId,
    };
  }

  /**
   * シリアライズされたデータからメッセージを復元
   * @param {Object} serialized - シリアライズされたメッセージ
   * @returns {Message} 復元されたメッセージ
   * @static
   */
  static deserialize(serialized) {
    return new Message(serialized.type, serialized.data, {
      id: serialized.id,
      source: serialized.source,
      target: serialized.target,
      priority: serialized.priority,
      needsResponse: serialized.needsResponse,
      responseToId: serialized.responseToId,
    });
  }
}

/**
 * メッセージキュー
 * 優先度付きメッセージキューを実装
 */
class MessageQueue {
  /**
   * MessageQueueインスタンスを作成
   */
  constructor() {
    this.queues = {
      [MessagePriority.HIGH]: [],
      [MessagePriority.NORMAL]: [],
      [MessagePriority.LOW]: [],
    };
  }

  /**
   * メッセージをキューに追加
   * @param {Message} message - 追加するメッセージ
   */
  enqueue(message) {
    const priority =
      message.priority !== undefined
        ? message.priority
        : MessagePriority.NORMAL;
    this.queues[priority].push(message);
  }

  /**
   * メッセージをキューから取得
   * @returns {Message|null} 次のメッセージ、キューが空の場合はnull
   */
  dequeue() {
    // 優先度の高いキューから順に取得
    for (const priority of Object.keys(this.queues).sort((a, b) => a - b)) {
      if (this.queues[priority].length > 0) {
        return this.queues[priority].shift();
      }
    }
    return null;
  }

  /**
   * キューが空かどうかを確認
   * @returns {boolean} キューが空かどうか
   */
  isEmpty() {
    return Object.values(this.queues).every((queue) => queue.length === 0);
  }

  /**
   * キュー内のメッセージ数を取得
   * @returns {number} メッセージ数
   */
  size() {
    return Object.values(this.queues).reduce(
      (total, queue) => total + queue.length,
      0
    );
  }

  /**
   * キューをクリア
   */
  clear() {
    for (const priority in this.queues) {
      this.queues[priority] = [];
    }
  }
}

/**
 * メッセージバス
 * 型安全なメッセージパッシングシステムの中核
 */
class MessageBus {
  /**
   * MessageBusインスタンスを作成
   * @param {Object} options - オプション
   * @param {Object} [options.logger] - ロガーインスタンス
   * @param {Object} [options.errorHandler] - エラーハンドラーインスタンス
   * @param {string} [options.name="default"] - バス名
   */
  constructor(options = {}) {
    this.logger = options.logger;
    this.errorHandler = options.errorHandler;
    this.name = options.name || "default";

    // ハンドラーマップ: メッセージタイプ -> ハンドラー配列
    this.handlers = new Map();

    // 送信待ちのメッセージキュー
    this.outgoingQueue = new MessageQueue();

    // 処理待ちのメッセージキュー
    this.incomingQueue = new MessageQueue();

    // ミドルウェア配列
    this.middleware = [];

    // 応答待ちのメッセージマップ: メッセージID -> {resolve, reject, timeout}
    this.pendingResponses = new Map();

    // 処理中フラグ
    this.isProcessing = false;

    // リトライマネージャー
    this.retryManager = new RetryManager({
      maxRetries: 3,
      baseDelay: 500,
      logger: this.logger,
    });

    // Chrome拡張機能のメッセージリスナーを設定
    this._setupChromeListeners();
  }

  /**
   * Chrome拡張機能のメッセージリスナーを設定
   * @private
   */
  _setupChromeListeners() {
    if (
      typeof chrome !== "undefined" &&
      chrome.runtime &&
      chrome.runtime.onMessage
    ) {
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        // メッセージをデシリアライズ
        let msg;
        try {
          msg = Message.deserialize(message);
        } catch (error) {
          if (this.logger) {
            this.logger.warn("Failed to deserialize message", {
              message,
              error,
            });
          }
          sendResponse({ success: false, error: "Invalid message format" });
          return false;
        }

        // 送信元情報を設定
        if (sender.tab) {
          msg.source = `content_script:${sender.tab.id}`;
        }

        // メッセージを受信キューに追加
        this.incomingQueue.enqueue(msg);

        // 非同期処理を開始
        this._processIncomingQueue();

        // 応答が必要な場合は、応答を待つためにtrueを返す
        if (msg.needsResponse) {
          return true; // 非同期応答を有効化
        }

        return false;
      });
    }
  }

  /**
   * メッセージハンドラーを登録
   * @param {string} type - メッセージタイプ
   * @param {function(Message): Promise<any>|any} handler - ハンドラー関数
   * @returns {function()} ハンドラー削除関数
   */
  registerHandler(type, handler) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }

    this.handlers.get(type).push(handler);

    // ハンドラー削除関数を返す
    return () => {
      const handlers = this.handlers.get(type);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index !== -1) {
          handlers.splice(index, 1);
        }
        if (handlers.length === 0) {
          this.handlers.delete(type);
        }
      }
    };
  }

  /**
   * ミドルウェアを追加
   * @param {function(Message): Promise<Message>|Message} middleware - ミドルウェア関数
   * @returns {function()} ミドルウェア削除関数
   */
  addMiddleware(middleware) {
    this.middleware.push(middleware);

    // ミドルウェア削除関数を返す
    return () => {
      const index = this.middleware.indexOf(middleware);
      if (index !== -1) {
        this.middleware.splice(index, 1);
      }
    };
  }

  /**
   * メッセージを送信
   * @param {string} type - メッセージタイプ
   * @param {Object} [data={}] - メッセージデータ
   * @param {Object} [options={}] - 送信オプション
   * @param {string} [options.target=MessageTarget.ALL] - 送信先
   * @param {number} [options.priority=MessagePriority.NORMAL] - 優先度
   * @param {boolean} [options.needsResponse=false] - 応答が必要かどうか
   * @param {number} [options.timeout=5000] - タイムアウト時間（ミリ秒）
   * @returns {Promise<Result<any>>} 送信結果
   */
  async send(type, data = {}, options = {}) {
    // メッセージを検証
    const validationResult = MessageValidator.validate(type, data);
    if (validationResult.isFailure()) {
      if (this.logger) {
        this.logger.warn("Message validation failed", {
          type,
          data,
          error: validationResult.error,
        });
      }
      return validationResult;
    }

    // メッセージを作成
    const message = new Message(type, data, {
      source: this.name,
      target: options.target || MessageTarget.ALL,
      priority: options.priority || MessagePriority.NORMAL,
      needsResponse: options.needsResponse || false,
    });

    // ミドルウェアを適用
    const processedMessage = await this._applyMiddleware(message);
    if (!processedMessage) {
      return Result.failure("Message was rejected by middleware", {
        type: ErrorType.COMMUNICATION_ERROR,
      });
    }

    // 送信キューに追加
    this.outgoingQueue.enqueue(processedMessage);

    // 送信処理を開始
    this._processOutgoingQueue();

    // 応答が必要な場合は応答を待つ
    if (processedMessage.needsResponse) {
      return this._waitForResponse(processedMessage, options.timeout || 5000);
    }

    return Result.success({ sent: true, messageId: processedMessage.id });
  }

  /**
   * 応答を待つ
   * @param {Message} message - 送信したメッセージ
   * @param {number} timeout - タイムアウト時間（ミリ秒）
   * @returns {Promise<Result<any>>} 応答結果
   * @private
   */
  _waitForResponse(message, timeout) {
    return new Promise((resolve) => {
      // タイムアウトハンドラー
      const timeoutId = setTimeout(() => {
        const pendingResponse = this.pendingResponses.get(message.id);
        if (pendingResponse) {
          this.pendingResponses.delete(message.id);
          resolve(
            Result.failure("Response timeout", {
              type: ErrorType.TIMEOUT_ERROR,
              context: { messageId: message.id, messageType: message.type },
            })
          );
        }
      }, timeout);

      // 応答待ちマップに登録
      this.pendingResponses.set(message.id, {
        resolve: (response) => {
          clearTimeout(timeoutId);
          this.pendingResponses.delete(message.id);
          resolve(Result.success(response));
        },
        reject: (error) => {
          clearTimeout(timeoutId);
          this.pendingResponses.delete(message.id);
          resolve(Result.failure(error));
        },
        timeout: timeoutId,
      });
    });
  }

  /**
   * ミドルウェアを適用
   * @param {Message} message - 適用対象のメッセージ
   * @returns {Promise<Message|null>} 処理後のメッセージ、nullの場合は拒否
   * @private
   */
  async _applyMiddleware(message) {
    let currentMessage = message;

    for (const middleware of this.middleware) {
      try {
        const result = middleware(currentMessage);
        currentMessage = result instanceof Promise ? await result : result;

        // ミドルウェアがnullを返した場合、メッセージを拒否
        if (currentMessage === null) {
          if (this.logger) {
            this.logger.debug("Message rejected by middleware", {
              messageId: message.id,
              messageType: message.type,
            });
          }
          return null;
        }
      } catch (error) {
        if (this.logger) {
          this.logger.warn("Error in middleware", {
            error,
            messageId: message.id,
          });
        }
        // エラーが発生しても処理を継続
      }
    }

    return currentMessage;
  }

  /**
   * 送信キューを処理
   * @private
   */
  async _processOutgoingQueue() {
    if (this.outgoingQueue.isEmpty()) {
      return;
    }

    while (!this.outgoingQueue.isEmpty()) {
      const message = this.outgoingQueue.dequeue();
      if (!message) continue;

      try {
        await this._sendMessage(message);
      } catch (error) {
        if (this.logger) {
          this.logger.error("Failed to send message", {
            messageId: message.id,
            messageType: message.type,
            error,
          });
        }

        // 応答待ちのメッセージの場合はエラーを通知
        const pendingResponse = this.pendingResponses.get(message.id);
        if (pendingResponse) {
          pendingResponse.reject(error);
        }
      }
    }
  }

  /**
   * メッセージを実際に送信
   * @param {Message} message - 送信するメッセージ
   * @returns {Promise<void>}
   * @private
   */
  async _sendMessage(message) {
    // Chrome拡張機能のメッセージングAPIを使用
    if (
      typeof chrome !== "undefined" &&
      chrome.runtime &&
      chrome.runtime.sendMessage
    ) {
      const serialized = message.serialize();

      if (this.logger) {
        this.logger.debug("Sending message", {
          messageId: message.id,
          messageType: message.type,
          target: message.target,
        });
      }

      // 送信先に応じて送信方法を変更
      if (
        message.target === MessageTarget.TAB &&
        typeof chrome.tabs !== "undefined"
      ) {
        // タブIDを抽出（例: "tab:123" -> 123）
        const tabIdMatch = message.target.match(/^tab:(\d+)$/);
        if (tabIdMatch) {
          const tabId = parseInt(tabIdMatch[1], 10);
          await this.retryManager.withRetry(
            () =>
              new Promise((resolve, reject) => {
                chrome.tabs.sendMessage(tabId, serialized, (response) => {
                  if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                  } else {
                    resolve(response);
                  }
                });
              })
          );
        } else {
          throw new Error(`Invalid tab target: ${message.target}`);
        }
      } else {
        // 通常のメッセージ送信
        await this.retryManager.withRetry(
          () =>
            new Promise((resolve, reject) => {
              chrome.runtime.sendMessage(serialized, (response) => {
                if (chrome.runtime.lastError) {
                  reject(new Error(chrome.runtime.lastError.message));
                } else {
                  resolve(response);
                }
              });
            })
        );
      }
    } else {
      // ローカル処理（テスト環境など）
      this.incomingQueue.enqueue(message);
      this._processIncomingQueue();
    }
  }

  /**
   * 受信キューを処理
   * @private
   */
  async _processIncomingQueue() {
    if (this.isProcessing || this.incomingQueue.isEmpty()) {
      return;
    }

    this.isProcessing = true;

    try {
      while (!this.incomingQueue.isEmpty()) {
        const message = this.incomingQueue.dequeue();
        if (!message) continue;

        // 応答メッセージの場合
        if (message.responseToId) {
          const pendingResponse = this.pendingResponses.get(
            message.responseToId
          );
          if (pendingResponse) {
            pendingResponse.resolve(message.data);
            continue;
          }
        }

        // 通常のメッセージ処理
        await this._handleMessage(message);
      }
    } catch (error) {
      if (this.logger) {
        this.logger.error("Error processing incoming queue", error);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * メッセージを処理
   * @param {Message} message - 処理するメッセージ
   * @returns {Promise<void>}
   * @private
   */
  async _handleMessage(message) {
    if (this.logger) {
      this.logger.debug("Handling message", {
        messageId: message.id,
        messageType: message.type,
        source: message.source,
      });
    }

    // ハンドラーを取得
    const handlers = this.handlers.get(message.type) || [];

    // ハンドラーがない場合
    if (handlers.length === 0) {
      if (this.logger) {
        this.logger.warn("No handlers for message type", {
          messageType: message.type,
          messageId: message.id,
        });
      }

      // 応答が必要な場合はエラー応答
      if (message.needsResponse) {
        const response = message.createResponse(MessageType.SYSTEM_ERROR, {
          error: `No handler for message type: ${message.type}`,
        });
        this.outgoingQueue.enqueue(response);
        this._processOutgoingQueue();
      }

      return;
    }

    // 全てのハンドラーを実行
    const results = [];
    for (const handler of handlers) {
      try {
        const result = handler(message);
        const handlerResult = result instanceof Promise ? await result : result;
        results.push(handlerResult);
      } catch (error) {
        if (this.logger) {
          this.logger.error("Error in message handler", {
            messageType: message.type,
            messageId: message.id,
            error,
          });
        }

        // エラーハンドラーがあれば通知
        if (this.errorHandler) {
          this.errorHandler.handleError(error, {
            context: {
              messageType: message.type,
              messageId: message.id,
            },
          });
        }

        results.push(null);
      }
    }

    // 応答が必要な場合
    if (message.needsResponse) {
      // 最初の非nullの結果を使用
      const responseData = results.find((r) => r !== null) || {
        error: "Handler returned no result",
      };
      const response = message.createResponse(
        responseData.error
          ? MessageType.SYSTEM_ERROR
          : message.type + "_RESPONSE",
        responseData
      );

      this.outgoingQueue.enqueue(response);
      this._processOutgoingQueue();
    }
  }

  /**
   * メッセージバスをクリア
   */
  clear() {
    this.outgoingQueue.clear();
    this.incomingQueue.clear();

    // 応答待ちのメッセージをキャンセル
    for (const [id, { reject, timeout }] of this.pendingResponses.entries()) {
      clearTimeout(timeout);
      reject(new Error("MessageBus cleared"));
      this.pendingResponses.delete(id);
    }
  }

  /**
   * メッセージバスを破棄
   */
  dispose() {
    this.clear();
    this.handlers.clear();
    this.middleware = [];

    // Chrome拡張機能のメッセージリスナーを削除
    if (
      typeof chrome !== "undefined" &&
      chrome.runtime &&
      chrome.runtime.onMessage
    ) {
      chrome.runtime.onMessage.removeListener(this._chromeMessageListener);
    }
  }
}

// CommonJS/ES6 両対応のエクスポート
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    MessageType,
    MessageTarget,
    MessagePriority,
    Message,
    MessageQueue,
    MessageValidator,
    MessageBus,
  };
} else if (typeof window !== "undefined") {
  window.MessageType = MessageType;
  window.MessageTarget = MessageTarget;
  window.MessagePriority = MessagePriority;
  window.Message = Message;
  window.MessageQueue = MessageQueue;
  window.MessageValidator = MessageValidator;
  window.MessageBus = MessageBus;
}
