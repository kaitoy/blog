+++
categories = ["x", "y"]
date = "2018-03-27T07:50:46+09:00"
draft = true
eyecatch = ""
slug = ""
tags = ["x", "y"]
title = "hello tensorflow"
+++

TensorFlow 1.7

ちょっと前に触ったときは、テンソルを定義して、それを組み立てて計算グラフを定義して、セッションでrunするみたいな感じだったけど、かなりAPIの抽象化が進んでいるっぽい。

基本は実装済みのモデル(Estimator)を使う。
凝ったモデルを作りたいならLayers APIを使ってレイヤを組み立てる。
セッションとかテンソルが出てくるのはさらに凝ったことをしたい場合、という感じ。

これもうKeras要らないんじゃ…

{{< google-adsense >}}

API|抽象化レベル
----------|---------
[Estimators](https://www.tensorflow.org/programmers_guide/estimators)|High
[Layers](https://www.tensorflow.org/api_guides/python/contrib.layers)|Mid
[Datasets](https://www.tensorflow.org/get_started/datasets_quickstart)|Mid
[Metrics](https://www.tensorflow.org/api_guides/python/contrib.metrics)|Mid
[Python](https://www.tensorflow.org/api_docs/python/)|Low
[C++](https://www.tensorflow.org/api_docs/cc/)|Low
[Java](https://www.tensorflow.org/api_docs/java/reference/org/tensorflow/package-summary)|Low
[Go](https://godoc.org/github.com/tensorflow/tensorflow/tensorflow/go)|Low

## Low Level API (TensorFlow Core)
tensorが単位データ。
tensorはn次元の配列で、次元数をrank、各次元の要素数をタプルで表したものをshapeという。
(スカラはrank 0、ベクトルはrank 1、マトリックスはrank 2。)

tensorの値はNumPyのarrayで表される。

TensorFlowコアのプログラミングは、計算グラフ([tf.Graph](https://www.tensorflow.org/api_docs/python/tf/Graph))を構築して、セッションで([tf.Session](https://www.tensorflow.org/api_docs/python/tf/Session))実行する、という流れが基本。

計算グラフは一連のTensorFlowオペレーションを会わらすもので、[tf.Operation](https://www.tensorflow.org/api_docs/python/tf/Operation)と[tf.Tensor](https://www.tensorflow.org/api_docs/python/tf/Tensor)で構築される。

## High Level API

Estimatorsは、モデルをラップして、訓練、評価、予測、モデルのエクスポート([TensorFlow Serving用](https://www.tensorflow.org/versions/r1.0/deploy/tfserve))をするクラス群。
Estimatorsを使うとモデルを抽象化してポータブルにできるなどの利点がある。

基底クラスは[Estimator](https://www.tensorflow.org/api_docs/python/tf/estimator/Estimator)

データインプットパイプラインとは分離すべきで、Datasetsをつかう。

EstimatorとDatasetsで書くのが推奨されている。

Estimatorには以下のようなものが用意されている。

* [tf.estimator.LinearClassifier](https://www.tensorflow.org/api_docs/python/tf/estimator/LinearClassifier)
* [tf.estimator.DNNClassifier](https://www.tensorflow.org/api_docs/python/tf/estimator/DNNClassifier)

[自分で作る](https://www.tensorflow.org/get_started/custom_estimators)こともできる。
[tf.keras.estimator.model_to_estimator](https://www.tensorflow.org/api_docs/python/tf/keras/estimator/model_to_estimator)を使って、Kerasのモデルを[コンバートして作る](https://www.tensorflow.org/programmers_guide/estimators#creating_estimators_from_keras_models)こともできる。

[Estimatorを使ったプログラミング](https://www.tensorflow.org/programmers_guide/estimators#structure_of_a_pre-made_estimators_program)は以下のような流れになる:

1. データ取得関数を書く

    訓練データなどをどこかからか取ってきて、整形して、以下の二つのオブジェクトを返す関数を書く。

    * features: キーが特徴名、値が特徴量のTensorである辞書。
    * labels: ラベルを含むTensor。

    [Dataset API](https://www.tensorflow.org/api_docs/python/tf/data/Dataset)を使って書くのが推奨。

    [Datasets Quick Start](https://www.tensorflow.org/get_started/datasets_quickstart)

2. 特徴カラムを定義する

    [tf.feature_column](https://www.tensorflow.org/api_docs/python/tf/feature_column)を使って、特徴名、型、前処理を特徴量毎に定義する。

    [Feature Columns](https://www.tensorflow.org/get_started/feature_columns)

3. Estimatorをインスタンス化する

    イニシャライザに特徴カラムを渡す。

4. Estimatorの`train`、`evaluate`、`predict`とかを呼ぶ

    `train`とかにデータ取得関数を渡す。
