/**
 * Logger デバッグテストランナー
 */

// Loggerクラスを読み込み
if (typeof Logger === "undefined") {
  // Node.js環境での読み込み
  if (typeof require !== "undefined") {
    const {
      Logger,
      globalLogger,
      createLogger,
    } = require("../infrastructure/logger.js");
    global.Logger = Logger;
    global.globalLogger = globalLogger;
    global.createLogger = createLogger;
  } else {
    console.error("Logger class not found. Please load logger.js first.");
  }
}

// テスト関数を読み込み
if (typeof runLoggerDebugTests === "undefined") {
  if (typeof require !== "undefined") {
    const { runLoggerDebugTests } = require("./test-logger-debug.js");
    global.runLoggerDebugTests = runLoggerDebugTests;
  } else {
    console.error(
      "runLoggerDebugTests function not found. Please load test-logger-debug.js first."
    );
  }
}

/**
 * テストを実行
 */
async function executeLoggerDebugTests() {
  console.log("=".repeat(50));
  console.log("YouTube Theater Mode - Logger Debug Tests");
  console.log("=".repeat(50));

  try {
    const success = await runLoggerDebugTests();

    console.log("=".repeat(50));
    if (success) {
      console.log("✓ All Logger Debug tests passed!");
    } else {
      console.log("✗ Some Logger Debug tests failed!");
    }
    console.log("=".repeat(50));

    return success;
  } catch (error) {
    console.error("Error running Logger Debug tests:", error);
    console.error(error.stack);
    return false;
  }
}

// ブラウザ環境での実行
if (typeof window !== "undefined") {
  window.executeLoggerDebugTests = executeLoggerDebugTests;

  // ページ読み込み後に自動実行
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", executeLoggerDebugTests);
  } else {
    executeLoggerDebugTests();
  }
}

// Node.js環境での実行
if (typeof module !== "undefined" && require.main === module) {
  executeLoggerDebugTests().then((success) => {
    process.exit(success ? 0 : 1);
  });
}

// CommonJS/ES6 両対応のエクスポート
if (typeof module !== "undefined" && module.exports) {
  module.exports = { executeLoggerDebugTests };
}
