---
categories: ["Programming"]
title: "Kubernetesのエコシステム ー KubernetesバリエーションとコンテナホストOS編"
date: 2019-08-14
cover: "kubernetes.png"
slug: "k8s-ecosystem-k8s-variations-and-container-host-oses"
tags: ["kubernetes"]
draft: false
---

[前回](https://www.kaitoy.xyz/2019/06/23/k8s-ecosystem-preparing-k8s-cluster/)に続いて、Kubernetesのエコシステムをまとめていく。

今回はKubernetesのバリエーションとコンテナホストOSについて書く。

<!--more-->

{{< google-adsense >}}

# Kubernetesディストリビューション

オリジナルのKubernetesにいろいろくっつけてソリューションとして提供されているものたち。

## OpenShift v3+、OKD
[OpenShift](https://www.redhat.com/ja/technologies/cloud-computing/openshift)はRed Hatが提供するプロダクトで、エンタープライズ対応のアプリケーションを開発、デプロイできるプラットフォーム。
v3からRHEL + Docker + Kubernetesの構成になって、Kubernetesコンテナアプリケーションプラットフォームと名乗るようになった。
v4からはRHELに代わって、買収したCoreOS社の[Container Linux](https://coreos.com/os/docs/latest/)を使うようになった。

OpenShiftは普通のKubernetesに、OAuth認証機能、コンテナレジストリ、ロギングスタック([Elasticsearch](https://www.elastic.co/jp/products/elasticsearch) + [Kibana](https://www.elastic.co/jp/products/kibana) + [Fluentd](https://www.fluentd.org/))、[Prometeus](https://prometheus.io/)による監視機能、ダッシュボード、[Jenkins](https://jenkins.io/)によるCI/CD機能などをまとめて、シュっとエンタープレイズでセキュアに使える感じに仕上げたもの。

Kubernetesの[Minikube](https://github.com/kubernetes/minikube)に相当する[Minishift](https://github.com/minishift/minishift/)というのがあって、Minikubeと同じようなハイパバイザの上で簡単にシングルノードOpenShiftを動かせる。

OpenShiftのアップストリームがOSSの[Origin Community Distribution of Kubernetes (OKD)](https://github.com/openshift/origin)。
OKDは機能的にはOpenShiftとあまり変わらないらしいけど、サポートの有無が大きい。

## IBM Cloud Private (ICP)
[ICP](https://www.ibm.com/jp-ja/cloud/private)はIBMが提供するプロダクトで、エンタープライズ対応のアプリケーションを開発、デプロイできるプラットフォーム。
Kubernetesによるコンテナ環境だけでなく、VMwareとかのハイパバイザ環境、[OpenStack](https://www.openstack.org/)のIaaS、[Cloud Foundry](https://www.cloudfoundry.org/)によるPaaSなんかも統合的に扱える。

普通のKubernetes + Docker + [Istio](https://istio.io/)のコンテナ基盤に、LDAP連携認証機能とコンテナレジストリと[Helm](https://helm.sh/)のパッケージカタログを乗っけて、そのカタログから[Elastic Stack](https://www.elastic.co/jp/products/)とPrometeusと[Grafana](https://grafana.com/)をデプロイしてロギングと監視機能とダッシュボードを付けたり、[Microclimate](https://www.ibm.com/us-en/marketplace/microclimate)とJenkinsをデプロイしてCI/CDできるようにしたり、 各種ミドルウェア(e.g. [WebSphere](https://www.ibm.com/jp-ja/marketplace/java-ee-runtime)、[RabbitMQ](https://www.rabbitmq.com/))とフレームワーク(e.g. [MicroProfile](https://microprofile.io/)、[Kitura](https://www.kitura.io/)、[Spring](https://spring.io/))によるアプリケーションをデプロイしたりできる。

## Pivotal Container Service (PKS)
[PKS](https://pivotal.io/jp/platform/pivotal-container-service)はVMwareとPivotalが提供するプロダクト。
pkdコマンドでエンタープライズ用途向けKubernetesクラスタを構築、管理できる。
Cloud Foundryのコンポーネントでもある[BOSH](https://bosh.io/docs/)を利用していて、オンプレミス環境やGCPなどのクラウドやOpenStackによるPaaS環境といった色々な環境でのクラスタ構築をサポートしている。

特に、VMwareのプロダクトだけあってvSphereとの統合が強く、NSX-Tネットワーク仮想化によってセキュアでプログラマブルなネットワークを利用できる。
ストレージや監視回りなど、VMwareエコシステムの様々なツールとの連携もしやすくなっている。

[Pivotal Services Marketplace](https://pivotal.io/jp/platform/services-marketplace)からアドオンをデプロイできるサービスブローカやコンテナレジストリである[Harbor](https://goharbor.io/)も付いてくる。

## Tectonic
[Tectonic](https://coreos.com/tectonic/)はCoreOS社が開発していたもの。
オンプレミス環境やGCPなどのクラウドやOpenStackによるPaaS環境といった色々な環境でのクラスタ構築をサポート。
Kubernetesクラスタや、そのホストマシンの管理をGUIでできたり、PrometheusとAlertmanagerとGrafanaを載せてくれるのでメトリック監視もできる。
ホストOSは当然CoreOS(下記)なので、セキュアで運用が楽。

CoreOS社がRed Hatに買収されたため、TectonicはOpenShiftに吸収されることになった。

## Cisco Container Platform
[Cisco Container Platform](https://www.cisco.com/c/ja_jp/products/cloud-systems-management/container-platform/index.html)はCiscoによるKubernetesディストリビューション。

プロダクション向けのKubernetesとして、モニタリングやログ管理やGUIとかを付けてくれているのは他のディストリビューションと同じだけど、特徴としては[HyperFlex](https://www.cisco.com/c/ja_jp/products/hyperconverged-infrastructure/index.html?dtid=pseggl000045&ccid=cc000562&oid=&KEYCODE=001484868&POSITION=SEM&COUNTRY_SITE=jp&CAMPAIGN=dc-11&CREATIVE=JP_SEM_DCB_DC-hyper-converged-100PSOV_EM_NB-HyperFlex-&REFERRING_SITE=Google&KEYWORD=%2Bhyperflex%20%2Bcisco&ds_rl=1260959&gclid=Cj0KCQjwv8nqBRDGARIsAHfR9wAcgURP4pbCUklLgK_uAW8rjW3HdIjypuiwDx25cCfutKVVg__H6P8aArznEALw_wcB)というCiscoのハイパーコンバージドインフラストラクチャに最適化されていること。
CNIプラグインが自前の[Contiv](https://contiv.io/)というやつで[ACIと連携する](https://contiv.io/documents/networking/aci_ug.html)し、HyperFlexのストレージドライバを積んでいてPodにマウントできる。

## Stackube
[Stackube](https://github.com/openstack/stackube)はOpenStackコミュニティによるもので、Kubernetesディストリビューションの章にいれたけど実際はKubernetesを組み込んだOpenStackディストリビューション。

OpenStackにおいてVMの作成・管理をするNovaがKubernetesに置き換わっていて、VMがPodに代わっている。
Podの永続化ボリュームであるPersistentVolumeがCinderに対応していて、Cinderが管理するボリュームをPodにマウントできる。
また、Neuron CNIプラグインが組み込まれていて、PodからNeuronのネットワークを使える。

2017年5月くらいにGitHubに公開されたけど、リリースが作られることなく3か月くらいで開発止まった。

## Konvoy
もともと[Mesos](http://mesos.apache.org/)ベースの[DC/OS](https://dcos.io/)を提供していたMesosphere社が、Mesos以外も頑張るという決意を込めて[社名をD2iQに変えた](https://d2iq.com/blog/mesosphere-is-now-d2iq)。

同時に発表したのが[Ksphere](https://d2iq.com/solutions/ksphere)というKubernetesソリューションサービスで、[Konvoy](https://d2iq.com/solutions/ksphere/konvoy)はその構成要素。

Konvoyは、[Calico](https://www.projectcalico.org/)によるネットワーク制御、[MetalLB](https://metallb.universe.tf/)によるロードバランシング、[Traefik](https://docs.traefik.io/)によるトラフィック制御、[Telegraf](https://github.com/influxdata/telegraf)とPrometeusとGrafanaによるモニタリング、Elasticスタックと[Fluent Bit](https://fluentbit.io/)によるログ管理、[Ansible](https://www.ansible.com/)と[Terraform](https://www.terraform.io/)によるオートメーション、[Velero](https://velero.io/)によるバックアップを詰め込んだ、エンタープライズ向けのKubernetesディストリビューション。

## MicroK8s
[MicroK8s](https://microk8s.io/)はCanonical社によるKubernetesディストリビューション。
snapパッケージとして配布されていて、Kubernetesに加えてcontainerdや[nvidia-container-runtime](https://nvidia.github.io/nvidia-container-runtime/)が同梱されているので、簡単にGPUが使えるKubernetesをインストールできる。

アドオンなどを扱えるmicrok8sコマンドが提供されていて、PrometheusとかGrafanaとかDockerレジストリとかIstioとかをシュっと有効化・無効化できる。

シングルノードクラスタのみサポートで、テスト・開発環境用途向け。

## Rancher
[Rancher](https://rancher.com/)はRancher社によるプロダクト。
v1系はKubernetes、Mesos、Docker Swarmに加えて自前のCattleと、様々なコンテナオーケストレーションツールを一元的に扱うためのツールで、インフラレイヤの抽象化も自前で実装していた模様。

v2になってKubernetes以外を切り捨て、インフラレイヤの制御もKubernetesに任せて、アーキテクチャを洗練させた。

v2はRancherサーバが主たるコンポーネントで、これがKubernetesクラスタを管理したりAPIやGUIを提供したりする。
[Rancher Kubernetes Engine (RKE)](https://rancher.com/docs/rke/latest/en/)というコンポーネントもあって、これを使うとプロダクションレディなKubernetesクラスタを簡単目にインストールできる。

Rancherサーバの管理対象のクラスタは、GCPやEKSなどのマネージドのものや、RKEで構築したものの他、既存の任意のKubernetesクラスタをインポートすることもできる。
Rancherの管理下に入れたクラスタは、RancherのGUIから[Helm](https://helm.sh/)のチャートをインストールしたり、etcdのバックアップ・リストアが出来たり、いい感じに運用できる。

KubernetesディストリビューションというよりかはKubernetesクラスタ管理ツールと言うべきかも。

## HPE Container Platform
[HPE Container Platform](https://www.hpe.com/us/en/solutions/container-platform.html)はHPE社によるKubernetesディストリビューション。
クラウドでもオンプレでも動き、HPEが以前から推進するハイブリッドクラウド戦略を支えるもの。

OSSのKubernetesに、簡単にセキュアで安定したマルチクラスタを構築して監視できるというのが売り。
HPEのストレージ、ネットワーク、サーバ、ネットワーク、HCI、エッジ機器なんかとがんがん連携していくものと思われる。

# Kubernetes亜種

Kubernetes自体に改造が入っていたり、Kubernetes(の一部)っぽく動くものたち。

## k3s
[k3s](https://k3s.io/)はRancher社が開発した組込み向け軽量Kubernetes。
ケースリーエスと読む。

Kubernetesと完全互換(を目指し)ながら、組込み向けの以下のような特徴がある。

* etcdの代わりにSQLiteを使える。
* Kubernetesの全コンポーネント、SQLite、containerd、Flannel、CoreDNSとさらにiptablesなどのライブラリを全部静的リンクして単一バイナリになってる。
    - このためメモリ使用量が少ない。
    - バイナリひとつ置いて実行するだけでKubernetesが動く。
* ARMをサポート。もちろんx64でも動く。

CIとかにも便利。

## Usernetes
[Usernetes](https://github.com/rootless-containers/usernetes)はroot権限無しで動くKubernetesとDockerとcontainerdとかを作っているプロジェクト。

k3sが使っている。

Dockerは19.03で[rootlessモードを搭載](https://qiita.com/inductor/items/75db0c1c0d49646dd68a)したし、その他のもrootlessで動かすためのパッチが[アップストリームに提示されている](https://github.com/rootless-containers/usernetes/issues/42)ので、その内それぞれの本家がrootlessで動けるようになって、Usernetesプロジェクトは役目を終えることになりそう。

## virtual-kubelet
[virtual-kubelet](https://github.com/virtual-kubelet/virtual-kubelet)はMicrosoftが中心になって開発しているkubeletの実装。

virtual-kubeletはエージェントとして働き、kube-apiserverからはkubeletに見えるけど、自身がPodを起動する代わりにどこかのAPIを呼んでPodの起動を委譲する。
virtual-kubeletを使うことで、普通のkubeletが動けるLinuxマシン以外の計算リソースもKubernetesのノードとして扱えるようになる。
例えば以下のようなのをノードにできる。

* AWS Fargate
* Azure Container Instances
* HashiCorp Nomad
* OpenStack Zun

## k3v
[k3v](https://github.com/ibuildthecloud/k3v)はRancherが開発中のKubernetesの仮想コントロールプレーン(controllerとapi-server)。

k3vはkubectlからは普通のKubernetesに見えるけど、k3vに対して作成されたPodやボリュームなどのリソースは、k3vが参照する実Kubernetesクラスタ上で構成される。

マルチテナンシーやKubernetesアプリケーションのパッケージングに使えるはずとのことだけど、まだほとんどドキュメントが無くてよくわからない…

まだ出たてでPoCレベルの品質。

# コンテナホストOS

コンテナをホストするためのOS。
いずれもコンテナを動かす以外の機能を削り、軽くてセキュアになっている。

## Container Linux (a.k.a. CoreOS)
[Container Linux](https://coreos.com/why/)はCoreOS社が開発しているOSで、昔はCoreOSという名前だった(はず)。
コンテナホストOSとして最も広く使われている。

Linuxカーネルにsystemd、dockerなど最低限のサービスを載せて、それ以外のサービスやアプリは全部コンテナとして動かすのが特徴。
OS部分のコンテナやdockerは自動アップデートされるので、たくさんマシンがあっても運用が楽。

OCIランタイムは[rkt](https://github.com/rkt/rkt)っぽい。

CoreOS社がRed Hatに買収された影響で消えゆく運命にある。

## Atomic Host
Red Hatが主導する[Project Atmic](https://www.projectatomic.io/)によるコンテナホストOSがAtomic Host。
Dockerでコンテナを動かせる他、Kubernetesもサポートされている。

OSS版としては[CentOS Atomic Host](https://wiki.centos.org/SpecialInterestGroup/Atomic/Download/)と[Fedora Atomic Host](https://dl.fedoraproject.org/pub/alt/atomic/stable/)があり、プロダクション向けには[RHEL Atomic Host](https://jp-redhat.com/migration/atomichost/index.html)がある。
それぞれ名前についているRHEL系OSがベースになっている。

Red HatがCoreOS社を買収してContainer Linuxを手に入れたため、Atomic Hostの開発は停止する方向になった。

## CoreOS (Red Hat製)
[CoreOS](https://getfedora.org/coreos/)は、CoreOS社を買収したRed Hatが自身のAtomic HostとCoreOS社のContainer Linuxを統合して後継にすべく開発しているコンテナホストOS。

Project Atmicと同様、Red Hat CoreOS、Fedora CoreOS、CentOS CoreOSというバリエーションが出てくるはずだけど、今のところFedora版しか見当たらないような…

## RancherOS
[RancherOS](https://rancher.com/rancher-os/)はRancher社によるコンテナホストOS。

Dockerを動かすことに特化していて、それ以外の機能は全てDockerコンテナとして動かす。
システムサービスもDocker Composeで動かす。
このDocker Compose上のシステムサービスのひとつとしてDockerがもうひとつ動き、そのDockerでユーザアプリケーションのコンテナは動くため、システムとの分離が強い。

## LinuxKit
[LinuxKit](https://github.com/linuxkit/linuxkit)はDocker社が主導して開発したもの。
コンテナホストOSそのものではなくて、コンテナホストOSを開発するためのツールキット。
もともとDocker社は、Docker for WindowsとかDocker for AWSとかプラットフォームごとのDocker for Xを開発してたけど、それをもっと効率よくやりたいという欲求からLinuxKitは生まれた。

LinuxKitによって作られたOSは、ベアメタル、AWSなどのクラウド、Hyper-Vなどのハイパバイザ上で動き、コンテナを動かすのに最低限の環境を提供する。
その上でinitプロセスとかcontainerdとかのサービスがコンテナで動き、それらがユーザアプリケーションのコンテナを管理するような感じ。
OS上に置くファイルはOS起動時に指定する形で、起動後はシステム全体がイミュータブルになる。

[Docker Desktop](https://www.docker.com/products/docker-desktop)とかで使われている。

## LCOW
LinuxKitで作られた、Windows上でLinuxコンテナを動かすためのOSが[LCOW](https://github.com/linuxkit/lcow)。
[Windows Containers](https://docs.microsoft.com/ja-jp/virtualization/windowscontainers/about/)のHyper-V分離モードで動かせる。

## Ubuntu Core (aka. Snappy Ubuntu Core)
[Ubuntu Core](https://ubuntu.com/core)はCanonical社によるUbuntuベースのミニマルOS。
Container Linuxよりもさらに小さいのが売りの一つ。

snapというパッケージシステムが大きな特徴の一つで、これによってアプリケーション毎の依存ライブラリを分離して管理できる。

Ubuntu Core自体はコンテナホスト向けというよりはIoT向けという感じだけど、軽量でセキュアなのでsnapでDockerやKubernetesを入れればコンテナホストOSとしていい感じになる。

## k3OS
[k3OS](https://k3os.io/)はRancher社が開発したKubernetes OS。

RancherOSと同様のアーキテクチャっぽくて、システムサービスを動かすのにDocker Composeの代わりにk3sを使うっぽい。
