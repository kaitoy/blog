+++
categories = ["Programming"]
date = "2020-04-26T08:39:14+09:00"
draft = false
cover = "react.png"
slug = "update-react-redux-scaffold-2020-01"
tags = ["react", "frontend", "webpack", "babel", "eslint", "prettier", "styled-components", "material-ui", "redux", "redux-saga", "react-router", "jest", "react-testing-library", "typescript"]
title = "React + Reduxアプリケーションプロジェクトのテンプレートを2020年版にアップデート ― その1: ライブラリ等の更新"
highlight = true
highlightStyle = "monokai"
highlightLanguages = []
+++

最近また仕事がフロントエンドを触るような雰囲気になって来たので、[2018年後半](https://www.kaitoy.xyz/2018/11/26/creating-react-redux-app-from-scratch-11/)にスクラッチから作った[ReactとReduxのプロジェクトテンプレート](https://github.com/kaitoy/react-redux-scaffold)を2020年版として色々アップデートした。

以前のより比較的ちゃんとした感じのアプリを作って、ライブラリ構成だけじゃなくてプロジェクト構成も検討を深めたので、それらについていくつかの記事に書いていきたい。
まずはライブラリとかのアップデート内容をまとめる。

<!--more-->

{{< google-adsense >}}

# Node
[Node](https://nodejs.org/ja/)は、以前プロジェクトテンプレートを作っていた時、最新のLTS版のv8.11.4を使っていたけど、これがもう2019年末にサポート切れになっていた。
ので、今の最新LTS版であるv12.15.0に入れ替えた。
[これで2022年4月までもつ](https://nodejs.org/en/about/releases/)。

同梱されているnpmはv5.6.0からv6.13.4に上がった。

(c.f. https://www.kaitoy.xyz/2018/08/19/creating-react-redux-app-from-scratch-01/#node-js%E3%82%A4%E3%83%B3%E3%82%B9%E3%83%88%E3%83%BC%E3%83%AB)

# Yarn
パッケージマネージについては、以前使っていた[Yarn](https://classic.yarnpkg.com/ja/)は[v2が2020年1月](https://dev.to/arcanis/introducing-yarn-2-4eh1)にリリースされて、node_modulesが無くなるなどnpmとの互換性を捨てて独自なパッケージマネージャを目指し始めたのがちょっと微妙な感じ。

npmがNode標準のパッケージマネージャなわけだし、かつてYarn v1が解決しようとしたnpmの問題(パッケージバージョンのロックの仕様が微妙とか、パッケージインストールが遅いとか)は[npmのバージョンアップによって解消された](https://developers.freee.co.jp/entry/sayonara-yarn)ようでもあるので、Yarnを捨ててnpmを使うことにする。

(c.f. https://www.kaitoy.xyz/2018/08/19/creating-react-redux-app-from-scratch-01/#yarn%E3%82%A4%E3%83%B3%E3%82%B9%E3%83%88%E3%83%BC%E3%83%AB)

# Babel
[Babel](https://babeljs.io/)はマイナーバージョンアップして、v7.1.6から最新のv7.8.4にした。
きっとECMAScriptの新しい文法に対応したり、性能向上したりしてる。

Babelの設定ファイルは以前はJSONで`.babelrc`に書いてたのを、JavaScriptで`babel.config.js`に書き直した。
[JSONは書き辛いので](https://monmon.hatenablog.com/entry/2013/12/20/151321)。
(前からJavaScriptで書けたっけ?)

(c.f. https://www.kaitoy.xyz/2018/08/19/creating-react-redux-app-from-scratch-01/#babel)

# Polyfill
[Babel v7.4.0で@babel/polyfillが非推奨になった](https://aloerina01.github.io/blog/2019-06-21-1)ので、[@babel/polyfill](https://babeljs.io/docs/en/babel-polyfill)はアンインストールして、代わりに[core-js](https://github.com/zloirock/core-js) v3を使う。

```cmd
npm uninstall -S @babel/polyfill
npm install -S core-js@3
```

`babel.config.js`:
```diff
 module.exports = {
   presets: [
     [
       '@babel/preset-env',
       {
         useBuiltIns: 'usage',
+        corejs: 3,
       },
     ],
     '@babel/preset-react',
     '@babel/preset-typescript',
   ],
   plugins: ["babel-plugin-styled-components", "@babel/plugin-syntax-dynamic-import"],
 };
```

`core-js`は`@babel/polyfill`が依存して使っていたというかほぼ本体だったもの。
(因みにcore-jsは個人によるプロジェクトで、その個人が[人身事故で捕まってしまったので](https://www.theregister.co.uk/2020/03/26/corejs_maintainer_jailed_code_release/)、存続が危惧されている。代わりがないので使うしかないけど。)

(c.f. https://www.kaitoy.xyz/2018/08/19/creating-react-redux-app-from-scratch-01/#polyfill)

# webpack
[webpack](https://webpack.js.org/)はv4.16.0から最新のv4.41.6にマイナーバージョンアップしただけ。

特に破壊的な変更はなかったはず。

(c.f. https://www.kaitoy.xyz/2018/08/19/creating-react-redux-app-from-scratch-01/#webpack)

# React
[React](https://ja.reactjs.org/)はv16.6.3から最新のv16.12.0へ。
v16.8で[Hooks](https://ja.reactjs.org/docs/hooks-intro.html)がGAになったので、その機能やエコシステムが使えるようになるけど、破壊的変更はなかったはず。

[PropTypes](https://ja.reactjs.org/docs/typechecking-with-proptypes.html)は頑張って使ってたけど、[TypeScript](https://www.typescriptlang.org/)と二重に型チェックするの面倒になったので廃止した。

```cmd
npm uninstall -S @prop-types
```

ESLintのルールに[Airbnbのやつ](https://github.com/airbnb/javascript/tree/master/packages/eslint-config-airbnb)使ってるとPropTypesの型定義が無いと怒られるので、無効にしておく。

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
+        'react/prop-types': 'off',
       },
     },
   ],
 };
```

(c.f. https://www.kaitoy.xyz/2018/08/22/creating-react-redux-app-from-scratch-02/)

<br>

さらに、Reactコンポーネントのデザインシステムとして[Atomicデザイン](https://bradfrost.com/blog/post/atomic-web-design/)を取り入れた。
それについてはまた別の記事で書く。

# Prettier
[Prettier](https://prettier.io/)はメジャーバージョンアップがあってv1.14.0から2.0.2へ。

`endOfLine`オプションがデフォルトで`lf`になって、Linuxスタイルの改行コードになった。
(前はたしか`auto`だったはず。)

また、`arrowParens`オプションのデフォルトが`avoid`から`always`に変わって、アロー関数の仮引数が一つの場合でも括弧を省略しなくなった。
(この変更の理由は、括弧が付いていたほうが型アノテーションの付与や仮引数の追加が簡単だから。)

PrettierとESLintがけんかしないようにするための設定も変わっていたので、[公式マニュアル](https://prettier.io/docs/en/integrating-with-linters.html#recommended-configuration)に従って変更する。

まず[eslint-config-prettier](https://github.com/prettier/eslint-config-prettier)をv2.9.0から最新版のv6.10.0にアップデート。
で、[eslint-plugin-prettier](https://github.com/prettier/eslint-plugin-prettier)を追加。

`.eslintrc.js`:
```diff
(snip)
-  extends: ['airbnb', 'prettier'],
+  extends: ['airbnb', 'plugin:prettier/recommended', 'prettier/react'],
(snip)
```

(c.f. https://www.kaitoy.xyz/2018/08/23/creating-react-redux-app-from-scratch-03/#prettier)

# ESLint
[eslint-config-airbnb](https://github.com/airbnb/javascript/tree/master/packages/eslint-config-airbnb)をv17.0.0から最新のv18.0.1にバージョンアップ。
[ESLint](https://eslint.org/)のピア依存がアップデートされるので、ESLintをv4.19.1から最新のv6.8.0にアップデートできる。
また、[eslint-plugin-react-hooks](https://github.com/facebook/react/tree/master/packages/eslint-plugin-react-hooks)がピア依存に追加されているので、これを`npm install --save-dev`したうえで、`.eslintrc.js`をまた修正する。

`.eslintrc.js`:
```diff
(snip)
-  extends: ['airbnb', 'plugin:prettier/recommended', 'prettier/react'],
+  extends: ['airbnb', 'airbnb/hooks', 'plugin:prettier/recommended', 'prettier/react'],
(snip)
```

これでReact Hooks周りのリンティングが有効になる。

(c.f. https://www.kaitoy.xyz/2018/08/23/creating-react-redux-app-from-scratch-03/#eslint)

# styled-components
[styled-components](https://styled-components.com/)はv4.1.1からv5.0.1にメジャーバージョンアップ。
けど破壊的変更はなし。
[stylelint](https://stylelint.io/)もv9.3.0からv13.2.0に大きくバージョンアップ。
しかし特に使い方は変わらず。

(c.f. https://www.kaitoy.xyz/2018/08/29/creating-react-redux-app-from-scratch-04/#css-in-js)

# Material-UI
[Material-UI](https://material-ui.com/)はv3.5.1からv4.9.2にアップ。
破壊的変更はなし。

ついでにMaterial-UIのアイコンセットである[@material-ui/icons](https://material-ui.com/components/material-icons/)のv4.9.1と、Material-UIプロジェクト推奨のDate/Time Pickerである[@material-ui/pickers](https://material-ui-pickers.dev/)のv3.2.10を追加。

```cmd
npm install -S @material-ui/icons @material-ui/pickers
```

(c.f. https://www.kaitoy.xyz/2018/09/06/creating-react-redux-app-from-scratch-05/)

# Redux
[Redux](https://redux.js.org/)自体はパッチバージョンアップv4.0.5になっただけ。

(c.f. https://www.kaitoy.xyz/2018/09/26/creating-react-redux-app-from-scratch-06/)

ただ、Redux周りのファイル構成を[Railsスタイル](https://github.com/reduxjs/redux/blob/v4.0.5/docs/faq/CodeStructure.md)から[re-ducksスタイル](https://github.com/alexnm/re-ducks)に変えたので、それについては別の記事に書く。

# React Redux
[React Redux](https://react-redux.js.org/)はv5.0.7からv7.1.3にメジャーバージョンアップして、React Hooksに対応。
Presentational Components と Container Componentsという考え方は変わらないし、従来の`connect()`も一応変わらず使えるけど、新しいAPIである`useSelector()`や`useDispatch()`を使うと、よりきれいに書けたりロジックの再利用がしやすくなったりする。
詳しくは別記事で書く。

また、この機に[reselect](https://github.com/reduxjs/reselect)と[immer](https://immerjs.github.io/immer/docs/introduction)と[normalizr](https://github.com/paularmstrong/normalizr)を追加。

```cmd
npm install -S reselect immer normalizr
```

それぞれv4.0.0、v5.3.6、v3.6.0。

reselectはReact Reduxの`connect()`や`useSelector()`でステートを取得して加工してContainer Componentsに渡すときに、加工の処理をメモ化して性能向上してくれるやつ。

immerは不変オブジェクトを使えるようにしてくれるやつで、Reduxのステートとか直接いじっちゃだめなやつを扱いやすくするために使える。
同じようなのでは[Immutable.js](https://immutable-js.github.io/immutable-js/)が有名だけど、immerはそれよりかなり使いやすく、[Redux Toolkit](https://redux-toolkit.js.org/)で採用されている有力ライブラリ。

normalizrはREST APIとかで取得したネストしたデータ構造を正規化したりもとに戻したりするツールで、Reduxのマニュアルでも[紹介されている](https://redux.js.org/recipes/structuring-reducers/normalizing-state-shape#normalizing-nested-data)。
Reduxのマニュアルに乗っている[ステート構造パターン](https://redux.js.org/recipes/structuring-reducers/normalizing-state-shape#organizing-normalized-data-in-state)を実現するのに役立つ。
要はリレーショナルなデータをJOINした状態で取得したのを正規化してStoreに保存しておいて、使うときにはまたJOINしたりしなかったりするイメージ。

以上の変更によってReduxによる状態管理がどう変わるかは別の記事で書く。

(c.f. https://www.kaitoy.xyz/2018/10/01/creating-react-redux-app-from-scratch-07/#presentational-components-%E3%81%A8-container-components)

# Redux Saga
[Redux Saga](https://redux-saga.js.org/)はv0.16.0だったのがv1.1.3にメジャーバージョンアップ。

v1に変わる際に多くの[破壊的変更があった](https://github.com/redux-saga/redux-saga/blob/v1.1.3/CHANGELOG.md#changes-from-v0160-to-v100)けど、プロジェクトテンプレートには影響なかった。

(c.f. https://www.kaitoy.xyz/2018/10/07/creating-react-redux-app-from-scratch-08/#%E9%9D%9E%E5%90%8C%E6%9C%9F%E5%87%A6%E7%90%86)

# React Router
[React Router](https://reacttraining.com/react-router/)はv4.3.1からv5.1.2にメジャーバージョンアップ。
React Routerはバージョンアップで結構ドラスティックな変更をしてくることで有名で、今回もReact Hooks対応やもうすぐ出そうなv6への段階的移行のために[色々変更があった](https://github.com/ReactTraining/react-router/blob/v6.0.0-alpha.3/docs/advanced-guides/migrating-5-to-6.md)。
(v4からv5はほとんど変更ないけど、v5からv5.1に変更が多い。)

v4からv5.1に上げるときに留意したのは以下:

* ルーティング先のコンポーネントを`<Route component={Home}>`のようにPropsで渡す書き方から、`<Route><Home /></ Route>`のようにchildrenとして渡すようになった。
    - 以前の書き方はv6でもサポートされるみたいだけど非推奨になる。
    - 新しい書き方の方が見やすいし、ルーティング先のコンポーネントにpropsを渡しやすいので全部書き換えるべし。
* matchオブジェクトとかhistoryオブジェクトとかにアクセスするのに`withRouter`でHOCにするのは非推奨になり、代わりに[useRouteMatchとかuseHistoryとかのHooks](https://reacttraining.com/react-router/web/api/Hooks)が使えるようになった。
* `<Route>`は必ず`<Switch>`のなかに入れないといけなくなった。
    - `<Switch>`はv6で`<Routes>`に変わる。

<br>

また、以前は[Connected React Router](https://github.com/supasate/connected-react-router)を使っていたけど、使うのをやめた。
Connected React RouterはReduxのStoreでルーティング状態を管理できるようにするものだけど、それが[React Routerのマニュアルで非推奨になっている](https://reacttraining.com/react-router/web/guides/redux-integration/deep-integration)ので。

```cmd
npm uninstall -S connected-react-router history
```

`src/reducers/rootReducer.js`:
```diff
 import { combineReducers } from 'redux';
-import { connectRouter } from 'connected-react-router';
 import * as reducers from './reducers';

-const createRootReducer = (history) =>
- combineReducers({
- router: connectRouter(history),
- ...reducers,
- });
-export default createRootReducer;
-const rootReducer = combineReducers(reducers);
-export default rootReducer;
+const rootReducer = combineReducers(reducers);
+export default rootReducer;
```

`src/configureStore.js`:
```diff
 import { createStore, applyMiddleware } from 'redux';
 import createSagaMiddleware from 'redux-saga';
-import { createBrowserHistory } from 'history';
-import { routerMiddleware } from 'connected-react-router';
 import { logger } from 'redux-logger';
 import rootSaga from './sagas/rootSaga';
-import createRootReducer from './reducers/rootReducer';
+import rootReducer from './reducers/rootReducer';

 const sagaMiddleware = createSagaMiddleware();
-export const history = createBrowserHistory();

 export default function configureStore(initialState = {}) {
   const middlewares = [];
   if (process.env.NODE_ENV === `development`) {
     middlewares.push(logger);
   }
-  middlewares.push(routerMiddleware(history));
   middlewares.push(sagaMiddleware);

   const store = createStore(
-    createRootReducer(history),
+    rootReducer,
     initialState,
     applyMiddleware(...middlewares),
   );
   sagaMiddleware.run(rootSaga);
   return store;
 }
```

`src/index.jsx`:
```diff
 import React from 'react';
 import ReactDOM from 'react-dom';
 import { Provider } from 'react-redux';
-import { ConnectedRouter } from 'connected-react-router';
 import App from './components/App';
-import configureStore, { history } from './configureStore';
+import configureStore from './configureStore';

 const store = configureStore();
 const root = document.getElementById('root');

 if (root) {
   ReactDOM.render(
     <Provider store={store}>
-      <ConnectedRouter history={history}>
-        <App />
-      </ConnectedRouter>
+      <App />
     </Provider>,
     root,
   );
 }
```

Connected React Routerは主にStoreへのActionのディスパッチに応じてプログラマブルにURL変更したいときに使うんだと思うけど、そのユースケースならConnected React Routerを使わなくてもhistoryオブジェクトをActionに入れておけばできる。
そもそも、StoreではUIやアプリケーションの状態を管理すべきで、URLの管理はViewの責務にすべきな気がする。
Viewの方でもURLやルーティングを気にするコンポーネントは区別しておいて、とくにPresentational Componentsとは切り離しておくと、再利用性や可読性やテスタビリティが保ててよさそう。

この辺りも、Atomicデザインの話とともに別記事で書きたい。

(c.f. https://www.kaitoy.xyz/2018/11/02/creating-react-redux-app-from-scratch-09/#react-router)

# JestとReact Testing Library
[Jest](https://jestjs.io/ja/)はv24.0.0からv25.5.4にメジャーバージョンアップ。

以前はReactコンポーネントのテスト用に[Enzyme](https://airbnb.io/enzyme/)を使ってたけど、[React Testing Library](https://testing-library.com/docs/react-testing-library/intro)に乗り換えた。
React Testing Libraryの方が[Reactマニュアルで推されている](https://ja.reactjs.org/docs/testing.html)し、より[ユーザ視点のテストや設計を促進する](https://medium.com/@boyney123/my-experience-moving-from-enzyme-to-react-testing-library-5ac65d992ce)らしいので。

```cmd
npm uninstall -D react-test-renderer enzyme enzyme-adapter-react-16
npm install -D @testing-library/react
```

同じTesting Libraryシリーズである[jest-dom](https://testing-library.com/docs/ecosystem-jest-dom)と[user-event](https://testing-library.com/docs/ecosystem-user-event)も合わせていれる。
前者はDOMの属性や状態に対するJestのmatcherを提供するもので、後者はクリックやタイプインといったユーザイベントをエミュレートできるライブラリ。

```cmd
npm install -D @testing-library/jest-dom @testing-library/user-event
```

さらに、[axios](https://github.com/axios/axios)のモックユーティリティである[axios-mock-adapter](https://github.com/ctimmerm/axios-mock-adapter)と、styled-componentsで作ったコンポーネントの(主にスナップショット)テストをしやすくしてくれる[jest-styled-components](https://github.com/styled-components/jest-styled-components)も入れておく。

```cmd
npm install -D axios-mock-adapter jest-styled-components
```

`@testing-library/jest-dom`と`jest-styled-components`によるJestのmatcherの拡張はモジュールのimportによって有効になるが、各specファイルにそれを書くのも面倒だし忘れるので、`setupFilesAfterEnv`を設定してテスト実行前に常にimportされるようにしておく。

`jest.config.js`:
```diff
 // For a detailed explanation regarding each configuration property, visit:
 // https://jestjs.io/docs/en/configuration.html

 module.exports = {
 (snip)

   // The path to a module that runs some code to configure or set up the testing framework before each test
-  // setupFilesAfterEnv: null,
+  setupFilesAfterEnv: ['<rootDir>/src/setupJestTests.ts'],

 (snip)
```

`src/setupJestTests.ts`:
```javascript
import '@testing-library/jest-dom/extend-expect';
import 'jest-styled-components';
```

(c.f. https://www.kaitoy.xyz/2018/11/07/creating-react-redux-app-from-scratch-10/)

# TypeScript
[TypeScript](https://www.typescriptlang.org/)はv3.1.6からv3.7.5へマイナーバージョンアップ。
破壊的変更はなし。

webpackでTypeScriptをロードするために使っていた[awesome-typescript-loader](https://github.com/s-panferov/awesome-typescript-loader)の[開発が止まって](https://qiita.com/__sakito__/items/56510d2ab15f87311b36)、[TypeScriptのマニュアル]((https://www.typescriptlang.org/docs/handbook/react-&-webpack.html))で紹介されているローダもawesome-typescript-loaderから[ts-loader](https://www.npmjs.com/package/ts-loader)に変わったので、ts-loaderに乗り換えた。

```cmd
npm uninstall -D awesome-typescript-loader
npm install -D ts-loader source-map-loader
```

`tsconfig.json`:
```diff
 {
   "compilerOptions": {
 (snip)
   },
-  "files": ["src/index.tsx"],
-  "awesomeTypescriptLoaderOptions": {
-    "useCache": true,
-    "reportFiles": ["src/**/*.{ts,tsx}"],
-    "forceIsolatedModules": true
-  }
+  "files": ["src/index.tsx"]
 }
```

`webpack.common.js`:
```diff
 const path = require('path');
-const { CheckerPlugin } = require('awesome-typescript-loader');
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
+      {
+        test: /\.js$/,
+        enforce: 'pre',
+        loader: 'source-map-loader',
+      },
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
       {
         test: /\.(ts|tsx)$/,
         include: [path.resolve(__dirname, 'src')],
-        loader: 'awesome-typescript-loader',
+        loader: 'ts-loader',
       },
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
-  plugins: [
-    new CheckerPlugin(),
-  ],
 };
```

(c.f. https://www.kaitoy.xyz/2018/11/26/creating-react-redux-app-from-scratch-11/)

<br>

ReduxのActionとかの型の付け方も見直したので、また別の記事に書きたい。
