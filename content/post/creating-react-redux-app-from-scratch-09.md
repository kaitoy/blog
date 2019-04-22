+++
categories = ["Programming"]
date = "2018-11-02T13:45:56+09:00"
draft = false
cover = "react-router-seeklogo.com.svg"
slug = "creating-react-redux-app-from-scratch-09"
tags = ["react", "frontend", "redux", "react-router"]
title = "React + Reduxアプリケーションプロジェクトのテンプレートを作る ― その9: React Router"

+++

[React](https://reactjs.org/)と[Redux](https://redux.js.org/)を学ぶために、開発環境というかプロジェクトテンプレートをスクラッチから作っている。
(最終的な成果は[GitHub](https://github.com/kaitoy/react-redux-scaffold)に置いた。)

[前回](https://www.kaitoy.xyz/2018/10/07/creating-react-redux-app-from-scratch-08/)は[Redux Saga](https://redux-saga.js.org/)をセットアップした。

(2018/11/21更新)

{{< google-adsense >}}

# フロントエンドのルーティング

Webアプリケーションにおけるルーティングとは、クライアントがリクエストしたURLに対して、返すべきリソースを選択する処理。
昔はバックエンド(i.e. サーバサイド)でやってたけど、バックエンドでリソースを返すということは、ページ遷移が発生するということなので、ネイティブアプリケーションに比べてUXが落ちてしまう。

一方、ページ遷移を発生させないようにAjaxでサーバとやりとりしつつ、ちまちまDOMをいじるのは大変。
DOMをごっそり書き換えて、ページ遷移なしに画面を切り替えることはできるけど、ナイーブにやると以下のような問題がある。

* URLと画面の紐づけがなく、URLを指定して直接開けない
* ブラウザの進む、戻るが使えない
* 宣言的に書けない

こういった問題に対応するため、フロントエンドでのルーティング技術が生まれた。

フロントエンドのルーティングでは、URLが変わってもリクエストはサーバに飛ばない。
代わりに、フロントエンドフレームワークがそのURLを見て、適切な画面を選んでレンダリングする。

## ハッシュベースのルーティング

URLが変わってもリクエストがサーバに飛ばないとは何事か。

それを実現するやりかたは2通りある。
古くはハッシュ(#、[フラグメント識別子](https://en.wikipedia.org/wiki/Fragment_identifier))をつかったやり方。

例えば、`http://example.com/`でUIをサーブしているとすると、`http://example.com/#foo`とか、`http://example.com/#bar`で別々のページの状態を表現する。
ハッシュ以降が変わってもブラウザがサーバにリクエストを投げることはないので、クライアント側でハンドリングできる。
(因みに、ハッシュを含んだURLをブラウザのアドレスバーに入れても、ハッシュを除いたURLでリクエストが送られる。この挙動の根拠となる規格はRFCなどを調べても見つからなかったけど…)

ハッシュの書き換えは、JavaScriptで以下のようにしてできる。

```javascript
location.hash = newHash;
```

こういう処理を、例えばWeb UIのボタンをクリックしたときなんかに実行してURLを変えて、その上で画面を更新してやればいい。

そのあと、ブラウザの戻るボタンなんかを押されると書き換える前のURLにもどるわけだけど、これを検知するために`setInterval()`とかで定期的に`location.hash`を監視してたりした。

## History APIによるルーティング

ハッシュベースのルーティングは見るからにしょぼい。
URLのハッシュ以降しか使えないのもしょぼいし、内部の処理も泥臭い。

これが、HTML 5で[History API](https://developer.mozilla.org/ja/docs/Web/API/History)がでて変わった。
History APIはJavaScriptのAPIで、ブラウザの履歴を操作できる。

```javascript
const state = { hoge: "hogeee" };
history.pushState(state, "", "/foo/bar");
```

こんな感じのを実行すると、URLが`/foo/bar`に変わる。(が、もちろんサーバにはリクエストは飛ばない。)
で、ブラウザの戻るボタンを押すと、[popstate](https://developer.mozilla.org/en-US/docs/Web/Events/popstate)イベントが発生するので、それにイベントハンドラを登録しておけば、もとのURLに戻った時にも適時画面を書き換えられる。
popstateイベントからは、`pushState()`に渡したstateオブジェクトを取得できる。

<br>

ところで、ブラウザのアドレスバーに`/foo/bar`を直打ちするとどうなるかというと、普通にWebサーバを設定しておくと、`/foo/bar/index.html`を返そうとして、無いので404エラーになっちゃう。
ので、サーバ設定では、どのURLも同じリソース(e.g. `/index.html`)をしといて、そこからJavaScriptを呼んで、URLを読み取って、画面を描いてやればいい。

<br>

HTML 5が普及するにつれ、このようなHistory APIを使ったフロントエンドルーティングをするフレームワークやライブラリが色々出てきた。んだろうと思う。

# React Router

Reactのエコシステムとしては、[React Router](https://reacttraining.com/react-router/)がフロントエンドルーティングを実現してくれる。

React Routerは、宣言的にフロントエンドルーティングを実現できるReactコンポーネントのライブラリ。

Reduxとともに使う場合は、[Connected React Router](https://github.com/supasate/connected-react-router)を使う。
Connected React Routerには[history](https://www.npmjs.com/package/history)が必要。

```tch
yarn add react-router-dom connected-react-router history
```

React Routerはv4.3.1、Connected React Routerはv5.0.1が入った。

# Connected React Router導入

まずはConnected React Routerの[Usage](https://github.com/supasate/connected-react-router#usage)を参考に、ReduxのReducerにrouterを追加し、MiddlewareにrouterMiddlewareを追加して、historyのインスタンスをStoreとつなぐ。

`src/reducers/rootReducer.js`:
```diff
 import { combineReducers } from 'redux';
+import { connectRouter } from 'connected-react-router';
 import * as reducers from './reducers';

-const rootReducer = combineReducers(reducers);
-export default rootReducer;
+const createRootReducer = (history) =>
+  combineReducers({
+    router: connectRouter(history),
+    ...reducers,
+  });
+export default createRootReducer;
```

`src/configureStore.js`:
```diff
 import { createStore, applyMiddleware } from 'redux';
 import createSagaMiddleware from 'redux-saga';
+import { createBrowserHistory } from 'history';
+import { routerMiddleware } from 'connected-react-router';
 import { logger } from 'redux-logger';
 import rootSaga from './sagas/rootSaga';
-import rootReducer from './reducers/rootReducer';
+import createRootReducer from './reducers/rootReducer';

 const sagaMiddleware = createSagaMiddleware();
+export const history = createBrowserHistory();

 export default function configureStore(initialState = {}) {
   const middlewares = [];
   if (process.env.NODE_ENV === `development`) {
     middlewares.push(logger);
   }
+  middlewares.push(routerMiddleware(history));
   middlewares.push(sagaMiddleware);

   const store = createStore(
-    rootReducer,
+    createRootReducer(history),
     initialState,
     applyMiddleware(...middlewares),
   );
   sagaMiddleware.run(rootSaga);
   return store;
 }
```

<br>

で、Connected React RouterのConnectedRouterコンポーネントを[React ReduxのProvider](https://www.kaitoy.xyz/2018/10/01/creating-react-redux-app-from-scratch-07/#provider)の下に追加する。

`src/index.jsx`:
```diff
 import React from 'react';
 import ReactDOM from 'react-dom';
 import { Provider } from 'react-redux';
+import { ConnectedRouter } from 'connected-react-router';
 import App from './components/App';
-import configureStore from './configureStore';
+import configureStore, { history } from './configureStore';

 const store = configureStore();
 const root = document.getElementById('root');

 if (root) {
   ReactDOM.render(
     <Provider store={store}>
-      <App />
+      <ConnectedRouter history={history}>
+        <App />
+      </ConnectedRouter>
     </Provider>,
     root,
   );
 }
```

これだけ。
これで、Appコンポーネント以下でReact Routerのコンポーネントを使えるようになった。

# React Router導入

React Routerの[Redirect](https://reacttraining.com/react-router/core/api/Redirect)コンポーネントと[Route](https://reacttraining.com/react-router/core/api/Route)コンポーネントを使って、`/`にアクセスしたら`/home`にリダイレクトして、`/home`で今までと同じ画面をレンダリングするようにする。

まず、App.jsxをHome.jsxにリネームして、Homeコンポーネントに変える。

`src/components/Home.jsx`:
```diff
 import React from 'react';
 import styled from 'styled-components';
 import HogeButton from '../containers/HogeButton';
-import Fonts from '../fonts';

 const Wrapper = styled.div`
   font-size: 5rem;
 `;

-const App = () => (
+const Home = () => (
   <Wrapper>
     <HogeButton variant="contained">
       HOGE
     </HogeButton>
-    <Fonts />
   </Wrapper>
 );

-export default App;
+export default Home;
```

<br>

で、App.jsxはルーティングを定義するコンポーネントとして作り直す。

`src/components/App.jsx`:
```jsx
import React from 'react';
import { Route, Redirect } from 'react-router-dom';
import Home from './Home';
import Fonts from '../fonts';

const App = () => (
  <div>
    <Route exact path="/" render={() => <Redirect to="/home" />} />
    <Route exact path="/home" component={Home} />
    <Fonts />
  </div>
);

export default App;
```

こんな感じ。

# webpack-dev-serverのHistory API Fallback

あとは、上に書いたような404エラーを防ぐために、webpack-dev-serverの[History API Fallback](https://webpack.js.org/configuration/dev-server/#devserver-historyapifallback)を有効にしてやる。

`webpack.dev.js`:
```diff
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
+    historyApiFallback: true,
   },
 });
```

こうしておくと、`/index.html`以外にリクエストが来た場合、404エラーを返す代わりに`/index.html`を返してくれるようになる。

<br>

[次回](https://www.kaitoy.xyz/2018/11/07/creating-react-redux-app-from-scratch-10/)は[Code Splitting](https://webpack.js.org/guides/code-splitting/)と[Flow](https://flow.org/)と[Jest](https://jestjs.io/ja/)と[Enzyme](https://airbnb.io/enzyme/)。
