/**
 * ContentScriptCommunicator テストランナー
 * ContentScriptCommunicatorの単体テストを実行する
 */

// 必要な依存関係を読み込み
const dependencies = [
  "../infrastructure/logger.js",
  "../infrastructure/error-handler.js",
  "../infrastructure/message-bus.js",
  "../infrastructure/content-script-communicator.js",
  "./test-content-script-communicator.js",
];

/**
 * スクリプトを動的に読み込む
 * @param {string} src - スクリプトのパス
 * @returns {Promise<void>}
 */
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

/**
 * 全ての依存関係を読み込む
 * @returns {Promise<void>}
 */
async function loadDependencies() {
  console.log("Loading dependencies...");

  for (const dep of dependencies) {
    try {
      await loadScript(dep);
      console.log(`✅ Loaded: ${dep}`);
    } catch (error) {
      console.error(`❌ Failed to load: ${dep}`, error);
      throw error;
    }
  }

  console.log("All dependencies loaded successfully!");
}

/**
 * テスト環境をセットアップ
 */
function setupTestEnvironment() {
  console.log("Setting up test environment...");

  // Performance API のモック（古いブラウザ対応）
  if (typeof performance === "undefined") {
    window.performance = {
      now: () => Date.now(),
    };
  }

  // Chrome API の基本モック（テスト内で詳細なモックに置き換えられる）
  if (typeof chrome === "undefined") {
    window.chrome = {
      runtime: {
        onMessage: {
          addListener: () => {},
          removeListener: () => {},
        },
        onDisconnect: {
          addListener: () => {},
          removeListener: () => {},
        },
        sendMessage: (message, callback) => {
          setTimeout(() => callback({ success: true }), 10);
        },
        lastError: null,
      },
      tabs: {
        getCurrent: (callback) => {
          setTimeout(() => callback({ id: 123 }), 10);
        },
      },
    };
  }

  console.log("Test environment setup complete!");
}

/**
 * テストを実行
 * @returns {Promise<Object>} テスト結果
 */
async function runTests() {
  try {
    console.log("=== ContentScriptCommunicator Test Runner ===");
    console.log(`Test started at: ${new Date().toISOString()}`);

    // 依存関係を読み込み
    await loadDependencies();

    // テスト環境をセットアップ
    setupTestEnvironment();

    // テストを実行
    console.log("\nStarting tests...\n");
    const results = await runContentScriptCommunicatorTests();

    // 結果を表示
    console.log("\n" + "=".repeat(50));
    console.log("FINAL TEST RESULTS");
    console.log("=".repeat(50));
    console.log(`Total Tests: ${results.total}`);
    console.log(`Passed: ${results.passed}`);
    console.log(`Failed: ${results.failed}`);
    console.log(`Success Rate: ${results.successRate.toFixed(1)}%`);

    if (results.failed === 0) {
      console.log("🎉 All tests passed!");
    } else {
      console.log(`⚠️  ${results.failed} test(s) failed`);
    }

    console.log(`\nTest completed at: ${new Date().toISOString()}`);

    return results;
  } catch (error) {
    console.error("❌ Test execution failed:", error);
    return {
      total: 0,
      passed: 0,
      failed: 1,
      successRate: 0,
      error: error.message,
    };
  }
}

/**
 * ページ読み込み完了後にテストを実行
 */
function initializeTestRunner() {
  // テスト結果を表示するためのHTML要素を作成
  const testContainer = document.createElement("div");
  testContainer.id = "test-container";
  testContainer.style.cssText = `
    font-family: 'Courier New', monospace;
    padding: 20px;
    background-color: #f5f5f5;
    border: 1px solid #ddd;
    margin: 20px;
    border-radius: 5px;
  `;

  const title = document.createElement("h2");
  title.textContent = "ContentScriptCommunicator Test Runner";
  title.style.cssText = "color: #333; margin-bottom: 20px;";

  const output = document.createElement("pre");
  output.id = "test-output";
  output.style.cssText = `
    background-color: #000;
    color: #00ff00;
    padding: 15px;
    border-radius: 3px;
    overflow-x: auto;
    white-space: pre-wrap;
    max-height: 600px;
    overflow-y: auto;
  `;

  const runButton = document.createElement("button");
  runButton.textContent = "Run Tests";
  runButton.style.cssText = `
    background-color: #007cba;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 3px;
    cursor: pointer;
    font-size: 16px;
    margin-bottom: 20px;
  `;

  testContainer.appendChild(title);
  testContainer.appendChild(runButton);
  testContainer.appendChild(output);
  document.body.appendChild(testContainer);

  // コンソール出力をキャプチャ
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;

  function captureOutput(type, ...args) {
    const message = args
      .map((arg) =>
        typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg)
      )
      .join(" ");

    output.textContent += `[${type.toUpperCase()}] ${message}\n`;
    output.scrollTop = output.scrollHeight;

    // 元のコンソール関数も呼び出す
    if (type === "log") {
      originalConsoleLog.apply(console, args);
    } else if (type === "error") {
      originalConsoleError.apply(console, args);
    }
  }

  console.log = (...args) => captureOutput("log", ...args);
  console.error = (...args) => captureOutput("error", ...args);

  // テスト実行ボタンのイベントリスナー
  runButton.addEventListener("click", async () => {
    runButton.disabled = true;
    runButton.textContent = "Running Tests...";
    output.textContent = "";

    try {
      const results = await runTests();

      // ボタンの状態を更新
      if (results.failed === 0) {
        runButton.style.backgroundColor = "#28a745";
        runButton.textContent = "✅ All Tests Passed";
      } else {
        runButton.style.backgroundColor = "#dc3545";
        runButton.textContent = `❌ ${results.failed} Test(s) Failed`;
      }
    } catch (error) {
      runButton.style.backgroundColor = "#dc3545";
      runButton.textContent = "❌ Test Execution Failed";
      console.error("Test execution error:", error);
    } finally {
      setTimeout(() => {
        runButton.disabled = false;
        runButton.style.backgroundColor = "#007cba";
        runButton.textContent = "Run Tests Again";
      }, 3000);
    }
  });

  // 初回自動実行
  setTimeout(() => {
    runButton.click();
  }, 1000);
}

// ページ読み込み完了を待ってテストランナーを初期化
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeTestRunner);
} else {
  initializeTestRunner();
}

// グローバルに公開（デバッグ用）
window.runContentScriptCommunicatorTestRunner = runTests;
