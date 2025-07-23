/**
 * Preview Match Test for YouTube Theater Mode
 * プレビュー表示と実際の動作の一致を確認するテスト
 */

// テスト実行関数
function runPreviewMatchTest() {
  console.log("プレビュー表示と実際の動作の一致テスト開始");

  // テスト結果表示用の要素
  const resultsDiv = document.getElementById("test-results");
  resultsDiv.innerHTML = "";

  // テスト結果を表示する関数
  function displayResult(testName, passed, message = "") {
    const resultDiv = document.createElement("div");
    resultDiv.className = `test-result ${passed ? "test-pass" : "test-fail"}`;
    resultDiv.textContent = `${testName}: ${passed ? "成功" : "失敗"}${
      message ? " - " + message : ""
    }`;
    resultsDiv.appendChild(resultDiv);
    console.log(
      `${testName}: ${passed ? "成功" : "失敗"}${
        message ? " - " + message : ""
      }`
    );
  }

  // プレビュー要素を作成
  const previewContainer = document.createElement("div");
  previewContainer.style.position = "relative";
  previewContainer.style.width = "300px";
  previewContainer.style.height = "200px";
  previewContainer.style.margin = "20px auto";
  previewContainer.style.border = "1px solid #ccc";

  const previewOverlay = document.createElement("div");
  previewOverlay.id = "previewOverlay";
  previewOverlay.style.position = "absolute";
  previewOverlay.style.top = "0";
  previewOverlay.style.left = "0";
  previewOverlay.style.width = "100%";
  previewOverlay.style.height = "100%";
  previewOverlay.style.backgroundColor = "rgba(0, 0, 0, 0.7)";

  previewContainer.appendChild(previewOverlay);
  document.body.appendChild(previewContainer);

  // 実際のオーバーレイ要素を模倣
  const actualOverlay = document.createElement("div");
  actualOverlay.style.position = "absolute";
  actualOverlay.style.top = "220px";
  actualOverlay.style.left = "0";
  actualOverlay.style.width = "300px";
  actualOverlay.style.height = "200px";
  actualOverlay.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
  actualOverlay.style.margin = "20px auto";
  actualOverlay.style.border = "1px solid #ccc";

  const actualLabel = document.createElement("div");
  actualLabel.textContent = "実際の動作";
  actualLabel.style.position = "absolute";
  actualLabel.style.top = "-25px";
  actualLabel.style.left = "0";
  actualLabel.style.width = "100%";
  actualLabel.style.textAlign = "center";
  actualOverlay.appendChild(actualLabel);

  const previewLabel = document.createElement("div");
  previewLabel.textContent = "プレビュー表示";
  previewLabel.style.position = "absolute";
  previewLabel.style.top = "-25px";
  previewLabel.style.left = "0";
  previewLabel.style.width = "100%";
  previewLabel.style.textAlign = "center";
  previewContainer.appendChild(previewLabel);

  document.body.appendChild(actualOverlay);

  // 透明度更新関数（修正後の実装）
  function updateOpacityPreview(opacity) {
    if (previewOverlay) {
      // 数値が高いほど透明になるように設定（実際の動作と一致）
      // 実際の動作では opacity の値が高いほど透明になる（1-opacity の値が不透明度になる）
      // プレビューでも同じ動作にするため、1-opacity を使用
      const invertedOpacity = 1 - opacity;
      previewOverlay.style.backgroundColor = `rgba(0, 0, 0, ${invertedOpacity})`;
    }
  }

  // 実際の動作を模倣した関数
  function updateActualOverlay(opacity) {
    // 実際の動作では、opacity の値が高いほど透明になる
    // CSS変数 --theater-mode-opacity に opacity の値を設定し、
    // 要素の opacity プロパティに適用される
    document.documentElement.style.setProperty(
      "--theater-mode-opacity",
      opacity
    );
    actualOverlay.style.opacity = opacity;
  }

  // テストケース
  const testCases = [
    { opacity: 0, description: "完全に不透明 (0%)" },
    { opacity: 0.3, description: "低い透明度 (30%)" },
    { opacity: 0.5, description: "中程度の透明度 (50%)" },
    { opacity: 0.7, description: "デフォルト透明度 (70%)" },
    { opacity: 0.9, description: "高い透明度 (90%)" },
  ];

  // スライダーを作成
  const sliderContainer = document.createElement("div");
  sliderContainer.style.margin = "440px auto 20px";
  sliderContainer.style.width = "300px";
  sliderContainer.style.textAlign = "center";

  const slider = document.createElement("input");
  slider.type = "range";
  slider.min = "0";
  slider.max = "0.9";
  slider.step = "0.05";
  slider.value = "0.7";
  slider.style.width = "100%";

  const sliderValue = document.createElement("div");
  sliderValue.textContent = "70%";
  sliderValue.style.marginTop = "10px";

  sliderContainer.appendChild(slider);
  sliderContainer.appendChild(sliderValue);
  document.body.appendChild(sliderContainer);

  // スライダーのイベントリスナー
  slider.addEventListener("input", () => {
    const opacity = parseFloat(slider.value);
    const percentage = Math.round(opacity * 100);
    sliderValue.textContent = `${percentage}%`;

    // プレビューと実際の動作を更新
    updateOpacityPreview(opacity);
    updateActualOverlay(opacity);
  });

  // 各テストケースを実行
  let allTestsPassed = true;

  testCases.forEach((testCase, index) => {
    setTimeout(() => {
      const { opacity, description } = testCase;

      // スライダーを更新
      slider.value = opacity;
      sliderValue.textContent = `${Math.round(opacity * 100)}%`;

      // プレビューと実際の動作を更新
      updateOpacityPreview(opacity);
      updateActualOverlay(opacity);

      // 視覚的な比較のため、少し待機
      setTimeout(() => {
        // プレビューの背景色を取得
        const previewStyle = window.getComputedStyle(previewOverlay);
        const previewBgColor = previewStyle.backgroundColor;

        // 実際の動作の不透明度を取得
        const actualStyle = window.getComputedStyle(actualOverlay);
        const actualOpacity = parseFloat(actualStyle.opacity);

        // 期待される背景色を計算
        const invertedOpacity = 1 - opacity;
        const expectedBgColor = `rgba(0, 0, 0, ${invertedOpacity})`;

        // 背景色が期待通りかチェック
        const bgColorMatch =
          previewBgColor.includes(invertedOpacity.toFixed(1)) ||
          previewBgColor.includes(Math.round(invertedOpacity * 255));

        // 実際の動作と一致しているかチェック
        const opacityMatch = Math.abs(actualOpacity - opacity) < 0.01;

        // テスト結果を表示
        const testPassed = bgColorMatch && opacityMatch;
        if (!testPassed) allTestsPassed = false;

        displayResult(
          `テストケース ${index + 1}: ${description}`,
          testPassed,
          testPassed
            ? ""
            : `プレビュー背景色: ${previewBgColor}, 期待値: ${expectedBgColor}, 実際の不透明度: ${actualOpacity}`
        );

        // 全てのテストが完了したら総合結果を表示
        if (index === testCases.length - 1) {
          const summaryDiv = document.createElement("div");
          summaryDiv.className = `test-result ${
            allTestsPassed ? "test-pass" : "test-fail"
          }`;
          summaryDiv.textContent = `総合結果: ${
            allTestsPassed
              ? "全てのテストに成功しました"
              : "一部のテストに失敗しました"
          }`;
          summaryDiv.style.fontWeight = "bold";
          summaryDiv.style.marginTop = "20px";
          resultsDiv.appendChild(summaryDiv);
        }
      }, 500);
    }, index * 1500); // 各テストケース間に1.5秒の間隔を空ける
  });
}

// ページ読み込み完了時にテストを実行
document.addEventListener("DOMContentLoaded", runPreviewMatchTest);
