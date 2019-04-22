+++
categories = [ "Version Control System" ]
date = "2017-06-10T00:00:17+09:00"
draft = false
cover = "git.png"
slug = "git-rebase"
tags = [ "git", "vcs" ]
title = "git rebaseを図解する"
slide = true
+++

[この記事](https://www.kaitoy.xyz/2015/12/27/git-repository/)を読んだ、またはGitのオブジェクトモデルを理解していることを前提に、[__Git__](https://git-scm.com/)の `git rebase` というコマンドについて説明する。

このコマンドは、コミット履歴を改変できるGit特有のコマンドで、[分かり辛いGitコマンド](http://qiita.com/kaitoy/items/ed22474837b943eb6d97)の中でも最も分かり辛い部類のものだ。
Gitの最後の関門と言えよう。
けど、それだけに使いこなせばとても便利なものでもある。

<br>

{{< google-adsense >}}

# git rebaseがもつたった一つの機能
`git rebase`にはいろんなオプションがあって、ちょっと調べただけだと、コミットを移動する機能とコミットを修正する機能の二つがあるように見えるかもしれないが、実際は単一の機能しかないシンプルなコマンドだ。

その機能とは、指定した範囲のコミットが含む変更を、別に指定したコミットのコードベースに適用するというもの。

コマンドの基本形は次のようなものだ。

```tch
$ git rebase --onto master dev bugfix
```

このコマンドは、`bugfix`から辿れるコミット群から、`dev`から辿れるコミット群を除いたコミット群が含む変更を、`master`のコードベースに適用する。

と書いても分からないので図解する。

<br>

<ul class="bxslider">
  <li><img src="/images/git-rebase/git_rebase/スライド1.PNG" /></li>
  <li><img src="/images/git-rebase/git_rebase/スライド2.PNG" /></li>
  <li><img src="/images/git-rebase/git_rebase/スライド3.PNG" /></li>
  <li><img src="/images/git-rebase/git_rebase/スライド4.PNG" /></li>
  <li><img src="/images/git-rebase/git_rebase/スライド5.PNG" /></li>
  <li><img src="/images/git-rebase/git_rebase/スライド6.PNG" /></li>
</ul>

<br>

このスライドを見ると、`git rebase`に指定した3つのブランチのそれぞれの使われ方が分かるはず。

`git rebase --onto master dev bugfix`が実行する処理をもっと正確に言うと、

1. `bugfix`を`checkout`して(i.e. `HEAD`を`bugfix`にして)、
2. `dev..HEAD`のコミット群が含む変更を、それぞれ仮領域にパッチとして保存して、
3. `git reset --hard master`して、
4. 仮領域に保存した変更を、`HEAD`が指すコミットのコードベースにひとつひとつ順番に適用する。

<br>

上記コマンドで`bugfix`のところを省略すると、ステップ1の`checkout`が省略される。
言い換えると、上記コマンドは次の二つのコマンドに分解できる。

```tch
$ git checkout bugfix
$ git rebase --onto master dev
```

さらに、`--onto master`を省略すると、ステップ3の`reset`先が変わり、`dev`になる。
このときのコマンドの形は、

```tch
$ git rebase dev
```

という見慣れたものになるが、これが最初に挙げた基本形の省略形だと認識しておくと応用が利く。

以下に`git rebase dev`の動きを細かめに図解する。

<br>

<ul class="bxslider">
  <li><img src="/images/git-rebase/git_rebase_short/スライド1.PNG" /></li>
  <li><img src="/images/git-rebase/git_rebase_short/スライド2.PNG" /></li>
  <li><img src="/images/git-rebase/git_rebase_short/スライド3.PNG" /></li>
  <li><img src="/images/git-rebase/git_rebase_short/スライド4.PNG" /></li>
  <li><img src="/images/git-rebase/git_rebase_short/スライド5.PNG" /></li>
  <li><img src="/images/git-rebase/git_rebase_short/スライド6.PNG" /></li>
  <li><img src="/images/git-rebase/git_rebase_short/スライド7.PNG" /></li>
</ul>

## インタラクティブモード
前節のスライドに書いたパッチの適用をカスタマイズできるのがインタラクティブモードで、これは`-i`オプションで有効にできる。
インタラクティブモードを使うと、パッチをスキップしたり、順番を変えたり、まとめたり、分割したり、編集したりでき、またパッチとパッチの間に任意のコマンドを実行でき、例えばパッチごとにユニットテストを実行できたりする。

インタラクティブモードの使い方についてはググればたくさん出てくるのでここには書かない。
[この記事](http://tkengo.github.io/blog/2013/05/16/git-rebase-reference/)辺りがわかりやすい。

インタラクティブモードのユースケースとしてよく紹介されるのが、`git rebase -i HEAD^^`で直近の二つのコミットを変更するといったものだが、これを図解すると以下のようになる。

<br>

<ul class="bxslider">
  <li><img src="/images/git-rebase/git_rebase_interactive/スライド1.PNG" /></li>
  <li><img src="/images/git-rebase/git_rebase_interactive/スライド2.PNG" /></li>
  <li><img src="/images/git-rebase/git_rebase_interactive/スライド3.PNG" /></li>
  <li><img src="/images/git-rebase/git_rebase_interactive/スライド4.PNG" /></li>
  <li><img src="/images/git-rebase/git_rebase_interactive/スライド5.PNG" /></li>
  <li><img src="/images/git-rebase/git_rebase_interactive/スライド6.PNG" /></li>
  <li><img src="/images/git-rebase/git_rebase_interactive/スライド7.PNG" /></li>
  <li><img src="/images/git-rebase/git_rebase_interactive/スライド8.PNG" /></li>
  <li><img src="/images/git-rebase/git_rebase_interactive/スライド9.PNG" /></li>
</ul>

<br>

このスライドを見ると、`git rebase dev`と`git rebase -i HEAD^^`は、パッチの適用がインタラクティブかどうか以外は同じ処理をしていることがわかる。
見た目の違いに惑わされないようにしたい。

<br>

`git rebase`はブランチを複数指定したりして分かり辛いコマンドであることは確かだけど、上記の基本形を押さえておけばすんなり理解できるはず。
