+++
categories = [ "Programing" ]
date = "2017-08-04T15:29:37+09:00"
draft = false
cover = "servicenow-webdriverio.png"
slug = "browser-test-framework"
tags = [ "servicenow", "selenium", "test-framework", "webdriverio" ]
title = "2017年夏、ブラウザテストフレームワーク"

+++

「[2017年夏、Selenium、ヘッドレスブラウザ](https://www.kaitoy.xyz/2017/07/12/2017-selenium-headless-browsers/)」の続き。
[ServiceNow](https://www.servicenow.com/ja)アプリケーションのブラウザテストをしたくて色々調べている。
前回は、Selenium(WebDriver)とChromeのヘッドレスモードを使うのがよさそうというところまで書いた。

この記事では、ブラウザテストフレームワークを選ぶ。

<!--more-->

{{< google-adsense >}}

# ブラウザ操作ツールとかブラウザテストフレームワークとか

Seleniumを直接使って、[JUnit](http://junit.org/junit4/)なんかのテストフレームワークでブラウザテストを書くこともできるけど、それは結構つらい。
Seleniumは低レベルなブラウザ操作APIを提供するので、単純にテスト書き辛いし、動的サイトを扱うときには、かなり気を使ってwait処理を入れていかないとテストが安定しない。
テスト前に、WebDriverの準備をしないといけなかったりするのも面倒。

なので、昨今はもう少し高級なツールやフレームワークを使うのが普通な模様。
あまり知らなかったので色々記事を読んだ。

* [Seleniumアレルギーのための処方箋](http://qiita.com/cognitom/items/27b7375bea653b414c8f)
* [ブラウザテストツール総まとめ・2016年夏版](http://qiita.com/cognitom/items/6cce719b57341769c14d)
* [2017年JavaScriptのテスト概論](http://postd.cc/a-complete-guide-to-testing-javascript-in-2017/)

<br>

結果、ブラウザ操作ツールやブラウザテストフレームワークには以下のようなものがあることが分かった。
(SeleniumやWebDriver系じゃないのも含む。)

<br>

* [Nightwatch.js](http://nightwatchjs.org/)

    GitHubの★は6835。

    JavaScriptでブラウザテストを書けるフレームワーク。
    WebDriverプロトコルに対応していて、Seleniumと異なる独自のクライアントAPIを実装。
    つまり使えるブラウザの幅が広い。

    テストフレームワークは独自のもの。

* [WebdriverIO](http://webdriver.io/)

    GitHubの★は3217。

    JavaScriptでブラウザを操作できるツール。
    WebDriverプロトコルに対応していて、Seleniumと異なる独自のクライアントAPI(ラッパ?)を実装。
    つまり使えるブラウザの幅が広い。

    独自のテストランナである[WDIO](http://webdriver.io/guide/testrunner/gettingstarted.html)付きで、テストフレームワークに[Mocha](https://mochajs.org/)、[Jasmine](https://jasmine.github.io/)、[Cucumber](https://cucumber.io/)など、いろいろ利用できる。

* [Protractor](http://www.protractortest.org/#/)

    GitHubの★は6801。

    JavaScriptでブラウザテストを書けるフレームワーク。
    WebDriverプロトコルに対応していて、[selenium-webdriver](https://github.com/SeleniumHQ/selenium/wiki/WebDriverJs)をラップしたAPIを提供する。
    WebDriverなのでブラウザはなんでも。

    テストフレームワークは、Jasmine、Mocha、Cucumberのほか、いろいろ選べる模様。

    AngularとAngularJS向けだけどそれ以外にも使える。
    Google製なので信頼感があるし、ドキュメントもコミュニティもしっかりしてる。

* [Casper.js](http://casperjs.org/)

    GitHubの★は6337。

    JavaScriptでブラウザテストを書けるフレームワーク。
    使えるブラウザは[PhantomJS](http://phantomjs.org/)か[SlimerJS](https://slimerjs.org/)だけで、多分WebDriver使ってない。

    テストフレームワークは独自のもの。

* [Nightmare](http://www.nightmarejs.org/)

    GitHubの★は12964。

    JavaScriptでブラウザを操作できるツール。
    ブラウザは、昔の1系はPhantomJSを使ってたけど、今の2系は[Electron](https://electron.atom.io/)。
    WebDriverは使ってないはず。

    テストフレームワーク機能は付いてないけど、同じ作者の[Niffy](https://open.segment.com/niffy)というNightmareベースのツールがちょっとそれっぽい。

* [TestCafe](https://devexpress.github.io/testcafe/)

    GitHubの★は3029。

    JavaScriptでブラウザテストを書けるフレームワーク。
    すごい多機能っぽいし、TypeScriptやasync/awaitをサポートしててなんかモダン。
    WebDriverは使ってないっぽいけど、Chrome、Firefox、IE、Edge、Safariなど、一通りのブラウザが使える。
    なぜかリモートテストもできる。

    どうもSelenium 1みたいにJavaScriptコードを挿入してテスト実行するらしいんだけど、よくわからない。

* [Zombie.js](http://zombie.js.org/)

    GitHubの★は4608。

    JavaScriptでjsdomを操作できるツール。
    なぜか妙にアサーション機能に凝っている。

    WebDriverは使ってないはず。

* [Puppeteer](https://github.com/GoogleChrome/puppeteer)

    GitHubの★は29068。

    Chromeを[DevToolsプロトコル](https://chromedevtools.github.io/devtools-protocol/)で操作するJavaScript(Node)ライブラリ。

    Chrome開発チームが開発している。

    WebDriverは使ってない。

* [Chromy](https://github.com/OnetapInc/chromy)

    GitHubの★は294。

    JavaScriptでChromeを操作できるツール。
    [chrome-remote-interface](https://github.com/cyrus-and/chrome-remote-interface)をラップして、
    NightmareっぽいAPIを提供する。

    WebDriverは使ってない。

* [Codeception](http://codeception.com/)

    GitHubの★は2900。

    PHPUnitとSeleniumをラップして、ユーザ視点のブラウザテスト(受入テスト)をPHPで書けるフレームワーク。

* [Capybara](http://teamcapybara.github.io/capybara/)

    GitHubの★は7937。

    Seleniumをラップして、ブラウザテスト(受入テスト)をRubyで書けるフレームワーク。
    テストフレームワークはRack::Testを始め、いろいろ選べる模様。

* [Geb](http://www.gebish.org/)

    GitHubの★は759。

    Seleniumをラップして、 JUnitやTestNGと連携して、ブラウザテストをGroovyで書けるフレームワーク。

* [Selenide](http://selenide.org/)

    GitHubの★は555。

    Seleniumをラップして、ブラウザテストをJavaで書けるフレームワーク。

<br>

これらよりさらに高級なツールに、[CodeceptJS](http://codecept.io/)というのがあって、これはJavaScriptでユーザ視点のブラウザテスト(受入テスト)を書けるフレームワーク。
基本的にはMochaとWebdriverIOをラップして、より抽象的なAPIを提供する。
WebdriverIOをProtractorとかNightmareとか[Appium](http://appium.io/)に代えられて、色んな環境のテストが統一的なAPIで書ける。
すごいけどバグを踏んだ時辛そう。

また、ブラウザテストの文脈でよく名前が出る[Karma](http://karma-runner.github.io/1.0/index.html)は、テストフレームワークではなくて、HTTPサーバを起動して、テストを実行するためのHTMLを生成して、ブラウザを起動してそれを読み込んでくれたりするツール(i.e. テストランナ)。
主にユニットテストを色んなブラウザで実行するためのもので、ServiceNowのようなSaaSのテストには使えないはず。

<br>

どれを使うか。

ServiceNowアプリの開発がJavaScriptなので、テストもJavaScriptで書いてユニバーサルな感じにしたい。
のでCodeceptionとCapybaraとGebとSelenideは無し。

テストのリモート実行やクロスブラウザテストを見据えてWebDriver使ってたほうがよさそうなので、
NightmareとCasper.jsとZombie.jsとPuppeteerとChromyも無し。

TestCafeはWebDriverにこだわらなければよさそうだけど、今回はWebDriverで行きたい気分なのでパス。

Protractorはよさそうだったけど、Angularで開発してるわけではないので、利用するのはちょっと違和感が。

Nightwatch.jsは、全部メソッドチェーンでつなげる形で書くので、ブラウザ操作とアサーションがごっちゃになるのがちょっと見にくそう。
テストフレームワークは自分の好みで選びたい。

ということで残ったのがWebdriverIO。
ややドキュメントが少なそうなのと、★が比較的少ないのが懸念。
ProtractorかNightwatch.jsにしとけばよかったってなりそうではある。

むしろクロスブラウザを捨ててPuppeteerでもよかったかな…

<br>

[WebdriverIOの環境を構築した記事](https://www.kaitoy.xyz/2017/08/14/webdriverio-chrome/)を書いた。
