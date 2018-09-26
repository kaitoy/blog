+++
categories = ["Programming"]
date = "2018-09-26T23:03:04+09:00"
draft = false
eyecatch = "redux.png"
slug = "creating-react-redux-app-from-scratch-06"
tags = ["react", "frontend", "redux"]
title = "React + Reduxアプリケーションプロジェクトのテンプレートを作る ― その6: Redux"

+++

[React](https://reactjs.org/)と[Redux](https://redux.js.org/)を学ぶために、開発環境というかプロジェクトテンプレートをスクラッチから作っている。
(最終的な成果は[GitHub](https://github.com/kaitoy/react-redux-scaffold)に置いた。)

[前回](https://www.kaitoy.xyz/2018/09/06/creating-react-redux-app-from-scratch-05/)はMaterial-UIをセットアップした。

{{< google-adsense >}}

# Reactの状態管理

Reactによるプログラミングをするとき、小さいUIコンポーネントをたくさん作って、それらを組み合わせてVirtual DOMツリーを作っておいて、そこにpropsをほうりこんでレンダリングする、という感じになる。
また、レンダリングした後はコンポーネントのstateをいじって状態を変化させる。

このpropsやstateの扱いをReactの状態管理という。
propsやstateを適当にアドホックに設定してると、結局jQuery使ってるのとそんなに変わらなくなって辛くなるので、Reactの開発元であるFacebookは[Flux](https://facebook.github.io/flux/)というアーキテクチャを提案している。

![Flux](https://github.com/facebook/flux/raw/master/docs/img/flux-diagram-white-background.png "Flux")

<br>

Fluxでは、単一の(またはドメイン毎くらいの単位の)オブジェクトでアプリケーション全体の状態(state)を表し、これをStoreに保持する。
ReactはStoreが保持するstateを受け取り、それをもとにViewをレンダリングする。
Viewに対するユーザの操作(など)はActionというオブジェクトで表現され、Dispatcherに渡され、Dispatcherに登録されたcallbackを通してstateを変化させる。

データが常に一方向に流れて見通しがよく、各コンポーネントの独立性が高いのが特徴。
各コンポーネントは、受け取ったデータをピュアに処理すればよく、リアクティブにファンクショナルに実装できる。

# Redux

Fluxの実装、というか発展形がRedux。

ReduxではFluxのDispatcher辺りがReducerに置き換わっている。
ReducerはActionと現在のstateから次のstateを計算する純粋関数。

また、ReduxからはViewが切り離されていて、Actionによってstateを更新する状態管理ライブラリの役割に徹している。
ReactコンポーネントのイベントハンドラからActionオブジェクトを生成したり、更新したstateをReactに渡したりするつなぎ目は、別途[React Redux](https://github.com/reduxjs/react-redux)というライブラリが担当する。

ReduxとReact Reduxについては、Qiitaの「[たぶんこれが一番分かりやすいと思います React + Redux のフロー図解](https://qiita.com/mpyw/items/a816c6380219b1d5a3bf)」という記事が分かりやすい。

今回はReduxを導入する。

```cmd
yarn add redux
```

Redux v4.0.0が入った。

以降、現時点で唯一のUIコンポーネントであるHOGEボタンの状態管理を実装してみる。

## Action

まず[Action](https://redux.js.org/basics/actions)を実装する。

Actionオブジェクトはどんな形式でもいいけど、普通は[Flux Standard Action](https://github.com/redux-utilities/flux-standard-action)(FSA)にする。
FSAは以下のプロパティを持つプレーンオブジェクト。

* type: Action種別を示す文字列定数。必須。
* payload: Actionの情報を示す任意の型の値。任意。
* error: Actionがエラーを表すものかを示す boolean プロパティ。エラーなら true にして、payload にエラーオブジェクトをセットする。任意。
* meta: その他の情報を入れる任意の型の値。任意。

Actionのコードは、Actionのtypeに入れる値を定義する`actionTypes.js`と、Action Creator(i.e. Actionオブジェクトを生成する関数)を定義する`actions.js`からなり、ともに`src/actions/`に置く。

HOGEボタンをクリックしたときのAction、`HOGE_BUTTON_CLICKED`を定義してみる。

`src/actions/actionTypes.js`:
```javascript
export const HOGE_BUTTON_CLICKED = 'HOGE_BUTTON_CLICKED';
```

`src/actions/actions.js`:
```javascript
import {
  HOGE_BUTTON_CLICKED,
} from './actionTypes';

export function hogeButtonClicked(payload) {
  return {
    type: HOGE_BUTTON_CLICKED,
    payload,
  };
}
```

こんな感じ。

## Reducer

次は[Reducer](https://redux.js.org/basics/reducers)。

Reducerは、上記Action Creatorが生成するActionオブジェクトに対応して起動し、Store(後述)から現在のstateオブジェクトを受け取って、Actionオブジェクトのpayloadの値(など)に応じて新しいstateオブジェクトを作る。

Reducerを書く前に、stateオブジェクトの構造を設計しておくことが推奨されている。
UIコンポーネント毎にプロパティを分けて、コンポーネント構造と同様の階層構造にしておけばだいたいよさそう。

HOGEボタンに一つ、クリックしたかどうかの状態(`clicked`)を持たせるとすると、stateオブジェクトは以下のようになる。

```javascript
{
  hoge: {
    clicked: false,
  },
}
```

<br>

Reducerはピュアじゃないといけないので、内部で[副作用](https://ja.wikipedia.org/wiki/%E5%89%AF%E4%BD%9C%E7%94%A8_(%E3%83%97%E3%83%AD%E3%82%B0%E3%83%A9%E3%83%A0)を起こしてはいけない。
副作用とは、具体的には以下のようなもの。

* 引数で与えられたオブジェクトを変更する。
* REST APIへのリクエストを送る。

(ログの出力も厳密には副作用なんだろうけど、それは許されてる気がする。)

また、ピュアであるためには[参照透過性](https://ja.wikipedia.org/wiki/%E5%8F%82%E7%85%A7%E9%80%8F%E9%81%8E%E6%80%A7)を持たないといけなくて、つまり同じ引数に対しては同じ戻り値を返さないといけないので、内部で`Date.now()`とか`Math.random()`とかを呼ぶのもダメ。

<br>

Reducerのコードは`src/reducers/`に置く。

`HOGE_BUTTON_CLICKED`が発生したら、`hoge`の`clicked`を`true`にするReducer(`hoge()`)は以下の感じに書ける。

`src/reducers/reducers.js`:
```javascript
import { HOGE_BUTTON_CLICKED } from '../actions/actionTypes';

const initialState = {
  hoge: {
    clicked: false,
  },
};

export function hoge(state = initialState, action) {
  switch (action.type) {
    case HOGE_BUTTON_CLICKED:
      const newHoge = {
        hoge: {
          clicked: true,
        },
      };
      return Object.assign({}, state, newHoge);
    default:
      return state;
  }
}
```

`hoge()`のポイントはたくさんある。

* `state`と`action`を引数に取る。前者が現在の状態を表すstateオブジェクトで、後者がActionオブジェクト。
* 戻り値は新しい状態を表すstateオブジェクト。
* actionオブジェクトはどのActionを表すものかは分からないので、`action.type`を見て`HOGE_BUTTON_CLICKED`だけを処理するようにする。
    * 知らないActionだったら(i.e. `default`句のなかに来たら)、受け取ったstateオブジェクトをそのまま返す。
* アプリケーションの初期化時には`state`に`undefined`が渡されるので、それに備え、初期状態である`initialState`をデフォルト引数に設定する。
* 渡されたstateオブジェクトを変更してはいけないので、[Object.assgin()](https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Object/assign)に空オブジェクト`{}`とともに`state`を渡してコピーする。
    * `Object.assgin()`の代わりに[オブジェクト分割代入](https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment#%E3%82%AA%E3%83%96%E3%82%B8%E3%82%A7%E3%82%AF%E3%83%88%E3%81%AE%E5%88%86%E5%89%B2%E4%BB%A3%E5%85%A5)を使う方法も[ある](https://redux.js.org/recipes/usingobjectspreadoperator)。この場合[babel-plugin-transform-object-rest-spread](https://babeljs.io/docs/en/babel-plugin-transform-object-rest-spread)が必要。
* `Object.assign()`の第三引数に`newHoge`で上書きするようにしている。
    * 今はstateオブジェクトのプロパティが`hoge`一つだけなので単に`newHoge`をreturnしても結果は一緒。なので無駄なことをしてるようにも見えるけど、stateオブジェクトのプロパティが増えた場合に`hoge`以外に影響を与えないための計らい。

<br>

これはこれでいい感じに見えるけど、`hoge()`が`hoge`プロパティしか扱わないのに、stateオブジェクト全体を渡しているのがイケていない。
(まあ今はstateオブジェクトには`hoge`プロパティしかないんだけど、他のプロパティが色々増えてくるとイケてない感が高まる。)
`hoge`プロパティがstateオブジェクト構造のどこにあるかを`hoge()`が気にしないといけないのもイケてない。
`hoge()`には`hoge`プロパティだけを見てほしい。

ということで、普通はReducerは分割して書いて、それぞれのReducerにstateオブジェクトを分割して渡してやる。

`src/reducers/reducers.js`:
```diff
 import { HOGE_BUTTON_CLICKED } from '../actions/actionTypes';

-const initialState = {
-  hoge: {
-    clicked: false,
-  },
-};

-export function hoge(state = initialState, action) {
+export function hoge(state = { clicked: false }, action) {
   switch (action.type) {
     case HOGE_BUTTON_CLICKED:
       const newHoge = {
-        hoge: {
-          clicked: true,
-        },
+        clicked: true,
       };
       return Object.assign({}, state, newHoge);
     default:
       return state;
   }
 }

+export function rootReducer(state = {}, action) {
+  return {
+    hoge: hoge(state.hoge, action),
+  }
+}
```

こんな感じで、`rootReducer()`がstateオブジェクトを分割して子Reducerを呼び出す。
孫Reducerとか曾孫Reducerとかがあってもいい。

<br>

`rootReducer()`は別のファイルに書くと見やすくなるし、Reduxの[combineReducers()](https://redux.js.org/api/combinereducers)というヘルパー関数を使うともっと楽に書ける。
上記`reducers.js`からは`rootReducer()`を削除して、`rootReducer.js`に以下のように書く。

`src/reducers/rootReducer.js`:
```javascript
import { combineReducers } from 'redux';
import hoge from './reducers';

const rootReducer = combineReducers({
  hoge,
});
export default rootReducer;
```

このように`combineReducers()`で作った`rootReducer`は、上で自前で書いた`rootReducer`と全く同じ動きをする。

さらに簡単に、以下のようにも書ける。

`src/reducers/rootReducer.js`:
```javascript
import { combineReducers } from 'redux';
import * as reducers from './reducers';

const rootReducer = combineReducers(reducers);
export default rootReducer;
```

こうしておけば、Reducerの追加は`reducers.js`に関数を追加するだけでよくなる。

[redux-actions](https://github.com/redux-utilities/redux-actions)を使うとさらに記述を簡略化できるみたいだけど、逆に何が何だか分からなくなりそうだったので、慣れるまでは使わないでおく。

## Store

[Store](https://redux.js.org/basics/store)は以下のような特徴を持つオブジェクト。

* `getState()`でstateオブジェクトを返す。
* `dispatch(action)`でActionをディスパッチできる。
* `subscribe(listener)`でActionのディスパッチをサブスクライブできる。

StoreはrootReducerを[createStore()](https://redux.js.org/api/createstore)に渡すことで作れる。
`createStore()`を呼ぶコードはモジュールにしておくのがいい。
後で膨らんでくるので。

`src/configureStore.js`:
```javascript
import { createStore } from 'redux';
import rootReducer from './reducers/rootReducer';

export default function configureStore(initialState = {}) {
  const store = createStore(
    rootReducer,
    initialState,
  );
  return store;
}
```

これだけ。

<br>

以上でReduxのコンポーネントが一通りそろって、状態管理システムができた。
試しに動かしてみる。

`src/try.js`:
```javascript
import { hogeButtonClicked } from './actions/actions';
import configureStore from './configureStore';

const store = configureStore();
console.log(store.getState()); // => { hoge: {clicked: false} }

store.subscribe(() => {
  console.log(store.getState());
});

store.dispatch(hogeButtonClicked()); // => { hoge: {clicked: true} }
```

`store.dispatch()`するとReducer(`hoge()`)が実行され、stateオブジェクトが更新されることが分かる。
