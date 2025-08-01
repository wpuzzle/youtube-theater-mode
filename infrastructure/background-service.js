/**
 * BackgroundService
 * 拡張機能のバックグラウンド処理を管理する中核クラス
 * 新しいMessageBusシステムと統合、効率的なリソース管理、強化されたエラーハンドリング
 *
 * 主な機能:
 * - MessageBusシステムとの完全統合
 * - 効率的なリソース管理とメモリリーク防止
 * - 強化されたエラーハンドリングとログ機能
 * - パフォーマンス監視とヘルスチェック
 * - 設定管理とタブ状態同期
 */

// 依存関係のインポート
let Logger, ErrorHandler, Result, AppError, ErrorType, RetryManager;
let MessageBus, MessageType, MessageTarget, MessagePriority, Message;
let StorageAdapter, StorageType;

// Node.js環境での依存関係の解決
if (typeof require !== "undefined") {
  ({ Logger, createLogger } = require("./logger.js"));
  ({
    ErrorHandler,
    Result,
    AppError,
    ErrorType,
    RetryManager,
  } = require("./error-handler.js"));
  ({
    MessageBus,
    MessageType,
    MessageTarget,
    MessagePriority,
    Message,
  } = require("./message-bus.js"));
  ({ StorageAdapter, StorageType } = require("./storage-adapter.js"));
}

/**
 * リソース管理クラス
 * メモリリークを防止し、適切なクリーンアップを実行
 */
class ResourceManager {
  constructor(logger) {
    this.logger = logger;
    this.resources = new Map();
    this.timers = new Set();
    this.listeners = new Set();
    this.intervals = new Set();
    this.cleanupTasks = new Set();
    this.isDisposed = false;
  }

  /**
   * リソースを登録
   * @param {string} id - リソースID
   * @param {Object} resource - 管理対象リソース
   * @param {Function} cleanup - クリーンアップ関数
   */
  register(id, resource, cleanup) {
    if (this.isDisposed) {
      this.logger.warn(
        "ResourceManager is disposed, cannot register resource",
        { id }
      );
      return;
    }

    if (typeof cleanup !== "function") {
      this.logger.warn("Invalid cleanup function for resource", {
        id,
        resource,
      });
      return;
    }

    this.resources.set(id, { resource, cleanup });
    this.logger.debug("Resource registered", { id, type: typeof resource });
  }

  /**
   * タイマーを登録
   * @param {number} timerId - タイマーID
   */
  registerTimer(timerId) {
    if (this.isDisposed) return;
    this.timers.add(timerId);
  }

  /**
   * インターバルを登録
   * @param {number} intervalId - インターバルID
   */
  registerInterval(intervalId) {
    if (this.isDisposed) return;
    this.intervals.add(intervalId);
  }

  /**
   * イベントリスナーを登録
   * @param {Object} target - イベントターゲット
   * @param {string} event - イベント名
   * @param {Function} listener - リスナー関数
   */
  registerListener(target, event, listener) {
    if (this.isDisposed) return;
    const listenerInfo = { target, event, listener };
    this.listeners.add(listenerInfo);
    target.addEventListener(event, listener);
  }

  /**
   * クリーンアップタスクを登録
   * @param {Function} task - クリーンアップタスク
   */
  registerCleanupTask(task) {
    if (this.isDisposed) return;
    if (typeof task === "function") {
      this.cleanupTasks.add(task);
    }
  }

  /**
   * 特定のリソースを削除
   * @param {string} id - リソースID
   */
  unregister(id) {
    const resourceInfo = this.resources.get(id);
    if (resourceInfo) {
      try {
        resourceInfo.cleanup(resourceInfo.resource);
        this.logger.debug("Resource cleaned up", { id });
      } catch (error) {
        this.logger.warn("Error during resource cleanup", { error, id });
      }
      this.resources.delete(id);
    }
  }

  /**
   * 全リソースをクリーンアップ
   */
  cleanup() {
    if (this.isDisposed) return;

    this.logger.info("Starting resource cleanup", {
      resources: this.resources.size,
      timers: this.timers.size,
      intervals: this.intervals.size,
      listeners: this.listeners.size,
      cleanupTasks: this.cleanupTasks.size,
    });

    // 登録されたリソースをクリーンアップ
    for (const [id, { resource, cleanup }] of this.resources) {
      try {
        cleanup(resource);
        this.logger.debug("Resource cleaned up", { id });
      } catch (error) {
        this.logger.warn("Error during resource cleanup", {
          error,
          id,
          resource,
        });
      }
    }

    // タイマーをクリア
    for (const timerId of this.timers) {
      try {
        clearTimeout(timerId);
      } catch (error) {
        this.logger.warn("Error clearing timer", { error, timerId });
      }
    }

    // インターバルをクリア
    for (const intervalId of this.intervals) {
      try {
        clearInterval(intervalId);
      } catch (error) {
        this.logger.warn("Error clearing interval", { error, intervalId });
      }
    }

    // イベントリスナーを削除
    for (const { target, event, listener } of this.listeners) {
      try {
        target.removeEventListener(event, listener);
      } catch (error) {
        this.logger.warn("Error removing event listener", { error, event });
      }
    }

    // クリーンアップタスクを実行
    for (const task of this.cleanupTasks) {
      try {
        task();
      } catch (error) {
        this.logger.warn("Error in cleanup task", { error });
      }
    }

    // 全てのコレクションをクリア
    this.resources.clear();
    this.timers.clear();
    this.intervals.clear();
    this.listeners.clear();
    this.cleanupTasks.clear();

    this.isDisposed = true;
    this.logger.info("Resource cleanup completed");
  }

  /**
   * リソース使用状況を取得
   * @returns {Object} リソース使用状況
   */
  getResourceStats() {
    return {
      resources: this.resources.size,
      timers: this.timers.size,
      intervals: this.intervals.size,
      listeners: this.listeners.size,
      cleanupTasks: this.cleanupTasks.size,
      isDisposed: this.isDisposed,
    };
  }
}

/**
 * BackgroundService クラス
 * 拡張機能のバックグラウンド処理を管理
 * 効率的なリソース管理、強化されたエラーハンドリング、ログ機能を提供
 */
class BackgroundService {
  /**
   * BackgroundServiceインスタンスを作成
   * @param {Object} options - オプション
   * @param {Object} [options.logger] - ロガーインスタンス
   * @param {Object} [options.errorHandler] - エラーハンドラーインスタンス
   * @param {Object} [options.messageBus] - メッセージバスインスタンス
   * @param {Object} [options.storageAdapter] - ストレージアダプターインスタンス
   * @param {Object} [options.tabStateManager] - タブ状態管理インスタンス
   * @param {Object} [options.messageRouter] - メッセージルーターインスタンス
   * @param {Object} [options.serviceWorkerManager] - サービスワーカーマネージャーインスタンス
   */
  constructor(options = {}) {
    // 依存コンポーネントの初期化
    this.logger = options.logger || new Logger("BackgroundService");
    this.errorHandler = options.errorHandler || new ErrorHandler(this.logger);

    this.messageBus =
      options.messageBus ||
      new MessageBus({
        logger: this.logger,
        errorHandler: this.errorHandler,
        name: "background",
      });

    this.storageAdapter =
      options.storageAdapter ||
      new StorageAdapter({
        namespace: "youtube-theater-mode",
        logger: this.logger,
        errorHandler: this.errorHandler,
      });

    this.tabStateManager = options.tabStateManager;
    this.messageRouter = options.messageRouter;
    this.serviceWorkerManager = options.serviceWorkerManager;

    // リソース管理
    this.resourceManager = new ResourceManager(this.logger);

    // リトライマネージャー
    this.retryManager = new RetryManager({
      maxRetries: 3,
      baseDelay: 500,
      logger: this.logger,
    });

    // デフォルト設定
    this.DEFAULT_SETTINGS = {
      theaterModeEnabled: false,
      opacity: 0.7,
      keyboardShortcut: "t",
      lastUsed: null,
      version: "1.0.0",
    };

    // 初期化状態
    this.isInitialized = false;
    this.isDisposed = false;

    // パフォーマンス監視
    this.performanceMetrics = {
      messageHandlerCalls: 0,
      settingsOperations: 0,
      errorCount: 0,
      lastActivity: Date.now(),
    };

    // ヘルスチェック用のインターバル
    this.healthCheckInterval = null;

    // 初期化
    this.initialize();
  }

  /**
   * サービスを初期化
   */
  async initialize() {
    if (this.isInitialized || this.isDisposed) {
      this.logger.warn("BackgroundService already initialized or disposed");
      return;
    }

    this.logger.startPerformance("BackgroundService.initialize");

    try {
      this.logger.info("Initializing BackgroundService");

      // エラーハンドラーにエラーリスナーを追加
      this._setupErrorHandling();

      // メッセージハンドラーを登録
      this._registerMessageHandlers();

      // 設定の初期化
      await this._initializeSettings();

      // ヘルスチェックを開始
      this._startHealthCheck();

      // 拡張機能のバージョン情報を保存
      if (typeof chrome !== "undefined" && chrome.runtime) {
        const manifest = chrome.runtime.getManifest();
        await this.saveSettings({ version: manifest.version });
        this.logger.info("Extension version set", {
          version: manifest.version,
        });
      }

      // システム準備完了メッセージを送信
      await this.retryManager.withRetry(async () => {
        await this.messageBus.send(MessageType.SYSTEM_READY, {
          timestamp: Date.now(),
          version:
            typeof chrome !== "undefined" && chrome.runtime
              ? chrome.runtime.getManifest().version
              : "1.0.0",
        });
      });

      this.isInitialized = true;
      this.logger.info("BackgroundService initialized successfully");
      this.logger.endPerformance("BackgroundService.initialize");
    } catch (error) {
      this.logger.endPerformance("BackgroundService.initialize");
      this.logger.error("Failed to initialize BackgroundService", error);

      const appError = this.errorHandler.handleError(error, {
        type: ErrorType.INITIALIZATION_ERROR,
        context: { component: "BackgroundService" },
      });

      this.performanceMetrics.errorCount++;

      // システムエラーメッセージを送信
      try {
        await this.messageBus.send(MessageType.SYSTEM_ERROR, {
          error: "Failed to initialize background service",
          timestamp: Date.now(),
          details: appError.toJSON(),
        });
      } catch (sendError) {
        this.logger.error("Failed to send system error message", sendError);
      }

      throw appError;
    }
  }

  /**
   * エラーハンドリングを設定
   * @private
   */
  _setupErrorHandling() {
    // グローバルエラーリスナーを追加
    this.errorHandler.addErrorListener((error) => {
      this.performanceMetrics.errorCount++;
      this.performanceMetrics.lastActivity = Date.now();

      // 重大なエラーの場合はシステムエラーメッセージを送信
      if (error.severity <= 1) {
        // FATAL or ERROR
        this.messageBus
          .send(MessageType.SYSTEM_ERROR, {
            error: error.message,
            type: error.type,
            timestamp: Date.now(),
            context: error.context,
          })
          .catch((sendError) => {
            this.logger.error("Failed to send error notification", sendError);
          });
      }
    });

    // 特定のエラータイプに対するハンドラーを登録
    this.errorHandler.registerTypeHandler(ErrorType.STORAGE_ERROR, (error) => {
      this.logger.warn("Storage error detected, attempting recovery", error);
      // ストレージエラーの場合は設定を再初期化
      this._initializeSettings().catch((initError) => {
        this.logger.error("Failed to recover from storage error", initError);
      });
    });

    this.errorHandler.registerTypeHandler(
      ErrorType.COMMUNICATION_ERROR,
      (error) => {
        this.logger.warn("Communication error detected", error);
        // 通信エラーの場合はメッセージバスを再初期化
        // 実装は必要に応じて追加
      }
    );
  }

  /**
   * ヘルスチェックを開始
   * @private
   */
  _startHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(() => {
      this._performHealthCheck();
    }, 60000); // 1分間隔

    this.resourceManager.registerInterval(this.healthCheckInterval);
  }

  /**
   * ヘルスチェックを実行
   * @private
   */
  _performHealthCheck() {
    try {
      const now = Date.now();
      const timeSinceLastActivity = now - this.performanceMetrics.lastActivity;

      // メモリ使用量をログ
      this.logger.logMemoryUsage("BackgroundService Health Check");

      // パフォーマンス統計をログ
      this.logger.info("BackgroundService health check", {
        ...this.performanceMetrics,
        timeSinceLastActivity,
        resourceStats: this.resourceManager.getResourceStats(),
        isInitialized: this.isInitialized,
        isDisposed: this.isDisposed,
      });

      // 長時間非アクティブの場合は警告
      if (timeSinceLastActivity > 300000) {
        // 5分
        this.logger.warn(
          "BackgroundService has been inactive for a long time",
          {
            timeSinceLastActivity,
          }
        );
      }

      // エラー率が高い場合は警告
      const errorRate =
        this.performanceMetrics.errorCount /
        Math.max(this.performanceMetrics.messageHandlerCalls, 1);
      if (errorRate > 0.1) {
        // 10%以上
        this.logger.warn("High error rate detected", {
          errorRate,
          errorCount: this.performanceMetrics.errorCount,
          totalCalls: this.performanceMetrics.messageHandlerCalls,
        });
      }
    } catch (error) {
      this.logger.error("Error during health check", error);
    }
  }

  /**
   * メッセージハンドラーを登録
   * @private
   */
  _registerMessageHandlers() {
    // 設定取得
    const settingsGetHandler = this.messageBus.registerHandler(
      MessageType.SETTINGS_GET,
      async (message) => {
        this.performanceMetrics.messageHandlerCalls++;
        this.performanceMetrics.lastActivity = Date.now();

        this.logger.debug("Handling SETTINGS_GET message", {
          messageId: message.id,
        });

        const result = await this.retryManager.withRetry(
          () => this.loadSettings(),
          {
            retryCondition: (error) => error.type === ErrorType.STORAGE_ERROR,
          }
        );

        return result.isSuccess()
          ? result.data
          : { error: result.error.message };
      }
    );

    // 設定保存
    const settingsSetHandler = this.messageBus.registerHandler(
      MessageType.SETTINGS_SET,
      async (message) => {
        this.performanceMetrics.messageHandlerCalls++;
        this.performanceMetrics.settingsOperations++;
        this.performanceMetrics.lastActivity = Date.now();

        this.logger.debug("Handling SETTINGS_SET message", {
          messageId: message.id,
          data: message.data,
        });

        const result = await this.retryManager.withRetry(
          () => this.saveSettings(message.data),
          {
            retryCondition: (error) => error.type === ErrorType.STORAGE_ERROR,
          }
        );

        return result.isSuccess()
          ? { success: true }
          : { error: result.error.message };
      }
    );

    // シアターモード切り替え
    const theaterToggleHandler = this.messageBus.registerHandler(
      MessageType.THEATER_MODE_TOGGLE,
      async (message) => {
        this.performanceMetrics.messageHandlerCalls++;
        this.performanceMetrics.lastActivity = Date.now();

        this.logger.debug("Handling THEATER_MODE_TOGGLE message", {
          messageId: message.id,
        });

        const result = await this.retryManager.withRetry(() =>
          this.handleTheaterModeToggle(message.data?.tabId)
        );

        return result.isSuccess()
          ? result.data
          : { error: result.error.message };
      }
    );

    // シアターモード設定
    const theaterSetHandler = this.messageBus.registerHandler(
      MessageType.THEATER_MODE_SET,
      async (message) => {
        this.performanceMetrics.messageHandlerCalls++;
        this.performanceMetrics.lastActivity = Date.now();

        this.logger.debug("Handling THEATER_MODE_SET message", {
          messageId: message.id,
          enabled: message.data?.enabled,
        });

        const result = await this.retryManager.withRetry(() =>
          this.setTheaterMode(message.data?.enabled, message.data?.tabId)
        );

        return result.isSuccess()
          ? result.data
          : { error: result.error.message };
      }
    );

    // 透明度変更
    const opacityHandler = this.messageBus.registerHandler(
      MessageType.OPACITY_CHANGE,
      async (message) => {
        this.performanceMetrics.messageHandlerCalls++;
        this.performanceMetrics.lastActivity = Date.now();

        this.logger.debug("Handling OPACITY_CHANGE message", {
          messageId: message.id,
          value: message.data?.value,
        });

        const result = await this.retryManager.withRetry(() =>
          this.updateOpacity(message.data?.value, message.data?.tabId)
        );

        return result.isSuccess()
          ? result.data
          : { error: result.error.message };
      }
    );

    // タブ状態取得
    const tabActivatedHandler = this.messageBus.registerHandler(
      MessageType.TAB_ACTIVATED,
      async (message) => {
        this.performanceMetrics.messageHandlerCalls++;
        this.performanceMetrics.lastActivity = Date.now();

        this.logger.debug("Handling TAB_ACTIVATED message", {
          messageId: message.id,
          tabId: message.data?.tabId,
        });

        if (this.tabStateManager && message.data?.tabId) {
          try {
            await this.tabStateManager.setActiveTab(message.data.tabId);
            return { success: true };
          } catch (error) {
            this.errorHandler.handleError(error, {
              type: ErrorType.INTERNAL_ERROR,
              context: { operation: "setActiveTab", tabId: message.data.tabId },
            });
            return { success: false, error: error.message };
          }
        }
        return {
          success: false,
          error: "Tab state manager not available or invalid tab ID",
        };
      }
    );

    // システム初期化
    const systemInitHandler = this.messageBus.registerHandler(
      MessageType.SYSTEM_INIT,
      async (message) => {
        this.performanceMetrics.messageHandlerCalls++;
        this.performanceMetrics.lastActivity = Date.now();

        this.logger.debug("Handling SYSTEM_INIT message", {
          messageId: message.id,
        });

        try {
          // 既に初期化されている場合は再初期化をスキップ
          if (!this.isInitialized) {
            await this.initialize();
          }
          return { success: true };
        } catch (error) {
          this.errorHandler.handleError(error, {
            type: ErrorType.INITIALIZATION_ERROR,
            context: { operation: "reinitialize" },
          });
          return { success: false, error: error.message };
        }
      }
    );

    // システムシャットダウン
    const systemShutdownHandler = this.messageBus.registerHandler(
      MessageType.SYSTEM_SHUTDOWN,
      async (message) => {
        this.performanceMetrics.messageHandlerCalls++;
        this.performanceMetrics.lastActivity = Date.now();

        this.logger.debug("Handling SYSTEM_SHUTDOWN message", {
          messageId: message.id,
        });

        try {
          await this.dispose();
          return { success: true };
        } catch (error) {
          this.errorHandler.handleError(error, {
            type: ErrorType.INTERNAL_ERROR,
            context: { operation: "dispose" },
          });
          return { success: false, error: error.message };
        }
      }
    );

    // ハンドラーをリソースマネージャーに登録
    this.resourceManager.register(
      "settingsGetHandler",
      settingsGetHandler,
      (handler) => handler()
    );
    this.resourceManager.register(
      "settingsSetHandler",
      settingsSetHandler,
      (handler) => handler()
    );
    this.resourceManager.register(
      "theaterToggleHandler",
      theaterToggleHandler,
      (handler) => handler()
    );
    this.resourceManager.register(
      "theaterSetHandler",
      theaterSetHandler,
      (handler) => handler()
    );
    this.resourceManager.register("opacityHandler", opacityHandler, (handler) =>
      handler()
    );
    this.resourceManager.register(
      "tabActivatedHandler",
      tabActivatedHandler,
      (handler) => handler()
    );
    this.resourceManager.register(
      "systemInitHandler",
      systemInitHandler,
      (handler) => handler()
    );
    this.resourceManager.register(
      "systemShutdownHandler",
      systemShutdownHandler,
      (handler) => handler()
    );
  }

  /**
   * 設定を初期化
   * @private
   */
  async _initializeSettings() {
    try {
      this.logger.info("Initializing settings");

      // 設定の読み込み
      const settingsResult = await this.loadSettings();
      let settings;

      if (
        settingsResult.isFailure() ||
        !settingsResult.data ||
        Object.keys(settingsResult.data).length === 0
      ) {
        // 設定が存在しない場合は初期化
        this.logger.info("No settings found, initializing with defaults");
        const saveResult = await this.saveSettings(this.DEFAULT_SETTINGS);

        if (saveResult.isFailure()) {
          throw new Error(
            `Failed to save default settings: ${saveResult.error.message}`
          );
        }

        settings = this.DEFAULT_SETTINGS;
      } else {
        settings = settingsResult.data;

        // 設定の整合性チェック
        const validatedSettings = this._validateSettings(settings);
        if (JSON.stringify(validatedSettings) !== JSON.stringify(settings)) {
          this.logger.info("Settings validation resulted in changes, updating");
          const saveResult = await this.saveSettings(validatedSettings);

          if (saveResult.isFailure()) {
            throw new Error(
              `Failed to save validated settings: ${saveResult.error.message}`
            );
          }

          settings = validatedSettings;
        }
      }

      // 設定変更通知を送信
      this.messageBus.send(MessageType.SETTINGS_CHANGED, settings);

      return Result.success(settings);
    } catch (error) {
      this.logger.error("Failed to initialize settings", error);
      return Result.failure(error, {
        type: ErrorType.INITIALIZATION_ERROR,
        context: { component: "Settings" },
      });
    }
  }

  /**
   * 設定を検証
   * @param {Object} settings - 検証する設定
   * @returns {Object} 検証済み設定
   * @private
   */
  _validateSettings(settings) {
    const validated = { ...this.DEFAULT_SETTINGS };

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
   * 設定を読み込み
   * @returns {Promise<Result<Object>>} 設定オブジェクト
   */
  async loadSettings() {
    try {
      this.logger.debug("Loading settings");

      // 全ての設定を取得
      const result = await this.storageAdapter.get("settings");

      if (result.isFailure()) {
        this.logger.warn("Failed to load settings", { error: result.error });
        return Result.success(this.DEFAULT_SETTINGS);
      }

      // 設定が存在しない場合はデフォルト値を返す
      if (!result.data) {
        this.logger.debug("No settings found, using defaults");
        return Result.success(this.DEFAULT_SETTINGS);
      }

      this.logger.debug("Settings loaded successfully");
      return Result.success(result.data);
    } catch (error) {
      this.logger.error("Error in loadSettings", error);
      return Result.failure(error, {
        type: ErrorType.STORAGE_ERROR,
        context: { operation: "loadSettings" },
      });
    }
  }

  /**
   * 設定を保存
   * @param {Object} settings - 保存する設定
   * @returns {Promise<Result<boolean>>} 成功時true
   */
  async saveSettings(settings) {
    try {
      this.logger.debug("Saving settings", settings);

      // 現在の設定を読み込み
      const currentResult = await this.loadSettings();
      const currentSettings = currentResult.isSuccess()
        ? currentResult.data
        : this.DEFAULT_SETTINGS;

      // 新しい設定をマージ
      const newSettings = {
        ...currentSettings,
        ...settings,
        lastUsed: Date.now(),
      };

      // 設定を保存
      const result = await this.storageAdapter.set("settings", newSettings);

      if (result.isFailure()) {
        this.logger.warn("Failed to save settings", { error: result.error });
        return result;
      }

      // 設定変更通知を送信
      this.messageBus.send(MessageType.SETTINGS_CHANGED, newSettings);

      this.logger.debug("Settings saved successfully");
      return Result.success(true);
    } catch (error) {
      this.logger.error("Error in saveSettings", error);
      return Result.failure(error, {
        type: ErrorType.STORAGE_ERROR,
        context: { operation: "saveSettings" },
      });
    }
  }

  /**
   * シアターモード切り替え処理
   * @param {number} tabId - タブID
   * @returns {Promise<Result<Object>>} 処理結果
   */
  async handleTheaterModeToggle(tabId) {
    try {
      this.logger.info("Toggling theater mode", { tabId });

      // 現在の設定を読み込み
      const settingsResult = await this.loadSettings();

      if (settingsResult.isFailure()) {
        return settingsResult;
      }

      const settings = settingsResult.data;
      const newState = !settings.theaterModeEnabled;

      // 設定を更新
      const saveResult = await this.saveSettings({
        theaterModeEnabled: newState,
      });

      if (saveResult.isFailure()) {
        return saveResult;
      }

      // タブ状態を更新
      if (tabId && this.tabStateManager) {
        await this.tabStateManager.updateTabState(tabId, {
          theaterModeEnabled: newState,
          lastSync: Date.now(),
        });

        // 全てのタブを同期
        this.tabStateManager.syncAllTabs();
      }

      // シアターモード状態変更通知を送信
      this.messageBus.send(MessageType.THEATER_MODE_STATUS, {
        enabled: newState,
        timestamp: Date.now(),
        tabId,
      });

      this.logger.info("Theater mode toggled", { newState, tabId });

      return Result.success({ enabled: newState });
    } catch (error) {
      this.logger.error("Error toggling theater mode", error);
      return Result.failure(error, {
        type: ErrorType.INTERNAL_ERROR,
        context: { operation: "toggleTheaterMode", tabId },
      });
    }
  }

  /**
   * シアターモード状態を設定
   * @param {boolean} enabled - 有効状態
   * @param {number} tabId - タブID
   * @returns {Promise<Result<Object>>} 処理結果
   */
  async setTheaterMode(enabled, tabId) {
    try {
      this.logger.info("Setting theater mode", { enabled, tabId });

      // 設定を更新
      const saveResult = await this.saveSettings({
        theaterModeEnabled: enabled,
      });

      if (saveResult.isFailure()) {
        return saveResult;
      }

      // タブ状態を更新
      if (tabId && this.tabStateManager) {
        await this.tabStateManager.updateTabState(tabId, {
          theaterModeEnabled: enabled,
          lastSync: Date.now(),
        });

        // 全てのタブを同期
        this.tabStateManager.syncAllTabs();
      }

      // シアターモード状態変更通知を送信
      this.messageBus.send(MessageType.THEATER_MODE_STATUS, {
        enabled,
        timestamp: Date.now(),
        tabId,
      });

      this.logger.info("Theater mode set", { enabled, tabId });

      return Result.success({ enabled });
    } catch (error) {
      this.logger.error("Error setting theater mode", error);
      return Result.failure(error, {
        type: ErrorType.INTERNAL_ERROR,
        context: { operation: "setTheaterMode", enabled, tabId },
      });
    }
  }

  /**
   * 透明度更新処理
   * @param {number} opacity - 透明度値
   * @param {number} tabId - タブID
   * @returns {Promise<Result<Object>>} 処理結果
   */
  async updateOpacity(opacity, tabId) {
    try {
      // 透明度を0-90%に制限
      const validOpacity = Math.max(0, Math.min(0.9, parseFloat(opacity)));

      this.logger.info("Updating opacity", { opacity: validOpacity, tabId });

      // 設定を更新
      const saveResult = await this.saveSettings({ opacity: validOpacity });

      if (saveResult.isFailure()) {
        return saveResult;
      }

      // タブ状態を更新
      if (tabId && this.tabStateManager) {
        await this.tabStateManager.updateTabState(tabId, {
          opacity: validOpacity,
          lastSync: Date.now(),
        });

        // 全てのタブを同期
        this.tabStateManager.syncAllTabs();
      }

      // 透明度変更通知を送信
      this.messageBus.send(MessageType.OPACITY_CHANGE, {
        value: validOpacity,
        percentage: Math.round(validOpacity * 100),
        timestamp: Date.now(),
        tabId,
      });

      this.logger.info("Opacity updated", { opacity: validOpacity, tabId });

      return Result.success({
        opacity: validOpacity,
        percentage: Math.round(validOpacity * 100),
      });
    } catch (error) {
      this.logger.error("Error updating opacity", error);
      return Result.failure(error, {
        type: ErrorType.INTERNAL_ERROR,
        context: { operation: "updateOpacity", opacity, tabId },
      });
    }
  }

  /**
   * デフォルト透明度設定処理
   * @param {number} tabId - タブID
   * @returns {Promise<Result<Object>>} 処理結果
   */
  async setDefaultOpacity(tabId) {
    return this.updateOpacity(this.DEFAULT_SETTINGS.opacity, tabId);
  }

  /**
   * リソースを登録
   * @param {string} id - リソースID
   * @param {Object} resource - 管理対象リソース
   * @param {Function} cleanup - クリーンアップ関数
   */
  registerResource(id, resource, cleanup) {
    this.resourceManager.register(id, resource, cleanup);
  }

  /**
   * パフォーマンス統計を取得
   * @returns {Object} パフォーマンス統計
   */
  getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      resourceStats: this.resourceManager.getResourceStats(),
      loggerStats: this.logger.getPerformanceStats(),
      isInitialized: this.isInitialized,
      isDisposed: this.isDisposed,
    };
  }

  /**
   * サービスの状態を取得
   * @returns {Object} サービス状態
   */
  getServiceStatus() {
    return {
      isInitialized: this.isInitialized,
      isDisposed: this.isDisposed,
      performanceMetrics: this.performanceMetrics,
      resourceStats: this.resourceManager.getResourceStats(),
      hasTabStateManager: !!this.tabStateManager,
      hasMessageRouter: !!this.messageRouter,
      hasServiceWorkerManager: !!this.serviceWorkerManager,
    };
  }

  /**
   * サービスを破棄
   * 全てのリソースをクリーンアップし、サービスを停止
   * @returns {Promise<void>}
   */
  async dispose() {
    if (this.isDisposed) {
      this.logger.warn("BackgroundService already disposed");
      return;
    }

    this.logger.info("Disposing BackgroundService");

    try {
      // システムシャットダウンメッセージを送信
      await this.messageBus.send(MessageType.SYSTEM_SHUTDOWN, {
        timestamp: Date.now(),
        performanceMetrics: this.performanceMetrics,
      });

      // ヘルスチェックを停止
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
      }

      // 全てのリソースをクリーンアップ
      this.resourceManager.cleanup();

      // 依存コンポーネントを破棄
      if (this.messageBus) {
        this.messageBus.clear();
      }

      if (
        this.messageRouter &&
        typeof this.messageRouter.dispose === "function"
      ) {
        this.messageRouter.dispose();
      }

      if (
        this.serviceWorkerManager &&
        typeof this.serviceWorkerManager.dispose === "function"
      ) {
        this.serviceWorkerManager.dispose();
      }

      this.isDisposed = true;
      this.logger.info("BackgroundService disposed successfully");
    } catch (error) {
      this.logger.error("Error during BackgroundService disposal", error);
      this.isDisposed = true;
    }
  }

  /**
   * サービスを破棄
   * @returns {Promise<Result<boolean>>} 破棄結果
   */
  async dispose() {
    if (this.isDisposed) {
      this.logger.warn("BackgroundService already disposed");
      return Result.success(true);
    }

    this.logger.info("Disposing BackgroundService");

    try {
      // システムシャットダウンメッセージを送信
      await this.messageBus.send(MessageType.SYSTEM_SHUTDOWN, {
        timestamp: Date.now(),
        performanceMetrics: this.performanceMetrics,
      });

      // メッセージバスをクリア
      this.messageBus.clear();

      // メッセージルーターを破棄
      if (this.messageRouter) {
        this.messageRouter.dispose();
      }

      // サービスワーカーマネージャーを破棄
      if (this.serviceWorkerManager) {
        this.serviceWorkerManager.dispose();
      }

      // リソースをクリーンアップ
      this.resourceManager.cleanup();

      this.isDisposed = true;
      this.logger.info("BackgroundService disposed successfully");

      return Result.success(true);
    } catch (error) {
      this.logger.error("Error disposing BackgroundService", error);
      return Result.failure(error, {
        type: ErrorType.INTERNAL_ERROR,
        context: { operation: "dispose" },
      });
    }
  }
}

// CommonJS/ES6 両対応のエクスポート
if (typeof module !== "undefined" && module.exports) {
  module.exports = { BackgroundService, ResourceManager };
} else if (typeof window !== "undefined") {
  window.BackgroundService = BackgroundService;
  window.ResourceManager = ResourceManager;
}
