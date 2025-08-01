/**
 * ResourceManager テストランナー
 * ResourceManager の単体テストを実行するためのランナー
 */

// 必要なファイルを読み込み
const loadScript = (src) => {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

/**
 * テスト環境をセットアップ
 */
async function setupTestEnvironment() {
  try {
    // ResourceManager を読み込み
    await loadScript("../infrastructure/resource-manager.js");

    // テストファイルを読み込み
    await loadScript("./test-resource-manager.js");

    console.log("✅ Test environment setup complete");
    return true;
  } catch (error) {
    console.error("❌ Failed to setup test environment:", error);
    return false;
  }
}

/**
 * テスト結果を表示するUI要素を作成
 */
function createTestUI() {
  const container = document.createElement("div");
  container.style.cssText = `
    font-family: 'Courier New', monospace;
    padding: 20px;
    background-color: #f5f5f5;
    border: 1px solid #ddd;
    border-radius: 8px;
    margin: 20px;
    max-height: 600px;
    overflow-y: auto;
  `;

  const title = document.createElement("h2");
  title.textContent = "ResourceManager Test Results";
  title.style.cssText = `
    color: #333;
    margin-bottom: 20px;
    border-bottom: 2px solid #007acc;
    padding-bottom: 10px;
  `;

  const output = document.createElement("pre");
  output.id = "test-output";
  output.style.cssText = `
    background-color: #fff;
    padding: 15px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 14px;
    line-height: 1.4;
    white-space: pre-wrap;
    word-wrap: break-word;
  `;

  const runButton = document.createElement("button");
  runButton.textContent = "Run Tests";
  runButton.style.cssText = `
    background-color: #007acc;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
    margin-bottom: 20px;
  `;

  runButton.addEventListener("click", runTests);

  container.appendChild(title);
  container.appendChild(runButton);
  container.appendChild(output);
  document.body.appendChild(container);

  return output;
}

/**
 * コンソール出力をキャプチャ
 */
function captureConsoleOutput(outputElement) {
  const originalLog = console.log;
  const originalError = console.error;
  const originalAssert = console.assert;

  let output = "";

  console.log = (...args) => {
    const message = args
      .map((arg) =>
        typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg)
      )
      .join(" ");
    output += message + "\n";
    outputElement.textContent = output;
    originalLog.apply(console, args);
  };

  console.error = (...args) => {
    const message =
      "ERROR: " +
      args
        .map((arg) =>
          typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg)
        )
        .join(" ");
    output += message + "\n";
    outputElement.textContent = output;
    outputElement.style.color = "#d32f2f";
    originalError.apply(console, args);
  };

  console.assert = (condition, ...args) => {
    if (!condition) {
      const message = "ASSERTION FAILED: " + args.join(" ");
      output += message + "\n";
      outputElement.textContent = output;
      outputElement.style.color = "#d32f2f";
    }
    originalAssert.apply(console, [condition, ...args]);
  };

  return () => {
    console.log = originalLog;
    console.error = originalError;
    console.assert = originalAssert;
  };
}

/**
 * テストを実行
 */
async function runTests() {
  const outputElement = document.getElementById("test-output");
  if (!outputElement) {
    console.error("Test output element not found");
    return;
  }

  // 出力をクリア
  outputElement.textContent = "";
  outputElement.style.color = "#333";

  // コンソール出力をキャプチャ
  const restoreConsole = captureConsoleOutput(outputElement);

  try {
    console.log("🚀 Starting ResourceManager tests...\n");

    // ResourceManager が利用可能かチェック
    if (typeof ResourceManager === "undefined") {
      throw new Error("ResourceManager is not loaded");
    }

    // テスト関数が利用可能かチェック
    if (typeof runResourceManagerTests === "undefined") {
      throw new Error("Test functions are not loaded");
    }

    // テストを実行
    runResourceManagerTests();

    // 成功メッセージは非同期テスト完了後に表示される
  } catch (error) {
    console.error("❌ Test execution failed:", error);
  } finally {
    // 少し待ってからコンソールを復元
    setTimeout(() => {
      restoreConsole();
    }, 1000);
  }
}

/**
 * パフォーマンステストを実行
 */
function runPerformanceTests() {
  console.log("\n🔬 Running performance tests...");

  const logger = {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
    trace: () => {},
  };

  // 大量のリソース登録テスト
  console.time("Register 1000 resources");
  const resourceManager = new ResourceManager({
    logger,
    autoCleanup: false,
    memoryMonitoring: false,
  });

  const resourceIds = [];
  for (let i = 0; i < 1000; i++) {
    const resourceId = resourceManager.register(
      { data: `test${i}` },
      () => {},
      { name: `Resource${i}` }
    );
    resourceIds.push(resourceId);
  }
  console.timeEnd("Register 1000 resources");

  // 統計取得テスト
  console.time("Get stats");
  const stats = resourceManager.getStats();
  console.timeEnd("Get stats");
  console.log(`Stats: ${stats.currentActive} active resources`);

  // 一括破棄テスト
  console.time("Dispose 1000 resources");
  const disposedCount = resourceManager.cleanup();
  console.timeEnd("Dispose 1000 resources");
  console.log(`Disposed ${disposedCount} resources`);

  console.log("✅ Performance tests completed");
}

/**
 * メモリリークテストを実行
 */
function runMemoryLeakTests() {
  console.log("\n🧪 Running memory leak tests...");

  const logger = {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
    trace: () => {},
  };

  // 初期メモリ使用量を記録
  const initialMemory = performance.memory
    ? performance.memory.usedJSHeapSize
    : 0;

  // リソースの作成と破棄を繰り返す
  for (let cycle = 0; cycle < 10; cycle++) {
    const resourceManager = new ResourceManager({
      logger,
      autoCleanup: false,
      memoryMonitoring: false,
    });

    // 100個のリソースを作成
    for (let i = 0; i < 100; i++) {
      const mockElement = document.createElement("div");
      resourceManager.registerEventListener(mockElement, "click", () => {});

      const mockObserver = {
        disconnect: () => {},
      };
      resourceManager.registerObserver(mockObserver);
    }

    // すべて破棄
    resourceManager.cleanup();
  }

  // 最終メモリ使用量を記録
  const finalMemory = performance.memory
    ? performance.memory.usedJSHeapSize
    : 0;

  if (performance.memory) {
    const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024;
    console.log(`Memory increase: ${memoryIncrease.toFixed(2)} MB`);

    if (memoryIncrease < 5) {
      console.log("✅ Memory leak test passed (increase < 5MB)");
    } else {
      console.log("⚠️ Potential memory leak detected (increase >= 5MB)");
    }
  } else {
    console.log("ℹ️ Memory information not available");
  }
}

/**
 * 拡張テストを実行
 */
function runExtendedTests() {
  const extendedButton = document.createElement("button");
  extendedButton.textContent = "Run Extended Tests";
  extendedButton.style.cssText = `
    background-color: #ff9800;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
    margin-left: 10px;
  `;

  extendedButton.addEventListener("click", () => {
    const outputElement = document.getElementById("test-output");
    const restoreConsole = captureConsoleOutput(outputElement);

    try {
      runPerformanceTests();
      runMemoryLeakTests();
    } finally {
      setTimeout(() => {
        restoreConsole();
      }, 500);
    }
  });

  // Run Tests ボタンの隣に追加
  const runButton = document.querySelector("button");
  if (runButton && runButton.parentNode) {
    runButton.parentNode.insertBefore(extendedButton, runButton.nextSibling);
  }
}

/**
 * ページ読み込み時の初期化
 */
document.addEventListener("DOMContentLoaded", async () => {
  console.log("🔧 Setting up ResourceManager test environment...");

  // テスト環境をセットアップ
  const setupSuccess = await setupTestEnvironment();

  if (setupSuccess) {
    // テストUIを作成
    createTestUI();

    // 拡張テストボタンを追加
    runExtendedTests();

    console.log("🎯 ResourceManager test runner ready!");
    console.log("Click 'Run Tests' to execute the test suite.");
  } else {
    document.body.innerHTML = `
      <div style="padding: 20px; color: red; font-family: Arial, sans-serif;">
        <h2>❌ Test Setup Failed</h2>
        <p>Failed to load required files. Please check the file paths and try again.</p>
      </div>
    `;
  }
});

// エラーハンドリング
window.addEventListener("error", (event) => {
  console.error("Global error:", event.error);
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection:", event.reason);
});
