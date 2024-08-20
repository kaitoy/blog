+++
categories = ["Programming"]
title = "AWS EKSのIAM Roles for Service Accountsを完全に理解した"
date = "2022-09-17T21:44:49+09:00"
tags = ["AWS", "eks", "iam", "irsa", "Kubernetes"]
draft = false
cover = "eks.png"
slug = "aws-irsa"
highlight = true
highlightStyle = "monokai"
highlightLanguages = []
+++

AWS EKSのIAM Roles for Service Accountsの仕組みを完全に理解する記事。

<!--more-->

{{< google-adsense >}}

# IAM Roles for Service Accounts (IRSA)とは
[IAM Roles for Service Accounts (IRSA)](https://docs.aws.amazon.com/ja_jp/eks/latest/userguide/iam-roles-for-service-accounts.html)は、IAMロールをEKSのServiceAccountに紐づける機能。

IRSAを使うには、IAMにOIDCプロバイダの設定をちょろっとして、特定の信頼ポリシーを付けたIAMロールを作っておいて、ServiceAccountのアノテーションに`eks.amazonaws.com/role-arn: <IAMロールのARN>`を付けるだけ。
そうしておくと、そのServiceAccountを付けたPodがそのIAMロールの権限でAWSサービスにアクセスできる。

# IRSAを構成する要素

* Kubernetes側の要素
    * [Mutating Admission Webhook](https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/#mutatingadmissionwebhook)

        KubernetesのAdmission Controllersの一つ。

        Kubernetesのkube-apiserverは、何らかのAPIリクエストを受けたとき、それに対して[認証(Authentication)、認可(Authorization)、許可(Admission)](https://kubernetes.io/docs/concepts/security/controlling-access/)の処理を実行する。

        ![](https://d33wubrfki0l68.cloudfront.net/673dbafd771491a080c02c6de3fdd41b09623c90/50100/images/docs/admin/access-control-overview.svg)

        Admission Controllersは許可の部分の処理を担当するコンポーネントで、[LimitRange](https://kubernetes.io/docs/reference/kubernetes-api/policy-resources/limit-range-v1/)のチェックをしたり、[PodSecurityPolicy](https://kubernetes.io/docs/concepts/security/pod-security-policy/)のチェックをしたりする[いろいろなcontroller](https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/#what-does-each-admission-controller-do)で構成されるんだけど、そのなかの一つで、APIオブジェクトをいじる任意の処理を差し込めるcontrollerがMutating Admission Webhook。

        Kubernetesに[MutatingWebhookConfiguration](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.25/#mutatingwebhookconfiguration-v1-admissionregistration-k8s-io)を登録しておくと、そこで指定したAPIリクエストがkube-apiserverに来た時に、指定したServiceやURLにリクエストの内容を送ってくれるので、受け取ったサーバ側でAPIオブジェクトをいじって返してやるとそれが反映される、という寸法。

    * [Service Account Token Volume Projection](https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/#service-account-token-volume-projection)

        PodのServiceAccountを認証するトークン(i.e. ServiceAccountトークン)をPodのボリュームに挿入する、Kubernetesの機能。

        Podのボリュームに[Projected Volume](https://kubernetes.io/docs/concepts/storage/projected-volumes/)を追加して、ソースとして[serviceAccountToken](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.22/#serviceaccounttokenprojection-v1-core)を指定しておくと、kubeletがPodを起動するときに、kube-apiserverからServiceAccountトークンを取得して挿入してくれる。

        Podにはデフォルトで一つService Account Token Volume Projectionがついて、KubernetesのAPIにアクセスする用のServiceAccountトークンが挿入される。このトークンをHTTPの`Authorization`ヘッダにベアラトークンとして入れれば、KubernetesのAPIをPodのServiceAccountとして実行できる。

        ServiceAccountトークンはOIDCのIDトークンの形式で、発行者([iss](https://www.rfc-editor.org/rfc/rfc7519#section-4.1.1))がkube-apiserverのURLになってるので、kube-apiserverの[OIDC Discovery](https://openid.net/specs/openid-connect-discovery-1_0.html)エンドポイント(`/.well-known/openid-configuration`)で[JWKS](https://openid-foundation-japan.github.io/rfc7517.ja.html)エンドポイントのURL(`/openid/v1/jwks`)を取得し、そこから公開鍵を取得し、IDトークンについている署名を検証することができる。
        (EKSの場合、issは`https://oidc.eks.ap-northeast-1.amazonaws.com/id/11223344456677889900AABBCCDDEEFF`みたいな、EKSクラスタ毎のOIDC専用のURLになっている。)
* AWS側の要素
    * [IAMのOIDC IDプロバイダとWeb IDフェデレーション](https://docs.aws.amazon.com/ja_jp/IAM/latest/UserGuide/id_roles_providers.html)

        Web IDフェデレーションは、AWSのリソースに、OIDC互換な外部のIDプロバイダが認証したユーザでアクセスできるようにする、IAMの機能。

        [IAM OIDC IDプロバイダ](https://docs.aws.amazon.com/ja_jp/IAM/latest/UserGuide/id_roles_providers_create_oidc.html)というIAMリソースを作成し、issとかそのTLSサーバ証明書のサムプリントを登録しておくと、そのissが発行したIDトークンの内容をIAMが信用してくれるようになる。

    * [AssumeRoleWithWebIdentity](https://docs.aws.amazon.com/ja_jp/IAM/latest/UserGuide/id_credentials_temp_request.html#api_assumerolewithwebidentity)

        Web IDフェデレーションしたIDプロバイダが発行したIDトークンを使ってIAMロールを引き受ける、STSのAPI。
        実行すると、指定したIAMロールの権限でAWSリソースにアクセスできる、[一時的な認証情報](https://docs.aws.amazon.com/ja_jp/IAM/latest/UserGuide/id_credentials_temp_use-resources.html)(i.e. アクセスキーIDとシークレットアクセスキーとセッショントークン)が返ってくる。

        引き受けられるIAMロールの方には、対応するIAM OIDC IDプロバイダを指定する信頼ポリシーを付けておく必要がある。

    * [Amazon EKS Pod Identity Webhook](https://github.com/aws/amazon-eks-pod-identity-webhook/)

        IRSAの肝。

        Amazon EKS Pod Identity Webhook(以下PIdW)はMutating Admission Webhookの実装で、`eks.amazonaws.com/role-arn`が付いたServiceAccountが割り当てられたPodをいじって、Web IDフェデレーションのためのService Account Token Volume Projectionと、環境変数の`AWS_WEB_IDENTITY_TOKEN_FILE`とか`AWS_ROLE_ARN`とかを挿入する。

        挿入するService Account Token Volume Projectionでコンテナの`/var/run/secrets/eks.amazonaws.com/serviceaccount/token`にServiceAccountトークンをマウントさせて、`AWS_WEB_IDENTITY_TOKEN_FILE`でそのパスを指定してやることで、コンテナ内で動くAWSクライアントがそのトークンを読んで、`AWS_ROLE_ARN`で指定されたIAMロールに対してAssumeRoleWithWebIdentityをコールするという寸法。

        PIdWはEKS環境ではコントロールプレーンで動いているっぽいけど、ノードでPodとして動かすこともできる。

# 図解IRSA

![irsa.png](/images/aws-irsa/irsa.png)

IRSAを図にするとこんな感じになるはず。
左側がEKSの世界で、右側がIAMの世界。青い実線矢印はHTTPS通信。

処理の流れは、細かい間違いはあるかもしれないけど以下のような感じのはず。

1. EKSのkube-apiserverにPodを作るリクエストが来たら、kube-apiserverがその内容をPIdWに送る。
2. PIdWは、Podに紐づくServiceAccountを取得し、そのアノテーションに`eks.amazonaws.com/role-arn`が付いてたら、Podの定義をいじってService Account Token Volume Projectionと、環境変数の`AWS_WEB_IDENTITY_TOKEN_FILE`とか`AWS_ROLE_ARN`とかを挿入する。
3. kubeletは挿入されたService Account Token Volume Projectionを見て、それに対応するServiceAccountトークンをkube-apiserverに発行してもらう。
4. kubeletは、発行されたServiceAccountトークンをPodにマウントさせる。
5. Pod内で起動したコンテナは、`AWS_WEB_IDENTITY_TOKEN_FILE`が指定する場所にマウントされたServiceAccountトークンと、`AWS_ROLE_ARN`で指定されたIAMロールのARNを付けて、AssumeRoleWithWebIdentity APIを実行する。
6. AssumeRoleWithWebIdentityを呼ばれたSTSは、受け取ったServiceAccountトークンのissクレームに書いてあるURLから[OIDC Discovery Document](https://openid.net/specs/openid-connect-discovery-1_0.html#ProviderConfig)を取得する。さらに、そのドキュメントの`jwks_uri`に書いてあるURLにアクセスしてJWKSを取得し、そこからトークン署名キーを取得する。
7. 取得したトークン署名キーを使ってServiceAccountトークンを検証する。
8. STSは次に、ServiceAccountトークンのissとか[aud](https://www.rfc-editor.org/rfc/rfc7519#section-4.1.3)とかをみて、IAMのOIDC ID provider設定によって信頼している発行者からSTSに対して発行されたトークンであることを確認する。
9. STSは、ServiceAccountトークンの正当性を完全に確かめられたので、AssumeRoleWithWebIdentityリクエストを認証する。認証されるユーザはServiceAccountトークンの[subクレーム](https://www.rfc-editor.org/rfc/rfc7519#section-4.1.2)に、`system:serviceaccount:kube-system:vault`のように書いてあって、つまりAssumeRoleWithWebIdentityを呼んだPodのServiceAccountになる。STSは最後に、AssumeRoleWithWebIdentityで指定されたIAMロールの信頼ポリシーをみて、そのIAMロールがServiceAccountトークンの発行者を信頼し、それによって認証されたユーザによるAssumeRoleWithWebIdentityを許可していることを確認する。
10. ここまで来てやっとAssumeRoleWithWebIdentityリクエストを認可し、アクセスキーIDとかの認証情報を発行し、Podに返す。
