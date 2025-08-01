/**
 * BackgroundService テストランナー
 *
 * BackgroundServiceの単体テストを実行します。
 * - MessageBusシステムとの統合
 * - 効率的なリソース管理
 * - 強化されたエラーハンドリング
 */

// テスト環境のセットアップ
const jest = {
  fn: function () {
    const mockFn = function (...args) {
      mockFn.calls.push(args);
      mockFn.callCount++;
      return mockFn._implementation
        ? mockFn._implementation(...args)
        : undefined;
    };
    mockFn.calls = [];
    mockFn.callCount = 0;
    mockFn._implementation = null;
    mockFn.mockImplementation = function (fn) {
      mockFn._implementation = fn;
      return mockFn;
    };
    mockFn.mockReturnValue = function (value) {
      mockFn._implementation = () => value;
      return mockFn;
    };
    mockFn.mockResolvedValue = function (value) {
      mockFn._implementation = () => Promise.resolve(value);
      return mockFn;
    };
    mockFn.mockRejectedValue = function (error) {
      mockFn._implementation = () => Promise.reject(error);
      return mockFn;
    };
    return mockFn;
  },
  clearAllMocks: function () {
    // モックをリセット
  },
};

// テストフレームワークのセットアップ
const describe = (name, fn) => {
  console.log(`\n--- ${name} ---`);
  fn();
};

const test = async (name, fn) => {
  try {
    await fn();
    console.log(`✅ ${name}`);
  } catch (error) {
    console.error(`❌ ${name}`);
    console.error(error);
  }
};

const expect = (actual) => ({
  toBe: (expected) => {
    if (actual !== expected) {
      throw new Error(`Expected ${expected} but got ${actual}`);
    }
  },
  toEqual: (expected) => {
    const actualStr = JSON.stringify(actual);
    const expectedStr = JSON.stringify(expected);
    if (actualStr !== expectedStr) {
      throw new Error(`Expected ${expectedStr} but got ${actualStr}`);
    }
  },
  toHaveBeenCalled: () => {
    if (!actual.callCount) {
      throw new Error("Expected function to be called");
    }
  },
  toHaveBeenCalledWith: (...args) => {
    const found = actual.calls.some(
      (call) => JSON.stringify(call) === JSON.stringify(args)
    );
    if (!found) {
      throw new Error(
        `Expected function to be called with ${JSON.stringify(args)}`
      );
    }
  },
  toHaveBeenCalledTimes: (times) => {
    if (actual.callCount !== times) {
      throw new Error(
        `Expected function to be called ${times} times but was called ${actual.callCount} times`
      );
    }
  },
  toHaveProperty: (prop, value) => {
    if (!(prop in actual)) {
      throw new Error(`Expected object to have property ${prop}`);
    }
    if (value !== undefined && actual[prop] !== value) {
      throw new Error(
        `Expected property ${prop} to be ${value} but got ${actual[prop]}`
      );
    }
  },
  toBeGreaterThan: (expected) => {
    if (!(actual > expected)) {
      throw new Error(`Expected ${actual} to be greater than ${expected}`);
    }
  },
});

// テスト用のモックを作成
function createMocks() {
  // ロガーのモック
  const logger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    startPerformance: jest.fn(),
    endPerformance: jest.fn(),
    logMemoryUsage: jest.fn(),
    getPerformanceStats: jest.fn().mockReturnValue({}),
    createChild: jest.fn().mockReturnValue({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      startPerformance: jest.fn(),
      endPerformance: jest.fn(),
      logMemoryUsage: jest.fn(),
      getPerformanceStats: jest.fn().mockReturnValue({}),
    }),
  };

  // エラーハンドラーのモック
  const errorHandler = {
    handleError: jest.fn().mockImplementation((error) => error),
    addErrorListener: jest.fn().mockReturnValue(() => {}),
    registerTypeHandler: jest.fn(),
    wrapAsync: jest.fn().mockImplementation(async (promise) => {
      try {
        const data = await promise;
        return Result.success(data);
      } catch (error) {
        return Result.failure(error);
      }
    }),
  };

  // メッセージバスのモック
  const messageBus = {
    send: jest.fn().mockResolvedValue(Result.success({ sent: true })),
    registerHandler: jest.fn().mockReturnValue(() => {}),
    clear: jest.fn(),
  };

  // ストレージアダプターのモック
  const storageAdapter = {
    get: jest
      .fn()
      .mockResolvedValue(
        Result.success({ theaterModeEnabled: false, opacity: 0.7 })
      ),
    set: jest.fn().mockResolvedValue(Result.success(true)),
    remove: jest.fn().mockResolvedValue(Result.success(true)),
    onChange: jest.fn(),
  };

  // タブ状態マネージャーのモック
  const tabStateManager = {
    updateTabState: jest.fn().mockResolvedValue(true),
    syncAllTabs: jest.fn(),
    setActiveTab: jest.fn().mockResolvedValue(true),
  };

  // メッセージルーターのモック
  const messageRouter = {
    addRoute: jest.fn(),
    registerTypeHandler: jest.fn(),
    dispose: jest.fn(),
  };

  // サービスワーカーマネージャーのモック
  const serviceWorkerManager = {
    getStatus: jest.fn().mockReturnValue("active"),
    dispose: jest.fn(),
  };

  return {
    logger,
    errorHandler,
    messageBus,
    storageAdapter,
    tabStateManager,
    messageRouter,
    serviceWorkerManager,
  };
}

// テスト実行
async function runTests() {
  console.log("BackgroundService テストを実行中...");

  // テスト対象のモジュールをインポート
  const { BackgroundService, ResourceManager } =
    typeof window !== "undefined"
      ? window
      : require("../infrastructure/background-service.js");
  const { Logger } =
    typeof window !== "undefined"
      ? window
      : require("../infrastructure/logger.js");
  const { ErrorHandler, Result, ErrorType } =
    typeof window !== "undefined"
      ? window
      : require("../infrastructure/error-handler.js");
  const { MessageBus, MessageType } =
    typeof window !== "undefined"
      ? window
      : require("../infrastructure/message-bus.js");
  const { StorageAdapter } =
    typeof window !== "undefined"
      ? window
      : require("../infrastructure/storage-adapter.js");

  // ResourceManager のテスト
  describe("ResourceManager", () => {
    let resourceManager;
    let mockLogger;

    beforeEach = () => {
      mockLogger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      };
      resourceManager = new ResourceManager(mockLogger);
    };

    afterEach = () => {
      resourceManager.cleanup();
      jest.clearAllMocks();
    };

    beforeEach();

    test("リソースの登録と削除が正常に動作すること", () => {
      const resource = { name: "test" };
      const cleanup = jest.fn();

      resourceManager.register("test-resource", resource, cleanup);
      expect(resourceManager.getResourceStats().resources).toBe(1);

      resourceManager.unregister("test-resource");
      expect(cleanup).toHaveBeenCalled();
      expect(resourceManager.getResourceStats().resources).toBe(0);
    });

    afterEach();
    beforeEach();

    test("タイマーとインターバルの管理が正常に動作すること", () => {
      const timerId = setTimeout(() => {}, 1000);
      const intervalId = setInterval(() => {}, 1000);

      resourceManager.registerTimer(timerId);
      resourceManager.registerInterval(intervalId);

      expect(resourceManager.getResourceStats().timers).toBe(1);
      expect(resourceManager.getResourceStats().intervals).toBe(1);

      resourceManager.cleanup();
      expect(resourceManager.getResourceStats().timers).toBe(0);
      expect(resourceManager.getResourceStats().intervals).toBe(0);
    });

    afterEach();
    beforeEach();

    test("クリーンアップタスクが正常に実行されること", () => {
      const cleanupTask = jest.fn();
      resourceManager.registerCleanupTask(cleanupTask);

      resourceManager.cleanup();
      expect(cleanupTask).toHaveBeenCalled();
    });

    afterEach();
    beforeEach();

    test("破棄後はリソース登録ができないこと", () => {
      resourceManager.cleanup();

      const resource = { name: "test" };
      const cleanup = jest.fn();

      resourceManager.register("test-resource", resource, cleanup);
      expect(resourceManager.getResourceStats().resources).toBe(0);
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    afterEach();
  });

  // BackgroundService のテスト
  describe("BackgroundService", () => {
    let service;
    let mocks;

    beforeEach = async () => {
      // モックを作成
      mocks = createMocks();

      // BackgroundService インスタンスを作成（初期化を待つ）
      service = new BackgroundService({
        logger: mocks.logger,
        errorHandler: mocks.errorHandler,
        messageBus: mocks.messageBus,
        storageAdapter: mocks.storageAdapter,
        tabStateManager: mocks.tabStateManager,
        messageRouter: mocks.messageRouter,
        serviceWorkerManager: mocks.serviceWorkerManager,
      });

      // 初期化の完了を待つ
      await new Promise((resolve) => setTimeout(resolve, 10));
    };

    afterEach = async () => {
      // テスト後のクリーンアップ
      if (service && !service.isDisposed) {
        await service.dispose();
      }

      // モックをリセット
      jest.clearAllMocks();
    };

    describe("初期化", () => {
      beforeEach(async () => {
        await beforeEach();
      });

      afterEach(async () => {
        await afterEach();
      });
      test("初期化時にメッセージハンドラーが登録されること", () => {
        expect(mocks.messageBus.registerHandler).toHaveBeenCalled();
      });

      test("初期化時に設定が読み込まれること", () => {
        expect(mocks.storageAdapter.get).toHaveBeenCalledWith("settings");
      });

      test("初期化時にエラーハンドリングが設定されること", () => {
        expect(mocks.errorHandler.addErrorListener).toHaveBeenCalled();
        expect(mocks.errorHandler.registerTypeHandler).toHaveBeenCalled();
      });
    });

    describe("設定管理", () => {
      test("loadSettings が正常に動作すること", async () => {
        const result = await service.loadSettings();
        expect(result.isSuccess()).toBe(true);
        expect(mocks.storageAdapter.get).toHaveBeenCalledWith("settings");
      });

      test("saveSettings が正常に動作すること", async () => {
        const settings = { theaterModeEnabled: true, opacity: 0.5 };
        const result = await service.saveSettings(settings);

        expect(result.isSuccess()).toBe(true);
        expect(mocks.storageAdapter.set).toHaveBeenCalled();
      });
    });

    describe("シアターモード制御", () => {
      test("handleTheaterModeToggle が正常に動作すること", async () => {
        const tabId = 123;
        const result = await service.handleTheaterModeToggle(tabId);

        expect(result.isSuccess()).toBe(true);
        expect(mocks.storageAdapter.set).toHaveBeenCalled();
        expect(mocks.tabStateManager.updateTabState).toHaveBeenCalled();
        expect(mocks.tabStateManager.syncAllTabs).toHaveBeenCalled();
      });
    });

    describe("パフォーマンス監視", () => {
      test("パフォーマンス統計が正常に取得できること", () => {
        const metrics = service.getPerformanceMetrics();

        expect(metrics).toHaveProperty("messageHandlerCalls");
        expect(metrics).toHaveProperty("settingsOperations");
        expect(metrics).toHaveProperty("errorCount");
        expect(metrics).toHaveProperty("lastActivity");
      });

      test("サービス状態が正常に取得できること", () => {
        const status = service.getServiceStatus();

        expect(status).toHaveProperty("isInitialized");
        expect(status).toHaveProperty("isDisposed");
        expect(status).toHaveProperty("performanceMetrics");
        expect(status).toHaveProperty("resourceStats");
      });
    });
  });

  console.log("\nBackgroundService テストが完了しました");
}

// テストの実行
if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", runTests);
} else {
  // Node.js環境での実行
  runTests();
}
