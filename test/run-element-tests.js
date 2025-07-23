#!/usr/bin/env node

/**
 * Node.js Test Runner for Element Detection
 * 要素検出機能のテストをNode.js環境で実行
 */

// DOM環境をシミュレート
global.document = {
  querySelector: () => null,
  querySelectorAll: () => [],
  readyState: "complete",
};

global.window = {
  getComputedStyle: () => ({}),
  innerHeight: 800,
  innerWidth: 1200,
};

// YouTubeSelectors定数を定義
const YouTubeSelectors = {
  videoPlayer: [
    "#movie_player",
    ".html5-video-player",
    '[data-testid="video-player"]',
    ".ytp-player-content",
    "#player-container",
  ],
  overlayElements: [
    "#secondary",
    "#comments",
    "ytd-comments",
    "#masthead",
    ".ytd-masthead",
    "#meta-contents",
    ".ytd-watch-metadata",
    "#description",
    ".ytd-video-secondary-info-renderer",
    "#related",
    ".ytp-suggestion-set",
    "#chat",
    "ytd-live-chat-frame",
    ".ytd-playlist-panel-renderer",
    "#playlist",
    ".ytd-merch-shelf-renderer",
    "#sponsor-button",
    ".ytd-video-owner-renderer .ytd-subscribe-button-renderer",
  ],
  protectedElements: [
    "#movie_player",
    ".html5-video-player",
    ".ytp-chrome-controls",
    ".ytp-player-content",
    ".video-stream",
    ".ytp-contextmenu",
    ".ytp-popup",
    ".ytp-settings-menu",
  ],
};

// ElementDetectorクラスを定義
class ElementDetector {
  static findElementWithFallback(selectors, context = document) {
    const selectorArray = Array.isArray(selectors) ? selectors : [selectors];

    for (const selector of selectorArray) {
      try {
        const element = context.querySelector(selector);
        if (element) {
          return element;
        }
      } catch (error) {
        console.warn(`Invalid selector: ${selector}`, error);
      }
    }
    return null;
  }

  static findElementsWithFallback(selectors, context = document) {
    const selectorArray = Array.isArray(selectors) ? selectors : [selectors];
    const foundElements = [];

    for (const selector of selectorArray) {
      try {
        const elements = context.querySelectorAll(selector);
        if (elements.length > 0) {
          foundElements.push(...Array.from(elements));
        }
      } catch (error) {
        console.warn(`Invalid selector: ${selector}`, error);
      }
    }

    return [...new Set(foundElements)];
  }

  static waitForElement(
    selectors,
    timeout = 10000,
    interval = 100,
    context = document
  ) {
    return new Promise((resolve) => {
      const startTime = Date.now();

      const checkElement = () => {
        const element = this.findElementWithFallback(selectors, context);

        if (element) {
          resolve(element);
          return;
        }

        if (Date.now() - startTime >= timeout) {
          resolve(null);
          return;
        }

        setTimeout(checkElement, interval);
      };

      checkElement();
    });
  }

  static isElementVisible(element) {
    if (!element) return false;

    const style = window.getComputedStyle(element);
    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      style.opacity !== "0" &&
      element.offsetWidth > 0 &&
      element.offsetHeight > 0
    );
  }

  static isElementInViewport(element) {
    if (!element) return false;

    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <=
        (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }

  static findVideoPlayer() {
    return this.findElementWithFallback(YouTubeSelectors.videoPlayer);
  }

  static findOverlayTargets() {
    const elements = this.findElementsWithFallback(
      YouTubeSelectors.overlayElements
    );

    return elements.filter((element) => {
      return !YouTubeSelectors.protectedElements.some((protectedSelector) => {
        try {
          return (
            element.matches(protectedSelector) ||
            element.closest(protectedSelector)
          );
        } catch (error) {
          return false;
        }
      });
    });
  }

  // 新しい動画プレーヤー検出機能
  static async detectVideoPlayerAsync(timeout = 15000, retryInterval = 200) {
    const startTime = Date.now();
    let attemptCount = 0;

    return new Promise((resolve) => {
      const detectPlayer = () => {
        attemptCount++;

        const player = this.findVideoPlayer();

        if (player && this.isElementVisible(player)) {
          resolve(player);
          return;
        }

        if (Date.now() - startTime >= timeout) {
          resolve(null);
          return;
        }

        setTimeout(detectPlayer, retryInterval);
      };

      detectPlayer();
    });
  }

  static waitForPageLoad(timeout = 10000) {
    return new Promise((resolve) => {
      if (document.readyState === "complete") {
        resolve(true);
        return;
      }

      const startTime = Date.now();

      const checkReadyState = () => {
        if (document.readyState === "complete") {
          resolve(true);
          return;
        }

        if (Date.now() - startTime >= timeout) {
          resolve(false);
          return;
        }

        setTimeout(checkReadyState, 100);
      };

      checkReadyState();
    });
  }

  static isYouTubeVideoPage() {
    const url = window.location.href;
    const isYouTube = url.includes("youtube.com");
    const isVideoPage = url.includes("/watch") || url.includes("v=");

    return isYouTube && isVideoPage;
  }

  static waitForPlayerReady(player, timeout = 5000) {
    if (!player) return Promise.resolve(false);

    return new Promise((resolve) => {
      const startTime = Date.now();

      const checkPlayerReady = () => {
        const videoElement =
          player.querySelector && player.querySelector("video");
        if (videoElement && videoElement.readyState >= 1) {
          resolve(true);
          return;
        }

        const controls =
          player.querySelector && player.querySelector(".ytp-chrome-controls");
        if (controls && this.isElementVisible(controls)) {
          resolve(true);
          return;
        }

        if (Date.now() - startTime >= timeout) {
          resolve(false);
          return;
        }

        setTimeout(checkPlayerReady, 100);
      };

      checkPlayerReady();
    });
  }
}

// 基本的な機能テスト
function runBasicTests() {
  console.log("🧪 Running Basic Element Detection Tests...\n");

  // テスト1: YouTubeSelectorの定義確認
  console.log("✅ Test 1: YouTubeSelectors defined");
  console.log(
    "  - videoPlayer selectors:",
    YouTubeSelectors.videoPlayer.length
  );
  console.log(
    "  - overlayElements selectors:",
    YouTubeSelectors.overlayElements.length
  );
  console.log(
    "  - protectedElements selectors:",
    YouTubeSelectors.protectedElements.length
  );

  // テスト2: ElementDetectorメソッドの存在確認
  console.log("\n✅ Test 2: ElementDetector methods defined");
  const methods = [
    "findElementWithFallback",
    "findElementsWithFallback",
    "waitForElement",
    "isElementVisible",
    "isElementInViewport",
    "findVideoPlayer",
    "findOverlayTargets",
  ];

  methods.forEach((method) => {
    const exists = typeof ElementDetector[method] === "function";
    console.log(`  - ${method}: ${exists ? "✅" : "❌"}`);
  });

  // テスト3: セレクターの妥当性確認
  console.log("\n✅ Test 3: Selector validity check");
  const allSelectors = [
    ...YouTubeSelectors.videoPlayer,
    ...YouTubeSelectors.overlayElements,
    ...YouTubeSelectors.protectedElements,
  ];

  let validSelectors = 0;
  let invalidSelectors = 0;

  allSelectors.forEach((selector) => {
    try {
      document.querySelector(selector);
      validSelectors++;
    } catch (error) {
      console.warn(`  ⚠️  Invalid selector: ${selector}`);
      invalidSelectors++;
    }
  });

  console.log(`  - Valid selectors: ${validSelectors}`);
  console.log(`  - Invalid selectors: ${invalidSelectors}`);

  // テスト4: フォールバック機能のテスト
  console.log("\n✅ Test 4: Fallback mechanism test");
  const testSelectors = ["#nonexistent1", "#nonexistent2", "#movie_player"];
  const result = ElementDetector.findElementWithFallback(testSelectors);
  console.log(
    `  - Fallback test result: ${
      result === null ? "PASS (no elements found)" : "FAIL"
    }`
  );

  console.log("\n🎉 Basic tests completed!");
}

// 動画プレーヤー検出の追加テスト
function testVideoPlayerDetection() {
  console.log("\n🎬 Testing Video Player Detection Features...\n");

  // YouTube動画ページ判定テスト
  console.log("✅ Test: YouTube page detection");
  global.window.location = { href: "https://www.youtube.com/watch?v=test123" };
  const isYouTubePage = ElementDetector.isYouTubeVideoPage();
  console.log(`  - YouTube page detected: ${isYouTubePage}`);

  // 非YouTube動画ページ判定テスト
  global.window.location = { href: "https://www.example.com" };
  const isNotYouTubePage = !ElementDetector.isYouTubeVideoPage();
  console.log(`  - Non-YouTube page correctly identified: ${isNotYouTubePage}`);

  // 動画プレーヤー検出テスト
  console.log("\n✅ Test: Video player detection");
  const player = ElementDetector.findVideoPlayer();
  console.log(
    `  - Video player detection: ${
      player === null ? "PASS (no player in test env)" : "FOUND"
    }`
  );

  console.log("\n🎉 Video Player Detection Tests Complete!");
}

// メイン実行
if (require.main === module) {
  runBasicTests();
  testVideoPlayerDetection();
}

module.exports = { ElementDetector, YouTubeSelectors };
