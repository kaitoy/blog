+++
categories = ["Programming"]
date = "2018-10-01T07:54:53+09:00"
draft = false
eyecatch = "redux.png"
slug = "creating-react-redux-app-from-scratch-07"
tags = ["react", "frontend", "redux"]
title = "React + Reduxアプリケーションプロジェクトのテンプレートを作る ― その7: React Redux"

+++

[React](https://reactjs.org/)と[Redux](https://redux.js.org/)を学ぶために、開発環境というかプロジェクトテンプレートをスクラッチから作っている。
(最終的な成果は[GitHub](https://github.com/kaitoy/react-redux-scaffold)に置いた。)

[前回](https://www.kaitoy.xyz/2018/09/26/creating-react-redux-app-from-scratch-06/)はReduxをセットアップした。

(2018/11/21更新)

{{< google-adsense >}}

# React Redux

前回はReduxをセットアップして、ActionをStoreにディスパッチしてstateを更新できるようになった。
今回はこれをReactにつなぐ。

使うのは[React Redux](https://redux.js.org/basics/usagewithreact)。

```cmd
yarn add react-redux
```

v5.1.1が入った。

# Presentational Components と Container Components

React Reduxの使い方を理解するには、[Presentational Components と Container Components](https://medium.com/@dan_abramov/smart-and-dumb-components-7ca2f9a7c7d0) という概念を知らないといけない。
これはReactコンポーネントを役割別に分ける考え方で、それぞれ以下のような特徴をもつ。

|                           | Presentational Components | Container Components |
|---------------------------|----------------------|-----------------------------------|
| 主な役割                      | DOMをレンダリングする         | データを取得したりstateを更新したりする(Reduxとつなぐ) |
| Reduxとの関連                 | 無し                   | 有り                                |
| データの読み込み                  | propsから読む            | Reduxのstateオブジェクトから読む             |
| データの更新                    | propsで渡されたコールバックを呼ぶ  | ReduxのActionをディスパッチする             |
| 作り方                       | 自前で書く                | React Reduxで生成する                  |

<br>

要するに、普通にReactで作ったUIコンポーネントを、React Reduxで生成するContainer ComponentでラップしてやることでReduxのStoreとつなぐことができる。

# connect()

Container Componentの生成にはReact Reduxの[connect()](https://github.com/reduxjs/react-redux/blob/master/docs/api.md#connectmapstatetoprops-mapdispatchtoprops-mergeprops-options)というAPIを使う。

React Reduxを使う場合、Reduxのstateの更新に応じてReactコンポーネントに新しいpropsを渡して再レンダリングすることになるが、この新しいpropsを作ってコンポーネントに渡す処理を定義するのが`connect()`。

`connect()`の第一引数には、ReduxのstateのプロパティとReactコンポーネントのpropsのプロパティとのマッピングをする関数である`mapStateToProps()`を渡す。
`mapStateToProps()`はstateの更新に応じて呼び出され、引数にstate(と現在のprops)が渡される。
`mapStateToProps()`が返すオブジェクトはReactコンポーネントに渡されるpropsにマージされる。

`connect()`の第二引数には、Storeの`dispatch()`を呼び出す処理とReactコンポーネントのpropsのプロパティとのマッピングをする関数である`mapDispatchToProps()`を渡す。
`mapDispatchToProps()`の引数には`dispatch()`が渡される。
`mapDispatchToProps()`が返すオブジェクトはReactコンポーネントに渡されるpropsにマージされる。

(`mapDispatchToProps()`は第二引数に`props`を受け取ることもできて、この場合、propsの更新に反応して呼び出されるコールバックになる。)

`connect()`を実行すると関数が返ってくる。
この関数にReactコンポーネント(Presentational Component)を渡して実行すると、Storeに接続されたReactコンポーネント(Container Component)が返ってくる。

## connect()の使い方

前回作ったStoreをHOGEボタン(これはPresentational Component)につなげるContainer Componentを書いてみる。
Container Componentのソースは`src/containers/`に入れる。

`src/containers/HogeButton.jsx`
```javascript
import React from 'react';
import Button from '@material-ui/core/Button';
import { connect } from 'react-redux';
import { hogeButtonClicked } from '../actions/actions';

function mapStateToProps(state) {
  return {
    clicked: state.hoge.clicked
  };
}

function mapDispatchToProps(dispatch) {
  return {
    onClick: function() {
      dispatch(hogeButtonClicked());
    }
  };
}

const HogeButton = connect(
  mapStateToProps,
  mapDispatchToProps,
)(Button);

export default HogeButton;
```

こんな感じ。

HOGEボタンをクリックすると、以下の流れで状態が遷移する。

1. `hogeButtonClicked()`が呼ばれて`HOGE_BUTTON_CLICKED`アクションが生成されてdispatchされる。
2. Storeの中で`state.hoge.clicked`が更新される。
3. stateの更新に反応して`mapStateToProps()`が呼び出され、その戻り値がpropsにマージされる。
4. 新しいpropsを使って、新たにHOGEボタンがレンダリングされる。

## connect()のシンプルな書き方

`mapDispatchToProps`は実はプレーンオブジェクトでもいい。
この場合、オブジェクトのキーと値はそれぞれ、propsのプロパティ名とAction Creatorにする。
(Action Creatorは`connect()`が`dispatch()`でラップしてくれる。)

```javascript
const mapDispatchToProps ⁼ {
  onClick: hogeButtonClicked,
};
```

<br>

また、`mapStateToProps`と`mapDispatchToProps`はexportするわけでも再利用するわけでもないので、`connect()`の中に直接書いてしまってもいい。
この場合、`mapStateToProps`はアロー関数で書いて、`return`は省略してしまうのがいい。

```javascript
const HogeButton = connect(
  (state) => ({
    clicked: state.hoge.clicked
  }),
  {
    onClick: hogeButtonClicked,
  },
)(Button);
```

<br>

さらに、`mapStateToProps`が受け取る`state`は、`hoge`プロパティしか興味ないので、オブジェクト分割代入をするのがいい。

```javascript
const HogeButton = connect(
  ({hoge}) => ({
    clicked: hoge.clicked
  }),
  {
    onClick: hogeButtonClicked,
  },
)(Button);
```

<br>

まとめると、以下のように書けるということ。

`src/containers/HogeButton.jsx`
```javascript
import React from 'react';
import Button from '@material-ui/core/Button';
import { connect } from 'react-redux';
import { hogeButtonClicked } from '../actions/actions';

const HogeButton = connect(
  ({hoge}) => ({
    clicked: hoge.clicked
  }),
  {
    onClick: hogeButtonClicked,
  },
)(Button);

export default HogeButton;
```

<br>

参考: [シンプルなreact-reduxのconnectの書き方](https://qiita.com/taneba/items/4d45d1075137a7dae10e)

## reselect

`mapStateToProps`はstateが更新されるたびに呼ばれるので、中で複雑な計算してたりするとアプリ全体のパフォーマンスに影響を与える。

このような問題に対応するため、stateの特定のサブツリーが更新された時だけ`mapStateToProps`の先の計算を実行できるようにするライブラリがある。
それが[relesect](https://github.com/reduxjs/reselect)。

reselectは重要なライブラリだとは思うけど、とりあえずほって先に進む。

# HogeButtonのアプリへの組み込み

作ったHogeButtonは、普通のコンポーネントと同じように使える。

`src/components/App.jsx`:
```diff
 import React from 'react';
 import styled from 'styled-components';
-import Button from '@material-ui/core/Button';
+import HogeButton from '../containers/HogeButton';
 import Fonts from '../fonts';

 const Wrapper = styled.div`
   font-size: 5rem;
 `;

 const App = () => (
   <Wrapper>
-    <Button variant="contained">
+    <HogeButton variant="contained">
       HOGE
-    </Button>
+    </HogeButton>
     <Fonts />
   </Wrapper>
 );

 export default App;
```

# Provider

全てのContainer ComponentsがReduxのStoreの変更をサブスクライブする必要があるので、それらに[Storeを渡してやらないといけない](https://redux.js.org/basics/usagewithreact#passing-the-store)。

Storeをpropsに渡して、子コンポーネントにバケツリレーさせたりして行きわたらせることも可能だけど面倒すぎる。
ので、React Reduxがもっと簡単にやる仕組みを提供してくれている。
それが[Provider](https://github.com/reduxjs/react-redux/blob/master/docs/api.md#provider)というコンポーネント。

Providerの子コンポーネントはStoreにアクセスして`connect()`を使えるようになる。
ざっくり全体をProviderで囲ってやるのがいい。

`src/index.jsx`:
```diff
 import React from 'react';
 import ReactDOM from 'react-dom';
+import { Provider } from 'react-redux';
 import App from './components/App';
+import configureStore from './configureStore';

+const store = configureStore();
 const root = document.getElementById('root');

 if (root) {
   ReactDOM.render(
-    <App />,
+    <Provider store={store}>
+      <App />
+    </Provider>,
     root,
   );
 }
```

<br>

[次回](https://www.kaitoy.xyz/2018/10/07/creating-react-redux-app-from-scratch-08/)は、ReduxにMiddlewareを追加して、非同期処理を実装する。
