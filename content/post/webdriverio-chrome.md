+++
categories = ["x", "y"]
date = "2017-07-26T23:16:15+09:00"
draft = true
eyecatch = ""
slug = ""
tags = ["x", "y"]
title = "webdriverio chrome"

+++

とりあえずは、[WebdriverIO](http://webdriver.io/)、[WDIO](http://webdriver.io/guide/testrunner/gettingstarted.html)、[selenium-webdriver](https://github.com/vvo/selenium-standalone)、[Jasmine](https://jasmine.github.io/)と、Chromeのヘッドレスモードを使って、Dockerコンテナ([Alpine Linux](https://alpinelinux.org/))上でテストスクリプトを実行してServiceNowのログイン画面のスクリーンショットが取れるところまでできた。

ServiceNowは[Chrome、Firefox、IE、Edge、Safariをサポートしている](https://docs.servicenow.com/bundle/istanbul-release-notes/page/release-notes/servicenow-platform/generally-supported-browsers-rn.html)。
これらに対応するWebDriverはそろっているので、どれもSeleniumで操作できる。


テストフレームワークは[QUnit](https://qunitjs.com/)、Jasmine、[Mocha]()、[AVA]()、[Tape]()、[Jest]

[selenium-standalone](https://www.npmjs.com/package/selenium-standalone)

https://en.wikipedia.org/wiki/Capybara_(software)

[Chromy](http://qiita.com/devneko/items/9ac978965717d5513aa5)

[chromeOptions](https://stackoverflow.com/questions/42303119/selenium-webdriverio-chrome-headless)

[wdio.conf.jsのseleniumArgs](https://medium.com/@jlchereau/how-to-configure-webdrivier-io-with-selenium-standalone-and-additional-browsers-9369d38bc4d1)

[DockerでChrome Headless Browser](https://github.com/yukinying/chrome-headless-browser-docker)
[--no-sandbox](http://bufferings.hatenablog.com/entry/2017/05/03/181713)
[WebDriverIOサンプルコード](http://blog.asial.co.jp/1484)
