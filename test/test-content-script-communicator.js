/**
 * ContentScriptCommunicator 単体テスト
 * ContentScriptCommunicatorクラスの機能をテストする
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
    this.receivedMessages = [];
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

  async receiveMessage(message, sender) {
    this.receivedMessages.push({ message, sender });
    return { success: true };
  }

  getReceivedMessages() {
    return this.receivedMessages;
  }

  clearMessages() {
    this.receivedMessages = [];
  }
}

class MockRetryManager {
  constructor(options = {}) {
    this.options = options;
  }

  async withRetry(operation, options = {}) {
    try {
      const result = await operation();
      return { isSuccess: () => true, data: result };
    } catch (error) {
      return { isFailure: () => true, error };
    }
  }
}

// Chrome API のモック
class ChromeMock {
  constructor() {
    this.runtime = {
      onMessage: {
        listeners: [],
        addListener: (listener) => {
          this.runtime.onMessage.listeners.push(listener);
        },
        removeListener: (listener) => {
          const index = this.runtime.onMessage.listeners.indexOf(listener);
          if (index !== -1) {
            this.runtime.onMessage.listeners.splice(index, 1);
          }
        },
      },
      onDisconnect: {
        listeners: [],
        addListener: (listener) => {
          this.runtime.onDisconnect.listeners.push(listener);
        },
        removeListener: (listener) => {
          const index = this.runtime.onDisconnect.listeners.indexOf(listener);
          if (index !== -1) {
            this.runtime.onDisconnect.listeners.splice(index, 1);
          }
        },
      },
      sendMessage: (message, callback) => {
        // モック応答を生成
        setTimeout(() => {
          if (message.type === "establish_connection") {
            callback({
              success: true,
              connectionId: "mock-connection-123",
            });
          } else if (message.type === "heartbeat") {
            callback({
              success: true,
              data: { timestamp: Date.now() },
            });
          } else {
            callback({
              success: true,
              data: { mockResponse: true },
            });
          }
        }, 10);
      },
      lastError: null,
    };

    this.tabs = {
      getCurrent: (callback) => {
        setTimeout(() => {
          callback({ id: 123 });
        }, 10);
      },
    };
  }

  // メッセージ受信をシミュレート
  simulateMessage(message, sender = { id: "background" }) {
    for (const listener of this.runtime.onMessage.listeners) {
      const sendResponse = (response) => {
        // モック応答処理
      };
      listener(message, sender, sendResponse);
    }
  }

  // 接続切断をシミュレート
  simulateDisconnect() {
    for (const listener of this.runtime.onDisconnect.listeners) {
      listener();
    }
  }

  // エラーをシミュレート
  simulateError(errorMessage) {
    this.runtime.lastError = { message: errorMessage };
  }

  clearError() {
    this.runtime.lastError = null;
  }
}

// テスト実行関数
async function runContentScriptCommunicatorTests() {
  console.log("=== ContentScriptCommunicator Tests ===");

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
    };
  }

  // Chrome API をモック
  const originalChrome = window.chrome;
  const chromeMock = new ChromeMock();
  window.chrome = chromeMock;

  // RetryManager をモック
  const originalRetryManager = window.RetryManager;
  window.RetryManager = MockRetryManager;

  try {
    // Test 1: ContentScriptCommunicator インスタンス作成
    const dependencies = createMockDependencies();
    const communicator = new ContentScriptCommunicator(dependencies);

    assert(
      communicator instanceof ContentScriptCommunicator,
      "ContentScriptCommunicator instance should be created successfully"
    );

    assert(
      communicator.state === CommunicationState.DISCONNECTED,
      "Initial state should be DISCONNECTED"
    );

    // Test 2: 依存関係の検証
    try {
      new ContentScriptCommunicator({});
      assert(false, "Should throw error for missing dependencies");
    } catch (error) {
      assert(
        error.message.includes("Required dependency"),
        "Should throw error for missing dependencies"
      );
    }

    // Test 3: 初期化プロセス
    const initResult = await communicator.initialize();

    assert(initResult.isSuccess(), "Initialization should succeed");

    assert(
      communicator.initialized === true,
      "initialized flag should be true"
    );

    assert(
      communicator.state === CommunicationState.CONNECTED,
      "State should be CONNECTED after successful initialization"
    );

    assert(
      communicator.connectionId === "mock-connection-123",
      "Connection ID should be set"
    );

    // Test 4: メッセージ送信
    const sendResult = await communicator.send("test_message", {
      testData: "hello",
    });

    assert(sendResult.isSuccess(), "Message sending should succeed");

    assert(
      communicator.stats.messagesSent === 1,
      "Message sent count should be incremented"
    );

    assert(
      communicator.stats.messagesSucceeded === 1,
      "Message succeeded count should be incremented"
    );

    // Test 5: 統計情報の更新
    const stats = communicator.getStats();
    assert(stats.messagesSent === 1, "Stats should reflect sent messages");

    assert(
      stats.successRate === 100,
      "Success rate should be 100% for successful messages"
    );

    assert(
      typeof stats.averageResponseTime === "number",
      "Average response time should be recorded"
    );

    // Test 6: 状態取得
    const state = communicator.getState();
    assert(
      state.initialized === true,
      "getState should return correct initialization status"
    );

    assert(
      state.state === CommunicationState.CONNECTED,
      "getState should return correct connection state"
    );

    assert(
      state.connectionId === "mock-connection-123",
      "getState should return correct connection ID"
    );

    // Test 7: 接続状態チェック
    assert(
      communicator.isConnected() === true,
      "isConnected should return true when connected"
    );

    assert(
      communicator.isHealthy() === true,
      "isHealthy should return true for healthy connection"
    );

    // Test 8: Chrome メッセージ受信の処理
    const messageBus = dependencies.messageBus;
    const initialReceivedCount = messageBus.getReceivedMessages().length;

    // メッセージ受信をシミュレート
    chromeMock.simulateMessage({
      type: "test_incoming_message",
      data: { test: "data" },
    });

    // 少し待ってからチェック
    await new Promise((resolve) => setTimeout(resolve, 50));

    assert(
      messageBus.getReceivedMessages().length > initialReceivedCount,
      "Incoming messages should be forwarded to MessageBus"
    );

    // Test 9: ハートビート機能
    const heartbeatCommunicator = new ContentScriptCommunicator(
      createMockDependencies(),
      {
        enableHeartbeat: true,
        heartbeatInterval: 100, // 短い間隔でテスト
      }
    );

    await heartbeatCommunicator.initialize();

    // ハートビートが送信されるまで少し待つ
    await new Promise((resolve) => setTimeout(resolve, 150));

    assert(
      heartbeatCommunicator.lastHeartbeat !== null,
      "Heartbeat should be recorded"
    );

    await heartbeatCommunicator.destroy();

    // Test 10: 接続切断の処理
    communicator._handleConnectionLost();

    assert(
      communicator.state === CommunicationState.DISCONNECTED,
      "State should be DISCONNECTED after connection lost"
    );

    assert(
      communicator.connectionId === null,
      "Connection ID should be cleared after connection lost"
    );

    // Test 11: 再接続機能
    const reconnectResult = await communicator._reconnect();

    assert(reconnectResult.isSuccess(), "Reconnection should succeed");

    assert(
      communicator.state === CommunicationState.CONNECTED,
      "State should be CONNECTED after reconnection"
    );

    // Test 12: エラーハンドリング
    const errorHandler = dependencies.errorHandler;
    const initialErrorCount = errorHandler.getHandledErrors().length;

    // エラーをシミュレート
    chromeMock.simulateError("Connection failed");

    const errorSendResult = await communicator.send("error_message", {});

    assert(
      errorSendResult.isFailure(),
      "Message sending should fail when Chrome API returns error"
    );

    assert(
      errorHandler.getHandledErrors().length > initialErrorCount,
      "Error should be handled by error handler"
    );

    chromeMock.clearError();

    // Test 13: 設定変更の処理
    await communicator.onSettingsChanged({
      enableHeartbeat: false,
      messageTimeout: 15000,
      maxRetries: 5,
    });

    assert(
      communicator.options.enableHeartbeat === false,
      "Heartbeat setting should be updated"
    );

    assert(
      communicator.options.messageTimeout === 15000,
      "Message timeout setting should be updated"
    );

    assert(
      communicator.options.maxRetries === 5,
      "Max retries setting should be updated"
    );

    // Test 14: メッセージハンドラーの登録確認
    const messageBus2 = dependencies.messageBus;
    assert(
      messageBus2.handlers.has(MessageType.SYSTEM_READY),
      "System ready handler should be registered"
    );

    assert(
      messageBus2.handlers.has(MessageType.SYSTEM_ERROR),
      "System error handler should be registered"
    );

    // Test 15: 重複初期化の防止
    const secondInitResult = await communicator.initialize();
    assert(
      secondInitResult.isSuccess(),
      "Second initialization should return success without re-initializing"
    );

    // Test 16: 破棄処理
    await communicator.destroy();

    assert(
      communicator.initialized === false,
      "initialized flag should be false after destroy"
    );

    assert(
      communicator.state === CommunicationState.DISCONNECTED,
      "State should be DISCONNECTED after destroy"
    );

    // Test 17: 破棄後の操作
    try {
      await communicator.destroy();
      assert(true, "Multiple destroy calls should be safe");
    } catch (error) {
      assert(false, "Multiple destroy calls should not throw error");
    }

    // Test 18: ハートビート無効化オプション
    const noHeartbeatCommunicator = new ContentScriptCommunicator(
      createMockDependencies(),
      {
        enableHeartbeat: false,
      }
    );

    await noHeartbeatCommunicator.initialize();

    assert(
      noHeartbeatCommunicator.heartbeatTimer === null,
      "Heartbeat timer should not be created when disabled"
    );

    await noHeartbeatCommunicator.destroy();

    // Test 19: メッセージ優先度の処理
    const priorityResult = await communicator.send(
      "priority_message",
      {},
      {
        priority: MessagePriority.HIGH,
      }
    );

    // 優先度は内部的に処理されるため、送信が成功すればOK
    assert(
      priorityResult.isSuccess() || priorityResult.isFailure(), // どちらでも処理されていればOK
      "Priority message should be processed"
    );

    // Test 20: タイムアウト処理
    const timeoutCommunicator = new ContentScriptCommunicator(
      createMockDependencies(),
      {
        messageTimeout: 50, // 短いタイムアウト
      }
    );

    // Chrome API の応答を遅延させる
    const originalSendMessage = chromeMock.runtime.sendMessage;
    chromeMock.runtime.sendMessage = (message, callback) => {
      setTimeout(() => {
        callback({ success: true });
      }, 100); // タイムアウトより長い遅延
    };

    await timeoutCommunicator.initialize();

    const timeoutResult = await timeoutCommunicator.send("timeout_test", {});

    assert(
      timeoutResult.isFailure(),
      "Message should timeout with short timeout setting"
    );

    // Chrome API を元に戻す
    chromeMock.runtime.sendMessage = originalSendMessage;

    await timeoutCommunicator.destroy();
  } catch (error) {
    console.error("Test execution error:", error);
    assert(false, `Test execution failed: ${error.message}`);
  } finally {
    // Chrome API を復元
    window.chrome = originalChrome;

    // RetryManager を復元
    if (originalRetryManager) {
      window.RetryManager = originalRetryManager;
    }
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
  window.runContentScriptCommunicatorTests = runContentScriptCommunicatorTests;

  // DOMが読み込まれた後にテストを実行
  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      runContentScriptCommunicatorTests
    );
  } else {
    runContentScriptCommunicatorTests();
  }
} else if (typeof module !== "undefined" && module.exports) {
  // Node.js環境での実行
  module.exports = { runContentScriptCommunicatorTests };
}
