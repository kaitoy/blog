+++
categories = [ "Version Control System" ]
date = "2015-12-27T11:34:18-07:00"
draft = false
cover = "git.png"
slug = "git-repository"
tags = [ "git", "vcs" ]
title = "Gitのリポジトリの中身をなるべく正確に理解する"
slide = true
+++

このエントリでは、[__Git__](https://git-scm.com/)の基本的な使い方は理解している前提で、そのリポジトリの構造をなるべく正確に説明する。
ここに書いてあることは概ね、筆者が[O'Reillyの蝙蝠本](https://www.oreilly.co.jp/books/9784873114408/)を読んで得た知識に基づく。

リポジトリの構造というとコアで上級者向けの知識のように聞こえるが、これをまず理解しておくことで強力で複雑なGitの機能を習得するのが非常に楽になる。
具体的には、Gitにおけるブランチの概念などの理解が深まったり、[`git reset`](https://www.kaitoy.xyz/2016/01/01/git-revert-reset/#git-reset)などのGit特有で分かり辛いコマンドを自信をもって使えるようになったり、なにより、Gitを使う上での最大のハードルである __インデックス__ や __HEAD__ の概念を完璧に理解できるというメリットがある。

チュートリアルを終えたくらいの初心者にこそ読んでほしいエントリである。

<br>

{{< google-adsense >}}

# Gitリポジトリの中身
Gitのリポジトリは、プロジェクトをクローンしたときとかにできる`.git`ディレクトリ内に詰まっている。
このディレクトリには、__オブジェクト格納領域__ と __インデックス__ というデータ構造が入っている。
また、__参照 (ref)__ や __シンボリック参照 (symref)__ というものも入っている。

以下、それぞれについて説明する。

## オブジェクト格納領域
オブジェクト格納領域は、ファイルシステム上では`.git/objects/`以下にあたる。

ここには、バージョン管理されているファイルの情報やそのコミット履歴などが保存されていて、具体的には以下の4種類のオブジェクトが置かれている。

1. __ブロブ__

    一つのファイルを表すオブジェクト。
    バージョン管理対象のファイルの内容(だけ)を保持する。

2. __ツリー__

    一つのディレクトリを表すオブジェクト。ブロブや別のツリーを指すポインタを持ち、またそれらが表すファイル/ディレクトリの名前や属性を保持する。
    つまり、これとブロブを組み合わせると、ファイルシステム上のディレクトリツリーを表すことができる。

3. __コミット__

    一つのコミットを表すオブジェクト。コミット日時やログメッセージなどの情報と、一つ前のコミット(親コミット)を指すポインタと、一つのツリーを指すポインタを持つ。
    このツリーはプロジェクトのルートディレクトリを表す。
    つまり、一つのコミットは、プロジェクトのある時点でのディレクトリツリー全体を表してもいる。

4. __タグ__

    一つの注釈付きタグ(`git tag -a`で作るタグ)を表すオブジェクト。
    タグ名やタグにつけたコメントなどの情報と、一つのオブジェクト(普通はコミット)へのポインタを持つ。
    因みに軽量タグ(`git tag`で作るタグ)はオブジェクトにならない。

ファイルシステム上で、一つのオブジェクトは一つのファイルに書き込まれ、[zlib](https://ja.wikipedia.org/wiki/Zlib)で圧縮され、`.git/objects/`以下に配置される。
そのファイルへのパスには、オブジェクトのコンテンツから計算されたSHA1ハッシュの値(i.e. オブジェクトの名前)が使われる。
例えば`.git/objects/16/cacde1ddabe1698b0e41e091e4697313e2b7e5`というファイルがあったら、これは __16cacde1ddabe1698b0e41e091e4697313e2b7e5__ という名のオブジェクトの実体。

`git cat-file -p <SHA1ハッシュ>`でオブジェクトのコンテンツを見れるので、いくつか見てみると面白い。
たとえばコミットオブジェクトは以下の様になっている。

```shell
$ git cat-file -p d444447526f91a97f2edeefc65d4f58e8e006d78
tree 5d43dfbb8dd89018b9a383d6b9f663166e3cf9f9
parent adcf8b197c6c156860dc8aa66ccb9a0c0a3bebb6
author kaitoy <kaitoy@pcap4j.org> 1480004891 -0700
committer kaitoy <kaitoy@pcap4j.org> 1480004891 -0700

[#76] Rmove unneeded makePacketForInvokingPacketField call from IcmpV4InvokingPacketPacket.
```

## インデックス
インデックスは、`git add`の説明とかに出てくる「インデックス」とか「ステージング」とか呼ばれる機能を実現するためのデータ構造で、ファイルシステム上では`.git/index`というバイナリファイルにあたる。

インデックスは、プロジェクトのある時点でのディレクトリツリー全体を表すデータをもつ。
具体的には、プロジェクトの各ファイルについて、対応するブロブへのポインタと、プロジェクトルートディレクトリからの相対パスが記録されている。

`git ls-files --stage`で`.git/index`の内容を見れる。

例として、`https://github.com/kaitoy/japanese-word-selection`をクローンして上記コマンドを実行すると以下の様に表示される。

```shell
$ git ls-files --stage
100644 ade14b9196fcad03cd0177c25ec1c31000ecf86a 0       .gitignore
100644 bbbbcd3415597bac39b0314f5c708d90684161fc 0       CHANGES.md
100644 f6b0b485fec1ee0bc53a452bc82cb6b7de2a1d91 0       LICENSE
100644 10e50f7b628d83f1b66f34f2d9d34029e7fc8670 0       README.md
100644 4dc8027d17765180fac5c3292a0195bb09b10ceb 0       assets/japanese-word-selection.gif
100644 dd92c48bae50307b55fb623c1b2beccab963096e 0       lib/japanese-word-selection.coffee
100644 8152af5ad39515fcd5021e3c8afee32910c0cf79 0       package.json
100644 9c0d180898d841bb319f51f1b1c7e07320426eeb 0       spec/japanese-word-selection-spec.coffee
100644 3d32fc0f42cc9babccd5525165e8227dce00a206 0       spec/japanese-word-selection-whitespace-spec.coffee
```

一行がひとつのファイルの情報で、左からファイルモード(パーミッション)、ブロブのSHA1ハッシュ、ステージ、ファイルパスが表示されている。
ステージは0～3の値になり得る。

ステージは普段は0だけだけど、マージコンフリクトが起きた場合は、ベースバージョン、一方のブランチのバージョン、他方のブランチのバージョンの3つをそれぞれステージ1、2、3としてインデックスに保持する。
これは、マージコンフリクトの解消(i.e. 3-wayマージ)を[サポートする機能](https://git-scm.com/docs/git-merge#_how_to_resolve_conflicts)のためだ。

## オブジェクト格納領域とインデックスの図解
ワーキングディレクトリに変更を入れ、`git add`、`git commit`をする中で、オブジェクト格納領域とインデックスがどう変化するかを図にした。

<ul class="bxslider">
  <li><img src="/images/git-repository/git_repo/スライド1.PNG" /></li>
  <li><img src="/images/git-repository/git_repo/スライド2.PNG" /></li>
  <li><img src="/images/git-repository/git_repo/スライド3.PNG" /></li>
  <li><img src="/images/git-repository/git_repo/スライド4.PNG" /></li>
  <li><img src="/images/git-repository/git_repo/スライド5.PNG" /></li>
  <li><img src="/images/git-repository/git_repo/スライド6.PNG" /></li>
  <li><img src="/images/git-repository/git_repo/スライド7.PNG" /></li>
</ul>

(タグオブジェクトについては次の節で。)

スライドの1ページ目や最後のページのようにワーキングディレクトリとインデックスとオブジェクト格納領域が同期していて、`git status`を実行すると`nothing to commit, working directory clean`と表示される状態をワーキングディレクトリがクリーンであると言い、そうでない状態をワーキングディレクトリがダーティであると言う。

このスライドにより、Gitがファイルの履歴をどう記録しているかがよく分かるはず。
特に、ブロブが常にファイルのある時点の内容全体を保持していて、Gitが([Subversion](https://subversion.apache.org/)のように)差分を保存しているわけではないことは覚えておくべし。

スライドの最後のページのオブジェクト格納領域の図で、ツリーとブロブとそれらを指す矢印を省略すると、Gitのブランチ等の説明でよく見かける丸が矢印で連なった図(コミットグラフ)になる。以降の説明でそのような図を使うが、丸がコミットを意味していて、各コミットがルートツリーを指していることはよく認識しておくべし。

## 参照 (ref)
参照は、一つのオブジェクトを指し示すポインタのようなもので、普通はコミットオブジェクトを指す。
参照には、__ローカルブランチ__、__リモート追跡ブランチ__、__タグ__ の三種類がある。

ファイルシステム上では`.git/refs/`以下にある、指し示すオブジェクトのSHA1ハッシュ値が書かれただけのテキストファイルにあたる。
`.git/refs/heads/`以下にローカルブランチ、`.git/refs/remotes/`以下にリモート追跡ブランチ、`.git/refs/tags/`以下にタグが置かれる。

参照は、Gitコマンドなどにおいてコミットを指定する方法としてSHA1ハッシュ値の代わりに使える。
この時、参照の名前は上記ファイルシステム上のパスから`.git/`を省いたものになる。
例えば`refs/heads/master`。さらに、ディレクトリは省略できるので、同じ参照は`heads/master`や単に`master`とも書ける。

ここで、ブランチやタグが単なる参照であるところに注目。
Subversionのようにリポジトリのコピーを作るのとはかなり異なる。
Gitのブランチを作るというのは単に参照を追加するだけだし、ブランチをチェックアウトするというのはブランチが指すコミットが指すツリーが表すディレクトリツリーをファイルシステムに展開するということ。
この実装によってGitのブランチが軽量で速いものになっている。

ローカルブランチの挙動を以下に図示する。図中で、各コミットには便宜上ラベルとしてアルファベットを付けている。

<ul class="bxslider">
  <li><img src="/images/git-repository/git_branch/スライド1.PNG" /></li>
  <li><img src="/images/git-repository/git_branch/スライド2.PNG" /></li>
  <li><img src="/images/git-repository/git_branch/スライド3.PNG" /></li>
  <li><img src="/images/git-repository/git_branch/スライド4.PNG" /></li>
  <li><img src="/images/git-repository/git_branch/スライド5.PNG" /></li>
</ul>

このスライドの最後のページでmasterブランチが本流でbugfixブランチが支流かのように書いているが、実際は実装上それらに差はなく全く対等である。

また、ブランチは単なる一方的な参照であり、コミットオブジェクトからはそれに全く関与しないことに注意。
ブランチを削除してもそれによってコミットが消えることはない(※1)し、また例えば、スライドの最後のページでbugfixブランチを削除したらXがどのブランチで作られたコミットなのかを知るすべはなくなる。

(※1: ブランチを削除することにより到達不能になるコミットは、結果的に[`git gc`](https://git-scm.com/book/ja/v2/Git%E3%81%AE%E5%86%85%E5%81%B4-%E3%83%A1%E3%82%A4%E3%83%B3%E3%83%86%E3%83%8A%E3%83%B3%E3%82%B9%E3%81%A8%E3%83%87%E3%83%BC%E3%82%BF%E3%83%AA%E3%82%AB%E3%83%90%E3%83%AA)により削除されはする。)

<br>

次に、タグの挙動を以下に図示する。

<ul class="bxslider">
  <li><img src="/images/git-repository/git_tag/スライド1.PNG" /></li>
  <li><img src="/images/git-repository/git_tag/スライド2.PNG" /></li>
  <li><img src="/images/git-repository/git_tag/スライド3.PNG" /></li>
  <li><img src="/images/git-repository/git_tag/スライド4.PNG" /></li>
  <li><img src="/images/git-repository/git_tag/スライド5.PNG" /></li>
</ul>

図中で、タグオブジェクトはオブジェクトなのでオブジェクト格納領域に入り、それを指す参照のタグは`.git/refs/`に入る。

<br>

リモート追跡ブランチについては[別のエントリ](https://www.kaitoy.xyz/2015/12/31/git-dvc/)で書く。

## シンボリック参照 (symref)
シンボリック参照は参照やオブジェクトを指し示すポインタのようなもので、以下の四つがある。

1. __HEAD__

    カレントブランチ、つまりチェックアウトしているブランチ(i.e. 参照)を指す。

2. __ORIG_HEAD__

    `git merge`や[`git reset`](https://www.kaitoy.xyz/2016/01/01/git-revert-reset/#git-reset)でHEADが更新されたとき、更新前のHEADが指していたブランチが指していたコミットを指す。

3. __FETCH_HEAD__

    最後にフェッチされたブランチの最新コミットを指す。

4. __MERGE_HEAD__

    マージ操作中に作られ、HEADにマージされようとしているコミットを指す。

それぞれが、Gitコマンドなどにおいてコミットを指定する方法としてSHA1ハッシュ値の代わりに使える。

ファイルシステム上では`.git/{HEAD,ORIG_HEAD,FETCH_HEAD,MERGE_HEAD}`にあたり、全て単純なテキストファイルである。

特によく使う`HEAD`を図示すると以下のようになる。

<ul class="bxslider">
  <li><img src="/images/git-repository/git_head/スライド1.PNG" /></li>
  <li><img src="/images/git-repository/git_head/スライド2.PNG" /></li>
</ul>

上図に見られるように、`HEAD`は通常ブランチを指す。
実際に`.git/HEAD`ファイルの中身を見ると以下の様になっていて、確かにブランチを指していることが見て取れる。

```
ref: refs/heads/master
```

gitコマンドの実行内容によっては`HEAD`が直接コミットを指すようになることもあり、この場合は特に「detached HEAD」、つまり(ブランチから)切り離されたHEADと呼ばれる。

スライドの1ページ目の状態では、だいたいのgitコマンドから見てコミットEと`master`と`HEAD`は等価であると考えていい。
つまり例えば、`git reset <コミットEのSHA1ハッシュ値>`、`git reset master`、`git reset HEAD`は同じ結果になる。

<br>

以上がGitリポジトリの中身のほぼ全容。あとは設定ファイルとかフックスクリプトとかがあるだけ。

<br>

実際のGitリポジトリのオブジェクト、参照、シンボリック参照を、この記事のスライドと同じ見た目でビジュアライズするツール、[__Goslings__](https://www.kaitoy.xyz/tags/goslings/)を作った。
このツールを使って実際のリポジトリの中身を見ながらこの記事を内容を確認すると、より理解が深まるかもしれない。
