/**
 * ElementManager クラス
 * YouTube要素の検出と管理を担当する再利用可能なモジュール
 *
 * @class ElementManager
 */
class ElementManager {
  /**
   * ElementManagerインスタンスを作成
   * @param {Object} logger - ロガーインスタンス
   * @param {Object} errorHandler - エラーハンドラーインスタンス
   */
  constructor(logger, errorHandler) {
    this.logger = logger;
    this.errorHandler = errorHandler;

    // 要素キャッシュ
    this.cache = new Map();
    this.cacheExpiry = new Map();

    // デフォルトキャッシュ有効期間（ミリ秒）
    this.defaultCacheTTL = 5000;

    // セレクター定義
    this.selectors = this.getSelectors();

    // リソース管理
    this.observers = new Map();

    this.logger.debug("ElementManager initialized");
  }

  /**
   * セレクター定義を取得
   * @returns {Object} セレクター設定
   */
  getSelectors() {
    return {
      videoPlayer: [
        "#movie_player",
        ".html5-video-player",
        '[data-testid="video-player"]',
        ".ytp-player-content",
        "#player-container",
      ],
      videoControls: [
        ".ytp-chrome-controls",
        ".ytp-chrome-bottom",
        ".video-stream",
      ],
      overlayTargets: [
        "#secondary", // サイドバー
        "#comments", // コメント欄
        "ytd-comments", // 新しいコメント欄
        "#masthead", // ヘッダー
        ".ytd-masthead", // ヘッダー（新UI）
        "#meta-contents", // 動画メタデータ
        ".ytd-watch-metadata", // 動画メタデータ（新UI）
        "#description", // 動画説明
        ".ytd-video-secondary-info-renderer", // 動画情報
        "#related", // 関連動画
        ".ytp-suggestion-set", // 動画終了時の提案
        "#chat", // ライブチャット
        "ytd-live-chat-frame", // ライブチャット（新UI）
      ],
      protectedElements: [
        "#movie_player",
        ".html5-video-player",
        ".video-stream",
        ".ytp-chrome-controls",
        ".ytp-chrome-bottom",
      ],
    };
  }

  /**
   * 複数のセレクターを試行して要素を検出（フォールバック機能付き）
   * @param {string|string[]} selectors - セレクター文字列または配列
   * @param {Element|Document} context - 検索コンテキスト（デフォルト: document）
   * @returns {Result<Element|null>} 見つかった要素またはnull
   */
  findElementWithFallback(selectors, context = document) {
    return this.errorHandler.wrapSync(
      () => {
        const selectorArray = Array.isArray(selectors)
          ? selectors
          : [selectors];

        for (const selector of selectorArray) {
          try {
            const element = context.querySelector(selector);
            if (element) {
              this.logger.trace(`Element found with selector: ${selector}`);
              return element;
            }
          } catch (error) {
            this.logger.warn(`Invalid selector: ${selector}`, error);
          }
        }

        this.logger.debug(
          `No element found with selectors: ${selectorArray.join(", ")}`
        );
        return null;
      },
      {
        type: ErrorType.ELEMENT_NOT_FOUND,
        context: { selectors },
      }
    );
  }

  /**
   * 複数のセレクターを試行して複数の要素を検出
   * @param {string|string[]} selectors - セレクター文字列または配列
   * @param {Element|Document} context - 検索コンテキスト（デフォルト: document）
   * @returns {Result<Element[]>} 見つかった要素の配列
   */
  findElementsWithFallback(selectors, context = document) {
    return this.errorHandler.wrapSync(
      () => {
        const selectorArray = Array.isArray(selectors)
          ? selectors
          : [selectors];
        const elements = [];

        for (const selector of selectorArray) {
          try {
            const found = context.querySelectorAll(selector);
            if (found && found.length > 0) {
              found.forEach((element) => elements.push(element));
              this.logger.trace(
                `Found ${found.length} elements with selector: ${selector}`
              );
            }
          } catch (error) {
            this.logger.warn(`Invalid selector: ${selector}`, error);
          }
        }

        this.logger.debug(
          `Found total ${
            elements.length
          } elements with selectors: ${selectorArray.join(", ")}`
        );
        return elements;
      },
      {
        type: ErrorType.ELEMENT_NOT_FOUND,
        context: { selectors },
      }
    );
  }

  /**
   * 要素が表示されているかどうかを確認
   * @param {Element} element - 確認する要素
   * @returns {boolean} 表示されている場合true
   */
  isElementVisible(element) {
    if (!element) return false;

    const style = window.getComputedStyle(element);
    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      style.opacity !== "0"
    );
  }

  /**
   * 要素がビューポート内にあるかどうかを確認
   * @param {Element} element - 確認する要素
   * @returns {boolean} ビューポート内にある場合true
   */
  isElementInViewport(element) {
    if (!element) return false;

    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <=
        (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }

  /**
   * 要素が表示されるまで待機
   * @param {string|string[]} selectors - セレクター文字列または配列
   * @param {Object} options - オプション
   * @param {number} [options.timeout=10000] - タイムアウト時間（ミリ秒）
   * @param {number} [options.interval=100] - チェック間隔（ミリ秒）
   * @param {boolean} [options.visible=true] - 可視性をチェックするかどうか
   * @returns {Promise<Result<Element|null>>} 見つかった要素またはnull
   */
  async waitForElement(selectors, options = {}) {
    const timeout = options.timeout || 10000;
    const interval = options.interval || 100;
    const checkVisibility = options.visible !== false;

    return this.errorHandler.wrapAsync(
      new Promise((resolve, reject) => {
        const startTime = Date.now();
        const cacheKey = Array.isArray(selectors)
          ? selectors.join(",")
          : selectors;

        // キャッシュをチェック
        if (
          this.cache.has(cacheKey) &&
          Date.now() < this.cacheExpiry.get(cacheKey)
        ) {
          const cachedElement = this.cache.get(cacheKey);
          if (
            cachedElement &&
            (!checkVisibility || this.isElementVisible(cachedElement))
          ) {
            this.logger.debug(`Element found in cache: ${cacheKey}`);
            resolve(cachedElement);
            return;
          }
        }

        const checkElement = () => {
          const result = this.findElementWithFallback(selectors);

          if (result.isSuccess()) {
            const element = result.data;

            if (
              element &&
              (!checkVisibility || this.isElementVisible(element))
            ) {
              // キャッシュに保存
              this.cache.set(cacheKey, element);
              this.cacheExpiry.set(cacheKey, Date.now() + this.defaultCacheTTL);

              this.logger.debug(
                `Element found after ${Date.now() - startTime}ms: ${cacheKey}`
              );
              resolve(element);
              return;
            }
          }

          if (Date.now() - startTime >= timeout) {
            this.logger.warn(`Timeout waiting for element: ${cacheKey}`, {
              timeout,
            });
            resolve(null);
            return;
          }

          setTimeout(checkElement, interval);
        };

        checkElement();
      }),
      {
        type: ErrorType.ELEMENT_NOT_FOUND,
        context: { selectors, timeout },
      }
    );
  }

  /**
   * 動画プレーヤーを検出
   * @param {Object} [options] - 検出オプション
   * @param {number} [options.timeout=15000] - タイムアウト時間（ミリ秒）
   * @returns {Promise<Result<Element|null>>} 動画プレーヤー要素またはnull
   */
  async detectVideoPlayer(options = {}) {
    const timeout = options.timeout || 15000;

    this.logger.debug("Detecting video player", { timeout });
    return this.waitForElement(this.selectors.videoPlayer, {
      timeout,
      visible: true,
    });
  }

  /**
   * オーバーレイ対象要素を検出
   * @returns {Result<Element[]>} オーバーレイ対象要素の配列
   */
  findOverlayTargets() {
    return this.errorHandler.wrapSync(
      () => {
        const cacheKey = "overlayTargets";

        // キャッシュをチェック
        if (
          this.cache.has(cacheKey) &&
          Date.now() < this.cacheExpiry.get(cacheKey)
        ) {
          const cachedElements = this.cache.get(cacheKey);
          this.logger.debug(
            `Overlay targets found in cache: ${cachedElements.length} elements`
          );
          return cachedElements;
        }

        const overlaySelectors = this.selectors.overlayTargets;
        const protectedSelectors = this.selectors.protectedElements;

        // オーバーレイ対象要素を検出
        const elements = [];

        for (const selector of overlaySelectors) {
          try {
            const found = document.querySelectorAll(selector);
            found.forEach((element) => {
              // 保護対象要素を除外
              let isProtected = false;
              for (const protectedSelector of protectedSelectors) {
                if (
                  element.matches(protectedSelector) ||
                  element.closest(protectedSelector)
                ) {
                  isProtected = true;
                  break;
                }
              }

              if (!isProtected) {
                elements.push(element);
              }
            });
          } catch (error) {
            this.logger.warn(
              `Error finding elements with selector ${selector}:`,
              error
            );
          }
        }

        // キャッシュに保存
        this.cache.set(cacheKey, elements);
        this.cacheExpiry.set(cacheKey, Date.now() + this.defaultCacheTTL);

        this.logger.debug(`Found ${elements.length} overlay target elements`);
        return elements;
      },
      {
        type: ErrorType.ELEMENT_NOT_FOUND,
      }
    );
  }

  /**
   * 要素の変更を監視
   * @param {Element} targetElement - 監視対象要素
   * @param {Object} options - 監視オプション
   * @param {Function} options.callback - 変更時のコールバック
   * @param {Object} [options.config] - MutationObserverの設定
   * @param {string} [options.id] - 監視ID（省略時は自動生成）
   * @returns {Result<string>} 監視ID
   */
  observeElementChanges(targetElement, options) {
    return this.errorHandler.wrapSync(
      () => {
        if (!targetElement) {
          throw new Error("Target element is required for observation");
        }

        const callback = options.callback;
        if (typeof callback !== "function") {
          throw new Error("Callback function is required for observation");
        }

        const id =
          options.id ||
          `observer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // 既存の監視を削除
        if (this.observers.has(id)) {
          this.observers.get(id).disconnect();
        }

        // デフォルト設定
        const config = options.config || {
          attributes: true,
          childList: true,
          subtree: true,
        };

        // 監視を作成
        const observer = new MutationObserver((mutations) => {
          callback(mutations, targetElement, observer);
        });

        observer.observe(targetElement, config);
        this.observers.set(id, observer);

        this.logger.debug(`Element observation started: ${id}`, {
          element: targetElement.tagName,
          config,
        });

        return id;
      },
      {
        type: ErrorType.INTERNAL_ERROR,
        context: { element: targetElement },
      }
    );
  }

  /**
   * 要素の可視性を監視
   * @param {Element} targetElement - 監視対象要素
   * @param {Object} options - 監視オプション
   * @param {Function} options.callback - 可視性変更時のコールバック
   * @param {Object} [options.config] - IntersectionObserverの設定
   * @param {string} [options.id] - 監視ID（省略時は自動生成）
   * @returns {Result<string>} 監視ID
   */
  observeElementVisibility(targetElement, options) {
    return this.errorHandler.wrapSync(
      () => {
        if (!targetElement) {
          throw new Error(
            "Target element is required for visibility observation"
          );
        }

        const callback = options.callback;
        if (typeof callback !== "function") {
          throw new Error(
            "Callback function is required for visibility observation"
          );
        }

        const id =
          options.id ||
          `visibility_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // 既存の監視を削除
        if (this.observers.has(id)) {
          this.observers.get(id).disconnect();
        }

        // デフォルト設定
        const config = options.config || {
          root: null,
          rootMargin: "0px",
          threshold: [0, 0.25, 0.5, 0.75, 1.0],
        };

        // 監視を作成
        const observer = new IntersectionObserver((entries) => {
          callback(entries, observer);
        }, config);

        observer.observe(targetElement);
        this.observers.set(id, observer);

        this.logger.debug(`Element visibility observation started: ${id}`, {
          element: targetElement.tagName,
          config,
        });

        return id;
      },
      {
        type: ErrorType.INTERNAL_ERROR,
        context: { element: targetElement },
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
        if (!this.observers.has(id)) {
          this.logger.warn(`Observer not found: ${id}`);
          return false;
        }

        const observer = this.observers.get(id);
        observer.disconnect();
        this.observers.delete(id);

        this.logger.debug(`Observation stopped: ${id}`);
        return true;
      },
      {
        type: ErrorType.INTERNAL_ERROR,
        context: { observerId: id },
      }
    );
  }

  /**
   * 全ての監視を停止
   * @returns {Result<number>} 停止した監視の数
   */
  stopAllObservations() {
    return this.errorHandler.wrapSync(
      () => {
        const count = this.observers.size;

        for (const [id, observer] of this.observers.entries()) {
          observer.disconnect();
          this.logger.trace(`Observation stopped: ${id}`);
        }

        this.observers.clear();
        this.logger.debug(`All observations stopped: ${count} observers`);

        return count;
      },
      {
        type: ErrorType.INTERNAL_ERROR,
      }
    );
  }

  /**
   * キャッシュをクリア
   * @param {string} [key] - クリアする特定のキー（省略時は全て）
   * @returns {Result<boolean>} 成功したかどうか
   */
  clearCache(key) {
    return this.errorHandler.wrapSync(
      () => {
        if (key) {
          this.cache.delete(key);
          this.cacheExpiry.delete(key);
          this.logger.debug(`Cache cleared for key: ${key}`);
        } else {
          this.cache.clear();
          this.cacheExpiry.clear();
          this.logger.debug("All cache cleared");
        }

        return true;
      },
      {
        type: ErrorType.INTERNAL_ERROR,
        context: { cacheKey: key },
      }
    );
  }

  /**
   * リソースをクリーンアップ
   * @returns {Result<boolean>} 成功したかどうか
   */
  cleanup() {
    return this.errorHandler.wrapSync(
      () => {
        this.stopAllObservations();
        this.clearCache();
        this.logger.debug("ElementManager resources cleaned up");
        return true;
      },
      {
        type: ErrorType.INTERNAL_ERROR,
      }
    );
  }
}

/**
 * 新しいElementManagerインスタンスを作成
 * @param {Object} logger - ロガーインスタンス
 * @param {Object} errorHandler - エラーハンドラーインスタンス
 * @returns {ElementManager} 新しいElementManagerインスタンス
 */
const createElementManager = (logger, errorHandler) => {
  return new ElementManager(logger, errorHandler);
};

// CommonJS/ES6 両対応のエクスポート
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ElementManager, createElementManager };
} else if (typeof window !== "undefined") {
  window.ElementManager = ElementManager;
  window.createElementManager = createElementManager;
}
