+++
categories = [ "Programming" ]
date = "2016-04-16T11:09:53-06:00"
draft = false
cover = "pcap4j-kotlin.png"
slug = "pcap4j-in-kotlin"
tags = [ "pcap4j", "kotlin", "jvm language" ]
title = "Pcap4J in Kotlin"
highlight = true
highlightStyle = "monokai"
highlightLanguages = []

+++

[Groovy](https://www.kaitoy.xyz/2016/04/10/pcap4j-in-groovy/)に続いて、[__Kotlin__](https://kotlinlang.org/)で[__Pcap4J__](https://github.com/kaitoy/pcap4j)を使ってパケットキャプチャしてみた。

KotlinからでもPcap4Jちゃんと動くよということを実証するのが主な目的。
また、今後JavaなアプリはKotlinで書こうかと思っているので、その予習も兼ねている。

<!--more-->

{{< google-adsense >}}

# Kotlinとは
KotlinはJVM言語、つまりJavaのバイトコードにコンパイルされてJavaの実行環境で動くプログラミング言語のひとつ。
[IntelliJ IDEA](https://www.jetbrains.com/idea/)で有名な[JetBrains社](https://www.jetbrains.com/)によって[OSS](https://github.com/JetBrains/kotlin)として開発されている。

2011年に生まれた新しめな言語で、2016/2/17に[v1がリリースされ](http://blog.jetbrains.com/jp/2016/02/17/578)、主にAndroidアプリの開発用として注目されている。

「実用的」であることを売りにしていて、つまり少ない学習コストで導入でき、既存のJavaコードやMavenなどのツールとの相互運用性を持つとされている。
IntelliJ IDEA、[Android Studio](http://developer.android.com/sdk/index.html)、[Eclipse](https://eclipse.org/)といった主要なIDEのサポートもあり、開発環境は整っている。
v1以降の後方互換性の維持も表明されていて、長期サポートが必要な製品開発にも堪える。

さらに、厳格な静的型付けやNullable/Non-Null型などにより安全性を確保しつつ、型推論やラムダ式などで生産性を高めている。

Javaのバイトコードだけでなく、JavaScriptを生成するバックエンドを持っているのも大きな特徴。
ユースケースがよく分からないが。

GitHubにホストされているKotlinプロジェクトは、2016/4/15現在、全体の __0.1%__ (3493/3215549) しかない。
v1のリリースは結構注目を集めたので、この割合は今後増えていくと期待される。

# Kotlinのインストール
[チュートリアル](https://kotlinlang.org/docs/tutorials/)に従えば、IDEやテキストエディタ+コマンドラインの環境を整えてHello Worldを書いて実行するところまで簡単にできる。
筆者はEclipse(Mars)とコマンドラインの環境をWindows 7上で作った。
Kotlinのバージョンは1.0.1-2。

コマンドラインについては、[GitHub Releases](https://github.com/JetBrains/kotlin/releases/latest)からアーカイブをダウンロードして、適当なところに展開して`bin`フォルダにパスを通すだけ。
前提となるJavaについては、環境変数`JAVA_HOME`を設定するか、`java`コマンドにパスを通せばいい模様。

因みにKotlinの書き方は、[Kotlin Koans](https://kotlinlang.org/docs/tutorials/koans.html)という例題集を[オンラインのIDE](http://try.kotlinlang.org/koans)で解きながらを学ぶことができる。

# パケットキャプチャ with Pcap4J in Java
Pcap4Jでパケットキャプチャするコードを普通にJavaで書くと以下の様になる。
([Groovy](https://www.kaitoy.xyz/2016/04/10/pcap4j-in-groovy/)の時のと一緒。)

{{< gist eebcd5bdfab179cab916d3182f3d6d11 >}}

これを実行すると、パケットキャプチャするネットワークインターフェースを選択し、5つのパケットをキャプチャしてタイムスタンプと共にコンソールに表示する。

# パケットキャプチャ with Pcap4J in Kotlin
上記処理をKotlinで書くと以下の様になる。

{{< gist 074769880c7bf4c0628c1c25a724c1a7 >}}

メインクラスはGroovy同様書かなくていいが、`main`関数は必要。

型推論があってとても楽。
ラムダ式、補間文字列(String interpolation)、名前付き引数といったモダンめな機能は普通に使える。
(名前付き引数はJavaで書いたメソッドをKotlinから呼ぶときは使えない。)

オープンクラスを実現する機能である[Extensions](https://kotlinlang.org/docs/reference/extensions.html)を`PcapHandle`に使ってみた。
なんだか便利そう。

Nullable/Non-Null型がすごい。言語仕様で`NullPointerException`が発生しないように守ってくれる。
例えば`filter`は宣言の時点では初期化文で`null`が入る可能性があるので`Nullable`な`String`という型に推論されるが、`filter?.let`というNullチェックをするメソッドに渡したブロック内では自動で`Non-Null`な`String`にキャストされ、`filter.length`を安全に評価できるようになっている。
Nullチェックをしないで`filter.length`と書くとコンパイルエラーになる。すごい。

けどJavaのコードから返ってくるオブジェクトは普通、プラットフォーム型というものになり、このNullセーフな仕組みが働かない。
これに対しては[Null可能性アノテーション](https://kotlinlang.org/docs/reference/java-interop.html#nullability-annotations)を使えば幸せになれるらしい。

さらに、上記コードには表れていないが、キャストも安全になっている模様。(cf. [スマートキャスト](http://kotlinlang.org/docs/reference/typecasts.html#smart-casts)、[セーフキャスト](http://kotlinlang.org/docs/reference/typecasts.html#safe-nullable-cast-operator))

Kotlinは基本コンパイラ言語なので、上記コードを実行するには以下ようなコマンドで一旦コンパイルする必要がある。

```cmd
kotlinc -cp pcap4j-core.jar Pcap4jLoop.kt -include-runtime -d Pcap4jLoop.jar
```

このコマンドだとKotlinのランタイム入りjarファイルができる。
このjarを、Pcap4J 1.6.2、Slf4J 1.7.12、JNA 4.2.1を使って、以下のコマンドで実行できることを確認した。

```cmd
java -cp pcap4j-core.jar;pcap4j-packetfactory-static.jar;jna.jar;slf4j-api.jar;Pcap4jLoop.jar Pcap4jLoopKt tcp
```

このコマンドで指定しているメインクラス`Pcap4jLoopKt`は、上記コードでクラスの記述を省いた為にKotlinがソースファイル名(Pcap4jLoop.kt)を基に自動生成したもの。

コンパイル/実行方法は[他にもある](https://kotlinlang.org/docs/tutorials/command-line.html#creating-and-running-a-first-application)。

# スクリプトなKotlin
Kotlinプログラムはスクリプトとしても書けて、コンパイル無しで実行することができる。
この場合、`main`関数は消してその中身をトップレベルに書き、ファイルの拡張子を`.kts`にする。

{{< gist b6ee844ad2353585a30984ef0bedf844 >}}

上記スクリプトは以下のコマンドで実行できた。

```cmd
kotlinc -cp pcap4j-core.jar;jna.jar;pcap4j-packetfactory-static.jar;slf4j-api.jar -script Pcap4jLoop.kts tcp
```

EclipseのKotlinプラグインはこのスクリプト形式をまだサポートしていないようで残念。
