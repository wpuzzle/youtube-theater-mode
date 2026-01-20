# コードスタイルと規約

## 命名規則
- **クラス名**: PascalCase（例: `TheaterModeController`, `SettingsManager`）
- **ファイル名**: kebab-case（例: `theater-mode-controller.js`, `error-handler.js`）
- **メソッド/関数名**: camelCase（例: `loadSettings`, `detectVideoPlayer`）
- **定数**: UPPER_SNAKE_CASE（例: `DEFAULT_SETTINGS`, `LOG_LEVELS`）
- **テストファイル**: `test-` プレフィックス（例: `test-logger.js`）
- **テストランナー**: `run-*-tests.js` パターン

## JavaScript スタイル

### ES6+ 機能の使用
- `const` / `let` を使用（`var` は使わない）
- アロー関数の活用
- クラス構文の使用
- async/await パターン
- テンプレートリテラル

### クラス構造
```javascript
class ClassName {
    constructor() {
        // 初期化
    }

    // publicメソッド
    publicMethod() {}

    // privateメソッド（アンダースコアプレフィックス）
    _privateMethod() {}
}
```

### エラー処理
- Result型パターンの使用（infrastructure/error-handler.js）
- try-catchブロックでの例外処理
- ログ出力による追跡

### ログ出力
- `console.log("YouTube Theater Mode:", ...)` 形式でフィルタリング可能に
- Loggerクラスを使用した構造化ログ

## 設計パターン
- **Flux パターン**: 状態管理（StateStore）
- **シングルトン**: 各マネージャークラス
- **オブザーバー**: DOM変更監視（ElementObserver）
- **ファクトリー**: モック生成（MockFactory）

## コメント規約
- JSDoc形式のドキュメンテーション
- 日本語コメント可

## 国際化 (i18n)
- `_locales/` ディレクトリで多言語対応
- `chrome.i18n.getMessage()` でメッセージ取得
- manifest.jsonで `"default_locale": "en"` 設定
- 11言語サポート: en, ja, de, es, fr, it, ko, pt, ru, zh_CN, zh_TW
