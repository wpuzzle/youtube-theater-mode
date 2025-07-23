---
inclusion: always
---

# プロジェクト構造 & アーキテクチャ

## ディレクトリ構造

```
/
├── manifest.json       # 拡張機能マニフェストファイル
├── background.js       # バックグラウンドサービスワーカー
├── content.js          # YouTube ページ用コンテンツスクリプト
├── popup.html          # 拡張機能ポップアップ UI
├── popup.js            # ポップアップ機能
├── popup.css           # ポップアップスタイリング
├── theater-mode.css    # シアターモードオーバーレイのスタイル
├── background-service.js # バックグラウンドサービス機能
├── tab-state-manager.js # タブ状態管理
├── popup-content-communication.js # ポップアップとコンテンツ間の通信
├── infrastructure/     # コア機能を提供するユーティリティ
│   ├── error-handler.js  # エラー処理
│   ├── logger.js         # ロギング機能
│   ├── message-bus.js    # コンポーネント間通信
│   └── storage-adapter.js # ストレージ操作
├── test/               # テストファイル
    ├── test-*.js       # テスト実装
    ├── test-*.html     # テストハーネス
    └── run-*-tests.js  # テストランナー
```

## アーキテクチャ概要

この拡張機能は、明確な関心の分離を持つモジュラーアーキテクチャに従っています。

### コアコンポーネント

1. **バックグラウンドサービス** (`background.js`, `background-service.js`)

   - 拡張機能のライフサイクル管理
   - 設定の保存と取得
   - コンポーネント間通信の調整
   - 複数タブ間の状態維持

2. **コンテンツスクリプト** (`content.js`)

   - シアターモードオーバーレイの注入・管理
   - YouTube 要素検出
   - キーボードショートカット処理
   - バックグラウンドサービスとの通信

3. **ポップアップ UI** (`popup.html`, `popup.js`, `popup.css`)

   - シアターモード切替インターフェース
   - 透明度調整機能
   - 拡張機能の状態表示
   - バックグラウンドサービスとの通信

4. **インフラストラクチャ** (`infrastructure/`)
   - エラー処理 (`error-handler.js`)
   - ロギング (`logger.js`)
   - メッセージング (`message-bus.js`)
   - ストレージ操作 (`storage-adapter.js`)

### 主要クラス

- **TheaterModeController**: シアターモードオーバーレイと切り替え機能を管理
- **ElementDetector**: フォールバックメカニズムを持つ YouTube 要素検出
- **SettingsManager**: ユーザー設定の管理（ストレージ・バリデーション）
- **BackgroundService**: 拡張機能の機能調整
- **TabStateManager**: 複数タブ間の状態追跡・同期
- **ErrorHandler**: 例外処理と報告
- **Logger**: 異なるレベルでのログ記録
- **MessageBus**: コンポーネント間通信
- **StorageAdapter**: Chrome Storage API のラッパー

## 通信フロー

1. **ユーザーインタラクション**:

   - 拡張機能アイコンクリック → ポップアップ表示
   - シアターモード切替 → ポップアップ → バックグラウンドへメッセージ送信
   - キーボードショートカット → コンテンツスクリプト処理 → バックグラウンド通知

2. **状態管理**:

   - バックグラウンドサービスが設定の信頼できる情報源
   - 変更は全アクティブ YouTube タブに伝播
   - 設定は Chrome Storage API で永続化
   - `MessageBus`クラスを使用したコンポーネント間通信

3. **シアターモード適用**:
   - コンテンツスクリプトが状態に基づきオーバーレイ適用/削除
   - ユーザー設定に基づく透明度調整
   - 動画プレーヤーの完全な可視性確保

## テスト戦略

- **コンポーネントテスト**: 個別機能の単体テスト (`test/test-*.js`)
- **統合テスト**: コンポーネント間通信のテスト (`test/test-integration.js`)
- **視覚的テスト**: オーバーレイ外観のテスト (`test/test-overlay-*.html`)
- **機能テスト**: キーボードショートカット、設定永続性
- **テスト実行**: 対応する`run-*-tests.js`ファイルを使用

## 開発規約

- 新機能は既存のアーキテクチャパターンに従う
- コンポーネント間の通信には`MessageBus`を使用
- エラー処理には`ErrorHandler`を使用
- ストレージ操作には`StorageAdapter`を使用
- 適切なログレベルで`Logger`を使用
- 各コンポーネントは単一責任の原則に従う
- YouTube 要素検出には堅牢なフォールバックメカニズムを実装
