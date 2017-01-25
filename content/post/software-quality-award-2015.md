+++
categories = [ "Software Engineering" ]
date = "2015-12-03T12:28:24-07:00"
draft = false
eyecatch = "pcap4jlogo.png"
slug = "software-quality-award-2015"
tags = [ "yegor256", "pcap4j" ]
title = "Pcap4JがSoftware Quality Award 2015で入賞"
+++

[Teamed.io](http://www.teamed.io/)が主催の、ソフトウェアの品質とその開発プロジェクトの品質への取り組みを競うコンテスト、[Software Quality Award](http://www.yegor256.com/2015/04/16/award.html)の第一回が2015年4月～11月にかけて開催された。
Teamed.ioのCTOであるYegorとは、彼のブログを和訳してここに載せている関係でたまにメールしているが、そのやりとりの中で誘われたので私も[Pcap4J](https://github.com/kaitoy/pcap4j)をひっさげてそれに参加した。

<br>

{{< google-adsense >}}

優勝すると$4,096もらえるということではあったが、150以上のプロジェクトがエントリーしていて、[Gulp](http://gulpjs.com/)とか有名なものも入っていたので、どうせ全然ダメだろと思ってエントリー以来なにも対策しなかったが、なんと __8位__ 入賞を果たしてしまった。
まあ講評をみるとずいぶんこき下ろされてはいるが…

因みに講評は以下の感じ。

* utilパッケージがあってそこにユーティリティクラスがある。クソだ。
* NULLが可変オブジェクトで使われている。例えば[AbstractPcapAddress](https://github.com/kaitoy/pcap4j/blob/master/pcap4j-core/src/main/java/org/pcap4j/core/AbstractPcapAddress.java)。クソだ。
* スタティックメソッドとスタティック変数が多すぎる。文字通りどこにでもある。pcap4j-packetfactory-staticという名のスタティックメソッドだらけのモジュールまである。
* JavaDocに一貫性がなく、未完なものもある。[これ](https://github.com/kaitoy/pcap4j/blob/master/pcap4j-core/src/main/java/org/pcap4j/core/NotOpenException.java#L21-L23)とか。
* ほんのちょっとのissuesとたった6つのプルリクエストしかない。コミットがissuesにリンクされてない。変更のトレーサビリティはほとんどゼロだ。
* リリース手順が自動化されていない。[リリース](https://github.com/kaitoy/pcap4j/releases)がドキュメントに書かれていない。
* 静的解析してなくて、そのせいか乱雑なコードがたまにある。
* スコア: 3

静的解析くらいは導入しようかな…

ユーティリティクラスとかNULLとかスタティックメソッドは使うのやめるつもりはないけど。

そういえば、入賞者にはスポンサーである[JetBrainsの製品](https://www.jetbrains.com/products.html)の一年ライセンスがもらえることになっていたはずだが特に連絡がないな。
