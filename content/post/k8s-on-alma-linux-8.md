---
categories: ["Programming"]
title: "Kubernetes 1.20 のクラスタを AlmaLinux 8で構築する"
date: 2021-04-06T22:50:50+09:00
cover: "kubernetes.png"
slug: "k8s-on-alma-linux-8"
tags: ["Kubernetes", "alma-linux"]
draft: false
highlight: true
highlightStyle: "monokai"
highlightLanguages: []
---

CentOSの後継として開発されているAlmaLinuxの安定板がリリースされたので、Kubernetesの最新版をインストールしてみた話し。

<!--more-->

{{< google-adsense >}}

# CentOSの終焉
2020年12月8日にCentOSの公式ブログで[CentOSがCentOS Streamにシフトするというアナウンス](https://blog.centos.org/2020/12/future-is-centos-stream/)があった。

CentOS StreamはRHELの開発版みたいなもので、メジャーバージョンしかなく(i.e. マイナーバージョンが無い)、リポジトリのYUMパッケージが随時最新版に置き換わっていくので、追随していけば最新の機能や修正を取り入れていけるという感じのもの。
逆に言えば固定的なバージョンが無いので、特定のバージョンをがっつり評価して導入みたいなことはできない。

ある時点のCentOS StreamからRHELの新バージョンがリリースされる。
つまり、リリースされたRHELをもとに開発されていた従来のCentOSとは逆。

これまでRHELの代わりにCentOSを使っていたユーザは、基本的にはお金払ってRHELに移行してねというのがRed Hatの意向。
実際、随時リポジトリのパッケージが入れ替わっていくCentOS Streamは、開発機くらいにしか使えない気がする。

# AlmaLinux
CentOS終焉のアナウンスを受けて、従来のCentOSの後継として名乗りをあげたのが[AlmaLinux](https://almalinux.org/)。
従来のCentOS同様、リリースされたRHELをもとに開発されるOSSのRHELクローン。

プロダクションレディで、RHELとバイナリ互換があって、固定的なバージョンがある。
2029年までのサポートがコミットされている。
完璧。

これの初バージョンであるAlmaLinux 8.3が2021年3月30日に[リリースされた](https://almalinux.org/blog/almalinux-os-stable-release-is-live/)ので、触りがてらKubernetesをインストールしてみる。

因みに、同様にCentOSの後継として[Rocky Linux](https://rockylinux.org/)というのも立ち上がったけど、[まだビジョンを語っている程度で](https://github.com/rocky-linux/rocky/tree/0867e404a489ef3faca765fc94911ecfcc483145#frequently-asked-questions)ちょっと出遅れた感じ。

# AlmaLinuxのインストール
AlmaLinuxのインストールメディアイメージは[公式サイト上部のDownload ISOs](https://repo.almalinux.org/almalinux/8/isos/x86_64/)から取得できる。

VMware Playerで作ったメモリ4GB、CPU2コアのVMにダウンロードしたAlmaLinux-8.3-x86_64-dvd.isoを付けて起動したら、CentOSと全く同じ感じのインストール画面が出た。
Minimalでインストールした。

なんの問題もなくさっくり完了。

# Kubernetesクラスタ構築
インストールしたAlmaLinux 8.3にシングルノード(マスタコンポとノードコンポ同居)のKubernetseクラスタを構築する。

構築に使うのは、いろいろカスタマイズするために自作したAnsibleプレイブックの[ansible-k8s](https://github.com/kaitoy/ansible-k8s)。
[以前CentOS 8にKubernetes 1.16をいれた](https://www.kaitoy.xyz/2019/12/05/k8s-on-centos8-with-containerd/)ことがあるので、その手順をなぞる。
今回入れるのはKubernetes 1.20.5。

すっと行くかと思ったら途中で`Module nf_conntrack_ipv4 not found in directory /lib/modules/4.18.0-240.el8.x86_64`というエラーがでた。
どうもRHEL 8.3で[nf_conntrack_ipv4はnf_conntrackにマージされた消え去った](https://github.com/kubernetes-sigs/kubespray/issues/6934)らしいので、ansible-k8sのextra_vars.ymlに以下を追記してnf_conntrackをロードするようにする。

```yaml
k8s_node__kernel_modules_to_load_for_ipvs:
- ip_vs
- ip_vs_rr
- ip_vs_wrr
- ip_vs_sh
- nf_conntrack
```

再度トライしたらインストール成功した。

```console
[root@k8s-master ~]# cat /etc/almalinux-release
AlmaLinux release 8.3 (Purple Manul)
[root@k8s-master ~]# kubectl get node
NAME               STATUS   ROLES    AGE    VERSION
k8s-master.local   Ready    <none>   2d4h   v1.20.5
```
