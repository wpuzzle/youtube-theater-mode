/**
 * Node.js Test Runner for ElementObserver
 * ElementObserverクラスのテストをNode.js環境で実行
 */

// 必要なモジュールをインポート
const { ElementObserver } = require("../infrastructure/element-observer");
const { ElementObserverTests } = require("./test-element-observer");

// テスト実行
console.log("🧪 Running ElementObserver Tests in Node.js environment...");

// グローバルオブジェクトにElementObserverを設定
global.ElementObserver = ElementObserver;

// テストスイートを作成して実行
const testSuite = new ElementObserverTests();
testSuite.runAllTests().catch((error) => {
  console.error("❌ Test execution failed:", error);
  process.exit(1);
});
