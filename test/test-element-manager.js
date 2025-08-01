/**
 * YouTube Theater Mode - ElementManager Unit Tests
 * ElementManagerクラスの単体テスト
 */

// テスト用のモックDOM環境を作成
class MockDOMEnvironment {
  constructor() {
    this.elements = new Map();
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
      offsetWidth: 100,
      offsetHeight: 100,
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
      matches: (selector) => {
        if (selector.startsWith("#")) {
          return this.id === selector.substring(1);
        }
        if (selector.startsWith(".")) {
          return this.className.includes(selector.substring(1));
        }
        return false;
      },
      closest: (selector) => {
        return this.matches(selector) ? this : null;
      },
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
class ElementManagerTests {
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
    };

    // windowオブジェクトをモック
    global.window = {
      getComputedStyle: (element) => element.style,
      innerHeight: 800,
      innerWidth: 1200,
    };

    // MutationObserverをモック
    global.MutationObserver = class {
      constructor(callback) {
        this.callback = callback;
        this.targets = new Set();
      }

      observe(target, config) {
        this.targets.add(target);
      }

      disconnect() {
        this.targets.clear();
      }
    };

    // IntersectionObserverをモック
    global.IntersectionObserver = class {
      constructor(callback, config) {
        this.callback = callback;
        this.config = config;
        this.targets = new Set();
      }

      observe(target) {
        this.targets.add(target);
      }

      disconnect() {
        this.targets.clear();
      }
    };
  }

  createElementManager() {
    return new ElementManager(this.mockLogger, this.mockErrorHandler);
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
    const elementManager = this.createElementManager();
    if (!elementManager) {
      throw new Error("Failed to create ElementManager instance");
    }
    if (!(elementManager instanceof ElementManager)) {
      throw new Error("Created object is not an ElementManager instance");
    }
    return "Successfully created ElementManager instance";
  }

  // テスト2: セレクター定義
  testSelectors() {
    const elementManager = this.createElementManager();
    const selectors = elementManager.getSelectors();

    if (!selectors.videoPlayer || !Array.isArray(selectors.videoPlayer)) {
      throw new Error("videoPlayer selectors not defined correctly");
    }

    if (!selectors.overlayTargets || !Array.isArray(selectors.overlayTargets)) {
      throw new Error("overlayTargets selectors not defined correctly");
    }

    if (
      !selectors.protectedElements ||
      !Array.isArray(selectors.protectedElements)
    ) {
      throw new Error("protectedElements selectors not defined correctly");
    }

    return "Selectors defined correctly";
  }

  // テスト3: findElementWithFallback - 単一セレクター
  testFindElementWithFallbackSingle() {
    const elementManager = this.createElementManager();
    const result = elementManager.findElementWithFallback("#movie_player");

    if (!result.isSuccess()) {
      throw new Error("Expected successful result");
    }

    const element = result.data;
    if (!element) {
      throw new Error("Expected to find element with #movie_player selector");
    }

    if (element.id !== "movie_player") {
      throw new Error(`Expected id 'movie_player', got '${element.id}'`);
    }

    return "Found element with single selector";
  }

  // テスト4: findElementWithFallback - 複数セレクター（フォールバック）
  testFindElementWithFallbackMultiple() {
    const elementManager = this.createElementManager();
    const selectors = ["#nonexistent", "#movie_player", ".html5-video-player"];
    const result = elementManager.findElementWithFallback(selectors);

    if (!result.isSuccess()) {
      throw new Error("Expected successful result");
    }

    const element = result.data;
    if (!element) {
      throw new Error("Expected to find element with fallback selectors");
    }

    if (element.id !== "movie_player") {
      throw new Error(
        `Expected fallback to find movie_player, got '${element.id}'`
      );
    }

    return "Fallback mechanism works correctly";
  }

  // テスト5: findElementWithFallback - 存在しない要素
  testFindElementWithFallbackNotFound() {
    const elementManager = this.createElementManager();
    const result = elementManager.findElementWithFallback("#nonexistent");

    if (!result.isSuccess()) {
      throw new Error("Expected successful result even for not found element");
    }

    const element = result.data;
    if (element !== null) {
      throw new Error("Expected null for nonexistent element");
    }

    return "Correctly returns null for nonexistent elements";
  }

  // テスト6: findElementsWithFallback - 複数要素検出
  testFindElementsWithFallback() {
    const elementManager = this.createElementManager();
    const result = elementManager.findElementsWithFallback([
      "#secondary",
      "#comments",
    ]);

    if (!result.isSuccess()) {
      throw new Error("Expected successful result");
    }

    const elements = result.data;
    if (!Array.isArray(elements)) {
      throw new Error("Expected array result");
    }

    if (elements.length !== 2) {
      throw new Error(`Expected 2 elements, got ${elements.length}`);
    }

    return "Found multiple elements correctly";
  }

  // テスト7: isElementVisible - 表示要素
  testIsElementVisibleTrue() {
    const elementManager = this.createElementManager();
    const element = this.mockDOM.querySelector("#movie_player");
    const isVisible = elementManager.isElementVisible(element);

    if (!isVisible) {
      throw new Error("Expected element to be visible");
    }

    return "Correctly identifies visible elements";
  }

  // テスト8: isElementVisible - 非表示要素
  testIsElementVisibleFalse() {
    const elementManager = this.createElementManager();
    const element = this.mockDOM.querySelector("#movie_player");
    element.style.display = "none";

    const isVisible = elementManager.isElementVisible(element);
    if (isVisible) {
      throw new Error("Expected element to be invisible");
    }

    // テスト後に元に戻す
    element.style.display = "block";

    return "Correctly identifies invisible elements";
  }

  // テスト9: isElementInViewport
  testIsElementInViewport() {
    const elementManager = this.createElementManager();
    const element = this.mockDOM.querySelector("#movie_player");
    const inViewport = elementManager.isElementInViewport(element);

    if (!inViewport) {
      throw new Error("Expected element to be in viewport");
    }

    return "Correctly identifies elements in viewport";
  }

  // テスト10: detectVideoPlayer
  async testDetectVideoPlayer() {
    const elementManager = this.createElementManager();
    const result = await elementManager.detectVideoPlayer({ timeout: 500 });

    if (!result.isSuccess()) {
      throw new Error("Expected successful result");
    }

    const player = result.data;
    if (!player) {
      throw new Error("Expected to find video player");
    }

    if (player.id !== "movie_player") {
      throw new Error(`Expected movie_player, got ${player.id}`);
    }

    return "Successfully detects video player";
  }

  // テスト11: findOverlayTargets
  testFindOverlayTargets() {
    const elementManager = this.createElementManager();
    const result = elementManager.findOverlayTargets();

    if (!result.isSuccess()) {
      throw new Error("Expected successful result");
    }

    const targets = result.data;
    if (!Array.isArray(targets)) {
      throw new Error("Expected array result");
    }

    if (targets.length === 0) {
      throw new Error("Expected to find overlay targets");
    }

    // 保護対象要素が除外されていることを確認
    const hasProtectedElement = targets.some(
      (element) => element.id === "movie_player"
    );

    if (hasProtectedElement) {
      throw new Error(
        "Protected elements should be excluded from overlay targets"
      );
    }

    return "Successfully finds overlay targets and excludes protected elements";
  }

  // テスト12: observeElementChanges
  testObserveElementChanges() {
    const elementManager = this.createElementManager();
    const element = this.mockDOM.querySelector("#movie_player");

    const result = elementManager.observeElementChanges(element, {
      callback: () => {},
    });

    if (!result.isSuccess()) {
      throw new Error("Expected successful result");
    }

    const observerId = result.data;
    if (!observerId || typeof observerId !== "string") {
      throw new Error("Expected observer ID to be a string");
    }

    // 監視が登録されていることを確認
    if (!elementManager.observers.has(observerId)) {
      throw new Error("Observer not registered in observers map");
    }

    return "Successfully registers element change observer";
  }

  // テスト13: observeElementVisibility
  testObserveElementVisibility() {
    const elementManager = this.createElementManager();
    const element = this.mockDOM.querySelector("#movie_player");

    const result = elementManager.observeElementVisibility(element, {
      callback: () => {},
    });

    if (!result.isSuccess()) {
      throw new Error("Expected successful result");
    }

    const observerId = result.data;
    if (!observerId || typeof observerId !== "string") {
      throw new Error("Expected observer ID to be a string");
    }

    // 監視が登録されていることを確認
    if (!elementManager.observers.has(observerId)) {
      throw new Error("Observer not registered in observers map");
    }

    return "Successfully registers element visibility observer";
  }

  // テスト14: stopObservation
  testStopObservation() {
    const elementManager = this.createElementManager();
    const element = this.mockDOM.querySelector("#movie_player");

    // 監視を登録
    const observeResult = elementManager.observeElementChanges(element, {
      callback: () => {},
    });

    const observerId = observeResult.data;

    // 監視を停止
    const stopResult = elementManager.stopObservation(observerId);

    if (!stopResult.isSuccess()) {
      throw new Error("Expected successful result");
    }

    const stopped = stopResult.data;
    if (!stopped) {
      throw new Error("Expected stopObservation to return true");
    }

    // 監視が削除されていることを確認
    if (elementManager.observers.has(observerId)) {
      throw new Error("Observer still registered after stopping");
    }

    return "Successfully stops observation";
  }

  // テスト15: stopAllObservations
  testStopAllObservations() {
    const elementManager = this.createElementManager();
    const element = this.mockDOM.querySelector("#movie_player");

    // 複数の監視を登録
    elementManager.observeElementChanges(element, { callback: () => {} });
    elementManager.observeElementVisibility(element, { callback: () => {} });

    // 全ての監視を停止
    const result = elementManager.stopAllObservations();

    if (!result.isSuccess()) {
      throw new Error("Expected successful result");
    }

    const count = result.data;
    if (count !== 2) {
      throw new Error(`Expected to stop 2 observations, got ${count}`);
    }

    // 全ての監視が削除されていることを確認
    if (elementManager.observers.size !== 0) {
      throw new Error("Observers still registered after stopping all");
    }

    return "Successfully stops all observations";
  }

  // テスト16: clearCache
  testClearCache() {
    const elementManager = this.createElementManager();

    // キャッシュにデータを追加
    elementManager.cache.set("test", "value");
    elementManager.cacheExpiry.set("test", Date.now() + 1000);

    // キャッシュをクリア
    const result = elementManager.clearCache();

    if (!result.isSuccess()) {
      throw new Error("Expected successful result");
    }

    // キャッシュが空になっていることを確認
    if (
      elementManager.cache.size !== 0 ||
      elementManager.cacheExpiry.size !== 0
    ) {
      throw new Error("Cache not cleared");
    }

    return "Successfully clears cache";
  }

  // テスト17: cleanup
  testCleanup() {
    const elementManager = this.createElementManager();
    const element = this.mockDOM.querySelector("#movie_player");

    // 監視を登録
    elementManager.observeElementChanges(element, { callback: () => {} });

    // キャッシュにデータを追加
    elementManager.cache.set("test", "value");
    elementManager.cacheExpiry.set("test", Date.now() + 1000);

    // クリーンアップ
    const result = elementManager.cleanup();

    if (!result.isSuccess()) {
      throw new Error("Expected successful result");
    }

    // 監視とキャッシュが空になっていることを確認
    if (
      elementManager.observers.size !== 0 ||
      elementManager.cache.size !== 0 ||
      elementManager.cacheExpiry.size !== 0
    ) {
      throw new Error("Resources not cleaned up");
    }

    return "Successfully cleans up resources";
  }

  // 全テストを実行
  async runAllTests() {
    console.log("🧪 Starting ElementManager Unit Tests...\n");

    this.runTest("Create Instance", () => this.testCreateInstance());
    this.runTest("Selectors Definition", () => this.testSelectors());
    this.runTest("findElementWithFallback - Single Selector", () =>
      this.testFindElementWithFallbackSingle()
    );
    this.runTest("findElementWithFallback - Multiple Selectors", () =>
      this.testFindElementWithFallbackMultiple()
    );
    this.runTest("findElementWithFallback - Not Found", () =>
      this.testFindElementWithFallbackNotFound()
    );
    this.runTest("findElementsWithFallback", () =>
      this.testFindElementsWithFallback()
    );
    this.runTest("isElementVisible - True", () =>
      this.testIsElementVisibleTrue()
    );
    this.runTest("isElementVisible - False", () =>
      this.testIsElementVisibleFalse()
    );
    this.runTest("isElementInViewport", () => this.testIsElementInViewport());
    this.runTest("observeElementChanges", () =>
      this.testObserveElementChanges()
    );
    this.runTest("observeElementVisibility", () =>
      this.testObserveElementVisibility()
    );
    this.runTest("stopObservation", () => this.testStopObservation());
    this.runTest("stopAllObservations", () => this.testStopAllObservations());
    this.runTest("clearCache", () => this.testClearCache());
    this.runTest("cleanup", () => this.testCleanup());

    // 非同期テスト
    await this.runAsyncTest("detectVideoPlayer", () =>
      this.testDetectVideoPlayer()
    );
    this.runTest("findOverlayTargets", () => this.testFindOverlayTargets());

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

    console.log("\n🎉 ElementManager Tests Complete!");
  }
}

// テストを実行する関数
async function runElementManagerTests() {
  // ElementManagerクラスが利用可能かチェック
  if (typeof ElementManager === "undefined") {
    console.error(
      "❌ ElementManager class not found. Make sure element-manager.js is loaded."
    );
    return;
  }

  const testSuite = new ElementManagerTests();
  await testSuite.runAllTests();
}

// ブラウザ環境での実行
if (typeof window !== "undefined") {
  // ページが読み込まれたらテストを実行
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runElementManagerTests);
  } else {
    runElementManagerTests();
  }
}

// Node.js環境での実行（将来的な拡張用）
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ElementManagerTests, runElementManagerTests };
}
