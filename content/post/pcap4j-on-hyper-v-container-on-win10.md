+++
categories = [ "Programming", "Container" ]
date = "2016-09-15T13:56:35-06:00"
draft = false
cover = "nanoserver.png"
slug = "pcap4j-on-hyper-v-container-on-win10"
tags = ["windows", "nanoserver", "pcap4j", "docker"]
title = "Pcap4J on Nano Server on Hyper-V Containers on Windows 10 on VMware Playerにトライ"

+++

[Pcap4J](https://github.com/kaitoy/pcap4j)が動くHyper-VコンテナをWindows 10上でビルドしようとしたけど3合目あたりで息絶えた話。

<br>

{{< google-adsense >}}

# Hyper-V Containersとは
Hyper-V Containersは、MicrosoftによるWindowsネイティブなコンテナ技術である[Windows Containers](https://msdn.microsoft.com/en-us/virtualization/windowscontainers/about/about_overview)の一種で、これによるコンテナは、同じくWindows Containersの一種であるWindows Server Containersのものに比べて、より厳密に隔離されている分、起動コストが高い。

実体は[Docker](https://www.docker.com/)そのもので、コンテナイメージは[Docker Hub](https://hub.docker.com/)からpullできるし、コンテナの操作や管理はdockerコマンドでやる。(昔はコンテナ操作用PowerShellコマンドレットもあったが、不評だったので廃止したようだ。)
[ソース](https://github.com/docker/docker)もLinuxとWindowsで一本化されている。

Windows 10の[Anniversary Update](https://blogs.windows.com/japan/2016/08/03/how-to-get-the-windows-10-anniversary-update/#eFCYhK68sDp1V0F7.97)で正式にリリースされたが、なんだかあまり注目されていない気がする。

[Docker for Windows](https://www.kaitoy.xyz/2016/07/31/docker-for-windows/#docker-for-windows%E3%81%A8%E3%81%AF)とは全く別物なので注意。

# Hyper-V Containersのインストール (on VMware Player)
自前のPCが5年前に買った[dynabook](https://dynabook.com/)でWindows 10をサポートしていないので、VMware PlayerのVM上のWindows 10にHyper-V Containersをインストールしてみる。

VMは、Windows 7に入れたVMware Workstation 11.1.0 build-2496824に付属の VMware Player 7.1.0 build-2496824で作ったもの。
VMのバージョンは11.0。
2CPUでメモリは2.5GB。
ネットワークインターフェースはNAT。
このVMを、[Hyper-Vが使えるように設定しておく](https://www.kaitoy.xyz/2016/07/31/docker-for-windows/#vmware-player%E3%81%AEvm%E3%81%A7hyper-v%E3%82%92%E4%BD%BF%E3%81%86%E3%81%9F%E3%82%81%E3%81%AE%E8%A8%AD%E5%AE%9A)。

[この記事](http://ascii.jp/elem/000/001/216/1216220/)にしたがい、Windows 10の評価版をダウンロード。
今公開されている評価版はAnniversary Update適用済みのバージョン1607で、Hyper-V Containersをサポートしている。

これをさっき作ったVMにインストール。

Windows 10を起動し、以下、[Windows Containers on Windows 10](https://msdn.microsoft.com/en-us/virtualization/windowscontainers/quick_start/quick_start_windows_10)に従って進める。

1. containers機能有効化

    [PowerShellプロンプトを管理者権限でひらき](http://www.thewindowsclub.com/how-to-open-an-elevated-powershell-prompt-in-windows-10)、以下のコマンドで`containers`機能を有効化。

    ```powershell
    Enable-WindowsOptionalFeature -Online -FeatureName containers -All
    ```

    1分程度経つと再起動を促されるので再起動。

2. Hyper-V機能有効化

    再度PowerShellプロンプトを管理者権限で開いて、以下のコマンドでHyper-Vを有効化。

    ```powershell
    Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V -All
    ```

    1分程度経つと再起動を促されるので再起動。

3. OpLocks無効化

    現在のHyper-Vコンテナは、安定性を上げるためにOpLocksという機能を無効にすべきらしい。
    再度PowerShellプロンプトを管理者権限で開いて、以下のコマンドを実行する。

    ```powershell
    Set-ItemProperty -Path 'HKLM:SOFTWARE\Microsoft\Windows NT\CurrentVersion\Virtualization\Containers' -Name VSmbDisableOplocks -Type DWord -Value 1 -Force
    ```

4. Dockerインストール

    同じPowerShellプロンプトで以下のコマンドを実行してDocker(EngineとClient)のアーカイブをダウンロード。

    ```powershell
    Invoke-WebRequest "https://master.dockerproject.org/windows/amd64/docker-1.13.0-dev.zip" -OutFile "$env:TEMP\docker-1.13.0-dev.zip" -UseBasicParsing
    ```

    ダウンロードしたアーカイブを解凍。

    ```powershell
    Expand-Archive -Path "$env:TEMP\docker-1.13.0-dev.zip" -DestinationPath $env:ProgramFiles
    ```

    ここまででDockerが`C:\Program Files\docker\`に入るので、このパスを環境変数`PATH`に追加。

    `PATH`の変更を反映させるために再度PowerShellプロンプトを管理者権限で開いて、以下のコマンドでDockerデーモンをサービスに登録。

    ```powershell
    dockerd --register-service
    ```

    Dockerサービスを起動。

    ```powershell
    Start-Service Docker
    ```

    (Dockerサービスは自動起動に設定されているので、OS再起動時は上記`Start-Service`は不要。)

    これでDockerが使えるようになった。

    ```cmd
    PS C:\Windows\system32>docker version
    Client:
     Version:      1.13.0-dev
     API version:  1.25
     Go version:   go1.7.1
     Git commit:   130db0a
     Built:        Sat Sep 10 13:25:48 2016
     OS/Arch:      windows/amd64

    Server:
     Version:      1.13.0-dev
     API version:  1.25
     Go version:   go1.7.1
     Git commit:   130db0a
     Built:        Sat Sep 10 13:25:48 2016
     OS/Arch:      windows/amd64
    ```

5. コンテナイメージダウンロード

    どうもDockerコマンドの実行には管理者権限が必要なようなので、このまま管理者権限のPowerShellプロンプトで続ける。

    `docker pull`でNano Serverのコンテナイメージをダウンロード。

    ```cmd
    PS C:\Windows\system32>docker pull microsoft/nanoserver
    ```

    `docker images`で確認。

    ```cmd
    PS C:\Windows\system32>docker images
    REPOSITORY             TAG                 IMAGE ID            CREATED             SIZE
    microsoft/nanoserver   latest              3a703c6e97a2        12 weeks ago        970 MB
    ```

    試しにコンテナ起動。

    `PS C:\Windows\system32>docker run -it microsoft/nanoserver cmd`

    起動はかなり遅い。1分近くかかった。ともあれちゃんと起動した。

    ![test_container.png](/images/pcap4j-on-hyper-v-container-on-win10/test_container.png)

# Pcap4Jコンテナのビルド
Pcap4Jコンテナを、`docker build`でビルドしてみる。
Dockerfileはとりあえず[以前のもの](https://www.kaitoy.xyz/2016/07/11/windows_containers_on_tp5/#pcap4j%E3%82%B3%E3%83%B3%E3%83%86%E3%83%8A%E3%82%A4%E3%83%A1%E3%83%BC%E3%82%B8%E3%81%AE%E3%83%93%E3%83%AB%E3%83%89)をちょっと書き変えただけのものを試す。

```dockerfile
# escape=`

#
# Dockerfile for Pcap4J on Windows Nano Server
#

FROM microsoft/nanoserver
MAINTAINER Kaito Yamada <kaitoy@pcap4j.org>

# Install Chocolatey.
RUN mkdir C:\pcap4j
WORKDIR C:\\pcap4j
ADD https://chocolatey.org/install.ps1 install.ps1
RUN powershell .\install.ps1

# Install dependencies.
RUN choco install -y nmap jdk7 && `
    choco install -y maven -version 3.2.5

# Build Pcap4J.
RUN powershell -Command Invoke-WebRequest https://github.com/kaitoy/pcap4j/archive/v1.zip -OutFile pcap4j.zip && `
    powershell -Command Expand-Archive -Path pcap4j.zip -DestinationPath .
WORKDIR pcap4j-1
RUN powershell -Command "mvn -P distribution-assembly install 2>&1 | Add-Content -Path build.log -PassThru"

# Collect libraries.
RUN mkdir bin && `
    cd pcap4j-packetfactory-static && `
    mvn -DoutputDirectory=..\bin -Dmdep.stripVersion=true -DincludeScope=compile dependency:copy-dependencies && `
    mvn -DoutputDirectory=..\bin -Dmdep.stripVersion=true -DincludeGroupIds=ch.qos.logback dependency:copy-dependencies && `
    cd ../pcap4j-distribution && `
    mvn -DoutputDirectory=..\bin -Dmdep.stripVersion=true -DincludeArtifactIds=pcap4j-packetfactory-static,pcap4j-sample dependency:copy-dependencies

# Generate sample script. (C:\pcap4j\pcap4j-1\bin\capture.bat)
RUN echo @echo off > bin\capture.bat && `
    echo "%JAVA_HOME%\bin\java" -cp C:\pcap4j\pcap4j-1\bin\pcap4j-core.jar;C:\pcap4j\pcap4j-1\bin\pcap4j-packetfactory-static.jar;C:\pcap4j\pcap4j-1\bin\pcap4j-sample.jar;C:\pcap4j\pcap4j-1\bin\jna.jar;C:\pcap4j\pcap4j-1\bin\slf4j-api.jar;C:\pcap4j\pcap4j-1\bin\logback-classic.jar;C:\pcap4j\pcap4j-1\bin\logback-core.jar org.pcap4j.sample.GetNextPacketEx >> bin\capture.bat
```

[escapeディレクティブ](https://docs.docker.com/engine/reference/builder/#/escape)が使えるようになっていたので使うようにしている。
(というか以前Windows Server 2016 TP5で試した時はescapeディレクティブをDockerfileの先頭に書かなかったのがだめだったってだけかもしれない。)
`WORKDIR`のパスの区切りにはescapeディレクティブは利かない変な仕様。

## Nano ServerでSystem.Net.WebClient使えない問題
このDockerfileでビルドしたら、[Chocolatey](https://chocolatey.org/)のダウンロード・インストールスクリプトを実行する`RUN powershell .\install.ps1`のステップで`System.Net.WebClient`が見つからないというエラー。

```plain
new-object : Cannot find type [System.Net.WebClient]: verify that the assembly
containing this type is loaded.
At C:\pcap4j\install.ps1:84 char:17
+   $downloader = new-object System.Net.WebClient
+                 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidType: (:) [New-Object], PSArgumentExcepti
   on
    + FullyQualifiedErrorId : TypeNotFound,Microsoft.PowerShell.Commands.NewOb
   jectCommand
```

Nano Serverに入っているPowerShellは[Core Editionなる機能限定版](https://technet.microsoft.com/en-us/windows-server-docs/compute/nano-server/powershell-on-nano-server)で、System.Net.WebClientだけでなく、[WebアクセスのためのAPIがいろいろ欠けているもよう](http://serverfault.com/questions/788949/download-a-file-with-powershell-on-nano-server)。

## Hyper-V ContainersでServer Core使えない問題
Nano Serverめんどくさそうなので、Server Coreをpullする。

```cmd
PS C:\Windows\system32>docker pull microsoft/windowsservercore
```

Dockerfileの`FROM`を`microsoft/windowsservercore`に書き変えてビルドしたら、最初の`RUN`で以下のエラー。

```plain
container 4bc8d8d38993426fa7a3c76e4aabbe6a229cbd025754723ff396aec04ffbfa1d encountered an error during Start failed in Win32: The operating system of the container does not match the operating system of the host. (0xc0370101)
```

調べたら、Hyper-V Containersはまだ[Nano Serverしかサポートしていない](https://social.msdn.microsoft.com/Forums/en-US/9eea93ac-18de-4953-bc7c-efd76a155526/are-microsoftwindowsservercore-containers-working-on-windows-10?forum=windowscontainers)ようだ。

## unzip難しい問題
Chocolateyのダウンロード・インストールスクリプトを実行するのはあきらめて、[アーカイブを自分でダウンロードする方法](https://chocolatey.org/install#download-powershell-method)を試す。

これは`https://chocolatey.org/api/v2/package/chocolatey/`というWeb APIをたたいてアーカイブをダウンロードする方法だけど、このURLを`ADD`に渡してもうまくいかなかったので、このWeb APIが最終的に呼ぶ`https://packages.chocolatey.org/chocolatey.0.10.0.nupkg`を`ADD`するようにした。
これでダウンロードできる`chocolatey.0.10.0.nupkg`はzipファイルで、unzipするとインストールスクリプトが出てくる。

しかしこのunzipが曲者で、[妙に苦労した話](https://www.kaitoy.xyz/2016/09/12/unzip-on-nanoserver/)を最近書いた。

で、苦労して取り出したインストールスクリプトを実行したら、エラーがわんさと出ただけだった。
そんなこったろうと思ってはいたが。

どうせChocolateyをインストールできても、パッケージのインストールスクリプトがまた動かないんだろうから、もうChocolateyはあきらめる。

## WoW64サポートしてない問題
Chocolateyを使わないようにDockerfileの前半を以下の様に書き変えた。

```dockerfile
(snip)

FROM michaeltlombardi/nanoserveropenjdk
MAINTAINER Kaito Yamada <kaitoy@pcap4j.org>

RUN mkdir C:\pcap4j
WORKDIR C:\\pcap4j

# Install Maven
ADD http://archive.apache.org/dist/maven/maven-3/3.3.9/binaries/apache-maven-3.3.9-bin.zip maven.zip
RUN jar xf maven.zip
RUN powershell -command $env:path += ';C:\pcap4j\apache-maven-3.3.9\bin'; setx PATH $env:path /M

# Install Npcap
ADD https://github.com/nmap/npcap/releases/download/v0.08-r7/npcap-0.08-r7.exe npcap.exe
RUN npcap.exe /S

# Build Pcap4J.

(snip)
```

(因みにこの時点で、`PATH`を設定するのに`GetEnvironmentVariable`と`SetEnvironmentVariable`がうまく使えない問題を乗り越えている。`Cannot find an overload for "GetEnvironmentVariable" and the argument count: "2".`というエラーが出て、PowerShell Desktop Editionのものと仕様がちょっと違うようだったので、`GetEnvironmentVariable`も`SetEnvironmentVariable`も使わないようにした。)

このDockerfileでビルドしたら、`RUN npcap.exe /S`で以下のエラー。

```plain
The subsystem needed to support the image type is not present.
```

このsubsystemというのはどうも[WoW64](https://ja.wikipedia.org/wiki/WOW64)を指しているようで、[Nano ServerがWoW64をサポートしていない](https://blogs.technet.microsoft.com/windowsserver/2016/02/10/exploring-nano-server-for-windows-server-2016/)のにnpcap.exeが32bitバイナリであることが問題のようであった。

ついでに[MSI](https://ja.wikipedia.org/wiki/Microsoft_Windows_Installer)もサポートされていないことがわかった。大丈夫かこれ。

## Nano Serverパッケージプロバイダバグってる問題
[Nano Serverにもロールや機能の追加ができる](https://technet.microsoft.com/en-us/windows-server-docs/compute/nano-server/getting-started-with-nano-server#a-namebkmkonlineainstalling-roles-and-features-online)らしいので、ひょっとしてこれで何か改善できないかと思って試した。

Nano Serverへのロール・機能の追加は、Windowsのパッケージマネジメントシステムである[PackageManagement (a.k.a. OneGet)](https://github.com/OneGet/oneget)を使ってやる。PowerShellで`Install-PackageProvider NanoServerPackage`と`Import-PackageProvider NanoServerPackage`を実行するとNano Serverのパッケージプロバイダが使えるようになり、`Find-NanoServerPackage`で利用できるパッケージの一覧が見れる。

はずなんだけど、`Find-NanoServerPackage`でエラー。

```cmd
C:\pcap4j>powershell -command Find-NanoServerPackage
DownloadFile : Save-HTTPItem: Bits Transfer failed. Job State:  ExitCode = 255
At C:\Program Files\WindowsPowerShell\Modules\NanoServerPackage\0.1.1.0\NanoServerPackage.psm1:1294 char:9
+         DownloadFile -downloadURL $fullUrl `
+         ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (https://nanoser...ServerIndex.txt:String) [DownloadFile], RuntimeException
    + FullyQualifiedErrorId : FailedToDownload,DownloadFile

Get-Content : Cannot find drive. A drive with the name 'CleanUp' does not exist.
At C:\Program Files\WindowsPowerShell\Modules\NanoServerPackage\0.1.1.0\NanoServerPackage.psm1:674 char:26
+     $searchFileContent = Get-Content $searchFile
+                          ~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : ObjectNotFound: (CleanUp:String) [Get-Content], DriveNotFoundException
    + FullyQualifiedErrorId : DriveNotFound,Microsoft.PowerShell.Commands.GetContentCommand

Get-Content : Cannot find path
'C:\Users\ContainerAdministrator\AppData\Local\NanoServerPackageProvider\searchNanoPackageIndex.txt' because it does not exist.
At C:\Program Files\WindowsPowerShell\Modules\NanoServerPackage\0.1.1.0\NanoServerPackage.psm1:674 char:26
+     $searchFileContent = Get-Content $searchFile
+                          ~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : ObjectNotFound: (C:\Users\Contai...ackageIndex.txt:String) [Get-Content], ItemNotFoundException
    + FullyQualifiedErrorId : PathNotFound,Microsoft.PowerShell.Commands.GetContentCommand
```

[NanoServerPackageのIssues](https://github.com/OneGet/NanoServerPackage/issues/4)にこのエラーが登録されていた。1か月放置されてる。

<br>

パトラッシュ、僕はもう疲れたよ。
