+++
categories = ["Programming"]
title = "IRSAに代わるEKS Pod Identityをさわる"
date = "2023-12-25T11:28:21+09:00"
tags = ["Kubernetes", "AWS", "eks"]
draft = false
cover = "eks.png"
slug = "eks-pod-identity"
highlight = true
highlightStyle = "monokai"
highlightLanguages = []
+++

いずれIRSAにとって代わると思われる、EKS Pod Identityをさわってみた記事。

<!--more-->

{{< google-adsense >}}

# EKS Pod Identityとは
[EKS Pod Identity](https://docs.aws.amazon.com/ja_jp/eks/latest/userguide/pod-identities.html)は、AWS EKSで動くPodにIAMロールを付与して、AWSリソースにアクセスできるようにするEKSの機能。
以前からあった同様の機能である[IAM roles for service accounts (IRSA)](https://docs.aws.amazon.com/ja_jp/eks/latest/userguide/iam-roles-for-service-accounts.html)を改善したものとして、[2023/11/26にリリース](https://aws.amazon.com/jp/blogs/aws/amazon-eks-pod-identity-simplifies-iam-permissions-for-applications-on-amazon-eks-clusters/)された。

EKS Pod IdentityもIRSA同様に、ServiceAccountとIAMロールを紐づけておくと、ServiceAccountトークンでそのIAMロールがAssumeRoleされる。
IRSAではPodがSTSと直接やり取りしてAssumeRoleするのに対して、EKS Pod Identityでは[EKS Pod Identity Agent](https://docs.aws.amazon.com/ja_jp/eks/latest/userguide/pod-id-how-it-works.html#pod-id-agent-pod)がPodの代わりにAssumeRoleを実行してくれる。

# IRSAとは
IRSAについては[以前の記事](https://www.kaitoy.xyz/2022/09/17/aws-irsa/)で詳しく解説した。
IRSAは要は、EKSと[IAM OIDC IDプロバイダ](https://docs.aws.amazon.com/ja_jp/IAM/latest/UserGuide/id_roles_providers_create_oidc.html)を連携させることで、EKSのKubernetesが発行するServiceAccountトークンをSTSで検証してAWS認証クレデンシャルに交換する仕組み。

# EKS Pod Identityの仕組み

![eks-pod-identity.png](/images/eks-pod-identity/eks-pod-identity.png)

EKS Pod Identityを図にするとこんな感じになるはず。
青い実線矢印はHTTPS通信で、緑の実線矢印はHTTP通信。

1. IRSAにも使われる[Amazon EKS Pod Identity Webhook (図中のPIdW)](https://github.com/aws/amazon-eks-pod-identity-webhook/)がEKSコントロールプレーンで動いていて、Container Credentials ConfigファイルからServiceAccountとIAMロールのマッピングをロードする。
2. EKSのkube-apiserverにPodを作るリクエストが来たら、kube-apiserverがその内容をPIdWに送る。
3. PIdWは、Podに指定されたServiceAccount名がContainer Credentials Configにあった場合、Podの定義をいじってService Account Token Volume Projectionと、環境変数の`AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE`と`AWS_CONTAINER_CREDENTIALS_FULL_URI`を挿入する。
    - `AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE`はPodにマウントされるService Account Tokenのパスを示す。
    - `AWS_CONTAINER_CREDENTIALS_FULL_URI`はEKS Pod Identity Agentのエンドポイント(リンクローカルアドレス)を示す。
4. kubeletは挿入されたService Account Token Volume Projectionを見て、それに対応するServiceAccountトークンをkube-apiserverに発行してもらう。
5. kubeletは、発行されたServiceAccountトークンをPodにマウントさせる。
6. Pod内で起動したコンテナ(のAWS SDK)は、AWSリソースにアクセスする際に、`AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE`が指定する場所にマウントされたServiceAccountトークンと、自身のServiceAccount名を、`AWS_CONTAINER_CREDENTIALS_FULL_URI`が示すEKS Pod Identity Agentのエンドポイントに投げる。
    - この処理は、AWS SDKのCredential provider chainの[Container credential provider](https://docs.aws.amazon.com/sdkref/latest/guide/feature-container-credentials.html)によるもの。
7. EKS Pod Identity Agentは、受け取ったServiceAccountトークンとServiceAccount名を使って、EKS Auth APIに対してAssumeRoleForPodIdentityを実行し、AWS認証クレデンシャルを取得してPodに返す。

#7のEKS Auth APIが裏でSTSと連携してくれてるんだろうけど、そのあたりは隠蔽されていて、IRSAみたいにIAM OIDC IDプロバイダをEKSクラスタごとに作って紐づける必要がないのが楽。
IAM OIDC IDプロバイダはAWSアカウント内に最大で100個までしか作れないハードリミットがあるが、EKS Pod Identityはそれを気にしなくていいということにもなる。

また、IRSAで使うIAMロールは、IAM OIDC IDプロバイダを指定する信頼ポリシーを付けないといけないので、対応するEKSクラスタ上のPod専用になってしまうけど、EKS Pod Identityで使うIAMロールはEKSクラスタ間で汎用的に使えるのが便利。

EKS Pod Identity AgentのソースやそれをデプロイするためのChartが[公開されていない](https://github.com/aws/containers-roadmap/issues/2239)のと、Container credential providerがAWS SDＫの新しめのバージョンでしか使えない点は懸念としてあるものの、IRSAよりかなり改善されているので、今後はなるべくEKS Pod Identityに移行していくのがいいと思われる。

# EKS Pod Identityを試す

EKS Pod Identityを使ってPodにS3アクセスさせてみる。
EKS Pod Identityは認証セッションにPodの情報を表す[タグ](https://docs.aws.amazon.com/ja_jp/eks/latest/userguide/pod-id-abac.html)を付与してくれるので、それをポリシーに活用するユースケースにする。

アクセスするS3バケットは以下のような中身。
`<EKSクラスタ名>/<k8s namespace名>/`というプレフィックスで、namespace毎にファイルを分けて管理しているイメージ。

```console
(aws) C:\Users\kaitoy>aws s3 ls --recursive s3://kaitoy-epi-test/
2023-12-22 18:57:28          0 epi-test/
2023-12-22 18:58:22          0 epi-test/default/
2023-12-22 18:59:41          0 epi-test/default/test.txt
2023-12-22 18:58:39          0 epi-test/hoge/
2023-12-22 19:00:06          0 epi-test/hoge/test.txt
```

因みにAWS CLIがv1しかEKS Pod Identityに対応してないので、今回は[Miniconda](https://docs.conda.io/projects/miniconda/en/latest/)にv1をインストールした環境を新たに作って試している。

## EKS構築
EKSは[eksctl](https://docs.aws.amazon.com/ja_jp/eks/latest/userguide/getting-started-eksctl.html)で1ノードの小さいやつを作った。
クラスタ名は`epi-test`で、IAM OIDC IDプロバイダ連携は無効で、PodのIMDSアクセスも無効。

```console
(aws) C:\Users\kaitoy>eksctl create cluster --name epi-test --region us-east-1 --version 1.28 --managed -t t3.medium -N 1 -m 1 -M 1 --node-volume-size 20 --spot --disable-pod-imds
2023-12-24 10:02:57 [ℹ]  eksctl version 0.167.0-rc.0
2023-12-24 10:02:57 [ℹ]  using region us-east-1
2023-12-24 10:03:03 [ℹ]  skipping us-east-1e from selection because it doesn't support the following instance type(s): t3.medium
2023-12-24 10:03:03 [ℹ]  setting availability zones to [us-east-1b us-east-1f]
2023-12-24 10:03:03 [ℹ]  subnets for us-east-1b - public:192.168.0.0/19 private:192.168.64.0/19
2023-12-24 10:03:03 [ℹ]  subnets for us-east-1f - public:192.168.32.0/19 private:192.168.96.0/19
2023-12-24 10:03:03 [ℹ]  nodegroup "ng-f99c5c98" will use "" [AmazonLinux2/1.28]
2023-12-24 10:03:03 [ℹ]  using Kubernetes version 1.28
2023-12-24 10:03:03 [ℹ]  creating EKS cluster "epi-test" in "us-east-1" region with managed nodes
2023-12-24 10:03:03 [ℹ]  will create 2 separate CloudFormation stacks for cluster itself and the initial managed nodegroup
2023-12-24 10:03:03 [ℹ]  if you encounter any issues, check CloudFormation console or try 'eksctl utils describe-stacks --region=us-east-1 --cluster=epi-test'
2023-12-24 10:03:03 [ℹ]  Kubernetes API endpoint access will use default of {publicAccess=true, privateAccess=false} for cluster "epi-test" in "us-east-1"
2023-12-24 10:03:03 [ℹ]  CloudWatch logging will not be enabled for cluster "epi-test" in "us-east-1"
2023-12-24 10:03:03 [ℹ]  you can enable it with 'eksctl utils update-cluster-logging --enable-types={SPECIFY-YOUR-LOG-TYPES-HERE (e.g. all)} --region=us-east-1 --cluster=epi-test'
2023-12-24 10:03:03 [ℹ]
2 sequential tasks: { create cluster control plane "epi-test",
    2 sequential sub-tasks: {
        wait for control plane to become ready,
        create managed nodegroup "ng-f99c5c98",
    }
}
2023-12-24 10:03:03 [ℹ]  building cluster stack "eksctl-epi-test-cluster"
2023-12-24 10:03:09 [ℹ]  deploying stack "eksctl-epi-test-cluster"
2023-12-24 10:03:39 [ℹ]  waiting for CloudFormation stack "eksctl-epi-test-cluster"
2023-12-24 10:04:15 [ℹ]  waiting for CloudFormation stack "eksctl-epi-test-cluster"
2023-12-24 10:05:21 [ℹ]  waiting for CloudFormation stack "eksctl-epi-test-cluster"
2023-12-24 10:06:27 [ℹ]  waiting for CloudFormation stack "eksctl-epi-test-cluster"
2023-12-24 10:07:33 [ℹ]  waiting for CloudFormation stack "eksctl-epi-test-cluster"
2023-12-24 10:08:38 [ℹ]  waiting for CloudFormation stack "eksctl-epi-test-cluster"
2023-12-24 10:09:44 [ℹ]  waiting for CloudFormation stack "eksctl-epi-test-cluster"
2023-12-24 10:10:50 [ℹ]  waiting for CloudFormation stack "eksctl-epi-test-cluster"
2023-12-24 10:11:56 [ℹ]  waiting for CloudFormation stack "eksctl-epi-test-cluster"
2023-12-24 10:13:02 [ℹ]  waiting for CloudFormation stack "eksctl-epi-test-cluster"
2023-12-24 10:15:34 [ℹ]  building managed nodegroup stack "eksctl-epi-test-nodegroup-ng-f99c5c98"
2023-12-24 10:15:40 [ℹ]  deploying stack "eksctl-epi-test-nodegroup-ng-f99c5c98"
2023-12-24 10:15:41 [ℹ]  waiting for CloudFormation stack "eksctl-epi-test-nodegroup-ng-f99c5c98"
2023-12-24 10:16:16 [ℹ]  waiting for CloudFormation stack "eksctl-epi-test-nodegroup-ng-f99c5c98"
2023-12-24 10:17:11 [ℹ]  waiting for CloudFormation stack "eksctl-epi-test-nodegroup-ng-f99c5c98"
2023-12-24 10:18:58 [ℹ]  waiting for CloudFormation stack "eksctl-epi-test-nodegroup-ng-f99c5c98"
2023-12-24 10:18:58 [ℹ]  waiting for the control plane to become ready
2023-12-24 10:18:59 [✔]  saved kubeconfig as "C:\\Users\\kaitoy\\.kube\\config"
2023-12-24 10:18:59 [ℹ]  no tasks
2023-12-24 10:18:59 [✔]  all EKS cluster resources for "epi-test" have been created
2023-12-24 10:19:05 [ℹ]  nodegroup "ng-f99c5c98" has 1 node(s)
2023-12-24 10:19:05 [ℹ]  node "ip-192-168-41-38.ec2.internal" is ready
2023-12-24 10:19:05 [ℹ]  waiting for at least 1 node(s) to become ready in "ng-f99c5c98"
2023-12-24 10:19:05 [ℹ]  nodegroup "ng-f99c5c98" has 1 node(s)
2023-12-24 10:19:05 [ℹ]  node "ip-192-168-41-38.ec2.internal" is ready
2023-12-24 10:19:09 [ℹ]  kubectl command should work with "C:\\Users\\kaitoy\\.kube\\config", try 'kubectl get nodes'
2023-12-24 10:19:09 [✔]  EKS cluster "epi-test" in "us-east-1" region is ready
```

## EKS Pod Identity Agentデプロイ

次にEKS Pod Identity Agentをデプロイする。

EKS Pod Identity Agentは、EKS Auth APIにアクセスするための権限をノードロールを継承することで得るため、ノードロールには[前提条件](https://docs.aws.amazon.com/ja_jp/eks/latest/userguide/pod-id-agent-setup.html#pod-id-agent-prereqs)があるんだけど、先ほど作ったEKSクラスタのノードロールにはAmazonEKSWorkerNodePolicyがついていたので条件を満たしている。
なお、プライベートクラスターにはした場合、EKS Pod Identity AgentがEKS Auth APIにアクセスするためのPrivateLinkが必要になるが、今回はしてないので不要。

前述の通り、EKS Pod Identity AgentはChartとか公開されてないので、EKSのアドオンとしてデプロイする必要がある。
以下のコマンドでデプロイできた。

```console
(aws) C:\Users\kaitoy>aws eks create-addon --cluster-name epi-test --addon-name eks-pod-identity-agent --addon-version v1.0.0-eksbuild.1
{
    "addon": {
        "addonName": "eks-pod-identity-agent",
        "clusterName": "epi-test",
        "status": "CREATING",
        "addonVersion": "v1.0.0-eksbuild.1",
        "health": {
            "issues": []
        },
        "addonArn": "arn:aws:eks:us-east-1:123456789012:addon/epi-test/eks-pod-identity-agent/aac64cc4-dd4b-c008-2c95-923d55db97f3",
        "createdAt": "2023-12-24T10:56:29.610000+09:00",
        "modifiedAt": "2023-12-24T10:56:29.641000+09:00",
        "tags": {}
    }
}
(aws) C:\Users\kaitoy>kubectl get po -n kube-system -l app.kubernetes.io/name=eks-pod-identity-agent
NAME                           READY   STATUS    RESTARTS   AGE
eks-pod-identity-agent-mzmrt   1/1     Running   0          88s
(aws) C:\Users\kaitoy>kubectl get daemonset -n kube-system eks-pod-identity-agent
NAME                     DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE   NODE SELECTOR   AGE
eks-pod-identity-agent   1         1         1       1            1           <none>          2m32s
```

EKS Pod Identity AgentはDaemonSetとしてデプロイされていることがわかる。

今回のクラスタではPodのIMDSアクセスを無効にしてあるが、EKS Pod Identity AgentのDaemonSetはhost networkで動くので、ノードロールを継承して動くことができる。

## IAMロール作成
今回の検証でS3アクセスのために使うIAMロールを作る。

まずIAMポリシーは以下の感じ。

epi-policy.json:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "s3:*",
      "Resource": "arn:aws:s3:::kaitoy-epi-test/${aws:PrincipalTag/eks-cluster-name}/${aws:PrincipalTag/kubernetes-namespace}/*"
    }
  ]
}
```

`aws:PrincipalTag/`がプレフィックスの変数が、EKS Pod Identityで取得したセッションに付けられるタグの値を利用する部分。
上記で、kaitoy-epi-testバケット内の、EKSクラスタ名とk8s namespace名をプレフィックスに含む部分についてフルアクセスを与えるポリシーになる。
これを`epi-s3`という名前で登録する。

```console
(aws) C:\Users\kaitoy>aws iam create-policy --policy-name epi-s3 --policy-document file://epi-policy.json
{
    "Policy": {
        "PolicyName": "epi-s3",
        "PolicyId": "ANPA23E2UCQAPCZBKCPXL",
        "Arn": "arn:aws:iam::123456789012:policy/epi-s3",
        "Path": "/",
        "DefaultVersionId": "v1",
        "AttachmentCount": 0,
        "PermissionsBoundaryUsageCount": 0,
        "IsAttachable": true,
        "CreateDate": "2023-12-24T02:40:17+00:00",
        "UpdateDate": "2023-12-24T02:40:17+00:00"
    }
}
```

<br>

Podに与えたいIAMロールに付ける信頼ポリシーは、IRSAと違って常に同じで、以下の内容でいい。

epi-trust-policy.json:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowEksAuthToAssumeRoleForPodIdentity",
      "Effect": "Allow",
      "Principal": {
        "Service": "pods.eks.amazonaws.com"
      },
      "Action": [
        "sts:AssumeRole",
        "sts:TagSession"
      ]
    }
  ]
}
```

<br>

これらのポリシーを使ってIAMロールを作る。
ロール名は`epi-bucket-user`。

```console
(aws) C:\Users\kaitoy>aws iam create-role --role-name epi-bucket-user --assume-role-policy-document file://epi-trust-policy.json
{
    "Role": {
        "Path": "/",
        "RoleName": "epi-bucket-user",
        "RoleId": "AROA23E2UCQACC2YRQMPX",
        "Arn": "arn:aws:iam::123456789012:role/epi-bucket-user",
        "CreateDate": "2023-12-24T03:01:48+00:00",
        "AssumeRolePolicyDocument": {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Sid": "AllowEksAuthToAssumeRoleForPodIdentity",
                    "Effect": "Allow",
                    "Principal": {
                        "Service": "pods.eks.amazonaws.com"
                    },
                    "Action": [
                        "sts:AssumeRole",
                        "sts:TagSession"
                    ]
                }
            ]
        }
    }
}
(aws) C:\Users\kaitoy>aws iam attach-role-policy --role-name epi-bucket-user --policy-arn=arn:aws:iam::123456789012:policy/epi-s3
```

## ServiceAccountとIAMロールの紐づけ

先ほど作ったIAMロールをServiceAccountに紐づける。
まず紐づけるServiceAccountを作る。

```
(aws) C:\Users\kaitoy>kubectl create serviceaccount aws-cli -n default
serviceaccount/aws-cli created
```

`aws-cli`という名前でnamespaceは`default`にした。

<br>

次にIAMロールへの紐づけを登録する。
(この紐づけに使う`create-pod-identity-association`というサブコマンドがAWS CLI v2ではまだ実装されていない。)

```console
(aws) C:\Users\kaitoy>aws eks create-pod-identity-association --cluster-name epi-test --role-arn arn:aws:iam::123456789012:role/epi-bucket-user --namespace default --service-account aws-cli
{
    "association": {
        "clusterName": "epi-test",
        "namespace": "default",
        "serviceAccount": "aws-cli",
        "roleArn": "arn:aws:iam::123456789012:role/epi-bucket-user",
        "associationArn": "arn:aws:eks:us-east-1:123456789012:podidentityassociation/epi-test/a-4fwzdkmxwj5oml2oq",
        "associationId": "a-4fwzdkmxwj5oml2oq",
        "tags": {},
        "createdAt": 1703388080.466,
        "modifiedAt": 1703388080.466
    }
}
```

この、ServiceAccountとIAMロールのマッピング情報は、EKS(i.e. AWS)上でだけ管理されて、k8sリソースとしては何も表現されないっぽい。
k8sリソースと関係なく管理される情報なので、指定するnamespaceやServiceAccountは既存でなくてもいい。

ここで登録したマッピング情報は、(たぶん)Container Credentials ConfigファイルとしてPIdWに渡される。

因みにこの紐づけは[eksctlでもできる](https://eksctl.io/usage/pod-identity-associations/)し、eksctlならIRSAからの移行コマンドもある。

## IAMロールを使うPodのデプロイ

以上でEKS Pod Identityを使う準備ができたので、いよいよPodをデプロイしてみる。
コンテナイメージは[AWS CLIの公式イメージ](https://gallery.ecr.aws/aws-cli/aws-cli)。

まず、ServiceAccountを指定しないでPodをdefault namespaceにデプロイし、S3バケット内のファイルにアクセスしてみる。

```console
(aws) C:\Users\kaitoy>kubectl run -n default --rm -it aws-cli --image=public.ecr.aws/aws-cli/aws-cli:2.15.3 -- s3 cp s3://kaitoy-epi-test/epi-test/default/text.txt .
If you don't see a command prompt, try pressing enter.


Unable to locate credentials. You can configure credentials by running "aws configure".
Session ended, resume using 'kubectl attach aws-cli -c aws-cli -i -t' command when the pod is running
pod "aws-cli" deleted
```

予想通りAWSクレデンシャルが見つからないという結果に。

次に、IAMロールを紐づけたServiceAccount(i.e. `aws-cli`)を指定する。

```console
(aws) C:\Users\kaitoy> kubectl run -n default --rm -it aws-cli --image=public.ecr.aws/aws-cli/aws-cli:2.15.3 --overrides='{ "spec": { "serviceAccount": "aws-cli" }  }' -- s3 cp s3://kaitoy-epi-test/epi-test/default/test.txt .
If you don't see a command prompt, try pressing enter.

download: s3://kaitoy-epi-test/epi-test/default/test.txt to ./test.txt
pod "aws-cli" deleted
```

ファイルの取得ができた。

最後に、セッションタグによるアクセス制御が期待通りできていることを確かめるため、defaultじゃないパス(`/epi-test/hoge/test.txt`)にアクセスしてみる。

```console
(aws) C:\Users\kaitoy> kubectl run -n default --rm -it aws-cli --image=public.ecr.aws/aws-cli/aws-cli:2.15.3 --overrides='{ "spec": { "serviceAccount": "aws-cli" }  }' -- s3 cp s3://kaitoy-epi-test/epi-test/hoge/test.txt .
If you don't see a command prompt, try pressing enter.

fatal error: An error occurred (403) when calling the HeadObject operation: Forbidden
pod "aws-cli" deleted
```

ちゃんとForbiddenになった。
