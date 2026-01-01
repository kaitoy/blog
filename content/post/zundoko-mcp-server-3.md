+++
categories = ["Programming"]
title = "ズンドコキヨシ with MCP - MCPの機能全部盛り (その3: Sampling編)"
date = "2026-01-01T16:20:33+09:00"
tags = ["MCP", "GenAI", "LLM", "zundoko", "FastMCP"]
draft = false
cover = "fastmcp.png"
slug = "zundoko-mcp-server-3"
highlight = true
highlightStyle = "monokai"
highlightLanguages = ["python", "console", "diff"]
+++

MCPの(ほぼ)全機能を実装したズンドコMCPサーバーをFastMCP 2.0で実装し、MCPを完全に理解した話の続き。
前回の記事は[これ](https://www.kaitoy.xyz/2025/12/29/zundoko-mcp-server-2/)。

今回は主にMCPクライアント機能のSamplingの実装について。

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

今回の記事では以下の実装について書く。

* MCPクライアント機能
    * Sampling
        - `check_kiyoshi`時にユーザーが「キ・ヨ・シ！」以外のコールをしたとき、気の利いたレスポンスを返す。
* MCPユーティリティ機能
    * Ping
        - MCPサーバーの生存確認ができる。

書いたソースは[GitHub](https://github.com/kaitoy/zundoko-mcp-server)に置いてある。

## FastMCPでSamplingを実装
SamplingはMCPクライアントの機能で、MCPサーバーから受信したリクエストに応じてMCPクライアントがLLMの推論を実行し、その結果をサーバーに返すことができる。
MCPサーバーのリクエストには、推論に使うモデル名、temperature、システムプロンプト、ユーザプロンプトなどが含まれる。

ズンドコMCPサーバー・ズンドコクライアントにおいては、この機能は、ユーザーが「キ・ヨ・シ！」コールのタイミングで「キ・ヨ・シ！」以外のコールをしたとき、サーバーから気の利いた突っ込みを返すために使う。

### ズンドコMCPサーバー側の実装
Samplingリクエストは、[前回記事のElicitation](https://www.kaitoy.xyz/2025/12/29/zundoko-mcp-server-2/#%E3%82%BA%E3%83%B3%E3%83%89%E3%82%B3mcp%E3%82%B5%E3%83%BC%E3%83%90%E3%83%BC%E5%81%B4%E3%81%AE%E5%AE%9F%E8%A3%85)と同様に、Contextオブジェクトのメソッドで送れる。
Samplingのメソッドは[sample()](https://gofastmcp.com/servers/sampling#basic-sampling)。

`check_kiyoshi`ツールの処理の中で、`elicit()`を呼んで、ユーザー入力を処理する部分で`sample()`を使うように修正する。

```diff
         # Elicitationリクエスト送信
         elicit_result = await ctx.elicit(
             "It's time to say Ki-yo-shi!",
             response_type=str
         )

         # Elicitationレスポンスの処理
         match elicit_result:
             case AcceptedElicitation(data=response):
                 # ユーザーの入力値のチェック
                 if "Ki-yo-shi!" == response:
                     <snip>
                 else:
-                    return f"Pattern found! But you said '{response}' instead of 'Ki-yo-shi!'"
+                    prompt = (
+                        f"The user was supposed to say 'Ki-yo-shi!' but instead said '{response}'. "
+                        "Generate a humorous and creative warning message (one sentence) about their mistake."
+                    )
+                    # Samplingリクエスト送信
+                    sampling_result = await ctx.sample(
+                        messages=prompt,
+                        max_tokens=5120,
+                        temperature=1.0
+                    )
+                    return sampling_result.text
             case DeclinedElicitation():
```

こんな感じ。Samplingするプロンプトは、

> ユーザーが「キ・ヨ・シ！」と言うべきところで～と言ったのに対して、ユーモアな警告メッセージを生成して

といった内容。
LLMのモデルは指定しないけど、temperatureは最高にして、創造性を要求する。

### ズンドコクライアント側の実装
Samplingリクエストを処理するクライアントは、[前回記事のElicitation](https://www.kaitoy.xyz/2025/12/29/zundoko-mcp-server-2/#%E3%82%BA%E3%83%B3%E3%83%89%E3%82%B3%E3%82%AF%E3%83%A9%E3%82%A4%E3%82%A2%E3%83%B3%E3%83%88%E5%81%B4%E3%81%AE%E5%AE%9F%E8%A3%85)のクライアントをベースにする。

Samplingリクエストの処理は、ElicitationやLoggingと同様に、`Client`インスタンスに設定するハンドラ関数に書くことができる。

```python
from fastmcp.client.sampling import SamplingMessage, SamplingParams, RequestContext
from openai import AsyncOpenAI

# ハンドラ関数の実装
async def sampling_handler(
    messages: list[SamplingMessage],
    params: SamplingParams,
    context: RequestContext
) -> str:
    # Samplingリクエストからプロンプトを取得
    message_content = messages[0].content.text

    # OpenAIのモデルを呼んで推論を実行
    response = await AsyncOpenAI().responses.create(
        model="gpt-5-nano",
        input=message_content,
        max_output_tokens=params.maxTokens or 5120,
        temperature=params.temperature or 1.0,
    )

    # 推論結果をMCPサーバーに返す
    return response.output_text

```

ハンドラ関数の中身はこんな感じ。今回はGPT-5 Nanoで推論する。

このハンドラ関数は、`Client`インスタンスの`sampling_handler`プロパティに設定する。

```diff
 async def main():
     async with Client(
         "http://127.0.0.1:8080/mcp",
         log_handler=handle_log,
         elicitation_handler=elicitation_handler,
+        sampling_handler=sampling_handler,
     ) as client:
         while True:
```

クライアント側はこれだけでSampling対応完了。

環境変数`OPENAI_API_KEY`にOpenAIのAPIキーを設定してこのクライアントを実行すると以下のような出力が得られる。(ログハンドラの出力除く。)

```console
<snip>
Zun
Pattern not found. Last 5 items: ['Zun', 'Doko', 'Zun', 'Zun', 'Zun']
Zun
Pattern not found. Last 5 items: ['Doko', 'Zun', 'Zun', 'Zun', 'Zun']
Doko
It's time to say Ki-yo-shi!:
```

ここで入力待ちになるので、「キ・ヨ・シ！」コールの代わりに「ヤ・ス・シ！」コールしてみる。


```console
<snip>
Zun
Pattern not found. Last 5 items: ['Zun', 'Doko', 'Zun', 'Zun', 'Zun']
Zun
Pattern not found. Last 5 items: ['Doko', 'Zun', 'Zun', 'Zun', 'Zun']
Doko
It's time to say Ki-yo-shi!: Ya-su-shi!
Warning: You mispronounced the sacred chant—'Ya-su-shi!'—and the dojo ninjas are filing a complaint with the Sushi Court; please retry with 'Ki-yo-shi!' before the rice turns rebellious.
```

> 警告: 神聖な詠唱を「ヤ・ス・シ！」と間違って発音したため、道場の忍者が寿司裁判所に苦情を申し立てています。ご飯が反抗的になる前に「キ・ヨ・シ！」と言い直してください。

アメリカンなウィットで返された。

### Samplingフォールバックハンドラーの設定
MCPクライアントにおいてSamplingの実装はオプショナルで、実際Samplingに対応したクライアントは見たことがない。
今のズンドコMCPサーバーの実装だと、Sampling未対応のクライアントがズンドコした場合、Samplingリクエストを送るところで「Client does not support sampling」というエラーになってしまう。

このエラーを防ぐため、ズンドコMCPサーバーにSamplingのフォールバックハンドラーを設定して、クライアントがSamplingをサポートしていない場合に己でSamplingリクエストの処理をするようにする。
Samplingフォールバックハンドラーは、FastMCPのアプリケーションインスタンスの`sampling_handler`に設定する。

```diff
-mcp = FastMCP("Zundoko Server")
+mcp = FastMCP(
+    "Zundoko Server",
+    sampling_handler=lambda *_: "Correct answer is 'Ki-yo-shi!'"
+)
```
Samplingフォールバックハンドラーは普通はSamplingリクエストの内容をもとにLLMに推論させるような処理を書くんだけど、今回はSamplingを使うのが一か所なので、そこに合う固定の結果を返すような関数にした。

`sampling_handler`に関係するパラメータに`sampling_handler_behavior`というのがあって、これのデフォルト値が`"fallback"`なので、`sampling_handler`に設定する関数がフォールバックハンドラー(i.e. Samplingリクエストを送れないときだけ呼ばれる関数)になるんだけど、`sampling_handler_behavior`に`"always"`を設定しておくと、`sampling_handler`に設定する関数はクライアントの実装にかかわらず常に使われるようになる。

## FastMCPでPingを実装
MCPのPingはICMPのPingと同様に、送った相手の生死を確認するために使う。
MCPのPingはMCPサーバーからもMCPクライアントからも送れて、セッション中は定期的に送って生死確認すべきとプロトコルで規定されている。

今回の実装では、ズンドコクライアントを起動して、MCPのコネクションをはった後、ズンドコし始める前に一回Pingをサーバーに撃つようにする。

Pingは`Client`インスタンスの[pingメソッド](https://gofastmcp.com/clients/client#server-connectivity)で撃てる。

```diff
 async def main():
     async with Client(
         "http://127.0.0.1:8080/mcp",
         log_handler=handle_log,
         elicitation_handler=elicitation_handler,
         sampling_handler=sampling_handler,
     ) as client:
+        print(f"Zundoko MCP Server is alive: {await client.ping()}")
+
         while True:
```

このクライアントを実行すると、最初に以下のメッセージが標準出力に出る。

```console
Zundoko MCP Server is alive: True
```
