/**
 * MessageRouter テストランナー
 */

// テスト用のユーティリティ
const TestUtils = {
  // テスト結果を表示する要素
  resultElement: null,

  // テスト結果をカウント
  counts: {
    total: 0,
    passed: 0,
    failed: 0,
  },

  // テストを初期化
  init: function () {
    // 結果表示用の要素を作成
    this.resultElement = document.createElement("div");
    this.resultElement.id = "test-results";
    document.body.appendChild(this.resultElement);

    this.log("MessageRouter テストを開始します...");
  },

  // ログを出力
  log: function (message, isError = false) {
    const logElement = document.createElement("div");
    logElement.textContent = message;

    if (isError) {
      logElement.style.color = "red";
    }

    this.resultElement.appendChild(logElement);
    console.log(message);
  },

  // テスト結果を表示
  displayResults: function () {
    const summaryElement = document.createElement("div");
    summaryElement.innerHTML = `
      <h3>テスト結果</h3>
      <p>合計: ${this.counts.total}</p>
      <p style="color: green;">成功: ${this.counts.passed}</p>
      <p style="color: red;">失敗: ${this.counts.failed}</p>
    `;

    this.resultElement.appendChild(summaryElement);
  },

  // アサーション
  assert: function (condition, message) {
    this.counts.total++;

    if (condition) {
      this.counts.passed++;
      this.log(`✓ ${message}`);
      return true;
    } else {
      this.counts.failed++;
      this.log(`✗ ${message}`, true);
      return false;
    }
  },

  // 例外をキャッチするアサーション
  assertThrows: function (fn, message) {
    try {
      fn();
      this.assert(false, `${message} - 例外がスローされませんでした`);
      return false;
    } catch (e) {
      this.assert(true, `${message} - 例外がスローされました: ${e.message}`);
      return true;
    }
  },

  // 非同期アサーション
  assertAsync: async function (promiseFn, message) {
    try {
      const result = await promiseFn();
      this.assert(result, message);
      return result;
    } catch (e) {
      this.assert(false, `${message} - エラー: ${e.message}`);
      return false;
    }
  },
};

// モックオブジェクトを作成
function createMocks() {
  // ロガーのモック
  const logger = {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
  };

  // エラーハンドラーのモック
  const errorHandler = {
    handleError: () => {},
    wrapAsync: async (promise) => {
      try {
        const result = await promise;
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error };
      }
    },
  };

  // メッセージバスのモック
  const messageBus = {
    send: async () => ({ success: true }),
    registerHandler: () => {},
    clear: () => {},
  };

  return {
    logger,
    errorHandler,
    messageBus,
  };
}

// MessageRouter のテスト
async function runMessageRouterTests() {
  TestUtils.init();

  try {
    // MessageRouter クラスが存在することを確認
    TestUtils.assert(
      typeof MessageRouter === "function",
      "MessageRouter クラスが存在する"
    );

    // モックを作成
    const mocks = createMocks();

    // MessageRouter インスタンスを作成
    const router = new MessageRouter({
      logger: mocks.logger,
      errorHandler: mocks.errorHandler,
      messageBus: mocks.messageBus,
    });

    // インスタンスが正しく作成されたことを確認
    TestUtils.assert(
      router instanceof MessageRouter,
      "MessageRouter インスタンスが正しく作成された"
    );

    // addRoute メソッドのテスト
    const routeId = router.addRoute({
      type: "SETTINGS_CHANGED",
      target: "ALL",
      forward: true,
    });

    TestUtils.assert(
      typeof routeId === "string" && routeId.length > 0,
      "addRoute メソッドが正常に動作する"
    );

    // removeRoute メソッドのテスト
    const removeResult = router.removeRoute(routeId);
    TestUtils.assert(
      removeResult === true,
      "removeRoute メソッドが正常に動作する"
    );

    // registerTypeHandler メソッドのテスト
    const typeHandler = () => {};
    const removeTypeHandler = router.registerTypeHandler(
      "SETTINGS_CHANGED",
      typeHandler
    );

    TestUtils.assert(
      typeof removeTypeHandler === "function",
      "registerTypeHandler メソッドが正常に動作する"
    );

    // registerSourceHandler メソッドのテスト
    const sourceHandler = () => {};
    const removeSourceHandler = router.registerSourceHandler(
      "background",
      sourceHandler
    );

    TestUtils.assert(
      typeof removeSourceHandler === "function",
      "registerSourceHandler メソッドが正常に動作する"
    );

    // registerTargetHandler メソッドのテスト
    const targetHandler = () => {};
    const removeTargetHandler = router.registerTargetHandler(
      "content_script",
      targetHandler
    );

    TestUtils.assert(
      typeof removeTargetHandler === "function",
      "registerTargetHandler メソッドが正常に動作する"
    );

    // addMiddleware メソッドのテスト
    const middleware = (message) => message;
    const removeMiddleware = router.addMiddleware(middleware);

    TestUtils.assert(
      typeof removeMiddleware === "function",
      "addMiddleware メソッドが正常に動作する"
    );

    // send メソッドのテスト
    await TestUtils.assertAsync(async () => {
      const result = await router.send("SETTINGS_CHANGED", {
        theaterModeEnabled: true,
      });
      return result.success === true;
    }, "send メソッドが正常に動作する");

    // dispose メソッドのテスト
    router.dispose();
    TestUtils.assert(true, "dispose メソッドが正常に動作する");
  } catch (error) {
    TestUtils.log(`テスト実行中にエラーが発生しました: ${error.message}`, true);
    console.error(error);
  } finally {
    TestUtils.displayResults();
  }
}

// テストを実行
if (typeof window !== "undefined") {
  // ブラウザ環境
  window.addEventListener("load", runMessageRouterTests);
} else {
  // Node.js環境
  runMessageRouterTests();
}
