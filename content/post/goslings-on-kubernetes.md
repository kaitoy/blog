+++
categories = [ "Programing" ]
date = "2017-10-10T00:10:59+09:00"
draft = false
eyecatch = "kubernetes_goslings.png"
slug = "goslings-on-kubernetes"
tags = [ "goslings", "kubernetes", "minikube", "docker" ]
title = "Kubernetes 1.8が出たので、Minikubeを触ってみる"
+++

[Kubernetes](https://kubernetes.io/)1.8のリリースが話題になっていたので、ちょっと触って見たという話。
(1.8を触ったとは言っていない。)

具体的には、[Kubernetes Basics](https://kubernetes.io/docs/tutorials/kubernetes-basics/)というチュートリアルをやりながら、[Minikube](https://github.com/kubernetes/minikube)に[Goslings](https://kaitoy.github.io/goslings/)をデプロイしたんだけど、この記事ではMinikubeをセットアップしたところまで。

{{< google-adsense >}}

## Kubernetesとは
KubernetesはOSSのコンテナオーケストレーションツール。
英語だとクーバネティスみたいに発音する。
Googleが自身のコンテナ技術である[Borg](https://research.google.com/pubs/pub43438.html)の運用で培ったノウハウを活かして開発したもの。
2014年ころに開発が始まり、2015年夏にv1がリリースされたということで、かなり新しいツール。
よく比べられるものには[DockerのSwarmモード](https://docs.docker.com/engine/swarm/)や[Apache Mesos](http://mesos.apache.org/)があるが、何が違うのかは調べてないので知らない。
ただ、Dockerコンテナ管理ツールとしてはKubernetesが一番勢いがある雰囲気を感じる。

(2017/10/18追記: [DockerがKubernetesとの統合を発表](http://www.publickey1.jp/blog/17/dockerkubernetesdockercon_eu_2017.html)した。KubernetesはDockerネイティブなツールになり、Dockerとともにインストールされ、Docker ComposeのConposeファイルでデプロイできるようになったりする。Kubernetesの大勝利っぽい。)

Kubernetesを使うと、複数の物理マシンからなるHAクラスタ(Kubernetesクラスタ)を構成し、その上にコンテナをデプロイして管理できる。
Kubernetesクラスタは、一つのMaster(a.k.a. Kubernetes Control Plane)と一つ以上のNode(昔はMinionと呼ばれてたもの)で構成される。
(MasterとNodeは同一マシンに同居もできる。)
Masterはクラスタを管理し、コンテナのスケジューリング、状態管理、スケーリング、アップデートなどを担う。
Node上では実際にコンテナが実行される。

Kubernetesの[アーキテクチャ](https://github.com/kubernetes/community/blob/master/contributors/design-proposals/architecture/architecture.md)を図にすると以下の感じ。
矢印の向きとかはちょっと間違ってるかも。

![architecture](/images/goslings-on-kubernetes/architecture.png)

<br>

Master上では[kube-apiserver](https://kubernetes.io/docs/admin/kube-apiserver/)が動き、[Kubernetes API](https://kubernetes.io/docs/concepts/overview/kubernetes-api/)というREST APIを公開する。
このAPIを通して[Kubernetesオブジェクト](https://kubernetes.io/docs/concepts/overview/working-with-objects/kubernetes-objects/)を定義したりすることで、宣言的にコンテナの管理ができる仕組み。
ユーザは普通、[kubectl](https://kubernetes.io/docs/user-guide/kubectl/)というコマンドでkube-apiserverとやり取りする。

KubernetesオブジェクトはMaster上の[etcd](https://github.com/coreos/etcd)によって分散キーバリューストアに永続化され、そのストアを[kube-controller-manager](https://kubernetes.io/docs/admin/kube-controller-manager/)と[kube-scheduler](https://kubernetes.io/docs/admin/kube-scheduler/)がwatchしてて、変更に応じた処理をする。

kube-controller-managerは、ノードの管理や、オブジェクトのライフサイクルの管理や、コンテナのスケーリングなど、クラスタレベルの機能を実行する。
(よくわからない。)

kube-schedulerは、コンテナを実行するホストを選出し、コンテナのスケジューリングをする。

あと、図にはないけど、[cloud-controller-manager](https://kubernetes.io/docs/admin/cloud-controller-manager/)というのがMasterで動いていて、クラウドプラットフォームとやり取りしてクラウド固有の仕事をしているらしい。
クラウドベンダじゃなければ気にしなくて良さそう。

<br>

一方、各Nodeでは、[kubelet](https://kubernetes.io/docs/admin/kubelet/)というMasterのエージェントになるプロセスが動く。

kubeletはkube-apiserverからの指示で、コンテナイメージを取得してコンテナを起動したり監視したり止めたりする。

kubeletがコンテナを扱うためのコンテナランタイムは、普通は[Docker](https://www.docker.com/)だけど、[rkt](https://coreos.com/rkt/)とか[cri-o](https://github.com/kubernetes-incubator/cri-o)とか[frakti](https://github.com/kubernetes/frakti)とかも使える。[runc](https://github.com/opencontainers/runc)や[RailCar](https://github.com/oracle/railcar)はどうなんだろう。

コンテナはデフォルトではクラスタ内のプライベートネットワークにつながるので、そこで動いているアプリにユーザからアクセスするには、何らかの形でトラフィックを中継してやる必要がある。
これをするのが[kube-proxy](https://kubernetes.io/docs/admin/kube-proxy/)。
ロードバランシングもしてくれる。

## Kubernetesオブジェクトとは
Kubernetesオブジェクトは、Kubernetesクラスタ上で機能する構成要素を表現するもの。
オブジェクトは[specとstatus](https://kubernetes.io/docs/concepts/overview/working-with-objects/kubernetes-objects/#object-spec-and-status)を持ち、オブジェクトに期待する状態やふるまい(spec)を定義しておくと、Kubernetesが実際の状態(status)をそれに合わせてくれる。
宣言的。

オブジェクトには以下のようなものがある。

* [Pod](https://kubernetes.io/docs/concepts/workloads/pods/pod-overview/)

    デプロイの最小単位。
    一つ(またはリソースを共有する複数)のコンテナと、ストレージ、ネットワークなどを内包する。
    一つのPodには一つのIPアドレスが付く。

    kubeletはPodの定義に従ってコンテナを起動する。

* [Service](https://kubernetes.io/docs/concepts/services-networking/service/)

    Podの論理グループ。
    PodのIPアドレスは外部に公開されないので、外とのやり取りをするためにServiceがある。
    kube-proxyはこいつの定義に従って働く。

    Serviceには複数のEndpoint(i.e. Pod等)が紐づき、外部からのトラフィックをラウンドロビンでルーティングするので、冗長化やロードバランサ的な働きもする。
    ServiceはPodを抽象化するので、Podが死んだり入れ替わったりしても外に影響が見えにくくなる。

    Serviceには以下のtypeがある。

    * ClusterIP (デフォルト): Kubernetesクラスタ内からだけアクセスできる内部IPアドレスだけをもつ。
    * NodePort: ClusterIPの拡張。内部IPアドレスに加え、クラスタ外からアクセスできるポートを一つ持つ。
    * LoadBalancer: NodePortの拡張。外部ロードバランサを作って、固定の外部IPアドレスを付けて、内部IPアドレスへルーティングする。
    * ExternalName: 抽象名をもつサービス。Kubernetes DNS serverで名前解決する。[詳細](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/)は読んでないので知らない。

* [Volume](https://kubernetes.io/docs/concepts/storage/volumes/)

    永続化やPod内でのファイル共有のためのオブジェクト。
    Podとともに作られ、Podとともに破棄される。
    実態はファイルシステム上のディレクトリ。
    hostPathとか、nfsとか、awsElasticBlockStoreとかの種類があるらしい。

* [Namespace](https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/)

    仮想クラスタを表すオブジェクト。
    これを定義すると、ひとつの物理クラスタを複数の仮想クラスタに分割できる。
    大規模ユーザ・プロジェクト向け機能。

* Controller

    Podを管理するオブジェクト。レプリケーションしたり、スケーリングや自動再起動したり。

    以下のようなものがある。

    * [Deployment](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)

        Podのデプロイを管理するオブジェクト。
        PodとReplicaSetの宣言的な生成・更新を実現する。

    * [ReplicaSet](https://kubernetes.io/docs/concepts/workloads/controllers/replicaset/)

        指定した数のPodのレプリカを維持してくれる。
        基本はDeploymentから作られて、Podの作成・削除・更新をオーケストレイトする。
        [ReplicationController](https://kubernetes.io/docs/concepts/workloads/controllers/replicationcontroller/)というのもあるけど、今はReplicaSetが推奨。

    * [StatefulSet](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/)

        ステートフルなアプリを管理するオブジェクト。
        現時点でのKubernetes最新版の1.8でまだベータ。

    * [DaemonSet](https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/)

        全てのノードで動くアプリを実現するオブジェクト。

    * [Job](https://kubernetes.io/docs/concepts/workloads/controllers/jobs-run-to-completion/)

        ジョブを表すオブジェクト。
        指定された回数、Podを成功で完了させる。

<br>

オブジェクトには[ラベル](https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/)というキーバリューな属性を付けることができ、PodとServiceの紐づけや、オブジェクト検索時のフィルタとかに使える。

<br>

今回Goslingsを動かすのに使ったのは、Pod、Deployment、ReplicaSet、Service (NodePort)。

## Podネットワーク
ちょっと細かい話だけど、Pod間の通信はどうなっているかという話についてちょっと調べたのでざっくり書いておく。

普通の[Dockerネットワーク](https://www.kaitoy.xyz/2015/07/25/how-to-capture-packets-on-a-local-network-with-pcap4j-container/#docker-network)だと、コンテナはdocker0という仮想ブリッジ上のプライベートネットワークで動くため、同じホスト上のコンテナ間は通信できるけど、別のホスト上のコンテナ通信させたい場合は、ホストのIPアドレスのポートを割り当ててやらなければいけない。

これはめんどいので、Kubernetesは、各Podに一意なIPアドレスを与え、Podがどのホストにいるかにかかわらず、NAT無しで相互に通信できる[ネットワーク](https://kubernetes.io/docs/concepts/cluster-administration/networking/)を提供する。
これがPodネットワークとか呼ばれ、色んな実装があり、PodネットワークアドオンとしてKubernetesクラスタに適用できる。
[Calico](https://docs.projectcalico.org/v2.6/getting-started/kubernetes/installation/hosted/kubeadm/)、[Canal](https://github.com/projectcalico/canal/tree/master/k8s-install)、[Flannel](https://github.com/coreos/flannel)、[Kube-router](https://github.com/cloudnativelabs/kube-router/blob/master/Documentation/kubeadm.md)、[Romana](https://github.com/romana/romana/tree/master/containerize#using-kubeadm)、[Weave Net](https://www.weave.works/docs/net/latest/kube-addon/)とか。

## Minikubeとは
Kubernetesクラスタを構築する方法は[いくつかある](https://kubernetes.io/docs/setup/pick-right-solution/)が、中でももっとも簡単な方法がMinikube。

Minikubeは、KubernetesのMasterとNodeを一つずつを詰め込んだVMをダウンロードして起動して、ローカルのkubectlから使えるようにしてくれるツール。
Linux、Windows、OS Xで動き、開発やテスト用途のKubernetes環境として使われる。

ちょっと[Vagrant](https://www.vagrantup.com/)っぽい感じ。Kubernetes専用の。

## Minikubeインストール
[Kubernetesのドキュメント](https://kubernetes.io/docs/tasks/tools/install-minikube/)にしたがって、Minikubeをインストールする。
環境はWindows 10 Home x64。


まず、MinikubeのVMを動かすツールを入れる。
今のところMinikubeがサポートしてるのは、Windowsだと[VirtualBox](https://www.virtualbox.org/)か[Hyper-V](https://docs.microsoft.com/ja-jp/virtualization/hyper-v-on-windows/quick-start/enable-hyper-v)。
Windows 10 HomeだとHyper-Vが使えないので、VirtualBox一択。
VirtualBoxは、適当にVT-xを有効にして(してあった)、インストーラダウンロードしてインストールしただけ。
バージョンは5.1.28。

<br>

次に、minikubeコマンドを入れる。
このコマンドはGoで書かれていて、各プラットフォーム用にビルドされたバイナリがGitHubのプロジェクトページの[Releases](https://github.com/kubernetes/minikube/releases)に上がってるので、ダウンロードしてPathの通ったとこに置くだけ。
今回ダウンロードしたのはv0.22.2のminikube-windows-amd64で、これをminikube.exeにリネームして配置した。

で、minikubeがサポートしているKubernetesのバージョンを調べると、

```cmd
C:\Users\kaitoy>minikube get-k8s-versions
The following Kubernetes versions are available:
        - v1.7.5
        - v1.7.4
        - v1.7.3
        - v1.7.2
        - v1.7.0
        (snip)
```

1.8はまだサポートされていない…

1.7.5が最新なのでそれでやることにする。

<br>

ということで、kubectlの1.7.5をインストールする。
kubectlもGoで書かれているので、以下のアドレスからWindowsバイナリをダウンロードしてPathの通ったところに置くだけ。

```text
https://storage.googleapis.com/kubernetes-release/release/v1.7.5/bin/windows/amd64/kubectl.exe
```

<br>

以上でMinikubeの環境ができた。
簡単。

## Minikube起動
Minikubeは、`minikube start`で起動することができ、Minikubeが起動したらすぐにKubernetesをいじれるようになる。

```cmd
C:\Users\kaitoy>minikube start --vm-driver virtualbox --kubernetes-version v1.7.5
Starting local Kubernetes v1.7.5 cluster...
Starting VM...
Downloading Minikube ISO
 106.37 MB / 106.37 MB [============================================] 100.00% 0s
Getting VM IP address...
Moving files into cluster...
Setting up certs...
Connecting to cluster...
Setting up kubeconfig...
Starting cluster components...
Kubectl is now configured to use the cluster.

C:\Users\kaitoy>minikube status
minikube: Running
cluster: Running
kubectl: Correctly Configured: pointing to minikube-vm at 192.168.99.100
```

起動した。
VirtualBoxのGUIを見ると、minikubeというVMが起動しているのが分かる。
この中でMasterとNodeが動いているはずだ。

このVMには、`minikube ssh`でログインできる。

```cmd
C:\Users\kaitoy>minikube ssh
                         _             _
            _         _ ( )           ( )
  ___ ___  (_)  ___  (_)| |/')  _   _ | |_      __
/' _ ` _ `\| |/' _ `\| || , <  ( ) ( )| '_`\  /'__`\
| ( ) ( ) || || ( ) || || |\`\ | (_) || |_) )(  ___/
(_) (_) (_)(_)(_) (_)(_)(_) (_)`\___/'(_,__/'`\____)

$ uname -a
Linux minikube 4.9.13 #1 SMP Fri Sep 15 23:35:16 UTC 2017 x86_64 GNU/Linux
```

すごくVagrantっぽい。

<br>

Minikubeを起動すると、kubectlのコンテキストがminikubeというものに設定され、kubectlコマンドの接続先がMinikubeのKubernetesになる。

```cmd
C:\Users\kaitoy>kubectl config current-context
minikube
```

<br>

で、kubectlでクラスタの状態とかを見てみようと思ったら、なんか様子が変。
なしのつぶて。

```cmd
C:\Users\kaitoy>kubectl get nodes
Unable to connect to the server: dial tcp 192.168.99.100:8443: connectex: No connection could be made because the target machine actively refused it.

C:\Users\kaitoy>kubectl cluster-info dump
Unable to connect to the server: dial tcp 192.168.99.100:8443: connectex: No connection could be made because the target machine actively refused it.

C:\Users\kaitoy>minikube dashboard
Could not find finalized endpoint being pointed to by kubernetes-dashboard: Error validating service: Error getting service kubernetes-dashboard: Get https://192.168.99.100:8443/api/v1/namespaces/kube-system/services/kubernetes-dashboard: dial tcp 192.168.99.100:8443: connectex: No connection could be made because the target machine actively refused it.
```

再度`minikube status`してみたら、クラスタが落ちていた。

```cmd
C:\Users\kaitoy>minikube status
minikube: Running
cluster: Stopped
kubectl: Correctly Configured: pointing to minikube-vm at 192.168.99.100
```

<br>

`minikube logs`でログを見てみると、エラーがたくさん出ていた。
以下のようなログが最初のほうに出てたので、認証系がだめで、サービス間でやり取りができなかったんじゃないかという感じ。

```text
Oct 04 23:08:43 minikube localkube[2783]: W1004 23:08:43.599396    2783 authentication.go:368] AnonymousAuth is not allowed with the AllowAll authorizer.  Resetting AnonymousAuth to false. You should use a different authorizer
```

<br>

エラーの原因はよくわからないので、Kubernetesのバージョンをちょっと古いの(1.7.0)変えてみる。

kubectlの1.7.0をPathに置いて、Minikubeを1.7.0で再起動する。

```cmd
C:\Users\kaitoy>minikube stop
Stopping local Kubernetes cluster...
Machine stopped.

C:\Users\kaitoy>minikube start --vm-driver virtualbox --kubernetes-version v1.7.0
Starting local Kubernetes v1.7.0 cluster...
Starting VM...
Getting VM IP address...
Kubernetes version downgrade is not supported. Using version: v1.7.5
Moving files into cluster...
Setting up certs...
Connecting to cluster...
Setting up kubeconfig...
Starting cluster components...
Kubectl is now configured to use the cluster.
```

Kubernetesのダウングレードはサポートされてないと言われた。
ので一回VMを消してからやりなおす。

```cmd
C:\Users\kaitoy>minikube stop
Stopping local Kubernetes cluster...
Machine stopped.

C:\Users\kaitoy>minikube delete
Deleting local Kubernetes cluster...
Machine deleted.

C:\Users\kaitoy>minikube start --vm-driver virtualbox --kubernetes-version v1.7.0
Starting local Kubernetes v1.7.0 cluster...
Starting VM...
Getting VM IP address...
Moving files into cluster...
Setting up certs...
Connecting to cluster...
Setting up kubeconfig...
Starting cluster components...
Kubectl is now configured to use the cluster.
```

1.7.0で動いた。

<br>

様子はどうか。

```cmd
C:\Users\kaitoy\Desktop\bin\pleiades\workspace\blog>minikube status
minikube: Running
cluster: Running
kubectl: Correctly Configured: pointing to minikube-vm at 192.168.99.100

C:\Users\kaitoy\Desktop\bin\pleiades\workspace\blog>kubectl get nodes
NAME       STATUS    AGE       VERSION
minikube   Ready     22s       v1.7.0

C:\Users\kaitoy\Desktop\bin\pleiades\workspace\blog>kubectl version
Client Version: version.Info{Major:"1", Minor:"7", GitVersion:"v1.7.0", GitCommit:"d3ada0119e776222f11ec7945e6d860061339aad", GitTreeState:"clean", BuildDate:"2017-06-29T23:15:59Z", GoVersion:"go1.8.3", Compiler:"gc", Platform:"windows/amd64"}
Server Version: version.Info{Major:"1", Minor:"7", GitVersion:"v1.7.0", GitCommit:"d3ada0119e776222f11ec7945e6d860061339aad", GitTreeState:"dirty", BuildDate:"2017-10-04T09:25:40Z", GoVersion:"go1.8.3", Compiler:"gc", Platform:"linux/amd64"}
```

ちゃんと動いているっぽい。

<br>

ダッシュボードだけはなぜか相変わらず開けないけどまあいいか。

```cmd
C:\Users\kaitoy>minikube dashboard
Could not find finalized endpoint being pointed to by kubernetes-dashboard: Error validating service: Error getting service kubernetes-dashboard: services "kubernetes-dashboard" not found
```

<br>

続きはまた[別の記事](https://www.kaitoy.xyz/2017/10/11/goslings-on-kubernetes-cont/)。
