/**
 * YouTubePageDetector 単体テスト
 * YouTubePageDetectorクラスの機能をテストする
 */

// テスト用のモッククラス
class MockLogger {
  constructor() {
    this.logs = [];
  }

  info(message, data) {
    this.logs.push({ level: "info", message, data });
  }

  debug(message, data) {
    this.logs.push({ level: "debug", message, data });
  }

  warn(message, data) {
    this.logs.push({ level: "warn", message, data });
  }

  error(message, data) {
    this.logs.push({ level: "error", message, data });
  }

  getLogs() {
    return this.logs;
  }

  clearLogs() {
    this.logs = [];
  }
}

class MockErrorHandler {
  constructor() {
    this.handledErrors = [];
  }

  handleError(error, options) {
    const appError = {
      message: error.message || error,
      type: options?.type || "UNKNOWN_ERROR",
      context: options?.context || {},
    };
    this.handledErrors.push(appError);
    return appError;
  }

  getHandledErrors() {
    return this.handledErrors;
  }

  clearErrors() {
    this.handledErrors = [];
  }
}

// DOM モック用のヘルパー
class DOMHelper {
  static createMockElement(id, className, attributes = {}) {
    const element = document.createElement("div");
    if (id) element.id = id;
    if (className) element.className = className;

    for (const [key, value] of Object.entries(attributes)) {
      element.setAttribute(key, value);
    }

    return element;
  }

  static setupVideoPage() {
    // 動画プレーヤーを作成
    const player = this.createMockElement("movie_player", "html5-video-player");
    document.body.appendChild(player);

    // URL を設定
    this.setURL("https://www.youtube.com/watch?v=test123");

    return player;
  }

  static setupShortsPage() {
    // Shorts プレーヤーを作成
    const shortsPlayer = this.createMockElement("shorts-player", "ytd-shorts");
    document.body.appendChild(shortsPlayer);

    // URL を設定
    this.setURL("https://www.youtube.com/shorts/test123");

    return shortsPlayer;
  }

  static setupChannelPage() {
    // チャンネルヘッダーを作成
    const channelHeader = this.createMockElement(
      "channel-header",
      "ytd-channel-header-renderer"
    );
    document.body.appendChild(channelHeader);

    // URL を設定
    this.setURL("https://www.youtube.com/channel/UC123456");

    return channelHeader;
  }

  static setupHomePage() {
    // ホームコンテンツを作成
    const homeContent = this.createMockElement(
      "contents",
      "ytd-rich-grid-renderer"
    );
    document.body.appendChild(homeContent);

    // URL を設定
    this.setURL("https://www.youtube.com/");

    return homeContent;
  }

  static setURL(url) {
    const urlObj = new URL(url);

    // location オブジェクトをモック
    Object.defineProperty(window, "location", {
      value: {
        href: url,
        pathname: urlObj.pathname,
        search: urlObj.search,
        origin: urlObj.origin,
      },
      writable: true,
    });
  }

  static clearDOM() {
    // body の子要素をすべて削除
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  }
}

// テスト実行関数
async function runYouTubePageDetectorTests() {
  console.log("=== YouTubePageDetector Tests ===");

  let testCount = 0;
  let passedTests = 0;

  // テストヘルパー関数
  function assert(condition, message) {
    testCount++;
    if (condition) {
      console.log(`✅ Test ${testCount}: ${message}`);
      passedTests++;
    } else {
      console.error(`❌ Test ${testCount}: ${message}`);
    }
  }

  function createMockDependencies() {
    return {
      logger: new MockLogger(),
      errorHandler: new MockErrorHandler(),
    };
  }

  // 元の location を保存
  const originalLocation = window.location;
  const originalHistory = window.history;

  try {
    // Test 1: YouTubePageDetector インスタンス作成
    const dependencies = createMockDependencies();
    const detector = new YouTubePageDetector(dependencies);

    assert(
      detector instanceof YouTubePageDetector,
      "YouTubePageDetector instance should be created successfully"
    );

    assert(
      detector.currentPageType === YouTubePageType.UNKNOWN,
      "Initial page type should be UNKNOWN"
    );

    // Test 2: 依存関係の検証
    try {
      new YouTubePageDetector({});
      assert(false, "Should throw error for missing dependencies");
    } catch (error) {
      assert(
        error.message.includes("Required dependency"),
        "Should throw error for missing dependencies"
      );
    }

    // Test 3: 動画ページの検出
    DOMHelper.setupVideoPage();

    const videoDetector = new YouTubePageDetector(createMockDependencies());
    await videoDetector.initialize();

    const videoResult = await videoDetector.detectPageType();
    assert(videoResult.isSuccess(), "Video page detection should succeed");

    assert(
      videoResult.data === YouTubePageType.VIDEO,
      "Should detect video page correctly"
    );

    assert(
      videoDetector.detectionConfidence >= DetectionConfidence.MEDIUM,
      "Video page detection should have medium or high confidence"
    );

    await videoDetector.destroy();
    DOMHelper.clearDOM();

    // Test 4: Shorts ページの検出
    DOMHelper.setupShortsPage();

    const shortsDetector = new YouTubePageDetector(createMockDependencies());
    await shortsDetector.initialize();

    const shortsResult = await shortsDetector.detectPageType();
    assert(shortsResult.isSuccess(), "Shorts page detection should succeed");

    assert(
      shortsResult.data === YouTubePageType.SHORTS,
      "Should detect Shorts page correctly"
    );

    await shortsDetector.destroy();
    DOMHelper.clearDOM();

    // Test 5: チャンネルページの検出
    DOMHelper.setupChannelPage();

    const channelDetector = new YouTubePageDetector(createMockDependencies());
    await channelDetector.initialize();

    const channelResult = await channelDetector.detectPageType();
    assert(channelResult.isSuccess(), "Channel page detection should succeed");

    assert(
      channelResult.data === YouTubePageType.CHANNEL,
      "Should detect channel page correctly"
    );

    await channelDetector.destroy();
    DOMHelper.clearDOM();

    // Test 6: ホームページの検出
    DOMHelper.setupHomePage();

    const homeDetector = new YouTubePageDetector(createMockDependencies());
    await homeDetector.initialize();

    const homeResult = await homeDetector.detectPageType();
    assert(homeResult.isSuccess(), "Home page detection should succeed");

    assert(
      homeResult.data === YouTubePageType.HOME,
      "Should detect home page correctly"
    );

    await homeDetector.destroy();
    DOMHelper.clearDOM();

    // Test 7: URL ベースの検出
    DOMHelper.setURL("https://www.youtube.com/playlist?list=PLtest");

    const playlistDetector = new YouTubePageDetector(createMockDependencies());
    const playlistResult = await playlistDetector.detectPageType();

    assert(
      playlistResult.data === YouTubePageType.PLAYLIST,
      "Should detect playlist from URL"
    );

    await playlistDetector.destroy();

    // Test 8: 検索ページの検出
    DOMHelper.setURL("https://www.youtube.com/results?search_query=test");

    const searchDetector = new YouTubePageDetector(createMockDependencies());
    const searchResult = await searchDetector.detectPageType();

    assert(
      searchResult.data === YouTubePageType.SEARCH,
      "Should detect search page from URL"
    );

    await searchDetector.destroy();

    // Test 9: 初期化プロセス
    DOMHelper.setupVideoPage();

    const initDetector = new YouTubePageDetector(createMockDependencies());
    const initResult = await initDetector.initialize();

    assert(initResult.isSuccess(), "Initialization should succeed");

    assert(
      initDetector.initialized === true,
      "initialized flag should be true"
    );

    assert(
      initDetector.currentPageType === YouTubePageType.VIDEO,
      "Should detect initial page type during initialization"
    );

    await initDetector.destroy();
    DOMHelper.clearDOM();

    // Test 10: ページ変更リスナー
    DOMHelper.setupVideoPage();

    const listenerDetector = new YouTubePageDetector(createMockDependencies());
    await listenerDetector.initialize();

    let changeEventReceived = false;
    let changeEventData = null;

    const removeListener = listenerDetector.addChangeListener((event) => {
      changeEventReceived = true;
      changeEventData = event;
    });

    // ページタイプを変更
    DOMHelper.clearDOM();
    DOMHelper.setupShortsPage();

    // 検出を実行
    await listenerDetector.detectPageType();

    // 少し待ってからチェック
    await new Promise((resolve) => setTimeout(resolve, 100));

    assert(
      changeEventReceived === true,
      "Page change listener should be called"
    );

    assert(
      changeEventData?.from === YouTubePageType.VIDEO,
      "Change event should include previous page type"
    );

    assert(
      changeEventData?.to === YouTubePageType.SHORTS,
      "Change event should include new page type"
    );

    // リスナー削除のテスト
    removeListener();
    changeEventReceived = false;

    DOMHelper.clearDOM();
    DOMHelper.setupChannelPage();
    await listenerDetector.detectPageType();

    await new Promise((resolve) => setTimeout(resolve, 100));

    assert(
      changeEventReceived === false,
      "Removed listener should not be called"
    );

    await listenerDetector.destroy();
    DOMHelper.clearDOM();

    // Test 11: 状態取得
    DOMHelper.setupVideoPage();

    const stateDetector = new YouTubePageDetector(createMockDependencies());
    await stateDetector.initialize();

    const state = stateDetector.getState();
    assert(
      state.initialized === true,
      "getState should return correct initialization status"
    );

    assert(
      state.currentPageType === YouTubePageType.VIDEO,
      "getState should return correct page type"
    );

    assert(
      typeof state.detectionStats === "object",
      "getState should include detection stats"
    );

    await stateDetector.destroy();
    DOMHelper.clearDOM();

    // Test 12: 統計情報取得
    DOMHelper.setupVideoPage();

    const statsDetector = new YouTubePageDetector(createMockDependencies());
    await statsDetector.initialize();

    // 複数回検出を実行
    await statsDetector.detectPageType();
    await statsDetector.detectPageType();

    const stats = statsDetector.getStats();
    assert(stats.totalDetections >= 2, "Stats should track total detections");

    assert(
      stats.successfulDetections >= 2,
      "Stats should track successful detections"
    );

    assert(
      typeof stats.averageDetectionTime === "number",
      "Stats should include average detection time"
    );

    await statsDetector.destroy();
    DOMHelper.clearDOM();

    // Test 13: エラーハンドリング
    const errorDependencies = createMockDependencies();
    const errorDetector = new YouTubePageDetector(errorDependencies);

    // DOM を空にしてエラーを発生させる
    DOMHelper.clearDOM();
    DOMHelper.setURL("https://www.youtube.com/unknown");

    const errorResult = await errorDetector.detectPageType();
    assert(
      errorResult.isSuccess(), // 検出は成功するが、UNKNOWN を返す
      "Detection should handle errors gracefully"
    );

    assert(
      errorResult.data === YouTubePageType.UNKNOWN,
      "Should return UNKNOWN for undetectable pages"
    );

    await errorDetector.destroy();

    // Test 14: キャッシュ機能
    DOMHelper.setupVideoPage();

    const cacheDetector = new YouTubePageDetector(createMockDependencies());
    await cacheDetector.initialize();

    // 最初の検出
    const firstDetection = await cacheDetector.detectPageType();
    const firstState = cacheDetector.getState();

    // 2回目の検出（キャッシュが使用されるはず）
    const secondDetection = await cacheDetector.detectPageType();
    const secondState = cacheDetector.getState();

    assert(
      firstDetection.data === secondDetection.data,
      "Cached detection should return same result"
    );

    assert(
      secondState.cacheSize > 0,
      "Cache should contain elements after detection"
    );

    await cacheDetector.destroy();
    DOMHelper.clearDOM();

    // Test 15: 設定変更の処理
    const settingsDetector = new YouTubePageDetector(createMockDependencies(), {
      detectionInterval: 1000,
      enableMutationObserver: true,
    });

    await settingsDetector.initialize();

    // 設定を変更
    await settingsDetector.onSettingsChanged({
      detectionInterval: 2000,
      enableMutationObserver: false,
    });

    assert(
      settingsDetector.options.detectionInterval === 2000,
      "Settings should be updated correctly"
    );

    assert(
      settingsDetector.options.enableMutationObserver === false,
      "MutationObserver setting should be updated"
    );

    await settingsDetector.destroy();

    // Test 16: 破棄処理
    DOMHelper.setupVideoPage();

    const destroyDetector = new YouTubePageDetector(createMockDependencies());
    await destroyDetector.initialize();

    assert(
      destroyDetector.initialized === true,
      "Detector should be initialized before destroy"
    );

    await destroyDetector.destroy();

    assert(
      destroyDetector.initialized === false,
      "Detector should not be initialized after destroy"
    );

    // 重複破棄のテスト
    try {
      await destroyDetector.destroy();
      assert(true, "Multiple destroy calls should be safe");
    } catch (error) {
      assert(false, "Multiple destroy calls should not throw error");
    }

    DOMHelper.clearDOM();

    // Test 17: MutationObserver の無効化
    const noObserverDetector = new YouTubePageDetector(
      createMockDependencies(),
      {
        enableMutationObserver: false,
      }
    );

    await noObserverDetector.initialize();

    assert(
      noObserverDetector.mutationObserver === null,
      "MutationObserver should not be created when disabled"
    );

    await noObserverDetector.destroy();
  } catch (error) {
    console.error("Test execution error:", error);
    assert(false, `Test execution failed: ${error.message}`);
  } finally {
    // DOM をクリーンアップ
    DOMHelper.clearDOM();

    // 元の location と history を復元
    Object.defineProperty(window, "location", {
      value: originalLocation,
      writable: true,
    });

    Object.defineProperty(window, "history", {
      value: originalHistory,
      writable: true,
    });
  }

  // テスト結果の表示
  console.log(`\n=== Test Results ===`);
  console.log(`Total tests: ${testCount}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${testCount - passedTests}`);
  console.log(`Success rate: ${((passedTests / testCount) * 100).toFixed(1)}%`);

  return {
    total: testCount,
    passed: passedTests,
    failed: testCount - passedTests,
    successRate: (passedTests / testCount) * 100,
  };
}

// テスト実行
if (typeof window !== "undefined") {
  // ブラウザ環境での実行
  window.runYouTubePageDetectorTests = runYouTubePageDetectorTests;

  // DOMが読み込まれた後にテストを実行
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runYouTubePageDetectorTests);
  } else {
    runYouTubePageDetectorTests();
  }
} else if (typeof module !== "undefined" && module.exports) {
  // Node.js環境での実行
  module.exports = { runYouTubePageDetectorTests };
}
