/**
 * YouTube Theater Mode - Performance Utilities
 * パフォーマンス最適化のためのユーティリティ関数
 */

/**
 * デバウンス処理によるイベント最適化
 * 短時間に連続して発生するイベントの処理を間引く
 *
 * @param {Function} func - 実行する関数
 * @param {number} wait - 待機時間（ミリ秒）
 * @param {boolean} immediate - 即時実行フラグ
 * @returns {Function} デバウンス処理された関数
 */
function debounce(func, wait = 100, immediate = false) {
  let timeout;

  return function executedFunction(...args) {
    const context = this;

    const later = function () {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };

    const callNow = immediate && !timeout;

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);

    if (callNow) func.apply(context, args);
  };
}

/**
 * スロットル処理によるイベント最適化
 * 指定した間隔でのみイベント処理を実行
 *
 * @param {Function} func - 実行する関数
 * @param {number} limit - 実行間隔（ミリ秒）
 * @returns {Function} スロットル処理された関数
 */
function throttle(func, limit = 100) {
  let inThrottle;
  let lastFunc;
  let lastRan;

  return function executedFunction(...args) {
    const context = this;

    if (!inThrottle) {
      func.apply(context, args);
      lastRan = Date.now();
      inThrottle = true;
    } else {
      clearTimeout(lastFunc);

      lastFunc = setTimeout(function () {
        if (Date.now() - lastRan >= limit) {
          func.apply(context, args);
          lastRan = Date.now();
        }
      }, limit - (Date.now() - lastRan));
    }
  };
}

/**
 * イベントリスナー管理クラス
 * イベントリスナーの追加・削除・クリーンアップを一元管理
 */
class EventListenerManager {
  constructor() {
    this.listeners = new Map();
    this.idCounter = 0;
  }

  /**
   * イベントリスナーを追加
   *
   * @param {Element} element - イベントを追加する要素
   * @param {string} eventType - イベントタイプ
   * @param {Function} listener - リスナー関数
   * @param {boolean|Object} options - イベントオプション
   * @returns {number} リスナーID（削除時に使用）
   */
  add(element, eventType, listener, options = false) {
    if (!element || !eventType || typeof listener !== "function") {
      console.error("YouTube Theater Mode: Invalid event listener parameters");
      return -1;
    }

    const id = ++this.idCounter;

    if (!this.listeners.has(element)) {
      this.listeners.set(element, new Map());
    }

    const elementListeners = this.listeners.get(element);

    if (!elementListeners.has(eventType)) {
      elementListeners.set(eventType, new Map());
    }

    const eventListeners = elementListeners.get(eventType);
    eventListeners.set(id, { listener, options });

    element.addEventListener(eventType, listener, options);

    return id;
  }

  /**
   * イベントリスナーを削除
   *
   * @param {number} id - 追加時に返されたリスナーID
   * @returns {boolean} 削除成功時true
   */
  remove(id) {
    if (id < 0) return false;

    for (const [element, elementListeners] of this.listeners.entries()) {
      for (const [eventType, eventListeners] of elementListeners.entries()) {
        if (eventListeners.has(id)) {
          const { listener, options } = eventListeners.get(id);
          element.removeEventListener(eventType, listener, options);
          eventListeners.delete(id);

          // 空のマップをクリーンアップ
          if (eventListeners.size === 0) {
            elementListeners.delete(eventType);
          }

          if (elementListeners.size === 0) {
            this.listeners.delete(element);
          }

          return true;
        }
      }
    }

    return false;
  }

  /**
   * 特定の要素のすべてのイベントリスナーを削除
   *
   * @param {Element} element - 対象要素
   * @returns {number} 削除されたリスナーの数
   */
  removeAll(element) {
    if (!element || !this.listeners.has(element)) {
      return 0;
    }

    let count = 0;
    const elementListeners = this.listeners.get(element);

    for (const [eventType, eventListeners] of elementListeners.entries()) {
      for (const [id, { listener, options }] of eventListeners.entries()) {
        element.removeEventListener(eventType, listener, options);
        count++;
      }
    }

    this.listeners.delete(element);
    return count;
  }

  /**
   * 特定のイベントタイプのすべてのリスナーを削除
   *
   * @param {string} eventType - イベントタイプ
   * @returns {number} 削除されたリスナーの数
   */
  removeByType(eventType) {
    if (!eventType) return 0;

    let count = 0;

    for (const [element, elementListeners] of this.listeners.entries()) {
      if (elementListeners.has(eventType)) {
        const eventListeners = elementListeners.get(eventType);

        for (const [id, { listener, options }] of eventListeners.entries()) {
          element.removeEventListener(eventType, listener, options);
          count++;
        }

        elementListeners.delete(eventType);

        if (elementListeners.size === 0) {
          this.listeners.delete(element);
        }
      }
    }

    return count;
  }

  /**
   * すべてのイベントリスナーをクリーンアップ
   *
   * @returns {number} 削除されたリスナーの数
   */
  cleanup() {
    let count = 0;

    for (const [element, elementListeners] of this.listeners.entries()) {
      for (const [eventType, eventListeners] of elementListeners.entries()) {
        for (const [id, { listener, options }] of eventListeners.entries()) {
          element.removeEventListener(eventType, listener, options);
          count++;
        }
      }
    }

    this.listeners.clear();
    return count;
  }

  /**
   * 登録されているリスナーの数を取得
   *
   * @returns {number} リスナーの総数
   */
  count() {
    let count = 0;

    for (const [element, elementListeners] of this.listeners.entries()) {
      for (const [eventType, eventListeners] of elementListeners.entries()) {
        count += eventListeners.size;
      }
    }

    return count;
  }
}

// エクスポート
window.TheaterModePerformance = {
  debounce,
  throttle,
  EventListenerManager: new EventListenerManager(),
};
