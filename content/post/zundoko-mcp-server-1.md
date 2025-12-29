+++
categories = ["Programming"]
title = "ズンドコキヨシ with MCP - MCPの機能全部盛り (その1)"
date = "2025-12-21T12:12:01+09:00"
tags = ["MCP", "GenAI", "LLM", "zundoko", "FastMCP"]
draft = false
cover = "fastmcp.png"
slug = "zundoko-mcp-server-1"
highlight = true
highlightStyle = "monokai"
highlightLanguages = ["python", "console", "diff"]
+++

MCPの(ほぼ)全機能を実装したズンドコMCPサーバーをFastMCP 2.0で実装し、MCPを完全に理解した話。
長くなるので、複数の記事に分けて書く。

今回は、MCPサーバー機能のTools、Resources、Resource Templates、Prompts、Loggingの実装について。

<!--more-->

<blockquote class="twitter-tweet" data-lang="ja"><p lang="ja" dir="ltr">Javaの講義、試験が「自作関数を作り記述しなさい」って問題だったから<br>「ズン」「ドコ」のいずれかをランダムで出力し続けて「ズン」「ズン」「ズン」「ズン」「ドコ」の配列が出たら「キ・ヨ・シ！」って出力した後終了って関数作ったら満点で単位貰ってた</p>&mdash; てくも (@kumiromilk) <a href="https://twitter.com/kumiromilk/status/707437861881180160">2016年3月9日</a></blockquote>
<script async src="//platform.twitter.com/widgets.js" charset="utf-8"></script>

なお、この記事には生成AIの出力が含まれる。

{{< google-adsense >}}

# MCPについて
[Model Context Protocol (MCP)](https://modelcontextprotocol.io/) は、AIアプリが外部システムとやりとりするためのプロトコル。

[以前の記事](https://www.kaitoy.xyz/2025/11/23/all-about-mcp/)で詳しく解説した。

# ズンドコMCPサーバー・クライアント
MCPのいろいろな機能を試すため、以下の機能を備えたズンドコMCPサーバーとズンドコクライアントを開発した。

* MCPサーバー機能
    * Tools
        - `get_zundoko`: 「ズン」か「ドコ」をランダムにひとつ生成する。
        - `check_kiyoshi`: 「キ・ヨ・シ！」条件を満たすかチェックする。
        - `reset_zundoko_kiyoshi`: ズンドコ履歴とキヨシ状態をリセットする。
    * Resources
        - `zundoko://history`: `get_zundoko`で生成したズンドコの履歴。
            - ズンドコ履歴の変更通知に対応。
        - `zundoko://kiyoshi`: 「キ・ヨ・シ！」をしたことがあれば、その記録。（i.e. キヨシ状態）
            - キヨシ状態の変更通知に対応。
    * Resource Templates
        - `zundoko://history/{index}`: ズンドコ履歴内の特定の回次のズンドコ。
    * Prompts
        - `explain_zundoko_kiyoshi`: ズンドコキヨシのやりかたを説明するプロンプト。
    * Logging
        - Tools処理中のログを送信する。
* MCPクライアント機能
    * Elicitation
        - `check_kiyoshi`時にユーザーが「キ・ヨ・シ！」コールできる。
    * Sampling
        - `check_kiyoshi`時にユーザーが「キ・ヨ・シ！」以外のコールをしたとき、気の利いたレスポンスを返す。
* MCPユーティリティ機能
    * Ping
        - MCPサーバーの生存確認ができる。
    * Progress
        - `get_zundoko`リクエストの処理中に、「キ・ヨ・シ！」条件達成までの進捗をレポートする。

<br>

ズンドコクライアントはMCPホストにあたるアプリだけど、AIアプリではなく、決定論的に1秒間隔でズンドコMCPサーバーの`get_zundoko`を呼び、そのたびに`check_kiyoshi`で「キ・ヨ・シ！」条件判定をして、終了時に`reset_zundoko_kiyoshi`を呼ぶ単純な作り。

![zundoko.gif](/images/zundoko-mcp-server-1/zundoko.gif)

ズンドコMCPサーバーとズンドコクライアントはFastMCP 2.0 (`fastmcp==2.12.4`)で実装した。

書いたソースは[GitHub](https://github.com/kaitoy/zundoko-mcp-server)に置いた。

# FastMCP
[FastMCP](https://gofastmcp.com/)は、MCPサーバーを開発するためのFastAPIベースのフレームワーク。MCPクライアントも実装できる。
Pythonのワークフローオーケストレーションツールの[Prefect](https://www.prefect.io/)の開発元のCEOであるjlowinが開発している。

FastMCPはバージョン1.0のときにMCP本家の[Python SDK](https://github.com/modelcontextprotocol/python-sdk)に取り込まれたけど、jlowinはPython SDK内のFastMCPのメンテをしつつ、バージョン2.0として独自の機能拡張もしている。

2.0の独自機能としては、OpenAPIドキュメントやFastAPIアプリからのMCPツール生成や、GoogleやGitHabとかと連携したMCPサーバーへのソーシャルログインや、デプロイやユニットテストやクライアントライブラリのサポートなどがあり、プロダクション向けの開発がしやすくなっているとされている。

今回、ズンドコMCPサーバー・クライアントにMCPのほぼ全機能を詰め込んだんだけど、CompletionとPaginationとCancellationはFastMCPが完全に対応してないようで、実装できなかった。
Completionに関してはドキュメンテーションがなく、クライアントモジュールにリクエストを送るAPIはあるけど、サーバー側に実装するAPIは見当たらない。
Paginationもドキュメンテーションがなく、APIも見当たらない。
Cancellationもドキュメンテーションがなくて、クライアントモジュールにAPIはあるけど、APIの引数の`request_id`を取得するためのAPIがないので実質使えなさそう。

RootsはFastMCPは対応してるけど、ズンドコキヨシと概念が合わなくて実装をさぼった。

# FastMCPの使い方
FastMCPでMCPサーバーを書くには、FastAPIと同じ感じで、アプリケーションインスタンスを作って、そのインスタンスのデコレータをつけて関数を書いていけばいい。

`server.py`:
```python
from fastmcp import FastMCP

mcp = FastMCP("Demo 🚀")  # アプリケーションインスタンス作成

@mcp.tool  # MCPツールを追加するデコレータ
def add(a: int, b: int) -> int:
    """Add two numbers"""
    return a + b

if __name__ == "__main__":
    mcp.run()
```

このコードを実行すると、`mcp.run()`によってMCPサーバーが起動する。

`mcp.run()`はデフォルトで[stdioトランスポート](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#stdio)でMCPサーバー起動する。
このトランスポートは、MCPクライアントからサブプロセスとしてMCPサーバーを呼ぶ形で使われて、stdioとstdoutでMCP通信する。

代わりに、`mcp.run(transport="http", host="127.0.0.1", port=8000)`のようにすることで、[Streamable HTTPトランスポート](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports#streamable-http)でMCPサーバー起動することもできる。
このトランスポートを使うと、MCPサーバーはWebサーバーとして起動して、HTTPでMCPクライアントと通信する。

これら2種のトランスポートが今のMCPで規定されているものだけど、FastMCPではほかにも、昔のMCPで規定されていた[SSEトランスポート](https://gofastmcp.com/clients/transports#sse-transport-legacy)や、1プロセスでサーバーもクライアントも起動するFastMCP独自の[Im-Memoryトランスポート](https://gofastmcp.com/clients/transports#in-memory-transport)も使える。

`mcp.run()`でプログラムから直接起動するほかにも、FastMCPのCLIツールを使って、`fastmcp run server.py --transport http --port 8080 --host 127.0.0.1`みたいに起動することもできる。
また、FastMCPのアプリケーションインスタンスは、`app = mcp.http_app()`のようにしてASGIアプリに変換できるので、uvicornなどのASGIサーバーで`uvicorn server:app --host 127.0.0.1 --port 8080`みたいに起動することもできる。
プロダクション向けにはASGIサーバーを使うべし。

この記事では以降、ズンドコMCPサーバー・クライアントの実装を例としてFastMCP 2.0の使い方詳細を紹介しつつ、MCPの各機能の動きを見ていく。

## FastMCPでToolsを実装
まず、ランダムにズンかドコを生成するツール、`get_zundoko`を実装する。
ツールを実装するには、ツールのインプットパラメータを引数で受け取り、アウトプットを戻り値として返す関数を定義して、[toolデコレータ](https://gofastmcp.com/servers/tools#the-@tool-decorator)付ければいい。

```python
import random
from fastmcp import FastMCP

mcp = FastMCP("Zundoko Server")

@mcp.tool
def get_zundoko() -> str:
    """
    Returns either "Zun" or "Doko" randomly.
    """
    choices = ["Zun", "Doko"]
    return random.choice(choices)

if __name__ == "__main__":
    mcp.run()
```

これだけ。関数のdocstringに書いたものがツールのdescriptionになり、関数の戻り値の型ヒントがツールのoutputSchemaに反映される。
デコレータの引数でツールのdescriptionを指定したり、タグやメタデータを付けたりもできる。
関数に引数を付けた場合は、[型アノテーション](https://docs.python.org/ja/3/library/typing.html#typing.Annotated)でツールのインプットパラメータのdescriptionsを書ける。

このMCPサーバーをStreamable HTTPトランスポートで起動して、[Claude Code](https://code.claude.com/docs/ja/overview)につなげば、`get_zundoko`を以下のように呼べる。

![get_zundoko.png](/images/zundoko-mcp-server-1/get_zundoko.png)

「ドコ」がとれた。

## FastMCPでResourcesを実装
次に、生成したズンドコを履歴として管理して、履歴をリソースとして取得できるようにする。
リソースは、ツール同様にデコレータで実装する方法と、[add_resourceで動的に追加する方法](https://gofastmcp.com/servers/resources#resource-classes)の2通りある。
ここではデコレータにする。

デコレータでリソースを実装するには、リソースを返す関数に[resourceデコレータ](https://gofastmcp.com/servers/resources#the-%40resource-decorator)を付ければいい。
ズンドコ履歴を返す`get_history`を定義して、`zundoko://history`というURIで取得できるリソースにする。

```python
zundoko_history: list[str] = []

@mcp.resource(
    "zundoko://history",
    mime_type="application/json",
    annotations={"readOnlyHint": True, "idempotentHint": True}
)
def get_history() -> list[str]:
    """
    Returns the history of zundoko calls.
    """
    return zundoko_history
```

リソースの実装はこれだけ。
`zundoko_history`がグローバル変数で、`get_zundoko`内でそこにズンドコを`append`する修正もしたけど割愛。

リソースの関数のdocstringに書いたものがリソースのdescriptionになり、関数名がリソース名になる。
デコレータの引数でリソースのURI、名前、タイトル、MIMEタイプなどを指定できる。

このリソースはClaude Codeから以下のように取れる。

![get_history.png](/images/zundoko-mcp-server-1/get_history.png)

さっきとったドコだけが履歴にある。

## FastMCPでResource Templatesを実装
ズンドコ履歴の中から、特定の回次のズンドコを取得したい。のでリソーステンプレートを実装する。
リソーステンプレートもresourceデコレータで実装できて、デコレートする関数にはテンプレートを埋める値を受け取る引数を定義する。

```python
@mcp.resource("zundoko://history/{index}")
def get_zundoko_from_history(index: int) -> str:
    """
    Returns a specific zundoko from history by index.
    """
    if index < 1 or index > len(zundoko_history):
        raise ValueError(f"Invalid index: {index}")
    return zundoko_history[index - 1]
```

これだけ。

Claude Codeで初回のズンドコを取得してみる。

![get_zundoko_from_history.png](/images/zundoko-mcp-server-1/get_zundoko_from_history.png)

さっきとったドコがとれた。

## FastMCPでリソース変更通知とクライアントを実装
リソースが実装できたので、リソースの変更通知を実装してみたい。
ズンドコ履歴にズンドコを追加したらクライアントに通知するようにする。

リソース変更通知は、FastMCPの[Context](https://gofastmcp.com/servers/context)オブジェクトを取得して`send_resource_list_changed`を呼ぶと通知できる。
Contextオブジェクトの取得方法にはいくつかあるけど、ここでは`Context`型の引数を定義してDIしてもらう方法を使う。
(なお、この方法はFastMCP 2.14で非推奨になった模様。)

```diff
-from fastmcp import FastMCP
+from fastmcp import FastMCP, Context

 mcp = FastMCP("Zundoko Server")

 @mcp.tool
-def get_zundoko() -> str:
+async def get_zundoko(ctx: Context) -> str:
     """
     Returns either "Zun" or "Doko" randomly.
     """
     choices = ["Zun", "Doko"]
     result = random.choice(choices)
     zundoko_history.append(result)
+    await ctx.send_resource_list_changed()
     return result
```

`send_resource_list_changed`が非同期関数なので、`get_zundoko`をasync関数にした。

実装した通知を受けてみたいけど、Claude Codeは通知に対応してないっぽいので自前のクライアントで受けることにする。

FastMCPはクライアントライブラリも備えていて、`Client`インスタンスを作ればその`call_tool`メソッドで簡単にツールを実行できるし、インスタンスに[メッセージハンドラ](https://gofastmcp.com/clients/messages#function-based-handler)を設定しておけば通知を受け取れる。

```python
import asyncio
from fastmcp import Client


async def handle_message(message):  # メッセージハンドラの実装
    print(f"Received message: {message}")


async def main():
    async with Client(  # Clientインスタンス作成
        "http://127.0.0.1:8080/mcp",
        message_handler=handle_message  # メッセージハンドラを設定
    ) as client:
        await client.call_tool("get_zundoko", {})  # get_zundokoツールの呼び出し


if __name__ == "__main__":
    asyncio.run(main())  # クライアント起動
```

このクライアントは、`get_zundoko`を一回呼び出し、サーバーからの通知を標準出力に吐く。
このクライアントを実行すると以下の出力が得られる。

```console
Received message: root=ResourceListChangedNotification(method='notifications/resources/list_changed', params=None, jsonrpc='2.0')
```

現時点でMCPのプロトコルとして、リソース変更通知には変更内容を含めることはできないので、これ以上のことはできない。

## FastMCPでLoggingを実装
MCPサーバーのログは通知と同様に、Contextオブジェクトのメソッドでクライアントに送信できる。
ログ用メソッドにはログレベル毎に`debug`、`info`、`warning`、`error`がある。
`log`というメソッドでログレベルやロガーを指定して送信することもできる。

例えば、`get_zundoko`でズンドコ履歴の内容をログ送信するようにするには以下のように書き加えればいい。

```diff
 @mcp.tool
 async def get_zundoko(ctx: Context) -> str:
     """
     Returns either "Zun" or "Doko" randomly.
     """
     choices = ["Zun", "Doko"]
     result = random.choice(choices)
     zundoko_history.append(result)
     await ctx.send_resource_list_changed()
+
+    history_count = len(zundoko_history)
+    await ctx.info(
+        f"Zundoko history now contains {history_count} item(s)",
+        extra={"count": history_count, "latest": result}
+    )
+
     return result
```

この例のように、ログメソッドにはメッセージのほか、`extra`に構造化情報も含められる。

FastMCPの`Client`インスタンスでは、メッセージハンドラでもログを受け取ることができるけど、ログハンドラを設定することでより扱いが楽にできる。

```python
import asyncio
from fastmcp import Client
from fastmcp.client.logging import LogMessage


async def handle_log(message: LogMessage):  # ログハンドラ実装
    print(f"[{message.level.upper()}] {message.data.get('msg')} {message.data.get('extra')}")


async def main():
    async with Client(  # Clientインスタンス作成
        "http://127.0.0.1:8080/mcp",
        log_handler=handle_log  # ログハンドラを設定
    ) as client:
        await client.call_tool("get_zundoko", {})  # get_zundokoツールの呼び出し


if __name__ == "__main__":
    asyncio.run(main())  # クライアント起動
```

このクライアントは、`get_zundoko`を一回呼び出し、サーバーからのログメッセージをちょっと成型して標準出力に吐く。
このクライアントを実行すると以下のような出力が得られる。

```console
[INFO] Zundoko history now contains 3 item(s) {'count': 3, 'latest': 'Zun'}
```

<br>

因みに、`log_handler`を設定しない場合でも、FastMCPのデフォルトのログハンドラでいい感じに標準出力にログ出力してくれる。

## FastMCPでPromptsを実装
次に、ズンドコキヨシのやり方を支持するプロンプトを実装する。
実装方法は、プロンプトの内容を返す関数に[promptデコレータ](https://gofastmcp.com/servers/prompts#the-%40prompt-decorator)を付ければいい。
関数が受け取った引数を使って返すプロンプトを動的に変えることもできるけど、今回はシンプルに固定値を返す。

```python
@mcp.prompt
def explain_zundoko_kiyoshi() -> str:
    """
    Explains how to do Zundoko Kiyoshi.
    """
    return """
1. Randomly output either "Zun" or "Doko"
2. Continue until you get the sequence "Zun Zun Zun Zun Doko" (four "Zun"s followed by one "Doko")
3. When this sequence appears, output "Ki-yo-shi!" and end the program
"""
```

これをClaude Codeから読み込んでみる。

![explain_zundoko_kiyoshi.png](/images/zundoko-mcp-server-1/explain_zundoko_kiyoshi.png)

関数名(i.e. プロンプト名)やdocstring(i.e. プロンプトのdescription)がよくなかったのか、ズンドコキヨシの説明をしてくれちゃったけど、一応ズンドコキヨシを一回やってくれたようだ。

ついでにClaude Sonnet 4.5がズンドコキヨシをclassic programming exercise in Japanと認識してくれていることが判明した。

<br>

Elicitation、Sampling、Ping、Progressの実装については次回の記事で。
