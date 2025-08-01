/**
 * KeyboardShortcutManager のテスト
 */

// 依存関係のモック
class MockLogger {
  debug() {}
  info() {}
  warn() {}
  error() {}
}

class MockErrorHandler {
  wrapSync(fn) {
    try {
      const result = fn();
      return { isSuccess: () => true, isFailure: () => false, data: result };
    } catch (error) {
      return { isSuccess: () => false, isFailure: () => true, error };
    }
  }

  wrapAsync(fn) {
    return Promise.resolve(fn())
      .then((result) => ({
        isSuccess: () => true,
        isFailure: () => false,
        data: result,
      }))
      .catch((error) => ({
        isSuccess: () => false,
        isFailure: () => true,
        error,
      }));
  }
}

class MockStateStore {
  constructor(initialState = {}) {
    this.state = {
      theaterMode: {
        isEnabled: false,
        opacity: 0.7,
      },
      settings: {
        shortcuts: {},
      },
      ...initialState,
    };
    this.listeners = new Map();
    this.dispatchCalls = [];
  }

  getState() {
    return this.state;
  }

  getStateValue(path, defaultValue) {
    const parts = path.split(".");
    let value = this.state;

    for (const part of parts) {
      if (value === undefined || value === null) {
        return defaultValue;
      }
      value = value[part];
    }

    return value !== undefined ? value : defaultValue;
  }

  subscribeToPath(path, listener) {
    this.listeners.set(path, listener);
    return () => this.listeners.delete(path);
  }

  async dispatch(action) {
    this.dispatchCalls.push(action);

    // 簡易的なリデューサー
    if (action.type === "THEATER_MODE_TOGGLE") {
      this.state.theaterMode.isEnabled = !this.state.theaterMode.isEnabled;
    } else if (action.type === "OPACITY_UPDATE") {
      this.state.theaterMode.opacity = action.payload.opacity;
    } else if (action.type === "SETTINGS_UPDATE") {
      this.state.settings = {
        ...this.state.settings,
        ...action.payload.updates,
      };
    }

    return { isSuccess: () => true, isFailure: () => false, data: this.state };
  }
}

// ActionCreator モック
const ActionCreator = {
  toggleTheaterMode: () => ({ type: "THEATER_MODE_TOGGLE" }),
  updateOpacity: (opacity) => ({
    type: "OPACITY_UPDATE",
    payload: { opacity },
  }),
  updateSettings: (updates) => ({
    type: "SETTINGS_UPDATE",
    payload: { updates },
  }),
};

// キーボードイベントを作成するヘルパー関数
function createKeyboardEvent(key, modifiers = {}) {
  return {
    key,
    ctrlKey: !!modifiers.ctrl,
    shiftKey: !!modifiers.shift,
    altKey: !!modifiers.alt,
    metaKey: !!modifiers.meta,
    preventDefault: () => {},
    stopPropagation: () => {},
  };
}

// テスト関数
function runKeyboardShortcutTests() {
  console.log("Running KeyboardShortcutManager tests...");

  // テスト環境のセットアップ
  const setupTestEnvironment = () => {
    // グローバルに ActionCreator を設定
    window.ActionCreator = ActionCreator;

    // 依存オブジェクトを作成
    const dependencies = {
      logger: new MockLogger(),
      errorHandler: new MockErrorHandler(),
      stateStore: new MockStateStore(),
    };

    // マネージャーを作成
    const manager = new KeyboardShortcutManager(dependencies);

    return { manager, dependencies };
  };

  // テスト1: 初期化
  async function testInitialization() {
    console.log("Test 1: Initialization");

    const { manager, dependencies } = setupTestEnvironment();
    const result = await manager.initialize();

    console.assert(
      result.isSuccess() && result.data === true,
      "Manager should initialize successfully"
    );

    // デフォルトショートカットが設定されているか確認
    const shortcuts = manager.getShortcuts().data;
    console.assert(
      shortcuts.size === 3,
      "Manager should have 3 default shortcuts"
    );
    console.assert(
      shortcuts.has("theaterMode"),
      "Manager should have theaterMode shortcut"
    );

    console.log("Test 1: Passed");
  }

  // テスト2: ショートカットの登録と削除
  async function testShortcutRegistration() {
    console.log("Test 2: Shortcut Registration");

    const { manager } = setupTestEnvironment();
    await manager.initialize();

    // 新しいショートカットを登録
    const result = manager.registerShortcut("testShortcut", {
      key: "x",
      modifiers: { ctrl: true, shift: false },
      description: "Test shortcut",
      action: "testAction",
      context: "global",
    });

    console.assert(
      result.isSuccess() && result.data === true,
      "Shortcut registration should succeed"
    );

    // 登録されたショートカットを取得
    const shortcut = manager.getShortcuts("testShortcut").data;
    console.assert(
      shortcut && shortcut.key === "x",
      "Registered shortcut should be retrievable"
    );

    // ショートカットを削除
    const deleteResult = manager.unregisterShortcut("testShortcut");
    console.assert(
      deleteResult.isSuccess() && deleteResult.data === true,
      "Shortcut unregistration should succeed"
    );

    // 削除されたことを確認
    const deletedShortcut = manager.getShortcuts("testShortcut").data;
    console.assert(
      deletedShortcut === null,
      "Unregistered shortcut should not be retrievable"
    );

    console.log("Test 2: Passed");
  }

  // テスト3: ショートカットの有効化/無効化
  async function testShortcutEnabling() {
    console.log("Test 3: Shortcut Enabling/Disabling");

    const { manager } = setupTestEnvironment();
    await manager.initialize();

    // 特定のショートカットを無効化
    const disableResult = manager.setShortcutEnabled("theaterMode", false);
    console.assert(
      disableResult.isSuccess() && disableResult.data === true,
      "Disabling shortcut should succeed"
    );

    // 無効化されたことを確認
    const disabledShortcut = manager.getShortcuts("theaterMode").data;
    console.assert(
      disabledShortcut && disabledShortcut.enabled === false,
      "Shortcut should be disabled"
    );

    // 特定のショートカットを再度有効化
    const enableResult = manager.setShortcutEnabled("theaterMode", true);
    console.assert(
      enableResult.isSuccess() && enableResult.data === true,
      "Enabling shortcut should succeed"
    );

    // 有効化されたことを確認
    const enabledShortcut = manager.getShortcuts("theaterMode").data;
    console.assert(
      enabledShortcut && enabledShortcut.enabled === true,
      "Shortcut should be enabled"
    );

    // 全てのショートカットを無効化
    const disableAllResult = manager.setAllShortcutsEnabled(false);
    console.assert(
      disableAllResult.isSuccess() && disableAllResult.data === true,
      "Disabling all shortcuts should succeed"
    );

    // 全て無効化されたことを確認
    const allShortcuts = manager.getShortcuts().data;
    let allDisabled = true;
    for (const [id, shortcut] of allShortcuts.entries()) {
      if (shortcut.enabled) {
        allDisabled = false;
        break;
      }
    }
    console.assert(allDisabled, "All shortcuts should be disabled");

    console.log("Test 3: Passed");
  }

  // テスト4: ショートカットの実行
  async function testShortcutExecution() {
    console.log("Test 4: Shortcut Execution");

    const { manager, dependencies } = setupTestEnvironment();
    await manager.initialize();

    // アクションハンドラーを登録
    let actionExecuted = false;
    manager.registerActionHandlers({
      testAction: () => {
        actionExecuted = true;
      },
    });

    // カスタムショートカットを登録
    manager.registerShortcut("testExecutionShortcut", {
      key: "z",
      modifiers: { ctrl: true },
      action: "testAction",
    });

    // ショートカットをシミュレート
    manager._handleKeyDown(createKeyboardEvent("z", { ctrl: true }));

    // アクションが実行されたことを確認
    console.assert(actionExecuted, "Action handler should be executed");

    // StateStoreアクションをシミュレート
    manager._handleKeyDown(
      createKeyboardEvent("t", { ctrl: true, shift: true })
    );

    // StateStoreにアクションがディスパッチされたことを確認
    console.assert(
      dependencies.stateStore.dispatchCalls.length === 1,
      "Action should be dispatched to StateStore"
    );
    console.assert(
      dependencies.stateStore.dispatchCalls[0].type === "THEATER_MODE_TOGGLE",
      "Correct action type should be dispatched"
    );

    console.log("Test 4: Passed");
  }

  // テスト5: 設定の保存と読み込み
  async function testSettingsPersistence() {
    console.log("Test 5: Settings Persistence");

    const { manager, dependencies } = setupTestEnvironment();
    await manager.initialize();

    // ショートカットを変更
    manager.registerShortcut("theaterMode", {
      key: "y",
      modifiers: { ctrl: true, shift: true },
      description: "変更されたショートカット",
      action: "toggleTheaterMode",
    });

    // 設定を保存
    const saveResult = await manager.saveShortcuts();
    console.assert(
      saveResult.isSuccess() && saveResult.data === true,
      "Saving shortcuts should succeed"
    );

    // StateStoreにアクションがディスパッチされたことを確認
    console.assert(
      dependencies.stateStore.dispatchCalls.length === 1,
      "Settings update action should be dispatched"
    );
    console.assert(
      dependencies.stateStore.dispatchCalls[0].type === "SETTINGS_UPDATE",
      "Correct action type should be dispatched"
    );

    // 設定が保存されたことを確認
    const savedShortcuts = dependencies.stateStore.state.settings.shortcuts;
    console.assert(
      savedShortcuts && savedShortcuts.theaterMode,
      "Shortcuts should be saved in settings"
    );
    console.assert(
      savedShortcuts.theaterMode.key === "y",
      "Correct shortcut key should be saved"
    );

    console.log("Test 5: Passed");
  }

  // テスト6: クリーンアップ
  async function testCleanup() {
    console.log("Test 6: Cleanup");

    const { manager } = setupTestEnvironment();
    await manager.initialize();

    // クリーンアップ前にイベントリスナーが設定されていることを確認
    console.assert(
      manager.eventListeners.size > 0,
      "Event listeners should be set up"
    );

    // クリーンアップ
    const cleanupResult = manager.cleanup();
    console.assert(
      cleanupResult.isSuccess() && cleanupResult.data === true,
      "Cleanup should succeed"
    );

    // イベントリスナーがクリアされたことを確認
    console.assert(
      manager.eventListeners.size === 0,
      "Event listeners should be cleared"
    );

    console.log("Test 6: Passed");
  }

  // 全テストを実行
  async function runAllTests() {
    try {
      await testInitialization();
      await testShortcutRegistration();
      await testShortcutEnabling();
      await testShortcutExecution();
      await testSettingsPersistence();
      await testCleanup();

      console.log("All KeyboardShortcutManager tests passed!");
    } catch (error) {
      console.error("Test failed:", error);
    }
  }

  runAllTests();
}

// テストの実行
if (typeof window !== "undefined") {
  // ブラウザ環境
  if (document.readyState === "complete") {
    runKeyboardShortcutTests();
  } else {
    window.addEventListener("load", runKeyboardShortcutTests);
  }
} else if (typeof module !== "undefined" && module.exports) {
  // Node.js環境
  module.exports = { runKeyboardShortcutTests };
}
