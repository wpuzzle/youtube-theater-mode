# 設計書

## 概要

YouTube シアターモード Chrome 拡張機能は、Content Script ベースのアーキテクチャを採用し、YouTube ページに直接介入して UI 要素を制御します。軽量で高性能な実装を目指し、ユーザー体験を最優先に設計されています。

## アーキテクチャ

### システム構成

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Popup UI      │    │  Background      │    │  Content Script │
│   (設定画面)     │◄──►│  Service Worker  │◄──►│  (YouTube制御)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │  Chrome Storage  │
                       │  (設定保存)       │
                       └──────────────────┘
```

### 技術スタック

- **Manifest V3**: 最新の Chrome 拡張機能仕様
- **Vanilla JavaScript**: 軽量性とパフォーマンスを重視
- **CSS Injection**: 動的スタイル適用
- **Chrome Storage API**: 設定の永続化

## コンポーネントと インターフェース

### 1. Manifest (manifest.json)

```json
{
  "manifest_version": 3,
  "name": "YouTube Theater Mode",
  "version": "1.0.0",
  "permissions": ["storage", "activeTab"],
  "host_permissions": ["*://*.youtube.com/*"],
  "content_scripts": [
    {
      "matches": ["*://*.youtube.com/watch*"],
      "js": ["content.js"],
      "css": ["theater-mode.css"]
    }
  ],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "popup.html"
  }
}
```

### 2. Content Script (content.js)

**主要機能:**

- YouTube ページの要素検出と制御
- シアターモードの有効/無効切り替え
- キーボードショートカットの処理
- 動画プレーヤーの保護

**インターフェース:**

```javascript
class TheaterModeController {
  constructor()
  toggleTheaterMode()
  enableTheaterMode()
  disableTheaterMode()
  updateOpacity(value)
  setupKeyboardShortcuts()
  detectVideoPlayer()
  applyOverlay()
  removeOverlay()
}
```

### 3. Background Service Worker (background.js)

**主要機能:**

- 拡張機能の初期化
- Content Script との通信管理
- 設定データの管理

**インターフェース:**

```javascript
class BackgroundService {
  constructor()
  handleMessage(message, sender, sendResponse)
  saveSettings(settings)
  loadSettings()
  initializeExtension()
}
```

### 4. Popup UI (popup.html/popup.js)

**主要機能:**

- 透明度設定のスライダー
- シアターモード状態の表示
- 設定の即座反映

## データモデル

### 設定データ構造

```javascript
const Settings = {
  opacity: number, // 0-90 (パーセント)
  isEnabled: boolean, // 現在の状態
  shortcutKey: string, // キーボードショートカット
  lastUsed: timestamp, // 最終使用時刻
};
```

### YouTube 要素セレクター

```javascript
const YouTubeSelectors = {
  videoPlayer: "#movie_player, .html5-video-player",
  sidebar: "#secondary, #related",
  comments: "#comments, ytd-comments",
  header: "#masthead, .ytd-masthead",
  description: "#meta-contents, #description",
  suggestions: ".ytp-suggestion-set",
  overlayElements: [
    "#secondary",
    "#comments",
    "#masthead",
    "#meta-contents",
    ".ytd-watch-metadata",
  ],
};
```

## エラーハンドリング

### 1. YouTube レイアウト変更への対応

```javascript
const ElementDetector = {
  // 複数のセレクターパターンでフォールバック
  findVideoPlayer() {
    const selectors = [
      "#movie_player",
      ".html5-video-player",
      '[data-testid="video-player"]',
    ];
    return this.findElementWithFallback(selectors);
  },

  // 要素が見つからない場合の再試行ロジック
  retryElementDetection(callback, maxRetries = 5) {
    // 実装詳細
  },
};
```

### 2. 設定読み込みエラー

```javascript
const SettingsManager = {
  async loadSettings() {
    try {
      const settings = await chrome.storage.sync.get(defaultSettings);
      return this.validateSettings(settings);
    } catch (error) {
      console.warn("設定読み込みエラー、デフォルト値を使用:", error);
      return defaultSettings;
    }
  },
};
```

### 3. Content Script 注入失敗

```javascript
// Background Service Worker
const ContentScriptManager = {
  async ensureContentScriptLoaded(tabId) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ["content.js"],
      });
    } catch (error) {
      console.error("Content Script注入失敗:", error);
      // ユーザーに通知またはフォールバック処理
    }
  },
};
```

## テスト戦略

### 1. 単体テスト

- **Content Script 機能**: シアターモード切り替え、要素検出
- **設定管理**: 保存/読み込み、バリデーション
- **UI コンポーネント**: ポップアップの動作

### 2. 統合テスト

- **YouTube 互換性**: 異なる動画ページでの動作確認
- **ブラウザ互換性**: Chrome 各バージョンでの動作確認
- **パフォーマンス**: メモリ使用量、CPU 負荷の測定

### 3. ユーザビリティテスト

- **操作性**: ボタンクリック、キーボードショートカット
- **視覚効果**: オーバーレイの見た目、透明度調整
- **アクセシビリティ**: スクリーンリーダー対応

### 4. エッジケーステスト

- **YouTube UI 変更**: レイアウト変更への対応
- **ネットワーク遅延**: 動画読み込み中の動作
- **複数タブ**: 同時に複数の YouTube タブを開いた場合

## セキュリティ考慮事項

### 1. 最小権限の原則

- 必要最小限の permissions のみ要求
- YouTube ドメインのみに host_permissions を限定

### 2. Content Security Policy

```javascript
// manifest.json
"content_security_policy": {
  "extension_pages": "script-src 'self'; object-src 'self'"
}
```

### 3. データ保護

- ユーザーの視聴履歴や個人情報は収集しない
- 設定データのみローカルストレージに保存

## パフォーマンス最適化

### 1. 遅延読み込み

```javascript
// 動画プレーヤーが読み込まれてから機能を初期化
const initializeWhenReady = () => {
  if (document.querySelector("#movie_player")) {
    initializeTheaterMode();
  } else {
    setTimeout(initializeWhenReady, 100);
  }
};
```

### 2. イベントリスナーの最適化

```javascript
// デバウンス処理でパフォーマンス向上
const debouncedToggle = debounce(toggleTheaterMode, 100);
document.addEventListener("keydown", debouncedToggle);
```

### 3. CSS 最適化

```css
/* ハードウェアアクセラレーション活用 */
.theater-overlay {
  transform: translateZ(0);
  will-change: opacity;
  transition: opacity 0.3s ease;
}
```
