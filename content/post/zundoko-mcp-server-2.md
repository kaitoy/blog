+++
categories = ["Programming"]
title = "ズンドコキヨシ with MCP - MCPの機能全部盛り (その2: Elicitation編)"
date = "2025-12-29T16:57:46+09:00"
tags = ["MCP", "GenAI", "LLM", "zundoko", "FastMCP"]
draft = false
cover = "fastmcp.png"
slug = "zundoko-mcp-server-2"
highlight = true
highlightStyle = "monokai"
highlightLanguages = ["python", "console", "diff"]
+++

MCPの(ほぼ)全機能を実装したズンドコMCPサーバーをFastMCP 2.0で実装し、MCPを完全に理解した話の続き。
前回の記事は[これ](https://www.kaitoy.xyz/2025/12/21/zundoko-mcp-server-1/)。

今回は主にMCPクライアント機能のElicitationの実装について。

<!--more-->

<blockquote class="twitter-tweet" data-lang="ja"><p lang="ja" dir="ltr">Javaの講義、試験が「自作関数を作り記述しなさい」って問題だったから<br>「ズン」「ドコ」のいずれかをランダムで出力し続けて「ズン」「ズン」「ズン」「ズン」「ドコ」の配列が出たら「キ・ヨ・シ！」って出力した後終了って関数作ったら満点で単位貰ってた</p>&mdash; てくも (@kumiromilk) <a href="https://twitter.com/kumiromilk/status/707437861881180160">2016年3月9日</a></blockquote>
<script async src="//platform.twitter.com/widgets.js" charset="utf-8"></script>

なお、この記事には生成AIの出力が含まれる。

{{< google-adsense >}}

# ズンドコMCPサーバー・クライアント
MCPのいろいろな機能を試すため、ズンドコMCPサーバーとズンドコクライアントを[FastMCP 2.0]((https://gofastmcp.com/))で開発した。

前回の記事では以下のMCPサーバー機能の実装について書いた。

* MCPサーバー機能
    * Tools
        - `get_zundoko`: 「ズン」か「ドコ」をランダムにひとつ生成する。
    * Resources
        - `zundoko://history`: `get_zundoko`で生成したズンドコの履歴。
            - ズンドコ履歴の変更通知に対応。
    * Resource Templates
        - `zundoko://history/{index}`: ズンドコ履歴内の特定の回次のズンドコ。
    * Prompts
        - `explain_zundoko_kiyoshi`: ズンドコキヨシのやりかたを説明するプロンプト。
    * Logging
        - Tools処理中のログを送信する。

今回の記事では以下の実装について書く。

* MCPサーバー機能
    * Tools
        - `check_kiyoshi`: 「キ・ヨ・シ！」条件を満たすかチェックする。
        - `reset_zundoko_kiyoshi`: ズンドコ履歴とキヨシ状態をリセットする。
    * Resources
        - `zundoko://kiyoshi`: 「キ・ヨ・シ！」をしたことがあれば、その記録。（i.e. キヨシ状態）
            - キヨシ状態の変更通知に対応。
* MCPクライアント機能
    * Elicitation
        - `check_kiyoshi`時にユーザーが「キ・ヨ・シ！」コールできる。

書いたソースは[GitHub](https://github.com/kaitoy/zundoko-mcp-server)に置いてある。

## FastMCPでElicitationを実装
ElicitationはMCPクライアントの機能で、MCPサーバーから受信したリクエストに応じてユーザーに入力を求めて、入力結果をサーバーに返すことができる。
ズンドコMCPサーバー・ズンドコクライアントにおいては、この機能をユーザーに「キ・ヨ・シ！」コールさせるために使う。

### ズンドコMCPサーバー側の実装
「キ・ヨ・シ！」は、「ズン」、「ズン」、「ズン」、「ズン」、「ドコ」の後にコールするので、いったんElicitationおいておいて、この「キ・ヨ・シ！」条件をズンドコ履歴が満たしているかを判定するだけのMCPツール`check_kiyoshi`を実装する。

```python
@mcp.tool
async def check_kiyoshi(ctx: Context) -> str:
    """
    Checks if the zundoko history matches the winning pattern (Zun Zun Zun Zun Doko)
    and elicits "Ki-yo-shi!" from the user if it does.
    """
    history_count = len(zundoko_history)

    if history_count < 5:
        return f"History has only {history_count} item(s), need at least 5 to check for the pattern."

    if zundoko_history[-5:] == ["Zun", "Zun", "Zun", "Zun", "Doko"]:
        return "Pattern found!"
    else:
        return f"Pattern not found. Last 5 items: {zundoko_history[-5:]}"
```

これはまだ単に「キ・ヨ・シ！」条件の判定結果を返すだけのツール。
これを拡張して、「キ・ヨ・シ！」条件を満たしたときに即`"Pattern found!"`を返す代わりに、Elicitationでユーザーから返ってきたコールの内容によってレスポンスを変えるようにする。

Elicitationリクエストは、[前回記事のLogging](https://www.kaitoy.xyz/2025/12/21/zundoko-mcp-server-1/#fastmcp%E3%81%A7logging%E3%82%92%E5%AE%9F%E8%A3%85)と同様に、Contextオブジェクトのメソッドで送れる。
Elicitationのメソッドは[elicit()](https://gofastmcp.com/servers/elicitation#method-signature)で、ユーザーに向けたメッセージと、ユーザーに入力してほしい値の型を指定できる。

Elicitationリクエストに対しては、`accept`、`decline`、`cancel`の3通りのレスポンスがプロトコルに規定されていて、`elicit()`の戻り値はそれらに対応した[AcceptedElicitation、DeclinedElicitation、CancelledElicitation](https://gofastmcp.com/servers/elicitation#elicitation-actions)のいずれかになり、AcceptedElicitationのときだけユーザー入力を受け取れる。

`check_kiyoshi`ツールの処理の中で、「キ・ヨ・シ！」条件を満たしたときに`elicit()`を呼んで、その戻り値の型によってツールのレスポンスを変えるようにする。

```diff
 from fastmcp import FastMCP, Context
+from fastmcp.server.elicitation import (
+    AcceptedElicitation,
+    DeclinedElicitation,
+    CancelledElicitation,
+)

<snip>

     if zundoko_history[-5:] == ["Zun", "Zun", "Zun", "Zun", "Doko"]:
-        return "Pattern found!"
+        # Elicitationリクエスト送信
+        elicit_result = await ctx.elicit(
+            "It's time to say Ki-yo-shi!",
+            response_type=str
+        )
+
+        # Elicitationレスポンスの処理
+        match elicit_result:
+            case AcceptedElicitation(data=response):
+                # ユーザーの入力値のチェック
+                if "Ki-yo-shi!" == response:
+                    return "Perfect!'"
+                else:
+                    return f"Pattern found! But you said '{response}' instead of 'Ki-yo-shi!'"
+            case DeclinedElicitation():
+                return "Pattern found! You declined to say 'Ki-yo-shi!'"
+            case CancelledElicitation():
+                return "Pattern found! You cancelled Ki-yo-shi!"
     else:
         return f"Pattern not found. Last 5 items: {zundoko_history[-5:]}"
```

`elicit()`の結果が`AcceptedElicitation`の時は、ユーザーの入力値を取得して、入力値が`Ki-yo-shi!`かそれ以外によってツールのレスポンスを変えるようにした。

### ズンドコクライアント側の実装
Elicitationリクエストを処理するクライアントは、[前回記事のLogging](https://www.kaitoy.xyz/2025/12/21/zundoko-mcp-server-1/#fastmcp%E3%81%A7logging%E3%82%92%E5%AE%9F%E8%A3%85)のクライアントをベースにする。

Elicitationリクエストの処理は、Loggingやリソース変更通知同様に、`Client`インスタンスに設定するハンドラ関数に書くことができる。

```python
from fastmcp.client.elicitation import ElicitResult


kiyoshi_answered = False

# ハンドラ関数の実装
async def elicitation_handler(message: str, response_type: type, params, context):
    global kiyoshi_answered

    # Elicitationリクエストのメッセージをコンソールに表示して、ユーザーの入力を受け取る
    user_input = input(f"{message}: ")
    kiyoshi_answered = True

    # ズンドコMCPサーバーにユーザー入力を返す
    return ElicitResult(action="accept", content=response_type(value=user_input))

```

ハンドラ関数の中身はこんな感じ。今回はレスポンスは`accept`一択。

このハンドラ関数は、`Client`インスタンスの`elicitation_handler`プロパティに設定する。

```diff
 async def main():
     async with Client(
         "http://127.0.0.1:8080/mcp",
         log_handler=handle_log,
+        elicitation_handler=elicitation_handler,
     ) as client:
         await client.call_tool("get_zundoko", {})
```

クライアントの今の実装は、一回`get_zundoko`ツールを呼ぶだけになってるけど、これを一連のズンドコキヨシをするように直す。

```diff
         elicitation_handler=elicitation_handler,
     ) as client:
-        await client.call_tool("get_zundoko", {})
+        while True:
+            # 「キ・ヨ・シ！」条件達成まで無限ループ
+            if kiyoshi_answered:
+                break
+
+            try:
+                # ズンドコを一つ取得
+                zundoko = await client.call_tool("get_zundoko", {})
+                print(zundoko.content[0].text)
+
+                # 「キ・ヨ・シ！」条件チェック
+                kiyoshi_check_result = await client.call_tool("check_kiyoshi", {})
+                print(kiyoshi_check_result.content[0].text)
+
+                await asyncio.sleep(1)
+            except Exception as e:
+                print(f"Error: {e}")
+                break
```

このクライアントを実行すると以下のような出力が得られる。(ログハンドラの出力除く。)

```console
<snip>
Zun
Pattern not found. Last 5 items: ['Zun', 'Doko', 'Zun', 'Zun', 'Zun']
Zun
Pattern not found. Last 5 items: ['Doko', 'Zun', 'Zun', 'Zun', 'Zun']
Doko
It's time to say Ki-yo-shi!:
```

ここで入力待ちになるので、「キ・ヨ・シ！」コールする。


```console
<snip>
Zun
Pattern not found. Last 5 items: ['Zun', 'Doko', 'Zun', 'Zun', 'Zun']
Zun
Pattern not found. Last 5 items: ['Doko', 'Zun', 'Zun', 'Zun', 'Zun']
Doko
It's time to say Ki-yo-shi!: Ki-yo-shi!
Perfect!'
```

MCPサーバー側にコールを返せた。

## `zundoko://kiyoshi`リソースと`reset_zundoko_kiyoshi`ツールの実装
「キ・ヨ・シ！」コール済みか(i.e. キヨシ状態)をリソースとして取得したり、その状態やズンドコ履歴をリセットするツールを実装したけど、実装内容は前回の記事と大差ないので割愛。

実装のコミットは[これ](https://github.com/kaitoy/zundoko-mcp-server/commit/6658e1597d5f7bbab22cb914925228b964391bd5)。
