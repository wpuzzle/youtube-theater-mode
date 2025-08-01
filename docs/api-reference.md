# YouTube Theater Mode 拡張機能 API リファレンス

## 概要

このドキュメントは、YouTube Theater Mode Chrome 拡張機能のすべてのクラス、関数、インターフェースの詳細な API リファレンスを提供します。

## 目次

- [Infrastructure Layer](#infrastructure-layer)
  - [Logger](#logger)
  - [ErrorHandler](#errorhandler)
  - [MessageBus](#messagebus)
  - [StorageAdapter](#storageadapter)
  - [StateStore](#statestore)
- [Business Layer](#business-layer)
  - [SettingsManager](#settingsmanager)
  - [TabStateManager](#tabstatemanager)
  - [DataValidator](#datavalidator)
- [Element Management Layer](#element-management-layer)
  - [ElementManager](#elementmanager)
  - [OverlayManager](#overlaymanager)
  - [ElementObserver](#elementobserver)
- [Theater Mode Controller](#theater-mode-controller)
  - [TheaterModeController](#theatermodecontroller)
  - [KeyboardShortcutManager](#keyboardshortcutmanager)
  - [OpacityController](#opacitycontroller)
- [Background Service](#background-service)
  - [BackgroundService](#backgroundservice)
  - [MessageRouter](#messagerouter)
  - [ServiceWorkerManager](#serviceworkermanager)
- [Popup UI](#popup-ui)
  - [PopupController](#popupcontroller)
  - [UIEventHandler](#uieventhandler)
  - [PopupCommunicator](#popupcommunicator)
- [Content Script](#content-script)
  - [ContentScriptManager](#contentscriptmanager)
  - [YouTubePageDetector](#youtubepagedetector)
  - [ContentScriptCommunicator](#contentscriptcommunicator)
- [Performance & Testing](#performance--testing)
  - [ResourceManager](#resourcemanager)
  - [DOMOptimizer](#domoptimizer)
  - [PerformanceMonitor](#performancemonitor)
  - [TestFramework](#testframework)
  - [MockFactory](#mockfactory)
  - [IntegrationTestHarness](#integrationtestharness)

---

## Infrastructure Layer

### Logger

構造化ログ機能を持つ Logger クラス。ログレベル管理、フィルタリング、パフォーマンス監視機能を提供します。

#### クラス定義

```javascript
class Logger {
  constructor(context, options = {})
}
```

#### 静的プロパティ

##### LogLevel

```javascript
static LogLevel = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
  TRACE: 4
}
```

ログレベルの定義。数値が小さいほど重要度が高い。

##### LogDestination

```javascript
static LogDestination = {
  CONSOLE: "console",
  MEMORY: "memory",
  CUSTOM: "custom"
}
```

ログ出力先の定義。

#### コンストラクタ

```javascript
constructor(context, (options = {}));
```

**パラメータ:**

- `context` (string): ログのコンテキスト名
- `options` (Object): ロガーオプション
  - `level` (number): 最小ログレベル（デフォルト: Logger.LogLevel.INFO）
  - `destination` (string|Array<string>): ログ出力先（デフォルト: ['console']）
  - `maxMemoryLogs` (number): メモリに保持する最大ログ数（デフォルト: 1000）
  - `enablePerformanceTracking` (boolean): パフォーマンス追跡の有効化（デフォルト: false）

**例:**

```javascript
const logger = new Logger("TheaterMode", {
  level: Logger.LogLevel.DEBUG,
  destination: ["console", "memory"],
  enablePerformanceTracking: true,
});
```

#### メソッド

##### error(message, ...args)

```javascript
error(message, ...args);
```

エラーレベルのログを出力します。

**パラメータ:**

- `message` (string): ログメッセージ
- `...args` (any): 追加の引数

**例:**

```javascript
logger.error("Failed to initialize", error, { context: "initialization" });
```

##### warn(message, ...args)

```javascript
warn(message, ...args);
```

警告レベルのログを出力します。

##### info(message, ...args)

```javascript
info(message, ...args);
```

情報レベルのログを出力します。

##### debug(message, ...args)

```javascript
debug(message, ...args);
```

デバッグレベルのログを出力します。

##### trace(message, ...args)

```javascript
trace(message, ...args);
```

トレースレベルのログを出力します。

##### startTimer(label)

```javascript
startTimer(label);
```

パフォーマンス測定用のタイマーを開始します。

**パラメータ:**

- `label` (string): タイマーのラベル

**戻り値:**

- `string`: タイマー ID

##### endTimer(timerId)

```javascript
endTimer(timerId);
```

パフォーマンス測定用のタイマーを終了し、経過時間をログに出力します。

**パラメータ:**

- `timerId` (string): タイマー ID

##### getMemoryLogs()

```javascript
getMemoryLogs();
```

メモリに保存されたログを取得します。

**戻り値:**

- `Array<LogEntry>`: ログエントリの配列

##### clearMemoryLogs()

```javascript
clearMemoryLogs();
```

メモリに保存されたログをクリアします。

##### setLevel(level)

```javascript
setLevel(level);
```

ログレベルを設定します。

**パラメータ:**

- `level` (number): 新しいログレベル

---

### ErrorHandler

統一されたエラー処理機構と Result 型パターンを提供します。

#### クラス定義

```javascript
class ErrorHandler {
  constructor(logger)
}
```

#### コンストラクタ

```javascript
constructor(logger);
```

**パラメータ:**

- `logger` (Logger): ロガーインスタンス

#### メソッド

##### wrapAsync(promise)

```javascript
async wrapAsync(promise)
```

非同期処理を Result 型でラップします。

**パラメータ:**

- `promise` (Promise): ラップする非同期処理

**戻り値:**

- `Promise<Result>`: Result 型の Promise

**例:**

```javascript
const result = await errorHandler.wrapAsync(fetch("/api/data"));

if (result.success) {
  console.log("Data:", result.data);
} else {
  console.error("Error:", result.error);
}
```

##### createError(type, message, details)

```javascript
createError(type, message, (details = {}));
```

構造化されたエラーオブジェクトを作成します。

**パラメータ:**

- `type` (string): エラータイプ
- `message` (string): エラーメッセージ
- `details` (Object): エラーの詳細情報

**戻り値:**

- `AppError`: 構造化されたエラーオブジェクト

##### categorizeError(error)

```javascript
categorizeError(error);
```

エラーを分類して適切に処理します。

**パラメータ:**

- `error` (Error): エラーオブジェクト

**戻り値:**

- `ErrorInfo`: エラー情報オブジェクト

##### getUserMessage(error)

```javascript
getUserMessage(error);
```

ユーザーフレンドリーなエラーメッセージを生成します。

**パラメータ:**

- `error` (Error): エラーオブジェクト

**戻り値:**

- `string`: ユーザー向けメッセージ

#### 型定義

##### Result<T>

```javascript
/**
 * @template T
 * @typedef {Object} Result
 * @property {boolean} success - 成功フラグ
 * @property {T} [data] - 成功時のデータ
 * @property {AppError} [error] - エラー情報
 */
```

##### ErrorType

```javascript
const ErrorType = {
  INITIALIZATION_ERROR: "INITIALIZATION_ERROR",
  COMMUNICATION_ERROR: "COMMUNICATION_ERROR",
  STORAGE_ERROR: "STORAGE_ERROR",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  ELEMENT_NOT_FOUND: "ELEMENT_NOT_FOUND",
  USER_INPUT_ERROR: "USER_INPUT_ERROR",
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
};
```

---

### MessageBus

型安全なメッセージパッシングシステムを提供します。

#### クラス定義

```javascript
class MessageBus {
  constructor(logger, errorHandler)
}
```

#### コンストラクタ

```javascript
constructor(logger, errorHandler);
```

**パラメータ:**

- `logger` (Logger): ロガーインスタンス
- `errorHandler` (ErrorHandler): エラーハンドラーインスタンス

#### メソッド

##### registerHandler(type, handler)

```javascript
registerHandler(type, handler);
```

メッセージハンドラーを登録します。

**パラメータ:**

- `type` (string): メッセージタイプ
- `handler` (Function): ハンドラー関数

**例:**

```javascript
messageBus.registerHandler("THEATER_MODE_TOGGLE", async (message) => {
  // シアターモード切り替え処理
  return { success: true, data: { toggled: true } };
});
```

##### sendMessage(message, target)

```javascript
async sendMessage(message, target)
```

メッセージを送信します。

**パラメータ:**

- `message` (Message): 送信メッセージ
- `target` (MessageTarget): 送信先

**戻り値:**

- `Promise<Result<any>>`: 送信結果

##### receiveMessage(message, sender)

```javascript
async receiveMessage(message, sender)
```

メッセージを受信して処理します。

**パラメータ:**

- `message` (Message): 受信メッセージ
- `sender` (MessageSender): 送信元

**戻り値:**

- `Promise<Result<any>>`: 処理結果

#### 型定義

##### MessageType

```javascript
const MessageType = {
  // システムメッセージ
  PING: "PING",
  PONG: "PONG",

  // 状態管理メッセージ
  STATE_UPDATE: "STATE_UPDATE",
  STATE_REQUEST: "STATE_REQUEST",

  // シアターモードメッセージ
  THEATER_MODE_TOGGLE: "THEATER_MODE_TOGGLE",
  THEATER_MODE_SET: "THEATER_MODE_SET",
  OPACITY_UPDATE: "OPACITY_UPDATE",

  // 設定メッセージ
  SETTINGS_GET: "SETTINGS_GET",
  SETTINGS_SET: "SETTINGS_SET",
  SETTINGS_UPDATE: "SETTINGS_UPDATE",
};
```

---

### StorageAdapter

Chrome Storage API の抽象化レイヤーを提供します。

#### クラス定義

```javascript
class StorageAdapter {
  constructor(options = {})
}
```

#### コンストラクタ

```javascript
constructor((options = {}));
```

**パラメータ:**

- `options` (Object): オプション
  - `namespace` (string): 名前空間（デフォルト: 'ytTheaterMode'）
  - `preferredType` (StorageType): 優先ストレージタイプ
  - `enableFallback` (boolean): フォールバック有効化（デフォルト: true）

#### メソッド

##### get(key, defaultValue)

```javascript
async get(key, defaultValue = null)
```

データを取得します。

**パラメータ:**

- `key` (string): 取得するキー
- `defaultValue` (any): デフォルト値

**戻り値:**

- `Promise<Result<any>>`: 取得結果

##### set(key, value)

```javascript
async set(key, value)
```

データを保存します。

**パラメータ:**

- `key` (string): 保存するキー
- `value` (any): 保存する値

**戻り値:**

- `Promise<Result<void>>`: 保存結果

##### remove(key)

```javascript
async remove(key)
```

データを削除します。

**パラメータ:**

- `key` (string): 削除するキー

**戻り値:**

- `Promise<Result<void>>`: 削除結果

##### addChangeListener(key, callback)

```javascript
addChangeListener(key, callback);
```

変更リスナーを登録します。

**パラメータ:**

- `key` (string): 監視するキー（"\*"はすべてのキーを監視）
- `callback` (Function): 変更時のコールバック

**戻り値:**

- `Function`: リスナー解除関数

##### getMultiple(keys)

```javascript
async getMultiple(keys)
```

複数のキーを一度に取得します。

**パラメータ:**

- `keys` (Array<string>): 取得するキーの配列

**戻り値:**

- `Promise<Result<Object>>`: 取得結果

##### setMultiple(data)

```javascript
async setMultiple(data)
```

複数のキーを一度に保存します。

**パラメータ:**

- `data` (Object): 保存するキーと値のマップ

**戻り値:**

- `Promise<Result<void>>`: 保存結果

##### clear()

```javascript
async clear(options = {})
```

名前空間内のすべてのキーをクリアします。

**パラメータ:**

- `options` (Object): クリアオプション
  - `confirm` (boolean): 確認フラグ（デフォルト: false）

**戻り値:**

- `Promise<Result<void>>`: クリア結果

#### 型定義

##### StorageType

```javascript
const StorageType = {
  CHROME_SYNC: "chrome.sync",
  CHROME_LOCAL: "chrome.local",
  LOCAL_STORAGE: "localStorage",
  SESSION_STORAGE: "sessionStorage",
  MEMORY: "memory",
};
```

---

### StateStore

Flux パターンに基づく状態管理システムを提供します。

#### クラス定義

```javascript
class StateStore {
  constructor(logger, errorHandler, initialState = null)
}
```

#### コンストラクタ

```javascript
constructor(logger, errorHandler, (initialState = null));
```

**パラメータ:**

- `logger` (Logger): ロガーインスタンス
- `errorHandler` (ErrorHandler): エラーハンドラーインスタンス
- `initialState` (Object): 初期状態（省略時はデフォルト状態を使用）

#### メソッド

##### dispatch(action)

```javascript
async dispatch(action)
```

アクションをディスパッチして状態を更新します。

**パラメータ:**

- `action` (Action): 実行するアクション

**戻り値:**

- `Promise<Result<any>>`: 実行結果

**例:**

```javascript
const result = await stateStore.dispatch({
  type: "THEATER_MODE_TOGGLE",
  payload: { tabId: 123 },
});
```

##### getState()

```javascript
getState();
```

現在の状態を取得します。

**戻り値:**

- `State`: 現在の状態

##### subscribe(listener)

```javascript
subscribe(listener);
```

状態変更を監視します。

**パラメータ:**

- `listener` (Function): 状態変更リスナー

**戻り値:**

- `Function`: アンサブスクライブ関数

##### subscribeToPath(path, listener)

```javascript
subscribeToPath(path, listener);
```

特定のパスの状態変更を監視します。

**パラメータ:**

- `path` (string): 監視するパス（例: 'theaterMode.isEnabled'）
- `listener` (Function): 状態変更リスナー

**戻り値:**

- `Function`: アンサブスクライブ関数

##### addMiddleware(middleware)

```javascript
addMiddleware(middleware);
```

ミドルウェアを追加します。

**パラメータ:**

- `middleware` (Function): ミドルウェア関数

#### 型定義

##### ActionType

```javascript
const ActionType = {
  INITIALIZE: "INITIALIZE",
  RESET: "RESET",
  THEATER_MODE_TOGGLE: "THEATER_MODE_TOGGLE",
  THEATER_MODE_SET: "THEATER_MODE_SET",
  OPACITY_UPDATE: "OPACITY_UPDATE",
  TAB_REGISTER: "TAB_REGISTER",
  TAB_UNREGISTER: "TAB_UNREGISTER",
  SETTINGS_LOAD: "SETTINGS_LOAD",
  SETTINGS_UPDATE: "SETTINGS_UPDATE",
};
```

##### State

```javascript
/**
 * @typedef {Object} State
 * @property {TheaterModeState} theaterMode - シアターモード状態
 * @property {TabsState} tabs - タブ状態
 * @property {UIState} ui - UI状態
 * @property {Settings} settings - 設定
 */
```

---

## Business Layer

### SettingsManager

スキーマベースの設定管理システムを提供します。

#### クラス定義

```javascript
class SettingsManager {
  constructor(storageAdapter, validator, logger)
}
```

#### コンストラクタ

```javascript
constructor(storageAdapter, validator, logger);
```

**パラメータ:**

- `storageAdapter` (StorageAdapter): ストレージアダプター
- `validator` (DataValidator): データバリデーター
- `logger` (Logger): ロガーインスタンス

#### メソッド

##### loadSettings()

```javascript
async loadSettings()
```

設定を読み込みます。

**戻り値:**

- `Promise<Result<Settings>>`: 設定オブジェクト

##### saveSettings(settings)

```javascript
async saveSettings(settings)
```

設定を保存します。

**パラメータ:**

- `settings` (Partial<Settings>): 保存する設定

**戻り値:**

- `Promise<Result<void>>`: 保存結果

##### validateSettings(settings)

```javascript
validateSettings(settings);
```

設定をバリデートします。

**パラメータ:**

- `settings` (Object): バリデーション対象

**戻り値:**

- `Result<Settings>`: バリデーション結果

##### getSettingsSchema()

```javascript
getSettingsSchema();
```

設定スキーマを取得します。

**戻り値:**

- `Schema`: 設定スキーマ

##### migrateSettings(oldSettings, targetVersion)

```javascript
async migrateSettings(oldSettings, targetVersion)
```

設定を指定バージョンに移行します。

**パラメータ:**

- `oldSettings` (Object): 旧設定
- `targetVersion` (string): 移行先バージョン

**戻り値:**

- `Promise<Result<Settings>>`: 移行結果

#### 型定義

##### Settings

```javascript
/**
 * @typedef {Object} Settings
 * @property {number} opacity - デフォルト透明度 (0-0.9)
 * @property {string} keyboardShortcut - キーボードショートカット
 * @property {boolean} theaterModeEnabled - 初期状態
 * @property {string} version - 設定バージョン
 */
```

---

## Element Management Layer

### ElementManager

YouTube 要素の検出と管理を行います。

#### クラス定義

```javascript
class ElementManager {
  constructor(logger, errorHandler)
}
```

#### メソッド

##### detectVideoPlayer()

```javascript
async detectVideoPlayer()
```

動画プレーヤーを検出します。

**戻り値:**

- `Promise<Result<Element>>`: プレーヤー要素

##### detectOverlayTargets()

```javascript
async detectOverlayTargets()
```

オーバーレイ対象要素を検出します。

**戻り値:**

- `Promise<Result<Element[]>>`: 対象要素配列

##### observeElement(element, callback)

```javascript
observeElement(element, callback);
```

要素の可視性を監視します。

**パラメータ:**

- `element` (Element): 監視対象要素
- `callback` (Function): 変更コールバック

**戻り値:**

- `Function`: 監視停止関数

---

### OverlayManager

オーバーレイの適用と管理を行います。

#### クラス定義

```javascript
class OverlayManager {
  constructor(logger, errorHandler)
}
```

#### メソッド

##### applyOverlay(elements, opacity)

```javascript
async applyOverlay(elements, opacity)
```

オーバーレイを適用します。

**パラメータ:**

- `elements` (Element[]): 対象要素
- `opacity` (number): 透明度

**戻り値:**

- `Promise<Result<void>>`: 適用結果

##### removeOverlay(elements)

```javascript
async removeOverlay(elements)
```

オーバーレイを削除します。

**パラメータ:**

- `elements` (Element[]): 対象要素

**戻り値:**

- `Promise<Result<void>>`: 削除結果

---

## Theater Mode Controller

### TheaterModeController

シアターモード制御の中核機能を提供します。

#### クラス定義

```javascript
class TheaterModeController {
  constructor(dependencies)
}
```

#### コンストラクタ

```javascript
constructor(dependencies);
```

**パラメータ:**

- `dependencies` (Object): 依存オブジェクト
  - `elementManager` (ElementManager): 要素管理クラス
  - `overlayManager` (OverlayManager): オーバーレイ管理クラス
  - `stateStore` (StateStore): 状態管理クラス
  - `logger` (Logger): ロガーインスタンス
  - `errorHandler` (ErrorHandler): エラーハンドラーインスタンス

#### メソッド

##### initialize()

```javascript
async initialize()
```

コントローラーを初期化します。

**戻り値:**

- `Promise<Result<boolean>>`: 初期化結果

##### toggle()

```javascript
async toggle()
```

シアターモードを切り替えます。

**戻り値:**

- `Promise<Result<boolean>>`: 切り替え結果

##### updateOpacity(opacity)

```javascript
async updateOpacity(opacity)
```

透明度を更新します。

**パラメータ:**

- `opacity` (number): 新しい透明度

**戻り値:**

- `Promise<Result<void>>`: 更新結果

##### cleanup()

```javascript
cleanup();
```

リソースをクリーンアップします。

---

## 使用例とベストプラクティス

### 基本的な使用例

#### Logger の使用

```javascript
// ロガーの初期化
const logger = new Logger("MyComponent", {
  level: Logger.LogLevel.DEBUG,
  destination: ["console", "memory"],
});

// ログの出力
logger.info("Component initialized");
logger.error("Failed to process", error, { context: "processing" });

// パフォーマンス測定
const timerId = logger.startTimer("operation");
// ... 処理 ...
logger.endTimer(timerId);
```

#### ErrorHandler の使用

```javascript
// エラーハンドラーの初期化
const errorHandler = new ErrorHandler(logger);

// 非同期処理のラップ
const result = await errorHandler.wrapAsync(fetch("/api/data"));

if (result.success) {
  console.log("Success:", result.data);
} else {
  const userMessage = errorHandler.getUserMessage(result.error);
  showUserNotification(userMessage);
}
```

#### StateStore の使用

```javascript
// 状態ストアの初期化
const stateStore = new StateStore(logger, errorHandler);

// 状態変更の監視
const unsubscribe = stateStore.subscribe((state) => {
  console.log("State changed:", state);
});

// アクションのディスパッチ
await stateStore.dispatch({
  type: "THEATER_MODE_TOGGLE",
  payload: { tabId: 123 },
});

// クリーンアップ
unsubscribe();
```

### ベストプラクティス

#### 1. 依存性注入の使用

```javascript
// 良い例: 依存性注入を使用
class MyController {
  constructor(dependencies) {
    this.logger = dependencies.logger;
    this.errorHandler = dependencies.errorHandler;
  }
}

// 悪い例: 直接インスタンス化
class MyController {
  constructor() {
    this.logger = new Logger("MyController"); // テストが困難
  }
}
```

#### 2. Result 型パターンの活用

```javascript
// 良い例: Result型を使用
async function processData(data) {
  const result = await errorHandler.wrapAsync(validateAndProcess(data));

  if (result.success) {
    return result.data;
  } else {
    logger.error("Processing failed", result.error);
    throw result.error;
  }
}

// 悪い例: 例外をそのまま投げる
async function processData(data) {
  return await validateAndProcess(data); // エラー処理が不十分
}
```

#### 3. 適切なログレベルの使用

```javascript
// 良い例: 適切なログレベル
logger.debug("Detailed debugging info", { data });
logger.info("Operation completed successfully");
logger.warn("Deprecated API used", { api: "oldMethod" });
logger.error("Critical error occurred", error);

// 悪い例: すべて同じレベル
logger.info("Detailed debugging info", { data }); // デバッグ情報なのにINFO
logger.info("Critical error occurred", error); // エラーなのにINFO
```

#### 4. メモリリークの防止

```javascript
// 良い例: 適切なクリーンアップ
class MyComponent {
  constructor() {
    this.unsubscribers = [];
  }

  initialize() {
    const unsubscribe = stateStore.subscribe(this.handleStateChange);
    this.unsubscribers.push(unsubscribe);
  }

  cleanup() {
    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
    this.unsubscribers = [];
  }
}

// 悪い例: クリーンアップなし
class MyComponent {
  initialize() {
    stateStore.subscribe(this.handleStateChange); // メモリリークの原因
  }
}
```

---

## トラブルシューティング

### よくある問題と解決方法

#### 1. ログが出力されない

**問題:** ログが期待通りに出力されない

**解決方法:**

- ログレベルを確認する
- 出力先設定を確認する
- ブラウザのコンソールフィルターを確認する

```javascript
// ログレベルを下げる
logger.setLevel(Logger.LogLevel.DEBUG);

// 出力先を確認
const memoryLogs = logger.getMemoryLogs();
console.log("Memory logs:", memoryLogs);
```

#### 2. 状態が更新されない

**問題:** StateStore の状態が期待通りに更新されない

**解決方法:**

- アクションタイプが正しいか確認する
- リデューサーが正しく実装されているか確認する
- ミドルウェアが状態更新をブロックしていないか確認する

```javascript
// デバッグ用ミドルウェアを追加
stateStore.addMiddleware((action, state, next) => {
  console.log("Action:", action);
  console.log("Current state:", state);
  const result = next(action, state);
  console.log("New state:", result);
  return result;
});
```

#### 3. メッセージが送信されない

**問題:** MessageBus でメッセージが送信されない

**解決方法:**

- ハンドラーが正しく登録されているか確認する
- メッセージタイプが正しいか確認する
- 送信先が正しいか確認する

```javascript
// ハンドラーの登録状況を確認
console.log("Registered handlers:", messageBus.getRegisteredHandlers());

// メッセージ送信をデバッグ
const result = await messageBus.sendMessage(message, target);
if (!result.success) {
  console.error("Message send failed:", result.error);
}
```

---

## パフォーマンス考慮事項

### メモリ使用量の最適化

1. **適切なクリーンアップ**

   - イベントリスナーの解除
   - タイマーのクリア
   - オブザーバーの停止

2. **メモリリークの防止**

   - 循環参照の回避
   - WeakMap の活用
   - 適切なスコープ管理

3. **効率的なデータ構造**
   - 必要最小限のデータ保持
   - 適切なキャッシュ戦略
   - ガベージコレクションの最適化

### DOM 操作の最適化

1. **バッチ処理**

   - DOM 更新のまとめ実行
   - レイアウトスラッシングの回避
   - 仮想 DOM パターンの活用

2. **効率的なセレクター**
   - ID セレクターの優先使用
   - 深いネストの回避
   - キャッシュの活用

---

この API リファレンスは、YouTube Theater Mode 拡張機能の開発とメンテナンスに必要な全ての情報を提供します。各クラスとメソッドの詳細な使用方法、ベストプラクティス、トラブルシューティング情報を参考に、効率的で保守性の高いコードを作成してください。

## 使用例とコードサンプル

### 基本的な初期化パターン

#### 依存性注入を使用したコンポーネント初期化

```javascript
/**
 * 推奨される初期化パターン
 * 依存性注入により、テスタブルで保守性の高いコードを実現
 */
async function initializeTheaterMode() {
  // 基盤コンポーネントの初期化
  const logger = new Logger("TheaterMode", {
    level: Logger.LogLevel.INFO,
    destination: ["console", "memory"],
  });

  const errorHandler = new ErrorHandler(logger);
  const storageAdapter = new StorageAdapter({
    namespace: "ytTheaterMode",
    preferredType: StorageType.CHROME_SYNC,
  });

  // ビジネスロジックコンポーネントの初期化
  const stateStore = new StateStore(logger, errorHandler);
  const settingsManager = new SettingsManager({
    storageAdapter,
    logger,
    errorHandler,
  });

  // UI管理コンポーネントの初期化
  const elementManager = new ElementManager(logger, errorHandler);
  const overlayManager = new OverlayManager(logger, errorHandler);

  // メインコントローラーの初期化
  const theaterModeController = new TheaterModeController({
    elementManager,
    overlayManager,
    stateStore,
    logger,
    errorHandler,
  });

  // 初期化実行
  const initResult = await theaterModeController.initialize();
  if (initResult.success) {
    logger.info("Theater mode initialized successfully");
    return theaterModeController;
  } else {
    logger.error("Failed to initialize theater mode", initResult.error);
    throw initResult.error;
  }
}
```

#### エラーハンドリングのベストプラクティス

```javascript
/**
 * Result型パターンを使用した堅牢なエラーハンドリング
 */
class RobustTheaterModeService {
  constructor(dependencies) {
    this.controller = dependencies.controller;
    this.logger = dependencies.logger;
    this.errorHandler = dependencies.errorHandler;
  }

  /**
   * シアターモード切り替えの安全な実装
   * @returns {Promise<Result<boolean>>} 切り替え結果
   */
  async safeToggleTheaterMode() {
    return this.errorHandler.wrapAsync(async () => {
      // 前処理のバリデーション
      const validationResult = await this.validateEnvironment();
      if (!validationResult.success) {
        throw validationResult.error;
      }

      // メイン処理の実行
      const toggleResult = await this.controller.toggle();
      if (!toggleResult.success) {
        throw toggleResult.error;
      }

      // 後処理の実行
      await this.notifyStateChange(toggleResult.data);

      return toggleResult.data;
    });
  }

  /**
   * 環境の妥当性を検証
   * @returns {Promise<Result<void>>} 検証結果
   */
  async validateEnvironment() {
    return this.errorHandler.wrapAsync(async () => {
      // YouTube ページの確認
      if (!window.location.hostname.includes("youtube.com")) {
        throw this.errorHandler.createError(
          ErrorType.VALIDATION_ERROR,
          "This extension only works on YouTube pages",
          { hostname: window.location.hostname }
        );
      }

      // 動画プレーヤーの存在確認
      const player = document.querySelector("#movie_player");
      if (!player) {
        throw this.errorHandler.createError(
          ErrorType.ELEMENT_NOT_FOUND,
          "Video player not found",
          { selector: "#movie_player" }
        );
      }

      this.logger.debug("Environment validation passed");
    });
  }

  /**
   * 状態変更の通知
   * @param {boolean} isEnabled - 新しい状態
   */
  async notifyStateChange(isEnabled) {
    try {
      // UI更新
      await this.updateUI(isEnabled);

      // アクセシビリティ通知
      this.announceStateChange(isEnabled);

      // 統計情報の更新
      await this.updateUsageStats(isEnabled);
    } catch (error) {
      this.logger.warn("Failed to notify state change", error);
      // 通知の失敗は致命的ではないため、エラーを投げない
    }
  }
}
```

### 高度な使用パターン

#### カスタムミドルウェアの実装

```javascript
/**
 * StateStore用のカスタムミドルウェア実装例
 */

// ログ記録ミドルウェア
const loggingMiddleware = (logger) => (action, state, next) => {
  const startTime = performance.now();
  logger.debug("Action dispatched", {
    type: action.type,
    payload: action.payload,
  });

  const result = next(action, state);

  const endTime = performance.now();
  logger.debug("Action completed", {
    type: action.type,
    duration: endTime - startTime,
    success: result.success,
  });

  return result;
};

// パフォーマンス監視ミドルウェア
const performanceMiddleware = (performanceMonitor) => (action, state, next) => {
  const timerId = performanceMonitor.startTimer(`action_${action.type}`);

  try {
    const result = next(action, state);
    performanceMonitor.endTimer(timerId);

    // パフォーマンス閾値の監視
    const duration = performanceMonitor.getTimerDuration(timerId);
    if (duration > 100) {
      // 100ms以上の場合は警告
      performanceMonitor.recordSlowAction(action.type, duration);
    }

    return result;
  } catch (error) {
    performanceMonitor.endTimer(timerId);
    performanceMonitor.recordFailedAction(action.type, error);
    throw error;
  }
};

// バリデーションミドルウェア
const validationMiddleware = (validator) => (action, state, next) => {
  // アクションの妥当性を検証
  const validationResult = validator.validateAction(action);
  if (!validationResult.success) {
    throw new AppError(ErrorType.VALIDATION_ERROR, "Invalid action", {
      action,
      errors: validationResult.errors,
    });
  }

  return next(action, state);
};

// ミドルウェアの適用
stateStore.addMiddleware(loggingMiddleware(logger));
stateStore.addMiddleware(performanceMiddleware(performanceMonitor));
stateStore.addMiddleware(validationMiddleware(dataValidator));
```

#### カスタムストレージアダプターの実装

```javascript
/**
 * IndexedDB を使用したカスタムストレージアダプター
 */
class IndexedDBStorageAdapter extends StorageAdapter {
  constructor(options = {}) {
    super(options);
    this.dbName = options.dbName || "YTTheaterModeDB";
    this.dbVersion = options.dbVersion || 1;
    this.storeName = options.storeName || "settings";
    this.db = null;
  }

  /**
   * IndexedDB接続を初期化
   * @returns {Promise<Result<void>>} 初期化結果
   */
  async initialize() {
    return this.errorHandler.wrapAsync(async () => {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(this.dbName, this.dbVersion);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          this.db = request.result;
          resolve();
        };

        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains(this.storeName)) {
            db.createObjectStore(this.storeName, { keyPath: "key" });
          }
        };
      });
    });
  }

  /**
   * データを取得
   * @param {string} key - 取得するキー
   * @returns {Promise<Result<any>>} 取得結果
   */
  async get(key) {
    return this.errorHandler.wrapAsync(async () => {
      const transaction = this.db.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);

      return new Promise((resolve, reject) => {
        const request = store.get(key);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const result = request.result;
          resolve(result ? result.value : undefined);
        };
      });
    });
  }

  /**
   * データを保存
   * @param {string} key - 保存するキー
   * @param {any} value - 保存する値
   * @returns {Promise<Result<void>>} 保存結果
   */
  async set(key, value) {
    return this.errorHandler.wrapAsync(async () => {
      const transaction = this.db.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);

      return new Promise((resolve, reject) => {
        const request = store.put({ key, value, timestamp: Date.now() });
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
      });
    });
  }
}
```

### テスト実装例

#### 単体テストの実装

```javascript
/**
 * TheaterModeController の単体テスト例
 */
describe("TheaterModeController", () => {
  let controller;
  let mockDependencies;

  beforeEach(() => {
    // モック依存関係の作成
    mockDependencies = {
      elementManager: {
        detectVideoPlayer: jest.fn(),
        detectOverlayTargets: jest.fn(),
        observeElement: jest.fn(),
      },
      overlayManager: {
        applyOverlay: jest.fn(),
        removeOverlay: jest.fn(),
      },
      stateStore: {
        dispatch: jest.fn(),
        subscribe: jest.fn(),
        getState: jest.fn(),
      },
      logger: {
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
      },
      errorHandler: {
        wrapAsync: jest.fn((fn) => fn()),
        createError: jest.fn(),
      },
    };

    controller = new TheaterModeController(mockDependencies);
  });

  describe("initialize", () => {
    it("should initialize successfully when video player is found", async () => {
      // Arrange
      const mockPlayer = document.createElement("div");
      mockDependencies.elementManager.detectVideoPlayer.mockResolvedValue(
        Result.success(mockPlayer)
      );
      mockDependencies.stateStore.getState.mockReturnValue({
        theaterMode: { isEnabled: false, opacity: 0.7 },
      });

      // Act
      const result = await controller.initialize();

      // Assert
      expect(result.success).toBe(true);
      expect(
        mockDependencies.elementManager.detectVideoPlayer
      ).toHaveBeenCalled();
      expect(mockDependencies.logger.info).toHaveBeenCalledWith(
        expect.stringContaining("initialized")
      );
    });

    it("should fail gracefully when video player is not found", async () => {
      // Arrange
      mockDependencies.elementManager.detectVideoPlayer.mockResolvedValue(
        Result.failure(
          new AppError(ErrorType.ELEMENT_NOT_FOUND, "Player not found")
        )
      );

      // Act
      const result = await controller.initialize();

      // Assert
      expect(result.success).toBe(false);
      expect(result.error.type).toBe(ErrorType.ELEMENT_NOT_FOUND);
    });
  });

  describe("toggle", () => {
    beforeEach(async () => {
      // コントローラーを初期化済み状態にする
      const mockPlayer = document.createElement("div");
      mockDependencies.elementManager.detectVideoPlayer.mockResolvedValue(
        Result.success(mockPlayer)
      );
      mockDependencies.stateStore.getState.mockReturnValue({
        theaterMode: { isEnabled: false, opacity: 0.7 },
      });

      await controller.initialize();
    });

    it("should toggle theater mode from disabled to enabled", async () => {
      // Arrange
      mockDependencies.stateStore.dispatch.mockResolvedValue(
        Result.success({ isEnabled: true })
      );

      // Act
      const result = await controller.toggle();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect(mockDependencies.stateStore.dispatch).toHaveBeenCalledWith({
        type: ActionType.THEATER_MODE_TOGGLE,
        payload: expect.any(Object),
      });
    });
  });
});
```

#### 統合テストの実装

```javascript
/**
 * エンドツーエンド統合テスト例
 */
describe("Theater Mode Integration", () => {
  let testHarness;

  beforeEach(async () => {
    testHarness = new IntegrationTestHarness();
    await testHarness.setup();
  });

  afterEach(async () => {
    await testHarness.cleanup();
  });

  it("should complete full theater mode workflow", async () => {
    // YouTube ページをシミュレート
    await testHarness.loadYouTubePage();

    // 拡張機能を初期化
    const controller = await testHarness.initializeExtension();

    // シアターモードを有効化
    const toggleResult = await controller.toggle();
    expect(toggleResult.success).toBe(true);
    expect(toggleResult.data).toBe(true);

    // オーバーレイが適用されていることを確認
    const overlayElements = testHarness.getOverlayElements();
    expect(overlayElements.length).toBeGreaterThan(0);

    // 透明度を変更
    const opacityResult = await controller.updateOpacity(0.5);
    expect(opacityResult.success).toBe(true);

    // 変更が反映されていることを確認
    const currentOpacity = testHarness.getCurrentOpacity();
    expect(currentOpacity).toBe(0.5);

    // シアターモードを無効化
    const disableResult = await controller.toggle();
    expect(disableResult.success).toBe(true);
    expect(disableResult.data).toBe(false);

    // オーバーレイが削除されていることを確認
    const remainingOverlays = testHarness.getOverlayElements();
    expect(remainingOverlays.length).toBe(0);
  });
});
```

### パフォーマンス最適化の実装例

#### メモリ効率的なオブザーバーパターン

```javascript
/**
 * メモリリークを防ぐオブザーバー実装
 */
class MemoryEfficientObserver {
  constructor() {
    this.observers = new WeakMap();
    this.cleanupTasks = new Set();
  }

  /**
   * 要素の変更を監視
   * @param {Element} element - 監視対象要素
   * @param {Function} callback - 変更コールバック
   * @returns {Function} 監視停止関数
   */
  observe(element, callback) {
    // WeakMapを使用してメモリリークを防ぐ
    if (!this.observers.has(element)) {
      this.observers.set(element, new Set());
    }

    const callbacks = this.observers.get(element);
    callbacks.add(callback);

    // Intersection Observer を使用した効率的な監視
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const elementCallbacks = this.observers.get(entry.target);
          if (elementCallbacks) {
            elementCallbacks.forEach((cb) => {
              try {
                cb(entry);
              } catch (error) {
                console.error("Observer callback error:", error);
              }
            });
          }
        });
      },
      {
        threshold: [0, 0.1, 0.5, 1.0],
        rootMargin: "10px",
      }
    );

    observer.observe(element);

    // クリーンアップ関数を返す
    const cleanup = () => {
      observer.unobserve(element);
      observer.disconnect();

      const callbacks = this.observers.get(element);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.observers.delete(element);
        }
      }

      this.cleanupTasks.delete(cleanup);
    };

    this.cleanupTasks.add(cleanup);
    return cleanup;
  }

  /**
   * すべての監視を停止
   */
  cleanup() {
    this.cleanupTasks.forEach((cleanup) => cleanup());
    this.cleanupTasks.clear();
  }
}
```

#### 効率的な DOM 操作バッチング

```javascript
/**
 * DOM操作のバッチ処理による最適化
 */
class OptimizedDOMManager {
  constructor() {
    this.pendingUpdates = new Map();
    this.updateScheduled = false;
  }

  /**
   * DOM更新をスケジュール
   * @param {Element} element - 更新対象要素
   * @param {Function} updateFn - 更新関数
   */
  scheduleUpdate(element, updateFn) {
    // 同じ要素の更新をまとめる
    if (!this.pendingUpdates.has(element)) {
      this.pendingUpdates.set(element, []);
    }

    this.pendingUpdates.get(element).push(updateFn);

    // バッチ処理をスケジュール
    if (!this.updateScheduled) {
      this.updateScheduled = true;
      requestAnimationFrame(() => this.flushUpdates());
    }
  }

  /**
   * 蓄積された更新を一括実行
   */
  flushUpdates() {
    // レイアウトスラッシングを防ぐため、読み取りと書き込みを分離
    const readOperations = [];
    const writeOperations = [];

    this.pendingUpdates.forEach((updates, element) => {
      updates.forEach((updateFn) => {
        const operation = updateFn(element);
        if (operation.type === "read") {
          readOperations.push(operation);
        } else {
          writeOperations.push(operation);
        }
      });
    });

    // 読み取り操作を先に実行
    readOperations.forEach((op) => op.execute());

    // 書き込み操作を後に実行
    writeOperations.forEach((op) => op.execute());

    // 状態をリセット
    this.pendingUpdates.clear();
    this.updateScheduled = false;
  }

  /**
   * オーバーレイの効率的な適用
   * @param {Element[]} elements - 対象要素配列
   * @param {number} opacity - 透明度
   */
  applyOverlayBatch(elements, opacity) {
    const fragment = document.createDocumentFragment();

    elements.forEach((element) => {
      this.scheduleUpdate(element, (el) => ({
        type: "write",
        execute: () => {
          // CSS変数を使用した効率的なスタイル適用
          el.style.setProperty("--theater-overlay-opacity", opacity);
          el.classList.add("theater-mode-overlay");
        },
      }));
    });
  }
}
```

これらの実装例は、YouTube Theater Mode 拡張機能の各コンポーネントを効果的に活用し、保守性とパフォーマンスを両立させる方法を示しています。実際の開発では、プロジェクトの要件に応じてこれらのパターンを適用してください。
