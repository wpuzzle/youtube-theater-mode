/**
 * YouTube Theater Mode - アクセシビリティテスト
 * スクリーンリーダー対応、キーボードナビゲーション、色覚異常対応のテスト
 */

class AccessibilityTester {
  constructor() {
    this.testResults = [];
    this.resultContainer = null;
    this.testCases = [];
    this.currentTestIndex = 0;
    this.isRunning = false;
  }

  /**
   * テスト環境を初期化
   */
  initialize() {
    console.log("YouTube Theater Mode: アクセシビリティテスト初期化");

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
    container.className = "accessibility-test-container";
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
    header.textContent = "YouTube シアターモード アクセシビリティテスト";
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
    runButton.id = "run-all-accessibility-tests";
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
    nextButton.id = "run-next-accessibility-test";
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
    progressContainer.id = "accessibility-test-progress";
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
    closeButton.id = "close-accessibility-test";
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
        name: "シアターモードボタンのARIA属性",
        run: async () => {
          // シアターモードボタンを検索
          const theaterButton =
            document.querySelector(".theater-mode-button") ||
            document.querySelector("[data-theater-mode-button]");

          if (!theaterButton) {
            return {
              success: false,
              message: "シアターモードボタンが見つかりません",
            };
          }

          // ARIA属性をチェック
          const hasAriaLabel = theaterButton.hasAttribute("aria-label");
          const hasRole = theaterButton.hasAttribute("role");
          const hasAriaPressed = theaterButton.hasAttribute("aria-pressed");

          const allAttributesPresent =
            hasAriaLabel && hasRole && hasAriaPressed;

          return {
            success: allAttributesPresent,
            message: allAttributesPresent
              ? "シアターモードボタンに適切なARIA属性が設定されています"
              : `シアターモードボタンに不足しているARIA属性があります: ${
                  !hasAriaLabel ? "aria-label " : ""
                }${!hasRole ? "role " : ""}${
                  !hasAriaPressed ? "aria-pressed" : ""
                }`,
          };
        },
      },
      {
        name: "キーボードフォーカス可能性",
        run: async () => {
          // シアターモードボタンを検索
          const theaterButton =
            document.querySelector(".theater-mode-button") ||
            document.querySelector("[data-theater-mode-button]");

          if (!theaterButton) {
            return {
              success: false,
              message: "シアターモードボタンが見つかりません",
            };
          }

          // tabindex属性をチェック
          const hasTabIndex = theaterButton.hasAttribute("tabindex");
          const tabIndexValue = theaterButton.getAttribute("tabindex");
          const isTabIndexValid =
            !hasTabIndex || (tabIndexValue && parseInt(tabIndexValue) >= 0);

          // フォーカス可能かテスト
          let canFocus = false;
          try {
            theaterButton.focus();
            canFocus = document.activeElement === theaterButton;
            // フォーカスを元に戻す
            document.body.focus();
          } catch (error) {
            console.error("フォーカステスト中にエラー:", error);
          }

          return {
            success: isTabIndexValid && canFocus,
            message:
              isTabIndexValid && canFocus
                ? "シアターモードボタンはキーボードでフォーカス可能です"
                : `シアターモードボタンのキーボードフォーカスに問題があります: ${
                    !isTabIndexValid ? "無効なtabindex " : ""
                  }${!canFocus ? "フォーカス不可" : ""}`,
          };
        },
      },
      {
        name: "キーボード操作可能性",
        run: async () => {
          // シアターモードボタンを検索
          const theaterButton =
            document.querySelector(".theater-mode-button") ||
            document.querySelector("[data-theater-mode-button]");

          if (!theaterButton) {
            return {
              success: false,
              message: "シアターモードボタンが見つかりません",
            };
          }

          // キーボードイベントリスナーをチェック
          let hasKeyListener = false;

          // クリックイベントをシミュレート
          let clickHandled = false;
          const originalClick = theaterButton.click;

          theaterButton.click = function () {
            clickHandled = true;
            // 元の関数を呼び出さない（実際の動作を防ぐため）
          };

          // Enterキーイベントをシミュレート
          const enterEvent = new KeyboardEvent("keydown", {
            key: "Enter",
            code: "Enter",
            bubbles: true,
          });

          theaterButton.dispatchEvent(enterEvent);

          // 少し待機してイベント処理を確認
          await new Promise((resolve) => setTimeout(resolve, 100));

          // 元のclick関数を復元
          theaterButton.click = originalClick;

          // Spaceキーイベントもシミュレート
          let spaceHandled = false;

          theaterButton.click = function () {
            spaceHandled = true;
            // 元の関数を呼び出さない
          };

          const spaceEvent = new KeyboardEvent("keydown", {
            key: " ",
            code: "Space",
            bubbles: true,
          });

          theaterButton.dispatchEvent(spaceEvent);

          // 少し待機
          await new Promise((resolve) => setTimeout(resolve, 100));

          // 元のclick関数を復元
          theaterButton.click = originalClick;

          // どちらかのキーイベントが処理されていればOK
          hasKeyListener = clickHandled || spaceHandled;

          return {
            success: hasKeyListener,
            message: hasKeyListener
              ? "シアターモードボタンはキーボードで操作可能です"
              : "シアターモードボタンのキーボード操作に問題があります",
          };
        },
      },
      {
        name: "コントラスト比",
        run: async () => {
          // シアターモードボタンを検索
          const theaterButton =
            document.querySelector(".theater-mode-button") ||
            document.querySelector("[data-theater-mode-button]");

          if (!theaterButton) {
            return {
              success: false,
              message: "シアターモードボタンが見つかりません",
            };
          }

          // コンピュートされたスタイルを取得
          const style = window.getComputedStyle(theaterButton);
          const backgroundColor = style.backgroundColor;
          const color = style.color;

          // RGBから輝度を計算
          const getLuminance = (color) => {
            // RGB値を抽出
            const rgb = color.match(/\d+/g);
            if (!rgb || rgb.length < 3) return 0;

            const r = parseInt(rgb[0]) / 255;
            const g = parseInt(rgb[1]) / 255;
            const b = parseInt(rgb[2]) / 255;

            // sRGB色空間での相対輝度を計算
            const toLinear = (c) => {
              return c <= 0.03928
                ? c / 12.92
                : Math.pow((c + 0.055) / 1.055, 2.4);
            };

            return (
              0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
            );
          };

          const bgLuminance = getLuminance(backgroundColor);
          const fgLuminance = getLuminance(color);

          // コントラスト比を計算
          const contrastRatio =
            (Math.max(bgLuminance, fgLuminance) + 0.05) /
            (Math.min(bgLuminance, fgLuminance) + 0.05);

          // WCAG 2.0 AA基準は4.5:1以上
          const meetsWCAG = contrastRatio >= 4.5;

          return {
            success: meetsWCAG,
            message: meetsWCAG
              ? `コントラスト比は${contrastRatio.toFixed(
                  2
                )}:1でWCAG AAに準拠しています`
              : `コントラスト比は${contrastRatio.toFixed(
                  2
                )}:1でWCAG AAに準拠していません（4.5:1以上必要）`,
          };
        },
      },
      {
        name: "色覚異常シミュレーション",
        run: async () => {
          // シアターモードボタンを検索
          const theaterButton =
            document.querySelector(".theater-mode-button") ||
            document.querySelector("[data-theater-mode-button]");

          if (!theaterButton) {
            return {
              success: false,
              message: "シアターモードボタンが見つかりません",
            };
          }

          // コンピュートされたスタイルを取得
          const style = window.getComputedStyle(theaterButton);
          const backgroundColor = style.backgroundColor;
          const color = style.color;

          // RGB値を抽出
          const bgRGB = backgroundColor.match(/\d+/g);
          const fgRGB = color.match(/\d+/g);

          if (!bgRGB || !fgRGB || bgRGB.length < 3 || fgRGB.length < 3) {
            return {
              success: false,
              message: "色情報の取得に失敗しました",
            };
          }

          // 色覚異常シミュレーション（単純化した変換）
          // 第一色覚異常（赤色弱）のシミュレーション
          const simulateProtanopia = (rgb) => {
            const r = parseInt(rgb[0]);
            const g = parseInt(rgb[1]);
            const b = parseInt(rgb[2]);

            // 赤の感度を下げる簡易シミュレーション
            return [
              0.56667 * r + 0.43333 * g,
              0.55833 * r + 0.44167 * g,
              0.0 * r + 0.24167 * g + 0.75833 * b,
            ];
          };

          const protanopiaBackground = simulateProtanopia(bgRGB);
          const protanopiaForeground = simulateProtanopia(fgRGB);

          // 輝度差を計算
          const getBrightness = (rgb) => {
            return (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
          };

          const bgBrightness = getBrightness(protanopiaBackground);
          const fgBrightness = getBrightness(protanopiaForeground);
          const brightnessDifference = Math.abs(bgBrightness - fgBrightness);

          // WCAG 2.0では輝度差125以上が推奨
          const meetsWCAG = brightnessDifference >= 125;

          return {
            success: meetsWCAG,
            message: meetsWCAG
              ? `色覚異常シミュレーションでの輝度差は${brightnessDifference.toFixed(
                  2
                )}で十分です`
              : `色覚異常シミュレーションでの輝度差は${brightnessDifference.toFixed(
                  2
                )}で不十分です（125以上推奨）`,
          };
        },
      },
      {
        name: "オーバーレイのフォーカストラップ回避",
        run: async () => {
          // シアターモードが有効かチェック
          const overlay = document.querySelector(".theater-mode-overlay");
          let theaterModeController = window.theaterModeController;

          // シアターモードが無効なら有効化
          let wasEnabled = false;
          if (!overlay) {
            if (theaterModeController) {
              wasEnabled = theaterModeController.isTheaterModeEnabled();
              if (!wasEnabled) {
                await theaterModeController.enableTheaterMode();
              }
            } else {
              return {
                success: false,
                message: "シアターモードコントローラーが見つかりません",
              };
            }
          }

          // フォーカス可能な要素を取得
          const focusableElements = document.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );

          // オーバーレイ内の要素とオーバーレイ外の要素を分類
          let overlayElements = [];
          let nonOverlayElements = [];

          focusableElements.forEach((element) => {
            if (element.closest(".theater-mode-overlay")) {
              overlayElements.push(element);
            } else {
              nonOverlayElements.push(element);
            }
          });

          // オーバーレイ外の要素にフォーカスできるかテスト
          let canFocusOutsideOverlay = false;

          if (nonOverlayElements.length > 0) {
            try {
              nonOverlayElements[0].focus();
              canFocusOutsideOverlay =
                document.activeElement === nonOverlayElements[0];
              // フォーカスを元に戻す
              document.body.focus();
            } catch (error) {
              console.error("フォーカステスト中にエラー:", error);
            }
          }

          // シアターモードを元の状態に戻す
          if (theaterModeController && !wasEnabled) {
            await theaterModeController.disableTheaterMode();
          }

          return {
            success: canFocusOutsideOverlay,
            message: canFocusOutsideOverlay
              ? "オーバーレイはフォーカストラップを引き起こしていません"
              : "オーバーレイがフォーカストラップを引き起こしている可能性があります",
          };
        },
      },
      {
        name: "スクリーンリーダー互換性",
        run: async () => {
          // シアターモードボタンを検索
          const theaterButton =
            document.querySelector(".theater-mode-button") ||
            document.querySelector("[data-theater-mode-button]");

          if (!theaterButton) {
            return {
              success: false,
              message: "シアターモードボタンが見つかりません",
            };
          }

          // スクリーンリーダー互換性のチェック
          const hasAccessibleName =
            theaterButton.hasAttribute("aria-label") ||
            theaterButton.hasAttribute("title") ||
            theaterButton.textContent.trim() !== "";

          const hasAccessibleRole =
            theaterButton.hasAttribute("role") ||
            theaterButton.tagName.toLowerCase() === "button";

          const hasAccessibleState =
            theaterButton.hasAttribute("aria-pressed") ||
            theaterButton.hasAttribute("aria-expanded");

          const isAccessible =
            hasAccessibleName && hasAccessibleRole && hasAccessibleState;

          return {
            success: isAccessible,
            message: isAccessible
              ? "シアターモードボタンはスクリーンリーダーと互換性があります"
              : `シアターモードボタンのスクリーンリーダー互換性に問題があります: ${
                  !hasAccessibleName ? "アクセシブルな名前がない " : ""
                }${!hasAccessibleRole ? "ロールが不適切 " : ""}${
                  !hasAccessibleState ? "状態が不明" : ""
                }`,
          };
        },
      },
      {
        name: "キーボードショートカットの代替手段",
        run: async () => {
          // シアターモードボタンを検索
          const theaterButton =
            document.querySelector(".theater-mode-button") ||
            document.querySelector("[data-theater-mode-button]");

          // キーボードショートカットの存在を確認
          const hasKeyboardShortcut =
            window.theaterModeController &&
            typeof window.theaterModeController.setupKeyboardShortcuts ===
              "function";

          // ボタンによる代替手段の存在を確認
          const hasButtonAlternative = !!theaterButton;

          return {
            success: hasKeyboardShortcut && hasButtonAlternative,
            message:
              hasKeyboardShortcut && hasButtonAlternative
                ? "キーボードショートカットに適切な代替手段が提供されています"
                : `キーボードショートカットの代替手段に問題があります: ${
                    !hasKeyboardShortcut ? "ショートカットなし " : ""
                  }${!hasButtonAlternative ? "ボタンによる代替手段なし" : ""}`,
          };
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
    const runAllButton = document.getElementById("run-all-accessibility-tests");
    const nextButton = document.getElementById("run-next-accessibility-test");
    const closeButton = document.getElementById("close-accessibility-test");

    if (runAllButton) {
      runAllButton.addEventListener("click", () => this.runAllTests());
    }

    if (nextButton) {
      nextButton.addEventListener("click", () => this.runNextTest());
    }

    if (closeButton) {
      closeButton.addEventListener("click", () => {
        const container = document.querySelector(
          ".accessibility-test-container"
        );
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

    this.log("すべてのアクセシビリティテストを実行します...");
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

    let summary = `\n===== アクセシビリティテスト結果サマリー =====\n`;
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
    const progressElement = document.getElementById(
      "accessibility-test-progress"
    );
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
    return new AccessibilityTester().initialize();
  }
}

// YouTube ページでのみテストを実行
if (
  typeof window !== "undefined" &&
  window.location.href.includes("youtube.com")
) {
  console.log("YouTube Theater Mode: アクセシビリティテスト開始");
  // DOMの読み込み完了後にテストを実行
  if (document.readyState === "complete") {
    AccessibilityTester.run();
  } else {
    window.addEventListener("load", () => {
      setTimeout(() => AccessibilityTester.run(), 1000);
    });
  }
}
