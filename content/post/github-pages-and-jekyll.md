+++
categories = [ "Web" ]
date = "2015-08-15T10:48:49-06:00"
draft = false
eyecatch = "jekyll_logo.png"
slug = "github-pages-and-jekyll"
tags = [ "blog", "github", "jekyll" ]
title = "ブログ立ち上げ - GitHub PagesとJekyll"
+++

このブログを立ち上げたときの作業を、主に備忘録としていくつかのエントリに分けて書く。
このエントリでは主に[__GitHub Pages__](https://pages.github.com/)と[__Jekyll__](http://jekyllrb.com/docs/home/)について書く。

## 今の構成
このブログは、[__Hugo__](https://gohugo.io/)で作って、GitHub Pagesで公開している。

Hugoについては別のエントリで書くとして、GitHub Pagesは、GitHubが提供しているウェブページのホスティングサービスで、GitHubに特定の名前のレポジトリ、または任意のレポジトリに特定の名前のブランチを作ってウェブサイトのソースを置くと、公開してくれるというサービス。[PaaS](https://ja.wikipedia.org/wiki/Platform_as_a_Service)にあたるのかな。
[GitHub Pagesのサイト](https://pages.github.com/)に利用方法が載っている。

以下、このブログ立ち上げに向けてやった作業について書く。

## GitHub Pages味見
GitHub Pagesを利用するには、__GitHubユーザ名.github.io__ という名前のレポジトリを作るか、任意のレポジトリに__gh-pages__ という名前のブランチを作って、そこにサイトのソースを置けばいい。そのサイトには、前者の場合は`http://GitHubユーザ名.github.io`で、後者の場合は`http://GitHubユーザ名.github.io/レポジトリ名`でアクセスできる。

とりあえず前者をやってみる。

1. __kaitoy.github.io__ という名前の[レポジトリ](https://github.com/kaitoy/kaitoy.github.io)を作って、そのルートに「Hello World」とだけ書いた __index.html__ を置く。
2. ブラウザで`http://kaitoy.github.io`にアクセスすると、「Hello World」と表示された。

これだけ。

## GitHub PagesとJekyll
GitHub Pagesには、普通にHTML/CSS/Javascriptのソースを置いてもいいけど、Jekyllを利用することもできる。

Jekyllは、ブログ用の静的サイトジェネレータなるもので、[__Markdown__](https://ja.wikipedia.org/wiki/Markdown)で書いた記事を元にブログサイトのソースを生成するツール。GitHub Pages用のレポジトリにJekyllのソースをアップロードすると、Jekyllでビルドされ、その結果が公開される。

これはうれしい。  Jekyllのソースとビルド結果を別々に管理しなくてよくて楽だし、公開されるサイトが最新のソースに基づいていることが保証される。

結論から言うと、以下のような理由で結局Jekyllは使わなかったんだけど、Jekyllとの格闘の記録を残しておく。

* Windowsを正式サポートしていない。
* Rubyで書かれてるため、ビルドが遅い。ブログエントリが数百とかになると辛くなってくるらしい。
* Jekyllを使っても、かっこいいサイトを手軽に作ろうと思ったら、結局ビルド結果もGitHubに上げないといけなくなる。

## Jekyllセットアップ
GitHub PagesでJekyll使う場合は、GitHub Pagesと同じJekyll環境を手元に作ってプレビューできるようにしておくべきとのこと。なので、[これ](https://help.github.com/articles/using-jekyll-with-pages/)に従って自分のPC (Windows 7) にJekyllをセットアップする。

#### １．Rubyインストール
Jekyllは __Ruby__ で書かれてるので、まずはRubyをインストールする。
Windowsなので[__RubyInstaller__](http://rubyinstaller.org/) (ver. 2.2.2)をダウンロードしてインストール。
[__Bundler__](http://bundler.io/) (RubyのパッケージであるGemの依存をアプリケーションごとに管理するツール) もあるといいらしいので、`gem install bundler`を実行してインストール。

#### 2.  Jekyllインストール
さっき作ったレポジトリ　__kaitoy.github.io__ (の手元のクローン)のルートに、Bundlerの定義ファイルを __Gemfile__ という名前で作り、以下の内容を書く。

```
source 'https://rubygems.org'
gem 'github-pages'
```

依存するGemは __jekyll__ じゃなくて __github-pages__。これはGitHub Pages環境のJekyllということだろう。

で、__kaitoy.github.io__ のルートで`bundle install`を実行する。ここでエラー発生。
エラーメッセージによると、native gemをビルドするために __DevKit__ なるものが要るとのこと。

再びRubyInstallerのページに行ってDevKitをダウンロードして、[wiki](http://github.com/oneclick/rubyinstaller/wiki/Development-Kit)に従ってインストール。

再度`bundle install`したらJekyllのインストールに成功。

* github-pages: ver. 35
* jekyll: ver. 2.4.0

これで、ちょくちょく`bundle update`を実行すれば、最新のGitHub Pages環境に追随できる。

`bundle exec jekyll serve`すると、カレントディレクトリのJekyllソースがビルドされ、Webサーバが起動し、`http://localhost:4000`でそのビルド結果を見れるらしい。

#### 3.  Jekyll味見
試しに、適当な場所で`jekyll new hoge`を実行し、新規サイトフォルダ __hoge__ を作り、その中で`jekyll build`してみる。以下のエラー。

```text
c:/Ruby22-x64/lib/ruby/gems/2.2.0/gems/posix-spawn-0.3.11/lib/posix/spawn.rb:164: warning: cannot close fd before spawn
'which' は、内部コマンドまたは外部コマンド、
操作可能なプログラムまたはバッチ ファイルとして認識されていません。
[31m  Liquid Exception: No such file or directory - python c:/Ruby22-x64/lib/ruby/gems/2.2.0/gems/pygments.rb-0.6.1/lib/pygments/mentos.py in jekyll/_posts/2015-05-29-welcome-to-jekyll.markdown[0m
                    done.
```

Jekyllのサイトを見直したらWindowsはサポートされていないとのこと。
けど、Windowsにセットアップする方法は検索したらたくさん出てきた。
Jekyllのサイトでも紹介されている[__Run Jekyll on Windows__](http://jekyll-windows.juthilo.com/)というサイトの手順に従うとか、[__Portable Jekyll__](https://github.com/madhur/PortableJekyll)という、WindowsでJekyllを動かすためのツールを集めたものを使うとか。

後者は、Jekyllのインスタンスを含んでいて、将来にわたるJekyllのアップデートについていってくれるか怪しいので、前者を見てみる。

#### 4. Run Jekyll on Windowsを試す
Run Jekyll on Windowsによると、Jekyllはデフォルトでsyntax highlighterの __pygments.rb__ なるものに依存していて、pygments.rbをWindowsで使うには __Python__ とそのモジュールである __Pygments__ などをインストールする必要があるのこと。

とりあえずPythonを[ここ](https://www.python.org/downloads/windows/)からダウンロードしてインストール。バージョンは、3系はPygmentsがサポートしていないようなので2.7.10。
__pip__ なるPythonパッケージ管理ツールが要るとRun Jekyll on Windowsに書いてあるが、2.7.10にはデフォルトで入っていた。

`python -m pip install Pygments`を実行してPygmentsをインストール。これはどうもpygments.rbがラップしているものらしい。

また、Jekyllにはauto-regenerationなる、ファイル変更を検知して自動ビルドする機能があって、Windowsでこれを使うには __wdm__ というgemが必要らしい。
以下をGemfileに追加して、`bundle install`する。

```
gem 'wdm', '~> 0.1.0' if Gem.win_platform?
```

したら以下のエラー。

```text
c:\Ruby22-x64\lib\ruby\gems\2.2.0\gems\wdm-0.1.0\ext\wdm/rb_monitor.c:508: undefined reference to `rb_thread_blocking_region'
```

どうも、[ここ](https://github.com/Maher4Ever/wdm/issues/18)によると、エラーメッセージにある __rb_thread_blocking_region__ というメソッドは、Ruby 2.0で非推奨になり2.2で消されたものらしい。

wdmはもう数年更新されておらず、修正の見込みはなさそう。(後日見たら開発再開されてて、この問題も修正されていた。)

Rubyをダウングレードするの面倒なので、試しにそのまま`jekyll serve`したら以下のメッセージが出たけど動いた。

```text
  Please add the following to your Gemfile to avoid polling for changes:
    gem 'wdm', '>= 0.1.0' if Gem.win_platform?
 Auto-regeneration: enabled for 'c:/Users/Kaito/mirrored_data/pleiades/workspace/kaitoy.github.io/hoge'
```

auto-regenerationも動いている模様。実際ソースをいじったら自動で反映された。
よくわからないが、よしとする。

実は、以下のエラー(上でも出てたやつ)はまだ出ている。

```text
c:/Ruby22-x64/lib/ruby/gems/2.2.0/gems/posix-spawn-0.3.11/lib/posix/spawn.rb:164: warning: cannot close fd before spawn
'which' は、内部コマンドまたは外部コマンド、
操作可能なプログラムまたはバッチ ファイルとして認識されていません。
```

このwarningについてはRun Jekyll on Windowsには載っていないが、pygments.rbを0.5.0にダウングレードすればいいとの情報が[ここ](https://github.com/jekyll/jekyll/issues/2052)とかにある。

## 5. Jekyllとの決別
この辺りまでJekyllをセットアップした後、JekyllのWindowsとの相性の悪さに嫌気がさしつつ、Jekyllで簡単にかっこいいサイトを作るためのツールなどを調べているうちに、Jekyllを使うのをやめた。それについては別のエントリで書く。
