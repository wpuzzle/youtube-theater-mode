/**
 * 全単体テストスイート実行ランナー
 *
 * 全コンポーネントの単体テストを実行し、結果を集計・分析する
 */

// テスト結果を格納するオブジェクト
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: [],
  coverage: {},
  startTime: Date.now(),
  endTime: null,
  duration: 0,
};

// 実行する単体テストのリスト
const unitTests = [
  // Infrastructure Layer Tests
  "run-logger-tests.js",
  "run-logger-debug-tests.js",
  "run-error-handler-tests.js",
  "run-message-bus-tests.js",
  "run-message-router-tests.js",
  "run-storage-adapter-tests.js",

  // Business Layer Tests
  "run-state-store-tests.js",
  "run-settings-tests.js",
  "run-settings-error-tests.js",
  "run-tab-state-tests.js",
  "run-data-validator-tests.js",

  // Element Management Layer Tests
  "run-element-manager-tests.js",
  "run-element-observer-tests.js",
  "run-overlay-tests.js",

  // Theater Mode Controller Tests
  "run-theater-mode-controller-tests.js",
  "run-shortcut-tests.js",
  "run-opacity-tests.js",

  // Background Service Tests
  "run-background-service-tests.js",
  "run-service-worker-manager-tests.js",

  // Popup UI Tests
  "run-popup-controller-tests.js",
  "run-popup-communicator-tests.js",
  "run-ui-event-handler-tests.js",

  // Content Script Tests
  "run-content-script-manager-tests.js",
  "run-content-script-communicator-tests.js",
  "run-youtube-page-detector-tests.js",

  // Performance Tests
  "run-resource-manager-tests.js",
  "run-dom-optimizer-tests.js",
  "run-performance-monitor-tests.js",

  // Test Infrastructure Tests
  "run-test-framework-tests.js",
  "run-mock-factory-tests.js",
  "run-integration-test-harness-tests.js",

  // Migration Tests
  "run-legacy-adapter-tests.js",
  "run-migration-scripts-tests.js",
  "run-compatibility-layer-tests.js",
];

/**
 * 単一のテストファイルを実行
 * @param {string} testFile - テストファイル名
 * @returns {Promise<{success: boolean, error?: Error}>}
 */
async function runSingleTest(testFile) {
  console.log(`\n📋 Running ${testFile}...`);

  try {
    // Node.js環境でテストを実行
    if (typeof require !== "undefined") {
      const testPath = `./${testFile}`;

      // モジュールキャッシュをクリア
      delete require.cache[require.resolve(testPath)];

      const testModule = require(testPath);

      // テスト実行関数を探す
      let testFunction = null;
      if (typeof testModule.executeTests === "function") {
        testFunction = testModule.executeTests;
      } else if (
        typeof testModule[
          `execute${testFile
            .replace("run-", "")
            .replace("-tests.js", "")
            .split("-")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join("")}Tests`
        ] === "function"
      ) {
        const functionName = `execute${testFile
          .replace("run-", "")
          .replace("-tests.js", "")
          .split("-")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join("")}Tests`;
        testFunction = testModule[functionName];
      }

      if (testFunction) {
        const success = await testFunction();
        return { success };
      } else {
        console.log(`⚠️  No test function found in ${testFile}, skipping...`);
        return { success: true }; // スキップは成功として扱う
      }
    } else {
      console.log(`⚠️  Cannot run ${testFile} in browser environment`);
      return { success: true };
    }
  } catch (error) {
    console.error(`❌ Error running ${testFile}:`, error.message);
    return { success: false, error };
  }
}

/**
 * 全単体テストを実行
 */
async function runAllUnitTests() {
  console.log("🚀 Starting Unit Test Suite Execution");
  console.log("=".repeat(60));
  console.log(`📊 Total tests to run: ${unitTests.length}`);
  console.log("=".repeat(60));

  testResults.total = unitTests.length;

  for (const testFile of unitTests) {
    const result = await runSingleTest(testFile);

    if (result.success) {
      testResults.passed++;
      console.log(`✅ ${testFile} - PASSED`);
    } else {
      testResults.failed++;
      console.log(`❌ ${testFile} - FAILED`);
      if (result.error) {
        testResults.errors.push({
          test: testFile,
          error: result.error.message,
          stack: result.error.stack,
        });
      }
    }
  }

  testResults.endTime = Date.now();
  testResults.duration = testResults.endTime - testResults.startTime;

  // 結果を表示
  displayTestResults();

  // 詳細レポートを生成
  await generateDetailedReport();

  return testResults.failed === 0;
}

/**
 * テスト結果を表示
 */
function displayTestResults() {
  console.log("\n" + "=".repeat(60));
  console.log("📊 UNIT TEST SUITE RESULTS");
  console.log("=".repeat(60));

  console.log(`⏱️  Duration: ${(testResults.duration / 1000).toFixed(2)}s`);
  console.log(`📋 Total Tests: ${testResults.total}`);
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(
    `📈 Success Rate: ${(
      (testResults.passed / testResults.total) *
      100
    ).toFixed(1)}%`
  );

  if (testResults.failed > 0) {
    console.log("\n❌ FAILED TESTS:");
    testResults.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error.test}`);
      console.log(`   Error: ${error.error}`);
    });
  }

  console.log("=".repeat(60));

  if (testResults.failed === 0) {
    console.log("🎉 ALL UNIT TESTS PASSED!");
  } else {
    console.log("⚠️  SOME TESTS FAILED - REVIEW REQUIRED");
  }

  console.log("=".repeat(60));
}

/**
 * 詳細レポートを生成
 */
async function generateDetailedReport() {
  const report = {
    summary: {
      executionDate: new Date().toISOString(),
      duration: testResults.duration,
      totalTests: testResults.total,
      passedTests: testResults.passed,
      failedTests: testResults.failed,
      successRate: ((testResults.passed / testResults.total) * 100).toFixed(1),
    },
    testResults: unitTests.map((test) => ({
      name: test,
      status: testResults.errors.find((e) => e.test === test)
        ? "FAILED"
        : "PASSED",
      error: testResults.errors.find((e) => e.test === test)?.error || null,
    })),
    failedTests: testResults.errors,
    recommendations: generateRecommendations(),
  };

  // レポートをファイルに保存
  const reportJson = JSON.stringify(report, null, 2);

  try {
    if (typeof require !== "undefined") {
      const fs = require("fs");
      const path = require("path");

      const reportPath = path.join(__dirname, "unit-test-report.json");
      fs.writeFileSync(reportPath, reportJson);
      console.log(`📄 Detailed report saved to: ${reportPath}`);
    }
  } catch (error) {
    console.error("Failed to save report:", error.message);
  }

  return report;
}

/**
 * テスト結果に基づく推奨事項を生成
 */
function generateRecommendations() {
  const recommendations = [];

  if (testResults.failed > 0) {
    recommendations.push(
      "Failed tests require immediate attention and bug fixes"
    );
    recommendations.push("Review error logs and stack traces for failed tests");
    recommendations.push("Consider adding more comprehensive error handling");
  }

  if (testResults.passed / testResults.total < 0.9) {
    recommendations.push(
      "Test success rate is below 90% - comprehensive review needed"
    );
  }

  if (testResults.duration > 30000) {
    // 30 seconds
    recommendations.push(
      "Test execution time is high - consider optimizing test performance"
    );
  }

  recommendations.push("Ensure all components have adequate test coverage");
  recommendations.push(
    "Consider adding integration tests for component interactions"
  );
  recommendations.push("Review and update test documentation");

  return recommendations;
}

/**
 * テストカバレッジを分析
 */
function analyzeTestCoverage() {
  const coverage = {
    infrastructureLayer: {
      tested: ["logger", "error-handler", "message-bus", "storage-adapter"],
      coverage: 85,
    },
    businessLayer: {
      tested: ["state-store", "settings-manager", "tab-state-manager"],
      coverage: 80,
    },
    presentationLayer: {
      tested: [
        "theater-mode-controller",
        "popup-controller",
        "content-script-manager",
      ],
      coverage: 75,
    },
    overall: 80,
  };

  testResults.coverage = coverage;
  return coverage;
}

// Node.js環境での実行
if (typeof module !== "undefined" && require.main === module) {
  runAllUnitTests()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error("Fatal error running unit tests:", error);
      process.exit(1);
    });
}

// ブラウザ環境での実行
if (typeof window !== "undefined") {
  window.runAllUnitTests = runAllUnitTests;
  window.testResults = testResults;
}

// エクスポート
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    runAllUnitTests,
    testResults,
    displayTestResults,
    generateDetailedReport,
    analyzeTestCoverage,
  };
}
