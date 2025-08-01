# YouTube Theater Mode 拡張機能 開発者ガイド

## 概要

このガイドは、YouTube Theater Mode Chrome 拡張機能の開発、カスタマイズ、拡張に関する包括的な情報を提供します。アーキテクチャの理解から新機能の追加まで、開発者が効率的に作業できるよう設計されています。

## 目次

1. [アーキテクチャ概要](#アーキテクチャ概要)
2. [開発環境のセットアップ](#開発環境のセットアップ)
3. [プロジェクト構造](#プロジェクト構造)
4. [設計思想と原則](#設計思想と原則)
5. [新機能の追加方法](#新機能の追加方法)
6. [カスタマイズガイド](#カスタマイズガイド)
7. [テスト戦略](#テスト戦略)
8. [デバッグとトラブルシューティング](#デバッグとトラブルシューティング)
9. [パフォーマンス最適化](#パフォーマンス最適化)
10. [セキュリティ考慮事項](#セキュリティ考慮事項)
11. [デプロイメントガイド](#デプロイメントガイド)

---

## アーキテクチャ概要

### 全体アーキテクチャ

YouTube Theater Mode 拡張機能は、レイヤード・アーキテクチャパターンを採用し、関心の分離と保守性を重視した設計になっています。

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Popup UI    │  │ Content     │  │ Background Service  │  │
│  │ - Controller│  │ Script      │  │ - Service Worker    │  │
│  │ - Events    │  │ - Theater   │  │ - Message Router    │  │
│  │ - Comm.     │  │ - Elements  │  │ - State Sync        │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                     Business Layer                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ State       │  │ Settings    │  │ Tab Management      │  │
│  │ Management  │  │ Management  │  │ - Tab Tracking      │  │
│  │ - Store     │  │ - Schema    │  │ - Sync Manager      │  │
│  │ - Actions   │  │ - Migration │  │ - State Sync        │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                   Infrastructure Layer                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Storage     │  │ Message     │  │ Utilities           │  │
│  │ Adapter     │  │ Bus         │  │ - Logger            │  │
│  │ - Chrome    │  │ - Type      │  │ - Error Handler     │  │
│  │ - Fallback  │  │ - Routing   │  │ - Performance       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 主要コンポーネント

#### Infrastructure Layer（基盤層）

- **Logger**: 構造化ログとパフォーマンス監視
- **ErrorHandler**: 統一エラー処理と Result 型パターン
- **MessageBus**: 型安全なコンポーネント間通信
- **StorageAdapter**: Chrome Storage API の抽象化

#### Business Layer（ビジネス層）

- **StateStore**: Flux パターンによる状態管理
- **SettingsManager**: スキーマベース設定管理
- **TabStateManager**: マルチタブ状態同期

#### Presentation Layer（プレゼンテーション層）

- **TheaterModeController**: シアターモード制御
- **PopupController**: ポップアップ UI 管理
- **ContentScriptManager**: コンテンツスクリプト管理

---

## 開発環境のセットアップ

### 必要な環境

- **Node.js**: v16.0.0 以上（開発ツール用）
- **Chrome**: 最新版（テスト用）
- **Git**: バージョン管理
- **エディタ**: VSCode 推奨（拡張機能サポート）

### セットアップ手順

1. **リポジトリのクローン**

```bash
git clone <repository-url>
cd youtube-theater-mode
```

2. **開発依存関係のインストール**

```bash
npm install
# または
yarn install
```

3. **Chrome 拡張機能の読み込み**

```bash
# Chrome を開く
# chrome://extensions/ に移動
# 「デベロッパーモード」を有効化
# 「パッケージ化されていない拡張機能を読み込む」をクリック
# プロジェクトディレクトリを選択
```

4. **開発ツールの設定**

```bash
# ESLint設定
npm run lint:setup

# Prettier設定
npm run format:setup

# テスト環境設定
npm run test:setup
```

### 推奨 VSCode 拡張機能

```json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-json",
    "yzhang.markdown-all-in-one"
  ]
}
```

---

## プロジェクト構造

### ディレクトリ構成

```
youtube-theater-mode/
├── manifest.json              # 拡張機能マニフェスト
├── background.js              # バックグラウンドサービス
├── content.js                 # コンテンツスクリプト
├── popup.html                 # ポップアップHTML
├── popup.js                   # ポップアップスクリプト
├── popup.css                  # ポップアップスタイル
├── theater-mode.css           # シアターモードスタイル
├── infrastructure/            # インフラストラクチャ層
│   ├── logger.js             # ログ機能
│   ├── error-handler.js      # エラー処理
│   ├── message-bus.js        # メッセージング
│   ├── storage-adapter.js    # ストレージ抽象化
│   ├── state-store.js        # 状態管理
│   ├── settings-manager.js   # 設定管理
│   └── ...                   # その他のユーティリティ
├── test/                     # テストファイル
│   ├── unit/                 # 単体テスト
│   ├── integration/          # 統合テスト
│   └── fixtures/             # テストデータ
├── docs/                     # ドキュメント
│   ├── api-reference.md      # API リファレンス
│   ├── developer-guide.md    # 開発者ガイド
│   └── architecture.md       # アーキテクチャ詳細
└── icons/                    # アイコンファイル
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### ファイル命名規則

- **クラスファイル**: PascalCase + kebab-case（例: `theater-mode-controller.js`）
- **ユーティリティ**: kebab-case（例: `error-handler.js`）
- **テストファイル**: `test-` プレフィックス（例: `test-logger.js`）
- **設定ファイル**: 小文字（例: `manifest.json`）

---

## 設計思想と原則

### 核となる設計原則

#### 1. 単一責任の原則（SRP）

各クラスは一つの責任のみを持つ。

```javascript
// 良い例: 責任が明確に分離されている
class TheaterModeController {
  // シアターモード制御のみに責任を持つ
}

class SettingsManager {
  // 設定管理のみに責任を持つ
}

// 悪い例: 複数の責任を持つ
class TheaterModeManager {
  // シアターモード制御 + 設定管理 + UI制御
}
```

#### 2. 依存性注入（DI）

テスタビリティと疎結合を実現。

```javascript
// 推奨パターン
class TheaterModeController {
  constructor(dependencies) {
    this.logger = dependencies.logger;
    this.errorHandler = dependencies.errorHandler;
    this.stateStore = dependencies.stateStore;
  }
}

// 避けるべきパターン
class TheaterModeController {
  constructor() {
    this.logger = new Logger(); // 直接依存
  }
}
```

#### 3. Result 型パターン

例外処理の代わりに Result 型を使用。

```javascript
// 推奨パターン
async function processData(data) {
  const result = await errorHandler.wrapAsync(validateAndProcess(data));

  if (result.success) {
    return result.data;
  } else {
    logger.error("Processing failed", result.error);
    return null;
  }
}
```

#### 4. イミュータブルな状態管理

状態の直接変更を避け、新しい状態オブジェクトを作成。

```javascript
// 推奨パターン
const newState = {
  ...currentState,
  theaterMode: {
    ...currentState.theaterMode,
    isEnabled: !currentState.theaterMode.isEnabled,
  },
};

// 避けるべきパターン
currentState.theaterMode.isEnabled = !currentState.theaterMode.isEnabled;
```

### アーキテクチャパターン

#### レイヤードアーキテクチャ

各層は下位層のみに依存し、上位層への依存は禁止。

#### オブザーバーパターン

状態変更の通知にオブザーバーパターンを使用。

#### ファクトリーパターン

複雑なオブジェクト生成にファクトリーパターンを使用。

---

## 新機能の追加方法

### ステップバイステップガイド

#### 1. 要件定義と設計

新機能を追加する前に、以下を明確にする：

- **機能の目的**: なぜこの機能が必要か？
- **ユーザーストーリー**: どのようなユーザーがどのような場面で使用するか？
- **技術要件**: どのような技術的制約があるか？
- **影響範囲**: 既存機能への影響は？

#### 2. アーキテクチャへの統合

新機能を既存アーキテクチャに統合する方法を決定：

```javascript
// 例: 新しいキーボードショートカット機能の追加

// 1. Infrastructure Layer に新しいユーティリティを追加
class KeyboardShortcutManager {
  constructor(logger, errorHandler) {
    this.logger = logger;
    this.errorHandler = errorHandler;
    this.shortcuts = new Map();
  }

  registerShortcut(key, callback) {
    // ショートカット登録ロジック
  }
}

// 2. Business Layer で機能を管理
class ShortcutSettingsManager extends SettingsManager {
  getShortcutSchema() {
    return {
      shortcuts: {
        type: "object",
        properties: {
          toggle: { type: "string", default: "Ctrl+Shift+T" },
          opacity: { type: "string", default: "Ctrl+Shift+O" },
        },
      },
    };
  }
}

// 3. Presentation Layer で UI を提供
class ShortcutConfigUI {
  constructor(dependencies) {
    this.shortcutManager = dependencies.shortcutManager;
    this.settingsManager = dependencies.settingsManager;
  }

  renderShortcutConfig() {
    // UI レンダリングロジック
  }
}
```

#### 3. 実装手順

1. **テストファースト開発**

```javascript
// test/test-keyboard-shortcut-manager.js
describe("KeyboardShortcutManager", () => {
  it("should register shortcut successfully", () => {
    // テストケースを先に書く
  });
});
```

2. **インフラストラクチャ層の実装**

```javascript
// infrastructure/keyboard-shortcut-manager.js
class KeyboardShortcutManager {
  // 実装
}
```

3. **ビジネス層の実装**

```javascript
// infrastructure/shortcut-settings-manager.js
class ShortcutSettingsManager {
  // 実装
}
```

4. **プレゼンテーション層の実装**

```javascript
// UI コンポーネントの実装
```

5. **統合とテスト**

```javascript
// 統合テストの実行
// エンドツーエンドテストの実行
```

#### 4. 設定スキーマの更新

新機能に設定が必要な場合、スキーマを更新：

```javascript
// infrastructure/settings-manager.js
getSettingsSchema() {
  return {
    // 既存設定
    opacity: { type: 'number', min: 0, max: 0.9, default: 0.7 },

    // 新機能の設定
    keyboardShortcuts: {
      type: 'object',
      properties: {
        toggle: { type: 'string', default: 'Ctrl+Shift+T' },
        opacity: { type: 'string', default: 'Ctrl+Shift+O' }
      },
      default: {
        toggle: 'Ctrl+Shift+T',
        opacity: 'Ctrl+Shift+O'
      }
    }
  };
}
```

#### 5. 状態管理の更新

新機能の状態を StateStore に追加：

```javascript
// infrastructure/state-store.js
const initialState = {
  // 既存状態
  theaterMode: {
    /* ... */
  },

  // 新機能の状態
  keyboardShortcuts: {
    enabled: true,
    shortcuts: {
      toggle: "Ctrl+Shift+T",
      opacity: "Ctrl+Shift+O",
    },
  },
};

// 新しいアクションタイプを追加
const ActionType = {
  // 既存アクション
  THEATER_MODE_TOGGLE: "THEATER_MODE_TOGGLE",

  // 新機能のアクション
  SHORTCUT_UPDATE: "SHORTCUT_UPDATE",
  SHORTCUT_REGISTER: "SHORTCUT_REGISTER",
};
```

### 実装例: カスタムテーマ機能

以下は、カスタムテーマ機能を追加する完全な例です：

#### 1. 要件定義

- ユーザーがオーバーレイの色をカスタマイズできる
- プリセットテーマ（ダーク、ライト、カスタム）を提供
- 設定はユーザー間で同期される

#### 2. 実装

```javascript
// infrastructure/theme-manager.js
class ThemeManager {
  constructor(dependencies) {
    this.logger = dependencies.logger;
    this.errorHandler = dependencies.errorHandler;
    this.storageAdapter = dependencies.storageAdapter;

    this.presetThemes = {
      dark: { color: "#000000", opacity: 0.7 },
      light: { color: "#ffffff", opacity: 0.3 },
      blue: { color: "#0066cc", opacity: 0.5 },
    };
  }

  async loadTheme() {
    return this.errorHandler.wrapAsync(async () => {
      const result = await this.storageAdapter.get("theme");
      return result.success ? result.data : this.presetThemes.dark;
    });
  }

  async saveTheme(theme) {
    return this.errorHandler.wrapAsync(async () => {
      const validationResult = this.validateTheme(theme);
      if (!validationResult.success) {
        throw validationResult.error;
      }

      return await this.storageAdapter.set("theme", theme);
    });
  }

  validateTheme(theme) {
    // テーマの妥当性を検証
    if (!theme.color || !theme.opacity) {
      return Result.failure(
        new AppError(ErrorType.VALIDATION_ERROR, "Invalid theme format")
      );
    }

    return Result.success(theme);
  }

  applyTheme(theme, elements) {
    elements.forEach((element) => {
      element.style.setProperty("--theater-overlay-color", theme.color);
      element.style.setProperty("--theater-overlay-opacity", theme.opacity);
    });
  }
}
```

#### 3. UI 統合

```javascript
// popup.js に追加
function initializeThemeControls() {
  const themeSelect = document.getElementById("themeSelect");
  const customColorPicker = document.getElementById("customColor");

  themeSelect.addEventListener("change", handleThemeChange);
  customColorPicker.addEventListener("change", handleCustomColorChange);
}

async function handleThemeChange(event) {
  const selectedTheme = event.target.value;

  if (selectedTheme === "custom") {
    // カスタムテーマUI を表示
    showCustomThemeControls();
  } else {
    // プリセットテーマを適用
    const theme = themeManager.presetThemes[selectedTheme];
    await themeManager.saveTheme(theme);
    notifyContentScript("THEME_UPDATE", theme);
  }
}
```

#### 4. CSS 統合

```css
/* theater-mode.css に追加 */
.theater-mode-overlay {
  background-color: var(--theater-overlay-color, #000000);
  opacity: var(--theater-overlay-opacity, 0.7);
  transition: all 0.3s ease;
}

.theater-mode-overlay.custom-theme {
  background: linear-gradient(
    135deg,
    var(--theater-overlay-color, #000000),
    var(--theater-overlay-secondary-color, #333333)
  );
}
```

---

## カスタマイズガイド

### 設定のカスタマイズ

#### 新しい設定項目の追加

1. **スキーマの更新**

```javascript
// infrastructure/settings-manager.js
getSettingsSchema() {
  return {
    // 既存設定
    opacity: { type: 'number', min: 0, max: 0.9, default: 0.7 },

    // 新しい設定項目
    animationDuration: {
      type: 'number',
      min: 0,
      max: 2000,
      default: 300,
      description: 'アニメーション時間（ミリ秒）'
    },

    enableSoundEffects: {
      type: 'boolean',
      default: false,
      description: '効果音を有効にする'
    }
  };
}
```

2. **UI の更新**

```html
<!-- popup.html に追加 -->
<div class="setting-group">
  <label for="animationDuration">アニメーション時間</label>
  <input type="range" id="animationDuration" min="0" max="2000" step="50" />
  <span id="animationDurationValue">300ms</span>
</div>

<div class="setting-group">
  <label>
    <input type="checkbox" id="enableSoundEffects" />
    効果音を有効にする
  </label>
</div>
```

3. **JavaScript の更新**

```javascript
// popup.js に追加
function initializeCustomSettings() {
  const animationSlider = document.getElementById("animationDuration");
  const soundEffectsCheckbox = document.getElementById("enableSoundEffects");

  animationSlider.addEventListener("input", handleAnimationDurationChange);
  soundEffectsCheckbox.addEventListener("change", handleSoundEffectsChange);
}

async function handleAnimationDurationChange(event) {
  const duration = parseInt(event.target.value);
  await updateSetting("animationDuration", duration);

  // リアルタイムプレビュー
  document.documentElement.style.setProperty(
    "--theater-animation-duration",
    `${duration}ms`
  );
}
```

### UI のカスタマイズ

#### カスタムスタイルの適用

```css
/* popup.css のカスタマイズ */

/* カスタムテーマ変数 */
:root {
  --primary-color: #ff6b6b;
  --secondary-color: #4ecdc4;
  --background-color: #2c3e50;
  --text-color: #ecf0f1;
  --border-radius: 8px;
  --transition-duration: 0.3s;
}

/* カスタムボタンスタイル */
.custom-button {
  background: linear-gradient(
    135deg,
    var(--primary-color),
    var(--secondary-color)
  );
  border: none;
  border-radius: var(--border-radius);
  color: white;
  padding: 12px 24px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-duration) ease;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.custom-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
}

/* カスタムスライダー */
.custom-slider {
  -webkit-appearance: none;
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: linear-gradient(to right, #ddd 0%, var(--primary-color) 100%);
  outline: none;
}

.custom-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--primary-color);
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}
```

### 機能の拡張

#### カスタムオーバーレイエフェクトの追加

```javascript
// infrastructure/overlay-effects.js
class OverlayEffects {
  constructor() {
    this.effects = {
      fade: this.fadeEffect,
      slide: this.slideEffect,
      zoom: this.zoomEffect,
      blur: this.blurEffect,
    };
  }

  fadeEffect(element, options) {
    return new Promise((resolve) => {
      element.style.transition = `opacity ${options.duration}ms ease`;
      element.style.opacity = options.targetOpacity;

      setTimeout(resolve, options.duration);
    });
  }

  slideEffect(element, options) {
    return new Promise((resolve) => {
      element.style.transition = `transform ${options.duration}ms ease`;
      element.style.transform = `translateX(${options.distance}px)`;

      setTimeout(() => {
        element.style.transform = "translateX(0)";
        setTimeout(resolve, options.duration);
      }, 50);
    });
  }

  zoomEffect(element, options) {
    return new Promise((resolve) => {
      element.style.transition = `transform ${options.duration}ms ease`;
      element.style.transform = "scale(1.05)";

      setTimeout(() => {
        element.style.transform = "scale(1)";
        setTimeout(resolve, options.duration);
      }, options.duration / 2);
    });
  }

  blurEffect(element, options) {
    return new Promise((resolve) => {
      element.style.transition = `filter ${options.duration}ms ease`;
      element.style.filter = `blur(${options.blurAmount}px)`;

      setTimeout(() => {
        element.style.filter = "blur(0)";
        setTimeout(resolve, options.duration);
      }, options.duration / 2);
    });
  }

  async applyEffect(effectName, element, options = {}) {
    const effect = this.effects[effectName];
    if (!effect) {
      throw new Error(`Unknown effect: ${effectName}`);
    }

    const defaultOptions = {
      duration: 300,
      targetOpacity: 0.7,
      distance: 20,
      blurAmount: 2,
    };

    const mergedOptions = { ...defaultOptions, ...options };
    return await effect(element, mergedOptions);
  }
}
```

---

## テスト戦略

### テストピラミッド

```
        ┌─────────────────┐
        │   E2E Tests     │  ← 少数、高価値
        │   (統合テスト)    │
        └─────────────────┘
      ┌───────────────────────┐
      │   Integration Tests   │  ← 中程度
      │   (結合テスト)         │
      └───────────────────────┘
    ┌─────────────────────────────┐
    │      Unit Tests             │  ← 多数、高速
    │      (単体テスト)            │
    └─────────────────────────────┘
```

### 単体テストの書き方

#### テスト構造

```javascript
// test/test-theater-mode-controller.js
describe("TheaterModeController", () => {
  let controller;
  let mockDependencies;

  beforeEach(() => {
    // テスト前のセットアップ
    mockDependencies = createMockDependencies();
    controller = new TheaterModeController(mockDependencies);
  });

  afterEach(() => {
    // テスト後のクリーンアップ
    controller.cleanup();
  });

  describe("initialize", () => {
    it("should initialize successfully with valid dependencies", async () => {
      // Arrange (準備)
      mockDependencies.elementManager.detectVideoPlayer.mockResolvedValue(
        Result.success(document.createElement("div"))
      );

      // Act (実行)
      const result = await controller.initialize();

      // Assert (検証)
      expect(result.success).toBe(true);
      expect(mockDependencies.logger.info).toHaveBeenCalledWith(
        expect.stringContaining("initialized")
      );
    });

    it("should handle initialization failure gracefully", async () => {
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
      expect(mockDependencies.logger.error).toHaveBeenCalled();
    });
  });

  describe("toggle", () => {
    beforeEach(async () => {
      // コントローラーを初期化済み状態にする
      await setupInitializedController();
    });

    it("should toggle from disabled to enabled", async () => {
      // Arrange
      mockDependencies.stateStore.getState.mockReturnValue({
        theaterMode: { isEnabled: false, opacity: 0.7 },
      });

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

#### モックの作成

```javascript
// test/mocks/mock-dependencies.js
function createMockDependencies() {
  return {
    elementManager: {
      detectVideoPlayer: jest.fn(),
      detectOverlayTargets: jest.fn(),
      observeElement: jest.fn(() => jest.fn()), // cleanup function
    },

    overlayManager: {
      applyOverlay: jest.fn().mockResolvedValue(Result.success()),
      removeOverlay: jest.fn().mockResolvedValue(Result.success()),
    },

    stateStore: {
      dispatch: jest.fn().mockResolvedValue(Result.success()),
      subscribe: jest.fn(() => jest.fn()), // unsubscribe function
      getState: jest.fn().mockReturnValue({
        theaterMode: { isEnabled: false, opacity: 0.7 },
      }),
    },

    logger: {
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
    },

    errorHandler: {
      wrapAsync: jest.fn(async (fn) => {
        try {
          const result = await fn();
          return Result.success(result);
        } catch (error) {
          return Result.failure(error);
        }
      }),
      createError: jest.fn(
        (type, message, details) => new AppError(type, message, details)
      ),
    },
  };
}
```

### 統合テストの実装

```javascript
// test/integration/test-full-workflow.js
describe("Full Theater Mode Workflow", () => {
  let testHarness;

  beforeEach(async () => {
    testHarness = new IntegrationTestHarness();
    await testHarness.setup();
  });

  afterEach(async () => {
    await testHarness.cleanup();
  });

  it("should complete end-to-end theater mode workflow", async () => {
    // YouTube ページをシミュレート
    await testHarness.loadYouTubePage();

    // 拡張機能を初期化
    const extension = await testHarness.initializeExtension();

    // ポップアップを開く
    const popup = await testHarness.openPopup();

    // シアターモードを有効化
    await popup.clickToggleButton();

    // オーバーレイが適用されることを確認
    const overlays = await testHarness.getAppliedOverlays();
    expect(overlays.length).toBeGreaterThan(0);

    // 透明度を変更
    await popup.setOpacity(0.5);

    // 変更が反映されることを確認
    const currentOpacity = await testHarness.getCurrentOpacity();
    expect(currentOpacity).toBe(0.5);

    // シアターモードを無効化
    await popup.clickToggleButton();

    // オーバーレイが削除されることを確認
    const remainingOverlays = await testHarness.getAppliedOverlays();
    expect(remainingOverlays.length).toBe(0);
  });
});
```

### テスト実行

```bash
# 全テストの実行
npm test

# 単体テストのみ
npm run test:unit

# 統合テストのみ
npm run test:integration

# カバレッジレポート付き
npm run test:coverage

# 特定のテストファイル
npm test -- test-theater-mode-controller.js

# ウォッチモード
npm run test:watch
```

---

## デバッグとトラブルシューティング

### デバッグツールの使用

#### Chrome DevTools

1. **コンソールログの確認**

```javascript
// ログレベルを調整してデバッグ情報を表示
const logger = new Logger("Debug", {
  level: Logger.LogLevel.DEBUG,
  destination: ["console"],
});

// 詳細なデバッグ情報を出力
logger.debug("State change detected", {
  oldState: previousState,
  newState: currentState,
  action: lastAction,
});
```

2. **ブレークポイントの設定**

```javascript
// コード内でのブレークポイント
debugger;

// 条件付きブレークポイント
if (someCondition) {
  debugger;
}
```

3. **パフォーマンス監視**

```javascript
// パフォーマンス測定
console.time("theater-mode-toggle");
await controller.toggle();
console.timeEnd("theater-mode-toggle");

// メモリ使用量の監視
console.log("Memory usage:", performance.memory);
```

#### 拡張機能固有のデバッグ

1. **バックグラウンドサービスのデバッグ**

```bash
# Chrome で chrome://extensions/ を開く
# 拡張機能の「サービスワーカー」リンクをクリック
# DevTools が開き、バックグラウンドサービスをデバッグ可能
```

2. **コンテンツスクリプトのデバッグ**

```bash
# YouTube ページで F12 を押してDevToolsを開く
# Sources タブで content.js を見つける
# ブレークポイントを設定してデバッグ
```

3. **ポップアップのデバッグ**

```bash
# 拡張機能アイコンを右クリック
# 「ポップアップを検証」を選択
# DevTools でポップアップをデバッグ
```

### よくある問題と解決方法

#### 1. オーバーレイが適用されない

**症状**: シアターモードを有効にしてもオーバーレイが表示されない

**原因と解決方法**:

```javascript
// 原因1: 要素が見つからない
// 解決: セレクターの確認とフォールバック
async function debugElementDetection() {
  const selectors = ["#secondary", "#comments", "ytd-comments", "#masthead"];

  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    console.log(`Selector "${selector}": ${elements.length} elements found`);
    elements.forEach((el, index) => {
      console.log(`  Element ${index}:`, el);
    });
  }
}

// 原因2: CSS が適用されていない
// 解決: スタイルの確認
function debugStyles() {
  const overlayElements = document.querySelectorAll(".theater-mode-overlay");
  overlayElements.forEach((el) => {
    const styles = window.getComputedStyle(el);
    console.log("Element styles:", {
      opacity: styles.opacity,
      backgroundColor: styles.backgroundColor,
      display: styles.display,
      visibility: styles.visibility,
    });
  });
}
```

#### 2. 設定が保存されない

**症状**: 設定を変更しても次回起動時に元に戻る

**原因と解決方法**:

```javascript
// 原因: ストレージ権限の問題
// 解決: manifest.json の確認
{
  "permissions": [
    "storage",
    "activeTab"
  ]
}

// 原因: 非同期処理の問題
// 解決: 適切な await の使用
async function saveSettingsProperly() {
  try {
    const result = await storageAdapter.set('settings', newSettings);
    if (result.success) {
      logger.info('Settings saved successfully');
    } else {
      logger.error('Failed to save settings', result.error);
    }
  } catch (error) {
    logger.error('Settings save error', error);
  }
}
```

#### 3. メモリリーク

**症状**: 長時間使用後にブラウザが重くなる

**原因と解決方法**:

```javascript
// 原因: イベントリスナーの削除忘れ
// 解決: 適切なクリーンアップ
class ProperEventHandling {
  constructor() {
    this.eventListeners = [];
  }

  addEventListener(element, event, handler) {
    element.addEventListener(event, handler);
    this.eventListeners.push({ element, event, handler });
  }

  cleanup() {
    this.eventListeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.eventListeners = [];
  }
}

// 原因: オブザーバーの停止忘れ
// 解決: WeakMap の使用とクリーンアップ
class ProperObserverHandling {
  constructor() {
    this.observers = new WeakMap();
  }

  observeElement(element, callback) {
    const observer = new MutationObserver(callback);
    observer.observe(element, { childList: true, subtree: true });

    this.observers.set(element, observer);

    return () => {
      observer.disconnect();
      this.observers.delete(element);
    };
  }
}
```

#### 4. パフォーマンス問題

**症状**: ページの読み込みが遅くなる、動作がもたつく

**原因と解決方法**:

```javascript
// 原因: 頻繁なDOM操作
// 解決: バッチ処理とrequestAnimationFrame
class OptimizedDOMOperations {
  constructor() {
    this.pendingOperations = [];
    this.scheduled = false;
  }

  scheduleOperation(operation) {
    this.pendingOperations.push(operation);

    if (!this.scheduled) {
      this.scheduled = true;
      requestAnimationFrame(() => {
        this.flushOperations();
      });
    }
  }

  flushOperations() {
    this.pendingOperations.forEach((op) => op());
    this.pendingOperations = [];
    this.scheduled = false;
  }
}

// 原因: 重い計算処理
// 解決: Web Workers の使用
// worker.js
self.onmessage = function (e) {
  const { data, operation } = e.data;

  let result;
  switch (operation) {
    case "heavyCalculation":
      result = performHeavyCalculation(data);
      break;
    default:
      result = null;
  }

  self.postMessage({ result });
};

// main.js
const worker = new Worker("worker.js");
worker.postMessage({ data: largeDataSet, operation: "heavyCalculation" });
worker.onmessage = function (e) {
  const { result } = e.data;
  // 結果を使用
};
```

### ログ分析とモニタリング

#### 構造化ログの活用

```javascript
// 効果的なログ出力
logger.info("Theater mode toggled", {
  userId: "anonymous",
  tabId: tabId,
  previousState: oldState,
  newState: newState,
  duration: toggleDuration,
  timestamp: Date.now(),
});

// エラーログの詳細化
logger.error("Failed to apply overlay", error, {
  context: "theater-mode-toggle",
  elementCount: targetElements.length,
  selectors: usedSelectors,
  userAgent: navigator.userAgent,
  url: window.location.href,
});
```

#### パフォーマンス監視

```javascript
// パフォーマンス指標の収集
class PerformanceTracker {
  constructor(logger) {
    this.logger = logger;
    this.metrics = new Map();
  }

  startTimer(label) {
    const startTime = performance.now();
    this.metrics.set(label, { startTime });
    return label;
  }

  endTimer(label) {
    const metric = this.metrics.get(label);
    if (metric) {
      const duration = performance.now() - metric.startTime;
      this.logger.info("Performance metric", {
        operation: label,
        duration: duration,
        timestamp: Date.now(),
      });

      // 閾値を超えた場合は警告
      if (duration > 100) {
        this.logger.warn("Slow operation detected", {
          operation: label,
          duration: duration,
        });
      }

      this.metrics.delete(label);
    }
  }
}
```

---

このガイドは、YouTube Theater Mode 拡張機能の開発に必要な包括的な情報を提供します。実際の開発では、プロジェクトの要件と制約に応じてこれらのガイドラインを適用してください。

## パフォーマンス最適化

### メモリ使用量の最適化

#### 1. 効率的なデータ構造の使用

```javascript
// 推奨: WeakMap を使用してメモリリークを防ぐ
class ElementTracker {
  constructor() {
    this.elementData = new WeakMap(); // 要素が削除されると自動的にクリーンアップ
    this.observers = new WeakMap();
  }

  trackElement(element, data) {
    this.elementData.set(element, data);
  }

  getElementData(element) {
    return this.elementData.get(element);
  }
}

// 避ける: 通常のMapは手動クリーンアップが必要
class InefficientElementTracker {
  constructor() {
    this.elementData = new Map(); // メモリリークの原因となる可能性
  }
}
```

#### 2. オブジェクトプールパターン

```javascript
// 頻繁に作成・破棄されるオブジェクトのプール
class MessagePool {
  constructor(initialSize = 10) {
    this.pool = [];
    this.inUse = new Set();

    // 初期プールを作成
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.createMessage());
    }
  }

  createMessage() {
    return {
      id: null,
      type: null,
      payload: null,
      timestamp: null,
      reset() {
        this.id = null;
        this.type = null;
        this.payload = null;
        this.timestamp = null;
      },
    };
  }

  acquire() {
    let message = this.pool.pop();
    if (!message) {
      message = this.createMessage();
    }

    this.inUse.add(message);
    return message;
  }

  release(message) {
    if (this.inUse.has(message)) {
      message.reset();
      this.inUse.delete(message);
      this.pool.push(message);
    }
  }
}
```

#### 3. 遅延読み込みとキャッシュ戦略

```javascript
// 遅延読み込みによるメモリ効率化
class LazyResourceManager {
  constructor() {
    this.cache = new Map();
    this.loadingPromises = new Map();
  }

  async getResource(resourceId) {
    // キャッシュから取得を試行
    if (this.cache.has(resourceId)) {
      return this.cache.get(resourceId);
    }

    // 既に読み込み中の場合は同じPromiseを返す
    if (this.loadingPromises.has(resourceId)) {
      return this.loadingPromises.get(resourceId);
    }

    // 新しいリソースを読み込み
    const loadingPromise = this.loadResource(resourceId);
    this.loadingPromises.set(resourceId, loadingPromise);

    try {
      const resource = await loadingPromise;
      this.cache.set(resourceId, resource);
      return resource;
    } finally {
      this.loadingPromises.delete(resourceId);
    }
  }

  async loadResource(resourceId) {
    // 実際のリソース読み込み処理
    // 例: 設定ファイル、テンプレート、画像など
  }

  // LRU キャッシュの実装
  evictLeastRecentlyUsed(maxSize = 100) {
    if (this.cache.size <= maxSize) return;

    const entries = Array.from(this.cache.entries());
    const toEvict = entries.slice(0, entries.length - maxSize);

    toEvict.forEach(([key]) => {
      this.cache.delete(key);
    });
  }
}
```

### DOM 操作の最適化

#### 1. バッチ処理による最適化

```javascript
// DOM操作のバッチ処理
class DOMBatcher {
  constructor() {
    this.readOperations = [];
    this.writeOperations = [];
    this.scheduled = false;
  }

  read(operation) {
    this.readOperations.push(operation);
    this.schedule();
  }

  write(operation) {
    this.writeOperations.push(operation);
    this.schedule();
  }

  schedule() {
    if (this.scheduled) return;

    this.scheduled = true;
    requestAnimationFrame(() => {
      this.flush();
    });
  }

  flush() {
    // 読み取り操作を先に実行（レイアウトスラッシングを防ぐ）
    const readResults = this.readOperations.map((op) => op());

    // 書き込み操作を後に実行
    this.writeOperations.forEach((op, index) => {
      op(readResults[index]);
    });

    // リセット
    this.readOperations = [];
    this.writeOperations = [];
    this.scheduled = false;
  }
}

// 使用例
const batcher = new DOMBatcher();

// 複数の要素の寸法を取得してからスタイルを適用
elements.forEach((element) => {
  batcher.read(() => ({
    width: element.offsetWidth,
    height: element.offsetHeight,
  }));

  batcher.write((dimensions) => {
    element.style.transform = `scale(${dimensions.width / 100})`;
  });
});
```

#### 2. 仮想 DOM 的なアプローチ

```javascript
// 軽量な仮想DOM実装
class VirtualElement {
  constructor(tagName, attributes = {}, children = []) {
    this.tagName = tagName;
    this.attributes = attributes;
    this.children = children;
    this.element = null;
  }

  render() {
    if (this.element) {
      return this.element;
    }

    this.element = document.createElement(this.tagName);

    // 属性を設定
    Object.entries(this.attributes).forEach(([key, value]) => {
      if (key === "className") {
        this.element.className = value;
      } else if (key.startsWith("on")) {
        const eventName = key.slice(2).toLowerCase();
        this.element.addEventListener(eventName, value);
      } else {
        this.element.setAttribute(key, value);
      }
    });

    // 子要素を追加
    this.children.forEach((child) => {
      if (typeof child === "string") {
        this.element.appendChild(document.createTextNode(child));
      } else if (child instanceof VirtualElement) {
        this.element.appendChild(child.render());
      }
    });

    return this.element;
  }

  update(newVElement) {
    // 簡単な差分更新
    if (this.tagName !== newVElement.tagName) {
      // 要素タイプが変わった場合は置換
      const newElement = newVElement.render();
      this.element.parentNode.replaceChild(newElement, this.element);
      this.element = newElement;
      return;
    }

    // 属性の更新
    this.updateAttributes(newVElement.attributes);

    // 子要素の更新
    this.updateChildren(newVElement.children);

    this.attributes = newVElement.attributes;
    this.children = newVElement.children;
  }

  updateAttributes(newAttributes) {
    // 削除された属性を除去
    Object.keys(this.attributes).forEach((key) => {
      if (!(key in newAttributes)) {
        this.element.removeAttribute(key);
      }
    });

    // 新しい属性を追加・更新
    Object.entries(newAttributes).forEach(([key, value]) => {
      if (this.attributes[key] !== value) {
        this.element.setAttribute(key, value);
      }
    });
  }

  updateChildren(newChildren) {
    // 簡単な子要素更新（実際の実装ではより効率的なアルゴリズムを使用）
    while (this.element.firstChild) {
      this.element.removeChild(this.element.firstChild);
    }

    newChildren.forEach((child) => {
      if (typeof child === "string") {
        this.element.appendChild(document.createTextNode(child));
      } else if (child instanceof VirtualElement) {
        this.element.appendChild(child.render());
      }
    });
  }
}
```

### 非同期処理の最適化

#### 1. 並行処理の活用

```javascript
// 並行処理による高速化
class ParallelProcessor {
  constructor(maxConcurrency = 3) {
    this.maxConcurrency = maxConcurrency;
    this.queue = [];
    this.running = 0;
  }

  async process(tasks) {
    return new Promise((resolve, reject) => {
      const results = new Array(tasks.length);
      let completed = 0;
      let hasError = false;

      const processNext = async () => {
        if (hasError || this.queue.length === 0) return;

        this.running++;
        const { task, index } = this.queue.shift();

        try {
          results[index] = await task();
          completed++;

          if (completed === tasks.length) {
            resolve(results);
          } else {
            this.running--;
            processNext();
          }
        } catch (error) {
          hasError = true;
          reject(error);
        }
      };

      // タスクをキューに追加
      tasks.forEach((task, index) => {
        this.queue.push({ task, index });
      });

      // 並行処理を開始
      const concurrency = Math.min(this.maxConcurrency, tasks.length);
      for (let i = 0; i < concurrency; i++) {
        processNext();
      }
    });
  }
}

// 使用例
const processor = new ParallelProcessor(3);

const tasks = [
  () => fetchUserSettings(),
  () => detectVideoPlayer(),
  () => loadThemeData(),
  () => initializeStorage(),
];

const results = await processor.process(tasks);
```

#### 2. デバウンスとスロットリング

```javascript
// デバウンス: 連続した呼び出しを遅延
function debounce(func, delay) {
  let timeoutId;

  return function (...args) {
    clearTimeout(timeoutId);

    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

// スロットリング: 一定間隔での実行を保証
function throttle(func, interval) {
  let lastCallTime = 0;
  let timeoutId;

  return function (...args) {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTime;

    if (timeSinceLastCall >= interval) {
      lastCallTime = now;
      func.apply(this, args);
    } else {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        lastCallTime = Date.now();
        func.apply(this, args);
      }, interval - timeSinceLastCall);
    }
  };
}

// 使用例
const debouncedSave = debounce(saveSettings, 500);
const throttledUpdate = throttle(updateUI, 100);

// 設定変更時
opacitySlider.addEventListener("input", debouncedSave);

// スクロール時
window.addEventListener("scroll", throttledUpdate);
```

---

## セキュリティ考慮事項

### Content Security Policy (CSP) 対応

#### 1. インラインスクリプトの回避

```javascript
// 悪い例: インラインイベントハンドラー
// <button onclick="handleClick()">Click me</button>

// 良い例: イベントリスナーの使用
document.getElementById("myButton").addEventListener("click", handleClick);

// 悪い例: eval の使用
const code = 'console.log("Hello")';
eval(code); // CSP違反

// 良い例: 安全な代替手段
const allowedActions = {
  log: (message) => console.log(message),
  warn: (message) => console.warn(message),
};

function executeAction(actionName, ...args) {
  const action = allowedActions[actionName];
  if (action && typeof action === "function") {
    return action(...args);
  }
  throw new Error(`Action ${actionName} is not allowed`);
}
```

#### 2. 安全な DOM 操作

```javascript
// XSS攻撃を防ぐ安全なDOM操作
class SafeDOMManipulator {
  constructor() {
    this.allowedTags = new Set(["div", "span", "p", "strong", "em"]);
    this.allowedAttributes = new Set(["class", "id", "data-*"]);
  }

  sanitizeHTML(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    this.sanitizeNode(doc.body);
    return doc.body.innerHTML;
  }

  sanitizeNode(node) {
    const nodesToRemove = [];

    for (const child of node.childNodes) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        // 許可されていないタグを削除
        if (!this.allowedTags.has(child.tagName.toLowerCase())) {
          nodesToRemove.push(child);
          continue;
        }

        // 許可されていない属性を削除
        const attributesToRemove = [];
        for (const attr of child.attributes) {
          if (!this.isAllowedAttribute(attr.name)) {
            attributesToRemove.push(attr.name);
          }
        }

        attributesToRemove.forEach((attrName) => {
          child.removeAttribute(attrName);
        });

        // 子ノードを再帰的にサニタイズ
        this.sanitizeNode(child);
      }
    }

    // 不正なノードを削除
    nodesToRemove.forEach((node) => {
      node.parentNode.removeChild(node);
    });
  }

  isAllowedAttribute(attrName) {
    return this.allowedAttributes.has(attrName) || attrName.startsWith("data-");
  }

  createSafeElement(tagName, attributes = {}, textContent = "") {
    if (!this.allowedTags.has(tagName.toLowerCase())) {
      throw new Error(`Tag ${tagName} is not allowed`);
    }

    const element = document.createElement(tagName);

    Object.entries(attributes).forEach(([key, value]) => {
      if (this.isAllowedAttribute(key)) {
        element.setAttribute(key, String(value));
      }
    });

    if (textContent) {
      element.textContent = textContent; // innerHTML ではなく textContent を使用
    }

    return element;
  }
}
```

### データ検証とサニタイゼーション

#### 1. 入力データの検証

```javascript
// 包括的なデータ検証システム
class DataValidator {
  constructor() {
    this.validators = {
      string: this.validateString,
      number: this.validateNumber,
      boolean: this.validateBoolean,
      object: this.validateObject,
      array: this.validateArray,
      url: this.validateURL,
      color: this.validateColor,
    };
  }

  validate(data, schema) {
    try {
      return this.validateValue(data, schema);
    } catch (error) {
      return {
        success: false,
        error: error.message,
        path: error.path || [],
      };
    }
  }

  validateValue(value, schema, path = []) {
    // null/undefined チェック
    if (value == null) {
      if (schema.required) {
        throw new ValidationError(`Value is required`, path);
      }
      return { success: true, value: schema.default };
    }

    // 型チェック
    const validator = this.validators[schema.type];
    if (!validator) {
      throw new ValidationError(`Unknown type: ${schema.type}`, path);
    }

    const result = validator.call(this, value, schema, path);

    // カスタムバリデーター
    if (schema.validator && typeof schema.validator === "function") {
      const customResult = schema.validator(result.value);
      if (!customResult.success) {
        throw new ValidationError(customResult.error, path);
      }
    }

    return result;
  }

  validateString(value, schema, path) {
    if (typeof value !== "string") {
      throw new ValidationError("Expected string", path);
    }

    if (schema.minLength && value.length < schema.minLength) {
      throw new ValidationError(
        `String too short (min: ${schema.minLength})`,
        path
      );
    }

    if (schema.maxLength && value.length > schema.maxLength) {
      throw new ValidationError(
        `String too long (max: ${schema.maxLength})`,
        path
      );
    }

    if (schema.pattern && !schema.pattern.test(value)) {
      throw new ValidationError("String does not match pattern", path);
    }

    return { success: true, value };
  }

  validateNumber(value, schema, path) {
    const num = Number(value);
    if (isNaN(num)) {
      throw new ValidationError("Expected number", path);
    }

    if (schema.min !== undefined && num < schema.min) {
      throw new ValidationError(`Number too small (min: ${schema.min})`, path);
    }

    if (schema.max !== undefined && num > schema.max) {
      throw new ValidationError(`Number too large (max: ${schema.max})`, path);
    }

    if (schema.integer && !Number.isInteger(num)) {
      throw new ValidationError("Expected integer", path);
    }

    return { success: true, value: num };
  }

  validateURL(value, schema, path) {
    try {
      const url = new URL(value);

      // 許可されたプロトコルのチェック
      const allowedProtocols = schema.allowedProtocols || ["https:", "http:"];
      if (!allowedProtocols.includes(url.protocol)) {
        throw new ValidationError(`Protocol ${url.protocol} not allowed`, path);
      }

      // 許可されたホストのチェック
      if (schema.allowedHosts) {
        if (!schema.allowedHosts.includes(url.hostname)) {
          throw new ValidationError(`Host ${url.hostname} not allowed`, path);
        }
      }

      return { success: true, value: url.toString() };
    } catch (error) {
      throw new ValidationError("Invalid URL", path);
    }
  }

  validateColor(value, schema, path) {
    // HEX カラーの検証
    const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (hexPattern.test(value)) {
      return { success: true, value };
    }

    // RGB カラーの検証
    const rgbPattern = /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/;
    const rgbMatch = value.match(rgbPattern);
    if (rgbMatch) {
      const [, r, g, b] = rgbMatch;
      if ([r, g, b].every((c) => c >= 0 && c <= 255)) {
        return { success: true, value };
      }
    }

    throw new ValidationError("Invalid color format", path);
  }
}

class ValidationError extends Error {
  constructor(message, path) {
    super(message);
    this.name = "ValidationError";
    this.path = path;
  }
}
```

#### 2. 設定データの安全な処理

```javascript
// 設定データの安全な処理
class SecureSettingsManager extends SettingsManager {
  constructor(options) {
    super(options);
    this.validator = new DataValidator();
    this.encryptionKey = this.generateEncryptionKey();
  }

  getSecureSettingsSchema() {
    return {
      type: "object",
      properties: {
        opacity: {
          type: "number",
          min: 0,
          max: 0.9,
          default: 0.7,
        },
        keyboardShortcut: {
          type: "string",
          pattern: /^[a-zA-Z0-9+]+$/,
          maxLength: 20,
          default: "t",
        },
        theme: {
          type: "object",
          properties: {
            color: { type: "color" },
            opacity: { type: "number", min: 0, max: 1 },
          },
        },
        customCSS: {
          type: "string",
          maxLength: 10000,
          validator: (value) => this.validateCSS(value),
        },
      },
    };
  }

  validateCSS(css) {
    // 危険なCSS構文をチェック
    const dangerousPatterns = [
      /javascript:/i,
      /expression\s*\(/i,
      /behavior\s*:/i,
      /@import/i,
      /url\s*\(\s*["']?javascript:/i,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(css)) {
        return {
          success: false,
          error: "Potentially dangerous CSS detected",
        };
      }
    }

    return { success: true };
  }

  async saveSettings(settings) {
    // 設定を検証
    const validationResult = this.validator.validate(
      settings,
      this.getSecureSettingsSchema()
    );

    if (!validationResult.success) {
      throw new AppError(
        ErrorType.VALIDATION_ERROR,
        "Invalid settings data",
        validationResult
      );
    }

    // 機密データを暗号化
    const secureSettings = this.encryptSensitiveData(validationResult.value);

    return super.saveSettings(secureSettings);
  }

  async loadSettings() {
    const result = await super.loadSettings();

    if (result.success) {
      // 暗号化されたデータを復号
      result.data = this.decryptSensitiveData(result.data);
    }

    return result;
  }

  encryptSensitiveData(settings) {
    // 実際の実装では適切な暗号化ライブラリを使用
    // ここでは簡単な例として base64 エンコーディングを使用
    const sensitiveFields = ["customCSS", "apiKeys"];

    const encrypted = { ...settings };

    sensitiveFields.forEach((field) => {
      if (encrypted[field]) {
        encrypted[field] = btoa(encrypted[field]);
      }
    });

    return encrypted;
  }

  decryptSensitiveData(settings) {
    const sensitiveFields = ["customCSS", "apiKeys"];

    const decrypted = { ...settings };

    sensitiveFields.forEach((field) => {
      if (decrypted[field]) {
        try {
          decrypted[field] = atob(decrypted[field]);
        } catch (error) {
          // 復号に失敗した場合はデフォルト値を使用
          delete decrypted[field];
        }
      }
    });

    return decrypted;
  }

  generateEncryptionKey() {
    // 実際の実装では適切なキー生成を行う
    return crypto.getRandomValues(new Uint8Array(32));
  }
}
```

### 権限の最小化

#### 1. Manifest の権限設定

```json
{
  "manifest_version": 3,
  "name": "YouTube Theater Mode",
  "version": "1.0.0",

  "permissions": [
    "storage", // 設定保存のみ
    "activeTab" // アクティブタブのみ
  ],

  "host_permissions": [
    "https://www.youtube.com/*", // YouTube のみ
    "https://youtube.com/*"
  ],

  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  },

  "web_accessible_resources": [
    {
      "resources": ["theater-mode.css"],
      "matches": ["https://www.youtube.com/*"]
    }
  ]
}
```

#### 2. 動的権限要求

```javascript
// 必要な時のみ権限を要求
class PermissionManager {
  constructor(logger) {
    this.logger = logger;
    this.grantedPermissions = new Set();
  }

  async requestPermission(permission) {
    if (this.grantedPermissions.has(permission)) {
      return true;
    }

    try {
      const granted = await chrome.permissions.request({
        permissions: [permission],
      });

      if (granted) {
        this.grantedPermissions.add(permission);
        this.logger.info(`Permission granted: ${permission}`);
      } else {
        this.logger.warn(`Permission denied: ${permission}`);
      }

      return granted;
    } catch (error) {
      this.logger.error(`Permission request failed: ${permission}`, error);
      return false;
    }
  }

  async checkPermission(permission) {
    return new Promise((resolve) => {
      chrome.permissions.contains(
        {
          permissions: [permission],
        },
        resolve
      );
    });
  }

  async revokePermission(permission) {
    try {
      const revoked = await chrome.permissions.remove({
        permissions: [permission],
      });

      if (revoked) {
        this.grantedPermissions.delete(permission);
        this.logger.info(`Permission revoked: ${permission}`);
      }

      return revoked;
    } catch (error) {
      this.logger.error(`Permission revocation failed: ${permission}`, error);
      return false;
    }
  }
}
```

---

## デプロイメントガイド

### ビルドプロセス

#### 1. 自動化されたビルドスクリプト

```javascript
// build.js
const fs = require("fs").promises;
const path = require("path");
const { execSync } = require("child_process");

class ExtensionBuilder {
  constructor() {
    this.sourceDir = "./src";
    this.buildDir = "./dist";
    this.manifestPath = "./manifest.json";
  }

  async build() {
    console.log("Building extension...");

    try {
      // ビルドディレクトリをクリーンアップ
      await this.cleanBuildDir();

      // ソースファイルをコピー
      await this.copySourceFiles();

      // マニフェストを処理
      await this.processManifest();

      // CSS を最適化
      await this.optimizeCSS();

      // JavaScript を最適化
      await this.optimizeJavaScript();

      // アイコンを最適化
      await this.optimizeIcons();

      // パッケージを作成
      await this.createPackage();

      console.log("Build completed successfully!");
    } catch (error) {
      console.error("Build failed:", error);
      process.exit(1);
    }
  }

  async cleanBuildDir() {
    try {
      await fs.rmdir(this.buildDir, { recursive: true });
    } catch (error) {
      // ディレクトリが存在しない場合は無視
    }

    await fs.mkdir(this.buildDir, { recursive: true });
  }

  async copySourceFiles() {
    const filesToCopy = [
      "background.js",
      "content.js",
      "popup.html",
      "popup.js",
      "popup.css",
      "theater-mode.css",
    ];

    for (const file of filesToCopy) {
      const sourcePath = path.join(this.sourceDir, file);
      const destPath = path.join(this.buildDir, file);

      try {
        await fs.copyFile(sourcePath, destPath);
        console.log(`Copied: ${file}`);
      } catch (error) {
        console.warn(`Warning: Could not copy ${file}:`, error.message);
      }
    }

    // infrastructure ディレクトリをコピー
    await this.copyDirectory("infrastructure");
  }

  async copyDirectory(dirName) {
    const sourceDir = path.join(this.sourceDir, dirName);
    const destDir = path.join(this.buildDir, dirName);

    await fs.mkdir(destDir, { recursive: true });

    const files = await fs.readdir(sourceDir);

    for (const file of files) {
      const sourcePath = path.join(sourceDir, file);
      const destPath = path.join(destDir, file);

      const stat = await fs.stat(sourcePath);

      if (stat.isDirectory()) {
        await this.copyDirectory(path.join(dirName, file));
      } else {
        await fs.copyFile(sourcePath, destPath);
      }
    }
  }

  async processManifest() {
    const manifestContent = await fs.readFile(this.manifestPath, "utf8");
    const manifest = JSON.parse(manifestContent);

    // 開発用の設定を削除
    delete manifest.key;
    delete manifest.oauth2;

    // バージョンを更新（package.json から取得）
    const packageJson = JSON.parse(await fs.readFile("./package.json", "utf8"));
    manifest.version = packageJson.version;

    const destPath = path.join(this.buildDir, "manifest.json");
    await fs.writeFile(destPath, JSON.stringify(manifest, null, 2));

    console.log("Processed manifest.json");
  }

  async optimizeCSS() {
    const cssFiles = ["popup.css", "theater-mode.css"];

    for (const file of cssFiles) {
      const filePath = path.join(this.buildDir, file);

      try {
        let content = await fs.readFile(filePath, "utf8");

        // コメントを削除
        content = content.replace(/\/\*[\s\S]*?\*\//g, "");

        // 余分な空白を削除
        content = content.replace(/\s+/g, " ").trim();

        await fs.writeFile(filePath, content);
        console.log(`Optimized: ${file}`);
      } catch (error) {
        console.warn(`Warning: Could not optimize ${file}:`, error.message);
      }
    }
  }

  async optimizeJavaScript() {
    // 実際の実装では Terser や UglifyJS を使用
    console.log("JavaScript optimization skipped (add minification here)");
  }

  async optimizeIcons() {
    const iconDir = path.join(this.buildDir, "icons");

    try {
      await fs.mkdir(iconDir, { recursive: true });

      const iconFiles = ["icon16.png", "icon48.png", "icon128.png"];

      for (const file of iconFiles) {
        const sourcePath = path.join("./icons", file);
        const destPath = path.join(iconDir, file);

        await fs.copyFile(sourcePath, destPath);
      }

      console.log("Copied icon files");
    } catch (error) {
      console.warn("Warning: Could not copy icons:", error.message);
    }
  }

  async createPackage() {
    const packageName = `youtube-theater-mode-${Date.now()}.zip`;
    const packagePath = path.join("./packages", packageName);

    await fs.mkdir("./packages", { recursive: true });

    // ZIP パッケージを作成
    execSync(`cd ${this.buildDir} && zip -r ../${packagePath} ./*`);

    console.log(`Package created: ${packagePath}`);
  }
}

// ビルド実行
if (require.main === module) {
  const builder = new ExtensionBuilder();
  builder.build();
}

module.exports = ExtensionBuilder;
```

#### 2. 継続的インテグレーション

```yaml
# .github/workflows/build-and-test.yml
name: Build and Test

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Run linting
        run: npm run lint

      - name: Run tests
        run: npm test

      - name: Run build
        run: npm run build

      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: extension-build
          path: dist/

  release:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Build extension
        run: npm run build

      - name: Create release package
        run: npm run package

      - name: Upload to Chrome Web Store
        if: startsWith(github.ref, 'refs/tags/')
        run: npm run deploy:chrome
        env:
          CHROME_EXTENSION_ID: ${{ secrets.CHROME_EXTENSION_ID }}
          CHROME_CLIENT_ID: ${{ secrets.CHROME_CLIENT_ID }}
          CHROME_CLIENT_SECRET: ${{ secrets.CHROME_CLIENT_SECRET }}
          CHROME_REFRESH_TOKEN: ${{ secrets.CHROME_REFRESH_TOKEN }}
```

### リリース管理

#### 1. バージョン管理戦略

```javascript
// version-manager.js
class VersionManager {
  constructor() {
    this.packageJsonPath = "./package.json";
    this.manifestPath = "./manifest.json";
  }

  async getCurrentVersion() {
    const packageJson = JSON.parse(
      await fs.readFile(this.packageJsonPath, "utf8")
    );
    return packageJson.version;
  }

  async updateVersion(newVersion) {
    // package.json を更新
    const packageJson = JSON.parse(
      await fs.readFile(this.packageJsonPath, "utf8")
    );
    packageJson.version = newVersion;
    await fs.writeFile(
      this.packageJsonPath,
      JSON.stringify(packageJson, null, 2)
    );

    // manifest.json を更新
    const manifest = JSON.parse(await fs.readFile(this.manifestPath, "utf8"));
    manifest.version = newVersion;
    await fs.writeFile(this.manifestPath, JSON.stringify(manifest, null, 2));

    console.log(`Version updated to ${newVersion}`);
  }

  async bumpVersion(type = "patch") {
    const currentVersion = await this.getCurrentVersion();
    const [major, minor, patch] = currentVersion.split(".").map(Number);

    let newVersion;
    switch (type) {
      case "major":
        newVersion = `${major + 1}.0.0`;
        break;
      case "minor":
        newVersion = `${major}.${minor + 1}.0`;
        break;
      case "patch":
      default:
        newVersion = `${major}.${minor}.${patch + 1}`;
        break;
    }

    await this.updateVersion(newVersion);
    return newVersion;
  }

  async createChangelog(version) {
    const changelogPath = "./CHANGELOG.md";
    const date = new Date().toISOString().split("T")[0];

    const changelogEntry = `
## [${version}] - ${date}

### Added
- 

### Changed
- 

### Fixed
- 

### Removed
- 

`;

    try {
      const existingChangelog = await fs.readFile(changelogPath, "utf8");
      const updatedChangelog = changelogEntry + existingChangelog;
      await fs.writeFile(changelogPath, updatedChangelog);
    } catch (error) {
      // ファイルが存在しない場合は新規作成
      await fs.writeFile(changelogPath, `# Changelog\n${changelogEntry}`);
    }

    console.log(`Changelog entry created for version ${version}`);
  }
}
```

#### 2. 自動デプロイメント

```javascript
// deploy.js
class ChromeWebStoreDeployer {
  constructor(options) {
    this.clientId = options.clientId;
    this.clientSecret = options.clientSecret;
    this.refreshToken = options.refreshToken;
    this.extensionId = options.extensionId;
  }

  async deploy(packagePath) {
    try {
      // アクセストークンを取得
      const accessToken = await this.getAccessToken();

      // 拡張機能をアップロード
      await this.uploadExtension(accessToken, packagePath);

      // 公開
      await this.publishExtension(accessToken);

      console.log("Extension deployed successfully!");
    } catch (error) {
      console.error("Deployment failed:", error);
      throw error;
    }
  }

  async getAccessToken() {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: this.refreshToken,
        grant_type: "refresh_token",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Failed to get access token: ${data.error}`);
    }

    return data.access_token;
  }

  async uploadExtension(accessToken, packagePath) {
    const packageData = await fs.readFile(packagePath);

    const response = await fetch(
      `https://www.googleapis.com/upload/chromewebstore/v1.1/items/${this.extensionId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "x-goog-api-version": "2",
        },
        body: packageData,
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        `Upload failed: ${result.error?.message || "Unknown error"}`
      );
    }

    console.log("Extension uploaded successfully");
    return result;
  }

  async publishExtension(accessToken) {
    const response = await fetch(
      `https://www.googleapis.com/chromewebstore/v1.1/items/${this.extensionId}/publish`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "x-goog-api-version": "2",
        },
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        `Publish failed: ${result.error?.message || "Unknown error"}`
      );
    }

    console.log("Extension published successfully");
    return result;
  }
}
```

---

このガイドは、YouTube Theater Mode 拡張機能の開発に必要な包括的な情報を提供します。実際の開発では、プロジェクトの要件と制約に応じてこれらのガイドラインを適用し、継続的な改善を行ってください。

開発中に問題が発生した場合は、このガイドのトラブルシューティングセクションを参照し、必要に応じてコミュニティやドキュメントで追加情報を確認してください。
