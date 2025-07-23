/**
 * YouTube Theater Mode - 統合テスト
 * 全ての機能が連携して正常動作することを確認するテスト
 */

class IntegrationTester {
  constructor() {
    this.testResults = [];
    this.resultContainer = null;
    this.testCases = [];
    this.currentTestIndex = 0;
    this.isRunning = false;
    this.theaterModeController = null;
    this.settingsManager = null;
  }

  /**
   * テスト環境を初期化
   */
  initialize() {
    console.log("YouTube Theater Mode: 統合テスト初期化");

    // テスト結果表示用の要素を作成
    this.createResultContainer();

    // テストケースを定義
    this.defineTestCases();

    // イベントリスナーを設定
    this.setupEventListeners();

    return this;
  }

  /**
   * テスト結果表示用のコンテナを作成
   */
  createResultContainer() {
    // コンテナ要素
    const container = document.createElement("div");
    container.className = "integration-test-container";
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 400px;
      max-height: 80vh;
      overflow-y: auto;
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
    header.textContent = "YouTube シアターモード 統合テスト";
    header.style.cssText = `
      margin: 0 0 10px 0;
      font-size: 16px;
      text-align: center;
    `;
    container.appendChild(header);

    // テスト結果表示エリア
    this.resultContainer = document.createElement("div");
    this.resultContainer.className = "test-results";
    this.resultContainer.style.cssText = `
      font-family: monospace;
      font-size: 12px;
      background: rgba(0, 0, 0, 0.3);
      padding: 10px;
      border-radius: 3px;
      max-height: 300px;
      overflow-y: auto;
      white-space: pre-wrap;
      margin-bottom: 10px;
    `;
    this.resultContainer.textContent = "テスト結果がここに表示されます...";
    container.appendChild(this.resultContainer);

    // コントロールボタン
    const controls = document.createElement("div");
    controls.style.cssText = `
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
    `;

    const runButton = document.createElement("button");
    runButton.textContent = "すべてのテストを実行";
    runButton.id = "run-all-tests";
    runButton.style.cssText = `
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
    controls.appendChild(runButton);

    const nextButton = document.createElement("button");
    nextButton.textContent = "次のテストを実行";
    nextButton.id = "run-next-test";
    nextButton.style.cssText = `
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
    controls.appendChild(nextButton);

    container.appendChild(controls);

    // 進行状況表示
    const progressContainer = document.createElement("div");
    progressContainer.id = "test-progress";
    progressContainer.style.cssText = `
      margin-top: 10px;
      font-size: 12px;
      text-align: center;
    `;
    progressContainer.textContent = "0/0 テスト完了";
    container.appendChild(progressContainer);

    // 閉じるボタン
    const closeButton = document.createElement("button");
    closeButton.textContent = "閉じる";
    closeButton.id = "close-integration-test";
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
   * テストケースを定義
   */
  defineTestCases() {
    this.testCases = [
      {
        name: "YouTube動画ページ検出",
        run: async () => {
          const isVideoPage = ElementDetector.isYouTubeVideoPage();
          return {
            success: isVideoPage,
            message: isVideoPage
              ? "YouTube動画ページを正しく検出しました"
              : "YouTube動画ページの検出に失敗しました",
          };
        },
      },
      {
        name: "動画プレーヤー検出",
        run: async () => {
          const player = await ElementDetector.detectVideoPlayerAsync();
          return {
            success: !!player,
            message: player
              ? "動画プレーヤーを正しく検出しました"
              : "動画プレーヤーの検出に失敗しました",
          };
        },
      },
      {
        name: "オーバーレイ対象要素検出",
        run: async () => {
          const targets = ElementDetector.findOverlayTargets();
          return {
            success: targets.length > 0,
            message:
              targets.length > 0
                ? `${targets.length}個のオーバーレイ対象要素を検出しました`
                : "オーバーレイ対象要素の検出に失敗しました",
          };
        },
      },
      {
        name: "設定の読み込み",
        run: async () => {
          if (!this.settingsManager) {
            this.settingsManager = new SettingsManager();
          }
          const settings = await this.settingsManager.loadSettings();
          return {
            success: !!settings,
            message: settings
              ? "設定を正常に読み込みました"
              : "設定の読み込みに失敗しました",
          };
        },
      },
      {
        name: "シアターモードコントローラー初期化",
        run: async () => {
          try {
            if (!window.theaterModeController) {
              // グローバルコントローラーがなければ作成
              window.theaterModeController = new TheaterModeController();
              await window.theaterModeController.initialize();
            }
            this.theaterModeController = window.theaterModeController;
            return {
              success: !!this.theaterModeController,
              message: "シアターモードコントローラーを正常に初期化しました",
            };
          } catch (error) {
            return {
              success: false,
              message: `シアターモードコントローラーの初期化に失敗しました: ${error.message}`,
            };
          }
        },
      },
      {
        name: "シアターモード有効化",
        run: async () => {
          if (!this.theaterModeController) {
            return {
              success: false,
              message: "シアターモードコントローラーが初期化されていません",
            };
          }

          try {
            await this.theaterModeController.enableTheaterMode();
            const isEnabled = this.theaterModeController.isTheaterModeEnabled();

            // オーバーレイ要素の存在を確認
            const overlay = document.querySelector(".theater-mode-overlay");

            return {
              success: isEnabled && !!overlay,
              message:
                isEnabled && !!overlay
                  ? "シアターモードを正常に有効化しました"
                  : "シアターモードの有効化に失敗しました",
            };
          } catch (error) {
            return {
              success: false,
              message: `シアターモードの有効化中にエラーが発生しました: ${error.message}`,
            };
          }
        },
      },
      {
        name: "動画プレーヤー保護",
        run: async () => {
          if (
            !this.theaterModeController ||
            !this.theaterModeController.isTheaterModeEnabled()
          ) {
            return {
              success: false,
              message: "シアターモードが有効になっていません",
            };
          }

          // 動画プレーヤーを検出
          const player = ElementDetector.findVideoPlayer();
          if (!player) {
            return {
              success: false,
              message: "動画プレーヤーが見つかりません",
            };
          }

          // プレーヤーにオーバーレイが適用されていないことを確認
          const playerHasOverlay =
            player.classList.contains("theater-mode-overlay") ||
            player.querySelector(".theater-mode-overlay");

          // プレーヤーの可視性を確認
          const isPlayerVisible = ElementDetector.isElementVisible(player);

          return {
            success: !playerHasOverlay && isPlayerVisible,
            message:
              !playerHasOverlay && isPlayerVisible
                ? "動画プレーヤーが正しく保護されています"
                : "動画プレーヤーの保護に問題があります",
          };
        },
      },
      {
        name: "透明度設定",
        run: async () => {
          if (
            !this.theaterModeController ||
            !this.theaterModeController.isTheaterModeEnabled()
          ) {
            return {
              success: false,
              message: "シアターモードが有効になっていません",
            };
          }

          try {
            // テスト用の透明度を設定
            const testOpacity = 0.5;
            await this.theaterModeController.updateOpacity(testOpacity);

            // オーバーレイ要素を取得
            const overlay = document.querySelector(".theater-mode-overlay");
            if (!overlay) {
              return {
                success: false,
                message: "オーバーレイ要素が見つかりません",
              };
            }

            // 透明度が正しく設定されているか確認
            const computedStyle = window.getComputedStyle(overlay);
            const currentOpacity = parseFloat(computedStyle.opacity);

            // 小数点の誤差を考慮して比較
            const isOpacityCorrect =
              Math.abs(currentOpacity - testOpacity) < 0.05;

            return {
              success: isOpacityCorrect,
              message: isOpacityCorrect
                ? `透明度が正しく設定されました (${currentOpacity})`
                : `透明度の設定に問題があります (期待値: ${testOpacity}, 実際: ${currentOpacity})`,
            };
          } catch (error) {
            return {
              success: false,
              message: `透明度設定中にエラーが発生しました: ${error.message}`,
            };
          }
        },
      },
      {
        name: "シアターモード無効化",
        run: async () => {
          if (!this.theaterModeController) {
            return {
              success: false,
              message: "シアターモードコントローラーが初期化されていません",
            };
          }

          try {
            await this.theaterModeController.disableTheaterMode();
            const isDisabled =
              !this.theaterModeController.isTheaterModeEnabled();

            // オーバーレイ要素が削除されたことを確認
            const overlay = document.querySelector(".theater-mode-overlay");

            return {
              success: isDisabled && !overlay,
              message:
                isDisabled && !overlay
                  ? "シアターモードを正常に無効化しました"
                  : "シアターモードの無効化に失敗しました",
            };
          } catch (error) {
            return {
              success: false,
              message: `シアターモードの無効化中にエラーが発生しました: ${error.message}`,
            };
          }
        },
      },
      {
        name: "キーボードショートカット",
        run: async () => {
          if (!this.theaterModeController) {
            return {
              success: false,
              message: "シアターモードコントローラーが初期化されていません",
            };
          }

          try {
            // 現在の状態を記録
            const initialState =
              this.theaterModeController.isTheaterModeEnabled();

            // キーボードショートカットイベントをシミュレート (Ctrl+Shift+T)
            const event = new KeyboardEvent("keydown", {
              key: "T",
              code: "KeyT",
              ctrlKey: true,
              shiftKey: true,
              bubbles: true,
            });
            document.dispatchEvent(event);

            // 少し待機して状態変化を確認
            await new Promise((resolve) => setTimeout(resolve, 100));

            // 状態が反転したことを確認
            const newState = this.theaterModeController.isTheaterModeEnabled();
            const stateChanged = newState !== initialState;

            // 元の状態に戻す
            if (stateChanged) {
              document.dispatchEvent(event);
            }

            return {
              success: stateChanged,
              message: stateChanged
                ? "キーボードショートカットが正常に動作しました"
                : "キーボードショートカットの動作に問題があります",
            };
          } catch (error) {
            return {
              success: false,
              message: `キーボードショートカットのテスト中にエラーが発生しました: ${error.message}`,
            };
          }
        },
      },
      {
        name: "設定の保存",
        run: async () => {
          if (!this.settingsManager) {
            this.settingsManager = new SettingsManager();
          }

          try {
            // テスト用の設定を作成
            const testSettings = {
              opacity: 0.6,
              isEnabled: false,
              shortcutKey: "Ctrl+Shift+T",
              lastUsed: Date.now(),
              version: "1.0.0",
            };

            // 設定を保存
            const saveResult = await this.settingsManager.saveSettings(
              testSettings
            );

            // 設定を再読み込み
            const loadedSettings = await this.settingsManager.loadSettings();

            // 保存した設定と読み込んだ設定を比較
            const opacityMatches =
              Math.abs(loadedSettings.opacity - testSettings.opacity) < 0.01;
            const enabledMatches =
              loadedSettings.isEnabled === testSettings.isEnabled;
            const shortcutMatches =
              loadedSettings.shortcutKey === testSettings.shortcutKey;

            const allMatches =
              opacityMatches && enabledMatches && shortcutMatches;

            return {
              success: saveResult && allMatches,
              message:
                saveResult && allMatches
                  ? "設定が正常に保存・読み込みされました"
                  : "設定の保存または読み込みに問題があります",
            };
          } catch (error) {
            return {
              success: false,
              message: `設定の保存テスト中にエラーが発生しました: ${error.message}`,
            };
          }
        },
      },
      {
        name: "エッジケース: ネットワーク遅延シミュレーション",
        run: async () => {
          try {
            // ネットワーク遅延をシミュレート
            const originalFetch = window.fetch;
            window.fetch = function (url, options) {
              return new Promise((resolve) => {
                setTimeout(() => {
                  originalFetch(url, options).then(resolve);
                }, 1000); // 1秒の遅延
              });
            };

            // シアターモードを切り替え
            if (this.theaterModeController) {
              const initialState =
                this.theaterModeController.isTheaterModeEnabled();
              await this.theaterModeController.toggleTheaterMode();
              const newState =
                this.theaterModeController.isTheaterModeEnabled();

              // 元の状態に戻す
              await this.theaterModeController.toggleTheaterMode();

              // 元のfetch関数を復元
              window.fetch = originalFetch;

              return {
                success: newState !== initialState,
                message:
                  newState !== initialState
                    ? "ネットワーク遅延下でもシアターモードが正常に動作しました"
                    : "ネットワーク遅延下でのシアターモード動作に問題があります",
              };
            } else {
              // 元のfetch関数を復元
              window.fetch = originalFetch;

              return {
                success: false,
                message: "シアターモードコントローラーが初期化されていません",
              };
            }
          } catch (error) {
            // 元のfetch関数を復元
            if (originalFetch) window.fetch = originalFetch;

            return {
              success: false,
              message: `ネットワーク遅延テスト中にエラーが発生しました: ${error.message}`,
            };
          }
        },
      },
      {
        name: "エッジケース: 複数タブシミュレーション",
        run: async () => {
          try {
            // 複数タブの状態同期をシミュレート
            const message = {
              action: "theaterModeChanged",
              isEnabled: true,
              opacity: 0.7,
              tabId: "test-tab-id",
            };

            // メッセージイベントをシミュレート
            const messageEvent = new CustomEvent("theaterModeMessage", {
              detail: message,
            });
            document.dispatchEvent(messageEvent);

            // 少し待機して状態変化を確認
            await new Promise((resolve) => setTimeout(resolve, 100));

            // シアターモードが有効になっているか確認
            const isEnabled =
              this.theaterModeController &&
              this.theaterModeController.isTheaterModeEnabled();

            // 元の状態に戻す
            if (isEnabled && this.theaterModeController) {
              await this.theaterModeController.disableTheaterMode();
            }

            return {
              success: isEnabled,
              message: isEnabled
                ? "複数タブシミュレーションで正常に状態が同期されました"
                : "複数タブシミュレーションでの状態同期に問題があります",
            };
          } catch (error) {
            return {
              success: false,
              message: `複数タブシミュレーション中にエラーが発生しました: ${error.message}`,
            };
          }
        },
      },
    ];

    // テスト進行状況を更新
    this.updateProgress();
  }

  /**
   * イベントリスナーを設定
   */
  setupEventListeners() {
    const runAllButton = document.getElementById("run-all-tests");
    const nextButton = document.getElementById("run-next-test");
    const closeButton = document.getElementById("close-integration-test");

    if (runAllButton) {
      runAllButton.addEventListener("click", () => this.runAllTests());
    }

    if (nextButton) {
      nextButton.addEventListener("click", () => this.runNextTest());
    }

    if (closeButton) {
      closeButton.addEventListener("click", () => {
        const container = document.querySelector(".integration-test-container");
        if (container) {
          document.body.removeChild(container);
        }
      });
    }
  }

  /**
   * すべてのテストを実行
   */
  async runAllTests() {
    if (this.isRunning) return;
    this.isRunning = true;

    this.log("すべてのテストを実行します...");
    this.testResults = [];
    this.currentTestIndex = 0;

    for (let i = 0; i < this.testCases.length; i++) {
      await this.runTest(i);
    }

    this.summarizeResults();
    this.isRunning = false;
  }

  /**
   * 次のテストを実行
   */
  async runNextTest() {
    if (this.isRunning) return;
    if (this.currentTestIndex >= this.testCases.length) {
      this.currentTestIndex = 0;
      this.testResults = [];
      this.log("テストをリセットしました。次のテストから開始します。");
    }

    this.isRunning = true;
    await this.runTest(this.currentTestIndex);
    this.currentTestIndex++;
    this.updateProgress();
    this.isRunning = false;

    if (this.currentTestIndex >= this.testCases.length) {
      this.summarizeResults();
    }
  }

  /**
   * 指定したインデックスのテストを実行
   * @param {number} index - テストケースのインデックス
   */
  async runTest(index) {
    const testCase = this.testCases[index];
    if (!testCase) return;

    this.log(
      `\n[${index + 1}/${this.testCases.length}] テスト実行中: ${testCase.name}`
    );

    try {
      const startTime = performance.now();
      const result = await testCase.run();
      const endTime = performance.now();
      const duration = endTime - startTime;

      this.testResults[index] = {
        name: testCase.name,
        success: result.success,
        message: result.message,
        duration: duration,
      };

      const status = result.success ? "✅ 成功" : "❌ 失敗";
      this.log(`${status}: ${result.message} (${duration.toFixed(2)}ms)`);
    } catch (error) {
      this.testResults[index] = {
        name: testCase.name,
        success: false,
        message: `エラー: ${error.message}`,
        duration: 0,
      };

      this.log(`❌ 失敗: エラーが発生しました - ${error.message}`);
      console.error(`テスト "${testCase.name}" でエラーが発生しました:`, error);
    }

    this.updateProgress();
  }

  /**
   * テスト結果のサマリーを表示
   */
  summarizeResults() {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter((r) => r && r.success).length;
    const failedTests = totalTests - passedTests;

    let summary = `\n===== テスト結果サマリー =====\n`;
    summary += `実行テスト数: ${totalTests}\n`;
    summary += `成功: ${passedTests}\n`;
    summary += `失敗: ${failedTests}\n\n`;

    if (failedTests > 0) {
      summary += `失敗したテスト:\n`;
      this.testResults.forEach((result, index) => {
        if (result && !result.success) {
          summary += `- [${index + 1}] ${result.name}: ${result.message}\n`;
        }
      });
    }

    this.log(summary);
  }

  /**
   * テスト進行状況を更新
   */
  updateProgress() {
    const progressElement = document.getElementById("test-progress");
    if (progressElement) {
      const completedTests = this.testResults.filter(
        (r) => r !== undefined
      ).length;
      progressElement.textContent = `${completedTests}/${this.testCases.length} テスト完了`;
    }
  }

  /**
   * ログメッセージを表示
   * @param {string} message - ログメッセージ
   */
  log(message) {
    if (this.resultContainer) {
      this.resultContainer.textContent += `\n${message}`;
      this.resultContainer.scrollTop = this.resultContainer.scrollHeight;
    }
    console.log(`YouTube Theater Mode: ${message}`);
  }

  /**
   * テストを実行
   */
  static run() {
    return new IntegrationTester().initialize();
  }
}

// YouTube ページでのみテストを実行
if (
  typeof window !== "undefined" &&
  window.location.href.includes("youtube.com")
) {
  console.log("YouTube Theater Mode: 統合テスト開始");
  // DOMの読み込み完了後にテストを実行
  if (document.readyState === "complete") {
    IntegrationTester.run();
  } else {
    window.addEventListener("load", () => {
      setTimeout(() => IntegrationTester.run(), 1000);
    });
  }
}
