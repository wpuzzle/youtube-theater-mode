/**
 * Logger システムの単体テスト
 */

// テスト用のモックコンソール
class MockConsole {
  constructor() {
    this.logs = [];
    this.errors = [];
    this.warns = [];
    this.infos = [];
  }

  log(...args) {
    this.logs.push(args);
  }

  error(...args) {
    this.errors.push(args);
  }

  warn(...args) {
    this.warns.push(args);
  }

  info(...args) {
    this.infos.push(args);
  }

  clear() {
    this.logs = [];
    this.errors = [];
    this.warns = [];
    this.infos = [];
  }
}

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
    console.log("Running Logger tests...\n");

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

// テスト実行
async function runLoggerTests() {
  const framework = new TestFramework();
  const mockConsole = new MockConsole();

  // 元のコンソールを保存
  const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
  };

  // モックコンソールに置き換え
  console.log = mockConsole.log.bind(mockConsole);
  console.error = mockConsole.error.bind(mockConsole);
  console.warn = mockConsole.warn.bind(mockConsole);
  console.info = mockConsole.info.bind(mockConsole);

  try {
    // Logger基本機能のテスト
    framework.test("Logger creation and basic logging", () => {
      const logger = new Logger("TestContext");
      mockConsole.clear();

      logger.info("Test message");
      framework.assert(
        mockConsole.infos.length === 1,
        "Info log should be recorded"
      );
      framework.assertContains(
        mockConsole.infos[0][0],
        "TestContext",
        "Context should be included"
      );
      framework.assertContains(
        mockConsole.infos[0][1],
        "Test message",
        "Message should be included"
      );
    });

    // ログレベルフィルタリングのテスト
    framework.test("Log level filtering", () => {
      const logger = new Logger("TestContext", { level: Logger.LogLevel.WARN });
      mockConsole.clear();

      logger.debug("Debug message");
      logger.info("Info message");
      logger.warn("Warning message");
      logger.error("Error message");

      framework.assertEqual(
        mockConsole.logs.length,
        0,
        "Debug logs should be filtered"
      );
      framework.assertEqual(
        mockConsole.infos.length,
        0,
        "Info logs should be filtered"
      );
      framework.assertEqual(
        mockConsole.warns.length,
        1,
        "Warning logs should pass"
      );
      framework.assertEqual(
        mockConsole.errors.length,
        1,
        "Error logs should pass"
      );
    });

    // フィルター機能のテスト
    framework.test("Message filtering", () => {
      const logger = new Logger("TestContext");
      logger.addFilter("filtered");
      mockConsole.clear();

      logger.info("Normal message");
      logger.info("This is filtered message");

      framework.assertEqual(
        mockConsole.infos.length,
        1,
        "Only non-filtered message should pass"
      );
      framework.assertContains(
        mockConsole.infos[0][1],
        "Normal message",
        "Normal message should pass"
      );
    });

    // 正規表現フィルターのテスト
    framework.test("RegExp filtering", () => {
      const logger = new Logger("TestContext");
      logger.addFilter(/test\d+/);
      mockConsole.clear();

      logger.info("Normal message");
      logger.info("Message with test123");

      framework.assertEqual(
        mockConsole.infos.length,
        1,
        "Only message not matching regex should pass"
      );
    });

    // パフォーマンス測定のテスト
    framework.test("Performance measurement", async () => {
      const logger = new Logger("TestContext");
      mockConsole.clear();

      logger.startPerformance("test-operation");
      await new Promise((resolve) => setTimeout(resolve, 10)); // 10ms待機
      const duration = logger.endPerformance("test-operation");

      framework.assert(duration >= 10, "Duration should be at least 10ms");
      framework.assert(
        mockConsole.infos.some((log) =>
          log[1].includes("Performance measurement completed")
        ),
        "Performance completion should be logged"
      );
    });

    // measurePerformance関数のテスト
    framework.test("measurePerformance function", async () => {
      const logger = new Logger("TestContext");
      mockConsole.clear();

      const result = await logger.measurePerformance("async-test", async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        return "test-result";
      });

      framework.assertEqual(
        result,
        "test-result",
        "Function result should be returned"
      );
      framework.assert(
        mockConsole.infos.some((log) =>
          log[1].includes("Performance measurement completed")
        ),
        "Performance should be logged"
      );
    });

    // ミドルウェア機能のテスト
    framework.test("Middleware functionality", () => {
      const logger = new Logger("TestContext");
      let middlewareCalled = false;

      logger.addMiddleware((entry) => {
        middlewareCalled = true;
        entry.customField = "added-by-middleware";
        return entry;
      });

      mockConsole.clear();
      logger.info("Test message");

      framework.assert(middlewareCalled, "Middleware should be called");
    });

    // 子Logger作成のテスト
    framework.test("Child logger creation", () => {
      const parentLogger = new Logger("Parent", {
        level: Logger.LogLevel.DEBUG,
      });
      parentLogger.addFilter("filtered");

      const childLogger = parentLogger.createChild("Child");
      mockConsole.clear();

      childLogger.info("Child message");
      childLogger.info("This is filtered message");

      framework.assertEqual(
        mockConsole.infos.length,
        1,
        "Child should inherit filters"
      );
      framework.assertContains(
        mockConsole.infos[0][0],
        "Parent.Child",
        "Child context should be correct"
      );
    });

    // エラーハンドリングのテスト
    framework.test("Error handling in middleware", () => {
      const logger = new Logger("TestContext");

      // エラーを投げるミドルウェアを追加
      logger.addMiddleware(() => {
        throw new Error("Middleware error");
      });

      mockConsole.clear();

      // エラーが投げられてもログが動作することを確認
      logger.info("Test message");
      framework.assert(
        mockConsole.infos.length === 1,
        "Logging should continue despite middleware error"
      );
    });

    // メモリ使用量ログのテスト
    framework.test("Memory usage logging", () => {
      const logger = new Logger("TestContext");
      mockConsole.clear();

      // performance.memoryが利用可能な場合のテスト
      if (typeof performance !== "undefined" && performance.memory) {
        const memory = logger.logMemoryUsage("Test Memory");
        framework.assert(
          mockConsole.infos.length === 1,
          "Memory usage should be logged"
        );
        framework.assert(
          memory !== null,
          "Memory usage object should be returned"
        );
      } else if (typeof process !== "undefined" && process.memoryUsage) {
        const memory = logger.logMemoryUsage("Test Memory");
        framework.assert(
          mockConsole.infos.length === 1,
          "Memory usage should be logged"
        );
        framework.assert(
          memory !== null,
          "Memory usage object should be returned"
        );
      } else {
        logger.logMemoryUsage("Test Memory");
        framework.assert(
          mockConsole.logs.length === 1,
          "Memory unavailable message should be logged"
        );
      }
    });

    // 新機能: メモリログのテスト
    framework.test("Memory logging destination", () => {
      const logger = new Logger("TestContext", {
        destination: [Logger.LogDestination.MEMORY],
      });

      logger.info("Memory log test");
      logger.warn("Memory warning test");

      const logs = logger.getMemoryLogs();
      framework.assert(
        logs.length === 2,
        "Two logs should be stored in memory"
      );
      framework.assertEqual(
        logs[0].message,
        "Memory log test",
        "First log message should match"
      );
      framework.assertEqual(
        logs[1].message,
        "Memory warning test",
        "Second log message should match"
      );

      // レベルフィルタリングのテスト
      const warnLogs = logger.getMemoryLogs({ level: Logger.LogLevel.WARN });
      framework.assertEqual(
        warnLogs.length,
        1,
        "Only warning logs should be returned"
      );

      // クリアのテスト
      logger.clearMemoryLogs();
      framework.assertEqual(
        logger.getMemoryLogs().length,
        0,
        "Memory logs should be cleared"
      );
    });

    // 新機能: カスタム出力先のテスト
    framework.test("Custom logging destination", () => {
      const customLogs = [];
      const customFn = (entry) => {
        customLogs.push(entry);
      };

      const logger = new Logger("TestContext", {
        destination: Logger.LogDestination.CUSTOM,
        customDestinationFn: customFn,
      });

      logger.info("Custom log test");

      framework.assertEqual(
        customLogs.length,
        1,
        "One log should be sent to custom destination"
      );
      framework.assertEqual(
        customLogs[0].message,
        "Custom log test",
        "Log message should match"
      );
    });

    // 新機能: パフォーマンス統計のテスト
    framework.test("Performance statistics", async () => {
      const logger = new Logger("TestContext");

      // 複数回測定
      for (let i = 0; i < 3; i++) {
        logger.startPerformance("repeated-op");
        await new Promise((resolve) => setTimeout(resolve, 5));
        logger.endPerformance("repeated-op");
      }

      const stats = logger.getPerformanceStats("repeated-op");
      framework.assert(stats !== null, "Performance stats should exist");
      framework.assertEqual(
        stats.count,
        3,
        "Operation should be counted 3 times"
      );
      framework.assert(
        stats.totalDuration >= 15,
        "Total duration should be at least 15ms"
      );
      framework.assert(
        stats.minDuration > 0,
        "Min duration should be positive"
      );
      framework.assert(
        stats.maxDuration > 0,
        "Max duration should be positive"
      );
    });

    // 新機能: メソッドチェーンのテスト
    framework.test("Method chaining", () => {
      const logger = new Logger("TestContext");
      mockConsole.clear();

      logger
        .setLevel(Logger.LogLevel.DEBUG)
        .addFilter("ignore")
        .info("First message")
        .debug("Debug message");

      framework.assertEqual(
        mockConsole.infos.length,
        1,
        "Info log should be recorded"
      );
      framework.assertEqual(
        mockConsole.logs.length,
        1,
        "Debug log should be recorded"
      );
    });

    await framework.run();
    return framework.failed === 0;
  } finally {
    // 元のコンソールを復元
    console.log = originalConsole.log;
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
    console.info = originalConsole.info;
  }
}

// テスト実行用の関数をグローバルに公開
if (typeof window !== "undefined") {
  window.runLoggerTests = runLoggerTests;
} else if (typeof module !== "undefined" && module.exports) {
  module.exports = { runLoggerTests };
}
