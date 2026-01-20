# 推奨コマンド

## 開発環境

### Chrome拡張機能のインストール（開発モード）
1. Chrome で `chrome://extensions/` を開く
2. 「デベロッパーモード」を有効にする
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. プロジェクトディレクトリを選択

### 開発サーバー起動（テストファイル用）
```bash
python -m http.server 8000
```

## テスト

### 全ユニットテスト実行
```bash
node test/run-all-unit-tests.js
```

### 個別テスト実行（ブラウザ）
```bash
# HTMLテストファイルを開く
open test/test-*.html
```

### 個別テストランナー実行
```bash
node test/run-logger-tests.js
node test/run-error-handler-tests.js
node test/run-element-tests.js
node test/run-layout-tests.js
node test/run-opacity-tests.js
node test/run-integration-tests.js
node test/run-background-service-tests.js
# ... その他多数のrun-*-tests.js
```

## デバッグ

### コンソールログ確認
F12 → Console → "YouTube Theater Mode:" でフィルタ

### バックグラウンドログ確認
`chrome://extensions/` → 拡張機能の「バックグラウンドページ」をクリック

### ストレージ確認
F12 → Application → Storage → Chrome Extension

## Git操作
```bash
git status
git add .
git commit -m "コミットメッセージ"
git push
```

## システムユーティリティ（macOS/Darwin）
```bash
ls -la                    # ファイル一覧
find . -name "*.js"       # ファイル検索
grep -r "検索語" .        # テキスト検索
```
