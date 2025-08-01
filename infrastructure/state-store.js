/**
 * StateStore
 * Flux パターンに基づく状態管理システムを提供
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
 * アクション型の定義
 * @readonly
 * @enum {string}
 */
const ActionType = {
  // システムアクション
  INITIALIZE: "INITIALIZE",
  RESET: "RESET",

  // シアターモード関連アクション
  THEATER_MODE_TOGGLE: "THEATER_MODE_TOGGLE",
  THEATER_MODE_SET: "THEATER_MODE_SET",
  OPACITY_UPDATE: "OPACITY_UPDATE",

  // タブ関連アクション
  TAB_REGISTER: "TAB_REGISTER",
  TAB_UNREGISTER: "TAB_UNREGISTER",
  TAB_ACTIVATE: "TAB_ACTIVATE",
  TAB_UPDATE: "TAB_UPDATE",
  TAB_SYNC: "TAB_SYNC",

  // 設定関連アクション
  SETTINGS_LOAD: "SETTINGS_LOAD",
  SETTINGS_UPDATE: "SETTINGS_UPDATE",

  // UI関連アクション
  UI_UPDATE: "UI_UPDATE",
  UI_RESET: "UI_RESET",
};

/**
 * アクションクリエーター
 * 型安全なアクションオブジェクトを生成
 */
class ActionCreator {
  /**
   * 初期化アクションを作成
   * @param {Object} payload - 初期化データ
   * @returns {Action} アクション
   */
  static initialize(payload) {
    return {
      type: ActionType.INITIALIZE,
      payload,
    };
  }

  /**
   * リセットアクションを作成
   * @returns {Action} アクション
   */
  static reset() {
    return {
      type: ActionType.RESET,
    };
  }

  /**
   * シアターモード切替アクションを作成
   * @returns {Action} アクション
   */
  static toggleTheaterMode() {
    return {
      type: ActionType.THEATER_MODE_TOGGLE,
    };
  }

  /**
   * シアターモード設定アクションを作成
   * @param {boolean} enabled - 有効状態
   * @returns {Action} アクション
   */
  static setTheaterMode(enabled) {
    return {
      type: ActionType.THEATER_MODE_SET,
      payload: { enabled },
    };
  }

  /**
   * 透明度更新アクションを作成
   * @param {number} opacity - 透明度 (0-0.9)
   * @returns {Action} アクション
   */
  static updateOpacity(opacity) {
    return {
      type: ActionType.OPACITY_UPDATE,
      payload: { opacity },
    };
  }

  /**
   * タブ登録アクションを作成
   * @param {number} tabId - タブID
   * @param {Object} tabInfo - タブ情報
   * @returns {Action} アクション
   */
  static registerTab(tabId, tabInfo) {
    return {
      type: ActionType.TAB_REGISTER,
      payload: { tabId, tabInfo },
    };
  }

  /**
   * タブ登録解除アクションを作成
   * @param {number} tabId - タブID
   * @returns {Action} アクション
   */
  static unregisterTab(tabId) {
    return {
      type: ActionType.TAB_UNREGISTER,
      payload: { tabId },
    };
  }

  /**
   * タブアクティブ化アクションを作成
   * @param {number} tabId - タブID
   * @returns {Action} アクション
   */
  static activateTab(tabId) {
    return {
      type: ActionType.TAB_ACTIVATE,
      payload: { tabId },
    };
  }

  /**
   * タブ更新アクションを作成
   * @param {number} tabId - タブID
   * @param {Object} updates - 更新内容
   * @returns {Action} アクション
   */
  static updateTab(tabId, updates) {
    return {
      type: ActionType.TAB_UPDATE,
      payload: { tabId, updates },
    };
  }

  /**
   * タブ同期アクションを作成
   * @param {number} tabId - タブID
   * @returns {Action} アクション
   */
  static syncTab(tabId) {
    return {
      type: ActionType.TAB_SYNC,
      payload: { tabId },
    };
  }

  /**
   * 設定読み込みアクションを作成
   * @param {Object} settings - 設定
   * @returns {Action} アクション
   */
  static loadSettings(settings) {
    return {
      type: ActionType.SETTINGS_LOAD,
      payload: { settings },
    };
  }

  /**
   * 設定更新アクションを作成
   * @param {Object} updates - 更新内容
   * @returns {Action} アクション
   */
  static updateSettings(updates) {
    return {
      type: ActionType.SETTINGS_UPDATE,
      payload: { updates },
    };
  }

  /**
   * UI更新アクションを作成
   * @param {Object} updates - 更新内容
   * @returns {Action} アクション
   */
  static updateUI(updates) {
    return {
      type: ActionType.UI_UPDATE,
      payload: { updates },
    };
  }

  /**
   * UIリセットアクションを作成
   * @returns {Action} アクション
   */
  static resetUI() {
    return {
      type: ActionType.UI_RESET,
    };
  }
}

/**
 * 状態管理ストア
 * Flux パターンに基づく一方向データフロー
 */
class StateStore {
  /**
   * StateStoreインスタンスを作成
   * @param {Object} options - オプション
   * @param {Object} [options.initialState] - 初期状態
   * @param {Object} [options.logger] - ロガーインスタンス
   * @param {Object} [options.errorHandler] - エラーハンドラーインスタンス
   */
  constructor(options = {}) {
    this.logger = options.logger;
    this.errorHandler = options.errorHandler;

    // 初期状態を設定
    this.state = options.initialState || this.getInitialState();

    // リスナーとミドルウェアの初期化
    this.listeners = new Set();
    this.middleware = [];

    // アクション処理中フラグ
    this.isDispatching = false;

    // アクション履歴（デバッグ用）
    this.actionHistory = [];
    this.maxHistorySize = 100;

    if (this.logger) {
      this.logger.debug("StateStore initialized", { initialState: this.state });
    }
  }

  /**
   * 初期状態を取得
   * @returns {Object} 初期状態
   */
  getInitialState() {
    return {
      // シアターモード状態
      theaterMode: {
        isEnabled: false,
        opacity: 0.7,
        isInitialized: false,
        lastUpdated: 0,
      },

      // タブ状態
      tabs: {
        activeTabId: null,
        tabStates: new Map(), // tabId -> TabState
        lastSync: 0,
      },

      // UI状態
      ui: {
        popupOpen: false,
        connectionStatus: "disconnected",
        lastError: null,
      },

      // 設定
      settings: {
        opacity: 0.7,
        keyboardShortcut: "t",
        theaterModeEnabled: false,
        version: "1.0.0",
      },
    };
  }

  /**
   * 状態を取得
   * @returns {Object} 現在の状態
   */
  getState() {
    return this.state;
  }

  /**
   * 状態の一部を取得
   * @param {string} path - 状態パス (例: "theaterMode.isEnabled")
   * @param {any} [defaultValue] - デフォルト値
   * @returns {any} 状態値
   */
  getStateValue(path, defaultValue) {
    try {
      const parts = path.split(".");
      let value = this.state;

      for (const part of parts) {
        if (value === undefined || value === null) {
          return defaultValue;
        }
        value = value[part];
      }

      return value !== undefined ? value : defaultValue;
    } catch (error) {
      if (this.logger) {
        this.logger.warn(`Failed to get state value at path: ${path}`, error);
      }
      return defaultValue;
    }
  }

  /**
   * 状態変更を監視
   * @param {Function} listener - 状態変更リスナー
   * @returns {Function} アンサブスクライブ関数
   */
  subscribe(listener) {
    if (typeof listener !== "function") {
      throw new Error("Listener must be a function");
    }

    this.listeners.add(listener);

    // アンサブスクライブ関数を返す
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * 特定のパスの状態変更を監視
   * @param {string} path - 状態パス (例: "theaterMode.isEnabled")
   * @param {Function} listener - 状態変更リスナー
   * @returns {Function} アンサブスクライブ関数
   */
  subscribeToPath(path, listener) {
    if (typeof listener !== "function") {
      throw new Error("Listener must be a function");
    }

    // 現在の値を取得
    let currentValue = this.getStateValue(path);

    // 状態変更を監視し、指定パスの値が変わった場合のみリスナーを呼び出す
    const wrappedListener = (state) => {
      const newValue = this.getStateValue(path);

      // 値が変わった場合のみリスナーを呼び出す
      if (!this._isEqual(currentValue, newValue)) {
        currentValue = newValue;
        listener(newValue, state);
      }
    };

    // 監視を開始
    return this.subscribe(wrappedListener);
  }

  /**
   * ミドルウェアを追加
   * @param {Function} middleware - ミドルウェア関数
   * @returns {StateStore} メソッドチェーン用のthis
   */
  addMiddleware(middleware) {
    if (typeof middleware !== "function") {
      throw new Error("Middleware must be a function");
    }

    this.middleware.push(middleware);
    return this;
  }

  /**
   * アクションをディスパッチ
   * @param {Action} action - アクション
   * @returns {Promise<Result<Object>>} 実行結果
   */
  async dispatch(action) {
    if (!action || !action.type) {
      return Result.failure("Invalid action: Action must have a type", {
        type: ErrorType.VALIDATION_ERROR,
      });
    }

    if (this.isDispatching) {
      return Result.failure("Cannot dispatch action while dispatching", {
        type: ErrorType.INTERNAL_ERROR,
      });
    }

    try {
      this.isDispatching = true;

      if (this.logger) {
        this.logger.debug(`Dispatching action: ${action.type}`, {
          action,
          timestamp: new Date().toISOString(),
        });
      }

      // アクション履歴に追加
      this._addToActionHistory(action);

      // ミドルウェアを適用
      let processedAction = action;
      for (const middleware of this.middleware) {
        processedAction = await middleware(processedAction, this.state);
      }

      // 状態を更新
      const prevState = { ...this.state };
      const nextState = await this._reduce(prevState, processedAction);

      // 状態が変わった場合のみリスナーに通知
      if (!this._isEqual(prevState, nextState)) {
        this.state = nextState;
        this._notifyListeners();
      }

      return Result.success({ prevState, nextState, action: processedAction });
    } catch (error) {
      if (this.logger) {
        this.logger.error(`Error dispatching action: ${action.type}`, error);
      }

      if (this.errorHandler) {
        this.errorHandler.handleError(error, {
          context: { action },
          type: ErrorType.INTERNAL_ERROR,
        });
      }

      return Result.failure(error, {
        type: ErrorType.INTERNAL_ERROR,
        context: { action },
      });
    } finally {
      this.isDispatching = false;
    }
  }

  /**
   * 複数のアクションを順次ディスパッチ
   * @param {Array<Action>} actions - アクション配列
   * @returns {Promise<Result<Array>>} 実行結果
   */
  async batchDispatch(actions) {
    if (!Array.isArray(actions)) {
      return Result.failure("Invalid argument: actions must be an array", {
        type: ErrorType.VALIDATION_ERROR,
      });
    }

    const results = [];

    for (const action of actions) {
      const result = await this.dispatch(action);
      results.push(result);

      // エラーが発生した場合は中断
      if (result.isFailure()) {
        return Result.failure("Batch dispatch failed", {
          type: ErrorType.INTERNAL_ERROR,
          context: { results },
        });
      }
    }

    return Result.success(results);
  }

  /**
   * 状態を直接リセット（デバッグ用）
   * @param {Object} state - 新しい状態
   */
  _resetState(state) {
    this.state = state || this.getInitialState();
    this._notifyListeners();

    if (this.logger) {
      this.logger.debug("State reset", { newState: this.state });
    }
  }

  /**
   * リスナーに通知
   * @private
   */
  _notifyListeners() {
    for (const listener of this.listeners) {
      try {
        listener(this.state);
      } catch (error) {
        if (this.logger) {
          this.logger.warn("Error in state change listener", error);
        }
      }
    }
  }

  /**
   * アクション履歴に追加
   * @param {Action} action - アクション
   * @private
   */
  _addToActionHistory(action) {
    const historyItem = {
      action,
      timestamp: new Date().toISOString(),
    };

    this.actionHistory.push(historyItem);

    // 最大サイズを超えた場合、古いものを削除
    if (this.actionHistory.length > this.maxHistorySize) {
      this.actionHistory.shift();
    }
  }

  /**
   * アクション履歴を取得
   * @param {number} [limit] - 取得する最大数
   * @returns {Array} アクション履歴
   */
  getActionHistory(limit) {
    if (limit && limit > 0) {
      return this.actionHistory.slice(-limit);
    }
    return [...this.actionHistory];
  }

  /**
   * アクション履歴をクリア
   */
  clearActionHistory() {
    this.actionHistory = [];
  }

  /**
   * 状態を更新するリデューサー
   * @param {Object} state - 現在の状態
   * @param {Action} action - アクション
   * @returns {Object} 新しい状態
   * @private
   */
  async _reduce(state, action) {
    // 状態のディープコピーを作成
    const newState = this._deepCopy(state);

    switch (action.type) {
      case ActionType.INITIALIZE:
        return this._handleInitialize(newState, action);

      case ActionType.RESET:
        return this.getInitialState();

      case ActionType.THEATER_MODE_TOGGLE:
        return this._handleTheaterModeToggle(newState);

      case ActionType.THEATER_MODE_SET:
        return this._handleTheaterModeSet(newState, action);

      case ActionType.OPACITY_UPDATE:
        return this._handleOpacityUpdate(newState, action);

      case ActionType.TAB_REGISTER:
        return this._handleTabRegister(newState, action);

      case ActionType.TAB_UNREGISTER:
        return this._handleTabUnregister(newState, action);

      case ActionType.TAB_ACTIVATE:
        return this._handleTabActivate(newState, action);

      case ActionType.TAB_UPDATE:
        return this._handleTabUpdate(newState, action);

      case ActionType.TAB_SYNC:
        return this._handleTabSync(newState, action);

      case ActionType.SETTINGS_LOAD:
        return this._handleSettingsLoad(newState, action);

      case ActionType.SETTINGS_UPDATE:
        return this._handleSettingsUpdate(newState, action);

      case ActionType.UI_UPDATE:
        return this._handleUIUpdate(newState, action);

      case ActionType.UI_RESET:
        return this._handleUIReset(newState);

      default:
        if (this.logger) {
          this.logger.warn(`Unknown action type: ${action.type}`);
        }
        return newState;
    }
  }

  /**
   * 初期化アクションを処理
   * @param {Object} state - 現在の状態
   * @param {Action} action - アクション
   * @returns {Object} 新しい状態
   * @private
   */
  _handleInitialize(state, action) {
    const { payload } = action;

    // 初期化データがある場合は適用
    if (payload) {
      if (payload.settings) {
        state.settings = { ...state.settings, ...payload.settings };
      }

      if (payload.theaterMode) {
        state.theaterMode = { ...state.theaterMode, ...payload.theaterMode };
      }

      if (payload.tabs && payload.tabs.activeTabId) {
        state.tabs.activeTabId = payload.tabs.activeTabId;
      }
    }

    // 初期化フラグを設定
    state.theaterMode.isInitialized = true;
    state.theaterMode.lastUpdated = Date.now();

    return state;
  }

  /**
   * シアターモード切替アクションを処理
   * @param {Object} state - 現在の状態
   * @returns {Object} 新しい状態
   * @private
   */
  _handleTheaterModeToggle(state) {
    // 現在の状態を反転
    const isEnabled = !state.theaterMode.isEnabled;

    // シアターモード状態を更新
    state.theaterMode.isEnabled = isEnabled;
    state.theaterMode.lastUpdated = Date.now();

    // 設定も更新
    state.settings.theaterModeEnabled = isEnabled;

    return state;
  }

  /**
   * シアターモード設定アクションを処理
   * @param {Object} state - 現在の状態
   * @param {Action} action - アクション
   * @returns {Object} 新しい状態
   * @private
   */
  _handleTheaterModeSet(state, action) {
    const { enabled } = action.payload;

    // シアターモード状態を更新
    state.theaterMode.isEnabled = enabled;
    state.theaterMode.lastUpdated = Date.now();

    // 設定も更新
    state.settings.theaterModeEnabled = enabled;

    return state;
  }

  /**
   * 透明度更新アクションを処理
   * @param {Object} state - 現在の状態
   * @param {Action} action - アクション
   * @returns {Object} 新しい状態
   * @private
   */
  _handleOpacityUpdate(state, action) {
    const { opacity } = action.payload;

    // 値の範囲を確認
    const validOpacity = Math.max(0, Math.min(0.9, opacity));

    // シアターモード状態を更新
    state.theaterMode.opacity = validOpacity;
    state.theaterMode.lastUpdated = Date.now();

    // 設定も更新
    state.settings.opacity = validOpacity;

    return state;
  }

  /**
   * タブ登録アクションを処理
   * @param {Object} state - 現在の状態
   * @param {Action} action - アクション
   * @returns {Object} 新しい状態
   * @private
   */
  _handleTabRegister(state, action) {
    const { tabId, tabInfo } = action.payload;

    // タブ状態を作成
    const tabState = {
      url: tabInfo.url,
      title: tabInfo.title || "",
      theaterModeEnabled: state.settings.theaterModeEnabled,
      opacity: state.settings.opacity,
      lastSync: Date.now(),
      isActive: state.tabs.activeTabId === tabId,
    };

    // タブ状態を保存
    state.tabs.tabStates.set(tabId, tabState);

    // アクティブタブが設定されていない場合は、このタブをアクティブに
    if (!state.tabs.activeTabId) {
      state.tabs.activeTabId = tabId;
    }

    return state;
  }

  /**
   * タブ登録解除アクションを処理
   * @param {Object} state - 現在の状態
   * @param {Action} action - アクション
   * @returns {Object} 新しい状態
   * @private
   */
  _handleTabUnregister(state, action) {
    const { tabId } = action.payload;

    // タブ状態を削除
    state.tabs.tabStates.delete(tabId);

    // アクティブタブが削除された場合
    if (state.tabs.activeTabId === tabId) {
      state.tabs.activeTabId = null;

      // 他のYouTubeタブがあれば、最初のものをアクティブにする
      if (state.tabs.tabStates.size > 0) {
        state.tabs.activeTabId = Array.from(state.tabs.tabStates.keys())[0];
      }
    }

    return state;
  }

  /**
   * タブアクティブ化アクションを処理
   * @param {Object} state - 現在の状態
   * @param {Action} action - アクション
   * @returns {Object} 新しい状態
   * @private
   */
  _handleTabActivate(state, action) {
    const { tabId } = action.payload;
    const previousActiveTabId = state.tabs.activeTabId;

    // アクティブタブを更新
    state.tabs.activeTabId = tabId;

    // 以前のアクティブタブの状態を更新
    if (previousActiveTabId && state.tabs.tabStates.has(previousActiveTabId)) {
      const prevTabState = state.tabs.tabStates.get(previousActiveTabId);
      prevTabState.isActive = false;
      state.tabs.tabStates.set(previousActiveTabId, prevTabState);
    }

    // 新しいアクティブタブの状態を更新
    if (state.tabs.tabStates.has(tabId)) {
      const tabState = state.tabs.tabStates.get(tabId);
      tabState.isActive = true;
      tabState.lastSync = Date.now();
      state.tabs.tabStates.set(tabId, tabState);
    }

    return state;
  }

  /**
   * タブ更新アクションを処理
   * @param {Object} state - 現在の状態
   * @param {Action} action - アクション
   * @returns {Object} 新しい状態
   * @private
   */
  _handleTabUpdate(state, action) {
    const { tabId, updates } = action.payload;

    // タブが存在しない場合
    if (!state.tabs.tabStates.has(tabId)) {
      return state;
    }

    // タブ状態を更新
    const tabState = state.tabs.tabStates.get(tabId);
    const updatedTabState = { ...tabState, ...updates, lastSync: Date.now() };
    state.tabs.tabStates.set(tabId, updatedTabState);

    // シアターモードの状態が変更された場合は設定も更新
    if (updates.theaterModeEnabled !== undefined) {
      state.settings.theaterModeEnabled = updates.theaterModeEnabled;
      state.theaterMode.isEnabled = updates.theaterModeEnabled;
      state.theaterMode.lastUpdated = Date.now();
    }

    // 透明度が変更された場合は設定も更新
    if (updates.opacity !== undefined) {
      state.settings.opacity = updates.opacity;
      state.theaterMode.opacity = updates.opacity;
      state.theaterMode.lastUpdated = Date.now();
    }

    return state;
  }

  /**
   * タブ同期アクションを処理
   * @param {Object} state - 現在の状態
   * @param {Action} action - アクション
   * @returns {Object} 新しい状態
   * @private
   */
  _handleTabSync(state, action) {
    const { tabId } = action.payload;

    // タブが存在しない場合
    if (!state.tabs.tabStates.has(tabId)) {
      return state;
    }

    // タブ状態を更新
    const tabState = state.tabs.tabStates.get(tabId);
    const updatedTabState = {
      ...tabState,
      theaterModeEnabled: state.settings.theaterModeEnabled,
      opacity: state.settings.opacity,
      lastSync: Date.now(),
    };

    state.tabs.tabStates.set(tabId, updatedTabState);
    state.tabs.lastSync = Date.now();

    return state;
  }

  /**
   * 設定読み込みアクションを処理
   * @param {Object} state - 現在の状態
   * @param {Action} action - アクション
   * @returns {Object} 新しい状態
   * @private
   */
  _handleSettingsLoad(state, action) {
    const { settings } = action.payload;

    // 設定を更新
    state.settings = { ...state.settings, ...settings };

    // シアターモード状態も更新
    if (settings.theaterModeEnabled !== undefined) {
      state.theaterMode.isEnabled = settings.theaterModeEnabled;
    }

    if (settings.opacity !== undefined) {
      state.theaterMode.opacity = settings.opacity;
    }

    state.theaterMode.lastUpdated = Date.now();

    return state;
  }

  /**
   * 設定更新アクションを処理
   * @param {Object} state - 現在の状態
   * @param {Action} action - アクション
   * @returns {Object} 新しい状態
   * @private
   */
  _handleSettingsUpdate(state, action) {
    const { updates } = action.payload;

    // 設定を更新
    state.settings = { ...state.settings, ...updates };

    // シアターモード状態も更新
    if (updates.theaterModeEnabled !== undefined) {
      state.theaterMode.isEnabled = updates.theaterModeEnabled;
    }

    if (updates.opacity !== undefined) {
      state.theaterMode.opacity = updates.opacity;
    }

    state.theaterMode.lastUpdated = Date.now();

    return state;
  }

  /**
   * UI更新アクションを処理
   * @param {Object} state - 現在の状態
   * @param {Action} action - アクション
   * @returns {Object} 新しい状態
   * @private
   */
  _handleUIUpdate(state, action) {
    const { updates } = action.payload;

    // UI状態を更新
    state.ui = { ...state.ui, ...updates };

    return state;
  }

  /**
   * UIリセットアクションを処理
   * @param {Object} state - 現在の状態
   * @returns {Object} 新しい状態
   * @private
   */
  _handleUIReset(state) {
    // UI状態をリセット
    state.ui = {
      popupOpen: false,
      connectionStatus: "disconnected",
      lastError: null,
    };

    return state;
  }

  /**
   * オブジェクトのディープコピーを作成
   * @param {Object} obj - コピー対象オブジェクト
   * @returns {Object} コピーされたオブジェクト
   * @private
   */
  _deepCopy(obj) {
    if (obj === null || typeof obj !== "object") {
      return obj;
    }

    // 日付オブジェクトの場合
    if (obj instanceof Date) {
      return new Date(obj);
    }

    // 配列の場合
    if (Array.isArray(obj)) {
      return obj.map((item) => this._deepCopy(item));
    }

    // Mapの場合
    if (obj instanceof Map) {
      const copy = new Map();
      obj.forEach((value, key) => {
        copy.set(key, this._deepCopy(value));
      });
      return copy;
    }

    // Setの場合
    if (obj instanceof Set) {
      const copy = new Set();
      obj.forEach((value) => {
        copy.add(this._deepCopy(value));
      });
      return copy;
    }

    // 通常のオブジェクトの場合
    const copy = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        copy[key] = this._deepCopy(obj[key]);
      }
    }
    return copy;
  }

  /**
   * 2つの値が等しいかどうかを判定
   * @param {any} a - 比較対象1
   * @param {any} b - 比較対象2
   * @returns {boolean} 等しいかどうか
   * @private
   */
  _isEqual(a, b) {
    // 基本型の比較
    if (a === b) return true;

    // どちらかがnullまたはundefinedの場合
    if (a == null || b == null) return false;

    // 型が異なる場合
    if (typeof a !== typeof b) return false;

    // 日付オブジェクトの比較
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() === b.getTime();
    }

    // 配列の比較
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (!this._isEqual(a[i], b[i])) return false;
      }
      return true;
    }

    // Mapの比較
    if (a instanceof Map && b instanceof Map) {
      if (a.size !== b.size) return false;
      for (const [key, value] of a.entries()) {
        if (!b.has(key) || !this._isEqual(value, b.get(key))) return false;
      }
      return true;
    }

    // Setの比較
    if (a instanceof Set && b instanceof Set) {
      if (a.size !== b.size) return false;
      for (const value of a) {
        if (!b.has(value)) return false;
      }
      return true;
    }

    // オブジェクトの比較
    if (typeof a === "object" && typeof b === "object") {
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);

      if (keysA.length !== keysB.length) return false;

      for (const key of keysA) {
        if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
        if (!this._isEqual(a[key], b[key])) return false;
      }

      return true;
    }

    return false;
  }
}

// CommonJS/ES6 両対応のエクスポート
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    ActionType,
    ActionCreator,
    StateStore,
  };
} else if (typeof window !== "undefined") {
  window.ActionType = ActionType;
  window.ActionCreator = ActionCreator;
  window.StateStore = StateStore;
}
