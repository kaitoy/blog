+++
categories = [ "Text Editor" ]
date = "2015-12-02T11:23:02-07:00"
draft = false
cover = "atom_editor_logo.svg.png"
slug = "unpublish-atom-package"
tags = [ "atom" ]
title = "Atomパッケージをアンパブリッシュする"
+++

[__Atom__](https://atom.io/)のパッケージをリリースすることをパブシッシュというが、リリースを取り消すことをアンパブリッシュという。
この記事はそのアンパブリッシュのやり方などについて。

筆者の環境は以下。

* Windows 7 x64
* Atom 1.2.4
* Git for Windows 2.6.3

<br>

{{< google-adsense >}}

# アンパブリッシュのやり方
リリースしたパッケージのプロジェクトのルートフォルダ(package.jsonがあるところ)に`cd`して、`apm unpublish`を実行するだけ。

または、任意のフォルダで`apm unpublish <パッケージ名>`を実行する。

特定のバージョンだけアンパブリッシュしたい場合は、`apm unpublish <パッケージ名>@<バージョン>`。例えば`apm unpublish disturb-me@0.1.0`。

# 注意すべき点 1: Git Bashでアンパブリッシュするとエラー
[Git for Windows](https://git-for-windows.github.io/)のGit Bash上で、Windows版Atomに付属するapmで`apm unpublish`を実行すると以下のエラーが出る。

```
Error: EINVAL, invalid argument
    at new Socket (net.js:157:18)
    at process.stdin (node.js:693:19)
    at Unpublish.module.exports.Unpublish.promptForConfirmation (C:\Users\Kaito\AppData\Local\atom\app-1.2.4\resources\app\apm\lib

\unpublish.js:87:48)
    at Unpublish.module.exports.Unpublish.run (C:\Users\Kaito\AppData\Local\atom\app-1.2.4\resources\app\apm\lib\unpublish.js:126:21)
    at Object.module.exports.run (C:\Users\Kaito\AppData\Local\atom\app-1.2.4\resources\app\apm\lib\apm-cli.js:226:32)
    at Object.<anonymous> (C:\Users\Kaito\AppData\Local\atom\app-1.2.4\resources\app\apm\lib\cli.js:6:7)
    at Object.<anonymous> (C:\Users\Kaito\AppData\Local\atom\app-1.2.4\resources\app\apm\lib\cli.js:17:4)
    at Module._compile (module.js:456:26)
    at Object.Module._extensions..js (module.js:474:10)
    at Module.load (module.js:356:32)
```

<br>

コマンドプロンプトでやるべし。

# 注意すべき点 2: アンパブリッシュはパブリッシュの真逆じゃない
[以前の記事](https://www.kaitoy.xyz/2015/08/21/japanese-word-selection/#10-%E3%83%91%E3%83%96%E3%83%AA%E3%83%83%E3%82%B7%E3%83%A5)で
`apm publish`は以下の処理をすると書いた。

> 1. (初回のみ)パッケージ名をatom.ioに登録する。
> 2. package.jsonのversionをインクリメントしてコミットする。`apm publish`にminorを指定するので、0.1.0になる。代わりにmajorかpatchを指定すると、1.0.0か0.0.1になる。
> 3. Gitのタグを作る。
> 4. GitHubに変更とタグをpushする。
> 5. atom.ioにパッケージを登録する。

この内、`apm unpublish`が取り消してくれるのは 5 だけ。

3, 4 のタグ作成も取り消したいのであれば、

```shell
$ git tag -d v0.1.0
$ git push origin :v0.1.0
```

のようにして、ローカルリポジトリとリモートリポジトリ両方のタグを削除する。

また、2 のpackage.jsonのversion変更を取り消したいのであれば、`git log`で`Prepare 0.1.0 release`みたいなログのコミットをさがしてそのハッシュをメモり、

```shell
$ git revert <ハッシュ>
```

を実行して`git push`。(上記<ハッシュ>の部分は、`apm publish`後何もcommitしてないなら`HEAD`でもよし。)

# 注意すべき点 3: パッケージのキャッシュ
とあるパッケージ、仮に`hoge`を開発していたとき、以下のような操作をした後に変な現象が起こった。

1. バージョン`0.1.0`をパブリッシュ。
2. `hoge`をちゃんとインストールできるかを確認するために、
    1. `apm unlink hoge`で`.atom\packages`からリンクを削除。([以前](https://www.kaitoy.xyz/2015/08/21/japanese-word-selection/#11-%E3%83%91%E3%83%83%E3%82%B1%E3%83%BC%E3%82%B8%E3%81%AE%E3%82%A2%E3%83%83%E3%83%97%E3%83%87%E3%83%BC%E3%83%88%E3%81%AE%E9%96%8B%E7%99%BA)、パブリッシュすると`.atom\packages`にはパッケージの実ファイルが入ると書いたが、リンクのままだった。勘違い?)
    2. AtomのSettingsから`hoge`をインストール。
3. ちゃんとインストールできなかったので`apm unpublish hoge`して、バージョンも戻す。
4. `hoge`を修正して、再度`0.1.0`としてパブリッシュ。
5. `hoge`をちゃんとインストールできるかを再度確認するために、
    1. `apm unlink hoge`して、
    2. AtomのSettingsから`hoge`をインストール。

これをしたら最終的になぜか修正前の`hoge`がインストールされた。
どうやらキャッシュがある模様ということで、[apmのソース](https://github.com/atom/apm/blob/master/src/install.coffee)をみたら、パッケージのインストール中に以下のようなことをしていることがわかった。

1. AtomのサイトのREST API (https://www.atom.io/api/packages/hoge/) からパッケージ情報を取得。
2. また別のREST API (https://www.atom.io/api/packages/hoge/versions/0.1.0/tarball) を実行して、パッケージのアーカイブ(tar.gz)をテンポラリフォルダにダウンロード。
   どうもこれは実際にはGitHubの[Releases](https://help.github.com/articles/about-releases/)からダウンロードしている模様。
   因みにGitHub Releasesのアーカイブは、リポジトリにタグが追加されると自動で作られる。
3. `npm install`でそのアーカイブを指定してインストール。

この手順の 2 をやる前に、`.atom\.apm\hoge\0.1.0\package.tgz`を探して、見つかるとダウンロードせずにこっちをインストールする。
ソースの雰囲気から、`.atom\.apm\`に入っているのはキャッシュのようで、いつ作られるかはよくわからないが、これが上記変な現象の原因ぽい。

ということで、`.atom\.apm\hoge\0.1.0\package.tgz`を消して再度インストールしたら無事修正後の`hoge`が入った。

<br>

このキャッシュの件や、`apm unpublish`がパッケージのバージョンを戻さないところをみると、同じバージョンを再度パブリッシュするのはダメな操作なのかもしれない。
修正したかったらバージョンを上げろということなのかも。
