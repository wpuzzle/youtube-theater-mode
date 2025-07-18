/**
 * YouTube Theater Mode - Button Functionality Test
 * シアターモード切り替えボタンの機能テスト（Node.js環境対応）
 */

// DOM環境をシミュレート
const { JSDOM } = require("jsdom");

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

// DOM環境をセットアップ
function setupDOMEnvironment() {
  const dom = new JSDOM(
    `
    <!DOCTYPE html>
    <html>
      <head>
        <title>YouTube Test</title>
      </head>
      <body>
        <div id="movie_player" class="html5-video-player">
          <div class="ytp-chrome-controls">
            <div class="ytp-right-controls">
              <!-- ボタンがここに追加される -->
            </div>
          </div>
          <video readyState="4"></video>
        </div>
      </body>
    </html>
  `,
    {
      url: "https://www.youtube.com/watch?v=test",
      pretendToBeVisual: true,
      resources: "usable",
    }
  );

  global.window = dom.window;
  global.document = dom.window.document;
  global.HTMLElement = dom.window.HTMLElement;
  global.Element = dom.window.Element;
  global.MouseEvent = dom.window.MouseEvent;
  global.CustomEvent = dom.window.CustomEvent;

  return dom;
}

// Content Scriptを読み込み
function loadContentScript() {
  const fs = require("fs");
  const path = require("path");

  const contentScriptPath = path.join(__dirname, "content.js");
  const contentScript = fs.readFileSync(contentScriptPath, "utf8");

  // グローバルスコープで実行
  eval(contentScript);
}

// テスト1: ボタンの基本機能テスト
async function testBasicButtonFunctionality() {
  const testName = "Basic Button Functionality";

  try {
    // DOM環境をセットアップ
    const dom = setupDOMEnvironment();

    // Content Scriptを読み込み
    loadContentScript();

    // TheaterModeControllerを初期化
    const controller = new TheaterModeController();

    // ボタンの初期化を待つ
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // ボタンが作成されているかチェック
    assertNotNull(controller.toggleButton, "Toggle button should be created");

    // ボタンがDOMに追加されているかチェック
    const buttonInDOM = document.querySelector(".theater-mode-toggle-button");
    assertNotNull(buttonInDOM, "Button should be added to DOM");

    // ボタンの基本属性をチェック
    assertEquals(
      controller.toggleButton.getAttribute("type"),
      "button",
      "Button type should be 'button'"
    );
    assertEquals(
      controller.toggleButton.getAttribute("aria-pressed"),
      "false",
      "Initial aria-pressed should be 'false'"
    );

    logTestResult(testName, true);

    // クリーンアップ
    controller.cleanup();
  } catch (error) {
    logTestResult(testName, false, error.message);
  }
}

// テスト2: ボタンクリック動作テスト
async function testButtonClickBehavior() {
  const testName = "Button Click Behavior";

  try {
    // DOM環境をセットアップ
    const dom = setupDOMEnvironment();

    // Content Scriptを読み込み
    loadContentScript();

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

    // aria-pressed属性が更新されたかチェック
    assertEquals(
      controller.toggleButton.getAttribute("aria-pressed"),
      "true",
      "aria-pressed should be 'true' when active"
    );

    // 再度クリック
    controller.toggleButton.dispatchEvent(clickEvent);

    // シアターモードが無効になったかチェック
    assertEquals(
      controller.isTheaterModeActive,
      false,
      "Theater mode should be inactive after second click"
    );

    // aria-pressed属性が更新されたかチェック
    assertEquals(
      controller.toggleButton.getAttribute("aria-pressed"),
      "false",
      "aria-pressed should be 'false' when inactive"
    );

    logTestResult(testName, true);

    // クリーンアップ
    controller.cleanup();
  } catch (error) {
    logTestResult(testName, false, error.message);
  }
}

// テスト3: ボタンアイコン更新テスト
async function testButtonIconUpdate() {
  const testName = "Button Icon Update";

  try {
    // DOM環境をセットアップ
    const dom = setupDOMEnvironment();

    // Content Scriptを読み込み
    loadContentScript();

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

    // シアターモードを有効化
    controller.enableTheaterMode();

    // 有効状態のアイコンをチェック
    const activeIcon = controller.toggleButton.innerHTML;
    assert(
      activeIcon.includes("<circle"),
      "Active button should contain circle indicator"
    );

    // シアターモードを無効化
    controller.disableTheaterMode();

    // 無効状態のアイコンをチェック
    const inactiveIcon = controller.toggleButton.innerHTML;
    assert(
      !inactiveIcon.includes("<circle"),
      "Inactive button should not contain circle indicator after disable"
    );

    logTestResult(testName, true);

    // クリーンアップ
    controller.cleanup();
  } catch (error) {
    logTestResult(testName, false, error.message);
  }
}

// テスト4: ボタン状態管理テスト
async function testButtonStateManagement() {
  const testName = "Button State Management";

  try {
    // DOM環境をセットアップ
    const dom = setupDOMEnvironment();

    // Content Scriptを読み込み
    loadContentScript();

    // TheaterModeControllerを初期化
    const controller = new TheaterModeController();

    // ボタンの初期化を待つ
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 初期状態のクラスをチェック
    assert(
      !controller.toggleButton.classList.contains("theater-mode-active"),
      "Button should not have active class initially"
    );

    // シアターモードを有効化
    controller.enableTheaterMode();

    // 有効状態のクラスをチェック
    assert(
      controller.toggleButton.classList.contains("theater-mode-active"),
      "Button should have active class when theater mode is enabled"
    );

    // ツールチップが更新されたかチェック
    assertEquals(
      controller.toggleButton.getAttribute("title"),
      "シアターモードを無効にする",
      "Tooltip should be updated for active state"
    );

    // シアターモードを無効化
    controller.disableTheaterMode();

    // 無効状態のクラスをチェック
    assert(
      !controller.toggleButton.classList.contains("theater-mode-active"),
      "Button should not have active class when theater mode is disabled"
    );

    // ツールチップが更新されたかチェック
    assertEquals(
      controller.toggleButton.getAttribute("title"),
      "シアターモードを有効にする",
      "Tooltip should be updated for inactive state"
    );

    logTestResult(testName, true);

    // クリーンアップ
    controller.cleanup();
  } catch (error) {
    logTestResult(testName, false, error.message);
  }
}

// 全テストを実行
async function runAllButtonFunctionalityTests() {
  console.log("🎬 YouTube Theater Mode - Button Functionality Tests");
  console.log("====================================================");

  const tests = [
    testBasicButtonFunctionality,
    testButtonClickBehavior,
    testButtonIconUpdate,
    testButtonStateManagement,
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

// Node.js環境での実行
if (require.main === module) {
  runAllButtonFunctionalityTests().catch(console.error);
}

module.exports = {
  runAllButtonFunctionalityTests,
  testBasicButtonFunctionality,
  testButtonClickBehavior,
  testButtonIconUpdate,
  testButtonStateManagement,
};
