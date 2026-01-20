# アーキテクチャ詳細

## 全体構造
レイヤード・アーキテクチャパターンを採用。3層構造で関心の分離と保守性を重視。

## レイヤー構成

### 1. Infrastructure Layer（基盤層）
`infrastructure/` ディレクトリ内の共通ユーティリティ群
- **logger.js**: 構造化ログとパフォーマンス監視
- **error-handler.js**: 統一エラー処理とResult型パターン
- **message-bus.js**: 型安全なコンポーネント間通信
- **message-router.js**: メッセージルーティング
- **storage-adapter.js**: Chrome Storage APIの抽象化
- **state-store.js**: Fluxパターンによる状態管理
- **settings-manager.js**: スキーマベース設定管理
- **i18n-manager.js**: 国際化管理
- **performance-monitor.js**: パフォーマンス監視
- **element-manager.js**: DOM要素管理
- **element-observer.js**: DOM変更監視
- **overlay-manager.js**: オーバーレイ管理
- **dom-optimizer.js**: DOM操作最適化
- **data-validator.js**: データバリデーション

### 2. Business Layer（ビジネス層）
状態管理と設定管理
- **StateStore**: Fluxパターンによる状態管理
- **SettingsManager**: スキーマベース設定管理
- **TabStateManager (tab-state-manager.js)**: マルチタブ状態同期

### 3. Presentation Layer（プレゼンテーション層）
ユーザーインターフェース
- **content.js**: メインコンテンツスクリプト（TheaterModeController, ElementDetector, SettingsManager）
- **background.js**: バックグラウンドサービスワーカー（BackgroundService）
- **popup.js/popup.html/popup.css**: ポップアップUI

## 主要クラス

### TheaterModeController (content.js)
シアターモードの中核機能を管理
- オーバーレイの適用/削除
- 透明度調整
- キーボードショートカット設定
- 状態管理

### ElementDetector (content.js)
YouTube要素の検出とフォールバック機能
- 動画プレーヤー検出
- オーバーレイ対象要素の特定
- 保護対象要素の除外

### SettingsManager (content.js / infrastructure/settings-manager.js)
ユーザー設定の管理
- Chrome Storage API連携
- LocalStorageフォールバック
- 設定バリデーション
- スキーマベースのマイグレーション

### BackgroundService (background.js)
バックグラウンドサービス
- メッセージリスナー設定
- タブリスナー設定
- 設定の取得・保存

## ファイル構成
```
/
├── manifest.json                    # 拡張機能マニフェスト (Manifest V3)
├── background.js                    # バックグラウンドサービスワーカー
├── content.js                       # メインコンテンツスクリプト
├── popup.html/js/css                # ポップアップUI
├── theater-mode.css                 # シアターモードスタイル
├── performance-utils.js             # パフォーマンス最適化
├── accessibility-improvements.js    # アクセシビリティ機能
├── tab-state-manager.js             # タブ状態管理
├── infrastructure/                  # インフラストラクチャ層
├── test/                            # テストファイル
├── docs/                            # ドキュメント
├── _locales/                        # 多言語対応
└── icons/                           # アイコンファイル
```
