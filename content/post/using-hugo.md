+++
categories = [ "Web" ]
date = "2015-08-28T23:36:21-06:00"
draft = false
cover = "hugo-logo.png"
slug = "using-hugo"
tags = [ "blog", "github", "hugo" ]
title = "GitHub Pagesでブログ立ち上げ - Hugoを使う"

+++

[__GitHub Pagesでブログ立ち上げ - Jekyllのためのツール__](https://www.kaitoy.xyz/2015/08/25/tools-for-jekyll/)の続き。
前回は、[__GitHub Pages__](https://pages.github.com/)で公開するブログサイトを構築するのに、[__Jekyll__](http://jekyllrb.com/docs/home/)とJekyll関連ツールを使おうと四苦八苦したが、結局Jekyllに見切りをつけ、[__Hugo__](https://gohugo.io/)を使うことに決めた。

<br>

{{< google-adsense >}}

# Hugoとは
Hugoは、国内では2014年末くらいから盛り上がってきているブログサイト構築ツール。
そのホームページによると、ウェブサイトフレームワークで、静的サイトジェネレータとのこと。

フレームワークと名乗ってはいるが、その正体は、[__Markdown__](https://ja.wikipedia.org/wiki/Markdown)で書かれた記事を元にブログサイトのソースを生成するコンテントビルド機能と、記事作成(など)を支援するユーティリティ機能を持ったコマンドラインツール。

また、静的サイトジェネレータというのは、静的なサイトを生成するという意味ではなく、静的にサイトを生成するという意味。もっと言えば、WordPressとかがアクセス時にビルドが走るのに対し、Hugoを使った場合は事前にビルド済みのものをサーバにアップロードすることになる、ということ。らしい。WordPressは使ったことがないのでよく知らないが、Hugoのホームページにそう書いてある。
つまり、Hugoは静的なサイトだけを扱うツールってわけではないので、JavaScriptとかを駆使して動的でインタラクティブなページを作ってもいいはず。

# Hugoのインストール
[インストールガイド](http://gohugo.io/overview/installing/)に従ってHugoをインストールする。

[HugoのGitHub Releases](https://github.com/spf13/hugo/releases)からWindows用バイナリをダウンロード。このときはバージョン0.14が最新だったので、__hugo_0.14_windows_amd64.zip__をダウンロードした。

このzipの中身は__hugo_0.14_windows_amd64.exe__というバイナリ一つとLICENSE.mdとREADME.mdだけ。
このhugo_0.14_windows_amd64.exeがHugoのすべてなので、これを適当な場所において実行できるようにしとけばよい。
今回は、__hugo.bat__というファイルに以下の内容を書き、PATHの通ったフォルダにいれた。

```dosbatch
@echo off
C:\Users\Kaito\Desktop\tool\hugo_0.14_windows_amd64\hugo_0.14_windows_amd64.exe %*
```

<br>

これで、どこからでも`hugo [arguments]`と打てばHugoコマンドが実行できる。

# Hugoのシンタックスハイライト
[ドキュメント](http://gohugo.io/extras/highlighting/)によると、Hugoでは[シンタックスハイライト](https://ja.wikipedia.org/wiki/%E3%82%B7%E3%83%B3%E3%82%BF%E3%83%83%E3%82%AF%E3%82%B9%E3%83%8F%E3%82%A4%E3%83%A9%E3%82%A4%E3%83%88)を実現する方法を以下の2つから選べる。

* サーバサイド: Hugoでのブログサイト生成時にハイライトしておく方法。
* クライアントサイド: クライアントがブログを読み込んだ時にJavaScriptでハイライトする方法。

前者の方が当然クライアントの負荷が軽くなるが、[__Pygments__](http://pygments.org/)のインストールが必要だったりめんどくさそうなので後者にする。(Pygmentsは[Jekyllのとき](https://www.kaitoy.xyz/2015/08/15/github-pages-and-jekyll/)にすでに入れたけど…)

クライアントサイドでやるのもいくつかやり方があるが、例えば[Highlight.js](https://highlightjs.org/)を使うなら以下をHTMLヘッダに加えるだけでいい。

```html
<link rel="stylesheet" href="https://yandex.st/highlightjs/8.0/styles/default.min.css">
<script src="https://yandex.st/highlightjs/8.0/highlight.min.js"></script>
<script>hljs.initHighlightingOnLoad();</script>
```

この`default.min.css`の部分を変えると[色々なスタイル](https://highlightjs.org/static/demo/)が選べる。
このブログでは`Zenburn`を使うことにした。

# Hugo味見
[Hugoコマンドリファレンス](https://gohugo.io/commands/)を見つつ、Hugoの味見をする。

サイトのひな形を作るコマンドは`hugo new site [path]`。`hugo new site blog`を実行して、__blog__という名のフォルダにサイトの初期ソースを生成。blogの部分はファイルもフォルダも存在しないパスを指定する。

この時点で、blogフォルダ内には以下のものが入っている。

* [__archetypes__](https://gohugo.io/content/archetypes/): 新規記事作成時に自動で挿入される[__Front Matter__](https://gohugo.io/content/front-matter/) (後述)のカスタマイズをするためのファイルを置くフォルダ。
* [__content__](https://gohugo.io/content/organization/): ブログのコンテンツ(記事など)を置くフォルダ。
* [__data__](https://gohugo.io/extras/datafiles/): サイト生成時に使うデータを置くフォルダ。
* [__layouts__](http://gohugo.io/templates/overview/): サイトのレイアウトを定義するファイルを置くフォルダ。
* [__static__](https://gohugo.io/themes/creation): CSSとかJavaScriptとか画像とかのファイルを置くフォルダ。
* [__config.toml__](https://gohugo.io/overview/configuration/): 設定ファイル。これは[__TOML__](https://github.com/toml-lang/toml)だが、[__YAML__](https://ja.wikipedia.org/wiki/YAML)か[__JSON__](https://ja.wikipedia.org/wiki/JavaScript_Object_Notation)でもいい。

<br>

記事を作るコマンドは`hugo new  [path]`。blogフォルダに`cd`して、二つ記事を作ってみる。

```cmd
hugo new about.md
hugo new post/first_post.md
```

__blog\content\about.md__と__blog\content\post\first_post.md__が生成された。
これらには、Front Matterという、記事のメタ情報が自動で書き込まれる。
デフォルトで書き込まれるのは、日付 (__date__)、ドラフトフラグ (__draft__)、タイトル (__title__)だけだが、
[__Archetypes__](https://gohugo.io/content/archetypes/)という機能でカスタマイズできる。
が、今はやらない。

about.mdとfirst_post.mdには適当に記事の内容を書いておく。

<br>

次に[テーマ](https://gohugo.io/themes/overview/)を設定する。テーマを使えば、自分でレイアウトを書く必要がない。

テーマは[__Hugo Themes__](https://github.com/spf13/hugoThemes)にリストされていて、ひとつひとつ選んでインストールもできるけど、今回は全部いっぺんにインストールして色々見てみる。blogフォルダ内で以下を実行すると、__blog\themes\__に全テーマがインストールされる。

```cmd
git clone --recursive https://github.com/spf13/hugoThemes.git themes
```

<br>

これで、以下のコマンドを実行すると、サイトがビルドされ、サーバが起動し、ブラウザで確認できる。

```cmd
hugo server -t angels-ladder -D -w
```

`-t`でテーマを指定している。指定するのは__blog\themes\__内のフォルダ名。`-D`はドラフト記事をビルドしたいときにつけるオプション。さっき作ったabout.mdとfirst_post.mdは、そのFront Matterのdraftがtrueになっていて、つまりドラフトなので、`-D`を付けないとビルドされない。`-w`は[__LiveReload__](https://gohugo.io/extras/livereload/)を有効にするフラグで、付けておくとソースを修正したら自動でリビルドとブラウザのリロードが実行される。(変更を監視されるのはサブフォルダ内だけ。config.tomlの変更は無視される。)

サーバには__http://localhost:1313/__でアクセスできる。今回指定したテーマangels-ladderだと、トップページにfirst_post.mdの記事へのリンクがあり、その内容を確認できる。about.mdの方はリンクはなく、直接__http://localhost:1313/about/__アクセスしないと見れない。この辺りはテーマ(と設定?)によって異なるのかな。
まあabout.mdは試しに作ってみただけなので消しておく。

`hugo server`の`-t`に与える値を変えれば簡単にテーマを切り替えられるので、いろいろ見てみる。

<br>

以上で味見終わり。

# テーマの選定 - Robust
Hugo Themesにあるテーマはどれもあまりしっくりこなかった。
もう自分で作ろうかと思っていたところ、[__Robust__](https://github.com/dim0627/hugo_theme_robust)というテーマを見つけた。
[こんな感じ](http://yet.unresolved.xyz/)のページができる。いい。これを使うことにする。

blogフォルダ内で、いったんthemesを消してから以下を実行してRobustをインストール。

```cmd
> git init .
> git submodule add https://github.com/dim0627/hugo_theme_robust.git themes/hugo_theme_robust
```

ここでは、`git init`でblogフォルダをGitリポジトリにして、`git submodule add`で__hugo_theme_robust__ (RobustのGitHubプロジェクト)を[サブモジュール](https://git-scm.com/book/ja/v1/Git-%E3%81%AE%E3%81%95%E3%81%BE%E3%81%96%E3%81%BE%E3%81%AA%E3%83%84%E3%83%BC%E3%83%AB-%E3%82%B5%E3%83%96%E3%83%A2%E3%82%B8%E3%83%A5%E3%83%BC%E3%83%AB)として追加している。
こうすることで、blogとhugo_theme_robustを別々のリポジトリとして管理しつつ、hugo_theme_robustをblogの一部として使うことができる。

<br>

`hugo server`するときやビルド時に毎回テーマを指定しなくてもいいように、
config.tomlに`theme = "hugo_theme_robust"`を追記しておく。

# テーマのカスタマイズ
テーマフォルダ内の構成はblogフォルダ(プロジェクトルート)内と同じようになっていて、Hugoがサイトをビルドするとき、プロジェクトルート内のフォルダとテーマフォルダ内のフォルダをマージしたものを使ってくれる。この際、プロジェクトルート内のファイルが優先される。

つまり例えば以下のような構成のプロジェクトがあったとする。

* blog
    * layouts
        * hoge.html
    * themes
        * hugo_theme_robust
            * layouts
                * hoge.html
                * foo.html

Hugoはこれをビルドするとき、layouts内には__blog\layouts\hoge.html__と__blog\thmes\hugo_theme_robust\layouts\foo.html__があるものとして処理してくれる。テーマをちょっとカスタマイズしたいときに、テーマのソースをいじらないでいいのが便利。

<br>

Robustはとりあえず設定ファイルをカスタマイズすれば使える。設定ファイルは、Robustはconfig.yamlだけど、ルートにconfig.toml置いたらちゃんと上書きできた。

# 記事の仕上げ
first_post.mdの内容を仕上げて、以下のコマンドでdraftフラグをオフにする。

```cmd
> hugo undraft content\post\first_post.md
```

これをやるとdateも更新される。

# GitHubへソースを保存
blog内の変更をコミットして、GitHubにblogという名のリポジトリを作成して、以下のコマンドでソースをアップロードする。

```cmd
> git remote add origin git@github.com:kaitoy/blog.git
> git push -u origin master
```

<br>

また、ここで、__gh-pages__というブランチを作り、中身を空にして、masterとは別途チェックアウトしておく。
コマンドは以下。

```cmd
> git checkout -b gh-pages
> rm -rf *
> git rm -rf .
> git commit -m "Init GitHub Pages branch."
> git push origin gh-pages
> git checkout master
> git clone -b gh-pages git@github.com:kaitoy/blog.git pages
```

これでgh-pagesブランチが__blog\pages\__フォルダに展開された。

因みにgh-pagesは、[以前のエントリ](https://www.kaitoy.xyz/2015/08/15/github-pages-and-jekyll/#github-pages%E5%91%B3%E8%A6%8B)にも書いたが、GitHub Pagesで公開するサイトを置く特別なブランチ。

(2016/8/18追記: [今はgh-pagesブランチは不要。](https://www.kaitoy.xyz/2016/08/18/simpler-github-pages-publishing/))

# ビルド・デプロイ
ビルドコマンドは単に`hugo`。ビルド成果物はデフォルトで__public__というフォルダに入る。
ここでは、pagesフォルダに入るように以下のコマンドでビルドする。

```cmd
> hugo -d pages
```

<br>

ビルド完了したら、pagesフォルダに`cd`して、全てのファイルを`git add`して、コミットしてプッシュすればデプロイ完了。
`https://kaitoy.github.io/blog/`でサイトを確認できる。

# カスタムドメイン
サイトに`http://www.kaitoy.xyz`でアクセスできるようにする。手順は以下。

1. [__VALUE-DOMAIN__](https://www.value-domain.com/)でkaitoy.xyzを取得。
2. VALUE-DOMAINのDNS設定に`cname tbd kaitoy.github.io.`を追加。
3. gh-pagesブランチのルートに__CNAME__というファイルを作り、__www.kaitoy.xyz__とだけ書いておく。
4. config.tomlのbaseurlを__http://www.kaitoy.xyz__に変更。ビルドしてプッシュ。

以上でブログサイト立ち上げ完了。あとはテーマをカスタマイズしたり、ひたすらエントリを書く。
