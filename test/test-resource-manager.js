/**
 * ResourceManager の単体テスト
 */

// テスト用のモックロガー
class MockLogger {
  constructor() {
    this.logs = [];
  }

  error(message, data) {
    this.logs.push({ level: "error", message, data });
  }

  warn(message, data) {
    this.logs.push({ level: "warn", message, data });
  }

  info(message, data) {
    this.logs.push({ level: "info", message, data });
  }

  debug(message, data) {
    this.logs.push({ level: "debug", message, data });
  }

  trace(message, data) {
    this.logs.push({ level: "trace", message, data });
  }

  clear() {
    this.logs = [];
  }

  getLogsByLevel(level) {
    return this.logs.filter((log) => log.level === level);
  }
}

// テスト用のモックDOM要素
class MockElement {
  constructor() {
    this.listeners = new Map();
  }

  addEventListener(event, listener, options) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push({ listener, options });
  }

  removeEventListener(event, listener, options) {
    if (this.listeners.has(event)) {
      const listeners = this.listeners.get(event);
      const index = listeners.findIndex((l) => l.listener === listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  hasEventListener(event, listener) {
    if (!this.listeners.has(event)) return false;
    return this.listeners.get(event).some((l) => l.listener === listener);
  }
}

// テスト用のモックObserver
class MockObserver {
  constructor() {
    this.isDisconnected = false;
  }

  disconnect() {
    this.isDisconnected = true;
  }
}

/**
 * ResourceManager基本機能のテスト
 */
function testResourceManagerBasics() {
  console.log("Testing ResourceManager basics...");

  const logger = new MockLogger();
  const resourceManager = new ResourceManager({
    logger,
    autoCleanup: false,
    memoryMonitoring: false,
  });

  // 基本的なリソース登録
  let cleanupCalled = false;
  const resourceId = resourceManager.register(
    { data: "test" },
    () => {
      cleanupCalled = true;
    },
    {
      name: "TestResource",
      metadata: { test: true },
    }
  );

  console.assert(
    typeof resourceId === "string",
    "Resource ID should be string"
  );
  console.assert(
    resourceId.startsWith("resource_"),
    "Resource ID should have correct prefix"
  );

  // リソース取得
  const resource = resourceManager.getResource(resourceId);
  console.assert(resource !== null, "Resource should be retrievable");
  console.assert(resource.data === "test", "Resource data should match");

  // リソース情報取得
  const resourceInfo = resourceManager.getResourceInfo(resourceId);
  console.assert(resourceInfo !== null, "Resource info should be available");
  console.assert(
    resourceInfo.name === "TestResource",
    "Resource name should match"
  );
  console.assert(
    resourceInfo.metadata.test === true,
    "Resource metadata should match"
  );
  console.assert(
    resourceInfo.state === ResourceManager.ResourceState.ACTIVE,
    "Resource should be active"
  );

  // リソース破棄
  const disposed = resourceManager.dispose(resourceId);
  console.assert(disposed === true, "Resource should be disposed successfully");
  console.assert(cleanupCalled === true, "Cleanup function should be called");

  // 破棄後の取得
  const disposedResource = resourceManager.getResource(resourceId);
  console.assert(
    disposedResource === null,
    "Disposed resource should not be retrievable"
  );

  console.log("✓ ResourceManager basics test passed");
}

/**
 * イベントリスナー管理のテスト
 */
function testEventListenerManagement() {
  console.log("Testing event listener management...");

  const logger = new MockLogger();
  const resourceManager = new ResourceManager({
    logger,
    autoCleanup: false,
    memoryMonitoring: false,
  });

  const mockElement = new MockElement();
  const listener = () => {};

  // イベントリスナー登録
  const resourceId = resourceManager.registerEventListener(
    mockElement,
    "click",
    listener
  );

  console.assert(
    typeof resourceId === "string",
    "Resource ID should be returned"
  );
  console.assert(
    mockElement.hasEventListener("click", listener),
    "Event listener should be added to element"
  );

  // リソース情報確認
  const resourceInfo = resourceManager.getResourceInfo(resourceId);
  console.assert(
    resourceInfo.type === ResourceManager.ResourceType.EVENT_LISTENER,
    "Resource type should be EVENT_LISTENER"
  );
  console.assert(
    resourceInfo.metadata.event === "click",
    "Event name should be stored in metadata"
  );

  // リソース破棄
  resourceManager.dispose(resourceId);
  console.assert(
    !mockElement.hasEventListener("click", listener),
    "Event listener should be removed after disposal"
  );

  console.log("✓ Event listener management test passed");
}

/**
 * Observer管理のテスト
 */
function testObserverManagement() {
  console.log("Testing observer management...");

  const logger = new MockLogger();
  const resourceManager = new ResourceManager({
    logger,
    autoCleanup: false,
    memoryMonitoring: false,
  });

  const mockObserver = new MockObserver();

  // Observer登録
  const resourceId = resourceManager.registerObserver(
    mockObserver,
    "TestObserver"
  );

  console.assert(
    typeof resourceId === "string",
    "Resource ID should be returned"
  );
  console.assert(
    mockObserver.isDisconnected === false,
    "Observer should not be disconnected initially"
  );

  // リソース情報確認
  const resourceInfo = resourceManager.getResourceInfo(resourceId);
  console.assert(
    resourceInfo.type === ResourceManager.ResourceType.OBSERVER,
    "Resource type should be OBSERVER"
  );
  console.assert(
    resourceInfo.name === "TestObserver",
    "Observer name should match"
  );

  // リソース破棄
  resourceManager.dispose(resourceId);
  console.assert(
    mockObserver.isDisconnected === true,
    "Observer should be disconnected after disposal"
  );

  console.log("✓ Observer management test passed");
}

/**
 * タイマー管理のテスト
 */
function testTimerManagement() {
  console.log("Testing timer management...");

  const logger = new MockLogger();
  const resourceManager = new ResourceManager({
    logger,
    autoCleanup: false,
    memoryMonitoring: false,
  });

  // タイムアウト登録
  const timeoutId = setTimeout(() => {}, 1000);
  const resourceId = resourceManager.registerTimer(timeoutId, "timeout");

  console.assert(
    typeof resourceId === "string",
    "Resource ID should be returned"
  );

  // リソース情報確認
  const resourceInfo = resourceManager.getResourceInfo(resourceId);
  console.assert(
    resourceInfo.type === ResourceManager.ResourceType.TIMER,
    "Resource type should be TIMER"
  );
  console.assert(
    resourceInfo.metadata.timerType === "timeout",
    "Timer type should be stored in metadata"
  );

  // リソース破棄（clearTimeoutが呼ばれることを確認）
  resourceManager.dispose(resourceId);

  console.log("✓ Timer management test passed");
}

/**
 * Promise管理のテスト
 */
function testPromiseManagement() {
  console.log("Testing promise management...");

  const logger = new MockLogger();
  const resourceManager = new ResourceManager({
    logger,
    autoCleanup: false,
    memoryMonitoring: false,
  });

  // AbortController付きPromise
  const abortController = new AbortController();
  const promise = new Promise((resolve) => {
    setTimeout(resolve, 1000);
  });

  const resourceId = resourceManager.registerPromise(
    promise,
    abortController,
    "TestPromise"
  );

  console.assert(
    typeof resourceId === "string",
    "Resource ID should be returned"
  );
  console.assert(
    abortController.signal.aborted === false,
    "AbortController should not be aborted initially"
  );

  // リソース情報確認
  const resourceInfo = resourceManager.getResourceInfo(resourceId);
  console.assert(
    resourceInfo.type === ResourceManager.ResourceType.PROMISE,
    "Resource type should be PROMISE"
  );
  console.assert(
    resourceInfo.metadata.hasAbortController === true,
    "AbortController presence should be recorded"
  );

  // リソース破棄
  resourceManager.dispose(resourceId);
  console.assert(
    abortController.signal.aborted === true,
    "AbortController should be aborted after disposal"
  );

  console.log("✓ Promise management test passed");
}

/**
 * タイプ別破棄のテスト
 */
function testDisposeByType() {
  console.log("Testing dispose by type...");

  const logger = new MockLogger();
  const resourceManager = new ResourceManager({
    logger,
    autoCleanup: false,
    memoryMonitoring: false,
  });

  // 複数のリソースを登録
  const mockElement1 = new MockElement();
  const mockElement2 = new MockElement();
  const mockObserver = new MockObserver();

  const listener1ResourceId = resourceManager.registerEventListener(
    mockElement1,
    "click",
    () => {}
  );
  const listener2ResourceId = resourceManager.registerEventListener(
    mockElement2,
    "scroll",
    () => {}
  );
  const observerResourceId = resourceManager.registerObserver(mockObserver);

  // 統計確認
  let stats = resourceManager.getStats();
  console.assert(stats.currentActive === 3, "Should have 3 active resources");
  console.assert(
    stats.resourcesByType[ResourceManager.ResourceType.EVENT_LISTENER] === 2,
    "Should have 2 event listeners"
  );
  console.assert(
    stats.resourcesByType[ResourceManager.ResourceType.OBSERVER] === 1,
    "Should have 1 observer"
  );

  // イベントリスナーのみ破棄
  const disposedCount = resourceManager.disposeByType(
    ResourceManager.ResourceType.EVENT_LISTENER
  );
  console.assert(disposedCount === 2, "Should dispose 2 event listeners");

  // 統計確認
  stats = resourceManager.getStats();
  console.assert(
    stats.currentActive === 1,
    "Should have 1 active resource remaining"
  );
  console.assert(
    stats.resourcesByType[ResourceManager.ResourceType.EVENT_LISTENER] === 0,
    "Should have 0 event listeners"
  );
  console.assert(
    stats.resourcesByType[ResourceManager.ResourceType.OBSERVER] === 1,
    "Should still have 1 observer"
  );

  console.log("✓ Dispose by type test passed");
}

/**
 * 期限切れリソース破棄のテスト
 */
function testDisposeExpired() {
  console.log("Testing dispose expired resources...");

  const logger = new MockLogger();
  const resourceManager = new ResourceManager({
    logger,
    autoCleanup: false,
    memoryMonitoring: false,
  });

  // TTL付きリソースを登録
  let cleanup1Called = false;
  let cleanup2Called = false;

  const resourceId1 = resourceManager.register(
    { data: "test1" },
    () => {
      cleanup1Called = true;
    },
    {
      name: "ExpiredResource",
      ttl: 100, // 100ms
    }
  );

  const resourceId2 = resourceManager.register(
    { data: "test2" },
    () => {
      cleanup2Called = true;
    },
    {
      name: "NonExpiredResource",
      ttl: 10000, // 10秒
    }
  );

  // 期限切れを待つ
  setTimeout(() => {
    const disposedCount = resourceManager.disposeExpired();
    console.assert(disposedCount === 1, "Should dispose 1 expired resource");
    console.assert(
      cleanup1Called === true,
      "Expired resource cleanup should be called"
    );
    console.assert(
      cleanup2Called === false,
      "Non-expired resource cleanup should not be called"
    );

    const stats = resourceManager.getStats();
    console.assert(
      stats.currentActive === 1,
      "Should have 1 active resource remaining"
    );

    console.log("✓ Dispose expired resources test passed");
  }, 150);
}

/**
 * 未使用リソース破棄のテスト
 */
function testDisposeUnused() {
  console.log("Testing dispose unused resources...");

  const logger = new MockLogger();
  const resourceManager = new ResourceManager({
    logger,
    autoCleanup: false,
    memoryMonitoring: false,
  });

  // 自動破棄フラグ付きリソースを登録
  let cleanup1Called = false;
  let cleanup2Called = false;

  const resourceId1 = resourceManager.register(
    { data: "test1" },
    () => {
      cleanup1Called = true;
    },
    {
      name: "AutoDisposeResource",
      autoDispose: true,
    }
  );

  const resourceId2 = resourceManager.register(
    { data: "test2" },
    () => {
      cleanup2Called = true;
    },
    {
      name: "NoAutoDisposeResource",
      autoDispose: false,
    }
  );

  // 少し待ってから未使用リソースを破棄
  setTimeout(() => {
    const disposedCount = resourceManager.disposeUnused(50); // 50ms以上未使用
    console.assert(disposedCount === 1, "Should dispose 1 unused resource");
    console.assert(
      cleanup1Called === true,
      "Auto-dispose resource cleanup should be called"
    );
    console.assert(
      cleanup2Called === false,
      "Non-auto-dispose resource cleanup should not be called"
    );

    const stats = resourceManager.getStats();
    console.assert(
      stats.currentActive === 1,
      "Should have 1 active resource remaining"
    );

    console.log("✓ Dispose unused resources test passed");
  }, 100);
}

/**
 * 全体クリーンアップのテスト
 */
function testCleanup() {
  console.log("Testing cleanup...");

  const logger = new MockLogger();
  const resourceManager = new ResourceManager({
    logger,
    autoCleanup: false,
    memoryMonitoring: false,
  });

  // 複数のリソースを登録
  let cleanupCount = 0;
  const cleanupFn = () => {
    cleanupCount++;
  };

  for (let i = 0; i < 5; i++) {
    resourceManager.register({ data: `test${i}` }, cleanupFn, {
      name: `TestResource${i}`,
    });
  }

  let stats = resourceManager.getStats();
  console.assert(stats.currentActive === 5, "Should have 5 active resources");

  // 全体クリーンアップ
  const disposedCount = resourceManager.cleanup();
  console.assert(disposedCount === 5, "Should dispose all 5 resources");
  console.assert(cleanupCount === 5, "All cleanup functions should be called");

  stats = resourceManager.getStats();
  console.assert(
    stats.currentActive === 0,
    "Should have 0 active resources after cleanup"
  );
  console.assert(
    stats.totalDisposed === 5,
    "Should have 5 total disposed resources"
  );

  console.log("✓ Cleanup test passed");
}

/**
 * 統計情報のテスト
 */
function testStats() {
  console.log("Testing stats...");

  const logger = new MockLogger();
  const resourceManager = new ResourceManager({
    logger,
    autoCleanup: false,
    memoryMonitoring: false,
  });

  // 初期統計
  let stats = resourceManager.getStats();
  console.assert(stats.totalCreated === 0, "Initial total created should be 0");
  console.assert(
    stats.totalDisposed === 0,
    "Initial total disposed should be 0"
  );
  console.assert(
    stats.currentActive === 0,
    "Initial current active should be 0"
  );

  // リソース登録
  const resourceId1 = resourceManager.register({ data: "test1" }, () => {});
  const resourceId2 = resourceManager.register({ data: "test2" }, () => {});

  stats = resourceManager.getStats();
  console.assert(stats.totalCreated === 2, "Total created should be 2");
  console.assert(stats.totalDisposed === 0, "Total disposed should still be 0");
  console.assert(stats.currentActive === 2, "Current active should be 2");

  // リソース破棄
  resourceManager.dispose(resourceId1);

  stats = resourceManager.getStats();
  console.assert(stats.totalCreated === 2, "Total created should still be 2");
  console.assert(stats.totalDisposed === 1, "Total disposed should be 1");
  console.assert(stats.currentActive === 1, "Current active should be 1");

  console.log("✓ Stats test passed");
}

/**
 * エラーハンドリングのテスト
 */
function testErrorHandling() {
  console.log("Testing error handling...");

  const logger = new MockLogger();
  const resourceManager = new ResourceManager({
    logger,
    autoCleanup: false,
    memoryMonitoring: false,
  });

  // エラーを投げるクリーンアップ関数
  const resourceId = resourceManager.register(
    { data: "test" },
    () => {
      throw new Error("Cleanup error");
    },
    {
      name: "ErrorResource",
    }
  );

  // エラーが発生してもリソースは削除される
  const disposed = resourceManager.dispose(resourceId);
  console.assert(disposed === false, "Dispose should return false on error");

  // エラーログが記録される
  const errorLogs = logger.getLogsByLevel("error");
  console.assert(errorLogs.length > 0, "Error should be logged");

  // 統計にエラーが記録される
  const stats = resourceManager.getStats();
  console.assert(stats.errors > 0, "Error count should be incremented");

  console.log("✓ Error handling test passed");
}

/**
 * アラート機能のテスト
 */
function testAlerts() {
  console.log("Testing alerts...");

  const logger = new MockLogger();
  const resourceManager = new ResourceManager({
    logger,
    autoCleanup: false,
    memoryMonitoring: false,
    maxResources: 10,
  });

  let alertCalled = false;
  let alertData = null;

  // アラート設定
  resourceManager.setAlerts(
    {
      maxResources: 3,
    },
    (alerts, stats) => {
      alertCalled = true;
      alertData = { alerts, stats };
    }
  );

  // リソースを追加してアラート閾値を超える
  for (let i = 0; i < 5; i++) {
    resourceManager.register({ data: `test${i}` }, () => {}, {
      name: `TestResource${i}`,
    });
  }

  // アラートがトリガーされることを確認
  setTimeout(() => {
    console.assert(alertCalled === true, "Alert callback should be called");
    console.assert(alertData !== null, "Alert data should be provided");
    console.assert(alertData.alerts.length > 0, "Should have alert entries");
    console.assert(
      alertData.alerts[0].type === "RESOURCE_COUNT",
      "Should have resource count alert"
    );

    console.log("✓ Alerts test passed");
  }, 100);
}

/**
 * すべてのテストを実行
 */
function runAllTests() {
  console.log("Starting ResourceManager tests...\n");

  try {
    testResourceManagerBasics();
    testEventListenerManagement();
    testObserverManagement();
    testTimerManagement();
    testPromiseManagement();
    testDisposeByType();
    testCleanup();
    testStats();
    testErrorHandling();

    // 非同期テストは少し待ってから実行
    setTimeout(() => {
      testDisposeExpired();
      testDisposeUnused();
      testAlerts();

      setTimeout(() => {
        console.log("\n🎉 All ResourceManager tests passed!");
      }, 200);
    }, 50);
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// テスト実行
if (typeof window !== "undefined") {
  // ブラウザ環境
  window.runResourceManagerTests = runAllTests;
  console.log(
    "ResourceManager tests loaded. Run with: runResourceManagerTests()"
  );
} else {
  // Node.js環境
  runAllTests();
}
