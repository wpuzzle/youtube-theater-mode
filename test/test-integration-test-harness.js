/**
 * IntegrationTestHarness の動作確認テスト
 */

/**
 * TestReporter の機能をテスト
 */
async function testTestReporter() {
  console.log("Testing TestReporter...");

  const framework = new TestFramework();

  framework.describe("TestReporter Tests", function (suite) {
    let reporter;

    suite.beforeEach(() => {
      reporter = new TestReporter();
    });

    suite.test("should track testing lifecycle", () => {
      reporter.startTesting();
      TestFramework.assert.isTrue(
        reporter.startTime !== null,
        "Start time should be set"
      );

      reporter.endTesting();
      TestFramework.assert.isTrue(
        reporter.endTime !== null,
        "End time should be set"
      );
      TestFramework.assert.isTrue(
        reporter.endTime >= reporter.startTime,
        "End time should be after start time"
      );
    });

    suite.test("should collect test results", () => {
      reporter.startTesting();

      reporter.addResult({
        suiteName: "Test Suite 1",
        totalTests: 5,
        totalPassed: 4,
        totalFailed: 1,
        duration: 100,
      });

      reporter.addResult({
        suiteName: "Test Suite 2",
        totalTests: 3,
        totalPassed: 3,
        totalFailed: 0,
        duration: 50,
      });

      reporter.endTesting();

      const summary = reporter.generateSummary();
      TestFramework.assert.equal(
        summary.totalTests,
        8,
        "Total tests should be 8"
      );
      TestFramework.assert.equal(
        summary.totalPassed,
        7,
        "Total passed should be 7"
      );
      TestFramework.assert.equal(
        summary.totalFailed,
        1,
        "Total failed should be 1"
      );
      TestFramework.assert.equal(
        summary.reports.length,
        2,
        "Should have 2 reports"
      );
    });

    suite.test("should generate detailed report", () => {
      reporter.startTesting();
      reporter.addResult({
        suiteName: "Test Suite",
        totalTests: 2,
        totalPassed: 1,
        totalFailed: 1,
        duration: 100,
        failures: [{ name: "failing test", error: "test error" }],
      });
      reporter.endTesting();

      const report = reporter.generateDetailedReport();
      TestFramework.assert.isTrue(
        report.includes("INTEGRATION TEST REPORT"),
        "Should contain report header"
      );
      TestFramework.assert.isTrue(
        report.includes("Test Suite"),
        "Should contain suite name"
      );
      TestFramework.assert.isTrue(
        report.includes("failing test"),
        "Should contain failure details"
      );
    });

    suite.test("should generate JSON report", () => {
      reporter.startTesting();
      reporter.addResult({
        suiteName: "Test Suite",
        totalTests: 1,
        totalPassed: 1,
        totalFailed: 0,
        duration: 50,
      });
      reporter.endTesting();

      const jsonReport = reporter.generateJsonReport();
      const parsed = JSON.parse(jsonReport);

      TestFramework.assert.equal(
        parsed.totalTests,
        1,
        "JSON should contain correct test count"
      );
      TestFramework.assert.equal(
        parsed.totalPassed,
        1,
        "JSON should contain correct passed count"
      );
    });

    suite.test("should generate HTML report", () => {
      reporter.startTesting();
      reporter.addResult({
        suiteName: "Test Suite",
        totalTests: 1,
        totalPassed: 1,
        totalFailed: 0,
        duration: 50,
      });
      reporter.endTesting();

      const htmlReport = reporter.generateHtmlReport();
      TestFramework.assert.isTrue(
        htmlReport.includes("<!DOCTYPE html>"),
        "Should be valid HTML"
      );
      TestFramework.assert.isTrue(
        htmlReport.includes("Integration Test Report"),
        "Should contain title"
      );
      TestFramework.assert.isTrue(
        htmlReport.includes("Test Suite"),
        "Should contain suite name"
      );
    });
  });

  const results = await framework.run();

  if (results.totalFailed > 0) {
    throw new Error(
      `TestReporter tests failed: ${results.totalFailed} failures`
    );
  }

  console.log("✓ TestReporter test passed");
}

/**
 * E2EScenarioRunner の機能をテスト
 */
async function testE2EScenarioRunner() {
  console.log("Testing E2EScenarioRunner...");

  const framework = new TestFramework();
  const mockFactory = new MockFactory();

  framework.describe("E2EScenarioRunner Tests", function (suite) {
    let runner;

    suite.beforeEach(() => {
      runner = new E2EScenarioRunner(mockFactory);
    });

    suite.test("should define and run scenarios", async () => {
      let setupCalled = false;
      let teardownCalled = false;
      let step1Called = false;
      let step2Called = false;

      runner.defineScenario("test-scenario", {
        description: "Test scenario",
        setup: async () => {
          setupCalled = true;
        },
        teardown: async () => {
          teardownCalled = true;
        },
        steps: [
          {
            name: "Step 1",
            action: async () => {
              step1Called = true;
            },
          },
          {
            name: "Step 2",
            action: async () => {
              step2Called = true;
            },
          },
        ],
      });

      const result = await runner.runScenario("test-scenario");

      TestFramework.assert.isTrue(setupCalled, "Setup should be called");
      TestFramework.assert.isTrue(teardownCalled, "Teardown should be called");
      TestFramework.assert.isTrue(step1Called, "Step 1 should be called");
      TestFramework.assert.isTrue(step2Called, "Step 2 should be called");
      TestFramework.assert.equal(
        result.totalSteps,
        2,
        "Should have 2 total steps"
      );
      TestFramework.assert.equal(
        result.passedSteps,
        2,
        "Should have 2 passed steps"
      );
      TestFramework.assert.equal(
        result.failedSteps,
        0,
        "Should have 0 failed steps"
      );
    });

    suite.test("should handle step failures", async () => {
      runner.defineScenario("failing-scenario", {
        steps: [
          {
            name: "Passing step",
            action: async () => {
              /* success */
            },
          },
          {
            name: "Failing step",
            action: async () => {
              throw new Error("Step failed");
            },
          },
          {
            name: "Unreachable step",
            action: async () => {
              /* should not be called */
            },
          },
        ],
      });

      const result = await runner.runScenario("failing-scenario");

      TestFramework.assert.equal(
        result.totalSteps,
        3,
        "Should have 3 total steps"
      );
      TestFramework.assert.equal(
        result.passedSteps,
        1,
        "Should have 1 passed step"
      );
      TestFramework.assert.equal(
        result.failedSteps,
        1,
        "Should have 1 failed step"
      );
      TestFramework.assert.equal(
        result.completedSteps,
        2,
        "Should have completed 2 steps"
      );
    });

    suite.test("should handle step timeouts", async () => {
      runner.defineScenario("timeout-scenario", {
        steps: [
          {
            name: "Timeout step",
            timeout: 100,
            action: async () => {
              await new Promise((resolve) => setTimeout(resolve, 200));
            },
          },
        ],
      });

      const result = await runner.runScenario("timeout-scenario");

      TestFramework.assert.equal(
        result.failedSteps,
        1,
        "Should have 1 failed step"
      );
      TestFramework.assert.isTrue(
        result.results[0].error.includes("timeout"),
        "Should have timeout error"
      );
    });

    suite.test("should continue on failure when specified", async () => {
      let step3Called = false;

      runner.defineScenario("continue-on-failure", {
        steps: [
          {
            name: "Failing step",
            continueOnFailure: true,
            action: async () => {
              throw new Error("Step failed");
            },
          },
          {
            name: "Continuing step",
            action: async () => {
              step3Called = true;
            },
          },
        ],
      });

      const result = await runner.runScenario("continue-on-failure");

      TestFramework.assert.isTrue(step3Called, "Should continue to next step");
      TestFramework.assert.equal(
        result.completedSteps,
        2,
        "Should complete all steps"
      );
      TestFramework.assert.equal(
        result.failedSteps,
        1,
        "Should have 1 failed step"
      );
      TestFramework.assert.equal(
        result.passedSteps,
        1,
        "Should have 1 passed step"
      );
    });

    suite.test("should run all scenarios", async () => {
      runner.defineScenario("scenario-1", {
        steps: [{ name: "Step 1", action: async () => {} }],
      });

      runner.defineScenario("scenario-2", {
        steps: [{ name: "Step 2", action: async () => {} }],
      });

      const results = await runner.runAllScenarios();

      TestFramework.assert.equal(results.length, 2, "Should run 2 scenarios");
      TestFramework.assert.equal(
        results[0].name,
        "scenario-1",
        "First result should be scenario-1"
      );
      TestFramework.assert.equal(
        results[1].name,
        "scenario-2",
        "Second result should be scenario-2"
      );
    });
  });

  const results = await framework.run();

  if (results.totalFailed > 0) {
    throw new Error(
      `E2EScenarioRunner tests failed: ${results.totalFailed} failures`
    );
  }

  console.log("✓ E2EScenarioRunner test passed");
}

/**
 * IntegrationTestHarness の基本機能をテスト
 */
async function testIntegrationTestHarnessBasics() {
  console.log("Testing IntegrationTestHarness basics...");

  const framework = new TestFramework();

  framework.describe("IntegrationTestHarness Basics", function (suite) {
    let harness;

    suite.beforeEach(() => {
      harness = new IntegrationTestHarness();
    });

    suite.test("should initialize with default components", () => {
      TestFramework.assert.isTrue(
        typeof harness.testFramework === "object",
        "Should have test framework"
      );
      TestFramework.assert.isTrue(
        typeof harness.mockFactory === "object",
        "Should have mock factory"
      );
      TestFramework.assert.isTrue(
        typeof harness.reporter === "object",
        "Should have reporter"
      );
      TestFramework.assert.isTrue(
        typeof harness.e2eRunner === "object",
        "Should have E2E runner"
      );
    });

    suite.test("should add test suites", () => {
      const suite = harness.addTestSuite("Test Suite", function (s) {
        s.test("sample test", () => {
          TestFramework.assert.isTrue(true);
        });
      });

      TestFramework.assert.isTrue(
        typeof suite === "object",
        "Should return test suite"
      );
      TestFramework.assert.equal(
        harness.testSuites.length,
        1,
        "Should have 1 test suite"
      );
    });

    suite.test("should add E2E scenarios", () => {
      harness.addE2EScenario("custom-scenario", {
        description: "Custom test scenario",
        steps: [{ name: "Test step", action: async () => {} }],
      });

      TestFramework.assert.isTrue(
        harness.e2eRunner.scenarios.has("custom-scenario"),
        "Should have custom scenario"
      );
    });

    suite.test("should generate reports in different formats", () => {
      // テスト結果を追加
      harness.reporter.startTesting();
      harness.reporter.addResult({
        suiteName: "Test Suite",
        totalTests: 1,
        totalPassed: 1,
        totalFailed: 0,
        duration: 50,
      });
      harness.reporter.endTesting();

      const textReport = harness.generateReport("text");
      const jsonReport = harness.generateReport("json");
      const htmlReport = harness.generateReport("html");

      TestFramework.assert.isTrue(
        textReport.includes("INTEGRATION TEST REPORT"),
        "Text report should be valid"
      );
      TestFramework.assert.isTrue(
        jsonReport.startsWith("{"),
        "JSON report should be valid JSON"
      );
      TestFramework.assert.isTrue(
        htmlReport.includes("<!DOCTYPE html>"),
        "HTML report should be valid HTML"
      );
    });

    suite.test("should provide coverage information", () => {
      const coverage = harness.getCoverageInfo();

      TestFramework.assert.isTrue(
        typeof coverage.components === "object",
        "Should have component coverage"
      );
      TestFramework.assert.isTrue(
        typeof coverage.scenarios === "object",
        "Should have scenario coverage"
      );
      TestFramework.assert.isTrue(
        typeof coverage.components.coverage === "string",
        "Should have coverage percentage"
      );
    });

    suite.test("should provide test metrics", () => {
      // テスト結果を追加
      harness.reporter.startTesting();
      harness.reporter.addResult({
        suiteName: "Test Suite",
        totalTests: 2,
        totalPassed: 2,
        totalFailed: 0,
        duration: 100,
      });
      harness.reporter.endTesting();

      const metrics = harness.getTestMetrics();

      TestFramework.assert.isTrue(
        typeof metrics.execution === "object",
        "Should have execution metrics"
      );
      TestFramework.assert.isTrue(
        typeof metrics.coverage === "object",
        "Should have coverage metrics"
      );
      TestFramework.assert.isTrue(
        typeof metrics.performance === "object",
        "Should have performance metrics"
      );
      TestFramework.assert.equal(
        metrics.execution.totalTests,
        2,
        "Should have correct test count"
      );
    });
  });

  const results = await framework.run();

  if (results.totalFailed > 0) {
    throw new Error(
      `IntegrationTestHarness basics tests failed: ${results.totalFailed} failures`
    );
  }

  console.log("✓ IntegrationTestHarness basics test passed");
}

/**
 * デフォルトE2Eシナリオをテスト
 */
async function testDefaultE2EScenarios() {
  console.log("Testing default E2E scenarios...");

  const framework = new TestFramework();

  framework.describe("Default E2E Scenarios", function (suite) {
    let harness;

    suite.beforeEach(() => {
      harness = new IntegrationTestHarness();
    });

    suite.test("should have default scenarios defined", () => {
      const scenarios = harness.e2eRunner.scenarios;

      TestFramework.assert.isTrue(
        scenarios.has("theater-mode-toggle"),
        "Should have theater-mode-toggle scenario"
      );
      TestFramework.assert.isTrue(
        scenarios.has("settings-management"),
        "Should have settings-management scenario"
      );
      TestFramework.assert.isTrue(
        scenarios.has("error-handling"),
        "Should have error-handling scenario"
      );
      TestFramework.assert.isTrue(
        scenarios.has("performance-test"),
        "Should have performance-test scenario"
      );
    });

    suite.test("should run theater-mode-toggle scenario", async () => {
      const result = await harness.e2eRunner.runScenario("theater-mode-toggle");

      TestFramework.assert.equal(
        result.name,
        "theater-mode-toggle",
        "Should have correct name"
      );
      TestFramework.assert.equal(result.totalSteps, 5, "Should have 5 steps");
      TestFramework.assert.isTrue(
        result.passedSteps > 0,
        "Should have some passed steps"
      );
    });

    suite.test("should run settings-management scenario", async () => {
      const result = await harness.e2eRunner.runScenario("settings-management");

      TestFramework.assert.equal(
        result.name,
        "settings-management",
        "Should have correct name"
      );
      TestFramework.assert.equal(result.totalSteps, 3, "Should have 3 steps");
      TestFramework.assert.isTrue(
        result.passedSteps > 0,
        "Should have some passed steps"
      );
    });

    suite.test("should run error-handling scenario", async () => {
      const result = await harness.e2eRunner.runScenario("error-handling");

      TestFramework.assert.equal(
        result.name,
        "error-handling",
        "Should have correct name"
      );
      TestFramework.assert.equal(result.totalSteps, 2, "Should have 2 steps");
      // エラーシナリオなので、一部のステップは失敗する可能性がある
    });

    suite.test("should run performance-test scenario", async () => {
      const result = await harness.e2eRunner.runScenario("performance-test");

      TestFramework.assert.equal(
        result.name,
        "performance-test",
        "Should have correct name"
      );
      TestFramework.assert.equal(result.totalSteps, 2, "Should have 2 steps");
      TestFramework.assert.isTrue(
        result.duration > 500,
        "Should take some time due to performance delays"
      );
    });
  });

  const results = await framework.run();

  if (results.totalFailed > 0) {
    throw new Error(
      `Default E2E scenarios tests failed: ${results.totalFailed} failures`
    );
  }

  console.log("✓ Default E2E scenarios test passed");
}

/**
 * 統合テスト実行をテスト
 */
async function testIntegrationTestExecution() {
  console.log("Testing integration test execution...");

  const framework = new TestFramework();

  framework.describe("Integration Test Execution", function (suite) {
    let harness;

    suite.beforeEach(() => {
      harness = new IntegrationTestHarness();
    });

    suite.test(
      "should run integration tests with unit tests only",
      async () => {
        // 簡単なテストスイートを追加
        harness.addTestSuite("Sample Unit Tests", function (s) {
          s.test("sample test 1", () => {
            TestFramework.assert.isTrue(true);
          });
          s.test("sample test 2", () => {
            TestFramework.assert.equal(1 + 1, 2);
          });
        });

        const results = await harness.runIntegrationTests({
          runUnitTests: true,
          runE2ETests: false,
        });

        TestFramework.assert.isTrue(
          results.unitTests !== null,
          "Should have unit test results"
        );
        TestFramework.assert.isTrue(
          results.e2eTests === null,
          "Should not have E2E test results"
        );
        TestFramework.assert.isTrue(
          results.summary !== null,
          "Should have summary"
        );
        TestFramework.assert.isTrue(
          results.summary.totalTests > 0,
          "Should have some tests"
        );
      }
    );

    suite.test("should run integration tests with E2E tests only", async () => {
      const results = await harness.runIntegrationTests({
        runUnitTests: false,
        runE2ETests: true,
      });

      TestFramework.assert.isTrue(
        results.unitTests === null,
        "Should not have unit test results"
      );
      TestFramework.assert.isTrue(
        results.e2eTests !== null,
        "Should have E2E test results"
      );
      TestFramework.assert.isTrue(
        results.summary !== null,
        "Should have summary"
      );
      TestFramework.assert.isTrue(
        results.e2eTests.length > 0,
        "Should have E2E scenarios"
      );
    });

    suite.test("should run full integration tests", async () => {
      // 簡単なテストスイートを追加
      harness.addTestSuite("Sample Tests", function (s) {
        s.test("sample test", () => {
          TestFramework.assert.isTrue(true);
        });
      });

      const results = await harness.runIntegrationTests();

      TestFramework.assert.isTrue(
        results.unitTests !== null,
        "Should have unit test results"
      );
      TestFramework.assert.isTrue(
        results.e2eTests !== null,
        "Should have E2E test results"
      );
      TestFramework.assert.isTrue(
        results.summary !== null,
        "Should have summary"
      );
      TestFramework.assert.isTrue(
        results.summary.totalTests > 0,
        "Should have tests from both unit and E2E"
      );
    });
  });

  const results = await framework.run();

  if (results.totalFailed > 0) {
    throw new Error(
      `Integration test execution tests failed: ${results.totalFailed} failures`
    );
  }

  console.log("✓ Integration test execution test passed");
}

/**
 * 全IntegrationTestHarnessテストを実行
 */
async function runAllIntegrationTestHarnessTests() {
  console.log("=".repeat(70));
  console.log(
    "YouTube Theater Mode - IntegrationTestHarness Verification Tests"
  );
  console.log("=".repeat(70));

  const tests = [
    testTestReporter,
    testE2EScenarioRunner,
    testIntegrationTestHarnessBasics,
    testDefaultE2EScenarios,
    testIntegrationTestExecution,
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      await test();
      passed++;
    } catch (error) {
      console.error(`✗ ${test.name} failed:`, error.message);
      failed++;
    }
  }

  console.log("=".repeat(70));
  console.log(
    `IntegrationTestHarness Verification Results: ${passed} passed, ${failed} failed`
  );
  console.log("=".repeat(70));

  return failed === 0;
}

// エクスポート
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    runAllIntegrationTestHarnessTests,
    testTestReporter,
    testE2EScenarioRunner,
    testIntegrationTestHarnessBasics,
    testDefaultE2EScenarios,
    testIntegrationTestExecution,
  };
}

if (typeof window !== "undefined") {
  window.runAllIntegrationTestHarnessTests = runAllIntegrationTestHarnessTests;
}
