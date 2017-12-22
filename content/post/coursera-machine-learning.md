+++
categories = ["Programing"]
date = "2017-12-22T10:20:44+09:00"
draft = false
eyecatch = "cml.png"
slug = "coursera-machine-learning"
tags = ["coursera", "machine learning"]
title = "CourseraのMachine Learningコースを修了した"
+++

機械学習の入門教材として有名な[CourseraのMachine Learningコース](https://www.coursera.org/learn/machine-learning)を修了した記念日記。

{{< google-adsense >}}

## Courseraとは
Courseraは、2012年にスタンフォード大学のコンピュータ工学科の2人の教授によって設立されたサービスで、世界トップクラスの大学の講座をオンラインで受けることができるもの。
東京大学とも提携している。

講座の一部は無料で受けることができる。

## CourseraのMachine Learningコースとは
Machine Learningコースは、Courseraの設立者の一人であるAndrew Ngによる、機械学習の基礎から実践まで浅く広く(?)学べる世界的に有名な講座。
Andrew先生は一時期Googleで働き、[Google Brain](https://en.wikipedia.org/wiki/Google_Brain)というDeep Learningのプロジェクトをリードしていたこともある機械学習のエキスパートで、さらにスタンフォードの教授だっただけあって教え方が非常にうまくてわかりやすい。

この講座は主に、5分～15分くらいの動画による講義と、小テストと、プログラミング課題から構成されている。
1週間分の内容が、1.5時間分くらいの動画と、15分くらいでできる小テストと、2、3時間で終わるプログラミング課題で、全体で11週間分やれば修了できる。
1、10、11週目はプログラミング課題が無くてすぐ終わる一方、3～5週目辺りは結構ハード。

私は2017/10/30に始めて、2017/12/19に完了したので、ちょうど50日かかったことになる。

動画は当然英語だが、有志により英語や日本語の字幕が付けられてるので聞き取れなくても問題はあまりない。
ただ、1～4週目くらいまでは、日本語の字幕がずれている動画が少なくなく、それらは英語の字幕でみる必要がある。
1つだけ英語の字幕もダメなものがあって、それだけは字幕なしで見た。

プログラミング課題は、[Octave](https://www.gnu.org/software/octave/)というオープンソースの数値解析言語で解く。
聞いたことない言語だったが、[MATLAB](https://jp.mathworks.com/programs/trials/trial_request.html?ref=ggl&s_eid=ppc_30300738322&q=matlab)との互換性維持を重視して開発されている言語なので、まあ覚えておいて損はない。
Octaveグラフ描画APIは、MATLABのグラフ描画APIをまねていて、MATLABのグラフ描画APIは、Pythonでよく使われるグラフ描画ライブラリである[Matplotlib](https://matplotlib.org/)がまねていて、つまりOctaveやってるとMatplotlibの勉強にもなる。

<br>

以下、11週間分の内容を、キーワードレベルで書いておく。

<br>

* 1週目

    * 機械学習の概要

        背景、歴史、活用例。
        教師あり学習(Supervised learning) vs 教師なし(Unsupervised learning)。

    * 線形単回帰(Linear regression with one variable)

        仮説関数(Hypothesis)、目的関数(Cost function)、平均二乗誤差(Mean squared error)、最小二乗法(Least squares method)、最急降下法(Gradient descent)。

    * 行列

        行列(Matrix)とベクトル(Vector)。
        行列演算。
        逆行列(Inverse)、転置行列(Transpose)

* 2週目

    * 線形重回帰(Linear regression with multiple variables)

        特徴量のスケーリング(Feature scaling)、平均正則化(Mean normalization)。
        学習率(Learning rate)。
        多項式回帰(Polynomial regression)。
        正規方程式(Normal equation)、特異行列(singular matrix)。

    * Octaveチュートリアル

        基本操作、データロード・セーブ、データ計算、描画、制御構文、ベクトル化。

* 3週目

    * ロジスティック回帰(Logistic regression)

        二値分類(Binary classification)。
        シグモイド関数(Sigmoid function)。
        決定境界(Decision boundary)。
        共役勾配法(Conjugate gradient)、BFGS、L-BFGS。
        多値分類(Multi-class classification)、1対その他(One-vs-all)。

    * 過学習(Overfitting)

        正則化(Regularization)、未学習(Underfitting)。
        バイアス(Bias)、バリアンス(Variance)。

* 4週目

    * ニューラルネットワーク(Neural Network)

        入力層(Input layer)、隠れ層(Hidden layer)、出力層(Output layer)。
        ユニット(Unit)、バイアスユニット(Bias unit)、重み(Weight)。
        活性化関数(Activation function)。
        順伝播(Forward propagation)。

* 5週目

    * ニューラルネットワーク続き

        逆伝播(Backpropagation)。
        Gradient checking。
        対称性破壊(Symmetry breaking)、ランダム初期化(Random initialization)。

* 6週目

    * 機械学習へのアドバイス

        訓練データ(Training set)、テストデータ(Test set)、交差検証データ(Cross-validation set)。
        一般化エラー(Generalization error)。
        高バイアス(High bias)、高バリアンス(High variance)。
        学習曲線(Learning curve)。

    * 機械学習システムの設計

        実装の優先度付け。
        スパム分類器(Spam classifier)。
        エラー分析(Error analysis)。
        歪んだクラス(Skewed classes)。
        真陽性(True positive)、偽陽性(False positive)、真陰性(True negative)、偽陰性(False negative)。
        適合率(Precision)、再現率(Recall)、F値(F1 score)。


* 7週目

    * サポートベクタマシン(SVM: Support Vector Machine)

        マージン(Margin)。
        線形カーネル(Linear kernel)、ガウスカーネル(Gaussian kernel)、多項式カーネル(Polynomial kernel)。

* 8週目

    * K平均法(K-means algorithm)

        クラスタリング(Clustering)。
        ランダム初期化(Random initialization)、局所最適解(Local optima)。
        エルボー法(Elbow method)。

    * 主成分分析(PCA: Principal Component Analysis)

        データ圧縮(Data compression)、データ可視化(Data visualization)、次元削減(Dimensionality Reduction)、データ復元(Reconstruction from compressed representation)。
        投影誤差(Projection error)、分散(Variance)。

* 9週目

    * 異常検知(Anomaly detection)

        密度推定(Density estimation)。
        ガウス分布(Gaussian distribution)、正規分布(Normal distribution)。
        異常検知 vs 教師あり学習。
        多変量ガウス分布(Multivariate gaussian distribution)。

    * レコメンダシステム(Recommender system)

        映画レーティング(Movie rating)。
        コンテンツベース(Content-­based recommendation)、協調フィルタリング(Collaborative filtering)。
        低ランク行列因子分解(Low-rank matrix factorization)。

* 10週目

    * 大規模機械学習

        バッチ勾配降下法(Batch gradient descent)、確率的勾配降下法(Stochastic gradient descent)、ミニバッチ勾配降下法(Mini-batch gradient descent)。
        オンライン学習(Online learning)。
        Map­‐reduce、データ並列性(Data parallelism)。

* 11週目

    * 写真OCR(Photo OCR)

        写真OCRパイプライン(Photo OCR pipeline)、テキスト検出(Text detection)、文字分割(character segmentation)、文字認識(character recognition)。
        スライディングウィンドウ(Sliding window)。
        人工データ合成(Artificial data synthesis)、歪曲収差(Distortion)。
        天井分析(Ceiling analysis)。

<br>

次は[ゼロから作るDeep Learning](https://www.oreilly.co.jp/books/9784873117584/)かな。
