+++
categories = [ "Programing" ]
date = "2016-12-11T15:26:45-07:00"
draft = false
eyecatch = "goslings-logo.png"
slug = "goslings-development-memo0-intro-design"
tags = [ "goslings", "spring", "spring-boot", "jgit", "aws", "aws-ecs" ]
title = "Goslings開発メモ - その0: 紹介と概要と設計編"
+++

つい先日[__Goslings__](https://github.com/kaitoy/goslings)というものを作った。
[Gitのリポジトリの中身](https://www.kaitoy.xyz/2015/12/27/git-repository/)をビジュアライズするWebアプリケーションだ。
なんとなく見て楽しいという効用がある他は、Gitの勉強にちょっと使えるかもしれないという程度のものだが、もともと[Git Advent Calendar 2016](http://qiita.com/advent-calendar/2016/git)のネタを作るために作ろうと思ったものなので、とりあえずはこんなものでいいのだ。
将来気が向いたら、リポジトリの変更をリアルタイムに反映したり、リポジトリの操作もできるように拡張してもいいかもしれないけど、実用性が感じられないので多分やらない。

因みに、goslingsというのはgeese(雁)の子供を指す、ちょっとマイナーな英語。

![geese](/images/goslings-development-memo0-design/geese.JPG)

<br>

Gitオブジェクトを見るアプリだから、GOで始まる名前にしようかと思っていて、そういえば今住んでいるFort Collinsに大量にいるgeeseの子供がgoslingsというし、並んで歩いている姿がちょうどコミットグラフのようだと思い、Goslilngsと名付けた。
単数形だと[カナダのイケメン俳優](https://en.wikipedia.org/wiki/Ryan_Gosling)かと思われてしまうので、複数形にした。goslingが一人でいることってないし。

Goslingsは[Spring Boot](https://projects.spring.io/spring-boot/)や[JGit](https://eclipse.org/jgit/)などの習作でもある。
学んだことはアプリケーションとしてアウトプットするとよく身に付くものだ。
また文章としてもアウトプットしておくとさらによく身に付き、備忘録にもなるので、Goslingsの開発メモをいくつかのエントリに分けて書いていくことにする。

まずはSpring Boot編を書こうかと思うが、その前にGoslingsの設計等について書いておく。

# Goslingsのアーキテクチャ
GoslingsはWebサーバとして動き、始めにクライアントにHTML文書を返した後は、REST APIサーバとして働く。

サーバ側はJavaでできていて、Spring BootとJGitを使っている。
JGitを使いたかったのでJavaにしたが、そうでなければ[Node](https://nodejs.org/ja/)で書きたかった。

因みに、今回はコーディングの詳細にあまりこだわらないつもりだったので、[Lombok](https://projectlombok.org/)で楽をしようかと思ったけど、うっとうしい[バグ](https://github.com/rzwitserloot/lombok/issues/879)を踏み、どうやっても回避できなかったので使うのやめた。
二度と使うまい。

クライアント側はJavaScript(ES2015 + async/await)の[SPA](https://en.wikipedia.org/wiki/Single-page_application)で、禁[jQuery](https://jquery.com/)縛り。
[React](https://facebook.github.io/react/) + [Redux](https://github.com/reactjs/redux)というのをやってみたかったが、なんか大げさだしそこまで時間がとれなそうだったので、フレームワークなしで作った。ので、
「[You Don't Need jQuery](http://qiita.com/tatesuke/items/b9548dd484b01b139b74)」とにらめっこしながら書いた。

Gitのコミットグラフの描画には、[vis.js](http://visjs.org/)を使った。
[Stack Overflowの回答](http://stackoverflow.com/questions/7034/graph-visualization-library-in-javascript)から雰囲気で選んだけど、やりたかったことが全部できて、見た目もよかったのでよかった。

サーバは[Docker](https://www.docker.com/)で動かすためにステートレスに作ったつもりで、後述の作業ディレクトリをコンテナ間で共有し、サーバの負荷に応じてコンテナを増やしたり減らしたり、簡単にスケールするようになっているはず。

# Goslingsの機能設計
Goslingsサーバにブラウザでアクセスすると、まず参照したいGitリポジトリのURIを入力するフォームが表示される。
ここにはローカルにあるリポジトリへのファイルシステム上のパス(e.g. `C:\repos\project-hoge\.git`)か、リモートにあるリポジトリのURL(e.g. `https://repos.foo.com/project-hoge.git`)を入力できる。

![goslings-form](/images/goslings-development-memo0-design/goslings-form.png)

<br>

URIを入力して`Browse`ボタンを[押下する](http://qiita.com/yaju/items/0ceb6a0343561b4d208e)と、Goslingsの作業ディレクトリ(デフォルトではtmpディレクトリの下の`goslings`)に、ローカルリポジトリの場合はそこへのsymlinkを、リモートリポジトリの場合はベアなクローンを作成する。
いずれの場合にも、正規化したURIから生成したUID(SHA-1ハッシュ)をsymlinkファイル名とクローンディレクトリ名に使う。
サーバはリポジトリの準備ができたら、そのUIDをトークン(i.e. リポジトリ引換券)としてクライアントに渡す。
クライアントはそのトークンを使って、リポジトリの情報をサーバに要求する。

こうすることで、以下の様に後でリポジトリを取り扱いやすくなる。

* クライアントやサーバは、可変長の長ったらしい特殊文字の含まれたURIの代わりに、40文字の数字とアルファベットだけで構成されたトークンでリポジトリを特定でき、処理がしやすい。
* 後でサーバがリポジトリにアクセスする際、ローカルとリモートを区別する必要がないので、処理がしやすい。
* サーバ内部でリポジトリというエンティティを扱う際、リポジトリに直接触るデータレイヤと、クライアントからのリクエストをさばくインターフェースレイヤとの間で、単なる文字列であるトークンをやりとりすればよく、データレイヤの実装の詳細をインターフェースレイヤに曝さなくてよくなり、レイヤをきれいに分離できる。これはJavaの[インターフェース](https://docs.oracle.com/javase/tutorial/java/IandI/createinterface.html)を作ってやってもできるが、インターフェースのAPIを考える手間を考えるとトークンの方が楽。

クライアントはトークンを受け取ったらコミットグラフビューに遷移する。

![graph](/images/goslings-development-memo0-design/graph.png)

<br>

このビューでの表示は[以前Gitリポジトリの中身を解説した記事](https://www.kaitoy.xyz/2015/12/27/git-repository/)に合わせた。

初期状態ではコミットと参照とタグだけが表示されていて、コミットをダブルクリックするとツリーが表示され、さらにツリーをダブルクリックするとドリルダウンしていける。
ノードをシングルクリックするとそのコンテンツを参照できる。

# Goslingsの使い方
Spring Bootを使ったおかげで、ビルド成果物は単一のjarで、これを以下の様に実行するだけでサーバが立ち上がる。Webアプリケーションコンテナいらず。

```sh
$ java -jar goslings-server-0.0.1.jar　--server.port 80
```

`com.github.kaitoy.goslings.server.reposDir`というシステムプロパティを使って作業ディレクトリのパスを指定できる。

また、`com.github.kaitoy.goslings.server.uriPrefix`というシステムプロパティに値を設定すると、その値で始まるURI以外をフォームで入力するとエラーになるようになる。
リモートリポジトリを何でもかんでもクローンされるとディスク容量がいくらあっても足りないので、URLに制限をかけるために作った設定。
汎用性は考えておらず、複数指定したり正規表現を指定したりといったことはできない。

[Dockerコンテナイメージ](https://hub.docker.com/r/kaitoy/goslings/)もあって、以下のようなコマンドでダウンロードして起動できる。

```sh
$ docker pull kaitoy/goslings
$ docker run -p 80:80 -itd kaitoy/goslings 80 /goslings-repos https://github.com/kaitoy/
```

`docker run`の後ろの方の`80 /goslings-repos https://github.com/kaitoy/`が、それぞれ`--server.port`、`com.github.kaitoy.goslings.server.reposDir`、`com.github.kaitoy.goslings.server.uriPrefix`に渡される。
`--server.port`のもの以外は省略してもいい。

# Goslings as a Service
Goslings as a Service、略してGaaSを http://www.goslings.tk で公開している。
`https://github.com/kaitoy/`で始まるURLしか受け付けないようにしてある。

[AWS](https://aws.amazon.com/)の無料枠を活用して[EC2 Container Service (ECS)](https://aws.amazon.com/ecs/)でホストしていて、[Freenom](http://www.freenom.com/ja/index.html)で無料で取得した`goslings.tk`ドメインとこれまた無料のFreenomのネームサーバを利用して上記のアドレスにしている。

AWSもFreenomも無料なのは12か月だけなので、それが過ぎたらGaaSは終了する予定。
