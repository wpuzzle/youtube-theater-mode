/**
 * BackgroundService 単体テスト
 * 新しいMessageBusシステムとの統合、リソース管理、エラーハンドリングをテスト
 */

// 依存関係のインポート
const {
  BackgroundService,
  ResourceManager,
} = require("../infrastructure/background-service.js");
const { Logger } = require("../infrastructure/logger.js");
const {
  ErrorHandler,
  Result,
  ErrorType,
} = require("../infrastructure/error-handler.js");
const { MessageBus, MessageType } = require("../infrastructure/message-bus.js");

/**
 * 簡単なモック作成関数
 */
function createMocks() {
  const logger = new Logger("TestLogger", { level: Logger.LogLevel.WARN });

  return {
    logger,
    errorHandler: new ErrorHandler(logger),
    messageBus: new MessageBus({
      logger: logger.createChild("MessageBus"),
      name: "test",
    }),
    storageAdapter: {
      get: async (key) => {
        if (key === "settings") {
          return Result.success({
            theaterModeEnabled: false,
            opacity: 0.7,
            keyboardShortcut: "t",
            lastUsed: Date.now(),
            version: "1.0.0",
          });
        }
        return Result.success(null);
      },
      set: async (key, value) => Result.success(true),
    },
    tabStateManager: {
      updateTabState: async (tabId, state) => {},
      syncAllTabs: () => {},
    },
    messageRouter: {
      dispose: () => {},
    },
    serviceWorkerManager: {
      dispose: () => {},
    },
  };
}

/**
 * テスト実行関数
 */
async function runTests() {
  console.log("BackgroundService 単体テストを実行中...\n");

  let testCount = 0;
  let passedCount = 0;

  function test(name, testFn) {
    testCount++;
    try {
      const result = testFn();
      if (result instanceof Promise) {
        return result
          .then(() => {
            console.log(`✅ ${name}`);
            passedCount++;
          })
          .catch((error) => {
            console.log(`❌ ${name}: ${error.message}`);
          });
      } else {
        console.log(`✅ ${name}`);
        passedCount++;
      }
    } catch (error) {
      console.log(`❌ ${name}: ${error.message}`);
    }
  }

  // ResourceManager テスト
  console.log("--- ResourceManager テスト ---");

  await test("リソースの登録と削除", () => {
    const logger = new Logger("TestLogger", { level: Logger.LogLevel.WARN });
    const resourceManager = new ResourceManager(logger);

    // リソース登録
    let cleanupCalled = false;
    resourceManager.register("test-resource", { data: "test" }, () => {
      cleanupCalled = true;
    });

    const stats = resourceManager.getResourceStats();
    if (stats.resources !== 1) {
      throw new Error("リソースが正しく登録されていません");
    }

    // リソース削除
    resourceManager.unregister("test-resource");
    if (!cleanupCalled) {
      throw new Error("クリーンアップ関数が呼ばれていません");
    }
  });

  await test("タイマーとインターバルの管理", () => {
    const logger = new Logger("TestLogger", { level: Logger.LogLevel.WARN });
    const resourceManager = new ResourceManager(logger);

    const timerId = setTimeout(() => {}, 1000);
    const intervalId = setInterval(() => {}, 1000);

    resourceManager.registerTimer(timerId);
    resourceManager.registerInterval(intervalId);

    const stats = resourceManager.getResourceStats();
    if (stats.timers !== 1 || stats.intervals !== 1) {
      throw new Error("タイマーまたはインターバルが正しく登録されていません");
    }

    resourceManager.cleanup();
    clearTimeout(timerId);
    clearInterval(intervalId);
  });

  await test("クリーンアップ処理", () => {
    const logger = new Logger("TestLogger", { level: Logger.LogLevel.WARN });
    const resourceManager = new ResourceManager(logger);

    let cleanupTaskCalled = false;
    resourceManager.registerCleanupTask(() => {
      cleanupTaskCalled = true;
    });

    resourceManager.cleanup();

    if (!cleanupTaskCalled) {
      throw new Error("クリーンアップタスクが実行されていません");
    }

    if (!resourceManager.getResourceStats().isDisposed) {
      throw new Error("ResourceManagerが破棄されていません");
    }
  });

  // BackgroundService テスト
  console.log("\n--- BackgroundService テスト ---");

  await test("初期化処理", async () => {
    const mocks = createMocks();
    const service = new BackgroundService(mocks);

    // 初期化完了を待つ
    await new Promise((resolve) => setTimeout(resolve, 100));

    if (!service.isInitialized) {
      throw new Error("BackgroundServiceが初期化されていません");
    }

    await service.dispose();
  });

  await test("設定の読み込み", async () => {
    const mocks = createMocks();
    const service = new BackgroundService(mocks);

    await new Promise((resolve) => setTimeout(resolve, 100));

    const result = await service.loadSettings();
    if (result.isFailure()) {
      throw new Error(`設定の読み込みに失敗: ${result.error.message}`);
    }

    const settings = result.data;
    if (typeof settings.theaterModeEnabled !== "boolean") {
      throw new Error("設定の形式が正しくありません");
    }

    await service.dispose();
  });

  await test("設定の保存", async () => {
    const mocks = createMocks();
    const service = new BackgroundService(mocks);

    await new Promise((resolve) => setTimeout(resolve, 100));

    const result = await service.saveSettings({ theaterModeEnabled: true });
    if (result.isFailure()) {
      throw new Error(`設定の保存に失敗: ${result.error.message}`);
    }

    await service.dispose();
  });

  await test("シアターモード切り替え", async () => {
    const mocks = createMocks();
    const service = new BackgroundService(mocks);

    await new Promise((resolve) => setTimeout(resolve, 100));

    const result = await service.handleTheaterModeToggle(123);
    if (result.isFailure()) {
      throw new Error(`シアターモード切り替えに失敗: ${result.error.message}`);
    }

    if (typeof result.data.enabled !== "boolean") {
      throw new Error("切り替え結果の形式が正しくありません");
    }

    await service.dispose();
  });

  await test("透明度更新", async () => {
    const mocks = createMocks();
    const service = new BackgroundService(mocks);

    await new Promise((resolve) => setTimeout(resolve, 100));

    const result = await service.updateOpacity(0.5, 123);
    if (result.isFailure()) {
      throw new Error(`透明度更新に失敗: ${result.error.message}`);
    }

    if (result.data.opacity !== 0.5) {
      throw new Error("透明度が正しく設定されていません");
    }

    await service.dispose();
  });

  await test("パフォーマンス統計取得", async () => {
    const mocks = createMocks();
    const service = new BackgroundService(mocks);

    await new Promise((resolve) => setTimeout(resolve, 100));

    const metrics = service.getPerformanceMetrics();
    if (typeof metrics.messageHandlerCalls !== "number") {
      throw new Error("パフォーマンス統計の形式が正しくありません");
    }

    await service.dispose();
  });

  await test("サービス状態取得", async () => {
    const mocks = createMocks();
    const service = new BackgroundService(mocks);

    await new Promise((resolve) => setTimeout(resolve, 100));

    const status = service.getServiceStatus();
    if (typeof status.isInitialized !== "boolean") {
      throw new Error("サービス状態の形式が正しくありません");
    }

    await service.dispose();
  });

  await test("リソース管理統合", async () => {
    const mocks = createMocks();
    const service = new BackgroundService(mocks);

    await new Promise((resolve) => setTimeout(resolve, 100));

    // カスタムリソースを登録
    let cleanupCalled = false;
    service.registerResource("test-resource", { data: "test" }, () => {
      cleanupCalled = true;
    });

    // サービスを破棄
    await service.dispose();

    if (!cleanupCalled) {
      throw new Error("登録したリソースのクリーンアップが実行されていません");
    }
  });

  await test("エラーハンドリング", async () => {
    const mocks = createMocks();
    // ストレージエラーをシミュレート
    mocks.storageAdapter.get = async () =>
      Result.failure("Storage error", { type: ErrorType.STORAGE_ERROR });

    const service = new BackgroundService(mocks);

    await new Promise((resolve) => setTimeout(resolve, 100));

    const result = await service.loadSettings();
    // エラーが発生してもデフォルト設定が返されることを確認
    if (result.isFailure()) {
      throw new Error("エラー時のフォールバック処理が正しく動作していません");
    }

    await service.dispose();
  });

  // テスト結果の表示
  console.log(`\n--- テスト結果 ---`);
  console.log(
    `実行: ${testCount}, 成功: ${passedCount}, 失敗: ${testCount - passedCount}`
  );

  if (passedCount === testCount) {
    console.log("🎉 全てのテストが成功しました！");
    console.log("BackgroundServiceの再設計が正常に完了しています。");
  } else {
    console.log("❌ 一部のテストが失敗しました。");
    process.exit(1);
  }
}

// テスト実行
if (require.main === module) {
  runTests().catch((error) => {
    console.error("テスト実行中にエラーが発生:", error);
    process.exit(1);
  });
}

module.exports = { runTests };
