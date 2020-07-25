+++
categories = ["Programming"]
title = "Reduxのモジュールアーキテクチャパターン ― re-ducks"
date = "2020-05-27T10:12:33+09:00"
tags = ["react", "redux", "re-ducks"]
draft = false
cover = "redux.png"
slug = "re-ducks"
highlight = false
+++

[2018年後半](https://www.kaitoy.xyz/2018/11/26/creating-react-redux-app-from-scratch-11/)にスクラッチから作った[ReactとReduxのプロジェクトテンプレート](https://github.com/kaitoy/react-redux-scaffold)を2020年版として色々アップデートしているなかで、[re-ducks](https://github.com/alexnm/re-ducks)パターンに則ってステート管理のモジュール構成を整理しなおしたり、ステート管理に使うライブラリを見直したりした。

この記事では、[Redux](https://redux.js.org/)のおさらいをちょっと濃いめにしつつre-ducksパターンについて説明し、次のre-ducsパターンの実践の記事につなげる。

<!--more-->

{{< google-adsense >}}

# Reduxのおさらい
Reduxは[Flux](https://facebook.github.io/flux/)というアーキテクチャに従った状態管理ライブラリで、単一のオブジェクトでアプリケーション全体の状態(State)を表し、これをStoreというオブジェクトに保持する。
Storeに対してActionをdispatchする、つまり`Store.dispatch(action)`を呼ぶことで、Storeに登録されたReducerが、現在のStateとdispatchされたActionから新しいStateを計算し、__現在のStateを置き換える__。

![redux](/images/re-ducks/redux.png)

Storeをsubscribeしてコールバックを登録しておくと、StoreへのActionのdispatchのたびに(Reducerの実行後に)そのコールバックを呼んでくれる。
コールバックでは何も受け取れないんだけど、コールバックのなかで`Store.getState()`を呼ぶことで、Reducerが更新したStateオブジェクトを取得できる。
このsubscribeとかコールバックの処理はReact-Reduxがやってくれる。(下図`get State`と`subscribe`の部分。)

![react-redux](/images/re-ducks/react-redux.png)

`get State`と`subscribe`はReact-Reduxの[useSelector()](https://react-redux.js.org/api/hooks#useselector)というHookで実装されている。
また、`get dispatch func`はStoreのdispatch関数オブジェクトを取得する処理を示していて、React-Reduxの[useDispatch()](https://react-redux.js.org/api/hooks#usedispatch)というHookの呼び出しにあたる。

Container Componentが`useSelector()`でState(の一部)を取得して整形して、さらに`useDispatch()`取得した`dispatch`を使うイベントハンドラを作って、それらをPropsとしてPresentational Componentに渡して`render`する。
Presentational Componentはユーザの操作に応じてそのイベントハンドラを呼んで、Actionをdispatchする。
というのがReactのViewとReduxのStateをつなぐ基本形。

`dispatch()`の呼び出しから、Reducerの実行、コールバックの呼び出し、Stateオブジェクトの取得までは__同期的逐次的に実行__され、React-ReduxはStateオブジェクトの変更を検知すると、Container Componentの再renderが必要であることをReactに伝える。

<br>

render処理とReducerはピュアである必要があるので、REST API呼び出しなどの副作用は別のところに書かないといけない。
副作用は[useEffect](https://ja.reactjs.org/docs/hooks-effect.html)とかイベントハンドラに書くことはできるけど、Reduxを使う場合はRedux Sagaなどのミドルウェアを使って書くとView側をdumb目に保てていい。

Redux Sagaを使う場合、Sagaと呼ばれるジェネレータ関数を定義して、Actionの取得、副作用の実行、Actionのdispatchといった処理を書くことができる。

![saga](/images/re-ducks/saga.png)

Sagaは、特定のActionについてStoreへのdispatchをwatchし、そのActionをReducerの実行やコールバックの呼び出しの__後に__取得できる。

関連する過去の記事:

* https://www.kaitoy.xyz/2018/09/26/creating-react-redux-app-from-scratch-06/
* https://www.kaitoy.xyz/2018/10/01/creating-react-redux-app-from-scratch-07/
    - React-Reduxの古いほうのAPIである`connect()`を使っている。
* https://www.kaitoy.xyz/2018/10/07/creating-react-redux-app-from-scratch-08/

# re-ducksパターン
前節の図の「View」で囲われた部分のモジュール構成については[以前の記事](https://www.kaitoy.xyz/2020/05/05/atomic-design/)に書いていて、それ以外の部分、つまりステート管理系のモジュール構成がこの記事の本題。
その部分には以下のような実装が含まれることになる。

* Actionの定義や生成処理
* Reducer
* Storeの生成処理
* Saga
* etc.

これらを実装するモジュールは、古くは以下のようにその種別ごとに整理する方法(Rails-style)が主流だった。

* src/
    - actions/
        - userActions.ts
        - articleActions.ts
    - reducers/
        - userReducers.ts
        - articleReducers.ts
    - sagas/
    - store/
    - …

これだと、ひとつの(ドメイン)モデルに関する処理が複数のディレクトリに散らばってしまうし、どのモジュールが何に対する責務を負うのかが曖昧になっていきがち。
昨今のDDDやマイクロサービスアーキテクチャといったトレンドに共通的な考え方として、コンポーネント種別とかレイヤでまとめるより、ドメインやドメインモデルにそってまとめるべきというのがあると思うのだけど、ステート管理のモジュールアーキテクチャにも同じような考え方のものがある。

それがre-ducksパターンで、以下のような形になる。

* src/
    - state/
        - ducks/
              - user/
                  - actions.ts
                  - reducers.ts
                  - sagas.ts
                  - …
              - article/
                  - actions.ts
                  - reducers.ts
                  - sagas.ts
                  - …

re-ducksのduckというのはアヒルで、ドメインモデルのメタファになっているのだと思う。(ref. [duck typing](https://ja.wikipedia.org/wiki/%E3%83%80%E3%83%83%E3%82%AF%E3%83%BB%E3%82%BF%E3%82%A4%E3%83%94%E3%83%B3%E3%82%B0))
もちろんReduxとかけてもいる。
要は、ducksディレクトリの下にモデルごとのディレクトリを作って、その中にそのモデルに関連する各種ステート管理モジュールを詰め込んでまとめるという形。
まとめたものや、それに対応するモデルをduckと呼ぶ。

re-ducksにすることで、強く関連するモジュールが一か所にまとまるし、それぞれのモジュールの責務がより明確になるので保守性が高くなる。

ステートの構造も[モデルごとにネームスペースを分ける](https://redux.js.org/recipes/structuring-reducers/basic-reducer-structure#basic-state-shape)のが原則なので、ディレクトリ構造とステート構造が自然と対応する感じになって分かりやすい。

srcディレクトリの下に一段stateディレクトリを設けているのは、re-ducksとは直接関係ないけど次のような意図がある。
[Reduxのスタイルガイド](https://redux.js.org/style-guide/style-guide#structure-files-as-feature-folders-or-ducks)にはステート用モジュールとView用モジュールを一緒くたにするディレクトリ構造例が載ってるけど、Viewは必ずしもステート(というかモデル)をそのまま投影するものでもないので、分けておいたほうがいい。
分けておくことでステートをViewから独立した処理系ととらえる意識を保てて、可読性とテスタビリティを確保しやすい。
ということで、Viewのコード(i.e. tsxファイル)は`src/views/`に分けて入れられるように、stateディレクトリを一段掘っている。

[以前の記事で書いたAtomicデザインを反映したViewのディレクトリ構造](https://www.kaitoy.xyz/2020/05/05/atomic-design/)を合わせると以下のようになる。

- src/
    - views/
        - atoms/
            - buttons/
                - OKButton.tsx
                - CloseButton.tsx
            - FormContainer.tsx
        - molecules/
        - organisms/
            - user/
                - UserFormContents.tsx
            - article/
        - ecosystems/
            - user/
                - UserForm.tsx
            - article/
        - natures/
            - user/
                - UserFormView.tsx
            - article/
                - ArticleListView.tsx
        - hooks/
    - state/
        - store.ts
        - ducks/
            - index.ts
            - app/
            - ui/
            - user/
                - index.ts
                - actions.ts
                - apis.ts
                - reducers.ts
                - models.ts
                - sagas.ts
                - selectors.ts
                - watcherSagas.ts
            - article/
    - utils/

これらのモジュールの中身をどのように書くかについては次回書く。
