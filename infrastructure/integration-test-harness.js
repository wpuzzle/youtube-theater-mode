/**
 * IntegrationTestHarness
 * 統合テスト用のテストハーネス
 * エンドツーエンドテストの自動化とテスト結果の収集・レポート生成機能
 */

// 依存関係のインポート
let TestFramework, MockFactory, TestDataGenerator, ScenarioManager;

if (typeof require !== "undefined") {
  ({ TestFramework } = require("./test-framework.js"));
  ({
    MockFactory,
    TestDataGenerator,
    ScenarioManager,
  } = require("./mock-factory.js"));
}

/**
 * テストレポート生成クラス
 */
class TestReporter {
  constructor() {
    this.reports = [];
    this.startTime = null;
    this.endTime = null;
  }

  /**
   * テスト開始を記録
   */
  startTesting() {
    this.startTime = Date.now();
    this.reports = [];
  }

  /**
   * テスト終了を記録
   */
  endTesting() {
    this.endTime = Date.now();
  }

  /**
   * テスト結果を追加
   * @param {Object} result - テスト結果
   */
  addResult(result) {
    this.reports.push({
      ...result,
      timestamp: Date.now(),
    });
  }

  /**
   * サマリーレポートを生成
   * @returns {Object} サマリーレポート
   */
  generateSummary() {
    const totalTests = this.reports.reduce(
      (sum, report) => sum + report.totalTests,
      0
    );
    const totalPassed = this.reports.reduce(
      (sum, report) => sum + report.totalPassed,
      0
    );
    const totalFailed = this.reports.reduce(
      (sum, report) => sum + report.totalFailed,
      0
    );
    const totalDuration = this.endTime - this.startTime;

    return {
      totalTests,
      totalPassed,
      totalFailed,
      totalDuration,
      successRate:
        totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(2) : 0,
      reports: this.reports,
      startTime: this.startTime,
      endTime: this.endTime,
    };
  }

  /**
   * 詳細レポートを生成
   * @returns {string} 詳細レポート
   */
  generateDetailedReport() {
    const summary = this.generateSummary();
    let report = "";

    report += "=".repeat(80) + "\n";
    report += "INTEGRATION TEST REPORT\n";
    report += "=".repeat(80) + "\n";
    report += `Test Duration: ${summary.totalDuration}ms\n`;
    report += `Total Tests: ${summary.totalTests}\n`;
    report += `Passed: ${summary.totalPassed}\n`;
    report += `Failed: ${summary.totalFailed}\n`;
    report += `Success Rate: ${summary.successRate}%\n`;
    report += "\n";

    for (const testReport of this.reports) {
      report += "-".repeat(60) + "\n";
      report += `Test Suite: ${testReport.suiteName}\n`;
      report += `Tests: ${testReport.totalTests} | Passed: ${testReport.totalPassed} | Failed: ${testReport.totalFailed}\n`;
      report += `Duration: ${testReport.duration}ms\n`;

      if (testReport.failures && testReport.failures.length > 0) {
        report += "Failures:\n";
        for (const failure of testReport.failures) {
          report += `  - ${failure.name}: ${failure.error}\n`;
        }
      }
      report += "\n";
    }

    return report;
  }

  /**
   * JSON形式でレポートを出力
   * @returns {string} JSONレポート
   */
  generateJsonReport() {
    return JSON.stringify(this.generateSummary(), null, 2);
  }

  /**
   * HTML形式でレポートを生成
   * @returns {string} HTMLレポート
   */
  generateHtmlReport() {
    const summary = this.generateSummary();
    const successRate = parseFloat(summary.successRate);
    const statusClass =
      successRate === 100 ? "success" : successRate >= 80 ? "warning" : "error";

    return `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Integration Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .metric h3 { margin: 0 0 10px 0; color: #333; }
        .metric .value { font-size: 2em; font-weight: bold; }
        .success .value { color: #28a745; }
        .warning .value { color: #ffc107; }
        .error .value { color: #dc3545; }
        .test-results { margin-top: 30px; }
        .test-suite { background: #f8f9fa; margin-bottom: 20px; border-radius: 8px; overflow: hidden; }
        .suite-header { background: #e9ecef; padding: 15px; font-weight: bold; }
        .suite-content { padding: 15px; }
        .test-item { padding: 10px; border-bottom: 1px solid #dee2e6; }
        .test-item:last-child { border-bottom: none; }
        .test-passed { color: #28a745; }
        .test-failed { color: #dc3545; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Integration Test Report</h1>
            <p>Generated on ${new Date(summary.endTime).toLocaleString()}</p>
        </div>
        
        <div class="summary">
            <div class="metric">
                <h3>Total Tests</h3>
                <div class="value">${summary.totalTests}</div>
            </div>
            <div class="metric">
                <h3>Passed</h3>
                <div class="value success">${summary.totalPassed}</div>
            </div>
            <div class="metric">
                <h3>Failed</h3>
                <div class="value error">${summary.totalFailed}</div>
            </div>
            <div class="metric ${statusClass}">
                <h3>Success Rate</h3>
                <div class="value">${summary.successRate}%</div>
            </div>
            <div class="metric">
                <h3>Duration</h3>
                <div class="value">${summary.totalDuration}ms</div>
            </div>
        </div>
        
        <div class="test-results">
            <h2>Test Results</h2>
            ${this.reports
              .map(
                (report) => `
                <div class="test-suite">
                    <div class="suite-header">
                        ${report.suiteName} - ${report.totalPassed}/${
                  report.totalTests
                } passed (${report.duration}ms)
                    </div>
                    <div class="suite-content">
                        ${
                          report.details
                            ? report.details
                                .map(
                                  (detail) => `
                            <div class="test-item ${
                              detail.passed ? "test-passed" : "test-failed"
                            }">
                                ${detail.passed ? "✓" : "✗"} ${detail.name}
                                ${
                                  detail.error
                                    ? `<br><small>${detail.error}</small>`
                                    : ""
                                }
                            </div>
                        `
                                )
                                .join("")
                            : ""
                        }
                    </div>
                </div>
            `
              )
              .join("")}
        </div>
    </div>
</body>
</html>`;
  }
}

/**
 * エンドツーエンドテストシナリオ管理クラス
 */
class E2EScenarioRunner {
  constructor(mockFactory) {
    this.mockFactory = mockFactory;
    this.scenarios = new Map();
  }

  /**
   * E2Eシナリオを定義
   * @param {string} name - シナリオ名
   * @param {Object} config - シナリオ設定
   */
  defineScenario(name, config) {
    this.scenarios.set(name, {
      name,
      description: config.description || "",
      steps: config.steps || [],
      setup: config.setup || (() => {}),
      teardown: config.teardown || (() => {}),
      timeout: config.timeout || 30000,
    });
  }

  /**
   * シナリオを実行
   * @param {string} name - シナリオ名
   * @returns {Promise<Object>} 実行結果
   */
  async runScenario(name) {
    const scenario = this.scenarios.get(name);
    if (!scenario) {
      throw new Error(`Scenario "${name}" not found`);
    }

    const startTime = Date.now();
    const results = [];
    let currentStep = 0;

    try {
      // セットアップ実行
      await scenario.setup();

      // 各ステップを実行
      for (const step of scenario.steps) {
        currentStep++;
        const stepStartTime = Date.now();

        try {
          await Promise.race([
            step.action(),
            new Promise((_, reject) =>
              setTimeout(
                () =>
                  reject(new Error(`Step timeout: ${step.timeout || 5000}ms`)),
                step.timeout || 5000
              )
            ),
          ]);

          results.push({
            step: currentStep,
            name: step.name,
            passed: true,
            duration: Date.now() - stepStartTime,
          });
        } catch (error) {
          results.push({
            step: currentStep,
            name: step.name,
            passed: false,
            error: error.message,
            duration: Date.now() - stepStartTime,
          });

          if (!step.continueOnFailure) {
            break;
          }
        }
      }

      // ティアダウン実行
      await scenario.teardown();

      return {
        name: scenario.name,
        description: scenario.description,
        totalSteps: scenario.steps.length,
        completedSteps: results.length,
        passedSteps: results.filter((r) => r.passed).length,
        failedSteps: results.filter((r) => !r.passed).length,
        duration: Date.now() - startTime,
        results,
      };
    } catch (error) {
      return {
        name: scenario.name,
        description: scenario.description,
        totalSteps: scenario.steps.length,
        completedSteps: currentStep,
        passedSteps: results.filter((r) => r.passed).length,
        failedSteps: results.filter((r) => !r.passed).length + 1,
        duration: Date.now() - startTime,
        error: error.message,
        results,
      };
    }
  }

  /**
   * 全シナリオを実行
   * @returns {Promise<Array>} 全実行結果
   */
  async runAllScenarios() {
    const results = [];

    for (const [name] of this.scenarios) {
      const result = await this.runScenario(name);
      results.push(result);
    }

    return results;
  }
}

/**
 * メインのIntegrationTestHarnessクラス
 */
class IntegrationTestHarness {
  constructor(options = {}) {
    this.testFramework = new TestFramework(options.frameworkOptions);
    this.mockFactory = new MockFactory();
    this.reporter = new TestReporter();
    this.e2eRunner = new E2EScenarioRunner(this.mockFactory);
    this.testSuites = [];
    this.setupDefaultE2EScenarios();
  }

  /**
   * デフォルトのE2Eシナリオをセットアップ
   */
  setupDefaultE2EScenarios() {
    // 基本的なシアターモード切り替えシナリオ
    this.e2eRunner.defineScenario("theater-mode-toggle", {
      description: "シアターモードの基本的な切り替え動作をテスト",
      setup: async () => {
        await this.mockFactory.getScenarioManager().startScenario("normal");
      },
      teardown: async () => {
        await this.mockFactory.getScenarioManager().endScenario();
      },
      steps: [
        {
          name: "拡張機能の初期化",
          action: async () => {
            const stateStore = this.mockFactory.createStateStoreMock();
            await stateStore.dispatch({ type: "INITIALIZE_EXTENSION" });
          },
        },
        {
          name: "YouTube要素の検出",
          action: async () => {
            const elementManager = this.mockFactory.createElementManagerMock();
            const result = await elementManager.detectVideoPlayer();
            if (!result.success) throw new Error("Video player not detected");
          },
        },
        {
          name: "シアターモードの有効化",
          action: async () => {
            const stateStore = this.mockFactory.createStateStoreMock();
            await stateStore.dispatch({ type: "TOGGLE_THEATER_MODE" });
            const state = stateStore.getState();
            if (!state.theaterMode.isEnabled)
              throw new Error("Theater mode not enabled");
          },
        },
        {
          name: "透明度の調整",
          action: async () => {
            const stateStore = this.mockFactory.createStateStoreMock();
            await stateStore.dispatch({
              type: "UPDATE_OPACITY",
              payload: { opacity: 0.8 },
            });
            const state = stateStore.getState();
            if (state.theaterMode.opacity !== 0.8)
              throw new Error("Opacity not updated");
          },
        },
        {
          name: "シアターモードの無効化",
          action: async () => {
            const stateStore = this.mockFactory.createStateStoreMock();
            await stateStore.dispatch({ type: "TOGGLE_THEATER_MODE" });
            const state = stateStore.getState();
            if (state.theaterMode.isEnabled)
              throw new Error("Theater mode not disabled");
          },
        },
      ],
    });

    // 設定管理シナリオ
    this.e2eRunner.defineScenario("settings-management", {
      description: "設定の保存・読み込み・バリデーション動作をテスト",
      setup: async () => {
        await this.mockFactory.getScenarioManager().startScenario("normal");
      },
      teardown: async () => {
        await this.mockFactory.getScenarioManager().endScenario();
      },
      steps: [
        {
          name: "デフォルト設定の読み込み",
          action: async () => {
            const settingsManager =
              this.mockFactory.createSettingsManagerMock();
            const result = await settingsManager.loadSettings();
            if (!result.success)
              throw new Error("Failed to load default settings");
          },
        },
        {
          name: "設定の更新",
          action: async () => {
            const settingsManager =
              this.mockFactory.createSettingsManagerMock();
            const result = await settingsManager.saveSettings({ opacity: 0.6 });
            if (!result.success) throw new Error("Failed to save settings");
          },
        },
        {
          name: "設定のバリデーション",
          action: async () => {
            const settingsManager =
              this.mockFactory.createSettingsManagerMock();
            const result = settingsManager.validateSettings({ opacity: 1.5 });
            if (result.success)
              throw new Error("Invalid settings should be rejected");
          },
        },
      ],
    });

    // エラーハンドリングシナリオ
    this.e2eRunner.defineScenario("error-handling", {
      description: "エラー状況での動作をテスト",
      setup: async () => {
        await this.mockFactory.getScenarioManager().startScenario("error");
      },
      teardown: async () => {
        await this.mockFactory.getScenarioManager().endScenario();
      },
      steps: [
        {
          name: "ストレージエラーのハンドリング",
          action: async () => {
            const storageAdapter = this.mockFactory.createStorageAdapterMock();
            try {
              await storageAdapter.get(["testKey"]);
              throw new Error("Should have thrown storage error");
            } catch (error) {
              if (!error.message.includes("failed")) {
                throw new Error("Unexpected error type");
              }
            }
          },
        },
        {
          name: "要素検出失敗のハンドリング",
          action: async () => {
            const elementManager = this.mockFactory.createElementManagerMock();
            const result = await elementManager.detectVideoPlayer();
            if (result.success)
              throw new Error("Should have failed to detect elements");
          },
        },
      ],
    });

    // パフォーマンステストシナリオ
    this.e2eRunner.defineScenario("performance-test", {
      description: "パフォーマンス要件をテスト",
      setup: async () => {
        await this.mockFactory
          .getScenarioManager()
          .startScenario("performance");
      },
      teardown: async () => {
        await this.mockFactory.getScenarioManager().endScenario();
      },
      steps: [
        {
          name: "大量データでの動作確認",
          action: async () => {
            const stateStore = this.mockFactory.createStateStoreMock();
            const startTime = Date.now();

            // 50回の状態更新を実行
            for (let i = 0; i < 50; i++) {
              await stateStore.dispatch({ type: "TOGGLE_THEATER_MODE" });
            }

            const duration = Date.now() - startTime;
            if (duration > 1000)
              throw new Error(`Performance too slow: ${duration}ms`);
          },
        },
        {
          name: "ストレージ遅延の許容",
          action: async () => {
            const storageAdapter = this.mockFactory.createStorageAdapterMock();
            const startTime = Date.now();

            await storageAdapter.get(["testKey"]);

            const duration = Date.now() - startTime;
            if (duration < 500)
              throw new Error("Expected storage delay not present");
          },
        },
      ],
    });
  }

  /**
   * テストスイートを追加
   * @param {string} name - スイート名
   * @param {Function} suiteFn - スイート定義関数
   */
  addTestSuite(name, suiteFn) {
    const suite = this.testFramework.describe(name, suiteFn);
    this.testSuites.push(suite);
    return suite;
  }

  /**
   * E2Eシナリオを追加
   * @param {string} name - シナリオ名
   * @param {Object} config - シナリオ設定
   */
  addE2EScenario(name, config) {
    this.e2eRunner.defineScenario(name, config);
  }

  /**
   * 統合テストを実行
   * @param {Object} options - 実行オプション
   * @returns {Promise<Object>} テスト結果
   */
  async runIntegrationTests(options = {}) {
    this.reporter.startTesting();

    try {
      const results = {
        unitTests: null,
        e2eTests: null,
        summary: null,
      };

      // 単体テストを実行
      if (options.runUnitTests !== false) {
        console.log("Running unit tests...");
        const unitTestResults = await this.testFramework.run();
        results.unitTests = unitTestResults;

        this.reporter.addResult({
          suiteName: "Unit Tests",
          totalTests: unitTestResults.totalTests,
          totalPassed: unitTestResults.totalPassed,
          totalFailed: unitTestResults.totalFailed,
          duration: unitTestResults.duration,
          details: this.extractTestDetails(unitTestResults),
        });
      }

      // E2Eテストを実行
      if (options.runE2ETests !== false) {
        console.log("Running E2E tests...");
        const e2eResults = await this.e2eRunner.runAllScenarios();
        results.e2eTests = e2eResults;

        for (const scenario of e2eResults) {
          this.reporter.addResult({
            suiteName: `E2E: ${scenario.name}`,
            totalTests: scenario.totalSteps,
            totalPassed: scenario.passedSteps,
            totalFailed: scenario.failedSteps,
            duration: scenario.duration,
            details: scenario.results.map((r) => ({
              name: r.name,
              passed: r.passed,
              error: r.error,
            })),
          });
        }
      }

      this.reporter.endTesting();
      results.summary = this.reporter.generateSummary();

      return results;
    } catch (error) {
      this.reporter.endTesting();
      throw error;
    }
  }

  /**
   * テスト詳細を抽出
   * @private
   */
  extractTestDetails(unitTestResults) {
    const details = [];

    for (const suite of unitTestResults.suites) {
      for (const result of suite.results) {
        details.push({
          name: result.name,
          passed: result.passed,
          error: result.error?.message,
        });
      }
    }

    return details;
  }

  /**
   * レポートを生成
   * @param {string} format - レポート形式 ('text', 'json', 'html')
   * @returns {string} レポート
   */
  generateReport(format = "text") {
    switch (format.toLowerCase()) {
      case "json":
        return this.reporter.generateJsonReport();
      case "html":
        return this.reporter.generateHtmlReport();
      case "text":
      default:
        return this.reporter.generateDetailedReport();
    }
  }

  /**
   * レポートをファイルに保存
   * @param {string} filename - ファイル名
   * @param {string} format - レポート形式
   */
  saveReport(filename, format = "text") {
    const report = this.generateReport(format);

    // Node.js環境でのファイル保存
    if (typeof require !== "undefined") {
      const fs = require("fs");
      fs.writeFileSync(filename, report, "utf8");
      console.log(`Report saved to ${filename}`);
    } else {
      // ブラウザ環境での保存（ダウンロード）
      const blob = new Blob([report], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  /**
   * テストカバレッジ情報を取得
   * @returns {Object} カバレッジ情報
   */
  getCoverageInfo() {
    // 基本的なカバレッジ情報を返す
    // 実際の実装では、より詳細なカバレッジ分析を行う
    return {
      components: {
        tested: this.testSuites.length,
        total: 10, // 想定されるコンポーネント数
        coverage: ((this.testSuites.length / 10) * 100).toFixed(2),
      },
      scenarios: {
        tested: this.e2eRunner.scenarios.size,
        total: 4, // デフォルトシナリオ数
        coverage: ((this.e2eRunner.scenarios.size / 4) * 100).toFixed(2),
      },
    };
  }

  /**
   * テストメトリクスを取得
   * @returns {Object} テストメトリクス
   */
  getTestMetrics() {
    const summary = this.reporter.generateSummary();
    const coverage = this.getCoverageInfo();

    return {
      execution: {
        totalTests: summary.totalTests,
        totalPassed: summary.totalPassed,
        totalFailed: summary.totalFailed,
        successRate: summary.successRate,
        totalDuration: summary.totalDuration,
      },
      coverage,
      performance: {
        averageTestDuration:
          summary.totalTests > 0
            ? (summary.totalDuration / summary.totalTests).toFixed(2)
            : 0,
        slowestTest: Math.max(...this.reporter.reports.map((r) => r.duration)),
        fastestTest: Math.min(...this.reporter.reports.map((r) => r.duration)),
      },
    };
  }
}

// エクスポート
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    IntegrationTestHarness,
    TestReporter,
    E2EScenarioRunner,
  };
}

if (typeof window !== "undefined") {
  window.IntegrationTestHarness = IntegrationTestHarness;
  window.TestReporter = TestReporter;
  window.E2EScenarioRunner = E2EScenarioRunner;
}
