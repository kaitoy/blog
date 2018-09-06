+++
categories = ["Programming"]
date = "2018-08-22T08:21:28+09:00"
draft = false
eyecatch = "react.png"
slug = "creating-react-redux-app-from-scratch-02"
tags = ["react", "frontend"]
title = "React + Reduxアプリケーションプロジェクトのテンプレートを作る ― その2: React"

+++

[React](https://reactjs.org/)と[Redux](https://redux.js.org/)を学ぶために、開発環境というかプロジェクトテンプレートをスクラッチから作っている。
(最終的な成果は[GitHub](https://github.com/kaitoy/react-redux-scaffold)に置いた。)

[前回](https://www.kaitoy.xyz/2018/08/19/creating-react-redux-app-from-scratch-01/)はNode.jsとYarnとBabelとwebpackをセットアップした。

{{< google-adsense >}}

# Reactとは

以前にも同じような事を書いたけど、改めてReactについて書く。
ちょっとコーディングの詳細にも触れながら。

ReactはViewを記述するためのライブラリで、特徴は[Virtual DOM](https://reactjs.org/docs/faq-internals.html)と[JSX](https://reactjs.org/docs/introducing-jsx.html)。

## Virtual DOM

Virtual DOMはDOMを仮想化するもので、JavaScriptからVirtual DOMでUIを記述してやると、それが実DOMに効率的に反映されるようになっている。

## JSX

Virtual DOMはJSXというHTMLみたいな言語で記述できる。

```javascript
import React from 'react';
import ReactDOM from 'react-dom';

ReactDOM.render(
  <h1>Hello, world!</h1>,
  document.getElementById('root')
);
```

こんな風に書くと、idが`root`であるHTML要素の中に、`<h1>Hello, world!</h1>`がレンダリングされる。
上記コードの`<h1>Hello, world!</h1>`の部分がJSX。

## コンポーネント

JSXではコンポーネントを定義して新たなタグとして使うことができるので、再利用できるコンポーネントを作って、それらを組み合わせてUIを構築することで、効率的な開発ができる。

```javascript
import React from 'react';
import ReactDOM from 'react-dom';

// Welcomeコンポーネントの定義
function Welcome() {
  return <h1>Hello, World</h1>;
}

// Welcomeコンポーネントのレンダリング
ReactDOM.render(
  <Welcome />,
  document.getElementById('root')
);
```

上記コードではコンポーネントをfunctionで定義しているが、アロー関数で書いても全く一緒。

```javascript
const Welcome = () => (
  <h1>Hello, World</h1>;
);
```

<br>

関数の代わりにclassで定義することもできる。

```javascript
class Welcome extends React.Component {
  render() {
    return <h1>Hello, World</h1>;
  }
}
```

関数による定義とclassによる定義はおおむね変わらないが、[stateとライフサイクルメソッド](https://reactjs.org/docs/state-and-lifecycle.html)を使いたいときはclassにする必要がある。

## props

コンポーネントはレンダリングの際に`props`というパラメータを受け取って使うことができるので、上手く設計すれば汎用的なコンポーネントが書ける。

```javascript
import React from 'react';
import ReactDOM from 'react-dom';

// Welcomeコンポーネントの定義 (props付き)
function Welcome(props) {
  return <h1>Hello, {props.name}</h1>;
}

// Welcomeコンポーネントのレンダリング (props付き)
ReactDOM.render(
  <Welcome name="Kaitoy" />,
  document.getElementById('root')
);
```

<br>

`props`はイミュータブルにしてコンポーネント内で変更しない(i.e. コンポーネントをpureにする)のが定石。

## prop-types

[prop-types](https://github.com/facebook/prop-types)を使うと、コンポーネントに渡される`props`に期待する型を定義することができる。

前節で作ったWelcomeコンポーネントの`props`の`name`はStringオブジェクトを受け取ることを期待するので、prop-typesを以下のように定義する。

```javascript
function Welcome(props) {
  return <h1>Hello, {props.name}</h1>;
}

Welcome.propTypes = {
  name: PropTypes.string.isRequired,
};
```

こうしておくと、実行時に型チェックが走り、型が合わないとコンソールに警告がでるようになる。

# Reactのインストール

上記のコードを実行するためのライブラリを一通りプロジェクトに追加する。

```cmd
yarn add react react-dom prop-types
```

Reactはv16.4.1が入った。

# ソース構成

ソースを入れる`src`ディレクトリの構成は、[Qiitaの記事](https://qiita.com/numanomanu/items/af97312f34cf1388cee6#%E5%AE%9F%E9%9A%9B%E3%81%AE%E3%83%97%E3%83%AD%E3%83%80%E3%82%AF%E3%83%88%E3%81%AE%E3%83%95%E3%82%A9%E3%83%AB%E3%83%80%E6%A7%8B%E6%88%90)を参考に以下のようにする。

* react-redux-scaffold/
    * src/
        * actions/
        * components/
        * containers/
        * reducers/
        * sagas/
        * services/
        * index.jsx

<br>

今のところ使うのは`index.jsx`と`components`だけ。

`index.jsx`は[前回](https://www.kaitoy.xyz/2018/08/19/creating-react-redux-app-from-scratch-01/#webpack%E8%A8%AD%E5%AE%9A%E3%83%95%E3%82%A1%E3%82%A4%E3%83%AB)書いた通り、webpackが初めにロードするファイル。

`components`にはReactのコンポーネントを入れる。

その他のディレクトリについては追って説明する。

# Reactコンポーネント作成

最初のReactコンポーネントとして、適当なものを作る。

components/App.jsx:
```javascript
import React from 'react';

const App = () => (
  <div>
    HOGE
  </div>
);

export default App;
```

で、これを`index.jsx`でインポートしてレンダリングしてやる。

src/index.jsx:
```javascript
import React from 'react';
import ReactDOM from 'react-dom';
import App from './components/App';

const root = document.getElementById('root');

if (root) {
  ReactDOM.render(
    <App />,
    root,
  );
}
```

これで`yarn build`すると`dist/bundle.js`が生成される。

実践的なコンポーネント構成の考え方については、公式の[Thinking in React](https://reactjs.org/docs/thinking-in-react.html)が参考になる。

# HTMLファイル作成

bundle.jsを読み込むHTMLファイルを作る。

HTMLファイルを書くときは、「[普通のHTMLの書き方](https://hail2u.net/documents/html-best-practices.html)」の1～3章とか、「[フロントエンドチェックリスト](https://qiita.com/miya0001/items/8fff46c201bf9eaeba4a)」のHead、HTML辺りが参考になる。
まあ開発時にしか使わないだろうから実際は適当でいいし、なんなら[HtmlWebpackPlugin](https://webpack.js.org/plugins/html-webpack-plugin/)で自動生成してもいい。

作るファイルは、[webpackの設定に書いた](https://www.kaitoy.xyz/2018/08/19/creating-react-redux-app-from-scratch-01/#webpack-dev-server%E8%A8%AD%E5%AE%9A)通り、`public/index.html`。

内容は以下。

public/index.html:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="x-ua-compatible" content="ie=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>React Redux</title>
    <meta name="description" content="React Redux Scaffold">
  </head>
  <body>
    <div id="root"></div>
    <noscript>
      You need to enable JavaScript to run this app.
    </noscript>
    <script src="./bundle.js"></script>
  </body>
</html>
```

<br>

ポイントは2点。

* `<body>`の最初に`id=root`の`<div>`を書く

    上で書いた`index.jsx`で、`id`が`root`の要素を取得して`ReactDOM.render()`に渡しているので、この`<div>`要素のなかに全てのWeb UIがレンダリングされることになる。

* `<body>`の最後に`<script src="./bundle.js"></script>`を書く

    この`<script>`要素により、bundle.jsがWebサーバからダウンロードされて実行される。

<br>


以上でReactは一通り。

`yarn start`してブラウザで`http://localhost:3000`にアクセスするとHOGEと表示されるはず。

[次回](https://www.kaitoy.xyz/2018/08/23/creating-react-redux-app-from-scratch-03/)はフォーマッタとリンタを導入する。
