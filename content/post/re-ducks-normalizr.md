+++
categories = ["Programming"]
title = "Reduxのモジュールアーキテクチャパターンre-ducksの実践 ― normalizr"
date = "2020-07-24T15:49:01+09:00"
tags = ["react", "redux", "re-ducks", "typescript", "normalizr"]
draft = false
cover = "redux.png"
slug = "re-ducks-normalizr"
highlight = true
highlightStyle = "monokai"
highlightLanguages = []
+++

[2018年後半](https://www.kaitoy.xyz/2018/11/26/creating-react-redux-app-from-scratch-11/)にスクラッチから作った[ReactとReduxのプロジェクトテンプレート](https://github.com/kaitoy/react-redux-scaffold)を2020年版として色々アップデートしているなかで、[re-ducks](https://github.com/alexnm/re-ducks)パターンに則ってステート管理のモジュール構成を整理しなおしたり、ステート管理に使うライブラリを見直したりした。

この記事では、[前回](https://www.kaitoy.xyz/2020/07/13/re-ducks-sagas/)に続いて、[React-Redux](https://react-redux.js.org/)、[Redux Saga](https://redux-saga.js.org/)、[immer](https://immerjs.github.io/immer/docs/introduction)、[normalizr](https://github.com/paularmstrong/normalizr)、[reselect](https://github.com/reduxjs/reselect)を使ったre-ducksパターンの実践について書く。

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
[前回](https://www.kaitoy.xyz/2020/07/13/re-ducks-sagas/)は`sagas.ts`と`apis.ts`と`watcherSagas.ts`を解説した。
今回は`models.ts`について書く。

# モデルと正規化
`models.ts`の中身について書く前に、ReduxのStoreに入れるモデルとその正規化について書いておく。

ここでいうモデルとは、[DDD](https://ja.wikipedia.org/wiki/%E3%83%89%E3%83%A1%E3%82%A4%E3%83%B3%E9%A7%86%E5%8B%95%E8%A8%AD%E8%A8%88)におけるエンティティとか値オブジェクトに近いもので、アプリケーションが扱う問題領域の特定の概念を、プログラムで扱えるデータ形式として表したもの。
サーバサイドでは、モデルをRDBのテーブルとして表現したり、Classにしてそのインスタンスに対して処理を書いたりするわけだけど、クライアントサイドのアプリケーションでも、GUIを描画するためのデータをサーバサイドのモデルに合わせて扱うと捗る。

re-ducksでは、モデルごとに状態管理処理や型定義をduckとしてまとめる形で整理し、ReduxのStateには、duckごとに分けた名前空間に、対応するモデルのオブジェクトを入れて管理することになる。
このとき、Stateにはモデルオブジェクトを正規化した形で入れておくことが[Redux公式の推奨になっている](https://redux.js.org/style-guide/style-guide#normalize-complex-nestedrelational-state)。

正規化というのは、[RDBにおけるテーブルの正規化](https://ja.wikipedia.org/wiki/%E9%96%A2%E4%BF%82%E3%81%AE%E6%AD%A3%E8%A6%8F%E5%8C%96)と同じような概念。
ReduxのStateはクライアントアプリケーションにとってのDBで、とくにモデルオブジェクトについては、サーバサイドでは大抵RDBで管理されているものなので、モデル間の関係性を意識してRDBのデータのように扱うといい。
つまり、モデルオブジェクトは正規化してStateに入れておくことで、冗長性を排除し、一貫性を保ちやすくなる。

<br>

例えば、ブログ記事を管理するサイトで、サーバサイドでは記事がArticleというモデルで表され、その著者がUserというモデルで表されているとする。
RDBのテーブルがモデルごとにあって、第3正規形になっている。

articleテーブル:

記事ID | タイトル | コンテンツ | 著者
--- | --- | --- | ---
1 | Reactを触ってみた | Reactすごい | 1
2 | Reduxとre-ducks | Reduxむずい | 1
3 | Vueに入門した | Vueやばい | 2

<br>

userテーブル:

ユーザID | 名前 | 誕生日
--- | --- | ---
1 | Linus Torvalds | 1969/12/28
2 | Jeff Dean | 1968/7/23
3 | Larry Wall | 1954/9/27

<br>

articleテーブルの著者列はユーザIDを外部キーで参照している。

<br>

で、クライアントアプリが記事一覧を著者のプロフィール付きで表示したくて、ArticleとUserをREST APIで取得する状況を考える。

最初に全Articleを取得して、各Articleの著者をみて、そのIDでUserを逐一取得する方法だと、N+1問題が発生してスケールしない。
全Articleと全Userをそれぞれ取得して、クライアント側でjoinする方法だと、Userを無駄に取りすぎるきらいがある。

ということで、サーバ側でArticleにUserを埋め込んで、以下のような形で返してくれるREST APIを用意することがよくある。

```json
[
  {
    "id": 1,
    "title": "Reactを触ってみた",
    "contents": "Reactすごい",
    "author": {
      "id": 1,
      "name": "Linus Torvalds",
      "dob": "1969/12/28"
    }
  },
  {
    "id": 2,
    "title": "Reduxとre-ducks",
    "contents": "Reduxむずい",
    "author": {
      "id": 1,
      "name": "Linus Torvalds",
      "dob": "1969/12/28"
    }
  },
  {
    "id": 3,
    "title": "Vueに入門した",
    "contents": "Vueやばい",
    "author": {
      "id": 2,
      "name": "Jeff Dean",
      "dob": "1968/7/23"
    }
  }
]
```

この形は非正規形なので、このままStateに入れるとRDBの非正規形テーブルを扱うときのような問題が出てくる。
それにStateはduckごとに分けるので、ArticleとUserという別々のduckが扱うべきデータが混ざっていると、責務が混ざってしまって処理を書くのに困る。

こうしたデータをクライアントアプリで取得した後、ArticleデータからUserデータを切り離して以下のような形にするのがクライアントサイドでの正規化ということになる。

```javascript
{
  articles: {
    1: {
      id: 1,
      title: "Reactを触ってみた",
      contents: "Reactすごい",
      author: 1,
    },
    2: {
      id: 2,
      title: "Reduxとre-ducks",
      contents: "Reduxむずい",
      author: 1,
    },
    3: {
      id: 3,
      title: "Vueに入門した",
      contents: "Vueやばい",
      author: 2,
    },
  },
  users: {
    1: {
      id: 1,
      name: "Linus Torvalds",
      dob: "1969/12/28",
    },
    2: {
      id: 2,
      name: "Jeff Dean",
      dob: "1968/7/23",
    },
  },
}
```

ArticleからUserを切り離しているだけでなく、主キーであるidとモデルオブジェクトのMap形式になっていることに注目したい。
モデルデータにアクセスするときは、大抵は主キーで検索することになるので、こうしておくことでかなり扱いやすくなる。
ただ、Map形式にすることでもともとのList形式にあったデータの順序性がなくなるので、順序性を維持するために主キーのリストを別途持っておく必要はある。

# normalizr
前節で解説したようなクライアントサイドでのモデルデータ正規化をするためのライブラリがnormalizr。
normalizrは、モデルのどのプロパティが主キーで、どれが外部キーかといったことを表現するスキーマを定義してやると、それに従って正規化(normalize)やその逆の非正規化(denormalize)をしてくれる。

割とシンプルなライブラリで、使い方は[README](https://github.com/paularmstrong/normalizr#quick-start)をみればすぐわかるので、ここでは解説しない。

# models.ts
`models.ts`には、正規化・非正規化を含むモデル周りの処理や、モデルの型定義を書く。
モデルのプロパティに変更があったときに修正すべき部分が`models.ts`になるべくまとまっているとよい。

`src/state/ducks/article/models.ts`:
```javascript
import { schema, normalize, denormalize } from 'normalizr';
import joi from '@hapi/joi';
import {
  User,
  userJoiSchema,
  userNormalizrSchema,
  userNormalizrSchemaKey,
  NormalizedUsers,
} from '~/state/ducks/user/models';

// Userが埋め込まれたArticleの型。
export type Article = {
  id: string;
  title: string;
  content: string;
  author: User;
};

// 正規化されたArticle単体の型。
// つまり、ArticleのauthorがUserのidになった型。
export type NormalizedArticle = Omit<Article, 'author'> & {
  author: User['id'];
};

// 正規化されたArticleの集合の型。
// つまり、idとArticleオブジェクトのMap形式の型。
export type NormalizedArticles = {
  [id: number]: NormalizedArticle;
};

// normalizrのスキーマ定義。
export const articleNormalizrSchemaKey = 'articles';
export const articleNormalizrSchema = new schema.Entity<Article>(
  articleNormalizrSchemaKey,
  { author: userNormalizrSchema },
  {
    idAttribute: 'id',
  },
);

// 正規化関数。
// Userを埋め込んだArticleのリストを渡すと正規化して返してくれる。
export const normalizeArticles = (articles: Article[]) =>
  normalize<
    Article,
    {
      [articleNormalizrSchemaKey]: NormalizedArticles;
      [userNormalizrSchemaKey]: NormalizedUsers;
    },
    Article['id'][]
  >(articles, [articleNormalizrSchema]);

// 非正規化関数。
// normalizeArticles()の戻り値(i.e. 正規化したArticleの集合)を渡すと非正規化して返してくれる。
// Userを埋め込んだArticleのリストを返してくれる。
export const denormalizeArticles = (articles: ReturnType<typeof normalizeArticles>): Article[] =>
  denormalize(articles.result, [articleNormalizrSchema], articles.entities);

// Articleのサンプルオブジェクト。
// ユニットテストに使えるのと、モデルの理解の助けにもなる。
export const articleSamples: Article[] = [
  {
    id: 1,
    title: "Reactを触ってみた",
    contents: "Reactすごい",
    author: {
      id: 1,
      name: "Linus Torvalds",
      dob: "1969/12/28",
    },
  },
  {
    id: 2,
    title: "Reduxとre-ducks",
    contents: "Reduxむずい",
    author: {
      id: 1,
      name: "Linus Torvalds",
      dob: "1969/12/28",
    },
  },
  {
    id: 3,
    title: "Vueに入門した",
    contents: "Vueやばい",
    author: {
      id: 2,
      name: "Jeff Dean",
      dob: "1968/7/23",
    },
  },
];

// ここ以下はREST APIで取得したArticleオブジェクトのバリデーション関数の定義。詳細は割愛する。
// joi (https://github.com/sideway/joi)を使ってるけど、
// Yup (https://github.com/jquense/yup)とかAjv (https://github.com/ajv-validator/ajv)もよさそう。
export const articleJoiSchema = joi.object({
  id: joi.number().integer(),
  title: joi.string().required(),
  content: joi.string().required(),
  author: userJoiSchema.required(),
});

export const validateArticle = (obj: any) => {
  joi.assert(obj, articleJoiSchema.required());
  return obj as Article;
};

export const validateArticleList = (obj: any) => {
  joi.assert(obj, joi.array().items(articleJoiSchema).required());
  return obj as Article[];
};
```

`models.ts`はこんな感じになる。

`normalizeArticles()`は以下のようなオブジェクトを返す。

```javascript
{
  result: [1, 2, 3],
  entities: {
    articles: {
      1: {
        id: 1,
        title: "Reactを触ってみた",
        contents: "Reactすごい",
        author: 1,
      },
      2: {
        id: 2,
        title: "Reduxとre-ducks",
        contents: "Reduxむずい",
        author: 1,
      },
      3: {
        id: 3,
        title: "Vueに入門した",
        contents: "Vueやばい",
        author: 2,
      },
    },
    users: {
      1: {
        id: 1,
        name: "Linus Torvalds",
        dob: "1969/12/28",
      },
      2: {
        id: 2,
        name: "Jeff Dean",
        dob: "1968/7/23",
      },
    },
  },
}
```

`entities`プロパティには前節の最後に書いたのと同じオブジェクトが入っている。
`entities`の下でモデルを分けているプ`articles`と`users`というロパティ名はそれぞれ、`models.ts`に書いた`articleNormalizrSchemaKey`と`userNormalizrSchemaKey`から来ている。
`result`プロパティに入っている配列は、正規化前の配列の順序性を保持するための主キー(i.e. `Article.id`)の配列。
