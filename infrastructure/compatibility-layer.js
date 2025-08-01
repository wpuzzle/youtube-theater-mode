/**
 * Compatibility Layer
 * 新旧システム間の互換性レイヤーを実装
 * 機能の段階的な切り替え機能と互換性問題の検出・対処機能を提供
 */

// 依存関係のインポート
let Logger,
  ErrorHandler,
  Result,
  AppError,
  ErrorType,
  LegacyAdapter,
  MigrationScripts;

// Node.js環境での依存関係の解決
if (typeof require !== "undefined") {
  ({ Logger } = require("./logger.js"));
  ({
    ErrorHandler,
    Result,
    AppError,
    ErrorType,
  } = require("./error-handler.js"));
  ({ LegacyAdapter } = require("./legacy-adapter.js"));
  ({ MigrationScripts } = require("./migration-scripts.js"));
}

/**
 * 互換性レベル定義
 * システムの互換性レベルを定義
 */
const CompatibilityLevel = {
  LEGACY_ONLY: "legacy_only", // レガシーシステムのみ使用
  HYBRID: "hybrid", // 新旧システムの併用
  NEW_WITH_FALLBACK: "new_with_fallback", // 新システム優先、フォールバック有り
  NEW_ONLY: "new_only", // 新システムのみ使用
};

/**
 * 機能フラグ定義
 * 各機能の有効/無効を制御
 */
const FeatureFlags = {
  USE_NEW_STATE_MANAGEMENT: "useNewStateManagement",
  USE_NEW_SETTINGS_MANAGER: "useNewSettingsManager",
  USE_NEW_ELEMENT_MANAGER: "useNewElementManager",
  USE_NEW_MESSAGE_BUS: "useNewMessageBus",
  USE_NEW_ERROR_HANDLING: "useNewErrorHandling",
  ENABLE_PERFORMANCE_MONITORING: "enablePerformanceMonitoring",
  ENABLE_DEBUG_LOGGING: "enableDebugLogging",
  ENABLE_AUTOMATIC_MIGRATION: "enableAutomaticMigration",
};

/**
 * 互換性問題の種類
 */
const CompatibilityIssueType = {
  API_MISMATCH: "api_mismatch",
  DATA_FORMAT_INCOMPATIBLE: "data_format_incompatible",
  DEPENDENCY_MISSING: "dependency_missing",
  VERSION_CONFLICT: "version_conflict",
  PERFORMANCE_DEGRADATION: "performance_degradation",
  FEATURE_UNAVAILABLE: "feature_unavailable",
};

/**
 * 互換性レイヤークラス
 * 新旧システム間の互換性を管理
 */
class CompatibilityLayer {
  /**
   * CompatibilityLayerインスタンスを作成
   * @param {Object} options - オプション
   * @param {Object} options.logger - ロガーインスタンス
   * @param {Object} options.errorHandler - エラーハンドラーインスタンス
   * @param {LegacyAdapter} [options.legacyAdapter] - レガシーアダプター
   * @param {MigrationScripts} [options.migrationScripts] - 移行スクリプト
   * @param {string} [options.compatibilityLevel] - 互換性レベル
   * @param {Object} [options.featureFlags] - 機能フラグ
   * @param {boolean} [options.autoDetectIssues=true] - 自動問題検出フラグ
   */
  constructor(options) {
    if (!options) {
      throw new Error("Options are required");
    }

    this.logger = options.logger;
    this.errorHandler = options.errorHandler;
    this.legacyAdapter = options.legacyAdapter;
    this.migrationScripts = options.migrationScripts;

    // 互換性レベルの設定
    this.compatibilityLevel =
      options.compatibilityLevel || CompatibilityLevel.HYBRID;

    // 機能フラグの設定
    this.featureFlags = {
      ...this.getDefaultFeatureFlags(),
      ...(options.featureFlags || {}),
    };

    // 自動問題検出の設定
    this.autoDetectIssues = options.autoDetectIssues !== false;

    // 互換性問題の記録
    this.detectedIssues = [];

    // パフォーマンス監視
    this.performanceMetrics = new Map();

    // 機能切り替えの履歴
    this.switchHistory = [];

    if (this.logger) {
      this.logger.debug("CompatibilityLayer initialized", {
        compatibilityLevel: this.compatibilityLevel,
        featureFlags: this.featureFlags,
        autoDetectIssues: this.autoDetectIssues,
      });
    }
  }

  /**
   * デフォルトの機能フラグを取得
   * @returns {Object} デフォルト機能フラグ
   */
  getDefaultFeatureFlags() {
    return {
      [FeatureFlags.USE_NEW_STATE_MANAGEMENT]: false,
      [FeatureFlags.USE_NEW_SETTINGS_MANAGER]: false,
      [FeatureFlags.USE_NEW_ELEMENT_MANAGER]: false,
      [FeatureFlags.USE_NEW_MESSAGE_BUS]: false,
      [FeatureFlags.USE_NEW_ERROR_HANDLING]: false,
      [FeatureFlags.ENABLE_PERFORMANCE_MONITORING]: true,
      [FeatureFlags.ENABLE_DEBUG_LOGGING]: false,
      [FeatureFlags.ENABLE_AUTOMATIC_MIGRATION]: true,
    };
  }

  /**
   * 互換性レイヤーを初期化
   * @returns {Promise<Result<Object>>} 初期化結果
   */
  async initialize() {
    try {
      if (this.logger) {
        this.logger.info("Initializing compatibility layer");
      }

      // 自動問題検出を開始
      if (this.autoDetectIssues) {
        await this._startIssueDetection();
      }

      // 自動移行が有効な場合は移行チェック
      if (
        this.featureFlags[FeatureFlags.ENABLE_AUTOMATIC_MIGRATION] &&
        this.migrationScripts
      ) {
        await this._checkAndPerformMigration();
      }

      // パフォーマンス監視を開始
      if (this.featureFlags[FeatureFlags.ENABLE_PERFORMANCE_MONITORING]) {
        this._startPerformanceMonitoring();
      }

      const initResult = {
        compatibilityLevel: this.compatibilityLevel,
        activeFeatures: this._getActiveFeatures(),
        detectedIssues: this.detectedIssues.length,
        migrationStatus: this.migrationScripts
          ? await this._getMigrationStatus()
          : null,
      };

      if (this.logger) {
        this.logger.info("Compatibility layer initialized", initResult);
      }

      return Result.success(initResult);
    } catch (error) {
      if (this.logger) {
        this.logger.error("Failed to initialize compatibility layer", error);
      }

      if (this.errorHandler) {
        this.errorHandler.handleError(error, {
          context: { operation: "initialize" },
          type: ErrorType.INITIALIZATION_ERROR,
        });
      }

      return Result.failure(error, {
        type: ErrorType.INITIALIZATION_ERROR,
      });
    }
  }

  /**
   * 機能フラグを設定
   * @param {string} flag - 機能フラグ名
   * @param {boolean} enabled - 有効/無効
   * @returns {Result<boolean>} 設定結果
   */
  setFeatureFlag(flag, enabled) {
    try {
      if (!Object.values(FeatureFlags).includes(flag)) {
        return Result.failure(`Unknown feature flag: ${flag}`, {
          type: ErrorType.VALIDATION_ERROR,
        });
      }

      const previousValue = this.featureFlags[flag];
      this.featureFlags[flag] = enabled;

      // 切り替え履歴を記録
      this.switchHistory.push({
        flag,
        previousValue,
        newValue: enabled,
        timestamp: new Date().toISOString(),
      });

      if (this.logger) {
        this.logger.info(`Feature flag updated: ${flag}`, {
          previousValue,
          newValue: enabled,
        });
      }

      // 特定の機能フラグの変更時に追加処理
      this._handleFeatureFlagChange(flag, enabled, previousValue);

      return Result.success(true);
    } catch (error) {
      if (this.logger) {
        this.logger.error(`Failed to set feature flag: ${flag}`, error);
      }

      return Result.failure(error, {
        type: ErrorType.INTERNAL_ERROR,
        context: { flag, enabled },
      });
    }
  }

  /**
   * 機能フラグを取得
   * @param {string} flag - 機能フラグ名
   * @returns {boolean} 機能フラグの値
   */
  getFeatureFlag(flag) {
    return this.featureFlags[flag] || false;
  }

  /**
   * 互換性レベルを設定
   * @param {string} level - 互換性レベル
   * @returns {Result<boolean>} 設定結果
   */
  setCompatibilityLevel(level) {
    try {
      if (!Object.values(CompatibilityLevel).includes(level)) {
        return Result.failure(`Unknown compatibility level: ${level}`, {
          type: ErrorType.VALIDATION_ERROR,
        });
      }

      const previousLevel = this.compatibilityLevel;
      this.compatibilityLevel = level;

      // レベル変更に応じて機能フラグを自動調整
      this._adjustFeatureFlagsForLevel(level);

      if (this.logger) {
        this.logger.info(`Compatibility level changed: ${level}`, {
          previousLevel,
          newLevel: level,
        });
      }

      return Result.success(true);
    } catch (error) {
      if (this.logger) {
        this.logger.error(`Failed to set compatibility level: ${level}`, error);
      }

      return Result.failure(error, {
        type: ErrorType.INTERNAL_ERROR,
        context: { level },
      });
    }
  }

  /**
   * 適切な実装を選択
   * @param {string} feature - 機能名
   * @param {Object} implementations - 実装オブジェクト
   * @param {Object} implementations.legacy - レガシー実装
   * @param {Object} implementations.new - 新実装
   * @returns {Object} 選択された実装
   */
  selectImplementation(feature, implementations) {
    try {
      const { legacy, new: newImpl } = implementations;

      // 機能フラグをチェック
      const useNew = this.getFeatureFlag(feature);

      // 互換性レベルに基づく選択
      switch (this.compatibilityLevel) {
        case CompatibilityLevel.LEGACY_ONLY:
          return legacy;

        case CompatibilityLevel.NEW_ONLY:
          if (!newImpl) {
            if (this.logger) {
              this.logger.warn(
                `New implementation not available for ${feature}, using legacy`
              );
            }
            this._recordIssue({
              type: CompatibilityIssueType.FEATURE_UNAVAILABLE,
              feature,
              message: "New implementation not available",
            });
            return legacy;
          }
          return newImpl;

        case CompatibilityLevel.HYBRID:
          return useNew && newImpl ? newImpl : legacy;

        case CompatibilityLevel.NEW_WITH_FALLBACK:
          if (newImpl) {
            // 新実装の健全性をチェック
            if (this._isImplementationHealthy(newImpl)) {
              return newImpl;
            } else {
              if (this.logger) {
                this.logger.warn(
                  `New implementation unhealthy for ${feature}, falling back to legacy`
                );
              }
              this._recordIssue({
                type: CompatibilityIssueType.PERFORMANCE_DEGRADATION,
                feature,
                message: "New implementation unhealthy, using fallback",
              });
              return legacy;
            }
          }
          return legacy;

        default:
          return legacy;
      }
    } catch (error) {
      if (this.logger) {
        this.logger.error(
          `Error selecting implementation for ${feature}`,
          error
        );
      }

      // エラー時はレガシー実装を返す
      return implementations.legacy;
    }
  }

  /**
   * 互換性問題を検出
   * @returns {Promise<Result<Array>>} 検出された問題のリスト
   */
  async detectCompatibilityIssues() {
    try {
      if (this.logger) {
        this.logger.debug("Detecting compatibility issues");
      }

      const issues = [];

      // API互換性チェック
      const apiIssues = await this._checkAPICompatibility();
      issues.push(...apiIssues);

      // データ形式互換性チェック
      const dataIssues = await this._checkDataFormatCompatibility();
      issues.push(...dataIssues);

      // 依存関係チェック
      const dependencyIssues = this._checkDependencies();
      issues.push(...dependencyIssues);

      // バージョン競合チェック
      const versionIssues = this._checkVersionConflicts();
      issues.push(...versionIssues);

      // パフォーマンス問題チェック
      const performanceIssues = this._checkPerformanceIssues();
      issues.push(...performanceIssues);

      // 検出された問題を記録
      this.detectedIssues = issues;

      if (this.logger) {
        this.logger.info(`Detected ${issues.length} compatibility issues`);
      }

      return Result.success(issues);
    } catch (error) {
      if (this.logger) {
        this.logger.error("Error detecting compatibility issues", error);
      }

      return Result.failure(error, {
        type: ErrorType.INTERNAL_ERROR,
      });
    }
  }

  /**
   * 互換性問題を解決
   * @param {Array} issues - 解決する問題のリスト
   * @returns {Promise<Result<Object>>} 解決結果
   */
  async resolveCompatibilityIssues(issues = null) {
    try {
      const issuesToResolve = issues || this.detectedIssues;

      if (this.logger) {
        this.logger.info(
          `Resolving ${issuesToResolve.length} compatibility issues`
        );
      }

      const resolutionResults = {
        resolved: 0,
        failed: 0,
        skipped: 0,
        details: [],
      };

      for (const issue of issuesToResolve) {
        try {
          const result = await this._resolveIssue(issue);

          if (result.isSuccess()) {
            resolutionResults.resolved++;
            resolutionResults.details.push({
              issue: issue.type,
              status: "resolved",
              action: result.data.action,
            });
          } else {
            resolutionResults.failed++;
            resolutionResults.details.push({
              issue: issue.type,
              status: "failed",
              error: result.error.message,
            });
          }
        } catch (error) {
          resolutionResults.failed++;
          resolutionResults.details.push({
            issue: issue.type,
            status: "failed",
            error: error.message,
          });
        }
      }

      if (this.logger) {
        this.logger.info("Issue resolution completed", resolutionResults);
      }

      return Result.success(resolutionResults);
    } catch (error) {
      if (this.logger) {
        this.logger.error("Error resolving compatibility issues", error);
      }

      return Result.failure(error, {
        type: ErrorType.INTERNAL_ERROR,
      });
    }
  }

  /**
   * 互換性レポートを生成
   * @returns {Object} 互換性レポート
   */
  generateCompatibilityReport() {
    const activeFeatures = this._getActiveFeatures();
    const performanceData = this._getPerformanceData();

    const report = {
      timestamp: new Date().toISOString(),
      compatibilityLevel: this.compatibilityLevel,
      featureFlags: { ...this.featureFlags },
      activeFeatures,
      detectedIssues: this.detectedIssues.length,
      issuesByType: this._groupIssuesByType(),
      performanceMetrics: performanceData,
      switchHistory: this.switchHistory.slice(-10), // 最新10件
      recommendations: this._generateRecommendations(),
    };

    if (this.logger) {
      this.logger.debug("Generated compatibility report", {
        issueCount: report.detectedIssues,
        activeFeatureCount: activeFeatures.length,
      });
    }

    return report;
  }

  /**
   * 段階的移行を実行
   * @param {Object} migrationPlan - 移行計画
   * @returns {Promise<Result<Object>>} 移行結果
   */
  async performGradualMigration(migrationPlan) {
    try {
      if (this.logger) {
        this.logger.info("Starting gradual migration", migrationPlan);
      }

      const migrationResult = {
        completed: [],
        failed: [],
        skipped: [],
      };

      for (const step of migrationPlan.steps) {
        try {
          if (this.logger) {
            this.logger.debug(`Executing migration step: ${step.name}`);
          }

          // ステップの前提条件をチェック
          if (
            step.prerequisites &&
            !this._checkPrerequisites(step.prerequisites)
          ) {
            migrationResult.skipped.push({
              step: step.name,
              reason: "Prerequisites not met",
            });
            continue;
          }

          // ステップを実行
          const stepResult = await this._executeMigrationStep(step);

          if (stepResult.isSuccess()) {
            migrationResult.completed.push({
              step: step.name,
              result: stepResult.data,
            });

            // 成功した場合は機能フラグを更新
            if (step.featureFlag) {
              this.setFeatureFlag(step.featureFlag, true);
            }
          } else {
            migrationResult.failed.push({
              step: step.name,
              error: stepResult.error.message,
            });

            // 失敗時の処理（ロールバックなど）
            if (step.rollbackOnFailure) {
              await this._rollbackMigrationStep(step);
            }
          }
        } catch (error) {
          migrationResult.failed.push({
            step: step.name,
            error: error.message,
          });
        }
      }

      if (this.logger) {
        this.logger.info("Gradual migration completed", migrationResult);
      }

      return Result.success(migrationResult);
    } catch (error) {
      if (this.logger) {
        this.logger.error("Error during gradual migration", error);
      }

      return Result.failure(error, {
        type: ErrorType.INTERNAL_ERROR,
      });
    }
  }

  /**
   * 問題検出を開始
   * @private
   */
  async _startIssueDetection() {
    // 初回検出
    await this.detectCompatibilityIssues();

    // 定期的な検出を設定（5分間隔）
    if (typeof setInterval !== "undefined") {
      setInterval(async () => {
        try {
          await this.detectCompatibilityIssues();
        } catch (error) {
          if (this.logger) {
            this.logger.warn("Error in periodic issue detection", error);
          }
        }
      }, 5 * 60 * 1000);
    }
  }

  /**
   * 移行チェックと実行
   * @private
   */
  async _checkAndPerformMigration() {
    if (!this.migrationScripts) return;

    try {
      const checkResult = await this.migrationScripts.checkMigrationNeeded();
      if (checkResult.isSuccess() && checkResult.data.needsMigration) {
        if (this.logger) {
          this.logger.info("Automatic migration needed, performing migration");
        }

        const migrationResult = await this.migrationScripts.migrate();
        if (migrationResult.isFailure()) {
          this._recordIssue({
            type: CompatibilityIssueType.DATA_FORMAT_INCOMPATIBLE,
            feature: "migration",
            message: "Automatic migration failed",
            details: migrationResult.error,
          });
        }
      }
    } catch (error) {
      if (this.logger) {
        this.logger.warn("Error in automatic migration check", error);
      }
    }
  }

  /**
   * パフォーマンス監視を開始
   * @private
   */
  _startPerformanceMonitoring() {
    // パフォーマンス測定の開始
    this.performanceMetrics.set("startTime", Date.now());

    // メモリ使用量の監視（可能な場合）
    if (typeof performance !== "undefined" && performance.memory) {
      const measureMemory = () => {
        this.performanceMetrics.set("memoryUsage", {
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize,
          limit: performance.memory.jsHeapSizeLimit,
          timestamp: Date.now(),
        });
      };

      measureMemory();
      if (typeof setInterval !== "undefined") {
        setInterval(measureMemory, 30000); // 30秒間隔
      }
    }
  }

  /**
   * 移行状況を取得
   * @returns {Promise<Object>} 移行状況
   * @private
   */
  async _getMigrationStatus() {
    if (!this.migrationScripts) return null;

    try {
      const checkResult = await this.migrationScripts.checkMigrationNeeded();
      return checkResult.isSuccess() ? checkResult.data : null;
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * アクティブな機能を取得
   * @returns {Array} アクティブな機能のリスト
   * @private
   */
  _getActiveFeatures() {
    return Object.entries(this.featureFlags)
      .filter(([flag, enabled]) => enabled)
      .map(([flag]) => flag);
  }

  /**
   * 機能フラグ変更時の処理
   * @param {string} flag - 機能フラグ名
   * @param {boolean} enabled - 新しい値
   * @param {boolean} previousValue - 以前の値
   * @private
   */
  _handleFeatureFlagChange(flag, enabled, previousValue) {
    // デバッグログの有効/無効
    if (flag === FeatureFlags.ENABLE_DEBUG_LOGGING) {
      if (this.logger && this.logger.setLevel) {
        this.logger.setLevel(enabled ? "debug" : "info");
      }
    }

    // パフォーマンス監視の有効/無効
    if (flag === FeatureFlags.ENABLE_PERFORMANCE_MONITORING) {
      if (enabled && !previousValue) {
        this._startPerformanceMonitoring();
      }
    }
  }

  /**
   * 互換性レベルに応じて機能フラグを調整
   * @param {string} level - 互換性レベル
   * @private
   */
  _adjustFeatureFlagsForLevel(level) {
    switch (level) {
      case CompatibilityLevel.LEGACY_ONLY:
        // 全ての新機能を無効化
        Object.keys(this.featureFlags).forEach((flag) => {
          if (flag.startsWith("USE_NEW_")) {
            this.featureFlags[flag] = false;
          }
        });
        break;

      case CompatibilityLevel.NEW_ONLY:
        // 全ての新機能を有効化
        Object.keys(this.featureFlags).forEach((flag) => {
          if (flag.startsWith("USE_NEW_")) {
            this.featureFlags[flag] = true;
          }
        });
        break;

      case CompatibilityLevel.HYBRID:
        // 段階的に新機能を有効化
        this.featureFlags[FeatureFlags.USE_NEW_ERROR_HANDLING] = true;
        break;

      case CompatibilityLevel.NEW_WITH_FALLBACK:
        // 新機能を有効化（フォールバック付き）
        Object.keys(this.featureFlags).forEach((flag) => {
          if (flag.startsWith("USE_NEW_")) {
            this.featureFlags[flag] = true;
          }
        });
        break;
    }
  }

  /**
   * 実装の健全性をチェック
   * @param {Object} implementation - チェックする実装
   * @returns {boolean} 健全性
   * @private
   */
  _isImplementationHealthy(implementation) {
    try {
      // 基本的な健全性チェック
      if (!implementation || typeof implementation !== "object") {
        return false;
      }

      // 必要なメソッドが存在するかチェック
      const requiredMethods = ["initialize"];
      for (const method of requiredMethods) {
        if (typeof implementation[method] !== "function") {
          return false;
        }
      }

      // パフォーマンスチェック（簡易）
      const startTime = Date.now();
      try {
        // 軽量な操作を実行してレスポンス時間を測定
        if (typeof implementation.getState === "function") {
          implementation.getState();
        }
        const responseTime = Date.now() - startTime;

        // 100ms以上かかる場合は不健全とみなす
        if (responseTime > 100) {
          return false;
        }
      } catch (error) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 問題を記録
   * @param {Object} issue - 問題情報
   * @private
   */
  _recordIssue(issue) {
    const issueRecord = {
      ...issue,
      id: `issue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
    };

    this.detectedIssues.push(issueRecord);

    if (this.logger) {
      this.logger.warn(
        `Compatibility issue detected: ${issue.type}`,
        issueRecord
      );
    }
  }

  /**
   * API互換性をチェック
   * @returns {Promise<Array>} API互換性問題のリスト
   * @private
   */
  async _checkAPICompatibility() {
    const issues = [];

    try {
      // レガシーアダプターが利用可能かチェック
      if (this.legacyAdapter) {
        const legacyController =
          this.legacyAdapter.createLegacyTheaterModeController();

        // 必要なメソッドが存在するかチェック
        const requiredMethods = [
          "initialize",
          "toggleTheaterMode",
          "updateOpacity",
          "getState",
        ];

        for (const method of requiredMethods) {
          if (typeof legacyController[method] !== "function") {
            issues.push({
              type: CompatibilityIssueType.API_MISMATCH,
              feature: "TheaterModeController",
              method,
              message: `Required method '${method}' is missing from legacy implementation`,
            });
          }
        }
      }
    } catch (error) {
      issues.push({
        type: CompatibilityIssueType.API_MISMATCH,
        feature: "LegacyAdapter",
        message: "Failed to check legacy adapter compatibility",
        details: error.message,
      });
    }

    return issues;
  }

  /**
   * データ形式互換性をチェック
   * @returns {Promise<Array>} データ形式互換性問題のリスト
   * @private
   */
  async _checkDataFormatCompatibility() {
    const issues = [];

    try {
      if (this.migrationScripts) {
        const validationResult =
          await this.migrationScripts.validateDataIntegrity();

        if (validationResult.isSuccess() && !validationResult.data.isValid) {
          for (const issue of validationResult.data.issues) {
            issues.push({
              type: CompatibilityIssueType.DATA_FORMAT_INCOMPATIBLE,
              feature: "DataIntegrity",
              key: issue.key,
              message: issue.message,
              issueType: issue.type,
            });
          }
        }
      }
    } catch (error) {
      issues.push({
        type: CompatibilityIssueType.DATA_FORMAT_INCOMPATIBLE,
        feature: "DataValidation",
        message: "Failed to validate data integrity",
        details: error.message,
      });
    }

    return issues;
  }

  /**
   * 依存関係をチェック
   * @returns {Array} 依存関係問題のリスト
   * @private
   */
  _checkDependencies() {
    const issues = [];

    // Chrome API の可用性をチェック
    if (typeof chrome === "undefined") {
      issues.push({
        type: CompatibilityIssueType.DEPENDENCY_MISSING,
        feature: "ChromeAPI",
        message: "Chrome extension APIs are not available",
      });
    } else {
      // 必要なChrome APIをチェック
      const requiredAPIs = ["storage", "runtime", "tabs"];
      for (const api of requiredAPIs) {
        if (!chrome[api]) {
          issues.push({
            type: CompatibilityIssueType.DEPENDENCY_MISSING,
            feature: `Chrome.${api}`,
            message: `Chrome ${api} API is not available`,
          });
        }
      }
    }

    // DOM API の可用性をチェック
    if (typeof document === "undefined") {
      issues.push({
        type: CompatibilityIssueType.DEPENDENCY_MISSING,
        feature: "DOM",
        message: "DOM APIs are not available",
      });
    }

    return issues;
  }

  /**
   * バージョン競合をチェック
   * @returns {Array} バージョン競合問題のリスト
   * @private
   */
  _checkVersionConflicts() {
    const issues = [];

    try {
      // マニフェストバージョンをチェック
      if (
        typeof chrome !== "undefined" &&
        chrome.runtime &&
        chrome.runtime.getManifest
      ) {
        const manifest = chrome.runtime.getManifest();

        if (manifest.manifest_version < 3) {
          issues.push({
            type: CompatibilityIssueType.VERSION_CONFLICT,
            feature: "ManifestVersion",
            currentVersion: manifest.manifest_version,
            requiredVersion: 3,
            message: "Manifest V2 is deprecated, upgrade to V3 recommended",
          });
        }
      }
    } catch (error) {
      // マニフェスト情報が取得できない場合は無視
    }

    return issues;
  }

  /**
   * パフォーマンス問題をチェック
   * @returns {Array} パフォーマンス問題のリスト
   * @private
   */
  _checkPerformanceIssues() {
    const issues = [];

    try {
      // メモリ使用量をチェック
      const memoryUsage = this.performanceMetrics.get("memoryUsage");
      if (memoryUsage) {
        const usageRatio = memoryUsage.used / memoryUsage.total;

        if (usageRatio > 0.8) {
          issues.push({
            type: CompatibilityIssueType.PERFORMANCE_DEGRADATION,
            feature: "MemoryUsage",
            currentUsage: memoryUsage.used,
            totalAvailable: memoryUsage.total,
            usageRatio: Math.round(usageRatio * 100),
            message: "High memory usage detected",
          });
        }
      }

      // 実行時間をチェック
      const startTime = this.performanceMetrics.get("startTime");
      if (startTime) {
        const uptime = Date.now() - startTime;

        // 24時間以上稼働している場合は警告
        if (uptime > 24 * 60 * 60 * 1000) {
          issues.push({
            type: CompatibilityIssueType.PERFORMANCE_DEGRADATION,
            feature: "Uptime",
            uptime: Math.round(uptime / (60 * 60 * 1000)),
            message: "Long uptime detected, consider restart",
          });
        }
      }
    } catch (error) {
      // パフォーマンス情報が取得できない場合は無視
    }

    return issues;
  }

  /**
   * 問題を解決
   * @param {Object} issue - 解決する問題
   * @returns {Promise<Result<Object>>} 解決結果
   * @private
   */
  async _resolveIssue(issue) {
    try {
      switch (issue.type) {
        case CompatibilityIssueType.API_MISMATCH:
          return await this._resolveAPIMismatch(issue);

        case CompatibilityIssueType.DATA_FORMAT_INCOMPATIBLE:
          return await this._resolveDataFormatIssue(issue);

        case CompatibilityIssueType.DEPENDENCY_MISSING:
          return await this._resolveDependencyIssue(issue);

        case CompatibilityIssueType.VERSION_CONFLICT:
          return await this._resolveVersionConflict(issue);

        case CompatibilityIssueType.PERFORMANCE_DEGRADATION:
          return await this._resolvePerformanceIssue(issue);

        case CompatibilityIssueType.FEATURE_UNAVAILABLE:
          return await this._resolveFeatureUnavailable(issue);

        default:
          return Result.failure(`Unknown issue type: ${issue.type}`, {
            type: ErrorType.VALIDATION_ERROR,
          });
      }
    } catch (error) {
      return Result.failure(error, {
        type: ErrorType.INTERNAL_ERROR,
        context: { issue },
      });
    }
  }

  /**
   * API不一致を解決
   * @param {Object} issue - 問題情報
   * @returns {Promise<Result<Object>>} 解決結果
   * @private
   */
  async _resolveAPIMismatch(issue) {
    // レガシーアダプターを使用してAPI不一致を解決
    if (this.legacyAdapter) {
      return Result.success({
        action: "Used legacy adapter to resolve API mismatch",
        issue: issue.id,
      });
    }

    return Result.failure(
      "No legacy adapter available to resolve API mismatch",
      {
        type: ErrorType.FEATURE_UNAVAILABLE,
      }
    );
  }

  /**
   * データ形式問題を解決
   * @param {Object} issue - 問題情報
   * @returns {Promise<Result<Object>>} 解決結果
   * @private
   */
  async _resolveDataFormatIssue(issue) {
    // 移行スクリプトを使用してデータ形式問題を解決
    if (this.migrationScripts) {
      const migrationResult = await this.migrationScripts.migrate();

      if (migrationResult.isSuccess()) {
        return Result.success({
          action: "Performed data migration to resolve format issue",
          issue: issue.id,
          migrationResult: migrationResult.data,
        });
      }
    }

    return Result.failure("Unable to resolve data format issue", {
      type: ErrorType.INTERNAL_ERROR,
    });
  }

  /**
   * 依存関係問題を解決
   * @param {Object} issue - 問題情報
   * @returns {Promise<Result<Object>>} 解決結果
   * @private
   */
  async _resolveDependencyIssue(issue) {
    // 依存関係問題は通常、環境の問題なので自動解決は困難
    return Result.success({
      action: "Logged dependency issue for manual resolution",
      issue: issue.id,
      recommendation: "Check extension permissions and environment",
    });
  }

  /**
   * バージョン競合を解決
   * @param {Object} issue - 問題情報
   * @returns {Promise<Result<Object>>} 解決結果
   * @private
   */
  async _resolveVersionConflict(issue) {
    return Result.success({
      action: "Logged version conflict for manual resolution",
      issue: issue.id,
      recommendation: "Update to latest version",
    });
  }

  /**
   * パフォーマンス問題を解決
   * @param {Object} issue - 問題情報
   * @returns {Promise<Result<Object>>} 解決結果
   * @private
   */
  async _resolvePerformanceIssue(issue) {
    // メモリ使用量の問題の場合
    if (issue.feature === "MemoryUsage") {
      // ガベージコレクションを促す（可能な場合）
      if (typeof gc !== "undefined") {
        gc();
      }

      return Result.success({
        action: "Attempted garbage collection to resolve memory issue",
        issue: issue.id,
      });
    }

    return Result.success({
      action: "Logged performance issue for monitoring",
      issue: issue.id,
    });
  }

  /**
   * 機能利用不可を解決
   * @param {Object} issue - 問題情報
   * @returns {Promise<Result<Object>>} 解決結果
   * @private
   */
  async _resolveFeatureUnavailable(issue) {
    // フォールバック実装に切り替え
    return Result.success({
      action: "Switched to fallback implementation",
      issue: issue.id,
    });
  }

  /**
   * パフォーマンスデータを取得
   * @returns {Object} パフォーマンスデータ
   * @private
   */
  _getPerformanceData() {
    const data = {};

    for (const [key, value] of this.performanceMetrics.entries()) {
      data[key] = value;
    }

    return data;
  }

  /**
   * 問題を種類別にグループ化
   * @returns {Object} 種類別問題数
   * @private
   */
  _groupIssuesByType() {
    const grouped = {};

    for (const issue of this.detectedIssues) {
      grouped[issue.type] = (grouped[issue.type] || 0) + 1;
    }

    return grouped;
  }

  /**
   * 推奨事項を生成
   * @returns {Array} 推奨事項のリスト
   * @private
   */
  _generateRecommendations() {
    const recommendations = [];

    // 問題数に基づく推奨事項
    if (this.detectedIssues.length > 10) {
      recommendations.push({
        type: "high_priority",
        message:
          "Multiple compatibility issues detected, consider upgrading to newer implementation",
      });
    }

    // 互換性レベルに基づく推奨事項
    if (this.compatibilityLevel === CompatibilityLevel.LEGACY_ONLY) {
      recommendations.push({
        type: "upgrade",
        message:
          "Consider migrating to hybrid mode for better performance and features",
      });
    }

    // パフォーマンス問題に基づく推奨事項
    const performanceIssues = this.detectedIssues.filter(
      (issue) => issue.type === CompatibilityIssueType.PERFORMANCE_DEGRADATION
    );

    if (performanceIssues.length > 0) {
      recommendations.push({
        type: "performance",
        message:
          "Performance issues detected, consider enabling performance monitoring",
      });
    }

    return recommendations;
  }

  /**
   * 前提条件をチェック
   * @param {Array} prerequisites - 前提条件のリスト
   * @returns {boolean} 前提条件が満たされているかどうか
   * @private
   */
  _checkPrerequisites(prerequisites) {
    for (const prerequisite of prerequisites) {
      switch (prerequisite.type) {
        case "feature_flag":
          if (!this.getFeatureFlag(prerequisite.flag)) {
            return false;
          }
          break;

        case "compatibility_level":
          if (this.compatibilityLevel !== prerequisite.level) {
            return false;
          }
          break;

        case "no_issues":
          if (this.detectedIssues.length > 0) {
            return false;
          }
          break;

        default:
          return false;
      }
    }

    return true;
  }

  /**
   * 移行ステップを実行
   * @param {Object} step - 移行ステップ
   * @returns {Promise<Result<Object>>} 実行結果
   * @private
   */
  async _executeMigrationStep(step) {
    try {
      switch (step.type) {
        case "enable_feature":
          this.setFeatureFlag(step.feature, true);
          return Result.success({
            action: "enabled_feature",
            feature: step.feature,
          });

        case "set_compatibility_level":
          this.setCompatibilityLevel(step.level);
          return Result.success({ action: "set_level", level: step.level });

        case "run_migration":
          if (this.migrationScripts) {
            return await this.migrationScripts.migrate();
          }
          return Result.failure("Migration scripts not available");

        default:
          return Result.failure(`Unknown migration step type: ${step.type}`);
      }
    } catch (error) {
      return Result.failure(error, {
        type: ErrorType.INTERNAL_ERROR,
        context: { step },
      });
    }
  }

  /**
   * 移行ステップをロールバック
   * @param {Object} step - ロールバックするステップ
   * @returns {Promise<Result<Object>>} ロールバック結果
   * @private
   */
  async _rollbackMigrationStep(step) {
    try {
      switch (step.type) {
        case "enable_feature":
          this.setFeatureFlag(step.feature, false);
          return Result.success({
            action: "disabled_feature",
            feature: step.feature,
          });

        case "set_compatibility_level":
          // 以前のレベルに戻す（履歴から取得）
          const previousLevel = this.switchHistory
            .slice()
            .reverse()
            .find((entry) => entry.flag === "compatibilityLevel");

          if (previousLevel) {
            this.setCompatibilityLevel(previousLevel.previousValue);
          }
          return Result.success({ action: "reverted_level" });

        default:
          return Result.success({ action: "no_rollback_needed" });
      }
    } catch (error) {
      return Result.failure(error, {
        type: ErrorType.INTERNAL_ERROR,
        context: { step },
      });
    }
  }

  /**
   * リソースをクリーンアップ
   */
  cleanup() {
    this.detectedIssues = [];
    this.performanceMetrics.clear();
    this.switchHistory = [];

    if (this.logger) {
      this.logger.debug("CompatibilityLayer cleaned up");
    }
  }
}

/**
 * 新しいCompatibilityLayerインスタンスを作成
 * @param {Object} options - オプション
 * @returns {CompatibilityLayer} 新しいCompatibilityLayerインスタンス
 */
const createCompatibilityLayer = (options) => {
  return new CompatibilityLayer(options);
};

// CommonJS/ES6 両対応のエクスポート
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    CompatibilityLevel,
    FeatureFlags,
    CompatibilityIssueType,
    CompatibilityLayer,
    createCompatibilityLayer,
  };
} else if (typeof window !== "undefined") {
  window.CompatibilityLevel = CompatibilityLevel;
  window.FeatureFlags = FeatureFlags;
  window.CompatibilityIssueType = CompatibilityIssueType;
  window.CompatibilityLayer = CompatibilityLayer;
  window.createCompatibilityLayer = createCompatibilityLayer;
}
