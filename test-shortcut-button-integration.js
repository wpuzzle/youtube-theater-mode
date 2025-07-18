/**
 * YouTube Theater Mode - Shortcut Button Integration Test Script
 * キーボードショートカットとボタン状態の連携テストスクリプト
 */

// テスト統計
let testStats = {
  totalOperations: 0,
  successfulOperations: 0,
  failedOperations: 0,
  keyboardEvents: 0,
  buttonEvents: 0,
  unifiedEvents: 0,
  stateChangeEvents: 0,
  consistencyChecks: 0,
  inconsistenciesFound: 0,
  autoCorrections: 0,
  caughtErrors: 0,
  recoverySuccesses: 0,
  responseTimes: [],
};

// 模擬TheaterModeControllerクラス（統合テスト用）
class IntegrationTestController {
  constructor() {
    this.isTheaterModeActive = false;
    this.overlayElement = null;
    this.currentOpacity = 0.7;
    this.eventListeners = new Map();
    this.stateChangeCallbacks = [];
    this.toggleButton = null;

    // 模擬ボタンを初期化
    this.initializeMockButton();

    // キーボードショートカットを設定
    this.setupKeyboardShortcuts();

    // 状態監視を開始
    this.startStateMonitoring();

    console.log("Integration Test Controller initialized");
  }

  // 模擬ボタンの初期化
  initializeMockButton() {
    this.toggleButton = document.getElementById("mock-theater-button");
    if (this.toggleButton) {
      this.toggleButton.addEventListener("click", (event) => {
        this.handleButtonClick();
      });
      this.updateButtonState();
    }
  }

  // シアターモード切り替え
  toggleTheaterMode() {
    if (this.isTheaterModeActive) {
      this.disableTheaterMode();
    } else {
      this.enableTheaterMode();
    }
  }

  // 統一されたシアターモード切り替え処理
  handleTheaterModeToggle(source = "unknown") {
    const startTime = performance.now();

    console.log(`Theater Mode: Toggle triggered by ${source}`);
    this.logEvent(`統一処理開始 (${source})`, "state-event");

    const previousState = this.getState();

    try {
      // シアターモードを切り替え
      this.toggleTheaterMode();

      // 切り替え後の状態を取得
      const currentState = this.getState();

      // 統一された状態変更イベントを発火
      this.dispatchStateChangeEvent("theaterModeToggled", {
        source: source,
        previousState: previousState,
        currentState: currentState,
        timestamp: Date.now(),
      });

      // ボタンとキーボードショートカットの状態同期を確認
      this.validateStateConsistency();

      // 応答時間を記録
      const responseTime = performance.now() - startTime;
      testStats.responseTimes.push(responseTime);
      this.updateTimingStats();

      testStats.unifiedEvents++;
      testStats.successfulOperations++;

      console.log(
        `Theater Mode: Toggle completed by ${source} - ${
          currentState.isActive ? "ON" : "OFF"
        }`
      );
      this.logEvent(
        `統一処理完了 (${source}) - ${currentState.isActive ? "ON" : "OFF"}`,
        "state-event"
      );
    } catch (error) {
      console.error("Error in handleTheaterModeToggle:", error);
      testStats.failedOperations++;
      testStats.caughtErrors++;
      this.logEvent(`統一処理エラー: ${error.message}`, "state-event");

      // エラー回復を試行
      this.attemptErrorRecovery();
    }

    testStats.totalOperations++;
    this.updateTestStats();
  }

  // シアターモード有効化
  enableTheaterMode() {
    if (this.isTheaterModeActive) {
      console.log("Theater Mode: Already active");
      return;
    }

    console.log("Theater Mode: Enabling theater mode");
    this.isTheaterModeActive = true;

    // 模擬オーバーレイを作成
    this.createMockOverlay();

    // ボタンの状態を更新
    this.updateButtonState();

    // 状態変更イベントを発火
    this.dispatchStateChangeEvent("enabled", {
      currentState: this.getState(),
    });
  }

  // シアターモード無効化
  disableTheaterMode() {
    if (!this.isTheaterModeActive) {
      console.log("Theater Mode: Already inactive");
      return;
    }

    console.log("Theater Mode: Disabling theater mode");
    this.isTheaterModeActive = false;

    // 模擬オーバーレイを削除
    this.removeMockOverlay();

    // ボタンの状態を更新
    this.updateButtonState();

    // 状態変更イベントを発火
    this.dispatchStateChangeEvent("disabled", {
      currentState: this.getState(),
    });
  }

  // 模擬オーバーレイの作成
  createMockOverlay() {
    this.overlayElement = { mock: true, active: true };
  }

  // 模擬オーバーレイの削除
  removeMockOverlay() {
    this.overlayElement = null;
  }

  // 状態の一貫性を検証
  validateStateConsistency() {
    testStats.consistencyChecks++;

    const currentState = this.getState();
    let inconsistencyFound = false;

    // ボタンの状態とシアターモードの状態が一致しているかチェック
    if (this.toggleButton) {
      const buttonPressed = this.toggleButton.classList.contains("active");

      if (buttonPressed !== currentState.isActive) {
        console.warn("State inconsistency detected, fixing...");
        this.logEvent("状態不整合を検出、修正中...", "state-event");
        inconsistencyFound = true;
        testStats.inconsistenciesFound++;
        this.updateButtonState();
        testStats.autoCorrections++;
      }
    }

    // オーバーレイの存在とシアターモード状態の一致をチェック
    if (currentState.isActive && !currentState.hasOverlay) {
      console.warn("Theater mode active but overlay missing");
      inconsistencyFound = true;
      testStats.inconsistenciesFound++;
    } else if (!currentState.isActive && currentState.hasOverlay) {
      console.warn("Theater mode inactive but overlay exists");
      inconsistencyFound = true;
      testStats.inconsistenciesFound++;
    }

    // 一貫性チェック結果を更新
    this.updateConsistencyResults(inconsistencyFound);
  }

  // ボタンクリック処理
  handleButtonClick() {
    console.log("Button clicked");
    this.logEvent("ボタンクリック", "button-event");

    try {
      // 統一されたシアターモード切り替え処理を使用
      this.handleTheaterModeToggle("button");

      // ボタンクリックイベントを発火
      this.dispatchStateChangeEvent("buttonClicked", {
        isActive: this.isTheaterModeActive,
        timestamp: Date.now(),
      });

      testStats.buttonEvents++;
    } catch (error) {
      console.error("Error handling button click:", error);
      testStats.caughtErrors++;
      this.logEvent(`ボタンクリックエラー: ${error.message}`, "button-event");
    }
  }

  // キーボードショートカット設定
  setupKeyboardShortcuts() {
    console.log("Setting up keyboard shortcuts for integration test");

    const keyboardHandler = (event) => {
      // Ctrl+Shift+T ショートカットの検出
      if (event.ctrlKey && event.shiftKey && event.key === "T") {
        // 入力フィールドにフォーカスがある場合は無視
        const activeElement = document.activeElement;
        if (
          activeElement &&
          (activeElement.tagName === "INPUT" ||
            activeElement.tagName === "TEXTAREA" ||
            activeElement.contentEditable === "true")
        ) {
          return;
        }

        // イベントの伝播を停止
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        console.log("Keyboard shortcut triggered (Ctrl+Shift+T)");
        this.logEvent(
          "キーボードショートカット (Ctrl+Shift+T)",
          "keyboard-event"
        );

        try {
          // 統一されたシアターモード切り替え処理を使用
          this.handleTheaterModeToggle("keyboard");

          // キーボードショートカット使用イベントを発火
          this.dispatchStateChangeEvent("keyboardShortcutUsed", {
            shortcut: "Ctrl+Shift+T",
            isActive: this.isTheaterModeActive,
            timestamp: Date.now(),
          });

          testStats.keyboardEvents++;
        } catch (error) {
          console.error("Error handling keyboard shortcut:", error);
          testStats.caughtErrors++;
          this.logEvent(
            `キーボードショートカットエラー: ${error.message}`,
            "keyboard-event"
          );
        }
      }
    };

    // キーボードイベントリスナーを追加
    document.addEventListener("keydown", keyboardHandler, true);
    this.addEventListener("keydown", keyboardHandler);
  }

  // ボタンの状態を更新
  updateButtonState() {
    if (!this.toggleButton) return;

    // ボタンの表示状態を更新
    if (this.isTheaterModeActive) {
      this.toggleButton.classList.add("active");
      this.toggleButton.textContent = "シアターモード OFF (模擬ボタン)";
    } else {
      this.toggleButton.classList.remove("active");
      this.toggleButton.textContent = "シアターモード ON (模擬ボタン)";
    }

    // UI表示を更新
    this.updateStateDisplay();
  }

  // 状態表示を更新
  updateStateDisplay() {
    const state = this.getState();

    document.getElementById("theater-mode-state").textContent = state.isActive
      ? "ON"
      : "OFF";
    document.getElementById("button-state").textContent = state.isActive
      ? "active"
      : "inactive";

    // 同期インジケーターを更新
    const syncIndicator = document.getElementById("sync-indicator");
    const buttonState = this.toggleButton
      ? this.toggleButton.classList.contains("active")
      : false;

    if (buttonState === state.isActive) {
      syncIndicator.className = "sync-indicator synced";
      document.getElementById("state-sync-status").textContent = "同期済み";
    } else {
      syncIndicator.className = "sync-indicator out-of-sync";
      document.getElementById("state-sync-status").textContent = "非同期";
    }
  }

  // 現在の状態を取得
  getState() {
    return {
      isActive: this.isTheaterModeActive,
      opacity: this.currentOpacity,
      hasOverlay: this.overlayElement !== null,
      timestamp: Date.now(),
    };
  }

  // 状態変更イベントを発火
  dispatchStateChangeEvent(eventType, eventData = {}) {
    const event = {
      type: eventType,
      timestamp: Date.now(),
      data: eventData,
    };

    console.log(`State change event - ${eventType}`, event);
    testStats.stateChangeEvents++;

    // 登録されたコールバックを実行
    this.stateChangeCallbacks.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        console.error("Error in state change callback:", error);
        testStats.caughtErrors++;
      }
    });
  }

  // イベントリスナーを追加
  addEventListener(eventType, listener) {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType).push(listener);
  }

  // 状態監視を開始
  startStateMonitoring() {
    setInterval(() => {
      this.validateStateConsistency();
      this.updateTestStats();
    }, 1000);
  }

  // エラー回復を試行
  attemptErrorRecovery() {
    try {
      console.log("Attempting error recovery...");
      this.logEvent("エラー回復を試行中...", "state-event");

      // 状態をリセット
      this.updateButtonState();
      this.updateStateDisplay();

      testStats.recoverySuccesses++;
      this.logEvent("エラー回復成功", "state-event");
    } catch (recoveryError) {
      console.error("Error recovery failed:", recoveryError);
      this.logEvent(`エラー回復失敗: ${recoveryError.message}`, "state-event");
    }
  }

  // テスト統計を更新
  updateTestStats() {
    document.getElementById("total-operations").textContent =
      testStats.totalOperations;
    document.getElementById("successful-operations").textContent =
      testStats.successfulOperations;
    document.getElementById("failed-operations").textContent =
      testStats.failedOperations;

    const successRate =
      testStats.totalOperations > 0
        ? Math.round(
            (testStats.successfulOperations / testStats.totalOperations) * 100
          )
        : 0;
    document.getElementById("success-rate").textContent = successRate + "%";

    document.getElementById("keyboard-events").textContent =
      testStats.keyboardEvents;
    document.getElementById("button-events").textContent =
      testStats.buttonEvents;
    document.getElementById("unified-events").textContent =
      testStats.unifiedEvents;
    document.getElementById("state-change-events").textContent =
      testStats.stateChangeEvents;

    document.getElementById("consistency-checks").textContent =
      testStats.consistencyChecks;
    document.getElementById("inconsistencies-found").textContent =
      testStats.inconsistenciesFound;
    document.getElementById("auto-corrections").textContent =
      testStats.autoCorrections;

    document.getElementById("caught-errors").textContent =
      testStats.caughtErrors;
    document.getElementById("recovery-successes").textContent =
      testStats.recoverySuccesses;
  }

  // タイミング統計を更新
  updateTimingStats() {
    if (testStats.responseTimes.length === 0) return;

    const times = testStats.responseTimes;
    const average = times.reduce((a, b) => a + b, 0) / times.length;
    const max = Math.max(...times);
    const min = Math.min(...times);

    document.getElementById("average-response-time").textContent =
      Math.round(average) + "ms";
    document.getElementById("max-response-time").textContent =
      Math.round(max) + "ms";
    document.getElementById("min-response-time").textContent =
      Math.round(min) + "ms";
  }

  // 一貫性チェック結果を更新
  updateConsistencyResults(inconsistencyFound) {
    const resultElement = document.getElementById("consistency-result");

    if (inconsistencyFound) {
      resultElement.className = "test-result test-warning";
      resultElement.textContent =
        "⚠ 状態の不整合が検出されましたが、自動修正されました";
    } else {
      resultElement.className = "test-result test-pass";
      resultElement.textContent = "✓ 状態の一貫性が保たれています";
    }
  }

  // イベントログに追加
  logEvent(message, type = "general") {
    const eventLog = document.getElementById("event-log");
    const timestamp = new Date().toLocaleTimeString();

    const eventEntry = document.createElement("div");
    eventEntry.className = `event-entry ${type}`;
    eventEntry.textContent = `[${timestamp}] ${message}`;

    eventLog.appendChild(eventEntry);
    eventLog.scrollTop = eventLog.scrollHeight;

    // ログが多くなりすぎないように制限
    if (eventLog.children.length > 100) {
      eventLog.removeChild(eventLog.firstChild);
    }
  }
}

// エラーシミュレーション関数
function simulateError() {
  console.log("Simulating error...");

  try {
    // 意図的にエラーを発生させる
    throw new Error("Simulated integration test error");
  } catch (error) {
    console.error("Simulated error caught:", error);
    testController.logEvent(
      `シミュレートエラー: ${error.message}`,
      "state-event"
    );
    testStats.caughtErrors++;
    testController.attemptErrorRecovery();
    testController.updateTestStats();
  }
}

// ログクリア関数
function clearEventLog() {
  const eventLog = document.getElementById("event-log");
  eventLog.innerHTML =
    '<div class="event-entry">ログがクリアされました...</div>';
}

// テストコントローラーのグローバル変数
let testController;

// ページ読み込み完了時にテストを初期化
document.addEventListener("DOMContentLoaded", () => {
  console.log("Shortcut Button Integration test page loaded");

  // メインのテストコントローラーを作成
  testController = new IntegrationTestController();

  // エラーシミュレーションボタンのイベントリスナー
  document
    .getElementById("simulate-error-button")
    .addEventListener("click", simulateError);

  // ログクリアボタンのイベントリスナー
  document
    .getElementById("clear-log-button")
    .addEventListener("click", clearEventLog);

  // 初期状態を表示
  testController.updateStateDisplay();
  testController.updateTestStats();

  // 最後の操作を記録
  document.getElementById("last-operation").textContent = "初期化完了";

  console.log("All integration tests initialized");
});

// グローバルエラーハンドリング
window.addEventListener("error", (event) => {
  console.error("Global test error:", event.error);
  if (testController) {
    testController.logEvent(
      `グローバルエラー: ${event.error.message}`,
      "state-event"
    );
    testStats.caughtErrors++;
    testController.updateTestStats();
  }
});

console.log("Shortcut Button Integration test script loaded");
