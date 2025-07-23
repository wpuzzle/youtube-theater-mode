/**
 * Logger システムのデバッグ機能テスト
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
    console.log("Running Logger Debug tests...\n");

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
async function runLoggerDebugTests() {
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
  console.log = (...args) => {
    originalConsole.log(...args);
    mockConsole.log(...args);
  };
  console.error = (...args) => {
    originalConsole.error(...args);
    mockConsole.error(...args);
  };
  console.warn = (...args) => {
    originalConsole.warn(...args);
    mockConsole.warn(...args);
  };
  console.info = (...args) => {
    originalConsole.info(...args);
    mockConsole.info(...args);
  };

  try {
    // 基本的なロガー作成テスト
    framework.test("Basic logger creation", () => {
      const logger = new Logger("TestContext");
      framework.assert(
        logger instanceof Logger,
        "Should create a Logger instance"
      );
      framework.assertEqual(
        logger.context,
        "TestContext",
        "Context should be set correctly"
      );
    });

    // スタックトレース情報のテスト
    framework.test("Stack trace in debug logs", () => {
      const logger = new Logger("TestContext", {
        level: Logger.LogLevel.DEBUG,
      });

      // エントリを取得
      const entry = logger._createLogEntry(Logger.LogLevel.DEBUG, "Test", null);

      framework.assert(
        Array.isArray(entry.stack),
        "Stack trace should be an array"
      );
      framework.assert(
        entry.stack.length > 0,
        "Stack trace should not be empty"
      );
    });

    // 複数出力先のテスト
    framework.test("Multiple log destinations", () => {
      const customLogs = [];
      const customFn = (entry) => {
        customLogs.push(entry);
      };

      const logger = new Logger("TestContext", {
        destination: [
          Logger.LogDestination.CONSOLE,
          Logger.LogDestination.MEMORY,
          Logger.LogDestination.CUSTOM,
        ],
        customDestinationFn: customFn,
      });

      mockConsole.clear();
      logger.info("Multi-destination test");

      // コンソール出力を確認
      framework.assert(
        mockConsole.infos.length > 0,
        "Log should be sent to console"
      );

      // メモリログを確認
      const memoryLogs = logger.getMemoryLogs();
      framework.assert(memoryLogs.length > 0, "Log should be stored in memory");

      // カスタム出力を確認
      framework.assert(
        customLogs.length > 0,
        "Log should be sent to custom destination"
      );
    });

    // パフォーマンスモニタリングの詳細テスト
    framework.test("Detailed performance monitoring", async () => {
      const logger = new Logger("TestContext");

      // 異なる時間で複数回測定
      logger.startPerformance("operation-1");
      await new Promise((resolve) => setTimeout(resolve, 5));
      logger.endPerformance("operation-1");

      logger.startPerformance("operation-1");
      await new Promise((resolve) => setTimeout(resolve, 10));
      logger.endPerformance("operation-1");

      logger.startPerformance("operation-2");
      await new Promise((resolve) => setTimeout(resolve, 7));
      logger.endPerformance("operation-2");

      // 特定の操作の統計を取得
      const stats1 = logger.getPerformanceStats("operation-1");
      framework.assert(stats1 !== null, "Should get stats for operation-1");
      framework.assertEqual(
        stats1.count,
        2,
        "Operation-1 should be counted twice"
      );

      // 全ての統計を取得
      const allStats = logger.getPerformanceStats();
      framework.assert(allStats !== null, "Should get all stats");
      framework.assert(
        "operation-1" in allStats,
        "Operation-1 should be in all stats"
      );
      framework.assert(
        "operation-2" in allStats,
        "Operation-2 should be in all stats"
      );
    });

    // メモリログのフィルタリングテスト
    framework.test("Memory logs filtering", () => {
      // メモリ出力先を明示的に指定
      const logger = new Logger("TestContext", {
        destination: [Logger.LogDestination.MEMORY],
      });

      // 異なるレベルとコンテキストでログを出力
      logger.info("Info message");
      logger.warn("Warning message");
      logger.error("Error message");

      // 全てのログを確認
      const allLogs = logger.getMemoryLogs();
      framework.assert(allLogs.length === 3, "Should have 3 logs in memory");

      // レベルでフィルタリング
      const errorLogs = logger.getMemoryLogs({ level: Logger.LogLevel.ERROR });
      framework.assert(errorLogs.length > 0, "Should get error logs");

      // 子ロガーのテスト
      const childLogger = logger.createChild("Child");
      childLogger.setDestinations([Logger.LogDestination.MEMORY]);
      childLogger.info("Child info");
      childLogger.error("Child error");

      // 親ロガーのメモリログに子ロガーのログが含まれるか確認
      const updatedLogs = logger.getMemoryLogs();
      framework.assert(
        updatedLogs.length >= 3,
        "Should have at least 3 logs in memory"
      );

      // 子ロガーのメモリログを確認
      const childLogs = childLogger.getMemoryLogs();
      framework.assert(
        childLogs.length >= 2,
        "Child logger should have at least 2 logs"
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
  window.runLoggerDebugTests = runLoggerDebugTests;
} else if (typeof module !== "undefined" && module.exports) {
  module.exports = { runLoggerDebugTests };
}
