/**
 * ContentScriptManager
 * コンテンツスクリプトの初期化と管理を専門とするクラス
 * 依存性注入による疎結合設計とライフサイクル管理を提供
 */

// 依存関係のインポート
let Logger, ErrorHandler, Result, AppError, ErrorType, MessageBus, MessageType;

// Node.js環境での依存関係の解決
if (typeof require !== "undefined") {
  ({ Logger } = require("./logger.js"));
  ({
    ErrorHandler,
    Result,
    AppError,
    ErrorType,
  } = require("./error-handler.js"));
  ({ MessageBus, MessageType } = require("./message-bus.js"));
}

/**
 * コンテンツスクリプトの状態
 * @readonly
 * @enum {string}
 */
const ContentScriptState = {
  UNINITIALIZED: "uninitialized",
  INITIALIZING: "initializing",
  READY: "ready",
  ERROR: "error",
  DESTROYED: "destroyed",
};

/**
 * 依存関係の定義
 * @typedef {Object} Dependencies
 * @property {Logger} logger - ロガーインスタンス
 * @property {ErrorHandler} errorHandler - エラーハンドラーインスタンス
 * @property {MessageBus} messageBus - メッセージバスインスタンス
 * @property {Object} theaterModeController - シアターモードコントローラー
 * @property {Object} youtubePageDetector - YouTubeページ検出器
 * @property {Object} contentScriptCommunicator - コンテンツスクリプト通信機
 */

/**
 * ContentScriptManager
 * コンテンツスクリプトの初期化と管理を行う中央管理クラス
 */
class ContentScriptManager {
  /**
   * ContentScriptManagerインスタンスを作成
   * @param {Dependencies} dependencies - 依存関係オブジェクト
   * @param {Object} [options] - オプション
   * @param {number} [options.initTimeout=10000] - 初期化タイムアウト時間（ミリ秒）
   * @param {boolean} [options.autoRetry=true] - 初期化失敗時の自動リトライ
   * @param {number} [options.maxRetries=3] - 最大リトライ回数
   */
  constructor(dependencies, options = {}) {
    // 依存関係の検証
    this._validateDependencies(dependencies);

    // 依存関係の設定
    this.logger = dependencies.logger;
    this.errorHandler = dependencies.errorHandler;
    this.messageBus = dependencies.messageBus;
    this.theaterModeController = dependencies.theaterModeController;
    this.youtubePageDetector = dependencies.youtubePageDetector;
    this.contentScriptCommunicator = dependencies.contentScriptCommunicator;

    // オプションの設定
    this.options = {
      initTimeout: options.initTimeout || 10000,
      autoRetry: options.autoRetry !== false,
      maxRetries: options.maxRetries || 3,
      ...options,
    };

    // 内部状態
    this.state = ContentScriptState.UNINITIALIZED;
    this.initializationPromise = null;
    this.retryCount = 0;
    this.cleanupTasks = new Set();
    this.eventListeners = new Map();
    this.initialized = false;

    // パフォーマンス監視
    this.performanceMetrics = {
      initStartTime: null,
      initEndTime: null,
      initDuration: null,
      componentInitTimes: new Map(),
    };

    // エラー統計
    this.errorStats = {
      initErrors: 0,
      runtimeErrors: 0,
      lastError: null,
    };

    // ライフサイクルイベントハンドラー
    this.lifecycleHandlers = new Map();

    this.logger.info("ContentScriptManager created", {
      options: this.options,
      state: this.state,
    });
  }

  /**
   * 依存関係を検証
   * @param {Dependencies} dependencies - 検証対象の依存関係
   * @throws {AppError} 依存関係が不正な場合
   * @private
   */
  _validateDependencies(dependencies) {
    const required = [
      "logger",
      "errorHandler",
      "messageBus",
      "theaterModeController",
      "youtubePageDetector",
      "contentScriptCommunicator",
    ];

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
   * コンテンツスクリプトを初期化
   * @returns {Promise<Result<boolean>>} 初期化結果
   */
  async initialize() {
    // 既に初期化中または完了している場合
    if (this.state === ContentScriptState.INITIALIZING) {
      return this.initializationPromise;
    }

    if (this.state === ContentScriptState.READY) {
      return Result.success(true);
    }

    // 初期化状態に変更
    this.state = ContentScriptState.INITIALIZING;
    this.performanceMetrics.initStartTime = performance.now();

    this.logger.info("Starting ContentScript initialization", {
      retryCount: this.retryCount,
      maxRetries: this.options.maxRetries,
    });

    // 初期化プロミスを作成
    this.initializationPromise = this._performInitialization();

    try {
      const result = await this.initializationPromise;

      if (result.isSuccess()) {
        this.state = ContentScriptState.READY;
        this.initialized = true;
        this.performanceMetrics.initEndTime = performance.now();
        this.performanceMetrics.initDuration =
          this.performanceMetrics.initEndTime -
          this.performanceMetrics.initStartTime;

        this.logger.info("ContentScript initialization completed", {
          duration: `${this.performanceMetrics.initDuration.toFixed(2)}ms`,
          retryCount: this.retryCount,
        });

        // 初期化完了イベントを発火
        await this._emitLifecycleEvent("initialized", {
          duration: this.performanceMetrics.initDuration,
          retryCount: this.retryCount,
        });
      } else {
        this.state = ContentScriptState.ERROR;
        this.errorStats.initErrors++;
        this.errorStats.lastError = result.error;

        this.logger.error("ContentScript initialization failed", {
          error: result.error,
          retryCount: this.retryCount,
        });

        // 自動リトライが有効で最大回数に達していない場合
        if (
          this.options.autoRetry &&
          this.retryCount < this.options.maxRetries
        ) {
          this.retryCount++;
          this.logger.info("Retrying ContentScript initialization", {
            retryCount: this.retryCount,
            maxRetries: this.options.maxRetries,
          });

          // 少し待ってからリトライ
          await new Promise((resolve) => setTimeout(resolve, 1000));
          return this.initialize();
        }

        // 初期化失敗イベントを発火
        await this._emitLifecycleEvent("initializationFailed", {
          error: result.error,
          retryCount: this.retryCount,
        });
      }

      return result;
    } catch (error) {
      this.state = ContentScriptState.ERROR;
      this.errorStats.initErrors++;
      this.errorStats.lastError = error;

      const appError = this.errorHandler.handleError(error, {
        type: ErrorType.INITIALIZATION_ERROR,
        context: { phase: "initialization", retryCount: this.retryCount },
      });

      return Result.failure(appError);
    }
  }

  /**
   * 実際の初期化処理を実行
   * @returns {Promise<Result<boolean>>} 初期化結果
   * @private
   */
  async _performInitialization() {
    try {
      // 1. YouTube ページの検証
      const pageValidationResult = await this._validateYouTubePage();
      if (pageValidationResult.isFailure()) {
        return pageValidationResult;
      }

      // 2. 各コンポーネントの初期化
      const componentInitResults = await this._initializeComponents();
      if (componentInitResults.isFailure()) {
        return componentInitResults;
      }

      // 3. メッセージハンドラーの設定
      const messageHandlerResult = await this._setupMessageHandlers();
      if (messageHandlerResult.isFailure()) {
        return messageHandlerResult;
      }

      // 4. イベントリスナーの設定
      const eventListenerResult = await this._setupEventListeners();
      if (eventListenerResult.isFailure()) {
        return eventListenerResult;
      }

      // 5. 初期状態の同期
      const stateSyncResult = await this._syncInitialState();
      if (stateSyncResult.isFailure()) {
        return stateSyncResult;
      }

      // 6. 準備完了の通知
      await this._notifyReady();

      return Result.success(true);
    } catch (error) {
      return Result.failure(
        this.errorHandler.handleError(error, {
          type: ErrorType.INITIALIZATION_ERROR,
          context: { phase: "performInitialization" },
        })
      );
    }
  }

  /**
   * YouTube ページかどうかを検証
   * @returns {Promise<Result<boolean>>} 検証結果
   * @private
   */
  async _validateYouTubePage() {
    this.logger.debug("Validating YouTube page");

    try {
      // URL の検証
      if (!window.location.href.includes("youtube.com")) {
        return Result.failure("Not a YouTube page", {
          type: ErrorType.VALIDATION_ERROR,
          context: { url: window.location.href },
        });
      }

      // YouTube ページ検出器を使用してページタイプを確認
      if (this.youtubePageDetector && this.youtubePageDetector.detectPageType) {
        const pageTypeResult = await this.youtubePageDetector.detectPageType();
        if (pageTypeResult.isFailure()) {
          return pageTypeResult;
        }

        this.logger.info("YouTube page validated", {
          pageType: pageTypeResult.data,
          url: window.location.href,
        });
      }

      return Result.success(true);
    } catch (error) {
      return Result.failure(
        this.errorHandler.handleError(error, {
          type: ErrorType.VALIDATION_ERROR,
          context: { phase: "pageValidation" },
        })
      );
    }
  }

  /**
   * 各コンポーネントを初期化
   * @returns {Promise<Result<boolean>>} 初期化結果
   * @private
   */
  async _initializeComponents() {
    this.logger.debug("Initializing components");

    const components = [
      { name: "youtubePageDetector", instance: this.youtubePageDetector },
      {
        name: "contentScriptCommunicator",
        instance: this.contentScriptCommunicator,
      },
      { name: "theaterModeController", instance: this.theaterModeController },
    ];

    for (const component of components) {
      try {
        const startTime = performance.now();
        this.logger.debug(`Initializing ${component.name}`);

        // コンポーネントに initialize メソッドがある場合は実行
        if (
          component.instance &&
          typeof component.instance.initialize === "function"
        ) {
          const result = await component.instance.initialize();

          // Result型の場合は結果をチェック
          if (
            result &&
            typeof result.isFailure === "function" &&
            result.isFailure()
          ) {
            return Result.failure(
              `Failed to initialize ${component.name}: ${result.error.message}`,
              {
                type: ErrorType.INITIALIZATION_ERROR,
                context: { component: component.name, error: result.error },
              }
            );
          }
        }

        const endTime = performance.now();
        const duration = endTime - startTime;
        this.performanceMetrics.componentInitTimes.set(
          component.name,
          duration
        );

        this.logger.debug(`${component.name} initialized`, {
          duration: `${duration.toFixed(2)}ms`,
        });
      } catch (error) {
        return Result.failure(
          this.errorHandler.handleError(error, {
            type: ErrorType.INITIALIZATION_ERROR,
            context: { component: component.name },
          })
        );
      }
    }

    return Result.success(true);
  }

  /**
   * メッセージハンドラーを設定
   * @returns {Promise<Result<boolean>>} 設定結果
   * @private
   */
  async _setupMessageHandlers() {
    this.logger.debug("Setting up message handlers");

    try {
      // システムメッセージハンドラー
      const systemHandlerRemover = this.messageBus.registerHandler(
        MessageType.SYSTEM_SHUTDOWN,
        this._handleSystemShutdown.bind(this)
      );
      this.cleanupTasks.add(systemHandlerRemover);

      // シアターモード関連メッセージハンドラー
      const theaterHandlerRemover = this.messageBus.registerHandler(
        MessageType.THEATER_MODE_TOGGLE,
        this._handleTheaterModeToggle.bind(this)
      );
      this.cleanupTasks.add(theaterHandlerRemover);

      const opacityHandlerRemover = this.messageBus.registerHandler(
        MessageType.OPACITY_CHANGE,
        this._handleOpacityChange.bind(this)
      );
      this.cleanupTasks.add(opacityHandlerRemover);

      // 設定変更メッセージハンドラー
      const settingsHandlerRemover = this.messageBus.registerHandler(
        MessageType.SETTINGS_CHANGED,
        this._handleSettingsChanged.bind(this)
      );
      this.cleanupTasks.add(settingsHandlerRemover);

      this.logger.debug("Message handlers set up successfully");
      return Result.success(true);
    } catch (error) {
      return Result.failure(
        this.errorHandler.handleError(error, {
          type: ErrorType.INITIALIZATION_ERROR,
          context: { phase: "messageHandlerSetup" },
        })
      );
    }
  }

  /**
   * イベントリスナーを設定
   * @returns {Promise<Result<boolean>>} 設定結果
   * @private
   */
  async _setupEventListeners() {
    this.logger.debug("Setting up event listeners");

    try {
      // ページ離脱時のクリーンアップ
      const beforeUnloadHandler = this._handleBeforeUnload.bind(this);
      window.addEventListener("beforeunload", beforeUnloadHandler);
      this.eventListeners.set("beforeunload", beforeUnloadHandler);

      // ページ可視性変更の監視
      const visibilityChangeHandler = this._handleVisibilityChange.bind(this);
      document.addEventListener("visibilitychange", visibilityChangeHandler);
      this.eventListeners.set("visibilitychange", visibilityChangeHandler);

      // DOM変更の監視（YouTube の動的コンテンツ対応）
      const mutationObserver = new MutationObserver(
        this._handleDOMChanges.bind(this)
      );
      mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class", "id"],
      });
      this.eventListeners.set("mutationObserver", mutationObserver);

      this.logger.debug("Event listeners set up successfully");
      return Result.success(true);
    } catch (error) {
      return Result.failure(
        this.errorHandler.handleError(error, {
          type: ErrorType.INITIALIZATION_ERROR,
          context: { phase: "eventListenerSetup" },
        })
      );
    }
  }

  /**
   * 初期状態を同期
   * @returns {Promise<Result<boolean>>} 同期結果
   * @private
   */
  async _syncInitialState() {
    this.logger.debug("Syncing initial state");

    try {
      // バックグラウンドから現在の状態を取得
      const stateResult = await this.messageBus.send(
        MessageType.SETTINGS_GET,
        {},
        { needsResponse: true, timeout: 3000 }
      );

      if (stateResult.isSuccess() && stateResult.data) {
        // シアターモードコントローラーに状態を適用
        if (
          this.theaterModeController &&
          this.theaterModeController.syncState
        ) {
          await this.theaterModeController.syncState(stateResult.data);
        }

        this.logger.info("Initial state synchronized", {
          state: stateResult.data,
        });
      } else {
        this.logger.warn("Failed to sync initial state", {
          error: stateResult.error,
        });
      }

      return Result.success(true);
    } catch (error) {
      return Result.failure(
        this.errorHandler.handleError(error, {
          type: ErrorType.INITIALIZATION_ERROR,
          context: { phase: "stateSynchronization" },
        })
      );
    }
  }

  /**
   * 準備完了を通知
   * @returns {Promise<void>}
   * @private
   */
  async _notifyReady() {
    this.logger.debug("Notifying ready state");

    try {
      // バックグラウンドに準備完了を通知
      await this.messageBus.send(MessageType.SYSTEM_READY, {
        contentScript: true,
        timestamp: new Date().toISOString(),
        performanceMetrics: this.performanceMetrics,
      });

      this.logger.info("Ready state notified");
    } catch (error) {
      this.logger.warn("Failed to notify ready state", { error });
    }
  }

  /**
   * システムシャットダウンメッセージを処理
   * @param {Message} message - メッセージオブジェクト
   * @returns {Promise<any>} 処理結果
   * @private
   */
  async _handleSystemShutdown(message) {
    this.logger.info("Received system shutdown message");
    await this.destroy();
    return { acknowledged: true };
  }

  /**
   * シアターモードトグルメッセージを処理
   * @param {Message} message - メッセージオブジェクト
   * @returns {Promise<any>} 処理結果
   * @private
   */
  async _handleTheaterModeToggle(message) {
    this.logger.debug("Handling theater mode toggle", { data: message.data });

    try {
      if (this.theaterModeController && this.theaterModeController.toggle) {
        const result = await this.theaterModeController.toggle(message.data);
        return { success: true, result };
      } else {
        throw new Error("Theater mode controller not available");
      }
    } catch (error) {
      const appError = this.errorHandler.handleError(error, {
        context: { messageType: message.type },
      });
      return { success: false, error: appError.message };
    }
  }

  /**
   * 透明度変更メッセージを処理
   * @param {Message} message - メッセージオブジェクト
   * @returns {Promise<any>} 処理結果
   * @private
   */
  async _handleOpacityChange(message) {
    this.logger.debug("Handling opacity change", { data: message.data });

    try {
      if (
        this.theaterModeController &&
        this.theaterModeController.updateOpacity
      ) {
        const result = await this.theaterModeController.updateOpacity(
          message.data.value
        );
        return { success: true, result };
      } else {
        throw new Error("Theater mode controller not available");
      }
    } catch (error) {
      const appError = this.errorHandler.handleError(error, {
        context: { messageType: message.type },
      });
      return { success: false, error: appError.message };
    }
  }

  /**
   * 設定変更メッセージを処理
   * @param {Message} message - メッセージオブジェクト
   * @returns {Promise<any>} 処理結果
   * @private
   */
  async _handleSettingsChanged(message) {
    this.logger.debug("Handling settings change", { data: message.data });

    try {
      // 各コンポーネントに設定変更を通知
      const components = [
        this.theaterModeController,
        this.youtubePageDetector,
        this.contentScriptCommunicator,
      ];

      for (const component of components) {
        if (component && typeof component.onSettingsChanged === "function") {
          await component.onSettingsChanged(message.data);
        }
      }

      return { success: true };
    } catch (error) {
      const appError = this.errorHandler.handleError(error, {
        context: { messageType: message.type },
      });
      return { success: false, error: appError.message };
    }
  }

  /**
   * ページ離脱前の処理
   * @param {Event} event - beforeunloadイベント
   * @private
   */
  _handleBeforeUnload(event) {
    this.logger.debug("Handling before unload");
    this.destroy();
  }

  /**
   * ページ可視性変更の処理
   * @param {Event} event - visibilitychangeイベント
   * @private
   */
  _handleVisibilityChange(event) {
    const isVisible = !document.hidden;
    this.logger.debug("Page visibility changed", { isVisible });

    // 可視性変更をコンポーネントに通知
    if (
      this.theaterModeController &&
      this.theaterModeController.onVisibilityChange
    ) {
      this.theaterModeController.onVisibilityChange(isVisible);
    }
  }

  /**
   * DOM変更の処理
   * @param {MutationRecord[]} mutations - 変更記録
   * @private
   */
  _handleDOMChanges(mutations) {
    // YouTube の動的コンテンツ変更に対応
    let hasSignificantChanges = false;

    for (const mutation of mutations) {
      // 重要な要素の変更をチェック
      if (mutation.type === "childList") {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // 動画プレーヤーや重要な UI 要素の追加をチェック
            if (
              node.id === "movie_player" ||
              node.classList?.contains("html5-video-player") ||
              node.querySelector?.("#movie_player, .html5-video-player")
            ) {
              hasSignificantChanges = true;
              break;
            }
          }
        }
      }
    }

    if (hasSignificantChanges) {
      this.logger.debug("Significant DOM changes detected");

      // YouTube ページ検出器に変更を通知
      if (this.youtubePageDetector && this.youtubePageDetector.onDOMChange) {
        this.youtubePageDetector.onDOMChange(mutations);
      }

      // シアターモードコントローラーに変更を通知
      if (
        this.theaterModeController &&
        this.theaterModeController.onDOMChange
      ) {
        this.theaterModeController.onDOMChange(mutations);
      }
    }
  }

  /**
   * ライフサイクルイベントハンドラーを登録
   * @param {string} event - イベント名
   * @param {Function} handler - ハンドラー関数
   * @returns {Function} ハンドラー削除関数
   */
  onLifecycleEvent(event, handler) {
    if (!this.lifecycleHandlers.has(event)) {
      this.lifecycleHandlers.set(event, new Set());
    }

    this.lifecycleHandlers.get(event).add(handler);

    // ハンドラー削除関数を返す
    return () => {
      const handlers = this.lifecycleHandlers.get(event);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.lifecycleHandlers.delete(event);
        }
      }
    };
  }

  /**
   * ライフサイクルイベントを発火
   * @param {string} event - イベント名
   * @param {any} data - イベントデータ
   * @returns {Promise<void>}
   * @private
   */
  async _emitLifecycleEvent(event, data) {
    const handlers = this.lifecycleHandlers.get(event);
    if (!handlers || handlers.size === 0) {
      return;
    }

    this.logger.debug(`Emitting lifecycle event: ${event}`, { data });

    for (const handler of handlers) {
      try {
        await handler(data);
      } catch (error) {
        this.logger.warn(`Error in lifecycle event handler for ${event}`, {
          error,
        });
      }
    }
  }

  /**
   * 現在の状態を取得
   * @returns {Object} 状態オブジェクト
   */
  getState() {
    return {
      state: this.state,
      initialized: this.initialized,
      retryCount: this.retryCount,
      performanceMetrics: { ...this.performanceMetrics },
      errorStats: { ...this.errorStats },
      componentStates: {
        theaterModeController: this.theaterModeController?.getState?.() || null,
        youtubePageDetector: this.youtubePageDetector?.getState?.() || null,
        contentScriptCommunicator:
          this.contentScriptCommunicator?.getState?.() || null,
      },
    };
  }

  /**
   * 統計情報を取得
   * @returns {Object} 統計情報
   */
  getStats() {
    return {
      state: this.state,
      initialized: this.initialized,
      retryCount: this.retryCount,
      performanceMetrics: this.performanceMetrics,
      errorStats: this.errorStats,
      componentInitTimes: Object.fromEntries(
        this.performanceMetrics.componentInitTimes
      ),
      lifecycleHandlerCount: Array.from(
        this.lifecycleHandlers.entries()
      ).reduce((acc, [event, handlers]) => {
        acc[event] = handlers.size;
        return acc;
      }, {}),
    };
  }

  /**
   * ContentScriptManagerを破棄
   * @returns {Promise<void>}
   */
  async destroy() {
    if (this.state === ContentScriptState.DESTROYED) {
      return;
    }

    this.logger.info("Destroying ContentScriptManager");

    try {
      // 破棄開始イベントを発火
      await this._emitLifecycleEvent("destroying", {});

      // 各コンポーネントを破棄
      const components = [
        this.theaterModeController,
        this.youtubePageDetector,
        this.contentScriptCommunicator,
      ];

      for (const component of components) {
        if (component && typeof component.destroy === "function") {
          try {
            await component.destroy();
          } catch (error) {
            this.logger.warn("Error destroying component", { error });
          }
        }
      }

      // クリーンアップタスクを実行
      for (const cleanupTask of this.cleanupTasks) {
        try {
          if (typeof cleanupTask === "function") {
            cleanupTask();
          }
        } catch (error) {
          this.logger.warn("Error in cleanup task", { error });
        }
      }
      this.cleanupTasks.clear();

      // イベントリスナーを削除
      for (const [event, listener] of this.eventListeners.entries()) {
        try {
          if (event === "mutationObserver" && listener.disconnect) {
            listener.disconnect();
          } else {
            window.removeEventListener(event, listener);
            document.removeEventListener(event, listener);
          }
        } catch (error) {
          this.logger.warn(`Error removing event listener: ${event}`, {
            error,
          });
        }
      }
      this.eventListeners.clear();

      // 状態をリセット
      this.state = ContentScriptState.DESTROYED;
      this.initialized = false;

      // 破棄完了イベントを発火
      await this._emitLifecycleEvent("destroyed", {});

      this.logger.info("ContentScriptManager destroyed successfully");
    } catch (error) {
      this.logger.error("Error during ContentScriptManager destruction", {
        error,
      });
      this.state = ContentScriptState.ERROR;
    }
  }
}

// CommonJS/ES6 両対応のエクスポート
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    ContentScriptState,
    ContentScriptManager,
  };
} else if (typeof window !== "undefined") {
  window.ContentScriptState = ContentScriptState;
  window.ContentScriptManager = ContentScriptManager;
}
