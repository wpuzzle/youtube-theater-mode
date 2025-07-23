/**
 * Logger テストランナー
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
if (typeof runLoggerTests === "undefined") {
  if (typeof require !== "undefined") {
    const { runLoggerTests } = require("./test-logger.js");
    global.runLoggerTests = runLoggerTests;
  } else {
    console.error(
      "runLoggerTests function not found. Please load test-logger.js first."
    );
  }
}

/**
 * テストを実行
 */
async function executeLoggerTests() {
  console.log("=".repeat(50));
  console.log("YouTube Theater Mode - Logger Tests");
  console.log("=".repeat(50));

  try {
    const success = await runLoggerTests();

    console.log("=".repeat(50));
    if (success) {
      console.log("✓ All Logger tests passed!");
    } else {
      console.log("✗ Some Logger tests failed!");
    }
    console.log("=".repeat(50));

    return success;
  } catch (error) {
    console.error("Error running Logger tests:", error);
    return false;
  }
}

// ブラウザ環境での実行
if (typeof window !== "undefined") {
  window.executeLoggerTests = executeLoggerTests;

  // ページ読み込み後に自動実行
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", executeLoggerTests);
  } else {
    executeLoggerTests();
  }
}

// Node.js環境での実行
if (typeof module !== "undefined" && require.main === module) {
  executeLoggerTests().then((success) => {
    process.exit(success ? 0 : 1);
  });
}

// CommonJS/ES6 両対応のエクスポート
if (typeof module !== "undefined" && module.exports) {
  module.exports = { executeLoggerTests };
}
