/**
 * YouTube Theater Mode - アクセシビリティ改善
 * スクリーンリーダー対応、キーボードナビゲーション、色覚異常対応の改善
 */

/**
 * スクリーンリーダー向けに状態変更を通知する関数
 * TheaterModeControllerクラスに追加する
 *
 * @param {string} message - 通知メッセージ
 */
function announceStateChange(message) {
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
 * アクセシビリティ改善を適用する
 * この関数は、content.jsが読み込まれた後に実行する
 */
function applyAccessibilityImprovements() {
  // TheaterModeControllerクラスのプロトタイプに関数を追加
  if (typeof TheaterModeController !== "undefined") {
    // announceStateChange関数を追加
    TheaterModeController.prototype.announceStateChange = announceStateChange;

    // 既存のupdateButtonState関数をオーバーライド
    const originalUpdateButtonState =
      TheaterModeController.prototype.updateButtonState;
    TheaterModeController.prototype.updateButtonState = function () {
      // 元の関数を呼び出す
      originalUpdateButtonState.call(this);

      // ボタンが存在する場合のみ追加処理
      if (this.toggleButton) {
        // スクリーンリーダー向けに状態変更を通知
        const tooltipText = this.isTheaterModeActive
          ? "シアターモードを無効にする"
          : "シアターモードを有効にする";
        this.announceStateChange(tooltipText);
      }
    };

    // 既存のcreateToggleButton関数をオーバーライド
    const originalCreateToggleButton =
      TheaterModeController.prototype.createToggleButton;
    TheaterModeController.prototype.createToggleButton = async function () {
      // 元の関数を呼び出す
      await originalCreateToggleButton.call(this);

      // ボタンが存在する場合のみ追加処理
      if (this.toggleButton) {
        // アクセシビリティ属性を追加
        this.toggleButton.classList.add("theater-mode-button");
        this.toggleButton.setAttribute("data-theater-mode-button", "true");
        this.toggleButton.setAttribute("tabindex", "0");

        // キーボードイベントリスナーを追加
        this.toggleButton.addEventListener("keydown", (event) => {
          // Enter または Space キーでボタンをアクティブ化
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            event.stopPropagation();
            this.handleButtonClick();
          }
        });
      }
    };

    console.log("YouTube Theater Mode: アクセシビリティ改善が適用されました");
  } else {
    console.warn(
      "YouTube Theater Mode: TheaterModeControllerクラスが見つかりません"
    );
  }
}

// DOMの読み込み完了後にアクセシビリティ改善を適用
if (document.readyState === "complete") {
  applyAccessibilityImprovements();
} else {
  window.addEventListener("load", () => {
    setTimeout(applyAccessibilityImprovements, 1000);
  });
}
