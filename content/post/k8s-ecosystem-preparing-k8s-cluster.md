---
categories: ["Programming"]
title: "Kubernetesのエコシステム ー Kubernetesクラスタ構築編"
date: 2019-06-23
cover: "kubernetes.png"
slug: "k8s-ecosystem-preparing-k8s-cluster"
tags: ["kubernetes"]
draft: false
---

[前回](https://www.kaitoy.xyz/2019/06/15/k8s-ecosystem-container-runtimes/)に続いて、Kubernetesのエコシステムをまとめていく。

今回はKubernetesのクラスタの構築手段について書く。

<!--more-->

{{< google-adsense >}}

# Kubernetesのアーキテクチャ
とりあえず、Kubernetesのクラスタとは何かについて書く。

Kubernetesはざっくりマスタコンポーネントとノードコンポーネントに分けられる。
これらは同一または別個のマシンにデプロイできて、HTTPS通信を介して一つのクラスタを構成する。

マスタコンポーネントをデプロイしたマシン群はコントロールプレーンと呼ばれることがある。
ノードコンポーネントをデプロイした1マシンは単にノードと呼ばれるが、ワーカノードと呼ぶことも多い。
ノードは1クラスタに複数あるのが普通で、数百ノード～数千ノードという規模の構成も可能。

Kubernetesクラスタに対してアプリのリソース(e.g. コンテナとかサービスとか永続化ボリューム)を定義してやると、Kubernetesがそれに従ってリソースを準備してアプリをデプロイしてくれる。
アプリを構成する各Podをどのノード上で動かすかはコントロールプレーンが動的に決める。

* マスタコンポーネント

    Kubernetesクラスタやその上で動くアプリケーションの構成を管理するコンポーネント群で、それぞれがGo製の単一バイナリのサーバアプリケーション。
    以下の4つのコンポーネントがある。([実際にはもう一つある](https://kubernetes.io/docs/concepts/overview/components/#cloud-controller-manager)けど、マネージドKubernetesを提供するクラウドプロバイダが使うやつなので普通は気にしなくていい。)

    * [kube-apiserver](https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/)

        HTTPSのポートを開けて、REST API(とProtocol BuffersのAPI)でアプリのリソースを定義するための[Kubernetes API](https://kubernetes.io/docs/concepts/overview/kubernetes-api/)を提供するサーバ。
        ユーザはkubectlというコマンドラインツールや任意のHTTPクライアントを使ってこれと話し、アプリのリソース定義を投入する。

        全てのリソースが[watch operation (aka. watch list)](https://kubernetes.io/docs/reference/using-api/api-concepts/#efficient-detection-of-changes)をサポートしていて、クライアントがリソースごとの定義や状態の更新通知をリアルタイムに受けられるようになっている。
        (因みにwatch APIというのもあるが、Kubernetes 1.12で[非推奨になった](https://github.com/kubernetes/kubernetes/pull/65147)。)

    * [etcd](https://github.com/etcd-io/etcd)

        kube-apiserverが受け取ったリソース定義、アプリケーションの状態、Kubernetesクラスタ内で発生したイベントなどの情報を永続化するデータベース。
        データベースのアーキテクチャは分散キーバリューストア。
        kube-apiserverだけが参照、更新する。

        実はKubernetesとは別のプロジェクトのもので、etcdはetcdでKubernetesとは別にクラスタを組める。

        gRPCのAPIで[データの変更をwatch](https://godoc.org/github.com/coreos/etcd/clientv3#Watcher)できるので、Kubernetesはこれを利用してリアクティブな感じに動く。

    * [kube-scheduler](https://kubernetes.io/docs/reference/command-line-tools-reference/kube-scheduler/)

        kube-apiserverのwatch operationを使ってPod定義の作成をwatchして、各Podをどのノードにデプロイするかを決める。
        決めるときには、Podの要求リソースとか、[ノードや他Podとの親和性(i.e. Affinity)定義](https://kubernetes.io/docs/concepts/configuration/assign-pod-node/#affinity-and-anti-affinity)を鑑みてくれる。
        この、Podをデプロイするノードを決める処理をスケジューリングという。

    * [kube-controller-manager](https://kubernetes.io/docs/reference/command-line-tools-reference/kube-controller-manager/)

        kube-apiserverのwatch operationを使って色んなリソース定義をwatchする。
        kube-controller-managerはそのプロセス内部でリソース種別毎にgoroutineでコントローラを実行し、リソース定義と実際のリソース状態を比較し、その差を埋めるように処理をするのが主な役割。

    コンポーネント間はHTTPSやgRPCで通信するので、ネットワークさえつながっていればそれぞれがどこで動いていてもいいんだけど、普通はetcd以外の3つは同一マシンで動かして、冗長化構成にするときもその単位でする。

* ノードコンポーネント

    ノードのマシンやPodやコンテナを管理・監視するコンポーネント群で、それぞれがGo製の単一バイナリのサーバアプリケーション。
    以下の2つのコンポーネントがある。

    * [kubelet](https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/)

        kube-apiserverのwatch operationを使ってPod定義(など?)をwatchし、定義に従ってコンテナの起動・停止をするためにコンテナランタイム(i.e. [CRI実装](https://www.kaitoy.xyz/2019/06/15/k8s-ecosystem-container-runtimes/#cri))と話しをするのが主な仕事。
        ノードの状態監視もする。

        HTTPSポートを持っていて、kube-apiserverからのREST API呼び出しを受け付けて以下のような処理もする。

        * `kubectl exec`で指定されたコマンドをコンテナで実行する。
        * `kubectl logs`で指定されたコンテナのログを取得する。
        * `kubectl port-forward`でローカルホストのポートをコンテナのポートに転送する。

    * [kube-proxy](https://kubernetes.io/docs/reference/command-line-tools-reference/kube-proxy/)

        Kubernetesクラスタ内でロードバランサ的な役割をするServiceと、そのバックエンド接続を表すEndpointというリソースを監視し、それらの定義に従ってiptablesやipvsのルールをいじってPod間の通信を転送したり、ノードのポートを開けて外部からPodにつなげるようにしてくれる。

![k8s-arch.png](/images/k8s-ecosystem-k8s-cluster/k8s-arch.png)

上記の通りKubernetesクラスタは結構複雑で、構築するとなると色んなコンポーネントをインストールして、HTTPS通信のためのサーバ・クライアント証明書を作って、設定ファイルを沢山作って、コンテナランタイムをインストールしたりと[かなり大変](https://www.kaitoy.xyz/2018/04/17/kubernetes110-from-scratch/)。
なので、Kubernetesコミュニティ内外でこの問題に対する様々な取り組みがある。

# Kubernetesクラスタ構築ツール
Kubernetesクラスタを自動で構築するツールがいくつかある。
それらを利用して、プロダクション向けのクラスタを自分の環境に作ることができる。

## kubeadm
[kubeadm](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/install-kubeadm/)はKubernetesコミュニティ製の本家本元ツール。
Kubernetes 1.4とともにリリースされ、GAに達したのは割と最近でKubernetes 1.13 (2018年12月)。

Goで書かれた単一バイナリで、マスタのマシンとノードのマシンでシンプルなコマンドを実行するとクラスタが作れるけど、コンテナランタイムとかkubeletとかは事前にインストールしておく必要があり、[ちょっと面倒](https://www.kaitoy.xyz/2017/10/21/build-kubernetes-cluster-by-kubeadm/)。

## kops
[kops](https://github.com/kubernetes/kops)もKubernetesコミュニティ製。

Kubernetesクラスタを[AWS](https://aws.amazon.com/jp/blogs/news/configure-kubernetes-cluster-on-aws-by-kops/)とか[GCE](https://github.com/kubernetes/kops/blob/master/docs/tutorial/gce.md)に構築できる。
(前者はAWS公式によるサポート。)

Goで書かれた単一バイナリで、コマンドを実行するとVMのインスタンスを作ったりネットワークや権限周りの設定をしてくれたりしたうえでKubernetesクラスタを構築してくれる。

## kubespray
[kubespray](https://github.com/kubernetes-sigs/kubespray)もKubernetesコミュニティ製。
プレーンな(ベアメタルな)マシンのほか、AWS、GCE、Azure、OpenStack、vSphereなどの環境にKubernetesクラスタを構築できる。

[Ansible](https://www.ansible.com/)のプレイブックになっているところが特徴で、それゆえ中の処理が追いやすくてカスタマイズもしやすい。

## Juju、JAAS
[Juju](https://jaas.ai/)はUbuntuの開発元であるCanonical社が提供するGo製のツール。
JAASはそのSaaS版。

Kubernetesに特化しているわけではなく、汎用的な分散システムをモデリングするためのツールで、AWS、GCE、Azureなどの環境にVMや関連リソースや任意のアプリケーションをデプロイして管理できる。
Jujuはアプリケーションとそのセットアップ処理を[Charm](https://docs.jujucharms.com/concepts-and-terms#heading--charm)という形でパッケージングして、[Charm Store](https://jaas.ai/store)で共有できるようにしている。
Charm Storeに[KubernetesのCharm](https://jaas.ai/kubernetes)があって、これでKubernetesクラスタを構築できる。

## ansible-k8s、packer-k8s
拙作のツール。
[ansible-k8s](https://www.kaitoy.xyz/2018/06/03/build-k8s-cluster-by-ansible/)が任意のマシンにKubernetesクラスタを構築するAnsibleプレイブック。
[packer-k8s](https://www.kaitoy.xyz/2018/06/17/packer-k8s/)は、VirtualBoxかESXiでVMを作ってansible-k8sでKubernetesクラスタを構築する[Packer](https://www.packer.io/)のテンプレート。

GitHubに挙げているものはシングルノード構成しか対応してないけど、職場ではマルチノード構成(とHyper-V)に対応させたものを使ってる。

# 出来合いKubernetesクラスタ
ツールを使って構築するのもそれなりの学習コストと作業が発生して簡単ではないので、出来合いのものを使う手もある。
プロダクション用のものはなく、開発用ばかり。

## Minikube
[Minikube](https://github.com/kubernetes/minikube)はKubernetesコミュニティ製の本家本元ツール。

[minikubeというGo製のコマンドを実行すると、Kubernetesセットアップ済みのVMイメージをダウンロードして、ホストOSから使えるようにしてくれる](https://www.kaitoy.xyz/2017/10/10/goslings-on-kubernetes/)。
Kubernetesに特化した[Vagrant](https://www.vagrantup.com/)みたいな感じ。

VMを動かす仮想環境としてはVirtualBox、KVM、Hyper-V、[hyperkit](https://github.com/moby/hyperkit)がサポートされている。

## Docker for Windows、Docker for Mac
[Docker for Windows](https://docs.docker.com/docker-for-windows/)と[Docker for Mac](https://docs.docker.com/docker-for-mac/)は、それぞれOSネイティブなハイパバイザでLinuxのVMを立ち上げてDockerを使えるようにしてくれるもの。
(前者は[近いうちにハイパバイザからWSL2に変わる](https://engineering.docker.com/2019/06/docker-hearts-wsl-2/)。)

Docker for Windowsは[2018年1月末](https://blog.docker.com/2018/01/docker-windows-desktop-now-kubernetes/)、Docker for Macは[2018年1月頭](https://blog.docker.com/2018/01/docker-mac-kubernetes/)からKubernetesを同梱するようになり、Minikubeと同じようなことができるようになった。

Minikubeに比べてKubernetesクラスタの設定はあまりいじれないけど、こっちのほうがセットアップは簡単。

## KatacodaのKubernetesコース
[Katacoda](https://www.katacoda.com/)はオンラインでIT技術を触って学べるサービス。
その[Kubernetesコース](https://www.katacoda.com/courses/kubernetes)では、ブラウザ上でkubectlを実行してKubernetesクラスタを触ることができる。

できることは限られているが、ちょっとkubectlを触ってみたいくらいの時にはいいかも。

## Play with Kubernetes
[Play with Kubernetes](https://labs.play-with-k8s.com/)はDocker社が提供するKubernetesお試し環境。
なぜかkubeadmでクラスタを作るところからやらされて地味にめんどくさい。

今試そうとしたらなんだか繋がりにくいし、セッションがすぐ切れてクラスタを作るところまで進めなかった。
過負荷なのかな。

因みに[Play with Docker](https://labs.play-with-docker.com/)もある。

# マネージドKubernetesクラスタ
プロダクション用にKubernetes使いたいけど、自分でインフラ構築するのは面倒だし運用も楽したいという人向けに、マネージドなKubernetesを提供するサービスがクラウドベンダ各社から出ている。

## Google Kubernetes Engine (GKE)
[GKE](https://cloud.google.com/kubernetes-engine/?hl=ja)はGoogle CloudのマネージドKubernetesサービス。
Kubernetesの開発の大本であるGoogleがやっているだけあって機能的には最高。

KubernetesマスタはSaaSで提供されて、KubernetesのノードはGoogle Compute Engineのインスタンスとして見えて、ノードのインスタンスだけが課金対象。
つまりマスタはタダで動かしてくれる。

## Azure Kubernetes Service (AKS)
[AKS](https://azure.microsoft.com/ja-jp/services/kubernetes-service/)はMicrosoft Azureのやつ。
GKEより3年ほど後発で機能は劣るが、2016年半ばからKubernetesのco-founderであるBrendan Burnsがリードしているので先は明るそう。

他のマネージドKubernetesに勝る点として、[virtual-kubelet](https://github.com/virtual-kubelet/virtual-kubelet)を利用して[Azure Container Instances (ACI)](https://azure.microsoft.com/ja-jp/services/container-instances/)と連携し、[マシンレスでPodをデプロイできる](https://azure.microsoft.com/ja-jp/updates/azure-kubernetes-service-aks-virtual-node-is-now-available/)ところは特筆すべきところ。
けどまだ出たてだし、DaemonSetでPodを作れないなどの制限があるので、基本的にはAzure Virtual Machinesのインスタンスをノードに使う形になり、そこが課金対象になる。
AKSもマスタはタダ。

## Amazon EKS
[Amazon EKS](https://aws.amazon.com/jp/eks/)はAWSのやつ。
他のと同様にKubernetesマスタがSaaSで提供される。
現時点ではノードはEC2インスタンスでそこの課金が結構大きいけど、近いうちに[Fargate](https://aws.amazon.com/jp/fargate/)にPodをデプロイできるようになってマシンレスになる気配が感じられる。

後発のKubernetesサービスで、結構機能的には劣るけど、AWSのブランド力でマスタにも課金してくる。

CNIプラグインとして独自の[Amazon VPC CNI plugin](https://github.com/aws/amazon-vpc-cni-k8s)を提供している、というかこれしかサポートしていないのが特徴。
これのせいで1ノードにデプロイできるPod数がEC2インスタンスのENI数の制限を受ける。

## IBM Cloud Kubernetes Service (IKS)
[IKS](https://www.ibm.com/jp-ja/cloud/container-service/details)は名前の通りIBM Cloudのやつ。
これもマスタはタダ。
ワーカノードにベアメタルマシンを使えるのが特徴のひとつ。

使用例を聞いたことが無い…
