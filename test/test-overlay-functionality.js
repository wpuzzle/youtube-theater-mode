/**
 * Theater Mode Overlay Functionality Tests
 * オーバーレイ機能の包括的なテストスイート
 */

// テスト結果を格納する配列
const testResults = [];

// テストヘルパー関数
function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    testResults.push({ status: "PASS", message });
    return true;
  } else {
    console.error(`❌ FAIL: ${message}`);
    testResults.push({ status: "FAIL", message });
    return false;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// テスト用のDOM要素を作成
function createTestDOM() {
  // 既存のテスト要素をクリーンアップ
  const existingTest = document.getElementById("test-container");
  if (existingTest) {
    existingTest.remove();
  }

  // テスト用コンテナを作成
  const container = document.createElement("div");
  container.id = "test-container";
  container.innerHTML = `
        <div id="masthead">Test Header</div>
        <div id="movie_player">Video Player</div>
        <div id="secondary">Sidebar</div>
        <div id="meta-contents">Video Meta</div>
        <div id="comments">Comments</div>
    `;

  // スタイルを適用
  container.style.cssText = `
        position: fixed;
        top: -1000px;
        left: -1000px;
        width: 800px;
        height: 600px;
        visibility: hidden;
    `;

  document.body.appendChild(container);
  return container;
}

// テスト用のTheaterModeControllerクラス
class TestTheaterModeController {
  constructor() {
    this.isTheaterModeActive = false;
    this.overlayElement = null;
    this.currentOpacity = 0.7;
  }

  toggleTheaterMode() {
    if (this.isTheaterModeActive) {
      this.disableTheaterMode();
    } else {
      this.enableTheaterMode();
    }
  }

  enableTheaterMode() {
    if (this.isTheaterModeActive) return;

    this.applyOverlay();
    this.isTheaterModeActive = true;
    document.body.classList.add("theater-mode-active");
  }

  disableTheaterMode() {
    if (!this.isTheaterModeActive) return;

    this.removeOverlay();
    this.isTheaterModeActive = false;
    document.body.classList.remove("theater-mode-active");
  }

  updateOpacity(opacity) {
    this.currentOpacity = Math.max(0, Math.min(0.9, opacity));

    if (this.overlayElement) {
      this.overlayElement.style.backgroundColor = `rgba(0, 0, 0, ${this.currentOpacity})`;
    }
  }

  applyOverlay() {
    this.removeOverlay();

    try {
      this.overlayElement = document.createElement("div");
      this.overlayElement.className =
        "theater-mode-overlay theater-mode-fade-in";
      this.overlayElement.style.backgroundColor = `rgba(0, 0, 0, ${this.currentOpacity})`;

      document.body.appendChild(this.overlayElement);

      const videoPlayer = document.querySelector("#movie_player");
      if (videoPlayer) {
        videoPlayer.classList.add("theater-mode-video-area");
      }
    } catch (error) {
      console.error("Error applying overlay:", error);
      this.removeOverlay();
    }
  }

  removeOverlay() {
    try {
      if (this.overlayElement) {
        this.overlayElement.classList.remove("theater-mode-fade-in");
        this.overlayElement.classList.add("theater-mode-fade-out");

        setTimeout(() => {
          if (this.overlayElement && this.overlayElement.parentNode) {
            this.overlayElement.parentNode.removeChild(this.overlayElement);
          }
          this.overlayElement = null;
        }, 300);
      }

      const videoPlayer = document.querySelector("#movie_player");
      if (videoPlayer) {
        videoPlayer.classList.remove("theater-mode-video-area");
      }
    } catch (error) {
      console.error("Error removing overlay:", error);
      if (this.overlayElement && this.overlayElement.parentNode) {
        this.overlayElement.parentNode.removeChild(this.overlayElement);
      }
      this.overlayElement = null;
    }
  }
}

// テストスイート
async function runOverlayTests() {
  console.log("🧪 Starting Theater Mode Overlay Tests...\n");

  // テスト環境をセットアップ
  const testContainer = createTestDOM();
  const controller = new TestTheaterModeController();

  try {
    // Test 1: 初期状態の確認
    console.log("Test 1: Initial State");
    assert(
      !controller.isTheaterModeActive,
      "Theater mode should be inactive initially"
    );
    assert(
      controller.overlayElement === null,
      "Overlay element should be null initially"
    );
    assert(controller.currentOpacity === 0.7, "Default opacity should be 0.7");

    // Test 2: シアターモード有効化
    console.log("\nTest 2: Enable Theater Mode");
    controller.enableTheaterMode();
    assert(
      controller.isTheaterModeActive,
      "Theater mode should be active after enableTheaterMode()"
    );
    assert(
      controller.overlayElement !== null,
      "Overlay element should exist after enabling"
    );
    assert(
      document.body.classList.contains("theater-mode-active"),
      "Body should have theater-mode-active class"
    );

    // Test 3: オーバーレイ要素の検証
    console.log("\nTest 3: Overlay Element Validation");
    const overlay = controller.overlayElement;
    assert(
      overlay.classList.contains("theater-mode-overlay"),
      "Overlay should have theater-mode-overlay class"
    );
    assert(
      overlay.classList.contains("theater-mode-fade-in"),
      "Overlay should have fade-in class"
    );
    assert(
      overlay.style.backgroundColor.includes("rgba(0, 0, 0, 0.7)"),
      "Overlay should have correct background color"
    );

    // Test 4: 動画プレーヤー保護の確認
    console.log("\nTest 4: Video Player Protection");
    const videoPlayer = document.querySelector("#movie_player");
    assert(
      videoPlayer.classList.contains("theater-mode-video-area"),
      "Video player should have protection class"
    );

    // Test 5: 透明度変更
    console.log("\nTest 5: Opacity Update");
    controller.updateOpacity(0.5);
    assert(
      controller.currentOpacity === 0.5,
      "Opacity should be updated to 0.5"
    );
    assert(
      overlay.style.backgroundColor.includes("rgba(0, 0, 0, 0.5)"),
      "Overlay background should reflect new opacity"
    );

    // Test 6: 透明度の範囲制限
    console.log("\nTest 6: Opacity Range Limits");
    controller.updateOpacity(1.5); // 範囲外の値
    assert(
      controller.currentOpacity === 0.9,
      "Opacity should be clamped to maximum 0.9"
    );

    controller.updateOpacity(-0.5); // 範囲外の値
    assert(
      controller.currentOpacity === 0,
      "Opacity should be clamped to minimum 0"
    );

    // Test 7: シアターモード無効化
    console.log("\nTest 7: Disable Theater Mode");
    controller.disableTheaterMode();
    assert(
      !controller.isTheaterModeActive,
      "Theater mode should be inactive after disableTheaterMode()"
    );
    assert(
      !document.body.classList.contains("theater-mode-active"),
      "Body should not have theater-mode-active class"
    );

    // オーバーレイ削除のアニメーション待機
    await sleep(350);
    assert(
      controller.overlayElement === null,
      "Overlay element should be null after disabling"
    );

    // Test 8: 動画プレーヤー保護解除の確認
    console.log("\nTest 8: Video Player Protection Removal");
    assert(
      !videoPlayer.classList.contains("theater-mode-video-area"),
      "Video player should not have protection class after disabling"
    );

    // Test 9: トグル機能
    console.log("\nTest 9: Toggle Functionality");
    controller.toggleTheaterMode(); // 有効化
    assert(
      controller.isTheaterModeActive,
      "Toggle should enable theater mode when inactive"
    );

    controller.toggleTheaterMode(); // 無効化
    assert(
      !controller.isTheaterModeActive,
      "Toggle should disable theater mode when active"
    );

    // Test 10: 重複有効化の処理
    console.log("\nTest 10: Duplicate Enable Handling");
    controller.enableTheaterMode();
    const firstOverlay = controller.overlayElement;
    controller.enableTheaterMode(); // 再度有効化
    assert(
      controller.overlayElement !== firstOverlay,
      "New overlay should replace existing one"
    );

    // Test 11: 重複無効化の処理
    console.log("\nTest 11: Duplicate Disable Handling");
    controller.disableTheaterMode();
    await sleep(350);
    const wasNull = controller.overlayElement === null;
    controller.disableTheaterMode(); // 再度無効化
    assert(
      wasNull && controller.overlayElement === null,
      "Duplicate disable should not cause errors"
    );

    // Test 12: CSS クラスの確認
    console.log("\nTest 12: CSS Classes Verification");
    controller.enableTheaterMode();
    const newOverlay = controller.overlayElement;
    assert(
      newOverlay.classList.contains("theater-mode-overlay"),
      "Overlay should have base class"
    );
    assert(
      newOverlay.classList.contains("theater-mode-fade-in"),
      "Overlay should have fade-in class"
    );

    controller.disableTheaterMode();
    assert(
      newOverlay.classList.contains("theater-mode-fade-out"),
      "Overlay should have fade-out class when removing"
    );
  } catch (error) {
    console.error("Test execution error:", error);
    assert(false, `Test execution failed: ${error.message}`);
  } finally {
    // クリーンアップ
    if (controller.isTheaterModeActive) {
      controller.disableTheaterMode();
    }
    await sleep(350);
    testContainer.remove();
  }

  // テスト結果のサマリー
  console.log("\n" + "=".repeat(50));
  console.log("🧪 Test Results Summary");
  console.log("=".repeat(50));

  const passCount = testResults.filter((r) => r.status === "PASS").length;
  const failCount = testResults.filter((r) => r.status === "FAIL").length;
  const totalCount = testResults.length;

  console.log(`Total Tests: ${totalCount}`);
  console.log(`✅ Passed: ${passCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`Success Rate: ${((passCount / totalCount) * 100).toFixed(1)}%`);

  if (failCount > 0) {
    console.log("\n❌ Failed Tests:");
    testResults
      .filter((r) => r.status === "FAIL")
      .forEach((test) => {
        console.log(`  - ${test.message}`);
      });
  }

  console.log("\n" + "=".repeat(50));

  return {
    total: totalCount,
    passed: passCount,
    failed: failCount,
    successRate: (passCount / totalCount) * 100,
  };
}

// テストを実行する関数をエクスポート
if (typeof module !== "undefined" && module.exports) {
  module.exports = { runOverlayTests, TestTheaterModeController };
} else {
  // ブラウザ環境では自動実行
  window.runOverlayTests = runOverlayTests;
  console.log(
    "Theater Mode Overlay Tests loaded. Run 'runOverlayTests()' to execute tests."
  );
}
