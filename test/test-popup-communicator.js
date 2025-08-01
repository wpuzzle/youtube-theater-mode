/**
 * PopupCommunicator 単体テスト
 */

// テスト用のモック依存関係
class MockMessageBus {
  constructor() {
    this.handlers = new Map();
    this.sentMessages = [];
    this.shouldFailSend = false;
    this.sendDelay = 0;
  }

  async send(type, data, options) {
    this.sentMessages.push({ type, data, options });

    // 遅延をシミュレート
    if (this.sendDelay > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.sendDelay));
    }

    // 失敗をシミュレート
    if (this.shouldFailSend) {
      return { success: false, error: "Simulated send failure" };
    }

    // 成功レスポンスをシミュレート
    if (options && options.needsResponse) {
      return {
        success: true,
        data: { success: true, result: "test-response" },
      };
    }

    return { success: true, data: { sent: true, messageId: "test-id" } };
  }

  registerHandler(type, handler) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    this.handlers.get(type).push(handler);

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

  // テスト用のメソッド
  getLastSentMessage() {
    return this.sentMessages[this.sentMessages.length - 1];
  }

  clearSentMessages() {
    this.sentMessages = [];
  }

  simulateMessage(type, data) {
    const handlers = this.handlers.get(type);
    if (handlers) {
      const message = { type, data };
      handlers.forEach((handler) => {
        try {
          handler(message);
        } catch (error) {
          console.warn("Error in message handler:", error);
        }
      });
    }
  }

  setShouldFailSend(shouldFail) {
    this.shouldFailSend = shouldFail;
  }

  setSendDelay(delay) {
    this.sendDelay = delay;
  }
}

class MockLogger {
  constructor() {
    this.logs = [];
  }

  debug(message, data) {
    this.logs.push({ level: "debug", message, data });
  }

  info(message, data) {
    this.logs.push({ level: "info", message, data });
  }

  warn(message, data) {
    this.logs.push({ level: "warn", message, data });
  }

  error(message, data) {
    this.logs.push({ level: "error", message, data });
  }

  // テスト用のメソッド
  getLastLog() {
    return this.logs[this.logs.length - 1];
  }

  clearLogs() {
    this.logs = [];
  }
}

class MockErrorHandler {
  constructor() {
    this.handledErrors = [];
  }

  handleError(error) {
    this.handledErrors.push(error);
    return error;
  }

  // テスト用のメソッド
  getLastError() {
    return this.handledErrors[this.handledErrors.length - 1];
  }

  clearErrors() {
    this.handledErrors = [];
  }
}

// Chrome API のモック
function createMockChrome() {
  const mockTabs = [
    {
      id: 1,
      url: "https://www.youtube.com/watch?v=test",
      title: "Test YouTube Video",
      active: true,
    },
    {
      id: 2,
      url: "https://www.google.com",
      title: "Google",
      active: false,
    },
  ];

  global.chrome = {
    runtime: {
      lastError: null,
    },
    tabs: {
      query: (queryInfo, callback) => {
        setTimeout(() => {
          if (chrome.runtime.lastError) {
            callback([]);
          } else {
            const filteredTabs = mockTabs.filter((tab) => {
              if (
                queryInfo.active !== undefined &&
                tab.active !== queryInfo.active
              ) {
                return false;
              }
              return true;
            });
            callback(filteredTabs);
          }
        }, 10);
      },
    },
  };

  return {
    setLastError: (error) => {
      chrome.runtime.lastError = error;
    },
    clearLastError: () => {
      chrome.runtime.lastError = null;
    },
    setTabs: (tabs) => {
      mockTabs.splice(0, mockTabs.length, ...tabs);
    },
  };
}

// MessageType のモック
global.MessageType = {
  SYSTEM_INIT: "SYSTEM_INIT",
  SYSTEM_READY: "SYSTEM_READY",
  SYSTEM_ERROR: "SYSTEM_ERROR",
  SETTINGS_GET: "SETTINGS_GET",
  SETTINGS_SET: "SETTINGS_SET",
  SETTINGS_CHANGED: "SETTINGS_CHANGED",
  THEATER_MODE_TOGGLE: "THEATER_MODE_TOGGLE",
  OPACITY_CHANGE: "OPACITY_CHANGE",
  UI_UPDATE: "UI_UPDATE",
  CUSTOM: "CUSTOM",
};

global.MessageTarget = {
  BACKGROUND: "background",
  CONTENT_SCRIPT: "content_script",
  POPUP: "popup",
  ALL: "all",
  TAB: "tab",
};

global.MessagePriority = {
  HIGH: 0,
  NORMAL: 1,
  LOW: 2,
};

// PopupCommunicator をインポート
const {
  PopupCommunicator,
} = require("../infrastructure/popup-communicator.js");

// テストスイート
describe("PopupCommunicator", () => {
  let popupCommunicator;
  let mockMessageBus;
  let mockLogger;
  let mockErrorHandler;
  let mockChrome;

  beforeEach(() => {
    // モックを初期化
    mockMessageBus = new MockMessageBus();
    mockLogger = new MockLogger();
    mockErrorHandler = new MockErrorHandler();
    mockChrome = createMockChrome();

    // PopupCommunicator を作成
    popupCommunicator = new PopupCommunicator({
      messageBus: mockMessageBus,
      logger: mockLogger,
      errorHandler: mockErrorHandler,
      config: {
        defaultTimeout: 1000,
        maxRetries: 2,
        retryDelay: 100,
        enableHeartbeat: false, // テストでは無効化
        heartbeatInterval: 1000,
      },
    });
  });

  afterEach(async () => {
    // クリーンアップ
    if (popupCommunicator && popupCommunicator.isInitialized) {
      await popupCommunicator.dispose();
    }
    delete global.chrome;
  });

  describe("初期化", () => {
    test("正常に初期化される", async () => {
      const result = await popupCommunicator.initialize();

      expect(result.success).toBe(true);
      expect(popupCommunicator.isInitialized).toBe(true);
      expect(
        mockLogger.logs.some((log) =>
          log.message.includes("initialization completed")
        )
      ).toBe(true);
    });

    test("重複初期化は成功を返す", async () => {
      await popupCommunicator.initialize();
      const result = await popupCommunicator.initialize();

      expect(result.success).toBe(true);
    });
  });

  describe("バックグラウンド通信", () => {
    beforeEach(async () => {
      await popupCommunicator.initialize();
    });

    test("バックグラウンドにメッセージを送信する", async () => {
      const result = await popupCommunicator.sendToBackground("TEST_MESSAGE", {
        test: "data",
      });

      expect(result.success).toBe(true);
      expect(popupCommunicator.state.messagesSent).toBe(1);

      const lastMessage = mockMessageBus.getLastSentMessage();
      expect(lastMessage.type).toBe("TEST_MESSAGE");
      expect(lastMessage.data).toEqual({ test: "data" });
      expect(lastMessage.options.target).toBe("background");
    });

    test("応答が必要なメッセージを送信する", async () => {
      const result = await popupCommunicator.sendToBackground(
        "TEST_MESSAGE",
        { test: "data" },
        {
          needsResponse: true,
        }
      );

      expect(result.success).toBe(true);
      expect(result.data.result).toBe("test-response");

      const lastMessage = mockMessageBus.getLastSentMessage();
      expect(lastMessage.options.needsResponse).toBe(true);
    });

    test("送信失敗時にリトライする", async () => {
      mockMessageBus.setShouldFailSend(true);

      const result = await popupCommunicator.sendToBackground("TEST_MESSAGE", {
        test: "data",
      });

      expect(result.success).toBe(false);
      expect(mockMessageBus.sentMessages.length).toBe(3); // 初回 + 2回リトライ
      expect(popupCommunicator.state.errors).toBe(1);
    });

    test("初期化前の送信はエラーを返す", async () => {
      await popupCommunicator.dispose();

      const result = await popupCommunicator.sendToBackground("TEST_MESSAGE", {
        test: "data",
      });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe("INITIALIZATION_ERROR");
    });
  });

  describe("アクティブタブ通信", () => {
    beforeEach(async () => {
      await popupCommunicator.initialize();
    });

    test("アクティブなYouTubeタブにメッセージを送信する", async () => {
      const result = await popupCommunicator.sendToActiveTab("TEST_MESSAGE", {
        test: "data",
      });

      expect(result.success).toBe(true);

      const lastMessage = mockMessageBus.getLastSentMessage();
      expect(lastMessage.type).toBe("CUSTOM");
      expect(lastMessage.data.action).toBe("relayMessageToTab");
      expect(lastMessage.data.tabId).toBe(1);
      expect(lastMessage.data.message.type).toBe("TEST_MESSAGE");
    });

    test("非YouTubeタブの場合はエラーを返す", async () => {
      // アクティブタブを非YouTubeページに変更
      mockChrome.setTabs([
        {
          id: 1,
          url: "https://www.google.com",
          title: "Google",
          active: true,
        },
      ]);

      const result = await popupCommunicator.sendToActiveTab("TEST_MESSAGE", {
        test: "data",
      });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe("VALIDATION_ERROR");
    });

    test("アクティブタブが見つからない場合はエラーを返す", async () => {
      mockChrome.setTabs([]);

      const result = await popupCommunicator.sendToActiveTab("TEST_MESSAGE", {
        test: "data",
      });

      expect(result.success).toBe(false);
      expect(result.error.type).toBe("ELEMENT_NOT_FOUND");
    });
  });

  describe("便利メソッド", () => {
    beforeEach(async () => {
      await popupCommunicator.initialize();
    });

    test("設定を取得する", async () => {
      const result = await popupCommunicator.getSettings();

      expect(result.success).toBe(true);

      const lastMessage = mockMessageBus.getLastSentMessage();
      expect(lastMessage.type).toBe("SETTINGS_GET");
      expect(lastMessage.options.needsResponse).toBe(true);
    });

    test("設定を保存する", async () => {
      const settings = { opacity: 0.8, shortcut: "f" };
      const result = await popupCommunicator.saveSettings(settings);

      expect(result.success).toBe(true);

      const lastMessage = mockMessageBus.getLastSentMessage();
      expect(lastMessage.type).toBe("SETTINGS_SET");
      expect(lastMessage.data).toEqual(settings);
    });

    test("シアターモードを切り替える", async () => {
      const result = await popupCommunicator.toggleTheaterMode();

      expect(result.success).toBe(true);

      const lastMessage = mockMessageBus.getLastSentMessage();
      expect(lastMessage.type).toBe("THEATER_MODE_TOGGLE");
      expect(lastMessage.options.needsResponse).toBe(true);
    });

    test("透明度を更新する", async () => {
      const result = await popupCommunicator.updateOpacity(0.5);

      expect(result.success).toBe(true);
      expect(mockMessageBus.sentMessages.length).toBe(2); // バックグラウンド + アクティブタブ

      const messages = mockMessageBus.sentMessages;
      expect(messages[0].type).toBe("OPACITY_CHANGE");
      expect(messages[0].data.value).toBe(0.5);
      expect(messages[1].type).toBe("CUSTOM"); // アクティブタブへのリレー
    });
  });

  describe("メッセージハンドラー", () => {
    beforeEach(async () => {
      await popupCommunicator.initialize();
    });

    test("メッセージハンドラーを登録・削除する", () => {
      let handlerCalled = false;
      const handler = () => {
        handlerCalled = true;
      };

      const removeHandler = popupCommunicator.registerMessageHandler(
        "TEST_TYPE",
        handler
      );

      expect(typeof removeHandler).toBe("function");
      expect(popupCommunicator.messageHandlers.has("TEST_TYPE")).toBe(true);

      // ハンドラーを削除
      removeHandler();
      expect(popupCommunicator.messageHandlers.has("TEST_TYPE")).toBe(false);
    });

    test("システムエラーメッセージを処理する", () => {
      let errorReceived = null;
      popupCommunicator.registerMessageHandler("SYSTEM_ERROR", (message) => {
        errorReceived = message;
      });

      // システムエラーをシミュレート
      mockMessageBus.simulateMessage("SYSTEM_ERROR", {
        error: { message: "Test error", type: "TEST_ERROR" },
      });

      expect(errorReceived).not.toBe(null);
      expect(errorReceived.data.error.message).toBe("Test error");
      expect(popupCommunicator.state.errors).toBe(1);
    });

    test("設定変更メッセージを処理する", () => {
      let settingsReceived = null;
      popupCommunicator.registerMessageHandler(
        "SETTINGS_CHANGED",
        (message) => {
          settingsReceived = message;
        }
      );

      // 設定変更をシミュレート
      mockMessageBus.simulateMessage("SETTINGS_CHANGED", {
        settings: { opacity: 0.8 },
      });

      expect(settingsReceived).not.toBe(null);
      expect(settingsReceived.data.settings.opacity).toBe(0.8);
    });
  });

  describe("接続状態管理", () => {
    test("接続状態リスナーを登録・削除する", async () => {
      let connectionStatus = null;
      let isConnected = null;

      const removeListener = popupCommunicator.addConnectionListener(
        (connected, status) => {
          isConnected = connected;
          connectionStatus = status;
        }
      );

      // 初期化時に現在の状態が通知される
      expect(isConnected).toBe(false);
      expect(connectionStatus).toBe("disconnected");

      await popupCommunicator.initialize();

      // 接続状態が変わったことを確認
      expect(isConnected).toBe(true);
      expect(connectionStatus).toBe("connected");

      // リスナーを削除
      removeListener();
      expect(popupCommunicator.connectionListeners.size).toBe(0);
    });

    test("通信状態を取得する", async () => {
      await popupCommunicator.initialize();

      const state = popupCommunicator.getState();

      expect(typeof state).toBe("object");
      expect(typeof state.isConnected).toBe("boolean");
      expect(typeof state.connectionStatus).toBe("string");
      expect(typeof state.messagesSent).toBe("number");
      expect(typeof state.messagesReceived).toBe("number");
      expect(typeof state.errors).toBe("number");
      expect(Array.isArray(state.recentErrors)).toBe(true);
    });

    test("通信統計をリセットする", async () => {
      await popupCommunicator.initialize();

      // いくつかのメッセージを送信
      await popupCommunicator.sendToBackground("TEST1");
      await popupCommunicator.sendToBackground("TEST2");

      expect(popupCommunicator.state.messagesSent).toBe(2);

      // 統計をリセット
      popupCommunicator.resetStats();

      expect(popupCommunicator.state.messagesSent).toBe(0);
      expect(popupCommunicator.state.messagesReceived).toBe(0);
      expect(popupCommunicator.state.errors).toBe(0);
      expect(popupCommunicator.state.recentErrors.length).toBe(0);
    });
  });

  describe("エラーハンドリング", () => {
    beforeEach(async () => {
      await popupCommunicator.initialize();
    });

    test("通信エラーが適切に記録される", async () => {
      mockMessageBus.setShouldFailSend(true);

      const result = await popupCommunicator.sendToBackground("TEST_MESSAGE");

      expect(result.success).toBe(false);
      expect(popupCommunicator.state.errors).toBeGreaterThan(0);
      expect(popupCommunicator.state.recentErrors.length).toBeGreaterThan(0);
      expect(mockErrorHandler.handledErrors.length).toBeGreaterThan(0);
    });

    test("エラー履歴のサイズが制限される", async () => {
      mockMessageBus.setShouldFailSend(true);

      // 15回エラーを発生させる（制限は10）
      for (let i = 0; i < 15; i++) {
        await popupCommunicator.sendToBackground("TEST_MESSAGE");
      }

      expect(popupCommunicator.state.recentErrors.length).toBe(10);
    });
  });

  describe("破棄処理", () => {
    test("正常に破棄される", async () => {
      await popupCommunicator.initialize();

      const result = await popupCommunicator.dispose();

      expect(result.success).toBe(true);
      expect(popupCommunicator.isInitialized).toBe(false);
      expect(popupCommunicator.state.isConnected).toBe(false);
      expect(popupCommunicator.connectionListeners.size).toBe(0);
    });
  });
});

// テスト実行用の関数
function runPopupCommunicatorTests() {
  console.log("PopupCommunicator テストを実行中...");

  // 簡単なテスト実行
  const testResults = [];

  try {
    // 基本的な初期化テスト
    const mockMessageBus = new MockMessageBus();
    const mockLogger = new MockLogger();
    const mockErrorHandler = new MockErrorHandler();
    createMockChrome();

    const popupCommunicator = new PopupCommunicator({
      messageBus: mockMessageBus,
      logger: mockLogger,
      errorHandler: mockErrorHandler,
      config: { enableHeartbeat: false },
    });

    // 初期化テスト
    popupCommunicator
      .initialize()
      .then((result) => {
        testResults.push({
          test: "初期化テスト",
          passed: result.success,
          message: result.success ? "成功" : result.error.message,
        });

        if (result.success) {
          // バックグラウンド通信テスト
          return popupCommunicator.sendToBackground("TEST_MESSAGE", {
            test: "data",
          });
        }
        return Promise.resolve({ success: false });
      })
      .then((result) => {
        testResults.push({
          test: "バックグラウンド通信テスト",
          passed: result.success,
          message: result.success
            ? "成功"
            : result.error
            ? result.error.message
            : "失敗",
        });

        // アクティブタブ通信テスト
        return popupCommunicator.sendToActiveTab("TEST_MESSAGE", {
          test: "data",
        });
      })
      .then((result) => {
        testResults.push({
          test: "アクティブタブ通信テスト",
          passed: result.success,
          message: result.success
            ? "成功"
            : result.error
            ? result.error.message
            : "失敗",
        });

        // 設定取得テスト
        return popupCommunicator.getSettings();
      })
      .then((result) => {
        testResults.push({
          test: "設定取得テスト",
          passed: result.success,
          message: result.success
            ? "成功"
            : result.error
            ? result.error.message
            : "失敗",
        });

        // 接続状態テスト
        const state = popupCommunicator.getState();
        testResults.push({
          test: "接続状態取得テスト",
          passed:
            typeof state === "object" && typeof state.isConnected === "boolean",
          message: "成功",
        });

        // 結果を表示
        console.log("PopupCommunicator テスト結果:");
        testResults.forEach((result) => {
          console.log(
            `  ${result.test}: ${result.passed ? "✓" : "✗"} ${result.message}`
          );
        });

        const passedCount = testResults.filter((r) => r.passed).length;
        console.log(
          `\n${passedCount}/${testResults.length} テストが成功しました`
        );

        // クリーンアップ
        return popupCommunicator.dispose();
      })
      .catch((error) => {
        console.error("テスト実行中にエラーが発生しました:", error);
      });
  } catch (error) {
    console.error("テストセットアップ中にエラーが発生しました:", error);
  }
}

// Node.js環境でのエクスポート
if (typeof module !== "undefined" && module.exports) {
  module.exports = { runPopupCommunicatorTests };
}

// ブラウザ環境での実行
if (typeof window !== "undefined") {
  window.runPopupCommunicatorTests = runPopupCommunicatorTests;
}
