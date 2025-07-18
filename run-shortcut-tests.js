/**
 * YouTube Theater Mode - ショートカットキー保護テスト実行スクリプト
 */

// テスト対象のファイルをインポート
const { YouTubeShortcutProtection } = require("./youtube-shortcut-protection");

// モックオブジェクト
class MockTheaterModeController {
  constructor() {
    this.isTheaterModeActive = true;
    this.overlayElement = {
      style: {},
    };
  }
}

// テスト関数
function runTests() {
  console.log("=== YouTube ショートカットキー保護テスト開始 ===");

  // テスト1: 初期化
  testInitialization();

  // テスト2: キーイベント処理
  testKeyEventHandling();

  // テスト3: オーバーレイ設定
  testOverlayConfiguration();

  console.log("=== YouTube ショートカットキー保護テスト完了 ===");
}

// 初期化テスト
function testInitialization() {
  console.log("テスト: 初期化");

  const mockController = new MockTheaterModeController();
  const protection = new YouTubeShortcutProtection();

  protection.initialize(mockController);

  console.assert(
    protection.initialized === true,
    "初期化フラグが設定されていません"
  );
  console.assert(
    protection.theaterModeController === mockController,
    "コントローラーが正しく設定されていません"
  );

  console.log("初期化テスト完了");
}

// キーイベント処理テスト
function testKeyEventHandling() {
  console.log("テスト: キーイベント処理");

  const mockController = new MockTheaterModeController();
  const protection = new YouTubeShortcutProtection();
  protection.initialize(mockController);

  // スペースキーテスト
  const spaceEvent = {
    key: " ",
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    metaKey: false,
  };
  protection.handleKeyDown(spaceEvent);

  // 矢印キーテスト
  const arrowEvent = {
    key: "ArrowLeft",
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    metaKey: false,
  };
  protection.handleKeyDown(arrowEvent);

  // フルスクリーンキーテスト
  const fKeyEvent = {
    key: "f",
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    metaKey: false,
  };
  protection.handleKeyDown(fKeyEvent);

  // 修飾キー付きテスト（無視されるべき）
  const ctrlKeyEvent = {
    key: "f",
    ctrlKey: true,
    shiftKey: false,
    altKey: false,
    metaKey: false,
  };
  protection.handleKeyDown(ctrlKeyEvent);

  console.log("キーイベント処理テスト完了");
}

// オーバーレイ設定テスト
function testOverlayConfiguration() {
  console.log("テスト: オーバーレイ設定");

  const protection = new YouTubeShortcutProtection();

  // モックオーバーレイ要素
  const mockOverlay = { style: {} };

  protection.configureOverlayForEventPropagation(mockOverlay);

  console.assert(
    mockOverlay.style.pointerEvents === "none",
    "オーバーレイのpointer-eventsがnoneに設定されていません"
  );

  console.log("オーバーレイ設定テスト完了");
}

// テスト実行
if (typeof window === "undefined") {
  // Node.js環境での実行
  runTests();
} else {
  // ブラウザ環境での実行
  window.runShortcutTests = runTests;
}
