+++
categories = [ "Software Engineering" ]
date = "2015-09-13T13:52:30-06:00"
draft = false
eyecatch = "teamedio_logo.svg"
slug = "orm-is-offensive-anti-pattern"
tags = [ "yegor256", "oop" ]
title = "ORMは不快なアンチパターン"
+++

このエントリでは、Yegor Bugayenkoによる記事、[ORM Is an Offensive Anti-Pattern](http://www.yegor256.com/2014/12/01/orm-offensive-anti-pattern.html)を紹介する。
(Yegorから和訳と転載の許可は得た。)
以下はその全文の和訳だが、意訳超訳が混じっているので、もとのニュアンスを知りたければ元記事を読んでもいいし、読まなくてもいい。

----------------
結論から言えば、ORMはオブジェクト指向プログラミングの原則の全てに違反するひどいアンチパターンだ。オブジェクトをバラバラに引き裂き、もの言わぬ受身なデータ入れに変えてしまう。
小さいWebアプリケーションから、数千のテーブルをCRUD操作するエンタープライズシステムまで、どんなアプリケーションにもORMが存在することはゆるせない。
代わりになるものは?
SQLを話すオブジェクトだ。

# ORMの仕組み
[オブジェクト関係マッピング](https://ja.wikipedia.org/wiki/%E3%82%AA%E3%83%96%E3%82%B8%E3%82%A7%E3%82%AF%E3%83%88%E9%96%A2%E4%BF%82%E3%83%9E%E3%83%83%E3%83%94%E3%83%B3%E3%82%B0) (Object-relatinal mapping、ORM)は、オブジェクト指向言語(例えばJava)からリレーショナルデータベースにアクセスする技術(またはデザインパターン)だ。
ほとんどの言語で複数のORM実装がある。
例えば、Javaの[Hibernate](http://hibernate.org/orm/)、Ruby on Ralsの[ActiveRecord](http://guides.rubyonrails.org/active_record_basics.html)、PHPの[Doctrine](http://www.doctrine-project.org/)、Pythonの[SQLAlchemy](http://www.sqlalchemy.org/)。
Javaでは、ORMデザインは[JPA](https://ja.wikipedia.org/wiki/Java_Persistence_API)として標準化されてさえいる。

最初に、ORMがどう動くかを見てみよう。JavaとPostgreSQLとHibernateを使い、データベースに`post` (訳注: ブログポスト、ブログの記事)という単一のテーブルがあるとする。

```text
+-----+------------+--------------------------+
| id  | date       | title                    |
+-----+------------+--------------------------+
|   9 | 10/24/2014 | How to cook a sandwich   |
|  13 | 11/03/2014 | My favorite movies       |
|  27 | 11/17/2014 | How much I love my job   |
+-----+------------+--------------------------+
```

で、このテーブルをJavaアプリケーションからCRUD操作したい。(CRUDはcreate、read、update、deleteの略。)
まず、`Post`クラスを書く。(長くてごめん。けどなるべく短くしたんだ。)

```java
@Entity
@Table(name = "post")
public class Post {
  private int id;
  private Date date;
  private String title;

  @Id
  @GeneratedValue
  public int getId() {
    return this.id;
  }

  @Temporal(TemporalType.TIMESTAMP)
  public Date getDate() {
    return this.date;
  }

  public Title getTitle() {
    return this.title;
  }

  public void setDate(Date when) {
    this.date = when;
  }

  public void setTitle(String txt) {
    this.title = txt;
  }
}
```

Hibernateでの処理をする前に、セッションファクトリを作らないといけない。

```java
SessionFactory factory = new AnnotationConfiguration()
  .configure()
  .addAnnotatedClass(Post.class)
  .buildSessionFactory();
```

このファクトリは`Post`オブジェクトを操作したいときに「セッション」を作ってくれる。
セッションを使う全ての操作は以下のようなコードブロックで囲わないといけない。

```java
Session session = factory.openSession(); try {
  Transaction txn = session.beginTransaction();
  // your manipulations with the ORM, see below
  txn.commit();
} catch (HibernateException ex) {
  txn.rollback();
} finally {
  session.close();
}
```

セッションが準備できたら、以下のようにしてデータベーステーブルから全てのpostのリストを取得する。

```java
List posts = session.createQuery("FROM Post").list();
for (Post post : (List<Post>) posts){
  System.out.println("Title: " + post.getTitle());
}
```

ここで何が起こっているかは明確だと思う。
Hibernateという巨大で強力なエンジンが、データベースへの接続、SQLの`SELECT`リクエスト発行、及びデータの取得をする。
そして、`Post`クラスのインスタンスを作り、データをつめる。
そのオブジェクトが我々に渡されるとき、それにはデータが詰まっていて、getterでデータを取り出すことができる。上記`getTitle()`でやっているように。

逆の処理をしてオブジェクトをデータベースに送りたい場合は、同じことを逆の手順でやればいい。
`Post`のインスタンスを作り、データを入れ、Hibernateに保存するよう頼む。

```java
Post post = new Post();
post.setDate(new Date());
post.setTitle("How to cook an omelette"); session.save(post);
```

これがほぼ全てのORMの仕組みだ。
基本的な原則はいつも同じで、ORMオブジェクトは無気力なデータの包みだ。
我々はORMフレームワークと話して、ORMフレームワークはデータベースと話す。
オブジェクトは我々のリクエストをORMフレームワークに送り、そのレスポンスを読むのを助けてくれるだけだ。
こうしたオブジェクトは、getterやsetterのほかに何のメソッドも持たない。どのデータベースから来たのかすら知らない。

これがオブジェクト関係マッピングの仕組みだ。

これの何が間違ってるかって? 全てだ!

# ORMの何が悪いのか
真面目な話、何が悪い?
Hibernateは既に10年以上にわたって最も人気のあるJavaライブラリの一つだ。
この世のほぼ全てのSQL集約的なアプリケーションが使っている。
Javaのチュートリアルは、データベースに接続するアプリケーションのためのものとしてHibernate(またはTopLinkやOpenJPAのような[ほかのORM](https://en.wikipedia.org/wiki/List_of_object-relational_mapping_software))を挙げる。
それはデファクトスタンダードであって、なお間違っていると言っているのか?
そうだ。

私はORMの根底にあるアイデア全体が間違っていると訴えている。
この発明は多分、OOPにおいて最大の失敗である[NULL](http://tbd.kaitoy.xyz/2015/07/26/why-null-is-bad/)に次ぐ失敗だ。

実際、私だけがこんなことを言っているわけではないし、最初に言ったわけでもないことは明白だ。
この問題に関しては、既に多くの記述が尊敬すべき著者によって公開されている。例えば、Martin Fowlerによる[OrmHate](http://martinfowler.com/bliki/OrmHate.html)、Jeff Atwoodによる[Object-Relational Mapping Is the Vietnam of Computer Science](http://blog.codinghorror.com/object-relational-mapping-is-the-vietnam-of-computer-science/)、Ted Newardによる[The Vietnam of Computer Science](http://blogs.tedneward.com/2006/06/26/The+Vietnam+Of+Computer+Science.aspx)、Laurie Vossによる[ORM Is an Anti-Pattern](http://seldo.com/weblog/2011/08/11/orm_is_an_antipattern)などで、他にも沢山ある。

しかし、私の論点はこれらの著者とは違っている。
彼らが挙げている、「ORMは遅い」とか「データベースアップグレードが難しい」といった理由は実用的で有効ではあるが、重要なポイントが欠けている。
こういう実用的な論点に対しては、Bozhidar Bozhanovが彼のブログポストの[ORM Haters Don’t Get It](http://techblog.bozho.net/orm-haters-dont-get-it/)の中でとてもよい実用的な回答を示している。

重要なポイントとは、ORMが、データベースとのやり取りをオブジェクト内にカプセル化するのではなく、それを抜き取り、密で堅い[生ける有機体](http://tbd.kaitoy.xyz/2015/10/28/seven-virtues-of-good-object/)を文字通りばらばらに引き裂く、ということだ。
引き裂かれたオブジェクトの欠片はデータを保持し、ほかの欠片(ORMのエンジンであるセッションファクトリ内に実装されているもの)はそのデータの扱い方を知っていて、それをリレーショナルデータベースへ転送する。
下の絵を見てくれ。これはORMがやっていることを図示している。

![orm-anti-pattern.svg](/images/orm-is-offensive-anti-pattern/orm-anti-pattern.svg)

ブログポストの記事を読むとき、二つのコンポーネントを扱わないといけない。一つはORMで、もう一つは手足を奪われたオブジェクト。
OOPにおいては、扱うふるまいは単一のエントリーポイント、つまり一つのオブジェクトから提供されることになっている。
しかしORMの場合、ふるまいは二つのエントリーポイント、つまりORMと「もの」から提供される。
これはもはやオブジェクトとは呼べない。

この不快でひどいオブジェクト指向パラダイム違反のせいで、上記記事で述べられているような多くの実用的な問題を抱える。
私はこれにもう少しだけ付け加える。

## SQLが隠蔽されない
ORMユーザはSQL(もしくは[HQL](https://docs.jboss.org/hibernate/orm/3.3/reference/en/html/queryhql.html)のような方言)を書くはずだ。
前記の例を見てほしい。全てのブログポストを取得するために`session.createQuery("FROM Post")`を実行している。
これはSQLではないけど、よく似たものだ。
つまり、リレーショナルモデルはオブジェクト内にカプセル化されていない。
代わりに、それはアプリケーション全体に公開されている。
オブジェクトに触る誰しもが、何かを取得したり保存したりするためにリレーショナルモデルを扱わないといけない。
つまり、ORMはSQLを隠蔽したりラップしたりしておらず、アプリケーション全体に撒き散らしている。

## テストが困難
ブログポストのリストを操作するオブジェクトがある場合、それは`SessionFactory`のインスタンスを扱わないといけない。
この依存をどうする?
モックを作らないといけない?
これはどのくらい複雑な作業だろうか?
上記コードを見てほしい。ユニットテストがどれだけ冗長でやっかいなものになるかわかるはずだ。
代わりに、統合テストを書いてアプリケーション全体をテスト用PostgreSQLに接続することもできる。
この場合、`SessionFactory`のモックは不要だ。
しかしこういうテストは遅く、さらに注目すべきことには、データベースに対して何もしないオブジェクトがデータベースインスタンスに対してテストされることになる。最悪な設計だ。

もう一度繰り返すが、ORMの実用的な問題は結果に過ぎない。
根本的な欠陥は、ORMがオブジェクトをバラバラにし、[オブジェクト](http://tbd.kaitoy.xyz/2015/10/28/seven-virtues-of-good-object/)の真の概念にひどく違反していることだ。

# SQLを話すオブジェクト
他の選択肢は?
例を挙げて教えよう。
あの、`Post`クラスを私のやり方で設計してみよう。
これは二つのクラスに分ける必要がある。`Post`と`Posts`だ。
単数形と複数形。
私の[以前の記事](http://tbd.kaitoy.xyz/2015/10/28/seven-virtues-of-good-object/)ですでに述べたように、よいオブジェクトは常に現実世界のエンティティの抽象だ。
この原則が実際にどう働くかをここに示す。
我々は二つのエンティティを扱う。データベーステーブルとテーブルの行だ。
これが二つのクラスを作る理由だ。`Posts`がテーブルを表し、`Post`が行を表す。

![sql-speaking-object.svg](/images/orm-is-offensive-anti-pattern/sql-speaking-object.svg)

例の[記事](http://tbd.kaitoy.xyz/2015/10/28/seven-virtues-of-good-object/)で既に述べたように、全てのオブジェクトは契約によって働き、インターフェースを実装すべきだ。
我々の設計も二つのインターフェースから始めよう。
もちろん、オブジェクトは不変だ。`Posts`は以下のようになる。

```java
@Immutable
interface Posts {
  Iterable<Post> iterate();
  Post add(Date date, String title);
}
```

`Post`は以下だ。

```java
@Immutable
interface Post {
  int id();
  Date date();
  String title();
}
```

データベーステーブル内の全てのpostを表示するには以下のようにする。

```java
Posts posts = // we'll discuss this right now
for (Post post : posts.iterate()){
  System.out.println("Title: " + post.title());
}
```

新しいpostを作る場合は以下のようにする。

```java
Posts posts = // we'll discuss this right now
posts.add(new Date(), "How to cook an omelette");
```

このようにすると真のオブジェクトになる。
これらのオブジェクトは全ての処理を受け持ち、実装の詳細を完璧に隠蔽する。
トランザクションもセッションもファクトリもない。
これらのオブジェクトが実際にPostgreSQLと話しているのかテキストファイルからデータを持ってきているのかすらわからない。
`Posts`に求められるのは、全てのブログポストを取得する機能と新しいブログポストを作る機能だけだ。
実装の詳細は完璧に内部に隠蔽されている。
これから、どのようにこれら二つのクラスを実装できるかを見ていきたい。

ここではJDBCラッパに[jcabi-jdbc](http://jdbc.jcabi.com/)を使うが、好みに応じてほかのものやJDBCを直接使ってもよい。
それは全く重要ではない。重要なのは、データベースとのやり取りをオブジェクト内に隠蔽することだ。
`Posts`から始めよう。`PgPosts`クラス(「pg」はPostgreSQLのこと)に実装する。

```java
@Immutable
final class PgPosts implements Posts {
  private final Source dbase;
  public PgPosts(DataSource data) {
    this.dbase = data;
  }
  public Iterable<Post> iterate() {
    return new JdbcSession(this.dbase)
      .sql("SELECT id FROM post")
      .select(
        new ListOutcome<Post>(
          new ListOutcome.Mapping<Post>() {
            @Override
            public Post map(final ResultSet rset) {
              return new PgPost(rset.getInteger(1));
            }
          }
        )
      );
  }
  public Post add(Date date, String title) {
    return new PgPost(
      this.dbase,
      new JdbcSession(this.dbase)
        .sql("INSERT INTO post (date, title) VALUES (?, ?)")
        .set(new Utc(date))
        .set(title)
        .insert(new SingleOutcome<Integer>(Integer.class))
    );
  }
}
```

次に`Post`を`PgPost`クラスに実装する。

```java
@Immutable
final class PgPost implements Post {
  private final Source dbase;
  private final int number;
  public PgPost(DataSource data, int id) {
    this.dbase = data;
    this.number = id;
  }
  public int id() {
    return this.number;
  }
  public Date date() {
    return new JdbcSession(this.dbase)
      .sql("SELECT date FROM post WHERE id = ?")
      .set(this.number)
      .select(new SingleOutcome<Utc>(Utc.class));
  }
  public String title() {
    return new JdbcSession(this.dbase)
      .sql("SELECT title FROM post WHERE id = ?")
      .set(this.number)
      .select(new SingleOutcome<String>(String.class));
  }
}
```

今作ったクラスを使ってデータベースとやり取りする完全なシナリオは以下のようになる。

```java
Posts posts = new PgPosts(dbase);
for (Post post : posts.iterate()){
  System.out.println("Title: " + post.title());
}
Post post = posts.add(new Date(), "How to cook an omelette");
System.out.println("Just added post #" + post.id());
```

[ここ](https://github.com/aintshy/hub/tree/0.7.2/src/main/java/com/aintshy/pgsql)で完全な実用的な例を見られる。
これはオープンソースのWebアプリで、上で説明したのと全く同じアプローチ、つまりSQLを話すオブジェクトを使ってPostgreSQLにアクセスする。

# 性能は?
「性能は?」と君が叫んでいるのが聞こえる。
数行上のスクリプトにはデータベースとの冗長なやりとりを書いた。
まず、`SELECT id`でブログポストのIDを取得し、さらに、タイトルを取得するために`SELECT title`をそれぞれのブログポストに対して実行する。
これは非効率だ。単に遅すぎると言ってもいい。

心配はいらない。これはオブジェクト指向プログラミングであり、柔軟なんだ!
`PgPost`のデコレータを作り、全てのデータをそのコンストラクタで受け取って内部で永遠にキャッシュしよう。

```java
@Immutable
final class ConstPost implements Post {
  private final Post origin;
  private final Date dte;
  private final String ttl;
  public ConstPost(Post post, Date date, String title) {
    this.origin = post;
    this.dte = date;
    this.ttl = title;
  }
  public int id() {
    return this.origin.id();
  }
  public Date date() {
    return this.dte;
  }
  public String title() {
    return this.ttl;
  }
}
```

このデコレータはPostgreSQLやJDBCについて何も関与しないことに注目してほしい。
単に`Post`オブジェクトをデコレートして日付(date)とタイトル(title)をキャッシュするだけだ。
例によってこのデコレータは不変だ。

さて、`Posts`の別の実装を作って、「定数」オブジェクトを返すようにしてみよう。

```java
@Immutable
final class ConstPgPosts implements Posts {
  // ...
  public Iterable<Post> iterate() {
    return new JdbcSession(this.dbase)
      .sql("SELECT * FROM post")
      .select(
        new ListOutcome<Post>(
          new ListOutcome.Mapping<Post>() {
            @Override
            public Post map(final ResultSet rset) {
              return new ConstPost(
                new PgPost(rset.getInteger(1)),
                Utc.getTimestamp(rset, 2),
                rset.getString(3)
              );
            }
          }
        )
      );
  }
}
```

今、この新しいクラスの`iterate()`が返す全てのブログポストには、データベースとの一往復で取得された日付とタイトルが入っている。
デコレータやインターフェースの複数の実装を使うことで、どんな機能も望みどおりに構成することができる。
最も重要なことは、機能は拡張されたが設計は複雑になっていないことだ。クラスのサイズが大きくなっていないからね。
代わりに、小さく、それ故強度と凝集度が高い新しいクラスを導入した。

# トランザクションは?
全てのオブジェクトはそれ自身のトランザクションを扱い、それを`SELECT`や`INSERT`と同様にカプセル化すべきだ。
これはトランザクションのネストにつながる。
トランザクションのネストは、データベースサーバがサポートしていれば全く素晴らしいものだ。
サポートされていなければ、セッション全体に渡るトランザクションを表すオブジェクトを作り、「callable」クラスを受け取ればいい。
以下がその例。

```java
final class Txn {
  private final DataSource dbase;
  public <T> T call(Callable<T> callable) {
    JdbcSession session = new JdbcSession(this.dbase);
    try {
      session.sql("START TRANSACTION").exec();
      T result = callable.call();
      session.sql("COMMIT").exec();
      return result;
    } catch (Exception ex) {
      session.sql("ROLLBACK").exec();
      throw ex;
    }
  }
}
```

そして、ひとつのトランザクションに複数のオブジェクト操作をラップしたい場合はこのようにする。

```java
new Txn(dbase).call(
  new Callable<Integer>() {
    @Override
    public Integer call() {
      Posts posts = new PgPosts(dbase);
      Post post = posts.add(new Date(), "How to cook an omelette");
      posts.comments().post("This is my first comment!");
      return post.id();
    }
  }
);
```

このコードは新しいブログポストを作ってコメントを加える。
もし処理に失敗したら、トランザクション全体がロールバックされる。

私にはこのアプローチがオブジェクト指向に見える。
私はこれを「SQLを話すオブジェクト」と呼んでいる。
なぜなら、このオブジェクトはデータベースサーバとSQLを話す方法を知っているからだ。
それはオブジェクトのスキルで、完璧に内部にカプセル化されている。

----------------

以上がYegorの記事。

ORMはHibernateをちょっと使ったことがあるくらい。
IPAのデータベーススペシャリストの試験を申し込んだものの参考書が理解できなくてあきらめた過去もあり、この分野には苦手意識があって、あまり大きい声は出せない。

Hibernateについてちょっと言えば、使い始めはすばらしいものに見えて興奮するが、だんだんとその融通の利かなさにうんざりしてきて、結局DAOとかにSQLを書きまくったり、自分でデータをキャッシュする仕組みを書いたりする羽目になる、というイメージ。
Hibernateを初歩的に使うと一行もSQL(やHQL)を書かずにRDBを使うアプリケーションを書けるので、ORMはSQLを学ぶコストをカットするためのツールであると勘違いしてしまうが、実際にはインピーダンスミスマッチの解決が主目的であって、実用に際してはRDBとSQLへの深い知識が必要になる。

もちろんこれはORMの「実用的な問題」であって、Yegorが書いていることとは違う。

日本では、Yegorも挙げているLaurie Vossの[2011年半ばのブログポスト](http://seldo.com/weblog/2011/08/11/orm_is_an_antipattern)がきっかけでORMの問題が話題になったようだ。
これは[NoSQL](https://ja.wikipedia.org/wiki/NoSQL)が日本で大きく取り上げられ始めた時期ともかぶっている気がする。
もっと前から本当に性能にシビアなWebサービス界ではNoSQLを使うのが主流になっていたみたいだけど。
これはGoogle、Amazon、FacebookといったWebサービス企業のカリスマがNoSQLを押したのもあるか。
ホリエモンもエンジニアだったころ自社のサービスを作った時に使ったとか。これは15年以上前の話だから、かなり先見性があったんだな。

今RDBをもっとも使っている分野であろうエンタープライズ向けのシステムやパッケージソフトも、サービス化が大きなトレンドであり、それに加えてマルチテナント化が進めば扱うデータ量が増え、性能に対してどんどんシビアになり、NoSQLを取り入れる動きが増えるんだろう。
[2015年はNoSQL元年](http://japan.zdnet.com/article/35061140/)なんて記事もある。この記事によれば、NoSQLは大量の非構造化データを扱うIoTやM2Mの分野に有効だそうな。

まあこれもYegorが書いていることとは関係ないけど。

Yegorが言っていること、ORMは本来オブジェクトの仕事であるものを取り上げてしまうのでだめだという理屈は、オブジェクト原理主義者から見ればそうなのかもしれないが、一般の開発者から見ればそれがいいんじゃないかという話になって、議論はかみ合わない。
Yegor自身が前半で書いているORMを使ったコードより、後半のOOP原理的コードの方がかなり長い。
それってORMを使った方がやっぱりいいんじゃないのという感想を持つ人が多いのでは。(少なくとも「実用的な問題」を抜きにすれば。)

オブジェクト原理主義をしっかり理解し、そのメリットを知らなければYegorの説教も馬の耳にだ。というわけで、次は[Seven Virtues of a Good Object](http://www.yegor256.com/2014/11/20/seven-virtues-of-good-object.html)を読むか。([訳した。](http://tbd.kaitoy.xyz/2015/10/28/seven-virtues-of-good-object/))
