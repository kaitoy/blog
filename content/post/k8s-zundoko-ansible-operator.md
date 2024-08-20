+++
categories = ["Programming"]
date = "2020-12-20T22:29:09+09:00"
draft = false
cover = "operator-sdk.png"
slug = "k8s-zundoko-ansible-operator"
tags = ["Kubernetes", "operator-sdk", "zundoko", "ansible"]
title = "ズンドコキヨシ with Kubernetes Ansible Operator - Operator SDKのAnsible Operatorを使ってみた"
highlight = true
highlightStyle = "monokai"
highlightLanguages = []

+++

久しぶりにズンドコしたくなったので、Operator SDKのAnsible operatorを使って、KubernetesクラスタでズンドコキヨシするZundoko Ansible Operatorを作った話し。

<!--more-->

<blockquote class="twitter-tweet" data-lang="ja"><p lang="ja" dir="ltr">Javaの講義、試験が「自作関数を作り記述しなさい」って問題だったから<br>「ズン」「ドコ」のいずれかをランダムで出力し続けて「ズン」「ズン」「ズン」「ズン」「ドコ」の配列が出たら「キ・ヨ・シ！」って出力した後終了って関数作ったら満点で単位貰ってた</p>&mdash; てくも (@kumiromilk) <a href="https://twitter.com/kumiromilk/status/707437861881180160">2016年3月9日</a></blockquote>
<script async src="//platform.twitter.com/widgets.js" charset="utf-8"></script>

書いたものは[GitHub](https://github.com/kaitoy/zundoko-ansible-operator)に置いた。

<br>

なお、これは[Kubernetes Advent Calendar 2020 その2](https://qiita.com/advent-calendar/2020/kubernetes2)の20日目の記事です。

{{< google-adsense >}}

# Kubernetes Operatorとは
[Kubernetes](https://kubernetes.io/)のOperatorというのは[CoreOS社](https://coreos.com/)(現Red Hat)によって提唱された概念(実装パターン)で、KubernetesのAPIで登録される[Kubernetesオブジェクト](https://kubernetes.io/docs/concepts/overview/working-with-objects/kubernetes-objects/#understanding-kubernetes-objects)の内容に従って何らかの処理をするController (e.g. [Deployment Controller](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/))の一種。
Controllerが汎用的なのに対して、特定のアプリケーションに特化しているものがOperatorと呼ばれる。

Operatorを実装しようとすると、アプリケーションごとの細かな設定をKubernetesオブジェクトで表現するためにKubernetesのAPIを拡張したくなるんだけど、そのための機能が[Custom Resource Definition (CRD)](https://kubernetes.io/docs/tasks/access-kubernetes-api/custom-resources/custom-resource-definitions/)。

# CRDとは
KubernetesのAPIを簡単に拡張できる仕組みで、Kubernetesオブジェクト(aka. カスタムリソース)を定義するKubernetesオブジェクト。

定義したいカスタムリソースの名前や型やバリデーションなんかをYAMLで書いてKubernetesに登録すると、そのカスタムリソースをKubernetesのREST APIとかkubectlで作成したり取得したりできるようになる。

Kubernetes Advent Calendar 2020 その2の[二日目の記事](https://qiita.com/Hiroyuki_OSAKI/items/6319ed09be72ba8ac1d1)を見ると分かりやすいかも。

# Operatorの仕組み
Operatorは、CRDで定義されたリソース(または組み込みのKubernetesオブジェクト)の作成、更新、削除を監視して、カスタムリソースの内容に応じた何らかの処理をするサービス。

普通、カスタムリソースにはOperatorが管理するアプリケーションの状態を表現させて、Operatorはカスタムリソースの内容とアプリケーションの状態が同じになるように、Deploymentでアプリを起動したりアプリの設定をいじったりする。

Operatorの処理は、カスタムリソースの作成、更新、削除のたびに呼び出される一つの関数の中に記述することになっている。
同じ関数が何度も繰り返し呼ばれ、呼ばれる度にカスタムリソースの内容とアプリケーションの状態をそろえるような処理をすることから、Operatorの処理はReconciliationループと呼ばれる。

# Operator作成ツール

Operatorを作るツールとして以下がある。


* [Operator SDK](https://sdk.operatorframework.io/)

    オペレータのプロジェクトテンプレート生成、ビルド、デプロイをするCLIツール。Goのほか、[Ansible](https://www.ansible.com/)や[Helm](https://helm.sh/)でもOperatorを書けるのが面白い。[Operator Framework](https://github.com/operator-framework)の一部として提供されていて、[Lifecycle Manager](https://github.com/operator-framework/operator-lifecycle-manager)というオペレータのライフサイクルを管理するものがあったり、[OperatorHub.io](https://www.operatorhub.io/)というコミュニティサイトがあったり、エコシステムが充実している。

* [Kubebuilder](https://book.kubebuilder.io/)

    オペレータのプロジェクトテンプレート生成、ビルド、デプロイをするCLIツール。開発言語はGo。

* [Metacontroller](https://metacontroller.app/)

    Metacontroller自体がオペレータを管理するオペレータ。オペレータの定義をKubernetesに登録すると、Reconciliationループを回してその中でWebフックを実行してくるので、それを受けて処理を実行するオペレータを任意の言語で書ける。

* [KUDO](https://kudo.dev/)

    Kudoには標準的な処理を実装したオペレータが含まれていて、YAMLでワークフローを記述するだけで簡単にオペレータが実装できる。

<br>

以前は[Kubebuilder (v1)でズンドコ](https://www.kaitoy.xyz/2019/03/08/k8s-zundoko-operator/)したんだけど、今回は[Operator SDKのAnsible operator](https://sdk.operatorframework.io/docs/building-operators/ansible/)を使う。

# Ansible operator
Ansible operatorを使えばAnsible Playbookを書くだけでオペレータを実装できる。

Ansible operatorは、[Operator SDKのマニュアル](https://sdk.operatorframework.io/docs/building-operators/ansible/reference/information-flow-ansible-operator/)によると以下のようなアーキテクチャになっている。

![](https://sdk.operatorframework.io/ao-flow.png)

オペレータの監視対象のカスタムリソースに変化があるとControllerが検知し、カスタムリソースの内容をAnsible変数に詰めてAnsible Runnerを起動してAnsible Playbookを実行する。

このAnsible Playbookではカスタムリソース(などのKubernetesオブジェクト)をいじるタスクを書くことができるんだけど、Kubernetesへのアクセスは全てProxyを介して行われる。
Proxyは、カスタムリソースにOperator SDKの[アノテーション](https://kubernetes.io/ja/docs/concepts/overview/working-with-objects/annotations/)や[オーナーリファレンス](https://kubernetes.io/ja/docs/concepts/workloads/controllers/garbage-collection/#owners-and-dependents)を挿入したりしてくれる。

# Zundoko Ansible Operator
Ansible operatorで実装するのはズンドコきよしを実行するZundoko Ansible Operator。
Zundoko Ansible Operatorは、以前Kubebuilderで作ったやつと同様、以下のカスタムリソースを扱う。

* [Hikawa](https://github.com/kaitoy/zundoko-ansible-operator/blob/master/config/crd/bases/zundokokiyoshi.kaitoy.github.com_hikawas.yaml): 作るとズンドコきよしを開始する。

    例:

    ```yaml
    apiVersion: zundokokiyoshi.kaitoy.github.com/v1beta2
    kind: Hikawa
    metadata:
      name: hikawa
    spec:
      intervalMillis: 500
    ```

    後述の事情で一部のプロパティの型が変わったので、バージョンがv1beta2になっている。
    あと、今回は`intervalMillis`を考慮した処理にはできなかったので、`intervalMillis`は無意味なプロパティになり下がった。

* [Zundoko](https://github.com/kaitoy/zundoko-ansible-operator/blob/master/config/crd/bases/zundokokiyoshi.kaitoy.github.com_zundokoes.yaml): 「ズン」か「ドコ」を表す。Hikawaがオーナー。

    例:

    ```yaml
    apiVersion: zundokokiyoshi.kaitoy.github.com/v1beta1
    kind: Zundoko
    metadata:
      name: hikawa-zundoko-0001
    spec:
      say: Doko
    ```

* [Kiyoshi](https://github.com/kaitoy/zundoko-ansible-operator/blob/master/config/crd/bases/zundokokiyoshi.kaitoy.github.com_kiyoshis.yaml): 「キ・ヨ・シ！」を表す。Hikawaがオーナー。

    例:

    ```yaml
    apiVersion: zundokokiyoshi.kaitoy.github.com/v1beta1
    kind: Kiyoshi
    metadata:
      name: hikawa-kiyoshi
    spec:
      say: Kiyoshi !
    ```

Zundoko Ansible OperatorはHikawaが作成されるとReconciliationループを開始し、ランダムに「ズン」か「ドコ」をセットしたZundokoを作成する。
「ズン」を4つ作ったあとに「ドコ」を作ったら、Kiyoshiを作成してReconciliationループを止める。

# Ansible operatorを使ったオペレータの書き方
Ansible operatorを使ったオペレータを書くには、まずOperator SDKでプロジェクトテンプレートを生成する。

## Operator SDKインストール

Operator SDKは、[GitHubのリリースページ](https://github.com/operator-framework/operator-sdk/releases/tag/v1.2.0)からバイナリをひとつダウンロードしてPATHの通った場所に置くだけでインストールできる。
今回はv1.2.0をインストールした。

```console
[root ~]# curl -Lo /usr/local/bin/operator-sdk https://github.com/operator-framework/operator-sdk/releases/download/v1.2.0/operator-sdk-v1.2.0-x86_64-linux-gnu
```

## Zundoko Ansible Operatorプロジェクトテンプレート生成
コマンドひとつでZundoko Ansible Operatorプロジェクトテンプレートを生成できる。

```console
[root ~]# mkdir zundoko-ansible-operator
[root ~]# cd zundoko-ansible-operator
[root zundoko-ansible-operator]# operator-sdk init --plugins=ansible --domain=kaitoy.github.com
```

Ansible operatorを使うために`--plugins=ansible`を指定している。

`--domain`で指定しているドメインは、このプロジェクトのCRDで定義するカスタムリソースの`apiGroup`のサフィックスとして使われる。

## CRDのひな型生成
HikawaとZundokoとKiyoshiのCRDのひな型を生成する。

```console
[root zundoko-ansible-operator]# operator-sdk create api --group zundokokiyoshi --version v1beta2 --kind Hikawa --generate-role
[root zundoko-ansible-operator]# operator-sdk create api --group zundokokiyoshi --version v1beta1 --kind Zundoko --generate-role
[root zundoko-ansible-operator]# operator-sdk create api --group zundokokiyoshi --version v1beta1 --kind Kiyoshi --generate-role
```

ここで`--group`で指定したやつと前節で`--domain`に指定したやつをjoinしたものがカスタムリソースの`apiGroup`になる。

ここまでで以下のようなファイルが生成された。

* `Dockerfile`: オペレータのコンテナイメージをビルドするDockerfile。
* `Makefile`: コンテナイメージのビルド、CRDのレンダリング、オペレータのデプロイ等の操作を定義したMakefile。
* `config/crd/bases/*.yaml`: 上記`operator-sdk create api`コマンドで生成したCRDのひな型。
* `config/manager/manager.yaml`: オペレータのDeployment。
* `config/rbac/*.yaml`: オペレータがカスタムリソース等にアクセスするためのRole系のマニフェスト。
* `roles/{hikawa,zundoko,kiyoshi}/`: カスタムリソース毎のAnsible Roleのひな型。ここにReconciliationループの処理を書く。
* `watches.yaml`: オペレータに監視させるカスタムリソース(などのKubernetesオブジェクト)と、対応させるAnsible Roleの定義。
* `molecule/`: [Ansible Molecule](https://molecule.readthedocs.io/en/latest/)によるE2Eテストのひな型。今回は触ってない。

(プロジェクト構造は[公式マニュアルにも載っている](https://sdk.operatorframework.io/docs/building-operators/ansible/reference/scaffolding/)。)

今回いじるのは、`config/crd/bases/*.yaml`と`watches.yaml`と`roles/hikawa/`。

## CRDの具体化
生成された時点でのHikawaのCRDのひな型は以下のようになっている。

`config/crd/bases/zundokokiyoshi.kaitoy.github.com_hikawas.yaml`:
```yaml
---
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: hikawas.zundokokiyoshi.kaitoy.github.com
spec:
  group: zundokokiyoshi.kaitoy.github.com
  names:
    kind: Hikawa
    listKind: HikawaList
    plural: hikawas
    singular: hikawa
  scope: Namespaced
  versions:
  - name: v1beta2
    schema:
      openAPIV3Schema:
        description: Hikawa is the Schema for the hikawas API
        properties:
          apiVersion:
            description: 'APIVersion defines the versioned schema of this representation
              of an object. Servers should convert recognized schemas to the latest
              internal value, and may reject unrecognized values. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#resources'
            type: string
          kind:
            description: 'Kind is a string value representing the REST resource this
              object represents. Servers may infer this from the endpoint the client
              submits requests to. Cannot be updated. In CamelCase. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#types-kinds'
            type: string
          metadata:
            type: object
          spec:
            description: Spec defines the desired state of Hikawa
            type: object
            x-kubernetes-preserve-unknown-fields: true
          status:
            description: Status defines the observed state of Hikawa
            type: object
            x-kubernetes-preserve-unknown-fields: true
        type: object
    served: true
    storage: true
    subresources:
      status: {}
```

`openAPIV3Schema`以下に[OpenAPI Specification](https://swagger.io/specification/)でカスタムリソースのプロパティを定義するんだけど、ひな型では当然なにも定義されてなくて、代わりに[x-kubernetes-preserve-unknown-fields: true](https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/#controlling-pruning)というのが書いてある。
これはつまりどんなプロパティでも入れられるということで、そのままでも使えなくはないけど、バリデーションなどを利かせるためにはちゃんと中身を書いたほうがいい。

Hikawaは以下のように変更した。

```diff
diff --git a/config/crd/bases/zundokokiyoshi.kaitoy.github.com_hikawas.yaml b/config/crd/bases/zundokokiyoshi.kaitoy.github.com_hikawas.yaml
index 4e5a3cb..91eb651 100644
--- a/config/crd/bases/zundokokiyoshi.kaitoy.github.com_hikawas.yaml
+++ b/config/crd/bases/zundokokiyoshi.kaitoy.github.com_hikawas.yaml
@@ -32,11 +32,29 @@ spec:
           spec:
             description: Spec defines the desired state of Hikawa
             type: object
-            x-kubernetes-preserve-unknown-fields: true
+            properties:
+              intervalMillis:
+                type: integer
+                format: int64
+              numZundokos:
+                type: string
+                pattern: '^\d+$'
+              sayKiyoshi:
+                type: boolean
+            required:
+            - intervalMillis
           status:
             description: Status defines the observed state of Hikawa
+            properties:
+              kiyoshied:
+                type: boolean
+              numZundokosSaid:
+                type: string
+                pattern: '^\d+$'
+            required:
+            - numZundokosSaid
+            - kiyoshied
             type: object
-            x-kubernetes-preserve-unknown-fields: true
         type: object
     served: true
     storage: true
```

`spec.numZundokos`が期待するZundokoの数で、`status.numZundokosSaid`が実際のZundokoの数。
Zundoko Ansible Operatorはこれらの差異を見てZundokoを生成する。
`spec.sayKiyoshi`と`status.kiyoshied`も同じ関係。

ここで、`spec.numZundokos`も`status.numZundokosSaid`も数値なのに型がstringになっているのは、[AnsibleのPlaybookで変数を埋め込むときに使うことになるJinja2テンプレートが文字列しか返せない](https://github.com/ansible/ansible/issues/30366)から。
以前書いたHikawaでは普通にintegerにしてたから、Ansible operatorの制約により型を変える羽目になった形。
これがHikawaのバージョンがv1beta2に変わった理由。

ZundokoとKiyoshiも[適当にプロパティを定義した](https://github.com/kaitoy/zundoko-ansible-operator/commit/dc5f2b4ea0a8bfab2632050e8ea45c2387a892dd)。

余談だけど、昔Kubebuilder v1でZundoko Operator作った時とはCRDのバージョンが変わっていて、v1beta1からv1に上がってた。
大きく変わったところは、カスタムリソースの複数のバージョンのが書けるようになったところ。

## 監視するカスタムリソースとAnsible Roleの設定
オペレータに監視させるカスタムリソースは`watches.yaml`に定義する。
自動で生成されたものは以下。

`watches.yaml`:
```yaml
---
# Use the 'create api' subcommand to add watches to this file.
- version: v1beta2
  group: zundokokiyoshi.kaitoy.github.com
  kind: Hikawa
  role: hikawa
- version: v1beta1
  group: zundokokiyoshi.kaitoy.github.com
  kind: Zundoko
  role: zundoko
- version: v1beta1
  group: zundokokiyoshi.kaitoy.github.com
  kind: Kiyoshi
  role: kiyoshi
# +kubebuilder:scaffold:watch
```

これは、Hikawaに変化があったら`hikawa`というAnsible Roleを実行し、Zundokoに(以下略)という意味。
実行されたRoleではカスタムリソースなどのKubernetesオブジェクトを作ったりするんだけど、そのとき、Roleの処理で作られたKubernetesオブジェクトには、そのRoleを起動したKubernetesへのオーナーリファレンスがProxyによって挿入される。

Zundoko Ansible Operatorの場合は、Roleの処理でZundokoとKiyoshiを作るんだけど、それらのオーナーをHikawaにしたいので、RoleはHikawaから起動しないといけない。
ので以下のように変更した。

`watches.yaml`:
```diff
diff --git a/watches.yaml b/watches.yaml
index 9dadc5a..947c6f3 100644
--- a/watches.yaml
+++ b/watches.yaml
@@ -4,12 +4,6 @@
   group: zundokokiyoshi.kaitoy.github.com
   kind: Hikawa
   role: hikawa
-- version: v1beta1
-  group: zundokokiyoshi.kaitoy.github.com
-  kind: Zundoko
-  role: zundoko
-- version: v1beta1
-  group: zundokokiyoshi.kaitoy.github.com
-  kind: Kiyoshi
-  role: kiyoshi
+  watchDependentResources: false
+  manageStatus: false
 # +kubebuilder:scaffold:watch
```

`watchDependentResources`は、オーナーになってるリソース(i.e. オーナーリファレンスが挿入されたリソース)に変更があったときに、オーナーのリソース(i.e. オーナーリファレンスが指しているリソース)に対応するAnsible Roleを実行するかのフラグだけど、これはオフにした。
ZundokoやKiyoshiは生成された後変わることはなく、監視する必要はないので。
ZundokoやKiyoshiが生成されるタイミングでHikawaのAnsible Roleを呼んでくれたらちょっとうれしかったんだけど、`watchDependentResources`をオンにしてもそれはしてくれなかった。

`manageStatus`は、カスタムリソースの`status`のプロパティをAnsible operatorに自動でいれてもらうかのフラグ。
Hikawaの`status`は自分で制御したかったのでオフにした。

## Reconciliationループの実装
ReconciliationループはAnsible Roleの`hikawa`のタスクとして書く。

タスクの記述には、Ansibleビルトインのモジュールの他、Kubernetesオブジェクトをapplyできる[community.kubernetes.k8sモジュール](https://docs.ansible.com/ansible/2.10/collections/community/kubernetes/k8s_module.html)、Kubernetesオブジェクトをgetできる[community.kubernetes.k8s_infoモジュール](https://docs.ansible.com/ansible/2.10/collections/community/kubernetes/k8s_info_module.html)、Kubernetesオブジェクトの`status`を更新できる[operator_sdk.util.k8s_statusモジュール](https://galaxy.ansible.com/operator_sdk/util)などがデフォルトで使える。
(オペレータのコンテナイメージのビルドの時に入れれば好きなAnsibleモジュールを使える。)

また、Ansible Roleを起動したKubernetesオブジェクトのmetadataやプロパティが[Ansible変数として渡される](https://sdk.operatorframework.io/docs/building-operators/ansible/development-tips/#extra-vars-sent-to-ansible)ので、タスクからそれを参照できる。

`hikawa`のタスクは以下のように書いた。

`roles/hikawa/tasks/main.yml`:
```yaml
#
# Hikawaに属するZundokoの一覧を取得する。
#
- name: Get a list of all Zundokos
  community.kubernetes.k8s_info:
    api_version:  zundokokiyoshi.kaitoy.github.com/v1beta1
    kind: Zundoko
    namespace: '{{ ansible_operator_meta.namespace }}'
    label_selectors:
    - hikawa.zundokokiyoshi.kaitoy.github.com = {{ ansible_operator_meta.name }}
  register: zundoko_list

#
# 実際のZundokoの数をもとにHikawaのstatusを更新する。
#
- name: Update Hikawa status
  when: _zundokokiyoshi_kaitoy_github_com_hikawa.status.kiyoshied is not defined or not _zundokokiyoshi_kaitoy_github_com_hikawa.status.kiyoshied
  operator_sdk.util.k8s_status:
    api_version: zundokokiyoshi.kaitoy.github.com/v1beta2
    kind: Hikawa
    name: '{{ ansible_operator_meta.name }}'
    namespace: '{{ ansible_operator_meta.namespace }}'
    status:
      numZundokosSaid: '{{ zundoko_list.resources | length }}'
      kiyoshied: false

#
# Hikawaのspec.numZundokosとstatus.numZundokosSaidの差異が無くなるようにZundokoを生成する。
#
- name: Create a Zundoko
  when: (zundoko_list.resources | length ) < (num_zundokos | int)
  block:
  - name: Do create a Zundoko
    community.kubernetes.k8s:
      state: present
      definition:
        apiVersion: zundokokiyoshi.kaitoy.github.com/v1beta1
        kind: Zundoko
        metadata:
          name: '{{ ansible_operator_meta.name }}-zundoko-{{ num_zundokos.zfill(4) }}'
          namespace: '{{ ansible_operator_meta.namespace }}'
          labels:
            hikawa.zundokokiyoshi.kaitoy.github.com: '{{ ansible_operator_meta.name }}'
        spec:
          say: '{{ ["Zun", "Doko"] | random }}'
  - name: Go to next loop
    fail:
      msg: Fail Intentionally in order to go to next loop

#
# Zundokoの一覧をみて、Kiyoshiを生成すべきか判定する。
# 生成すべきでなければ、Hikawaのspec.numZundokosをインクリメントして、Zundokoの生成を促す。
# 生成すべきであれば、Hikawaのspec.sayKiyoshiをtrueにして、Kiyoshiの生成を促す。
#
- name: Judge
  when: (zundoko_list.resources | length | string) == num_zundokos and not say_kiyoshi
  vars:
    zundokos: '{{ zundoko_list.resources | sort(attribute="metadata.name") | map(attribute="spec") | map(attribute="say") | join(" ") }}'
  block:
  - name: Increment numZundokos
    when: not zundokos.endswith('Zun Zun Zun Zun Doko')
    community.kubernetes.k8s:
      state: present
      definition:
        apiVersion: zundokokiyoshi.kaitoy.github.com/v1beta2
        kind: Hikawa
        metadata:
          name: '{{ ansible_operator_meta.name }}'
          namespace: '{{ ansible_operator_meta.namespace }}'
        spec:
          numZundokos: '{{ (num_zundokos | int) + 1 }}'
  - name: Set sayKiyoshi to True
    when: zundokos.endswith('Zun Zun Zun Zun Doko')
    community.kubernetes.k8s:
      state: present
      definition:
        apiVersion: zundokokiyoshi.kaitoy.github.com/v1beta2
        kind: Hikawa
        metadata:
          name: '{{ ansible_operator_meta.name }}'
          namespace: '{{ ansible_operator_meta.namespace }}'
        spec:
          sayKiyoshi: true

#
# Hikawaのspec.sayKiyoshiがtrueになっていたらKiyoshiを生成する。
#
- name: Kiyoshi !
  when: say_kiyoshi and not _zundokokiyoshi_kaitoy_github_com_hikawa.status.kiyoshied
  block:
  - name: Create a Kiyoshi
    community.kubernetes.k8s:
      state: present
      definition:
        apiVersion: zundokokiyoshi.kaitoy.github.com/v1beta1
        kind: Kiyoshi
        metadata:
          name: '{{ ansible_operator_meta.name }}-kiyoshi'
          namespace: '{{ ansible_operator_meta.namespace }}'
        spec:
          say: 'Kiyoshi !'
  - name: Update kiyoshied
    operator_sdk.util.k8s_status:
      api_version: zundokokiyoshi.kaitoy.github.com/v1beta2
      kind: Hikawa
      name: '{{ ansible_operator_meta.name }}'
      namespace: '{{ ansible_operator_meta.namespace }}'
      status:
        kiyoshied: true
```

Hikawaがユーザによって登録されると、上記Roleが実行される。
RoleのなかでHikawaの`spec`が更新されるので、それを契機にまた上記Roleが実行される、というのが、「キ・ヨ・シ！」に到達するまで続くという寸法。

「Get a list of all Zundokos」タスクで、Roleを起動したHikawaに属するZundokoだけを取得するためにラベルセレクタを使っているのは、オーナーリファレンスで絞り込む方法が分からなかったから。
KubebuilderでGoで書いたときは普通にオーナーリファレンスで絞れたんだけど…

「Create a Zundoko」タスクで、Zundokoを作ったあとに`fail`させてるのは、Roleをエラーにして再実行を促すため。
Hikawaの`watchDependentResources`を`true`にしておけば、Zundokoの作成を契機にRoleが実行されてくれると思ったんだけど、されなかったので、苦肉の策で`fail`させてる。
Goで書いたときはどうだったっけな…

## Zundoko Ansible Operatorのコンテナイメージのビルド
オペレータのDockerfileはOperator SDKが生成したものをそのまま使えた。

`Dockerfile`:
```
FROM quay.io/operator-framework/ansible-operator:v1.2.0

COPY requirements.yml ${HOME}/requirements.yml
RUN ansible-galaxy collection install -r ${HOME}/requirements.yml \
 && chmod -R ug+rwx ${HOME}/.ansible

COPY watches.yaml ${HOME}/watches.yaml
COPY roles/ ${HOME}/roles/
COPY playbooks/ ${HOME}/playbooks/
```

普通にDockerでビルドすればZundoko Ansible Operatorのコンテナイメージができる。

```console
[root zundoko-ansible-operator]# docker build -t kaitoy/zundoko-ansible-operator:0.0.1 .
```

## Zundoko Ansible Operatorのデプロイ
作ったオペレータのデプロイは、プロジェクトのルートディレクトリでコマンド一つ実行するだけでできる。

```console
[root zundoko-ansible-operator]# export IMG=zundoko-ansible-operator:0.0.1
[root zundoko-ansible-operator]# make deploy
```

これでZundoko Ansible Operatorが動き出した。

```console
[root zundoko-ansible-operator]# kubectl  get po --all-namespaces
NAMESPACE                         NAME                                                           READY   STATUS    RESTARTS   AGE
kube-system                       coredns-6b5cbb9f46-gzhgj                                       1/1     Running   2          3d21h
kube-system                       coredns-6b5cbb9f46-v8p9q                                       1/1     Running   3          12d
kube-system                       weave-net-28st9                                                2/2     Running   6          3d21h
zundoko-ansible-operator-system   zundoko-ansible-operator-controller-manager-7bcbf96f56-ccvcs   2/2     Running   0          26s
```

上記`make deploy`の中では、[kustomize](https://kustomize.io/)をダウンロードして、kustomizeでCRDとかDeploymentをレンダリングして、kubectlでそれらをapply、ということをしてくれてる。

因みに、Operator SDKはオペレータのPodSecurityPolicyは作ってくれないので、PodSecurityPolicyが有効な環境では自前で作っておいてやる必要がある。

## ズンドコきよし実行
Hikawaを登録するとズンドコしはじめる。

```console
[root zundoko-ansible-operator]# cat <<EOF | kubectl create -f -
apiVersion: zundokokiyoshi.kaitoy.github.com/v1beta2
kind: Hikawa
metadata:
  name: hikawa
spec:
  intervalMillis: 500
EOF
```

末尾にデモ動画を張っておくけど、Zundoko Ansible Operatorの動作はすごく遅くて、30秒に一回くらいしかZundokoを生成できない。
Ansible Roleの実行自体速くはないんだけど、多分Ansible Runnerの起動に時間がかかってるのが一番のボトルネック。

Ansible operatorはズンドコきよしには向かないという結果だった。

<br>

{{< youtube MNNNH-4lIZA >}}
