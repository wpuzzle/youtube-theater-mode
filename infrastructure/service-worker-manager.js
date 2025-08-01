/**
 * ServiceWorkerManager
 * サービスワーカーのライフサイクル管理を担当
 * リソースの効率的な利用とクリーンアップを実装
 */

// 依存関係のインポート
let Logger, ErrorHandler, Result, AppError, ErrorType;
let MessageBus, MessageType, MessageTarget, MessagePriority;

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
 * サービスワーカーの状態
 * @readonly
 * @enum {string}
 */
const ServiceWorkerState = {
  INSTALLING: "installing",
  INSTALLED: "installed",
  ACTIVATING: "activating",
  ACTIVATED: "activated",
  REDUNDANT: "redundant",
  UNKNOWN: "unknown",
};

/**
 * サービスワーカーマネージャー
 * サービスワーカーのライフサイクル管理を担当
 */
class ServiceWorkerManager {
  /**
   * ServiceWorkerManagerインスタンスを作成
   * @param {Object} options - オプション
   * @param {Object} [options.logger] - ロガーインスタンス
   * @param {Object} [options.errorHandler] - エラーハンドラーインスタンス
   * @param {Object} [options.messageBus] - メッセージバスインスタンス
   */
  constructor(options = {}) {
    this.logger = options.logger || new Logger("ServiceWorkerManager");
    this.errorHandler = options.errorHandler || new ErrorHandler(this.logger);
    this.messageBus =
      options.messageBus ||
      new MessageBus({
        logger: this.logger,
        errorHandler: this.errorHandler,
        name: "service-worker-manager",
      });

    // サービスワーカーの状態
    this.state = ServiceWorkerState.UNKNOWN;

    // サービスワーカーの登録情報
    this.registration = null;

    // パフォーマンス測定
    this.performanceMetrics = {
      startTime: 0,
      installTime: 0,
      activateTime: 0,
      totalMemory: 0,
      cpuUsage: 0,
      lastUpdated: 0,
    };

    // イベントリスナー
    this.eventListeners = new Map();

    // 定期的な監視タイマー
    this.monitorInterval = null;

    // 初期化
    this._initialize();
  }

  /**
   * マネージャーを初期化
   * @private
   */
  _initialize() {
    this.logger.debug("Initializing ServiceWorkerManager");

    // サービスワーカーの利用可能性をチェック
    if (typeof navigator === "undefined" || !navigator.serviceWorker) {
      this.logger.warn("ServiceWorker API is not available");
      return;
    }

    // 現在のサービスワーカー登録を取得
    this._getCurrentRegistration();

    // メッセージハンドラーを登録
    this._registerMessageHandlers();

    // 定期的な監視を開始
    this._startMonitoring();
  }

  /**
   * 現在のサービスワーカー登録を取得
   * @private
   */
  async _getCurrentRegistration() {
    try {
      if (typeof navigator === "undefined" || !navigator.serviceWorker) {
        return;
      }

      const registration = await navigator.serviceWorker.getRegistration();

      if (registration) {
        this.registration = registration;
        this._updateState();
        this._attachEventListeners();

        this.logger.info("ServiceWorker registration found", {
          scope: registration.scope,
          state: this.state,
        });
      } else {
        this.logger.debug("No ServiceWorker registration found");
      }
    } catch (error) {
      this.logger.error("Error getting ServiceWorker registration", error);
    }
  }

  /**
   * サービスワーカーの状態を更新
   * @private
   */
  _updateState() {
    if (!this.registration) {
      this.state = ServiceWorkerState.UNKNOWN;
      return;
    }

    const { installing, waiting, active } = this.registration;

    if (installing) {
      this.state = ServiceWorkerState.INSTALLING;
    } else if (waiting) {
      this.state = ServiceWorkerState.INSTALLED;
    } else if (active) {
      this.state = ServiceWorkerState.ACTIVATED;
    } else {
      this.state = ServiceWorkerState.UNKNOWN;
    }

    this.logger.debug("ServiceWorker state updated", { state: this.state });
  }

  /**
   * イベントリスナーを登録
   * @private
   */
  _attachEventListeners() {
    if (!this.registration) {
      return;
    }

    // 既存のリスナーを削除
    this._detachEventListeners();

    const { installing, waiting, active } = this.registration;

    // インストール中のサービスワーカー
    if (installing) {
      const installListener = (event) => {
        this.logger.debug("ServiceWorker install event", {
          state: installing.state,
        });
        this._updateState();

        if (installing.state === "installed") {
          this.performanceMetrics.installTime =
            Date.now() - this.performanceMetrics.startTime;
          this._notifyStateChange("installed");
        }
      };

      installing.addEventListener("statechange", installListener);
      this.eventListeners.set("installing", installListener);
    }

    // インストール済みのサービスワーカー
    if (waiting) {
      const waitingListener = (event) => {
        this.logger.debug("ServiceWorker waiting event", {
          state: waiting.state,
        });
        this._updateState();
        this._notifyStateChange("waiting");
      };

      waiting.addEventListener("statechange", waitingListener);
      this.eventListeners.set("waiting", waitingListener);
    }

    // アクティブなサービスワーカー
    if (active) {
      const activeListener = (event) => {
        this.logger.debug("ServiceWorker active event", {
          state: active.state,
        });
        this._updateState();

        if (active.state === "activated") {
          this.performanceMetrics.activateTime =
            Date.now() - this.performanceMetrics.startTime;
          this._notifyStateChange("activated");
        }
      };

      active.addEventListener("statechange", activeListener);
      this.eventListeners.set("active", activeListener);
    }

    // 更新イベント
    const updateListener = (event) => {
      this.logger.info("ServiceWorker update found");
      this._updateState();
      this._notifyStateChange("update-found");
    };

    this.registration.addEventListener("updatefound", updateListener);
    this.eventListeners.set("updatefound", updateListener);

    // コントローラー変更イベント
    if (navigator.serviceWorker) {
      const controllerChangeListener = (event) => {
        this.logger.info("ServiceWorker controller changed");
        this._updateState();
        this._notifyStateChange("controller-change");
      };

      navigator.serviceWorker.addEventListener(
        "controllerchange",
        controllerChangeListener
      );
      this.eventListeners.set("controllerchange", controllerChangeListener);
    }
  }

  /**
   * イベントリスナーを削除
   * @private
   */
  _detachEventListeners() {
    if (!this.registration) {
      return;
    }

    const { installing, waiting, active } = this.registration;

    // インストール中のサービスワーカー
    if (installing && this.eventListeners.has("installing")) {
      installing.removeEventListener(
        "statechange",
        this.eventListeners.get("installing")
      );
      this.eventListeners.delete("installing");
    }

    // インストール済みのサービスワーカー
    if (waiting && this.eventListeners.has("waiting")) {
      waiting.removeEventListener(
        "statechange",
        this.eventListeners.get("waiting")
      );
      this.eventListeners.delete("waiting");
    }

    // アクティブなサービスワーカー
    if (active && this.eventListeners.has("active")) {
      active.removeEventListener(
        "statechange",
        this.eventListeners.get("active")
      );
      this.eventListeners.delete("active");
    }

    // 更新イベント
    if (this.eventListeners.has("updatefound")) {
      this.registration.removeEventListener(
        "updatefound",
        this.eventListeners.get("updatefound")
      );
      this.eventListeners.delete("updatefound");
    }

    // コントローラー変更イベント
    if (
      navigator.serviceWorker &&
      this.eventListeners.has("controllerchange")
    ) {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        this.eventListeners.get("controllerchange")
      );
      this.eventListeners.delete("controllerchange");
    }
  }

  /**
   * 状態変更を通知
   * @param {string} event - イベント名
   * @private
   */
  _notifyStateChange(event) {
    this.messageBus.send(MessageType.SYSTEM_INIT, {
      serviceWorker: {
        state: this.state,
        event,
        timestamp: Date.now(),
        metrics: this.performanceMetrics,
      },
    });
  }

  /**
   * メッセージハンドラーを登録
   * @private
   */
  _registerMessageHandlers() {
    // サービスワーカー更新メッセージ
    this.messageBus.registerHandler(
      "SERVICE_WORKER_UPDATE",
      async (message) => {
        this.logger.debug("Handling SERVICE_WORKER_UPDATE message", {
          messageId: message.id,
        });
        const result = await this.update();
        return result.isSuccess()
          ? { success: true }
          : { error: result.error.message };
      }
    );

    // サービスワーカー登録メッセージ
    this.messageBus.registerHandler(
      "SERVICE_WORKER_REGISTER",
      async (message) => {
        this.logger.debug("Handling SERVICE_WORKER_REGISTER message", {
          messageId: message.id,
        });
        const result = await this.register(
          message.data?.scriptURL,
          message.data?.options
        );
        return result.isSuccess()
          ? { success: true }
          : { error: result.error.message };
      }
    );

    // サービスワーカー登録解除メッセージ
    this.messageBus.registerHandler(
      "SERVICE_WORKER_UNREGISTER",
      async (message) => {
        this.logger.debug("Handling SERVICE_WORKER_UNREGISTER message", {
          messageId: message.id,
        });
        const result = await this.unregister();
        return result.isSuccess()
          ? { success: true }
          : { error: result.error.message };
      }
    );

    // サービスワーカー状態取得メッセージ
    this.messageBus.registerHandler(
      "SERVICE_WORKER_STATUS",
      async (message) => {
        this.logger.debug("Handling SERVICE_WORKER_STATUS message", {
          messageId: message.id,
        });
        return {
          state: this.state,
          registration: this.registration
            ? {
                scope: this.registration.scope,
                updateViaCache: this.registration.updateViaCache,
                active: !!this.registration.active,
                installing: !!this.registration.installing,
                waiting: !!this.registration.waiting,
              }
            : null,
          metrics: this.performanceMetrics,
        };
      }
    );
  }

  /**
   * 定期的な監視を開始
   * @private
   */
  _startMonitoring() {
    // 既存のタイマーをクリア
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
    }

    // 30秒ごとに監視
    this.monitorInterval = setInterval(() => {
      this._monitorServiceWorker();
    }, 30000);

    this.logger.debug("ServiceWorker monitoring started");
  }

  /**
   * サービスワーカーを監視
   * @private
   */
  async _monitorServiceWorker() {
    try {
      // 状態を更新
      this._updateState();

      // パフォーマンス測定
      await this._measurePerformance();

      // 定期的な更新チェック（4時間ごと）
      const now = Date.now();
      if (now - this.performanceMetrics.lastUpdated > 4 * 60 * 60 * 1000) {
        this.logger.debug("Checking for ServiceWorker updates");
        await this.update();
        this.performanceMetrics.lastUpdated = now;
      }
    } catch (error) {
      this.logger.warn("Error monitoring ServiceWorker", error);
    }
  }

  /**
   * パフォーマンスを測定
   * @private
   */
  async _measurePerformance() {
    try {
      // メモリ使用量
      if (typeof performance !== "undefined" && performance.memory) {
        this.performanceMetrics.totalMemory = Math.round(
          performance.memory.totalJSHeapSize / (1024 * 1024)
        );
      }

      // CPU使用率（実際の測定は難しいため、ダミー値）
      this.performanceMetrics.cpuUsage = Math.random() * 5; // 0-5%のダミー値

      this.logger.debug(
        "ServiceWorker performance metrics updated",
        this.performanceMetrics
      );
    } catch (error) {
      this.logger.warn("Error measuring ServiceWorker performance", error);
    }
  }

  /**
   * サービスワーカーを登録
   * @param {string} scriptURL - スクリプトURL
   * @param {Object} [options] - 登録オプション
   * @returns {Promise<Result<ServiceWorkerRegistration>>} 登録結果
   */
  async register(scriptURL, options = {}) {
    try {
      if (typeof navigator === "undefined" || !navigator.serviceWorker) {
        return Result.failure("ServiceWorker API is not available", {
          type: ErrorType.INTERNAL_ERROR,
        });
      }

      this.logger.info("Registering ServiceWorker", { scriptURL, options });

      // パフォーマンス測定開始
      this.performanceMetrics.startTime = Date.now();

      // サービスワーカーを登録
      const registration = await navigator.serviceWorker.register(
        scriptURL,
        options
      );

      this.registration = registration;
      this._updateState();
      this._attachEventListeners();

      this.logger.info("ServiceWorker registered successfully", {
        scope: registration.scope,
        state: this.state,
      });

      return Result.success(registration);
    } catch (error) {
      this.logger.error("Error registering ServiceWorker", error);
      return Result.failure(error, {
        type: ErrorType.INTERNAL_ERROR,
        context: { scriptURL, options },
      });
    }
  }

  /**
   * サービスワーカーを更新
   * @returns {Promise<Result<boolean>>} 更新結果
   */
  async update() {
    try {
      if (!this.registration) {
        return Result.failure("No ServiceWorker registration found", {
          type: ErrorType.INTERNAL_ERROR,
        });
      }

      this.logger.info("Updating ServiceWorker");

      // 更新チェック
      await this.registration.update();

      this._updateState();

      this.logger.info("ServiceWorker update check completed", {
        state: this.state,
      });

      return Result.success(true);
    } catch (error) {
      this.logger.error("Error updating ServiceWorker", error);
      return Result.failure(error, {
        type: ErrorType.INTERNAL_ERROR,
      });
    }
  }

  /**
   * サービスワーカーの登録を解除
   * @returns {Promise<Result<boolean>>} 登録解除結果
   */
  async unregister() {
    try {
      if (!this.registration) {
        return Result.failure("No ServiceWorker registration found", {
          type: ErrorType.INTERNAL_ERROR,
        });
      }

      this.logger.info("Unregistering ServiceWorker");

      // 登録解除
      const result = await this.registration.unregister();

      if (result) {
        this.registration = null;
        this.state = ServiceWorkerState.UNKNOWN;
        this._detachEventListeners();

        this.logger.info("ServiceWorker unregistered successfully");
      } else {
        this.logger.warn("ServiceWorker unregistration failed");
      }

      return Result.success(result);
    } catch (error) {
      this.logger.error("Error unregistering ServiceWorker", error);
      return Result.failure(error, {
        type: ErrorType.INTERNAL_ERROR,
      });
    }
  }

  /**
   * 待機中のサービスワーカーをアクティブ化
   * @returns {Promise<Result<boolean>>} アクティブ化結果
   */
  async activateWaiting() {
    try {
      if (!this.registration || !this.registration.waiting) {
        return Result.failure("No waiting ServiceWorker found", {
          type: ErrorType.INTERNAL_ERROR,
        });
      }

      this.logger.info("Activating waiting ServiceWorker");

      // skipWaitingメッセージを送信
      this.registration.waiting.postMessage({ type: "SKIP_WAITING" });

      return Result.success(true);
    } catch (error) {
      this.logger.error("Error activating waiting ServiceWorker", error);
      return Result.failure(error, {
        type: ErrorType.INTERNAL_ERROR,
      });
    }
  }

  /**
   * サービスワーカーの状態を取得
   * @returns {Object} 状態情報
   */
  getStatus() {
    return {
      state: this.state,
      registration: this.registration
        ? {
            scope: this.registration.scope,
            updateViaCache: this.registration.updateViaCache,
            active: !!this.registration.active,
            installing: !!this.registration.installing,
            waiting: !!this.registration.waiting,
          }
        : null,
      metrics: this.performanceMetrics,
    };
  }

  /**
   * マネージャーを破棄
   */
  dispose() {
    this.logger.debug("Disposing ServiceWorkerManager");

    // 監視タイマーをクリア
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }

    // イベントリスナーを削除
    this._detachEventListeners();

    // メッセージバスをクリア
    if (this.messageBus) {
      this.messageBus.clear();
    }
  }
}

// CommonJS/ES6 両対応のエクスポート
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ServiceWorkerManager, ServiceWorkerState };
} else if (typeof window !== "undefined") {
  window.ServiceWorkerManager = ServiceWorkerManager;
  window.ServiceWorkerState = ServiceWorkerState;
}
