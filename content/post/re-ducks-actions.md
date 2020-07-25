+++
categories = ["Programming"]
title = "Reduxのモジュールアーキテクチャパターンre-ducksの実践 ― Action Creator"
date = "2020-07-05T20:12:33+09:00"
tags = ["react", "redux", "re-ducks", "typescript"]
draft = false
cover = "redux.png"
slug = "re-ducks-actions"
highlight = true
highlightStyle = "monokai"
highlightLanguages = []
+++

[2018年後半](https://www.kaitoy.xyz/2018/11/26/creating-react-redux-app-from-scratch-11/)にスクラッチから作った[ReactとReduxのプロジェクトテンプレート](https://github.com/kaitoy/react-redux-scaffold)を2020年版として色々アップデートしているなかで、[re-ducks](https://github.com/alexnm/re-ducks)パターンに則ってステート管理のモジュール構成を整理しなおしたり、ステート管理に使うライブラリを見直したりした。

この記事では、[前回](https://www.kaitoy.xyz/2020/05/27/re-ducks/)の続きで、[React-Redux](https://react-redux.js.org/)、[Redux Saga](https://redux-saga.js.org/)、[immer](https://immerjs.github.io/immer/docs/introduction)、[normalizr](https://github.com/paularmstrong/normalizr)、[reselect](https://github.com/reduxjs/reselect)を使ったre-ducksパターンの実践について書く。

言語は[TypeScript](https://www.typescriptlang.org/)。

<!--more-->

{{< google-adsense >}}

# モジュール構成

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

理解を助けるため、[前回](https://www.kaitoy.xyz/2020/05/27/re-ducks/)書いたReact、Redux、React-Redux、redux-sagaのコンポーネントアーキテクチャ図を再掲しておく。

![react-redux-saga](/images/re-ducks/saga.png)

# Action

`actions.ts`にはAction Creatorを書く。
Action CreatorはReduxのStoreにdispatchするActionを生成して返す関数なので、Action Creator自体のまえにActionについて解説しておく。

Actionは[Flux Standard Action (FSA)](https://github.com/redux-utilities/flux-standard-action)に従ったものにするべきで、これは以下のプロパティを持つプレーンなオブジェクト。

- `type`: Actionの意味を表す文字列。ReducerやSagaはここを見て実行する処理を決定する。
- `payload`: Reducerによる状態計算とかSagaによる副作用の実行に必要なデータを渡すために使う任意の型のオブジェクト。
- `error`: Actionがエラーを表すものかどうかを示すフラグ。
- `meta`: `payload`に入れる感じでもないかなというメタ情報を入れる任意の型のオブジェクト。

型で見ると以下の感じ。

```javascript
{
  type: string;
  payload?: object;
  error?: boolean;
  meta?: object;
}
```

<br>

`type`は、

- FSAであるためにはstringであればいいけど、[文字列リテラル型](https://typescript-jp.gitbook.io/deep-dive/type-system/literal-types#riteraru)にしておくとエディタの補完が利いたり型チェックが利いてうれしい。
- [domain/eventName](https://redux.js.org/style-guide/style-guide#write-action-types-as-domaineventname)というコンベンションで書くのがいい。つまり、ドメインで名前空間を分けて、キャメルケースで書く。ドメインは大抵はモデル名にしておけばいい。(ただし、そのドメインのReducerやSaga__だけ__がそのActionに反応するというわけでは__必ずしもない__。)
- `eventName`の部分は[命令的より宣言的](https://medium.com/magnetis-backstage/why-action-is-a-bad-name-for-a-redux-action-68bec375539e)であるべき。([AffectよりEffect、動詞的より名詞的](https://decembersoft.com/posts/a-simple-naming-convention-for-action-creators-in-redux-js/)という意見もあるけど、意図することはだいたい同じな気がする。)特に、[setXXXXみたいなsetterにしてしまうのはありがちな間違い](https://mobile.twitter.com/dan_abramov/status/800310624009994240)。ReduxはView側で何が起こったかと、それによってStateがどう変わるかとを分離することで保守性を高めるライブラリだけど、setterなActionは明らかにそれらがごっちゃになっている。ごっちゃになると、Stateの内部構造がView側のイベントハンドラ(など)に[リーク](https://en.wikipedia.org/wiki/Leaky_abstraction)して、Reduxのうまみが減る。
- `eventName`を`xxxButtonClicked`みたいな感じにしてViewのイベントと紐づけちゃうのも、ViewとStateとの結合度が不必要に高まるのでよくない。例えば、あるモデルをフェッチするというActionは状態管理の観点ではひとつでいいわけだけど、ViewのイベントベースでActionを考えると、XX画面ロードActionでフェッチして、YYボタンクリックActionでも同じモデルをフェッチして、という感じで、State側が冗長になったり複雑になったりしてしまう。

<br>

`payload`は、

- そのデータを(主に)扱うduckの名前空間をトップレベルに作って、データは名前空間の下にいれるといい。一つのActionが複数のduckに処理される場合、複数の名前空間を作ってデータを分ける。こうしておくと、データ構造を経由したduck間の暗黙的依存が無くなってうれしい。

<br>

`error`は、

- あまり使い道はない。まず、FSAは、ある操作の成功と失敗を同じ`type`のActionとして、`payload`と`error`で見分けるというのを推奨している。

    例えば成功のActionが

    ```javascript
    {
      type: 'todo/entityAdded',
      payload: {
        todo: {
          text: 'Do something.'
        },
      },
    }
    ```

    こんな感じで、失敗のActionが

    ```javascript
    {
      type: 'todo/entityAdded',
      payload: new Error(),
      error: true
    }
    ```

    というように、同じ`type`のもの。

    しかしこれだと、payloadの型が`error`フラグによって変わる、つまりUnionになっちゃうのが扱いにくくて微妙。
    それに、これらを受け取るReducerなりSagaなりは`error`をif文で見て処理をわけろということなんだろうけど、だったら最初から`type`分けとけばいいんじゃないの?
    という疑問が絶えない。
    なので`type`は成功と失敗とで変えるとして、`error`はあってもなくてもという感じ。
    任意のActionについて`error`がtrueならログに吐くみたいな共通処理をしたい場合にはつけといてもいいかも。

- `error`が`true`のとき(というかActionが失敗をあらわすとき)は`payload`に[Error](https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Error)オブジェクトを入れるのが作法。

<br>

`meta`の使い道は不明。なにか統計的な情報を入れてログに吐くとか?

<br>

以上まとめると、例えば、Userモデルのフェッチに成功したときのアクションは以下のような感じになる。

```javascript
{
  type: 'user/entitiesFetchSucceeded',
  payload: {
    user: {
      entities: [
        { 'id': 1, 'name': 'うんこ たれ蔵' },
        { 'id': 2, 'name': '山本 菅助' },
      ],
    },
  },
}
```

<br>

なお、Actionオブジェクトはイミュータブル扱いにしておくべし。
Actionオブジェクトは色んなコンポーネントがみるので、中身をいじるとどこに影響するかが分からないからだ。
ただ、Reduxのミドルウェアがメタ情報を付加したりすることがあるので、[freeze](https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze)はしないほうがいい。

また、Actionオブジェクトは[Redux DevTools](https://github.com/reduxjs/redux-devtools)で扱えるようにシリアライズ可能に保つというのが[Redux公式から強く推奨されている](https://redux.js.org/style-guide/style-guide#do-not-put-non-serializable-values-in-state-or-actions)。
これはつまり、`payload`とかに[Map](https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Map)、[Set](https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Set)、[Promise](https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Promise)、クラスのインスタンス、関数オブジェクトをいれてはだめということ。

# Action Creator
前節にも書いたけど、Action CreatorはReduxのStoreにdispatchするActionを生成して返す関数。

Action CreatorはシンプルにActionオブジェクトを作るだけにして、ロジックは何も書かず、副作用も起こさず、参照透過にしておくべし。
複雑なことはReducerやSagaとかに任せておくのがいい。

前節の最後に書いたActionのAction Creatorは以下のような感じ。

`src/state/ducks/user/actions.ts`:
```javascript
export const usersFetchSucceeded = (
  users: User[],
): Readonly<{
  type: 'user/entitiesFetchSucceeded';
  payload: { user: { entities: User[] } };
}> => ({
  type: 'user/entitiesFetchSucceeded',
  payload: {
    user: { entities: users },
  },
});
```

受け取ったUserのリストをpayloadに詰めて返すだけ。

よく、Actionの`type`を文字列定数でexportして他から参照できるようにするのを見るけど、その必要はない。
上記Action Creatorのように、`type`は文字列リテラル型にしておけば、エディタの補完やTypeScriptの型チェックが利くのでそれで充分。

上記Action Creatorには、Actionの型を戻り値の型として直接記述しているけど、その型を別途定義してexportしてもいい。
しなくても、TypeScriptのUtilityタイプの[ReturnType](https://www.typescriptlang.org/docs/handbook/utility-types.html#returntypet)を使って、`ReturnType<typeof usersFetchSucceeded>`のようにAction Creator経由で参照できるので、こちらのほうがすっきりしていていい気がする。

<br>

`actions.ts`の解説だけでいいボリュームになったので、ほかのモジュールについては別記事に書く。

* `reducers.ts`と`store.ts`: https://www.kaitoy.xyz/2020/07/11/re-ducks-reducers-with-immer/
* `sagas.ts`と`apis.ts`と`watcherSagas.ts`: https://www.kaitoy.xyz/2020/07/13/re-ducks-sagas/
