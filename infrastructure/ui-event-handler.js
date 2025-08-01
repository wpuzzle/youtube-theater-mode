/**
 * UIEventHandler
 * UIイベントの処理を専門とするクラス
 * イベントの委譲とバブリング制御、アクセシビリティ対応を実装
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
 * イベントハンドラーの設定
 * @typedef {Object} EventHandlerConfig
 * @property {string} selector - イベント対象のセレクター
 * @property {string} event - イベント名
 * @property {Function} handler - ハンドラー関数
 * @property {Object} [options] - イベントオプション
 * @property {boolean} [options.preventDefault=false] - デフォルトアクションを防ぐかどうか
 * @property {boolean} [options.stopPropagation=false] - イベントの伝播を停止するかどうか
 * @property {boolean} [options.passive=false] - パッシブリスナーかどうか
 * @property {boolean} [options.once=false] - 一度だけ実行するかどうか
 * @property {number} [options.debounce] - デバウンス時間（ミリ秒）
 * @property {number} [options.throttle] - スロットル時間（ミリ秒）
 */

/**
 * アクセシビリティ設定
 * @typedef {Object} AccessibilityConfig
 * @property {boolean} keyboardNavigation - キーボードナビゲーションを有効にするかどうか
 * @property {boolean} focusManagement - フォーカス管理を有効にするかどうか
 * @property {boolean} ariaSupport - ARIA属性のサポートを有効にするかどうか
 * @property {Object} keyMappings - キーマッピング設定
 */

/**
 * UIEventHandler
 * UIイベントの処理を専門とするクラス
 */
class UIEventHandler {
  /**
   * UIEventHandlerインスタンスを作成
   * @param {Object} options - オプション
   * @param {HTMLElement} [options.rootElement=document] - ルート要素
   * @param {Logger} [options.logger] - ロガーインスタンス
   * @param {ErrorHandler} [options.errorHandler] - エラーハンドラーインスタンス
   * @param {AccessibilityConfig} [options.accessibility] - アクセシビリティ設定
   */
  constructor(options = {}) {
    this.rootElement =
      options.rootElement ||
      (typeof document !== "undefined" ? document : null);
    this.logger = options.logger;
    this.errorHandler = options.errorHandler;
    this.accessibility = {
      keyboardNavigation: true,
      focusManagement: true,
      ariaSupport: true,
      keyMappings: {
        Enter: "click",
        Space: "click",
        Escape: "cancel",
        ArrowUp: "navigate-up",
        ArrowDown: "navigate-down",
        ArrowLeft: "navigate-left",
        ArrowRight: "navigate-right",
        Tab: "focus-next",
        "Shift+Tab": "focus-previous",
      },
      ...options.accessibility,
    };

    // イベントハンドラーの管理
    this.eventHandlers = new Map(); // selector -> Map<event, handler>
    this.delegatedHandlers = new Map(); // event -> handler
    this.activeElements = new Set(); // アクティブな要素の追跡

    // デバウンス・スロットル用のタイマー
    this.debounceTimers = new Map();
    this.throttleTimers = new Map();

    // フォーカス管理
    this.focusableElements = [];
    this.currentFocusIndex = -1;
    this.focusHistory = [];

    // イベント統計
    this.eventStats = {
      totalEvents: 0,
      handledEvents: 0,
      errorCount: 0,
      eventTypes: new Map(),
    };

    if (this.logger) {
      this.logger.debug("UIEventHandler initialized", {
        rootElement: this.rootElement?.tagName || "none",
        accessibility: this.accessibility,
      });
    }
  }

  /**
   * イベントハンドラーを登録
   * @param {EventHandlerConfig} config - イベントハンドラー設定
   * @returns {Function} ハンドラー削除関数
   */
  registerHandler(config) {
    if (!this._validateConfig(config)) {
      return () => {}; // 無効な設定の場合は空の削除関数を返す
    }

    const { selector, event, handler, options = {} } = config;

    try {
      // ハンドラーをラップ
      const wrappedHandler = this._wrapHandler(handler, options);

      // セレクターベースのハンドラー管理
      if (!this.eventHandlers.has(selector)) {
        this.eventHandlers.set(selector, new Map());
      }

      const selectorHandlers = this.eventHandlers.get(selector);
      selectorHandlers.set(event, wrappedHandler);

      // イベント委譲を設定
      this._setupEventDelegation(event, selector, wrappedHandler, options);

      if (this.logger) {
        this.logger.debug("Event handler registered", {
          selector,
          event,
          options,
        });
      }

      // ハンドラー削除関数を返す
      return () => this._removeHandler(selector, event);
    } catch (error) {
      const appError = new AppError("Failed to register event handler", {
        type: ErrorType.INTERNAL_ERROR,
        cause: error,
        context: { selector, event },
      });

      if (this.errorHandler) {
        this.errorHandler.handleError(appError);
      }

      return () => {};
    }
  }

  /**
   * 複数のイベントハンドラーを一括登録
   * @param {Array<EventHandlerConfig>} configs - イベントハンドラー設定の配列
   * @returns {Function} 全ハンドラー削除関数
   */
  registerHandlers(configs) {
    const removeHandlers = configs.map((config) =>
      this.registerHandler(config)
    );

    return () => {
      removeHandlers.forEach((removeHandler) => removeHandler());
    };
  }

  /**
   * キーボードナビゲーションを設定
   * @param {Array<string>} selectors - フォーカス可能な要素のセレクター配列
   * @returns {Function} ナビゲーション削除関数
   */
  setupKeyboardNavigation(selectors) {
    if (!this.accessibility.keyboardNavigation || !this.rootElement) {
      return () => {};
    }

    try {
      // フォーカス可能な要素を取得
      this._updateFocusableElements(selectors);

      // キーボードイベントハンドラーを登録
      const keyboardHandler = this._createKeyboardHandler();
      this.rootElement.addEventListener("keydown", keyboardHandler, true);

      if (this.logger) {
        this.logger.debug("Keyboard navigation setup", {
          focusableCount: this.focusableElements.length,
        });
      }

      return () => {
        this.rootElement.removeEventListener("keydown", keyboardHandler, true);
        this.focusableElements = [];
        this.currentFocusIndex = -1;
      };
    } catch (error) {
      const appError = new AppError("Failed to setup keyboard navigation", {
        type: ErrorType.INTERNAL_ERROR,
        cause: error,
      });

      if (this.errorHandler) {
        this.errorHandler.handleError(appError);
      }

      return () => {};
    }
  }

  /**
   * フォーカス管理を設定
   * @param {Object} options - フォーカス管理オプション
   * @param {boolean} [options.trapFocus=false] - フォーカストラップを有効にするかどうか
   * @param {string} [options.initialFocus] - 初期フォーカス要素のセレクター
   * @param {string} [options.returnFocus] - 復帰フォーカス要素のセレクター
   * @returns {Function} フォーカス管理削除関数
   */
  setupFocusManagement(options = {}) {
    if (!this.accessibility.focusManagement || !this.rootElement) {
      return () => {};
    }

    try {
      const { trapFocus = false, initialFocus, returnFocus } = options;

      // 初期フォーカスを設定
      if (initialFocus) {
        const initialElement = this.rootElement.querySelector(initialFocus);
        if (initialElement) {
          this._setFocus(initialElement);
        }
      }

      // フォーカストラップを設定
      let focusTrapHandler = null;
      if (trapFocus) {
        focusTrapHandler = this._createFocusTrapHandler();
        this.rootElement.addEventListener("keydown", focusTrapHandler, true);
      }

      // フォーカス履歴を記録
      const focusHandler = (event) => {
        this._recordFocusHistory(event.target);
      };
      this.rootElement.addEventListener("focus", focusHandler, true);

      if (this.logger) {
        this.logger.debug("Focus management setup", {
          trapFocus,
          initialFocus,
          returnFocus,
        });
      }

      return () => {
        if (focusTrapHandler) {
          this.rootElement.removeEventListener(
            "keydown",
            focusTrapHandler,
            true
          );
        }
        this.rootElement.removeEventListener("focus", focusHandler, true);

        // 復帰フォーカスを設定
        if (returnFocus) {
          const returnElement = this.rootElement.querySelector(returnFocus);
          if (returnElement) {
            this._setFocus(returnElement);
          }
        }

        this.focusHistory = [];
      };
    } catch (error) {
      const appError = new AppError("Failed to setup focus management", {
        type: ErrorType.INTERNAL_ERROR,
        cause: error,
      });

      if (this.errorHandler) {
        this.errorHandler.handleError(appError);
      }

      return () => {};
    }
  }

  /**
   * ARIA属性のサポートを設定
   * @param {Object} ariaConfig - ARIA設定
   * @param {Object} ariaConfig.roles - ロール設定 (selector -> role)
   * @param {Object} ariaConfig.labels - ラベル設定 (selector -> label)
   * @param {Object} ariaConfig.descriptions - 説明設定 (selector -> description)
   * @param {Object} ariaConfig.states - 状態設定 (selector -> state)
   * @returns {Function} ARIA設定削除関数
   */
  setupAriaSupport(ariaConfig) {
    if (!this.accessibility.ariaSupport || !this.rootElement) {
      return () => {};
    }

    try {
      const {
        roles = {},
        labels = {},
        descriptions = {},
        states = {},
      } = ariaConfig;

      // ARIA属性を設定
      const appliedAttributes = [];

      // ロールを設定
      for (const [selector, role] of Object.entries(roles)) {
        const elements = this.rootElement.querySelectorAll(selector);
        elements.forEach((element) => {
          element.setAttribute("role", role);
          appliedAttributes.push({ element, attribute: "role" });
        });
      }

      // ラベルを設定
      for (const [selector, label] of Object.entries(labels)) {
        const elements = this.rootElement.querySelectorAll(selector);
        elements.forEach((element) => {
          element.setAttribute("aria-label", label);
          appliedAttributes.push({ element, attribute: "aria-label" });
        });
      }

      // 説明を設定
      for (const [selector, description] of Object.entries(descriptions)) {
        const elements = this.rootElement.querySelectorAll(selector);
        elements.forEach((element) => {
          element.setAttribute("aria-description", description);
          appliedAttributes.push({ element, attribute: "aria-description" });
        });
      }

      // 状態を設定
      for (const [selector, stateConfig] of Object.entries(states)) {
        const elements = this.rootElement.querySelectorAll(selector);
        elements.forEach((element) => {
          for (const [state, value] of Object.entries(stateConfig)) {
            element.setAttribute(`aria-${state}`, value);
            appliedAttributes.push({ element, attribute: `aria-${state}` });
          }
        });
      }

      if (this.logger) {
        this.logger.debug("ARIA support setup", {
          attributesApplied: appliedAttributes.length,
        });
      }

      return () => {
        // 設定したARIA属性を削除
        appliedAttributes.forEach(({ element, attribute }) => {
          element.removeAttribute(attribute);
        });
      };
    } catch (error) {
      const appError = new AppError("Failed to setup ARIA support", {
        type: ErrorType.INTERNAL_ERROR,
        cause: error,
      });

      if (this.errorHandler) {
        this.errorHandler.handleError(appError);
      }

      return () => {};
    }
  }

  /**
   * イベント統計を取得
   * @returns {Object} イベント統計
   */
  getEventStats() {
    return {
      ...this.eventStats,
      eventTypes: Object.fromEntries(this.eventStats.eventTypes),
    };
  }

  /**
   * イベント統計をリセット
   */
  resetEventStats() {
    this.eventStats = {
      totalEvents: 0,
      handledEvents: 0,
      errorCount: 0,
      eventTypes: new Map(),
    };
  }

  /**
   * UIEventHandlerを破棄
   */
  dispose() {
    try {
      // 全てのイベントハンドラーを削除
      this.eventHandlers.clear();
      this.delegatedHandlers.clear();

      // タイマーをクリア
      for (const timer of this.debounceTimers.values()) {
        clearTimeout(timer);
      }
      this.debounceTimers.clear();

      for (const timer of this.throttleTimers.values()) {
        clearTimeout(timer);
      }
      this.throttleTimers.clear();

      // フォーカス管理をクリア
      this.focusableElements = [];
      this.currentFocusIndex = -1;
      this.focusHistory = [];

      // アクティブ要素をクリア
      this.activeElements.clear();

      if (this.logger) {
        this.logger.debug("UIEventHandler disposed");
      }
    } catch (error) {
      if (this.logger) {
        this.logger.warn("Error during UIEventHandler disposal", error);
      }
    }
  }

  // プライベートメソッド

  /**
   * 設定を検証
   * @param {EventHandlerConfig} config - 設定
   * @returns {boolean} 有効かどうか
   * @private
   */
  _validateConfig(config) {
    if (!config || typeof config !== "object") {
      if (this.logger) {
        this.logger.warn("Invalid event handler config: not an object");
      }
      return false;
    }

    if (!config.selector || typeof config.selector !== "string") {
      if (this.logger) {
        this.logger.warn(
          "Invalid event handler config: missing or invalid selector"
        );
      }
      return false;
    }

    if (!config.event || typeof config.event !== "string") {
      if (this.logger) {
        this.logger.warn(
          "Invalid event handler config: missing or invalid event"
        );
      }
      return false;
    }

    if (!config.handler || typeof config.handler !== "function") {
      if (this.logger) {
        this.logger.warn(
          "Invalid event handler config: missing or invalid handler"
        );
      }
      return false;
    }

    return true;
  }

  /**
   * ハンドラーをラップ
   * @param {Function} handler - 元のハンドラー
   * @param {Object} options - オプション
   * @returns {Function} ラップされたハンドラー
   * @private
   */
  _wrapHandler(handler, options) {
    return (event) => {
      try {
        // 統計を更新
        this.eventStats.totalEvents++;
        const eventType = event.type;
        this.eventStats.eventTypes.set(
          eventType,
          (this.eventStats.eventTypes.get(eventType) || 0) + 1
        );

        // イベントオプションを適用
        if (options.preventDefault) {
          event.preventDefault();
        }

        if (options.stopPropagation) {
          event.stopPropagation();
        }

        // デバウンス処理
        if (options.debounce) {
          return this._debounce(handler, options.debounce, event);
        }

        // スロットル処理
        if (options.throttle) {
          return this._throttle(handler, options.throttle, event);
        }

        // ハンドラーを実行
        const result = handler(event);

        // 統計を更新
        this.eventStats.handledEvents++;

        return result;
      } catch (error) {
        this.eventStats.errorCount++;

        const appError = new AppError("Error in event handler", {
          type: ErrorType.INTERNAL_ERROR,
          cause: error,
          context: {
            eventType: event.type,
            target: event.target?.tagName || "unknown",
          },
        });

        if (this.errorHandler) {
          this.errorHandler.handleError(appError);
        } else if (this.logger) {
          this.logger.error("Error in event handler", appError);
        }
      }
    };
  }

  /**
   * イベント委譲を設定
   * @param {string} event - イベント名
   * @param {string} selector - セレクター
   * @param {Function} handler - ハンドラー
   * @param {Object} options - オプション
   * @private
   */
  _setupEventDelegation(event, selector, handler, options) {
    if (!this.rootElement) return;

    // 既存の委譲ハンドラーがあるかチェック
    if (!this.delegatedHandlers.has(event)) {
      const delegatedHandler = (e) => {
        // イベントターゲットから上位に向かってセレクターにマッチする要素を探す
        let target = e.target;
        while (target && target !== this.rootElement) {
          if (target.matches && target.matches(selector)) {
            // セレクターにマッチした場合、対応するハンドラーを実行
            const selectorHandlers = this.eventHandlers.get(selector);
            if (selectorHandlers && selectorHandlers.has(event)) {
              const specificHandler = selectorHandlers.get(event);
              // イベントオブジェクトのcurrentTargetを設定
              Object.defineProperty(e, "currentTarget", {
                value: target,
                configurable: true,
              });
              specificHandler(e);
              break;
            }
          }
          target = target.parentElement;
        }
      };

      this.delegatedHandlers.set(event, delegatedHandler);
      this.rootElement.addEventListener(event, delegatedHandler, {
        passive: options.passive || false,
        capture: true,
      });
    }
  }

  /**
   * ハンドラーを削除
   * @param {string} selector - セレクター
   * @param {string} event - イベント名
   * @private
   */
  _removeHandler(selector, event) {
    const selectorHandlers = this.eventHandlers.get(selector);
    if (selectorHandlers) {
      selectorHandlers.delete(event);
      if (selectorHandlers.size === 0) {
        this.eventHandlers.delete(selector);
      }
    }

    // 他にこのイベントを使用しているハンドラーがない場合、委譲ハンドラーを削除
    let hasOtherHandlers = false;
    for (const handlers of this.eventHandlers.values()) {
      if (handlers.has(event)) {
        hasOtherHandlers = true;
        break;
      }
    }

    if (!hasOtherHandlers && this.delegatedHandlers.has(event)) {
      const delegatedHandler = this.delegatedHandlers.get(event);
      if (this.rootElement) {
        this.rootElement.removeEventListener(event, delegatedHandler, true);
      }
      this.delegatedHandlers.delete(event);
    }
  }

  /**
   * デバウンス処理
   * @param {Function} func - 関数
   * @param {number} delay - 遅延時間
   * @param {Event} event - イベント
   * @private
   */
  _debounce(func, delay, event) {
    const key = `${func.name || "anonymous"}_${event.type}`;

    if (this.debounceTimers.has(key)) {
      clearTimeout(this.debounceTimers.get(key));
    }

    const timer = setTimeout(() => {
      func(event);
      this.debounceTimers.delete(key);
    }, delay);

    this.debounceTimers.set(key, timer);
  }

  /**
   * スロットル処理
   * @param {Function} func - 関数
   * @param {number} delay - 遅延時間
   * @param {Event} event - イベント
   * @private
   */
  _throttle(func, delay, event) {
    const key = `${func.name || "anonymous"}_${event.type}`;

    if (this.throttleTimers.has(key)) {
      return; // 既にタイマーが設定されている場合は実行しない
    }

    func(event);

    const timer = setTimeout(() => {
      this.throttleTimers.delete(key);
    }, delay);

    this.throttleTimers.set(key, timer);
  }

  /**
   * フォーカス可能な要素を更新
   * @param {Array<string>} selectors - セレクター配列
   * @private
   */
  _updateFocusableElements(selectors) {
    if (!this.rootElement) return;

    this.focusableElements = [];

    for (const selector of selectors) {
      const elements = this.rootElement.querySelectorAll(selector);
      elements.forEach((element) => {
        if (this._isFocusable(element)) {
          this.focusableElements.push(element);
        }
      });
    }

    // タブインデックス順にソート
    this.focusableElements.sort((a, b) => {
      const aIndex = parseInt(a.getAttribute("tabindex") || "0", 10);
      const bIndex = parseInt(b.getAttribute("tabindex") || "0", 10);
      return aIndex - bIndex;
    });
  }

  /**
   * 要素がフォーカス可能かどうかを判定
   * @param {HTMLElement} element - 要素
   * @returns {boolean} フォーカス可能かどうか
   * @private
   */
  _isFocusable(element) {
    if (!element || element.disabled || element.hidden) {
      return false;
    }

    const tabIndex = element.getAttribute("tabindex");
    if (tabIndex === "-1") {
      return false;
    }

    const style = window.getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden") {
      return false;
    }

    return true;
  }

  /**
   * キーボードハンドラーを作成
   * @returns {Function} キーボードハンドラー
   * @private
   */
  _createKeyboardHandler() {
    return (event) => {
      const key = event.key;
      const modifiers = [];

      if (event.ctrlKey) modifiers.push("Ctrl");
      if (event.altKey) modifiers.push("Alt");
      if (event.shiftKey) modifiers.push("Shift");
      if (event.metaKey) modifiers.push("Meta");

      const keyCombo =
        modifiers.length > 0 ? `${modifiers.join("+")}+${key}` : key;
      const action = this.accessibility.keyMappings[keyCombo];

      if (action) {
        this._handleKeyboardAction(action, event);
      }
    };
  }

  /**
   * キーボードアクションを処理
   * @param {string} action - アクション
   * @param {Event} event - イベント
   * @private
   */
  _handleKeyboardAction(action, event) {
    switch (action) {
      case "click":
        if (event.target && typeof event.target.click === "function") {
          event.preventDefault();
          event.target.click();
        }
        break;

      case "cancel":
        // Escapeキーの処理
        event.preventDefault();
        this._handleCancel(event);
        break;

      case "navigate-up":
      case "navigate-down":
      case "navigate-left":
      case "navigate-right":
        event.preventDefault();
        this._handleNavigation(action, event);
        break;

      case "focus-next":
        event.preventDefault();
        this._focusNext();
        break;

      case "focus-previous":
        event.preventDefault();
        this._focusPrevious();
        break;
    }
  }

  /**
   * キャンセル処理
   * @param {Event} event - イベント
   * @private
   */
  _handleCancel(event) {
    // モーダルやポップアップを閉じる処理
    const activeElement = document.activeElement;
    if (activeElement && activeElement.blur) {
      activeElement.blur();
    }
  }

  /**
   * ナビゲーション処理
   * @param {string} direction - 方向
   * @param {Event} event - イベント
   * @private
   */
  _handleNavigation(direction, event) {
    // 方向キーによるナビゲーション
    const currentElement = event.target;
    const currentIndex = this.focusableElements.indexOf(currentElement);

    if (currentIndex === -1) return;

    let nextIndex = currentIndex;

    switch (direction) {
      case "navigate-up":
      case "navigate-left":
        nextIndex = currentIndex - 1;
        break;
      case "navigate-down":
      case "navigate-right":
        nextIndex = currentIndex + 1;
        break;
    }

    // 範囲内に収める
    nextIndex = Math.max(
      0,
      Math.min(this.focusableElements.length - 1, nextIndex)
    );

    if (nextIndex !== currentIndex && this.focusableElements[nextIndex]) {
      this._setFocus(this.focusableElements[nextIndex]);
    }
  }

  /**
   * 次の要素にフォーカス
   * @private
   */
  _focusNext() {
    if (this.focusableElements.length === 0) return;

    this.currentFocusIndex =
      (this.currentFocusIndex + 1) % this.focusableElements.length;
    this._setFocus(this.focusableElements[this.currentFocusIndex]);
  }

  /**
   * 前の要素にフォーカス
   * @private
   */
  _focusPrevious() {
    if (this.focusableElements.length === 0) return;

    this.currentFocusIndex =
      this.currentFocusIndex <= 0
        ? this.focusableElements.length - 1
        : this.currentFocusIndex - 1;
    this._setFocus(this.focusableElements[this.currentFocusIndex]);
  }

  /**
   * フォーカストラップハンドラーを作成
   * @returns {Function} フォーカストラップハンドラー
   * @private
   */
  _createFocusTrapHandler() {
    return (event) => {
      if (event.key === "Tab") {
        const focusableElements = this.focusableElements;
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey) {
          // Shift+Tab: 逆方向
          if (document.activeElement === firstElement) {
            event.preventDefault();
            this._setFocus(lastElement);
          }
        } else {
          // Tab: 順方向
          if (document.activeElement === lastElement) {
            event.preventDefault();
            this._setFocus(firstElement);
          }
        }
      }
    };
  }

  /**
   * フォーカス履歴を記録
   * @param {HTMLElement} element - 要素
   * @private
   */
  _recordFocusHistory(element) {
    if (!element) return;

    // 履歴に追加
    this.focusHistory.push(element);

    // 履歴サイズを制限
    if (this.focusHistory.length > 10) {
      this.focusHistory.shift();
    }

    // 現在のフォーカスインデックスを更新
    const index = this.focusableElements.indexOf(element);
    if (index !== -1) {
      this.currentFocusIndex = index;
    }
  }

  /**
   * フォーカスを設定
   * @param {HTMLElement} element - 要素
   * @private
   */
  _setFocus(element) {
    if (!element || typeof element.focus !== "function") return;

    try {
      element.focus();

      // フォーカスが設定されたことをログに記録
      if (this.logger) {
        this.logger.trace("Focus set", {
          element: element.tagName,
          id: element.id,
          className: element.className,
        });
      }
    } catch (error) {
      if (this.logger) {
        this.logger.warn("Failed to set focus", error);
      }
    }
  }
}

// CommonJS/ES6 両対応のエクスポート
if (typeof module !== "undefined" && module.exports) {
  module.exports = { UIEventHandler };
} else if (typeof window !== "undefined") {
  window.UIEventHandler = UIEventHandler;
}
