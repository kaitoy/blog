+++
categories = ["Programming"]
date = "2018-08-19T15:27:19+09:00"
draft = false
eyecatch = "babel-webpack.png"
slug = "creating-react-redux-app-from-scratch-01"
tags = ["react", "frontend", "webpack", "babel"]
title = "React + Reduxアプリケーションプロジェクトのテンプレートを作る ― その1: Node.jsとYarnとBabelとwebpack"

+++

昔、[Dojo Toolkit](https://dojotoolkit.org/)を使ってFlashなUIをJavaScriptに書き換えた時以来、仕事でWeb UIを触ることはなかったんだけど、最近になってWeb UIを書かなければいけなくなるような気がして再学習を始めた。

題材は[React](https://reactjs.org/) (と[Redux](https://redux.js.org/))。
今一番人気のフロントエンドフレームワークで、[昔触ったこともある](https://www.kaitoy.xyz/2015/12/21/hello-react/)ので。

[前回の記事でReactが生まれた経緯を学んだ](https://www.kaitoy.xyz/2018/08/16/chronicle-of-frontend-2018/)ので、今回から実習に入る。

(2018/11/21更新)

{{< google-adsense >}}

# プロジェクト作成

ちょっと[Create React App](https://github.com/facebook/create-react-app)を触ってみたけど使わないことにした。
すぐ開発始められるのはよかったんだけど、裏でなにが起こっているかわからな過ぎて肌に合わないし、使うライブラリが結構固定されちゃいそうだったし、トラブルシュート(特にライブラリのバグを踏んだ時)が大変そうだったので。

代わりに、[公式](https://reactjs.org/docs/create-a-new-react-app.html#creating-a-toolchain-from-scratch)で紹介されているブログ記事である[Creating a React App… From Scratch.](https://blog.usejournal.com/creating-a-react-app-from-scratch-f3c693b84658)を見ながら、スクラッチからプロジェクトを作ることにした。

環境はWindows 10 Home。

最終的な成果は[GitHub](https://github.com/kaitoy/react-redux-scaffold)に置いた。

## Node.jsインストール

なにはともあれ[Node.js](https://nodejs.org/ja/)。

Node.jsのバージョン管理には以前は[nodist](https://github.com/marcelklehr/nodist)使っていたんだけど、こいつは2年ほど前に開発が止まっているので、代わりに[nvm for Windows](https://github.com/coreybutler/nvm-windows)を入れた。

`nvm install`で任意のバージョンのNode.jsをインストール出来て、`nvm use`で使うNode.jsのバージョンを切り替えられる。

今回使うNode.jsのバージョンは、現時点でLTS版の最新である8.11.4にする。

```cmd
C:\>nvm install 8.11.4
Downloading node.js version 8.11.4 (64-bit)...
Complete
Creating C:\Users\kaitoy\AppData\Roaming\nvm\temp

Downloading npm version 5.6.0... Complete
Installing npm v5.6.0...

Installation complete. If you want to use this version, type

nvm use 8.11.4

C:\>nvm use 8.11.4
Now using node v8.11.4 (64-bit)
```

## Yarnインストール

パッケージマネージャには[Yarn](https://yarnpkg.com/lang/ja/)を使う。

Yarnちょっとバギーだとか、npm 5がlockファイルをサポートしてYarnの優位性が減ったとか、[Yarnからnpmに戻るためのツール](https://github.com/mixmaxhq/deyarn)が出てきたりしてるけど、現時点では深く考えずにYarnでいいと思う。

YarnはWindows環境ではMSIファイルを[ダウンロード](https://yarnpkg.com/ja/docs/install#windows-stable)して実行すればインストールできる。

(npmでもインストールできるけど邪道。)

Yarnはv1.7.0を使う。

## package.json生成

プロジェクトの構成情報を記述するファイルであるpackage.jsonをYarnで生成する。

```cmd
C:\>mkdir react-redux-scaffold

C:\>cd react-redux-scaffold

C:\react-redux-scaffold>yarn init
yarn init v1.7.0
question name (react-redux-scaffold):
question version (1.0.0):
question description: React Redux Scaffold
question entry point (index.js): src/index.jsx
question repository url: https://github.com/kaitoy/react-redux-scaffold.git
question author: kaitoy
question license (MIT):
question private:
success Saved package.json
Done in 40.38s.
```

できたのがこれ。

`package.json`:
```json
{
  "name": "react-redux-scaffold",
  "version": "1.0.0",
  "description": "React Redux Scaffold",
  "main": "src/index.jsx",
  "repository": "https://github.com/kaitoy/react-redux-scaffold.git",
  "author": "kaitoy",
  "license": "MIT"
}
```

<br>

以降、カレントディレクトリは`C:\react-redux-scaffold`として、プロンプト表示は省略する。

# ビルド環境セットアップ

ビルド環境としてトランスパイラとかモジュールバンドラとかをセットアップする。

## Babel

トランスパイラはデファクトスタンダードの[Babel](https://babeljs.io/)を使う。
[2018年8月](https://babeljs.io/blog/2018/08/27/7.0.0)に出たv７。

Babelのプラグインはとりあえず最低限入れるとして、以下のnpmパッケージをプロジェクトにインストールする。

* [@babel/core](https://babeljs.io/docs/en/babel-core): Babel本体。
* [@babel/preset-react](https://babeljs.io/docs/en/babel-preset-react): Reactの[JSX](https://reactjs.org/docs/introducing-jsx.html)とか[Flow](https://flow.org/)とかを処理するプラグイン集。
* [@babel/preset-env](https://babeljs.io/docs/en/babel-preset-env): ES 2015+をES 5にトランスパイルするプラグイン集。

これらのパッケージは実行時には要らないので`yarn add -D`コマンドで開発時依存としてインストールする。

```cmd
yarn add -D @babel/core @babel/preset-react @babel/preset-env
```

Babelはv7.1.6が入った。

<br>

で、Babelの[設定ファイル](https://babeljs.io/docs/en/babelrc)を書いてプロジェクトルートに置いておく。

`.babelrc`:
```json
{
  "presets": ["@babel/preset-env", "@babel/preset-react"]
}
```

## Polyfill

BabelはES 2015+で追加された構文の変換はしてくれるけど、追加されたグローバルオブジェクト(e.g. [Promise](https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Promise))とかメソッド(e.g. Object.assignとかArray.prototype.includes)とかを補完してくれるわけではない。
そこを補完してくれるのが[Polyfill](https://en.wikipedia.org/wiki/Polyfill_%28programming%29)。

少なくとも後で導入する[redux-saga](https://redux-saga.js.org/)が使う[ジェネレータ](https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/function*)がPolyfillを必要とする(ないと`ReferenceError: regeneratorRuntime is not defined`というエラーが出る)ので、今の時点で入れておくことにする。

Polyfillの実装はいくつかあるけど、定番っぽい[@babel/polyfill](https://babeljs.io/docs/en/babel-polyfill/)を使う。
こちらは実行時依存としてインストールする。

```cmd
yarn add @babel/polyfill
```

<br>

`@babel/polyfill`のアプリへのロード方法は[いくつかある](https://babeljs.io/docs/en/babel-polyfill#usage-in-node-browserify-webpack)けど、今回使うwebpack(後述)の場合、`useBuiltIns: 'usage'`というオプションを使うのがよさそう。
これを使うと、ソースに`@babel/polyfill`のimportを書かなくても、必要に応じて必要なPolifillをロードしてくれる。

`.babelrc`:
```diff
 {
-  "presets": ["@babel/preset-env", "@babel/preset-react"]
+  "presets": [
+    [
+      "@babel/preset-env",
+      {
+        "useBuiltIns": "usage"
+      }
+    ],
+    "@babel/preset-react"
+  ]
 }
```

## webpack

モジュールバンドラは現時点で一番人気の[webpack](https://webpack.js.org/)を使う。
([Parcel](https://parceljs.org/)の方がナウいはナウいけど。)

webpackは、タスクランナーの機能も備えたモジュールバンドラみたいな感じで、バンドルしたいファイルの形式とか実行したいタスクに応じた[ローダー](https://webpack.js.org/loaders/)を設定することでプロジェクトのビルドを定義できる。

ちょっと古いけど[この記事](https://qiita.com/chuck0523/items/caacbf4137642cb175ec)を読むとwebpackの理解が深まる。

こちらもとりあえず最低限のローダーをセットアップするとして、以下のnpmパッケージをプロジェクトにインストールする。

* webpack: webpack本体。
* webpack-cli: webpackのコマンドラインインターフェース。
* [webpack-dev-server](https://github.com/webpack/webpack-dev-server): webpackから起動できる開発用 HTTP サーバ。ライブリロードしてくれる。([webpack-serve](https://github.com/webpack-contrib/webpack-serve)の方がモダンではある。)
* [babel-loader](https://webpack.js.org/loaders/babel-loader/): Babelを実行してくれるやつ。Babel 7で使うにはv8以降である必要がある。

<br>

```cmd
yarn add -D webpack webpack-cli webpack-dev-server babel-loader
```

webpackはv4.26.0が入った。

### webpack設定ファイル

webpackの設定は[設定ファイル](https://webpack.js.org/configuration/)を書いてプロジェクトルートに置けばいい。
設定は結構複雑だけど、v1の時よりかは若干書きやすくなったし、公式のマニュアルとかローダーのマニュアル見てれば書くのは難しくない。
[設定ファイルを生成してくれるサイト](https://generatewebpackconfig.netlify.com/)もある。

とりあえず適当に書くとこんな感じ。

`webpack.config.js`:
```javascript
const path = require('path');
const packageJson = require('./package.json');

module.exports = {
  mode: 'development',
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
        loader: 'babel-loader',
      },
    ],
  },
  resolve: {
    extensions: ['*', '.js', '.jsx'],
    modules: ['node_modules'],
  },
};
```

この設定の意味は、`entry`に指定された`./src/index.jsx`を読んで、`.js`か`.jsx`を拡張子としたモジュールファイルやノードモジュールをロードするコードがあったら、babel-loaderでBabelを呼んでトランスパイルして、バンドルした結果は`<プロジェクトルート>/dist/bundle.js`に吐き出す。
というだけ。
([__dirname](https://nodejs.org/docs/latest/api/modules.html#modules_dirname)はNode.jsが値を入れてくれる変数で、webpack.config.jsのあるディレクトリの絶対パスが入ってる。)

モジュールファイルをロードするコードというのは、`import App from './components/App';`みたいなやつ。
webpackはこのコードを読んだら、`./components`ディレクトリのなかを見て、`App`か`App.js`か`App.jsx`というファイルを探してロードする。
また、ノードモジュールをロードするコードというのは`import React from 'react';`みたいなやつで、webpackはこのコードを読んだら、プロジェクトの`node_modules/react/package.json`の`main`プロパティの値に書いてあるファイルをロードする。
という挙動が上記webpack.config.jsの`resolve`に定義してある。
(モジュールロードの詳細は[公式のドキュメントのModule Resolution](https://webpack.js.org/concepts/module-resolution/)に書いてある。)

`.babelrc`に`useBuiltIns: 'usage'`を付けたので、webpack.config.jsに`@babel/preset-env`を書く必要はない。

`mode`については後述。

### webpack-dev-server設定

webpack-dev-serverの設定もwebpack.config.jsに書く。

以下を`resolve`の次辺りに書き足せばいい。

```javascript
  devServer: {
    contentBase: path.join(__dirname, 'public'),
    compress: true,
    hot: true,
    port: 3000,
    publicPath: 'http://localhost:3000/',
  },
```

<br>

この設定でwebpack-dev-serverを実行すると、`http://localhost:3000/`へのアクセスに`public/index.html`を返すWebサーバを起動できる。
Webサーバが起動するときにプロジェクトがインメモリでビルドされ、メモリからbundle.jsがサーブされる。

`hot`をtrueにしておくと[Hot Module Replacement](https://webpack.js.org/concepts/hot-module-replacement/)が有効になる。
これによって、webpack-dev-serverの起動中にソースを編集すると、自動で再ビルドし、動的にモジュール単位でロードし、ブラウザをリロードしてくれるようになる。
Hot Module Replacementを有効にするときは`publicPath`をフルURLで書かないといけない。

webpack-dev-serverの他の設定については[公式のマニュアルのDevServer](https://webpack.js.org/configuration/dev-server/)を見るべし。

### webpackのmode

webpackにはビルドの[mode](https://webpack.js.org/concepts/#mode)という概念があり、modeを切り替えることで適切な最適化を適用してくれる。

modeにはdevelopmentとproduction(とnone)があり、productionにしておくと、[UglifyJsPlugin](https://webpack.js.org/plugins/uglifyjs-webpack-plugin/)とかを適用して、出力するバンドルファイルのサイズを小さくしてくれたりする。
(v1のころはUglifyJsPluginとかは全部自分でwebpack.config.jsに指定していた記憶があるので、楽になった。)

### webpack.config.jsの分割

modeを切り替えるのにwebpack.config.jsを書き換えるのはイケてないので、developmentとproductionでファイルを分割して使い分けるようにする。

developmentとproductionはほとんどが共通の設定なので、共通部分をwebpack.common.jsに書いて、developmentとproductionに固有な設定だけをそれぞれwebpack.dev.jsとwebpack.prod.jsに書く。
webpack.common.jsは、[webpack-merge](https://github.com/survivejs/webpack-merge)でwebpack.dev.jsとwebpack.prod.jsにマージする。
というのが[公式](https://webpack.js.org/guides/production/)で紹介されているプラクティス。

まずwebpack-mergeをプロジェクトにインストール。

```cmd
yarn add -D webpack-merge
```

分割したファイルは以下の感じ。全部プロジェクトルートに置いておく。

`webpack.common.js`
```javascript
const path = require('path');
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
        loader: 'babel-loader',
      },
    ],
  },
  resolve: {
    extensions: ['*', '.js', '.jsx'],
    modules: ['node_modules'],
  },
};
```

`webpack.dev.js`
```javascript
const path = require('path');
const webpackMerge = require('webpack-merge');
const webpackCommon = require('./webpack.common.js');

module.exports = webpackMerge(webpackCommon, {
  mode: 'development',
  devServer: {
    contentBase: path.join(__dirname, 'public'),
    compress: true,
    hot: true,
    port: 3000,
    publicPath: 'http://localhost:3000/',
  },
});
```

`webpack.prod.js`
```javascript
const webpackMerge = require('webpack-merge');
const webpackCommon = require('./webpack.common.js');

module.exports = webpackMerge(webpackCommon, {
  mode: 'production',
});
```

### npmスクリプト

webpackによるビルドは次のコマンドで実行できる。

```cmd
node_modules\.bin\webpack --config webpack.prod.js
```

また、webpack-dev-serverは次のコマンドで起動できる。

```cmd
node_modules\.bin\webpack-dev-server --hot --config webpack.dev.js
```

`--hot`はHot Module Replacementに必要なオプション。

コマンドが長くて面倒なのは、[npmスクリプト](https://docs.npmjs.com/misc/scripts)で楽にできる。
package.jsonの`main`の次辺りに以下を書き足せばいい。
(npmスクリプトは実行時に`node_modules\.bin`にPATHを通してくれるので、それを省略できる。)

```javascript
  "scripts": {
    "build": "webpack --config webpack.prod.js",
    "start": "webpack-dev-server --hot --config webpack.dev.js"
  },
```

こうしておくと、`yarn build`でビルド、`yarn start`でwebpack-dev-server起動できる。

<br>

以上でビルド環境セットアップはいったん完了とする。
[次回](https://www.kaitoy.xyz/2018/08/22/creating-react-redux-app-from-scratch-02/)はReactが動くところらへんまで。
