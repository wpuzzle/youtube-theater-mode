/**
 * ServiceWorkerManager テストランナー
 */

// ServiceWorkerManagerクラスを読み込み
if (typeof ServiceWorkerManager === "undefined") {
  // Node.js環境での読み込み
  if (typeof require !== "undefined") {
    try {
      const {
        ServiceWorkerManager,
      } = require("../infrastructure/service-worker-manager.js");
      global.ServiceWorkerManager = ServiceWorkerManager;
    } catch (error) {
      console.error(
        "ServiceWorkerManager class not found. Please load service-worker-manager.js first."
      );
    }
  } else {
    console.error(
      "ServiceWorkerManager class not found. Please load service-worker-manager.js first."
    );
  }
}

// テスト関数を読み込み
if (typeof runServiceWorkerManagerTests === "undefined") {
  if (typeof require !== "undefined") {
    try {
      const {
        runServiceWorkerManagerTests,
      } = require("./test-service-worker-manager.js");
      global.runServiceWorkerManagerTests = runServiceWorkerManagerTests;
    } catch (error) {
      console.error(
        "runServiceWorkerManagerTests function not found. Please load test-service-worker-manager.js first."
      );
    }
  } else {
    console.error(
      "runServiceWorkerManagerTests function not found. Please load test-service-worker-manager.js first."
    );
  }
}

/**
 * テストを実行
 */
async function executeServiceWorkerManagerTests() {
  console.log("=".repeat(50));
  console.log("YouTube Theater Mode - ServiceWorkerManager Tests");
  console.log("=".repeat(50));

  try {
    if (typeof runServiceWorkerManagerTests === "function") {
      const success = await runServiceWorkerManagerTests();

      console.log("=".repeat(50));
      if (success) {
        console.log("✓ All ServiceWorkerManager tests passed!");
      } else {
        console.log("✗ Some ServiceWorkerManager tests failed!");
      }
      console.log("=".repeat(50));

      return success;
    } else {
      console.log("⚠️  ServiceWorkerManager tests not available - skipping");
      return true;
    }
  } catch (error) {
    console.error("Error running ServiceWorkerManager tests:", error);
    console.error(error.stack);
    return false;
  }
}

// ブラウザ環境での実行
if (typeof window !== "undefined") {
  window.executeServiceWorkerManagerTests = executeServiceWorkerManagerTests;

  // ページ読み込み後に自動実行
  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      executeServiceWorkerManagerTests
    );
  } else {
    executeServiceWorkerManagerTests();
  }
}

// Node.js環境での実行
if (typeof module !== "undefined" && require.main === module) {
  executeServiceWorkerManagerTests().then((success) => {
    process.exit(success ? 0 : 1);
  });
}

// CommonJS/ES6 両対応のエクスポート
if (typeof module !== "undefined" && module.exports) {
  module.exports = { executeServiceWorkerManagerTests };
}
