/**
 * OpacityController クラス
 * 透明度制御を専門とするクラス
 * スムーズなアニメーション効果とパフォーマンス最適化を実装
 */
class OpacityController {
  /**
   * OpacityControllerインスタンスを作成
   * @param {Object} dependencies - 依存オブジェクト
   * @param {Object} dependencies.logger - ロガーインスタンス
   * @param {Object} dependencies.errorHandler - エラーハンドラーインスタンス
   * @param {Object} [dependencies.stateStore] - 状態管理クラス（オプション）
   * @param {Object} [options] - オプション設定
   * @param {number} [options.defaultOpacity=0.7] - デフォルトの透明度
   * @param {number} [options.minOpacity=0] - 最小透明度
   * @param {number} [options.maxOpacity=0.9] - 最大透明度
   * @param {number} [options.step=0.1] - 透明度の変更ステップ
   * @param {number} [options.animationDuration=300] - アニメーション時間（ミリ秒）
   */
  constructor(dependencies, options = {}) {
    // 依存性の注入
    this.logger = dependencies.logger;
    this.errorHandler = dependencies.errorHandler;
    this.stateStore = dependencies.stateStore;

    // オプション設定
    this.defaultOpacity = options.defaultOpacity || 0.7;
    this.minOpacity = options.minOpacity || 0;
    this.maxOpacity = options.maxOpacity || 0.9;
    this.step = options.step || 0.1;
    this.animationDuration = options.animationDuration || 300;

    // 状態管理
    this.currentOpacity = this.defaultOpacity;
    this.targetOpacity = this.defaultOpacity;
    this.isAnimating = false;
    this.animationFrameId = null;
    this.animationStartTime = 0;
    this.animationStartOpacity = 0;
    this.unsubscribeStateStore = null;

    // CSSカスタムプロパティ名
    this.opacityVarName = "--theater-mode-opacity";

    this.logger.debug("OpacityController created", {
      defaultOpacity: this.defaultOpacity,
      minOpacity: this.minOpacity,
      maxOpacity: this.maxOpacity,
    });
  }

  /**
   * コントローラーを初期化
   * @returns {Promise<Result<boolean>>} 初期化結果
   */
  async initialize() {
    return this.errorHandler.wrapAsync(async () => {
      this.logger.info("OpacityController initializing");

      // 状態ストアから初期値を読み込み
      if (this.stateStore) {
        const opacity = this.stateStore.getStateValue(
          "theaterMode.opacity",
          this.defaultOpacity
        );
        this.currentOpacity = opacity;
        this.targetOpacity = opacity;

        // 状態変更を監視
        this.unsubscribeStateStore = this.stateStore.subscribeToPath(
          "theaterMode.opacity",
          (opacity) => this._handleOpacityChange(opacity)
        );
      }

      // CSSカスタムプロパティを設定
      this._updateCssVariable();

      this.logger.info("OpacityController initialized", {
        opacity: this.currentOpacity,
      });

      return true;
    });
  }

  /**
   * 状態変更を処理
   * @param {number} opacity - 新しい透明度
   * @private
   */
  _handleOpacityChange(opacity) {
    if (opacity !== this.targetOpacity) {
      this.setOpacity(opacity, true);
    }
  }

  /**
   * 透明度を設定
   * @param {number} opacity - 新しい透明度（0-1）
   * @param {boolean} [animate=true] - アニメーションを使用するかどうか
   * @returns {Result<number>} 設定された透明度
   */
  setOpacity(opacity, animate = true) {
    return this.errorHandler.wrapSync(() => {
      // 透明度を範囲内に制限
      const validOpacity = Math.max(
        this.minOpacity,
        Math.min(this.maxOpacity, opacity)
      );

      // 5%単位に丸める（0.05単位）
      const roundedOpacity = Math.round(validOpacity * 20) / 20;

      // 現在と同じ値なら何もしない
      if (
        roundedOpacity === this.currentOpacity &&
        roundedOpacity === this.targetOpacity
      ) {
        return this.currentOpacity;
      }

      this.targetOpacity = roundedOpacity;

      // アニメーションを使用する場合
      if (animate) {
        this._animateOpacity();
      } else {
        // 即時適用
        this.currentOpacity = this.targetOpacity;
        this._updateCssVariable();
      }

      this.logger.debug("Opacity set", {
        opacity: this.targetOpacity,
        percentage: `${Math.round(this.targetOpacity * 100)}%`,
        animated: animate,
      });

      return this.targetOpacity;
    });
  }

  /**
   * 透明度を増加
   * @param {number} [amount=0.1] - 増加量
   * @param {boolean} [animate=true] - アニメーションを使用するかどうか
   * @returns {Result<number>} 設定された透明度
   */
  increaseOpacity(amount = this.step, animate = true) {
    return this.errorHandler.wrapSync(() => {
      const newOpacity = Math.min(
        this.maxOpacity,
        this.currentOpacity + amount
      );
      return this.setOpacity(newOpacity, animate).data;
    });
  }

  /**
   * 透明度を減少
   * @param {number} [amount=0.1] - 減少量
   * @param {boolean} [animate=true] - アニメーションを使用するかどうか
   * @returns {Result<number>} 設定された透明度
   */
  decreaseOpacity(amount = this.step, animate = true) {
    return this.errorHandler.wrapSync(() => {
      const newOpacity = Math.max(
        this.minOpacity,
        this.currentOpacity - amount
      );
      return this.setOpacity(newOpacity, animate).data;
    });
  }

  /**
   * 透明度をデフォルト値にリセット
   * @param {boolean} [animate=true] - アニメーションを使用するかどうか
   * @returns {Result<number>} 設定された透明度
   */
  resetOpacity(animate = true) {
    return this.setOpacity(this.defaultOpacity, animate);
  }

  /**
   * 透明度アニメーションを実行
   * @private
   */
  _animateOpacity() {
    // 既存のアニメーションをキャンセル
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    // アニメーション開始
    this.isAnimating = true;
    this.animationStartTime = performance.now();
    this.animationStartOpacity = this.currentOpacity;

    // アニメーションフレームを要求
    this.animationFrameId = requestAnimationFrame((timestamp) =>
      this._animationFrame(timestamp)
    );
  }

  /**
   * アニメーションフレームを処理
   * @param {number} timestamp - タイムスタンプ
   * @private
   */
  _animationFrame(timestamp) {
    // 経過時間を計算
    const elapsed = timestamp - this.animationStartTime;
    const progress = Math.min(elapsed / this.animationDuration, 1);

    // イージング関数（ease-out）
    const easedProgress = 1 - Math.pow(1 - progress, 2);

    // 現在の透明度を計算
    this.currentOpacity =
      this.animationStartOpacity +
      (this.targetOpacity - this.animationStartOpacity) * easedProgress;

    // CSSカスタムプロパティを更新
    this._updateCssVariable();

    // アニメーションが完了していない場合は次のフレームを要求
    if (progress < 1) {
      this.animationFrameId = requestAnimationFrame((timestamp) =>
        this._animationFrame(timestamp)
      );
    } else {
      // アニメーション完了
      this.currentOpacity = this.targetOpacity;
      this._updateCssVariable();
      this.isAnimating = false;
      this.animationFrameId = null;

      this.logger.debug("Opacity animation completed", {
        opacity: this.currentOpacity,
      });
    }
  }

  /**
   * CSSカスタムプロパティを更新
   * @private
   */
  _updateCssVariable() {
    document.documentElement.style.setProperty(
      this.opacityVarName,
      this.currentOpacity
    );
  }

  /**
   * 状態をStateStoreに同期
   * @returns {Promise<Result<boolean>>} 同期結果
   */
  async syncToStateStore() {
    return this.errorHandler.wrapAsync(async () => {
      if (!this.stateStore) {
        return false;
      }

      try {
        const action = ActionCreator.updateOpacity(this.currentOpacity);
        const result = await this.stateStore.dispatch(action);

        if (result.isFailure()) {
          this.logger.error(
            "Failed to sync opacity to state store",
            result.error
          );
          return false;
        }

        this.logger.debug("Opacity synced to state store", {
          opacity: this.currentOpacity,
        });

        return true;
      } catch (error) {
        this.logger.error("Error syncing opacity to state store", error);
        return false;
      }
    });
  }

  /**
   * 現在の透明度を取得
   * @returns {number} 現在の透明度
   */
  getOpacity() {
    return this.currentOpacity;
  }

  /**
   * 目標透明度を取得
   * @returns {number} 目標透明度
   */
  getTargetOpacity() {
    return this.targetOpacity;
  }

  /**
   * アニメーション中かどうかを取得
   * @returns {boolean} アニメーション中の場合true
   */
  isAnimationInProgress() {
    return this.isAnimating;
  }

  /**
   * リソースをクリーンアップ
   * @returns {Result<boolean>} クリーンアップ結果
   */
  cleanup() {
    return this.errorHandler.wrapSync(() => {
      // アニメーションをキャンセル
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
        this.isAnimating = false;
      }

      // StateStore購読を解除
      if (this.unsubscribeStateStore) {
        this.unsubscribeStateStore();
        this.unsubscribeStateStore = null;
      }

      this.logger.debug("OpacityController cleaned up");
      return true;
    });
  }
}

/**
 * 新しいOpacityControllerインスタンスを作成
 * @param {Object} dependencies - 依存オブジェクト
 * @param {Object} [options] - オプション設定
 * @returns {OpacityController} 新しいOpacityControllerインスタンス
 */
const createOpacityController = (dependencies, options = {}) => {
  return new OpacityController(dependencies, options);
};

// CommonJS/ES6 両対応のエクスポート
if (typeof module !== "undefined" && module.exports) {
  module.exports = { OpacityController, createOpacityController };
} else if (typeof window !== "undefined") {
  window.OpacityController = OpacityController;
  window.createOpacityController = createOpacityController;
}
