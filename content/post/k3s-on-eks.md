+++
categories = ["Programming"]
title = "EKSとオンプレVMとの間でk3sクラスタを組む"
date = "2021-08-16T11:21:51+09:00"
tags = ["kubernetes", "k3s", "aws", "eks"]
draft = false
cover = "k3s.svg"
slug = "k3s-on-eks"
highlight = true
highlightStyle = "monokai"
highlightLanguages = []
+++

AWSのEKSにk3s serverをデプロイして、オンプレのVMのk3s agentとでクラスタを組んでみた話。

<!--more-->

[昨日の記事](https://www.kaitoy.xyz/2021/08/15/k3s-on-on-premises-k8s/)でやったやつの、KubernetesがEKSになった版。

{{< google-adsense >}}

# EKSセットアップ
EKSは手軽に[eksctl](https://docs.aws.amazon.com/ja_jp/eks/latest/userguide/getting-started-eksctl.html)で、1ノードの小さいやつを作った。

```console
[root@vm-1 ~]# eksctl create cluster --name k3s-test --region ap-northeast-1 --with-oidc --ssh-access --ssh-public-key eks-nodes --managed -t t3.medium -N 1 -m 1 -M 1 --node-volume-size 20
2021-08-12 08:19:53 [?]  eksctl version 0.60.0
2021-08-12 08:19:53 [?]  using region ap-northeast-1
2021-08-12 08:19:53 [?]  setting availability zones to [ap-northeast-1a ap-northeast-1c ap-northeast-1d]
2021-08-12 08:19:53 [?]  subnets for ap-northeast-1a - public:192.168.0.0/19 private:192.168.96.0/19
2021-08-12 08:19:53 [?]  subnets for ap-northeast-1c - public:192.168.32.0/19 private:192.168.128.0/19
2021-08-12 08:19:53 [?]  subnets for ap-northeast-1d - public:192.168.64.0/19 private:192.168.160.0/19
2021-08-12 08:19:53 [?]  nodegroup "ng-fe1794d5" will use "" [AmazonLinux2/1.20]
2021-08-12 08:19:53 [?]  using EC2 key pair %!q(*string=<nil>)
2021-08-12 08:19:53 [?]  using Kubernetes version 1.20
2021-08-12 08:19:53 [?]  creating EKS cluster "k3s-test" in "ap-northeast-1" region with managed nodes
2021-08-12 08:19:53 [?]  will create 2 separate CloudFormation stacks for cluster itself and the initial managed nodegroup
2021-08-12 08:19:53 [?]  if you encounter any issues, check CloudFormation console or try 'eksctl utils describe-stacks --region=ap-northeast-1 --cluster=k3s-test'
2021-08-12 08:19:53 [?]  CloudWatch logging will not be enabled for cluster "k3s-test" in "ap-northeast-1"
2021-08-12 08:19:53 [?]  you can enable it with 'eksctl utils update-cluster-logging --enable-types={SPECIFY-YOUR-LOG-TYPES-HERE (e.g. all)} --region=ap-northeast-1 --cluster=k3s-test'
2021-08-12 08:19:53 [?]  Kubernetes API endpoint access will use default of {publicAccess=true, privateAccess=false} for cluster "k3s-test" in "ap-northeast-1"
2021-08-12 08:19:53 [?]  2 sequential tasks: { create cluster control plane "k3s-test", 3 sequential sub-tasks: { 4 sequential sub-tasks: { wait for control plane to become ready, associate IAM OIDC provider, 2 sequential sub-tasks: { create IAM role for serviceaccount "kube-system/aws-node", create serviceaccount "kube-system/aws-node" }, restart daemonset "kube-system/aws-node" }, 1 task: { create addons }, create managed nodegroup "ng-fe1794d5" } }
2021-08-12 08:19:53 [?]  building cluster stack "eksctl-k3s-test-cluster"
2021-08-12 08:19:54 [?]  deploying stack "eksctl-k3s-test-cluster"
2021-08-12 08:20:24 [?]  waiting for CloudFormation stack "eksctl-k3s-test-cluster"
2021-08-12 08:20:54 [?]  waiting for CloudFormation stack "eksctl-k3s-test-cluster"
2021-08-12 08:21:54 [?]  waiting for CloudFormation stack "eksctl-k3s-test-cluster"
2021-08-12 08:22:54 [?]  waiting for CloudFormation stack "eksctl-k3s-test-cluster"
2021-08-12 08:23:54 [?]  waiting for CloudFormation stack "eksctl-k3s-test-cluster"
2021-08-12 08:24:54 [?]  waiting for CloudFormation stack "eksctl-k3s-test-cluster"
2021-08-12 08:25:55 [?]  waiting for CloudFormation stack "eksctl-k3s-test-cluster"
2021-08-12 08:26:55 [?]  waiting for CloudFormation stack "eksctl-k3s-test-cluster"
2021-08-12 08:27:55 [?]  waiting for CloudFormation stack "eksctl-k3s-test-cluster"
2021-08-12 08:28:55 [?]  waiting for CloudFormation stack "eksctl-k3s-test-cluster"
2021-08-12 08:29:55 [?]  waiting for CloudFormation stack "eksctl-k3s-test-cluster"
2021-08-12 08:30:55 [?]  waiting for CloudFormation stack "eksctl-k3s-test-cluster"
2021-08-12 08:31:55 [?]  waiting for CloudFormation stack "eksctl-k3s-test-cluster"
2021-08-12 08:32:56 [?]  waiting for CloudFormation stack "eksctl-k3s-test-cluster"
2021-08-12 08:33:56 [?]  waiting for CloudFormation stack "eksctl-k3s-test-cluster"
2021-08-12 08:34:56 [?]  waiting for CloudFormation stack "eksctl-k3s-test-cluster"
2021-08-12 08:35:56 [?]  waiting for CloudFormation stack "eksctl-k3s-test-cluster"
2021-08-12 08:36:56 [?]  waiting for CloudFormation stack "eksctl-k3s-test-cluster"
2021-08-12 08:37:56 [?]  waiting for CloudFormation stack "eksctl-k3s-test-cluster"
2021-08-12 08:41:59 [?]  building iamserviceaccount stack "eksctl-k3s-test-addon-iamserviceaccount-kube-system-aws-node"
2021-08-12 08:41:59 [?]  deploying stack "eksctl-k3s-test-addon-iamserviceaccount-kube-system-aws-node"
2021-08-12 08:41:59 [?]  waiting for CloudFormation stack "eksctl-k3s-test-addon-iamserviceaccount-kube-system-aws-node"
2021-08-12 08:42:15 [?]  waiting for CloudFormation stack "eksctl-k3s-test-addon-iamserviceaccount-kube-system-aws-node"
2021-08-12 08:42:32 [?]  waiting for CloudFormation stack "eksctl-k3s-test-addon-iamserviceaccount-kube-system-aws-node"
2021-08-12 08:42:33 [?]  serviceaccount "kube-system/aws-node" already exists
2021-08-12 08:42:33 [?]  updated serviceaccount "kube-system/aws-node"
2021-08-12 08:42:33 [?]  daemonset "kube-system/aws-node" restarted
2021-08-12 08:44:34 [?]  building managed nodegroup stack "eksctl-k3s-test-nodegroup-ng-fe1794d5"
2021-08-12 08:44:34 [?]  deploying stack "eksctl-k3s-test-nodegroup-ng-fe1794d5"
2021-08-12 08:44:34 [?]  waiting for CloudFormation stack "eksctl-k3s-test-nodegroup-ng-fe1794d5"
2021-08-12 08:44:50 [?]  waiting for CloudFormation stack "eksctl-k3s-test-nodegroup-ng-fe1794d5"
2021-08-12 08:45:07 [?]  waiting for CloudFormation stack "eksctl-k3s-test-nodegroup-ng-fe1794d5"
2021-08-12 08:45:23 [?]  waiting for CloudFormation stack "eksctl-k3s-test-nodegroup-ng-fe1794d5"
2021-08-12 08:45:40 [?]  waiting for CloudFormation stack "eksctl-k3s-test-nodegroup-ng-fe1794d5"
2021-08-12 08:45:56 [?]  waiting for CloudFormation stack "eksctl-k3s-test-nodegroup-ng-fe1794d5"
2021-08-12 08:46:13 [?]  waiting for CloudFormation stack "eksctl-k3s-test-nodegroup-ng-fe1794d5"
2021-08-12 08:46:29 [?]  waiting for CloudFormation stack "eksctl-k3s-test-nodegroup-ng-fe1794d5"
2021-08-12 08:46:47 [?]  waiting for CloudFormation stack "eksctl-k3s-test-nodegroup-ng-fe1794d5"
2021-08-12 08:47:06 [?]  waiting for CloudFormation stack "eksctl-k3s-test-nodegroup-ng-fe1794d5"
2021-08-12 08:47:24 [?]  waiting for CloudFormation stack "eksctl-k3s-test-nodegroup-ng-fe1794d5"
2021-08-12 08:47:42 [?]  waiting for CloudFormation stack "eksctl-k3s-test-nodegroup-ng-fe1794d5"
2021-08-12 08:48:00 [?]  waiting for CloudFormation stack "eksctl-k3s-test-nodegroup-ng-fe1794d5"
2021-08-12 08:48:15 [?]  waiting for CloudFormation stack "eksctl-k3s-test-nodegroup-ng-fe1794d5"
2021-08-12 08:48:15 [?]  waiting for the control plane availability...
2021-08-12 08:48:15 [?]  saved kubeconfig as "/root/.kube/config"
2021-08-12 08:48:15 [?]  no tasks
2021-08-12 08:48:15 [?]  all EKS cluster resources for "k3s-test" have been created
2021-08-12 08:48:16 [?]  nodegroup "ng-fe1794d5" has 1 node(s)
2021-08-12 08:48:16 [?]  node "ip-192-168-46-72.ap-northeast-1.compute.internal" is ready
2021-08-12 08:48:16 [?]  waiting for at least 1 node(s) to become ready in "ng-fe1794d5"
2021-08-12 08:48:16 [?]  nodegroup "ng-fe1794d5" has 1 node(s)
2021-08-12 08:48:16 [?]  node "ip-192-168-46-72.ap-northeast-1.compute.internal" is ready
2021-08-12 08:50:21 [?]  kubectl command should work with "/root/.kube/config", try 'kubectl get nodes'
2021-08-12 08:50:21 [?]  EKS cluster "k3s-test" in "ap-northeast-1" region is ready
[root@vm-1 ~]# kubectl get node
NAME                                               STATUS   ROLES    AGE   VERSION
ip-192-168-46-72.ap-northeast-1.compute.internal   Ready    <none>   30h   v1.20.4-eks-6b7464
```

# k3s serverのデプロイ
k3s serverをデプロイするKubernetesマニフェストは以下。

```yaml
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
        args:
        - server
        - --disable-agent
        - --disable-cloud-controller
        ports:
        - containerPort: 6443
```


オンプレでデプロイしたときは`--https-listen-port`でポートをデフォルトの6443から変えたけど、EKSの場合はKubernetesノードとは別のところでkube-apiserverが動いているので、変える必要が無い。

`--node-external-ip`の方は必要だけど、あとでデプロイするLoadBalancerのIPアドレスを指定するので最初は省いている。

上記マニフェストをEKSにapplyすると、k3s serverのPodが起動する。

```console
[root@vm-1 ~]# kubectl apply -f deploy.yaml
deployment.apps/k3s created
[root@vm-1 ~]# kubectl get po
NAME                   READY   STATUS    RESTARTS   AGE
k3s-6db866548b-vxc84   1/1     Running   0          5s
```

# LoadBalancerのデプロイ
デプロイしたk3s serverにオンプレからアクセスできるようにするために、以下のLoadBalancerのKubernetesマニフェストを使う。

```yaml
apiVersion: v1
kind: Service
metadata:
  name: k3s
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
spec:
  type: LoadBalancer
  selector:
    app: k3s
  ports:
    - protocol: TCP
      port: 6443
      targetPort: 6443
```

このLoadBalancerをapplyすると、AWSのNLBがデプロイされて、6443ポートへの通信をk3sポッドの6443にフォワードしてくれるようになる。
(EKSにLoadBalancerをapplyすると、デフォルトではCLBが作られるけど、なんとなくNLBにしたかったので`service.beta.kubernetes.io/aws-load-balancer-type: "nlb"`をつけている。)

```console
[root@vm-1 ~]# kubectl apply -f svc.yaml
service/k3s created
[root@vm-1 ~]# kubectl get svc k3s
NAME   TYPE           CLUSTER-IP      EXTERNAL-IP                                                                          PORT(S)          AGE
k3s    LoadBalancer   10.100.132.48   a0bcc8fbc39504085bdbe260c4878110-edabcaa6675dec5b.elb.ap-northeast-1.amazonaws.com   6443:31795/TCP   9s
```

`EXTERNAL-IP`のところに表示される`a0bcc8fbc39504085bdbe260c4878110-edabcaa6675dec5b.elb.ap-northeast-1.amazonaws.com`がNLBのDNS名。
けどそれでアクセスすると、TLS接続エラーになる。

```console
[root@vm-1 ~]# curl -k https://a0bcc8fbc39504085bdbe260c4878110-edabcaa6675dec5b.elb.ap-northeast-1.amazonaws.com:6443
curl: (35) Peer reports it experienced an internal error.
```

多分k3s serverが起動時に生成するTLSサーバ証明書のSANにNLBのDNS名が入ってないからな気がする。
(curlに`-k`付けてはいるけど。)

IPアドレスでのアクセスはなぜかできる。

```console
[root@vm-1 ~]# nslookup a0bcc8fbc39504085bdbe260c4878110-edabcaa6675dec5b.elb.ap-northeast-1.amazonaws.com
Server:         8.8.8.8
Address:        8.8.8.8#53
Non-authoritative answer:
Name:   a0bcc8fbc39504085bdbe260c4878110-edabcaa6675dec5b.elb.ap-northeast-1.amazonaws.com
Address: 52.194.178.128
Name:   a0bcc8fbc39504085bdbe260c4878110-edabcaa6675dec5b.elb.ap-northeast-1.amazonaws.com
Address: 52.68.116.248
Name:   a0bcc8fbc39504085bdbe260c4878110-edabcaa6675dec5b.elb.ap-northeast-1.amazonaws.com
Address: 35.75.204.162

[root@vm-1 ~]# curl -k https://35.75.204.162:6443
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

k3s serverに`--tls-san`というオプションがあるので、それでNLBのDNS名指定してやればDNS名でアクセスできるようになるかも。
ただ、ちゃんとやるなら、k3sが自動生成するオレオレ証明書は使わないだろうし、LoadBalancerで管理するNLBより別途デプロイしたALBで証明書管理したりアクセス制限したりしたほうがよさそう。

# ノードトークンの取得
ノードトークンはオンプレでやったときと同じようにとれるけど、その前に`--node-external-ip`にNLBのIPアドレスを指定してk3s serverのPodを再起動しておく。

```console
[root@vm-1 ~]# sed -i '/--disable-cloud-controller/a\        - --node-external-ip' deploy.yaml
[root@vm-1 ~]# sed -i '/--node-external-ip/a\        - 35.75.204.162' deploy.yaml
[root@vm-1 ~]# kubectl apply -f deploy.yaml
deployment.apps/k3s configured
```

Pod再起動後に再生成されたトークンをとる。

```console
[root@vm-1 ~]# kubectl exec -it k3s-765b64bddf-7fvwt -- /var/lib/rancher/k3s/data/57d64d4b123cea8e276484f00ab3dfa7178a00a35368aa6b43df3e3bd8ce032d/bin/cat /var/lib/rancher/k3s/server/node-token
K10507cce4a8c388e0d7ec6bf8275a27f5ccb415583840b08f13822105e88b9352c::server:b30aefea0cc931e54f0fb77265b957ef
```

# k3s agentの起動とk3s serverへの登録
k3s agentは手元のCentOS 7.9のVMで動かす。

[昨日の記事](https://www.kaitoy.xyz/2021/08/15/k3s-on-on-premises-k8s/)ではk3sをインストールスクリプトで起動したけど、今回は手動でやってみる。

```console
[root@vm-1 ~]# systemctl disable firewalld --now
[root@vm-1 ~]# setenforce 0
[root@vm-1 ~]# sed -i s/SELINUX=enforcing/SELINUX=disabled/ /etc/selinux/config
[root@vm-1 ~]# curl -L https://github.com/k3s-io/k3s/releases/download/v1.21.2%2Bk3s1/k3s -o /usr/local/bin/k3s
[root@vm-1 ~]# chmod +x /usr/local/bin/k3s
[root@vm-1 ~]# /sbin/modprobe br_netfilter
[root@vm-1 ~]# /sbin/modprobe overlay
[root@vm-1 ~]# echo br_netfilter > /etc/modules-load.d/containerd.conf
[root@vm-1 ~]# echo overlay >> /etc/modules-load.d/containerd.conf
[root@vm-1 ~]# k3s agent --token K10507cce4a8c388e0d7ec6bf8275a27f5ccb415583840b08f13822105e88b9352c::server:b30aefea0cc931e54f0fb77265b957ef -s https://35.75.204.162:6443 > k3s.log 2>&1 &
[1] 12682
```

これでしばらくするとk3s agentが起動し、自身をk3s serverに登録してくれる。

```console
[root@vm-1 ~]# kubectl exec -it k3s-765b64bddf-7fvwt -- /k3s kubectl get node
NAME             STATUS   ROLES    AGE    VERSION
k8s-node.local   Ready    <none>   116s   v1.21.2+k3s1
```

# デモ
この記事でやったことを[asciinema](https://asciinema.org)でデモにした。
デモでは最後にnginxをデプロイしてみている。

<script id="asciicast-430269" src="https://asciinema.org/a/430269.js" async></script>
