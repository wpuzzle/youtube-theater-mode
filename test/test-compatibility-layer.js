/**
 * Compatibility Layer テストスイート
 * 新旧システム間の互換性レイヤーをテスト
 */

// テストフレームワークの読み込み
if (typeof require !== "undefined") {
  // Node.js環境
  const { TestFramework } = require("../infrastructure/test-framework.js");
  const { MockFactory } = require("../infrastructure/mock-factory.js");
  const {
    CompatibilityLayer,
    CompatibilityLevel,
    FeatureFlags,
    CompatibilityIssueType,
  } = require("../infrastructure/compatibility-layer.js");
} else {
  // ブラウザ環境では、これらは既にグローバルに読み込まれている前提
}

/**
 * CompatibilityLayerテストクラス
 */
class CompatibilityLayerTest {
  constructor() {
    this.testFramework = new TestFramework("CompatibilityLayer");
    this.mockFactory = new MockFactory();
    this.compatibilityLayer = null;
    this.mockDependencies = null;
  }

  /**
   * テストセットアップ
   */
  async setup() {
    // モック依存関係を作成
    this.mockDependencies = {
      logger: this.mockFactory.createMockLogger(),
      errorHandler: this.mockFactory.createMockErrorHandler(),
      legacyAdapter: this.mockFactory.createMockLegacyAdapter(),
      migrationScripts: this.mockFactory.createMockMigrationScripts(),
    };

    // CompatibilityLayerインスタンスを作成
    this.compatibilityLayer = new CompatibilityLayer({
      ...this.mockDependencies,
      compatibilityLevel: CompatibilityLevel.HYBRID,
      autoDetectIssues: false, // テスト中は自動検出を無効化
    });
  }

  /**
   * テストクリーンアップ
   */
  async teardown() {
    if (this.compatibilityLayer) {
      this.compatibilityLayer.cleanup();
      this.compatibilityLayer = null;
    }
    this.mockDependencies = null;
  }

  /**
   * 基本的な初期化テスト
   */
  async testBasicInitialization() {
    this.testFramework.describe("Basic Initialization", () => {
      this.testFramework.it(
        "should initialize with required dependencies",
        () => {
          this.testFramework.assert(
            this.compatibilityLayer !== null,
            "CompatibilityLayer should be created"
          );

          this.testFramework.assert(
            this.compatibilityLayer.compatibilityLevel ===
              CompatibilityLevel.HYBRID,
            "Should set correct compatibility level"
          );
        }
      );

      this.testFramework.it(
        "should throw error without required dependencies",
        () => {
          let errorThrown = false;
          try {
            new CompatibilityLayer();
          } catch (error) {
            errorThrown = true;
          }

          this.testFramework.assert(
            errorThrown,
            "Should throw error when options are not provided"
          );
        }
      );

      this.testFramework.it("should have default feature flags", () => {
        const defaultFlags = this.compatibilityLayer.getDefaultFeatureFlags();

        this.testFramework.assert(
          typeof defaultFlags === "object",
          "Should return default feature flags object"
        );

        this.testFramework.assert(
          defaultFlags.hasOwnProperty(FeatureFlags.USE_NEW_STATE_MANAGEMENT),
          "Should have state management flag"
        );

        this.testFramework.assert(
          defaultFlags[FeatureFlags.ENABLE_PERFORMANCE_MONITORING] === true,
          "Performance monitoring should be enabled by default"
        );
      });
    });
  }

  /**
   * 機能フラグテスト
   */
  async testFeatureFlags() {
    this.testFramework.describe("Feature Flags", () => {
      this.testFramework.it("should set and get feature flags", () => {
        const result = this.compatibilityLayer.setFeatureFlag(
          FeatureFlags.USE_NEW_STATE_MANAGEMENT,
          true
        );

        this.testFramework.assert(
          result.isSuccess(),
          "Should successfully set feature flag"
        );

        const flagValue = this.compatibilityLayer.getFeatureFlag(
          FeatureFlags.USE_NEW_STATE_MANAGEMENT
        );

        this.testFramework.assert(
          flagValue === true,
          "Should return correct feature flag value"
        );
      });

      this.testFramework.it("should reject unknown feature flags", () => {
        const result = this.compatibilityLayer.setFeatureFlag(
          "unknownFlag",
          true
        );

        this.testFramework.assert(
          result.isFailure(),
          "Should reject unknown feature flag"
        );
      });

      this.testFramework.it("should record feature flag changes", () => {
        this.compatibilityLayer.setFeatureFlag(
          FeatureFlags.USE_NEW_SETTINGS_MANAGER,
          true
        );

        this.testFramework.assert(
          this.compatibilityLayer.switchHistory.length > 0,
          "Should record feature flag changes in history"
        );

        const lastChange =
          this.compatibilityLayer.switchHistory[
            this.compatibilityLayer.switchHistory.length - 1
          ];

        this.testFramework.assert(
          lastChange.flag === FeatureFlags.USE_NEW_SETTINGS_MANAGER,
          "Should record correct flag name"
        );

        this.testFramework.assert(
          lastChange.newValue === true,
          "Should record correct new value"
        );
      });
    });
  }

  /**
   * 互換性レベルテスト
   */
  async testCompatibilityLevel() {
    this.testFramework.describe("Compatibility Level", () => {
      this.testFramework.it("should set compatibility level", () => {
        const result = this.compatibilityLayer.setCompatibilityLevel(
          CompatibilityLevel.NEW_ONLY
        );

        this.testFramework.assert(
          result.isSuccess(),
          "Should successfully set compatibility level"
        );

        this.testFramework.assert(
          this.compatibilityLayer.compatibilityLevel ===
            CompatibilityLevel.NEW_ONLY,
          "Should update compatibility level"
        );
      });

      this.testFramework.it("should reject unknown compatibility level", () => {
        const result =
          this.compatibilityLayer.setCompatibilityLevel("unknownLevel");

        this.testFramework.assert(
          result.isFailure(),
          "Should reject unknown compatibility level"
        );
      });

      this.testFramework.it(
        "should adjust feature flags based on level",
        () => {
          // NEW_ONLYレベルに設定
          this.compatibilityLayer.setCompatibilityLevel(
            CompatibilityLevel.NEW_ONLY
          );

          // 新機能フラグが有効化されることを確認
          const stateManagementFlag = this.compatibilityLayer.getFeatureFlag(
            FeatureFlags.USE_NEW_STATE_MANAGEMENT
          );

          this.testFramework.assert(
            stateManagementFlag === true,
            "Should enable new features for NEW_ONLY level"
          );

          // LEGACY_ONLYレベルに設定
          this.compatibilityLayer.setCompatibilityLevel(
            CompatibilityLevel.LEGACY_ONLY
          );

          const stateManagementFlagAfter =
            this.compatibilityLayer.getFeatureFlag(
              FeatureFlags.USE_NEW_STATE_MANAGEMENT
            );

          this.testFramework.assert(
            stateManagementFlagAfter === false,
            "Should disable new features for LEGACY_ONLY level"
          );
        }
      );
    });
  }

  /**
   * 実装選択テスト
   */
  async testImplementationSelection() {
    this.testFramework.describe("Implementation Selection", () => {
      const mockImplementations = {
        legacy: { name: "legacy", initialize: () => {} },
        new: { name: "new", initialize: () => {} },
      };

      this.testFramework.it(
        "should select legacy implementation for LEGACY_ONLY",
        () => {
          this.compatibilityLayer.setCompatibilityLevel(
            CompatibilityLevel.LEGACY_ONLY
          );

          const selected = this.compatibilityLayer.selectImplementation(
            FeatureFlags.USE_NEW_STATE_MANAGEMENT,
            mockImplementations
          );

          this.testFramework.assert(
            selected.name === "legacy",
            "Should select legacy implementation for LEGACY_ONLY level"
          );
        }
      );

      this.testFramework.it(
        "should select new implementation for NEW_ONLY",
        () => {
          this.compatibilityLayer.setCompatibilityLevel(
            CompatibilityLevel.NEW_ONLY
          );

          const selected = this.compatibilityLayer.selectImplementation(
            FeatureFlags.USE_NEW_STATE_MANAGEMENT,
            mockImplementations
          );

          this.testFramework.assert(
            selected.name === "new",
            "Should select new implementation for NEW_ONLY level"
          );
        }
      );

      this.testFramework.it(
        "should fallback to legacy when new implementation unavailable",
        () => {
          this.compatibilityLayer.setCompatibilityLevel(
            CompatibilityLevel.NEW_ONLY
          );

          const selected = this.compatibilityLayer.selectImplementation(
            FeatureFlags.USE_NEW_STATE_MANAGEMENT,
            { legacy: mockImplementations.legacy, new: null }
          );

          this.testFramework.assert(
            selected.name === "legacy",
            "Should fallback to legacy when new implementation unavailable"
          );
        }
      );

      this.testFramework.it(
        "should respect feature flags in HYBRID mode",
        () => {
          this.compatibilityLayer.setCompatibilityLevel(
            CompatibilityLevel.HYBRID
          );
          this.compatibilityLayer.setFeatureFlag(
            FeatureFlags.USE_NEW_STATE_MANAGEMENT,
            true
          );

          const selected = this.compatibilityLayer.selectImplementation(
            FeatureFlags.USE_NEW_STATE_MANAGEMENT,
            mockImplementations
          );

          this.testFramework.assert(
            selected.name === "new",
            "Should select new implementation when feature flag is enabled in HYBRID mode"
          );
        }
      );
    });
  }

  /**
   * 互換性問題検出テスト
   */
  async testCompatibilityIssueDetection() {
    this.testFramework.describe("Compatibility Issue Detection", () => {
      this.testFramework.it("should detect compatibility issues", async () => {
        // モックを設定して問題を発生させる
        this.mockDependencies.migrationScripts.validateDataIntegrity.mockResolvedValue(
          {
            isSuccess: () => true,
            data: {
              isValid: false,
              issues: [
                {
                  type: "invalid_type",
                  key: "settings.opacity",
                  message: "Invalid opacity value",
                },
              ],
            },
          }
        );

        const result =
          await this.compatibilityLayer.detectCompatibilityIssues();

        this.testFramework.assert(
          result.isSuccess(),
          "Should successfully detect issues"
        );

        const issues = result.data;
        this.testFramework.assert(
          Array.isArray(issues),
          "Should return array of issues"
        );

        this.testFramework.assert(
          issues.length > 0,
          "Should detect at least one issue"
        );

        // データ形式の問題が検出されることを確認
        const dataFormatIssue = issues.find(
          (issue) =>
            issue.type === CompatibilityIssueType.DATA_FORMAT_INCOMPATIBLE
        );

        this.testFramework.assert(
          dataFormatIssue !== undefined,
          "Should detect data format compatibility issue"
        );
      });

      this.testFramework.it(
        "should detect API compatibility issues",
        async () => {
          // レガシーアダプターが不完全なAPIを返すようにモック
          this.mockDependencies.legacyAdapter.createLegacyTheaterModeController.mockReturnValue(
            {
              initialize: () => {},
              // toggleTheaterMode メソッドが欠落
              updateOpacity: () => {},
              getState: () => {},
            }
          );

          const result =
            await this.compatibilityLayer.detectCompatibilityIssues();

          this.testFramework.assert(
            result.isSuccess(),
            "Should successfully detect API issues"
          );

          const issues = result.data;
          const apiIssue = issues.find(
            (issue) => issue.type === CompatibilityIssueType.API_MISMATCH
          );

          this.testFramework.assert(
            apiIssue !== undefined,
            "Should detect API mismatch issue"
          );
        }
      );

      this.testFramework.it("should detect dependency issues", async () => {
        // Chrome APIが利用できない環境をシミュレート
        const originalChrome = global.chrome;
        delete global.chrome;

        const result =
          await this.compatibilityLayer.detectCompatibilityIssues();

        this.testFramework.assert(
          result.isSuccess(),
          "Should successfully detect dependency issues"
        );

        const issues = result.data;
        const dependencyIssue = issues.find(
          (issue) => issue.type === CompatibilityIssueType.DEPENDENCY_MISSING
        );

        this.testFramework.assert(
          dependencyIssue !== undefined,
          "Should detect dependency missing issue"
        );

        // Chrome APIを復元
        global.chrome = originalChrome;
      });
    });
  }

  /**
   * 互換性問題解決テスト
   */
  async testCompatibilityIssueResolution() {
    this.testFramework.describe("Compatibility Issue Resolution", () => {
      this.testFramework.it("should resolve API mismatch issues", async () => {
        const apiIssue = {
          id: "test_issue_1",
          type: CompatibilityIssueType.API_MISMATCH,
          feature: "TheaterModeController",
          method: "toggleTheaterMode",
          message: "Method missing",
        };

        const result = await this.compatibilityLayer.resolveCompatibilityIssues(
          [apiIssue]
        );

        this.testFramework.assert(
          result.isSuccess(),
          "Should successfully resolve issues"
        );

        const resolution = result.data;
        this.testFramework.assert(
          resolution.resolved >= 0,
          "Should have resolution count"
        );

        this.testFramework.assert(
          Array.isArray(resolution.details),
          "Should have resolution details"
        );
      });

      this.testFramework.it("should resolve data format issues", async () => {
        const dataIssue = {
          id: "test_issue_2",
          type: CompatibilityIssueType.DATA_FORMAT_INCOMPATIBLE,
          feature: "DataIntegrity",
          message: "Invalid data format",
        };

        // 移行スクリプトが成功するようにモック
        this.mockDependencies.migrationScripts.migrate.mockResolvedValue({
          isSuccess: () => true,
          data: { migrated: true },
        });

        const result = await this.compatibilityLayer.resolveCompatibilityIssues(
          [dataIssue]
        );

        this.testFramework.assert(
          result.isSuccess(),
          "Should successfully resolve data format issues"
        );

        const resolution = result.data;
        this.testFramework.assert(
          resolution.resolved > 0,
          "Should resolve at least one issue"
        );
      });
    });
  }

  /**
   * 段階的移行テスト
   */
  async testGradualMigration() {
    this.testFramework.describe("Gradual Migration", () => {
      this.testFramework.it("should execute migration plan", async () => {
        const migrationPlan = {
          steps: [
            {
              name: "Enable new state management",
              type: "enable_feature",
              feature: FeatureFlags.USE_NEW_STATE_MANAGEMENT,
            },
            {
              name: "Set compatibility level",
              type: "set_compatibility_level",
              level: CompatibilityLevel.NEW_WITH_FALLBACK,
            },
          ],
        };

        const result = await this.compatibilityLayer.performGradualMigration(
          migrationPlan
        );

        this.testFramework.assert(
          result.isSuccess(),
          "Should successfully execute migration plan"
        );

        const migrationResult = result.data;
        this.testFramework.assert(
          Array.isArray(migrationResult.completed),
          "Should have completed steps array"
        );

        this.testFramework.assert(
          migrationResult.completed.length === 2,
          "Should complete all migration steps"
        );

        // 機能フラグが有効化されていることを確認
        const flagEnabled = this.compatibilityLayer.getFeatureFlag(
          FeatureFlags.USE_NEW_STATE_MANAGEMENT
        );

        this.testFramework.assert(
          flagEnabled === true,
          "Should enable feature flag through migration"
        );

        // 互換性レベルが変更されていることを確認
        this.testFramework.assert(
          this.compatibilityLayer.compatibilityLevel ===
            CompatibilityLevel.NEW_WITH_FALLBACK,
          "Should change compatibility level through migration"
        );
      });

      this.testFramework.it(
        "should handle migration step failures",
        async () => {
          const migrationPlan = {
            steps: [
              {
                name: "Invalid step",
                type: "invalid_type",
              },
            ],
          };

          const result = await this.compatibilityLayer.performGradualMigration(
            migrationPlan
          );

          this.testFramework.assert(
            result.isSuccess(),
            "Should handle migration failures gracefully"
          );

          const migrationResult = result.data;
          this.testFramework.assert(
            migrationResult.failed.length > 0,
            "Should record failed steps"
          );
        }
      );

      this.testFramework.it(
        "should skip steps with unmet prerequisites",
        async () => {
          const migrationPlan = {
            steps: [
              {
                name: "Step with prerequisites",
                type: "enable_feature",
                feature: FeatureFlags.USE_NEW_ELEMENT_MANAGER,
                prerequisites: [
                  {
                    type: "feature_flag",
                    flag: FeatureFlags.USE_NEW_STATE_MANAGEMENT,
                  },
                ],
              },
            ],
          };

          // 前提条件を満たさない状態で実行
          this.compatibilityLayer.setFeatureFlag(
            FeatureFlags.USE_NEW_STATE_MANAGEMENT,
            false
          );

          const result = await this.compatibilityLayer.performGradualMigration(
            migrationPlan
          );

          this.testFramework.assert(
            result.isSuccess(),
            "Should handle prerequisites check"
          );

          const migrationResult = result.data;
          this.testFramework.assert(
            migrationResult.skipped.length > 0,
            "Should skip steps with unmet prerequisites"
          );
        }
      );
    });
  }

  /**
   * 互換性レポートテスト
   */
  async testCompatibilityReport() {
    this.testFramework.describe("Compatibility Report", () => {
      this.testFramework.it("should generate compatibility report", () => {
        // いくつかの設定を変更
        this.compatibilityLayer.setFeatureFlag(
          FeatureFlags.USE_NEW_STATE_MANAGEMENT,
          true
        );
        this.compatibilityLayer.setCompatibilityLevel(
          CompatibilityLevel.HYBRID
        );

        // 問題を追加
        this.compatibilityLayer.detectedIssues.push({
          id: "test_issue",
          type: CompatibilityIssueType.PERFORMANCE_DEGRADATION,
          feature: "TestFeature",
          message: "Test issue",
          timestamp: new Date().toISOString(),
        });

        const report = this.compatibilityLayer.generateCompatibilityReport();

        this.testFramework.assert(
          typeof report === "object",
          "Should return report object"
        );

        this.testFramework.assert(
          typeof report.timestamp === "string",
          "Should include timestamp"
        );

        this.testFramework.assert(
          report.compatibilityLevel === CompatibilityLevel.HYBRID,
          "Should include current compatibility level"
        );

        this.testFramework.assert(
          typeof report.featureFlags === "object",
          "Should include feature flags"
        );

        this.testFramework.assert(
          Array.isArray(report.activeFeatures),
          "Should include active features list"
        );

        this.testFramework.assert(
          report.detectedIssues === 1,
          "Should include detected issues count"
        );

        this.testFramework.assert(
          typeof report.issuesByType === "object",
          "Should include issues grouped by type"
        );

        this.testFramework.assert(
          Array.isArray(report.recommendations),
          "Should include recommendations"
        );
      });

      this.testFramework.it(
        "should include performance metrics in report",
        () => {
          // パフォーマンスメトリクスを追加
          this.compatibilityLayer.performanceMetrics.set("testMetric", {
            value: 100,
            timestamp: Date.now(),
          });

          const report = this.compatibilityLayer.generateCompatibilityReport();

          this.testFramework.assert(
            typeof report.performanceMetrics === "object",
            "Should include performance metrics"
          );

          this.testFramework.assert(
            report.performanceMetrics.testMetric !== undefined,
            "Should include specific performance metrics"
          );
        }
      );
    });
  }

  /**
   * 初期化テスト
   */
  async testInitialization() {
    this.testFramework.describe("Initialization", () => {
      this.testFramework.it("should initialize successfully", async () => {
        // 移行チェックが成功するようにモック
        this.mockDependencies.migrationScripts.checkMigrationNeeded.mockResolvedValue(
          {
            isSuccess: () => true,
            data: { needsMigration: false },
          }
        );

        const result = await this.compatibilityLayer.initialize();

        this.testFramework.assert(
          result.isSuccess(),
          "Should initialize successfully"
        );

        const initResult = result.data;
        this.testFramework.assert(
          typeof initResult.compatibilityLevel === "string",
          "Should include compatibility level in result"
        );

        this.testFramework.assert(
          Array.isArray(initResult.activeFeatures),
          "Should include active features in result"
        );
      });

      this.testFramework.it("should handle initialization errors", async () => {
        // エラーを発生させるモック
        this.mockDependencies.migrationScripts.checkMigrationNeeded.mockRejectedValue(
          new Error("Migration check failed")
        );

        const result = await this.compatibilityLayer.initialize();

        this.testFramework.assert(
          result.isFailure(),
          "Should handle initialization errors"
        );
      });
    });
  }

  /**
   * 全テストを実行
   */
  async runAllTests() {
    console.log("Starting CompatibilityLayer tests...");

    try {
      await this.setup();

      await this.testBasicInitialization();
      await this.testFeatureFlags();
      await this.testCompatibilityLevel();
      await this.testImplementationSelection();
      await this.testCompatibilityIssueDetection();
      await this.testCompatibilityIssueResolution();
      await this.testGradualMigration();
      await this.testCompatibilityReport();
      await this.testInitialization();

      await this.teardown();

      this.testFramework.printResults();
      return this.testFramework.getResults();
    } catch (error) {
      console.error("Test execution failed:", error);
      throw error;
    }
  }
}

// テスト実行
if (typeof window !== "undefined") {
  // ブラウザ環境
  window.CompatibilityLayerTest = CompatibilityLayerTest;
} else if (typeof module !== "undefined") {
  // Node.js環境
  module.exports = { CompatibilityLayerTest };
}
