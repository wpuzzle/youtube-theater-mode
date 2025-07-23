/**
 * StorageAdapter テストランナー
 */

// 依存関係を読み込み
if (typeof require !== "undefined") {
  // Logger
  if (typeof Logger === "undefined") {
    const {
      Logger,
      globalLogger,
      createLogger,
    } = require("../infrastructure/logger.js");
    global.Logger = Logger;
    global.globalLogger = globalLogger;
    global.createLogger = createLogger;
  }

  // ErrorHandler
  if (typeof ErrorHandler === "undefined") {
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
  }

  // StorageAdapter
  if (typeof StorageAdapter === "undefined") {
    const {
      StorageType,
      StorageAdapter,
    } = require("../infrastructure/storage-adapter.js");
    global.StorageType = StorageType;
    global.StorageAdapter = StorageAdapter;
  }
}

// テスト関数を読み込み
if (typeof runStorageAdapterTests === "undefined") {
  if (typeof require !== "undefined") {
    const { runStorageAdapterTests } = require("./test-storage-adapter.js");
    global.runStorageAdapterTests = runStorageAdapterTests;
  } else {
    console.error(
      "runStorageAdapterTests function not found. Please load test-storage-adapter.js first."
    );
  }
}

/**
 * テストを実行
 */
async function executeStorageAdapterTests() {
  console.log("=".repeat(50));
  console.log("YouTube Theater Mode - StorageAdapter Tests");
  console.log("=".repeat(50));

  try {
    const success = await runStorageAdapterTests();

    console.log("=".repeat(50));
    if (success) {
      console.log("✓ All StorageAdapter tests passed!");
    } else {
      console.log("✗ Some StorageAdapter tests failed!");
    }
    console.log("=".repeat(50));

    return success;
  } catch (error) {
    console.error("Error running StorageAdapter tests:", error);
    console.error(error.stack);
    return false;
  }
}

// ブラウザ環境での実行
if (typeof window !== "undefined") {
  window.executeStorageAdapterTests = executeStorageAdapterTests;

  // ページ読み込み後に自動実行
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", executeStorageAdapterTests);
  } else {
    executeStorageAdapterTests();
  }
}

// Node.js環境での実行
if (typeof module !== "undefined" && require.main === module) {
  executeStorageAdapterTests().then((success) => {
    process.exit(success ? 0 : 1);
  });
}

// CommonJS/ES6 両対応のエクスポート
if (typeof module !== "undefined" && module.exports) {
  module.exports = { executeStorageAdapterTests };
}
