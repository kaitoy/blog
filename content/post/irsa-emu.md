+++
categories = ["Programming"]
title = "EKSの外でIAM Roles for Service Accountsっぽいことを実現するMutating Admission Webhookを作った"
date = "2022-09-04T22:14:29+09:00"
tags = ["kubernetes", "eks", "irsa-emu", "localstack", "vault", "aws", "iam"]
draft = false
cover = "eks.png"
slug = "irsa-emu"
highlight = true
highlightStyle = "monokai"
highlightLanguages = []
+++

バニラなKubernetesクラスタの上でMutating Admission Webhookとして動いて、IAM Roles for Service Accounts (IRSA)をエミュレートするアプリを作った話。

<!--more-->

{{< google-adsense >}}

# 背景
EKSで動くサービスを開発している場合、開発環境を開発メンバ各自でデプロイしているとAWSサービスのコストがかさむし、AWSのサービスクォータにひっかかったりする問題がある。

手元のKubernetesクラスタにサービスをデプロイしていじれたら捗りそうだけど、そのためにはAWSサービスに依存している部分をなんとか何かで代用しないといけなくて、一方開発用のデプロイのためにソースやk8sマニフェストにあまり手を入れたくはない。

LocalStackでAWSサービスをモックすればいい感じにできそうだけど、IRSAはどうすればいいんだろ?
LocalStackの[AWS Service Feature Coverage](https://docs.localstack.cloud/aws/feature-coverage/)をよく見ると、IAMのOIDCプロバイダをサポートしてないのでIRSAなんともならないんじゃないの?

と思ったのがこの記事に書いた取り組みのきっかけ。

あとでよく調べて考え直したら、[Amazon EKS Pod Identity Webhook](https://github.com/aws/amazon-eks-pod-identity-webhook)でもっとシュッと解決できそうだったので、それについてはまた別の記事で書きたい。

# IAM Roles for Service Accounts (IRSA)とは
[IAM Roles for Service Accounts (IRSA)](https://docs.aws.amazon.com/ja_jp/eks/latest/userguide/iam-roles-for-service-accounts.html)は、IAMロールをEKSのServiceAccountに紐づける機能。

IRSAを使うには、IAMにOIDCプロバイダの設定をちょろっとして、特定の信頼ポリシーを付けたIAMロールを作っておいて、ServiceAccountのアノテーションに`eks.amazonaws.com/role-arn: <IAMロールのARN>`を付けるだけ。
そうしておくと、そのServiceAccountを付けたPodがそのIAMロールの権限でAWSサービスにアクセスできる。

IRSAの仕組みは、EKSで動くとある[Mutating Admission Webhook](https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/#mutatingadmissionwebhook)が、[Service Account Token Volume Projection](https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/#service-account-token-volume-projection)を利用してPodにOIDCのIDトークンを挿入して、Pod上のAWS SDKがそのIDトークンで[AssumeRoleWithWebIdentity](https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRoleWithWebIdentity.html)してIAMロールのアクセスクレデンシャルを取得する、という感じ。
詳しくは[別の記事](https://www.kaitoy.xyz/2022/09/17/aws-irsa/)で書いた。

# LocalStackとは
[LocalStack](https://localstack.cloud/)はAWSサービスのモックを提供するアプリ。
IAM、S3、KMS、DynamoDB、Kinesisとかのモックが無料で使える。
有料のPro版ならEKS、ECR、ELB、EFSとかのモックもできてすごそうだけど、どこまでちゃんとエミュレートしてくれるか若干怪しいのと、どうせお金払うならAWSに払えばいい気はする。

意外(?)にもLocalStackはコンテナ一つで動いて、Helm chartが公式から提供されてるので、デプロイが簡単なのがうれしい。

# やりたいこと
EKS上で[HashiCorp Vault](https://www.vaultproject.io/)をPodで動かして利用するシステムがあるとする。
Vaultは秘匿情報を管理するアプリで、このシステムのVaultは[AWS KMS](https://aws.amazon.com/jp/kms/)と連携して秘匿情報の暗号化キーを暗号化している([awskms Seal](https://www.vaultproject.io/docs/configuration/seal/awskms))。
VaultからAWS KMSへのアクセスはIRSAを使っている。

このシステムの開発環境として、ローカルのバニラなKubernetesクラスタでVaultのPodを動かし、[LocalStack](https://localstack.cloud/)でKMSをモックしたい。
主な課題は、EKSじゃないバニラなKubernetesクラスタでIRSAをどう実現するかということ。
あとVaultとLocalStackをどう連携させるかというのもちょっとある。

# IRSAをエミュレートするirsa-emu
バニラなKubernetesクラスタでIRSAを実現するために、[irsa-emu](https://github.com/kaitoy/irsa-emu)というのを作った。

irsa-emuは、Podに対するMutating Admission Webhookと、それによってPodに挿入され、AWSのアクセスクレデンシャルを管理するサイドカーで構成される。
webhookのほうは[Kubewebhook](https://github.com/slok/kubewebhook)というGoのフレームワークを使った。(このフレームワークの詳細は別の記事で書くかも。)
サイドカーはAWS SDK使おうかとも思ったけど、面倒^H^Hそれほど複雑なこともしないのでawsコマンドを叩くだけのbashスクリプトで済ました。

irsa-emuは以下のように動作する。

![irsa-emu.png](/images/irsa-emu/irsa-emu.png)

1. PodをKubernetesに登録すると、
2. irsa-emuのwebhookにそのPodが送られる。
3. irsa-emuのwebhookは、そのPodのServiceAccountを見て、アノテーションに`eks.amazonaws.com/role-arn: <IAMロールのARN>`が付いてたらサイドカーをPodに挿入してKubernetesに返す。
4. KubernetesがそのPodをデプロイすると、
5. サイドカーがAssumeRoleを実行してアクセスクレデンシャルを取得する。
6. Vaultはそのアクセスクレデンシャルを使ってKMSにアクセスする。

`#5`で、サイドカーのコンテナからVaultのコンテナにアクセスクレデンシャルを渡すために、両者で共有する[empyDir](https://kubernetes.io/ja/docs/concepts/storage/volumes/#emptydir)にサイドカー側から[credentialsファイル](https://docs.aws.amazon.com/ja_jp/cli/latest/userguide/cli-configure-files.html#cli-configure-files-where)を書き込む。
Vaultコンテナにはirsa-emuのwebhookが環境変数[AWS_SHARED_CREDENTIALS_FILE](https://docs.aws.amazon.com/ja_jp/cli/latest/userguide/cli-configure-envvars.html#envvars-list-AWS_SHARED_CREDENTIALS_FILE)を挿入して、サイドカーが挿入したcredentialsファイルを読ませるようにする。

# irsa-emuの動作確認
以下、バニラKubernetesクラスタに実際にirsa-emuをデプロイして、Vaultのawskms Sealを動かしてみる。

## AWS側の設定
上でLocalStackに触れたんだけど、まずはAWSの本物のKMSでawskms Sealするところからやる。
そのためにAWS側にいくつかリソースを作っておく必要がある。

AWS側には、KMSで対称キーを一つ作っておいて、そのキーをVaultが使うためのIAMロールを作っておく。
すなわち、キーのIDが`f4f7a2e2-c5c6-ea6d-dc42-526ef280e794`だとすると、以下のようなIAMポリシーをつけたIAMロールを作っておく。

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "kms:Decrypt",
      "kms:Encrypt",
      "kms:DescribeKey"
    ],
    "Resource": "arn:aws:kms:us-east-1:123456789012:key/f4f7a2e2-c5c6-ea6d-dc42-526ef280e794"
  }]
}
```

このIAMロールの名前は`Vault-AWSKMS`とする。
このIAMロールには、本物のIRSAを使う場合には、以下のような信頼ポリシーを付けて、特定のServiceAccountからAssumeRoleWithWebIdentityされることを許可する。

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "Federated": "arn:aws:iam::123456789012:oidc-provider/oidc.eks.us-east-1.amazonaws.com/id/11223344456677889900AABBCCDDEEFF"
    },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": {
        "oidc.eks.us-east-1.amazonaws.com/id/11223344456677889900AABBCCDDEEFF:sub": "system:serviceaccount:kube-system:vault"
      }
    }
  }]
}
```

今回はirsa-emuを使うので、代わりに以下のようにAssumeRoleされることを許可する雑な信頼ポリシーを付ける。

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "AWS": "arn:aws:iam::123456789012:root"
    },
    "Action": "sts:AssumeRole",
    "Condition": {}
  }]
}
```

あとは、適当なIAMユーザを作って、そのユーザに以下のようなIAMポリシーを紐づけて、`Vault-AWSKMS`に対するAssumeRoleの実行を許可しておく。

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": "sts:AssumeRole",
    "Resource": "arn:aws:iam::123456789012:role/Vault-AWSKMS"
  }]
}
```

このIAMユーザの名前は`IRSA-emu`とする。

## irsa-emuのデプロイ
irsa-emuをデプロイしてみる環境として、ノートPCでVMWare Playerで作ったCentOS 7.9のVMに、[手製のAnsible Playbook](https://github.com/kaitoy/ansible-k8s)を使って1ノードのKubernetes 1.21.2のクラスタを構築した。

irsa-emuのwebhook([irsa-emu-webhook](https://registry.hub.docker.com/r/kaitoy/irsa-emu-webhook))とサイドカー([irsa-emu-creds-injector](https://registry.hub.docker.com/r/kaitoy/irsa-emu-creds-injector))のコンテナイメージはDocker Hubにおいてあって、
[Helm chart](https://github.com/kaitoy/irsa-emu/tree/master/chart)も書いたので、irsa-emuのデプロイはそれをinstallするだけでいい。

まず、サイドカーに渡すAWSアクセスクレデンシャル(IAMユーザ`IRSA-emu`のやつ)をBase64エンコードしてどこかのYAMLファイルに以下のように書いておく。

/tmp/irsa-emu-values.yaml:
```yaml
sidecar:
  awsAccessKeyId: RG8gMjAgc2l0LXVwcyBvbmNlIHlvdSBzZWUgdGhpcyBtZXNzYWdl
  awsSecretAccessKey: ICBfICAgICAgXyAgICAgIF8KPiguKV9fIDwoLilfXyA9KC4pCiAoX19fLyAgKF9fXy8gIChfX18vCgo=
  awsDefaultRegion: dXMtZWFzdC0x
```

これを読ませてhelm installすればirsa-emuのwebhookのpodが動き、Mutating Admission Webhookとして登録される。

```console
[root@vm-1 ~]# git clone https://github.com/kaitoy/irsa-emu.git
[root@vm-1 ~]# cd irsa-emu/chart
[root@vm-1 chart]# helm install irsa-emu -n kube-system -f /tmp/irsa-emu-values.yaml .
```

## Vaultのデプロイ
Vaultも[Helm chart](https://github.com/hashicorp/vault-helm)がある。

`helm install`時に渡すパラメータは以下のようなもので、awskms Sealの設定としてKMSキーのIDを渡し、ServiceAccountにIRSAのアノテーションを付けてIAMロール`Vault-AWSKMS`を指定する。

/tmp/vault-values.yaml:
```yaml
injector:
  enabled: false

server:
  authDelegator:
    enabled: false
  service:
    type: NodePort
    nodePort: 30000
  dataStorage:
    enabled: false
  auditStorage:
    enabled: false
  standalone:
    config: |
      ui = true
      listener "tcp" {
        tls_disable = 1
        address = "[::]:8200"
        cluster_address = "[::]:8201"
      }
      storage "file" {
        path = "/home/vault"
      }
      seal "awskms" {
        region     = "us-east-1"
        kms_key_id = "f4f7a2e2-c5c6-ea6d-dc42-526ef280e794"
      }
  serviceAccount:
    create: true
    annotations:
      eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/Vault-AWSKMS
```

これを渡して`helm install`すると、Vaultをデプロイできる。

```console
[root@vm-1 ~]# helm repo add hashicorp https://helm.releases.hashicorp.com
[root@vm-1 ~]# helm install vault -n kube-system -f /tmp/vault-values.yaml hashicorp/vault
```

あとはVaultの`/sys/init` APIで初期化してやると、データの暗号化キーが生成され、そのキーがVaultのrootキーで暗号化され、そのrootキーがKMSキーで暗号化される。
rootキーはまたすぐに復号化されて、Vaultが使える状態(i.e. unsealed)になる。

```console
[root@vm-1 ~]# curl -XPOST http://$(hostname -i):30000/v1/sys/init -d '{"secret_shares": 3, "secret_threshold": 3, "recovery_shares": 3, "recovery_threshold": 3}'
{"keys":[],"keys_base64":[],"recovery_keys":["1e21b0caae70195a93eecda2f2023c3ffda475fe3975a79c789530b09a392fec2b","a26d3b1aa7f78efd374f267a29fe137f2436c6a535b38621942397f35e5c4ae4c5","c782a47cb89783962cd85743c263aefb180d4fdbed68055c73e401257ba64745b4"],"recovery_keys_base64":["HiGwyq5wGVqT7s2i8gI8P/2kdf45daeceJUwsJo5L+wr","om07Gqf3jv03TyZ6Kf4TfyQ2xqU1s4YhlCOX815cSuTF","x4KkfLiXg5Ys2FdDwmOu+xgNT9vtaAVcc+QBJXumR0W0"],"root_token":"hvs.T9qb52cDHJFlWEdexj86Nem6"}
[root@vm-1 ~]# curl -s http://$(hostname -i):30000/v1/sys/health | jq .sealed
false
```

これでawskms Sealが動いたことが確認できた。

Vaultのpodの中をのぞくと、以下のようにサイドカーのirsa-emu-creds-injectorが追加されて、credentialsファイルが挿入されてるのが見れる。

```console
[root@vm-1 ~]# kubectl get po -n kube-system vault-0 -o jsonpath='{.spec.containers[*].name}{"\n"}'
vault irsa-emu-creds-injector-798b0e7e69
[root@vm-1 ~]# kubectl exec -it -n kube-system vault-0 -c vault -- sh -c 'ls -l $AWS_SHARED_CREDENTIALS_FILE'
-rw-r--r--    1 vault    vault          879 Sep  4 07:08 /var/run/secrets/irsa-emu.kaitoy.xyz/shared_credentials/credentials
```

## LocalStackのデプロイ
次に、LocalStackでIRSAしてawskms Sealを動かす。

LocalStackもHelmで簡単にデプロイできる。

```console
[root@vm-1 ~]# helm repo add localstack-repo https://helm.localstack.cloud
[root@vm-1 ~]# helm install localstack localstack-repo/localstack
```

LocalStackのアカウントIDは`000000000000`で、適当なクレデンシャルでアクセスするとrootユーザあつかいになる。

```console
[root@vm-1 ~]# export LS_PORT=$(kubectl get --namespace default -o jsonpath="{.spec.ports[0].nodePort}" services localstack)
[root@vm-1 ~]# export LS_IP=$(kubectl get nodes --namespace default -o jsonpath="{.items[0].status.addresses[0].address}")
[root@vm-1 ~]# echo ${LS_IP}:${LS_PORT}
192.168.11.201:31566
[root@vm-1 ~]# export AWS_ACCESS_KEY_ID=hoge
[root@vm-1 ~]# export AWS_SECRET_ACCESS_KEY=huga
[root@vm-1 ~]# aws --endpoint-url=http://${LS_IP}:${LS_PORT} sts get-caller-identity --region us-east-1
{
    "UserId": "AKIAIOSFODNN7EXAMPLE",
    "Account": "000000000000",
    "Arn": "arn:aws:iam::000000000000:root"
}
```

無料版LocalStackの認証はこんな感じで適当で、IAMポリシーによるアクセス制御も働かないので、Vaultのために事前にIAMリソースを作っておく必要はない。
KMSのキーだけ作っておく。

```console
[root@vm-1 ~]# aws --endpoint-url=http://$LS_IP:$LS_PORT kms create-key --region us-east-1 --key-spec SYMMETRIC_DEFAULT --origin AWS_KMS
{
    "KeyMetadata": {
        "AWSAccountId": "000000000000",
        "KeyId": "e054ced2-6879-4a6d-9fcf-4a02a1a62d1e",
        "Arn": "arn:aws:kms:us-east-1:000000000000:key/e054ced2-6879-4a6d-9fcf-4a02a1a62d1e",
        "CreationDate": "2022-09-04T17:33:55.416098+09:00",
        "Enabled": true,
        "Description": "",
        "KeyState": "Enabled",
        "Origin": "AWS_KMS",
        "KeyManager": "CUSTOMER",
        "CustomerMasterKeySpec": "SYMMETRIC_DEFAULT",
        "KeySpec": "SYMMETRIC_DEFAULT",
        "EncryptionAlgorithms": [
            "SYMMETRIC_DEFAULT"
        ],
        "SigningAlgorithms": [
            "RSASSA_PKCS1_V1_5_SHA_256",
            "RSASSA_PKCS1_V1_5_SHA_384",
            "RSASSA_PKCS1_V1_5_SHA_512",
            "RSASSA_PSS_SHA_256",
            "RSASSA_PSS_SHA_384",
            "RSASSA_PSS_SHA_512"
        ]
    }
}
```

## irsa-emuとVaultをLocalStackに向ける

いったんVaultはuninstallしておく。

```console
[root@vm-1 ~]# helm uninstall -n kube-system vault
```

irsa-emuは、`stsEndpointURL`というパラメータにLocalStackのURLを渡してデプロイしなおせば、LocalStackに対して動くようになる。

/tmp/irsa-emu-values.local.yaml:
```yaml
sidecar:
  awsAccessKeyId: RG8gMjAgc2l0LXVwcyBvbmNlIHlvdSBzZWUgdGhpcyBtZXNzYWdl
  awsSecretAccessKey: ICBfICAgICAgXyAgICAgIF8KPiguKV9fIDwoLilfXyA9KC4pCiAoX19fLyAgKF9fXy8gIChfX18vCgo=
  awsDefaultRegion: dXMtZWFzdC0x
  stsEndpointURL: http://192.168.11.201:31566
```

`helm upgrade`でパラメータを反映する。

```console
[root@vm-1 chart]# helm upgrade irsa-emu -n kube-system -f /tmp/irsa-emu-values.local.yaml .
```

Vaultは`endpoint`というパラメータにLocalStackのURLを渡せばいい。

/tmp/vault-values.local.yaml:
```yaml
injector:
  enabled: false

server:
  authDelegator:
    enabled: false
  service:
    type: NodePort
    nodePort: 30000
  dataStorage:
    enabled: false
  auditStorage:
    enabled: false
  standalone:
    config: |
      ui = true
      listener "tcp" {
        tls_disable = 1
        address = "[::]:8200"
        cluster_address = "[::]:8201"
      }
      storage "file" {
        path = "/home/vault"
      }
      seal "awskms" {
        region     = "us-east-1"
        kms_key_id = "e054ced2-6879-4a6d-9fcf-4a02a1a62d1e"
        endpoint   = "http://192.168.11.201:31566"
      }
  serviceAccount:
    create: true
    annotations:
      eks.amazonaws.com/role-arn: arn:aws:iam::000000000000:role/Hoge
```

このYamlで`helm install`して、そのあとVaultの初期化もする。

```console
[root@vm-1 ~]# helm install vault -n kube-system -f /tmp/vault-values.local.yaml hashicorp/vault
[root@vm-1 ~]# curl -XPOST http://$(hostname -i):30000/v1/sys/init -d '{"secret_shares": 3, "secret_threshold": 3, "recovery_shares": 3, "recovery_threshold": 3}'
{"keys":[],"keys_base64":[],"recovery_keys":["0db24458560242cc9b66c8bd4e83fbe3568cece1095115e9388489ec9fd8c8b472","aff3e5050bd0cd5f751de1c5f6cfa8c000e5619f825dcfe8644be0efe9e5c58421","10fdcc8c1bc3410e3325a80380d1d781a0a1b74b29b9a216eb45fd6633d8fa9be9"],"recovery_keys_base64":["DbJEWFYCQsybZsi9ToP741aM7OEJURXpOISJ7J/YyLRy","r/PlBQvQzV91HeHF9s+owADlYZ+CXc/oZEvg7+nlxYQh","EP3MjBvDQQ4zJagDgNHXgaCht0spuaIW60X9ZjPY+pvp"],"root_token":"hvs.MDMdapW5VEFlLk2IBh1kG8K2"}
[root@vm-1 ~]# curl -s http://$(hostname -i):30000/v1/sys/health | jq .sealed
false
```

LocalStackでもちゃんと動いた。
