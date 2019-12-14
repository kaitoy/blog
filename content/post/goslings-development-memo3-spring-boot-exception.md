+++
categories = [ "Programing" ]
date = "2017-01-13T14:01:01-07:00"
draft = false
cover = "goslings-spring.png"
slug = "goslings-development-memo3-spring-boot-exception"
tags = [ "goslings", "spring", "spring-boot" ]
title = "Goslings開発メモ - その3: Spring Boot続続編 (例外処理)"
highlight = true
highlightStyle = "monokai"
highlightLanguages = []

+++

「[Goslings開発メモ - その2: Spring Boot続編 (DI)](https://www.kaitoy.xyz/2017/01/10/goslings-development-memo2-spring-boot-di/)」の続き。

Spring Boot続続編で、例外処理について。

<!--more-->

{{< google-adsense >}}

# Spring MVCアプリにおける例外処理
Goslingsは[前々回](https://www.kaitoy.xyz/2017/01/03/goslings-development-memo1-spring-boot/)書いたように`spring-boot-starter-web`というスターターを使っていて、つまりSpring MVCアプリだ。

Spring MVCアプリにおける例外処理についてはちょっと古いが[この記事](https://spring.io/blog/2013/11/01/exception-handling-in-spring-mvc)に詳しい。

まず、Goslingsの構成で例外処理を何も書かなかった場合、コントローラのリクエストハンドラから例外が投げられると、ログにスタックトレースが出力され、クライアントにはHTTPステータスコード`500 (Internal Server Error)`とともに以下の様なデフォルトのエラーページが返る。

![err_page.png](/images/goslings-development-memo3-spring-boot-exception/err_page.png)

<br>

なんだかこれでも十分な気がするが、実際にはちゃんと明示的に例外処理をしたほうがいいだろう。
エラー時に返すHTTPステータスコードをカスタマイズしたり、遷移するページを変えたりしたくなるだろうから。

記事によれば、リクエストハンドラ内で例外をキャッチして処理するのはイケてなくて、関心事の分離のために別の場所に処理を書くのが良いらしい。

Spring MVCアプリにおける例外処理には以下の3つの段階がある。

1. 投げる例外をカスタマイズする
2. 例外クラス毎の例外ハンドラをコントローラに実装する
3. コントローラ間で共用する例外ハンドラクラスを作る

以下それぞれについて書く。

## 1. 投げる例外をカスタマイズする
リクエストハンドラから投げる例外に[`@ResponseStatus`](http://docs.spring.io/spring-framework/docs/4.3.4.RELEASE/javadoc-api/org/springframework/web/bind/annotation/ResponseStatus.html)をつけることで、クライアントに返すHTTPステータスコード(とリーズンフレーズ)をカスタマイズできる。

例えば以下のような例外を投げると、HTTPステータスコード`500 (Internal Server Error)`の代わりに`400 (Bad Request)`がクライアントに返る。

```java
@ResponseStatus(HttpStatus.BAD_REQUEST)
public final class BadRequestException extends RuntimeException {
  // 省略
}
```

## 2. 例外クラス毎の例外ハンドラをコントローラに実装する
コントローラのメソッドに[`@ExceptionHandler`](http://docs.spring.io/spring-framework/docs/4.3.4.RELEASE/javadoc-api/org/springframework/web/bind/annotation/ExceptionHandler.html)をつけてやると、そのメソッドは例外ハンドラになり、そのコントローラのリクエストハンドラから特定の例外が投げられたときの処理を書くことができる。
さらに例外ハンドラに`@ResponseStatus`をつければ、HTTPステータスコードをカスタマイズできる。
例外ハンドラの戻り値はリクエストハンドラのと同様に処理されるので、遷移するページ等も自由にカスタマイズできる。

Goslingsでは、上記`BadRequestException`からは`@ResponseStatus`を削除したうえで、`RestApiV1Controller`に以下の様に例外ハンドラを書いた。

```java
public final class RestApiV1Controller {

  // 例外ハンドラ
  @ResponseStatus(HttpStatus.BAD_REQUEST)
  @ExceptionHandler(BadRequestException.class)
  ErrorInfo handleBadRequestException(HttpServletRequest req, Exception ex) {
    return new ErrorInfo(req.getRequestURL().toString(), ex);
  }

}
```

(RestApiV1Controller.javaの完全なソースは[こちら](https://github.com/kaitoy/goslings/blob/dba65bf4ca7ad1dd91b927d623b6ea9a39870b62/goslings-server/src/main/java/com/github/kaitoy/goslings/server/controller/RestApiV1Controller.java))

<br>

こう書くと、`RestApiV1Controller`の任意のリクエストハンドラから`BadRequestException`が投げられると、`handleBadRequestException`が呼び出され、HTTPステータスコード`400 (Bad Request)`とともにクライアントにHTTPレスポンスが返る。
`RestApiV1Controller`はREST APIコントローラなので、このHTTPレスポンスのボディは、`handleBadRequestException`の戻り値である`ErrorInfo`オブジェクトをJSONに変換したものになる。

例外ハンドラの仮引数は、上のコードに書いたもののほか、サーブレット関係のクラスなど(e.g. `HttpServletResponse`や`HttpSession`。詳しくは[Javadoc](http://docs.spring.io/spring-framework/docs/4.3.4.RELEASE/javadoc-api/org/springframework/web/bind/annotation/ExceptionHandler.html)参照)を適当に書いておくとSpring MVCがよしなに渡してくれる。

冒頭に貼った記事には例外ハンドラは`Model`を受け取れないとあるが、これは古い情報で、今は受け取れるっぽい。

## 3. コントローラ間で共用する例外ハンドラクラスを作る
コントローラから例外処理を完全に分離したい場合や、複数のコントローラで例外ハンドラを共有したい場合は、コントローラアドバイスクラスを書けばいい。

コントローラアドバイスクラスは[`@ControllerAdvice`](http://docs.spring.io/spring-framework/docs/4.3.4.RELEASE/javadoc-api/org/springframework/web/bind/annotation/ControllerAdvice.html)を付けて定義したクラスで、このクラスに例外ハンドラを書いておくと複数のコントローラで有効になる。

コントローラアドバイスクラスには例外ハンドラ以外も書ける。
コントローラアドバイスクラスが適用されるのはデフォルトでは全てのコントローラクラスだが、`@ControllerAdvice`の値により適用範囲を絞ることもできる。
詳しくは[Javadoc](http://docs.spring.io/spring-framework/docs/4.3.4.RELEASE/javadoc-api/org/springframework/web/bind/annotation/ControllerAdvice.html)参照。

Goslingsではコントローラアドバイスクラスは作らなかった。

<br>

今日はここまで。
[次回](https://www.kaitoy.xyz/2017/01/17/goslings-development-memo4-spring-boot-logging/)もまたSpring Bootで、ロギングについて。
