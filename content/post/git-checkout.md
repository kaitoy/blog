+++
categories = [ "Version Control System" ]
date = "2016-10-08T16:39:46-06:00"
draft = false
eyecatch = "git.png"
slug = "git-checkout"
tags = [ "git", "vcs" ]
title = "git checkoutを図解する"
+++

[この記事](https://www.kaitoy.xyz/2015/12/27/git-repository/)を読んだ、またはGitのオブジェクトモデルを理解していることを前提に、[__Git__](https://git-scm.com/)の `git checkout` というコマンドについて説明する。

このコマンドは普通ブランチを切り替えるものと説明されるが、主たる機能は __オブジェクト格納領域から指定されたファイルを取り出し、ワーキングディレクトリに配置する__ ものである。
つまりこれがGitにおけるチェックアウトで、チェックアウト=ブランチの切り替えではない。

コマンドに与える引数によっては `HEAD` の付け替え、つまりはブランチの切り替えもする、というだけ。

`git checkout` の動作を `HEAD` の付け替えの有無によって分けて考えると分かりやすく覚えやすいので、以下そのように説明する。

# HEADを付け替えないgit checkout
`HEAD` を付け替えない `git checkout` は、引数にワーキングディレクトリ内の __ファイルまたはディレクトリへのパスを与えた場合__ のもの。
ディレクトリを指定した場合はそれ以下の全ファイルが操作対象となる。
パスは絶対パスかカレントディレクトリからの相対パスで、複数指定できる。

つまりは以下の様なコマンド形式になる。

`git checkout <パス(複数可)>`

これを実行すると、指定したファイルについて、__インデックスが指しているブロブ__ をオブジェクト格納領域から取り出し、ワーキングディレクトリのファイルを置き変える。

<ul class="bxslider">
  <li><img src="/images/git-checkout/git_checkout_paths/スライド1.PNG" /></li>
  <li><img src="/images/git-checkout/git_checkout_paths/スライド2.PNG" /></li>
  <li><img src="/images/git-checkout/git_checkout_paths/スライド3.PNG" /></li>
  <li><img src="/images/git-checkout/git_checkout_paths/スライド4.PNG" /></li>
  <li><img src="/images/git-checkout/git_checkout_paths/スライド5.PNG" /></li>
  <li><img src="/images/git-checkout/git_checkout_paths/スライド6.PNG" /></li>
  <li><img src="/images/git-checkout/git_checkout_paths/スライド7.PNG" /></li>
</ul>

<br>

上のスライドではインデックスが指しているブロブを取り出したが、任意のブロブを取り出すこともできる。
この場合、以下の様なコマンド形式を使う。

`git checkout <コミット> <パス(複数可)>`

このコマンド形式だと、__指定したコミットが指すツリー以下のブロブ__ が取り出される。
`<コミット>`の部分には、コミットオブジェクトのSHA1ハッシュ値、参照(i.e. ブランチかタグ)、シンボリック参照(e.g. `HEAD`)を指定できる。(実際にはこれらが全てではないが、実用的にはこの3種。)

この形式だと、ワーキングディレクトリだけでなく、取り出すブロブを指すよう __インデックスも更新される__ ことに注意。

<ul class="bxslider">
  <li><img src="/images/git-checkout/git_checkout_paths_commit/スライド1.PNG" /></li>
  <li><img src="/images/git-checkout/git_checkout_paths_commit/スライド2.PNG" /></li>
  <li><img src="/images/git-checkout/git_checkout_paths_commit/スライド3.PNG" /></li>
</ul>

<br>

# HEADを付け替えるgit checkout
`HEAD` を付け替える `git checkout` は、引数に __パスを与えない場合__ のもの。
代わりにコミットを与える。

つまりは以下の様なコマンド形式になる。

`git checkout <コミット>`

`<コミット>`の部分には、コミットオブジェクトのSHA1ハッシュ値、参照(i.e. ブランチかタグ)、シンボリック参照(e.g. `HEAD`)を指定できる。(実際にはこれらが全てではないが、実用的にはこの3種。)

これを実行すると、__指定したコミットが指すツリー以下の全てのブロブ__ を指すようインデックスを更新し、それらのブロブをオブジェクト格納領域から取り出してワーキングディレクトリに配置する。

この上更に`HEAD`を付け替えるわけだが、付け替え先は`<コミット>`の種類によって以下の三通りある。

* `<コミット>`がブランチ: `HEAD`はそのブランチを指すよう更新される。
* `<コミット>`がSHA1ハッシュ値: `HEAD`はコミットを指すよう更新される。
* `<コミット>`がタグかシンボリック参照: `HEAD`はタグかシンボリック参照が指すコミットを指すよう更新される。

<br>

<ul class="bxslider">
  <li><img src="/images/git-checkout/git_checkout_branch/スライド1.PNG" /></li>
  <li><img src="/images/git-checkout/git_checkout_branch/スライド2.PNG" /></li>
  <li><img src="/images/git-checkout/git_checkout_branch/スライド3.PNG" /></li>
  <li><img src="/images/git-checkout/git_checkout_branch/スライド4.PNG" /></li>
  <li><img src="/images/git-checkout/git_checkout_branch/スライド5.PNG" /></li>
  <li><img src="/images/git-checkout/git_checkout_branch/スライド6.PNG" /></li>
  <li><img src="/images/git-checkout/git_checkout_branch/スライド7.PNG" /></li>
  <li><img src="/images/git-checkout/git_checkout_branch/スライド8.PNG" /></li>
  <li><img src="/images/git-checkout/git_checkout_branch/スライド9.PNG" /></li>
</ul>

<br>

上のスライド中のコミットをチェックアウトした例を見ると分かるが、コマンド実行前後でワーキングディレクトリからファイルが削除されることもある。
これは多分、実際にはインデックスの更新処理の前に、`HEAD`が指すコミットに含まれるファイルをワーキングディレクトリから削除する処理があるからだと考えられる。

また、上のスライドには表現していないが、コマンド実行前にワーキングディレクトリやインデックスに未コミットな変更が入っている場合、Gitはそれをコマンド実行後のワーキングディレクトリに適用しようとしてくれる。
これは例えばあるブランチで作った変更を別のブランチにコミットしたいようなときは便利だが、`checkout`したコミットに別途変更が入っているとその適用は失敗し、コマンドがエラーになるので、普通はコマンド実行前に`git stash`しておくのが無難。
