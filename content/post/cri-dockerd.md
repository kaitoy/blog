+++
categories = ["Programming"]
title = "Kubernetesでdockershimが廃止されても、KubernetesでDockerが使えなくなるわけじゃないよ"
date = "2020-12-06T17:11:46+09:00"
tags = ["kubernetes"]
draft = false
cover = "kubernetes.png"
slug = "cri-dockerd"
highlight = true
highlightStyle = "monokai"
highlightLanguages = []
+++

最近世界中で騒ぎになっている通り、Kubernetes 1.20でDockerが非推奨になり、近いうちにdockershimが廃止されるんだけど、dockershimの後継としてcri-dockerdというのが開発されてるので、KubernetesでDockerが使えなくなるわけではなさそうという話し。

<!--more-->

{{< google-adsense >}}

# KubernetesでDockerが非推奨になるとは
2020/12/1にRC初版がリリースされた[Kubernetes 1.20のCHANGELOG](https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.20.md#deprecation)に、Dockerのサポートがdeprecatedになったというのが書いてある。
正確には、kubeletに組み込まれた[dockershim](https://www.kaitoy.xyz/2019/06/15/k8s-ecosystem-container-runtimes/#cri)の使用が非推奨になって、将来のリリースでdockershimが削除される、というアナウンスだ。

# dockershimとは
kubeletはコンテナランタイムに指示してコンテナを起動したりするわけだけど、コンテナランタイムと話すためのインターフェースはCRIと呼ばれていて、dockershimはそのCRIの最初の実装。
当時コンテナランタイムとしてほぼ無二の存在だったDockerがCRIを実装していなかったので、kubeletが話すCRIとDockerのAPIを取り持つサービスとしてdockershimは作られた。

図にすると以下のような感じ。

<img src="/images/k8s-ecosystem-container-runtimes/cr4.png" alt="cr4.png" style="padding: 0 15%;">

kubeletとdockershimは`/var/run/dockershim.sock`というソケットファイルで通信するんだけど、dockershimはkubeletプロセス内で動いているので、結局`/var/run/dockershim.sock`を読むのも書くのもkubelet、というちょっと歪な構造。

また、上の図で、[containerd](https://containerd.io/)というのがDocker(dockerd)の下で動いているんだけど、これが実はCRIを実装している。

誰が見ても、kubeletから直接containerdにCRIで話せばいいんじゃないの?
と思うはず。
KubernetesからDockerのサポートが落ちるのは自然な流れなんじゃなかろうか。

# dockershimの後継、cri-dockerd
しかし、Dockerが非推奨になるというアナウンスはぱっと見かなりインパクトがあって、[Dockerすぐ死んでしまうん?みたいな世間の誤解](https://blog.inductor.me/entry/2020/12/03/061329)もあって大騒ぎになってしまった。

で、Docker陣営側からそれを鎮めるため、2020/12/4に[dockershimの後継を開発中だから安心しろ](https://www.docker.com/blog/what-developers-need-to-know-about-docker-docker-engine-and-kubernetes-v1-20/)というアナウンスがでた。
その後継というのがcri-dockerdというやつで、今はプロトタイプ版が[@dims](https://twitter.com/dims)氏の[リポジトリ](https://github.com/dims/cri-dockerd)で開発されてて、その内[Mirantis社のリポジトリ](https://github.com/Mirantis/cri-dockerd)でDocker社とともに開発されることになっている。

cri-dockerdはまだリリースバイナリがなくて、ドキュメントも何もないけど、適当にビルドして動かしたら動いたのでメモを残しておく。

# cri-dockerdを試す
試すKubernetesクラスタはいつもの通り、VirtualBoxのVMにOracle Linux 7を入れて[自前のPlaybook](https://github.com/kaitoy/ansible-k8s)で構築したシングルノードクラスタ。
Kubernetesのバージョンは1.19.2。
実はすでに脱Dockerしてcontainerdしか動いてなかったんだけど、Dockerを入れてkubeletとつなげておいた。

cri-dockerdはまだリリースバイナリがないので自分でビルドする必要がある。
Mirantis社のリポジトリは2020/12/6現時点で空なので@dims氏のリポジトリを使う。
リポジトリをクローンして`go build`したら簡単にビルドできた。

```console
[root]# git clone https://github.com/dims/cri-dockerd.git
[root]# cd cri-dockerd
[root]# GO111MODULE=on go build -o /usr/local/bin/cri-dockerd
```

<br>

出来たバイナリでcri-dockerdのhelpを見てみると、デフォルトではdockershimと同様に`/var/run/dockershim.sock`でCRIを聞いてくれるっぽい。

```console
[root]# cri-dockerd -h
CRI that connects to Docker Daemon

Usage:
  DockerCRI [flags]

Flags:
      --alsologtostderr                         log to standard error as well as files
      --cni-bin-dir string                      <Warning: Alpha feature> A comma-separated list of full paths of directories in which to search for CNI plugin binaries.
      --cni-cache-dir string                    <Warning: Alpha feature> The full path of the directory in which CNI should store cache files.
      --cni-conf-dir string                     <Warning: Alpha feature> The full path of the directory in which to search for CNI config files
      --container-runtime-endpoint string       The endpoint of remote runtime service. Currently unix socket and tcp endpoints are supported on Linux, while npipe and tcp endpoints are supported on windows.  Examples:'unix:///var/run/dockershim.sock', 'npipe:////./pipe/dockershim' (default "unix:///var/run/dockershim.sock")
      --docker-endpoint string                  Use this for the docker endpoint to communicate with. (default "unix:///var/run/docker.sock")
      --dockershim-root-directory string        Path to the dockershim root directory. (default "/var/lib/dockershim")
  -h, --help                                    help for DockerCRI
      --image-pull-progress-deadline duration   If no pulling progress is made before this deadline, the image pulling will be cancelled. (default 1m0s)
      --log-backtrace-at traceLocation          when logging hits line file:N, emit a stack trace (default :0)
      --log-dir string                          If non-empty, write log files in this directory
      --log-file string                         If non-empty, use this log file
      --log-flush-frequency duration            Maximum number of seconds between log flushes (default 5s)
      --logtostderr                             log to standard error instead of files (default true)
      --network-plugin string                   <Warning: Alpha feature> The name of the network plugin to be invoked for various events in kubelet/pod lifecycle.
      --network-plugin-mtu int32                <Warning: Alpha feature> The MTU to be passed to the network plugin, to override the default. Set to 0 to use the default 1460 MTU.
      --pod-cidr string                         The CIDR to use for pod IP addresses, only used in standalone mode.  In cluster mode, this is obtained from the master. For IPv6, the maximum number of IP's allocated is 65536
      --pod-infra-container-image string        The image whose network/ipc namespaces containers in each pod will use (default "k8s.gcr.io/pause:3.1")
      --runtime-cgroups string                  Optional absolute name of cgroups to create and run the runtime in.
      --stderrthreshold severity                logs at or above this threshold go to stderr (default 2)
  -v, --v Level                                 number for the log level verbosity
      --version version[=true]                  Print version information and quit
      --vmodule moduleSpec                      comma-separated list of pattern=N settings for file-filtered logging
```

CRIを聞くソケットファイルのパスは`--container-runtime-endpoint`で変更可能なようなので、今回はdockershimのと紛らわしくならないように、`/var/run/hoge.sock`にすることにする。

<br>

cri-dockerdのバイナリは、今回はsystemdでデーモンとして起動する。(コンテナで動かしてもいいはず。)
ユニットファイルは以下。
見ての通り、`--container-runtime-endpoint`をつけて実行するだけ。

`/etc/systemd/system/cri-dockerd.service`:
```
[Unit]
Description=cri-dockerd
After=docker.service

[Service]
User=root
Group=root
ExecStart=/usr/local/bin/cri-dockerd --container-runtime-endpoint /var/run/hoge.sock
Restart=always
RestartSec=10s
KillMode=process

[Install]
WantedBy=multi-user.target
```

あとは`systemctl enable cri-dockerd && systemctl start cri-dockerd`すればcri-dockerdが起動する。

<br>

起動させたcri-dockerdとつなげるため、kubeletのユニットファイルを以下のように変更して、組み込みのdockershimの代わりに`/var/run/hoge.sock`と話すようにしてやる。

`/etc/systemd/system/kubelet.service`:
```diff
 [Unit]
 Description=Kubernetes Kubelet
 Documentation=https://github.com/kubernetes/kubernetes
-After=docker.service
-Requires=docker.service
+After=cri-dockerd.service
+Requires=cri-dockerd.service

 [Service]
 CPUAccounting=true
 MemoryAccounting=true
 User=root
 Group=root
 ExecStart=/usr/bin/kubelet \
   --bootstrap-kubeconfig=/etc/kubernetes/bootstrap.kubeconfig \
   --cert-dir=/etc/kubernetes/pki \
   --config=/etc/kubernetes/kubelet.conf \
   --cni-bin-dir=/opt/cni/bin \
   --cni-conf-dir=/etc/cni/net.d \
   --kubeconfig=/etc/kubernetes/kubelet.kubeconfig \
   --network-plugin=cni \
   --pod-infra-container-image=k8s.gcr.io/pause-amd64:3.1 \
   --v=1 \
+  --container-runtime=remote \
+  --container-runtime-endpoint=unix:///var/run/hoge.sock \
   --root-dir=/var/lib/kubelet
 Restart=always
 RestartSec=10s
 KillMode=process

 [Install]
 WantedBy=multi-user.target
```

あとは`systemctl daemon-reload && systemctl restart kubelet`でkubeletを再起動すれば設定完了。

<br>

`/var/run/dockershim.sock`がなくても、

```console
[root]# ls /var/run/*.sock
/var/run/docker.sock  /var/run/hoge.sock
```

Podは元気に動いてるし、

```console
[root]# kubectl get po -n kube-system
NAME                       READY   STATUS    RESTARTS   AGE
coredns-6b5cbb9f46-v8p9q   1/1     Running   0          2m38s
coredns-6b5cbb9f46-xknw6   1/1     Running   1          7h54m
weave-net-zprrm            2/2     Running   3          72d
```

Podの再起動もできる。

```console
[root]# kubectl delete po -n kube-system coredns-6b5cbb9f46-xknw6
pod "coredns-6b5cbb9f46-xknw6" deleted
[root]# kubectl get po -n kube-system
NAME                       READY   STATUS    RESTARTS   AGE
coredns-6b5cbb9f46-85zjs   1/1     Running   0          4s
coredns-6b5cbb9f46-v8p9q   1/1     Running   0          3m33s
weave-net-zprrm            2/2     Running   3          72d
```

<br>

これでdockershimが無くてもKubernetesでDockerが使えることが確認できた。
一安心。

まあDocker使わないんだけど。
