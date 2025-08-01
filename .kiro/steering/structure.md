---
inclusion: always
---

# プロジェクトアーキテクチャ & 構造

## コアアーキテクチャパターン

**モジュラーデザイン**: 各責任に専用のモジュールを持つ明確な関心の分離を使用する。

**インフラストラクチャレイヤー**: すべての共有ユーティリティは `infrastructure/` ディレクトリに配置する。類似の機能を実装する代わりに、常にこれらのクラスを使用する：

- `ErrorHandler` - 例外処理とレポート
- `Logger` - レベル付き構造化ログ（debug、info、warn、error）
- `MessageBus` - コンポーネント間通信
- `StorageAdapter` - Chrome Storage API ラッパー
- `PerformanceMonitor` - パフォーマンス追跡と最適化

**コンポーネント通信**: すべてのコンポーネント間メッセージングに `MessageBus` を使用する。コンポーネント間の直接通信は実装しない。

## 主要コンポーネント & 責任

**バックグラウンドサービス** (`background.js`, `background-service.js`)

- 拡張機能状態の単一の信頼できる情報源
- すべてのコンポーネント相互作用を調整
- `StorageAdapter` を介した設定の永続化を管理
- クロスタブ状態同期を処理

**コンテンツスクリプト** (`content.js`)

- YouTube DOM 操作とオーバーレイ注入
- 堅牢なフォールバックメカニズムを持つ要素検出
- キーボードショートカット処理（すべての YouTube ショートカットを保持する必要がある）
- `MessageBus` を介してバックグラウンドと通信

**ポップアップインターフェース** (`popup.html`, `popup.js`, `popup.css`)

- シアターモード切り替えと透明度調整のユーザーコントロール
- リアルタイム状態表示
- 設定管理インターフェース

**インフラストラクチャクラス**（必須使用）

- `TheaterModeController` - オーバーレイ管理とシアターモードロジック
- `ElementDetector` - 複数のフォールバック戦略を持つ YouTube 要素検出
- `SettingsManager` - 検証付きユーザー設定管理
- `TabStateManager` - マルチタブ状態追跡と同期

## 開発ルール

**要素検出**: 常に適切なフォールバックを持つ複数の検出戦略を実装する。YouTube DOM 構造が安定し続けることを前提としない。

**エラー処理**: `ErrorHandler` を使用してすべての操作を try-catch ブロックでラップする。拡張機能は YouTube 機能を破綻させてはならない。

**状態管理**:

- バックグラウンドサービスが権威ある状態ソース
- すべての Chrome Storage 操作に `StorageAdapter` を使用
- すべてのアクティブな YouTube タブに状態変更を伝播
- `SettingsManager` を通じてすべての設定を検証

**パフォーマンス**:

- 操作追跡に `PerformanceMonitor` を使用
- DOM クエリを最小化し、可能な場合は結果をキャッシュ
- コンポーネント破棄時にイベントリスナーとオブザーバーをクリーンアップ

**テスト**:

- 各コンポーネントには対応する `test/test-*.js` と `run-*-tests.js` ファイルがある
- 一貫したテスト構造のために `infrastructure/test-framework.js` を使用
- `infrastructure/mock-factory.js` を使用して外部依存関係をモック

## ファイル命名規則

- コア機能: `kebab-case.js`（例：`theater-mode-controller.js`）
- インフラストラクチャ: `infrastructure/kebab-case.js`
- テスト: `test/test-component-name.js` と `test/run-component-tests.js`
- HTML テストハーネス: `test/test-component-name.html`

## 重要な制約

**YouTube 互換性**: 動画プレーヤー機能や既存の YouTube キーボードショートカットに干渉しない。これが最優先要件。

**適切な劣化**: YouTube の更新で要素検出が破綻した場合でも拡張機能は動作する必要がある。堅牢なフォールバックメカニズムを実装する。

**クリーンアーキテクチャ**: 単一責任原則に従う。各クラスは明確な目的を持ち、共有サービスには依存性注入を使用する。
