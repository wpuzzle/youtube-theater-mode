/**
 * Node.js Test Runner for OverlayManager
 * OverlayManagerクラスのテストをNode.js環境で実行
 */

// 必要なモジュールをインポート
const { OverlayManager } = require("../infrastructure/overlay-manager");
const { OverlayManagerTests } = require("./test-overlay-functionality");

// テスト実行
console.log("🧪 Running OverlayManager Tests in Node.js environment...");

// グローバルオブジェクトにOverlayManagerを設定
global.OverlayManager = OverlayManager;

// テストスイートを作成して実行
const testSuite = new OverlayManagerTests();
testSuite.runAllTests().catch((error) => {
  console.error("❌ Test execution failed:", error);
  process.exit(1);
});
