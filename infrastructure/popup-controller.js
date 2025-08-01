/**
 * PopupController
 * ポップアップUIの制御を専門とするクラス
 * MVCパターンに基づく構造化されたUI管理を実装
 */

// 依存関係のインポート
let Logger,
  ErrorHandler,
  Result,
  AppError,
  ErrorType,
  StateStore,
  ActionCreator,
  MessageBus,
  MessageType;

// Node.js環境での依存関係の解決
if (typeof require !== "undefined") {
  ({ Logger } = require("./logger.js"));
  ({
    ErrorHandler,
    Result,
    AppError,
    ErrorType,
  } = require("./error-handler.js"));
  ({ StateStore, ActionCreator } = require("./state-store.js"));
  ({ MessageBus, MessageType } = require("./message-bus.js"));
}

/**
 * ポップアップUIの状態
 * @typedef {Object} PopupUIState
 * @property {boolean} isInitialized - 初期化完了フラグ
 * @property {boolean} isConnected - バックグラウンドとの接続状態
 * @property {string} connectionStatus - 接続状態の詳細
 * @property {Object|null} lastError - 最後に発生したエラー
 * @property {boolean} isLoading - ローディング状態
 */

/**
 * UI要素の参照
 * @typedef {Object} UIElements
 * @property {HTMLInputElement} theaterModeToggle - シアターモード切替スイッチ
 * @property {HTMLInputElement} opacitySlider - 透明度スライダー
 * @property {HTMLElement} opacityValue - 透明度表示
 * @property {HTMLSelectElement} shortcutKey - ショートカットキー選択
 * @property {HTMLButtonElement} resetOpacityBtn - 透明度リセットボタン
 * @property {HTMLElement} statusIndicator - ステータスインジケーター
 * @property {HTMLElement} statusText - ステータステキスト
 * @property {HTMLElement} previewOverlay - プレビューオーバーレイ
 * @property {HTMLElement} shortcutKeyDisplay - ショートカット表示
 * @property {HTMLElement} connectionStatus - 接続状態表示
 * @property {HTMLElement} opacityFeedback - 透明度フィードバック
 */

/**
 * PopupController
 * ポップアップUIの制御を専門とするクラス
 */
class PopupController {
  /**
   * PopupControllerインスタンスを作成
   * @param {Object} dependencies - 依存関係
   * @param {StateStore} dependencies.stateStore - 状態管理ストア
   * @param {MessageBus} dependencies.messageBus - メッセージバス
   * @param {Logger} [dependencies.logger] - ロガーインスタンス
   * @param {ErrorHandler} [dependencies.errorHandler] - エラーハンドラーインスタンス
   */
  constructor(dependencies) {
    this.stateStore = dependencies.stateStore;
    this.messageBus = dependencies.messageBus;
    this.logger = dependencies.logger;
    this.errorHandler = dependencies.errorHandler;

    // UI状態
    this.uiState = {
      isInitialized: false,
      isConnected: false,
      connectionStatus: "disconnected",
      lastError: null,
      isLoading: false,
    };

    // UI要素の参照
    this.elements = {};

    // イベントリスナーの参照（クリーンアップ用）
    this.eventListeners = new Map();

    // 状態変更の監視を解除する関数
    this.unsubscribeFromState = null;

    // デバウンス用のタイマー
    this.debounceTimers = new Map();

    if (this.logger) {
      this.logger.debug("PopupController initialized");
    }
  }

  /**
   * ポップアップUIを初期化
   * @returns {Promise<Result<void>>} 初期化結果
   */
  async initialize() {
    try {
      if (this.logger) {
        this.logger.info("Initializing PopupController");
      }

      // UI要素の参照を取得
      const elementsResult = this._getUIElements();
      if (elementsResult.isFailure()) {
        return elementsResult;
      }

      // イベントリスナーを設定
      this._setupEventListeners();

      // 状態変更の監視を開始
      this._subscribeToStateChanges();

      // メッセージハンドラーを登録
      this._registerMessageHandlers();

      // 初期状態を読み込み
      await this._loadInitialState();

      // 接続状態を確認
      await this._checkConnectionStatus();

      // 初期化完了
      this.uiState.isInitialized = true;

      if (this.logger) {
        this.logger.info("PopupController initialization completed");
      }

      return Result.success();
    } catch (error) {
      const appError = new AppError("Failed to initialize PopupController", {
        type: ErrorType.INITIALIZATION_ERROR,
        cause: error,
      });

      if (this.errorHandler) {
        this.errorHandler.handleError(appError);
      }

      return Result.failure(appError);
    }
  }

  /**
   * ポップアップUIを破棄
   * @returns {Promise<Result<void>>} 破棄結果
   */
  async dispose() {
    try {
      if (this.logger) {
        this.logger.info("Disposing PopupController");
      }

      // イベントリスナーを削除
      this._removeEventListeners();

      // 状態変更の監視を停止
      if (this.unsubscribeFromState) {
        this.unsubscribeFromState();
        this.unsubscribeFromState = null;
      }

      // デバウンスタイマーをクリア
      for (const timer of this.debounceTimers.values()) {
        clearTimeout(timer);
      }
      this.debounceTimers.clear();

      // UI状態をリセット
      this.uiState.isInitialized = false;

      return Result.success();
    } catch (error) {
      const appError = new AppError("Failed to dispose PopupController", {
        type: ErrorType.INTERNAL_ERROR,
        cause: error,
      });

      if (this.errorHandler) {
        this.errorHandler.handleError(appError);
      }

      return Result.failure(appError);
    }
  }

  /**
   * シアターモードを切り替え
   * @returns {Promise<Result<boolean>>} 切り替え結果
   */
  async toggleTheaterMode() {
    if (!this.uiState.isInitialized) {
      return Result.failure("PopupController not initialized", {
        type: ErrorType.INITIALIZATION_ERROR,
      });
    }

    try {
      if (this.logger) {
        this.logger.debug("Toggling theater mode");
      }

      // ローディング状態を設定
      this._setLoadingState(true);

      // StateStoreにアクションをディスパッチ
      const action = ActionCreator.toggleTheaterMode();
      const dispatchResult = await this.stateStore.dispatch(action);

      if (dispatchResult.isFailure()) {
        this._setLoadingState(false);
        return dispatchResult;
      }

      // バックグラウンドにメッセージを送信
      const messageResult = await this.messageBus.send(
        MessageType.THEATER_MODE_TOGGLE,
        {},
        { needsResponse: true, timeout: 3000 }
      );

      this._setLoadingState(false);

      if (messageResult.isFailure()) {
        // 状態を元に戻す
        await this.stateStore.dispatch(ActionCreator.toggleTheaterMode());
        return messageResult;
      }

      const newState = this.stateStore.getState().theaterMode.isEnabled;

      if (this.logger) {
        this.logger.info(
          `Theater mode toggled: ${newState ? "enabled" : "disabled"}`
        );
      }

      return Result.success(newState);
    } catch (error) {
      this._setLoadingState(false);
      const appError = new AppError("Failed to toggle theater mode", {
        type: ErrorType.INTERNAL_ERROR,
        cause: error,
      });

      if (this.errorHandler) {
        this.errorHandler.handleError(appError);
      }

      return Result.failure(appError);
    }
  }

  /**
   * 透明度を更新
   * @param {number} opacity - 新しい透明度 (0-0.9)
   * @returns {Promise<Result<void>>} 更新結果
   */
  async updateOpacity(opacity) {
    if (!this.uiState.isInitialized) {
      return Result.failure("PopupController not initialized", {
        type: ErrorType.INITIALIZATION_ERROR,
      });
    }

    try {
      // 値の検証
      const validOpacity = Math.max(0, Math.min(0.9, opacity));
      const roundedOpacity = Math.round(validOpacity * 20) / 20; // 5%単位に丸める

      if (this.logger) {
        this.logger.debug(`Updating opacity to ${roundedOpacity}`);
      }

      // StateStoreにアクションをディスパッチ
      const action = ActionCreator.updateOpacity(roundedOpacity);
      const dispatchResult = await this.stateStore.dispatch(action);

      if (dispatchResult.isFailure()) {
        return dispatchResult;
      }

      // バックグラウンドにメッセージを送信
      const messageResult = await this.messageBus.send(
        MessageType.OPACITY_CHANGE,
        { value: roundedOpacity },
        { needsResponse: false }
      );

      if (messageResult.isFailure()) {
        if (this.logger) {
          this.logger.warn(
            "Failed to send opacity change message",
            messageResult.error
          );
        }
      }

      return Result.success();
    } catch (error) {
      const appError = new AppError("Failed to update opacity", {
        type: ErrorType.INTERNAL_ERROR,
        cause: error,
      });

      if (this.errorHandler) {
        this.errorHandler.handleError(appError);
      }

      return Result.failure(appError);
    }
  }

  /**
   * ショートカットキーを更新
   * @param {string} shortcut - 新しいショートカットキー
   * @returns {Promise<Result<void>>} 更新結果
   */
  async updateShortcut(shortcut) {
    if (!this.uiState.isInitialized) {
      return Result.failure("PopupController not initialized", {
        type: ErrorType.INITIALIZATION_ERROR,
      });
    }

    try {
      if (this.logger) {
        this.logger.debug(`Updating shortcut to ${shortcut}`);
      }

      // StateStoreにアクションをディスパッチ
      const action = ActionCreator.updateSettings({
        keyboardShortcut: shortcut,
      });
      const dispatchResult = await this.stateStore.dispatch(action);

      if (dispatchResult.isFailure()) {
        return dispatchResult;
      }

      // バックグラウンドにメッセージを送信
      const messageResult = await this.messageBus.send(
        MessageType.SETTINGS_SET,
        { key: "keyboardShortcut", value: shortcut },
        { needsResponse: false }
      );

      if (messageResult.isFailure()) {
        if (this.logger) {
          this.logger.warn(
            "Failed to send shortcut change message",
            messageResult.error
          );
        }
      }

      return Result.success();
    } catch (error) {
      const appError = new AppError("Failed to update shortcut", {
        type: ErrorType.INTERNAL_ERROR,
        cause: error,
      });

      if (this.errorHandler) {
        this.errorHandler.handleError(appError);
      }

      return Result.failure(appError);
    }
  }

  /**
   * 透明度をデフォルト値にリセット
   * @returns {Promise<Result<void>>} リセット結果
   */
  async resetOpacityToDefault() {
    const defaultOpacity = 0.7;
    const result = await this.updateOpacity(defaultOpacity);

    if (result.isSuccess()) {
      // フィードバックメッセージを表示
      this._showFeedbackMessage("デフォルト透明度に戻しました", 2000);
    }

    return result;
  }

  /**
   * UI要素の参照を取得
   * @returns {Result<UIElements>} UI要素の参照
   * @private
   */
  _getUIElements() {
    try {
      const elements = {
        theaterModeToggle: document.getElementById("theaterModeToggle"),
        opacitySlider: document.getElementById("opacitySlider"),
        opacityValue: document.getElementById("opacityValue"),
        shortcutKey: document.getElementById("shortcutKey"),
        resetOpacityBtn: document.getElementById("resetOpacityBtn"),
        statusIndicator: document.getElementById("statusIndicator"),
        statusText: document.getElementById("statusText"),
        previewOverlay: document.getElementById("previewOverlay"),
        shortcutKeyDisplay: document.getElementById("shortcutKeyDisplay"),
        connectionStatus: document.getElementById("connectionStatus"),
        opacityFeedback: document.getElementById("opacityFeedback"),
      };

      // 必須要素の存在確認
      const requiredElements = [
        "theaterModeToggle",
        "opacitySlider",
        "opacityValue",
        "shortcutKey",
        "statusIndicator",
        "statusText",
        "connectionStatus",
      ];

      for (const elementName of requiredElements) {
        if (!elements[elementName]) {
          return Result.failure(
            `Required UI element not found: ${elementName}`,
            {
              type: ErrorType.ELEMENT_NOT_FOUND,
              context: { elementName },
            }
          );
        }
      }

      this.elements = elements;
      return Result.success(elements);
    } catch (error) {
      return Result.failure("Failed to get UI elements", {
        type: ErrorType.ELEMENT_NOT_FOUND,
        cause: error,
      });
    }
  }

  /**
   * イベントリスナーを設定
   * @private
   */
  _setupEventListeners() {
    // シアターモード切替
    this._addEventListener(
      this.elements.theaterModeToggle,
      "change",
      this._handleTheaterModeToggle.bind(this)
    );

    // 透明度変更（デバウンス付き）
    this._addEventListener(
      this.elements.opacitySlider,
      "input",
      this._debounce(this._handleOpacityChange.bind(this), 300)
    );

    // ショートカットキー変更
    this._addEventListener(
      this.elements.shortcutKey,
      "change",
      this._handleShortcutChange.bind(this)
    );

    // 透明度リセットボタン
    if (this.elements.resetOpacityBtn) {
      this._addEventListener(
        this.elements.resetOpacityBtn,
        "click",
        this._handleOpacityReset.bind(this)
      );
    }
  }

  /**
   * イベントリスナーを追加（クリーンアップ用に記録）
   * @param {HTMLElement} element - 対象要素
   * @param {string} event - イベント名
   * @param {Function} handler - ハンドラー関数
   * @private
   */
  _addEventListener(element, event, handler) {
    if (!element) return;

    element.addEventListener(event, handler);

    // クリーンアップ用に記録
    const key = `${element.id || element.tagName}_${event}`;
    this.eventListeners.set(key, { element, event, handler });
  }

  /**
   * イベントリスナーを削除
   * @private
   */
  _removeEventListeners() {
    for (const { element, event, handler } of this.eventListeners.values()) {
      element.removeEventListener(event, handler);
    }
    this.eventListeners.clear();
  }

  /**
   * 状態変更の監視を開始
   * @private
   */
  _subscribeToStateChanges() {
    this.unsubscribeFromState = this.stateStore.subscribe((state) => {
      this._updateUIFromState(state);
    });
  }

  /**
   * メッセージハンドラーを登録
   * @private
   */
  _registerMessageHandlers() {
    // UI更新メッセージのハンドラー
    this.messageBus.registerHandler(MessageType.UI_UPDATE, (message) => {
      this._handleUIUpdateMessage(message);
    });

    // システムエラーメッセージのハンドラー
    this.messageBus.registerHandler(MessageType.SYSTEM_ERROR, (message) => {
      this._handleSystemErrorMessage(message);
    });
  }

  /**
   * 初期状態を読み込み
   * @returns {Promise<void>}
   * @private
   */
  async _loadInitialState() {
    try {
      // バックグラウンドから設定を取得
      const settingsResult = await this.messageBus.send(
        MessageType.SETTINGS_GET,
        {},
        { needsResponse: true, timeout: 3000 }
      );

      if (settingsResult.isSuccess()) {
        const settings = settingsResult.data;
        const action = ActionCreator.loadSettings(settings);
        await this.stateStore.dispatch(action);
      } else {
        if (this.logger) {
          this.logger.warn(
            "Failed to load initial settings",
            settingsResult.error
          );
        }
      }
    } catch (error) {
      if (this.logger) {
        this.logger.warn("Error loading initial state", error);
      }
    }
  }

  /**
   * 接続状態を確認
   * @returns {Promise<void>}
   * @private
   */
  async _checkConnectionStatus() {
    try {
      // アクティブタブがYouTubeかどうかを確認
      if (typeof chrome !== "undefined" && chrome.tabs) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0] && tabs[0].url && tabs[0].url.includes("youtube.com")) {
            this._updateConnectionStatus("connected", "接続済み");
          } else {
            this._updateConnectionStatus(
              "disconnected",
              "未接続 (YouTubeで開いてください)"
            );
          }
        });
      } else {
        this._updateConnectionStatus("unknown", "接続状態不明");
      }
    } catch (error) {
      this._updateConnectionStatus("error", "接続エラー");
      if (this.logger) {
        this.logger.warn("Error checking connection status", error);
      }
    }
  }

  /**
   * 状態に基づいてUIを更新
   * @param {Object} state - アプリケーション状態
   * @private
   */
  _updateUIFromState(state) {
    try {
      // シアターモード状態を更新
      if (this.elements.theaterModeToggle) {
        this.elements.theaterModeToggle.checked = state.theaterMode.isEnabled;
      }

      // ステータスインジケーターを更新
      this._updateStatusIndicator(state.theaterMode.isEnabled);

      // 透明度を更新
      this._updateOpacityDisplay(state.theaterMode.opacity);
      this._updateOpacityPreview(state.theaterMode.opacity);

      // ショートカットキーを更新
      if (this.elements.shortcutKey) {
        this.elements.shortcutKey.value = state.settings.keyboardShortcut;
      }
      this._updateShortcutDisplay(state.settings.keyboardShortcut);
    } catch (error) {
      if (this.logger) {
        this.logger.warn("Error updating UI from state", error);
      }
    }
  }

  /**
   * ステータスインジケーターを更新
   * @param {boolean} isEnabled - シアターモードが有効かどうか
   * @private
   */
  _updateStatusIndicator(isEnabled) {
    if (!this.elements.statusIndicator || !this.elements.statusText) return;

    if (isEnabled) {
      this.elements.statusIndicator.classList.add("active");
      this.elements.statusIndicator.classList.remove("inactive");
      this.elements.statusText.textContent = "有効";
    } else {
      this.elements.statusIndicator.classList.add("inactive");
      this.elements.statusIndicator.classList.remove("active");
      this.elements.statusText.textContent = "無効";
    }
  }

  /**
   * 透明度表示を更新
   * @param {number} opacity - 透明度
   * @private
   */
  _updateOpacityDisplay(opacity) {
    if (!this.elements.opacityValue || !this.elements.opacitySlider) return;

    const percentage = Math.round(opacity * 100);
    this.elements.opacityValue.textContent = `${percentage}%`;

    if (this.elements.opacitySlider.value != opacity) {
      this.elements.opacitySlider.value = opacity;
    }
  }

  /**
   * 透明度プレビューを更新
   * @param {number} opacity - 透明度
   * @private
   */
  _updateOpacityPreview(opacity) {
    if (!this.elements.previewOverlay) return;

    const invertedOpacity = 1 - opacity;
    this.elements.previewOverlay.style.backgroundColor = `rgba(0, 0, 0, ${invertedOpacity})`;
  }

  /**
   * ショートカット表示を更新
   * @param {string} shortcut - ショートカットキー
   * @private
   */
  _updateShortcutDisplay(shortcut) {
    if (!this.elements.shortcutKeyDisplay) return;

    let displayText = shortcut.toUpperCase();
    if (shortcut === "space") {
      displayText = "スペース";
    }

    this.elements.shortcutKeyDisplay.textContent = displayText;
  }

  /**
   * 接続状態を更新
   * @param {string} status - 接続状態
   * @param {string} text - 表示テキスト
   * @private
   */
  _updateConnectionStatus(status, text) {
    if (!this.elements.connectionStatus) return;

    this.elements.connectionStatus.textContent = text;
    this.elements.connectionStatus.className = status;

    this.uiState.connectionStatus = status;
    this.uiState.isConnected = status === "connected";
  }

  /**
   * ローディング状態を設定
   * @param {boolean} isLoading - ローディング状態
   * @private
   */
  _setLoadingState(isLoading) {
    this.uiState.isLoading = isLoading;

    // UI要素の無効化/有効化
    const elements = [
      this.elements.theaterModeToggle,
      this.elements.opacitySlider,
      this.elements.shortcutKey,
      this.elements.resetOpacityBtn,
    ];

    for (const element of elements) {
      if (element) {
        element.disabled = isLoading;
      }
    }
  }

  /**
   * フィードバックメッセージを表示
   * @param {string} message - メッセージ
   * @param {number} [duration=2000] - 表示時間（ミリ秒）
   * @private
   */
  _showFeedbackMessage(message, duration = 2000) {
    if (!this.elements.opacityFeedback) return;

    this.elements.opacityFeedback.textContent = message;
    this.elements.opacityFeedback.style.display = "block";

    setTimeout(() => {
      if (this.elements.opacityFeedback) {
        this.elements.opacityFeedback.style.display = "none";
      }
    }, duration);
  }

  /**
   * デバウンス関数
   * @param {Function} func - デバウンス対象の関数
   * @param {number} delay - 遅延時間（ミリ秒）
   * @returns {Function} デバウンスされた関数
   * @private
   */
  _debounce(func, delay) {
    return (...args) => {
      const key = func.name || "anonymous";

      if (this.debounceTimers.has(key)) {
        clearTimeout(this.debounceTimers.get(key));
      }

      const timer = setTimeout(() => {
        func.apply(this, args);
        this.debounceTimers.delete(key);
      }, delay);

      this.debounceTimers.set(key, timer);
    };
  }

  // イベントハンドラー

  /**
   * シアターモード切替ハンドラー
   * @param {Event} event - イベントオブジェクト
   * @private
   */
  async _handleTheaterModeToggle(event) {
    const result = await this.toggleTheaterMode();

    if (result.isFailure()) {
      // エラーが発生した場合は元の状態に戻す
      event.target.checked = !event.target.checked;
      this._showFeedbackMessage("シアターモードの切り替えに失敗しました", 3000);
    }
  }

  /**
   * 透明度変更ハンドラー
   * @param {Event} event - イベントオブジェクト
   * @private
   */
  async _handleOpacityChange(event) {
    const opacity = parseFloat(event.target.value);
    const result = await this.updateOpacity(opacity);

    if (result.isFailure()) {
      this._showFeedbackMessage("透明度の変更に失敗しました", 3000);
    }
  }

  /**
   * ショートカットキー変更ハンドラー
   * @param {Event} event - イベントオブジェクト
   * @private
   */
  async _handleShortcutChange(event) {
    const shortcut = event.target.value;
    const result = await this.updateShortcut(shortcut);

    if (result.isFailure()) {
      this._showFeedbackMessage("ショートカットキーの変更に失敗しました", 3000);
    }
  }

  /**
   * 透明度リセットハンドラー
   * @param {Event} event - イベントオブジェクト
   * @private
   */
  async _handleOpacityReset(event) {
    event.preventDefault();
    await this.resetOpacityToDefault();
  }

  /**
   * UI更新メッセージハンドラー
   * @param {Message} message - メッセージオブジェクト
   * @private
   */
  _handleUIUpdateMessage(message) {
    try {
      const { updates } = message.data;

      if (updates.connectionStatus) {
        this._updateConnectionStatus(
          updates.connectionStatus.status,
          updates.connectionStatus.text
        );
      }

      if (updates.error) {
        this.uiState.lastError = updates.error;
        this._showFeedbackMessage(
          updates.error.message || "エラーが発生しました",
          3000
        );
      }
    } catch (error) {
      if (this.logger) {
        this.logger.warn("Error handling UI update message", error);
      }
    }
  }

  /**
   * システムエラーメッセージハンドラー
   * @param {Message} message - メッセージオブジェクト
   * @private
   */
  _handleSystemErrorMessage(message) {
    try {
      const { error } = message.data;
      this.uiState.lastError = error;

      // ユーザーフレンドリーなエラーメッセージを表示
      let userMessage = "エラーが発生しました";
      if (this.errorHandler) {
        userMessage = this.errorHandler.getUserMessage(error);
      }

      this._showFeedbackMessage(userMessage, 5000);
      this._updateConnectionStatus("error", "通信エラー");
    } catch (error) {
      if (this.logger) {
        this.logger.warn("Error handling system error message", error);
      }
    }
  }
}

// CommonJS/ES6 両対応のエクスポート
if (typeof module !== "undefined" && module.exports) {
  module.exports = { PopupController };
} else if (typeof window !== "undefined") {
  window.PopupController = PopupController;
}
