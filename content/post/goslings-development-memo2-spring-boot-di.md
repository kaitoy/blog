+++
categories = [ "Programing" ]
date = "2017-01-10T00:21:27-07:00"
draft = false
cover = "goslings-spring.png"
slug = "goslings-development-memo2-spring-boot-di"
tags = [ "goslings", "spring", "spring-boot" ]
title = "Goslings開発メモ - その2: Spring Boot続編 (DI)"
+++

「[Goslings開発メモ - その1: Spring Boot編](https://www.kaitoy.xyz/2017/01/03/goslings-development-memo1-spring-boot/)」の続き。

Spring Boot続編で、[DI](https://ja.wikipedia.org/wiki/%E4%BE%9D%E5%AD%98%E6%80%A7%E3%81%AE%E6%B3%A8%E5%85%A5)について。

<!--more-->

{{< google-adsense >}}

# DIとは
DIはDependency Injectionの略。依存性注入と訳される。

これは、Javaの文脈で具体的目に言うと、あるクラスが依存する具象クラスのインスタンス化と取得をフレームワークに任せることで、具象クラス間の直接的な依存を排除し、よってコンポーネント間を疎結合にする手法。
これにより、アプリの拡張性を高めたり、テストがしやすくなったりする。([参考記事](http://qiita.com/mizunowanko/items/53eed059fc044c5aa5dc))

[Spring Framework](http://projects.spring.io/spring-framework/)はもともとこのDI機能を提供するフレームワーク(i.e. DIコンテナ)として普及した。

# GoslingsでDI
Goslingsサーバの内部機能はざっくり、クライアントからのREST API呼び出しを処理するユーザインタフェース層と、Gitリポジトリにアクセスするデータベース層に分かれる。

Gitリポジトリにアクセスする部分は今回は[JGit](https://eclipse.org/jgit/)で実装するが、将来的に別のライブラリで実装しなおす可能性が微レ存なのと、Goslingsの開発自体がWebアプリ開発の練習でもあるので、ちゃんとしたアーキテクチャでと思い、[DAO](https://ja.wikipedia.org/wiki/Data_Access_Object)パターンを使ってやった。

つまり例えば、GitのコミットオブジェクトはJGitのAPIでは[`RevCommitクラス`](http://download.eclipse.org/jgit/site/3.7.1.201504261725-r/apidocs/org/eclipse/jgit/revwalk/RevCommit.html)で表されるが、ユーザインタフェース層からはリソースクラスである[Commitクラス](https://github.com/kaitoy/goslings/blob/dba65bf4ca7ad1dd91b927d623b6ea9a39870b62/goslings-server/src/main/java/com/github/kaitoy/goslings/server/resource/Commit.java)([前回](https://www.kaitoy.xyz/2017/01/03/goslings-development-memo1-spring-boot/#5-%E3%83%AA%E3%82%BD%E3%83%BC%E3%82%B9%E3%82%AF%E3%83%A9%E3%82%B9%E4%BD%9C%E6%88%90)参照)を扱う以下の様なDAOインターフェースを呼ぶようにし、JGit依存の実装とは切り離す。

```java
public interface ObjectDao {

  public Commit[] getCommits(String token) throws DaoException;

}
```

(ObjectDao.javaの完全なソースは[これ](https://github.com/kaitoy/goslings/blob/dba65bf4ca7ad1dd91b927d623b6ea9a39870b62/goslings-server/src/main/java/com/github/kaitoy/goslings/server/dao/ObjectDao.java))

<br>

`ObjectDao`を実装する`ObjectDaoImpl`クラスでは、以下の様にJGitを使ってごりごりと実装を書く。

```java
public final class ObjectDaoImpl implements ObjectDao {

  // フィールド定義は省略

  @Override
  public Commit[] getCommits(String token) {
    try {
      return StreamSupport.stream(resolver.getGit(token).log().all().call().spliterator(), false)
               .map(this::convertToCommit)
               .toArray(Commit[]::new);
    } catch (NoHeadException e) {
      // エラー処理
    }
  }

  private Commit convertToCommit(RevCommit commit) {
    // RevCommitをCommitに変換する処理
  }

}
```

<br>

ユーザインターフェース層は`RestApiV1Controller`クラス([前回](https://www.kaitoy.xyz/2017/01/03/goslings-development-memo1-spring-boot/#6-%E3%82%B3%E3%83%B3%E3%83%88%E3%83%AD%E3%83%BC%E3%83%A9-rest-api%E3%82%B3%E3%83%B3%E3%83%88%E3%83%AD%E3%83%BC%E3%83%A9-%E4%BD%9C%E6%88%90)参照)の`getCommits`メソッドで、以下の様にObjectDaoを使いたい。

```java
public final class RestApiV1Controller {

  private ObjectDao objectDao;

  @RequestMapping(path="{token}/objects/commits")
  public Commit[] getCommits(@PathVariable String token) {
    return objectDao.getCommits(token);
  }

  // 以下他のメソッド

}
```

<br>

ここで問題になるのが、`RestApiV1Controller`の`objectDao`フィールドへのインスタンスの代入だが、`RestApiV1Controller`内(e.g. `RestApiV1Controller`のコンストラクタ)で`ObjectDaoImpl`をインスタンス化して代入するのでは、`ObjectDaoImpl`というデータベース層の具象クラスへの直接的な依存(i.e. `import ObjectDaoImpl`)が発生してしまってまずい。
ユーザインターフェース層とデータベース層が密に結合してしまう。

ここがDIの使いどころだ。
`RestApiV1Controller`への`ObjectDaoImpl`インスタンスの注入をフレームワークに任せればいい。

# Spring BootでのDI
Spring Bootアプリでは[Spring FrameworkのDI機能](https://docs.spring.io/spring/docs/4.3.4.RELEASE/spring-framework-reference/html/beans.html)を何でも使えるが、普通、もっとも簡単な方法である[`@ComponentScan`](http://docs.spring.io/spring-framework/docs/4.3.4.RELEASE/javadoc-api/org/springframework/context/annotation/ComponentScan.html)と[`@Autowired`](https://docs.spring.io/spring/docs/4.3.4.RELEASE/spring-framework-reference/html/beans.html#beans-autowired-annotation)を使う方法を採る。

まずは`@ComponentScan`だが、これは、[前回](https://www.kaitoy.xyz/2017/01/03/goslings-development-memo1-spring-boot/#7-%E3%83%A1%E3%82%A4%E3%83%B3%E3%82%AF%E3%83%A9%E3%82%B9%E4%BD%9C%E6%88%90)書いたように既に使っていて、プロジェクト内の全てのSpring Beanが検索されDIコンテナに登録されるようになっている。
なので、注入したい`ObjectDaoImpl`がSpring Beanと判定されるようにすればよい。

そのためには、`ObjectDaoImpl`に以下のアノテーションのいずれかを付ける必要がある。

* [`@Service`](http://docs.spring.io/spring-framework/docs/4.3.4.RELEASE/javadoc-api/org/springframework/stereotype/Service.html): 業務手続を表すAPIを提供する(しばしば状態を持たない)コンポーネント。またはそれっぽいもの。MVCアーキテクチャのM(モデル)や、3層アーキテクチャのビジネスロジック層のコンポーネント。
* [`@Repository`](http://docs.spring.io/spring-framework/docs/4.3.4.RELEASE/javadoc-api/org/springframework/stereotype/Repository.html): データの保持、取得、検索といった振る舞いを持つ、オブジェクトコレクションを表すコンポーネント。またはそれっぽいもの。MVCアーキテクチャのM(モデル)の内、特にデータベースを扱うコンポーネントや、3層アーキテクチャのデータベース層のコンポーネント。
* [`@Controller`](http://docs.spring.io/spring-framework/docs/4.3.4.RELEASE/javadoc-api/org/springframework/stereotype/Controller.html): MVCアーキテクチャのC(コントローラ)のコンポーネント。
* [`@Component`](http://docs.spring.io/spring-framework/docs/4.3.4.RELEASE/javadoc-api/org/springframework/stereotype/Component.html): 一般的なコンポーネント。

([参考記事](http://qiita.com/KevinFQ/items/abc7369cb07eb4b9ae29))

<br>

`ObjectDaoImpl`はDAOコンポーネントで、これはもちろん`@Repository`にあたるのでこれを付ける。

```java
@Repository
public final class ObjectDaoImpl implements ObjectDao {
  // 省略
}
```

<br>

これで`ObjectDaoImpl`がSpring Beanとして登録されるので、あとは`RestApiV1Controller`に`@Autowired`で注入してやればいい。

```java
public final class RestApiV1Controller {

  @Autowired
  private ObjectDao objectDao;

  // 以下省略。

}
```

<br>

`@Autowired`を付けたことにより、`RestApiV1Controller`のインスタンス化直後に、`objectDao`フィールドに適切なSpring Beanが注入されるようになった。

注入されるSpring Beanはフィールドの型から判断される。
`objectDao`フィールドの型は`ObjectDao`で、この実装はプロジェクト内に`ObjectDaoImpl`しかないので、狙い通り`ObjectDaoImpl`が注入される。
今はこれでもいいが、将来`ObjectDao`の実装が増えた場合、どの実装を注入すべきかSpring Frameworkには分からなくなるので、今のうちに[`@Qualifier`](http://docs.spring.io/spring/docs/4.3.4.RELEASE/javadoc-api/org/springframework/beans/factory/annotation/Qualifier.html)を使って明示しておくことにする。([参考](https://docs.spring.io/spring/docs/4.3.4.RELEASE/spring-framework-reference/html/beans.html#beans-autowired-annotation-qualifiers))

まずSpring Beanの方に`jgit`という値を持つ`@Qualifier`をつける。

```java
@Repository
@Qualifier("jgit")
public final class ObjectDaoImpl implements ObjectDao {
  // 省略
}
```

(ObjectDaoImpl.javaの完全なソースは[これ](https://github.com/kaitoy/goslings/blob/dba65bf4ca7ad1dd91b927d623b6ea9a39870b62/goslings-server/src/main/java/com/github/kaitoy/goslings/server/dao/jgit/ObjectDaoImpl.java))

<br>

Spring Beanを使う側にも同じ`@Qualifier`をつける。

```java
public final class RestApiV1Controller {

  @Autowired
  @Qualifier("jgit")
  private ObjectDao objectDao;

  // 以下省略。

}
```

(RestApiV1Controller.javaの完全なソースは[こちら](https://github.com/kaitoy/goslings/blob/dba65bf4ca7ad1dd91b927d623b6ea9a39870b62/goslings-server/src/main/java/com/github/kaitoy/goslings/server/controller/RestApiV1Controller.java))

<br>

これで`RestApiV1Controller`の`objectDao`フィールドにどの`ObjectDao`実装が注入されるかがより明確になった。
将来`ObjectDao`の別の実装を作るときには、その実装クラスには別の値の`@Qualifier`を付けてやれば、`RestApiV1Controller`の方の`@Qualifier`の値によって注入する実装を切り替えられる。

<br>

今日はここまで。
[次回](https://www.kaitoy.xyz/2017/01/13/goslings-development-memo3-spring-boot-exception/)もまたSpring Bootで、例外処理について。
