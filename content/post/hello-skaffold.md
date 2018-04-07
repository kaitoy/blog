+++
categories = ["Programing"]
date = "2018-04-01T09:59:43+09:00"
draft = false
eyecatch = "kubernetes.png"
slug = "hello-skaffold"
tags = ["docker", "kubernetes", "skaffold", "minikube"]
title = "Skaffoldを触ってみた"

+++

[Skaffold](https://github.com/GoogleCloudPlatform/skaffold#run-a-deployment-pipeline-once)を試してみた話。

{{< google-adsense >}}

## Skaffoldとは

Googleが開発している、Kubernetesアプリケーションを快適に開発するためのツール。
アプリケーションのソースを監視し、変更が入ると、自動的にコンテナイメージをビルドしてKubernetesクラスタにデプロイしてくれる。

2018/3/16に[発表](https://cloudplatform.googleblog.com/2018/03/introducing-Skaffold-Easy-and-repeatable-Kubernetes-development.html)された新しいツールで、触った感じではまだこれからといった感じだった。

Goで書かれていて、Linux、OS X、Windows用のバイナリが提供されている。

似たツールにはMicrosoftの[Draft](https://draft.sh/)がある。

また、Gitのコミットを自動デプロイしてくれるものに、[Gitkube](https://gitkube.sh/)、[Jenkins X (エックス)](http://jenkins-x.io/)がある。

## Windows版を試す

自PCがWindowsなのでWindows版を試す。
会社で使ってるのもWindowsだし。

Skaffoldを使うには、Skaffoldの実行バイナリ、Kubernetesクラスタ、そのクラスタをコンテクストに設定したkubectl、Dockerが必要。

まずWindows版Skaffoldをインストールする。
[GitHubのリリースページ](https://github.com/GoogleCloudPlatform/skaffold/releases)からWindowsバイナリをダウンロードして、skaffold.exeにリネームしてPATHの通ったところに置くだけ。
Skaffoldのバージョンは0.3.0。

<br>

Kubernetesクラスタは、Windows 10 Home上にminikube 0.22.2で作ったKubernetes 1.7.0のクラスタ。
minikubeは[以前](https://www.kaitoy.xyz/2017/10/10/goslings-on-kubernetes/)インストールしたものを使う。

minikubeを起動。

```cmd
> minikube start --kubernetes-version v1.7.0
```

kubectlもminikubeと一緒にインストール済み。

<br>

Dockerについては、デーモンはminikube上のを使えばいいとして、クライアント(Docker Client)はskaffoldコマンドから実行するのでWindows上にないとだめはなず。

WindowsでDockerと言えば今なら[Docker for Windows](https://www.docker.com/docker-windows)だけど、これはWindows 10 Proじゃないと使えなかったはずなので、[Docker Toolbox](https://docs.docker.com/toolbox/)でクライアントをいれた。

このクライアントはデフォルトではローカルのデーモンを見てるので、minikubeのデーモンを見させる。
そのための設定はminikubeのコマンドで分かるようになっている。

```cmd
> minikube docker-env
SET DOCKER_TLS_VERIFY=1
SET DOCKER_HOST=tcp://192.168.99.100:2376
SET DOCKER_CERT_PATH=C:\Users\kaitoy\.minikube\certs
SET DOCKER_API_VERSION=1.23
REM Run this command to configure your shell:
REM @FOR /f "tokens=*" %i IN ('minikube docker-env') DO @%i
```

これに従って以下のコマンドを実行するとクライアントの設定完了。

```cmd
> @FOR /f "tokens=*" %i IN ('minikube docker-env') DO @%i
```

<br>

これで準備完了。

Skaffoldの[Getting Started](https://github.com/GoogleCloudPlatform/skaffold/tree/10d56cf0fd3c253b0716a084419b5833e53d9870#getting-started-with-local-tooling)をやってみる。

Skaffoldのリポジトリをcloneして、コマンドプロンプト開いて、`examples/getting-started`にcdして、以下のコマンドを実行。

```cmd
> skaffold dev
```

エラーで終わった。

```
[31mERRO[0m[0047] run: running skaffold steps: starting watch on file C:\Users\kaitoy\Desktop\skaffold\examples\getting-started\Dockerfile: adding watch for C:\Users\kaitoy\Desktop\skaffold\examples\getting-started\Dockerfile: The parameter is incorrect.
```

MinGW(Git Bash)でやっても同じ結果。
[Issuesに登録されているやつ](https://github.com/GoogleCloudPlatform/skaffold/issues/287)と同じ問題っぽい。

対応を待つしかない。

## Linux版を試す

Linux版も試してみる。
minikubeのVMがLinux(Boot2Docker)なので、そこで動かす。
[WSL](https://ja.wikipedia.org/wiki/Windows_Subsystem_for_Linux)は試さない。
会社のPCがWindows 7で使えないので。

<br>

SkaffoldのLinux版バイナリをダウンロードしてskaffoldにリネームして、minikubeのBoot2DockerにSSHでログインして、PATHの通ったところに置く。
因みにminikubeのBoot2Dockerは、ユーザdockerパスワードtcuserでログインできる。

kubectlのLinux版バイナリもダウンロードしてPATHに入れたら準備完了。

<br>

`examples/getting-started`にcdして`skaffold dev`したらエラー。

```
ERRO[0001] run: getting skaffold config: getting k8s client: Error creating kubeConfig: invalid configuration: no configuration has been provided
```

ちょっと調べたら、kubectlのコンテクストが設定されていないのがだめっぽい。

```sh
# kubectl config current-context
error: current-context is not set
```

Windows上のkubectlに設定されたコンテクストを参考に、以下の内容を`~/.kube/config`に。

```yaml
apiVersion: v1
clusters:
- cluster:
    certificate-authority: /c/Users/kaitoy/.minikube/ca.crt
    server: https://localhost:8443
  name: minikube
contexts:
- context:
    cluster: minikube
    user: minikube
  name: minikube
current-context: minikube
kind: Config
preferences: {}
users:
- name: minikube
  user:
    client-certificate: /c/Users/kaitoy/.minikube/client.crt
    client-key: /c/Users/kaitoy/.minikube/client.key
```

<br>

再度`skaffold dev`したら違うエラー。

```
WARN[0002] run: build: build step: running build: read auth configs: docker config: opening docker config: open /home/docker/.docker/config.json: no such file or directory
```

`.docker/config.json`は`docker login`すると生成されるものらしい。
SkaffoldのREADME.mdにはminikube使うならDocker image registry要らないって書いてあるんだけど…

色々あって、ファイルがあればいいだけっぽいので、以下で良し。

```
# echo {} > ~/.docker/config.json
```

<br>

再度`skaffold dev`したら動いた。
Dockerビルドが走り、minikubeにPodがデプロイされた。

Getting Startedのサンプルは、一秒ごとに「[getting-started] Hello world!」というメッセージをコンソールに表示する。

`examples/getting-started/main.go`の`fmt.Println("Hello world!")`のとこをいじってメッセージを変えたら、自動で再Dockerビルドしてデプロイされて、新しいメッセージを表示し始めた。
便利。

`examples/getting-started/skaffold.yaml`がSkaffoldの設定ファイルで、ここに定義されたKubernetesマニフェストをデプロイしてくれるっぽい。
watchするファイルはどう決めているんだろうか。
Dockerfileとmain.goはwatchしてるけど、新しいファイルを作ってもDockerビルド走らなかった。

<br>

ひとつ問題は、Linuxファイルシステム上で編集しないと変更を検知してくれない。

minikubeのVMには`C:\Users`がマウントされてるので、最初はWindows上にcloneしたサンプルをSkaffoldで実行しつつ、Windows上でmain.goを編集してみたんだけど、それだとダメだった。

やはりWindows版Skaffoldの修正が待たれる。
