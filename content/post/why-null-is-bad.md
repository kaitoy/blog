+++
categories = [ "Software Engineering" ]
date = "2015-07-26T19:07:20-06:00"
draft = false
cover = "teamedio_logo.svg"
slug = "why-null-is-bad"
tags = [ "yegor256", "oop" ]
title = "なぜNullはダメか"
highlight = true
highlightStyle = "monokai"
highlightLanguages = []

+++

このエントリでは、Yegor Bugayenkoによる記事、[Why NULL is Bad?](http://www.yegor256.com/2014/05/13/why-null-is-bad.html)を紹介する。
(Yegorから和訳と転載の許可は得た。)
以下はその全文の和訳だが、意訳超訳が混じっているので、もとのニュアンスを知りたければ元記事を読んでもいいし、読まなくてもいい。

<!--more-->

{{< google-adsense >}}

----------------
Javaで`NULL`を使う単純な例を以下に示す。

```java
public Employee getByName(String name) {
  int id = database.find(name);
  if (id == 0) {
    return null;
  }
  return new Employee(id);
}
```

このメソッドの何が間違っているのか? オブジェクトの代わりに`NULL`を返す可能性がある、というのが間違っているところだ。
`NULL`はオブジェクト指向パラダイムにおけるひどい慣習で、全力で避けるべきものだ。
これについては多くの意見が既に発表されている。
たとえば、Tony Hoareによるプレゼン[Null References, The Billion Dollar Mistake](http://www.infoq.com/presentations/Null-References-The-Billion-Dollar-Mistake-Tony-Hoare)や、David Westの著書[Object Thinking](http://www.amazon.com/gp/product/0735619654/ref=as_li_tl?ie=UTF8&camp=1789&creative=9325&creativeASIN=0735619654&linkCode=as2&tag=yegor256com-20&linkId=NQQHJZPHOKM6BTCT)の全体に渡って述べられている。

ここで、その論拠のすべてをまとめ、`NULL`の使用を回避して適切なオブジェクト指向構造に置き換える方法の例を紹介したいと思う。

基本的に、`NULL`の代わりになり得るものはふたつある。

ひとつは[Nullオブジェクト](https://en.wikipedia.org/wiki/Null_Object_pattern)デザインパターンだ。(それをひとつの不変オブジェクトにするのが最善。)

```java
public Employee getByName(String name) {
  int id = database.find(name);
  if (id == 0) {
    return Employee.NOBODY;
  }
  return Employee(id);
}
```

もうひとつは、オブジェクトを返せないときに例外を投げて[フェイルファスト](http://martinfowler.com/ieeeSoftware/failFast.pdf)することだ。

```java
public Employee getByName(String name) {
  int id = database.find(name);
  if (id == 0) {
    throw new EmployeeNotFoundException(name);
  }
  return Employee(id);
}
```

さて、`NULL`に反対する論拠を見てみよう。

因みに、上記Tony HoareのプレゼンやDavid Westの著書に加えて、私はこの記事を書く前に以下の本や記事を読んだ。

* Robert Martinの[Clean Code](http://www.amazon.com/dp/0132350882/)
* Steve McConnellの[Code Complete](http://www.amazon.com/dp/0735619670/)
* John Sonmezの[Say "No" to "Null"](http://elegantcode.com/2010/05/01/say-no-to-null/)
* StackOverflowの[Is returning null bad design?](http://stackoverflow.com/questions/1274792/is-returning-null-bad-design)

# アドホック(場当たりな)エラー処理
インプットとしてオブジェクトを受け取った場合は常に、それが`NULL`でないか、また有効なオブジェクト参照かどうかを確認しないといけない。
その確認を忘れると、`NullPointerException` (NPE)が実行時に処理を止めてしまう恐れがある。
このため、ロジックが複数の確認処理やif/then/else分岐に汚染されてしまう。

```java
// this is a terrible design, don't reuse
Employee employee = dept.getByName("Jeffrey");
if (employee == null) {
  System.out.println("can't find an employee");
  System.exit(-1);
} else {
  employee.transferTo(dept2);
}
```

これは、[C](https://ja.wikipedia.org/wiki/C%E8%A8%80%E8%AA%9E)などの命令文を並べる手続き型言語において、例外的な状況に対応する手法だ。
OOPは、主にこういったアドホックエラー処理のブロックを排除する目的で、[例外処理](https://ja.wikipedia.org/wiki/%E4%BE%8B%E5%A4%96%E5%87%A6%E7%90%86)を導入した。
OOPでは、例外処理をアプリケーションレベルのエラーハンドラにまかせることで、コードをかなりきれいで短いものにできる。

```java
dept.getByName("Jeffrey").transferTo(dept2);
```

`NULL`参照は手続き型言語から受け継がれたものだと認識し、Nullオブジェクトか例外を変わりに使うべきだ。

# あいまいな意図
上記メソッドの目的を明確に伝えるためには、`getByName()`は`getByNameOrNullIfNotFound()`という名前でなければいけない。
これと同様の名前を、オブジェクトか`NULL`を返す全ての関数が持たなければいけない。
さもなくば、だれかがあいまいなコードを読むはめになる。だから、コードの意図を明確にするために、関数に長い名前をつけるべきだ。

このあいまいさを排除するために、関数は、実オブジェクトを返すか、Nullオブジェクトを返すか、例外を投げる、しかしてはいけない。

性能を考慮すると`NULL`を返さざるを得ない場合もあるだろうと主張する人がいるかもしれない。
たとえば、Javaの<code>[Map](http://docs.oracle.com/javase/jp/7/api/java/util/Map.html)</code>インターフェースの`get()`メソッドは、指定された要素がないときに`NULL`を返す。

```java
Employee employee = employees.get("Jeffrey");
if (employee == null) {
  throw new EmployeeNotFoundException();
}
return employee;
```

このコードでは、`Map`が`NULL`を使っているおかげで、mapを一回しか検索しない。
もし、`Map`の`get()`を、要素が見つからないときに例外を投げるように修正したら、以下のようなコードになる。

```java
if (!employees.containsKey("Jeffrey")) { // first search
  throw new EmployeeNotFoundException();
}
return employees.get("Jeffrey"); // second search
```

明らかに、この方法は最初のものより2倍遅い。さて、どうする?

`Map`インターフェースは、(作者を攻めるわけではないが、)設計に問題がある。
その`get()`メソッドは`Iterator`を返すべきで、その場合以下のようなコードになる。

```java
Iterator found = Map.search("Jeffrey");
if (!found.hasNext()) {
  throw new EmployeeNotFoundException();
}
return found.next();
```

因みに、C++の標準ライブラリの[map::find()](http://www.cppll.jp/cppreference/cppmap_details.html)はまさにこのように設計されている。

# コンピュータ思考 vs. オブジェクト思考
Javaのオブジェクトはデータ構造を指すポインタで、`NULL`は何も指さないポインタ(Intel x86プロセッサでは0x00000000)であることを知っている人にとっては、`if (employee == null)`という文は理解できる。

しかし、もし君がオブジェクトになって考えたとすると、この文はかなり意味のないものになる。オブジェクト視点で上記コードは以下のように見える。

```plain
- もしもし、ソフトウェア部ですか?
- はい。
- Jeffreyと話したいのですが。
- 少々お待ちください。。。
- もしもし。
- あなたはNULLですか?
```

会話の最後の質問が変だろ?

代わりに、もしJeffreyへの取り次ぎをお願いした後で電話が切れたら、自分に問題(例外)が発生した、ということにする。
この時点で、もう一度電話してみるか、Jeffreyにつながらないので仕事が進みませんと上司に報告する。

あるいは、ソフトウェア部の人が、Jeffreyではないがだいたいの質問に答えられる人に取り次いでくれるかもしれないし、
Jeffreyにしかわからない用事だから無理、と拒否してくるかもしれない(Nullオブジェクト)。

# 遅いエラー
[フェイルファスト](http://martinfowler.com/ieeeSoftware/failFast.pdf)な`getByName()`に対して、Nullオブジェクトを使った方はゆっくり死のうとしている。途中で他のものを殺しながら。
問題が発生したので例外処理をすぐに始めるべきだと周りに知らせる代わりに、クライアントからエラーを隠している。

この議論は、前述した「アドホックエラー処理」に近い。

コードはできるだけもろい方がいい。必要なときに壊れるように。

メソッドを、それが扱うデータに対してできるだけ厳しくさせ、与えられたデータに不備があったりメソッドの使用方法に反していたら、例外を投げるようにすべきだ。

もしくは、共通的な挙動をする他は常に例外を投げるNullオブジェクトを返すべきだ。

```java
public Employee getByName(String name) {
  int id = database.find(name);
  Employee employee;
  if (id == 0) {
    employee = new Employee() {
      @Override
      public String name() {
        return "anonymous";
      }
      @Override
      public void transferTo(Department dept) {
        throw new AnonymousEmployeeException(
          "I can't be transferred, I'm anonymous"
        );
      }
    };
  } else {
    employee = Employee(id);
  }
  return employee;
}
```

# 可変で不完全なオブジェクト
一般的に、オブジェクトは[不変的](http://www.yegor256.com/2014/06/09/objects-should-be-immutable.html)に設計することが望ましい。
これはつまり、オブジェクトはインスタンス化の際に必要な情報を全て受け取り、その後そのライフサイクル全体に渡ってその状態を変えないということだ。

`NULL`は、[遅延読み込み](https://ja.wikipedia.org/wiki/%E9%81%85%E5%BB%B6%E8%AA%AD%E3%81%BF%E8%BE%BC%E3%81%BF)をする際によく使われ、オブジェクトを不完全で可変にしてしまう。以下が例だ。

```java
public class Department {
  private Employee found = null;
  public synchronized Employee manager() {
    if (this.found == null) {
      this.found = new Employee("Jeffrey");
    }
    return this.found;
  }
}
```

この手法は、広く使われてはいるが、OOPにおけるアンチパターンだ。
主な理由は、実行環境の性能問題の責任をオブジェクトに負わせているからだ。本来それは`Employee`オブジェクトが気にすべきことではない。

オブジェクトが、自身の状態を管理して、自身の役割に関するふるまいを公開する代わりに、戻り値のキャッシュの面倒を見なければいけない。これが遅延読み込みというものだ。

キャッシュはemployee(従業員)がオフィスでするようなことじゃないだろ?

解決策?
遅延読み込みを上記の例みたいな原始的な方法でやらないことだ。代わりに、キャッシュ処理をアプリケーションの他のレイヤに移せばいい。

たとえば、Javaなら、アスペクト指向プログラミングのアスペクトが使える。
たとえば、[jcabi-aspects](http://aspects.jcabi.com/)には<code>[@Cacheable](http://aspects.jcabi.com/annotation-cacheable.html)</code>というアノテーションがあり、メソッドの戻り値をキャッシュできる。

```java
import com.jcabi.aspects.Cacheable;
public class Department {
  @Cacheable(forever = true)
  public Employee manager() {
    return new Employee("Jacky Brown");
  }
}
```

君がこの分析に納得して`NULL`を使うのをやめることを願う。

{{< youtube o3aNJX7AP3M >}}

----------------

以上がYegorの記事。

Nullを使っちゃだめという意見はめずらしくないが、その根拠をコードの信頼性、可読性といった技術的な側面からだけでなく、
オブジェクト界に降り立って見たときに感じる違和感というオブジェクト哲学的な側面からも説明する辺りが面白い。

まあNullを完全に使わないという境地には、少なくともJavaのコードでは一生たどり着ける気がしないが。
メソッドの先頭で引数のNullチェックをするとかもダメなんだろうか。それがダメだとフェイルファストができなかったり、メッセージのないNullPointerExceptionが発生したりして微妙。
あ、フルスクラッチで完全に自己完結したアプリケーションを作る場合の話か。それならそもそもNullを渡すなという話にしかならないか。

自分で書くクラスやライブラリについて、Nullは内部的には使うけど、APIには一切Nullを返させない、くらいなら実現するのは難しくなさそうだし、やったほうがいい気もする。(この場合遅延読み込みで一時的にNullをセットしておくのはあり。)
ただ、性能を考えた場合は、例えばエラー処理はアドホックが一番軽くて、次にNullオブジェクトパターンで、例外はちょっと重めという風になるだろうから、Nullを返したくなることもありそう。

ことあるごとに例外を投げてくるAPIは使う側にとってはうっとうしいしなぁ。
多彩な例外を投げ分けるJavaのリフレクションみたいなのは、使うとコードが散らかってかなわん。
