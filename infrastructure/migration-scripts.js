/**
 * Migration Scripts
 * 設定データの移行スクリプトを提供
 * ユーザーデータの整合性チェック機能とロールバック機能を実装
 */

// 依存関係のインポート
let Logger,
  ErrorHandler,
  Result,
  AppError,
  ErrorType,
  StorageAdapter,
  StorageType;

// Node.js環境での依存関係の解決
if (typeof require !== "undefined") {
  ({ Logger } = require("./logger.js"));
  ({
    ErrorHandler,
    Result,
    AppError,
    ErrorType,
  } = require("./error-handler.js"));
  ({ StorageAdapter, StorageType } = require("./storage-adapter.js"));
}

/**
 * 移行バージョン定義
 * 各バージョンの移行処理を定義
 */
const MIGRATION_VERSIONS = [
  {
    version: "1.0.0",
    description: "初期バージョン",
    legacyKeys: ["theaterModeSettings"],
    newKeys: ["settings"],
    migrate: null, // 初期バージョンなので移行処理なし
  },
  {
    version: "1.1.0",
    description: "設定構造の統一化",
    legacyKeys: ["theaterModeSettings"],
    newKeys: ["settings"],
    migrate: (oldData) => {
      // レガシー形式から新形式への変換
      const legacySettings = oldData.theaterModeSettings || {};

      return {
        settings: {
          theaterModeEnabled: legacySettings.isEnabled || false,
          opacity: legacySettings.opacity || 0.7,
          keyboardShortcut:
            extractShortcutKey(legacySettings.shortcutKey) || "t",
          theme: "auto", // 新機能のデフォルト値
          autoEnable: false, // 新機能のデフォルト値
          version: "1.1.0",
          lastUsed: legacySettings.lastUsed || null,
        },
      };
    },
  },
  {
    version: "1.2.0",
    description: "テーマ設定とオートイネーブル機能の追加",
    legacyKeys: ["settings"],
    newKeys: ["settings"],
    migrate: (oldData) => {
      const oldSettings = oldData.settings || {};

      return {
        settings: {
          ...oldSettings,
          theme: oldSettings.theme || "auto",
          autoEnable: oldSettings.autoEnable || false,
          version: "1.2.0",
        },
      };
    },
  },
];

/**
 * ショートカットキーを抽出するヘルパー関数
 * @param {string} shortcutKey - レガシー形式のショートカットキー
 * @returns {string} 抽出されたキー
 */
function extractShortcutKey(shortcutKey) {
  if (!shortcutKey || typeof shortcutKey !== "string") {
    return "t";
  }

  // "Ctrl+Shift+T" -> "t" に変換
  const match = shortcutKey.match(/Ctrl\+Shift\+(.)/i);
  if (match) {
    return match[1].toLowerCase();
  }

  // 単一文字の場合はそのまま返す
  if (shortcutKey.length === 1) {
    return shortcutKey.toLowerCase();
  }

  return "t"; // デフォルト
}

/**
 * 現在の最新バージョン
 */
const CURRENT_VERSION =
  MIGRATION_VERSIONS[MIGRATION_VERSIONS.length - 1].version;

/**
 * 移行スクリプト管理クラス
 */
class MigrationScripts {
  /**
   * MigrationScriptsインスタンスを作成
   * @param {Object} options - オプション
   * @param {StorageAdapter} options.storageAdapter - ストレージアダプター
   * @param {Object} [options.logger] - ロガーインスタンス
   * @param {Object} [options.errorHandler] - エラーハンドラーインスタンス
   * @param {boolean} [options.dryRun=false] - ドライランモード
   * @param {boolean} [options.createBackup=true] - バックアップ作成フラグ
   */
  constructor(options) {
    if (!options || !options.storageAdapter) {
      throw new Error("StorageAdapter is required");
    }

    this.storageAdapter = options.storageAdapter;
    this.logger = options.logger;
    this.errorHandler = options.errorHandler;
    this.dryRun = options.dryRun || false;
    this.createBackup = options.createBackup !== false;

    // 移行履歴の保存キー
    this.migrationHistoryKey = "migrationHistory";
    this.backupKeyPrefix = "backup_";

    if (this.logger) {
      this.logger.debug("MigrationScripts initialized", {
        dryRun: this.dryRun,
        createBackup: this.createBackup,
      });
    }
  }

  /**
   * 移行が必要かどうかをチェック
   * @returns {Promise<Result<Object>>} 移行情報
   */
  async checkMigrationNeeded() {
    try {
      if (this.logger) {
        this.logger.debug("Checking if migration is needed");
      }

      // 現在のデータを取得
      const currentData = await this._getAllStorageData();
      if (currentData.isFailure()) {
        return currentData;
      }

      const data = currentData.data;

      // 現在のバージョンを特定
      const currentVersion = this._detectCurrentVersion(data);
      const needsMigration = currentVersion !== CURRENT_VERSION;

      // 移行履歴を取得
      const historyResult = await this._getMigrationHistory();
      const history = historyResult.isSuccess() ? historyResult.data : [];

      const migrationInfo = {
        needsMigration,
        currentVersion,
        targetVersion: CURRENT_VERSION,
        availableVersions: MIGRATION_VERSIONS.map((v) => v.version),
        migrationHistory: history,
        dataKeys: Object.keys(data),
        estimatedSteps: needsMigration
          ? this._calculateMigrationSteps(currentVersion)
          : 0,
      };

      if (this.logger) {
        this.logger.info("Migration check completed", migrationInfo);
      }

      return Result.success(migrationInfo);
    } catch (error) {
      if (this.logger) {
        this.logger.error("Error checking migration status", error);
      }

      return Result.failure(error, {
        type: ErrorType.INTERNAL_ERROR,
      });
    }
  }

  /**
   * データ移行を実行
   * @param {Object} [options] - 移行オプション
   * @param {string} [options.targetVersion] - 移行先バージョン
   * @param {boolean} [options.force=false] - 強制実行フラグ
   * @returns {Promise<Result<Object>>} 移行結果
   */
  async migrate(options = {}) {
    try {
      const targetVersion = options.targetVersion || CURRENT_VERSION;
      const force = options.force || false;

      if (this.logger) {
        this.logger.info("Starting data migration", {
          targetVersion,
          force,
          dryRun: this.dryRun,
        });
      }

      // 移行チェック
      const checkResult = await this.checkMigrationNeeded();
      if (checkResult.isFailure()) {
        return checkResult;
      }

      const migrationInfo = checkResult.data;

      if (!migrationInfo.needsMigration && !force) {
        if (this.logger) {
          this.logger.info("No migration needed");
        }
        return Result.success({
          migrated: false,
          message: "No migration needed",
          currentVersion: migrationInfo.currentVersion,
        });
      }

      // 現在のデータを取得
      const currentDataResult = await this._getAllStorageData();
      if (currentDataResult.isFailure()) {
        return currentDataResult;
      }

      const currentData = currentDataResult.data;

      // バックアップを作成
      let backupKey = null;
      if (this.createBackup && !this.dryRun) {
        const backupResult = await this._createBackup(currentData);
        if (backupResult.isFailure()) {
          return backupResult;
        }
        backupKey = backupResult.data;
      }

      // 移行を実行
      const migrationResult = await this._executeMigration(
        currentData,
        migrationInfo.currentVersion,
        targetVersion
      );

      if (migrationResult.isFailure()) {
        // 移行失敗時はバックアップから復元
        if (backupKey && !this.dryRun) {
          await this._restoreFromBackup(backupKey);
        }
        return migrationResult;
      }

      const migratedData = migrationResult.data;

      // ドライランでない場合は実際にデータを保存
      if (!this.dryRun) {
        const saveResult = await this._saveAllData(migratedData);
        if (saveResult.isFailure()) {
          // 保存失敗時はバックアップから復元
          if (backupKey) {
            await this._restoreFromBackup(backupKey);
          }
          return saveResult;
        }

        // 移行履歴を記録
        await this._recordMigrationHistory({
          fromVersion: migrationInfo.currentVersion,
          toVersion: targetVersion,
          timestamp: new Date().toISOString(),
          backupKey,
          success: true,
        });
      }

      const result = {
        migrated: true,
        fromVersion: migrationInfo.currentVersion,
        toVersion: targetVersion,
        backupKey,
        dryRun: this.dryRun,
        changes: this._calculateChanges(currentData, migratedData),
      };

      if (this.logger) {
        this.logger.info("Migration completed successfully", result);
      }

      return Result.success(result);
    } catch (error) {
      if (this.logger) {
        this.logger.error("Migration failed", error);
      }

      if (this.errorHandler) {
        this.errorHandler.handleError(error, {
          context: { operation: "migrate", options },
          type: ErrorType.INTERNAL_ERROR,
        });
      }

      return Result.failure(error, {
        type: ErrorType.INTERNAL_ERROR,
      });
    }
  }

  /**
   * データの整合性をチェック
   * @returns {Promise<Result<Object>>} 整合性チェック結果
   */
  async validateDataIntegrity() {
    try {
      if (this.logger) {
        this.logger.debug("Validating data integrity");
      }

      const currentDataResult = await this._getAllStorageData();
      if (currentDataResult.isFailure()) {
        return currentDataResult;
      }

      const data = currentDataResult.data;
      const issues = [];

      // 設定データの検証
      if (data.settings) {
        const settingsIssues = this._validateSettings(data.settings);
        issues.push(...settingsIssues);
      }

      // レガシーデータの検証
      if (data.theaterModeSettings) {
        const legacyIssues = this._validateLegacySettings(
          data.theaterModeSettings
        );
        issues.push(...legacyIssues);
      }

      // 重複データの検証
      const duplicateIssues = this._checkForDuplicateData(data);
      issues.push(...duplicateIssues);

      // 孤立データの検証
      const orphanedIssues = this._checkForOrphanedData(data);
      issues.push(...orphanedIssues);

      const result = {
        isValid: issues.length === 0,
        issues,
        dataKeys: Object.keys(data),
        totalSize: JSON.stringify(data).length,
      };

      if (this.logger) {
        this.logger.info("Data integrity validation completed", {
          isValid: result.isValid,
          issueCount: issues.length,
        });
      }

      return Result.success(result);
    } catch (error) {
      if (this.logger) {
        this.logger.error("Error validating data integrity", error);
      }

      return Result.failure(error, {
        type: ErrorType.INTERNAL_ERROR,
      });
    }
  }

  /**
   * バックアップから復元
   * @param {string} backupKey - バックアップキー
   * @returns {Promise<Result<boolean>>} 復元結果
   */
  async restoreFromBackup(backupKey) {
    try {
      if (this.logger) {
        this.logger.info("Restoring from backup", { backupKey });
      }

      return await this._restoreFromBackup(backupKey);
    } catch (error) {
      if (this.logger) {
        this.logger.error("Error restoring from backup", error);
      }

      return Result.failure(error, {
        type: ErrorType.INTERNAL_ERROR,
      });
    }
  }

  /**
   * 利用可能なバックアップを取得
   * @returns {Promise<Result<Array>>} バックアップリスト
   */
  async getAvailableBackups() {
    try {
      if (this.logger) {
        this.logger.debug("Getting available backups");
      }

      const allKeysResult = await this.storageAdapter.getAllKeys();
      if (allKeysResult.isFailure()) {
        return allKeysResult;
      }

      const allKeys = allKeysResult.data;
      const backupKeys = allKeys.filter((key) =>
        key.startsWith(this.backupKeyPrefix)
      );

      const backups = [];
      for (const key of backupKeys) {
        const backupResult = await this.storageAdapter.get(key);
        if (backupResult.isSuccess()) {
          const backup = backupResult.data;
          backups.push({
            key,
            timestamp: backup.timestamp,
            version: backup.version,
            size: JSON.stringify(backup.data).length,
          });
        }
      }

      // タイムスタンプでソート（新しい順）
      backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      return Result.success(backups);
    } catch (error) {
      if (this.logger) {
        this.logger.error("Error getting available backups", error);
      }

      return Result.failure(error, {
        type: ErrorType.INTERNAL_ERROR,
      });
    }
  }

  /**
   * 移行履歴を取得
   * @returns {Promise<Result<Array>>} 移行履歴
   */
  async getMigrationHistory() {
    return await this._getMigrationHistory();
  }

  /**
   * 古いバックアップを削除
   * @param {number} [keepCount=5] - 保持するバックアップ数
   * @returns {Promise<Result<number>>} 削除されたバックアップ数
   */
  async cleanupOldBackups(keepCount = 5) {
    try {
      if (this.logger) {
        this.logger.debug("Cleaning up old backups", { keepCount });
      }

      const backupsResult = await this.getAvailableBackups();
      if (backupsResult.isFailure()) {
        return backupsResult;
      }

      const backups = backupsResult.data;
      const toDelete = backups.slice(keepCount);

      let deletedCount = 0;
      for (const backup of toDelete) {
        const deleteResult = await this.storageAdapter.remove(backup.key);
        if (deleteResult.isSuccess()) {
          deletedCount++;
        }
      }

      if (this.logger) {
        this.logger.info("Backup cleanup completed", {
          totalBackups: backups.length,
          deletedCount,
          remainingCount: backups.length - deletedCount,
        });
      }

      return Result.success(deletedCount);
    } catch (error) {
      if (this.logger) {
        this.logger.error("Error cleaning up backups", error);
      }

      return Result.failure(error, {
        type: ErrorType.INTERNAL_ERROR,
      });
    }
  }

  /**
   * 全ストレージデータを取得
   * @returns {Promise<Result<Object>>} 全データ
   * @private
   */
  async _getAllStorageData() {
    const allKeysResult = await this.storageAdapter.getAllKeys();
    if (allKeysResult.isFailure()) {
      return allKeysResult;
    }

    const keys = allKeysResult.data.filter(
      (key) =>
        !key.startsWith(this.backupKeyPrefix) &&
        key !== this.migrationHistoryKey
    );

    const data = {};
    for (const key of keys) {
      const result = await this.storageAdapter.get(key);
      if (result.isSuccess()) {
        data[key] = result.data;
      }
    }

    return Result.success(data);
  }

  /**
   * 現在のバージョンを検出
   * @param {Object} data - ストレージデータ
   * @returns {string} 検出されたバージョン
   * @private
   */
  _detectCurrentVersion(data) {
    // 新形式の設定にバージョンがある場合
    if (data.settings && data.settings.version) {
      return data.settings.version;
    }

    // レガシー形式の設定がある場合
    if (data.theaterModeSettings) {
      return data.theaterModeSettings.version || "1.0.0";
    }

    // データが存在しない場合は最新バージョン
    if (Object.keys(data).length === 0) {
      return CURRENT_VERSION;
    }

    // デフォルトは初期バージョン
    return "1.0.0";
  }

  /**
   * 移行ステップ数を計算
   * @param {string} currentVersion - 現在のバージョン
   * @returns {number} 移行ステップ数
   * @private
   */
  _calculateMigrationSteps(currentVersion) {
    const currentIndex = MIGRATION_VERSIONS.findIndex(
      (v) => v.version === currentVersion
    );
    if (currentIndex === -1) return MIGRATION_VERSIONS.length;

    return MIGRATION_VERSIONS.length - currentIndex - 1;
  }

  /**
   * 移行を実行
   * @param {Object} data - 現在のデータ
   * @param {string} fromVersion - 移行元バージョン
   * @param {string} toVersion - 移行先バージョン
   * @returns {Promise<Result<Object>>} 移行されたデータ
   * @private
   */
  async _executeMigration(data, fromVersion, toVersion) {
    let currentData = { ...data };
    let currentVersion = fromVersion;

    const fromIndex = MIGRATION_VERSIONS.findIndex(
      (v) => v.version === fromVersion
    );
    const toIndex = MIGRATION_VERSIONS.findIndex(
      (v) => v.version === toVersion
    );

    if (fromIndex === -1 || toIndex === -1) {
      return Result.failure("Invalid version specified", {
        type: ErrorType.VALIDATION_ERROR,
      });
    }

    // 順次移行を実行
    for (let i = fromIndex + 1; i <= toIndex; i++) {
      const migration = MIGRATION_VERSIONS[i];

      if (migration.migrate && typeof migration.migrate === "function") {
        if (this.logger) {
          this.logger.debug(`Executing migration to ${migration.version}`, {
            description: migration.description,
          });
        }

        try {
          const migratedData = migration.migrate(currentData);
          currentData = { ...currentData, ...migratedData };
          currentVersion = migration.version;

          if (this.logger) {
            this.logger.debug(`Migration to ${migration.version} completed`);
          }
        } catch (error) {
          if (this.logger) {
            this.logger.error(
              `Migration to ${migration.version} failed`,
              error
            );
          }

          return Result.failure(error, {
            type: ErrorType.INTERNAL_ERROR,
            context: { migrationVersion: migration.version },
          });
        }
      }
    }

    return Result.success(currentData);
  }

  /**
   * バックアップを作成
   * @param {Object} data - バックアップするデータ
   * @returns {Promise<Result<string>>} バックアップキー
   * @private
   */
  async _createBackup(data) {
    const timestamp = new Date().toISOString();
    const backupKey = `${this.backupKeyPrefix}${timestamp.replace(
      /[:.]/g,
      "_"
    )}`;

    const backup = {
      timestamp,
      version: this._detectCurrentVersion(data),
      data,
    };

    const result = await this.storageAdapter.set(backupKey, backup);
    if (result.isFailure()) {
      return result;
    }

    if (this.logger) {
      this.logger.debug("Backup created", { backupKey, timestamp });
    }

    return Result.success(backupKey);
  }

  /**
   * バックアップから復元
   * @param {string} backupKey - バックアップキー
   * @returns {Promise<Result<boolean>>} 復元結果
   * @private
   */
  async _restoreFromBackup(backupKey) {
    const backupResult = await this.storageAdapter.get(backupKey);
    if (backupResult.isFailure()) {
      return backupResult;
    }

    const backup = backupResult.data;
    const saveResult = await this._saveAllData(backup.data);

    if (saveResult.isSuccess() && this.logger) {
      this.logger.info("Restored from backup", {
        backupKey,
        version: backup.version,
        timestamp: backup.timestamp,
      });
    }

    return saveResult;
  }

  /**
   * 全データを保存
   * @param {Object} data - 保存するデータ
   * @returns {Promise<Result<boolean>>} 保存結果
   * @private
   */
  async _saveAllData(data) {
    for (const [key, value] of Object.entries(data)) {
      const result = await this.storageAdapter.set(key, value);
      if (result.isFailure()) {
        return result;
      }
    }

    return Result.success(true);
  }

  /**
   * 移行履歴を記録
   * @param {Object} record - 移行記録
   * @returns {Promise<Result<boolean>>} 記録結果
   * @private
   */
  async _recordMigrationHistory(record) {
    const historyResult = await this._getMigrationHistory();
    const history = historyResult.isSuccess() ? historyResult.data : [];

    history.push(record);

    // 履歴は最大50件まで保持
    if (history.length > 50) {
      history.splice(0, history.length - 50);
    }

    return await this.storageAdapter.set(this.migrationHistoryKey, history);
  }

  /**
   * 移行履歴を取得
   * @returns {Promise<Result<Array>>} 移行履歴
   * @private
   */
  async _getMigrationHistory() {
    const result = await this.storageAdapter.get(this.migrationHistoryKey, {
      defaultValue: [],
    });

    return result;
  }

  /**
   * 変更内容を計算
   * @param {Object} oldData - 変更前のデータ
   * @param {Object} newData - 変更後のデータ
   * @returns {Object} 変更内容
   * @private
   */
  _calculateChanges(oldData, newData) {
    const changes = {
      added: [],
      removed: [],
      modified: [],
    };

    const oldKeys = new Set(Object.keys(oldData));
    const newKeys = new Set(Object.keys(newData));

    // 追加されたキー
    for (const key of newKeys) {
      if (!oldKeys.has(key)) {
        changes.added.push(key);
      }
    }

    // 削除されたキー
    for (const key of oldKeys) {
      if (!newKeys.has(key)) {
        changes.removed.push(key);
      }
    }

    // 変更されたキー
    for (const key of oldKeys) {
      if (newKeys.has(key)) {
        const oldValue = JSON.stringify(oldData[key]);
        const newValue = JSON.stringify(newData[key]);
        if (oldValue !== newValue) {
          changes.modified.push(key);
        }
      }
    }

    return changes;
  }

  /**
   * 設定データを検証
   * @param {Object} settings - 設定データ
   * @returns {Array} 問題のリスト
   * @private
   */
  _validateSettings(settings) {
    const issues = [];

    if (typeof settings !== "object" || settings === null) {
      issues.push({
        type: "invalid_type",
        key: "settings",
        message: "Settings must be an object",
      });
      return issues;
    }

    // 必須フィールドのチェック
    const requiredFields = [
      "theaterModeEnabled",
      "opacity",
      "keyboardShortcut",
    ];
    for (const field of requiredFields) {
      if (!(field in settings)) {
        issues.push({
          type: "missing_field",
          key: `settings.${field}`,
          message: `Required field '${field}' is missing`,
        });
      }
    }

    // 型チェック
    if (
      "theaterModeEnabled" in settings &&
      typeof settings.theaterModeEnabled !== "boolean"
    ) {
      issues.push({
        type: "invalid_type",
        key: "settings.theaterModeEnabled",
        message: "theaterModeEnabled must be a boolean",
      });
    }

    if ("opacity" in settings) {
      if (
        typeof settings.opacity !== "number" ||
        settings.opacity < 0 ||
        settings.opacity > 0.9
      ) {
        issues.push({
          type: "invalid_value",
          key: "settings.opacity",
          message: "opacity must be a number between 0 and 0.9",
        });
      }
    }

    if ("keyboardShortcut" in settings) {
      if (
        typeof settings.keyboardShortcut !== "string" ||
        settings.keyboardShortcut.length !== 1
      ) {
        issues.push({
          type: "invalid_value",
          key: "settings.keyboardShortcut",
          message: "keyboardShortcut must be a single character string",
        });
      }
    }

    return issues;
  }

  /**
   * レガシー設定データを検証
   * @param {Object} legacySettings - レガシー設定データ
   * @returns {Array} 問題のリスト
   * @private
   */
  _validateLegacySettings(legacySettings) {
    const issues = [];

    if (typeof legacySettings !== "object" || legacySettings === null) {
      issues.push({
        type: "invalid_type",
        key: "theaterModeSettings",
        message: "Legacy settings must be an object",
      });
      return issues;
    }

    // レガシー形式の検証
    if (
      "isEnabled" in legacySettings &&
      typeof legacySettings.isEnabled !== "boolean"
    ) {
      issues.push({
        type: "invalid_type",
        key: "theaterModeSettings.isEnabled",
        message: "isEnabled must be a boolean",
      });
    }

    if ("opacity" in legacySettings) {
      if (
        typeof legacySettings.opacity !== "number" ||
        legacySettings.opacity < 0 ||
        legacySettings.opacity > 0.9
      ) {
        issues.push({
          type: "invalid_value",
          key: "theaterModeSettings.opacity",
          message: "opacity must be a number between 0 and 0.9",
        });
      }
    }

    return issues;
  }

  /**
   * 重複データをチェック
   * @param {Object} data - チェック対象データ
   * @returns {Array} 問題のリスト
   * @private
   */
  _checkForDuplicateData(data) {
    const issues = [];

    // 新旧両方の設定が存在する場合
    if (data.settings && data.theaterModeSettings) {
      issues.push({
        type: "duplicate_data",
        key: "settings/theaterModeSettings",
        message: "Both new and legacy settings exist",
      });
    }

    return issues;
  }

  /**
   * 孤立データをチェック
   * @param {Object} data - チェック対象データ
   * @returns {Array} 問題のリスト
   * @private
   */
  _checkForOrphanedData(data) {
    const issues = [];

    // 認識されないキーをチェック
    const knownKeys = ["settings", "theaterModeSettings"];
    for (const key of Object.keys(data)) {
      if (!knownKeys.includes(key)) {
        issues.push({
          type: "orphaned_data",
          key,
          message: `Unknown data key '${key}' found`,
        });
      }
    }

    return issues;
  }
}

/**
 * 新しいMigrationScriptsインスタンスを作成
 * @param {Object} options - オプション
 * @returns {MigrationScripts} 新しいMigrationScriptsインスタンス
 */
const createMigrationScripts = (options) => {
  return new MigrationScripts(options);
};

// CommonJS/ES6 両対応のエクスポート
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    MIGRATION_VERSIONS,
    CURRENT_VERSION,
    MigrationScripts,
    createMigrationScripts,
  };
} else if (typeof window !== "undefined") {
  window.MIGRATION_VERSIONS = MIGRATION_VERSIONS;
  window.CURRENT_VERSION = CURRENT_VERSION;
  window.MigrationScripts = MigrationScripts;
  window.createMigrationScripts = createMigrationScripts;
}
