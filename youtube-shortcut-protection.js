/**
 * YouTube ショートカットキー保護機能
 * シアターモード有効時に YouTube の標準ショートカットキーが正常に動作するようにする
 */

class YouTubeShortcutProtection {
  constructor() {
    // YouTube の標準ショートカットキーのマッピング
    this.youtubeShortcuts = {
      " ": "togglePlayPause", // スペースキー: 再生/一時停止
      k: "togglePlayPause", // k: 再生/一時停止
      ArrowLeft: "seekBackward", // 左矢印: 5秒巻き戻し
      j: "seekBackward", // j: 10秒巻き戻し
      ArrowRight: "seekForward", // 右矢印: 5秒早送り
      l: "seekForward", // l: 10秒早送り
      ArrowUp: "volumeUp", // 上矢印: 音量アップ
      ArrowDown: "volumeDown", // 下矢印: 音量ダウン
      m: "toggleMute", // m: ミュート切り替え
      f: "toggleFullscreen", // f: フルスクリーン切り替え
      0: "seekToStart", // 0: 動画の先頭へ
      1: "seekToPosition10", // 1: 動画の10%の位置へ
      2: "seekToPosition20", // 2: 動画の20%の位置へ
      3: "seekToPosition30", // 3: 動画の30%の位置へ
      4: "seekToPosition40", // 4: 動画の40%の位置へ
      5: "seekToPosition50", // 5: 動画の50%の位置へ
      6: "seekToPosition60", // 6: 動画の60%の位置へ
      7: "seekToPosition70", // 7: 動画の70%の位置へ
      8: "seekToPosition80", // 8: 動画の80%の位置へ
      9: "seekToPosition90", // 9: 動画の90%の位置へ
      c: "toggleCaptions", // c: 字幕の表示/非表示
      i: "toggleMiniPlayer", // i: ミニプレーヤーモード
      t: "toggleTheater", // t: YouTubeのシアターモード
    };

    // シアターモード拡張機能のショートカットキー
    this.theaterModeShortcut = "Ctrl+Shift+T";

    // 初期化済みフラグ
    this.initialized = false;
  }

  /**
   * ショートカットキー保護機能を初期化
   * @param {TheaterModeController} theaterModeController - シアターモードコントローラーのインスタンス
   */
  initialize(theaterModeController) {
    if (this.initialized) return;

    this.theaterModeController = theaterModeController;
    this.setupShortcutProtection();
    this.initialized = true;

    console.log("YouTube Theater Mode: Shortcut protection initialized");
  }

  /**
   * ショートカットキー保護機能をセットアップ
   */
  setupShortcutProtection() {
    // キーダウンイベントをキャプチャフェーズで監視
    document.addEventListener("keydown", this.handleKeyDown.bind(this), true);

    // シアターモードオーバーレイのイベント伝播を確保
    this.ensureEventPropagation();

    console.log(
      "YouTube Theater Mode: Keyboard shortcut protection setup complete"
    );
  }

  /**
   * キーダウンイベントハンドラー
   * @param {KeyboardEvent} event - キーボードイベント
   */
  handleKeyDown(event) {
    // シアターモードが有効でない場合は何もしない
    if (
      !this.theaterModeController ||
      !this.theaterModeController.isTheaterModeActive
    ) {
      return;
    }

    // 修飾キーの状態を取得
    const hasCtrl = event.ctrlKey;
    const hasShift = event.shiftKey;
    const hasAlt = event.altKey;
    const hasMeta = event.metaKey;

    // 入力フィールドでのキー入力は処理しない（コメント入力など）
    if (this.isInputFieldFocused()) {
      return;
    }

    // キーの正規化（大文字小文字を区別しない）
    const key = event.key.toLowerCase();

    // シアターモード拡張機能のショートカットキーの場合は処理しない（既に別の場所で処理されている）
    if (hasCtrl && hasShift && key === "t") {
      return;
    }

    // YouTube の標準ショートカットキーの場合
    if (!hasCtrl && !hasAlt && !hasMeta && this.youtubeShortcuts[key]) {
      // イベントの伝播を妨げない（YouTubeの標準ハンドラーに届くようにする）
      console.log(
        `YouTube Theater Mode: Protected shortcut key detected: ${key}`
      );

      // 特定のショートカットキーに対する追加処理
      const action = this.youtubeShortcuts[key];

      // 全画面表示切り替えの場合は特別な処理
      if (action === "toggleFullscreen") {
        this.ensureFullscreenWorks();
      }

      // シークバー操作の場合は動画プレーヤーにフォーカスを当てる
      if (action === "seekBackward" || action === "seekForward") {
        this.focusVideoPlayer();
      }
    }
  }

  /**
   * 入力フィールドにフォーカスがあるかどうかを確認
   * @returns {boolean} 入力フィールドにフォーカスがある場合true
   */
  isInputFieldFocused() {
    const activeElement = document.activeElement;
    const inputTags = ["input", "textarea", "select", "button"];

    if (!activeElement) return false;

    // タグ名で判定
    if (inputTags.includes(activeElement.tagName.toLowerCase())) {
      return true;
    }

    // contenteditable属性で判定
    if (activeElement.getAttribute("contenteditable") === "true") {
      return true;
    }

    // YouTubeのコメント入力欄などの特殊なケース
    if (
      activeElement.classList.contains("ytd-commentbox") ||
      activeElement.closest(".ytd-commentbox") ||
      activeElement.closest("[contenteditable]")
    ) {
      return true;
    }

    return false;
  }

  /**
   * オーバーレイがイベント伝播を妨げないようにする
   */
  ensureEventPropagation() {
    // MutationObserverを使用してオーバーレイ要素を監視
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length) {
          mutation.addedNodes.forEach((node) => {
            if (
              node.classList &&
              node.classList.contains("theater-mode-overlay")
            ) {
              this.configureOverlayForEventPropagation(node);
            }
          });
        }
      });
    });

    // body要素の子要素の追加を監視
    observer.observe(document.body, { childList: true });
  }

  /**
   * オーバーレイ要素がイベント伝播を妨げないように設定
   * @param {HTMLElement} overlayElement - オーバーレイ要素
   */
  configureOverlayForEventPropagation(overlayElement) {
    if (!overlayElement) return;

    // pointer-eventsをnoneに設定してマウスイベントが下の要素に届くようにする
    overlayElement.style.pointerEvents = "none";

    console.log(
      "YouTube Theater Mode: Overlay configured for event propagation"
    );
  }

  /**
   * 動画プレーヤー要素を取得
   * @returns {HTMLElement|null} 動画プレーヤー要素またはnull
   */
  getVideoPlayer() {
    // YouTubeの動画プレーヤー要素を検索
    return (
      document.querySelector("#movie_player") ||
      document.querySelector(".html5-video-player") ||
      document.querySelector('[data-testid="video-player"]')
    );
  }

  /**
   * 動画要素を取得
   * @returns {HTMLVideoElement|null} video要素またはnull
   */
  getVideoElement() {
    const player = this.getVideoPlayer();
    return player ? player.querySelector("video") : null;
  }

  /**
   * 全画面表示が正常に動作するようにする
   * シアターモード有効時に全画面表示切り替えが正常に動作するための処理
   */
  ensureFullscreenWorks() {
    try {
      // 動画プレーヤーを取得
      const player = this.getVideoPlayer();
      if (!player) {
        console.warn(
          "YouTube Theater Mode: Video player not found for fullscreen operation"
        );
        return;
      }

      // フルスクリーンボタンにフォーカスを当てる
      const fullscreenButton = player.querySelector(".ytp-fullscreen-button");
      if (fullscreenButton) {
        // フォーカスを当てるだけで、クリックはYouTubeの標準ハンドラーに任せる
        fullscreenButton.focus();
        console.log("YouTube Theater Mode: Focused fullscreen button");
      }

      // オーバーレイがフルスクリーン操作を妨げないようにする
      if (
        this.theaterModeController &&
        this.theaterModeController.overlayElement
      ) {
        // フルスクリーン中はオーバーレイの表示を一時的に調整
        document.addEventListener(
          "fullscreenchange",
          this.handleFullscreenChange.bind(this),
          { once: true }
        );
      }
    } catch (error) {
      console.error(
        "YouTube Theater Mode: Error ensuring fullscreen works",
        error
      );
    }
  }

  /**
   * フルスクリーン状態変更時のハンドラー
   */
  handleFullscreenChange() {
    try {
      const isFullscreen = !!document.fullscreenElement;
      console.log(
        `YouTube Theater Mode: Fullscreen state changed: ${
          isFullscreen ? "enabled" : "disabled"
        }`
      );

      // フルスクリーン状態に応じてオーバーレイを調整
      if (
        this.theaterModeController &&
        this.theaterModeController.overlayElement
      ) {
        if (isFullscreen) {
          // フルスクリーン時はオーバーレイを一時的に非表示
          this.theaterModeController.overlayElement.style.display = "none";
          console.log(
            "YouTube Theater Mode: Overlay temporarily hidden for fullscreen"
          );
        } else {
          // フルスクリーン解除時はオーバーレイを再表示
          setTimeout(() => {
            if (
              this.theaterModeController &&
              this.theaterModeController.overlayElement
            ) {
              this.theaterModeController.overlayElement.style.display = "";
              console.log(
                "YouTube Theater Mode: Overlay restored after fullscreen exit"
              );
            }
          }, 300); // 少し遅延させて画面遷移後に表示
        }
      }
    } catch (error) {
      console.error(
        "YouTube Theater Mode: Error handling fullscreen change",
        error
      );
    }
  }

  /**
   * 動画プレーヤーにフォーカスを当てる
   * シーク操作などが正常に動作するようにするため
   */
  focusVideoPlayer() {
    try {
      // 動画プレーヤーを取得
      const player = this.getVideoPlayer();
      if (!player) {
        console.warn("YouTube Theater Mode: Video player not found for focus");
        return;
      }

      // プレーヤーにフォーカスを当てる
      player.focus();
      console.log(
        "YouTube Theater Mode: Video player focused for keyboard shortcuts"
      );

      // 動画要素を取得してフォーカスを当てる（代替手段）
      const videoElement = this.getVideoElement();
      if (videoElement && !document.activeElement.contains(videoElement)) {
        videoElement.focus();
        console.log("YouTube Theater Mode: Video element focused as fallback");
      }
    } catch (error) {
      console.error("YouTube Theater Mode: Error focusing video player", error);
    }
  }
}

// エクスポート
if (typeof module !== "undefined") {
  module.exports = { YouTubeShortcutProtection };
}
