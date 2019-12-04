---
categories: ["Programming"]
title: "Kubernetes 1.16 のクラスタを CentOS 8 と containerd で構築する"
date: 2019-12-05T00:23:16+09:00
cover: "kubernetes.png"
slug: "k8s-on-centos8-with-containerd"
tags: ["kubernetes", "containerd"]
draft: false
---

CentOS 8でKubernetesクラスタを作った話。

結論から言うと、pythonコマンドが無くなったのと、iptablesがデフォルトでnf_tablesを使うようになったのと、YumがDNFになったのに対応するくらいでいけた。

ついでに、RHEL 8でDockerパッケージが配布されなくなったので、そのあたりを見越して脱Dockerもした。

<!--more-->

{{< google-adsense >}}

# CentOS 8

CentOSの最新メジャーバージョンである8が[2019年9月24日にリリースされた](https://wiki.centos.org/ja/Manuals/ReleaseNotes/CentOS8.1905)。

カーネルバージョンは4.18.0-80。

CentOS 8での変更点のうち、今回の作業に影響があったものは3つ。

## pythonコマンドが無い

Kubernetesクラスタをつくるときは、いつもOSはMinimalインストールしてAnsible([ansible-k8s](https://github.com/kaitoy/ansible-k8s))を実行するんだけど、CentOS 8の場合それだとpythonコマンドがインストールされない。

CentOS 7以前はPython(の2系)がいろいろなシステムツールに使われていたため、Pythonが入っていて当然だった。
CentOS 8でもまあPythonがシステムツールに使われているみたいなんだけど、それ用のはPATHの通っていない`/usr/libexec/platform-python`に置かれるようになり、ユーザが使ってはいけないことになった。
しかもこれがPython 3。

```tch
$ /usr/libexec/platform-python --version
Python 3.6.8
```

そんなわけなので、CentOS 8をMinimalインストールしたマシンにAnsibleで環境構築しようとすると、Ansibleが`python`コマンドを叩こうとしてエラーになる。

```plain
fatal: [k8s_master]: FAILED! => {"changed": false, "module_stderr": "/bin/sh: /usr/bin/python: No such file or directory\n", "module_stdout": "", "msg": "MODULE FAILURE", "rc": 127}
```

で、`yum install -y python3`してから再度Ansible実行してみると、`/usr/bin/python3`しかインストールされていないので、また同じエラーになってへこむ。
どうもCentOS 8では、`python`というコマンドを実行したときに2系が走るのか3系が走るのかはユーザが明示的に指定すべきという方針らしい。
なので、`alternatives --set python /usr/bin/python3`をして`python`を`python3`へのリンクにしておくか、Ansibleの設定で`ansible_python_interpreter: /usr/bin/python3`としておく必要がある。

<br>

Minimalインストールじゃない場合はpython3パッケージがデフォルトでインストールされる。
けどやっぱり`python`コマンドじゃなくて`python3`コマンドしかないので注意。

## YUMがダンディになった
CentOS 7のYumはバージョン3系で、Python 2で書かれているため、Python 3化したCentOS 8では廃止された。
代わりに、YumのフォークであるDNF(Dandified Yum)が標準のパッケージマネージャになっている。
とはいえ、yumコマンドもDNFへのリンクとして残っていて、従来と変わらないインターフェースで使える。

```tch
$ ls -l /usr/bin/yum
lrwxrwxrwx. 1 root root 5 May 14  2019 /usr/bin/yum -> dnf-3
```

ただしAnsibleでパッケージインストールする場合、AnsibleのyumモジュールはPython 2が前提なので、使うと以下のようなエラーになる。

```plain
fatal: [k8s_master]: FAILED! => {"changed": false, "msg": "The Python 2 yum module is needed for this module. If you require Python 3 support use the `dnf` Ansible module instead."}
```

なので代わりにdnfモジュールを使わないといけない。

## iptablesがnftablesになった。
CentOS 8ではiptablesのパッケージバージョンが1.8になって、iptablesの皮をかぶったnftablesになった。
`iptables`コマンドは従来通りあるんだけど、

```tch
$ iptables --version
iptables v1.8.2 (nf_tables)
$ ls -l /usr/sbin/iptables
lrwxrwxrwx. 1 root root 17 Jul  2 00:41 /usr/sbin/iptables -> xtables-nft-multi
```

というように本体はnftablesであることが分かる。
`xtables-nft-multi`というのはnftablesを従来の`iptables`(など)と同じインターフェースで扱うためのもので、いろんな`*tables`からリンクされている。

```tch
find /usr/sbin/ -name "*tables*" | xargs ls -l
lrwxrwxrwx. 1 root root     17 Jul  2 00:41 /usr/sbin/ebtables -> xtables-nft-multi
lrwxrwxrwx. 1 root root     17 Jul  2 00:41 /usr/sbin/ebtables-restore -> xtables-nft-multi
lrwxrwxrwx. 1 root root     17 Jul  2 00:41 /usr/sbin/ebtables-save -> xtables-nft-multi
lrwxrwxrwx. 1 root root     17 Jul  2 00:41 /usr/sbin/ip6tables -> xtables-nft-multi
lrwxrwxrwx. 1 root root     17 Jul  2 00:41 /usr/sbin/ip6tables-restore -> xtables-nft-multi
lrwxrwxrwx. 1 root root     17 Jul  2 00:41 /usr/sbin/ip6tables-restore-translate -> xtables-nft-multi
lrwxrwxrwx. 1 root root     17 Jul  2 00:41 /usr/sbin/ip6tables-save -> xtables-nft-multi
lrwxrwxrwx. 1 root root     17 Jul  2 00:41 /usr/sbin/ip6tables-translate -> xtables-nft-multi
lrwxrwxrwx. 1 root root     17 Jul  2 00:41 /usr/sbin/iptables -> xtables-nft-multi
-rwxr-xr-x. 1 root root   3512 Jul  2 00:41 /usr/sbin/iptables-apply
lrwxrwxrwx. 1 root root     17 Jul  2 00:41 /usr/sbin/iptables-restore -> xtables-nft-multi
lrwxrwxrwx. 1 root root     17 Jul  2 00:41 /usr/sbin/iptables-restore-translate -> xtables-nft-multi
lrwxrwxrwx. 1 root root     17 Jul  2 00:41 /usr/sbin/iptables-save -> xtables-nft-multi
lrwxrwxrwx. 1 root root     17 Jul  2 00:41 /usr/sbin/iptables-translate -> xtables-nft-multi
lrwxrwxrwx. 1 root root     17 Jul  2 00:41 /usr/sbin/xtables-monitor -> xtables-nft-multi
-rwxr-xr-x. 1 root root 240296 Jul  2 00:42 /usr/sbin/xtables-nft-multi
```

この新しい`iptables`コマンド(`xtables-nft-multi`)は、従来のやつの完全な上位互換で後方互換で、スケーラブルで高性能とうたわれているんだけど、[バグ](https://github.com/docker/libnetwork/pull/2285#issuecomment-435171584)があったりしていつもすぐに移行できるわけでもないっぽい。
なので、Ubuntuでは従来通りの`iptables`コマンド(`iptables-legacy`)も提供されていて使えるんだけど、CentOSのYUMリポジトリではlegacyなやつが配布されていないような…

<br>

で、DockerやKubernetes(のkube-proxy)はコンテナ間通信のためにiptablesをディープに使っていて、上記変更の影響をもろに受ける。

* Docker(Moby)のissue: [Docker doesn't work with iptables v1.8.1](https://github.com/moby/moby/issues/38099)
* Kubernetesのissue: [kube-proxy currently incompatible with `iptables >= 1.8](https://github.com/kubernetes/kubernetes/issues/71305)

[Dockerの対応](https://github.com/moby/moby/pull/38120/files)は`iptables-legacy`があればそれを優先で使うというもの。
Kubernetesの方のissueとかを見た感じだと、システム内でlegacyとlegacyじゃないのとが混ざってるとダメみたいなんだけど、この対応でいいんだろうか…
firewalldとかがlegacyじゃないの使ってたりしたらダメなんじゃなかろうか…

Kubernetesのコミュニティでは、(Ubuntu前提で)システムで使うiptablesを全部legacyにしちゃう派が多いように見えるけど、[2019年11月にマージされた修正](https://github.com/kubernetes/kubernetes/pull/82966)により、kube-proxyコンテナ内からホストのiptablesがどちらかを判定して、それに合わせたiptablesを使ってくれるようになっている。
ちょっと[判定ロジック](https://github.com/kubernetes/kubernetes/pull/82966/files#diff-c60536f6b948668f1b8aa52529a35f5a)が怪しく見えるけど、とにかく、ホストと合ってさえいれば、nftablesでもいけるってことだ。

(因みに、OpenShiftでは、kube-proxyコンテナにホストのルートディレクトリをマウントさせて、ホストの`iptables`コマンドをコンテナ内から実行するという[豪快なソリューション](https://github.com/openshift/cluster-network-operator/blob/29f0129/bindata/kube-proxy/kube-proxy.yaml#L85)を採用している。)

<br>

CNIプラグインもiptablesを使うので、そのコンテナ内の`iptables`コマンドがlegacyかどうかも[気を付けなければいけない](https://github.com/kubernetes/kubernetes/issues/71305#issuecomment-480506287)。

* Calicoのissue: [Calico networking broken when host OS uses iptables >= 1.8](https://github.com/projectcalico/calico/issues/2322)
* Weave Netのissue: [Weave Net breaks when host OS uses iptables 1.8](https://github.com/weaveworks/weave/issues/3465)

Weave NetのコンテナはAlpine Linuxベース。
Alpine Linuxの最新版の3.10だとiptablesが1.8になっているんだけど、デフォルトではなぜかlegacyな方が有効になっている。
もちろんnftablesを使う`iptables`コマンドに切り替えはできるけど、Weave Netの[公式コンテナ](https://hub.docker.com/r/weaveworks/weave-kube)はlegacyな方のままになっている。

Calicoは知らない…

# RHEL 8でDockerが配布されなくなった問題
CentOS 8の気になる変更点は上記3つなんだけど、もう一点、CentOSのアップストリームであるRHELの方のバージョン8でインパクトの大きい変更があったので、それにも触れる。

RHEL 7では、Red HatがビルドしてRHELでの動作を保証・サポートしてくれる版のDockerが、Red HatのYumリポジトリから配布されていたんだけど、RHEL 8ではそれが廃止されてしまった。
Red Hatとしては、代わりに自製の[Podman](https://podman.io/)を使えといっているんだけど、Podmanは[CRI](https://www.kaitoy.xyz/2019/06/15/k8s-ecosystem-container-runtimes/#cri)を実装していないっぽいし、Dockerに対するdockershimみたいなものもないので、Kubernetesからは使えないはず。

[Docker Enterprise Edition](https://success.docker.com/article/compatibility-matrix)はRHEL 8をサポートしているんだけど、当然有償だし、[売り飛ばされちゃったし](https://mag.osdn.jp/19/11/14/163000)、ちょっと手を出したくない感じ。

Docker Community Edition使えばいいじゃんと思うかもしれないけど、[Docker Community EditionはRHELをサポートしてない…](https://docs.docker.com/install/#supported-platforms)。
動くんだろうけど。

で、RHEL 8でKubernetes動かすなら、コンテナランタイムにDockerを使い難いので[CRI-O](https://www.kaitoy.xyz/2019/06/15/k8s-ecosystem-container-runtimes/#cri-o)を使うか[containerd](https://www.kaitoy.xyz/2019/06/15/k8s-ecosystem-container-runtimes/#cri-containerd)を使うか、という感じになるんだけど、いずれにせよDockerに比べて情報が少ないし設定も多いし面倒。

# Kubernetesでcontainerdを使う設定
コンテナランタイムは、今回の作業に関しては結局のところ、CentOSなのでDocker Community Editionでもいいんだけど、RHEL 8の上記の動きがあるし、[Kubernetesディストリビューション](https://www.kaitoy.xyz/2019/08/14/k8s-ecosystem-k8s-variations-and-container-host-oses/#kubernetes%E3%83%87%E3%82%A3%E3%82%B9%E3%83%88%E3%83%AA%E3%83%93%E3%83%A5%E3%83%BC%E3%82%B7%E3%83%A7%E3%83%B3)もOpenShiftやMicroK8sやk3sなど結構脱Dockerを済ませているので、それらを追ってcontainerdにしてみる。

containerdをインストールしてKubernetesから使うセットアップ方法については、[Kubernetesのマニュアル](https://kubernetes.io/docs/setup/production-environment/container-runtimes/#containerd)や[containerdのマニュアル](https://github.com/containerd/containerd/blob/master/docs/man/containerd-config.toml.5.md)や[containerdのCRI Pluginのマニュアル](https://github.com/containerd/cri/blob/release/1.2/docs/config.md)あたりを見ればなんとなくわかる。

containerdとruncのバイナリをダウンロードしてどっかに置いて、containerdの設定ファイル(i.e. `/etc/containerd/config.toml`)と起動のための[ユニットファイル](https://github.com/containerd/containerd/blob/master/containerd.service)を書いて、[kubeletの起動オプション](https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/)に`--container-runtime=remote`と`--container-runtime-endpoint=unix:///run/containerd/containerd.sock`を付けてあげればいいだけ。

containerdのconfig.tomlはバージョンによって結構変わるので、CRI Pluginのバージョンと合わせてよく確認しないと嵌る。

また、Dockerと同居させようとすると、Dockerとともにインストールされるcontainerdにバイナリやユニットファイルが上書きされたり、ソケットファイル(i.e. `/run/containerd/containerd.sock`)が競合したりして残念なことになるので、慣れないうちはやめておくべし。

# ようやくKubernetesクラスタ構築
前置きが長くなったけど、CentOS 8でシングルノード(マスタコンポとノードコンポ同居)のKubernetseクラスタを構築する。

構築に使うのは、いろいろカスタマイズするために自作したAnsibleプレイブックの[ansible-k8s](https://github.com/kaitoy/ansible-k8s)。
今回のために、[DNFがあればDNFを使う](https://github.com/kaitoy/ansible-k8s/commit/1b22d6be7a2f3745293f6c6f8cdee40770ede03c)ようにエンハンスした。
[containerdを使うようにもした](https://github.com/kaitoy/ansible-k8s/commit/ba53c08d260aba00f2977729b25594f786a4e7c2)。

また、iptablesはせっかくなので新しいやつを使いたくて、[nftables版のWeave Netコンテナ](https://github.com/kaitoy/weave-kube-nftables)も作って[DockerHubに挙げておいた](https://hub.docker.com/r/kaitoy/weave-kube)。

1. OSインストール

    VMware PlayerのVM作って、CentOS 8のインストールイメージを適当にダウンロードして、適当にMinimalインストール。

2. python3インストール

    CentOSのインストールが完了したら、OSにログインして、`yum install -y python3`

3. ansible-k8sダウンロード、インベントリ設定

    `git clone --recursive https://github.com/kaitoy/ansible-k8s.git` でダウンロードして、インベントリファイルである`ansible-k8s/production`を環境に合わせて編集する。

    `ansible_python_interpreter: /usr/bin/python3`はこのインベントリに書いておく。

4. nftables版のWeave Netコンテナを使う設定

    `ansible-k8s/extra_vars.yml`に以下を書いておく。

    ```yaml
    weave_net__weave_kube_image: docker.io/kaitoy/weave-kube:2.6.0-nftables
    weave_net__weave_npc_image: docker.io/kaitoy/weave-npc:2.6.0-nftables
    ```

5. ansible-k8s実行

    Ansibleはすでに使えるものとして、以下のコマンドでansible-k8sをキック。

    ```tch
    $ cd ansible-k8s
    $ ./play.sh production k8s_single_node_cluster.yml
    ```

    ansible-k8sの中の処理は[昔書いた内容](https://www.kaitoy.xyz/2018/04/17/kubernetes110-from-scratch/)と大きく変わっていない。

<br>

以上でKubernetesクラスタが構築出来て、Weave NetとCoreDNSがデプロイされた状態になる。

```tch
$ cat /etc/centos-release
CentOS Linux release 8.0.1905 (Core)
$ kubectl get node
NAME               STATUS   ROLES    AGE   VERSION
k8s-master.local   Ready    <none>   23d   v1.16.0
$ kubectl get po --all-namespaces
NAMESPACE     NAME                      READY   STATUS    RESTARTS   AGE
kube-system   coredns-77b79c856-b6dqh   1/1     Running   1          23d
kube-system   coredns-77b79c856-nv46g   1/1     Running   1          23d
kube-system   weave-net-9msnk           2/2     Running   3          23d
```

Dockerはいなくて、代わりにcontainerdが動いている。(`ctr`はcontainerdのクライアント。)

```tch
$ docker ps
-bash: docker: command not found
$ ctr -a /run/k8s-containerd/containerd.sock -n k8s.io task ls
TASK                                                                PID     STATUS
00dd015d67e40e4a8879edc56fd94fc9c5c0d68dbcb3f0576be3c31096ce20a6    2236    RUNNING
b93a71c250f40f68742300464be7b6950648417e15d0425d2544192199e1b86b    2425    RUNNING
1fb23ce08081f99388a3260bd4258fe3ad391ace1964a6b3c3823a528f1a7b5d    2477    RUNNING
307bdc92fdb0e392c68ce18a04685296e10040f29f2d519630c8ee92af4d9b4b    1449    RUNNING
e30a1ee0316bf299c74ae0e3bd026bb88a3ca78d133da419226ea04824de828b    1901    RUNNING
ebd5d32043d5d3db2f933162329353ce5db801db0bb78f6ca57e509e68dc7910    1559    RUNNING
e23c6600bd232a8a08b77798a62c236979b166caa92aa33eadc130390ae60fb2    2187    RUNNING
```

iptablesもnftablesでちゃんと動いているっぽい。

```tch
$ iptables --version
iptables v1.8.2 (nf_tables)
$ iptables -L
Chain INPUT (policy ACCEPT)
target     prot opt source               destination
KUBE-FIREWALL  all  --  anywhere             anywhere
WEAVE-NPC-EGRESS  all  --  anywhere             anywhere
WEAVE-IPSEC-IN  all  --  anywhere             anywhere

(snip)
```
