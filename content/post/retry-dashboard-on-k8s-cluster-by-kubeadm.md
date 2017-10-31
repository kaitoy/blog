+++
categories = ["Programing"]
date = "2017-10-31T16:57:04+09:00"
draft = false
eyecatch = "kubernetes.png"
slug = "retry-dashboard-on-k8s-cluster-by-kubeadm"
tags = ["kubernetes", "docker"]
title = "Kubernetes 1.8のアクセス制御について。あとDashboard。"
+++

「[Kubernetes1.8のクラスタを構築する。kubeadmで。](https://www.kaitoy.xyz/2017/10/21/build-kubernetes-cluster-by-kubeadm/)」で、Dashboardがうまく動かない問題が発生したんだけど、それを解決した話。

{{< google-adsense >}}

## 問題の現象
[kubeadm](https://kubernetes.io/docs/admin/kubeadm/)でKubernetesクラスタを組んで、自前のアプリ([Goslings](https://www.kaitoy.xyz/2016/12/11/goslings-development-memo0-intro-design/))のデプロイまではうまくできたんだけど、[Dashboard](https://github.com/kubernetes/dashboard)をデプロイしたら動かず、Web UIに`kubectl proxy`経由でつないでもタイムアウトしてしまった。

## 対策
なんとなく、クラスタ内部での名前解決には[kube-dns](https://github.com/kubernetes/kubernetes/tree/master/cluster/addons/dns)によるDNSサービスが使われているっぽいので、`/etc/hosts`に余計な事書いたのがいけなかったと思った。

ので、`/etc/hosts`からk8s-masterとk8s-nodeのエントリを削除してから、`kubeadm init`からやり直してみた。

## 結果
したらちゃんと動いた。

VMのホストで`kubectl proxy`して、

```cmd
C:\Users\kaitoy\Desktop>kubectl proxy
Starting to serve on 127.0.0.1:8001
```

`http://localhost:8001/api/v1/namespaces/kube-system/services/https:kubernetes-dashboard:/proxy/`にブラウザでつないだらサインイン画面が表示された。

![dashboard](/images/retry-dashboard-on-k8s-cluster-by-kubeadm/dashboard.png)

<br>

Dashboardのサインイン処理はKubernetes(というかkube-apiserver)のそれに移譲している。
Dashboardはそこで認証されたユーザでクラスタのリソースにアクセスし、情報を取得して表示する。多分。

Dashboardへのサインイン方法は[いくつかある](https://github.com/kubernetes/dashboard/wiki/Access-control)が、それらを理解するにはKubernetesのアクセス制御について学ぶことを推奨とあったのでちょっと[Kubernetesのドキュメント](https://kubernetes.io/docs/admin/accessing-the-api/)を読んだ。

## Kubernetesのアクセス制御
Kubernetesクラスタのエンドポイントはkube-apiserverであり、クラスタのリソースへのアクセス制御もkube-apiserverがやる。
クライアントとkube-apiserverとのTLSセッションが確立した後、HTTP層のデータを見てアクセス制御をするんだけど、その処理は[Authentication](https://kubernetes.io/docs/admin/authentication/)(認証)、[Authorization](https://kubernetes.io/docs/admin/authorization/)(認可)、[Admission](https://kubernetes.io/docs/admin/admission-controllers/)(許可)の三段階からなる。

### Authentication
第一段階がAuthentication。
ここでは、kube-apiserverに仕込まれたAuthenticatorモジュールがユーザ認証をする。

Kubernetesが認証するユーザには、Kubernetesが管理するService Accountと、クラスタ外部で管理される通常ユーザの二通りがある。
Service AccountはPodがkube-apiserverと話すためのユーザで、通常ユーザは主に人がkubectlとかでkube-apiserverと話すためのユーザ。(匿名で話すこともできる。)
前者はServiceAccountオブジェクトで定義されるけど、後者用のオブジェクトはない。

ServiceAccountはNamespaceと関連付き(つまりnamespace毎にユニーク)、Secretに紐づく。
Secretオブジェクトはクレデンシャルのセットを定義し、Podにマウントされる。
ServiceAccountとSecretは、ふつうは自動で作られ、Podに割り当てられる。

kube-apiserverには一つ以上のAuthenticatorモジュールを設定できて、どれかで認証できれば次の段階に進める。
認証失敗するとHTTPステータスコード401が返る。

Authenticatorモジュールには以下のようなものがある。

* [クライアント証明書](https://kubernetes.io/docs/admin/authentication/#x509-client-certs): X.509のディジタル証明書を使うモジュール。kube-apiserver起動時に`--client-ca-file`オプションで証明書ファイルを渡してやると有効になる。証明書のCommon Nameがユーザ名になり、Organizationがグループになる。クライアント側は、その証明書と対応する秘密鍵をクレデンシャルとして指定する。
* [Bearer Token](https://kubernetes.io/docs/admin/authentication/#putting-a-bearer-token-in-a-request): 無記名トークンを使うモジュール。kube-apiserver起動時に`--token-auth-file`オプションでトークン情報を渡してやると有効になる。トークン情報はCSVで、「`token,user,uid,"group1,group2,group3"`」という形式で書く。クライアント側は、トークン文字列をクレデンシャルとして指定する。
* [ベーシック認証](https://kubernetes.io/docs/admin/authentication/#static-password-file): ユーザ名とパスワードで認証するモジュール。kube-apiserver起動時に`--basic-auth-file`オプションでユーザ名とパスワードのリストを渡してやると有効になる。このリストはCSVで、「`password,user,uid,"group1,group2,group3"`」という形式で書く。クライアント側は、ユーザ名とパスワードをクレデンシャルとして指定する。HTTPクライアントの時はAuthorizationヘッダが使える。
* [Service Account Token](https://kubernetes.io/docs/admin/authentication/#service-account-tokens): Service Accountを署名付きBearer Tokenで認証するモジュール。デフォルトで有効になる。

このあたり、Qiitaの「[kubernetesがサポートする認証方法の全パターンを動かす](https://qiita.com/hiyosi/items/43465d4fc501c2044d01#x509-client-certs)」という記事をみると理解が深まる。

### Authorization
Authenticationをパスすると、クライアントのユーザ(とグループ)が認証され、第二段階のAuthorizationモジュールの処理に移る。
ここでは、リクエストの内容(操作対象、操作種別(メソッド)等)を見て、それがユーザに許されたものなら認可する。
何を許すかは事前にクラスタにポリシーを定義しておく。

kube-apiserver起動時に`--authorization-mode`オプションで一つ以上のAuthenticatorモジュールを指定できて、どれかで認可されれば次の段階に進める。
さもなくばHTTPステータスコード403が返る。

Authorizationモジュールには以下のようなものがある。

* [Node](https://kubernetes.io/docs/admin/authorization/node/): kubeletからのリクエストを認可する。
* [ABAC Mode](https://kubernetes.io/docs/admin/authorization/abac/): Attribute-based Access Control。リクエストに含まれる属性とPolicyオブジェクトを比較して、マッチするものがあれば認可。
* [RBAC Mode](https://kubernetes.io/docs/admin/authorization/rbac/): Role-Based Access Control。RoleオブジェクトやClusterRoleオブジェクトでロールを作成し、アクセスできるリソースや許可する操作を定義して、RoleBindingオブジェクトやClusterRoleBindingオブジェクトでユーザ名やグループと紐づける。
* [Webhook Mode](https://kubernetes.io/docs/admin/authorization/webhook/): リクエストの内容を示すSubjectAccessReviewオブジェクトをシリアライズしたJSONデータをHTTPでPOSTして、そのレスポンスによって認可可否を決める。

### Admission Control
Authorizationをパスすると、第三段階のAdmission Controlモジュールの処理に移る。
ここでは、オブジェクトの作成、削除、更新などのリクエストをインターセプトして、オブジェクトの永続化前にそのオブジェクトを確認して、永続化を許可するかを決める。
リクエストされたオブジェクトやそれに関連するオブジェクトを永続化前にいじって、デフォルト値を設定したりもできる。
読み取りリクエストの場合は実行されない。

kube-apiserver起動時に`--admission-control`オプションで複数のAdmission Controlモジュールを指定できて、全てが許可しないとリクエストが却下される。

Admission Controlモジュールは色々あるんだけど、Kubernetes 1.6以降では`--admission-control=NamespaceLifecycle,LimitRanger,ServiceAccount,PersistentVolumeLabel,DefaultStorageClass,ResourceQuota,DefaultTolerationSeconds`と指定するのが強く推奨されている。
ここで指定している[ServiceAccountモジュール](https://kubernetes.io/docs/admin/admission-controllers/#serviceaccount)は、kube-controller-managerに含まれるServiceAccountControllerとTokenControllerと協調し、Service Account周りの処理を[自動化](https://kubernetes.io/docs/admin/service-accounts-admin/#service-account-automation)してくれるもの。

ServiceAccountControllerは、各Namespaceに`default`という名前のService Accountを作る。

ServiceAccountが作成されるとTokenControllerが動き、対応したSecretとトークンを生成して紐づける。

ServiceAccountモジュールは、Podの作成や更新時に動き、以下の処理をする。

1. PodにServiceAccountが設定されていなければ、`default`を設定する。
2. Podに設定されたServiceAccountが存在していることを確認し、存在していなければリクエストを却下する。
3. PodがImagePullSecretsを含んでいなければ、ServiceAccountのImagePullSecretsをPodに追加する。
4. トークンを含んだVolumeをPodに追加する。
5. Pod内の各コンテナの`/var/run/secrets/kubernetes.io/serviceaccount`にそのVolumeをマウントさせる。

## DashboardへBearer Tokenでサインイン
Dashboardの話に戻る。
とりあえず[Bearer Tokenでのサインイン](https://github.com/kubernetes/dashboard/wiki/Access-control#bearer-token)を試す。

クラスタにはデフォルトで色んなService Accountが作られていて、異なる権限を持っている。
そのいずれかのSecretのTokenを使ってDashboardへサインインできるらしい。

以下のコマンドで`kube-system`というNamespaceのSecretを一覧できる。

```cmd
C:\Users\kaitoy>kubectl -n kube-system get secret
NAME                                     TYPE                                  DATA      AGE
attachdetach-controller-token-skzmj      kubernetes.io/service-account-token   3         18m
bootstrap-signer-token-mhqfh             kubernetes.io/service-account-token   3         18m
bootstrap-token-2964e0                   bootstrap.kubernetes.io/token         7         18m
certificate-controller-token-fvrgm       kubernetes.io/service-account-token   3         18m
cronjob-controller-token-hmrdm           kubernetes.io/service-account-token   3         18m
daemon-set-controller-token-vqz85        kubernetes.io/service-account-token   3         18m
default-token-h987g                      kubernetes.io/service-account-token   3         18m
deployment-controller-token-86bp9        kubernetes.io/service-account-token   3         18m
disruption-controller-token-6mskg        kubernetes.io/service-account-token   3         18m
endpoint-controller-token-d4wz6          kubernetes.io/service-account-token   3         18m
generic-garbage-collector-token-smfgq    kubernetes.io/service-account-token   3         18m
horizontal-pod-autoscaler-token-wsbn9    kubernetes.io/service-account-token   3         18m
job-controller-token-fttt2               kubernetes.io/service-account-token   3         18m
kube-dns-token-sn5qq                     kubernetes.io/service-account-token   3         18m
kube-proxy-token-w96xd                   kubernetes.io/service-account-token   3         18m
kubernetes-dashboard-certs               Opaque                                2         7m
kubernetes-dashboard-key-holder          Opaque                                2         6m
kubernetes-dashboard-token-gtppc         kubernetes.io/service-account-token   3         7m
namespace-controller-token-5kksd         kubernetes.io/service-account-token   3         18m
node-controller-token-chpwt              kubernetes.io/service-account-token   3         18m
persistent-volume-binder-token-d5x49     kubernetes.io/service-account-token   3         18m
pod-garbage-collector-token-l8sct        kubernetes.io/service-account-token   3         18m
replicaset-controller-token-njjwr        kubernetes.io/service-account-token   3         18m
replication-controller-token-qrr5h       kubernetes.io/service-account-token   3         18m
resourcequota-controller-token-dznjm     kubernetes.io/service-account-token   3         18m
service-account-controller-token-99nh8   kubernetes.io/service-account-token   3         18m
service-controller-token-9cw7k           kubernetes.io/service-account-token   3         18m
statefulset-controller-token-8z8w9       kubernetes.io/service-account-token   3         18m
token-cleaner-token-cxbkc                kubernetes.io/service-account-token   3         18m
ttl-controller-token-k7gh7               kubernetes.io/service-account-token   3         18m
weave-net-token-lqdgm                    kubernetes.io/service-account-token   3         17m
```

で、適当にそれっぽいSecret、`deployment-controller-token-86bp9`を選んで、`kubectl describe`したらTokenが見れた。
(Dataセクションの`token`のとこ。)

```cmd
C:\Users\kaitoy>kubectl -n kube-system describe secret deployment-controller-token-86bp9
Name:         deployment-controller-token-86bp9
Namespace:    kube-system
Labels:       <none>
Annotations:  kubernetes.io/service-account.name=deployment-controller
              kubernetes.io/service-account.uid=17fc5207-b627-11e7-9867-000c2938deae

Type:  kubernetes.io/service-account-token

Data
====
ca.crt:     1025 bytes
namespace:  11 bytes
token:      eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJrdWJlcm5ldGVzL3NlcnZpY2VhY2NvdW50Iiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9uYW1lc3BhY2UiOiJrdWJlLXN5c3RlbSIsImt1YmVybmV0ZXMuaW8vc2VydmljZWFjY291bnQvc2VjcmV0Lm5hbWUiOiJkZXBsb3ltZW50LWNvbnRyb2xsZXItdG9rZW4tODZicDkiLCJrdWJlcm5ldGVzLmlvL3NlcnZpY2VhY2NvdW50L3NlcnZpY2UtYWNjb3VudC5uYW1lIjoiZGVwbG95bWVudC1jb250cm9sbGVyIiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9zZXJ2aWNlLWFjY291bnQudWlkIjoiMTdmYzUyMDctYjYyNy0xMWU3LTk4NjctMDAwYzI5MzhkZWFlIiwic3ViIjoic3lzdGVtOnNlcnZpY2VhY2NvdW50Omt1YmUtc3lzdGVtOmRlcGxveW1lbnQtY29udHJvbGxlciJ9.ZGV9XDd-GQjAwRuLKpdsWL_dTeF0Mr_2gF117OW4BhEuLwPujnsfOuysAQ-DUtNOp1NHKGitlfxjh6fKo4tFsdwLVJWrRK6i4YH1Mm2No7Sheks7IQn1FnwSmr7yCuvjlHD2e4RpZH0wupOFoY7FHntilhOWbXTJzJzi7TozLX02EKbkVGAsvch3LZ6p8jmUH5hr8DdKc4jbmTRp86SOiFS4_-TJ3RtAHCxiioAuKzXm3-rAWdeGLLcKrM2pAFSAGaBNu8MO5BZlAi6h3Xt4x-8-1ZXs4mudtJiECvjB-XIwiwzhpq8wIPZvvQQ-f1khixOyk1RfIXRJhIE5Gqvi8g
```

サインイン画面でTokenを選択し、
この、`eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJrdWJlcm5ldGVzL3NlcnZpY2VhY2NvdW50Iiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9uYW1lc3BhY2UiOiJrdWJlLXN5c3RlbSIsImt1YmVybmV0ZXMuaW8vc2VydmljZWFjY291bnQvc2VjcmV0Lm5hbWUiOiJkZXBsb3ltZW50LWNvbnRyb2xsZXItdG9rZW4tODZicDkiLCJrdWJlcm5ldGVzLmlvL3NlcnZpY2VhY2NvdW50L3NlcnZpY2UtYWNjb3VudC5uYW1lIjoiZGVwbG95bWVudC1jb250cm9sbGVyIiwia3ViZXJuZXRlcy5pby9zZXJ2aWNlYWNjb3VudC9zZXJ2aWNlLWFjY291bnQudWlkIjoiMTdmYzUyMDctYjYyNy0xMWU3LTk4NjctMDAwYzI5MzhkZWFlIiwic3ViIjoic3lzdGVtOnNlcnZpY2VhY2NvdW50Omt1YmUtc3lzdGVtOmRlcGxveW1lbnQtY29udHJvbGxlciJ9.ZGV9XDd-GQjAwRuLKpdsWL_dTeF0Mr_2gF117OW4BhEuLwPujnsfOuysAQ-DUtNOp1NHKGitlfxjh6fKo4tFsdwLVJWrRK6i4YH1Mm2No7Sheks7IQn1FnwSmr7yCuvjlHD2e4RpZH0wupOFoY7FHntilhOWbXTJzJzi7TozLX02EKbkVGAsvch3LZ6p8jmUH5hr8DdKc4jbmTRp86SOiFS4_-TJ3RtAHCxiioAuKzXm3-rAWdeGLLcKrM2pAFSAGaBNu8MO5BZlAi6h3Xt4x-8-1ZXs4mudtJiECvjB-XIwiwzhpq8wIPZvvQQ-f1khixOyk1RfIXRJhIE5Gqvi8g`を入力したらサインインできて、GoslingsのDeploymentの情報が見れた。

![deploy](/images/retry-dashboard-on-k8s-cluster-by-kubeadm/deploy.png)

<br>

Podも見れる。

![pods](/images/retry-dashboard-on-k8s-cluster-by-kubeadm/pods.png)

<br>

けどServiceは見れない。

![service](/images/retry-dashboard-on-k8s-cluster-by-kubeadm/service.png)

<br>

各画面でオレンジ色のワーニングも出ていて、`deployment-controller`ユーザで見れる範囲はあまり広くないことが分かる。

## DashboardへAdmin権限でサインイン
DashboardのPodのService Accountである`kubernetes-dashboard`にAdmin権限を付けてやって、サインイン画面でSKIPを押すとなんでも見れるようになる。セキュリティリスクがあるので本番ではNG設定だけど。

`cluster-admin`というClusterRoleがあって、これを`kubernetes-dashboard`にバインドするClusterRoleBindingを作ってやればいい。

ので、以下のようなYAMLファイルを書いて、

```yml
apiVersion: rbac.authorization.k8s.io/v1beta1
kind: ClusterRoleBinding
metadata:
  name: kubernetes-dashboard
  labels:
    k8s-app: kubernetes-dashboard
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
- kind: ServiceAccount
  name: kubernetes-dashboard
  namespace: kube-system
```

`kubectl`で投げる。

```cmd
C:\Users\kaitoy\Desktop>kubectl create -f dashboard-admin.yml
clusterrolebinding "kubernetes-dashboard" created
```

<br>

したらServiceも見えるようになった。

![service-admin](/images/retry-dashboard-on-k8s-cluster-by-kubeadm/service-admin.png)

<br>

ついでにHWリソース情報も見れた。

![resources](/images/retry-dashboard-on-k8s-cluster-by-kubeadm/resources.png)

<br>

満足した。
