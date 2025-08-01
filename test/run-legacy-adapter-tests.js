/**
 * LegacyAdapter テストランナー
 * LegacyAdapterの動作確認テストを実行
 */

// 必要なファイルを読み込み
const scripts = [
  "../infrastructure/logger.js",
  "../infrastructure/error-handler.js",
  "../infrastructure/state-store.js",
  "../infrastructure/settings-manager.js",
  "../infrastructure/element-manager.js",
  "../infrastructure/message-bus.js",
  "../infrastructure/storage-adapter.js",
  "../infrastructure/test-framework.js",
  "../infrastructure/mock-factory.js",
  "../infrastructure/legacy-adapter.js",
  "test-legacy-adapter.js",
];

/**
 * スクリプトを順次読み込み
 * @param {string[]} scriptPaths - 読み込むスクリプトのパス配列
 * @returns {Promise<void>}
 */
async function loadScripts(scriptPaths) {
  for (const scriptPath of scriptPaths) {
    try {
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = scriptPath;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
      console.log(`✓ Loaded: ${scriptPath}`);
    } catch (error) {
      console.error(`✗ Failed to load: ${scriptPath}`, error);
      throw error;
    }
  }
}

/**
 * テストを実行
 */
async function runTests() {
  try {
    console.log("=".repeat(60));
    console.log("LegacyAdapter Test Runner");
    console.log("=".repeat(60));

    // スクリプトを読み込み
    console.log("\n📦 Loading dependencies...");
    await loadScripts(scripts);

    // テストを実行
    console.log("\n🧪 Running LegacyAdapter tests...");
    const testSuite = new LegacyAdapterTest();
    const results = await testSuite.runAllTests();

    // 結果を表示
    console.log("\n" + "=".repeat(60));
    console.log("📊 Test Results Summary");
    console.log("=".repeat(60));

    if (results.success) {
      console.log(`✅ All tests passed!`);
      console.log(`📈 Total: ${results.total} tests`);
      console.log(`⏱️  Duration: ${results.duration}ms`);
    } else {
      console.log(`❌ Some tests failed!`);
      console.log(`📈 Total: ${results.total} tests`);
      console.log(`✅ Passed: ${results.passed}`);
      console.log(`❌ Failed: ${results.failed}`);
      console.log(`⏱️  Duration: ${results.duration}ms`);

      if (results.failures && results.failures.length > 0) {
        console.log("\n🔍 Failure Details:");
        results.failures.forEach((failure, index) => {
          console.log(`${index + 1}. ${failure.test}: ${failure.error}`);
        });
      }
    }

    // パフォーマンス情報
    if (results.performance) {
      console.log("\n⚡ Performance Metrics:");
      console.log(`Average test time: ${results.performance.averageTime}ms`);
      console.log(
        `Slowest test: ${results.performance.slowestTest} (${results.performance.slowestTime}ms)`
      );
      console.log(
        `Fastest test: ${results.performance.fastestTest} (${results.performance.fastestTime}ms)`
      );
    }

    return results;
  } catch (error) {
    console.error("\n💥 Test runner failed:", error);
    console.error(error.stack);
    throw error;
  }
}

// ページ読み込み完了後にテストを実行
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", runTests);
} else {
  runTests();
}

// エラーハンドリング
window.addEventListener("error", (event) => {
  console.error("💥 Unhandled error during test execution:", event.error);
});

window.addEventListener("unhandledrejection", (event) => {
  console.error(
    "💥 Unhandled promise rejection during test execution:",
    event.reason
  );
});
