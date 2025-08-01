/**
 * StateStore のテスト
 */

// 依存関係のインポート
const {
  ActionType,
  ActionCreator,
  StateStore,
} = require("../infrastructure/state-store.js");
const { Logger } = require("../infrastructure/logger.js");
const { ErrorHandler } = require("../infrastructure/error-handler.js");

// テスト用のロガーとエラーハンドラーを作成
const logger = new Logger("StateStoreTest", { level: Logger.LogLevel.DEBUG });
const errorHandler = new ErrorHandler(logger);

/**
 * テスト実行関数
 */
function runTests() {
  console.log("=== StateStore Tests ===");

  // 各テストを実行
  testInitialization();
  testActionDispatching();
  testSubscription();
  testPathSubscription();
  testMiddleware();
  testBatchDispatch();
  testTheaterModeActions();
  testTabActions();
  testSettingsActions();
  testUIActions();

  console.log("=== All StateStore Tests Completed ===");
}

/**
 * 初期化テスト
 */
function testInitialization() {
  console.log("Testing initialization...");

  // デフォルト初期化
  const store1 = new StateStore({ logger, errorHandler });
  const state1 = store1.getState();

  console.assert(
    state1.theaterMode.isEnabled === false,
    "Default theaterMode.isEnabled should be false"
  );
  console.assert(
    state1.theaterMode.opacity === 0.7,
    "Default theaterMode.opacity should be 0.7"
  );
  console.assert(
    state1.tabs.activeTabId === null,
    "Default tabs.activeTabId should be null"
  );

  // カスタム初期状態での初期化
  const customInitialState = {
    theaterMode: {
      isEnabled: true,
      opacity: 0.5,
      isInitialized: true,
      lastUpdated: 123456789,
    },
    tabs: {
      activeTabId: 123,
      tabStates: new Map(),
      lastSync: 123456789,
    },
    ui: {
      popupOpen: true,
      connectionStatus: "connected",
      lastError: null,
    },
    settings: {
      opacity: 0.5,
      keyboardShortcut: "y",
      theaterModeEnabled: true,
      version: "1.1.0",
    },
  };

  const store2 = new StateStore({
    initialState: customInitialState,
    logger,
    errorHandler,
  });
  const state2 = store2.getState();

  console.assert(
    state2.theaterMode.isEnabled === true,
    "Custom theaterMode.isEnabled should be true"
  );
  console.assert(
    state2.theaterMode.opacity === 0.5,
    "Custom theaterMode.opacity should be 0.5"
  );
  console.assert(
    state2.tabs.activeTabId === 123,
    "Custom tabs.activeTabId should be 123"
  );
  console.assert(
    state2.settings.keyboardShortcut === "y",
    "Custom settings.keyboardShortcut should be 'y'"
  );

  console.log("✓ Initialization tests passed");
}

/**
 * アクションディスパッチテスト
 */
async function testActionDispatching() {
  console.log("Testing action dispatching...");

  const store = new StateStore({ logger, errorHandler });

  // 初期化アクション
  const initAction = ActionCreator.initialize({
    settings: { theaterModeEnabled: true, opacity: 0.6 },
  });

  const initResult = await store.dispatch(initAction);
  console.assert(initResult.success, "Initialize action should succeed");
  console.assert(
    store.getState().theaterMode.isEnabled === true,
    "theaterMode.isEnabled should be updated to true"
  );
  console.assert(
    store.getState().theaterMode.opacity === 0.6,
    "theaterMode.opacity should be updated to 0.6"
  );

  // シアターモード切替アクション
  const toggleAction = ActionCreator.toggleTheaterMode();
  const toggleResult = await store.dispatch(toggleAction);
  console.assert(toggleResult.success, "Toggle action should succeed");
  console.assert(
    store.getState().theaterMode.isEnabled === false,
    "theaterMode.isEnabled should be toggled to false"
  );

  // 透明度更新アクション
  const opacityAction = ActionCreator.updateOpacity(0.8);
  const opacityResult = await store.dispatch(opacityAction);
  console.assert(opacityResult.success, "Opacity update action should succeed");
  console.assert(
    store.getState().theaterMode.opacity === 0.8,
    "theaterMode.opacity should be updated to 0.8"
  );

  // 無効なアクション
  const invalidResult = await store.dispatch({ type: "INVALID_ACTION" });
  console.assert(
    invalidResult.success,
    "Invalid action type should still succeed but not change state"
  );

  // アクション履歴
  const history = store.getActionHistory();
  console.assert(
    history.length === 3,
    "Action history should contain 3 actions"
  );
  console.assert(
    history[0].action.type === ActionType.INITIALIZE,
    "First action should be INITIALIZE"
  );
  console.assert(
    history[1].action.type === ActionType.THEATER_MODE_TOGGLE,
    "Second action should be THEATER_MODE_TOGGLE"
  );
  console.assert(
    history[2].action.type === ActionType.OPACITY_UPDATE,
    "Third action should be OPACITY_UPDATE"
  );

  console.log("✓ Action dispatching tests passed");
}

/**
 * サブスクリプションテスト
 */
async function testSubscription() {
  console.log("Testing subscription...");

  const store = new StateStore({ logger, errorHandler });
  let callCount = 0;

  // リスナーを登録
  const unsubscribe = store.subscribe(() => {
    callCount++;
  });

  // アクションをディスパッチ
  await store.dispatch(ActionCreator.toggleTheaterMode());
  console.assert(callCount === 1, "Listener should be called once");

  await store.dispatch(ActionCreator.updateOpacity(0.5));
  console.assert(callCount === 2, "Listener should be called twice");

  // リスナーを解除
  unsubscribe();

  // さらにアクションをディスパッチ
  await store.dispatch(ActionCreator.toggleTheaterMode());
  console.assert(
    callCount === 2,
    "Listener should not be called after unsubscribe"
  );

  console.log("✓ Subscription tests passed");
}

/**
 * パスサブスクリプションテスト
 */
async function testPathSubscription() {
  console.log("Testing path subscription...");

  const store = new StateStore({ logger, errorHandler });
  let theaterModeCallCount = 0;
  let opacityCallCount = 0;

  // 特定パスのリスナーを登録
  const unsubscribeTheaterMode = store.subscribeToPath(
    "theaterMode.isEnabled",
    (value) => {
      theaterModeCallCount++;
    }
  );

  const unsubscribeOpacity = store.subscribeToPath(
    "theaterMode.opacity",
    (value) => {
      opacityCallCount++;
    }
  );

  // シアターモード切替アクション
  await store.dispatch(ActionCreator.toggleTheaterMode());
  console.assert(
    theaterModeCallCount === 1,
    "theaterMode.isEnabled listener should be called once"
  );
  console.assert(
    opacityCallCount === 0,
    "theaterMode.opacity listener should not be called"
  );

  // 透明度更新アクション
  await store.dispatch(ActionCreator.updateOpacity(0.5));
  console.assert(
    theaterModeCallCount === 1,
    "theaterMode.isEnabled listener should still be called once"
  );
  console.assert(
    opacityCallCount === 1,
    "theaterMode.opacity listener should be called once"
  );

  // 同じ値で更新（変更なし）
  await store.dispatch(ActionCreator.updateOpacity(0.5));
  console.assert(
    opacityCallCount === 1,
    "theaterMode.opacity listener should not be called when value doesn't change"
  );

  // リスナーを解除
  unsubscribeTheaterMode();
  unsubscribeOpacity();

  // さらにアクションをディスパッチ
  await store.dispatch(ActionCreator.toggleTheaterMode());
  await store.dispatch(ActionCreator.updateOpacity(0.8));
  console.assert(
    theaterModeCallCount === 1,
    "theaterMode.isEnabled listener should not be called after unsubscribe"
  );
  console.assert(
    opacityCallCount === 1,
    "theaterMode.opacity listener should not be called after unsubscribe"
  );

  console.log("✓ Path subscription tests passed");
}

/**
 * ミドルウェアテスト
 */
async function testMiddleware() {
  console.log("Testing middleware...");

  const store = new StateStore({ logger, errorHandler });
  let middlewareCallCount = 0;

  // ミドルウェアを追加
  store.addMiddleware((action, state) => {
    middlewareCallCount++;

    // アクションを変更
    if (action.type === ActionType.OPACITY_UPDATE) {
      return {
        ...action,
        payload: { opacity: 0.3 }, // 常に0.3に変更
      };
    }

    return action;
  });

  // 透明度更新アクション
  await store.dispatch(ActionCreator.updateOpacity(0.8));
  console.assert(middlewareCallCount === 1, "Middleware should be called once");
  console.assert(
    store.getState().theaterMode.opacity === 0.3,
    "Middleware should modify opacity to 0.3"
  );

  console.log("✓ Middleware tests passed");
}

/**
 * バッチディスパッチテスト
 */
async function testBatchDispatch() {
  console.log("Testing batch dispatch...");

  const store = new StateStore({ logger, errorHandler });

  // 複数のアクションを作成
  const actions = [
    ActionCreator.setTheaterMode(true),
    ActionCreator.updateOpacity(0.4),
    ActionCreator.updateUI({ connectionStatus: "connected" }),
  ];

  // バッチディスパッチ
  const result = await store.batchDispatch(actions);
  console.assert(result.success, "Batch dispatch should succeed");
  console.assert(result.data.length === 3, "Result should contain 3 items");

  // 状態を確認
  const state = store.getState();
  console.assert(
    state.theaterMode.isEnabled === true,
    "theaterMode.isEnabled should be true"
  );
  console.assert(
    state.theaterMode.opacity === 0.4,
    "theaterMode.opacity should be 0.4"
  );
  console.assert(
    state.ui.connectionStatus === "connected",
    "ui.connectionStatus should be 'connected'"
  );

  console.log("✓ Batch dispatch tests passed");
}

/**
 * シアターモードアクションテスト
 */
async function testTheaterModeActions() {
  console.log("Testing theater mode actions...");

  const store = new StateStore({ logger, errorHandler });

  // シアターモード設定
  await store.dispatch(ActionCreator.setTheaterMode(true));
  console.assert(
    store.getState().theaterMode.isEnabled === true,
    "theaterMode.isEnabled should be true"
  );
  console.assert(
    store.getState().settings.theaterModeEnabled === true,
    "settings.theaterModeEnabled should also be true"
  );

  // シアターモード切替
  await store.dispatch(ActionCreator.toggleTheaterMode());
  console.assert(
    store.getState().theaterMode.isEnabled === false,
    "theaterMode.isEnabled should be toggled to false"
  );
  console.assert(
    store.getState().settings.theaterModeEnabled === false,
    "settings.theaterModeEnabled should also be false"
  );

  // 透明度更新（範囲内）
  await store.dispatch(ActionCreator.updateOpacity(0.5));
  console.assert(
    store.getState().theaterMode.opacity === 0.5,
    "theaterMode.opacity should be 0.5"
  );

  // 透明度更新（範囲外）
  await store.dispatch(ActionCreator.updateOpacity(1.5));
  console.assert(
    store.getState().theaterMode.opacity === 0.9,
    "theaterMode.opacity should be clamped to 0.9"
  );

  await store.dispatch(ActionCreator.updateOpacity(-0.5));
  console.assert(
    store.getState().theaterMode.opacity === 0,
    "theaterMode.opacity should be clamped to 0"
  );

  console.log("✓ Theater mode action tests passed");
}

/**
 * タブアクションテスト
 */
async function testTabActions() {
  console.log("Testing tab actions...");

  const store = new StateStore({ logger, errorHandler });

  // タブ登録
  await store.dispatch(
    ActionCreator.registerTab(1, {
      url: "https://youtube.com/watch?v=123",
      title: "Test Video",
    })
  );
  console.assert(
    store.getState().tabs.tabStates.has(1),
    "Tab 1 should be registered"
  );
  console.assert(
    store.getState().tabs.activeTabId === 1,
    "Tab 1 should be active"
  );

  // 別のタブを登録
  await store.dispatch(
    ActionCreator.registerTab(2, {
      url: "https://youtube.com/watch?v=456",
      title: "Another Video",
    })
  );
  console.assert(
    store.getState().tabs.tabStates.has(2),
    "Tab 2 should be registered"
  );
  console.assert(
    store.getState().tabs.activeTabId === 1,
    "Tab 1 should still be active"
  );

  // タブアクティブ化
  await store.dispatch(ActionCreator.activateTab(2));
  console.assert(
    store.getState().tabs.activeTabId === 2,
    "Tab 2 should now be active"
  );
  console.assert(
    store.getState().tabs.tabStates.get(1).isActive === false,
    "Tab 1 should be inactive"
  );
  console.assert(
    store.getState().tabs.tabStates.get(2).isActive === true,
    "Tab 2 should be active"
  );

  // タブ更新
  await store.dispatch(ActionCreator.updateTab(2, { title: "Updated Title" }));
  console.assert(
    store.getState().tabs.tabStates.get(2).title === "Updated Title",
    "Tab 2 title should be updated"
  );

  // タブ同期
  await store.dispatch(ActionCreator.setTheaterMode(true));
  await store.dispatch(ActionCreator.syncTab(1));
  console.assert(
    store.getState().tabs.tabStates.get(1).theaterModeEnabled === true,
    "Tab 1 should be synced with theaterModeEnabled=true"
  );

  // タブ登録解除
  await store.dispatch(ActionCreator.unregisterTab(1));
  console.assert(
    !store.getState().tabs.tabStates.has(1),
    "Tab 1 should be unregistered"
  );
  console.assert(
    store.getState().tabs.activeTabId === 2,
    "Tab 2 should still be active"
  );

  // アクティブタブの登録解除
  await store.dispatch(ActionCreator.unregisterTab(2));
  console.assert(
    !store.getState().tabs.tabStates.has(2),
    "Tab 2 should be unregistered"
  );
  console.assert(
    store.getState().tabs.activeTabId === null,
    "No tab should be active"
  );

  console.log("✓ Tab action tests passed");
}

/**
 * 設定アクションテスト
 */
async function testSettingsActions() {
  console.log("Testing settings actions...");

  const store = new StateStore({ logger, errorHandler });

  // 設定読み込み
  await store.dispatch(
    ActionCreator.loadSettings({
      theaterModeEnabled: true,
      opacity: 0.6,
      keyboardShortcut: "y",
      version: "1.1.0",
    })
  );

  console.assert(
    store.getState().settings.theaterModeEnabled === true,
    "settings.theaterModeEnabled should be true"
  );
  console.assert(
    store.getState().settings.opacity === 0.6,
    "settings.opacity should be 0.6"
  );
  console.assert(
    store.getState().settings.keyboardShortcut === "y",
    "settings.keyboardShortcut should be 'y'"
  );
  console.assert(
    store.getState().settings.version === "1.1.0",
    "settings.version should be '1.1.0'"
  );

  // シアターモード状態も更新されていることを確認
  console.assert(
    store.getState().theaterMode.isEnabled === true,
    "theaterMode.isEnabled should also be true"
  );
  console.assert(
    store.getState().theaterMode.opacity === 0.6,
    "theaterMode.opacity should also be 0.6"
  );

  // 設定更新
  await store.dispatch(
    ActionCreator.updateSettings({
      keyboardShortcut: "z",
      theaterModeEnabled: false,
    })
  );

  console.assert(
    store.getState().settings.keyboardShortcut === "z",
    "settings.keyboardShortcut should be updated to 'z'"
  );
  console.assert(
    store.getState().settings.theaterModeEnabled === false,
    "settings.theaterModeEnabled should be updated to false"
  );
  console.assert(
    store.getState().theaterMode.isEnabled === false,
    "theaterMode.isEnabled should also be updated to false"
  );

  console.log("✓ Settings action tests passed");
}

/**
 * UIアクションテスト
 */
async function testUIActions() {
  console.log("Testing UI actions...");

  const store = new StateStore({ logger, errorHandler });

  // UI更新
  await store.dispatch(
    ActionCreator.updateUI({
      popupOpen: true,
      connectionStatus: "connected",
    })
  );

  console.assert(
    store.getState().ui.popupOpen === true,
    "ui.popupOpen should be true"
  );
  console.assert(
    store.getState().ui.connectionStatus === "connected",
    "ui.connectionStatus should be 'connected'"
  );

  // エラー設定
  await store.dispatch(
    ActionCreator.updateUI({
      lastError: { message: "Test error", code: 123 },
    })
  );

  console.assert(
    store.getState().ui.lastError.message === "Test error",
    "ui.lastError.message should be 'Test error'"
  );

  // UIリセット
  await store.dispatch(ActionCreator.resetUI());

  console.assert(
    store.getState().ui.popupOpen === false,
    "ui.popupOpen should be reset to false"
  );
  console.assert(
    store.getState().ui.connectionStatus === "disconnected",
    "ui.connectionStatus should be reset to 'disconnected'"
  );
  console.assert(
    store.getState().ui.lastError === null,
    "ui.lastError should be reset to null"
  );

  console.log("✓ UI action tests passed");
}

// Node.js環境でテストを実行
if (typeof require !== "undefined" && require.main === module) {
  runTests();
}

// ブラウザ環境でのエクスポート
if (typeof window !== "undefined") {
  window.runStateStoreTests = runTests;
}
