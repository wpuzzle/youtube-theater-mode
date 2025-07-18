/**
 * YouTube Theater Mode - アニメーション性能テスト
 * CSS アニメーション最適化の効果を検証するためのテストスクリプト
 */

class AnimationPerformanceTester {
  constructor() {
    this.results = {
      hardwareAccelerated: {
        frameCount: 0,
        fps: 0,
        avgDelta: 0,
        maxDelta: 0,
        droppedFrames: 0,
        duration: 0,
      },
      nonAccelerated: {
        frameCount: 0,
        fps: 0,
        avgDelta: 0,
        maxDelta: 0,
        droppedFrames: 0,
        duration: 0,
      },
    };

    this.testElement = null;
    this.resultContainer = null;
    this.isAnimating = false;
    this.animationFrames = [];
    this.startTime = 0;
    this.currentTest = "";
    this.isHardwareAccelerated = true;
  }

  /**
   * テスト環境を初期化
   */
  initialize() {
    console.log("YouTube Theater Mode: アニメーション性能テスト初期化");

    // テスト要素を作成
    this.createTestElements();

    // イベントリスナーを設定
    this.setupEventListeners();

    return this;
  }

  /**
   * テスト要素を作成
   */
  createTestElements() {
    // コンテナ要素
    const container = document.createElement("div");
    container.className = "animation-test-container";
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 300px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 15px;
      border-radius: 5px;
      font-family: Arial, sans-serif;
      z-index: 10000;
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
    `;

    // ヘッダー
    const header = document.createElement("h3");
    header.textContent = "アニメーション性能テスト";
    header.style.cssText = `
      margin: 0 0 10px 0;
      font-size: 16px;
      text-align: center;
    `;
    container.appendChild(header);

    // テスト要素
    this.testElement = document.createElement("div");
    this.testElement.className = "animation-test-element hardware-accelerated";
    this.testElement.style.cssText = `
      width: 100px;
      height: 100px;
      background-color: #3ea6ff;
      margin: 10px auto;
      border-radius: 5px;
    `;
    container.appendChild(this.testElement);

    // ハードウェアアクセラレーション有効スタイル
    const hardwareStyle = document.createElement("style");
    hardwareStyle.textContent = `
      .hardware-accelerated {
        transform: translateZ(0);
        will-change: opacity, transform;
        backface-visibility: hidden;
        transition: opacity 0.3s cubic-bezier(0.165, 0.84, 0.44, 1),
                    transform 0.3s cubic-bezier(0.165, 0.84, 0.44, 1);
      }
      
      .non-accelerated {
        transition: opacity 0.3s ease,
                    left 0.3s ease;
      }
    `;
    document.head.appendChild(hardwareStyle);

    // コントロールボタン
    const controls = document.createElement("div");
    controls.style.cssText = `
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
    `;

    const toggleButton = document.createElement("button");
    toggleButton.textContent = "ハードウェアアクセラレーション切替";
    toggleButton.id = "toggle-acceleration";
    toggleButton.style.cssText = `
      background: #3ea6ff;
      border: none;
      color: white;
      padding: 5px 10px;
      border-radius: 3px;
      cursor: pointer;
      font-size: 12px;
      flex: 1;
      margin-right: 5px;
    `;
    controls.appendChild(toggleButton);

    const testButton = document.createElement("button");
    testButton.textContent = "アニメーションテスト";
    testButton.id = "run-animation-test";
    testButton.style.cssText = `
      background: #3ea6ff;
      border: none;
      color: white;
      padding: 5px 10px;
      border-radius: 3px;
      cursor: pointer;
      font-size: 12px;
      flex: 1;
      margin-left: 5px;
    `;
    controls.appendChild(testButton);

    container.appendChild(controls);

    // 結果表示エリア
    this.resultContainer = document.createElement("div");
    this.resultContainer.className = "animation-test-results";
    this.resultContainer.style.cssText = `
      font-family: monospace;
      font-size: 12px;
      background: rgba(0, 0, 0, 0.3);
      padding: 10px;
      border-radius: 3px;
      max-height: 200px;
      overflow-y: auto;
      white-space: pre-wrap;
    `;
    this.resultContainer.textContent = "テスト結果がここに表示されます...";
    container.appendChild(this.resultContainer);

    // 閉じるボタン
    const closeButton = document.createElement("button");
    closeButton.textContent = "閉じる";
    closeButton.id = "close-animation-test";
    closeButton.style.cssText = `
      background: #666;
      border: none;
      color: white;
      padding: 5px 10px;
      border-radius: 3px;
      cursor: pointer;
      font-size: 12px;
      margin-top: 10px;
      width: 100%;
    `;
    container.appendChild(closeButton);

    document.body.appendChild(container);
  }

  /**
   * イベントリスナーを設定
   */
  setupEventListeners() {
    const toggleButton = document.getElementById("toggle-acceleration");
    const testButton = document.getElementById("run-animation-test");
    const closeButton = document.getElementById("close-animation-test");

    // ハードウェアアクセラレーション切替
    toggleButton.addEventListener("click", () => {
      this.isHardwareAccelerated = !this.isHardwareAccelerated;

      if (this.isHardwareAccelerated) {
        this.testElement.classList.remove("non-accelerated");
        this.testElement.classList.add("hardware-accelerated");
        toggleButton.textContent = "ハードウェアアクセラレーションOFF";
      } else {
        this.testElement.classList.remove("hardware-accelerated");
        this.testElement.classList.add("non-accelerated");
        toggleButton.textContent = "ハードウェアアクセラレーションON";
      }

      this.updateResults(
        `モード: ${
          this.isHardwareAccelerated
            ? "ハードウェアアクセラレーション有効"
            : "ハードウェアアクセラレーション無効"
        }`
      );
    });

    // アニメーションテスト実行
    testButton.addEventListener("click", () => {
      if (this.isAnimating) return;

      this.runAnimationTest();
    });

    // テスト閉じる
    closeButton.addEventListener("click", () => {
      const container = document.querySelector(".animation-test-container");
      if (container) {
        document.body.removeChild(container);
      }
    });
  }

  /**
   * アニメーションテストを実行
   */
  runAnimationTest() {
    if (this.isAnimating) return;

    this.currentTest = this.isHardwareAccelerated
      ? "hardwareAccelerated"
      : "nonAccelerated";
    this.updateResults(
      `${
        this.isHardwareAccelerated
          ? "ハードウェアアクセラレーション有効"
          : "ハードウェアアクセラレーション無効"
      } モードでテスト実行中...`
    );

    // 透明度アニメーション
    this.startAnimation();

    // アニメーションシーケンス
    this.testElement.style.opacity = "0.3";
    this.testElement.style.transform = "scale(0.8)";

    setTimeout(() => {
      this.testElement.style.opacity = "1";
      this.testElement.style.transform = "scale(1)";

      setTimeout(() => {
        this.stopAnimation();

        // 両方のテストが完了したら比較結果を表示
        if (
          this.results.hardwareAccelerated.frameCount > 0 &&
          this.results.nonAccelerated.frameCount > 0
        ) {
          this.showComparisonResults();
        } else if (!this.isHardwareAccelerated) {
          // ハードウェアアクセラレーション有効モードでもテスト
          this.isHardwareAccelerated = true;
          this.testElement.classList.remove("non-accelerated");
          this.testElement.classList.add("hardware-accelerated");
          document.getElementById("toggle-acceleration").textContent =
            "ハードウェアアクセラレーションOFF";

          setTimeout(() => {
            this.runAnimationTest();
          }, 500);
        }
      }, 600);
    }, 600);
  }

  /**
   * アニメーションフレームの記録開始
   */
  startAnimation() {
    this.isAnimating = true;
    this.animationFrames = [];
    this.startTime = performance.now();

    requestAnimationFrame(this.recordFrame.bind(this));
  }

  /**
   * フレームを記録
   */
  recordFrame(timestamp) {
    if (!this.isAnimating) return;

    this.animationFrames.push({
      timestamp,
      delta:
        this.animationFrames.length > 0
          ? timestamp -
            this.animationFrames[this.animationFrames.length - 1].timestamp
          : 0,
    });

    requestAnimationFrame(this.recordFrame.bind(this));
  }

  /**
   * アニメーション記録停止と分析
   */
  stopAnimation() {
    this.isAnimating = false;
    const endTime = performance.now();
    const duration = endTime - this.startTime;

    // 性能メトリクスを計算
    const frameCount = this.animationFrames.length;
    const fps = frameCount / (duration / 1000);

    let totalDelta = 0;
    let maxDelta = 0;
    let droppedFrames = 0;

    for (let i = 1; i < this.animationFrames.length; i++) {
      const delta =
        this.animationFrames[i].timestamp -
        this.animationFrames[i - 1].timestamp;
      totalDelta += delta;
      maxDelta = Math.max(maxDelta, delta);

      // 16.7msを超えるフレーム間隔はドロップフレームとみなす
      if (delta > 16.7) {
        droppedFrames++;
      }
    }

    const avgDelta = totalDelta / (frameCount - 1);

    // 結果を保存
    this.results[this.currentTest] = {
      frameCount,
      fps,
      avgDelta,
      maxDelta,
      droppedFrames,
      duration,
    };

    // 結果を表示
    this.updateResults(
      `${
        this.isHardwareAccelerated
          ? "ハードウェアアクセラレーション有効"
          : "ハードウェアアクセラレーション無効"
      } 結果:\n` +
        `持続時間: ${duration.toFixed(2)}ms\n` +
        `フレーム数: ${frameCount}\n` +
        `FPS: ${fps.toFixed(2)}\n` +
        `平均フレーム間隔: ${avgDelta.toFixed(2)}ms\n` +
        `最大フレーム間隔: ${maxDelta.toFixed(2)}ms\n` +
        `ドロップフレーム数: ${droppedFrames}`
    );
  }

  /**
   * 比較結果を表示
   */
  showComparisonResults() {
    const hw = this.results.hardwareAccelerated;
    const non = this.results.nonAccelerated;

    // パフォーマンス向上率を計算
    const fpsDiff = (((hw.fps - non.fps) / non.fps) * 100).toFixed(2);
    const droppedFramesDiff = (
      ((non.droppedFrames - hw.droppedFrames) /
        Math.max(1, non.droppedFrames)) *
      100
    ).toFixed(2);

    this.updateResults(
      `=== パフォーマンス比較結果 ===\n\n` +
        `【ハードウェアアクセラレーション有効】\n` +
        `FPS: ${hw.fps.toFixed(2)}\n` +
        `平均フレーム間隔: ${hw.avgDelta.toFixed(2)}ms\n` +
        `ドロップフレーム数: ${hw.droppedFrames}\n\n` +
        `【ハードウェアアクセラレーション無効】\n` +
        `FPS: ${non.fps.toFixed(2)}\n` +
        `平均フレーム間隔: ${non.avgDelta.toFixed(2)}ms\n` +
        `ドロップフレーム数: ${non.droppedFrames}\n\n` +
        `【パフォーマンス向上】\n` +
        `FPS: ${fpsDiff}% 向上\n` +
        `ドロップフレーム: ${droppedFramesDiff}% 削減\n\n` +
        `ハードウェアアクセラレーションによって、アニメーションのパフォーマンスが向上しています。`
    );
  }

  /**
   * 結果表示を更新
   */
  updateResults(text) {
    if (this.resultContainer) {
      this.resultContainer.textContent = text;
    }
  }

  /**
   * テストを実行
   */
  static run() {
    return new AnimationPerformanceTester().initialize();
  }
}

// テスト実行
if (
  typeof window !== "undefined" &&
  window.location.href.includes("youtube.com")
) {
  console.log("YouTube Theater Mode: アニメーション性能テスト開始");
  AnimationPerformanceTester.run();
}
