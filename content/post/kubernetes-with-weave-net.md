+++
categories = ["Programing"]
date = "2018-05-04T11:14:33+09:00"
draft = false
eyecatch = "weave-k8s.png"
slug = "kubernetes-with-weave-net"
tags = ["kubernetes", "docker"]
title = "Kubernetes 1.10のクラスタにWeave Netをデプロイする"
+++

「[Kubernetes 1.10をスクラッチから全手動で構築](https://www.kaitoy.xyz/2018/04/17/kubernetes110-from-scratch/)」で、Kubernetes 1.10のクラスタに、ネットワークプロバイダとして[flannel](https://github.com/coreos/flannel)をデプロイしたけど、flannelは[Network Policy](https://kubernetes.io/docs/concepts/services-networking/network-policies/)をサポートしていないので、代わりに[Weave Net](https://www.weave.works/oss/net/)をデプロイしてみた話。

{{< google-adsense >}}

# Weave Netにした理由
Network Policyをサポートしているネットワークプロバイダには現時点で以下のものがある。

* [Calico](https://www.projectcalico.org/)
* [Cilium](https://github.com/cilium/cilium)
* [Kube-router](https://www.kube-router.io/)
* [Romana](https://github.com/romana/romana)
* Weave Net

このなかで、よく名前を聞くのがCalicoとWeave Net。
GitHubのスター数が圧倒的に多いのがWeave Net。
[性能が比較的いい](https://engineering.skybettingandgaming.com/2017/02/03/overlay-network-performance-testing/)のがWeave Net。

ということでWeave Netにした。

# Weave Netデプロイ

以下を参考に設定してデプロイする。

* https://www.weave.works/docs/net/latest/kubernetes/kube-addon/
* https://www.weave.works/docs/net/latest/install/installing-weave/
* https://github.com/weaveworks/weave/blob/master/prog/weave-kube/launch.sh

## Kubernetesマニフェスト

Weave NetをKubernetesクラスタにデプロイするためのマニフェストは、[GitHub Releases](https://github.com/weaveworks/weave/releases)か`https://cloud.weave.works`からダウンロードできる。
今回は後者にする。

`https://cloud.weave.works`を使う場合、Kubernetesのバージョンなどのパラメータは[クエリストリングで指定できる](https://www.weave.works/docs/net/latest/kubernetes/kube-addon/#-changing-configuration-options)。
主なパラメータは以下。

* k8s-version: Kubernetesのバージョン。指定しないとlatest。
* password-secret: ノード間の[Weave Net通信の暗号化](https://www.weave.works/docs/net/latest/concepts/encryption/)に使うパスワードを保持するSecret名。指定しないと平文。(参考: https://www.weave.works/docs/net/latest/tasks/manage/security-untrusted-networks/)
* IPALLOC_RANGE: Podに割り当てるIPアドレスの範囲。指定しないと10.32.0.0/12。
* CHECKPOINT_DISABLE: Weave Netのアップデートを[定期的にチェック](https://www.weave.works/docs/net/latest/install/installing-weave/#checkpoint)する機能の無効化オプション。
* WEAVE_MTU: MTUを指定するオプション。[デフォルトで1376バイト](https://www.weave.works/docs/net/latest/tasks/manage/fastdp/#packet-size-mtu)。

<br>

WEAVE_MTUはとりあえずデフォルトにしておいて、IPALLOC_RANGEもデフォルトにして、通信暗号化して、CHECKPOINT_DISABLEをtrueにするとすると、マニフェストは以下のようにダウンロードできる。

```sh
# curl -fsSLo weave-daemonset.yaml "https://cloud.weave.works/k8s/net?k8s-version=$(kubectl version | base64 | tr -d '\n')&env.CHECKPOINT_DISABLE=1&password-secret=weave-passwd"
```

(通信暗号化は単一ノードなら不要だと思うけどとりあえず設定しておく。)

## Kubernetesコンポーネントの起動オプション

kube-controller-managerの起動オプションの`--cluster-cidr`はIPALLOC_RANGEと同じにする必要がある。
今回は10.32.0.0/12を指定する。

また、kube-proxyの起動オプションの[要件](https://www.weave.works/docs/net/latest/kubernetes/kube-addon/#-things-to-watch-out-for)は以下。

* `--masquerade-all`を指定してはいけない。
* `--cluster-cidr`を指定する場合、IPALLOC_RANGEと同じにする必要がある。

また、kube-apiserverとkube-controller-managerの起動オプションに`--allow-privileged`を付ける必要があるはず。

## Secret作成

password-secretに渡すSecretは以下のように作成できる。

```sh
# WEAVE_PASSWORD=$(echo -n 'your_secure_password' | base64)
# cat <<EOF | kubectl create -f -
apiVersion: v1
kind: Secret
metadata:
  namespace: kube-system
  name: weave-passwd
type: Opaque
data:
  weave-passwd: ${WEAVE_PASSWORD}
EOF
```

<br>

これで準備完了。

## マニフェスト適用

以下のコマンドでマニフェストを適用し、Weave Netをデプロイできる。

```sh
# kubectl apply -f weave-daemonset.yaml
```

`weaveworks/weave-kube:2.3.0`と`weaveworks/weave-npc:2.3.0`がpullされる。
前者が本体で、後者がNetwork Policy Controller。

<br>

マスタノード上で以下のコマンドを実行すると、Weave NetのAPIを叩いて状態を確認できる。

```sh
# curl http://localhost:6784/status
        Version: 2.3.0 (version check update disabled)

        Service: router
       Protocol: weave 1..2
           Name: 92:44:35:3d:f8:d8(k8s-master)
     Encryption: enabled
  PeerDiscovery: enabled
        Targets: 1
    Connections: 1 (1 failed)
          Peers: 1
 TrustedSubnets: none

        Service: ipam
         Status: ready
          Range: 10.32.0.0/12
  DefaultSubnet: 10.32.0.0/12
```
