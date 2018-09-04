+++
categories = ["Programing"]
date = "2018-05-05T21:54:30+09:00"
draft = false
eyecatch = "kubernetes.png"
slug = "kubernetes-kubelet-config-and-pod-sec-policy"
tags = ["kubernetes", "docker"]
title = "Kubernetes 1.10のkubeletの起動オプションをKubelet ConfigファイルとPodSecurityPolicyで置き換える"
+++

「[Kubernetes 1.10をスクラッチから全手動で構築](https://www.kaitoy.xyz/2018/04/17/kubernetes110-from-scratch/)」、「[Kubernetes 1.10のクラスタにWeave Netをデプロイする](https://www.kaitoy.xyz/2018/05/04/kubernetes-with-weave-net/)」の続き。

kubeletの起動オプションの代わりに、Kubelet ConfigファイルとPodSecurityPolicyを使うように変更した話。

ついでにkube-proxyとkube-schedulerもConfigファイルを使うようにした。

{{< google-adsense >}}

# Kubelet Configファイル

`journalctl -u kubelet`すると、以下の警告が出ている。

```
Apr 28 15:31:39 k8s-master kubelet[1370]: Flag --address has been deprecated, This parameter should be set via the config file specified by the Kubelet's -
-config flag. See https://kubernetes.io/docs/tasks/administer-cluster/kubelet-config-file/ for more information.
Apr 28 15:31:40 k8s-master kubelet[1370]: Flag --pod-manifest-path has been deprecated, This parameter should be set via the config file specified by the K
ubelet's --config flag. See https://kubernetes.io/docs/tasks/administer-cluster/kubelet-config-file/ for more information.
Apr 28 15:31:40 k8s-master kubelet[1370]: Flag --cluster-dns has been deprecated, This parameter should be set via the config file specified by the Kubelet
's --config flag. See https://kubernetes.io/docs/tasks/administer-cluster/kubelet-config-file/ for more information.
Apr 28 15:31:40 k8s-master kubelet[1370]: Flag --cluster-domain has been deprecated, This parameter should be set via the config file specified by the Kube
let's --config flag. See https://kubernetes.io/docs/tasks/administer-cluster/kubelet-config-file/ for more information.
Apr 28 15:31:40 k8s-master kubelet[1370]: Flag --authorization-mode has been deprecated, This parameter should be set via the config file specified by the
Kubelet's --config flag. See https://kubernetes.io/docs/tasks/administer-cluster/kubelet-config-file/ for more information.
Apr 28 15:31:40 k8s-master kubelet[1370]: Flag --client-ca-file has been deprecated, This parameter should be set via the config file specified by the Kube
let's --config flag. See https://kubernetes.io/docs/tasks/administer-cluster/kubelet-config-file/ for more information.
Apr 28 15:31:40 k8s-master kubelet[1370]: Flag --cgroup-driver has been deprecated, This parameter should be set via the config file specified by the Kubel
et's --config flag. See https://kubernetes.io/docs/tasks/administer-cluster/kubelet-config-file/ for more information.
Apr 28 15:31:40 k8s-master kubelet[1370]: Flag --tls-min-version has been deprecated, This parameter should be set via the config file specified by the Kubelet's --config flag. See https://kubernetes.io/docs/tasks/administer-cluster/kubelet-config-file/ for more information.
Apr 28 15:31:40 k8s-master kubelet[1370]: Flag --allow-privileged has been deprecated, will be removed in a future version
```

kubeletのいくつかのオプションは、https://kubernetes.io/docs/tasks/administer-cluster/kubelet-config-file/ を参照してKubelet Configファイルのほうに書けとある。

参照先のマニュアルには現時点でほぼ何も書いてないし、ググっても情報が無いので、[ソース](https://github.com/kubernetes/kubernetes/blob/release-1.10/pkg/kubelet/apis/kubeletconfig/v1beta1/types.go)を見てそれっぽく書いてみた。

将来的に調整しそうなパラメータは、Kubelet Configファイルにデフォルト値とともにコメントとして書き出している。

```sh
# DNS_SERVER_IP=10.0.0.10
# DNS_DOMAIN="cluster.local"
# cat > /etc/kubernetes/kubelet.conf << EOF
kind: KubeletConfiguration
apiVersion: kubelet.config.k8s.io/v1beta1
featureGates:
  RotateKubeletServerCertificate: true
address: "0.0.0.0"
staticPodPath: "/etc/kubernetes/manifests"
clusterDNS: ["${DNS_SERVER_IP}"]
clusterDomain: "${DNS_DOMAIN}"
authorization:
  mode: Webhook
  webhook:
    cacheAuthorizedTTL: "5m0s"
    cacheUnauthorizedTTL: "30s"
authentication:
  x509:
    clientCAFile: "/etc/kubernetes/pki/ca.crt"
  webhook:
    enabled: false
    cacheTTL: "0s"
  anonymous:
    enabled: false
cgroupDriver: "cgroupfs"
tlsMinVersion: "VersionTLS12"
tlsCipherSuites:
- "TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256"
- "TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384"
- "TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256"
- "TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384"
readOnlyPort: 0
# port: 10250
# containerLogMaxSize: "10Mi"
# containerLogMaxFiles: 5
# evictionHard:
#   imagefs.available: "15%"
#   memory.available: "100Mi"
#   nodefs.available: "10%"
#   nodefs.inodesFree: "5%"
# evictionMaxPodGracePeriod: 0
# evictionPressureTransitionPeriod: "5m0s"
# fileCheckFrequency: "20s"
# imageGCHighThresholdPercent: 85
# imageGCLowThresholdPercent: 80
# maxOpenFiles: 1000000
# maxPods: 110
# imageMinimumGCAge: "2m0s"
# nodeStatusUpdateFrequency: "10s"
# runtimeRequestTimeout: "2m0s"
# streamingConnectionIdleTimeout: "4h0m0s"
# syncFrequency: "1m0s"
# volumeStatsAggPeriod: "1m0s"
EOF
# PAUSE_IMAGE=k8s.gcr.io/pause-amd64:3.1
# cat > /etc/systemd/system/kubelet.service << EOF
[Unit]
Description=Kubernetes Kubelet
Documentation=https://github.com/kubernetes/kubernetes
After=docker.service
Requires=docker.service

[Service]
User=root
Group=root
ExecStart=/usr/bin/kubelet \\
  --allow-privileged=true \\
  --config=/etc/kubernetes/kubelet.conf \\
  --bootstrap-kubeconfig=/etc/kubernetes/bootstrap.kubeconfig \\
  --kubeconfig=/etc/kubernetes/kubelet.kubeconfig \\
  --network-plugin=cni \\
  --cni-conf-dir=/etc/cni/net.d \\
  --cni-bin-dir=/opt/cni/bin \\
  --cert-dir=/etc/kubernetes/pki \\
  --rotate-certificates=true \\
  --v=2 \\
  --pod-infra-container-image=${PAUSE_IMAGE}
Restart=always
RestartSec=10s

[Install]
WantedBy=multi-user.target
EOF
# systemctl daemon-reload
# systemctl restart kubelet
```

<br>

`--allow-privileged`だけは、警告が出てるけどKubelet Configファイルで設定できない。

## PodSecurityPolicy

`--allow-privileged`は非推奨。
どうも代わりに[PodSecurityPolicy](https://kubernetes.io/docs/concepts/policy/pod-security-policy/)で制御しろということのようだ。

PodSecurityPolicyを使うにはまず、kube-apiserverの起動オプションの`--enable-admission-plugins`に`PodSecurityPolicy`を追加する必要がある。

で、privilegedななんでもできるPodSecurityPolicyと、それを使うロールを作成する。
因みにPodSecurityPolicyは名前空間に属さない。

```sh
# kubectl create -f- <<EOF
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: privileged
spec:
  privileged: true
  hostIPC: true
  hostPID: true
  hostNetwork: true
  hostPorts:
  - min: 0
    max: 65535
  volumes:
  - "*"
  fsGroup:
    rule: "RunAsAny"
  runAsUser:
    rule: "RunAsAny"
  supplementalGroups:
    rule: "RunAsAny"
  allowPrivilegeEscalation: true
  allowedCapabilities:
  - "*"
  seLinux:
    rule: "RunAsAny"
EOF
# kubectl -n kube-system create role psp:privileged --verb=use --resource=podsecuritypolicy --resource-name=privileged
# kubectl -n weave create role psp:privileged --verb=use --resource=podsecuritypolicy --resource-name=privileged
```

今のところ、privilegedなPodSecurityPolicyが必要なService AccountはWeave Netのkube-system:weave-netと、Weave Scopeのweave:weave-scopeとweave:default。
こいつらに上記ロールをバインドする。

```sh
# kubectl -n kube-system create rolebinding weave-net:psp:privileged --role=psp:privileged --serviceaccount=kube-system:weave-net
# kubectl -n weave create rolebinding weave-scope:psp:privileged --role=psp:privileged --serviceaccount=weave:weave-scope
# kubectl -n weave create rolebinding weave-default:psp:privileged --role=psp:privileged --serviceaccount=weave:default
```

<br>

あと、CoreDNS用のPodSecurityPolicyとロールを作ってバインドする。

```sh
# kubectl apply -f- <<EOF
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: coredns
spec:
  privileged: false
  hostIPC: false
  hostPID: false
  hostNetwork: false
  hostPorts:
  - min: 0
    max: 65535
  volumes:
  - "configMap"
  - "secret"
  fsGroup:
    rule: "RunAsAny"
  runAsUser:
    rule: "RunAsAny"
  supplementalGroups:
    rule: "RunAsAny"
  allowPrivilegeEscalation: true
  seLinux:
    rule: "RunAsAny"
EOF
# kubectl -n kube-system create role psp:coredns --verb=use --resource=podsecuritypolicy --resource-name=coredns
# kubectl -n kube-system create rolebinding coredns:psp:coredns --role=psp:coredns --serviceaccount=kube-system:coredns
```

<br>

これで晴れてkubeletから`--allow-privileged`を外せる、と思ったら、外したら動かなかった。
どうも現時点では[kubeletとPodSecurityPolicyが連携できていない](https://github.com/kubernetes/kubernetes/issues/58010)らしく、`--allow-privileged`は付けとかないといけないようだ。
付けといても、PodSecurityPolicyでprivilegedをtrueにしないとprivilegedが許可されないので、動きとしては問題ない。

`--allow-privileged`はKubernetes 1.12で廃止される予定なので、それまでにはなんとかなるだろう。

## Kube Proxy Configファイル
kube-proxyも[Kube Proxy Config](https://github.com/kubernetes/kubernetes/blob/master/pkg/proxy/apis/config/types.go)というのがある。
[ドキュメントには載ってない](https://github.com/kubernetes/kubernetes/issues/50041)けど、使わないと警告が出るので適当に書いてみた。

```sh
# CLUSTER_CIDR="10.32.0.0/16"
# cat > /etc/kubernetes/kube-proxy.conf << EOF
kind: KubeProxyConfiguration
apiVersion: kubeproxy.config.k8s.io/v1alpha1
featureGates:
  RotateKubeletServerCertificate: true
bindAddress: "0.0.0.0"
clientConnection:
  kubeconfig: "/etc/kubernetes/kube-proxy.kubeconfig"
clusterCIDR: "${CLUSTER_CIDR}"
EOF
# cat > /etc/systemd/system/kube-proxy.service << EOF
[Unit]
Description=Kubernetes Kube Proxy
Documentation=https://github.com/kubernetes/kubernetes
After=network.target

[Service]
User=root
Group=root
ExecStart=/usr/bin/kube-proxy \\
  --config=/etc/kubernetes/kube-proxy.conf \\
  --v=2
Restart=always
RestartSec=10s

[Install]
WantedBy=multi-user.target
EOF
# systemctl daemon-reload
# systemctl restart kube-proxy
```

## Kube Scheduler Confファイル
kube-schedulerも[Kube Scheduler Conf](https://github.com/kubernetes/kubernetes/blob/master/pkg/apis/componentconfig/v1alpha1/types.go)というのがある。
例によってドキュメントには載ってないけど、使わないと警告が出るので適当に書いてみた。

```sh
# cat > /etc/kubernetes/kube-scheduler.conf << EOF
kind: KubeSchedulerConfiguration
apiVersion: componentconfig/v1alpha1
featureGates:
  RotateKubeletServerCertificate: true
healthzBindAddress: "0.0.0.0"
clientConnection:
  kubeconfig: "/etc/kubernetes/kube-scheduler.kubeconfig"
EOF
# cat > /etc/systemd/system/kube-scheduler.service << EOF
[Unit]
Description=Kubernetes Scheduler
Documentation=https://github.com/kubernetes/kubernetes
After=network.target

[Service]
User=kubernetes
Group=kubernetes
ExecStart=/usr/bin/kube-scheduler \\
  --config=/etc/kubernetes/kube-scheduler.conf \\
  --v=2
Restart=always
RestartSec=10s

[Install]
WantedBy=multi-user.target
EOF
# systemctl daemon-reload
# systemctl restart kube-scheduler
```
