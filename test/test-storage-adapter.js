/**
 * StorageAdapter の単体テスト
 */

// テストフレームワーク
class TestFramework {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log("Running StorageAdapter tests...\n");

    for (const test of this.tests) {
      try {
        await test.fn();
        console.log(`✓ ${test.name}`);
        this.passed++;
      } catch (error) {
        console.error(`✗ ${test.name}: ${error.message}`);
        console.error(error.stack);
        this.failed++;
      }
    }

    console.log(`\nTest Results: ${this.passed} passed, ${this.failed} failed`);
    return this.failed === 0;
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(message || "Assertion failed");
    }
  }

  assertEqual(actual, expected, message) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(
        message ||
          `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
      );
    }
  }

  assertContains(container, item, message) {
    if (!container.includes(item)) {
      throw new Error(message || `Expected container to include ${item}`);
    }
  }
}

// モックロガー
class MockLogger {
  constructor() {
    this.logs = [];
    this.errors = [];
    this.warns = [];
    this.infos = [];
    this.debugs = [];
  }

  log(message, data) {
    this.logs.push({ message, data });
  }

  error(message, data) {
    this.errors.push({ message, data });
  }

  warn(message, data) {
    this.warns.push({ message, data });
  }

  info(message, data) {
    this.infos.push({ message, data });
  }

  debug(message, data) {
    this.debugs.push({ message, data });
  }

  clear() {
    this.logs = [];
    this.errors = [];
    this.warns = [];
    this.infos = [];
    this.debugs = [];
  }
}

// モックChrome Storage API
class MockChromeStorage {
  constructor() {
    this.data = {};
    this.listeners = [];
    this.lastError = null;
  }

  get(keys, callback) {
    setTimeout(() => {
      if (this.lastError) {
        callback({});
        return;
      }

      const result = {};
      if (keys === null) {
        // 全てのキーを取得
        Object.assign(result, this.data);
      } else if (Array.isArray(keys)) {
        // 複数のキーを取得
        for (const key of keys) {
          if (this.data[key] !== undefined) {
            result[key] = this.data[key];
          }
        }
      } else if (typeof keys === "string") {
        // 単一のキーを取得
        if (this.data[keys] !== undefined) {
          result[keys] = this.data[keys];
        }
      } else if (typeof keys === "object") {
        // オブジェクトの場合はキーを取得
        for (const key of Object.keys(keys)) {
          if (this.data[key] !== undefined) {
            result[key] = this.data[key];
          } else {
            result[key] = keys[key]; // デフォルト値
          }
        }
      }
      callback(result);
    }, 0);
  }

  set(items, callback) {
    setTimeout(() => {
      if (this.lastError) {
        callback();
        return;
      }

      const changes = {};
      for (const [key, value] of Object.entries(items)) {
        const oldValue = this.data[key];
        this.data[key] = value;
        changes[key] = { oldValue, newValue: value };
      }

      // 変更リスナーに通知
      if (Object.keys(changes).length > 0) {
        for (const listener of this.listeners) {
          listener(changes, "sync");
        }
      }

      callback();
    }, 0);
  }

  remove(keys, callback) {
    setTimeout(() => {
      if (this.lastError) {
        callback();
        return;
      }

      const changes = {};
      if (Array.isArray(keys)) {
        for (const key of keys) {
          if (this.data[key] !== undefined) {
            const oldValue = this.data[key];
            delete this.data[key];
            changes[key] = { oldValue, newValue: undefined };
          }
        }
      } else if (typeof keys === "string") {
        if (this.data[keys] !== undefined) {
          const oldValue = this.data[keys];
          delete this.data[keys];
          changes[keys] = { oldValue, newValue: undefined };
        }
      }

      // 変更リスナーに通知
      if (Object.keys(changes).length > 0) {
        for (const listener of this.listeners) {
          listener(changes, "sync");
        }
      }

      callback();
    }, 0);
  }

  clear(callback) {
    setTimeout(() => {
      if (this.lastError) {
        callback();
        return;
      }

      const changes = {};
      for (const [key, value] of Object.entries(this.data)) {
        changes[key] = { oldValue: value, newValue: undefined };
      }

      this.data = {};

      // 変更リスナーに通知
      if (Object.keys(changes).length > 0) {
        for (const listener of this.listeners) {
          listener(changes, "sync");
        }
      }

      callback();
    }, 0);
  }

  addListener(listener) {
    this.listeners.push(listener);
  }

  removeListener(listener) {
    const index = this.listeners.indexOf(listener);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }

  setLastError(error) {
    this.lastError = error;
  }

  clearLastError() {
    this.lastError = null;
  }
}

// モックChrome API
class MockChromeAPI {
  constructor() {
    this.storage = {
      sync: new MockChromeStorage(),
      local: new MockChromeStorage(),
      session: new MockChromeStorage(),
      onChanged: {
        addListener: (listener) => {
          this.storage.sync.addListener(listener);
          this.storage.local.addListener(listener);
          this.storage.session.addListener(listener);
        },
        removeListener: (listener) => {
          this.storage.sync.removeListener(listener);
          this.storage.local.removeListener(listener);
          this.storage.session.removeListener(listener);
        },
      },
    };

    this.runtime = {
      lastError: null,
    };
  }
}

// モックLocalStorage
class MockLocalStorage {
  constructor() {
    this.items = {};
    this.length = 0;
  }

  getItem(key) {
    return this.items[key] === undefined ? null : this.items[key];
  }

  setItem(key, value) {
    this.items[key] = String(value);
    this.length = Object.keys(this.items).length;
  }

  removeItem(key) {
    delete this.items[key];
    this.length = Object.keys(this.items).length;
  }

  clear() {
    this.items = {};
    this.length = 0;
  }

  key(index) {
    return Object.keys(this.items)[index] || null;
  }
}

// テスト実行
async function runStorageAdapterTests() {
  const framework = new TestFramework();
  const mockLogger = new MockLogger();

  // グローバルなChromeオブジェクトをモック
  const originalChrome = typeof chrome !== "undefined" ? chrome : undefined;
  const mockChrome = new MockChromeAPI();
  global.chrome = mockChrome;

  // グローバルなlocalStorageとsessionStorageをモック
  const originalLocalStorage =
    typeof localStorage !== "undefined" ? localStorage : undefined;
  const originalSessionStorage =
    typeof sessionStorage !== "undefined" ? sessionStorage : undefined;
  global.localStorage = new MockLocalStorage();
  global.sessionStorage = new MockLocalStorage();

  try {
    // StorageTypeの定義テスト
    framework.test("StorageType enum definition", () => {
      framework.assertEqual(StorageType.SYNC, "sync", "SYNC should be 'sync'");
      framework.assertEqual(
        StorageType.LOCAL,
        "local",
        "LOCAL should be 'local'"
      );
      framework.assertEqual(
        StorageType.SESSION,
        "session",
        "SESSION should be 'session'"
      );
      framework.assertEqual(
        StorageType.MEMORY,
        "memory",
        "MEMORY should be 'memory'"
      );
    });

    // StorageAdapterの作成テスト
    framework.test("StorageAdapter creation", () => {
      const adapter = new StorageAdapter({
        namespace: "test",
        logger: mockLogger,
      });

      framework.assertEqual(
        adapter.namespace,
        "test",
        "Namespace should be set"
      );
      framework.assertEqual(
        adapter.preferredType,
        StorageType.SYNC,
        "Default preferred type should be SYNC"
      );
      framework.assert(
        adapter.availableTypes.includes(StorageType.MEMORY),
        "MEMORY should be available"
      );
      framework.assert(
        adapter.memoryStorage instanceof Map,
        "Memory storage should be a Map"
      );
    });

    // メモリストレージの基本操作テスト
    framework.test("Memory storage basic operations", async () => {
      const adapter = new StorageAdapter({
        namespace: "test",
        preferredType: StorageType.MEMORY,
        logger: mockLogger,
      });

      // 値の設定
      const setResult = await adapter.set("testKey", { value: "test" });
      framework.assert(setResult.success, "Set should succeed");

      // 値の取得
      const getResult = await adapter.get("testKey");
      framework.assert(getResult.success, "Get should succeed");
      framework.assertEqual(
        getResult.data,
        { value: "test" },
        "Retrieved value should match"
      );

      // 値の削除
      const removeResult = await adapter.remove("testKey");
      framework.assert(removeResult.success, "Remove should succeed");

      // 削除後の取得
      const getAfterRemoveResult = await adapter.get("testKey");
      framework.assert(
        getAfterRemoveResult.success,
        "Get after remove should succeed"
      );
      framework.assertEqual(
        getAfterRemoveResult.data,
        undefined,
        "Value should be undefined after remove"
      );
    });

    // デフォルト値のテスト
    framework.test("Default value", async () => {
      const adapter = new StorageAdapter({
        namespace: "test",
        preferredType: StorageType.MEMORY,
        logger: mockLogger,
      });

      // 存在しないキーの取得（デフォルト値あり）
      const getWithDefaultResult = await adapter.get("nonExistentKey", {
        defaultValue: { default: true },
      });
      framework.assert(
        getWithDefaultResult.success,
        "Get with default should succeed"
      );
      framework.assertEqual(
        getWithDefaultResult.data,
        { default: true },
        "Default value should be returned"
      );

      // 存在しないキーの取得（デフォルト値なし）
      const getWithoutDefaultResult = await adapter.get("nonExistentKey");
      framework.assert(
        getWithoutDefaultResult.success,
        "Get without default should succeed"
      );
      framework.assertEqual(
        getWithoutDefaultResult.data,
        undefined,
        "Undefined should be returned"
      );
    });

    // 複数キー操作のテスト
    framework.test("Multiple key operations", async () => {
      const adapter = new StorageAdapter({
        namespace: "test",
        preferredType: StorageType.MEMORY,
        logger: mockLogger,
      });

      // 複数の値を設定
      const setMultipleResult = await adapter.setMultiple({
        key1: "value1",
        key2: "value2",
        key3: "value3",
      });
      framework.assert(
        setMultipleResult.success,
        "Set multiple should succeed"
      );

      // 複数の値を取得
      const getMultipleResult = await adapter.getMultiple([
        "key1",
        "key2",
        "key3",
      ]);
      framework.assert(
        getMultipleResult.success,
        "Get multiple should succeed"
      );
      framework.assertEqual(
        getMultipleResult.data,
        {
          key1: "value1",
          key2: "value2",
          key3: "value3",
        },
        "Retrieved values should match"
      );

      // 複数の値を削除
      const removeMultipleResult = await adapter.removeMultiple([
        "key1",
        "key2",
      ]);
      framework.assert(
        removeMultipleResult.success,
        "Remove multiple should succeed"
      );

      // 削除後の取得
      const getAfterRemoveResult = await adapter.getMultiple([
        "key1",
        "key2",
        "key3",
      ]);
      framework.assert(
        getAfterRemoveResult.success,
        "Get after remove should succeed"
      );
      framework.assertEqual(
        getAfterRemoveResult.data,
        {
          key3: "value3",
        },
        "Only key3 should remain"
      );
    });

    // 変更リスナーのテスト
    framework.test("Change listeners", async () => {
      const adapter = new StorageAdapter({
        namespace: "test",
        preferredType: StorageType.MEMORY,
        logger: mockLogger,
      });

      let listenerCalled = false;
      let newValue = null;
      let oldValue = null;

      // 変更リスナーを登録
      const removeListener = adapter.onChange("listenKey", (newVal, oldVal) => {
        listenerCalled = true;
        newValue = newVal;
        oldValue = oldVal;
      });

      // 値を設定
      await adapter.set("listenKey", "initial");
      framework.assert(listenerCalled, "Listener should be called on set");
      framework.assertEqual(
        newValue,
        "initial",
        "New value should be passed to listener"
      );
      framework.assertEqual(
        oldValue,
        undefined,
        "Old value should be undefined"
      );

      // リスナー状態をリセット
      listenerCalled = false;
      newValue = null;
      oldValue = null;

      // 値を更新
      await adapter.set("listenKey", "updated");
      framework.assert(listenerCalled, "Listener should be called on update");
      framework.assertEqual(
        newValue,
        "updated",
        "New value should be passed to listener"
      );
      framework.assertEqual(
        oldValue,
        "initial",
        "Old value should be passed to listener"
      );

      // リスナー状態をリセット
      listenerCalled = false;
      newValue = null;
      oldValue = null;

      // 値を削除
      await adapter.remove("listenKey");
      framework.assert(listenerCalled, "Listener should be called on remove");
      framework.assertEqual(
        newValue,
        undefined,
        "New value should be undefined"
      );
      framework.assertEqual(
        oldValue,
        "updated",
        "Old value should be passed to listener"
      );

      // リスナーを削除
      removeListener();

      // リスナー状態をリセット
      listenerCalled = false;
      newValue = null;
      oldValue = null;

      // 値を設定（リスナー削除後）
      await adapter.set("listenKey", "after-remove");
      framework.assert(
        !listenerCalled,
        "Listener should not be called after removal"
      );
    });

    // ワイルドカードリスナーのテスト
    framework.test("Wildcard listeners", async () => {
      const adapter = new StorageAdapter({
        namespace: "test",
        preferredType: StorageType.MEMORY,
        logger: mockLogger,
      });

      const changes = [];

      // ワイルドカードリスナーを登録
      const removeListener = adapter.onChange("*", (newVal, oldVal, info) => {
        changes.push({
          key: info.key,
          newValue: newVal,
          oldValue: oldVal,
        });
      });

      // 複数の値を設定
      await adapter.setMultiple({
        wild1: "value1",
        wild2: "value2",
      });

      framework.assertEqual(
        changes.length,
        2,
        "Wildcard listener should be called for each key"
      );
      framework.assert(
        changes.some((c) => c.key === "wild1" && c.newValue === "value1"),
        "wild1 change should be captured"
      );
      framework.assert(
        changes.some((c) => c.key === "wild2" && c.newValue === "value2"),
        "wild2 change should be captured"
      );

      // リスナーを削除
      removeListener();
    });

    // クリア操作のテスト
    framework.test("Clear operation", async () => {
      const adapter = new StorageAdapter({
        namespace: "test",
        preferredType: StorageType.MEMORY,
        logger: mockLogger,
      });

      // 複数の値を設定
      await adapter.setMultiple({
        clear1: "value1",
        clear2: "value2",
        clear3: "value3",
      });

      // 全てクリア
      const clearResult = await adapter.clear();
      framework.assert(clearResult.success, "Clear should succeed");

      // クリア後の取得
      const getResult = await adapter.get("clear1");
      framework.assertEqual(
        getResult.data,
        undefined,
        "Value should be undefined after clear"
      );
    });

    await framework.run();
    return framework.failed === 0;
  } catch (error) {
    console.error("Unexpected error in tests:", error);
    return false;
  } finally {
    // グローバルなオブジェクトを復元
    if (originalChrome !== undefined) {
      global.chrome = originalChrome;
    } else {
      delete global.chrome;
    }

    if (originalLocalStorage !== undefined) {
      global.localStorage = originalLocalStorage;
    } else {
      delete global.localStorage;
    }

    if (originalSessionStorage !== undefined) {
      global.sessionStorage = originalSessionStorage;
    } else {
      delete global.sessionStorage;
    }
  }
}

// テスト実行用の関数をグローバルに公開
if (typeof window !== "undefined") {
  window.runStorageAdapterTests = runStorageAdapterTests;
} else if (typeof module !== "undefined" && module.exports) {
  module.exports = { runStorageAdapterTests };
}
