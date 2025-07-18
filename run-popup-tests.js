/**
 * YouTube Theater Mode - ポップアップ通信テスト実行スクリプト
 */

// テストランナーのインポート
const { runTests } = require("./test-utils");

// テストファイルのパス
const testFiles = ["./test-popup-communication.js"];

// テストの実行
runTests(testFiles)
  .then((results) => {
    console.log("ポップアップ通信テスト完了:", results);
    process.exit(results.failed ? 1 : 0);
  })
  .catch((error) => {
    console.error("テスト実行エラー:", error);
    process.exit(1);
  });
