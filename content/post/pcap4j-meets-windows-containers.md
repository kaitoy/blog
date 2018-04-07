+++
categories = [ "Programming", "Container" ]
date = "2016-01-22T17:46:43-07:00"
draft = false
eyecatch = "pcap4j-docker.png"
slug = "pcap4j-meets-windows-containers"
tags = [ "pcap4j", "docker", "windows" ]
title = "Pcap4J Meets Windows Containers"
+++

__[Windows Containers](https://msdn.microsoft.com/en-us/virtualization/windowscontainers/about/about_overview)__ で __[Pcap4J](https://github.com/kaitoy/pcap4j)__ のコンテナをビルドしてみた話。

<br>

{{< google-adsense >}}

## Windows Containersとは
Windows Containersは、Microsoftが[Docker, Inc](https://www.docker.com/company)と提携して開発している[コンテナ技術](http://www.sophia-it.com/content/%E3%82%B3%E3%83%B3%E3%83%86%E3%83%8A%E6%8A%80%E8%A1%93)で、Windows版[Docker](https://www.docker.com/)とも言われる機能。
今年リリースされる __Windows Server 2016__ に実装される予定で、その3つめのテクニカルプレビューである __Windows Server 2016 Technical Preview 3__ (2015/8/19公開)から評価できるようになった。

Windows Containersには次の二種類がある。

* Windows Server Containers

    プロセスと名前空間の分離を実現する機能で、これによるコンテナはカーネルをホストと共有する。
    つまり本家Dockerに近い形の機能。

* Hyper-V Containers

    それぞれのコンテナを軽量化されたHyper-Vの仮想マシンっぽいものの上で動かす機能。
    このコンテナの実行にはHyper-Vが必要。
    Windows Server Containersよりコンテナ間の分離性が高く、カーネルの共有もしないが、そもそもそれってコンテナなの?

どちらも同じようなインターフェースで操作でき、このインターフェースには[PowershellのコマンドレットとDockerコマンドの二種類がある](https://msdn.microsoft.com/en-us/virtualization/windowscontainers/reference/ps_docker_comparison)。

より詳しくは、[Microsoftによる解説](https://msdn.microsoft.com/en-us/virtualization/windowscontainers/about/about_overview)や[@ITのこの記事](http://www.atmarkit.co.jp/ait/articles/1512/11/news022.html)がわかりやすい。
また、[Qiitaのこの記事](http://qiita.com/Arturias/items/3e82de8328067d0e03a3)がDockerとWindows Server Containersのアーキテクチャを詳細に説明していて面白い。

## Windows Containersセットアップ
まず、Windows 7 x64のノートPCにVMware Player 7.1.0を入れてWindows 10 x64用のVM(CPU2つとメモリ2.5GB)を作り、そこに2015/11/19に公開された __Windows Server 2016 Technical Preview 4__ をインストール。
コマンドでいろいろ設定するの慣れていないのでGUI(Desktop Experience)付きで。
(リモートデスクトップ使えばよかったのかもしれないけど。)
ロケールは英語以外は問題が起きそうなので英語で。

このVMに、[Microsoftのセットアップガイド](https://msdn.microsoft.com/en-us/virtualization/windowscontainers/quick_start/inplace_setup)と[@ITの記事](http://www.atmarkit.co.jp/ait/articles/1512/14/news006.html)を参照しながらWindows Containersをセットアップ。

後者の記事によると、Hyper-V ContainersをVM上にセットアップするには、[Nested Virtualization](https://msdn.microsoft.com/en-us/virtualization/hyperv_on_windows/user_guide/nesting)というHyper-VのVMの上でHyper-Vを動かす機能を有効にしたホスト上のHyper-V VMを使わないといけないようなので、Windows Server Containersの方を試すことに。

Windows Server Containersをセットアップする手順は以下。

1. VM上でコマンドプロンプトを開いて `powershell start-process powershell -Verb runas` を実行。
2. 青いパワーシェルウィンドウが開くのでそこで `wget -uri https://aka.ms/tp4/Install-ContainerHost -OutFile C:\Install-ContainerHost.ps1` を実行。`Install-ContainerHost.ps1` というスクリプトがダウンロードされる。
3. 青いパワーシェルウィンドウで `C:\Install-ContainerHost.ps1` を実行するとWindows Server Containersのインストールが始まる。

![install.png](/images/pcap4j-meets-windows-containers/install.png)

<br>

途中再起動が一回あって、ログインしたらインストール処理が再開した。
全部で2時間以上かかった。

仮想Ethernetスイッチ接続の追加に失敗したというエラーが出たけどなんなんだろう。
`ipconfig` の出力によると `vEthernet` というDockerの[virtual Ethernet bridge](https://www.kaitoy.xyz/2015/07/25/how-to-capture-packets-on-a-local-network-with-pcap4j-container/#docker-network)にあたるものはちゃんと作られているみたいなんだけど。

## Windows Server Containers味見
コマンドプロンプトで `docker images` を実行すると、既に `windowsservercore` というコンテナイメージが入っていることがわかる。

```cmd
C:\Users\Administrator>docker images
REPOSITORY          TAG                 IMAGE ID            CREATED             VIRTUAL SIZE
windowsservercore   10.0.10586.0        6801d964fda5        11 weeks ago        0 B
windowsservercore   latest              6801d964fda5        11 weeks ago        0 B
```

`docker run -it windowsservercore cmd` を実行すると `windowsservercore` からコンテナを起動してその上でコマンドプロンプトを起動できる。
コンテナの起動は非常に遅い。30秒以上かかる。これは今の時点での[制限](https://msdn.microsoft.com/virtualization/windowscontainers/about/work_in_progress#windows-containers-start-slowly)らしい。

`docker login --help` するとわかるが、コンテナイメージのリポジトリは `https://registry-win-tp3.docker.io/v1/` という仮っぽいサーバにあって、`docker search *` を実行するとそこに登録されたイメージのリストが見れる。

```cmd
C:\Users\Administrator>docker search *
NAME                 DESCRIPTION                                     STARS     OFFICIAL   AUTOMATED
microsoft/aspnet     ASP.NET 5 framework installed in a Windows...   1         [OK]       [OK]
microsoft/django     Django installed in a Windows Server Core ...   1                    [OK]
microsoft/dotnet35   .NET 3.5 Runtime installed in a Windows Se...   1         [OK]       [OK]
microsoft/golang     Go Programming Language installed in a Win...   1                    [OK]
microsoft/httpd      Apache httpd installed in a Windows Server...   1                    [OK]
microsoft/iis        Internet Information Services (IIS) instal...   1         [OK]       [OK]
microsoft/mongodb    MongoDB installed in a Windows Server Core...   1                    [OK]
microsoft/mysql      MySQL installed in a Windows Server Core b...   1                    [OK]
microsoft/nginx      Nginx installed in a Windows Server Core b...   1                    [OK]
microsoft/node       Node installed in a Windows Server Core ba...   1                    [OK]
microsoft/php        PHP running on Internet Information Servic...   1                    [OK]
microsoft/python     Python installed in a Windows Server Core ...   1                    [OK]
microsoft/rails      Ruby on Rails installed in a Windows Serve...   1                    [OK]
microsoft/redis      Redis installed in a Windows Server Core b...   1                    [OK]
microsoft/ruby       Ruby installed in a Windows Server Core ba...   1                    [OK]
microsoft/sqlite     SQLite installed in a Windows Server Core ...   1                    [OK]
```

これらはちゃんと `docker pull` して使える。
けど多分 `docker push` はできない。

## Pcap4J on Windows Container
結論から言うと、以下の `Dockerfile` を書いて `docker build` してPcap4Jをコンテナ上でビルドするところまではできたが、それを実行してもNIFが全く検出できず、よってパケットキャプチャも実行できなかった。

```
#
# Dockerfile for Pcap4J on Windows
#

FROM windowsservercore:latest
MAINTAINER Kaito Yamada <kaitoy@pcap4j.org>

# Install Chocolatey.
RUN mkdir C:\pcap4j
WORKDIR /pcap4j
ADD https://chocolatey.org/install.ps1 install.ps1
RUN powershell .\install.ps1

# Install dependencies.
RUN choco install -y nmap maven git jdk7

# Build Pcap4J.
RUN git clone git://github.com/kaitoy/pcap4j.git
WORKDIR pcap4j
RUN powershell -NoProfile -ExecutionPolicy Bypass -Command "mvn '-Dmaven.repo.local=C:\pcap4j\repo' -P distribution-assembly install 2>&1 | add-content -Path build.log -pass

# Collect libraries.
RUN mkdir bin && \
    cd pcap4j-packetfactory-static && \
    mvn -Dmaven.repo.local=C:\pcap4j\repo -DoutputDirectory=..\bin -Dmdep.stripVersion=true -DincludeScope=compile dependency:copy-dependencies && \
    mvn -Dmaven.repo.local=C:\pcap4j\repo -DoutputDirectory=..\bin -Dmdep.stripVersion=true -DincludeGroupIds=ch.qos.logback dependency:copy-dependencies && \
    cd ../pcap4j-distribution && \
    mvn -Dmaven.repo.local=C:\pcap4j\repo -DoutputDirectory=..\bin -Dmdep.stripVersion=true -DincludeArtifactIds=pcap4j-packetfactory-static,pcap4j-sample dependency:copy-dependencies

# Generate sample script. (C:\pcap4j\pcap4j\bin\capture.bat)
RUN echo @echo off > bin\capture.bat && \
    echo "%JAVA_HOME%\bin\java" -cp C:\pcap4j\pcap4j\bin\pcap4j-core.jar;C:\pcap4j\pcap4j\bin\pcap4j-packetfactory-static.jar;C:\pcap4j\pcap4j\bin\pcap4j-sample.jar;C:\pcap4j\pcap4j\bin\jna.jar;C:\pcap4j\pcap4j\bin\slf4j-api.jar;C:\pcap4j\pcap4j\bin\logback-classic.jar;C:\pcap4j\pcap4j\bin\logback-core.jar org.pcap4j.sample.GetNextPacketEx >> bin\capture.bat
```

この `Dockerfile` でやっていることはだいたい以下。

1. [Chocolatey](https://chocolatey.org/)をインストール。
2. [Nmap](https://nmap.org/)と[Maven](https://maven.apache.org/)と[Git](https://git-scm.com/)とJDK7をChocolateyでインストール。
3. Pcap4Jのソースを `git clone` でダウンロード。
4. MavenでPcap4Jのビルドを実行。
5. Pcap4Jのサンプルクラスを実行するスクリプトを生成。

2でNmapは[WinPcap](http://www.winpcap.org/)の代わりに入れている。
GUI無しの環境でWinPcapをChocolateyで入れようとしても、エラーが発生したりしなかったりして、しかもどちらにせよ正常に入らない。
これはWinPcapのインストーラがサイレントインストールをサポートしていないから。
Nmapはサイレントインストールできて、インストール処理中にWinPcapを入れてくれるのでありがたい。

ビルドしてみると、各ステップの実行(多分レイヤの作成)がすごく遅い。
`RUN choco install -y nmap maven git jdk7` の後、次のコマンド実行まで30分くらい固まった。

また、`Dockerfile` を書いていて以下のバグに悩まされた。

* `WORKDIR` や `ENV` で環境変数が展開されない。

      ```cmd
      ENV hoge %tmp%
      RUN echo %hoge%
      ```

      とすると `%tmp%` と表示される。

* `WORKDIR` や `ENV` や `COPY` でパスの区切りは `\` 一つだと消えちゃうので `\\` か `/` を使わないといけない。

* `WORKDIR` や `COPY` のコンテナ内のパスに絶対パスを指定したい場合、`C:\hoge`、`C:/hoge`、`C:\\hoge`、いずれもダメ。
  以下の様なエラーが出る。

      ```
      GetFileAttributesEx \\?\Volume{67df3c84-a0ef-11e5-9a63-000c2976fbc3}\C:: The filename, directory name, or volume label syntax is incorrect.
      ```
  UNIX式に `/hoge` とするといける。C以外のドライブを指定したいときはどうするんだろう。

* コンテナ内で `C:\` 直下に `.` で始まる名前のフォルダ作ると次のステップで消えてる。
  `.` で始まる名前のファイルは `C:\` 直下じゃなくても次のステップで消えてる。
  Mavenのリポジトリがデフォルトで `C:\.m2\` 以下にできるのではまる。

これらのバグを乗り越えて頑張って `Dockerfile` 書いたのに、NIFの検出すらできなかったという哀しい結果。
`pcap_lookupdev` が以下のエラーを吐いて `NULL` を返してきてたので、なんとなくコンテナのNIFに長すぎる名前がついていて検出失敗しているんじゃないかと。

```
PacketGetAdapterNames: The data area passed to a system call is too small. (122)
```

因みにコンテナ内から見えるNIFは一つで、以下の構成。

```
Ethernet adapter vEthernet (Virtual Switch-d206475ce13256766b9a16383540a740fe31da8d20499349fe98693393a8490f-0):

   Connection-specific DNS Suffix  . : localdomain
   Link-local IPv6 Address . . . . . : fe80::4086:d11e:5e6:28fe%26
   IPv4 Address. . . . . . . . . . . : 172.16.0.2
   Subnet Mask . . . . . . . . . . . : 255.240.0.0
   Default Gateway . . . . . . . . . : 172.16.0.1
```

コンテナ内から `www.google.com` とかにping届いたので、このNIFはちゃんと働いていはずなんだけどPcap4Jから見えない。

<br>
<br>

後日上記 `Dockerfile` でビルドしてみたら、`RUN powershell .\install.ps1` で以下のエラーが出るようになった。

```
The request was aborted: Could not create SSL/TLS secure channel.
```

install.ps1の中でChocolateyのインストーラをHTTPSで取ってこようとしてエラーになっている模様。
Windows Containersの[ドキュメント](https://msdn.microsoft.com/en-us/virtualization/windowscontainers/about/work_in_progress#https-and-tls-are-not-supported)や[フォーラム](https://social.msdn.microsoft.com/Forums/en-US/c0d93dda-37b7-4a2c-9a78-55e4ba0b88f5/https-support-in-windowsservercore-image?forum=windowscontainers)にHTTPSが使えないという制限が載っているけどこのせい?
ちょっと前にやったときは同じ `Dockerfile` でビルドできたはずなんだけど。

試しに以下の処理を挟んでChocolateyのインストーラをHTTPで取ってくるようにしたらChocolateyのインストールまではできた。

```cmd
RUN powershell $(Get-Content install.ps1) -replace \"https\",\"http\" > install.mod.ps1
```

けど `choco install` がHTTPS使うので結局駄目だった。

もう面倒なのでHTTPSの制限がとれるのをまとう。
