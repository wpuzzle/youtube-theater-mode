/**
 * YouTubePageDetector
 * YouTube ページの検出と分類を専門とするクラス
 * ページタイプの識別、ページ変更の監視、イベント通知機能を提供
 */

// 依存関係のインポート
let Logger, ErrorHandler, Result, AppError, ErrorType;

// Node.js環境での依存関係の解決
if (typeof require !== "undefined") {
  ({ Logger } = require("./logger.js"));
  ({
    ErrorHandler,
    Result,
    AppError,
    ErrorType,
  } = require("./error-handler.js"));
}

/**
 * YouTube ページタイプの定義
 * @readonly
 * @enum {string}
 */
const YouTubePageType = {
  VIDEO: "video", // 通常の動画ページ
  SHORTS: "shorts", // YouTube Shorts
  LIVE: "live", // ライブ配信
  PREMIERE: "premiere", // プレミア公開
  PLAYLIST: "playlist", // プレイリスト
  CHANNEL: "channel", // チャンネルページ
  HOME: "home", // ホームページ
  SEARCH: "search", // 検索結果
  TRENDING: "trending", // トレンド
  SUBSCRIPTIONS: "subscriptions", // 登録チャンネル
  LIBRARY: "library", // ライブラリ
  HISTORY: "history", // 履歴
  WATCH_LATER: "watch_later", // 後で見る
  UNKNOWN: "unknown", // 不明なページ
};

/**
 * ページ検出の信頼度レベル
 * @readonly
 * @enum {number}
 */
const DetectionConfidence = {
  HIGH: 3, // 高い信頼度（複数の指標で確認）
  MEDIUM: 2, // 中程度の信頼度（主要な指標で確認）
  LOW: 1, // 低い信頼度（限定的な指標のみ）
  NONE: 0, // 検出不可
};

/**
 * ページ変更イベントの種類
 * @readonly
 * @enum {string}
 */
const PageChangeEvent = {
  NAVIGATION: "navigation", // ページ間の遷移
  PLAYER_LOAD: "player_load", // 動画プレーヤーの読み込み
  CONTENT_UPDATE: "content_update", // コンテンツの更新
  LAYOUT_CHANGE: "layout_change", // レイアウトの変更
};

/**
 * YouTubePageDetector
 * YouTube ページの検出と監視を行うクラス
 */
class YouTubePageDetector {
  /**
   * YouTubePageDetectorインスタンスを作成
   * @param {Object} dependencies - 依存関係オブジェクト
   * @param {Logger} dependencies.logger - ロガーインスタンス
   * @param {ErrorHandler} dependencies.errorHandler - エラーハンドラーインスタンス
   * @param {Object} [options] - オプション
   * @param {number} [options.detectionInterval=1000] - 検出間隔（ミリ秒）
   * @param {number} [options.maxRetries=3] - 最大リトライ回数
   * @param {boolean} [options.enableMutationObserver=true] - MutationObserver の有効化
   */
  constructor(dependencies, options = {}) {
    // 依存関係の検証
    this._validateDependencies(dependencies);

    // 依存関係の設定
    this.logger = dependencies.logger;
    this.errorHandler = dependencies.errorHandler;

    // オプションの設定
    this.options = {
      detectionInterval: options.detectionInterval || 1000,
      maxRetries: options.maxRetries || 3,
      enableMutationObserver: options.enableMutationObserver !== false,
      ...options,
    };

    // 内部状態
    this.currentPageType = YouTubePageType.UNKNOWN;
    this.previousPageType = YouTubePageType.UNKNOWN;
    this.currentUrl = "";
    this.previousUrl = "";
    this.detectionConfidence = DetectionConfidence.NONE;
    this.initialized = false;

    // 監視関連
    this.mutationObserver = null;
    this.detectionTimer = null;
    this.eventListeners = new Set();
    this.changeListeners = new Set();

    // パフォーマンス監視
    this.detectionStats = {
      totalDetections: 0,
      successfulDetections: 0,
      failedDetections: 0,
      averageDetectionTime: 0,
      lastDetectionTime: null,
    };

    // キャッシュ
    this.elementCache = new Map();
    this.cacheExpiry = new Map();
    this.cacheTimeout = 5000; // 5秒でキャッシュを無効化

    this.logger.info("YouTubePageDetector created", {
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
    const required = ["logger", "errorHandler"];

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
   * YouTubePageDetectorを初期化
   * @returns {Promise<Result<boolean>>} 初期化結果
   */
  async initialize() {
    if (this.initialized) {
      return Result.success(true);
    }

    this.logger.info("Initializing YouTubePageDetector");

    try {
      // 初期ページタイプを検出
      const initialDetectionResult = await this.detectPageType();
      if (initialDetectionResult.isFailure()) {
        return Result.failure(
          `Initial page detection failed: ${initialDetectionResult.error.message}`,
          {
            type: ErrorType.INITIALIZATION_ERROR,
            context: { phase: "initialDetection" },
          }
        );
      }

      // MutationObserver を設定
      if (this.options.enableMutationObserver) {
        this._setupMutationObserver();
      }

      // 定期的な検出を開始
      this._startPeriodicDetection();

      // URL変更の監視を設定
      this._setupUrlChangeDetection();

      this.initialized = true;
      this.logger.info("YouTubePageDetector initialized successfully", {
        initialPageType: this.currentPageType,
        confidence: this.detectionConfidence,
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
   * ページタイプを検出
   * @returns {Promise<Result<string>>} 検出されたページタイプ
   */
  async detectPageType() {
    const startTime = performance.now();
    this.detectionStats.totalDetections++;

    try {
      this.logger.debug("Starting page type detection");

      // URL ベースの検出
      const urlResult = this._detectFromUrl();

      // DOM ベースの検出
      const domResult = await this._detectFromDOM();

      // 結果を統合して最も信頼度の高いものを選択
      const finalResult = this._consolidateDetectionResults([
        urlResult,
        domResult,
      ]);

      // 検出結果を更新
      this._updateDetectionState(finalResult);

      const endTime = performance.now();
      const detectionTime = endTime - startTime;
      this._updateDetectionStats(detectionTime, true);

      this.logger.info("Page type detected", {
        pageType: finalResult.pageType,
        confidence: finalResult.confidence,
        detectionTime: `${detectionTime.toFixed(2)}ms`,
        url: window.location.href,
      });

      return Result.success(finalResult.pageType);
    } catch (error) {
      const endTime = performance.now();
      const detectionTime = endTime - startTime;
      this._updateDetectionStats(detectionTime, false);

      return Result.failure(
        this.errorHandler.handleError(error, {
          type: ErrorType.ELEMENT_NOT_FOUND,
          context: { phase: "pageTypeDetection" },
        })
      );
    }
  }

  /**
   * URL からページタイプを検出
   * @returns {Object} 検出結果
   * @private
   */
  _detectFromUrl() {
    const url = window.location.href;
    const pathname = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);

    this.logger.debug("Detecting page type from URL", { url, pathname });

    // YouTube Shorts
    if (pathname.includes("/shorts/")) {
      return {
        pageType: YouTubePageType.SHORTS,
        confidence: DetectionConfidence.HIGH,
        source: "url",
        indicators: ["pathname:/shorts/"],
      };
    }

    // 通常の動画ページ
    if (pathname === "/watch" && searchParams.has("v")) {
      // ライブ配信の検出
      if (searchParams.has("live") || url.includes("live_stream")) {
        return {
          pageType: YouTubePageType.LIVE,
          confidence: DetectionConfidence.MEDIUM,
          source: "url",
          indicators: ["pathname:/watch", "param:live"],
        };
      }

      return {
        pageType: YouTubePageType.VIDEO,
        confidence: DetectionConfidence.HIGH,
        source: "url",
        indicators: ["pathname:/watch", "param:v"],
      };
    }

    // プレイリスト
    if (pathname === "/playlist" || searchParams.has("list")) {
      return {
        pageType: YouTubePageType.PLAYLIST,
        confidence: DetectionConfidence.HIGH,
        source: "url",
        indicators: ["pathname:/playlist", "param:list"],
      };
    }

    // チャンネルページ
    if (
      pathname.startsWith("/channel/") ||
      pathname.startsWith("/c/") ||
      pathname.startsWith("/@")
    ) {
      return {
        pageType: YouTubePageType.CHANNEL,
        confidence: DetectionConfidence.HIGH,
        source: "url",
        indicators: [`pathname:${pathname}`],
      };
    }

    // 検索結果
    if (pathname === "/results" && searchParams.has("search_query")) {
      return {
        pageType: YouTubePageType.SEARCH,
        confidence: DetectionConfidence.HIGH,
        source: "url",
        indicators: ["pathname:/results", "param:search_query"],
      };
    }

    // 特殊ページ
    const specialPages = {
      "/": YouTubePageType.HOME,
      "/feed/trending": YouTubePageType.TRENDING,
      "/feed/subscriptions": YouTubePageType.SUBSCRIPTIONS,
      "/feed/library": YouTubePageType.LIBRARY,
      "/feed/history": YouTubePageType.HISTORY,
      "/playlist?list=WL": YouTubePageType.WATCH_LATER,
    };

    for (const [path, pageType] of Object.entries(specialPages)) {
      if (pathname === path || (path.includes("?") && url.includes(path))) {
        return {
          pageType,
          confidence: DetectionConfidence.MEDIUM,
          source: "url",
          indicators: [`pathname:${path}`],
        };
      }
    }

    return {
      pageType: YouTubePageType.UNKNOWN,
      confidence: DetectionConfidence.NONE,
      source: "url",
      indicators: [],
    };
  }

  /**
   * DOM からページタイプを検出
   * @returns {Promise<Object>} 検出結果
   * @private
   */
  async _detectFromDOM() {
    this.logger.debug("Detecting page type from DOM");

    const indicators = [];
    let pageType = YouTubePageType.UNKNOWN;
    let confidence = DetectionConfidence.NONE;

    try {
      // 動画プレーヤーの検出
      const videoPlayer = await this._findElementWithCache([
        "#movie_player",
        ".html5-video-player",
        '[data-testid="video-player"]',
      ]);

      if (videoPlayer) {
        indicators.push("element:video-player");

        // Shorts プレーヤーの検出
        const shortsPlayer = await this._findElementWithCache([
          "#shorts-player",
          '[data-testid="shorts-player"]',
          ".ytd-shorts",
        ]);

        if (shortsPlayer) {
          pageType = YouTubePageType.SHORTS;
          confidence = DetectionConfidence.HIGH;
          indicators.push("element:shorts-player");
        } else {
          // ライブ配信の検出
          const liveIndicators = await this._findElementWithCache([
            ".ytp-live",
            ".ytp-live-badge",
            '[data-testid="live-badge"]',
            ".live-stream-text",
          ]);

          if (liveIndicators) {
            pageType = YouTubePageType.LIVE;
            confidence = DetectionConfidence.HIGH;
            indicators.push("element:live-indicator");
          } else {
            // プレミア公開の検出
            const premiereIndicators = await this._findElementWithCache([
              ".ytp-premiere-countdown",
              '[data-testid="premiere-countdown"]',
              ".premiere-badge",
            ]);

            if (premiereIndicators) {
              pageType = YouTubePageType.PREMIERE;
              confidence = DetectionConfidence.HIGH;
              indicators.push("element:premiere-indicator");
            } else {
              // 通常の動画
              pageType = YouTubePageType.VIDEO;
              confidence = DetectionConfidence.MEDIUM;
            }
          }
        }
      } else {
        // プレーヤーがない場合の検出

        // チャンネルページの検出
        const channelHeader = await this._findElementWithCache([
          "#channel-header",
          ".ytd-c4-tabbed-header-renderer",
          ".ytd-channel-header-renderer",
        ]);

        if (channelHeader) {
          pageType = YouTubePageType.CHANNEL;
          confidence = DetectionConfidence.MEDIUM;
          indicators.push("element:channel-header");
        } else {
          // 検索結果の検出
          const searchResults = await this._findElementWithCache([
            "#contents.ytd-search-page-renderer",
            ".ytd-search-page-renderer",
          ]);

          if (searchResults) {
            pageType = YouTubePageType.SEARCH;
            confidence = DetectionConfidence.MEDIUM;
            indicators.push("element:search-results");
          } else {
            // ホームページの検出
            const homeContent = await this._findElementWithCache([
              "#contents.ytd-rich-grid-renderer",
              ".ytd-browse-page-renderer",
            ]);

            if (homeContent && window.location.pathname === "/") {
              pageType = YouTubePageType.HOME;
              confidence = DetectionConfidence.LOW;
              indicators.push("element:home-content");
            }
          }
        }
      }

      return {
        pageType,
        confidence,
        source: "dom",
        indicators,
      };
    } catch (error) {
      this.logger.warn("DOM detection failed", { error });
      return {
        pageType: YouTubePageType.UNKNOWN,
        confidence: DetectionConfidence.NONE,
        source: "dom",
        indicators: [],
        error: error.message,
      };
    }
  }

  /**
   * キャッシュ付きで要素を検索
   * @param {string[]} selectors - セレクター配列
   * @returns {Promise<Element|null>} 見つかった要素
   * @private
   */
  async _findElementWithCache(selectors) {
    const cacheKey = selectors.join("|");
    const now = Date.now();

    // キャッシュをチェック
    if (this.elementCache.has(cacheKey)) {
      const expiry = this.cacheExpiry.get(cacheKey);
      if (expiry && now < expiry) {
        return this.elementCache.get(cacheKey);
      } else {
        // 期限切れのキャッシュを削除
        this.elementCache.delete(cacheKey);
        this.cacheExpiry.delete(cacheKey);
      }
    }

    // 要素を検索
    let element = null;
    for (const selector of selectors) {
      try {
        element = document.querySelector(selector);
        if (element) {
          break;
        }
      } catch (error) {
        this.logger.warn(`Invalid selector: ${selector}`, { error });
      }
    }

    // キャッシュに保存
    this.elementCache.set(cacheKey, element);
    this.cacheExpiry.set(cacheKey, now + this.cacheTimeout);

    return element;
  }

  /**
   * 検出結果を統合
   * @param {Object[]} results - 検出結果の配列
   * @returns {Object} 統合された結果
   * @private
   */
  _consolidateDetectionResults(results) {
    // 最も信頼度の高い結果を選択
    let bestResult = results[0];

    for (const result of results) {
      if (result.confidence > bestResult.confidence) {
        bestResult = result;
      } else if (result.confidence === bestResult.confidence) {
        // 同じ信頼度の場合は、より多くの指標を持つものを選択
        if (result.indicators.length > bestResult.indicators.length) {
          bestResult = result;
        }
      }
    }

    // 複数の結果が同じページタイプを示している場合は信頼度を上げる
    const sameTypeResults = results.filter(
      (r) => r.pageType === bestResult.pageType
    );
    if (sameTypeResults.length > 1) {
      bestResult.confidence = Math.min(
        bestResult.confidence + 1,
        DetectionConfidence.HIGH
      );
      bestResult.indicators = [
        ...new Set(sameTypeResults.flatMap((r) => r.indicators)),
      ];
    }

    return bestResult;
  }

  /**
   * 検出状態を更新
   * @param {Object} result - 検出結果
   * @private
   */
  _updateDetectionState(result) {
    this.previousPageType = this.currentPageType;
    this.previousUrl = this.currentUrl;

    this.currentPageType = result.pageType;
    this.currentUrl = window.location.href;
    this.detectionConfidence = result.confidence;

    // ページタイプが変更された場合は通知
    if (this.previousPageType !== this.currentPageType) {
      this._notifyPageChange(PageChangeEvent.NAVIGATION, {
        from: this.previousPageType,
        to: this.currentPageType,
        confidence: this.detectionConfidence,
        url: this.currentUrl,
        indicators: result.indicators,
      });
    }
  }

  /**
   * 検出統計を更新
   * @param {number} detectionTime - 検出時間
   * @param {boolean} success - 成功フラグ
   * @private
   */
  _updateDetectionStats(detectionTime, success) {
    if (success) {
      this.detectionStats.successfulDetections++;
    } else {
      this.detectionStats.failedDetections++;
    }

    // 平均検出時間を更新
    const totalTime =
      this.detectionStats.averageDetectionTime *
        (this.detectionStats.totalDetections - 1) +
      detectionTime;
    this.detectionStats.averageDetectionTime =
      totalTime / this.detectionStats.totalDetections;
    this.detectionStats.lastDetectionTime = detectionTime;
  }

  /**
   * MutationObserver を設定
   * @private
   */
  _setupMutationObserver() {
    if (typeof MutationObserver === "undefined") {
      this.logger.warn("MutationObserver not available");
      return;
    }

    this.mutationObserver = new MutationObserver((mutations) => {
      this._handleDOMChanges(mutations);
    });

    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "id", "data-testid"],
    });

    this.logger.debug("MutationObserver set up");
  }

  /**
   * DOM変更を処理
   * @param {MutationRecord[]} mutations - 変更記録
   * @private
   */
  _handleDOMChanges(mutations) {
    let hasSignificantChanges = false;
    const significantSelectors = [
      "#movie_player",
      ".html5-video-player",
      "#shorts-player",
      "#channel-header",
      "#contents",
    ];

    for (const mutation of mutations) {
      if (mutation.type === "childList") {
        for (const node of [...mutation.addedNodes, ...mutation.removedNodes]) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            for (const selector of significantSelectors) {
              if (node.matches?.(selector) || node.querySelector?.(selector)) {
                hasSignificantChanges = true;
                break;
              }
            }
            if (hasSignificantChanges) break;
          }
        }
      } else if (mutation.type === "attributes") {
        const target = mutation.target;
        for (const selector of significantSelectors) {
          if (target.matches?.(selector)) {
            hasSignificantChanges = true;
            break;
          }
        }
      }
      if (hasSignificantChanges) break;
    }

    if (hasSignificantChanges) {
      this.logger.debug("Significant DOM changes detected");

      // キャッシュをクリア
      this._clearElementCache();

      // ページタイプを再検出
      setTimeout(() => {
        this.detectPageType().catch((error) => {
          this.logger.warn("Failed to re-detect page type after DOM changes", {
            error,
          });
        });
      }, 100);

      // 変更通知
      this._notifyPageChange(PageChangeEvent.CONTENT_UPDATE, {
        mutationCount: mutations.length,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * 定期的な検出を開始
   * @private
   */
  _startPeriodicDetection() {
    if (this.detectionTimer) {
      clearInterval(this.detectionTimer);
    }

    this.detectionTimer = setInterval(() => {
      // URL が変更されているかチェック
      if (window.location.href !== this.currentUrl) {
        this.detectPageType().catch((error) => {
          this.logger.warn("Periodic detection failed", { error });
        });
      }
    }, this.options.detectionInterval);

    this.logger.debug("Periodic detection started", {
      interval: this.options.detectionInterval,
    });
  }

  /**
   * URL変更の監視を設定
   * @private
   */
  _setupUrlChangeDetection() {
    // History API の監視
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = (...args) => {
      originalPushState.apply(history, args);
      this._handleUrlChange();
    };

    history.replaceState = (...args) => {
      originalReplaceState.apply(history, args);
      this._handleUrlChange();
    };

    // popstate イベントの監視
    const popstateHandler = () => this._handleUrlChange();
    window.addEventListener("popstate", popstateHandler);
    this.eventListeners.add(() => {
      window.removeEventListener("popstate", popstateHandler);
    });

    this.logger.debug("URL change detection set up");
  }

  /**
   * URL変更を処理
   * @private
   */
  _handleUrlChange() {
    this.logger.debug("URL change detected", {
      from: this.currentUrl,
      to: window.location.href,
    });

    // キャッシュをクリア
    this._clearElementCache();

    // 少し遅延してからページタイプを検出（DOM更新を待つ）
    setTimeout(() => {
      this.detectPageType().catch((error) => {
        this.logger.warn("Failed to detect page type after URL change", {
          error,
        });
      });
    }, 200);
  }

  /**
   * 要素キャッシュをクリア
   * @private
   */
  _clearElementCache() {
    this.elementCache.clear();
    this.cacheExpiry.clear();
    this.logger.debug("Element cache cleared");
  }

  /**
   * ページ変更リスナーを追加
   * @param {Function} listener - リスナー関数
   * @returns {Function} リスナー削除関数
   */
  addChangeListener(listener) {
    this.changeListeners.add(listener);

    // リスナー削除関数を返す
    return () => {
      this.changeListeners.delete(listener);
    };
  }

  /**
   * ページ変更を通知
   * @param {string} eventType - イベントタイプ
   * @param {Object} data - イベントデータ
   * @private
   */
  _notifyPageChange(eventType, data) {
    const event = {
      type: eventType,
      timestamp: Date.now(),
      currentPageType: this.currentPageType,
      previousPageType: this.previousPageType,
      confidence: this.detectionConfidence,
      ...data,
    };

    this.logger.info("Page change detected", event);

    for (const listener of this.changeListeners) {
      try {
        listener(event);
      } catch (error) {
        this.logger.warn("Error in page change listener", { error });
      }
    }
  }

  /**
   * DOM変更イベントを処理（外部から呼び出し可能）
   * @param {MutationRecord[]} mutations - 変更記録
   */
  onDOMChange(mutations) {
    if (this.initialized) {
      this._handleDOMChanges(mutations);
    }
  }

  /**
   * 設定変更を処理
   * @param {Object} settings - 新しい設定
   * @returns {Promise<void>}
   */
  async onSettingsChanged(settings) {
    this.logger.debug("Settings changed", { settings });

    // 設定に応じて動作を調整
    if (settings.detectionInterval !== undefined) {
      this.options.detectionInterval = settings.detectionInterval;
      this._startPeriodicDetection(); // タイマーを再設定
    }

    if (settings.enableMutationObserver !== undefined) {
      this.options.enableMutationObserver = settings.enableMutationObserver;

      if (settings.enableMutationObserver && !this.mutationObserver) {
        this._setupMutationObserver();
      } else if (!settings.enableMutationObserver && this.mutationObserver) {
        this.mutationObserver.disconnect();
        this.mutationObserver = null;
      }
    }
  }

  /**
   * 現在の状態を取得
   * @returns {Object} 状態オブジェクト
   */
  getState() {
    return {
      initialized: this.initialized,
      currentPageType: this.currentPageType,
      previousPageType: this.previousPageType,
      currentUrl: this.currentUrl,
      previousUrl: this.previousUrl,
      detectionConfidence: this.detectionConfidence,
      detectionStats: { ...this.detectionStats },
      cacheSize: this.elementCache.size,
      listenerCount: this.changeListeners.size,
    };
  }

  /**
   * 統計情報を取得
   * @returns {Object} 統計情報
   */
  getStats() {
    return {
      ...this.detectionStats,
      cacheHitRate:
        this.elementCache.size > 0
          ? (this.detectionStats.successfulDetections /
              this.detectionStats.totalDetections) *
            100
          : 0,
      currentPageType: this.currentPageType,
      detectionConfidence: this.detectionConfidence,
    };
  }

  /**
   * YouTubePageDetectorを破棄
   * @returns {Promise<void>}
   */
  async destroy() {
    if (!this.initialized) {
      return;
    }

    this.logger.info("Destroying YouTubePageDetector");

    try {
      // タイマーを停止
      if (this.detectionTimer) {
        clearInterval(this.detectionTimer);
        this.detectionTimer = null;
      }

      // MutationObserver を停止
      if (this.mutationObserver) {
        this.mutationObserver.disconnect();
        this.mutationObserver = null;
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

      // リスナーをクリア
      this.changeListeners.clear();

      // キャッシュをクリア
      this._clearElementCache();

      // 状態をリセット
      this.initialized = false;
      this.currentPageType = YouTubePageType.UNKNOWN;
      this.detectionConfidence = DetectionConfidence.NONE;

      this.logger.info("YouTubePageDetector destroyed successfully");
    } catch (error) {
      this.logger.error("Error during YouTubePageDetector destruction", {
        error,
      });
    }
  }
}

// CommonJS/ES6 両対応のエクスポート
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    YouTubePageType,
    DetectionConfidence,
    PageChangeEvent,
    YouTubePageDetector,
  };
} else if (typeof window !== "undefined") {
  window.YouTubePageType = YouTubePageType;
  window.DetectionConfidence = DetectionConfidence;
  window.PageChangeEvent = PageChangeEvent;
  window.YouTubePageDetector = YouTubePageDetector;
}
