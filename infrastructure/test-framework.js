/**
 * YouTube Theater Mode 拡張機能専用テストフレームワーク
 * Chrome API のモック機能とテスト環境管理を提供
 */

/**
 * テスト結果を表すクラス
 */
class TestResult {
  constructor(name, passed = false, error = null, duration = 0) {
    this.name = name;
    this.passed = passed;
    this.error = error;
    this.duration = duration;
    this.timestamp = Date.now();
  }

  /**
   * テスト結果を文字列として取得
   * @returns {string} フォーマットされたテスト結果
   */
  toString() {
    const status = this.passed ? "✓" : "✗";
    const duration = this.duration ? ` (${this.duration}ms)` : "";
    return `${status} ${this.name}${duration}`;
  }
}

/**
 * テストスイートを管理するクラス
 */
class TestSuite {
  constructor(name) {
    this.name = name;
    this.tests = [];
    this.beforeEachHooks = [];
    this.afterEachHooks = [];
    this.beforeAllHooks = [];
    this.afterAllHooks = [];
    this.results = [];
  }

  /**
   * テストケースを追加
   * @param {string} name - テスト名
   * @param {Function} testFn - テスト関数
   * @param {Object} options - テストオプション
   */
  test(name, testFn, options = {}) {
    this.tests.push({
      name,
      fn: testFn,
      timeout: options.timeout || 5000,
      skip: options.skip || false,
      only: options.only || false,
    });
  }

  /**
   * 各テスト前に実行するフック
   * @param {Function} hookFn - フック関数
   */
  beforeEach(hookFn) {
    this.beforeEachHooks.push(hookFn);
  }

  /**
   * 各テスト後に実行するフック
   * @param {Function} hookFn - フック関数
   */
  afterEach(hookFn) {
    this.afterEachHooks.push(hookFn);
  }

  /**
   * 全テスト前に実行するフック
   * @param {Function} hookFn - フック関数
   */
  beforeAll(hookFn) {
    this.beforeAllHooks.push(hookFn);
  }

  /**
   * 全テスト後に実行するフック
   * @param {Function} hookFn - フック関数
   */
  afterAll(hookFn) {
    this.afterAllHooks.push(hookFn);
  }

  /**
   * テストスイートを実行
   * @returns {Promise<TestSuiteResult>} テスト結果
   */
  async run() {
    const startTime = Date.now();
    this.results = [];

    try {
      // beforeAll フックを実行
      for (const hook of this.beforeAllHooks) {
        await hook();
      }

      // onlyが指定されたテストがある場合はそれだけを実行
      const testsToRun = this.tests.some((t) => t.only)
        ? this.tests.filter((t) => t.only)
        : this.tests.filter((t) => !t.skip);

      for (const test of testsToRun) {
        const testResult = await this.runSingleTest(test);
        this.results.push(testResult);
      }

      // afterAll フックを実行
      for (const hook of this.afterAllHooks) {
        await hook();
      }
    } catch (error) {
      console.error(`Error in test suite ${this.name}:`, error);
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    return {
      name: this.name,
      results: this.results,
      passed: this.results.filter((r) => r.passed).length,
      failed: this.results.filter((r) => !r.passed).length,
      total: this.results.length,
      duration,
    };
  }

  /**
   * 単一テストを実行
   * @param {Object} test - テスト定義
   * @returns {Promise<TestResult>} テスト結果
   */
  async runSingleTest(test) {
    const startTime = Date.now();

    try {
      // beforeEach フックを実行
      for (const hook of this.beforeEachHooks) {
        await hook();
      }

      // タイムアウト付きでテストを実行
      await Promise.race([
        test.fn(),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error(`Test timeout: ${test.timeout}ms`)),
            test.timeout
          )
        ),
      ]);

      // afterEach フックを実行
      for (const hook of this.afterEachHooks) {
        await hook();
      }

      const duration = Date.now() - startTime;
      return new TestResult(test.name, true, null, duration);
    } catch (error) {
      // afterEach フックを実行（エラー時も）
      try {
        for (const hook of this.afterEachHooks) {
          await hook();
        }
      } catch (hookError) {
        console.error("Error in afterEach hook:", hookError);
      }

      const duration = Date.now() - startTime;
      return new TestResult(test.name, false, error, duration);
    }
  }
}

/**
 * メインのテストフレームワーククラス
 */
class TestFramework {
  constructor(options = {}) {
    this.suites = [];
    this.globalSetup = null;
    this.globalTeardown = null;
    this.reporter = options.reporter || new ConsoleReporter();
    this.chromeApiMock = new ChromeApiMock();
    this.domMock = new DOMTestEnvironment();
  }

  /**
   * テストスイートを作成
   * @param {string} name - スイート名
   * @param {Function} suiteFn - スイート定義関数
   * @returns {TestSuite} テストスイート
   */
  describe(name, suiteFn) {
    const suite = new TestSuite(name);
    this.suites.push(suite);

    // スイート定義関数を実行してテストを登録
    suiteFn.call(suite, suite);

    return suite;
  }

  /**
   * グローバルセットアップを設定
   * @param {Function} setupFn - セットアップ関数
   */
  setGlobalSetup(setupFn) {
    this.globalSetup = setupFn;
  }

  /**
   * グローバルティアダウンを設定
   * @param {Function} teardownFn - ティアダウン関数
   */
  setGlobalTeardown(teardownFn) {
    this.globalTeardown = teardownFn;
  }

  /**
   * 全テストスイートを実行
   * @returns {Promise<Object>} 全体のテスト結果
   */
  async run() {
    const startTime = Date.now();

    try {
      // グローバルセットアップを実行
      if (this.globalSetup) {
        await this.globalSetup();
      }

      // Chrome API モックをセットアップ
      this.chromeApiMock.setup();

      // DOM テスト環境をセットアップ
      this.domMock.setup();

      const suiteResults = [];

      // 各テストスイートを実行
      for (const suite of this.suites) {
        const result = await suite.run();
        suiteResults.push(result);
        this.reporter.reportSuite(result);
      }

      // グローバルティアダウンを実行
      if (this.globalTeardown) {
        await this.globalTeardown();
      }

      const endTime = Date.now();
      const totalResults = {
        suites: suiteResults,
        totalPassed: suiteResults.reduce((sum, s) => sum + s.passed, 0),
        totalFailed: suiteResults.reduce((sum, s) => sum + s.failed, 0),
        totalTests: suiteResults.reduce((sum, s) => sum + s.total, 0),
        duration: endTime - startTime,
      };

      this.reporter.reportSummary(totalResults);
      return totalResults;
    } finally {
      // クリーンアップ
      this.chromeApiMock.teardown();
      this.domMock.teardown();
    }
  }

  /**
   * アサーション関数群
   */
  static get assert() {
    return {
      /**
       * 基本的なアサーション
       * @param {boolean} condition - 条件
       * @param {string} message - エラーメッセージ
       */
      isTrue(condition, message = "Expected condition to be true") {
        if (!condition) {
          throw new Error(message);
        }
      },

      /**
       * 等価性アサーション
       * @param {*} actual - 実際の値
       * @param {*} expected - 期待値
       * @param {string} message - エラーメッセージ
       */
      equal(actual, expected, message) {
        if (actual !== expected) {
          throw new Error(message || `Expected ${expected}, got ${actual}`);
        }
      },

      /**
       * 深い等価性アサーション
       * @param {*} actual - 実際の値
       * @param {*} expected - 期待値
       * @param {string} message - エラーメッセージ
       */
      deepEqual(actual, expected, message) {
        if (!this._deepEqual(actual, expected)) {
          throw new Error(
            message ||
              `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(
                actual
              )}`
          );
        }
      },

      /**
       * 配列に要素が含まれることをアサート
       * @param {Array} array - 配列
       * @param {*} item - 要素
       * @param {string} message - エラーメッセージ
       */
      includes(array, item, message) {
        if (!array.includes(item)) {
          throw new Error(message || `Expected array to include ${item}`);
        }
      },

      /**
       * 例外がスローされることをアサート
       * @param {Function} fn - 実行する関数
       * @param {string|RegExp} expectedError - 期待するエラー
       * @param {string} message - エラーメッセージ
       */
      throws(fn, expectedError, message) {
        try {
          fn();
          throw new Error(message || "Expected function to throw");
        } catch (error) {
          if (expectedError) {
            if (
              typeof expectedError === "string" &&
              !error.message.includes(expectedError)
            ) {
              throw new Error(
                message ||
                  `Expected error to contain "${expectedError}", got "${error.message}"`
              );
            }
            if (
              expectedError instanceof RegExp &&
              !expectedError.test(error.message)
            ) {
              throw new Error(
                message ||
                  `Expected error to match ${expectedError}, got "${error.message}"`
              );
            }
          }
        }
      },

      /**
       * 非同期関数が例外をスローすることをアサート
       * @param {Function} fn - 実行する非同期関数
       * @param {string|RegExp} expectedError - 期待するエラー
       * @param {string} message - エラーメッセージ
       */
      async rejects(fn, expectedError, message) {
        try {
          await fn();
          throw new Error(message || "Expected async function to reject");
        } catch (error) {
          if (expectedError) {
            if (
              typeof expectedError === "string" &&
              !error.message.includes(expectedError)
            ) {
              throw new Error(
                message ||
                  `Expected error to contain "${expectedError}", got "${error.message}"`
              );
            }
            if (
              expectedError instanceof RegExp &&
              !expectedError.test(error.message)
            ) {
              throw new Error(
                message ||
                  `Expected error to match ${expectedError}, got "${error.message}"`
              );
            }
          }
        }
      },

      /**
       * 深い等価性チェックのヘルパー
       * @private
       */
      _deepEqual(a, b) {
        if (a === b) return true;
        if (a == null || b == null) return false;
        if (typeof a !== typeof b) return false;

        if (typeof a === "object") {
          const keysA = Object.keys(a);
          const keysB = Object.keys(b);

          if (keysA.length !== keysB.length) return false;

          for (const key of keysA) {
            if (!keysB.includes(key)) return false;
            if (!this._deepEqual(a[key], b[key])) return false;
          }

          return true;
        }

        return false;
      },
    };
  }
}

/**
 * コンソールレポーター
 */
class ConsoleReporter {
  /**
   * テストスイート結果をレポート
   * @param {Object} suiteResult - スイート結果
   */
  reportSuite(suiteResult) {
    console.log(`\n${suiteResult.name}`);
    console.log("─".repeat(50));

    for (const result of suiteResult.results) {
      console.log(result.toString());
      if (!result.passed && result.error) {
        console.log(`  Error: ${result.error.message}`);
        if (result.error.stack) {
          console.log(`  Stack: ${result.error.stack.split("\n")[1]?.trim()}`);
        }
      }
    }
  }

  /**
   * 全体のサマリーをレポート
   * @param {Object} totalResults - 全体結果
   */
  reportSummary(totalResults) {
    console.log("\n" + "=".repeat(50));
    console.log("Test Summary");
    console.log("=".repeat(50));
    console.log(`Total Tests: ${totalResults.totalTests}`);
    console.log(`Passed: ${totalResults.totalPassed}`);
    console.log(`Failed: ${totalResults.totalFailed}`);
    console.log(`Duration: ${totalResults.duration}ms`);

    if (totalResults.totalFailed === 0) {
      console.log("\n✓ All tests passed!");
    } else {
      console.log(`\n✗ ${totalResults.totalFailed} test(s) failed!`);
    }
  }
}

// エクスポート
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    TestFramework,
    TestSuite,
    TestResult,
    ConsoleReporter,
  };
}

if (typeof window !== "undefined") {
  window.TestFramework = TestFramework;
  window.TestSuite = TestSuite;
  window.TestResult = TestResult;
  window.ConsoleReporter = ConsoleReporter;
}

/**
 * Chrome API モッククラス
 * Chrome 拡張機能 API の完全なモック実装
 */
class ChromeApiMock {
  constructor() {
    this.originalChrome = null;
    this.mockData = {
      storage: {
        sync: new Map(),
        local: new Map(),
      },
      tabs: new Map(),
      runtime: {
        lastError: null,
        id: "test-extension-id",
      },
    };
    this.listeners = {
      storage: [],
      tabs: [],
      runtime: [],
    };
  }

  /**
   * Chrome API モックをセットアップ
   */
  setup() {
    // 既存のchromeオブジェクトを保存
    if (typeof chrome !== "undefined") {
      this.originalChrome = chrome;
    }

    // モックchromeオブジェクトを作成
    const mockChrome = {
      storage: {
        sync: {
          get: this.createStorageGet("sync"),
          set: this.createStorageSet("sync"),
          remove: this.createStorageRemove("sync"),
          clear: this.createStorageClear("sync"),
          onChanged: {
            addListener: (callback) => this.listeners.storage.push(callback),
            removeListener: (callback) => {
              const index = this.listeners.storage.indexOf(callback);
              if (index > -1) this.listeners.storage.splice(index, 1);
            },
          },
        },
        local: {
          get: this.createStorageGet("local"),
          set: this.createStorageSet("local"),
          remove: this.createStorageRemove("local"),
          clear: this.createStorageClear("local"),
        },
      },
      tabs: {
        query: this.createTabsQuery(),
        get: this.createTabsGet(),
        sendMessage: this.createTabsSendMessage(),
        onUpdated: {
          addListener: (callback) => this.listeners.tabs.push(callback),
          removeListener: (callback) => {
            const index = this.listeners.tabs.indexOf(callback);
            if (index > -1) this.listeners.tabs.splice(index, 1);
          },
        },
      },
      runtime: {
        sendMessage: this.createRuntimeSendMessage(),
        onMessage: {
          addListener: (callback) => this.listeners.runtime.push(callback),
          removeListener: (callback) => {
            const index = this.listeners.runtime.indexOf(callback);
            if (index > -1) this.listeners.runtime.splice(index, 1);
          },
        },
        getManifest: () => ({
          version: "1.0.0",
          name: "YouTube Theater Mode Test",
        }),
        id: this.mockData.runtime.id,
        lastError: this.mockData.runtime.lastError,
      },
    };

    // グローバルにchromeオブジェクトを設定
    if (typeof global !== "undefined") {
      global.chrome = mockChrome;
    }
    if (typeof window !== "undefined") {
      window.chrome = mockChrome;
    }
  }

  /**
   * Chrome API モックをクリーンアップ
   */
  teardown() {
    // 元のchromeオブジェクトを復元
    if (typeof global !== "undefined") {
      if (this.originalChrome) {
        global.chrome = this.originalChrome;
      } else {
        delete global.chrome;
      }
    }
    if (typeof window !== "undefined") {
      if (this.originalChrome) {
        window.chrome = this.originalChrome;
      } else {
        delete window.chrome;
      }
    }

    // モックデータをクリア
    this.mockData.storage.sync.clear();
    this.mockData.storage.local.clear();
    this.mockData.tabs.clear();
    this.listeners.storage = [];
    this.listeners.tabs = [];
    this.listeners.runtime = [];
  }

  /**
   * ストレージget操作のモック作成
   * @param {string} type - ストレージタイプ
   */
  createStorageGet(type) {
    return (keys, callback) => {
      const storage = this.mockData.storage[type];
      const result = {};

      if (keys === null || keys === undefined) {
        // 全データを取得
        for (const [key, value] of storage) {
          result[key] = value;
        }
      } else if (typeof keys === "string") {
        // 単一キー
        if (storage.has(keys)) {
          result[keys] = storage.get(keys);
        }
      } else if (Array.isArray(keys)) {
        // 複数キー
        for (const key of keys) {
          if (storage.has(key)) {
            result[key] = storage.get(key);
          }
        }
      } else if (typeof keys === "object") {
        // デフォルト値付きオブジェクト
        for (const [key, defaultValue] of Object.entries(keys)) {
          result[key] = storage.has(key) ? storage.get(key) : defaultValue;
        }
      }

      if (callback) {
        setTimeout(() => callback(result), 0);
      }
      return Promise.resolve(result);
    };
  }

  /**
   * ストレージset操作のモック作成
   * @param {string} type - ストレージタイプ
   */
  createStorageSet(type) {
    return (items, callback) => {
      const storage = this.mockData.storage[type];
      const changes = {};

      for (const [key, newValue] of Object.entries(items)) {
        const oldValue = storage.get(key);
        storage.set(key, newValue);
        changes[key] = { newValue, oldValue };
      }

      // onChanged リスナーを呼び出し
      for (const listener of this.listeners.storage) {
        setTimeout(() => listener(changes, type), 0);
      }

      if (callback) {
        setTimeout(callback, 0);
      }
      return Promise.resolve();
    };
  }

  /**
   * ストレージremove操作のモック作成
   * @param {string} type - ストレージタイプ
   */
  createStorageRemove(type) {
    return (keys, callback) => {
      const storage = this.mockData.storage[type];
      const changes = {};
      const keysArray = Array.isArray(keys) ? keys : [keys];

      for (const key of keysArray) {
        if (storage.has(key)) {
          const oldValue = storage.get(key);
          storage.delete(key);
          changes[key] = { oldValue };
        }
      }

      // onChanged リスナーを呼び出し
      if (Object.keys(changes).length > 0) {
        for (const listener of this.listeners.storage) {
          setTimeout(() => listener(changes, type), 0);
        }
      }

      if (callback) {
        setTimeout(callback, 0);
      }
      return Promise.resolve();
    };
  }

  /**
   * ストレージclear操作のモック作成
   * @param {string} type - ストレージタイプ
   */
  createStorageClear(type) {
    return (callback) => {
      const storage = this.mockData.storage[type];
      const changes = {};

      for (const [key, value] of storage) {
        changes[key] = { oldValue: value };
      }

      storage.clear();

      // onChanged リスナーを呼び出し
      if (Object.keys(changes).length > 0) {
        for (const listener of this.listeners.storage) {
          setTimeout(() => listener(changes, type), 0);
        }
      }

      if (callback) {
        setTimeout(callback, 0);
      }
      return Promise.resolve();
    };
  }

  /**
   * tabs.query のモック作成
   */
  createTabsQuery() {
    return (queryInfo, callback) => {
      const tabs = Array.from(this.mockData.tabs.values());
      let filteredTabs = tabs;

      if (queryInfo.active !== undefined) {
        filteredTabs = filteredTabs.filter(
          (tab) => tab.active === queryInfo.active
        );
      }
      if (queryInfo.url !== undefined) {
        const urlPattern = new RegExp(queryInfo.url.replace(/\*/g, ".*"));
        filteredTabs = filteredTabs.filter((tab) => urlPattern.test(tab.url));
      }

      if (callback) {
        setTimeout(() => callback(filteredTabs), 0);
      }
      return Promise.resolve(filteredTabs);
    };
  }

  /**
   * tabs.get のモック作成
   */
  createTabsGet() {
    return (tabId, callback) => {
      const tab = this.mockData.tabs.get(tabId);
      if (callback) {
        setTimeout(() => callback(tab), 0);
      }
      return Promise.resolve(tab);
    };
  }

  /**
   * tabs.sendMessage のモック作成
   */
  createTabsSendMessage() {
    return (tabId, message, callback) => {
      // メッセージ送信をシミュレート
      const response = { success: true, tabId, message };
      if (callback) {
        setTimeout(() => callback(response), 0);
      }
      return Promise.resolve(response);
    };
  }

  /**
   * runtime.sendMessage のモック作成
   */
  createRuntimeSendMessage() {
    return (message, callback) => {
      // ランタイムメッセージをシミュレート
      const response = { success: true, message };
      if (callback) {
        setTimeout(() => callback(response), 0);
      }
      return Promise.resolve(response);
    };
  }

  /**
   * テスト用のタブを追加
   * @param {Object} tab - タブオブジェクト
   */
  addMockTab(tab) {
    const tabId = tab.id || Date.now();
    const mockTab = {
      id: tabId,
      url: tab.url || "https://www.youtube.com/watch?v=test",
      title: tab.title || "Test Video",
      active: tab.active || false,
      ...tab,
    };
    this.mockData.tabs.set(tabId, mockTab);
    return mockTab;
  }

  /**
   * エラーをシミュレート
   * @param {string} message - エラーメッセージ
   */
  setLastError(message) {
    this.mockData.runtime.lastError = { message };
  }

  /**
   * エラーをクリア
   */
  clearLastError() {
    this.mockData.runtime.lastError = null;
  }
}

/**
 * DOM テスト環境クラス
 * YouTube ページのDOM構造をモック
 */
class DOMTestEnvironment {
  constructor() {
    this.originalDocument = null;
    this.originalWindow = null;
    this.mockElements = new Map();
  }

  /**
   * DOM テスト環境をセットアップ
   */
  setup() {
    // JSDOM が利用可能な場合は使用
    if (typeof document === "undefined") {
      this.setupJSDOM();
    } else {
      this.setupBrowserDOM();
    }
  }

  /**
   * JSDOM環境のセットアップ
   */
  setupJSDOM() {
    // Node.js環境でのJSDOM使用を想定
    try {
      const { JSDOM } = require("jsdom");
      const dom = new JSDOM(`
        <!DOCTYPE html>
        <html>
          <head><title>YouTube Test</title></head>
          <body>
            <div id="movie_player" class="html5-video-player">
              <video class="video-stream"></video>
              <div class="ytp-chrome-controls"></div>
            </div>
            <div id="secondary">
              <div id="comments"></div>
            </div>
            <div id="masthead"></div>
          </body>
        </html>
      `);

      global.document = dom.window.document;
      global.window = dom.window;
      global.navigator = dom.window.navigator;
    } catch (error) {
      // JSDOMが利用できない場合は基本的なモックを作成
      this.setupBasicDOM();
    }
  }

  /**
   * ブラウザDOM環境のセットアップ
   */
  setupBrowserDOM() {
    // 既存のDOMを保存
    this.originalDocument = document;
    this.originalWindow = window;

    // テスト用のYouTube要素を作成
    this.createYouTubeElements();
  }

  /**
   * 基本的なDOMモックのセットアップ
   */
  setupBasicDOM() {
    const mockDocument = {
      getElementById: (id) => this.mockElements.get(id),
      querySelector: (selector) => {
        // 簡単なセレクター解析
        if (selector.startsWith("#")) {
          return this.mockElements.get(selector.slice(1));
        }
        return null;
      },
      querySelectorAll: (selector) => {
        const elements = [];
        for (const [id, element] of this.mockElements) {
          if (selector.startsWith("#") && id === selector.slice(1)) {
            elements.push(element);
          }
        }
        return elements;
      },
      createElement: (tagName) => ({
        tagName: tagName.toUpperCase(),
        style: {},
        classList: {
          add: () => {},
          remove: () => {},
          contains: () => false,
        },
        addEventListener: () => {},
        removeEventListener: () => {},
        appendChild: () => {},
        removeChild: () => {},
        dataset: {},
      }),
      body: {
        appendChild: () => {},
        removeChild: () => {},
      },
    };

    global.document = mockDocument;
    global.window = {
      addEventListener: () => {},
      removeEventListener: () => {},
      getComputedStyle: () => ({}),
      requestAnimationFrame: (callback) => setTimeout(callback, 16),
    };

    // YouTube要素を作成
    this.createMockYouTubeElements();
  }

  /**
   * YouTube要素を作成
   */
  createYouTubeElements() {
    const elements = [
      { id: "movie_player", className: "html5-video-player" },
      { id: "secondary", className: "secondary" },
      { id: "comments", className: "comments" },
      { id: "masthead", className: "masthead" },
    ];

    for (const elementInfo of elements) {
      let element = document.getElementById(elementInfo.id);
      if (!element) {
        element = document.createElement("div");
        element.id = elementInfo.id;
        element.className = elementInfo.className;
        document.body.appendChild(element);
      }
    }
  }

  /**
   * モックYouTube要素を作成
   */
  createMockYouTubeElements() {
    const elements = [
      { id: "movie_player", className: "html5-video-player" },
      { id: "secondary", className: "secondary" },
      { id: "comments", className: "comments" },
      { id: "masthead", className: "masthead" },
    ];

    for (const elementInfo of elements) {
      const element = {
        id: elementInfo.id,
        className: elementInfo.className,
        style: {},
        classList: {
          add: () => {},
          remove: () => {},
          contains: () => false,
        },
        addEventListener: () => {},
        removeEventListener: () => {},
        getBoundingClientRect: () => ({
          top: 0,
          left: 0,
          width: 100,
          height: 100,
        }),
        dataset: {},
      };
      this.mockElements.set(elementInfo.id, element);
    }
  }

  /**
   * DOM テスト環境をクリーンアップ
   */
  teardown() {
    if (this.originalDocument) {
      // ブラウザ環境の場合、作成した要素を削除
      const testElements = [
        "movie_player",
        "secondary",
        "comments",
        "masthead",
      ];
      for (const id of testElements) {
        const element = document.getElementById(id);
        if (element && element.dataset.testElement) {
          element.remove();
        }
      }
    }

    // モック要素をクリア
    this.mockElements.clear();
  }

  /**
   * 特定の要素を取得
   * @param {string} id - 要素ID
   * @returns {Element} 要素
   */
  getElement(id) {
    if (typeof document !== "undefined") {
      return document.getElementById(id);
    }
    return this.mockElements.get(id);
  }

  /**
   * YouTube動画プレーヤーをシミュレート
   * @param {Object} options - プレーヤーオプション
   */
  simulateVideoPlayer(options = {}) {
    const player = this.getElement("movie_player");
    if (player) {
      player.dataset.videoId = options.videoId || "test-video";
      player.dataset.isPlaying = options.isPlaying || "false";
    }
  }
}

// 追加のエクスポート
if (typeof module !== "undefined" && module.exports) {
  module.exports.ChromeApiMock = ChromeApiMock;
  module.exports.DOMTestEnvironment = DOMTestEnvironment;
}

if (typeof window !== "undefined") {
  window.ChromeApiMock = ChromeApiMock;
  window.DOMTestEnvironment = DOMTestEnvironment;
}
