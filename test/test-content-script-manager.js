/**
 * ContentScriptManager 単体テスト
 * ContentScriptManagerクラスの機能をテストする
 */

// テスト用のモッククラス
class MockLogger {
  constructor() {
    this.logs = [];
  }

  info(message, data) {
    this.logs.push({ level: "info", message, data });
  }

  debug(message, data) {
    this.logs.push({ level: "debug", message, data });
  }

  warn(message, data) {
    this.logs.push({ level: "warn", message, data });
  }

  error(message, data) {
    this.logs.push({ level: "error", message, data });
  }

  getLogs() {
    return this.logs;
  }

  clearLogs() {
    this.logs = [];
  }
}

class MockErrorHandler {
  constructor() {
    this.handledErrors = [];
  }

  handleError(error, options) {
    const appError = {
      message: error.message || error,
      type: options?.type || "UNKNOWN_ERROR",
      context: options?.context || {},
    };
    this.handledErrors.push(appError);
    return appError;
  }

  getHandledErrors() {
    return this.handledErrors;
  }

  clearErrors() {
    this.handledErrors = [];
  }
}

class MockMessageBus {
  constructor() {
    this.handlers = new Map();
    this.sentMessages = [];
  }

  registerHandler(type, handler) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    this.handlers.get(type).push(handler);

    // ハンドラー削除関数を返す
    return () => {
      const handlers = this.handlers.get(type);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index !== -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }

  async send(type, data, options) {
    this.sentMessages.push({ type, data, options });

    // モック応答
    if (options?.needsResponse) {
      return {
        isSuccess: () => true,
        data: { mockResponse: true },
      };
    }

    return {
      isSuccess: () => true,
      data: { sent: true },
    };
  }

  getSentMessages() {
    return this.sentMessages;
  }

  clearMessages() {
    this.sentMessages = [];
  }
}

class MockTheaterModeController {
  constructor() {
    this.initialized = false;
    this.state = { isActive: false, opacity: 0.7 };
  }

  async initialize() {
    this.initialized = true;
    return { isSuccess: () => true, data: true };
  }

  async toggle(data) {
    this.state.isActive = !this.state.isActive;
    return { success: true, isActive: this.state.isActive };
  }

  async updateOpacity(value) {
    this.state.opacity = value;
    return { success: true, opacity: value };
  }

  async syncState(state) {
    this.state = { ...this.state, ...state };
    return { success: true };
  }

  onVisibilityChange(isVisible) {
    // モック実装
  }

  onDOMChange(mutations) {
    // モック実装
  }

  async onSettingsChanged(settings) {
    // モック実装
  }

  getState() {
    return this.state;
  }

  async destroy() {
    this.initialized = false;
  }
}

class MockYouTubePageDetector {
  constructor() {
    this.initialized = false;
    this.pageType = "video";
  }

  async initialize() {
    this.initialized = true;
    return { isSuccess: () => true, data: true };
  }

  async detectPageType() {
    return { isSuccess: () => true, data: this.pageType };
  }

  onDOMChange(mutations) {
    // モック実装
  }

  async onSettingsChanged(settings) {
    // モック実装
  }

  getState() {
    return { pageType: this.pageType, initialized: this.initialized };
  }

  async destroy() {
    this.initialized = false;
  }
}

class MockContentScriptCommunicator {
  constructor() {
    this.initialized = false;
  }

  async initialize() {
    this.initialized = true;
    return { isSuccess: () => true, data: true };
  }

  async onSettingsChanged(settings) {
    // モック実装
  }

  getState() {
    return { initialized: this.initialized };
  }

  async destroy() {
    this.initialized = false;
  }
}

// テスト実行関数
async function runContentScriptManagerTests() {
  console.log("=== ContentScriptManager Tests ===");

  let testCount = 0;
  let passedTests = 0;

  // テストヘルパー関数
  function assert(condition, message) {
    testCount++;
    if (condition) {
      console.log(`✅ Test ${testCount}: ${message}`);
      passedTests++;
    } else {
      console.error(`❌ Test ${testCount}: ${message}`);
    }
  }

  function createMockDependencies() {
    return {
      logger: new MockLogger(),
      errorHandler: new MockErrorHandler(),
      messageBus: new MockMessageBus(),
      theaterModeController: new MockTheaterModeController(),
      youtubePageDetector: new MockYouTubePageDetector(),
      contentScriptCommunicator: new MockContentScriptCommunicator(),
    };
  }

  // YouTube環境をモック
  const originalLocation = window.location;
  Object.defineProperty(window, "location", {
    value: {
      href: "https://www.youtube.com/watch?v=test",
    },
    writable: true,
  });

  try {
    // Test 1: ContentScriptManager インスタンス作成
    const dependencies = createMockDependencies();
    const manager = new ContentScriptManager(dependencies);

    assert(
      manager instanceof ContentScriptManager,
      "ContentScriptManager instance should be created successfully"
    );

    assert(
      manager.state === ContentScriptState.UNINITIALIZED,
      "Initial state should be UNINITIALIZED"
    );

    // Test 2: 依存関係の検証
    try {
      new ContentScriptManager({});
      assert(false, "Should throw error for missing dependencies");
    } catch (error) {
      assert(
        error.message.includes("Required dependency"),
        "Should throw error for missing dependencies"
      );
    }

    // Test 3: 初期化プロセス
    const initResult = await manager.initialize();

    assert(initResult.isSuccess(), "Initialization should succeed");

    assert(
      manager.state === ContentScriptState.READY,
      "State should be READY after successful initialization"
    );

    assert(manager.initialized === true, "initialized flag should be true");

    // Test 4: パフォーマンスメトリクスの記録
    assert(
      manager.performanceMetrics.initDuration !== null,
      "Performance metrics should be recorded"
    );

    assert(
      manager.performanceMetrics.componentInitTimes.size > 0,
      "Component initialization times should be recorded"
    );

    // Test 5: メッセージハンドラーの登録確認
    const messageBus = dependencies.messageBus;
    assert(
      messageBus.handlers.has(MessageType.SYSTEM_SHUTDOWN),
      "System shutdown handler should be registered"
    );

    assert(
      messageBus.handlers.has(MessageType.THEATER_MODE_TOGGLE),
      "Theater mode toggle handler should be registered"
    );

    // Test 6: 状態取得
    const state = manager.getState();
    assert(
      state.state === ContentScriptState.READY,
      "getState should return correct state"
    );

    assert(
      state.initialized === true,
      "getState should return correct initialization status"
    );

    assert(
      typeof state.performanceMetrics === "object",
      "getState should include performance metrics"
    );

    // Test 7: 統計情報取得
    const stats = manager.getStats();
    assert(
      typeof stats.performanceMetrics === "object",
      "getStats should return performance metrics"
    );

    assert(
      typeof stats.componentInitTimes === "object",
      "getStats should return component initialization times"
    );

    // Test 8: ライフサイクルイベントハンドラー
    let eventFired = false;
    const removeHandler = manager.onLifecycleEvent("test", () => {
      eventFired = true;
    });

    await manager._emitLifecycleEvent("test", {});
    assert(eventFired === true, "Lifecycle event handler should be called");

    // ハンドラー削除のテスト
    removeHandler();
    eventFired = false;
    await manager._emitLifecycleEvent("test", {});
    assert(
      eventFired === false,
      "Removed lifecycle event handler should not be called"
    );

    // Test 9: メッセージハンドリング
    const theaterController = dependencies.theaterModeController;
    const initialState = theaterController.state.isActive;

    // シアターモードトグルメッセージをシミュレート
    const toggleHandler = messageBus.handlers.get(
      MessageType.THEATER_MODE_TOGGLE
    )[0];
    const toggleResult = await toggleHandler({
      type: MessageType.THEATER_MODE_TOGGLE,
      data: {},
    });

    assert(
      toggleResult.success === true,
      "Theater mode toggle message should be handled successfully"
    );

    assert(
      theaterController.state.isActive !== initialState,
      "Theater mode state should be toggled"
    );

    // Test 10: 透明度変更メッセージ
    const opacityHandler = messageBus.handlers.get(
      MessageType.OPACITY_CHANGE
    )[0];
    const opacityResult = await opacityHandler({
      type: MessageType.OPACITY_CHANGE,
      data: { value: 0.5 },
    });

    assert(
      opacityResult.success === true,
      "Opacity change message should be handled successfully"
    );

    assert(
      theaterController.state.opacity === 0.5,
      "Opacity should be updated correctly"
    );

    // Test 11: エラーハンドリング
    const errorHandler = dependencies.errorHandler;
    const initialErrorCount = errorHandler.getHandledErrors().length;

    // エラーを発生させるためのモック
    const originalToggle = theaterController.toggle;
    theaterController.toggle = () => {
      throw new Error("Test error");
    };

    const errorResult = await toggleHandler({
      type: MessageType.THEATER_MODE_TOGGLE,
      data: {},
    });

    assert(errorResult.success === false, "Error should be handled gracefully");

    assert(
      errorHandler.getHandledErrors().length > initialErrorCount,
      "Error should be logged to error handler"
    );

    // モックを元に戻す
    theaterController.toggle = originalToggle;

    // Test 12: 重複初期化の防止
    const secondInitResult = await manager.initialize();
    assert(
      secondInitResult.isSuccess(),
      "Second initialization should return success without re-initializing"
    );

    // Test 13: 破棄処理
    await manager.destroy();

    assert(
      manager.state === ContentScriptState.DESTROYED,
      "State should be DESTROYED after destroy"
    );

    assert(
      manager.initialized === false,
      "initialized flag should be false after destroy"
    );

    // コンポーネントが破棄されているかチェック
    assert(
      theaterController.initialized === false,
      "Theater mode controller should be destroyed"
    );

    // Test 14: 破棄後の操作
    try {
      await manager.destroy();
      assert(true, "Multiple destroy calls should be safe");
    } catch (error) {
      assert(false, "Multiple destroy calls should not throw error");
    }

    // Test 15: 初期化失敗時のリトライ
    const retryDependencies = createMockDependencies();
    retryDependencies.youtubePageDetector.detectPageType = async () => ({
      isFailure: () => true,
      error: { message: "Detection failed" },
    });

    const retryManager = new ContentScriptManager(retryDependencies, {
      autoRetry: true,
      maxRetries: 2,
    });

    const retryResult = await retryManager.initialize();
    assert(
      retryResult.isFailure(),
      "Initialization should fail after max retries"
    );

    assert(
      retryManager.retryCount === 2,
      "Retry count should match max retries"
    );

    await retryManager.destroy();
  } catch (error) {
    console.error("Test execution error:", error);
    assert(false, `Test execution failed: ${error.message}`);
  } finally {
    // 元のlocationを復元
    Object.defineProperty(window, "location", {
      value: originalLocation,
      writable: true,
    });
  }

  // テスト結果の表示
  console.log(`\n=== Test Results ===`);
  console.log(`Total tests: ${testCount}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${testCount - passedTests}`);
  console.log(`Success rate: ${((passedTests / testCount) * 100).toFixed(1)}%`);

  return {
    total: testCount,
    passed: passedTests,
    failed: testCount - passedTests,
    successRate: (passedTests / testCount) * 100,
  };
}

// テスト実行
if (typeof window !== "undefined") {
  // ブラウザ環境での実行
  window.runContentScriptManagerTests = runContentScriptManagerTests;

  // DOMが読み込まれた後にテストを実行
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runContentScriptManagerTests);
  } else {
    runContentScriptManagerTests();
  }
} else if (typeof module !== "undefined" && module.exports) {
  // Node.js環境での実行
  module.exports = { runContentScriptManagerTests };
}
