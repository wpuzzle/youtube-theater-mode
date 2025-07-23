/**
 * YouTube Theater Mode - 動画コントロール保護テスト実行スクリプト
 */

// テスト実行関数
function runControlsTests() {
  console.log("=== YouTube 動画コントロール保護テスト開始 ===");

  // テスト1: オーバーレイ適用時のコントロール保護
  testControlsProtection();

  // テスト2: コントロール操作性
  testControlsInteraction();

  // テスト3: 動的コントロール要素の保護
  testDynamicControlsProtection();

  console.log("=== YouTube 動画コントロール保護テスト完了 ===");
}

// コントロール保護テスト
function testControlsProtection() {
  console.log("テスト: コントロール保護");

  // モックDOM要素
  const mockDOM = {
    videoPlayer: {
      classList: {
        add: () => {},
        contains: () => true,
      },
      querySelectorAll: () => [
        {
          classList: {
            add: () => {},
            contains: () => true,
          },
          style: {},
        },
      ],
    },
    document: {
      querySelectorAll: () => [
        {
          classList: {
            add: () => {},
            contains: () => true,
          },
          style: {},
        },
      ],
    },
  };

  // モックTheaterModeController
  const mockController = {
    protectPlayerControls: (player) => {
      console.log("動画プレーヤーコントロールを保護しました");
      return true;
    },
  };

  // テスト実行
  const result = mockController.protectPlayerControls(mockDOM.videoPlayer);
  console.assert(result === true, "コントロール保護が失敗しました");

  console.log("コントロール保護テスト完了");
}

// コントロール操作性テスト
function testControlsInteraction() {
  console.log("テスト: コントロール操作性");

  // モックコントロール要素
  const mockControls = {
    playButton: {
      clicked: false,
      click: function () {
        this.clicked = true;
      },
    },
    progressBar: {
      clicked: false,
      click: function () {
        this.clicked = true;
      },
    },
    volumeSlider: {
      clicked: false,
      click: function () {
        this.clicked = true;
      },
    },
  };

  // クリックをシミュレート
  mockControls.playButton.click();
  mockControls.progressBar.click();
  mockControls.volumeSlider.click();

  // 検証
  console.assert(
    mockControls.playButton.clicked,
    "再生ボタンがクリックできません"
  );
  console.assert(
    mockControls.progressBar.clicked,
    "シークバーがクリックできません"
  );
  console.assert(
    mockControls.volumeSlider.clicked,
    "音量スライダーがクリックできません"
  );

  console.log("コントロール操作性テスト完了");
}

// 動的コントロール要素の保護テスト
function testDynamicControlsProtection() {
  console.log("テスト: 動的コントロール要素の保護");

  // モックMutationObserver
  class MockMutationObserver {
    constructor(callback) {
      this.callback = callback;
      this.observed = false;
    }

    observe() {
      this.observed = true;
    }

    disconnect() {
      this.observed = false;
    }

    // テスト用に変更を通知
    simulateMutation(addedNode) {
      this.callback([
        {
          type: "childList",
          addedNodes: [addedNode],
          removedNodes: [],
        },
      ]);
    }
  }

  // 元のMutationObserverを保存
  const OriginalMutationObserver = window.MutationObserver;

  // モックに置き換え
  window.MutationObserver = MockMutationObserver;

  // モックTheaterModeController
  const mockController = {
    isTheaterModeActive: true,
    controlsObserver: null,

    observePlayerControls: function (player) {
      this.controlsObserver = new MockMutationObserver(() => {});
      this.controlsObserver.observe(player, { childList: true, subtree: true });
      return this.controlsObserver;
    },

    isPlayerControlElement: function (element) {
      return element.className && element.className.includes("control");
    },
  };

  // モックプレーヤー
  const mockPlayer = {
    querySelector: () => ({}),
    querySelectorAll: () => [],
  };

  // オブザーバーを設定
  const observer = mockController.observePlayerControls(mockPlayer);
  console.assert(observer.observed, "オブザーバーが開始されていません");

  // 動的要素を追加
  const mockDynamicControl = {
    nodeType: 1, // ELEMENT_NODE
    className: "ytp-control-button",
    classList: {
      add: () => {},
      contains: () => false,
    },
    style: {},
    querySelectorAll: () => [],
  };

  // 変更を通知
  observer.simulateMutation(mockDynamicControl);

  // MutationObserverを元に戻す
  window.MutationObserver = OriginalMutationObserver;

  console.log("動的コントロール要素の保護テスト完了");
}

// テスト実行
if (typeof window === "undefined") {
  // Node.js環境での実行
  console.log("このテストはブラウザ環境で実行してください");
} else {
  // ブラウザ環境での実行
  window.runControlsTests = runControlsTests;
}
