/**
 * OpacityController のテスト
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
    if (action.type === "OPACITY_UPDATE") {
      this.state.theaterMode.opacity = action.payload.opacity;

      // リスナーに通知
      if (this.listeners.has("theaterMode.opacity")) {
        this.listeners.get("theaterMode.opacity")(action.payload.opacity);
      }
    }

    return { isSuccess: () => true, isFailure: () => false, data: this.state };
  }
}

// ActionCreator モック
const ActionCreator = {
  updateOpacity: (opacity) => ({
    type: "OPACITY_UPDATE",
    payload: { opacity },
  }),
};

// テスト関数
function runOpacityControllerTests() {
  console.log("Running OpacityController tests...");

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

    // コントローラーを作成
    const controller = new OpacityController(dependencies);

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
      controller.currentOpacity === 0.7,
      "Initial opacity should be 0.7"
    );

    // CSSカスタムプロパティが設定されているか確認
    const opacityVar = document.documentElement.style.getPropertyValue(
      "--theater-mode-opacity"
    );
    console.assert(opacityVar === "0.7", "CSS custom property should be set");

    console.log("Test 1: Passed");
  }

  // テスト2: 透明度の設定
  async function testSetOpacity() {
    console.log("Test 2: Set Opacity");

    const { controller, dependencies } = setupTestEnvironment();
    await controller.initialize();

    // アニメーションなしで透明度を設定
    const newOpacity = 0.5;
    const result = controller.setOpacity(newOpacity, false);

    console.assert(
      result.isSuccess() && result.data === newOpacity,
      "Setting opacity should succeed"
    );
    console.assert(
      controller.currentOpacity === newOpacity,
      "Current opacity should be updated"
    );

    // CSSカスタムプロパティが更新されているか確認
    const opacityVar = document.documentElement.style.getPropertyValue(
      "--theater-mode-opacity"
    );
    console.assert(
      opacityVar === "0.5",
      "CSS custom property should be updated"
    );

    console.log("Test 2: Passed");
  }

  // テスト3: 透明度の増減
  async function testOpacityAdjustment() {
    console.log("Test 3: Opacity Adjustment");

    const { controller, dependencies } = setupTestEnvironment();
    await controller.initialize();

    // 初期値を確認
    console.assert(
      controller.currentOpacity === 0.7,
      "Initial opacity should be 0.7"
    );

    // 透明度を増加
    const increaseResult = controller.increaseOpacity(0.1, false);
    console.assert(
      increaseResult.isSuccess() && increaseResult.data === 0.8,
      "Increasing opacity should succeed"
    );
    console.assert(
      controller.currentOpacity === 0.8,
      "Current opacity should be increased"
    );

    // 透明度を減少
    const decreaseResult = controller.decreaseOpacity(0.2, false);
    console.assert(
      decreaseResult.isSuccess() && decreaseResult.data === 0.6,
      "Decreasing opacity should succeed"
    );
    console.assert(
      controller.currentOpacity === 0.6,
      "Current opacity should be decreased"
    );

    // 最大値を超えないことを確認
    controller.setOpacity(0.9, false);
    const overMaxResult = controller.increaseOpacity(0.2, false);
    console.assert(
      overMaxResult.isSuccess() && overMaxResult.data === 0.9,
      "Opacity should not exceed maximum"
    );

    // 最小値を下回らないことを確認
    controller.setOpacity(0, false);
    const underMinResult = controller.decreaseOpacity(0.2, false);
    console.assert(
      underMinResult.isSuccess() && underMinResult.data === 0,
      "Opacity should not go below minimum"
    );

    console.log("Test 3: Passed");
  }

  // テスト4: 透明度のリセット
  async function testResetOpacity() {
    console.log("Test 4: Reset Opacity");

    const { controller, dependencies } = setupTestEnvironment();
    await controller.initialize();

    // 透明度を変更
    controller.setOpacity(0.3, false);
    console.assert(
      controller.currentOpacity === 0.3,
      "Opacity should be changed"
    );

    // 透明度をリセット
    const resetResult = controller.resetOpacity(false);
    console.assert(
      resetResult.isSuccess() && resetResult.data === 0.7,
      "Resetting opacity should succeed"
    );
    console.assert(
      controller.currentOpacity === 0.7,
      "Opacity should be reset to default"
    );

    console.log("Test 4: Passed");
  }

  // テスト5: StateStoreとの同期
  async function testStateStoreSync() {
    console.log("Test 5: StateStore Synchronization");

    const { controller, dependencies } = setupTestEnvironment();
    await controller.initialize();

    // 透明度を変更
    controller.setOpacity(0.4, false);

    // StateStoreと同期
    const syncResult = await controller.syncToStateStore();
    console.assert(
      syncResult.isSuccess() && syncResult.data === true,
      "Syncing to StateStore should succeed"
    );
    console.assert(
      dependencies.stateStore.dispatchCalls.length === 1,
      "Action should be dispatched to StateStore"
    );
    console.assert(
      dependencies.stateStore.dispatchCalls[0].type === "OPACITY_UPDATE",
      "Correct action type should be dispatched"
    );
    console.assert(
      dependencies.stateStore.dispatchCalls[0].payload.opacity === 0.4,
      "Correct opacity value should be dispatched"
    );

    // StateStoreの値が更新されていることを確認
    console.assert(
      dependencies.stateStore.state.theaterMode.opacity === 0.4,
      "StateStore opacity should be updated"
    );

    console.log("Test 5: Passed");
  }

  // テスト6: StateStoreからの更新
  async function testStateStoreUpdate() {
    console.log("Test 6: StateStore Update");

    const { controller, dependencies } = setupTestEnvironment();
    await controller.initialize();

    // StateStoreの値を直接変更
    await dependencies.stateStore.dispatch(ActionCreator.updateOpacity(0.3));

    // コントローラーの値が更新されていることを確認
    console.assert(
      controller.currentOpacity === 0.3,
      "Controller opacity should be updated from StateStore"
    );

    console.log("Test 6: Passed");
  }

  // テスト7: アニメーション（簡易テスト）
  async function testAnimation() {
    console.log("Test 7: Animation");

    const { controller, dependencies } = setupTestEnvironment();
    await controller.initialize();

    // アニメーションを開始
    controller.setOpacity(0.3, true);

    // アニメーション中であることを確認
    console.assert(
      controller.isAnimationInProgress() === true,
      "Animation should be in progress"
    );
    console.assert(
      controller.getTargetOpacity() === 0.3,
      "Target opacity should be set"
    );

    // アニメーションが完了するまで待機（簡易的なテスト）
    await new Promise((resolve) => setTimeout(resolve, 400));

    // アニメーションが完了していることを確認
    console.assert(
      controller.isAnimationInProgress() === false,
      "Animation should be completed"
    );
    console.assert(
      controller.currentOpacity === 0.3,
      "Current opacity should reach target value"
    );

    console.log("Test 7: Passed");
  }

  // テスト8: クリーンアップ
  async function testCleanup() {
    console.log("Test 8: Cleanup");

    const { controller, dependencies } = setupTestEnvironment();
    await controller.initialize();

    // アニメーションを開始
    controller.setOpacity(0.3, true);

    // クリーンアップ
    const cleanupResult = controller.cleanup();
    console.assert(
      cleanupResult.isSuccess() && cleanupResult.data === true,
      "Cleanup should succeed"
    );

    // アニメーションが停止していることを確認
    console.assert(
      controller.isAnimationInProgress() === false,
      "Animation should be stopped"
    );
    console.assert(
      controller.animationFrameId === null,
      "Animation frame ID should be cleared"
    );

    console.log("Test 8: Passed");
  }

  // 全テストを実行
  async function runAllTests() {
    try {
      await testInitialization();
      await testSetOpacity();
      await testOpacityAdjustment();
      await testResetOpacity();
      await testStateStoreSync();
      await testStateStoreUpdate();
      await testAnimation();
      await testCleanup();

      console.log("All OpacityController tests passed!");
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
    runOpacityControllerTests();
  } else {
    window.addEventListener("load", runOpacityControllerTests);
  }
} else if (typeof module !== "undefined" && module.exports) {
  // Node.js環境
  module.exports = { runOpacityControllerTests };
}
