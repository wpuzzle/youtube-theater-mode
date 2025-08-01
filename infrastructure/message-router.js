/**
 * MessageRouter
 * メッセージルーティングとディスパッチを専門とするクラス
 * 型安全なメッセージハンドリングと優先度管理を提供
 */

// 依存関係のインポート
let Logger, ErrorHandler, Result, AppError, ErrorType;
let MessageBus, MessageType, MessageTarget, MessagePriority, Message;

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
    Message,
  } = require("./message-bus.js"));
}

/**
 * メッセージルーティング定義
 * @typedef {Object} RouteDefinition
 * @property {string} source - 送信元
 * @property {string} target - 送信先
 * @property {string} type - メッセージタイプ
 * @property {number} [priority] - 優先度
 * @property {Function} [transform] - 変換関数
 * @property {boolean} [forward] - 転送フラグ
 */

/**
 * メッセージルーター
 * メッセージのルーティングとディスパッチを管理
 */
class MessageRouter {
  /**
   * MessageRouterインスタンスを作成
   * @param {Object} options - オプション
   * @param {Object} [options.logger] - ロガーインスタンス
   * @param {Object} [options.errorHandler] - エラーハンドラーインスタンス
   * @param {Object} [options.messageBus] - メッセージバスインスタンス
   */
  constructor(options = {}) {
    this.logger = options.logger || new Logger("MessageRouter");
    this.errorHandler = options.errorHandler || new ErrorHandler(this.logger);
    this.messageBus =
      options.messageBus ||
      new MessageBus({
        logger: this.logger,
        errorHandler: this.errorHandler,
        name: "router",
      });

    // ルート定義
    this.routes = new Map();

    // メッセージタイプごとのハンドラー
    this.typeHandlers = new Map();

    // 送信元ごとのハンドラー
    this.sourceHandlers = new Map();

    // 送信先ごとのハンドラー
    this.targetHandlers = new Map();

    // グローバルミドルウェア
    this.middleware = [];

    // メッセージキュー
    this.messageQueue = [];
    
    // 処理中フラグ
    this.isProcessing = false;

    // 初期化
    this._initialize();
  }

  /**
   * ルーターを初期化
   * @private
   */
  _initialize() {
    this.logger.debug("Initializing MessageRouter");

    // メッセージバスにグローバルハンドラーを登録
    this.messageBus.registerHandler("*", (message) =>
      this._handleMessage(message)
    );

    // デフォルトルートを設定
    this._setupDefaultRoutes();
  }

  /**
   * デフォルトルートを設定
   * @private
   */
  _setupDefaultRoutes() {
    // システムメッセージは全ての送信先に転送
    this.addRoute({
      type: MessageType.SYSTEM_READY,
      target: MessageTarget.ALL,
      forward: true,
      priority: MessagePriority.HIGH,
    });

    this.addRoute({
      type: MessageType.SYSTEM_ERROR,
      target: MessageTarget.ALL,
      forward: true,
      priority: MessagePriority.HIGH,
    });

    // 設定変更メッセージは全ての送信先に転送
    this.addRoute({
      type: MessageType.SETTINGS_CHANGED,
      target: MessageTarget.ALL,
      forward: true,
    });

    // シアターモード状態メッセージは全ての送信先に転送
    this.addRoute({
      type: MessageType.THEATER_MODE_STATUS,
      target: MessageTarget.ALL,
      forward: true,
    });
  }

  /**
   * ルートを追加
   * @param {RouteDefinition} routeDefinition - ルート定義
   * @returns {string} ルートID
   */
  addRoute(routeDefinition) {
    const routeId = `route_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // デフォルト値を設定
    const route = {
      source: routeDefinition.source || "*",
      target: routeDefinition.target || MessageTarget.ALL,
      type: routeDefinition.type,
      priority:
        routeDefinition.priority !== undefined
          ? routeDefinition.priority
          : MessagePriority.NORMAL,
      transform: routeDefinition.transform,
      forward:
        routeDefinition.forward !== undefined ? routeDefinition.forward : false,
    };

    this.routes.set(routeId, route);

    this.logger.debug("Route added", { routeId, route });

    return routeId;
  }

  /**
   * ルートを削除
   * @param {string} routeId - ルートID
   * @returns {boolean} 削除成功フラグ
   */
  removeRoute(routeId) {
    const result = this.routes.delete(routeId);

    if (result) {
      this.logger.debug("Route removed", { routeId });
    } else {
      this.logger.warn("Route not found", { routeId });
    }

    return result;
  }

  /**
   * メッセージタイプに対するハンドラーを登録
   * @param {string} type - メッセージタイプ
   * @param {Function} handler - ハンドラー関数
   * @returns {Function} ハンドラー削除関数
   */
  registerTypeHandler(type, handler) {
    if (!this.typeHandlers.has(type)) {
      this.typeHandlers.set(type, new Set());
    }

    this.typeHandlers.get(type).add(handler);

    this.logger.debug("Type handler registered", { type });

    // ハンドラー削除関数を返す
    return () => {
      const handlers = this.typeHandlers.get(type);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.typeHandlers.delete(type);
        }
        this.logger.debug("Type handler removed", { type });
      }
    };
  }

  /**
   * 送信元に対するハンドラーを登録
   * @param {string} source - 送信元
   * @param {Function} handler - ハンドラー関数
   * @returns {Function} ハンドラー削除関数
   */
  registerSourceHandler(source, handler) {
    if (!this.sourceHandlers.has(source)) {
      this.sourceHandlers.set(source, new Set());
    }

    this.sourceHandlers.get(source).add(handler);

    this.logger.debug("Source handler registered", { source });

    // ハンドラー削除関数を返す
    return () => {
      const handlers = this.sourceHandlers.get(source);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.sourceHandlers.delete(source);
        }
        this.logger.debug("Source handler removed", { source });
      }
    };
  }

  /**
   * 送信先に対するハンドラーを登録
   * @param {string} target - 送信先
   * @param {Function} handler - ハンドラー関数
   * @returns {Function} ハンドラー削除関数
   */
  registerTargetHandler(target, handler) {
    if (!this.targetHandlers.has(target)) {
      this.targetHandlers.set(target, new Set());
    }

    this.targetHandlers.get(target).add(handler);

    this.logger.debug("Target handler registered", { target });

    // ハンドラー削除関数を返す
    return () => {
      const handlers = this.targetHandlers.get(target);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.targetHandlers.delete(target);
        }
        this.logger.debug("Target handler removed", { target });
      }
    };
  }

  /**
   * ミドルウェアを追加
   * @param {Function} middleware - ミドルウェア関数
   * @returns {Function} ミドルウェア削除関数
   */
  addMiddleware(middleware) {
    this.middleware.push(middleware);

    this.logger.debug("Middleware added");

    // ミドルウェア削除関数を返す
    return () => {
      const index = this.middleware.indexOf(middleware);
      if (index !== -1) {
        this.middleware.splice(index, 1);
        this.logger.debug("Middleware removed");
      }
    };
  }

  /**
   * メッセージを処理
   * @param {Message} message - 処理するメッセージ
   * @returns {Promise<Result<any>>} 処理結果
   * @private
   */
  async _handleMessage(message) {
    try {
      this.logger.debug("Handling message", {
        messageId: message.id,
        type: message.type,
        source: message.source,
        target: message.target,
      });

      // ミドルウェアを適用
      let processedMessage = await this._applyMiddleware(message);
      if (!processedMessage) {
        this.logger.debug("Message rejected by middleware", {
          messageId: message.id,
        });
        return Result.success({
          handled: false,
          reason: "rejected_by_middleware",
        });
      }

      // タイプハンドラーを実行
      const typeHandled = await this._executeTypeHandlers(processedMessage);

      // 送信元ハンドラーを実行
      const sourceHandled = await this._executeSourceHandlers(processedMessage);

      // 送信先ハンドラーを実行
      const targetHandled = await this._executeTargetHandlers(processedMessage);

      // ルーティングを実行
      const routingResult = await this._executeRouting(processedMessage);

      return Result.success({
        handled:
          typeHandled ||
          sourceHandled ||
          targetHandled ||
          routingResult.isSuccess(),
        typeHandled,
        sourceHandled,
        targetHandled,
        routed: routingResult.isSuccess(),
      });
    } catch (error) {
      this.logger.error("Error handling message", {
        messageId: message.id,
        type: message.type,
        error,
      });

      return Result.failure(error, {
        type: ErrorType.COMMUNICATION_ERROR,
        context: { messageId: message.id, messageType: message.type },
      });
    }
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
          return null;
        }
      } catch (error) {
        this.logger.warn("Error in middleware", {
          error,
          messageId: message.id,
        });
        // エラーが発生しても処理を継続
      }
    }

    return currentMessage;
  }

  /**
   * タイプハンドラーを実行
   * @param {Message} message - 処理するメッセージ
   * @returns {Promise<boolean>} 処理されたかどうか
   * @private
   */
  async _executeTypeHandlers(message) {
    const handlers = this.typeHandlers.get(message.type);
    if (!handlers || handlers.size === 0) {
      return false;
    }

    let handled = false;

    for (const handler of handlers) {
      try {
        const result = handler(message);
        const handlerResult = result instanceof Promise ? await result : result;

        if (handlerResult) {
          handled = true;
        }
      } catch (error) {
        this.logger.warn("Error in type handler", {
          error,
          messageId: message.id,
          type: message.type,
        });
      }
    }

    return handled;
  }

  /**
   * 送信元ハンドラーを実行
   * @param {Message} message - 処理するメッセージ
   * @returns {Promise<boolean>} 処理されたかどうか
   * @private
   */
  async _executeSourceHandlers(message) {
    const handlers = this.sourceHandlers.get(message.source);
    if (!handlers || handlers.size === 0) {
      return false;
    }

    let handled = false;

    for (const handler of handlers) {
      try {
        const result = handler(message);
        const handlerResult = result instanceof Promise ? await result : result;

        if (handlerResult) {
          handled = true;
        }
      } catch (error) {
        this.logger.warn("Error in source handler", {
          error,
          messageId: message.id,
          source: message.source,
        });
      }
    }

    return handled;
  }

  /**
   * 送信先ハンドラーを実行
   * @param {Message} message - 処理するメッセージ
   * @returns {Promise<boolean>} 処理されたかどうか
   * @private
   */
  async _executeTargetHandlers(message) {
    const handlers = this.targetHandlers.get(message.target);
    if (!handlers || handlers.size === 0) {
      return false;
    }

    let handled = false;

    for (const handler of handlers) {
      try {
        const result = handler(message);
        const handlerResult = result instanceof Promise ? await result : result;

        if (handlerResult) {
          handled = true;
        }
      } catch (error) {
        this.logger.warn("Error in target handler", {
          error,
          messageId: message.id,
          target: message.target,
        });
      }
    }

    return handled;
  }

  /**
   * ルーティングを実行
   * @param {Message} message - 処理するメッセージ
   * @returns {Promise<Result<boolean>>} ルーティング結果
   * @private
   */
  async _executeRouting(message) {
    // メッセージに一致するルートを検索
    const matchingRoutes = [];

    for (const [routeId, route] of this.routes.entries()) {
      // タイプが一致するか（ワイルドカード対応）
      const typeMatches = route.type === "*" || route.type === message.type;

      // 送信元が一致するか（ワイルドカード対応）
      const sourceMatches =
        route.source === "*" || route.source === message.source;

      // 送信先が一致するか（ワイルドカード対応）
      const targetMatches =
        route.target === "*" || route.target === message.target;

      if (typeMatches && sourceMatches && targetMatches) {
        matchingRoutes.push({ routeId, route });
      }
    }

    if (matchingRoutes.length === 0) {
      return Result.success(false);
    }

    // 優先度でソート
    matchingRoutes.sort((a, b) => a.route.priority - b.route.priority);

    // ルートを実行
    for (const { routeId, route } of matchingRoutes) {
      try {
        // メッセージを変換
        let routedMessage = message;

        if (route.transform) {
          const transformResult = route.transform(message);
          routedMessage =
            transformResult instanceof Promise
              ? await transformResult
              : transformResult;

          if (!routedMessage) {
            this.logger.debug("Message rejected by transform function", {
              messageId: message.id,
              routeId,
            });
            continue;
          }
        }

        // 転送フラグがある場合はメッセージを転送
        if (route.forward) {
          const forwardResult = await this.messageBus.send(
            routedMessage.type,
            routedMessage.data,
            {
              target: route.target,
              priority: route.priority,
              needsResponse: routedMessage.needsResponse,
            }
          );

          if (forwardResult.isFailure()) {
            this.logger.warn("Failed to forward message", {
              messageId: message.id,
              routeId,
              error: forwardResult.error,
            });
          } else {
            this.logger.debug("Message forwarded", {
              messageId: message.id,
              routeId,
              target: route.target,
            });
          }
        }
      } catch (error) {
        this.logger.warn("Error executing route", {
          error,
          messageId: message.id,
          routeId,
        });
      }
    }

    return Result.success(true);
  }

  /**
   * メッセージをキューに追加
   * @param {Message} message - 追加するメッセージ
   * @private
   */
  _enqueueMessage(message) {
    this.messageQueue.push(message);
    
    // キューが空でなく、処理中でなければ処理を開始
    if (this.messageQueue.length > 0 && !this.isProcessing) {
      this._processQueue();
    }
  }
  
  /**
   * メッセージキューを処理
   * @private
   */
  async _processQueue() {
    if (this.isProcessing || this.messageQueue.length === 0) {
      return;
    }
    
    this.isProcessing = true;
    
    try {
      // キューからメッセージを取り出して処理
      while (this.messageQueue.length > 0) {
        const message = this.messageQueue.shift();
        await this._handleMessage(message);
      }
    } catch (error) {
      this.logger.error("Error processing message queue", error);
    } finally {
      this.isProcessing = false;
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
    return this.messageBus.send(type, data, options);
  }

  /**
   * ルーターを破棄
   */
  dispose() {
    this.logger.debug("Disposing MessageRouter");

    // ルートをクリア
    this.routes.clear();

    // ハンドラーをクリア
    this.typeHandlers.clear();
    this.sourceHandlers.clear();
    this.targetHandlers.clear();

    // ミドルウェアをクリア
    this.middleware = [];
    
    // メッセージキューをクリア
    this.messageQueue = [];

    // メッセージバスをクリア
    if (this.messageBus) {
      this.messageBus.clear();
    }
  }
}

// CommonJS/ES6 両対応のエクスポート
if (typeof module !== "undefined" && module.exports) {
  module.exports = { MessageRouter };
} else if (typeof window !== "undefined") {
  window.MessageRouter = MessageRouter;
}