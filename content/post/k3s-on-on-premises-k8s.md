+++
categories = ["Programming"]
title = "k3sをオンプレの手製Kubernetesクラスタで動かす"
date = "2021-08-15T10:34:14+09:00"
tags = ["kubernetes", "k3s"]
draft = false
cover = "k3s.svg"
slug = "k3s-on-on-premises-k8s"
highlight = true
highlightStyle = "monokai"
highlightLanguages = []
+++

手元のVMで動くKubernetesクラスタにk3s serverをデプロイして、別のVMのk3s agentとでクラスタを組んでみた話。

<!--more-->

{{< google-adsense >}}

# k3sとは
[k3s](https://k3s.io/)はRancherが開発しているKubernetesのディストリビューションの一つ。(オリジナルのKubernetesにソースレベルで手が入っているはずなので、フォークに近いかもしれない。)
主にIoTデバイスなどのエッジで動くことを目的として開発されているもの。

そのための大きな特徴が省リソース。
k3sは単一のバイナリだけで完結していて、その中にKubernetesを構成するkube-apiserver、kube-controller-manager、kube-scheduler、kube-proxy、kubelet、kubectlのほか、コンテナランタイムのcontainerd、runcやCNIプラグインのFlannelが詰まっていて、起動するプロセスが少なく、省メモリで動ける。
(メモリの最小要件は512MB。)

もう一つの大きな特徴が、etcdの代わりにSQLiteで動けること。
オリジナルのKubernetesは、3ノードとかのetcdクラスタを用意しておいて、そこにkube-apiserverをつないでリソースオブジェクトなどを永続化するのに対して、k3sはSQLiteを呼ぶだけなので、メモリ使用量が少なく、構築・運用も簡単。
k3sのバイナリにはetcdも組み込まれていて、etcdに切り替えてHA構成を組むこともできる。
別プロセスにはなるけど、PostgreSQLかMySQLかMariaDBを使うこともできる。

また、k3sのバイナリにはiptablesなどのOSコマンドも組み込まれていて、起動時にk3sのデータディレクトリに展開して使う形になっているので、ホストOSの前提条件が少なく、構築・運用が楽。

構築・運用という観点では、[Air-Gapインストール (i.e. オフラインインストール)](https://rancher.com/docs/k3s/latest/en/installation/airgap/)、[アンインストール](https://rancher.com/docs/k3s/latest/en/installation/uninstall/)、[サービス停止](https://rancher.com/docs/k3s/latest/en/upgrades/killall/)、[バックアップ・リストア](https://rancher.com/docs/k3s/latest/en/backup-restore/)、[自動アップグレード](https://rancher.com/docs/k3s/latest/en/upgrades/automated/)あたりが公式にカバーされているのもうれしい。

# k3sのアーキテクチャ
k3sには大きくserverコマンドとagentコマンドがある。
serverでKubernetesのマスタコンポーネントを起動して、agentでノードコンポーネントを起動する感じ。

公式サイトのアーキテクチャダイアグラム:
![k3s-architecture](https://k3s.io/images/how-it-works-k3s.svg)

この図で、Tunnel Proxyというのはk3s独自のコンポーネント。
マニュアルには説明がないんだけど、[ソース](https://github.com/k3s-io/k3s/blob/v1.21.3%2Bk3s1/pkg/agent/proxy/apiproxy.go)を見た感じではどちらかというとKubernetesのAPI(i.e. kube-apiserver)やk3sのAPIに対するロードバランサっぽい。
つまり、serverを複数動かしたときに、agentはそのなかのいずれか一つに接続できれば動けるので、その間にロードバランサがあると都合がいいんだけど、それをk3sプロセス内の処理として実現するためのコンポーネントがTunnel Proxy。

ノードコンポーネントからkube-apiserverに通信するとき、kube-apiserverがバインドしたポートじゃなくて、Tunnel Proxyがバインドしたポートにつなぐ形になるので、k3sクラスタ構築時に注意する必要がある。

# 今回構築したい構成
k3sは、`k3s server`というコマンドを実行するだけでagentも起動してクラスタを構成し、CoreDNSとかのインフラ的Podもデプロイしてくれて手軽に使えるんだけど、今回は以下のような構成でserverをKubernetes上で動かし、agentを別のホストで動かすというのをやりたい。

![k3s_cluster.png](/images/k3s-on-on-premises-k8s/k3s_cluster.png)

この構成は、Kubernetesの特定のワークロードだけ特定のノード(上の図で言うとVM-2)で動かしたいような用途を想定したもの。
そういうワークロードを、Kubernetesの代わりにk3sにデプロイすることで、k3sの方のノードで動かせる。

単にPodを動かすノードを指定したいなら[Node Affinity](https://kubernetes.io/ja/docs/tasks/configure-pod-container/assign-pods-nodes-using-node-affinity/)でもいいんだけど、セキュリティなどの都合上、そのノードをKubernetesクラスタにはjoinさせたくなかったり、KubernetesのAPIをそのノードのネットワークにさらしたくなかったりするとき、Podで隔離したk3s serverをそのノード用に使えるという点が上記構成のポイント。

例えば、AWSのEKSでKubernetesクラスタを運用していて、オンプレのマシンで動かしたいPodがある場合、上記構成ならEKSのAPIをさらさなくても実現できる。

# 構築環境
ノートPCでVMWare PlayerでCentOS 7.9のVMを二つ作って、一方のVMに[手製のAnsible Playbook](https://github.com/kaitoy/ansible-k8s)を使って1ノードのKubernetesクラスタを構築した。

Kubernetesのバージョンは1.21.2。

それぞれのVMはホストネットワークにブリッジ接続していて、互いに疎通がある。

# k3sコンテナイメージ
k3s serverをKubernetesにデプロイするにはなにはともあれk3sのコンテナイメージが要るが、[k3s公式のもの](https://hub.docker.com/r/rancher/k3s)はagent用っぽいので自分で作ってDocker Hubに上げておいた。
イメージ名は[kaitoy/k3s:1.21.2](https://hub.docker.com/r/kaitoy/k3s)。
(無料ユーザなのでそのうち消えるかも。)

[Dockerfile](https://github.com/kaitoy/docker-k3s/blob/master/Dockerfile)は以下の内容。

```
FROM alpine:3.14 as k3s

RUN wget https://github.com/k3s-io/k3s/releases/download/v1.21.2%2Bk3s1/k3s -O /usr/local/bin/k3s \
    && \
    chmod +x /usr/local/bin/k3s

FROM scratch

COPY --from=k3s /usr/local/bin/k3s /k3s

EXPOSE 6443

ENTRYPOINT ["/k3s"]
CMD ["server", "--disable-agent", "--disable-cloud-controller", "-d", "/var/lib/rancher/k3s"]
```

k3sのGitHub Releasesからk3sのバイナリをダウンロードして、scratchのルートに置いただけ。
これだけでk3s serverは動く。

前述のようにk3sは起動するときにOSコマンドをデータディレクトリに展開するんだけど、そのなかにlsとかpsとかcatとかが含まれるので、scratchベースであってもそれらのコマンドを使ってコンテナ内の様子を見られるのが地味に便利。

k3sが展開するコマンドは[buildroot](https://github.com/buildroot/buildroot)ベースのもの。
以下に全コマンドのリストを張っておく。(パス半ばのハッシュ値みたいな部分はk3sのバージョンによって違うかも。毎回の起動で変わるわけではない。)

<iframe src="https://pastebin.pl/view/embed/31f45e4c" style="border:none;width:100%"></iframe>

# k3s serverをKubernetesにデプロイ
k3s serverをデプロイするKubernetesマニフェストは以下。
k3s serverのポートはNodePortで公開している。
データの永続化は気にしてない。

```yaml
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: k3s
  labels:
    app: k3s
spec:
  replicas: 1
  selector:
    matchLabels:
      app: k3s
  template:
    metadata:
      labels:
        app: k3s
    spec:
      containers:
      - name: k3s
        image: kaitoy/k3s:1.21.2
        command:
        - /k3s
        args:
        - server
        - --disable-agent
        - --disable-cloud-controller
        - --node-external-ip
        - 192.168.1.200
        - --https-listen-port
        - "30443"
        ports:
        - containerPort: 30443
---
apiVersion: v1
kind: Service
metadata:
  name: k3s
spec:
  type: NodePort
  selector:
    app: k3s
  ports:
  - port: 30443
    targetPort: 30443
    nodePort: 30443
```

肝はDeploymentの`args`で`k3s server`コマンドに渡しているオプション。
まず`--disable-agent`について。

`k3s server`コマンドは、その名に反して、デフォルトではagentも起動してインフラ系Podまでデプロイする動きをする。
今回はagentは別のVMで動かしたいし、Pod内でagentが起動してもどうせ機能しないので起動しないでほしい。
ので`--disable-agent`を付けているが、[実は隠しオプション](https://github.com/k3s-io/k3s/blob/v1.21.2+k3s1/pkg/cli/cmds/server.go#L452)。なぜ?

`--disable-cloud-controller`は、クラウドじゃないのでcloud-controller要らないから付けてるけど、たぶん付けなくてもcloud-controllerは起動しないような気がする。

`--node-external-ip`で指定しているIPアドレスは、KubernetesのホストVMのIPアドレスで、k3s server(正確にはその中のkube-apiserver)がAPIのクライアントにadvertiseするIPアドレスとして使われるもの。
もう少し具体的に言うと、k3sクラスタのdefaultネームスペースのkubernetesサービスのEndpointになるIPアドレス。
指定しないとk3sのPodに割り当てられたクラスタIPになってしまうんだけど、k3s agentはkubernetesサービスのEndpointをメインの接続先にするように動くので、NodePortで公開するポートに対応するIPアドレス(i.e. ノードの外部IPアドレス)を指定しておかないとまずい。

`--https-listen-port`もk3s serverがadvertiseするポートなので、NodePortで公開するポートと同じになるように指定している。
k3s serverのポート(i.e. kube-apiserverのポート)はデフォルトでは6443なんだけど、そのポートはホストのKubernetesのkube-apiserverが使っているので変える必要があって30443にした。

<br>

このマニフェストをapplyすると、k3s serverが起動し、ホストVMのポート30443でアクセスできるようになる。

```console
[root@vm-1 ~]# kubectl apply -f k3s.yaml
deployment.apps/k3s created
service/k3s created
[root@vm-1 ~]# kubectl get po
NAME                   READY   STATUS    RESTARTS   AGE
k3s-57d95d5c47-7p4s8   1/1     Running   0          25s
[root@vm-1 ~]# curl -k https://192.168.1.200:30443
{
  "kind": "Status",
  "apiVersion": "v1",
  "metadata": {

  },
  "status": "Failure",
  "message": "Unauthorized",
  "reason": "Unauthorized",
  "code": 401
}
```

# ノードトークンの取得
k3s serverにk3s agentをjoinさせるには、serverからノードトークンを取得しておく必要がある。
(多分Kubernetesの[ブートストラップトークン](https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet-tls-bootstrapping/)のようなもの。)
デフォルトでは、ノードトークンはserverのデータディレクトリの`/var/lib/rancher/k3s/server/node-token`に書かれているので、catしてやれば見れる。

```console
[root@vm-1 ~]# kubectl get po
NAME                   READY   STATUS    RESTARTS   AGE
k3s-57d95d5c47-v5bnh   1/1     Running   0          8h
[root@vm-1 ~]# kubectl exec -it k3s-57d95d5c47-v5bnh -- /var/lib/rancher/k3s/data/57d64d4b123cea8e276484f00ab3dfa7178a00a35368aa6b43df3e3bd8ce032d/bin/cat /var/lib/rancher/k3s/server/node-token
K1084e50461f4838e53746168882e59ad0db873c6b55ea1ef24521fa6022c2c2684::server:5d0fbc7644d4854c984f03a40a8f4d8a
```

ノードトークンはserverの起動オプション(`--agent-token`)で指定もできるっぽいので、実運用ならそれかも。

# k3s agentの起動とk3s serverへの登録
k3s agentは、Kubernetesが入ってないほうのVMで直接起動する。

起動する前に、[agentがserverと通信するポート](https://rancher.com/docs/k3s/latest/en/installation/installation-requirements/#networking)を開ける必要があるけど、面倒なので[firewalldを止めておく](https://rancher.com/docs/k3s/latest/en/advanced/#additional-preparation-for-red-hat-centos-enterprise-linux)。

```console
[root@vm-2 ~]# systemctl disable firewalld --now
```

また、SELinuxも無効にしておく。([公式が指定しているrpmパッケージを入れれば有効でも動く](https://rancher.com/docs/k3s/latest/en/advanced/#selinux-support)はずだけど。)

```console
[root@vm-2 ~]# setenforce 0
[root@vm-2 ~]# sed -i s/SELINUX=enforcing/SELINUX=disabled/ /etc/selinux/config
```

あとはインストールスクリプトをダウンロードして、環境変数でk3s serverのURLとノードトークンとかを指定して実行してやればいい。

```console
[root@vm-2 ~]# curl -sSL https://get.k3s.io/ -o install.sh
[root@vm-2 ~]# chmod +x install.sh
[root@vm-2 ~]# export INSTALL_K3S_SKIP_SELINUX_RPM=true
[root@vm-2 ~]# export INSTALL_K3S_SELINUX_WARN=true
[root@vm-2 ~]# export K3S_URL=https://192.168.1.200:30443
[root@vm-2 ~]# export K3S_TOKEN=K1084e50461f4838e53746168882e59ad0db873c6b55ea1ef24521fa6022c2c2684::server:5d0fbc7644d4854c984f03a40a8f4d8a
[root@vm-2 ~]# ./install.sh
[INFO]  Finding release for channel stable
[INFO]  Using v1.21.3+k3s1 as release
[INFO]  Downloading hash https://github.com/k3s-io/k3s/releases/download/v1.21.3+k3s1/sha256sum-amd64.txt
[INFO]  Downloading binary https://github.com/k3s-io/k3s/releases/download/v1.21.3+k3s1/k3s
[INFO]  Verifying binary download
[INFO]  Installing k3s to /usr/local/bin/k3s
[INFO]  Skipping installation of SELinux RPM
[WARN]  Failed to find the k3s-selinux policy, please install:
    yum install -y container-selinux selinux-policy-base
    yum install -y https://rpm.rancher.io/k3s/stable/common/centos/7/noarch/k3s-selinux-0.2-1.el7_8.noarch.rpm

[INFO]  Creating /usr/local/bin/kubectl symlink to k3s
[INFO]  Creating /usr/local/bin/crictl symlink to k3s
[INFO]  Creating /usr/local/bin/ctr symlink to k3s
[INFO]  Creating killall script /usr/local/bin/k3s-killall.sh
[INFO]  Creating uninstall script /usr/local/bin/k3s-agent-uninstall.sh
[INFO]  env: Creating environment file /etc/systemd/system/k3s-agent.service.env
[INFO]  systemd: Creating service file /etc/systemd/system/k3s-agent.service
[INFO]  systemd: Enabling k3s-agent unit
Created symlink from /etc/systemd/system/multi-user.target.wants/k3s-agent.service to /etc/systemd/system/k3s-agent.service.
[INFO]  systemd: Starting k3s-agent
```

上記インストールログを見ても分かる通り、インストールスクリプトは以下をしてくれる。

* k3sバイナリのダウンロード。
* 停止スクリプトの生成。
* アンインストールスクリプトの生成。
* k3s agentを起動するためのsystemdのユニットファイルを生成。
* k3s agentサービスの有効化、起動。

起動完了すると、k3s serverにノードとして登録され、インフラ系Podを起動する。

```console
[root@vm-1 ~]# kubectl  exec -it k3s-57d95d5c47-v5bnh -- /k3s kubectl get node
NAME             STATUS   ROLES    AGE     VERSION
k8s-node.local   Ready    <none>   4m38s   v1.21.3+k3s1
[root@vm-1 ~]# kubectl  exec -it k3s-57d95d5c47-v5bnh -- /k3s kubectl get po -A
NAMESPACE     NAME                                      READY   STATUS      RESTARTS   AGE
kube-system   metrics-server-86cbb8457f-gcshq           1/1     Running     0          9h
kube-system   local-path-provisioner-5ff76fc89d-smkvb   1/1     Running     0          9h
kube-system   coredns-7448499f4d-fs7sq                  1/1     Running     0          9h
kube-system   helm-install-traefik-crd-pgzkk            0/1     Completed   0          9h
kube-system   helm-install-traefik-tbgz7                0/1     Completed   1          9h
kube-system   svclb-traefik-vtrtg                       2/2     Running     0          18m
kube-system   traefik-97b44b794-6wvqt                   1/1     Running     0          18m
```

# k3s agentのアンインストール
アンインストールが公式にサポートされているのがKubernetesにないk3sの特徴なので、アンインストールもしてみる。

アンインストールは、インストール時に生成されたアンインストールスクリプトを実行するだけでいい。

```console
[root@vm-2 ~]# k3s-agent-uninstall.sh
```

スクリプトを見ると、バイナリやデータディレクトリやサービスユニットファイルを削除するだけでなくて、コンテナプロセスのkill、コンテナのファイルシステムのアンマウント、`/run/`にある各種ステートディレクトリの削除、CNIプラグインが作る仮想ネットワークブリッジの削除、iptables設定の復元なんかもやってくれて、なかなか手が込んでいる。

但し、k3s serverからノードの削除をしてくれるわけではないので、それは別途手動でやる必要がある。
