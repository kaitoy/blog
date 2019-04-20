+++
categories = [ "Programing" ]
date = "2017-08-25T00:29:39+09:00"
draft = false
cover = "react.png"
slug = "if-youre-a-startup-you-should-not-use-react-reflecting-on-the-bsd-patents-license"
tags = ["react", "license"]
title = "スタートアップはReactを使うべきではない (BSD + patentsライセンスを考慮して) — もし、いつか大企業に買収されたいと望むなら"

+++

このエントリでは、Raúl Kripalaniによる記事、[If you’re a startup, you should not use React (reflecting on the BSD + patents license)](https://medium.com/@raulk/if-youre-a-startup-you-should-not-use-react-reflecting-on-the-bsd-patents-license-b049d4a67dd2)を紹介する。
(Raúlから和訳と転載の許可は得た。)
以下はその全文の和訳だが、意訳超訳が混じっているので、もとのニュアンスを知りたければ元記事を読んでもいいし、読まなくてもいい。

<br>

2017/9/23追記: React、Jest、Flow、Immutable.jsが[MITにリライセンスされる](https://code.facebook.com/posts/300798627056246/relicensing-react-jest-flow-and-immutable-js/)というアナウンスがFacebookからあった。
コミュニティの大勝利だ。

<br>

{{< google-adsense >}}

----------------

__現在オープンソースコミュニティで起こっていることには落胆させられる。__
特に、オープンソースのおかげで多くのスタートアップやビジネスが存在することを認識したときは。
独占的なソフトウェアのために法外なライセンス料を払わなければならないとしたら、それらは存続できない。

__オープンソースとは、より良いソフトウェアをみんなで構築するためのコミュニティをつくることだ。
それを、— Facebookが意図しているような — 人々の権利を交換するための市場として決して使用すべきではない。__

Facebookは「BSD + patents」というライセンスモデルを推進している。
広く人気のあるReactを含む、すべてのプロジェクトで。

基本的に、「BSD + patents」はコードが(誰でも参照し利用できるように)公開されていることを意味するが、しかしそれは常にFacebookの著作物でもある。
そして彼らは、__君がFacebookを特許侵害で訴えないで__ 仲良くやっている限り、君に特許ライセンスを与える。

Facebookを訴えた瞬間、Reactの他、君の使っているあらゆるFacebookの「オープンソース」技術の特許権は自動的に取り消されてしまう。

アディオス、バイバイ、どこかへ行ってしまう。

![React PATENTS](https://cdn-images-1.medium.com/max/800/1*crzf_h-aHXU-g3J0W6Ryig.png)

(https://github.com/facebook/react/blob/b8ba8c83f318b84e42933f6928f231dc0918f864/PATENTS)

<br>

この問題は、Apache Software Foundationによって[衆目にさらされることとなった](https://github.com/facebook/react/issues/10191#issuecomment-323486580)。

___この制限は広大で、残忍だ。___

<br>

・・・

<br>

その知的財産がReactを使用しているドメインと関連しているかどうかは関係ない。

__君がReactを使うなら、Facebookが保持する特許に逆らうことはできない。
いつまでも。__

<br>

___言い換えれば、代償。___

<br>

Facebook、それが君らの考えるオープンソースなのか?

<br>

・・・

<br>


# Fridgebook Inc.
例として、君の会社「Fridgebook Inc.」はインテリジェントな冷蔵庫を販売しているとしよう。
君の冷蔵庫にはスクリーンが付いていて、独自のアプリケーションを実行していて、そのUIにはReactが使われている。

![Fridge](https://cdn-images-1.medium.com/max/800/1*vfurq6EY120rZCwkaVtsCg.png)

<br>

突然、Facebookは冷蔵庫業界への進出を決め、新製品「FBfridge」をわずか1週間後に世界中でローンチすると発表した。

<br>

___仮に、Facebookがあなたの特許の一部を「FBfridge」で露骨に侵害していた場合、どうすればいい?___

<br>

そう、__君は即座に彼らを訴えることはできない。__
君は顧客が使うアプリにReactを使っている、だろ?

もし他のもの([vue.js](https://vuejs.org/)とか)に移行せずに訴えたら、Reactのために与えられたライセンスを即座に失い、思いがけず君自身が違反している状態になり、__ソフトウェア不正使用の訴訟を約5000億ドルの会社から起こされる可能性と戦うことになる。__
君だけで。

もちろん、君は顧客サービスを中断したくはない。

だから、もし彼らを訴えたい、もしくは少なくともそれをするための効力を保持したいのであれば、__記録的な期間でReactから移行できる解決策を見つける必要がある__。

それが君の陥るひどい窮地だ。そうだろ?
それはほとんど致命的な状況だ。
__回避策?
最初からReactを使わないことだ。__
そうすれば権利を主張する自由を維持できる。

```
注: 私は特許に支持も反対もしない。私はこの問題について明確な立場を持っていない。
ここでは私は単にギブアンドテイクのバランスを分析しているだけだ。
```

# Facebookの釈明
私が最後に見たとき、オープンソースの哲学は、よりよいソフトウェアを構築し、技術をより先に推し進めるために、有能な人々が砂粒に貢献するコミュニティを主要なテーマとしていた。

それが、Apache Software FoundationやLinux Foundationなどの、__オープンソース界の主要な基準組織の精神だ__。

<br>

___それで、なぜ特許をオープンソースに持ち込んだのか?___

Facebookは[正式な釈明](https://code.facebook.com/posts/112130496157735/explaining-react-s-license/)を発表した。
短く要約すると次のようなものだ:

```
Facebookは、多くのメリットのない特許請求を受けている。
それらに対抗すると多くのリソースを無駄にする。
そこで、(Reactのなどの)オープンソースプロジェクトの成功を利用して、ユーザが理論上メリットのない特許請求を提起するのを阻止するトロイの木馬を導入することに決めた。
彼らはこの制限を交換しない。
```

__しかしここに重要な部分がある__。
彼らは、オープンソースソフトウェアをリリースする他のすべての企業が同じことを _すべきだと主張している_ 。

__残念ながら、これはうまくいかず、以下のような要因により、いずれ再び業界のクローズドソース化を招くだろう：__

1. それは市場最大級のプレーヤー間のコンセンサスを必要とする。
  __彼らは競合他社に対抗する力として実際の特許兵器(下の画像参照)を保有している。__
  突然、これらの兵器の価値が$0になってしまう。
2. そのコンセンサスに達するまず不可能だ。
  参加しない悪徳企業が1つでもあれば、残りの企業は「守備/特許兵器」を維持する必要がある。
3. すべての巨人達が「BSD + patents」スキームに基づくオープンソースに合意した場合でも、__相互採用はしだいに無くなるだろう。
  なぜかって?__
  GoogleがProject Xを「BSD + patents」でリリースし、Amazonがそれを本当に気に入ったら、それを採用してGoogleに特許訴訟をする権利を永久に失うよりは、__それを見限って自分たちで作ってしまうだろう。__
4. これは、そうした製品の周りにコミュニティが形成されないことを意味する。
  コミュニティは、オープンソース製品の燃料でありインセンティブだ。
  __コミュニティに着火するチャンスがないならば、オープンソースにする理由はない。__
5. やがて、上記の状況が何度も繰り返されるにつれ、巨人達は製品をオープンソース化することに価値を見出さなくなり、業界は結局クローズドソースモデルに陥る。

![patent arsenals](https://cdn-images-1.medium.com/max/800/1*VL9qHHrYQ_HMiShoNO4qeg.png)

(2012) http://www.droid-life.com/2012/01/24/web-of-tech-patent-lawsuits-infographic/

# Facebookによるオープンソース哲学の非倫理的な利用
特許はアイデアや発明を保護する。
ほとんどの場合特許主張裁判は、白黒が付くのではなく、勝ち負けになる。
__侵害の評価は複雑でコストがかかる。__
ひとつの訴訟を提起して遂行するのに、何十万か何百万ドルもかかり得る。
FBが君の特許を侵害したという85％の確信を持っていたとしても、それを追求するのに多額の費用がかかるだろう。

それに加え、まずは別のフロントエンドフレームワークへの移行に投資し、__さらにすべての顧客が新しいバージョンの製品を使用していることを確認する必要がある。__
(React Nativeを使用していたとするとどうなる? ユーザは一斉にはアプリをアップグレードしてくれないかもしれない!)
そうしなければ、訴訟を起こすことさえできない。
これがオープンソース哲学の誠実で倫理的な利用法だと思うか?

要点:

```
オープンソースは、「代償」取引ではない。
オープンソースは、よりよいソフトウェアを一緒に構築するためのコミュニティをつくることだ。
権利を交換するための市場として使用されるべきではない。
```

君はどう思う?

<br>

・・・

<br>

# なぜスタートアップはReactを避けるべきなのか
君がスタートアップを立ち上げているなら、君と君の投資家は、いつかは百万ドルの価値のある出口に到達することを望んでいるんだろう?

君は、すべての買収元、特にApple、Microsoft、Google、Amazonなどの大企業に扉を開いておきたい。

__そうした企業は、Facebookに対抗して特許兵器を保有している可能性が高いし、そうでなかったとしても、いざという時にFacebookを訴える権利を放棄したくはない。__

君の製品がReactで構築されている場合、君を買収することはその権利を失うことを意味し、これは恐らく彼らが覚悟できていないことだ。

```
基本的に、もし君を買収することがFacebookの特許侵害を訴える権利を永久に放棄することを意味するなら、
潜在的なバイヤーは10フィートの棒で君を触らない。
```

よって、選択肢を残しておきたいのであれば…

# 悪いことは言わない、Reactを使うのをやめろ
私は特に[Preact](https://github.com/developit/preact)が好きだが、FacebookにVirtual DOMやReact APIのソフトウェア特許を持っているかは定かではない。

もし持っていたら、Preactはそれらの特許を侵害しているかもしれないので、[vue.js](https://vuejs.org/)や[cycle.js](https://cycle.js.org/)も見てみるといい。

いずれ、知的財産の観点でPreactと[Inferno](https://github.com/infernojs/inferno)(もうひとつの軽量なReactの代替品)がどうなのかをコミュニティが明確にできることを願う。

----------------

以上がRaúlの記事。

Facebookの「BSD + Patents」への流れは、2015年4月に書かれた[Updating Our Open Source Patent Grant](https://code.facebook.com/posts/1639473982937255/updating-our-open-source-patent-grant/)というブログ記事でのアナウンスから始まったようだ。

Reactのコミットログを見てみると、2014年10月、v16.0.0のアルファ版で「Apache License Version 2.0」から「BSD + Patents」に変わったことが以下のコミットからわかる。

* [BSD + PATENTS](https://github.com/facebook/react/commit/dcf415c2b91ce52fd5d4dd02b70875ba9d33290f)

そのPATENTSの部分をより明確にしたのが2015年4月の以下のコミット。

* [Update Patent Grant](https://github.com/facebook/react/commit/b8ba8c83f318b84e42933f6928f231dc0918f864)

このPATENTSの条項をApache Software Foundationが問題視し、2017年7月に、Apache Software Foundationは自身の全プロジェクトで「BSD + Patents」なOSSの使用を禁止した。
で、Reactのライセンスを「Apache License Version 2.0」に戻せと言ったのをFacebookがごね、ついには、2017/8/19に公式に[「BSD + Patents」と心中する](https://code.facebook.com/posts/112130496157735/explaining-react-s-license/)という声明を出して炎上した、というのが今までの流れ。

Reactのほか、Jest、Flow、Immutable.js、GraphQLなんかもアウト。
うちのプロジェクトでちょっとJestとFlow使いたいと思ってたけど様子見だな。

Facebookの、みんなもそうすべきだという思惑に反し、今のところはPalantirという企業だけが同様のライセンスを採用しているらしい。

因みに、たまにBSD + patentsライセンスが[オープンソースの定義(OSD)](http://www.opensource.jp/osd/osd-japanese.html)に違反しているので、ReactはOSSですらないという主張があるが、これは間違いであるというのが大方の見方だ。
この主張は、[Robert Pierceによる記事](https://www.elcaminolegal.com/single-post/2016/10/04/Facebook-Reactjs-License)が多分発端で、OSDの第一条「再頒布の自由」で、ソフトウェアの再配布に関して報酬(fee)を要求してはいけないとしている部分に、BSD + patentsライセンスが違反しているというもの。
すなわち、Facebookを訴えないという報酬を要求しているという主張だが、この解釈は法律家によって[否定されている](http://lu.is/blog/2016/10/31/reacts-license-necessary-and-open/)。

また、OSDの第五条「個人やグループに対する差別の禁止」に違反しているからという主張もあるが、これも微妙。
この主張はつまり、Facebookを訴えていないグループと比較して、訴えたグループを差別しているという主張だろうが、Apache License 2.0、EPL、MPL 2.0といったメジャーなライセンスでも、そのような「差別」をする(i.e. 訴えたら特許使用権を剥奪する)条項がある。
これらのライセンスは、OSDをメンテしている組織であるOSIに[承認されている](https://opensource.org/licenses/alphabetical)ので、そうした差別がOSDに決定的に違反することではないことは明らか。
([この議論](https://lists.opensource.org/pipermail/license-discuss/2016-December/thread.html)を見るに、厳密には違反しているけど、原理主義よりも現実主義であるべきなので、受け入れるべきといった雰囲気。)
BSD + patentsライセンスによる「差別」のような条項が、特別なものでも新しいものでもないことは[OSI自身も言及している](https://opensource.org/node/862)。

FacebookのBSD + patentsライセンスが特別なのは、その「差別」の範囲が広いことだ。
Apache License 2.0なんかは、訴えた特許を含むソフトウェアだけが使えなくなるが、Facebookのは、Facebookに対するいかなる特許訴訟でもひとたび起こせば、Facebookが提供する広範囲の(全ての?)OSSが使えなくなるというもので、これはあまりにジャイアン的だということで炎上した。

Facebookはこの炎上をどう収めるつもりなんだろう。
これをきっかけにReactが廃れ、Vue.jsとかに行ってしまうんだろうか。
結局フロントエンドフレームワークは何を学べばいいの?
Angular?
