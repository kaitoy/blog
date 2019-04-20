+++
categories = [ "Windows" ]
date = "2016-11-19T01:05:26-07:00"
draft = false
cover = "microsoft.png"
slug = "bow-do-not-change-linux-files-from-windows"
tags = [ "bow", "windows" ]
title = "Bash on WindowsでWindows側からUbuntu側のファイルをいじると壊れることがあるので注意"
+++

Bash on WindowsでWindows側からUbuntu側のファイルをいじると危険という情報を見つけたので、試してみたら確かに困った状態になった話。

<br>

{{< google-adsense >}}

# Bash on Windowsとは
[Bash on Windows](https://msdn.microsoft.com/en-us/commandline/wsl/about) (aka BoW)は、2016/8/3に公開されたWindows 10 Anniversary Updateで使えるようになった、Windows上でBashが使えるようになる機能。

POSIX APIのWindows実装を提供する[Cygwin](https://www.cygwin.com/)などとは違い、WindowsのサブシステムとしてUbuntuが動き、その上でBashが動き、そこからUbuntu用のバイナリをそのまま利用できるというもの。

2016/11/17現在でまだベータ版の機能。

# Windows側からUbuntu側のファイルをいじると壊れる問題
[Microsoftの中の人のブログ](https://blogs.msdn.microsoft.com/commandline/2016/11/17/do-not-change-linux-files-using-windows-apps-and-tools/)に、BoWがセットアップされた環境で、Windows側からUbuntu側のファイル(i.e. `%localappdata%\lxss\`以下のファイル)をいじると壊れるという話があった。
いかにもやってしまいそうな操作で危険だし、実際このブログの人はこれに関する問い合わせに毎日1,2件対応しているそうな。

原因は上記ブログに詳しいが、簡単に言うと、Windows側のプロセスがUbuntu側のファイルを作ったり編集したりする際、パーミッションなどのメタデータを適切に設定しないため、Ubuntu側でファイルが壊れたと判断されてしまうから。
こうなると、結果としてファイルが消えてしまったり、壊れたデータで上書きされてしまったりするとのこと。

因みに、Ubuntu側からWindows側のファイルをいじるのは問題ないらしい。

# 再現確認
そういえばまだBoWをさわったことがなかったので、セットアップして件の問題を体験してみた。

環境は、VMware Player 7.1.0で作ったVMに評価版のWindows 10 Enterprise v1607をインストールしたもの。
セットアップは[公式の手順](https://msdn.microsoft.com/en-us/commandline/wsl/install_guide)に従うだけ。2ステップだけの簡単な手順。

セットアップ後、コマンドプロンプトで`bash`とうつとBoWが起動する。(初回はインストール処理が走り、十数分待たされる。)

__[コマンドプロンプト → Bash]__
![bow.png](/images/bow-do-not-change-linux-files-from-windows/bow.png)

<br>

再現確認に使うのは`hoge`と書いた`hoge.txt`。
これをWindows側の`C:\Users\kaitoy\Desktop\`とUbuntu側の`/home/kaitoy/`に置く。

__[コマンドプロンプト]__

![hoge_cmd.png](/images/bow-do-not-change-linux-files-from-windows/hoge_cmd.png)

__[Bash]__

![hoge_ubuntu.png](/images/bow-do-not-change-linux-files-from-windows/hoge_ubuntu.png)

<br>

Windows側からは、Ubuntuのファイルシステムが`%localappdata%\lxss\`にマウントされているように見える。
(`lxss`はエクスプローラーのオプションから「保護されたオペレーティングシステムファイルを表示しない（推奨）」のチェックをはずさないと見えない。見えなくてもアドレスバーにパスを入力すればアクセスできるけど。)

![lxss.png](/images/bow-do-not-change-linux-files-from-windows/lxss.png)

<br>

一方Ubuntu側からは、WindowsのCドライブが`/mnt/c`にマウントされているように見える。

__[Bash]__

![mntc.png](/images/bow-do-not-change-linux-files-from-windows/mntc.png)

<br>

ここで、コマンドプロンプトを開き、`%localappdata%\lxss\hoge\kaitoy\`(i.e. Ubuntu側の`/home/kaitoy/`)に`cd`し、`hoge.txt`を`echo`で編集してみた。

__[コマンドプロンプト]__

![mod_from_cmd.png](/images/bow-do-not-change-linux-files-from-windows/mod_from_cmd.png)

<br>

したらBashから見えなくなった。アクセスしようとすると「Input/output error」というエラーになる。これが件の現象か。

__[Bash]__

![disappeared.png](/images/bow-do-not-change-linux-files-from-windows/disappeared.png)

エクスプローラからは見えていたので、GUIで`%localappdata%\lxss\hoge\kaitoy\hoge.txt`を削除したら正常な状態に戻った。

<br>

再度同じ`hoge.txt`を作り、今度はメモ帳で編集して内容を`foo`に変えてみた。
この場合は特に問題なし。なぜだ?

__[Bash]__

![no_problem.png](/images/bow-do-not-change-linux-files-from-windows/no_problem.png)

<br>

例のブログをよく読むと、実際に問題になるのはファイルの作成だけのように読める。
編集しているようにみえても、アプリによっては新規ファイルを作って既存のを置き換えていることがあるから、編集もするなと言っている模様。
メモ帳は実際に編集しているから大丈夫だったということか。

<br>

今編集した`hoge.txt`を今度はエクスプローラから消してみる。
Ubuntu側からは消えてないように見えるが、アクセスしようとするとないと言われる。

__[Bash]__

![not_deleted.png](/images/bow-do-not-change-linux-files-from-windows/not_deleted.png)

<br>

エクスプローラのビューをF5で更新したら、今消したはずの`hoge.txt`が復活した。
これをダブルクリックで開こうとしたら「Access is denied.」。
エクスプローラから何度消してもすぐ復活する。

![access_denied.png](/images/bow-do-not-change-linux-files-from-windows/access_denied.png)

<br>

Bashで消そうとしても「Permission denied」。詰んだ。

__[Bash]__

![permission_denied.png](/images/bow-do-not-change-linux-files-from-windows/permission_denied.png)

<br>

ということで、むしろWindows側からUbuntu側のファイルを消すのがもっともやばいと言うことがわかった。
`lxrun /uninstall /full`、`lxrun /install`でUbuntuイメージをインストールしなおさないと直らない。

<br>

最後に、Ubuntu側(i.e. Bash)からWindows側の`C:\Users\kaitoy\Desktop\hoge.txt`をいじってみたが、例のブログに書いてある通りなんの問題もなかった。

__[Bash]__

![fin.png](/images/bow-do-not-change-linux-files-from-windows/fin.png)

<br>

件の問題もベータがとれたら直るかもしれないが、`%localappdata%\lxss\`は保護された隠しフォルダなのでやはり触らないのが無難か。
