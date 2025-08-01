/**
 * MessageRouter のテスト
 */

// テスト対象のモジュールをインポート
const { MessageRouter } =
  typeof require !== "undefined"
    ? require("../infrastructure/message-router.js")
    : window;
const { Logger } =
  typeof require !== "undefined"
    ? require("../infrastructure/logger.js")
    : window;
const { ErrorHandler } =
  typeof require !== "undefined"
    ? require("../infrastructure/error-handler.js")
    : window;
const { MessageBus, MessageType, MessageTarget, Message } =
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

  return {
    logger,
    errorHandler,
    messageBus,
  };
}

/**
 * MessageRouter のテスト
 */
describe("MessageRouter", () => {
  let router;
  let mocks;

  beforeEach(() => {
    // モックを作成
    mocks = createMocks();

    // MessageRouter インスタンスを作成
    router = new MessageRouter({
      logger: mocks.logger,
      errorHandler: mocks.errorHandler,
      messageBus: mocks.messageBus,
    });
  });

  afterEach(() => {
    // テスト後のクリーンアップ
    if (router) {
      router.dispose();
    }

    // モックをリセット
    jest.clearAllMocks();
  });

  test("初期化時にメッセージハンドラーが登録されること", () => {
    expect(mocks.messageBus.registerHandler).toHaveBeenCalledWith(
      "*",
      expect.any(Function)
    );
  });

  test("ルートを追加できること", () => {
    const routeId = router.addRoute({
      type: MessageType.SETTINGS_CHANGED,
      target: MessageTarget.ALL,
      forward: true,
    });

    expect(routeId).toBeDefined();
    expect(typeof routeId).toBe("string");
  });

  test("ルートを削除できること", () => {
    const routeId = router.addRoute({
      type: MessageType.SETTINGS_CHANGED,
      target: MessageTarget.ALL,
    });

    const result = router.removeRoute(routeId);
    expect(result).toBe(true);

    // 存在しないルートIDを削除しようとした場合
    const invalidResult = router.removeRoute("invalid-id");
    expect(invalidResult).toBe(false);
  });

  test("タイプハンドラーを登録できること", () => {
    const handler = jest.fn();
    const removeHandler = router.registerTypeHandler(
      MessageType.SETTINGS_CHANGED,
      handler
    );

    expect(typeof removeHandler).toBe("function");

    // ハンドラーを削除
    removeHandler();
  });

  test("送信元ハンドラーを登録できること", () => {
    const handler = jest.fn();
    const removeHandler = router.registerSourceHandler("background", handler);

    expect(typeof removeHandler).toBe("function");

    // ハンドラーを削除
    removeHandler();
  });

  test("送信先ハンドラーを登録できること", () => {
    const handler = jest.fn();
    const removeHandler = router.registerTargetHandler(
      MessageTarget.CONTENT_SCRIPT,
      handler
    );

    expect(typeof removeHandler).toBe("function");

    // ハンドラーを削除
    removeHandler();
  });

  test("ミドルウェアを追加できること", () => {
    const middleware = jest.fn().mockImplementation((message) => message);
    const removeMiddleware = router.addMiddleware(middleware);

    expect(typeof removeMiddleware).toBe("function");

    // ミドルウェアを削除
    removeMiddleware();
  });

  test("メッセージを送信できること", async () => {
    await router.send(MessageType.SETTINGS_CHANGED, {
      theaterModeEnabled: true,
    });

    expect(mocks.messageBus.send).toHaveBeenCalledWith(
      MessageType.SETTINGS_CHANGED,
      { theaterModeEnabled: true },
      {}
    );
  });

  test("dispose が正常に動作すること", () => {
    router.dispose();

    expect(mocks.messageBus.clear).toHaveBeenCalled();
  });

  test("_handleMessage が正常に動作すること", async () => {
    // タイプハンドラーを登録
    const typeHandler = jest.fn().mockReturnValue(true);
    router.registerTypeHandler(MessageType.SETTINGS_CHANGED, typeHandler);

    // メッセージを作成
    const message = new Message(
      MessageType.SETTINGS_CHANGED,
      { theaterModeEnabled: true },
      {
        source: "background",
        target: MessageTarget.ALL,
      }
    );

    // メッセージを処理
    const result = await router._handleMessage(message);

    expect(result.success).toBe(true);
    expect(result.data.handled).toBe(true);
    expect(result.data.typeHandled).toBe(true);
    expect(typeHandler).toHaveBeenCalledWith(message);
  });

  test("_executeRouting が正常に動作すること", async () => {
    // ルートを追加
    router.addRoute({
      type: MessageType.SETTINGS_CHANGED,
      target: MessageTarget.ALL,
      forward: true,
    });

    // メッセージを作成
    const message = new Message(
      MessageType.SETTINGS_CHANGED,
      { theaterModeEnabled: true },
      {
        source: "background",
        target: MessageTarget.ALL,
      }
    );

    // ルーティングを実行
    const result = await router._executeRouting(message);

    expect(result.success).toBe(true);
    expect(mocks.messageBus.send).toHaveBeenCalled();
  });
});
