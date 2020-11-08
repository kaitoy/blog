+++
categories = ["Programming"]
title = "SQLAlchemyを使ってPythonでORM ― SQLAlchemy ORMを知る"
date = "2020-11-08T18:49:21+09:00"
tags = ["python", "sqlalchemy",]
draft = false
cover = "sqlalchemy.png"
slug = "sqlalchemy-orm"
highlight = true
highlightStyle = "monokai"
highlightLanguages = []
+++

[前回の記事](https://www.kaitoy.xyz/2020/11/05/sqlalchemy-core/)でSQLAlchemyのCoreについてざっくりおさえたので、今回はSQLAlchemy ORMの方をやっていく。

<!--more-->

{{< google-adsense >}}

# SQLAlchemy ORM
[SQLAlchemy ORM](https://docs.sqlalchemy.org/en/13/orm/index.html)は[SQLAlchemy Core](https://docs.sqlalchemy.org/en/13/core/index.html)の上に作られたコンポーネント。
SQLAlchemy Coreはユーザが自分でSQL文を構築して実行するのを助けてくれるのに対して、SQLAlchemy ORMはSQLAlchemyがSQL文を構築してくれる感じ。

SQLAlchemy ORMを使ってPythonのクラスとRDBのテーブルとのマッピングを定義してやると、そのクラスのインスタンスへの変更をSQLAlchemyがトラッキングしてくれて、透過的にRDBのレコードに反映してくれる。

# マッピングの定義
PythonのクラスとRDBのテーブルとのマッピングは[Declarative](https://docs.sqlalchemy.org/en/13/orm/extensions/declarative/index.html)というAPIで定義する。
マッピングを定義するクラスはDeclarativeのBaseクラスを継承させる必要があるので、まずはそのBaseクラスを作る。

`orm/base.py`:
```python
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()
```

Baseクラスは、継承したクラスとかマッピングの定義とかを覚えてくれるので、普通は1つのアプリでは1つのBaseクラスだけを作って使いまわして、マッピングを集中管理させる。

マッピングを定義するには、以下のようにBaseクラスを継承したクラス(mapped class)作って、テーブル名やカラムを定義すればいい。

`orm/user.py`:
```python
from sqlalchemy import Column, Integer, String
from orm.base import Base

class User(Base):
    __tablename__ = 'user'

    id = Column(Integer, primary_key=True)
    name = Column(String)
```

このクラス定義は、Userクラスが`user`というテーブルと関連付いていて、`user`テーブルは`id`と`name`カラムを持つ、という意味。
Userクラスをインスタンス化すると、そのプロパティとして`id`と`name`にアクセスできて、それらへの変更はインスタンスによってトラッキングされ、`user`テーブルに反映するためのSQL文が自動で構築される、という寸法。
因みに`__init__()`メソッドは自動で作ってくれるので、自分で書かなくても`User(id=1, name='kaitoy')`みたいにインスタンス化できる。

`user`テーブルの情報([テーブルメタデータ](https://docs.sqlalchemy.org/en/13/glossary.html#term-table-metadata))は`User.__table__`にバインドされる[Table](https://docs.sqlalchemy.org/en/13/core/metadata.html#sqlalchemy.schema.Table)オブジェクトに保持されて、そのTableオブジェクトは`Base.metadata`にバインドされる[MetaData](https://docs.sqlalchemy.org/en/13/core/metadata.html#sqlalchemy.schema.MetaData)に登録される。
この`Base.metadata`からDDL文を発行してRDBにテーブルを作ることができる。

`orm/__init__.py`:
```python
from sqlalchemy import create_engine
from orm.base import Base

# UserクラスをBaseクラスに登録する
import orm.user

engine = create_engine("postgresql://admin:passwd@localhost/test_db")

# Baseクラスに登録されたmapped classのテーブルを作る
Base.metadata.create_all(engine)
```

# Session
SQLAlchemy ORMではmapped classのインスタンスをいじることでSQL文が実行されるわけだけど、コネクションやトランザクションはどうなっているのかという話。

SQLAlchemy CoreではConnectionとかTransactionを明示的に作ってやっていたけど、SQLAlchemy ORMでは代わりに[Session](https://docs.sqlalchemy.org/en/13/orm/session.html)というのを使う。
Sessionは任意の数のmapped classのインスタンスと紐づき、(大抵は)一つのTransactionを保持する。

![session-overview.png](http://aosabook.org/images/sqlalchemy/session-overview.png)

Sessionを使うには、前節のBaseと同様に、まずSessionクラスを作る。
このクラスも普通は1つのアプリで1つ作ればいい。
SessionクラスにはEngineインスタンスを持たせる。

`orm/__init__.py`:
```diff
 from sqlalchemy import create_engine
+from sqlalchemy.orm import sessionmaker
 from orm.base import Base

 # UserクラスをBaseクラスに登録する
 import orm.user

 engine = create_engine("postgresql://admin:passwd@localhost/test_db")

 # Baseクラスに登録されたmapped classのテーブルを作る
 Base.metadata.create_all(engine)

+Session = sessionmaker(bind=engine)
```

Sessionクラスは普通にインスタンス化して使う。

`main.py`:
```python
from orm import Session

session = Session()
```

Sessionオブジェクトを作っても、実際に使うまではRDBとのコネクションは張らない。

## SessionによるINSERT
この記事の冒頭で、オブジェクトへの変更をSQLAlchemy ORMが透過的にRDBに反映してくれるというのを書いたけど、それが適用されるのはSessionオブジェクトに紐づけられた(i.e. アタッチされた)mapped classのオブジェクトだけ。

上記Userクラスのコンストラクタを呼べばmapped classのオブジェクトができるけど、その時点ではSessionオブジェクトにはアタッチされていない。
アタッチするには`add()`する。

`main.py`:
```diff
 from orm import Session
+from orm.user import User

 session = Session()
+user = User(id=1, name='kaitoy')
+session.add(user)
```

この時点でもまだコネクションは張られないし、RDBにレコードが追加されることもない。
userオブジェクトを永続化するには、`flush()`が必要。

`main.py`:
```diff
 from orm import Session
 from orm.user import User

 session = Session()
 user = User(id=1, name='kaitoy')
 session.add(user)
+session.flush()
```

`flush()`した時点でコネクションが(張られていなければ)張られて、ConnectionオブジェクトがSessionオブジェクトに紐づき、またトランザクションが(すでに開始していなければ)開始して、TransactionのオブジェクトがSessionオブジェクトに紐づく。
さらにSessionオブジェクトにアタッチされたオブジェクトの変更が計算されてRDBに反映される。
上記の例だと、新たなuserオブジェクトが追加されているので、RDBにはUserテーブルへのINSERTが発行される。

`flush()`しただけだとまだトランザクションが閉じてないので、コミットもしてやる必要がある。

`main.py`:
```diff
 from orm import Session
 from orm.user import User

 session = Session()
 user = User(id=1, name='kaitoy')
 session.add(user)
 session.flush()
+session.commit()
```

実際は、`commit()`すると`flush()`もされるので、`flush()`は省略できる。

`main.py`:
```diff
 from orm import Session
 from orm.user import User

 session = Session()
 user = User(id=1, name='kaitoy')
 session.add(user)
-session.flush()
 session.commit()
```

`commit()`するとトランザクションが閉じて、ConnectionがSessionオブジェクトからコネクションプールに返される。

## SessionによるSELECT
INSERTしたレコードを取得するには、Sessionオブジェクトから[Query](https://docs.sqlalchemy.org/en/13/orm/query.html#sqlalchemy.orm.query.Query)オブジェクトを作って、クエリを記述して実行する。

`main.py`:
```diff
 from orm import Session
 from orm.user import User

 session = Session()
 user = User(id=1, name='kaitoy')
 session.add(user)
 session.commit()
+
+retrieved_user = session.query(User).filter_by(name='kaitoy').first()
+session.commit()
```

Queryを使ったクエリの書き方はここでは解説しないけど、SQLAlchemy Coreと違って、上記のようにメソッドチェインでオブジェクト志向な感じで書ける。
クエリを発行した時点、つまり上の例だと`first()`が実行された時点でSessionオブジェクトがConnectionをプールから取得し、トランザクションを開始するので、後でちゃんとSessionを`commit()`してConnectionをプールに返してやるのが肝要。

クエリを発行するタイミングで内部で`flush()`も実行されるので、`session.add(user)`のあとの`session.commit()`は無くてもいい。
(実際には後述のSessionのautoflush設定によって挙動が変わる。)

`main.py`:
```diff
 from orm import Session
 from orm.user import User

 session = Session()
 user = User(id=1, name='kaitoy')
 session.add(user)
-session.commit()

 retrieved_user = session.query(User).filter_by(name='kaitoy').first()
 session.commit()
```

最後の`commit()`の後など、アタッチされたオブジェクトのプロパティにトランザクションの外でアクセスすると、RDBのレコードとの同期を取るために自動でトランザクションが開始されてSELECTが発行されるので注意が必要。
プロパティにアクセスしたら、トランザクションが不用に続かないように、`Session.commit()`してトランザクションを閉じて、コネクションをプールに返してやるべし。
[Sessionのexpire_on_commitをFalseにする](https://stackoverflow.com/questions/15397680/detaching-sqlalchemy-instance-so-no-refresh-happens)ことで、このような挙動を避けることもできる。

因みに、取得した`retrieved_user`は、`user`と同じ参照になっていて、つまり`retrieved_user is user`は`True`になる。
これはSessionオブジェクトが[identity map](https://docs.sqlalchemy.org/en/13/glossary.html#term-identity-map)というのを管理していて、RDBの一つのレコードに対しては、一つのPythonオブジェクトしか作らないようにしているため。

## SessionによるUPDATE
アタッチされたオブジェクトのプロパティをいじってコミットすれば、レコードのUPDATEができる。

`main.py`:
```diff
 from orm import Session
 from orm.user import User

 session = Session()
 user = User(id=1, name='kaitoy')
 session.add(user)

 retrieved_user = session.query(User).filter_by(name='kaitoy').first()
+retrieved_user.name = 'hogehoge'
 session.commit()
```

## SessionによるDELETE
アタッチされたオブジェクトを`Session.delete()`に渡すと、レコードのDELETEができる。

`main.py`:
```diff
 from orm import Session
 from orm.user import User

 session = Session()
 user = User(id=1, name='kaitoy')
 session.add(user)

 retrieved_user = session.query(User).filter_by(name='kaitoy').first()
 retrieved_user.name = 'hogehoge'
 session.commit()
+
+session.delete(retrieved_user)
+session.commit()
```

実際にRDBにDELETEが発行されるのはflush時なので、上記コードだと最後の`session.commit()`のタイミング。

`Session.delete()`はメソッド名は`Session.add()`と対になってる風だけど、[オブジェクトの状態](https://docs.sqlalchemy.org/en/13/orm/session_state_management.html#session-object-states)を削除にマークするだけで、Sessionからオブジェクトをデタッチするわけではない。
(デタッチは`Session.expunge()`。)

## Sessionのautocommit
これまでに説明したように、SQLAlchemy ORMではトランザクションは必要に応じて自動で開始してくれる。
SQLAlchemy Coreでは自分で`Connection.begin()`してトランザクションを明示的に開始しないといけないのとは対照的だ。

実は、歴史的事情でSessionにも`begin()`メソッドがあって、役割も`Connection.begin()`と同じ。
現在ではSessionの`begin()`はほぼ[autocommitモード](https://docs.sqlalchemy.org/en/13/orm/session_transaction.html#autocommit-mode)でしか使わないものだけど、autocommitモードは非推奨になっててデフォルトでオフで、SQLAlchemy v2.0では廃止になるので忘れていい。

トランザクションの開始はSQLAlchemy ORMに任せて、`Session.begin()`も忘れていい。

## Sessionのautoflush
autocommitと似てるような似てないような[autoflush](https://docs.sqlalchemy.org/en/13/orm/session_basics.html?highlight=autoflush#flushing)というものがある。
これもSessionの機能の一つで、デフォルトではオンだけど、オフにすると、Queryオブジェクトでクエリを発行する際に`Session.flush()`が実行されなくなる。

それが何を意味するかというと、Sessionに`add()`したオブジェクトとか、アタッチされたオブジェクトに加えた変更とかが、コミットするまではクエリ結果に反映されないということ。

`main.py`:
```python
from orm import Session
from orm.user import User

session = Session(autoflush=False)  # autoflushをオフにしたSessionを作成。
user = User(id=1, name='kaitoy')
session.add(user)

# session.flush()しない。
# session.commit()もしない。

# クエリ発行時にはflush()は実行されない。
retrieved_user = session.query(User).filter_by(name='kaitoy').first()
```

これはautoflushをオフにしたSessionを使った例だけど、明示的に`flush()`を呼んでないのでretrieved_userはNoneになる。

大抵のユースケースではautoflushはオンのままでいいけど、パフォーマンスチューニングのためにオフにするケースがあるかもしれない。

## scoped_session
実際にSessionを使ってアプリを書こうとすると、Sessionオブジェクトをいつ作っていつ破棄するのか(i.e. Sessionのスコープ)に[迷う](https://docs.sqlalchemy.org/en/13/orm/session_basics.html#session-faq-whentocreate)はず。

基本的な原則は、Sessionスコープの開始と終了は、そのSessionを使ってRDBアクセスする関数の外にするということ。
[SQLAlchemy Coreの記事のトランザクション管理](https://www.kaitoy.xyz/2020/11/05/sqlalchemy-core/#%E3%83%88%E3%83%A9%E3%83%B3%E3%82%B6%E3%82%AF%E3%82%B7%E3%83%A7%E3%83%B3%E3%81%AE%E7%AE%A1%E7%90%86)のところにも書いた話と似ていて、コードにすると以下のような感じ。

`main.py`:
```python
from orm import Session
from orm.user import User

def delete_user(session, name):
  user = session.query(User).filter_by(name=name).first()
  session.delete(user)

def main():
  session = Session()
  try:
    delete_user(session, 'kaitoy')  # 外で作ったSessionオブジェクトを渡す。
    session.commit()  # SessionのコミットはSQL文を実行する関数の外でやる。
  except:
    session.rollback()
    raise
  finally:
    session.close()
```

Webアプリにおいては、Sessionのスコープはリクエストのスコープと同じにしておけば間違いない。
つまり、リクエストを受け付けたらSessionオブジェクトを作って、レスポンスを返す時に(必要に応じてコミットして)破棄すればいい。
このパターンを簡単に実現するために、よく[scoped_session](https://docs.sqlalchemy.org/en/13/orm/contextual.html#sqlalchemy.orm.scoping.scoped_session)が使われる。
scoped_sessionを使うには、以下のようにSessionクラス作ればいいだけ。

`orm/__init__.py`:
```diff
 from sqlalchemy import create_engine
 from sqlalchemy.orm import sessionmaker
+from sqlalchemy.orm import scoped_session
 from orm.base import Base

 # UserクラスをBaseクラスに登録する
 import orm.user

 engine = create_engine("postgresql://admin:passwd@localhost/test_db")

 # Baseクラスに登録されたmapped classのテーブルを作る
 Base.metadata.create_all(engine)

-Session = sessionmaker(bind=engine)
+Session = scoped_session(sessionmaker(bind=engine))
```

このようにして作ったSessionクラスは、何度インスタンス化しても同一のオブジェクトが返る。
つまり、`Session() is Session()`が`True`になる。
なのでmain.pyは以下のように書けるようになる。

`main.py`:
```diff
 from orm import Session
 from orm.user import User

-def delete_user(session, name):
+def delete_user(name):
+  session = Session()
   user = session.query(User).filter_by(name=name).first()
   session.delete(user)

 def main():
   session = Session()
   try:
-    delete_user(session, 'kaitoy')  # 外で作ったSessionオブジェクトを渡す。
+    delete_user('kaitoy')  # 外で作ったSessionオブジェクトを渡さなくてもいい。
     session.commit()  # SessionのコミットはSQL文を実行する関数の外でやる。
   except:
     session.rollback()
     raise
   finally:
     session.close()
```

正確に言うと、何度インスタンス化しても同一のオブジェクトが返るというのは、同一のスレッド内での話。
別のスレッドでは別のオブジェクトになるので、スレッド間でSessionオブジェクトが共有されることはない。
(Sessionは[スレッドセーフではない](https://docs.sqlalchemy.org/en/13/orm/session_basics.html#is-the-session-thread-safe)。)

Sessionオブジェクトを作り直したい場合は、`Session.remove()`を実行すれば既存のやつをクローズして破棄できる。
Webアプリにおいては、レスポンスを返す時に`Session.remove()`しておけばいい。
