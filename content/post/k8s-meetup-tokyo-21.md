---
categories: ["Programming"]
title: "Kubernetes Meetup Tokyo #21 - Cloud Native CI/CD に行ってきた"
date: 2019-07-26
cover: "k8s-meetup-tokyo.png"
tags: ["Kubernetes", "argo", "gitops", "spinnaker", "argo"]
slug: "k8s-meetup-tokyo-21"
draft: false
---

昨日[Kubernetes Meetup Tokyo #21 - Cloud Native CI/CD](https://k8sjp.connpass.com/event/138375/)に参加してきた。
Kubernetes上のサービスを対象としたCI/CDをテーマとしたミートアップ。
CIはもう当たり前すぎてネタが無いのか、かなりCD寄りの内容だった。

キーワードとしてはArgo、GitOps、Spinnakerなど。

<!--more-->

{{< google-adsense >}}

# Kubernetes Meetup Tokyoとは

毎月東京で開催されるKubernetesギークの集まり。
大抵は六本木ヒルズ森タワーのGoogleオフィスで19:00から開催されている模様。

200人ちょっとくらいの定員数で、応募が多くてだいたい2倍以上の抽選だけど、私は今回ブログ枠でするっと入れていただけた。

![venue.png](/images/k8s-meetup-tokyo-21/venue.png)

食堂?みたいなところが会場だった。

# 発表内容

30分の発表が3つと、5分のLTが4つ。

## Argoプロジェクト最新動向

<iframe src="//www.slideshare.net/slideshow/embed_code/key/oPSLahvDIpSROD" width="595" height="485" frameborder="0" marginwidth="0" marginheight="0" scrolling="no" style="border:1px solid #CCC; border-width:1px; margin-bottom:5px; max-width: 100%;" allowfullscreen> </iframe> <div style="margin-bottom:5px"> <strong> <a href="//www.slideshare.net/DaisukeTaniwaki/20190725-argo-project-latest-news" title="20190725 Argo Project Latest News" target="_blank">20190725 Argo Project Latest News</a> </strong> from <strong><a href="https://www.slideshare.net/DaisukeTaniwaki" target="_blank">Daisuke Taniwaki</a></strong> </div>

一番楽しみにしていたやつ。
Argoは[Argo Workflows](https://github.com/argoproj/argo)というk8sネイティブなワークフローエンジンで有名。
仕事でやってるKubernetes上で実行する複雑な処理を、ワークフローエンジンでプラガブルでフレキシブルでリライアブルでファビュラスな感じにしたくて注目してたんだけど、ほかにも[Argo CD](https://github.com/argoproj/argo-cd)、[Argo Events](https://github.com/argoproj/argo-events)、[Argo Rollouts](https://github.com/argoproj/argo-rollouts)というのがあるのを知れた。

どれも面白そうなプロダクトだけど、特にArgo Rolloutsが拡張版Deploymentな感じでBlue Greenデプロイメントなんかを実現してくれるらしく、ぜひ使ってみたい。

## GitOpsでも秘匿情報をバッチリ扱う方法、SealedSecretsとは？

<script async class="speakerdeck-embed" data-id="00cadf6f38b84d6694902f9817bc50a0" data-ratio="1.77777777777778" src="//speakerdeck.com/assets/embed.js"></script>

GitOpsをやるなら、Gitリポジトリに本番環境とかのSecretのマニフェストをコミットすることになるけど、Secretの中身さらすの怖い… ← それ[SealedSecrets](https://github.com/bitnami-labs/sealed-secrets)で解決できるよ、という話。

SealedSecretsを使った場合、リポジトリには生のSecretの代わりにSealedSecretというカスタムリソースを入れる。
SealedSecretに書く秘匿情報はk8sクラスタ内に保管された鍵で暗号化されていて、SealedSecretをk8sにデプロイすると復号化されてSecretが生成される仕組み。
この辺りがよく図解されていてわかりやすかった。

Helmなどのテンプレートエンジンだと秘匿情報をマニフェストから切り出して別ファイルに書くため、SealedSecretsのようなツールとは相性が悪いらしく、ちょっと気になるところ。

似たようなツールで[Kamus](https://github.com/Soluto/kamus)というのが最近出てきて、よさげらしい。

他にも秘匿情報を扱うツールがいくつもあるけど、CDツールとの相性などを考えて選択すべしとのこと。

## コロプラが実践しているSpinnakerを用いたデプロイ戦略

<script async class="speakerdeck-embed" data-id="cdf16019cfd148b1b8e5108332b480e0" data-ratio="1.33333333333333" src="//speakerdeck.com/assets/embed.js"></script>

コロプラはGCPでk8sを使っていて、一タイトルあたり一クラスタというシングルテナント構成。
([freeeと同じ戦略](https://speakerdeck.com/foostan/awsfalsemanesitosahisuwohuo-kasita-kubernetes-yun-yong-toamazon-eks-niyorukurasutafalsesinkurutenantozhan-lue-nituite)か。)

[Spinnaker](https://www.spinnaker.io/)はNetflixによるCDツール。
ステージを組み合わせてパイプラインを定義しておくと、イベントを契機にキックしてくれて、GUIで実行状況をモニタリングできる。
Spinnaker自身10個くらいのサービスからなるマイクロサービスアーキテクチャで、ちょっと運用大変そう。

コロプラでは、Dockerイメージのpushを検知してパイプラインを実行し、Helmのテンプレートをレンダリングしてk8sにデプロイするようにしている。
また、k8sクラスタごとにNamespaceで分離した開発環境、ステージング環境が数十個あり、これらのデプロイをSpinnakerで自動化している。
Gitのブランチを作ると数十分で環境を立ち上げられるとのこと。

Spinnakerのバージョンアップは月数回くらいのかなり速いペースで、最新版以外はどんどんdeprecateになって苦しいよねという質問があったけど、検証環境で試して本番に適用、というループを頑張って回すしかないという回答。
うちの会社の場合、バージョンアップ版を取得する度に申請・登録が必要なので地獄になりそう。

Spinnakerがそれほど安定していなくて、不可解な挙動をするのを頑張ってデバッグ・チューニングする必要もあるらしく、導入には覚悟が要りそうだった。

## Argo CD 実践ガイド

<script async class="speakerdeck-embed" data-id="3986564d8d62406aabc06fe60d29cbaf" data-ratio="1.77777777777778" src="//speakerdeck.com/assets/embed.js"></script>

Argo CDのカスタムリソースのマニフェストの書き方などの紹介。

デプロイするマニフェストのテンプレートエンジンとしては、kustomize、Helm、Ksonnet、JSonnetなどがある。
PreSync、Sync(これが実際のマニフェストデプロイ)、PostSyncを定義出来て、マニフェストデプロイ前にDBのマイグレーション処理なんかも入れられる。

GUIがニート。

## Flux/Flaggerでカナリアリリースする

(資料は未公開)

by Shohehe

<br>

フロントエンドのあれじゃなくて、[Weave Flux](https://www.weave.works/oss/flux/)と[Flagger](https://github.com/weaveworks/flagger)の話。

FluxはGitOpsツール。
Gitにpushするとk8sにsyncしてくれる。

FlaggerはIstioとかのサービスメッシュと連携して、Prometheus経由でメトリクスを監視しながらカナリアリリース、ブルーグリーンデプロイ、A/Bテストをできる。
メトリクスを見ながらA/Bテストして、いいほうを自動で本番にするみたいなことができる。

うちのプロジェクトではCNIプラグインにWeave Netを使ってるので、相性よかったりするのかな…

## KubeflowPipelineを用いたモデルライフサイクル

(資料は未公開)

by me7te7or

<br>

[Kubeflow pipelines](https://github.com/kubeflow/pipelines)はKubeflowで機械学習のモデルを作るパイプラインを作るツール。
モデル作成のプロセスをコード化、自動化することで、モデル作るときに使ったパラメータ何だっけとなるのを防いだり、たくさんの試行を効率的に管理できたりするとのこと。

## Vault on Kubernetes

<script async class="speakerdeck-embed" data-id="fb48580b1fef4c6cadf1d7c80f2f3142" data-ratio="1.77777777777778" src="//speakerdeck.com/assets/embed.js"></script>

[Vault](https://www.vaultproject.io/)はHashiCorp製の秘匿情報管理ツール。
バックエンドにはいろいろ選択肢があるけど、発表ではDynamoDBに入れる例が紹介された。

# 所感

コロプラの人あたりで参加者に問いかけがあったんだけど、ミートアップに参加するようなギーク達でも本格的にCDに踏み込んでいる人はまだあまりいないようだった。
触り始めているくらいの人は多くいたので、うちのプロジェクトでも試してみたいと強く思うんだけど、うちの場合技術力以前に社内制度やシステムや体制の課題を乗り越える必要があるかな…

色んなツールを活用してCI/CD環境を整えることで、サービスの品質を保ちつつアジリティをできる。
Kubernetesはそこまでやってこそ真価が発揮されてくると感じた。
GitOpsは本当にクールだと思うので、せめて開発環境にはがんばって取り入れたい。
