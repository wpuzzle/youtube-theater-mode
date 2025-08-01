/**
 * IntegrationTestHarness テストランナー
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

if (typeof IntegrationTestHarness === "undefined") {
  if (typeof require !== "undefined") {
    const {
      IntegrationTestHarness,
      TestReporter,
      E2EScenarioRunner,
    } = require("../infrastructure/integration-test-harness.js");

    global.IntegrationTestHarness = IntegrationTestHarness;
    global.TestReporter = TestReporter;
    global.E2EScenarioRunner = E2EScenarioRunner;
  } else {
    console.error(
      "IntegrationTestHarness not found. Please load integration-test-harness.js first."
    );
  }
}

// テスト関数を読み込み
if (typeof runAllIntegrationTestHarnessTests === "undefined") {
  if (typeof require !== "undefined") {
    const {
      runAllIntegrationTestHarnessTests,
    } = require("./test-integration-test-harness.js");
    global.runAllIntegrationTestHarnessTests =
      runAllIntegrationTestHarnessTests;
  } else {
    console.error(
      "runAllIntegrationTestHarnessTests function not found. Please load test-integration-test-harness.js first."
    );
  }
}

/**
 * IntegrationTestHarness テストを実行
 */
async function executeIntegrationTestHarnessTests() {
  console.log("Starting IntegrationTestHarness verification tests...\n");

  try {
    const success = await runAllIntegrationTestHarnessTests();

    if (success) {
      console.log("\n✓ All IntegrationTestHarness verification tests passed!");
      console.log("IntegrationTestHarness is ready for use.");
    } else {
      console.log("\n✗ Some IntegrationTestHarness verification tests failed!");
      console.log("Please check the implementation.");
    }

    return success;
  } catch (error) {
    console.error("Error running IntegrationTestHarness tests:", error);
    return false;
  }
}

// ブラウザ環境での実行
if (typeof window !== "undefined") {
  window.executeIntegrationTestHarnessTests =
    executeIntegrationTestHarnessTests;

  // ページ読み込み後に自動実行
  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      executeIntegrationTestHarnessTests
    );
  } else {
    executeIntegrationTestHarnessTests();
  }
}

// Node.js環境での実行
if (typeof module !== "undefined" && require.main === module) {
  executeIntegrationTestHarnessTests().then((success) => {
    process.exit(success ? 0 : 1);
  });
}

// CommonJS/ES6 両対応のエクスポート
if (typeof module !== "undefined" && module.exports) {
  module.exports = { executeIntegrationTestHarnessTests };
}
