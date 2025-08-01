/**
 * PopupController 単体テスト
 */

// テスト用のモック依存関係
class MockStateStore {
  constructor() {
    this.state = {
      theaterMode: {
        isEnabled: false,
        opacity: 0.7,
        isInitialized: false,
        lastUpdated: 0,
      },
      settings: {
        opacity: 0.7,
        keyboardShortcut: "t",
        theaterModeEnabled: false,
        version: "1.0.0",
      },
      ui: {
        popupOpen: false,
        connectionStatus: "disconnected",
        lastError: null,
      },
    };
    this.listeners = new Set();
  }

  getState() {
    return this.state;
  }

  async dispatch(action) {
    // アクションに基づいて状態を更新
    switch (action.type) {
      case "THEATER_MODE_TOGGLE":
        this.state.theaterMode.isEnabled = !this.state.theaterMode.isEnabled;
        this.state.settings.theaterModeEnabled =
          this.state.theaterMode.isEnabled;
        break;
      case "OPACITY_UPDATE":
        this.state.theaterMode.opacity = action.payload.opacity;
        this.state.settings.opacity = action.payload.opacity;
        break;
      case "SETTINGS_UPDATE":
        Object.assign(this.state.settings, action.payload.updates);
        break;
      case "SETTINGS_LOAD":
        Object.assign(this.state.settings, action.payload.settings);
        break;
    }

    // リスナーに通知
    this.listeners.forEach((listener) => {
      try {
        listener(this.state);
      } catch (error) {
        console.warn("Error in state listener:", error);
      }
    });

    return {
      success: true,
      data: { prevState: this.state, nextState: this.state, action },
    };
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

class MockMessageBus {
  constructor() {
    this.handlers = new Map();
    this.sentMessages = [];
  }

  async send(type, data, options) {
    this.sentMessages.push({ type, data, options });

    // 成功レスポンスをシミュレート
    if (options && options.needsResponse) {
      return { success: true, data: { success: true } };
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

  getUserMessage(error) {
    return `User friendly message for: ${error.message}`;
  }

  // テスト用のメソッド
  getLastError() {
    return this.handledErrors[this.handledErrors.length - 1];
  }

  clearErrors() {
    this.handledErrors = [];
  }
}

// DOM要素のモック
function createMockDOM() {
  const elements = {
    theaterModeToggle: {
      id: "theaterModeToggle",
      checked: false,
      disabled: false,
      addEventListener: function (event, handler) {
        this._handlers = this._handlers || {};
        this._handlers[event] = handler;
      },
      removeEventListener: function (event, handler) {
        if (this._handlers && this._handlers[event] === handler) {
          delete this._handlers[event];
        }
      },
      dispatchEvent: function (event) {
        if (this._handlers && this._handlers[event.type]) {
          this._handlers[event.type](event);
        }
      },
    },
    opacitySlider: {
      id: "opacitySlider",
      value: "0.7",
      disabled: false,
      addEventListener: function (event, handler) {
        this._handlers = this._handlers || {};
        this._handlers[event] = handler;
      },
      removeEventListener: function (event, handler) {
        if (this._handlers && this._handlers[event] === handler) {
          delete this._handlers[event];
        }
      },
    },
    opacityValue: {
      id: "opacityValue",
      textContent: "70%",
    },
    shortcutKey: {
      id: "shortcutKey",
      value: "t",
      disabled: false,
      addEventListener: function (event, handler) {
        this._handlers = this._handlers || {};
        this._handlers[event] = handler;
      },
      removeEventListener: function (event, handler) {
        if (this._handlers && this._handlers[event] === handler) {
          delete this._handlers[event];
        }
      },
    },
    resetOpacityBtn: {
      id: "resetOpacityBtn",
      disabled: false,
      addEventListener: function (event, handler) {
        this._handlers = this._handlers || {};
        this._handlers[event] = handler;
      },
      removeEventListener: function (event, handler) {
        if (this._handlers && this._handlers[event] === handler) {
          delete this._handlers[event];
        }
      },
    },
    statusIndicator: {
      id: "statusIndicator",
      classList: {
        add: function (className) {
          this._classes = this._classes || new Set();
          this._classes.add(className);
        },
        remove: function (className) {
          if (this._classes) {
            this._classes.delete(className);
          }
        },
        contains: function (className) {
          return this._classes ? this._classes.has(className) : false;
        },
      },
    },
    statusText: {
      id: "statusText",
      textContent: "無効",
    },
    previewOverlay: {
      id: "previewOverlay",
      style: {},
    },
    shortcutKeyDisplay: {
      id: "shortcutKeyDisplay",
      textContent: "T",
    },
    connectionStatus: {
      id: "connectionStatus",
      textContent: "未接続",
      className: "disconnected",
    },
    opacityFeedback: {
      id: "opacityFeedback",
      textContent: "",
      style: { display: "none" },
    },
  };

  // document.getElementById のモック
  global.document = {
    getElementById: function (id) {
      return elements[id] || null;
    },
  };

  return elements;
}

// ActionCreator のモック
global.ActionCreator = {
  toggleTheaterMode: () => ({ type: "THEATER_MODE_TOGGLE" }),
  updateOpacity: (opacity) => ({
    type: "OPACITY_UPDATE",
    payload: { opacity },
  }),
  updateSettings: (updates) => ({
    type: "SETTINGS_UPDATE",
    payload: { updates },
  }),
  loadSettings: (settings) => ({
    type: "SETTINGS_LOAD",
    payload: { settings },
  }),
};

// MessageType のモック
global.MessageType = {
  THEATER_MODE_TOGGLE: "THEATER_MODE_TOGGLE",
  OPACITY_CHANGE: "OPACITY_CHANGE",
  SETTINGS_SET: "SETTINGS_SET",
  SETTINGS_GET: "SETTINGS_GET",
  UI_UPDATE: "UI_UPDATE",
  SYSTEM_ERROR: "SYSTEM_ERROR",
};

// PopupController をインポート
const { PopupController } = require("../infrastructure/popup-controller.js");

// テストスイート
describe("PopupController", () => {
  let popupController;
  let mockStateStore;
  let mockMessageBus;
  let mockLogger;
  let mockErrorHandler;
  let mockElements;

  beforeEach(() => {
    // モックを初期化
    mockStateStore = new MockStateStore();
    mockMessageBus = new MockMessageBus();
    mockLogger = new MockLogger();
    mockErrorHandler = new MockErrorHandler();
    mockElements = createMockDOM();

    // PopupController を作成
    popupController = new PopupController({
      stateStore: mockStateStore,
      messageBus: mockMessageBus,
      logger: mockLogger,
      errorHandler: mockErrorHandler,
    });
  });

  afterEach(async () => {
    // クリーンアップ
    if (popupController && popupController.uiState.isInitialized) {
      await popupController.dispose();
    }
  });

  describe("初期化", () => {
    test("正常に初期化される", async () => {
      const result = await popupController.initialize();

      expect(result.success).toBe(true);
      expect(popupController.uiState.isInitialized).toBe(true);
      expect(
        mockLogger.logs.some((log) =>
          log.message.includes("initialization completed")
        )
      ).toBe(true);
    });

    test("UI要素が見つからない場合はエラーを返す", async () => {
      // 必須要素を削除
      global.document.getElementById = () => null;

      const result = await popupController.initialize();

      expect(result.success).toBe(false);
      expect(result.error.type).toBe("ELEMENT_NOT_FOUND");
    });
  });

  describe("シアターモード切り替え", () => {
    beforeEach(async () => {
      await popupController.initialize();
    });

    test("シアターモードを正常に切り替える", async () => {
      const initialState = mockStateStore.getState().theaterMode.isEnabled;

      const result = await popupController.toggleTheaterMode();

      expect(result.success).toBe(true);
      expect(result.data).toBe(!initialState);
      expect(mockStateStore.getState().theaterMode.isEnabled).toBe(
        !initialState
      );

      // メッセージが送信されたことを確認
      const lastMessage = mockMessageBus.getLastSentMessage();
      expect(lastMessage.type).toBe("THEATER_MODE_TOGGLE");
    });

    test("初期化前の呼び出しはエラーを返す", async () => {
      await popupController.dispose();

      const result = await popupController.toggleTheaterMode();

      expect(result.success).toBe(false);
      expect(result.error.type).toBe("INITIALIZATION_ERROR");
    });
  });

  describe("透明度更新", () => {
    beforeEach(async () => {
      await popupController.initialize();
    });

    test("透明度を正常に更新する", async () => {
      const newOpacity = 0.5;

      const result = await popupController.updateOpacity(newOpacity);

      expect(result.success).toBe(true);
      expect(mockStateStore.getState().theaterMode.opacity).toBe(newOpacity);

      // メッセージが送信されたことを確認
      const lastMessage = mockMessageBus.getLastSentMessage();
      expect(lastMessage.type).toBe("OPACITY_CHANGE");
      expect(lastMessage.data.value).toBe(newOpacity);
    });

    test("範囲外の値は正規化される", async () => {
      const result1 = await popupController.updateOpacity(-0.1);
      expect(result1.success).toBe(true);
      expect(mockStateStore.getState().theaterMode.opacity).toBe(0);

      const result2 = await popupController.updateOpacity(1.5);
      expect(result2.success).toBe(true);
      expect(mockStateStore.getState().theaterMode.opacity).toBe(0.9);
    });

    test("値が5%単位に丸められる", async () => {
      const result = await popupController.updateOpacity(0.73);

      expect(result.success).toBe(true);
      expect(mockStateStore.getState().theaterMode.opacity).toBe(0.75); // 0.73 -> 0.75
    });
  });

  describe("ショートカットキー更新", () => {
    beforeEach(async () => {
      await popupController.initialize();
    });

    test("ショートカットキーを正常に更新する", async () => {
      const newShortcut = "f";

      const result = await popupController.updateShortcut(newShortcut);

      expect(result.success).toBe(true);
      expect(mockStateStore.getState().settings.keyboardShortcut).toBe(
        newShortcut
      );

      // メッセージが送信されたことを確認
      const lastMessage = mockMessageBus.getLastSentMessage();
      expect(lastMessage.type).toBe("SETTINGS_SET");
      expect(lastMessage.data.key).toBe("keyboardShortcut");
      expect(lastMessage.data.value).toBe(newShortcut);
    });
  });

  describe("透明度リセット", () => {
    beforeEach(async () => {
      await popupController.initialize();
    });

    test("透明度をデフォルト値にリセットする", async () => {
      // まず透明度を変更
      await popupController.updateOpacity(0.5);

      const result = await popupController.resetOpacityToDefault();

      expect(result.success).toBe(true);
      expect(mockStateStore.getState().theaterMode.opacity).toBe(0.7);
    });
  });

  describe("UI状態更新", () => {
    beforeEach(async () => {
      await popupController.initialize();
    });

    test("状態変更時にUIが更新される", async () => {
      // シアターモードを有効にする
      await mockStateStore.dispatch({ type: "THEATER_MODE_TOGGLE" });

      // UI要素が更新されることを確認
      expect(mockElements.theaterModeToggle.checked).toBe(true);
      expect(mockElements.statusIndicator.classList.contains("active")).toBe(
        true
      );
      expect(mockElements.statusText.textContent).toBe("有効");
    });

    test("透明度変更時にプレビューが更新される", async () => {
      const newOpacity = 0.8;
      await mockStateStore.dispatch({
        type: "OPACITY_UPDATE",
        payload: { opacity: newOpacity },
      });

      // プレビューオーバーレイが更新されることを確認
      const expectedBgColor = `rgba(0, 0, 0, ${1 - newOpacity})`;
      expect(mockElements.previewOverlay.style.backgroundColor).toBe(
        expectedBgColor
      );
      expect(mockElements.opacityValue.textContent).toBe("80%");
    });
  });

  describe("エラーハンドリング", () => {
    beforeEach(async () => {
      await popupController.initialize();
    });

    test("メッセージ送信エラーが適切に処理される", async () => {
      // メッセージバスがエラーを返すように設定
      mockMessageBus.send = async () => ({
        success: false,
        error: "Network error",
      });

      const result = await popupController.toggleTheaterMode();

      expect(result.success).toBe(false);
      expect(mockErrorHandler.handledErrors.length).toBeGreaterThan(0);
    });

    test("システムエラーメッセージが適切に処理される", async () => {
      const errorMessage = {
        type: "SYSTEM_ERROR",
        data: {
          error: {
            message: "Test error",
            type: "COMMUNICATION_ERROR",
          },
        },
      };

      // システムエラーハンドラーを呼び出し
      const handlers = mockMessageBus.handlers.get("SYSTEM_ERROR");
      if (handlers && handlers.length > 0) {
        handlers[0](errorMessage);
      }

      expect(mockElements.connectionStatus.className).toBe("error");
      expect(mockElements.connectionStatus.textContent).toBe("通信エラー");
    });
  });

  describe("破棄処理", () => {
    test("正常に破棄される", async () => {
      await popupController.initialize();

      const result = await popupController.dispose();

      expect(result.success).toBe(true);
      expect(popupController.uiState.isInitialized).toBe(false);
    });
  });

  describe("イベントハンドラー", () => {
    beforeEach(async () => {
      await popupController.initialize();
    });

    test("シアターモード切替イベントが正常に処理される", async () => {
      const toggleElement = mockElements.theaterModeToggle;
      toggleElement.checked = true;

      // change イベントをシミュレート
      const event = { target: toggleElement, type: "change" };
      if (toggleElement._handlers && toggleElement._handlers.change) {
        await toggleElement._handlers.change(event);
      }

      expect(mockStateStore.getState().theaterMode.isEnabled).toBe(true);
    });

    test("透明度変更イベントが正常に処理される", async () => {
      const sliderElement = mockElements.opacitySlider;
      sliderElement.value = "0.6";

      // input イベントをシミュレート
      const event = { target: sliderElement, type: "input" };
      if (sliderElement._handlers && sliderElement._handlers.input) {
        // デバウンスされているので少し待つ
        sliderElement._handlers.input(event);
        await new Promise((resolve) => setTimeout(resolve, 350));
      }

      expect(mockStateStore.getState().theaterMode.opacity).toBe(0.6);
    });
  });
});

// テスト実行用の関数
function runPopupControllerTests() {
  console.log("PopupController テストを実行中...");

  // 簡単なテスト実行
  const testResults = [];

  try {
    // 基本的な初期化テスト
    const mockStateStore = new MockStateStore();
    const mockMessageBus = new MockMessageBus();
    const mockLogger = new MockLogger();
    const mockErrorHandler = new MockErrorHandler();
    createMockDOM();

    const popupController = new PopupController({
      stateStore: mockStateStore,
      messageBus: mockMessageBus,
      logger: mockLogger,
      errorHandler: mockErrorHandler,
    });

    // 初期化テスト
    popupController
      .initialize()
      .then((result) => {
        testResults.push({
          test: "初期化テスト",
          passed: result.success,
          message: result.success ? "成功" : result.error.message,
        });

        if (result.success) {
          // シアターモード切り替えテスト
          return popupController.toggleTheaterMode();
        }
        return Promise.resolve({ success: false });
      })
      .then((result) => {
        testResults.push({
          test: "シアターモード切り替えテスト",
          passed: result.success,
          message: result.success
            ? "成功"
            : result.error
            ? result.error.message
            : "失敗",
        });

        // 透明度更新テスト
        return popupController.updateOpacity(0.5);
      })
      .then((result) => {
        testResults.push({
          test: "透明度更新テスト",
          passed: result.success,
          message: result.success
            ? "成功"
            : result.error
            ? result.error.message
            : "失敗",
        });

        // 結果を表示
        console.log("PopupController テスト結果:");
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
        return popupController.dispose();
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
  module.exports = { runPopupControllerTests };
}

// ブラウザ環境での実行
if (typeof window !== "undefined") {
  window.runPopupControllerTests = runPopupControllerTests;
}
