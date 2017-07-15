+++
categories = [ "Programing" ]
date = "2017-07-12T22:36:22+09:00"
draft = false
eyecatch = "servicenow-selenium.png"
slug = "2017-selenium-headless-browsers"
tags = [ "servicenow", "selenium", "headless-browser" ]
title = "2017年夏、Selenium、ヘッドレスブラウザ"

+++

現在仕事で[ServiceNow](https://www.servicenow.com/ja)上で動くアプリケーションを開発していて、それのブラウザテストをどうやろうかというのを少し考えたので、書き残しておく。

{{< google-adsense >}}

# ServiceNowとは
本題とほとんど関係ないけど、一応ServiceNowに簡単に触れる。

ServiceNowはITサービス管理のSaaS。
世界的にはITサービス管理のデファクトスタンダードとなっているが、日本ではこれから盛り上がりそうといった感じ。

アプリケーションを開発するプラットフォームとしての側面もあり、JavaScript(ブラウザ側とサーバ側両方)でServiceNowの機能を拡張し、他システムと連携させたり処理を自動化したりできる。

アプリケーションがServiceNowプラットフォームで動くので、テスト方法が悩ましい。
[Automated Test Framework](https://docs.servicenow.com/bundle/istanbul-release-notes/page/release-notes/servicenow-platform/automated-test-framework-rn.html)というテストフレームワークが提供されてはいるが、2017年1月にリリースされたばかりということもあるのか、機能がしょぼく、大したことはできない。
これが自前でブラウザテスト環境を作ろうと思った理由。

アプリケーションがJavaScriptなので、テストもJavaScriptで書きたい。

# ブラウザテストとは
ここでブラウザテストとは、稼働しているWebアプリケーションに、HTTPクライアントで接続して、レンダリングされたWebページを操作して実行する自動E2Eテストのこととする。
HTTPでWebコンテンツを取得して、HTML・CSSをパースしてレンダリングして、JavaScriptを実行するツール、つまりWebブラウザを何にするかというのと、それを自動で操作するのをどうするかというのと、テストどう書くのかということと、書いたテストをどう実行するかということと、テスト結果をどう集計してレポートするかといった辺りを考える必要がある。

Qiitaの記事「[ブラウザテストツール総まとめ・2016年夏版](http://qiita.com/cognitom/items/6cce719b57341769c14d)」にブラウザテストのためのツールが色々載っている。
レイヤや目的が異なるツールがちょっとごっちゃになってる気がするけど。

# SeleniumとかWebDriverとか
ブラウザテストはWebDriver抜きでは語れないので、とりあえずそれについて書く。
それにはまず[Selenium](http://www.seleniumhq.org/)について語らなければなるまい。

ブラウザテスト創世記にはこうある。

> 神は「光あれ」と言われた。
> するとSeleniumがあった。
>
> 神はその光を見て、良しとされた。
> 神はその光と闇とを分けられた。
>
> 神は光を[Selenium RC](http://www.seleniumhq.org/projects/remote-control/) (aka Selenium 1)と名づけ、
> 闇 を[Selenium WebDriver](http://www.seleniumhq.org/projects/webdriver/) (aka Selenium 2)と名づけられた。

(Seleniumの歴史をもっとちゃんと知りたければ[この記事](http://blog.trident-qa.com/2013/05/so-many-seleniums/)を読むべし。)

<br>

要は、今ブラウザテストと言ったらSelenium、Seleniumと言ったらSelenium WebDriverというわけだ。

Selenium WebDriverは、WebDriver APIでブラウザやDOMエレメントを操作するツール。
このAPIを実装したクライアントライブラリが各言語(Java、Ruby、Python、JavaScriptなど)で提供されていて、テストコードから利用できる。

APIの裏ではドライバなるものが暗躍していて、OSやブラウザのネイティブAPIを使ってブラウザを操作している。
このドライバはブラウザごと(Chrome、Firefox、IEなど)に用意されていて、その実装形式がドライバ毎に割と違っている。
例えばFirefox用のやつ([Firefox Driver](https://github.com/SeleniumHQ/selenium/wiki/FirefoxDriver))はFirefox のアドオンを使うし、Chrome用のやつ([ChromeDriver](https://github.com/SeleniumHQ/selenium/wiki/ChromeDriver))は独立したネイティブアプリを介してブラウザを操作する。

ドライバは(基本的に)ブラウザと同じマシンにある必要があり、実行するテストコードとも(基本的に)同居している必要がある。
テストを実行するマシンとは別のマシンのブラウザでテストしたければ[Selenium Server](http://docs.seleniumhq.org/download/) (aka Selenium Standalone Server)を使う。
Selenium Serverはブラウザとドライバと同じマシンで動き、テストコードから送信されたブラウザ操作コマンドを受信してドライバに伝える、プロキシ的な働きをしてくれる。

Selenium Serverを使えば、クライアントライブラリが対応していないドライバでも利用できるというメリットもある。
Selenium Serverを使うと、オーバーヘッドはあるけどメリットが多いので、とりあえず使うようにしておけば間違いなさそう。

Selenium Serverが受け取るブラウザ操作コマンドは、HTTPでJSONデータとして送信される。
この辺りの通信は、もともと[JsonWireProtocol](https://github.com/SeleniumHQ/selenium/wiki/JsonWireProtocol) (aka WebDriver Wire Protocol)で規定されていた。
JsonWireProtocolを[W3C](https://en.wikipedia.org/wiki/World_Wide_Web_Consortium)が国際標準規格化したのが[WebDriver](https://www.w3.org/TR/webdriver/)というプロトコル。
このWebDriverプロトコルは、ユーザエージェントとDOMエレメントをリモートコントロールするためのインターフェースを定めている。
現在、JsonWireProtocolは廃止扱いで、Selenium WebDriverはWebDriverプロトコルを実装している。

この辺り、[この記事](https://app.codegrid.net/entry/selenium-1)が図解してて分かりやすい。

ChromeDriverはWebDriverプロトコルを実装してるので、Selenium Server無しでもリモート実行できるけど、それでもやはりSelenium Serverを介したほうが、ドライバを簡単に切り替えられそうでよさそう。

Selenium ServerとかChromeDriverのようにWebDriverプロトコルのサーバ機能を実装したものは[RemoteWebDriverServer](https://github.com/SeleniumHQ/selenium/wiki/RemoteWebDriverServer)と呼ばれることもある。
それにアクセスするクライアントは[RemoteWebDriver](https://github.com/SeleniumHQ/selenium/wiki/RemoteWebDriver)とかRemoteWebDriverクライアントとか呼ばれる。

<br>

ということで、色々ややこしい(公式も自分でややこしいと言ってる)が、結局WebDriverは何かと言えば、普通は上記ドライバそのものを指す。
ので、以下においても、WebDriverと書いたらそれを指すこととする。

# ヘッドレス
もう一つブラウザテストの文脈で重要なのが、[ヘッドレス](https://en.wikipedia.org/wiki/Headless_software)という概念なので、ここでちょっと触れる。

ヘッドレスとは、ソフトウェアがGUIなしで動く性質とか機能のこと。

ブラウザテストは、テスト実行時にブラウザを起動するわけだが、ブラウザってのは普通GUIが付いていて、Windowsだったらログインしてないと動かせないし、LinuxだったらXの起動も必要だ。
これだと、テストを定期的に自動実行したり、CIしたりするのが難しい。
また、GUIは動作が遅く、テストに時間がかかる。

### ヘッドレスブラウザ
こうした問題を解決するため、ヘッドレスブラウザというものが開発された。
ヘッドレスブラウザには以下のようなものがある。

* [PhantomJS](http://phantomjs.org/)

    多分一番有名なヘッドレスブラウザ。
    JavaScriptとC++などで書かれていて、JavaScriptから操作できる。
    2011年にリリースされ、まだ開発が続いている。
    レンダリングエンジンはWebKitで、JavaScriptエンジンはWebKitに組み込みの[JavaScriptCore](https://trac.webkit.org/wiki/JavaScriptCore)で、
    Windows、OS X、Linuxなどで動く。
    WebDriver有り。([Ghost Driver](https://github.com/detro/ghostdriver))

* [HtmlUnit](http://htmlunit.sourceforge.net/)

    Chrome、Firefox、IEをシミュレートできるJava製のツールで、
    JavaのAPIで操作できる。
    2002年にリリースされ、まだ開発が続いている。
    レンダリングエンジンは(多分)自前で、JavaScriptエンジンはRhino。
    WebDriver有り。([HtmlUnitDriver](https://github.com/SeleniumHQ/htmlunit-driver))

* [Splash](https://scrapinghub.com/splash/)

    Python製。2013年に開発がスタートし、現在も鋭意開発中。
    LinuxとOS Xをサポートしてて、Windowsでは(多分)動かない。
    HTTP APIにJSONをPOSTして操作するもので、[Lua](https://www.lua.org/)のクライアントライブラリが提供されている。
    レンダリングエンジンはWebKitで、JavaScriptエンジンはWebKitに組み込みのJavaScriptCore。
    WebDriverなさげ。

* [TrifleJS](http://triflejs.org/)

     JavaScriptとC#(.NET 4.0)で書かれていて、Windowsでしか動かない。
     レンダリングエンジンはTridentで、IEをエミュレートする。
     JavaScriptエンジンはV8。PhantomJSと同じAPIを実装していて、JavaScriptから操作できる。
     2013年に開発がスタートし、ベータ版のまま開発中断してしまった模様。
     WebDriverは、ロードマップにはあるけどまだ実装されてない。

<br>

あと、似たようなものに[SlimerJS](https://slimerjs.org/index.html)と[Electron](https://electron.atom.io/)と[jsdom](https://github.com/tmpvar/jsdom)がある。

SlimerJSは、GeckoとSpiderMonkeyの上に開発された、スクリプトから操作できるテスト用途向けブラウザだけど、ヘッドレスではない。

ElectronはJavaScriptでデスクトップアプリケーションを開発するためのフレームワーク。
[Chromium](https://www.chromium.org/Home)というブラウザを積んでいて、それをElectron APIでプログラマティックに操作できるらしく、ブラウザテストにも使われる。
([Seleniumでも操作できる](http://qiita.com/hiroshitoda/items/288706978cd4c6df0f5f)。)
けどこれもヘッドレスではない。

jsdomはDOMツリーとそれに対する操作をエミュレートするツールで、そもそもブラウザではないはずなんだけど、HTTPでWebコンテンツダウンロードして解析もできるし、すごくヘッドレスブラウザっぽい。
けどちゃんとブラウザしてるかが怪しく、UIテストには使われてもブラウザテストにはあまり使われないっぽい。

<br>

ヘッドレスブラウザにも色々あるが結局、テスト用に作られたブラウザであって、実際に多くのエンドユーザに使われて揉まれているGUI有りブラウザに比べて、品質が悪かったり動きが違ったりする(らしい)。
JavaScriptのバージョンのキャッチアップが遅かったりも。

### Xvfb
ヘッドレスブラウザの問題は、実際のブラウザではないということに尽きる。
実際のブラウザをヘッドレスで使えたら万事が上手くいくわけだが、実はこれがLinuxでなら出来る。
[Xvfb](https://www.x.org/releases/X11R7.7/doc/man/man1/Xvfb.1.xhtml)というツールを使って。
(Xvfbはあまりメンテされてなくて[Xdummy](https://xpra.org/trac/wiki/Xdummy)が代わりに最近熱いみたいだけど。)

Xvfbはフレームバッファをエミュレートし、ディスプレイが無い環境でも動くヘッドレスXサーバ。
これを使うと、GUIのある普通のブラウザでもヘッドレス環境で動かせる。

Xvfbについては[この記事](http://blog.amedama.jp/entry/2016/01/03/115602)が分かりやすい。

### Chrome 59
Xvfbを使えば大分幸せになりそうだが、ブラウザ以外のツールを起動しなければいけなかったり、Windowsで使えなかったり、まだちょっと不満が残る。

そんななか、2017年6月、Chrome 59がリリースされ、ヘッドレスモードを搭載した。
Windowsは現時点で未対応だけど、すぐに対応されるはずだ。
ほかの実ブラウザもこの流れに乗ってヘッドレスモードを実装したら、最高に幸せな世界になるではないか。

Chromeのヘッドレスモード搭載を受け、[PhantomJSは開発停止](https://www.infoq.com/jp/news/2017/04/Phantomjs-future-uncertain)した。
もうヘッドレスブラウザはその役目を終えつつあるということなのだろう。

Chrome 59のヘッドレスモードの使い方は[この記事](https://developers.google.com/web/updates/2017/04/headless-chrome?hl=ja)が分かりやすい。

<br>
<br>

以上のような感じのことが調べて分かって、SeleniumとChromeのヘッドレスモードを使いたいと思ったところで、
続きはまた別の記事。
