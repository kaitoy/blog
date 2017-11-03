+++
categories = [ "Programing" ]
date = "2017-08-14T10:53:17+09:00"
draft = false
eyecatch = "servicenow-webdriverio.png"
slug = "webdriverio-chrome"
tags = [ "servicenow", "selenium", "webdriverio", "docker" ]
title = "WebdriverIOとChromeのヘッドレスモードで自動ブラウザテストするDockerイメージ: webdriverio-chrome"
+++

「[2017年夏、ブラウザテストフレームワーク](https://www.kaitoy.xyz/2017/08/04/browser-test-framework/)」の続き。
[ServiceNow](https://www.servicenow.com/ja)アプリケーションのブラウザテストをしたくて色々調べている。
前回は、フレームワークに[WebdriverIO](http://webdriver.io/)を使うと決めたところまで書いた。

今回、最終的に、[WebdriverIO](http://webdriver.io/)、[WDIO](http://webdriver.io/guide/testrunner/gettingstarted.html)、[selenium-standalone](https://github.com/vvo/selenium-standalone)、[Jasmine](https://jasmine.github.io/)と、Chromeのヘッドレスモードを使って、Dockerコンテナ([Alpine Linux](https://alpinelinux.org/))上でテストスクリプトを実行して、ServiceNowのログイン画面のスクリーンショットが取れるところまでできた。

そのコンテナイメージのDockerfileは[GitHubに置いた](https://github.com/kaitoy/webdriverio-chrome)。

{{< google-adsense >}}

## とりあえずAlpine Linux

テスト環境の作成は自宅でやってるけど、DockerイメージにしてDocker Hubとかに上げておけば、社内でダウンロードしてそのまま再現できる。
ダウンロードに係る社内手続きも、Dockerイメージだけに対してやればいいので、中に何を詰め込んでも、後でライブラリとか追加しても、一回こっきりで済む。

というわけでWebdriverIO環境をDockerコンテナとしてつくることにする。
とりあえず、自PC(Windows 10 Home x64)に入ってるVMware Workstation Player 12.5.5でCentOS 7 x64のVMを作り、そこにDockerをインストールした。

次に、そのDockerを使って、WebdriverIO環境のベースにするAlpine Linuxをpullする。

```cmd
$ docker pull alpine:edge
```

<br>

Alpine Linuxは[BusyBox](https://busybox.net/)と[musl libc](https://www.musl-libc.org/)で構成された軽量な Linuxディストリビューション。
2016年2月に[すべてのオフィシャルDockerイメージがAlpine Linuxベースになる](https://www.brianchristner.io/docker-is-moving-to-alpine-linux/)というアナウンスがあったし、他にそれっぽいものもなかったので、これをベースに環境を作ることにした。
[glibc](https://www.gnu.org/software/libc/)じゃないのがちょっと気になるけど、まあ問題ないか。

現在、[Chrome 59](https://pkgs.alpinelinux.org/package/edge/community/x86_64/chromium)のAlpine Linuxパッケージはedgeブランチ(i.e. 開発ブランチ)でしか作られていない。
pullするタグをedgeにしたのはそのため。
(因みに現時点でAlpine Linuxのlatestは3.6。)

で、起動。

```cmd
$ docker run -it alpine:edge sh
```

## Chrome(Chromium)インストール
まずはChrome(がAlpine Linuxパッケージにはないので、実際にはChromium)と、ついでにChromeDriverをインストールする。
Alpine Linux独自のパッケージマネージャーである[apk](https://wiki.alpinelinux.org/wiki/Alpine_Linux_package_management)を使う。

```cmd
/ # apk add --update chromium chromium-chromedriver
/ # chromium-browser -version
Chromium 59.0.3071.115
```

無事インストールできた。

<br>

[この記事](http://bufferings.hatenablog.com/entry/2017/05/03/181713)を参考にヘッドレスモードで実行してみる。
ヘッドレスモードにするために`--headless`を付けて、一時的な制限事項で`--disable-gpu`を付ける必要があって、コンテナの権限不足を回避するために`--no-sandbox`を付ける。
(コンテナの権限不足回避には他に、`docker run`に`--privileged`や`--cap-add=SYS_ADMIN`付ける[方法がある](https://github.com/yukinying/chrome-headless-browser-docker)。)

```cmd
/ # chromium-browser --headless --no-sandbox --disable-gpu https://example.com/
[0811/145902.894023:WARNING:dns_config_service_posix.cc(326)] Failed to read DnsConfig.
[0811/145902.906137:FATAL:udev_loader.cc(38)] Check failed: false.
Received signal 6
  r8: 0000000000000061  r9: 00007fe3fe01c066 r10: 0000000000000008 r11: 0000000000000246
 r12: 00007fe3fe01bed0 r13: 00007fe3fe01be80 r14: 0000000000000000 r15: 0000000000000000
  di: 0000000000000002  si: 00007fe3fe01bda0  bp: 00007fe3fe01bda0  bx: 0000000000000006
  dx: 0000000000000000  ax: 0000000000000000  cx: ffffffffffffffff  sp: 00007fe3fe01bd88
  ip: 00007fe412a2f769 efl: 0000000000000246 cgf: 0000000000000033 erf: 0000000000000000
 trp: 0000000000000000 msk: 0000000000000000 cr2: 0000000000000000
[end of stack trace]
Calling _exit(1). Core file will not be generated.
```

エラーになった。

最初のWARNINGは置いといて、FATALのほうは、udev_loader.ccというのでエラーになってる。

エラーメッセージでググったら、[Qiitaに同じエラーを解決している記事](http://qiita.com/dd511805/items/dfe03c5486bf1421875a)が。
よくわからないが、[udev](https://pkgs.alpinelinux.org/package/v3.5/main/x86_64/udev)と[ttf-freefont](https://pkgs.alpinelinux.org/package/v3.6/main/x86_64/ttf-freefont)を入れればいいらしい。
深く考えずにそれに従うことにする。

```cmd
/ # apk add udev ttf-freefont
```

<br>

で、再度実行。
(ちゃんと動いてるか分かりやすくするために`--dump-dom`も付けた。)

```cmd
/ # chromium-browser --headless --no-sandbox --disable-gpu --dump-dom https://example.com/
[0811/151303.698629:WARNING:dns_config_service_posix.cc(326)] Failed to read DnsConfig.
<body>
<div>
    <h1>Example Domain</h1>
    <p>This domain is established to be used for illustrative examples in documents. You may use this
    domain in examples without prior coordination or asking for permission.</p>
    <p><a href="http://www.iana.org/domains/example">More information...</a></p>
</div>


</body>
```

動いた!

## フォント追加
前節で参考にした[Qiitaの記事](http://qiita.com/dd511805/items/dfe03c5486bf1421875a)に、文字化け対策としてフォントを追加する手順も書いてあったのでそれもやる。

まず試しに、何もしないでスクリーンショットを撮ってみる。
`--screenshot`オプションで。

```cmd
/ # chromium-browser --headless --no-sandbox --disable-gpu --screenshot https://www.google.co.jp/
```

するとやはり文字化けしている。

![garblings.png](/images/webdriverio-chrome/garblings.png)

<br>

[Google Noto Fonts](https://www.google.com/get/noto/)を入れて対応する。
(因みにNotoはNo Tofuの略で、文字化けした時に出る、クエスチョンマークが乗った豆腐の撲滅を目指して開発されたフォント。)

```cmd
/ # apk add curl
/ # cd /tmp/
/tmp # curl https://noto-website.storage.googleapis.com/pkgs/NotoSansCJKjp-hinte
/tmp # unzip NotoSansCJKjp-hinted.zip
/tmp # mkdir -p /usr/share/fonts/noto
/tmp # cp *.otf /usr/share/fonts/noto
/tmp # chmod 644 -R /usr/share/fonts/noto/
/tmp # fc-cache -fv
```

後半に実行してるコマンドの詳細はよくわからないが、文字化けは直った。

![garblings_fixed.png](/images/webdriverio-chrome/garblings_fixed.png)

## WebdriverIOインストール
次にWebdriverIOをインストールする。
[Yarn](https://yarnpkg.com/lang/en/)でインストールして[Node.js](https://nodejs.org/ja/)で動かすので、まずそれらをapkで入れる。

```cmd
/tmp # apk add nodejs yarn
```

<br>

で、プロジェクトを作ってWebdriverIOを追加。

```cmd
/tmp # mkdir /root/webdriverio-chrome
/tmp # cd /root/webdriverio-chrome
~/webdriverio-chrome # yarn init
~/webdriverio-chrome # yarn add webdriverio --dev
```

<br>

package.jsonのscriptsを編集して、WebdriverIO付属のテストランナであるWDIOを使えるようにする。

package.json:

```json
{
  "name": "webdriverio-chrome",
  "version": "0.0.1",
  "description": "Browser test stack with WebdriverIO and headless Chrome",
  "scripts": {
    "test": "wdio"
  },
  "author": "Kaito Yamada",
  "license": "MIT",
  "devDependencies": {
    "webdriverio": "^4.8.0"
  }
}
```

## WDIOの設定ファイル生成
[WDIOのconfigコマンド](http://webdriver.io/guide/testrunner/gettingstarted.html)でWDIO Configuration Helperを起動し、設定ファイルwdio.conf.jsをインタラクティブに生成する。

```cmd
~/webdriverio-chrome # yarn test -- config
yarn test v0.27.5
$ wdio "config"

=========================
WDIO Configuration Helper
=========================

? Where do you want to execute your tests? On my local machine
? Which framework do you want to use? jasmine
? Shall I install the framework adapter for you? No
? Where are your test specs located? ./test/specs/**/*.js
? Which reporter do you want to use?  spec - https://github.com/webdriverio/wdio-spec-reporter
? Shall I install the reporter library for you? No
? Do you want to add a service to your test setup?  selenium-standalone - https://github.com/webdriverio/wdio-selenium-standalone-service
? Shall I install the services for you? No
? Level of logging verbosity verbose
? In which directory should screenshots gets saved if a command fails? ./errorShots/
? What is the base url? http://localhost

Configuration file was created successfully!
To run your tests, execute:

$ wdio wdio.conf.js

Done in 53.58s.
```

<br>

WDIO Configuration Helperで、テストフレームワークは[Mocha](https://mochajs.org/)か[Jasmine](https://jasmine.github.io/)か[Cucumber](https://cucumber.io/)から[選択できる](http://webdriver.io/guide/testrunner/frameworks.html)。
ServiceNowのテストフレームワーク(ATF)がJasmine使ってるので、一応それに合わせてJasmineにした。
ATFは今のところ使うつもりはないけど。

レポータ(標準出力へテスト結果を出力するコンポーネント)は妙に色々ある中から、雰囲気で[spec](http://webdriver.io/guide/reporters/spec.html)を選択。

サービス(テスト実行に必要な準備などをしてくれるコンポーネント)には[selenium-standalone](http://webdriver.io/guide/services/selenium-standalone.html)を選択。
こいつは、テスト実行前に、npmパッケージの[selenium-standalone](https://www.npmjs.com/package/selenium-standalone)を使って[Selenium Server](http://docs.seleniumhq.org/download/)をダウンロードして起動したり、WebDriverをセットアップしてくれたりする。

因みにサービスには他に、[browserstack](http://webdriver.io/guide/services/browserstack.html)とか[appium](http://webdriver.io/guide/services/appium.html)とか[phantomjs](http://webdriver.io/guide/services/phantomjs.html)とかがある。

`Shall I install …`という質問には全てnoで回答した。
でないとWDIOがnpm installしようとして、npmが無くて以下のようなエラーになるので。
(apkでは、npmは[nodejs](https://pkgs.alpinelinux.org/package/edge/main/x86_64/nodejs)パッケージに入ってなくて、[nodejs-npm](https://pkgs.alpinelinux.org/package/edge/main/x86_64/nodejs-npm)に入ってる。)

```
Installing wdio packages:
/root/webdriverio-chrome/node_modules/webdriverio/build/lib/cli.js:278
                    throw err;
                    ^

Error: Command failed: npm i -D wdio-jasmine-framework
/bin/sh: npm: not found

    at ChildProcess.exithandler (child_process.js:204:12)
    at emitTwo (events.js:106:13)
    at ChildProcess.emit (events.js:191:7)
    at maybeClose (internal/child_process.js:891:16)
    at Socket.<anonymous> (internal/child_process.js:342:11)
    at emitOne (events.js:96:13)
    at Socket.emit (events.js:188:7)
    at Pipe._handle.close [as _onclose] (net.js:497:12)
error Command failed with exit code 1.
```

生成された設定ファイルは以下の感じ。(コメントは省略してる。)

wdio.conf.js:

```javascript
exports.config = {
    specs: [
        './test/specs/**/*.js'
    ],
    exclude: [
        // 'path/to/excluded/files'
    ],
    maxInstances: 10,
    capabilities: [{
        maxInstances: 5,
        browserName: 'firefox',
    }],

    sync: true,
    logLevel: 'verbose',
    coloredLogs: true,
    bail: 0,
    screenshotPath: './errorShots/',
    baseUrl: 'http://localhost',
    waitforTimeout: 10000,
    connectionRetryTimeout: 90000,
    connectionRetryCount: 3,

    services: ['selenium-standalone'],

    framework: 'jasmine',
    reporters: ['spec'],
    jasmineNodeOpts: {
        defaultTimeoutInterval: 50000,
        expectationResultHandler: function(passed, assertion) {
            // do something
        }
    },
}
```

<br>

## npmパッケージとJava追加
WDIO Configuration Helperの`Shall I install …`でnoした分は自分でインストールしておく。

```cmd
~/webdriverio-chrome # yarn add wdio-jasmine-framework wdio-spec-reporter wdio-selenium-standalone-service selenium-standalone --dev
```

したらエラー。

```text
error /root/webdriverio-chrome/node_modules/fibers: Command failed.
Exit code: 127
Command: sh
Arguments: -c node build.js || nodejs build.js
Directory: /root/webdriverio-chrome/node_modules/fibers
Output:
`linux-x64-48` exists; testing
Problem with the binary; manual build incoming
node-gyp not found! Please ensure node-gyp is in your PATH--
Try running: `sudo npm install -g node-gyp`
sh: nodejs: not found
spawn node-gyp ENOENT
info Visit https://yarnpkg.com/en/docs/cli/add for documentation about this command.
```

[node-gyp](https://github.com/nodejs/node-gyp)が無いと。
では追加する。

```cmd
~/webdriverio-chrome # yarn global add node-gyp
```

node-gypのREADME.md読むと、PythonとmakeとC/C++コンパイラが要るとあるので、それも入れる。

```cmd
~/webdriverio-chrome # apk add python make gcc g++
```

<br>

で、再度、

```cmd
~/webdriverio-chrome # yarn add wdio-jasmine-framework wdio-spec-reporter wdio-selenium-standalone-service selenium-standalone --dev
```

したら入った。

<br>

あと、Selenium ServerがJavaで動くので、Javaも入れておく。

```cmd
~/webdriverio-chrome # apk add openjdk8
```

## wdio.conf.jsの修正
生成されたwdio.conf.jsはFirefoxを使うようになっているなどの問題があるので修正する。
参考にしたのは[Stack Overflowの回答](https://stackoverflow.com/questions/42303119/selenium-webdriverio-chrome-headless)。

```javascript
     capabilities: [{
     maxInstances: 5,
-        browserName: 'firefox'
+        browserName: 'chrome',
+        chromeOptions: {
+            binary: '/usr/bin/chromium-browser',
+            args: [
+                'headless',
+                'disable-gpu',
+                'no-sandbox',
+            ],
+        },
     }],
```

`browserName`を`firefox`から`chrome`に変えて、ヘッドレスモードで動かすためのオプションを指定している。
また、普通のChromeとは実行ファイルの名前が違うので、`binary`で指定している。

## テスト作成と実行
テストはとりあえず[この記事](http://blog.asial.co.jp/1484)を参考に以下のようなものを書いた。

test-sample.js:

```javascript
describe('Sample', function() {
    it("takes a screenshot of www.google.co.jp", function() {
        browser.url('https://www.google.co.jp/');
        browser.saveScreenshot('./screenshots/google.png');
    });
});
```

これを実行すると、`https://www.google.co.jp/`をブラウザで開いて、スクリーンショットを撮る。

<br>

これを`~/webdriverio-chrome/test/specs/`において、

```cmd
~/webdriverio-chrome # yarn test
```

でテスト実行。
したらエラー。

```cmd
~/webdriverio-chrome # yarn test
yarn test v0.27.5
$ wdio
[06:43:04]  COMMAND     POST     "/wd/hub/session"
[06:43:04]  DATA                {"desiredCapabilities":{"javascriptEnabled":true,"locationContextEnabled":true,"handlesAlerts":true,"rotatable":true,"maxInstances":5,"browserName":"chrome","chromeOptions":{"binary":"/usr/bin/chromium-browser","args":["headless","disable-gpu","no-sandbox"]},"loggingPrefs":{"browser":"ALL","driver":"ALL"},"requestOrigins":{"url":"http://webdriver.io","version":"4.6.2","name":"webdriverio"}}}
ERROR: An unknown server-side error occurred while processing the command. (UnknownError:13)
chrome
Error: An unknown server-side error occurred while processing the command. (UnknownError:13)

error Command failed with exit code 1.
```

サーバサイドでよくわからないエラーが起きたとのこと。

<br>

試しに手動でSelenium Serverを起動してみる。

```cmd
~/webdriverio-chrome # node ./node_modules/.bin/selenium-standalone start
```

正常に起動する。

ChromeDriverはどうか。

```cmd
~/webdriverio-chrome # /usr/bin/chromedriver
```

これも起動する。はて。

<br>

[wdio-selenium-standalone-serviceのソース](https://github.com/webdriverio/wdio-selenium-standalone-service/blob/v0.0.9/lib/launcher.js)を見てみたら、selenium-standaloneの`install`を呼んでいた。
これはSelenium ServerとChromeDriverをダウンロードする機能だ。
コンテナ内を確認したら、`node_modules/selenium-standalone/.selenium/chromedrive
r/2.31-x64-chromedriver`というのが出来てた。
これがselenium-standaloneがダウンロードしたChromeDriverだろうが、Apline Linux用ではないので、`ldd`してやるとたくさんエラーが出る。
selenium-standaloneがこれを実行しようとしたせいでテスト実行がエラーになったんだろう。

[Mediumの記事](https://medium.com/@jlchereau/how-to-configure-webdrivier-io-with-selenium-standalone-and-additional-browsers-9369d38bc4d1)などを参考にして、wdio.conf.jsを以下のように修正して、ChromeDriverのバイナリを指定してやったら動いた。

```javascript
     services: ['selenium-standalone'],
+    seleniumArgs: {
+        javaArgs: [
+            '-Dwebdriver.chrome.driver=/usr/bin/chromedriver'
+        ]
+    },
```

## プロキシ対策
社内で使うには、ベーシック認証付きのプロキシを突破しないといけない。

今回作った環境をクールな図にするとこんな↓感じ。

![internet_accesses.png](/images/webdriverio-chrome/internet_accesses.png)

<br>

なので、二か所あるインターネッツアクセスをプロキシ対応させる必要がある。
図の左のアクセスについては、[wdio-selenium-standalone-serviceのソース](https://github.com/webdriverio/wdio-selenium-standalone-service/blob/master/lib/launcher.js)を見たりして、wdio.conf.jsを次のように修正すればいいことが分かった。

```javascript
     services: ['selenium-standalone'],
     seleniumArgs: {
         javaArgs: [
             '-Dwebdriver.chrome.driver=/usr/bin/chromedriver',
         ],
     },
+    seleniumInstallArgs: {
+        proxy: 'http://userId:password@proxy.com:8080',
+    },
```

<br>

図の右のアクセスについては、プロキシのベーシック認証のクレデンシャルを指定するオプションがChromeにないので、[proxy-login-automator](https://github.com/sjitech/proxy-login-automator)を使うことにして、wdio.conf.jsには次のように追記しておく。

```javascript
         chromeOptions: {
             binary: '/usr/bin/chromium-browser',
             args: [
                 'headless',
                 'disable-gpu',
                 'no-sandbox',
+                'proxy-server=localhost:18080',
             ],
         },
```

<br>

これで、テスト実行前に、以下みたいにproxy-login-automatorを起動しておけばいい。

```cmd
~/webdriverio-chrome # node node_modules/.bin/proxy-login-automator.js -local_port 18080 -remote_host proxy.com -remote_port 8080 -usr userId -pwd password`
```

## まとめ
以上の操作をまとめたDockerfileが以下。

```dockerfile
From alpine:edge

ADD package.json wdio.conf.js yarn.lock test-sample.js /root/webdriverio-chrome/

RUN apk add --update --no-cache \
            udev \
            ttf-freefont \
            chromium \
            chromium-chromedriver \
            openjdk8 \
            nodejs \
            yarn \
            make gcc g++ python \
            curl && \
    cd /tmp && \
    curl https://noto-website.storage.googleapis.com/pkgs/NotoSansCJKjp-hinted.zip -O && \
    unzip NotoSansCJKjp-hinted.zip && \
    mkdir -p /usr/share/fonts/noto && \
    cp *.otf /usr/share/fonts/noto && \
    chmod 644 -R /usr/share/fonts/noto/ && \
    fc-cache -fv && \
    cd /root/webdriverio-chrome/ && \
    yarn global add node-gyp && \
    yarn && \
    mkdir -p test/specs && \
    mv test-sample.js test/specs/ && \
    mkdir screenshots && \
    yarn global remove node-gyp && \
    rm -rf /root/.node-gyp && \
    rm -rf /tmp/* && \
    yarn cache clean && \
    apk del --purge make gcc g++ python curl

WORKDIR /root/webdriverio-chrome
```

できるイメージを小さくするため、レイヤを減らしたり、ビルド用パッケージを消したりしてる。
[Multi-Stage build](http://qiita.com/minamijoyo/items/711704e85b45ff5d6405)が[Docker Hub](https://hub.docker.com/)のAutomated Buildで[もうすぐサポートされる](https://github.com/docker/hub-feedback/issues/1039)ので、そしたらもう少しきれいに書き直せるはず。

(後日書き直して[きれいになった](https://github.com/kaitoy/webdriverio-chrome/blob/master/Dockerfile)。)

<br>

最終的なpackage.jsonは[これ](https://github.com/kaitoy/webdriverio-chrome/blob/v0.0.3/package.json)。
wdio.conf.jsは[これ](https://github.com/kaitoy/webdriverio-chrome/blob/v0.0.3/wdio.conf.js)。
