+++
categories = [ "Web" ]
date = "2016-07-01T14:17:41-06:00"
draft = false
eyecatch = "cloudflare.png"
slug = "https-support-by-cloudflare"
tags = [ "blog", "cdn"]
title = "CloudFlareでブログをHTTPS化"
+++

最近[GitHub Pages](https://pages.github.com/)がHTTPSに正式対応したというニュースを見たことをきっかけに、このブログを[CloudFlare](https://www.cloudflare.com/)で常時HTTPS化した話。

## このブログ
このブログは[GitHub Pagesでホストされている](https://tbd.kaitoy.xyz/2015/08/15/github-pages-and-jekyll/)。
GitHub Pages上のWebサイトはデフォルトでは`<GitHubユーザ名>.github.io`というドメインで公開されるが、ちょっとかっこつけたかったのでカスタムドメイン(`tbd.kaitoy.xyz`)にした。

GitHub Pagesは2014年3月から非公式にHTTPSをサポートしていて、2016年6月8日に[正式サポートを表明](https://github.com/blog/2186-https-for-github-pages)したが、これは`<GitHubユーザ名>.github.io`ドメインだけが対象であり、カスタムドメインはHTTPSサポートされていない。

要するにこのブログにはHTTP接続しかできない状態だった。
これをなんとかHTTPSに対応させたかった。

## なぜHTTPS
HTTPS化(常時SSL化)が世界的な流行りな雰囲気を感じていたのと、なにより、[Googleに優遇してもらえるから](http://googlewebmastercentral-ja.blogspot.com/2015/12/indexing-https-pages-by-default.html)。
Googleの検索結果の2,3ページ目までに出てこないなら、そのサイトはこの世に存在しないのとあまり変わらない。

昔はHTTPSにするとSSLプロトコルのオーバーヘッドや暗号化/復号化処理によりHTTPに比べて遅くなると言われていたが、最近ではサーバ/クライアントマシンの性能が上がり、このデメリットは気にするほどのものではなくなった。
逆に、常時SSL化すると[SPDY](https://ja.wikipedia.org/wiki/SPDY)や[HTTP/2](https://ja.wikipedia.org/wiki/HTTP/2)といった高速なプロトコルの恩恵を受けることができるようになり、HTTPより速くなることもあるらしい。

## カスタムドメインなGitHub PagesサイトをHTTPS対応する方法
上記の通りこのブログはカスタムドメインでGitHub Pagesのサポートがなく直接にはHTTPS対応できない。
よって間接的に対応することになるので、[リバースプロキシ](https://ja.wikipedia.org/wiki/%E3%83%AA%E3%83%90%E3%83%BC%E3%82%B9%E3%83%97%E3%83%AD%E3%82%AD%E3%82%B7)を使うことになる。
リバースプロキシサーバを自分で運用するのは大変なので、[CDN](https://ja.wikipedia.org/wiki/%E3%82%B3%E3%83%B3%E3%83%86%E3%83%B3%E3%83%84%E3%83%87%E3%83%AA%E3%83%90%E3%83%AA%E3%83%8D%E3%83%83%E3%83%88%E3%83%AF%E3%83%BC%E3%82%AF)サービスを利用する。

CDNサービスでまず思い当たったのはAWSの[CloudFront](https://aws.amazon.com/jp/cloudfront/)だけど、なんだか大げさで面倒そう。
あとは[CloudFlare](https://www.cloudflare.com/)が有名なので調べたところ、手軽で無料でよさそうだったのでこれにした。

因みに、ごく最近始まったサービスの[Kloudsec](https://www.kloudsec.com/)というのも見つけたけど、まだベータが付いているし、遅いだのそもそもつながらないだの評判が悪かったのでこれは無し。

CloudFlareを利用すると、もともとだいたいこんな感じ↓だったのが、

<ul class="bxslider">
  <li><img src="/images/https-support-by-cloudflare/direct/スライド1.PNG" /></li>
  <li><img src="/images/https-support-by-cloudflare/direct/スライド2.PNG" /></li>
  <li><img src="/images/https-support-by-cloudflare/direct/スライド3.PNG" /></li>
  <li><img src="/images/https-support-by-cloudflare/direct/スライド4.PNG" /></li>
  <li><img src="/images/https-support-by-cloudflare/direct/スライド5.PNG" /></li>
  <li><img src="/images/https-support-by-cloudflare/direct/スライド6.PNG" /></li>
  <li><img src="/images/https-support-by-cloudflare/direct/スライド7.PNG" /></li>
  <li><img src="/images/https-support-by-cloudflare/direct/スライド8.PNG" /></li>
  <li><img src="/images/https-support-by-cloudflare/direct/スライド9.PNG" /></li>
</ul>

こんな感じ↓になる。多分。

<ul class="bxslider">
  <li><img src="/images/https-support-by-cloudflare/cdn/スライド1.PNG" /></li>
  <li><img src="/images/https-support-by-cloudflare/cdn/スライド2.PNG" /></li>
  <li><img src="/images/https-support-by-cloudflare/cdn/スライド3.PNG" /></li>
  <li><img src="/images/https-support-by-cloudflare/cdn/スライド4.PNG" /></li>
  <li><img src="/images/https-support-by-cloudflare/cdn/スライド5.PNG" /></li>
  <li><img src="/images/https-support-by-cloudflare/cdn/スライド6.PNG" /></li>
  <li><img src="/images/https-support-by-cloudflare/cdn/スライド7.PNG" /></li>
  <li><img src="/images/https-support-by-cloudflare/cdn/スライド8.PNG" /></li>
  <li><img src="/images/https-support-by-cloudflare/cdn/スライド9.PNG" /></li>
  <li><img src="/images/https-support-by-cloudflare/cdn/スライド10.PNG" /></li>
  <li><img src="/images/https-support-by-cloudflare/cdn/スライド11.PNG" /></li>
</ul>

上のスライド中のリバースプロキシは実際にはいくつもあり、[エニーキャスト](https://ja.wikipedia.org/wiki/%E3%82%A8%E3%83%8B%E3%83%BC%E3%82%AD%E3%83%A3%E3%82%B9%E3%83%88)によってブラウザから一番近いものが使われる。

## CloudFlare事始め
CloudFlareの始め方は[Qiitaの記事](http://qiita.com/superbrothers/items/95e5723e9bd320094537)を参考にした。

1. CloudFlareのアカウント作成

    [CloudFlareのサイト](https://www.cloudflare.com/)に行って`Sign up`のリンクからメアドとパスワードを渡してアカウントを作成。

2. CloudFlareにサイトを登録

    アカウント作成後に開くページに従い、4つのステップをこなすとサービス利用開始できる。

    まずはサイトの登録。
    サブドメインを除いた`kaitoy.xyz`を入力して`Begin Scan`をクリック。

    ![add_domain.png](/images/https-support-by-cloudflare/add_domain.png "add_domain.png")

    何かのスキャンが始まるので1分ほど待つ。何をしているのかはよくわからない。

3. CloudFlareのDNSの設定

    次のステップでCloudFlareのDNSにレコードを登録する。
    ブラウザからのトラフィックの誘導には`A`か`AAAA`か`CNAME`を登録できる。
    トラフィックは`kaitoy.github.io`に送りたいけど、IPアドレスは自分でコントロールできないので`A`と`AAAA`は使えない。
    `CNAME`を登録した。

    ![dns.png](/images/https-support-by-cloudflare/dns.png "dns.png")

    適当に入力して`Add Record`を押すとレコードを登録できるが、`Status`のところがデフォルトで`DNS only`(灰色のクラウドのアイコン)になっているので、アイコンをクリックして`DNS and HTTP proxy (CDN)`(オレンジ色のクラウドのアイコン)にしておく。
    こうしないとブラウザからのトラフィックがCloudFlareを経由せず、HTTPS化できないはず。

4. プランの選択

    サービスプランは無料の`Free Website`を選択。常時SSL化するだけならこれで十分なはず。

    ![select_plan.png](/images/https-support-by-cloudflare/select_plan.png "select_plan.png")

5. レジストラのネームサーバの変更

    最後にレジストラのサイトに行ってネームサーバを変更するように指示される。

    ![change_your_ns.png](/images/https-support-by-cloudflare/change_your_ns.png "change_your_ns.png")

    CloudFlareからは二つのネームサーバが割り当てられたようだ。
    指示されたとおりに変更する。

## CloudFlareの設定
サインアップが終わるとCloudFlareのダッシュボードが開く。

<br>

![dashboard.png](/images/https-support-by-cloudflare/dashboard.png "dashboard.png")

<br>

ダッシュボードの`Overview`の`Statusは`最初は`Pending`になっていて、これはネームサーバの変更を反映中ということらしかった。
ネームサーバの変更は数時間くらいかかったが、変更中も`http://tbd.kaitoy.xyz/`にはアクセスできた。

ダッシュボードからやった設定は以下。
これも[Qiitaの記事](http://qiita.com/superbrothers/items/95e5723e9bd320094537)を参考にした。

1. SSL

    ダッシュボードの`Crypto`の`SSL`の設定はデフォルトで`Full (strict)`になっている。
    これはブラウザ-CloudFlare間とCloudFlare-GitHub Pages間両方をSSL化する設定。
    上で書いたようにGitHub Pagesの方はSSL対応できずこの設定は使えないので、`Flexible`に変更。
    こちらはブラウザ-CloudFlare間だけをSSL化する。

    この設定変更をして、SSL証明書が発行されるまで数時間待ったら`https://tbd.kaitoy.xyz/`にアクセスできるようになった。

2. HSTS

    [HSTS](https://ja.wikipedia.org/wiki/HTTP_Strict_Transport_Security)はHTTPでアクセスしてきたブラウザにHTTPSでアクセスするよう指示する仕組み。
    これを有効にしてよりセキュアにする。
    ダッシュボードの`Crypto`の`HTTP Strict Transport Security (HSTS)`から以下の様に設定した。

    ![hsts.png](/images/https-support-by-cloudflare/hsts.png "hsts.png")

    `kaitoy.xyz`だけじゃなくて`tbd.kaitoy.xyz`で有効にするため、`Include subdomains`を`On`にしておくのが肝要のはず。

3. HTTPSへのリダイレクト

    HTTPでのアクセスをHTTPSにリダイレクトする設定を加える。
    ダッシュボードの`Page Rules`で以下のルールを作った。

    ![page_rules.png](/images/https-support-by-cloudflare/page_rules.png "page_rules.png")

## ブログサイトの修正
`link`タグや`script`タグの`tbd.kaitoy.xyz`を指しているURLをHTTPSに修正。
内部リンクも全部HTTPSにした。これで完了。
