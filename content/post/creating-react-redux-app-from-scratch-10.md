+++
categories = ["Programming"]
date = "2018-11-07T23:41:30+09:00"
draft = false
cover = "flow-jest-enzyme.png"
slug = "creating-react-redux-app-from-scratch-10"
tags = ["react", "frontend", "flow", "jest", "enzyme"]
title = "React + Reduxアプリケーションプロジェクトのテンプレートを作る ― その10: Code Splitting、Flow、Jest、Enzyme"

+++

[React](https://reactjs.org/)と[Redux](https://redux.js.org/)を学ぶために、開発環境というかプロジェクトテンプレートをスクラッチから作っている。
(最終的な成果は[GitHub](https://github.com/kaitoy/react-redux-scaffold)に置いた。)

[前回](https://www.kaitoy.xyz/2018/11/02/creating-react-redux-app-from-scratch-09/)は[React Router](https://reacttraining.com/react-router/)をセットアップした。

今回は残りの要素をまとめてかたづける。

(2018/11/21更新)

{{< google-adsense >}}

# Code Splitting

webpackでリソースをバンドルすると、一回の通信でアプリの要素全てをロードできるので効率いいような気がするけど、アプリの規模が大きくなってくるとバンドルサイズが大きくなって、初期ロード時間が長くなり、つまり初期画面の表示に時間がかかるようになってしまう。
そもそも、いつもアプリの全画面をみるとは限らないので、いつもアプリの全要素をロードするのは無駄。

そんな問題に対応する技術が[Code Splitting](https://webpack.js.org/guides/code-splitting/)。
バンドルを分割し、(理想的には)必要な時に必要な分だけロードする技術。

Code Splittingのやりかたはいくつかあるが、[ダイナミックインポート](https://reactjs.org/docs/code-splitting.html#import)と[React.lazy](https://reactjs.org/docs/code-splitting.html#reactlazy)と[React Suspense](https://reactjs.org/docs/code-splitting.html#suspense)とwebpackの[プリフェッチディレクティブ](https://webpack.js.org/guides/code-splitting/#prefetching-preloading-modules)を使ったやつを、フォントモジュールに適用してみる。

`src/components/App.jsx`:
```diff
-import React from 'react';
+import React, { Suspense } from 'react';
 import { Route, Redirect } from 'react-router-dom';
 import Home from './Home';
-import Fonts from '../fonts';

+const Fonts = React.lazy(() => import(/* webpackPrefetch: true */ '../fonts'));

 const App = () => (
   <div>
     <Route exact path="/" render={() => <Redirect to="/home" />} />
     <Route exact path="/home" component={Home} />
-    <Fonts />
+    <Suspense fallback={<div />}>
+      <Fonts />
+    </Suspense>
   </div>
 );

 export default App;
```

コード変更はこれだけ。

`import()`がダイナミックインポートで、[ECMAScriptで現在策定中](https://github.com/tc39/proposal-dynamic-import)の機能。
これを使えるようにするためには、Babelのプラグインを追加する必要がある。

```shell
yarn add -D @babel/plugin-syntax-dynamic-import
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
     "@babel/preset-react"
   ],
-  "plugins": ["styled-components"]
+  "plugins": ["styled-components", "@babel/plugin-syntax-dynamic-import"]
 }
```

ダイナミックインポートの設定も完了。
これでフォントモジュールはメインのバンドルとは別ファイルになり、初期画面の表示時にはロードされず、ブラウザの空き時間に非同期にロードされるようになる。

<br>

# Flow

Reactに限らない話だけど、JavaScriptは動的型付け言語なので、特に規模が大き目なアプリを開発するとなると保守性が悪くなりがちで辛い。
ので、できれば静的型付けでやりたい。

JavaScriptを静的型付けにするには、[TypeScript](https://www.typescriptlang.org/)と[Flow](https://flow.org/)という二つの選択肢がある。
今回、FlowがReactと同じくFacebook製なので、Reactと相性がいいかと思ってFlowを選択したけど、人気やエコシステムの充実度から見るとTypeScriptのほうがよかった気がする。
ので、Flowについてはさらっと書く。

## Flow導入

Flowは、ソースに型情報を付けて静的型チェック可能にしつつ、実行時には型情報を取り去って普通のJavaScriptとして実行できるようにする仕組み。

型チェックするツールは[flow-bin](https://www.npmjs.com/package/flow-bin)パッケージで配布されていて、型情報の除去は[@babel/preset-flow](https://www.npmjs.com/package/babel-preset-flow)を使ってBabelでできる。

```shell
yarn add -D flow-bin @babel/preset-flow
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
+    "@babel/preset-flow",
     "@babel/preset-react"
   ],
   "plugins": ["styled-components", "@babel/plugin-syntax-dynamic-import"]
 }
```

これで、`yarn flow`でFlowを実行できるようになった。

```shell
$ yarn flow version
yarn run v1.7.0
$ C:\Users\kaitoy\Desktop\bin\pleiades\workspace\react-redux-scaffold\node_modules\.bin\flow version
Flow, a static type checker for JavaScript, version 0.77.0
Done in 0.38s.
```

<br>

で、`yarn flow init`でFlowの設定ファイル`.flowconfig`を生成して、型チェックしたいファイルの頭に`// @flow`と書けばとりあえず機能する。

## Flowの型アノテーション

それだけでもだいぶ型推論してくれてチェックが利くけど、[型アノテーション](https://flow.org/en/docs/types/)を書いていくとよりいい。
ただ、アノテートするとESLintとけんかするので、それ対策として[eslint-plugin-flowtype](https://github.com/gajus/eslint-plugin-flowtype)を入れる必要がある。

```shell
yarn add -D babel-eslint eslint-plugin-flowtype
```

`.eslintrc.js`:
```diff
 module.exports = {
   env: {
     browser: true,
   },
+  parser: 'babel-eslint',
-  extends: ['airbnb', 'prettier'],
+  extends: ['airbnb', 'plugin:flowtype/recommended', 'prettier'],
+  plugins: ['flowtype'],
 };
```

<br>

例として、Reactコンポーネントのpropsに型を付けてみる。

```javascript
// @flow

import React from 'react';
import Dialog from '@material-ui/core/Dialog';
import DialogTitle from '@material-ui/core/DialogTitle';
import PropTypes from 'prop-types';

// Propsという型の定義
// text(string型)とopen(boolean型)というプロパティを持つオブジェクト
type Props = {
  text: string,
  open: boolean,
};

// Props型を受け取る関数
const MyDialog = ({ text, open }: Props) => (
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

こんな感じで型を付けておくと、MyDialogに渡すpropsを間違った場合にFlowがエラーにしてくれる。
prop-typesによる型定義と冗長な感じに見えるけど、Flowは静的に型チェックするのに対し、prop-typesはアプリの動作中に型チェックしてくれるので、両方書いておくのがよさそう。
(Flowの型定義からprop-typesの定義を生成してくれる[babel-plugin-react-flow-props-to-prop-types](https://github.com/atlassian/babel-plugin-react-flow-props-to-prop-types)というのがあるけど、サポートされていない型があるし、メンテされていないし、微妙。)

<br>

上のコードで、`type`というキーワードで型を定義しているんだけど、Reactとかの3rdパーティライブラリの型情報([libdef](https://flow.org/en/docs/libdefs/)と呼ばれるもの)は、ライブラリ開発者などが作ったものが公開されていて、インストールして利用できる。

libdefはそれようの[リポジトリ](https://github.com/flow-typed/flow-typed/tree/master/definitions)で管理されていて、[flow-typed](https://github.com/flow-typed/flow-typed/blob/master/README.md)で引っ張れる。

```shell
yarn add -D flow-typed
yarn flow-typed --ignoreDeps dev install
```

これで、package.jsonに書かれている依存(devDependenciesを除く)を見て、必要なlibdefをダウンロードしてきて、プロジェクトルートの`flow-typed`というディレクトリにインストールしてくれる。

例えばさっきのReactコンポーネントのコードに、ReactのAPIの型の一つである`Node`を書くと以下のようになる。

```diff
 // @flow

 import React from 'react';
+import type { Node } from 'react';
 import Dialog from '@material-ui/core/Dialog';
 import DialogTitle from '@material-ui/core/DialogTitle';
 import PropTypes from 'prop-types';

 // Propsという型の定義
 // text(string型)とopen(boolean型)というプロパティを持つオブジェクト
 type Props = {
   text: string,
   open: boolean,
 };

 // Props型を受け取る関数
-const MyDialog = ({ text, open }: Props) => (
+const MyDialog = ({ text, open }: Props): Node => (
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

因みに`flow-typed`ディレクトリの中身はコミットすることが推奨されている。
なんか違和感あるんだけど…

# Jest

Reactプロジェクトでユニットテストを書くなら、[Jest](https://jestjs.io/ja/)一択でいいっぽい。
JestもReactと開発元が同じFacebookで、Reactと相性がいいはずだし、Reactプロジェクト以外でもJestは人気。

ゼロ設定で使えるように作られていて、導入の敷居が低いのが特徴。
また多機能で、アサーション、モック、カバレージ測定辺りは組み込まれていてすぐ使える。

もともとは(今も?)[Jasmine](https://jasmine.github.io/)ベースで、APIが似た感じなので、Jasmineとか[Mocha](https://mochajs.org/)に慣れた人には特に使いやすい。

## Jestインストール

ReactプロジェクトでJestを使うには以下のパッケージを入れる。

* [jest](https://www.npmjs.com/package/jest): 本体
* [babel-jest](https://www.npmjs.com/package/babel-jest): BabelでトランスパイルするコードをJestでテストするためのBabelプラグイン
* [react-test-renderer](https://www.npmjs.com/package/react-test-renderer): ReactコンポーネントをピュアなJavaScriptオブジェクトにレンダリングするライブラリ。[スナップショットテスト](https://jestjs.io/docs/en/snapshot-testing)などに使う。
* [babel-core@^7.0.0-bridge](https://www.npmjs.com/package/babel-core/v/7.0.0-bridge.0): babel-jestをBabel 7で使うためのモジュール。[現時点では必要](https://github.com/facebook/jest/tree/master/packages/babel-jest#usage)だけど、その内いらなくなるであろう。
(2019/1/27追記: [Jest v24でBabel 7にネイティブ対応して、bridgeは不要になった](https://jestjs.io/blog/2019/01/25/jest-24-refreshing-polished-typescript-friendly)。)

```shell
yarn add -D jest babel-jest react-test-renderer babel-core@^7.0.0-bridge
```

Jestはv23.6.0が入った。

<br>

npm scriptにjestを追加しておくといい。

`package.json`:
```diff
 (前略)
   "scripts": {
     "format": "prettier --write **/*.jsx **/*.js **/*.css",
     "build": "webpack --config webpack.prod.js",
+    "test": "jest",
     "start": "webpack-dev-server --hot --config webpack.dev.js"
   },
 (後略)
```

## Jestセットアップ

Jestの設定ファイルである[jest.config.js](https://jestjs.io/docs/en/configuration)をプロジェクトルートに生成する。

```shell
yarn test --init
```

プロンプトでいくつかのことを聞かれるが、「Choose the test environment that will be used for testing」に`jsdom`で答えるのがポイント。ブラウザで動かすアプリなので。

設定ファイルはとりあえずおおむね生成されたままでいいけど、一点、v23.4.2時点では、テスト実行時に「SecurityError: localStorage is not available for opaque origins」というエラーが出る[問題がある](https://github.com/facebook/jest/issues/6769#issuecomment-408352345)ので、testURLを「`http://localhost/`」に設定しておく必要がある。

`jest.config.js`:
```javascript
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
  // moduleFileExtensions: [
  //   "js",
  //   "json",
  //   "jsx",
  //   "node"
  // ],

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
  // transform: null,

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

また、例によって、(主にJestのグローバル変数のために、)JestのテストコードとESLintがけんかするので、ESLintをなだめるために[eslint-plugin-jest](https://www.npmjs.com/package/eslint-plugin-jest)を入れる。

```shell
yarn add -D eslint-plugin-jest
```

`.eslintrc.js`:
```diff
 module.exports = {
   env: {
     browser: true,
+    'jest/globals': true,
   },
   parser: 'babel-eslint',
   extends: ['airbnb', 'plugin:flowtype/recommended', 'prettier'],
-  plugins: ['flowtype'],
+  plugins: ['flowtype', 'jest'],
 };
```

## Jestのテスト作成

Jestのテストは、`jest.config.js`の`testMatch`にマッチするJavaScriptファイルに書く。
デフォルトでは`__test__`ディレクトリ以下に置けばいい。

テストコードはよくある感じの[BDD](https://ja.wikipedia.org/wiki/%E3%83%93%E3%83%98%E3%82%A4%E3%83%93%E3%82%A2%E9%A7%86%E5%8B%95%E9%96%8B%E7%99%BA)風に書けばいいと思う。

`src/__tests__/reducers/reducers.test.js`:
```javascript
import { hoge } from '../../reducers/reducers';
import { hogeButtonClicked } from '../../actions/actions';

const initialState = {
  clicked: false,
};

describe('reducers', () => {
  describe('hoge()', () => {
    test('returns a state with clicked:true when the action is HOGE_BUTTON_CLICKED', () => {
      const state = hogeButtonClicked(initialState, hogeButtonClicked());
      expect(state.clicked).toBe(true);
    });
  });
});
```

## スナップショットテスト

Jestの目玉のひとつは[スナップショットテスト](https://jestjs.io/docs/ja/snapshot-testing)。
Reactコンポーネントのレンダリング結果が以前と変わってないかをテストできる。

`src/__tests__/components/HogeButton.test.jsx`:
```javascript
import React from 'react';
import renderer from 'react-test-renderer';
import HogeButton from '../../components/HogeButton';

describe('components', () => {
  describe('HogeButton', () => {
    test('renders correctly', () => {
      const tree = renderer.create(
        <HogeButton variant="contained" onClick={() => {}}>
          HOGE
        </HogeButton>
      ).toJSON();
      expect(tree).toMatchSnapshot();
    });
  });
});
```

このテストの初回実行時には、`src/__tests__/components/__snapshots__/HogeButton.test.jsx.snap`というスナップショットファイルが生成される。
これはテキスト形式で、以下のような人が読み解ける内容。


`src/__tests__/components/__snapshots__/HogeButton.test.jsx.snap`:
```javascript
// Jest Snapshot v1, https://goo.gl/fbAQLP

exports[`components HogeButton renders correctly 1`] = `
<button
  className="MuiButtonBase-root-25 MuiButton-root-1 MuiButton-contained-10 MuiButton-raised-13"
  disabled={false}
  onBlur={[Function]}
  onClick={[Function]}
  onFocus={[Function]}
  onKeyDown={[Function]}
  onKeyUp={[Function]}
  onMouseDown={[Function]}
  onMouseLeave={[Function]}
  onMouseUp={[Function]}
  onTouchEnd={[Function]}
  onTouchMove={[Function]}
  onTouchStart={[Function]}
  tabIndex="0"
  type="button"
>
  <span
    className="MuiButton-label-2"
  >
    HOGE
  </span>
  <span
    className="MuiTouchRipple-root-28"
  />
</button>
`;
```

スナップショットファイルはコミットしてバージョン管理して、変更があったときには差分を確認する。

# Enzyme

Reactのユニットテストをよりいい感じに書けるようにしてくれるユーティリティライブラリが[Enzyme](https://airbnb.io/enzyme/)。
Airbnb製。
Reactコンポーネントをレンダリングして、jQueryみたいなAPIで[セレクタ](https://airbnb.io/enzyme/docs/api/selector.html)を指定したりしてエレメントを取得し、アサートするようなテストが書ける。

Enzymeによるレンダリングには以下の3種類があり、テスト内容によって使い分ける。

* [Shallow Rendering](https://airbnb.io/enzyme/docs/api/shallow.html): 浅くレンダリングして、子コンポーネントに影響を受けないテストができる。Reactの[ライフサイクルメソッド](https://reactjs.org/docs/state-and-lifecycle.html)も呼んでくれる。
* [Full Rendering](https://airbnb.io/enzyme/docs/api/mount.html): [jsdom](https://github.com/jsdom/jsdom)などを使って完全なDOMツリーとしてレンダリングする。
* [Static Rendering](https://airbnb.io/enzyme/docs/api/render.html): 静的なHTMLに出力して、それをパースする。

<br>

Enzymeはv3から本体とアダプタという構成になっていて、Reactのバージョンによってアダプタを使い分ける。
([preact](https://preactjs.com/)とか[Inferno](https://infernojs.org/)のアダプタもある。)

```shell
yarn add -D enzyme enzyme-adapter-react-16
```

Enzymeはv3.7.0が入った。

[jest-enzyme](https://github.com/FormidableLabs/enzyme-matchers/tree/master/packages/jest-enzyme)も入れるとアサーションがいい感じに書けてよりいいかもしれない。

<br>

Full Renderingをやってみる。

ContainedButtonがクリックされたとき、`onClick`に指定した関数が呼ばれることを確認するテストは以下のように書ける。

`src/__tests__/components/HogeButton.test.jsx`:
```diff
 import React from 'react';
 import renderer from 'react-test-renderer';
+import Enzyme, { mount } from 'enzyme';
+import Adapter from 'enzyme-adapter-react-16';
 import HogeButton from '../../components/HogeButton';

+beforeAll(() => {
+  Enzyme.configure({ adapter: new Adapter() });
+});

 describe('components', () => {
   describe('HogeButton', () => {
     test('renders correctly', () => {
       const tree = renderer.create(
         <HogeButton variant="contained" onClick={() => {}}>
           HOGE
         </HogeButton>
       ).toJSON();
       expect(tree).toMatchSnapshot();
     });
+
+    test("calls the passed handler when it's clicked", () => {
+      const handler = jest.fn();
+      const wrapper = mount(<HogeButton onClick={handler} />);
+      wrapper.find('button').simulate('click');
+      expect(handler).toHaveBeenCalledTimes(1);
+    });
   });
 });
```

`mount`がFull RenderingのAPIで、内部で`react-test-renderer`を使っているみたいなんだけど、`mount`のために`react-test-renderer`をimportする必要はない。

<br>

以上で全10回に渡るReact―Redux環境のセットアップ体験記が完結。
の予定だったけど、[次回](https://www.kaitoy.xyz/2018/11/26/creating-react-redux-app-from-scratch-11/)[TypeScript](https://www.typescriptlang.org/)をやる。
