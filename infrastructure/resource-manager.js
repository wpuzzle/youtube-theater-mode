/**
 * リソース管理クラス
 * メモリリークを防止し、適切なクリーンアップを実行
 * リソースの自動管理とガベージコレクションの最適化を提供
 *
 * @class ResourceManager
 */
class ResourceManager {
  /**
   * リソースタイプの定義
   * @readonly
   * @enum {string}
   */
  static ResourceType = {
    EVENT_LISTENER: "EVENT_LISTENER",
    OBSERVER: "OBSERVER",
    TIMER: "TIMER",
    ANIMATION_FRAME: "ANIMATION_FRAME",
    PROMISE: "PROMISE",
    CUSTOM: "CUSTOM",
  };

  /**
   * リソース状態の定義
   * @readonly
   * @enum {string}
   */
  static ResourceState = {
    ACTIVE: "ACTIVE",
    DISPOSED: "DISPOSED",
    ERROR: "ERROR",
  };

  /**
   * ResourceManagerインスタンスを作成
   * @param {Object} [options] - 設定オプション
   * @param {Object} [options.logger] - ロガーインスタンス
   * @param {number} [options.maxResources=1000] - 最大リソース数
   * @param {number} [options.cleanupInterval=30000] - 自動クリーンアップ間隔（ミリ秒）
   * @param {boolean} [options.autoCleanup=true] - 自動クリーンアップの有効化
   * @param {boolean} [options.memoryMonitoring=true] - メモリ監視の有効化
   */
  constructor(options = {}) {
    this.logger = options.logger;
    this.maxResources = options.maxResources || 1000;
    this.cleanupInterval = options.cleanupInterval || 30000;
    this.autoCleanup = options.autoCleanup !== false;
    this.memoryMonitoring = options.memoryMonitoring !== false;

    // リソース管理用のマップ
    this.resources = new Map();
    this.resourcesByType = new Map();
    this.cleanupTasks = new Set();

    // 統計情報
    this.stats = {
      totalCreated: 0,
      totalDisposed: 0,
      currentActive: 0,
      memoryUsage: [],
      errors: 0,
    };

    // 自動クリーンアップタイマー
    this.cleanupTimer = null;

    // WeakRef対応チェック
    this.supportsWeakRef = typeof WeakRef !== "undefined";

    // 初期化
    this._initialize();
  }

  /**
   * 初期化処理
   * @private
   */
  _initialize() {
    // 各リソースタイプのマップを初期化
    for (const type of Object.values(ResourceManager.ResourceType)) {
      this.resourcesByType.set(type, new Set());
    }

    // 自動クリーンアップを開始
    if (this.autoCleanup) {
      this._startAutoCleanup();
    }

    // メモリ監視を開始
    if (this.memoryMonitoring) {
      this._startMemoryMonitoring();
    }

    // ページアンロード時のクリーンアップ
    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", () => this.cleanup());
    }

    this._log("debug", "ResourceManager initialized", {
      maxResources: this.maxResources,
      autoCleanup: this.autoCleanup,
      memoryMonitoring: this.memoryMonitoring,
    });
  }

  /**
   * リソースを登録
   * @param {any} resource - 管理対象リソース
   * @param {Function} cleanup - クリーンアップ関数
   * @param {Object} [options] - 登録オプション
   * @param {string} [options.type=ResourceManager.ResourceType.CUSTOM] - リソースタイプ
   * @param {string} [options.name] - リソース名
   * @param {Object} [options.metadata] - メタデータ
   * @param {boolean} [options.autoDispose=false] - 自動破棄フラグ
   * @param {number} [options.ttl] - 生存時間（ミリ秒）
   * @returns {string} リソースID
   */
  register(resource, cleanup, options = {}) {
    // 最大リソース数チェック
    if (this.resources.size >= this.maxResources) {
      this._log("warn", "Maximum resource limit reached, forcing cleanup");
      this._forceCleanup();
    }

    const resourceId = this._generateResourceId();
    const type = options.type || ResourceManager.ResourceType.CUSTOM;
    const now = Date.now();

    const resourceInfo = {
      id: resourceId,
      resource: this.supportsWeakRef ? new WeakRef(resource) : resource,
      cleanup,
      type,
      name: options.name || `${type}_${resourceId}`,
      metadata: options.metadata || {},
      state: ResourceManager.ResourceState.ACTIVE,
      createdAt: now,
      lastAccessedAt: now,
      autoDispose: options.autoDispose || false,
      ttl: options.ttl,
      expiresAt: options.ttl ? now + options.ttl : null,
    };

    // リソースを登録
    this.resources.set(resourceId, resourceInfo);
    this.resourcesByType.get(type).add(resourceId);

    // 統計更新
    this.stats.totalCreated++;
    this.stats.currentActive++;

    this._log("debug", `Resource registered: ${resourceInfo.name}`, {
      id: resourceId,
      type,
      totalActive: this.stats.currentActive,
    });

    return resourceId;
  }

  /**
   * イベントリスナーを登録
   * @param {EventTarget} target - イベントターゲット
   * @param {string} event - イベント名
   * @param {Function} listener - リスナー関数
   * @param {Object|boolean} [options] - イベントオプション
   * @returns {string} リソースID
   */
  registerEventListener(target, event, listener, options = {}) {
    target.addEventListener(event, listener, options);

    return this.register(
      { target, event, listener, options },
      () => {
        try {
          target.removeEventListener(event, listener, options);
        } catch (error) {
          this._log("warn", "Failed to remove event listener", error);
        }
      },
      {
        type: ResourceManager.ResourceType.EVENT_LISTENER,
        name: `EventListener_${event}`,
        metadata: { event, target: target.constructor.name },
      }
    );
  }

  /**
   * Observerを登録
   * @param {Object} observer - Observer（MutationObserver、IntersectionObserver等）
   * @param {string} [name] - Observer名
   * @returns {string} リソースID
   */
  registerObserver(observer, name) {
    return this.register(
      observer,
      () => {
        try {
          if (typeof observer.disconnect === "function") {
            observer.disconnect();
          }
        } catch (error) {
          this._log("warn", "Failed to disconnect observer", error);
        }
      },
      {
        type: ResourceManager.ResourceType.OBSERVER,
        name: name || `Observer_${observer.constructor.name}`,
        metadata: { observerType: observer.constructor.name },
      }
    );
  }

  /**
   * タイマーを登録
   * @param {number} timerId - タイマーID
   * @param {string} timerType - タイマータイプ（'timeout' | 'interval'）
   * @returns {string} リソースID
   */
  registerTimer(timerId, timerType = "timeout") {
    return this.register(
      timerId,
      () => {
        try {
          if (timerType === "interval") {
            clearInterval(timerId);
          } else {
            clearTimeout(timerId);
          }
        } catch (error) {
          this._log("warn", "Failed to clear timer", error);
        }
      },
      {
        type: ResourceManager.ResourceType.TIMER,
        name: `Timer_${timerType}_${timerId}`,
        metadata: { timerType },
      }
    );
  }

  /**
   * アニメーションフレームを登録
   * @param {number} frameId - フレームID
   * @returns {string} リソースID
   */
  registerAnimationFrame(frameId) {
    return this.register(
      frameId,
      () => {
        try {
          cancelAnimationFrame(frameId);
        } catch (error) {
          this._log("warn", "Failed to cancel animation frame", error);
        }
      },
      {
        type: ResourceManager.ResourceType.ANIMATION_FRAME,
        name: `AnimationFrame_${frameId}`,
      }
    );
  }

  /**
   * Promiseを登録（AbortController付き）
   * @param {Promise} promise - Promise
   * @param {AbortController} [abortController] - AbortController
   * @param {string} [name] - Promise名
   * @returns {string} リソースID
   */
  registerPromise(promise, abortController, name) {
    return this.register(
      { promise, abortController },
      () => {
        try {
          if (abortController && typeof abortController.abort === "function") {
            abortController.abort();
          }
        } catch (error) {
          this._log("warn", "Failed to abort promise", error);
        }
      },
      {
        type: ResourceManager.ResourceType.PROMISE,
        name: name || `Promise_${Date.now()}`,
        metadata: { hasAbortController: !!abortController },
      }
    );
  }

  /**
   * リソースを取得
   * @param {string} resourceId - リソースID
   * @returns {any|null} リソースオブジェクト
   */
  getResource(resourceId) {
    const resourceInfo = this.resources.get(resourceId);
    if (!resourceInfo) {
      return null;
    }

    // WeakRef対応
    if (this.supportsWeakRef && resourceInfo.resource instanceof WeakRef) {
      const resource = resourceInfo.resource.deref();
      if (!resource) {
        // ガベージコレクションされた場合
        this._disposeResource(resourceId);
        return null;
      }
      resourceInfo.lastAccessedAt = Date.now();
      return resource;
    }

    resourceInfo.lastAccessedAt = Date.now();
    return resourceInfo.resource;
  }

  /**
   * リソース情報を取得
   * @param {string} resourceId - リソースID
   * @returns {Object|null} リソース情報
   */
  getResourceInfo(resourceId) {
    const resourceInfo = this.resources.get(resourceId);
    if (!resourceInfo) {
      return null;
    }

    return {
      id: resourceInfo.id,
      type: resourceInfo.type,
      name: resourceInfo.name,
      metadata: resourceInfo.metadata,
      state: resourceInfo.state,
      createdAt: resourceInfo.createdAt,
      lastAccessedAt: resourceInfo.lastAccessedAt,
      autoDispose: resourceInfo.autoDispose,
      ttl: resourceInfo.ttl,
      expiresAt: resourceInfo.expiresAt,
    };
  }

  /**
   * 特定のリソースを破棄
   * @param {string} resourceId - リソースID
   * @returns {boolean} 破棄成功フラグ
   */
  dispose(resourceId) {
    return this._disposeResource(resourceId);
  }

  /**
   * 特定タイプのリソースをすべて破棄
   * @param {string} type - リソースタイプ
   * @returns {number} 破棄されたリソース数
   */
  disposeByType(type) {
    const resourceIds = this.resourcesByType.get(type);
    if (!resourceIds) {
      return 0;
    }

    let disposedCount = 0;
    for (const resourceId of [...resourceIds]) {
      if (this._disposeResource(resourceId)) {
        disposedCount++;
      }
    }

    this._log("debug", `Disposed ${disposedCount} resources of type ${type}`);
    return disposedCount;
  }

  /**
   * 期限切れリソースを破棄
   * @returns {number} 破棄されたリソース数
   */
  disposeExpired() {
    const now = Date.now();
    let disposedCount = 0;

    for (const [resourceId, resourceInfo] of this.resources) {
      if (
        resourceInfo.expiresAt &&
        now > resourceInfo.expiresAt &&
        resourceInfo.state === ResourceManager.ResourceState.ACTIVE
      ) {
        if (this._disposeResource(resourceId)) {
          disposedCount++;
        }
      }
    }

    if (disposedCount > 0) {
      this._log("debug", `Disposed ${disposedCount} expired resources`);
    }

    return disposedCount;
  }

  /**
   * 未使用リソースを破棄
   * @param {number} [maxAge=300000] - 最大未使用時間（ミリ秒、デフォルト5分）
   * @returns {number} 破棄されたリソース数
   */
  disposeUnused(maxAge = 300000) {
    const now = Date.now();
    let disposedCount = 0;

    for (const [resourceId, resourceInfo] of this.resources) {
      if (
        resourceInfo.autoDispose &&
        now - resourceInfo.lastAccessedAt > maxAge &&
        resourceInfo.state === ResourceManager.ResourceState.ACTIVE
      ) {
        if (this._disposeResource(resourceId)) {
          disposedCount++;
        }
      }
    }

    if (disposedCount > 0) {
      this._log("debug", `Disposed ${disposedCount} unused resources`);
    }

    return disposedCount;
  }

  /**
   * すべてのリソースを破棄
   * @returns {number} 破棄されたリソース数
   */
  cleanup() {
    const resourceIds = [...this.resources.keys()];
    let disposedCount = 0;

    for (const resourceId of resourceIds) {
      if (this._disposeResource(resourceId)) {
        disposedCount++;
      }
    }

    // 自動クリーンアップを停止
    this._stopAutoCleanup();

    this._log("info", `Cleanup completed: disposed ${disposedCount} resources`);
    return disposedCount;
  }

  /**
   * リソース統計を取得
   * @returns {Object} 統計情報
   */
  getStats() {
    const memoryInfo = this._getMemoryInfo();

    return {
      ...this.stats,
      currentActive: this.resources.size,
      resourcesByType: this._getResourceCountsByType(),
      memoryInfo,
      uptime: Date.now() - (this.stats.startTime || Date.now()),
    };
  }

  /**
   * メモリ使用量を監視
   * @returns {Object|null} メモリ情報
   */
  getMemoryInfo() {
    return this._getMemoryInfo();
  }

  /**
   * リソース使用量アラートを設定
   * @param {Object} thresholds - 閾値設定
   * @param {number} [thresholds.maxResources] - 最大リソース数
   * @param {number} [thresholds.maxMemoryMB] - 最大メモリ使用量（MB）
   * @param {Function} [callback] - アラートコールバック
   */
  setAlerts(thresholds, callback) {
    this.alertThresholds = thresholds;
    this.alertCallback = callback;

    this._checkAlerts();
  }

  /**
   * リソースIDを生成
   * @returns {string} 一意のリソースID
   * @private
   */
  _generateResourceId() {
    return `resource_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * リソースを破棄
   * @param {string} resourceId - リソースID
   * @returns {boolean} 破棄成功フラグ
   * @private
   */
  _disposeResource(resourceId) {
    const resourceInfo = this.resources.get(resourceId);
    if (!resourceInfo) {
      return false;
    }

    try {
      // クリーンアップ関数を実行
      if (typeof resourceInfo.cleanup === "function") {
        resourceInfo.cleanup();
      }

      // リソースを削除
      this.resources.delete(resourceId);
      this.resourcesByType.get(resourceInfo.type).delete(resourceId);

      // 状態を更新
      resourceInfo.state = ResourceManager.ResourceState.DISPOSED;

      // 統計更新
      this.stats.totalDisposed++;
      this.stats.currentActive = Math.max(0, this.stats.currentActive - 1);

      this._log("trace", `Resource disposed: ${resourceInfo.name}`, {
        id: resourceId,
        type: resourceInfo.type,
      });

      return true;
    } catch (error) {
      this.stats.errors++;
      resourceInfo.state = ResourceManager.ResourceState.ERROR;

      this._log("error", `Failed to dispose resource: ${resourceInfo.name}`, {
        error,
        resourceId,
      });

      return false;
    }
  }

  /**
   * 強制クリーンアップ
   * @private
   */
  _forceCleanup() {
    // 期限切れリソースを破棄
    this.disposeExpired();

    // 未使用リソースを破棄
    this.disposeUnused();

    // まだ上限を超えている場合、古いリソースから破棄
    if (this.resources.size >= this.maxResources) {
      const sortedResources = [...this.resources.entries()].sort(
        (a, b) => a[1].lastAccessedAt - b[1].lastAccessedAt
      );

      const toDispose = sortedResources.slice(
        0,
        this.resources.size - this.maxResources + 100
      );

      for (const [resourceId] of toDispose) {
        this._disposeResource(resourceId);
      }
    }
  }

  /**
   * 自動クリーンアップを開始
   * @private
   */
  _startAutoCleanup() {
    if (this.cleanupTimer) {
      return;
    }

    this.cleanupTimer = setInterval(() => {
      this.disposeExpired();
      this.disposeUnused();
      this._checkAlerts();
    }, this.cleanupInterval);

    this._log("debug", "Auto cleanup started", {
      interval: this.cleanupInterval,
    });
  }

  /**
   * 自動クリーンアップを停止
   * @private
   */
  _stopAutoCleanup() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
      this._log("debug", "Auto cleanup stopped");
    }
  }

  /**
   * メモリ監視を開始
   * @private
   */
  _startMemoryMonitoring() {
    // 定期的にメモリ使用量を記録
    setInterval(() => {
      const memoryInfo = this._getMemoryInfo();
      if (memoryInfo) {
        this.stats.memoryUsage.push({
          timestamp: Date.now(),
          ...memoryInfo,
        });

        // 古いメモリ使用量データを削除（最新100件のみ保持）
        if (this.stats.memoryUsage.length > 100) {
          this.stats.memoryUsage.shift();
        }
      }
    }, 60000); // 1分間隔
  }

  /**
   * メモリ情報を取得
   * @returns {Object|null} メモリ情報
   * @private
   */
  _getMemoryInfo() {
    if (typeof performance !== "undefined" && performance.memory) {
      return {
        used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024),
      };
    }
    return null;
  }

  /**
   * タイプ別リソース数を取得
   * @returns {Object} タイプ別リソース数
   * @private
   */
  _getResourceCountsByType() {
    const counts = {};
    for (const [type, resourceIds] of this.resourcesByType) {
      counts[type] = resourceIds.size;
    }
    return counts;
  }

  /**
   * アラートをチェック
   * @private
   */
  _checkAlerts() {
    if (!this.alertThresholds || !this.alertCallback) {
      return;
    }

    const stats = this.getStats();
    const alerts = [];

    // リソース数チェック
    if (
      this.alertThresholds.maxResources &&
      stats.currentActive > this.alertThresholds.maxResources
    ) {
      alerts.push({
        type: "RESOURCE_COUNT",
        message: `Resource count exceeded threshold: ${stats.currentActive}/${this.alertThresholds.maxResources}`,
        value: stats.currentActive,
        threshold: this.alertThresholds.maxResources,
      });
    }

    // メモリ使用量チェック
    if (
      this.alertThresholds.maxMemoryMB &&
      stats.memoryInfo &&
      stats.memoryInfo.used > this.alertThresholds.maxMemoryMB
    ) {
      alerts.push({
        type: "MEMORY_USAGE",
        message: `Memory usage exceeded threshold: ${stats.memoryInfo.used}MB/${this.alertThresholds.maxMemoryMB}MB`,
        value: stats.memoryInfo.used,
        threshold: this.alertThresholds.maxMemoryMB,
      });
    }

    // アラートがある場合はコールバックを実行
    if (alerts.length > 0) {
      try {
        this.alertCallback(alerts, stats);
      } catch (error) {
        this._log("error", "Error in alert callback", error);
      }
    }
  }

  /**
   * ログ出力
   * @param {string} level - ログレベル
   * @param {string} message - メッセージ
   * @param {any} [data] - 追加データ
   * @private
   */
  _log(level, message, data) {
    if (this.logger && typeof this.logger[level] === "function") {
      this.logger[level](`[ResourceManager] ${message}`, data);
    }
  }
}

// CommonJS/ES6 両対応のエクスポート
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ResourceManager };
} else if (typeof window !== "undefined") {
  window.ResourceManager = ResourceManager;
}
