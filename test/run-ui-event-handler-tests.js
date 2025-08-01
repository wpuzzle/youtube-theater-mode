/**
 * UIEventHandler テストランナー
 * UIEventHandler の単体テストを実行
 */

// 必要な依存関係をインポート
const { runUIEventHandlerTests } = require("./test-ui-event-handler.js");

/**
 * UIEventHandler テストを実行
 */
async function runTests() {
  console.log("=".repeat(60));
  console.log("UIEventHandler 単体テスト実行");
  console.log("=".repeat(60));

  try {
    await runUIEventHandlerTests();
    console.log("\nテスト実行完了");
  } catch (error) {
    console.error("テスト実行中にエラーが発生しました:", error);
    process.exit(1);
  }
}

// スクリプトが直接実行された場合
if (require.main === module) {
  runTests();
}

module.exports = { runTests };
