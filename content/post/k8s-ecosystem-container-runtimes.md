---
categories: ["Programming"]
title: "Kubernetesのエコシステム ー コンテナランタイム編"
date: 2019-06-15
cover: "kubernetes.png"
slug: "k8s-ecosystem-container-runtimes"
tags: ["kubernetes", "docker", "containerd"]
draft: false
---

Kubernetesを仕事で使い始めて1年たったので、これまで使ったり見聞きして気になったKubernetesまわりのエコシステムについていくつかの記事にまとめていきたい。
第一弾はコンテナランタイム編。

DockerとかcontainerdとかKata ContainersとかgVisorとかの話。

<!--more-->

{{< google-adsense >}}

# Kubernetes
[Kubernetes](https://kubernetes.io/ja/)はGoogleが2014年6月に発表したコンテナオーケストレーションツール。
単一または複数の物理・仮想マシンでクラスタを構築し、その上でコンテナを起動して、関連するリソース(e.g. 永続化ボリューム)とともに管理できる。
コンテナやそのリソースやそれら間の関連を宣言的に管理できるのと、拡張性が高くていろんなものと連携して一元管理できるのが特長。

Kuberの部分はUserの要領で読んで、Kuとneにアクセントをつけて、クーバーネティスみたいに読むとネイティブっぽい。

# コンテナ
コンテナは一言で言えば軽量な仮想環境。
軽量というのは、ハードウェアをエミュレートしたりするハイパバイザの上で動く仮想マシンに比べて起動時間やリソース消費が少ないという意味。

より詳しく言えばコンテナは、OSのカーネルの機能で論理的に隔離された環境を作り、そこでアプリケーションプロセスを動かす技術。
ホストOSとカーネルを共有するので軽量にできるわけだけど、仮想マシンと比較してホストとの分離が弱いのが欠点と言えば欠点。

中国語だと容器と書く。
容器…

# Pod
Kubernetes上でのワークロードの最小単位はPodと呼ばれる。
PodはKubernetes上の仮想マシンのような概念で、Podごとに論理リソースが隔離され、IPアドレスが割り当てられ、その中で一つないし複数のコンテナが動く。
Pod自体もサンドボックスコンテナという特殊なコンテナによって構成される。
隔離された論理リソース空間はサンドボックスコンテナ(pauseコンテナ)によって保持されるので、アプリケーションを動かすコンテナが再起動されたりしても論理リソース空間を維持できるという寸法。

# コンテナランタイム
コンテナを実行するためのプログラムはコンテナランタイムと呼ばれる。

実はKubernetes自身はコンテナを起動する機能は持ってない。
ので、kubeletというコンポーネントがコンテナランタイムのAPIやコマンドを叩いてコンテナを起動する。

kubeletとコンテナランタイムとの関係は歴史的なものもあって結構複雑。
以下、いろいろあるコンテナランタイムを概ね時系列順に紹介する。

## Docker
[Docker](https://www.docker.com/)は、2013年3月に生まれた(Kubernetes関係では)もっとも古くもっともよく知られたコンテナランタイム。
(実際にはDocker 0.8くらいまでは[LXC](https://linuxcontainers.org/ja/)のラッパ的な感じだったらしいので、コンテナ技術としてはLXCの方が古い。)
Linuxカーネルの機能である[namespaces](https://linuxjm.osdn.jp/html/LDP_man-pages/man7/namespaces.7.html)で論理リソースを隔離し、[cgroups](http://man7.org/linux/man-pages/man7/cgroups.7.html)でハードウェアリソースを隔離し、union filesystem(e.g. [aufs](https://ja.wikipedia.org/wiki/Aufs), [OverlayFS](https://en.wikipedia.org/wiki/OverlayFS))でファイルシステムを隔離し、その中でプロセスを起動する。
さらに[SELinux](https://ja.wikipedia.org/wiki/Security-Enhanced_Linux)でファイルアクセスを制限したり、[seccomp](http://man7.org/linux/man-pages/man2/seccomp.2.html)でシステムコールを制限したり、[AppArmor](https://ja.wikipedia.org/wiki/AppArmor)でcapabilityを制限したりもできる。

Dockerと一言で言っても、実際にコンテナを実行する低レベルなコンテナランタイムと、それを使ってコンテナを起動して管理するDocker Daemon (dockerd)と、そのデーモンにリクエストを送るためのDocker Clientに分けられて、さらに時代とともに機能が細分化されていくつかのモジュールで構成されるようになっている。

初期のKubernetes(1.2まで?)はコンテナランタイムはDocker一択で、kubeletからdockerdの内部APIを呼ぶような密連携をしていたそうな。

![cr1.png](/images/k8s-ecosystem-container-runtimes/cr1.png)

## rkt
[rkt](https://github.com/rkt/rkt)はCoreOS社(現Red Hat)が[2014年12月に発表した](https://coreos.com/blog/rocket.html)コンテナランタイム。
当時はRocketと表記してロケットと読んでいたが、商標上の問題があったのかすぐにrktになった。

当時クローズドな性質だったDockerに対抗してか、rktは発表当初からその仕様を[App Container (aka. appc)](https://github.com/appc/spec/)として公開し、オープン感を出していた。
appcにはコンテナイメージ形式やコンテナランタイムなどの仕様が定められ、いくつかの3rdパーティ実装も生まれた。

rktはコンテナを様々な隔離レベルで起動できるのが特徴で、ホストと同じnamespaceで起動して緩く隔離したり、KVMの仮想マシン上で起動して厳密に隔離したりできる。

もう一つの特徴として、Podをネイティブサポートしていることがある。
つまりrktでは、Kubernetes無しでもコンテナはPod内で実行される。

![cr13.png](/images/k8s-ecosystem-container-runtimes/cr13.png)

図のstage 1の部分がプラガブルで、[そこを入れ替えることでコンテナの隔離レベルが変わる](https://github.com/rkt/rkt/blob/master/Documentation/devel/architecture.md)。
[fly](https://github.com/rkt/rkt/blob/master/Documentation/running-fly-stage1.md)というのは一番緩いstage 1実装。
Goで書かれた単一バイナリのrktコマンドがstage 0として実行され、stage 1実装に[exec()](https://linuxjm.osdn.jp/html/LDP_man-pages/man3/exec.3.html)で化け、stage 2としてアプリケーションを実行する。

## Windows Containers
Windowsにもコンテナ対応が。

[2015年4月](https://blogs.msdn.microsoft.com/msgulfcommunity/2015/06/20/what-is-windows-server-containers-and-hyper-v-containers/)にMicrosoftから[Windows Containers](https://docs.microsoft.com/en-us/virtualization/windowscontainers/about/)が発表され、2015年8月にWindows Server 2016のプレビュー版で[実際に触れるようになった](https://www.kaitoy.xyz/2016/01/22/pcap4j-meets-windows-containers/)。
Windows ContainersはWindows上でWindowsとLinuxのコンテナを動かせる機能で、Dockerのクライアントから操作できる。
(初期はPowerShellのコマンドレットでも操作できたけど、こちらのインターフェースはすぐに廃止された。)

その後[2017年1月](https://techcommunity.microsoft.com/t5/Containers/Introducing-the-Host-Compute-Service-HCS/ba-p/382332)、Windows Containersを実現するための機能を提供するサービスであるHost Compute Service (HCS)が発表された。
この頃はWindows版DockerはこのHCSにべったりな実装だった。

![cr7.png](/images/k8s-ecosystem-container-runtimes/cr7.png)

## Open Container Initiative (OCI)
Dockerが流行り過ぎて、コンテナ技術を独占するなオープンにしろという圧力が高まったため、2015年6月、Docker社がしぶしぶ[Open Container Initiative (OCI)](https://www.opencontainers.org/)という団体を立ち上げ、コンテナ技術の標準化に乗り出した。

OCIでは、[(低レベルな)コンテナランタイムの仕様](https://github.com/opencontainers/runtime-spec)のほか、[コンテナイメージフォーマットの仕様](https://github.com/opencontainers/image-spec)や[コンテナレジストリの仕様](https://github.com/opencontainers/distribution-spec)の標準化などを進めた。
OCIの標準に準拠したコンテナランタイムはOCIランタイムと呼ばれる。
OCIランタイムは、JSONファイルでコンテナ構成を受け取り、コマンドラインインターフェースでコンテナの作成、起動、停止をキックする、シンプルな仕様。

CoreOS社もOCIに立ち上げから加わり、appcは2016年後半くらいに更新停止した。
当然の流れとしてrktもOCIに準拠し、2016年7月、rktは[Kubernetes 1.3でサポートされるにいたった](https://kubernetes.io/blog/2016/07/rktnetes-brings-rkt-container-engine-to-kubernetes/)。

## runC
OCIの発足と同時に、Docker社がOCIランタイムのリファレンス実装として[runC](https://github.com/opencontainers/runc)(ランシー)を[発表](https://blog.docker.com/2015/06/runc/)。
もともとdockerdに組み込まれていたコンテナランタイムを切り出したもので、Dockerの下請けとしても動くが、[単体で実行してコンテナを起動することもできる](https://www.kaitoy.xyz/2015/07/19/pcap4j-container-with-runc/)。

![cr2.png](/images/k8s-ecosystem-container-runtimes/cr2.png)

この図ではrunCがコンテナの親プロセスみたいに見えるけど、実際はrunCはコンテナを起動するとexitして、コンテナの親プロセスはdockerdになる。


## Clear Containers
少し遡って2015年5月、インテルもコンテナ業界に参戦していた。
カーネルを共有するコンテナはセキュアじゃないから、仮想マシンでカーネルを分離しようと言い出し、そのための軽量Linuxとして[Clear Linux](https://clearlinux.org/)を[発表](https://www.publickey1.jp/blog/15/clear_linux_project.html)。
これはKVM(QEMU)の仮想マシン上でIntel VT-xのサポートを受けて高速(200msくらい)に起動し、一つのコンテナをホストする。
QEMUもインテルのカスタマイズ版([qemu-light](https://github.com/intel/qemu-lite))を使ったりしている。
こうしたコンテナや、その周辺技術がClear Containersと呼ばれる。

とりあえずコンセプトが近しいrktをサポートして、OCIが出てからはOCIランタイムの[cc-oci-runtime](https://github.com/intel/cc-oci-runtime/tree/master)(後の[cc-runtime](https://github.com/clearcontainers/runtime))に加えて[cc-shim](https://github.com/clearcontainers/shim)と[cc-proxy](https://github.com/clearcontainers/proxy)を作ってDockerとかからも使えるようになった。
これらのコンポーネントは、`kata-*`に名前を変えて後述のKata Containersに受け継がれることになる。

## hyper、runV
Clear Containersの発表と同時期の2015年5月、中国のチーム(のちのHyper社)が[hyper](https://github.com/hyperhq/hyperd/tree/v0.1)というコンテナランタイムを公開した。
これは、Dockerクライアントのようなインターフェースで、QEMUの仮想マシンでコンテナを起動するClear Containersのようなツール。
当初からPodネイティブ。

2015年8月に出たv0.3では[runV](https://github.com/hyperhq/runv)というOCIランタイムをスピンオフ。
2016年5月に出たv0.6からはHyperContainerに名前を変えて、[デーモンのhyperdとクライアントのhyperctl](https://github.com/hyperhq/hyperd/tree/v0.6.0)という構成になった。
このあたりでHyper社は[Hyper.sh](https://github.com/hyperhq/www.hyper.sh)というContainer as a Serviceを開始して、hyperコマンドはそのサービス上でコンテナを起動するツールになった。

その後Hyper社は、[Kubernetesのディストリビューション](https://github.com/hyperhq/hypernetes)を開発したり、インテルと協業(後述)したりして、業界でそれなりの存在感を示していたんだけど、Hyper.shは2019年1月に[突然閉鎖](https://news.ycombinator.com/item?id=18734658)され、ブログも消えてしまったし、[2018年5月に発表されたばかり](https://twitter.com/hyper_sh/status/994903266659110912)の[pi](https://github.com/hyperhq/pi)というサーバレスKubernetesサービスもアクセスできなくなって、何だか中国の闇を感じる。

## containerd
Dockerオープン化の流れは止まらず、Docker社はdockerdからさらに機能を切り出し、2015年12月に[containerd](https://containerd.io/)を[発表](https://blog.docker.com/2015/12/containerd-daemon-to-control-runc/)。
runCがOS依存の低レベルな処理をして、containerdがもう少し上のレイヤでコンテナ管理やコンテナイメージ管理を受け持つ感じの役割分担。
containerdはrunCを使ってコンテナを起動して監視する他、コンテナにストレージやネットワークのアタッチをしたり、コンテナイメージのpull・pushをしたりする機能を備え、後にイベントやメトリクスの収集・エクスポートまでするようになった。
もはやdockerdはクライアントからのリクエストをcontainerdに丸投げしてるだけなのかも。

[2016年4月](https://blog.docker.com/2016/04/docker-engine-1-11-runc/)にリリースされたDocker 1.11が、containerdとrunCをベースとした初のバージョンとなった。

![cr3.png](/images/k8s-ecosystem-container-runtimes/cr3.png)

(containerd-shimについては後述。)

containerdは2017年3月に[コミュニティに寄贈](https://www.docker.com/docker-news-and-press/docker-extracts-and-donates-containerd-its-core-container-runtime-accelerate)された。
containerdの完全OSS化により、Dockerに依存せずともコンテナソリューションが作りやすくなり、コンテナエコシステムの成長が加速した。

## Singularity
[Singularity](https://www.sylabs.io/singularity/)はHigh Performance Computing (HPC)向けコンテナランタイム。
Sylabs社が開発していて、2016年4月にv1.0がリリースされて以来、現在も割と活発に更新されている。
GPUや並列処理(MPI)のサポートがあって高性能で、それでいてセキュア。
科学技術業界やアカデミックな世界では結構使われているらしい。
OCI準拠。[Singularity CRI](https://github.com/sylabs/singularity-cri)というCRI実装(後述)もある。

## CRI
[Container Runtime Interface (CRI)](https://github.com/kubernetes/community/blob/master/contributors/devel/sig-node/container-runtime-interface.md)は、2016年12月にKubernetes 1.5と合わせて[発表](https://kubernetes.io/blog/2016/12/container-runtime-interface-cri-in-kubernetes/)された、kubeletとコンテナランタイムとの間のインターフェースを標準化する仕様。

CRIの実装は、ImageServiceとRuntimeServiceという二つのgRPCサービスを起動する。
ImageServiceはコンテナイメージのpull、解析、削除を担当し、RuntimeServiceはPodとコンテナのライフサイクルを管理し、コンテナへのexec、attach、port-forwardの仲介もする。

CRIの最初の実装は、kubelet組み込みの[dockershim](https://github.com/kubernetes/kubernetes/tree/v1.14.3/pkg/kubelet/dockershim)というコンポーネントで、kubeletがCRI対応していないdockerdと話すためのもの。

![cr4.png](/images/k8s-ecosystem-container-runtimes/cr4.png)

## CRI-O
少し遡って[2016年9月22日](https://www.redhat.com/en/blog/running-production-applications-containers-introducing-ocid)、Red HatがOCIDというコンテナランタイムを発表した。
機能的にはDockerと同じで、runCを始めとしたOCIランタイムでコンテナを起動して管理したり、コンテナイメージを管理したりするものだけど、Dockerとは協力して仲良くやっていくよと言うわざとらしいアナウンスをしていた。

発表直後の[9月28日](https://github.com/cri-o/cri-o/commit/2378800c9d6e520df0628abca4ca3378daf486ae)に突如名前を[CRI-O](https://cri-o.io)(クライオ)に変えて、当時まだ正式発表前でほとんど知られていなかったCRIにがっつり乗っかったのは、Kubernetesコミュニティと裏で連携をとって何かを企んだことを想像させる。
ちょうどこのころ[Docker社は四面楚歌な感じ](http://blog.gachapin-sensei.com/archives/5174099.html)だったし。
(因みに、CRI実装で、OCIランタイムとつながるので、OCIのOをとってCRI-O、らしい。)

CRI-Oは[2017年10月に1.0.0リリースを迎えた](https://medium.com/cri-o/cri-o-1-0-is-here-d06b97b92a98)。
時期的にはKubernetes 1.8がでたちょっと後くらいだったけど、まだKubernetes 1.7ベースだった。
このリリース発表では、Dockerプロジェクトをちょっとディスりつつ、Kubernetesで使うならCRI-Oの方が安定してるしオープンだしコミュニティとも仲いいぜってメッセージを発信。
この頃すでに、コンテナイメージレジストリと話す[skopeo](https://github.com/containers/skopeo)、コンテナイメージをビルドする[Buildah](https://buildah.io/)、Podを扱う[kpod](https://medium.com/cri-o/introducing-kpod-f06109b96374)(現[Podman](https://podman.io/))の開発が進んでいて、1年後くらいには``Simply put: `alias docker=podman\` ``とか公式マニュアルで言ってた。

で、[2019年2月](https://www.redhat.com/ja/blog/red-hat-enterprise-linux-8-beta-new-set-container-tools)についに、RHEL 8からDockerパッケージが無くなることが発表された。

![cr12.png](/images/k8s-ecosystem-container-runtimes/cr12.png)

[conmon](https://github.com/containers/conmon)というのはcontainerd-shim (後述)と同様の働きをするデーモン。

## rktlet
[rktlet](https://github.com/kubernetes-incubator/rktlet)はrkt向けのCoreOS社製CRI実装。
OCIDと同時期に開発されていたようで、CRIの発表のなかで触れられている。
2017年末位にKubernetes 1.9対応して以来開発止まった。

## Frakti
[Frakti](https://github.com/kubernetes/frakti)(フラクティ)もCRIと同時に発表された、HyperContainer向けのCRI実装。
2017年3月に初バージョンの0.1がリリースされ、Kubernetes 1.6.0で使えるようになった。

Kata Containers (後述)が出たあと、[Frakti v2でそっちに移行する計画](https://events.linuxfoundation.org/wp-content/uploads/2017/11/How-Container-Runtime-Matters-in-Kubernetes_-OSS-Kunal-Kushwaha.pdf)が示されていたけど実現せず、2018年11月にv1.12.0でKubernetes 1.12対応して以来開発止まった模様。
Kata Containersプロジェクトに吸収された?

## nvidia-docker、NVIDIA Container Runtime、NVIDIA Container Toolkit
少し遡って2017年1月、GPUのリーディングベンダであるNVIDIAが、[nvidia-docker](https://github.com/NVIDIA/nvidia-docker/tree/v1.0.0)の初GA版をリリースした。
これは、コンテナからNVIDIAのGPUを使うためのコンテナランタイム。
この頃はOCIとかに対応してなくて、`docker`コマンドの代わりに`nvidia-docker`コマンドを使う、という使い方だった。

その後、2017年12月にv2系である[nvidia-docker2](https://github.com/NVIDIA/nvidia-docker/tree/v2.0.2)に移行して、OCIランタイムである[NVIDIA Container Runtime](https://developer.nvidia.com/nvidia-container-runtime)を使うようになった。
NVIDIA Container Runtimeはruncを改造してNVIDIAのGPUを使えるようにしたもので、普通のDockerから使える。

さらに、2019年7月に[Docker 19.03](https://docs.docker.com/engine/release-notes/#19030)がリリースされてNVIDIA GPUがネイティブサポートされたのを受けて、v3系の[NVIDIA Container Toolkit](https://github.com/NVIDIA/nvidia-docker/tree/master)を開発中の模様。

## Moby
様々な領域、プラットフォーム、ソリューションでコンテナ技術が使われるようになってきたため、エコシステムの発展をさらに加速する要望が高まった。
これに応えるべく立ち上げられたのが、2017年4月にDocker社が[発表](https://blog.docker.com/2017/04/introducing-the-moby-project/)した[Moby](https://mobyproject.org/)プロジェクト。
これは、コンテナ技術のライブラリ化とコンポーネント化を進めて再利用したり再構築しやすくし、重複開発や車輪の再発明を防ぎ、サードパーティが効率よく独自のコンテナシステムを開発できるようにすることを目的とするプロジェクト。
この発表後のDockerのリリース(v17.06以降)はMobyをベースにしたものになっている。

発表の少し前、[2017年3月](https://blog.docker.com/2017/03/docker-enterprise-edition/)にDockerが有償版のDocker Enterprise Editionと無償版のDocker Community Editionに分かれ、またバージョニング方法が`1.<メジャーバージョン>.<マイナーバージョン>`という形式(v1.13.1まで)から`<リリース年下2桁>.<リリース月2桁>.<リビジョン>`という形式(v17.03.0以降)になったりしていたが、これらはMobyへの布石だったと言える。

## railcar
Oracleがコンテナ業界に取り残されているのを危惧したのか、2017年6月にOCIランタイムの  [railcar](https://github.com/oracle/railcar)をリリースした。
今更感がすごいし、機能的にはrunCの劣化版だし、Rustで書かれている以外に特徴はなく、全くやる気が感じられない。

ひと月くらいパッチ出してたけどすぐに開発止まった。

## virtlet
[virtlet](https://github.com/Mirantis/virtlet)はMirantisが開発するCRI実装。
QEMUの仮想マシンをPodとしてKubernetesで管理できるようにしてくれる。
2017年6月に公開版としては初版のv0.7.0がリリースされた。

Fraktiとかとは異なり、コンテナを仮想マシンでラップするわけではなく、仮想マシン上で直接ワークロードを動かすのが特徴。
virtlet用の[PodのKubernetesマニフェスト](https://docs.virtlet.cloud/reference/vm-pod-spec/)はCRDじゃなくて標準の形式だけど、`containers`の`image`に書かれたものは、コンテナイメージとしてDocker Hubとかからpullされるのではなく、[qcow2](https://www.linux-kvm.org/page/Qcow2)のイメージとしてvirtletのレジストリからダウンロードされる。
[CRI Proxy](https://github.com/Mirantis/criproxy)を使うことで、一つのKubernetesクラスタ上で普通のコンテナワークロードとvirtletの仮想マシンワークロードを同居させられる。

![cr11.png](/images/k8s-ecosystem-container-runtimes/cr11.png)

virtlet managerがCRIクライアント(e.g. kubelet)からのリクエストを受けて、vmwrapperがvirtlet managerからのリクエストを受けて[libvirt](https://ja.wikipedia.org/wiki/Libvirt)で仮想マシンの起動などのライフサイクル管理する。
CRI Proxyの下で動くdockershimはkubelet組み込みのやつで、kubeletに特定のオプションを付けて起動するもの。

そんなに活発に開発されている感じではないけど、とりあえず現時点で最新のKubernetes 1.14まではついてきている。
替えのないプロジェクトなので頑張ってほしい。

## cri-containerd
[cri-containerd](https://github.com/containerd/cri)はkubeletから独立したCRI実装(cf. dockershim)で、[2017年9月](https://kubernetes.io/blog/2017/11/containerd-container-runtime-options-kubernetes/)にKubernetes 1.8とcontainerd 1.0.0とともにv1.0.0のα版がリリースされた。
containerdと直接話せるので、Kubernetesにはdockerdが要らなくなった。

![cr5.png](/images/k8s-ecosystem-container-runtimes/cr5.png)

cri-containerdは、2018年3月にv1.0.0のRC版として出た時にはcriプラグインという形に変わっていて、containerd 1.1.0に組み込まれた。

![cr6.png](/images/k8s-ecosystem-container-runtimes/cr6.png)

## Kata Containers
[2017年12月](https://www.openstack.org/news/view/365/kata-containers-project-launches-to-build-secure-container-infrastructure)、インテルのClear ContainersとHyper社のrunVの技術を組み合わせたコンテナランタイムのプロジェクトとして、[Kata Containers](https://katacontainers.io/)がOpenStack Foundationのもとで立ち上げられた。
プロジェクトをサポートする企業にはインテル、Google、Red Hatなんかもいるが、Huawei、ZTE、China Mobile、JD.com、99cloud、AWcloud、EasyStack、Fiberhome、Tencent、Ucloud、UnitedStackといった中国の名だたる企業が中心で、ロゴも赤く、なんか赤い。

Clear Linux(等)の仮想マシンでコンテナを動かすのはClear Containersと一緒だけど、インテルから離れたことでAMDやARMなどを含む色んなハードウェアに対応する方針になった。
ハイパバイザもQEMU以外もサポートする方針で、最近[AWSのFirecracker](https://github.com/firecracker-microvm/firecracker)に[対応した](https://aws.amazon.com/jp/blogs/opensource/kata-containers-1-5-firecracker-support/)。
因みにKataはギリシャ語の信頼するという単語と、日本語の(舞踊の)型が由来。
(いまいちピンとこない。)

当初のKata Containersのコンポーネントには、OCIランタイムのkata-runtimeと、containerd-shimに対してコンテナのふりをするkata-shimと、仮想マシン上で動いてコンテナの面倒を見るkata-agentと、kata-shimとkata-agentとの間の通信を仲介するkata-proxyがあった。

![cr9.png](/images/k8s-ecosystem-container-runtimes/cr9.png)

kata-runtimeはコンテナ(とkata-proxyと仮想マシンとkata-shim)を起動したらexitするはず。
kata-runtimeとkata-shimはコンテナごとに起動されて、kata-proxyと仮想マシンとkata-agentはPodごとに起動される。

Kata Containers 1.5では、shim API (後述)が出たので、その実装であるcontainerd-shim-kata-v2がkata-runtimeとkata-shimとkata-proxyの役割を兼ねるようになり、起動するプロセス数がかなり減ったけど、containerdべったりになった。

![cr10.png](/images/k8s-ecosystem-container-runtimes/cr10.png)

containerd-shim-kata-v2のOCIランタイムの上位とのAPIは要らない形になって多分なくなった。
CRI-Oとかと連携するためには従来のkata-runtime、kata-shim、kata-proxyを使う模様。

## hcsshim、runhcs
KubernetesのWindows Containers対応も進み、2017年12月にでた[Kubernetes 1.9](https://kubernetes.io/blog/2017/12/kubernetes-19-workloads-expanded-ecosystem/)でWindows Containersのサポートがベータになり、KubernetesクラスタのノードにWindows Serverが使えるようになった。

この頃には、コンテナランタイムの標準化とDockerのモジュール化の流れを汲み、Windows版DockerとHCSとの間にWindows版containerdと[hcsshim](https://github.com/microsoft/hcsshim)と[runhcs](https://github.com/microsoft/hcsshim/tree/master/cmd/runhcs)が入るようになっていたようだ。
runhcsはrunCのフォークでOCIランタイム。
hcsshimは下記shim API実装のrunhcs向け版。

KubernetesのWindows Containers対応は、2019年3月にリリースされた[Kubernetes 1.14](https://kubernetes.io/blog/2019/03/25/kubernetes-1-14-release-announcement/)でGAになった。

![cr8.png](/images/k8s-ecosystem-container-runtimes/cr8.png)

## runq
[runq](https://github.com/gotoz/runq)はIBM Researchが開発し、[2018年3月](http://containerz.blogspot.com/2018/03/runq.html)に公開したOCIランタイム。
もともと[IBM Blockchain Platform](https://www.ibm.com/blockchain/platform)で使われていたものをOSS化したもの。

QEMUで軽量VMを動かしてその中でコンテナを実行するので、Kata Containersみたいな感じ。
x86の普通のLinuxに加えて、[IBM Z](https://www.ibm.com/jp-ja/it-infrastructure/z)というメインフレーム上で動く(!)のが大きな特徴。

runqの成果は[2018年12月にKata Containersに取り込まれ](https://containersonibmz.com/2018/12/19/kata-containers-now-also-on-ibm-z/)、Kata ContainersもIBM Zをサポートした。

## gVisor
[2018年5月](https://cloud.google.com/blog/products/gcp/open-sourcing-gvisor-a-sandboxed-container-runtime)、Googleが[gVisor](https://gvisor.dev/)を発表した。
これはGoで書かれた[UML](https://ja.wikipedia.org/wiki/User_Mode_Linux)のようなもので、ユーザーランドで動き、カーネルをエミュレートする。
gVisorの上でコンテナを起動するためのOCIランタイムとして[runsc](https://github.com/google/gvisor/tree/master/runsc) (Run Sandboxed Containerの略)が提供されている。
OCIランタイムなので当然DockerとかcontainerdとかKubernetesとかと使える。

普通のコンテナみたいにホストとカーネルを共有しないのでセキュアだけど、Kata Containersとかみたいに仮想マシンベースでもないので軽いのが特徴。
ただしすべてのシステムコールをサポートするわけではないので、動かせないアプリもある。
Node.js、Java、MySQL、Apache HTTP Server、Redisなんかは動くらしいのでだいたい大丈夫そうだけど。

システムコールが本当のカーネルよりも遅いので、じゃんじゃんシステムコールするアプリには向かない。

![gvisor-descr.png](/images/k8s-ecosystem-container-runtimes/gvisor-descr.png)

[Sentry](https://gvisor.dev/docs/architecture_guide/overview/#sentry)がユーザーランドで動くカーネル。
Sentryはファイルシステムにアクセスできないので、ファイルシステム周りの処理は9Pというプロトコルを介して[Gofer](https://gvisor.dev/docs/architecture_guide/overview/#gofer)に移譲する。

## Nabla Containers
[Nabla Containers](https://nabla-containers.github.io/)(ナブラコンテイナーズ)はIBM Researchが開発したもう一つのコンテナランタイム。
2018年7月に[発表](https://japan.zdnet.com/article/35122760/)された。

コンテナをホストカーネルから分離するために間に仮想化レイヤを挟むという点はgVisorやKata Containersと似ているけど、プロセスとしての[Unikernel](https://en.wikipedia.org/wiki/Unikernel)というアイデアに基づいているのが最大の特徴。

Unikernelは、[ライブラリOS](https://en.wikipedia.org/wiki/Operating_system#Library)というOSの個々の機能をライブラリ化したものと、アプリケーションのコードを一つにビルドして生成する、軽量な単一目的なVMイメージと捉えられる。
Unikernelは特殊なハイパバイザの上で直接起動し、[単一アドレス空間](https://en.wikipedia.org/wiki/Single_address_space_operating_system)で動くので、仮想メモリのオーバヘッドやユーザ空間とカーネル空間との間のメモリコピーなどが無くて高速。

Nabla ContainersはこれもIBM Research製の[Solo5](https://github.com/Solo5/solo5)というハイパバイザ上で、[Rumprun](https://github.com/rumpkernel/rumprun)(等)ベースのUnikernelを実行する。
Unikernelからのカーネル機能実行(hypercall)はSolo5によってホストカーネルへのシステムコールに変換されるんだけど、Solo5は7つのシステムコールしか使わないのでかなりセキュア。

Nabla Containers用のOCIランタイムとして、[runnc](https://github.com/nabla-containers/runnc)が提供されている。
ランタイムはOCI準拠なのでDockerからも使えるけど、コンテナイメージがOCI準拠じゃないので、Dockerイメージは動かせない。
特殊なベースイメージからビルドしなおす必要がある。

![nabla-descr.png](/images/k8s-ecosystem-container-runtimes/nabla-descr.png)

Nabla Containersはまだまだ開発途上で、そもそもUnikernel自体が成熟した技術ではないのもあって制限事項が沢山ある。
書き込めるファイルシステムが`/tmp`しかないとか、ボリュームマウントできないとか、[提供されているパッケージ](https://github.com/rumpkernel/rumprun-packages)が全然少ないとか、プロセスforkできないとか。

ちょっとまだ使い物にならない…

## containerd-shim
2018年10月、[containerd v1.2.0](https://github.com/containerd/containerd/releases/tag/v1.2.0)がリリースされ、同時に[Runtime v2](https://github.com/containerd/containerd/blob/v1.2.6/runtime/v2/README.md)という名のもとにshim API v2を公開した。(v1はクローズドだったので公開APIとしては初版。)
shim APIの実装は[containerd-shim](https://github.com/containerd/containerd/tree/master/runtime/v2)と呼ばれ、上位(i.e. containerd)からgRPCのAPIでリクエストを受けて、下位のOCIランタイムを実行する。
実はcontainerd-shim自体はDocker 1.11の頃から存在していたので、このタイミングでAPIがオープンになったというだけ。
このオープン化により、containerd連携したいOCIランタイムが実装すべきAPIが安定して開発しやすくなった。

OCIランタイムは、containerd-shimから実行されてコンテナを起動するとexitする。
containerd-shimは[subreaper](http://man7.org/linux/man-pages/man2/prctl.2.html)として動いていて、[そのコンテナの親プロセス役を引き継ぎ、コンテナのexitまで面倒をみる](https://github.com/crosbymichael/dockercon-2016/blob/master/Creating%20Containerd.pdf)。
この機能により、containerd-shimさえ動いていれば、dockerdやcontainerdが死んでもコンテナが動き続けられるので、コンテナ無停止のDockerアップデートが可能になるなど利点がある。

## crun
[crun](https://github.com/giuseppe/crun)は2019年1月に公開されたOCIランタイム。
Red Hatの中の人が開発しているが、現時点ではRed Hat公式のものではなさそう。

Cで書かれているのが特徴で、Goで書かれているruncより倍ぐらい速いと自称している。
CRI-Oでサポートされているので先は結構明るい。

Red Hatによるコンテナエコシステムに唯一残っているDocker社の痕跡がrunCなので、これを排除するための刺客なのではなかろうか。

# まとめ
コンテナランタイムは奥が深くてまだ進化の過程。

結局どのコンテナランタイムにすればいいか迷ったときのためのフローチャートを書いた。

![flow.png](/images/k8s-ecosystem-container-runtimes/flow.png)

<br>

社内勉強会向けに[impress.js](https://github.com/impress/impress.js/)で発表資料にもした。

https://github.com/kaitoy/chronicle-container-runtimes
