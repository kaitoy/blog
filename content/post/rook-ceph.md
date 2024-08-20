+++
categories = ["Programming"]
title = "Rook/CephでCephFSを試す"
date = "2020-10-11T12:27:15+09:00"
tags = ["Kubernetes", "rook", "ceph"]
draft = false
cover = "rook.png"
slug = "rook-ceph"
highlight = true
highlightStyle = "monokai"
highlightLanguages = []
+++

Kubernetesの2ノードクラスタにRookをデプロイして、小さいCephクラスタを作ってCephFSのボリュームを切り出してみた。

<!--more-->

{{< google-adsense >}}

# Rook
[Rook](https://rook.github.io/)はKubernetes上に分散ストレージシステムをデプロイして管理するOSSの[オペレータ](https://kubernetes.io/ja/docs/concepts/extend-kubernetes/operator/)。

サポートしているストレージプロバイダは現在のv1.4時点でCeph、EdgeFS、Cassandra、CockroachDB、NFS、YugabyteDBだけど、StableなのはCephとEdgeFSだけで他はAlpha。
さらに、EdgeFSがOSSじゃなくなって[Rookがサポート落としかけた](https://github.com/rook/rook/issues/5525)こともあってRook/EdgeFSは先行き怪しいので、今のところRookは実質ほぼCeph専用と言っていいかもしれない。

# Ceph
[Ceph](https://ceph.io/)は様々なインターフェースでアクセスできる分散オブジェクトストレージプラットフォーム。
Red Hatが商用版を展開しているけど、OSSなので無料でも使える。

CephのコアはRADOSという分散オブジェクトストア。
RADOSは、[OSD](https://docs.ceph.com/docs/master/glossary/#term-Ceph-OSD-Daemon)と[MON](https://docs.ceph.com/docs/master/glossary/#term-Ceph-Monitor)によるクラスタ([Ceph Storage Cluster](https://docs.ceph.com/docs/master/rados/#ceph-storage-cluster))として構成される。

OSDはディスク単位で動いてそのディスクへのI/Oを司るデーモン。
RADOSで管理するディスクの数だけ動く。

MONはOSDの監視、クラスタの構成情報([Cluster Map](https://docs.ceph.com/en/latest/architecture/#cluster-map))の管理、CLIクライアントに対するインターフェースの役割をするデーモン。
普通は高可用性のために複数動き、[Paxos](https://ja.wikipedia.org/wiki/Paxos%E3%82%A2%E3%83%AB%E3%82%B4%E3%83%AA%E3%82%BA%E3%83%A0)で合意形成する。

Cephにはもう一つ新しめなコンポーネントとして、[Ceph Manager (MGR)](https://docs.ceph.com/docs/master/mgr/#ceph-manager-daemon)というデーモンがある。
これはMONと同じ数だけ同じノードで動いて、Ceph Storage Clusterの監視や管理のためのインターフェースとか[Ceph Dashboard](https://docs.ceph.com/docs/master/mgr/dashboard/)を提供してくれるもの。
Ceph v11ではオプショナルだったけど、Ceph v12からほぼ必須のデーモンになった。

MGRの機能はモジュラー構成になっていて、以下のようなモジュールがビルトインされている。

* [Dashboard module](https://docs.ceph.com/docs/master/mgr/dashboard/): Ceph Dashboard。
* [RESTful module](https://docs.ceph.com/docs/master/mgr/restful/): クラスタステータスを取得するREST API。
* [Zabbix module](https://docs.ceph.com/docs/master/mgr/zabbix/): Zabbixにクラスタステータスを定期的にpushしてくれるモジュール。
* [Prometheus module](https://docs.ceph.com/docs/master/mgr/prometheus/): Prometheusからクラスタステータスを取れるようにするためのexporter。
* [Telemetry module](https://docs.ceph.com/docs/master/mgr/telemetry/): クラスタの情報をCeph開発者コミュニティに送るモジュール。
* [Crash module](https://docs.ceph.com/docs/master/mgr/crash/): Cephのデーモンのクラッシュダンプを集めてクラスタに保存してくれるモジュール。
* [Rook module](https://docs.ceph.com/docs/master/mgr/rook/): CephとKubernetesを連携させるモジュール。

# Cephのストレージインターフェース

RADOSにアクセスしてデータ読み書きする手段はいくつかあって、一番プリミティブなのが[librados](https://docs.ceph.com/docs/master/rados/api/librados-intro/)というライブラリを使ってAPIを呼ぶものなんだけど、RADOSの上に実装されたストレージインターフェースもあって、そっち経由でアクセスするのが多分普通。

ストレージインターフェースには以下の3つがある:

* [Ceph File System (CephFS)](https://docs.ceph.com/docs/master/cephfs/)

    POSIX互換のファイルシステム。mount.cephでマウントできるほか、[NFSとしてexportしてマウントすることもできる](https://docs.ceph.com/docs/master/cephfs/nfs/)。

* [Ceph Block Device](https://docs.ceph.com/docs/master/rbd/)

    ブロックデバイス。シンプロビジョニングでリサイザブル。RBDとも呼ばれる。
    というかRBDと呼ばれることの方が多い。
    デバイスファイルにマッピングしたり、QEMU/KVMのVMやKubernetesのPodからマウントしたり、iSCSIでつないだりできる。

* [Ceph Object Gateway](https://docs.ceph.com/docs/master/radosgw/)

    オブジェクトストレージ。AWSのS3やOpenStackのSwiftと互換性がある。RADOSGWとも呼ばれる。

![ceph](https://docs.ceph.com/docs/master/_images/stack.png)

<br>

KubernetesのPodにマウントするストレージとしてはCephFSかRBDが使えるけど、CephFSのボリュームは複数のノードのPodでマウントできるのに対し、RBDのは単一のNodeでしかマウントできないので、CephFSのほうがユースケース広そう。

なので今回はCephFSを試す。

# CephFS
CephFSはPOSIX互換のファイルシステムで、スケーラブルで高性能。
性能を確保するために、ファイルの実態のI/Oを担当するOSDとは別に、ファイルのメタデータを扱うMDS (Metadata Server)というデーモンが動くアーキテクチャになっている。

![cephfs](https://docs.ceph.com/docs/master/_images/cephfs-architecture.svg)

# Pool
PoolはCephのCeph Storage Clusterを論理的に分割するもの。
Poolごとにデータの冗長性などの設定やCluster Mapが分けられる。

Poolは少なくともストレージインターフェース毎に分かれる。
CephFSはファイルシステムのメタデータ用とファイルの実データ用の二つのPoolを使う。

# OSDのストレージバックエンド
割と余談なんだけど、OSDがRADOSのオブジェクトを永続化するためのバックエンドには、FileStoreとBlueStoreの二種類がある。

FileStoreはXFSやBtrfsといったPOSIX互換のファイルシステムに依存するもの。
BlueStoreはFileStoreより新しいやつで、ストレージデバイスに直接アクセスするので、ファイルシステムのオーバーヘッドが無い分FileStoreより性能がいい。

Rookは現在最新のv1.4の時点でBlueStoreだけをサポートしている。

# Rook/CephでCephFSのPVを作ってPostgreSQLポッドで使う

以降、実際にRookを触っていく。

参考資料:

* Rookのマニュアル
    - https://rook.github.io/docs/rook/v1.4/ceph-quickstart.html
    - https://rook.github.io/docs/rook/v1.4/ceph-examples.html
* Rookのサンプルマニフェスト
    - https://github.com/rook/rook/tree/v1.4.5/cluster/examples/kubernetes/ceph
* Cephの手動デプロイ手順
    - https://docs.ceph.com/en/latest/install/manual-deployment/

## 環境
VMware PlayerのVMを二つ使って、Oracle Linux 7.4をいれて2ノードのKubernetesクラスタを作って、そこにRookをデプロイする。

VMはともにCPUコア一つメモリ4GBの貧弱なスペック。
ホスト名は`k8s-master`と`k8s-node`。

それぞれにOSD用の10GBの未フォーマットのディスクを追加した。
追加したディスクのデバイスファイルはともに`/dev/sdb`

Kubernetesのバージョンは1.19.2。
Rookのバージョンは1.4.5。
Cephのバージョンは15.2.4。

## OSD用のPVをデプロイ
OSD用のストレージデバイスとしては、生のディスク全体、ディスクのパーティション、LVMの論理ボリューム(など?)が使えるんだけど、今回は生のディスク全体を使ってみる。

RookでOSDに使わせるストレージデバイスは[CephCluster](https://rook.github.io/docs/rook/v1.4/ceph-cluster-crd.html)というRookのカスタムリソースに指定する。
指定する形式にHost-basedとPVC-basedと二種類ある。
前者はノードのホスト名やデバイスファイル名をCephClusterに直接書く形式で、後者は[Raw Block VolumeのPV](https://kubernetes.io/docs/concepts/storage/persistent-volumes/#raw-block-volume-support)にバインドするPVC(のテンプレート)をCephClusterに書く形式。
PVC-basedの方が新しいし、物理的なリソースとKubernetesのリソースとの分離がよりはっきりしていいので、そちらを使うことにする。

Raw Block VolumeのPVは動的プロビジョニングできたらかっこいいけど、今回は簡単に前もって手動で作っておくことにする。
`k8s-master`と`k8s-node`の分、合わせて二つとして以下をapplyした。

```yaml
---
kind: PersistentVolume
apiVersion: v1
metadata:
  name: k8s-master-sdb
  labels:
    osd: "true"
spec:
  volumeMode: Block
  capacity:
    storage: 10Gi
  local:
    path: /dev/sdb
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  nodeAffinity:
    required:
      nodeSelectorTerms:
      - matchExpressions:
        - key: kubernetes.io/hostname
          operator: In
          values:
          - k8s-master
---
kind: PersistentVolume
apiVersion: v1
metadata:
  name: k8s-node-sdb
  labels:
    osd: "true"
spec:
  volumeMode: Block
  capacity:
    storage: 10Gi
  local:
    path: /dev/sdb
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  nodeAffinity:
    required:
      nodeSelectorTerms:
      - matchExpressions:
        - key: kubernetes.io/hostname
          operator: In
          values:
          - k8s-node
```

ラベルの`osd: "true"`は、OSDのPVCとバインドするときにラベルセレクタで使う目印。

`volumeMode`が`Block`で、`path`にデバイスファイルを指定しているのがRaw Block VolumeのPVならでは。

ボリュームプラグインが[local](https://kubernetes.io/docs/concepts/storage/volumes/#local)なので`nodeAffinity`でホスト名を使ってノード名を指定している。

## Rookの共通リソースをデプロイ
ここからRookをデプロイしていく。
まずは[共通リソース](https://rook.github.io/docs/rook/v1.4/ceph-examples.html#common-resources)。

RookのGitリポジトリにあるcommon.yamlをapplyすればいい。

```console
[root]# git clone https://github.com/rook/rook.git
[root]# cd rook/cluster/examples/kubernetes/ceph
[root]# git co v1.4.5
[root]# kubectl apply -f common.yaml
```

これでRookのNamespaceとかCustomResourceDefinitionとかRoleとかが作られる。

## Rook/Cephオペレータをデプロイ
Rook/Cephオペレータのマニフェストはcommon.yamlと同じディレクトリのoperator.yaml。
そのままだとRBDとCephFS両方のCSIドライバが有効になってるけど、CephFSしか使わないのでRBDを無効にする。

```diff
--- a/cluster/examples/kubernetes/ceph/operator.yaml
+++ b/cluster/examples/kubernetes/ceph/operator.yaml
@@ -27,7 +27,7 @@ data:
   # To run the non-default version of the CSI driver, see the override-able image properties in operator.yaml
   ROOK_CSI_ENABLE_CEPHFS: "true"
   # Enable the default version of the CSI RBD driver. To start another version of the CSI driver, see image properties below.
-  ROOK_CSI_ENABLE_RBD: "true"
+  ROOK_CSI_ENABLE_RBD: "false"
   ROOK_CSI_ENABLE_GRPC_METRICS: "true"

   # Set logging level for csi containers.
```

また、OSDのデバイスをHost-basedで指定するときにしか使わないデーモンも有効になってるので無効化する。

```diff
--- a/cluster/examples/kubernetes/ceph/operator.yaml
+++ b/cluster/examples/kubernetes/ceph/operator.yaml
@@ -399,7 +399,7 @@ spec:
         # Whether to start the discovery daemon to watch for raw storage devices on nodes in the cluster.
         # This daemon does not need to run if you are only going to create your OSDs based on StorageClassDeviceSets with PVCs.
         - name: ROOK_ENABLE_DISCOVERY_DAEMON
-          value: "true"
+          value: "false"

         # Time to wait until the node controller will move Rook pods to other
         # nodes after detecting an unreachable node.
```

また、嵌りどころだったんだけど、ホストのカーネルバージョンが古いとCephFSを使うPodが以下のようなエラーで立ち上がらない問題が発生する。

```plaintext
Warning  FailedMount             4m42s (x12 over 29m)  kubelet, k8s-master      (combined from similar events): MountVolume.MountDevice failed for volume "pvc-991cbae4-311f-4c8a-bfa9-6af99dde2575" : rpc error: code = Internal desc = an error (exit status 32) occurred while running mount args: [-t ceph 10.0.170.252:6789:/volumes/csi/csi-vol-68a7996a-de9e-11ea-8dcc-e2634a1533d6/ad3ed71f-e4a3-4a2a-9f41-ed3f274a4b54 /var/lib/kubelet/plugins/kubernetes.io/csi/pv/pvc-991cbae4-311f-4c8a-bfa9-6af99dde2575/globalmount -o name=csi-cephfs-node,secretfile=/tmp/csi/keys/keyfile-909027452,mds_namespace=shared-fs,_netdev]
```

これは[mount.ceph](https://docs.ceph.com/en/latest/man/8/mount.ceph/)のmds_namespaceオプションが使えないためで、カーネルバージョンが[4.10未満だと踏むエラー](https://github.com/rook/rook/issues/5066#issuecomment-603219432)。
([4.7未満説もある](https://github.com/rook/rook/pull/1199/files#diff-efddded138f9e17f25eadec1330816b7)。)

Rook/Cephオペレータの設定を以下のように変えて、CephFSボリュームをカーネルドライバでマウントする代わりにceph-fuseでマウントするようにすればこの問題を回避できる。

```diff
--- a/cluster/examples/kubernetes/ceph/operator.yaml
+++ b/cluster/examples/kubernetes/ceph/operator.yaml
@@ -38,7 +38,7 @@ data:
   # If you disable the kernel client, your application may be disrupted during upgrade.
   # See the upgrade guide: https://rook.io/docs/rook/master/ceph-upgrade.html
   # NOTE! cephfs quota is not supported in kernel version < 4.17
-  CSI_FORCE_CEPHFS_KERNEL_CLIENT: "true"
+  CSI_FORCE_CEPHFS_KERNEL_CLIENT: "false"

   # (Optional) Allow starting unsupported ceph-csi image
   ROOK_CSI_ALLOW_UNSUPPORTED_VERSION: "false"
```

ここまで編集したらapply。

```console
[root]# kubectl apply -f operator.yaml
```

`rook-ceph`というNamespaceでRook/Cephオペレータが動き出す。

```console
[root]# kubectl get po -n rook-ceph
NAME                                            READY   STATUS      RESTARTS   AGE
rook-ceph-operator-7c6fb4bf5f-8zn54             1/1     Running     1          4d3h
```

## Ceph Storage Clusterをデプロイ
次はCephClusterをapplyしてCeph Storage Cluster(i.e. OSDとMONとMGR)をデプロイするんだけど、その前にCephの各デーモンの[カスタム設定](https://rook.io/docs/rook/v1.4/ceph-advanced-configuration.html#custom-cephconf-settings)を作っておく。
これは、`rook-config-override`という名前のConfigMapを作って[Cephの設定](https://docs.ceph.com/en/latest/rados/configuration/)を書いておくと、Rookが作る設定を上書きできるというもの。
作らなくても動くけど、今回作るCeph Storage ClusterはOSDの数が2つで推奨構成の3つ以上より少ないので、それについてだけ設定しておく。

カスタム設定として以下のyamlファイルをapplyした。

```yaml
kind: ConfigMap
apiVersion: v1
metadata:
  name: rook-config-override
  namespace: rook-ceph
data:
  config: |
    [global]
    osd pool default size = 2
```

<br>

で、CephCluster。
PVC-basedなCephClusterのマニフェストサンプルはcommon.yamlと同じディレクトリのcluster-on-pvc.yaml。
CephClusterの内容で気にしたところは以下。

* データディレクトリ

    CephClusterの`spec.dataDirHostPath`にはデフォルトで`/var/lib/rook`が設定されていて、Kubernetesクラスタの各ノードのそのパスにはRookのログとかCephの設定ファイルとかが入る。

    これは今回そのままにしておく。

* MONの設定
    - MONの数

        `spec.mon.count`にMONを動かすPod数を書く。デフォルトでは3。MONはPaxosで合意形成をするために奇数個である必要がある。

        今回はKubernetesノードが二つしかないので、1にしておく。

    - MONのデータストア

        `spec.mon.volumeClaimTemplate`にMONがモニタリングのためのデータを格納するPVをマウントするためのPVC(のテンプレート)を書く。

        今回は何も指定しないことにする。
        指定しないと、`spec.dataDirHostPath`に指定したパスの下にデータが入る。

* OSDの設定
    - PVC-basedの設定

        PVC-basedの場合、`spec.storage.storageClassDeviceSets`にOSDの設定を書く。

        `spec.storage.storageClassDeviceSets.count`がOSDを動かすPod数なので、2にしておく。

        `spec.storage.storageClassDeviceSets.volumeClaimTemplates`にさっきデプロイしたOSD用のPVをマウントするためのPVC(のテンプレート)を書く。
        今回は`osd: "true"`というラベルをキーにしてPVとPVCをバインドさせる。

cluster-on-pvc.yamlの差分は以下。

```diff
--- a/cluster/examples/kubernetes/ceph/cluster-on-pvc.yaml
+++ b/cluster/examples/kubernetes/ceph/cluster-on-pvc.yaml
@@ -17,20 +17,8 @@ metadata:
 spec:
   dataDirHostPath: /var/lib/rook
   mon:
-    count: 3
+    count: 1
     allowMultiplePerNode: false
-    # A volume claim template can be specified in which case new monitors (and
-    # monitors created during fail over) will construct a PVC based on the
-    # template for the monitor's primary storage. Changes to the template do not
-    # affect existing monitors. Log data is stored on the HostPath under
-    # dataDirHostPath. If no storage requirement is specified, a default storage
-    # size appropriate for monitor data will be used.
-    volumeClaimTemplate:
-      spec:
-        storageClassName: gp2
-        resources:
-          requests:
-            storage: 10Gi
   cephVersion:
     image: ceph/ceph:v15.2.4
     allowUnsupported: false
@@ -49,7 +37,7 @@ spec:
     storageClassDeviceSets:
     - name: set1
       # The number of OSDs to create from this device set
-      count: 3
+      count: 2
       # IMPORTANT: If volumes specified by the storageClassName are not portable across nodes
       # this needs to be set to false. For example, if using the local storage provisioner
       # this should be false.
@@ -116,11 +104,12 @@ spec:
       volumeClaimTemplates:
       - metadata:
           name: data
           # if you are looking at giving your OSD a different CRUSH device class than the one detected by Ceph
           # annotations:
           #   crushDeviceClass: hybrid
         spec:
+          selector:
+            matchLabels:
+              osd: 'true'
           resources:
             requests:
               storage: 10Gi
-          # IMPORTANT: Change the storage class depending on your environment (e.g. local-storage, gp2)
-          storageClassName: gp2
           volumeMode: Block
           accessModes:
             - ReadWriteOnce
```

ここまで編集したらapply。

```console
[root]# kubectl apply -f cluster-on-pvc.yaml
```

Rook/Cephオペレータと同じく`rook-ceph`というNamespaceで、OSD、MON、MGRが動き出す。
OSDのストレージデバイスを初期化するJobとかも実行される。

```console
[root]# kubectl get po -n rook-ceph
NAME                                            READY   STATUS      RESTARTS   AGE
csi-cephfsplugin-provisioner-7478b9dccf-6gnlp   6/6     Running     0          9m43s
csi-cephfsplugin-provisioner-7478b9dccf-w2f6q   6/6     Running     6          8m58s
csi-cephfsplugin-qdsl2                          3/3     Running     0          8m18s
csi-cephfsplugin-jl2qj                          3/3     Running     0          7m51s
rook-ceph-mgr-a-77cf85dc48-rhr4q                1/1     Running     0          6m36s
rook-ceph-mon-a-7bc4d4d86b-jjbfc                1/1     Running     0          18s
rook-ceph-operator-7c6fb4bf5f-8zn54             1/1     Running     1          4d21h
rook-ceph-osd-0-74bb499d8-dnktb                 1/1     Running     0          3m34s
rook-ceph-osd-1-844dccbc49-cvj7t                1/1     Running     1          4m9s
rook-ceph-osd-prepare-set1-data-0-fzhq5-vjbs6   0/1     Completed   0          4d23h
```

Cephのデーモン以外にも動いているPodがいる。

csi-cephfspluginはCephFSのボリュームをPVとして扱えるようにするCSIプラグインで、DaemonSetで全Kubernetesノード上でひとつずつ動く。

csi-cephfsplugin-provisionerはCephFSのPVを動的プロビジョニングとかをしてくれるやつで、replicasが2のDeploymentで起動されている。
このreplicasの値など、csi-cephfsplugin-provisionerのDeploymentマニフェストはカスタマイズできないっぽい。

<br>

MONのPodであるrook-ceph-mon-a-7bc4d4d86b-jjbfcを`kubectl describe`してみると、HostPathで`/var/lib/rook/mon-a/data`をマウントしているのが分かる。
また、Node-Selectorsで`kubernetes.io/hostname=k8s-node`が設定されているので、常に`k8s-node`の方のノードで動くようになっている。
MONのデータストアにPVを使うようにした場合はNode-Selectorsは付かないんだろうか。

今回の構成の場合、MONは一つで、常に`k8s-node`上で動くので、`k8s-node`が落ちるとCeph Storage Clusterが機能しなくなる。
真面目にやるときはMONを3つ以上にして複数ノードに分散させる必要がある。

## CephFSをデプロイ
CephFSをあらわすカスタムリソースは[CephFilesystem](https://rook.github.io/docs/rook/v1.4/ceph-filesystem-crd.html)で、そのマニフェストサンプルはcommon.yamlと同じディレクトリのfilesystem.yaml。

CephFilesystemには、MDSの設定と、二つのPoolの設定を書く。
サンプルから変えたのは、各Poolのデータのレプリカ数をOSDの数に合わせたところだけ。

```diff
--- a/cluster/examples/kubernetes/ceph/filesystem.yaml
+++ b/cluster/examples/kubernetes/ceph/filesystem.yaml
@@ -13,7 +13,7 @@ spec:
   # The metadata pool spec. Must use replication.
   metadataPool:
     replicated:
-      size: 3
+      size: 2
       requireSafeReplicaSize: true
     parameters:
       # Inline compression mode for the data pool
@@ -26,7 +26,7 @@ spec:
   dataPools:
     - failureDomain: host
       replicated:
-        size: 3
+        size: 2
         # Disallow setting pool with replica 1, this could lead to data loss without recovery.
         # Make sure you're *ABSOLUTELY CERTAIN* that is what you want
         requireSafeReplicaSize: true
```

ここまで編集したらapply。

```console
[root]# kubectl apply -f filesystem.yaml
```

Rook/Cephオペレータと同じく`rook-ceph`というNamespaceでMDSが動き出す。
MDSはActiveとStandyの二つのPodで動く。

```console
[root]# kubectl get po -n rook-ceph
NAME                                            READY   STATUS      RESTARTS   AGE
csi-cephfsplugin-provisioner-7478b9dccf-6gnlp   6/6     Running     16         8h
csi-cephfsplugin-provisioner-7478b9dccf-w2f6q   6/6     Running     9          8h
csi-cephfsplugin-qdsl2                          3/3     Running     0          8h
csi-cephfsplugin-jl2qj                          3/3     Running     0          8h
rook-ceph-mds-myfs-a-9cdd75c7d-qhpj9            1/1     Running     4          3d18h
rook-ceph-mds-myfs-b-74fdc8f896-mdnps           1/1     Running     2          3d18h
rook-ceph-mgr-a-77cf85dc48-rhr4q                1/1     Running     2          8h
rook-ceph-mon-a-7bc4d4d86b-jjbfc                1/1     Running     0          8h
rook-ceph-operator-7c6fb4bf5f-8zn54             1/1     Running     1          5d6h
rook-ceph-osd-0-74bb499d8-dnktb                 1/1     Running     0          8h
rook-ceph-osd-1-844dccbc49-cvj7t                1/1     Running     1          8h
rook-ceph-osd-prepare-set1-data-0-fzhq5-vjbs6   0/1     Completed   0          5d8h
```

## Cephダッシュボードを確認
ここで、MGRの機能である[Cephダッシュボード](https://docs.ceph.com/en/latest/mgr/dashboard/)にアクセスして、Ceph Storage Clusterの状態を確認してみる。

Cephダッシュボードは`rook-ceph`のNamespaceにある`rook-ceph-mgr-dashboard`というServiceでKubernetesクラスタ内に公開されている。
これにクラスタ外からアクセスするにはいくつか方法があるけど、簡単なのはKubernetesノード上で`kubectl port-forward`を使って`rook-ceph-mgr-dashboard`のポートを外部にフォワーディングする方法。

以下のコマンドを実行すると、`https://<ノードのIPアドレス>:8443`でCephダッシュボードにアクセスできるようになる。

```console
[root]# kubectl port-forward -n rook-ceph --address 0.0.0.0 svc/rook-ceph-mgr-dashboard  8443:8443
```

Cephダッシュボードにアクセスするとログイン画面が出る。

![ceph-dashboard-login.png](/images/rook-ceph/ceph-dashboard-login.png)

Usernameは`admin`で、Passwordは以下のコマンドで取得できる文字列を入れるとログインできる。

```console
[root]# kubectl get -n rook-ceph secret rook-ceph-dashboard-password -o jsonpath='{.data.password}'| base64 -d && echo
```

ログインすると以下のような画面になる。
MON、OSD、MGR、MDSがちゃんと動いていそうなことが見てとれる。

![ceph-dashboard.png](/images/rook-ceph/ceph-dashboard.png)

サイドバーのPoolsを開くと、CephFSのPoolである`myfs-data0` (実データ用)と`myfs-metadata` (メタデータ用)のPoolができていることが分かる。
Pool名のプレフィックスの`myfs`は前節で作ったCephFilesystemのリソース名。

![pools.png](/images/rook-ceph/pools.png)

## CephFSのStorageClassを登録
CephFSのPVは、CephFSを要求するPVCを作るとcsi-cephfsplugin-provisionerが作ってくれる。
CephFSを要求するPVCには、プロビジョナに`rook-ceph.cephfs.csi.ceph.com`を指定した[StorageClassを使う必要がある](https://rook.github.io/docs/rook/v1.4/ceph-filesystem.html#provision-storage)ので、まずそのStorageClassを作る。

CephFSのStorageClassのマニフェストサンプルは、RookのGitリポジトリのルートからみて`rook/cluster/examples/kubernetes/ceph/csi/cephfs/storageclass.yaml`。

このファイルの中身は以下のようになっている。

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-cephfs
provisioner: rook-ceph.cephfs.csi.ceph.com
parameters:
  # clusterID is the namespace where operator is deployed.
  clusterID: rook-ceph

  # CephFS filesystem name into which the volume shall be created
  fsName: myfs

  # Ceph pool into which the volume shall be created
  # Required for provisionVolume: "true"
  pool: myfs-data0

  # Root path of an existing CephFS volume
  # Required for provisionVolume: "false"
  # rootPath: /absolute/path

  # The secrets contain Ceph admin credentials. These are generated automatically by the operator
  # in the same namespace as the cluster.
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-cephfs-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/controller-expand-secret-name: rook-csi-cephfs-provisioner
  csi.storage.k8s.io/controller-expand-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-cephfs-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph

  # (optional) The driver can use either ceph-fuse (fuse) or ceph kernel client (kernel)
  # If omitted, default volume mounter will be used - this is determined by probing for ceph-fuse
  # or by setting the default mounter explicitly via --volumemounter command-line argument.
  # mounter: kernel
reclaimPolicy: Delete
allowVolumeExpansion: true
mountOptions:
  # uncomment the following line for debugging
  #- debug
```

コメントをみてちょっと編集すれば使えるようになっている。
特に気にすべきところは`parameters.fsName`と`parameters.pool`。それぞれ、CephFilesystemのリソース名と実データ用Pool名。
あとは`reclaimPolicy`くらいを見ておけばいいか。

今回はこのままでapplyすればいい。

```console
[root]# kubectl apply -f csi/cephfs/storageclass.yaml
```

これで`rook-cephfs`という名前のStorageClassが登録できた。

## CephFSのPVを作成
前節で登録したStorageClassを指定したPVCを作ると、自動でCephFSのPVが作られることを確認する。
以下のPVCをapplyする。

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: cephfs-pvc
spec:
  accessModes:
  - ReadWriteMany
  resources:
    requests:
      storage: 1Gi
  storageClassName: rook-cephfs
```

PVをgetしてみる。

```console
[root]# kubectl get pv
NAME                                       CAPACITY   ACCESS MODES   RECLAIM POLICY   STATUS   CLAIM                         STORAGECLASS   REASON   AGE
k8s-master-sdb                             10Gi       RWO            Retain           Bound    rook-ceph/set1-data-0-fzhq5                           6d8h
k8s-node-sdb                               10Gi       RWO            Retain           Bound    rook-ceph/set1-data-1-f6bm6                           6d8h
pvc-c041509d-96da-4975-b3fc-51e0e66983a1   1Gi        RWX            Delete           Bound    default/cephfs-pvc            rook-cephfs             4d17h
```

`pvc-c041509d-96da-4975-b3fc-51e0e66983a1`という名前のCephFSのPVが作られてた。

## CephFSのPVをPostgreSQLのPodでマウントする
前節で作られたCephFSのPVを実際にマウントして使ってみる。

PostgreSQLのPodを一つ作るため、以下のマニフェストを使う。

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
  name: postgresql-deployment
spec:
  selector:
    matchLabels:
      app: postgresql
  replicas: 1
  template:
    metadata:
      labels:
        app: postgresql
    spec:
      containers:
      - name: postgres
        image: postgres:11.9
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_PASSWORD
          value: admin
        - name: PGDATA
          value: /var/lib/postgresql/data/pgdata
        volumeMounts:
        - name: cephfs-pvc
          mountPath: /var/lib/postgresql/data
      volumes:
      - name: cephfs-pvc
        persistentVolumeClaim:
          claimName: cephfs-pvc
```

RoleとRoleBindingはPodSecurityPolicyが有効な環境でのおまじない。
その下にDeploymentがあって、`postgres:11.9`のコンテナイメージを起動して、前節で作ったcephfs-pvcをマウントしてデータ領域(`PGDATA`)として使うようにしている。

これをapplyするとPostgreSQLポッドが起動する。

```console
[root]# kubectl get po
NAME                                     READY   STATUS    RESTARTS   AGE
postgresql-deployment-68ff869bcb-8jtn4   1/1     Running   2          3d6h
```

ちゃんと動いてるか見るため、Pod内にexecでbashを起動して簡単なSQLを叩いてみる。

```console
[root]# kubectl exec -it postgresql-deployment-68ff869bcb-8jtn4 -- bash
root@postgresql-deployment-68ff869bcb-8jtn4:/# psql -U postgres postgres
psql (11.9 (Debian 11.9-1.pgdg90+1))
Type "help" for help.

postgres=# create table test (id integer, name varchar(10));
CREATE TABLE
postgres=# insert into test values (1, 'hogehoge');
INSERT 0 1
postgres=# select * from test;
 id |   name
----+----------
  1 | hogehoge
(1 row)

postgres=#
```

動いているっぽい。

今回はここまで。
