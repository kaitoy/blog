+++
categories = [ "Web" ]
date = "2016-08-18T00:26:06-06:00"
draft = false
cover = "github.png"
slug = "simpler-github-pages-publishing"
tags = [ "github" ]
title = "GitHub Pagesの新機能、ソース設定が地味にいい"

+++

今日、[よりシンプルにGitHub Pagesを使えるようになった](https://github.com/blog/2228-simpler-github-pages-publishing)というアナウンスがあり、ソース設定という新機能が追加されていたので、さっそく試してみた話。

<br>

{{< google-adsense >}}

# GitHub Pagesの新機能: ソース設定
[GitHub Pages](https://pages.github.com/)には[User Pages、Organization Pages、Project Pages](https://help.github.com/articles/user-organization-and-project-pages/)の三種類があるが、ソース設定が使えるのはProject Pages、つまりGitHubリポジトリごとに使えて`username.github.io/projectname`のようなURLのやつだけ。

今まではProject Pagesで公開するサイトのソースは`gh-pages`という名のブランチに置く必要があったが、ソース設定により`master`ブランチのルートに置いたり`master`ブランチの`/docs`フォルダに置いたりもできるようになった。

# ソース設定の使い道
[Pcap4Jのホームページ](https://www.pcap4j.org/)のソースを`master`ブランチの`/docs`フォルダに置く設定にしたら捗った。

Pcap4Jのホームページは[Hugo](https://gohugo.io/)で作っていて、以前は、Hugoのソースを[pcap4j-hpリポジトリのmasterブランチ](https://github.com/kaitoy/pcap4j-hp)に置き、`gh-pages`ブランチを作ってそこにHugoのビルド成果物(=ホームページのソース)を入れていた。

ローカルPCでは、`master`をcloneして、そこから`git worktree`で`gh-pages`を別のフォルダにチェックアウトしておいてあり、Hugoのビルドオプションで`gh-pages`のフォルダにビルド成果物を出力するようにしていた。
これだと、ホームページを修正したい場合、まず`master`でHugoソースを修正して`git add/commit/push`、次いでビルドして`gh-pages`フォルダに移動して`git add/commit/push`、というように、二度手間で面倒だった。

Hugoのビルド成果物を`master`ブランチの`/docs`フォルダに置けるようにできれば、`git add/commit/push`はビルド後に`master`に対して一回だけやれば済むようになる。

# gh-pagesからmasterブランチの/docsフォルダへの移行
[GitHubのヘルプ](https://help.github.com/articles/configuring-a-publishing-source-for-github-pages/)を参考にしつつ、

1. ローカルPCで、`master`の作業ディレクトリのルートに`docs`というフォルダを作り、`gh-pages`のフォルダの中身を全てそこに移動。
2. `master`の`docs`を`git add/commit/push`。
3. GitHubのpcap4j-hpリポジトリのページに行き、SettingsタブのGitHub PagesセクションのSourceを`gh-pages branch`から`master branch /docs folder`に変えてSaveボタンをクリック。

    ![gh-pages-to-docs.png](/images/simpler-github-pages-publishing/gh-pages-to-docs.png "gh-pages-to-docs.png")

<br>

実にこれだけ。
カスタムドメインにしていてもこれだけ。簡単。ダウンタイムもなし。

あとはローカルPCの`gh-pages`の作業ディレクトリを削除したり、`gh-pages`ブランチを削除したり。
