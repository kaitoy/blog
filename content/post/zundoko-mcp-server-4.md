+++
categories = ["Programming"]
title = "ズンドコキヨシ with MCP - MCPの機能全部盛り (その4: Progress編)"
date = "2026-01-03T18:01:07+09:00"
tags = ["MCP", "GenAI", "LLM", "zundoko", "FastMCP"]
draft = false
cover = "fastmcp.png"
slug = "zundoko-mcp-server-4"
highlight = true
highlightStyle = "monokai"
highlightLanguages = ["python", "console", "diff"]
+++

MCPの(ほぼ)全機能を実装したズンドコMCPサーバーをFastMCP 2.0で実装し、MCPを完全に理解した話の続き。
前回の記事は[これ](https://www.kaitoy.xyz/2026/01/01/zundoko-mcp-server-3/)。

今回が最終編で、MCPユーティリティ機能のProgressの実装について。

<!--more-->

<blockquote class="twitter-tweet" data-lang="ja"><p lang="ja" dir="ltr">Javaの講義、試験が「自作関数を作り記述しなさい」って問題だったから<br>「ズン」「ドコ」のいずれかをランダムで出力し続けて「ズン」「ズン」「ズン」「ズン」「ドコ」の配列が出たら「キ・ヨ・シ！」って出力した後終了って関数作ったら満点で単位貰ってた</p>&mdash; てくも (@kumiromilk) <a href="https://twitter.com/kumiromilk/status/707437861881180160">2016年3月9日</a></blockquote>
<script async src="//platform.twitter.com/widgets.js" charset="utf-8"></script>

なお、この記事には生成AIの出力が含まれる。

{{< google-adsense >}}

# ズンドコMCPサーバー・クライアント
MCPのいろいろな機能を試すため、ズンドコMCPサーバーとズンドコクライアントを[FastMCP 2.0]((https://gofastmcp.com/))で開発した。

前回までの記事では以下の機能の実装について書いた。

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

今回の記事では以下の実装について書く。

* MCPユーティリティ機能
    * Progress
        - `get_zundoko`リクエストの処理中に、「キ・ヨ・シ！」条件達成までの進捗をレポートする。

書いたソースは[GitHub](https://github.com/kaitoy/zundoko-mcp-server)に置いてある。

## FastMCPでProgressを実装
ProgressはMCPのユーティリティ機能で、MCPサーバーかMCPクライアントいずれかから送ったリクエストに対して、処理の進捗を通知する機能。
進捗通知を受けたい場合はリクエストの`progressToken`パラメータにリクエスト固有な値をいれて送って、進捗通知には`progressToken`、処理の総量(`total`)、処理済みの量(`progress`)、進捗メッセージ(`message`)を入れて送る。

ズンドコMCPサーバー・ズンドコクライアントにおいては、この機能は、「キ・ヨ・シ！」条件達成までの進捗の通知に使う。
通知はズンドコMCPサーバーからで、タイミングは`get_zundoko`ツールでズンドコを生成した後。

「キ・ヨ・シ！」条件は複数の`get_zundoko`実行により達成されるので、通知する進捗は複数のリクエストにまたがるものになり、プロトコルに反するけど気にしない。
「キ・ヨ・シ！」条件達成進捗は「ドコ」により`0`に後退することがあり、後退はプロトコルに反してるけどそれも気にしない。

### ズンドコMCPサーバー側の実装
進捗(i.e. Progress)の通知は、[以前の記事のリソース変更通知](https://www.kaitoy.xyz/2025/12/21/zundoko-mcp-server-1/#fastmcp%E3%81%A7%E3%83%AA%E3%82%BD%E3%83%BC%E3%82%B9%E5%A4%89%E6%9B%B4%E9%80%9A%E7%9F%A5%E3%81%A8%E3%82%AF%E3%83%A9%E3%82%A4%E3%82%A2%E3%83%B3%E3%83%88%E3%82%92%E5%AE%9F%E8%A3%85)と同様に、Contextオブジェクトのメソッドで送れる。
進捗通知のメソッドは[report_progress()](https://gofastmcp.com/servers/progress#method-signature)。

`get_zundoko`ツールの処理の中で、ズンドコ履歴にズンドコを追加した後に`report_progress()`で進捗通知するようにエンハンスする。

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

+    zundoko_progress = _calc_zundoko_progress()
+    await ctx.report_progress(
+        progress=zundoko_progress[0], total=5, message=zundoko_progress[1]
+    )
+
     history_count = len(zundoko_history)
     await ctx.info(
         f"Zundoko history now contains {history_count} item(s)",
         extra={"count": history_count, "latest": result}
     )

     return result
```

こんな感じ。
`_calc_zundoko_progress()`で`progress`と`message`を作ってるけど、その処理内容はMCPに関係ないので割愛。

一応処理内容は[これ](https://github.com/kaitoy/zundoko-mcp-server/commit/24dec32167b605479551d50b7260a1924e02d911#diff-791d4d41d3718d15d49180f3aacc8370b8cab07383f0d35b2713651cc0adfe46R99-R100)。

### ズンドコクライアント側の実装
進捗通知を受信するクライアントは、[前回記事のSampling](https://www.kaitoy.xyz/2026/01/01/zundoko-mcp-server-3/#%E3%82%BA%E3%83%B3%E3%83%89%E3%82%B3%E3%82%AF%E3%83%A9%E3%82%A4%E3%82%A2%E3%83%B3%E3%83%88%E5%81%B4%E3%81%AE%E5%AE%9F%E8%A3%85)のクライアントをベースにする。

進捗通知の処理は、リソース変更通知と同様に、`Client`インスタンスに設定するハンドラ関数に書くことができる。

```python
async def progress_handler(progress: int, total: int, message: str = None):
    percentage = progress / total * 100
    print(f"Progress: {progress}/{total} ({percentage:.0f}%) - {message}")
```

ハンドラ関数の中身はこんな感じ。進捗通知の内容を標準出力に吐くだけ。

このハンドラ関数は、`Client`インスタンスの`progress_handler`プロパティに設定する。

```diff
 async def main():
     async with Client(
         "http://127.0.0.1:8080/mcp",
         log_handler=handle_log,
         elicitation_handler=elicitation_handler,
         sampling_handler=sampling_handler,
+        progress_handler=progress_handler,
     ) as client:
         while True:
```

このクライアントを実行すると以下のような出力が得られる。(ログハンドラの出力除く。)

```console
<snip>
Doko
Pattern not found. Last 5 items: ['Doko', 'Zun', 'Zun', 'Doko', 'Doko']
Progress: 1.0/5.0 (20%) - 1 consecutive Zun(s)
Zun
Pattern not found. Last 5 items: ['Zun', 'Zun', 'Doko', 'Doko', 'Zun']
Progress: 2.0/5.0 (40%) - 2 consecutive Zun(s)
Zun
Pattern not found. Last 5 items: ['Zun', 'Doko', 'Doko', 'Zun', 'Zun']
Progress: 0.0/5.0 (0%) - Waiting for a Zun
Doko
Pattern not found. Last 5 items: ['Doko', 'Doko', 'Zun', 'Zun', 'Doko']
Progress: 1.0/5.0 (20%) - 1 consecutive Zun(s)
Zun
Pattern not found. Last 5 items: ['Doko', 'Zun', 'Zun', 'Doko', 'Zun']
Progress: 2.0/5.0 (40%) - 2 consecutive Zun(s)
<snip>
```

「キ・ヨ・シ！」条件達成進捗が表示できた。

# FastMCP Cloud
FastMCPは[FastMCP Cloud](https://gofastmcp.com/deployment/fastmcp-cloud)というMCPサーバーのホスティングサービスもやっていて、今のところ無料でデプロイできる。

ズンドコMCPサーバーをFastMCP Cloudにデプロイしたら、[https://zundoko.fastmcp.app/mcp](https://zundoko.fastmcp.app/mcp)でアクセスできるようになった。

ただこのエンドポイントでズンドコすると、なぜか`check_kiyoshi`のElicitationリクエストが受け取れずにスタックしてしまう。
FastMCP Cloudからクライアントへのリクエストは対応してない?
