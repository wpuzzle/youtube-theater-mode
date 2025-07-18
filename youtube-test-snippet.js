/**
 * YouTube Theater Mode - Live Test Snippet
 * 実際のYouTubeページで動作確認するためのスニペット
 *
 * 使用方法:
 * 1. YouTubeの動画ページを開く
 * 2. ブラウザの開発者ツールのコンソールでこのコードを実行
 */

(async function testYouTubeTheaterMode() {
  console.log("🧪 YouTube Theater Mode - Live Test Starting...\n");

  // 1. ページ判定テスト
  console.log("📍 Step 1: Page Detection");
  const isYouTubePage = window.location.href.includes("youtube.com");
  const isVideoPage =
    window.location.href.includes("/watch") ||
    window.location.href.includes("v=");
  console.log(`  - Is YouTube: ${isYouTubePage}`);
  console.log(`  - Is Video Page: ${isVideoPage}`);
  console.log(`  - Combined Result: ${isYouTubePage && isVideoPage}`);

  if (!isYouTubePage || !isVideoPage) {
    console.log(
      "❌ This is not a YouTube video page. Please navigate to a YouTube video."
    );
    return;
  }

  // 2. 基本的な要素検出テスト
  console.log("\n🔍 Step 2: Basic Element Detection");

  const videoPlayerSelectors = [
    "#movie_player",
    ".html5-video-player",
    '[data-testid="video-player"]',
    ".ytp-player-content",
    "#player-container",
  ];

  let foundPlayer = null;
  for (const selector of videoPlayerSelectors) {
    const element = document.querySelector(selector);
    console.log(`  - ${selector}: ${element ? "✅ Found" : "❌ Not found"}`);
    if (element && !foundPlayer) {
      foundPlayer = element;
    }
  }

  if (!foundPlayer) {
    console.log("❌ No video player found with any selector");
    return;
  }

  console.log(
    `✅ Video player found: ${foundPlayer.id || foundPlayer.className}`
  );

  // 3. オーバーレイ対象要素の検出
  console.log("\n🎯 Step 3: Overlay Target Detection");

  const overlaySelectors = [
    "#secondary",
    "#comments",
    "#masthead",
    "#meta-contents",
    ".ytd-watch-metadata",
  ];

  const overlayTargets = [];
  for (const selector of overlaySelectors) {
    const elements = document.querySelectorAll(selector);
    console.log(`  - ${selector}: ${elements.length} elements found`);
    overlayTargets.push(...Array.from(elements));
  }

  console.log(`✅ Total overlay targets found: ${overlayTargets.length}`);

  // 4. 動画要素の詳細チェック
  console.log("\n🎬 Step 4: Video Element Details");

  const videoElement = foundPlayer.querySelector("video");
  if (videoElement) {
    console.log(`  - Video element found: ✅`);
    console.log(`  - Video ready state: ${videoElement.readyState}`);
    console.log(
      `  - Video dimensions: ${videoElement.videoWidth}x${videoElement.videoHeight}`
    );
  } else {
    console.log(`  - Video element: ❌ Not found`);
  }

  const controls = foundPlayer.querySelector(".ytp-chrome-controls");
  console.log(`  - Player controls: ${controls ? "✅ Found" : "❌ Not found"}`);

  // 5. 可視性チェック
  console.log("\n👁️ Step 5: Visibility Check");

  const playerStyle = window.getComputedStyle(foundPlayer);
  const isVisible =
    playerStyle.display !== "none" &&
    playerStyle.visibility !== "hidden" &&
    playerStyle.opacity !== "0" &&
    foundPlayer.offsetWidth > 0 &&
    foundPlayer.offsetHeight > 0;

  console.log(`  - Player visible: ${isVisible ? "✅" : "❌"}`);
  console.log(
    `  - Player dimensions: ${foundPlayer.offsetWidth}x${foundPlayer.offsetHeight}`
  );

  // 6. 実際の検出機能テスト（content.jsが読み込まれている場合）
  console.log("\n🔧 Step 6: Extension Function Test");

  if (typeof ElementDetector !== "undefined") {
    console.log("  - ElementDetector available: ✅");

    const detectedPlayer = ElementDetector.findVideoPlayer();
    console.log(
      `  - findVideoPlayer(): ${detectedPlayer ? "✅ Success" : "❌ Failed"}`
    );

    const overlayTargets = ElementDetector.findOverlayTargets();
    console.log(
      `  - findOverlayTargets(): ${overlayTargets.length} targets found`
    );

    const isYTPage = ElementDetector.isYouTubeVideoPage();
    console.log(`  - isYouTubeVideoPage(): ${isYTPage ? "✅" : "❌"}`);
  } else {
    console.log(
      "  - ElementDetector: ❌ Not available (content.js not loaded)"
    );
  }

  if (typeof TheaterModeController !== "undefined") {
    console.log("  - TheaterModeController available: ✅");

    try {
      const controller = new TheaterModeController();
      const detectedPlayer = await controller.detectVideoPlayer();
      console.log(
        `  - detectVideoPlayer(): ${
          detectedPlayer ? "✅ Success" : "❌ Failed"
        }`
      );
    } catch (error) {
      console.log(`  - detectVideoPlayer(): ❌ Error - ${error.message}`);
    }
  } else {
    console.log(
      "  - TheaterModeController: ❌ Not available (content.js not loaded)"
    );
  }

  console.log("\n🎉 YouTube Theater Mode Live Test Complete!");
  console.log("\n💡 To test the extension:");
  console.log("1. Load the content.js script in this page");
  console.log("2. Run this test again to see full functionality");
})();
