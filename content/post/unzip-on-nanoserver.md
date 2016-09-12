+++
categories = [ "Container" ]
date = "2016-09-12T16:46:54-06:00"
draft = false
eyecatch = "nanoserver.png"
slug = "unzip-on-nanoserver"
tags = ["windows", "nanoserver", "docker"]
title = "Hyper-Vコンテナ(Nano Server)でunzipしたいならjarを使え"
+++

Nano Serverでunzipしたかっただけだったのに、妙に苦労した話。

## Nano Serverとは
[Nano Server](https://technet.microsoft.com/en-us/windows-server-docs/compute/nano-server/getting-started-with-nano-server)は、Windows Server 2016で追加されるWindows Serverの新たなインストール形式で、[Server Core](https://en.wikipedia.org/wiki/Server_Core)よりさらに機能を絞り、リモートで管理するクラウドホストやWebサーバ向けにに特化したもの。

Server Coreが数GBくらいなのに対し、Nano Serverは数百MBととても軽量で、それゆえ起動が速くセキュア。

## unzipとは
unzipとは、[zip](https://ja.wikipedia.org/wiki/ZIP_(%E3%83%95%E3%82%A1%E3%82%A4%E3%83%AB%E3%83%95%E3%82%A9%E3%83%BC%E3%83%9E%E3%83%83%E3%83%88)ファイルを解凍する、ただそれだけのこと。

ただそれだけのことで、基本的な機能だと思うのだが、Windowsはこれを[コマンドラインで実行する方法](https://technet.microsoft.com/en-us/library/dn841359.aspx)をつい最近まで正式に提供していなかった。

## Nano Serverでunzip
Windows 10の[Hyper-V Containers](https://tbd.kaitoy.xyz/2016/01/22/pcap4j-meets-windows-containers/#windows-containers%E3%81%A8%E3%81%AF)の上で[Pcap4J](https://github.com/kaitoy/pcap4j)のビルドとテストをするDockerイメージをビルドしたくて、そのための依存ライブラリなどをインストールする処理をDockerfileに書いていて、`ADD`でzipをダウンロードしたところまではいいんだけど、このzipどうやって解凍してやろうかとなった。
(Dockerホストに置いたものをコンテナに`ADD`するのはなんか格好悪いから無しで。Dockerfile裸一貫で実現したい。)

Windows 10のHyper-V Containersは、[現時点でNano Serverしかサポートしていない](https://social.msdn.microsoft.com/Forums/en-US/9eea93ac-18de-4953-bc7c-efd76a155526/are-microsoftwindowsservercore-containers-working-on-windows-10?forum=windowscontainers)のが厳しい点。Server Coreだったら楽だったのに。

<br>

以下、いろいろ試したことを書く。

#### 正攻法: Expand-Archive
PowerShellの v5 で実装されたExpand-Archiveというコマンドレットでzipを解凍できる。
Nano ServerのPowerShellのバージョンを確認したら 5.1 だったのでこれでいけるかと思った。

```cmd
C:\>powershell -command "$PSVersionTable.PSVersion"

Major  Minor  Build  Revision
-----  -----  -----  --------
5      1      14284  1000
```

<br>

したらこのエラー。

```powershell
Add-Type : Cannot find path 'C:\System.IO.Compression.FileSystem.dll' because it does not exist.
At
C:\windows\system32\windowspowershell\v1.0\Modules\Microsoft.PowerShell.Archive\Microsoft.PowerShell.Archive.psm1:914
char:5
+     Add-Type -AssemblyName System.IO.Compression.FileSystem
+     ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : ObjectNotFound: (C:\System.IO.Compression.FileSystem.dll:String) [Add-Type], ItemNotFoun
   dException
    + FullyQualifiedErrorId : PathNotFound,Microsoft.PowerShell.Commands.AddTypeCommand
```

どうもPowerShellの 5.1 以降には、.NET FrameworkベースのDesktop Editionと、そこから機能を絞った.NET CoreベースのCore Editionがあり、[Nano ServerのはCore Editionなんだそうな](https://technet.microsoft.com/en-us/windows-server-docs/compute/nano-server/powershell-on-nano-server)。

Expand-ArchiveはSystem.IO.Compression.FileSystem.dllの中のZipFileクラスに依存しているんだけど、.NET CoreにはSystem.IO.Compression.FileSystem.dllが含まれていないっぽい。

#### ShellオブジェクトのCopyHere
PowerShellでのunzip方法を調べたらStack Overflowに[いくつか載っていた](http://stackoverflow.com/questions/27768303/how-to-unzip-a-file-in-powershell)。
Expand-Archiveと、System.IO.Compression.ZipFileを直接使う方法と、Shellオブジェクト(COMオブジェクト)のCopyHereメソッドを使う方法。

最初の2つはCore Editionでは使えないことが分かっているので、3つめにトライ。
こんなの↓

```powershell
$shell = New-Object -ComObject shell.application
$zip = $shell.NameSpace("C:\a.zip")
MkDir("C:\a")
foreach ($item in $zip.items()) {
  $shell.Namespace("C:\a").CopyHere($item)
}
```

調べたらこの方法は[Microsoftから非推奨にされている](https://support.microsoft.com/ja-jp/kb/2679832)ことが分かったんだけど、一応やってみる。

したら以下のエラー。

```powershell
new-object : Retrieving the COM class factory for component with CLSID {00000000-0000-0000-0000-000000000000} failed
due to the following error: 80040154 Class not registered (Exception from HRESULT: 0x80040154 (REGDB_E_CLASSNOTREG)).
```

この方法で利用しようとしているのは[Windows shell](https://en.wikipedia.org/wiki/Windows_shell)、つまり[Windows Explorer](https://ja.wikipedia.org/wiki/Windows_Explorer)の機能らしく、そうであればまあGUIがないNano Serverで動かないのも当然か。

#### サードパーティツールに頼る
Stack Overflowの[別の質問](http://stackoverflow.com/questions/1021557/how-to-unzip-a-file-using-the-command-line)にサードパーティツールに頼る方法がいくつか紹介されていた。

ここで挙げられていたもののうち、[7-Zip](http://www.7-zip.org/download.html)、[Freebyte Zip](http://www.freebyte.com/fbzip/)、[Info-ZIP](http://infozip.sourceforge.net/)は、配布形式がダメ。

7-Zipのインストーラをコンテナで実行してみたら、「The subsystem needed to support the image type is not present.」というエラー。7-Zipにはzipで配布されているものもあるんだけど、皮肉としか思えない。

Freebyte ZipやInfo-ZIPの自己解凍ファイルもコンテナ内では動いてくれない。

一方、[pkunzip](http://membrane.com/synapse/library/pkunzip.html)はコマンドが裸で配布されているので行けるかと思ったが、実行したら「The system cannot execute the specified program.」なるエラー。
よく見たらこれ16bitアプリケーション。Nano Serverは32bitアプリすら実行できないというのに。

#### jarに託された最後の希望
上に貼ったStack Overflowの質問には[jarコマンド](https://docs.oracle.com/javase/8/docs/technotes/tools/unix/jar.html)を使う方法も挙げられていたが、JDKなんてどうせインストールできないとあきらめていた。

が、ふと思い立って[Docker Hub](https://hub.docker.com/)を検索してみたら、[OpenJDK入りのNano Server](https://hub.docker.com/r/michaeltlombardi/nanoserveropenjdk/)をアップしてくれている人がいた。

pullしてrunしてみたら確かにJDKがインストールされていた。

```cmd
C:\>java -version
openjdk version "1.8.0_102-1-ojdkbuild"
OpenJDK Runtime Environment (build 1.8.0_102-1-ojdkbuild-b14)
OpenJDK 64-Bit Server VM (build 25.102-b14, mixed mode)
```

で、無事`"C:\Program Files\Java\bin\jar.exe" xf hoge.zip`のようにしてunzipできた。

ここまで1日かかった。
