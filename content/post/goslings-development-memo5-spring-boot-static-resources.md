+++
categories = [ "Programing" ]
date = "2017-01-24T09:01:49-07:00"
draft = false
cover = "goslings-spring.png"
slug = "goslings-development-memo5-spring-boot-static-resources"
tags = [ "goslings", "spring", "spring-boot" ]
title = "Goslings開発メモ - その5: Spring Boot最終編 (静的リソース処理)"
highlight = true
highlightStyle = "monokai"
highlightLanguages = []

+++

「[Goslings開発メモ - その4: Spring Boot続続続編 (ロギング)](https://www.kaitoy.xyz/2017/01/17/goslings-development-memo4-spring-boot-logging/)」の続き。

Spring Boot最終編で、静的リソース処理について。

<!--more-->

{{< google-adsense >}}

# Spring Boot(Spring MVC)での静的リソース処理
この時点でのGoslingsは単なるREST APIサーバで、アクセスしてもJSONを返すだけだ。
アプリとしての体を成すためには、そのAPIを利用するクライアントコード、つまりHTMLドキュメントやCSSファイルやJavaScriptファイル(静的リソース)も返すようにしないといけない。
HTMLドキュメントを返す場合、普通はなんらかの[テンプレートエンジン](https://ja.wikipedia.org/wiki/%E3%83%86%E3%83%B3%E3%83%97%E3%83%AC%E3%83%BC%E3%83%88%E3%82%A8%E3%83%B3%E3%82%B8%E3%83%B3)を使うものだが、Goslingsは本当に単純なGUIなので、サーバに置いたHTMLファイルをそのまま返したい。

「Getting Started Guides」には[Serving Web Content with Spring MVC](https://spring.io/guides/gs/serving-web-content/)というのが乗っているが、これは[Thymeleaf](http://www.thymeleaf.org/)というテンプレートエンジンを使うものなのでちょっと違う。

<br>

[Spring Bootリファレンスガイド](https://docs.spring.io/spring-boot/docs/1.4.3.RELEASE/reference/htmlsingle/#boot-features-spring-mvc-static-content)によると、クラスパス(または`ServletContext`のルート)の`/static/`、`/public/`、`/resources/`、`/META-INF/resources/`のいずれかに静的リソースを置けば、特にコードを書かなくてもクライアントからアクセスできるらしい。
(逆に、一般的に静的リソースを置く場所である、プロジェクトの`src/main/webapp/`には置くべきでないとのこと。これは、jarにパッケージングするときにビルドツールに無視されることが多いため。)

この仕組みについて、[この記事](https://spring.io/blog/2013/12/19/serving-static-web-content-with-spring-boot)を参考にちょろっとソースを見た感じでは、これらのパスは[`ResourceProperties`の`CLASSPATH_RESOURCE_LOCATIONS`](https://github.com/spring-projects/spring-boot/blob/v1.4.3.RELEASE/spring-boot-autoconfigure/src/main/java/org/springframework/boot/autoconfigure/web/ResourceProperties.java#L44)に定義されていて、これを[`WebMvcAutoConfiguration`](http://docs.spring.io/spring-boot/docs/1.4.3.RELEASE/api/org/springframework/boot/autoconfigure/web/WebMvcAutoConfiguration.html)が[`ResourceHandlerRegistry`](http://docs.spring.io/spring-framework/docs/4.3.4.RELEASE/javadoc-api/org/springframework/web/servlet/config/annotation/ResourceHandlerRegistry.html)で[リソースロケーションとして登録する](https://github.com/spring-projects/spring-boot/blob/v1.4.3.RELEASE/spring-boot-autoconfigure/src/main/java/org/springframework/boot/autoconfigure/web/WebMvcAutoConfiguration.java#L291)ことで静的リソース置き場たらしめている模様。
(この`ResourceHandlerRegistry`は[`ResourceHttpRequestHandler`](http://docs.spring.io/spring-framework/docs/4.3.4.RELEASE/javadoc-api/org/springframework/web/servlet/resource/ResourceHttpRequestHandler.html)を設定するファサード的なものっぽい。)

で、`@SpringBootApplication`([その1](https://www.kaitoy.xyz/2017/01/03/goslings-development-memo1-spring-boot/)参照)が付いているクラスがあって、`spring-webmvc.jar`がクラスパスにあると、[`@EnableWebMvc`](http://docs.spring.io/spring/docs/4.3.4.RELEASE/javadoc-api/org/springframework/web/servlet/config/annotation/EnableWebMvc.html)がSpring Bootによって付けられ、そこからごにょごにょして上記`WebMvcAutoConfiguration`が実行される。
`spring-webmvc.jar`は`spring-boot-starter-web.jar`([その1](https://www.kaitoy.xyz/2017/01/03/goslings-development-memo1-spring-boot/)参照)が引っ張ってくる。

<br>

なお、Spring MVCの静的リソース処理の全体の流れについては
、ちょっと古いけど「[handling static web resources](https://spring.io/blog/2014/07/24/spring-framework-4-1-handling-static-web-resources)」という記事が分かりやすい。
要は、URLに指定されたパスからサーバ上のリソースを探し当てる[`ResourceResolver`](http://docs.spring.io/spring-framework/docs/4.3.4.RELEASE/javadoc-api/org/springframework/web/servlet/resource/ResourceResolver.html)というものが優先度順に連なっているリゾルバチェイン([`ResourceResolverChain`](http://docs.spring.io/spring/docs/4.3.4.RELEASE/javadoc-api/org/springframework/web/servlet/resource/ResourceResolverChain.html))があって、まずこいつがリソースを取得する。
次に、そのリソースを加工するトランスフォーマチェイン([`ResourceTransformerChain`](http://docs.spring.io/spring/docs/4.3.4.RELEASE/javadoc-api/org/springframework/web/servlet/resource/ResourceTransformerChain.html))というものに通し、その結果をクライアントに返す。
トランスフォーマチェインは[`ResourceTransformer`](http://docs.spring.io/spring-framework/docs/4.3.4.RELEASE/javadoc-api/org/springframework/web/servlet/resource/ResourceTransformer.html)が連なったもの。
リゾルバチェインとトランスフォーマチェインは上記`ResourceHttpRequestHandler`に設定される。

リゾルバには以下の様なものがある。

* [`PathResourceResolver`](http://docs.spring.io/spring-framework/docs/4.3.4.RELEASE/javadoc-api/org/springframework/web/servlet/resource/PathResourceResolver.html): `ResourceHttpRequestHandler`に設定されたリソースロケーションからリソースを単純に検索するリゾルバ。
* [`CachingResourceResolver`](http://docs.spring.io/spring-framework/docs/4.3.4.RELEASE/javadoc-api/org/springframework/web/servlet/resource/CachingResourceResolver.html): キャッシュからリソースを検索するリゾルバ。テンプレートエンジンの処理結果のキャッシュとかが返るのは多分ここから。
* [`GzipResourceResolver`](http://docs.spring.io/spring-framework/docs/4.3.4.RELEASE/javadoc-api/org/springframework/web/servlet/resource/GzipResourceResolver.html): [gzip](https://ja.wikipedia.org/wiki/Gzip)で圧縮されたリソース、つまりURLで指定されたパスに`.gz`という拡張子を付けたリソースを検索するリゾルバ。
* [`VersionResourceResolver`](http://docs.spring.io/spring-framework/docs/4.3.4.RELEASE/javadoc-api/org/springframework/web/servlet/resource/VersionResourceResolver.html): [リソースバージョニング](https://spring.io/blog/2014/07/24/spring-framework-4-1-handling-static-web-resources#resource-versioning)を実現するためのリゾルバ。
* [`WebJarsResourceResolver`](http://docs.spring.io/spring-framework/docs/4.3.4.RELEASE/javadoc-api/org/springframework/web/servlet/resource/WebJarsResourceResolver.html): [WebJars](http://www.webjars.org/)のjarファイル内のリソースを検索するリゾルバ。

リゾルバの設定などについてはQiitaの[この記事](http://qiita.com/kazuki43zoo/items/e12a72d4ac4de418ee37)ががよくまとまっている。
凝ったことをしたいときは参照しよう。

<br>

トランスフォーマには以下の様なものがある。

* [`CssLinkResourceTransformer`](http://docs.spring.io/spring-framework/docs/4.3.4.RELEASE/javadoc-api/org/springframework/web/servlet/resource/CssLinkResourceTransformer.html): CSSファイル内のリンクをクライアントがアクセスできるURLに変換する。
* [`CachingResourceTransformer`](http://docs.spring.io/spring-framework/docs/4.3.4.RELEASE/javadoc-api/org/springframework/web/servlet/resource/CachingResourceTransformer.html): 変換したリソースをキャッシュする。
* [`AppCacheManifestTransformer`](http://docs.spring.io/spring-framework/docs/4.3.4.RELEASE/javadoc-api/org/springframework/web/servlet/resource/AppCacheManifestTransformer.html): HTML5のAppCacheマニフェスト内のリソースを扱うトランスフォーマ。

<br>

デフォルトで`ResourceHttpRequestHandler`には`PathResourceResolver`だけが設定されている。

<br>

以上をまとめると、クライアントからGetリクエストが来ると、`WebMvcAutoConfiguration`が設定したリソースロケーション(e.g. `/static/`)を`PathResourceResolver`が検索して、そこに置いてあるHTMLファイルとかをクライアントに返してくれる、ということであろう。

Javaのコードを全く書かなくていいので楽。

<br>

Javaのコードを書いて静的リソースファイルを明示することもできる。
[Qiitaの記事](http://qiita.com/tag1216/items/3680b92cf96eb5a170f0)によれば、[`@Controller`](http://docs.spring.io/spring-framework/docs/4.3.4.RELEASE/javadoc-api/org/springframework/stereotype/Controller.html)を付けたクラスのリクエストハンドラで以下の様にファイルへのパスを返せばいいらしい。

```java
@RequestMapping("/hoge")
public String hoge() {
    return "/hoge.html";
}
```

単純な静的リソースに対してこれをやるユースケースはあまりなさそう。
テンプレートエンジンを使っていてパラメータを渡したいときにはこういうリクエストハンドラを書くことになる。

# Spring Bootのウェルカムページとファビコン
Spring Bootは`index.html`と`favicon.ico`という名のファイルを特別扱いする。
前者がウェルカムページで後者がファビコン。

## ウェルカムページ
[Spring Bootのリファレンスガイド](https://docs.spring.io/spring-boot/docs/1.4.3.RELEASE/reference/htmlsingle/#boot-features-spring-mvc-static-content)にもちらっとかいてあるけど、リソースロケーションに`index.html`というファイルを置いておくと、それがウェルカムページとして設定され、URLのパスにルート(e.g. `http://localhost:8080/`)を指定したときにクライアントに返るようになる。

ソースを見ると、上記`WebMvcAutoConfiguration`の[ここ](https://github.com/spring-projects/spring-boot/blob/v1.4.3.RELEASE/spring-boot-autoconfigure/src/main/java/org/springframework/boot/autoconfigure/web/WebMvcAutoConfiguration.java#L297)でそのための設定している。
`/META-INF/resources/index.html`、`/resources/index.html`、`/static/index.html`、`/public/index.html`の順に探すようで、複数個所に`index.html`を置いた場合は最初に見つかったものがウェルカムページになる。(そんなことする意味はないが。)

## ファビコン
ファビコンについてはSpring Bootの現時点でリリース済みバージョンのリファレンスガイドにはほとんど情報がないが、`1.5.0.BUILD-SNAPSHOT`のリファレンスガイドには以下の様に書いてある。

> 27.1.6 Custom Favicon
>
> Spring Boot looks for a favicon.ico in the configured static content locations and the root of > the classpath (in that order). If such file is present, it is automatically used as the favicon > of the application.

つまり、リソースロケーションかクラスパスのルートに`favicon.ico`というファイルを置いておくと、それをファビコンとしてクライアントに返してくれる。

これもやっぱり`WebMvcAutoConfiguration`が[設定する](https://github.com/spring-projects/spring-boot/blob/v1.4.3.RELEASE/spring-boot-autoconfigure/src/main/java/org/springframework/boot/autoconfigure/web/WebMvcAutoConfiguration.java#L319)。

# Goslingsの静的リソース
Goslingsの静的リソースは`favicon.ico`以外は`/static/`に全部直接置くことにした。
`favicon.ico`はクラスパスのルートに。
プロジェクトのソースツリーで言うと、`src/main/resources/static/`に`index.html`やら`goslings.css`やらのクライアントファイルを置いて、あとは`src/main/resources/favicon.ico`があるという形。
こうしておけば、GradleのJavaプラグインの`processResources`タスクによってjar内の適切な場所に取り込まれる。

`index.html`には`http://<Goslingsサーバ>/`でアクセスできるし、`goslings.css`も`index.html`に`<link rel="stylesheet" href="goslings.css">`みたいに書けば取得できる。

<br>

今日はここまで。
次回からはクライアントサイドの話。

と思ったけど、たいして書くことないのでこれで終わりにする。
[Qiita](http://qiita.com/kaitoy/items/91585ba1a3081ffd2111)のほうにちょっと書いたし。
