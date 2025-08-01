/**
 * TestFramework テストランナー
 */

// TestFramework を読み込み
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

// テスト関数を読み込み
if (typeof runAllTestFrameworkTests === "undefined") {
  if (typeof require !== "undefined") {
    const { runAllTestFrameworkTests } = require("./test-test-framework.js");
    global.runAllTestFrameworkTests = runAllTestFrameworkTests;
  } else {
    console.error(
      "runAllTestFrameworkTests function not found. Please load test-test-framework.js first."
    );
  }
}

/**
 * TestFramework テストを実行
 */
async function executeTestFrameworkTests() {
  console.log("Starting TestFramework verification tests...\n");

  try {
    const success = await runAllTestFrameworkTests();

    if (success) {
      console.log("\n✓ All TestFramework verification tests passed!");
      console.log("TestFramework is ready for use.");
    } else {
      console.log("\n✗ Some TestFramework verification tests failed!");
      console.log("Please check the implementation.");
    }

    return success;
  } catch (error) {
    console.error("Error running TestFramework tests:", error);
    return false;
  }
}

// ブラウザ環境での実行
if (typeof window !== "undefined") {
  window.executeTestFrameworkTests = executeTestFrameworkTests;

  // ページ読み込み後に自動実行
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", executeTestFrameworkTests);
  } else {
    executeTestFrameworkTests();
  }
}

// Node.js環境での実行
if (typeof module !== "undefined" && require.main === module) {
  executeTestFrameworkTests().then((success) => {
    process.exit(success ? 0 : 1);
  });
}

// CommonJS/ES6 両対応のエクスポート
if (typeof module !== "undefined" && module.exports) {
  module.exports = { executeTestFrameworkTests };
}
