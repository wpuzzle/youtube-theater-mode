/**
 * Node.js Test Runner for ElementManager
 * ElementManagerクラスのテストをNode.js環境で実行
 */

// 必要なモジュールをインポート
const { ElementManager } = require("../infrastructure/element-manager");
const { ElementManagerTests } = require("./test-element-manager");

// テスト実行
console.log("🧪 Running ElementManager Tests in Node.js environment...");

// グローバルオブジェクトにElementManagerを設定
global.ElementManager = ElementManager;

// テストスイートを作成して実行
const testSuite = new ElementManagerTests();
testSuite.runAllTests().catch((error) => {
  console.error("❌ Test execution failed:", error);
  process.exit(1);
});
