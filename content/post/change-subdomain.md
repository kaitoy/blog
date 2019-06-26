+++
categories = [ "Web" ]
date = "2017-02-14T09:51:42-07:00"
draft = false
cover = "Google-search-console.png"
slug = "change-subdomain"
tags = [ "blog", "github", "hugo", "seo" ]
title = "ブログアドレスを変更したときにやったこと"
+++

このブログの閲覧数がそこそこの規模になってきたので、[Google AdSense](https://www.google.co.jp/adsense/start/)で小遣い稼ぎを始めようとしたら、最近サブドメインが`www`じゃないとできないようになったようだったので、サブドメインを`tbd`から`www`に変更した話。

変更自体はそんなに難しくなかったけど、Googleの検索順位を保つためにいろいろ気を使う必要があった。

<!--more-->

{{< google-adsense >}}

# ブログアドレスの変更
[以前](https://www.kaitoy.xyz/2015/08/28/using-hugo/)にも書いたが、このブログは[__Hugo__](https://gohugo.io/)で作って[__GitHub Pages__](https://pages.github.com/)でカスタムドメインで公開している。

コメント欄を設けるために[__Disqus__](https://disqus.com/)を使っている。

[__Cloudflare__](https://www.cloudflare.com/)を使って[全体をHTTPS化](https://www.kaitoy.xyz/2016/07/01/https-support-by-cloudflare/)していて、その関係で`kaitoy.xyz`ドメインの名前解決にはCloudflareのDNSを使っている。

アクセス解析などのために[__Google Analytics__](https://analytics.google.com/)と[__Google Search Console__](https://www.google.com/webmasters/tools/home)を使ってる。

この構成で、ブログアドレスの変更に必要だった修正を列挙する。(この順にやったわけではない。)

## 1. ブログソース修正
Hugoの設定ファイルである`config.toml`に書いてある`baseurl`の値を`https://tbd.kaitoy.xyz`から`https://www.kaitoy.xyz`に変え、また、各記事の内部リンクのURLも`www`のに変えた。

あと`robots.txt`の`Sitemap`のURLも`https://www.kaitoy.xyz/sitemap.xml`に更新した。

## 2. GitHub Pagesの設定変更
[ブログリポジトリ](https://github.com/kaitoy/blog)に行って、`Settings`の`GitHub Pages`欄の`Custom domain`の値を`https://www.kaitoy.xyz`に変えた。

ついでにブログリポジトリのトップに表示される`Description`の`Website`の値も新しいURLに変更した。

この変更によりありがたい副作用もあった。
GitHub Pagesは`www`というサブドメインを特別扱いしていて、以下の恩恵を受けられるのだ。

* wwwを省略したURL(apex domain)でアクセスすると、GitHub Pagesサーバがwww付きのURLに[リダイレクトしてくれる](https://help.github.com/articles/setting-up-an-apex-domain-and-www-subdomain/)。
* [安定していて速い](https://help.github.com/articles/about-supported-custom-domains/#www-subdomains)。

## 3. CloudflareのDNS設定変更
CloudflareのDNSで、もともと`CNAME`レコードで`kaitoy.github.io`(GitHub Pagesのデフォルトのドメイン)のエイリアスを`tbd`にしていたのを`www`に変更した。

また、上記の通りapex domainでGitHub Pagesにアクセスしても上手いことやってくれるようになったので、`www.kaitoy.xyz`のエイリアスを`kaitoy.xyz`とする`CNAME`レコードを追加した。
CloudflareのDNSはapex domain(i.e. `kaitoy.xyz`)に対する`CNAME`レコード設定を[サポートしている](https://support.cloudflare.com/hc/en-us/articles/200169056-CNAME-Flattening-RFC-compliant-support-for-CNAME-at-the-root)ので、これで`www.kaitoy.xyz`でも`kaitoy.xyz`でもGitHub Pagesにルーティングされるようになった。

## 4. Disqusの設定変更
ホームの右上の歯車アイコンから`Admin`を開いて、ヘッダの`Settings`からブログのURLを選んでその設定画面を開き、`Website URL`を`https://www.kaitoy.xyz`に変更した。

## 5. Google Analyticsの設定変更
`管理`タブの`プロパティ設定`の`デフォルトの URL`を`https://www.kaitoy.xyz`に変更しただけ。

# Googleのページランクを保つためのあれこれ
以前もどこかに書いたが、どんなにすばらしい内容の記事を書いてもGoogle検索結果の2,3ページくらいまでに出てこないんであれば誰も読んでくれない。
このブログのいくつかの記事はそれなりにいいキーワードでいい検索順位になっていたので、サブドメイン変更によってページランクに悪影響が出るのはなるべく避けたかった。

調べたら、[Google Search Consoleのヘルプ](https://support.google.com/webmasters/answer/6033049?hl=ja&ref_topic=6033084)にまさにその悪影響を防ぐ方法が載っていたので、これに従ってあれこれした。

## 1. 自身を参照する `rel="canonical"`リンクタグを付ける
ブログの全てのページのヘッダに以下の様な移転先アドレスを指すlinkタグを付け、変更後のアドレスが正式なアドレスであることをGooglebotに教えてやる。

```html
<link rel="canonical" href="https://www.kaitoy.xyz/2015/07/18/first-post/">
```

Hugoのソースでいうと以下の感じ。

```html
<link rel="canonical" href="{{ .Permalink }}">
```

## 2. HTTP 301リダイレクトを設定
多分これが一番重要なんじゃなかろうか。

HTTPステータスコードの[301](https://support.google.com/webmasters/answer/93633)はサイトのコンテンツが別のURLに恒久的に移転したことを示すもので、移転前のURLにアクセスしたクライアントに301を移転先のURLとともに返してやることで、HTTPレベルでのリダイレクトをさせることができる。

GooglebotもこのステータスコードでブログURLの変更を知ることができるので、検索結果をよしなに移行してくれるはず。

301を返すサーバには[XREA](https://www.xrea.com/)の無料サーバを使った。
このブログのドメインは[バリュードメイン](https://www.value-domain.com/)で買ったもので、ここがXREAと提携していたので無料サーバも合わせて確保していたもののほとんど使っていなかったので調度よかった。
調べたらこのサーバで、[Apache HTTP Server](https://httpd.apache.org/)の設定ファイルである`.htaccess`が使えることが分かったので、以下の内容で作って`/public_html/`に置いた。

```apache
<Files ~ "^\.ht">
deny from all
</Files>

# Redirect
Redirect permanent / https://www.kaitoy.xyz/
```

また、サーバの管理ページからドメインウェブ設定画面に行き、Mainのドメイン名を`tbd.kaitoy.xyz`に設定。

あとはCloudflareのDNS設定で、`tbd`を上記XREAサーバのIPアドレスに解決する`A`レコードを追加して完了。

## 3. Google Search Consoleのアドレス変更ツール実行
最後の仕上げとして、Google Search Consoleの[アドレス変更ツール](https://support.google.com/webmasters/answer/83106)を使ってGooglebotにアドレス変更を通知した。

このツールはGoogle Search Consoleの管理サイトごとのページの右上の歯車アイコンから`アドレス変更`を選択すると開け、以下のようなものが表示される。

![change_address.png](/images/change-subdomain/change_address.png)

<br>

このウィザードに従って、移転先URL(プロパティ)の追加、301リダイレクトの動作確認、サイトの存在確認をして、アドレス変更のリクエストを送信するだけ。

最後に、追加したプロパティの`クロール`の`サイトマップ`から、移転先サイトのサイトマップを送信して完了。
サイトマップはHugoがビルド時に生成してくれたやつ。

今[Google Search Consoleのヘルプ](https://support.google.com/webmasters/answer/6033049?hl=ja&ref_topic=6033084)を見直したら移転前のサイトマップも送信しろと書いてあるのに気付いた。
これはやらなかったけど、やった方がよかったのかも。

ともあれ、移転後一時的に検索順位が大きく落ちたものの、1,2週間位でもとにもどったので、この移転は概ね成功だったと思う。
