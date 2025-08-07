# YouTube Theater Mode

YouTube 視聴時に動画以外の画面要素を薄暗くして、動画コンテンツに集中できる環境を提供する Chrome 拡張機能です。

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
