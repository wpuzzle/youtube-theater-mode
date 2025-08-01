/**
 * TestFramework の動作確認テスト
 */

/**
 * TestFramework の基本機能をテスト
 */
async function testTestFrameworkBasics() {
  console.log("Testing TestFramework basics...");

  const framework = new TestFramework();
  let testExecuted = false;
  let hookExecuted = false;

  // 基本的なテストスイートを作成
  framework.describe("Basic Test Suite", function (suite) {
    suite.beforeEach(() => {
      hookExecuted = true;
    });

    suite.test("should execute test", () => {
      testExecuted = true;
      TestFramework.assert.isTrue(true, "This should pass");
    });

    suite.test("should handle assertions", () => {
      TestFramework.assert.equal(1, 1, "Numbers should be equal");
      TestFramework.assert.includes([1, 2, 3], 2, "Array should include item");
    });
  });

  const results = await framework.run();

  // 結果を検証
  if (!testExecuted) {
    throw new Error("Test was not executed");
  }
  if (!hookExecuted) {
    throw new Error("Hook was not executed");
  }
  if (results.totalPassed !== 2) {
    throw new Error(`Expected 2 passed tests, got ${results.totalPassed}`);
  }
  if (results.totalFailed !== 0) {
    throw new Error(`Expected 0 failed tests, got ${results.totalFailed}`);
  }

  console.log("✓ TestFramework basics test passed");
}

/**
 * Chrome API モック機能をテスト
 */
async function testChromeApiMock() {
  console.log("Testing Chrome API mock...");

  const framework = new TestFramework();
  let chromeApiTested = false;

  framework.describe("Chrome API Mock Test", function (suite) {
    suite.test("should mock chrome.storage.sync", async () => {
      // ストレージにデータを保存
      await chrome.storage.sync.set({ testKey: "testValue" });

      // データを取得
      const result = await chrome.storage.sync.get("testKey");
      TestFramework.assert.equal(
        result.testKey,
        "testValue",
        "Storage should return saved value"
      );

      chromeApiTested = true;
    });

    suite.test("should mock chrome.tabs.query", async () => {
      // モックタブを追加
      framework.chromeApiMock.addMockTab({
        id: 1,
        url: "https://www.youtube.com/watch?v=test",
        active: true,
      });

      // タブをクエリ
      const tabs = await chrome.tabs.query({ active: true });
      TestFramework.assert.equal(tabs.length, 1, "Should find one active tab");
      TestFramework.assert.equal(tabs[0].id, 1, "Tab ID should match");
    });
  });

  const results = await framework.run();

  if (!chromeApiTested) {
    throw new Error("Chrome API was not tested");
  }
  if (results.totalFailed > 0) {
    throw new Error(
      `Chrome API mock tests failed: ${results.totalFailed} failures`
    );
  }

  console.log("✓ Chrome API mock test passed");
}

/**
 * DOM テスト環境をテスト
 */
async function testDOMEnvironment() {
  console.log("Testing DOM environment...");

  const framework = new TestFramework();
  let domTested = false;

  framework.describe("DOM Environment Test", function (suite) {
    suite.test("should provide YouTube elements", () => {
      const player = framework.domMock.getElement("movie_player");
      TestFramework.assert.isTrue(
        player !== null,
        "Video player element should exist"
      );

      const secondary = framework.domMock.getElement("secondary");
      TestFramework.assert.isTrue(
        secondary !== null,
        "Secondary element should exist"
      );

      domTested = true;
    });

    suite.test("should simulate video player", () => {
      framework.domMock.simulateVideoPlayer({
        videoId: "test123",
        isPlaying: "true",
      });

      const player = framework.domMock.getElement("movie_player");
      if (player && player.dataset) {
        TestFramework.assert.equal(
          player.dataset.videoId,
          "test123",
          "Video ID should be set"
        );
      }
    });
  });

  const results = await framework.run();

  if (!domTested) {
    throw new Error("DOM was not tested");
  }
  if (results.totalFailed > 0) {
    throw new Error(
      `DOM environment tests failed: ${results.totalFailed} failures`
    );
  }

  console.log("✓ DOM environment test passed");
}

/**
 * アサーション機能をテスト
 */
async function testAssertions() {
  console.log("Testing assertion functions...");

  const framework = new TestFramework();
  let assertionsTested = false;

  framework.describe("Assertions Test", function (suite) {
    suite.test("should handle basic assertions", () => {
      TestFramework.assert.isTrue(true);
      TestFramework.assert.equal(5, 5);
      TestFramework.assert.includes(["a", "b", "c"], "b");
      assertionsTested = true;
    });

    suite.test("should handle deep equality", () => {
      const obj1 = { a: 1, b: { c: 2 } };
      const obj2 = { a: 1, b: { c: 2 } };
      TestFramework.assert.deepEqual(obj1, obj2);
    });

    suite.test("should handle exception assertions", () => {
      TestFramework.assert.throws(() => {
        throw new Error("Test error");
      }, "Test error");
    });

    suite.test("should handle async rejections", async () => {
      await TestFramework.assert.rejects(async () => {
        throw new Error("Async error");
      }, "Async error");
    });
  });

  const results = await framework.run();

  if (!assertionsTested) {
    throw new Error("Assertions were not tested");
  }
  if (results.totalFailed > 0) {
    throw new Error(`Assertion tests failed: ${results.totalFailed} failures`);
  }

  console.log("✓ Assertions test passed");
}

/**
 * エラーハンドリングをテスト
 */
async function testErrorHandling() {
  console.log("Testing error handling...");

  const framework = new TestFramework();

  framework.describe("Error Handling Test", function (suite) {
    suite.test("should handle test failures", () => {
      TestFramework.assert.isTrue(false, "This should fail");
    });

    suite.test("should handle exceptions", () => {
      throw new Error("Test exception");
    });

    suite.test("should pass after failures", () => {
      TestFramework.assert.isTrue(true, "This should pass");
    });
  });

  const results = await framework.run();

  // 2つのテストが失敗し、1つが成功することを確認
  if (results.totalFailed !== 2) {
    throw new Error(`Expected 2 failed tests, got ${results.totalFailed}`);
  }
  if (results.totalPassed !== 1) {
    throw new Error(`Expected 1 passed test, got ${results.totalPassed}`);
  }

  console.log("✓ Error handling test passed");
}

/**
 * タイムアウト機能をテスト
 */
async function testTimeout() {
  console.log("Testing timeout functionality...");

  const framework = new TestFramework();

  framework.describe("Timeout Test", function (suite) {
    suite.test(
      "should timeout long running test",
      async () => {
        // 100ms でタイムアウトするテスト
        await new Promise((resolve) => setTimeout(resolve, 200));
      },
      { timeout: 100 }
    );

    suite.test(
      "should complete within timeout",
      async () => {
        // 50ms で完了するテスト
        await new Promise((resolve) => setTimeout(resolve, 50));
      },
      { timeout: 100 }
    );
  });

  const results = await framework.run();

  // 1つのテストがタイムアウトで失敗し、1つが成功することを確認
  if (results.totalFailed !== 1) {
    throw new Error(
      `Expected 1 failed test (timeout), got ${results.totalFailed}`
    );
  }
  if (results.totalPassed !== 1) {
    throw new Error(`Expected 1 passed test, got ${results.totalPassed}`);
  }

  console.log("✓ Timeout test passed");
}

/**
 * 全テストを実行
 */
async function runAllTestFrameworkTests() {
  console.log("=".repeat(60));
  console.log("YouTube Theater Mode - TestFramework Verification Tests");
  console.log("=".repeat(60));

  const tests = [
    testTestFrameworkBasics,
    testChromeApiMock,
    testDOMEnvironment,
    testAssertions,
    testErrorHandling,
    testTimeout,
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      await test();
      passed++;
    } catch (error) {
      console.error(`✗ ${test.name} failed:`, error.message);
      failed++;
    }
  }

  console.log("=".repeat(60));
  console.log(
    `TestFramework Verification Results: ${passed} passed, ${failed} failed`
  );
  console.log("=".repeat(60));

  return failed === 0;
}

// エクスポート
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    runAllTestFrameworkTests,
    testTestFrameworkBasics,
    testChromeApiMock,
    testDOMEnvironment,
    testAssertions,
    testErrorHandling,
    testTimeout,
  };
}

if (typeof window !== "undefined") {
  window.runAllTestFrameworkTests = runAllTestFrameworkTests;
}
