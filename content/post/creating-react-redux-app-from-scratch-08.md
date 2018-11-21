+++
categories = ["Programming"]
date = "2018-10-07T13:26:22+09:00"
draft = false
eyecatch = "redux-saga.png"
slug = "creating-react-redux-app-from-scratch-08"
tags = ["react", "frontend", "redux", "redux-saga"]
title = "React + Reduxアプリケーションプロジェクトのテンプレートを作る ― その8: Redux-Saga"

+++

[React](https://reactjs.org/)と[Redux](https://redux.js.org/)を学ぶために、開発環境というかプロジェクトテンプレートをスクラッチから作っている。
(最終的な成果は[GitHub](https://github.com/kaitoy/react-redux-scaffold)に置いた。)

[前回](https://www.kaitoy.xyz/2018/10/01/creating-react-redux-app-from-scratch-07/)は[React Redux](https://redux.js.org/basics/usagewithreact)をセットアップした。

(2018/11/21更新)

{{< google-adsense >}}

# ReduxのMiddleware

Redux単体では同期的なデータフローしか実装できない。
つまり、Actionを発生させたら、即座にディスパッチされ、stateが更新される。
一方、非同期なフローとは、REST APIを呼んでその結果でstateを更新するような処理。
REST API呼び出しが非同期なわけだが、これをReduxのピュアなフローのどこで実行するのかというと、[Middleware](https://redux.js.org/advanced/middleware)で実行する。

MiddlewareはStoreの`dispatch()`をラップして、Actionをトラップして副作用を含む任意の処理をするための機能。
Middlewareの仕組みについては[この記事](https://qiita.com/pirosikick/items/d7f9e5e197a2e8aad62f)が分かりやすい。

Middlewareには例えば、発生したActionの内容と、それによるstateの変化をログに出力する[redux-logger](https://github.com/evgenyrodionov/redux-logger)がある。
デバッグに有用そうなので入れておく。

```cmd
yarn add redux-logger
```

v3.0.6が入った。

Middlewareは、Reduxの`applyMiddleware()`というAPIを使って、`createStore()`実行時に適用できる。

`src/configureStore.js`:
```diff
-import { createStore } from 'redux';
+import { createStore, applyMiddleware } from 'redux';
+import { logger } from 'redux-logger';
 import rootReducer from './reducers/rootReducer';

 export default function configureStore(initialState = {}) {
+  const middlewares = [];
+  if (process.env.NODE_ENV === `development`) {
+    middlewares.push(logger);
+  }
+
   const store = createStore(
     rootReducer,
     initialState,
+    applyMiddleware(...middlewares),
   );
   return store;
 }
```

これだけ。
これで、HOGEボタンをクリックしたときにコンソールに以下のようなログが出るようになる。
(ログは`yarn start`とかの開発モードの時だけでる。)

```
action HOGE_BUTTON_CLICKED @ 23:19:35.190
 prev state Object { hoge: {…} }
 action Object { type: "HOGE_BUTTON_CLICKED", payload: undefined }
 next state Object { hoge: {…} }
```

# 非同期処理

非同期処理をするためのMiddlewareには[redux-thunk](https://github.com/reduxjs/redux-thunk)とか[redux-promise](https://github.com/redux-utilities/redux-promise)とかがあるけど、なかでもGitHubのスター数が一番多い[Redux Saga](https://redux-saga.js.org/)を使うことにする。

```cmd
yarn add redux-saga
```

v0.16.2が入った。

<br>

因みに次にスター数が多いのがredux-thunkで、これはActionをfunctionオブジェクトで書けるようにするMiddleware。
そのfunctionの中で非同期処理をすることで、非同期なReduxフローを実現できる。
redux-sagaはredux-thunkに比べて以下の特長を持つ。

* コールバック地獄に悩まされることが無い
* Actionをプレーン且つピュアに保てるのでテストしやすい

# Redux Sagaの使い方

Redux Sagaでは、非同期処理はSagaというコンポーネントに書く。
Sagaでは、

1. ディスパッチされるActionをWatcherが監視し、
2. 特定のActionが来たらWorkerを起動し、
3. Workerが非同期処理などのTaskを実行し、
4. その結果を通知するActionをディスパッチする、

といった処理を実行する。

これらの処理は、Saga Middlewareから呼ばれる[ジェネレータ関数](https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Generator)のなかで、EffectというオブジェクトをSaga Middlewareに返すことで、Saga Middlewareに指示して実行させる。
このEffectを生成する[API](https://redux-saga.js.org/docs/api/)がRedux Sagaからいろいろ提供されている。

上記処理の1~4はそれぞれ以下のAPIで実装できる。

* `take(pattern)`: ディスパッチされるActionを監視して、`pattern`にマッチしたら取得するEffectを生成する。
* `fork(fn, ...args)`: 渡された関数`fn`をノンブロッキングで呼び出すEffectを生成する。`fn`はジェネレータか[Promise](https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Promise)を返す関数。
* `call(fn, ...args)`: 渡された関数`fn`を同期的に呼び出すEffectを生成する。`fn`はジェネレータか[Promise](https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Promise)を返す関数。
* `put(action)`: Actionオブジェクトの`action`をディスパッチするEffectを生成する。

# REST API呼び出し

非同期実行で最もよくあるのがREST API呼び出しであろう。
REST API呼び出し処理は`call()`で実行するわけだけど、`call()`にはPromiseを返す必要があるので、使うライブラリはそこを考慮しないといけない。

ざっと調べたところ、[axios](https://www.npmjs.com/package/axios)、[SuperAgent](https://www.npmjs.com/package/superagent)、[r2](https://www.npmjs.com/package/r2)あたりが選択肢。
最も人気のあるaxiosを使うことにする。

```cmd
yarn add axios
```

v0.18.0が入った。

<br>

REST API呼び出しのコードは`src/services/`に置く。

`src/services/api.js`:
```javascript
import axios from 'axios';

export const HOGE_URL = 'https://httpbin.org/get';

export function getHoge() {
  return axios.get(HOGE_URL);
}
```

`getHoge()`はGETリクエストを送ってPromiseオブジェクトを返す。
このPromiseオブジェクトはレスポンスボディやステータスコードを保持する[Response](https://github.com/axios/axios#response-schema)オブジェクトに解決される。

# REST API呼び出しを表現するAction

REST API呼び出しをする場合、呼び出し開始、呼び出し成功、呼び出し失敗の3種類のActionで表現するのが一つの[プラクティス](https://redux.js.org/advanced/asyncactions)。
これら3種類を、同一のtypeのActionのプロパティ値を変えて表現するやりかたもあるけど、ここでは別々のtypeのアクションとする。

`src/actions/actionTypes.js`:
```diff
 export const HOGE_BUTTON_CLICKED = 'HOGE_BUTTON_CLICKED';
+export const HOGE_FETCH_SUCCEEDED = 'HOGE_FETCH_SUCCEEDED';
+export const HOGE_FETCH_FAILED = 'HOGE_FETCH_FAILED';
```

`src/actions/actions.js`:
```diff
 import {
   HOGE_BUTTON_CLICKED,
+  HOGE_FETCH_SUCCEEDED,
+  HOGE_FETCH_FAILED,
 } from './actionTypes';

 export function hogeButtonClicked(payload) {
   return {
     type: HOGE_BUTTON_CLICKED,
     payload,
   };
 }
+
+export function hogeFetchSucceeded(payload, meta) {
+  return {
+    type: HOGE_FETCH_SUCCEEDED,
+    payload,
+    meta,
+  };
+}
+
+export function hogeFetchFailed(payload) {
+  return {
+    type: HOGE_FETCH_FAILED,
+    error: true,
+    payload,
+  };
+}
```

# Sagaの実装

Sagaのソースは`src/sagas/`に置く。

`HOGE_BUTTON_CLICKED`が来たら`getHoge()`を実行するSagaは以下のような感じ。

`src/sagas/hoge.js`:
```javascript
import { call, fork, put, take } from 'redux-saga/effects';
import { getHoge } from '../services/apis';
import { HOGE_BUTTON_CLICKED } from '../actions/actionTypes';
import { hogeFetchSucceeded, hogeFetchFailed } from '../actions/actions';

// Task
function* fetchHoge() {
  try {
    const response = yield call(getHoge);
    const payload = response.data;
    const meta = { statusCode: response.status, statusText: response.statusText };
    yield put(hogeFetchSucceeded(payload, meta));
  } catch (ex) {
    yield put(hogeFetchFailed(ex));
  }
}

// Watcher
export function* watchHogeButtonClicked(): Generator<any, void, Object> {
  while (true) {
    const action = yield take(HOGE_BUTTON_CLICKED);
    yield fork(fetchHoge, action); // actionはfetchHogeの引数に渡される。使ってないけど…
  }
}
```

Watcherは`take`して`fork`するのを無限ループで回すのが常なので、これをもうちょっときれいに書けるAPIが用意されていて、以下のように書ける。

```javascript
import { takeEvery } from 'redux-saga/effects'

// Watcher
export function* watchHogeButtonClicked(): Generator<any, void, Object> {
  yield takeEvery(HOGE_BUTTON_CLICKED, fetchHoge)
}
```

この場合、`fetchHoge()`の最後の引数に`take`したActionオブジェクトが渡される。

<br>

で、今後Watcherはモジュールを分けていくつも書いていくことになるので、それらをまとめて起動するためのモジュール`rootSaga.js`を作って、そこで各Watcherを`import`して`call()`したい。
`call()`はブロッキングなAPIなので、パラレルに実行するために`all()`を使う。

`src/sagas/rootSaga.js`:
```javascript
import { call, all } from 'redux-saga/effects';
import { watchHogeButtonClicked } from './hoge';

export default function* rootSaga() {
  yield all([
    call(watchHogeButtonClicked),
    // call(watchAnotherAction),
    // call(watchYetAnotherAction),
  ]);
}
```

そもそもブロッキングな`call()`を使うのがだめなので、代わりに`fork()`を使ってもいい。

`src/sagas/rootSaga.js`:
```javascript
import { fork } from 'redux-saga/effects';
import { watchHogeButtonClicked } from './hoge';

export default function* rootSaga() {
  yield fork(watchHogeButtonClicked);
  // yield fork(watchAnotherAction);
  // yield fork(watchYetAnotherAction);
}
```

どっちがいいんだろう。

# Saga Middlewareの追加と起動

Saga Middlewareは以下のように追加して起動する。

`src/configureStore.js`:
```diff
 import { createStore, applyMiddleware } from 'redux';
+import createSagaMiddleware from 'redux-saga';
 import { logger } from 'redux-logger';
+import rootSaga from './sagas/rootSaga';
 import rootReducer from './reducers/rootReducer';

+const sagaMiddleware = createSagaMiddleware();

 export default function configureStore(initialState = {}) {
   const middlewares = [];
   if (process.env.NODE_ENV === `development`) {
     middlewares.push(logger);
   }
+  middlewares.push(sagaMiddleware);

   const store = createStore(
     rootReducer,
     initialState,
     applyMiddleware(...middlewares),
   );
+  sagaMiddleware.run(rootSaga);
   return store;
 }
```

<br>

[次回](https://www.kaitoy.xyz/2018/11/02/creating-react-redux-app-from-scratch-09/)は[React Router](https://reacttraining.com/react-router/)。
