/**
 * YouTube Theater Mode - ショートカットキー保護統合テスト
 * シアターモード有効時に YouTube の標準ショートカットキーが正常に動作することを確認するテスト
 */

// YouTubeShortcutProtection クラスをインポート
const { YouTubeShortcutProtection } = require("./youtube-shortcut-protection");

// モックTheaterModeController
class MockTheaterModeController {
  constructor() {
    this.isTheaterModeActive = true;
    this.overlayElement = document.createElement("div");
    this.overlayElement.className = "theater-mode-overlay";
  }
}

// テスト関数
function runShortcutProtectionTests() {
  console.log("=== YouTube ショートカットキー保護テスト開始 ===");

  // テスト環境のセットアップ
  const mockController = new MockTheaterModeController();
  const shortcutProtection = new YouTubeShortcutProtection();

  // 初期化テスト
  console.log("テスト: 初期化");
  shortcutProtection.initialize(mockController);
  console.assert(
    shortcutProtection.initialized === true,
    "初期化フラグが設定されていません"
  );

  // キーイベントハンドリングのテスト
  console.log("テスト: キーイベントハンドリング");

  // スペースキーのテスト
  const spaceKeyEvent = new KeyboardEvent("keydown", { key: " " });
  shortcutProtection.handleKeyDown(spaceKeyEvent);

  // 矢印キーのテスト
  const arrowLeftEvent = new KeyboardEvent("keydown", { key: "ArrowLeft" });
  shortcutProtection.handleKeyDown(arrowLeftEvent);

  // フルスクリーンキーのテスト
  const fKeyEvent = new KeyboardEvent("keydown", { key: "f" });
  shortcutProtection.handleKeyDown(fKeyEvent);

  // 修飾キー付きのテスト（無視されるべき）
  const ctrlKeyEvent = new KeyboardEvent("keydown", {
    key: "f",
    ctrlKey: true,
  });
  shortcutProtection.handleKeyDown(ctrlKeyEvent);

  // オーバーレイ設定のテスト
  console.log("テスト: オーバーレイ設定");
  const testOverlay = document.createElement("div");
  testOverlay.className = "theater-mode-overlay";
  shortcutProtection.configureOverlayForEventPropagation(testOverlay);
  console.assert(
    testOverlay.style.pointerEvents === "none",
    "オーバーレイのpointer-eventsがnoneに設定されていません"
  );

  console.log("=== YouTube ショートカットキー保護テスト完了 ===");
}

// テスト実行
if (typeof window !== "undefined") {
  window.addEventListener("DOMContentLoaded", runShortcutProtectionTests);
} else {
  console.log("ブラウザ環境でのみテストを実行できます");
}
