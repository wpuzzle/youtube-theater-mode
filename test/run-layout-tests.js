/**
 * YouTube Theater Mode - Layout Adaptation Tests Runner
 * レイアウト変更対応テストのランナースクリプト
 */

// テスト実行関数
async function runLayoutTests() {
  console.log("🧪 Starting YouTube Theater Mode Layout Adaptation Tests...");

  try {
    // テストモジュールを読み込み
    const { LayoutAdaptationTests } = require("./test-layout-adaptation.js");

    // ElementDetectorクラスをモック
    global.ElementDetector = require("./content.js").ElementDetector;
    global.YouTubeSelectors = require("./content.js").YouTubeSelectors;

    // テストを実行
    const testSuite = new LayoutAdaptationTests();
    await testSuite.runAllTests();

    console.log("✅ All layout adaptation tests completed!");
  } catch (error) {
    console.error("❌ Error running layout adaptation tests:", error);
    process.exit(1);
  }
}

// スクリプトが直接実行された場合のみテストを実行
if (require.main === module) {
  runLayoutTests();
}

module.exports = { runLayoutTests };
