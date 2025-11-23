+++
categories = ["Programming"]
title = "ツールだけじゃない。MCPの全機能を完全に理解する"
date = "2025-11-23T23:40:19+09:00"
tags = ["MCP", "GenAI", "LLM"]
draft = false
cover = "mcp.png"
slug = "all-about-mcp"
highlight = false
+++

MCPの概要から全機能まで解説し、MCPを完全に理解できる記事。

<!--more-->

なお、この記事には生成AIの出力が含まれる。

{{< google-adsense >}}

# MCPの背景
## LLMが直面する壁
現在、すでにLLMの言語能力や知識量はヒトを超えているけど、以下のような課題を抱えている:

1. **知識の陳腐化**

    LLMの知識は、その開発時に収集された訓練データの範囲に固定される。そのためLLM単体では、最新のニュースや、社外秘などのプライベートな情報に関する質問には答えられない。

2. **外部世界との断絶**

    本質的にはLLMは自己完結した処理系で、入力された文書の続きを補完する計算機に過ぎないので、外部の情報を検索したり、APIを呼び出したり、他のシステムを操作したりすることは、LLM単体ではできない。

そのため、LLMはオープンなやや古い情報をもとに質問に答えてくれる「知識ベース」に過ぎなくて、**リアルタイム性や業務システムとの統合が求められる実用的なアプリケーションとしては不十分。**

## 壁を破るAIアプリ
前節で書いたような課題に対応するため、LLMとユーザーとの間で動いて、LLMに代わって最新の情報を収集したり外部システムと連携し、実際のユーザーの課題を解決するアプリケーション(以下、**AIアプリ**)が広く開発されるようになった。
AIアプリの実装には、LLMの欠点を補完するための様々なアプローチがあるが、代表的なのが **RAG (Retrieval-Augmented Generation)** と **Function Calling** 。

* **RAG**

    ユーザーの質問に関連する情報を外部の知識ベースから検索し、その情報をプロンプトに含めてLLMに渡す手法。これにより、LLMは最新の知識やプライベートな情報に基づいた回答を生成できる。

* **Function Calling (a.k.a Tool Calling)**

    LLMがユーザの質問や依頼に対応するために外部の関数を呼び出すべきと判断した場合に、その関数の呼び出しリクエスト(Function Call)を生成する機能。
    Function Callには呼び出す関数の名前と実引数が含まれる。
    AIアプリはそのFunction Callをもとに関数を実行し、戻り値をプロンプトに含めてLLMに渡す。
    これにより、LLMが外部のデータや処理結果をもとに推論できたり、外部システムを操作できたりする。

Function Callingは関数呼び出しによって外部データの取得ができるので、RAGを包含していると言える。
よって以降ではFunction Callingに焦点をあてる。

**Function Callingは非常に強力だけど、その実装方法はLLMやプラットフォームや呼び出す関数の機能ごとにバラバラという問題がある。**
例えば、OpenAIのFunction CallingとGoogle GeminiのFunction Callingでは仕様が異なる。
そのようなLLMとのインターフェースの差異は、LangChainとかのライブラリを利用して抽象化することができるけど、Function Callを読んで実際に関数を呼ぶ処理は、開発者がAIアプリに関数ごとに作りこむ必要がある。

具体的には、Function CallingでAWSのS3に格納されたデータを読むには、Function Callからバケット名とキーを取得して、それをboto3のS3 APIに渡してオブジェクトを読むみたいな処理を開発者が頑張って書く必要がある。

![un-unified-access.png](/images/all-about-mcp/un-unified-access.png)

この図は、LLMからのFunction Callに応じて、AIアプリが外部システム毎に個別の処理でアクセスしないといけない煩雑さを表している。

このような分断が、AIアプリ開発の効率を下げ、LLMと外部システム間のエコシステムが広がる上での障壁となっていた。

# Model Context Protocol (MCP) とは？
[Model Context Protocol (MCP)](https://modelcontextprotocol.io/) は、AIアプリが外部システムとやりとりするための、オープンで標準化されたプロトコル。
Anthropicによって提唱され、AIアプリの開発効率を向上し、エコシステムの発展を促進することを目指している。

**MCPを活用すれば、AIアプリが統一されたインターフェースで外部システムと接続でき、前節で述べたような問題が解消される。**

![unified-access.png](/images/all-about-mcp/unified-access.png)

なお、ここまでFunctionとか関数とか言ってたものは、MCPの世界ではToolとかツールとか呼ばれるので、以降ではそう呼ぶ。

## MCPの仕組み
MCPの2025-06-18版について解説する。

MCPのアーキテクチャには以下の3つのコンポーネントが登場する。

- **MCPホスト**: LLMからのFunction Callなどに対応するため、MCPを利用するコンポーネント。前節のAIアプリはこれにあたる。
- **MCPクライアント**: MCP通信のクライアント。MCPホスト内で動き、MCPサーバーとのコネクションを確立し、MCPサーバーにツール呼び出しリクエストを送り、レスポンスをMCPホストに返す。
- **MCPサーバー**: MCPクライアントからのリクエストを受けて、外部システムにアクセスしてレスポンスを返す。

<br>

MCPクライアントとMCPサーバとの間のやり取りは、[JSON-RPC 2.0](https://www.jsonrpc.org/specification)をベースとしたプロトコルで行われる。
つまり、クライアントから送られるリクエストメッセージやサーバーから返されるレスポンスメッセージはJSON形式のオブジェクトになり、リクエストオブジェクトにはメソッド名とパラメータが含まれ、レスポンスオブジェクトには結果やエラーが含まれる。

リクエストオブジェクトの特殊な形式として、レスポンスを要求しない通知オブジェクトというのもある。

**MCPは主にAIエージェントが外部システムの情報を取ったり操作したりするツールを実行するために使われるけど、他にもいろいろ機能がある。**

### MCPのサーバー機能
MCPサーバーの機能には以下のものがある。

* [Tools](https://modelcontextprotocol.io/specification/2025-06-18/server/tools)

    **MCPクライアントにツールを提供する機能。**

    MCPサーバーに`tools/list`リクエストを送るとツールのリストがもらえて、`tools/call`リクエストでツールを呼び出せる。
    MCPクライアントとMCPサーバーとのセッションが開始された後にツールが増減した場合、MCPサーバーから`notifications/tools/list_changed`通知を送ることができる。

    MCPホストからLLMにツールリスト渡して、Function Callを生成させてツールを呼び出す、という用途が想定されている。

* [Resources](https://modelcontextprotocol.io/specification/2025-06-18/server/resources)

    **MCPクライアントにリソースを提供する機能。**

    扱えるリソースには、ファイルとか、Webページとか、Webサービス固有のリソース(e.g. ServiceNowのチケット)とかがあり、実装により様々。

    MCPサーバーに`resources/list`リクエストを送るとリソースのリストがもらえて、`resources/read`リクエストでリソースのコンテンツを取得できる。
    MCPクライアントとMCPサーバーとのセッションが開始された後にリソースが増減した場合、MCPサーバーから`notifications/resources/list_changed`通知を送ることができる。
    MCPクライアントは`resources/subscribe`リクエストを送って、特定のリソースの変更通知(`notifications/resources/updated`)を受け取ることができる。

    Toolsとは使い方が違っていて、MCPホストからユーザーにリソースリストを提示して、ユーザーに選んでもらったリソースを取得してLLMに渡す、みたいな用途が想定されている。

* [Resource Templates](https://modelcontextprotocol.io/specification/2025-06-18/server/resources#resource-templates)

    **MCPクライアントにリソースのURIのパターンを提供する機能。**
    パターンの形式は[URI Template](https://datatracker.ietf.org/doc/html/rfc6570)に準拠。

    例えば`file:///{path}`というパターンなら、MCPサーバーが動くファイルシステム上の`{path}`で指定されたファイルに、MCPクライアントからリソースとしてアクセスできるという感じ。

* [Prompts](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts)

    **MCPクライアントにプロンプトを提供する機能。**

    MCPサーバーに`prompts/list`リクエストを送るとリソースのリストがもらえて、`prompts/get`リクエストでプロンプトを取得できる。
    リクエストのパラメータで渡された値を、レスポンスのプロンプトに埋め込むこともできる。
    MCPクライアントとMCPサーバーとのセッションが開始された後にリソースが増減した場合、MCPサーバーから`notifications/prompts/list_changed`通知を送ることができる。

    これもResources同様、MCPホストからユーザーにプロンプトリストを提示して、ユーザーに選んでもらったプロンプトを取得してLLMに渡す、みたいな用途が想定されている。

    プロンプトは基本的にテキスト形式だけど、一応プロトコル上は画像や音声を提供することもできる。

* [Completion](https://modelcontextprotocol.io/specification/2025-06-18/server/utilities/completion)

    Resource TemplatesのURI Templateのパラメータの値とか、Promptsに埋め込むパラメータ名の **入力補完(オートコンプリート)を実現するための機能。**

    `completion/complete`というリクエストで、補完する対象のパラメータとユーザの入力値をMCPサーバーに送ると、入力補完候補のリストを取得できる。

* [Logging](https://modelcontextprotocol.io/specification/2025-06-18/server/utilities/logging)

    **MCPクライアントにログを送る機能。**

    ログは`notifications/message`という通知で送る。
    MCPクライアントは`logging/setLevel`リクエストを送って、ログレベルを設定することができる。

* [Pagination](https://modelcontextprotocol.io/specification/2025-06-18/server/utilities/pagination)

    `*/list`系のリクエストでは、カーソルを指定して、**レスポンスのページネーションができる。**

### MCPのクライアント機能
MCPは **サーバーとクライアントとの双方向のやりとり** ができるようになっていて、サーバーからクライアントにリクエストを送り、クライアントからサーバーにレスポンスを返すような機能(クライアント機能)もある。

MCPのクライアント機能には以下がある。

* [Roots](https://modelcontextprotocol.io/specification/2025-06-18/client/roots)

    **MCPサーバーに、サーバーがアクセスしていいディレクトリ(roots)を知らせる機能。**

    MCPクライアントに`roots/list`リクエストを送るとディレクトリのリストがもらえる。
    MCPクライアントとMCPサーバーとのセッションが開始された後にrootsが増減した場合、MCPクライアントから`notifications/roots/list_changed`通知を送ることができる。

* [Sampling](https://modelcontextprotocol.io/specification/2025-06-18/client/sampling)

    **MCPサーバーがMCPホスト側のLLMを利用するための機能。** samplingは、補完(completion)や生成(generation)を包含した言葉。

    MCPサーバーにAIエージェントみたいな、自然言語を扱う処理をさせたいけど、MCPサーバー提供者がLLMを用意できなかったりLLM利用費を持ちたくなかったするときに使える、と思う。
    MCPクライアントに`sampling/createMessage`リクエストでプロンプトを送ると、MCPホストのLLMでレスポンスを作ってMCPサーバーに返してくれる、という感じ。

* [Elicitation](https://modelcontextprotocol.io/specification/2025-06-18/client/elicitation)

    **MCPサーバーがMCPホストのユーザーに追加の情報を要求するための機能。** elicitationは情報を引き出すみたいな意味。

    MCPクライアントに`elicitation/create`リクエストでメッセージを送ると、MCPホストがユーザーにそのメッセージを表示してユーザーの入力を受け取り、MCPクライアントからその入力をMCPサーバーに返す、という感じに動く。

### MCPのユーティリティ機能
MCPサーバ、MCPクライアントのどちらからでもリクエストできる機能もある。
そのような機能をここではユーティリティ機能と呼ぶ。

ユーティリティ機能には以下がある。

* [Ping](https://modelcontextprotocol.io/specification/2025-06-18/basic/utilities/ping)

    **他方のコンポーネントの生死確認する機能。**

    `ping`リクエストを送って、他方がレスポンスを返せば生きているということ。

* [Progress](https://modelcontextprotocol.io/specification/2025-06-18/basic/utilities/progress)

    どちらかのコンポーネントが送ったリクエストを他方が処理中に、**その処理の進捗をリクエスト元に通知するための機能。**

    リクエスト元が任意のリクエストオブジェクトに`progressToken`を入れて送ると、他方が`notifications/progress`という通知で、処理の全量(`total`)と完了した量(`progress`)を数値で知らせることができる。通知には進捗メッセージを入れることもできる。

* [Cancellation](https://modelcontextprotocol.io/specification/2025-06-18/basic/utilities/cancellation)

    どちらかのコンポーネントが送ったリクエストを他方が処理中に、**その処理の中断を要求する機能。**

    リクエスト元が`notifications/cancelled`という通知を送ると、他方は処理を中断して、レスポンスを返さない。
    通知名が **cancelled** となってるのは、ユーザーがキャンセルしたよ、ということを通知する意味合い。

<br>

以上のようにMCPには結構たくさん機能があるが、Tools以外はあまり実装例を見ない。
Resourcesはたまに見るくらいで、Elicitationは[Azure MCPサーバー](https://learn.microsoft.com/ja-jp/azure/developer/azure-mcp-server/)が使ってるのを見た、くらい。
PromptsはクライアントとしてはClaude Codeとかが対応しているけど、実装しているサーバーはあまり見た覚えがない。

ということで、自分でMCPサーバーとクライアントを実装して動きを確かめてみた。
題材はズンドコキヨシ。
その実装についてはまた別の記事で。
