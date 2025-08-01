/**
 * LegacyAdapter
 * 既存APIと新実装の橋渡し機能を提供
 * 段階的移行のためのアダプターパターンを実装
 */

// 依存関係のインポート
let Logger,
  ErrorHandler,
  Result,
  AppError,
  ErrorType,
  StateStore,
  ActionCreator,
  SettingsManager,
  ElementManager,
  MessageBus;

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
  ({ SettingsManager } = require("./settings-manager.js"));
  ({ ElementManager } = require("./element-manager.js"));
  ({ MessageBus } = require("./message-bus.js"));
}

/**
 * レガシーAPIアダプター
 * 既存のAPIを新しい実装にマッピング
 */
class LegacyAdapter {
  /**
   * LegacyAdapterインスタンスを作成
   * @param {Object} options - オプション
   * @param {Object} options.logger - ロガーインスタンス
   * @param {Object} options.errorHandler - エラーハンドラーインスタンス
   * @param {StateStore} options.stateStore - 状態管理ストア
   * @param {SettingsManager} options.settingsManager - 設定管理
   * @param {ElementManager} options.elementManager - 要素管理
   * @param {MessageBus} [options.messageBus] - メッセージバス
   */
  constructor(options) {
    if (!options) {
      throw new Error("Options are required");
    }

    this.logger = options.logger;
    this.errorHandler = options.errorHandler;
    this.stateStore = options.stateStore;
    this.settingsManager = options.settingsManager;
    this.elementManager = options.elementManager;
    this.messageBus = options.messageBus;

    // レガシーAPI互換性フラグ
    this.legacyMode = true;

    // レガシーコンポーネントのマッピング
    this.legacyComponents = new Map();

    if (this.logger) {
      this.logger.debug("LegacyAdapter initialized");
    }
  }

  /**
   * レガシーTheaterModeControllerのアダプター
   * 既存のTheaterModeControllerAPIを新実装にマッピング
   */
  createLegacyTheaterModeController() {
    const self = this;

    return {
      // 既存のプロパティ
      isTheaterModeActive: false,
      currentOpacity: 0.7,
      toggleButton: null,
      overlayElements: [],
      initialized: false,
      settings: null,
      settingsManager: null,

      /**
       * 初期化（レガシーAPI互換）
       * @returns {Promise<boolean>} 初期化結果
       */
      async initialize() {
        try {
          if (self.logger) {
            self.logger.info("Legacy TheaterModeController initializing");
          }

          // 新しい実装で初期化
          const settingsResult = await self.settingsManager.loadSettings();
          if (settingsResult.isSuccess()) {
            this.settings = settingsResult.data;
            this.currentOpacity = this.settings.opacity;
            this.isTheaterModeActive = this.settings.theaterModeEnabled;
          }

          // 状態ストアを初期化
          const initAction = ActionCreator.initialize({
            settings: this.settings,
            theaterMode: {
              isEnabled: this.isTheaterModeActive,
              opacity: this.currentOpacity,
            },
          });

          const initResult = await self.stateStore.dispatch(initAction);
          if (initResult.isFailure()) {
            if (self.logger) {
              self.logger.error(
                "Failed to initialize state store",
                initResult.error
              );
            }
            return false;
          }

          // 動画プレーヤーを検出
          const playerResult = await self.elementManager.detectVideoPlayer();
          if (playerResult.isFailure() || !playerResult.data) {
            if (self.logger) {
              self.logger.warn("Video player detection failed");
            }
            return false;
          }

          // 初期状態に応じてシアターモードを適用
          if (this.isTheaterModeActive) {
            await this.applyTheaterMode();
          }

          this.initialized = true;

          if (self.logger) {
            self.logger.info("Legacy TheaterModeController initialized");
          }

          return true;
        } catch (error) {
          if (self.logger) {
            self.logger.error(
              "Legacy TheaterModeController initialization failed",
              error
            );
          }
          return false;
        }
      },

      /**
       * 動画プレーヤー検出（レガシーAPI互換）
       * @returns {Promise<Element|null>} 動画プレーヤー要素
       */
      async detectVideoPlayer() {
        const result = await self.elementManager.detectVideoPlayer();
        return result.isSuccess() ? result.data : null;
      },

      /**
       * シアターモード切り替え（レガシーAPI互換）
       * @returns {Promise<boolean>} 切り替え後の状態
       */
      async toggleTheaterMode() {
        try {
          const action = ActionCreator.toggleTheaterMode();
          const result = await self.stateStore.dispatch(action);

          if (result.isFailure()) {
            if (self.logger) {
              self.logger.error("Failed to toggle theater mode", result.error);
            }
            return this.isTheaterModeActive;
          }

          // 状態を更新
          const newState = self.stateStore.getStateValue(
            "theaterMode.isEnabled",
            false
          );
          this.isTheaterModeActive = newState;

          // 設定を保存
          await this.saveSettings();

          // 状態変更を通知（レガシー互換）
          if (typeof notifyStateChange === "function") {
            notifyStateChange(this.isTheaterModeActive, this.currentOpacity);
          }

          return this.isTheaterModeActive;
        } catch (error) {
          if (self.logger) {
            self.logger.error("Error toggling theater mode", error);
          }
          return this.isTheaterModeActive;
        }
      },

      /**
       * シアターモード有効化（レガシーAPI互換）
       */
      async enableTheaterMode() {
        if (this.isTheaterModeActive) return;

        const action = ActionCreator.setTheaterMode(true);
        const result = await self.stateStore.dispatch(action);

        if (result.isSuccess()) {
          this.isTheaterModeActive = true;
          await this.applyTheaterMode();
          await this.saveSettings();

          // 状態変更を通知（レガシー互換）
          if (typeof notifyStateChange === "function") {
            notifyStateChange(true, this.currentOpacity);
          }

          if (self.logger) {
            self.logger.info("Theater mode enabled (legacy)");
          }
        }
      },

      /**
       * シアターモード無効化（レガシーAPI互換）
       */
      async disableTheaterMode() {
        if (!this.isTheaterModeActive) return;

        const action = ActionCreator.setTheaterMode(false);
        const result = await self.stateStore.dispatch(action);

        if (result.isSuccess()) {
          this.isTheaterModeActive = false;
          this.removeTheaterMode();
          await this.saveSettings();

          // 状態変更を通知（レガシー互換）
          if (typeof notifyStateChange === "function") {
            notifyStateChange(false, this.currentOpacity);
          }

          if (self.logger) {
            self.logger.info("Theater mode disabled (legacy)");
          }
        }
      },

      /**
       * シアターモード適用（レガシーAPI互換）
       */
      async applyTheaterMode() {
        const targetsResult = self.elementManager.findOverlayTargets();
        if (targetsResult.isFailure()) {
          if (self.logger) {
            self.logger.error(
              "Failed to find overlay targets",
              targetsResult.error
            );
          }
          return;
        }

        const targets = targetsResult.data;
        this.overlayElements = [];

        targets.forEach((element) => {
          if (!element.classList.contains("theater-mode-overlay")) {
            element.classList.add("theater-mode-overlay");
            this.overlayElements.push(element);
          }
        });

        if (self.logger) {
          self.logger.debug(
            `Applied theater mode to ${this.overlayElements.length} elements`
          );
        }
      },

      /**
       * シアターモード解除（レガシーAPI互換）
       */
      removeTheaterMode() {
        this.overlayElements.forEach((element) => {
          element.classList.remove("theater-mode-overlay");
          element.style.opacity = "";
        });

        this.overlayElements = [];

        if (self.logger) {
          self.logger.debug("Theater mode removed (legacy)");
        }
      },

      /**
       * 透明度更新（レガシーAPI互換）
       * @param {number} opacity - 新しい透明度
       */
      async updateOpacity(opacity) {
        const roundedOpacity = Math.round(opacity * 20) / 20;
        this.currentOpacity = Math.max(0, Math.min(0.9, roundedOpacity));

        const action = ActionCreator.updateOpacity(this.currentOpacity);
        const result = await self.stateStore.dispatch(action);

        if (result.isSuccess()) {
          // シアターモードが有効な場合は要素を更新
          if (this.isTheaterModeActive) {
            document.documentElement.style.setProperty(
              "--theater-mode-opacity",
              this.currentOpacity
            );

            this.overlayElements.forEach((element) => {
              element.style.opacity = this.currentOpacity;
              element.classList.remove("theater-mode-overlay");
              void element.offsetWidth; // リフロー強制
              element.classList.add("theater-mode-overlay");
            });
          }

          await this.saveSettings();

          // 状態変更を通知（レガシー互換）
          if (typeof notifyStateChange === "function") {
            notifyStateChange(this.isTheaterModeActive, this.currentOpacity);
          }

          if (self.logger) {
            self.logger.debug(
              `Opacity updated to ${this.currentOpacity} (legacy)`
            );
          }
        }
      },

      /**
       * 設定保存（レガシーAPI互換）
       */
      async saveSettings() {
        const settings = {
          opacity: this.currentOpacity,
          theaterModeEnabled: this.isTheaterModeActive,
          lastUsed: Date.now(),
        };

        const result = await self.settingsManager.saveSettings(settings);
        if (result.isFailure() && self.logger) {
          self.logger.warn("Failed to save settings (legacy)", result.error);
        }
      },

      /**
       * 状態取得（レガシーAPI互換）
       * @returns {Object} 現在の状態
       */
      getState() {
        return {
          isActive: this.isTheaterModeActive,
          opacity: this.currentOpacity,
          initialized: this.initialized,
        };
      },

      /**
       * シアターモード有効状態取得（レガシーAPI互換）
       * @returns {boolean} 有効状態
       */
      isTheaterModeEnabled() {
        return this.isTheaterModeActive;
      },

      /**
       * キーボードショートカット設定（レガシーAPI互換）
       */
      setupKeyboardShortcuts() {
        document.addEventListener("keydown", (event) => {
          if (event.ctrlKey && event.shiftKey && event.key === "T") {
            this.toggleTheaterMode();
          }
        });
      },

      /**
       * スクリーンリーダー向け通知（レガシーAPI互換）
       * @param {string} message - 通知メッセージ
       */
      announceStateChange(message) {
        let announcer = document.getElementById("theater-mode-announcer");

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

        setTimeout(() => {
          announcer.textContent = message;
        }, 100);
      },
    };
  }

  /**
   * レガシーElementDetectorのアダプター
   * 既存のElementDetectorAPIを新実装にマッピング
   */
  createLegacyElementDetector() {
    const self = this;

    return {
      /**
       * フォールバック付き要素検出（レガシーAPI互換）
       * @param {string|string[]} selectors - セレクター
       * @param {Element} context - 検索コンテキスト
       * @returns {Element|null} 見つかった要素
       */
      findElementWithFallback(selectors, context = document) {
        const result = self.elementManager.findElementWithFallback(
          selectors,
          context
        );
        return result.isSuccess() ? result.data : null;
      },

      /**
       * 要素待機（レガシーAPI互換）
       * @param {string|string[]} selectors - セレクター
       * @param {number} timeout - タイムアウト
       * @returns {Promise<Element|null>} 見つかった要素
       */
      async waitForElement(selectors, timeout = 10000) {
        const result = await self.elementManager.waitForElement(selectors, {
          timeout,
        });
        return result.isSuccess() ? result.data : null;
      },

      /**
       * 動画プレーヤー検出（レガシーAPI互換）
       * @param {number} timeout - タイムアウト
       * @returns {Promise<Element|null>} 動画プレーヤー要素
       */
      async detectVideoPlayerAsync(timeout = 15000) {
        const result = await self.elementManager.detectVideoPlayer({ timeout });
        return result.isSuccess() ? result.data : null;
      },

      /**
       * オーバーレイ対象要素検出（レガシーAPI互換）
       * @returns {Element[]} オーバーレイ対象要素の配列
       */
      findOverlayTargets() {
        const result = self.elementManager.findOverlayTargets();
        return result.isSuccess() ? result.data : [];
      },
    };
  }

  /**
   * レガシーSettingsManagerのアダプター
   * 既存のSettingsManagerAPIを新実装にマッピング
   */
  createLegacySettingsManager() {
    const self = this;

    return {
      // デフォルト設定（レガシー互換）
      defaultSettings: {
        opacity: 0.7,
        isEnabled: false,
        shortcutKey: "Ctrl+Shift+T",
        lastUsed: null,
        version: "1.0.0",
      },

      currentSettings: {},
      settingsKey: "theaterModeSettings",

      /**
       * 設定読み込み（レガシーAPI互換）
       * @returns {Promise<Object>} 設定オブジェクト
       */
      async loadSettings() {
        const result = await self.settingsManager.loadSettings();
        if (result.isSuccess()) {
          this.currentSettings = result.data;
          return this._convertToLegacyFormat(result.data);
        } else {
          this.currentSettings = this.defaultSettings;
          return this.defaultSettings;
        }
      },

      /**
       * 設定保存（レガシーAPI互換）
       * @param {Object} settings - 保存する設定
       * @returns {Promise<boolean>} 保存成功時true
       */
      async saveSettings(settings) {
        const convertedSettings = this._convertFromLegacyFormat(settings);
        const result = await self.settingsManager.saveSettings(
          convertedSettings
        );

        if (result.isSuccess()) {
          this.currentSettings = { ...this.currentSettings, ...settings };
          return true;
        }
        return false;
      },

      /**
       * レガシー形式に変換
       * @param {Object} newSettings - 新形式の設定
       * @returns {Object} レガシー形式の設定
       * @private
       */
      _convertToLegacyFormat(newSettings) {
        return {
          opacity: newSettings.opacity || 0.7,
          isEnabled: newSettings.theaterModeEnabled || false,
          shortcutKey: newSettings.keyboardShortcut
            ? `Ctrl+Shift+${newSettings.keyboardShortcut.toUpperCase()}`
            : "Ctrl+Shift+T",
          lastUsed: newSettings.lastUsed || null,
          version: newSettings.version || "1.0.0",
        };
      },

      /**
       * 新形式に変換
       * @param {Object} legacySettings - レガシー形式の設定
       * @returns {Object} 新形式の設定
       * @private
       */
      _convertFromLegacyFormat(legacySettings) {
        const converted = {};

        if (legacySettings.opacity !== undefined) {
          converted.opacity = legacySettings.opacity;
        }

        if (legacySettings.isEnabled !== undefined) {
          converted.theaterModeEnabled = legacySettings.isEnabled;
        }

        if (legacySettings.shortcutKey !== undefined) {
          // "Ctrl+Shift+T" -> "t" に変換
          const match = legacySettings.shortcutKey.match(/Ctrl\+Shift\+(.)/i);
          if (match) {
            converted.keyboardShortcut = match[1].toLowerCase();
          }
        }

        if (legacySettings.lastUsed !== undefined) {
          converted.lastUsed = legacySettings.lastUsed;
        }

        if (legacySettings.version !== undefined) {
          converted.version = legacySettings.version;
        }

        return converted;
      },
    };
  }

  /**
   * レガシーコンポーネントを登録
   * @param {string} name - コンポーネント名
   * @param {Object} component - コンポーネントインスタンス
   */
  registerLegacyComponent(name, component) {
    this.legacyComponents.set(name, component);

    if (this.logger) {
      this.logger.debug(`Legacy component registered: ${name}`);
    }
  }

  /**
   * レガシーコンポーネントを取得
   * @param {string} name - コンポーネント名
   * @returns {Object|null} コンポーネントインスタンス
   */
  getLegacyComponent(name) {
    return this.legacyComponents.get(name) || null;
  }

  /**
   * グローバル変数として既存のAPIを公開
   * 既存コードとの互換性を保つため
   */
  exposeGlobalLegacyAPIs() {
    if (typeof window !== "undefined") {
      // TheaterModeController
      if (!window.TheaterModeController) {
        window.TheaterModeController = class {
          constructor() {
            return this.adapter.createLegacyTheaterModeController();
          }
        };
        window.TheaterModeController.prototype.adapter = this;
      }

      // ElementDetector
      if (!window.ElementDetector) {
        window.ElementDetector = this.createLegacyElementDetector();
      }

      // SettingsManager
      if (!window.SettingsManager) {
        window.SettingsManager = class {
          constructor() {
            return this.adapter.createLegacySettingsManager();
          }
        };
        window.SettingsManager.prototype.adapter = this;
      }

      if (this.logger) {
        this.logger.debug("Global legacy APIs exposed");
      }
    }
  }

  /**
   * レガシーモードを無効化
   * 新しい実装への完全移行後に呼び出す
   */
  disableLegacyMode() {
    this.legacyMode = false;

    if (this.logger) {
      this.logger.info("Legacy mode disabled");
    }
  }

  /**
   * レガシーモードが有効かどうか
   * @returns {boolean} レガシーモードが有効な場合true
   */
  isLegacyModeEnabled() {
    return this.legacyMode;
  }

  /**
   * 移行状況を取得
   * @returns {Object} 移行状況の情報
   */
  getMigrationStatus() {
    return {
      legacyModeEnabled: this.legacyMode,
      registeredComponents: Array.from(this.legacyComponents.keys()),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * リソースをクリーンアップ
   */
  cleanup() {
    this.legacyComponents.clear();

    if (this.logger) {
      this.logger.debug("LegacyAdapter cleaned up");
    }
  }
}

/**
 * 新しいLegacyAdapterインスタンスを作成
 * @param {Object} options - オプション
 * @returns {LegacyAdapter} 新しいLegacyAdapterインスタンス
 */
const createLegacyAdapter = (options) => {
  return new LegacyAdapter(options);
};

// CommonJS/ES6 両対応のエクスポート
if (typeof module !== "undefined" && module.exports) {
  module.exports = { LegacyAdapter, createLegacyAdapter };
} else if (typeof window !== "undefined") {
  window.LegacyAdapter = LegacyAdapter;
  window.createLegacyAdapter = createLegacyAdapter;
}
