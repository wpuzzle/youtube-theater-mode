/**
 * YouTube Theater Mode - Button Placement Test
 * ボタンの配置機能をテストするスクリプト
 */

// テスト用のモック DOM 環境を作成
function createMockYouTubePlayer() {
  const mockPlayer = document.createElement("div");
  mockPlayer.id = "movie_player";
  mockPlayer.className = "html5-video-player";

  const controls = document.createElement("div");
  controls.className = "ytp-chrome-controls";

  const rightControls = document.createElement("div");
  rightControls.className = "ytp-right-controls";

  // 既存のYouTubeボタンを模擬
  const settingsButton = document.createElement("button");
  settingsButton.className = "ytp-button ytp-settings-button";
  settingsButton.textContent = "⚙️";

  const fullscreenButton = document.createElement("button");
  fullscreenButton.className = "ytp-button ytp-fullscreen-button";
  fullscreenButton.textContent = "⛶";

  rightControls.appendChild(settingsButton);
  rightControls.appendChild(fullscreenButton);
  controls.appendChild(rightControls);
  mockPlayer.appendChild(controls);

  return mockPlayer;
}

// テスト用のTheaterModeControllerクラス（簡略版）
class TestTheaterModeController {
  constructor() {
    this.toggleButton = null;
    this.isTheaterModeActive = false;
  }

  createToggleButton() {
    this.toggleButton = document.createElement("button");
    this.toggleButton.className = "ytp-button theater-mode-toggle-button";
    this.toggleButton.setAttribute("title", "シアターモード切り替え");
    this.toggleButton.setAttribute("aria-label", "シアターモード切り替え");
    this.toggleButton.setAttribute("aria-pressed", "false");

    // アイコンを設定
    this.toggleButton.innerHTML = `
      <svg height="100%" version="1.1" viewBox="0 0 24 24" width="100%">
        <path fill="currentColor" d="M19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3M19,19H5V5H19V19Z"/>
        <path fill="currentColor" d="M7,7V17H17V7H7M15,15H9V9H15V15Z"/>
      </svg>
    `;

    return this.toggleButton;
  }

  insertButtonInRightControls(rightControls) {
    const buttonPriority = [
      ".ytp-fullscreen-button",
      ".ytp-size-button",
      ".ytp-settings-button",
      ".ytp-subtitles-button",
      ".ytp-miniplayer-button",
      ".ytp-remote-button",
    ];

    let insertBefore = null;

    const fullscreenButton = rightControls.querySelector(
      ".ytp-fullscreen-button"
    );
    if (fullscreenButton) {
      insertBefore = fullscreenButton;
    } else {
      for (const selector of buttonPriority.slice(1)) {
        const existingButton = rightControls.querySelector(selector);
        if (existingButton) {
          insertBefore = existingButton;
          break;
        }
      }
    }

    if (insertBefore) {
      rightControls.insertBefore(this.toggleButton, insertBefore);
      console.log(`✓ Button inserted before ${insertBefore.className}`);
    } else {
      rightControls.appendChild(this.toggleButton);
      console.log("✓ Button appended to end of right controls");
    }

    this.validateButtonPlacement(rightControls);
  }

  validateButtonPlacement(container) {
    if (!this.toggleButton || !container) {
      console.error("✗ Button or container is missing");
      return false;
    }

    const isInContainer = container.contains(this.toggleButton);
    if (!isInContainer) {
      console.error("✗ Button not properly placed in container");
      return false;
    }

    const buttonIndex = Array.from(container.children).indexOf(
      this.toggleButton
    );
    console.log(`✓ Button placed at index ${buttonIndex} in container`);

    // ボタンの順序をチェック
    const buttons = Array.from(container.children);
    const buttonNames = buttons.map((btn) => {
      if (btn.classList.contains("theater-mode-toggle-button"))
        return "Theater";
      if (btn.classList.contains("ytp-settings-button")) return "Settings";
      if (btn.classList.contains("ytp-fullscreen-button")) return "Fullscreen";
      return "Other";
    });

    console.log(`✓ Button order: ${buttonNames.join(" → ")}`);

    return true;
  }
}

// テスト実行
function runButtonPlacementTests() {
  console.log("=== YouTube Theater Mode - Button Placement Tests ===\n");

  // テスト1: 基本的な配置テスト
  console.log("Test 1: Basic button placement");
  const mockPlayer1 = createMockYouTubePlayer();
  document.body.appendChild(mockPlayer1);

  const controller1 = new TestTheaterModeController();
  controller1.createToggleButton();

  const rightControls1 = mockPlayer1.querySelector(".ytp-right-controls");
  controller1.insertButtonInRightControls(rightControls1);

  console.log("");

  // テスト2: フルスクリーンボタンがない場合
  console.log("Test 2: Placement without fullscreen button");
  const mockPlayer2 = createMockYouTubePlayer();
  const fullscreenBtn = mockPlayer2.querySelector(".ytp-fullscreen-button");
  fullscreenBtn.remove();
  document.body.appendChild(mockPlayer2);

  const controller2 = new TestTheaterModeController();
  controller2.createToggleButton();

  const rightControls2 = mockPlayer2.querySelector(".ytp-right-controls");
  controller2.insertButtonInRightControls(rightControls2);

  console.log("");

  // テスト3: 空のコントロールでの配置
  console.log("Test 3: Placement in empty controls");
  const mockPlayer3 = document.createElement("div");
  const controls3 = document.createElement("div");
  controls3.className = "ytp-chrome-controls";
  const rightControls3 = document.createElement("div");
  rightControls3.className = "ytp-right-controls";
  controls3.appendChild(rightControls3);
  mockPlayer3.appendChild(controls3);
  document.body.appendChild(mockPlayer3);

  const controller3 = new TestTheaterModeController();
  controller3.createToggleButton();
  controller3.insertButtonInRightControls(rightControls3);

  console.log("");

  // テスト4: 複数のボタンがある場合
  console.log("Test 4: Placement with multiple existing buttons");
  const mockPlayer4 = createMockYouTubePlayer();
  const rightControls4 = mockPlayer4.querySelector(".ytp-right-controls");

  // 追加のボタンを作成
  const subtitlesButton = document.createElement("button");
  subtitlesButton.className = "ytp-button ytp-subtitles-button";
  subtitlesButton.textContent = "CC";

  const sizeButton = document.createElement("button");
  sizeButton.className = "ytp-button ytp-size-button";
  sizeButton.textContent = "📺";

  // 設定ボタンの前に挿入
  const settingsButton4 = rightControls4.querySelector(".ytp-settings-button");
  rightControls4.insertBefore(subtitlesButton, settingsButton4);
  rightControls4.insertBefore(sizeButton, settingsButton4);

  document.body.appendChild(mockPlayer4);

  const controller4 = new TestTheaterModeController();
  controller4.createToggleButton();
  controller4.insertButtonInRightControls(rightControls4);

  console.log("");

  // 視覚的な確認用のスタイルを追加
  const style = document.createElement("style");
  style.textContent = `
    body { 
      font-family: Arial, sans-serif; 
      background: #0f0f0f; 
      color: white; 
      padding: 20px; 
    }
    .html5-video-player { 
      margin: 20px 0; 
      border: 1px solid #333; 
      padding: 10px; 
    }
    .ytp-chrome-controls { 
      background: rgba(0,0,0,0.8); 
      padding: 8px; 
      display: flex; 
    }
    .ytp-right-controls { 
      display: flex; 
      margin-left: auto; 
    }
    .ytp-button { 
      background: transparent; 
      border: none; 
      color: white; 
      padding: 8px; 
      margin: 0 2px; 
      cursor: pointer; 
      width: 40px; 
      height: 40px; 
    }
    .ytp-button:hover { 
      background: rgba(255,255,255,0.1); 
    }
    .theater-mode-toggle-button { 
      background: rgba(62, 166, 255, 0.2) !important; 
      border: 1px solid #3ea6ff !important; 
    }
    .theater-mode-toggle-button svg {
      width: 20px;
      height: 20px;
      fill: #3ea6ff;
    }
  `;
  document.head.appendChild(style);

  console.log("=== Tests completed ===");
  console.log("Check the page visually to see button placements");
}

// ページ読み込み後にテストを実行
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", runButtonPlacementTests);
} else {
  runButtonPlacementTests();
}

// エクスポート（テスト環境用）
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    TestTheaterModeController,
    createMockYouTubePlayer,
    runButtonPlacementTests,
  };
}
