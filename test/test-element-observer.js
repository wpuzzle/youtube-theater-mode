/**
 * YouTube Theater Mode - ElementObserver Unit Tests
 * ElementObserverクラスの単体テスト
 */

// テスト用のモックDOM環境を作成
class MockDOMEnvironment {
  constructor() {
    this.elements = new Map();
    this.documentElement = this.createMockElement("html", "documentElement");
    this.setupMockElements();
  }

  setupMockElements() {
    // モック要素を作成
    const mockElements = {
      "#movie_player": this.createMockElement("div", "movie_player"),
      ".html5-video-player": this.createMockElement(
        "div",
        "html5-video-player"
      ),
      "#secondary": this.createMockElement("div", "secondary"),
      "#comments": this.createMockElement("div", "comments"),
      "#masthead": this.createMockElement("div", "masthead"),
      ".ytp-chrome-controls": this.createMockElement(
        "div",
        "ytp-chrome-controls"
      ),
      "#meta-contents": this.createMockElement("div", "meta-contents"),
    };

    this.elements = new Map(Object.entries(mockElements));
  }

  createMockElement(tagName, id, className = "") {
    return {
      tagName: tagName.toUpperCase(),
      id: id,
      className: className,
      dataset: {},
      classList: {
        add: (cls) => {
          if (!this.className) this.className = "";
          if (!this.className.includes(cls)) {
            this.className += " " + cls;
          }
          this.className = this.className.trim();
        },
        remove: (cls) => {
          if (!this.className) return;
          this.className = this.className
            .split(" ")
            .filter((c) => c !== cls)
            .join(" ");
        },
        contains: (cls) => {
          if (!this.className) return false;
          return this.className.split(" ").includes(cls);
        },
      },
      style: {
        display: "block",
        visibility: "visible",
        opacity: "1",
      },
      getBoundingClientRect: () => ({
        top: 0,
        left: 0,
        bottom: 100,
        right: 100,
        width: 100,
        height: 100,
      }),
      offsetWidth: 100,
      offsetHeight: 100,
    };
  }

  querySelector(selector) {
    return this.elements.get(selector) || null;
  }

  querySelectorAll(selector) {
    const element = this.elements.get(selector);
    return element ? [element] : [];
  }
}

// モックロガーを作成
class MockLogger {
  constructor() {
    this.logs = [];
  }

  _log(level, message, data) {
    this.logs.push({ level, message, data });
  }

  error(message, data) {
    this._log("ERROR", message, data);
    return this;
  }
  warn(message, data) {
    this._log("WARN", message, data);
    return this;
  }
  info(message, data) {
    this._log("INFO", message, data);
    return this;
  }
  debug(message, data) {
    this._log("DEBUG", message, data);
    return this;
  }
  trace(message, data) {
    this._log("TRACE", message, data);
    return this;
  }
}

// モックエラーハンドラーを作成
class MockErrorHandler {
  constructor() {
    this.errors = [];
  }

  wrapSync(fn, options = {}) {
    try {
      const data = fn();
      return {
        success: true,
        data,
        isSuccess: () => true,
        isFailure: () => false,
      };
    } catch (error) {
      this.errors.push({ error, options });
      return {
        success: false,
        error,
        isSuccess: () => false,
        isFailure: () => true,
      };
    }
  }

  wrapAsync(promise, options = {}) {
    return promise
      .then((data) => ({
        success: true,
        data,
        isSuccess: () => true,
        isFailure: () => false,
      }))
      .catch((error) => {
        this.errors.push({ error, options });
        return {
          success: false,
          error,
          isSuccess: () => false,
          isFailure: () => true,
        };
      });
  }
}

// テストスイート
class ElementObserverTests {
  constructor() {
    this.mockDOM = new MockDOMEnvironment();
    this.mockLogger = new MockLogger();
    this.mockErrorHandler = new MockErrorHandler();
    this.testResults = [];
    this.setupGlobalMocks();
  }

  setupGlobalMocks() {
    // グローバルなdocumentオブジェクトをモック
    global.document = {
      querySelector: (selector) => this.mockDOM.querySelector(selector),
      querySelectorAll: (selector) => this.mockDOM.querySelectorAll(selector),
      documentElement: this.mockDOM.documentElement,
    };

    // windowオブジェクトをモック
    global.window = {
      getComputedStyle: (element) => element.style,
      innerHeight: 800,
      innerWidth: 1200,
    };

    // IntersectionObserverをモック
    global.IntersectionObserver = class {
      constructor(callback) {
        this.callback = callback;
        this.elements = new Set();
      }

      observe(element) {
        this.elements.add(element);

        // 即座にコールバックを呼び出す（テスト用）
        setTimeout(() => {
          this.callback([
            {
              target: element,
              isIntersecting: true,
              intersectionRatio: 1,
              boundingClientRect: element.getBoundingClientRect(),
            },
          ]);
        }, 0);
      }

      unobserve(element) {
        this.elements.delete(element);
      }

      disconnect() {
        this.elements.clear();
      }
    };

    // MutationObserverをモック
    global.MutationObserver = class {
      constructor(callback) {
        this.callback = callback;
        this.elements = new Map();
      }

      observe(element, options) {
        this.elements.set(element, options);

        // 即座にコールバックを呼び出す（テスト用）
        setTimeout(() => {
          this.callback([
            {
              target: element,
              type: "attributes",
              attributeName: "class",
            },
          ]);
        }, 0);
      }

      disconnect() {
        this.elements.clear();
      }
    };

    // ResizeObserverをモック
    global.ResizeObserver = class {
      constructor(callback) {
        this.callback = callback;
        this.elements = new Set();
      }

      observe(element) {
        this.elements.add(element);

        // 即座にコールバックを呼び出す（テスト用）
        setTimeout(() => {
          this.callback([
            {
              target: element,
              contentRect: {
                width: 100,
                height: 100,
                top: 0,
                left: 0,
                bottom: 100,
                right: 100,
              },
            },
          ]);
        }, 0);
      }

      unobserve(element) {
        this.elements.delete(element);
      }

      disconnect() {
        this.elements.clear();
      }
    };

    // Elementクラスをモック
    global.Element = class {};
  }

  createElementObserver() {
    return new ElementObserver(this.mockLogger, this.mockErrorHandler);
  }

  runTest(testName, testFunction) {
    try {
      const result = testFunction();
      this.testResults.push({
        name: testName,
        status: "PASS",
        result: result,
      });
      console.log(`✅ ${testName}: PASS`);
    } catch (error) {
      this.testResults.push({
        name: testName,
        status: "FAIL",
        error: error.message,
      });
      console.log(`❌ ${testName}: FAIL - ${error.message}`);
    }
  }

  async runAsyncTest(testName, testFunction) {
    try {
      const result = await testFunction();
      this.testResults.push({
        name: testName,
        status: "PASS",
        result: result,
      });
      console.log(`✅ ${testName}: PASS`);
    } catch (error) {
      this.testResults.push({
        name: testName,
        status: "FAIL",
        error: error.message,
      });
      console.log(`❌ ${testName}: FAIL - ${error.message}`);
    }
  }

  // テスト1: インスタンス作成
  testCreateInstance() {
    const elementObserver = this.createElementObserver();
    if (!elementObserver) {
      throw new Error("Failed to create ElementObserver instance");
    }
    if (!(elementObserver instanceof ElementObserver)) {
      throw new Error("Created object is not an ElementObserver instance");
    }
    return "Successfully created ElementObserver instance";
  }

  // テスト2: 可視性監視
  testObserveVisibility() {
    const elementObserver = this.createElementObserver();
    const element = this.mockDOM.querySelector("#movie_player");
    let callbackCalled = false;

    const result = elementObserver.observeVisibility(element, {
      callback: () => {
        callbackCalled = true;
      },
    });

    if (!result.isSuccess()) {
      throw new Error("Expected successful result");
    }

    const observerId = result.data;
    if (!observerId || typeof observerId !== "string") {
      throw new Error("Expected observer ID to be a string");
    }

    // 監視が登録されていることを確認
    if (!elementObserver.intersectionObservers.has(observerId)) {
      throw new Error("Observer not registered in intersectionObservers map");
    }

    // コールバックが呼び出されることを確認（非同期）
    setTimeout(() => {
      if (!callbackCalled) {
        console.warn("Visibility callback was not called (async)");
      }
    }, 10);

    return "Successfully registered visibility observer";
  }

  // テスト3: 変更監視
  testObserveMutations() {
    const elementObserver = this.createElementObserver();
    const element = this.mockDOM.querySelector("#movie_player");
    let callbackCalled = false;

    const result = elementObserver.observeMutations(element, {
      callback: () => {
        callbackCalled = true;
      },
    });

    if (!result.isSuccess()) {
      throw new Error("Expected successful result");
    }

    const observerId = result.data;
    if (!observerId || typeof observerId !== "string") {
      throw new Error("Expected observer ID to be a string");
    }

    // 監視が登録されていることを確認
    if (!elementObserver.mutationObservers.has(observerId)) {
      throw new Error("Observer not registered in mutationObservers map");
    }

    // コールバックが呼び出されることを確認（非同期）
    setTimeout(() => {
      if (!callbackCalled) {
        console.warn("Mutation callback was not called (async)");
      }
    }, 10);

    return "Successfully registered mutation observer";
  }

  // テスト4: サイズ変更監視
  testObserveResize() {
    const elementObserver = this.createElementObserver();
    const element = this.mockDOM.querySelector("#movie_player");
    let callbackCalled = false;

    const result = elementObserver.observeResize(element, {
      callback: () => {
        callbackCalled = true;
      },
    });

    if (!result.isSuccess()) {
      throw new Error("Expected successful result");
    }

    const observerId = result.data;
    if (!observerId || typeof observerId !== "string") {
      throw new Error("Expected observer ID to be a string");
    }

    // 監視が登録されていることを確認
    if (!elementObserver.resizeObservers.has(observerId)) {
      throw new Error("Observer not registered in resizeObservers map");
    }

    // コールバックが呼び出されることを確認（非同期）
    setTimeout(() => {
      if (!callbackCalled) {
        console.warn("Resize callback was not called (async)");
      }
    }, 10);

    return "Successfully registered resize observer";
  }

  // テスト5: 監視停止
  testStopObservation() {
    const elementObserver = this.createElementObserver();
    const element = this.mockDOM.querySelector("#movie_player");

    // 監視を登録
    const observeResult = elementObserver.observeVisibility(element, {
      callback: () => {},
    });

    const observerId = observeResult.data;

    // 監視を停止
    const stopResult = elementObserver.stopObservation(observerId);

    if (!stopResult.isSuccess()) {
      throw new Error("Expected successful result");
    }

    const stopped = stopResult.data;
    if (!stopped) {
      throw new Error("Expected stopObservation to return true");
    }

    // 監視が削除されていることを確認
    if (elementObserver.intersectionObservers.has(observerId)) {
      throw new Error("Observer still registered after stopping");
    }

    return "Successfully stops observation";
  }

  // テスト6: 全ての監視を停止
  testStopAllObservations() {
    const elementObserver = this.createElementObserver();
    const element = this.mockDOM.querySelector("#movie_player");

    // 複数の監視を登録
    elementObserver.observeVisibility(element, { callback: () => {} });
    elementObserver.observeMutations(element, { callback: () => {} });
    elementObserver.observeResize(element, { callback: () => {} });

    // 全ての監視を停止
    const result = elementObserver.stopAllObservations();

    if (!result.isSuccess()) {
      throw new Error("Expected successful result");
    }

    const counts = result.data;
    if (counts.total !== 3) {
      throw new Error(`Expected to stop 3 observations, got ${counts.total}`);
    }

    // 全ての監視が削除されていることを確認
    if (
      elementObserver.intersectionObservers.size !== 0 ||
      elementObserver.mutationObservers.size !== 0 ||
      elementObserver.resizeObservers.size !== 0
    ) {
      throw new Error("Observers still registered after stopping all");
    }

    return "Successfully stops all observations";
  }

  // テスト7: 要素の状態取得
  testGetElementState() {
    const elementObserver = this.createElementObserver();
    const element = this.mockDOM.querySelector("#movie_player");

    // 初期状態は存在しない
    const initialStateResult = elementObserver.getElementState(element);

    if (!initialStateResult.isSuccess()) {
      throw new Error("Expected successful result");
    }

    if (initialStateResult.data !== null) {
      throw new Error("Expected initial state to be null");
    }

    // 可視性監視を登録して状態を作成
    elementObserver.observeVisibility(element, { callback: () => {} });

    // 少し待ってから状態を取得
    return new Promise((resolve) => {
      setTimeout(() => {
        const stateResult = elementObserver.getElementState(element);

        if (!stateResult.isSuccess()) {
          throw new Error("Expected successful result");
        }

        const state = stateResult.data;
        if (!state) {
          throw new Error("Expected state to exist");
        }

        if (state.visible !== true) {
          throw new Error(`Expected visible to be true, got ${state.visible}`);
        }

        resolve("Successfully gets element state");
      }, 10);
    });
  }

  // テスト8: 要素の可視性確認
  testIsElementVisible() {
    const elementObserver = this.createElementObserver();
    const element = this.mockDOM.querySelector("#movie_player");

    // 可視性を確認
    const result = elementObserver.isElementVisible(element);

    if (!result.isSuccess()) {
      throw new Error("Expected successful result");
    }

    if (result.data !== true) {
      throw new Error(`Expected element to be visible, got ${result.data}`);
    }

    // 非表示要素の確認
    element.style.display = "none";

    const hiddenResult = elementObserver.isElementVisible(element);

    if (!hiddenResult.isSuccess() || hiddenResult.data !== false) {
      throw new Error("Expected hidden element to be invisible");
    }

    // 元に戻す
    element.style.display = "block";

    return "Successfully checks element visibility";
  }

  // テスト9: 要素がビューポート内にあるかの確認
  testIsElementInViewport() {
    const elementObserver = this.createElementObserver();
    const element = this.mockDOM.querySelector("#movie_player");

    // ビューポート内にあるかを確認
    const result = elementObserver.isElementInViewport(element);

    if (!result.isSuccess()) {
      throw new Error("Expected successful result");
    }

    if (result.data !== true) {
      throw new Error(`Expected element to be in viewport, got ${result.data}`);
    }

    // ビューポート外の要素を確認
    const originalGetBoundingClientRect = element.getBoundingClientRect;
    element.getBoundingClientRect = () => ({
      top: -200,
      left: 0,
      bottom: -100,
      right: 100,
      width: 100,
      height: 100,
    });

    const outsideResult = elementObserver.isElementInViewport(element);

    if (!outsideResult.isSuccess() || outsideResult.data !== false) {
      throw new Error("Expected element outside viewport to return false");
    }

    // 元に戻す
    element.getBoundingClientRect = originalGetBoundingClientRect;

    return "Successfully checks if element is in viewport";
  }

  // テスト10: 要素が表示されるまで待機
  async testWaitForElement() {
    const elementObserver = this.createElementObserver();
    const selector = "#movie_player";

    // 要素が表示されるまで待機
    const result = await elementObserver.waitForElement(selector, {
      timeout: 100,
    });

    if (!result.isSuccess()) {
      throw new Error("Expected successful result");
    }

    const element = result.data;
    if (!element) {
      throw new Error("Expected to find element");
    }

    if (element.id !== "movie_player") {
      throw new Error(`Expected movie_player, got ${element.id}`);
    }

    // 存在しない要素の待機
    const notFoundResult = await elementObserver.waitForElement(
      "#nonexistent",
      { timeout: 100 }
    );

    if (!notFoundResult.isSuccess() || notFoundResult.data !== null) {
      throw new Error("Expected null for nonexistent element");
    }

    return "Successfully waits for element";
  }

  // テスト11: クリーンアップ
  testCleanup() {
    const elementObserver = this.createElementObserver();
    const element = this.mockDOM.querySelector("#movie_player");

    // 監視を登録
    elementObserver.observeVisibility(element, { callback: () => {} });
    elementObserver.observeMutations(element, { callback: () => {} });

    // 要素の状態を作成
    const elementId = elementObserver._getElementId(element);
    elementObserver.elementStates.set(elementId, { visible: true });

    // クリーンアップ
    const result = elementObserver.cleanup();

    if (!result.isSuccess() || !result.data) {
      throw new Error("Failed to cleanup");
    }

    // 監視が削除されていることを確認
    if (
      elementObserver.intersectionObservers.size !== 0 ||
      elementObserver.mutationObservers.size !== 0 ||
      elementObserver.resizeObservers.size !== 0
    ) {
      throw new Error("Observers not cleaned up");
    }

    // 要素の状態が削除されていることを確認
    if (elementObserver.elementStates.size !== 0) {
      throw new Error("Element states not cleaned up");
    }

    return "Successfully cleans up resources";
  }

  // 全テストを実行
  async runAllTests() {
    console.log("🧪 Starting ElementObserver Unit Tests...\n");

    this.runTest("Create Instance", () => this.testCreateInstance());
    this.runTest("Observe Visibility", () => this.testObserveVisibility());
    this.runTest("Observe Mutations", () => this.testObserveMutations());
    this.runTest("Observe Resize", () => this.testObserveResize());
    this.runTest("Stop Observation", () => this.testStopObservation());
    this.runTest("Stop All Observations", () => this.testStopAllObservations());
    this.runTest("Is Element Visible", () => this.testIsElementVisible());
    this.runTest("Is Element In Viewport", () =>
      this.testIsElementInViewport()
    );

    // 非同期テスト
    await this.runAsyncTest("Get Element State", () =>
      this.testGetElementState()
    );
    await this.runAsyncTest("Wait For Element", () =>
      this.testWaitForElement()
    );
    this.runTest("Cleanup", () => this.testCleanup());

    this.printTestSummary();
  }

  printTestSummary() {
    console.log("\n📊 Test Summary:");
    console.log("================");

    const passed = this.testResults.filter(
      (test) => test.status === "PASS"
    ).length;
    const failed = this.testResults.filter(
      (test) => test.status === "FAIL"
    ).length;
    const total = this.testResults.length;

    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

    if (failed > 0) {
      console.log("\n❌ Failed Tests:");
      this.testResults
        .filter((test) => test.status === "FAIL")
        .forEach((test) => {
          console.log(`  - ${test.name}: ${test.error}`);
        });
    }

    console.log("\n🎉 ElementObserver Tests Complete!");
  }
}

// テストを実行する関数
async function runElementObserverTests() {
  // ElementObserverクラスが利用可能かチェック
  if (typeof ElementObserver === "undefined") {
    console.error(
      "❌ ElementObserver class not found. Make sure element-observer.js is loaded."
    );
    return;
  }

  const testSuite = new ElementObserverTests();
  await testSuite.runAllTests();
}

// ブラウザ環境での実行
if (typeof window !== "undefined") {
  // ページが読み込まれたらテストを実行
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runElementObserverTests);
  } else {
    runElementObserverTests();
  }
}

// Node.js環境での実行（将来的な拡張用）
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ElementObserverTests, runElementObserverTests };
}
