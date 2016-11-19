+++
categories = [ "Container" ]
date = "2016-07-31T14:34:16-06:00"
draft = false
eyecatch = "docker.png"
slug = "docker-for-windows"
tags = [ "docker", " windows" ]
title = "Docker for Windowsがコレジャナかった"

+++

7/28にDocker for Winodws(とDocker for Mac)の正式版リリースの[アナウンス](https://blog.docker.com/2016/07/docker-for-mac-and-windows-production-ready/)があったので試してみたけど、期待していたものと違ったしなんだか上手く動かなかった話。

## Docker for Windowsとは
[Docker for Windows](https://docs.docker.com/docker-for-windows/)は[Docker Toolbox](https://www.docker.com/products/docker-toolbox)の後継製品。(多分。)

Docker ToolboxはWindowsやMacでDockerを使うための製品で、以下のコンポーネントからなる。

* [Docker Engine](https://www.docker.com/products/docker-engine)

    コンテナランタイム。

* [Docker Compose](https://docs.docker.com/compose/)

    複数のコンテナを組み合わせたアプリケーション/サービスの構築/管理ツール。

* [Docker Machine](https://docs.docker.com/machine/)

    Docker仮想ホストのプロビジョニング/管理ツール。

* [Kitematic](https://kitematic.com/)

    Dockerコンテナを管理するGUIを提供する製品。
    Docker Machineと連携してローカルマシンへのDocker仮想ホストのプロビジョニングもしてくれる。

Docker Toolboxを使うと、[VirtualBox](https://ja.wikipedia.org/wiki/VirtualBox)のLinux VMをWindows/Mac上にプロビジョニングして、そのVMにDockerをインストールして、Windows/Macから利用できる。

Docker for Windowsもだいたい同じで、Docker EngineとDocker ComposeとDocker MachineをWinodwsで利用するための製品。
[Electron](http://electron.atom.io/)ベースでOracleのVirtualBox依存なKitematicの代わりに、ネイティブなインストーラがWindows内蔵の[Hyper-V](https://ja.wikipedia.org/wiki/Hyper-V)を使ってDockerをセットアップしてくれる。
Hyper-Vを使うため、VirtualBoxより速くて高信頼らしい。
KitematicはDocker for Windowsには付属しないが、別途ダウンロードすればコンテナ管理に使える。Docker for WindowsとDocker Toolboxとは共存はできない。

私は勝手にDocker for Windowsは[Hyper-V Containers](https://tbd.kaitoy.xyz/2016/01/22/pcap4j-meets-windows-containers/#windows-containersとは)のデスクトップOS版のようなものかと勘違いしていて、Windowsのコンテナが使えるようになったのかと期待したが違った。
Docker for Windowsは単にDocker ToolboxのVirtualBoxがHyper-Vになっただけのもので、結局Linux VMの中でDockerを使うだけのものだということにセットアップ中に気付いた。

コレジャナイ感がすごかった。

ともあれ、やった作業を以下に記す。

## Docker for Windows on VMware Player
現時点ではDocker for WindowsはホストとしてWindows 10 x64 Pro/Enterprise/Education (Version 1511 Build 10586 以降)しかサポートしていない。
自前のPCが5年前に買った[dynabook](https://dynabook.com/)でWindows 10をサポートしていないので、VMware PlayerのVM上のWindows 10にDocker for Windowsをインストールしてみる。

#### VMware PlayerのVMでHyper-Vを使うための設定
VMware PlayerのVMでは通常Hyper-Vは使えないので、[How to Install Hyper-V on vmware Workstation 10 ?](http://social.technet.microsoft.com/wiki/contents/articles/22283.how-to-install-hyper-v-on-vmware-workstation-10.aspx)を参考にしてVMの設定をいじる。
この記事はVMware Workstationについてのものだが、VMware Playerでも全く同じ方法でいける。

いじるのは、dynabookのWindows 7に入れたVMware Workstation 11.1.0 build-2496824に付属の
VMware Player 7.1.0 build-2496824で作ったWindows 10 Pro x64 (Version 1511 Build 10586.494)のVM。
VMのバージョンは11.0。2CPUでメモリは2GB。ネットワークインターフェースはNAT。

このVMの.vmxファイルをテキストエディタで開いて以下を追記。意味は不明。

```
hypervisor.cpuid.v0 = "FALSE"
mce.enable = "TRUE"
vhu.enable = "TRUE"
```

次いで、VMware PlayerのGUIからVMのCPU設定を開き、`Intel VT-x/EPTまたはAMD-V/RVIを仮想化`と`CPUパフォーマンスカウンタを仮想化`にチェックを付ける。意味はなんとなくしかわからない。

![vm.jpg](/images/docker-for-windows/vm.jpg)

<br>

これだけ。

Hyper-VはDocker for Windowsのインストーラが有効化してくれるのでここでは何もしなくていい。

#### Docker for Windowsインストール
VMを起動して、[Getting Started with Docker for Windows](https://docs.docker.com/docker-for-windows/)に従ってDocker for Windowsをインストールする。

まず、[上記サイト内のリンク](https://download.docker.com/win/stable/InstallDocker.msi)からインストーラをダウンロード。stableの方。

ダウンロードした`InstallDocker.msi`をVM上で実行してウィザードに従えばインストール完了。
ウィザードの最後で`Launch Docker`にチェックが付いた状態で`Finish`するとDockerを起動してくれる。
この起動中にHyper-Vを有効化してくれる。(OS再起動有り。)

![hyper-v.jpg](/images/docker-for-windows/hyper-v.jpg)

<br>

OS再起動後、「Failed to create Switch "DockerNAT": Hyper-V was unable to find a virtual switch with name "DockerNAT"」というエラー出た。`DockerNAT`が見つからない?

![error.jpg](/images/docker-for-windows/error.jpg)

`DockerNAT`はDocker for Windowsがインストール中に作るHyper-Vの仮想スイッチ。

以前に`hosts`に変なエントリを書いてしまっていたのでそれを一応消して、VMware PlayerのVMのアダプタの設定もちょっといじってしまっていたので一応もとにもどして、再度Docker for Windowsをクリーンインストールしたら上記エラーは出なくなった。
なんだったんだろう。

<br>

Dockerの起動中に今度はメモリ系のエラー: 「Failed to create VM "MobyLinuxVM": Failed to modify device 'Memory'」。

![error2.jpg](/images/docker-for-windows/error2.jpg)

`MobyLinuxVM`はDockerを動かすHyper-V VMの名前。このVMに割り当てるメモリはホストOSのメモリ量から決められるようで、これが少なすぎるとダメな模様。

VMware PlayerのVMのメモリを2Gから3.3Gに増やしたらこのエラーもなくなったけど、今度はIPアドレスのエラー: 「Failed to start VM "MobyLinuxVM": The VM couldn't get an IP address after 60 tries」。

![error3.jpg](/images/docker-for-windows/error3.jpg)

フォーラムを見たら
[このエラーが載っていた](https://forums.docker.com/t/vm-mobylinuxvm-the-vm-couldnt-get-an-ip-address-after-60-tries/8505/11)。そこには以下の様な解決方法が挙がっていた。

* Docker for Windowsをクリーンインストールしなおす。
* `vEthernet (DockerNAT)`のアダプタのオプションでIPv6を無効にする。
* タスクトレイの鯨アイコンから開けるDockerのSettingsで`Reset to factory defaults...`を実行。

    ![docker_settings.jpg](/images/docker-for-windows/docker_settings.jpg)

<br>

どれもだめだった。

`MobyLinuxVM`がちゃんと起動しなくて、Dockerデーモンに接続できない。

```cmd
C:\Windows\System32>docker version
Client:
 Version:      1.12.0
 API version:  1.24
 Go version:   go1.6.3
 Git commit:   8eab29e
 Built:        Thu Jul 28 21:15:28 2016
 OS/Arch:      windows/amd64
An error occurred trying to connect: Get http://%2F%2F.%2Fpipe%2Fdocker_engine/v1.24/version: open //./pipe/docker_engine: The system cannot find the file specified.
```

因みにちゃんと起動すると以下の感じになるらしい。

```cmd
PS C:\Users\samstevens> docker version
Client:
Version:      1.12.0-rc2
API version:  1.24
Go version:   go1.6.2
Git commit:   906eacd
Built:        Fri Jun 17 20:35:33 2016
OS/Arch:      windows/amd64
Experimental: true

Server:
Version:      1.12.0-rc2
API version:  1.24
Go version:   go1.6.2
Git commit:   a7119de
Built:        Fri Jun 17 22:09:20 2016
OS/Arch:      linux/amd64
Experimental: true
```

<br>

もうあきらめる。
どうせWindowsコンテナが使えないならあまり面白くないし。
