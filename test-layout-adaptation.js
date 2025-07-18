/**
 * YouTube Theater Mode - Layout Adaptation Unit Tests
 * レイアウト変更対応機能の単体テスト
 */

// テスト用のモックDOM環境を作成
class MockDynamicDOMEnvironment {
  constructor() {
    this.elements = new Map();
    this.setupInitialElements();
    this.layoutVersion = 1;
  }

  setupInitialElements() {
    // 初期レイアウトのモック要素を作成
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

  // レイアウト変更をシミュレート
  changeLayout(version) {
    this.layoutVersion = version;

    // 古いレイアウト要素を削除
    this.elements.clear();

    if (version === 1) {
      // 初期レイアウト
      this.setupInitialElements();
    } else if (version === 2) {
      // 新しいレイアウト（セレクターが変更されている）
      const newLayoutElements = {
        // 動画プレーヤーのセレクターが変更
        "[data-testid='video-player']": this.createMockElement(
          "div",
          "",
          "video-player"
        ),
        ".ytp-player-content": this.createMockElement(
          "div",
          "",
          "ytp-player-content"
        ),

        // サイドバーとコメントのセレクターが変更
        ".ytd-watch-next-secondary-results-renderer": this.createMockElement(
          "div",
          "",
          "ytd-watch-next-secondary-results-renderer"
        ),
        "ytd-comments": this.createMockElement("div", "", "ytd-comments"),

        // ヘッダーのセレクターが変更
        ".ytd-masthead": this.createMockElement("div", "", "ytd-masthead"),
      };

      this.elements = new Map(Object.entries(newLayoutElements));
    } else if (version === 3) {
      // さらに新しいレイアウト（一部要素が見つからない）
      const newerLayoutElements = {
        // 動画プレーヤーのみ存在
        "#player-container": this.createMockElement("div", "player-container"),

        // 他の要素は存在しない（検出に失敗するケース）
      };

      this.elements = new Map(Object.entries(newerLayoutElements));
    }
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
        if (selector.startsWith("#") && id) {
          return id === selector.substring(1);
        }
        if (selector.startsWith(".") && className) {
          return className.includes(selector.substring(1));
        }
        if (selector.includes("[data-testid=") && className) {
          const testId = selector.match(/\[data-testid=['"]([^'"]+)['"]\]/);
          return testId && className === testId[1];
        }
        return false;
      },
      closest: (selector) => {
        return this.matches(selector) ? this : null;
      },
      querySelector: (selector) => {
        // 子要素の検索をシミュレート
        if (
          selector === "video" &&
          (id === "movie_player" || className === "video-player")
        ) {
          return { readyState: 2 };
        }
        return null;
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
class LayoutAdaptationTests {
  constructor() {
    this.mockDOM = new MockDynamicDOMEnvironment();
    this.testResults = [];
    this.setupGlobalMocks();
  }

  setupGlobalMocks() {
    // グローバルなdocumentオブジェクトをモック
    global.document = {
      querySelector: (selector) => this.mockDOM.querySelector(selector),
      querySelectorAll: (selector) => this.mockDOM.querySelectorAll(selector),
      readyState: "complete",
    };

    // windowオブジェクトをモック
    global.window = {
      getComputedStyle: (element) =>
        element.style || {
          display: "block",
          visibility: "visible",
          opacity: "1",
        },
      innerHeight: 800,
      innerWidth: 1200,
      location: {
        href: "https://www.youtube.com/watch?v=test",
      },
    };

    // consoleをモック（テスト中のログを制御）
    const originalConsole = console;
    global.console = {
      log: (...args) => originalConsole.log(...args),
      warn: (...args) => originalConsole.warn(...args),
      error: (...args) => originalConsole.error(...args),
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

  // テスト1: 初期レイアウトでの要素検出
  testInitialLayoutDetection() {
    this.mockDOM.changeLayout(1);
    const player = ElementDetector.findVideoPlayer();
    if (!player) {
      throw new Error("Expected to find video player in initial layout");
    }
    if (player.id !== "movie_player") {
      throw new Error(`Expected id 'movie_player', got '${player.id}'`);
    }
    return "Successfully detected video player in initial layout";
  }

  // テスト2: レイアウト変更後の要素検出（フォールバック機能）
  testLayoutChangeDetection() {
    this.mockDOM.changeLayout(2);
    const player = ElementDetector.findVideoPlayer();
    if (!player) {
      throw new Error("Expected to find video player after layout change");
    }
    if (
      !player.className.includes("video-player") &&
      !player.className.includes("ytp-player-content")
    ) {
      throw new Error(
        `Expected to find player with new selectors, got '${player.className}'`
      );
    }
    return "Successfully detected video player after layout change using fallback selectors";
  }

  // テスト3: 要素検出失敗時のリトライ機能
  async testRetryElementDetection() {
    this.mockDOM.changeLayout(3); // 要素が見つからないレイアウト

    // 500ms後にレイアウトを変更して要素を追加
    setTimeout(() => {
      this.mockDOM.changeLayout(1);
    }, 500);

    const player = await ElementDetector.retryElementDetection(
      YouTubeSelectors.videoPlayer,
      { maxRetries: 3, retryInterval: 300, timeout: 2000 }
    );

    if (!player) {
      throw new Error("Expected to find video player after retry");
    }

    return "Successfully detected video player using retry mechanism";
  }

  // テスト4: 複数セレクターパターンによるフォールバック機能
  async testMultiPatternDetection() {
    this.mockDOM.changeLayout(2); // 新しいレイアウト

    const selectorGroups = {
      videoPlayer: YouTubeSelectors.videoPlayer,
      sidebar: ["#secondary", ".ytd-watch-next-secondary-results-renderer"],
      comments: ["#comments", "ytd-comments"],
    };

    const result = await ElementDetector.detectWithMultiplePatterns(
      selectorGroups
    );

    if (!result.success) {
      throw new Error("Expected multi-pattern detection to succeed");
    }

    if (!result.results.videoPlayer.found) {
      throw new Error(
        "Expected to find video player with multi-pattern detection"
      );
    }

    if (!result.results.comments.found) {
      throw new Error("Expected to find comments with multi-pattern detection");
    }

    return "Successfully detected elements using multi-pattern detection";
  }

  // テスト5: YouTube要素の堅牢な検出
  async testRobustElementDetection() {
    this.mockDOM.changeLayout(2); // 新しいレイアウト

    const player = await ElementDetector.detectYouTubeElementRobust(
      "videoPlayer",
      { timeout: 1000 }
    );

    if (!player) {
      throw new Error("Expected robust detection to find video player");
    }

    return "Successfully detected video player using robust detection";
  }

  // テスト6: 要素検出失敗時のエラーハンドリング
  async testDetectionErrorHandling() {
    this.mockDOM.changeLayout(3); // 要素が見つからないレイアウト

    const result = await ElementDetector.detectWithMultiplePatterns(
      {
        sidebar: ["#secondary", ".sidebar"],
        comments: ["#comments", ".comments"],
      },
      { timeout: 1000 }
    );

    if (result.success) {
      throw new Error("Expected detection to fail for missing elements");
    }

    if (result.summary.successCount !== 0) {
      throw new Error(
        `Expected 0 successful detections, got ${result.summary.successCount}`
      );
    }

    return "Correctly handles detection failures";
  }

  // テスト7: 要素の可視性検証
  async testElementVisibilityValidation() {
    this.mockDOM.changeLayout(1);
    const element = this.mockDOM.querySelector("#movie_player");
    element.style.display = "none"; // 要素を非表示に

    const player = await ElementDetector.retryElementDetection(
      "#movie_player",
      {
        validateElement: (el) => ElementDetector.isElementVisible(el),
        maxRetries: 2,
        timeout: 1000,
      }
    );

    if (player) {
      throw new Error("Expected not to find invisible element");
    }

    return "Correctly validates element visibility";
  }

  // 全テストを実行
  async runAllTests() {
    console.log("🧪 Starting Layout Adaptation Unit Tests...\n");

    this.runTest("Initial Layout Detection", () =>
      this.testInitialLayoutDetection()
    );

    this.runTest("Layout Change Detection", () =>
      this.testLayoutChangeDetection()
    );

    await this.runAsyncTest("Retry Element Detection", () =>
      this.testRetryElementDetection()
    );

    await this.runAsyncTest("Multi-Pattern Detection", () =>
      this.testMultiPatternDetection()
    );

    await this.runAsyncTest("Robust Element Detection", () =>
      this.testRobustElementDetection()
    );

    await this.runAsyncTest("Detection Error Handling", () =>
      this.testDetectionErrorHandling()
    );

    await this.runAsyncTest("Element Visibility Validation", () =>
      this.testElementVisibilityValidation()
    );

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

    console.log("\n🎉 Layout Adaptation Tests Complete!");
  }
}

// テストを実行する関数
async function runLayoutAdaptationTests() {
  // ElementDetectorクラスが利用可能かチェック
  if (typeof ElementDetector === "undefined") {
    console.error(
      "❌ ElementDetector class not found. Make sure content.js is loaded."
    );
    return;
  }

  const testSuite = new LayoutAdaptationTests();
  await testSuite.runAllTests();
}

// ブラウザ環境での実行
if (typeof window !== "undefined") {
  // ページが読み込まれたらテストを実行
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runLayoutAdaptationTests);
  } else {
    runLayoutAdaptationTests();
  }
}

// Node.js環境での実行（将来的な拡張用）
if (typeof module !== "undefined" && module.exports) {
  module.exports = { LayoutAdaptationTests, runLayoutAdaptationTests };
}
