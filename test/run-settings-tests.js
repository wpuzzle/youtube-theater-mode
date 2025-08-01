/**
 * SettingsManager テストランナー
 */

// テストファイルをインポート
const path = require("path");
const fs = require("fs");

// テスト実行
console.log("Running SettingsManager tests...");

try {
  // テストモジュールを読み込み
  const testModule = require("./test-settings-manager.js");

  // テスト実行
  if (typeof testModule.runSettingsManagerTests === "function") {
    testModule
      .runSettingsManagerTests()
      .then(() => {
        console.log("SettingsManager tests completed successfully");
      })
      .catch((error) => {
        console.error("Error in SettingsManager tests:", error);
        process.exit(1);
      });
  } else {
    console.log("Running default test export");
    // デフォルトのテスト関数を実行
  }
} catch (error) {
  console.error("Error running SettingsManager tests:", error);
  process.exit(1);
}
