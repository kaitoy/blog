+++
categories = ["Programming"]
date = "2018-09-06T23:33:31+09:00"
draft = false
cover = "material-ui-logo.png"
slug = "creating-react-redux-app-from-scratch-05"
tags = ["react", "frontend", "material-ui"]
title = "React + Reduxアプリケーションプロジェクトのテンプレートを作る ― その5: Material-UIとWebフォント"
highlight = true
highlightStyle = "monokai"
highlightLanguages = []

+++

[React](https://reactjs.org/)と[Redux](https://redux.js.org/)を学ぶために、開発環境というかプロジェクトテンプレートをスクラッチから作っている。
(最終的な成果は[GitHub](https://github.com/kaitoy/react-redux-scaffold)に置いた。)

[前回](https://www.kaitoy.xyz/2018/08/29/creating-react-redux-app-from-scratch-04/)はCSS周りの処理系をセットアップした。

<!--more-->

(2020/4/29更新)

{{< google-adsense >}}

# 既成Reactコンポーネント

前回まででHTMLもCSSもReactコンポーネント単位で書けるようになったんだけど、実際、自分で1からコンポーネントを書くのは、特にデザインセンスがない人にとっては辛い。
かっこいいUIコンポーネントを作りたいならデザイナーの協力が必要だけど、個人の開発などそれができない状況も多い。

という問題を抱えた人たち向けなのかはわからないが、既成のReactコンポーネントセットが色々OSSで提供されている。

* [Material-UI](https://material-ui.com/): Googleの[マテリアルデザイン](https://material.io/design/)のReact実装。
* [Semantic UI React](https://react.semantic-ui.com/): [Semantic UI](https://semantic-ui.com/)のReactバインディング。
* [antd](https://ant.design/docs/react/introduce): [Ant Design](https://ant.design/)のReact実装。
* [Blueprint](https://blueprintjs.com/): 複雑でデータ量の多いUI向けに作られたReact UIツールキット。
* [React-Bootstrap](https://react-bootstrap.github.io/): [Bootstrap](https://getbootstrap.com/)のReactバインディング。現時点ではv4未対応。
* [Grommet](http://grommet.io/): HPEによるエンタープライズレディなデザインシステム。
* [Fluent UI (旧Office UI Fabric React)](https://developer.microsoft.com/en-us/fluentui#/): OfficeなどのMicrosoft製品に使われているReactコンポーネントセット。

<br>

今回はこの中でも圧倒的に人気なMaterial-UIを導入する。

# Material-UI

Material-UIは簡単に使える。
とりあえずコアパッケージをインストールする。

```console
$ yarn add @material-ui/core
```

v3.5.1が入った。

<br>

あとはパッケージに入っている色々なコンポーネントをMaterial-UIのドキュメント見ながら使えばいいだけ。

`src/components/App.jsx`:
```diff
 import React from 'react';
 import styled from 'styled-components';
+import Button from '@material-ui/core/Button';

 const Wrapper = styled.div`
   font-size: 5rem;
 `;

 const App = () => (
   <Wrapper>
-    HOGE
+    <Button variant="contained">
+      HOGE
+    </Button>
   </Wrapper>
 );

 export default App;
```

これでただのテキストがボタンになった。

# CSS Web Fonts

前節でいちおうMaterial-UI使えたけど、フォントをケアしてやるともう少しかっこよくなる。
Material-UIは[Robotoフォント](https://fonts.google.com/specimen/Roboto)を想定して作られているが、これはブラウザにデフォルトで入ってはいないので、そのままだとArialとかにフォールバックされちゃう。
のでRobotoフォントを導入する。

フォントは[CSS Web Fonts](https://www.w3schools.com/css/css3_fonts.asp)の機能である[@font-face](https://developer.mozilla.org/ja/docs/Web/CSS/@font-face)で、フォントファイルをブラウザにロードさせることで導入できる。
`@font-face`で読み込むフォントファイル(i.e. `url()`関数で指定するファイル)はwebpackでバンドルできる。

Robotoフォントのフォントファイルはnpmで配布されていて、Yarnでプロジェクトにインストールできる。

```console
$ yarn add typeface-roboto
```

<br>

フォントファイルの種類は、OTFとかTTFとかWOFFとかWOFF2とかいろいろあるけど、[この記事](https://www.6666666.jp/design/20160218/)などをみるに、WOFFだけ使えばよさげ。

フォントファイルのバンドルは[url-loader](https://github.com/webpack-contrib/url-loader)を使う方法と[file-loader](https://github.com/webpack-contrib/file-loader)を使う方法とがある。

## url-loaderを使う方法

url-loaderを使う場合は、url-loaderとフォールバック用のfile-loaderをインストールする。

```console
$ yarn add -D url-loader file-loader
```

<br>

webpackのローダ設定は以下のようなのを追加すればいい。

`webpack.common.js`:
```diff
(前略)
   module: {
     rules: [
(中略)
-      }
+      },
+      {
+        test: /\.(png|woff|woff2|eot|ttf|svg)$/,
+        include: [path.resolve(__dirname, 'node_modules/typeface-roboto')],
+        loader: 'url-loader',
+        options: {
+          limit: 100000,
+        },
+      },
     ],
   },
(後略)
```

<br>

あとは、typeface-robotoパッケージ内のフォントファイルを指すようにCSSに@font-faceを書けばいい。
例えば、weightが300のWOFFファイルを読むなら以下のような感じ。

`src/fonts.css`:
```css
@font-face {
  font-family: 'Roboto';
  font-style: normal;
  font-display: swap;
  font-weight: 300;
  src: local('Roboto Light'), local('Roboto-Light'),
    url('../node_modules/typeface-roboto/files/roboto-latin-300.woff') format('woff');
}
```

これをどこかのJavaScriptでインポートしてやればいい。

`src/index.jsx`:
```diff
 import React from 'react';
 import ReactDOM from 'react-dom';
 import App from './components/App';
+import './fonts.css';

 const root = document.getElementById('root');

 if (root) {
   ReactDOM.render(
     <App />,
     root,
   );
 }
```

<br>

けど、styled-componentsを使っている場合はurl-loaderは使えないみたいで、代わりにfile-loaderを使う必要がある。

## file-loaderを使う方法 (styled-components)

file-loaderを使う場合は、file-loaderだけインストールすればいい。

```console
$ yarn add -D file-loader
```

<br>

webpackのローダ設定は以下のようなのを追加すればいい。

`webpack.common.js`:
```diff
(前略)
   module: {
     rules: [
(中略)
-      }
+      },
+      {
+        test: /\.(png|woff|woff2|eot|ttf|svg)$/,
+        include: [path.resolve(__dirname, 'node_modules')],
+        loader: 'file-loader',
+      },
     ],
   },
(後略)
```

<br>

で、[ここ](https://github.com/styled-components/styled-components/issues/233)を参考にしてフォントファイルを読みこむ。injectGlobalというstyled-componentsのAPIを使えとあるけど、injectGlobalはstyled-components v4で[createGlobalStyle](https://www.styled-components.com/docs/api#createglobalstyle)に代わったので、以下のように書く。

`src/fonts.js`:
```javascript
import { createGlobalStyle } from 'styled-components';
import roboto300 from '../node_modules/typeface-roboto/files/roboto-latin-300.woff';

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

ここでexportされる`Fonts`はReactコンポーネントになっているので、それをどこかのJSXに追加してやればいい。

`src/components/App.jsx`:
```diff
 import React from 'react';
 import styled from 'styled-components';
 import Button from '@material-ui/core/Button';
+import Fonts from '../fonts';

 const Wrapper = styled.div`
   font-size: 5rem;
 `;

 const App = () => (
   <Wrapper>
     <Button variant="contained">
       HOGE
     </Button>
+    <Fonts />
   </Wrapper>
 );

 export default App;
```

<br>


[次回](https://www.kaitoy.xyz/2018/09/26/creating-react-redux-app-from-scratch-06/)はようやくReduxを導入する。
