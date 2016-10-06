+++
categories = [ "Version Control System" ]
date = "2016-01-01T18:38:02-07:00"
draft = false
eyecatch = "git.png"
slug = "git-revert-reset"
tags = [ "git", "vcs" ]
title = "git resetとrevertを図解する"
+++

[この記事](https://tbd.kaitoy.xyz/2015/12/27/git-repository/)を読んだことを前提に、[__Git__](https://git-scm.com/)の `git revert` と `git reset`というコマンドについて説明する。
この二つはしばしばコミットを取り消すコマンドとして同じ文脈で説明されることが多いのでこのエントリでも一緒に説明するが、実際は全く異なるコマンドだし、そもそもどちらもコミットを取り消すコマンドではない。

## git revert
`git revert`は、指定したコミットが持ち込んだ変更を打ち消すコミットを追加する。
リバースパッチを適用すると言ってもよい。
コミットを追加しかしないので、このコマンドによって既存のコミットが消えたり変わったりすることはない。

図にすると以下の感じ。単純。

<ul class="bxslider">
  <li><img src="/images/git-revert-reset/git_revert/スライド1.PNG" /></li>
  <li><img src="/images/git-revert-reset/git_revert/スライド2.PNG" /></li>
</ul>

## git reset
`git reset`には二つの機能がある。
インデックスを再設定する(i.e. resetする)機能と、`HEAD`を付け替える(i.e. resetする)機能だ。

#### インデックスの再設定
インデックスの再設定をするコマンドは`git reset <ワーキングディレクトリ内のファイルのパス(複数可)>`。
これを実行すると、指定したファイルについて、`HEAD`が指すコミットが指すツリー内のブロブを指すようインデックスを更新する。

何を言っているのかわからないので図にする。

<ul class="bxslider">
  <li><img src="/images/git-revert-reset/git_reset_path/スライド1.PNG" /></li>
  <li><img src="/images/git-revert-reset/git_reset_path/スライド2.PNG" /></li>
  <li><img src="/images/git-revert-reset/git_reset_path/スライド3.PNG" /></li>
</ul>

(この図では便宜的に`HEAD`、つまり参照をオブジェクト格納領域内に書いているが、実際には別の場所にあることに注意。)

図を見ると、`git add Readme.md`と`git reset Readme.md`がだいたい逆のことをしていることがわかる。
要するに、`git add <パス>`は指定したファイルをステージし、`git reset <パス>`は指定したファイルをアンステージする。

#### HEADの付け替え
`HEAD`の付け替えをするコマンドは`git reset <コミット>`。
これを実行すると、`HEAD`が指しているコミットを指すよう`ORIG_HEAD`を作成または更新し、指定したコミットを指すよう`HEAD`を更新する。
オプションによってはさらにインデックスやワーキングディレクトリを指定したコミットが指すツリーと同期するよう更新する。

このオプションには`--soft`、`--mixed` (デフォルト)、`--hard`の三種類があり、それぞれのオプションを付けた時の更新対象を次の表に示す。

オプション  |HEAD|インデックス|ワーキングディレクトリ
----------|----|-----------|-----------------
\--soft   | ○  |           |                 
\--mixed  | ○  |     ○     |                 
\--hard   | ○  |     ○     |        ○        

<br>

この三者の違いについては面倒だしだいたい分かるはずなので図にしないが、`git reset <コミット>`したときの`HEAD`動きについて次に図示する。

<ul class="bxslider">
  <li><img src="/images/git-revert-reset/git_reset_commit/スライド1.PNG" /></li>
  <li><img src="/images/git-revert-reset/git_reset_commit/スライド2.PNG" /></li>
  <li><img src="/images/git-revert-reset/git_reset_commit/スライド3.PNG" /></li>
</ul>

スライド中で`git reset HEAD^`した時点で、コミットDは実質的に削除されたに近い状態になる。
`ORIG_HEAD`という一時的なシンボリック参照で指されているだけで、どの参照からもたどり着けなくなるからだ。
コミットDはいずれ`git gc`によって実際に削除されるはずだし、`git push`してもコミットD、それが指すツリー、そのツリーの下にしかないブロブはリモートリポジトリに送られない。

よって、`git reset <コミット>`は普通コミットを削除したいときに使われる。
使われはするが、このコマンド自体がコミットを削除するわけではなくて、あくまで`HEAD`を付け替えるコマンドであることを覚えていた方がいざというときに助かる。

因みに上のスライドでやった操作は、`git commit --amend`がやることとほぼ同じ。
