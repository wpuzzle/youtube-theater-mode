/**
 * YouTube Theater Mode - Background Service Worker テスト
 * background.js の機能をテストするためのスクリプト
 */

// モック関数とヘルパー
const mockChrome = {
  runtime: {
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
    onInstalled: {
      addListener: jest.fn(),
    },
    getManifest: jest.fn().mockReturnValue({ version: "1.0.0" }),
    lastError: null,
  },
  storage: {
    sync: {
      get: jest.fn(),
      set: jest.fn(),
    },
    onChanged: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
  },
  tabs: {
    onUpdated: {
      addListener: jest.fn(),
    },
    onActivated: {
      addListener: jest.fn(),
    },
    onRemoved: {
      addListener: jest.fn(),
    },
    get: jest.fn(),
  },
};

// グローバルのchromeオブジェクトをモックに置き換え
global.chrome = mockChrome;

// BackgroundServiceクラスをインポート（テスト用に分離）
const BackgroundService = require("../background-service");

describe("BackgroundService", () => {
  let backgroundService;

  beforeEach(() => {
    // テスト前にモックをリセット
    jest.clearAllMocks();

    // ストレージのモック応答を設定
    mockChrome.storage.sync.get.mockImplementation((keys, callback) => {
      callback({
        theaterModeEnabled: false,
        opacity: 0.7,
        keyboardShortcut: "t",
        version: "1.0.0",
      });
    });

    mockChrome.storage.sync.set.mockImplementation((data, callback) => {
      callback();
    });

    // BackgroundServiceのインスタンスを作成
    backgroundService = new BackgroundService();
  });

  describe("初期化", () => {
    test("コンストラクタが正しく初期化されること", () => {
      expect(backgroundService).toBeDefined();
      expect(backgroundService.activeTabStates).toBeInstanceOf(Map);
      expect(mockChrome.runtime.onMessage.addListener).toHaveBeenCalled();
      expect(mockChrome.tabs.onUpdated.addListener).toHaveBeenCalled();
      expect(mockChrome.tabs.onActivated.addListener).toHaveBeenCalled();
      expect(mockChrome.tabs.onRemoved.addListener).toHaveBeenCalled();
    });

    test("initializeExtensionが設定を初期化すること", async () => {
      await backgroundService.initializeExtension();
      expect(mockChrome.storage.sync.get).toHaveBeenCalled();
      expect(mockChrome.storage.sync.set).toHaveBeenCalled();
    });
  });

  describe("設定管理", () => {
    test("loadSettingsが設定を正しく読み込むこと", async () => {
      const settings = await backgroundService.loadSettings();
      expect(settings).toEqual({
        theaterModeEnabled: false,
        opacity: 0.7,
        keyboardShortcut: "t",
        version: "1.0.0",
      });
    });

    test("saveSettingsが設定を正しく保存すること", async () => {
      const result = await backgroundService.saveSettings({ opacity: 0.5 });
      expect(result).toBe(true);
      expect(mockChrome.storage.sync.set).toHaveBeenCalledWith(
        { opacity: 0.5 },
        expect.any(Function)
      );
    });

    test("validateSettingsが無効な設定を修正すること", () => {
      const invalidSettings = {
        opacity: 1.5, // 範囲外
        theaterModeEnabled: "yes", // 不正な型
        keyboardShortcut: "", // 空文字列
      };

      const validatedSettings =
        backgroundService.validateSettings(invalidSettings);

      expect(validatedSettings.opacity).toBe(0.7); // デフォルト値に修正
      expect(validatedSettings.theaterModeEnabled).toBe(false); // デフォルト値に修正
      expect(validatedSettings.keyboardShortcut).toBe("t"); // デフォルト値に修正
    });
  });

  describe("メッセージ処理", () => {
    test("toggleTheaterModeメッセージを処理できること", async () => {
      const sender = { tab: { id: 123 } };
      const sendResponse = jest.fn();

      await backgroundService.handleMessage(
        { action: "toggleTheaterMode" },
        sender,
        sendResponse
      );

      expect(mockChrome.storage.sync.get).toHaveBeenCalled();
      expect(mockChrome.storage.sync.set).toHaveBeenCalled();
      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          enabled: expect.any(Boolean),
        })
      );
    });

    test("getSettingsメッセージを処理できること", async () => {
      const sender = {};
      const sendResponse = jest.fn();

      await backgroundService.handleMessage(
        { action: "getSettings" },
        sender,
        sendResponse
      );

      expect(mockChrome.storage.sync.get).toHaveBeenCalled();
      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          theaterModeEnabled: expect.any(Boolean),
          opacity: expect.any(Number),
          keyboardShortcut: expect.any(String),
        })
      );
    });

    test("updateOpacityメッセージを処理できること", async () => {
      const sender = { tab: { id: 123 } };
      const sendResponse = jest.fn();

      await backgroundService.handleMessage(
        { action: "updateOpacity", opacity: 0.5 },
        sender,
        sendResponse
      );

      expect(mockChrome.storage.sync.set).toHaveBeenCalledWith(
        expect.objectContaining({ opacity: 0.5 }),
        expect.any(Function)
      );
      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          opacity: 0.5,
          percentage: 50,
        })
      );
    });

    test("不明なアクションに対してエラーを返すこと", async () => {
      const sender = {};
      const sendResponse = jest.fn();

      await backgroundService.handleMessage(
        { action: "unknownAction" },
        sender,
        sendResponse
      );

      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining("Unknown action"),
        })
      );
    });
  });

  describe("タブ管理", () => {
    test("syncTabStateがタブの状態を正しく同期すること", async () => {
      const tabId = 123;
      const tab = {
        id: tabId,
        url: "https://www.youtube.com/watch?v=12345",
      };

      await backgroundService.syncTabState(tabId, tab);

      expect(backgroundService.activeTabStates.has(tabId)).toBe(true);
      const tabState = backgroundService.activeTabStates.get(tabId);
      expect(tabState).toEqual(
        expect.objectContaining({
          url: tab.url,
          theaterModeEnabled: expect.any(Boolean),
          opacity: expect.any(Number),
          lastSync: expect.any(Number),
        })
      );
    });

    test("YouTube動画ページ以外のタブは同期しないこと", async () => {
      const tabId = 456;
      const tab = {
        id: tabId,
        url: "https://www.youtube.com/feed/subscriptions", // 動画ページではない
      };

      await backgroundService.syncTabState(tabId, tab);

      expect(backgroundService.activeTabStates.has(tabId)).toBe(false);
    });
  });

  describe("エラーハンドリング", () => {
    test("ストレージエラー時にデフォルト設定を返すこと", async () => {
      // エラーをシミュレート
      mockChrome.storage.sync.get.mockImplementationOnce((keys, callback) => {
        mockChrome.runtime.lastError = { message: "Storage error" };
        callback({});
        mockChrome.runtime.lastError = null;
      });

      const settings = await backgroundService.loadSettings();

      expect(settings).toEqual(
        expect.objectContaining({
          theaterModeEnabled: false,
          opacity: 0.7,
          keyboardShortcut: "t",
        })
      );
    });

    test("メッセージ処理中のエラーをハンドリングすること", async () => {
      const sender = {};
      const sendResponse = jest.fn();

      // エラーをスローするモックを設定
      backgroundService.loadSettings = jest.fn().mockImplementationOnce(() => {
        throw new Error("Test error");
      });

      await backgroundService.handleMessage(
        { action: "getSettings" },
        sender,
        sendResponse
      );

      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: "Test error",
        })
      );
    });
  });
});
