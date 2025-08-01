/**
 * DataValidator テストランナー
 */

// テストファイルをインポート
const path = require("path");
const fs = require("fs");

// テスト実行
console.log("Running DataValidator tests...");

try {
  // テストモジュールを読み込み
  const testModule = require("./test-data-validator.js");

  // テスト実行
  if (typeof testModule.runDataValidatorTests === "function") {
    testModule
      .runDataValidatorTests()
      .then(() => {
        console.log("DataValidator tests completed successfully");
      })
      .catch((error) => {
        console.error("Error in DataValidator tests:", error);
        process.exit(1);
      });
  } else {
    console.log("Running default test export");
    // デフォルトのテスト関数を実行
  }
} catch (error) {
  console.error("Error running DataValidator tests:", error);
  process.exit(1);
}
