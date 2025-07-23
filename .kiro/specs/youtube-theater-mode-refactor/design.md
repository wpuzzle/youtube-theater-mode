# YouTube Theater Mode リファクタリング設計書

## 概要

既存の YouTube Theater Mode 拡張機能を、モジュラーアーキテクチャ、改善されたエラーハンドリング、最適化されたパフォーマンス、強化されたテスタビリティを持つ構造にリファクタリングする。現在の機能を完全に維持しながら、コードの品質と保守性を大幅に向上させる。

## アーキテクチャ

### 新しいシステム構成

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                       │
├─────────────────────────────────────────────────────────────┤
│  PopupUI        │  ContentScript    │  BackgroundService    │
│  - UIController │  - TheaterMode    │  - ServiceWorker      │
│  - EventHandler │  - ElementManager │  - MessageRouter      │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                     Business Layer                          │
├─────────────────────────────────────────────────────────────┤
│  StateManager   │  SettingsManager  │  TabManager           │
│  - State Store  │  - Config Schema  │  - Tab Tracking       │
│  - Actions      │  - Validation     │  - Sync Manager       │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                   Infrastructure Layer                      │
├─────────────────────────────────────────────────────────────┤
│  StorageAdapter │  MessageBus       │  Logger               │
│  - Chrome API   │  - Type Safety    │  - Structured Logs    │
│  - Fallbacks    │  - Error Handling │  - Debug Utils        │
└─────────────────────────────────────────────────────────────┘
```

### 技術スタック

- **アーキテクチャパターン**: Layered Architecture + Observer Pattern
- **モジュールシステム**: ES6 Modules with IIFE fallback
- **型システム**: JSDoc with TypeScript-style annotations
- **エラーハンドリング**: Result Pattern + Structured Error Types
- **状態管理**: Flux-inspired unidirectional data flow
- **通信**: Type-safe message passing with validation

## コンポーネントとインターフェース

### 1. Core Types and Interfaces

```javascript
/**
 * @typedef {Object} TheaterModeState
 * @property {boolean} isEnabled - シアターモードの有効状態
 * @property {number} opacity - オーバーレイの透明度 (0-0.9)
 * @property {boolean} isInitialized - 初期化完了フラグ
 * @property {number} lastUpdated - 最終更新時刻
 */

/**
 * @typedef {Object} Settings
 * @property {number} opacity - デフォルト透明度
 * @property {string} keyboardShortcut - キーボードショートカット
 * @property {boolean} theaterModeEnabled - 初期状態
 * @property {string} version - 設定バージョン
 */

/**
 * @typedef {Object} TabState
 * @property {number} tabId - タブID
 * @property {string} url - タブURL
 * @property {TheaterModeState} theaterMode - シアターモード状態
 * @property {boolean} isActive - アクティブタブフラグ
 * @property {number} lastSync - 最終同期時刻
 */
```

### 2. State Management Layer

```javascript
/**
 * 状態管理の中核クラス
 * Flux パターンに基づく一方向データフロー
 */
class StateStore {
  constructor() {
    this.state = this.getInitialState();
    this.listeners = new Set();
    this.middleware = [];
  }

  /**
   * アクションをディスパッチして状態を更新
   * @param {Action} action - 実行するアクション
   * @returns {Promise<Result>} 実行結果
   */
  async dispatch(action) {}

  /**
   * 状態変更を監視
   * @param {Function} listener - 状態変更リスナー
   * @returns {Function} アンサブスクライブ関数
   */
  subscribe(listener) {}

  /**
   * 現在の状態を取得
   * @returns {State} 現在の状態
   */
  getState() {}
}

/**
 * アクション定義
 */
const Actions = {
  TOGGLE_THEATER_MODE: "TOGGLE_THEATER_MODE",
  UPDATE_OPACITY: "UPDATE_OPACITY",
  SYNC_TAB_STATE: "SYNC_TAB_STATE",
  INITIALIZE_EXTENSION: "INITIALIZE_EXTENSION",
};
```

### 3. Settings Management Layer

```javascript
/**
 * 設定管理クラス
 * スキーマベースのバリデーションと型安全性を提供
 */
class SettingsManager {
  constructor(storageAdapter, validator) {
    this.storage = storageAdapter;
    this.validator = validator;
    this.schema = this.getSettingsSchema();
  }

  /**
   * 設定スキーマを取得
   * @returns {Schema} 設定スキーマ
   */
  getSettingsSchema() {
    return {
      opacity: { type: "number", min: 0, max: 0.9, default: 0.7 },
      keyboardShortcut: { type: "string", default: "t" },
      theaterModeEnabled: { type: "boolean", default: false },
      version: { type: "string", default: "1.0.0" },
    };
  }

  /**
   * 設定を読み込み
   * @returns {Promise<Result<Settings>>} 設定オブジェクト
   */
  async loadSettings() {}

  /**
   * 設定を保存
   * @param {Partial<Settings>} settings - 保存する設定
   * @returns {Promise<Result<void>>} 保存結果
   */
  async saveSettings(settings) {}

  /**
   * 設定をバリデート
   * @param {Object} settings - バリデーション対象
   * @returns {Result<Settings>} バリデーション結果
   */
  validateSettings(settings) {}
}
```

### 4. Element Detection and Management

```javascript
/**
 * YouTube要素の検出と管理
 * 堅牢なセレクター戦略とフォールバック機能
 */
class ElementManager {
  constructor(logger) {
    this.logger = logger;
    this.selectors = this.getSelectors();
    this.cache = new Map();
  }

  /**
   * セレクター定義を取得
   * @returns {SelectorConfig} セレクター設定
   */
  getSelectors() {
    return {
      videoPlayer: [
        "#movie_player",
        ".html5-video-player",
        '[data-testid="video-player"]',
      ],
      overlayTargets: ["#secondary", "#comments", "ytd-comments", "#masthead"],
      protectedElements: [".ytp-chrome-controls", ".video-stream"],
    };
  }

  /**
   * 動画プレーヤーを検出
   * @returns {Promise<Result<Element>>} プレーヤー要素
   */
  async detectVideoPlayer() {}

  /**
   * オーバーレイ対象要素を検出
   * @returns {Promise<Result<Element[]>>} 対象要素配列
   */
  async detectOverlayTargets() {}

  /**
   * 要素の可視性を監視
   * @param {Element} element - 監視対象要素
   * @param {Function} callback - 変更コールバック
   * @returns {Function} 監視停止関数
   */
  observeElement(element, callback) {}
}
```

### 5. Theater Mode Controller

```javascript
/**
 * シアターモード制御の中核クラス
 * 単一責任の原則に基づく設計
 */
class TheaterModeController {
  constructor(elementManager, stateStore, logger) {
    this.elementManager = elementManager;
    this.stateStore = stateStore;
    this.logger = logger;
    this.overlayManager = new OverlayManager();
  }

  /**
   * シアターモードを初期化
   * @returns {Promise<Result<void>>} 初期化結果
   */
  async initialize() {}

  /**
   * シアターモードを切り替え
   * @returns {Promise<Result<boolean>>} 切り替え結果
   */
  async toggle() {}

  /**
   * 透明度を更新
   * @param {number} opacity - 新しい透明度
   * @returns {Promise<Result<void>>} 更新結果
   */
  async updateOpacity(opacity) {}

  /**
   * オーバーレイを適用
   * @param {Element[]} elements - 対象要素
   * @param {number} opacity - 透明度
   * @returns {Promise<Result<void>>} 適用結果
   */
  async applyOverlay(elements, opacity) {}
}
```

### 6. Message Bus System

```javascript
/**
 * 型安全なメッセージバスシステム
 * 拡張機能内の全通信を管理
 */
class MessageBus {
  constructor(logger) {
    this.logger = logger;
    this.handlers = new Map();
    this.middleware = [];
  }

  /**
   * メッセージハンドラーを登録
   * @param {string} type - メッセージタイプ
   * @param {Function} handler - ハンドラー関数
   */
  registerHandler(type, handler) {}

  /**
   * メッセージを送信
   * @param {Message} message - 送信メッセージ
   * @param {MessageTarget} target - 送信先
   * @returns {Promise<Result<any>>} 送信結果
   */
  async sendMessage(message, target) {}

  /**
   * メッセージを受信
   * @param {Message} message - 受信メッセージ
   * @param {MessageSender} sender - 送信元
   * @returns {Promise<Result<any>>} 処理結果
   */
  async receiveMessage(message, sender) {}
}
```

## データモデル

### 状態管理データ構造

```javascript
/**
 * アプリケーション全体の状態
 */
const AppState = {
  // シアターモード状態
  theaterMode: {
    isEnabled: false,
    opacity: 0.7,
    isInitialized: false,
    lastUpdated: 0,
  },

  // タブ状態
  tabs: {
    activeTabId: null,
    tabStates: new Map(), // tabId -> TabState
    lastSync: 0,
  },

  // UI状態
  ui: {
    popupOpen: false,
    connectionStatus: "disconnected",
    lastError: null,
  },

  // 設定
  settings: {
    opacity: 0.7,
    keyboardShortcut: "t",
    theaterModeEnabled: false,
    version: "1.0.0",
  },
};
```

### エラー型定義

```javascript
/**
 * 構造化エラー型
 */
const ErrorTypes = {
  INITIALIZATION_ERROR: "INITIALIZATION_ERROR",
  ELEMENT_NOT_FOUND: "ELEMENT_NOT_FOUND",
  STORAGE_ERROR: "STORAGE_ERROR",
  COMMUNICATION_ERROR: "COMMUNICATION_ERROR",
  VALIDATION_ERROR: "VALIDATION_ERROR",
};

/**
 * Result型パターン
 * @template T
 * @typedef {Object} Result
 * @property {boolean} success - 成功フラグ
 * @property {T} [data] - 成功時のデータ
 * @property {Error} [error] - エラー情報
 */
```

## エラーハンドリング

### 統一エラーハンドリング戦略

```javascript
/**
 * エラーハンドリングユーティリティ
 */
class ErrorHandler {
  constructor(logger) {
    this.logger = logger;
  }

  /**
   * 非同期処理をResult型でラップ
   * @param {Promise} promise - 対象Promise
   * @returns {Promise<Result>} Result型Promise
   */
  async wrapAsync(promise) {
    try {
      const data = await promise;
      return { success: true, data };
    } catch (error) {
      this.logger.error("Async operation failed", error);
      return { success: false, error };
    }
  }

  /**
   * エラーを分類して適切に処理
   * @param {Error} error - エラーオブジェクト
   * @returns {ErrorInfo} エラー情報
   */
  categorizeError(error) {}

  /**
   * ユーザーフレンドリーなエラーメッセージを生成
   * @param {Error} error - エラーオブジェクト
   * @returns {string} ユーザー向けメッセージ
   */
  getUserMessage(error) {}
}
```

### リトライ機構

```javascript
/**
 * 指数バックオフによるリトライ機構
 */
class RetryManager {
  constructor(maxRetries = 3, baseDelay = 1000) {
    this.maxRetries = maxRetries;
    this.baseDelay = baseDelay;
  }

  /**
   * リトライ付きで処理を実行
   * @param {Function} operation - 実行する処理
   * @param {RetryOptions} options - リトライオプション
   * @returns {Promise<Result>} 実行結果
   */
  async withRetry(operation, options = {}) {}
}
```

## テスト戦略

### 単体テスト構造

```javascript
/**
 * テスト可能な設計のための依存性注入
 */
class TestableTheaterModeController {
  constructor(dependencies) {
    this.elementManager = dependencies.elementManager;
    this.stateStore = dependencies.stateStore;
    this.logger = dependencies.logger;
  }
}

/**
 * モックファクトリー
 */
class MockFactory {
  static createElementManager() {
    return {
      detectVideoPlayer: jest.fn(),
      detectOverlayTargets: jest.fn(),
      observeElement: jest.fn(),
    };
  }

  static createStateStore() {
    return {
      dispatch: jest.fn(),
      subscribe: jest.fn(),
      getState: jest.fn(),
    };
  }
}
```

### 統合テスト戦略

```javascript
/**
 * 統合テスト用のテストハーネス
 */
class IntegrationTestHarness {
  constructor() {
    this.mockChrome = this.createMockChrome();
    this.testEnvironment = this.setupTestEnvironment();
  }

  /**
   * Chrome API のモックを作成
   * @returns {Object} モックChrome API
   */
  createMockChrome() {}

  /**
   * テスト環境をセットアップ
   * @returns {TestEnvironment} テスト環境
   */
  setupTestEnvironment() {}
}
```

## パフォーマンス最適化

### メモリ管理

```javascript
/**
 * リソース管理クラス
 * メモリリークを防止し、適切なクリーンアップを実行
 */
class ResourceManager {
  constructor() {
    this.resources = new Set();
    this.cleanupTasks = new Set();
  }

  /**
   * リソースを登録
   * @param {Object} resource - 管理対象リソース
   * @param {Function} cleanup - クリーンアップ関数
   */
  register(resource, cleanup) {}

  /**
   * 全リソースをクリーンアップ
   */
  cleanup() {}
}
```

### DOM 操作最適化

```javascript
/**
 * 効率的なDOM操作ユーティリティ
 */
class DOMOptimizer {
  constructor() {
    this.batchedUpdates = [];
    this.updateScheduled = false;
  }

  /**
   * DOM更新をバッチ処理
   * @param {Function} updateFn - 更新関数
   */
  batchUpdate(updateFn) {}

  /**
   * バッチ処理された更新を実行
   */
  flushUpdates() {}
}
```

## セキュリティ考慮事項

### Content Security Policy

```javascript
/**
 * CSP準拠のスクリプト実行
 */
class SecureScriptExecutor {
  constructor() {
    this.allowedOrigins = ["https://youtube.com", "https://www.youtube.com"];
  }

  /**
   * 安全なスクリプト実行
   * @param {string} script - 実行するスクリプト
   * @param {SecurityContext} context - セキュリティコンテキスト
   * @returns {Promise<Result>} 実行結果
   */
  async executeSecurely(script, context) {}
}
```

### データ検証

```javascript
/**
 * 入力データの検証とサニタイゼーション
 */
class DataValidator {
  constructor() {
    this.schemas = new Map();
  }

  /**
   * データを検証
   * @param {any} data - 検証対象データ
   * @param {Schema} schema - 検証スキーマ
   * @returns {ValidationResult} 検証結果
   */
  validate(data, schema) {}

  /**
   * データをサニタイズ
   * @param {any} data - サニタイズ対象
   * @returns {any} サニタイズ済みデータ
   */
  sanitize(data) {}
}
```

## 移行戦略

### 段階的リファクタリング

1. **Phase 1**: Infrastructure Layer

   - Logger, ErrorHandler, MessageBus の実装
   - 既存コードとの互換性を保持

2. **Phase 2**: Business Layer

   - StateStore, SettingsManager の実装
   - 既存の状態管理を段階的に移行

3. **Phase 3**: Presentation Layer

   - UI コンポーネントのリファクタリング
   - 新しいアーキテクチャへの完全移行

4. **Phase 4**: Testing & Optimization
   - テストスイートの実装
   - パフォーマンス最適化

### 後方互換性

```javascript
/**
 * 既存APIとの互換性を保つアダプター
 */
class LegacyAdapter {
  constructor(newImplementation) {
    this.impl = newImplementation;
  }

  /**
   * 旧APIを新実装にマッピング
   */
  mapLegacyAPI() {}
}
```
