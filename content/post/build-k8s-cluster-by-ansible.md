+++
categories = ["Programing"]
date = "2018-06-03T17:14:07+09:00"
draft = false
eyecatch = "kubernetes-ansible.png"
slug = "build-k8s-cluster-by-ansible"
tags = ["kubernetes", "docker", "ansible"]
title = "Kubernetes 1.10のクラスタを全手動で構築するのをAnsibleで全自動化した"
+++

「[Kubernetes 1.10をスクラッチから全手動で構築](https://www.kaitoy.xyz/2018/04/17/kubernetes110-from-scratch/)」、「[Kubernetes 1.10のクラスタにWeave Netをデプロイする](https://www.kaitoy.xyz/2018/05/04/kubernetes-with-weave-net/)」、「[Kubernetes 1.10のkubeletの起動オプションをKubelet ConfigファイルとPodSecurityPolicyで置き換える](https://www.kaitoy.xyz/2018/05/05/kubernetes-kubelet-config-and-pod-sec-policy/)」のまとめとして、Kubernetes 1.10のクラスタを構築するAnsible Playbookを書いた。

書いたものは[GitHub](https://github.com/kaitoy/ansible-k8s)に置いた。

{{< google-adsense >}}

## Ansibleとは

[Ansible](https://www.ansible.com/)は、Ansible社が開発したOSSのIT自動化ツール。
Ansible社は2015年10月にRedHatが買収したので、現在はRedHatが開発している。
似たようなツールに[Puppet](https://puppet.com/)や[Chef](https://www.chef.io/)があるが、最近はAnsibleが最も支持されている気がする。

構成管理ツールと紹介されることが多い気がするが、2014年末位からはIT自動化ツールを自称していて、構成管理は実現するユースケースの一つという位置づけになっているので、そろそろ認識を改めてあげたい。

ユースケースは以下のようなもの。

* [プロビジョニング](https://www.ansible.com/use-cases/provisioning) (ベアメタル、VM、クラウドインスタンス)
* [構成管理](https://www.ansible.com/use-cases/configuration-management)
* [アプリケーションデプロイメント](https://www.ansible.com/use-cases/application-deployment)
* [CI/CD](https://www.ansible.com/use-cases/continuous-delivery)
* [セキュリティ・コンプライアンス管理](https://www.ansible.com/use-cases/security-and-compliance)
* [オーケストレーション](https://www.ansible.com/use-cases/orchestration)

<br>

以下のような特徴を持つ。

* Python(とPowerShell)で作られてる。
    * 昔はPython 2じゃないと動かなかったけど、2.2から[Python 3でも動くようになった](https://docs.ansible.com/ansible/2.3/python_3_support.html)。
* YAMLで書いた定義(Playbook)に従って処理を実行する。
* シンプルで簡便であることを売りにしている。
    * 多数のモジュールがビルトインされていて、様々な操作を簡潔な定義で宣言的に実行できる。
* エージェントレスで、SSH(等)で対象のサーバにつないで処理を実行する。
* 処理を冪等にできるような仕組みが備わっていて、特にビルトインモジュールを活用すると簡単に冪等性を持たせられる。

<br>

Pythonで書かれているのでどこでも動くかと思いきや、[fcntl](https://docs.python.jp/3/library/fcntl.html)とか[grp](https://docs.python.jp/3/library/grp.html)やらUnix特有のモジュールを使っているため、WindowsのPythonでは動かない。

[MSYS2](http://kzlog.picoaccel.com/post-935/)とか[WSL](https://qiita.com/comefigo/items/f2b42c22e903f43e136e)では動く模様。
([Git Bash (MinGW)では動かない…](https://superuser.com/questions/1255634/install-ansible-in-windows-using-git-bash))

<br>

今回使ったのは最新版の2.5.3。

## Ansibleインストール

AnsibleはYUMとかpipとかでインストールできる。

今回はOracle Linux 7.4で動かすため、以下のようにインストールした。

1. YUMリポジトリ追加

    以下の内容を`/etc/yum.repos.d/`の適当な`.repo`ファイルに書く。

    ```txt
    [ansible]
    name=Ansible
    baseurl=http://releases.ansible.com/ansible/rpm/release/epel-7-x86_64/
    gpgcheck=0
    enabled=1
    ```

2. インストール

    ```sh
    # yum install -y ansible
    ```

## Playbookの書き方

Playbookの書き方は他にたくさん情報があるし、どうせすぐに陳腐化するのでここには書かない。

以下を参照して書いた。

* [公式のBest Practices](http://docs.ansible.com/ansible/latest/user_guide/playbooks_best_practices.html#how-to-differentiate-staging-vs-production)
* [公式マニュアルのモジュール編](http://docs.ansible.com/ansible/latest/modules/modules_by_category.html)
* [公式マニュアルの変数編](http://docs.ansible.com/ansible/latest/user_guide/playbooks_variables.html)
* [公式マニュアルのループ編](http://docs.ansible.com/ansible/latest/user_guide/playbooks_loops.html)
* [Jinja2のマニュアル](http://jinja.pocoo.org/docs/2.10/)
* [edXのAnsibleコーディング規約](https://openedx.atlassian.net/wiki/spaces/OpenOPS/pages/26837527/Ansible+Code+Conventions)

<br>

一つ他にあまりなかった情報を書く:

タスクをループするとき、`with_items`プロパティを書くのはもう古くて、バージョン2.5以降では`loop`プロパティを使う。

<br>

書いたPlaybookで構築できるのは以下のようなKubernetesクラスタ。

* Kubernetes: バージョン1.10.1
    * 単一ノード
    * 全コンポーネント(kubelet、kube-proxy、kube-apiserver、kube-controller-manager、kube-scheduler、etcd)をsystemdで起動 (i.e. 非コンテナ)
        * kubeletとkube-proxy以外は非rootユーザ
    * コンポーネント間通信とkubectlの通信をTLSで暗号化
    * コンポーネント間通信とkubectlの通信の認証は[x509クライアント証明書](https://kubernetes.io/docs/admin/authentication/#x509-client-certs)
    * TLS Bootstrapping
        * Bootstrap token使用
        * CSR自動承認
    * [Certificate Rotation](https://kubernetes.io/docs/tasks/tls/certificate-rotation/)有効
    * etcd 3.1.12
    * [Weave Net](https://www.weave.works/oss/net/) 2.3.0
    * [CoreDNS](https://github.com/coredns/coredns) 1.1.3
    * SERVICE_CLUSTER_IP_RANGE (Serviceに割り当てるIPの範囲) は10.0.0.0/16
    * CLUSTER_CIDR (Podに割り当てるIPの範囲) は10.32.0.0/16
    * [Proxyモード](https://kubernetes.io/docs/concepts/services-networking/service/#virtual-ips-and-service-proxies)はiptables。
    * PodSecurityPolicy有効。
    * [KubeletConfiguration](https://kubernetes.io/docs/tasks/administer-cluster/kubelet-config-file/ )、[KubeProxyConfiguration](https://github.com/kubernetes/kubernetes/blob/master/pkg/proxy/apis/kubeproxyconfig/v1alpha1/types.go)、[KubeSchedulerConfiguration](https://github.com/kubernetes/kubernetes/blob/master/pkg/apis/componentconfig/v1alpha1/types.go)を使用。
* 開発ツール付き
    * [kube-prompt](https://github.com/c-bata/kube-prompt)
    * [dry](https://github.com/moncho/dry)
    * etc.

Ansibleの変数をいじればある程度違う構成もできる。
複数ノードや、マスターコンポーネントの冗長化や、etcdが別サーバの構成もできそうな感じにはRoleを分けて書いたけど、試してはいない。
