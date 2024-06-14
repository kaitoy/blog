+++
categories = ["Programming"]
title = "Webマニュアルから知識を得るLangChainのRAGをLangServeでWebサーバにする"
date = "2024-06-14T13:33:01+09:00"
tags = ["GenAI", "Ops I", "rag", "openai", "gpt", "langchain", "langserve"]
draft = false
cover = "langchain.png"
slug = "langserve-opsi-agent"
highlight = true
highlightStyle = "monokai"
highlightLanguages = []
+++

日立製作所製の運用統合サービスであるOps IのWebマニュアルを、スクレイピングして、その結果をGPTに与えて、Ops Iユーザ向けAIアシスタントとして動くLLMアプリをLangChainとLangServeで作ってみた話。

<!--more-->

[前回の記事](https://www.kaitoy.xyz/2024/06/04/langchain-opsi-agent/)でLangChainのRAGは作ったので、それをLangServeでWebサーバにする。

{{< google-adsense >}}

# LangServeとは
[LangServe](https://python.langchain.com/v0.2/docs/langserve/)は、LangChainで作ったRunnableやchainをREST APIで呼び出せるサーバを簡単に書けるライブラリ。
具体的には、[add_routes](https://python.langchain.com/v0.2/docs/langserve/#2-define-the-runnable-in-add_routes-go-to-serverpy-and-edit)という関数が提供され、それにRunnableやchainを与えると[FastAPI](https://fastapi.tiangolo.com/)のAPIを定義してくれる。

FastAPIが[Pydantic](https://docs.pydantic.dev/latest/)に対応してるので、add_routesで定義したAPIは入力のバリデーションしてくれたり、Swagger UIで見れたりして便利。

定義したAPIは、LangServeの[Playground](https://python.langchain.com/v0.2/docs/langserve/#playground)というGUIで手軽に試すこともできる。

# Ops Iとは
Ops Iは[JP1 Cloud Service/Operations Integration](https://www.hitachi.co.jp/Prod/comp/soft1/jp1/feature/jp1_cloud_operations_integration/index.html)の略で、日立製作所製の運用統合サービス。

Operations as Codeが特長で、運用自動化コードやワークフローをGitで集約管理して、ハイブリッド環境における様々なシステム運用の自動化と統合を推進できる。

<br>

{{< youtube arzY4xQlUb0 >}}

<br>

# Ops Iエージェントサーバ
ここから、Ops Iユーザ向けAIアシスタントとして動くLLMアプリケーションサーバであるOps Iエージェントサーバを作っていく。
使う主なモジュールは以下。

- LangChain 0.2.1
- LangServe 0.2.1
- FastAPI 0.111.0
- Uvicorn 0.29.0

完成したコードは[GitHub](https://github.com/kaitoy/opsi-agent)に置いた。

## LangChainのchainをLangServeに乗せる
[前回の記事で作ったchain](https://www.kaitoy.xyz/2024/06/04/langchain-opsi-agent/#retriever%E3%81%A8chain%E3%82%92%E3%81%A4%E3%81%AA%E3%81%90)をLangServeでWeb APIから呼べるようにする。

まずはLangServeと、それが依存するFastAPIをインストールする。
FastAPIはASGIアプリのフレームワークで、動かすにはASGIサーバが必要なので、[Uvicorn](https://www.uvicorn.org/)も入れる。

```console
$ pip install langserve[server] fastapi uvicorn[standard]
```

あとは、FastAPIのインスタンスを作って、chainを`add_routes()`して、`uvicorn.run()`するだけ。

```python
import nest_asyncio
import uvicorn
from fastapi import FastAPI
from langchain.chains import create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.indexes import VectorstoreIndexCreator
from langchain.text_splitter import CharacterTextSplitter
from langchain_community.document_loaders.sitemap import SitemapLoader
from langchain_community.vectorstores.inmemory import InMemoryVectorStore
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langserve import add_routes


nest_asyncio.apply()

text_splitter = CharacterTextSplitter(
    separator = "\n",
    chunk_size = 400,
    chunk_overlap = 0,
    length_function = len,
)

loader = SitemapLoader(web_path="https://itpfdoc.hitachi.co.jp/manuals/JCS/JCSM71020002/sitemap.xml")

index = VectorstoreIndexCreator(
    vectorstore_cls=InMemoryVectorStore,
    embedding=OpenAIEmbeddings(),
    text_splitter=text_splitter,
).from_loaders([loader])

retriever = index.vectorstore.as_retriever()

prompt = ChatPromptTemplate.from_messages([
    (
        "system",
        """contextに基づいて、Ops Iの質問になるべく頑張って答えてください。ただし、Ops Iと関係ない質問に対しては、知るかボケと回答してもいいです:

<context>
{context}
</context>
"""
    ),
    (
        "human",
        "質問: {input}"
    )
])
llm = ChatOpenAI(model="gpt-3.5-turbo")
chain = create_retrieval_chain(retriever, create_stuff_documents_chain(llm, prompt))

app = FastAPI(
    title="Ops I Assistant",
    version="1.0",
    description="Ops I Assistant",
)
add_routes(
    app,
    chain,
    path="/opsi",
)

uvicorn.run(app, host="localhost", port=8080)
```

(前回の記事のコードからの差分は[これ](https://github.com/kaitoy/opsi-agent/commit/6f2cd6c65599ee505efca4570e3ef02609c61089))

これを実行すると、Ops Iエージェントサーバが起動する。

```console
$ export OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
$ python main.py
Fetching pages: 100%|################################################################| 122/122 [00:08<00:00, 14.21it/s]
INFO:     Started server process [9380]
INFO:     Waiting for application startup.

 __          ___      .__   __.   _______      _______. _______ .______     ____    ____  _______
|  |        /   \     |  \ |  |  /  _____|    /       ||   ____||   _  \    \   \  /   / |   ____|
|  |       /  ^  \    |   \|  | |  |  __     |   (----`|  |__   |  |_)  |    \   \/   /  |  |__
|  |      /  /_\  \   |  . `  | |  | |_ |     \   \    |   __|  |      /      \      /   |   __|
|  `----./  _____  \  |  |\   | |  |__| | .----)   |   |  |____ |  |\  \----.  \    /    |  |____
|_______/__/     \__\ |__| \__|  \______| |_______/    |_______|| _| `._____|   \__/     |_______|

LANGSERVE: Playground for chain "/opsi/" is live at:
LANGSERVE:  │
LANGSERVE:  └──> /opsi/playground/
LANGSERVE:
LANGSERVE: See all available routes at /docs/

LANGSERVE: ⚠️ Using pydantic 2.7.1. OpenAPI docs for invoke, batch, stream, stream_log endpoints will not be generated. API endpoints and playground should work as expected. If you need to see the docs, you can downgrade to pydantic 1. For example, `pip install pydantic==1.10.13`. See https://github.com/tiangolo/fastapi/issues/10360 for details.

INFO:     Application startup complete.
INFO:     Uvicorn running on http://localhost:8080 (Press CTRL+C to quit)
```

<br>

Pydanticがv1じゃないとOpenAPIドキュメントが生成されないといった警告が出てるけど、API実行には影響ないのでほっておく。

chainは`/opsi`というパスに追加したので、それをinvokeするには`/opsi/invoke`にchainの入力パラメータをPOSTしてやればいい。
入力パラメータはリクエストボディのJSONの`input`キーにセットする。

```console
$ curl -XPOST -H 'Content-Type:application/json' -d '{"input": {"input": "Ops Iの機能を教えて"}}' http://localhost:8080/opsi/invoke
Internal Server Error
```

サーバエラーになった。

サーバのコンソールには以下のメッセージが出ている。

```console
INFO:     ::1:51421 - "POST /opsi/invoke HTTP/1.1" 500 Internal Server Error
ERROR:    Exception in ASGI application

(snip)

  File "/home/kaitoy/.venv/lib/python3.12/site-packages/langchain/chains/retrieval.py", line 61, in <lambda>
    retrieval_docs = (lambda x: x["input"]) | retriever
                                ~^^^^^^^^^
KeyError: 'input'
```

chainの最初のRetrieverに渡された入力に、`input`というキーがなかったというエラー。

確かに、Playgroundを見ても、`input`という入力パラメータが表示されない。

![playground1.png](/images/langserve-opsi-agent/playground1.png)

<br>

chainからは入力パラメータの型がPydanticスキーマとしてとれて、FastAPIがPydanticのスキーマからAPIのリクエストボディを推論してくれるので、基本はchainをそのままFastAPIに渡せば期待通りに動くんだけど、今回のchainからは正しい型が取れないっぽい。
どうも、chainを作るときに使った[create_retrieval_chain](https://api.python.langchain.com/en/latest/chains/langchain.chains.retrieval.create_retrieval_chain.html)が内部で[RunnablePassthrough](https://api.python.langchain.com/en/latest/runnables/langchain_core.runnables.passthrough.RunnablePassthrough.html)を使っていて、[それが原因の模様](https://github.com/langchain-ai/langserve/discussions/353#discussioncomment-7968297)。

## LangChainのchainに入力型を付ける
chain(というかRunnable)には型を明示的に付けるインターフェースが用意されてるので、それを使う。

```python
import nest_asyncio
import uvicorn
from fastapi import FastAPI
from langchain.chains import create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.indexes import VectorstoreIndexCreator
from langchain.pydantic_v1 import BaseModel
from langchain.text_splitter import CharacterTextSplitter
from langchain_community.document_loaders.sitemap import SitemapLoader
from langchain_community.vectorstores.inmemory import InMemoryVectorStore
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langserve import add_routes


nest_asyncio.apply()

text_splitter = CharacterTextSplitter(
    separator = "\n",
    chunk_size = 400,
    chunk_overlap = 0,
    length_function = len,
)

loader = SitemapLoader(web_path="https://itpfdoc.hitachi.co.jp/manuals/JCS/JCSM71020002/sitemap.xml")

index = VectorstoreIndexCreator(
    vectorstore_cls=InMemoryVectorStore,
    embedding=OpenAIEmbeddings(),
    text_splitter=text_splitter,
).from_loaders([loader])

retriever = index.vectorstore.as_retriever()

prompt = ChatPromptTemplate.from_messages([
    (
        "system",
        """contextに基づいて、Ops Iの質問になるべく頑張って答えてください。ただし、Ops Iと関係ない質問に対しては、知るかボケと回答してもいいです:

<context>
{context}
</context>
"""
    ),
    (
        "human",
        "質問: {input}"
    )
])
llm = ChatOpenAI(model="gpt-3.5-turbo")
chain = create_retrieval_chain(retriever, create_stuff_documents_chain(llm, prompt))

class ChainInput(BaseModel):
    input: str
app = FastAPI(
    title="Ops I Assistant",
    version="1.0",
    description="Ops I Assistant",
)
add_routes(
    app,
    chain.with_types(input_type=ChainInput),
    path="/opsi",
)

uvicorn.run(app, host="localhost", port=8080)
```

(前節コードからの差分は[これ](https://github.com/kaitoy/opsi-agent/commit/03978fe9cb7ad7abc5814a2fdf37f6b1ec94b07e))

上のコードで、ChainInputというPydanticスキーマを定義して、chainの`with_types()`に渡すことでchainの入力型を明示している。

これで起動して、invoke APIを呼んだらちゃんと動いた。

```console
$ curl -XPOST -H 'Content-Type:application/json' -d '{"input": {"input": "Ops Iの機能を教えて"}}' http://localhost:8080/opsi/invoke
{"output":{"input":"Ops Iの機能を教えて","answer":"Ops Iの機能は、基本的な画面構成、アカウント管理、タスク、リクエスト、サービスカタログ、ワークフロー、チケットなどがあります。これらの機能を活用することで、システム運用に必要な作業の管理や要員のスケジュール管理が効率的に行えます。"},"metadata":{"run_id":"d9d19e5b-05de-44c6-8cd8-a5f597a15a70","feedback_tokens":[]}}
```

<br>

Playgroundにも`input`入力欄が表示されて、クエリ実行できた。


![playground1.png](/images/langserve-opsi-agent/playground2.png)
