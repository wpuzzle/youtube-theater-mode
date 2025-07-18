/**
 * YouTube Theater Mode - タブ状態管理テスト
 * tab-state-manager.js の機能をテストするためのスクリプト
 */

// モック関数とヘルパー
const mockChrome = {
  runtime: {
    lastError: null,
    getManifest: jest.fn().mockReturnValue({ version: "1.0.0" }),
  },
  storage: {
    sync: {
      get: jest.fn(),
      set: jest.fn(),
    },
  },
  tabs: {
    query: jest.fn(),
    get: jest.fn(),
    sendMessage: jest.fn(),
    onUpdated: {
      addListener: jest.fn(),
    },
    onActivated: {
      addListener: jest.fn(),
    },
    onRemoved: {
      addListener: jest.fn(),
    },
  },
};

// グローバルのchromeオブジェクトをモックに置き換え
global.chrome = mockChrome;

// TabStateManagerクラスをインポート（テスト用に分離）
const TabStateManager = require("../tab-state-manager");

describe("TabStateManager", () => {
  let tabStateManager;

  beforeEach(() => {
    // テスト前にモックをリセット
    jest.clearAllMocks();

    // ストレージのモック応答を設定
    mockChrome.storage.sync.get.mockImplementation((keys, callback) => {
      callback({
        theaterModeEnabled: false,
        opacity: 0.7,
      });
    });

    mockChrome.storage.sync.set.mockImplementation((data, callback) => {
      callback();
    });

    // タブクエリのモック応答を設定
    mockChrome.tabs.query.mockImplementation((query, callback) => {
      callback([
        {
          id: 123,
          url: "https://www.youtube.com/watch?v=12345",
          title: "Test Video",
        },
      ]);
    });

    // TabStateManagerのインスタンスを作成
    tabStateManager = new TabStateManager();

    // インターバルをクリア（テスト中に実行されないようにする）
    if (tabStateManager.syncInterval) {
      clearInterval(tabStateManager.syncInterval);
      tabStateManager.syncInterval = null;
    }
  });

  describe("初期化", () => {
    test("コンストラクタが正しく初期化されること", () => {
      expect(tabStateManager).toBeDefined();
      expect(tabStateManager.tabStates).toBeInstanceOf(Map);
      expect(mockChrome.tabs.onUpdated.addListener).toHaveBeenCalled();
      expect(mockChrome.tabs.onActivated.addListener).toHaveBeenCalled();
      expect(mockChrome.tabs.onRemoved.addListener).toHaveBeenCalled();
    });

    test("getCurrentActiveTabが現在のアクティブタブを取得すること", () => {
      tabStateManager.getCurrentActiveTab();
      expect(mockChrome.tabs.query).toHaveBeenCalledWith(
        { active: true, currentWindow: true },
        expect.any(Function)
      );
    });
  });

  describe("タブ管理", () => {
    test("registerTabがタブを正しく登録すること", async () => {
      const tabId = 456;
      const tab = {
        id: tabId,
        url: "https://www.youtube.com/watch?v=67890",
        title: "Another Test Video",
      };

      await tabStateManager.registerTab(tabId, tab);

      expect(tabStateManager.tabStates.has(tabId)).toBe(true);
      expect(tabStateManager.tabStates.get(tabId)).toEqual(
        expect.objectContaining({
          url: tab.url,
          title: tab.title,
          theaterModeEnabled: expect.any(Boolean),
          opacity: expect.any(Number),
          lastSync: expect.any(Number),
        })
      );

      expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(
        tabId,
        expect.objectContaining({
          action: "syncState",
          state: expect.any(Object),
        }),
        expect.any(Function)
      );
    });

    test("unregisterTabがタブの登録を解除すること", async () => {
      const tabId = 789;
      const tab = {
        id: tabId,
        url: "https://www.youtube.com/watch?v=abcde",
        title: "Third Test Video",
      };

      await tabStateManager.registerTab(tabId, tab);
      expect(tabStateManager.tabStates.has(tabId)).toBe(true);

      tabStateManager.unregisterTab(tabId);
      expect(tabStateManager.tabStates.has(tabId)).toBe(false);
    });

    test("setActiveTabがアクティブタブを正しく設定すること", async () => {
      const tabId1 = 111;
      const tabId2 = 222;

      const tab1 = {
        id: tabId1,
        url: "https://www.youtube.com/watch?v=11111",
        title: "First Video",
      };

      const tab2 = {
        id: tabId2,
        url: "https://www.youtube.com/watch?v=22222",
        title: "Second Video",
      };

      await tabStateManager.registerTab(tabId1, tab1);
      await tabStateManager.registerTab(tabId2, tab2);

      tabStateManager.setActiveTab(tabId1);
      expect(tabStateManager.activeTabId).toBe(tabId1);
      expect(tabStateManager.tabStates.get(tabId1).isActive).toBe(true);

      tabStateManager.setActiveTab(tabId2);
      expect(tabStateManager.activeTabId).toBe(tabId2);
      expect(tabStateManager.tabStates.get(tabId1).isActive).toBe(false);
      expect(tabStateManager.tabStates.get(tabId2).isActive).toBe(true);
    });
  });

  describe("状態同期", () => {
    test("syncTabStateがタブの状態を同期すること", async () => {
      const tabId = 333;
      const tab = {
        id: tabId,
        url: "https://www.youtube.com/watch?v=33333",
        title: "Sync Test Video",
      };

      await tabStateManager.registerTab(tabId, tab);

      // 設定を変更
      mockChrome.storage.sync.get.mockImplementationOnce((keys, callback) => {
        callback({
          theaterModeEnabled: true, // 変更
          opacity: 0.5, // 変更
        });
      });

      await tabStateManager.syncTabState(tabId);

      expect(tabStateManager.tabStates.get(tabId)).toEqual(
        expect.objectContaining({
          theaterModeEnabled: true,
          opacity: 0.5,
        })
      );

      expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(
        tabId,
        expect.objectContaining({
          action: "syncState",
          state: expect.objectContaining({
            theaterModeEnabled: true,
            opacity: 0.5,
          }),
        }),
        expect.any(Function)
      );
    });

    test("syncAllTabsが全てのタブの状態を同期すること", async () => {
      const tabId1 = 444;
      const tabId2 = 555;

      const tab1 = {
        id: tabId1,
        url: "https://www.youtube.com/watch?v=44444",
        title: "First Sync All Video",
      };

      const tab2 = {
        id: tabId2,
        url: "https://www.youtube.com/watch?v=55555",
        title: "Second Sync All Video",
      };

      await tabStateManager.registerTab(tabId1, tab1);
      await tabStateManager.registerTab(tabId2, tab2);

      // syncTabStateをモック化して呼び出し回数を確認
      const originalSyncTabState = tabStateManager.syncTabState;
      tabStateManager.syncTabState = jest.fn();

      tabStateManager.syncAllTabs();

      expect(tabStateManager.syncTabState).toHaveBeenCalledTimes(2);
      expect(tabStateManager.syncTabState).toHaveBeenCalledWith(tabId1);
      expect(tabStateManager.syncTabState).toHaveBeenCalledWith(tabId2);

      // 元のメソッドを復元
      tabStateManager.syncTabState = originalSyncTabState;
    });
  });

  describe("状態更新", () => {
    test("updateTabStateがタブの状態を更新すること", async () => {
      const tabId = 666;
      const tab = {
        id: tabId,
        url: "https://www.youtube.com/watch?v=66666",
        title: "Update Test Video",
      };

      await tabStateManager.registerTab(tabId, tab);

      const stateUpdate = {
        theaterModeEnabled: true,
        opacity: 0.3,
      };

      const result = await tabStateManager.updateTabState(tabId, stateUpdate);

      expect(result).toBe(true);
      expect(tabStateManager.tabStates.get(tabId)).toEqual(
        expect.objectContaining({
          theaterModeEnabled: true,
          opacity: 0.3,
        })
      );

      expect(mockChrome.storage.sync.set).toHaveBeenCalledWith(
        expect.objectContaining({ theaterModeEnabled: true }),
        expect.any(Function)
      );

      expect(mockChrome.storage.sync.set).toHaveBeenCalledWith(
        expect.objectContaining({ opacity: 0.3 }),
        expect.any(Function)
      );
    });

    test("存在しないタブの状態更新に失敗すること", async () => {
      const nonExistentTabId = 999;

      const result = await tabStateManager.updateTabState(nonExistentTabId, {
        theaterModeEnabled: true,
      });

      expect(result).toBe(false);
    });
  });

  describe("状態取得", () => {
    test("getTabStateがタブの状態を取得すること", async () => {
      const tabId = 777;
      const tab = {
        id: tabId,
        url: "https://www.youtube.com/watch?v=77777",
        title: "Get State Test Video",
      };

      await tabStateManager.registerTab(tabId, tab);

      const tabState = tabStateManager.getTabState(tabId);

      expect(tabState).toEqual(
        expect.objectContaining({
          url: tab.url,
          title: tab.title,
          theaterModeEnabled: expect.any(Boolean),
          opacity: expect.any(Number),
        })
      );
    });

    test("getAllTabStatesが全てのタブの状態を取得すること", async () => {
      const tabId1 = 888;
      const tabId2 = 999;

      const tab1 = {
        id: tabId1,
        url: "https://www.youtube.com/watch?v=88888",
        title: "First Get All Video",
      };

      const tab2 = {
        id: tabId2,
        url: "https://www.youtube.com/watch?v=99999",
        title: "Second Get All Video",
      };

      await tabStateManager.registerTab(tabId1, tab1);
      await tabStateManager.registerTab(tabId2, tab2);

      const allTabStates = tabStateManager.getAllTabStates();

      expect(Object.keys(allTabStates).length).toBe(2);
      expect(allTabStates[tabId1]).toBeDefined();
      expect(allTabStates[tabId2]).toBeDefined();
      expect(allTabStates[tabId1].url).toBe(tab1.url);
      expect(allTabStates[tabId2].url).toBe(tab2.url);
    });

    test("getActiveTabStateがアクティブタブの状態を取得すること", async () => {
      const tabId = 1010;
      const tab = {
        id: tabId,
        url: "https://www.youtube.com/watch?v=10101",
        title: "Active Tab Test Video",
      };

      await tabStateManager.registerTab(tabId, tab);
      tabStateManager.setActiveTab(tabId);

      const activeTabState = tabStateManager.getActiveTabState();

      expect(activeTabState).toEqual(
        expect.objectContaining({
          url: tab.url,
          title: tab.title,
          isActive: true,
        })
      );
    });
  });
});
