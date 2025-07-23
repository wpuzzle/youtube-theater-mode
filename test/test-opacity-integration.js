/**
 * YouTube Theater Mode - Opacity Integration Test
 * 透明度設定機能の統合テスト
 */

// テスト用のコントローラーとポップアップの統合をシミュレート
class OpacityIntegrationTest {
  constructor() {
    this.controller = null;
    this.popupSimulator = null;
    this.testResults = [];
  }

  // テスト結果を表示
  displayResult(testName, passed, message = "", details = null) {
    const result = {
      name: testName,
      passed: passed,
      message: message,
      details: details,
      timestamp: new Date().toLocaleTimeString(),
    };

    this.testResults.push(result);

    const resultsDiv = document.getElementById("test-results");
    const resultDiv = document.createElement("div");
    resultDiv.className = `test-result ${passed ? "test-pass" : "test-fail"}`;

    let content = `[${result.timestamp}] ${testName}: ${
      passed ? "PASS" : "FAIL"
    }`;
    if (message) {
      content += ` - ${message}`;
    }
    if (details) {
      content += `\n詳細: ${JSON.stringify(details, null, 2)}`;
    }

    resultDiv.textContent = content;
    resultsDiv.appendChild(resultDiv);

    console.log(`Test: ${testName} - ${passed ? "PASS" : "FAIL"}`, {
      message,
      details,
    });
  }

  // テスト環境のセットアップ
  async setup() {
    // モックのストレージを設定
    window.chrome = {
      storage: {
        sync: {
          data: {},
          get: function (keys) {
            return new Promise((resolve) => {
              const result = {};
              if (Array.isArray(keys)) {
                keys.forEach((key) => {
                  if (this.data[key] !== undefined) {
                    result[key] = this.data[key];
                  }
                });
              } else if (typeof keys === "object") {
                Object.keys(keys).forEach((key) => {
                  result[key] =
                    this.data[key] !== undefined ? this.data[key] : keys[key];
                });
              } else {
                Object.assign(result, this.data);
              }
              resolve(result);
            });
          },
          set: function (items) {
            return new Promise((resolve) => {
              Object.assign(this.data, items);
              resolve();
            });
          },
        },
        onChanged: {
          listeners: [],
          addListener: function (callback) {
            this.listeners.push(callback);
          },
          removeListener: function (callback) {
            const index = this.listeners.indexOf(callback);
            if (index > -1) {
              this.listeners.splice(index, 1);
            }
          },
          dispatch: function (changes, namespace) {
            this.listeners.forEach((listener) => {
              listener(changes, namespace);
            });
          },
        },
      },
      runtime: {
        onMessage: {
          listeners: [],
          addListener: function (callback) {
            this.listeners.push(callback);
          },
          removeListener: function (callback) {
            const index = this.listeners.indexOf(callback);
            if (index > -1) {
              this.listeners.splice(index, 1);
            }
          },
        },
        sendMessage: function (message, callback) {
          this.onMessage.listeners.forEach((listener) => {
            listener(message, { id: "test-sender" }, callback || (() => {}));
          });
        },
      },
      tabs: {
        query: function (queryInfo, callback) {
          callback([{ id: 1, url: "https://www.youtube.com/watch?v=test" }]);
        },
        sendMessage: function (tabId, message, callback) {
          chrome.runtime.sendMessage(message, callback);
        },
      },
    };

    // コントローラーとポップアップシミュレーターを初期化
    this.controller = new TheaterModeController();
    this.popupSimulator = new PopupSimulator();

    // 初期化を待つ
    await new Promise((resolve) => setTimeout(resolve, 100));

    return true;
  }

  // ポップアップからの透明度変更テスト
  async testOpacityChangeFromPopup() {
    // 初期透明度を確認
    const initialOpacity = this.controller.currentOpacity;

    // ポップアップから透明度を変更
    const newOpacity = 0.5;
    const result = await this.popupSimulator.changeOpacity(newOpacity);

    // コントローラーの透明度が更新されたか確認
    const updatedOpacity = this.controller.currentOpacity;

    if (Math.abs(updatedOpacity - newOpacity) > 0.001) {
      this.displayResult(
        "ポップアップからの透明度変更テスト",
        false,
        `透明度が正しく更新されていません: ${updatedOpacity} (期待値: ${newOpacity})`,
        { initialOpacity, result }
      );
      return false;
    }

    // オーバーレイに反映されているか確認
    if (this.controller.isTheaterModeActive) {
      const overlayStyle = window.getComputedStyle(
        this.controller.overlayElement
      );
      const bgColor = overlayStyle.backgroundColor;

      if (!bgColor.includes(`0.5`) && !bgColor.includes(`0.5`)) {
        this.displayResult(
          "ポップアップからの透明度変更テスト",
          false,
          `オーバーレイの透明度が反映されていません: ${bgColor}`,
          { initialOpacity, updatedOpacity, result }
        );
        return false;
      }
    }

    this.displayResult(
      "ポップアップからの透明度変更テスト",
      true,
      `透明度が ${initialOpacity * 100}% から ${
        newOpacity * 100
      }% に正しく更新されました`
    );
    return true;
  }

  // デフォルト透明度設定テスト
  async testDefaultOpacityReset() {
    // 初期状態を非デフォルト値に設定
    await this.controller.updateOpacity(0.4);
    const initialOpacity = this.controller.currentOpacity;

    // デフォルト透明度にリセット
    const result = await this.popupSimulator.resetToDefaultOpacity();

    // 透明度が70%にリセットされたか確認
    const updatedOpacity = this.controller.currentOpacity;

    if (Math.abs(updatedOpacity - 0.7) > 0.001) {
      this.displayResult(
        "デフォルト透明度リセットテスト",
        false,
        `透明度がデフォルト値にリセットされていません: ${updatedOpacity} (期待値: 0.7)`,
        { initialOpacity, result }
      );
      return false;
    }

    this.displayResult(
      "デフォルト透明度リセットテスト",
      true,
      `透明度が ${
        initialOpacity * 100
      }% からデフォルト値 70% に正しくリセットされました`
    );
    return true;
  }

  // 透明度の即時反映テスト
  async testImmediateOpacityReflection() {
    // シアターモードを有効化
    if (!this.controller.isTheaterModeActive) {
      await this.controller.enableTheaterMode();
    }

    // 初期透明度を設定
    await this.controller.updateOpacity(0.3);

    // オーバーレイ要素の取得
    const overlay = this.controller.overlayElement;
    if (!overlay) {
      this.displayResult(
        "透明度即時反映テスト",
        false,
        "オーバーレイ要素が存在しません"
      );
      return false;
    }

    // 初期スタイルを確認
    const initialStyle = window.getComputedStyle(overlay);
    const initialBgColor = initialStyle.backgroundColor;

    // 透明度を変更
    const newOpacity = 0.8;
    await this.controller.updateOpacity(newOpacity);

    // スタイルが即座に反映されているか確認
    const updatedStyle = window.getComputedStyle(overlay);
    const updatedBgColor = updatedStyle.backgroundColor;

    if (initialBgColor === updatedBgColor) {
      this.displayResult(
        "透明度即時反映テスト",
        false,
        "オーバーレイのスタイルが更新されていません",
        { initialBgColor, updatedBgColor }
      );
      return false;
    }

    this.displayResult(
      "透明度即時反映テスト",
      true,
      "透明度変更が即座にオーバーレイに反映されました"
    );
    return true;
  }

  // 透明度設定の永続化テスト
  async testOpacityPersistence() {
    // 透明度を設定
    const testOpacity = 0.6;
    await this.controller.updateOpacity(testOpacity);

    // コントローラーを再作成して設定が読み込まれるか確認
    const newController = new TheaterModeController();

    // 設定読み込みを待つ
    await new Promise((resolve) => setTimeout(resolve, 100));

    const loadedOpacity = newController.currentOpacity;
    if (Math.abs(loadedOpacity - testOpacity) > 0.001) {
      this.displayResult(
        "透明度永続化テスト",
        false,
        `透明度が永続化されていません: ${loadedOpacity} (期待値: ${testOpacity})`
      );
      return false;
    }

    this.displayResult(
      "透明度永続化テスト",
      true,
      "透明度設定が正しく永続化されました"
    );
    return true;
  }

  // 全テスト実行
  async runAllTests() {
    console.log("Opacity Integration Tests - Starting all tests...");

    await this.setup();

    const tests = [
      "testOpacityChangeFromPopup",
      "testDefaultOpacityReset",
      "testImmediateOpacityReflection",
      "testOpacityPersistence",
    ];

    let passedTests = 0;
    let totalTests = tests.length;

    for (const testName of tests) {
      try {
        const result = await this[testName]();
        if (result) {
          passedTests++;
        }
      } catch (error) {
        this.displayResult(
          testName,
          false,
          `テスト実行エラー: ${error.message}`
        );
      }
    }

    // 結果サマリー
    const summaryDiv = document.createElement("div");
    summaryDiv.className = `test-result ${
      passedTests === totalTests ? "test-pass" : "test-info"
    }`;
    summaryDiv.textContent = `テスト完了: ${passedTests}/${totalTests} 成功`;

    const resultsDiv = document.getElementById("test-results");
    resultsDiv.appendChild(summaryDiv);

    console.log(
      `Opacity Integration Tests - Completed: ${passedTests}/${totalTests} passed`
    );
  }
}

// ポップアップUIシミュレーター
class PopupSimulator {
  constructor() {
    this.opacityValue = 0.7;
  }

  // 透明度変更をシミュレート
  async changeOpacity(opacity) {
    this.opacityValue = opacity;

    return new Promise((resolve) => {
      // ポップアップからのメッセージ送信をシミュレート
      chrome.runtime.sendMessage(
        { action: "updateOpacity", opacity: opacity },
        (response) => {
          resolve(response);
        }
      );
    });
  }

  // デフォルト透明度へのリセットをシミュレート
  async resetToDefaultOpacity() {
    this.opacityValue = 0.7;

    return new Promise((resolve) => {
      // ポップアップからのメッセージ送信をシミュレート
      chrome.runtime.sendMessage(
        { action: "setDefaultOpacity" },
        (response) => {
          resolve(response);
        }
      );
    });
  }
}

// シアターモードコントローラーのモック（テスト用）
class TheaterModeController {
  constructor() {
    this.isTheaterModeActive = false;
    this.overlayElement = null;
    this.currentOpacity = 0.7;
    this.stateChangeCallbacks = [];

    // オーバーレイ要素を作成
    this.createOverlayElement();

    // 設定を読み込み
    this.loadSettings();

    // メッセージリスナーを設定
    this.setupMessageListener();
  }

  // オーバーレイ要素を作成
  createOverlayElement() {
    this.overlayElement = document.createElement("div");
    this.overlayElement.className = "theater-mode-overlay";
    this.overlayElement.style.position = "fixed";
    this.overlayElement.style.top = "0";
    this.overlayElement.style.left = "0";
    this.overlayElement.style.width = "100%";
    this.overlayElement.style.height = "100%";
    this.overlayElement.style.backgroundColor = `rgba(0, 0, 0, ${this.currentOpacity})`;
    this.overlayElement.style.zIndex = "9998";
    this.overlayElement.style.pointerEvents = "none";
    this.overlayElement.style.transition = "opacity 0.3s ease";

    // テスト用に非表示にしておく
    this.overlayElement.style.display = "none";
  }

  // 設定を読み込み
  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get({
        theaterModeSettings: { opacity: 0.7, isEnabled: false },
      });

      if (result.theaterModeSettings) {
        this.currentOpacity = result.theaterModeSettings.opacity;

        // オーバーレイが存在する場合は透明度を更新
        if (this.overlayElement) {
          this.overlayElement.style.backgroundColor = `rgba(0, 0, 0, ${this.currentOpacity})`;
        }
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  }

  // メッセージリスナーを設定
  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.action) {
        case "updateOpacity":
          this.updateOpacity(message.opacity)
            .then(() => {
              sendResponse({
                success: true,
                opacity: this.currentOpacity,
              });
            })
            .catch((error) => {
              sendResponse({
                success: false,
                error: error.message,
              });
            });
          return true;

        case "setDefaultOpacity":
          this.setDefaultOpacity()
            .then(() => {
              sendResponse({
                success: true,
                opacity: this.currentOpacity,
              });
            })
            .catch((error) => {
              sendResponse({
                success: false,
                error: error.message,
              });
            });
          return true;

        case "toggleTheaterMode":
          this.toggleTheaterMode();
          sendResponse({
            success: true,
            enabled: this.isTheaterModeActive,
          });
          break;
      }
    });
  }

  // シアターモード切り替え
  toggleTheaterMode() {
    if (this.isTheaterModeActive) {
      this.disableTheaterMode();
    } else {
      this.enableTheaterMode();
    }
  }

  // シアターモード有効化
  enableTheaterMode() {
    this.isTheaterModeActive = true;

    // オーバーレイを表示
    if (this.overlayElement) {
      this.overlayElement.style.display = "block";

      // まだDOMに追加されていない場合は追加
      if (!this.overlayElement.parentNode) {
        document.body.appendChild(this.overlayElement);
      }
    }

    // 状態変更イベントを発火
    this.dispatchStateChangeEvent("enabled");
  }

  // シアターモード無効化
  disableTheaterMode() {
    this.isTheaterModeActive = false;

    // オーバーレイを非表示
    if (this.overlayElement) {
      this.overlayElement.style.display = "none";
    }

    // 状態変更イベントを発火
    this.dispatchStateChangeEvent("disabled");
  }

  // 透明度更新
  async updateOpacity(opacity) {
    const previousOpacity = this.currentOpacity;

    // 透明度を0-90%に制限
    this.currentOpacity = Math.max(0, Math.min(0.9, opacity));

    // 数値型に変換（文字列が渡された場合の対応）
    if (typeof this.currentOpacity !== "number" || isNaN(this.currentOpacity)) {
      console.warn("Invalid opacity value, using default");
      this.currentOpacity = 0.7; // デフォルト値を使用
    }

    // オーバーレイが存在する場合は即座に反映
    if (this.overlayElement) {
      this.overlayElement.style.backgroundColor = `rgba(0, 0, 0, ${this.currentOpacity})`;
    }

    // 設定を保存
    try {
      await this.saveSettings();
    } catch (error) {
      console.error("Error saving opacity setting:", error);
      throw error;
    }

    // 透明度変更イベントを発火
    this.dispatchStateChangeEvent("opacityChanged", {
      previousOpacity,
      currentOpacity: this.currentOpacity,
    });

    return true;
  }

  // デフォルト透明度（70%）の設定
  async setDefaultOpacity() {
    try {
      const result = await this.updateOpacity(0.7);

      if (result) {
        // デフォルト透明度設定イベントを発火
        this.dispatchStateChangeEvent("defaultOpacitySet", {
          opacity: this.currentOpacity,
        });
      }

      return result;
    } catch (error) {
      console.error("Error setting default opacity:", error);
      return false;
    }
  }

  // 設定を保存
  async saveSettings() {
    try {
      await chrome.storage.sync.set({
        theaterModeSettings: {
          opacity: this.currentOpacity,
          isEnabled: this.isTheaterModeActive,
          lastUsed: Date.now(),
        },
      });
      return true;
    } catch (error) {
      console.error("Error saving settings:", error);
      return false;
    }
  }

  // 状態変更イベントを発火
  dispatchStateChangeEvent(eventType, eventData = {}) {
    const event = {
      type: eventType,
      timestamp: Date.now(),
      data: eventData,
    };

    // 登録されたコールバックを実行
    this.stateChangeCallbacks.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        console.error("Error in state change callback:", error);
      }
    });
  }

  // 状態変更コールバックを登録
  onStateChange(callback) {
    if (typeof callback !== "function") {
      throw new Error("Callback must be a function");
    }

    this.stateChangeCallbacks.push(callback);

    // コールバック削除用の関数を返す
    return () => {
      const index = this.stateChangeCallbacks.indexOf(callback);
      if (index > -1) {
        this.stateChangeCallbacks.splice(index, 1);
      }
    };
  }
}

// グローバル変数
let integrationTest;

// テスト実行関数
function runAllTests() {
  clearResults();
  integrationTest = new OpacityIntegrationTest();
  integrationTest.runAllTests();
}

// 結果クリア関数
function clearResults() {
  document.getElementById("test-results").innerHTML = "";
}

// 個別テスト実行関数
async function runSingleTest(testName) {
  if (!integrationTest) {
    integrationTest = new OpacityIntegrationTest();
    await integrationTest.setup();
  }

  if (typeof integrationTest[testName] === "function") {
    await integrationTest[testName]();
  } else {
    console.error(`Test ${testName} not found`);
  }
}

// ページ読み込み時の初期化
document.addEventListener("DOMContentLoaded", () => {
  // テスト環境の準備
  integrationTest = new OpacityIntegrationTest();
});
