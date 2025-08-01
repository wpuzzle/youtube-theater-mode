/**
 * ServiceWorkerManager のテスト
 */

// テスト対象のモジュールをインポート
const { ServiceWorkerManager, ServiceWorkerState } =
  typeof require !== "undefined"
    ? require("../infrastructure/service-worker-manager.js")
    : window;
const { Logger } =
  typeof require !== "undefined"
    ? require("../infrastructure/logger.js")
    : window;
const { ErrorHandler } =
  typeof require !== "undefined"
    ? require("../infrastructure/error-handler.js")
    : window;
const { MessageBus, MessageType } =
  typeof require !== "undefined"
    ? require("../infrastructure/message-bus.js")
    : window;

/**
 * テスト用のモックを作成
 */
function createMocks() {
  // ロガーのモック
  const logger = new Logger("TestLogger", { level: Logger.LogLevel.DEBUG });

  // エラーハンドラーのモック
  const errorHandler = new ErrorHandler(logger);

  // メッセージバスのモック
  const messageBus = {
    send: jest.fn().mockResolvedValue({ success: true }),
    registerHandler: jest.fn(),
    clear: jest.fn(),
  };

  // ServiceWorkerRegistration のモック
  const registration = {
    scope: "/",
    updateViaCache: "none",
    active: {
      state: "activated",
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    },
    installing: null,
    waiting: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    update: jest.fn().mockResolvedValue(undefined),
    unregister: jest.fn().mockResolvedValue(true),
  };

  // Navigator.serviceWorker のモック
  const serviceWorker = {
    getRegistration: jest.fn().mockResolvedValue(registration),
    register: jest.fn().mockResolvedValue(registration),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  };

  // グローバルオブジェクトのモック
  global.navigator = {
    serviceWorker,
  };

  return {
    logger,
    errorHandler,
    messageBus,
    registration,
    serviceWorker,
  };
}

/**
 * ServiceWorkerManager のテスト
 */
describe("ServiceWorkerManager", () => {
  let manager;
  let mocks;

  beforeEach(() => {
    // モックを作成
    mocks = createMocks();

    // ServiceWorkerManager インスタンスを作成
    manager = new ServiceWorkerManager({
      logger: mocks.logger,
      errorHandler: mocks.errorHandler,
      messageBus: mocks.messageBus,
    });
  });

  afterEach(() => {
    // テスト後のクリーンアップ
    if (manager) {
      manager.dispose();
    }

    // モックをリセット
    jest.clearAllMocks();

    // グローバルオブジェクトをリセット
    delete global.navigator;
  });

  test("初期化時に現在の登録を取得すること", () => {
    expect(mocks.serviceWorker.getRegistration).toHaveBeenCalled();
  });

  test("初期化時にメッセージハンドラーが登録されること", () => {
    expect(mocks.messageBus.registerHandler).toHaveBeenCalled();
  });

  test("register が正常に動作すること", async () => {
    const scriptURL = "/service-worker.js";
    const options = { scope: "/" };

    const result = await manager.register(scriptURL, options);

    expect(result.success).toBe(true);
    expect(mocks.serviceWorker.register).toHaveBeenCalledWith(
      scriptURL,
      options
    );
  });

  test("update が正常に動作すること", async () => {
    // 登録を設定
    manager.registration = mocks.registration;

    const result = await manager.update();

    expect(result.success).toBe(true);
    expect(mocks.registration.update).toHaveBeenCalled();
  });

  test("unregister が正常に動作すること", async () => {
    // 登録を設定
    manager.registration = mocks.registration;

    const result = await manager.unregister();

    expect(result.success).toBe(true);
    expect(mocks.registration.unregister).toHaveBeenCalled();
  });

  test("activateWaiting が正常に動作すること", async () => {
    // 登録を設定
    manager.registration = {
      ...mocks.registration,
      waiting: {
        postMessage: jest.fn(),
      },
    };

    const result = await manager.activateWaiting();

    expect(result.success).toBe(true);
    expect(manager.registration.waiting.postMessage).toHaveBeenCalledWith({
      type: "SKIP_WAITING",
    });
  });

  test("getStatus が正常に動作すること", () => {
    // 登録を設定
    manager.registration = mocks.registration;
    manager.state = ServiceWorkerState.ACTIVATED;

    const status = manager.getStatus();

    expect(status.state).toBe(ServiceWorkerState.ACTIVATED);
    expect(status.registration).toEqual({
      scope: "/",
      updateViaCache: "none",
      active: true,
      installing: false,
      waiting: false,
    });
    expect(status.metrics).toBeDefined();
  });

  test("dispose が正常に動作すること", () => {
    // 監視タイマーを設定
    manager.monitorInterval = setInterval(() => {}, 1000);

    manager.dispose();

    expect(manager.monitorInterval).toBeNull();
    expect(mocks.messageBus.clear).toHaveBeenCalled();
  });
});
