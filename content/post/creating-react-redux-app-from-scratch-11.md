+++
categories = ["Programming"]
date = "2018-11-26T16:09:14+09:00"
draft = false
eyecatch = "typescript.png"
slug = "creating-react-redux-app-from-scratch-11"
tags = ["react", "frontend", "typescript"]
title = "React + Reduxアプリケーションプロジェクトのテンプレートを作る ― その11: FlowからTypeScriptへ移行"

+++

[React](https://reactjs.org/)と[Redux](https://redux.js.org/)を学ぶために、開発環境というかプロジェクトテンプレートをスクラッチから作っている。
(最終的な成果は[GitHub](https://github.com/kaitoy/react-redux-scaffold)に置いた。)

[前回](https://www.kaitoy.xyz/2018/11/07/creating-react-redux-app-from-scratch-10/)は[Code Splitting](https://reactjs.org/docs/code-splitting.html)、[Flow](https://flow.org/)、[Jest](https://jestjs.io/ja/)、[Enzyme](https://airbnb.io/enzyme/)をセットアップした。

前回でこのシリーズを終わりにするつもりだったけど、型システムをFlowから[TypeScript](https://www.typescriptlang.org/)に移行したのでそれについて書く。

{{< google-adsense >}}

# TypeScript

TypeScriptはMicrosoft製のAltJS。
もともとは[CoffeeScript](https://coffeescript.org/)のように言語の機能面(e.g. class構文やアロー関数)を補強しつつ、静的型付けをサポートする言語だったが、最近はECMAScriptが前者をカバーしてるので、後者を主な目的として使う人が多い。

2012年に誕生した言語で、同様に静的型付けをサポートするFlowよりも2歳ほど年上。

# TypeScript vs Flow

個人的には、静的型付けだけを目的にするならAltJSである必要はなく、静的型付けだけを補完するFlowのほうが筋がいいような気がする。
TypeScriptはECMAScriptの進化に追従すべく、追加される機能や構文をサポートするためのエンハンスを繰り返しているが、そこはBabelに任せて静的型付けに注力したらいいような。

とはいえ、以下のような点を鑑み、結局TypeScriptを選択した。

* TypeScriptの方が人気
    * GitHubのプロジェクトのスター数はTypeScriptが4万超えでFlowが2万弱。
    * 観測している限り、FlowからTypeScriptへ移行したというのは聞くが、逆は聞かない。
    * 人気があるということはコミュニティやエコシステムが大きいということ。
* TypeScriptがノってる
    * [Babel](https://github.com/babel/babylon/pull/523)や[Create React App](https://github.com/facebook/create-react-app/pull/4837)がTypeScriptをサポートして来ていて、なんだか時流にのっている。
* Flowは型定義ファイルの管理方法が微妙
    * Flowはflow-typedという専用のツールを使ってファイルをダウンロードし、ダウンロードしたものをGitとかのVCSでバージョン管理するというやりかた。
    * TypeScriptはnpmで管理されてるので、Yarnでダウンロードもバージョン管理もできる。VCSのリポジトリに自前のコードしか入れないで済むのもいい。
* TypeScriptの方が型定義ファイルが沢山提供されてる
    * Flowの10倍くらいある。
* TypeScriptの方がエラーメッセージが分かりやすい
    * というのをどこかで聞いた。
* Flowの方が段階的に型を導入できる、というのは昔の話
    * 今はTypeScriptもオプションによって段階的に導入できるというのが定評。
    * そもそも最初から型付けするならどうでもいい。
* Flowの方が厳密な型チェックしてくれる、というのも昔の話
    * TypeScriptが追い付いてきて、今はほぼ同程度らしい。
* TypeScript+[VSCode](https://code.visualstudio.com/)の開発体験が最高すぎるらしい
    * どっちもMicrosoft製なので。
* TypeScriptの方がドキュメントが充実してる
* TypeScriptの方が、いざというときにソースが読みやすい
    * TypeScriptはTypeScriptで実装されてて、Flowは[OCaml](https://ocaml.org/)で実装されてる。

参考:

* https://github.com/niieani/typescript-vs-flowtype
* https://texta.pixta.jp/entry/2018/06/07/120000
* https://narinymous.hatenablog.com/entry/2018/03/02/032130
* https://base.terrasky.co.jp/articles/zuUtT

<br>

前回の記事ではFlowを導入したんだけどTypeScriptに移行する羽目に。
FlowとTypeScriptとで型の表現方式や表現力にあまり差はなかったのでそこはまあ手間ではなかったんだけど、以下のような問題に対応する必要があった。

* ビルド時にTypeScriptの方が時間がかかる。
* TypeScriptのリンタである[TSLint](https://palantir.github.io/tslint/)が、FlowのESLintよりルールが貧弱
    * TypeScriptのコンパイラがチェックしてくれるからいいのかもしれないけど。
* TypeScriptはAltJSなので、何かと連携するときに何かと面倒
    * Jestでユニットテストするときはどうするんだっけとか
    * プレーンJavaScriptと混在した環境ではTSLintとESLint併用しなければいけないんだっけとか

# FlowからTypeScriptへの移行

## 脱Flow

とりあえずFlowを取り除く。

```sh
$ yarn remove flow-bin flow-typed @babel/preset-flow eslint-plugin-flowtype babel-eslint
$ rm -f .flowconfig
```

`.babelrc`:
```diff
 {
   "presets": [
     [
       "@babel/preset-env",
       {
         "useBuiltIns": "usage"
       }
     ],
-    "@babel/preset-flow",
     "@babel/preset-react"
   ],
   "plugins": ["styled-components", "@babel/plugin-syntax-dynamic-import"]
 }
```

`.eslintrc.js`:
```diff
 module.exports = {
   env: {
     browser: true,
     'jest/globals': true,
   },
-  parser: 'babel-eslint',
-  extends: ['airbnb', 'plugin:flowtype/recommended', 'prettier'],
-  plugins: ['flowtype', 'jest'],
+  extends: ['airbnb', 'prettier'],
+  plugins: ['jest'],
 };
```

<br>

環境はこれでよくて、あとは各`.js`ファイルと`.jsx`ファイルから`// @flow`を消して、型情報も消す。
(型情報はTypeScriptでも同じようなのを書くので残しておいてもいい。)

## TypeScript導入

### パッケージインストール

以下のパッケージを入れる。

* [typescript](https://www.npmjs.com/package/typescript): TypeScript本体。コンパイラ(tsc)等を含む。
* `@types/*`: 各3rdパーティライブラリの[型定義ファイル(DefinitelyTyped)](https://github.com/DefinitelyTyped/DefinitelyTyped)。(型定義はライブラリ本体のパッケージに含まれている場合もある。)
* [awesome-typescript-loader](https://github.com/s-panferov/awesome-typescript-loader): TypeScriptを処理するためのwebpackのローダ。他の選択肢として[ts-loader](https://github.com/TypeStrong/ts-loader)があるが、[公式のチュートリアル](https://www.typescriptlang.org/docs/handbook/react-&-webpack.html)がawesome-typescript-loaderをメインで紹介してるのでこっちにする。

```sh
$ yarn add -D typescript @types/react @types/react-dom @types/react-redux @types/redux-logger @types/history @types/react-router-dom @types/uuid @types/styled-components awesome-typescript-loader
```

TypeScriptはv3.1.6、awesome-typescript-loaderはv5.2.1が入った。

### TypeScriptの設定

[TypeScriptの設定ファイル](https://www.typescriptlang.org/docs/handbook/tsconfig-json.html)であるtsconfig.jsonはtscコマンドでテンプレートを生成できる。

```sh
$ yarn tsc --init
```

生成されたファイルをプロジェクトルートに置いて、ちょっといじって以下の感じに。
(jsonなのにコメント書ける…)

`tsconfig.json`:
```javascript
{
  "compilerOptions": {
    /* Basic Options */
    "target": "es5" /* Specify ECMAScript target version: 'ES3' (default), 'ES5', 'ES2015', 'ES2016', 'ES2017','ES2018' or 'ESNEXT'. */,
    "module": "esnext" /* Specify module code generation: 'none', 'commonjs', 'amd', 'system', 'umd', 'es2015', or 'ESNext'. */,
    "lib": ["es2015", "dom"] /* Specify library files to be included in the compilation. */,
    // "allowJs": true,                       /* Allow javascript files to be compiled. */
    // "checkJs": true,                       /* Report errors in .js files. */
    "jsx": "react" /* Specify JSX code generation: 'preserve', 'react-native', or 'react'. */,
    // "declaration": true,                   /* Generates corresponding '.d.ts' file. */
    // "declarationMap": true,                /* Generates a sourcemap for each corresponding '.d.ts' file. */
    "sourceMap": true /* Generates corresponding '.map' file. */,
    // "outFile": "./",                       /* Concatenate and emit output to single file. */
    // "outDir": "./",                        /* Redirect output structure to the directory. */
    // "rootDir": "./",                       /* Specify the root directory of input files. Use to control the output directory structure with --outDir. */
    // "composite": true,                     /* Enable project compilation */
    "removeComments": true /* Do not emit comments to output. */,
    // "noEmit": true,                        /* Do not emit outputs. */
    // "importHelpers": true,                 /* Import emit helpers from 'tslib'. */
    // "downlevelIteration": true,            /* Provide full support for iterables in 'for-of', spread, and destructuring when targeting 'ES5' or 'ES3'. */
    // "isolatedModules": true,               /* Transpile each file as a separate module (similar to 'ts.transpileModule'). */

    /* Strict Type-Checking Options */
    "strict": true /* Enable all strict type-checking options. */,
    "noImplicitAny": true /* Raise error on expressions and declarations with an implied 'any' type. */,
    "strictNullChecks": true /* Enable strict null checks. */,
    "strictFunctionTypes": true /* Enable strict checking of function types. */,
    "strictPropertyInitialization": true /* Enable strict checking of property initialization in classes. */,
    "noImplicitThis": true /* Raise error on 'this' expressions with an implied 'any' type. */,
    "alwaysStrict": true /* Parse in strict mode and emit "use strict" for each source file. */,

    /* Additional Checks */
    "noUnusedLocals": true /* Report errors on unused locals. */,
    "noUnusedParameters": true /* Report errors on unused parameters. */,
    "noImplicitReturns": true /* Report error when not all code paths in function return a value. */,
    "noFallthroughCasesInSwitch": true /* Report errors for fallthrough cases in switch statement. */,

    /* Module Resolution Options */
    "moduleResolution": "node" /* Specify module resolution strategy: 'node' (Node.js) or 'classic' (TypeScript pre-1.6). */,
    // "baseUrl": "./",                       /* Base directory to resolve non-absolute module names. */
    // "paths": {},                           /* A series of entries which re-map imports to lookup locations relative to the 'baseUrl'. */
    // "rootDirs": [],                        /* List of root folders whose combined content represents the structure of the project at runtime. */
    // "typeRoots": [],                       /* List of folders to include type definitions from. */
    "types": [] /* Type declaration files to be included in compilation. */,
    // "allowSyntheticDefaultImports": true,  /* Allow default imports from modules with no default export. This does not affect code emit, just typechecking. */
    "esModuleInterop": true /* Enables emit interoperability between CommonJS and ES Modules via creation of namespace objects for all imports. Implies 'allowSyntheticDefaultImports'. */
    // "preserveSymlinks": true,              /* Do not resolve the real path of symlinks. */

    /* Source Map Options */
    // "sourceRoot": "",                      /* Specify the location where debugger should locate TypeScript files instead of source locations. */
    // "mapRoot": "",                         /* Specify the location where debugger should locate map files instead of generated locations. */
    // "inlineSourceMap": true,               /* Emit a single file with source maps instead of having a separate file. */
    // "inlineSources": true,                 /* Emit the source alongside the sourcemaps within a single file; requires '--inlineSourceMap' or '--sourceMap' to be set. */

    /* Experimental Options */
    // "experimentalDecorators": true,        /* Enables experimental support for ES7 decorators. */
    // "emitDecoratorMetadata": true,         /* Enables experimental support for emitting type metadata for decorators. */
  },
  "files": ["src/index.tsx"],
  "awesomeTypescriptLoaderOptions": {
    "useCache": true,
    "reportFiles": ["src/**/*.{ts,tsx}"],
    "forceIsolatedModules": true
  }
}
```

この設定ファイルのポイントは以下。

* `compilerOptions`: tscのオプション。
    * `target`: コード生成方法をアプリを動作させる環境に合わせて設定するオプション。IE11を含むブラウザを想定して`es5`を設定。
    * `module`: モジュールコード(importとかexportとか?)の生成方法をアプリを動作させる環境に合わせて設定するオプション。大抵は`commonjs`でいいけど、[ダイナミックインポート](https://github.com/tc39/proposal-dynamic-import)を使うために`esnext`を設定。(参考: https://stackoverflow.com/questions/45149091/typescript-use-dynamic-import-in-es5-with-bluebird)
    * `lib`: コンパイル時に取り込むライブラリを設定するオプション。ターゲットが`es5`の場合はデフォルトで`[dom,es5,ScriptHost]`が設定されるけど、それだとジェネレータとかダイナミックインポートを使う場合に「`ERROR in [at-loader] TS2468: Cannot find global value 'Promise'.`」というエラーがでる。ので`es2015`を追加する必要がある。`document.getElementById()`をするのに`dom`も必要だけど、`ScriptHost`は無くてもなんだかビルドできるので、`["es2015", "dom"]`を設定。
    * `allowJs`: デフォルトではTypeScript(i.e. `.ts`ファイルと`.tsx`ファイル)以外があるとエラーになるけど、このオプションを`true`にするとJavaScript(i.e. `.js`ファイルと`.jsx`ファイル)も混在させられる。とりあえずデフォルトの`false`のままにしておく。
    * `checkJs`: allowJsを`true`にしていた場合、JavaScriptファイルのエラーチェックをするかを設定するオプション。エラーチェックをするかは、Flowみたいに[ソースごとにコメントで制御することもできる](https://www.typescriptlang.org/docs/handbook/type-checking-javascript-files.html)。`allowJs`は`false`にするので関係なし。
    * `jsx`: [JSXのコードをどう処理するかを設定するオプション](https://www.typescriptlang.org/docs/handbook/jsx.html)。プレーンなJavaScriptに変換してほしいので、`react`を設定。
    * `moduleResolution`: [モジュールの検索方法を設定するオプション](https://www.typescriptlang.org/docs/handbook/module-resolution.html)。npmのパッケージ(i.e. `node_modules`ディレクトリ内のモジュール)を使うので`node`を設定。(`node`以外にするケースはほとんどなさそう。)
    * `types`: [コンパイル時に自動で取り込む型定義ファイルを設定するオプション](https://www.typescriptlang.org/docs/handbook/tsconfig-json.html#types-typeroots-and-types)。明示的にimportするものはここに書かなくてもいい。(ソースに`import 'hoge'`と書けば`node_modules/`と`node_modules/@types/`内からhogeパッケージが検索される。)とりあえず自動で取り込むようなものはないので`[]`を設定。
    * `esModuleInterop`: Babel界との調停のための`true`にしておくべきオプション。正直よくわからないが、Babelも併用するし、[積極的に有効にすべき](https://qiita.com/karak/items/29ff148788f5abb15331)らしいので`true`に設定。
* files: `include`と`exclude`と合わせて、コンパイル対象ファイルを指定するオプション。指定したファイルがimportするファイルは自動でコンパイル対象になる。ので、webpack設定の`entry`に設定しているもの(i.e. `["src/index.tsx"]`)を`files`に設定。(大抵のケースはこれでいいはず。)
* `awesomeTypescriptLoaderOptions`: awesome-typescript-loaderのオプション。
    * `useCache`: [ビルド速度向上のために](https://github.com/s-panferov/awesome-typescript-loader#performance-issues)`true`を設定してファイルキャッシュを有効にする。キャッシュはプロジェクトルートの`.awcache`ディレクトリに保存されるので、これを.gitignoreに追加。
    * `reportFiles`: エラーチェックするファイルを設定するオプション。自分が書いたソースだけ見てくれればいいので、`src/`以下を設定。ちゃんと設定しておかないと`node_modules/`以下のファイルのエラーチェックもしちゃう。
    * `forceIsolatedModules`: [ビルド速度向上のために](https://github.com/s-panferov/awesome-typescript-loader#performance-issues)`true`を設定してモジュールのリコンパイルを抑制する。モジュールがプレーンJavaScriptに変換済みのものだけならこれで問題ないはず。(つまり大抵はこれでいいはず。)

### webpackの設定

[awesome-typescript-loaderのドキュメント](https://github.com/s-panferov/awesome-typescript-loader#configuration)の通りにwebpackを設定する。

`webpack.common.js`:
```diff
 const path = require('path');
+const { CheckerPlugin } = require('awesome-typescript-loader');
 const packageJson = require('./package.json');

 module.exports = {
   entry: [`./${packageJson.main}`],
   output: {
     path: path.resolve(__dirname, 'dist'),
     filename: 'bundle.js',
   },
   module: {
     rules: [
       {
         test: /\.(js|jsx)$/,
         include: [path.resolve(__dirname, 'src')],
         enforce: 'pre',
         loader: 'eslint-loader',
         options: {
           configFile: './.eslintrc.js',
           failOnError: true,
         },
       },
       {
         test: /\.(js|jsx)$/,
         include: [path.resolve(__dirname, 'src')],
         enforce: 'pre',
         loader: 'stylelint-custom-processor-loader',
       },
       {
         test: /\.(js|jsx)$/,
         include: [path.resolve(__dirname, 'src')],
         loader: 'babel-loader',
       },
+      {
+        test: /\.(ts|tsx)$/,
+        include: [path.resolve(__dirname, 'src')],
+        loader: 'awesome-typescript-loader',
+      },
       {
         test: /\.(png|woff|woff2|eot|ttf|svg)$/,
         include: [path.resolve(__dirname, 'node_modules')],
         loader: 'file-loader',
       },
     ],
   },
   resolve: {
-    extensions: ['*', '.js', '.jsx'],
+    extensions: ['*', '.ts', '.tsx', '.js', '.jsx'],
     modules: ['node_modules'],
   },
+  plugins: [
+    new CheckerPlugin(),
+  ],
 };
```

とくにコメントなし。

<br>

awesome-typescript-loaderのドキュメントで推奨されている[HardSourceWebpackPlugin](https://github.com/mzgoddard/hard-source-webpack-plugin)も導入しておく。
これを使うと、モジュールの中間キャッシュを生成して、二回目以降のビルドを高速化してくれる。

```sh
$ yarn add -D hard-source-webpack-plugin
```

`webpack.dev.js`:
```diff
 const path = require('path');
 const webpackMerge = require('webpack-merge');
+const HardSourceWebpackPlugin = require('hard-source-webpack-plugin');
 const webpackCommon = require('./webpack.common.js');

 module.exports = webpackMerge(webpackCommon, {
   mode: 'development',
   devServer: {
     contentBase: path.join(__dirname, 'public'),
     compress: true,
     hot: true,
     port: 3000,
     publicPath: 'http://localhost:3000/',
     historyApiFallback: true,
   },
+  plugins: [ new HardSourceWebpackPlugin() ],
 });
```

キャッシュは`node_modules/.cache/hard-source/`に保存される。
たまにキャッシュのせいでビルド時とか動作時に問題が起こるので、そんなときはこれを消す。

### フォーマッタの設定

[Prettier](https://prettier.io/docs/en/index.html)は普通にTypeScriptをサポートしてるので、TypeScriptのファイルをフォーマット対象に加えるだけでいい。

`package.json`:
```diff
 (前略)
   "scripts": {
-    "format": "prettier --write **/*.jsx **/*.js **/*.css",
+    "format": "prettier --write **/*.jsx **/*.js **/*.tsx **/*.ts **/*.css",
     "build": "webpack --config webpack.prod.js",
     "test": "jest",
     "start": "webpack-dev-server --hot --config webpack.dev.js"
   },
 (後略)
```

### リンタの設定

TypeScriptのリンティングは普通はTSLintを使う。
けど、すでに[ESLint](https://eslint.org/)を[がっつりセットアップ](https://www.kaitoy.xyz/2018/08/23/creating-react-redux-app-from-scratch-03/#eslint)してしまったのでTSLintに移行するのが面倒。
また、将来的にJavaScriptのコードも混在させるかもしれないので、そのときESLintとTSLintの設定(ルール)を同時にメンテするのは面倒。

[この記事](https://hokaccha.hatenablog.com/entry/2018/01/23/232625)によれば、[typescript-eslint-parser](https://github.com/eslint/typescript-eslint-parser)を使えばそれらの面倒を回避できる。
typescript-eslint-parserはESLintのカスタムパーサで、TypeScriptのコードをESLintでリンティングすることを可能にする。

```sh
$ yarn add -D typescript-eslint-parser
```

typescript-eslint-parserはv21.0.1が入った。
これを使うようにESLintを設定する。

`.eslintrc.js`:
```diff
 module.exports = {
   env: {
     browser: true,
     'jest/globals': true,
   },
+  parser: 'typescript-eslint-parser',
+  parserOptions: {
+    jsx: true,
+    useJSXTextNode: false,
+  },
   extends: ['airbnb', 'prettier'],
   plugins: ['jest'],
+  settings: {
+    'import/resolver': {
+      node: {
+        extensions: ['.js', '.jsx', '.ts', '.tsx'],
+      },
+    },
+  },
+  rules: {
+    'react/jsx-filename-extension': ['error', { extensions: ['.tsx', '.jsx'] }],
+  },
+  overrides: [
+    {
+      files: ['**/*.ts', '**/*.tsx'],
+      rules: {
+        // Set 'no-unused-vars' to off to suppress errors on importing types.
+        // (e.g. error  'FunctionComponent' is defined but never used  no-unused-vars)
+        // Unused vars are checked by TypeScript compiler (at-loader) instead.
+        'no-unused-vars': 'off',
+      },
+    },
+  ],
 };
```

設定のポイントは以下。

* `parser`にtypescript-eslint-parserを指定。
* `parserOptions.jsx`を`true`にするのはtypescript-eslint-parserの[要件](https://github.com/eslint/typescript-eslint-parser#configuration)。
* `parserOptions.useJSXTextNode`を`false`にするのはESLintのv4を使う場合のtypescript-eslint-parserの[要件](https://github.com/eslint/typescript-eslint-parser#configuration)。
* `settings[import/resolver].node.extensions`は、importするモジュールのパス解決の設定。デフォルトではJavaScriptの拡張子しか検索しないので、TypeScriptのモジュールが見つからなくてESLintが「`Unable to resolve path to module './components/App'  import/no-unresolved`」みたいなエラーを吐く。これを防ぐためにTypeScriptの拡張子を追加する。(webpack.common.jsの`resolve.extensions`と同じ拡張子を設定しておく。)
* `rules`では、JSXファイルの拡張子名を制限するルール`react/jsx-filename-extension`を定義している。`extends`している`airbnb`の設定では`.jsx`だけになっているので`.tsx`を追加する意図。
* `overrides`では、宣言だけして使っていない変数をエラーにするルール`no-unused-vars`をTypeScriptに対して無効にしている。型をimportして使うコードを書くとエラーになっちゃうことがあるので。同様のチェックはTypeScriptのコンパイラがしてくれるので問題なし。

<br>

CSS(というか[styled-components](https://github.com/styled-components/styled-components))のリンタの[stylelint](https://github.com/stylelint/stylelint)は[TypeScriptに対応している](https://github.com/styled-components/stylelint-processor-styled-components#setup)のでケアする必要なし。

### JavaScriptをTypeScriptへ書き換える

とりあえず、`src/`以下の全ファイル(`src/__tests__/`以下は除く)について、拡張子を`.js`と`.jsx`から`.ts`と`.tsx`に変える。

型付けについては、[TypeScriptのドキュメント](https://www.typescriptlang.org/docs/handbook/basic-types.html)の他、以下の記事を参考にした。

* [typescript-fsaに頼らないReact × Redux](https://speakerdeck.com/lemon/typescript-fsanilai-ranaireact-x-redux)
* [TypeScript + Reduxはもうぼちぼちサードライブラリに頼らなくてもある程度はいい感じに補完してくれる](https://qiita.com/terrierscript/items/b3f9dd95a4c7afe0b102)
* [react-redux-typescript-guide](https://piotrwitek.github.io/react-redux-typescript-guide/)

#### Reactコンポーネントの型

Function Componentは、propsの型を[interface](https://www.typescriptlang.org/docs/handbook/interfaces.html)で作って、`React.FunctionComponent`で型付ける。
[型エイリアス](https://www.typescriptlang.org/docs/handbook/advanced-types.html#type-aliases)の`type`じゃなくて`interface`を使うのは、[公式が基本はinterfaceを使え](https://www.typescriptlang.org/docs/handbook/advanced-types.html#interfaces-vs-type-aliases)と言ってるので。
因みに`React.FunctionComponent`の代わりに`React.SFC`を使ってるのをよく見るが、それは古い書き方。

例えば[前回](https://www.kaitoy.xyz/2018/11/07/creating-react-redux-app-from-scratch-10/)書いた`MyDialog`は以下のように書ける。

```javascript
import React, { FunctionComponent } from 'react';
import Dialog from '@material-ui/core/Dialog';
import DialogTitle from '@material-ui/core/DialogTitle';
import PropTypes from 'prop-types';

// Props型の定義
interface Props {
  text: string;
  open: boolean;
}

// Function Componentの定義
const MyDialog: FunctionComponent<Props> = ({ text, open }) => (
  <Dialog open={open}>
    <DialogTitle>{text}</DialogTitle>
  </Dialog>
);

MyDialog.propTypes = {
  text: PropTypes.string.isRequired,
  open: PropTypes.bool.isRequired,
};

export default MyDialog;
```

<br>

Container Componentは、Store型を`configureStore.ts`辺りで定義しておいて、それを`connect`するときの`mapStateToProps`で使う。
Storeのプロパティは、Reducerの型付け(後述)のためにそれぞれStateとして型付けしておく。

[以前](https://www.kaitoy.xyz/2018/09/26/creating-react-redux-app-from-scratch-06/#reducer)書いた`state`をStore型として定義すると以下のようになる。

Store型:
```javascript
export interface HogeState {
  clicked: boolean;
}

export interface Store {
  hoge: HogeState;
}
```

これを使うコードは以下。
([以前の記事](https://www.kaitoy.xyz/2018/10/01/creating-react-redux-app-from-scratch-07/#connect-%E3%81%AE%E3%82%B7%E3%83%B3%E3%83%97%E3%83%AB%E3%81%AA%E6%9B%B8%E3%81%8D%E6%96%B9)で書いた`HogeButton`からの差分。)

`src/containers/HogeButton.ts`:
```diff
 import React from 'react';
 import Button from '@material-ui/core/Button';
 import { connect } from 'react-redux';
 import { hogeButtonClicked } from '../actions/actions';
+import { Store } from '../configureStore';

 const HogeButton = connect(
-  ({hoge}) => ({
+  ({hoge}: Store) => ({
     clicked: hoge.clicked
   }),
   {
     onClick: hogeButtonClicked,
   },
 )(Button);

 export default HogeButton;
```

<br>

Class Componentの型付け方法は[typescript-fsaに頼らないReact × Redux](https://speakerdeck.com/lemon/typescript-fsanilai-ranaireact-x-redux?slide=7)の通りでよさそう。
正直あまり考えてない…。
Class Componentはまだ書いてないし、[React Hooks](https://reactjs.org/docs/hooks-intro.html)が出てきて、Class Componentは非推奨になりそうでもあるし。

#### ReduxのActionの型

Actionの型は、`redux`パッケージに基本的な型が定義されているのでそれを拡張して作る。
`redux`パッケージのは`string`の`type`プロパティだけがある型なので、[Flux Standard Action](https://github.com/redux-utilities/flux-standard-action)(FSA)的な形にするために、`error`、`payload`、`meta`の3つのプロパティを[オプショナル](https://www.typescriptlang.org/docs/handbook/advanced-types.html#optional-parameters-and-properties)で追加する。
`error`は`boolean`で、`payload`と`meta`は[ジェネリクス](https://www.typescriptlang.org/docs/handbook/generics.html)で型を指定する。

このAction型から、`type`、`payload`、`meta`の型を指定した型エイリアスを作ったり、[extends](https://www.typescriptlang.org/docs/handbook/interfaces.html#extending-interfaces)したりして、個々のActionごとに具体的な型を作る。
`type`プロパティは、[文字列リテラル型](https://www.typescriptlang.org/docs/handbook/advanced-types.html#string-literal-types)としてAction Typeで型付ける。

例えば、[以前](https://www.kaitoy.xyz/2018/10/07/creating-react-redux-app-from-scratch-08/#rest-api%E5%91%BC%E3%81%B3%E5%87%BA%E3%81%97%E3%82%92%E8%A1%A8%E7%8F%BE%E3%81%99%E3%82%8Baction)書いたAction Creatorは以下のように型付ける。

`src/actions/actions.ts`:
```diff
+import Redux from 'redux';

 import {
   HOGE_BUTTON_CLICKED,
   HOGE_FETCH_SUCCEEDED,
   HOGE_FETCH_FAILED,
 } from './actionTypes';

+// Action型の定義。
+export interface HogeAction<Type, Payload = undefined, Meta = undefined>
+  extends Redux.Action<Type> {
+  error?: boolean;
+  payload?: Payload;
+  meta?: Meta;
+}

+// 型エイリアスによるAction型の具体化。
+// 「typeof HOGE_BUTTON_CLICKED」で文字列リテラル型を指定している。
+export type HogeButtonClicked = HogeAction<typeof HOGE_BUTTON_CLICKED>;
-export function hogeButtonClicked() {
+export function hogeButtonClicked(): HogeButtonClicked {
   return {
     type: HOGE_BUTTON_CLICKED,
   };
 }

+// payloadの型の定義。
+interface HogeFetchSucceededPayload {
+  hoge: string;
+}
+// インターフェースによるAction型の具体化。payloadプロパティを必須化している。
+export interface HogeFetchSucceeded
+  extends HogeAction<typeof HOGE_FETCH_SUCCEEDED, HogeFetchSucceededPayload, Object> {
+  payload: HogeFetchSucceededPayload;
+}
-export function hogeFetchSucceeded(payload, meta) {
+export function hogeFetchSucceeded(
+  payload: HogeFetchSucceededPayload,
+  meta: Object,
+): HogeFetchSucceeded {
   return {
     type: HOGE_FETCH_SUCCEEDED,
     payload,
     meta,
   };
 }

+export type HogeFetchFailed = HogeAction<typeof HOGE_FETCH_FAILED, Object>;
-export function hogeFetchFailed(payload) {
+export function hogeFetchFailed(payload: Object): HogeFetchFailed {
   return {
     type: HOGE_FETCH_FAILED,
     error: true,
     payload,
   };
 }
```

#### ReduxのReducerの型

Reducerの型は`redux`パッケージの`Reducer`型を使う。
この`Reducer`型がジェネリクスで、引数の`state`と`action`の型を受けるので、すでに定義したState型と具体Action型をimportして渡す。

例えば、[以前](https://www.kaitoy.xyz/2018/09/26/creating-react-redux-app-from-scratch-06/#reducer)書いたReducerは以下のように型付ける。

`src/reducers/reducers.ts`:
```diff
+import { Reducer } from 'redux';
+import { HogeState } from '../configureStore';
 import { HOGE_BUTTON_CLICKED } from '../actions/actionTypes';
+import { HogeButtonClicked } from '../actions/actions';

-export const hoge = (state = { clicked: false }, action) => {
+export const hoge: Reducer<HogeState, HogeButtonClicked> = (
+  state = { clicked: false },
+  action,
+) => {
   switch (action.type) {
     case HOGE_BUTTON_CLICKED:
       const newHoge = {
         clicked: true,
       };
       return Object.assign({}, state, newHoge);
     default:
       return state;
   }
 }
```

#### スクリプト以外をimportするコードを修正

JavaScriptやTypeScript以外のファイルをimportするコードを書くと、コンパイル時にエラーになる。

今まで書いた中で該当するのは`src/fonts.ts`でフォントファイルをimportしている箇所で、「`TS2307: Cannot find module '../node_modules/typeface-roboto/files/roboto-lat
in-300.woff'.`」といったエラーが出る。

原因は[webpackでロードすべきものをtscでロードしちゃってる](https://stackoverflow.com/questions/36148639/webpack-not-able-to-import-images-using-express-and-angular2-in-typescript)から。
フォントファイルはwebpack(のfile-loader)でロードすべき。

解決策は、`import`文はtscが処理しちゃうので、代わりに`require`関数を使うこと。

`src/fonts.ts`:
```diff
 import { createGlobalStyle } from 'styled-components';
-import roboto300 from '../node_modules/typeface-roboto/files/roboto-latin-300.woff';
+const roboto300 = require('../node_modules/typeface-roboto/files/roboto-latin-300.woff');

 const Fonts = createGlobalStyle`
   /* roboto-300normal - latin */
   @font-face {
     font-family: 'Roboto';
     font-style: normal;
     font-display: swap;
     font-weight: 300;
     src:
       local('Roboto Light'),
       local('Roboto-Light'),
       url('${roboto300}') format('woff');
   }
 `;

 export default Fonts;
```

これだけ。

### Jestの設定

Jestを実行するときはwebpackを介さないので、別途TypeScript対応する必要がある。
純粋なTypeScriptプロジェクトでは普通[ts-jest
](https://kulshekhar.github.io/ts-jest/)を使うみたいだけど、[前回](https://www.kaitoy.xyz/2018/11/07/creating-react-redux-app-from-scratch-10/)入れた[babel-jest](https://www.npmjs.com/package/babel-jest)で事足りるようなのでこっちを使う。

babel-jestは、Jest実行時にテストコードと関連モジュールをBabelで処理してピュアなJavaScriptにしてくれるやつ。
TypeScriptをBabelで処理できるようにするには、[@babel/preset-typescript](https://babeljs.io/docs/en/babel-preset-typescript)を入れておく必要がある。

```sh
$ yarn add -D @babel/preset-typescript
```

`.babelrc`:
```diff
 {
   "presets": [
     [
       "@babel/preset-env",
       {
         "useBuiltIns": "usage"
       }
     ],
+    "@babel/preset-typescript",
     "@babel/preset-react"
   ],
   "plugins": ["styled-components", "@babel/plugin-syntax-dynamic-import"]
 }
```

<br>

で、jest.config.jsを二か所いじる。

一つは、JestがTypeScriptの拡張子を認識するように、`moduleFileExtensions`に`ts`と`tsx`を追加する。
もう一つは、Jestがbabel-jestを呼び出すように、`transform`にパターンを追加する。

`jest.config.js`:
```diff
 // For a detailed explanation regarding each configuration property, visit:
 // https://jestjs.io/docs/en/configuration.html

 module.exports = {
   // All imported modules in your tests should be mocked automatically
   // automock: false,

   // Stop running tests after the first failure
   // bail: false,

   // Respect "browser" field in package.json when resolving modules
   // browser: false,

   // The directory where Jest should store its cached dependency information
   // cacheDirectory: "C:\\Users\\kaitoy\\AppData\\Local\\Temp\\jest",

   // Automatically clear mock calls and instances between every test
   // clearMocks: false,

   // Indicates whether the coverage information should be collected while executing the test
   // collectCoverage: false,

   // An array of glob patterns indicating a set of files for which coverage information should be collected
   // collectCoverageFrom: null,

   // The directory where Jest should output its coverage files
   coverageDirectory: 'coverage',

   // An array of regexp pattern strings used to skip coverage collection
   // coveragePathIgnorePatterns: [
   //   "\\\\node_modules\\\\"
   // ],

   // A list of reporter names that Jest uses when writing coverage reports
   // coverageReporters: [
   //   "json",
   //   "text",
   //   "lcov",
   //   "clover"
   // ],

   // An object that configures minimum threshold enforcement for coverage results
   // coverageThreshold: null,

   // Make calling deprecated APIs throw helpful error messages
   // errorOnDeprecated: false,

   // Force coverage collection from ignored files usin a array of glob patterns
   // forceCoverageMatch: [],

   // A path to a module which exports an async function that is triggered once before all test suites
   // globalSetup: null,

   // A path to a module which exports an async function that is triggered once after all test suites
   // globalTeardown: null,

   // A set of global variables that need to be available in all test environments
   // globals: {},

   // An array of directory names to be searched recursively up from the requiring module's location
   // moduleDirectories: [
   //   "node_modules"
   // ],

   // An array of file extensions your modules use
-  // moduleFileExtensions: [
-  //   "js",
-  //   "json",
-  //   "jsx",
-  //   "node"
-  // ],
+  moduleFileExtensions: [
+    "ts",
+    "tsx",
+    "js",
+    "json",
+    "jsx",
+    "node"
+  ],

   // A map from regular expressions to module names that allow to stub out resources with a single module
   // moduleNameMapper: {},

   // An array of regexp pattern strings, matched against all module paths before considered 'visible' to the module loader
   // modulePathIgnorePatterns: [],

   // Activates notifications for test results
   // notify: false,

   // An enum that specifies notification mode. Requires { notify: true }
   // notifyMode: "always",

   // A preset that is used as a base for Jest's configuration
   // preset: null,

   // Run tests from one or more projects
   // projects: null,

   // Use this configuration option to add custom reporters to Jest
   // reporters: undefined,

   // Automatically reset mock state between every test
   // resetMocks: false,

   // Reset the module registry before running each individual test
   // resetModules: false,

   // A path to a custom resolver
   // resolver: null,

   // Automatically restore mock state between every test
   // restoreMocks: false,

   // The root directory that Jest should scan for tests and modules within
   // rootDir: null,

   // A list of paths to directories that Jest should use to search for files in
   // roots: [
   //   "<rootDir>"
   // ],

   // Allows you to use a custom runner instead of Jest's default test runner
   // runner: "jest-runner",

   // The paths to modules that run some code to configure or set up the testing environment before each test
   // setupFiles: [],

   // The path to a module that runs some code to configure or set up the testing framework before each test
   // setupTestFrameworkScriptFile: null,

   // A list of paths to snapshot serializer modules Jest should use for snapshot testing
   // snapshotSerializers: [],

   // The test environment that will be used for testing
   // testEnvironment: "jest-environment-jsdom",

   // Options that will be passed to the testEnvironment
   // testEnvironmentOptions: {},

   // Adds a location field to test results
   // testLocationInResults: false,

   // The glob patterns Jest uses to detect test files
   // testMatch: [
   //   "**/__tests__/**/*.js?(x)",
   //   "**/?(*.)+(spec|test).js?(x)"
   // ],

   // An array of regexp pattern strings that are matched against all test paths, matched tests are skipped
   // testPathIgnorePatterns: [
   //   "\\\\node_modules\\\\"
   // ],

   // The regexp pattern Jest uses to detect test files
   // testRegex: "",

   // This option allows the use of a custom results processor
   // testResultsProcessor: null,

   // This option allows use of a custom test runner
   // testRunner: "jasmine2",

   // This option sets the URL for the jsdom environment. It is reflected in properties such as location.href
   testURL: 'http://localhost/',

   // Setting this value to "fake" allows the use of fake timers for functions such as "setTimeout"
   // timers: "real",

   // A map from regular expressions to paths to transformers
-  // transform: null,
+  transform: {
+    '^.+\\.jsx?$': 'babel-jest',
+    '^.+\\.tsx?$': 'babel-jest',
+  },

   // An array of regexp pattern strings that are matched against all source file paths, matched files will skip transformation
   // transformIgnorePatterns: [
   //   "\\\\node_modules\\\\"
   // ],

   // An array of regexp pattern strings that are matched against all modules before the module loader will automatically return a mock for them
   // unmockedModulePathPatterns: undefined,

   // Indicates whether each individual test should be reported during the run
   // verbose: null,

   // An array of regexp patterns that are matched against all source file paths before re-running tests in watch mode
   // watchPathIgnorePatterns: [],

   // Whether to use watchman for file crawling
   // watchman: true,
 };
```

<br>

以上でTypeScriptへの移行完了。
