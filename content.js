/**
 * YouTube Theater Mode - Content Script
 * YouTube ページでシアターモード機能を提供するメインスクリプト
 */

// シアターモードコントローラークラス
class TheaterModeController {
  constructor() {
    this.isTheaterModeActive = false;
    this.currentOpacity = 0.7; // デフォルト透明度 70%
    this.toggleButton = null;
    this.overlayElements = [];
    this.initialized = false;
    this.settings = null;
    this.settingsManager = null;
  }

  /**
   * コントローラーを初期化
   */
  async initialize() {
    console.log("YouTube Theater Mode: コントローラー初期化開始");

    try {
      // 設定を読み込み
      this.settingsManager = new SettingsManager();
      this.settings = await this.settingsManager.loadSettings();
      this.currentOpacity = this.settings.opacity;
      this.isTheaterModeActive = this.settings.isEnabled;

      // YouTube動画プレーヤーを検出
      const player = await this.detectVideoPlayer();
      if (!player) {
        console.warn("YouTube Theater Mode: 動画プレーヤーが見つかりません");
        return false;
      }

      // キーボードショートカットを設定
      this.setupKeyboardShortcuts();

      // 初期状態に応じてシアターモードを適用
      if (this.isTheaterModeActive) {
        await this.applyTheaterMode();
      }

      this.initialized = true;
      console.log("YouTube Theater Mode: コントローラー初期化完了");
      return true;
    } catch (error) {
      console.error("YouTube Theater Mode: 初期化エラー", error);
      return false;
    }
  }

  /**
   * YouTube動画プレーヤーを検出
   * @returns {Promise<Element|null>} 動画プレーヤー要素またはnull
   */
  async detectVideoPlayer() {
    try {
      return await ElementDetector.detectVideoPlayerAsync();
    } catch (error) {
      console.error("YouTube Theater Mode: 動画プレーヤー検出エラー", error);
      return null;
    }
  }

  /**
   * シアターモード切り替えボタンを作成
   * 注: このメソッドは現在使用されていません（ボタンを削除したため）
   */
  async createToggleButton() {
    // ボタンは削除されたため、何もしない
    console.log("YouTube Theater Mode: ボタン作成はスキップされました");
    return;
  }

  /**
   * YouTubeの標準シアターモードボタンのクリックを監視
   * 注: このメソッドは現在使用されていません（YouTubeの標準ボタンとの連携を削除したため）
   */
  monitorYouTubeTheaterButton() {
    // YouTubeの標準シアターモードボタンとの連携は削除されました
    console.log(
      "YouTube Theater Mode: YouTubeの標準シアターモードボタンとの連携は無効化されています"
    );
    return;
  }

  /**
   * ボタンクリック処理
   */
  handleButtonClick() {
    console.log("YouTube Theater Mode: Button clicked");
    this.toggleTheaterMode();
  }

  /**
   * ボタンアイコンを更新
   */
  updateButtonIcon() {
    if (!this.toggleButton) return;

    // シアターモードアイコン
    const iconSvg = `
      <svg height="100%" version="1.1" viewBox="0 0 36 36" width="100%" style="pointer-events: none;">
        <g class="ytp-svg-fill" fill="currentColor">
          ${
            this.isTheaterModeActive
              ? `<path d="M27,9v18H9V9H27 M28,8H8v20h20V8L28,8z"/>`
              : `<path d="M28,11v14H8V11H28 M29,10H7v16h22V10L29,10z"/>`
          }
        </g>
      </svg>
    `;

    this.toggleButton.innerHTML = iconSvg;
  }

  /**
   * ボタンの状態を更新
   */
  updateButtonState() {
    // ボタンが削除されたため、何もしない
    // スクリーンリーダー向けに状態変更を通知
    const tooltipText = this.isTheaterModeActive
      ? "シアターモードを無効にする"
      : "シアターモードを有効にする";
    this.announceStateChange(tooltipText);
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
   * ボタンを削除
   */
  removeToggleButton() {
    if (this.toggleButton && this.toggleButton.parentNode) {
      this.toggleButton.parentNode.removeChild(this.toggleButton);
      this.toggleButton = null;
    }
  }

  /**
   * キーボードショートカットを設定
   */
  setupKeyboardShortcuts() {
    document.addEventListener("keydown", (event) => {
      // Ctrl+Shift+T でシアターモードを切り替え
      if (event.ctrlKey && event.shiftKey && event.key === "T") {
        this.toggleTheaterMode();
      }
    });
  }

  /**
   * シアターモードを切り替え
   * @returns {Promise<boolean>} 切り替え後の状態
   */
  async toggleTheaterMode() {
    try {
      if (this.isTheaterModeActive) {
        await this.disableTheaterMode();
      } else {
        await this.enableTheaterMode();
      }
      return this.isTheaterModeActive;
    } catch (error) {
      console.error(
        "YouTube Theater Mode: シアターモード切り替えエラー",
        error
      );
      return this.isTheaterModeActive;
    }
  }

  /**
   * シアターモードを有効化
   */
  async enableTheaterMode() {
    if (this.isTheaterModeActive) return;

    this.isTheaterModeActive = true;
    await this.applyTheaterMode();
    this.updateButtonState();
    this.saveSettings();

    // 状態変更を通知
    notifyStateChange(true, this.currentOpacity);

    console.log("YouTube Theater Mode: シアターモードを有効化しました");
  }

  /**
   * シアターモードを無効化
   */
  async disableTheaterMode() {
    if (!this.isTheaterModeActive) return;

    this.isTheaterModeActive = false;
    this.removeTheaterMode();
    this.updateButtonState();
    this.saveSettings();

    // 状態変更を通知
    notifyStateChange(false, this.currentOpacity);

    console.log("YouTube Theater Mode: シアターモードを無効化しました");
  }

  /**
   * シアターモードを適用
   */
  async applyTheaterMode() {
    // オーバーレイ対象要素を検出
    const targets = ElementDetector.findOverlayTargets();

    console.log(
      `YouTube Theater Mode: ${targets.length}個のオーバーレイ対象要素を検出しました`
    );

    // 各要素にオーバーレイを適用
    targets.forEach((element) => {
      if (!element.classList.contains("theater-mode-overlay")) {
        element.classList.add("theater-mode-overlay");
        // CSSで透明度を設定するため、ここでは個別に設定しない
        this.overlayElements.push(element);
      }
    });
  }

  /**
   * シアターモードを解除
   */
  removeTheaterMode() {
    // 全てのオーバーレイを削除
    this.overlayElements.forEach((element) => {
      element.classList.remove("theater-mode-overlay");
      element.style.opacity = "";
    });

    this.overlayElements = [];
  }

  /**
   * オーバーレイの透明度を更新
   * @param {number} opacity - 新しい透明度（0-1）
   */
  async updateOpacity(opacity) {
    // 透明度を5%単位に丸める（0.05単位）
    const roundedOpacity = Math.round(opacity * 20) / 20;

    // 透明度を範囲内に制限
    this.currentOpacity = Math.max(0, Math.min(0.9, roundedOpacity));

    // シアターモードが有効な場合は要素を更新
    if (this.isTheaterModeActive) {
      // 全てのオーバーレイ要素に対してカスタムプロパティを設定
      document.documentElement.style.setProperty(
        "--theater-mode-opacity",
        this.currentOpacity
      );

      // 各要素に直接透明度を設定（CSS変数が効かない場合のフォールバック）
      this.overlayElements.forEach((element) => {
        element.style.opacity = this.currentOpacity;

        // 一度クラスを削除して再追加することでスタイルを更新
        element.classList.remove("theater-mode-overlay");
        void element.offsetWidth; // リフロー強制
        element.classList.add("theater-mode-overlay");
      });
    }

    // 設定を保存
    this.saveSettings();

    // 状態変更を通知
    notifyStateChange(this.isTheaterModeActive, this.currentOpacity);

    console.log(
      `YouTube Theater Mode: 透明度を ${this.currentOpacity} (${Math.round(
        this.currentOpacity * 100
      )}%) に更新しました`
    );
  }

  /**
   * 設定を保存
   */
  async saveSettings() {
    if (!this.settingsManager) return;

    const settings = {
      ...this.settings,
      opacity: this.currentOpacity,
      isEnabled: this.isTheaterModeActive,
      lastUsed: Date.now(),
    };

    await this.settingsManager.saveSettings(settings);
  }

  /**
   * シアターモードが有効かどうかを返す
   * @returns {boolean} シアターモードが有効な場合true
   */
  isTheaterModeEnabled() {
    return this.isTheaterModeActive;
  }

  /**
   * 現在の状態を取得
   * @returns {Object} 現在の状態オブジェクト
   */
  getState() {
    return {
      isActive: this.isTheaterModeActive,
      opacity: this.currentOpacity,
      initialized: this.initialized,
    };
  }
}

// 要素検出ユーティリティクラス
class ElementDetector {
  /**
   * 複数のセレクターを試行して要素を検出（フォールバック機能付き）
   * @param {string|string[]} selectors - セレクター文字列または配列
   * @param {Element} context - 検索コンテキスト（デフォルト: document）
   * @returns {Element|null} 見つかった要素またはnull
   */
  static findElementWithFallback(selectors, context = document) {
    const selectorArray = Array.isArray(selectors) ? selectors : [selectors];

    for (const selector of selectorArray) {
      try {
        const element = context.querySelector(selector);
        if (element) {
          return element;
        }
      } catch (error) {
        console.warn(
          `YouTube Theater Mode: Invalid selector: ${selector}`,
          error
        );
      }
    }

    return null;
  }

  /**
   * 要素が表示されるまで待機
   * @param {string|string[]} selectors - セレクター文字列または配列
   * @param {number} timeout - タイムアウト時間（ミリ秒）
   * @returns {Promise<Element|null>} 見つかった要素またはnull
   */
  static waitForElement(selectors, timeout = 10000) {
    return new Promise((resolve) => {
      const startTime = Date.now();

      const checkElement = () => {
        const element = this.findElementWithFallback(selectors);

        if (element) {
          resolve(element);
          return;
        }

        if (Date.now() - startTime >= timeout) {
          resolve(null);
          return;
        }

        setTimeout(checkElement, 100);
      };

      checkElement();
    });
  }

  /**
   * 動画プレーヤーを確実に検出（非同期、リトライ機能付き）
   * @param {number} timeout - タイムアウト時間（ミリ秒）
   * @returns {Promise<Element|null>} 動画プレーヤー要素またはnull
   */
  static async detectVideoPlayerAsync(timeout = 15000) {
    const videoPlayerSelectors = [
      "#movie_player",
      ".html5-video-player",
      '[data-testid="video-player"]',
      ".ytp-player-content",
      "#player-container",
    ];

    return await this.waitForElement(videoPlayerSelectors, timeout);
  }

  /**
   * オーバーレイ対象要素を全て検出
   * @returns {Element[]} オーバーレイ対象要素の配列
   */
  static findOverlayTargets() {
    const overlaySelectors = [
      "#secondary", // サイドバー
      "#comments", // コメント欄
      "ytd-comments", // 新しいコメント欄
      "#masthead", // ヘッダー
      ".ytd-masthead", // ヘッダー（新UI）
      "#meta-contents", // 動画メタデータ
      ".ytd-watch-metadata", // 動画メタデータ（新UI）
      "#description", // 動画説明
      ".ytd-video-secondary-info-renderer", // 動画情報
      "#related", // 関連動画
      ".ytp-suggestion-set", // 動画終了時の提案
      "#chat", // ライブチャット
      "ytd-live-chat-frame", // ライブチャット（新UI）
    ];

    const protectedSelectors = [
      "#movie_player",
      ".html5-video-player",
      ".video-stream",
      ".ytp-chrome-controls",
      ".ytp-chrome-bottom",
    ];

    // オーバーレイ対象要素を検出
    const elements = [];
    overlaySelectors.forEach((selector) => {
      try {
        const found = document.querySelectorAll(selector);
        found.forEach((element) => {
          // 保護対象要素を除外
          let isProtected = false;
          for (const protectedSelector of protectedSelectors) {
            if (
              element.matches(protectedSelector) ||
              element.closest(protectedSelector)
            ) {
              isProtected = true;
              break;
            }
          }

          if (!isProtected) {
            elements.push(element);
          }
        });
      } catch (error) {
        console.warn(
          `YouTube Theater Mode: Error finding elements with selector ${selector}:`,
          error
        );
      }
    });

    return elements;
  }
}

// 設定管理クラス
class SettingsManager {
  constructor() {
    this.defaultSettings = {
      opacity: 0.7, // デフォルト透明度 70%
      isEnabled: false, // 初期状態は無効
      shortcutKey: "Ctrl+Shift+T", // デフォルトショートカット
      lastUsed: null, // 最終使用時刻
      version: "1.0.0", // 設定バージョン
    };

    this.currentSettings = { ...this.defaultSettings };
    this.settingsKey = "theaterModeSettings";
  }

  /**
   * 設定を読み込み
   * @returns {Promise<Object>} 設定オブジェクト
   */
  async loadSettings() {
    try {
      let storedSettings = null;

      // Chrome Storage API から読み込み
      if (
        typeof chrome !== "undefined" &&
        chrome.storage &&
        chrome.storage.sync
      ) {
        try {
          const result = await chrome.storage.sync.get([this.settingsKey]);
          storedSettings = result[this.settingsKey];
        } catch (error) {
          console.warn(
            "YouTube Theater Mode: Chrome Storage API error:",
            error
          );

          // localStorage にフォールバック
          const stored = localStorage.getItem(this.settingsKey);
          if (stored) {
            storedSettings = JSON.parse(stored);
          }
        }
      } else {
        // localStorage から読み込み
        const stored = localStorage.getItem(this.settingsKey);
        if (stored) {
          storedSettings = JSON.parse(stored);
        }
      }

      // 設定をマージ
      const settings = storedSettings
        ? { ...this.defaultSettings, ...storedSettings }
        : { ...this.defaultSettings };

      this.currentSettings = settings;
      return settings;
    } catch (error) {
      console.error("YouTube Theater Mode: Error loading settings:", error);
      return this.defaultSettings;
    }
  }

  /**
   * 設定を保存
   * @param {Object} settings - 保存する設定オブジェクト
   * @returns {Promise<boolean>} 保存成功時true
   */
  async saveSettings(settings) {
    try {
      const validatedSettings = { ...this.defaultSettings, ...settings };

      // Chrome Storage API で保存
      if (
        typeof chrome !== "undefined" &&
        chrome.storage &&
        chrome.storage.sync
      ) {
        try {
          await chrome.storage.sync.set({
            [this.settingsKey]: validatedSettings,
          });
        } catch (error) {
          console.error(
            "YouTube Theater Mode: Chrome Storage API error:",
            error
          );

          // フォールバック: localStorage を使用
          localStorage.setItem(
            this.settingsKey,
            JSON.stringify(validatedSettings)
          );
        }
      } else {
        // localStorage を使用
        localStorage.setItem(
          this.settingsKey,
          JSON.stringify(validatedSettings)
        );
      }

      this.currentSettings = validatedSettings;
      return true;
    } catch (error) {
      console.error("YouTube Theater Mode: Error saving settings:", error);
      return false;
    }
  }
}

/**
 * シアターモードの状態変更をバックグラウンドに通知する関数
 * @param {boolean} isActive - シアターモードが有効かどうか
 * @param {number} opacity - 現在の透明度
 */
function notifyStateChange(isActive, opacity) {
  try {
    chrome.runtime.sendMessage({
      action: "stateChanged",
      state: {
        isActive: isActive,
        opacity: opacity,
      },
    });
    console.log("YouTube Theater Mode: 状態変更を通知しました", {
      isActive,
      opacity,
    });
  } catch (error) {
    console.warn("YouTube Theater Mode: 状態変更通知エラー", error);
  }
}

// YouTube ページでのみ実行
if (window.location.href.includes("youtube.com")) {
  // DOMの読み込み完了後に初期化
  if (document.readyState === "complete") {
    initializeTheaterMode();
  } else {
    window.addEventListener("load", initializeTheaterMode);
  }
}

/**
 * シアターモードを初期化
 */
async function initializeTheaterMode() {
  console.log("YouTube Theater Mode: 初期化開始");

  // コントローラーを作成して初期化
  window.theaterModeController = new TheaterModeController();
  await window.theaterModeController.initialize();

  // ポップアップとの通信を設定
  setupPopupCommunication(window.theaterModeController);

  console.log("YouTube Theater Mode: 初期化完了");
}

/**
 * ポップアップとの通信を設定
 * @param {TheaterModeController} controller - シアターモードコントローラー
 */
function setupPopupCommunication(controller) {
  // メッセージリスナーを設定
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("YouTube Theater Mode: メッセージを受信", message);

    try {
      if (message.action === "toggleTheaterMode") {
        try {
          // メッセージに enabled プロパティがある場合は、その値に設定する
          if (message.enabled !== undefined) {
            console.log(
              `YouTube Theater Mode: シアターモードを ${
                message.enabled ? "有効" : "無効"
              } に設定します`
            );

            // 即座に応答を返す
            sendResponse({
              success: true,
              isActive: message.enabled,
            });

            // 非同期処理を開始（応答を返した後に実行）
            setTimeout(async () => {
              try {
                if (message.enabled) {
                  await controller.enableTheaterMode();
                } else {
                  await controller.disableTheaterMode();
                }
                console.log(
                  `YouTube Theater Mode: シアターモードを ${
                    message.enabled ? "有効" : "無効"
                  } に設定しました`
                );
              } catch (error) {
                console.error(
                  "YouTube Theater Mode: シアターモード設定エラー",
                  error
                );
              }
            }, 0);
          } else {
            // enabled プロパティがない場合は、現在の状態を反転する
            const currentState = controller.isTheaterModeEnabled();

            // 即座に応答を返す（トグル後の状態を予測）
            sendResponse({
              success: true,
              isActive: !currentState,
            });

            // 非同期処理を開始（応答を返した後に実行）
            setTimeout(() => {
              controller
                .toggleTheaterMode()
                .then(() => {
                  console.log("YouTube Theater Mode: トグル処理完了");
                })
                .catch((error) => {
                  console.error(
                    "YouTube Theater Mode: トグル処理エラー",
                    error
                  );
                });
            }, 0);
          }

          return true;
        } catch (error) {
          console.error("YouTube Theater Mode: トグル処理エラー", error);
          sendResponse({
            success: false,
            error: error.message || "Unknown error",
          });
          return true;
        }
      }

      if (message.action === "updateOpacity" && message.opacity !== undefined) {
        const opacity = message.opacity;
        // 非同期処理を開始
        controller
          .updateOpacity(opacity)
          .then(() => {
            console.log(
              `YouTube Theater Mode: 透明度を ${opacity} に更新しました`
            );
          })
          .catch((error) => {
            console.error("YouTube Theater Mode: 透明度更新エラー", error);
          });

        sendResponse({ success: true, opacity: opacity });
        return true;
      }

      if (message.action === "getState") {
        sendResponse({ success: true, state: controller.getState() });
        return true;
      }

      if (message.action === "syncState" && message.state) {
        // バックグラウンドからの状態同期を処理
        const state = message.state;

        // 非同期処理を開始
        Promise.resolve().then(async () => {
          try {
            // シアターモードの状態を同期
            if (
              state.theaterModeEnabled !== undefined &&
              state.theaterModeEnabled !== controller.isTheaterModeActive
            ) {
              if (state.theaterModeEnabled) {
                await controller.enableTheaterMode();
              } else {
                await controller.disableTheaterMode();
              }
            }

            // 透明度を同期
            if (
              state.opacity !== undefined &&
              state.opacity !== controller.currentOpacity
            ) {
              await controller.updateOpacity(state.opacity);
            }
          } catch (error) {
            console.error("YouTube Theater Mode: 状態同期エラー", error);
          }
        });

        // 即座に応答を返す
        sendResponse({ success: true, state: controller.getState() });
        return true;
      }

      if (message.action === "setDefaultOpacity") {
        const defaultOpacity = message.opacity || 0.7;
        // 非同期処理を開始
        controller
          .updateOpacity(defaultOpacity)
          .then(() => {
            console.log(
              `YouTube Theater Mode: デフォルト透明度 ${defaultOpacity} に設定しました`
            );
          })
          .catch((error) => {
            console.error(
              "YouTube Theater Mode: デフォルト透明度設定エラー",
              error
            );
          });

        sendResponse({ success: true, opacity: defaultOpacity });
        return true;
      }

      sendResponse({ success: false, error: "Unknown action" });
      return true;
    } catch (error) {
      console.error("YouTube Theater Mode: メッセージ処理エラー", error);
      sendResponse({ success: false, error: error.message || "Unknown error" });
      return true;
    }
  });
}
