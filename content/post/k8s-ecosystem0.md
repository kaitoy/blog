---
categories: ["Programming"]
title: "Kubernetesのエコシステム"
date: 2019-05-28
cover: "kubernetes.png"
slug: "k8s-ecosystem"
tags: ["kubernetes", "docker"]
draft: true
---

Kubernetesを仕事で使い始めて1年たったので、これまで使ったり見聞きして気になったKubernetesまわりのエコシステムについて簡単にまとめておく。

{{< google-adsense >}}

# [Kubernetes](https://kubernetes.io/ja/)
KubernetesはGoogleが2014年6月に発表したコンテナオーケストレーションツール。
単一または複数の物理・仮想マシンでクラスタを構築し、その上でコンテナを起動して、関連するリソース(e.g. 永続化ボリューム)とともに管理できる。
コンテナやコンテナ間の関連を宣言的に管理できるのと、拡張性が高くていろんなものと連携して一元管理できるのが特長。

Kuberの部分はUserの要領で読んで、Kuとneにアクセントをつけて、クーバーネティスみたいに読むとネイティブっぽい。

# コンテナ
コンテナは、ハードウェアをエミュレートしたりするハイパバイザの上で動く仮想マシンに対して、ホストOSのカーネルの機能で論理的に隔離された環境を作り、そこでアプリケーションプロセスを動かす技術。
仮想マシンよりホストとの分離が弱いが、起動が早く、消費リソースが少ない。

# Pod
Kubernetes上でのワークロードの最小単位はPodと呼ばれる。
Podは仮想マシンのような概念で、Podごとに論理リソースが隔離され、IPアドレスが割り当てられ、その中で一つないし複数のコンテナが動く。
Pod自体もサンドボックスコンテナという特殊なコンテナによって構成される。
隔離された論理リソース空間はサンドボックスコンテナ(pauseコンテナ)によって保持されるので、アプリケーションを動かすコンテナが再起動されたりしても論理リソース空間を維持できるという寸法。

# コンテナランタイム
コンテナを実行するためのプログラムはコンテナランタイムと呼ばれる。

実はKubernetes自身はコンテナを起動する機能は持ってない。
ので、kubeletというコンポーネントがコンテナランタイムのAPIやコマンドを叩いてコンテナを起動する。

kubeletとコンテナランタイムとの関係は歴史的なものもあって結構複雑。

## [Docker](https://www.docker.com/)
2013年3月に生まれた、もっとも古くもっともよく知られたコンテナランタイム。
Linuxの[namespaces](https://linuxjm.osdn.jp/html/LDP_man-pages/man7/namespaces.7.html)で論理リソースを隔離し、[cgroups](http://man7.org/linux/man-pages/man7/cgroups.7.html)でハードウェアリソースを隔離し、[Overlay Filesystem](https://en.wikipedia.org/wiki/OverlayFS)でファイルシステムを隔離し、その中でプロセスを起動する。

Dockerと一言で言っても、実際にコンテナを実行する低レベルなコンテナランタイムと、それを使ってコンテナを起動して管理するDocker Daemon (dockerd)と、そのデーモンにリクエストを送るためのDocker Clientに分けられて、さらに時代とともに機能が細分化されていくつかのモジュールで構成されるようになっている。

初期のKubernetes(1.2まで?)はコンテナランタイムはDocker一択で、kubeletからdockerdの内部APIを呼ぶような密連携をしていたそうな。

## [rkt](https://github.com/rkt/rkt)
CoreOS社(現RedHat)が[2014年12月に発表した](https://coreos.com/blog/rocket.html)コンテナランタイム。
当時はRocketと表記してロケットと読んでいたが、商標上の問題があったのかすぐにrktになった。

当時クローズドな性質だったDockerに対抗してか、rktは発表当初からその仕様を[App Container (aka. appc)](https://github.com/appc/spec/)として公開し、オープン感を出していた。
appcにはコンテナイメージ形式やコンテナランタイムなどの仕様が定められ、いくつかの3rdパーティ実装も生まれた。

rktはコンテナを様々な隔離レベルで起動できるのが特徴で、ホストと同じnamespaceで起動して緩く隔離したり、KVMの仮想マシン上で起動して厳密に隔離したりできる。

もう一つの特徴として、Podをネイティブサポートしていることがある。
つまりrktでは、Kubernetes無しでもコンテナはPod内で実行される。

## [Open Container Initiative (OCI)](https://www.opencontainers.org/)
Dockerが流行り過ぎて、コンテナ技術を独占するなオープンにしろという圧力が高まったため、2015年6月、Docker社がしぶしぶ[Open Container Initiative (OCI)](https://www.opencontainers.org/)という団体を立ち上げ、コンテナ技術の標準化に乗り出した。

OCIでは、[(低レベルな)コンテナランタイムの仕様](https://github.com/opencontainers/runtime-spec)のほか、[コンテナイメージフォーマットの仕様](https://github.com/opencontainers/image-spec)や[コンテナレジストリの仕様](https://github.com/opencontainers/distribution-spec)の標準化などを進めた。
OCIの標準に準拠したコンテナランタイムはOCIランタイムと呼ばれる。
OCIランタイムは、JSONファイルでコンテナ構成を受け取り、コマンドラインインターフェースでコンテナの作成、起動、停止をキックする、シンプルな仕様。

CoreOS社もOCIに立ち上げから加わり、appcは2016年後半くらいに更新停止した。
当然の流れとしてrktもOCIに準拠し、2016年7月、rktは[Kubernetes 1.3でサポートされるにいたった](https://kubernetes.io/blog/2016/07/rktnetes-brings-rkt-container-engine-to-kubernetes/)。

## [runC](https://github.com/opencontainers/runc)
OCIの発足と同時にDocker社がOCIランタイムのリファレンス実装として[発表](https://blog.docker.com/2015/06/runc/)したもの。
もともとdockerdに組み込まれていたコンテナランタイムを切り出したもので、Dockerの下請けとしても動くが、[単体で実行してコンテナを起動することもできる](https://www.kaitoy.xyz/2015/07/19/pcap4j-container-with-runc/)。

## [containerd](https://containerd.io/)
OCIを発端とするコンテナランタイムオープン化の流れはとまらず、Docker社はdockerdからさらに機能を切り出し、2015年12月にcontainerdを[発表](https://blog.docker.com/2015/12/containerd-daemon-to-control-runc/)。
runCがOS依存の低レベルな処理をして、containerdがもう少し上のレイヤでコンテナ管理やコンテナイメージ管理を受け持つ感じの役割分担。
containerdはrunCを使ってコンテナを起動して監視する他、コンテナにストレージやネットワークのアタッチをしたり、コンテナイメージのpull・pushをしたりする機能を備え、後にイベントやメトリクスの収集・エクスポートまでするようになった。
もはやdockerdはクライアントからのリクエストをcontainerdに丸投げしてるだけなのかも。

[2015年4月](https://blog.docker.com/2016/04/docker-engine-1-11-runc/)に、containerdとrunCをベースとしたDockerの初のバージョンである1.11がリリースされた。

containerdは2016年12月にv1.0.0に到達し、[コミュニティに寄贈](https://www.docker.com/docker-news-and-press/docker-extracts-and-donates-containerd-its-core-container-runtime-accelerate)された。
containerdの完全OSS化により、Dockerに依存せずともコンテナソリューションが容易に作れるようになり、コンテナエコシステムの成長が加速した。

## [Container Runtime Interface (CRI)](https://github.com/kubernetes/community/blob/master/contributors/devel/sig-node/container-runtime-interface.md)
2016年12月にKubernetes 1.5と合わせて[発表](https://kubernetes.io/blog/2016/12/container-runtime-interface-cri-in-kubernetes/)された、kubeletとコンテナランタイムとの間のインターフェースを標準化する仕様。

CRIの実装は、ImageServiceとRuntimeServiceという二つのgRPCサービスを起動する。
ImageServiceはコンテナイメージのpull、解析、削除を担当し、RuntimeServiceはPodとコンテナのライフサイクルを管理し、コンテナへのexec、attach、port-forwardの仲介もする。

CRIの最初の実装は、kubelet組み込みの[dockershim](https://github.com/kubernetes/kubernetes/tree/v1.14.3/pkg/kubelet/dockershim)というコンポーネントで、kubeletがCRI対応していないdockerdと話すためのもの。

## [Moby](https://mobyproject.org/)
様々な領域、プラットフォーム、ソリューションでコンテナ技術が使われるようになってきたため、エコシステムの発展を加速する要望が高まった。
これに応えるべく立ち上げられたのが、2017年4月にDocker社が[発表](https://blog.docker.com/2017/04/introducing-the-moby-project/)したMobyプロジェクト。
これは、コンテナ技術のライブラリ化とコンポーネント化を進めて再利用したり再構築しやすくし、重複開発や車輪の再発明を防ぎ、サードパーティが効率よく独自のコンテナシステムを開発できるようにすることを目的とするプロジェクト。
この発表後のDockerのリリースは、Mobyをベースにしたものになっている。

発表の少し前、[2017年3月](https://blog.docker.com/2017/03/docker-enterprise-edition/)にDockerが有償版のDocker Enterprise Editionと無償版のDocker Community Editionに分かれ、またバージョニング方法が`1.<メジャーバージョン>.<マイナーバージョン>`という形式から`<リリース年下2桁>.<リリース月2桁>.<リビジョン>`という形式になったりしていたが、これらはMobyへの布石だったと言える。

## [cri-containerd](https://github.com/containerd/cri)
[2017年9月](https://kubernetes.io/blog/2017/11/containerd-container-runtime-options-kubernetes/)、Kubernetes 1.8とともに(v1.0.0のα版として)リリースされたCRI実装。

2018年3月にv1.0.0のRC版として出た時にはcriプラグインという形に変わっていて、containerd 1.1.0に組み込まれた。

## [containerd-shim](https://github.com/containerd/containerd/tree/master/runtime/v2)
2018年10月、[containerd v1.2.0](https://github.com/containerd/containerd/releases/tag/v1.2.0)がリリースされ、同時に[Runtime v2](https://github.com/containerd/containerd/blob/v1.2.6/runtime/v2/README.md)という名のもとにshim APIを公開した。
shim APIの実装はcontainerd-shimと呼ばれ、上位(i.e. containerd)からgRPCのAPIでリクエストを受けて、下位のOCIランタイムを実行する。
この仕組みにより、containerd連携したいOCIランタイムが実装すべきAPIが安定して開発しやすくなった。

OCIランタイムは、containerd-shimから実行されてコンテナを起動するとexitする。
containerd-shimは[subreaper](http://man7.org/linux/man-pages/man2/prctl.2.html)として動いていて、[そのコンテナの親プロセス役を引き継ぎ、コンテナのexitまで面倒をみる](https://github.com/crosbymichael/dockercon-2016/blob/master/Creating%20Containerd.pdf)。
この機能により、containerd-shimさえ動いていれば、dockerdやcontainerdが死んでもコンテナが動き続けられるので、コンテナ無停止のDockerアップデートが可能になるなど利点がある。

runCのところがrunhcsとかKata Containersに入れ替えられる。

## [hcsshim](https://github.com/microsoft/hcsshim)、[runhcs](https://github.com/microsoft/hcsshim/tree/master/cmd/runhcs)

## [Kata Containers](https://katacontainers.io/)
仮想マシンでコンテナを動かす。
runVの後釜?

hyperhq/runv - Hypervisor-based runtime for OCI
clearcontainers/runtime - Hypervisor-based OCI runtime utilising virtcontainers by Intel®.
google/gvisor - gVisor is a user-space kernel, contains runsc to run sandboxed containers.
kata-containers/runtime - Hypervisor-based OCI runtime combining technology from clearcontainers/runtime and hyperhq/runv.

## gVisor
[UML](https://ja.wikipedia.org/wiki/User_Mode_Linux)的に、コンテナからのシステムコールをインターセプトしてカーネルをエミュレートする。

## CRI-O

## [rktlet](https://github.com/kubernetes-incubator/rktlet)
rkt向けCRI実装。
2017年末位にKubernetes 1.9対応して以来開発止まった。

## [frakti](https://github.com/kubernetes/frakti)
CRI実装。低レベルのコンテナランタイムはKata Containers。
2018年末位にKubernetes 1.12対応して以来開発止まった?

v2として、containerdのプラグインになった模様。
https://events.linuxfoundation.org/wp-content/uploads/2017/11/How-Container-Runtime-Matters-in-Kubernetes_-OSS-Kunal-Kushwaha.pdf

## virtlet

## Firecracker
2018年11月

## [Singularity](https://www.sylabs.io/singularity/)
High Performance Computing (HPC)向けコンテナランタイム。
GPUや並列処理(MPI)のサポートがあって高性能で、それでいてセキュア。
科学技術業界やアカデミックな世界では結構使われているらしい。
OCI準拠。CRI実装([Singularity CRI](https://github.com/sylabs/singularity-cri))もある。

# Kubernetesクラスタ構築ツール

## kubeadm

## kops

## kubespray

## Juju

## ansible-k8s

# できあいKubernetesクラスタ

## Minikube

## Docker for Windows、Docker for Mac

## Katacoda

## Play with Kubernetes

# Kubernetesディストリビューション

## OpenShift

## IBM Cloud Provider

## Tectonic

## Stackube

# マネージドKubernetesクラスタ

## EKS

## GCP

## AKS

## IBM Cloud Kubernetes Service

# Kubernetes亜種

## k3s

## MicroK8s

## Usernetes

## virtual-kubelet

# Kubernetesクラスタ管理・監視

## Rancher

## Kubeapps

## Cisco Container Platform

## [Weave Scope](https://www.weave.works/oss/scope/)

# コンテナOS

## Container Linux (a.k.a. CoreOS)

## k3sOS

## RancherOS

# Kubernetesアプリケーション開発ツール

## Draft

## Skaffold

## JenkinsX

## [Tekton Pipelines](https://github.com/tektoncd/pipeline)

## Telepresence

## Kustomize

## stern

## kube-monkey

# パッケージマネージャ

## Helm

# オペレータ

## Operator Framework

## Kubebuilder

# アプリ

## CoreDNS

## Calico

## Weave Net

## Kubernetes Dashboard

## Istio

## [Fluentd](https://www.fluentd.org/)

## [Knative](https://knative.dev/docs/)

## [Ambassador](https://www.getambassador.io/)

## [Argo](https://github.com/argoproj/argo)

## Brigade

## [Rook](https://rook.io/)
