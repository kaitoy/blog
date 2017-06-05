+++
categories = [ "Programing" ]
date = "2017-01-24T09:01:49-07:00"
draft = true
eyecatch = "goslings-spring.png"
slug = "goslings-development-memo6"
tags = [ "goslings" ]
title = "Goslings開発メモ - その6: "
+++

[spring-resource-handling](https://github.com/bclozel/spring-resource-handling)を参考にプロジェクト構成をリファクタリング。
  

●client
・Yarn https://ics.media/entry/13838
node install -g yarn
yarn init
yarn add --dev webpack
yarn add --dev babel-core babel-loader babel-preset-es2015 babel-plugin-transform-regenerator babel-plugin-syntax-async-functions
yarn add babel-polyfill
yarn add --dev eslint-config-airbnb eslint eslint-plugin-jsx-a11y@^^^^2.2.3 eslint-plugin-import eslint-plugin-react eslint-loader eslint-import-resolver-webpack
https://github.com/evcohen/eslint-plugin-jsx-a11y/issues/116

yarn add vis
yarn add request

http://stackoverflow.com/questions/33001237/webpack-not-excluding-node-modules

  target: 'node',
  
yarn add --dev json-loader
https://github.com/mzabriskie/axios/issues/405


https://github.com/iriscouch/browser-request instead of https://github.com/request/request
yarn add browser-request

yarnはグローバルにインストールすると、パスの通ったディレクトリにyarnコマンドがインストールされる。
(npmやnpm_run_allと同じ場所)
ローカルにインストールすると、node_modules\.bin\にインストールされる。
コマンドはスクリプト(shとcmd)で、その中身はnode_modules内のyarn.jsをnodeで実行する。

●gradle-node-plugin
yarnは対応していない。
NpmTaskでyarnのインストールは簡単。
task yarnSetUp(type: NpmTask) {
  args = ['install', 'yarn']
}

Execタスクでyarnとやってもパスが通ってないのでだめ。
node_modules/.bin/yarnでもなぜかだめ。

NpmTaskのまねして、

task yarn(type: NodeTask, dependsOn: yarnSetUp) {
  script = file('node_modules/yarn/bin/yarn.js')
}

task build(type: NodeTask, dependsOn: yarn) {
  script = file('node_modules/yarn/bin/yarn.js')
  args = ['run', 'build']
}

としたら実行できた。けどyarnタスクの途中でハングする。

[3/4] Linking dependencies...

どうもこの辺りでyarnがnode_modulesを整理して、yarn自身を消してしまうからっぽい。

npm install --prefix .gradle yarn
みたいに、ビルド用yarnを別のところに置いてやってみた。
.gradle/node_modules/yarn/bin/yarn.js

なんかできた。
このままだと毎回yarnインストールが走るので、
.gradle/node_modules/yarn/bin/yarn.jsの存在をみてup-to-date
taskを編集した後の最初のビルドはかならずout-of-dateなので、outputs.upToDateWhen { true }にしてもup-to-dateにならないのにはまりかけた。
--infoつけるとup-to-date判定の理由がでるので、それをみればいい。
Executing task ':goslings-client:yarnSetup' (up-to-date check took 0.001 secs) due to:
  Task ':goslings-client:yarnSetup' additional action class path has changed from d88519ef2b8fd5d95c15a522bdcf3949 to abef6efc5e4cd8bf78f0f0194934c136.


これに遭遇。Gradle最新版3.2でもだめ。2.12にダウングレードするといいらしいけど、それはちょっと。
https://discuss.gradle.org/t/build-fails-with-unable-to-process-incoming-event-progresscomplete-progresscompleteevent/18434/27

  * What went wrong:
  Unable to process incoming event 'ProgressComplete ' (ProgressCompleteEvent)

Gradleがコンソール出力をうまく処理できないバグのようなので、出力をファイルにリダイレクトすればいいか。
gradle-node-pluginにそういうオプションがないようなので。と思ったらあった。

yarn-run-allとかいうクソパッケージが。これだからnpmは

・gradlewからclientのビルドしたとき、エラーを検出しない。
  eslint-loaderの[failOnError](https://github.com/MoOx/eslint-loader#failonerror-default-false)がデフォルトでfalseなのでwebpack.config.jsで明示的にtrueにしないといけない。
  [issues](https://github.com/webpack/webpack/issues/708)によると、ビルド中にエラーが起きてもexit codeが0。
  ついでにエラーが標準出力に出る。
  webpack-fail-pluginを使うとexit codeが1になる。
  もしくは、--bailを付けると、exit codeも1になり、標準エラー出力にエラーをはく。
  ただ最初のエラーで止まってしまう。これで妥協するしかないか。
  webpack2では--bailがデフォルトになる。
  ・yarnタスクなし版
      apply plugin: 'com.moowork.node'

      node {
        version = nodeVer
        download = true
      }

      def logsDir = file 'logs'
      def log = new File(logsDir, 'build.log')
      def errLog = new File(logsDir, 'build.err.log')
      def lsep = System.properties['line.separator']
      def cacheDirPath = '.gradle'
      def buildDir = file 'dist'
      def nodeModsDir = file 'node_modules'

      if (!logsDir.exists()) {
        logsDir.mkdir()
      }
      else {
        delete log
        delete errLog
      }

      task yarnSetup(type: NpmTask) {
        def yarnDirPath = cacheDirPath + '/yarn'
        description "Install Yarn into ${yarnDirPath} directory."
        args = ['install', '--prefix', yarnDirPath, "yarn@${yarnVer}"]
        execOverrides {
          it.standardOutput = new FileOutputStream(log, true)
          it.errorOutput = new FileOutputStream(errLog, true)
        }
        outputs.file "${yarnDirPath}/node_modules/yarn/bin/yarn.js"

        doFirst { log << "### ${name} ###${lsep}" }
      }

      task yarn(type: NodeTask, dependsOn: yarnSetup) {
        description 'Run yarn command to install dependencies.'
        script = yarnSetup.outputs.files.singleFile
        execOverrides {
          it.standardOutput = new FileOutputStream(log, true)
          it.errorOutput = new FileOutputStream(errLog, true)
        }
        inputs.file 'package.json'
        inputs.file 'yarn.lock'
        outputs.dir nodeModsDir

        doFirst { log << "### ${name} ###${lsep}" }
      }

      task build(type: NodeTask, dependsOn: yarn) {
        description "Build ${project.name}."
        script = yarnSetup.outputs.files.singleFile
        args = ['run', devBuild ? 'devBuild' : 'build']
        execOverrides {
          it.standardOutput = new FileOutputStream(log, true)
    //      it.errorOutput = new FileOutputStream(errLog, true)
        }
        inputs.property 'devBuild', devBuild
        inputs.dir nodeModsDir
        inputs.dir 'src'
        inputs.file 'package.json'
        inputs.file 'webpack.config.js'
        outputs.dir buildDir

        doFirst { log << "### ${name} ###${lsep}" }
      }
  ・yarnタスク使う版
●async/await
http://qiita.com/gaogao_9/items/5417d01b4641357900c7
これいい。例外処理版の
http://qiita.com/gaogao_9/items/40babdf63c73a491acbb
もいい。


http://masnun.com/2015/11/11/using-es7-asyncawait-today-with-babel.html
ちょっと古いので見直し
https://babeljs.io/docs/plugins/transform-async-to-generator/
に書いてあることと違うし。
polyfillは要ることを確認。

awaitはasyncの中でしか使えない。
async関数のreturnはPromiseでラップされる。 https://ponyfoo.com/articles/understanding-javascript-async-await
awaitはPromiseに対して使い、Promiseのresolveかrejectを待つ。
戻り値はresolveかrejectに渡した値になる。つまり、戻り値をチェックしてエラー戻り値かどうか見る、原始的でアドホックなコードになる。

async関数のエラーをcatchするブロックでconsole.error()したら、
FireFoxで「Unhandled promise rejection TypeError: dbg is undefined」というエラー。
FireBugを起動しているとだけおきて、他のブラウザではおきない。
http://stackoverflow.com/questions/27184191/typeerror-dbg-is-undefined-in-angularjs
によるとFireFoxを閉じてC:\Users\Leonardo\AppData\Roaming\Mozilla\Firefox\Profiles\Leonardo.Serni\firebug
を消すと直るらしいが効果なし。FireBugのバグだろうか。無視する。

●material
[Bootstrap](http://getbootstrap.com/)はjQuery
[Materialize](http://materializecss.com/)はjQuery
[Material-UI](http://www.material-ui.com/#/)はReact
[MUI](https://www.muicss.com/)はNPMモジュールなし
ということで[Material Design Lite](https://getmdl.io/)に。
yarn add material-design-lite

●xhrキャッシュ
http://stackoverflow.com/questions/13783442/how-to-tell-if-an-xmlhttprequest-hit-the-browser-cache
http://qiita.com/hkusu/items/d40aa8a70bacd2015dfa
ETagかLast-Modified+Cache-Control+Expiresをサーバから送って、
クライアントがIf-Modified-Since、If-None-Matchを送ってきたらチェックして304返せばよい。
クライアントはこれらを明示的に送らなくていい。ブラウザが勝手につけてくれる
と思ったら、FireFoxはLast-Modified送ってもIf-Modified-Since送ってこない。なぜだ。Chromeは送ってくれる。
昔そういうバグがあったみたいだけど、修正されているはずなんだけど。
まあ明示的に送ればいいか。

●AWS
AWSのサービスは[「AWS is 何」を3行でまとめてみるよ](http://qiita.com/kohashi/items/1bb952313fb695f12577)が分かり易し。
ストレージはhttp://stackoverflow.com/questions/29575877/aws-efs-vs-ebs-vs-s3-differences-when-to-use
によるとEBSか。
AWSアカウントを作ったらとりあえず、[AWSアカウントを取得したら速攻でやっておくべき初期設定まとめ](http://qiita.com/tmknom/items/303db2d1d928db720888)

kaitoy
EMNqgZ6Z2vtGgh@c^C6G
https://416809159528.signin.aws.amazon.com/console 

[AWS EC2を使って無料枠でWebサーバを立ててみた（2015年12月版）](http://sil.hatenablog.com/entry/aws-ec2-free-webserver)を参考にEC2のインスタンスを作る。
まずはAMIの選択。無料利用枠のみでフィルタリングして、Amazon Linux AMI 2016.09.0 (HVM), SSD Volume Type - ami-5ec1673e
を選択。
インスタンスタイプは無料枠のはt2.microだけ。1CPU、メモリ1GB、EBS、ネットワークパフォーマンスは低から中
インスタンス詳細の設定は全部デフォルト。(ネットワークはデフォルトのVPCのもの、自動割り当てパブリックIPは有効化、IAMロールはなし、シャットダウン動作は停止、テナンシーは共有。
ストレージの追加もデフォルトのまま。(汎用SSD(GP2)、8GB)因みにEBSの無料枠は汎用SSDかマグネティック30GB。
セキュリティーグループの設定ではファイアウォールの設定ができる。デフォルトではSSHしか空いてないので、HTTPを追加。

ちょっと待つとサーバが立ち上がるので、SSH(TeraTerminal)で接続。
ホスト名はec2-54-214-172-192.us-west-2.compute.amazonaws.com。ユーザ名はec2-user
インスタンス作成中にダウンロードした秘密鍵を指定。
あとは適当にセットアップして、Goslingsサーバをデーモンとして起動しておけばいいか。

WinSCPでjar送ろうとしたら、秘密鍵の形式がサポートされてないといわれたので、
DockerHubにコンテナおいてダウンロードするか。

[Docker Hub](https://hub.docker.com/)に行って、ログインして、上のツールバーの「Create」から「Create Automated Build」を選択。
初回はGitHubかBitbucketのアカウントとのリンクを設定する。GitHubとのリンクを設定。GitHubへのアクセス権は推奨の「Public and Private」を与える。
OAuthの認証があって、リンクできたら、もう一回「Create Automated Build」を選択して、goslingsのリポジトリのAutomated Buildを作る。
あとはGitHubのgoslingsリポジトリにDockerfileをpushしてやればできる。
できたのがhttps://hub.docker.com/r/kaitoy/goslings/

ECS
ECS始める時にEC2のインスタンスも作るっポイので、さっき作ったのは消す。
Amazon EC2 Container Service (ECS)の「今すぐ始める」のボタンで開くウィザードはなんだかよく分からないのですぐキャンセル。
普通の管理画面に行くので、まずはクラスターを作る。
t2.microのインスタンスひとつで、EBSボリュームは22GB(デフォルトにして下限)
セキュリティグループやVPCやキーペアはさっき作ったのを再利用。
IAMユーザだとCloudFormationの定義作成に失敗したので、rootでやった。

タスク定義は、docker run -p 80:80 -v /goslings-repos:/repos -itd kaitoy/goslings 80 /goslings-repos https://github.com/kaitoy/
-vのところは、まずはボリュームの定義(ホストのパス)を作って、コンテナの定義でそれを/reposにマッピングする感じ。 
コマンドは「80 /goslings-repos https://github.com/kaitoy/」や「["80", "/goslings-repos", "https://github.com/kaitoy/"]」はだめ。
テキストエリアだったので、一引数一行でやってもだめ
80,/goslings-repos,https://github.com/kaitoy でok
因みに、EC2インスタンスにログインして、docker ps --no-truncでCOMMANDのとこみればいい。
docker exec -it <コンテナ名> bashで入ることもできる。

[docker logs で表示されるログの保存場所とローテート方法](http://qiita.com/tily/items/adb433505da6c7812725)

作ったタスク定義をつかって、さっきつくったクラスタでタスクを実行。
http://ec2-54-201-203-87.us-west-2.compute.amazonaws.com/

[無料のドメインを取得する（2016年10月）](http://qiita.com/teekay/items/135dc67e39f24997019e)に従って、
[Freenom](http://www.freenom.com/ja/index.html)でgoslings.tkドメインを無料で取得。
さらにFreenomの無料ネームサーバを利用し、wwwをEC2のホスト名にCNAME。
