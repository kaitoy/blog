+++
categories = ["Programing"]
date = "2018-04-17T00:31:48+09:00"
draft = false
eyecatch = "kubernetes.png"
slug = "kubernetes110-from-scratch"
tags = ["kubernetes", "docker"]
title = "Kubernetes 1.10をスクラッチから手動で構築"

+++

CentOS 7のVMでKubernetes1.10の単一ノードクラスタをスクラッチから作った。
参考にしたのは主に以下。

https://nixaid.com/deploying-kubernetes-cluster-from-scratch/
https://kubernetes.io/docs/getting-started-guides/scratch/
https://ulam.io/blog/kubernetes-scratch/
https://docs.microsoft.com/en-us/virtualization/windowscontainers/kubernetes/creating-a-linux-master

とりあえず作業メモだけ残す。
あとで整理する。

{{< google-adsense >}}

## 作業メモ

単一ノードのクラスタ。

おおむね、k8sコンポーネント間の通信の暗号化に使う証明書の生成、kubeconfigの生成、etcdのデプロイ、k8sコンポーネントのデプロイ、Fannelデプロイ、CoreDNSデプロイ、という流れ。

とりあえずOracle Linux 7.4のMinimalでVMを作って固定IP(192.168.171.200)にして、ホスト名をk8s-masterにして、swapをoffに。
firewalldとSELinuxもとりあえず無効に。

`/etc/hosts`には`192.168.171.200 k8s-master`を追加。

1. Configure bridge netfilter and the IP forwarding

    ```sh
    # modprobe br_netfilter
    ```

    `/etc/sysconfig/modules/br_netfilter.modules`を以下の内容で作る。

    ```sh
    #!/bin/sh
    /sbin/modprobe br_netfilter > /dev/null 2>&1
    ```

    `chmod 755 /etc/sysconfig/modules/br_netfilter.modules`

    `/etc/sysctl.d/kubernetes.conf`を以下の内容で作る。

    ```
    net.bridge.bridge-nf-call-iptables = 1
    net.bridge.bridge-nf-call-ip6tables = 1
    net.ipv4.ip_forward = 1
    ```

    で、`sysctl -p /etc/sysctl.d/kubernetes.conf`

    確認。

    ```sh
    # lsmod |grep br_netfilter
    # sysctl -a | grep -E "net.bridge.bridge-nf-call-|net.ipv4.ip_forward"
    ```

2. Generate x509 certs

    1. openssl configuration file

        ```sh
        # mkdir -p /etc/kubernetes/pki
        # cd /etc/kubernetes/pki
        # K8S_SERVICE_IP=10.0.0.1
        # MASTER_IP=192.168.171.200
        ```

        ```sh
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

    2. Kubernetes CA cert

        used to sign the rest of K8s certs.

        ```sh
        # cd /etc/kubernetes/pki
        # CA_DAYS=5475
        # openssl ecparam -name secp521r1 -genkey -noout -out ca.key
        # chmod 0600 ca.key
        # openssl req -x509 -new -sha256 -nodes -key ca.key -days $CA_DAYS -out ca.crt -subj "/CN=kubernetes-ca"  -extensions v3_ca -config ./openssl.cnf
        ```

    3. kube apiserver cert

        used as default x509 apiserver cert.

        ```sh
        # cd /etc/kubernetes/pki
        # APISERVER_DAYS=5475
        # openssl ecparam -name secp521r1 -genkey -noout -out kube-apiserver.key
        # chmod 0600 kube-apiserver.key
        # openssl req -new -sha256 -key kube-apiserver.key -subj "/CN=kube-apiserver" | openssl x509 -req -sha256 -CA ca.crt -CAkey ca.key -CAcreateserial -out kube-apiserver.crt -days $APISERVER_DAYS -extensions v3_req_apiserver -extfile ./openssl.cnf
        ```

    4. apiserver kubelet client cert

        used for x509 client authentication to the kubelet's HTTPS endpoint.

        ```sh
        # cd /etc/kubernetes/pki
        # APISERVER_KUBELET_CLIENT_DAYS=5475
        # openssl ecparam -name secp521r1 -genkey -noout -out apiserver-kubelet-client.key
        # chmod 0600 apiserver-kubelet-client.key
        # openssl req -new -key apiserver-kubelet-client.key -subj "/CN=kube-apiserver-kubelet-client/O=system:masters" | openssl x509 -req -sha256 -CA ca.crt -CAkey ca.key -CAcreateserial -out apiserver-kubelet-client.crt -days $APISERVER_KUBELET_CLIENT_DAYS -extensions v3_req_client -extfile ./openssl.cnf
        ```

    5. admin client cert

        used by a human to administrate the cluster.

        ```sh
        # cd /etc/kubernetes/pki
        # ADMIN_DAYS=5475
        # openssl ecparam -name secp521r1 -genkey -noout -out admin.key
        # chmod 0600 admin.key
        # openssl req -new -key admin.key -subj "/CN=kubernetes-admin/O=system:masters" | openssl x509 -req -sha256 -CA ca.crt -CAkey ca.key -CAcreateserial -out admin.crt -days $ADMIN_DAYS -extensions v3_req_client -extfile ./openssl.cnf
        ```

    6. Service Account key

        The service account token private key (sa.key) given only to the controller manager, is used to sign the tokens.
        The masters only need the public key portion (sa.pub) in order to verify the tokens signed by the controller manager.

        ```sh
        # cd /etc/kubernetes/pki
        # CONTROLLER_MANAGER_DAYS=5475
        # openssl ecparam -name secp521r1 -genkey -noout -out sa.key
        # openssl ec -in sa.key -outform PEM -pubout -out sa.pub
        # chmod 0600 sa.key
        # openssl req -new -sha256 -key sa.key -subj "/CN=system:kube-controller-manager" | openssl x509 -req -sha256 -CA ca.crt -CAkey ca.key -CAcreateserial -out sa.crt -days $CONTROLLER_MANAGER_DAYS -extensions v3_req_client -extfile ./openssl.cnf
        ```

    7. kube-scheduler cert

        used to allow access to the resources required by the kube-scheduler component.

        ```sh
        # cd /etc/kubernetes/pki
        # SCHEDULER_DAYS=5475
        # openssl ecparam -name secp521r1 -genkey -noout -out kube-scheduler.key
        # chmod 0600 kube-scheduler.key
        # openssl req -new -sha256 -key kube-scheduler.key -subj "/CN=system:kube-scheduler" | openssl x509 -req -sha256 -CA ca.crt -CAkey ca.key -CAcreateserial -out kube-scheduler.crt -days $SCHEDULER_DAYS -extensions v3_req_client -extfile ./openssl.cnf
        ```

    8. front proxy CA cert

        used to sign front proxy client cert.

        ```sh
        # cd /etc/kubernetes/pki
        # FRONT_PROXY_CA_DAYS=5475
        # openssl ecparam -name secp521r1 -genkey -noout -out front-proxy-ca.key
        # chmod 0600 front-proxy-ca.key
        # openssl req -x509 -new -sha256 -nodes -key front-proxy-ca.key -days $FRONT_PROXY_CA_DAYS -out front-proxy-ca.crt -subj "/CN=front-proxy-ca" -extensions v3_ca -config ./openssl.cnf
        ```

    9. front proxy client cert

        used to verify client certificates on incoming requests before trusting usernames in headers specified by --requestheader-username-headers

        ```sh
        # cd /etc/kubernetes/pki
        # FRONT_PROXY_CLIENT_DAYS=5475
        # openssl ecparam -name secp521r1 -genkey -noout -out front-proxy-client.key
        # chmod 0600 front-proxy-client.key
        # openssl req -new -sha256 -key front-proxy-client.key -subj "/CN=front-proxy-client" | openssl x509 -req -sha256 -CA front-proxy-ca.crt -CAkey front-proxy-ca.key -CAcreateserial -out front-proxy-client.crt -days $FRONT_PROXY_CLIENT_DAYS -extensions v3_req_client -extfile ./openssl.cnf
        ```

    10. kube-proxy cert

        Create kube-proxy x509 cert only if you want to use a kube-proxy role instead of a kube-proxy service account with its JWT token (kubernetes secrets) for auhentication.

        ```sh
        # cd /etc/kubernetes/pki
        # KUBE_PROXY_DAYS=5475
        # openssl ecparam -name secp521r1 -genkey -noout -out kube-proxy.key
        # chmod 0600 kube-proxy.key
        # openssl req -new -key kube-proxy.key -subj "/CN=kube-proxy/O=system:node-proxier" | openssl x509 -req -sha256 -CA ca.crt -CAkey ca.key -CAcreateserial -out kube-proxy.crt -days $KUBE_PROXY_DAYS -extensions v3_req_client -extfile ./openssl.cnf
        ```

    11. etcd CA cert

        etcd CA cert used to sign the rest of etcd certs.

        ```sh
        # cd /etc/kubernetes/pki
        # ETCD_CA_DAYS=5475
        # openssl ecparam -name secp521r1 -genkey -noout -out etcd-ca.key
        # chmod 0600 etcd-ca.key
        # openssl req -x509 -new -sha256 -nodes -key etcd-ca.key -days $ETCD_CA_DAYS -out etcd-ca.crt -subj "/CN=etcd-ca" -extensions v3_ca -config ./openssl.cnf
        ```

    12. etcd cert

        etcd cert used for securing connections to etcd (client-to-server).

        ```sh
        # cd /etc/kubernetes/pki
        # ETCD_DAYS=5475
        # openssl ecparam -name secp521r1 -genkey -noout -out etcd.key
        # chmod 0600 etcd.key
        # openssl req -new -sha256 -key etcd.key -subj "/CN=etcd" | openssl x509 -req -sha256 -CA etcd-ca.crt -CAkey etcd-ca.key -CAcreateserial -out etcd.crt -days $ETCD_DAYS -extensions v3_req_etcd -extfile ./openssl.cnf
        ```

    13. etcd peer cert

        etcd peer cert used for securing connections between peers (server-to-server).

        ```sh
        # cd /etc/kubernetes/pki
        # ETCD_PEER_DAYS=5475
        # openssl ecparam -name secp521r1 -genkey -noout -out etcd-peer.key
        # chmod 0600 etcd-peer.key
        # openssl req -new -sha256 -key etcd-peer.key -subj "/CN=etcd-peer" | openssl x509 -req -sha256 -CA etcd-ca.crt -CAkey etcd-ca.key -CAcreateserial -out etcd-peer.crt -days $ETCD_PEER_DAYS -extensions v3_req_etcd -extfile ./openssl.cnf
        ```

    14. 確認

        ```sh
        # for i in *crt; do
          echo $i:;
          openssl x509 -subject -issuer -noout -in $i;
          echo;
        done
        ```

3. Controller binaries

    公式ドキュメントによると、
    docker, kubelet, and kube-proxyはコンテナ外で。
    etcd, kube-apiserver, kube-controller-manager, and kube-schedulerはコンテナで動かすのが推奨。
    だけど全部コンテナ外でやる。

    Oracle Linux用には、各コンポのコンテナイメージ詰め合わせがOracle Container Services for use with Kubernetesという名前で配布されているけど、現時点で1.10がないので使わない。

    バイナリをダウンロードするURLは以下。

    https://storage.googleapis.com/kubernetes-release/release/v1.10.0/kubernetes-server-linux-amd64.tar.gz

    https://storage.googleapis.com/kubernetes-release/release/v1.10.0/bin/linux/amd64/kube-apiserver
    https://storage.googleapis.com/kubernetes-release/release/v1.10.0/bin/linux/amd64/kube-controller-manager
    https://storage.googleapis.com/kubernetes-release/release/v1.10.0/bin/linux/amd64/kube-scheduler
    https://storage.googleapis.com/kubernetes-release/release/v1.10.0/bin/linux/amd64/kube-proxy
    https://storage.googleapis.com/kubernetes-release/release/v1.10.0/bin/linux/amd64/kubelet
    https://storage.googleapis.com/kubernetes-release/release/v1.10.0/bin/linux/amd64/kubectl

    https://storage.googleapis.com/kubernetes-release/release/v1.10.0/bin/linux/amd64/kube-apiserver.tar
    https://storage.googleapis.com/kubernetes-release/release/v1.10.0/bin/linux/amd64/kube-controller-manager.tar
    https://storage.googleapis.com/kubernetes-release/release/v1.10.0/bin/linux/amd64/kube-scheduler.tar
    https://storage.googleapis.com/kubernetes-release/release/v1.10.0/bin/linux/amd64/kube-proxy.tar

    https://storage.googleapis.com/kubernetes-release/release/v1.10.0/bin/linux/amd64/hyperkube

    hyperkubeとkubeadmを`/usr/bin/`に。
    hyperkubeより個別のバイナリ使ったほうがメモリ使用量は小さくなるんだろうか。

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

4. Generate kube configs

    kubeconfig files are used by a service or a user to authenticate oneself.

    1. service account kubeconfig

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

    2. kube-scheduler kubeconfig

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

    3. admin kubeconfig

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

    4. kubelet kubeconfig

        ```sh
        # MASTER_IP=192.168.171.200
        # KUBERNETES_PUBLIC_ADDRESS=$MASTER_IP
        # CLUSTER_NAME="default"
        # KCONFIG=kubelet.kubeconfig
        # KUSER="system:node:k8s-master"
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

5. Deploy etcd

    https://github.com/coreos/etcd/releases/download/v3.1.12/etcd-v3.1.12-linux-amd64.tar.gz

    etcdとetcdctlを`/usr/bin/`にいれて、

    ```sh
    # chown root:root /usr/bin/etcd*
    # chmod 0755 /usr/bin/etcd*
    # mkdir -p /var/lib/etcd
    ```

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

6. Control plane deployment

    1. kube-apiserver

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
          --apiserver-count=1 \\
          --allow-privileged=true \\
          --enable-admission-plugins=NamespaceLifecycle,LimitRanger,ServiceAccount,PersistentVolumeLabel,DefaultStorageClass,ResourceQuota,DefaultTolerationSeconds \\
          --authorization-mode=RBAC \\
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
          --enable-bootstrap-token-auth \\
          --kubelet-client-certificate=/etc/kubernetes/pki/apiserver-kubelet-client.crt \\
          --kubelet-client-key=/etc/kubernetes/pki/apiserver-kubelet-client.key \\
          --kubelet-preferred-address-types=InternalIP,ExternalIP,Hostname \\
          --requestheader-client-ca-file=/etc/kubernetes/pki/front-proxy-ca.crt \\
          --requestheader-username-headers=X-Remote-User \\
          --requestheader-group-headers=X-Remote-Group \\
          --requestheader-allowed-names=front-proxy-client \\
          --requestheader-extra-headers-prefix=X-Remote-Extra- \\
          --v=2 \\
          --tls-min-version=VersionTLS10
        Restart=always
        RestartSec=10s

        [Install]
        WantedBy=multi-user.target
        EOF
        # systemctl daemon-reload
        # systemctl enable kube-apiserver
        # systemctl start kube-apiserver
        ```

        --allow_privilegedはflannelに必要。

        確認。

        ```sh
        # systemctl status kube-apiserver -l
        ```

    2. kube-controller-manager

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
          --tls-min-version=VersionTLS10
        Restart=always
        RestartSec=10s

        [Install]
        WantedBy=multi-user.target
        EOF
        # systemctl daemon-reload
        # systemctl enable kube-controller-manager
        # systemctl start kube-controller-manager
        ```

        確認。

        ```sh
        # systemctl status kube-controller-manager -l
        ```

    3. Kubernetes Scheduler

        ```sh
        # cat > /etc/systemd/system/kube-scheduler.service << EOF
        [Unit]
        Description=Kubernetes Scheduler
        Documentation=https://github.com/kubernetes/kubernetes
        After=network.target

        [Service]
        ExecStart=/usr/bin/kube-scheduler \\
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

    4. Verify the control plane

        ```sh
        # export KUBECONFIG=/etc/kubernetes/admin.kubeconfig
        # kubectl config use-context kubernetes-admin@default
        # kubectl version
        # kubectl get componentstatuses
        ```

7. Prepare boostrapping part

    1. Generate bootstrap token

        Create the bootstrap token and kubeconfig which will be used by kubelets to join the Kubernetes cluster;

        ```sh
        # TOKEN_PUB=$(openssl rand -hex 3)
        # TOKEN_SECRET=$(openssl rand -hex 8)
        # BOOTSTRAP_TOKEN="${TOKEN_PUB}.${TOKEN_SECRET}"
        # kubectl -n kube-system create secret generic bootstrap-token-${TOKEN_PUB} --type 'bootstrap.kubernetes.io/token' --from-literal description="cluster bootstrap token" --from-literal token-id=${TOKEN_PUB} --from-literal token-secret=${TOKEN_SECRET} --from-literal usage-bootstrap-authentication=true --from-literal usage-bootstrap-signing=true
        ```

        ちょっと変わった?
        https://kubernetes.io/docs/admin/bootstrap-tokens/

        ```sh
        # TOKEN_PUB=$(openssl rand -hex 3)
        # TOKEN_SECRET=$(openssl rand -hex 8)
        # BOOTSTRAP_TOKEN="${TOKEN_PUB}.${TOKEN_SECRET}"
        # kubectl -n kube-system create secret generic bootstrap-token-${TOKEN_PUB} --type 'bootstrap.kubernetes.io/token' --from-literal description="cluster bootstrap token" --from-literal token-id=${TOKEN_PUB} --from-literal token-secret=${TOKEN_SECRET} --from-literal usage-bootstrap-authentication=true --from-literal usage-bootstrap-signing=true --from-literal auth-extra-groups=system:bootstrappers:worker,system:bootstrappers:ingress
        ```

        `kubeadm token create --kubeconfig /etc/kubernetes/admin.kubeconfig`
        みたいにも作れる。けどexpirationを指定できない…
        https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-token/#cmd-token-generate

        確認。

        ```sh
        # kubectl -n kube-system get secret/bootstrap-token-${TOKEN_PUB} -o yaml
        ```

    2. Create bootstrap kubeconfig

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

    3. Expose CA and bootstrap kubeconfig via configmap

        Expose the kubernetes CA file and the sanitized bootstrap kubeconfig to assist future clients joining the cluster;

        Make sure the bootstrap kubeconfig file does not contain the bootstrap token before you expose it via the cluster-info configmap.

        ```sh
        # kubectl -n kube-public create configmap cluster-info --from-file /etc/kubernetes/pki/ca.crt --from-file /etc/kubernetes/bootstrap.kubeconfig
        ```

        Allow anonymous user to acceess the cluster-info configmap:

        ```sh
        # kubectl -n kube-public create role system:bootstrap-signer-clusterinfo --verb get --resource configmaps
        # kubectl -n kube-public create rolebinding kubeadm:bootstrap-signer-clusterinfo --role system:bootstrap-signer-clusterinfo --user system:anonymous
        ```

        Allow a bootstrapping worker node join the cluster:

        ```sh
        # kubectl create clusterrolebinding kubeadm:kubelet-bootstrap --clusterrole system:node-bootstrapper --group system:bootstrappers
        ```

8. Install Docker & Kubelet

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

        よくみたらDocker CEはOracle Linuxをサポートしていないので、代わりに[Oracle Container Runtime for Docker](https://docs.oracle.com/cd/E77565_01/E87205/html/section_install_upgrade_yum_docker.html)を入れる。

        `/etc/yum.repos.d/public-yum-ol7.repo`の`ol7_addons`の`enabled`を1に。

        ```sh
        # yum install -y docker-engine
        ```

        docker-engine 17.06.2が入った。
        `/etc/systemd/system/docker.service.d/docker-sysconfig.conf`

        `/etc/sysconfig/docker`に以下を追記。

        ```
        DOCKER_NOFILE=1000000
        DOCKER_OPT_BIP=""
        DOCKER_OPT_IPMASQ=""
        ```

        `/etc/sysconfig/docker`の`OPTIONS`に`--iptables=false`を追加。

        ```sh
        # systemctl daemon-reload
        # systemctl enable docker
        # systemctl start docker
        ```

        確認.

        ```sh
        # cat /proc/$(pidof dockerd)/environ
        # systemctl status docker -l
        ```

    2. CNI

        ```sh
        # mkdir -p /etc/cni/net.d /opt/cni/bin/
        ```

        https://github.com/containernetworking/cni/releases/download/v0.6.0/cni-amd64-v0.6.0.tgz
        をダウンロード。

        なかのcnitoolとnoopを`/opt/cni/bin/`に配置。

        ```sh
        # curl -OL https://github.com/containernetworking/plugins/releases/download/v0.7.1/cni-plugins-amd64-v0.7.1.tgz
        # tar zxf cni-plugins-amd64-v0.7.1.tgz
        # cp * /opt/cni/bin/
        # chmod +x /opt/cni/bin/*
        # cat >/etc/cni/net.d/99-loopback.conf <<EOF
        {
          "type": "loopback"
        }
        EOF
        ```

    3. Kubelet

        前提コマンド(conntrack)インストール。

        ```sh
        # yum -y install conntrack-tools
        ```

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
          --cert-dir=/etc/kubernetes \\
          --v=2 \\
          --cgroup-driver=cgroupfs \\
          --pod-infra-container-image=${PAUSE_IMAGE} \\
          --tls-min-version=VersionTLS10 \\
          --allow_privileged
        Restart=always
        RestartSec=10s

        [Install]
        WantedBy=multi-user.target
        EOF
        # systemctl daemon-reload
        # systemctl enable kubelet
        # systemctl start kubelet
        ```

        --allow_privilegedはflannelに必要。

        本当は[kubelet config file](https://kubernetes.io/docs/tasks/administer-cluster/kubelet-config-file/)を使ったほうがいい。

        確認。

        ```sh
        # systemctl status kubelet -l
        ```

9. Deploy essential kubernetes components

    1. kube-proxy

        サービスアカウント作成。

        ```sh
        # export KUBECONFIG=/etc/kubernetes/admin.kubeconfig
        # kubectl -n kube-system create serviceaccount kube-proxy
        ```

        kube-proxy kubeconfig作成

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

        Bind a kube-proxy service account (from kube-system namespace) to a clusterrole system:node-proxier to allow RBAC

        ```sh
        # kubectl create clusterrolebinding kubeadm:node-proxier --clusterrole system:node-proxier --serviceaccount kube-system:kube-proxy
        ```

        Create a kube-proxy service file and run it:

        ```sh
        # cat > /etc/systemd/system/kube-proxy.service << EOF
        [Unit]
        Description=Kubernetes Kube Proxy
        Documentation=https://github.com/kubernetes/kubernetes
        After=network.target

        [Service]
        ExecStart=/usr/bin/kube-proxy \\
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

    2. Flannel

        https://github.com/coreos/flannel/blob/master/Documentation/kubernetes.md

    3. CoreDNS

        https://kubernetes.io/docs/tasks/administer-cluster/coredns/
        https://coredns.io/2018/01/29/deploying-kubernetes-with-coredns-using-kubeadm/
        https://github.com/coredns/deployment/tree/master/kubernetes

        https://github.com/coredns/deployment/archive/master.zip
        をダウンロード。

        なかの`kubernetes/coredns.yaml.sed`と`kubernetes/deploy.sh`をVMにもってきて、

        ```sh
        # DNS_SERVER_IP="10.0.0.10"
        # SERVICE_CLUSTER_IP_RANGE="10.0.0.0/16"
        # DNS_DOMAIN="cluster.local"
        # chmod +x deploy.sh
        # ./deploy.sh -r $SERVICE_CLUSTER_IP_RANGE -i $DNS_SERVER_IP -d $DNS_DOMAIN > /etc/kubernetes/manifests/coredns.yaml
        ```

        ```sh
        # export KUBECONFIG=/etc/kubernetes/admin.kubeconfig
        # kubectl apply -f /etc/kubernetes/manifests/coredns.yaml
        ```

        確認。

        ```sh
        # kubectl -n kube-system get pods -o wide
        # kubectl -n kube-system get deployments
        ```

10. Additional apps

    1. Kubernetes Dashboard

        ```sh
        # cd /etc/kubernetes/manifests/
        # curl -OL https://raw.githubusercontent.com/kubernetes/dashboard/master/src/deploy/recommended/kubernetes-dashboard.yaml
        ```

        ```sh
        # export KUBECONFIG=/etc/kubernetes/admin.kubeconfig
        # kubectl apply -f kubernetes-dashboard.yaml
        ```

    2. Weave Scope

        ```sh
        # curl -sSL -o scope.yaml https://cloud.weave.works/k8s/scope.yaml?k8s-service-type=NodePort
        # kubectl apply -f scope.yaml
        ```

        `kubectl -n weave get svc/weave-scope-app`でポート調べて、`http://k8s-master:<ポート>/`で開く。


ダウンロードしたものまとめ:

https://storage.googleapis.com/kubernetes-release/release/v1.10.0/kubernetes-server-linux-amd64.tar.gz

https://github.com/coreos/etcd/releases/download/v3.1.12/etcd-v3.1.12-linux-amd64.tar.gz

```
================================================================================
 Package                  Arch     Version                   Repository    Size
================================================================================
Installing:
 docker-engine            x86_64   17.06.2.ol-1.0.1.el7      ol7_addons    21 M
Installing for dependencies:
 audit-libs-python        x86_64   2.7.6-3.el7               ol7_latest    73 k
 checkpolicy              x86_64   2.5-4.el7                 ol7_latest   290 k
 container-selinux        noarch   2:2.21-1.el7              ol7_addons    28 k
 libcgroup                x86_64   0.41-13.el7               ol7_latest    64 k
 libsemanage-python       x86_64   2.5-8.el7                 ol7_latest   104 k
 policycoreutils-python   x86_64   2.5-17.1.0.1.el7          ol7_latest   445 k
 python-IPy               noarch   0.75-6.el7                ol7_latest    32 k
 setools-libs             x86_64   3.3.8-1.1.el7             ol7_latest   611 k
```

https://github.com/containernetworking/cni/releases/download/v0.6.0/cni-amd64-v0.6.0.tgz

https://github.com/containernetworking/plugins/releases/download/v0.7.1/cni-plugins-amd64-v0.7.1.tgz

Oracle Container Services for use with Kubernetes 1.1.9.1.zip
のpause-amd64.tar
```
=====================================================================================================================================================
 Package                                     Arch                        Version                               Repository                       Size
=====================================================================================================================================================
Installing:
 conntrack-tools                             x86_64                      1.4.4-3.el7_3                         ol7_latest                      186 k
Installing for dependencies:
 libnetfilter_cthelper                       x86_64                      1.0.0-9.el7                           ol7_latest                       17 k
 libnetfilter_cttimeout                      x86_64                      1.0.0-6.el7                           ol7_latest                       17 k
 libnetfilter_queue                          x86_64                      1.0.2-2.el7_2                         ol7_latest                       22 k
```

https://github.com/coredns/deployment/archive/master.zip
docker image: coredns/coredns:1.1.1

https://raw.githubusercontent.com/coreos/flannel/master/Documentation/kube-flannel.yml
quay.io/coreos/flannel:v0.10.0-amd64

Oracle Container Services for use with Kubernetes 1.1.9.1.zip
のflannel.tar
