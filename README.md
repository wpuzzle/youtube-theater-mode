# YouTube Theater Mode

YouTube 視聴時に動画以外の画面要素を薄暗くして、動画コンテンツに集中できる環境を提供する Chrome 拡張機能です。

[English](#english) | [日本語](#japanese)

## Japanese

## 🎯 主要機能

- **シアターモード**: 非動画要素（サイドバー、コメント、関連動画）に半透明の暗いオーバーレイを適用
- **動画プレーヤー保護**: 動画プレーヤーとそのコントロールの完全な視認性を維持
- **簡単切り替え**: ポップアップボタンまたはキーボードショートカットでシアターモードを切り替え
- **透明度調整**: オーバーレイの透明度を 0-90%の範囲で調整可能
- **設定永続化**: セッション間での設定の自動保存
- **アクセシビリティ対応**: スクリーンリーダー対応とキーボードナビゲーション

## 🚀 インストール方法

### Chrome Web Store からインストール（推奨）

[Chrome ウェブストア](https://chromewebstore.google.com/detail/youtube-theater-mode/bgmiamnfbabhimeoamhliglpdfiikkck)

### 手動インストール（開発者向け）

1. このリポジトリをクローンまたはダウンロード

```bash
git clone https://github.com/wpuzzle/youtube-theater-mode.git
```

2. Chrome で `chrome://extensions/` を開く

3. 右上の「デベロッパーモード」を有効にする

4. 「パッケージ化されていない拡張機能を読み込む」をクリック

5. ダウンロードした拡張機能のフォルダを選択

## 📖 使用方法

### 基本操作

1. **拡張機能アイコンをクリック**: ブラウザツールバーの拡張機能アイコンをクリックしてポップアップを開く

2. **シアターモード切り替え**: ポップアップの「シアターモード」ボタンをクリック

3. **キーボードショートカット**: `Ctrl+Shift+T` でシアターモードを切り替え

4. **透明度調整**: ポップアップのスライダーでオーバーレイの透明度を調整

### 対応ページ

- YouTube 動画ページ（`youtube.com/watch`）
- YouTube Shorts（`youtube.com/shorts`）
- YouTube Live 配信
- YouTube Premium 動画

## ⚙️ 設定

### 透明度設定

- **範囲**: 0% - 90%
- **デフォルト**: 70%
- **調整**: ポップアップのスライダーで調整

### キーボードショートカット

- **デフォルト**: `Ctrl+Shift+T`
- **機能**: シアターモードの有効/無効切り替え

## 🛠️ 技術仕様

### 技術スタック

- **フレームワーク**: Chrome Extension Manifest V3
- **言語**: JavaScript (ES6+), HTML5, CSS3
- **ストレージ**: Chrome Storage API (sync)
- **依存関係**: なし（Pure Vanilla JavaScript）

### ファイル構成

```
/
├── manifest.json                    # 拡張機能マニフェスト
├── background.js                    # バックグラウンドサービスワーカー
├── content.js                       # メインコンテンツスクリプト
├── popup.html                       # ポップアップUI
├── popup.js                         # ポップアップ機能
├── popup.css                        # ポップアップスタイル
├── theater-mode.css                 # シアターモードスタイル
├── background-service.js            # バックグラウンドサービス
├── tab-state-manager.js             # タブ状態管理
├── popup-content-communication.js   # 通信管理
├── performance-utils.js             # パフォーマンス最適化
├── accessibility-improvements.js    # アクセシビリティ機能
├── youtube-shortcut-protection.js   # ショートカット保護
├── _locales/                        # 多言語対応
│   ├── en/messages.json            # 英語翻訳
│   └── ja/messages.json            # 日本語翻訳
└── icons/                          # アイコンファイル
```

### 主要クラス

#### TheaterModeController

シアターモードの中核機能を管理

- オーバーレイの適用/削除
- 透明度調整
- 状態管理

#### ElementDetector

YouTube 要素の検出とフォールバック機能

- 動画プレーヤー検出
- オーバーレイ対象要素の特定
- 保護対象要素の除外

#### SettingsManager

ユーザー設定の管理

- Chrome Storage API 連携
- LocalStorage フォールバック
- 設定バリデーション

## 🧪 テスト

### テストファイル構成

```
test-*.js           # 各機能のテストファイル
test-*.html         # HTMLテストハーネス
run-*-tests.js      # テストランナー
```

### テスト実行方法

1. **個別テスト実行**:

```bash
# ブラウザで対応するHTMLファイルを開く
open test-button-placement.html
```

2. **全テスト実行**:

```bash
# 各run-*-tests.jsファイルを実行
node run-element-tests.js
node run-layout-tests.js
node run-opacity-tests.js
```

### テストカテゴリ

- **要素検出テスト**: YouTube 要素の正確な検出
- **レイアウトテスト**: 様々な画面サイズでの動作
- **透明度テスト**: オーバーレイ透明度の調整
- **統合テスト**: コンポーネント間の連携
- **アクセシビリティテスト**: スクリーンリーダー対応
- **パフォーマンステスト**: 動作速度とメモリ使用量

## 🔧 開発

### 開発環境セットアップ

1. **リポジトリクローン**:

```bash
git clone https://github.com/wpuzzle/youtube-theater-mode.git
cd youtube-theater-mode
```

2. **拡張機能読み込み**:

   - Chrome: `chrome://extensions/` → デベロッパーモード → パッケージ化されていない拡張機能を読み込む

3. **開発サーバー起動** (オプション):

```bash
# 簡易HTTPサーバーでテストファイルを提供
python -m http.server 8000
```

### デバッグ方法

1. **コンソールログ**:

   - F12 → Console → "YouTube Theater Mode:" でフィルタ

2. **バックグラウンドログ**:

   - `chrome://extensions/` → 拡張機能の「バックグラウンドページ」をクリック

3. **ストレージ確認**:
   - F12 → Application → Storage → Chrome Extension

### コーディング規約

- **JavaScript**: ES6+機能を優先、JSDoc コメント必須
- **CSS**: BEM 風命名規則、レスポンシブデザイン
- **HTML**: セマンティック HTML5、アクセシビリティ属性

## 🌐 多言語対応

拡張機能は複数の言語をサポートしています：

- **日本語** (ja) - デフォルト
- **英語** (en)

ブラウザの言語設定から自動的に言語が検出されます。新しい言語を追加するには：

1. `_locales/[言語コード]/messages.json` を作成
2. すべてのメッセージキーの翻訳を追加
3. ブラウザの言語設定でテスト

## 🤝 コントリビューション

### バグレポート

[Issues](https://github.com/wpuzzle/youtube-theater-mode/issues)でバグを報告してください。

### 機能リクエスト

新機能のアイデアは[Discussions](https://github.com/wpuzzle/youtube-theater-mode/discussions)で議論しましょう。

### プルリクエスト

1. フォークしてブランチを作成
2. 変更を実装
3. テストを追加/更新
4. プルリクエストを作成

## 📄 ライセンス

MIT License - 詳細は[LICENSE](LICENSE)ファイルを参照

## 🔗 関連リンク

- [Chrome ウェブストア](https://chromewebstore.google.com/detail/youtube-theater-mode/bgmiamnfbabhimeoamhliglpdfiikkck) (準備中)
- [開発者ドキュメント](docs/)

## 📞 サポート

- **バグレポート**: [GitHub Issues](https://github.com/wpuzzle/youtube-theater-mode/issues)
- **質問・議論**: [GitHub Discussions](https://github.com/wpuzzle/youtube-theater-mode/discussions)

---

**YouTube Theater Mode** - より集中できる YouTube 視聴体験を提供します 🎬

---

## English

A Chrome extension that dims non-video elements on YouTube to create a focused viewing environment while maintaining full functionality of the video player.

## 🎯 Key Features

- **Theater Mode**: Apply a semi-transparent dark overlay to non-video elements (sidebar, comments, related videos)
- **Video Player Protection**: Maintain complete visibility of the video player and its controls
- **Easy Toggle**: Switch theater mode on/off with popup button or keyboard shortcut
- **Opacity Adjustment**: Adjust overlay opacity from 0-90%
- **Settings Persistence**: Automatically save settings between sessions
- **Accessibility Support**: Screen reader compatible with keyboard navigation

## 🚀 Installation

### From Chrome Web Store (Recommended)

[Chrome Web Store](https://chromewebstore.google.com/detail/youtube-theater-mode/bgmiamnfbabhimeoamhliglpdfiikkck)

### Manual Installation (For Developers)

1. Clone or download this repository

```bash
git clone https://github.com/wpuzzle/youtube-theater-mode.git
```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable "Developer mode" in the top right

4. Click "Load unpacked"

5. Select the downloaded extension folder

## 📖 Usage

### Basic Operations

1. **Click Extension Icon**: Click the extension icon in the browser toolbar to open the popup

2. **Toggle Theater Mode**: Click the "Theater Mode" button in the popup

3. **Keyboard Shortcut**: Use `Ctrl+Shift+T` to toggle theater mode

4. **Adjust Opacity**: Use the slider in the popup to adjust overlay opacity

### Supported Pages

- YouTube video pages (`youtube.com/watch`)
- YouTube Shorts (`youtube.com/shorts`)
- YouTube Live streams
- YouTube Premium videos

## ⚙️ Settings

### Opacity Settings

- **Range**: 0% - 90%
- **Default**: 70%
- **Adjustment**: Use the slider in the popup

### Keyboard Shortcuts

- **Default**: `Ctrl+Shift+T`
- **Function**: Toggle theater mode on/off

## 🛠️ Technical Specifications

### Technology Stack

- **Framework**: Chrome Extension Manifest V3
- **Languages**: JavaScript (ES6+), HTML5, CSS3
- **Storage**: Chrome Storage API (sync)
- **Dependencies**: None (Pure Vanilla JavaScript)

### File Structure

```
/
├── manifest.json                    # Extension manifest
├── background.js                    # Background service worker
├── content.js                       # Main content script
├── popup.html                       # Popup UI
├── popup.js                         # Popup functionality
├── popup.css                        # Popup styles
├── theater-mode.css                 # Theater mode styles
├── background-service.js            # Background service
├── tab-state-manager.js             # Tab state management
├── popup-content-communication.js   # Communication management
├── performance-utils.js             # Performance optimization
├── accessibility-improvements.js    # Accessibility features
├── youtube-shortcut-protection.js   # Shortcut protection
├── _locales/                        # Internationalization
│   ├── en/messages.json            # English translations
│   └── ja/messages.json            # Japanese translations
└── icons/                          # Icon files
```

### Main Classes

#### TheaterModeController

Manages core theater mode functionality

- Apply/remove overlay
- Opacity adjustment
- State management

#### ElementDetector

YouTube element detection with fallback functionality

- Video player detection
- Identify overlay target elements
- Exclude protected elements

#### SettingsManager

User settings management

- Chrome Storage API integration
- LocalStorage fallback
- Settings validation

## 🧪 Testing

### Test File Structure

```
test-*.js           # Test files for each feature
test-*.html         # HTML test harnesses
run-*-tests.js      # Test runners
```

### Running Tests

1. **Individual Test Execution**:

```bash
# Open corresponding HTML file in browser
open test-button-placement.html
```

2. **Run All Tests**:

```bash
# Execute each run-*-tests.js file
node run-element-tests.js
node run-layout-tests.js
node run-opacity-tests.js
```

### Test Categories

- **Element Detection Tests**: Accurate detection of YouTube elements
- **Layout Tests**: Behavior across different screen sizes
- **Opacity Tests**: Overlay opacity adjustment
- **Integration Tests**: Component interaction
- **Accessibility Tests**: Screen reader compatibility
- **Performance Tests**: Speed and memory usage

## 🔧 Development

### Development Environment Setup

1. **Clone Repository**:

```bash
git clone https://github.com/wpuzzle/youtube-theater-mode.git
cd youtube-theater-mode
```

2. **Load Extension**:

   - Chrome: `chrome://extensions/` → Developer mode → Load unpacked

3. **Start Development Server** (Optional):

```bash
# Serve test files with simple HTTP server
python -m http.server 8000
```

### Debugging Methods

1. **Console Logs**:

   - F12 → Console → Filter by "YouTube Theater Mode:"

2. **Background Logs**:

   - `chrome://extensions/` → Click "background page" for the extension

3. **Storage Inspection**:
   - F12 → Application → Storage → Chrome Extension

### Coding Standards

- **JavaScript**: Prefer ES6+ features, JSDoc comments required
- **CSS**: BEM-style naming convention, responsive design
- **HTML**: Semantic HTML5, accessibility attributes

## 🌐 Internationalization

The extension supports multiple languages:

- **Japanese** (ja) - Default
- **English** (en)

Language is automatically detected from browser settings. To add new languages:

1. Create `_locales/[language_code]/messages.json`
2. Add translations for all message keys
3. Test with browser language settings

## 🤝 Contributing

### Bug Reports

Report bugs in [Issues](https://github.com/wpuzzle/youtube-theater-mode/issues).

### Feature Requests

Discuss new feature ideas in [Discussions](https://github.com/wpuzzle/youtube-theater-mode/discussions).

### Pull Requests

1. Fork and create a branch
2. Implement changes
3. Add/update tests
4. Create pull request

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details

## 🔗 Related Links

- [Chrome Web Store](https://chromewebstore.google.com/detail/youtube-theater-mode/bgmiamnfbabhimeoamhliglpdfiikkck) (Coming Soon)
- [Developer Documentation](docs/)

## 📞 Support

- **Bug Reports**: [GitHub Issues](https://github.com/wpuzzle/youtube-theater-mode/issues)
- **Questions & Discussion**: [GitHub Discussions](https://github.com/wpuzzle/youtube-theater-mode/discussions)

---

**YouTube Theater Mode** - Creating a more focused YouTube viewing experience 🎬
