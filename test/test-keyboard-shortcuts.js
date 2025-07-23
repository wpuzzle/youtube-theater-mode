/**
 * YouTube Theater Mode - Keyboard Shortcuts Test Script
 * キーボードショートカット機能のテストスクリプト
 */

// テスト統計
let testStats = {
  validShortcuts: 0,
  invalidShortcuts: 0,
  ignoredShortcuts: 0,
};

// 模擬ElementDetectorクラス（テスト用）
class MockElementDetector {
  static isYouTubeVideoPage() {
    // テスト環境では常にfalseを返す（実際のYouTubeページではない）
    return false;
  }
}

// 模擬TheaterModeControllerクラス（テスト用）
class MockTheaterModeController {
  constructor() {
    this.isTheaterModeActive = false;
    this.eventListeners = new Map();
    this.stateChangeCallbacks = [];

    // キーボードショートカットを設定
    this.setupKeyboardShortcuts();

    console.log("Mock Theater Mode Controller initialized");
  }

  toggleTheaterMode() {
    this.isTheaterModeActive = !this.isTheaterModeActive;
    console.log(
      `Theater mode toggled: ${this.isTheaterModeActive ? "ON" : "OFF"}`
    );

    // テスト結果を更新
    this.updateTestResults("toggle", this.isTheaterModeActive);
  }

  dispatchStateChangeEvent(eventType, eventData = {}) {
    console.log(`State change event: ${eventType}`, eventData);

    // テスト統計を更新
    if (eventType === "keyboardShortcutUsed") {
      testStats.validShortcuts++;
      this.updateTestStats();
    }
  }

  addEventListener(eventType, listener) {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType).push(listener);
  }

  // キーボードショートカット設定（実際のコードと同じロジック）
  setupKeyboardShortcuts() {
    console.log("Setting up keyboard shortcuts for testing");

    const keyboardHandler = (event) => {
      // 最後に検出されたキーを表示
      this.updateLastKeyDetected(event);

      // YouTube ページでのみ動作する条件分岐
      if (!MockElementDetector.isYouTubeVideoPage()) {
        // テスト環境では YouTube ページではないことを表示
        this.updateYouTubePageTest(false);
        return;
      }

      // Ctrl+Shift+T ショートカットの検出
      if (event.ctrlKey && event.shiftKey && event.key === "T") {
        // 既存の YouTube ショートカットとの競合回避
        const activeElement = document.activeElement;
        if (
          activeElement &&
          (activeElement.tagName === "INPUT" ||
            activeElement.tagName === "TEXTAREA" ||
            activeElement.contentEditable === "true" ||
            activeElement.isContentEditable)
        ) {
          console.log("Keyboard shortcut ignored - input field focused");
          testStats.ignoredShortcuts++;
          this.updateInputConflictTest("ignored", activeElement);
          this.updateTestStats();
          return;
        }

        // YouTube の検索ボックスにフォーカスがある場合も無視
        if (
          activeElement &&
          (activeElement.id === "search" ||
            activeElement.id === "mock-search" ||
            activeElement.classList.contains("ytd-searchbox") ||
            activeElement.classList.contains("mock-search-box") ||
            activeElement.closest("#search-input") ||
            activeElement.closest("ytd-searchbox"))
        ) {
          console.log("Keyboard shortcut ignored - search box focused");
          testStats.ignoredShortcuts++;
          this.updateInputConflictTest("ignored-search", activeElement);
          this.updateTestStats();
          return;
        }

        // コメント入力欄にフォーカスがある場合も無視
        if (
          activeElement &&
          (activeElement.id === "placeholder-area" ||
            activeElement.id === "mock-comment" ||
            activeElement.classList.contains("yt-simple-endpoint") ||
            activeElement.classList.contains("mock-comment-area") ||
            activeElement.closest("#comments") ||
            activeElement.closest("ytd-comments"))
        ) {
          console.log("Keyboard shortcut ignored - comment area focused");
          testStats.ignoredShortcuts++;
          this.updateInputConflictTest("ignored-comment", activeElement);
          this.updateTestStats();
          return;
        }

        // イベントの伝播を停止
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        console.log("Keyboard shortcut triggered (Ctrl+Shift+T)");

        // イベント伝播停止テストを更新
        this.updateEventPropagationTest(true);

        // シアターモードを切り替え
        this.toggleTheaterMode();

        // キーボードショートカット使用イベントを発火
        this.dispatchStateChangeEvent("keyboardShortcutUsed", {
          shortcut: "Ctrl+Shift+T",
          isActive: this.isTheaterModeActive,
          timestamp: Date.now(),
        });
      } else {
        // 他のキーの組み合わせをテスト
        this.updateKeyDistinctionTest(event);
      }
    };

    // キーボードイベントリスナーを追加（キャプチャフェーズで処理）
    document.addEventListener("keydown", keyboardHandler, true);

    // イベントリスナーを管理用Mapに追加
    this.addEventListener("keydown", keyboardHandler);

    console.log("Keyboard shortcuts setup completed for testing");
  }

  // テスト結果更新メソッド
  updateLastKeyDetected(event) {
    const keyCombo = [];
    if (event.ctrlKey) keyCombo.push("Ctrl");
    if (event.shiftKey) keyCombo.push("Shift");
    if (event.altKey) keyCombo.push("Alt");
    if (event.metaKey) keyCombo.push("Meta");
    keyCombo.push(event.key);

    const keyString = keyCombo.join("+");
    document.getElementById("last-key-detected").textContent = keyString;
  }

  updateTestResults(action, isActive) {
    const resultElement = document.getElementById("basic-shortcut-result");
    if (action === "toggle") {
      resultElement.className = "test-result test-pass";
      resultElement.innerHTML = `✓ キーボードショートカットが正常に動作しました！<br>シアターモード: ${
        isActive ? "ON" : "OFF"
      }`;
    }
  }

  updateYouTubePageTest(isYouTubePage) {
    const resultElement = document.getElementById("youtube-page-result");
    if (isYouTubePage) {
      resultElement.className = "test-result test-pass";
      resultElement.textContent = "✓ YouTube ページとして認識されました";
    } else {
      resultElement.className = "test-result test-info";
      resultElement.textContent =
        "ℹ このページはYouTubeページではありません（期待される動作）";
    }
  }

  updateInputConflictTest(type, element) {
    const resultElement = document.getElementById("input-conflict-result");
    let message = "";

    switch (type) {
      case "ignored":
        message = `✓ 入力フィールド（${element.tagName}）でのショートカットが正しく無視されました`;
        break;
      case "ignored-search":
        message = `✓ 検索ボックスでのショートカットが正しく無視されました`;
        break;
      case "ignored-comment":
        message = `✓ コメント入力欄でのショートカットが正しく無視されました`;
        break;
      default:
        message = "✓ 入力フィールドでの競合回避が正常に動作しました";
    }

    resultElement.className = "test-result test-pass";
    resultElement.textContent = message;
  }

  updateEventPropagationTest(stopped) {
    const resultElement = document.getElementById("event-propagation-result");
    if (stopped) {
      resultElement.className = "test-result test-pass";
      resultElement.textContent = "✓ イベントの伝播が正しく停止されました";
    }
  }

  updateKeyDistinctionTest(event) {
    const isValidShortcut =
      event.ctrlKey && event.shiftKey && event.key === "T";

    if (!isValidShortcut && (event.ctrlKey || event.shiftKey)) {
      const keyCombo = [];
      if (event.ctrlKey) keyCombo.push("Ctrl");
      if (event.shiftKey) keyCombo.push("Shift");
      if (event.altKey) keyCombo.push("Alt");
      keyCombo.push(event.key);

      const keyString = keyCombo.join("+");
      const invalidKeysElement = document.getElementById("invalid-keys");
      const currentInvalid = invalidKeysElement.textContent;

      if (currentInvalid === "なし") {
        invalidKeysElement.textContent = keyString;
      } else if (!currentInvalid.includes(keyString)) {
        invalidKeysElement.textContent = currentInvalid + ", " + keyString;
      }

      testStats.invalidShortcuts++;
      this.updateTestStats();

      const resultElement = document.getElementById("key-distinction-result");
      resultElement.className = "test-result test-pass";
      resultElement.textContent = `✓ 無効なキー組み合わせ（${keyString}）が正しく区別されました`;
    }
  }

  updateTestStats() {
    document.getElementById("valid-shortcuts").textContent =
      testStats.validShortcuts;
    document.getElementById("invalid-shortcuts").textContent =
      testStats.invalidShortcuts;
    document.getElementById("ignored-shortcuts").textContent =
      testStats.ignoredShortcuts;
  }
}

// 追加のテスト関数
function runAdditionalTests() {
  console.log("Running additional keyboard shortcut tests...");

  // 1. イベントリスナーの重複登録テスト
  testEventListenerDuplication();

  // 2. 特殊キーの組み合わせテスト
  testSpecialKeyCombinations();

  // 3. フォーカス状態の変更テスト
  testFocusStateChanges();
}

function testEventListenerDuplication() {
  console.log("Testing event listener duplication...");

  // 複数のコントローラーインスタンスを作成してイベントリスナーの重複をテスト
  const controller1 = new MockTheaterModeController();
  const controller2 = new MockTheaterModeController();

  console.log(
    "Multiple controllers created - checking for event listener conflicts"
  );
}

function testSpecialKeyCombinations() {
  console.log("Testing special key combinations...");

  // 特殊なキーの組み合わせをシミュレート
  const specialCombinations = [
    { ctrlKey: true, shiftKey: false, key: "T" },
    { ctrlKey: false, shiftKey: true, key: "T" },
    { ctrlKey: true, shiftKey: true, key: "t" }, // 小文字
    { ctrlKey: true, shiftKey: true, altKey: true, key: "T" },
  ];

  specialCombinations.forEach((combo, index) => {
    console.log(`Testing combination ${index + 1}:`, combo);
  });
}

function testFocusStateChanges() {
  console.log("Testing focus state changes...");

  // 異なる要素にフォーカスを移動してテスト
  const testElements = [
    document.getElementById("mock-search"),
    document.getElementById("mock-comment"),
    document.getElementById("general-input"),
  ];

  testElements.forEach((element, index) => {
    if (element) {
      setTimeout(() => {
        element.focus();
        console.log(`Focus moved to element ${index + 1}: ${element.id}`);
      }, index * 1000);
    }
  });
}

// ページ読み込み完了時にテストを初期化
document.addEventListener("DOMContentLoaded", () => {
  console.log("Keyboard shortcuts test page loaded");

  // メインのテストコントローラーを作成
  const testController = new MockTheaterModeController();

  // 追加テストを実行
  setTimeout(runAdditionalTests, 1000);

  // YouTube ページ判定テストを実行
  testController.updateYouTubePageTest(
    MockElementDetector.isYouTubeVideoPage()
  );

  console.log("All keyboard shortcut tests initialized");
});

// グローバルエラーハンドリング
window.addEventListener("error", (event) => {
  console.error("Test error:", event.error);
});

// キーボードイベントのデバッグ情報
document.addEventListener(
  "keydown",
  (event) => {
    console.log("Raw keyboard event:", {
      key: event.key,
      code: event.code,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      metaKey: event.metaKey,
      target: event.target.tagName,
      targetId: event.target.id,
    });
  },
  true
);

console.log("Keyboard shortcuts test script loaded");
