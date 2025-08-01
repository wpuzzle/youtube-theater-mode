/**
 * TabStateManager テストランナー
 */

// テストファイルをインポート
const path = require("path");
const fs = require("fs");

// テスト実行
console.log("Running TabStateManager tests...");

try {
  // テストモジュールを読み込み
  const testModule = require("./test-tab-state-manager.js");

  // テスト実行
  if (typeof testModule.runTabStateManagerTests === "function") {
    testModule
      .runTabStateManagerTests()
      .then(() => {
        console.log("TabStateManager tests completed successfully");
      })
      .catch((error) => {
        console.error("Error in TabStateManager tests:", error);
        process.exit(1);
      });
  } else {
    console.log("Running default test export");
    // デフォルトのテスト関数を実行
  }
} catch (error) {
  console.error("Error running TabStateManager tests:", error);
  process.exit(1);
}
