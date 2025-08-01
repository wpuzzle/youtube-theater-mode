/**
 * DOMOptimizer テストランナー
 * DOMOptimizer の単体テストを実行するためのランナー
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
    // DOMOptimizer を読み込み
    await loadScript("../infrastructure/dom-optimizer.js");

    // テストファイルを読み込み
    await loadScript("./test-dom-optimizer.js");

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
  title.textContent = "DOMOptimizer Test Results";
  title.style.cssText = `
    color: #333;
    margin-bottom: 20px;
    border-bottom: 2px solid #28a745;
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
    background-color: #28a745;
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
    outputElement.scrollTop = outputElement.scrollHeight;
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
    outputElement.scrollTop = outputElement.scrollHeight;
    originalError.apply(console, args);
  };

  console.assert = (condition, ...args) => {
    if (!condition) {
      const message = "ASSERTION FAILED: " + args.join(" ");
      output += message + "\n";
      outputElement.textContent = output;
      outputElement.style.color = "#d32f2f";
      outputElement.scrollTop = outputElement.scrollHeight;
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
    console.log("🚀 Starting DOMOptimizer tests...\n");

    // DOMOptimizer が利用可能かチェック
    if (typeof DOMOptimizer === "undefined") {
      throw new Error("DOMOptimizer is not loaded");
    }

    // テスト関数が利用可能かチェック
    if (typeof runDOMOptimizerTests === "undefined") {
      throw new Error("Test functions are not loaded");
    }

    // テストを実行
    runDOMOptimizerTests();

    // 成功メッセージは非同期テスト完了後に表示される
  } catch (error) {
    console.error("❌ Test execution failed:", error);
  } finally {
    // 少し待ってからコンソールを復元
    setTimeout(() => {
      restoreConsole();
    }, 2000);
  }
}

/**
 * ベンチマークテストを実行
 */
function runBenchmarkTests() {
  console.log("\n🔬 Running benchmark tests...");

  const logger = {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
    trace: () => {},
  };

  // 通常のDOM操作 vs DOMOptimizer比較
  const testElement = document.createElement("div");
  document.body.appendChild(testElement);

  // 通常のDOM操作
  console.time("Direct DOM operations");
  for (let i = 0; i < 1000; i++) {
    testElement.classList.add(`direct-class-${i}`);
    testElement.style.setProperty(`--custom-prop-${i}`, `value-${i}`);
  }
  console.timeEnd("Direct DOM operations");

  // DOMOptimizerを使用
  const domOptimizer = new DOMOptimizer({
    logger,
    enablePerformanceMonitoring: true,
    batchSize: 100,
  });

  const testElement2 = document.createElement("div");
  document.body.appendChild(testElement2);

  console.time("DOMOptimizer operations");
  const promises = [];
  for (let i = 0; i < 1000; i++) {
    promises.push(
      domOptimizer.queueClassOperation(
        testElement2,
        `optimized-class-${i}`,
        "add"
      )
    );
    promises.push(
      domOptimizer.queueStyleOperation(
        testElement2,
        `--custom-prop-${i}`,
        `value-${i}`
      )
    );
  }

  Promise.all(promises).then(() => {
    console.timeEnd("DOMOptimizer operations");

    const metrics = domOptimizer.getPerformanceMetrics();
    console.log("DOMOptimizer metrics:", {
      totalOperations: metrics.totalOperations,
      batchedOperations: metrics.batchedOperations,
      frameCount: metrics.frameCount,
      averageFrameTime: `${metrics.averageFrameTime.toFixed(2)}ms`,
    });

    // クリーンアップ
    testElement.remove();
    testElement2.remove();
    domOptimizer.cleanup();

    console.log("✅ Benchmark tests completed");
  });
}

/**
 * メモリ使用量テストを実行
 */
function runMemoryTests() {
  console.log("\n🧪 Running memory usage tests...");

  if (!performance.memory) {
    console.log("ℹ️ Memory information not available in this browser");
    return;
  }

  const initialMemory = performance.memory.usedJSHeapSize;

  const logger = {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
    trace: () => {},
  };

  // 大量のDOM操作を実行
  for (let cycle = 0; cycle < 5; cycle++) {
    const domOptimizer = new DOMOptimizer({
      logger,
      enablePerformanceMonitoring: true,
      enableVirtualDOM: true,
    });

    const testElements = [];
    for (let i = 0; i < 50; i++) {
      const element = document.createElement("div");
      document.body.appendChild(element);
      testElements.push(element);
    }

    // 各要素に大量の操作を実行
    const promises = [];
    for (const element of testElements) {
      for (let i = 0; i < 20; i++) {
        promises.push(
          domOptimizer.queueClassOperation(element, `memory-class-${i}`, "add")
        );
        promises.push(
          domOptimizer.queueStyleOperation(
            element,
            `color`,
            `rgb(${i}, ${i}, ${i})`
          )
        );
      }
    }

    Promise.all(promises).then(() => {
      // 要素をクリーンアップ
      testElements.forEach((element) => element.remove());
      domOptimizer.cleanup();
    });
  }

  // メモリ使用量をチェック
  setTimeout(() => {
    const finalMemory = performance.memory.usedJSHeapSize;
    const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024;

    console.log(`Memory increase: ${memoryIncrease.toFixed(2)} MB`);

    if (memoryIncrease < 10) {
      console.log("✅ Memory usage test passed (increase < 10MB)");
    } else {
      console.log("⚠️ High memory usage detected (increase >= 10MB)");
    }
  }, 1000);
}

/**
 * 拡張テストを実行
 */
function runExtendedTests() {
  const benchmarkButton = document.createElement("button");
  benchmarkButton.textContent = "Run Benchmarks";
  benchmarkButton.style.cssText = `
    background-color: #ff9800;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
    margin-left: 10px;
  `;

  const memoryButton = document.createElement("button");
  memoryButton.textContent = "Run Memory Tests";
  memoryButton.style.cssText = `
    background-color: #9c27b0;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
    margin-left: 10px;
  `;

  benchmarkButton.addEventListener("click", () => {
    const outputElement = document.getElementById("test-output");
    const restoreConsole = captureConsoleOutput(outputElement);

    try {
      runBenchmarkTests();
    } finally {
      setTimeout(() => {
        restoreConsole();
      }, 1500);
    }
  });

  memoryButton.addEventListener("click", () => {
    const outputElement = document.getElementById("test-output");
    const restoreConsole = captureConsoleOutput(outputElement);

    try {
      runMemoryTests();
    } finally {
      setTimeout(() => {
        restoreConsole();
      }, 2000);
    }
  });

  // Run Tests ボタンの隣に追加
  const runButton = document.querySelector("button");
  if (runButton && runButton.parentNode) {
    runButton.parentNode.insertBefore(benchmarkButton, runButton.nextSibling);
    runButton.parentNode.insertBefore(
      memoryButton,
      benchmarkButton.nextSibling
    );
  }
}

/**
 * ページ読み込み時の初期化
 */
document.addEventListener("DOMContentLoaded", async () => {
  console.log("🔧 Setting up DOMOptimizer test environment...");

  // テスト環境をセットアップ
  const setupSuccess = await setupTestEnvironment();

  if (setupSuccess) {
    // テストUIを作成
    createTestUI();

    // 拡張テストボタンを追加
    runExtendedTests();

    console.log("🎯 DOMOptimizer test runner ready!");
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
