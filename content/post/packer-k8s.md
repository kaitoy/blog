+++
categories = ["Programing"]
date = "2018-06-17T23:22:33+09:00"
draft = false
eyecatch = "kubernetes-ansible-packer.png"
slug = "packer-k8s"
tags = ["kubernetes", "docker", "ansible", "packer", "msys2"]
title = "Packer + Ansible on Windows 10でKubernetes 1.10のクラスタ on VirtualBoxを全自動構築"
+++

「[Kubernetes 1.10のクラスタを全手動で構築するのをAnsibleで全自動化した](https://www.kaitoy.xyz/2018/06/03/build-k8s-cluster-by-ansible/)」の続きで、さらに[Packer](https://www.packer.io/)を組み合わせて、VM作成まで自動化した話。

AnsibleをWindows([MSYS2](https://www.msys2.org/))で動かした話でもある。

書いたPackerテンプレートは[GitHub](https://github.com/kaitoy/packer-k8s)に置いた。

{{< google-adsense >}}

## Packerとは

Packerは、様々な種類のVMを構築できるツール。
VagrantとかTerraformとかを開発している[HashiCorp](https://www.hashicorp.com/)が開発している。

テンプレートと呼ばれるビルド定義をJSONファイルに書いて、ビルド、プロビジョニング、ポストプロセスを実行して、アーティファクトと呼ばれるビルドの成果物を生成する。

ビルドのステップでは、VMを作成して、ハードウェア構成を設定したり、OSをインストールしたりする。

以下のような環境でVMを作れる。

* VirtualBox
* Hyper-V
* VMware Workstation
* VMware vSphere Hypervisor
* Docker
* AWS EC2

<br>

プロビジョニングのステップでは、ビルドで作ったVMのOS上で指定された操作を実行し、ソフトウェアのインストールなどのセットアップ処理をする。

プロビジョニングには以下のようなツールを使える。

* Shell
* PowerShell
* Ansible
* Chef
* Puppet

プロビジョニングが終わるとアーティファクト(VMイメージファイルや、AWS EC2のAMI IDとか)が出力される。

<br>

ポストプロセスのステップでは、アーティファクトを入力として何らかの処理をして、最終的なアーティファクトを生成する。

ポストプロセスでは以下のような処理を実行できる。

* アーカイブ
* VagrantBox生成
* AWS EC2へのインポート
* Docker push

<br>

PackerはGoで書かれていてビルド済みのバイナリが配布されているので、[ダウンロードページ](https://www.packer.io/downloads.html)から落として PATHの通ったところに置くだけでインストールできる。

<br>

今回はPacker 1.2.4のWindows版をインストールした。

## Packerの[テンプレート](https://www.packer.io/docs/templates/index.html)概要

Packerのテンプレートにはビルド、プロビジョニング、ポストプロセスの定義を複数かけて、複数環境のVM生成を1ファイルで定義できる。

テンプレートには以下のプロパティを書く。

* [builders](https://www.packer.io/docs/templates/builders.html): ビルドの定義のリスト。
* `description`: テンプレートの説明。
* `min_packer_version`: Packer の最低バージョン指定。
* [post-processors](https://www.packer.io/docs/templates/post-processors.html): ポストプロセスの定義のリスト。
* [provisioners](https://www.packer.io/docs/templates/provisioners.html): プロビジョニングの定義のリスト。
* [variables](https://www.packer.io/docs/templates/user-variables.html): テンプレート内で使う変数の定義。
* `_comment`: コメントなどを書くためのプロパティ。実際はアンダースコアで始まればなんでもいい。JSON オブジェクトのルートレベルのみで使える。

これらのうち、必須なのはbuildersだけ。

<br>

一つのビルド定義には一つの[communicator](https://www.packer.io/docs/templates/communicator.html)を紐づける。
communicatorはビルド時にVMにつなぐための設定。
基本は[SSH](https://www.packer.io/docs/templates/communicator.html#ssh-communicator)だけど、WinRMとかもある。

## やりたいこと

Windows 10上でPackerとAnsibleを動かして、VirtualBoxのVMをOracle Linux 7.4で作って、Kubernetes 1.10をインストールしたい。
Windowsでやりたいのは、単にベアメタルのLinuxの環境が無いからってのもあるし、いずれHyper-VのVMも作りたいからってのもある。

PackerはGo製で普通にWindowsで動くからいいけど、問題はAnsibleがPython製のくせにWindowsのPythonでは動かないこと。
AnsibleはWSLでは動くけど、VirtualBoxとかHyper-VはWindows上で動くから、PackerはWindows上で動かさないといけないはずで、そうなるとPackerから呼ばれるAnsibleもWindows上で動かさないといけない気がする。
のでWSLではだめな気がするし、そもそも実はWindows 7でも同じことやりたいのでWSLは無し。

要はWindows上でLinuxのPythonを使ってAnsibleを動かしたい。
ならばCygwinかMSYS2+MinGW-w64かGit Bashか。

[ここ](https://superuser.com/questions/1255634/install-ansible-in-windows-using-git-bash)にAnsibleはCygwinでもGit Bashでも動かすの難しいと書いてあって、逆に[MSYS2でAnsible動かした記事](http://itsp0.blogspot.com/2017/03/ansible-msys2-ansible.html)はあったので、安直にMSYS2でやることにした。

## MSYS2インストール

MSYS2は、[公式サイト](http://www.msys2.org/)からx86_64のインストーラ(msys2-x86_64-20180531.exe)をダウンロードして実行して普通にインストールしただけ。

## Ansibleインストール

MSYS2でのパッケージ管理にはpacmanを使う。

何はともあれPythonを入れる。3系でいい。
`MSYS2 MSYS`のショートカット(`MSYS2 MinGW 64-bit`じゃだめ)からターミナルを開いて、

```sh
$ pacman -S python
```

で、Python 3.6.2が入った。

次に、Ansible(の依存)のビルドに必要なパッケージを入れる。

```sh
$ pacman -S gcc
$ pacman -S make
$ pacman -S libffi-devel
$ pacman -S openssl-devel
```

さらに、AnsibleからのSSH接続で(鍵ではなくて)パスワードを使う場合に必要なパッケージも入れる。

```sh
$ pacman -S sshpass
```

sshpassの依存としてopensshも入った。

<br>

Ansibleはpipでインストールするんだけど、pacmanで入れたPython 3にはpipが付いてなかったので、[別途入れる](https://pip.pypa.io/en/stable/installing/)。

```sh
$ curl https://bootstrap.pypa.io/get-pip.py -LO
$ python get-pip.py
```

(ちょっと古いけどpipは`pacman python3-pip`でも入る。)

<br>

で、ようやくAnsibleインストール。

```sh
$ export CFLAGS=-I/usr/lib/libffi-3.2.1/include
$ pip install ansible
```

依存するPyNaClのビルドに20分くらいかかるのでゆっくり待つと、インストール完了するはず。

今回はAnsible 2.5.4がインストールされた。

AnsibleでJinja2のipaddrフィルターを使うために、もう一つPyPiパッケージ入れる。

```sh
$ pip install netaddr
```

## Packerテンプレート作成

ビルドは、OSインストールメディアのISOファイルを使うVirtualBoxのビルダである[virtualbox-iso](https://www.packer.io/docs/builders/virtualbox-iso.html)を指定して書いた。

OSのインストールは、[Boot Command](https://www.packer.io/docs/builders/virtualbox-iso.html#boot-command)をテンプレートに書くことで、インストーラのGUIを操作してやることもできるけど、RHEL系なら[Kickstart](https://access.redhat.com/documentation/ja-jp/red_hat_enterprise_linux/7/html/installation_guide/chap-kickstart-installations)を使うのが楽。

Kickstartの定義ファイルは、普通に手動でOSをインストールした後、`/root/anaconda-ks.cfg`を採取して、必要に応じて編集して作る。
今回作ったのは[これ](https://github.com/kaitoy/packer-k8s/blob/fc530d94a04c15c97986e73d2c190e659ee0ddc0/http/ks.cfg)で、[このスレ](https://www.centos.org/forums/viewtopic.php?t=47262)を参考に、Minimalインストールから、Wifiのファームウェアとか要らないのを抜いてる。

<br>

プロビジョニングは、「[Kubernetes 1.10のクラスタを全手動で構築するのをAnsibleで全自動化した](https://www.kaitoy.xyz/2018/06/03/build-k8s-cluster-by-ansible/)」ときのPlaybookを実行するやつを[公式マニュアル](https://www.packer.io/docs/provisioners/ansible.html)見ながら適当に書いて、ポストプロセスも適当に書いて、できたのが[これ](https://github.com/kaitoy/packer-k8s/blob/fc530d94a04c15c97986e73d2c190e659ee0ddc0/k8s_single_node_cluster-vb.json)。

`ansible_env_vars`で`ANSIBLE_SSH_ARGS`に`-o ControlMaster=no`を入れているのは、[この問題](https://github.com/geerlingguy/JJG-Ansible-Windows/issues/6)に対応するため。

## ビルド実行

`MSYS2 MSYS`のショートカットからターミナルを開いて、Packerを実行してみたら以下のエラー。

```sh
$ packer build -var-file=variables.json k8s_single_node_cluster-vb.json
bash: packer: コマンドが見つかりません
```

WindowsのPathが通ったところにPackerバイナリを置いておいてもMSYS2からは見えない。
のでpackerバイナリのフルパス(今回は`C:\Users\kaitoy\Desktop\bin\`にインストールしてたのでそのパス)を指定してやる。

```
$ /c/Users/kaitoy/Desktop/bin/packer.exe build -var-file=variables.json k8s_single_node_cluster-vb.json
k8s-single-node-cluster output will be in this color.

1 error(s) occurred:

* Error running "ansible-playbook --version": exec: "ansible-playbook": executable file not found in %PATH%
```

と、今度は、ansible-playbookが無いと言われる。
ansible-playbookはansibleパッケージに入っていて/usr/bin/にインストールされているんだけど、Windows界で動いているPackerからはLinuxのPATHが見えないので、見つけられない。

さらに、AnsibleのPlaybookのパスなど、Packerが妙な気を利かせてWindowsのフルパスにしてansible-playbookに渡してくれちゃうので、それをLinuxなパスに変換してやる必要がある。

ということで、以下のようなラッパスクリプトを書いて、カレントディレクトリに置くことにした。

```bat
@echo off
setlocal enabledelayedexpansion

for %%f in (%*) do (
  if !key_file! == 1 (
    rem The value of ansible_ssh_private_key_file is the path to
    rem a key file in Windows TMP directory from MSYS2 point of view.
    set arg=/%tmp:\=/%
    set arg=!arg::=!
    set args=!args!=!arg!/%%~nxf
    set key_file=0
  ) else if %%~xf == .yml (
    rem Convert the passed Playbook path to relative one.
    set arg=%%f
    set arg=!arg:%CD%=!
    set arg=!arg:\=/!
    set args=!args! !arg:~1!
  ) else (
    rem Add other args as they are
    set args=!args! %%f
  )
  if %%f == ansible_ssh_private_key_file (
    rem The next arg will be the value of ansible_ssh_private_key_file
    set key_file=1
  )
)

echo args: %args%
C:\msys64\usr\bin\python C:\msys64\usr\bin\ansible-playbook -v %args%
```

<br>

以上でちゃんと実行できるようになった。

まとめると、

1. Windows 10に、
2. VirtualBox 5.1.28をインストールして、
2. Packer 1.2.4のWindows版をインストールして、
3. MSYS2をインストールして、
4. `MSYS2 MSYS`のターミナルでPython 3.6.2とAnsible 2.5.4とか(とGit)をインストールして、
5. 以下を実行すればいい。

    ```sh
    $ git clone --recursive https://github.com/kaitoy/packer-k8s.git
    $ cd packer-k8s
    $ /c/Users/kaitoy/Desktop/bin/packer.exe build -var-file=variables.json k8s_single_node_cluster-vb.json
    ```

`packer.exe build`に`-debug`を渡すと、内部の処理ステップごとに停止するようになり、デバッグしやすい。

<br>

一回実行したらゴミができて、次回実行時にエラーになるので、以下でクリーンアップする必要がある。

```sh
$ rm -rf /tmp/ansible
$ rm -f ~/.ssh/known_hosts
```

因みに、上記known_hostsを消し忘れると以下のようなエラーになる。

```
 k8s-single-node-cluster: fatal: [k8s_master]: UNREACHABLE! => {"changed": false, "msg": "Failed to connect to the host via ssh: @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@\r\n@    WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED!     @\r\n@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@\r\nIT IS POSSIBLE THAT SOMEONE IS DOING SOMETHING NASTY!\r\nSomeone could be eavesdropping on you right now (man-in-the-middle attack)!\r\nIt is also possible that a host key has just been changed.\r\nThe fingerprint for the ECDSA key sent by the remote host is\nSHA256:JNs/ZY38VpIuBE3QEzLHyLFGYe+Qg+bEWi8BOzgSNc0.\r\nPlease contact your system administrator.\r\nAdd correct host key in /home/kaitoy/.ssh/known_hosts to get rid of this message.\r\nOffending ECDSA key in /home/kaitoy/.ssh/known_hosts:1\r\nPassword authentication is disabled to avoid man-in-the-middle attacks.\r\nKeyboard-interactive authentication is disabled to avoid man-in-the-middle attacks.\r\nroot@127.0.0.1: Permission denied (publickey,gssapi-keyex,gssapi-with-mic,password).\r\n", "unreachable": true}
```
