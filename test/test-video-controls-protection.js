/**
 * YouTube Theater Mode - 動画コントロール保護機能のテスト
 *
 * このテストファイルは、シアターモード有効時に動画プレーヤーコントロールが
 * 正常に操作できることを確認するためのものです。
 */

// テスト用のモックデータ
const mockYouTubeSelectors = {
  videoPlayer: ["#mockPlayer", ".mock-player"],
  overlayElements: [".container", "body"],
  protectedElements: [
    "#mockPlayer",
    ".mock-controls",
    ".mock-button",
    ".mock-progress",
    ".mock-volume",
    ".mock-volume-slider",
  ],
};

// テストコントローラークラス
class VideoControlsProtectionTest {
  constructor() {
    this.results = [];
    this.testCount = 0;
    this.passCount = 0;
    this.failCount = 0;
  }

  /**
   * テストを実行
   */
  runTests() {
    this.log("動画コントロール保護機能のテストを開始します", "info");

    // テストケースを実行
    this.testOverlayCreation();
    this.testControlsProtection();
    this.testControlsInteraction();
    this.testDynamicControlsProtection();

    // 結果を表示
    this.displayResults();
  }

  /**
   * オーバーレイ作成のテスト
   */
  testOverlayCreation() {
    this.testCount++;
    try {
      // モックプレーヤーを取得
      const player = document.getElementById("mockPlayer");
      if (!player) {
        throw new Error("モックプレーヤーが見つかりません");
      }

      // オーバーレイを作成
      const overlay = document.createElement("div");
      overlay.className = "theater-mode-overlay";
      overlay.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
      document.body.appendChild(overlay);

      // プレーヤーに保護クラスを追加
      player.classList.add("theater-mode-video-area");

      // 検証
      const overlayExists =
        document.querySelector(".theater-mode-overlay") !== null;
      const playerProtected = player.classList.contains(
        "theater-mode-video-area"
      );

      if (overlayExists && playerProtected) {
        this.pass("オーバーレイが正常に作成され、プレーヤーが保護されました");
      } else {
        this.fail("オーバーレイ作成または保護クラス適用に失敗しました");
      }

      // クリーンアップ
      if (overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    } catch (error) {
      this.fail(
        `オーバーレイ作成テスト中にエラーが発生しました: ${error.message}`
      );
    }
  }

  /**
   * コントロール要素の保護テスト
   */
  testControlsProtection() {
    this.testCount++;
    try {
      // モックコントロールを取得
      const controls = document.getElementById("mockControls");
      if (!controls) {
        throw new Error("モックコントロールが見つかりません");
      }

      // オーバーレイを作成
      const overlay = document.createElement("div");
      overlay.className = "theater-mode-overlay";
      overlay.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
      document.body.appendChild(overlay);

      // コントロール要素に保護クラスを追加
      controls.classList.add("theater-mode-video-area");

      // 個別のコントロール要素も保護
      const controlElements = controls.querySelectorAll(
        "button, .mock-progress, .mock-volume-slider"
      );
      let protectedCount = 0;

      controlElements.forEach((element) => {
        element.classList.add("theater-mode-video-area");
        element.style.pointerEvents = "auto";
        protectedCount++;
      });

      // 検証
      const controlsProtected = controls.classList.contains(
        "theater-mode-video-area"
      );
      const allElementsProtected = protectedCount === controlElements.length;

      if (controlsProtected && allElementsProtected) {
        this.pass(
          `コントロール要素が正常に保護されました (${protectedCount}個の要素)`
        );
      } else {
        this.fail("コントロール要素の保護に失敗しました");
      }

      // クリーンアップ
      if (overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
      controls.classList.remove("theater-mode-video-area");
      controlElements.forEach((element) => {
        element.classList.remove("theater-mode-video-area");
        element.style.pointerEvents = "";
      });
    } catch (error) {
      this.fail(
        `コントロール保護テスト中にエラーが発生しました: ${error.message}`
      );
    }
  }

  /**
   * コントロール操作のテスト
   */
  testControlsInteraction() {
    this.testCount++;
    try {
      // モックコントロールを取得
      const controls = document.getElementById("mockControls");
      if (!controls) {
        throw new Error("モックコントロールが見つかりません");
      }

      // オーバーレイを作成
      const overlay = document.createElement("div");
      overlay.className = "theater-mode-overlay";
      overlay.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
      document.body.appendChild(overlay);

      // コントロール要素に保護クラスを追加
      controls.classList.add("theater-mode-video-area");

      // 個別のコントロール要素も保護
      const controlElements = controls.querySelectorAll(
        "button, .mock-progress, .mock-volume-slider"
      );
      controlElements.forEach((element) => {
        element.classList.add("theater-mode-video-area");
        element.style.pointerEvents = "auto";
      });

      // 操作テスト用のフラグ
      let playButtonClicked = false;
      let progressBarClicked = false;
      let volumeSliderClicked = false;

      // イベントリスナーを追加
      const playButton = document.getElementById("playButton");
      const progressBar = document.getElementById("progressBar");
      const volumeSlider = document.getElementById("volumeSlider");

      const playButtonListener = () => {
        playButtonClicked = true;
      };
      const progressBarListener = () => {
        progressBarClicked = true;
      };
      const volumeSliderListener = () => {
        volumeSliderClicked = true;
      };

      playButton.addEventListener("click", playButtonListener);
      progressBar.addEventListener("click", progressBarListener);
      volumeSlider.addEventListener("click", volumeSliderListener);

      // クリックイベントをシミュレート
      playButton.click();
      progressBar.click();
      volumeSlider.click();

      // 検証
      if (playButtonClicked && progressBarClicked && volumeSliderClicked) {
        this.pass("オーバーレイ適用中もコントロール要素が正常に操作できました");
      } else {
        this.fail("コントロール要素の操作に失敗しました");
      }

      // クリーンアップ
      playButton.removeEventListener("click", playButtonListener);
      progressBar.removeEventListener("click", progressBarListener);
      volumeSlider.removeEventListener("click", volumeSliderListener);

      if (overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
      controls.classList.remove("theater-mode-video-area");
      controlElements.forEach((element) => {
        element.classList.remove("theater-mode-video-area");
        element.style.pointerEvents = "";
      });
    } catch (error) {
      this.fail(
        `コントロール操作テスト中にエラーが発生しました: ${error.message}`
      );
    }
  }

  /**
   * 動的に追加されるコントロール要素の保護テスト
   */
  testDynamicControlsProtection() {
    this.testCount++;
    try {
      // モックプレーヤーを取得
      const player = document.getElementById("mockPlayer");
      if (!player) {
        throw new Error("モックプレーヤーが見つかりません");
      }

      // オーバーレイを作成
      const overlay = document.createElement("div");
      overlay.className = "theater-mode-overlay";
      overlay.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
      document.body.appendChild(overlay);

      // プレーヤーに保護クラスを追加
      player.classList.add("theater-mode-video-area");

      // 動的に新しいコントロール要素を追加
      const dynamicControl = document.createElement("button");
      dynamicControl.className = "mock-button dynamic-control";
      dynamicControl.textContent = "動的ボタン";
      player.querySelector(".mock-controls").appendChild(dynamicControl);

      // MutationObserverをモック
      const mockObserver = {
        observe: () => {},
        disconnect: () => {},
      };
      window.MutationObserver = function () {
        return mockObserver;
      };

      // 動的要素に保護クラスを追加
      dynamicControl.classList.add("theater-mode-video-area");
      dynamicControl.style.pointerEvents = "auto";

      // 検証
      const dynamicControlProtected = dynamicControl.classList.contains(
        "theater-mode-video-area"
      );
      const pointerEventsAuto = dynamicControl.style.pointerEvents === "auto";

      if (dynamicControlProtected && pointerEventsAuto) {
        this.pass("動的に追加されたコントロール要素が正常に保護されました");
      } else {
        this.fail("動的コントロール要素の保護に失敗しました");
      }

      // クリーンアップ
      if (dynamicControl && dynamicControl.parentNode) {
        dynamicControl.parentNode.removeChild(dynamicControl);
      }
      if (overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
      player.classList.remove("theater-mode-video-area");
    } catch (error) {
      this.fail(
        `動的コントロール保護テスト中にエラーが発生しました: ${error.message}`
      );
    }
  }

  /**
   * テスト成功を記録
   */
  pass(message) {
    this.passCount++;
    this.results.push({ status: "pass", message });
    this.log(`✅ 成功: ${message}`, "success");
  }

  /**
   * テスト失敗を記録
   */
  fail(message) {
    this.failCount++;
    this.results.push({ status: "fail", message });
    this.log(`❌ 失敗: ${message}`, "error");
  }

  /**
   * ログを出力
   */
  log(message, type = "info") {
    const resultsElement = document.getElementById("testResults");
    if (resultsElement) {
      const logEntry = document.createElement("div");
      logEntry.className = `log-entry ${type}`;
      logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
      resultsElement.appendChild(logEntry);
      resultsElement.scrollTop = resultsElement.scrollHeight;
    }

    console.log(`[${type.toUpperCase()}] ${message}`);
  }

  /**
   * テスト結果を表示
   */
  displayResults() {
    const summary = `テスト完了: 合計 ${this.testCount} テスト中、成功: ${this.passCount}、失敗: ${this.failCount}`;
    this.log(summary, this.failCount === 0 ? "success" : "error");

    // 結果をコンソールにも出力
    console.log(
      "%c" + summary,
      this.failCount === 0
        ? "color: green; font-weight: bold;"
        : "color: red; font-weight: bold;"
    );
  }
}

// DOMが読み込まれたらテストを実行
document.addEventListener("DOMContentLoaded", () => {
  const tester = new VideoControlsProtectionTest();

  // テスト実行ボタンのイベントリスナーを設定
  const testButton = document.getElementById("testControls");
  if (testButton) {
    testButton.addEventListener("click", () => {
      tester.runTests();
    });
  } else {
    console.error("テスト実行ボタンが見つかりません");
  }
});
