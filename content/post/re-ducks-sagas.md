+++
categories = ["Programming"]
title = "Reduxのモジュールアーキテクチャパターンre-ducksの実践 ― Saga"
date = "2020-07-13T12:33:12+09:00"
tags = ["react", "redux", "re-ducks", "typescript", "redux-saga"]
draft = false
cover = "redux-saga.png"
slug = "re-ducks-sagas"
highlight = true
highlightStyle = "monokai"
highlightLanguages = []
+++

[2018年後半](https://www.kaitoy.xyz/2018/11/26/creating-react-redux-app-from-scratch-11/)にスクラッチから作った[ReactとReduxのプロジェクトテンプレート](https://github.com/kaitoy/react-redux-scaffold)を2020年版として色々アップデートしているなかで、[re-ducks](https://github.com/alexnm/re-ducks)パターンに則ってステート管理のモジュール構成を整理しなおしたり、ステート管理に使うライブラリを見直したりした。

この記事では、[前回](https://www.kaitoy.xyz/2020/07/11/re-ducks-reducers-with-immer/)に続いて、[React-Redux](https://react-redux.js.org/)、[Redux Saga](https://redux-saga.js.org/)、[immer](https://immerjs.github.io/immer/docs/introduction)、[normalizr](https://github.com/paularmstrong/normalizr)、[reselect](https://github.com/reduxjs/reselect)を使ったre-ducksパターンの実践について書く。

言語は[TypeScript](https://www.typescriptlang.org/)。

<!--more-->

{{< google-adsense >}}

# モジュール構成

次節以降の解説の前提として、React・Redux・React-Redux・redux-sagaのコンポーネントアーキテクチャ図とモジュール構成を再掲しておく。

アーキテクチャ図はこれ:

![react-redux-saga](/images/re-ducks/saga.png)

モジュールはviewsとstateに分かれていて、viewsの下はReactコンポーネントが[Atomicデザイン風](https://www.kaitoy.xyz/2020/05/05/atomic-design/)に整理されていて、stateの下はReduxステート管理モジュールがre-ducksパターンで整理されている。

つまり以下のような感じ。

- src/
    - index.tsx
    - views/
        - AppRoutes.tsx
        - atoms/
        - molecules/
        - organisms/
            - DataTable.tsx
        - ecosystems/
            - user/
                - UserDataTable.tsx
        - natures/
            - user/
                - UserListView.tsx
            - article/
                - ArticleListView.tsx
    - state/
        - store.ts
        - ducks/
            - index.ts
            - user/
                - index.ts
                - actions.ts
                - apis.ts
                - reducers.ts
                - models.ts
                - sagas.ts
                - selectors.ts
                - watcherSagas.ts


これらのモジュールの中身について解説していく。
[前回](https://www.kaitoy.xyz/2020/07/05/re-ducks-actions/)は`actions.ts`を解説した。
今回は`sagas.ts`と`apis.ts`と`watcherSagas.ts`について書く。

# Worker Saga
`sagas.ts`にはAjaxコールなどの副作用やUUID生成などの不安定な処理を実行する[Saga](https://redux-saga.js.org/docs/introduction/BeginnerTutorial.html)をredux-sagaで書く。

redux-sagaについては[以前の記事](https://www.kaitoy.xyz/2018/10/07/creating-react-redux-app-from-scratch-08/)にも書いたのでさらっとだけ説明すると、Reduxのミドルウェアとして動き、Actionの取得、副作用の実行、Actionのdispatchといった処理をReducerの外で実行できるライブラリ。
これらの処理はSagaと呼ぶ[ジェネレータ関数](https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/function*)に書く。

Sagaには大きく次の二種類がある。

* Watcher Saga: StoreへのActionのdispatchをwatchしてActionを取得するSaga。
* Worker Saga: Watcher Sagaからフォークして実際に副作用とかの処理を実行するSaga。

`sagas.ts`に書くのはWorker Sagaの方で、例えばREST APIをコールするSagaは以下のような感じ。

`src/state/ducks/user/sagas.ts`:
```javascript
import { call, put, SagaReturnType } from 'redux-saga/effects';
import {
  usersFetchSucceeded,
  usersFetchFailed,
} from './actions';
import * as apis from './apis';

export function* fetchUsers() {
  try {
    const users: SagaReturnType<typeof apis.getUsers> = yield call(apis.getUsers);
    yield put(usersFetchSucceeded(users));
  } catch (ex) {
    yield put(usersFetchFailed(ex));
  }
}
```

apisモジュール(`apis.ts`)からPromiseを返す関数をimportして[call](https://redux-saga.js.org/docs/api/#callfn-args)し、その結果をactionsモジュールからimportした[Action Creator](https://www.kaitoy.xyz/2020/07/05/re-ducks-actions/)に渡してActionを生成し、[put](https://redux-saga.js.org/docs/api/#putaction)でStoreにdispatchする。
これが基本形。

[以前の記事](https://www.kaitoy.xyz/2018/10/07/creating-react-redux-app-from-scratch-08/#saga%E3%81%AE%E5%AE%9F%E8%A3%85)と違うのは、`SagaReturnType`を使って非同期APIコールのPromiseが解決する値の型を抽出して使っているところ。
apisモジュールを`*`でインポートしているのは、apisモジュールの関数名がsagasモジュールのものと被りやすいので名前空間を分ける意図なんだけど、そこは別にどうでもいい。

# Ajax通信
`apis.ts`にはAjax通信を実行してPromiseを返す関数を書いておく。

`src/state/ducks/user/apis.ts`:
```javascript
import axios from 'axios';
import { User, validateUserList } from './models';

export const client = axios.create({
  timeout: 2000,
});

export const API_USERS = '/api/v1/users';

export const getUsers = () =>
  client.get<User[]>(API_USERS).then((res) => validateKiyoshiList(res.data));
```

ここではAjaxライブラリに[axios](https://github.com/axios/axios)を使っているけど、Promise返すならなんでもいい。

axios使う場合は、Ajax通信を実行する関数(この例だと`get()`)の型パラメータでPromiseが解決する値の型を指定できる。
Ajax通信のレスポンスが実際にその型であることを保証するために、ここでバリデーションをしておくべし。
上の例のようにモデルオブジェクトを取得するような場合、モデルオブジェクトのバリデーションはmodelsモジュール(`models.ts`)の責務なので、そこからバリデーション関数をimportして使う形になる。

`models.ts`についてはまた[別の記事](https://www.kaitoy.xyz/2020/07/24/re-ducks-normalizr/)で書く。

## Watcher Saga
Watcher Sagaは`watcherSagas.ts`に書く。

```javascript
import { takeLeading } from 'redux-saga/effects';
import {
  usersBeingFetched,
} from './actions';
import { fetchUsers } from './sagas';

export function* watchUsersBeingFetched() {
  yield takeLeading(
    ({ type }: Pick<ReturnType<typeof usersBeingFetched>, 'type'>) =>
      type === 'user/entitiesBeingFetched',
    fetchUsers,
  );
}
```

Actionをwatchするのに、ここでは[takeLeading](https://redux-saga.js.org/docs/api/#takeleadingpattern-saga-args)使ってるけど、他にも使えるAPIはいくつもあるのでそこは要件に合わせて。
いずれもwatchするActionの`type`を第一引数に指定するようなAPIで、単なる文字列で指定することもできるけど、文字列リテラル型による補完と型チェックを利かせたくて上記例のようにしている。
つまり、第一引数に関数を渡すと、その関数にはdispatchされたActionが渡されるので、そこから`type`を抽出しつつ型を付けて、`type === 'user/entitiesBeingFetched'`のところで補完と型チェックを利かせている。

`watcherSagas.ts`にはこのようなwatcher関数を処理したいActionの数だけ書いてexportしておく。
逆に、Watcher Sagaじゃないものはこのモジュールからはexportしない。
これは次節の`index.ts`で再exportしやすくするため。

# Watcher Sagaをduckからexport
Watcher Sagaは、`watcherSagas.ts`があるディレクトリに置いた`index.ts`でまとめて再exportしておくと捗る。

`src/state/ducks/user/index.ts`:
```diff
+import * as watcherSagas from './watcherSagas';
+
+export const userWatcherSagas = Object.values(watcherSagas);
+
 export { UserState, userReducer } from './reducers';
```

一番下の行は[前回の記事](https://www.kaitoy.xyz/2020/07/11/re-ducks-reducers-with-immer/#state%E3%81%AE%E5%9E%8B%E3%81%A8reducer%E3%82%92duck%E3%81%8B%E3%82%89export)で書いたRedcuerとStateの再exportなのでここでは気にしなくていい。

duckのディレクトリ内の`index.ts`は、上記の3文を書いてしまえば、その後修正の必要性は出てこない。

# Sagaの統合
各duckからexportしたReducerは、ducksディレクトリ直下の`index.ts`でまとめる。

`src/state/ducks/index.ts`:
```diff
+import { all, spawn, call } from 'redux-saga/effects';
-import { UserState, userReducer as user } from './user';
-import { ArticleState, articleReducer as article } from './article';
+import { UserState, userReducer as user, userWatcherSagas } from './user';
+import { ArticleState, articleReducer as article, articleWatcherSagas } from './article';

 export type StoreState = Readonly<{
   user: UserState;
   article: ArticleState;
 }>;

 export const reducers = {
   user,
   article,
 };

+export function* rootSaga() {
+  const watchers = [...userWatcherSagas, ...articleWatcherSagas];
+
+  yield all(
+    watchers.map((saga) =>
+      spawn(function* () {
+        while (true) {
+          try {
+            yield call(saga);
+            break;
+          } catch (ex) {
+            console.exception(ex);
+          }
+        }
+      }),
+    ),
+  );
+}
```

`StoreState`と`reducers`は[前回の記事](https://www.kaitoy.xyz/2020/07/11/re-ducks-reducers-with-immer/#state%E3%81%AE%E5%9E%8B%E3%81%A8reducer%E3%82%92duck%E3%81%8B%E3%82%89export)で書いたRedcuerとStateの統合なのでここでは気にしなくていい。

各duckのWatcher Sagaの束をimportして、`rootSaga()`にそれらをまとめて`call`する処理を書いている。
これはredux-sagaのマニュアルで紹介されている[Root Saga Patternのひとつ](https://redux-saga.js.org/docs/advanced/RootSaga.html#keeping-everything-alive)で、watcher Sagaが何かしらのエラーで死んでしまったときにも再起動して動き続けられる仕組み。

この`rootSaga()`をexportしておいて、`store.ts`で生成するSaga Middlewareで実行する。

`src/state/store.ts`:
```diff
 import { createStore, applyMiddleware, compose, combineReducers } from 'redux';
+import createSagaMiddleware from 'redux-saga';
-import { reducers } from './ducks';
+import { reducers, rootSaga } from './ducks';

 const rootReducer = combineReducers(reducers);
+const sagaMiddleware = createSagaMiddleware();

 export default function configureStore() {
   const middlewares = [];
+  middlewares.push(sagaMiddleware);
   const composeEnhancers = (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
   const store = createStore(rootReducer, composeEnhancers(applyMiddleware(...middlewares)));
+  sagaMiddleware.run(rootSaga);
   return store;
 }
```

これでSagaも動くようになった。

`store.ts`はここまで書けば塩漬けできる。
