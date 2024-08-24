+++
categories = ["Programming"]
title = "Webマニュアルから知識を得るRAGをLangChainで作る"
date = "2024-06-04T22:22:01+09:00"
tags = ["GenAI", "Ops I", "rag", "OpenAI", "GPT", "LangChain"]
draft = false
cover = "langchain.png"
slug = "langchain-opsi-agent"
highlight = true
highlightStyle = "monokai"
highlightLanguages = []
+++

日立製作所製の運用統合サービスであるOps IのWebマニュアルを、スクレイピングして、その結果をGPTに与えて、Ops Iユーザ向けAIアシスタントとして動くLLMアプリをLangChainで作ってみた話。

作っていくうちに、LangChainの思想やデータモデルについてなんとなく見えてきたので、そのあたりを交えて記す。

<!--more-->

[以前の記事の「GPT CrawlerとOpenAI Assistantsでシュッと作るAIアシスタント」](https://www.kaitoy.xyz/2024/01/07/gpt-crawler/)と実現したいことは同じだけど、そのとき使った[OpenAI Assistants](https://platform.openai.com/docs/assistants/overview)の代わりに、LangChainを使う。

{{< google-adsense >}}

# LangChainとは
[LangChain](https://www.langchain.com/langchain)は、LLMを使ったアプリケーションを開発するためのPythonのフレームワーク。
LangChainを使うと、GPTやClaudeなどの様々なLLMのAPIを一貫したインターフェースで扱えて、PDF、Word、Webサイトなどから情報を取得するRAGを簡単に構築できて、チャットモデルやLLMエージェントも開発できる。

[LangChain Expression Language (LCEL)](https://python.langchain.com/v0.2/docs/concepts/#langchain-expression-language-lcel)というのが特徴的な機能で、LLM実行やベクトルDBの検索や出力の成型など、様々な処理をどう組み合わせるかを宣言的に表現できる。
LCELでつなぎ合わせた一連の処理をchainという。例えば以下のように書ける。

```
chain = prompt | llm | output_parser
```

<br>

chainに組み込む個々の処理は[Runnableインターフェース](https://python.langchain.com/v0.2/docs/concepts/#runnable-interface)を実装していて、入力パラメータと出力パラメータを合わせればRunnable間を自由につなげるし、chainもRunnableになるのでchainを組み合わせることもできるし、さまざまな処理をするRunnableを一貫した方法で実行できる。

Runnableやchainの入出力の型は、型推論されて、Runnableのメソッドで[Pydantic](https://docs.pydantic.dev/latest/)のスキーマとして取得できるので、入出力のバリデーションに使えたり、Pydanticを使うほかのライブラリとの連携に使えたりする。

同様のフレームワークに[LlamaIndex](https://www.llamaindex.ai/open-source)があり、こちらはPythonのほかTypeScript版もある。

# Ops Iとは
Ops Iは[JP1 Cloud Service/Operations Integration](https://www.hitachi.co.jp/Prod/comp/soft1/jp1/feature/jp1_cloud_operations_integration/index.html)の略で、日立製作所製の運用統合サービス。

Operations as Codeが特長で、運用自動化コードやワークフローをGitで集約管理して、ハイブリッド環境における様々なシステム運用の自動化と統合を推進できる。

<br>

{{< youtube arzY4xQlUb0 >}}

<br>

[Ops Iのマニュアル](https://itpfdoc.hitachi.co.jp/manuals/JCS/JCSM71020001/index.html)は[Hugo](https://gohugo.io/)という静的サイトジェネレータで作られてWebサイトで公開されていて、sitemapもあるので、スクレイピングしやすい。

# Ops Iエージェント
ここから、Ops Iユーザ向けAIアシスタントとして動くLLMアプリであるOps Iエージェントを作っていく。
使う主なPythonモジュールは以下。

- LangChain 0.2.1
- langchain-community 0.2.1
- langchain-openai 0.1.7
- openai 1.30.3

<br>

完成したコードは[GitHub](https://github.com/kaitoy/opsi-agent)に置いた。

## LangChain入門
まずは、LangChain入門として、最小のLLMアプリを作ってみる。
LLMはOpenAIのを使うので、そのためのモジュールをインストールする。

```console
$ pip install langchain openai langchain-openai
```

<br>

コマンドライン入力を、安いGPT-3.5 Turboに投げて回答を表示するコードを書く。

```python
import sys

from langchain_openai import ChatOpenAI

input = sys.argv[1]

llm = ChatOpenAI(model="gpt-3.5-turbo")

response = llm.invoke(input)
print(response)
```

<br>

このコードで使っている[ChatOpenAI](https://python.langchain.com/v0.2/docs/integrations/chat/openai/)は、[Chat model](https://python.langchain.com/v0.2/docs/integrations/chat/)に分類されるクラス。
Chat modelは、OpenAIの[Chat Completions API](https://platform.openai.com/docs/guides/text-generation/chat-completions-api)を抽象化するために作られたAPIで、システムプロンプトやユーザプロンプトといったメッセージのリストを受け取り、回答を得るように設計されている。
LangChainはもともと、OpenAIのレガシーな[Completions API](https://platform.openai.com/docs/guides/text-generation/completions-api)を抽象化した[LLM API](https://python.langchain.com/v0.2/docs/integrations/llms/)を中心に、構造化されてないシンプルなテキストをやりとりするように設計されていたので、そういった古いAPIとの[相互運用性](https://blog.langchain.dev/chat-models/#how-do-these-align-with-our-objectives)のために、Chat modelは非構造化テキストも受け取れるようになっている。

上のコードで、ChatOpenAIをインスタンス化した`llm`がRunnableで、RunnableのAPIである`invoke`を実行することでChatGptにクエリを送信している。
ChatOpenAIはChat modelだけど、上記相互運用性の配慮のおかげで、コマンドプロンプトから受け取った非構造化テキストをそのまま渡せている。

このChatOpenAIを使うためのOpenAIのAPIキーは、環境変数の`OPENAI_API_KEY`に入れておけばいい。

```console
$ export OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
$ python main.py "Ops Iの機能を教えて"
content='Ops Iは、コンピューターシステムやネットワークの状態を監視し、問題が発生した際に自動で対処する機能を持つ自動化ツールです。具体的には、以下のような機能を持っています。\n\n1. システムの監視: ネットワークのトラフィック、サーバーの負荷 、データベースの応答時間などを監視し、問題が発生した際に通知します。\n\n2. 自動応答: 問題が発生した際に、設定された対処 方法を自動で実行することができます。例えば、サーバーの再起動や障害箇所の切り替えなど。\n\n3. インシデント管理: 発生した 問題や対処結果を記録し、過去のデータを元に解決策を改善することができます。\n\n4. レポーティング: 監視結果や対処結果をレ ポートとして出力することができ、システムの状態を把握しやすくなります。\n\n総じて、Ops Iはシステムの安定性や可用性を向上 させるための自動化ツールとして活用されます。' response_metadata={'token_usage': {'completion_tokens': 402, 'prompt_tokens': 18, 'total_tokens': 420}, 'model_name': 'gpt-3.5-turbo', 'system_fingerprint': None, 'finish_reason': 'stop', 'logprobs': None} id='run-e7a3e917-b864-4b61-9e73-4d1443dc6286-0'
```

Ops Iについては何も教えてないので、「Ops Iの機能を教えて」という質問に対してそれっぽい回答が得られたが、内容は全く間違ってる。

## シンプルなRAG
次に、Ops IのWebマニュアルをスクレイピングしてベクトルDBに入れて、それをもとに回答をつくるRAGを書いてみる。

ベクトルDBのインデックスは[VectorstoreIndexCreator](https://api.python.langchain.com/en/latest/indexes/langchain.indexes.vectorstore.VectorstoreIndexCreator.html)で構築できる。
ベクトルDBには今回はデフォルトの[InMemoryVectorStore](https://api.python.langchain.com/en/latest/vectorstores/langchain_community.vectorstores.inmemory.InMemoryVectorStore.html)を使うけど、[Chroma](https://www.trychroma.com/)とか[Faiss](https://faiss.ai/)とかも選べる。
embeddingモデルは[OpenAIのやつ](https://platform.openai.com/docs/guides/embeddings)を使う。

VectorstoreIndexCreatorは、[Document](https://python.langchain.com/v0.2/docs/concepts/#documents)オブジェクトにテキストをつめて渡してやると、チャンクに分割して、embeddingモデルに投げてベクトル化して、インデックスに保存してくれる。
Documentの代わりに、データソースからDocumentを読み取る[Document loader](https://python.langchain.com/v0.2/docs/concepts/#document-loaders)を渡すこともできるので、今回はその一種の[SitemapLoader](https://python.langchain.com/latest/docs/integrations/document_loaders/sitemap/)を使う。
Ops IのWebマニュアルサイトにはsitemapがあるので、SitemapLoaderでそのsitemapからWebページをたどってスクレイピングできる。

InMemoryVectorStoreやSitemapLoaderは`langchain`モジュールには入ってなくて、`langchain-community`のほうに入ってるのと、SitemapLoaderが[Beautiful Soup](https://www.crummy.com/software/BeautifulSoup/)とかに依存してるので、まずそれらをインストールする。

```
$ pip install langchain-community nest_asyncio lxml beautifulsoup4
```

<br>

RAGのコードは以下のように書いた。

```python
import sys

import nest_asyncio
from langchain.indexes import VectorstoreIndexCreator
from langchain.text_splitter import CharacterTextSplitter
from langchain_community.document_loaders.sitemap import SitemapLoader
from langchain_community.vectorstores.inmemory import InMemoryVectorStore
from langchain_openai import OpenAI, OpenAIEmbeddings

input = sys.argv[1]

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

response = index.query(input, OpenAI(temperature=0))
print(response)
```

このコードで、VectorstoreIndexCreatorの`from_loaders()`を実行した結果の`index`はRunnableではなく、`invoke`はできない。
代わりに、`query`というメソッドが生えてるので、そこにLLM APIのなんらかのクラスのインスタンスを渡して実行すると、チャットボットみたいな問い合わせができる。
今回はOpenAIのやつを使った。

<br>

このコードを実行すると以下のようになる。

```console
$ export OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
$ python main.py "Ops Iの機能を教えて"
Fetching pages: 100%|################################################################| 122/122 [00:08<00:00, 15.08it/s]
 Ops Iの機能には、アカウント管理、タスクやリクエストの管理、サービスカタログ、ワークフロー、チケットなどがあります。
```

Webマニュアルの知識を得て、正しい回答を得られた。

## Retriever
前節で使った`VectorstoreIndexCreator.from_loaders()`の結果の型は[VectorStoreIndexWrapper](https://api.python.langchain.com/en/latest/indexes/langchain.indexes.vectorstore.VectorStoreIndexWrapper.html)で、Runnableではないんだけど、その`vectorstore`という属性が[VectorStore](https://api.python.langchain.com/en/latest/vectorstores/langchain_core.vectorstores.VectorStore.html#langchain_core.vectorstores.VectorStore)クラスのインスタンスを持っていて、その`as_retriever()`を呼ぶとRunnableを取得できる。
`as_retriever()`でとれるのは、正確にはRunnableを継承した[Retriever](https://python.langchain.com/v0.2/docs/concepts/#retrievers)と呼ばれるクラスのインスタンスで、`invoke()`に非構造化テキストでクエリを渡すと、ベクトルDBから検索して結果をDocumentリストで返してくれる。

前節のコードの最後の部分を少しいじって、LLM無しで、Ops IのWebマニュアルを入れたベクトルDBから単純にベクトル検索するコードにしてみる。

```python
import sys

import nest_asyncio
from langchain.indexes import VectorstoreIndexCreator
from langchain.text_splitter import CharacterTextSplitter
from langchain_community.document_loaders.sitemap import SitemapLoader
from langchain_community.vectorstores.inmemory import InMemoryVectorStore
from langchain_openai import OpenAIEmbeddings

input = sys.argv[1]

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

response = retriever.invoke(input)
print(response)
```

(前節コードからの差分は[これ](https://github.com/kaitoy/opsi-agent/commit/76aad89e2206d5f4f60b72c69709c4537f6b6758))

<br>

これを実行すると、クエリに対してどのページがヒットしたのかがわかる。

```console
$ export OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
$ python main.py "Ops Iの機能を教えて"
Fetching pages: 100%|################################################################| 122/122 [00:08<00:00, 14.49it/s]
[Document(page_content='Ops Iは、システム運用に必要なスキル（資格など）の保有状況や作業実績をもとに、経験値を定量的に可 視化します。また、各要員のスケジュールも可視化します。それらの可視化により、適切な要員に適切な作業を割り当てることができます。たとえば、クラウドやアプリケーションの特定のスキルを要する作業が発生した場合に、Ops Iではそのスキルを保有する要員 とその要員のスケジュール状況を容易に把握できるため、作業に対して適切な要員を迅速に割り当てることができます。\n（図）適切な作業割り当てのイメージ図\n                OperationsIntegration\n              \n検索\n Home\nはじめに\n変更内容\n目次\n1. 概要\n1.1 Ops Iの概要\n1.2 Ops Iの特長\n1.3 利用方法の概要\n1.4 使用上の注意事項および一時的制限事項', metadata={'source': 'https://itpfdoc.hitachi.co.jp/manuals/JCS/JCSM71020002/outline/opsi_forte/index.html', 'loc': 'https://itpfdoc.hitachi.co.jp/manuals/JCS/JCSM71020002/outline/opsi_forte/index.html'}), Document(page_content='1.2 Ops Iの特長\n1.3 利 用方法の概要\n1.4 使用上の注意事項および一時的制限事項\n1.4.1 使用上の注意事項\n1.4.2 一時的制限事項\n2. 導入・設定\n2.1 前提知識\n2.1.1 導入・設定を実施するユーザー\n2.1.2 ユーザーと各機能の関連\n2.1.3 ユーザー管理機能\n2.2 事前準備\n2.2.1 Ops Iへの接続およびログイン \n2.2.2 ワンタイムコード設定 \n2.3 ユーザー作成\n2.3.1 Ops Iを利用するユーザーの作成\n2.3.2 作成したユーザーに対するロールの設定\n2.4 組織の設定\n2.5 中継サーバの設定\n2.5.1 RPMパッケージ\n2.6 リポジトリの設定\n3. 機能\n3.1 基本的な画面構成\n3.1.1 アカウント管理\n3.2 タスク、リクエスト\n3.2.1 サービスカタログ\n3.2.2 ワークフロー\n3.2.3 チケット', metadata={'source': 'https://itpfdoc.hitachi.co.jp/manuals/JCS/JCSM71020002/setting/repository/index.html', 'loc': 'https://itpfdoc.hitachi.co.jp/manuals/JCS/JCSM71020002/setting/repository/index.html'}), Document(page_content='1.2 Ops Iの特長\n1.3 利用方法の概要\n1.4 使用上の注意事項および一時的制限事項\n1.4.1 使用上の注意事項\n1.4.2 一時 的制限事項\n2. 導入・設定\n2.1 前提知識\n2.1.1 導入・設定を実施するユーザー\n2.1.2 ユーザーと各機能の関連\n2.1.3 ユーザ ー管理機能\n2.2 事前準備\n2.2.1 Ops Iへの接続およびログイン \n2.2.2 ワンタイムコード設定 \n2.3 ユーザー作成\n2.3.1 Ops Iを利用するユーザーの作成\n2.3.2 作成したユーザーに対するロールの設定\n2.4 組織の設定\n2.5 中継サーバの設定\n2.5.1 RPMパ ッケージ\n2.6 リポジトリの設定\n3. 機能\n3.1 基本的な画面構成\n3.1.1 アカウント管理\n3.2 タスク、リクエスト\n3.2.1 サー ビスカタログ\n3.2.2 ワークフロー\n3.2.3 チケット', metadata={'source': 'https://itpfdoc.hitachi.co.jp/manuals/JCS/JCSM71020002/yaml/yaml_application/index.html', 'loc': 'https://itpfdoc.hitachi.co.jp/manuals/JCS/JCSM71020002/yaml/yaml_application/index.html'}), Document(page_content='1.2 Ops Iの特長\n1.3 利用方法の概要\n1.4 使用上の注意事項および一時的制限事項\n1.4.1 使用上の注意事項\n1.4.2 一時的制限事項\n2. 導入・設定\n2.1 前提知識\n2.1.1 導入・設定を実施するユーザー\n2.1.2 ユーザーと各機能の関連\n2.1.3 ユーザー管理機能\n2.2 事前準備\n2.2.1 Ops Iへの接続およびログイン \n2.2.2 ワンタイムコー ド設定 \n2.3 ユーザー作成\n2.3.1 Ops Iを利用するユーザーの作成\n2.3.2 作成したユーザーに対するロールの設定\n2.4 組織の設定\n2.5 中継サーバの設定\n2.5.1 RPMパッケージ\n2.6 リポジトリの設定\n3. 機能\n3.1 基本的な画面構成\n3.1.1 アカウント管理\n3.2 タスク、リクエスト\n3.2.1 サービスカタログ\n3.2.2 ワークフロー\n3.2.3 チケット', metadata={'source': 'https://itpfdoc.hitachi.co.jp/manuals/JCS/JCSM71020002/function/basic/account/index.html', 'loc': 'https://itpfdoc.hitachi.co.jp/manuals/JCS/JCSM71020002/function/basic/account/index.html'})]
```

この検索結果をみると、各ページの内容に目次ペインが含まれてしまっていて、ノイズになってそう。無駄にトークン食うだろうし。

SitemapLoaderはページをパースするときに[中身をいじる機能](https://python.langchain.com/v0.1/docs/integrations/document_loaders/sitemap/#add-custom-scraping-rules)があるので、目次などを取り除いたほうがよかったかも。

## システムプロンプト付きRAG
前節で取得したRetrieverは、Runnableなので、LCELでつないでいろいろできる。
今度は、Retrieverで取得したDocumentリストをシステムプロンプトにいれて、クエリをユーザプロンプトに入れてChat modelに渡す処理を実装する。

Chat modelやLLMに渡すプロンプトは、テキストだけでなく画像を渡す場合も含めて[PromptValue](https://api.python.langchain.com/en/latest/prompt_values/langchain_core.prompt_values.PromptValue.html#langchain_core.prompt_values.PromptValue)というクラスで抽象化され、統一的に扱える。
PromptValueはRunnableではないので、プロンプトをchainに組み込むため、PromptValueを生成する[Prompt templates](https://python.langchain.com/v0.2/docs/concepts/#prompt-templates)というのが用意されている。
Prompt templateは、あらかじめ設定されたテンプレート文字列を、`invoke()`の入力パラメータでレンダリングして出力してくれる。

今回は、Chat modelを使うので、それ用のPrompt templateである[ChatPromptTemplate](https://api.python.langchain.com/en/latest/prompts/langchain_core.prompts.chat.ChatPromptTemplate.html)をつかう。

```python
import sys

import nest_asyncio
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.indexes import VectorstoreIndexCreator
from langchain.text_splitter import CharacterTextSplitter
from langchain_community.document_loaders.sitemap import SitemapLoader
from langchain_community.vectorstores.inmemory import InMemoryVectorStore
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI, OpenAIEmbeddings

input = sys.argv[1]

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
        "system", # システムプロンプト
        """contextに基づいて、Ops Iの質問になるべく頑張って答えてください。ただし、Ops Iと関係ない質問に対しては、知るかボケと回答してもいいです:

<context>
{context}
</context>
"""
    ),
    (
        "human", # ユーザプロンプト
        "質問: {input}"
    )
])
llm = ChatOpenAI(model="gpt-3.5-turbo")
chain = create_stuff_documents_chain(llm, prompt)

response = chain.invoke({
    "input": input,
    "context": retriever.invoke(input),
})
print(response)
```

(前節コードからの差分は[これ](https://github.com/kaitoy/opsi-agent/commit/1d3fda35afa85fe17b2f73280e67e25f26b43ad0))

上のコードでは、ChatPromptTemplateにシステムプロンプトとユーザプロンプトを、それぞれ`context`と`input`というパラメータのテンプレート文字列で設定している。
これがRunnableなので、`context`と`input`を入力して`invoke()`してやると、テンプレートにそれらを埋め込んだメッセージリストを生成して後続のRunnableに出力してくれる。

そのChatPromptTemplateを、単にChatOpenAIにLCELでつないでやってもいんだけど、上のコードでは[create_stuff_documents_chain](https://api.python.langchain.com/en/latest/chains/langchain.chains.combine_documents.stuff.create_stuff_documents_chain.html)というユーティリティ使ってchainを作った。
`create_stuff_documents_chain`の中では要は`prompt | llm`みたいなことをしてるんだけど、その前方にDocumentリストをテキストに変換する処理を追加したり、後方にChatOpenAIの出力をシンプルなテキストに変換する処理を追加したり、使いやすいchainに仕上げてくれる。

上のコードの最後の部分で、`create_stuff_documents_chain`で作ったchainを、クエリとRetrieverで取得したDocumentリストを入力して`invoke()`している。

このコードを実行してOps Iの機能について質問してみる。

```console
$ export OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
$ python main.py "Ops Iの機能を教えて"
Fetching pages: 100%|################################################################| 122/122 [00:08<00:00, 15.18it/s]
Ops Iにはいくつかの機能があります。その中で、主な機能は以下の通りです:
- サービスカタログ: システムやアプリケーションなどのサービスを一覧化し、利用者が簡単に選択できるようにします。
- ワークフロー: 作業の手順や流れを定義し、自動化されたプロセスを実行するための機能です。
- チケット管理: 問題やリクエストをトラッキングし、適切に処理するための機能が提供されています。

これらの機能を使うことで、効率的な業務運用やタスク管理が可能となります。
```

なかなかいい回答が得られた。

次に、Ops Iと関係ない質問をしてみる。

```console
$ export OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
$ python main.py "ピカチュウの進化前は?"
Fetching pages: 100%|################################################################| 122/122 [00:07<00:00, 16.05it/s]
知るかボケ
```

システムプロンプトで指定した通りのキレのある回答になった。

## Retrieverとchainをつなぐ
前節のコードで一応動いたけど、Retrieverをchainの外で実行してしまってるので、ちゃんとつなぎたい。
そのためになんとも都合のいい、[create_retrieval_chain](https://api.python.langchain.com/en/latest/chains/langchain.chains.retrieval.create_retrieval_chain.html)というユーティリティがあるのでこれを使う。

```
import sys

import nest_asyncio
from langchain.chains import create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.indexes import VectorstoreIndexCreator
from langchain.text_splitter import CharacterTextSplitter
from langchain_community.document_loaders.sitemap import SitemapLoader
from langchain_community.vectorstores.inmemory import InMemoryVectorStore
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI, OpenAIEmbeddings

input = sys.argv[1]

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

response = chain.invoke({
    "input": input,
})
print(response)
```

(前節コードからの差分は[これ](https://github.com/kaitoy/opsi-agent/commit/827bc8c3b037b58c4ff536f0c62f5bf8885d9782))

`create_retrieval_chain`は、入力された`input`をRetrieverに与えて、その結果を`context`に、もともとの入力を`input`にいれて後続のRunnable (i.e. `create_stuff_documents_chain`の出力)に流してくれるので、
前節とまったく同じ処理が`chain.invoke({"input": input})`というすっきりとしたインターフェースで実行できるようになる。

以上で、Retriever → Prompt → Chat modelというchainができた。
