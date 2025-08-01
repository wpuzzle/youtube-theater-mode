/**
 * UIEventHandler 単体テスト
 */

// テスト用のモック依存関係
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

  trace(message, data) {
    this.logs.push({ level: "trace", message, data });
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

// DOM要素のモック
class MockElement {
  constructor(tagName, options = {}) {
    this.tagName = tagName;
    this.id = options.id || "";
    this.className = options.className || "";
    this.disabled = options.disabled || false;
    this.hidden = options.hidden || false;
    this.style = options.style || {};
    this.attributes = new Map();
    this.children = [];
    this.parentElement = null;
    this._eventListeners = new Map();
    this._handlers = new Map();

    // tabindex属性を設定
    if (options.tabindex !== undefined) {
      this.setAttribute("tabindex", options.tabindex.toString());
    }
  }

  addEventListener(event, handler, options) {
    if (!this._eventListeners.has(event)) {
      this._eventListeners.set(event, []);
    }
    this._eventListeners.get(event).push({ handler, options });
  }

  removeEventListener(event, handler) {
    if (this._eventListeners.has(event)) {
      const listeners = this._eventListeners.get(event);
      const index = listeners.findIndex((l) => l.handler === handler);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  dispatchEvent(event) {
    if (this._eventListeners.has(event.type)) {
      const listeners = this._eventListeners.get(event.type);
      listeners.forEach(({ handler }) => {
        try {
          handler(event);
        } catch (error) {
          console.warn("Error in event handler:", error);
        }
      });
    }
  }

  setAttribute(name, value) {
    this.attributes.set(name, value);
  }

  getAttribute(name) {
    return this.attributes.get(name) || null;
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  querySelector(selector) {
    // 簡単なセレクター実装
    if (selector.startsWith("#")) {
      const id = selector.substring(1);
      return this._findById(id);
    }
    if (selector.startsWith(".")) {
      const className = selector.substring(1);
      return this._findByClassName(className);
    }
    return this._findByTagName(selector);
  }

  querySelectorAll(selector) {
    const results = [];
    if (selector.startsWith("#")) {
      const element = this.querySelector(selector);
      if (element) results.push(element);
    } else if (selector.startsWith(".")) {
      const className = selector.substring(1);
      this._findAllByClassName(className, results);
    } else {
      this._findAllByTagName(selector, results);
    }
    return results;
  }

  matches(selector) {
    if (selector.startsWith("#")) {
      return this.id === selector.substring(1);
    }
    if (selector.startsWith(".")) {
      return this.className.includes(selector.substring(1));
    }
    return this.tagName.toLowerCase() === selector.toLowerCase();
  }

  focus() {
    // フォーカス処理のシミュレート
    global.document.activeElement = this;
    this.dispatchEvent({ type: "focus", target: this });
  }

  blur() {
    // ブラー処理のシミュレート
    if (global.document.activeElement === this) {
      global.document.activeElement = null;
    }
    this.dispatchEvent({ type: "blur", target: this });
  }

  click() {
    // クリック処理のシミュレート
    this.dispatchEvent({ type: "click", target: this });
  }

  appendChild(child) {
    this.children.push(child);
    child.parentElement = this;
  }

  // プライベートメソッド
  _findById(id) {
    if (this.id === id) return this;
    for (const child of this.children) {
      const result = child._findById(id);
      if (result) return result;
    }
    return null;
  }

  _findByClassName(className) {
    if (this.className.includes(className)) return this;
    for (const child of this.children) {
      const result = child._findByClassName(className);
      if (result) return result;
    }
    return null;
  }

  _findByTagName(tagName) {
    if (this.tagName.toLowerCase() === tagName.toLowerCase()) return this;
    for (const child of this.children) {
      const result = child._findByTagName(tagName);
      if (result) return result;
    }
    return null;
  }

  _findAllByClassName(className, results) {
    if (this.className.includes(className)) {
      results.push(this);
    }
    for (const child of this.children) {
      child._findAllByClassName(className, results);
    }
  }

  _findAllByTagName(tagName, results) {
    if (this.tagName.toLowerCase() === tagName.toLowerCase()) {
      results.push(this);
    }
    for (const child of this.children) {
      child._findAllByTagName(tagName, results);
    }
  }
}

// DOM環境のモック
function createMockDOM() {
  const rootElement = new MockElement("div", { id: "root" });

  // テスト用の要素を作成
  const button1 = new MockElement("button", {
    id: "btn1",
    className: "test-button",
    tabindex: 0,
  });
  const button2 = new MockElement("button", {
    id: "btn2",
    className: "test-button",
    tabindex: 0,
  });
  const input1 = new MockElement("input", {
    id: "input1",
    className: "test-input",
    tabindex: 0,
  });
  const div1 = new MockElement("div", { id: "div1", className: "test-div" });

  rootElement.appendChild(button1);
  rootElement.appendChild(button2);
  rootElement.appendChild(input1);
  rootElement.appendChild(div1);

  // グローバルなdocumentオブジェクトをモック
  global.document = {
    activeElement: null,
    getElementById: (id) => rootElement.querySelector(`#${id}`),
    querySelector: (selector) => rootElement.querySelector(selector),
    querySelectorAll: (selector) => rootElement.querySelectorAll(selector),
  };

  // windowオブジェクトをモック
  global.window = {
    getComputedStyle: (element) => ({
      display: element.style.display || "block",
      visibility: element.style.visibility || "visible",
    }),
  };

  return { rootElement, button1, button2, input1, div1 };
}

// UIEventHandler をインポート
const { UIEventHandler } = require("../infrastructure/ui-event-handler.js");

// テストスイート
describe("UIEventHandler", () => {
  let uiEventHandler;
  let mockLogger;
  let mockErrorHandler;
  let mockDOM;

  beforeEach(() => {
    // モックを初期化
    mockLogger = new MockLogger();
    mockErrorHandler = new MockErrorHandler();
    mockDOM = createMockDOM();

    // UIEventHandler を作成
    uiEventHandler = new UIEventHandler({
      rootElement: mockDOM.rootElement,
      logger: mockLogger,
      errorHandler: mockErrorHandler,
    });
  });

  afterEach(() => {
    // クリーンアップ
    if (uiEventHandler) {
      uiEventHandler.dispose();
    }
  });

  describe("初期化", () => {
    test("正常に初期化される", () => {
      expect(uiEventHandler).toBeDefined();
      expect(uiEventHandler.rootElement).toBe(mockDOM.rootElement);
      expect(uiEventHandler.logger).toBe(mockLogger);
      expect(uiEventHandler.errorHandler).toBe(mockErrorHandler);
    });

    test("デフォルト設定が適用される", () => {
      expect(uiEventHandler.accessibility.keyboardNavigation).toBe(true);
      expect(uiEventHandler.accessibility.focusManagement).toBe(true);
      expect(uiEventHandler.accessibility.ariaSupport).toBe(true);
    });
  });

  describe("イベントハンドラー登録", () => {
    test("有効な設定でハンドラーが登録される", () => {
      let handlerCalled = false;
      const handler = () => {
        handlerCalled = true;
      };

      const removeHandler = uiEventHandler.registerHandler({
        selector: "#btn1",
        event: "click",
        handler: handler,
      });

      expect(typeof removeHandler).toBe("function");
      expect(uiEventHandler.eventHandlers.has("#btn1")).toBe(true);

      // イベントをシミュレート
      const clickEvent = { type: "click", target: mockDOM.button1 };
      mockDOM.button1.dispatchEvent(clickEvent);

      expect(handlerCalled).toBe(true);
    });

    test("無効な設定では登録されない", () => {
      const removeHandler1 = uiEventHandler.registerHandler({
        // selector が欠けている
        event: "click",
        handler: () => {},
      });

      const removeHandler2 = uiEventHandler.registerHandler({
        selector: "#btn1",
        // event が欠けている
        handler: () => {},
      });

      const removeHandler3 = uiEventHandler.registerHandler({
        selector: "#btn1",
        event: "click",
        // handler が欠けている
      });

      expect(typeof removeHandler1).toBe("function");
      expect(typeof removeHandler2).toBe("function");
      expect(typeof removeHandler3).toBe("function");
      expect(uiEventHandler.eventHandlers.size).toBe(0);
    });

    test("複数のハンドラーが登録される", () => {
      const configs = [
        {
          selector: "#btn1",
          event: "click",
          handler: () => {},
        },
        {
          selector: "#btn2",
          event: "click",
          handler: () => {},
        },
        {
          selector: "#input1",
          event: "input",
          handler: () => {},
        },
      ];

      const removeHandlers = uiEventHandler.registerHandlers(configs);

      expect(typeof removeHandlers).toBe("function");
      expect(uiEventHandler.eventHandlers.size).toBe(3);
    });
  });

  describe("イベントオプション", () => {
    test("preventDefault オプションが動作する", () => {
      let preventDefaultCalled = false;
      const mockEvent = {
        type: "click",
        target: mockDOM.button1,
        preventDefault: () => {
          preventDefaultCalled = true;
        },
      };

      uiEventHandler.registerHandler({
        selector: "#btn1",
        event: "click",
        handler: () => {},
        options: { preventDefault: true },
      });

      // イベントハンドラーを直接呼び出し
      const selectorHandlers = uiEventHandler.eventHandlers.get("#btn1");
      const clickHandler = selectorHandlers.get("click");
      clickHandler(mockEvent);

      expect(preventDefaultCalled).toBe(true);
    });

    test("stopPropagation オプションが動作する", () => {
      let stopPropagationCalled = false;
      const mockEvent = {
        type: "click",
        target: mockDOM.button1,
        stopPropagation: () => {
          stopPropagationCalled = true;
        },
      };

      uiEventHandler.registerHandler({
        selector: "#btn1",
        event: "click",
        handler: () => {},
        options: { stopPropagation: true },
      });

      // イベントハンドラーを直接呼び出し
      const selectorHandlers = uiEventHandler.eventHandlers.get("#btn1");
      const clickHandler = selectorHandlers.get("click");
      clickHandler(mockEvent);

      expect(stopPropagationCalled).toBe(true);
    });

    test("デバウンスオプションが動作する", (done) => {
      let callCount = 0;
      const handler = () => {
        callCount++;
      };

      uiEventHandler.registerHandler({
        selector: "#btn1",
        event: "click",
        handler: handler,
        options: { debounce: 100 },
      });

      const mockEvent = {
        type: "click",
        target: mockDOM.button1,
      };

      // イベントハンドラーを直接呼び出し
      const selectorHandlers = uiEventHandler.eventHandlers.get("#btn1");
      const clickHandler = selectorHandlers.get("click");

      // 複数回呼び出し
      clickHandler(mockEvent);
      clickHandler(mockEvent);
      clickHandler(mockEvent);

      // デバウンス期間内では実行されない
      expect(callCount).toBe(0);

      // デバウンス期間後に1回だけ実行される
      setTimeout(() => {
        expect(callCount).toBe(1);
        done();
      }, 150);
    });
  });

  describe("キーボードナビゲーション", () => {
    test("キーボードナビゲーションが設定される", () => {
      const selectors = ["#btn1", "#btn2", "#input1"];
      const removeNavigation =
        uiEventHandler.setupKeyboardNavigation(selectors);

      expect(typeof removeNavigation).toBe("function");
      expect(uiEventHandler.focusableElements.length).toBe(3);
    });

    test("フォーカス可能な要素が正しく識別される", () => {
      // 無効な要素を作成
      const disabledButton = new MockElement("button", {
        id: "disabled-btn",
        disabled: true,
        tabindex: 0,
      });
      const hiddenInput = new MockElement("input", {
        id: "hidden-input",
        hidden: true,
        tabindex: 0,
      });
      const negativeTabIndex = new MockElement("div", {
        id: "negative-tab",
        tabindex: -1,
      });

      mockDOM.rootElement.appendChild(disabledButton);
      mockDOM.rootElement.appendChild(hiddenInput);
      mockDOM.rootElement.appendChild(negativeTabIndex);

      const selectors = ["button", "input", "div"];
      uiEventHandler.setupKeyboardNavigation(selectors);

      // フォーカス可能な要素のみが含まれることを確認
      expect(uiEventHandler.focusableElements.length).toBe(3); // btn1, btn2, input1のみ
      expect(uiEventHandler.focusableElements.includes(disabledButton)).toBe(
        false
      );
      expect(uiEventHandler.focusableElements.includes(hiddenInput)).toBe(
        false
      );
      expect(uiEventHandler.focusableElements.includes(negativeTabIndex)).toBe(
        false
      );
    });
  });

  describe("フォーカス管理", () => {
    test("フォーカス管理が設定される", () => {
      const removeFocusManagement = uiEventHandler.setupFocusManagement({
        initialFocus: "#btn1",
        trapFocus: true,
      });

      expect(typeof removeFocusManagement).toBe("function");
      expect(global.document.activeElement).toBe(mockDOM.button1);
    });

    test("フォーカス履歴が記録される", () => {
      uiEventHandler.setupFocusManagement();

      // フォーカスイベントをシミュレート
      mockDOM.button1.focus();
      mockDOM.button2.focus();

      expect(uiEventHandler.focusHistory.length).toBe(2);
      expect(uiEventHandler.focusHistory[0]).toBe(mockDOM.button1);
      expect(uiEventHandler.focusHistory[1]).toBe(mockDOM.button2);
    });
  });

  describe("ARIA サポート", () => {
    test("ARIA属性が設定される", () => {
      const ariaConfig = {
        roles: {
          "#btn1": "button",
          "#btn2": "button",
        },
        labels: {
          "#btn1": "First Button",
          "#btn2": "Second Button",
        },
        descriptions: {
          "#input1": "Text input field",
        },
        states: {
          "#btn1": { expanded: "false", pressed: "false" },
        },
      };

      const removeAriaSupport = uiEventHandler.setupAriaSupport(ariaConfig);

      expect(typeof removeAriaSupport).toBe("function");
      expect(mockDOM.button1.getAttribute("role")).toBe("button");
      expect(mockDOM.button1.getAttribute("aria-label")).toBe("First Button");
      expect(mockDOM.button1.getAttribute("aria-expanded")).toBe("false");
      expect(mockDOM.button1.getAttribute("aria-pressed")).toBe("false");
      expect(mockDOM.input1.getAttribute("aria-description")).toBe(
        "Text input field"
      );

      // ARIA属性を削除
      removeAriaSupport();

      expect(mockDOM.button1.getAttribute("role")).toBe(null);
      expect(mockDOM.button1.getAttribute("aria-label")).toBe(null);
    });
  });

  describe("イベント統計", () => {
    test("イベント統計が記録される", () => {
      let handlerCalled = false;
      uiEventHandler.registerHandler({
        selector: "#btn1",
        event: "click",
        handler: () => {
          handlerCalled = true;
        },
      });

      const mockEvent = {
        type: "click",
        target: mockDOM.button1,
      };

      // イベントハンドラーを直接呼び出し
      const selectorHandlers = uiEventHandler.eventHandlers.get("#btn1");
      const clickHandler = selectorHandlers.get("click");
      clickHandler(mockEvent);

      const stats = uiEventHandler.getEventStats();
      expect(stats.totalEvents).toBe(1);
      expect(stats.handledEvents).toBe(1);
      expect(stats.errorCount).toBe(0);
      expect(stats.eventTypes.click).toBe(1);
    });

    test("エラー統計が記録される", () => {
      uiEventHandler.registerHandler({
        selector: "#btn1",
        event: "click",
        handler: () => {
          throw new Error("Test error");
        },
      });

      const mockEvent = {
        type: "click",
        target: mockDOM.button1,
      };

      // イベントハンドラーを直接呼び出し
      const selectorHandlers = uiEventHandler.eventHandlers.get("#btn1");
      const clickHandler = selectorHandlers.get("click");
      clickHandler(mockEvent);

      const stats = uiEventHandler.getEventStats();
      expect(stats.totalEvents).toBe(1);
      expect(stats.handledEvents).toBe(0);
      expect(stats.errorCount).toBe(1);
      expect(mockErrorHandler.handledErrors.length).toBe(1);
    });

    test("統計がリセットされる", () => {
      uiEventHandler.registerHandler({
        selector: "#btn1",
        event: "click",
        handler: () => {},
      });

      const mockEvent = {
        type: "click",
        target: mockDOM.button1,
      };

      // イベントハンドラーを直接呼び出し
      const selectorHandlers = uiEventHandler.eventHandlers.get("#btn1");
      const clickHandler = selectorHandlers.get("click");
      clickHandler(mockEvent);

      let stats = uiEventHandler.getEventStats();
      expect(stats.totalEvents).toBe(1);

      uiEventHandler.resetEventStats();

      stats = uiEventHandler.getEventStats();
      expect(stats.totalEvents).toBe(0);
      expect(stats.handledEvents).toBe(0);
      expect(stats.errorCount).toBe(0);
    });
  });

  describe("破棄処理", () => {
    test("正常に破棄される", () => {
      uiEventHandler.registerHandler({
        selector: "#btn1",
        event: "click",
        handler: () => {},
      });

      expect(uiEventHandler.eventHandlers.size).toBe(1);

      uiEventHandler.dispose();

      expect(uiEventHandler.eventHandlers.size).toBe(0);
      expect(uiEventHandler.delegatedHandlers.size).toBe(0);
      expect(uiEventHandler.focusableElements.length).toBe(0);
    });
  });
});

// テスト実行用の関数
function runUIEventHandlerTests() {
  console.log("UIEventHandler テストを実行中...");

  // 簡単なテスト実行
  const testResults = [];

  try {
    // 基本的な初期化テスト
    const mockLogger = new MockLogger();
    const mockErrorHandler = new MockErrorHandler();
    const mockDOM = createMockDOM();

    const uiEventHandler = new UIEventHandler({
      rootElement: mockDOM.rootElement,
      logger: mockLogger,
      errorHandler: mockErrorHandler,
    });

    // 初期化テスト
    testResults.push({
      test: "初期化テスト",
      passed:
        uiEventHandler !== null &&
        uiEventHandler.rootElement === mockDOM.rootElement,
      message: "成功",
    });

    // イベントハンドラー登録テスト
    let handlerCalled = false;
    const removeHandler = uiEventHandler.registerHandler({
      selector: "#btn1",
      event: "click",
      handler: () => {
        handlerCalled = true;
      },
    });

    testResults.push({
      test: "イベントハンドラー登録テスト",
      passed:
        typeof removeHandler === "function" &&
        uiEventHandler.eventHandlers.has("#btn1"),
      message: "成功",
    });

    // キーボードナビゲーション設定テスト
    const removeNavigation = uiEventHandler.setupKeyboardNavigation([
      "#btn1",
      "#btn2",
    ]);

    testResults.push({
      test: "キーボードナビゲーション設定テスト",
      passed:
        typeof removeNavigation === "function" &&
        uiEventHandler.focusableElements.length > 0,
      message: "成功",
    });

    // フォーカス管理設定テスト
    const removeFocusManagement = uiEventHandler.setupFocusManagement({
      initialFocus: "#btn1",
    });

    testResults.push({
      test: "フォーカス管理設定テスト",
      passed: typeof removeFocusManagement === "function",
      message: "成功",
    });

    // ARIA サポート設定テスト
    const removeAriaSupport = uiEventHandler.setupAriaSupport({
      roles: { "#btn1": "button" },
      labels: { "#btn1": "Test Button" },
    });

    testResults.push({
      test: "ARIA サポート設定テスト",
      passed:
        typeof removeAriaSupport === "function" &&
        mockDOM.button1.getAttribute("role") === "button",
      message: "成功",
    });

    // 統計テスト
    const stats = uiEventHandler.getEventStats();

    testResults.push({
      test: "イベント統計テスト",
      passed:
        typeof stats === "object" && typeof stats.totalEvents === "number",
      message: "成功",
    });

    // 破棄テスト
    uiEventHandler.dispose();

    testResults.push({
      test: "破棄テスト",
      passed: uiEventHandler.eventHandlers.size === 0,
      message: "成功",
    });

    // 結果を表示
    console.log("UIEventHandler テスト結果:");
    testResults.forEach((result) => {
      console.log(
        `  ${result.test}: ${result.passed ? "✓" : "✗"} ${result.message}`
      );
    });

    const passedCount = testResults.filter((r) => r.passed).length;
    console.log(`\n${passedCount}/${testResults.length} テストが成功しました`);
  } catch (error) {
    console.error("テスト実行中にエラーが発生しました:", error);
  }
}

// Node.js環境でのエクスポート
if (typeof module !== "undefined" && module.exports) {
  module.exports = { runUIEventHandlerTests };
}

// ブラウザ環境での実行
if (typeof window !== "undefined") {
  window.runUIEventHandlerTests = runUIEventHandlerTests;
}
