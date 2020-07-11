+++
categories = ["Programming"]
title = "Reduxのモジュールアーキテクチャパターンre-ducksの実践 ― Reducer with immer"
date = "2020-07-11T17:33:12+09:00"
tags = ["react", "redux", "re-ducks", "typescript", "immer"]
draft = false
cover = "immer-logo.png"
slug = "re-ducks-reducers-with-immer"
highlight = true
highlightStyle = "monokai"
highlightLanguages = []
+++

[2018年後半](https://www.kaitoy.xyz/2018/11/26/creating-react-redux-app-from-scratch-11/)にスクラッチから作った[ReactとReduxのプロジェクトテンプレート](https://github.com/kaitoy/react-redux-scaffold)を2020年版として色々アップデートしているなかで、[re-ducks](https://github.com/alexnm/re-ducks)パターンに則ってステート管理のモジュール構成を整理しなおしたり、ステート管理に使うライブラリを見直したりした。

この記事では、[前回](https://www.kaitoy.xyz/2020/07/05/re-ducks-actions/)に続いて、[React-Redux](https://react-redux.js.org/)、[Redux Saga](https://redux-saga.js.org/)、[immer](https://immerjs.github.io/immer/docs/introduction)、[normalizr](https://github.com/paularmstrong/normalizr)、[reselect](https://github.com/reduxjs/reselect)を使ったre-ducksパターンの実践について書く。

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
今回は`reducers.ts`と`store.ts`について書く。

# Reducer
`reducers.ts`にはReducer、Stateの型、初期Stateを書く。

Reducerは、現在のStateとdispatchされたActionを受け取って次のStateを返す関数で、`(previousState, action) => nextState`という形式のもの。
ReducerはStoreに一つだけ登録できて、Storeに任意のActionがdispatchされる度に1回ずつ呼び出される。

State全体を一つのフラットなReducerで処理するのはかなり厳しいので、普通は、ルートReducerでStateをサブツリーに分解して、それぞれのサブツリーをサブReducerに渡して処理させて、その結果をルートReducerでまとめて返す、という[分割統治をする](https://redux.js.org/basics/reducers#splitting-reducers)。
このような分割統治のために、[combineReducers()](https://redux.js.org/api/combinereducers)というヘルパー関数がReduxから提供されている。

# re-ducksとReducer

re-ducks流の分割統治では、Stateをduckごとに分割して、duckごとのReducerに処理させる。
例えば、userとarticleというduckがあるとすると、Stateの型は次のようになる。

```javascript
{
  user: UserState;
  article: ArticleState;
}
```

で、UserStateを計算するサブReducerと、ArticleStateを計算するサブReducerを書いて、`combineReducers()`で統合してルートReducerを生成する、という感じ。

`reducers.ts`に書くのはduckごとのサブReducerとなる。

# immer
Reducerを書くときは、副作用が無く参照透過性のある[純粋関数でなければいけない](https://redux.js.org/style-guide/style-guide#reducers-must-not-have-side-effects)ことに注意する。
つまり、Ajax通信をしたり、Actionをdispatchしたり、UUIDなどのランダムな値の生成とかはNG。
そういうのはSagaとかに書くべし。
さらに、受け取ったStateとかActionを変更してもいけない。
とくにStateは注意で、ReducerにはStateの計算処理を書くので、Stateに配列とかオブジェクトがあるとうっかり変更してしまうことがあるし、変更しないようにすると配列やオブジェクトのクローンをする記述が多くなって煩雑。

そこを助けてくれるのがimmer。
immerは、Reducerに渡された現在のStateを[Proxy](https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Proxy)でラップして、Proxyに対する操作とラップしたStateを基に新しいStateを生成してくれる。
ProxyはStateを透過的にラップしつつStateを変更から守ってくれるので、ユーザはStateを直接いじっているかのようにコードを書けて、且つうっかり変更してしまうという恐れから解放される。

immerは軽量で、提供するAPIはほぼ[produce()](https://immerjs.github.io/immer/docs/produce)しかない。
`produce()`を使うとReducerは以下のように書ける。

`src/state/ducks/user/reducers.ts`:
```javascript
import produce from 'immer';

const initialState = {};

export const userReducer = produce((draft, action) => {
  switch (action.type) {
    case 'user/entitiesFetchSucceeded':
      draft.entities = action.payload.user.entities;
      draft.fetching = false;
      break;
    case 'user/entitiesFetchFailed':
      draft.fetching = false;
      break;
  };
}, initialState)
```

このように、`produce()`にReducerの処理を実装する関数と初期Stateを渡してやると、元のStateをいじる恐れのないReducerを生成してくれる。

`produce()`に渡す関数は`draft`と`action`を受け取る。
`draft`は、生成するReducerが受け取るStateをProxyでラップしたもので、そのStateと同じプロパティを持っていて、直接変更していい。
`actoin`は生成するReducerが受け取るAction。

`produce()`に渡す関数を書くときのtipsは以下。

- draftをreturnする必要はない。してもいいけど。
- draftのプロパティの操作はいいけど、draft自体への代入(e.g. `draft = {}`)はNG。
- draftと関係ないオブジェクトを返すのは一応リーガル。ふつうやらないだろうけど。

なお、immerに特にオプションを与えなければ、`produce()`で作ったReducerは開発ビルドでは[freeze](https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze)したStateを返すので、Stateを使う側でいじっちゃってる箇所が無いかをチェックアウトしやすい。

因みに、Stateを変更から守るのに昔は[Immutable.js](https://immutable-js.github.io/immutable-js/)が人気だったけど、Immutable.jsを使うとクラスをたくさん書かなければいけなかったり、Reducerの処理が書き辛くなったり、型が消えたりするので、現代ではRedux公式も[immerを推奨している](https://redux.js.org/style-guide/style-guide#use-immer-for-writing-immutable-updates)。

# Stateの型
Stateの型も`reducers.ts`に書いておくのがいい。最もStateを触るのがReducerなので、近いところに書いておいて、変更しやすくする意図だ。

ひとつの`reducers.ts`に書くのは、Stateのうち、duckが管轄する範囲のサブツリーの型だけ。
例えば、

`src/state/ducks/user/reducers.ts`:
```javascript
import {
  User,
  NormalizedUsers,
} from './models';

export type UserState = Readonly<{
  dataReady: boolean;
  data: {
    ids: User['id'][];
    entities: NormalizedUsers;
  };
}>;
```

こんな感じ。

Stateにはドメインモデルのオブジェクトを入れることが多いけど、モデル自体の型(など)は`models.ts`に書いておいてimportする。
(`models.ts`については別の記事で。)

なお、Stateオブジェクトは[Redux DevTools](https://github.com/reduxjs/redux-devtools)で扱えるようにシリアライズ可能に保つというのが[Redux公式から強く推奨されている](https://redux.js.org/style-guide/style-guide#do-not-put-non-serializable-values-in-state-or-actions)のに注意。
これはつまり、[Map](https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Map)、[Set](https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Set)、[Promise](https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Promise)、クラスのインスタンス、関数オブジェクトをいれてはだめということ。

# Reducerの型
immerのところに書いたReducerには型を付けてなかったけど、以下のように付けるといい。

`src/state/ducks/user/reducers.ts`:
```javascript
import produce, { Draft } from 'immer';
import {
  usersFetchSucceeded,
  usersFetchFailed,
} from './actions';
import {
  User,
  NormalizedUsers,
} from './models';

export type UserState = Readonly<{
  dataReady: boolean;
  data: {
    ids: User['id'][];
    entities: NormalizedUsers;
  };
}>;

const initialState: UserState = {
  dataReady: false,
  data: { ids: [], entities: {} },
};

export const userReducer = produce(
  (
    draft: Draft<UserState>,
    action:
      | ReturnType<typeof usersFetchSucceeded>
      | ReturnType<typeof usersFetchFailed>,
  ) => {
  switch (action.type) {
    case 'user/entitiesFetchSucceeded':
      draft.entities = action.payload.user.entities;
      draft.fetching = false;
      break;
    case 'user/entitiesFetchFailed':
      draft.fetching = false;
      break;
    default:
      const _: never = action;
  };
}, initialState)
```

ポイントは3つ。

- `draft`の型は、immerが提供する`Draft`という型に、Stateの型をパラメータとして渡すと作れる。
- `action`の型は、Reducerが扱うべきAction一通りのAction Creatorを`actoins.ts`からimportして、それらに[ReturnType](https://www.typescriptlang.org/docs/handbook/utility-types.html#returntypet)を適用してActionの型を抽出し、[Union型](https://www.typescriptlang.org/docs/handbook/advanced-types.html#union-types)でまとめる形で付ける。

    [Actionの型は文字列リテラル型](https://www.kaitoy.xyz/2020/07/05/re-ducks-actions/#action-creator)なので、これでcase文に書く`type`に補完と型チェックが利く。

- default節で`action`を[never型](https://www.typescriptlang.org/docs/handbook/basic-types.html#never)に代入することで、`action`のUnion型に入れたActionがすべてcase文で受けられていることを保証できる。つまり、caseが足らないと、default節に入るactionの可能性が残り、never型に代入できないのでエラーになる。


`action`の型をReducerが扱うものに限定はしているけど、Reducerは実際にはすべてのActionのdispatchに対して呼び出されるということに注意。
default節で`console.log(action)`しておくと、Actionがじゃんじゃん表示されることが確認できる。

# Stateの型とReducerをduckからexport
`reducers.ts`があるディレクトリに置いた`index.ts`でStateの型とReducerを再exportしておくと捗る。

`src/state/ducks/user/index.ts`:
```javascript
export { UserState, userReducer } from './reducers';
```

# StateとReducerの統合
各duckからexportしたStateの型とReducerは、ducksディレクトリ直下の`index.ts`でまとめる。

`src/state/ducks/index.ts`:
```javascript
import { UserState userReducer as user } from './user';
import { ArticleState, articleReducer as article } from './article';

export type StoreState = Readonly<{
  user: UserState;
  article: ArticleState;
}>;

export const reducers = {
  user,
  article,
};
```

このファイルはduckが増えたときだけ修正が必要。
ここでexportした`reducers`は`store.ts`で`combineReducers()`に入れて統合し、Storeに登録する。

`src/state/store.ts`:
```javascript
import { createStore, applyMiddleware, compose, combineReducers } from 'redux';
import { reducers } from './ducks';

const rootReducer = combineReducers(reducers);

export default function configureStore() {
  const middlewares = [];
  const composeEnhancers = (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
  const store = createStore(rootReducer, composeEnhancers(applyMiddleware(...middlewares)));
  return store;
}
```

このファイルは一回書いたら修正は不要。

`middlewares`はredux-sagaを入れるんだけど、それについては別の記事で書く。

因みにこの`configureStore()`は、ソースのルートの`index.tsx`で使う。

`src/index.tsx`:
```javascript
import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import configureStore from '~/state/store';


const root = document.getElementById('root');
const store = configureStore();

if (root) {
  ReactDOM.render(
    <Provider store={store}>
      <AppRoutes />
    </Provider>,
    root,
  );
}
```
