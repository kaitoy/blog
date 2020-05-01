+++
categories = ["Programming"]
title = "Cythonの浅漬け"
date = "2020-05-01T15:59:40+09:00"
tags = ["python", "cython"]
draft = false
cover = "cythonlogo.png"
slug = "cython"
highlight = true
highlightStyle = "monokai"
highlightLanguages = []
+++

Pythonアプリを高速化できるCythonについてざっくりと浅めにまとめた。

<!--more-->

{{< google-adsense >}}

# Cythonとは
[Cython](https://cython.org/)はPythonのスーパーセットなプログラミング言語、またはそのコンパイラ。
Cythonで書かれたコードは最適化されたC(またはC++)のコードにコンパイルできる。

最新版(2020年5月時点で0.29.6)のマニュアルは[これ](https://cython.readthedocs.io/en/stable/index.html)。

# Cythonによる高速化
Pythonは動的型付けのインタプリタ型言語で、変数アクセスや関数呼び出しのたびに処理系が型を解決する必要があって遅い。
演算子の処理やプロパティアクセスがメソッド呼び出しになったりするのもオーバーヘッドになっている。
特にforループが非常に遅く、数値計算をforで回すようなコードはJavaの10倍、Cの数百倍くらい遅い。

Cythonで事前にコンパイルすることで、最適化されたりインタプリタ型という特性による遅さが改善されるので、普通のPythonコードをCythonでコンパイルするだけでも20%から50%くらい高速化できる。

さらに、Cython言語の機能によってCの型を静的に記述してやることで動的型付けの遅さを改善でき、しっかり書けば100倍以上の高速化を実現できる。
Cの関数や構造体をインポートして直接使ったり、GILを無視したマルチスレッディングなんかもできるので、処理内容によっては数百倍以上の高速化も可能。

# Cythonコンパイラの使い方
Cythonコードの書き方は長めになるのであとで。

とりあえずコンパイル方法について。

## 前提条件
CythonのコンパイルにはC(C++の機能を使うときはC++)のコンパイル環境が必要。

* Ubuntu

    ```cmd
    # sudo apt-get install build-essential
    ```

* Alpine Linux

    ```cmd
    # apk add gcc musl-dev
    ```

* Windows 10

    [Pythonのバージョンに合ったバージョンのVisual Studio](https://stackoverflow.com/questions/2817869/error-unable-to-find-vcvarsall-bat)をインストールすればいい。
    例えば現時点で最新の[Anaconda](https://www.anaconda.com/)付属のPython 3.7ならVisual Studio Community 2019でいける。

## Cythonインストール
`pip install cython`でインストールできる。

Anacondaならデフォルトで入っている。

## コンパイル実行
Cythonで書かれたコードはcythonパッケージに含まれる[cythonize](https://cython.readthedocs.io/en/stable/src/userguide/source_files_and_compilation.html#compiling-with-the-cythonize-command)というコマンドでコンパイルできる。

例:
```cmd
cythonize -i -3 your_awesome_module.py
```

この例のように実行すると、`your_awesome_module.py`をコンパイルして、Cのソースである`your_awesome_module.c`と、それをコンパイルした`.so`ファイルができる。

`.c`ファイルにはもとのPythonコードとCのコードが交互に書かれているので、いい感じに最適化されているかを確認できる。

加えて、`cythonize`に`-a`オプションを付けるとhtmlファイルも吐く。
このhtmlでも、左の方の`+`をクリックすることでPythonコードとCのコードを見比べられる。
また、Python界とのやり取りが多い(i.e. 処理時間がかかる)部分が濃い黄色で表現されるので、最適化すべきところがわかりやすい。

# Cythonモジュールのimport
Cythonで書いてコンパイルして作ったモジュールは、普通のPythonモジュールと同じようにimportできる。
つまり、Cythonコードを記述したファイルの名前から拡張を除いたやつがモジュール名になるので、Pythonコードからそれを普通にimportすればいい。

例えば前節でコンパイルした`your_awesome_module`は以下のようimportできる。

`some_normal_module.py`:
```python
from path.to.your_awesome_module import fabulous_func
```

# Cythonモジュールの書き方
CythonはPythonのスーパーセットなので、純粋なPythonのコードを徐々にCython化していくような感じで書ける。
Cython化とはつまり、型を付けたり、関数をC化したりすること。

## Pythonの型とCythonの型
PythonとCythonの型(i.e. Cの型)は以下のように対応している。

| Python | C |
----|----
| bool | bint |
| int<br>long | [unsigined] char<br>[unsigined] short<br>[unsigined] int<br>[unsigined] long<br>[unsigined] long long |
| float | float<br>double<br>long double |
| str  | char *  |
| dict  | struct  |
| List[float]  | double[:]  |

<br>

[Classも静的型にできる](https://cython.readthedocs.io/en/stable/src/tutorial/cdef_classes.html)。

## Cythonモジュールの関数の種類
Cythonの関数定義方法は[3種類ある](https://cython.readthedocs.io/en/stable/src/userguide/language_basics.html#python-functions-vs-c-functions)。

* `def`: Pythonモジュールから呼べるけど遅い。
* `cdef`: Pythonモジュールから見えず、Cythonモジュール内でしか使えないけど速い。
* `cpdef`: Pythonモジュールから呼べる`cdef`のような感じ。`cdef`より数倍遅くなることもあるっぽい。

## Cythonモジュールの形式
Cythonモジュールはいくつかの形式で書ける。

大きく分けて[Pure Python Mode](https://cython.readthedocs.io/en/stable/src/tutorial/pure.html)とそうでないのがあり、Pure Python Modeが現在の推奨。

### .pyxファイルに書く形式
旧来の非Pure Python Modeの形式。
拡張子が`pyx`のファイルにCythonコードを書くやり方。

`your_awesome_module.pyx`:
```python
import math

def int your_fancy_func(int x, int y):
    cdef int z

    z = _neet_helper(x) + _neet_helper(y)
    return math.fabs(z)

cdef int _neet_helper(int x):
    return x * x
```

<br>

この形式だと以下のような問題があって扱いづらい。

* コンパイルしないと実行できない。
* フォーマッタとかリンタを適用できない。
* エディタのサポートが微妙。
* ユニットテストを書き辛い。(Pythonで書くテストコードからcdef関数をimportもモックもできない。)

### .pxdファイルに書く形式
Pure Python Modeのひとつ。
純粋なPythonコードを普通の`.py`ファイルに書いておいて、[同名の`.pxd`ファイルに型情報を書く](https://cython.readthedocs.io/en/stable/src/tutorial/pure.html#augmenting-pxd)形式。

`your_awesome_module.py`:
```python
import math

def your_fancy_func(x, y):
    z = _neet_helper(x) + _neet_helper(y)
    return math.fabs(z)

def _neet_helper(x):
    return x * x
```


`your_awesome_module.pxd`:
```python
cpdef int your_fancy_func(int x, int y)
cdef int _neet_helper(int x)
```

<br>

この形式だと、`your_awesome_module`の中身は純粋なPythonコードなのでそのまま実行できるし、フォーマッタやリンタも普通に使える。
コンパイルしない限りユニットテストも普通にできる。

ただし以下の問題がある。

* `.py`ファイルと`.pxd`ファイルという別ファイルの内容の同期を保つ必要があり、やや保守しにくい。
* `.pxd`にはdef関数が書けないので、その型付けをするためにはcpdef関数にする必要がある。書き手の意図と異なることをしないといけないので微妙。
* `.pxd`には(下記マジック属性を使わないと)ローカル変数の型を書けない。

### マジック属性を使う形式
Pure Python Modeのひとつ。
通常の`.py`ファイルのPythonコードに[`cython`モジュールで型を記述する](https://cython.readthedocs.io/en/stable/src/tutorial/pure.html#magic-attributes)形式。


`your_awesome_module.py`:
```python
import cython
import math

@cython.locals(x=cython.int, y=cython.int, z=cython.int)
@cython.returns(cython.int)
def your_fancy_func(x, y):
    z = _neet_helper(x) + _neet_helper(y)
    return math.fabs(z)

@cython.cfunc
@cython.locals(x=cython.int)
@cython.returns(cython.int)
def _neet_helper(x):
    return x * x
```

<br>

これなら`.pxd`ファイルを保守しなくてよくて楽だし、コンパイルしない限り普通のPythonモジュールとして扱える。

けど結構読み辛い。

### 型アノテーションを使う形式
Pure Python Modeのひとつ。
実はCythonはPythonの[型アノテーション](https://docs.python.org/ja/3/library/typing.html)も解釈してくれるので、それで書くのが一番よさそう。
Cython 0.27で[ローカル変数の型アノテーション](https://www.python.org/dev/peps/pep-0526/)も解釈してくれるようになった。

`your_awesome_module.py`:
```python
import cython
import math

def your_fancy_func(x: cython.int, y: cython.int) -> cython.int:
    z: cython.int

    z = _neet_helper(x) + _neet_helper(y)
    return math.fabs(z)

@cython.cfunc
def _neet_helper(x: cython.int) -> cython.int:
    return x * x
```

<br>

これもコンパイルしない限り普通のPythonモジュールとして扱えるし、読みやすい。

ただ、割と新しめの機能だからか、ちょこちょこ[バグがある](https://github.com/cython/cython/issues/2529)模様。

## Tips

* `cdef`関数ではデコレータが使えない。ジェネレータも使えない。
* Cのコードで、Cの型として扱えないものはPyObjectという型になっている。このPyObjectをなるべく減らすのが高速化におおきく寄与する気がする。
* `str`はPyObjectになるけど[strのままにしておくのが推奨されている](https://cython.readthedocs.io/en/stable/src/tutorial/strings.html#general-notes-about-c-strings)。Cの文字列(i.e. char*)は遅かったりunicodeのサポートが微妙だったりするので。
* 戻り値がPyObjectじゃない`cdef`関数で発生した例外はデフォルトでは握りつぶされる。(Cに例外が無いから?)
    - 例外を呼び出し元に伝えたいなら[except](https://cython.readthedocs.io/en/stable/src/userguide/language_basics.html#error-return-values)を使う。
* 以下の条件を満たす関数を書くと、コンパイル時に「 __Exception clause not allowed for function returning Python object__ 」という奇妙なエラーになる。`@cython.returns`を付けると回避できる。
    - `@cython.cfunc`か`@cython.ccall`が付いている。
    - Pythonオブジェクトを返す。
    - 戻り値の型が型アノテーションで書かれている。
