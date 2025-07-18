/**
 * Video Player Detection Tests
 */

async function testVideoPlayerDetection() {
  console.log("🧪 Testing Video Player Detection...\n");

  // テスト1: 基本的な検出機能
  console.log("Test 1: Basic detection");
  try {
    const player = ElementDetector.findVideoPlayer();
    console.log("✅ Basic detection works:", player !== null);
  } catch (error) {
    console.log("❌ Basic detection failed:", error.message);
  }

  // テスト2: YouTube動画ページ判定
  console.log("\nTest 2: YouTube page detection");
  try {
    const isYouTubePage = ElementDetector.isYouTubeVideoPage();
    console.log("✅ YouTube page detection:", isYouTubePage);
  } catch (error) {
    console.log("❌ YouTube page detection failed:", error.message);
  }

  // テスト3: 非同期検出
  console.log("\nTest 3: Async detection");
  try {
    const player = await ElementDetector.detectVideoPlayerAsync(2000);
    console.log("✅ Async detection works:", player !== null);
  } catch (error) {
    console.log("❌ Async detection failed:", error.message);
  }

  // テスト4: TheaterModeController検出
  console.log("\nTest 4: TheaterModeController detection");
  try {
    const controller = new TheaterModeController();
    const player = await controller.detectVideoPlayer();
    console.log("✅ Controller detection works:", player !== null);
  } catch (error) {
    console.log("❌ Controller detection failed:", error.message);
  }

  console.log("\n🎉 Video Player Detection Tests Complete!");
}

// 実行
if (typeof window !== "undefined") {
  testVideoPlayerDetection();
}
