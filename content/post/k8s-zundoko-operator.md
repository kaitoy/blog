+++
categories = ["Programming"]
date = "2019-03-08T17:29:16+09:00"
draft = false
eyecatch = "kubernetes.png"
slug = "k8s-zundoko-operator"
tags = ["kubernetes", "kubebuilder", "zundoko", "golang"]
title = "ズンドコキヨシ with Kubernetes Operator - KubebuilderでKubernetes Operatorを作ってみた"
+++

<blockquote class="twitter-tweet" data-lang="ja"><p lang="ja" dir="ltr">Javaの講義、試験が「自作関数を作り記述しなさい」って問題だったから<br>「ズン」「ドコ」のいずれかをランダムで出力し続けて「ズン」「ズン」「ズン」「ズン」「ドコ」の配列が出たら「キ・ヨ・シ！」って出力した後終了って関数作ったら満点で単位貰ってた</p>&mdash; てくも (@kumiromilk) <a href="https://twitter.com/kumiromilk/status/707437861881180160">2016年3月9日</a></blockquote>
<script async src="//platform.twitter.com/widgets.js" charset="utf-8"></script>

久しぶりにズンドコしたくなったので、[Kubebuilder](https://book.kubebuilder.io/)を使って、[Kubernetes](https://kubernetes.io/)の[Operator](https://coreos.com/operators/)として動く[Zundoko Operator](https://github.com/kaitoy/zundoko-operator)を作ってみた。

{{< google-adsense >}}

# Kubernetes Operatorとは

KubernetesのOperatorというのは[CoreOS社](https://coreos.com/)(現Red Hat)によって提唱された概念(実装パターン)で、KubernetesのAPIで登録される[Kubernetesオブジェクト](https://kubernetes.io/docs/concepts/overview/working-with-objects/kubernetes-objects/#understanding-kubernetes-objects)の内容に従って何らかの処理をするController (e.g. [Deployment Controller](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/))の一種。

Controllerが汎用的なのに対して、特定のアプリケーションに特化しているのが特徴。
アプリケーションごとの細かな設定をKubernetesオブジェクトで表現するために、KubernetesのAPIを拡張する。

APIを拡張するには[API Aggregation](https://kubernetes.io/docs/tasks/access-kubernetes-api/configure-aggregation-layer/)を使う方法と[Custom Resource Definition (CRD)](https://kubernetes.io/docs/tasks/access-kubernetes-api/custom-resources/custom-resource-definitions/)を使う方法がある。
API Aggregationは、Kubernetesオブジェクトを[etcd](https://github.com/etcd-io/etcd)以外で管理したり、[WebSocket](https://ja.wikipedia.org/wiki/WebSocket)を使ったり、Kubernetesクラスタ外のAPIサーバを使う場合など、特殊な場合にも対応できる高度なやりかたで、大抵のユースケースではCRDで事足りる。
Operatorも普通はCRDを使う。(というかCRDを使うのがOperatorという人もいる。)

# CRDとは

KubernetesのAPIを簡単に拡張できる仕組みで、Kubernetesオブジェクト(リソース)を定義するKubernetesオブジェクト。

YAMLで、定義したいリソースの名前や型やバリデーションなんかを書いて`kubectl apply`すれば、そのリソースをKubernetesのREST APIとかkubectlで作成したり取得したりできるようになる。

# Operatorの仕組み

Operatorは、CRDで定義されたリソース(など)の作成、更新、削除を監視(watch)して、リソースの内容に応じた何らかの処理をするReconciliationループを回すPod。
普通、リソースはOperatorの管理対象のアプリケーションの状態を表す。
で、Operatorはリソースの内容とアプリケーションの状態が同じになるように、Reconciliationループ内で[Deployment](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)を作ったりアプリケーションのAPIを叩いたりする。

ユーザとしては、アプリケーションの構成や設定をKubernetesのAPIで宣言的に統一的に管理できるようになって幸せになれる。

# Operator作成ツール

Operatorを作るツールとして以下がある。


ツール         | [Operator SDK](https://github.com/operator-framework/operator-sdk)                                                                                                                                                                                                                                                                                                                                                            | [Kubebuilder](https://book.kubebuilder.io/)                                                                  | [Metacontroller](https://metacontroller.app/)
---------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
開発元         | Kubernetesコミュニティ製                                                                                                                                                                                                                                                                                                                                                                                                      | CoreOS社製                                                                                                   | GKEチーム製
GitHubスター数 | 1459                                                                                                                                                                                                                                                                                                                                                                                                                          | 1009                                                                                                         | 506
開発言語       | Go、Ansible、Helm                                                                                                                                                                                                                                                                                                                                                                                                             | Go                                                                                                           | 任意
特徴           | プロジェクトテンプレート生成、ビルド、デプロイをするCLIツール。[Ansible](https://www.ansible.com/)でもOperatorを書けるのが面白い。[Operator Framework](https://github.com/operator-framework)として[Lifecycle Manager](https://github.com/operator-framework/operator-lifecycle-manager)などが提供されていたり、[OperatorHub.io](https://www.operatorhub.io/)というコミュニティサイトがあったり、エコシステムが充実している。 | プロジェクトテンプレート生成、ビルド、デプロイをするCLIツール。3つの中で一番シンプル。Goでしか開発できない。 | 他の2つと毛色が違って、Metacontroller自体が汎用的にOperatorを管理するKubernetesアプリ。Operatorの定義をJSONを投げて登録すると、Reconciliationループを回してその中でWebフックを実行してくるので、それを受けて任意の処理をするサーバを任意の言語で書ける。

<br>

この中では、Operator SDKが数歩リードしている感じ。
(CoreOS社を買収した)Red Hatが後ろ盾ているし、OperatorHub.ioはGCPとAWSとAzureが協力している。

けど、この記事のネタを書き始めたときにはまだOperatorHub.ioが発表されていなくて、単純にKubebuilderがシンプルでいいと思って採用してしまった。
まあOperator SDKもKubebuilderも下回りのライブラリは同じものを使っているので、だいたい同じだろうし、Operator Frameworkへの移行も難しくなかろう。

# Zundoko Operator

Kubebuilderで今回作ったのは[Zundoko Operator](https://github.com/kaitoy/zundoko-operator)。

CRDで定義したリソースは以下。

* [Hikawa](https://github.com/kaitoy/zundoko-operator/blob/master/config/crds/zundokokiyoshi_v1beta1_hikawa.yaml): 作るとズンドコきよしを開始する。
* [Zundoko](https://github.com/kaitoy/zundoko-operator/blob/master/config/crds/zundokokiyoshi_v1beta1_zundoko.yaml): 「ズン」と「ドコ」を表す。Hikawaに管理される。
* [Kiyoshi](https://github.com/kaitoy/zundoko-operator/blob/master/config/crds/zundokokiyoshi_v1beta1_kiyoshi.yaml): 「キ・ヨ・シ！」を表す。Hikawaに管理される。

Zundoko Operatorは、HikawaとZundokoをwatchする。
Hikawaが作成されると、一定間隔で、ランダムに「ズン」か「ドコ」をセットしたZundokoを作成する。
「ズン」を4つ作ったあとに「ドコ」を作ったら、Kiyoshiを作成して、Zundokoの作成を止める。

# Kubebuilderの使い方

[Quick Start](https://book.kubebuilder.io/quick_start.html)を参考に。

Kuberbuilderを使うには[Go](https://golang.org/)、[dep](https://github.com/golang/dep)と[kustomize](https://github.com/kubernetes-sigs/kustomize)とDockerが必要で、Linuxしかサポートしていない。
自分のPCがWindows 10なので、WSL (Ubuntu 18.04)で環境を作ったんだけど、結局Dockerビルドとかテストとかが上手く動かなかったので、VMとかのLinuxで動かしたほうがよさそう。

## Kubebuilderセットアップ

1. Goインストール

    Goは[公式サイト](https://golang.org/dl/)からLinux用アーカイブをダウンロードして展開して、そのbinディレクトリにPATH通すだけでインストールできる。

    ```sh
    $ go version
    go version go1.11.4 linux/amd64
    ```

    あと、作業ディレクトリを作って`GOPATH`を設定しておく。
    `~/go/`を作業ディレクトリとする。

    ```sh
    $ export GOPATH=$HOME/go
    $ echo 'export GOPATH=$HOME/go' >> ~/.profile
    $ mkdir $GOPATH/bin
    $ mkdir $GOPATH/src
    ```

    で、`$GOPATH/bin`にもPATH通しておく。

2. depインストール

    Go公式の依存ライブラリ管理ツール。
    コマンド一発でインストールできる。

    ```sh
    $ curl https://raw.githubusercontent.com/golang/dep/master/install.sh | sh
    ```

3. kustomizeインストール

    バイナリをPATHの通ったところにダウンロードするだけ。

    ```sh
    $ curl -L https://github.com/kubernetes-sigs/kustomize/releases/download/v2.0.3/kustomize_2.0.3_linux_amd64 -o /usr/local/bin/kustomize
    $ chmod +x /usr/local/bin/kustomize
    ```

4. kubebuilderインストール

    GitHubのReleasesからアーカイブをダウンロードして展開してPATH通すだけ。

    ```
    $ version=1.0.6
    $ arch=amd64
    $ curl -LO https://github.com/kubernetes-sigs/kubebuilder/releases/download/v${version}/kubebuilder_${version}_linux_${arch}.tar.gz
    $ tar -zxvf kubebuilder_${version}_linux_${arch}.tar.gz
    $ sudo mv kubebuilder_${version}_linux_${arch} /usr/local/kubebuilder
    $ export PATH=$PATH:/usr/local/kubebuilder/bin
    $ echo 'export PATH=$PATH:/usr/local/kubebuilder/bin' >> ~/.profile
    ```

5. Dockerインストール

    は適当に…

## Kubebuilderプロジェクト生成

Zundoko Operatorのプロジェクトを生成する。

```sh
$ mkdir -p $GOPATH/src/github.com/kaitoy/zundoko-operator
$ cd $GOPATH/src/github.com/kaitoy/zundoko-operator
$ kubebuilder init --owner kaitoy
```

`dep ensure`を実行するかを聞かれるのでyesで回答すると、依存ライブラリがダウンロードされ、プロジェクトのビルドが走る。

<br>

デフォルトではCRDなどの名前空間が`k8s.io`になっているので、`kaitoy.github.com`に変えるべく、`zundoko-operator/PROJECT`を編集する。

`zundoko-operator/PROJECT`:
```diff
 version: "1"
-domain: k8s.io
+domain: kaitoy.github.com
 repo: github.com/kaitoy/zundoko-operator
```

## CRDとController生成

HikawaとZundokoとKiyoshiのCRDを生成する。

```sh
$ kubebuilder create api --group zundokokiyoshi --version v1beta1 --kind Hikawa
$ kubebuilder create api --group zundokokiyoshi --version v1beta1 --kind Zundoko
$ kubebuilder create api --group zundokokiyoshi --version v1beta1 --kind Kiyoshi
```

それぞれ、リソースを作成するか (Create Resource under pkg/apis [y/n]?) と、Controllerを作成するか (Create Controller under pkg/controller [y/n]?) を聞かれる。
リソースはそれぞれ作成して、ControllerはHikawaにだけ作成した。

生成されたのは以下のファイル。

* API定義とそのテスト: `zundoko-operator/pkg/apis/zundokokiyoshi/v1beta1/*.go`
* CRD: `zundoko-operator/config/crds/config/crds/*.yaml`
* Hikawa Controllerとそのテスト: `zundoko-operator/pkg/controller/hikawa/*.go`
* リソースのマニフェストのサンプル: `zundoko-operator/config/crds/config/samples/*.yaml`

これらの内、CRDと `zundoko-operator/pkg/apis/zundokokiyoshi/v1beta1/zz_generated.deepcopy.go` はAPI定義をもとに生成されるので、API定義を書いた後生成しなおすことになる。

## API定義記述

リソースがどのような属性をもつかをGoで定義する。
テンプレートは生成されているので、ちょっと書き足すだけでできる。

以下はHikawaのAPI定義。

`zundoko-operator/pkg/apis/zundokokiyoshi/v1beta1/hikawa_types.go`:
```golang
package v1beta1

import (
	"time"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// HikawaSpec defines the desired state of Hikawa
type HikawaSpec struct {
	IntervalMillis time.Duration `json:"intervalMillis"`
	NumZundokos    int           `json:"numZundokos,omitempty"`
	SayKiyoshi     bool          `json:"sayKiyoshi,omitempty"`
}

// HikawaStatus defines the observed state of Hikawa
type HikawaStatus struct {
	NumZundokosSaid int  `json:"numZundokosSaid"`
	Kiyoshied       bool `json:"kiyoshied"`
}

// +genclient
// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object

// Hikawa is the Schema for the hikawas API
// +k8s:openapi-gen=true
type Hikawa struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   HikawaSpec   `json:"spec,omitempty"`
	Status HikawaStatus `json:"status,omitempty"`
}

// +k8s:deepcopy-gen:interfaces=k8s.io/apimachinery/pkg/runtime.Object

// HikawaList contains a list of Hikawa
type HikawaList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []Hikawa `json:"items"`
}

func init() {
	SchemeBuilder.Register(&Hikawa{}, &HikawaList{})
}
```

自分で書いたのは`HikawaSpec`と`HikawaStatus`の中だけ。

Specの方には期待する状態、Statusの方には現在の実際の状態を表すフィールドを定義するのがパターン。
例えば、`HikawaSpec.NumZundokos`が期待するZundokoの数で、`HikawaStatus.NumZundokosSaid`が実際に作成されたZundokono数。

Hikawa ControllerはReconciliationループの中で、SpecとStateが同じになるように処理をすることになる。

ZundokoとKiyoshiのAPI定義は、Specに「Zun」、「Doko」、または「Kiyoshi!」を入れるためのSayフィールドだけを書いた。

## Hikawa Controller記述

Hikawa Controllerもテンプレートが生成されているので、それを参考に書ける。

まずはどのリソースをwatchするかを書く。

`zundoko-operator/pkg/controller/hikawa/hikawa_controller.go`前半抜粋:
```go
func add(mgr manager.Manager, r reconcile.Reconciler) error {
	// Create a new controller
	c, err := controller.New("hikawa-controller", mgr, controller.Options{Reconciler: r})
	if err != nil {
		return err
	}

	// Watch for changes to Hikawa
	err = c.Watch(&source.Kind{Type: &zundokokiyoshiv1beta1.Hikawa{}}, &handler.EnqueueRequestForObject{})
	if err != nil {
		return err
	}

	err = c.Watch(&source.Kind{Type: &zundokokiyoshiv1beta1.Zundoko{}}, &handler.EnqueueRequestForOwner{
		IsController: true,
		OwnerType:    &zundokokiyoshiv1beta1.Hikawa{},
	})
	if err != nil {
		return err
	}

	return nil
}
```

Hikawaは普通にwatchして、Zundokoはownしているリソースとしてwatchしている。

<br>

Reconciliationループは以下のように書いた。

`zundoko-operator/pkg/controller/hikawa/hikawa_controller.go`後半抜粋:
```go
// +kubebuilder:rbac:groups=zundokokiyoshi.kaitoy.github.com,resources=hikawas,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=zundokokiyoshi.kaitoy.github.com,resources=hikawas/status,verbs=get;update;patch
// +kubebuilder:rbac:groups=zundokokiyoshi.kaitoy.github.com,resources=zundokos,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=zundokokiyoshi.kaitoy.github.com,resources=zundokos/status,verbs=get;update;patch
// +kubebuilder:rbac:groups=zundokokiyoshi.kaitoy.github.com,resources=kiyoshis,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=zundokokiyoshi.kaitoy.github.com,resources=kiyoshis/status,verbs=get;update;patch
func (r *ReconcileHikawa) Reconcile(request reconcile.Request) (reconcile.Result, error) {
	instanceName := request.NamespacedName.String()
	log.Info("Reconciling a Hikawa: " + instanceName)

	// Fetch the Hikawa instance
	instance := &zundokokiyoshiv1beta1.Hikawa{}
	err := r.Get(context.TODO(), request.NamespacedName, instance)
	if err != nil {
		if errors.IsNotFound(err) {
			// Object not found, return.  Created objects are automatically garbage collected.
			// For additional cleanup logic use finalizers.
			return reconcile.Result{}, nil
		}
		// Error reading the object - requeue the request.
		return reconcile.Result{}, err
	}

	if instance.Status.Kiyoshied {
		log.Info(instanceName + " has kiyoshied.")
		return reconcile.Result{}, nil
	}

	zundokoList := &zundokokiyoshiv1beta1.ZundokoList{}
	if err := r.List(context.TODO(), &client.ListOptions{Namespace: instance.Namespace}, zundokoList); err != nil {
		log.Error(err, "Failed to list zundokos for: ", instanceName)
		return reconcile.Result{}, err
	}

	var dependents []zundokokiyoshiv1beta1.Zundoko
	for _, zundoko := range zundokoList.Items {
		for _, owner := range zundoko.GetOwnerReferences() {
			if owner.Name == instance.Name {
				dependents = append(dependents, zundoko)
			}
		}
	}
	numZundokosSaid := len(dependents)

	if instance.Spec.NumZundokos > numZundokosSaid {
		log.Info(instanceName + " wants " + strconv.Itoa(instance.Spec.NumZundokos-numZundokosSaid) + " more zundoko(s).")
		time.Sleep(instance.Spec.IntervalMillis * time.Millisecond)
		word := getZundoko()
		if err := createZundoko(instance, r, fmt.Sprintf("-zundoko-%03d", numZundokosSaid+1), word); err != nil {
			return reconcile.Result{}, err
		}
	} else if instance.Status.NumZundokosSaid != numZundokosSaid {
		log.Info(instanceName + " has said " + strconv.Itoa(numZundokosSaid) + " zundoko(s). Updating the status.")
		instance.Status.NumZundokosSaid = numZundokosSaid
		if err := r.Update(context.Background(), instance); err != nil {
			log.Error(err, "Failed to update "+instanceName)
			return reconcile.Result{}, err
		}
	} else if instance.Spec.SayKiyoshi {
		log.Info(instanceName + " is going to say " + wordKiyoshi)
		time.Sleep(instance.Spec.IntervalMillis * time.Millisecond)
		if err := createKiyoshi(instance, r); err != nil {
			return reconcile.Result{}, err
		}

		instance.Status.Kiyoshied = true
		if err := r.Update(context.Background(), instance); err != nil {
			log.Error(err, "Failed to update "+instanceName)
			return reconcile.Result{}, err
		}
	} else if isReadyToKiyoshi(dependents) {
		log.Info(instanceName + " is ready to say " + wordKiyoshi)
		instance.Spec.SayKiyoshi = true
		if err := r.Update(context.Background(), instance); err != nil {
			log.Error(err, "Failed to update "+instanceName)
			return reconcile.Result{}, err
		}
	} else {
		log.Info(instanceName + " keeps going on ZUNDOKO.")
		instance.Spec.NumZundokos++
		if err := r.Update(context.Background(), instance); err != nil {
			log.Error(err, "Failed to update "+instanceName)
			return reconcile.Result{}, err
		}
	}

	return reconcile.Result{}, nil
}
```

冒頭のコメントの内容は、このControllerにどのリソースのどの操作を許可するかを列挙しているもので、これをもとにControllerのRole定義 (`zundoko-operator/config/rbac/rbac_role.yaml`) が生成される。
Hikawa ControllerはHikawaとZundokoとKiyoshiを作ったり取得したりする必要があるので、それっぽく書いた。

watchしているリソースの作成・更新・削除のたびに`Reconcile()`が呼ばれるので、そのなかでは対象となるHikawaを取得して期待されている状態を調べたり、Zundokoのリストを取得して現状を確認したり、リソースを更新したりして、`reconcile.Result{}`をreturnする。
`reconcile.Result{}`が何なのかドキュメントにも記載が無くてよくわからないが、いつも空でreturnしておくのが無難っぽい。

errorオブジェクトをreturnすると、若干のインターバルののち再度`Reconcile()`が呼ばれる。

リソースの削除時になにか処理をしたいときは、[Finalizer](https://book.kubebuilder.io/beyond_basics/using_finalizers.html)という仕組みが使える。
今回は使ってない。

<br>

Zundokoを作成する`createZundoko()`は以下。

```go
func createZundoko(instance *zundokokiyoshiv1beta1.Hikawa, r *ReconcileHikawa, nameSuffix, word string) error {
	zundoko := &zundokokiyoshiv1beta1.Zundoko{
		ObjectMeta: metav1.ObjectMeta{
			Name:      instance.Name + nameSuffix,
			Namespace: instance.Namespace,
		},
		Spec: zundokokiyoshiv1beta1.ZundokoSpec{
			Say: word,
		},
	}
	if err := controllerutil.SetControllerReference(instance, zundoko, r.scheme); err != nil {
		log.Error(err, "An error occurred in SetControllerReference", "instance", instance.Name, "namespace", zundoko.Namespace, "name", zundoko.Name)
		return err
	}

	log.Info("Creating Zundoko", "namespace", zundoko.Namespace, "name", zundoko.Name)
	if err := r.Create(context.TODO(), zundoko); err != nil {
		log.Error(err, "Failed to create Zundoko", "namespace", zundoko.Namespace, "name", zundoko.Name)
		return err
	}

	return nil
}
```

`controllerutil.SetControllerReference()`で、作成するZundokoにHikawaをownerとして紐づけている。
これにより、Zundokoの作成・更新時にReconciliationループの中で正しいHikawaが取得できるとともに、Hikawaを削除したときに関連するZundokoが[Garbage Collection](https://kubernetes.io/docs/concepts/workloads/controllers/garbage-collection/)される。

## CRDなどの再生成

API定義などの記述を反映させるため、CRDとかrbac_role.yamlとかzz_generated.deepcopy.goを再生成する。

```sh
$ make generate
$ make manifest
```

## Zundoko OperatorのDockerイメージのビルド

Zundoko OperatorはPodとして動かすので、そのDockerイメージをビルドしておく必要がある。
DockerfileもKubebuilderが生成してくれているので、それをそのまま使えばいい。

```sh
$ docker build -t kaitoy/zundoko-operator:latest .
```

## Zundoko OperatorをデプロイするKubernetesマニフェスト生成

Zundoko OperatorをデプロイするKubernetesマニフェストはkustomizeで生成する。
生成する前に、kustomizeのパッチファイルである`zundoko-operator/config/default/manager_image_patch.yaml`を編集して、`spec.template.spec.containers[].image`にさっきビルドしたDockerイメージの名前を書いておく。

`zundoko-operator/config/default/manager_image_patch.yaml`:
```diff
 apiVersion: apps/v1
 kind: StatefulSet
 metadata:
   name: controller-manager
   namespace: system
 spec:
   template:
     spec:
       containers:
       # Change the value of image field below to your controller image URL
-     - image: IMAGE_URL
+     - image: kaitoy/zundoko-operator:latest
         name: manager
```

で、以下のコマンドで生成できる。

```sh
$ kustomize build config/default > zundoko-operator.yaml
```

## Zundoko Operatorデプロイ

Zundoko Operatorをデプロイするには、生成したCRDと、kustomizeの出力を`kubectl apply`してやればいい。

```sh
$ kubectl apply -f zundoko-operator/config/crds/zundokokiyoshi_v1beta1_hikawa.yaml
$ kubectl apply -f zundoko-operator/config/crds/zundokokiyoshi_v1beta1_kiyoshi.yaml
$ kubectl apply -f zundoko-operator/config/crds/zundokokiyoshi_v1beta1_zundoko.yaml
$ kubectl apply -f zundoko-operator/zundoko-operator.yaml
```

## Hikawa作成

Hikawaを登録するとズンドコしはじめる。

```sh
$ cat <<EOF | kubectl create -f -
apiVersion: zundokokiyoshi.kaitoy.github.com/v1beta1
kind: Hikawa
metadata:
  labels:
    controller-tools.k8s.io: "1.0"
  name: hikawa-sample
spec:
  intervalMillis: 500
EOF
```

<br>

{{< youtube oemOqYspbaE >}}
