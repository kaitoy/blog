+++
categories = ["Programming"]
date = "2018-08-29T23:50:53+09:00"
draft = false
cover = "css-modules-postcss-stylelint-styled-components.png"
slug = "creating-react-redux-app-from-scratch-04"
tags = ["react", "frontend", "postcss", "stylelint", "css-modules", "styled-components"]
title = "React + Reduxアプリケーションプロジェクトのテンプレートを作る ― その4: CSS ModulesとPostCSSとstylelintとstyled-components"
+++

[React](https://reactjs.org/)と[Redux](https://redux.js.org/)を学ぶために、開発環境というかプロジェクトテンプレートをスクラッチから作っている。
(最終的な成果は[GitHub](https://github.com/kaitoy/react-redux-scaffold)に置いた。)

[前回](https://www.kaitoy.xyz/2018/08/23/creating-react-redux-app-from-scratch-03/)はPrettierとESLintをセットアップした。

(2018/11/21更新)

{{< google-adsense >}}

# CSS

前回までで作った環境で、Reactを使ってHTMLのDOMツリーを構築することができるようになったが、これは基本的にUIに表示する情報の構造しか定義しない。
UIの見た目(スタイル)を決めるのはCSSなので、それをアプリに組み込むことを考えないといけない。

組み込み方には現時点で大きく3通りある。

## CSSを別途設計する

一つ目はCSSを別途設計する方法。

Reactコンポーネントからレンダリングされる要素にclassが付くようにしておいて、設計したCSSをbundle.jsとは別途読み込んでスタイルを適用することにはる。

この場合、CSSのスタイル定義はすべてグローバルなので、設計効率やメンテナンス効率を維持しつつ、各コンポーネントに意図したスタイルが適用されるようにするため、テクニックを凝らしてCSSクラスを設計する必要がある。
例えば[BEM](https://en.bem.info/) (2009年3月誕生)、[OOCSS](http://oocss.org/) (2009年3月誕生)、[SMACSS](https://smacss.com/ja) (2011年9月誕生)、[FLOCSS](https://github.com/hiloki/flocss) (2014年4月誕生)など。

CSS自体は、素のCSSを書くことはあまりなく、普通は[Sass](https://sass-lang.com/)などのAltCSSや[PostCSS](https://postcss.org/)を使って書く。

さらに、[stylelint](https://github.com/stylelint/stylelint)でリンティングすることで、CSSの品質を上げられる。
リンティングルールは、stylelintプロジェクトから提供されている[stylelint-config-recommended](https://github.com/stylelint/stylelint-config-recommended)か[stylelint-config-standard](https://github.com/stylelint/stylelint-config-standard)を使えば十分。
後者がGoogleやAirbnbのCSSスタイルガイドを反映していていい感じ。

書いたCSSは、webpackの[css-loader](https://github.com/webpack-contrib/css-loader)で読み込める。
webpackはJavaScriptの`import './App.css';`みたいなコードを見つけると、css-loaderに処理を渡す。
css-loaderは、`import`文で指定されたCSSファイルだけでなく、`@import`や`url()`で定義される依存関係をたどって関連するCSSを一通り読み込む。

読み込んだCSSは、webpackの[style-loader](https://github.com/webpack-contrib/style-loader)を使ってDOMに適用できる。
style-loaderは、読み込んだCSSを`<style>`タグで囲ってHTMLのヘッダに挿入してくれる。

<br>

CSSの処理にはPostCSSを使うとして、プロジェクトに以下のパッケージを追加する。
(PostCSSについては[Qiitaの記事](https://qiita.com/morishitter/items/4a04eb144abf49f41d7d)が参考になった。)

* css-loader: CSSを読み込むためのwebpackのローダ。
* style-loader: CSSをDOMに追加するためのwebpackのローダ。
* [postcss-loader](https://github.com/postcss/postcss-loader): PostCSSを実行するためのwebpackのローダ。
* [postcss-preset-env](https://preset-env.cssdb.org/): CSSのエッジな機能を使うためのPostCSSプラグイン。
* [autoprefixer](https://github.com/postcss/autoprefixer): CSSプロパティにベンダプレフィックスを追加してくれるPostCSSプラグイン。
* [postcss-flexbugs-fixes](https://github.com/luisrudge/postcss-flexbugs-fixes): [Flexbox](https://www.w3schools.com/css/css3_flexbox.asp)のバグを修正してくれるPostCSSプラグイン。
* [cssnano](https://github.com/cssnano/cssnano): CSSをミニファイしてくれるPostCSSプラグイン。
* stylelint: CSSのリンタ。
* stylelint-config-standard: stylelintのルール設定集。
* stylelint-config-prettier: [Prettier](https://prettier.io/)が施すコード整形とコンフリクトするルールを無効にするstylelintルール設定集。

```tch
yarn add -D css-loader style-loader postcss-loader postcss-preset-env autoprefixer postcss-flexbugs-fixes cssnano stylelint stylelint-config-standard stylelint-config-prettier
```

<br>

PostCSSとstylelintの設定は、それぞれpostcss.config.jsとstylelint.config.jsを書いてプロジェクトルートに置けばいい。

`postcss.config.js`:
```javascript
module.exports = {
  plugins: {
    stylelint: {},
    'postcss-preset-env': {},
    autoprefixer: {},
    'postcss-flexbugs-fixes': {},
    cssnano: {},
  },
};
```

`stylelint.config.js`:
```javascript
module.exports = {
  extends: ['stylelint-config-standard', 'stylelint-config-prettier'],
};
```

stylelintはPostCSSのプラグインとしてPostCSSから実行する構成。

stylelint.config.jsで、stylelint-config-prettierはextendsの最後に書く必要があることに注意。

<br>

webpackにもローダの設定を追加する。

`webpack.common.js`:
```diff
 (前略)
       {
         test: /\.(js|jsx)$/,
         include: [path.resolve(__dirname, 'src')],
         loader: 'babel-loader',
       },
+      {
+        test: /\.css$/,
+        include: [path.resolve(__dirname, 'src')],
+        use: [
+          'style-loader',
+          {
+            loader: 'css-loader',
+            options: {
+              importLoaders: 1,
+            },
+          },
+          'postcss-loader',
+        ],
+      },
     ],
   },
 (後略)
```

ここで追加した設定は、`<プロジェクトルート>/src`ディレクトリ内の`.css`ファイルが`import`されたら、postcss-loader、css-loader、style-loaderの順にそのファイルを処理する、というもの。

<br>

実際のCSSは普通に書いて、JavaScriptからimportしてやればいい。

`src/components/App.css`:
```css
.normal {
  font-size: 5rem;
}
```

`src/components/App.jsx`:
```diff
 import React from 'react';
+import './App.css'

 const App = () => (
-  <div>
+  <div className="normal">
     HOGE
   </div>
 );

 export default App;
```

JSXでHTML要素にclass属性を付けるには、classNameプロパティを使うことに注意。

これでHOGEに`font-size: 5rem`が適用され、文字が大きくなる。

<br>

以上でCSSを適用できた。

これはこれで十分で柔軟なやりかただけど、BEMなどでCSSクラスの設計を頑張る手間がある。
UIコンポーネントの構造とスタイルの構造を1対1対応させるなら、もっと楽な方法がある。

## CSS Modules

[CSS Modules](https://github.com/css-modules/css-modules)は2015年9月に[発表](https://postd.cc/css-modules/)された技術で、一つのCSSファイルを一つのモジュールと考え、モジュールごとにCSSクラス名の名前空間を自動生成し、スタイルの影響範囲をモジュールに閉じ込めてくれるもの。
(実際には、子要素に継承されるプロパティもあるので完全に閉じ込められるわけではない。)

ReactによるUIコンポーネントごとにCSSモジュールを作り、コンポーネント単位でスタイリングすることを意図した技術であり、コンポーネント内で閉じたCSSクラス設計をすればいいだけになり、BEMとかを考えなくてよくなる。

CSS Modulesを使うには、[babel-plugin-react-css-modules](https://github.com/gajus/babel-plugin-react-css-modules)というBabelのプラグインをセットアップすればいい。
まずはそれをプロジェクトにインストールする。

```tch
yarn add -D babel-plugin-react-css-modules
```

<br>

Babelの設定を修正してインストールしたbabel-plugin-react-css-modulesを使うようにする。

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
-  ]
+  ],
+  "plugins": ["react-css-modules"]
 }
```

<br>

webpackのcss-loaderのオプションを追加して、CSS Modulesを有効にする。

`webpack.common.js`:
```diff
 (前略)
       {
         test: /\.css$/,
         include: [path.resolve(__dirname, 'src')],
         use: [
           'style-loader',
           {
             loader: 'css-loader',
             options: {
               importLoaders: 1,
+              modules: true,
+              localIdentName: '[path]___[name]__[local]___[hash:base64:5]',
             },
           },
           'postcss-loader',
         ],
       },
 (後略)
```

`modules`がCSS Modulesを有効化するスイッチ。
`localIdentName`はモジュール化したCSSクラスの命名規則で、babel-plugin-react-css-modulesの設定と合っている必要がある。

<br>

あとは、コンポーネントの方で`className`プロパティを`styleName`プロパティに変えればいい。

`src/components/App.jsx`:
```diff
 import React from 'react';
 import './App.css'

 const App = () => (
-  <div className="normal">
+  <div styleName="normal">
     HOGE
   </div>
 );

 export default App;
```

<br>

以上でCSS Modulesの設定は完了。
App.cssに書いたクラス名はcss-loaderによって変換され、App.jsxに書いたstyleNameはbabel-plugin-react-css-modulesによって変換され、どちらも`src-components-___App__normal___1fxGx`になるようになる。

## CSS in JS

3つめはCSS in JS。

これは2014年11月に[提唱された](https://speakerdeck.com/vjeux/react-css-in-js)技術で、UIコンポーネントとそのスタイルを両方一つのJavaScriptファイルに書いて、完全に一体化させるというもの。

CSS in JSはCSS Modulesの陰でしばらく目立たなかったが、2016年に[styled-components](https://www.styled-components.com/)という実装がリリースされて注目され、その後いくつかの実装が生まれた。
styled-componentsは2017年ころからCSS Modulesに代わって人気になり、[CSS Modules陣営からの反撃](https://postd.cc/stop-using-css-in-javascript-for-web-development-fa/)もあったものの、今日まで支持を増やしている模様。
SassやPostCSSなど既存のCSSエコシステムを切り捨てているのと、React限定なのが気になるところではあるが、時流に乗って使ってみることにする。

なお、CSS in JSはCSS Modulesとセットアップ方法がかなり異なるので、本稿前節までの変更はいったん全部破棄する。

styled-componentsを使う場合、プロジェクトに追加する必要があるのは二つだけ。

* styled-components: styled-components本体。
* [babel-plugin-styled-components](https://github.com/styled-components/babel-plugin-styled-components): styled-componentsのサポートを強化するBabelプラグイン。実際には必須ではないけど、バンドルサイズを削減出来たり、SSRしやすくなったりする。ベンダプレフィックスの付与とかミニファイもしてくれる。

```tch
yarn add styled-components
yarn add -D babel-plugin-styled-components
```

styled-componentsはv4.1.1が入った。

<br>

Babelの設定は以下のように修正する。

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
-  ]
+  ],
+  "plugins": ["styled-components"]
 }
```

<br>

App.jsxは、styled-componentsのstyledというAPIを使ってWrapperコンポーネント(スタイル付きdiv)を定義し、これをdivと置き換える。

`src/components/App.jsx`:
```diff
 import React from 'react';
+import styled from 'styled-components';

+const Wrapper = styled.div`
+  font-size: 5rem;
+`;

 const App = () => (
-  <div>
+  <Wrapper>
     HOGE
-  </div>
+  </Wrapper>
 );

 export default App;
```

これだけ。CSS Modulesに比べて大分シンプル。

`styled.div`でスタイルを記述している部分は見慣れない構文だけど、ECMAScript 2015で追加されたタグ付きテンプレートリテラルという構文で、テンプレート文字列の一種。
ここに書くスタイルの構文はCSSと全く一緒。
JavaScriptの構文としては単なる文字列なので、変数を使ったり、if文とかで動的に変えたり、数値を計算したり、自由に書ける。

<br>

ややややこしいが、[stylelintによるリンティング](https://www.styled-components.com/docs/tooling#stylelint)もできる。
以下のパッケージをプロジェクトに追加する。

* stylelint: CSSのリンタ。(既出)
* stylelint-config-standard: stylelintのルール設定集。(既出)
* [stylelint-processor-styled-components](https://github.com/styled-components/stylelint-processor-styled-components): スタイル付きコンポーネントからスタイル定義を抽出するstylelintのカスタムプロセッサ。
* [stylelint-config-styled-components](https://github.com/styled-components/stylelint-config-styled-components): stylelint-processor-styled-componentsを使うのに必要なstylelint設定集。
* [stylelint-custom-processor-loader](https://github.com/emilgoldsmith/stylelint-custom-processor-loader): stylelintでカスタムプロセッサを使う場合に必要なwebpackのローダ。

```tch
yarn add -D stylelint stylelint-config-standard stylelint-processor-styled-components stylelint-config-styled-components stylelint-custom-processor-loader
```

<br>

stylelintの設定は以下。

`stylelint.config.js`:
```javascript
module.exports = {
  processors: ['stylelint-processor-styled-components'],
  extends: ['stylelint-config-standard', 'stylelint-config-styled-components'],
};
```

<br>

webpackの設定にstylelint-custom-processor-loaderの設定を追加する。

`webpack.common.js`:
```diff
 (前略)
       {
         test: /\.(js|jsx)$/,
         include: [path.resolve(__dirname, 'src')],
         loader: 'babel-loader',
       },
+      {
+        test: /\.(js|jsx)$/,
+        include: [path.resolve(__dirname, 'src')],
+        enforce: 'pre',
+        loader: 'stylelint-custom-processor-loader',
+      },
     ],
   },
 (後略)
```

これでstyled-componentsにstylelintを適用できた。

[次回](https://www.kaitoy.xyz/2018/09/06/creating-react-redux-app-from-scratch-05/)は[Material-UI](https://material-ui.com/)を導入する。
