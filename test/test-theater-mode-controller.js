/**
 * TheaterModeController のテスト
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
        isInitialized: false,
        lastUpdated: 0,
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
    } else if (action.type === "THEATER_MODE_SET") {
      this.state.theaterMode.isEnabled = action.payload.enabled;
    } else if (action.type === "OPACITY_UPDATE") {
      this.state.theaterMode.opacity = action.payload.opacity;
    }

    // リスナーに通知
    if (this.listeners.has("theaterMode")) {
      this.listeners.get("theaterMode")(this.state.theaterMode);
    }

    return { isSuccess: () => true, isFailure: () => false, data: this.state };
  }
}

class MockElementManager {
  constructor() {
    this.selectors = {
      videoControls: [".ytp-chrome-controls", ".video-stream"],
    };
  }

  async detectVideoPlayer() {
    const mockPlayer = document.createElement("div");
    mockPlayer.id = "movie_player";
    return { isSuccess: () => true, isFailure: () => false, data: mockPlayer };
  }

  findOverlayTargets() {
    const targets = [
      document.createElement("div"),
      document.createElement("div"),
    ];
    targets[0].id = "secondary";
    targets[1].id = "comments";
    return { isSuccess: () => true, isFailure: () => false, data: targets };
  }

  findElementsWithFallback() {
    const controls = [document.createElement("div")];
    controls[0].className = "ytp-chrome-controls";
    return { isSuccess: () => true, isFailure: () => false, data: controls };
  }
}

class MockOverlayManager {
  constructor() {
    this.active = false;
    this.opacity = 0.7;
    this.applyCalls = [];
    this.clearCalls = [];
    this.opacityUpdateCalls = [];
  }

  isOverlayActive() {
    return this.active;
  }

  getOpacity() {
    return this.opacity;
  }

  applyOverlay(targets, protectedElements) {
    this.applyCalls.push({ targets, protectedElements });
    this.active = true;
    return { isSuccess: () => true, isFailure: () => false, data: true };
  }

  clearOverlay() {
    this.clearCalls.push({});
    this.active = false;
    return { isSuccess: () => true, isFailure: () => false, data: true };
  }

  updateOpacity(opacity) {
    this.opacityUpdateCalls.push({ opacity });
    this.opacity = opacity;
    return { isSuccess: () => true, isFailure: () => false, data: opacity };
  }
}

// ActionCreator モック
const ActionCreator = {
  toggleTheaterMode: () => ({ type: "THEATER_MODE_TOGGLE" }),
  setTheaterMode: (enabled) => ({
    type: "THEATER_MODE_SET",
    payload: { enabled },
  }),
  updateOpacity: (opacity) => ({
    type: "OPACITY_UPDATE",
    payload: { opacity },
  }),
};

// テスト関数
function runTheaterModeControllerTests() {
  console.log("Running TheaterModeController tests...");

  // テスト環境のセットアップ
  const setupTestEnvironment = () => {
    // グローバルに ActionCreator を設定
    window.ActionCreator = ActionCreator;

    // 依存オブジェクトを作成
    const dependencies = {
      logger: new MockLogger(),
      errorHandler: new MockErrorHandler(),
      stateStore: new MockStateStore(),
      elementManager: new MockElementManager(),
      overlayManager: new MockOverlayManager(),
    };

    // コントローラーを作成
    const controller = new TheaterModeController(dependencies);

    return { controller, dependencies };
  };

  // テスト1: 初期化
  async function testInitialization() {
    console.log("Test 1: Initialization");

    const { controller, dependencies } = setupTestEnvironment();
    const result = await controller.initialize();

    console.assert(
      result.isSuccess() && result.data === true,
      "Controller should initialize successfully"
    );
    console.assert(
      controller.initialized === true,
      "Controller should be marked as initialized"
    );

    console.log("Test 1: Passed");
  }

  // テスト2: シアターモードの切り替え
  async function testToggleTheaterMode() {
    console.log("Test 2: Toggle Theater Mode");

    const { controller, dependencies } = setupTestEnvironment();
    await controller.initialize();

    // 初期状態を確認
    console.assert(
      controller.isTheaterModeEnabled() === false,
      "Theater mode should be disabled initially"
    );

    // シアターモードを有効化
    const result1 = await controller.toggle();
    console.assert(
      result1.isSuccess() && result1.data === true,
      "Toggle should enable theater mode"
    );
    console.assert(
      controller.isTheaterModeEnabled() === true,
      "Theater mode should be enabled after toggle"
    );
    console.assert(
      dependencies.overlayManager.applyCalls.length === 1,
      "Overlay should be applied"
    );

    // シアターモードを無効化
    const result2 = await controller.toggle();
    console.assert(
      result2.isSuccess() && result2.data === false,
      "Toggle should disable theater mode"
    );
    console.assert(
      controller.isTheaterModeEnabled() === false,
      "Theater mode should be disabled after second toggle"
    );
    console.assert(
      dependencies.overlayManager.clearCalls.length === 1,
      "Overlay should be cleared"
    );

    console.log("Test 2: Passed");
  }

  // テスト3: 透明度の更新
  async function testUpdateOpacity() {
    console.log("Test 3: Update Opacity");

    const { controller, dependencies } = setupTestEnvironment();
    await controller.initialize();

    // 初期透明度を確認
    console.assert(
      controller.currentOpacity === 0.7,
      "Initial opacity should be 0.7"
    );

    // 透明度を更新
    const newOpacity = 0.5;
    const result = await controller.updateOpacity(newOpacity);

    console.assert(
      result.isSuccess() && result.data === newOpacity,
      "Opacity update should succeed"
    );
    console.assert(
      controller.currentOpacity === newOpacity,
      "Current opacity should be updated"
    );
    console.assert(
      dependencies.overlayManager.opacityUpdateCalls.length === 1,
      "Overlay opacity should be updated"
    );
    console.assert(
      dependencies.overlayManager.opacityUpdateCalls[0].opacity === newOpacity,
      "Overlay opacity should match the new value"
    );

    console.log("Test 3: Passed");
  }

  // テスト4: 状態変更の処理
  async function testStateChangeHandling() {
    console.log("Test 4: State Change Handling");

    const { controller, dependencies } = setupTestEnvironment();
    await controller.initialize();

    // 状態を直接変更してリスナーをトリガー
    dependencies.stateStore.state.theaterMode.isEnabled = true;
    dependencies.stateStore.listeners.get("theaterMode")(
      dependencies.stateStore.state.theaterMode
    );

    console.assert(
      dependencies.overlayManager.applyCalls.length === 1,
      "Overlay should be applied when state changes to enabled"
    );

    // 透明度を変更
    dependencies.stateStore.state.theaterMode.opacity = 0.3;
    dependencies.stateStore.listeners.get("theaterMode")(
      dependencies.stateStore.state.theaterMode
    );

    console.assert(
      dependencies.overlayManager.opacityUpdateCalls.length === 1,
      "Opacity should be updated when state changes"
    );
    console.assert(
      dependencies.overlayManager.opacityUpdateCalls[0].opacity === 0.3,
      "Opacity should match the new state value"
    );

    console.log("Test 4: Passed");
  }

  // テスト5: クリーンアップ
  async function testCleanup() {
    console.log("Test 5: Cleanup");

    const { controller, dependencies } = setupTestEnvironment();
    await controller.initialize();

    // シアターモードを有効化
    await controller.enable();
    console.assert(
      dependencies.overlayManager.active === true,
      "Overlay should be active"
    );

    // クリーンアップ
    controller.cleanup();
    console.assert(
      controller.initialized === false,
      "Controller should be marked as not initialized"
    );
    console.assert(
      dependencies.overlayManager.clearCalls.length === 1,
      "Overlay should be cleared during cleanup"
    );

    console.log("Test 5: Passed");
  }

  // 全テストを実行
  async function runAllTests() {
    try {
      await testInitialization();
      await testToggleTheaterMode();
      await testUpdateOpacity();
      await testStateChangeHandling();
      await testCleanup();

      console.log("All TheaterModeController tests passed!");
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
    runTheaterModeControllerTests();
  } else {
    window.addEventListener("load", runTheaterModeControllerTests);
  }
} else if (typeof module !== "undefined" && module.exports) {
  // Node.js環境
  module.exports = { runTheaterModeControllerTests };
}
