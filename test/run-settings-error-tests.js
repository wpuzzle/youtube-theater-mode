/**
 * ErrorHandler テストランナー
 */

// ErrorHandlerクラスを読み込み
if (typeof ErrorHandler === "undefined") {
  // Node.js環境での読み込み
  if (typeof require !== "undefined") {
    const {
      ErrorType,
      ErrorSeverity,
      AppError,
      Result,
      ErrorHandler,
      RetryManager,
    } = require("../infrastructure/error-handler.js");
    global.ErrorType = ErrorType;
    global.ErrorSeverity = ErrorSeverity;
    global.AppError = AppError;
    global.Result = Result;
    global.ErrorHandler = ErrorHandler;
    global.RetryManager = RetryManager;
  } else {
    console.error(
      "ErrorHandler class not found. Please load error-handler.js first."
    );
  }
}

// テスト関数を読み込み
if (typeof runErrorHandlerTests === "undefined") {
  if (typeof require !== "undefined") {
    const { runErrorHandlerTests } = require("./test-error-handler.js");
    global.runErrorHandlerTests = runErrorHandlerTests;
  } else {
    console.error(
      "runErrorHandlerTests function not found. Please load test-error-handler.js first."
    );
  }
}

/**
 * テストを実行
 */
async function executeErrorHandlerTests() {
  console.log("=".repeat(50));
  console.log("YouTube Theater Mode - ErrorHandler Tests");
  console.log("=".repeat(50));

  try {
    const success = await runErrorHandlerTests();

    console.log("=".repeat(50));
    if (success) {
      console.log("✓ All ErrorHandler tests passed!");
    } else {
      console.log("✗ Some ErrorHandler tests failed!");
    }
    console.log("=".repeat(50));

    return success;
  } catch (error) {
    console.error("Error running ErrorHandler tests:", error);
    console.error(error.stack);
    return false;
  }
}

// ブラウザ環境での実行
if (typeof window !== "undefined") {
  window.executeErrorHandlerTests = executeErrorHandlerTests;

  // ページ読み込み後に自動実行
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", executeErrorHandlerTests);
  } else {
    executeErrorHandlerTests();
  }
}

// Node.js環境での実行
if (typeof module !== "undefined" && require.main === module) {
  executeErrorHandlerTests().then((success) => {
    process.exit(success ? 0 : 1);
  });
}

// CommonJS/ES6 両対応のエクスポート
if (typeof module !== "undefined" && module.exports) {
  module.exports = { executeErrorHandlerTests };
}
