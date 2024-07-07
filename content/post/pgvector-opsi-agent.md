+++
categories = ["Programming"]
title = "LangChainとPostgreSQL (pgvector)でRAGを作る"
date = "2024-07-07T18:29:58+09:00"
tags = ["GenAI", "Ops I", "rag", "openai", "gpt", "langchain", "langserve", "postgresql"]
draft = false
cover = "langchain.png"
slug = "pgvector-opsi-agent"
highlight = true
highlightStyle = "monokai"
highlightLanguages = []
+++

LangChainでPostgreSQLにWebマニュアルのベクトルデータベースを構築し、その内容を答えてくれるRAGを作ってみた話。
Webマニュアルは、日立製作所製の運用統合サービスであるOps Iのやつ。

<!--more-->

[前回までの記事](https://www.kaitoy.xyz/2024/06/14/langserve-opsi-agent/)でLangChainのRAGを作ってLangServeでWebサーバにしたので、今回でそのベクトルデータベースをPostgreSQLにする。

{{< google-adsense >}}

# PostgreSQLによるベクトルデータベースとは
[PostgreSQL](https://www.postgresql.org/)は昔からある人気のOSSのデータベースなんだけど、基本はRDB。
今回はそれに[pgvector](https://github.com/pgvector/pgvector)というエクステンションを入れたやつを使って、RAGのベクトルデータベースとして動かす。

# Ops Iとは
Ops Iは[JP1 Cloud Service/Operations Integration](https://www.hitachi.co.jp/Prod/comp/soft1/jp1/feature/jp1_cloud_operations_integration/index.html)の略で、日立製作所製の運用統合サービス。

Operations as Codeが特長で、運用自動化コードやワークフローをGitで集約管理して、ハイブリッド環境における様々なシステム運用の自動化と統合を推進できる。

<br>

{{< youtube arzY4xQlUb0 >}}

<br>

# LangChainとLangServeによるRAGのベクトルデータベースをPostgreSQLにする
[前回のコード](https://github.com/kaitoy/opsi-agent/tree/1f32ab7749a97b4a65368c7d126f026bf204115b)をPostgreSQLにつなぐように変更していく。

## LangChainでPostgreSQLにつなぐ
前回はLangChainのデフォルトのベクトルデータベースであるInMemoryVectorStoreを使ったけど、今回はPostgreSQLのpgvectorでデータベースを構築するために[PGVector](https://python.langchain.com/v0.2/docs/integrations/vectorstores/pgvector/)を使う。
PGVectorは[langchain-postgres](https://github.com/langchain-ai/langchain-postgres/tree/main)モジュールに入っているので、とりあえずそれをインストールする。

```console
$ pip install langchain-postgres
```

入ったlangchain-postgresのバージョンは0.0.9。

LangChainのコードは以下のように書き換える。

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
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_postgres.vectorstores import PGVector
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
    vectorstore_cls=PGVector,
    embedding=OpenAIEmbeddings(),
    text_splitter=text_splitter,
    vectorstore_kwargs={
        "collection_name": "opsi_manual",
        "connection": "postgresql+psycopg://langchain:langchain@postgres:5432/langchain",
        "use_jsonb": True,
    }
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

uvicorn.run(app, host="0.0.0.0", port=8080)
```

(前回の記事のコードからの差分は[これ](https://github.com/kaitoy/opsi-agent/commit/50c6cd7e43ad248ba621bf4209378fc902e0c4ff))

変更内容は、VectorstoreIndexCreatorに渡すVectorStoreクラスにPGVectorを指定して、PGVector固有のconnectionなどのパラメータを`vectorstore_kwargs`で渡すようにしただけ。

ついでに、uvicornのバインドIPアドレスをlocalhostから0.0.0.0に変更もした。

## Ops Iエージェントコンテナイメージ
前回作ったOps Iエージェントは単一のPythonアプリで、OS上のpythonコマンドで直接起動したけど、今回はPostgreSQLサーバも起動する必要があるので、Kubernetesにデプロイすることにする。

まずはOps Iエージェントのコンテナイメージを作る。Dockerfileはこれ:

```dockerfile
FROM python:3.12.3-slim

COPY requirements.txt requirements.lock /

RUN apt-get update \
    && \
    apt-get install -y --no-install-recommends \
      libpq5 \
    && \
    apt-get -y clean \
    && \
    rm -rf /var/lib/apt/lists/* \
    && \
    pip install --no-cache-dir -r /requirements.txt -c /requirements.lock

COPY app /app

EXPOSE 8080
ENTRYPOINT [ "python", "/app/main.py" ]
```

Python公式のベースイメージに、LangChainとかをpipインストールして、PostgreSQLのクライアントライブラリをapt-getして、Pythonコードを入れただけ。

これを`docker build`して、Docker Hubにpushした。
イメージ名は[kaitoy/opsi-agent:0.0.1](https://hub.docker.com/repository/docker/kaitoy/opsi-agent/general)。

<br>

PostgreSQLのほうは、pgvector公式イメージの[pgvector/pgvector:pg16](https://hub.docker.com/layers/pgvector/pgvector/pg16/images/sha256-76ad3219f0eef5bc9e73c29c33c77b7d72ab076bac86797789cb85c1717a4b5e?context=explore)を使う。

## Ops IエージェントのHelm Chart
KubernetesにデプロイするのにHelmを使いたいので、Helm chartも書く。

PostgreSQLは、StatefulSetでレプリカ無しでデプロイする。

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: {{ include "opsi-agent.fullname" . }}-postgres
  labels:
    {{- include "opsi-agent-postgres.labels" . | nindent 4 }}
spec:
  replicas: 1
  selector:
    matchLabels:
      {{- include "opsi-agent-postgres.selectorLabels" . | nindent 6 }}
  serviceName: {{ include "opsi-agent.fullname" . }}-postgres
  template:
    metadata:
      labels:
        {{- include "opsi-agent-postgres.selectorLabels" . | nindent 8 }}
    spec:
      containers:
      - name: postgres
        env:
        - name: POSTGRESQL_PORT_NUMBER
          value: "5432"
        - name: PGDATA
          value: /var/lib/pgsql/data
        - name: POSTGRES_USER
          valueFrom:
            secretKeyRef:
              name: {{ include "opsi-agent.fullname" . }}-postgres
              key: POSTGRES_USER
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: {{ include "opsi-agent.fullname" . }}-postgres
              key: POSTGRES_PASSWORD
        - name: POSTGRES_DB
          value: {{ .Values.postgres.db }}
        image: pgvector/pgvector:0.7.2-pg16
        ports:
        - name: postgres
          containerPort: 5432
          protocol: TCP
        livenessProbe:
          exec:
            command:
            - /bin/sh
            - -c
            - exec pg_isready -U "${POSTGRES_USER}" -h 127.0.0.1 -p 5432
        readinessProbe:
          exec:
            command:
            - /bin/sh
            - -c
            - exec pg_isready -U "${POSTGRES_USER}" -h 127.0.0.1 -p 5432
        volumeMounts:
        - name: postgres
          mountPath: /var/lib/pgsql/data
  volumeClaimTemplates:
  - metadata:
      name: postgres
    spec:
      accessModes: {{ .Values.postgres.persistence.accessModes }}
      storageClassName: {{ .Values.postgres.persistence.storageClassName }}
      resources:
        requests:
          storage: {{ .Values.postgres.persistence.size }}
      {{- with .Values.postgres.persistence.selectorLabels }}
      selector:
        matchLabels:
          {{- toYaml . | nindent 10 }}
      {{- end }}
```

pgvectorコンテナに`POSTGRES_USER`、`POSTGRES_PASSWORD`、`POSTGRES_DB`という環境変数を設定することで、PostgreSQL起動時にデフォルトで作成されるユーザとDBを、PGVectorのconnectionに指定したURIと合うように指定した。

<br>

opsi-agentコンテナは、Deploymentでデプロイする。

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "opsi-agent.fullname" . }}
  labels:
    {{- include "opsi-agent.labels" . | nindent 4 }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      {{- include "opsi-agent.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      labels:
        {{- include "opsi-agent.selectorLabels" . | nindent 8 }}
    spec:
      containers:
      - name: {{ .Chart.Name }}
        image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
        env:
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: {{ include "opsi-agent.fullname" . }}
              key: OPENAI_API_KEY
        ports:
        - name: http
          containerPort: 8080
          protocol: TCP
        livenessProbe:
          httpGet:
            path: /healthz
            port: http
          timeoutSeconds: 1
          periodSeconds: 3
          initialDelaySeconds: 30
          successThreshold: 1
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /healthz
            port: http
          timeoutSeconds: 1
          periodSeconds: 5
          initialDelaySeconds: 30
          successThreshold: 1
          failureThreshold: 1
        startupProbe:
          httpGet:
            path: /healthz
            port: http
            scheme: HTTP
          timeoutSeconds: 1
          periodSeconds: 3
          initialDelaySeconds: 30
          successThreshold: 1
          failureThreshold: 50
```

langchain-openaiのために、コンテナの環境変数のOPENAI_API_KEYでOpenAIのAPIキーを渡している。

livenessProbe、readinessProbe、startupProbeでコンテナの起動状態をチェックするけど、FastAPIが動く前にベクトルデータベース構築するところで結構時間がかかるので、startupProbeのfailureThresholdを大きめにした。

livenessProbe、readinessProbe、startupProbeでコンテナの`/healthz`をヘルスチェックAPIとして使うので、Ops Iエージェントにそれを実装する。

```python
(snip)

class HealthCheck(BaseModel):
    status: str = "OK"

@app.get(
    "/healthz",
    tags=["healthcheck"],
    summary="Perform a Health Check",
    response_description="Return HTTP Status Code 200 (OK)",
    status_code=status.HTTP_200_OK,
    response_model=HealthCheck,
)
def get_health() -> HealthCheck:
    return HealthCheck(status="OK")

uvicorn.run(app, host="0.0.0.0", port=8080)
```

<br>

あとは、Chart.yamlとかSecretとかServiceとか適当に書いて、Helm chartができた。

(ヘルスチェックAPIとHelm chart追加による前節コードからの差分は[これ](https://github.com/kaitoy/opsi-agent/commit/fe28ca873c7ddb0da8c31219f71d9ffaf2d5fcea))

## Kubernetesにデプロイ
Ops IエージェントをデプロイするKubernetesは、[自作のKubernetesクラスタ構築playbook](https://github.com/kaitoy/ansible-k8s)で構築した。

構築先はWindows 11上のVirtualBoxのOracle Linux9.3のVM。

構築したのはKubernetes v1.30.2のシングルノードクラスタ。
Helm v3.15.2入り。

```console
$ kubectl version
Client Version: v1.30.2
Kustomize Version: v5.0.4-0.20230601165947-6ce0bf390ce3
Server Version: v1.30.2
$ helm version
version.BuildInfo{Version:"v3.15.2", GitCommit:"1a500d5625419a524fdae4b33de351cc4f58ec35", GitTreeState:"clean", GoVersion:"go1.22.4"}
```

<br>

この環境にさっき作ったchartをデプロイする。
PostgreSQLのPVには[local](https://kubernetes.io/ja/docs/concepts/storage/volumes/#local)を使って、VMの`/data`にDBを永続化する。

```console
$ mkdir /data
$ cat <<EOL | kubectl apply -f -
kind: PersistentVolume
apiVersion: v1
metadata:
  name: postgres
spec:
  storageClassName: local
  capacity:
    storage: 1Gi
  accessModes:
  - ReadWriteOnce
  local:
    path: /data
  nodeAffinity:
    required:
      nodeSelectorTerms:
      - matchExpressions:
        - key: kubernetes.io/os
          operator: In
          values:
          - linux
EOL
persistentvolume/postgres created
$ cd chart
$ cat <<EOF > ../values.yaml
openai_api_key: sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxx
service:
  type: NodePort
EOF
$ helm install opsi-agent -f ../values.yaml .
NAME: opsi-agent
LAST DEPLOYED: Sat Jun 29 22:16:11 2024
NAMESPACE: default
STATUS: deployed
REVISION: 1
TEST SUITE: None
```

デプロイできた。

## Ops IエージェントのヘルスチェックAPI修正
デプロイは成功したけど、Ops IエージェントのpodがREADYにならず、livenessProbeにkillされてしまった。
ログを見たら以下のように`TypeError: BaseModel.validate() takes 2 positional arguments but 3 were given`というエラーが出ていた。

```console
INFO:     10.0.2.100:52098 - "GET /healthz HTTP/1.1" 500 Internal Server Error
ERROR:    Exception in ASGI application
Traceback (most recent call last):
  File "/usr/local/lib/python3.12/site-packages/uvicorn/protocols/http/httptools_impl.py", line 411, in run_asgi
    result = await app(  # type: ignore[func-returns-value]
             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.12/site-packages/uvicorn/middleware/proxy_headers.py", line 69, in __call__
    return await self.app(scope, receive, send)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.12/site-packages/fastapi/applications.py", line 1054, in __call__
    await super().__call__(scope, receive, send)
  File "/usr/local/lib/python3.12/site-packages/starlette/applications.py", line 123, in __call__
    await self.middleware_stack(scope, receive, send)
  File "/usr/local/lib/python3.12/site-packages/starlette/middleware/errors.py", line 186, in __call__
    raise exc
  File "/usr/local/lib/python3.12/site-packages/starlette/middleware/errors.py", line 164, in __call__
    await self.app(scope, receive, _send)
  File "/usr/local/lib/python3.12/site-packages/starlette/middleware/exceptions.py", line 65, in __call__
    await wrap_app_handling_exceptions(self.app, conn)(scope, receive, send)
  File "/usr/local/lib/python3.12/site-packages/starlette/_exception_handler.py", line 64, in wrapped_app
    raise exc
  File "/usr/local/lib/python3.12/site-packages/starlette/_exception_handler.py", line 53, in wrapped_app
    await app(scope, receive, sender)
  File "/usr/local/lib/python3.12/site-packages/starlette/routing.py", line 756, in __call__
    await self.middleware_stack(scope, receive, send)
  File "/usr/local/lib/python3.12/site-packages/starlette/routing.py", line 776, in app
    await route.handle(scope, receive, send)
  File "/usr/local/lib/python3.12/site-packages/starlette/routing.py", line 297, in handle
    await self.app(scope, receive, send)
  File "/usr/local/lib/python3.12/site-packages/starlette/routing.py", line 77, in app
    await wrap_app_handling_exceptions(app, request)(scope, receive, send)
  File "/usr/local/lib/python3.12/site-packages/starlette/_exception_handler.py", line 64, in wrapped_app
    raise exc
  File "/usr/local/lib/python3.12/site-packages/starlette/_exception_handler.py", line 53, in wrapped_app
    await app(scope, receive, sender)
  File "/usr/local/lib/python3.12/site-packages/starlette/routing.py", line 72, in app
    response = await func(request)
               ^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.12/site-packages/fastapi/routing.py", line 296, in app
    content = await serialize_response(
              ^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.12/site-packages/fastapi/routing.py", line 147, in serialize_response
    value, errors_ = await run_in_threadpool(
                     ^^^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.12/site-packages/starlette/concurrency.py", line 42, in run_in_threadpool
    return await anyio.to_thread.run_sync(func, *args)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.12/site-packages/anyio/to_thread.py", line 56, in run_sync
    return await get_async_backend().run_sync_in_worker_thread(
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.12/site-packages/anyio/_backends/_asyncio.py", line 2144, in run_sync_in_worker_thread
    return await future
           ^^^^^^^^^^^^
  File "/usr/local/lib/python3.12/asyncio/futures.py", line 287, in __await__
    yield self  # This tells Task to wait for completion.
    ^^^^^^^^^^
  File "/usr/local/lib/python3.12/asyncio/tasks.py", line 385, in __wakeup
    future.result()
  File "/usr/local/lib/python3.12/asyncio/futures.py", line 203, in result
    raise self._exception.with_traceback(self._exception_tb)
  File "/usr/local/lib/python3.12/site-packages/anyio/_backends/_asyncio.py", line 851, in run
    result = context.run(func, *args)
             ^^^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.12/site-packages/fastapi/_compat.py", line 127, in validate
    self._type_adapter.validate_python(value, from_attributes=True),
    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.12/site-packages/pydantic/type_adapter.py", line 260, in validate_python
    return self.validator.validate_python(object, strict=strict, from_attributes=from_attributes, context=context)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
TypeError: BaseModel.validate() takes 2 positional arguments but 3 were given
```

このエラーは、[Pydantic v2でバリデーションを実行する処理系にPydantic v1のモデルを渡したときに発生する](https://stackoverflow.com/a/78022180)らしい。

自分のコードを見直すと、FastAPIがPydantic v2で動くのに対して、LangChainパッケージ内のPydantic v1でヘルスチェックAPIのモデルを定義してたので、そこを直す。

```diff
 import nest_asyncio
 import uvicorn
 from fastapi import FastAPI, status
 from langchain.chains import create_retrieval_chain
 from langchain.chains.combine_documents import create_stuff_documents_chain
 from langchain.indexes import VectorstoreIndexCreator
 from langchain.pydantic_v1 import BaseModel
 from langchain.text_splitter import CharacterTextSplitter
 from langchain_community.document_loaders.sitemap import SitemapLoader
 from langchain_core.prompts import ChatPromptTemplate
 from langchain_openai import ChatOpenAI, OpenAIEmbeddings
 from langchain_postgres.vectorstores import PGVector
 from langserve import add_routes
+from pydantic import BaseModel as BaseModelV2

(snip)

-class HealthCheck(BaseModel):
+class HealthCheck(BaseModelV2):
     status: str = "OK"

 app.get(
    "/healthz",
    tags=["healthcheck"],
    summary="Perform a Health Check",
    response_description="Return HTTP Status Code 200 (OK)",
    status_code=status.HTTP_200_OK,
    response_model=HealthCheck,

 ef get_health() -> HealthCheck:
    return HealthCheck(status="OK")
```

(前節コードからの実際の差分は[これ](https://github.com/kaitoy/opsi-agent/commit/5fa54fe70871e1a6f5ecf7c9d8f0b52dd291ba5e))

## PGVectorを非同期モードにする
ヘルスチェックAPIを修正してpodのコンテナイメージを入れ替えたら無事READYになってLangServeが起動した。

chainをinvokeするAPIを呼んでみる。

```console
$ curl -XPOST -H 'Content-Type:application/json' -d '{"input": {"input": "Ops Iの機能を教えて"}}' http://$(hostname -i):$(kubectl get service opsi-agent -o jsonpath='{.spec.ports[0].nodePort}')/opsi/invoke
Internal Server Error
```

`Internal Server Error`になってしまった。
podのログには以下のように、`AssertionError: _async_engine not found`というエラーが出ていた。

```console
INFO:     10.0.2.100:35662 - "POST /opsi/invoke HTTP/1.1" 500 Internal Server Error
ERROR:    Exception in ASGI application
Traceback (most recent call last):
  File "/usr/local/lib/python3.12/site-packages/uvicorn/protocols/http/httptools_impl.py", line 411, in run_asgi
    result = await app(  # type: ignore[func-returns-value]
             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.12/site-packages/uvicorn/middleware/proxy_headers.py", line 69, in __call__
    return await self.app(scope, receive, send)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.12/site-packages/fastapi/applications.py", line 1054, in __call__
    await super().__call__(scope, receive, send)
  File "/usr/local/lib/python3.12/site-packages/starlette/applications.py", line 123, in __call__
    await self.middleware_stack(scope, receive, send)
  File "/usr/local/lib/python3.12/site-packages/starlette/middleware/errors.py", line 186, in __call__
    raise exc
  File "/usr/local/lib/python3.12/site-packages/starlette/middleware/errors.py", line 164, in __call__
    await self.app(scope, receive, _send)
  File "/usr/local/lib/python3.12/site-packages/starlette/middleware/exceptions.py", line 65, in __call__
    await wrap_app_handling_exceptions(self.app, conn)(scope, receive, send)
  File "/usr/local/lib/python3.12/site-packages/starlette/_exception_handler.py", line 64, in wrapped_app
    raise exc
  File "/usr/local/lib/python3.12/site-packages/starlette/_exception_handler.py", line 53, in wrapped_app
    await app(scope, receive, sender)
  File "/usr/local/lib/python3.12/site-packages/starlette/routing.py", line 756, in __call__
    await self.middleware_stack(scope, receive, send)
  File "/usr/local/lib/python3.12/site-packages/starlette/routing.py", line 776, in app
    await route.handle(scope, receive, send)
  File "/usr/local/lib/python3.12/site-packages/starlette/routing.py", line 297, in handle
    await self.app(scope, receive, send)
  File "/usr/local/lib/python3.12/site-packages/starlette/routing.py", line 77, in app
    await wrap_app_handling_exceptions(app, request)(scope, receive, send)
  File "/usr/local/lib/python3.12/site-packages/starlette/_exception_handler.py", line 64, in wrapped_app
    raise exc
  File "/usr/local/lib/python3.12/site-packages/starlette/_exception_handler.py", line 53, in wrapped_app
    await app(scope, receive, sender)
  File "/usr/local/lib/python3.12/site-packages/starlette/routing.py", line 72, in app
    response = await func(request)
               ^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.12/site-packages/fastapi/routing.py", line 278, in app
    raw_response = await run_endpoint_function(
                   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.12/site-packages/fastapi/routing.py", line 191, in run_endpoint_function
    return await dependant.call(**values)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.12/site-packages/langserve/server.py", line 530, in invoke
    return await api_handler.invoke(request)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.12/site-packages/langserve/api_handler.py", line 833, in invoke
    output = await invoke_coro
             ^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.12/site-packages/langchain_core/runnables/base.py", line 4439, in ainvoke
    return await self.bound.ainvoke(
           ^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.12/site-packages/langchain_core/runnables/base.py", line 2430, in ainvoke
    input = await step.ainvoke(
            ^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.12/site-packages/langchain_core/runnables/passthrough.py", line 497, in ainvoke
    return await self._acall_with_config(self._ainvoke, input, config, **kwargs)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.12/site-packages/langchain_core/runnables/base.py", line 1553, in _acall_with_config
    output: Output = await asyncio.create_task(coro, context=context)  # type: ignore
                     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.12/asyncio/futures.py", line 287, in __await__
    yield self  # This tells Task to wait for completion.
    ^^^^^^^^^^
  File "/usr/local/lib/python3.12/asyncio/tasks.py", line 385, in __wakeup
    future.result()
  File "/usr/local/lib/python3.12/asyncio/futures.py", line 203, in result
    raise self._exception.with_traceback(self._exception_tb)
  File "/usr/local/lib/python3.12/asyncio/tasks.py", line 314, in __step_run_and_handle_result
    result = coro.send(None)
             ^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.12/site-packages/langchain_core/runnables/passthrough.py", line 484, in _ainvoke
    **await self.mapper.ainvoke(
      ^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.12/site-packages/langchain_core/runnables/base.py", line 3066, in ainvoke
    results = await asyncio.gather(
              ^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.12/asyncio/tasks.py", line 385, in __wakeup
    future.result()
  File "/usr/local/lib/python3.12/asyncio/tasks.py", line 314, in __step_run_and_handle_result
    result = coro.send(None)
             ^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.12/site-packages/langchain_core/runnables/base.py", line 4439, in ainvoke
    return await self.bound.ainvoke(
           ^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.12/site-packages/langchain_core/runnables/base.py", line 2430, in ainvoke
    input = await step.ainvoke(
            ^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.12/site-packages/langchain_core/retrievers.py", line 228, in ainvoke
    return await self.aget_relevant_documents(
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.12/site-packages/langchain_core/_api/deprecation.py", line 157, in awarning_emitting_wrapper
    return await wrapped(*args, **kwargs)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.12/site-packages/langchain_core/retrievers.py", line 387, in aget_relevant_documents
    raise e
  File "/usr/local/lib/python3.12/site-packages/langchain_core/retrievers.py", line 380, in aget_relevant_documents
    result = await self._aget_relevant_documents(
             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.12/site-packages/langchain_core/vectorstores.py", line 716, in _aget_relevant_documents
    docs = await self.vectorstore.asimilarity_search(
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.12/site-packages/langchain_postgres/vectorstores.py", line 919, in asimilarity_search
    await self.__apost_init__()  # Lazy async init
    ^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.12/site-packages/langchain_postgres/vectorstores.py", line 462, in __apost_init__
    await self.acreate_vector_extension()
  File "/usr/local/lib/python3.12/site-packages/langchain_postgres/vectorstores.py", line 480, in acreate_vector_extension
    assert self._async_engine, "_async_engine not found"
           ^^^^^^^^^^^^^^^^^^
AssertionError: _async_engine not found
```


LangChainでベクトルデータベースを表す[VectorStore](https://api.python.langchain.com/en/latest/vectorstores/langchain_core.vectorstores.VectorStore.html)という抽象クラスには、類似検索をするAPIとして同期の`similarity_search`と非同期の`asimilarity_search`とがあるんだけど、それを継承したPGVectorの実装は、インスタンス化のときに同期モードか非同期モードかを選んで、選んだほうのAPIしか使えないという不便なものになっていた。
PGVectorのコンストラクタはデフォルトでは同期モードのインスタンスを作るけど、LangServeはchainを非同期でinvokeするので、エラーになったというわけ。

ならばPGVectorを非同期モードにする。

```diff
 index = VectorstoreIndexCreator(
     vectorstore_cls=PGVector,
     embedding=OpenAIEmbeddings(),
     text_splitter=text_splitter,
     vectorstore_kwargs={
         "collection_name": "opsi_manual",
         "connection": "postgresql+psycopg://langchain:langchain@opsi-agent-postgres:5432/langchain",
         "use_jsonb": True,
+        "async_mode": True,
     }
 ).from_loaders([loader])
```

(前節コードからの実際の差分は[これ](https://github.com/kaitoy/opsi-agent/commit/c2c6fcbd8f80050c5abca88086006610115d9af9))

## PGVectorのインデックス構築を非同期モードにする
PGVectorの非同期モードを修正してpodのコンテナイメージを入れ替えたら、今度は起動時に`AssertionError: This method must be called with sync_mode`というエラーでpodが落ちるようになった。

```console
$ kubectl logs opsi-agent-54bf89d7b5-bz267 -f
Fetching pages: 100%|##########| 122/122 [00:16<00:00,  7.51it/s]
Traceback (most recent call last):
  File "/app/main.py", line 38, in <module>
    ).from_loaders([loader])
      ^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.12/site-packages/langchain/indexes/vectorstore.py", line 158, in from_loaders
    return self.from_documents(docs)
           ^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.12/site-packages/langchain/indexes/vectorstore.py", line 171, in from_documents
    vectorstore = self.vectorstore_cls.from_documents(
                  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.12/site-packages/langchain_postgres/vectorstores.py", line 1731, in from_documents
    return cls.from_texts(
           ^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.12/site-packages/langchain_postgres/vectorstores.py", line 1496, in from_texts
    return cls.__from(
           ^^^^^^^^^^^
  File "/usr/local/lib/python3.12/site-packages/langchain_postgres/vectorstores.py", line 670, in __from
    store.add_embeddings(
  File "/usr/local/lib/python3.12/site-packages/langchain_postgres/vectorstores.py", line 733, in add_embeddings
    assert not self._async_engine, "This method must be called with sync_mode"
           ^^^^^^^^^^^^^^^^^^^^^^
AssertionError: This method must be called with sync_mode
```

PGVectorはVectorstoreIndexCreatorがインデックスを作るときとLangServeがchainを実行するときに呼ばれるんだけど、後者は前節で書いた通り非同期で呼ばれ、前者は同期で呼ばれる模様。
前者が同期で呼ばれるのは、VectorstoreIndexCreatorの同期APIを使ってるからっぽい。
VectorstoreIndexCreatorの非同期APIを使えば全部非同期で実行されるはず。
また、PGVectorのソースを眺めていたら、インデックスを作るときに呼ぶクラスメソッドが同期なら同期モードのインスタンスができて、非同期なら非同期モードのインスタンスができるようなので、どうも外から`async_mode`を指定すべきではなかったようだった。

```diff
-index = VectorstoreIndexCreator(
+vic = VectorstoreIndexCreator(
     vectorstore_cls=PGVector,
     embedding=OpenAIEmbeddings(),
     text_splitter=text_splitter,
     vectorstore_kwargs={
         "collection_name": "opsi_manual",
         "connection": "postgresql+psycopg://langchain:langchain@opsi-agent-postgres:5432/langchain",
         "use_jsonb": True,
-        "async_mode": True,
     }
-).from_loaders([loader])
-)
+index = asyncio.run(vic.afrom_loaders([loader]))
```

(前節コードからの実際の差分は[これ](https://github.com/kaitoy/opsi-agent/commit/45c79f64d1fb5975b55e6a6173bad75eb547f914))

<br>

この修正をしてpodのコンテナイメージを入れ替えたらちゃんと動いた。

```console
$ curl -XPOST -H 'Content-Type:application/json' -d '{"input": {"input": "Ops Iの機能を教えて"}}' http://$(hostname -i):$(kubectl get service opsi-agent -o jsonpath='{.spec.ports[0].nodePort}')/opsi/invoke
{"output":{"input":"Ops Iの機能を教えて","answer":"Ops Iの機能には、基本的な画面構成、アカウント管理、タスクやリクエストの管理、サービスカタログ、ワークフロー、 チケット管理などが含まれます。これらの機能を活用することで、システム運用に必要な作業を効率的に管理することができます。"},"metadata":{"run_id":"c6060122-f55b-48a5-8285-61bbd7e9bbe1","feedback_tokens":[]}}
```
