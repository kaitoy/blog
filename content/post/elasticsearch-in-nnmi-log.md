+++
categories = [ "Programing" ]
date = "2017-04-04T09:24:12+09:00"
draft = false
eyecatch = "logo-elastic.png"
slug = "elasticsearch-in-nnmi-log"
tags = [ "elasticsearch", "logstash", "filebeat" ]
title = "Elasticsearch、Logstash、Filebeat、elasticsearch-headでログを見てみた"
+++

[NNMi](http://www8.hp.com/jp/ja/software-solutions/network-node-manager-i-network-management-software/)ログを[Filebeat](https://www.elastic.co/jp/products/beats/filebeat)で集めて[Logstash](https://www.elastic.co/jp/products/logstash)で構造化して[Elasticsearch](https://www.elastic.co/jp/products/elasticsearch)に入れて[elasticsearch-head](https://mobz.github.io/elasticsearch-head/)で見てみたけど、ログ量が少なかったせいかあんまり恩恵が感じられなかった話。

{{< google-adsense >}}

# Elasticsearchとは
Elasticsearchは[Elastic社](https://www.elastic.co/)が開発している[Elastic Stack](https://www.elastic.co/products)(旧ELK Stack)というオープンソースなデータ収集分析ツール群のコア製品。
内部で[Lucene](https://lucene.apache.org/core/)を使っていて、そのためJava製。
「分散型RESTful検索/分析エンジン」と自称しているが、スキーマレスでNoSQLなドキュメント指向分散データベース管理システムとも見れる。

Elasticsearchインスタンスはノードと呼ばれ、単一または複数のノードによるシステムはクラスタと呼ばれる。
同一ネットワークに複数のノードを立ち上げると自動で相互検出してクラスタを構成してくれ、そこにデータを入れると自動で冗長化して分散配置してくれるので、堅牢でレジリエントでスケーラブルなシステムが簡単に構築できる。

Elasticsearchが管理するデータの最小単位はドキュメントと呼ばれ、これはひとつのJSONオブジェクトで、RDBにおける行にあたる。
つまり、JSONオブジェクトの各フィールドがRDBにおける列にあたる。
同種のドキュメントの集まりはインデックスと呼ばれ、これはRDBにおけるテーブルにあたる。
テーブルのスキーマにあたるものはマッピングと呼ばれ、ドキュメントのフィールドの型情報(e.g. string, integer)などを含み、Elasticsearchが自動で生成してくれる。(指定もできる、というかすべきらしい。)
インデックス内ではさらにタイプという属性でドキュメントをカテゴライズできる、が、マニュアルからはタイプはあまり[使ってほしくない](https://www.elastic.co/guide/en/elasticsearch/reference/5.2/general-recommendations.html#_avoid_types)雰囲気が感じられる。

因みに、インデックスがRDBのデータベースでタイプがRDBのテーブルと説明されることもあるが、これは古いたとえで、[公式が間違いだったとしている](https://www.elastic.co/blog/index-vs-type)ので忘れてあげたい。

インデックスは分散処理のために分割でき、分割した各部分はシャードと呼ばれる。
シャードを冗長化のためにコピーしたものはレプリカシャードと呼ばれ、レプリカシャードにより成るインデックスはレプリカと呼ばれる。
デフォルトでは、ひとつのインデックスは5つのシャードに分割され、1つのレプリカが作成される。

インターフェースはREST APIだけ。
REST APIに検索したいドキュメントを投げると、ドキュメントのフィールド毎に自動で形態素解析とかして[転置インデックス](https://ja.wikipedia.org/wiki/%E8%BB%A2%E7%BD%AE%E3%82%A4%E3%83%B3%E3%83%87%E3%83%83%E3%82%AF%E3%82%B9)作って保管してくれる。
検索もJSONで表現したクエリをREST APIに投げることで結果をJSONで受け取ることができる。
検索は転置インデックスや分散処理のおかげで速く、また[スコアリング](http://qiita.com/r4-keisuke/items/d653d26b6fc8b7955c05#%E3%82%B9%E3%82%B3%E3%82%A2%E3%83%AA%E3%83%B3%E3%82%B0)によってより適切な結果が得られるようになっている。

今回使ったのはv5.2.1。

# Logstashとは
LogstashはElastic Stackに含まれる製品で、データ収集エンジンであり、データの受け取り、解析/加工、出力の三つの機能を持つリアルタイムパイプラインを構成する。
この三つの機能はそれぞれ[インプットプラグイン](https://www.elastic.co/guide/en/logstash/5.2/input-plugins.html)、[フィルタプラグイン](https://www.elastic.co/guide/en/logstash/5.2/filter-plugins.html)、[アウトプットプラグイン](https://www.elastic.co/guide/en/logstash/5.2/output-plugins.html)で提供されていて、プラグインの組み合わせにより様々なパイプラインを構成できる。

インプットプラグインは単位データ(一回分のログなど)を受け取り、タイムスタンプなどのメタデータを付けたりパースしたりしてイベントを生成し、パイプラインに流す。
フィルタプラグインはインプットプラグインからイベントを受け取り、設定されたルールに従って情報を拡充したり変更したり構造化したり秘匿情報を消したりしてアウトプットプラグインに渡す。
アウトプットプラグインは指定されたディスク上のパスやデータベースやアプリやサービスにイベントを書き込んだり送信したりする。

名前の通りもともとログ収集ツールだったが、今では様々なデータに対応していて、テキストログファイルの他にsyslog、HTTPリクエストやJDBCなんかの入力を受けることもできる。

Ruby(とJava)で書かれている。

今回使ったのはv5.2.2で、プラグインは以下を使った。

* インプット: [beats](https://www.elastic.co/guide/en/logstash/5.2/plugins-inputs-beats.html) 3.1.12: Beats(後述)からデータを受け取るプラグイン。[Lumberjack](https://github.com/logstash-plugins/logstash-input-beats/blob/v3.1.12/PROTOCOL.md)というElastic社が開発しているプロトコルを使い、TCPネットワーク上でデータを受信する。
* フィルタ: [grok](https://www.elastic.co/guide/en/logstash/5.2/plugins-filters-grok.html) 3.3.1: 正規表現でパターンマッチして非構造化データを構造化するプラグイン。ログ解析の定番で、例えば、ログからタイムスタンプ、クラス名、ログメッセージを抽出したりする。[組み込みのパターン](https://github.com/logstash-plugins/logstash-patterns-core/tree/master/patterns)が120個くらいあり、[Apache HTTP Server](https://httpd.apache.org/)やsyslogのログであれば自分で正規表現を書く必要はない。
* アウトプット: [elasticsearch](https://www.elastic.co/guide/en/logstash/5.2/plugins-outputs-elasticsearch.html) 6.2.6: Elasticsearchにイベントをポストするプラグイン。

# Beatsとは
BeatsもElastic Stackに含まれる製品で、データを採取してLogstashやElasticsearchに送信する製品群の総称。
[libbeat](https://github.com/elastic/beats/tree/master/libbeat)というGoのライブラリを使って作られていて、以下のようなものがある。

* [Filebeat](https://github.com/elastic/beats/tree/master/filebeat): ログファイルからログを取得する。
* [Heartbeat](https://github.com/elastic/beats/tree/master/heartbeat): リモートサービスをpingして生死監視する。
* [Metricbeat](https://github.com/elastic/beats/tree/master/metricbeat): OSとその上のサービスやアプリから稼動情報を取得する。
* [Packetbeat](https://github.com/elastic/beats/tree/master/packetbeat): パケットキャプチャしてネットワークのトラフィックを監視する。
* [Winlogbeat](https://github.com/elastic/beats/tree/master/winlogbeat): Windowsのイベントログを取得する。

今回使ったのはFilebeat 5.2.2。

Filebeatは指定したログファイルを監視し、変更を検知してリアルタイムにログを送信してくれる。
FilebeatとLogstashが仲良くやってくれて、バッファがあふれるなどすることによるログの損失が起きないようにしてくれるらしい。
Logstashが単位データを受け取るので、ログファイルからひとつひとつのログを切り出すのはFilebeatの責務。
一行一ログなら何も考えなくていいけど、大抵複数行のログがあるのでなんとかする必要がある。

# elasticsearch-headとは
elasticsearch-headは3rdパーティ製(個人製?)のElasticsearchのWeb UI。
ElasticsearchのUIはREST APIしかないのでこういうものを使わないと辛い。

ElasticsearchのGUIとしてはElastic Stackの[Kibana](https://www.elastic.co/jp/products/kibana)が有名だけど、これは大量のログから統計的な情報を見るのに便利そうなものであって、今回やりたかった障害原因調査のためにログを細かく追うのには向いてなさそうだったので使わなかった。

# 実験環境
今回は単にログがどんな感じに見えるか試したかっただけなので、全部ローカルで動かして、ローカルに置いた静的なログファイルを読むだけ。
環境はWindows 7のノートPC。

ログファイルは`C:\Users\Kaito\Desktop\logs\`においた`nnm-trace.log`と`nnm-trace.log.1`。
これらはNNMiのメインログで、[JUL](https://docs.oracle.com/javase/8/docs/api/java/util/logging/package-summary.html)で出力されたもの。
NNMiは無料のコミュニティエディションのv10.00をVMのCentOSに適当に入れて採った。

ログはだいたい以下の様な一行のもの。

```
2017-03-15 19:09:55.896 INFO  [com.hp.ov.nms.spi.common.deployment.deployers.ExtensionServicesDeployer] (Thread-2) Deploying arris-device
2017-03-15 19:09:55.923 WARNING [com.hp.ov.nms.topo.spi.server.concurrent.NmsTimerTaskImpl] (NmsWorkManager Scheduler) Skipping task execution because previous execution has not completed: com.hp.ov.nnm.im.NnmIntegrationModule$EnablerTask@3abdac77
2017-03-15 19:09:56.120 INFO  [com.hp.ov.nms.disco.spi.DiscoExtensionNotificationListener] (Thread-2) Disco deployed mapping rules: META-INF/disco/rules/cards/ArrisCard.xml
```

たまに複数行のものがある。

```
2017-03-15 19:13:30.872 INFO  [com.hp.ov.nms.trapd.narrowfilter.NarrowTrapAnalysis] (pool-1-thread-18)
***** Hosted Object Trap Rate Report *****
Hosted object trap storm detection and suppression stage started: Wed Mar 15, 2017 19:09:00.746 PM.

***** General Statistics *****
Hosted Object trap rate threshold: 10 traps/sec.
Average trap rate: 0 traps/sec.
Total traps received: 0.
Total traps received without configuration: 0.
Total traps suppressed: 0.
Number of trap configurations: 1.


***** END Hosted object trap storm report END *****
```

ログレベルの部分(e.g. INFO、WARNING)はロケールによって日本語になったりする。

スレッド名の部分(e.g. pool-1-thread-18)は丸括弧で囲われているが、丸括弧を含むことがある。

クラス名の部分(e.g. com.hp.ov.nms.trapd.narrowfilter.NarrowTrapAnalysis)は、パッケージ名がついていないこともある。デフォルトパッケージってこともないだろうに。

# Elastic Stackのインストールと設定
Elastic Stackの三つはどれも、サイトからアーカイブをダウンロードして展開すればインストール完了。

Filebeatの設定は、展開したディレクトリのトップにある`filebeat.yml`に以下を書いた。

```yaml
filebeat.prospectors:

- input_type: log
  paths:
    - C:\Users\Kaito\Desktop\logs\*

  multiline.pattern: '^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3} '
  multiline.negate: true
  multiline.match: after

output.logstash:
  hosts: ["localhost:5043"]
```

`paths`でログファイルを指定して、`hosts`でログの送信先を指定している。
また、複数行のログに対応するため、`multiline`という設定を書いていて、タイムスタンプで始まらない行は前の行の続きになるようにしている。

<br>

Logstashの設定は、展開したディレクトリのトップに`pipeline.conf`というファイルを作ってそこに以下を書いた。

```text
input {
    beats {
        port => "5043"
    }
}
filter {
    grok {
        match => { "message" => "%{TIMESTAMP_ISO8601:timestamp} (?<log_level>[^ ]+) +\[(?:%{JAVACLASS:class}|(?<class>[A-Za-z0-9_]+))\] \((?<thread>.+(?=\) ))\) (?<log_message>.*)"}
    }
}
output {
    elasticsearch {
        hosts => [ "localhost:9200" ]
    }
}
```

`input`と`output`の部分は単にbeatsプラグインとelasticsearchプラグイン使うようにして送受信先を指定しているだけ。

`filter`の部分は、grokプラグインを使うようにしつつそのパターンマッチングを指定している。
FilebeatがJSONオブジェクトの`message`というフィールドに一回分のログを入れて送ってくるので、そこからタイムスタンプ、ログレベル、クラス、スレッド、ログメッセージを抽出し、それぞれ`timestamp`、`log_level`、`class`、`thread`、`log_message`というフィールドに入れるように設定。
`TIMESTAMP_ISO8601`と`JAVACLASS`が組み込みのパターンで、それぞれタイムスタンプとJavaのクラス名にマッチする。
けど`JAVACLASS`がパッケージ名の付いてないクラス名にマッチしないのでちょっと細工している。

<br>

Elasticsearchの設定は、展開したディレクトリ内の`config/elasticsearch.yml`に以下を書いた。

```yaml
http.cors.enabled: true
http.cors.allow-origin: "*"
```

これは、elasticsearch-headがWebアプリなので、そこからElasticsearchにアクセスできるように[CORS](https://en.wikipedia.org/wiki/Cross-origin_resource_sharing)を有効にする設定。

<br>

これで設定は終わり。

# 各製品の起動
Filebeatは普通はサービスとして起動するみたいだけど、今回はコマンドラインで起動する。

展開したディレクトリで以下のコマンドを実行。

```cmd
filebeat.exe -e -c filebeat.yml -d "publish"
```

<br>

Logstashは展開したディレクトリで以下のコマンド。

```cmd
bin\logstash.bat -f pipeline.conf
```

<br>

Elasticsearchは展開したディレクトリで以下のコマンド。

```cmd
bin\elasticsearch.bat
```

しばらく待つと起動完了し、`localhost:9200`でHTTPリクエストを待ち始める。
試しにブラウザで`http://localhost:9200/_cluster/health`にアクセスすると、以下の様にElasticsearchクラスタのステータスがJSONで返ってきた。

```text
{"cluster_name":"elasticsearch","status":"yellow","timed_out":false,"number_of_nodes":1,"number_of_data_nodes":1,"active_primary_shards":5,"active_shards":5,"relocating_shards":0,"initializing_shards":0,"unassigned_shards":5,"delayed_unassigned_shards":0,"number_of_pending_tasks":0,"number_of_in_flight_fetch":0,"task_max_waiting_in_queue_millis":0,"active_shards_percent_as_number":50.0}
```

<br>

以上でElastic Stackが起動し、Elasticsearchにログが読み込まれた。

# elasticsearch-headでログを見る
elasticsearch-headは`git clone https://github.com/mobz/elasticsearch-head.git`してその中の`index.html`をブラウザで開けば動く。組み込みのWebサーバを起動する手順もあるけど。

開くと`http://localhost:9200/`(i.e. Elasticsearch)にアクセスしてGUIに情報を表示してくれる。
Overviewタブには以下の様に、`logstash-2017.03.17`というインデックスが作られていて、それに対して5つのシャードとレプリカシャードが作られている様が表示される。

![overview.png](/images/elasticsearch-in-nnmi-log/overview.png)

<br>

Browserタブではざっくりとログの一覧が見れる。

![browser.png](/images/elasticsearch-in-nnmi-log/browser.png)

<br>

Structured Queryタブでは条件を指定してログを表示できる。

![query.png](/images/elasticsearch-in-nnmi-log/query.png)

ここでは2017/3/15 19:09:50から2017/3/15 19:10:00の間のINFOレベルのDiscoExtensionNotificationListenerクラスのログを10件表示した。

<br>

不要な列を非表示にできないし、ソートもできないし、ログメッセージ見難くくて全く使えない。
もう少しいいGUIがあれば使えるのか、そもそもElasticsearchを使うのが間違っているのか。
