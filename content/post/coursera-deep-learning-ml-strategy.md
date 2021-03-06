+++
categories = ["Programing"]
date = "2018-01-16T07:56:43+09:00"
draft = false
cover = "deeplearning.ai.png"
slug = "coursera-deep-learning-ml-strategy"
tags = ["coursera", "machine learning", "deep learning", "neural network"]
title = "CourseraのDeep Learning SpecializationのStructuring Machine Learning Projectsコースを修了した"
+++

[CourseraのDeep Learning SpecializationのImproving Deep Neural Networks: Hyperparameter tuning, Regularization and Optimizationコースを修了した](https://www.kaitoy.xyz/2018/01/12/coursera-deep-learning-improving-deep-neural-networks/)のに続き、[Structuring Machine Learning Projectsコース](https://www.coursera.org/learn/machine-learning-projects)を修了した。

{{< google-adsense >}}

このコースは、深層学習プロジェクトの進め方のコツや問題への対処方法などについて学べる2週間のコース。
今回はプログラミング課題がない。
動画は今のところ全部英語。

ちょっと動画編集ミスが多かった。
同じことを二回言ったり、無音無絵の時間があったり、マイクテストしてたり。

2018/1/13に始めて、1/15に完了。
3日間かかった。
修了したらまた[Certifacate](https://www.coursera.org/account/accomplishments/certificate/7MHFMLHP67C4)もらえた。

<!--more-->

以下、2週分の内容をメモ程度に書いておく。

* 1週目

    モデルの改善をするのに、データを増やしたりハイパーパラメータを変えたり色々な手法がある。
    一つを試すのに下手すると数か月とかかかるので、効率よく手法の取捨選択し、モデルを改善していくための戦略について学ぶ。

    * 動画

        * 直交化(Orthogonalization)

            一つの要素で複数の制御をしようとすると難しいので、一つの制御だけするようにする。
            具体的には、以下のことを別々に扱う。

            * 訓練データに目標の精度までフィットさせる。
            * devデータに目標の精度までフィットさせる。
            * テストデータに目標の精度までフィットさせる。
            * 現実のデータでうまく動くようにする。

            それぞれの目的について、チューニングすべき要素は別々になる。

            早期終了は直行化の原則に反しているので、ほかの方法があるならそっちをやったほうがいい。

        * 指標(Goal)の設定

            モデルの改善はイテレーティブなプロセスなので、サイクルを速く回したい。
            そのため、モデルを評価する単一の数値があるといい。
            F1スコアとか。平均とか

            単一の指標にまとめるのがむずいときもある。
            精度と速さとか。
            そんなときは一つ以外の指標を足切りだけに使う。
            ある閾値以上の速さが出てるもののなかで精度をくらべるなど。

        * データの分け方

            devデータとテストデータの分布(と評価指標)は同じ感じにしないといけない。
            そのために、いったん全データをシャッフルしてから分割する。
            訓練データの分布は異なってても問題ない。

            `訓練:テスト = 70:30`とか、`訓練:dev:テスト = 60:20:20`とかいう比率は、1万くらいのデータなら適当。
            けど100万くらいなら、98:1:1くらいが妥当。

            テストデータはモデルの最終評価をするためのものなので、どれだけ評価したいかによってサイズを変える。
            0もありがちだけど、非推奨。

            猫の画像のなかにエロ画像が混じっちゃうようなモデルはだめ。
            猫判定率が多少下がっても、エロ画像が含まれないほうがまし。
            こういう場合は評価指標を変える必要がある。
            エロ画像を猫と判定した場合にペナルティを大きくするなど。

            直行化の観点で言うと、指標を決めるのと、その指標に従って最適化するのは、別のタスクとして扱うべき。

        * 人並性能(Human-level performance)との比較

            人並性能とは、人が手動で達成できる精度。そのエラー率、つまり人並誤差(Human-level error)はベイズ誤差(Bayes optimal error)に近い。

            モデルを改良していくと、人並性能を超え、その後改善速度は鈍化し、人並誤差はベイズ誤差に漸近していく。
            鈍化する理由は、人並性能がベイズ誤差に近いのと、人以上の精度に人がチューニングするのが無理があるから。
            人手でラベル付きデータを作れないし、エラー分析もできなくなるので。

            人並誤差より訓練データでのエラー率が結構高いなら、高バイアス対策をする。
            人並誤差と訓練データでのエラー率が近くて、devデータでのエラー率が結構高いなら、高バリアンス対策をする。
            人並誤差と訓練データでのエラー率との差ををAndrew先生は可避バイアス(Avoidable bias)と名付けた。

            人並誤差はベイズ誤差の近似として使える。
            人並誤差は、ある判別問題に関して、その道のエキスパート達が議論して解を出すみたいな、人類が全力を尽くしたうえでの誤差とする。
            人並誤差が分かれば、訓練データとdevデータのエラー率を見て、高バイアスか高バリアンス化を判別できる。

        * モデルの性能改善手順

            1. 訓練データにフィットさせ、可避バイアスを最小化する。

                * モデルを大きくする。
                * 最適化アルゴリズムを高度なものにするか、長く訓練する。
                * NNのレイヤを深くしたり隠れ層のノードを増やしたり、CNNとかRNNとかの高度なアーキテクチャにする。

            2. dev・テストデータで評価し、バリアンスを下げる。

                * データを増やす。
                * 正則化する。
                * ハイパーパラメータをいじる。

        * Andrej Karpathyへのインタビュー

* 2週目

    * 動画

        * エラー分析

            エラー率が高いときに、エラーが起きたdevデータのサンプルを見て原因を分析する。
            天井分析(Ceiling analysis)も併せてやる。
            例えば、猫判定器で、犬を猫と判定したサンプルがあったとして、犬の問題に取り組むかどうかは、全体のエラーサンプル数に対する犬のエラーサンプル数の割合を見て、その取り組みで最大どれだけの効果を得るかを分析する。

            天井分析を複数の問題点に対してやれば、どれに時間をかける価値があるかの指標を得られる。

        * ラベリングミスへの対処

            ディープラーニングは、ランダムエラーに対して堅牢で、訓練データに多少のラベリングミスがあっても問題なく動く。

            devデータにミスがあった場合、エラー分析の際にそれも数えておいて、対処すべきかどうかを判断する。
            他の問題によるエラーの割合と比べて、ラベリングミスによるものの割合が大きければ対処すればいいし、そうでなければほっておく。
            また、エラー全体に対するラベリングミスの割合が大きくなると、モデルの性能比較に支障が出てくるので、そうなったらラベリングミスに対処する必要が高まってくる。

            devデータのラベリングミスを直すときは、テストデータも同時に直し、分布に違いが出ないようにする。
            また、エラーなサンプルだけじゃなく、正答したサンプルも見直すべし。
            けど、訓練データは直さなくてもいい。数も多いし、devデータと分布が違っていても問題ないし。

        * 新しいディープラーニングシステムを作るときのガイドライン

            あまり経験のない分野のシステムを新たに作るなら、早く立ち上げてイテレーションを回すべし。
            具体的には、

            1. dev・テストデータと、指標を用意する。
            2. さっさとシステムを実装する。
            3. バイアス/バリアンス分析やエラー分析をして、次のアクションを決める。
            4. システムを改善する。

            というのを速く回す。
            経験が深かったり、確かな研究結果がすでにあったりするなら、最初から凝ったシステムにしてもいい。

        * 訓練データとdev・テストデータの分布のミスマッチ

            ディープラーニングでは訓練データは大抵不足するから、現実的に、訓練データはいろんなデータのかき集めで、dev・テストデータとは分布が異なってくる。

            例えば、実際のデータが10000個で、かき集めのが200000個あったら、全部合わせてシャッフルしてデータ分割するのは、dev・テストデータの質が悪くなるのでダメ。
            dev・テストデータには実際のデータだけ使って、かき集めのは全部訓練データに使うべし。

            分布がミスマッチになると、バイアス/バリアンス分析がむずくなる。
            devデータでエラーが増えても、単にdevデータのほうが判別が難しいデータなのかもしれない。

            分析をしやすくするため、訓練devデータを作る。
            これは、訓練データと同じ分布のデータで訓練に使わないデータ。訓練データのサブセット。

            訓練データと訓練devデータのエラー率の差が大きければオーバーフィット。
            訓練データと訓練devデータのエラー率の差が小さくて、devデータのエラー率が高いなら、データミスマッチ問題(Data missmatch problem)。

            あんまり発生しないけど、devデータよりテストデータのエラー率が結構大きいなら、devデータにオーバーフィットしてるので、devデータサイズを増やしたりする必要がある。

        * データミスマッチ問題への対応

            データミスマッチ問題が発覚したら、訓練データをdevデータに近づけたり、devデータに近いものを訓練データに加えたりすることを考える。
            例えば、車内の音声認識のためのモデルを開発していて、devデータに車の雑音が入っていることが分かったら、訓練データにそういう雑音を合成してやるなど。
            ただし、その場合、同じ雑音をすべての訓練データに適用すると、その雑音にモデルがオーバーフィットするリスクがあるので注意。

        * 転移学習(Transfer learning)

            ある問題に対して作ったモデルを、別の問題に再利用する。
            (但し入力は同種のデータ。画像なら画像、音声なら音声。)
            その際、NNの、出力層だけのパラメータをランダム初期化したり、層を足したりして、あたらしい訓練データで学習させる。
            新たな訓練データが少ない場合は、後ろの1,2層だけを再学習させ、データがたくさんあったら全体を再学習させる。

            最初の学習を事前学習(Pre-training)、新たなデータでの学習をファインチューニング(Fine tuning)という。
            画像認識の分野でよく使われる。NNの浅い層のほうが、汎用的な特徴(エッジ検出など)を学習するので再利用できると考えられているが、詳しい原理は判明していない。

            事前学習するデータより、ファインチューニングに使えるデータが少ないときに効果的。
            データ量が同じくらいだったり、後者のほうが多い場合は、最初から目的のデータで学習させたほうがいい。

        * マルチタスク学習(Multi-task learning)

            一度に複数の判別をさせるモデルをつくる。
            ソフトマックス層つかった多クラス分類に似てるけど、一つのサンプルから複数のクラスを検出する。
            例えば車と歩行者と標識など。
            物体検知によく使われる。

            一つ一つのクラスのデータが少なくても低層が学んだ共通特徴を活用できるので、一つのタスクをするNNを複数訓練するより性能が良くなることがある。

            ラベルが歯抜けでも学習できる。

            複数タスクをこなすため、大き目なネットワークにする必要がある。

            それぞれのクラスのデータが十分あるときはあまり使われない手法。
            目的のクラスのデータが少ないとき、転移学習のほうがよく使われる。

        * End-to-end学習

            従来、ある入力から解となる出力を得るのに、パイプラインで複数の処理をしていたが、これを全部一つのNNで処理する手法。
            データ量が多いと上手くいく。

            例えば、人の認識をするときパイプラインでは、顔検出して、拡大してクロップしてからNNにかける。
            こっちのほうが個々のタスクがシンプルで、それぞれのデータも手に入りやすいので性能を出しやすい。
            けどもし、end-to-endのラベル付きデータが十分にあればend-to-end学習でもいける。

            翻訳タスクの場合、現実的に大量のデータが手に入るので、end-to-endで上手くいく。

            データさえたくさんあれば、パイプラインのコンポーネント的なところも勝手に学んでくれるので、ヒトが考え付くよりもいい特徴を学んでくれるかもしれない。

        * Ruslan Salakhutdinovへのインタビュー
