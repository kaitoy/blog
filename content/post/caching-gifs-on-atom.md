+++
categories = [ "Text Editor" ]
date = "2015-09-07T20:10:31-06:00"
draft = false
cover = "atom_editor_logo.svg.png"
slug = "caching-gifs-on-atom"
tags = [ "atom", "disturb-me" ]
title = "AtomにおけるGIF画像のキャッシュ"
+++

以前、[__disturb-me__](https://atom.io/packages/disturb-me)という[__Atom__](https://atom.io/)パッケージを作ったという[エントリ](https://www.kaitoy.xyz/2015/09/06/disturb-me/)を書いた。
このエントリでは、disturb-meに見つけたバグの修正のなかで、AtomがGIF画像をキャッシュする問題に対応したという話を書く。

<!--more-->

{{< google-adsense >}}

# disturb-meのバグ
[以前のエントリの最後](https://www.kaitoy.xyz/2015/09/06/disturb-me/#6-%E3%83%AA%E3%83%AA%E3%83%BC%E3%82%B9%E3%81%AA%E3%81%A9)にも書いた通り、disturb-me 1.0.0には、ループしないGIFアニメーション画像を設定で指定した場合、そのアニメーションが画像の初回表示時にしか再生されないというバグがある。

disturb-meは、`Ctrl+Alt+d Ctrl+Alt+m`と入力すると画像を表示し、もう一度それを入力すると画像を消す。
デフォルトで表示する画像はAtomのロゴで、表示を始める時と消す時にGIF画像でループしないアニメーションを再生する。

![screenshot](https://github.com/kaitoy/disturb-me/raw/master/assets/disturb-me-demo.gif)

<br>

このデフォルトの状態で、一度Atomロゴを表示して消して、再度表示して消すと、消すときのアニメーションが再生されない。(表示を始める時のアニメーションはなぜか再生される。)

# バグの原因
disturb-meは、`img`タグをAtomウィンドウ内に追加した後、その`src`属性に画像へのパスをセットして画像を表示させるが、どうもAtom(のChromium)が画像をキャッシュしてくれるせいで、一度表示し終わったGIFアニメーションは二度と再生されない模様。
なぜ表示開始時のアニメーションが再生されるかは不明。

# バグ修正
外部リソースをロードするときにブラウザによるキャッシュを回避するには、URLにランダムな値をもつクエリストリングを付けるのが常套手段。

今回のバグも、`src`にセットするGIF画像のパス(URL)にそのようなクエリストリングをつければよい。
例えば、__C:\images\hoge.gif__を表示したいなら、`<img src="C:\images\hoge.gif?time=1441559906660"><img>`という風にする。
ここでtimeの値には`Date.now()`とかで毎回違う値を生成して使う。

# Atomプロトコルの問題
ここで一つ問題が。disturb-meがデフォルトで使うAtomロゴの画像はパッケージに含まれていて、そういうリソースのURLには[__Atomプロトコル__](https://atom.io/docs/latest/creating-a-package#bundle-external-resources)を使うのが普通。
Atomプロトコルを使うと、`atom://disturb-me/assets/atom/white/atom_born.gif`みたいに書いて、パッケージ内の相対パスでリソースを指定できる。

このAtomプロトコルが、今の時点(Atom v1.0.11)でクエリストリングに対応していない。困った。

# Atomプロトコルの問題への対応
いい機会なので、Atomのソースをfork、cloneして、Atomプロトコルを(簡易的に)クエリストリングに対応させ、ビルドして確認し、プルリクエストを送ってみた。これについてはまた別のエントリで書くかもしれない。

このプルリクエストが取り込まれるまでの暫定対策として、[Atomプロトコルハンドラのソース](https://github.com/atom/atom/blob/master/src/browser/atom-protocol-handler.coffee)を見て、AtomプロトコルのURLからリソースのファイルシステム上での絶対パスを導いている部分をdisturb-me内にパクって、`src`にセットする値として`atom://`を使わないようにした。

これでちゃんと動いた。
