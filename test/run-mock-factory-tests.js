/**
 * MockFactory テストランナー
 */

// 依存関係を読み込み
if (typeof TestFramework === "undefined") {
  if (typeof require !== "undefined") {
    const {
      TestFramework,
      TestSuite,
      TestResult,
      ConsoleReporter,
      ChromeApiMock,
      DOMTestEnvironment,
    } = require("../infrastructure/test-framework.js");

    global.TestFramework = TestFramework;
    global.TestSuite = TestSuite;
    global.TestResult = TestResult;
    global.ConsoleReporter = ConsoleReporter;
    global.ChromeApiMock = ChromeApiMock;
    global.DOMTestEnvironment = DOMTestEnvironment;
  } else {
    console.error(
      "TestFramework not found. Please load test-framework.js first."
    );
  }
}

if (typeof MockFactory === "undefined") {
  if (typeof require !== "undefined") {
    const {
      MockFactory,
      TestDataGenerator,
      ScenarioManager,
    } = require("../infrastructure/mock-factory.js");

    global.MockFactory = MockFactory;
    global.TestDataGenerator = TestDataGenerator;
    global.ScenarioManager = ScenarioManager;
  } else {
    console.error("MockFactory not found. Please load mock-factory.js first.");
  }
}

// テスト関数を読み込み
if (typeof runAllMockFactoryTests === "undefined") {
  if (typeof require !== "undefined") {
    const { runAllMockFactoryTests } = require("./test-mock-factory.js");
    global.runAllMockFactoryTests = runAllMockFactoryTests;
  } else {
    console.error(
      "runAllMockFactoryTests function not found. Please load test-mock-factory.js first."
    );
  }
}

/**
 * MockFactory テストを実行
 */
async function executeMockFactoryTests() {
  console.log("Starting MockFactory verification tests...\n");

  try {
    const success = await runAllMockFactoryTests();

    if (success) {
      console.log("\n✓ All MockFactory verification tests passed!");
      console.log("MockFactory is ready for use.");
    } else {
      console.log("\n✗ Some MockFactory verification tests failed!");
      console.log("Please check the implementation.");
    }

    return success;
  } catch (error) {
    console.error("Error running MockFactory tests:", error);
    return false;
  }
}

// ブラウザ環境での実行
if (typeof window !== "undefined") {
  window.executeMockFactoryTests = executeMockFactoryTests;

  // ページ読み込み後に自動実行
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", executeMockFactoryTests);
  } else {
    executeMockFactoryTests();
  }
}

// Node.js環境での実行
if (typeof module !== "undefined" && require.main === module) {
  executeMockFactoryTests().then((success) => {
    process.exit(success ? 0 : 1);
  });
}

// CommonJS/ES6 両対応のエクスポート
if (typeof module !== "undefined" && module.exports) {
  module.exports = { executeMockFactoryTests };
}
