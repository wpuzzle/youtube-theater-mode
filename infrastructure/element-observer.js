/**
 * ElementObserver クラス
 * 要素の可視性と変更を監視するシステム
 * Intersection Observer API を活用した効率的な監視とメモリリーク防止機能を実装
 *
 * @class ElementObserver
 */
class ElementObserver {
  /**
   * ElementObserverインスタンスを作成
   * @param {Object} logger - ロガーインスタンス
   * @param {Object} errorHandler - エラーハンドラーインスタンス
   */
  constructor(logger, errorHandler) {
    this.logger = logger;
    this.errorHandler = errorHandler;

    // 監視対象の管理
    this.intersectionObservers = new Map();
    this.mutationObservers = new Map();
    this.resizeObservers = new Map();

    // 監視対象要素の状態
    this.elementStates = new Map();

    // 監視設定のデフォルト値
    this.defaultIntersectionOptions = {
      root: null,
      rootMargin: "0px",
      threshold: [0, 0.25, 0.5, 0.75, 1.0],
    };

    this.defaultMutationOptions = {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ["style", "class"],
    };

    this.logger.debug("ElementObserver initialized");
  }

  /**
   * 要素の可視性を監視
   * @param {Element|Element[]} elements - 監視対象要素
   * @param {Object} options - 監視オプション
   * @param {Function} options.callback - 可視性変更時のコールバック
   * @param {Object} [options.config] - IntersectionObserverの設定
   * @param {string} [options.id] - 監視ID（省略時は自動生成）
   * @returns {Result<string>} 監視ID
   */
  observeVisibility(elements, options) {
    return this.errorHandler.wrapSync(
      () => {
        if (!options || typeof options.callback !== "function") {
          throw new Error(
            "Callback function is required for visibility observation"
          );
        }

        const elementsArray = Array.isArray(elements) ? elements : [elements];
        if (elementsArray.length === 0) {
          throw new Error("At least one element is required for observation");
        }

        // 監視IDを生成
        const id =
          options.id ||
          `visibility_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // 既存の監視を削除
        this.stopObservation(id);

        // 設定を準備
        const config = options.config || this.defaultIntersectionOptions;

        // IntersectionObserverを作成
        const observer = new IntersectionObserver((entries) => {
          const visibilityChanges = entries.map((entry) => {
            const elementId = this._getElementId(entry.target);
            const previousState = this.elementStates.get(elementId) || {
              visible: false,
            };
            const currentlyVisible = entry.isIntersecting;

            // 状態を更新
            const newState = {
              ...previousState,
              visible: currentlyVisible,
              intersectionRatio: entry.intersectionRatio,
              lastUpdate: Date.now(),
            };

            this.elementStates.set(elementId, newState);

            return {
              element: entry.target,
              visible: currentlyVisible,
              intersectionRatio: entry.intersectionRatio,
              boundingClientRect: entry.boundingClientRect,
              previouslyVisible: previousState.visible,
              changed: currentlyVisible !== previousState.visible,
            };
          });

          // 変更があった要素のみをコールバックに渡す
          const changedEntries = visibilityChanges.filter(
            (change) => change.changed
          );
          if (changedEntries.length > 0) {
            options.callback(changedEntries, observer);
          }
        }, config);

        // 要素を監視
        elementsArray.forEach((element) => {
          if (!element || !(element instanceof Element)) {
            this.logger.warn(
              "Invalid element skipped for visibility observation",
              { element }
            );
            return;
          }

          const elementId = this._getElementId(element);

          // 初期状態を設定
          if (!this.elementStates.has(elementId)) {
            this.elementStates.set(elementId, {
              visible: false,
              intersectionRatio: 0,
              lastUpdate: Date.now(),
            });
          }

          observer.observe(element);
        });

        // 監視を保存
        this.intersectionObservers.set(id, {
          observer,
          elements: elementsArray,
          callback: options.callback,
          config,
        });

        this.logger.debug("Visibility observation started", {
          id,
          elementsCount: elementsArray.length,
          config,
        });

        return id;
      },
      {
        type: ErrorType.INTERNAL_ERROR,
        context: {
          elementsCount: Array.isArray(elements) ? elements.length : 1,
        },
      }
    );
  }

  /**
   * 要素の変更を監視
   * @param {Element|Element[]} elements - 監視対象要素
   * @param {Object} options - 監視オプション
   * @param {Function} options.callback - 変更時のコールバック
   * @param {Object} [options.config] - MutationObserverの設定
   * @param {string} [options.id] - 監視ID（省略時は自動生成）
   * @returns {Result<string>} 監視ID
   */
  observeMutations(elements, options) {
    return this.errorHandler.wrapSync(
      () => {
        if (!options || typeof options.callback !== "function") {
          throw new Error(
            "Callback function is required for mutation observation"
          );
        }

        const elementsArray = Array.isArray(elements) ? elements : [elements];
        if (elementsArray.length === 0) {
          throw new Error("At least one element is required for observation");
        }

        // 監視IDを生成
        const id =
          options.id ||
          `mutation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // 既存の監視を削除
        this.stopObservation(id);

        // 設定を準備
        const config = options.config || this.defaultMutationOptions;

        // MutationObserverを作成
        const observer = new MutationObserver((mutations) => {
          // 変更情報を整理
          const mutationsByElement = new Map();

          mutations.forEach((mutation) => {
            const elementId = this._getElementId(mutation.target);

            if (!mutationsByElement.has(elementId)) {
              mutationsByElement.set(elementId, {
                element: mutation.target,
                mutations: [],
              });
            }

            mutationsByElement.get(elementId).mutations.push(mutation);
          });

          // コールバックに渡す
          options.callback(Array.from(mutationsByElement.values()), observer);
        });

        // 要素を監視
        elementsArray.forEach((element) => {
          if (!element || !(element instanceof Element)) {
            this.logger.warn(
              "Invalid element skipped for mutation observation",
              { element }
            );
            return;
          }

          observer.observe(element, config);
        });

        // 監視を保存
        this.mutationObservers.set(id, {
          observer,
          elements: elementsArray,
          callback: options.callback,
          config,
        });

        this.logger.debug("Mutation observation started", {
          id,
          elementsCount: elementsArray.length,
          config,
        });

        return id;
      },
      {
        type: ErrorType.INTERNAL_ERROR,
        context: {
          elementsCount: Array.isArray(elements) ? elements.length : 1,
        },
      }
    );
  }

  /**
   * 要素のサイズ変更を監視
   * @param {Element|Element[]} elements - 監視対象要素
   * @param {Object} options - 監視オプション
   * @param {Function} options.callback - サイズ変更時のコールバック
   * @param {Object} [options.config] - ResizeObserverの設定
   * @param {string} [options.id] - 監視ID（省略時は自動生成）
   * @returns {Result<string>} 監視ID
   */
  observeResize(elements, options) {
    return this.errorHandler.wrapSync(
      () => {
        if (!options || typeof options.callback !== "function") {
          throw new Error(
            "Callback function is required for resize observation"
          );
        }

        const elementsArray = Array.isArray(elements) ? elements : [elements];
        if (elementsArray.length === 0) {
          throw new Error("At least one element is required for observation");
        }

        // ResizeObserver APIが利用可能かチェック
        if (typeof ResizeObserver === "undefined") {
          throw new Error(
            "ResizeObserver API is not available in this environment"
          );
        }

        // 監視IDを生成
        const id =
          options.id ||
          `resize_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // 既存の監視を削除
        this.stopObservation(id);

        // ResizeObserverを作成
        const observer = new ResizeObserver((entries) => {
          const resizeChanges = entries.map((entry) => {
            const elementId = this._getElementId(entry.target);
            const previousState = this.elementStates.get(elementId) || {
              width: 0,
              height: 0,
            };

            const contentRect = entry.contentRect;
            const currentWidth = contentRect.width;
            const currentHeight = contentRect.height;

            // 状態を更新
            const newState = {
              ...previousState,
              width: currentWidth,
              height: currentHeight,
              lastUpdate: Date.now(),
            };

            this.elementStates.set(elementId, newState);

            return {
              element: entry.target,
              contentRect,
              previousWidth: previousState.width,
              previousHeight: previousState.height,
              widthChanged: currentWidth !== previousState.width,
              heightChanged: currentHeight !== previousState.height,
            };
          });

          // 変更があった要素のみをコールバックに渡す
          const changedEntries = resizeChanges.filter(
            (change) => change.widthChanged || change.heightChanged
          );

          if (changedEntries.length > 0) {
            options.callback(changedEntries, observer);
          }
        });

        // 要素を監視
        elementsArray.forEach((element) => {
          if (!element || !(element instanceof Element)) {
            this.logger.warn("Invalid element skipped for resize observation", {
              element,
            });
            return;
          }

          const elementId = this._getElementId(element);

          // 初期状態を設定
          if (!this.elementStates.has(elementId)) {
            const rect = element.getBoundingClientRect();
            this.elementStates.set(elementId, {
              width: rect.width,
              height: rect.height,
              lastUpdate: Date.now(),
            });
          }

          observer.observe(element);
        });

        // 監視を保存
        this.resizeObservers.set(id, {
          observer,
          elements: elementsArray,
          callback: options.callback,
        });

        this.logger.debug("Resize observation started", {
          id,
          elementsCount: elementsArray.length,
        });

        return id;
      },
      {
        type: ErrorType.INTERNAL_ERROR,
        context: {
          elementsCount: Array.isArray(elements) ? elements.length : 1,
        },
      }
    );
  }

  /**
   * 監視を停止
   * @param {string} id - 監視ID
   * @returns {Result<boolean>} 成功したかどうか
   */
  stopObservation(id) {
    return this.errorHandler.wrapSync(
      () => {
        let stopped = false;

        // IntersectionObserverを停止
        if (this.intersectionObservers.has(id)) {
          const { observer } = this.intersectionObservers.get(id);
          observer.disconnect();
          this.intersectionObservers.delete(id);
          stopped = true;
        }

        // MutationObserverを停止
        if (this.mutationObservers.has(id)) {
          const { observer } = this.mutationObservers.get(id);
          observer.disconnect();
          this.mutationObservers.delete(id);
          stopped = true;
        }

        // ResizeObserverを停止
        if (this.resizeObservers.has(id)) {
          const { observer } = this.resizeObservers.get(id);
          observer.disconnect();
          this.resizeObservers.delete(id);
          stopped = true;
        }

        if (stopped) {
          this.logger.debug("Observation stopped", { id });
        } else {
          this.logger.warn("No observation found with ID", { id });
        }

        return stopped;
      },
      {
        type: ErrorType.INTERNAL_ERROR,
        context: { observerId: id },
      }
    );
  }

  /**
   * 全ての監視を停止
   * @returns {Result<Object>} 停止した監視の数
   */
  stopAllObservations() {
    return this.errorHandler.wrapSync(
      () => {
        const counts = {
          intersection: this.intersectionObservers.size,
          mutation: this.mutationObservers.size,
          resize: this.resizeObservers.size,
          total:
            this.intersectionObservers.size +
            this.mutationObservers.size +
            this.resizeObservers.size,
        };

        // 全てのIntersectionObserverを停止
        for (const [id, { observer }] of this.intersectionObservers.entries()) {
          observer.disconnect();
          this.logger.trace(`Intersection observation stopped: ${id}`);
        }
        this.intersectionObservers.clear();

        // 全てのMutationObserverを停止
        for (const [id, { observer }] of this.mutationObservers.entries()) {
          observer.disconnect();
          this.logger.trace(`Mutation observation stopped: ${id}`);
        }
        this.mutationObservers.clear();

        // 全てのResizeObserverを停止
        for (const [id, { observer }] of this.resizeObservers.entries()) {
          observer.disconnect();
          this.logger.trace(`Resize observation stopped: ${id}`);
        }
        this.resizeObservers.clear();

        this.logger.debug("All observations stopped", counts);

        return counts;
      },
      {
        type: ErrorType.INTERNAL_ERROR,
      }
    );
  }

  /**
   * 要素の状態を取得
   * @param {Element} element - 対象要素
   * @returns {Result<Object|null>} 要素の状態またはnull
   */
  getElementState(element) {
    return this.errorHandler.wrapSync(
      () => {
        if (!element || !(element instanceof Element)) {
          throw new Error("Valid element is required");
        }

        const elementId = this._getElementId(element);
        return this.elementStates.get(elementId) || null;
      },
      {
        type: ErrorType.INTERNAL_ERROR,
        context: { element },
      }
    );
  }

  /**
   * 要素が可視かどうかを確認
   * @param {Element} element - 対象要素
   * @returns {Result<boolean>} 可視かどうか
   */
  isElementVisible(element) {
    return this.errorHandler.wrapSync(
      () => {
        if (!element || !(element instanceof Element)) {
          return false;
        }

        const elementId = this._getElementId(element);
        const state = this.elementStates.get(elementId);

        if (!state) {
          // 状態がない場合は、現在の可視性を計算
          const rect = element.getBoundingClientRect();
          const style = window.getComputedStyle(element);

          const isVisible =
            rect.width > 0 &&
            rect.height > 0 &&
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            style.opacity !== "0";

          // 状態を保存
          this.elementStates.set(elementId, {
            visible: isVisible,
            lastUpdate: Date.now(),
          });

          return isVisible;
        }

        return state.visible === true;
      },
      {
        type: ErrorType.INTERNAL_ERROR,
        context: { element },
      }
    );
  }

  /**
   * 要素がビューポート内にあるかどうかを確認
   * @param {Element} element - 対象要素
   * @returns {Result<boolean>} ビューポート内にあるかどうか
   */
  isElementInViewport(element) {
    return this.errorHandler.wrapSync(
      () => {
        if (!element || !(element instanceof Element)) {
          return false;
        }

        const rect = element.getBoundingClientRect();

        return (
          rect.top >= 0 &&
          rect.left >= 0 &&
          rect.bottom <=
            (window.innerHeight || document.documentElement.clientHeight) &&
          rect.right <=
            (window.innerWidth || document.documentElement.clientWidth)
        );
      },
      {
        type: ErrorType.INTERNAL_ERROR,
        context: { element },
      }
    );
  }

  /**
   * 要素が表示されるまで待機
   * @param {Element|string} elementOrSelector - 対象要素またはセレクター
   * @param {Object} [options] - オプション
   * @param {number} [options.timeout=10000] - タイムアウト時間（ミリ秒）
   * @param {number} [options.interval=100] - チェック間隔（ミリ秒）
   * @param {boolean} [options.visible=true] - 可視性をチェックするかどうか
   * @returns {Promise<Result<Element|null>>} 要素またはnull
   */
  waitForElement(elementOrSelector, options = {}) {
    return this.errorHandler.wrapAsync(
      new Promise((resolve) => {
        const timeout = options.timeout || 10000;
        const interval = options.interval || 100;
        const checkVisibility = options.visible !== false;
        const startTime = Date.now();

        // 要素またはセレクターを処理
        let element = null;
        let selector = null;

        if (typeof elementOrSelector === "string") {
          selector = elementOrSelector;
        } else if (elementOrSelector instanceof Element) {
          element = elementOrSelector;
        } else {
          this.logger.warn("Invalid element or selector", {
            elementOrSelector,
          });
          resolve(null);
          return;
        }

        const checkElement = () => {
          // セレクターから要素を取得
          if (selector && !element) {
            try {
              element = document.querySelector(selector);
            } catch (error) {
              this.logger.warn(`Invalid selector: ${selector}`, error);
            }
          }

          // 要素が見つかったかチェック
          if (element) {
            // 可視性をチェック
            if (!checkVisibility || this.isElementVisible(element).data) {
              this.logger.debug(
                `Element found after ${Date.now() - startTime}ms`,
                {
                  element: element.tagName,
                  selector,
                }
              );
              resolve(element);
              return;
            }
          }

          // タイムアウトをチェック
          if (Date.now() - startTime >= timeout) {
            this.logger.warn(`Timeout waiting for element`, {
              selector,
              timeout,
              elapsed: Date.now() - startTime,
            });
            resolve(null);
            return;
          }

          // 再試行
          setTimeout(checkElement, interval);
        };

        // チェック開始
        checkElement();
      }),
      {
        type: ErrorType.ELEMENT_NOT_FOUND,
        context: {
          elementOrSelector,
          timeout: options.timeout || 10000,
        },
      }
    );
  }

  /**
   * 要素の一意なIDを取得（内部用）
   * @param {Element} element - 対象要素
   * @returns {string} 要素のID
   * @private
   */
  _getElementId(element) {
    // 既存のIDを使用
    if (element.id) {
      return `id:${element.id}`;
    }

    // データ属性を使用
    if (element.dataset && element.dataset.observerId) {
      return element.dataset.observerId;
    }

    // 新しいIDを生成して設定
    const newId = `elem_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // データ属性として保存（可能な場合）
    try {
      element.dataset.observerId = newId;
    } catch (error) {
      // データ属性が設定できない場合は無視
      this.logger.trace("Could not set observer ID as data attribute", {
        error,
      });
    }

    return newId;
  }

  /**
   * リソースをクリーンアップ
   * @returns {Result<boolean>} 成功したかどうか
   */
  cleanup() {
    return this.errorHandler.wrapSync(
      () => {
        this.stopAllObservations();
        this.elementStates.clear();

        this.logger.debug("ElementObserver resources cleaned up");
        return true;
      },
      {
        type: ErrorType.INTERNAL_ERROR,
      }
    );
  }
}

/**
 * 新しいElementObserverインスタンスを作成
 * @param {Object} logger - ロガーインスタンス
 * @param {Object} errorHandler - エラーハンドラーインスタンス
 * @returns {ElementObserver} 新しいElementObserverインスタンス
 */
const createElementObserver = (logger, errorHandler) => {
  return new ElementObserver(logger, errorHandler);
};

// CommonJS/ES6 両対応のエクスポート
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ElementObserver, createElementObserver };
} else if (typeof window !== "undefined") {
  window.ElementObserver = ElementObserver;
  window.createElementObserver = createElementObserver;
}
