+++
categories = ["Programming"]
title = "GitHub Copilotは本当に生産性を上げてくれたのか?"
date = "2024-06-24T22:48:42+09:00"
tags = ["copilot", "GenAI"]
draft = false
cover = "github_copilot.png"
slug = "is-copilot-good"
highlight = false
+++

このエントリでは、Yuxuan Shuiによる記事、[Did GitHub Copilot really increase my productivity?](https://trace.yshui.dev/2024-05-copilot.html)を紹介する。
(Shui氏から和訳と転載の許可は得た。)

以下はその全文の和訳だが、意訳超訳が混じっているかもしれないので、もとのニュアンスを知りたければ元記事を読んでもいいし、読まなくてもいい。

<!--more-->

{{< google-adsense >}}

----------------

私は約1年間、GitHub Copilotに無料でアクセスできたので、それを使用し、慣れ、徐々にそれがあるのが当たり前のようになっていきましたが、ある日取り上げられてしまいました。
Copilotのない生活に再度適応する必要がありましたが、同時に、Copilotをどのように使ってきたかをを振り返り、Copilotが実際に役に立ったかどうかを考える機会も与えられました。

Copilotが動作すると、確かに少し魔法のような気分になります。
それは私の脳から直接コードを取り出して、私が受け取れるように画面上に表示してくれるような感じです。
これがないと、ボイラープレートを書かないといけないときに、「うーん、Copilotがやってくれたのに!」と不機嫌になることが多くなることに気づきました。
今ではすべて自分でタイピングしなければなりません。
とは言え、題記の私の質問に対する答えは明確で、「いいえ、無い方が生産性が高くなります」です。説明しましょう。

<br>

免責事項!

この記事では、私自身の個人的な経験についてのみ説明します。
これからご覧になるとおり、私がCopilotに書いてもらうコードはおそらくやや特殊な部類です。
それでも、もしあなたがCopilotにお金を払うべきかどうか考えているなら、この記事がデータポイントとして役立つことを願っています。
また、生成AIが今現在ホットな話題であることは認めておきたいのですが、それは道徳的に良いことなのでしょうか?
著作権を侵害しているのでしょうか?
企業がオープンソースのコードでモデルをトレーニングし、そのコードから利益を得ることは公平でしょうか?
これらはすべて非常に重要な問題です。
ただし、この記事ではそれをすべて脇に置き、生産性についてのみ話したいと思います。

<br>

さて、最初に背景を説明しましょう。
おそらくご想像のとおりの理由から、私は本業ではCopilotを使用していません。
私はそれを自分のプロジェクトにのみ使用しており、最近では自由時間のほとんどを、私がメンテナである単一のプロジェクトである[picom](https://github.com/yshui/picom)(X11コンポジタ)に費やしています。
これを読んで「コンポジタ」が何なのかを知っている人がどれだけいるかはわかりません。
X11がほぼ寿命を迎えており、誰もがゆっくりと、しかし確実に[Wayland](https://ja.wikipedia.org/wiki/Wayland)に移行しているという事実を考えると、結局のところ、それは本当に滅びつつある血統です。
そう、主要なデスクトップ環境にはそれぞれ独自のコンポジタが付属していますが、どの環境にも付属していないものが必要な場合、残された選択肢はほぼpicomだけです。
つまり、それはある意味「唯一無二の」プロジェクトです。

もちろん、他のソフトウェアプロジェクト同様に、picomには、ロギングシステム、文字列操作関数、ソートなど、一般的に見られるコンポーネントが多数含まれています。
しかし、それらすべてがpicomでどのように組み合わされるかは、非常にユニークです。
その結果、そのコードベースのCopilotによる大規模な推論は想定外になります。
訓練中にこのようなプロジェクトを見たことがないため、何をしているのかを理解するのは非常に困難になるでしょう。
つまり、私のCopilotの使用は、ボイラープレートや反復コードなどの作成にほとんど限定されています。
具体的な例を挙げると、[エスケープ文字を解析](https://github.com/yshui/picom/blob/311225be4d9187cbadf7388af87946d9fa62a924/src/c2.c#L1044)する必要があるとします。

```c
if (pattern[offset] == '\\') {
    switch (pattern[offset + 1]) {
    case 't': *(output++) = '\t'; break;
    // ????
    }
}
```

????で示された位置にカーソルを置くと、Copilotが残りのコードを作成することをかなり確実に期待できます。
他には、[enum型を文字列にマッピング](https://github.com/yshui/picom/blob/311225be4d9187cbadf7388af87946d9fa62a924/src/c2.c#L238)する、[共通のパターンを持つグルー関数を作成する](https://github.com/yshui/picom/blob/311225be4d9187cbadf7388af87946d9fa62a924/src/dbus.c#L1421)といった例があります。
言い換えれば、最も単純で退屈なものです。
それはとても良いことです。
そう、私はプログラミングを楽しくしたいと思っている人間で、このような退屈で繰り返しのコードを書くことは、私にとってプログラミングの中で最も楽しくない部分です。
それを誰か(というか何か)に奪われるのは何より嬉しい。

それでは、何が間違っているのでしょうか?
私がCopilotを使用しない方が生産性が高いと言ったのはなぜでしょうか?
それは、Copilotには2つの明らかな問題があるためです。

1. Copilotは予測不可能

    Copilotは、うまくいっているときは非常に役立ちますが、何がうまくいくのか、何がうまくいかないのかを予測するのは非常に困難です。
    Copilotを使って1年が経ち、最初に使い始めたときよりも上手になったと思いますが、まだすべての複雑さを完全に理解することはできません。
    Copilotを擬人化し、人間と同じようにCopilotの能力を測ろうとする罠に陥りがちです。
    たとえば、「ふむ、私のコメントに基づいてあの関数を書くことができたのだから、これも書けるはずだ」と考えるかもしれません。
    しかし、Copilotが投げかけてくる意味不明な内容によって、あなたの間違いが証明される可能性は十分にあります。
    なぜなら、人工知能は人間の知能とは非常に異なっているからです。
    他の人間との生涯にわたる交流を通じて培われた直感は、AIに対しては機能しません。
    つまり、Copilotに実際に試してもらう以外に、それが機能するかどうかを確実に知る方法がないことがよくあります。
    この問題は、Copilotのもう1つの大きな問題によってさらに悪化します。

2. Copilotはおっっっそい

    私が使っているC言語サーバの`clangd`は非常に速い。
    私が入力するよりも速い、ということは実質的に、提案が即時に行われるということです。
    たとえその提案が役に立たなかったとしても、コストはかかりません。
    私が一時停止したり待つ必要がないので、流れが中断されません。
    それに比べて、Copilotははるかに遅いです。
    Copilotから提案が得られるまで少なくとも2～3秒待ちます。
    何らかの理由でCopilotが大量のコードを作成することになった場合、さらに長い時間がかかることになります。
    そして、多くの場合、Copilotが使用できないコードを吐き出すのを確認するためだけに、その秒数を待っていました。
    そして、コメント内の指示を改良してリトライすべきかどうかを判断する必要があります。
    あるいは、提案を部分的に受け入れて、残りを自分で行うこともできます。
    これは(Copilotについて多少理解した後なら)それほど頻繁に起こることではありませんが、こうしたやり取りで多くの時間が無駄になります。

<br>

以上で、私が言いたいことはこれでほぼすべてです。
少なくとも現時点では、Copilotによって生産性が向上するとは思えないので、絶対にお金を払いたくありません。
もし GitHubの計画が、私を中毒にするためにCopilotに1年間無料でアクセスできるようにするというものであったとしたら、彼らの計画は決定的に失敗したということになります。
しかしそうは言っても、Copilotがもう少し賢く、あるいは現在よりも数倍高速であれば、おそらく状況は逆転するでしょう。

うーん、私は怖がるべきでしょうか?

----------------

以上がShui氏の記事。

私自身はGitHub Copilotは使ったことがないが、コードの書き方をChatGPTやWindows付属のCopilotに尋ねることはよくある。
自分でググってStack Overflowとかライブラリのマニュアルを読むより楽に答えが得られたりするので、それなりに助かっている。
ただ、見当はずれの回答が来たり、間違っていることも少なくないので、結局ググる羽目になったりもする。
私の使い方が、コードの書き方のごく一部を断片的に尋ねるぐらいの使い方というのもあって、生産性向上に寄与してくれているかは今のところちょっと疑問。

GitHub Copilotを使うことにより、コーディング作業からもっとシームレスに生成AIを呼び出せるようになれば、適用範囲が広がり、生産性に効いてくるものかと思っていたが、Shui氏の記事をみるとまだ期待しすぎは禁物のようだ。
確かに、生成AIに尋ねる割合が上がれば、その嘘つきっぷりや回答の遅さがより気になってくるんだろうというのが想像できた。

まあすぐに改善されてくるのかもしれないけど。
