/**
 * YouTube Theater Mode - Toggle Button Tests
 * シアターモード切り替えボタンの機能テスト
 */

// テスト用のモックYouTube環境を作成
function createMockYouTubeEnvironment() {
  // YouTube動画ページのURLを模擬
  Object.defineProperty(window, "location", {
    value: {
      href: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    },
    writable: true,
  });

  // 動画プレーヤーコンテナを作成
  const playerContainer = document.createElement("div");
  playerContainer.id = "movie_player";
  playerContainer.className = "html5-video-player";

  // プレーヤーコントロールを作成
  const chromeControls = document.createElement("div");
  chromeControls.className = "ytp-chrome-controls";

  const rightControls = document.createElement("div");
  rightControls.className = "ytp-right-controls";

  chromeControls.appendChild(rightControls);
  playerContainer.appendChild(chromeControls);
  document.body.appendChild(playerContainer);

  // 動画要素を作成
  const videoElement = document.createElement("video");
  videoElement.readyState = 4; // HAVE_ENOUGH_DATA
  playerContainer.appendChild(videoElement);

  return {
    playerContainer,
    chromeControls,
    rightControls,
    videoElement,
  };
}

// テスト環境をクリーンアップ
function cleanupTestEnvironment() {
  // 作成した要素を削除
  const playerContainer = document.getElementById("movie_player");
  if (playerContainer) {
    playerContainer.remove();
  }

  // ボディクラスをクリーンアップ
  document.body.classList.remove("theater-mode-active");

  // オーバーレイ要素を削除
  const overlays = document.querySelectorAll(".theater-mode-overlay");
  overlays.forEach((overlay) => overlay.remove());
}

// テスト結果を記録
const testResults = [];

function logTestResult(testName, passed, message = "") {
  const result = {
    test: testName,
    passed,
    message,
    timestamp: new Date().toISOString(),
  };
  testResults.push(result);

  const status = passed ? "✅ PASS" : "❌ FAIL";
  console.log(`${status}: ${testName}${message ? " - " + message : ""}`);
}

// アサーション関数
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || "Assertion failed");
  }
}

function assertEquals(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, but got ${actual}`);
  }
}

function assertNotNull(value, message) {
  if (value === null || value === undefined) {
    throw new Error(message || "Expected non-null value");
  }
}

// テスト1: ボタンの初期化テスト
async function testButtonInitialization() {
  const testName = "Button Initialization";

  try {
    // テスト環境を準備
    const mockEnv = createMockYouTubeEnvironment();

    // TheaterModeControllerを初期化
    const controller = new TheaterModeController();

    // ボタンの初期化を待つ
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // ボタンが作成されているかチェック
    assertNotNull(controller.toggleButton, "Toggle button should be created");

    // ボタンがDOMに追加されているかチェック
    const buttonInDOM = document.querySelector(".theater-mode-toggle-button");
    assertNotNull(buttonInDOM, "Button should be added to DOM");

    // ボタンのクラスが正しく設定されているかチェック
    assert(
      controller.toggleButton.classList.contains("ytp-button"),
      "Button should have ytp-button class"
    );
    assert(
      controller.toggleButton.classList.contains("theater-mode-toggle-button"),
      "Button should have theater-mode-toggle-button class"
    );

    // ボタンの属性が正しく設定されているかチェック
    assertEquals(
      controller.toggleButton.getAttribute("title"),
      "シアターモード切り替え",
      "Button title should be set correctly"
    );
    assertEquals(
      controller.toggleButton.getAttribute("aria-label"),
      "シアターモード切り替え",
      "Button aria-label should be set correctly"
    );

    // ボタンが正しい位置に配置されているかチェック
    const rightControls = document.querySelector(".ytp-right-controls");
    assertEquals(
      controller.toggleButton.parentNode,
      rightControls,
      "Button should be placed in right controls"
    );

    logTestResult(testName, true);

    // クリーンアップ
    controller.cleanup();
    cleanupTestEnvironment();
  } catch (error) {
    logTestResult(testName, false, error.message);
    cleanupTestEnvironment();
  }
}

// テスト2: ボタンクリック機能テスト
async function testButtonClickFunctionality() {
  const testName = "Button Click Functionality";

  try {
    // テスト環境を準備
    const mockEnv = createMockYouTubeEnvironment();

    // TheaterModeControllerを初期化
    const controller = new TheaterModeController();

    // ボタンの初期化を待つ
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 初期状態の確認
    assertEquals(
      controller.isTheaterModeActive,
      false,
      "Theater mode should be initially inactive"
    );

    // ボタンクリックをシミュレート
    const clickEvent = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
    });

    controller.toggleButton.dispatchEvent(clickEvent);

    // シアターモードが有効になったかチェック
    assertEquals(
      controller.isTheaterModeActive,
      true,
      "Theater mode should be active after first click"
    );

    // オーバーレイが作成されたかチェック
    assertNotNull(
      controller.overlayElement,
      "Overlay element should be created"
    );

    // ボディクラスが追加されたかチェック
    assert(
      document.body.classList.contains("theater-mode-active"),
      "Body should have theater-mode-active class"
    );

    // ボタンの状態が更新されたかチェック
    assert(
      controller.toggleButton.classList.contains("theater-mode-active"),
      "Button should have active class"
    );

    // 再度ボタンクリックをシミュレート
    controller.toggleButton.dispatchEvent(clickEvent);

    // シアターモードが無効になったかチェック
    assertEquals(
      controller.isTheaterModeActive,
      false,
      "Theater mode should be inactive after second click"
    );

    // ボディクラスが削除されたかチェック
    assert(
      !document.body.classList.contains("theater-mode-active"),
      "Body should not have theater-mode-active class"
    );

    // ボタンの状態が更新されたかチェック
    assert(
      !controller.toggleButton.classList.contains("theater-mode-active"),
      "Button should not have active class"
    );

    logTestResult(testName, true);

    // クリーンアップ
    controller.cleanup();
    cleanupTestEnvironment();
  } catch (error) {
    logTestResult(testName, false, error.message);
    cleanupTestEnvironment();
  }
}

// テスト3: ボタン状態表示テスト
async function testButtonStateDisplay() {
  const testName = "Button State Display";

  try {
    // テスト環境を準備
    const mockEnv = createMockYouTubeEnvironment();

    // TheaterModeControllerを初期化
    const controller = new TheaterModeController();

    // ボタンの初期化を待つ
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 初期状態のアイコンをチェック
    const initialIcon = controller.toggleButton.innerHTML;
    assert(initialIcon.includes("<svg"), "Button should contain SVG icon");
    assert(
      !initialIcon.includes("<circle"),
      "Inactive button should not contain circle indicator"
    );

    // 初期状態のツールチップをチェック
    assertEquals(
      controller.toggleButton.getAttribute("title"),
      "シアターモード切り替え",
      "Initial tooltip should be correct"
    );

    // シアターモードを有効化
    controller.enableTheaterMode();

    // 有効状態のアイコンをチェック
    const activeIcon = controller.toggleButton.innerHTML;
    assert(
      activeIcon.includes("<circle"),
      "Active button should contain circle indicator"
    );

    // 有効状態のツールチップをチェック
    assertEquals(
      controller.toggleButton.getAttribute("title"),
      "シアターモードを無効にする",
      "Active tooltip should be correct"
    );
    assertEquals(
      controller.toggleButton.getAttribute("aria-label"),
      "シアターモードを無効にする",
      "Active aria-label should be correct"
    );

    // 有効状態のクラスをチェック
    assert(
      controller.toggleButton.classList.contains("theater-mode-active"),
      "Active button should have active class"
    );

    // シアターモードを無効化
    controller.disableTheaterMode();

    // 無効状態のアイコンをチェック
    const inactiveIcon = controller.toggleButton.innerHTML;
    assert(
      !inactiveIcon.includes("<circle"),
      "Inactive button should not contain circle indicator"
    );

    // 無効状態のツールチップをチェック
    assertEquals(
      controller.toggleButton.getAttribute("title"),
      "シアターモードを有効にする",
      "Inactive tooltip should be correct"
    );
    assertEquals(
      controller.toggleButton.getAttribute("aria-label"),
      "シアターモードを有効にする",
      "Inactive aria-label should be correct"
    );

    // 無効状態のクラスをチェック
    assert(
      !controller.toggleButton.classList.contains("theater-mode-active"),
      "Inactive button should not have active class"
    );

    logTestResult(testName, true);

    // クリーンアップ
    controller.cleanup();
    cleanupTestEnvironment();
  } catch (error) {
    logTestResult(testName, false, error.message);
    cleanupTestEnvironment();
  }
}

// テスト4: ボタンの可視性テスト
async function testButtonVisibility() {
  const testName = "Button Visibility";

  try {
    // テスト環境を準備
    const mockEnv = createMockYouTubeEnvironment();

    // TheaterModeControllerを初期化
    const controller = new TheaterModeController();

    // ボタンの初期化を待つ
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // ボタンが可視状態かチェック
    assert(controller.isButtonVisible(), "Button should be visible");

    // ボタンを非表示にする
    controller.toggleButton.style.display = "none";

    // ボタンが非可視状態かチェック
    assert(
      !controller.isButtonVisible(),
      "Button should not be visible when display is none"
    );

    // ボタンを再表示
    controller.toggleButton.style.display = "";

    // ボタンが再び可視状態かチェック
    assert(controller.isButtonVisible(), "Button should be visible again");

    logTestResult(testName, true);

    // クリーンアップ
    controller.cleanup();
    cleanupTestEnvironment();
  } catch (error) {
    logTestResult(testName, false, error.message);
    cleanupTestEnvironment();
  }
}

// テスト5: ボタン再初期化テスト
async function testButtonReinitialization() {
  const testName = "Button Reinitialization";

  try {
    // テスト環境を準備
    const mockEnv = createMockYouTubeEnvironment();

    // TheaterModeControllerを初期化
    const controller = new TheaterModeController();

    // ボタンの初期化を待つ
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 初期ボタンの参照を保存
    const originalButton = controller.toggleButton;
    assertNotNull(originalButton, "Original button should exist");

    // ボタンを再初期化
    await controller.reinitializeButton();

    // 新しいボタンが作成されたかチェック
    assertNotNull(controller.toggleButton, "New button should be created");

    // 古いボタンが削除されたかチェック
    assert(
      !document.contains(originalButton),
      "Original button should be removed from DOM"
    );

    // 新しいボタンがDOMに追加されたかチェック
    assert(
      document.contains(controller.toggleButton),
      "New button should be added to DOM"
    );

    // 新しいボタンの機能をテスト
    const clickEvent = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
    });

    controller.toggleButton.dispatchEvent(clickEvent);
    assertEquals(
      controller.isTheaterModeActive,
      true,
      "New button should work correctly"
    );

    logTestResult(testName, true);

    // クリーンアップ
    controller.cleanup();
    cleanupTestEnvironment();
  } catch (error) {
    logTestResult(testName, false, error.message);
    cleanupTestEnvironment();
  }
}

// テスト6: エラーハンドリングテスト
async function testButtonErrorHandling() {
  const testName = "Button Error Handling";

  try {
    // YouTube以外のページでのテスト
    Object.defineProperty(window, "location", {
      value: {
        href: "https://www.example.com",
      },
      writable: true,
    });

    // TheaterModeControllerを初期化
    const controller = new TheaterModeController();

    // ボタンの初期化を待つ
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // ボタンが作成されていないことをチェック
    assertEquals(
      controller.toggleButton,
      null,
      "Button should not be created on non-YouTube pages"
    );

    // YouTube動画ページに変更
    Object.defineProperty(window, "location", {
      value: {
        href: "https://www.youtube.com/watch?v=test",
      },
      writable: true,
    });

    // ボタンコンテナが存在しない状態でテスト
    await controller.initializeToggleButton();

    // ボタンが作成されていないことをチェック（コンテナがないため）
    assertEquals(
      controller.toggleButton,
      null,
      "Button should not be created without container"
    );

    logTestResult(testName, true);

    // クリーンアップ
    controller.cleanup();
    cleanupTestEnvironment();
  } catch (error) {
    logTestResult(testName, false, error.message);
    cleanupTestEnvironment();
  }
}

// テスト7: イベント発火テスト
async function testButtonEventDispatching() {
  const testName = "Button Event Dispatching";

  try {
    // テスト環境を準備
    const mockEnv = createMockYouTubeEnvironment();

    // TheaterModeControllerを初期化
    const controller = new TheaterModeController();

    // ボタンの初期化を待つ
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // イベントリスナーを設定
    let buttonClickEventFired = false;
    let stateChangeEventFired = false;

    controller.onStateChange((event) => {
      if (event.type === "buttonClicked") {
        buttonClickEventFired = true;
      }
      if (event.type === "enabled" || event.type === "disabled") {
        stateChangeEventFired = true;
      }
    });

    // ボタンクリックをシミュレート
    const clickEvent = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
    });

    controller.toggleButton.dispatchEvent(clickEvent);

    // イベントが発火されたかチェック
    assert(buttonClickEventFired, "Button click event should be fired");
    assert(stateChangeEventFired, "State change event should be fired");

    logTestResult(testName, true);

    // クリーンアップ
    controller.cleanup();
    cleanupTestEnvironment();
  } catch (error) {
    logTestResult(testName, false, error.message);
    cleanupTestEnvironment();
  }
}

// 全テストを実行
async function runAllButtonTests() {
  console.log("🎬 YouTube Theater Mode - Toggle Button Tests");
  console.log("================================================");

  const tests = [
    testButtonInitialization,
    testButtonClickFunctionality,
    testButtonStateDisplay,
    testButtonVisibility,
    testButtonReinitialization,
    testButtonErrorHandling,
    testButtonEventDispatching,
  ];

  for (const test of tests) {
    try {
      await test();
    } catch (error) {
      console.error(`Unexpected error in test: ${error.message}`);
    }

    // テスト間の間隔
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // テスト結果のサマリー
  console.log("\n📊 Test Results Summary");
  console.log("========================");

  const totalTests = testResults.length;
  const passedTests = testResults.filter((result) => result.passed).length;
  const failedTests = totalTests - passedTests;

  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);
  console.log(
    `Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`
  );

  if (failedTests > 0) {
    console.log("\n❌ Failed Tests:");
    testResults
      .filter((result) => !result.passed)
      .forEach((result) => {
        console.log(`  - ${result.test}: ${result.message}`);
      });
  }

  return {
    total: totalTests,
    passed: passedTests,
    failed: failedTests,
    results: testResults,
  };
}

// テストを自動実行（ブラウザ環境の場合）
if (typeof window !== "undefined") {
  // ページ読み込み完了後にテストを実行
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runAllButtonTests);
  } else {
    runAllButtonTests();
  }
}

// Node.js環境での実行をサポート
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    runAllButtonTests,
    testButtonInitialization,
    testButtonClickFunctionality,
    testButtonStateDisplay,
    testButtonVisibility,
    testButtonReinitialization,
    testButtonErrorHandling,
    testButtonEventDispatching,
  };
}
