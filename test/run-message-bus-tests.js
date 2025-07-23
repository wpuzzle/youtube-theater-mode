/**
 * MessageBus テストランナー
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

  // MessageBus
  if (typeof MessageBus === "undefined") {
    const {
      MessageType,
      MessageTarget,
      MessagePriority,
      Message,
      MessageQueue,
      MessageValidator,
      MessageBus,
    } = require("../infrastructure/message-bus.js");
    global.MessageType = MessageType;
    global.MessageTarget = MessageTarget;
    global.MessagePriority = MessagePriority;
    global.Message = Message;
    global.MessageQueue = MessageQueue;
    global.MessageValidator = MessageValidator;
    global.MessageBus = MessageBus;
  }
}

// テスト関数を読み込み
if (typeof runMessageBusTests === "undefined") {
  if (typeof require !== "undefined") {
    const { runMessageBusTests } = require("./test-message-bus.js");
    global.runMessageBusTests = runMessageBusTests;
  } else {
    console.error(
      "runMessageBusTests function not found. Please load test-message-bus.js first."
    );
  }
}

/**
 * テストを実行
 */
async function executeMessageBusTests() {
  console.log("=".repeat(50));
  console.log("YouTube Theater Mode - MessageBus Tests");
  console.log("=".repeat(50));

  try {
    const success = await runMessageBusTests();

    console.log("=".repeat(50));
    if (success) {
      console.log("✓ All MessageBus tests passed!");
    } else {
      console.log("✗ Some MessageBus tests failed!");
    }
    console.log("=".repeat(50));

    return success;
  } catch (error) {
    console.error("Error running MessageBus tests:", error);
    console.error(error.stack);
    return false;
  }
}

// ブラウザ環境での実行
if (typeof window !== "undefined") {
  window.executeMessageBusTests = executeMessageBusTests;

  // ページ読み込み後に自動実行
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", executeMessageBusTests);
  } else {
    executeMessageBusTests();
  }
}

// Node.js環境での実行
if (typeof module !== "undefined" && require.main === module) {
  executeMessageBusTests().then((success) => {
    process.exit(success ? 0 : 1);
  });
}

// CommonJS/ES6 両対応のエクスポート
if (typeof module !== "undefined" && module.exports) {
  module.exports = { executeMessageBusTests };
}
