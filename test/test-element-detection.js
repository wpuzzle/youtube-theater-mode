/**
 * YouTube Theater Mode - Element Detection Unit Tests
 * 要素検出機能の単体テスト
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

// テストスイート
class ElementDetectionTests {
  constructor() {
    this.mockDOM = new MockDOMEnvironment();
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

    // consoleをモック（テスト中のログを制御）
    global.console = {
      log: () => {},
      warn: () => {},
      group: () => {},
      groupEnd: () => {},
    };
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

  // テスト1: findElementWithFallback - 単一セレクター
  testFindElementWithFallbackSingle() {
    const element = ElementDetector.findElementWithFallback("#movie_player");
    if (!element) {
      throw new Error("Expected to find element with #movie_player selector");
    }
    if (element.id !== "movie_player") {
      throw new Error(`Expected id 'movie_player', got '${element.id}'`);
    }
    return "Found element with single selector";
  }

  // テスト2: findElementWithFallback - 複数セレクター（フォールバック）
  testFindElementWithFallbackMultiple() {
    const selectors = ["#nonexistent", "#movie_player", ".html5-video-player"];
    const element = ElementDetector.findElementWithFallback(selectors);
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

  // テスト3: findElementWithFallback - 存在しない要素
  testFindElementWithFallbackNotFound() {
    const element = ElementDetector.findElementWithFallback("#nonexistent");
    if (element !== null) {
      throw new Error("Expected null for nonexistent element");
    }
    return "Correctly returns null for nonexistent elements";
  }

  // テスト4: findElementsWithFallback - 複数要素検出
  testFindElementsWithFallback() {
    const elements = ElementDetector.findElementsWithFallback([
      "#secondary",
      "#comments",
    ]);
    if (elements.length !== 2) {
      throw new Error(`Expected 2 elements, got ${elements.length}`);
    }
    return "Found multiple elements correctly";
  }

  // テスト5: isElementVisible - 表示要素
  testIsElementVisibleTrue() {
    const element = this.mockDOM.querySelector("#movie_player");
    const isVisible = ElementDetector.isElementVisible(element);
    if (!isVisible) {
      throw new Error("Expected element to be visible");
    }
    return "Correctly identifies visible elements";
  }

  // テスト6: isElementVisible - 非表示要素
  testIsElementVisibleFalse() {
    const element = this.mockDOM.querySelector("#movie_player");
    element.style.display = "none";
    const isVisible = ElementDetector.isElementVisible(element);
    if (isVisible) {
      throw new Error("Expected element to be invisible");
    }
    return "Correctly identifies invisible elements";
  }

  // テスト7: isElementInViewport
  testIsElementInViewport() {
    const element = this.mockDOM.querySelector("#movie_player");
    const inViewport = ElementDetector.isElementInViewport(element);
    if (!inViewport) {
      throw new Error("Expected element to be in viewport");
    }
    return "Correctly identifies elements in viewport";
  }

  // テスト8: findVideoPlayer
  testFindVideoPlayer() {
    const player = ElementDetector.findVideoPlayer();
    if (!player) {
      throw new Error("Expected to find video player");
    }
    if (player.id !== "movie_player") {
      throw new Error(`Expected movie_player, got ${player.id}`);
    }
    return "Successfully finds video player";
  }

  // テスト9: findOverlayTargets
  testFindOverlayTargets() {
    const targets = ElementDetector.findOverlayTargets();
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

  // テスト10: waitForElement (簡易版 - タイムアウトテスト)
  async testWaitForElementTimeout() {
    const startTime = Date.now();
    const element = await ElementDetector.waitForElement(
      "#nonexistent",
      500,
      50
    );
    const endTime = Date.now();

    if (element !== null) {
      throw new Error("Expected null for nonexistent element");
    }

    const duration = endTime - startTime;
    if (duration < 450 || duration > 600) {
      throw new Error(`Expected timeout around 500ms, got ${duration}ms`);
    }

    return "Timeout mechanism works correctly";
  }

  // 全テストを実行
  async runAllTests() {
    console.log("🧪 Starting Element Detection Unit Tests...\n");

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
    this.runTest("findVideoPlayer", () => this.testFindVideoPlayer());
    this.runTest("findOverlayTargets", () => this.testFindOverlayTargets());

    // 非同期テスト
    try {
      const result = await this.testWaitForElementTimeout();
      this.testResults.push({
        name: "waitForElement - Timeout",
        status: "PASS",
        result: result,
      });
      console.log(`✅ waitForElement - Timeout: PASS`);
    } catch (error) {
      this.testResults.push({
        name: "waitForElement - Timeout",
        status: "FAIL",
        error: error.message,
      });
      console.log(`❌ waitForElement - Timeout: FAIL - ${error.message}`);
    }

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

    console.log("\n🎉 Element Detection Tests Complete!");
  }
}

// テストを実行する関数
async function runElementDetectionTests() {
  // ElementDetectorクラスが利用可能かチェック
  if (typeof ElementDetector === "undefined") {
    console.error(
      "❌ ElementDetector class not found. Make sure content.js is loaded."
    );
    return;
  }

  const testSuite = new ElementDetectionTests();
  await testSuite.runAllTests();
}

// ブラウザ環境での実行
if (typeof window !== "undefined") {
  // ページが読み込まれたらテストを実行
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runElementDetectionTests);
  } else {
    runElementDetectionTests();
  }
}

// Node.js環境での実行（将来的な拡張用）
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ElementDetectionTests, runElementDetectionTests };
}
