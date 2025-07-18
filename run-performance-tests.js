/**
 * YouTube Theater Mode - パフォーマンス最適化テスト
 * イベントリスナー最適化とCSSアニメーション最適化のテスト
 */

// テスト結果を表示する要素
const resultContainer = document.getElementById("test-results");

/**
 * テスト結果を表示
 * @param {string} testName - テスト名
 * @param {boolean} passed - テスト結果
 * @param {string} message - 追加メッセージ
 */
function reportTestResult(testName, passed, message = "") {
  const resultElement = document.createElement("div");
  resultElement.className = passed ? "test-passed" : "test-failed";
  resultElement.innerHTML = `
    <h3>${passed ? "✅" : "❌"} ${testName}</h3>
    ${message ? `<p>${message}</p>` : ""}
  `;
  resultContainer.appendChild(resultElement);
  console.log(`${passed ? "PASSED" : "FAILED"}: ${testName}`, message);
}

/**
 * デバウンス関数のテスト
 */
function testDebounce() {
  const { debounce } = window.TheaterModePerformance;

  let counter = 0;
  const increment = () => counter++;
  const debouncedIncrement = debounce(increment, 50);

  // 短時間に複数回呼び出し
  debouncedIncrement();
  debouncedIncrement();
  debouncedIncrement();

  // 即時実行されていないことを確認
  const immediateResult = counter === 0;

  // 待機後に1回だけ実行されることを確認
  setTimeout(() => {
    const delayedResult = counter === 1;
    reportTestResult(
      "デバウンス関数テスト",
      immediateResult && delayedResult,
      `即時実行なし: ${immediateResult}, 遅延実行1回: ${delayedResult}`
    );
  }, 100);
}

/**
 * スロットル関数のテスト
 */
function testThrottle() {
  const { throttle } = window.TheaterModePerformance;

  let counter = 0;
  const increment = () => counter++;
  const throttledIncrement = throttle(increment, 50);

  // 最初の呼び出しは即時実行される
  throttledIncrement();
  const firstCall = counter === 1;

  // 短時間に複数回呼び出し
  throttledIncrement();
  throttledIncrement();
  throttledIncrement();

  // 追加の呼び出しはスロットルされる
  const immediateThrottle = counter === 1;

  // 待機後に追加の実行があることを確認
  setTimeout(() => {
    const delayedResult = counter > 1;
    reportTestResult(
      "スロットル関数テスト",
      firstCall && immediateThrottle && delayedResult,
      `初回実行: ${firstCall}, 即時スロットル: ${immediateThrottle}, 遅延実行: ${delayedResult}`
    );
  }, 100);
}

/**
 * イベントリスナー管理クラスのテスト
 */
function testEventListenerManager() {
  const { EventListenerManager } = window.TheaterModePerformance;

  // テスト用の要素を作成
  const testElement = document.createElement("div");
  document.body.appendChild(testElement);

  // テスト用のリスナー
  const listener1 = () => {};
  const listener2 = () => {};

  // リスナーを追加
  const id1 = EventListenerManager.add(testElement, "click", listener1);
  const id2 = EventListenerManager.add(testElement, "mouseover", listener2);

  // 追加されたリスナーの数を確認
  const addResult = EventListenerManager.count() === 2;

  // リスナーを削除
  const removeResult = EventListenerManager.remove(id1);

  // 残りのリスナー数を確認
  const countAfterRemove = EventListenerManager.count() === 1;

  // すべてのリスナーをクリーンアップ
  const cleanupCount = EventListenerManager.cleanup();
  const cleanupResult = cleanupCount === 1;

  // 最終的なリスナー数を確認
  const finalCount = EventListenerManager.count() === 0;

  // テスト用の要素を削除
  document.body.removeChild(testElement);

  reportTestResult(
    "イベントリスナー管理クラステスト",
    addResult &&
      removeResult &&
      countAfterRemove &&
      cleanupResult &&
      finalCount,
    `追加: ${addResult}, 削除: ${removeResult}, 削除後カウント: ${countAfterRemove}, クリーンアップ: ${cleanupResult}, 最終カウント: ${finalCount}`
  );
}

/**
 * 高頻度イベントのパフォーマンステスト
 */
function testHighFrequencyEvents() {
  const { debounce, throttle } = window.TheaterModePerformance;

  // 各関数の呼び出し回数をカウント
  let normalCount = 0;
  let debouncedCount = 0;
  let throttledCount = 0;

  // テスト用の関数
  const normalHandler = () => normalCount++;
  const debouncedHandler = debounce(() => debouncedCount++, 50);
  const throttledHandler = throttle(() => throttledCount++, 50);

  // 高頻度イベントをシミュレート（100回）
  const eventCount = 100;
  for (let i = 0; i < eventCount; i++) {
    normalHandler();
    debouncedHandler();
    throttledHandler();
  }

  // 通常の関数は毎回実行される
  const normalResult = normalCount === eventCount;

  // 最適化された関数の実行回数を確認
  setTimeout(() => {
    const debouncedResult = debouncedCount === 1; // デバウンスは最後の1回のみ実行
    const throttledResult = throttledCount < eventCount; // スロットルは間引かれる

    reportTestResult(
      "高頻度イベント最適化テスト",
      normalResult && debouncedResult && throttledResult,
      `通常関数: ${normalCount}回, デバウンス関数: ${debouncedCount}回, スロットル関数: ${throttledCount}回`
    );
  }, 200);
}

/**
 * メモリリーク防止テスト
 */
function testMemoryLeakPrevention() {
  const { EventListenerManager } = window.TheaterModePerformance;

  // 多数の要素とリスナーを作成
  const elements = [];
  const listenerIds = [];
  const elementCount = 50;

  // 要素を作成してリスナーを追加
  for (let i = 0; i < elementCount; i++) {
    const element = document.createElement("div");
    document.body.appendChild(element);
    elements.push(element);

    // 各要素に複数のリスナーを追加
    listenerIds.push(EventListenerManager.add(element, "click", () => {}));
    listenerIds.push(EventListenerManager.add(element, "mouseover", () => {}));
  }

  // 追加されたリスナーの総数を確認
  const totalListeners = EventListenerManager.count();
  const addResult = totalListeners === elementCount * 2;

  // 要素ごとにすべてのリスナーを削除
  let removedCount = 0;
  for (const element of elements) {
    removedCount += EventListenerManager.removeAll(element);
    document.body.removeChild(element);
  }

  // 削除されたリスナーの数を確認
  const removeResult = removedCount === elementCount * 2;

  // 最終的なリスナー数を確認
  const finalCount = EventListenerManager.count();
  const cleanupResult = finalCount === 0;

  reportTestResult(
    "メモリリーク防止テスト",
    addResult && removeResult && cleanupResult,
    `追加: ${totalListeners}個, 削除: ${removedCount}個, 残り: ${finalCount}個`
  );
}

/**
 * すべてのテストを実行
 */
function runAllTests() {
  console.log("YouTube Theater Mode: パフォーマンス最適化テスト開始");

  // 各テストを実行
  testDebounce();
  testThrottle();
  testEventListenerManager();
  testHighFrequencyEvents();
  testMemoryLeakPrevention();

  console.log("YouTube Theater Mode: すべてのテストを実行しました");
}

// DOMの読み込み完了後にテストを実行
document.addEventListener("DOMContentLoaded", runAllTests);
