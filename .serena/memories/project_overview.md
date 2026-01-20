# YouTube Theater Mode - プロジェクト概要

## プロジェクトの目的
YouTube視聴時に動画以外の画面要素を薄暗くして、動画コンテンツに集中できる環境を提供するChrome拡張機能。

## 主要機能
- **シアターモード**: 非動画要素（サイドバー、コメント、関連動画）に半透明の暗いオーバーレイを適用
- **動画プレーヤー保護**: 動画プレーヤーとそのコントロールの完全な視認性を維持
- **簡単切り替え**: ポップアップボタンまたはキーボードショートカット（Ctrl+Shift+T）で切り替え
- **透明度調整**: オーバーレイの透明度を0-90%の範囲で調整可能
- **設定永続化**: セッション間での設定の自動保存
- **アクセシビリティ対応**: スクリーンリーダー対応とキーボードナビゲーション
- **多言語対応**: 11言語（en, ja, de, es, fr, it, ko, pt, ru, zh_CN, zh_TW）

## 技術スタック
- **フレームワーク**: Chrome Extension Manifest V3
- **言語**: JavaScript (ES6+), HTML5, CSS3
- **ストレージ**: Chrome Storage API (sync)
- **依存関係**: なし（Pure Vanilla JavaScript）

## 対応ページ
- YouTube動画ページ（youtube.com/watch）
- YouTube Shorts（youtube.com/shorts）
- YouTube Live配信
- YouTube Premium動画

## バージョン
現在のバージョン: 1.1.3
