+++
categories = ["Programming"]
title = "コンポーネント設計におけるAtomicデザイン"
date = "2020-05-05T10:12:33+09:00"
tags = ["react", "frontend", "atomic-design"]
draft = false
cover = "atomic-design.png"
slug = "atomic-design"
highlight = false
+++

[2018年後半](https://www.kaitoy.xyz/2018/11/26/creating-react-redux-app-from-scratch-11/)にスクラッチから作った[ReactとReduxのプロジェクトテンプレート](https://github.com/kaitoy/react-redux-scaffold)を2020年版として色々アップデートしているなかで、Atomicデザインを参考にコンポーネントを整理しなおした。

そこでいろいろ考えた結果、コンポーネント設計においてはAtomicデザインは基本的にカスタマイズすべきという結論になって、プロジェクトテンプレートに合わせた版(i.e. React × Redux × React Router版)を作ったのでそれについて書く。

<!--more-->

{{< google-adsense >}}

# デザインシステム
Atomicデザインはデザインシステムに関するものなので、まずはデザインシステムについて。

デザインシステムは、プロダクト内やプロダクト間でコンポーネントやスタイルを再利用したり、一貫性のあるデザインを運用していくためのもので、厳密な定義はないけど概ね以下のようなものを組み合わせたもの。

* スタイルガイド
* パターンライブラリ
* デザインツール
* コンポーネントライブラリ
* アイコンライブラリ
* カラーパレット
* コンポーネント、色、アニメーション、レイアウトなどのデザインガイドライン

2018年ころに盛り上がった概念で、有名なものにGoogleの[Material Design](https://material.io/design)、Microsoftの[Fluent Design System](https://www.microsoft.com/design/fluent/#/)、Salesforceの[Lightning Design System](https://www.lightningdesignsystem.com/)がある。

参考資料:

* [Introducing design systems](https://www.designbetter.co/design-systems-handbook/introducing-design-systems)
* [Awesome Design Systems](https://github.com/alexpate/awesome-design-systems)
* [Web Design Trends 2018](https://www.uxpin.com/studio/ebooks/web-design-trends-2018/)
* [Creating a Design System: The 100-Point Process Checklist](https://www.uxpin.com/studio/ebooks/create-design-system-guide-checklist/)

# Atomicデザイン
[Atomicデザイン](https://bradfrost.com/blog/post/atomic-web-design/)はデザインシステムを構築するための方法論で、Brad Frostが2013/6/10に投降した[ブログ記事](https://bradfrost.com/blog/post/atomic-web-design/)で提唱された。
本にもなっていて、[Ebookを買えたり](https://shop.bradfrost.com/)、[ネットで読めたり](https://atomicdesign.bradfrost.com/table-of-contents/)する。

Atomicデザインの肝は、以下の5つのステージに沿って階層的なデザインシステムを構築するというところ。

* Atom

    それ以上分割できないUIの最小単位で、アプリのUIを構築するための基礎的な要素。
    本来のAtom(原子)と同様、それぞれがアプリケーション内で果たす具体的で独自の性質・役割を持つべき。

    アプリ全体のベーススタイルを決定づけるものでもあるので、上の階層のコンポーネントと行ったり来たりしながら調整することになる。

* Molecule

    Atomを組み合わせてつくる要素。次のOrganismより比較的シンプルなものとされているけど、区別はあいまい。

* Organism

    AtomやMoleculeを組み合わせてつくる、比較的複雑な要素。
    UIの個別のセクションを表すことが多い。

* Template

    Atom、Molecule、Organismを組み合わせてつくるページレベルのオブジェクト。
    Templateによってコンテンツのレイアウトが明確になり、Atom、Molecule、Organismが上手くデザインされているか確認できる。
    また、次のステージのPageと分離して考えることで、ページの構造に注目して設計することができる。

* Page

    Templateに実際のコンテンツを注入したもの。
    Templateのインスタンス。
    ステークホルダーにアプリのデザインを確認してもらったり、開発者がデザインシステムの検証をしたりするのに有用。

    Pageをつくることにより、コンテンツのバリエーションに関わらず適切に表示できるデザインシステムになっているかを検証すべし。
    (e.g. タイトルが長い/短い、リストアイテムが無い/少ない/多い、管理者用画面/オペレータ用画面)

これらのステージは、AtomからPageに向かって順番に段階的にデザインを進めることを示唆しているように見えるが、実際には各ステージに並行して取り組み、互いに協調させながら、全体と個々のパーツを同時に設計するためのメンタルモデルと捉えるべし。

Atomicデザインのステージ名(TemplateとPage以外)は化学用語から取られているが、化学より音楽になじみがあるという理由で音符などを代わりにメタファに使っているプロジェクトもある。
要は階層的にデザインを捉えられれば、それでほぼAtomicデザインの目的を達成できるので、上記5ステージに必ずしもこだわる必要はなさそう。

# 自作プロジェクトテンプレートでのAtomicデザインの使いどころ

Atomicデザインはデザインシステムを構築するものだけど、冒頭で触れた自作プロジェクトテンプレートでは[Material UI](https://material-ui.com/)を使っていて、つまりMaterial Designを採用しているので、デザインシステムの内スタイルガイドやパターンライブラリやデザインガイドラインはそちらを参照すればいい。

また、[@material-ui/icons](https://material-ui.com/components/material-icons/)がアイコンライブラリとして十二分に充実している。

デザインツールやカラーパレットは置いておくとして、あとはコンポーネントライブラリだけど、Material UIが提供するものはAtomかそれ以下のプリミティブ目なものだけなので、自前で色々作る必要がある。
その際、コンポーネント設計に対してAtomicデザインをどう反映させるかという課題がある。

# コンポーネント設計におけるAtomicデザイン
コンポーネント設計のコンテクストでは、各ステージはコンポーネントの分類と捉えられる。
Atomicデザインはコンポーネントを階層的に分類することを促し、分類に共通認識を与える。

ただ、そのコンテクスト、特にSPAのコンポーネント設計においては、Pageという分類はなじまない。
コンポーネントはデータを描画する器としてつくり、そこに注入するコンテンツはREST APIなどで動的に取得するからだ。

Templateもちょっとあやしい。
ページレベルのコンポーネントはSPAでは一つになることも多く、分類のカテゴリのひとつとして有用とは言えないので。

逆に、[Redux](https://redux.js.org/)の[Preesntational ComponentとContainer Component](https://redux.js.org/basics/usage-with-react#presentational-and-container-components)も考慮すると、Atomicデザインの分類では足りない。
AtomとMoleculeはPreesntational Componentでいいとしても、OrganismはPreesntational ComponentとContainer Componentのいずれにもなる。
あるいは、OrganismをPreesntational Componentとして、別のカテゴリでContainer Componentを実装する必要がある。

採用するフロントエンドフレームワークなどの特性によっても適した分類方法は変わってくるだろうから、コンポーネント設計にAtomicデザインを活用する場合、多分基本的になんらかのカスタマイズを加えるのがよさそう。
あるプロジェクトでは、横断的な機能を提供するコンポーネントをイオンと分類しているらしい。

ということで、Atomicデザインをベースに自作プロジェクトテンプレートに合わせた版(i.e. React × Redux × React Router版)のコンポーネント分類と、それを反映したディレクトリ構造を考えた。

# ぼくのかんがえたさいきょうのAtomicデザイン
ぼくのかんがえたと書いてるけど[この記事](https://qiita.com/kahirokunn/items/b599d2cf04d2580c412c)にインスパイアザネクストされている。

コンポーネントは以下のように分類する。

* Atom
    - アプリのUIを構築するための基礎的な要素。
    - Material UIのコンポーネントは汎用的過ぎるので、基本的にはより具体的な役割を与えて、機能を絞ったり、ラベルを付けたり、スタイルを付けたものに名づけをしてAtomとする。
      例えばMaterial UIのButtonから、OpenButtonみたいなAtomを作るなど。
    - Preesntational Component。
      見た目に関する状態を持ってもいいけど、自コンポーネントで閉じたものにする。
    - 再利用性を比較的重視。
* Molecule
    - Material UIのコンポーネントやAtomを組み合わせてつくる比較的シンプルな要素。
    - Preesntational Component。
      見た目に関する状態を持ってもいいけど、自コンポーネントで閉じたものにする。
    - 再利用性を比較的重視。
* Organism
    - Material UIのコンポーネント、Atom、Moleculeを組み合わせてつくる比較的複雑な要素。
    - ものによっては他のOrganismやEcosystemも組み合わせる。
    - Preesntational Component。
      見た目に関する状態を持ってもいいけど、自コンポーネントで閉じたものにする。
    - 再利用性は比較的軽視。
    - OrganismをEcosystemのコンポーネントでラップしてReduxのStoreにつなぐイメージ。
* Ecosystem
    - ひとつのOrganismを含み、それにロジックを与えるためのコンポーネント。
        - EcosystemのコンポーネントでReduxのStoreからデータを集めてきて、ディスパッチャとかを作って、Propsを整形して、Organismに流し込むイメージ。
    - 当然Container Component。
        - Ecosystemのコンポーネントだけが[React Redux](https://react-redux.js.org/)を使う。
    - 再利用性は気にしない。
* Nature
    - 主にEcosystemを組み合わせてつくる、ページレベルのコンポーネント
        - 必要に応じてMaterial UIのコンポーネント、Atom、Molecule、Organismを組み合わせる。
    - React Routerのルーティング先ごとにNatureのコンポーネントを作る感じ。
    - Natureのコンポーネントがルーティングの責務を負う。
        - React RouterのHooksを使うのはNatureだけ。
    - 再利用性は気にしない。

この分類の狙いは、Atomicデザインもともとの効果に加えて以下がある。

* PageとTemplateというSPAのコンポーネント設計に役立たない分類を排除。
    - 代わりにEcosystemとNatureという生物学的な分類にして、統一感がアップしてかっこいい。
* Atomicデザインの分類とPreesntational Component/Container Componentの分類の融合。
* 責務の分離と明確化。
    - Organism以下は与えられたPropsに従った表示とユーザインタラクション。
    - EcosystemはViewとStoreとの接続、およびロジックの実装。
    - Natureはページの構成とルーティングとURLの操作。

<br>

で、ソースディレクトリは以下のように整理する。

- <プロジェクトルート>
    - src/
        - views/
            - atoms/
                - buttons/
                    - OKButton.tsx
                    - CloseButton.tsx
                - inputs/
                    - TextField.tsx
                    - PasswordFiled.tsx
                - FormContainer.tsx
            - molecules/
            - organisms/
            - ecosystems/
            - natures/

<br>

`src/views/`の下にAtomicデザインの分類ごとのディレクトリを作って、その下にコンポーネントのソースを入れる。

`atoms/`のところに書いたように、さらにサブディレクトリを作ってコンポーネントを分類するといいけど、ここは自由に。

`src/views/`の下には、他に`hooks/`とかのAtomicデザイン外のディレクトリを作ってもいい。
