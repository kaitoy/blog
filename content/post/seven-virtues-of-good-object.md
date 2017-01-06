+++
categories = [ "Software Engineering" ]
date = "2015-10-28T13:38:47-06:00"
draft = false
eyecatch = "teamedio_logo.svg"
slug = "seven-virtues-of-good-object"
tags = [ "yegor256", "oop" ]
title = "よいオブジェクトの七つの美徳"
+++

このエントリでは、Yegor Bugayenkoによる記事、[Seven Virtues of a Good Object](http://www.yegor256.com/2014/11/20/seven-virtues-of-good-object.html)を紹介する。
(Yegorから和訳と転載の許可は得た。)
以下はその全文の和訳だが、意訳超訳が混じっているので、もとのニュアンスを知りたければ元記事を読んでもいいし、読まなくてもいい。

----------------
Martin Fowler[曰く](http://martinfowler.com/bliki/InversionOfControl.html)、

> ライブラリは本質的には呼び出し可能な関数の集合で、最近は普通クラス内にまとめられる。

クラス内にまとめられた関数?
失礼を承知で言わせてもらうが、これは間違っている。
そして、これはオブジェクト指向プログラミングにおいて、クラスに対する非常に一般的な誤解だ。
クラスは関数をまとめるものではないし、オブジェクトはデータ構造体ではない。

では、なにが適切なオブジェクトなのか?
どれが不適切なオブジェクトなのか?
その違いは何か?
これは論争を呼ぶ主題ではあるが、とても重要だ。
オブジェクトが何かを理解しなければ、オブジェクト指向ソフトウェアをどうやって書くんだ?
まあ、JavaやRubyなどのおかげで、書けることは書ける。
しかし、はたして良いものができるだろうか?
不幸にも、これは厳密な科学ではなく、様々な意見がある。
ここに、良いオブジェクトの特性を私なりにリストアップする。

# クラス vs オブジェクト

<img alt="good-object-1.png" src="/images/seven-virtues-of-good-object/good-object-1.png" width="300" style="margin: 0px auto; display: block;">

オブジェクトについて議論を始める前に、クラスとは何かを定義しよう。
それはオブジェクトが生まれる(インスタント化される)場所だ。
クラスの主な責任は、要求に応じて新しいオブジェクトを構築し、使われなくなったオブジェクトを破壊することだ。
クラスはその子供たちがどのように見えどのように振る舞うべきかを知っている。
言い換えれば、子供たちが従うべき契約を知っている。

クラスが「オブジェクトのテンプレート」であると言われることもある。(例えば[Wikipediaにはそう書いてある](https://ja.wikipedia.org/wiki/%E3%82%AF%E3%83%A9%E3%82%B9_%28%E3%82%B3%E3%83%B3%E3%83%94%E3%83%A5%E3%83%BC%E3%82%BF%29)。)
この定義はクラスを受動的なポジションに置いているので正しくない。
この定義は、だれかがテンプレートを取得してそこからオブジェクトを構築するということを想定している。
これは、技術的には正しいかもしれないが、概念的には間違っている。
クラスとその子供たちだけが居るのであって、他の誰も関係すべきではない。
あるオブジェクトがクラスに他のオブジェクトを作るように頼み、そのクラスがオブジェクトを構築する。それだけだ。
RubyはJavaやC++に比べてこの概念をかなりうまく表現している。

```ruby
photo = File.new('/tmp/photo.png')
```

`photo`オブジェクトは`File`クラスによって構築される。(`new`はそのクラスへのエントリポイント。)
オブジェクトは、いったん構築されると、自身に基づいて行動する。
オブジェクトは、自身を誰が構築したかとか、何人兄弟姉妹がいるかとかを知っているべきではない。
そう、[リフレクション](https://ja.wikipedia.org/wiki/%E3%83%AA%E3%83%95%E3%83%AC%E3%82%AF%E3%82%B7%E3%83%A7%E3%83%B3_%28%E6%83%85%E5%A0%B1%E5%B7%A5%E5%AD%A6%29)は酷いアイデアだと言っている。
それについては他の記事で詳しく書くとして、ここでは、オブジェクトについてと、その最高と最悪の両面について話そう。

# 1. 彼は実世界に存在している

<img alt="good-object-2.png" src="/images/seven-virtues-of-good-object/good-object-2.png" width="300" style="margin: 0px auto; display: block;">

まず第一に、オブジェクトは生きた有機体だ。
もっと言えば、オブジェクトは[擬人化](https://ja.wikipedia.org/wiki/%E6%93%AC%E4%BA%BA%E5%8C%96)されるべきだ。
つまり、人間(もしくは、君がより好むならペット)のように扱われるべきだ。
基本的にこれは、オブジェクトはデータ構造体や関数の集合ではないということを意味している。
代わりに、オブジェクトは独立したエンティティで、それ自身のライフサイクル、振る舞い、性質を持つ。

従業員、部署、HTTPリクエスト、MySQLのテーブル、ファイルの行、ファイルそのもの、これらは適切なオブジェクトだ。
なぜならこれらは、ソフトウェアを停止した時でも実世界に存在しているから。
より正確には、オブジェクトは実世界のモノの表現のひとつだ。
オブジェクトは実世界のモノと他のオブジェクトとの間のプロキシだ。
そのようなモノが存在しなければ、明らかにオブジェクトは存在しない。

```ruby
photo = File.new('/tmp/photo.png')
puts photo.width()
```

この例では、`File`に新しいオブジェクト`photo`を構築するよう頼んでいる。
`photo`はディスク上の実際のファイルの表現となる。
ファイルもまた仮想のもので、コンピュータが起動している間だけ存在すると言う人がいるかもしれない。
それには私も同意し、「実世界」の定義を次のように改善しよう。
オブジェクトが住むプログラムの範囲外に存在する全てのもの。
ディスク上のファイルはプログラムの範囲外にあり、その表現をプログラム内に作成することは完全に正しいことと言える。

コントローラ、パーサ、フィルタ、バリデータ、サービスロケータ、シングルトン、ファクトリー、これれは良いオブジェクトではない。(そう、ほとんどのGoFパターンはアンチパターンだ!)
これらはソフトウェアの外側、実世界に存在していない。
他のオブジェクト同士を結びつけるためだけに考案されたものだ。
人工的で偽のモノだ。何も表現していない。
真面目な話、XMLパーサ、これが表現するものはなんだ?
何もない。

上記オブジェクトのいくつかは名前を変えれば良いオブジェクトになる。他のものは決して存在を許されない。
例えば、XMLパーサは「パース可能なXML」と改名でき、プログラム外に存在するXMLドキュメントを表現するようになる。

常に、「このオブジェクトの背後にある実世界のエンティティは何か?」を自問しよう。
もし回答が見つからなければ、リファクタリングを考えるときだ。

# 2. 彼は契約によって働く

<img alt="good-object-3.png" src="/images/seven-virtues-of-good-object/good-object-3.png" width="300" style="margin: 0px auto; display: block;">

良いオブジェクトは常に契約によって働く。
彼は、個人的な実力ではなく、契約に従うということを理由に雇われることを期待している。
一方、我々がオブジェクトを雇うとき、差別待遇をして、特定のクラスの特定のオブジェクトが我々のために働いてくれると期待してはいけない。
どんなオブジェクトも契約通りのことをすると考えるべきだ。
オブジェクトが期待通りの働きをしている限りは、彼の出生や性別や信仰に興味を持つべきではない。

例えば、ある写真をスクリーンに表示したいとする。その写真はPNGフォーマットのファイルから読みこまれる。
私は`DataFile`クラスのオブジェクトと契約を結び、その画像のバイナリコンテンツをくれるよう頼む。

しかし待ってほしい。私はそのデータが厳密にどこから来るかを気にするだろうか?
ディスク上のファイル、HTTPリクエスト、Dropbox上のドキュメントかもしれないが、実際私は気にしない。
私が気にするのは、オブジェクトがPNGデータが入ったバイト配列をくれるということだけだ。
つまり、私が結ぶ契約は以下のようなものだ。

```java
interface Binary {
  byte[] read();
}
```

この場合、(DataFileクラスだけでなく)どんなクラスのどんなオブジェクトでも私のもとで働くことができる。
オブジェクトが働く資格を得るためにすべきは、`Binary`インターフェースを実装することにより、契約に従うということだけだ。

この際のルールは単純で、良いオブジェクトの全てのpublicメソッドは、インターフェースのものを実装すべきだということだ。
もしオブジェクトがインターフェースから継承していないpublicメソッドを持っていたら、それはダメな設計だ。

これには実用的な理由が二つある。
第一に、無契約で働いているオブジェクトは、ユニットテストで使うモックが作れない。
第二に、無契約なオブジェクトは[デコレータ](https://ja.wikipedia.org/wiki/Decorator_%E3%83%91%E3%82%BF%E3%83%BC%E3%83%B3)で拡張できない。

# 3. 彼はユニーク
良いオブジェクトは常に、ユニークであるために何かを内包しているべきだ。
何も内包していないと、そのオブジェクトとまったく同じクローンが存在し得ることになる。私はこれはダメなことだと考えている。
以下がクローンが存在し得る悪いオブジェクトの例。

```java
class HTTPStatus implements Status {
  private URL page = new URL("http://www.google.com");
  @Override
  public int read() throws IOException {
    return HttpURLConnection.class.cast(
      this.page.openConnection()
    ).getResponseCode();
  }
}
```

`HTTPStatus`クラスのインスタンスは複数作れ、それら全ては互いに等しい。

```java
first = new HTTPStatus();
second = new HTTPStatus();
assert first.equals(second);
```

明らかにユーティリティクラスは、スタティックメソッドだけを持つので、よいオブジェクトにインスタンス化できない。
より一般的には、ユーティリティクラスはこの記事で述べられているどのメリットも持たず、「クラス」と呼ぶことさえできない。
ユーティリティクラスは単純にオブジェクトパラダイムの酷い乱用で、モダンなオブジェクト指向言語の作者がスタティックメソッドを有効にしたせいで存在している。

# 4. 彼は不変(Immutable)
良いオブジェクトは内包する状態を決して変えるべきではない。
オブジェクトは実世界のエンティティの表現であることを思い出してほしい。このエンティティは、オブジェクトが存続する間は変化しないはずだ。
言い換えれば、オブジェクトはそれが表すエンティティに決して背いてはいけない。
オブジェクトがその所有者を変化させることはないよね。

不変であることが、全てのメソッドが常に同じ値を返すことを意味するわけではないことに注意してほしい。
むしろ、良い不変オブジェクトはとても動的だ。
しかし、それは内部状態を変えることはない。例えば、

```java
@Immutable
final class HTTPStatus implements Status {
  private URL page;
  public HTTPStatus(URL url) {
    this.page = url;
  }
  @Override
  public int read() throws IOException {
    return HttpURLConnection.class.cast(
      this.page.openConnection()
    ).getResponseCode();
  }
}
```

`read()`メソッドは異なる値を返す可能性があるが、このオブジェクトは不変だ。
ある一つのウェブページを指し、他のどこを指すこともない。
内包する状態を決して変えないし、表現しているURLに背くこともない。

なぜこの不変性が美徳なのか?
次の記事で詳細を説明している: [オブジェクトは不変であるべきだ](http://www.yegor256.com/2014/06/09/objects-should-be-immutable.html)。
要するに、不変オブジェクトが優れている理由は、

* 不変オブジェクトは簡単に構築、テスト、使用できる。
* 真の不変オブジェクトは常にスレッドセーフ。
* 時間的結合(訳注: コードの実行順の暗黙的な制約)を回避するのに役立つ。
* 不変オブジェクトを使っても副作用がおきない。(防御的コピー無)
* エラー発生時の原子性が保証されている。
* キャッシュしやすい。
* [NULL参照](https://www.kaitoy.xyz/2015/07/26/why-null-is-bad/)を防ぐ。

もちろん、良いオブジェクトは[setter](https://www.kaitoy.xyz/2015/07/22/getters-setters-evil/)をもたない。セッターはオブジェクトの状態を変え得るし、URLに背くことを強要する。
言い換えると、`HTTPStatus`で`setURL()`メソッドを実装することは酷い間違いとなる。

その他にも、不変オブジェクトを使うことで、設計は必然的に凝集度の高いものになり、また密で理解しやすいものになる。
これについては[不変性がどう役に立つか](http://www.yegor256.com/2014/11/07/how-immutability-helps.html)という記事で説明している。

# 5. 彼のクラスはスタティックなものをいっさいもたない
スタティックメソッドは、オブジェクトではなくクラスの挙動を実装する。
`File`クラスがあり、その子供が`size()`メソッドを持つとする。

```java
final class File implements Measurable {
  @Override
  public int size() {
    // calculate the size of the file and return
  }
}
```

ここまではよい。`size()`メソッドは`Measurable`契約によって存在し、`File`クラスの全てのオブジェクトはそのサイズを測ることができる。
このクラスを、代わりにスタティックメソッドを持つように実装するのは酷い間違いだ。
(こうした設計は[ユーティリティクラス](http://www.yegor256.com/2014/05/05/oop-alternative-to-utility-classes.html)と呼ばれ、JavaやRubyなどのほぼ全てのOOP言語でとても人気だ。)

```java
// TERRIBLE DESIGN, DON'T USE!
class File {
  public static int size(String file) {
    // calculate the size of the file and return
  }
}
```

この設計はオブジェクト指向パラダイムの真逆を行く。
なぜかって?
なぜならスタティックメソッドはオブジェクト指向プログラミングを「クラス指向」プログラミングに変えてしまうからだ。
この、`size()`メソッドは、オブジェクトではなくクラスの挙動を公開する。
これの何が間違っているかと言われるかもしれない。
なぜオブジェクトとクラス両方をコード中で第一級市民として使えないのか?
なぜ両方ともがメソッドやプロパティを持てないのか?

この問題は、クラス指向プログラミングでは、分離ができなくなるというものだ。
複雑な問題をブレイクダウンできなくなる。
なぜなら、プログラム全体の中でクラスのインスタンスがたったひとつしか存在しないからだ。
OOPの力は、オブジェクトをスコープを分離するための道具として使えることだ。
あるオブジェクトをメソッド中でインスタンス化したとき、そのオブジェクトは特定のタスク専任となる。
そのオブジェクトは、メソッド周辺の他のオブジェクトから完璧に分離されている。
このオブジェクトはメソッドスコープのローカル変数だ。
スタティックメソッドを持つクラスは、どこで使うにしろ常にグローバル変数だ。
このため、この変数とのやりとりを分離することはできない。

オブジェクト指向の原理に概念的に反しているということの他にも、パブリックなスタティックメソッドは実用的な欠点も持っている。

第一に、モックを作れない。
(いや、[PowerMock](https://code.google.com/p/powermock/)を使うことはできる。が、これはJavaプロジェクトで取り得る決断の中で最悪なものとなるだろう。。。私はそれを数年前にやってしまった。)

第二に、定義上スレッドセーフではない。なぜなら、常にスタティック変数とともに動くからで、スタティック変数は全てのスレッドからアクセスできるからだ。
スタティックメソッドをスレッドセーフに作ることもできるが、この場合常に明示的な同期が必要になる。

パブリックなスタティックメソッドを見つけたら常に、即座に書き直すべきだ。
スタティック(グローバル)変数がどれだけ酷いかについては説明したくもない。それは明らかだ。

# 6. 彼の名前は職名ではない

<img alt="good-object-4.png" src="/images/seven-virtues-of-good-object/good-object-4.png" width="300" style="margin: 0px auto; display: block;">

オブジェクト名はそのオブジェクトが何であるかを示すべきで、何をするかを示すべきではない。
実世界の物に名付けるのと同様に。
ページ集めではなく本、水入れではなくカップ、体飾りではなくTシャツ。
もちろん、プリンタやコンピュータのような例外はあるが、これらはこの記事を読まなかった人々によってごく最近発明されたものだ。

例えば、次のような名前はその持ち主が何であるかを示す。
りんご、ファイル、HTTPリクエスト群、ソケット、XMLドキュメント、ユーザリスト、正規表現、整数、PostgreSQLテーブル、Jeffrey Lebowski。
適切な名前はいつも小さい絵として描ける。正規表現でさえ描ける。

逆に、次に挙げる名前の例は持ち主が何をするかを示す。
ファイルリーダ、テキストパーサ、URLバリデータ、XMLプリンタ、サービスロケータ、シングルトン、スクリプトランナ、Javaプログラマ。
これらの絵を描けるか?
描けない。
こういう名前は良いオブジェクトには適さない。
これらは酷い設計につながる酷い名前だ。

一般的に、「-er」で終わる名前を避けるべきだ。そのほとんどはダメなものだ。

「`FileReader`の代わりは何」と疑問に思うだろう。
よりよい名前は何?

ええと、我々は既に`File`を持っていて、それは実世界のディスク上のファイルの表現だ。
この表現は十分に強力ではない。なぜなら、それはファイルの内容を読む方法を知らないからだ。
その能力を持ったより強力なものを作りたい。
何という名前にする?
名前は、その持ち主が何をするかではなく、何であるかを示すべきであるということを思い出してほしい。
持ち主は何か?
データを持ったファイルだ。ただのファイルではなく。
`File`っぽいけど、もっと洗練されたものだ。データを持った。
なので、`FileWithData`、もしくは単に`DataFile`というのはどうだろう?

同様のロジックを他の全ての名前にも適用すべきだ。
常に何をするかよりも何であるかを考えよう。
オブジェクトに職名ではなく、リアルで、意味のある名前を付けよう。

より詳しくは「[-ERで終わるオブジェクトを作るな](http://www.yegor256.com/2015/03/09/objects-end-with-er.html)」を参照。

# 7. 彼のクラスはFinalかAbstractのどちらか

<img alt="good-object-5.png" src="/images/seven-virtues-of-good-object/good-object-5.png" width="300" style="margin: 0px auto; display: block;">

良いオブジェクトはfinalまたはabstractなクラスから生成される。
`final`クラスは継承によって拡張できないクラスだ。
`abstract`クラスは子供を持てないクラスだ。
簡単に言うと、クラスは、「君は僕を決して壊せない。僕はブラックボックスだ。」か、または「僕は壊れている。直してから使ってくれ。」のどちらかを言う。

その間には何もない。finalクラスはブラックボックスで、あらゆる意味で変更できない。
オブジェクトは現状のままで働き、君はそれを使うか捨てるかしかしない。
そのプロパティを継承する別のクラスを作ることはできない。
これは`final`修飾子によって禁止されている。
そのようなfinalクラスを拡張する唯一の手段は、その子供をデコレートすることだ。
例えば、(上記)`HTTPStatus`クラスがあり、それを気に入らなかったとする。
いやまあ好きではあるけど、私にとっては十分強力ではないんだ。
HTTPステータスが400より大きい場合に例外を投げて欲しい。
`read()`メソッドにもう少し処理をしてもらいたい。
古風なやり方は、そのクラスを拡張してメソッドを上書きすることだ。

```java
class OnlyValidStatus extends HTTPStatus {
  public OnlyValidStatus(URL url) {
    super(url);
  }
  @Override
  public int read() throws IOException {
    int code = super.read();
    if (code > 400) {
      throw new RuntimException("unsuccessful HTTP code");
    }
    return code;
  }
}
```

なぜこれではダメなのか?
メソッドのひとつをオーバーライドすることで親クラス全体のロジックを壊す危険があるので全然ダメだ。
`read()`を子クラスでオーバーライドしたら、親クラスから来る全てのメソッドがその新しいやつを使うことになる、ということを忘れないで欲しい。
これは、文字通り新しい「実装のかけら」をクラスの内部に挿入するということだ。
哲学的に言って、これは反則だ。

一方、finalクラスを拡張するためには、それをブラックボックスのように扱い、他の実装でデコレートする必要がある。([デコレータパターン](https://ja.wikipedia.org/wiki/Decorator_%E3%83%91%E3%82%BF%E3%83%BC%E3%83%B3))

```java
final class OnlyValidStatus implements Status {
  private final Status origin;
  public OnlyValidStatus(Status status) {
    this.origin = status;
  }
  @Override
  public int read() throws IOException {
    int code = this.origin.read();
    if (code > 400) {
      throw new RuntimException("unsuccessful HTTP code");
    }
    return code;
  }
}
```

このクラスがもともとと同じインターフェース、`Status`を実装していることに注目して欲しい。
`HTTPStatus`のインスタンスはコンストラクタを通して渡され、内包される。
そして、全てのメソッド呼び出しは割り込まれ、必要に応じて独自に実装される。
この設計だと、もとのオブジェクトをブラックボックスとして扱い、その内部のロジックには決して触らない。

もし`final`というキーワードを使わなかったら、だれでも(君自身でも)そのクラスを拡張し、損なうことができる。(よって`final`でないクラスは悪い設計だ。)

abstractクラスは真反対なケースだ。それは不完全で、そのままでは使えないことを示している。
独自の実装ロジックを挿入する必要があるが、それは許可された部分だけに限られる。
この部分は`abstract`メソッドとして明示的に示されている。
例えば、`HTTPStatus`は以下のようになる。

```java
abstract class ValidatedHTTPStatus implements Status {
  @Override
  public final int read() throws IOException {
    int code = this.origin.read();
    if (!this.isValid()) {
      throw new RuntimException("unsuccessful HTTP code");
    }
    return code;
  }
  protected abstract boolean isValid();
}
```

見て分かるとおり、このクラスはHTTPコードを検証する方法を知らないので、継承して`isValid()`をオーバーライドすることによってそのロジックを挿入することを期待している。
この継承は親クラスを損なわない。他の全メソッドが`final`によって守られているからだ。(メソッドの修飾子に注目してくれ。)
つまり、このクラスは攻撃への備えがしてあって、完全に防御している。

まとめると、クラスは`final`か`abstract`のどちらかであるべきで、その中間はない。

----------------

以上がYegorの記事。

この記事は、オブジェクト指向原理主義者であるYegorが彼のオブジェクト観の概論を書いたものだ。
彼のオブジェクトに対するとんがった信念が読み取れる。

記事の内容をまとめると、

1. オブジェクトは何か実体と対応していないといけない。
2. クラスはインターフェースを実装していないといけない。
3. オブジェクトはユニーク性を保証するフィールドを持っていないといけない。
4. オブジェクトは不変でないといけない
5. クラスはスタティックメソッド/フィールドを持っていてはいけない。
6. erで終わるクラス名を使ってはいけない。
7. クラスにはfinalかabstractが付いていないといけない。

#1と#6はだいたい同じことを主張していて、その内容は実用的というよりかは哲学的だ。
敢えて実用面について言えば、同じ哲学を共有しているチームがこの主張に従えば、そのチーム内でコードの可読性や保守性が上がるというメリットがあると考えられる。
が、オブジェクト指向原理主義よりもGoFのデザインパターンの方がはるかに広く深く浸透しているので、このメリットはあまりありがたみが無い。
私はオブジェクト真理教に入信したわけではないので、これからもControllerとかFactoryとかServiceとかいうクラスを書くだろう。

#2については、言っていることは分かるしインターフェースのメリットもよく理解しているつもりだが、わんさとクラスを書かないといけないのに逐一インターフェースまで書いてられるかというのが本音だ。
実際には、モックを書いたり多態したいとき、または将来そうなると天啓があったとき、つまりは必要に応じてインターフェースを書くのであって、なんでもかんでも書いていたら書くのも読むのもいたずらに大変になってしまう。(そういう方針をとって開発者から不満が噴出したプロジェクトが身近にあったと聞いた。)
Yegorのプロジェクトでは全てのクラスがインターフェースを実装しているんだろうか。信じ難い。

#3も、ちょっと実用的な雰囲気の主張だが、よくみるとこれに従うことでどんなメリットがあるかとか、従わないことでどんな問題が発生するかとかが書いてない。
哲学的な主張か。
私が開発している[Pcap4J](https://github.com/kaitoy/pcap4j)には、ネットワークパケットを表すクラスが多数あるが、それらからインスタンス化されるオブジェクトは必ずしもユニークではない。
例えば、Ethernetヘッダを表すクラスである[EthernetHeader](https://github.com/kaitoy/pcap4j/blob/master/pcap4j-core/src/main/java/org/pcap4j/packet/EthernetPacket.java)は、Ethernetパケットの送り元と送り先が同じで、且つレイヤ3のプロトコルが同じなら`equals()`が`true`を返す。
つまり、実世界で異なるパケットのヘッダでも、Java世界では同一とみなされることがよくある。
この実装で実用上困ることは無い気がするけど、オブジェクト指向原理主義に照らすとダメってことか?
`UUID`みたいなフィールドでも加えればいいのか?
そんなフィールドはEthernetヘッダにはないのに?

#4は好き。ただ全てに適用できるかというと疑問。不変オブジェクトで、例えば[Builderパターン(GoFじゃなくてEffective Javaの方)](http://qiita.com/disc99/items/840cf9936687f97a482b#effective-java-builder)が対応している問題をどう解決するんだろう?
すごく頑張ってYegorの言いつけを守りながら、Builderパターンっぽくインスタンス化できるEthernetHeader(という名のEthernetヘッダフィールドの値を保持するクラス)を書いてみたら以下のようになった。

まず、一般的なヘッダを表す`Header`クラスを作る。不変で、`id`という適当なフィールドを持つ。

```java
package test;
import org.pcap4j.util.MacAddress;

public final class Header {
  private final int id;

  public Header(int id) {
    this.id = id;
  }

  public int getId() { return id; }

  public DstAddrSetEthernetHeader dstAddr(MacAddress dstAddr) {
    return new DstAddrSetEthernetHeader(this, dstAddr);
  }
}
```

次に、`Header`をデコレートして拡張し、`dstAddr`というフィールドを追加したもちろん不変なクラス`DstAddrSetEthernetHeader`(dstAddrだけがセットされたEthernetヘッダ)を作る。

```java
package test;
import org.pcap4j.util.MacAddress;

public final class DstAddrSetEthernetHeader {
  private final Header header;
  private final MacAddress dstAddr;

  DstAddrSetEthernetHeader(Header header, MacAddress dstAddr) {
    this.header = header;
    this.dstAddr = dstAddr;
  }

  public MacAddress getDstAddr() { return dstAddr; }

  public int getId() { return header.getId(); }

  public DstAddrAndSrcAddrSetEthernetHeader srcAddr(MacAddress srcAddr) {
    return new DstAddrAndSrcAddrSetEthernetHeader(this, srcAddr);
  }
}
```

さらに`DstAddrSetEthernetHeader`をデコレートして拡張し、`srcAddr`というフィールドを追加したもちろん不変なクラス`DstAddrAndSrcAddrSetEthernetHeader`(dstAddrとsrcAddrがセットされたEthernetヘッダ)を作る。

```java
package test;
import org.pcap4j.packet.namednumber.EtherType;
import org.pcap4j.util.MacAddress;

public final class DstAddrAndSrcAddrSetEthernetHeader {
  private final DstAddrSetEthernetHeader header;
  private final MacAddress srcAddr;

  DstAddrAndSrcAddrSetEthernetHeader(DstAddrSetEthernetHeader header, MacAddress srcAddr) {
    this.header = header;
    this.srcAddr = srcAddr;
  }

  public MacAddress getSrcAddr() { return srcAddr; }

  public int getId() { return header.getId(); }

  public MacAddress getDstAddr() { return header.getDstAddr(); }

  public EthernetHeader type(EtherType type) {
    return new EthernetHeader(this, type);
  }
}
```

やっとビルド対象である`EthernetHeader`を書く。

```java
package test;
import org.pcap4j.packet.namednumber.EtherType;
import org.pcap4j.util.MacAddress;

public final class EthernetHeader {
  private final int id;
  private final MacAddress dstAddr;
  private final MacAddress srcAddr;
  private final EtherType type;

  public EthernetHeader(DstAddrAndSrcAddrSetEthernetHeader header, EtherType type) {
    this.id = header.getId();
    this.dstAddr = header.getDstAddr();
    this.srcAddr = header.getSrcAddr();
    this.type = type;
  }
}
```

上記4つのクラスを使って、次のようにBuilderパターンっぽいことができる。

```java
package test;
import org.pcap4j.packet.namednumber.EtherType;
import org.pcap4j.util.MacAddress;

public class ImmutableBuilderSample {
  public static void main(String[] args) {
    EthernetHeader header
      = new Header(1)
          .dstAddr(MacAddress.getByName("aa:bb:cc:dd:ee:ff"))
          .srcAddr(MacAddress.getByName("11:22:33:44:55:66"))
          .type(EtherType.IPV4);
  }
}
```

パラメータの設定順を自由にしたければ、さらに`SrcAddrSetEthernetHeader`とか`TypeSetEthernetHeader`とか`DstAddrAndTypeSetEthernetHeader`とか作らないといけない。これは疲れる。
沢山オブジェクトを作るのに、最後の`EthernetHeader`以外のが使い捨てというのも辛い。
`EthernetHeader`は3つしかフィールドがないからまだましな方なんだが。

私は、不変クラスはスレッドセーフにすることを主目的として作る。
普通アプリケーションはマルチスレッドになるんだから、基本的にクラスは不変を目指して作り、どうしても可変にしたくなったときは内部で同期してスレッドセーフに保つか、外で同期してもらうか、またはシングルスレッドで使ってもらうかを考える。
上記のBuilderなんかは可変フィールドを使わないとまともに作れないし、その性質上マルチスレッドで使うことは普通ないし、無理に不変にする必要はなかろう。

#5については、Yegorが問題視していることにはだいたい納得できる。(哲学的な部分以外は。。。)
しかし、Yegorが、スタティックメソッドが可変フィールドを参照することを前提に話しているところにひっかかる。
私はpublic staticなフィールドをfinal無しで書くことはないし、スタティックメソッドは殆どの場合引数だけを使うように書き、たまにfinalなフィールドを参照させるくらいだ。(ちょっとあやしいけど多分。)
世のユーティリティクラスもだいたいそんな感じで書かれているんじゃなかろうか。
この場合、スレッドセーフじゃないという問題点は出ないし、問題の分離も、スタティックフィールドでデータを共有するわけではないのでちゃんとできる。
モックはできないけど、ユーティリティクラスのモックを書きたいことなんてあるだろうか?

#7は同意。abstractじゃないメソッドをオーバーライドするのって気持ち悪いし。
ところでデコレータパターンってすごい便利で汎用性高いと思うんだけど、いざというときに思いつかないようで、あんまり使ったことないな。

以上ひとつひとつの主張について考えてみたけど、反感が多いな。
これはオブジェクト真理教に入信するメリットが見えてこないからだろう。
もともとOOPっていうのは、手続き型言語が隆盛な時代の関数を使った処理の分離という考え方を押し進め、処理と処理対象データを一緒にして分離するという実用的で技術的な目的のもとに生まれたもので、オブジェクトは実世界のモノを表現しなきゃいけないってのは後付けの哲学だ。
OOPはそれを共通認識として発展したわけではないので、極端な哲学に縛られていると長い歴史に揉まれた強力なノウハウの多くが使えなくなってしまう。
GoFのデザインパターンを否定するなら、GoFが解決した問題への別解を提示してくれないとなかなか受け入れがたい。
