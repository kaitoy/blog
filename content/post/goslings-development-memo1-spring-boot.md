+++
categories = [ "Programing" ]
date = "2017-01-03T23:36:01-07:00"
draft = false
cover = "goslings-spring.png"
slug = "goslings-development-memo1-spring-boot"
tags = [ "goslings", "spring", "spring-boot" ]
title = "Goslings開発メモ - その1: Spring Boot編"

+++

「[Goslings開発メモ - その0: 紹介と概要と設計編](https://www.kaitoy.xyz/2016/12/11/goslings-development-memo0-intro-design/)」の続き。

Spring Boot編。

<!--more-->

{{< google-adsense >}}

# Spring Bootとは
Spring Bootは[Spring Framework](http://projects.spring.io/spring-framework/)というJavaのWebアプリケーションフレームワークを簡単に利用するためのツールやライブラリ群。

これを使うと、Webアプリケーションコンテナ(e.g. [Tomcat](http://tomcat.apache.org/))なしで起動できるSpringアプリケーションを、自動コード生成も設定ファイル作成もせずに作ることができる。
必要な設定は自動で構成され、設定のカスタマイズもアノテーションでできる。

GAになったのが[2014年4月](https://www.infoq.com/news/2014/04/spring-boot-goes-ga)なのでかなり新しいものだが、JavaのWebアプリケーションを作るためのものとしては今世界的に最も流行っているもの。

私が昔とあるWebアプリを作った時は[Spring Roo](http://projects.spring.io/spring-roo/)という[RADツール](https://ja.wikipedia.org/wiki/RAD_(%E8%A8%88%E7%AE%97%E6%A9%9F%E3%83%97%E3%83%AD%E3%82%B0%E3%83%A9%E3%83%9F%E3%83%B3%E3%82%B0%E7%92%B0%E5%A2%83)が熱かったが、これはコード自動生成をして開発を助けてくれるもので、なんだか結局あまり流行らなかったようだ。

Goslingsには最新バージョンの1.4.3.RELEASEを使った。

# Spring Bootことはじめ
包括的網羅的なドキュメントは「[Spring Boot Reference Guide](http://docs.spring.io/spring-boot/docs/1.4.3.RELEASE/reference/htmlsingle/)」だが、今回あまり深く学ぶ時間が取れなかったのでこれはちら見した程度。
それよりも、ユースケースごとのチュートリアルが60個以上も載っている「[Getting Started Guides](https://spring.io/guides/)」を参考にした。

Goslingsサーバは基本REST APIサーバなので、上記チュートリアルの内「[Building a RESTful Web Service](https://spring.io/guides/gs/rest-service/)」を見ながら以下を実施した。

## 1. プロジェクト作成
チュートリアルにはGradleプロジェクトのディレクトリ構成を手動で作るところから書いてあるけど、そこは[IDEなどで楽できる](http://qiita.com/grachro/items/d1ebad3857a794895426)。
私はEclipseを使っていて、いつのまにかGradleプラグインである[Eclipse Buildship: Eclipse Plug-ins for Gradle](https://projects.eclipse.org/projects/tools.buildship)と[Gradle IDE Pack](https://marketplace.eclipse.org/content/gradle-ide-pack)がインストールされていたので、これらを使った。

どちらのプラグインでもプロジェクトは作成できるが、[Qiitaのこの記事](http://qiita.com/grachro/items/16bba860f9d9fe5ee4c5)にあるとおり、Gradle IDE Pack(に含まれる[Gradle (STS) Integration for Eclipse by Pivotal](https://github.com/spring-projects/eclipse-integration-gradle/))で作った場合、Gradle Wrapperが生成されないなどの問題があるので、Buildshipの方で作成。
ただ、Gradle IDE Packの方がパッケージ・エクスプローラでの見え方がちょっとよかったので、こちらでプロジェクトをインポートしなおした。

![gradle_import.png](/images/goslings-development-memo1-spring-boot/gradle_import.png)

(上がBuildshipのやつで、下がGradle IDE Packのやつ)

<br>

出来たプロジェクトは以下の感じ。

![project_structure.png](/images/goslings-development-memo1-spring-boot/project_structure.png)

## 2. Spring Boot Gradle plugin適用
[Spring Boot Gradle plugin](http://docs.spring.io/spring-boot/docs/1.4.3.RELEASE/reference/html/build-tool-plugins-gradle-plugin.html)というものがあって、これをプロジェクトに適用すると以下の恩恵を受けられる。

1. 依存ライブラリ管理機能

    Spring関係のライブラリについて適切なバージョンを設定してくれるので、Gradleビルド設定(i.e. `build.gradle`)の`dependencies`に自分でバージョンを書かなくていい。

2. 実行可能jar(war)のパッケージング機能

    ビルドされたjar(やwar)を、単独で実行可能になるようにマニフェストやライブラリを詰めて再パッケージングする`bootRepackage`というGradleタスクが追加される。

3. プロジェクトから直接アプリを起動する機能

    jarなどのアーティファクトをビルドせずに、プロジェクトから直接アプリを起動できる`bootRun`というGradleタスクが追加される。

<br>

`build.gradle`に以下の様に書くとSpring Boot Gradle pluginを適用できる。

* Gradle 2.1より古いバージョン

    ```gradle
    buildscript {
      repositories {
        mavenCentral()
      }
      dependencies {
        classpath('org.springframework.boot:spring-boot-gradle-plugin:1.4.3.RELEASE')
      }
    }

    apply plugin: 'org.springframework.boot'
    ```

    (`apply plugin: 'org.springframework.boot'`の部分は、Spring Boot Gradle plugin 1.4.1.RELEASE以前は`apply plugin: 'spring-boot'`だった。)

* Gradle 2.1以降

    ```gradle
    plugins {
      id 'org.springframework.boot' version '1.4.3.RELEASE'
    }
    ```

## 3. 依存ライブラリ追加
Spring Bootは依存ライブラリの管理も簡易化してくれる。

`spring-boot-starter-`で始まる[スターター](http://docs.spring.io/spring-boot/docs/1.4.3.RELEASE/reference/htmlsingle/#using-boot-starter)と呼ばれるライブラリがいくつか提供されていて、作りたいアプリの種類や機能に応じたものをプロジェクトの依存ライブラリとして追加すると、推移的に諸々の必要なライブラリが追加されるようになっている。
例えば、[Thymeleaf](http://www.thymeleaf.org/)をテンプレートエンジンに使ったWebアプリを作るなら`spring-boot-starter-thymeleaf`、[JPA](http://projects.spring.io/spring-data-jpa/) ([Hibernate](http://hibernate.org/orm/))でデータベースアクセスしたい場合は`spring-boot-starter-data-jpa`を使う。

Webアプリを作るのに最も一般的なのは`spring-boot-starter-web`で、Goslingsにもこれを使った。
これを使うと[Spring MVC](https://docs.spring.io/spring/docs/4.3.4.RELEASE/spring-framework-reference/html/mvc.html)でアプリを作ることになる。

また、[Spring Boot Actuator](http://docs.spring.io/spring-boot/docs/1.4.3.RELEASE/reference/htmlsingle/#production-ready)という、アプリをプロダクション環境で運用するための機能を有効にするため、`spring-boot-starter-actuator`も使った。
これを有効にすると、Web APIでアプリの状態取得などができるようになる。
例えば、`http://<サーバ>/health`にアクセスするとアプリの基本的なヘルス情報がJSONで取得できる。

これら二つのスターターを追加するには、`build.gradle`の`dependencies`に以下の様に書くだけでいい。

```gradle
dependencies {
  compile 'org.springframework.boot:spring-boot-starter-web'
  compile 'org.springframework.boot:spring-boot-starter-actuator'
}
```

前節に書いた通り、Spring Boot Gradle pluginのおかげでバージョンの指定は不要。

## 4. ディベロッパツール追加
Spring Bootの[ディベロッパツール](http://docs.spring.io/spring-boot/docs/1.4.3.RELEASE/reference/html/using-boot-devtools.html)を利用すると、以下の恩恵を受けられる。

1. キャッシュの無効化

    Spring Bootがサポートしているライブラリ(e.g. Thymeleafといったテンプレートエンジン)にはキャッシュ機能を持つものがある。
    こうした機能はプロダクション環境では性能改善に有効だが、開発時にはじゃまになる。
    ディベロッパツールを使うとデフォルトで様々なキャッシュを無効にしてくれる。

2. 自動再起動

    クラスパスに含まれるファイルに変更があるとアプリが自動で再起動される。

3. ライブリロード

    ブラウザのアドオンを[インストール](http://livereload.com/extensions/)すると、アプリに変更があったらブラウザが自動でリロードしてくれるようになる。

<br>

ディベロッパツールを追加するには、`build.gradle`の`dependencies`に以下の様に書くだけでいい。

```gradle
dependencies {
  compile 'org.springframework.boot:spring-boot-devtools'
}
```

<br>

ディベロッパツールは、アプリがプロダクション環境で起動されたと判定すると自動で無効になるので、アーティファクトに含まれても問題ない。
`java -jar`で起動されるか、または通常のものではないクラスローダが起動に使われると、プロダクション環境だと判定される。
`build.gradle`に以下の様に書けば、アーティファクトに含まれないようにもできる。

```gradle
bootRepackage {
  excludeDevtools = true
}
```

<br>

ディベロッパツールへの推移的依存を避けるための[propdeps-plugin](https://github.com/spring-projects/gradle-plugins/tree/master/propdeps-plugin)というプラグインもあるが、Goslingsは他のアプリが依存するようなものではないので使わなかった。

<br>

自動再起動については、Eclipseの自動ビルドはデフォルトで`goslings/bin`にクラスファイルを吐くので、ビルドパスの構成で「デフォルト出力フォルダー」を`goslings/build/classes/main`に変えないと動かなかった。

<br>

ここまででベースとなる`build.gradle`ができて、以下の様になった。

```gradle
buildscript {
  repositories {
    mavenCentral()
  }
  dependencies {
    classpath "org.springframework.boot:spring-boot-gradle-plugin:${springBootVer}"
  }
}

repositories {
  mavenCentral()
}

apply plugin: 'java'
apply plugin: 'org.springframework.boot'

archivesBaseName = 'goslings'
version = '0.0.1'

[compileJava, compileTestJava]*.options*.encoding = 'UTF-8'
sourceCompatibility = 1.8
targetCompatibility = 1.8

bootRepackage {
  excludeDevtools = true
}

dependencies {
  compile 'org.springframework.boot:spring-boot-starter-web'
  compile 'org.springframework.boot:spring-boot-starter-actuator'
  compile 'org.springframework.boot:spring-boot-devtools'
}
```

## 5. リソースクラス作成
ここからやっとコーディング。
まずはREST APIで取得するリソースを表現するクラスを作る。

Goslingsの場合、Gitリポジトリのオブジェクトやリファレンスなどがリソースになる。
例えばコミットオブジェクトを表すクラスは以下の様に書いた。

```java
public final class Commit {

  private final String id;
  private final String[] parentIds;
  private final String treeId;

  // 以下、全フィールドをセットするコンストラクタとgetters。

}
```

(Commit.javaの完全なソースは[これ](https://github.com/kaitoy/goslings/blob/dba65bf4ca7ad1dd91b927d623b6ea9a39870b62/goslings-server/src/main/java/com/github/kaitoy/goslings/server/resource/Commit.java))

POJOとして書けばいいので、[Lombok](https://projectlombok.org/)の`@Data`か`@Value`を使うと楽だろうが、Goslingsには使わなかった。

## 6. コントローラ(REST APIコントローラ)作成
クライアントからのHTTPリクエストを処理するクラスはコントローラクラスと呼ばれる。
クライアントからのREST API呼び出しもHTTPリクエストなのでコントローラクラスで処理する。

REST API呼び出しを処理するコントローラクラスは、[`@RestController`](https://docs.spring.io/spring/docs/4.3.4.RELEASE/javadoc-api/org/springframework/web/bind/annotation/RestController.html)を付けて宣言して、[`@RequestMapping`](https://docs.spring.io/spring/docs/4.3.4.RELEASE/javadoc-api/org/springframework/web/bind/annotation/RequestMapping.html)を付けたメソッド(リクエストハンドラ)にURL毎の処理を書いてやればいい。

以下の様な感じ。

```java
@RestController
@RequestMapping(
  path="/v1",
  method=RequestMethod.GET
)
public final class RestApiV1Controller {

  // この辺でフィールド定義など

  @RequestMapping(path="{token}/objects/commits")
  public Commit[] getCommits(@PathVariable String token) {
    return objectDao.getCommits(token);
  }

  // 以下他のメソッド

}
```

(RestApiV1Controller.javaの完全なソースは[こちら](https://github.com/kaitoy/goslings/blob/dba65bf4ca7ad1dd91b927d623b6ea9a39870b62/goslings-server/src/main/java/com/github/kaitoy/goslings/server/controller/RestApiV1Controller.java))

上のコードでは、`http://<Goslingsサーバ>/v1/<トークン>/objects/commits`というURLを`getCommits`メソッドで処理するようにしている。
このAPIを呼び出すと、前節で作った`Commit`クラスのインスタンスの配列がJSON形式で返ってくる。
(getCommitsの実装については次回書く。)

<br>

`@RestController`を付けると以下の二つのアノテーションを付けたのと同じことになる。

* [`@Controller`](https://docs.spring.io/spring/docs/4.3.4.RELEASE/javadoc-api/org/springframework/stereotype/Controller.html): 一般的なコントローラクラスに付けるアノテーション。
* [`@ResponseBody`](https://docs.spring.io/spring/docs/4.3.4.RELEASE/javadoc-api/org/springframework/web/bind/annotation/ResponseBody.html): メソッドの戻り値をHTTPレスポンスボディにバインドすることを指示する。これを付けると、戻り値は[Jackson JSON](http://wiki.fasterxml.com/JacksonHome)でJSONに変換されてクライアントに返される。これを付けないと、戻り値はスタティックリソースへのパスなどとして扱われ、View(e.g. Thymeleaf)が処理した結果がクライアントに返される。([参考記事](http://qiita.com/tag1216/items/3680b92cf96eb5a170f0))

<br>

見ての通り、URLのパス中の値は[`@PathVariable`](https://docs.spring.io/spring/docs/4.3.4.RELEASE/javadoc-api/org/springframework/web/bind/annotation/PathVariable.html)を使って取得できる。

ここには書いてないけど、URLクエリパラメータは[`@RequestParam`](https://docs.spring.io/spring/docs/4.3.4.RELEASE/javadoc-api/org/springframework/web/bind/annotation/RequestParam.html)を使って取得できるし、[`HttpServletRequest`](http://mergedoc.osdn.jp/tomcat-servletapi-5-ja/javax/servlet/http/HttpServletRequest.html)もメソッドの引数として宣言しておけばSpringが渡してくれる。

## 7. メインクラス作成
最後に、アプリを起動するメインクラスを作る。

[`@SpringBootApplication`](http://docs.spring.io/spring-boot/docs/1.4.3.RELEASE/api/org/springframework/boot/autoconfigure/SpringBootApplication.html)を付けたクラスに`main`メソッドを以下の様に定義すればいいだけ。

```java
@SpringBootApplication
public class Application {

  public static void main(String[] args) {
    SpringApplication.run(Application.class, args);
  }

}
```

(Application.javaの完全なソースは[こちら](https://github.com/kaitoy/goslings/blob/dba65bf4ca7ad1dd91b927d623b6ea9a39870b62/goslings-server/src/main/java/com/github/kaitoy/goslings/server/Application.java))

<br>

`@SpringBootApplication`を付けると、以下の三つのアノテーションを付けたのと同じことになる。

* [`@Configuration`](http://docs.spring.io/spring-framework/docs/4.3.4.RELEASE/javadoc-api/org/springframework/context/annotation/Configuration.html) ([`@SpringBootConfiguration`](http://docs.spring.io/spring-boot/docs/1.4.3.RELEASE/api/org/springframework/boot/SpringBootConfiguration.html)): Spring Bean定義を提供するクラスであることを示す。(意味不明。)
* [`@EnableAutoConfiguration`](http://docs.spring.io/spring-boot/docs/1.4.3.RELEASE/api/org/springframework/boot/autoconfigure/EnableAutoConfiguration.html): Springの[自動設定機能](http://docs.spring.io/spring-boot/docs/1.4.3.RELEASE/reference/html/using-boot-auto-configuration.html)を有効にする。この機能は、ライブラリの依存関係から推定して必要な設定をしてくれるもの。例えば`tomcat-embedded.jar`に依存していたら、[`TomcatEmbeddedServletContainerFactory`](http://docs.spring.io/spring-boot/docs/1.4.3.RELEASE/api/org/springframework/boot/context/embedded/tomcat/TomcatEmbeddedServletContainerFactory.html)をセットアップしてくれるなど。
* [`@ComponentScan`](http://docs.spring.io/spring-framework/docs/4.3.4.RELEASE/javadoc-api/org/springframework/context/annotation/ComponentScan.html): このアノテーションを付けたクラスのパッケージ以下から、[`@Component`](http://docs.spring.io/spring-framework/docs/4.3.4.RELEASE/javadoc-api/org/springframework/stereotype/Component.html)、[`@Service`](http://docs.spring.io/spring-framework/docs/4.3.4.RELEASE/javadoc-api/org/springframework/stereotype/Service.html)、[`@Repository`](http://docs.spring.io/spring-framework/docs/4.3.4.RELEASE/javadoc-api/org/springframework/stereotype/Repository.html)、[`@Controller`](http://docs.spring.io/spring-framework/docs/4.3.4.RELEASE/javadoc-api/org/springframework/stereotype/Controller.html)(など?)が付いたクラスが検索され、Spring Beanとして登録される。XMLのSpring Bean設定ファイルを書かなくてよい。前節で作ったリソースコントローラがこのアノテーションによって利用できるようになる。

<br>

`@SpringBootApplication`、というか`@Configuration`をつけたクラスは`final`にしてはいけない。
すると実行時にエラーになる。

## 8. ビルド、実行
以上でとりあえず動くものができた。

`gradlew bootRun`を実行するとディベロッパツール付きでアプリが動くし、`gradlew build`を実行すれば`build/libs/goslings-0.0.1.jar`というアーティファクトが生成され、`java -jar build/libs/goslings-0.0.1.jar`でアプリを起動できる。
(いずれもポートは8080)

<br>

今日はここまで。
[次回](https://www.kaitoy.xyz/2017/01/10/goslings-development-memo2-spring-boot-di/)はまたSpring Bootで、DIについて。
