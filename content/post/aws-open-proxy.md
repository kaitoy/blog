+++
categories = ["Programming"]
title = "AWSでEC2インスタンスの起動をブロックされたときにしたこと"
date = "2024-08-22T16:49:30+09:00"
tags = ["AWS", "EC2"]
draft = false
cover = "aws.png"
slug = "aws-open-proxy"
highlight = false
+++

AWSつかってたら、何もしてないのに壊れてEC2の起動ができなくなった話。

AWSで(AWS以外でも)open proxyを立ててはいけないという話でもある。

<!--more-->

{{< google-adsense >}}

# EC2インスタンスの起動ができない
7月のある日、いつもの通りAWSのマネジメントコンソールにログインしてCloud9の開発環境を立ち上げようとしたら、以下のエラーになった。

> Cloud9 could not connect to the EC2 instance. Please check your VPC configuration and network settings to troubleshoot the issue.

Cloud9サービスから、EC2インスタンスに接続できなかったというエラー。
VPCやネットワークの設定を見直せとあるが、いつも使っている環境なのでそこに問題はないはず。

エラーになったCloud9環境に紐づいているEC2インスタンスを確認したら、起動してなかった。
そのEC2インスタンスを直接マネジメントコンソールから起動してみたら、今度は以下のエラーになった。

> This request has been administratively disabled.

インスタンスの起動が管理者によって禁止されてるらしい。

管理者?

# AWS Trust & Safetyからのメール①
あまり心当たりがないまま調べていたら、AWS Trust & Safetyから気になるメールが何通か来ていたことに気づいた。

7月10日に一通目:

> Your AWS Abuse Report from ec2-abuse@amazon.com
>
> We've received a report(s) that your AWS resource(s) has been operating in a way that resembles an open proxy.
> Operating an open proxy is forbidden in the AWS Acceptable Use Policy (http://aws.amazon.com/aup/).
> We’ve included the original report below for your review.
> Please take action to stop the reported activity and reply directly to this email with details of the corrective action you have taken.
> If you do not consider the activity described in these reports to be abusive, please reply to this email with details of your use case.
> If you're unaware of this activity, it's possible that your environment has been compromised by an external attacker, or vulnerability is allowing your machine to be used in a way that it was not intended.

要は、お前のAWSアカウントでopen proxyっぽいものが動いているっぽくて、AWS Acceptable Use Policyに違反しているから対策しろ、という連絡。

# Open Proxyとは
[open proxy](https://ja.wikipedia.org/wiki/%E5%85%AC%E9%96%8B%E3%83%97%E3%83%AD%E3%82%AD%E3%82%B7)は、アクセス元やアクセス先を制限せず、認証もなしにだれでも使えるようなHTTPプロキシのこと。

クラッカーがアクセス元を隠すために使ったり、スパムメール送信に使われたりするので、よろしくない。

# AWS Acceptable Use Policy
[AWS Acceptable Use Policy](http://aws.amazon.com/aup/) (AWS 利用規約)には以下のように書かれている。

> お客様は本サービスまたは AWS サイトを使用したり、他者の使用を助長したり、許可したりすることはできません。
>
> * 違法行為または不正行為のため、
> * 他者の権利を侵害すること、
> * 暴力、テロリズム、その他の重大な危害について、脅したり、煽ったり、促進したり、積極的に勧めたりすること、
> * 児童の性的搾取や虐待を助長するような内容や活動、
> * ユーザー、ネットワーク、コンピュータ、通信システム、ソフトウェアアプリケーション、ネットワークデバイス、またはコンピューティングデバイスのセキュリティ、整合性、可用性を侵害すること、
> * 未承諾の大量電子メールまたはその他のメッセージ、プロモーション、広告、または勧誘 (または「スパム」) を配信、公開、送信、または送信を促進すること。

確かに、open proxyは利用規約に挙げられている禁止項目のだいたいに抵触してるように見える。

# AWS Trust & Safetyからのメール②
連絡を受けたAWSアカウントは70人以上で使ってる環境で、open proxyに関して自分では立ててない認識だったので、7/10の一通目をスルーしてたら、次の日に2通目が来ていた。

> We recently sent an abuse report for Open Proxy originating from instance i-xxxxxxxxxxxxxxxxx.
> We see the instance has been terminated.
> However, we’ve received an additional abuse report.
> We wanted to bring this to your attention as this report is for a different instance: i-yyyyyyyyyyyyy.
> I’ve added the report below for you to review.
> Please provide us with details on the corrective measures you have taken to prevent abuse from happening in the future.
> Once we have this information we can finish our investigation into this case and resolve it.
> Thank you for your attention in this matter.

最初にopen proxyを検出したEC2インスタンスは消えたけど、別のインスタンスでもopen proxyが検出されたとのこと。

二度とopen proxyが起動しないように対策しろとあるが、これも華麗にスルー。

# AWS Trust & Safetyからのメール③

7月12日に3通目:

> If we have not heard back from you regarding this case.
> Please provide us an update of the steps you are taking to resolve this issue.
> Without confirmation that the matter has been successfully addressed, we may have to take action against your instance or account to mitigate the issue.
> Thank you for your attention in this matter.

無視してないで対策の進捗を報告しろ。さもなくばお前のインスタンスかアカウントを制限するぞという警告。

今見ると結構温まってきているようでやばそうなんだけど、当時は華金だったのでスルー。

# AWS Trust & Safetyからの最終通告
スルーし続けていたら、7月14日の日曜日に最終通告が来てた:

> FINAL NOTIFICATION
>
> Hello.
> We have not received a response regarding the abuse report implicating resources on your account.
> To mitigate the abuse, we have taken the following steps:
>
> Blocked the ability to Stop and Start EC2 Instances in ap-northeast-1 region
>
> AWS Account ID: 123456789
> Region(s): ap-northeast-1
> Reported Activity: Open Proxy
> Abuse Time: 10 Jul 2024 02:21:07 UTC
>
> The reported activity listed below violates the AWS Acceptable Use Policy (https://aws.amazon.com/aup/).
> In order to resolve this report please reply to this email with the corrective action token to cease the activity.
> Required Actions: Investigate root cause
> If you require further assistance with resolving this abuse report/complaint please see: https://aws.amazon.com/premiumsupport/knowledge-center/aws-abuse-report/
> If you do not consider the activity to be abusive, please reply to this email detailing the reasons why.

連絡がなかったから、ap-northeast-1でのEC2インスタンスの起動停止をブロックした、解除してほしくば根本原因を調査しろとのこと。

Hello.の時点でちょっと怖い。すみませんでした。

# 対策と復旧と反省
Open Proxyのインスタンスを削除して、経緯と今後の対策をメールで返信したら、すぐにブロックを解除してくれた。

反省点としては、AWSでOpen Proxyを一時的にでも立てないことと、AWSからのメールには迅速に対応すること。

AWSでHTTPプロキシ立てるときは、セキュリティグループでアクセス元IPアドレスを絞ったり、アウトバウンド通信のIPアドレスやポートを制限したり、認証付けたりすべし。
