/**
 * MessageBus システムの単体テスト
 */

// テストフレームワーク
class TestFramework {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log("Running MessageBus tests...\n");

    for (const test of this.tests) {
      try {
        await test.fn();
        console.log(`✓ ${test.name}`);
        this.passed++;
      } catch (error) {
        console.error(`✗ ${test.name}: ${error.message}`);
        console.error(error.stack);
        this.failed++;
      }
    }

    console.log(`\nTest Results: ${this.passed} passed, ${this.failed} failed`);
    return this.failed === 0;
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(message || "Assertion failed");
    }
  }

  assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
  }

  assertContains(container, item, message) {
    if (!container.includes(item)) {
      throw new Error(message || `Expected container to include ${item}`);
    }
  }
}

// モックロガー
class MockLogger {
  constructor() {
    this.logs = [];
    this.errors = [];
    this.warns = [];
    this.infos = [];
    this.debugs = [];
  }

  log(message, data) {
    this.logs.push({ message, data });
  }

  error(message, data) {
    this.errors.push({ message, data });
  }

  warn(message, data) {
    this.warns.push({ message, data });
  }

  info(message, data) {
    this.infos.push({ message, data });
  }

  debug(message, data) {
    this.debugs.push({ message, data });
  }

  clear() {
    this.logs = [];
    this.errors = [];
    this.warns = [];
    this.infos = [];
    this.debugs = [];
  }
}

// モックChrome API
class MockChromeAPI {
  constructor() {
    this.messages = [];
    this.lastError = null;
    this.messageListeners = [];
    this.tabMessages = new Map();

    this.runtime = {
      sendMessage: (message, callback) => {
        this.messages.push(message);
        if (callback) {
          setTimeout(() => {
            callback({ success: true, data: "mock response" });
          }, 0);
        }
        return true;
      },
      onMessage: {
        addListener: (listener) => {
          this.messageListeners.push(listener);
        },
        removeListener: (listener) => {
          const index = this.messageListeners.indexOf(listener);
          if (index !== -1) {
            this.messageListeners.splice(index, 1);
          }
        },
      },
      lastError: this.lastError,
    };

    this.tabs = {
      sendMessage: (tabId, message, callback) => {
        if (!this.tabMessages.has(tabId)) {
          this.tabMessages.set(tabId, []);
        }
        this.tabMessages.get(tabId).push(message);
        if (callback) {
          setTimeout(() => {
            callback({ success: true, data: "mock tab response" });
          }, 0);
        }
        return true;
      },
    };
  }

  // メッセージをシミュレート
  simulateIncomingMessage(message, sender = {}) {
    for (const listener of this.messageListeners) {
      listener(message, sender, (response) => {
        // 応答をシミュレート
      });
    }
  }

  clear() {
    this.messages = [];
    this.tabMessages.clear();
    this.lastError = null;
  }
}

// テスト実行
async function runMessageBusTests() {
  const framework = new TestFramework();
  const mockLogger = new MockLogger();
  const mockErrorHandler = {
    handleError: (error, options) => {
      return new AppError(error.message || error, options);
    },
    wrapAsync: async (promise) => {
      try {
        const result = await promise;
        return Result.success(result);
      } catch (error) {
        return Result.failure(error);
      }
    },
  };

  // グローバルなChromeオブジェクトをモック
  const originalChrome = typeof chrome !== "undefined" ? chrome : undefined;
  const mockChrome = new MockChromeAPI();
  global.chrome = mockChrome;

  try {
    // MessageTypeの定義テスト
    framework.test("MessageType enum definition", () => {
      framework.assert(
        MessageType.SYSTEM_INIT,
        "SYSTEM_INIT should be defined"
      );
      framework.assert(
        MessageType.SETTINGS_GET,
        "SETTINGS_GET should be defined"
      );
      framework.assert(
        MessageType.THEATER_MODE_TOGGLE,
        "THEATER_MODE_TOGGLE should be defined"
      );
    });

    // MessageTargetの定義テスト
    framework.test("MessageTarget enum definition", () => {
      framework.assert(
        MessageTarget.BACKGROUND,
        "BACKGROUND should be defined"
      );
      framework.assert(
        MessageTarget.CONTENT_SCRIPT,
        "CONTENT_SCRIPT should be defined"
      );
      framework.assert(MessageTarget.POPUP, "POPUP should be defined");
      framework.assert(MessageTarget.ALL, "ALL should be defined");
    });

    // MessagePriorityの定義テスト
    framework.test("MessagePriority enum definition", () => {
      framework.assertEqual(
        MessagePriority.HIGH,
        0,
        "HIGH priority should be 0"
      );
      framework.assertEqual(
        MessagePriority.NORMAL,
        1,
        "NORMAL priority should be 1"
      );
      framework.assertEqual(MessagePriority.LOW, 2, "LOW priority should be 2");
    });

    // Messageクラスのテスト
    framework.test("Message creation and properties", () => {
      const data = { key: "value" };
      const message = new Message(MessageType.SETTINGS_GET, data, {
        source: "test",
        target: MessageTarget.BACKGROUND,
        priority: MessagePriority.HIGH,
        needsResponse: true,
      });

      framework.assertEqual(
        message.type,
        MessageType.SETTINGS_GET,
        "Type should match"
      );
      framework.assertEqual(message.data, data, "Data should match");
      framework.assertEqual(message.source, "test", "Source should match");
      framework.assertEqual(
        message.target,
        MessageTarget.BACKGROUND,
        "Target should match"
      );
      framework.assertEqual(
        message.priority,
        MessagePriority.HIGH,
        "Priority should match"
      );
      framework.assert(message.needsResponse, "needsResponse should be true");
      framework.assert(message.id, "ID should be generated");
      framework.assert(message.timestamp, "Timestamp should be set");
    });

    // Message.generateIdのテスト
    framework.test("Message ID generation", () => {
      const id1 = Message.generateId();
      const id2 = Message.generateId();

      framework.assert(id1, "ID should be generated");
      framework.assert(id2, "Second ID should be generated");
      framework.assert(id1 !== id2, "IDs should be unique");
    });

    // Message.createResponseのテスト
    framework.test("Message response creation", () => {
      const originalMessage = new Message(
        MessageType.SETTINGS_GET,
        { key: "value" },
        {
          source: "source",
          target: "target",
          needsResponse: true,
        }
      );

      const responseMessage = originalMessage.createResponse(
        MessageType.SETTINGS_GET + "_RESPONSE",
        { result: "success" }
      );

      framework.assertEqual(
        responseMessage.type,
        MessageType.SETTINGS_GET + "_RESPONSE",
        "Response type should match"
      );
      framework.assertEqual(
        responseMessage.data.result,
        "success",
        "Response data should match"
      );
      framework.assertEqual(
        responseMessage.source,
        "target",
        "Response source should be original target"
      );
      framework.assertEqual(
        responseMessage.target,
        "source",
        "Response target should be original source"
      );
      framework.assertEqual(
        responseMessage.responseToId,
        originalMessage.id,
        "Response should reference original message"
      );
    });

    // Message.serializeとdeserializeのテスト
    framework.test("Message serialization and deserialization", () => {
      const originalMessage = new Message(
        MessageType.SETTINGS_GET,
        { key: "value" },
        {
          source: "test",
          target: MessageTarget.BACKGROUND,
        }
      );

      const serialized = originalMessage.serialize();
      const deserialized = Message.deserialize(serialized);

      framework.assertEqual(
        deserialized.type,
        originalMessage.type,
        "Type should be preserved"
      );
      framework.assertEqual(
        deserialized.data.key,
        originalMessage.data.key,
        "Data should be preserved"
      );
      framework.assertEqual(
        deserialized.id,
        originalMessage.id,
        "ID should be preserved"
      );
      framework.assertEqual(
        deserialized.source,
        originalMessage.source,
        "Source should be preserved"
      );
      framework.assertEqual(
        deserialized.target,
        originalMessage.target,
        "Target should be preserved"
      );
    });

    // MessageQueueのテスト
    framework.test("MessageQueue basic operations", () => {
      const queue = new MessageQueue();

      // キューが空であることを確認
      framework.assert(queue.isEmpty(), "Queue should be empty initially");
      framework.assertEqual(queue.size(), 0, "Queue size should be 0");

      // メッセージを追加
      const message1 = new Message(
        MessageType.SYSTEM_INIT,
        {},
        { priority: MessagePriority.NORMAL }
      );
      const message2 = new Message(
        MessageType.SETTINGS_GET,
        {},
        { priority: MessagePriority.HIGH }
      );
      const message3 = new Message(
        MessageType.THEATER_MODE_TOGGLE,
        {},
        { priority: MessagePriority.LOW }
      );

      queue.enqueue(message1);
      queue.enqueue(message2);
      queue.enqueue(message3);

      framework.assert(
        !queue.isEmpty(),
        "Queue should not be empty after enqueue"
      );
      framework.assertEqual(queue.size(), 3, "Queue size should be 3");

      // 優先度に基づいて取り出されることを確認
      const dequeued1 = queue.dequeue();
      framework.assertEqual(
        dequeued1,
        message2,
        "High priority message should be dequeued first"
      );

      const dequeued2 = queue.dequeue();
      framework.assertEqual(
        dequeued2,
        message1,
        "Normal priority message should be dequeued second"
      );

      const dequeued3 = queue.dequeue();
      framework.assertEqual(
        dequeued3,
        message3,
        "Low priority message should be dequeued last"
      );

      framework.assert(
        queue.isEmpty(),
        "Queue should be empty after all dequeues"
      );
      framework.assertEqual(queue.size(), 0, "Queue size should be 0");

      // キューをクリア
      queue.enqueue(message1);
      queue.clear();
      framework.assert(queue.isEmpty(), "Queue should be empty after clear");
    });

    // MessageValidatorのテスト
    framework.test("MessageValidator validation", () => {
      // 有効なメッセージ
      const validResult = MessageValidator.validate(MessageType.SETTINGS_SET, {
        key: "theme",
        value: "dark",
      });
      framework.assert(
        validResult.success,
        "Valid message should pass validation"
      );

      // 無効なメッセージタイプ
      const invalidTypeResult = MessageValidator.validate("INVALID_TYPE", {
        key: "theme",
        value: "dark",
      });
      framework.assert(
        !invalidTypeResult.success,
        "Invalid message type should fail validation"
      );

      // 必須フィールドの欠落
      const missingFieldResult = MessageValidator.validate(
        MessageType.SETTINGS_SET,
        { value: "dark" } // keyフィールドが欠落
      );
      framework.assert(
        !missingFieldResult.success,
        "Missing required field should fail validation"
      );

      // 数値範囲の検証
      const outOfRangeResult = MessageValidator.validate(
        MessageType.OPACITY_CHANGE,
        { value: 1.5 } // 0-0.9の範囲外
      );
      framework.assert(
        !outOfRangeResult.success,
        "Value out of range should fail validation"
      );
    });

    // MessageBusの作成テスト
    framework.test("MessageBus creation", () => {
      const bus = new MessageBus({
        logger: mockLogger,
        errorHandler: mockErrorHandler,
        name: "test-bus",
      });

      framework.assertEqual(bus.name, "test-bus", "Bus name should match");
      framework.assertEqual(bus.logger, mockLogger, "Logger should be set");
      framework.assertEqual(
        bus.errorHandler,
        mockErrorHandler,
        "ErrorHandler should be set"
      );
      framework.assert(bus.handlers instanceof Map, "Handlers should be a Map");
      framework.assert(
        bus.outgoingQueue instanceof MessageQueue,
        "Outgoing queue should be a MessageQueue"
      );
      framework.assert(
        bus.incomingQueue instanceof MessageQueue,
        "Incoming queue should be a MessageQueue"
      );
    });

    // MessageBus.registerHandlerのテスト
    framework.test("MessageBus handler registration", () => {
      const bus = new MessageBus({ name: "test-bus" });
      let handlerCalled = false;

      const removeHandler = bus.registerHandler(
        MessageType.SETTINGS_GET,
        (message) => {
          handlerCalled = true;
          return { success: true };
        }
      );

      framework.assert(
        bus.handlers.has(MessageType.SETTINGS_GET),
        "Handler should be registered"
      );
      framework.assertEqual(
        bus.handlers.get(MessageType.SETTINGS_GET).length,
        1,
        "One handler should be registered"
      );

      // ハンドラーを削除
      removeHandler();
      framework.assert(
        !bus.handlers.has(MessageType.SETTINGS_GET),
        "Handler should be removed"
      );
    });

    // MessageBus.addMiddlewareのテスト
    framework.test("MessageBus middleware", () => {
      const bus = new MessageBus({ name: "test-bus" });
      let middlewareCalled = false;

      const removeMiddleware = bus.addMiddleware((message) => {
        middlewareCalled = true;
        message.data.middlewareProcessed = true;
        return message;
      });

      framework.assertEqual(
        bus.middleware.length,
        1,
        "One middleware should be registered"
      );

      // ミドルウェアを削除
      removeMiddleware();
      framework.assertEqual(
        bus.middleware.length,
        0,
        "Middleware should be removed"
      );
    });

    // MessageBus._applyMiddlewareのテスト
    framework.test("MessageBus middleware application", async () => {
      const bus = new MessageBus({ name: "test-bus", logger: mockLogger });

      // 通常のミドルウェア
      bus.addMiddleware((message) => {
        message.data.middleware1 = true;
        return message;
      });

      // 非同期ミドルウェア
      bus.addMiddleware(async (message) => {
        message.data.middleware2 = true;
        return message;
      });

      // メッセージを拒否するミドルウェア
      bus.addMiddleware((message) => {
        if (message.type === MessageType.SYSTEM_ERROR) {
          return null; // 拒否
        }
        return message;
      });

      const message1 = new Message(MessageType.SETTINGS_GET, {});
      const processed1 = await bus._applyMiddleware(message1);

      framework.assert(processed1, "Message should be processed");
      framework.assert(
        processed1.data.middleware1,
        "First middleware should be applied"
      );
      framework.assert(
        processed1.data.middleware2,
        "Second middleware should be applied"
      );

      const message2 = new Message(MessageType.SYSTEM_ERROR, {});
      const processed2 = await bus._applyMiddleware(message2);

      framework.assert(processed2 === null, "Error message should be rejected");
    });

    // MessageBus.sendのテスト（ローカル処理）
    framework.test("MessageBus local message sending", async () => {
      const bus = new MessageBus({ name: "test-bus", logger: mockLogger });
      let handlerCalled = false;

      bus.registerHandler(MessageType.SETTINGS_GET, (message) => {
        handlerCalled = true;
        return { result: "success" };
      });

      // Chrome APIを一時的に無効化
      const tempChrome = global.chrome;
      global.chrome = undefined;

      const result = await bus.send(MessageType.SETTINGS_GET, { key: "theme" });

      // Chrome APIを復元
      global.chrome = tempChrome;

      framework.assert(result.success, "Send should be successful");
      framework.assert(handlerCalled, "Handler should be called");
    });

    // MessageBus._handleMessageのテスト
    framework.test("MessageBus message handling", async () => {
      const bus = new MessageBus({ name: "test-bus", logger: mockLogger });
      let handler1Called = false;
      let handler2Called = false;

      bus.registerHandler(MessageType.SETTINGS_GET, (message) => {
        handler1Called = true;
        return { result1: "success" };
      });

      bus.registerHandler(MessageType.SETTINGS_GET, (message) => {
        handler2Called = true;
        return { result2: "also success" };
      });

      const message = new Message(MessageType.SETTINGS_GET, { key: "theme" });
      await bus._handleMessage(message);

      framework.assert(handler1Called, "First handler should be called");
      framework.assert(handler2Called, "Second handler should be called");

      // エラーを投げるハンドラー
      let errorHandlerCalled = false;
      bus.registerHandler(MessageType.SYSTEM_ERROR, () => {
        errorHandlerCalled = true;
        throw new Error("Test error");
      });

      mockLogger.clear();
      const errorMessage = new Message(MessageType.SYSTEM_ERROR, {});
      await bus._handleMessage(errorMessage);

      framework.assert(errorHandlerCalled, "Error handler should be called");
      framework.assert(mockLogger.errors.length > 0, "Error should be logged");
    });

    // MessageBus.clearとdisposeのテスト
    framework.test("MessageBus clear and dispose", () => {
      const bus = new MessageBus({ name: "test-bus" });

      bus.registerHandler(MessageType.SETTINGS_GET, () => {});
      bus.addMiddleware((message) => message);

      bus.outgoingQueue.enqueue(new Message(MessageType.SETTINGS_GET, {}));
      bus.incomingQueue.enqueue(new Message(MessageType.SETTINGS_GET, {}));

      bus.clear();
      framework.assert(
        bus.outgoingQueue.isEmpty(),
        "Outgoing queue should be cleared"
      );
      framework.assert(
        bus.incomingQueue.isEmpty(),
        "Incoming queue should be cleared"
      );
      framework.assert(bus.handlers.size > 0, "Handlers should not be cleared");

      bus.dispose();
      framework.assert(
        bus.handlers.size === 0,
        "Handlers should be cleared after dispose"
      );
      framework.assertEqual(
        bus.middleware.length,
        0,
        "Middleware should be cleared after dispose"
      );
    });

    // Chrome拡張機能のメッセージングのテスト
    framework.test("Chrome messaging integration", async () => {
      mockChrome.clear();
      const bus = new MessageBus({ name: "test-bus", logger: mockLogger });

      // メッセージを送信
      await bus.send(MessageType.SETTINGS_GET, { key: "theme" });

      framework.assert(
        mockChrome.messages.length > 0,
        "Message should be sent via Chrome API"
      );
      framework.assertEqual(
        mockChrome.messages[0].type,
        MessageType.SETTINGS_GET,
        "Message type should match"
      );
    });

    // 応答待ちメッセージのテスト
    framework.test("Waiting for response", async () => {
      mockChrome.clear();
      const bus = new MessageBus({ name: "test-bus", logger: mockLogger });

      // 応答を待つメッセージを送信
      const sendPromise = bus.send(
        MessageType.SETTINGS_GET,
        { key: "theme" },
        {
          needsResponse: true,
          timeout: 100, // テスト用に短いタイムアウト
        }
      );

      // 応答をシミュレート
      setTimeout(() => {
        const lastMessage = mockChrome.messages[mockChrome.messages.length - 1];
        mockChrome.simulateIncomingMessage({
          type: MessageType.SETTINGS_GET + "_RESPONSE",
          data: { value: "dark" },
          responseToId: lastMessage.id,
          id: "response_" + lastMessage.id,
          source: "background",
          target: lastMessage.source,
        });
      }, 10);

      const result = await sendPromise;
      framework.assert(result.success, "Response should be successful");
      framework.assertEqual(
        result.data.value,
        "dark",
        "Response data should match"
      );
    });

    // タイムアウトのテスト
    framework.test("Response timeout", async () => {
      mockChrome.clear();
      const bus = new MessageBus({ name: "test-bus", logger: mockLogger });

      // 応答を待つメッセージを送信（応答なし）
      const result = await bus.send(
        MessageType.SETTINGS_GET,
        { key: "theme" },
        {
          needsResponse: true,
          timeout: 50, // 短いタイムアウト
        }
      );

      framework.assert(!result.success, "Result should be failure on timeout");
      framework.assertEqual(
        result.error.type,
        ErrorType.TIMEOUT_ERROR,
        "Error type should be TIMEOUT_ERROR"
      );
    });

    await framework.run();
    return framework.failed === 0;
  } catch (error) {
    console.error("Unexpected error in tests:", error);
    return false;
  } finally {
    // グローバルなChromeオブジェクトを復元
    if (originalChrome !== undefined) {
      global.chrome = originalChrome;
    } else {
      delete global.chrome;
    }
  }
}

// テスト実行用の関数をグローバルに公開
if (typeof window !== "undefined") {
  window.runMessageBusTests = runMessageBusTests;
} else if (typeof module !== "undefined" && module.exports) {
  module.exports = { runMessageBusTests };
}
