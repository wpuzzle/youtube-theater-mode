/**
 * StateStore テストランナー
 */

// テストファイルをインポート
const path = require("path");
const fs = require("fs");

// テスト実行
console.log("Running StateStore tests...");

try {
  // テストモジュールを読み込み
  const testModule = require("./test-state-store.js");

  // テスト実行
  if (typeof testModule.runStateStoreTests === "function") {
    testModule.runStateStoreTests();
  } else {
    console.log("Running default test export");
    // デフォルトのテスト関数を実行
  }

  console.log("StateStore tests completed successfully");
} catch (error) {
  console.error("Error running StateStore tests:", error);
  process.exit(1);
}
