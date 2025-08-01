/**
 * DOM操作最適化クラス
 * DOM操作のバッチ処理と最適化を実装
 * 仮想DOM的なアプローチによる効率的な更新とレンダリングパフォーマンスの監視を提供
 *
 * @class DOMOptimizer
 */
class DOMOptimizer {
  /**
   * 操作タイプの定義
   * @readonly
   * @enum {string}
   */
  static OperationType = {
    ADD_CLASS: "ADD_CLASS",
    REMOVE_CLASS: "REMOVE_CLASS",
    TOGGLE_CLASS: "TOGGLE_CLASS",
    SET_STYLE: "SET_STYLE",
    REMOVE_STYLE: "REMOVE_STYLE",
    SET_ATTRIBUTE: "SET_ATTRIBUTE",
    REMOVE_ATTRIBUTE: "REMOVE_ATTRIBUTE",
    SET_PROPERTY: "SET_PROPERTY",
    INSERT_ELEMENT: "INSERT_ELEMENT",
    REMOVE_ELEMENT: "REMOVE_ELEMENT",
    SET_TEXT_CONTENT: "SET_TEXT_CONTENT",
    SET_INNER_HTML: "SET_INNER_HTML",
  };

  /**
   * 優先度レベルの定義
   * @readonly
   * @enum {number}
   */
  static Priority = {
    IMMEDIATE: 0, // 即座に実行
    HIGH: 1, // 次のフレームで実行
    NORMAL: 2, // 通常の優先度
    LOW: 3, // アイドル時に実行
  };

  /**
   * DOMOptimizerインスタンスを作成
   * @param {Object} [options] - 設定オプション
   * @param {Object} [options.logger] - ロガーインスタンス
   * @param {number} [options.batchSize=50] - バッチサイズ
   * @param {number} [options.frameTimeout=16] - フレームタイムアウト（ミリ秒）
   * @param {boolean} [options.enablePerformanceMonitoring=true] - パフォーマンス監視の有効化
   * @param {boolean} [options.enableVirtualDOM=true] - 仮想DOM機能の有効化
   * @param {number} [options.maxOperationsPerFrame=100] - フレームあたりの最大操作数
   */
  constructor(options = {}) {
    this.logger = options.logger;
    this.batchSize = options.batchSize || 50;
    this.frameTimeout = options.frameTimeout || 16;
    this.enablePerformanceMonitoring =
      options.enablePerformanceMonitoring !== false;
    this.enableVirtualDOM = options.enableVirtualDOM !== false;
    this.maxOperationsPerFrame = options.maxOperationsPerFrame || 100;

    // バッチ処理用のキュー
    this.operationQueues = new Map();
    this.scheduledFrames = new Set();

    // 仮想DOM状態
    this.virtualDOM = new Map();
    this.pendingUpdates = new Map();

    // パフォーマンス監視
    this.performanceMetrics = {
      totalOperations: 0,
      batchedOperations: 0,
      frameCount: 0,
      averageFrameTime: 0,
      maxFrameTime: 0,
      renderingTime: [],
    };

    // 要素の状態キャッシュ
    this.elementCache = new WeakMap();

    // 初期化
    this._initialize();
  }

  /**
   * 初期化処理
   * @private
   */
  _initialize() {
    // 各優先度レベルのキューを初期化
    for (const priority of Object.values(DOMOptimizer.Priority)) {
      this.operationQueues.set(priority, []);
    }

    // パフォーマンス監視を開始
    if (this.enablePerformanceMonitoring) {
      this._startPerformanceMonitoring();
    }

    this._log("debug", "DOMOptimizer initialized", {
      batchSize: this.batchSize,
      frameTimeout: this.frameTimeout,
      enableVirtualDOM: this.enableVirtualDOM,
      maxOperationsPerFrame: this.maxOperationsPerFrame,
    });
  }

  /**
   * DOM操作をキューに追加
   * @param {Element} element - 対象要素
   * @param {string} operation - 操作タイプ
   * @param {any} value - 操作値
   * @param {Object} [options] - オプション
   * @param {number} [options.priority=DOMOptimizer.Priority.NORMAL] - 優先度
   * @param {string} [options.key] - 操作キー（重複排除用）
   * @param {Function} [options.condition] - 実行条件関数
   * @param {Function} [options.callback] - 完了コールバック
   * @returns {Promise<boolean>} 操作完了Promise
   */
  queueOperation(element, operation, value, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        const priority = options.priority || DOMOptimizer.Priority.NORMAL;
        const operationId = this._generateOperationId();

        const operationData = {
          id: operationId,
          element,
          operation,
          value,
          key: options.key,
          condition: options.condition,
          callback: options.callback,
          timestamp: performance.now(),
          resolve,
          reject,
        };

        // 仮想DOM更新
        if (this.enableVirtualDOM) {
          this._updateVirtualDOM(element, operation, value);
        }

        // キューに追加
        const queue = this.operationQueues.get(priority);
        queue.push(operationData);

        // バッチ処理をスケジュール
        this._scheduleBatch(priority);

        this.performanceMetrics.totalOperations++;

        this._log("trace", `Operation queued: ${operation}`, {
          operationId,
          priority,
          queueSize: queue.length,
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * クラス操作をキューに追加
   * @param {Element} element - 対象要素
   * @param {string} className - クラス名
   * @param {string} action - アクション（'add', 'remove', 'toggle'）
   * @param {Object} [options] - オプション
   * @returns {Promise<boolean>} 操作完了Promise
   */
  queueClassOperation(element, className, action, options = {}) {
    const operationMap = {
      add: DOMOptimizer.OperationType.ADD_CLASS,
      remove: DOMOptimizer.OperationType.REMOVE_CLASS,
      toggle: DOMOptimizer.OperationType.TOGGLE_CLASS,
    };

    const operation = operationMap[action];
    if (!operation) {
      return Promise.reject(new Error(`Invalid class action: ${action}`));
    }

    return this.queueOperation(element, operation, className, {
      ...options,
      key: `class_${action}_${className}`,
    });
  }

  /**
   * スタイル操作をキューに追加
   * @param {Element} element - 対象要素
   * @param {string|Object} property - プロパティ名またはスタイルオブジェクト
   * @param {string} [value] - プロパティ値
   * @param {Object} [options] - オプション
   * @returns {Promise<boolean>} 操作完了Promise
   */
  queueStyleOperation(element, property, value, options = {}) {
    if (typeof property === "object") {
      // 複数のスタイルプロパティを一括設定
      const promises = Object.entries(property).map(([prop, val]) =>
        this.queueOperation(
          element,
          DOMOptimizer.OperationType.SET_STYLE,
          {
            property: prop,
            value: val,
          },
          {
            ...options,
            key: `style_${prop}`,
          }
        )
      );
      return Promise.all(promises);
    } else {
      return this.queueOperation(
        element,
        DOMOptimizer.OperationType.SET_STYLE,
        { property, value },
        {
          ...options,
          key: `style_${property}`,
        }
      );
    }
  }

  /**
   * 属性操作をキューに追加
   * @param {Element} element - 対象要素
   * @param {string} attribute - 属性名
   * @param {string} value - 属性値
   * @param {Object} [options] - オプション
   * @returns {Promise<boolean>} 操作完了Promise
   */
  queueAttributeOperation(element, attribute, value, options = {}) {
    const operation =
      value === null || value === undefined
        ? DOMOptimizer.OperationType.REMOVE_ATTRIBUTE
        : DOMOptimizer.OperationType.SET_ATTRIBUTE;

    return this.queueOperation(
      element,
      operation,
      { attribute, value },
      {
        ...options,
        key: `attr_${attribute}`,
      }
    );
  }

  /**
   * 要素の挿入をキューに追加
   * @param {Element} parent - 親要素
   * @param {Element} element - 挿入する要素
   * @param {Element|null} [before] - 挿入位置の基準要素
   * @param {Object} [options] - オプション
   * @returns {Promise<boolean>} 操作完了Promise
   */
  queueInsertOperation(parent, element, before = null, options = {}) {
    return this.queueOperation(
      parent,
      DOMOptimizer.OperationType.INSERT_ELEMENT,
      { element, before },
      options
    );
  }

  /**
   * 要素の削除をキューに追加
   * @param {Element} element - 削除する要素
   * @param {Object} [options] - オプション
   * @returns {Promise<boolean>} 操作完了Promise
   */
  queueRemoveOperation(element, options = {}) {
    return this.queueOperation(
      element,
      DOMOptimizer.OperationType.REMOVE_ELEMENT,
      null,
      options
    );
  }

  /**
   * 即座に操作を実行
   * @param {Element} element - 対象要素
   * @param {string} operation - 操作タイプ
   * @param {any} value - 操作値
   * @returns {boolean} 実行成功フラグ
   */
  executeImmediate(element, operation, value) {
    try {
      const startTime = performance.now();
      const result = this._executeOperation({ element, operation, value });
      const endTime = performance.now();

      if (this.enablePerformanceMonitoring) {
        this.performanceMetrics.renderingTime.push(endTime - startTime);
        if (this.performanceMetrics.renderingTime.length > 100) {
          this.performanceMetrics.renderingTime.shift();
        }
      }

      return result;
    } catch (error) {
      this._log("error", "Immediate operation failed", { error, operation });
      return false;
    }
  }

  /**
   * 保留中の操作をすべて実行
   * @param {number} [priority] - 特定の優先度のみ実行
   * @returns {Promise<number>} 実行された操作数
   */
  async flushOperations(priority) {
    const startTime = performance.now();
    let totalExecuted = 0;

    try {
      if (priority !== undefined) {
        // 特定の優先度のみ実行
        const executed = await this._processBatch(priority);
        totalExecuted += executed;
      } else {
        // すべての優先度を実行
        for (const p of Object.values(DOMOptimizer.Priority)) {
          const executed = await this._processBatch(p);
          totalExecuted += executed;
        }
      }

      const endTime = performance.now();
      this._log("debug", `Flushed ${totalExecuted} operations`, {
        duration: `${(endTime - startTime).toFixed(2)}ms`,
        priority,
      });

      return totalExecuted;
    } catch (error) {
      this._log("error", "Failed to flush operations", error);
      return totalExecuted;
    }
  }

  /**
   * 仮想DOM状態を取得
   * @param {Element} element - 対象要素
   * @returns {Object|null} 仮想DOM状態
   */
  getVirtualState(element) {
    if (!this.enableVirtualDOM) {
      return null;
    }

    return this.virtualDOM.get(element) || null;
  }

  /**
   * 要素の現在の状態をキャッシュ
   * @param {Element} element - 対象要素
   * @returns {Object} キャッシュされた状態
   */
  cacheElementState(element) {
    const state = {
      classes: Array.from(element.classList),
      styles: this._getComputedStyles(element),
      attributes: this._getElementAttributes(element),
      textContent: element.textContent,
      innerHTML: element.innerHTML,
      timestamp: performance.now(),
    };

    this.elementCache.set(element, state);
    return state;
  }

  /**
   * キャッシュされた要素状態を取得
   * @param {Element} element - 対象要素
   * @returns {Object|null} キャッシュされた状態
   */
  getCachedState(element) {
    return this.elementCache.get(element) || null;
  }

  /**
   * パフォーマンス統計を取得
   * @returns {Object} パフォーマンス統計
   */
  getPerformanceMetrics() {
    const renderingTimes = this.performanceMetrics.renderingTime;
    const avgRenderingTime =
      renderingTimes.length > 0
        ? renderingTimes.reduce((a, b) => a + b, 0) / renderingTimes.length
        : 0;

    return {
      ...this.performanceMetrics,
      averageRenderingTime: avgRenderingTime,
      maxRenderingTime: Math.max(...renderingTimes, 0),
      minRenderingTime: Math.min(...renderingTimes, Infinity),
      queueSizes: this._getQueueSizes(),
      cacheSize: this.virtualDOM.size,
    };
  }

  /**
   * 統計をリセット
   */
  resetMetrics() {
    this.performanceMetrics = {
      totalOperations: 0,
      batchedOperations: 0,
      frameCount: 0,
      averageFrameTime: 0,
      maxFrameTime: 0,
      renderingTime: [],
    };

    this._log("debug", "Performance metrics reset");
  }

  /**
   * クリーンアップ
   */
  cleanup() {
    // 保留中の操作をクリア
    for (const queue of this.operationQueues.values()) {
      queue.length = 0;
    }

    // スケジュールされたフレームをクリア
    for (const frameId of this.scheduledFrames) {
      cancelAnimationFrame(frameId);
    }
    this.scheduledFrames.clear();

    // キャッシュをクリア
    this.virtualDOM.clear();
    this.pendingUpdates.clear();

    this._log("info", "DOMOptimizer cleanup completed");
  }

  /**
   * 操作IDを生成
   * @returns {string} 一意の操作ID
   * @private
   */
  _generateOperationId() {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * バッチ処理をスケジュール
   * @param {number} priority - 優先度
   * @private
   */
  _scheduleBatch(priority) {
    if (this.scheduledFrames.has(priority)) {
      return;
    }

    const scheduleFunction =
      priority === DOMOptimizer.Priority.IMMEDIATE
        ? (callback) => callback()
        : priority === DOMOptimizer.Priority.LOW
        ? (callback) => {
            if (typeof requestIdleCallback !== "undefined") {
              requestIdleCallback(callback);
            } else {
              setTimeout(callback, 0);
            }
          }
        : (callback) => requestAnimationFrame(callback);

    const frameId = scheduleFunction(() => {
      this.scheduledFrames.delete(priority);
      this._processBatch(priority);
    });

    if (frameId) {
      this.scheduledFrames.add(frameId);
    }
  }

  /**
   * バッチを処理
   * @param {number} priority - 優先度
   * @returns {Promise<number>} 処理された操作数
   * @private
   */
  async _processBatch(priority) {
    const queue = this.operationQueues.get(priority);
    if (!queue || queue.length === 0) {
      return 0;
    }

    const startTime = performance.now();
    const batchSize = Math.min(queue.length, this.maxOperationsPerFrame);
    const batch = queue.splice(0, batchSize);

    let executedCount = 0;

    try {
      // 重複操作を除去
      const dedupedBatch = this._deduplicateOperations(batch);

      // 操作を実行
      for (const operation of dedupedBatch) {
        try {
          // 実行条件をチェック
          if (operation.condition && !operation.condition()) {
            operation.resolve(false);
            continue;
          }

          const result = this._executeOperation(operation);

          if (operation.callback) {
            operation.callback(result);
          }

          operation.resolve(result);
          executedCount++;
        } catch (error) {
          this._log("warn", "Operation execution failed", {
            operationId: operation.id,
            error,
          });
          operation.reject(error);
        }
      }

      const endTime = performance.now();
      const frameTime = endTime - startTime;

      // パフォーマンス統計を更新
      if (this.enablePerformanceMonitoring) {
        this.performanceMetrics.batchedOperations += executedCount;
        this.performanceMetrics.frameCount++;
        this.performanceMetrics.averageFrameTime =
          (this.performanceMetrics.averageFrameTime *
            (this.performanceMetrics.frameCount - 1) +
            frameTime) /
          this.performanceMetrics.frameCount;
        this.performanceMetrics.maxFrameTime = Math.max(
          this.performanceMetrics.maxFrameTime,
          frameTime
        );
      }

      this._log("trace", `Batch processed: ${executedCount} operations`, {
        priority,
        frameTime: `${frameTime.toFixed(2)}ms`,
        remainingInQueue: queue.length,
      });

      // まだ操作が残っている場合は次のバッチをスケジュール
      if (queue.length > 0) {
        this._scheduleBatch(priority);
      }

      return executedCount;
    } catch (error) {
      this._log("error", "Batch processing failed", { priority, error });
      return executedCount;
    }
  }

  /**
   * 重複操作を除去
   * @param {Array} operations - 操作配列
   * @returns {Array} 重複除去後の操作配列
   * @private
   */
  _deduplicateOperations(operations) {
    const keyMap = new Map();
    const result = [];

    for (const operation of operations) {
      if (operation.key) {
        // キーがある場合は最新の操作のみ保持
        keyMap.set(operation.key, operation);
      } else {
        // キーがない場合はそのまま追加
        result.push(operation);
      }
    }

    // キー付き操作を追加
    for (const operation of keyMap.values()) {
      result.push(operation);
    }

    return result;
  }

  /**
   * 操作を実行
   * @param {Object} operation - 操作データ
   * @returns {boolean} 実行成功フラグ
   * @private
   */
  _executeOperation(operation) {
    const { element, operation: operationType, value } = operation;

    if (!element || !element.parentNode) {
      // 要素が存在しない場合はスキップ
      return false;
    }

    switch (operationType) {
      case DOMOptimizer.OperationType.ADD_CLASS:
        element.classList.add(value);
        return true;

      case DOMOptimizer.OperationType.REMOVE_CLASS:
        element.classList.remove(value);
        return true;

      case DOMOptimizer.OperationType.TOGGLE_CLASS:
        element.classList.toggle(value);
        return true;

      case DOMOptimizer.OperationType.SET_STYLE:
        element.style[value.property] = value.value;
        return true;

      case DOMOptimizer.OperationType.REMOVE_STYLE:
        element.style.removeProperty(value);
        return true;

      case DOMOptimizer.OperationType.SET_ATTRIBUTE:
        element.setAttribute(value.attribute, value.value);
        return true;

      case DOMOptimizer.OperationType.REMOVE_ATTRIBUTE:
        element.removeAttribute(value.attribute);
        return true;

      case DOMOptimizer.OperationType.SET_PROPERTY:
        element[value.property] = value.value;
        return true;

      case DOMOptimizer.OperationType.INSERT_ELEMENT:
        if (value.before) {
          element.insertBefore(value.element, value.before);
        } else {
          element.appendChild(value.element);
        }
        return true;

      case DOMOptimizer.OperationType.REMOVE_ELEMENT:
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
        return true;

      case DOMOptimizer.OperationType.SET_TEXT_CONTENT:
        element.textContent = value;
        return true;

      case DOMOptimizer.OperationType.SET_INNER_HTML:
        element.innerHTML = value;
        return true;

      default:
        this._log("warn", `Unknown operation type: ${operationType}`);
        return false;
    }
  }

  /**
   * 仮想DOMを更新
   * @param {Element} element - 対象要素
   * @param {string} operation - 操作タイプ
   * @param {any} value - 操作値
   * @private
   */
  _updateVirtualDOM(element, operation, value) {
    if (!this.virtualDOM.has(element)) {
      this.virtualDOM.set(element, {
        classes: new Set(),
        styles: new Map(),
        attributes: new Map(),
        properties: new Map(),
      });
    }

    const vdom = this.virtualDOM.get(element);

    switch (operation) {
      case DOMOptimizer.OperationType.ADD_CLASS:
        vdom.classes.add(value);
        break;

      case DOMOptimizer.OperationType.REMOVE_CLASS:
        vdom.classes.delete(value);
        break;

      case DOMOptimizer.OperationType.SET_STYLE:
        vdom.styles.set(value.property, value.value);
        break;

      case DOMOptimizer.OperationType.REMOVE_STYLE:
        vdom.styles.delete(value);
        break;

      case DOMOptimizer.OperationType.SET_ATTRIBUTE:
        vdom.attributes.set(value.attribute, value.value);
        break;

      case DOMOptimizer.OperationType.REMOVE_ATTRIBUTE:
        vdom.attributes.delete(value.attribute);
        break;

      case DOMOptimizer.OperationType.SET_PROPERTY:
        vdom.properties.set(value.property, value.value);
        break;
    }
  }

  /**
   * 要素の計算済みスタイルを取得
   * @param {Element} element - 対象要素
   * @returns {Object} 計算済みスタイル
   * @private
   */
  _getComputedStyles(element) {
    const computedStyle = window.getComputedStyle(element);
    const styles = {};

    // 主要なスタイルプロパティのみ取得
    const importantProperties = [
      "display",
      "visibility",
      "opacity",
      "position",
      "zIndex",
      "width",
      "height",
      "margin",
      "padding",
      "border",
      "backgroundColor",
      "color",
      "fontSize",
      "fontFamily",
    ];

    for (const property of importantProperties) {
      styles[property] = computedStyle.getPropertyValue(property);
    }

    return styles;
  }

  /**
   * 要素の属性を取得
   * @param {Element} element - 対象要素
   * @returns {Object} 属性オブジェクト
   * @private
   */
  _getElementAttributes(element) {
    const attributes = {};
    for (const attr of element.attributes) {
      attributes[attr.name] = attr.value;
    }
    return attributes;
  }

  /**
   * キューサイズを取得
   * @returns {Object} キューサイズ情報
   * @private
   */
  _getQueueSizes() {
    const sizes = {};
    for (const [priority, queue] of this.operationQueues) {
      sizes[`priority_${priority}`] = queue.length;
    }
    return sizes;
  }

  /**
   * パフォーマンス監視を開始
   * @private
   */
  _startPerformanceMonitoring() {
    // 定期的にパフォーマンス統計をログ出力
    setInterval(() => {
      const metrics = this.getPerformanceMetrics();
      if (metrics.totalOperations > 0) {
        this._log("debug", "Performance metrics", metrics);
      }
    }, 30000); // 30秒間隔
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
      this.logger[level](`[DOMOptimizer] ${message}`, data);
    }
  }
}

// CommonJS/ES6 両対応のエクスポート
if (typeof module !== "undefined" && module.exports) {
  module.exports = { DOMOptimizer };
} else if (typeof window !== "undefined") {
  window.DOMOptimizer = DOMOptimizer;
}
