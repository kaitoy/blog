+++
categories = [ "Programing" ]
date = "2017-01-17T00:15:25-07:00"
draft = false
eyecatch = "goslings-spring.png"
slug = "goslings-development-memo4-spring-boot-logging"
tags = [ "goslings", "spring", "spring-boot" ]
title = "Goslings開発メモ - その4: Spring Boot続続続編 (ロギング)"
+++

「[Goslings開発メモ - その3: Spring Boot続続編 (例外処理)](https://www.kaitoy.xyz/2017/01/13/goslings-development-memo3-spring-boot-exception/)」の続き。

Spring Boot続続続編で、ロギングについて。

<br>

{{< google-adsense >}}

# Spring Bootアプリにおけるロギング
Spring Bootアプリにおけるロギングについては公式の[マニュアル](https://docs.spring.io/spring-boot/docs/1.4.3.RELEASE/reference/html/boot-features-logging.html)と[How-toガイド](https://docs.spring.io/spring-boot/docs/1.4.3.RELEASE/reference/html/howto-logging.html)を読むべし。
この記事にはこれらの内容をまとめておく。

<br>

Spring Bootは内部でのロギングにApacheの[Commons Logging](https://commons.apache.org/proper/commons-logging/)を使っている。

Commons Loggingはファサードライブラリだ。
つまり、Commons LoggingはロギングAPIだけをアプリケーションに提供し、実際のログ出力処理をするロギング実装ライブラリへの橋渡しとして機能する。
ロギング実装ライブラリには色々な選択肢があるが、Spring Bootは[JUL](https://docs.oracle.com/javase/jp/8/docs/api/java/util/logging/package-summary.html)、 [Log4j 2](http://logging.apache.org/log4j/2.x/)、[Logback](http://logback.qos.ch/)用のデフォルト設定を備えているので、これらのいずれかを使うのが楽であろう。

全てのスターターは`spring-boot-starter-logging`というロギングスターターに依存していて、これがLogbackを使うので、普通はそのままLogbackを使うことになる。
`spring-boot-starter-logging`は、JUL、Commons Logging、Log4j、[SLF4J](https://www.slf4j.org/)によるログ出力をLogbackにルーティングするため、アプリ側や他の依存ライブラリがこれらを使っていてもLogbackに一本化できる。

`spring-boot-starter-logging`の代わりに`spring-boot-starter-log4j2`に依存し、Log4j 2を使う[方法もある](https://docs.spring.io/spring-boot/docs/1.4.3.RELEASE/reference/html/howto-logging.html#howto-configure-log4j-for-logging)が、Goslingsには普通に`spring-boot-starter-logging`を使った。

また、Goslings本体のログ出力には、プレースホルダを使いたかったのでSLF4Jを使った。

# Spring Bootアプリにおけるロギング設定
Spring Bootが備えているデフォルトのロギング設定は、`ERROR`、`WARN`、`INFO`レベルのログをいい感じにフォーマットしてコンソールに吐くというものになっている。

以下この設定の変更方法などを書く。

#### ファイルへのログ出力
ログをファイルにも吐くようにするには、`logging.file`というプロパティでファイルパスを指定するか、`logging.path`というプロパティでディレクトリパスを指定すればいい。
(後者の場合ログファイル名は`spring.log`になる。)

Spring Bootアプリでプロパティを指定する方法は色々あり([ここ](https://docs.spring.io/spring-boot/docs/1.4.3.RELEASE/reference/htmlsingle/#boot-features-external-config)とか[ここ](https://docs.spring.io/spring-boot/docs/1.4.3.RELEASE/reference/html/howto-properties-and-configuration.html)参照)、大抵は`application.properties`で指定するんだろうけど、手軽にコマンドラインで以下の様に指定することもできる。

```cmd
java -jar build/libs/goslings-0.0.1.jar --logging.file=build/hoge.log
```

<br>

ログファイルはデフォルトで10MBでローテーションする。

#### ログレベル
ログレベルには重大度の低い方から`TRACE`、`DEBUG`、`INFO`、`WARN`、`ERROR`、`FATAL`の6段階があり、指定したログレベル以上のログが出力される。(`OFF`というログ出力を止めるものもある。)
つまりSpring Bootのデフォルトのログレベルは`INFO`だということだ。(Logbackには`FATAL`がなく`ERROR`として出力される。)

ログレベルは`logging.level.<ロガー名>`という形式のプロパティで指定できる。
例えばコマンドラインから指定するなら以下の感じ。

```
java -jar build/libs/goslings-0.0.1.jar --logging.level.org.springframework.web=DEBUG
```

<br>

全ロガーのログレベルは`logging.level.root`で指定できる。

#### ロギング実装ライブラリの設定
ロギング実装ライブラリの設定ファイルをカスタマイズして、より詳細な設定をすることもできる。

Logbackの場合、クラスパスのルートに置かれた`logback-spring.xml`か`logback.xml`がロードされる。
設定ファイルの二重初期化を防いだり[Spring Boot拡張設定](https://docs.spring.io/spring-boot/docs/1.4.3.RELEASE/reference/html/boot-features-logging.html#boot-features-logback-extensions)を利用可能にするために、前者のファイル名が推奨されている。
(Groovyが使える環境なら`logback-spring.groovy`でもいい。)

いつものようにjavaコマンドでアプリを起動する場合は`-jar`オプションを使うため、`-cp`オプションでクラスパスを指定しても無視されてしまうので、基本は`logback-spring.xml`はjarの中に入れることになる。
プロジェクトのリソースディレクトリのトップ(デフォルトでは`src/main/resources/`)に`logback-spring.xml`を置いておけば、GradleのJavaプラグインの`processResources`タスクによってjar内の適切な場所に取り込まれる。

`logging.config`プロパティで設定ファイルのパスを指定することもできる。
例えばコマンドラインから指定するなら以下の感じ。

```
java -jar build/libs/goslings-0.0.1.jar --logging.config=logback-spring.xml
```

<br>

`logback-spring.xml`の中身は、例えば以下の様に書くとコンソール出力をなくしてファイル出力だけにできる。

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <include resource="org/springframework/boot/logging/logback/defaults.xml" />
  <property name="LOG_FILE" value="${LOG_FILE:-${LOG_PATH:-${LOG_TEMP:-${java.io.tmpdir:-/tmp}}/}spring.log}"/>
  <include resource="org/springframework/boot/logging/logback/file-appender.xml" />
  <root level="INFO">
    <appender-ref ref="FILE" />
  </root>
</configuration>
```

ここで注目すべきは2点。

まずは`include`している`defaults.xml`と`file-appender.xml`だ。
これらはSpring Bootのコアライブラリである`spring-boot.jar`に含まれるファイル。
`spring-boot.jar`には他にも`base.xml`と`console-appender.xml`が含まれている。
これらは、前節までに書いたSpring Bootのロギング挙動を実現している設定ファイルなので、これらを`include`して利用すれば自分のカスタム設定ファイルが簡単に書ける。

もう一点は`LOG_FILE`といったプロパティ。
これらはSpring Bootが設定してくれるプロパティで、詳細は[ここ](https://docs.spring.io/spring-boot/docs/1.4.3.RELEASE/reference/html/boot-features-logging.html#boot-features-custom-log-configuration)に。

<br>

今日はここまで。
[次回](https://www.kaitoy.xyz/2017/01/24/goslings-development-memo5-spring-boot-static-resources/)もまたSpring Bootで、静的リソース処理について。
