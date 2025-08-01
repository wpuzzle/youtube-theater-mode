/**
 * OverlayManager クラス
 * オーバーレイの適用と管理を専門とするクラス
 * DOM操作の最適化とバッチ処理、アニメーション効果を実装
 *
 * @class OverlayManager
 */
class OverlayManager {
  /**
   * OverlayManagerインスタンスを作成
   * @param {Object} logger - ロガーインスタンス
   * @param {Object} errorHandler - エラーハンドラーインスタンス
   * @param {Object} [options] - オプション設定
   * @param {number} [options.defaultOpacity=0.7] - デフォルトの透明度
   * @param {string} [options.overlayClass='theater-mode-overlay'] - オーバーレイのCSSクラス
   * @param {string} [options.protectedClass='theater-mode-video-area'] - 保護要素のCSSクラス
   * @param {number} [options.animationDuration=300] - アニメーション時間（ミリ秒）
   */
  constructor(logger, errorHandler, options = {}) {
    this.logger = logger;
    this.errorHandler = errorHandler;

    // オプション設定
    this.defaultOpacity = options.defaultOpacity || 0.7;
    this.overlayClass = options.overlayClass || "theater-mode-overlay";
    this.protectedClass = options.protectedClass || "theater-mode-video-area";
    this.animationDuration = options.animationDuration || 300;

    // 状態管理
    this.isActive = false;
    this.currentOpacity = this.defaultOpacity;
    this.overlayElements = new Set();
    this.protectedElements = new Set();
    this.pendingUpdates = new Map();
    this.updateScheduled = false;

    // CSSカスタムプロパティ名
    this.opacityVarName = "--theater-mode-opacity";

    this.logger.debug("OverlayManager initialized", {
      defaultOpacity: this.defaultOpacity,
      overlayClass: this.overlayClass,
    });
  }

  /**
   * オーバーレイを適用
   * @param {Element[]} targetElements - オーバーレイ対象要素
   * @param {Element[]} [protectedElements=[]] - 保護対象要素
   * @returns {Result<boolean>} 成功したかどうか
   */
  applyOverlay(targetElements, protectedElements = []) {
    return this.errorHandler.wrapSync(
      () => {
        if (!Array.isArray(targetElements)) {
          throw new Error("Target elements must be an array");
        }

        if (targetElements.length === 0) {
          this.logger.warn("No target elements provided for overlay");
          return false;
        }

        // 現在のオーバーレイ状態をクリア
        this.clearOverlay(false);

        // CSSカスタムプロパティを設定
        document.documentElement.style.setProperty(
          this.opacityVarName,
          this.currentOpacity
        );

        // バッチ処理のためにDOM操作をキューに入れる
        targetElements.forEach((element) => {
          if (!element || !(element instanceof Element)) {
            this.logger.warn("Invalid element skipped", { element });
            return;
          }

          this.pendingUpdates.set(element, {
            action: "add",
            element: element,
          });
        });

        // 保護要素を処理
        protectedElements.forEach((element) => {
          if (!element || !(element instanceof Element)) {
            this.logger.warn("Invalid protected element skipped", { element });
            return;
          }

          this.pendingUpdates.set(element, {
            action: "protect",
            element: element,
          });
        });

        // バッチ処理を実行
        this._flushUpdates();

        // 状態を更新
        this.isActive = true;

        this.logger.info("Overlay applied", {
          targetCount: targetElements.length,
          protectedCount: protectedElements.length,
          opacity: this.currentOpacity,
        });

        return true;
      },
      {
        type: ErrorType.INTERNAL_ERROR,
        context: {
          targetCount: targetElements?.length,
          protectedCount: protectedElements?.length,
        },
      }
    );
  }

  /**
   * オーバーレイを削除
   * @param {boolean} [animate=true] - アニメーションを使用するかどうか
   * @returns {Result<boolean>} 成功したかどうか
   */
  clearOverlay(animate = true) {
    return this.errorHandler.wrapSync(
      () => {
        if (!this.isActive && this.overlayElements.size === 0) {
          return true; // 既にクリアされている
        }

        if (animate) {
          // フェードアウトアニメーション
          for (const element of this.overlayElements) {
            element.style.transition = `opacity ${this.animationDuration}ms cubic-bezier(0.165, 0.84, 0.44, 1)`;
            element.style.opacity = "1";

            // 強制リフロー
            void element.offsetWidth;

            element.style.opacity = "0";
          }

          // アニメーション完了後に要素を削除
          setTimeout(() => {
            this._removeAllOverlays();
          }, this.animationDuration);
        } else {
          // 即時削除
          this._removeAllOverlays();
        }

        // 保護クラスを削除
        for (const element of this.protectedElements) {
          element.classList.remove(this.protectedClass);
        }

        // 状態をリセット
        this.isActive = false;
        this.overlayElements.clear();
        this.protectedElements.clear();
        this.pendingUpdates.clear();

        this.logger.info("Overlay cleared", { animated: animate });

        return true;
      },
      {
        type: ErrorType.INTERNAL_ERROR,
      }
    );
  }

  /**
   * 全てのオーバーレイを削除（内部メソッド）
   * @private
   */
  _removeAllOverlays() {
    for (const element of this.overlayElements) {
      element.classList.remove(this.overlayClass);
      element.style.opacity = "";
      element.style.transition = "";
    }

    // CSSカスタムプロパティをリセット
    document.documentElement.style.removeProperty(this.opacityVarName);
  }

  /**
   * 透明度を更新
   * @param {number} opacity - 新しい透明度（0-1）
   * @returns {Result<number>} 設定された透明度
   */
  updateOpacity(opacity) {
    return this.errorHandler.wrapSync(
      () => {
        // 透明度を0-0.9の範囲に制限（1.0だと完全に見えなくなるため）
        const validOpacity = Math.max(0, Math.min(0.9, opacity));

        // 5%単位に丸める（0.05単位）
        this.currentOpacity = Math.round(validOpacity * 20) / 20;

        // CSSカスタムプロパティを更新
        document.documentElement.style.setProperty(
          this.opacityVarName,
          this.currentOpacity
        );

        // オーバーレイが有効な場合、各要素の透明度を更新
        if (this.isActive) {
          for (const element of this.overlayElements) {
            // フォールバックとして直接スタイルも設定
            element.style.opacity = this.currentOpacity;
          }
        }

        this.logger.debug("Opacity updated", {
          opacity: this.currentOpacity,
          percentage: `${Math.round(this.currentOpacity * 100)}%`,
        });

        return this.currentOpacity;
      },
      {
        type: ErrorType.INTERNAL_ERROR,
        context: { opacity },
      }
    );
  }

  /**
   * 要素にオーバーレイを適用
   * @param {Element} element - 対象要素
   * @returns {boolean} 成功したかどうか
   * @private
   */
  _applyOverlayToElement(element) {
    if (!element || element.classList.contains(this.overlayClass)) {
      return false;
    }

    // クラスを追加
    element.classList.add(this.overlayClass);

    // フォールバックとして直接スタイルも設定
    element.style.opacity = this.currentOpacity;

    // 要素を追跡
    this.overlayElements.add(element);

    return true;
  }

  /**
   * 要素を保護対象として設定
   * @param {Element} element - 保護対象要素
   * @returns {boolean} 成功したかどうか
   * @private
   */
  _protectElement(element) {
    if (!element) {
      return false;
    }

    // 保護クラスを追加
    element.classList.add(this.protectedClass);

    // 要素を追跡
    this.protectedElements.add(element);

    return true;
  }

  /**
   * バッチ処理を実行
   * @private
   */
  _flushUpdates() {
    if (this.pendingUpdates.size === 0) {
      return;
    }

    // パフォーマンス測定開始
    const startTime = performance.now();

    // 更新をバッチ処理
    for (const [element, update] of this.pendingUpdates.entries()) {
      if (update.action === "add") {
        this._applyOverlayToElement(update.element);
      } else if (update.action === "protect") {
        this._protectElement(update.element);
      }
    }

    // 更新キューをクリア
    this.pendingUpdates.clear();
    this.updateScheduled = false;

    // パフォーマンス測定終了
    const duration = performance.now() - startTime;
    this.logger.debug("Batch updates applied", {
      duration: `${duration.toFixed(2)}ms`,
      elementCount: this.overlayElements.size,
    });
  }

  /**
   * バッチ処理を予約
   * @param {Function} updateFn - 更新関数
   * @private
   */
  _scheduleUpdate(updateFn) {
    this.pendingUpdates.set(Date.now(), { action: "custom", fn: updateFn });

    if (!this.updateScheduled) {
      this.updateScheduled = true;

      // 次のフレームで更新を実行
      requestAnimationFrame(() => {
        this._flushUpdates();
      });
    }
  }

  /**
   * 要素を追加
   * @param {Element|Element[]} elements - 追加する要素
   * @returns {Result<number>} 追加された要素数
   */
  addElements(elements) {
    return this.errorHandler.wrapSync(
      () => {
        const elementsArray = Array.isArray(elements) ? elements : [elements];
        let addedCount = 0;

        elementsArray.forEach((element) => {
          if (!element || !(element instanceof Element)) {
            return;
          }

          this.pendingUpdates.set(element, {
            action: "add",
            element: element,
          });

          addedCount++;
        });

        if (addedCount > 0) {
          this._flushUpdates();
        }

        this.logger.debug("Elements added to overlay", { count: addedCount });
        return addedCount;
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
   * 保護要素を追加
   * @param {Element|Element[]} elements - 保護する要素
   * @returns {Result<number>} 追加された保護要素数
   */
  addProtectedElements(elements) {
    return this.errorHandler.wrapSync(
      () => {
        const elementsArray = Array.isArray(elements) ? elements : [elements];
        let addedCount = 0;

        elementsArray.forEach((element) => {
          if (!element || !(element instanceof Element)) {
            return;
          }

          this.pendingUpdates.set(element, {
            action: "protect",
            element: element,
          });

          addedCount++;
        });

        if (addedCount > 0) {
          this._flushUpdates();
        }

        this.logger.debug("Protected elements added", { count: addedCount });
        return addedCount;
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
   * 要素を削除
   * @param {Element|Element[]} elements - 削除する要素
   * @returns {Result<number>} 削除された要素数
   */
  removeElements(elements) {
    return this.errorHandler.wrapSync(
      () => {
        const elementsArray = Array.isArray(elements) ? elements : [elements];
        let removedCount = 0;

        elementsArray.forEach((element) => {
          if (!element || !(element instanceof Element)) {
            return;
          }

          if (this.overlayElements.has(element)) {
            element.classList.remove(this.overlayClass);
            element.style.opacity = "";
            this.overlayElements.delete(element);
            removedCount++;
          }
        });

        this.logger.debug("Elements removed from overlay", {
          count: removedCount,
        });
        return removedCount;
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
   * 保護要素を削除
   * @param {Element|Element[]} elements - 保護を解除する要素
   * @returns {Result<number>} 削除された保護要素数
   */
  removeProtectedElements(elements) {
    return this.errorHandler.wrapSync(
      () => {
        const elementsArray = Array.isArray(elements) ? elements : [elements];
        let removedCount = 0;

        elementsArray.forEach((element) => {
          if (!element || !(element instanceof Element)) {
            return;
          }

          if (this.protectedElements.has(element)) {
            element.classList.remove(this.protectedClass);
            this.protectedElements.delete(element);
            removedCount++;
          }
        });

        this.logger.debug("Protected elements removed", {
          count: removedCount,
        });
        return removedCount;
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
   * オーバーレイが有効かどうかを確認
   * @returns {boolean} オーバーレイが有効な場合true
   */
  isOverlayActive() {
    return this.isActive;
  }

  /**
   * 現在の透明度を取得
   * @returns {number} 現在の透明度
   */
  getOpacity() {
    return this.currentOpacity;
  }

  /**
   * 現在の状態を取得
   * @returns {Object} 現在の状態オブジェクト
   */
  getState() {
    return {
      isActive: this.isActive,
      opacity: this.currentOpacity,
      overlayElementsCount: this.overlayElements.size,
      protectedElementsCount: this.protectedElements.size,
    };
  }

  /**
   * リソースをクリーンアップ
   * @returns {Result<boolean>} 成功したかどうか
   */
  cleanup() {
    return this.errorHandler.wrapSync(
      () => {
        this.clearOverlay(false);
        this.pendingUpdates.clear();
        this.updateScheduled = false;

        this.logger.debug("OverlayManager resources cleaned up");
        return true;
      },
      {
        type: ErrorType.INTERNAL_ERROR,
      }
    );
  }
}

/**
 * 新しいOverlayManagerインスタンスを作成
 * @param {Object} logger - ロガーインスタンス
 * @param {Object} errorHandler - エラーハンドラーインスタンス
 * @param {Object} [options] - オプション設定
 * @returns {OverlayManager} 新しいOverlayManagerインスタンス
 */
const createOverlayManager = (logger, errorHandler, options = {}) => {
  return new OverlayManager(logger, errorHandler, options);
};

// CommonJS/ES6 両対応のエクスポート
if (typeof module !== "undefined" && module.exports) {
  module.exports = { OverlayManager, createOverlayManager };
} else if (typeof window !== "undefined") {
  window.OverlayManager = OverlayManager;
  window.createOverlayManager = createOverlayManager;
}
