+++
categories = ["Programing"]
date = 2019-12-11
title = "Kong Ingress ControllerでKongの設定を管理する"
cover = "kong.png"
slug = "kong-ingress-controller"
tags = ["Kubernetes", "kong"]
draft = false
highlight = true
highlightStyle = "monokai"
highlightLanguages = []
+++

Kubernetesクラスタ上で動く[Kong](https://konghq.com/kong/)の設定管理に[Kong Ingress Controller](https://github.com/Kong/kubernetes-ingress-controller)を使う、というのを試してみた話。

<!--more-->

これは[Kubernetes Advent Calendar 2019](https://qiita.com/advent-calendar/2019/kubernetes)の11日目の記事。

{{< google-adsense >}}

# Kongとは
KongはKong社によるOSSのリバースプロキシ。
(Enterprise版もある。)
GitHubで2万4000以上のスターを集めている人気なOSSで、コミュニティが大きく開発も活発に行われている。

Kongは、マイクロサービスアーキテクチャにおける[API Gatewayパターン](https://microservices.io/patterns/apigateway.html)を実現するべく開発されたものと言える。
このパターンでは、ユーザからの全リクエストをひとつのマイクロサービスで受け付けることで、認証やTLS終端といった共通的な処理を集約したり、内部のマイクロサービスのAPIを隠蔽したりする。

Kongの作りとしては、[OpenResty](https://openresty.org/en/)という[nginx](https://nginx.org/en/)と[Lua言語](https://www.lua.org/)によるWebプラットフォームがベースになっていて、nginxによる高性能に加え、Luaで実装された柔軟で高度な機能と、プラグイン機構による拡張性を備えている。
ルーティングやアクセス制御など、ほとんどの設定は[PostgreSQL](https://www.postgresql.org/)か[Cassandra](http://cassandra.apache.org/)のDBに保存され、KongのREST API(Admin API)で管理できる。
(Kong 1.1.0からは宣言的な設定ファイルによるDBレスモードもサポートされている。)

このAdmin APIで管理できる主なリソースにはService、Route、Pluginがある。
ServiceはKongの裏で動いて実際にAPIを実装するバックエンドサービスを表し、主にリクエストのルーティング先を設定するために使う。
RouteはひとつのServiceに紐づくリソースで、主にそのServiceにルーティングするリクエストの条件を設定するために使う。
PluginはServiceやRouteに紐づけて、それらによってルーティングされるリクエストやそのレスポンスに様々な制御を設定するために使う。

PluginはKong社やコミュニティによって[いろいろなもの](https://docs.konghq.com/hub/)が提供されていて、[ベーシック認証](https://docs.konghq.com/hub/kong-inc/basic-auth/)、[LDAP連携](https://docs.konghq.com/hub/kong-inc/ldap-auth/)、[アクセス制御リスト](https://docs.konghq.com/hub/kong-inc/acl/)、[Prometheus連携](https://docs.konghq.com/hub/kong-inc/prometheus/)、[レスポンスの加工](https://docs.konghq.com/hub/kong-inc/response-transformer/)など、いろいろできる。
PluginもLua製なので、既存のPluginをちょっと改造ということもできるし、新しいのを作るのも割と簡単にできるようになっている。

# Kongの設定管理における課題
基本的にKongの設定は、Admin APIで投げるとそれがPostgreSQLなどのDBに保存されるというもの。
Admin APIは典型的なREST APIで、命令的で逐次的な設定手順になるので、宣言的な操作がもてはやされる昨今、ちょっと古臭く見える。
Kongをマイクロサービスのひとつとして見た時、ステートフルなPostgreSQLがくっついてくるのも運用の手間が増えそうで嫌な感じ。

![imparative.png](/images/kong-ingress-controller/imparative.png)

<br>

KongをDBレスモードで動かせばDBMSは要らないけど、初期設定を起動時に設定ファイルから読み込んで、設定を変えるときには設定ファイルを書き換えてリロードさせるという手順になるので、それはそれで使いづらい。

# IngressとIngress Controller
その課題解消に役立つKubernetesの機能が[Ingress](https://kubernetes.io/docs/concepts/services-networking/ingress/)と[Ingress Controller](https://kubernetes.io/docs/concepts/services-networking/ingress-controllers/)というもの。

IngressはL7のロードバランサとか、HTTP(S)のアクセスポイントを公開する仕組みとか、ふんわりした表現で説明されることが多いけど、端的に言ってしまえば、リバースプロキシの設定を表現するKubernetesリソースだ。
`kind: Ingress`なAPIがKubernetesにビルトインされていて、そのマニフェストには汎用的なリバースプロキシの設定を書けて、それをKubernetesに登録できるようになっている。
ただ、Kubernetes自体はリバースプロキシの機能を備えているわけではないので、Ingressリソースを登録してもそれだけでは何もおこらない。
Ingressリソースを活用するにはIngress Controllerが必要になる。

Ingress Controllerは、Ingressリソースの作成や変更を監視するコントローラサービスと、そのリソース定義に従って動くリバースプロキシを組み合わせたもの。
このリバースプロキシのアクセスポートは、NodePortタイプかLoadBalancerタイプのServiceによってKubernetesクラスタの外部に公開して、ユーザからアクセスできるようにする。
Ingress Controllerをデプロイし、Ingressリソースを登録することで、ユーザからのリクエストをリバースプロキシで受けて捌くことができるようになる。

因みにLoadBalancer Serviceは、Kubernetesクラスタ外部のロードバランサとNodePortなServiceを制御して、ユーザからロードバランサへのリクエストをNodePort Service経由でいい感じにPodにルーティングしてくれるもの。
つまり、外部のロードバランサとそれを制御する何らかのコントローラがなければ使えないServiceで、普通はGKEとかのマネージドKubernetes環境でしか使わない。
([MetalLB](https://metallb.universe.tf/)とか使えばオンプレでも使えるけど。)

# Kong Ingress Controller
Ingress Controllerには、リバースプロキシの実装ごとに[さまざまな実装がある](https://kubernetes.io/docs/concepts/services-networking/ingress-controllers/#additional-controllers)。
そのひとつがKong Ingress Controller。
Kong Ingress Controllerはリバースプロキシとして(当然ながら)Kongを使うもので、そのコントローラサービスはIngressリソースの定義を読んで、その通りの設定になるようにKongのAdmin APIを呼ぶ。

Ingressリソースはリバースプロキシの汎用的な定義なので、高機能なKongの設定を表現するには全然足りない。
なので、Kong Ingress Controllerは足りない分を[Custom Resources](https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/custom-resources/)で補っている。
Custom Resourceは簡単に言えばKubernetesのAPIの拡張。
Kong Ingress ControllerはKongIngress、KongPluginなどのCustom Resource(詳細は後述)を提供し、Kongの細かい設定を表現できるようにしている。

![declarative.png](/images/kong-ingress-controller/declarative.png)

<br>

Kong Ingress Controllerを使えば、Kongの設定をKubernetesのAPIで宣言的にできるようになるので、前述した課題が解消できる。

# Kong Ingress Controllerが扱うKubernetesリソース
Kong Ingress Controllerが扱うIngressリソースやCustom Resourceについてまとめる。

* Ingress

    Kubernetesのビルトインリソース。
    ルーティングするリクエストの条件と、ルーティング先の(Kubernetesの)Serviceなどを定義する。
    この定義からKong Ingress ControllerがKongのRouteとServiceを設定する。

* KongIngress

    Kong Ingress ControllerのCustom Resource。
    Ingressと組み合わせて使い、Ingressだけでは表現できないRoute設定を記述する。
    Ingressのannotationに`configuration.konghq.com`というキーでKongIngressの名前を指定することで紐づけられる。

* KongPlugin

    Kong Ingress ControllerのCustom Resource。
    KongのPlugin設定を定義するためのもの。
    IngressかServiceのannotationに`plugins.konghq.com`というキーでKongPluginの名前を指定することで紐づけられる。
    `global: "true"`というラベルを付けたKongPluginを作れば、そのPluginは全リクエストに適用される。

<br>

他にKongConsumerとKongCredentialという認証情報を扱うCustom Resourceがある。
けど今回使わないので詳細は省略する。

# Kong Ingress Controllerの公式マニフェストを読む
[Kong Ingress Controller 0.6.2の公式のマニフェスト](https://github.com/Kong/kubernetes-ingress-controller/blob/0.6.2/deploy/single/all-in-one-dbless.yaml)には以下のリソースが定義されている。

* Namespace

    `kong`という名前の名前空間。以下のすべてのリソースが属する。

* CustomResourceDefinition (4つ)

    KongIngress、KongPluginなどのCustom Resourceの定義。

* ClusterRole

    Node、Pod、Ingress、Serviceなどのリソースや、上記Custom Resourceの参照権限等を与えるロール。

* ServiceAccount

    コントローラサービスに上記ClusterRoleを紐づけるためのアカウント名。

* ClusterRoleBinding

    コントローラサービスと上記ClusterRoleを紐づける定義。

* ConfigMap

    Kong(のnginx)にメトリクス取得やヘルスチェックのAPIを追加する定義ファイル。

* Service (kong-proxy)

    Kongのアクセスポートを外部公開するためのLoadBalancerタイプのService。

* Service (kong-validation-webhook)

    上記Custom Resourceの登録や変更時にバリデーションをできるようにするために、コントローラサービスのポートをクラスタ内部(のkube-apiserver)に公開するClusterIPタイプのService。

* Deployment

    Kongとコントローラサービスを起動する定義。
    KongはDBレスモードで動かすようになっている。

なんだかたくさんのリソースがあるけど、ひとつひとつ見ていくとそれほど難しくない。

# Kong Ingress Controllerのデプロイ
いざデプロイ。

デプロイ先のKubernetesクラスタは[最近CentOS 8でつくったやつ](https://www.kaitoy.xyz/2019/12/05/k8s-on-centos8-with-containerd/)で、Kubernetesのバージョンは1.16.0。
Kong Ingress Controllerは最新版の0.6.2。

Kong Ingress Controller公式のマニフェストは、`kong-proxy`というServiceがLoadBalancerタイプで使いにくいので、今回はNodePortに変える。
また、DeploymentのapiVersionが`extensions/v1beta1`になっていて古く、Kubernetes 1.16にデプロイできないので、`apps/v1`に直す。
修正差分は↓こんな感じ。

```diff
@@ -448,17 +448,18 @@
   ports:
   - name: proxy
     port: 80
     protocol: TCP
     targetPort: 8000
+    nodePort: 30080
   - name: proxy-ssl
     port: 443
     protocol: TCP
     targetPort: 8443
   selector:
     app: ingress-kong
-  type: LoadBalancer
+  type: NodePort
 ---
 apiVersion: v1
 kind: Service
 metadata:
   name: kong-validation-webhook
@@ -470,11 +471,11 @@
     protocol: TCP
     targetPort: 8080
   selector:
     app: ingress-kong
 ---
-apiVersion: extensions/v1beta1
+apiVersion: apps/v1
 kind: Deployment
 metadata:
   labels:
     app: ingress-kong
   name: ingress-kong
```

Kongのアクセスポートを外部公開するNodePortのポート番号は`30080`にしてある。

修正したマニフェストを`kubectl apply`したら普通に起動した。

```console
$ kubectl get po -n kong
NAME                            READY   STATUS    RESTARTS   AGE
ingress-kong-65fffbc76b-gvqmf   2/2     Running   2          10m
```

Kongコンテナが立ち上がらないとコントローラサービスが起動中に落ちるので、最初数回CrashLoopBackOffするのがちょっとダサい。

Kongのアクセスポート(i.e. NodePort)に向かってGETリクエストを送ると、まだKongに何のルーティング設定もないので`no Route matched with those values`というメッセージが返ってくる。
(KubernetesノードのIPアドレスは`192.168.1.200`)

```console
$ NODE_IP=192.168.1.200
$ curl http://${NODE_IP}:30080/
{"message":"no Route matched with those values"}
```

ともあれ、Kongが動いていることは確認できた。

# Ingressを試す
Ingressを登録して、Kongの設定を作ってみる。

まず、Kongのルーティング先のバックエンドサービスとして、リクエストの内容を返してくるだけのechoサービスをデプロイするため、以下のマニフェストを`kubectl apply`する。

```yaml
apiVersion: v1
kind: Service
metadata:
  name: echo
spec:
  selector:
    app: echo
  ports:
  - port: 8080
    protocol: TCP
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: echo
spec:
  replicas: 1
  selector:
    matchLabels:
      app: echo
  template:
    metadata:
      labels:
        app: echo
    spec:
      containers:
      - image: gcr.io/kubernetes-e2e-test-images/echoserver:2.2
        name: echo
        ports:
        - containerPort: 8080
```

確認。

```console
$ kubectl get po
NAME                    READY   STATUS    RESTARTS   AGE
echo-588b79f67f-xxn56   1/1     Running   0          14h
```

動いた。
このPodは`echo`というService(以下echoサービス)に紐づいていて、そのServiceのポートは8080に設定されている。
試しにそのServiceにGETリクエストを投げてみる。

```console
$ curl http://$(kubectl get svc echo -o jsonpath='{.spec.clusterIP}'):8080


Hostname: echo-588b79f67f-xxn56

Pod Information:
        -no pod information available-

Server values:
        server_version=nginx: 1.12.2 - lua: 10010

Request Information:
        client_address=10.32.0.1
        method=GET
        real path=/
        query=
        request_version=1.1
        request_scheme=http
        request_uri=http://10.0.185.110:8080/

Request Headers:
        accept=*/*
        host=10.0.185.110:8080
        user-agent=curl/7.61.1

Request Body:
        -no body in request-
```

ちゃんとレスポンス返ってきた。

<br>

このechoサービスへルーティングするIngressを作るため、以下のマニフェストを`kubectl apply`する。
`/echo`にアクセスするとechoサービスの`8080`ポートに送るという内容。

```yaml
apiVersion: extensions/v1beta1
kind: Ingress
metadata:
  name: echo
spec:
  rules:
  - http:
      paths:
      - path: /echo
        backend:
          serviceName: echo
          servicePort: 8080
```

これでKongにechoサービスを表すServiceとそこへのRouteが設定されたはず。
Kongコンテナの`8444`ポートでAdmin APIが公開されていて、そこにアクセスするとKongの設定が見れるので見てみる。

```console
$ kubectl exec -it -n kong ingress-kong-65fffbc76b-gvqmf -c proxy -- curl -k https://localhost:8444/routes | jq
{
  "next": null,
  "data": [
    {
      "strip_path": true,
      "tags": null,
      "updated_at": 1575845092,
      "destinations": null,
      "headers": null,
      "protocols": [
        "http",
        "https"
      ],
      "created_at": 1575845092,
      "snis": null,
      "service": {
        "id": "dac20c80-66d8-59e2-8f57-66e046e18d45"
      },
      "name": "default.echo.00",
      "preserve_host": true,
      "regex_priority": 0,
      "id": "e97bc643-59d4-53c1-83e2-87169eaa28d5",
      "sources": null,
      "paths": [
        "/echo"
      ],
      "https_redirect_status_code": 426,
      "methods": null,
      "hosts": null
    }
  ]
}
$ kubectl exec -it -n kong ingress-kong-65fffbc76b-gvqmf -c proxy -- curl -k https://localhost:8444/services | jq
{
  "next": null,
  "data": [
    {
      "host": "echo.default.svc",
      "created_at": 1575845092,
      "connect_timeout": 60000,
      "id": "dac20c80-66d8-59e2-8f57-66e046e18d45",
      "protocol": "http",
      "name": "default.echo.8080",
      "read_timeout": 60000,
      "port": 80,
      "path": "/",
      "updated_at": 1575845092,
      "client_certificate": null,
      "tags": null,
      "write_timeout": 60000,
      "retries": 5
    }
  ]
}
```

できてた。

KongのNodePortの`/echo`にアクセスしてみる。

```console
$ NODE_IP=192.168.1.200
$ curl http://${NODE_IP}:30080/echo


Hostname: echo-588b79f67f-xxn56

Pod Information:
        -no pod information available-

Server values:
        server_version=nginx: 1.12.2 - lua: 10010

Request Information:
        client_address=10.32.0.5
        method=GET
        real path=/
        query=
        request_version=1.1
        request_scheme=http
        request_uri=http://192.168.1.200:8080/

Request Headers:
        accept=*/*
        connection=keep-alive
        host=192.168.1.200:30080
        user-agent=curl/7.61.1
        x-forwarded-for=10.32.0.1
        x-forwarded-host=192.168.1.200
        x-forwarded-port=8000
        x-forwarded-proto=http
        x-real-ip=10.32.0.1

Request Body:
        -no body in request-
```

Kong経由でechoサービスにアクセスできた模様。
`Request Headers`にKongが追加したであろう`x-forwarded-for`とかがあるのがわかる。

`Request Information`を見ると、`real path`が`/`になっている。
これは、KongのRouteの`strip_path`設定がデフォルトでtrueなので、`curl`で送ったURLパスの`/echo`をKongが切り捨てるため。
この設定はIngressでは変えられないので、そういうのを変えたい場合にはKongIngressが必要になる。

# KongIngressを試す
前節で作ったRouteの`strip_path`をfalseにすべく、KongIngressを作ってみる。
まず以下のKongIngressのマニフェストを`kubectl apply`する。

```yaml
apiVersion: configuration.konghq.com/v1
kind: KongIngress
metadata:
  name: keep-path
route:
  strip_path: false
```

で、このKongIngressを前節で作ったIngressに紐づけるため、次のコマンドで`configuration.konghq.com`というannotationをIngressに追加する。

```console
$ kubectl patch ingress echo -p '{"metadata":{"annotations":{"configuration.konghq.com":"keep-path"}}}'
```

これでKongのRoute設定の`strip_path`が変わったはず。
見てみる。

```console
$ kubectl exec -it -n kong ingress-kong-65fffbc76b-gvqmf -c proxy -- curl -k https://localhost:8444/routes | jq '.data[].strip_path'
false
```

ちゃんとfalseになっている。
KongのNodePortの`/echo`にアクセスしてみる。

```console
$ NODE_IP=192.168.1.200
$ curl -s http://${NODE_IP}:30080/echo | grep 'real path'
        real path=/echo
```

送ったURLパスが切り捨てられず、`real path`が`/echo`になるようになった。

# KongPluginを試す
最後にKongPluginで[Correlation IDプラグイン](https://docs.konghq.com/hub/kong-inc/correlation-id/)を有効にしてみる。
これは、適用されたリクエストのHTTPヘッダに、リクエスト毎にユニークなUUIDを付けるプラグイン。
プラグインを有効にする対象としてServiceやRouteなどを指定することができるが、今回は全リクエストに適用するglobalにする。

以下のマニフェストを`kubectl apply`する。

```yaml
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: correlation-id
  labels:
    global: "true"
config:
  header_name: Global-Request-ID
plugin: correlation-id
```

`labels`に`global: "true"`を設定するのがポイント。

これでKongにPlugin設定が作られるはず。
KongのAdmin APIでPluginを取得して確認してみる。

```console
$ kubectl exec -it -n kong ingress-kong-65fffbc76b-gvqmf -c proxy -- curl -k https://localhost:8444/plugins | jq
{
  "next": null,
  "data": [
    {
      "created_at": 1575852780,
      "config": {
        "echo_downstream": false,
        "header_name": "Global-Request-ID",
        "generator": "uuid#counter"
      },
      "id": "65d138a5-b9b3-5559-84d6-c459f3cc456a",
      "service": null,
      "enabled": true,
      "tags": null,
      "consumer": null,
      "run_on": "first",
      "name": "correlation-id",
      "route": null,
      "protocols": [
        "grpc",
        "grpcs",
        "http",
        "https"
      ]
    }
  ]
}
```

できてた。
実際にリクエストを送ってみる。

```console
$ NODE_IP=192.168.1.200
$ curl -s http://${NODE_IP}:30080/echo


Hostname: echo-588b79f67f-xxn56

Pod Information:
        -no pod information available-

Server values:
        server_version=nginx: 1.12.2 - lua: 10010

Request Information:
        client_address=10.32.0.5
        method=GET
        real path=/echo
        query=
        request_version=1.1
        request_scheme=http
        request_uri=http://192.168.1.200:8080/echo

Request Headers:
        accept=*/*
        connection=keep-alive
        global-request-id=caad53f7-2e95-483d-8515-79a45b6a52d3#2
        host=192.168.1.200:30080
        user-agent=curl/7.61.1
        x-forwarded-for=10.32.0.1
        x-forwarded-host=192.168.1.200
        x-forwarded-port=8000
        x-forwarded-proto=http
        x-real-ip=10.32.0.1

Request Body:
        -no body in request-
```

`Request Headers`に`global-request-id`としてUUIDが挿入されるようになった。

# まとめ
KubernetesクラスタにKong Ingress Controllerをデプロイし、Ingress、KongIngress、KongPluginによりKongの設定ができることを確認した。

Kong Ingress Controllerを使えば、Kongの設定をKubernetesのAPIで宣言的に管理できるようになり、いろいろ捗りそう。
