/**
 * Migration Scripts テストスイート
 * 設定データの移行スクリプトをテスト
 */

// テストフレームワークの読み込み
if (typeof require !== "undefined") {
  // Node.js環境
  const { TestFramework } = require("../infrastructure/test-framework.js");
  const { MockFactory } = require("../infrastructure/mock-factory.js");
  const {
    MigrationScripts,
    MIGRATION_VERSIONS,
    CURRENT_VERSION,
  } = require("../infrastructure/migration-scripts.js");
} else {
  // ブラウザ環境では、これらは既にグローバルに読み込まれている前提
}

/**
 * MigrationScriptsテストクラス
 */
class MigrationScriptsTest {
  constructor() {
    this.testFramework = new TestFramework("MigrationScripts");
    this.mockFactory = new MockFactory();
    this.migrationScripts = null;
    this.mockStorageAdapter = null;
  }

  /**
   * テストセットアップ
   */
  async setup() {
    // モックストレージアダプターを作成
    this.mockStorageAdapter = this.mockFactory.createMockStorageAdapter();

    // MigrationScriptsインスタンスを作成
    this.migrationScripts = new MigrationScripts({
      storageAdapter: this.mockStorageAdapter,
      logger: this.mockFactory.createMockLogger(),
      errorHandler: this.mockFactory.createMockErrorHandler(),
      dryRun: false,
      createBackup: true,
    });
  }

  /**
   * テストクリーンアップ
   */
  async teardown() {
    this.migrationScripts = null;
    this.mockStorageAdapter = null;
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
            this.migrationScripts !== null,
            "MigrationScripts should be created"
          );
        }
      );

      this.testFramework.it(
        "should throw error without storage adapter",
        () => {
          let errorThrown = false;
          try {
            new MigrationScripts({});
          } catch (error) {
            errorThrown = true;
          }

          this.testFramework.assert(
            errorThrown,
            "Should throw error when StorageAdapter is not provided"
          );
        }
      );

      this.testFramework.it("should have correct migration versions", () => {
        this.testFramework.assert(
          Array.isArray(MIGRATION_VERSIONS),
          "MIGRATION_VERSIONS should be an array"
        );

        this.testFramework.assert(
          MIGRATION_VERSIONS.length > 0,
          "Should have at least one migration version"
        );

        this.testFramework.assert(
          typeof CURRENT_VERSION === "string",
          "CURRENT_VERSION should be a string"
        );
      });
    });
  }

  /**
   * 移行チェックテスト
   */
  async testMigrationCheck() {
    this.testFramework.describe("Migration Check", () => {
      this.testFramework.it(
        "should detect no migration needed for current version",
        async () => {
          // 現在のバージョンのデータをモック
          this.mockStorageAdapter.getAllKeys.mockResolvedValue({
            isSuccess: () => true,
            data: ["settings"],
          });

          this.mockStorageAdapter.get.mockImplementation((key) => {
            if (key === "settings") {
              return Promise.resolve({
                isSuccess: () => true,
                data: {
                  theaterModeEnabled: true,
                  opacity: 0.7,
                  keyboardShortcut: "t",
                  version: CURRENT_VERSION,
                },
              });
            }
            return Promise.resolve({
              isSuccess: () => false,
              data: null,
            });
          });

          const result = await this.migrationScripts.checkMigrationNeeded();

          this.testFramework.assert(result.isSuccess(), "Check should succeed");

          const migrationInfo = result.data;
          this.testFramework.assert(
            migrationInfo.needsMigration === false,
            "Should not need migration for current version"
          );

          this.testFramework.assert(
            migrationInfo.currentVersion === CURRENT_VERSION,
            "Should detect current version correctly"
          );
        }
      );

      this.testFramework.it(
        "should detect migration needed for legacy data",
        async () => {
          // レガシーデータをモック
          this.mockStorageAdapter.getAllKeys.mockResolvedValue({
            isSuccess: () => true,
            data: ["theaterModeSettings"],
          });

          this.mockStorageAdapter.get.mockImplementation((key) => {
            if (key === "theaterModeSettings") {
              return Promise.resolve({
                isSuccess: () => true,
                data: {
                  isEnabled: true,
                  opacity: 0.8,
                  shortcutKey: "Ctrl+Shift+T",
                  version: "1.0.0",
                },
              });
            }
            return Promise.resolve({
              isSuccess: () => false,
              data: null,
            });
          });

          const result = await this.migrationScripts.checkMigrationNeeded();

          this.testFramework.assert(result.isSuccess(), "Check should succeed");

          const migrationInfo = result.data;
          this.testFramework.assert(
            migrationInfo.needsMigration === true,
            "Should need migration for legacy data"
          );

          this.testFramework.assert(
            migrationInfo.currentVersion === "1.0.0",
            "Should detect legacy version correctly"
          );

          this.testFramework.assert(
            migrationInfo.estimatedSteps > 0,
            "Should have estimated migration steps"
          );
        }
      );

      this.testFramework.it("should handle empty data", async () => {
        // 空のデータをモック
        this.mockStorageAdapter.getAllKeys.mockResolvedValue({
          isSuccess: () => true,
          data: [],
        });

        const result = await this.migrationScripts.checkMigrationNeeded();

        this.testFramework.assert(
          result.isSuccess(),
          "Check should succeed for empty data"
        );

        const migrationInfo = result.data;
        this.testFramework.assert(
          migrationInfo.needsMigration === false,
          "Should not need migration for empty data"
        );

        this.testFramework.assert(
          migrationInfo.currentVersion === CURRENT_VERSION,
          "Should default to current version for empty data"
        );
      });
    });
  }

  /**
   * データ移行テスト
   */
  async testDataMigration() {
    this.testFramework.describe("Data Migration", () => {
      this.testFramework.it(
        "should migrate legacy settings to new format",
        async () => {
          // レガシーデータをセットアップ
          this.setupLegacyData();

          const result = await this.migrationScripts.migrate();

          this.testFramework.assert(
            result.isSuccess(),
            "Migration should succeed"
          );

          const migrationResult = result.data;
          this.testFramework.assert(
            migrationResult.migrated === true,
            "Should indicate successful migration"
          );

          this.testFramework.assert(
            migrationResult.fromVersion === "1.0.0",
            "Should show correct from version"
          );

          this.testFramework.assert(
            migrationResult.toVersion === CURRENT_VERSION,
            "Should show correct to version"
          );

          // 保存されたデータを確認
          const savedCalls = this.mockStorageAdapter.set.mock.calls;
          const settingsCall = savedCalls.find(
            (call) => call[0] === "settings"
          );

          this.testFramework.assert(
            settingsCall !== undefined,
            "Should save new settings format"
          );

          const newSettings = settingsCall[1];
          this.testFramework.assert(
            newSettings.theaterModeEnabled === true,
            "Should convert isEnabled to theaterModeEnabled"
          );

          this.testFramework.assert(
            newSettings.keyboardShortcut === "t",
            "Should convert shortcut key format"
          );
        }
      );

      this.testFramework.it(
        "should create backup during migration",
        async () => {
          this.setupLegacyData();

          const result = await this.migrationScripts.migrate();

          this.testFramework.assert(
            result.isSuccess(),
            "Migration should succeed"
          );

          const migrationResult = result.data;
          this.testFramework.assert(
            typeof migrationResult.backupKey === "string",
            "Should create backup key"
          );

          // バックアップが作成されたことを確認
          const backupCalls = this.mockStorageAdapter.set.mock.calls.filter(
            (call) => call[0].startsWith("backup_")
          );

          this.testFramework.assert(
            backupCalls.length > 0,
            "Should create backup"
          );
        }
      );

      this.testFramework.it("should handle dry run mode", async () => {
        // ドライランモードでインスタンスを作成
        const dryRunMigration = new MigrationScripts({
          storageAdapter: this.mockStorageAdapter,
          logger: this.mockFactory.createMockLogger(),
          errorHandler: this.mockFactory.createMockErrorHandler(),
          dryRun: true,
        });

        this.setupLegacyData();

        const result = await dryRunMigration.migrate();

        this.testFramework.assert(
          result.isSuccess(),
          "Dry run migration should succeed"
        );

        const migrationResult = result.data;
        this.testFramework.assert(
          migrationResult.dryRun === true,
          "Should indicate dry run mode"
        );

        // データが実際に保存されていないことを確認
        const saveCalls = this.mockStorageAdapter.set.mock.calls.filter(
          (call) => call[0] === "settings"
        );

        this.testFramework.assert(
          saveCalls.length === 0,
          "Should not save data in dry run mode"
        );
      });

      this.testFramework.it(
        "should skip migration when not needed",
        async () => {
          // 現在のバージョンのデータをセットアップ
          this.setupCurrentVersionData();

          const result = await this.migrationScripts.migrate();

          this.testFramework.assert(
            result.isSuccess(),
            "Migration check should succeed"
          );

          const migrationResult = result.data;
          this.testFramework.assert(
            migrationResult.migrated === false,
            "Should not migrate when not needed"
          );
        }
      );
    });
  }

  /**
   * データ整合性チェックテスト
   */
  async testDataIntegrityValidation() {
    this.testFramework.describe("Data Integrity Validation", () => {
      this.testFramework.it("should validate correct data", async () => {
        this.setupCurrentVersionData();

        const result = await this.migrationScripts.validateDataIntegrity();

        this.testFramework.assert(
          result.isSuccess(),
          "Validation should succeed"
        );

        const validation = result.data;
        this.testFramework.assert(
          validation.isValid === true,
          "Should validate correct data as valid"
        );

        this.testFramework.assert(
          validation.issues.length === 0,
          "Should have no issues for valid data"
        );
      });

      this.testFramework.it("should detect invalid settings", async () => {
        // 無効な設定データをセットアップ
        this.mockStorageAdapter.getAllKeys.mockResolvedValue({
          isSuccess: () => true,
          data: ["settings"],
        });

        this.mockStorageAdapter.get.mockImplementation((key) => {
          if (key === "settings") {
            return Promise.resolve({
              isSuccess: () => true,
              data: {
                theaterModeEnabled: "invalid", // 無効な型
                opacity: 1.5, // 無効な範囲
                // keyboardShortcut が欠落
              },
            });
          }
          return Promise.resolve({
            isSuccess: () => false,
            data: null,
          });
        });

        const result = await this.migrationScripts.validateDataIntegrity();

        this.testFramework.assert(
          result.isSuccess(),
          "Validation should succeed"
        );

        const validation = result.data;
        this.testFramework.assert(
          validation.isValid === false,
          "Should detect invalid data"
        );

        this.testFramework.assert(
          validation.issues.length > 0,
          "Should have issues for invalid data"
        );

        // 特定の問題を確認
        const hasTypeIssue = validation.issues.some(
          (issue) => issue.type === "invalid_type"
        );
        const hasValueIssue = validation.issues.some(
          (issue) => issue.type === "invalid_value"
        );
        const hasMissingIssue = validation.issues.some(
          (issue) => issue.type === "missing_field"
        );

        this.testFramework.assert(hasTypeIssue, "Should detect type issues");

        this.testFramework.assert(hasValueIssue, "Should detect value issues");

        this.testFramework.assert(
          hasMissingIssue,
          "Should detect missing field issues"
        );
      });

      this.testFramework.it("should detect duplicate data", async () => {
        // 新旧両方の設定が存在するデータをセットアップ
        this.mockStorageAdapter.getAllKeys.mockResolvedValue({
          isSuccess: () => true,
          data: ["settings", "theaterModeSettings"],
        });

        this.mockStorageAdapter.get.mockImplementation((key) => {
          if (key === "settings") {
            return Promise.resolve({
              isSuccess: () => true,
              data: {
                theaterModeEnabled: true,
                opacity: 0.7,
                keyboardShortcut: "t",
                version: CURRENT_VERSION,
              },
            });
          }
          if (key === "theaterModeSettings") {
            return Promise.resolve({
              isSuccess: () => true,
              data: {
                isEnabled: true,
                opacity: 0.8,
                shortcutKey: "Ctrl+Shift+T",
              },
            });
          }
          return Promise.resolve({
            isSuccess: () => false,
            data: null,
          });
        });

        const result = await this.migrationScripts.validateDataIntegrity();

        this.testFramework.assert(
          result.isSuccess(),
          "Validation should succeed"
        );

        const validation = result.data;
        this.testFramework.assert(
          validation.isValid === false,
          "Should detect duplicate data as invalid"
        );

        const hasDuplicateIssue = validation.issues.some(
          (issue) => issue.type === "duplicate_data"
        );

        this.testFramework.assert(
          hasDuplicateIssue,
          "Should detect duplicate data issue"
        );
      });
    });
  }

  /**
   * バックアップ機能テスト
   */
  async testBackupFunctionality() {
    this.testFramework.describe("Backup Functionality", () => {
      this.testFramework.it("should get available backups", async () => {
        // バックアップデータをモック
        this.mockStorageAdapter.getAllKeys.mockResolvedValue({
          isSuccess: () => true,
          data: [
            "backup_2023-01-01T10_00_00_000Z",
            "backup_2023-01-02T10_00_00_000Z",
            "settings",
          ],
        });

        this.mockStorageAdapter.get.mockImplementation((key) => {
          if (key.startsWith("backup_")) {
            return Promise.resolve({
              isSuccess: () => true,
              data: {
                timestamp: "2023-01-01T10:00:00.000Z",
                version: "1.0.0",
                data: { settings: {} },
              },
            });
          }
          return Promise.resolve({
            isSuccess: () => false,
            data: null,
          });
        });

        const result = await this.migrationScripts.getAvailableBackups();

        this.testFramework.assert(
          result.isSuccess(),
          "Should get backups successfully"
        );

        const backups = result.data;
        this.testFramework.assert(
          Array.isArray(backups),
          "Should return array of backups"
        );

        this.testFramework.assert(
          backups.length === 2,
          "Should find correct number of backups"
        );

        // バックアップ情報の構造を確認
        const backup = backups[0];
        this.testFramework.assert(
          typeof backup.key === "string",
          "Backup should have key"
        );

        this.testFramework.assert(
          typeof backup.timestamp === "string",
          "Backup should have timestamp"
        );

        this.testFramework.assert(
          typeof backup.version === "string",
          "Backup should have version"
        );

        this.testFramework.assert(
          typeof backup.size === "number",
          "Backup should have size"
        );
      });

      this.testFramework.it("should restore from backup", async () => {
        const backupKey = "backup_2023-01-01T10_00_00_000Z";
        const backupData = {
          timestamp: "2023-01-01T10:00:00.000Z",
          version: "1.0.0",
          data: {
            theaterModeSettings: {
              isEnabled: true,
              opacity: 0.8,
            },
          },
        };

        this.mockStorageAdapter.get.mockImplementation((key) => {
          if (key === backupKey) {
            return Promise.resolve({
              isSuccess: () => true,
              data: backupData,
            });
          }
          return Promise.resolve({
            isSuccess: () => false,
            data: null,
          });
        });

        this.mockStorageAdapter.set.mockResolvedValue({
          isSuccess: () => true,
        });

        const result = await this.migrationScripts.restoreFromBackup(backupKey);

        this.testFramework.assert(
          result.isSuccess(),
          "Should restore from backup successfully"
        );

        // データが復元されたことを確認
        const setCalls = this.mockStorageAdapter.set.mock.calls;
        const restoreCall = setCalls.find(
          (call) => call[0] === "theaterModeSettings"
        );

        this.testFramework.assert(
          restoreCall !== undefined,
          "Should restore backup data"
        );

        this.testFramework.assert(
          restoreCall[1].isEnabled === true,
          "Should restore correct data values"
        );
      });

      this.testFramework.it("should cleanup old backups", async () => {
        // 複数のバックアップをモック
        this.mockStorageAdapter.getAllKeys.mockResolvedValue({
          isSuccess: () => true,
          data: [
            "backup_2023-01-01T10_00_00_000Z",
            "backup_2023-01-02T10_00_00_000Z",
            "backup_2023-01-03T10_00_00_000Z",
            "backup_2023-01-04T10_00_00_000Z",
            "backup_2023-01-05T10_00_00_000Z",
            "backup_2023-01-06T10_00_00_000Z",
            "settings",
          ],
        });

        this.mockStorageAdapter.get.mockImplementation((key) => {
          if (key.startsWith("backup_")) {
            return Promise.resolve({
              isSuccess: () => true,
              data: {
                timestamp: key.replace("backup_", "").replace(/_/g, ":"),
                version: "1.0.0",
                data: {},
              },
            });
          }
          return Promise.resolve({
            isSuccess: () => false,
            data: null,
          });
        });

        this.mockStorageAdapter.remove.mockResolvedValue({
          isSuccess: () => true,
        });

        const result = await this.migrationScripts.cleanupOldBackups(3);

        this.testFramework.assert(
          result.isSuccess(),
          "Should cleanup backups successfully"
        );

        const deletedCount = result.data;
        this.testFramework.assert(
          deletedCount === 3,
          "Should delete correct number of old backups"
        );

        // 削除が呼ばれたことを確認
        const removeCalls = this.mockStorageAdapter.remove.mock.calls;
        this.testFramework.assert(
          removeCalls.length === 3,
          "Should call remove for old backups"
        );
      });
    });
  }

  /**
   * 移行履歴テスト
   */
  async testMigrationHistory() {
    this.testFramework.describe("Migration History", () => {
      this.testFramework.it("should get migration history", async () => {
        const mockHistory = [
          {
            fromVersion: "1.0.0",
            toVersion: "1.1.0",
            timestamp: "2023-01-01T10:00:00.000Z",
            success: true,
          },
        ];

        this.mockStorageAdapter.get.mockImplementation((key) => {
          if (key === "migrationHistory") {
            return Promise.resolve({
              isSuccess: () => true,
              data: mockHistory,
            });
          }
          return Promise.resolve({
            isSuccess: () => false,
            data: null,
          });
        });

        const result = await this.migrationScripts.getMigrationHistory();

        this.testFramework.assert(
          result.isSuccess(),
          "Should get migration history successfully"
        );

        const history = result.data;
        this.testFramework.assert(
          Array.isArray(history),
          "Should return array of history records"
        );

        this.testFramework.assert(
          history.length === 1,
          "Should return correct number of history records"
        );

        const record = history[0];
        this.testFramework.assert(
          record.fromVersion === "1.0.0",
          "Should have correct from version"
        );

        this.testFramework.assert(
          record.toVersion === "1.1.0",
          "Should have correct to version"
        );
      });
    });
  }

  /**
   * レガシーデータのセットアップヘルパー
   */
  setupLegacyData() {
    this.mockStorageAdapter.getAllKeys.mockResolvedValue({
      isSuccess: () => true,
      data: ["theaterModeSettings"],
    });

    this.mockStorageAdapter.get.mockImplementation((key) => {
      if (key === "theaterModeSettings") {
        return Promise.resolve({
          isSuccess: () => true,
          data: {
            isEnabled: true,
            opacity: 0.8,
            shortcutKey: "Ctrl+Shift+T",
            version: "1.0.0",
          },
        });
      }
      if (key === "migrationHistory") {
        return Promise.resolve({
          isSuccess: () => true,
          data: [],
        });
      }
      return Promise.resolve({
        isSuccess: () => false,
        data: null,
      });
    });

    this.mockStorageAdapter.set.mockResolvedValue({
      isSuccess: () => true,
    });
  }

  /**
   * 現在バージョンデータのセットアップヘルパー
   */
  setupCurrentVersionData() {
    this.mockStorageAdapter.getAllKeys.mockResolvedValue({
      isSuccess: () => true,
      data: ["settings"],
    });

    this.mockStorageAdapter.get.mockImplementation((key) => {
      if (key === "settings") {
        return Promise.resolve({
          isSuccess: () => true,
          data: {
            theaterModeEnabled: true,
            opacity: 0.7,
            keyboardShortcut: "t",
            version: CURRENT_VERSION,
          },
        });
      }
      if (key === "migrationHistory") {
        return Promise.resolve({
          isSuccess: () => true,
          data: [],
        });
      }
      return Promise.resolve({
        isSuccess: () => false,
        data: null,
      });
    });
  }

  /**
   * 全テストを実行
   */
  async runAllTests() {
    console.log("Starting MigrationScripts tests...");

    try {
      await this.setup();

      await this.testBasicInitialization();
      await this.testMigrationCheck();
      await this.testDataMigration();
      await this.testDataIntegrityValidation();
      await this.testBackupFunctionality();
      await this.testMigrationHistory();

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
  window.MigrationScriptsTest = MigrationScriptsTest;
} else if (typeof module !== "undefined") {
  // Node.js環境
  module.exports = { MigrationScriptsTest };
}
