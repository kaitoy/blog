+++
categories = ["Programming"]
date = "2018-08-23T00:19:09+09:00"
draft = false
cover = "prettier-eslint.png"
slug = "creating-react-redux-app-from-scratch-03"
tags = ["react", "frontend", "eslint", "prettier"]
title = "React + Reduxアプリケーションプロジェクトのテンプレートを作る ― その3: PrettierとESLint"
+++

[React](https://reactjs.org/)と[Redux](https://redux.js.org/)を学ぶために、開発環境というかプロジェクトテンプレートをスクラッチから作っている。
(最終的な成果は[GitHub](https://github.com/kaitoy/react-redux-scaffold)に置いた。)

[前回](https://www.kaitoy.xyz/2018/08/22/creating-react-redux-app-from-scratch-02/)はReactをセットアップした。

(2018/11/21更新)

{{< google-adsense >}}

# フォーマッタとリンタ

プロジェクトにフォーマッタとリンタを導入する。

フォーマッタはソースの体裁を整えるツール。
フォーマッタを使うことで体裁が統一され、ソースが読みやすくなり、品質向上につながる。

リンタはソースを静的解析して、潜在的なバグ、構造的な問題、体裁の問題を検出して警告してくれるツール。
フォーマッタは体裁だけ整えるのに対し、リンタは論理構造にも制約を課せるので、コーディングスタイルがより統一できたり、ミスをしやすい論理構造が無くなったりして、品質向上につながる。

JavaScriptのような動的型付け言語では、実行時まで顕在化しないバグを作りこみやすく、また実行時エラーの原因解析が静的型付け言語に比べて難しいので、フォーマッタとリンタでプログラム実行前に問題をできるだけ取り除いておくのが重要。
またチーム開発では、コードレビューでコーディンスタイルを見る必要がなくなり、効率化につながる。

## Prettier

フォーマッタには[Prettier](https://prettier.io/)を使う。

Prettierは[2017年1月](https://jlongster.com/A-Prettier-Formatter)にリリースされた新しいツール。
構文解析をして[AST](https://ja.wikipedia.org/wiki/%E6%8A%BD%E8%B1%A1%E6%A7%8B%E6%96%87%E6%9C%A8)を構築し、そこからフォーマット済みコードを出力するので、従来のツールよりも厳密な整形(e.g. 行の最大長を考慮した整形)ができる。

また、opinionated(独断的)であることも特徴で、Prettierプロジェクトが推奨するフォーマットをほぼ強制し、設定がほとんどない。
このため導入が簡単だけど、かゆいところに手が届かないこともある。

JavaScriptの他、JSX、CSS、Markdown、GraphQLのフォーマットにも対応している。

<br>

まずプロジェクトにインストールする。

```tch
yarn add -D prettier
```

v1.15.2が入った。

<br>

[設定](https://prettier.io/docs/en/options.html)は`prettier.config.js`という[ファイル](https://prettier.io/docs/en/configuration.html)を書いてプロジェクトルートに置けばいい。

`prettier.config.js`:
```javascript
module.exports = {
  printWidth: 100, // 行の最大長
  tabWidth: 2, // インデント長
  singleQuote: true, // 文字列をシングルクオートで囲う
  trailingComma: 'all', // オブジェクトのプロパティとか関数の引数を複数行で書いたときに、全行の末尾にカンマをつける
};
```

<br>

また、フォーマット対象外のファイルを指定するファイルである`.prettierignore`をプロジェクトルートに置く。

`.prettierignore`:
```plain
node_modules/
dist/
```

node_modulesはnpmパッケージが入るディレクトリ。
実際はnode_modulesはデフォルトで無視されるから書かなくていいんだけど。

[prettier-ignoreコメント](https://prettier.io/docs/en/ignore.html)を書くことで、ソースを部分的にフォーマット対象外とすることもできる。

<br>

最後に、npmスクリプトを書く。

`package.json`:
```diff
 (前略)
   "scripts": {
+    "format": "prettier --write **/*.jsx **/*.js **/*.css",
     "build": "webpack --config webpack.prod.js",
     "start": "webpack-dev-server --hot --config webpack.dev.js"
   },
 (後略)
```

これで、`yarn format`を実行するとプロジェクト内ソースを一通りフォーマットできる。

## ESLint


リンタにはデファクトスタンダードの[ESLint](https://eslint.org/)を使う。

ESLintは2013年6月にリリースされたそこそこ歴史のあるツール。
リンティングルールがプラガブルで、豊富なルールを細かく制御できるのが特徴。
フォーマッタとしての機能もあるけど、そこはPrettierにまかせることにする。

JavaScriptもJSXもリンティングできる。

リンティングルールはAirbnbによる[eslint-config-airbnb](https://github.com/airbnb/javascript/tree/master/packages/eslint-config-airbnb)が有名なのでこれを使う。

<br>

ESLintを導入するために、以下のパッケージをプロジェクトにインストールする。

* eslint: ESLint本体。
* eslint-loader: webpackからESLintを実行するやつ。
* eslint-config-airbnb: ESLintルール設定集。
* [eslint-plugin-import](https://github.com/benmosher/eslint-plugin-import): eslint-config-airbnbのピア依存。import文を処理するためのESLintプラグイン。
* [eslint-plugin-jsx-a11y](https://github.com/evcohen/eslint-plugin-jsx-a11y): eslint-config-airbnbのピア依存。JSXを処理するためのESLintプラグイン。
* [eslint-plugin-react](https://github.com/yannickcr/eslint-plugin-react): eslint-config-airbnbのピア依存。React特有のリンティングルールを追加するESLintプラグイン。
* [eslint-config-prettier](https://github.com/prettier/eslint-config-prettier): Prettierが施すコード整形とコンフリクトするルールを無効にするESLintルール設定集。

ピア依存をインストールするのにはちょっとコツがいるので、[eslint-config-airbnbのドキュメント](https://github.com/airbnb/javascript/tree/master/packages/eslint-config-airbnb#eslint-config-airbnb-1)を参照すべし。

今回は以下のコマンドでインストールした。

```tch
yarn add -D "eslint@>=1.6.0 <5.0.0" eslint-loader eslint-config-airbnb "eslint-plugin-import@^2.12.0" "eslint-plugin-jsx-a11y@^6.0.3" "eslint-plugin-react@^7.9.1" eslint-config-prettier
```

ESlintはv4.19.1が入った。

<br>

[ESlintの設定](https://eslint.org/docs/user-guide/configuring)は、設定ファイルである`.eslintrc.js`をプロジェクトルートに置けばいい。

`.eslintrc.js`:
```javascript
module.exports = {
  env: {
    browser: true,
  },
  extends: ['airbnb', 'prettier'],
};
```

アプリの実行環境はブラウザなので`env.browser`をtrueにしている。
これにより、ブラウザ環境でデフォルトで使えるグローバル変数(e.g. `document`)を使うときにESLintに怒られないようになる。

`extends`は`eslint-config-airbnb`と`eslint-config-prettier`のルール設定を取り込むように書いている。
`prettier`が最後でなければいけないことに注意。

<br>

また、[リンティング対象外のファイルを指定するファイル](https://eslint.org/docs/user-guide/configuring#ignoring-files-and-directories)をプロジェクトルートに置く。

`.eslintignore`:
```plain
node_modules/*
dist/*
```

node_modulesはnpmパッケージが入るディレクトリ。
実際はnode_modulesはデフォルトで無視されるから書かなくていいんだけど。

[eslint-disableコメント](https://eslint.org/docs/user-guide/configuring#disabling-rules-with-inline-comments)を書くことで、ソースを部分的にリンティング対象外としたり、特定のルールを無効化することもできる。

<br>

webpackからESLintを実行し、エラーがなくならない限りビルド成功できないようにする。

`webpack.common.js`:
```diff
 (前略)
   module: {
     rules: [
+      {
+        test: /\.(js|jsx)$/,
+        include: [path.resolve(__dirname, 'src')],
+        enforce: 'pre',
+        loader: 'eslint-loader',
+        options: {
+          configFile: './.eslintrc.js',
+          failOnError: true,
+        },
       },
       {
         test: /\.(js|jsx)$/,
         include: [path.resolve(__dirname, 'src')],
         loader: 'babel-loader',
       },
     ],
   },
 (後略)
```

<br>

あとはnpmスクリプト書くだけ。

`package.json`:
```diff
 (前略)
   "scripts": {
     "format": "prettier --write **/*.jsx **/*.js **/*.css",
+    "lint": "eslint **/*.jsx **/*.js",
     "build": "webpack --config webpack.prod.js",
     "start": "webpack-dev-server --hot --config webpack.dev.js"
   },
 (後略)
```

これで、`yarn lint`を実行するとプロジェクト内ソースを一通りリンティングできる。

<br>

以上で、フォーマッタとリンタを導入できた。

[次回](https://www.kaitoy.xyz/2018/08/29/creating-react-redux-app-from-scratch-04/)はCSS周りの処理系を追加する。
