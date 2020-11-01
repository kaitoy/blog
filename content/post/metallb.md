+++
categories = ["Programming"]
title = "MetalLB入門 ― オンプレKubernetesクラスタでLoadBalancerタイプのServiceを使う"
date = "2020-10-31T12:27:15+09:00"
tags = ["kubernetes", "metallb"]
draft = false
cover = "metallb.png"
slug = "metallb"
highlight = true
highlightStyle = "monokai"
highlightLanguages = []
+++

自分で構築した2ノードのKubernetesクラスタにMetalLBをデプロイして、LoadBalancerタイプのService経由でPodにアクセスしてみた。

<!--more-->

{{< google-adsense >}}

# そもそもLoadBalancerタイプのServiceとは
Kubernetesクラスタで動くPodにアクセスするには、まずServiceにアクセスして、ServiceからPodにルーティングされる、という形になるんだけど、デフォルトだとServiceのタイプがClusterIPで、クラスタ上のPodとかノードのホストからしかアクセスできない。

![cluster_ip.png](/images/metallb/cluster_ip.png)

Serviceを[NodePort](https://kubernetes.io/docs/concepts/services-networking/service/#nodeport)タイプにすることでクラスタ外部からもアクセスできるようになる。
NodePortにすると、Serviceに指定したポートがクラスタの各ノードで開いて、それらどのポートにアクセスしてもそのServiceにアクセスできるようになる。

![node_port.png](/images/metallb/node_port.png)

NodePortでクラスタ外部からアクセスできるようにはなるんだけど、ノードが落ちたり増えたり減ったりすることを考えると、クライアントはどのノードにアクセスすればいいかわからない。
なので、普通はノードの手前にロードバランサをおいて、クライアントからのリクエストをロードバランサが適切なノードにルーティングする形にする必要がある。

![node_port_with_lb.png](/images/metallb/node_port_with_lb.png)

NodePortとロードバランサを組み合わせる場合、ロードバランサにノードの生死監視をいい感じにさせたり、ノード追加、削除に応じてロードバランサに設定したりする必要があるのが手間。
この設定をKubernetesの機能としてよろしくやってくれるのが[LoadBalancer](https://kubernetes.io/docs/concepts/services-networking/service/#loadbalancer)タイプのService。

LoadBalancerタイプのServiceを作ると、Kubernetesクラスタ上で動くコントローラーの働きでクラスタ外のロードバランサが設定される。
さらに、Kubernetesのノード監視結果がロードバランサ設定に反映されるので、ノードの増減などもよしなに対応してくれる。
LoadBalancer Serviceを作ると、対応するNodePortが自動で作られて、クラスタ外のロードバランサからの通信はそのNodePortを通してPodにルーティングされる。

![load_balancer.png](/images/metallb/load_balancer.png)

<br>

LoadBalancer Serviceが機能的には最高なんだけど、LoadBalancer Serviceを解釈してくれるコントローラーがKubernetesクラスタにデプロイされている必要があるのと、クラスタ外にロードバランサが要るのと、そのロードバランサがコントローラから設定可能なものでないといけないと、使用するハードルが高い。
基本的にはEKSとかGKEとかのマネージドKubernetesで使われる想定になっている。

# MetalLB
そんなLoadBalancer ServiceをオンプレKubernetesでも手軽に使えるようにしてくれるのが[MetalLB](https://metallb.universe.tf/)。
MetalLBをKubernetesクラスタにデプロイすると、LoadBalancer Serviceにクラスタ外からアクセス可能な仮想IPアドレスを割り振ってくれる。
クライアントからその仮想IPアドレスへのルーティングは、一般的なプロトコルによって制御されるので、Kubernetesクラスタ外に特殊なロードバランサを用意する必要が無い。

MetalLBはもともと個人が開発してたんだけど、2019年3月からGoogleが管理するようになった。
すでにプロダクション環境で使われているケースもあるけど、現時点で最新バージョンは0.9.4で、[実はまだベータ](https://metallb.universe.tf/concepts/maturity/)。

## MetalLBのモード
MetalLBは、あらかじめ指定された範囲のIPアドレスプールからLoadBalancer ServiceにIPアドレスを割り振って、そのIPアドレスを周辺の機器に周知する。
周知に使うプロトコルはMetalLBのモードによって異なる。

現時点では二つのモードがサポートされている

* [L2モード](https://metallb.universe.tf/concepts/layer2/)

    MetalLBがARP(IPv4)とNDP(IPv6)をしゃべって、クライアントに対して仮想IPアドレスを解決してくれる。
    Kubernetesクラスタ外に何の要件も要らないけど、BGPモードに比べて次の制限がある。

    * ロードバランシングはしない。ノードダウンしない限り、常に一定のノード(リーダーノード)にトラフィックが来る。
    * リーダーノードが落ちた場合、別のノードがリーダーに選出されて、その旨(i.e. 仮想IPアドレスに紐づくMACアドレスが変わったこと)をARPとNDPをつかって周知するんだけど、これを無視するクライアントに関しては、クライアント側のARPキャッシュが期限切れになるまでフェールオーバーしてないように見える。ただ、無視するクライアントはすごい古い機器だけなのであまり気にしなくていいかも。

* [BGPモード](https://metallb.universe.tf/concepts/bgp/)

    MetalLBがBGPをしゃべって、外部のBGPルータとBGP peeringして仮想IPアドレスへのルーティング情報を伝える。
    ルータ側の設定によってノード間でロードバランシングが可能なのがL2モードよりすぐれてるけど、Kubernetesクラスタ外にBGPルータが必要なのでちょっとハードルは上がる。

今回はL2モードを試す。

## MetalLBとCNIプラグイン
MetalLBを使う場合、[CNIプラグインとの互換性を気にする必要がある](https://metallb.universe.tf/installation/network-addons/)。

今回つかう[Weave Net](https://www.weave.works/oss/net/)とはMostly Compatible。
Mostlyというのは、[externalTrafficPolicyが使えないという制限があるだけ](https://metallb.universe.tf/configuration/weave/)。

ちなみに[Calico](https://www.projectcalico.org/)もMostly Compatibleとなっているけど、[CalicoのBGPピアリングがいい感じにできない](https://metallb.universe.tf/configuration/calico/)というだけの制限。

# MetalLBを試す
以降、実際にMetalLBを触っていく。

参考資料:

* MetalLBのマニュアル
    - https://metallb.universe.tf/installation/
    - https://metallb.universe.tf/configuration/
* MetalLBのKubernetesマニフェスト
    - https://github.com/metallb/metallb/tree/main/manifests

## 環境
MetalLBは[クラウド環境では仮想IPアドレスの周知するためのプロトコルがいい感じに働かなくて基本的に動かない](https://metallb.universe.tf/installation/clouds/)ので、手元のKubernetesクラスタを使う。

今回は、VMware PlayerのVMを二つ使って、Oracle Linux 7.4をいれて2ノードのKubernetesクラスタを作った。
VMはともにCPUコア一つメモリ4GBの貧弱なスペック。
ホスト名は`k8s-master`と`k8s-node`。

Kubernetesのバージョンは1.19.2。
MetalLBのバージョンは0.9.3。

## Kubernetesクラスタの設定
つくったKubernetesクラスタのkube-proxyのモードはipvsモードなんだけど、ipvs使う場合は[strict ARPを有効にする必要がある](https://metallb.universe.tf/installation/)。
strict ARPを有効にするには、kube-proxyの起動オプションに`--ipvs-strict-arp`を渡すか、KubeProxyConfigurationの`ipvs.strictARP`を`true`にする。

今回のクラスタではKubeProxyConfigurationがホストのファイルにかかれていたのでそれに追記した。

因みに、MetalLBプロジェクトとして[ipvsモードでのテストはあんまりしてない](https://metallb.universe.tf/installation/network-addons/#ipvs-mode-in-kube-proxy)らしいのだけど、結論から言うと問題なく動いた。

## MetalLBのデプロイ
MetalLBのデプロイは、基本的にGitHubに置かれているマニフェストをそのままapplyすればいい。

```console
[root]# kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.9.3/manifests/namespace.yaml
[root]# kubectl apply -f https://raw.githubusercontent.com/metallb/metallb/v0.9.3/manifests/metallb.yaml
[root]# kubectl create secret generic -n metallb-system memberlist --from-literal=secretkey="$(openssl rand -base64 128)"
```

これで、`metallb-system`というNamespaceでMetalLBが動き出す。
具体的には、DaemonSetでspeaker、Deploymentでcontrollerが動く。
controllerはLoadBalancer ServiceへのIPアドレス割り当てを管理するデーモンで、speakerはARPとかBGPとかのプロトコルをしゃべるデーモン。

```console
[root]# kubectl get po -n metallb-system
NAME                        READY   STATUS    RESTARTS   AGE
controller-fb659dc8-l28gc   1/1     Running   0          1d
speaker-767jn               1/1     Running   0          1d
speaker-vjn6h               1/1     Running   0          1d
```

speakerはDaemonSetで、2ノードクラスタなので二つ動いている。
controllerは一つなんだけど、冗長化できるかは不明。

MetalLBのマニフェストのapply後に`memberlist`というSecretを作ってるのは、[memberlist](https://github.com/hashicorp/memberlist)という機能のため。
memberlistはspeaker間で互いに生死監視し、ノードダウンを検知するのに使われている。

## MetalLBの設定
MetalLBはデプロイしても[設定](https://metallb.universe.tf/configuration/)を与えるまではなにもしない。
MetalLBの設定は、`config`という名前のConfigMapを`metallb-system`のNamespaceに作ればいい。

L2モードの設定内容は簡単。
基本的に、LoadBalancer Serviceに割り振るIPアドレスの範囲を与えるだけでいい。
今回は以下のマニフェストをapplyした。

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  namespace: metallb-system
  name: config
data:
  config: |
    address-pools:
    - name: default
      protocol: layer2
      addresses:
      - 192.168.1.210-192.168.1.220
```

これでMetalLBの準備は完了。
LoadBalancer Serviceが使えるようになった。

## LoadBalancer ServiceとPodのデプロイ
実際にLoadBalancer Serviceを使ってみる。

まず外部からアクセスしたいPodを作る。
今回は適当なnginxサーバを立てるため、以下のマニフェストを使う。

```yaml
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: psp:priv
rules:
- apiGroups:
  - policy
  resourceNames:
  - privileged
  resources:
  - podsecuritypolicies
  verbs:
  - use
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: default:psp:privileged
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: psp:priv
subjects:
- kind: ServiceAccount
  name: default
  namespace: default
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
spec:
  selector:
    matchLabels:
      app: nginx
  replicas: 2
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.19.1-alpine
        ports:
        - containerPort: 80
```

RoleとRoleBindingはPodSecurityPolicyが有効な環境でのおまじない。
その下にDeploymentがあって、`nginx:1.19.1-alpine`のコンテナを二つ起動して、ポート80で待機させている。
これをapplyすると、nginxのPodが二つ動く。

```console
[root]# kubectl get po -o wide
NAME                                READY   STATUS    RESTARTS   AGE   IP            NODE         NOMINATED NODE   READINESS GATES
nginx-deployment-79d8d59989-4kkx6   1/1     Running   0          2m    10.32.0.4     k8s-master   <none>           <none>
nginx-deployment-79d8d59989-jq5t2   1/1     Running   0          2m    10.32.192.2   k8s-node     <none>           <none>
```

LoadBalancer Serviceは以下をapplyした。
ポート8080へのアクセスをnginxのPodのポート80にフォワードする設定。

```yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx
spec:
  selector:
    app: nginx
  ports:
  - protocol: TCP
    port: 8080
    targetPort: 80
  type: LoadBalancer
```

LoadBalancer Serviceを作ったら、MetalLBがEXTERNAL-IPに`192.168.1.210`を割り振ってくれた。

```console
[root]# kubectl describe svc nginx
Name:                     nginx
Namespace:                default
Labels:                   <none>
Annotations:              <none>
Selector:                 app=nginx
Type:                     LoadBalancer
IP:                       10.0.39.102
LoadBalancer Ingress:     192.168.1.210
Port:                     <unset>  8080/TCP
TargetPort:               80/TCP
NodePort:                 <unset>  32377/TCP
Endpoints:                10.32.0.4:80,10.32.192.2:80
Session Affinity:         None
External Traffic Policy:  Cluster
Events:
  Type    Reason        Age    From                Message
  ----    ------        ----   ----                -------
  Normal  IPAllocated   9m40s  metallb-controller  Assigned IP "192.168.1.210"
  Normal  nodeAssigned  9m40s  metallb-speaker     announcing from node "k8s-node"
```

これで全部デプロイ完了。

<br>

実際に、Kubernetesクラスタ外部(VMware Player VMのホスト)から`192.168.1.210:8080`にアクセスしたら、nginxにアクセスできて、デフォルトページが表示された。

![nginx.png](/images/metallb/nginx.png)

## なぞのNodePort
不思議なことに、どちらのノードでも、実際にNICに割り当てているIPアドレスのポート8080にアクセスしてもつながらなかった。
確認すると確かにポートは開いてない。

```console
[root]# ss -tln | grep 8080
[root]#
```

代わりに、LoadBalancer ServiceのNodePortの32377が開いていて、ここにアクセスするとnginxのページにアクセスできる。

```console
[root]# ss -tln | grep 32377
LISTEN     0      128          *:32377                    *:*
```

LoadBalancer ServiceをdescribeするとNodePortが設定されていることが見えるので、それが開いていること自体は不思議ではないけど、applyしたマニフェストにはNodePortは指定していないのに設定されているのが奇怪。

と思って調べたら、ClusterIP ServiceとNodePort ServiceとLoadBalancer Serviceは継承関係みたいになっていて、NodePort ServiceはClusterIP ServiceにNodePortを加えたもので、LoadBalancer ServiceはNodePort Serviceにロードバランサ―のIPアドレスを加えたものということだった。
なのでLoadBalancer Serviceには自動的にNodePortが付いてくる。

ただ[MetalLBのL2モードではこのNodePortは使ってないので要らない](https://github.com/metallb/metallb/issues/328)らしい。
MetalLB以外でもLoadBalancer ServiceにNodePortが要らないケースがあるようで、Kubernetesコミュニティに[LoadBalancer ServiceのNodePortを無効にする機能が提案](https://github.com/kubernetes/kubernetes/issues/69845)されていて、[目下実装中](https://github.com/kubernetes/kubernetes/pull/92744)。

ということで、要らないポートが開いちゃってるけど現Kubernetesバージョンでは閉じることはできない。
きもちわるいけど、今のところは、[kube-proxyの設定に以下を追加して、NodePortを開くIPアドレスをローカルアドレスに限定する](https://github.com/kubernetes/kubernetes/pull/89998#issuecomment-611590526)ことで、外部にさらさないくらいのことしかできない。

```yaml
nodePortAddresses:
- "::1/128"
- 127.0.0.1/32
```

この設定するとKubernetesクラスタ内の全てのNodePortがローカルアドレスになってしまうけど。

```console
[root]# ss -tln|grep 32377
LISTEN     0      128    127.0.0.1:32377                    *:*
```

## LoadBalancer Serviceの通信の妙
話しをもどすと、ノードの8080が開いてないのに、なぜ仮想IPアドレスの8080にアクセスできるかというと、どうやらipvsのパワーのおかげっぽい。

```console
[root]# ipvsadm -Ln | head -n 6
IP Virtual Server version 1.2.1 (size=4096)
Prot LocalAddress:Port Scheduler Flags
  -> RemoteAddress:Port           Forward Weight ActiveConn InActConn
TCP  192.168.1.210:8080 rr
  -> 10.32.0.4:80                 Masq    1      0          0
  -> 10.32.192.2:80               Masq    1      0          0
```

このような形で、仮想IPアドレス192.168.1.210のポート8080への通信が、nginxポッドのクラスタIPのポート80にフォワードされているため、外からアクセスできる。
