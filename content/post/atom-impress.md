+++
categories = [ "Text Editor", "Presentation" ]
date = "2015-12-19T23:37:08-07:00"
draft = false
eyecatch = "atom_editor_logo.svg.png"
slug = "atom-impress"
tags = [ "atom", "impress.js" ]
title = "impress.jsでのプレゼン資料作成をサポートするAtomパッケージ - impress"
+++

[__Atom__](https://atom.io/)のパッケージを作った話。

ついでに、パッケージプロジェクト内で別のプロジェクトを取り込んで使いたい場合に、[Gitのサブモジュール](https://git-scm.com/book/ja/v2/Git-%E3%81%AE%E3%81%95%E3%81%BE%E3%81%96%E3%81%BE%E3%81%AA%E3%83%84%E3%83%BC%E3%83%AB-%E3%82%B5%E3%83%96%E3%83%A2%E3%82%B8%E3%83%A5%E3%83%BC%E3%83%AB)を使ってはダメという話。

## impress.js
[__impress.js__](https://github.com/impress/impress.js)というJavaScriptライブラリがある。
HTML5とCSS3とJavaScriptでプレゼン資料を作るためのライブラリで、これを使うと、[PowerPoint](https://products.office.com/ja-jp/powerpoint)や[Keynote](http://www.apple.com/jp/mac/keynote/)といった従来のツールによるものからは一線を画す斬新な資料を作ることができる。

[公式のデモ](http://impress.github.io/impress.js/#/bored)を見ればその魅力を堪能できる。

デモを見ると分かるが、[__Prezi__](https://prezi.com/)に触発されたライブラリだ。
Preziでも非常に新鮮な資料を作れるが、ほぼ有料で、また作成した資料をPreziのサーバに置かなければいけないので、仕事で使う資料作りには使いにくい。
その点impress.jsは、[MIT](https://ja.wikipedia.org/wiki/MIT_License)(と[GPLv2](https://ja.wikipedia.org/wiki/GNU_General_Public_License))で公開されていて自由に無料で使えるのがよい。

ただし、Preziがスライドという概念から大きく脱却しているのに対して、実のところimpress.jsで作れる資料はあくまでスライドベースだ。
従来のものに比べてスライドの並びに制約がなく、スライド間の遷移がダイナミックというだけだ。
impress.jsでもまあ工夫すればPreziのような資料は作れるが。
独自のオーサリングツール/ビューワに依存するPreziに対し、impress.jsは標準的なHTML/CSS/JavaScriptにだけ依存しているので、[jQuery](https://jquery.com/)などのWeb技術を活用してスライドを作れるという副次的なメリットはある。

impress.jsは、2012年に最初のバージョンが公開されてからもう4年近く経つが、未だにそれほど広く使われている様子はない。
PowerPointが幅を利かせているせいもあるだろうが、その使い辛さから利用をためらう人が多いのではないだろうか。
impress.jsはあまりドキュメントが充実しているとは言えない。
[GitHubに公開されているREADME](https://github.com/impress/impress.js#how-to-use-it)には、使い方はソースを見よ、それで分からないなら使うなとある。
さらにソース中には、impress.jsを使うには、HTMLとCSSのスキルに加えてデザイナーのセンスも必要とある。
かなりハードルを上げている。

このハードルをクリアしていたとしても、実際、impress.jsで資料を作るのはPowerPointに比べて10倍は大変だ。
impress.jsはスライド(impress.js用語ではステップ)間の遷移を制御してくれるだけで、各スライドのコンテンツを作るという部分に関してはなんのサポートも提供しない。
テンプレートもなければ、表やグラフを書く機能もなく、アニメーションも作れない。
そういうことをしたければ、自分で別途ライブラリを探して使うなりしないといけない。

ちょっとした図を書くにも、テキストエディタでちまちまHTMLとCSSを書いて、ブラウザで表示して確認して、思った通りになっていなければディベロッパツールでデバッグして、Web UIでも書いていたんだっけという気になってくる。

## impressパッケージ
そんな負担を少しでも軽くしたいと思って作ったのが[impressパッケージ](https://atom.io/packages/impress)。

同じ目的のツール(i.e. オーサリングツール)は実は既に[いくつかあった](https://github.com/impress/impress.js/wiki/Examples-and-demos#authoring-tools)。
なかでも、[Hovercraft!](https://github.com/regebro/hovercraft)というのが高機能で便利そう。
ただ、これらはPowerPointほど自在にスライドを作れるまでには至っておらず、結局は仕上げにHTML/CSSを手でいじる作業が必要になる。(と思う。)
また、jQueryのプラグイン使ってかっこいいことしたいとか言う場合にも、手でコードを書かなければいけない。

つまりテキストエディタを開かなければいけない。よってAtomを起動することになる。(私は。)

であれば、オーサリングツールもAtomに統合されていた方が便利なんじゃないの?
というのがimpressパッケージを作った動機。

まだ機能は少なくて、新規資料プロジェクトの雛形生成、

![new_project](/images/atom-impress/new_project.gif)

ステップをリスト表示するビュー表示、

![step_list_view](/images/atom-impress/step_list_view.gif)

プレビューができるだけ。

![preview](/images/atom-impress/preview.gif)

<br>

ゆくゆくは、GUIでステップの配置や角度を編集する機能、GUIでステップ内の図を作成する機能を作りたい。
あとできればアニメーションを付ける機能とかも。
Hovercraft!みたいにHTML書かなくてもいいよ、というのを目指すつもりはなくて、あくまでもコーダーのための、コーディングを補助するツールを目指す。

## パッケージのサブモジュール
impressパッケージは、新規資料プロジェクトの雛形生成機能などのため、impress.jsプロジェクト(の[フォーク](https://github.com/kaitoy/impress.js))をサブモジュールとしてとりこんでいる。

最初はGitのサブモジュールコマンド(`git submodule`)を使って取り込んでいて、上手くいっているように見えたが、パブリッシュ後に次のような問題が発生した。
即ち、試しにimpressパッケージをインストールしてみたら、サブモジュールのフォルダの中身がからっぽだった。

これは、Atomのパッケージマネージャがパッケージを[GitHub Releases](https://help.github.com/articles/about-releases/)から[ダウンロードしてインストールする](http://tbd.kaitoy.xyz/2015/12/02/unpublish-atom-package/#%E6%B3%A8%E6%84%8F%E3%81%99%E3%81%B9%E3%81%8D%E7%82%B9-3-%E3%83%91%E3%83%83%E3%82%B1%E3%83%BC%E3%82%B8%E3%81%AE%E3%82%AD%E3%83%A3%E3%83%83%E3%82%B7%E3%83%A5)からだ。サブモジュールの中身はGitHub Releasesに登録されるアーカイブに含まれない。このGitHub Releasesの挙動は、サブモジュールを含むGitプロジェクトをクローンした場合、[デフォルトではサブモジュールはクローンされない](https://git-scm.com/book/ja/v2/Git-%E3%81%AE%E3%81%95%E3%81%BE%E3%81%96%E3%81%BE%E3%81%AA%E3%83%84%E3%83%BC%E3%83%AB-%E3%82%B5%E3%83%96%E3%83%A2%E3%82%B8%E3%83%A5%E3%83%BC%E3%83%AB#%E3%82%B5%E3%83%96%E3%83%A2%E3%82%B8%E3%83%A5%E3%83%BC%E3%83%AB%E3%82%92%E5%90%AB%E3%82%80%E3%83%97%E3%83%AD%E3%82%B8%E3%82%A7%E3%82%AF%E3%83%88%E3%81%AE%E3%82%AF%E3%83%AD%E3%83%BC%E3%83%B3)というGitサブモジュールの仕様に関係しているのかもしれない。

この問題をきっかけにGitサブモジュールについてちょっと調べてみた。
[蝙蝠本](https://www.oreilly.co.jp/books/9784873114408/)によると、Git開発チームはあまりサブモジュールコマンドの開発に熱心ではなく真面目に作らなかったらしい。
また、[あるブログ](http://japan.blogs.atlassian.com/2014/03/alternatives-to-git-submodule-git-subtree/)によればサブモジュールコマンドは大分まえからオワコンらしい。このブログによれば、今は多くの場合`git subtree`を使うのがいいとのこと。`git subtree`は蝙蝠本にも[Pro Git](https://git-scm.com/book/en/v2)にも載ってないのだが。

`git subtree`でプロジェクトを取り込んだ場合、親プロジェクトのクローン時にサブプロジェクトもデフォルトでクローンされる仕様だ。
(というか正しくは、サブモジュールと違って、子プロジェクトが親プロジェクトにマージされているから、一緒にクローンされるというだけ。)
これを使ってimpressパッケージを構成しなおしてみたら件の問題が解決した。
因みにやりかたは、impressパッケージプロジェクトのルートに`impress.js`というフォルダを作った後、以下のコマンドを実行しただけ。

```sh
git subtree add --prefix impress.js git@github.com:kaitoy/impress.js.git master --squash
```

<br>

ということで、Atomのパッケージに別のプロジェクトを取り込んで使いたい場合は、`git submodule`ではなく、`git subtree`を使わないといけないという教訓を得た。
