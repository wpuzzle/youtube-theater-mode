/**
 * SettingsManager のテスト
 */

// 依存関係のインポート
const {
  SchemaType,
  SettingsManager,
} = require("../infrastructure/settings-manager.js");
const {
  StorageAdapter,
  StorageType,
} = require("../infrastructure/storage-adapter.js");
const { Logger } = require("../infrastructure/logger.js");
const { ErrorHandler } = require("../infrastructure/error-handler.js");

// テスト用のロガーとエラーハンドラーを作成
const logger = new Logger("SettingsManagerTest", {
  level: Logger.LogLevel.DEBUG,
});
const errorHandler = new ErrorHandler(logger);

/**
 * テスト実行関数
 */
async function runTests() {
  console.log("=== SettingsManager Tests ===");

  // 各テストを実行
  await testInitialization();
  await testLoadSettings();
  await testSaveSettings();
  await testValidation();
  await testMigration();
  await testChangeListeners();
  await testGetUpdateSetting();
  await testResetSettings();

  console.log("=== All SettingsManager Tests Completed ===");
}

/**
 * 初期化テスト
 */
async function testInitialization() {
  console.log("Testing initialization...");

  // ストレージアダプターを作成
  const storageAdapter = new StorageAdapter({
    namespace: "test",
    preferredType: StorageType.MEMORY,
    logger,
    errorHandler,
  });

  // デフォルト初期化
  const manager1 = new SettingsManager({
    storageAdapter,
    logger,
    errorHandler,
  });

  const schema1 = manager1.getSchema();
  console.assert(
    schema1.opacity.type === SchemaType.NUMBER,
    "Schema should have opacity as NUMBER type"
  );
  console.assert(
    schema1.theaterModeEnabled.type === SchemaType.BOOLEAN,
    "Schema should have theaterModeEnabled as BOOLEAN type"
  );

  // カスタムスキーマでの初期化
  const customSchema = {
    customSetting: {
      type: SchemaType.STRING,
      default: "test",
      description: "Custom setting for testing",
    },
    anotherSetting: {
      type: SchemaType.NUMBER,
      default: 42,
      min: 0,
      max: 100,
      description: "Another custom setting",
    },
  };

  const manager2 = new SettingsManager({
    storageAdapter,
    logger,
    errorHandler,
    schema: customSchema,
    storageKey: "customSettings",
  });

  const schema2 = manager2.getSchema();
  console.assert(
    schema2.customSetting.type === SchemaType.STRING,
    "Custom schema should have customSetting as STRING type"
  );
  console.assert(
    schema2.anotherSetting.default === 42,
    "Custom schema should have anotherSetting with default 42"
  );

  console.log("✓ Initialization tests passed");
}

/**
 * 設定読み込みテスト
 */
async function testLoadSettings() {
  console.log("Testing loadSettings...");

  // ストレージアダプターを作成
  const storageAdapter = new StorageAdapter({
    namespace: "test_load",
    preferredType: StorageType.MEMORY,
    logger,
    errorHandler,
  });

  // 初期設定を定義
  const initialSettings = {
    testSetting: "initial",
    numberSetting: 123,
  };

  // カスタムスキーマ
  const customSchema = {
    testSetting: {
      type: SchemaType.STRING,
      default: "default",
      description: "Test setting",
    },
    numberSetting: {
      type: SchemaType.NUMBER,
      default: 0,
      description: "Number setting",
    },
    version: {
      type: SchemaType.STRING,
      default: "1.0.0",
      description: "Settings version",
    },
  };

  // SettingsManagerを作成
  const manager = new SettingsManager({
    storageAdapter,
    logger,
    errorHandler,
    schema: customSchema,
    initialSettings,
    storageKey: "testLoadSettings",
  });

  // 初回読み込み（初期設定が使用される）
  const result1 = await manager.loadSettings();
  console.assert(result1.success, "First load should succeed");
  console.assert(
    result1.data.testSetting === "initial",
    "Should use initial settings"
  );
  console.assert(
    result1.data.numberSetting === 123,
    "Should use initial settings for numberSetting"
  );

  // 設定を保存
  await storageAdapter.set("testLoadSettings", {
    testSetting: "saved",
    numberSetting: 456,
    version: "1.0.0",
  });

  // キャッシュをクリア
  manager.clearCache();

  // 再読み込み（保存された設定が使用される）
  const result2 = await manager.loadSettings();
  console.assert(result2.success, "Second load should succeed");
  console.assert(
    result2.data.testSetting === "saved",
    "Should load saved settings"
  );
  console.assert(
    result2.data.numberSetting === 456,
    "Should load saved numberSetting"
  );

  // 無効な設定を保存
  await storageAdapter.set("testLoadSettings", {
    testSetting: 123, // 文字列ではなく数値
    numberSetting: "invalid", // 数値ではなく文字列
    version: "1.0.0",
  });

  // キャッシュをクリア
  manager.clearCache();

  // 再読み込み（無効な設定は修正される）
  const result3 = await manager.loadSettings();
  console.assert(result3.success, "Third load should succeed");
  console.assert(
    typeof result3.data.testSetting === "string",
    "Invalid testSetting should be converted to string"
  );
  console.assert(
    typeof result3.data.numberSetting === "number",
    "Invalid numberSetting should be converted to number"
  );

  console.log("✓ loadSettings tests passed");
}

/**
 * 設定保存テスト
 */
async function testSaveSettings() {
  console.log("Testing saveSettings...");

  // ストレージアダプターを作成
  const storageAdapter = new StorageAdapter({
    namespace: "test_save",
    preferredType: StorageType.MEMORY,
    logger,
    errorHandler,
  });

  // カスタムスキーマ
  const customSchema = {
    stringSetting: {
      type: SchemaType.STRING,
      default: "default",
      description: "String setting",
    },
    numberSetting: {
      type: SchemaType.NUMBER,
      default: 0,
      min: 0,
      max: 100,
      description: "Number setting",
    },
    boolSetting: {
      type: SchemaType.BOOLEAN,
      default: false,
      description: "Boolean setting",
    },
    version: {
      type: SchemaType.STRING,
      default: "1.0.0",
      description: "Settings version",
    },
  };

  // SettingsManagerを作成
  const manager = new SettingsManager({
    storageAdapter,
    logger,
    errorHandler,
    schema: customSchema,
    storageKey: "testSaveSettings",
  });

  // 設定を保存
  const saveResult = await manager.saveSettings({
    stringSetting: "test",
    numberSetting: 42,
    boolSetting: true,
  });

  console.assert(saveResult.success, "Save should succeed");

  // 保存された設定を確認
  const loadResult = await manager.loadSettings();
  console.assert(
    loadResult.data.stringSetting === "test",
    "stringSetting should be saved"
  );
  console.assert(
    loadResult.data.numberSetting === 42,
    "numberSetting should be saved"
  );
  console.assert(
    loadResult.data.boolSetting === true,
    "boolSetting should be saved"
  );

  // 無効な設定を保存
  const invalidSaveResult = await manager.saveSettings({
    numberSetting: -10, // 最小値違反
  });

  console.assert(invalidSaveResult.isFailure(), "Invalid save should fail");
  console.assert(
    invalidSaveResult.error.type === "VALIDATION_ERROR",
    "Should fail with validation error"
  );

  // 部分的な更新
  const partialSaveResult = await manager.saveSettings({
    stringSetting: "updated",
  });

  console.assert(partialSaveResult.success, "Partial save should succeed");

  // 更新された設定を確認
  const updatedLoadResult = await manager.loadSettings();
  console.assert(
    updatedLoadResult.data.stringSetting === "updated",
    "stringSetting should be updated"
  );
  console.assert(
    updatedLoadResult.data.numberSetting === 42,
    "numberSetting should remain unchanged"
  );
  console.assert(
    updatedLoadResult.data.boolSetting === true,
    "boolSetting should remain unchanged"
  );

  console.log("✓ saveSettings tests passed");
}

/**
 * バリデーションテスト
 */
async function testValidation() {
  console.log("Testing validation...");

  // ストレージアダプターを作成
  const storageAdapter = new StorageAdapter({
    namespace: "test_validation",
    preferredType: StorageType.MEMORY,
    logger,
    errorHandler,
  });

  // 詳細なバリデーションルールを持つスキーマ
  const schema = {
    stringSetting: {
      type: SchemaType.STRING,
      default: "default",
      minLength: 2,
      maxLength: 10,
      pattern: /^[a-zA-Z0-9]+$/,
      description: "String setting with validation",
    },
    numberSetting: {
      type: SchemaType.NUMBER,
      default: 50,
      min: 0,
      max: 100,
      description: "Number setting with range",
    },
    enumSetting: {
      type: SchemaType.STRING,
      default: "option1",
      enum: ["option1", "option2", "option3"],
      description: "Enum setting",
    },
    arraySetting: {
      type: SchemaType.ARRAY,
      default: [],
      minItems: 0,
      maxItems: 5,
      description: "Array setting",
    },
    version: {
      type: SchemaType.STRING,
      default: "1.0.0",
      description: "Settings version",
    },
  };

  // SettingsManagerを作成
  const manager = new SettingsManager({
    storageAdapter,
    logger,
    errorHandler,
    schema,
    storageKey: "testValidationSettings",
  });

  // 有効な設定
  const validSettings = {
    stringSetting: "valid123",
    numberSetting: 75,
    enumSetting: "option2",
    arraySetting: [1, 2, 3],
    version: "1.0.0",
  };

  const validResult = manager.validateSettings(validSettings);
  console.assert(validResult.success, "Valid settings should pass validation");

  // 無効な設定のテスト
  const invalidTests = [
    {
      settings: { stringSetting: "a" }, // 最小長違反
      expectedError: "VALIDATION_ERROR",
    },
    {
      settings: { stringSetting: "abcdefghijk" }, // 最大長違反
      expectedError: "VALIDATION_ERROR",
    },
    {
      settings: { stringSetting: "invalid!" }, // パターン違反
      expectedError: "VALIDATION_ERROR",
    },
    {
      settings: { numberSetting: -10 }, // 最小値違反
      expectedError: "VALIDATION_ERROR",
    },
    {
      settings: { numberSetting: 200 }, // 最大値違反
      expectedError: "VALIDATION_ERROR",
    },
    {
      settings: { enumSetting: "invalid" }, // 列挙型違反
      expectedError: "VALIDATION_ERROR",
    },
    {
      settings: { arraySetting: [1, 2, 3, 4, 5, 6] }, // 最大項目数違反
      expectedError: "VALIDATION_ERROR",
    },
  ];

  for (const test of invalidTests) {
    const result = manager.validateSettings({
      ...validSettings,
      ...test.settings,
    });

    console.assert(
      result.isFailure(),
      `Validation should fail for ${JSON.stringify(test.settings)}`
    );
    console.assert(
      result.error.type === test.expectedError,
      `Error type should be ${test.expectedError}`
    );
  }

  // 設定の修正テスト
  const invalidSettings = {
    stringSetting: 123, // 文字列ではなく数値
    numberSetting: "50", // 数値ではなく文字列
    enumSetting: "invalid", // 無効な列挙値
    arraySetting: "not an array", // 配列ではない
    version: "1.0.0",
  };

  // _sanitizeSettings メソッドは private なので、内部実装をテストするために
  // 直接呼び出すことはできないが、loadSettings を通じて間接的にテストできる

  // 無効な設定を保存
  await storageAdapter.set("testValidationSettings", invalidSettings);

  // キャッシュをクリア
  manager.clearCache();

  // 読み込み（無効な設定は修正される）
  const loadResult = await manager.loadSettings();
  console.assert(
    loadResult.success,
    "Load should succeed even with invalid settings"
  );
  console.assert(
    typeof loadResult.data.stringSetting === "string",
    "stringSetting should be converted to string"
  );
  console.assert(
    typeof loadResult.data.numberSetting === "number",
    "numberSetting should be converted to number"
  );
  console.assert(
    loadResult.data.enumSetting === "option1",
    "Invalid enumSetting should be reset to default"
  );
  console.assert(
    Array.isArray(loadResult.data.arraySetting),
    "arraySetting should be converted to array"
  );

  console.log("✓ Validation tests passed");
}

/**
 * 設定移行テスト
 */
async function testMigration() {
  console.log("Testing migration...");

  // ストレージアダプターを作成
  const storageAdapter = new StorageAdapter({
    namespace: "test_migration",
    preferredType: StorageType.MEMORY,
    logger,
    errorHandler,
  });

  // 移行テスト用のスキーマ
  const schema = {
    oldSetting: {
      type: SchemaType.STRING,
      default: "default",
      description: "Old setting",
    },
    newSetting: {
      type: SchemaType.STRING,
      default: "new default",
      description: "New setting added in v1.1.0",
    },
    newerSetting: {
      type: SchemaType.STRING,
      default: "newer default",
      description: "Newer setting added in v1.2.0",
    },
    version: {
      type: SchemaType.STRING,
      default: "1.0.0",
      description: "Settings version",
    },
  };

  // 古いバージョンの設定を保存
  await storageAdapter.set("testMigrationSettings", {
    oldSetting: "old value",
    version: "1.0.0",
  });

  // カスタム移行処理を持つSettingsManagerを作成
  const manager = new SettingsManager({
    storageAdapter,
    logger,
    errorHandler,
    schema,
    storageKey: "testMigrationSettings",
  });

  // 移行処理をオーバーライド
  const originalMigrateMethod = manager._migrateSettingsIfNeeded;
  manager._migrateSettingsIfNeeded = async function (settings) {
    // バージョンが1.0.0の場合は1.1.0に移行
    if (settings.version === "1.0.0") {
      settings = {
        ...settings,
        newSetting: "migrated value",
        version: "1.1.0",
      };
    }

    // バージョンが1.1.0の場合は1.2.0に移行
    if (settings.version === "1.1.0") {
      settings = {
        ...settings,
        newerSetting: "newer migrated value",
        version: "1.2.0",
      };
    }

    return settings;
  };

  // 設定を読み込み（移行処理が実行される）
  const result = await manager.loadSettings();

  console.assert(result.success, "Migration should succeed");
  console.assert(
    result.data.version === "1.2.0",
    "Version should be migrated to 1.2.0"
  );
  console.assert(
    result.data.oldSetting === "old value",
    "Old setting should be preserved"
  );
  console.assert(
    result.data.newSetting === "migrated value",
    "New setting should be added during migration"
  );
  console.assert(
    result.data.newerSetting === "newer migrated value",
    "Newer setting should be added during migration"
  );

  // 元のメソッドを復元
  manager._migrateSettingsIfNeeded = originalMigrateMethod;

  console.log("✓ Migration tests passed");
}

/**
 * 変更リスナーテスト
 */
async function testChangeListeners() {
  console.log("Testing change listeners...");

  // ストレージアダプターを作成
  const storageAdapter = new StorageAdapter({
    namespace: "test_listeners",
    preferredType: StorageType.MEMORY,
    logger,
    errorHandler,
  });

  // SettingsManagerを作成
  const manager = new SettingsManager({
    storageAdapter,
    logger,
    errorHandler,
    storageKey: "testListenerSettings",
  });

  // 変更リスナーのテスト
  let callCount = 0;
  let lastSettings = null;
  let lastPreviousSettings = null;

  // リスナーを登録
  const unsubscribe = manager.onChange((settings, previousSettings) => {
    callCount++;
    lastSettings = settings;
    lastPreviousSettings = previousSettings;
  });

  // 初期設定を保存
  await manager.saveSettings({
    testSetting: "initial",
  });

  console.assert(callCount === 1, "Listener should be called once");
  console.assert(
    lastSettings.testSetting === "initial",
    "Last settings should have testSetting = 'initial'"
  );

  // 設定を更新
  await manager.saveSettings({
    testSetting: "updated",
  });

  console.assert(callCount === 2, "Listener should be called twice");
  console.assert(
    lastSettings.testSetting === "updated",
    "Last settings should have testSetting = 'updated'"
  );
  console.assert(
    lastPreviousSettings.testSetting === "initial",
    "Previous settings should have testSetting = 'initial'"
  );

  // リスナーを解除
  unsubscribe();

  // さらに設定を更新
  await manager.saveSettings({
    testSetting: "final",
  });

  console.assert(
    callCount === 2,
    "Listener should not be called after unsubscribe"
  );
  console.assert(
    lastSettings.testSetting === "updated",
    "Last settings should still have testSetting = 'updated'"
  );

  console.log("✓ Change listener tests passed");
}

/**
 * 個別設定の取得・更新テスト
 */
async function testGetUpdateSetting() {
  console.log("Testing getSetting and updateSetting...");

  // ストレージアダプターを作成
  const storageAdapter = new StorageAdapter({
    namespace: "test_get_update",
    preferredType: StorageType.MEMORY,
    logger,
    errorHandler,
  });

  // SettingsManagerを作成
  const manager = new SettingsManager({
    storageAdapter,
    logger,
    errorHandler,
    storageKey: "testGetUpdateSettings",
  });

  // 初期設定を保存
  await manager.saveSettings({
    opacity: 0.5,
    theaterModeEnabled: true,
  });

  // 個別設定を取得
  const opacityResult = await manager.getSetting("opacity");
  console.assert(opacityResult.success, "getSetting should succeed");
  console.assert(opacityResult.data === 0.5, "opacity should be 0.5");

  const theaterModeResult = await manager.getSetting("theaterModeEnabled");
  console.assert(theaterModeResult.success, "getSetting should succeed");
  console.assert(
    theaterModeResult.data === true,
    "theaterModeEnabled should be true"
  );

  // 存在しない設定を取得
  const nonExistentResult = await manager.getSetting("nonExistent");
  console.assert(
    nonExistentResult.isFailure(),
    "getSetting for non-existent key should fail"
  );

  // 個別設定を更新
  const updateResult = await manager.updateSetting("opacity", 0.8);
  console.assert(updateResult.success, "updateSetting should succeed");

  // 更新を確認
  const updatedOpacityResult = await manager.getSetting("opacity");
  console.assert(
    updatedOpacityResult.data === 0.8,
    "opacity should be updated to 0.8"
  );

  // 無効な値で更新
  const invalidUpdateResult = await manager.updateSetting("opacity", 1.5);
  console.assert(
    invalidUpdateResult.isFailure(),
    "updateSetting with invalid value should fail"
  );

  // 存在しない設定を更新
  const nonExistentUpdateResult = await manager.updateSetting(
    "nonExistent",
    "value"
  );
  console.assert(
    nonExistentUpdateResult.isFailure(),
    "updateSetting for non-existent key should fail"
  );

  console.log("✓ getSetting and updateSetting tests passed");
}

/**
 * 設定リセットテスト
 */
async function testResetSettings() {
  console.log("Testing resetSettings...");

  // ストレージアダプターを作成
  const storageAdapter = new StorageAdapter({
    namespace: "test_reset",
    preferredType: StorageType.MEMORY,
    logger,
    errorHandler,
  });

  // SettingsManagerを作成
  const manager = new SettingsManager({
    storageAdapter,
    logger,
    errorHandler,
    storageKey: "testResetSettings",
  });

  // 初期設定を保存
  await manager.saveSettings({
    opacity: 0.5,
    theaterModeEnabled: true,
    keyboardShortcut: "x",
  });

  // 設定をリセット
  const resetResult = await manager.resetSettings();
  console.assert(resetResult.success, "resetSettings should succeed");

  // リセット後の設定を確認
  const loadResult = await manager.loadSettings();
  console.assert(loadResult.success, "loadSettings after reset should succeed");

  // デフォルト値と比較
  const defaultSettings = manager.getDefaultSettings();
  for (const key in defaultSettings) {
    console.assert(
      JSON.stringify(loadResult.data[key]) ===
        JSON.stringify(defaultSettings[key]),
      `${key} should be reset to default value`
    );
  }

  console.log("✓ resetSettings tests passed");
}

// Node.js環境でテストを実行
if (typeof require !== "undefined" && require.main === module) {
  runTests().catch(console.error);
}

// ブラウザ環境でのエクスポート
if (typeof window !== "undefined") {
  window.runSettingsManagerTests = runTests;
}
