/**
 * TabStateManager のテスト
 */

// 依存関係のインポート
const {
  StateStore,
  ActionCreator,
  ActionType,
} = require("../infrastructure/state-store.js");
const TabStateManager = require("../tab-state-manager.js");
const { Logger } = require("../infrastructure/logger.js");
const { ErrorHandler } = require("../infrastructure/error-handler.js");

// テスト用のロガーとエラーハンドラーを作成
const logger = new Logger("TabStateManagerTest", {
  level: Logger.LogLevel.DEBUG,
});
const errorHandler = new ErrorHandler(logger);

// Chrome API のモック
const setupChromeMock = () => {
  global.chrome = {
    runtime: {
      lastError: null,
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
      query: jest.fn(),
      sendMessage: jest.fn(),
    },
  };
};

// Chrome API のモックをクリア
const clearChromeMock = () => {
  delete global.chrome;
};

/**
 * テスト実行関数
 */
async function runTests() {
  console.log("=== TabStateManager Tests ===");

  // Chrome API のモックをセットアップ
  setupChromeMock();

  try {
    // 各テストを実行
    await testInitialization();
    await testTabRegistration();
    await testTabActivation();
    await testTabSync();
    await testTabUpdate();
    await testTabNotification();
    await testPeriodicSync();
    await testLockMechanism();

    console.log("=== All TabStateManager Tests Completed ===");
  } finally {
    // Chrome API のモックをクリア
    clearChromeMock();
  }
}

/**
 * 初期化テスト
 */
async function testInitialization() {
  console.log("Testing initialization...");

  // StateStore を作成
  const stateStore = new StateStore({
    logger,
    errorHandler,
  });

  // Chrome API のモックを設定
  chrome.tabs.query.mockImplementation((query, callback) => {
    callback([
      {
        id: 1,
        url: "https://youtube.com/watch?v=123",
        title: "Test Video",
      },
    ]);
  });

  chrome.tabs.get.mockImplementation((tabId, callback) => {
    callback({
      id: tabId,
      url: "https://youtube.com/watch?v=123",
      title: "Test Video",
    });
  });

  // TabStateManager を作成
  const tabStateManager = new TabStateManager({
    stateStore,
    logger,
    errorHandler,
    syncIntervalTime: 1000,
  });

  // イベントリスナーが設定されたことを確認
  console.assert(
    chrome.tabs.onUpdated.addListener.mock.calls.length === 1,
    "onUpdated listener should be added"
  );
  console.assert(
    chrome.tabs.onActivated.addListener.mock.calls.length === 1,
    "onActivated listener should be added"
  );
  console.assert(
    chrome.tabs.onRemoved.addListener.mock.calls.length === 1,
    "onRemoved listener should be added"
  );

  // 現在のアクティブタブが取得されたことを確認
  console.assert(
    chrome.tabs.query.mock.calls.length === 1,
    "tabs.query should be called once"
  );
  console.assert(
    chrome.tabs.query.mock.calls[0][0].active === true,
    "tabs.query should query for active tabs"
  );

  // 同期インターバルが設定されたことを確認
  console.assert(
    tabStateManager.syncInterval !== null,
    "Sync interval should be set"
  );

  // クリーンアップ
  tabStateManager.dispose();
  console.assert(
    tabStateManager.syncInterval === null,
    "Sync interval should be cleared after dispose"
  );

  console.log("✓ Initialization tests passed");
}

/**
 * タブ登録テスト
 */
async function testTabRegistration() {
  console.log("Testing tab registration...");

  // StateStore を作成
  const stateStore = new StateStore({
    logger,
    errorHandler,
  });

  // TabStateManager を作成
  const tabStateManager = new TabStateManager({
    stateStore,
    logger,
    errorHandler,
  });

  // タブを登録
  await tabStateManager.registerTab(1, {
    url: "https://youtube.com/watch?v=123",
    title: "Test Video",
  });

  // 状態を確認
  const state = stateStore.getState();
  console.assert(state.tabs.tabStates.has(1), "Tab 1 should be registered");
  console.assert(
    state.tabs.tabStates.get(1).url === "https://youtube.com/watch?v=123",
    "Tab URL should be set"
  );
  console.assert(
    state.tabs.tabStates.get(1).title === "Test Video",
    "Tab title should be set"
  );

  // タブを登録解除
  await tabStateManager.unregisterTab(1);

  // 状態を確認
  const updatedState = stateStore.getState();
  console.assert(
    !updatedState.tabs.tabStates.has(1),
    "Tab 1 should be unregistered"
  );

  // クリーンアップ
  tabStateManager.dispose();

  console.log("✓ Tab registration tests passed");
}

/**
 * タブアクティブ化テスト
 */
async function testTabActivation() {
  console.log("Testing tab activation...");

  // StateStore を作成
  const stateStore = new StateStore({
    logger,
    errorHandler,
  });

  // TabStateManager を作成
  const tabStateManager = new TabStateManager({
    stateStore,
    logger,
    errorHandler,
  });

  // 複数のタブを登録
  await tabStateManager.registerTab(1, {
    url: "https://youtube.com/watch?v=123",
    title: "Test Video 1",
  });

  await tabStateManager.registerTab(2, {
    url: "https://youtube.com/watch?v=456",
    title: "Test Video 2",
  });

  // タブ1をアクティブ化
  await tabStateManager.activateTab(1);

  // 状態を確認
  let state = stateStore.getState();
  console.assert(state.tabs.activeTabId === 1, "Tab 1 should be active");
  console.assert(
    state.tabs.tabStates.get(1).isActive === true,
    "Tab 1 should be marked as active"
  );
  console.assert(
    state.tabs.tabStates.get(2).isActive === false,
    "Tab 2 should be marked as inactive"
  );

  // タブ2をアクティブ化
  await tabStateManager.activateTab(2);

  // 状態を確認
  state = stateStore.getState();
  console.assert(state.tabs.activeTabId === 2, "Tab 2 should be active");
  console.assert(
    state.tabs.tabStates.get(1).isActive === false,
    "Tab 1 should be marked as inactive"
  );
  console.assert(
    state.tabs.tabStates.get(2).isActive === true,
    "Tab 2 should be marked as active"
  );

  // アクティブタブの状態を取得
  const activeTabState = tabStateManager.getActiveTabState();
  console.assert(
    activeTabState.title === "Test Video 2",
    "Active tab state should be for Tab 2"
  );

  // クリーンアップ
  tabStateManager.dispose();

  console.log("✓ Tab activation tests passed");
}

/**
 * タブ同期テスト
 */
async function testTabSync() {
  console.log("Testing tab sync...");

  // StateStore を作成
  const stateStore = new StateStore({
    logger,
    errorHandler,
  });

  // TabStateManager を作成
  const tabStateManager = new TabStateManager({
    stateStore,
    logger,
    errorHandler,
  });

  // タブを登録
  await tabStateManager.registerTab(1, {
    url: "https://youtube.com/watch?v=123",
    title: "Test Video",
  });

  // シアターモードを有効化
  await stateStore.dispatch(ActionCreator.setTheaterMode(true));

  // タブを同期
  await tabStateManager.syncTabState(1);

  // 状態を確認
  const state = stateStore.getState();
  console.assert(
    state.tabs.tabStates.get(1).theaterModeEnabled === true,
    "Tab state should be synced with theaterModeEnabled=true"
  );

  // 全タブ同期
  await tabStateManager.syncAllTabs();

  // Chrome API のモックを確認
  console.assert(
    chrome.tabs.sendMessage.mock.calls.length >= 1,
    "tabs.sendMessage should be called"
  );

  // クリーンアップ
  tabStateManager.dispose();

  console.log("✓ Tab sync tests passed");
}

/**
 * タブ更新テスト
 */
async function testTabUpdate() {
  console.log("Testing tab update...");

  // StateStore を作成
  const stateStore = new StateStore({
    logger,
    errorHandler,
  });

  // TabStateManager を作成
  const tabStateManager = new TabStateManager({
    stateStore,
    logger,
    errorHandler,
  });

  // タブを登録
  await tabStateManager.registerTab(1, {
    url: "https://youtube.com/watch?v=123",
    title: "Test Video",
  });

  // タブ状態を更新
  const updateResult = await tabStateManager.updateTabState(1, {
    title: "Updated Title",
    theaterModeEnabled: true,
  });

  console.assert(updateResult === true, "Update should succeed");

  // 状態を確認
  const state = stateStore.getState();
  console.assert(
    state.tabs.tabStates.get(1).title === "Updated Title",
    "Tab title should be updated"
  );
  console.assert(
    state.tabs.tabStates.get(1).theaterModeEnabled === true,
    "Tab theaterModeEnabled should be updated"
  );
  console.assert(
    state.theaterMode.isEnabled === true,
    "Global theaterMode.isEnabled should also be updated"
  );

  // 存在しないタブの更新
  const invalidUpdateResult = await tabStateManager.updateTabState(999, {
    title: "Invalid",
  });

  console.assert(
    invalidUpdateResult === false,
    "Update for non-existent tab should fail"
  );

  // クリーンアップ
  tabStateManager.dispose();

  console.log("✓ Tab update tests passed");
}

/**
 * タブ通知テスト
 */
async function testTabNotification() {
  console.log("Testing tab notification...");

  // StateStore を作成
  const stateStore = new StateStore({
    logger,
    errorHandler,
  });

  // TabStateManager を作成
  const tabStateManager = new TabStateManager({
    stateStore,
    logger,
    errorHandler,
  });

  // Chrome API のモックをリセット
  chrome.tabs.sendMessage.mockReset();

  // タブを登録
  await tabStateManager.registerTab(1, {
    url: "https://youtube.com/watch?v=123",
    title: "Test Video",
  });

  // シアターモードを設定
  await stateStore.dispatch(ActionCreator.setTheaterMode(true));
  await stateStore.dispatch(ActionCreator.updateOpacity(0.5));

  // タブに通知
  await tabStateManager.notifyTab(1);

  // Chrome API のモックを確認
  console.assert(
    chrome.tabs.sendMessage.mock.calls.length === 1,
    "tabs.sendMessage should be called once"
  );
  console.assert(
    chrome.tabs.sendMessage.mock.calls[0][0] === 1,
    "tabs.sendMessage should be called with tabId=1"
  );

  const message = chrome.tabs.sendMessage.mock.calls[0][1];
  console.assert(
    message.action === "syncState",
    "Message action should be 'syncState'"
  );
  console.assert(
    message.state.theaterModeEnabled === true,
    "Message should include theaterModeEnabled=true"
  );
  console.assert(
    message.state.opacity === 0.5,
    "Message should include opacity=0.5"
  );

  // 存在しないタブへの通知
  await tabStateManager.notifyTab(999);

  // Chrome API のモックを確認（呼び出し回数は変わらない）
  console.assert(
    chrome.tabs.sendMessage.mock.calls.length === 1,
    "tabs.sendMessage should not be called for non-existent tab"
  );

  // クリーンアップ
  tabStateManager.dispose();

  console.log("✓ Tab notification tests passed");
}

/**
 * 定期同期テスト
 */
async function testPeriodicSync() {
  console.log("Testing periodic sync...");

  // StateStore を作成
  const stateStore = new StateStore({
    logger,
    errorHandler,
  });

  // TabStateManager を作成（短い同期間隔）
  const tabStateManager = new TabStateManager({
    stateStore,
    logger,
    errorHandler,
    syncIntervalTime: 100, // 100ms
  });

  // タブを登録
  await tabStateManager.registerTab(1, {
    url: "https://youtube.com/watch?v=123",
    title: "Test Video",
  });

  // Chrome API のモックをリセット
  chrome.tabs.sendMessage.mockReset();

  // 少し待機して同期が実行されるのを確認
  await new Promise((resolve) => setTimeout(resolve, 150));

  // Chrome API のモックを確認
  console.assert(
    chrome.tabs.sendMessage.mock.calls.length >= 1,
    "tabs.sendMessage should be called by periodic sync"
  );

  // 同期を停止
  tabStateManager.stopPeriodicSync();
  console.assert(
    tabStateManager.syncInterval === null,
    "Sync interval should be cleared"
  );

  // Chrome API のモックをリセット
  chrome.tabs.sendMessage.mockReset();

  // さらに待機しても同期が実行されないことを確認
  await new Promise((resolve) => setTimeout(resolve, 150));
  console.assert(
    chrome.tabs.sendMessage.mock.calls.length === 0,
    "tabs.sendMessage should not be called after stopping sync"
  );

  // クリーンアップ
  tabStateManager.dispose();

  console.log("✓ Periodic sync tests passed");
}

/**
 * ロック機構テスト
 */
async function testLockMechanism() {
  console.log("Testing lock mechanism...");

  // StateStore を作成
  const stateStore = new StateStore({
    logger,
    errorHandler,
  });

  // TabStateManager を作成
  const tabStateManager = new TabStateManager({
    stateStore,
    logger,
    errorHandler,
  });

  // ロックを取得
  const lock1 = tabStateManager.acquireLock("test");
  console.assert(lock1 === true, "First lock acquisition should succeed");

  // 同じロックを再取得
  const lock2 = tabStateManager.acquireLock("test");
  console.assert(lock2 === false, "Second lock acquisition should fail");

  // ロックを解放
  tabStateManager.releaseLock("test");

  // ロックを再取得
  const lock3 = tabStateManager.acquireLock("test");
  console.assert(
    lock3 === true,
    "Lock acquisition after release should succeed"
  );

  // ロックタイムアウトをテスト
  tabStateManager.lockTimeout = 50; // 50ms

  // 少し待機してロックがタイムアウトするのを確認
  await new Promise((resolve) => setTimeout(resolve, 100));

  // タイムアウトしたロックを再取得
  const lock4 = tabStateManager.acquireLock("test");
  console.assert(
    lock4 === true,
    "Lock acquisition after timeout should succeed"
  );

  // クリーンアップ
  tabStateManager.dispose();

  console.log("✓ Lock mechanism tests passed");
}

// Node.js環境でテストを実行
if (typeof require !== "undefined" && require.main === module) {
  // jest.fn のモック
  global.jest = {
    fn: () => {
      const mockFn = (...args) => {
        mockFn.mock.calls.push(args);
        if (mockFn.mockImplementation) {
          return mockFn.mockImplementation(...args);
        }
      };
      mockFn.mock = { calls: [] };
      mockFn.mockImplementation = (impl) => {
        mockFn.mockImplementation = impl;
        return mockFn;
      };
      mockFn.mockReset = () => {
        mockFn.mock.calls = [];
        mockFn.mockImplementation = null;
      };
      return mockFn;
    },
  };

  runTests().catch(console.error);
}

// ブラウザ環境でのエクスポート
if (typeof window !== "undefined") {
  window.runTabStateManagerTests = runTests;
}
