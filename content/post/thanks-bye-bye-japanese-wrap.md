+++
categories = [ "Text Editor" ]
date = "2015-11-16T22:38:11-07:00"
draft = false
cover = "atom_editor_logo.svg.png"
slug = "thanks-bye-bye-japanese-wrap"
tags = [ "atom" ]
title = "ありがとうさようならjapanese-wrap"
+++

テキストエディタ[Atom](https://atom.io/)のとある有名なパッケージの話。

<br>

{{< google-adsense >}}

[以前の記事](https://www.kaitoy.xyz/2015/08/21/japanese-word-selection/)でも触れた[japanese-wrap](https://github.com/raccy/japanese-wrap)。
日本語が画面の端でうまく改行(softwrap)してくれない問題を解決してくれるパッケージ。
Atomで日本語を書く殆どの人がインストールしているであろうパッケージだが、先日11/12にリリースされた[Atom 1.2](http://blog.atom.io/2015/11/12/atom-1-2.html)で[CJK文字](https://ja.wikipedia.org/wiki/CJK%E7%B5%B1%E5%90%88%E6%BC%A2%E5%AD%97) (中国語・日本語・朝鮮語・ベトナム語の文字)のsoftwrapへの対応が実装されたので、もはや不要になった。

むしろ、Atom 1.2でjapanese-wrapを有効にすると、以下のように残念なことになる。

![project tree](/images/thanks-bye-bye-japanese-wrap/w-japanese-wrap.jpg)

<br>

japanese-wrapにはずっとお世話になってきたので申し訳なく名残惜しくもあるが、AtomのSettingsからDisableまたはUninstallさせてもらうしかあるまい。すると以下の様に直る。

![project tree](/images/thanks-bye-bye-japanese-wrap/wo-japanese-wrap.jpg)

<br>

ありがとうさようならjapanese-wrap。
