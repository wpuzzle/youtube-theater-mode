---
inclusion: always
---

# 技術スタック & 開発ガイドライン

## 技術スタック

- **フレームワーク**: Chrome Extension Manifest V3
- **言語**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **ストレージ**: Chrome Storage API (sync)
- **依存関係**: 外部依存関係なし - 純粋なバニラ実装

## コードスタイル & 標準

### JavaScript

- ES6+機能を使用（アロー関数、テンプレートリテラル、分割代入）
- メインコンポーネントにはクラスベースアーキテクチャ
- 変数と関数には camelCase、クラスには PascalCase
- `ErrorHandler`を使用した try/catch ブロックによる包括的エラー処理
- `Logger`クラスによる構造化ログ（debug、info、warn、error レベル）
- すべてのクラスとパブリックメソッドに JSDoc コメント
- 機能を再実装する代わりに、常にインフラストラクチャクラスを使用

### CSS

- クラスには BEM 風命名規則
- `!important`は控えめに使用、YouTube スタイルをオーバーライドする場合のみ
- テーマ一貫性のための CSS 変数
- レスポンシブデザインのためのメディアクエリ
- クロスブラウザ互換性のためのベンダープレフィックス

### HTML

- セマンティック HTML5 要素
- アクセシビリティ属性（aria-\*, role, tabindex）
- UTF-8 エンコーディング

## 開発ワークフロー

### テスト & デバッグ

- Chrome で未パッケージ拡張機能を読み込み（`chrome://extensions/`）
- 様々な YouTube ページレイアウトでテスト（視聴、検索、チャンネル、プレイリスト）
- デバッグには Chrome DevTools を使用
- 拡張機能ログには「YouTube Theater Mode:」プレフィックス
- バックグラウンドサービスログは拡張機能バックグラウンドページで利用可能

### テスト構造

- テストファイル: `test/test-*.js` と対応する `test/run-*-tests.js`
- HTML テストハーネス: `test/test-*.html`
- 一貫したテスト構造のために `infrastructure/test-framework.js` を使用
- 外部依存関係のモックには `infrastructure/mock-factory.js` を使用

## 重要な開発ルール

### インフラストラクチャ使用（必須）

再実装する代わりに、常にこれらのインフラストラクチャクラスを使用:

- `ErrorHandler` - 例外処理とレポート
- `Logger` - レベル付き構造化ログ
- `MessageBus` - コンポーネント通信
- `StorageAdapter` - Chrome Storage API ラッパー
- `PerformanceMonitor` - パフォーマンス追跡

### 要素検出

- フォールバック付きの複数検出戦略を使用
- YouTube DOM 構造が安定し続けることを前提としない
- 適切に劣化する堅牢なセレクターを実装

### エラー処理

- `ErrorHandler`を使用してすべての操作を try-catch ブロックでラップ
- 拡張機能は YouTube 機能を破綻させてはならない
- 機能が失敗した場合の適切な劣化を実装

### パフォーマンス

- 操作追跡に `PerformanceMonitor` を使用
- DOM クエリを最小化し、可能な場合は結果をキャッシュ
- コンポーネント破棄時にイベントリスナーとオブザーバーをクリーンアップ

### 状態管理

- バックグラウンドサービスが権威ある状態ソース
- すべての Chrome Storage 操作に `StorageAdapter` を使用
- すべてのアクティブな YouTube タブに状態変更を伝播
- `SettingsManager` を通じてすべての設定を検証
