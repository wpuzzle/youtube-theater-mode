/**
 * YouTube Theater Mode - OverlayManager Unit Tests
 * OverlayManagerクラスの単体テスト
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
        opacity: "",
        transition: "",
        setProperty: (prop, value) => {
          this[prop] = value;
        },
        removeProperty: (prop) => {
          delete this[prop];
        },
      },
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
class OverlayManagerTests {
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
      requestAnimationFrame: (callback) => setTimeout(callback, 0),
    };

    // パフォーマンスAPIをモック
    global.performance = {
      now: () => Date.now(),
    };

    // Elementクラスをモック
    global.Element = class {};
  }

  createOverlayManager(options = {}) {
    return new OverlayManager(this.mockLogger, this.mockErrorHandler, options);
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
    const overlayManager = this.createOverlayManager();
    if (!overlayManager) {
      throw new Error("Failed to create OverlayManager instance");
    }
    if (!(overlayManager instanceof OverlayManager)) {
      throw new Error("Created object is not an OverlayManager instance");
    }
    return "Successfully created OverlayManager instance";
  }

  // テスト2: デフォルト設定
  testDefaultSettings() {
    const overlayManager = this.createOverlayManager();

    if (overlayManager.defaultOpacity !== 0.7) {
      throw new Error(
        `Expected defaultOpacity to be 0.7, got ${overlayManager.defaultOpacity}`
      );
    }

    if (overlayManager.overlayClass !== "theater-mode-overlay") {
      throw new Error(
        `Expected overlayClass to be 'theater-mode-overlay', got ${overlayManager.overlayClass}`
      );
    }

    if (overlayManager.protectedClass !== "theater-mode-video-area") {
      throw new Error(
        `Expected protectedClass to be 'theater-mode-video-area', got ${overlayManager.protectedClass}`
      );
    }

    return "Default settings are correct";
  }

  // テスト3: カスタム設定
  testCustomSettings() {
    const customOptions = {
      defaultOpacity: 0.5,
      overlayClass: "custom-overlay",
      protectedClass: "custom-protected",
      animationDuration: 500,
    };

    const overlayManager = this.createOverlayManager(customOptions);

    if (overlayManager.defaultOpacity !== 0.5) {
      throw new Error(
        `Expected defaultOpacity to be 0.5, got ${overlayManager.defaultOpacity}`
      );
    }

    if (overlayManager.overlayClass !== "custom-overlay") {
      throw new Error(
        `Expected overlayClass to be 'custom-overlay', got ${overlayManager.overlayClass}`
      );
    }

    if (overlayManager.protectedClass !== "custom-protected") {
      throw new Error(
        `Expected protectedClass to be 'custom-protected', got ${overlayManager.protectedClass}`
      );
    }

    if (overlayManager.animationDuration !== 500) {
      throw new Error(
        `Expected animationDuration to be 500, got ${overlayManager.animationDuration}`
      );
    }

    return "Custom settings are applied correctly";
  }

  // テスト4: オーバーレイ適用
  testApplyOverlay() {
    const overlayManager = this.createOverlayManager();
    const targetElements = [
      this.mockDOM.querySelector("#secondary"),
      this.mockDOM.querySelector("#comments"),
    ];

    const result = overlayManager.applyOverlay(targetElements);

    if (!result.isSuccess()) {
      throw new Error("Expected successful result");
    }

    if (!result.data) {
      throw new Error("Expected applyOverlay to return true");
    }

    if (!overlayManager.isActive) {
      throw new Error("Expected overlay to be active");
    }

    if (overlayManager.overlayElements.size !== 2) {
      throw new Error(
        `Expected 2 overlay elements, got ${overlayManager.overlayElements.size}`
      );
    }

    // CSSカスタムプロパティが設定されていることを確認
    if (document.documentElement.style["--theater-mode-opacity"] !== 0.7) {
      throw new Error("CSS custom property not set correctly");
    }

    return "Successfully applied overlay";
  }

  // テスト5: 保護要素の設定
  testProtectedElements() {
    const overlayManager = this.createOverlayManager();
    const targetElements = [this.mockDOM.querySelector("#secondary")];
    const protectedElements = [this.mockDOM.querySelector("#movie_player")];

    const result = overlayManager.applyOverlay(
      targetElements,
      protectedElements
    );

    if (!result.isSuccess() || !result.data) {
      throw new Error("Failed to apply overlay");
    }

    if (overlayManager.protectedElements.size !== 1) {
      throw new Error(
        `Expected 1 protected element, got ${overlayManager.protectedElements.size}`
      );
    }

    const protectedElement = this.mockDOM.querySelector("#movie_player");
    if (!protectedElement.className.includes(overlayManager.protectedClass)) {
      throw new Error("Protected class not applied to element");
    }

    return "Successfully applied protection to elements";
  }

  // テスト6: オーバーレイ削除
  testClearOverlay() {
    const overlayManager = this.createOverlayManager();
    const targetElements = [
      this.mockDOM.querySelector("#secondary"),
      this.mockDOM.querySelector("#comments"),
    ];

    // オーバーレイを適用
    overlayManager.applyOverlay(targetElements);

    // オーバーレイを削除（アニメーションなし）
    const result = overlayManager.clearOverlay(false);

    if (!result.isSuccess() || !result.data) {
      throw new Error("Failed to clear overlay");
    }

    if (overlayManager.isActive) {
      throw new Error("Expected overlay to be inactive");
    }

    if (overlayManager.overlayElements.size !== 0) {
      throw new Error(
        `Expected 0 overlay elements, got ${overlayManager.overlayElements.size}`
      );
    }

    // CSSカスタムプロパティが削除されていることを確認
    if (
      document.documentElement.style.hasOwnProperty("--theater-mode-opacity")
    ) {
      throw new Error("CSS custom property not removed");
    }

    return "Successfully cleared overlay";
  }

  // テスト7: 透明度更新
  testUpdateOpacity() {
    const overlayManager = this.createOverlayManager();

    // 透明度を更新
    const result = overlayManager.updateOpacity(0.5);

    if (!result.isSuccess()) {
      throw new Error("Expected successful result");
    }

    if (result.data !== 0.5) {
      throw new Error(`Expected opacity to be 0.5, got ${result.data}`);
    }

    if (overlayManager.currentOpacity !== 0.5) {
      throw new Error(
        `Expected currentOpacity to be 0.5, got ${overlayManager.currentOpacity}`
      );
    }

    // 範囲外の値をテスト
    const result2 = overlayManager.updateOpacity(1.5);

    if (!result2.isSuccess() || result2.data !== 0.9) {
      throw new Error(
        `Expected opacity to be capped at 0.9, got ${result2.data}`
      );
    }

    const result3 = overlayManager.updateOpacity(-0.5);

    if (!result3.isSuccess() || result3.data !== 0) {
      throw new Error(
        `Expected opacity to be floored at 0, got ${result3.data}`
      );
    }

    return "Successfully updated opacity";
  }

  // テスト8: 要素の追加
  testAddElements() {
    const overlayManager = this.createOverlayManager();

    // 初期化
    overlayManager.isActive = true;

    // 要素を追加
    const element = this.mockDOM.querySelector("#masthead");
    const result = overlayManager.addElements(element);

    if (!result.isSuccess()) {
      throw new Error("Expected successful result");
    }

    if (result.data !== 1) {
      throw new Error(`Expected 1 element to be added, got ${result.data}`);
    }

    if (overlayManager.overlayElements.size !== 1) {
      throw new Error(
        `Expected 1 overlay element, got ${overlayManager.overlayElements.size}`
      );
    }

    // 複数要素を追加
    const elements = [
      this.mockDOM.querySelector("#secondary"),
      this.mockDOM.querySelector("#comments"),
    ];

    const result2 = overlayManager.addElements(elements);

    if (!result2.isSuccess() || result2.data !== 2) {
      throw new Error(`Expected 2 elements to be added, got ${result2.data}`);
    }

    if (overlayManager.overlayElements.size !== 3) {
      throw new Error(
        `Expected 3 overlay elements, got ${overlayManager.overlayElements.size}`
      );
    }

    return "Successfully added elements";
  }

  // テスト9: 保護要素の追加
  testAddProtectedElements() {
    const overlayManager = this.createOverlayManager();

    // 要素を追加
    const element = this.mockDOM.querySelector("#movie_player");
    const result = overlayManager.addProtectedElements(element);

    if (!result.isSuccess()) {
      throw new Error("Expected successful result");
    }

    if (result.data !== 1) {
      throw new Error(`Expected 1 element to be added, got ${result.data}`);
    }

    if (overlayManager.protectedElements.size !== 1) {
      throw new Error(
        `Expected 1 protected element, got ${overlayManager.protectedElements.size}`
      );
    }

    // 複数要素を追加
    const elements = [
      this.mockDOM.querySelector(".html5-video-player"),
      this.mockDOM.querySelector(".ytp-chrome-controls"),
    ];

    const result2 = overlayManager.addProtectedElements(elements);

    if (!result2.isSuccess() || result2.data !== 2) {
      throw new Error(`Expected 2 elements to be added, got ${result2.data}`);
    }

    if (overlayManager.protectedElements.size !== 3) {
      throw new Error(
        `Expected 3 protected elements, got ${overlayManager.protectedElements.size}`
      );
    }

    return "Successfully added protected elements";
  }

  // テスト10: 要素の削除
  testRemoveElements() {
    const overlayManager = this.createOverlayManager();

    // 初期化
    overlayManager.isActive = true;
    const elements = [
      this.mockDOM.querySelector("#secondary"),
      this.mockDOM.querySelector("#comments"),
      this.mockDOM.querySelector("#masthead"),
    ];

    overlayManager.addElements(elements);

    // 要素を削除
    const result = overlayManager.removeElements(
      this.mockDOM.querySelector("#secondary")
    );

    if (!result.isSuccess()) {
      throw new Error("Expected successful result");
    }

    if (result.data !== 1) {
      throw new Error(`Expected 1 element to be removed, got ${result.data}`);
    }

    if (overlayManager.overlayElements.size !== 2) {
      throw new Error(
        `Expected 2 overlay elements, got ${overlayManager.overlayElements.size}`
      );
    }

    // 複数要素を削除
    const elementsToRemove = [
      this.mockDOM.querySelector("#comments"),
      this.mockDOM.querySelector("#masthead"),
    ];

    const result2 = overlayManager.removeElements(elementsToRemove);

    if (!result2.isSuccess() || result2.data !== 2) {
      throw new Error(`Expected 2 elements to be removed, got ${result2.data}`);
    }

    if (overlayManager.overlayElements.size !== 0) {
      throw new Error(
        `Expected 0 overlay elements, got ${overlayManager.overlayElements.size}`
      );
    }

    return "Successfully removed elements";
  }

  // テスト11: 保護要素の削除
  testRemoveProtectedElements() {
    const overlayManager = this.createOverlayManager();

    // 初期化
    const elements = [
      this.mockDOM.querySelector("#movie_player"),
      this.mockDOM.querySelector(".html5-video-player"),
      this.mockDOM.querySelector(".ytp-chrome-controls"),
    ];

    overlayManager.addProtectedElements(elements);

    // 要素を削除
    const result = overlayManager.removeProtectedElements(
      this.mockDOM.querySelector("#movie_player")
    );

    if (!result.isSuccess()) {
      throw new Error("Expected successful result");
    }

    if (result.data !== 1) {
      throw new Error(`Expected 1 element to be removed, got ${result.data}`);
    }

    if (overlayManager.protectedElements.size !== 2) {
      throw new Error(
        `Expected 2 protected elements, got ${overlayManager.protectedElements.size}`
      );
    }

    // 複数要素を削除
    const elementsToRemove = [
      this.mockDOM.querySelector(".html5-video-player"),
      this.mockDOM.querySelector(".ytp-chrome-controls"),
    ];

    const result2 = overlayManager.removeProtectedElements(elementsToRemove);

    if (!result2.isSuccess() || result2.data !== 2) {
      throw new Error(`Expected 2 elements to be removed, got ${result2.data}`);
    }

    if (overlayManager.protectedElements.size !== 0) {
      throw new Error(
        `Expected 0 protected elements, got ${overlayManager.protectedElements.size}`
      );
    }

    return "Successfully removed protected elements";
  }

  // テスト12: 状態取得
  testGetState() {
    const overlayManager = this.createOverlayManager();

    // 初期状態を確認
    const initialState = overlayManager.getState();

    if (initialState.isActive !== false) {
      throw new Error(
        `Expected isActive to be false, got ${initialState.isActive}`
      );
    }

    if (initialState.opacity !== 0.7) {
      throw new Error(
        `Expected opacity to be 0.7, got ${initialState.opacity}`
      );
    }

    if (initialState.overlayElementsCount !== 0) {
      throw new Error(
        `Expected overlayElementsCount to be 0, got ${initialState.overlayElementsCount}`
      );
    }

    // 状態を変更
    overlayManager.isActive = true;
    overlayManager.currentOpacity = 0.5;
    overlayManager.addElements([
      this.mockDOM.querySelector("#secondary"),
      this.mockDOM.querySelector("#comments"),
    ]);
    overlayManager.addProtectedElements(
      this.mockDOM.querySelector("#movie_player")
    );

    // 変更後の状態を確認
    const updatedState = overlayManager.getState();

    if (updatedState.isActive !== true) {
      throw new Error(
        `Expected isActive to be true, got ${updatedState.isActive}`
      );
    }

    if (updatedState.opacity !== 0.5) {
      throw new Error(
        `Expected opacity to be 0.5, got ${updatedState.opacity}`
      );
    }

    if (updatedState.overlayElementsCount !== 2) {
      throw new Error(
        `Expected overlayElementsCount to be 2, got ${updatedState.overlayElementsCount}`
      );
    }

    if (updatedState.protectedElementsCount !== 1) {
      throw new Error(
        `Expected protectedElementsCount to be 1, got ${updatedState.protectedElementsCount}`
      );
    }

    return "Successfully retrieved state";
  }

  // テスト13: クリーンアップ
  testCleanup() {
    const overlayManager = this.createOverlayManager();

    // 初期化
    overlayManager.isActive = true;
    overlayManager.addElements([
      this.mockDOM.querySelector("#secondary"),
      this.mockDOM.querySelector("#comments"),
    ]);
    overlayManager.addProtectedElements(
      this.mockDOM.querySelector("#movie_player")
    );

    // クリーンアップ
    const result = overlayManager.cleanup();

    if (!result.isSuccess() || !result.data) {
      throw new Error("Failed to cleanup");
    }

    if (overlayManager.isActive) {
      throw new Error("Expected overlay to be inactive after cleanup");
    }

    if (overlayManager.overlayElements.size !== 0) {
      throw new Error(
        `Expected 0 overlay elements after cleanup, got ${overlayManager.overlayElements.size}`
      );
    }

    if (overlayManager.protectedElements.size !== 0) {
      throw new Error(
        `Expected 0 protected elements after cleanup, got ${overlayManager.protectedElements.size}`
      );
    }

    if (overlayManager.pendingUpdates.size !== 0) {
      throw new Error(
        `Expected 0 pending updates after cleanup, got ${overlayManager.pendingUpdates.size}`
      );
    }

    return "Successfully cleaned up resources";
  }

  // 全テストを実行
  async runAllTests() {
    console.log("🧪 Starting OverlayManager Unit Tests...\n");

    this.runTest("Create Instance", () => this.testCreateInstance());
    this.runTest("Default Settings", () => this.testDefaultSettings());
    this.runTest("Custom Settings", () => this.testCustomSettings());
    this.runTest("Apply Overlay", () => this.testApplyOverlay());
    this.runTest("Protected Elements", () => this.testProtectedElements());
    this.runTest("Clear Overlay", () => this.testClearOverlay());
    this.runTest("Update Opacity", () => this.testUpdateOpacity());
    this.runTest("Add Elements", () => this.testAddElements());
    this.runTest("Add Protected Elements", () =>
      this.testAddProtectedElements()
    );
    this.runTest("Remove Elements", () => this.testRemoveElements());
    this.runTest("Remove Protected Elements", () =>
      this.testRemoveProtectedElements()
    );
    this.runTest("Get State", () => this.testGetState());
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

    console.log("\n🎉 OverlayManager Tests Complete!");
  }
}

// テストを実行する関数
async function runOverlayManagerTests() {
  // OverlayManagerクラスが利用可能かチェック
  if (typeof OverlayManager === "undefined") {
    console.error(
      "❌ OverlayManager class not found. Make sure overlay-manager.js is loaded."
    );
    return;
  }

  const testSuite = new OverlayManagerTests();
  await testSuite.runAllTests();
}

// ブラウザ環境での実行
if (typeof window !== "undefined") {
  // ページが読み込まれたらテストを実行
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runOverlayManagerTests);
  } else {
    runOverlayManagerTests();
  }
}

// Node.js環境での実行（将来的な拡張用）
if (typeof module !== "undefined" && module.exports) {
  module.exports = { OverlayManagerTests, runOverlayManagerTests };
}
