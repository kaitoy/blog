+++
categories = ["Programing"]
date = "2018-06-30T16:56:34+09:00"
draft = false
cover = "packer-esxi.png"
slug = "packer-esxi"
tags = ["packer", "esxi"]
title = "PackerでESXiにVMを自動構築"
+++

前回「[Packer + Ansible on Windows 10でKubernetes 1.10のクラスタ on VirtualBoxを全自動構築](https://www.kaitoy.xyz/2018/06/17/packer-k8s/)」で、やったことをESXiでやっただけ。

書いたコードは[GitHub](https://github.com/kaitoy/packer-k8s)に置いてある。

{{< google-adsense >}}

# 前回との違い

VirtualBoxとESXiとで変えないといけない部分は、主にPackerのbuilderの定義。
前回はvirtualbox-isoだったけど、今回は[vmware-iso](https://www.packer.io/docs/builders/vmware-iso.html)を使う。
それに伴ってパラメータが結構違ってくる。

いっこトリッキーだったのが、`cdrom_adapter_type`に`ide`を明示的に指定しておかないと、CDロムドライブがSCSIになって、OSのインストールメディアのマウントか読み取り辺りでエラーになってしまったところ。
環境によっては指定しないでいいかも。

また、`"vnc_disable_password": "true"`をbuilderに指定しておかないと、Packerが「Error handshaking with VNC: no suitable auth schemes found. server supported: []byte{0x1}」という[エラーを出す](https://github.com/hashicorp/packer/issues/5939)。

あとは、Nested Virtualizationでやった(下記)ので、すごく遅くて、色々タイムアウトを伸ばしたりしてやる必要があった。

# ESXi環境

ESXi(というかVMware vSphere Hypervisor)は、現時点での最新の6.7を使用。
自前のWindows 10 HomeのノートPC上で動くVMware Player 12で作ったVMにESXiをインストールして環境を作った。

(因みにVirtualBoxにもインストールしてみたESXi上ではVM作成できなかった。VirtualBoxは今の時点でNested Virtualization未サポートで、サポートする予定もない模様。)

Packerから操作するには、以下の設定をする必要がある。

* 静的IPアドレスを設定。Packerからの接続先に指定するので。
* SSH有効化。PackerがSSHで接続するので。
    * 因みにSSHクライアントでESXiにつなぐときは、チャレンジ/レスポンス認証になる。
* [GuestIPHack の有効化](https://www.packer.io/docs/builders/vmware-iso.html#building-on-a-remote-vsphere-hypervisor)
    * ESXiにSSHでログインして「`esxcli system settings advanced set -o /Net/GuestIPHack -i 1`」
* ファイアウォール設定でVNCポート(TCP5900番台)を開ける。
    これをしないとPackerが「Starting HTTP server on port xxxx」でハングする。
    けどこれが一筋縄ではいかない。[この記事](https://kb.vmware.com/s/article/2008226?lang=ja)にあるように、`/etc/vmware/firewall/service.xml`に設定を追加して「`esxcli network firewall refresh`」してもいいんだけど、再起動するともとに戻ってしまう。

    ので、[この記事](https://kb.vmware.com/s/article/2043564)などを参考に、

    1. VNCポートの設定ファイルをデータストアに作成。

        `/vmfs/volumes/datastore1/svc/packer.xml`:

        ```xml
        <ConfigRoot>
          <service id="1000">
            <id>packer-vnc</id>
            <rule id="0000">
              <direction>inbound</direction>
              <protocol>tcp</protocol>
              <porttype>dst</porttype>
              <port>
                <begin>5900</begin>
                <end>6000</end>
              </port>
            </rule>
            <enabled>true</enabled>
            <required>true</required>
          </service>
        </ConfigRoot>
        ```

    2. 設定ファイルをESXi起動時に読み込むスクリプトを記述。

        `/etc/rc.local.d/local.sh`に以下を追記:

        ```sh
        cp /vmfs/volumes/datastore1/svc/packer.xml /etc/vmware/firewall/
        esxcli network firewall refresh
        ```

# Packer実行

設定ファイルが出来てESXi環境が用意できれば、Packer実行は前回と一緒。

ただ結局、環境が激遅なせいでところどころでタイムアウトしたり、OSインストール中にランダムにパニックになったり、PackerのBoot Commandの入力がランダムに失敗したりして、最後までビルド成功させる前に心折れた。
まあAnsibleのプロビジョニングの途中までは動いたので、だいたいよしとする。
