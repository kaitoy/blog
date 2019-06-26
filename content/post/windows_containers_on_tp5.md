+++
categories = [ "Programming", "Container" ]
date = "2016-07-11T00:30:33-06:00"
draft = false
cover = "pcap4j-docker.png"
slug = "windows_containers_on_tp5"
tags = [ "pcap4j", "docker", "windows" ]
title = "Windows Server 2016 TP5でWindows Containersにリトライ"

+++

[Windows Server 2016のTechnical Preview 5(TP5)が公開されていた](https://www.microsoft.com/ja-jp/evalcenter/evaluate-windows-server-technical-preview)ので、
[TP4でバグに阻まれて挫折した](https://www.kaitoy.xyz/2016/01/22/pcap4j-meets-windows-containers/)、Windows Containersで[Pcap4J](https://github.com/kaitoy/pcap4j)を使ってパケットキャプチャする試みにリトライした話。

<!--more-->

{{< google-adsense >}}

# OSセットアップ
[TP4のとき](https://www.kaitoy.xyz/2016/01/22/pcap4j-meets-windows-containers/#windows-containersセットアップ)と同じ環境。

以降は[Windows Server Containersのクイックスタートガイド](https://msdn.microsoft.com/en-us/virtualization/windowscontainers/quick_start/quick_start_windows_server)に沿ってセットアップを進める。
[TP4](https://www.kaitoy.xyz/2016/01/22/pcap4j-meets-windows-containers/#windows-containersセットアップ)からは大分変わっていて、単一のPowershellスクリプトを実行する形式から、Powershellのコマンドレットを逐次手動実行する形式になっている。
面倒だけど何やってるかわかりやすくて好き。

# コンテナ機能のインストール

1. 管理者権限のパワーシェルウィンドウを開く

    コマンドプロンプトから以下のコマンドを実行。

    ```cmd
    powershell start-process powershell -Verb runas
    ```

2. コンテナ機能のインストール

    開いた青いパワーシェルウィンドウで以下のコマンドを実行するとコンテナ機能がインストールされる。

    ```powershell
    Install-WindowsFeature containers
    ```

    数分で終わる。

    インストールされたのはHyper-V ContainersじゃなくてWindows Server Containersの方。
    クイックスタートガイドをみると、前者がWindows 10向け、後者がWindows Server向けというように住み分けされているっぽい。TP4では両方ともWindows Serverで使えたんだけど。

3. 再起動

    変更を有効にするために再起動が必要。

    ```powershell
    Restart-Computer -Force
    ```

# Dockerインストール
Dockerは、コンテナイメージの管理やコンテナの起動などもろもろの機能を提供するDockerデーモンと、その機能を利用するためのCLIを提供するDockerクライアントからなる。この節ではそれら両方をインストールする。

1. Dockerインストールフォルダ作成

    管理者権限のパワーシェルウィンドウを開いて、以下のコマンドでDockerインストールフォルダを作成。

    ```powershell
    New-Item -Type Directory -Path 'C:\Program Files\docker\'
    ```

2. Dockerデーモンインストール

    まずはデーモンの方をインストール。

    ```powershell
    Invoke-WebRequest https://aka.ms/tp5/b/dockerd -OutFile $env:ProgramFiles\docker\dockerd.exe -UseBasicParsing
    ```

    数分。

3. Dockerクライアントインストール

    次にクライアント。

    ```powershell
    Invoke-WebRequest https://aka.ms/tp5/b/docker -OutFile $env:ProgramFiles\docker\docker.exe -UseBasicParsing
    ```
    数十秒。

4. パスの設定

    さっき作ったDockerインストールフォルダにパスを通す。

    ```powershell
    [Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\Program Files\Docker", [EnvironmentVariableTarget]::Machine)
    ```

5. Dockerデーモンをサービスに登録

    パスの設定を反映するためにいったんパワーシェルウィンドウとコマンドプロンプトを閉じて、
    また管理者権限でパワーシェルウィンドウ開いて、以下のコマンドでDockerデーモンをサービスに登録する。

    ```cmd
    dockerd --register-service
    ```

6. Dockerデーモン起動

    Dockerデーモンは以下のコマンドで起動できる。

    ```powershell
    Start-Service docker
    ```

    数秒で立ち上がる。
    デフォルトではOS再起動時にはDockerデーモンは自動起動しないので、そのつどこのコマンドを実行する必要がある。

<br>

これでDockerインストール完了。
この時点ではコンテナイメージは何もない。

```cmd
C:\Users\Administrator>docker images
REPOSITORY          TAG                 IMAGE ID            CREATED             SIZE

```

因みにインストールされたDockerのバージョンは1.12開発版。現時点での最新版だ。
```cmd
C:\Users\Administrator>docker -v
Docker version 1.12.0-dev, build 8e92415
```

# コンテナイメージのインストール
次に、コンテナイメージをインストールする。

1. コンテナイメージのパッケージプロバイダをインストール

    いまいち何なのかはよくわからないが、
    コンテナイメージのパッケージプロバイダというのをインストールする。

    ```powershell
    Install-PackageProvider ContainerImage -Force
    ```

    数十秒。

2. Windows Server Coreのイメージをインストール

    ```powershell
    Install-ContainerImage -Name WindowsServerCore
    ```

    9GB以上もあるファイルをダウンロードして処理するのでかなり時間がかかる。
    50分くらいかかった。


3. Dockerデーモン再起動

    ```powershell
    Restart-Service docker
    ```

<br>

無事Windows Server Coreイメージがインストールされた。

```cmd
PS C:\Users\Administrator> docker images
REPOSITORY          TAG                 IMAGE ID            CREATED             SIZE
windowsservercore   10.0.14300.1000     5bc36a335344        8 weeks ago         9.354 GB
```

# Pcap4Jコンテナイメージのビルド
以下を`C:\Users\Administrator\Desktop\pcap4j\Dockerfile`に書いて、`cd C:\Users\Administrator\Desktop\pcap4j`して、`docker build -t pcap4j .`を実行。
(Notepad使ったので、拡張子を表示する設定にして`Dockerfile`の`.txt`を消さないといけない罠があった。)

```dockerfile
#
# Dockerfile for Pcap4J on Windows
#

FROM windowsservercore:10.0.14300.1000
MAINTAINER Kaito Yamada <kaitoy@pcap4j.org>

# Install Chocolatey.
RUN mkdir C:\pcap4j
WORKDIR c:\\pcap4j
ADD https://chocolatey.org/install.ps1 install.ps1
RUN powershell .\install.ps1

# Install dependencies.
RUN choco install -y nmap jdk7 && \
    choco install -y maven -version 3.2.5

# Build Pcap4J.
RUN powershell -Command Invoke-WebRequest https://github.com/kaitoy/pcap4j/archive/v1.zip -OutFile pcap4j.zip && \
    powershell -Command Expand-Archive -Path pcap4j.zip -DestinationPath .
WORKDIR pcap4j-1
RUN powershell -Command "mvn -P distribution-assembly install 2>&1 | Add-Content -Path build.log -PassThru"

# Collect libraries.
RUN mkdir bin && \
    cd pcap4j-packetfactory-static && \
    mvn -DoutputDirectory=..\bin -Dmdep.stripVersion=true -DincludeScope=compile dependency:copy-dependencies && \
    mvn -DoutputDirectory=..\bin -Dmdep.stripVersion=true -DincludeGroupIds=ch.qos.logback dependency:copy-dependencies && \
    cd ../pcap4j-distribution && \
    mvn -DoutputDirectory=..\bin -Dmdep.stripVersion=true -DincludeArtifactIds=pcap4j-packetfactory-static,pcap4j-sample dependency:copy-dependencies

# Generate sample script. (C:\pcap4j\pcap4j-1\bin\capture.bat)
RUN echo @echo off > bin\capture.bat && \
    echo "%JAVA_HOME%\bin\java" -cp C:\pcap4j\pcap4j-1\bin\pcap4j-core.jar;C:\pcap4j\pcap4j-1\bin\pcap4j-packetfactory-static.jar;C:\pcap4j\pcap4j-1\bin\pcap4j-sample.jar;C:\pcap4j\pcap4j-1\bin\jna.jar;C:\pcap4j\pcap4j-1\bin\slf4j-api.jar;C:\pcap4j\pcap4j-1\bin\logback-classic.jar;C:\pcap4j\pcap4j-1\bin\logback-core.jar org.pcap4j.sample.GetNextPacketEx >> bin\capture.bat
```

<br>

Dockerfileに書いた処理内容は[TP4のとき](https://www.kaitoy.xyz/2016/01/22/pcap4j-meets-windows-containers/#pcap4j-on-windows-container)とだいたい同じ。
以下、Dockerfile書いているときに気付いたこと。

## TP4からのアップデート
> WORKDIR や ENV や COPY でパスの区切りは \ 一つだと消えちゃうので \\ か / を使わないといけない。
> <div style="font-size: 0.5em; text-align: right;"><cite>引用元: <a href="https://www.kaitoy.xyz/2016/01/22/pcap4j-meets-windows-containers/#pcap4j-on-windows-container">TP4のときのエントリ</a></cite></div>

[このページ](https://msdn.microsoft.com/en-us/virtualization/windowscontainers/docker/manage_windows_dockerfile)の各コマンドの__Windows Considerations__に、`WORKDIR`のパスの区切りのバックスラッシュはエスケープしないといけないとか、`ADD`のパスの区切りはスラッシュじゃないといけないとか書いてある。
TP4のときはなかったような。

<br>

> WORKDIR や COPY のコンテナ内のパスに絶対パスを指定したい場合、C:\hoge、C:/hoge、C:\\hoge、いずれもダメ。 以下の様なエラーが出る。
> <div style="font-size: 0.5em; text-align: right;"><cite>引用元: <a href="https://www.kaitoy.xyz/2016/01/22/pcap4j-meets-windows-containers/#pcap4j-on-windows-container">TP4のときのエントリ</a></cite></div>

これは直った。`WORKDIR c:\\pcap4j`で行ける。

<br>

> install.ps1の中でChocolateyのインストーラをHTTPSで取ってこようとしてエラー
> <div style="font-size: 0.5em; text-align: right;"><cite>引用元: <a href="https://www.kaitoy.xyz/2016/01/22/pcap4j-meets-windows-containers/#pcap4j-on-windows-container">TP4のときのエントリ</a></cite></div>

普通に`choco install`できたので、HTTPSが使えない制限は消えた模様。

<br>

> ビルドしてみると、各ステップの実行(多分レイヤの作成)がすごく遅い。
> <div style="font-size: 0.5em; text-align: right;"><cite>引用元: <a href="https://www.kaitoy.xyz/2016/01/22/pcap4j-meets-windows-containers/#pcap4j-on-windows-container">TP4のときのエントリ</a></cite></div>

各ステップの実行は相変わらず重い。特にファイル変更が多いときはすごく重い。

<br>

> コンテナの起動は非常に遅い。30秒以上かかる。
> <div style="font-size: 0.5em; text-align: right;"><cite>引用元: <a href="https://www.kaitoy.xyz/2016/01/22/pcap4j-meets-windows-containers/#windows-server-containers味見">TP4のときのエントリ</a></cite></div>

コンテナ起動は早くなったけどまだ5秒くらいかかる。

<br>

> WORKDIR や ENV で環境変数が展開されない。
> <div style="font-size: 0.5em; text-align: right;"><cite>引用元: <a href="https://www.kaitoy.xyz/2016/01/22/pcap4j-meets-windows-containers/#pcap4j-on-windows-container">TP4のときのエントリ</a></cite></div>

これはまだ直っていない。`%tmp%`、`%TMP%`、`$TMP`、`${TMP}`、どれもだめ。

<br>

> コンテナ内で C:\ 直下に . で始まる名前のフォルダ作ると次のステップで消えてる。
> <div style="font-size: 0.5em; text-align: right;"><cite>引用元: <a href="https://www.kaitoy.xyz/2016/01/22/pcap4j-meets-windows-containers/#pcap4j-on-windows-container">TP4のときのエントリ</a></cite></div>

これは再現しなかった。以前のも勘違いだったのかもしれない。
なんにせよデフォルトの.m2フォルダのパスが`C:\Users\ContainerAdministrator\.m2`になったので気にしなくてよくなった。

## ビルドエラー: hcsshim::ImportLayer failed in Win32: The filename or extension is too long. (0xce)
`choco install`の後で以下のエラーが出た。

```plain
re-exec error: exit status 1: output: time="2016-07-09T19:57:22-07:00" level=error msg="hcsshim::ImportLayer failed in Win32: The filename or extension is too long. (0xce) layerId=\\\\?\\C:\\ProgramData\\docker\\windowsfilter\\103de6bf1358c506510ad67990f09ec3e2f10f9e866e846df5a88c04f5edf7aa flavour=1 folder=C:\\Windows\\TEMP\\hcs719016711"
hcsshim::ImportLayer failed in Win32: The filename or extension is too long. (0xce) layerId=\\?\C:\ProgramData\docker\windowsfilter\103de6bf1358c506510ad67990f09ec3e2f10f9e866e846df5a88c04f5edf7aa flavour=1 folder=C:\Windows\TEMP\hcs719016711
```

調べたら[DockerのGitHub Issues](https://github.com/docker/docker/issues/22449)に登録されていた。
ここのコメントを参考に以下のコマンドでコンテナホストのアップデートをしたら発生しなくなった。

```powershell
Invoke-WebRequest https://aka.ms/tp5/Update-Container-Host -OutFile update-containerhost.ps1
.\update-containerhost.ps1
Restart-Computer -Force
```

## git cloneできない
Pcap4Jのソースをダウンロードしたかったんだけど、なぜか`git clone`がHTTPSでもGITプロトコルでもエラーを返す。
原因を調べるのが面倒で結局zipでダウンロードするようにした。

## 未実装の機能
[Dockerfileのリファレンス](https://docs.docker.com/engine/reference/builder/)に載っていて、Windows向けのサンプルも書いてあるのに、[escapeディレクティブ](https://docs.docker.com/engine/reference/builder/#/escape)と[SHELLコマンド](https://docs.docker.com/engine/reference/builder/#/shell)
が使えなかった。

# コンテナ起動
とりあえず上記DockerfileでPcap4Jコンテナイメージのビルドはできた。

以下のコマンドでそのイメージからコンテナを起動。

```cmd
C:\Users\Administrator>docker run -it pcap4j cmd
```

コンテナ内で`ipconfig`すると`vEthernet (Temp Nic Name)`という名のネットワークインターフェースがあることがわかる。

```cmd
C:\pcap4j\pcap4j-1\bin>ipconfig

Windows IP Configuration


Ethernet adapter vEthernet (Temp Nic Name):

   Connection-specific DNS Suffix  . : localdomain
   Link-local IPv6 Address . . . . . : fe80::59cf:1491:6f8e:30c8%18
   IPv4 Address. . . . . . . . . . . : 172.23.71.6
   Subnet Mask . . . . . . . . . . . : 255.240.0.0
   Default Gateway . . . . . . . . . : 172.16.0.1
```

けどPcap4Jからは見えなかった。

```cmd
C:\pcap4j\pcap4j-1\bin>capture.bat
org.pcap4j.sample.GetNextPacketEx.count: 5
org.pcap4j.sample.GetNextPacketEx.readTimeout: 10
org.pcap4j.sample.GetNextPacketEx.snaplen: 65536


18:49:00.582 [main] INFO  org.pcap4j.core.Pcaps - No NIF was found.
java.io.IOException: No NIF to capture.
        at org.pcap4j.sample.GetNextPacketEx.main(GetNextPacketEx.java:45)java:44)
```

<br>

コンテナには`ContainerAdministrator`というユーザでログインしていて、これの権限が弱いせいなんじゃないかと。
コンテナ内にも`Administrator`というユーザがあるようだったので、こっちでコマンド実行するよう奮闘した。

## コンテナ内でAdministratorでコマンド実行したい

## USERコマンド
Dockerfileのコマンドに[USER](https://docs.docker.com/engine/reference/builder/#/user)というのがあるので、`USER Administrator`をDockerfileの末尾に追加してみたら以下のエラー。

```cmd
The daemon on this platform does not support the command 'user'
```

## --userオプション
docker runコマンドに[--user](https://docs.docker.com/compose/reference/run/)というオプションがあるので以下のように試してみたところ、オプションは無視されて`ContainerAdministrator`でコンテナに入った。

```cmd
docker run -it --user Administrator pcap4j cmd
```

## runas
ちょっと発想の転換をして、`ContainerAdministrator`でコンテナに入った後sudoみたいなことをすればいいかと思い、[runas](https://technet.microsoft.com/en-us/library/bb490994.aspx)コマンドを試したけどだめだった。
よく分からないエラーがでるし、そもそも`Administrator`のパスワードがわからない。

```cmd
C:\pcap4j\pcap4j-1\bin>runas /user:Administrator cmd
Enter the password for Administrator:
Attempting to start cmd as user "92EC7B3B09B4\Administrator" ...
RUNAS ERROR: Unable to run - cmd
1326: The user name or password is incorrect.
```

```cmd
C:\pcap4j\pcap4j-1\bin>runas /user:"User Manager\Administrator" capture.bat
Enter the password for User Manager\Administrator:
RUNAS ERROR: Unable to acquire user password
```

## Enter-PSSession
フォーラムに行ったら[Enter-PSSession](https://social.msdn.microsoft.com/Forums/en-US/0b6bd405-a235-4608-a06b-a09b9ba08b2e/runas-administrator?forum=windowscontainers)を使う方法が書いてあった。

[Enter-PSSession](https://technet.microsoft.com/en-us/library/hh849707.aspx)はリモートシステムに接続するコマンドレットで、`-ContainerName`オプションを使えばコンテナにも接続できる。

試したら、コンテナが見つからないというエラーが出た。

```cmd
C:\Users\Administrator>powershell -command Enter-PSSession -ContainerName amazing_archimedes -RunAsAdministrator
Enter-PSSession : The input ContainerName amazing_archimedes does not exist, or the corresponding container is not running.
At line:1 char:1
+ Enter-PSSession -ContainerName amazing_archimedes -RunAsAdministrator
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (:) [Enter-PSSession], PSInvalidOperationException
    + FullyQualifiedErrorId : CreateRemoteRunspaceForContainerFailed,Microsoft.PowerShell.Commands.EnterPSSessionCommand
```

[Invoke-Command](https://technet.microsoft.com/en-us/library/hh849719.aspx)もコンテナをターゲットにできるので試してみたけど、同様のエラー。

どうもパワーシェルで扱うコンテナやコンテナイメージが、dockerコマンドが扱うものとは別になっているせいっぽい。
そんなことがTP4のときに見たドキュメントに書いてあったのを思い出した。(このドキュメントは消えてた。)

実際、`docker ps`では見えているコンテナが、

```cmd
C:\Users\Administrator>docker ps
CONTAINER ID        IMAGE               COMMAND             CREATED             STATUS              PORTS               NAMES
a711497f29d8        pcap4j              "cmd"               13 minutes ago      Up 12 minutes                           amazing_archimedes
```

コマンドレットからだと見えない。

```cmd
C:\Users\Administrator>powershell -command Get-Container
WARNING: Based on customer feedback, we are updating the Containers PowerShell module to better align with Docker. As part of that some cmdlet and parameter names may change in future releases. To learn more about these changes as well as to join in the design process or provide usage feedback please refer to http://aka.ms/windowscontainers/powershell
```

そうなると、パワーシェルのコマンドレットには`docker build`にあたるものがないのでもうどうしようもない。

そもそも、TP4の頃のコマンドレットは[廃止になって](https://msdn.microsoft.com/en-us/virtualization/windowscontainers/management/docker-powershell)、[新しいコマンドレット](https://github.com/Microsoft/Docker-PowerShell/)を開発中らしい。やはりdockerコマンドとコマンドレットでコンテナの相互運用ができない仕様にユーザから相当つっこみがあったようだ。

`Enter-PSSession`や`Invoke-Command`の`-ContainerName`オプションもその内修正されるであろう。
それまで待つか。
