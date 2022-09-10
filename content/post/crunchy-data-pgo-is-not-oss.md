+++
categories = ["Programming"]
title = "Crunchy DataのPostgreSQL Operator (PGO)はOSSじゃない"
date = "2022-09-10T10:41:01+09:00"
tags = ["kubernetes", "postgresql", "pgo", "license"]
draft = false
cover = "pgo.png"
slug = "crunchy-data-pgo-is-not-oss"
highlight = true
highlightStyle = "monokai"
highlightLanguages = []
+++

Crunchy DataのPostgreSQL OperatorのPGOってOSSとは呼べないよねという話。

<!--more-->

{{< google-adsense >}}

# PGOとは
[PGO](https://access.crunchydata.com/documentation/postgres-operator/v5/)は、Crunchy Data社が開発したPostgreSQL Operator。
要はKubernetes上でPostgreSQLクラスタを管理するツール。
PostgresClusterというCustom ResourceをKubernetesに登録すると、その内容に従ってPostgreSQLのPodをデプロイし、クラスタを構築してくれる。

ソースは[GitHub](https://github.com/CrunchyData/postgres-operator)で公開されていて、ライセンスは[Apache License 2.0](https://github.com/CrunchyData/postgres-operator/blob/master/LICENSE.md)となっている。

[SRA OSS Tech Blog](https://www.sraoss.co.jp/tech-blog/kubernetes/crunchy-postgres-operator-v5/)で紹介されていたり、[Cloud Native Database Meetup](https://www.slideshare.net/nttdata-tech/postgresql-kubernetes-operator-cloud-native-database-meetup-3-nttdata)でOSSとして紹介されていたり、[@ITの記事](https://atmarkit.itmedia.co.jp/ait/articles/2105/20/news006.html)でも有力なPostgreSQL OperatorのOSSとして紹介されている。

# PGOのライセンス
確かに、PGOそれ自体はソースが公開されていて、明確に[Apache License 2.0と書いてある](https://github.com/CrunchyData/postgres-operator/blob/master/LICENSE.md)。
けど、問題なのは、PGOがデプロイするPostgreSQLクラスタに使われるコンテナイメージがOSSじゃない、ということ。

PGOがデプロイするコンテナイメージはいくつもあるけど、その一つがcrunchy-postgres。crunchy-postgresには、[Crunchy Dataのコンテナレジストリで配布されているの](https://www.crunchydata.com/developers/download-postgres/containers/postgresql14)と、[Docker Hubにおいてあるもの](https://hub.docker.com/r/crunchydata/crunchy-postgres)がある。
いずれの配布元もよくみると、[Crunchy Data Developer ProgramのTerms of Use](https://www.crunchydata.com/developers/terms-of-use)に従って使ってね、と書いてある。

Crunchy Data Developer ProgramのTerms of Useには、このソフトウェアは、Crunchy Data Support Subscriptionを買うか、書面での同意を交わさない限り、プロダクション環境での使用は意図に反すると書いてある。

> For avoidance of confusion, the Crunchy Developer Software without an active Crunchy Data Support Subscription or other signed written agreement with Crunchy Data are not intended for:
> using the services provided under the Program (or any part of the services) for a production environment, production applications or with production data,

明確にダメ(may not)とは書いてなくて、意図してない(not intended)と書いてあって若干あいまいだけど、Crunchy Data Support Subscriptionを買わずにプロダクション環境で使ってはダメということだろう。
これは、[オープンソースの定義](https://opensource.jp/osd/osd19/)の6条「利用する分野(fields of endeavor)に対する差別の禁止」に明確に反しているので、crunchy-postgresはOSSではない。
まあそもそもcrunchy-postgresのソースは公開されてないっぽいのでその時点でOSSじゃないけど。
([Crunchy Container Suite](https://github.com/CrunchyData/crunchy-containers)というすごくそれっぽいソースはApache License 2.0で公開されてるけど、crunchy-postgresとかのコンテナイメージを使うツールやサンプルが置かれてるだけで、コンテナイメージのソースはない。)

PGOはPostgreSQLクラスタをデプロイして初めて価値を成すソフトウェアだし、デプロイされるcrunchy-postgresは素のPostgreSQLだけでなく[Patroni](https://patroni.readthedocs.io/en/latest/)とかを詰め込んでPGOから管理される用にカスタマイズされたコンテナイメージなので、crunchy-postgresはPGOの一部と考えるのが自然。
そうなると、PGOがApache License 2.0のOSSというのは無理がある。

実際に、[Hacker Newsのとあるスレッド](https://news.ycombinator.com/item?id=31882256)に、PGOをOSSだと思って使っていたら、Crunchy Dataのセールスからサブスクリプションを買わないと使っちゃダメと言われたひとがたくさんいる、という情報が書かれている。

> number of customers who started using Crunchy Kubernetes Operator based solution thinking it is Open Source and were contacted by Crunchy Sales team to indicate they need subscription to use it.

ついでに、crunchy-postgresとかのコンテナイメージの配布元には[Developer Program Data Collection Notice](https://www.crunchydata.com/developers/data-collection-notice)というのも書いてあって、様々なメトリクスを取得してCrunchy Dataに送るのでよろしくとなっている。
動作中にメトリクスを集めてどこかに送信するというのはWindowsとかもやるし、OSSでもたまにあるけど、知っている限りではオプトアウトできるものばかりだったと思う。
crunchy-postgresにはオプトアウトするオプションはなさそう。
Personal Dataは送らないよとは書いてあるけど、若干気持ち悪い。

# PGOの代わり
PGOは筆者が調べた限り、一番多機能でドキュメントもしっかりしてていいので、納得してお金払って使う分には全然ありだと思うが、上記のようなだまし討ちっぽいビジネスをしてるところは気にかかる。
真のOSSで、オプションとして有償サポートを明示しているような善良なPostgreSQLオペレータはほかにあるので、そっちを選んだほうが気持ちよく使えそうではある。

例えば[ZalandoのPostgres Operator](https://github.com/zalando/postgres-operator)は、モニタリング以外はPGOと遜色ない多機能で、PGOと同様のPatroniを使ったアーキテクチャなので、PGOの代替として有力。
そもそもPatroniはZalandoが開発したものなので、こっちが本家本元と言える。

他にも、PGOのだまし討ちに引っかかった人々を救うために開発された[Percona Operator for PostgreSQL](https://docs.percona.com/percona-operator-for-postgresql/index.html)とか、graduated CNCFプロジェクトの[CloudNativePG](https://cloudnative-pg.io/)とか、新進気鋭の[StackGres](https://stackgres.io/)とか、PostgreSQL以外のDBMSにも対応している[KubeDB](https://kubedb.com/)とか、シンプル目な[Kubegres](https://www.kubegres.io/)とか、OSSで無料でプロダクションに使えるのは色々あるので、PGOを敢えて使う必要があるかはよく考えるべき。
