+++
categories = [ "Web" ]
date = "2016-08-18T00:26:06-06:00"
draft = false
eyecatch = "github.png"
slug = "simpler-github-pages-publishing"
tags = [ "github" ]
title = "simpler github pages publishing"

+++

今日、[よりシンプルにGitHub Pagesを使えるようになった](https://github.com/blog/2228-simpler-github-pages-publishing)というアナウンスがあったので、さっそく試してみた話。

## GitHub Pagesの改善点
[GitHub Pages](https://pages.github.com/)には[User Pages、Organization Pages、Project Pages](https://help.github.com/articles/user-organization-and-project-pages/)の三種類があるが、変わったのはProject Pages、つまりGitHubリポジトリごとに使えて`username.github.io/projectname`のようなURLのやつだけ。

改善点はソース設定が加わったこと。

今まではProject Pagesで公開するサイトのソースは`gh-pages`という名のブランチに置く必要があったが、ソース設定により`master`ブランチのルートに置いたり`master`ブランチの`/docs`フォルダに置いたりもできるようになった。

## ソース設定の使い道
[Pcap4Jのホームページ](https://www.pcap4j.org/)のソースを`master`ブランチの`/docs`フォルダに置く設定にしたら捗った。

Pcap4Jのホームページは[Hugo](https://gohugo.io/)で作っていて、Hugoのソースを[pcap4j-hpリポジトリのmasterブランチ](https://github.com/kaitoy/pcap4j-hp)に置き、`gh-pages`ブランチを作ってそこにHugoのビルドアウトプット(=ホームページのソース)を入れていた。

ローカルPCでは、`master`をcloneして、そこから`git worktree`で`gh-pages`を別のフォルダにチェックアウトしておいてあり、Hugoのビルドオプションで`gh-pages`のフォルダに出力するようにしていた。
これだと、ホームページを修正したい場合、`master`でHugoソースを修正してgit add/commit/push、ビルドして`gh-pages`フォルダに移動してgit add/commit/push、というように二回git add/commit/pushする必要があり面倒だった。

Hugoのビルドアウトプットを`master`ブランチの`/docs`フォルダに置けるようにできれば、add/commit/pushはビルド後に`master`に対して一回だけやれば済むようになる。

## gh-pagesから`master`ブランチの`/docs`フォルダへの移行
[GitHubのヘルプ](https://help.github.com/articles/configuring-a-publishing-source-for-github-pages/)を参考にしつつ、

1. ローカルPCで、`master`の作業ディレクトリのルートに`docs`というフォルダを作り、`gh-pages`のフォルダの中身を全てそこに移動。
2. `master`の`docs`をgit add/commit/push。
3. GitHubのpcap4j-hpリポジトリのページに行き、SettingsタブのGitHub PagesセクションのSourceを`gh-pages branch`から`master branch /docs folder`に変えてSaveボタンをクリック。

    ![gh-pages-to-docs.png](/images/simpler-github-pages-publishing/gh-pages-to-docs.png "gh-pages-to-docs.png")

<br>

実にこれだけ。
カスタムドメインにしていてもこれだけ。簡単。

あとはローカルPCの`gh-pages`の作業ディレクトリを削除したり、`gh-pages`ブランチを削除したり。
