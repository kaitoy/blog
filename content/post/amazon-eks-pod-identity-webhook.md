+++
categories = ["Programming"]
title = "IAM Roles for Service AccountsをLocalStackとAmazon EKS Pod Identity Webhookで実装する"
date = "2022-09-25T14:19:11+09:00"
tags = ["AWS", "eks", "iam", "irsa", "Kubernetes", "localstack"]
draft = false
cover = "eks.png"
slug = "amazon-eks-pod-identity-webhook"
highlight = true
highlightStyle = "monokai"
highlightLanguages = []
+++

AWS EKSのIAM Roles for Service AccountsをローカルのバニラなKubernetesで実現したくて、LocalStackとAmazon EKS Pod Identity Webhookでやってみたら意外と苦労した話。

<!--more-->

[以前の記事の「EKSの外でIAM Roles for Service Accountsっぽいことを実現するMutating Admission Webhookを作った」](https://www.kaitoy.xyz/2022/09/04/irsa-emu/)と実現したいことは同じだけど、そのとき作ったirsa-emuの代わりに、今回はAWS製のAmazon EKS Pod Identity Webhookを使う。

{{< google-adsense >}}

# IAM Roles for Service Accounts (IRSA)とは
[IAM Roles for Service Accounts (IRSA)](https://docs.aws.amazon.com/ja_jp/eks/latest/userguide/iam-roles-for-service-accounts.html)は、IAMロールをEKSのServiceAccountに紐づける機能。

IRSAを使うには、IAMにOIDCプロバイダの設定をちょろっとして、特定の信頼ポリシーを付けたIAMロールを作っておいて、ServiceAccountのアノテーションに`eks.amazonaws.com/role-arn: <IAMロールのARN>`を付けるだけ。
そうしておくと、そのServiceAccountを付けたPodがそのIAMロールの権限でAWSサービスにアクセスできる。

# IRSAの仕組み
詳しくは[ひとつ前の記事](https://www.kaitoy.xyz/2022/09/17/aws-irsa/)で書いたのでここでは簡単に説明すると、[Amazon EKS Pod Identity Webhook](https://github.com/aws/amazon-eks-pod-identity-webhook/)がPodにServiceAccountトークンを挿入して、それを使ってPod内のAWSクライアントが[AssumeRoleWithWebIdentity](https://docs.aws.amazon.com/ja_jp/IAM/latest/UserGuide/id_credentials_temp_request.html#api_assumerolewithwebidentity)を実行して、`eks.amazonaws.com/role-arn`で指定したIAMロールの[一時的な認証情報](https://docs.aws.amazon.com/ja_jp/IAM/latest/UserGuide/id_credentials_temp_use-resources.html)を取得して、AWSサービスにアクセスするというもの。

# LocalStackとは
[LocalStack](https://localstack.cloud/)はAWSサービスのモックを提供するアプリ。
有償なPro版と無償版があって、無償版でもIAM、S3、KMS、DynamoDB、Kinesisとかのモックが使えてすごい。

けどEKSは有償版でしかサポートしてないし、[IAMのOIDCプロバイダとかフェデレーション](https://docs.aws.amazon.com/ja_jp/IAM/latest/UserGuide/id_roles_providers.html)はどちらの版でもサポートしてないので、ちゃんとしたIRSAをぱっと実現できるようにはなっていない。

ただ、無償版のLocalStackのIAMの実装がいい感じに雑で、AssumeRoleWithWebIdentityをどんなトークンで実行しても、任意のIAMロールの認証情報を取得できるので、雑なIRSAは実現できるはずと考えたのがこの記事の取り組みのきっかけ。

つまり、ひとつ前の記事でIRSAの処理の流れを書いた下図でいうと、#6~9をすっとばすので、Amazon EKS Pod Identity WebhookさえあればIAMのOIDCプロバイダとかフェデレーションなんかとは関係なく動くはず、ということ。

![irsa.png](/images/aws-irsa/irsa.png)

# LocalStackに対するIRSAの実装
irsa-emuのときと同様に、手元のバニラなKubernetes 1.21.2のクラスタにLocalStackをデプロイして、そのKMSで[HashiCorp Vault](https://www.vaultproject.io/)の[awskms Seal](https://www.vaultproject.io/docs/configuration/seal/awskms)を動かすことをめざす。

## Amazon EKS Pod Identity Webhookのデプロイ
まずAmazon EKS Pod Identity Webhookをデプロイするんだけど、そのWebhookサーバのTLS証明書を作るために[cert-manager](https://cert-manager.io/docs/)が要るので、それを先に入れる。

cert-managerはGitHubに上がっているマニフェストをapplyするだけでデプロイできる。
v1.9.1を入れる。

```console
[root@vm-1 ~]# kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.9.1/cert-manager.yaml
[root@vm-1 ~]# kubectl get po -n cert-manager
NAME                                      READY   STATUS    RESTARTS   AGE
cert-manager-55649d64b4-xcmlx             1/1     Running   0          23s
cert-manager-cainjector-666db4777-vsz2q   1/1     Running   0          23s
cert-manager-webhook-6466bc8f4-x24mp      1/1     Running   0          23s
```

<br>

Amazon EKS Pod Identity Webhookはv0.4.0を使う。
makeでデプロイできる。

```console
[root@vm-1 ~]# git clone https://github.com/aws/amazon-eks-pod-identity-webhook.git
[root@vm-1 ~]# cd amazon-eks-pod-identity-webhook/
[root@vm-1 amazon-eks-pod-identity-webhook]# git checkout v0.4.0
[root@vm-1 amazon-eks-pod-identity-webhook]# make cluster-up IMAGE=amazon/amazon-eks-pod-identity-webhook:v0.4.0
```

makeを実行すると、[Waiting for CSR to be created](https://github.com/aws/amazon-eks-pod-identity-webhook/blob/v0.4.0/Makefile#L86)というメッセージが出続けて処理が終わらないけど、これはSIGINTで止めていい。
CSRというのはWebhookサーバのTLS証明書を生成するためのもので、v0.3.0以前はその処理を[Kubernetesのclient-goのcertificate.Manager](https://github.com/aws/amazon-eks-pod-identity-webhook/blob/v0.4.0/pkg/cert/request.go)で実装していて、つまりKubernetesの[Certificates API](https://kubernetes.io/docs/reference/access-authn-authz/certificate-signing-requests/)を使っていた。
v0.4.0では[Certificates APIからcert-managerに移行済み](https://github.com/aws/amazon-eks-pod-identity-webhook/blob/v0.4.0/README.md?plain=1#L248)だし、「Waiting for CSR to be created」のあとの処理もCSRの承認しかないので、止めてしまって問題ない。
以下のようにちゃんとデプロイできている。

```console
[root@vm-1 amazon-eks-pod-identity-webhook]# kubectl get po
NAME                                    READY   STATUS    RESTARTS   AGE
pod-identity-webhook-665f8649bc-t86cq   1/1     Running   1          57s
```

## LocalStackのデプロイ
LocalStackはirsa-emuのときと同様にHelmでデプロイする。

```console
[root@vm-1 ~]# helm repo add localstack-repo https://helm.localstack.cloud
[root@vm-1 ~]# helm install localstack localstack-repo/localstack
[root@vm-1 ~]# kubectl get po
NAME                                    READY   STATUS    RESTARTS   AGE
pod-identity-webhook-665f8649bc-t86cq   1/1     Running   0          11m
localstack-6498fc9748-dbph6             1/1     Running   0          31s
[root@vm-1 ~]# kubectl get svc localstack
NAME         TYPE       CLUSTER-IP     EXTERNAL-IP   PORT(S)                        AGE
localstack   NodePort   10.0.170.148   <none>        4566:31566/TCP,4571:31571/TCP   57s
```

ちゃんと動いたっぽいので、Vaultのawskms Sealで使うKMSのキーを作っておく。

```console
[root@vm-1 ~]# export LS_PORT=$(kubectl get --namespace default -o jsonpath="{.spec.ports[0].nodePort}" services localstack)
[root@vm-1 ~]# export LS_IP=$(kubectl get nodes --namespace default -o jsonpath="{.items[0].status.addresses[0].address}")
[root@vm-1 ~]# echo ${LS_IP}:${LS_PORT}
192.168.11.201:31566
[root@vm-1 ~]# export AWS_ACCESS_KEY_ID=hoge
[root@vm-1 ~]# export AWS_SECRET_ACCESS_KEY=huga
[root@vm-1 ~]# aws --endpoint-url=http://$LS_IP:$LS_PORT kms create-key --region us-east-1 --key-spec SYMMETRIC_DEFAULT --origin AWS_KMS
{
    "KeyMetadata": {
        "AWSAccountId": "000000000000",
        "KeyId": "160aead1-b4ab-4d21-834e-518b45669775",
        "Arn": "arn:aws:kms:us-east-1:000000000000:key/160aead1-b4ab-4d21-834e-518b45669775",
        "CreationDate": "2022-09-24T09:19:48.986462+09:00",
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

## Vaultのデプロイ
Vaultもirsa-emuのときと同様にデプロイする。
肝はawskmsのendpointをLocalStackのNodePortに向けること。

```console
[root@vm-1 ~]# cat <<'EOF' > /tmp/vault.overrides.yaml
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
        kms_key_id = "160aead1-b4ab-4d21-834e-518b45669775"
        endpoint   = "http://192.168.11.201:31566"
      }
  serviceAccount:
    create: true
    annotations:
      eks.amazonaws.com/role-arn: arn:aws:iam::000000000000:role/Hoge
EOF
[root@vm-1 ~]# helm install vault -n kube-system -f /tmp/vault.overrides.yaml hashicorp/vault
```

これだけでawskmsが動くと思いきや、Vaultに以下のエラーが出た。

```text
2022-09-19T09:25:20.789Z [WARN]  seal.awskms: error assuming role: roleARN=arn:aws:iam::000000000000:role/Hoge tokenPath=/var/run/secrets/eks.amazonaws.com/serviceaccount/token sessionName=""
  err=
  | WebIdentityErr: failed to retrieve credentials
  | caused by: InvalidIdentityToken: The ID Token provided is not a valid JWT. (You may see this error if you sent an Access Token)
  |     status code: 400, request id: f6ae9d75-da22-4e7f-bacc-09c6d20ddbff
```

AssumeRoleWithWebIdentityしたときにトークンが不正というエラーが返ってきたというメッセージだけど、上に書いたようにLocalStackはトークンのバリデーションなんてしないのでおかしい。
調べたら、awskmsのendpointで指定できるのはKMSのAPIのエンドポイントだけなのに対して、AssumeRoleWithWebIdentityはSTSのAPIなので、AWSに対して実行してしまっていた。あたりまえといえばあたりまえかも。

awskmsの設定には、sts_endpointみたいなのがありそうで無い。
AWS SDKの環境変数で設定できそうだと思って見てみたら、正に現在[AWS_STS_ENDPOINT_URL](https://github.com/kdaily/aws-sdk/blob/endpoint-url-configuration-proposal/proposals/configure-endpoint-url.md#configuration-via-environment-variables)という環境変数で設定できるようにする[PR](https://github.com/aws/aws-sdk/pull/230)がレビュー中だった。
のでそれがマージされて、リリースされて、Vaultに取り込まれるまでの別の解を探さないといけない。

## VaultのSTSエンドポイントの変更方法
Vaultの視点ではKMSのAPIを実行しようとするだけ。その先でAWS SDKがAWS_WEB_IDENTITY_TOKEN_FILEを見てSTSのエンドポイントである`https://sts.amazonaws.com`にAssumeRoleWithWebIdentityしに行くわけだけど、そのAWS SDKがSTSエンドポイントを指定するインターフェースを備えていない(っぽい)ので、`sts.amazonaws.com`につないじゃうのはどうにもならない。

なら、`sts.amazonaws.com`がLocalStackのIPアドレス(i.e k8sノードのIPアドレスか、LocalStackのPodのIPアドレスか、LocalStackのServiceのClusterIP)に解決されるようにすればいい。
VaultのPod内のAWS SDKがDNSクエリを投げる先はKubernetesクラスタのDNSで、つまりPodで動いている[CoreDNS](https://coredns.io/)だし、VaultのPodのDNS設定も手の内なので、ドメイン名解決はなんとでもできる。

考えられる策は以下。

1. VaultのPodの[hostAliases](https://kubernetes.io/ja/docs/tasks/network/customize-hosts-file-for-pods/#%E8%BF%BD%E5%8A%A0%E3%82%A8%E3%83%B3%E3%83%88%E3%83%AA%E3%83%BC%E3%82%92hostaliases%E3%81%AB%E8%BF%BD%E5%8A%A0%E3%81%99%E3%82%8B)をいじって、VaultのPodのhostsファイルに`<k8sノードのIPアドレス> sts.amazonaws.com`を追加する。
2. VaultのPodの[dnsConfig](https://kubernetes.io/ja/docs/concepts/services-networking/dns-pod-service/#pod-dns-config)をいじって、ネームサーバを変えて、そのネームサーバの設定で`sts.amazonaws.com`をいいように解決する。
3. `sts.amazonaws.com`を`localstack.default.svc.cluster.local`(LocalStackのServiceのFQDN)にマッピングする[ExternalName](https://kubernetes.io/ja/docs/concepts/services-networking/service/#externalname)を作る。
4. LocalStackをデプロイするNamespaceを`com`に変えたうえで、LocalStackのPodの[hostnameとsubdomain](https://kubernetes.io/ja/docs/concepts/services-networking/dns-pod-service/#pod%E3%81%AEhostname%E3%81%A8subdomain%E3%83%95%E3%82%A3%E3%83%BC%E3%83%AB%E3%83%89)をいじることで、LocalStackのFQDNを`sts.amazonaws.com.svc.cluster.local`にする。
5. CoreDNSの[hostsプラグイン](https://coredns.io/plugins/hosts/)で、`sts.amazonaws.com`をk8sノードのIPアドレスに解決するAレコードを追加する。
6. CoreDNSの[fileプラグイン](https://coredns.io/plugins/file/)で、`sts.amazonaws.com`をk8sノードのIPアドレスに解決するAレコードを追加する。
7. CoreDNSの[fileプラグイン](https://coredns.io/plugins/file/)で、`sts.amazonaws.com`を`localstack.default.svc.cluster.local`の別名として登録するCNAMEレコードを追加する。

これらの内、`sts.amazonaws.com`をk8sノードのIPアドレスに解決する#1、#5、#6は、EKS環境とかだとk8sノードのIPアドレスがノード再起動とかで変わるのでいまいち。

#2はネームサーバを用意して設定するのが面倒。

#3は実は、ServiceとかNamespaceの名前にドットを入れられないので無理。

#4はトリッキーすぎ。変なNamespaceを作ったり、Podのhostnameを変なのにするのがなんとなく微妙。
(諸事情でCoreDNSの設定がいじれない場合は、この#4が有力になりそうではあるが。)

ということで#7にする。

## CoreDNSの設定

まず、fileプラグインに渡すdbファイルを、以下のようなConfigMapで登録しておく。

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns-db-file
  namespace: kube-system
data:
  db.amazonaws.com: |
    $ORIGIN amazonaws.com.
    @	3600 IN	SOA kube-dns.kube-system.svc.cluster.local. hoge.foo.bar. 20220920 7200 3600 1209600 3600

    sts	IN CNAME localstack.default.svc.cluster.local.
```

このConfigMapのdb.amazonaws.comを、CoreDNSのDeploymentをいじってそのPodの`/etc/coredns/db.amazonaws.com`にマウントするようにしておいて、Corefileに以下のようなブロックを追加する。

```text
sts.amazonaws.com {
    log
    errors
    file /etc/coredns/db.amazonaws.com {
      upstream
    }
}
```

これでsts.amazonaws.comゾーンに目的のCNAMEレコードが追加されて、`sts.amazonaws.com`から読み替えられた`localstack.default.svc.cluster.local`もLocalStackのServiceのClusterIPにちゃんと解決される。

因みにCoreDNSの設定でひとつ注意すべきなのが、LocalStackが起動時に本物のS3(`s3-eu-west-2.amazonaws.com`)からランタイムをダウンロードするので、`amazonaws.com`を全部LocalStackに向けるようにしてはだめということ。

## LocalStackのポート設定
AWS SDKは`https://sts.amazonaws.com`にアクセスするので、つまり443ポートにつなぎに行くんだけど、LocalStackはデフォルトでHTTPもHTTPSも4566ポートで待つので、変えておかないといけない。

LocalStackのServiceのportを443にすればそれでいいはずだけど、LocalStackのChartにそのための変数がないので、起動ポートを443に変える。

```console
[root@vm-1 ~]# cat <<'EOF' > /tmp/localstack.overrides.yaml
service:
  edgeService:
    targetPort: 443

extraEnvVars:
  - name: EDGE_PORT
    value: "443"
EOF
[root@vm-1 ~]# helm upgrade -f /tmp/localstack.overrides.yaml localstack localstack-repo/localstack
```

これでawskmsが動くと思いきや、Vaultに以下のエラーが出た。

```text
2022-09-21T02:28:37.403Z [WARN]  seal.awskms: error assuming role: roleARN=arn:aws:iam::000000000000:role/Hoge tokenPath=/var/run/secrets/eks.amazonaws.com/serviceaccount/token sessionName=""
  err=
  | WebIdentityErr: failed to retrieve credentials
  | caused by: RequestError: send request failed
  | caused by: Post "https://sts.amazonaws.com/": x509: certificate is valid for *.amplifyapp.localhost.localstack.cloud, *.cloudfront.localhost.localstack.cloud, *.execute-api.localhost.localstack.cloud, *.localhost.localstack.cloud, *.opensearch.localhost.localstack.cloud, *.s3.localhost.localstack.cloud, *.scm.localhost.localstack.cloud, localhost.localstack.cloud, not sts.amazonaws.com
```

LocalStackのTLSサーバ証明書のSANがまずい。
そりゃそうか。

## LocalStackのTLSサーバ証明書設定
LocalStackには、現v1.1.0の時点でTLSサーバ証明書を指定する設定がない。
デフォルトでは[どこかからダウンロードしてくる](https://github.com/localstack/localstack/blob/v1.1.0/localstack/services/generic_proxy.py#L1099)。
環境変数[SKIP_SSL_CERT_DOWNLOAD](https://docs.localstack.cloud/localstack/configuration/#miscellaneous)に`1`を設定しておくと、ダウンロードする代わりに[起動時に自動生成する](https://github.com/localstack/localstack/blob/v1.1.0/localstack/utils/crypto.py#L79)けど、生成パラメータは全部ハードコードでSANとか指定できない。

LocalStackはWebアプリケーションフレームワークに[Hypercorn](https://pgjones.gitlab.io/hypercorn/)を使っているのでその[設定](https://pgjones.gitlab.io/hypercorn/how_to_guides/configuring.html)も見たけど、環境変数とかで外から証明書を指定することはできなそう。

`/opt/code/localstack/.filesystem/var/lib/localstack/cache/server.test.pem`にPEM形式の秘密鍵と証明書を改行でつなげてあらかじめおいておけば[使ってくれる](https://github.com/localstack/localstack/blob/v1.1.0/localstack/utils/crypto.py#L61)ようなので、そこをハックすることにする。

まず、適当なキーペアと、SANに`sts.amazonaws.com`を入れたTLSサーバ証明書をPEMで作っておいて、以下のようなConfigMapで登録する。

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: localstack-cert
data:
  server.test.pem: |
    -----BEGIN PRIVATE KEY-----
    MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCnwG/0HJ8twnuy
    lv27E9enAB0ZdnDd9zZLDDXrL68wfJ8bcPWaNIz12NGbDi/IbBwdezyCoppY6y/b
    jyRR8B21XzPQmCupGl930U9XO2O0pnEkXhxUQtoxsRbfEF10f4qFZOm15e2N8Q5w
    EY69Hb6dIpBwUbTfG2gGuy8wdnshVTA+qENmuqL5oziEAVSYT4UNIC/frQjjPxWF
    5KVOjiri7U88GWHyZEMzRicy1T3igli9yScOVkVLnEgNEXH/9OGUu7g8e4jsUhTq
    POwq7+q0jwK7Wxgf9gY1QUg/bxcQa9SM9wjmWNtJIK+00HK7CtaIipeEpAHkGgrA
    tqkhUnN3AgMBAAECggEAIkVpWdjjGEksVk8MpUSngSG/0CznYCGaQPjMpzDFvMUp
    CEUqmAd2aN+T6vaaAns7vzYnJZUsrU/XJib3R5ojp6M8hbgg61pM+MCVUf/7HbQH
    V2O2q+xAgXhpcMb6IMvRs/Dq4lOIFcCSr4iWvcIu6BFgquG2bwI9XWqueFssSqG0
    7MZrNs8vuLgAxHKOehT1QdSgu2Pm4/MXQ+ELWT9zB0O1FdZfWhg9TpG0hnSgBk5a
    +mDQJvmAGiuQ0DCryTB0cZN/CuPlUA+cfcXDzgEDX/t4fnUL2+UxA5fLtlgd9pE1
    t3JSacTDybERgmilVIGzDdyOIBZBdeo9NaHri1gs2QKBgQDBvUvghs5Mh6Lxhu1j
    JT8EdTnyq53B5LhpZpTRNduJWK8eyakwpE+InIrRQ+w3USpsgHspEMkxTp1gft1y
    HnnYI5QV2PUBeC2kp1auOKZGL3PNVru1iXr0A6/3UJgIsi5myFILrU159UKgWq4L
    qq5kXu+GtY4ebZRVBlScrmgI3QKBgQDdqSmabv3mIp6QXPp+42gCRTnXQRZnXhbL
    zhVayuHt1cDoPSQ+X9As5JHcujZRv+TQXgrZ4GFeLks7iTQYeNTQKEn7QH+fc0iL
    xJYsviGd7G9FVzWCut2PkZfA+Xlhab867yXcnwcupoHvZKXDX4mFRZ/OxlI4qMG5
    yLOXwN++YwKBgAo2r4xbrv6L3AQ9p8AlU4gpoe9wKrXxF+O+m7PX0gYQndLSsM+2
    qda64fqcSRS1e7YSo+uLTgACc/uFVKlSf/vsDD+Gm4wDSOy4QbKXm/RxRfqaSvUM
    FWZN13YDUrCKrDWQ8/pXnZEDZArOHQTSb7Us6BXC9oYWIs7Esas86pElAoGBANvZ
    7uO39qiN6cuyDNpR31VxJ/9yFTCNR/r4+oFE/XWSL3WpPwuGqMn+IxZUs4+9zstE
    m2qifLCXJhN08HDdV+bmLwq/XFXgWDIY2AKkyl8CpRKXfwGdKig99dB3IIcYBY4E
    qP771HnWuMWihC8V0SaYefrzBZYg+5Szlj2MFd+VAoGBAMEI3JufIFoxZxEqB4ng
    IZ1wGrk9DmDj8hL3IERWHuNJ/OucGE7aLmktSNXwLcQIO83+U7nE2zu7z95gCbWg
    8sL8Vy1zUVzIC04f77r3UpxEAkqx5OZfT9Hl7Ii3t5lWekjxWs3hUZQw5090Xo/6
    LS7d8V/WmpvXaWOKVQzmnASs
    -----END PRIVATE KEY-----
    -----BEGIN CERTIFICATE-----
    MIID2DCCAsCgAwIBAgICA+kwDQYJKoZIhvcNAQELBQAwgYExCzAJBgNVBAYTAkFV
    MRMwEQYDVQQIDApTb21lLVN0YXRlMRYwFAYDVQQHDA1Tb21lLUxvY2FsaXR5MRcw
    FQYDVQQKDA5Mb2NhbFN0YWNrIE9yZzEQMA4GA1UECwwHVGVzdGluZzEaMBgGA1UE
    AwwRc3RzLmFtYXpvbmF3cy5jb20wIBcNMjIwOTIxMDc0NjIxWhgPMjEyMjA4Mjgw
    NzQ2MjFaMIGBMQswCQYDVQQGEwJBVTETMBEGA1UECAwKU29tZS1TdGF0ZTEWMBQG
    A1UEBwwNU29tZS1Mb2NhbGl0eTEXMBUGA1UECgwOTG9jYWxTdGFjayBPcmcxEDAO
    BgNVBAsMB1Rlc3RpbmcxGjAYBgNVBAMMEXN0cy5hbWF6b25hd3MuY29tMIIBIjAN
    BgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAp8Bv9ByfLcJ7spb9uxPXpwAdGXZw
    3fc2Sww16y+vMHyfG3D1mjSM9djRmw4vyGwcHXs8gqKaWOsv248kUfAdtV8z0Jgr
    qRpfd9FPVztjtKZxJF4cVELaMbEW3xBddH+KhWTpteXtjfEOcBGOvR2+nSKQcFG0
    3xtoBrsvMHZ7IVUwPqhDZrqi+aM4hAFUmE+FDSAv360I4z8VheSlTo4q4u1PPBlh
    8mRDM0YnMtU94oJYvcknDlZFS5xIDRFx//ThlLu4PHuI7FIU6jzsKu/qtI8Cu1sY
    H/YGNUFIP28XEGvUjPcI5ljbSSCvtNByuwrWiIqXhKQB5BoKwLapIVJzdwIDAQAB
    o1YwVDAcBgNVHREEFTATghFzdHMuYW1hem9uYXdzLmNvbTAMBgNVHRMBAf8EAjAA
    MA4GA1UdDwEB/wQEAwIF4DAWBgNVHSUBAf8EDDAKBggrBgEFBQcDATANBgkqhkiG
    9w0BAQsFAAOCAQEAPL+Op5byzTH82Walz2z+9+Qx0GiHEINkXUbboqprnO1lawxb
    BdvrtMIjr11R5x5WmnSJ/+8B4fUcn/VmGjLZOtecyk7lRk/buX+usScA3lIySsKN
    Of3yQjSuiDdLeB3cSHm4ah5SF6DKv77CjsQp0es6sikJweUlLNaYN0cYoBl/KeAw
    DULWZfWusp1GsMke3nNZC7/9KwFyNeEjIuCNpGFED/Cb28Ym0yKr2hEY+6Rroer+
    f91XlXIUhXnbcmCtc0cEtPJUo77ZdTEMPUdDcy1v5aKZ6VpKaOITJjLI98qoMMGu
    BaCodVAdOzrPn4yy3IXhWFW5S+KHltoMc2qHdg==
    -----END CERTIFICATE-----
```

因みにこれは100年有効なオレオレ証明書。

このConfigMapのserver.test.pemを、LocalStackのDeploymentをいじってそのPodの`/opt/code/localstack/.filesystem/var/lib/localstack/cache/server.test.pem`にマウントするようにしておいて、`SKIP_SSL_CERT_DOWNLOAD`を設定する。

```console
[root@vm-1 ~]# cat <<'EOF' > /tmp/localstack.overrides.yaml
service:
  edgeService:
    targetPort: 443

extraEnvVars:
  - name: EDGE_PORT
    value: "443"
  - name: SKIP_SSL_CERT_DOWNLOAD
    value: "1"
EOF
[root@vm-1 ~]# helm upgrade -f /tmp/localstack.overrides.yaml localstack localstack-repo/localstack
```

これでawskmsが動くと思いきや、Vaultに以下のエラーが出た。

```text
2022-09-21T23:36:56.414Z [WARN]  seal.awskms: error assuming role: roleARN=arn:aws:iam::000000000000:role/Hoge tokenPath=/var/run/secrets/eks.amazonaws.com/serviceaccount/token sessionName=""
  err=
  | WebIdentityErr: failed to retrieve credentials
  | caused by: RequestError: send request failed
  | caused by: Post "https://sts.amazonaws.com/": x509: certificate signed by unknown authority
```

AWS SDKはオレオレ証明書を許してくれない。

## VaultのCA証明書バンドル設定
AWS SDKは[AWS_CA_BUNDLE](https://docs.aws.amazon.com/ja_jp/cli/latest/userguide/cli-configure-envvars.html#envvars-list-AWS_CA_BUNDLE)という環境変数でCA証明書バンドルを指定できるので、VaultのPodにこれを設定してオレオレ証明書を信頼させる。

まず、さっき作ったserver.test.pemから証明書だけ切り出して以下のようなConfigMapを作る。

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: localstack-ca-cert
  namespace: kube-system
data:
  server.test.pem.crt: |
    -----BEGIN CERTIFICATE-----
    MIID2DCCAsCgAwIBAgICA+kwDQYJKoZIhvcNAQELBQAwgYExCzAJBgNVBAYTAkFV
    MRMwEQYDVQQIDApTb21lLVN0YXRlMRYwFAYDVQQHDA1Tb21lLUxvY2FsaXR5MRcw
    FQYDVQQKDA5Mb2NhbFN0YWNrIE9yZzEQMA4GA1UECwwHVGVzdGluZzEaMBgGA1UE
    AwwRc3RzLmFtYXpvbmF3cy5jb20wIBcNMjIwOTIxMDc0NjIxWhgPMjEyMjA4Mjgw
    NzQ2MjFaMIGBMQswCQYDVQQGEwJBVTETMBEGA1UECAwKU29tZS1TdGF0ZTEWMBQG
    A1UEBwwNU29tZS1Mb2NhbGl0eTEXMBUGA1UECgwOTG9jYWxTdGFjayBPcmcxEDAO
    BgNVBAsMB1Rlc3RpbmcxGjAYBgNVBAMMEXN0cy5hbWF6b25hd3MuY29tMIIBIjAN
    BgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAp8Bv9ByfLcJ7spb9uxPXpwAdGXZw
    3fc2Sww16y+vMHyfG3D1mjSM9djRmw4vyGwcHXs8gqKaWOsv248kUfAdtV8z0Jgr
    qRpfd9FPVztjtKZxJF4cVELaMbEW3xBddH+KhWTpteXtjfEOcBGOvR2+nSKQcFG0
    3xtoBrsvMHZ7IVUwPqhDZrqi+aM4hAFUmE+FDSAv360I4z8VheSlTo4q4u1PPBlh
    8mRDM0YnMtU94oJYvcknDlZFS5xIDRFx//ThlLu4PHuI7FIU6jzsKu/qtI8Cu1sY
    H/YGNUFIP28XEGvUjPcI5ljbSSCvtNByuwrWiIqXhKQB5BoKwLapIVJzdwIDAQAB
    o1YwVDAcBgNVHREEFTATghFzdHMuYW1hem9uYXdzLmNvbTAMBgNVHRMBAf8EAjAA
    MA4GA1UdDwEB/wQEAwIF4DAWBgNVHSUBAf8EDDAKBggrBgEFBQcDATANBgkqhkiG
    9w0BAQsFAAOCAQEAPL+Op5byzTH82Walz2z+9+Qx0GiHEINkXUbboqprnO1lawxb
    BdvrtMIjr11R5x5WmnSJ/+8B4fUcn/VmGjLZOtecyk7lRk/buX+usScA3lIySsKN
    Of3yQjSuiDdLeB3cSHm4ah5SF6DKv77CjsQp0es6sikJweUlLNaYN0cYoBl/KeAw
    DULWZfWusp1GsMke3nNZC7/9KwFyNeEjIuCNpGFED/Cb28Ym0yKr2hEY+6Rroer+
    f91XlXIUhXnbcmCtc0cEtPJUo77ZdTEMPUdDcy1v5aKZ6VpKaOITJjLI98qoMMGu
    BaCodVAdOzrPn4yy3IXhWFW5S+KHltoMc2qHdg==
    -----END CERTIFICATE-----
```

で、それをVaultのPodにマウントして、そのパスを`AWS_CA_BUNDLE`で指すように、以下のように`vault.overrides.yaml`に追記して適用する。

```console
[root@vm-1 ~]# cat <<'EOF' >> /tmp/vault.overrides.yaml
  extraEnvironmentVars:
    AWS_CA_BUNDLE: /localstack/server.test.pem.crt
  volumes:
    - name: localstack-ca-cert
      configMap:
        name: localstack-ca-cert
        items:
          - key: server.test.pem.crt
            path: server.test.pem.crt
  volumeMounts:
    - name: localstack-ca-cert
      mountPath: /localstack
      readOnly: true
EOF
[root@vm-1 ~]# helm upgrade vault -n kube-system -f /tmp/vault.overrides.yaml hashicorp/vault
```

<br>

これでやっとVaultのawskmsが動いた。

最後のCA証明書バンドル設定は、PodのMutating Admission Webhookでやってやると、Vault側からLocalStackを気にしなくてよくなってよさそう。
