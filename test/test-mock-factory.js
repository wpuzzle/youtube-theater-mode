/**
 * MockFactory の動作確認テスト
 */

/**
 * TestDataGenerator の機能をテスト
 */
async function testTestDataGenerator() {
  console.log("Testing TestDataGenerator...");

  const framework = new TestFramework();

  framework.describe("TestDataGenerator Tests", function (suite) {
    suite.test("should generate random strings", () => {
      const str1 = TestDataGenerator.randomString(10);
      const str2 = TestDataGenerator.randomString(10);

      TestFramework.assert.equal(
        str1.length,
        10,
        "String should have correct length"
      );
      TestFramework.assert.equal(
        str2.length,
        10,
        "String should have correct length"
      );
      TestFramework.assert.isTrue(str1 !== str2, "Strings should be different");
    });

    suite.test("should generate random numbers", () => {
      const num1 = TestDataGenerator.randomNumber(1, 10);
      const num2 = TestDataGenerator.randomNumber(1, 10);

      TestFramework.assert.isTrue(
        num1 >= 1 && num1 <= 10,
        "Number should be in range"
      );
      TestFramework.assert.isTrue(
        num2 >= 1 && num2 <= 10,
        "Number should be in range"
      );
    });

    suite.test("should generate YouTube video IDs", () => {
      const videoId = TestDataGenerator.youtubeVideoId();
      TestFramework.assert.equal(
        videoId.length,
        11,
        "Video ID should be 11 characters"
      );
    });

    suite.test("should generate YouTube URLs", () => {
      const url = TestDataGenerator.youtubeUrl();
      TestFramework.assert.isTrue(
        url.startsWith("https://www.youtube.com/watch?v="),
        "URL should be valid YouTube URL"
      );
    });

    suite.test("should create tab objects", () => {
      const tab = TestDataGenerator.createTab({ active: true });
      TestFramework.assert.isTrue(
        typeof tab.id === "number",
        "Tab should have numeric ID"
      );
      TestFramework.assert.equal(
        tab.active,
        true,
        "Tab should have correct active state"
      );
      TestFramework.assert.isTrue(
        tab.url.includes("youtube.com"),
        "Tab should have YouTube URL"
      );
    });

    suite.test("should create settings objects", () => {
      const settings = TestDataGenerator.createSettings({ opacity: 0.5 });
      TestFramework.assert.equal(
        settings.opacity,
        0.5,
        "Settings should have correct opacity"
      );
      TestFramework.assert.isTrue(
        typeof settings.theaterModeEnabled === "boolean",
        "Settings should have boolean theater mode"
      );
    });

    suite.test("should create message objects", () => {
      const message = TestDataGenerator.createMessage("TEST_TYPE", {
        test: true,
      });
      TestFramework.assert.equal(
        message.type,
        "TEST_TYPE",
        "Message should have correct type"
      );
      TestFramework.assert.equal(
        message.data.test,
        true,
        "Message should have correct data"
      );
      TestFramework.assert.isTrue(
        typeof message.timestamp === "number",
        "Message should have timestamp"
      );
    });
  });

  const results = await framework.run();

  if (results.totalFailed > 0) {
    throw new Error(
      `TestDataGenerator tests failed: ${results.totalFailed} failures`
    );
  }

  console.log("✓ TestDataGenerator test passed");
}

/**
 * ScenarioManager の機能をテスト
 */
async function testScenarioManager() {
  console.log("Testing ScenarioManager...");

  const framework = new TestFramework();

  framework.describe("ScenarioManager Tests", function (suite) {
    let scenarioManager;

    suite.beforeEach(() => {
      scenarioManager = new ScenarioManager();
    });

    suite.test("should define and start scenarios", async () => {
      let setupCalled = false;

      scenarioManager.defineScenario("test", {
        setup: () => {
          setupCalled = true;
        },
        data: { testValue: 123 },
      });

      await scenarioManager.startScenario("test");

      TestFramework.assert.isTrue(setupCalled, "Setup should be called");
      TestFramework.assert.equal(
        scenarioManager.getScenarioData("testValue"),
        123,
        "Scenario data should be accessible"
      );
    });

    suite.test("should handle scenario behaviors", async () => {
      scenarioManager.defineScenario("behavior-test", {
        behaviors: {
          testBehavior: () => "behavior-result",
        },
      });

      await scenarioManager.startScenario("behavior-test");

      const behavior = scenarioManager.getScenarioBehavior("testBehavior");
      TestFramework.assert.isTrue(
        typeof behavior === "function",
        "Behavior should be a function"
      );
      TestFramework.assert.equal(
        behavior(),
        "behavior-result",
        "Behavior should return correct result"
      );
    });

    suite.test("should end scenarios properly", async () => {
      let teardownCalled = false;

      scenarioManager.defineScenario("teardown-test", {
        teardown: () => {
          teardownCalled = true;
        },
      });

      await scenarioManager.startScenario("teardown-test");
      await scenarioManager.endScenario();

      TestFramework.assert.isTrue(teardownCalled, "Teardown should be called");
      TestFramework.assert.equal(
        scenarioManager.getCurrentScenario(),
        null,
        "Current scenario should be null"
      );
    });
  });

  const results = await framework.run();

  if (results.totalFailed > 0) {
    throw new Error(
      `ScenarioManager tests failed: ${results.totalFailed} failures`
    );
  }

  console.log("✓ ScenarioManager test passed");
}

/**
 * MockFactory のコンポーネントモック機能をテスト
 */
async function testComponentMocks() {
  console.log("Testing component mocks...");

  const framework = new TestFramework();
  const mockFactory = new MockFactory();

  framework.describe("Component Mocks Tests", function (suite) {
    suite.test("should create Logger mock", () => {
      const loggerMock = mockFactory.createLoggerMock();

      TestFramework.assert.isTrue(
        typeof loggerMock.info === "function",
        "Logger should have info method"
      );
      TestFramework.assert.isTrue(
        typeof loggerMock.error === "function",
        "Logger should have error method"
      );
      TestFramework.assert.isTrue(
        typeof loggerMock.startPerformance === "function",
        "Logger should have performance methods"
      );

      // メソッドを呼び出してテスト
      loggerMock.info("test message");
      const logs = loggerMock._getLogs();
      TestFramework.assert.equal(logs.length, 1, "Log should be recorded");
      TestFramework.assert.equal(
        logs[0].message,
        "test message",
        "Log message should match"
      );
    });

    suite.test("should create ErrorHandler mock", () => {
      const errorHandlerMock = mockFactory.createErrorHandlerMock();

      TestFramework.assert.isTrue(
        typeof errorHandlerMock.wrapAsync === "function",
        "ErrorHandler should have wrapAsync method"
      );
      TestFramework.assert.isTrue(
        typeof errorHandlerMock.categorizeError === "function",
        "ErrorHandler should have categorizeError method"
      );
      TestFramework.assert.isTrue(
        typeof errorHandlerMock.AppError === "function",
        "ErrorHandler should have AppError class"
      );
    });

    suite.test("should create StorageAdapter mock", async () => {
      const storageAdapterMock = mockFactory.createStorageAdapterMock();

      TestFramework.assert.isTrue(
        typeof storageAdapterMock.get === "function",
        "StorageAdapter should have get method"
      );
      TestFramework.assert.isTrue(
        typeof storageAdapterMock.set === "function",
        "StorageAdapter should have set method"
      );

      // ストレージ操作をテスト
      await storageAdapterMock.set({ testKey: "testValue" });
      const result = await storageAdapterMock.get(["testKey"]);

      TestFramework.assert.equal(
        result.success,
        true,
        "Storage operation should succeed"
      );
      TestFramework.assert.equal(
        result.data.testKey,
        "testValue",
        "Storage should return correct value"
      );
    });

    suite.test("should create MessageBus mock", async () => {
      const messageBusMock = mockFactory.createMessageBusMock();

      TestFramework.assert.isTrue(
        typeof messageBusMock.registerHandler === "function",
        "MessageBus should have registerHandler method"
      );
      TestFramework.assert.isTrue(
        typeof messageBusMock.sendMessage === "function",
        "MessageBus should have sendMessage method"
      );

      // メッセージ送信をテスト
      const result = await messageBusMock.sendMessage({
        type: "TEST",
        data: {},
      });
      TestFramework.assert.equal(
        result.success,
        true,
        "Message sending should succeed"
      );
    });

    suite.test("should create SettingsManager mock", async () => {
      const settingsManagerMock = mockFactory.createSettingsManagerMock();

      TestFramework.assert.isTrue(
        typeof settingsManagerMock.loadSettings === "function",
        "SettingsManager should have loadSettings method"
      );
      TestFramework.assert.isTrue(
        typeof settingsManagerMock.saveSettings === "function",
        "SettingsManager should have saveSettings method"
      );

      // 設定操作をテスト
      const settings = await settingsManagerMock.loadSettings();
      TestFramework.assert.equal(
        settings.success,
        true,
        "Settings loading should succeed"
      );
      TestFramework.assert.isTrue(
        typeof settings.data.opacity === "number",
        "Settings should have opacity"
      );
    });

    suite.test("should create StateStore mock", async () => {
      const stateStoreMock = mockFactory.createStateStoreMock();

      TestFramework.assert.isTrue(
        typeof stateStoreMock.dispatch === "function",
        "StateStore should have dispatch method"
      );
      TestFramework.assert.isTrue(
        typeof stateStoreMock.getState === "function",
        "StateStore should have getState method"
      );
      TestFramework.assert.isTrue(
        typeof stateStoreMock.subscribe === "function",
        "StateStore should have subscribe method"
      );

      // 状態操作をテスト
      const initialState = stateStoreMock.getState();
      TestFramework.assert.isTrue(
        typeof initialState.theaterMode === "object",
        "State should have theaterMode"
      );

      await stateStoreMock.dispatch({ type: "TOGGLE_THEATER_MODE" });
      const newState = stateStoreMock.getState();
      TestFramework.assert.equal(
        newState.theaterMode.isEnabled,
        true,
        "Theater mode should be toggled"
      );
    });

    suite.test("should create ElementManager mock", async () => {
      const elementManagerMock = mockFactory.createElementManagerMock();

      TestFramework.assert.isTrue(
        typeof elementManagerMock.detectVideoPlayer === "function",
        "ElementManager should have detectVideoPlayer method"
      );
      TestFramework.assert.isTrue(
        typeof elementManagerMock.detectOverlayTargets === "function",
        "ElementManager should have detectOverlayTargets method"
      );

      // 要素検出をテスト
      const playerResult = await elementManagerMock.detectVideoPlayer();
      TestFramework.assert.equal(
        playerResult.success,
        true,
        "Video player detection should succeed"
      );
      TestFramework.assert.equal(
        playerResult.data.id,
        "movie_player",
        "Should return correct player element"
      );
    });
  });

  const results = await framework.run();

  if (results.totalFailed > 0) {
    throw new Error(
      `Component mocks tests failed: ${results.totalFailed} failures`
    );
  }

  console.log("✓ Component mocks test passed");
}

/**
 * Chrome API モック機能をテスト
 */
async function testChromeApiMock() {
  console.log("Testing Chrome API mock...");

  const framework = new TestFramework();
  const mockFactory = new MockFactory();

  framework.describe("Chrome API Mock Tests", function (suite) {
    let chromeApiMock;

    suite.beforeEach(() => {
      chromeApiMock = mockFactory.createChromeApiMock();
    });

    suite.test("should mock chrome.storage.sync operations", async () => {
      // データを保存
      await chromeApiMock.storage.sync.set({ testKey: "testValue" });

      // データを取得
      const result = await chromeApiMock.storage.sync.get("testKey");
      TestFramework.assert.equal(
        result.testKey,
        "testValue",
        "Storage should return saved value"
      );

      // データを削除
      await chromeApiMock.storage.sync.remove("testKey");
      const emptyResult = await chromeApiMock.storage.sync.get("testKey");
      TestFramework.assert.equal(
        Object.keys(emptyResult).length,
        0,
        "Storage should be empty after removal"
      );
    });

    suite.test("should mock chrome.tabs operations", async () => {
      // タブを追加
      const tab = chromeApiMock._addTab({
        url: "https://www.youtube.com/watch?v=test",
        active: true,
      });

      // タブをクエリ
      const activeTabs = await chromeApiMock.tabs.query({ active: true });
      TestFramework.assert.equal(
        activeTabs.length,
        1,
        "Should find one active tab"
      );
      TestFramework.assert.equal(
        activeTabs[0].id,
        tab.id,
        "Tab ID should match"
      );

      // 特定のタブを取得
      const specificTab = await chromeApiMock.tabs.get(tab.id);
      TestFramework.assert.equal(
        specificTab.id,
        tab.id,
        "Should return correct tab"
      );
    });

    suite.test("should mock chrome.runtime operations", async () => {
      // メッセージを送信
      const result = await chromeApiMock.runtime.sendMessage({ type: "TEST" });
      TestFramework.assert.equal(
        result.success,
        true,
        "Message sending should succeed"
      );

      // マニフェストを取得
      const manifest = chromeApiMock.runtime.getManifest();
      TestFramework.assert.isTrue(
        typeof manifest.version === "string",
        "Manifest should have version"
      );
    });

    suite.test("should handle storage change listeners", async () => {
      let changesCalled = false;
      let changesData = null;

      // リスナーを追加
      chromeApiMock.storage.sync.onChanged.addListener((changes, areaName) => {
        changesCalled = true;
        changesData = changes;
      });

      // データを変更
      await chromeApiMock.storage.sync.set({ testKey: "newValue" });

      // 少し待ってからチェック
      await new Promise((resolve) => setTimeout(resolve, 10));

      TestFramework.assert.isTrue(
        changesCalled,
        "Change listener should be called"
      );
      TestFramework.assert.isTrue(
        changesData.testKey !== undefined,
        "Changes should include testKey"
      );
    });
  });

  const results = await framework.run();

  if (results.totalFailed > 0) {
    throw new Error(
      `Chrome API mock tests failed: ${results.totalFailed} failures`
    );
  }

  console.log("✓ Chrome API mock test passed");
}

/**
 * シナリオベーステスト機能をテスト
 */
async function testScenarioBasedTesting() {
  console.log("Testing scenario-based testing...");

  const framework = new TestFramework();
  const mockFactory = new MockFactory();

  framework.describe("Scenario-Based Testing", function (suite) {
    suite.test("should use normal scenario", async () => {
      await mockFactory.getScenarioManager().startScenario("normal");

      const storageAdapterMock = mockFactory.createStorageAdapterMock();
      const result = await storageAdapterMock.get(["testKey"]);

      TestFramework.assert.equal(
        result.success,
        true,
        "Normal scenario should succeed"
      );

      await mockFactory.getScenarioManager().endScenario();
    });

    suite.test("should use error scenario", async () => {
      await mockFactory.getScenarioManager().startScenario("error");

      const storageAdapterMock = mockFactory.createStorageAdapterMock();

      try {
        await storageAdapterMock.get(["testKey"]);
        TestFramework.assert.isTrue(false, "Error scenario should throw");
      } catch (error) {
        TestFramework.assert.isTrue(
          error.message.includes("failed"),
          "Should throw storage error"
        );
      }

      await mockFactory.getScenarioManager().endScenario();
    });

    suite.test("should use performance scenario", async () => {
      await mockFactory.getScenarioManager().startScenario("performance");

      const storageAdapterMock = mockFactory.createStorageAdapterMock();
      const startTime = Date.now();

      await storageAdapterMock.get(["testKey"]);

      const duration = Date.now() - startTime;
      TestFramework.assert.isTrue(
        duration >= 500,
        "Performance scenario should add delay"
      );

      await mockFactory.getScenarioManager().endScenario();
    });
  });

  const results = await framework.run();

  if (results.totalFailed > 0) {
    throw new Error(
      `Scenario-based testing tests failed: ${results.totalFailed} failures`
    );
  }

  console.log("✓ Scenario-based testing test passed");
}

/**
 * 全MockFactoryテストを実行
 */
async function runAllMockFactoryTests() {
  console.log("=".repeat(60));
  console.log("YouTube Theater Mode - MockFactory Verification Tests");
  console.log("=".repeat(60));

  const tests = [
    testTestDataGenerator,
    testScenarioManager,
    testComponentMocks,
    testChromeApiMock,
    testScenarioBasedTesting,
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
    `MockFactory Verification Results: ${passed} passed, ${failed} failed`
  );
  console.log("=".repeat(60));

  return failed === 0;
}

// エクスポート
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    runAllMockFactoryTests,
    testTestDataGenerator,
    testScenarioManager,
    testComponentMocks,
    testChromeApiMock,
    testScenarioBasedTesting,
  };
}

if (typeof window !== "undefined") {
  window.runAllMockFactoryTests = runAllMockFactoryTests;
}
