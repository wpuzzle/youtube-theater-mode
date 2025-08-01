/**
 * MockFactory
 * 各コンポーネントのモックオブジェクト生成機能を提供
 * Chrome API の完全なモック実装とテストデータ生成機能
 */

/**
 * テストデータ生成用のユーティリティ
 */
class TestDataGenerator {
  /**
   * ランダムな文字列を生成
   * @param {number} length - 文字列の長さ
   * @returns {string} ランダム文字列
   */
  static randomString(length = 10) {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * ランダムな数値を生成
   * @param {number} min - 最小値
   * @param {number} max - 最大値
   * @returns {number} ランダム数値
   */
  static randomNumber(min = 0, max = 100) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * ランダムなブール値を生成
   * @returns {boolean} ランダムブール値
   */
  static randomBoolean() {
    return Math.random() < 0.5;
  }

  /**
   * YouTube動画IDを生成
   * @returns {string} YouTube動画ID
   */
  static youtubeVideoId() {
    return this.randomString(11);
  }

  /**
   * YouTubeのURLを生成
   * @param {string} videoId - 動画ID
   * @returns {string} YouTube URL
   */
  static youtubeUrl(videoId = null) {
    const id = videoId || this.youtubeVideoId();
    return `https://www.youtube.com/watch?v=${id}`;
  }

  /**
   * タブオブジェクトを生成
   * @param {Object} overrides - 上書きするプロパティ
   * @returns {Object} タブオブジェクト
   */
  static createTab(overrides = {}) {
    return {
      id: this.randomNumber(1, 1000),
      url: this.youtubeUrl(),
      title: `Test Video ${this.randomString(5)}`,
      active: false,
      windowId: this.randomNumber(1, 10),
      index: this.randomNumber(0, 20),
      ...overrides,
    };
  }

  /**
   * 設定オブジェクトを生成
   * @param {Object} overrides - 上書きするプロパティ
   * @returns {Object} 設定オブジェクト
   */
  static createSettings(overrides = {}) {
    return {
      opacity: this.randomNumber(10, 90) / 100,
      keyboardShortcut: "t",
      theaterModeEnabled: this.randomBoolean(),
      version: "1.0.0",
      ...overrides,
    };
  }

  /**
   * メッセージオブジェクトを生成
   * @param {string} type - メッセージタイプ
   * @param {Object} data - メッセージデータ
   * @returns {Object} メッセージオブジェクト
   */
  static createMessage(type, data = {}) {
    return {
      type,
      data,
      timestamp: Date.now(),
      id: this.randomString(8),
    };
  }
}

/**
 * シナリオ管理クラス
 * テストシナリオの定義と実行を管理
 */
class ScenarioManager {
  constructor() {
    this.scenarios = new Map();
    this.currentScenario = null;
  }

  /**
   * シナリオを定義
   * @param {string} name - シナリオ名
   * @param {Object} config - シナリオ設定
   */
  defineScenario(name, config) {
    this.scenarios.set(name, {
      name,
      setup: config.setup || (() => {}),
      teardown: config.teardown || (() => {}),
      data: config.data || {},
      behaviors: config.behaviors || {},
    });
  }

  /**
   * シナリオを開始
   * @param {string} name - シナリオ名
   * @returns {Promise<void>}
   */
  async startScenario(name) {
    const scenario = this.scenarios.get(name);
    if (!scenario) {
      throw new Error(`Scenario "${name}" not found`);
    }

    this.currentScenario = scenario;
    await scenario.setup();
  }

  /**
   * 現在のシナリオを終了
   * @returns {Promise<void>}
   */
  async endScenario() {
    if (this.currentScenario) {
      await this.currentScenario.teardown();
      this.currentScenario = null;
    }
  }

  /**
   * 現在のシナリオを取得
   * @returns {Object|null} 現在のシナリオ
   */
  getCurrentScenario() {
    return this.currentScenario;
  }

  /**
   * シナリオデータを取得
   * @param {string} key - データキー
   * @returns {*} シナリオデータ
   */
  getScenarioData(key) {
    return this.currentScenario?.data[key];
  }

  /**
   * シナリオの動作を取得
   * @param {string} key - 動作キー
   * @returns {Function|null} 動作関数
   */
  getScenarioBehavior(key) {
    return this.currentScenario?.behaviors[key];
  }
}

/**
 * メインのMockFactoryクラス
 */
class MockFactory {
  constructor() {
    this.scenarioManager = new ScenarioManager();
    this.setupDefaultScenarios();
  }

  /**
   * デフォルトシナリオをセットアップ
   */
  setupDefaultScenarios() {
    // 正常動作シナリオ
    this.scenarioManager.defineScenario("normal", {
      setup: () => console.log("Normal scenario started"),
      teardown: () => console.log("Normal scenario ended"),
      data: {
        settings: TestDataGenerator.createSettings(),
        tabs: [
          TestDataGenerator.createTab({ active: true }),
          TestDataGenerator.createTab({ active: false }),
        ],
      },
      behaviors: {
        storageDelay: () => 10,
        networkSuccess: () => true,
      },
    });

    // エラーシナリオ
    this.scenarioManager.defineScenario("error", {
      setup: () => console.log("Error scenario started"),
      teardown: () => console.log("Error scenario ended"),
      data: {
        settings: null,
        tabs: [],
      },
      behaviors: {
        storageDelay: () => 100,
        networkSuccess: () => false,
        throwError: (message) => {
          throw new Error(message);
        },
      },
    });

    // パフォーマンステストシナリオ
    this.scenarioManager.defineScenario("performance", {
      setup: () => console.log("Performance scenario started"),
      teardown: () => console.log("Performance scenario ended"),
      data: {
        settings: TestDataGenerator.createSettings(),
        tabs: Array.from({ length: 50 }, () => TestDataGenerator.createTab()),
      },
      behaviors: {
        storageDelay: () => 500,
        networkSuccess: () => true,
      },
    });
  }

  /**
   * Loggerのモックを作成
   * @param {Object} options - モックオプション
   * @returns {Object} Loggerモック
   */
  createLoggerMock(options = {}) {
    const logs = [];
    const performanceMarks = new Map();

    return {
      // ログレベル
      LogLevel: {
        ERROR: 0,
        WARN: 1,
        INFO: 2,
        DEBUG: 3,
        TRACE: 4,
      },

      // ログ出力先
      LogDestination: {
        CONSOLE: "console",
        MEMORY: "memory",
        CUSTOM: "custom",
      },

      // ログメソッド
      error: jest.fn((message, ...args) => {
        logs.push({ level: "ERROR", message, args, timestamp: Date.now() });
      }),
      warn: jest.fn((message, ...args) => {
        logs.push({ level: "WARN", message, args, timestamp: Date.now() });
      }),
      info: jest.fn((message, ...args) => {
        logs.push({ level: "INFO", message, args, timestamp: Date.now() });
      }),
      debug: jest.fn((message, ...args) => {
        logs.push({ level: "DEBUG", message, args, timestamp: Date.now() });
      }),
      trace: jest.fn((message, ...args) => {
        logs.push({ level: "TRACE", message, args, timestamp: Date.now() });
      }),

      // パフォーマンス測定
      startPerformance: jest.fn((name) => {
        performanceMarks.set(name, Date.now());
      }),
      endPerformance: jest.fn((name) => {
        const startTime = performanceMarks.get(name);
        if (startTime) {
          const duration = Date.now() - startTime;
          performanceMarks.delete(name);
          return duration;
        }
        return 0;
      }),
      measurePerformance: jest.fn(async (name, fn) => {
        const startTime = Date.now();
        const result = await fn();
        const duration = Date.now() - startTime;
        logs.push({
          level: "INFO",
          message: `Performance: ${name} took ${duration}ms`,
        });
        return result;
      }),

      // フィルター管理
      addFilter: jest.fn(),
      removeFilter: jest.fn(),
      clearFilters: jest.fn(),

      // ミドルウェア
      addMiddleware: jest.fn(),
      removeMiddleware: jest.fn(),

      // 子Logger
      createChild: jest.fn((childContext) => {
        return this.createLoggerMock({ context: childContext });
      }),

      // メモリログ
      getMemoryLogs: jest.fn(() => logs),
      clearMemoryLogs: jest.fn(() => logs.splice(0)),

      // パフォーマンス統計
      getPerformanceStats: jest.fn(() => ({
        count: 1,
        totalDuration: 100,
        averageDuration: 100,
        minDuration: 100,
        maxDuration: 100,
      })),

      // メソッドチェーン対応
      setLevel: jest.fn().mockReturnThis(),

      // テスト用ヘルパー
      _getLogs: () => logs,
      _clearLogs: () => logs.splice(0),
      _getPerformanceMarks: () => performanceMarks,

      ...options,
    };
  }

  /**
   * ErrorHandlerのモックを作成
   * @param {Object} options - モックオプション
   * @returns {Object} ErrorHandlerモック
   */
  createErrorHandlerMock(options = {}) {
    return {
      // Result型
      Result: {
        success: (data) => ({ success: true, data }),
        failure: (error) => ({ success: false, error }),
      },

      // エラータイプ
      ErrorType: {
        INITIALIZATION_ERROR: "INITIALIZATION_ERROR",
        ELEMENT_NOT_FOUND: "ELEMENT_NOT_FOUND",
        STORAGE_ERROR: "STORAGE_ERROR",
        COMMUNICATION_ERROR: "COMMUNICATION_ERROR",
        VALIDATION_ERROR: "VALIDATION_ERROR",
      },

      // エラーハンドリング
      wrapAsync: jest.fn(async (promise) => {
        try {
          const data = await promise;
          return { success: true, data };
        } catch (error) {
          return { success: false, error };
        }
      }),

      categorizeError: jest.fn((error) => ({
        type: "UNKNOWN_ERROR",
        severity: "medium",
        recoverable: true,
        userMessage: "An error occurred",
      })),

      getUserMessage: jest.fn((error) => "An error occurred"),

      // AppError
      AppError: class MockAppError extends Error {
        constructor(type, message, details = {}) {
          super(message);
          this.type = type;
          this.details = details;
        }
      },

      ...options,
    };
  }

  /**
   * StorageAdapterのモックを作成
   * @param {Object} options - モックオプション
   * @returns {Object} StorageAdapterモック
   */
  createStorageAdapterMock(options = {}) {
    const storage = new Map();
    const scenario = this.scenarioManager.getCurrentScenario();

    return {
      // ストレージタイプ
      StorageType: {
        SYNC: "sync",
        LOCAL: "local",
      },

      // ストレージ操作
      get: jest.fn(async (keys) => {
        const delay = scenario?.behaviors.storageDelay?.() || 0;
        await new Promise((resolve) => setTimeout(resolve, delay));

        if (scenario?.behaviors.networkSuccess?.() === false) {
          throw new Error("Storage operation failed");
        }

        const result = {};
        const keyArray = Array.isArray(keys) ? keys : [keys];

        for (const key of keyArray) {
          if (storage.has(key)) {
            result[key] = storage.get(key);
          }
        }

        return { success: true, data: result };
      }),

      set: jest.fn(async (items) => {
        const delay = scenario?.behaviors.storageDelay?.() || 0;
        await new Promise((resolve) => setTimeout(resolve, delay));

        if (scenario?.behaviors.networkSuccess?.() === false) {
          throw new Error("Storage operation failed");
        }

        for (const [key, value] of Object.entries(items)) {
          storage.set(key, value);
        }

        return { success: true };
      }),

      remove: jest.fn(async (keys) => {
        const delay = scenario?.behaviors.storageDelay?.() || 0;
        await new Promise((resolve) => setTimeout(resolve, delay));

        const keyArray = Array.isArray(keys) ? keys : [keys];
        for (const key of keyArray) {
          storage.delete(key);
        }

        return { success: true };
      }),

      clear: jest.fn(async () => {
        const delay = scenario?.behaviors.storageDelay?.() || 0;
        await new Promise((resolve) => setTimeout(resolve, delay));

        storage.clear();
        return { success: true };
      }),

      // イベント
      onChanged: {
        addListener: jest.fn(),
        removeListener: jest.fn(),
      },

      // テスト用ヘルパー
      _getStorage: () => storage,
      _setStorage: (key, value) => storage.set(key, value),
      _clearStorage: () => storage.clear(),

      ...options,
    };
  }

  /**
   * MessageBusのモックを作成
   * @param {Object} options - モックオプション
   * @returns {Object} MessageBusモック
   */
  createMessageBusMock(options = {}) {
    const handlers = new Map();
    const messages = [];

    return {
      // メッセージタイプ
      MessageType: {
        SYSTEM_INIT: "SYSTEM_INIT",
        SYSTEM_READY: "SYSTEM_READY",
        SETTINGS_GET: "SETTINGS_GET",
        SETTINGS_SET: "SETTINGS_SET",
        THEATER_MODE_TOGGLE: "THEATER_MODE_TOGGLE",
        TAB_ACTIVATED: "TAB_ACTIVATED",
      },

      // ハンドラー管理
      registerHandler: jest.fn((type, handler) => {
        if (!handlers.has(type)) {
          handlers.set(type, []);
        }
        handlers.get(type).push(handler);
      }),

      unregisterHandler: jest.fn((type, handler) => {
        if (handlers.has(type)) {
          const handlerList = handlers.get(type);
          const index = handlerList.indexOf(handler);
          if (index > -1) {
            handlerList.splice(index, 1);
          }
        }
      }),

      // メッセージ送信
      sendMessage: jest.fn(async (message, target) => {
        messages.push({ message, target, timestamp: Date.now() });

        const scenario = this.scenarioManager.getCurrentScenario();
        if (scenario?.behaviors.networkSuccess?.() === false) {
          throw new Error("Message sending failed");
        }

        return { success: true, response: "Message sent" };
      }),

      // メッセージ受信
      receiveMessage: jest.fn(async (message, sender) => {
        const handlerList = handlers.get(message.type) || [];
        const responses = [];

        for (const handler of handlerList) {
          try {
            const response = await handler(message, sender);
            responses.push(response);
          } catch (error) {
            responses.push({ success: false, error });
          }
        }

        return responses.length > 0 ? responses[0] : { success: true };
      }),

      // ミドルウェア
      addMiddleware: jest.fn(),
      removeMiddleware: jest.fn(),

      // テスト用ヘルパー
      _getHandlers: () => handlers,
      _getMessages: () => messages,
      _clearMessages: () => messages.splice(0),

      ...options,
    };
  }

  /**
   * SettingsManagerのモックを作成
   * @param {Object} options - モックオプション
   * @returns {Object} SettingsManagerモック
   */
  createSettingsManagerMock(options = {}) {
    const scenario = this.scenarioManager.getCurrentScenario();
    const defaultSettings =
      scenario?.data.settings || TestDataGenerator.createSettings();

    return {
      // スキーマタイプ
      SchemaType: {
        STRING: "string",
        NUMBER: "number",
        BOOLEAN: "boolean",
        OBJECT: "object",
        ARRAY: "array",
      },

      // 設定操作
      loadSettings: jest.fn(async () => {
        const delay = scenario?.behaviors.storageDelay?.() || 0;
        await new Promise((resolve) => setTimeout(resolve, delay));

        if (scenario?.behaviors.networkSuccess?.() === false) {
          throw new Error("Failed to load settings");
        }

        return { success: true, data: defaultSettings };
      }),

      saveSettings: jest.fn(async (settings) => {
        const delay = scenario?.behaviors.storageDelay?.() || 0;
        await new Promise((resolve) => setTimeout(resolve, delay));

        if (scenario?.behaviors.networkSuccess?.() === false) {
          throw new Error("Failed to save settings");
        }

        Object.assign(defaultSettings, settings);
        return { success: true };
      }),

      validateSettings: jest.fn((settings) => {
        // 基本的なバリデーション
        if (
          typeof settings.opacity === "number" &&
          settings.opacity >= 0 &&
          settings.opacity <= 1
        ) {
          return { success: true, data: settings };
        }
        return { success: false, error: new Error("Invalid settings") };
      }),

      getSettingsSchema: jest.fn(() => ({
        opacity: { type: "number", min: 0, max: 0.9, default: 0.7 },
        keyboardShortcut: { type: "string", default: "t" },
        theaterModeEnabled: { type: "boolean", default: false },
        version: { type: "string", default: "1.0.0" },
      })),

      // 設定移行
      migrateSettings: jest.fn(async (settings, fromVersion, toVersion) => {
        return { success: true, data: settings };
      }),

      // イベント
      onSettingsChanged: {
        addListener: jest.fn(),
        removeListener: jest.fn(),
      },

      // テスト用ヘルパー
      _getSettings: () => defaultSettings,
      _setSettings: (settings) => Object.assign(defaultSettings, settings),

      ...options,
    };
  }

  /**
   * StateStoreのモックを作成
   * @param {Object} options - モックオプション
   * @returns {Object} StateStoreモック
   */
  createStateStoreMock(options = {}) {
    let state = {
      theaterMode: {
        isEnabled: false,
        opacity: 0.7,
        isInitialized: false,
        lastUpdated: 0,
      },
      tabs: {
        activeTabId: null,
        tabStates: new Map(),
        lastSync: 0,
      },
      ui: {
        popupOpen: false,
        connectionStatus: "disconnected",
        lastError: null,
      },
    };

    const listeners = new Set();

    return {
      // アクション
      Actions: {
        TOGGLE_THEATER_MODE: "TOGGLE_THEATER_MODE",
        UPDATE_OPACITY: "UPDATE_OPACITY",
        SYNC_TAB_STATE: "SYNC_TAB_STATE",
        INITIALIZE_EXTENSION: "INITIALIZE_EXTENSION",
      },

      // 状態管理
      dispatch: jest.fn(async (action) => {
        // アクションに基づいて状態を更新
        switch (action.type) {
          case "TOGGLE_THEATER_MODE":
            state.theaterMode.isEnabled = !state.theaterMode.isEnabled;
            break;
          case "UPDATE_OPACITY":
            state.theaterMode.opacity = action.payload.opacity;
            break;
        }

        // リスナーに通知
        for (const listener of listeners) {
          listener(state);
        }

        return { success: true, data: state };
      }),

      subscribe: jest.fn((listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      }),

      getState: jest.fn(() => state),

      // ミドルウェア
      addMiddleware: jest.fn(),
      removeMiddleware: jest.fn(),

      // テスト用ヘルパー
      _setState: (newState) => {
        state = { ...state, ...newState };
      },
      _getListeners: () => listeners,
      _clearListeners: () => listeners.clear(),

      ...options,
    };
  }

  /**
   * ElementManagerのモックを作成
   * @param {Object} options - モックオプション
   * @returns {Object} ElementManagerモック
   */
  createElementManagerMock(options = {}) {
    const mockElements = new Map([
      ["movie_player", { id: "movie_player", className: "html5-video-player" }],
      ["secondary", { id: "secondary", className: "secondary" }],
      ["comments", { id: "comments", className: "comments" }],
      ["masthead", { id: "masthead", className: "masthead" }],
    ]);

    return {
      // 要素検出
      detectVideoPlayer: jest.fn(async () => {
        const scenario = this.scenarioManager.getCurrentScenario();
        if (scenario?.behaviors.networkSuccess?.() === false) {
          return { success: false, error: new Error("Element not found") };
        }
        return { success: true, data: mockElements.get("movie_player") };
      }),

      detectOverlayTargets: jest.fn(async () => {
        const targets = ["secondary", "comments", "masthead"]
          .map((id) => mockElements.get(id))
          .filter(Boolean);
        return { success: true, data: targets };
      }),

      // 要素監視
      observeElement: jest.fn((element, callback) => {
        // 監視停止関数を返す
        return () => {};
      }),

      // セレクター管理
      getSelectors: jest.fn(() => ({
        videoPlayer: ["#movie_player", ".html5-video-player"],
        overlayTargets: ["#secondary", "#comments", "#masthead"],
        protectedElements: [".ytp-chrome-controls", ".video-stream"],
      })),

      // キャッシュ管理
      clearCache: jest.fn(),
      getCacheStats: jest.fn(() => ({
        size: mockElements.size,
        hitRate: 0.95,
      })),

      // テスト用ヘルパー
      _getMockElements: () => mockElements,
      _setMockElement: (id, element) => mockElements.set(id, element),

      ...options,
    };
  }

  /**
   * 完全なChrome APIモックを作成
   * @param {Object} options - モックオプション
   * @returns {Object} Chrome APIモック
   */
  createChromeApiMock(options = {}) {
    const storage = {
      sync: new Map(),
      local: new Map(),
    };
    const tabs = new Map();
    const listeners = {
      storage: [],
      tabs: [],
      runtime: [],
    };

    return {
      storage: {
        sync: {
          get: jest.fn((keys, callback) => {
            const result = this._getStorageData(storage.sync, keys);
            if (callback) setTimeout(() => callback(result), 0);
            return Promise.resolve(result);
          }),
          set: jest.fn((items, callback) => {
            this._setStorageData(
              storage.sync,
              items,
              listeners.storage,
              "sync"
            );
            if (callback) setTimeout(callback, 0);
            return Promise.resolve();
          }),
          remove: jest.fn((keys, callback) => {
            this._removeStorageData(
              storage.sync,
              keys,
              listeners.storage,
              "sync"
            );
            if (callback) setTimeout(callback, 0);
            return Promise.resolve();
          }),
          clear: jest.fn((callback) => {
            storage.sync.clear();
            if (callback) setTimeout(callback, 0);
            return Promise.resolve();
          }),
          onChanged: {
            addListener: jest.fn((callback) =>
              listeners.storage.push(callback)
            ),
            removeListener: jest.fn((callback) => {
              const index = listeners.storage.indexOf(callback);
              if (index > -1) listeners.storage.splice(index, 1);
            }),
          },
        },
        local: {
          get: jest.fn((keys, callback) => {
            const result = this._getStorageData(storage.local, keys);
            if (callback) setTimeout(() => callback(result), 0);
            return Promise.resolve(result);
          }),
          set: jest.fn((items, callback) => {
            this._setStorageData(
              storage.local,
              items,
              listeners.storage,
              "local"
            );
            if (callback) setTimeout(callback, 0);
            return Promise.resolve();
          }),
          remove: jest.fn((keys, callback) => {
            this._removeStorageData(
              storage.local,
              keys,
              listeners.storage,
              "local"
            );
            if (callback) setTimeout(callback, 0);
            return Promise.resolve();
          }),
          clear: jest.fn((callback) => {
            storage.local.clear();
            if (callback) setTimeout(callback, 0);
            return Promise.resolve();
          }),
        },
      },

      tabs: {
        query: jest.fn((queryInfo, callback) => {
          const result = Array.from(tabs.values()).filter((tab) => {
            if (
              queryInfo.active !== undefined &&
              tab.active !== queryInfo.active
            )
              return false;
            if (
              queryInfo.url &&
              !new RegExp(queryInfo.url.replace(/\*/g, ".*")).test(tab.url)
            )
              return false;
            return true;
          });
          if (callback) setTimeout(() => callback(result), 0);
          return Promise.resolve(result);
        }),
        get: jest.fn((tabId, callback) => {
          const tab = tabs.get(tabId);
          if (callback) setTimeout(() => callback(tab), 0);
          return Promise.resolve(tab);
        }),
        sendMessage: jest.fn((tabId, message, callback) => {
          const response = { success: true, tabId, message };
          if (callback) setTimeout(() => callback(response), 0);
          return Promise.resolve(response);
        }),
        onUpdated: {
          addListener: jest.fn((callback) => listeners.tabs.push(callback)),
          removeListener: jest.fn((callback) => {
            const index = listeners.tabs.indexOf(callback);
            if (index > -1) listeners.tabs.splice(index, 1);
          }),
        },
      },

      runtime: {
        sendMessage: jest.fn((message, callback) => {
          const response = { success: true, message };
          if (callback) setTimeout(() => callback(response), 0);
          return Promise.resolve(response);
        }),
        onMessage: {
          addListener: jest.fn((callback) => listeners.runtime.push(callback)),
          removeListener: jest.fn((callback) => {
            const index = listeners.runtime.indexOf(callback);
            if (index > -1) listeners.runtime.splice(index, 1);
          }),
        },
        getManifest: jest.fn(() => ({
          version: "1.0.0",
          name: "YouTube Theater Mode Test",
        })),
        id: "test-extension-id",
        lastError: null,
      },

      // テスト用ヘルパー
      _addTab: (tab) => {
        const tabId = tab.id || Date.now();
        const mockTab = { id: tabId, ...tab };
        tabs.set(tabId, mockTab);
        return mockTab;
      },
      _getStorage: (type) => storage[type],
      _clearAllStorage: () => {
        storage.sync.clear();
        storage.local.clear();
      },

      ...options,
    };
  }

  /**
   * ストレージデータ取得のヘルパー
   * @private
   */
  _getStorageData(storage, keys) {
    const result = {};
    if (keys === null || keys === undefined) {
      for (const [key, value] of storage) {
        result[key] = value;
      }
    } else if (typeof keys === "string") {
      if (storage.has(keys)) {
        result[keys] = storage.get(keys);
      }
    } else if (Array.isArray(keys)) {
      for (const key of keys) {
        if (storage.has(key)) {
          result[key] = storage.get(key);
        }
      }
    } else if (typeof keys === "object") {
      for (const [key, defaultValue] of Object.entries(keys)) {
        result[key] = storage.has(key) ? storage.get(key) : defaultValue;
      }
    }
    return result;
  }

  /**
   * ストレージデータ設定のヘルパー
   * @private
   */
  _setStorageData(storage, items, listeners, storageType) {
    const changes = {};
    for (const [key, newValue] of Object.entries(items)) {
      const oldValue = storage.get(key);
      storage.set(key, newValue);
      changes[key] = { newValue, oldValue };
    }

    for (const listener of listeners) {
      setTimeout(() => listener(changes, storageType), 0);
    }
  }

  /**
   * ストレージデータ削除のヘルパー
   * @private
   */
  _removeStorageData(storage, keys, listeners, storageType) {
    const changes = {};
    const keysArray = Array.isArray(keys) ? keys : [keys];

    for (const key of keysArray) {
      if (storage.has(key)) {
        const oldValue = storage.get(key);
        storage.delete(key);
        changes[key] = { oldValue };
      }
    }

    if (Object.keys(changes).length > 0) {
      for (const listener of listeners) {
        setTimeout(() => listener(changes, storageType), 0);
      }
    }
  }

  /**
   * シナリオマネージャーを取得
   * @returns {ScenarioManager} シナリオマネージャー
   */
  getScenarioManager() {
    return this.scenarioManager;
  }

  /**
   * テストデータジェネレーターを取得
   * @returns {TestDataGenerator} テストデータジェネレーター
   */
  getTestDataGenerator() {
    return TestDataGenerator;
  }
}

// Jest関数のモック（Jest環境でない場合）
if (typeof jest === "undefined") {
  global.jest = {
    fn: (implementation) => {
      const mockFn = implementation || (() => {});
      mockFn.mockReturnValue = (value) => {
        mockFn._mockReturnValue = value;
        return mockFn;
      };
      mockFn.mockReturnThis = () => {
        mockFn._mockReturnThis = true;
        return mockFn;
      };
      mockFn.mockResolvedValue = (value) => {
        mockFn._mockResolvedValue = value;
        return mockFn;
      };
      mockFn.mockRejectedValue = (value) => {
        mockFn._mockRejectedValue = value;
        return mockFn;
      };
      return mockFn;
    },
  };
}

// エクスポート
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    MockFactory,
    TestDataGenerator,
    ScenarioManager,
  };
}

if (typeof window !== "undefined") {
  window.MockFactory = MockFactory;
  window.TestDataGenerator = TestDataGenerator;
  window.ScenarioManager = ScenarioManager;
}
