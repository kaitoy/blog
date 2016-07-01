+++
categories = [ "Version Control System" ]
date = "2015-12-31T01:02:59-07:00"
draft = false
eyecatch = "git.png"
slug = "git-dvc"
tags = [ "git" ]
title = "Gitの分散バージョン管理の仕組み"
+++

このエントリでは、[この記事](https://tbd.kaitoy.xyz/2015/12/27/git-repository/)を読んだことを前提に、[__Git__](https://git-scm.com/)の分散バージョン管理の仕組みについて説明する。

## Gitの分散バージョン管理
分散バージョン管理とは、分散したリポジトリでのバージョン管理ということ。
ここでリポジトリが分散しているとは、同じプロジェクトの履歴を管理する完全で独立したリポジトリが複数あるということ。
これにより一つのプロジェクトの開発を地理的に分散して並行して進めることができる。

Gitは分散バージョン管理のために、リポジトリのクローン(≒コピー)を作る機能と、リポジトリ間でコミットグラフを同期する機能を提供している。

リポジトリのクローンを作ると言うと、オリジナルとクローンの間に格差があるような気がするが、
実際にはGitは全てのリポジトリが対等であるという思想のもとで実装されている。
このため、リポジトリをクローンする時には(デフォルトで)クローン元の完全なコミットグラフがクローンにコピーされるし、任意のリポジトリ間のデータのやり取りをpeer-to-peerでできる。
クローンからクローンを作ることももちろん可能。

`git push`でデータを送る先をアップストリームと呼ぶことはあるし、次節でローカルリポジトリとリモートリポジトリという関係が出てくるが、これはあくまでその時点でそういう設定になっているというだけ。
アップストリームはいつでもいくつでも`git remote`コマンドで追加したり削除したりできる。

このような実装により、Gitの分散バージョン管理ではリポジトリ間で柔軟なデータのやり取りができる。
例えば以下の様な複雑なリポジトリネットワークを組むこともできる。

<img alt="good-object-2.png" src="/images/git-dvc/repo_net.png" style="width: 100%; max-width: 400px; margin: 0px auto; display: block;">

## ローカルリポジトリとリモートリポジトリ
一人の開発者から見て、手元にあるリポジトリを __ローカルリポジトリ__ と呼ぶのに対して、`git push`や`git pull`や`git fetch`でデータをやり取りする相手のリポジトリを __リモートリポジトリ__ と呼ぶ。
リモートリポジトリとのやり取りは、__リモート追跡ブランチ__ と __リモート__ というものを使って実装されている。

#### リモート追跡ブランチ
リモート追跡ブランチは、ローカルリポジトリの`.git/refs/remotes/`に格納される参照で、リモートリポジトリ内のローカルブランチのコミットグラフを取得してローカルリポジトリ内に保持するために使われる。
`git branch -r`でその一覧が見れる。

「追跡」ブランチというだけあって、リモートリポジトリ内でコミットグラフが成長した場合、この変更に追随することができる。
このためのコマンドが`git fetch`。
因みに`git pull`は、`git fetch`でリモート追跡ブランチを更新した後、`git merge`(オプションによっては`git rebase`)でそのリモート追跡ブランチをローカルブランチにマージするのと同じ。

#### リモート
リモートとは、リモートリポジトリのこと、またはリモートリポジトリに接続するための定義のこと。
この定義は、ローカルリポジトリの`.git/config`に`remote`セクションとして書かれている。
以下がその例。

```
[remote "origin"]
        fetch = +refs/heads/*:refs/remotes/origin/*
        url = git@github.com:kaitoy/blog.git
```

セクション名のところに`"origin"`とあるがこれは、この定義で接続するリモートリポジトリをGitコマンドなどで`origin`と指定できるということ。
ここで定義されているのは`url`と`fetch`で、それぞれ以下を意味する。

* url

    リモートリポジトリのURL。
    つまり、リモートリポジトリがどのサーバのどのディレクトリにあって、それとのデータのやり取りをどのプロトコルでやるかという定義。
    このURLには以下の書式が使える。

    1. __ファイルパス__

        `/path/to/repo.git`とか`C:\\Users\\Kaito\\Desktop\\pcap4j`といった、普通のファイルパスの書式。
        [NFS](https://ja.wikipedia.org/wiki/Network_File_System)などでリモートリポジトリが共有されている場合などに使われる。

        シンボリックリンクがサポートされているOS上では、クローンはリモートリポジトリをハードリンクで参照する。
        このシンボリック参照でのファイル共有がトラブルの元なため、この書式は非推奨。

    2. __ファイルURL__

        `file:///path/to/repo.git`とか`file://C:/Users/Kaito/Desktop/pcap4j`といった、ローカルホスト上のパスを示すファイルURLの書式。
        用途はファイルパスと同様だが、ハードリンクを作る代わりにコピーするのでより安全。

    3. __HTTP(S)__

        `https://github.com/kaitoy/pcap4j.git`といったHTTPSやHTTPのURL。
        リポジトリへのアクセス制御にHTTPの認証機能やHTTPSのクライアント証明書などが使えるほか、HTTPSなら通信の暗号化もできる。

        使用するポートがファイアウォールにブロックされていることが少ないのも使いやすい。

    4. __Gitプロトコル__

        `git://example.com/path/to/repo.git`といった書式で、[Gitデーモン](https://git-scm.com/book/ja/v1/Git-%E3%82%B5%E3%83%BC%E3%83%90%E3%83%BC-Git-%E3%83%87%E3%83%BC%E3%83%A2%E3%83%B3)によるGitネイティブプロトコルを使うURL。
        HTTPよりも高速な通信ができるが、認証機能も暗号化機能もない。

    5. __SSH + Gitプロトコル__

        `ssh://git@github.com/kaitoy/pcap4j.git`のような[SSH](https://ja.wikipedia.org/wiki/Secure_Shell)のURLで、これを使うとSSHトンネルを通してGitプロトコルで通信できる。
        Gitプロトコル単体を使うのに比べ、SSHの認証機能と暗号化機能を利用できるが、やや遅くなるはず。

        このプロトコルには、`git@github.com:kaitoy/pcap4j.git`のような[SCP](https://ja.wikipedia.org/wiki/Secure_copy)書式も使える。

    Git自体はGitデーモンを含めリポジトリへのアクセス制御の機能を一切持たないので、認証などが必要な場合はHTTPなどその機能を持つプロトコルのURLを使う必要がある。

* fetch

    リモートリポジトリ内のローカルブランチとローカルリポジトリ内の追跡ブランチとがどう対応するかを定義する。
    この定義は`refspec`と呼ばれる。

    上の例の`fetch = +refs/heads/*:refs/remotes/origin/*`だと、リモートリポジトリの`.git/refs/heads/`にある全てのブランチをそれぞれ、ローカルリポジトリの`.git/refs/remotes/origin/`にある同名のブランチで追跡する、という意味。

## クローン時の挙動
クローン時のデフォルトの挙動は以下の様なもの。

1. オブジェクト格納領域内のオブジェクトが全てクローンにコピーされる。
    (多分。参照からたどれないオブジェクトもコピーされることを確認した。)
    つまり、元のリポジトリ(i.e. リモートリポジトリ)と同じコミットグラフ(とタグオブジェクト)がクローンのリポジトリに入る。

2. リモートリポジトリ内の全てのローカルブランチに対応する同名のリモート追跡ブランチがクローンのリポジトリ内に作成される。
    これに対応するリモートも作成され、これの`fetch`に(前節の例と同様に)`+refs/heads/*:refs/remotes/origin/*`が設定される。

3. リモートリポジトリのカレントブランチがローカルリポジトリにコピーされ、チェックアウトされる。

4. リモートリポジトリの全てのタグがクローンにコピーされる。

5. ローカルリポジトリで`git fetch`が実行され、全てのリモート追跡ブランチが更新される。

インデックスはリポジトリ毎に固有の一時的なデータなので、クローンにはコピーされない。

リモート追跡ブランチもクローンにコピーされない。

シンボリック参照もクローンにコピーされない。
クローンにはカレントブランチを指す`HEAD`だけが作成される。

## リモートリポジトリとのやり取りの図解
リモートリポジトリをクローンして、変更をプルしたりプッシュしたりする様子を以下に図示する。

<ul class="bxslider">
  <li><img src="/images/git-dvc/git_dvc_merge/スライド1.PNG" /></li>
  <li><img src="/images/git-dvc/git_dvc_merge/スライド2.PNG" /></li>
  <li><img src="/images/git-dvc/git_dvc_merge/スライド3.PNG" /></li>
  <li><img src="/images/git-dvc/git_dvc_merge/スライド4.PNG" /></li>
  <li><img src="/images/git-dvc/git_dvc_merge/スライド5.PNG" /></li>
  <li><img src="/images/git-dvc/git_dvc_merge/スライド6.PNG" /></li>
</ul>

これはこれで完全に正しい手順だが、最終的にできるコミットグラフが無駄に分岐していて美しくない。
普通は以下の様に、リベースを挟んで一直線の履歴に保つ方が一般にいいと思う。

<ul class="bxslider">
  <li><img src="/images/git-dvc/git_dvc_ff/スライド1.PNG" /></li>
  <li><img src="/images/git-dvc/git_dvc_ff/スライド2.PNG" /></li>
  <li><img src="/images/git-dvc/git_dvc_ff/スライド3.PNG" /></li>
  <li><img src="/images/git-dvc/git_dvc_ff/スライド4.PNG" /></li>
</ul>

このフェッチ + リベースを一度にやってくれるのが、`git pull --rebase`。

## Gitで分散バージョン管理する際の注意点
Gitで分散バージョン管理する際の注意点を二つ挙げる。

#### 他のリポジトリにもあるコミットを変更してはいけない
Gitには、`git commit --amend`、[`git rebase`](https://tbd.kaitoy.xyz/2015/12/28/git-merge/#%E3%83%AA%E3%83%99%E3%83%BC%E3%82%B9)といったコミットを変更するコマンドや、[`git reset`](https://tbd.kaitoy.xyz/2016/01/01/git-revert-reset/#git-reset)というコミットの削除につながるコマンドがある。
こういうコマンドで他のリポジトリにもあるコミットを変更してはいけない。

他のリポジトリにもあるコミットとは、クローン時にコピーしてきたコミット、プルしたコミット、プッシュしたコミットなどのこと。

もしやると、プッシュもプルも簡単にはできなくなり非常に面倒なことになる。

#### 開発リポジトリには(基本的に)プッシュしてはいけない
リポジトリには、__ベアリポジトリ__ と、__開発リポジトリ__ がある。
開発リポジトリは普段使っている普通のリポジトリ。
ベアリポジトリは、簡単に言うとワーキングディレクトリやカレントブランチやリモートを持たないリポジトリで、開発リポジトリのリモートリポジトリとして使われ、`git init`や`git clone`に`--bare`オプションを付けて実行すると作れる。

ベアリポジトリにはプッシュしていい。
むしろプッシュしないベアリポジトリに意味はない。

一方、開発リポジトリには(基本的に)プッシュしてはいけない。
これは、プッシュがリモートリポジトリのオブジェクトと参照だけ更新してワーキングディレクトリやインデックスは更新せず、開発者がプッシュされたことに気付けないため(※1)。
気付かないまま開発を進めてコミットを作ると、プッシュによって`HEAD`が変わっていたりするため、コミットグラフが変な状態になってしまう。

お互い示し合わせたうえでプッシュをしたりプッシュするブランチを工夫したりすれば問題が起きないようにできるはできる。

(※1: と[O'Reillyの蝙蝠本](https://www.oreilly.co.jp/books/9784873114408/)には書いてあったが、これは[Git 1.6.xまでの話らしい](https://github.com/git/git/blob/master/Documentation/RelNotes/1.7.0.txt)。
今はチェックアウトされたブランチにはデフォルトでプッシュできないので、この節に書いた問題は基本的に起きない。
2.6.3で試したら以下のエラーになった。
```text
remote: error: refusing to update checked out branch: refs/heads/master
remote: error: By default, updating the current branch in a non-bare repository
remote: error: is denied, because it will make the index and work tree inconsistent
remote: error: with what you pushed, and will require 'git reset --hard' to match
remote: error: the work tree to HEAD.
remote: error:
remote: error: You can set 'receive.denyCurrentBranch' configuration variable t
remote: error: 'ignore' or 'warn' in the remote repository to allow pushing int
remote: error: its current branch; however, this is not recommended unless you
remote: error: arranged to update its work tree to match what you pushed in som
remote: error: other way.
remote: error:
remote: error: To squelch this message and still keep the default behaviour, se
remote: error: 'receive.denyCurrentBranch' configuration variable to 'refuse'.
To file://C:/Users/Kaito/Desktop/master
 ! [remote rejected] master -> master (branch is currently checked out)
error: failed to push some refs to 'file://C:/Users/Kaito/Desktop/master'
```
)
