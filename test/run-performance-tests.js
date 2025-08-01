/**
 * パフォーマンステスト実行ランナー
 *
 * メモリ使用量、CPU使用率、レンダリングパフォーマンスを測定・最適化
 */

const fs = require("fs");
const path = require("path");

// パフォーマンステスト結果を格納
const performanceTestResults = {
  executionDate: new Date().toISOString(),
  totalTests: 0,
  passedTests: 0,
  failedTests: 0,
  testCategories: {
    memory: { passed: 0, failed: 0, total: 0, metrics: [] },
    cpu: { passed: 0, failed: 0, total: 0, metrics: [] },
    rendering: { passed: 0, failed: 0, total: 0, metrics: [] },
    largescale: { passed: 0, failed: 0, total: 0, metrics: [] },
  },
  testResults: [],
  performanceMetrics: {
    memoryUsage: {},
    cpuUsage: {},
    renderingTimes: {},
    throughput: {},
  },
  benchmarks: {
    baseline: {},
    optimized: {},
    improvement: {},
  },
  recommendations: [],
};

/**
 * メモリ使用量測定ユーティリティ
 */
class MemoryProfiler {
  constructor() {
    this.snapshots = [];
    this.baseline = null;
  }

  /**
   * メモリスナップショットを取得
   */
  takeSnapshot(label = "snapshot") {
    const memUsage = process.memoryUsage();
    const snapshot = {
      label,
      timestamp: Date.now(),
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss,
    };

    this.snapshots.push(snapshot);

    if (!this.baseline) {
      this.baseline = snapshot;
    }

    return snapshot;
  }

  /**
   * メモリ使用量の差分を計算
   */
  getDifference(snapshot1, snapshot2) {
    return {
      heapUsed: snapshot2.heapUsed - snapshot1.heapUsed,
      heapTotal: snapshot2.heapTotal - snapshot1.heapTotal,
      external: snapshot2.external - snapshot1.external,
      rss: snapshot2.rss - snapshot1.rss,
    };
  }

  /**
   * メモリリークを検出
   */
  detectMemoryLeak(threshold = 1024 * 1024) {
    // 1MB threshold
    if (this.snapshots.length < 2) return false;

    const latest = this.snapshots[this.snapshots.length - 1];
    const diff = this.getDifference(this.baseline, latest);

    return diff.heapUsed > threshold;
  }

  /**
   * メモリ使用量をフォーマット
   */
  formatBytes(bytes) {
    const sizes = ["Bytes", "KB", "MB", "GB"];
    if (bytes === 0) return "0 Bytes";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
  }
}

/**
 * CPU使用率測定ユーティリティ
 */
class CPUProfiler {
  constructor() {
    this.measurements = [];
    this.startTime = null;
    this.startUsage = null;
  }

  /**
   * CPU測定を開始
   */
  startMeasurement() {
    this.startTime = process.hrtime.bigint();
    this.startUsage = process.cpuUsage();
  }

  /**
   * CPU測定を終了
   */
  endMeasurement(label = "measurement") {
    if (!this.startTime || !this.startUsage) {
      throw new Error("CPU measurement not started");
    }

    const endTime = process.hrtime.bigint();
    const endUsage = process.cpuUsage(this.startUsage);

    const elapsedTime = Number(endTime - this.startTime) / 1000000; // Convert to milliseconds
    const cpuPercent = (endUsage.user + endUsage.system) / (elapsedTime * 10); // Rough CPU percentage

    const measurement = {
      label,
      elapsedTime,
      cpuTime: endUsage.user + endUsage.system,
      cpuPercent: Math.min(cpuPercent, 100), // Cap at 100%
      userTime: endUsage.user,
      systemTime: endUsage.system,
    };

    this.measurements.push(measurement);

    // Reset for next measurement
    this.startTime = null;
    this.startUsage = null;

    return measurement;
  }

  /**
   * 平均CPU使用率を計算
   */
  getAverageCPU() {
    if (this.measurements.length === 0) return 0;

    const total = this.measurements.reduce((sum, m) => sum + m.cpuPercent, 0);
    return total / this.measurements.length;
  }
}

/**
 * レンダリングパフォーマンス測定ユーティリティ
 */
class RenderingProfiler {
  constructor() {
    this.measurements = [];
  }

  /**
   * DOM操作のパフォーマンスを測定
   */
  async measureDOMOperation(operation, label = "DOM operation") {
    const startTime = performance.now();

    try {
      const result = await operation();
      const endTime = performance.now();
      const duration = endTime - startTime;

      const measurement = {
        label,
        duration,
        success: true,
        timestamp: Date.now(),
      };

      this.measurements.push(measurement);
      return { success: true, duration, result };
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;

      const measurement = {
        label,
        duration,
        success: false,
        error: error.message,
        timestamp: Date.now(),
      };

      this.measurements.push(measurement);
      return { success: false, duration, error };
    }
  }

  /**
   * 平均レンダリング時間を計算
   */
  getAverageRenderTime() {
    if (this.measurements.length === 0) return 0;

    const total = this.measurements.reduce((sum, m) => sum + m.duration, 0);
    return total / this.measurements.length;
  }
}

/**
 * メモリ使用量テストを実行
 */
async function runMemoryTests() {
  console.log("🧠 Running Memory Usage Tests...");
  console.log("=".repeat(50));

  const memoryProfiler = new MemoryProfiler();

  const memoryTests = [
    {
      name: "Baseline Memory Usage",
      run: async () => {
        const baseline = memoryProfiler.takeSnapshot("baseline");

        return {
          success: true,
          message: `Baseline memory: ${memoryProfiler.formatBytes(
            baseline.heapUsed
          )}`,
          metrics: baseline,
        };
      },
    },
    {
      name: "Logger Memory Impact",
      run: async () => {
        const beforeSnapshot = memoryProfiler.takeSnapshot("before-logger");

        // Logger使用をシミュレート
        if (typeof require !== "undefined") {
          const { Logger } = require("../infrastructure/logger.js");
          const logger = new Logger("PerformanceTest");

          // 大量のログを生成
          for (let i = 0; i < 1000; i++) {
            logger.info(`Performance test log ${i}`, { iteration: i });
          }
        }

        // ガベージコレクションを強制実行
        if (global.gc) {
          global.gc();
        }

        const afterSnapshot = memoryProfiler.takeSnapshot("after-logger");
        const diff = memoryProfiler.getDifference(
          beforeSnapshot,
          afterSnapshot
        );

        const memoryIncrease = diff.heapUsed;
        const isAcceptable = memoryIncrease < 5 * 1024 * 1024; // 5MB threshold

        return {
          success: isAcceptable,
          message: `Logger memory impact: ${memoryProfiler.formatBytes(
            memoryIncrease
          )}`,
          metrics: { memoryIncrease, beforeSnapshot, afterSnapshot },
        };
      },
    },
    {
      name: "MessageBus Memory Impact",
      run: async () => {
        const beforeSnapshot = memoryProfiler.takeSnapshot("before-messagebus");

        // MessageBus使用をシミュレート
        if (typeof require !== "undefined") {
          const { MessageBus } = require("../infrastructure/message-bus.js");
          const messageBus = new MessageBus();

          // 大量のメッセージハンドラーを登録
          for (let i = 0; i < 100; i++) {
            messageBus.registerHandler(`test-message-${i}`, () => {});
          }

          // メッセージを送信
          for (let i = 0; i < 500; i++) {
            messageBus.sendMessage({
              type: `test-message-${i % 100}`,
              data: { test: `data-${i}` },
            });
          }
        }

        if (global.gc) {
          global.gc();
        }

        const afterSnapshot = memoryProfiler.takeSnapshot("after-messagebus");
        const diff = memoryProfiler.getDifference(
          beforeSnapshot,
          afterSnapshot
        );

        const memoryIncrease = diff.heapUsed;
        const isAcceptable = memoryIncrease < 10 * 1024 * 1024; // 10MB threshold

        return {
          success: isAcceptable,
          message: `MessageBus memory impact: ${memoryProfiler.formatBytes(
            memoryIncrease
          )}`,
          metrics: { memoryIncrease, beforeSnapshot, afterSnapshot },
        };
      },
    },
    {
      name: "Memory Leak Detection",
      run: async () => {
        const initialSnapshot = memoryProfiler.takeSnapshot("leak-test-start");

        // メモリリークをシミュレート（意図的にリークを作らない）
        const objects = [];
        for (let i = 0; i < 1000; i++) {
          objects.push({ id: i, data: new Array(100).fill(i) });
        }

        // オブジェクトをクリア
        objects.length = 0;

        if (global.gc) {
          global.gc();
        }

        const finalSnapshot = memoryProfiler.takeSnapshot("leak-test-end");
        const hasLeak = memoryProfiler.detectMemoryLeak(2 * 1024 * 1024); // 2MB threshold

        return {
          success: !hasLeak,
          message: hasLeak ? "Memory leak detected" : "No memory leak detected",
          metrics: { initialSnapshot, finalSnapshot, hasLeak },
        };
      },
    },
  ];

  for (const test of memoryTests) {
    console.log(`\n🧠 Running: ${test.name}`);

    try {
      const result = await test.run();

      performanceTestResults.testResults.push({
        name: test.name,
        category: "memory",
        status: result.success ? "PASSED" : "FAILED",
        message: result.message,
        metrics: result.metrics,
      });

      if (result.success) {
        console.log(`✅ ${test.name} - PASSED: ${result.message}`);
        performanceTestResults.testCategories.memory.passed++;
      } else {
        console.log(`❌ ${test.name} - FAILED: ${result.message}`);
        performanceTestResults.testCategories.memory.failed++;
      }

      performanceTestResults.testCategories.memory.total++;
      performanceTestResults.testCategories.memory.metrics.push(result.metrics);
    } catch (error) {
      console.log(`❌ ${test.name} - ERROR: ${error.message}`);
      performanceTestResults.testCategories.memory.failed++;
      performanceTestResults.testCategories.memory.total++;
    }
  }
}

/**
 * CPU使用率テストを実行
 */
async function runCPUTests() {
  console.log("\n⚡ Running CPU Usage Tests...");
  console.log("=".repeat(50));

  const cpuProfiler = new CPUProfiler();

  const cpuTests = [
    {
      name: "Logger CPU Performance",
      run: async () => {
        cpuProfiler.startMeasurement();

        // Logger使用をシミュレート
        if (typeof require !== "undefined") {
          const { Logger } = require("../infrastructure/logger.js");
          const logger = new Logger("CPUTest");

          // CPU集約的なログ処理
          for (let i = 0; i < 10000; i++) {
            logger.debug(`CPU test log ${i}`, {
              iteration: i,
              timestamp: Date.now(),
              data: new Array(10).fill(i),
            });
          }
        }

        const measurement = cpuProfiler.endMeasurement("logger-cpu");
        const isAcceptable = measurement.cpuPercent < 50; // 50% CPU threshold

        return {
          success: isAcceptable,
          message: `Logger CPU usage: ${measurement.cpuPercent.toFixed(
            2
          )}% (${measurement.elapsedTime.toFixed(2)}ms)`,
          metrics: measurement,
        };
      },
    },
    {
      name: "MessageBus CPU Performance",
      run: async () => {
        cpuProfiler.startMeasurement();

        // MessageBus使用をシミュレート
        if (typeof require !== "undefined") {
          const { MessageBus } = require("../infrastructure/message-bus.js");
          const messageBus = new MessageBus();

          // ハンドラーを登録
          for (let i = 0; i < 50; i++) {
            messageBus.registerHandler(`cpu-test-${i}`, (message) => {
              // CPU集約的な処理をシミュレート
              let sum = 0;
              for (let j = 0; j < 1000; j++) {
                sum += j * Math.random();
              }
              return sum;
            });
          }

          // メッセージを大量送信
          for (let i = 0; i < 1000; i++) {
            messageBus.sendMessage({
              type: `cpu-test-${i % 50}`,
              data: { iteration: i },
            });
          }
        }

        const measurement = cpuProfiler.endMeasurement("messagebus-cpu");
        const isAcceptable = measurement.cpuPercent < 70; // 70% CPU threshold

        return {
          success: isAcceptable,
          message: `MessageBus CPU usage: ${measurement.cpuPercent.toFixed(
            2
          )}% (${measurement.elapsedTime.toFixed(2)}ms)`,
          metrics: measurement,
        };
      },
    },
    {
      name: "StorageAdapter CPU Performance",
      run: async () => {
        cpuProfiler.startMeasurement();

        // StorageAdapter使用をシミュレート
        if (typeof require !== "undefined") {
          const {
            StorageAdapter,
          } = require("../infrastructure/storage-adapter.js");
          const storage = new StorageAdapter();

          // 大量のストレージ操作
          for (let i = 0; i < 1000; i++) {
            await storage.set(`cpu-test-key-${i}`, {
              id: i,
              data: new Array(100).fill(i),
              timestamp: Date.now(),
            });
          }

          // データを読み込み
          for (let i = 0; i < 1000; i++) {
            await storage.get(`cpu-test-key-${i}`);
          }
        }

        const measurement = cpuProfiler.endMeasurement("storage-cpu");
        const isAcceptable = measurement.cpuPercent < 60; // 60% CPU threshold

        return {
          success: isAcceptable,
          message: `StorageAdapter CPU usage: ${measurement.cpuPercent.toFixed(
            2
          )}% (${measurement.elapsedTime.toFixed(2)}ms)`,
          metrics: measurement,
        };
      },
    },
  ];

  for (const test of cpuTests) {
    console.log(`\n⚡ Running: ${test.name}`);

    try {
      const result = await test.run();

      performanceTestResults.testResults.push({
        name: test.name,
        category: "cpu",
        status: result.success ? "PASSED" : "FAILED",
        message: result.message,
        metrics: result.metrics,
      });

      if (result.success) {
        console.log(`✅ ${test.name} - PASSED: ${result.message}`);
        performanceTestResults.testCategories.cpu.passed++;
      } else {
        console.log(`❌ ${test.name} - FAILED: ${result.message}`);
        performanceTestResults.testCategories.cpu.failed++;
      }

      performanceTestResults.testCategories.cpu.total++;
      performanceTestResults.testCategories.cpu.metrics.push(result.metrics);
    } catch (error) {
      console.log(`❌ ${test.name} - ERROR: ${error.message}`);
      performanceTestResults.testCategories.cpu.failed++;
      performanceTestResults.testCategories.cpu.total++;
    }
  }
}

/**
 * レンダリングパフォーマンステストを実行
 */
async function runRenderingTests() {
  console.log("\n🎨 Running Rendering Performance Tests...");
  console.log("=".repeat(50));

  const renderingProfiler = new RenderingProfiler();

  const renderingTests = [
    {
      name: "DOM Element Creation Performance",
      run: async () => {
        const result = await renderingProfiler.measureDOMOperation(async () => {
          // DOM要素作成をシミュレート（Node.js環境では制限あり）
          const elements = [];
          for (let i = 0; i < 1000; i++) {
            // 実際のDOM操作の代わりにオブジェクト作成でシミュレート
            elements.push({
              tagName: "div",
              className: `theater-mode-element-${i}`,
              style: { opacity: 0.7, position: "absolute" },
              children: [],
            });
          }
          return elements;
        }, "dom-creation");

        const isAcceptable = result.duration < 100; // 100ms threshold

        return {
          success: isAcceptable,
          message: `DOM creation time: ${result.duration.toFixed(2)}ms`,
          metrics: { duration: result.duration, isAcceptable },
        };
      },
    },
    {
      name: "Style Calculation Performance",
      run: async () => {
        const result = await renderingProfiler.measureDOMOperation(async () => {
          // スタイル計算をシミュレート
          const styles = [];
          for (let i = 0; i < 5000; i++) {
            styles.push({
              opacity: Math.random() * 0.9,
              backgroundColor: `rgba(0, 0, 0, ${Math.random() * 0.9})`,
              transform: `translateX(${Math.random() * 100}px)`,
              zIndex: Math.floor(Math.random() * 1000),
            });
          }
          return styles;
        }, "style-calculation");

        const isAcceptable = result.duration < 50; // 50ms threshold

        return {
          success: isAcceptable,
          message: `Style calculation time: ${result.duration.toFixed(2)}ms`,
          metrics: { duration: result.duration, isAcceptable },
        };
      },
    },
    {
      name: "Animation Performance Simulation",
      run: async () => {
        const result = await renderingProfiler.measureDOMOperation(async () => {
          // アニメーション処理をシミュレート
          const frames = [];
          const frameCount = 60; // 1秒間のフレーム数

          for (let frame = 0; frame < frameCount; frame++) {
            const progress = frame / frameCount;
            frames.push({
              opacity: 0.9 * (1 - progress),
              transform: `scale(${1 + progress * 0.1})`,
              timestamp: Date.now() + frame * 16.67, // 60fps
            });

            // フレーム間の処理をシミュレート
            await new Promise((resolve) => setTimeout(resolve, 1));
          }

          return frames;
        }, "animation-simulation");

        const isAcceptable = result.duration < 200; // 200ms threshold

        return {
          success: isAcceptable,
          message: `Animation simulation time: ${result.duration.toFixed(2)}ms`,
          metrics: { duration: result.duration, isAcceptable },
        };
      },
    },
  ];

  for (const test of renderingTests) {
    console.log(`\n🎨 Running: ${test.name}`);

    try {
      const result = await test.run();

      performanceTestResults.testResults.push({
        name: test.name,
        category: "rendering",
        status: result.success ? "PASSED" : "FAILED",
        message: result.message,
        metrics: result.metrics,
      });

      if (result.success) {
        console.log(`✅ ${test.name} - PASSED: ${result.message}`);
        performanceTestResults.testCategories.rendering.passed++;
      } else {
        console.log(`❌ ${test.name} - FAILED: ${result.message}`);
        performanceTestResults.testCategories.rendering.failed++;
      }

      performanceTestResults.testCategories.rendering.total++;
      performanceTestResults.testCategories.rendering.metrics.push(
        result.metrics
      );
    } catch (error) {
      console.log(`❌ ${test.name} - ERROR: ${error.message}`);
      performanceTestResults.testCategories.rendering.failed++;
      performanceTestResults.testCategories.rendering.total++;
    }
  }
}

/**
 * 大量データでの動作確認テストを実行
 */
async function runLargeScaleTests() {
  console.log("\n📊 Running Large Scale Performance Tests...");
  console.log("=".repeat(50));

  const largeScaleTests = [
    {
      name: "High Volume Message Processing",
      run: async () => {
        const startTime = Date.now();

        if (typeof require !== "undefined") {
          const { MessageBus } = require("../infrastructure/message-bus.js");
          const messageBus = new MessageBus();

          let processedCount = 0;

          // ハンドラーを登録
          messageBus.registerHandler("high-volume-test", (message) => {
            processedCount++;
            return { processed: true, id: message.data.id };
          });

          // 大量のメッセージを送信
          const messageCount = 10000;
          for (let i = 0; i < messageCount; i++) {
            messageBus.sendMessage({
              type: "high-volume-test",
              data: { id: i, payload: `data-${i}` },
            });
          }

          // 処理完了を待機
          await new Promise((resolve) => setTimeout(resolve, 100));

          const endTime = Date.now();
          const duration = endTime - startTime;
          const throughput = messageCount / (duration / 1000); // messages per second

          const isAcceptable = throughput > 1000; // 1000 messages/sec threshold

          return {
            success: isAcceptable,
            message: `Processed ${processedCount}/${messageCount} messages in ${duration}ms (${throughput.toFixed(
              0
            )} msg/sec)`,
            metrics: { processedCount, messageCount, duration, throughput },
          };
        }

        return {
          success: false,
          message: "Node.js environment required for this test",
        };
      },
    },
    {
      name: "Large Dataset Storage Performance",
      run: async () => {
        const startTime = Date.now();

        if (typeof require !== "undefined") {
          const {
            StorageAdapter,
          } = require("../infrastructure/storage-adapter.js");
          const storage = new StorageAdapter();

          const datasetSize = 1000;
          const largeObject = {
            id: "large-dataset",
            data: new Array(1000).fill(0).map((_, i) => ({
              id: i,
              name: `Item ${i}`,
              description: `Description for item ${i}`,
              metadata: {
                created: Date.now(),
                tags: [`tag-${i % 10}`, `category-${i % 5}`],
                properties: new Array(10).fill(0).map((_, j) => `prop-${j}`),
              },
            })),
          };

          // 大量データを保存
          await storage.set("large-dataset", largeObject);

          // データを読み込み
          const retrieved = await storage.get("large-dataset");

          const endTime = Date.now();
          const duration = endTime - startTime;

          const isAcceptable =
            duration < 1000 &&
            retrieved &&
            retrieved.data.length === datasetSize;

          return {
            success: isAcceptable,
            message: `Large dataset operation completed in ${duration}ms`,
            metrics: { duration, datasetSize, success: !!retrieved },
          };
        }

        return {
          success: false,
          message: "Node.js environment required for this test",
        };
      },
    },
    {
      name: "Concurrent Operations Stress Test",
      run: async () => {
        const startTime = Date.now();

        // 並行処理をシミュレート
        const concurrentOperations = [];
        const operationCount = 100;

        for (let i = 0; i < operationCount; i++) {
          concurrentOperations.push(
            new Promise(async (resolve) => {
              // CPU集約的な処理をシミュレート
              let result = 0;
              for (let j = 0; j < 10000; j++) {
                result += Math.sqrt(j) * Math.random();
              }

              // 非同期処理をシミュレート
              await new Promise((r) => setTimeout(r, Math.random() * 10));

              resolve({ id: i, result });
            })
          );
        }

        const results = await Promise.all(concurrentOperations);

        const endTime = Date.now();
        const duration = endTime - startTime;
        const throughput = operationCount / (duration / 1000);

        const isAcceptable =
          duration < 5000 && results.length === operationCount;

        return {
          success: isAcceptable,
          message: `${operationCount} concurrent operations completed in ${duration}ms (${throughput.toFixed(
            1
          )} ops/sec)`,
          metrics: {
            operationCount,
            duration,
            throughput,
            completedCount: results.length,
          },
        };
      },
    },
  ];

  for (const test of largeScaleTests) {
    console.log(`\n📊 Running: ${test.name}`);

    try {
      const result = await test.run();

      performanceTestResults.testResults.push({
        name: test.name,
        category: "largescale",
        status: result.success ? "PASSED" : "FAILED",
        message: result.message,
        metrics: result.metrics,
      });

      if (result.success) {
        console.log(`✅ ${test.name} - PASSED: ${result.message}`);
        performanceTestResults.testCategories.largescale.passed++;
      } else {
        console.log(`❌ ${test.name} - FAILED: ${result.message}`);
        performanceTestResults.testCategories.largescale.failed++;
      }

      performanceTestResults.testCategories.largescale.total++;
      performanceTestResults.testCategories.largescale.metrics.push(
        result.metrics
      );
    } catch (error) {
      console.log(`❌ ${test.name} - ERROR: ${error.message}`);
      performanceTestResults.testCategories.largescale.failed++;
      performanceTestResults.testCategories.largescale.total++;
    }
  }
}

/**
 * パフォーマンステスト結果を表示
 */
function displayPerformanceResults() {
  console.log("\n" + "=".repeat(60));
  console.log("📊 PERFORMANCE TEST RESULTS");
  console.log("=".repeat(60));

  // カテゴリ別結果
  console.log("\n📋 Results by Category:");
  Object.entries(performanceTestResults.testCategories).forEach(
    ([category, results]) => {
      const successRate =
        results.total > 0
          ? ((results.passed / results.total) * 100).toFixed(1)
          : "0.0";
      console.log(`  ${category}:`);
      console.log(`    Total: ${results.total}`);
      console.log(`    Passed: ${results.passed}`);
      console.log(`    Failed: ${results.failed}`);
      console.log(`    Success Rate: ${successRate}%`);
    }
  );

  // 全体統計
  performanceTestResults.totalTests = performanceTestResults.testResults.length;
  performanceTestResults.passedTests =
    performanceTestResults.testResults.filter(
      (r) => r.status === "PASSED"
    ).length;
  performanceTestResults.failedTests =
    performanceTestResults.totalTests - performanceTestResults.passedTests;

  console.log("\n📈 Overall Statistics:");
  console.log(`  Total Tests: ${performanceTestResults.totalTests}`);
  console.log(`  Passed: ${performanceTestResults.passedTests}`);
  console.log(`  Failed: ${performanceTestResults.failedTests}`);
  console.log(
    `  Success Rate: ${(
      (performanceTestResults.passedTests / performanceTestResults.totalTests) *
      100
    ).toFixed(1)}%`
  );

  // パフォーマンス改善の推奨事項を生成
  generatePerformanceRecommendations();

  console.log("\n💡 Performance Recommendations:");
  performanceTestResults.recommendations.forEach((rec, index) => {
    console.log(`  ${index + 1}. ${rec}`);
  });

  console.log("=".repeat(60));
}

/**
 * パフォーマンス改善の推奨事項を生成
 */
function generatePerformanceRecommendations() {
  performanceTestResults.recommendations = [
    "Implement memory pooling for frequently created objects",
    "Add lazy loading for non-critical components",
    "Optimize DOM operations with batching and virtual DOM techniques",
    "Implement efficient caching strategies for frequently accessed data",
    "Use Web Workers for CPU-intensive operations",
    "Optimize CSS selectors and reduce DOM queries",
    "Implement proper cleanup for event listeners and observers",
    "Add performance monitoring in production environment",
    "Consider using requestAnimationFrame for smooth animations",
    "Implement throttling and debouncing for high-frequency events",
  ];

  // 失敗したテストに基づく具体的な推奨事項
  const failedTests = performanceTestResults.testResults.filter(
    (r) => r.status === "FAILED"
  );

  if (failedTests.some((t) => t.category === "memory")) {
    performanceTestResults.recommendations.unshift(
      "Critical: Address memory usage issues - implement better garbage collection"
    );
  }

  if (failedTests.some((t) => t.category === "cpu")) {
    performanceTestResults.recommendations.unshift(
      "Warning: High CPU usage detected - optimize algorithms and reduce computational complexity"
    );
  }

  if (failedTests.some((t) => t.category === "rendering")) {
    performanceTestResults.recommendations.unshift(
      "Notice: Rendering performance needs improvement - optimize DOM operations"
    );
  }
}

/**
 * パフォーマンステストレポートを保存
 */
function savePerformanceReport() {
  const reportPath = path.join(__dirname, "performance-test-report.json");

  try {
    fs.writeFileSync(
      reportPath,
      JSON.stringify(performanceTestResults, null, 2)
    );
    console.log(`\n📄 Performance test report saved to: ${reportPath}`);
  } catch (error) {
    console.error("Failed to save performance test report:", error.message);
  }
}

/**
 * 全パフォーマンステストを実行
 */
async function runAllPerformanceTests() {
  console.log("🚀 Starting Performance Test Suite");
  console.log("=".repeat(60));

  const startTime = Date.now();

  try {
    // メモリ使用量テスト
    await runMemoryTests();

    // CPU使用率テスト
    await runCPUTests();

    // レンダリングパフォーマンステスト
    await runRenderingTests();

    // 大量データテスト
    await runLargeScaleTests();

    const endTime = Date.now();
    const duration = endTime - startTime;

    // 結果を表示
    displayPerformanceResults();

    // レポートを保存
    savePerformanceReport();

    console.log(`\n⏱️  Total execution time: ${(duration / 1000).toFixed(2)}s`);

    return performanceTestResults.failedTests === 0;
  } catch (error) {
    console.error("Fatal error during performance tests:", error);
    return false;
  }
}

// Node.js環境での実行
if (typeof module !== "undefined" && require.main === module) {
  runAllPerformanceTests()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error("Fatal error running performance tests:", error);
      process.exit(1);
    });
}

// エクスポート
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    runAllPerformanceTests,
    runMemoryTests,
    runCPUTests,
    runRenderingTests,
    runLargeScaleTests,
    performanceTestResults,
    MemoryProfiler,
    CPUProfiler,
    RenderingProfiler,
  };
}
