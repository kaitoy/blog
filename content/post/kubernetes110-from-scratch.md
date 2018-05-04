+++
categories = ["Programing"]
date = "2018-04-17T00:31:48+09:00"
draft = false
eyecatch = "kubernetes.png"
slug = "kubernetes110-from-scratch"
tags = ["kubernetes", "docker"]
title = "Kubernetes 1.10をスクラッチから全手動で構築"

+++

Oracle Linux 7.4.0のVMでKubernetes1.10.0のクラスタをスクラッチから全手動で作った。
参考にしたのは主に以下。

* https://nixaid.com/deploying-kubernetes-cluster-from-scratch/
* https://kubernetes.io/docs/getting-started-guides/scratch/
* https://ulam.io/blog/kubernetes-scratch/
* https://docs.microsoft.com/en-us/virtualization/windowscontainers/kubernetes/creating-a-linux-master

{{< google-adsense >}}

## 構成

* マシン: Windows 10 Homeのラップトップの上のVMware PlayerのVM
    * CPU: 2コア
    * メモリ: 4GB
    * NIF: NATのを一つ
* OS: Oracle Linux 7.4.0
    * Minimalインストール
    * IPアドレス: 192.168.171.200、静的割り当て
    * ホスト名: k8s-master (hostsで解決)
* Docker: Oracle Container Runtime for Docker (docker-engine) 17.06.2
* Kubernetes: バージョン1.10.0
    * 単一ノード
    * 全コンポーネント(kubelet、kube-proxy、kube-apiserver、kube-controller-manager、kube-scheduler、etcd)をsystemdで起動 (i.e. 非コンテナ)
    * コンポーネント間通信とkubectlの通信をTLSで暗号化
    * コンポーネント間通信とkubectlの通信の認証は[x509クライアント証明書](https://kubernetes.io/docs/admin/authentication/#x509-client-certs)
    * TLS BootstrappingにはBootstrap token使用。
    * [Certificate Rotation](https://kubernetes.io/docs/tasks/tls/certificate-rotation/)有効
    * etcd 3.1.12
    * [flannel](https://github.com/coreos/flannel) 0.10.0
    * [CoreDNS](https://github.com/coredns/coredns) 1.1.1
    * SERVICE_CLUSTER_IP_RANGE (Serviceに割り当てるIPの範囲) は10.0.0.0/16
        * kube-apiserverのIPはこの範囲の最初のIP(i.e. 10.0.0.1)になる。
        * ホストネットワークや、CLUSTER_CIDRと範囲が被らないようにする必要がある。
    * CLUSTER_CIDR (Podに割り当てるIPの範囲) は10.244.0.0/16
        * flannelの要件に合わせている。
        * ホストネットワークや、SERVICE_CLUSTER_IP_RANGEと範囲が被らないようにする必要がある。

<br>

kubeletの動作条件にあるので、swapをoffにする。
Oracle Linuxにログインして、`/etc/fstab`のswapの行を削除して、以下のコマンドを実行。

```sh
# swapoff -a
```

<br>

SELinuxはちゃんと設定すればKubernetes動かせるはずだけど、面倒なのでとりあえず無効にする。

`/etc/selinux/config`を編集して、`SELINUX`を`permissive`にして、以下のコマンドを実行。

```sh
# setenforce 0
```

<br>

ファイアウォールもちゃんと設定すればいいんだけど面倒なのでとりあえず無効にする。

```sh
# systemctl stop firewalld
# systemctl disable firewalld
```

<br>

これで準備完了。

## クラスタ構築手順

おおむね、k8sコンポーネント間の通信の暗号化に使う鍵と証明書の生成、各コンポーネント用kubeconfigの生成、etcdのデプロイ、k8sコンポーネントのデプロイ、fannelデプロイ、CoreDNSデプロイ、という流れ。
ついでに最後に[Weave Scope](https://github.com/weaveworks/scope)をデプロイしてみる。

1. Bridge netfilterとIP forwardingを設定

    まず、Bridge netfilterモジュールをロードする。

    ```sh
    # modprobe br_netfilter
    # cat > /etc/sysconfig/modules/br_netfilter.modules << EOF
    #!/bin/sh
    /sbin/modprobe br_netfilter > /dev/null 2>&1
    EOF
    # chmod 755 /etc/sysconfig/modules/br_netfilter.modules
    ```

    Bridge netfilterとIP forwardingを有効化する。

    ```sh
    # cat > /etc/sysctl.d/kubernetes.conf << EOF
    net.bridge.bridge-nf-call-iptables = 1
    net.bridge.bridge-nf-call-ip6tables = 1
    net.ipv4.ip_forward = 1
    EOF
    # sysctl -p /etc/sysctl.d/kubernetes.conf
    ```

    <br>

    設定確認。

    ```sh
    # lsmod |grep br_netfilter
    # sysctl -a | grep -E "net.bridge.bridge-nf-call-|net.ipv4.ip_forward"
    ```

2. x509証明書生成

    1. opensslの設定作成

        ```sh
        # mkdir -p /etc/kubernetes/pki
        # cd /etc/kubernetes/pki
        # K8S_SERVICE_IP=10.0.0.1
        # MASTER_IP=192.168.171.200
        # cat > openssl.cnf << EOF
        [ req ]
        distinguished_name = req_distinguished_name
        [req_distinguished_name]
        [ v3_ca ]
        basicConstraints = critical, CA:TRUE
        keyUsage = critical, digitalSignature, keyEncipherment, keyCertSign
        [ v3_req_server ]
        basicConstraints = CA:FALSE
        keyUsage = critical, digitalSignature, keyEncipherment
        extendedKeyUsage = serverAuth
        [ v3_req_client ]
        basicConstraints = CA:FALSE
        keyUsage = critical, digitalSignature, keyEncipherment
        extendedKeyUsage = clientAuth
        [ v3_req_apiserver ]
        basicConstraints = CA:FALSE
        keyUsage = critical, digitalSignature, keyEncipherment
        extendedKeyUsage = serverAuth
        subjectAltName = @alt_names_cluster
        [ v3_req_etcd ]
        basicConstraints = CA:FALSE
        keyUsage = critical, digitalSignature, keyEncipherment
        extendedKeyUsage = serverAuth, clientAuth
        subjectAltName = @alt_names_etcd
        [ alt_names_cluster ]
        DNS.1 = kubernetes
        DNS.2 = kubernetes.default
        DNS.3 = kubernetes.default.svc
        DNS.4 = kubernetes.default.svc.cluster.local
        DNS.5 = k8s-controller
        IP.1 = ${MASTER_IP}
        IP.2 = ${K8S_SERVICE_IP}
        [ alt_names_etcd ]
        DNS.1 = k8s-controller
        IP.1 = ${MASTER_IP}
        EOF
        ```

    2. Kubernetes CA証明書生成

        以降で生成する証明書に署名するための証明書。

        ```sh
        # cd /etc/kubernetes/pki
        # CA_DAYS=5475
        # openssl ecparam -name secp521r1 -genkey -noout -out ca.key
        # chmod 0600 ca.key
        # openssl req -x509 -new -sha256 -nodes -key ca.key -days $CA_DAYS -out ca.crt -subj "/CN=kubernetes-ca"  -extensions v3_ca -config ./openssl.cnf
        ```

    3. kube-apiserver証明書生成

        kube-apiserverのサーバ証明書。

        ```sh
        # cd /etc/kubernetes/pki
        # APISERVER_DAYS=5475
        # openssl ecparam -name secp521r1 -genkey -noout -out kube-apiserver.key
        # chmod 0600 kube-apiserver.key
        # openssl req -new -sha256 -key kube-apiserver.key -subj "/CN=kube-apiserver" | openssl x509 -req -sha256 -CA ca.crt -CAkey ca.key -CAcreateserial -out kube-apiserver.crt -days $APISERVER_DAYS -extensions v3_req_apiserver -extfile ./openssl.cnf
        ```

    4. kube-apiserver-kubelet証明書生成

        kube-apiserverがkubeletのAPIにアクセスするときのクライアント証明書。

        ```sh
        # cd /etc/kubernetes/pki
        # APISERVER_KUBELET_CLIENT_DAYS=5475
        # openssl ecparam -name secp521r1 -genkey -noout -out apiserver-kubelet-client.key
        # chmod 0600 apiserver-kubelet-client.key
        # openssl req -new -key apiserver-kubelet-client.key -subj "/CN=kube-apiserver-kubelet-client/O=system:masters" | openssl x509 -req -sha256 -CA ca.crt -CAkey ca.key -CAcreateserial -out apiserver-kubelet-client.crt -days $APISERVER_KUBELET_CLIENT_DAYS -extensions v3_req_client -extfile ./openssl.cnf
        ```

    5. adminクライアント証明書生成

        kubectlがkube-apiserverのAPIにアクセスするときのクライアント証明書。

        ```sh
        # cd /etc/kubernetes/pki
        # ADMIN_DAYS=5475
        # openssl ecparam -name secp521r1 -genkey -noout -out admin.key
        # chmod 0600 admin.key
        # openssl req -new -key admin.key -subj "/CN=kubernetes-admin/O=system:masters" | openssl x509 -req -sha256 -CA ca.crt -CAkey ca.key -CAcreateserial -out admin.crt -days $ADMIN_DAYS -extensions v3_req_client -extfile ./openssl.cnf
        ```

    6. Service Accountキーとkube-controller-managerのクライアント証明書生成

        Service Accountトークンにkube-controller-managerが署名するときに使うキーを生成する。
        そのキーを使ってkube-controller-managerのクライアント証明書も生成する。

        kube-apiserverがトークンの署名を確認するとき(?)に使う公開鍵も生成する。

        ```sh
        # cd /etc/kubernetes/pki
        # CONTROLLER_MANAGER_DAYS=5475
        # openssl ecparam -name secp521r1 -genkey -noout -out sa.key
        # openssl ec -in sa.key -outform PEM -pubout -out sa.pub
        # chmod 0600 sa.key
        # openssl req -new -sha256 -key sa.key -subj "/CN=system:kube-controller-manager" | openssl x509 -req -sha256 -CA ca.crt -CAkey ca.key -CAcreateserial -out sa.crt -days $CONTROLLER_MANAGER_DAYS -extensions v3_req_client -extfile ./openssl.cnf
        ```

    7. kube-schedulerクライアント証明書生成


        kube-schedulerがkube-apiserverにリクエストするときに使うクライアント証明書。
        多分。

        ```sh
        # cd /etc/kubernetes/pki
        # SCHEDULER_DAYS=5475
        # openssl ecparam -name secp521r1 -genkey -noout -out kube-scheduler.key
        # chmod 0600 kube-scheduler.key
        # openssl req -new -sha256 -key kube-scheduler.key -subj "/CN=system:kube-scheduler" | openssl x509 -req -sha256 -CA ca.crt -CAkey ca.key -CAcreateserial -out kube-scheduler.crt -days $SCHEDULER_DAYS -extensions v3_req_client -extfile ./openssl.cnf
        ```

    8. front proxy CA証明書生成

        front proxyのクライアント証明書に署名するのにつかう証明書。
        front proxyってなんだ?
        多分、kube-apiserverの前にいて、クラスタの外からの通信を受けるやつ([apiserver proxy](https://kubernetes.io/docs/concepts/cluster-administration/proxies/))か。

        ```sh
        # cd /etc/kubernetes/pki
        # FRONT_PROXY_CA_DAYS=5475
        # openssl ecparam -name secp521r1 -genkey -noout -out front-proxy-ca.key
        # chmod 0600 front-proxy-ca.key
        # openssl req -x509 -new -sha256 -nodes -key front-proxy-ca.key -days $FRONT_PROXY_CA_DAYS -out front-proxy-ca.crt -subj "/CN=front-proxy-ca" -extensions v3_ca -config ./openssl.cnf
        ```

    9. front proxyクライアント証明書

        クラスタの外からくるHTTPリクエストの、`--requestheader-username-headers`で指定されたヘッダに書いてあるユーザ名を認証するときに見るクライアント証明書。
        kubectlの証明書(adminクライアント証明書)とは違うんだろうか。

        ```sh
        # cd /etc/kubernetes/pki
        # FRONT_PROXY_CLIENT_DAYS=5475
        # openssl ecparam -name secp521r1 -genkey -noout -out front-proxy-client.key
        # chmod 0600 front-proxy-client.key
        # openssl req -new -sha256 -key front-proxy-client.key -subj "/CN=front-proxy-client" | openssl x509 -req -sha256 -CA front-proxy-ca.crt -CAkey front-proxy-ca.key -CAcreateserial -out front-proxy-client.crt -days $FRONT_PROXY_CLIENT_DAYS -extensions v3_req_client -extfile ./openssl.cnf
        ```

    10. etcd CA証明書

        以降で生成するetcdの証明書に署名するための証明書。

        ```sh
        # cd /etc/kubernetes/pki
        # ETCD_CA_DAYS=5475
        # openssl ecparam -name secp521r1 -genkey -noout -out etcd-ca.key
        # chmod 0600 etcd-ca.key
        # openssl req -x509 -new -sha256 -nodes -key etcd-ca.key -days $ETCD_CA_DAYS -out etcd-ca.crt -subj "/CN=etcd-ca" -extensions v3_ca -config ./openssl.cnf
        ```

    11. etcd証明書

        etcdサーバのサーバ証明書。
        多分。

        ```sh
        # cd /etc/kubernetes/pki
        # ETCD_DAYS=5475
        # openssl ecparam -name secp521r1 -genkey -noout -out etcd.key
        # chmod 0600 etcd.key
        # openssl req -new -sha256 -key etcd.key -subj "/CN=etcd" | openssl x509 -req -sha256 -CA etcd-ca.crt -CAkey etcd-ca.key -CAcreateserial -out etcd.crt -days $ETCD_DAYS -extensions v3_req_etcd -extfile ./openssl.cnf
        ```

    12. etcd peer証明書

        etcdサーバが冗長構成のとき、サーバ間の通信の暗号化に使う証明書。
        マスタが一つなら要らない?

        ```sh
        # cd /etc/kubernetes/pki
        # ETCD_PEER_DAYS=5475
        # openssl ecparam -name secp521r1 -genkey -noout -out etcd-peer.key
        # chmod 0600 etcd-peer.key
        # openssl req -new -sha256 -key etcd-peer.key -subj "/CN=etcd-peer" | openssl x509 -req -sha256 -CA etcd-ca.crt -CAkey etcd-ca.key -CAcreateserial -out etcd-peer.crt -days $ETCD_PEER_DAYS -extensions v3_req_etcd -extfile ./openssl.cnf
        ```

    13. 確認

        以上で生成した証明書の内容を確認する。

        ```sh
        # cd /etc/kubernetes/pki
        # for i in *crt; do
          echo $i:;
          openssl x509 -subject -issuer -noout -in $i;
          echo;
        done
        ```

3. Kubernetesバイナリインストール

    [公式ドキュメント](https://kubernetes.io/docs/getting-started-guides/scratch/#selecting-images)によると、Docker、kubelet、kube-proxyはコンテナ外で動かして、etcd、kube-apiserver、kube-controller-manager、kube-schedulerはコンテナで動かすのが推奨されている。
    けど、とりあえずは簡単に全部コンテナ外でやる。

    (Oracle Linux用には、各コンポのコンテナイメージ詰め合わせがOracle Container Services for use with Kubernetesという名前で配布されているけど、現時点で1.9までしかないので使わない。)

    バイナリは以下URLからダウンロードできる。

    * 全部入り: https://storage.googleapis.com/kubernetes-release/release/v1.10.0/kubernetes-server-linux-amd64.tar.gz
    * kube-apiserver
        * バイナリ: https://storage.googleapis.com/kubernetes-release/release/v1.10.0/bin/linux/amd64/kube-apiserver
        * コンテナ: https://storage.googleapis.com/kubernetes-release/release/v1.10.0/bin/linux/amd64/kube-apiserver.tar
    * kube-controller-manager
        * バイナリ: https://storage.googleapis.com/kubernetes-release/release/v1.10.0/bin/linux/amd64/kube-controller-manager
        * コンテナ: https://storage.googleapis.com/kubernetes-release/release/v1.10.0/bin/linux/amd64/kube-controller-manager.tar
    * kube-scheduler
        * バイナリ: https://storage.googleapis.com/kubernetes-release/release/v1.10.0/bin/linux/amd64/kube-scheduler
        * コンテナ: https://storage.googleapis.com/kubernetes-release/release/v1.10.0/bin/linux/amd64/kube-scheduler.tar
    * kube-proxy
        * バイナリ: https://storage.googleapis.com/kubernetes-release/release/v1.10.0/bin/linux/amd64/kube-proxy
        * コンテナ: https://storage.googleapis.com/kubernetes-release/release/v1.10.0/bin/linux/amd64/kube-proxy.tar
    * kubelet: https://storage.googleapis.com/kubernetes-release/release/v1.10.0/bin/linux/amd64/kubelet
    * kubectl: https://storage.googleapis.com/kubernetes-release/release/v1.10.0/bin/linux/amd64/kubectl
    * kubeadm: https://storage.googleapis.com/kubernetes-release/release/v1.10.0/bin/linux/amd64/kubeadm
    * hyperkube: https://storage.googleapis.com/kubernetes-release/release/v1.10.0/bin/linux/amd64/hyperkube

    最後のhyperkubeは、各種Kubernetesバイナリのごった煮。
    ファイル名によって動作が変わる。
    簡単のためこれを使うけど、個別のバイナリ使ったほうがメモリ使用量などで有利そう。

    hyperkubeとkubeadmのバイナリを`/usr/bin/`において、以下のコマンドを実行。

    ```sh
    # ln -s /usr/bin/hyperkube /usr/bin/kube-apiserver
    # ln -s /usr/bin/hyperkube /usr/bin/kube-controller-manager
    # ln -s /usr/bin/hyperkube /usr/bin/kube-scheduler
    # ln -s /usr/bin/hyperkube /usr/bin/kube-proxy
    # ln -s /usr/bin/hyperkube /usr/bin/kubelet
    # ln -s /usr/bin/hyperkube /usr/bin/kubectl
    # chmod +x /usr/bin/kube*
    # mkdir -p /var/lib/{kubelet,kube-proxy}
    ```

4. kubeconfigファイル生成

    kubectlとマスタコンポーネントがkube-apiserverと話すときに使うkubeconfigファイルを生成する。

    1. kube-controller-managerのkubeconfig

        ```sh
        # MASTER_IP=192.168.171.200
        # KUBERNETES_PUBLIC_ADDRESS=$MASTER_IP
        # CLUSTER_NAME="default"
        # KCONFIG=controller-manager.kubeconfig
        # KUSER="system:kube-controller-manager"
        # cd /etc/kubernetes/
        # kubectl config set-cluster ${CLUSTER_NAME} --certificate-authority=pki/ca.crt --embed-certs=true --server=https://${KUBERNETES_PUBLIC_ADDRESS}:6443 --kubeconfig=${KCONFIG}
        # kubectl config set-credentials ${KUSER} --client-certificate=pki/sa.crt --client-key=pki/sa.key --embed-certs=true --kubeconfig=${KCONFIG}
        # kubectl config set-context ${KUSER}@${CLUSTER_NAME} --cluster=${CLUSTER_NAME} --user=${KUSER} --kubeconfig=${KCONFIG}
        # kubectl config use-context ${KUSER}@${CLUSTER_NAME} --kubeconfig=${KCONFIG}
        ```

        設定確認。

        ```sh
        # kubectl config view --kubeconfig=${KCONFIG}
        ```

    2. kube-schedulerのkubeconfig

        ```sh
        # MASTER_IP=192.168.171.200
        # KUBERNETES_PUBLIC_ADDRESS=$MASTER_IP
        # CLUSTER_NAME="default"
        # KCONFIG=scheduler.kubeconfig
        # KUSER="system:kube-scheduler"
        # cd /etc/kubernetes/
        # kubectl config set-cluster ${CLUSTER_NAME} --certificate-authority=pki/ca.crt --embed-certs=true --server=https://${KUBERNETES_PUBLIC_ADDRESS}:6443 --kubeconfig=${KCONFIG}
        # kubectl config set-credentials ${KUSER} --client-certificate=pki/kube-scheduler.crt --client-key=pki/kube-scheduler.key --embed-certs=true --kubeconfig=${KCONFIG}
        # kubectl config set-context ${KUSER}@${CLUSTER_NAME} --cluster=${CLUSTER_NAME} --user=${KUSER} --kubeconfig=${KCONFIG}
        # kubectl config use-context ${KUSER}@${CLUSTER_NAME} --kubeconfig=${KCONFIG}
        ```

        設定確認。

        ```sh
        # kubectl config view --kubeconfig=${KCONFIG}
        ```

    3. adminのkubeconfig

        kubectl用。

        ```sh
        # MASTER_IP=192.168.171.200
        # KUBERNETES_PUBLIC_ADDRESS=$MASTER_IP
        # CLUSTER_NAME="default"
        # KCONFIG=admin.kubeconfig
        # KUSER="kubernetes-admin"
        # cd /etc/kubernetes/
        # kubectl config set-cluster ${CLUSTER_NAME} --certificate-authority=pki/ca.crt --embed-certs=true --server=https://${KUBERNETES_PUBLIC_ADDRESS}:6443 --kubeconfig=${KCONFIG}
        # kubectl config set-credentials ${KUSER} --client-certificate=pki/admin.crt --client-key=pki/admin.key --embed-certs=true --kubeconfig=${KCONFIG}
        # kubectl config set-context ${KUSER}@${CLUSTER_NAME} --cluster=${CLUSTER_NAME} --user=${KUSER} --kubeconfig=${KCONFIG}
        # kubectl config use-context ${KUSER}@${CLUSTER_NAME} --kubeconfig=${KCONFIG}
        ```

        設定確認。

        ```sh
        # kubectl config view --kubeconfig=${KCONFIG}
        ```

5. etcdデプロイ

    https://github.com/coreos/etcd/releases/download/v3.1.12/etcd-v3.1.12-linux-amd64.tar.gz
    からアーカイブをダウンロードして、中のetcdとetcdctlを`/usr/bin/`にいれて、以下のコマンドを実行。

    ```sh
    # chown root:root /usr/bin/etcd*
    # chmod 0755 /usr/bin/etcd*
    # mkdir -p /var/lib/etcd
    ```

    で、systemdのユニットファイルを書いてサービス化。

    ```sh
    # MASTER_IP=192.168.171.200
    # CLUSTER_NAME="default"
    # ETCD_TOKEN=$(openssl rand -hex 5)
    # ETCD_CLUSTER_TOKEN=$CLUSTER_NAME-$ETCD_TOKEN
    # cat > /etc/systemd/system/etcd.service << EOF
    [Unit]
    Description=etcd
    Documentation=https://coreos.com/etcd/docs/latest/
    After=network.target

    [Service]
    ExecStart=/usr/bin/etcd \\
      --name default \\
      --listen-client-urls https://${MASTER_IP}:2379,http://127.0.0.1:2379 \\
      --advertise-client-urls https://${MASTER_IP}:2379 \\
      --data-dir=/var/lib/etcd \\
      --cert-file=/etc/kubernetes/pki/etcd.crt \\
      --key-file=/etc/kubernetes/pki/etcd.key \\
      --peer-cert-file=/etc/kubernetes/pki/etcd-peer.crt \\
      --peer-key-file=/etc/kubernetes/pki/etcd-peer.key \\
      --trusted-ca-file=/etc/kubernetes/pki/etcd-ca.crt \\
      --peer-trusted-ca-file=/etc/kubernetes/pki/etcd-ca.crt \\
      --peer-client-cert-auth \\
      --client-cert-auth \\
      --initial-advertise-peer-urls https://${MASTER_IP}:2380 \\
      --listen-peer-urls https://${MASTER_IP}:2380 \\
      --initial-cluster-token ${ETCD_CLUSTER_TOKEN} \\
      --initial-cluster default=https://${MASTER_IP}:2380 \\
      --initial-cluster-state new
    Restart=always
    RestartSec=10s

    [Install]
    WantedBy=multi-user.target
    EOF
    # systemctl daemon-reload
    # systemctl enable etcd
    # systemctl start etcd
    ```

    確認。

    ```sh
    # systemctl status etcd -l
    # etcdctl --ca-file=/etc/kubernetes/pki/etcd-ca.crt --cert-file=/etc/kubernetes/pki/etcd.crt --key-file=/etc/kubernetes/pki/etcd.key cluster-health
    # etcdctl --ca-file=/etc/kubernetes/pki/etcd-ca.crt --cert-file=/etc/kubernetes/pki/etcd.crt --key-file=/etc/kubernetes/pki/etcd.key member list
    ```

6. マスタコンポーネントデプロイ。

    1. kube-apiserver

        systemdのユニットファイルを書いてサービス化。

        ```sh
        # MASTER_IP=192.168.171.200
        # SERVICE_CLUSTER_IP_RANGE="10.0.0.0/16"
        # cat > /etc/systemd/system/kube-apiserver.service << EOF
        [Unit]
        Description=Kubernetes API Server
        Documentation=https://github.com/kubernetes/kubernetes
        After=network.target

        [Service]
        ExecStart=/usr/bin/kube-apiserver \\
          --feature-gates=RotateKubeletServerCertificate=true \\
          --apiserver-count=1 \\
          --allow-privileged=true \\
          --admission-control=NamespaceLifecycle,LimitRanger,ServiceAccount,DefaultStorageClass,DefaultTolerationSeconds,MutatingAdmissionWebhook,ValidatingAdmissionWebhook,ResourceQuota,NodeRestriction,DenyEscalatingExec \\
          --authorization-mode=Node,RBAC \\
          --secure-port=6443 \\
          --bind-address=0.0.0.0 \\
          --advertise-address=${MASTER_IP} \\
          --audit-log-maxage=30 \\
          --audit-log-maxbackup=3 \\
          --audit-log-maxsize=100 \\
          --audit-log-path=/var/log/kube-audit.log \\
          --client-ca-file=/etc/kubernetes/pki/ca.crt \\
          --etcd-cafile=/etc/kubernetes/pki/etcd-ca.crt \\
          --etcd-certfile=/etc/kubernetes/pki/etcd.crt \\
          --etcd-keyfile=/etc/kubernetes/pki/etcd.key \\
          --etcd-servers=https://${MASTER_IP}:2379 \\
          --service-account-key-file=/etc/kubernetes/pki/sa.pub \\
          --service-cluster-ip-range=${SERVICE_CLUSTER_IP_RANGE} \\
          --service-node-port-range=30000-32767 \\
          --tls-cert-file=/etc/kubernetes/pki/kube-apiserver.crt \\
          --tls-private-key-file=/etc/kubernetes/pki/kube-apiserver.key \\
          --enable-bootstrap-token-auth=true \\
          --kubelet-client-certificate=/etc/kubernetes/pki/apiserver-kubelet-client.crt \\
          --kubelet-client-key=/etc/kubernetes/pki/apiserver-kubelet-client.key \\
          --kubelet-preferred-address-types=InternalIP,ExternalIP,Hostname \\
          --requestheader-client-ca-file=/etc/kubernetes/pki/front-proxy-ca.crt \\
          --requestheader-username-headers=X-Remote-User \\
          --requestheader-group-headers=X-Remote-Group \\
          --requestheader-allowed-names=front-proxy-client \\
          --requestheader-extra-headers-prefix=X-Remote-Extra- \\
          --v=2 \\
          --tls-min-version=VersionTLS12
        Restart=always
        RestartSec=10s

        [Install]
        WantedBy=multi-user.target
        EOF
        # systemctl daemon-reload
        # systemctl enable kube-apiserver
        # systemctl start kube-apiserver
        ```

        `--allow-privileged`はflannelなどに必要。

        `--admission-control`には[公式推奨のプラグイン](https://kubernetes.io/docs/admin/admission-controllers/#is-there-a-recommended-set-of-admission-controllers-to-use)に加えて、後述のTLS BootstrappingのためのNodeRestrictionを指定。
        また、`--allow-privileged`の効果を軽減するため、DenyEscalatingExecも追加で指定。
        因みに、プラグインを指定する順番はKubernetes 1.10からは気にしなくてよくなった。

        `--authorization-mode`にはRBACを指定するのが標準。
        後述のTLS Bootstrappingをするなら、Nodeも要る。

        `--feature-gates`でRotateKubeletServerCertificateを有効にして、kubeletのサーバ証明書を自動更新するようにしている。
        因みに、クライアント証明書を自動更新するRotateKubeletClientCertificateはデフォルトで有効。
        これらがCertificate Rotationと呼ばれる機能。

        `--feature-gates`は全Kubernetesコンポーネントで同じ値を指定するのがよさそう。

        確認。

        ```sh
        # systemctl status kube-apiserver -l
        # journalctl -u kube-apiserver
        ```

    2. kube-controller-manager

        systemdのユニットファイルを書いてサービス化。

        ```sh
        # CLUSTER_CIDR="10.244.0.0/16"
        # SERVICE_CLUSTER_IP_RANGE="10.0.0.0/16"
        # CLUSTER_NAME="default"
        # cat > /etc/systemd/system/kube-controller-manager.service << EOF
        [Unit]
        Description=Kubernetes Controller Manager
        Documentation=https://github.com/kubernetes/kubernetes
        After=network.target

        [Service]
        ExecStart=/usr/bin/kube-controller-manager \\
          --feature-gates=RotateKubeletServerCertificate=true \\
          --kubeconfig=/etc/kubernetes/controller-manager.kubeconfig \\
          --bind-address=0.0.0.0 \\
          --controllers=*,bootstrapsigner,tokencleaner \\
          --service-account-private-key-file=/etc/kubernetes/pki/sa.key \\
          --allocate-node-cidrs=true \\
          --cluster-cidr=${CLUSTER_CIDR} \\
          --cluster-name=${CLUSTER_NAME} \\
          --service-cluster-ip-range=${SERVICE_CLUSTER_IP_RANGE} \\
          --cluster-signing-cert-file=/etc/kubernetes/pki/ca.crt \\
          --cluster-signing-key-file=/etc/kubernetes/pki/ca.key \\
          --root-ca-file=/etc/kubernetes/pki/ca.crt \\
          --use-service-account-credentials=true \\
          --v=2 \\
          --experimental-cluster-signing-duration=8760h0m0s
        Restart=always
        RestartSec=10s

        [Install]
        WantedBy=multi-user.target
        EOF
        # systemctl daemon-reload
        # systemctl enable kube-controller-manager
        # systemctl start kube-controller-manager
        ```

        期限の切れたBootstrap token(後述)を消すためにtokencleanerを有効にしている。

        bootstrapsignerは後述のcluster-infoにBootstrap tokenで署名するためのコントローラ。

        [csrapproving](https://kubernetes.io/docs/admin/kubelet-tls-bootstrapping/#approval-controller)というコントローラがデフォルトで有効になっていて、後述のTLS BootstrapppingやCertificate Rotationの時に作られるCSRを自動で承認する。

        `--experimental-cluster-signing-duration`は、Certificate Rotationのための設定で、自動発行する証明書の期限を1年に指定している。

        確認。

        ```sh
        # systemctl status kube-controller-manager -l
        ```

    3. kube-scheduler

        systemdのユニットファイルを書いてサービス化。

        ```sh
        # cat > /etc/systemd/system/kube-scheduler.service << EOF
        [Unit]
        Description=Kubernetes Scheduler
        Documentation=https://github.com/kubernetes/kubernetes
        After=network.target

        [Service]
        ExecStart=/usr/bin/kube-scheduler \\
          --feature-gates=RotateKubeletServerCertificate=true \\
          --kubeconfig=/etc/kubernetes/scheduler.kubeconfig \\
          --address=0.0.0.0 \\
          --v=2
        Restart=always
        RestartSec=10s

        [Install]
        WantedBy=multi-user.target
        EOF
        # systemctl daemon-reload
        # systemctl enable kube-scheduler
        # systemctl start kube-scheduler
        ```

        確認。

        ```sh
        # systemctl status kube-scheduler -l
        ```

    4. マスタコンポーネント状態確認

        ```sh
        # export KUBECONFIG=/etc/kubernetes/admin.kubeconfig
        # kubectl config use-context kubernetes-admin@default
        # kubectl version
        # kubectl get componentstatuses
        ```

7. [TLS Bootstrapping](https://kubernetes.io/docs/admin/kubelet-tls-bootstrapping/)の設定

    TLS Bootstrappingは、Kubernetesクラスタのコンポーネント間の通信がTLSで暗号化されている環境で、ノードが新たにクラスタに参加するとき、自動的にセキュアに[CSR](https://ja.wikipedia.org/wiki/%E8%A8%BC%E6%98%8E%E6%9B%B8%E7%BD%B2%E5%90%8D%E8%A6%81%E6%B1%82)を処理する仕組み。

    TLS Bootstrappingでは、kubeletは起動時にBootstrap kubeconfigを読んで、kubeletとノード用のCSRを生成し、それらがkube-controller-managerに承認されると、kubelet用のクライアント証明書と秘密鍵を生成する。
    その証明書と鍵を使ってkubeconfigを生成し、以降のクラスタへの接続に使う。

    Bootstrap時の認証には[Bootstrap Tokens](https://kubernetes.io/docs/admin/bootstrap-tokens/)か[Token authentication file](https://kubernetes.io/docs/admin/kubelet-tls-bootstrapping/#token-authentication-file)を使うことが推奨されていて、今回は前者を使う。

    (後者については[この記事](https://medium.com/@toddrosner/kubernetes-tls-bootstrapping-cf203776abc7)に詳しい。)

    1. Bootstrap TokenのSecret生成

        以下のように生成できる。

        ```sh
        # TOKEN_PUB=$(openssl rand -hex 3)
        # TOKEN_SECRET=$(openssl rand -hex 8)
        # BOOTSTRAP_TOKEN="${TOKEN_PUB}.${TOKEN_SECRET}"
        # kubectl -n kube-system create secret generic bootstrap-token-${TOKEN_PUB} --type 'bootstrap.kubernetes.io/token' --from-literal description="cluster bootstrap token" --from-literal token-id=${TOKEN_PUB} --from-literal token-secret=${TOKEN_SECRET} --from-literal usage-bootstrap-authentication=true --from-literal usage-bootstrap-signing=true --from-literal auth-extra-groups=system:bootstrappers:worker,system:bootstrappers:ingress
        ```

        けど、[kubeadm](https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-token/#cmd-token-generate)でも生成出来てこっちのほうが楽なので、それで。

        ```sh
        # BOOTSTRAP_TOKEN=$(kubeadm token create --kubeconfig /etc/kubernetes/admin.kubeconfig)
        ```

        BOOTSTRAP_TOKENの値はあとで使う。

        expirationは指定できなくて、1日で期限切れになっちゃうけど、クラスタにノードを追加するときに有効であればいいのでまあいい。

        確認。

        ```sh
        # TOKEN_PUB=$(echo $BOOTSTRAP_TOKEN | sed -e s/\\..*//)
        # kubectl -n kube-system get secret/bootstrap-token-${TOKEN_PUB} -o yaml
        ```

    2. Bootstrap kubeconfig作成

        Bootstrap時は`kubelet-bootstrap`というユーザでkube-apiserverに接続する。
        `kubelet-bootstrap`は`system:node-bootstrapper`ロールを持って`system:bootstrappers`に属しているユーザとして認証される必要がある。

        ```sh
        # MASTER_IP=192.168.171.200
        # KUBERNETES_PUBLIC_ADDRESS=$MASTER_IP
        # CLUSTER_NAME="default"
        # KCONFIG="bootstrap.kubeconfig"
        # KUSER="kubelet-bootstrap"
        # cd /etc/kubernetes
        # kubectl config set-cluster ${CLUSTER_NAME} --certificate-authority=pki/ca.crt --embed-certs=true --server=https://${KUBERNETES_PUBLIC_ADDRESS}:6443 --kubeconfig=${KCONFIG}
        # kubectl config set-context ${KUSER}@${CLUSTER_NAME} --cluster=${CLUSTER_NAME} --user=${KUSER} --kubeconfig=${KCONFIG}
        # kubectl config use-context ${KUSER}@${CLUSTER_NAME} --kubeconfig=${KCONFIG}
        ```

        確認。

        ```sh
        # kubectl config view --kubeconfig=${KCONFIG}
        ```

    3. CA証明書とbootstrap kubeconfigをConfigMap(cluster-info)で公開

        kubeletはこのConfigMapを見てクラスタに参加する。

        ```sh
        # kubectl -n kube-public create configmap cluster-info --from-file /etc/kubernetes/pki/ca.crt --from-file /etc/kubernetes/bootstrap.kubeconfig
        ```

        anonymousユーザにcluster-infoへのアクセスを許可する。

        ```sh
        # kubectl -n kube-public create role system:bootstrap-signer-clusterinfo --verb get --resource configmaps
        # kubectl -n kube-public create rolebinding kubeadm:bootstrap-signer-clusterinfo --role system:bootstrap-signer-clusterinfo --user system:anonymous
        ```

        kubelet-bootstrapユーザにロールとグループを紐づける。

        ```sh
        # kubectl create clusterrolebinding kubeadm:kubelet-bootstrap --clusterrole system:node-bootstrapper --group system:bootstrappers
        ```

    4. bootstrap.kubeconfigにトークンを追記

        ```sh
        # kubectl config set-credentials kubelet-bootstrap --token=${BOOTSTRAP_TOKEN} --kubeconfig=/etc/kubernetes/bootstrap.kubeconfig
        ```

8. Docker、CNI、kubeletインストール

    1. Docker

        https://docs.docker.com/install/linux/docker-ce/centos/#set-up-the-repository
        に従ってDocker CEをインストール。
        ストレージドライバにはoverlay2をつかうので、device-mapper-persistent-dataとlvm2は入れない。

        ```sh
        # yum install -y yum-utils
        # yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
        # yum install -y docker-ce
        ```

        18.03.0-ceが入った。

        が、よくみたらDocker CEはOracle Linuxをサポートしていないので、Docker CEはアンインストールして、代わりに[Oracle Container Runtime for Docker](https://docs.oracle.com/cd/E77565_01/E87205/html/section_install_upgrade_yum_docker.html) (aka docker-engine)を入れる。

        `/etc/yum.repos.d/public-yum-ol7.repo`の`ol7_addons`の`enabled`を1にして、以下のコマンドでdocker-engineをインストール。

        ```sh
        # yum install -y docker-engine
        ```

        docker-engine 17.06.2が入った。

        `/etc/sysconfig/docker`に以下を追記して、 Dockerがオープンできる最大ファイル数を増やす。

        ```
        DOCKER_NOFILE=1000000
        ```

        Kubernetes環境ではiptablesはkube-proxyが操作するので、Dockerには操作させないようにするため、`/etc/sysconfig/docker`の`OPTIONS`に`--iptables=false`を追加。
        (これをすると、`--icc=false`は設定できなくなる(不要になる)。)

        ```sh
        # systemctl daemon-reload
        # systemctl enable docker
        # systemctl start docker
        ```

        確認。

        ```sh
        # cat /proc/$(pidof dockerd)/environ
        # systemctl status docker -l
        ```

    2. CNI

        ```sh
        # mkdir -p /etc/cni/net.d /opt/cni/bin/
        # cd /tmp
        # curl -OL https://github.com/containernetworking/cni/releases/download/v0.6.0/cni-amd64-v0.6.0.tgz
        # curl -OL https://github.com/containernetworking/plugins/releases/download/v0.7.1/cni-plugins-amd64-v0.7.1.tgz
        # cd /opt/cni/bin
        # tar zxf /tmp/cni-amd64-v0.6.0.tgz
        # tar zxf /tmp/cni-plugins-amd64-v0.7.1.tgz
        # chmod +x /opt/cni/bin/*
        # cat >/etc/cni/net.d/99-loopback.conf <<EOF
        {
          "type": "loopback"
        }
        EOF
        ```

    3. kubelet

        前提コマンド(conntrack)インストール。

        ```sh
        # yum -y install conntrack-tools
        ```

        systemdのユニットファイルを書いてサービス化。

        ```sh
        # DNS_SERVER_IP=10.0.0.10
        # PAUSE_IMAGE=k8s.gcr.io/pause-amd64:3.1
        # DNS_DOMAIN="cluster.local"
        # mkdir -p /etc/kubernetes/manifests
        # cat > /etc/systemd/system/kubelet.service << EOF
        [Unit]
        Description=Kubernetes Kubelet
        Documentation=https://github.com/kubernetes/kubernetes
        After=docker.service
        Requires=docker.service

        [Service]
        ExecStart=/usr/bin/kubelet \\
          --feature-gates=RotateKubeletServerCertificate=true \\
          --address=0.0.0.0 \\
          --bootstrap-kubeconfig=/etc/kubernetes/bootstrap.kubeconfig \\
          --kubeconfig=/etc/kubernetes/kubelet.kubeconfig \\
          --pod-manifest-path=/etc/kubernetes/manifests \\
          --network-plugin=cni \\
          --cni-conf-dir=/etc/cni/net.d \\
          --cni-bin-dir=/opt/cni/bin \\
          --cluster-dns=${DNS_SERVER_IP} \\
          --cluster-domain=${DNS_DOMAIN} \\
          --authorization-mode=Webhook \\
          --client-ca-file=/etc/kubernetes/pki/ca.crt \\
          --cert-dir=/etc/kubernetes/pki \\
          --rotate-certificates=true \\
          --v=2 \\
          --cgroup-driver=cgroupfs \\
          --pod-infra-container-image=${PAUSE_IMAGE} \\
          --tls-min-version=VersionTLS12 \\
          --allow-privileged=true
        Restart=always
        RestartSec=10s

        [Install]
        WantedBy=multi-user.target
        EOF
        # systemctl daemon-reload
        # systemctl enable kubelet
        # systemctl start kubelet
        ```

        (実際は、systemctl start kubeletするまえに、後述のNode CSR自動承認設定をすべし。)

        `--allow-privileged`はflannelなどに必要。

        `--pod-infra-container-image`では[pause](https://github.com/kubernetes/kubernetes/tree/master/build/pause)コンテナイメージを指定する。
        このコンテナはPod毎に起動され、Podネットワークの名前空間を保持するために使われるらしい。
        今回使った`k8s.gcr.io/pause-amd64:3.1`はKubernetesチームが配布しているものだけど、Oracleが配布しているものもあり、そちらを使うには、Oracle Linux 7.4のダウンロード媒体リストに含まれるOracle Container Services for use with Kubernetes 1.1.9.1に入っているpause-amd64.tarを`docker load`しておいて、そのイメージ名を`--pod-infra-container-image`に渡せばいい。

        `--bootstrap-kubeconfig`で指定したkubeconfigでTLS Bootstrapして、`--cert-dir`で指定したディレクトリに証明書と鍵を生成して、`--kubeconfig`で指定したパスに以降使うkubeconfigを生成する。
        この証明書を自動更新(i.e. Certificate Rotation)するオプションが`--rotate-certificates`。

        `--pod-manifest-path`で指定したディレクトリはkubeletに定期的にスキャンされ、そこに置いたKubernetesマニフェスト(ドットで始まるもの以外)が読まれる。
        (参照: [Static Pods](https://kubernetes.io/docs/tasks/administer-cluster/static-pod/))

        本当は[kubelet config file](https://kubernetes.io/docs/tasks/administer-cluster/kubelet-config-file/)を使ったほうがいいみたいなので、次回の記事でそれに対応する。

        起動確認。

        ```sh
        # systemctl status kubelet -l
        ```

    4. Node CSR手動承認

        TLS Bootstrappingで生成されたCSRを手動で承認する。

        CSRは以下のコマンドで見れる。

        ```sh
        # kubectl get csr
        NAME                                                   AGE       REQUESTOR                 CONDITION
        csr-cf9hm                                              24m       system:node:k8s-master  Pending
        node-csr-Vcw_4HioW1CI96eDH29RMKPrOchEN133053wm6DCXUk   24m       system:bootstrap:itacbw   Pending
        ```

        `node-csr-…`がクライアント証明書のためのCSRで、`csr-…`がサーバ証明書の。
        これらを承認する。

        ```sh
        # kubectl certificate approve node-csr-Vcw_4HioW1CI96eDH29RMKPrOchEN133053wm6DCXUk
        # kubectl certificate approve csr-cf9hm
        ```

        (因みに否認するときは`kubectl certificate deny`)

        これでクラスタにノードが追加されたはず。
        確認。

        ```sh
        # kubectl get node
        NAME         STATUS    ROLES     AGE       VERSION
        k8s-master   Ready     <none>    36s       v1.10.0
        ```

    5. Node CSR自動承認設定

        前節でやった手動承認はcsrapprovingが自動でやってくれる。

        新規ノード参加時のCSRを承認するClusterRoleとして`system:certificates.k8s.io:certificatesigningrequests:nodeclient`が自動生成されているので、これを`system:bootstrappers`グループにバインドしてやると、自動承認が有効になる。

        * s

        ```sh
        # cat <<EOF | kubectl create -f -
        kind: ClusterRoleBinding
        apiVersion: rbac.authorization.k8s.io/v1
        metadata:
          name: auto-approve-csrs-for-group
        subjects:
        - kind: Group
          name: system:bootstrappers
          apiGroup: rbac.authorization.k8s.io
        roleRef:
          kind: ClusterRole
          name: system:certificates.k8s.io:certificatesigningrequests:nodeclient
          apiGroup: rbac.authorization.k8s.io
        EOF
        ```

        また、kubeletのクライアント証明書を自動更新(i.e. RotateKubeletClientCertificate)するときのCSRを承認するClusterRoleとして`system:certificates.k8s.io:certificatesigningrequests:selfnodeclient`が自動生成されていて、これをノード毎のユーザにバインドしてやると、自動承認が有効になる。

        ```sh
        # NODE_USER_NAME=k8s-master
        # cat <<EOF | kubectl create -f -
        kind: ClusterRoleBinding
        apiVersion: rbac.authorization.k8s.io/v1
        metadata:
          name: ${NODE_USER_NAME}-node-client-cert-renewal
        subjects:
        - kind: User
          name: system:node:${NODE_USER_NAME}
          apiGroup: rbac.authorization.k8s.io
        roleRef:
          kind: ClusterRole
          name: system:certificates.k8s.io:certificatesigningrequests:selfnodeclient
          apiGroup: rbac.authorization.k8s.io
        EOF
        ```

        kubeletのサーバ証明書を自動更新(i.e. RotateKubeletServerCertificate)するときのCSRを承認するClusterRoleは現時点で自動生成されないので、自分で作ってノード毎のユーザにバインドして、自動承認を有効にする。

        ```sh
        # cat <<EOF | kubectl create -f -
        kind: ClusterRole
        apiVersion: rbac.authorization.k8s.io/v1
        metadata:
          name: approve-node-server-renewal-csr
        rules:
        - apiGroups: ["certificates.k8s.io"]
          resources: ["certificatesigningrequests/selfnodeserver"]
          verbs: ["create"]
        EOF
        # NODE_USER_NAME=k8s-master
        # cat <<EOF | kubectl create -f -
        kind: ClusterRoleBinding
        apiVersion: rbac.authorization.k8s.io/v1
        metadata:
          name: ${NODE_USER_NAME}-server-client-cert-renewal
        subjects:
        - kind: User
          name: system:node:${NODE_USER_NAME}
          apiGroup: rbac.authorization.k8s.io
        roleRef:
          kind: ClusterRole
          name: approve-node-server-renewal-csr
          apiGroup: rbac.authorization.k8s.io
        EOF
        ```

9. kube-proxy、オーバレイネットワーク、DNSのデプロイ

    1. kube-proxy

        Service Account作成。

        ```sh
        # export KUBECONFIG=/etc/kubernetes/admin.kubeconfig
        # kubectl -n kube-system create serviceaccount kube-proxy
        ```

        kube-proxyのkubeconfig作成

        ```sh
        # MASTER_IP=192.168.171.200
        # KUBERNETES_PUBLIC_ADDRESS=$MASTER_IP
        # export KUBECONFIG=/etc/kubernetes/admin.kubeconfig
        # SECRET=$(kubectl -n kube-system get sa/kube-proxy --output=jsonpath='{.secrets[0].name}')
        # JWT_TOKEN=$(kubectl -n kube-system get secret/$SECRET --output=jsonpath='{.data.token}' | base64 -d)
        # CLUSTER_NAME="default"
        # KCONFIG="kube-proxy.kubeconfig"
        # cd /etc/kubernetes
        # kubectl config set-cluster ${CLUSTER_NAME} --certificate-authority=pki/ca.crt --embed-certs=true --server=https://${KUBERNETES_PUBLIC_ADDRESS}:6443 --kubeconfig=${KCONFIG}
        # kubectl config set-context ${CLUSTER_NAME} --cluster=${CLUSTER_NAME} --user=default --namespace=default --kubeconfig=${KCONFIG}
        # kubectl config set-credentials ${CLUSTER_NAME} --token=${JWT_TOKEN} --kubeconfig=${KCONFIG}
        # kubectl config use-context ${CLUSTER_NAME} --kubeconfig=${KCONFIG}
        ```

        確認。

        ```sh
        # kubectl config view --kubeconfig=${KCONFIG}
        ```

        Service Accountのkube-proxyに`system:node-proxier`というClusterRoleを付ける。

        ```sh
        # kubectl create clusterrolebinding kubeadm:node-proxier --clusterrole system:node-proxier --serviceaccount kube-system:kube-proxy
        ```

        systemdのユニットファイルを書いてサービス化。

        ```sh
        # cat > /etc/systemd/system/kube-proxy.service << EOF
        [Unit]
        Description=Kubernetes Kube Proxy
        Documentation=https://github.com/kubernetes/kubernetes
        After=network.target

        [Service]
        ExecStart=/usr/bin/kube-proxy \\
          --feature-gates=RotateKubeletServerCertificate=true \\
          --bind-address 0.0.0.0 \\
          --kubeconfig=/etc/kubernetes/kube-proxy.kubeconfig \\
          --v=2
        Restart=always
        RestartSec=10s

        [Install]
        WantedBy=multi-user.target
        EOF
        # systemctl daemon-reload
        # systemctl enable kube-proxy
        # systemctl start kube-proxy
        ```

        確認。

        ```sh
        # systemctl status kube-proxy -l
        ```

    2. オーバレイネットワーク (flannel)

        [flannelのドキュメント](https://github.com/coreos/flannel/blob/master/Documentation/kubernetes.md)を参考に。

        flannelをデプロイするには、kube-apiserverとkube-controller-managerの起動オプションに`--allow-privileged`を付ける必要がある。

        また、公式が配布しているKubernetesマニフェストを使う場合、kube-controller-managerの起動オプションの`--cluster-cidr`で`10.244.0.0/16`を指定する必要がある。

        デプロイ自体は以下のコマンドを実行するだけ。

        ```sh
        # export KUBECONFIG=/etc/kubernetes/admin.kubeconfig
        # kubectl apply -f https://raw.githubusercontent.com/coreos/flannel/master/Documentation/kube-flannel.yml
        ```

        このKubernetesマニフェストでは、quay.ioから`quay.io/coreos/flannel:v0.10.0-amd64`というコンテナイメージがpullされる。

        Oracleもflannelのコンテナイメージを配布していて、そちらを使うには、Oracle Linux 7.4のダウンロード媒体リストに含まれるOracle Container Services for use with Kubernetes 1.1.9.1に入っているflannel.tarを`docker load`しておいて、そのイメージを使うようにマニフェストを書きかえればいい。

        起動確認。

        ```sh
        # kubectl -n kube-system get po
        NAME                    READY     STATUS    RESTARTS   AGE
        kube-flannel-ds-gkcqd   1/1       Running   0          1m
        ```

        flannelは[Network Policy](https://kubernetes.io/docs/concepts/services-networking/network-policies/)をサポートしていないので、[Calico](https://www.projectcalico.org/)か[Weave Net](https://www.weave.works/oss/net/)あたりにすればよかったかも。
        (した。[Kubernetes 1.10のクラスタにWeave Netをデプロイする](https://www.kaitoy.xyz/2018/05/04/kubernetes-with-weave-net/))

    3. CoreDNS

        Kubernetes 1.10からは、サービスディスカバリに(kube-dnsの代わりに)CoreDNSを使うのが標準になった。

        以下を参考にCoreDNSをデプロイする:

        * https://kubernetes.io/docs/tasks/administer-cluster/coredns/
        * https://coredns.io/2018/01/29/deploying-kubernetes-with-coredns-using-kubeadm/
        * https://github.com/coredns/deployment/tree/master/kubernetes

        ```sh
        # cd /tmp
        # curl -LO https://raw.githubusercontent.com/coredns/deployment/master/kubernetes/coredns.yaml.sed
        # curl -LO https://raw.githubusercontent.com/coredns/deployment/master/kubernetes/deploy.sh
        # chmod +x deploy.sh
        # DNS_SERVER_IP="10.0.0.10"
        # SERVICE_CLUSTER_IP_RANGE="10.0.0.0/16"
        # DNS_DOMAIN="cluster.local"
        # ./deploy.sh -r $SERVICE_CLUSTER_IP_RANGE -i $DNS_SERVER_IP -d $DNS_DOMAIN > /etc/kubernetes/manifests/coredns.yaml
        # export KUBECONFIG=/etc/kubernetes/admin.kubeconfig
        # kubectl apply -f /etc/kubernetes/manifests/coredns.yaml
        ```

        このKubernetesマニフェストではDocker Hubから`coredns/coredns:1.1.1`というイメージがpullされる。

        起動確認。

        ```sh
        # kubectl -n kube-system get pods -o wide | grep coredns
        coredns-8459d9f654-b585f   1/1       Running   0          48s       10.244.0.3        k8s-master
        coredns-8459d9f654-x7drc   1/1       Running   0          48s       10.244.0.2        k8s-master
        ```

        起動確認時にCoreDNSのIPアドレスを確認して、動作確認。

        ```sh
        # dig @10.244.0.3 kubernetes.default.svc.cluster.local +noall +answer

        ; <<>> DiG 9.9.4-RedHat-9.9.4-61.el7 <<>> @10.244.0.3 kubernetes.default.svc.cluster.local +noall +answer
        ; (1 server found)
        ;; global options: +cmd
        kubernetes.default.svc.cluster.local. 5 IN A    10.0.0.1
        ```

10. Kubernetesアプリデプロイ

    前節まででKubernetesクラスタの構築は完了。
    試しにKubernetesアプリをひとつデプロイしてみる。

    1. [Weave Scope](https://github.com/weaveworks/scope)

        [ドキュメント](https://www.weave.works/docs/scope/latest/installing/#k8s)を参考に。

        ```sh
        # cd /etc/kubernetes/manifests/
        # export KUBECONFIG=/etc/kubernetes/admin.kubeconfig
        # curl -sSL -o scope.yaml https://cloud.weave.works/k8s/scope.yaml?k8s-service-type=NodePort
        # kubectl apply -f scope.yaml
        ```

        このKubernetesマニフェストではDocker Hubから`weaveworks/scope:1.8.0`というイメージがpullされる。

        `kubectl -n weave get svc/weave-scope-app`でポート調べて、`http://k8s-master:<ポート>/`をブラウザ開くとWeave ScopeのGUIが見れる。
