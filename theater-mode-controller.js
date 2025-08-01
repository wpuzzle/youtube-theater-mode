/**
 * TheaterModeController クラス
 * シアターモード制御の中核機能を提供
 * 単一責任の原則に基づく設計と依存性注入による疎結合設計
 */
class TheaterModeController {
  /**
   * TheaterModeControllerインスタンスを作成
   * @param {Object} dependencies - 依存オブジェクト
   * @param {ElementManager} dependencies.elementManager - 要素管理クラス
   * @param {OverlayManager} dependencies.overlayManager - オーバーレイ管理クラス
   * @param {StateStore} dependencies.stateStore - 状態管理クラス
   * @param {Object} dependencies.logger - ロガーインスタンス
   * @param {Object} dependencies.errorHandler - エラーハンドラーインスタンス
   */
  constructor(dependencies) {
    // 依存性の注入
    this.elementManager = dependencies.elementManager;
    this.overlayManager = dependencies.overlayManager;
    this.stateStore = dependencies.stateStore;
    this.logger = dependencies.logger;
    this.errorHandler = dependencies.errorHandler;

    // 状態の初期化
    this.initialized = false;
    this.unsubscribeStateStore = null;

    this.logger.debug("TheaterModeController created");
  }

  /**
   * コントローラーを初期化
   * @returns {Promise<Result<boolean>>} 初期化結果
   */
  async initialize() {
    return this.errorHandler.wrapAsync(async () => {
      this.logger.info("TheaterModeController initializing");

      // 状態ストアの変更を監視
      this.unsubscribeStateStore = this.stateStore.subscribeToPath(
        "theaterMode",
        (theaterModeState) => this._handleStateChange(theaterModeState)
      );

      // 現在の状態を取得
      const state = this.stateStore.getState();
      const isEnabled = state.theaterMode.isEnabled;
      const opacity = state.theaterMode.opacity;

      // YouTube動画プレーヤーを検出
      const playerResult = await this.elementManager.detectVideoPlayer();
      if (playerResult.isFailure() || !playerResult.data) {
        this.logger.warn("Video player detection failed");
        return false;
      }

      // 初期状態に応じてシアターモードを適用
      if (isEnabled) {
        await this._applyTheaterMode();
      }

      // 透明度を設定
      this.overlayManager.updateOpacity(opacity);

      this.initialized = true;
      this.logger.info("TheaterModeController initialized", {
        isEnabled,
        opacity,
      });

      return true;
    });
  }

  /**
   * 状態変更を処理
   * @param {Object} theaterModeState - シアターモード状態
   * @private
   */
  _handleStateChange(theaterModeState) {
    if (!this.initialized) return;

    this.logger.debug("TheaterMode state changed", { theaterModeState });

    // シアターモードの有効/無効を処理
    if (theaterModeState.isEnabled !== this.overlayManager.isOverlayActive()) {
      if (theaterModeState.isEnabled) {
        this._applyTheaterMode();
      } else {
        this._removeTheaterMode();
      }
    }

    // 透明度の変更を処理
    if (theaterModeState.opacity !== this.overlayManager.getOpacity()) {
      this.overlayManager.updateOpacity(theaterModeState.opacity);
    }
  }

  /**
   * シアターモードを切り替え
   * @returns {Promise<Result<boolean>>} 切り替え後の状態
   */
  async toggle() {
    return this.errorHandler.wrapAsync(async () => {
      const currentState = this.stateStore.getStateValue(
        "theaterMode.isEnabled",
        false
      );
      const action = ActionCreator.toggleTheaterMode();
      const result = await this.stateStore.dispatch(action);

      if (result.isFailure()) {
        this.logger.error("Failed to toggle theater mode", result.error);
        return currentState;
      }

      const newState = !currentState;
      this.logger.info(`Theater mode ${newState ? "enabled" : "disabled"}`);

      // スクリーンリーダー向けに状態変更を通知
      this.announceStateChange(
        newState
          ? "シアターモードを有効にしました"
          : "シアターモードを無効にしました"
      );

      return newState;
    });
  }

  /**
   * シアターモードを有効化
   * @returns {Promise<Result<boolean>>} 成功したかどうか
   */
  async enable() {
    return this.errorHandler.wrapAsync(async () => {
      const action = ActionCreator.setTheaterMode(true);
      const result = await this.stateStore.dispatch(action);

      if (result.isFailure()) {
        this.logger.error("Failed to enable theater mode", result.error);
        return false;
      }

      this.logger.info("Theater mode enabled");

      // スクリーンリーダー向けに状態変更を通知
      this.announceStateChange("シアターモードを有効にしました");

      return true;
    });
  }

  /**
   * シアターモードを無効化
   * @returns {Promise<Result<boolean>>} 成功したかどうか
   */
  async disable() {
    return this.errorHandler.wrapAsync(async () => {
      const action = ActionCreator.setTheaterMode(false);
      const result = await this.stateStore.dispatch(action);

      if (result.isFailure()) {
        this.logger.error("Failed to disable theater mode", result.error);
        return false;
      }

      this.logger.info("Theater mode disabled");

      // スクリーンリーダー向けに状態変更を通知
      this.announceStateChange("シアターモードを無効にしました");

      return true;
    });
  }

  /**
   * 透明度を更新
   * @param {number} opacity - 新しい透明度（0-1）
   * @returns {Promise<Result<number>>} 設定された透明度
   */
  async updateOpacity(opacity) {
    return this.errorHandler.wrapAsync(async () => {
      const action = ActionCreator.updateOpacity(opacity);
      const result = await this.stateStore.dispatch(action);

      if (result.isFailure()) {
        this.logger.error("Failed to update opacity", result.error);
        return this.overlayManager.getOpacity();
      }

      const newOpacity = this.stateStore.getStateValue(
        "theaterMode.opacity",
        opacity
      );

      this.logger.info("Opacity updated", {
        opacity: newOpacity,
        percentage: `${Math.round(newOpacity * 100)}%`,
      });

      return newOpacity;
    });
  }

  /**
   * シアターモードを適用
   * @returns {Promise<Result<boolean>>} 成功したかどうか
   * @private
   */
  async _applyTheaterMode() {
    return this.errorHandler.wrapAsync(async () => {
      // オーバーレイ対象要素を検出
      const targetsResult = this.elementManager.findOverlayTargets();
      if (targetsResult.isFailure()) {
        this.logger.error(
          "Failed to find overlay targets",
          targetsResult.error
        );
        return false;
      }

      const targets = targetsResult.data;
      this.logger.debug(`Found ${targets.length} overlay targets`);

      // 保護対象要素を検出
      const playerResult = await this.elementManager.detectVideoPlayer();
      const protectedElements = [];

      if (playerResult.isSuccess() && playerResult.data) {
        protectedElements.push(playerResult.data);

        // コントロール要素も保護
        const controlsResult = this.elementManager.findElementsWithFallback(
          this.elementManager.selectors.videoControls
        );

        if (controlsResult.isSuccess()) {
          protectedElements.push(...controlsResult.data);
        }
      }

      // オーバーレイを適用
      const result = this.overlayManager.applyOverlay(
        targets,
        protectedElements
      );

      if (result.isFailure()) {
        this.logger.error("Failed to apply overlay", result.error);
        return false;
      }

      return true;
    });
  }

  /**
   * シアターモードを解除
   * @returns {Result<boolean>} 成功したかどうか
   * @private
   */
  _removeTheaterMode() {
    return this.errorHandler.wrapSync(() => {
      const result = this.overlayManager.clearOverlay();

      if (result.isFailure()) {
        this.logger.error("Failed to clear overlay", result.error);
        return false;
      }

      return true;
    });
  }

  /**
   * スクリーンリーダー向けに状態変更を通知
   * @param {string} message - 通知メッセージ
   */
  announceStateChange(message) {
    // 既存の通知要素を探す
    let announcer = document.getElementById("theater-mode-announcer");

    // 通知要素がなければ作成
    if (!announcer) {
      announcer = document.createElement("div");
      announcer.id = "theater-mode-announcer";
      announcer.setAttribute("aria-live", "polite");
      announcer.setAttribute("aria-atomic", "true");
      announcer.style.cssText = `
        position: absolute;
        width: 1px;
        height: 1px;
        margin: -1px;
        padding: 0;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      `;
      document.body.appendChild(announcer);
    }

    // メッセージを設定（少し遅延させて確実に通知されるようにする）
    setTimeout(() => {
      announcer.textContent = message;
    }, 100);
  }

  /**
   * 現在の状態を取得
   * @returns {Object} 現在の状態オブジェクト
   */
  getState() {
    const theaterModeState = this.stateStore.getStateValue("theaterMode", {});

    return {
      isActive: theaterModeState.isEnabled || false,
      opacity: theaterModeState.opacity || 0.7,
      initialized: this.initialized,
    };
  }

  /**
   * シアターモードが有効かどうかを返す
   * @returns {boolean} シアターモードが有効な場合true
   */
  isTheaterModeEnabled() {
    return this.stateStore.getStateValue("theaterMode.isEnabled", false);
  }

  /**
   * 現在の透明度を取得
   * @returns {number} 現在の透明度
   */
  get currentOpacity() {
    return this.stateStore.getStateValue("theaterMode.opacity", 0.7);
  }

  /**
   * リソースをクリーンアップ
   */
  cleanup() {
    if (this.unsubscribeStateStore) {
      this.unsubscribeStateStore();
      this.unsubscribeStateStore = null;
    }

    this._removeTheaterMode();
    this.initialized = false;

    this.logger.debug("TheaterModeController cleaned up");
  }
}

/**
 * 新しいTheaterModeControllerインスタンスを作成
 * @param {Object} dependencies - 依存オブジェクト
 * @returns {TheaterModeController} 新しいTheaterModeControllerインスタンス
 */
const createTheaterModeController = (dependencies) => {
  return new TheaterModeController(dependencies);
};

// CommonJS/ES6 両対応のエクスポート
if (typeof module !== "undefined" && module.exports) {
  module.exports = { TheaterModeController, createTheaterModeController };
} else if (typeof window !== "undefined") {
  window.TheaterModeController = TheaterModeController;
  window.createTheaterModeController = createTheaterModeController;
}
