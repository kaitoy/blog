+++
categories = [ "Programming" ]
date = "2016-03-19T11:47:03-06:00"
draft = false
eyecatch = "pcap4jlogo.png"
slug = "zundoko-kiyoshi-with-pcap4j"
tags = [ "pcap4j", "zundoko" ]
title = " ズンドコキヨシ with Pcap4J - ZUNDOKOプロトコルを実装してみた"
+++

先週くらいから巷でズンドコズンドコ騒いでいると思ってはいたが、昨日ようやくその元ネタを見た。
以下のツイートだ。

<blockquote class="twitter-tweet" data-lang="ja"><p lang="ja" dir="ltr">Javaの講義、試験が「自作関数を作り記述しなさい」って問題だったから<br>「ズン」「ドコ」のいずれかをランダムで出力し続けて「ズン」「ズン」「ズン」「ズン」「ドコ」の配列が出たら「キ・ヨ・シ！」って出力した後終了って関数作ったら満点で単位貰ってた</p>&mdash; てくも (@kumiromilk) <a href="https://twitter.com/kumiromilk/status/707437861881180160">2016年3月9日</a></blockquote>
<script async src="//platform.twitter.com/widgets.js" charset="utf-8"></script>

面白い。
巷ではこれを[いろんな言語で実装したりしているみたい](http://qiita.com/shunsugai@github/items/971a15461de29563bf90)でさらに面白い。

私もこのビッグウェーブに乗らないわけにいかないので、専門分野であるネットワーク周りを開拓しようと思い、ZUNDOKOプロトコルというものを考案して実装してみた。書いたソースは[GitHub](https://github.com/kaitoy/zundoko-protocol)においた。

<br>

{{< google-adsense >}}

ZUNDOKOプロトコル
---------------
クライアントはサーバに「ズン」か「ドコ」を送る。

サーバは「ズン」を4回受信した後に「ドコ」を受信するとクライアントに「キ・ヨ・シ！」を返す。

クライアント/サーバ間でやり取りするメッセージ(Zundokoパケット)のフォーマットは下図。

```
 0                            15                              31
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|             zundoko (null-terminated string)                  |
|                                                               |
|                                                               |
|                                                               |
|                                                               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

要はzundokoフィールドがあるだけ。
このzundokoフィールドは20 byte固定長で、NULL (0x00)で終わるUTF-8の文字列を保持する。

このメッセージを運ぶ下位レイヤはEthernetで、EtherTypeは0x01FF。

Ethernetにした理由は実装(下記)が楽だから。
EtherTypeは[IANA](http://www.iana.org/assignments/ieee-802-numbers/ieee-802-numbers.xhtml#ieee-802-numbers-1)でExperimentalとされている範囲から適当に選んだ。もちろんIANAに登録などはしていない。

因みに、Ethernetヘッダを加えた、クライアント/サーバ間でやり取りする完全なパケットは以下の様になる。(プリアンブルとかは除く。)

```
 0                            15
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|    Dst Hardware Address       |
+                               +
|                               |
+                               +
|                               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|    Src Hardware Address       |
+                               +
|                               |
+                               +
|                               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|    EtherType (0x01FF)         |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|        zundoko                |
| (null-terminated string)      |
|                               |
|                               |
|                               |
|                               |
|                               |
|                               |
|                               |
|                               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|            padding            |
|                               |
```

実装
----
[Pcap4J](https://github.com/kaitoy/pcap4j)を使ってクライアントとサーバを実装した。
書いたのは以下の3つのクラス。(といくつかのインナークラス。)

* [com.github.kaitoy.zundoko.protocol.ZundokoPacket](https://github.com/kaitoy/zundoko-protocol/tree/master/src/main/java/com/github/kaitoy/zundoko/protocol/ZundokoPacket.java): Pcap4JがZundokoパケットを解析するのに使うクラス
* [com.github.kaitoy.zundoko.protocol.ZundokoServer](https://github.com/kaitoy/zundoko-protocol/tree/master/src/main/java/com/github/kaitoy/zundoko/protocol/ZundokoServer.java): Zundokoサーバ
* [com.github.kaitoy.zundoko.protocol.ZundokoClient](https://github.com/kaitoy/zundoko-protocol/tree/master/src/main/java/com/github/kaitoy/zundoko/protocol/ZundokoClient.java): Zundokoクライアント

ビルド
------
今だに[Maven](https://maven.apache.org/)。

以下を実行するとビルドできる。

```cmd
git clone https://github.com/kaitoy/zundoko-protocol.git
cd zundoko-protocol
mvn install
```

サーバ/クライアントの使い方
-----------------------
下位レイヤがEthernetなのでネットワークセグメントを超えたZundokoパケットのやり取りはできない。
よってまずは同一ネットワーク内にサーバマシンとクライアントマシンを用意する。
VMware Playerのホストとゲストで可。

サーバマシンとクライアントマシンには[WinPcap](http://www.winpcap.org/)か[libpcap](http://www.tcpdump.org/)をインストールしておく。

依存ライブラリをダウンロードするため、`zundoko-protocol\bin\`に`cd`して以下のコマンドを実行する。(要Maven。)

```cmd
configure.bat
```

サーバを起動するには、`zundoko-protocol\bin\`で以下のコマンドを実行する。

```cmd
run-server.bat
```

起動するとZundokoパケットをやり取りするネットワークインターフェースを聞かれるので、
クライアントとL2レベルでつながっているものを選ぶ。
選んだインターフェースのMacアドレスはクライアントの起動に使うのでメモしておく。

クライアントを起動するには、`zundoko-protocol\bin\`で以下のコマンドを実行する。

```cmd
run-client.bat <Macアドレス>
```

`<Macアドレス>`にはサーバ起動時にメモしたMacアドレスを入力する。
起動するとZundokoパケットをやり取りするネットワークインターフェースを聞かれるので、
サーバとL2レベルでつながっているものを選ぶ。

クライアントが起動すると、一秒おきに「ズン」と「ドコ」をランダムに選び、
サーバに送りつつコンソールに表示する。
また、サーバからZundokoパケット受信したらそのzundokoフィールドの値を表示する。


実行例
-----

{{< youtube ad3u4Y86e_I >}}
