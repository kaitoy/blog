+++
categories = ["Programming"]
title = "Reduxのモジュールアーキテクチャパターンre-ducksの実践 ― React-Redux with reselect"
date = "2020-07-25T17:29:12+09:00"
tags = ["react", "redux", "re-ducks", "typescript", "reselect"]
draft = false
cover = "redux.png"
slug = "re-ducks-react-redux-with-reselect"
highlight = true
highlightStyle = "monokai"
highlightLanguages = []
+++

[2018年後半](https://www.kaitoy.xyz/2018/11/26/creating-react-redux-app-from-scratch-11/)にスクラッチから作った[ReactとReduxのプロジェクトテンプレート](https://github.com/kaitoy/react-redux-scaffold)を2020年版として色々アップデートしているなかで、[re-ducks](https://github.com/alexnm/re-ducks)パターンに則ってステート管理のモジュール構成を整理しなおしたり、ステート管理に使うライブラリを見直したりした。

この記事では、[前回](https://www.kaitoy.xyz/2020/07/24/re-ducks-normalizr/)に続いて、[React-Redux](https://react-redux.js.org/)、[Redux Saga](https://redux-saga.js.org/)、[immer](https://immerjs.github.io/immer/docs/introduction)、[normalizr](https://github.com/paularmstrong/normalizr)、[reselect](https://github.com/reduxjs/reselect)を使ったre-ducksパターンの実践について書く。

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
[前回](https://www.kaitoy.xyz/2020/07/24/re-ducks-normalizr/)は`models.ts`を解説した。
今回は`selectors.ts`についてと、ReduxとViewとの接続について書く。

# Selector
上記のアーキテクチャ図には見えていないけど、`get State`の線のあたりではSelectorというコンポーネントが動く。
Selectorは、ReduxのStateから必要なデータを抽出し、Viewが扱いやすい形に加工する処理をする関数で、Viewに対してStateを抽象化する層の働きをする。
サーバサイドでいうところの[DAO](https://ja.wikipedia.org/wiki/Data_Access_Object)のようなもの。

Selectorにデータ加工のロジックを詰めることで、View側のコンポーネント間でそのロジックを再利用することができる。
また、テストしやすい状態管理側にロジックを書くことになるので、テストしにくいView側をシンプルに保つことができる。

<br>

`selectors.ts`には、対応するduckが扱うStateについてのSelectorを書く。

Selectorは、ReduxのState全体を受け取って抽出した値を返す純粋関数として書く。
つまり、参照透過且つ副作用フリーである必要がある。
まあ普通に書けばそうなるだろうけど。

因みに、データ加工はSelectorの責務なので、[前回](https://www.kaitoy.xyz/2020/07/24/re-ducks-normalizr/)解説したモデルの非正規化はSelectorの役目。

`src/state/ducks/article/selector.ts`:
```javascript
import { StoreState } from '~/state/ducks';
import { denormalizeArticles, articleNormalizrSchemaKey } from './models';
import { userNormalizrSchemaKey } from '~/state/ducks/user/models';

export const isArticleDataReady = ({ article }: StoreState) => article.dataReady;

export const getArticles = ({ article, user }: StoreState) =>
  denormalizeArticles({
    result: article.data.ids,
    entities: {
      [articleNormalizrSchemaKey]: article.data.entities,
      [userNormalizrSchemaKey]: user.data.entities,
    },
  });
```

Selectorを、View側の都合に引きずられて、Viewが必要なデータを全部まとめて取得して単一オブジェクトにつめて返すような形で書くのはよくない。
むしろ細かい単位で書くと再利用性やテスタビリティが高まっていい。
View側は、細かいSelectorを組み合わせて必要なデータをそろえることになる。
これは[Redux公式も推奨しているプラクティス](https://redux.js.org/style-guide/style-guide#call-useselector-multiple-times-in-function-components)。

# React-Redux
前節で解説したSelectorは、ViewコンポーネントでReact-Reduxの[useSelector()](https://react-redux.js.org/api/hooks#useselector)というHookに渡して使う。
ReduxのStateを意識していいのはContainer Componentなので、`useSelector()`を使うのは[EcosystemかNature](https://www.kaitoy.xyz/2020/05/05/atomic-design/)のコンポーネントということになる。

`src/views/natures/ArticleListView`:
```javascript
import React, { FunctionComponent, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import ArticleList from '~/views/organisms/ArticleList';
import { isArticleDataReady, getArticles } from '~/state/ducks/article/selectors';
import { articlesBeingFetched } from '~/state/ducks/article/actions';
import { useFetch } from '~/views/hooks';

const ArticleListView: FunctionComponent = () => {
  const dataReady = useSelector(isArticleDataReady);
  const articles = useSelector(getArticles);
  const fetching = useFetch(dataReady, articlesBeingFetched());
  const dispatch = useDispatch();
  const onReloadButtonClicked = useCallback(() => {
    dispatch(articlesBeingFetched());
  }, []);

  return (
    <ArticleList
      fetching={fetching}
      articles={articles}
      onReloadButtonClicked={onReloadButtonClicked}
    />
  );
};

export default React.memo(ArticleListView);
```

こんな感じで、React-Reduxの`useSelector()`にSelectorを渡してやるとそのSelectorを呼んでデータを取得してくれる。
詳しく言うと、Selectorは以下のタイミングで実行される。

* `useSelector()`したコンポーネントのrender時。要は`useSelector()`が実行されるときはSelectorも実行される。
    - ただし、`useSelector()`に渡されたSelector関数オブジェクトの参照が前回render時と同じ場合は、Selectorは実行されず、`useSelector()`はキャッシュから前回の結果を返す。
* StoreにActionがdispatchされてStateが変わったとき。
    - Selectorで触るデータに関わらず、Stateのどの部分でもちょっとでも変われば、アプリケーション内のすべてのSelectorが呼ばれる。
    - Selectorが返した値が前回実行時と異なる場合、そのSelectorで`useSelector()`したコンポーネントが再renderされる。
        - Selectorが返す値の比較はデフォルトでは`===`による参照比較だけど、`useSelector()`の第二引数で比較関数を渡すこともできる。
    - ActionがdispatchされてもStateが変わらない場合はSelectorは呼ばれない。

<br>

React-Reduxにはもう一つ重要なHookがある。
上の例でも使っている[useDispatch()](https://react-redux.js.org/api/hooks#usedispatch)だ。
これでStoreのdispatchメソッドを取得できるので、それを使ってActionをdispatchするイベントハンドラを作ってPresentational Component(上の例では`ArticleList`)に渡してやるのもContainer Componentの役割。

なお、Selectorを通さずにStateからデータを取得するのはNG。
React-Reduxの[useStore()](https://react-redux.js.org/api/hooks#usestore)を使えばView側から直接Stateに触れるけど、それをやりだすとカオスになっていくので。

# reselect
前節で`useSelector()`に渡したSelectorが実行されるタイミングを解説したんだけど、そのなかに「Selectorで触るデータに関わらず、Stateのどの部分でもちょっとでも変われば、アプリケーション内のすべてのSelectorが呼ばれる。」というのがあった。
これがアプリの性能に響くことは想像に難くない。
Selector関数に重い処理を書いてしまうと大きな性能問題になってしまうことがある。

とはいえ、軽いSelectorばかりでアプリを構築できるとは限らない。
例えば上記の`isArticleDataReady()`は激軽なので気にする必要はないけど、`getArticles()`はdenormalizeしてるのでやや重い。
Stateが大きくなって、変更される箇所が多くなるにつれ、`getArticles()`が呼ばれる回数が増えて性能に影響を与えてくることが考えられる。

こうした問題に対処するためのライブラリがreselect。
reselectのAPIはほぼ[createSelector()](https://github.com/reduxjs/reselect#createselectorinputselectors--inputselectors-resultfunc)だけで、これは一言で言えばSelectorをメモ化してくれる関数。

`createSelector()`に任意の数の入力セレクタとひとつの結果関数を渡すと、メモ化したSelectorを返してくれる。
入力セレクタはState全体のオブジェクトを受け取り、結果関数の引数を返す関数。
結果関数は、Selectorの戻り値を作って返す関数。
メモ化したSelectorが呼ばれたとき、すべての入力セレクタが返す値が前回と同じ場合、結果関数は実行されず、結果関数の前回の戻り値がSelectorの戻り値になる。

`getArticles()`を`createSelector()`でメモ化すると以下のようになる。

`src/state/ducks/article/selector.ts`:
```diff
+import { createSelector } from 'reselect';
 import { StoreState } from '~/state/ducks';
 import { denormalizeArticles, articleNormalizrSchemaKey } from './models';
 import { userNormalizrSchemaKey } from '~/state/ducks/user/models';

 export const isArticleDataReady = ({ article }: StoreState) => article.dataReady;

-export const getArticles = ({ article, user }: StoreState) =>
-   denormalizeArticles({
-     result: article.data.ids,
-     entities: {
-       [articleNormalizrSchemaKey]: article.data.entities,
-       [userNormalizrSchemaKey]: user.data.entities,
-     },
-   });
+export const getArticles = createSelector(
+  ({ article }: StoreState) => article.data,
+  ({ user }: StoreState) => user.data,
+  (articleData, userData) =>
+    denormalizeKiyoshies({
+      result: articleData.ids,
+      entities: {
+        [kiyoshiNormalizrSchemaKey]: articleData.entities,
+        [userNormalizrSchemaKey]: userData.entities,
+      },
+    }),
);
```

<br>

これでre-ducksのすべてのモジュールについて解説できた。
