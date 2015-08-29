+++
categories = [ "Web" ]
date = "2015-08-25T22:36:28-06:00"
draft = false
eyecatch = "octopress.png"
slug = "tools-for-jekyll"
tags = [ "blog", "github", "jekyll" ]
title = "GitHub Pagesでブログ立ち上げ - Jekyllのためのツール"
+++

[__GitHub Pagesでブログ立ち上げ - GitHub PagesとJekyll__](http://tbd.kaitoy.xyz/2015/08/15/github-pages-and-jekyll/)の続き。
前回は、[__GitHub Pages__](https://pages.github.com/)と[__Jekyll__](http://jekyllrb.com/docs/home/)でブログを始めることにして、Jekyllのセットアップに四苦八苦した。

Jekyllがだいたいセットアップできたところで、どんなサイトデザインにしようか考え始めた。
調べたところ、生のJekyllを使うよりも簡単に見栄えのいいサイトを作れる方法がある模様。

## Octopress
もっとも有名なのは[__Octopress__](http://octopress.org/)。
ホームページの説明によると、「Octopress is a framework designed for Jekyll, the static blogging engine powering Github Pages」とのこと。
フレームワークと呼ぶのはちょっと大げさな気がする。
まあ見たところ、Jekyllをサイト生成エンジンとした、ブログサイト構築、ブログエントリ作成、ブログサイトデプロイなどを簡易化するツール。

広く使われていて情報が豊富だし、テーマを選んでエントリの内容を[__Markdown__](https://ja.wikipedia.org/wiki/Markdown)で書くだけでかっこいいサイトが作れる。バージョンは2系が主に使われているやつで、3系がβ状態。

血迷って3系に手を出してみる。[GitHubにあるREADME](https://github.com/octopress/octopress)を見ながらWindows 7上にインストールして、適当なサイトを作ろうとするも`jekyll build`でエラー。さすがにWindowsじゃだめかと思い、CentOS 7のVMを立ち上げてそこでやってみるもまた`jekyll build`でエラー。

心折れかけながらドキュメントなど見ていたら、多くのプラグインがまだ開発中で、3系は基本的な機能しか動かなそうなことが発覚。素直に2系にすることに。

2系は成熟しているし情報が沢山あるので、順調にインストールとテストサイト作成に成功したあたりで、不審な情報を発見した。

[Jekyllのドキュメント](http://jekyllrb.com/docs/plugins/)によると、GitHub Pagesではセキュリティ対策のためにJekyll をセーフモードで実行するため、カスタムプラグインが無効になるとのこと。
Octopressが生成したJekyllソースをGitHub Pagesに上げたらビルドして公開してくれると思っていたけど、OctopressはJekyllのプラグイン機能をもりもり利用しているようなので、上手くいかないようだ。

つまりOctopressをGitHub Pages上のサイトに使うとしたら、結局ビルド成果物をアップしないといけなくなる。JekyllのソースだけをGitHubで管理するように出来たらいいと思っていたが当てが外れた。

## Jekyll-Bootstrap
Octopressを使うモチベーションが下がり、他のを探したところ、[__Jekyll-Bootstrap__](http://jekyllbootstrap.com/)というのを見つけた。

Jekyll-BootstrapはJekyllのソースそのもので、面倒な部分は既にできてるので、ユーザはテンプレートを使って記事の内容を書くだけでいいよ、というもの。テーマ機能と、記事作成作業を[__Rake__](http://docs.seattlerb.org/rake/)で簡易化するためのRakefile付き。

すばらしいことに、「JekyllのソースだけをGitHubで管理するように出来たらいい」という需要に応えることを目指して作られていて、Jekyll-Bootstrapをベースに作ったJekyllソースはGitHub Pages上のJekyllでビルド可能。

まさに求めていたものと心躍った。
が、[プロジェクトページ](https://github.com/plusjade/jekyll-bootstrap)を見るにあまり活発に開発が進んでない模様。
廃れ行きそうなツールを使うのもなぁ…

## 結論
Jekyll-Bootstrapを使うのは気が進まない。Octopressを使うとビルド成果物をアップしないといけない。
どうせビルド成果物を上げるのなら、Jekyllにこだわる必要はないか、ということで、去年末くらいから盛り上がってきている[__Hugo__](https://gohugo.io/)にすることに。Hugoについてはまた[別のエントリ](http://tbd.kaitoy.xyz/2015/08/28/using-hugo/)で書く。
