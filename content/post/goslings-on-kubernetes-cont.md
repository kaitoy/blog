+++
categories = [ "Programing" ]
date = "2017-10-11T23:48:40+09:00"
draft = false
cover = "kubernetes_goslings.png"
slug = "goslings-on-kubernetes-cont"
tags = [ "goslings", "kubernetes", "minikube", "docker" ]
title = "Kubernetesのチュートリアルをやる"
highlightLanguages = ["dos", "yaml"]
+++

「[Kubernetes 1.8が出たので、Minikubeを触ってみる](https://www.kaitoy.xyz/2017/10/10/goslings-on-kubernetes/)」の続き。
Minikubeのセットアップまではできたので、[Kubernetes Basics](https://kubernetes.io/docs/tutorials/kubernetes-basics/)というチュートリアルをやりながら、[Goslings](https://kaitoy.github.io/goslings/)をデプロイする。

{{< google-adsense >}}

# Kubernetes Basics - 概要
Kubernetes Basicsは、公式のチュートリアルで、Kubernetesクラスタのオーケストレーションの基本を学ぶことができるもの。
以下の6つのモジュールからなる。

1. Kubernetesクラスタを作る
2. アプリをデプロイする
3. アプリを調査する
4. アプリを公開する
5. アプリをスケールする
6. アプリをアップデートする

チュートリアルで使うのは[Minikube](https://github.com/kubernetes/minikube)だけど、自分でセットアップする必要はない。
[Katacoda](https://www.katacoda.com/)という、ブラウザ上でIT技術を学べるプラットフォームがあり、Kubernetes Basicsはそれを利用して、ブラウザ上のターミナルからホステッドMinikubeを操作できるようにしている。

が、[前回の記事](https://www.kaitoy.xyz/2017/10/10/goslings-on-kubernetes/)で自PC上にMinikubeをセットアップしたので、そちらを使うことにする。

<br>

# Kubernetes Basics - モジュール 1: Kubernetesクラスタを作る
Minikubeを起動してkubectlでクラスタの状態をみるだけのモジュール。

これは[前回の記事](https://www.kaitoy.xyz/2017/10/10/goslings-on-kubernetes/)でカバーしている。

# Kubernetes Basics - モジュール 2: アプリをデプロイする
アプリ(i.e. コンテナ)をデプロイするにはDeploymentオブジェクトを作る。
MasterはDeploymentのspecに従って各ノードにアプリのインスタンスをスケジューリングする。
Deploymentは、アプリが落ちたら再起動してくれる、つまりself-healingも実現する。

Deploymentオブジェクトを作るコマンドは`kubectl run <オブジェクト名> --image=<Dockerイメージ名>`。
Goslingsをこれでデプロイする。

Goslingsコンテナは3つの引数を受け取り、指定したポートでWebサーバを起動する。
`--port`オプションでそのポートをexposeするようにして、`--`の後にコンテナに渡す引数を記述する。

```cmd
C:\Users\kaitoy>kubectl run goslings --image=kaitoy/goslings:latest --port 8080 -- 8080 /tmp https://github.com/kaitoy/
deployment "goslings" created

C:\Users\kaitoy>kubectl get deployment
NAME       DESIRED   CURRENT   UP-TO-DATE   AVAILABLE   AGE
goslings   1         1         1            1           27s
```

デプロイできた。
裏でPodも作られていて、アプリが起動されている。

```cmd
C:\Users\kaitoy>kubectl get pods
NAME                        READY     STATUS              RESTARTS   AGE
goslings-1210510689-6w5tf   0/1       ContainerCreating   0          1m
```

(`kubectl get`に指定するのは、省略形の`deploy`とか`po`でもいい。)

<br>

Podは隔離されたネットワークで動くので、そのままではPod同士は通信できるけど、外からはアクセスできない。
kubectlでプロキシを作ってやることで、外からアクセスできるようになる。

```cmd
C:\Users\kaitoy>kubectl proxy
Starting to serve on 127.0.0.1:8001
```

これで、kube-apiserverへのプロキシがローカルホストで起動した。
この状態で`http://localhost:8001`を開くと、kube-apiserverのAPI一覧が見れる。
例えば、`http://localhost:8001/version`にアクセスすると、以下のJSONデータが返ってくる。

```json
{
  "major": "1",
  "minor": "7",
  "gitVersion": "v1.7.0",
  "gitCommit": "d3ada0119e776222f11ec7945e6d860061339aad",
  "gitTreeState": "dirty",
  "buildDate": "2017-10-04T09:25:40Z",
  "goVersion": "go1.8.3",
  "compiler": "gc",
  "platform": "linux/amd64"
}
```

<br>

各Podへも以下のURLでアクセスできる。

```
http://localhost:8001/api/v1/proxy/namespaces/default/pods/<Pod名>/
```

Pod名の部分は`kubectl get`で確認できる。

```cmd
C:\Users\kaitoy>kubectl get po
NAME                        READY     STATUS    RESTARTS   AGE
goslings-1210510689-6w5tf   1/1       Running   0          24m
```

実際に、`http://localhost:8001/api/v1/proxy/namespaces/default/pods/goslings-1210510689-6w5tf/`をブラウザで開いたら、GoslingsのGUIが出た。
ヒュー。

![goslings-proxy](/images/goslings-on-kubernetes-cont/goslings-proxy.png)

# Kubernetes Basics - モジュール 3: アプリを調査する
以下のコマンドで、アプリの状態を調査するモジュール。

* kubectl get: リソースをリスト表示する。
* kubectl describe: リソースの詳細情報を表示する。
* kubectl logs: コンテナのログを表示する。`docker logs`的な。
* kubectl exec: コンテナ内でコマンドを実行する。`docker exec`的な。

<br>

`kubectl get`はさんざんやったので飛ばして、`kubectl describe`してみる。

```cmd
C:\Users\kaitoy>kubectl describe po
Name:           goslings-1210510689-6w5tf
Namespace:      default
Node:           minikube/192.168.99.100
Start Time:     Tue, 10 Oct 2017 21:51:48 +0900
Labels:         pod-template-hash=1210510689
                run=goslings
Annotations:    kubernetes.io/created-by={"kind":"SerializedReference","apiVersion":"v1","reference":{"kind":"ReplicaSet","namespace":"default","name":"goslings-1210510689","uid":"c74b6518-adb9-11e7-88a0-08002798178d...
Status:         Running
IP:             172.17.0.2
Created By:     ReplicaSet/goslings-1210510689
Controlled By:  ReplicaSet/goslings-1210510689
Containers:
  goslings:
    Container ID:       docker://ce90460886c9555f7748bf59e8d9892f05c05020e7841154ee85713d6d9b0c2d
    Image:              kaitoy/goslings:latest
    Image ID:           docker-pullable://kaitoy/goslings@sha256:a587e3c5f202cdaa6d4d5a9c4f6a01ba6f4782e00277c3a18c77dd034daa0109
    Port:               8080/TCP
    Args:
      8080
      C:/Users/kaitoy/AppData/Local/Temp
    State:              Running
      Started:          Tue, 10 Oct 2017 21:55:54 +0900
    Ready:              True
    Restart Count:      0
    Environment:        <none>
    Mounts:
      /var/run/secrets/kubernetes.io/serviceaccount from default-token-cqq59 (ro)
Conditions:
  Type          Status
  Initialized   True
  Ready         True
  PodScheduled  True
Volumes:
  default-token-cqq59:
    Type:       Secret (a volume populated by a Secret)
    SecretName: default-token-cqq59
    Optional:   false
QoS Class:      BestEffort
Node-Selectors: <none>
Tolerations:    <none>
Events:
  FirstSeen     LastSeen        Count   From                    SubObjectPath                   Type            Reason
                Message
  ---------     --------        -----   ----                    -------------                   --------        ------
                -------
  45m           45m             1       default-scheduler                                       Normal          Scheduled               Successfully assigned goslings-1210510689-6w5tf to minikube
  45m           45m             1       kubelet, minikube                                       Normal          SuccessfulMountVolume   MountVolume.SetUp succeeded for volume "default-token-cqq59"
  45m           45m             1       kubelet, minikube       spec.containers{goslings}       Normal          Pulling
                pulling image "kaitoy/goslings:latest"
  41m           41m             1       kubelet, minikube       spec.containers{goslings}       Normal          Pulled
                Successfully pulled image "kaitoy/goslings:latest"
  41m           41m             1       kubelet, minikube       spec.containers{goslings}       Normal          Created
                Created container
  41m           41m             1       kubelet, minikube       spec.containers{goslings}       Normal          Started
                Started container
```

Podの詳細な情報が出た。
EventsのとこにKubernetesの頑張りが見えて面白い。

<br>

次は`kubectl logs`。

```cmd
C:\Users\kaitoy>kubectl logs goslings-1210510689-6w5tf

  .   ____          _            __ _ _
 /\\ / ___'_ __ _ _(_)_ __  __ _ \ \ \ \
( ( )\___ | '_ | '_| | '_ \/ _` | \ \ \ \
 \\/  ___)| |_)| | | | | || (_| |  ) ) ) )
  '  |____| .__|_| |_|_| |_\__, | / / / /
 =========|_|==============|___/=/_/_/_/
 :: Spring Boot ::        (v1.4.3.RELEASE)

2017-10-10 12:56:02.498  INFO 6 --- [           main] c.g.kaitoy.goslings.server.Application   : Starting Application on goslings-1210510689-6w5tf with PID 6 (/usr/local/src/goslings/goslings-server/build/libs/goslings-server-0.0.1.jar started by root in /usr/local/src/goslings)
(snip)
```

Goslingsは[Spring Boot](https://projects.spring.io/spring-boot/)でできてるので、そのログが出てる。

<br>

次は`kubectl exec`を試す。

```cmd
C:\Users\kaitoy>kubectl exec goslings-1210510689-6w5tf env
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
HOSTNAME=goslings-1210510689-6w5tf
KUBERNETES_PORT_443_TCP=tcp://10.0.0.1:443
KUBERNETES_PORT_443_TCP_PROTO=tcp
KUBERNETES_PORT_443_TCP_PORT=443
KUBERNETES_PORT_443_TCP_ADDR=10.0.0.1
KUBERNETES_SERVICE_HOST=10.0.0.1
KUBERNETES_SERVICE_PORT=443
KUBERNETES_SERVICE_PORT_HTTPS=443
KUBERNETES_PORT=tcp://10.0.0.1:443
LANG=C.UTF-8
JAVA_HOME=/usr/lib/jvm/java-8-openjdk-amd64
JAVA_VERSION=8u111
JAVA_DEBIAN_VERSION=8u111-b14-2~bpo8+1
CA_CERTIFICATES_JAVA_VERSION=20140324
HOME=/root
```

`env`コマンドを実行し、コンテナ内の環境変数一覧を出せた。
Kubernetes関係の変数が定義されていることが分かる。

`docker exec`と同様に、`-it`オプションを付ければ、コンテナ内に「入る」こともできる。

```cmd
C:\Users\kaitoy>kubectl exec -it goslings-1210510689-6w5tf sh
# ls
Dockerfile  _config.yml  build.log     goslings-server  gradle.properties  gradlew.bat
# exit

C:\Users\kaitoy>
```

# Kubernetes Basics - モジュール 4: アプリを公開する
Serviceオブジェクト扱うモジュール。

例えば、以下のような状況にあるとする。

* PodがあるNodeで動いていたんだけど、そのNodeが死んだので、Kubernetesが別のNodeにPodを起動しなおしてくれた。
* 同じコンテナイメージを3つのPodで動かして、負荷分散させたい。

こういう場合、KubernetesはPod毎に固有のIPアドレスを割り当てるので、Podにアクセスするユーザはアクセス先が不安定でめんどいことになる。
この問題を解決してくれるのがServiceで、こいつは、Podを抽象化して、安定したIPアドレスを公開してくれる。
しかもそれはクラスタ外からアクセスできる。

PodとServiceの紐づけには、[ラベルとセレクタ](https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/)というものが使われる。

<br>

Serviceの情報はDeploymentとかと同様に`kubectl get`で見れる。

```cmd
C:\Users\kaitoy>kubectl get svc
NAME         CLUSTER-IP   EXTERNAL-IP   PORT(S)   AGE
kubernetes   10.0.0.1     <none>        443/TCP   1d
```

ここで出ているkubernetesというのは、Minikubeがデフォルトで作るService。

<br>

Serviceオブジェクトは、`kubectl expose`で作ることができる。

`goslings`という名のDeploymentに対し、NodePortのServiceを作り、コンテナの8080ポートを公開するコマンドは以下のようになる。

```cmd
C:\Users\kaitoy>kubectl expose deploy/goslings --type=NodePort --port 8080
service "goslings" exposed

C:\Users\kaitoy>kubectl get services
NAME         CLUSTER-IP   EXTERNAL-IP   PORT(S)          AGE
goslings     10.0.0.69    <nodes>       8080:32406/TCP   11s
kubernetes   10.0.0.1     <none>        443/TCP          1d

C:\Users\kaitoy>kubectl describe services/goslings
Name:                   goslings
Namespace:              default
Labels:                 run=goslings
Annotations:            <none>
Selector:               run=goslings
Type:                   NodePort
IP:                     10.0.0.69
Port:                   <unset> 8080/TCP
NodePort:               <unset> 32406/TCP
Endpoints:              172.17.0.2:8080
Session Affinity:       None
Events:                 <none>
```

goslingsという名前のServiceができた。
上記`kubectl describe`の出力のNodePortのとこに書いてあるのが外部にさらされたポート。

`minikube ip`を実行すると、

```cmd
C:\Users\kaitoy>minikube ip
192.168.99.100
```

MinikubeのVMのIPアドレスも分かるので、NodePortのポートと合わせて、`http://192.168.99.100:32406`にブラウザでアクセスしたら、GoslingsのGUI見れた。
ヒュー。

![goslings-service](/images/goslings-on-kubernetes-cont/goslings-service.png)

<br>

ところで、上記`kubectl describe`の出力を見ると、特に指定はしなかったが、Podに`run=goslings`というLabelが付いていることが分かる。
Serviceのdescribeを見ると、

```cmd
C:\Users\kaitoy>kubectl describe svc goslings
Name:                   goslings
Namespace:              default
Labels:                 run=goslings
Annotations:            <none>
Selector:               run=goslings
Type:                   NodePort
IP:                     10.0.0.69
Port:                   <unset> 8080/TCP
NodePort:               <unset> 32406/TCP
Endpoints:              172.17.0.2:8080
Session Affinity:       None
Events:                 <none>
```

`run=goslings`というSelectorがServiceに紐づいている。
つまり、ServiceとPodが、`run=goslings`で紐づいているというわけだ。

<br>

Labelはクエリ時のフィルタとかにも使える。

```cmd
C:\Users\kaitoy>kubectl get po -l run=goslings
NAME                        READY     STATUS    RESTARTS   AGE
goslings-1210510689-6w5tf   1/1       Running   0          1h
```

後からラベル付けることもできる。

```cmd
C:\Users\kaitoy>kubectl label pod goslings-1210510689-6w5tf ver=1.2.3
pod "goslings-1210510689-6w5tf" labeled
```

# Kubernetes Basics - モジュール 5: アプリをスケールする
アプリのスケールアウト・スケールインを学ぶモジュール。

Deploymentの定義でPodのレプリカ数を変えると、その数に合わせてKubernetesがPodを起動したり止めたりしてくれてスケールできる仕組み。
レプリカを作っておくとローリングアップデートできるのも利点。
[オートスケール機能](http://kubernetes.io/docs/user-guide/horizontal-pod-autoscaling/)もあるけど、それはチュートリアルでは扱われない。

複数のPodで負荷分散するということなので、Serviceでロードバランシングするのが前提。

<br>

現在のDeploymentの状態をみる。

```cmd
C:\Users\kaitoy>kubectl get deploy
NAME       DESIRED   CURRENT   UP-TO-DATE   AVAILABLE   AGE
goslings   1         1         1            1           1h
```

Podのレプリカ数は、期待してる(DESIRED)のが1で、今(CURRENT)も1。

スケールアウトするには、`kubectl scale`コマンドでレプリカ数を増やしてやる。

```cmd
C:\Users\kaitoy>kubectl scale deploy/goslings --replicas=3
deployment "goslings" scaled

C:\Users\kaitoy>kubectl get deploy
NAME       DESIRED   CURRENT   UP-TO-DATE   AVAILABLE   AGE
goslings   3         3         3            3           1h

C:\Users\kaitoy>kubectl get po -o wide
NAME                       READY     STATUS    RESTARTS   AGE       IP           NODE
goslings-442066424-jn1lw   1/1       Running   0          1h        172.17.0.2   minikube
goslings-442066424-rdw4k   1/1       Running   0          1m        172.17.0.3   minikube
goslings-442066424-rwwjw   1/1       Running   0          1m        172.17.0.4   minikube
```

レプリカが3個になった。

スケールインするには、`kubectl scale`コマンドでレプリカ数を減らす。

```cmd
C:\Users\kaitoy>kubectl scale deploy/goslings --replicas=2
deployment "goslings" scaled

C:\Users\kaitoy>kubectl get po
NAME                       READY     STATUS        RESTARTS   AGE
goslings-442066424-0mv4x   1/1       Terminating   0          1m
goslings-442066424-34h1f   1/1       Running       0          1m
goslings-442066424-kmn3p   1/1       Running       0          17m

C:\Users\kaitoy>kubectl get po
NAME                       READY     STATUS    RESTARTS   AGE
goslings-442066424-34h1f   1/1       Running   0          1m
goslings-442066424-kmn3p   1/1       Running   0          17m
```

`kubectl scale`直後の`kubectl get po`では、一つのPodを停止している最中の様子が見えていて、再度の`kubectl get po`ではレプリカが2個になったのが確認できた。

この状態がKubernetes Basicsで作るクラスタの最終形で、図にすると以下の感じ。

![objects](/images/goslings-on-kubernetes-cont/objects.png)

# Kubernetes Basics - モジュール 6: アプリをアップデートする
デプロイしたアプリのアップデート(i.e. コンテナイメージの変更)を学ぶモジュール。

Deploymentの定義をいじってコンテナイメージを変えてやると、その中のPodを新しいイメージで順次(デフォルトだと一つ一つ)起動しなおしてくれる。

アプリのアップデートはバージョン管理もされて、ロールバックもできる。

<br>

コンテナイメージを変更するには、`kubectl set image`コマンドを使う。
`goslings`という名のDeployment内の、`goslings`という名のContainerのイメージを`kaitoy/goslings:hoge`に変更するコマンドは以下。

```cmd
C:\Users\kaitoy>kubectl set image deploy/goslings goslings=kaitoy/goslings:hoge
deployment "goslings" image updated
```

実際には`kaitoy/goslings:hoge`というイメージはないので、イメージのPullに失敗したというエラー(ErrImagePull)になる。

```cmd
C:\Users\kaitoy>kubectl get po
NAME                       READY     STATUS         RESTARTS   AGE
goslings-274047280-jxmmh   0/1       ErrImagePull   0          9s
goslings-274047280-rgg2v   0/1       ErrImagePull   0          8s
goslings-442066424-34h1f   1/1       Terminating    0          1h
goslings-442066424-kmn3p   1/1       Running        0          1h
```

<br>

イメージ変更前に戻すには、`kubectl rollout undo`する。

```cmd
C:\Users\kaitoy>kubectl rollout undo deploy/goslings
deployment "goslings" rolled back

C:\Users\kaitoy>kubectl rollout status deploy/goslings
deployment "goslings" successfully rolled out

C:\Users\kaitoy>kubectl get po
NAME                       READY     STATUS    RESTARTS   AGE
goslings-442066424-kmn3p   1/1       Running   0          1h
goslings-442066424-m3873   1/1       Running   0          5s
```

無事に戻った。

# 番外編1 - 3つのオブジェクト管理手法
Kubernetesオブジェクトを管理する手法は[大きく3つある](https://kubernetes.io/docs/tutorials/object-management-kubectl/object-management/)。

 管理手法           |いじる対象                 | 難易度
------------------|--------------------------|-------
命令的コマンド       |生のオブジェクト            | 簡単
命令的オブジェクト設定|個々のファイル              | 普通
宣言的オブジェクト設定|ディレクトリに入ったファイル群| 難しい

<br>

Kubernetes Basicsでやってた手法は一番上の命令的コマンド。
これは簡単で分かりやすい。
けど、何度も同じようなデプロイするならコマンドを毎回打つのが面倒だし、作成されるオブジェクトは明示的じゃないし、変更管理もできない。
この手法は主に開発中に使う。

<br>

二つ目の手法の命令的オブジェクト設定では、YAML(かJSON)ファイルにオブジェクト定義を書いておいて、kubectlに渡す。
この手法だと、定義ファイルをオブジェクトのテンプレートとして使えるし、Gitとかのリポジトリに入れることでバージョン管理・変更管理できる。
けど、Kubernetesのオブジェクトモデルを理解しないと使えない。
(オブジェクト定義の詳細は[APIリファレンス](https://kubernetes.io/docs/api-reference/v1.8/)を参照。)

命令的オブジェクト設定は以下のような形でやる。

```shell
$ kubectl create -f nginx.yaml
$ kubectl delete -f nginx.yaml -f redis.yaml
$ kubectl replace -f nginx.yaml
```

<br>

三つ目の手法の宣言的オブジェクト設定では、設定フォルダに定義ファイル群を置く。
ユーザは明示的にcreateとかupdateとか指示する必要が無く、kubectlが勝手に判断してくれる。
生のオブジェクトを直接いじった後、同じオブジェクトの設定を設定ファイルで変更しても、
両者の変更が上手くマージされる。

なんかすごいけど、上手くいかなかったときのデバッグがむずい。

宣言的オブジェクト設定は以下のような形でやる。

```shell
$ kubectl apply -R -f configs/
```

# 番外編2 - 命令的オブジェクト設定
3つの手法の内、命令的オブジェクト設定でGoslingsをMinikubeにデプロイしてみる。

まず、Kubernetes Basicsで作ったオブジェクトを消すため、MinikubeのVMを作り直す。

```cmd
C:\Users\kaitoy>minikube stop
Stopping local Kubernetes cluster...
Machine stopped.

C:\Users\kaitoy>minikube delete
Deleting local Kubernetes cluster...
Machine deleted.

C:\Users\kaitoy>minikube start --vm-driver virtualbox --kubernetes-version v1.7.0
Starting local Kubernetes v1.7.0 cluster...
Starting VM...
Getting VM IP address...
Moving files into cluster...
Setting up certs...
Connecting to cluster...
Setting up kubeconfig...
Starting cluster components...
Kubectl is now configured to use the cluster.
```

<br>

次に定義ファイルを書いていく。

[APIリファレンスのDeploymentのとこ](https://v1-7.docs.kubernetes.io/docs/api-reference/v1.7/#deployment-v1beta1-apps)をみると、Kubernetes Basicsの最終形と同じようなDeploymentを作る定義は以下のように書ける。

```yaml
apiVersion: apps/v1beta1
kind: Deployment
metadata:
  name: goslings-sample
spec:
  replicas: 2
  template:
    metadata:
      labels:
        app: goslings
        ver: latest
    spec:
      containers:
        - name: goslings
          image: kaitoy/goslings:latest
          ports:
            - name: http
              containerPort: 8080
          args:
            - '8080'
            - /tmp
            - https://github.com/kaitoy/
```

同様に、Serviceは、[APIリファレンスのServiceのとこ](https://v1-7.docs.kubernetes.io/docs/api-reference/v1.7/#service-v1-core)みると以下のように書ける。

```yaml
kind: Service
apiVersion: v1
metadata:
  name: goslings-sample
spec:
  ports:
    - name: http
      port: 8080
      targetPort: 8080
  selector:
    app: goslings
  type: NodePort
```

<br>

で、それぞれのYAMLファイルを`kubectl create`に渡してやると、Goslingsデプロイ完了。

```cmd
C:\Users\kaitoy\kubeTest>kubectl create -f deploy_goslings.yml
deployment "goslings-sample" created

C:\Users\kaitoy\kubeTest>kubectl create -f service_goslings.yml
service "goslings-sample" created
```

<br>

オブジェクトの種類もパラメータも大量にあるので、使いこなすのは難しそう。
