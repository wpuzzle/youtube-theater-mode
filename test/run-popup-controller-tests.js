/**
 * PopupController テストランナー
 * PopupController の単体テストを実行
 */

// 必要な依存関係をインポート
const { runPopupControllerTests } = require("./test-popup-controller.js");

/**
 * PopupController テストを実行
 */
async function runTests() {
  console.log("=".repeat(60));
  console.log("PopupController 単体テスト実行");
  console.log("=".repeat(60));

  try {
    await runPopupControllerTests();
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
