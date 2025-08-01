/**
 * PerformanceMonitor テストランナー
 */

// 必要なファイルを読み込み
if (typeof require !== "undefined") {
  // Node.js環境
  const PerformanceMonitor = require("../infrastructure/performance-monitor.js");
  const {
    runPerformanceMonitorTests,
  } = require("./test-performance-monitor.js");

  // グローバルに設定
  global.PerformanceMonitor = PerformanceMonitor;

  console.log("Running PerformanceMonitor tests in Node.js environment...");
  runPerformanceMonitorTests().then((success) => {
    process.exit(success ? 0 : 1);
  });
} else {
  // ブラウザ環境
  console.log("Running PerformanceMonitor tests in browser environment...");

  // PerformanceMonitorとテストファイルが読み込まれていることを確認
  if (typeof PerformanceMonitor === "undefined") {
    console.error(
      "PerformanceMonitor is not loaded. Please include performance-monitor.js"
    );
  }

  if (typeof runPerformanceMonitorTests === "undefined") {
    console.error(
      "Test functions are not loaded. Please include test-performance-monitor.js"
    );
  }

  // テスト実行
  runPerformanceMonitorTests();
}
