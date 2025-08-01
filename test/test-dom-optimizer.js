/**
 * DOMOptimizer の単体テスト
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

// テスト用のDOM要素を作成
function createTestElement(tag = "div") {
  const element = document.createElement(tag);
  element.id = `test-element-${Date.now()}-${Math.random()
    .toString(36)
    .substr(2, 9)}`;
  document.body.appendChild(element);
  return element;
}

// テスト用要素をクリーンアップ
function cleanupTestElements() {
  const testElements = document.querySelectorAll('[id^="test-element-"]');
  testElements.forEach((element) => {
    if (element.parentNode) {
      element.parentNode.removeChild(element);
    }
  });
}

/**
 * DOMOptimizer基本機能のテスト
 */
function testDOMOptimizerBasics() {
  console.log("Testing DOMOptimizer basics...");

  const logger = new MockLogger();
  const domOptimizer = new DOMOptimizer({
    logger,
    enablePerformanceMonitoring: false,
  });

  const testElement = createTestElement();

  // 基本的なクラス操作
  domOptimizer
    .queueClassOperation(testElement, "test-class", "add")
    .then((result) => {
      console.assert(result === true, "Class add operation should succeed");
      console.assert(
        testElement.classList.contains("test-class"),
        "Element should have the test class"
      );
    });

  // 即座に実行
  const immediateResult = domOptimizer.executeImmediate(
    testElement,
    DOMOptimizer.OperationType.ADD_CLASS,
    "immediate-class"
  );

  console.assert(
    immediateResult === true,
    "Immediate operation should succeed"
  );
  console.assert(
    testElement.classList.contains("immediate-class"),
    "Element should have the immediate class"
  );

  // クリーンアップ
  cleanupTestElements();
  domOptimizer.cleanup();

  console.log("✓ DOMOptimizer basics test passed");
}

/**
 * バッチ処理のテスト
 */
function testBatchProcessing() {
  console.log("Testing batch processing...");

  const logger = new MockLogger();
  const domOptimizer = new DOMOptimizer({
    logger,
    batchSize: 5,
    enablePerformanceMonitoring: true,
  });

  const testElement = createTestElement();
  const promises = [];

  // 複数の操作をキューに追加
  for (let i = 0; i < 10; i++) {
    promises.push(
      domOptimizer.queueClassOperation(testElement, `class-${i}`, "add", {
        priority: DOMOptimizer.Priority.NORMAL,
      })
    );
  }

  // すべての操作が完了するまで待機
  Promise.all(promises).then(() => {
    // すべてのクラスが追加されていることを確認
    for (let i = 0; i < 10; i++) {
      console.assert(
        testElement.classList.contains(`class-${i}`),
        `Element should have class-${i}`
      );
    }

    // パフォーマンス統計を確認
    const metrics = domOptimizer.getPerformanceMetrics();
    console.assert(
      metrics.totalOperations >= 10,
      "Total operations should be at least 10"
    );
    console.assert(
      metrics.batchedOperations >= 10,
      "Batched operations should be at least 10"
    );

    console.log("✓ Batch processing test passed");
  });

  // クリーンアップ
  setTimeout(() => {
    cleanupTestElements();
    domOptimizer.cleanup();
  }, 100);
}

/**
 * スタイル操作のテスト
 */
function testStyleOperations() {
  console.log("Testing style operations...");

  const logger = new MockLogger();
  const domOptimizer = new DOMOptimizer({
    logger,
    enablePerformanceMonitoring: false,
  });

  const testElement = createTestElement();

  // 単一スタイルプロパティ
  domOptimizer
    .queueStyleOperation(testElement, "color", "red")
    .then((result) => {
      console.assert(result === true, "Style operation should succeed");
      console.assert(
        testElement.style.color === "red",
        "Element color should be red"
      );
    });

  // 複数スタイルプロパティ
  domOptimizer
    .queueStyleOperation(testElement, {
      backgroundColor: "blue",
      fontSize: "16px",
      padding: "10px",
    })
    .then((results) => {
      console.assert(
        Array.isArray(results) && results.every((r) => r === true),
        "All style operations should succeed"
      );
      console.assert(
        testElement.style.backgroundColor === "blue",
        "Element background should be blue"
      );
      console.assert(
        testElement.style.fontSize === "16px",
        "Element font size should be 16px"
      );
    });

  // クリーンアップ
  setTimeout(() => {
    cleanupTestElements();
    domOptimizer.cleanup();
  }, 100);

  console.log("✓ Style operations test passed");
}

/**
 * 属性操作のテスト
 */
function testAttributeOperations() {
  console.log("Testing attribute operations...");

  const logger = new MockLogger();
  const domOptimizer = new DOMOptimizer({
    logger,
    enablePerformanceMonitoring: false,
  });

  const testElement = createTestElement();

  // 属性設定
  domOptimizer
    .queueAttributeOperation(testElement, "data-test", "value")
    .then((result) => {
      console.assert(result === true, "Attribute set operation should succeed");
      console.assert(
        testElement.getAttribute("data-test") === "value",
        "Element should have the test attribute"
      );
    });

  // 属性削除
  domOptimizer
    .queueAttributeOperation(testElement, "data-test", null)
    .then((result) => {
      console.assert(
        result === true,
        "Attribute remove operation should succeed"
      );
      console.assert(
        !testElement.hasAttribute("data-test"),
        "Element should not have the test attribute"
      );
    });

  // クリーンアップ
  setTimeout(() => {
    cleanupTestElements();
    domOptimizer.cleanup();
  }, 100);

  console.log("✓ Attribute operations test passed");
}

/**
 * 要素の挿入・削除のテスト
 */
function testElementManipulation() {
  console.log("Testing element manipulation...");

  const logger = new MockLogger();
  const domOptimizer = new DOMOptimizer({
    logger,
    enablePerformanceMonitoring: false,
  });

  const parentElement = createTestElement();
  const childElement = document.createElement("span");
  childElement.textContent = "Test Child";

  // 要素挿入
  domOptimizer
    .queueInsertOperation(parentElement, childElement)
    .then((result) => {
      console.assert(result === true, "Insert operation should succeed");
      console.assert(
        parentElement.contains(childElement),
        "Parent should contain the child element"
      );
    });

  // 要素削除
  setTimeout(() => {
    domOptimizer.queueRemoveOperation(childElement).then((result) => {
      console.assert(result === true, "Remove operation should succeed");
      console.assert(
        !parentElement.contains(childElement),
        "Parent should not contain the child element"
      );
    });
  }, 50);

  // クリーンアップ
  setTimeout(() => {
    cleanupTestElements();
    domOptimizer.cleanup();
  }, 150);

  console.log("✓ Element manipulation test passed");
}

/**
 * 優先度システムのテスト
 */
function testPrioritySystem() {
  console.log("Testing priority system...");

  const logger = new MockLogger();
  const domOptimizer = new DOMOptimizer({
    logger,
    enablePerformanceMonitoring: false,
  });

  const testElement = createTestElement();
  const executionOrder = [];

  // 異なる優先度で操作を追加
  domOptimizer.queueClassOperation(testElement, "low", "add", {
    priority: DOMOptimizer.Priority.LOW,
    callback: () => executionOrder.push("low"),
  });

  domOptimizer.queueClassOperation(testElement, "high", "add", {
    priority: DOMOptimizer.Priority.HIGH,
    callback: () => executionOrder.push("high"),
  });

  domOptimizer.queueClassOperation(testElement, "normal", "add", {
    priority: DOMOptimizer.Priority.NORMAL,
    callback: () => executionOrder.push("normal"),
  });

  // 即座に実行される操作
  domOptimizer.queueClassOperation(testElement, "immediate", "add", {
    priority: DOMOptimizer.Priority.IMMEDIATE,
    callback: () => executionOrder.push("immediate"),
  });

  // 実行順序を確認
  setTimeout(() => {
    console.assert(
      executionOrder[0] === "immediate",
      "Immediate priority should execute first"
    );
    console.assert(
      testElement.classList.contains("immediate"),
      "Element should have immediate class"
    );
    console.assert(
      testElement.classList.contains("high"),
      "Element should have high priority class"
    );

    console.log("✓ Priority system test passed");
  }, 100);

  // クリーンアップ
  setTimeout(() => {
    cleanupTestElements();
    domOptimizer.cleanup();
  }, 200);
}

/**
 * 仮想DOM機能のテスト
 */
function testVirtualDOM() {
  console.log("Testing virtual DOM...");

  const logger = new MockLogger();
  const domOptimizer = new DOMOptimizer({
    logger,
    enableVirtualDOM: true,
    enablePerformanceMonitoring: false,
  });

  const testElement = createTestElement();

  // 仮想DOM状態を確認
  let virtualState = domOptimizer.getVirtualState(testElement);
  console.assert(virtualState === null, "Initial virtual state should be null");

  // 操作を追加して仮想DOM状態を確認
  domOptimizer.queueClassOperation(testElement, "virtual-class", "add");
  domOptimizer.queueStyleOperation(testElement, "color", "green");

  setTimeout(() => {
    virtualState = domOptimizer.getVirtualState(testElement);
    console.assert(
      virtualState !== null,
      "Virtual state should exist after operations"
    );
    console.assert(
      virtualState.classes.has("virtual-class"),
      "Virtual state should contain the class"
    );
    console.assert(
      virtualState.styles.get("color") === "green",
      "Virtual state should contain the style"
    );

    console.log("✓ Virtual DOM test passed");
  }, 50);

  // クリーンアップ
  setTimeout(() => {
    cleanupTestElements();
    domOptimizer.cleanup();
  }, 150);
}

/**
 * 要素状態キャッシュのテスト
 */
function testElementCache() {
  console.log("Testing element cache...");

  const logger = new MockLogger();
  const domOptimizer = new DOMOptimizer({
    logger,
    enablePerformanceMonitoring: false,
  });

  const testElement = createTestElement();
  testElement.className = "initial-class";
  testElement.style.color = "blue";
  testElement.setAttribute("data-cache", "test");

  // 要素状態をキャッシュ
  const cachedState = domOptimizer.cacheElementState(testElement);

  console.assert(cachedState !== null, "Cached state should exist");
  console.assert(
    cachedState.classes.includes("initial-class"),
    "Cached state should contain initial class"
  );
  console.assert(
    cachedState.attributes["data-cache"] === "test",
    "Cached state should contain attribute"
  );

  // キャッシュされた状態を取得
  const retrievedState = domOptimizer.getCachedState(testElement);
  console.assert(
    retrievedState === cachedState,
    "Retrieved state should match cached state"
  );

  // クリーンアップ
  cleanupTestElements();
  domOptimizer.cleanup();

  console.log("✓ Element cache test passed");
}

/**
 * 重複操作除去のテスト
 */
function testDeduplication() {
  console.log("Testing operation deduplication...");

  const logger = new MockLogger();
  const domOptimizer = new DOMOptimizer({
    logger,
    enablePerformanceMonitoring: true,
  });

  const testElement = createTestElement();

  // 同じキーで複数の操作を追加
  domOptimizer.queueStyleOperation(testElement, "color", "red");
  domOptimizer.queueStyleOperation(testElement, "color", "green");
  domOptimizer.queueStyleOperation(testElement, "color", "blue");

  // 最後の操作のみが適用されることを確認
  setTimeout(() => {
    console.assert(
      testElement.style.color === "blue",
      "Element color should be blue (last operation)"
    );

    const metrics = domOptimizer.getPerformanceMetrics();
    console.assert(
      metrics.totalOperations === 3,
      "Total operations should be 3"
    );

    console.log("✓ Operation deduplication test passed");
  }, 50);

  // クリーンアップ
  setTimeout(() => {
    cleanupTestElements();
    domOptimizer.cleanup();
  }, 150);
}

/**
 * エラーハンドリングのテスト
 */
function testErrorHandling() {
  console.log("Testing error handling...");

  const logger = new MockLogger();
  const domOptimizer = new DOMOptimizer({
    logger,
    enablePerformanceMonitoring: false,
  });

  const testElement = createTestElement();

  // 要素を削除してから操作を実行
  testElement.parentNode.removeChild(testElement);

  domOptimizer
    .queueClassOperation(testElement, "test-class", "add")
    .then((result) => {
      console.assert(
        result === false,
        "Operation on removed element should fail"
      );
    });

  // 無効な操作タイプ
  domOptimizer
    .queueClassOperation(testElement, "test-class", "invalid")
    .catch((error) => {
      console.assert(
        error instanceof Error,
        "Invalid operation should throw error"
      );
    });

  // エラーログが記録されることを確認
  setTimeout(() => {
    const errorLogs = logger.getLogsByLevel("error");
    const warnLogs = logger.getLogsByLevel("warn");
    console.assert(
      errorLogs.length > 0 || warnLogs.length > 0,
      "Error or warning should be logged"
    );

    console.log("✓ Error handling test passed");
  }, 50);

  // クリーンアップ
  setTimeout(() => {
    domOptimizer.cleanup();
  }, 100);
}

/**
 * フラッシュ操作のテスト
 */
function testFlushOperations() {
  console.log("Testing flush operations...");

  const logger = new MockLogger();
  const domOptimizer = new DOMOptimizer({
    logger,
    enablePerformanceMonitoring: false,
  });

  const testElement = createTestElement();

  // 複数の操作をキューに追加
  for (let i = 0; i < 5; i++) {
    domOptimizer.queueClassOperation(testElement, `flush-class-${i}`, "add", {
      priority: DOMOptimizer.Priority.LOW,
    });
  }

  // 手動でフラッシュ
  domOptimizer
    .flushOperations(DOMOptimizer.Priority.LOW)
    .then((executedCount) => {
      console.assert(executedCount === 5, "Should execute 5 operations");

      // すべてのクラスが追加されていることを確認
      for (let i = 0; i < 5; i++) {
        console.assert(
          testElement.classList.contains(`flush-class-${i}`),
          `Element should have flush-class-${i}`
        );
      }

      console.log("✓ Flush operations test passed");
    });

  // クリーンアップ
  setTimeout(() => {
    cleanupTestElements();
    domOptimizer.cleanup();
  }, 100);
}

/**
 * パフォーマンステスト
 */
function testPerformance() {
  console.log("Testing performance...");

  const logger = new MockLogger();
  const domOptimizer = new DOMOptimizer({
    logger,
    enablePerformanceMonitoring: true,
    batchSize: 100,
  });

  const testElements = [];
  for (let i = 0; i < 10; i++) {
    testElements.push(createTestElement());
  }

  const startTime = performance.now();

  // 大量の操作を追加
  const promises = [];
  for (let i = 0; i < 1000; i++) {
    const element = testElements[i % testElements.length];
    promises.push(
      domOptimizer.queueClassOperation(element, `perf-class-${i}`, "add")
    );
  }

  Promise.all(promises).then(() => {
    const endTime = performance.now();
    const duration = endTime - startTime;

    console.log(`Performance test completed in ${duration.toFixed(2)}ms`);

    const metrics = domOptimizer.getPerformanceMetrics();
    console.assert(
      metrics.totalOperations >= 1000,
      "Should have processed at least 1000 operations"
    );

    console.log("✓ Performance test passed");

    // クリーンアップ
    cleanupTestElements();
    domOptimizer.cleanup();
  });
}

/**
 * すべてのテストを実行
 */
function runAllTests() {
  console.log("Starting DOMOptimizer tests...\n");

  try {
    testDOMOptimizerBasics();
    testBatchProcessing();
    testStyleOperations();
    testAttributeOperations();
    testElementManipulation();
    testPrioritySystem();
    testVirtualDOM();
    testElementCache();
    testDeduplication();
    testErrorHandling();
    testFlushOperations();

    // パフォーマンステストは最後に実行
    setTimeout(() => {
      testPerformance();

      setTimeout(() => {
        console.log("\n🎉 All DOMOptimizer tests completed!");
      }, 200);
    }, 500);
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// テスト実行
if (typeof window !== "undefined") {
  // ブラウザ環境
  window.runDOMOptimizerTests = runAllTests;
  console.log("DOMOptimizer tests loaded. Run with: runDOMOptimizerTests()");
} else {
  // Node.js環境では実行しない（DOM APIが必要）
  console.log("DOMOptimizer tests require browser environment");
}
