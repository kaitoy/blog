+++
categories = [ "Software Engineering" ]
date = "2016-01-03T23:36:01-07:00"
draft = false
eyecatch = "teamedio_logo.svg"
slug = "oop-alternative-to-utility-classes"
tags = [ "yegor256", "oop" ]
title = "オブジェクト指向プログラミングにおいてユーティリティクラスに代わるもの"
+++

このエントリでは、Yegor Bugayenkoによる記事、[OOP Alternative to Utility Classes](http://www.yegor256.com/2014/05/05/oop-alternative-to-utility-classes.html)を紹介する。
(Yegorから和訳と転載の許可は得た。)
以下はその全文の和訳だが、意訳超訳が混じっているので、もとのニュアンスを知りたければ元記事を読んでもいいし、読まなくてもいい。

----------------
ユーティリティクラス(またはヘルパークラス)は、スタティックメソッドだけを持っていて、状態を内包しない「構造体」だ。
[Apache Commons](http://commons.apache.org/)の`StringUtils`、`IOUtils`、`FileUtils`や、[Guava](https://code.google.com/p/guava-libraries/)の`Iterables`、`Iterators`、またJDK7の`Files`はユーティリティクラスのいい例だ。

ユーティリティクラスはよく使われる共通機能を提供するので、この設計手法はJava(やC#、Rubyなど)の世界でとても人気だ。

要するに我々は、[DRY原則](https://ja.wikipedia.org/wiki/Don't_repeat_yourself)に従い、重複を避けたい。
だから、共通コードをユーティリティクラスに入れて必要に応じて再利用する。

```java
// これはひどい設計なので再利用しないように。
public class NumberUtils {
  public static int max(int a, int b) {
    return a > b ? a : b;
  }
}
```

実際、これはとても便利なテクニックだ!?

## ユーティリティクラスは悪だ
しかし、オブジェクト指向の世界では、ユーティリティクラスはかなり悪い(酷いという人さえいるかもしれない)手法だ。

これについては多くの議論がある。
いくつか挙げると、Nick Malikの「[ヘルパークラスは悪か?](http://blogs.msdn.com/b/nickmalik/archive/2005/09/06/461404.aspx)」、Simon Hartの「[なぜヘルパー、シングルトン、ユーティリティクラスはだいたい間違っているのか](http://smart421.wordpress.com/2011/08/31/why-helper-singletons-and-utility-classes-are-mostly-bad-2/)」、Marshal Wardの「[ユーティリティクラスを避ける](http://www.marshallward.org/avoiding-utility-classes.html)」、Dhaval Dalalの「[ユーティルクラスを殺せ!](http://www.jroller.com/DhavalDalal/entry/kill_that_util_class)」、Rob Bagbyの「[ヘルパークラスは問題の兆候](http://www.robbagby.com/posts/helper-classes-are-a-code-smell/)」。

また、StackExchangeにはユーティリティクラスについての質問がいくつかある。
例えば、「[ユーティリティクラスが悪なら、どこに共通コードを書けばいい?](http://stackoverflow.com/questions/3339929/if-a-utilities-class-is-evil-where-do-i-put-my-generic-code)」とか、「[ユーティリティクラスは悪](http://stackoverflow.com/questions/3340032/utility-classes-are-evil)」とか。

これらの主張は要するに、ユーティリティクラスは適切なオブジェクトではないということだ。
だから、オブジェクト指向の世界に適合しない。
ユーティリティクラスは、当時の人々が機能分割パラダイムに慣れていたために、手続き型言語から受け継がれた。

君がこの主張に同意し、ユーティリティクラスを使うのをやめたがっていると想定し、そいつをどのように適切なオブジェクトに置き換えるかを例を挙げながら教えよう。

## 手続き型の例
例えば、テキストファイルを読んで、行で分割し、各行をトリムして、その結果を別のファイルに保存したいとする。
これはApache Commonsの`FileUtils`を使えばできる。

```java
void transform(File in, File out) {
  Collection<String> src = FileUtils.readLines(in, "UTF-8");
  Collection<String> dest = new ArrayList<>(src.size());
  for (String line : src) {
    dest.add(line.trim());
  }
  FileUtils.writeLines(out, dest, "UTF-8");
}
```

上のコードはきれいに見える。
しかし、これは手続き型プログラミングであって、オブジェクト指向じゃない。
コードの各行で、データ(byteとbit)を操作し、コンピューターにどこからデータを取ってどこに書き込むかを明示的に指示している。
処理の手順を定義している。

## オブジェクト指向な方法
オブジェクト指向パラダイムでは、オブジェクトをインスタンス化して合成すべきだ。
これはオブジェクトにオブジェクト自身のやり方でデータを管理させるためだ。
補足的なスタティックメソッドを呼ぶ代わりに、求めている挙動を提供できるオブジェクトを生成するべきだ。

```java
public class Max implements Number {
  private final int a;
  private final int b;
  public Max(int x, int y) {
    this.a = x;
    this.b = y;
  }
  @Override
  public int intValue() {
    return this.a > this.b ? this.a : this.b;
  }
}
```

以下の手続き型のメソッド呼び出しは、

```java
int max = NumberUtils.max(10, 5);
```

以下の様にオブジェクト指向的になる。

```java
int max = new Max(10, 5).intValue();
```

どっちでも同じ?
いや、そうでもない。
もう少し読み進めて欲しい。

## データ構造ではなくオブジェクト
私なら、上と同じファイル編集機能をオブジェクト指向なやり方で以下の様に設計する。

```java
void transform(File in, File out) {
  Collection<String> src = new Trimmed(
    new FileLines(new UnicodeFile(in))
  );
  Collection<String> dest = new FileLines(
    new UnicodeFile(out)
  );
  dest.addAll(src);
}
```

(訳注: 上のコードは以下のコードの誤記だと思われる。
```java
void transform(File in, File out) {
  Trimmed src = new Trimmed(
    new FileLines(new UnicodeFile(in))
  );
  FileLines dest = new FileLines(
    new UnicodeFile(out)
  );
  dest.addAll(src);
}
```
)

`FileLines`は`Collection<String>`を実装していて、ファイルの読み込みと書き込みの処理を内包している。
`FileLines`のインスタンスは文字列のコレクションと全く同じ挙動をし、全てのI/O処理を隠蔽している。
このインスタンスを繰り返し処理するとファイルが読み込まれる。
このインスタンスに`addAll()`するとファイルに書き込まれる。

`Trimmed`も`Collection<String>`を実装していて、文字列のコレクションを内包している([Decoratorパターン](https://ja.wikipedia.org/wiki/Decorator_%E3%83%91%E3%82%BF%E3%83%BC%E3%83%B3))。
一行が取得されるたびにトリムされる。

`Trimmed`も`FileLines`も`UnicodeFile`も、上記スニペットに出てくる全てのクラスは小さめだ。
それぞれが自身の単一の機能に責任を持ち、つまり[単一責任原則](http://d.hatena.ne.jp/asakichy/20110808/1312754662)に完璧に従っている。

我々側、つまりライブラリのユーザから見るとこれはそれほど重要ではないかもしれないが、ライブラリの開発者から見ると肝要だ。
80以上のメソッドを持つ3000行のユーティリティクラスである`FileUtils`の`readLines()`よりも、`FileLines`の方が開発やメンテナンスやユニットテストがしやすい。
真面目な話、[そのソース](http://svn.apache.org/viewvc/commons/proper/io/trunk/src/main/java/org/apache/commons/io/FileUtils.java?view=co)を読んでみて欲しい。

オブジェクト指向のアプローチは遅延実行を可能にする。
`in`ファイルはそのデータが必要になるまで読まれない。
I/Oエラーで開けなかったら触られすらしない。
全ては`addAll()`を呼んだ後に始まる。

二つ目のスニペットの最終行を除く全行は、小さいオブジェクトをインスタンス化して大きいオブジェクトを合成している。
このオブジェクト合成は、データ変換を起こさないのでCPUコストはむしろ低い。

さらに、二つ目のスクリプトがO(1)の空間計算量で動くのに対し、一つ目のスクリプトはO(n)で動くのは明らかだ。
これが一つ目のスクリプトでデータに対して手続き型アプローチをした結果だ。

オブジェクト指向の世界では、データというものはない。オブジェクトとその挙動しかないのだ！

{{< youtube psrp3TtaYYI >}}

----------------

以上がYegorの記事。

私はユーティリティクラスは結構好きで、以下の点で有用だと思う。

* ライブラリ開発者視点:
    * 少数のクラスで多くの共通処理を実装できる。
    * ユーティリティクラスは(普通)状態を持たないので、マルチスレッドなどを意識せずに簡単に書ける。
* ライブラリ利用者視点:
    * オブジェクトを作らなくても使えるので、オーバーヘッドが少なくコードを書くのも楽。
    * ユーティリティクラスのメソッド呼び出しは大抵、「<問題領域>.<動詞><目的語>()」という形になっていて、何をやっているのかわかりやすい。

        上で出てきた`FileUtils.readLines()`も、ファイルを対象に(問題領域)、行を(目的語)読みこむ(動詞)メソッドであることが一目瞭然。

<br>

ユーティリティクラス反対派の主張が、それがオブジェクト真理教の教義に照らして適切なオブジェクトではなく、オブジェクト指向の世界に適合しないという哲学的なものである時点で、ユーティリティクラスをやめる動機に全くつながらない。

`transform()`の実装は、Apache Commonsを使ったやつの方が自分でクラスを作らなくて済み、開発量が少なくてよい、というのが普通の感覚ではないだろうか。

さらに、Yegorの`transform()`の実装だと、I/O処理を隠蔽しすぎて何をやっているのかコードからさっぱりわからない。
`addAll()`するとファイルへの書き込みが発生するなんて誰も想像だにしまい。
オブジェクト真理教の神のみぞ知るといった感じの挙動だ。
こんなコードで可読性、つまり保守性が「手続き型の例」のやつより高くなるとは到底思えない。
