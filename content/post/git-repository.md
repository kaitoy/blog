+++
categories = [ "Version Control System" ]
date = "2015-12-27T11:34:18-07:00"
draft = false
eyecatch = "git.png"
slug = "git-repository"
tags = [ "git" ]
title = "Gitのレポジトリの中身をなるべく正確に理解する"
+++

このエントリでは、[__Git__](https://git-scm.com/)の基本的な使い方は理解している前提で、そのレポジトリの構造をなるべく正確に説明する。

レポジトリ構造の理解を深めることで、Gitにおけるブランチの概念などの理解が深まったり、`git reset`などのGit特有で分かり辛いコマンドを自信をもって使えるようになったりするメリットがある。

なお、ここに書いてあることは概ね、筆者が[O'Reillyの蝙蝠本](https://www.oreilly.co.jp/books/9784873114408/)を読んで得た知識に基づく。

# Gitレポジトリの中身
Gitのレポジトリは、プロジェクトをクローンしたときとかにできる`.git`ディレクトリ内に詰まっている。
このディレクトリには、__オブジェクト格納領域__ と __インデックス__ というデータ構造が入っている。
また、__参照__ や __シンボリック参照__ というものも入っている。

以下、それぞれについて説明する。

### オブジェクト格納領域
オブジェクト格納領域は、ファイルシステム上では`.git/objects/`以下にあたる。

ここには、Gitが管理するファイルやコミット履歴などが保存されていて、具体的には以下の4種類のオブジェクトが置かれる。

1. __ブロブ__

    一つのファイルを表すオブジェクト。ファイルを圧縮したものと思っていいと思う。

2. __ツリー__

    一つのディレクトリを表すオブジェクト。ブロブや別のツリーを指すポインタを持ち、またそれらが表すファイル/ディレクトリの名前や属性を保持する。
    つまり、これとブロブを組み合わせると、ファイルシステム上のディレクトリツリーを表すことができる。

3. __コミット__

    一つのコミットを表すオブジェクト。コミット日時やログメッセージなどの情報と、親コミットを指すポインタと、一つのツリーを指すポインタを持つ。
    このツリーは、プロジェクトのルートディレクトリを指す。
    つまり、一つのコミットは、プロジェクトのある時点でのディレクトリツリー全体を表してもいる。

4. __タグ__

    一つの注釈付きタグ(`git tag -a`で作るタグ)を表すオブジェクト。
    タグ名やタグにつけたコメントなどの情報と、一つのオブジェクト(普通はコミット)へのポインタを持つ。
    因みに軽量タグ(`git tag`で作るタグ)はオブジェクトにならない。

ファイルシステム上で、一つのオブジェクトは一つのファイルに書き込まれ、`.git/objects/`以下に配置される。
そのファイルへのパスは、オブジェクトのコンテンツから計算されたSHA1ハッシュの値(i.e. オブジェクトの名前)が使われる。
例えば`.git/objects/16/cacde1ddabe1698b0e41e091e4697313e2b7e5`というファイルがあったら、これは __16cacde1ddabe1698b0e41e091e4697313e2b7e5__ という名のオブジェクトの実体。

`git cat-file -p <SHA1ハッシュ>`でオブジェクトのコンテンツを見れるので、いくつか見てみると面白い。

### インデックス
インデックスは、`git add`の説明とかに出てくる「インデックス」とか「ステージング」とか呼ばれる機能を実現するためのデータ構造で、ファイルシステム上では`.git/index`というバイナリファイルにあたる。

インデックスは、プロジェクトのある時点でのディレクトリツリー全体を表すデータをもつ。
具体的には、プロジェクト内の各ファイルを表すブロブへのポインタと、各ファイルのファイルシステム上でのパスが保存されている。

インデックスは、プロジェクトのルートディレクトリを表すツリーオブジェクトとそれに連なるツリーオブジェクトをまとめてシリアライズしたものなんじゃないかと思う。

### オブジェクト格納領域とインデックスの図解
ワーキングツリーに変更を入れ、`git add`、`git commit`をする中で、オブジェクト格納領域とインデックスがどう変化するかを図にした。

{{< slideshare ByxdUgla7YMWqS >}}

(タグオブジェクトについては次の節で。)

このスライドにより、Gitがファイルの履歴をどう記録しているかがよく分かるはず。
特に、ブロブが常にファイルのある時点の内容全体を保持していて、Gitが([Subversion](https://subversion.apache.org/)のように)差分を保存しているわけではないことは覚えておくべし。

スライドの最後のページのオブジェクト格納領域の図で、ツリーとブロブとそれらを指す矢印を省略すると、Gitのブランチ等の説明でよく見かける丸が矢印で連なった図になる。以降の説明でそのような図を使うが、丸がコミットを意味していることはよく認識しておくべし。

### 参照
参照は、一つのオブジェクトを指し示すポインタのようなもので、普通はコミットオブジェクトを指す。
参照には、__ローカルブランチ__、__リモート追跡ブランチ__、__タグ__ の三種類がある。
それぞれが、Gitコマンドにおいて、(コミット)オブジェクトを指定する方法としてのSHA1ハッシュ値の代わりに使える。

ファイルシステム上では`.git/refs/`以下にある、SHA1ハッシュが書かれただけのテキストファイルにあたる。
`.git/refs/heads/`以下にローカルブランチ、`.git/refs/remotes/`以下にリモート追跡ブランチ、`.git/refs/tags/`以下にタグが置かれる。

ここで、ブランチやタグが単なる参照であるところに注意。
Subversionのようにレポジトリのコピーを作るのとはかなり異なる。
Gitのブランチを作るというのは単に参照を追加するだけだし、ブランチをチェックアウトするというのはブランチが指すコミットが指すツリーが表すディレクトリツリーをファイルシステムに展開するということ。
この実装によってGitのブランチが軽量で速いものになっている。

ローカルブランチの挙動を以下に図示する。図中で、各コミットには便宜上ラベルとしてアルファベットを付けている。

{{< slideshare ybMW31fwgO6agk >}}

このスライドの最後のページでmasterブランチが本流でbugfixブランチが支流かのように書いているが、実際は実装上それらに差はなく全く対等である。

また、ブランチは単なる一方的な参照であり、コミットオブジェクトからはそれに全く関与しないことに注意。
ブランチを削除してもそれによってコミットが消えることはない(※1)し、また例えば、スライドの最後のページでbugfixブランチを削除したらXがどのブランチで作られたコミットなのかを知るすべはなくなる。

(※1: ブランチを削除することにより到達不能になるコミットは、結果的にGit GCにより削除されはする。)

<br>

次に、タグの挙動を以下に図示する。

{{< slideshare EaBZklxh9vB9yk >}}

図中で、タグオブジェクトはオブジェクトなのでオブジェクト格納領域(i.e. `.git/objects/`)に入り、それを指す参照のタグは`.git/refs/`に入る。

このスライドを見てわかる通り、ブランチと軽量タグは実装上は全く同じもので、慣習で使い分けるだけ。

<br>

リモート追跡ブランチについては別のエントリで書く。

### シンボリック参照
シンボリック参照は参照やオブジェクトを指す参照。以下の四つがある。

1. __HEAD__

    カレントブランチの参照を指す。

2. __ORIG_HEAD__

    HEADが更新されたとき、更新前のHEADが指していたブランチが指していたコミットを指す。

3. __FETCH_HEAD__

    最後にフェッチされたブランチの最新コミットを指す。

4. __MERGE_HEAD__

    マージ操作中に作られ、HEADにマージされようとしているコミットを指す。

それぞれが、Gitコマンドにおいて、(コミット)オブジェクトを指定する方法としてのSHA1ハッシュ値の代わりに使える。

ファイルシステム上では`.git/{HEAD,ORIG_HEAD,FETCH_HEAD,MERGE_HEAD}`にあたり、全て単純なテキストファイルである。

<br>

以上がGitレポジトリの中身のほぼ全容。あとは設定ファイルとかフックスクリプトとかがあるだけ。