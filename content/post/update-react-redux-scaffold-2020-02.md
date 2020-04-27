+++
categories = ["Programming"]
title = "React + Reduxアプリケーションプロジェクトのテンプレートを2020年版にアップデート ― その2: パスエイリアス設定"
date = "2020-04-27T22:39:14+09:00"
tags = ["react", "redux", "frontend", "webpack", "eslint", "babel", "typescript"]
draft = false
cover = "react.png"
slug = "update-react-redux-scaffold-2020-02"
highlight = true
highlightStyle = "monokai"
highlightLanguages = []
+++

[2018年後半](https://www.kaitoy.xyz/2018/11/26/creating-react-redux-app-from-scratch-11/)にスクラッチから作った[ReactとReduxのプロジェクトテンプレート](https://github.com/kaitoy/react-redux-scaffold)を2020年版として色々アップデートしている。

[前回](https://www.kaitoy.xyz/2020/04/26/update-react-redux-scaffold-2020-01/)はライブラリのアップデートや差し替えをした。

今回はパスエイリアス設定をする。

<!--more-->

{{< google-adsense >}}

# モジュール解決

```javascript
import React from 'react';
import Button from '@material-ui/core/Button';
import HogeButton from '../containers/HogeButton';
import Fonts from '../fonts';
```

こんな感じにモジュールのimportを書いたとき、[webpack](https://webpack.js.org/)とかがモジュールの実際のパスを解決する処理を[モジュール解決](https://webpack.js.org/concepts/module-resolution/)という。

基本的にモジュール解決はimportの仕方によって3通りある:

* 絶対パス

    ```javascript
    import App from '/home/kaitoy/react-redux-scaffold/src/views/App';
    ```

    こんな感じでimportするモジュールを絶対パスで指定すると、そのままそれがロードされる。

* 相対パス

    ```javascript
    import OkButton from '../../form/OkButton';
    ```

    こんな感じでimportするモジュールを相対パスで指定すると、importを書いたモジュールから見た相対パスとして解決される。

* モジュールパス

    ```javascript
    import React from 'react';
    ```

    こんな感じで、ドライブレターとか`/`とか`.`で始まらないパスを書くと、それはモジュールパスとして解決される。
    モジュールパスは、処理系にモジュールディレクトリとして指定されたディレクトリからのパスになる。
    モジュールディレクトリは普通は`node_modules`。

# パスエイリアス
プロジェクトディレクトリ内の自作モジュールをimportするとき、絶対パスでimportするのはプロジェクトディレクトリの可搬性が悪いしパスが長くなるのでダメ。

プロジェクトのソースディレクトリ辺りを(`node_modules`に加えて)モジュールディレクトリに指定しておいて、モジュールパスで
importするのも、`node_modules`のnpmパッケージと見分けがつきにくいし、名前がコンフリクトする可能性もなくはないので微妙。

ということで以前のプロジェクトテンプレートでは相対パスでimportしていたけど、`../`がたくさん要ったりして書きにくいし読みにくいし、モジュールの移動をするときに書き換えが面倒。

これら3通りのimport方法の欠点をすべて解消するのがパスエイリアス。
モジュールディレクトリに名前を付けて、そこからのパスでimportするモジュールを指定できるような感じ。

```javascript
import App from '~/views/App';
```

この`~`の部分がパスエイリアス。

# プロジェクトテンプレートへのパスエイリアス設定
`<プロジェクトルート>/src`に`~`というパスエイリアスを設定したい。

プロジェクトテンプレートでモジュールの解決をする必要があるのは、バンドルファイルを生成するwebpack、[TypeScript](https://www.typescriptlang.org/)のトランスパイラ、リンティングをする[ESLint](https://eslint.org/)と、[Jest](https://jestjs.io/ja/)の実行時に使う[Babel](https://babeljs.io/)。

## webpackへのパスエイリアス設定
webpackは[標準でパスエイリアスをサポート](https://webpack.js.org/configuration/resolve/#resolvealias)しているので、設定に書き加えるだけ。

`webpack.common.js`:
```diff
 (snip)
   resolve: {
     extensions: ['*', '.ts', '.tsx', '.js', '.jsx'],
     modules: ['node_modules'],
+    alias: {
+      '~': path.resolve(__dirname, 'src'),
+    },
   },
 (snip)
```

## TypeScriptのパスエイリアス設定
TypeScriptには[Path mapping](https://www.typescriptlang.org/docs/handbook/module-resolution.html#path-mapping)という機能があってパスエイリアスとして使える。

`tsconfig.json`:
```diff
 {
   "compilerOptions": {
 (snip)
-    // "baseUrl": "./",                       /* Base directory to resolve non-absolute module names. */
-    // "paths": {},                           /* A series of entries which re-map imports to lookup locations relative to the 'baseUrl'. */
+    "baseUrl": "./" /* Base directory to resolve non-absolute module names. */,
+    "paths": {
+      /* A series of entries which re-map imports to lookup locations relative to the 'baseUrl'. */
+      "~/*": ["./src/*"]
+    },
 (snip)
 }
```

## ESLintのパスエイリアス設定
ESLintは、[eslint-import-resolver-webpack](https://github.com/benmosher/eslint-plugin-import/tree/master/resolvers/webpack)というプラグインを使うと、モジュール解決の設定をwebpackの設定から取得してくれる。

```cmd
npm install -D eslint-import-resolver-webpack
```

`.eslintrc.js`:
```diff
(snip)
   overrides: [
     {
       files: ['**/*.ts', '**/*.tsx'],
       rules: {
         // Set 'no-unused-vars' to off to suppress errors on importing types.
         // (e.g. error  'FunctionComponent' is defined but never used  no-unused-vars)
         // Unused vars are checked by TypeScript compiler (at-loader) instead.
         'no-unused-vars': 'off',
         'react/prop-types': 'off',
       },
     },
   ],
+  settings: {
+    'import/resolver': {
+      webpack: { config: path.join(__dirname, 'webpack.prod.js') },
+    },
+  },
 };
```

## Babelのパスエイリアス設定
Babelは[babel-plugin-module-resolver](https://github.com/benmosher/eslint-plugin-import/tree/master/resolvers/webpack)を入れるとできる。

```cmd
npm install -D babel-plugin-module-resolver
```

`babel.config.js`:
```diff
 module.exports = {
   presets: [
     [
       '@babel/preset-env',
       {
         useBuiltIns: 'usage',
         corejs: 3,
       },
     ],
     '@babel/preset-react',
     '@babel/preset-typescript',
   ],
-  plugins: ["babel-plugin-styled-components", "@babel/plugin-syntax-dynamic-import"],
+  plugins: [
+    'babel-plugin-styled-components',
+    '@babel/plugin-syntax-dynamic-import',
+    [
+      'babel-plugin-module-resolver',
+      {
+        root: ['./'],
+        alias: { '~': './src' },
+      },
+    ]
+  ],
 };
```

# 問題点
以上で一通り設定できているはずなんだけど、ユニットテストとか実装途中でまだ使ってないモジュールとか、`index.tsx`から辿れない(?)やつでパスエイリアスを使うと、VSCode上でTypeScriptコンパイラが`Cannot find module`というエラーを表示してくるし、補完が利かない。

何か設定が足らない?
