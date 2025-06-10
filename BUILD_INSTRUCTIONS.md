# YT Outline & Snap ビルド手順書

この文書では、YT Outline & Snap Chrome拡張機能のビルド方法について説明します。

## 必要条件

- Node.js 16以上
- npm 7以上または yarn 1.22以上

## ビルド手順

### 1. 依存パッケージのインストール

プロジェクトのルートディレクトリ（`extension`フォルダ）で以下のコマンドを実行します：

```bash
# npmの場合
npm install

# yarnの場合
yarn install
```

### 2. Tailwind CSSの設定

Tailwind CSSの最新バージョンでは、PostCSSプラグインの構成が変更されています。以下の手順で設定を行います：

1. `postcss.config.js`ファイルを以下の内容で作成または更新します：

```javascript
module.exports = {
  plugins: {
    'tailwindcss/nesting': {},
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

2. `tailwind.config.js`ファイルが正しく設定されていることを確認します：

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {},
  },
  plugins: [],
}
```

### 3. ビルドの実行

以下のコマンドでビルドを実行します：

```bash
# npmの場合
npm run build

# yarnの場合
yarn build
```

ビルドが成功すると、`dist`ディレクトリに拡張機能のファイルが生成されます。

### 4. 必要なファイルのコピー

ビルド後、以下のファイルが`dist`ディレクトリに存在することを確認します：

- `manifest.json`
- `background.js`
- `contentScript.js`
- `options.js`
- `options.html`
- `_locales/`ディレクトリ（多言語リソース）
- `icons/`ディレクトリ（アイコン画像）

もし不足しているファイルがある場合は、以下のコマンドでコピーします：

```bash
# manifest.jsonのコピー（既に存在する場合は上書き）
cp src/manifest.json dist/

# ロケールファイルのコピー
cp -r public/_locales dist/

# アイコンのコピー
cp -r public/icons dist/
```

### 5. Chrome拡張機能としての読み込み

1. Chromeブラウザで `chrome://extensions` にアクセス
2. 「デベロッパーモード」を有効化
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. 生成された`dist`ディレクトリを選択

## トラブルシューティング

### Tailwind CSSのビルドエラー

エラーメッセージ: `It looks like you're trying to use tailwindcss directly as a PostCSS plugin...`

**解決策**:
1. Tailwind CSSとPostCSSのバージョンを確認
2. 以下のパッケージをインストール:
   ```bash
   npm install -D tailwindcss@latest postcss@latest autoprefixer@latest
   ```
3. postcss.config.jsを上記の設定に更新

### その他のビルドエラー

ビルド中に他のエラーが発生した場合は、以下を確認してください：

1. Node.jsとnpmのバージョンが最新であること
2. 依存パッケージが正しくインストールされていること
3. `vite.config.js`が正しく設定されていること

## 拡張機能の使用方法

ビルドして読み込んだ拡張機能を使用するには：

1. YouTube動画ページにアクセス
2. 拡張機能のオプションページでGemini APIキーを設定
3. 動画ページの右上に表示されるオーバーレイパネルを使用して機能を利用

詳細な使用方法については、README.mdを参照してください。
