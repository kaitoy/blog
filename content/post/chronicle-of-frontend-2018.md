+++
categories = ["Programming"]
date = "2018-08-16T23:44:39+09:00"
draft = false
eyecatch = "frontends.png"
slug = "chronicle-of-frontend-2018"
tags = ["react", "frontend"]
title = "Webアプリケーションフロントエンド年代記 - 2018年夏編"

+++

Webアプリケーションの、主にフロントエンド周りに関連する歴史をまとめた。

{{< google-adsense >}}

# 静的サイト

まずは原初の話から。

__1990年代前半__、まだWebアプリケーションという言葉が無かった時代。
静的にHTMLファイルを配信するだけのWebサイト(静的サイト)だけがあった。
静的サイトでは、HTTPサーバーに複数のHTMLファイルを置いておいて、クライアントのHTTPリクエストのURLのパスによって配信するHTMLファイルを変える。

例えば、HTTPサーバーを[httpd](https://httpd.apache.org/)で立てて、ドキュメントルートを`/var/www/html`に設定して、以下のようにファイルを配置したとする。

<br>

```text
/var/www/html/
    |
    +-- index.html
    |
    +-- sub/
          |
          +-- hoge.html
```

<br>

この場合、ブラウザで`http://<HTTPサーバアドレス>/index.html`にアクセスすれば`/var/www/html/index.html`が配信されてレンダリングされて表示される。
`http://<HTTPサーバアドレス>/sub/hoge.html`にアクセスすれば`/var/www/html/sub/hoge.html`が配信される。

古のWebサイトは、こんな感じにコンテンツごとにHTMLファイルを書いてサーバに置いておいて、その間にリンクを張って辿れるようにすることで構成されていた。

まあ今も大体そんな感じだけど。

# DHTML

__1990年代後半__、クライアントサイドのJavaScriptでHTMLドキュメントをいじって、多少の動的感・インタラクティブ感をだす技術は既に一応あって、[DHTML](https://ja.wikipedia.org/wiki/%E3%83%80%E3%82%A4%E3%83%8A%E3%83%9F%E3%83%83%E3%82%AFHTML)と呼ばれていた。

DHTMLの肝はJavaScriptの[DOM](https://ja.wikipedia.org/wiki/Document_Object_Model) APIだ。
このAPIでは、HTML文書が各要素(タグなど)をノードとするツリー構造(DOMツリー)で表され、任意の要素を検索して取得したり、属性などを書き換えたり、要素の追加・削除ができる。

```javascript
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
  <head>
  </head>
  <body>
    <div id="hogehoge"></div>
    <script type="text/javascript">
      // idがhogehogeの要素の子要素として「<p>HOGEEEEEEE</p>」を追加。
      document.getElementById("hogehoge").innerHTML = "<p>HOGEEEEEEE</p>"
    </script>
  </body>
</html>
```

しかし、このころのJavaScriptは、仕様・機能が貧弱だった上、ブラウザ間で挙動に差があったり、標準メソッドがブラウザ固有のメソッドで代替されていたりして開発体験が最悪だったためか、今日のようにWeb UIの中心的役割を果たすことはなく、補助的・装飾的機能の実装に使われることが多かったように思う。

アクセスした日付を表示したり、背景に雪を降らせたり、マウスカーソルを目玉に追いかけさせたり。

# 動的HTML生成 (プログラムでHTMLを書き出す)

静的サイトだと表現できることが非常に限られるので、クライアントからのリクエストの内容をサーバが解釈し、DBの情報やなんかをもとにサーバ側でHTMLドキュメントを動的に生成し、クライアントに返す、ということをするようになった。

原始的には、プログラム中で一連のHTMLドキュメントを出力する方法がとられた。

```java
public void doGet(
  HttpServletRequest request, HttpServletResponse response
) throws IOException, ServletException {

  response.setContentType("text/html;");
  PrintWriter out = response.getWriter();

  out.println("<html>");
  out.println("  <head>");
  out.println("    <title>Hoge</title>");
  out.println("  </head>");
  out.println("  <body>");
  out.println(new java.util.Date());
  out.println("  </body>");
  out.println("</html>");
}
```

使われた技術は、[CGI](https://ja.wikipedia.org/wiki/Common_Gateway_Interface) (Perl)とか、[Java Servlet](https://ja.wikipedia.org/wiki/Java_Servlet)とか。
[Jakarta ECS](http://jakarta.apache.org/ecs/index.html)なんてのもあった。

# 動的HTML生成 (HTMLにプログラムを埋め込む)

プログラムでHTMLを書き出すことにより、かなり動的な感じにはなったが、書き出す処理を書くのがめんどくさすぎるし、読みにくい。
そのため、HTMLを主体にして、そのなかの動的な部分だけにプログラムを埋め込む方式が生まれた。

```jsp
<%@ page contentType="text/html %>

<html>
  <head>
    <title>Hoge</title>
  </head>
  <body>
    <%
    out.println(new java.util.Date());
    %>
  </body>
</html>
```

HTMLドキュメントのひな型を作っておいて、その中にプログラムの処理結果を埋め込んでクライアントに返すため、テンプレートエンジンとか、テンプレートシステムとか呼ばれる。

該当する技術は、[PHP](http://www.php.net/)とか、[JSP](https://ja.wikipedia.org/wiki/JavaServer_Pages)とか、[Velocity](http://velocity.apache.org/)とか、[eRuby](https://ja.wikipedia.org/wiki/ERuby)とか。

# MVCアーキテクチャ

__2000年初頭__、[Struts](http://struts.apache.org/) (Struts1)というJavaのWebアプリケーションフレームワークが流行り、Controller (Java Servlet)がクライアントからリクエストを受け取り、Model (JavaBeans)がそれを処理して、View (JSP)がHTMLをレンダリングしてクライアントに返す、という、[MVCアーキテクチャ](https://ja.wikipedia.org/wiki/Model_View_Controller)が流行った。

<br>

![MVC](https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/MVC-Process.svg/500px-MVC-Process.svg.png "MVC")

<br>

Strutsに続いて[Spring MVC](https://docs.spring.io/spring/docs/current/spring-framework-reference/web.html)、[Ruby on Rails](https://rubyonrails.org/)、[CakePHP](https://cakephp.org/jp)といったフレームワークが出てきて、MVCアーキテクチャによる開発効率や開発体験は洗練されていった。

# Ajax

Strutsが全盛期の__2005年__ころ、JavaScriptで非同期にサーバからデータを取得し、それをもとにクライアントサイドでHTMLを動的に編集するような技術に、[Ajax](https://ja.wikipedia.org/wiki/Ajax)という名前が付いた。

Ajaxは「Asynchronous JavaScript + XML」の略で、[XMLHttpRequest](https://developer.mozilla.org/ja/docs/Web/API/XMLHttpRequest) (略してXHR)というJavaScriptのAPIで
、サーバにHTTPリクエストを送り、そのレスポンスを非同期に処理する技術。
レスポンスは、当時XMLが流行っていたので、その形式で送ることが想定されていたが、実際にはどんな形式でもいい。はず。
最近はJSONで送られることがほとんど。

JavaScriptはシングルスレッドで動くわけだけど、XMLHttpRequestはレスポンスを非同期に処理するため、リクエスト送信からレスポンス受信までの間、クライアントがスタックせずに済む。
また、通常のHTTPリクエストは、完全なHTMLドキュメントを受信して画面全体をレンダリングしなおす(i.e. 画面遷移する)のに対して、Ajaxは受信したデータをもとに画面の一部だけを更新するので、ネイティブアプリケーションに近めなユーザエクスペリエンスを実現できる。

```javascript
var xhr = new XMLHttpRequest();
xhr.open('GET', 'https://httpbin.org/get', true);
xhr.onreadystatechange = function() {
  if (xhr.readyState === 4 && xhr.status === 200) {
    console.log(xhr.responseText);
    // DOMをいじる処理
    // …
  }
};
xhr.send(null);
```

Ajaxは、GoogleがGoogle Mapsで活用して一気に注目を集めた。
地図データをサーバから非同期に先読みするなどして、マウスのドラッグによって地図を滑らかにスクロールして見せるそのUIは当時画期的で、それまでの、画面遷移中心のUIからの飛躍を感じさせた。

# PrototypeとjQuery

Ajaxの普及を後押ししたのが、[Prototype](http://prototypejs.org/)と[jQuery](https://jquery.com/)というJavaScriptライブラリの登場だった。

PrototypeはRubyにインスパイアされて開発され、Ruby on Railsに採用されたことで__2005年__ころから普及したライブラリで、JavaScriptの標準グローバルオブジェクトであるArrayとかElementに便利メソッドを生やしたり、独自のグローバルユーティリティオブジェクトを追加したりして、Ajax処理をしやすくしたり、JavaScriptの機能を拡張してくれたりする。

特に、当時のプロトタイプベースで使いにくかったJavaScriptのオブジェクト指向を扱いやすくしてくれる[Class](http://prototypejs.org/learn/class-inheritance)や、配列の処理に便利なeachとかmapとかincludeとかのメソッドを追加する[Enumerable](http://api.prototypejs.org/language/Enumerable/)なんかが熱かったように思う。

一方jQueryは、ファーストバージョンが__2006年8月__にリリースされ、ブラウザ間の非互換性をほとんど気にすることなく、簡潔なコードでDOM操作やAjax通信ができるAPIを提供した。
Prototypeと比べて、標準オブジェクトやグローバル名前空間を汚さない点がよかったのか、__2007年__ ころにはPrototypeを抜いて猛烈に普及した。

この頃からWebアプリケーションは、UIはクライアントサイドのJavaScriptでインタラクティブな感じに書いて、サーバサイドはXMLHttpRequestに対してJSONデータを返すAPIサーバとして働く、という感じのものが増えていったように思う。
またこの頃から、クライアントサイドの開発が量質ともに上がったために独立した仕事になり、サーバサイドと対比して、前者をフロントエンド、後者をバックエンドと呼ぶようになってきた。

<br>

因みに、PrototypeやjQueryと同様というかもう少し高機能な[Dojo Toolkit](https://dojotoolkit.org/)というライブラリが__2004年__ころからあったんだけど、あまり流行らなかった。
カスタムビルドという、モジュールを結合してminifyする[webpack](https://webpack.js.org/)みたいな機能を、[Node.js](https://nodejs.org/ja/)もない時代に実現していた先進的なライブラリだったんだけど、時代がついてこれなかったのかもしれない。

# RIA (Flashとか)

WebアプリケーションにはAjaxと別の世界線もあった。

そこでは__1997年__ころに[RIA (Rich Internet Application)](https://ja.wikipedia.org/wiki/%E3%83%AA%E3%83%83%E3%83%81%E3%82%A4%E3%83%B3%E3%82%BF%E3%83%BC%E3%83%8D%E3%83%83%E3%83%88%E3%82%A2%E3%83%97%E3%83%AA%E3%82%B1%E3%83%BC%E3%82%B7%E3%83%A7%E3%83%B3)という言葉が生まれた。
これは、クライアントサイドの技術を駆使した、表現力やユーザビリティが高いWebアプリケーションのこと。

(実際にはAjaxなアプリもこのくくりに入るが、ここでは非Web標準なクライアントサイド技術を使ったものの話を書く。)

RIA技術の代表格である[Flash](https://ja.wikipedia.org/wiki/Adobe_Flash)は__1996年__に生まれた。
このころはShockwave FlashとかMacromedia Flashとか呼ばれたが、開発元が__2005年__にAdobeに買収されてAdobe Flashになり、そのあたりから__2010年代前半__辺りまで最先端のWeb UI技術として甚だしく流行った。

Flashは、[Flex](https://www.adobe.com/jp/products/flex.html)というフレームワーク(ツール?)のもと、[ActionScript](https://ja.wikipedia.org/wiki/ActionScript)というJavaScriptっぽいプログラミング言語と、[MXML](https://ja.wikipedia.org/wiki/MXML)というXMLなUI記述言語を駆使してWeb UIを開発できる技術。
WebブラウザにAdobe Flash PlayerとかAdobe AIRのプラグインを入れると表示できる。

Flashの人気に触発されたのか、Microsoftが__2007年__に[Silverlight](https://www.microsoft.com/silverlight/)というのをリリースした。
これは、[.NET Framework](https://ja.wikipedia.org/wiki/.NET_Framework)な言語([C#](https://docs.microsoft.com/ja-jp/dotnet/csharp/)とか[JScript](https://msdn.microsoft.com/ja-jp/library/cc427807.aspx)とか)と、[XAML](https://docs.microsoft.com/ja-jp/dotnet/framework/wpf/advanced/xaml-overview-wpf)というHTMLっぽいUI記述言語を駆使してWeb UIを開発できる技術。
WebブラウザにMicrosoft Silverlightプラグインを入れると表示できる。

また、Flashの誕生とほぼ同時期に、JavaでWebアプリケーションのUIを書く[Java Applet](https://ja.wikipedia.org/wiki/Java%E3%82%A2%E3%83%97%E3%83%AC%E3%83%83%E3%83%88)というのも生まれていた。が、初期のバージョンでロードに時間がかかったり動作が重かったりする問題があり、嫌厭されてFlashほど流行らなかった。
WebブラウザにJavaプラグインを入れると表示できる。
なぜか最近になって、__2017年__ 公開のマイナンバーのポータルサイトで採用されて話題になった。

<br>

こうした非Web標準技術を使ったRIAは、Ajaxに比べてリッチな表現ができたり、ブラウザ間の非互換性に悩まされないところに優位性があったが、以下のような問題があった。

* プロプライエタリな技術をベースにしていて、実装がブラックボックスだったり、仕様の方向性がベンダの都合に左右されたり、ベンダロックインされやすかったりする。
* ユーザがブラウザにプラグインをいれてないと表示されない。
* セキュリティ問題が見つかった場合、オープンな技術のものに比べて対策が遅い傾向があるし、ベンダによる実装しかないので替えが利かない。
* 他ベンダの技術や標準技術との親和性が無かったり、連携が弱かったりする。
* ブラウザ内で文字列検索ができなかったり、検索エンジンにまともにクローリングしてもらえない。
* 動作が重い。

<br>

このような問題のためか、Web標準周辺技術の発展に伴い、一時期は隆盛を誇ったFlashなども次第に廃れていった。

Flashは__2020年__に、Silverlightは__2021年__にサポート終了になり、Java Appletは__2018年9月__に出るJava 11で廃止されることが決まっている。

# HTML 5とCSS 3とECMAScript 5

__2000年代中盤__ から非Web標準なRIAが流行ったのは、そもそもWeb標準技術であるHTML、CSS、JavaScript(というかその標準仕様を定める[ECMAScript](https://ja.wikipedia.org/wiki/ECMAScript))が、アプリケーションのUIを作るという目的で設計されているわけではなく、それらを使ってWeb UIを作ることに限界があったのが一因だったと思う。

RIAの流行を受け、Web標準業界に危機感が募ったのか、__2000年代後半__ くらいからWeb標準技術にWeb UIを意識したバージョンアップの動きが始まった。

* [HTML 5](https://www.w3schools.com/html/html5_intro.asp)の勧告 (__2014年__)
    * それまでの標準であるHTML 4.01の勧告が__1999年__だったので、__15年__ ぶり。
    * 文書構造を表すタグの追加: `<header>`とか`<footer>`とか。
    * 図を表現するためのタグの追加: `<svg>`と`<canvas>`。
    * inputタイプの追加: `date`、`range`、`email`とか。
    * inputタグの属性の追加: `autocomplete`、`pattern`、`placeholder`、`required`とか。
    * マルチメディアのためのタグの追加:` <audio>`と`<video>`。
    * Webアプリケーション向けAPI追加: Drag and Drop、Local Storage、Web Workerとか。
    * 冗長だったり見た目に関するタグ・属性の削除: `<center>`とか`<font>`とか`border`とか`color`とか。
    * `data-*`属性のサポート。

* [CSS 3](https://developer.mozilla.org/ja/docs/Web/CSS/CSS3)の勧告 (__2011年__)
    * それまでの標準であるCSS 2の勧告が__1998年__だったので、__13年__ ぶり。
    * 角丸、シャドウ、グラデーションのサポート。
    * セレクタの機能追加: 属性値の部分マッチ、nth-childなど。
    * メディアクエリ。
    * Flexboxレイアウト、Gridレイアウト。
    * Webフォント。
    * トランジション、トランスフォーム、アニメーション。

* [ECMAScript 5](https://www.w3schools.com/js/js_es5.asp)の発行 (__2009年__)
    * それまでの標準であるECMAScript 3の勧告が__1999年__だったので、__10年__ ぶり。
    * strictモード。
    * Arrayのメソッド追加: forEach、map、filterなど。
    * Objectのメソッド追加: keys、freezeなど。
    * グローバルオブジェクトにJSONが追加。

# JavaScriptフロントエンドフレームワーク (第1世代)

Web標準技術が進化して表現力が上がり、ECMAScript 5やjQueryによってロジックを書きやすくなり、人々がWeb UIをバリバリ書けるようになり、RIAの影響もあってUIの複雑化が進んだ。

UIが複雑化すると、ユーザ入力の処理、Ajaxによるサーバとのデータ通信、UIの状態の取得、DOMの操作なんかを、何の秩序も構造化もレイヤー分けもなくナイーブにコーディングするのが辛くなってきた。

この辛みに対処すべく誕生してきたのが数多のJavaScriptフロントエンドフレームワーク。
__2018年現在__ まで続くフロントエンドフレームワーク戦国時代の幕開けである。

フロントエンドフレームワークは大抵以下のような機能を提供してくれる。

* UI(View)の記述を楽にする何か。テンプレートエンジンとか。
* Viewに表示しているデータとJavaScriptプログラムで保持しているデータを紐づける仕組み。(i.e. [データバインディング](https://ja.wikipedia.org/wiki/%E3%83%87%E3%83%BC%E3%82%BF%E3%83%90%E3%82%A4%E3%83%B3%E3%83%87%E3%82%A3%E3%83%B3%E3%82%B0))
* Ajaxユーティリティ。
* URLをViewやロジックと紐づける仕組み。(i.e. URLルーティング)

<br>

フロントエンドフレームワーク戦国時代初期に生まれた主要なフロントエンドフレームワークを列挙する。

(この記事では便宜上第1世代と呼ぶ。)

* [Knockout](http://knockoutjs.com/)
    * __2010年__ に誕生。
    * [MVVMアーキテクチャ](https://ja.wikipedia.org/wiki/Model_View_ViewModel)。
        * ModelがUIと独立してデータ(Ajaxでサーバから取ったものなど)を保持する。
        * ViewModelがUIに紐づくデータとその操作を表現する。
        * ViewはDOMツリー。ViewModelへの変更は自動でViewに反映されるし、その逆もしかり。

* [Backbone.js](http://backbonejs.org/)
    * __2010年__ に誕生。
    * 主にModelとViewからなるMVC的アーキテクチャ。
        * Modelはデータとビジネスロジックを表現する。
            * サーバから取ってきたデータを保持。
            * ビジネスロジックによってデータが変わると、イベントを生成。
        * ViewがModelをDOMに反映する。
            * ModelからのイベントをlistenしてDOMに反映。
            * ユーザからの入力を取得して、Modelに渡す。

* [Ember.js](https://www.emberjs.com/) v1
    * __2011年__ に誕生。
    * MVVMアーキテクチャ。
    * URLルーティングをコアとするコンセプトが特徴的。

* [AngularJS](https://angularjs.org/)
    * __2012年__ に誕生。
    * Google製。
    * MVVMアーキテクチャ。
    * DIやテストなどのサポートまであるフルスタックフレームワーク。

第1世代は、フロントエンドの世界にMVCアーキテクチャ(とその派生)をもたらした。

このMVCは、Struts時代のMVCとは違い、完全にクライアントサイドに閉じたアーキテクチャだ。
サーバ側はエントリーポイントとしてHTML(とCSSとJavaScript)をサーブするほかは、JSONを返すAPIサーバとしての役割に徹する。
このようなWebアプリケーションは、ページ遷移が発生せず、単一ページだけでUIが構成されるので、[Single Page Application (SPA)](https://ja.wikipedia.org/wiki/%E3%82%B7%E3%83%B3%E3%82%B0%E3%83%AB%E3%83%9A%E3%83%BC%E3%82%B8%E3%82%A2%E3%83%97%E3%83%AA%E3%82%B1%E3%83%BC%E3%82%B7%E3%83%A7%E3%83%B3)と呼ばれる。

ModelとViewとの間でのデータの同期の仕方には以下のように2方向がある。

* M⇒V: Modelを更新すると対応するViewが自動で更新される。
* V⇒M: Viewがユーザ入力などによって変更されるとModelが自動で更新される。

前者だけをするのが1-wayバインディングで、両方するのが2-wayバインディング。
上に挙げた中では、Backbone.js以外が2-wayバインディング推しで、このころは2-wayバインディングが正義だったっぽい。

# CommonJS、Node.js、パッケージマネージャ、モジュールバンドラ、AltJS、AltCSS、トランスパイラ、タスクランナー

第1世代のフロントエンドフレームワークが出始めたころ、JavaScriptの言語周りの環境にも大きな変化があった。
正直書くの辛くなってきたので、一気に片付ける。

### CommonJS

クライアントサイドでJavaScriptが盛り上がっているのを見て、もっとJavaScriptいろんなところで活用できるんじゃね?
となって、ブラウザの外でも普通のプログラミング言語としてJavaScriptを使うためには、どんな機能を追加すべきか、みたいな議論をするプロジェクトが__2009年__に立ち上がった。
[CommonJS](http://www.commonjs.org/)である。

CommonJSの最大の功績は多分、モジュールシステムを言語仕様でちゃんとサポートしよう、と言ったこと。
モジュールシステムは、Cでいうincludeとか、JavaやPythonのimportとか、そういう機能。
JavaScriptにはもともとそういうのが無くて、単にファイルを分割して個別にロードしていただけだったので、名前空間がコンフリクトしたりしなかったりしてた。

因みに、JavaScriptのモジュールシステムには、CommonJSのやつ以外にも[AMD](https://en.wikipedia.org/wiki/Asynchronous_module_definition)というのがあったけど、そっちは盛り上がらなかった。

### Node.js

CommonJSの流れを汲んで、サーバサイドのJavaScriptランタイムとして[Node.js](https://nodejs.org/en/)が__2009年__にリリースされた。
これにより、ブラウザ外でJavaScriptを実行できるようになり、以降のJavaScript開発体験の劇的な改善につながった。

### パッケージマネージャ

__2010年__ には、Node.jsにパッケージマネージャとして[npm](https://www.npmjs.com/)が同梱されるようになった。
これにより、モジュールを公開してシェアして再利用する文化が定着し、JavaScriptプログラムの開発効率や品質がかなり向上したはず。

パッケージマネージャとしてはもうひとつ、[Bower](https://bower.io/)というのが__2012年__に出た。
npmはサーバサイドのパッケージ、Bowerはクライアントサイドのパッケージ、みたいな住みわけが当初はあったが、最近は全部npmになってBower使ってるプロジェクトは見なくなった。

__2016年10月__ には、Facebookが[Yarn](https://yarnpkg.com/lang/ja/)というnpmを代替するツールを[発表](https://code.fb.com/web/yarn-a-new-package-manager-for-javascript/)。
パッケージバージョンのロック、[CDN (CloudFlare)](https://twitter.com/madbyk/status/988795520805203969?ref_src=twsrc%5Etfw%7Ctwcamp%5Etweetembed%7Ctwterm%5E988795520805203969&ref_url=https%3A%2F%2Fblog.risingstack.com%2Fyarn-vs-npm-node-js-package-managers%2F)・キャッシュ・並列処理によるパッケージダウンロードの高速化、パッケージ間のバージョンの不整合解消(フラットモード)、といった機能により、発表直後から急速にシェアを伸ばした。

### モジュールバンドラ

サーバサイドでモジュールシステムができたのはよかったけど、その仕様がブラウザでサポートされることは終ぞなかった。
ので、モジュールバンドラというものが生まれた。
これは、ソース中のモジュールインポート(requireとかimport)をたどって、モジュール分割されたソースをブラウザが読めるように一つに結合してくれるツール。

モジュールバンドラのパイオニアが、__2011年__ にリリースされた[Browserify](http://browserify.org/)。
Browserifyは、モジュールの結合だけでなく、Node.js特有のAPIをある程度ブラウザでも動くようにしてくれるなど、魔法のようなツールだった。

__2012年__ には[webpack](https://webpack.js.org/)というモジュールバンドラが出て、後述のトランスパイラと上手く連携したり、JavaScriptだけでなくCSSもHTMLもフォントも画像ファイルもなんでもバンドルできる高機能により、Browserifyを食った。

モジュールバンドルすると、ファイルサイズが大きくなって、ブラウザでロードするのに時間がかかって、初期画面の表示が遅くなる問題があった。
__2015年__、その問題を軽減すべく、[Rollup](https://rollupjs.org/guide/en)というのが出てきた。
Rollupは、[Tree-shaking](https://rollupjs.org/guide/en#tree-shaking)という機能で、バンドル時に不要なコードを削除することでファイルサイズを小さくできることを売りにした。
が、webpackがバージョン2でTree-shakingをサポートしたため、使う理由がなくなった。

webpackは機能的には最高にクールだったが、設定が複雑で設定ファイルが肥大化するという問題があった。
この問題を解消すべく、__2017年末__ に[Parcel](https://parceljs.org/)というモジュールバンドラがリリースされ、ゼロ設定で使えるということで人気を集めてきている。
今の時点でプロダクションレディなレベルなのかは疑問。

### AltJS

上に書いた通り、__2009年__ にECMAScript 5が発行されて、JavaScriptは若干改善されたわけだけど、はっきり言ってまだまだ貧弱な言語だった。
そこに[CoffeeScript](https://coffeescript.org/)が登場。
__2009年末__ のことだった。

CoffeeScriptは、RubyやPythonみたいな簡潔で機能的な構文を備えた生産性の高い言語で、JavaScriptにコンパイルできる。
クラス構文とか、アロー関数とか、配列内包表記とか、インデントによるブロック構造とかを実現してて書き心地がかなりよかったのと、Ruby on Railsに採用されたというのもあって、__2010年代中盤__ くらいまで結構流行った。

CoffeeScriptのように、JavaScriptの代替として使い、JavaScriptに変換して実行するのを主なユースケースとする言語を、AltJS (Alternative JavaScript)と呼ぶ。
CoffeeScriptの最大の功績は、このAltJSという分野を切り開き、JavaScriptフロントエンドにコンパイルという概念を持ち込んだことだったと思う。

CoffeeScript自体はその後、__2015年__ に発行されたECMAScript 2015がその仕様を取り込んだことで役目を終えた。
__2017年9月__ に[バージョン2をアナウンス](https://coffeescript.org/announcing-coffeescript-2/)して再起を図ったが、そのころすでに他に有力なAltJSが出てたし、ECMAScriptも結構成熟してきてたし、あまり注目されなかった。

<br>

AltJSには他に以下のようなものがあるが、ほぼTypeScriptしか使われてなさそう。

* [TypeScript](https://www.typescriptlang.org/)
    * __2012年10月__ 初版リリース。
    * Microsoft製。
    * 静的型付けが最大の特徴で、他にもクラスやアロー関数やレキシカル変数などをサポート。
* [PureScript](http://www.purescript.org/)
    * __2014年4月__ 初版リリース。
    * 強い静的型付けの関数型言語。
* [Dart](https://www.dartlang.org/)
    * __2011年10月__ 初版リリース。
    * Google製。
    * 全く流行らなかったし、Google自身も社内標準プログラミング言語にTypeScriptを採用したので、だれも使ってなくてよくわからない。
    * __2018年8月__ にバージョン2がリリースされ、再起を図ってはいる。
* [JSX](https://jsx.github.io/)
    * DeNA製。
    * 名前がReactの[JSX](https://reactjs.org/docs/introducing-jsx.html)と紛らわしい。
    * 誰も使ってないし、__2014年__ くらいから開発止まってる。

### AltCSS

CSSにもalternativesがある。
というかAltJSよりも歴史が古い。

* [Sass](https://sass-lang.com/)
    * __2006年__ に誕生。
    * SASS記法とSCSS記法がある。
    * AltCSSでは1番人気っぽい。
* [Less](http://lesscss.org/)
    * __2009年__ に誕生。
    * Sassに感銘を受けたけど、そのSASS記法がCSSと違いすぎてちょっと、と思った人がCSSに寄せて作った。けどSassもCSSに寄せたSCSS記法をサポートしたため食われた。
* [Stylus](http://stylus-lang.com/)
    * __2010年__ に誕生。
* [PostCSS](https://postcss.org/)
    * __2013年__ に誕生。
    * 正確にはAltCSSではなく、CSSを処理するツールをJavaScriptで開発できるフレームワーク。
    * [PostCSS Preset Env](https://preset-env.cssdb.org/)というプラグインとともに使うと、CSSのエッジな機能を使えるようになる。つまりどちらかといえば後述のトランスパイラに近い。

### トランスパイラ

CoffeeScriptの流行などを受けて、ECMAScriptに再び改善の圧力がかかったのか、__2011年後半__ ころから次期ECMAScriptの議論が活発化した。
__2015年__ に満を持してECMAScript 6改めECMAScript 2015が発行された。

ECMAScript 2015は、クラス構文、アロー関数、レキシカル変数、定数、関数のデフォルト引数、ジェネレータ、テンプレート文字列、モジュールシステムなどをサポートし、一気にまともなプログラミング言語になった。

しかし、それらの新しい機能をアプリケーションに使うには、各社のブラウザのJavaScriptエンジンが実装して、さらにその実装したバージョンのブラウザがユーザに十分に行きわたるのを待たないといけない。
ECMAScriptの新機能は、正式に発行される前から仕様が公開され、ブラウザが先行して実装してはいくものの、[プログラマは短気](http://threevirtues.com/)なのでそんなの待ってられない。

といった状況のなか、__2014年10月__ に[6to5](https://www.npmjs.com/package/6to5)というツールがnpmで公開された。
ECMAScript 6で書かれたコードをECMAScript 5なコードに変換してくれる、トランスパイラというツールだった。

(実はトランスパイラとしては__2013年3月__に公開されたGoogle製の[Traceur](https://github.com/google/traceur-compiler)とか、__2014年4月__ に公開されたEmber.jsチーム製の[esnext](https://esnext.github.io/esnext/)のほうが先駆けだったんだけど、6to5の開発スピードがとんでもなく早く、__2015年1Q__ には機能面で両者を抜いてしまったらしい。)

6to5は__2015年2月__に名前を[Babel](https://babeljs.io/)に[変えて](https://babeljs.io/blog/2015/02/15/not-born-to-die)、単に6to5という名前が示す機能だけでなく、JavaScript周りの様々なツールを開発・統合するためのプラットフォームとなった。

__2018年現在__、Babel無しでフロントエンド開発をすることはほぼ無さそうな感じになってる。

### タスクランナー

モジュールバンドラやら、AltJSやら、AltCSSやらで、フロントエンドにコンパイルとかビルドとかいう作業が必要になって来たため、この業界にも必然的にタスクランナーが登場してきた。

タスクランナーというのは、他業界ではビルドツールなどとも呼ばれているもので、Cとかで使われる[Make](https://ja.wikipedia.org/wiki/Make)とか、Javaの[Ant](https://ant.apache.org/)とか[Maven](https://maven.apache.org/)とか[Gradle](https://gradle.org/)とか、Googleの[Bazel](https://bazel.build/)とかと同様のもの。

まず、__2012年1月__ に[Grunt](https://gruntjs.com/)がリリースされて人気を博した。
が、当時のGruntの設定ファイルがJSONで[書きにくい](http://monmon.hatenablog.com/entry/2013/12/20/151321)とか、処理がシーケンシャルで遅いとかいう不満が潜在的に溜まっていった。

で、それらの問題を払拭する[gulp](https://gulpjs.com/)が__2013年7月__に出て、Gruntを食った。

けど結局、Gruntもgulpも、タスクの処理をどこかの馬の骨が作ったプラグインに頼っていて不安定で、またビルドツールというレイヤが増えたせいでビルドエラーのデバッグがし辛くなるという[根本的な問題が顕在化](https://qiita.com/chuck0523/items/dafdbd19c12efd40e2de)し、[npm-scripts](https://docs.npmjs.com/misc/scripts)でいいじゃん、ってなった。

シンプルイズベスト。

# JavaScriptフロントエンドフレームワーク (第2世代)

前章で書いたフロントエンド界の変容の後あたりに、当時の先端技術を取り入れて誕生したフロントエンドフレームワークを、この記事では第2世代と呼ぶ。

第2世代は第1世代から正統な進化を遂げた感じで、あいかわらずMVW (i.e. MV*)だった。
主要なのは以下。

* [Vue.js](https://vuejs.org/) v1
    * __2013年12月__ に誕生。
    * Googleのエンジニア(個人)製。
    * MVVMアーキテクチャ。
    * [軽量AngularJS](https://mizchi.hatenablog.com/entry/2014/02/13/153742)な感じらしい。

* [Aurelia](https://aurelia.io/)
    * __2015年11月__ に誕生。
    * AngularJSっぽいフルスタックフレームワークで、EcmaScript 2015+とかWeb Componentsとかの先端技術を取り入れていることが売り。
    * 2-wayバインディング推しで、あまり流行らなかった。

* [Riot](https://riot.js.org/)
    * __2014年6月__ に誕生。
    * AngularJSもReactも複雑すぎ。フロントエンド開発に必要十分なコンパクトな機能を提供するぜ、というフレームワーク。
    * Aureliaよりかは使われていそう。

* [Angular](https://angular.io/)
    * __2016年9月__ に誕生。
    * AngularJSの後継。AngularJSとの互換性をばっさり切り捨てる代わりに、アーキテクチャを刷新し、性能面と機能面の[色々な問題](https://medium.com/@mnemon1ck/why-you-should-not-use-angularjs-1df5ddf6fc99)を克服したらしい。
    * が、Reactが画期的過ぎてAngularJSの栄光は取り戻せなかった。
    * 最初2-wayバインディングまで切り捨てたが、あとで復活させた。

# React (Virtual DOM)

第1世代から流行っていた2-wayバインディングがちょっと[辛みを帯びてきた](https://stackoverflow.com/questions/35379515/why-is-two-way-databinding-in-angularjs-an-antipattern)。
というか、2-wayバインディングしかできないAngularJSが辛くなってきたということだったのかもしれない。

2-wayバインディングには以下のような問題があった。

* 変更をwatchするオブジェクトが増えて、性能が悪くなる。
* ModelとViewとの間の依存やデータの流れが複雑になって、コーディングやデバッグが難しくなる。

これに異を唱えて登場してきたのがFacebookによる[React](https://reactjs.org/)。
__2013年3月__ のことであった。

2-wayバインディングもMVCもテンプレートも要らんとして、代わりにReactが突きつけてきた[Virtual DOM](https://reactjs.org/docs/faq-internals.html)という解は、世界中の人々の[魂を震えさせた](https://qiita.com/mizchi/items/4d25bc26def1719d52e6)。

Virtual DOMは、その名の通りDOMの仮想化であり、JavaScriptからReactのAPIを通してDOMのようなものを更新すると、Reactがいい感じに実DOMを更新してくれるというもの。
開発者は深く考えずに、イベントが発生するごとに、ページ全体を表すDOMツリーがどうなっているべきかをReactに教えるだけでいい。
あとはReactが、現在の実DOMとの差分を計算し、差分だけを性能よく更新してくれる。
これによって開発者は、DOMの状態やイベントの種類をみてアドホックに実DOMやModelの更新処理を書くという苦行から解放され、宣言的に[富豪的に](http://blog.neleid.com/2016/04/05/%E5%AF%8C%E8%B1%AA%E7%9A%84%E3%83%97%E3%83%AD%E3%82%B0%E3%83%A9%E3%83%9F%E3%83%B3%E3%82%B0%E3%81%AF%E6%AD%BB%E8%AA%9E%E3%81%8B/)フロントエンドプログラミングができるようになった。

さらに__2014年5月__、Reactにベストマッチするアプリケーションアーキテクチャとして[Flux](https://facebook.github.io/flux/)が発表された。
これは単方向のデータフローが特徴のアーキテクチャで、斬新でかっこよくて未来だった。

![Flux](https://github.com/facebook/flux/raw/master/docs/img/flux-diagram-white-background.png "Flux")

# JavaScriptフロントエンドフレームワーク (第3世代)

React後、Virtual DOMの実装がいくつも出てきた。
[virtual-dom](https://github.com/Matt-Esch/virtual-dom)とか[Maquette](https://maquettejs.org/)とか[Preact](https://preactjs.com/)とか[Inferno](https://infernojs.org/)とか。

Fluxの実装も、Facebook自身による[Flux](https://github.com/facebook/flux)のほか、[Fluxxor](http://fluxxor.com/)とか[Redux](https://redux.js.org/)とか[MobX](https://mobx.js.org/)とか沢山出た。

で、React+Reduxがいい感じってなって、[世界の8割近くの人がReactで書くようになって](https://medium.com/@TechMagic/reactjs-vs-angular5-vs-vue-js-what-to-choose-in-2018-b91e028fa91d)、猫も杓子もVirtual DOMってなった辺りのフロントエンドフレームワークを第3世代と呼ぶことにする。

第3世代としては以下が挙げられる。

* [Grommet](http://grommet.io/)
    * __2015年6月__ に誕生。
    * HPE製。
    * Reactと[inuitcss](https://github.com/inuitcss/inuitcss)によるフレームワーク。
    * 全然流行ってないけど[コンポーネント](http://grommet.io/docs/components)の取り揃えがよくて結構いいような気がする。

* [Ember.js v2](https://emberjs.com/blog/2015/08/13/ember-2-0-released.html)
    * __2015年8月__ リリース。
    * [Glimmer](https://glimmerjs.com/)というレンダリングエンジンを搭載。
        * Glimmerは、テンプレートをGlimmer VM上で動くバイトコードにコンパイルして、実DOMを速くレンダリングしてくれるもの。
        * Virtual DOMとは違う感じだけど、実DOMの更新を開発者の代わりにやってくれるあたり、目指しているものは同じ。

* [Vue.js v2](https://jp.vuejs.org/2016/10/01/here-2.0/)
    * __2016年10月__ リリース。
    * [snabbdom](https://github.com/snabbdom/snabbdom)ベースのVirtual DOM実装を搭載。
    * 2017年頭位からかなりの勢いで流行ってきている。

* [Hyperapp](https://hyperapp.js.org/)
    * __2017年1月__ に誕生。
    * [Qiita](https://qiita.com/)で働いてるエンジニアが趣味で作ったフレームワークで、Qiitaに採用された。
    * 超軽量(1KB!)で、シンプルが売り。
    * 独自のVirtual DOM実装であるPicodom(現[superfine](https://github.com/jorgebucaran/superfine))を搭載。
    * JSXにも対応。

* [Dojo](https://dojo.io/)
    * __2018年5月__ 正式版リリース。
    * Dojo Toolkitの後継。
    * Virtual DomでTypeScriptでリアクティブでフルスタック。

# 終わりに

__2018年8月現在__ では、React vs Vue.js vs Angularといった感じで、激動の時代が過ぎてやや落ち着いて来ている感があるが、油断はできない。

<br>

いろいろ書いたけど、[Electron](https://electronjs.org/)とか[React Native](https://facebook.github.io/react-native/)とか[Next.js](https://nextjs.org)とかの[SSR](https://jp.vuejs.org/v2/guide/ssr.html)とか[Gatsby.js](https://www.gatsbyjs.org/)とか[GraphQL](https://graphql.org/learn/)とか[PWA](https://developers.google.com/web/fundamentals/codelabs/your-first-pwapp/?hl=ja)とか[WebAssembly](https://webassembly.org/)とか[サーバーレス](https://aws.amazon.com/jp/getting-started/serverless-web-app/)とか[CSS設計手法](https://kuroeveryday.blogspot.com/2017/03/css-structure-and-rules.html)とかCSSフレームワークとかいろいろ書き漏れた。

フロントエンドのユニットテストとかE2Eテストとかもいろいろあって面白い。
(E2Eテストは[前に書いた](https://www.kaitoy.xyz/2017/08/04/browser-test-framework/)。)

<br>

年表も気が向いたら追加したい。

しかしReact+Reduxに再入門したよ、っていう記事の前座として書くつもりだったのに、ずいぶん長編になってしまった…
