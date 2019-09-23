---
categories: ["Programming"]
title: "Kubernetesのエコシステム ー その他雑多"
date: 2019-09-23
cover: "kubernetes.png"
slug: "k8s-ecosystem-misc"
tags: ["kubernetes"]
draft: false
---

[前回](https://www.kaitoy.xyz/2019/08/14/k8s-ecosystem-k8s-variations-and-container-host-oses/)に続いて、Kubernetesのエコシステムをまとめていく。

今回は前回までのカテゴリに入らない雑多なものについて書く。
Kubernetesの上で動くものであったり、Kubernetesクラスタに対して働くものだったり。

<!--more-->

{{< google-adsense >}}

# セキュリティ

KubernetesクラスタやKubernetesアプリケーションのセキュリティ向上のためのツールたち。

## kube-bench
[kube-bench](https://github.com/aquasecurity/kube-bench)はKubernetesクラスタの設定やリソース定義にセキュリティ的な問題が無いかを[CIS Kubernetes Benchmark](https://www.cisecurity.org/benchmark/kubernetes/)に沿ってチェックしてくれるコマンドラインツール。

[最近話題になった](http://knqyf263.hatenablog.com/entry/2019/08/20/120713)Aqua Security社製。

## Popeye
[Popeye](https://github.com/derailed/popeye)はKubernetesクラスタに登録されたリソース定義に潜在的な問題が無いかをスキャンしてくれるコマンドラインツール。

使われていないリソースが無いかとか、リソース制限がかかってないPodが無いかとか。

## Polaris
[Polaris](https://www.reactiveops.com/polaris)はKubernetesのリソース定義に問題が無いかをチェックするツール。

コマンドラインツールとして実行してPopeye同様にクラスタに登録されたリソースをチェックできるほか、Kubernetesマニフェストをチェックすることもできる。
また、Polaris自身をクラスタにデプロイして、まずいリソースの登録をはじいたり、ダッシュボードでスキャン結果を確認することができる。

チェックできる内容はPopeyeと同様っぽい。

## Falco
[Falco](https://falco.org/)は[sysdig](https://github.com/draios/sysdig)を使ってコンテナなどから発行されるシステムコールやパケットをキャプチャして、怪しい挙動を検出してSlackとかFluentdにアラートしてくれるツール。

## Open Policy Agent (OPA)
[OPA](https://www.openpolicyagent.org/)はアクセス制御のためのポリシーエンジン。
汎用的なものなのでKubernetes専用というわけではないけど、公式サイトでKubernetesリソースのアクセス制御に使うユースケースが最初に紹介されている。

ポリシーは[Rego](https://www.openpolicyagent.org/docs/latest/how-does-opa-work/)という独自言語で柔軟に細かく書けるけど、書くの大変そう…

# Kubernetesアプリケーション開発ツール

Kubernetesアプリケーションの開発やテストに役立つツールたち。

## Draft
[Draft](https://draft.sh/)はMicrosoft製のKubernetesアプリケーション開発ツール。

アプリケーションを普通に書いておいて、`draft create`というコマンドを実行すると、言語を判定して、[Draft Pack](https://github.com/Azure/draft/blob/master/docs/reference/dep-003.md)というフォーマットに従って自動でコンテナ化してくれる。
で、`draft up`を実行するとKubernetesクラスタにアプリをデプロイしてくれて、ソースを監視して、ソースを変更したらコンテナビルドと再デプロイを実行してくれる。

まだ実験的な段階だけど開発は停滞してるっぽい。

## Skaffold
[Skaffold](https://skaffold.dev/)はGoogle製のubernetesアプリケーション開発ツールで、Draftとおんなじようなことができる。

コンテナのビルド処理の部分がプラガブルになっていて、Dockerの他、[kaniko](https://github.com/GoogleContainerTools/kaniko)や[Bazel](https://bazel.build/)や[Jib](https://github.com/GoogleContainerTools/jib)も使えるし、任意のスクリプトも実行できる。
コンテナをビルドしなおさずに、動いているコンテナ内とローカルのファイルを同期することもできる。

こっちはアクティブに開発されている。

## Tilt
[Tilt](https://tilt.dev/)はSkaffoldのターミナルUI付いた版みたいな感じ。
パイプライン定義がPythonのサブセット(Bazelでも使われている[Starlark](https://github.com/bazelbuild/starlark))なのでいざとなったらスクリプティングできる。

## Telepresence
[Telepresence](https://www.telepresence.io/)はKubernetesクラスタ上で稼働しているPodをローカルの非コンテナプロセスで置き換えるツール。
コンテナを意識せずに従来の開発手法が使えるようになる。

具体的には、普通のPodをプロキシPodに置き換えて、Podへの通信をローカルプロセスにフォワードし、ローカルプロセスへの通信をプロキシPodにフォワードし、Podの環境変数をローカルプロセスから読めるようにし、Podにマウントされたボリュームにローカルプロセスからアクセスできるようにしてくれる。

## monday
[monday](https://github.com/eko/monday)はTelepresenceみたいにKubernetes上のサービスとローカルプロセスとの間の通信を双方向にフォワードしてくれるツール。
ローカルプロセスの起動とホットリロードも面倒見てくれる。

## ksync
[ksync](https://vapor-ware.github.io/ksync/)はPod内のディレクトリとローカルディレクトリを同期してくれるツール。

## kube-monkey
[kube-monkey](https://github.com/asobti/kube-monkey)はカオステストのためにPodをランダムに消してくれるツール。
開発止まってるっぽい。

## Litmus
[Litmus](https://litmuschaos.io/)もカオステストのツール。
[godog](https://github.com/DATA-DOG/godog)かAnsibleでテストを書けて、テスト実行、ログの収集、レポートの生成までやってくれる。

## Kuberhealthy
[Kuberhealthy](https://github.com/Comcast/kuberhealthy)はKubernetseクラスタやノードやアプリの健全性テストを実行する合成監視(aka. セマンティック監視)ツール。
Comcast製。

まだテスト項目はそんなになくて以下だけ。

* ダミーのDaemonSetをデプロイして消す。
* `kubectl get componentstatuses`相当の情報を確認。
* 再起動を繰り返しているPodがいないか確認。
* クラスタ内のDNSにクエリを投げる。

テスト結果はWeb APIからJSONで取れるほか、Prometheusのメトリクスとしてエクスポートされる。
Grafanaのダッシュボードも用意されている。

## Octant
[Octant](https://github.com/vmware/octant)はVMware製のKubernetesアプリケーション開発者向けツール。

octantコマンドを実行するとWebサーバが起動するのでそれにつなぐと、GUIで各種Kubernetesリソースを参照したり、Podへのポートフォワーディングをしたり、Podのログを見たりできる。

プラグインで機能を拡張できるらしいけど、まだプラグインは何もない模様。

## Konstellate
[Konstellate](https://github.com/containership/konstellate)はOctantみたいなツールで、OctantよりGUIがかっこよくて、Kubernetesリソースの作成や編集機能に力を入れている。

リソース間の関係をネットワークビューで見れて、ドラッグアンドドロップでリソース間の関連付けを作れるところが新しい。

起動するのにClojureが要るのがちょっと難点。

## K9s
[K9s](https://github.com/derailed/k9s)は各種KubernetesリソースやPodのログをリアルタイムに参照したり、リソースを編集したりできるターミナルUI。
設定ファイルでちょっとカスタマイズ出来て結構使いやすそう。

割と人気あるっぽい。

## kubespy
[kubespy](https://github.com/pulumi/kubespy)は各種Kubernetesリソースの変化をリアルタイムで監視できるターミナルUI。
特定のリソースを指定すると、その変化のサマリを表示してくれる感じ。

特にDeployment、Pod、Serviceの監視むけっぽい。

# パッケージマネージャ、パッケージャ

Kubernetesアプリケーションをパッケージングしたり管理したりするツール。

## Helm
[Helm](https://helm.sh/)はKubernetesアプリケーションを構成するKubernetesリソースのマニフェスト一式をChartという単位で記述し、クラスタにデプロイしたりバージョン管理したりするツール。

Chartではマニフェストのテンプレートとパラメータを分けて書けるので、環境に合わせたデプロイをしやすい。
デプロイせずにテンプレートからマニフェストをレンダリングすることもできるので、[kustomize](https://github.com/kubernetes-sigs/kustomize)の代わりにも使える。

もうすぐ出るv3でアーキテクチャや思想が大きく変わる模様。

## Gravity
[Gravity](https://github.com/gravitational/gravity)はKubernetes上のアプリケーションをKubernetesごとパッケージングしてtarファイルにしてくれるツール。
Kubernetesアプライアンスを作るツールとも自称している。

パッケージにはインストーラやコンテナレジストリやクラスタオーケストレータまで含まれ、オフラインでインストールできる。

## CNAB、Duffle
[CNAB](https://cnab.io/)はMicrosoftとDocker社が主導して作っている分散(コンテナ)アプリケーションのパッケージング仕様。
[Duffle](https://duffle.sh/)はCNABパッケージマネージャ。

Kubernetes専用というわけではないし、コンテナ必須というわけでもないように見えるけど、Kubernetesもターゲットになっているっぽいのでここに載せた。

# Kubernetesオペレータフレームワーク

KubernetesのAPIを拡張できる[オペレータ](https://kubernetes.io/docs/concepts/extend-kubernetes/operator/)を開発するためのフレームワーク。

## Kubebuilder
[Kuberbuilder](https://book.kubebuilder.io/)はもともとCoreOS社が開発していたオペレータフレームワーク。
Goでオペレータを書くためのプロジェクトテンプレートやコードを生成してくれる。

## Operator Framework
[Operator Framework](https://github.com/operator-framework)は、Kuberbuilderと同様の役割の[Operator SDK](https://github.com/operator-framework/operator-sdk)でGoでオペレータを書けるほか、[Operator Lifecycle Manager](https://github.com/operator-framework/operator-lifecycle-manager)でオペレータのデプロイやアップグレード周りを面倒見てくれる。

Operator Lifecycle Managerを使えば[OperatorHub](https://operatorhub.io/)から手軽にオペレータを利用できるっぽい。

## Kopf
[Kopf](https://github.com/zalando-incubator/kopf)はPythonのデコレータでオペレータを書けるフレームワーク。

KubebuilderやOperator SDKはAPIがプリミティブな感じで、Reconciliation loopのなかでAPIオブジェクトに何が起きたのかを自分で調べないといけないけど、Kopfはもうちょっと洗練されていて、フレームワークが自動で差分を取ってくれたりして楽そう。
オペレータでちくちくいじらないといけないJSONデータも、動的型付けのPythonの方が圧倒的に楽そうだし。

## KUDO
[KUDO](https://kudo.dev)はD2iQ(旧Mesosphere)が開発したKubernetesオペレータ用のパッケージマネージャ。
オペレータを作るためのフレームワークではない。
kubectlにkudoというサブコマンドを提供し、オペレータtarでパッケージングし、インストール、アップグレード、バックアップなどのライフサイクルの面倒を見てくれる。

オペレータリポジトリも作ることができて、[公式のリポジトリ](https://kudo-repository.storage.googleapis.com/)もある。

# CI/CD

KubernetesアプリケーションのCI/CDツールたち。

## Weave Flux
[Weave Flux](https://www.weave.works/oss/flux/)は[GitOps](https://www.weave.works/technologies/gitops/)を提唱したWeaveworksによるCI/CDツール。

GitOpsできる。
つまり、Gitリポジトリに登録されたKubernetesマニフェスト(やそのテンプレート?)とKubernetesにデプロイされているマニフェストを同期してくれる。

## Argo CD
[Argo CD](https://github.com/argoproj/argo)はArgo ProjectによるCI/CDツール。

GitOpsできるツールとして、Weave Fluxより人気があるような気がする。

## Prow
[Prow](https://github.com/kubernetes/test-infra/tree/master/prow)は、KubernetesコミュニティによるCI/CDツール。
Kubernetesの開発などに使われていて、以下のような機能を持つ。

* GitHubイベントに応じたジョブをKubernetes上で実行。
* Jobのステータスなどを確認するGUI。
* BotによるGitHubオートメーション。

GitHub特化っぽい。

## Tekton Pipelines
[Tekton Pipelines](https://github.com/tektoncd/pipeline)はCI/CDパイプラインをKubernetesリソースとして定義できるツール。
パイプラインの実行もKubernetes上で。
パイプラインの各ステップがコンテナで実装でき、Kubernetesクラスタで実行される。

パイプライン定義は柔軟になんでもできそうなので、CI/CD以外のパイプラインにも使えそう。

もともとKnative(下記)のコンポーネントとして開発されていた。

## JenkinsX
[Jenkins X](https://jenkins-x.io/)の本体はjxというコマンドラインツールで、jxはKubernetesアプリケーションの開発とCI/CDのためのツール群を簡単に導入し、CI/CDパイプラインを構築できるツール。
Jenkinsをコンポーネントとして使ってるけど隠蔽されているし、[サーバプロセスとして動きすらしない](https://cloudbees.techmatrix.jp/serverless-jenkins-jenkins-x/)らしい。

Jenkinsのほかに、Helm、Draft、Skaffold、Prow、Tekton Pipelines、[Nexus](https://help.sonatype.com/repomanager3)、[Docker Registry](https://docs.docker.com/registry/)、[ChartMuseum](https://chartmuseum.com/)、[Monocular](https://github.com/helm/monocular)といったものを使う。

GitOpsにも対応。

## Razee
[Razee](https://github.com/razee-io/Razee)はIBMが開発しているCI/CDツール。

KapitanというコンポーネントでGitリポジトリやS3などに格納されたKubernetesマニフェストを自動デプロイし、RazeeDashというコンポーネントでKubernetesリソースを可視化してくれる。

Kubernetesマニフェストのテンプレートエンジンとして[Mustache](https://mustache.github.io/)を使う。

マルチクラスタに対応。

## Brigade
[Brigade](https://brigade.sh/)はMicrosoft製のCIツール。

Kubernetes上で動き、GitHubとかのイベントを受けてJavaScriptで定義したパイプラインを実行できる。
[Kashti](https://github.com/brigadecore/kashti)というダッシュボードでパイプラインの状態を確認できる。

# ログ

コンテナログ周りを扱うやつ。

## stern
[stern](https://github.com/wercker/stern)はPodのログをみるツール。

`kubectl logs -f`に似てるけど、正規表現で対象のPodを指定できるので、DeploymentなどによってPodが再起動して名前のポストフィックスが変わってもログを追えるところがいい。
Podごとに色付けして出力してくれるのも見やすくていい。

## Fluentd
[Fluentd](https://www.fluentd.org/)はTreasure Data(現Arm Treasure Data)製のログ収集ツール。
入力、中間処理、出力のパイプラインを、数百のプラグインを組み合わせて柔軟に組み立ててログの処理系を構築できる。
分散したログの集約もできる。

Kubernetes専用というわけではないけど、Kubernetesの標準ログ収集ツールに採用されているのでここに挙げた。

コミュニティ製だけど[Kubernetesプラグイン](https://github.com/fabric8io/fluent-plugin-kubernetes_metadata_filter)もあって、コンテナログにPod名やノード名などのメタ情報を付加できる。

## Fluent Bit
[Fluent Bit](https://fluentbit.io/)もTreasure Data製のログ収集ツール。
FluentdがRuby(とC)でできているのに対し、Fluent BitはCだけでできていて、メモリ使用量が十分の一くらいで動く。
そのため最初はIoTや組み込み向けとされていたが、今はそうでもない模様。

[Kubernetesプラグイン](https://docs.fluentbit.io/manual/filter/kubernetes)がFluent Bitではビルトインで、Fluentdのそれと同じことができる。

プラグインが60くらいとFluentdよりかなり少ないけど、基本的なものはそろっているので、だいたいのユースケースはFluent Bitでよさそう。
Fluent Bitで集めたデータをFluentdに集約することもできるので、込み入ったユースケースにも使えそう。

# ネットワーク

Kubernetesクラスタ内のPodネットワークやServiceネットワークに関するやつ。

## CoreDNS
[CoreDNS](https://coredns.io/)はGo製のDNSサーバ。
プラグインで色々な機能を拡張できるアーキテクチャで、[kubernetesプラグイン](https://coredns.io/plugins/kubernetes/)を使うことでKubernetesクラスタのServiceネットワークの名前解決をすることができる。

ほぼKubernetesの標準コンポーネント。

## Calico
[Calico](https://www.projectcalico.org/)はBGPを話す仮想ルータを作り、フラットなIPネットワークを構成してくれるツール。
ネットワークポリシーによる通信制御も設定できる。
[CNI](https://github.com/containernetworking/cni)をサポートしていて、Podネットワークを構成するのに使える。

パケットをカプセル化してオーバレイネットワークを作ったり、NATしたりすることがないので、シンプルで高速らしく、[CNIプラグイン](https://kubernetes.io/docs/concepts/cluster-administration/networking/)として最も人気がある気がする。

ただ、BGPで経路情報を周辺のルータと交換するので、Kubernetesクラスタ周辺の環境に若干依存したり変更を加えたりするわけで、ちょっと気持ち悪さがある気がする。

## Weave Net
[Weave Net](https://www.weave.works/oss/net/)はVxLANによるオーバレイネットワークを作って、別々のホストで動くコンテナ間をL2フラットにつないでくれるツール。
ネットワークポリシーをサポートしているほか、IPsecによる通信暗号化もできる。

CNIをサポートしていて、Podネットワークを構成するのに使える。
CNIプラグインとして3本の指に入るくらいには人気な気がする。

## Cilium
[Cilium](https://cilium.io/)は2018年4月にv1.0がリリースされた比較的新しいCNIプラグイン。
CalicoもWeave Netもルーティングや通信制御にiptablesを使っているのに対し、Ciliumはより柔軟でスケーラブルなBPFを使っている。
BPFによって、TCP/IPの層だけでなくL7のネットワークポリシーをサポートできていて、HTTP、gRPC、Kafka、DNSの制御に対応している。

Pod間ネットワークのモードとして、VxLANやGeneveなどによるオーバレイネットワークか、ホストのルーティングテーブルを直接いじるネイティブルーティングを選べる。(後者は前提が多いので基本は前者。)

もともとはバックエンドにKV-Storeとしてetcdかconsulが必要だったけど、2019年8月にリリースされたv1.6で[KV-Storeに依存しないモード](https://cilium.io/blog/2019/08/20/cilium-16/#kvstorefree)ができて使いやすくなった。
v1.6では[kube-proxyを置き換える機能](http://docs.cilium.io/en/stable/gettingstarted/kubeproxy-free/)も備えて、かなりいい感じな気がする。

[IPsecによる通信暗号化](http://docs.cilium.io/en/stable/gettingstarted/encryption/)もサポートしているので最強のCNIプラグインに見えるが、BPFを使うため、Linuxカーネルバージョンが4.8以上じゃないといけないのがネック。

RHEL 7ではカーネルアップグレードしないと使えない…

## Submariner
[Submariner](https://github.com/submariner-io/submariner)はRancher製のプロダクト。
Kubernetesクラスタ間のPod/Serviceネットワークをつなげられる。
デザスタリカバリとかクラスタの移行とかに使える?

まだpre-alpha。

# サービスメッシュ

Kubernetes向け[サービスメッシュ](https://www.redhat.com/ja/topics/microservices/what-is-a-service-mesh)の実装たち。

## Istio
サービスメッシュと言えば[Istio](https://istio.io/)。

各Podに[Envoy](https://www.envoyproxy.io/)コンテナを挿入し、各Envoyコンテナをコントロールプレーンから管理することでPodネットワークの通信を制御する。(i.e. サイドカーパターン)
それによって、ルーティング、ロードバランシング、リトライ、Circuit Breaking、双方向認証、暗号化、メトリクス収集、分散トレーシングといった、マイクロサービスを運用するのに一般的に横断的に必要な機能を提供する。

[Istio用CNIプラグイン](https://github.com/istio/cni)がα版として提供されている。

## Linkerd
[Linkerd](https://linkerd.io/)はBuoyant社によるサービスメッシュ実装。
Istioより古くからあり、実績もあったけど、最近はあまり話を聞かない。

Linkerd v1系のときにBuoyant社が後継製品として[Conduit](https://conduit.io/)というのを作ったけど、これが結局Linkerd v2になったっぽい。
v2では作りが刷新され、Istioと同様のアーキテクチャと機能をもつようになった。

[CNIプラグインとして動作する機能](https://linkerd.io/2/features/cni/)が実験的に提供されている。

## Maesh
[Maesh](https://mae.sh/)は、Go製リバースプロキシである[Traefik](https://traefik.io/)を開発するContainous社が開発したサービスメッシュ。
2019年9月に発表されたばかりのかなり新しいやつ。

サービス間通信の管理にはTraefikを使ってるけど、サイドカーパターンではなく、各PodにTraefikコンテナが挿入されるわけではない。
代わりに各KubernetesノードでDaemonSetとしてTraefikが動く。
で、クラスタ上で動くユーザのPodは選択的にこのTraefikをプロキシとして使えて、サービスメッシュの機能を享受できる。
(多分Linkerd v1と同様のアーキテクチャ?)

どうもIstioよりシンプルで軽くて簡単にセットアップ・運用できるというのを売りにするっぽい。

サービスメッシュの標準規格である[SMI](https://smi-spec.io/)に対応している。

## Kuma
[Kuma](https://kuma.io/)はAPIゲートウェイの[Kong](https://konghq.com/)を開発するKong社によるサービスメッシュ。
Maeshの直後くらいにアナウンスされたかなり新しいやつ。

Kong自身もサービスメッシュ機能をもっているけど、KumaはサイドカーにEnvoyを使う。

Istioとアーキテクチャも機能も似てるけど、Istioなどの従来のサービスメッシュの反省を生かし、セットアップや運用の容易化に力を入れている。
また、Kubernetes上のサービスだけでなく、VMなどの上で動く非コンテナプロセスの通信も制御できるため、従来型のアプリケーションからサービスメッシュを活用したマイクロサービスアプリケーションへの移行を可能にする。

# GUI
Kubernetes上で動き、Kubernetes上の構成情報を参照したり、アプリのデプロイをするためのGUIアプリ。

## Kubernetes Dashboard
[Kubernetes Dashboard](https://github.com/kubernetes/dashboard)はKubernetes公式のGUIアプリ。
各種Kubernetesリソースのリストや詳細の参照、DeploymentやServiceの作成、ノードやPodのメトリックの参照、コンテナログの参照などができる。

EOLな[Heapster](https://github.com/kubernetes-retired/heapster)に依存しているところが微妙。

## K8Dash
[K8Dash](https://github.com/herbrandson/k8dash)はKubernetes Dashboardの発展形な感じ。
各種KubernetesリソースのCRUDがGUIでできて、メトリックもダッシュボードで見れる。
リアルタイムにKubernetesから情報を取って表示更新するので、リロードしなくていい。
Heapsterの代わりに現標準の[metrics-server](https://github.com/kubernetes-incubator/metrics-server)を使う。

ついでにOpenId Connectに対応している。

## Weave Scope
[Weave Scope](https://www.weave.works/oss/scope/)はWeaveworksによるGUIアプリ。

ノードやPodやコンテナやプロセスやServiceをネットワークビューで見れる。
コンテナログを見たり、kubectl execしたりもできる。

## Kubeapps
[Kubeapps](https://kubeapps.com/)はBitnamiによるKubernetesダッシュボードアプリ。

Helmチャートリポジトリを閲覧してアプリをデプロイしたり、デプロイしたアプリのライフサイクル管理したり、[Service Catalog](https://github.com/kubernetes-sigs/service-catalog)からサービスをデプロイしたりできる。

## Kubernetes Web View
[Kubernetes Web View](https://github.com/hjacobs/kube-web-view)は比較的新しいGUIアプリ。

見た目も機能もシンプル目で、各種Kubernetesリソースの参照ができるけど、変更はできない。
マルチクラスタに対応していたり、パーマリンクがあったりするあたりがこだわり。
検索や表示のカスタマイズにもこだわっていて、ラベルでの検索とか表示する属性とかを指定できる。

ざっくりkubectl getのGUIを作りたいらしい。

# アプリ

## Knative
[Knative](https://knative.dev/docs/)はKubernetes上にイベントドリブンなサーバレスアプリケーションを構築できるフレームワーク。

## Ambassador
[Ambassador](https://www.getambassador.io/)はEnvoyベースのKubernetesネイティブなAPIゲートウェイ。

## Argo Workflow
[Argo Workflow](https://argoproj.github.io/argo/)はArgo ProjectによるKubernetesネイティブなワークフローエンジン。

タスクを表現するパイプラインを定義するためのCRDが提供されていて、KubernetesのAPIでパイプラインを定義できる。
パイプラインからは任意のKubernetesリソースを作成できる。

## Rook
[Rook](https://rook.io/)はKubernetesネイティブな分散ストレージシステム。
Ceph、Minio、Cassandra、NFSとかのサーバをデプロイして管理でき、それらが提供するストレージを統一的なインターフェースで利用できる。

## KubeVirt
[KubeVirt](https://kubevirt.io/)はVMを表現するCRDを提供し、KubernetesのAPIで(QEMUの)VMの作成・起動、停止、削除とかの操作を可能にする。

## Velero
[Velero](https://github.com/heptio/velero)は先日VMwareに買収されたHeptioによるバックアップツール。

バックアップの定義をするためのCRDが提供され、KubernetesのリソースとPersistentVolumeのデータのバックアップ、リストアを実行できる。

対象とする環境はAWSなどのクラウド上のKubernetesで、PersistentVolumeのバックアップはAWS EBSとかのスナップショット機能を使い、バックアップの保管先はAWS S3とかをサポートしている。
PersistentVolumeも保管先もサポート範囲が狭く、まだまだ発展途上な印象。
