/**
 * ErrorHandler と Result 型パターンの単体テスト
 */

// テストフレームワーク
class TestFramework {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log("Running ErrorHandler tests...\n");

    for (const test of this.tests) {
      try {
        await test.fn();
        console.log(`✓ ${test.name}`);
        this.passed++;
      } catch (error) {
        console.error(`✗ ${test.name}: ${error.message}`);
        console.error(error.stack);
        this.failed++;
      }
    }

    console.log(`\nTest Results: ${this.passed} passed, ${this.failed} failed`);
    return this.failed === 0;
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(message || "Assertion failed");
    }
  }

  assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
  }

  assertContains(container, item, message) {
    if (!container.includes(item)) {
      throw new Error(message || `Expected container to include ${item}`);
    }
  }
}

// モックロガー
class MockLogger {
  constructor() {
    this.logs = [];
    this.errors = [];
    this.warns = [];
    this.infos = [];
  }

  log(message, data) {
    this.logs.push({ message, data });
  }

  error(message, data) {
    this.errors.push({ message, data });
  }

  warn(message, data) {
    this.warns.push({ message, data });
  }

  info(message, data) {
    this.infos.push({ message, data });
  }

  clear() {
    this.logs = [];
    this.errors = [];
    this.warns = [];
    this.infos = [];
  }
}

// テスト実行
async function runErrorHandlerTests() {
  const framework = new TestFramework();
  const mockLogger = new MockLogger();

  try {
    // AppErrorクラスのテスト
    framework.test("AppError creation and properties", () => {
      const error = new AppError("Test error", {
        type: ErrorType.VALIDATION_ERROR,
        severity: ErrorSeverity.WARNING,
        code: "TEST-001",
        context: { field: "username" },
      });

      framework.assertEqual(
        error.message,
        "Test error",
        "Message should match"
      );
      framework.assertEqual(
        error.type,
        ErrorType.VALIDATION_ERROR,
        "Type should match"
      );
      framework.assertEqual(
        error.severity,
        ErrorSeverity.WARNING,
        "Severity should match"
      );
      framework.assertEqual(error.code, "TEST-001", "Code should match");
      framework.assertEqual(
        error.context.field,
        "username",
        "Context should match"
      );
      framework.assert(
        error.timestamp instanceof Date,
        "Timestamp should be a Date"
      );
      framework.assert(error.stack, "Stack trace should be captured");
    });

    // AppError.toStringのテスト
    framework.test("AppError toString method", () => {
      const error = new AppError("Format test", {
        type: ErrorType.STORAGE_ERROR,
        code: "STORAGE-001",
      });

      const str = error.toString();
      framework.assertContains(
        str,
        "STORAGE_ERROR",
        "String should contain error type"
      );
      framework.assertContains(
        str,
        "Format test",
        "String should contain message"
      );
      framework.assertContains(
        str,
        "STORAGE-001",
        "String should contain error code"
      );
    });

    // AppError.toJSONのテスト
    framework.test("AppError toJSON method", () => {
      const cause = new Error("Original error");
      const error = new AppError("JSON test", {
        type: ErrorType.COMMUNICATION_ERROR,
        cause: cause,
      });

      const json = error.toJSON();
      framework.assertEqual(
        json.message,
        "JSON test",
        "JSON should contain message"
      );
      framework.assertEqual(
        json.type,
        ErrorType.COMMUNICATION_ERROR,
        "JSON should contain type"
      );
      framework.assert(json.stack, "JSON should contain stack trace");
      framework.assert(json.cause, "JSON should contain cause");
    });

    // Result.successのテスト
    framework.test("Result success creation", () => {
      const data = { id: 1, name: "Test" };
      const result = Result.success(data);

      framework.assert(result.success, "Result should be successful");
      framework.assertEqual(result.data, data, "Result should contain data");
      framework.assert(!result.error, "Result should not have error");
    });

    // Result.failureのテスト
    framework.test("Result failure creation", () => {
      const result = Result.failure("Test failure");

      framework.assert(!result.success, "Result should be failure");
      framework.assert(!result.data, "Result should not have data");
      framework.assert(
        result.error instanceof AppError,
        "Result should have AppError"
      );
      framework.assertEqual(
        result.error.message,
        "Test failure",
        "Error message should match"
      );
    });

    // Result.failureのオプション付きテスト
    framework.test("Result failure with options", () => {
      const result = Result.failure("Option test", {
        type: ErrorType.TIMEOUT_ERROR,
        code: "TIMEOUT-001",
      });

      framework.assert(!result.success, "Result should be failure");
      framework.assertEqual(
        result.error.type,
        ErrorType.TIMEOUT_ERROR,
        "Error type should match"
      );
      framework.assertEqual(
        result.error.code,
        "TIMEOUT-001",
        "Error code should match"
      );
    });

    // Result.onSuccessのテスト
    framework.test("Result onSuccess callback", () => {
      let callbackCalled = false;
      const result = Result.success("test data");

      result.onSuccess((data) => {
        callbackCalled = true;
        framework.assertEqual(
          data,
          "test data",
          "Callback should receive data"
        );
      });

      framework.assert(callbackCalled, "Success callback should be called");

      // 失敗結果ではコールバックが呼ばれないことを確認
      callbackCalled = false;
      const failResult = Result.failure("test error");

      failResult.onSuccess(() => {
        callbackCalled = true;
      });

      framework.assert(
        !callbackCalled,
        "Success callback should not be called for failure"
      );
    });

    // Result.onFailureのテスト
    framework.test("Result onFailure callback", () => {
      let callbackCalled = false;
      const result = Result.failure("test error");

      result.onFailure((error) => {
        callbackCalled = true;
        framework.assertEqual(
          error.message,
          "test error",
          "Callback should receive error"
        );
      });

      framework.assert(callbackCalled, "Failure callback should be called");

      // 成功結果ではコールバックが呼ばれないことを確認
      callbackCalled = false;
      const successResult = Result.success("test data");

      successResult.onFailure(() => {
        callbackCalled = true;
      });

      framework.assert(
        !callbackCalled,
        "Failure callback should not be called for success"
      );
    });

    // Result.mapのテスト
    framework.test("Result map transformation", () => {
      const result = Result.success(5);
      const mapped = result.map((x) => x * 2);

      framework.assert(mapped.success, "Mapped result should be successful");
      framework.assertEqual(mapped.data, 10, "Data should be transformed");

      // マッピング関数が例外をスローした場合
      const errorMapped = result.map((x) => {
        throw new Error("Map error");
      });

      framework.assert(
        !errorMapped.success,
        "Result should be failure when mapping throws"
      );
      framework.assertEqual(
        errorMapped.error.message,
        "Map error",
        "Error should be captured"
      );
    });

    // Result.flatMapのテスト
    framework.test("Result flatMap transformation", () => {
      const result = Result.success(5);
      const flatMapped = result.flatMap((x) => Result.success(x * 2));

      framework.assert(
        flatMapped.success,
        "FlatMapped result should be successful"
      );
      framework.assertEqual(flatMapped.data, 10, "Data should be transformed");

      // 失敗結果を返す場合
      const errorFlatMapped = result.flatMap((x) =>
        Result.failure("FlatMap error")
      );

      framework.assert(
        !errorFlatMapped.success,
        "Result should be failure when flatMap returns failure"
      );
      framework.assertEqual(
        errorFlatMapped.error.message,
        "FlatMap error",
        "Error should be from flatMap result"
      );
    });

    // Result.unwrapのテスト
    framework.test("Result unwrap method", () => {
      const result = Result.success("test data");
      const data = result.unwrap();
      framework.assertEqual(data, "test data", "Unwrap should return data");

      // 失敗結果のunwrapは例外をスロー
      const failResult = Result.failure("unwrap error");
      let thrown = false;
      try {
        failResult.unwrap();
      } catch (error) {
        thrown = true;
        framework.assertEqual(
          error.message,
          "unwrap error",
          "Unwrap should throw the error"
        );
      }
      framework.assert(thrown, "Unwrap should throw for failure result");
    });

    // Result.unwrapOrのテスト
    framework.test("Result unwrapOr method", () => {
      const result = Result.success("test data");
      const data = result.unwrapOr("default");
      framework.assertEqual(
        data,
        "test data",
        "UnwrapOr should return data for success"
      );

      const failResult = Result.failure("error");
      const defaultData = failResult.unwrapOr("default");
      framework.assertEqual(
        defaultData,
        "default",
        "UnwrapOr should return default for failure"
      );
    });

    // ErrorHandlerの作成とエラー処理のテスト
    framework.test("ErrorHandler creation and error handling", () => {
      const handler = new ErrorHandler(mockLogger);
      mockLogger.clear();

      const error = handler.handleError("Test error", {
        type: ErrorType.VALIDATION_ERROR,
        severity: ErrorSeverity.WARNING,
      });

      framework.assert(error instanceof AppError, "Should return AppError");
      framework.assertEqual(
        error.type,
        ErrorType.VALIDATION_ERROR,
        "Error type should match"
      );
      framework.assertEqual(
        mockLogger.warns.length,
        1,
        "Warning should be logged"
      );
      framework.assertEqual(
        mockLogger.warns[0].message,
        "Test error",
        "Log message should match"
      );
    });

    // ErrorHandler.wrapAsyncのテスト
    framework.test("ErrorHandler wrapAsync method", async () => {
      const handler = new ErrorHandler(mockLogger);
      mockLogger.clear();

      // 成功ケース
      const successPromise = Promise.resolve("success data");
      const successResult = await handler.wrapAsync(successPromise);

      framework.assert(successResult.success, "Result should be successful");
      framework.assertEqual(
        successResult.data,
        "success data",
        "Data should match"
      );

      // 失敗ケース
      const failPromise = Promise.reject(new Error("async error"));
      const failResult = await handler.wrapAsync(failPromise);

      framework.assert(!failResult.success, "Result should be failure");
      framework.assertEqual(
        failResult.error.message,
        "async error",
        "Error message should match"
      );
      framework.assertEqual(
        mockLogger.errors.length,
        1,
        "Error should be logged"
      );
    });

    // ErrorHandler.wrapSyncのテスト
    framework.test("ErrorHandler wrapSync method", () => {
      const handler = new ErrorHandler(mockLogger);
      mockLogger.clear();

      // 成功ケース
      const successResult = handler.wrapSync(() => "sync data");

      framework.assert(successResult.success, "Result should be successful");
      framework.assertEqual(
        successResult.data,
        "sync data",
        "Data should match"
      );

      // 失敗ケース
      const failResult = handler.wrapSync(() => {
        throw new Error("sync error");
      });

      framework.assert(!failResult.success, "Result should be failure");
      framework.assertEqual(
        failResult.error.message,
        "sync error",
        "Error message should match"
      );
      framework.assertEqual(
        mockLogger.errors.length,
        1,
        "Error should be logged"
      );
    });

    // ErrorHandler.getUserMessageのテスト
    framework.test("ErrorHandler getUserMessage method", () => {
      const handler = new ErrorHandler(mockLogger);

      const validationError = new AppError("Invalid input", {
        type: ErrorType.VALIDATION_ERROR,
      });
      const userMessage = handler.getUserMessage(validationError);

      framework.assert(userMessage, "Should return a user message");
      framework.assert(
        userMessage.length > 0,
        "User message should not be empty"
      );
    });

    // ErrorHandler.addErrorListenerのテスト
    framework.test("ErrorHandler error listeners", () => {
      const handler = new ErrorHandler(mockLogger);
      let listenerCalled = false;
      let receivedError = null;

      const removeListener = handler.addErrorListener((error) => {
        listenerCalled = true;
        receivedError = error;
      });

      const error = handler.handleError("Listener test");

      framework.assert(listenerCalled, "Listener should be called");
      framework.assertEqual(
        receivedError,
        error,
        "Listener should receive the error"
      );

      // リスナーを削除
      listenerCalled = false;
      removeListener();
      handler.handleError("After removal");

      framework.assert(
        !listenerCalled,
        "Listener should not be called after removal"
      );
    });

    // ErrorHandler.registerTypeHandlerのテスト
    framework.test("ErrorHandler type handlers", () => {
      const handler = new ErrorHandler(mockLogger);
      let handlerCalled = false;
      let receivedError = null;

      handler.registerTypeHandler(ErrorType.TIMEOUT_ERROR, (error) => {
        handlerCalled = true;
        receivedError = error;
      });

      // タイプが一致するエラーを処理
      const timeoutError = handler.handleError("Timeout occurred", {
        type: ErrorType.TIMEOUT_ERROR,
      });

      framework.assert(handlerCalled, "Type handler should be called");
      framework.assertEqual(
        receivedError,
        timeoutError,
        "Handler should receive the error"
      );

      // タイプが一致しないエラーを処理
      handlerCalled = false;
      handler.handleError("Other error", {
        type: ErrorType.STORAGE_ERROR,
      });

      framework.assert(
        !handlerCalled,
        "Type handler should not be called for different type"
      );
    });

    // RetryManagerのテスト
    framework.test("RetryManager basic functionality", async () => {
      const retryManager = new RetryManager({
        maxRetries: 3,
        baseDelay: 10, // テスト用に短い遅延
        logger: mockLogger,
      });
      mockLogger.clear();

      let attempts = 0;
      const successResult = await retryManager.withRetry(async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error(`Attempt ${attempts} failed`);
        }
        return "success after retries";
      });

      framework.assertEqual(attempts, 3, "Should make 3 attempts");
      framework.assert(
        successResult.success,
        "Final result should be successful"
      );
      framework.assertEqual(
        successResult.data,
        "success after retries",
        "Data should match"
      );
      framework.assert(
        mockLogger.infos.length >= 2,
        "Retry attempts should be logged"
      );
    });

    // RetryManager最大リトライ回数のテスト
    framework.test("RetryManager max retries", async () => {
      const retryManager = new RetryManager({
        maxRetries: 2,
        baseDelay: 10,
        logger: mockLogger,
      });
      mockLogger.clear();

      let attempts = 0;
      const failResult = await retryManager.withRetry(async () => {
        attempts++;
        throw new Error(`Always fails`);
      });

      framework.assertEqual(
        attempts,
        3,
        "Should make 3 attempts (initial + 2 retries)"
      );
      framework.assert(
        !failResult.success,
        "Result should be failure after max retries"
      );
      framework.assertEqual(
        failResult.error.message,
        "Always fails",
        "Error message should match"
      );
      framework.assertEqual(
        failResult.error.context.attempts,
        3,
        "Context should include attempts count"
      );
    });

    // RetryManagerリトライ条件のテスト
    framework.test("RetryManager retry condition", async () => {
      const retryManager = new RetryManager({
        maxRetries: 3,
        baseDelay: 10,
        logger: mockLogger,
        // タイムアウトエラーのみリトライ
        retryCondition: (error) => error.message.includes("timeout"),
      });
      mockLogger.clear();

      let attempts = 0;
      const failResult = await retryManager.withRetry(async () => {
        attempts++;
        throw new Error(`validation error`); // リトライ条件に一致しないエラー
      });

      framework.assertEqual(attempts, 1, "Should make only 1 attempt");
      framework.assert(!failResult.success, "Result should be failure");
      framework.assertEqual(
        failResult.error.message,
        "validation error",
        "Error message should match"
      );
    });

    // RetryManagerオプションのテスト
    framework.test("RetryManager with options", async () => {
      const retryManager = new RetryManager({
        maxRetries: 5,
        baseDelay: 10,
        logger: mockLogger,
      });
      mockLogger.clear();

      let attempts = 0;
      let onRetryCalled = 0;

      const result = await retryManager.withRetry(
        async () => {
          attempts++;
          if (attempts < 3) {
            throw new Error(`Attempt ${attempts} failed`);
          }
          return "success with options";
        },
        {
          maxRetries: 2, // オーバーライド
          onRetry: (attempt) => {
            onRetryCalled++;
            framework.assertEqual(
              attempt,
              onRetryCalled,
              "Attempt count should match"
            );
          },
        }
      );

      framework.assertEqual(attempts, 3, "Should make 3 attempts");
      framework.assertEqual(onRetryCalled, 2, "onRetry should be called twice");
      framework.assert(result.success, "Result should be successful");
    });

    await framework.run();
    return framework.failed === 0;
  } catch (error) {
    console.error("Unexpected error in tests:", error);
    return false;
  }
}

// テスト実行用の関数をグローバルに公開
if (typeof window !== "undefined") {
  window.runErrorHandlerTests = runErrorHandlerTests;
} else if (typeof module !== "undefined" && module.exports) {
  module.exports = { runErrorHandlerTests };
}
