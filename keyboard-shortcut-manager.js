/**
 * KeyboardShortcutManager クラス
 * キーボードショートカット処理を専門とするクラス
 * ショートカットの競合回避とカスタマイズ機能を実装
 */
class KeyboardShortcutManager {
  /**
   * KeyboardShortcutManagerインスタンスを作成
   * @param {Object} dependencies - 依存オブジェクト
   * @param {Object} dependencies.logger - ロガーインスタンス
   * @param {Object} dependencies.errorHandler - エラーハンドラーインスタンス
   * @param {Object} [dependencies.stateStore] - 状態管理クラス（オプション）
   */
  constructor(dependencies) {
    // 依存性の注入
    this.logger = dependencies.logger;
    this.errorHandler = dependencies.errorHandler;
    this.stateStore = dependencies.stateStore;

    // ショートカット設定
    this.shortcuts = new Map();
    this.defaultShortcuts = this._getDefaultShortcuts();
    this.activeShortcuts = new Map(this.defaultShortcuts);

    // 状態管理
    this.enabled = true;
    this.contextMode = "global"; // global, input, video
    this.eventListeners = new Map();
    this.unsubscribeStateStore = null;

    this.logger.debug("KeyboardShortcutManager created");
  }

  /**
   * デフォルトのショートカット設定を取得
   * @returns {Map<string, Object>} デフォルトショートカット
   * @private
   */
  _getDefaultShortcuts() {
    return new Map([
      [
        "theaterMode",
        {
          key: "t",
          modifiers: { ctrl: true, shift: true, alt: false, meta: false },
          description: "シアターモードの切り替え",
          action: "toggleTheaterMode",
          context: "global",
          enabled: true,
        },
      ],
      [
        "increaseOpacity",
        {
          key: "ArrowUp",
          modifiers: { ctrl: true, shift: true, alt: false, meta: false },
          description: "オーバーレイの透明度を上げる",
          action: "increaseOpacity",
          context: "global",
          enabled: true,
        },
      ],
      [
        "decreaseOpacity",
        {
          key: "ArrowDown",
          modifiers: { ctrl: true, shift: true, alt: false, meta: false },
          description: "オーバーレイの透明度を下げる",
          action: "decreaseOpacity",
          context: "global",
          enabled: true,
        },
      ],
    ]);
  }

  /**
   * マネージャーを初期化
   * @returns {Promise<Result<boolean>>} 初期化結果
   */
  async initialize() {
    return this.errorHandler.wrapAsync(async () => {
      this.logger.info("KeyboardShortcutManager initializing");

      // 設定からショートカットを読み込み
      if (this.stateStore) {
        const settings = this.stateStore.getStateValue("settings", {});
        await this._loadShortcutsFromSettings(settings);

        // 設定変更を監視
        this.unsubscribeStateStore = this.stateStore.subscribeToPath(
          "settings",
          (settings) => this._handleSettingsChange(settings)
        );
      }

      // キーボードイベントリスナーを設定
      this._setupEventListeners();

      this.logger.info("KeyboardShortcutManager initialized");
      return true;
    });
  }

  /**
   * 設定からショートカットを読み込み
   * @param {Object} settings - 設定オブジェクト
   * @returns {Promise<Result<boolean>>} 読み込み結果
   * @private
   */
  async _loadShortcutsFromSettings(settings) {
    return this.errorHandler.wrapAsync(async () => {
      if (!settings || !settings.shortcuts) {
        return false;
      }

      try {
        // 設定からショートカットを読み込み
        const customShortcuts = settings.shortcuts;

        // デフォルトショートカットをコピー
        this.activeShortcuts = new Map(this.defaultShortcuts);

        // カスタムショートカットで上書き
        for (const [id, shortcut] of Object.entries(customShortcuts)) {
          if (this.activeShortcuts.has(id)) {
            const defaultShortcut = this.activeShortcuts.get(id);
            this.activeShortcuts.set(id, {
              ...defaultShortcut,
              ...shortcut,
            });
          }
        }

        this.logger.debug("Shortcuts loaded from settings", {
          shortcutCount: this.activeShortcuts.size,
        });

        return true;
      } catch (error) {
        this.logger.error("Failed to load shortcuts from settings", error);
        return false;
      }
    });
  }

  /**
   * 設定変更を処理
   * @param {Object} settings - 設定オブジェクト
   * @private
   */
  _handleSettingsChange(settings) {
    if (settings && settings.shortcuts) {
      this._loadShortcutsFromSettings(settings);
    }
  }

  /**
   * イベントリスナーを設定
   * @private
   */
  _setupEventListeners() {
    // キーダウンイベントリスナー
    const keydownHandler = (event) => this._handleKeyDown(event);
    document.addEventListener("keydown", keydownHandler);
    this.eventListeners.set("keydown", keydownHandler);

    // フォーカス変更の監視
    const focusHandler = () => this._updateContext();
    document.addEventListener("focusin", focusHandler);
    this.eventListeners.set("focusin", focusHandler);

    // コンテキストメニューの監視
    const contextMenuHandler = () => (this.contextMode = "menu");
    document.addEventListener("contextmenu", contextMenuHandler);
    this.eventListeners.set("contextmenu", contextMenuHandler);

    this.logger.debug("Event listeners set up");
  }

  /**
   * コンテキストを更新
   * @private
   */
  _updateContext() {
    const activeElement = document.activeElement;

    if (!activeElement) {
      this.contextMode = "global";
      return;
    }

    // 入力要素の場合
    if (
      activeElement.tagName === "INPUT" ||
      activeElement.tagName === "TEXTAREA" ||
      activeElement.isContentEditable
    ) {
      this.contextMode = "input";
      return;
    }

    // 動画プレーヤーの場合
    if (
      activeElement.tagName === "VIDEO" ||
      activeElement.classList.contains("html5-video-player") ||
      activeElement.id === "movie_player"
    ) {
      this.contextMode = "video";
      return;
    }

    // それ以外はグローバルコンテキスト
    this.contextMode = "global";
  }

  /**
   * キーダウンイベントを処理
   * @param {KeyboardEvent} event - キーボードイベント
   * @private
   */
  _handleKeyDown(event) {
    if (!this.enabled) return;

    // 現在のコンテキストを更新
    this._updateContext();

    // 入力要素でのショートカットは特定のものだけ許可
    if (this.contextMode === "input" && !this._allowInInputContext(event)) {
      return;
    }

    // イベントからショートカット情報を抽出
    const shortcutInfo = {
      key: event.key,
      modifiers: {
        ctrl: event.ctrlKey,
        shift: event.shiftKey,
        alt: event.altKey,
        meta: event.metaKey,
      },
    };

    // マッチするショートカットを検索
    const matchedShortcut = this._findMatchingShortcut(shortcutInfo);

    if (matchedShortcut) {
      this.logger.debug("Shortcut matched", {
        id: matchedShortcut.id,
        action: matchedShortcut.config.action,
      });

      // アクションを実行
      this._executeAction(matchedShortcut.id, matchedShortcut.config, event);

      // デフォルトの動作を防止
      event.preventDefault();
      event.stopPropagation();
    }
  }

  /**
   * 入力コンテキストでショートカットを許可するか判断
   * @param {KeyboardEvent} event - キーボードイベント
   * @returns {boolean} 許可する場合true
   * @private
   */
  _allowInInputContext(event) {
    // 特定の修飾キーの組み合わせのみ許可
    return (
      (event.ctrlKey && event.shiftKey) || // Ctrl+Shift+任意のキー
      (event.ctrlKey && event.altKey) // Ctrl+Alt+任意のキー
    );
  }

  /**
   * マッチするショートカットを検索
   * @param {Object} shortcutInfo - ショートカット情報
   * @returns {Object|null} マッチしたショートカット情報
   * @private
   */
  _findMatchingShortcut(shortcutInfo) {
    for (const [id, config] of this.activeShortcuts.entries()) {
      // 無効なショートカットはスキップ
      if (!config.enabled) continue;

      // コンテキストが一致しない場合はスキップ
      if (config.context !== "global" && config.context !== this.contextMode) {
        continue;
      }

      // キーが一致するか確認
      if (
        config.key.toLowerCase() === shortcutInfo.key.toLowerCase() &&
        config.modifiers.ctrl === shortcutInfo.modifiers.ctrl &&
        config.modifiers.shift === shortcutInfo.modifiers.shift &&
        config.modifiers.alt === shortcutInfo.modifiers.alt &&
        config.modifiers.meta === shortcutInfo.modifiers.meta
      ) {
        return { id, config };
      }
    }

    return null;
  }

  /**
   * ショートカットアクションを実行
   * @param {string} id - ショートカットID
   * @param {Object} config - ショートカット設定
   * @param {Event} event - 元のイベント
   * @private
   */
  _executeAction(id, config, event) {
    const actionName = config.action;

    // アクションハンドラーを呼び出し
    if (this.actionHandlers && this.actionHandlers[actionName]) {
      this.actionHandlers[actionName](event);
      this.logger.debug(`Action executed: ${actionName}`);
      return;
    }

    // StateStoreを使用したアクション実行
    if (this.stateStore) {
      this._executeStateAction(actionName, config);
      return;
    }

    this.logger.warn(`No handler found for action: ${actionName}`);
  }

  /**
   * StateStoreを使用してアクションを実行
   * @param {string} actionName - アクション名
   * @param {Object} config - ショートカット設定
   * @private
   */
  async _executeStateAction(actionName, config) {
    if (!this.stateStore) return;

    try {
      let action;

      switch (actionName) {
        case "toggleTheaterMode":
          action = ActionCreator.toggleTheaterMode();
          break;

        case "increaseOpacity":
          {
            const currentOpacity = this.stateStore.getStateValue(
              "theaterMode.opacity",
              0.7
            );
            const newOpacity = Math.min(0.9, currentOpacity + 0.1);
            action = ActionCreator.updateOpacity(newOpacity);
          }
          break;

        case "decreaseOpacity":
          {
            const currentOpacity = this.stateStore.getStateValue(
              "theaterMode.opacity",
              0.7
            );
            const newOpacity = Math.max(0, currentOpacity - 0.1);
            action = ActionCreator.updateOpacity(newOpacity);
          }
          break;

        default:
          this.logger.warn(`Unknown action: ${actionName}`);
          return;
      }

      if (action) {
        const result = await this.stateStore.dispatch(action);
        if (result.isFailure()) {
          this.logger.error(
            `Failed to execute action: ${actionName}`,
            result.error
          );
        }
      }
    } catch (error) {
      this.logger.error(`Error executing action: ${actionName}`, error);
    }
  }

  /**
   * アクションハンドラーを登録
   * @param {Object} handlers - アクションハンドラーオブジェクト
   * @returns {KeyboardShortcutManager} メソッドチェーン用のthis
   */
  registerActionHandlers(handlers) {
    this.actionHandlers = { ...this.actionHandlers, ...handlers };
    this.logger.debug("Action handlers registered", {
      handlerCount: Object.keys(handlers).length,
    });
    return this;
  }

  /**
   * ショートカットを登録
   * @param {string} id - ショートカットID
   * @param {Object} config - ショートカット設定
   * @returns {Result<boolean>} 登録結果
   */
  registerShortcut(id, config) {
    return this.errorHandler.wrapSync(() => {
      if (!id || !config || !config.key || !config.action) {
        throw new Error("Invalid shortcut configuration");
      }

      // 既存のショートカットを上書き
      this.activeShortcuts.set(id, {
        key: config.key,
        modifiers: {
          ctrl: !!config.modifiers?.ctrl,
          shift: !!config.modifiers?.shift,
          alt: !!config.modifiers?.alt,
          meta: !!config.modifiers?.meta,
        },
        description: config.description || "",
        action: config.action,
        context: config.context || "global",
        enabled: config.enabled !== false,
      });

      this.logger.debug(`Shortcut registered: ${id}`, { config });
      return true;
    });
  }

  /**
   * ショートカットを削除
   * @param {string} id - ショートカットID
   * @returns {Result<boolean>} 削除結果
   */
  unregisterShortcut(id) {
    return this.errorHandler.wrapSync(() => {
      const result = this.activeShortcuts.delete(id);
      if (result) {
        this.logger.debug(`Shortcut unregistered: ${id}`);
      } else {
        this.logger.warn(`Shortcut not found: ${id}`);
      }
      return result;
    });
  }

  /**
   * ショートカットを有効化/無効化
   * @param {string} id - ショートカットID
   * @param {boolean} enabled - 有効にするかどうか
   * @returns {Result<boolean>} 設定結果
   */
  setShortcutEnabled(id, enabled) {
    return this.errorHandler.wrapSync(() => {
      if (!this.activeShortcuts.has(id)) {
        this.logger.warn(`Shortcut not found: ${id}`);
        return false;
      }

      const shortcut = this.activeShortcuts.get(id);
      shortcut.enabled = !!enabled;
      this.activeShortcuts.set(id, shortcut);

      this.logger.debug(`Shortcut ${enabled ? "enabled" : "disabled"}: ${id}`);
      return true;
    });
  }

  /**
   * 全てのショートカットを有効化/無効化
   * @param {boolean} enabled - 有効にするかどうか
   * @returns {Result<boolean>} 設定結果
   */
  setAllShortcutsEnabled(enabled) {
    return this.errorHandler.wrapSync(() => {
      this.enabled = !!enabled;

      for (const [id, shortcut] of this.activeShortcuts.entries()) {
        shortcut.enabled = this.enabled;
        this.activeShortcuts.set(id, shortcut);
      }

      this.logger.debug(`All shortcuts ${enabled ? "enabled" : "disabled"}`);
      return true;
    });
  }

  /**
   * ショートカット設定を取得
   * @param {string} [id] - ショートカットID（省略時は全て）
   * @returns {Result<Object|Map>} ショートカット設定
   */
  getShortcuts(id) {
    return this.errorHandler.wrapSync(() => {
      if (id) {
        if (!this.activeShortcuts.has(id)) {
          this.logger.warn(`Shortcut not found: ${id}`);
          return null;
        }
        return this.activeShortcuts.get(id);
      }
      return new Map(this.activeShortcuts);
    });
  }

  /**
   * ショートカット設定を保存
   * @returns {Promise<Result<boolean>>} 保存結果
   */
  async saveShortcuts() {
    return this.errorHandler.wrapAsync(async () => {
      if (!this.stateStore) {
        this.logger.warn("StateStore not available, shortcuts not saved");
        return false;
      }

      // ショートカット設定をオブジェクトに変換
      const shortcutsObj = {};
      for (const [id, config] of this.activeShortcuts.entries()) {
        shortcutsObj[id] = { ...config };
      }

      // 設定を更新
      const action = ActionCreator.updateSettings({
        shortcuts: shortcutsObj,
      });

      const result = await this.stateStore.dispatch(action);
      if (result.isFailure()) {
        this.logger.error("Failed to save shortcuts", result.error);
        return false;
      }

      this.logger.debug("Shortcuts saved to settings");
      return true;
    });
  }

  /**
   * ショートカット設定をリセット
   * @returns {Result<boolean>} リセット結果
   */
  resetShortcuts() {
    return this.errorHandler.wrapSync(() => {
      this.activeShortcuts = new Map(this.defaultShortcuts);
      this.logger.debug("Shortcuts reset to defaults");
      return true;
    });
  }

  /**
   * ショートカットの説明を生成
   * @param {string} id - ショートカットID
   * @returns {Result<string>} ショートカットの説明
   */
  getShortcutDescription(id) {
    return this.errorHandler.wrapSync(() => {
      if (!this.activeShortcuts.has(id)) {
        return "";
      }

      const shortcut = this.activeShortcuts.get(id);
      const modifiers = [];

      if (shortcut.modifiers.ctrl) modifiers.push("Ctrl");
      if (shortcut.modifiers.shift) modifiers.push("Shift");
      if (shortcut.modifiers.alt) modifiers.push("Alt");
      if (shortcut.modifiers.meta) modifiers.push("Meta");

      const keyDisplay = shortcut.key === " " ? "Space" : shortcut.key;
      const shortcutText = [...modifiers, keyDisplay].join("+");

      return `${shortcutText}: ${shortcut.description}`;
    });
  }

  /**
   * リソースをクリーンアップ
   * @returns {Result<boolean>} クリーンアップ結果
   */
  cleanup() {
    return this.errorHandler.wrapSync(() => {
      // イベントリスナーを削除
      for (const [event, handler] of this.eventListeners.entries()) {
        document.removeEventListener(event, handler);
      }
      this.eventListeners.clear();

      // StateStore購読を解除
      if (this.unsubscribeStateStore) {
        this.unsubscribeStateStore();
        this.unsubscribeStateStore = null;
      }

      this.logger.debug("KeyboardShortcutManager cleaned up");
      return true;
    });
  }
}

/**
 * 新しいKeyboardShortcutManagerインスタンスを作成
 * @param {Object} dependencies - 依存オブジェクト
 * @returns {KeyboardShortcutManager} 新しいKeyboardShortcutManagerインスタンス
 */
const createKeyboardShortcutManager = (dependencies) => {
  return new KeyboardShortcutManager(dependencies);
};

// CommonJS/ES6 両対応のエクスポート
if (typeof module !== "undefined" && module.exports) {
  module.exports = { KeyboardShortcutManager, createKeyboardShortcutManager };
} else if (typeof window !== "undefined") {
  window.KeyboardShortcutManager = KeyboardShortcutManager;
  window.createKeyboardShortcutManager = createKeyboardShortcutManager;
}
