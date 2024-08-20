+++
categories = ["Programming"]
title = "Liqoのvirtual-kubeletでKubernetesクラスタからk3sにPodをオフロードする"
date = "2021-12-09T08:35:35+09:00"
tags = ["Kubernetes", "k3s", "virtual-kubelet", "liqo"]
draft = false
cover = "admiralty.png"
slug = "virtual-kubelet-liqo"
highlight = true
highlightStyle = "monokai"
highlightLanguages = []
+++

KubernetesクラスタにAdmiraltyのLiqoでk3sクラスタを仮想ノードとしてつなげてみた話。

<!--more-->

{{< google-adsense >}}

# Liqoとは
[Liqo](https://liqo.io/)は、[前回の記事](https://www.kaitoy.xyz/2021/12/09/virtual-kubelet-admiralty/)で使った[Admiralty](https://admiralty.io/)と同様の[virtual-kubelet](https://github.com/virtual-kubelet/virtual-kubelet)実装で、Kubernetesクラスタのノードとして別のKubernetesクラスタを接続してくれるもの。

Liqoに目を付けたのは、AdmiraltyがEKSではKubernetes APIのバージョンの不整合([これ](https://github.com/admiraltyio/admiralty/issues/130)とか[これ](https://github.com/admiraltyio/admiralty/issues/120))でうまく動かない問題があるのに対し、開発が停滞気味で修正されるかあやしかったため。

Liqoはかなり活発に開発されていて、機能的にはAdmirartyを超えているっぽくて、最新のKubernetes APIに追従してくれている。

# Liqoの仕組み
LiqoはAdmirartyと同様に、Kubernetesクラスタのノードとして別のKubernetesクラスタを接続する。
前者はHomeクラスタ、後者はForeignクラスタ、HomeクラスタにLiqoが作るノードは仮想ノードと呼ばれ、仮想ノードにスケジューリングされたPodがForeignクラスタのいずれかのノードで実行される。

Admiraltyは、ソースクラスタで特殊なスケジューラを動かして、PodChaperonを介してターゲットクラスタにPodをデプロイすることで、オフロードするPodがより確実に実行されるようにスケジューリングを頑張っている感じだったけど、Liqoはそのあたりは割とシンプル。
単に、仮想ノードにスケジューリングされたPodに対応するPodを、ForeignクラスタにReplicaSet経由で作るだけ。
ForeignクラスタにそのPodを実際に実行できるノードがあるとは限らないので、仮想ノードへのスケジューリングが不適当な結果になることもあるかも。

代わりに(?)Liqoが頑張っているのはPod間ネットワーク。
ForeignクラスタとHomeクラスタをVPNでつなぎ、それらのClusterIP間で通信できるようにしてくれる[ゲートウェイ機能をもっている](https://doc.liqo.io/concepts/networking/)。

このVPNは、[TunnelEndpoint](https://github.com/liqotech/liqo/blob/v0.3.2/deployments/liqo/crds/net.liqo.io_tunnelendpoints.yaml)というCRにしたがって[Tunnel Operator](https://doc.liqo.io/concepts/networking/components/gateway/#tunnel-operator)がセットアップする作りになっている。
Tunnel Operatorが使うVPN実装は、現時点のLiqo 0.3.2では[WireGuard](https://www.wireguard.com/)だけだけど、VPN実装を入れ替えられるプラガブルなアーキテクチャになっているので、頑張って[ドライバ](https://github.com/liqotech/liqo/blob/v0.3.2/pkg/liqonet/tunnel/driver.go)を書けば別の実装を使える。

# Liqoのコンポーネント

* auth
* controller-manager
* crd-replicator
* [Liqo-Gateway](https://doc.liqo.io/concepts/networking/components/gateway/)

    いくつかのオペレータを実行し、VPNトンネルの確立とかNATとかの役割をする。

* network-manager
* route
* webhook


# Liqoをためす
二つのクラスタをLiqoでつなげて、Nginxを実行してみる。

## 環境
ためす環境はAdmiraltyのと同じで、Kubernetes 1.21.2とk3s 1.21.2による以下のようなもの。

![k3s_cluster.png](/images/k3s-on-on-premises-k8s/k3s_cluster.png)

k3sクラスタのマスタ(i.e. k3s server)がKubernetesクラスタのPodで動いていて、別マシンがk3sクラスタのノードになっている。

KubernetesクラスタをHomeクラスタ、k3sクラスタをForeignクラスタとする。

## HomeクラスタへのLiqoインストール
HomeクラスタへのLiqoをいれる。
いれるのはv0.3.2。

GitHubにあるHelm Chartを取得。

```console
[root@vm-1 ~]# git clone https://github.com/liqotech/liqo.git
[root@vm-1 ~]# cd liqo/deployments/liqo/
[root@vm-1 liqo]# git checkout v0.3.2
```

Chartのパラメータを指定するファイルを作る。

```console
[root@vm-1 multicluster-scheduler]# cat <<EOF > values_override.yaml
apiServer:
  address: "https://192.168.1.200:6443"
gateway:
  service:
    type: NodePort
networkManager:
  config:
    podCIDR: 10.32.0.0/16
    serviceCIDR: 10.0.0.0/16
discovery:
  config:
    clusterName: k8s
auth:
  service:
    type: NodePort
storage:
  enable: false
EOF
```

```console
[root@vm-1 multicluster-scheduler]# find crds/ -name "*.yaml" | xargs -I {} kubectl apply -f {}
```

公式の手順ではhelm installするんだけど、なんとなくhelm templateでマニフェストをレンダリングしてapplyしたいので、[Chart Hook](https://helm.sh/docs/topics/charts_hooks/)を消しておく。

```console
[root@vm-1 multicluster-scheduler]# rm -rf templates/post-delete/
```

IssuerとCertificateのAPIバージョンが古いので直す。
あとVMのリソースの都合でレプリカ数を減らす。

```console
[root@vm-1 multicluster-scheduler]# sed -i -e "s/v1alpha2/v1/" templates/issuer.yaml
[root@vm-1 multicluster-scheduler]# sed -i -e "s/v1alpha2/v1/" templates/cert.yaml
[root@vm-1 multicluster-scheduler]# sed -i -e "s/replicas: 2/replicas: 1/" values.yaml
```

apply。

```console
[root@vm-1 multicluster-scheduler]# helm template --name-template hoge . | kubectl apply -f -
[root@vm-1 multicluster-scheduler]# kubectl get po
NAME                                                              READY   STATUS    RESTARTS   AGE
hoge-multicluster-scheduler-candidate-scheduler-7994c546d8cnm29   1/1     Running   0          22m
hoge-multicluster-scheduler-controller-manager-788dc65475-c764x   1/1     Running   0          22m
hoge-multicluster-scheduler-proxy-scheduler-8457f5f655-tzt6n      1/1     Running   0          22m
hoge-multicluster-scheduler-restarter-544df48444-k5cwv            1/1     Running   0          22m
k3s-57d95d5c47-sdzpl                                              1/1     Running   0          45h
```

これでソースクラスタでAdmiraltyが動いた。
candidate-schedulerが無駄に動いているのと、scheduler-restarterってなんだっけというのはあるけど、気にしない。

## ターゲットクラスタへのAdmiraltyインストール
次にターゲットクラスタであるk3sクラスタにAdmiraltyを入れる。

大抵はターゲットクラスタでもソースクラスタと全く同じことをすればいいんだけど、今回の環境ではk3sのマスタ(i.e. k3s server)がPodで動いていて、別マシンのノード上で動くPodへの疎通がないので、ちょっと工夫が必要。

つまり、cert-managerとAdmiraltyをk3sクラスタに入れると、それらのWebhookサーバのPodがVM-2上で動くわけだけど、k3sクラスタのkube-apiserverはVM-1のPod内で動いていて、Webhookサーバに割り当てられたCluster IPと通信できないのでWebhookを実行できない、という問題を回避する必要がある。

![webhook.png](/images/virtual-kubelet-admiralty/webhook.png)

ここでよく考えると、上記「Admiraltyの仕組み」で見たように、AdmiraltyのMutating Admission Webhookはソースクラスタでだけ使われるものなので、k3s側にはそもそも要らない。
Admiraltyが動かすWebhookは他にも、カスタムリソースの[Validating AdmissionWebhook](https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/#validatingadmissionwebhook)と[CustomResource Conversion Webhook](https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definition-versioning/#webhook-conversion)があるんだけど、前者はカスタムリソースの登録・変更時にバリデーションするだけなので無くてもいいし、後者もカスタムリソースのAPIバージョンを複数サポートしたい場合に使うものなので要らない。

cert-managerはAdmiraltyのWebhookの証明書を管理する用なので、Webhookが要らないならcert-manager自体要らない。

というわけでそれらを除いてインストールする。
k3sクラスタへは、VM-1上で動くk3s server Podの中からkubeconfigを取り出してkubectlに渡せば接続できる。

```console
[root@vm-1 multicluster-scheduler]# kubectl exec -it k3s-57d95d5c47-sdzpl -- /var/lib/rancher/k3s/data/57d64d4b123cea8e276484f00ab3dfa7178a00a35368aa6b43df3e3bd8ce032d/bin/cat /etc/rancher/k3s/k3s.yaml > /tmp/k3s.yaml
[root@vm-1 multicluster-scheduler]# sed -e "s/127.0.0.1/$(hostname -i)/" -i /tmp/k3s.yaml
[root@vm-1 multicluster-scheduler]# kubectl --kubeconfig /tmp/k3s.yaml get node
NAME         STATUS   ROLES    AGE   VERSION
vm-2.local   Ready    <none>   45h   v1.21.5+k3s2
```

<br>

cert-managerは要らないのでスキップ。

AdmiraltyのChartからは、cert-managerのCR(i.e. IssureとCertificate)と、WebhookConfigurationを消しておく。

```console
[root@vm-1 multicluster-scheduler]# rm -f templates/cert.yaml templates/issuer.yaml templates/webhook.yaml
```

<br>

cert-managerがCertificateに対して作るSecretはAdmiraltyのWebhookサーバがマウントして使うんだけど、cert-managerを入れてないのでそのSecretが作られない一方、Webhookサーバはmulticluster-scheduler-controller-manager Pod(i.e. multicluster-scheduler-agentプロセス)に他の必要なコントローラとごった煮になってて止められないので、multicluster-scheduler-controller-managerがSecretのマウントに失敗して落ちないように適当なSecretを作っておく。

ソースクラスタからCertificateのSecretを持ってきて名前だけ変えればいい。

```console
[root@vm-1 multicluster-scheduler]# kubectl get secret hoge-multicluster-scheduler-cert -o yaml > /tmp/cert.yaml
[root@vm-1 multicluster-scheduler]# sed -e 's/hoge-multicluster-scheduler-cert/foo-multicluster-scheduler-cert/' -i /tmp/cert.yaml
[root@vm-1 multicluster-scheduler]# kubectl --kubeconfig /tmp/k3s.yaml apply -f /tmp/cert.yaml
```

<br>

Admiraltyをインストール。

```console
[root@vm-1 multicluster-scheduler]# find crds/ -name "*.yaml" | xargs -I {} kubectl --kubeconfig /tmp/k3s.yaml apply -f {}
[root@vm-1 multicluster-scheduler]# helm template --name-template foo . | kubectl --kubeconfig /tmp/k3s.yaml apply -f -
[root@vm-1 multicluster-scheduler]# kubectl --kubeconfig /tmp/k3s.yaml get po
NAME                                                              READY   STATUS    RESTARTS   AGE
foo-multicluster-scheduler-controller-manager-788dc65475-lwgbc   1/1     Running   0          96s
foo-multicluster-scheduler-candidate-scheduler-7994c546d89dggc   1/1     Running   0          96s
foo-multicluster-scheduler-proxy-scheduler-8457f5f655-g6f7s      1/1     Running   0          96s
foo-multicluster-scheduler-restarter-544df48444-7dzpx            1/1     Running   0          96s
```

ターゲットクラスタでもAdmiraltyが動いた。

## Admiraltyの設定
次に、Admiraltyの設定として、ソースクラスタにターゲットクラスタを、ターゲットクラスタにソースクラスタを登録する。
それぞれ[Target](https://admiralty.io/docs/operator_guide/scheduling#targets-and-cluster-targets)、[Source](https://admiralty.io/docs/operator_guide/scheduling#sources-and-cluster-sources)というCRを使う。

Targetには、ターゲットクラスタに接続するためのkubeconfigをいれたSecretを指定する。
本当は権限を絞ったServiceAccountで接続する、専用のkubeconfigを作らないとセキュリティ的にダメなんだけど、簡便にさっきk3s server Podの中から取り出したkubeconfigを使う。

```console
[root@vm-1 ~]# kubectl create secret generic k3s-kubeconfig --from-literal=config="$(cat /tmp/k3s.yaml)"
[root@vm-1 ~]# cat <<EOF | kubectl apply -f -
apiVersion: multicluster.admiralty.io/v1alpha1
kind: Target
metadata:
  name: k3s
spec:
  kubeconfigSecret:
    name: k3s-kubeconfig
EOF
```

<br>

Sourceには、ソースクラスタからの接続を認可するServiceAccountを指定する。
k3s server Podの中から取り出したkubeconfigのServiceAccount名は`default`なので、それを指定して登録する。

```console
[root@vm-1 ~]# cat <<EOF | kubectl --kubeconfig /tmp/k3s.yaml apply -f -
apiVersion: multicluster.admiralty.io/v1alpha1
kind: Source
metadata:
  name: k8s
spec:
  serviceAccountName: default
EOF
[root@vm-1 ~]# kubectl get node
NAME                    STATUS   ROLES     AGE    VERSION
admiralty-default-k3s   Ready    cluster   163m
vm-1.local              Ready    <none>    125d   v1.21.2
```

Admiraltyによる仮想ノードである`admiralty-default-k3s`がソースクラスタに追加された。

<br>

最後の設定として、Admiraltyによる仮想ノードへのスケジューリングを有効にするnamespaceを指定するため、namespaceに`multicluster-scheduler=enabled`というラベルを付ける。
今回は`default`。

```console
[root@vm-1 ~]# kubectl label ns default multicluster-scheduler=enabled
```

## 仮想ノードへのPodのデプロイ
仮想ノードにPodをスケジューリングしてもらうには、`multicluster-scheduler=enabled`を付けたnamespaceに、`multicluster.admiralty.io/elect: ""`というアノテーションを付けたPodを作ればいい。

今回はJobを使って、echoしたあとsleepするPodを作る。

```console
[root@vm-1 ~]# cat <<EOF | kubectl apply -f -
apiVersion: batch/v1
kind: Job
metadata:
  name: test
spec:
  template:
    metadata:
      annotations:
        multicluster.admiralty.io/elect: ""
    spec:
      containers:
      - name: c
        image: busybox
        command: ["sh", "-c", "echo hogeeeee && sleep 100"]
      restartPolicy: Never
EOF
[root@vm-1 ~]# kubectl get po -o "custom-columns=NAME:.metadata.name,NODE:.spec.nodeName"
NAME                                                              NODE
hoge-multicluster-scheduler-candidate-scheduler-7994c546d8cnm29   vm-1.local
hoge-multicluster-scheduler-controller-manager-56b5fcf8db-5jrdn   vm-1.local
hoge-multicluster-scheduler-proxy-scheduler-855d6654f-gkscp       vm-1.local
hoge-multicluster-scheduler-restarter-544df48444-k5cwv            vm-1.local
k3s-57d95d5c47-sdzpl                                              vm-1.local
test-cz5mp                                                        admiralty-default-k3s
```

登録したJobから作られたPodの`test-cz5mp`が、仮想ノードの`admiralty-default-k3s`にスケジューリングされた。

<br>

```console
[root@vm-1 ~]# ps aux | grep -e '[s]leep'
[root@vm-1 ~]#
```

ソースクラスタのノード(i.e. VM-1)上でsleepプロセスは動いていない。

<br>

```console
[root@vm-1 ~]# kubectl get po --kubeconfig /tmp/k3s.yaml
NAME                                                              READY   STATUS    RESTARTS   AGE
foo-multicluster-scheduler-candidate-scheduler-7994c546d89dggc   1/1     Running   2          7h11m
foo-multicluster-scheduler-proxy-scheduler-8457f5f655-g6f7s      1/1     Running   2          7h11m
foo-multicluster-scheduler-restarter-544df48444-7dzpx            1/1     Running   4          7h11m
foo-multicluster-scheduler-controller-manager-788dc65475-lwgbc   1/1     Running   4          7h11m
test-cz5mp                                                       1/1     Running   0          55s
```

ターゲットクラスタで`test-cz5mp`が動いている。

<br>

```console
[root@vm-2 ~]# ps aux | grep -e '[s]leep'
root      56450  1.4  0.0   1300     4 ?        Ss   18:27   0:00 sleep 100
```

ターゲットクラスタのノード(i.e. VM-2)上でsleepプロセスがちゃんと動いている。

<br>

```console
[root@vm-1 ~]# kubectl logs test-cz5mp
hogeeeee
```

ソースクラスタの`test-cz5mp`に対してkubectl logsもできることが確認できた。
