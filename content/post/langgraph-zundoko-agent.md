+++
categories = ["Programming"]
title = "ズンドコキヨシ with LangGraph/LangChain - ズンドコキヨシするLLMマルチエージェントをつくった"
date = "2024-08-20T23:26:18+09:00"
tags = ["GenAI", "Groq", "OpenAI", "GPT", "LangChain", "LangGraph", "zundoko"]
draft = false
cover = "langgraph.svg"
slug = "langgraph-zundoko-agent"
highlight = true
highlightStyle = "monokai"
highlightLanguages = []
+++

[氷川きよしの芸能活動復帰](https://www.sanspo.com/article/20240817-A5S3KZHL3JJVDISUST7Q7DIC5Y/)を記念して、LangGraphとLangChainでズンドコキヨシするLLMマルチエージェントを作った話し。

<!--more-->

<blockquote class="twitter-tweet" data-lang="ja"><p lang="ja" dir="ltr">Javaの講義、試験が「自作関数を作り記述しなさい」って問題だったから<br>「ズン」「ドコ」のいずれかをランダムで出力し続けて「ズン」「ズン」「ズン」「ズン」「ドコ」の配列が出たら「キ・ヨ・シ！」って出力した後終了って関数作ったら満点で単位貰ってた</p>&mdash; てくも (@kumiromilk) <a href="https://twitter.com/kumiromilk/status/707437861881180160">2016年3月9日</a></blockquote>
<script async src="//platform.twitter.com/widgets.js" charset="utf-8"></script>

{{< google-adsense >}}

# LangGraphとは
[LangGraph](https://langchain-ai.github.io/langgraph/)はLLMエージェントを開発するためのライブラリで、[LangChain](https://www.langchain.com/langchain)とシームレスに統合できる。

[以前の記事](https://www.kaitoy.xyz/2024/07/24/langchain-k8s-agent/)で使ったLangChainの[Agents](https://python.langchain.com/v0.2/docs/concepts/#agents)という機能でもLLMエージェントを作れるけど、Agentsは現時点で非推奨になっていて、LangGraphへの移行が推奨されている。
LangGraphのほうがより柔軟に処理を書ける。

LangChainではDAG状の、つまり有限の一方向の処理しか書けないのに対して、LangGraphでは循環グラフ状の処理を書けるのが大きな特徴。
[ReAct](https://react-lm.github.io/)みたいな、考えて、ツールで情報収集して、それをもとにまた考えて、みたいな、サイクリックなLLMエージェントを柔軟に書ける。

LangGraphのエージェントでもAgentsと同様に、LangChainの[Tool](https://python.langchain.com/v0.2/docs/integrations/tools/)や[Toolkit](https://python.langchain.com/v0.2/docs/integrations/toolkits/)を利用できるんだけど、今回はそれらビルトインのツールの代わりに[カスタムツール](https://python.langchain.com/v0.2/docs/how_to/custom_tools/)を作って使ってみる。

# LangGraphの仕組み
LangGraphでは、[State](https://langchain-ai.github.io/langgraph/concepts/low_level/#state)と[Node](https://langchain-ai.github.io/langgraph/concepts/low_level/#nodes)を定義して、Node間を[Edge](https://langchain-ai.github.io/langgraph/concepts/low_level/#edges)でつなぐことで、エージェントの処理フローを表すグラフを定義する。
Edgeは、Stateの内容を見たり見なかったりして、次にどのNodeを実行するか(activeにするか)を決定する。

StateはTypedDictかPydanticのモデルのオブジェクトで、基本はグラフにつき一つ定義する。

NodeはStateを受け取って、Stateを更新するパッチを返す関数(もしくはその処理をする[Runnable](https://python.langchain.com/v0.2/docs/concepts/#runnable-interface))。
Nodeが返すのはStateと同じ型のオブジェクトだけど、更新対象の属性にだけ値をいれたもので、グラフのStateはデフォルトではその属性で上書きされる。
Stateの属性ごとに[Reducer](https://langchain-ai.github.io/langgraph/concepts/low_level/#reducers)を設定しておくこともできて、設定された場合は、Nodeが返した属性はReducerで処理された後でStateにマージされる。

LangGraphのグラフはLangChainのRunnableを実装していて、`invoke`すると[START Node](https://langchain-ai.github.io/langgraph/concepts/low_level/#start-node)から実行を開始し、[End Node](https://langchain-ai.github.io/langgraph/concepts/low_level/#end-node)に達すると処理終了し、最終的なStateを返す。

エージェントの実行結果は、この最終的なStateから取り出せる。

# Zundokoエージェント
ここから実際に、ズンドコキヨシを実行するZundokoエージェントを作っていく。
今回実装するグラフは以下の形。

![graph.png](/images/langgraph-zundoko-agent/graph.png)

NodeはSTART NodeとEnd Nodeのほかは`agent`と`tools`だけ。
点線がStateによって条件分岐するEdgeで、実線が無条件のEdge。

処理は`agent`から始まり、以下のように流れる。

1. `agent`ではLLMでズンドコキヨシのやり方を解釈し、ズンかドコを生成するために`tools`に遷移する。
2. `tools`では、カスタムツールでLLMを呼んでズンかドコを生成し、`agent`に遷移する。
3. `agent`ではキヨシ判定をして、判定できたら「キ・ヨ・シ！」を出力してEnd Nodeに遷移して終わる。判定できなかったら再度`tools`に遷移する。

ステップ#1のLLMにはOpenAIの安くて速いモデルの[GPT-4o mini](https://openai.com/index/gpt-4o-mini-advancing-cost-efficient-intelligence/)を使う。

ステップ#2のカスタムツールでは、何度もLLMを呼ぶので、現時点で無料でAPIが使える[Groq](https://groq.com/)のモデルである[Meta Llama 3 8B](https://console.groq.com/docs/models#meta-llama-3-8b)を使う。

複数のLLMを強調させるので、一応[マルチエージェント](https://abvijaykumar.medium.com/multi-agent-architectures-e09c53c7fe0d)と言えよう。

使う主なPythonモジュールは以下。

- LangChain 0.2.14
- LangGraph 0.2.4
- openai 1.40.8
- langchain-openai 0.1.21
- langchain-groq 0.1.9


これらは以下のコマンドでインストールできる。

```console
$ pip install langchain langgraph openai langchain-openai langchain-groq
```

ちなみにPythonのバージョンは3.12.3。

<br>

完成したコードは[GitHub](https://github.com/kaitoy/zundoko-agent)に置いた。

## Zundokoアウトプットパーサ
今回、ズンとドコはGroqのLLMで生成するんだけど、事前に試しにGroqのGUIから生成させてみたら以下のようになった。

![groq.png](/images/langgraph-zundoko-agent/groq.png)

プロンプトで「ズンかドコだけで回答してください」と指示しても、妙にテンションが高いようで、「!」や絵文字を含めて回答してくるので、そこから「ズン」か「ドコ」だけを抽出しないといけない。
そのためにまず、LLMの出力を変換する[カスタムアウトプットパーサ](https://python.langchain.com/v0.2/docs/how_to/output_parser_custom/)として、Zundokoアウトプットパーサを作る。

カスタムアウトプットパーサの一番簡単な実装は、以下のように、LLMの出力を表す[AIMessage](https://api.python.langchain.com/en/latest/messages/langchain_core.messages.ai.AIMessage.html)を受け取り、パースした結果を返す関数を定義するだけ。

`app/output_parsers/zundoko_parser.py`:

```python
from langchain_core.exceptions import OutputParserException
from langchain_core.messages import AIMessage


def parse_zundoko(ai_message: AIMessage) -> str:
    content = ai_message.content
    if isinstance(content, str):
        if content.find("ズン") >= 0:
            print("ズン")
            return "ズン"
        if content.find("ドコ") >= 0:
            print("ドコ")
            return "ドコ"
        raise OutputParserException(f"Can't parse AIMessage with non-zundoko content: {ai_message}")
    else:
        raise OutputParserException(f"Can't parse AIMessage with content the type of which is not str: {ai_message}")
```

`AIMessage`の`content`属性にLLMの回答内容がstring(など)で入ってくるので、そこから「ズン」か「ドコ」を抽出する。

ついでにズンドコを標準出力に出しておく。

## Zundoko生成ツール
次に、Groqを使ってズンドコを生成して返すカスタムツールを作る。

カスタムツールの一番簡単な実装は、LangChainの[toolデコレータ](https://api.python.langchain.com/en/latest/tools/langchain_core.tools.tool.html)を付けた関数を定義するだけ。
このデコレータが、単なる関数をLangChainのツールにしてくれて、関数名からツール名を設定し、関数のdocstringからツールのdescriptionを設定してくれる。

GroqのLLMの呼び出しには、LangChainの[チャットモデルAPI](https://python.langchain.com/v0.2/docs/concepts/#chat-models)の[ChatGroq](https://python.langchain.com/v0.2/docs/integrations/chat/groq/)が使える。
これに前節で作ったZundokoアウトプットパーサをつなげてchainを作り、プロンプトを与えて`invoke`すればズンドコを生成できる。

Zundokoアウトプットパーサは単なる関数なんだけど、LCELでつなぐと自動で[RunnableLambda](https://api.python.langchain.com/en/latest/runnables/langchain_core.runnables.base.RunnableLambda.html)でラップされるので、chainのなかでRunnableとして機能できる。

`app/tools/zundoko.py`:

```python
from langchain_core.tools import tool
from langchain_groq import ChatGroq
from output_parsers.zundoko_parser import parse_zundoko

_llm = ChatGroq(
    model="llama3-8b-8192",
    temperature=0,
)
_chain = _llm | parse_zundoko

@tool
def zundoko() -> str:
    """ズンかドコを取得する。"""
    return _chain.invoke([
        ("system", "ズンかドコだけで回答してください。"),
        ("human", "ズンかドコのどちらかをランダムに返してください。"),
    ])
```

## グラフ定義
次はLangGraphでグラフを定義する。
最初のほうにも貼ったけど、定義したいのは以下のようなグラフ。

![graph.png](/images/langgraph-zundoko-agent/graph.png)

LangGraphでグラフ全体を表すクラスは[StateGraph](https://langchain-ai.github.io/langgraph/concepts/low_level/#stategraph)。
これにStateのスキーマを渡してインスタンス化することからLangGraphのグラフ定義は始まる。

グラフのStateには、LangGraphに組み込みの[MessagesState](https://github.com/langchain-ai/langgraph/blob/0.2.4/libs/langgraph/langgraph/graph/message.py#L150)を使って、LLMの入出力のメッセージのリストを履歴として保管するようにする。
MessagesStateは具体的には、`{ messages: list[Union[AIMessage, HumanMessage, ...]] }`というような型の、`messages`というキーだけ持ったdict。
(実はMessagesStateを使うなら、StateGraphの代わりに[MessageGraph](https://langchain-ai.github.io/langgraph/concepts/low_level/#messagegraph)を使うとちょっとだけ楽だけど、StateGraphのほうが汎用的なので今回はこちらを使う。)

agent Nodeでは、OpenAIの[Function calling](https://platform.openai.com/docs/guides/function-calling)機能を呼び出して、プロンプトとメッセージ履歴をもとに、実行するツールとツールの引数を決める処理をする。
OpenAI(など)のFunction callingは、LangChainの[Tool calling](https://python.langchain.com/v0.1/docs/modules/model_io/chat/function_calling/)機能で簡単に呼び出すことができる。

Tool calling機能は、LangChainのチャットモデルAPI(OpenAIの場合は[ChatOpenAI](https://python.langchain.com/v0.2/docs/integrations/chat/openai/))に実装されている`bind_tools()`に使いたいツールを渡すだけで使える。
`bind_tools()`したLLMを`invoke`すると、どのツールを呼ぶべきかを表す[ToolCall](https://api.python.langchain.com/en/latest/messages/langchain_core.messages.tool.ToolCall.html#langchain_core.messages.tool.ToolCall)オブジェクトを含むメッセージ返してくれるので、それをagent Nodeから出力してStateを更新する。

agent NodeからのびるEdgeでは、agent Nodeの最新の出力メッセージにToolCallが含まれていれば、ツールを実行する必要があると判定してtools Nodeに遷移し、含まれてなければ最終回答を得たと判定してEND Nodeに遷移する。
このような条件分岐するEdgeは、[StateGraph.add_conditional_edges()](https://langchain-ai.github.io/langgraph/reference/graphs/#langgraph.graph.StateGraph.add_conditional_edges)に、遷移先のNode名を返す関数を渡してやれば定義できる。

tools Nodeでは、Stateの最新メッセージからToolCallを取得して、それに従って実際にツールを実行し、その結果をメッセージとして返し、Stateを更新する。
ToolCallをもとにツールを実行するNodeは、LangGraphに組み込みの[ToolNodeクラス](https://langchain-ai.github.io/langgraph/reference/prebuilt/#toolnode)で使いたいツールをラップするだけで定義できる。
今回使うツールは、前節で実装したZundoko生成ツールだけ。

tools Nodeからagent Nodeへ無条件に遷移するEdgeは、[StateGraph.add_edge()](https://langchain-ai.github.io/langgraph/reference/graphs/#langgraph.graph.StateGraph.add_edge)に遷移前後のNodeの名前を渡すことで定義できる。

START NodeとEND Nodeは自分で定義したりグラフに追加する必要はなく、それらに出入りするEdgeだけ定義してやればいい。
START Nodeから最初に実行するNode (i.e. agent Node)へのEdgeの定義は、上記`StateGraph.add_edge()`でもできるけど、[StateGraph.set_entry_point()](https://langchain-ai.github.io/langgraph/reference/graphs/#langgraph.graph.StateGraph.set_entry_point)というシンタックスシュガーが用意されているので、こちらを使う。`StateGraph.set_entry_point()`には遷移先のNode名を渡すだけでいい。

<br>

以上を踏まえた実際の実装が以下。

`app/main.py`:

```python
from langchain_core.runnables import RunnableLambda
from langchain_openai import ChatOpenAI
from langgraph.graph import END, MessagesState, StateGraph
from langgraph.prebuilt import ToolNode
from tools.zundoko import zundoko

tools = [zundoko]
tool_node = ToolNode(tools)

llm = ChatOpenAI(model="gpt-4o-mini").bind_tools(tools)
agent_node = RunnableLambda(
    lambda state: {"messages": [llm.invoke(state["messages"])]}
)

graph = StateGraph(MessagesState)
graph.add_node("agent", agent_node)
graph.add_node("tools", tool_node)
graph.set_entry_point("agent")
graph.add_conditional_edges(
    "agent",
    lambda state: "tools" if state["messages"][-1].tool_calls else END,
)
graph.add_edge("tools", "agent")

zundoko_agent = graph.compile()

final_state = zundoko_agent.invoke({
    "messages": ["ズンかドコを5つ取得して"]
})

print(final_state["messages"][-1].content)
```

グラフを定義した後`StateGraph.compile()`してるけど、これはグラフ構造のバリデーションとかをして、Runnableに変換してくれるメソッド。
`compile()`時に[Checkpointer](https://langchain-ai.github.io/langgraph/concepts/low_level/#checkpointer)とか[Breakpoint](https://langchain-ai.github.io/langgraph/concepts/low_level/#breakpoints)とかを設定できるみたいだけど、今回はやらない。

`compile()`してできたZundokoエージェントには、とりあえず試しに「ズンかドコを5つ取得して」というプロンプトを与えた。

まずはこれで実行してみる。

```console
$ export OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
$ export GROQ_API_KEY=gsk_yyyyyyyyyyyyyyyyyyyyyy
$ python app/main.py
ズン
ズン
ズン
ズン
ズン
取得したズンかドコは以下の通りです：

1. ズン
2. ズン
3. ズン
4. ズン
5. ズン

全て「ズン」でした！
```

<br>

すべてズンか…

## tools Node改善
Zundoko生成ツールにはズンかドコをランダムに生成してほしかったんだけど、うまく動かなかった。
Zundoko生成ツールには、ぱっと見て以下の2つの問題があるように見える。

1. ChatGroqの[temperature](https://www.promptingguide.ai/jp/introduction/settings)に`0`を指定しているが、これは最低値で、LLMの創造性・ランダム性が最小になっている。
2. プロンプトが単純すぎ。

一つ目の問題に対しては、temperatureを最大の`1`に設定してやることで改善できるはず。

二つ目の問題に対しては、ズンドコ生成履歴をプロンプトに与えることで、履歴をもとにズンドコの割合を忖度してもらうようにする。
ついでに、キヨシしやすいようにズンを多めにしてもらうことにする。


`app/tools/zundoko.py`の差分:

```diff
 _llm = ChatGroq(
     model="llama3-8b-8192",
-    temperature=0,
+    temperature=1,
 )
 _chain = _llm | parse_zundoko

+zundoko_history = []
+
 @tool
 def zundoko() -> str:
     """ズンかドコを取得する。"""
-    return _chain.invoke([
+    response = _chain.invoke([
         ("system", "ズンかドコだけで回答してください。"),
-        ("human", "ズンかドコのどちらかをランダムに返してください。"),
+        ("human", "ズンかドコのどちらかをランダムに返してください。以前の結果をもとに、ややズン多めでお願いします。"),
+        ("human", f"以前の結果: {zundoko_history}"),
     ])
+    zundoko_history.append(response)
+    return response
```

<br>

ただし、このズンドコ生成履歴の仕組みは、ズンドコ生成ツールがシーケンシャルに呼ばれることを前提にしていて、そこにまた課題がある。

agent Nodeが「ズンかドコを5つ取得して」というプロンプトに対して、ズンドコ生成ツールに対するToolCallを5個一度に生成することがあって、その場合、ToolNodeは全ToolCallを並列に処理してしまう。
ToolNodeのこの挙動を変える設定は今のところない。

## ToolNodeでツールをシーケンシャルに実行させる
LangChainのツールはRunnableなんだけど、Runnableには[RunnableConfig](https://api.python.langchain.com/en/latest/runnables/langchain_core.runnables.config.RunnableConfig.html)という設定があって、[Runnable.with_config()](https://python.langchain.com/v0.2/docs/how_to/lcel_cheatsheet/#runnablewith_config)で設定値を指定することで挙動を変えることができる。

この設定の一つに`max_concurrency`というのがあって、1に設定すればRunnableの並列実行を防げる。
これをズンドコ生成ツールに設定してみる。

`app/tools/zundoko.py`の差分:

```diff
-@tool
 def zundoko() -> str:
     """ズンかドコを取得する。"""
     response = _chain.invoke([
         ("system", "ズンかドコだけで回答してください。"),
         ("human", "ズンかドコのどちらかをランダムに返してください。以前の結果をもとに、ややズン多めでお願いします。"),
         ("human", f"以前の結果: {zundoko_history}"),
     ])
     zundoko_history.append(response)
     return response

+zundoko = tool(zundoko).with_config({"max_concurrency": 1})
```

結論から言えば、この修正はだめだった。実行時に以下のエラーになる。
理由はよくわからないけど、とにかくtoolデコレータはRunnableConfigを渡せるようになってないっぽい。

```console
$ python app/main.py
Traceback (most recent call last):
  File "/root/zundoko-agent/app/main.py", line 8, in <module>
    tool_node = ToolNode(tools).with_config({"max_concurrency": 1})
                ^^^^^^^^^^^^^^^
  File "/root/zundoko-agent/zundoko-agent/lib/python3.12/site-packages/langgraph/prebuilt/tool_node.py", line 81, in __init__
    tool_ = create_tool(tool_)
            ^^^^^^^^^^^^^^^^^^
  File "/root/zundoko-agent/zundoko-agent/lib/python3.12/site-packages/langchain_core/tools/convert.py", line 224, in tool
    raise ValueError("Too many arguments for tool decorator")
ValueError: Too many arguments for tool decorator
```

<br>

別のアプローチを探る。

ToolNodeのソースをみると、複数のToolCallを処理するとき、[RunnableConfigのmax_concurrencyの値をmax_workersにセットしたContextThreadPoolExecutorをつくり](https://github.com/langchain-ai/langchain/blob/75c3c81b8c3fe534bcdc1ebbc2147b41079156e0/libs/core/langchain_core/runnables/config.py#L552)、[それで並列実行](https://github.com/langchain-ai/langgraph/blob/0.2.4/libs/langgraph/langgraph/prebuilt/tool_node.py#L90)していた。
そのRunnableConfigがどこからくるかというと、ToolNode自体のRunnableConfigが渡ってきているようだったので、ToolNodeに`max_concurrency`を設定してやってもよさそう。
あまりきれいじゃないけど、今回はToolNodeで実行するのがズンドコ生成ツールだけなので特に問題ない。

([convert_runnable_to_tool](https://python.langchain.com/v0.2/api_reference/core/tools/langchain_core.tools.convert.convert_runnable_to_tool.html)というのがあったのでこれを使ったらもっときれいだったかも。)

`app/main.py`の差分:

```diff
 tools = [zundoko]
-tool_node = ToolNode(tools)
+tool_node = ToolNode(tools).with_config({"max_concurrency": 1})

 llm = ChatOpenAI(model="gpt-4o-mini").bind_tools(tools)
```

<br>

これで実行してみる。

```console
$ python app/main.py
ズン
ドコ
ズン
ズン
ズン
取得したズンかドコは以下の通りです：

1. ズン
2. ドコ
3. ズン
4. ズン
5. ズン

ご覧のように、ズンが多く取得されました。
```

ちょっとズンが多すぎな気がするがまあよし。

## Zundokoエージェント完成
最後にプロンプトをズンドコキヨシにする。

```diff
 zundoko_agent = graph.compile()

-final_state = zundoko_agent.invoke({
-    "messages": ["ズンかドコを5つ取得して"]
-})
+msg = """
+以下を実行してください。
+1. ズンかドコを一つだけ取得する。
+2. 直近で取得した5つのズンとドコを、取得した順に並べる
+3. その結果を確認し、はじめに4つのズンが連続し、最後がドコになっていたら「キ・ヨ・シ！」を出力した後終了する。そうでなければ最初の手順に戻る。
+"""
+final_state = zundoko_agent.invoke({"messages": msg}, {"recursion_limit": 50})

 print(final_state["messages"][-1].content)
```

プロンプトは、冒頭のツイートの内容を与えてもあまりうまく動いてくれなかったので、ステップを刻んでやってほしいことを正確に伝えるようにした。

また、ズンドコエージェントを`invoke()`するときに、RunnableConfigの`recursion_limit`をデフォルトの25より多めに設定して、キヨシ判定に至るまでズンドコできる猶予を増やした。
ちなみにキヨシ判定が遅れてNodeの実行回数が`recursion_limit`に至ると、以下のエラーになってしまう。

```text
langgraph.errors.GraphRecursionError: Recursion limit of 25 reached without hitting a stop condition. You can increase the limit by setting the `recursion_limit` config key.
```

<br>

これで実行してみる。

```console
$ python app/main.py
ドコ
ズン
ズン
ドコ
ズン
ズン
ズン
ズン
ズン
ズン
ズン
ドコ
取得したズンとドコの順番は以下の通りです：

1. ズン
2. ズン
3. ズン
4. ズン
5. ドコ

最初の4つがズンで、最後がドコですので、「キ・ヨ・シ！」を出力します。
```

なんかぎこちないけど一応ズンドコキヨシできた。

<br>

実際のところ、何度か試した結果、結構キヨシ判定を間違うことが多かったので、GPT-4o miniはズンドコキヨシに向いてなさそうという知見を得た。
