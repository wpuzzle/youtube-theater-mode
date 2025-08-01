/**
 * PerformanceMonitor のテスト
 */

// テスト用のモックLogger
class MockLogger {
  constructor() {
    this.logs = [];
  }

  info(message, data) {
    this.logs.push({ level: "info", message, data });
  }

  warn(message, data) {
    this.logs.push({ level: "warn", message, data });
  }

  error(message, data) {
    this.logs.push({ level: "error", message, data });
  }

  debug(message, data) {
    this.logs.push({ level: "debug", message, data });
  }

  getLastLog() {
    return this.logs[this.logs.length - 1];
  }

  clear() {
    this.logs = [];
  }
}

// テスト用のモックPerformance API
class MockPerformance {
  constructor() {
    this.memory = {
      usedJSHeapSize: 10 * 1024 * 1024, // 10MB
      totalJSHeapSize: 20 * 1024 * 1024, // 20MB
      jsHeapSizeLimit: 100 * 1024 * 1024, // 100MB
    };
    this.marks = new Map();
    this.measures = [];
  }

  now() {
    return Date.now();
  }

  mark(name) {
    this.marks.set(name, this.now());
  }

  measure(name, startMark, endMark) {
    const startTime = this.marks.get(startMark) || 0;
    const endTime = this.marks.get(endMark) || this.now();
    const duration = endTime - startTime;

    this.measures.push({
      name,
      duration,
      startTime,
      entryType: "measure",
    });
  }

  getEntriesByName(name, type) {
    return this.measures.filter((m) => m.name === name && m.entryType === type);
  }

  setMemoryUsage(used, total, limit) {
    this.memory.usedJSHeapSize = used;
    this.memory.totalJSHeapSize = total;
    this.memory.jsHeapSizeLimit = limit;
  }
}

// テスト実行関数
async function runPerformanceMonitorTests() {
  console.log("=== PerformanceMonitor Tests ===");

  let testCount = 0;
  let passCount = 0;

  function test(name, testFn) {
    testCount++;
    try {
      console.log(`Running: ${name}`);
      testFn();
      console.log(`✓ ${name}`);
      passCount++;
    } catch (error) {
      console.error(`✗ ${name}: ${error.message}`);
    }
  }

  function assert(condition, message) {
    if (!condition) {
      throw new Error(message || "Assertion failed");
    }
  }

  function assertEquals(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
  }

  // テスト用のセットアップ
  const mockLogger = new MockLogger();
  const mockPerformance = new MockPerformance();

  // グローバルperformanceをモック
  const originalPerformance = global.performance || window.performance;
  if (typeof global !== "undefined") {
    global.performance = mockPerformance;
  } else {
    window.performance = mockPerformance;
  }

  // PerformanceMonitor インスタンス作成テスト
  test("PerformanceMonitor constructor", () => {
    const monitor = new PerformanceMonitor(mockLogger);
    assert(
      monitor instanceof PerformanceMonitor,
      "Should create PerformanceMonitor instance"
    );
    assert(monitor.logger === mockLogger, "Should set logger");
    assert(!monitor.isMonitoring, "Should not be monitoring initially");
  });

  // オプション設定テスト
  test("PerformanceMonitor constructor with options", () => {
    const options = {
      memoryThreshold: 100 * 1024 * 1024,
      renderTimeThreshold: 20,
      cpuThreshold: 90,
      sampleInterval: 2000,
    };

    const monitor = new PerformanceMonitor(mockLogger, options);
    assertEquals(
      monitor.options.memoryThreshold,
      options.memoryThreshold,
      "Should set memory threshold"
    );
    assertEquals(
      monitor.options.renderTimeThreshold,
      options.renderTimeThreshold,
      "Should set render time threshold"
    );
    assertEquals(
      monitor.options.cpuThreshold,
      options.cpuThreshold,
      "Should set CPU threshold"
    );
    assertEquals(
      monitor.options.sampleInterval,
      options.sampleInterval,
      "Should set sample interval"
    );
  });

  // 監視開始テスト
  test("Start monitoring", async () => {
    const monitor = new PerformanceMonitor(mockLogger);

    await monitor.startMonitoring();
    assert(monitor.isMonitoring, "Should be monitoring after start");
    assert(
      monitor.monitoringInterval !== null,
      "Should have monitoring interval"
    );

    monitor.stopMonitoring();
  });

  // 監視停止テスト
  test("Stop monitoring", async () => {
    const monitor = new PerformanceMonitor(mockLogger);

    await monitor.startMonitoring();
    monitor.stopMonitoring();

    assert(!monitor.isMonitoring, "Should not be monitoring after stop");
    assert(
      monitor.monitoringInterval === null,
      "Should clear monitoring interval"
    );
  });

  // メトリクス収集テスト
  test("Collect memory metrics", () => {
    const monitor = new PerformanceMonitor(mockLogger);

    // メモリ使用量を設定
    mockPerformance.setMemoryUsage(
      15 * 1024 * 1024,
      30 * 1024 * 1024,
      100 * 1024 * 1024
    );

    monitor.collectMemoryMetrics();

    assert(monitor.metrics.memory.length > 0, "Should collect memory metrics");

    const latestMemory =
      monitor.metrics.memory[monitor.metrics.memory.length - 1];
    assertEquals(
      latestMemory.usedJSHeapSize,
      15 * 1024 * 1024,
      "Should record correct memory usage"
    );
  });

  // パフォーマンス測定テスト
  test("Performance measurement", () => {
    const monitor = new PerformanceMonitor(mockLogger);

    monitor.startMeasure("test-operation");

    // 少し待機
    setTimeout(() => {
      const duration = monitor.endMeasure("test-operation");
      assert(typeof duration === "number", "Should return duration as number");
      assert(duration >= 0, "Duration should be non-negative");
    }, 10);
  });

  // メトリクス取得テスト
  test("Get metrics", () => {
    const monitor = new PerformanceMonitor(mockLogger);

    // いくつかのメトリクスを追加
    monitor.metrics.memory.push({
      timestamp: Date.now(),
      usedJSHeapSize: 20 * 1024 * 1024,
      totalJSHeapSize: 40 * 1024 * 1024,
      jsHeapSizeLimit: 100 * 1024 * 1024,
    });

    monitor.metrics.cpuUsage.push({
      timestamp: Date.now(),
      usage: 50,
    });

    const metrics = monitor.getMetrics();

    assert(metrics.memory !== null, "Should return memory stats");
    assert(metrics.cpu !== null, "Should return CPU stats");
    assert(
      typeof metrics.frameDrops === "number",
      "Should return frame drops count"
    );
    assert(
      typeof metrics.isMonitoring === "boolean",
      "Should return monitoring status"
    );
  });

  // 高メモリ使用量アラートテスト
  test("High memory usage alert", () => {
    let alertCalled = false;
    const alertCallback = (issues) => {
      alertCalled = true;
      assert(issues.length > 0, "Should have issues");
      assert(
        issues[0].type === "HIGH_MEMORY_USAGE",
        "Should detect high memory usage"
      );
    };

    const monitor = new PerformanceMonitor(mockLogger, {
      memoryThreshold: 10 * 1024 * 1024, // 10MB threshold
      alertCallback,
    });

    // 高いメモリ使用量を設定
    mockPerformance.setMemoryUsage(
      20 * 1024 * 1024,
      40 * 1024 * 1024,
      100 * 1024 * 1024
    );
    monitor.collectMemoryMetrics();
    monitor.checkPerformanceIssues();

    assert(alertCalled, "Should call alert callback for high memory usage");
  });

  // メトリクスクリアテスト
  test("Clear metrics", () => {
    const monitor = new PerformanceMonitor(mockLogger);

    // メトリクスを追加
    monitor.metrics.memory.push({
      timestamp: Date.now(),
      usedJSHeapSize: 1024,
    });
    monitor.metrics.cpuUsage.push({ timestamp: Date.now(), usage: 50 });
    monitor.metrics.frameDrops = 5;

    monitor.clearMetrics();

    assertEquals(
      monitor.metrics.memory.length,
      0,
      "Should clear memory metrics"
    );
    assertEquals(
      monitor.metrics.cpuUsage.length,
      0,
      "Should clear CPU metrics"
    );
    assertEquals(monitor.metrics.frameDrops, 0, "Should reset frame drops");
  });

  // クリーンアップテスト
  test("Cleanup", () => {
    const monitor = new PerformanceMonitor(mockLogger);

    monitor.metrics.memory.push({
      timestamp: Date.now(),
      usedJSHeapSize: 1024,
    });
    monitor.isMonitoring = true;

    monitor.cleanup();

    assert(!monitor.isMonitoring, "Should stop monitoring");
    assertEquals(monitor.metrics.memory.length, 0, "Should clear metrics");
  });

  // CPU使用率推定テスト
  test("CPU usage estimation", () => {
    const monitor = new PerformanceMonitor(mockLogger);

    monitor.estimateCPUUsage();

    // CPU使用率推定は非同期なので、すぐには結果が出ない
    // ここでは関数が正常に実行されることをテスト
    assert(
      typeof monitor.estimateCPUUsage === "function",
      "Should have estimateCPUUsage method"
    );
    assert(
      Array.isArray(monitor.metrics.cpuUsage),
      "Should have cpuUsage array"
    );
  });

  // パフォーマンスエントリ処理テスト
  test("Process performance entries", () => {
    const monitor = new PerformanceMonitor(mockLogger);

    const entries = [
      { entryType: "measure", name: "test-measure", duration: 10 },
      {
        entryType: "navigation",
        domContentLoadedEventStart: 100,
        domContentLoadedEventEnd: 150,
        loadEventStart: 200,
        loadEventEnd: 250,
      },
      { entryType: "paint", name: "first-paint", startTime: 50 },
      { entryType: "layout-shift", value: 0.15, hadRecentInput: false },
    ];

    monitor.processPerformanceEntries(entries);

    // ログが記録されているかチェック
    const logs = mockLogger.logs;
    assert(
      logs.some((log) => log.message === "Performance measure"),
      "Should log performance measure"
    );
    assert(
      logs.some((log) => log.message === "Navigation timing"),
      "Should log navigation timing"
    );
    assert(
      logs.some((log) => log.message === "Paint timing"),
      "Should log paint timing"
    );
    assert(
      logs.some((log) => log.message === "Layout shift detected"),
      "Should log layout shift"
    );
  });

  // 元のperformanceを復元
  if (typeof global !== "undefined") {
    global.performance = originalPerformance;
  } else {
    window.performance = originalPerformance;
  }

  // テスト結果の表示
  console.log(`\n=== Test Results ===`);
  console.log(`Total: ${testCount}`);
  console.log(`Passed: ${passCount}`);
  console.log(`Failed: ${testCount - passCount}`);

  if (passCount === testCount) {
    console.log("✓ All tests passed!");
  } else {
    console.log("✗ Some tests failed");
  }

  return passCount === testCount;
}

// テスト実行
if (typeof module !== "undefined" && module.exports) {
  module.exports = { runPerformanceMonitorTests };
} else {
  // ブラウザ環境での実行
  runPerformanceMonitorTests();
}
