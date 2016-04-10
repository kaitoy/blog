+++
categories = [ "Programming" ]
date = "2016-04-10T00:05:27-06:00"
draft = false
eyecatch = "pcap4j-groovy.png"
slug = "pcap4j-in-groovy"
tags = [ "pcap4j", "groovy", "jvm language" ]
title = "Pcap4J in Groovy"

+++

[__Groovy__](http://www.groovy-lang.org/index.html)で[__Pcap4J__](https://github.com/kaitoy/pcap4j)を使ってパケットキャプチャしてみた。

GroovyからでもPcap4Jちゃんと動くよということを実証するのが主な目的。

## Groovyとは
GroovyはJVM言語、つまりJavaのバイトコードにコンパイルされてJavaの実行環境で動くプログラミング言語のひとつ。
Javaのプログラマにとってとっつきやすい文法を保ちつつ、動的型付けを実現し、また[Ruby](https://www.ruby-lang.org/ja/)などのスクリプト言語の記法や機能を取り入れ、生産性を高めている。

現在は[Apacheソフトウェア財団](http://www.apache.org/)によって管理され、[OSS](https://github.com/apache/groovy)として開発が進められている。

Webアプリケーションフレームワークの[__Grails__](https://grails.org/) やビルドツールの[__Gradle__](http://gradle.org/)で採用されている。
Gradleは最近Javaプロジェクトのビルドツールの主流になっていて、Groovyはその定義ファイルを記述する言語として知名度が高いが、Groovyで開発されているプロジェクトとなるとあまり多くないようだ。
GitHubにホストされているGroovyプロジェクトは、2016/4/9現在 __0.8%弱__ (25,087/3,200,229) しかない。

なぜ人気がないのかはよく分からないが、少なくとも、長くて打ちにくい名前とダサいロゴは不評のようだ。

## Groovyのインストール
Windows 7にGroovy 2.4.6をインストールする。

[本家サイトの手順](http://www.groovy-lang.org/install.html)に従い、Binary Releaseのアーカイブをダウンロードして、適当なところに展開して、展開したフォルダのパスを環境変数`GROOVY_HOME`にセットし、`%GROOVY_HOME%\bin`を`PATH`に追加するだけ。

Java 6以降が前提なので、`JAVA_HOME`にJDK 1.7.0_17のパスをセットしておいた。JREでもいいはず。

## パケットキャプチャ with Pcap4J in Java

Pcap4Jでパケットキャプチャするコードを普通にJavaで書くと以下の様になる。

{{< gist eebcd5bdfab179cab916d3182f3d6d11 >}}

これを実行すると、パケットキャプチャするネットワークインターフェースを選択し、5つのパケットをキャプチャしてタイムスタンプと共にコンソールに表示する。

## パケットキャプチャ with Pcap4J in Groovy

上記処理をGroovyで書くと以下の様になる。

{{< gist c75837d3537303b004506d3e335eac17 >}}

メインクラスを書かなくていいところが大きい。
変数の型を書かなくていいのも楽。
クロージャや補間文字列(String interpolation)も使える。

また、ここでは使っていないが、オープンクラスなどのメタプログラミングもサポートされている。

上記コードは、Pcap4J 1.6.2、Slf4J 1.7.12、JNA 4.2.1を使って、以下のコマンドで実行できることを確認した。

```cmd
groovy -cp "pcap4j-core.jar;jna.jar;slf4j-api.jar;pcap4j-packetfactory-static.jar" Pcap4jLoop.groovy tcp
```

### 困ったところ

1. 本家サイトのドキュメントが分かり辛い。

    頭から読んでいくと急にディープな部分に引き込まれ、なかなかコードを書き始められなかった。

    最近の言語やフレームワークのサイトはチュートリアルに従って動くコードを見ながら概要から詳細に理解を深められる形になっていることが多いので、仕様の詳細が羅列されている感じのGroovyサイトはなんとも読みにくかった。

2. クラスパスの指定が上手くできない。

    groovyコマンドにオプションで複数のクラスパスを指定するのに、普通に`-cp pcap4j-core.jar;jna.jar`みたいにしたら最初の`pcap4j-core.jar`にしかクラスパスが通らなかった。
    区切りを`:`にするとどちらにも通らない。

    環境変数`CLASSPATH`に`pcap4j-core.jar;jna.jar`をセットしておくと`-cp`を使わなくても正しく両方に通るし、`%userprofile%\.groovy\`にjarを入れておくだけでもいいみたいなんだけど、`-cp`が中途半端にしか機能しないのが気持ち悪い。

    のでちょっとソースを見たら、groovyコマンドはバッチで書かれていることに気付いた。
    バッチだと、`;`で区切られているものは半角スペースで区切られているのと同じで別々の引数になってしまうので、上のような書き方だと`jna.jar`は`-cp`の値として処理されない。
    クラスパス全体をダブルコーテーションで囲って、`-cp "pcap4j-core.jar;jna.jar"`みたいにしたらできた。なんか残念な出来。。。
