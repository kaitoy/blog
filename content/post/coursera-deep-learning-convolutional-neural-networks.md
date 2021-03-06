+++
categories = ["Programing"]
date = "2018-02-06T00:37:11+09:00"
draft = false
cover = "deeplearning.ai.png"
slug = "coursera-deep-learning-convolutional-neural-networks"
tags = ["coursera", "machine learning", "deep learning", "neural network", "cnn"]
title = "CourseraのDeep Learning SpecializationのConvolutional Neural Networksコースを修了した"
+++

[CourseraのDeep Learning SpecializationのStructuring Machine Learning Projectsコースを修了した](https://www.kaitoy.xyz/2018/01/16/coursera-deep-learning-ml-strategy/)のに続き、[Convolutional Neural Networksコース](https://www.coursera.org/learn/convolutional-neural-networks)を修了した。

{{< google-adsense >}}

このコースは、CNNの原理、代表的なアーキテクチャ、応用などについて学べる4週間のコース。
動画は今のところ全部英語。
プログラミング課題は初のKeras。

このコースは結構難しくて、特に3週目と4週目は理解に苦しんだ。
というか理解しきれなかったような。
けどNST面白かった。

2018/1/16に始めて、2/6に完了。
22日間かかった。
修了したらまた[Certifacate](https://www.coursera.org/account/accomplishments/certificate/MVNK5ZA5CDKA)もらえた。

<!--more-->

以下、4週分の内容をメモ程度に書いておく。

* 1週目

    畳み込みニューラルネットワーク(CNN: Convolutional neural network)の基本。

    * 動画

        * 畳み込み計算

            画像認識でよく使われるNNのアーキテクチャ。

            低層ではエッジを検出し、層が進むにつれて複雑な特徴を学習する。

            画像を特定の行列(普通は奇数の正方行列。3×3が多い。)で畳み込むことで、特定の方向のエッジを検出できる。
            この行列をフィルタ(filter)という。カーネルと呼ばれることもある。
            例えば縦なら以下。

            ```plain
            [[1, 0, -1],
             [1, 0, -1],
             [1, 0, -1]]
            ```

            縦でもいろいろフィルタはあって、以下はSobelフィルタというもの。

            ```plain
            [[1, 0, -1],
             [2, 0, -2],
             [1, 0, -1]]
            ```

            以下はScharrフィルタ。

            ```plain
            [[ 3, 0,  -3],
             [10, 0, -10],
             [ 3, 0,  -3]]
            ```

            縦のフィルタを90度回転すると横のフィルタになる。

            深層学習では、フィルタもパラメータとして学習させる。

        * パディング(Padding)

            `n×n`の行列を`f×f`のフィルタで畳み込むと`n-f+1×n-f+1`の行列になる。
            つまり畳み込めば畳み込むほど画像が小さくなってしまう。
            また、画像の端のほうはフィルタにかかる割合が小さいので、情報量が小さくなってしまう。
            これらを解決するテクニックがパディング(Padding)。
            行列の周囲を0でパディングして、サイズを大きくしてから畳み込む。
            パディングがないのをValidな畳み込み、出力が入力と同じサイズになるようにパディングするのをSameな畳み込みという。

        * Strided畳み込み

            畳み込むときにフィルタをずらす幅を1より大きくする。
            パディングサイズがpでストライドがsのとき、`n×n`の行列を`f×f`のフィルタで畳み込むと`(n+2p-f)/s+1×(n+2p-f)/s+1`の行列になる。

        * 3次元(カラー画像)の畳み込み

            カラー画像は3次元の行列、つまり`n×n×c`の行列で、それを畳み込むのは`f×f×c`のフィルタで、出力は`n-f+1×n-f+1`の行列になる。
            チャネルごとにフィルタを設定して、色ごとにエッジ検出できる。
            フィルタごとの出力は全部スタックして、最終的な出力は3次元になる。

            畳み込み層はフィルタの要素数がパラメータ数になる。
            入力画像の大きさに依存しないので、パラメータ数が少なくて済み、過学習しにくい。

            入力を複数の畳み込み層に通したら、最終的に3次元の出力をなべてベクトルにして、後ろの層に渡す。

        * プーリング層(Pooling layer)

            計算量を減らすため、また特徴の抽出のために、畳み込み層のあとに使われる層。
            基本Max poolingが使われるけど、Average poolingというのもある。

            * Max pooling: フィルタをかけた部分を畳み込む代わりに、最大値を出力とする。大きな値が特徴が大きく出ているところだから、特徴を凝縮するイメージだけど、経験的にこれで上手くいくことが分かっているだけで、なぜ上手くいくかは判明していない。この層はパラメータを持たない。

            * Average pooling: フィルタをかけた部分を畳み込む代わりに、平均を出力とする。

            プーリング層のフィルタは大抵、サイズが`2×2`でパディングが0でストライドは2。

            普通、畳み込み層とプーリング層とセットで1層と数える。

        * 全結合層(Fully connected layer)

            全ノードがメッシュ状につながった普通の層。
            畳み込み層とプーリング層のセットがいくつかあって、その出力をベクトルになべて、全結合層につなぐ。

        * 一般的なCNN

            畳み込み層は、普通nhとnwを縮め、ncを増やす。
            また、全体として、層が浅くなるほど出力が減るのが多い。

            CNNはハイパーパラメータが多すぎるので、アーキテクチャは自分で考えるんではなく、論文呼んで自分の問題に合いそうなのを探すべし。

            畳み込み層は全結合層に比べてパラメータ数がかなり少なくて済むのがいいところ。
            これはパラメーター共有(Parameter sharing)という、画像のある個所で上手く動いたフィルタ(e.g. 縦エッジ検出器)は、その画像の他の箇所でも上手く働くという考え方がベース。

            また、層間の接続がまばらなのもパラメータを減らす要因。
            つまり出力のあるピクセルは、入力のうちフィルタ分のサイズのピクセルとしか関連していない。

            CNNは空間変化の不変性(Translation invariance)に強い。
            つまり画像の中の物体の位置が変わってもよく検出できる。
            これは同じフィルタを画像全体に適用するから。

    * プログラミング課題

        CNNの順伝播をNumPyで実装。

        CNNによる画像の分類をTensorFlowで実装。

* 2週目

    * 動画

        * ケーススタディ

            畳み込み層とかプーリング層をどう組み合わせるといいかは、事例を見ていくことで雰囲気をつかめる。

            * 古いやつ

                * LeNet-5

                    1980年代にできたふるいやつ。
                    モノクロ画像(32×32)の手書き数字認識。

                    当時はソフトマックスもReLUもなかった。
                    けど、畳み込み層とプーリング層のセットを繰り返して入力をチャネル方向に引き伸ばし、全結合層に流し込むアーキテクチャは、モダンなCNNにも通じる。

                    5層(内2層が全結合層)の浅いネットワークで、比較的パラメータが少なく、6万個くらい。
                    モダンなのだとこの1000倍くらいあるのが普通。

                    LeNet-5は、チャネルごとに違うフィルタを使っているが、今日では普通同じのを使う。

                    また、プーリング層のあとに活性化関数(シグモイド)かけてるのも特殊。
                    (モダンなアーキテクチャではプーリング層の前にかける?)

                * AlexNet

                    227×227×3のカラー画像
                    8層(内3層が全結合層)でパラメータは6千万個くらい。
                    活性化関数にReLU。

                    Local Response Normalizationという正規化層がある。
                    昨今ではあまり使われない。

                    論文が比較的読みやすい。

                * VGG-16

                    2014年に発表。

                    各層に同じフィルタを使い、フィルタ数も線形増加させるシンプルなアーキテクチャ。
                    16層(内2層が全結合層)で、1億3800万個のパラメータ。

            * モダンなやつ

                理論的にはネットワークを深くすると精度が高くなるけど、現実的にそうはいかない。
                深いネットワークは勾配消失や勾配爆発で訓練しにくいので。
                モダンなアーキテクチャはこの問題に対応。

                * ResNet(Residual Network)

                    残差ブロック(Residual block)を持つ。
                    このブロックでは、浅い層からの出力を深い層のReLUの入力に足し合わせる。
                    この深い層からの依存はショートカット(short cut)とかskip connectionとか呼ばれる。

                    ショートカットのおかげで深い層の学習が効率的になり、層を152まで深くできた。

                * Network in Network

                    畳み込み層に1×1のフィルタを使う。
                    1×1畳み込み(one by one convolution)、またはNetwork in Networkと呼ばれる。

                    これを使うと、入力のhとwを変えずに、チャネル数を減らして計算量を減らしたり、非線形性を追加することができる。

                * Inception Network (GoogleNet)

                    フィルタのサイズや畳み込みかプーリングかを考えるのが難しいので、1層内で複数のフィルタサイズで畳み込みやプーリングして、スタックしたものを出力する手法がある。
                    これをする部分をInception moduleという。
                    計算コストが大きくなるので、最初に1×1畳み込みで圧縮してからその後の畳み込みをする。
                    1×1畳み込みの部分でデータがいったん小さくなるので、そこをボトルネック層(Bottleneck layer)と呼ぶ。

                    ボトルネック層によって、精度に影響が出ることはない。

                    Inception moduleを組み合わせたネットワークをInception Networkという。
                    Inception Networkの例の一つがGoogLeNet。
                    GoogLeNetは中間層から全結合層・ソフトマックス層につなげる支流をもっていて、中間層まででうまく学習できているかを見れて、過学習を防げるようになっている。

                    因みにInceptionという名前は映画のInceptionから来ている。

        * 実践

            * 既存の実装の利用

                モダンなCNNは複雑すぎて、エキスパートが論文を読み込んでも再現することが難しい。
                が、普通は論文の著者がOSSで実装を公開するのでそれを使ったりベースにしたりすべし。

                学習済みのモデルもあることがあるので、転移学習にも使える。
                ソフトマックス層だけ入れ替えて、そこのWだけ学習させて自分の問題に使うなど。
                色んな深層学習フレームワークが転移学習をサポートしてる。

            * データ合成(Data augmentation)

                画像認識の分野では基本的にデータが沢山要るけどデータが手に入りにくい。
                ので合成するのが効果的。

                左右判定とか、切り抜きとか、回したり、歪めたりとかは、有効だけどあんまりやられない。
                若干編集が複雑なので。

                色相を変える(Color shifting)のがよくやられる。赤味を増やしたり。
                色を選ぶときには主成分分析(PCA)が使える。(PCA Color Augmentation)

                一つのCPUスレッドに元画像のロードと合成をやらせて、別のスレッドで並列に学習を処理するのが一般的な実装。

                データ合成するにも、どの程度変化させるかというハイパーパラメータが付きまとうので、既存の実装やアイデアを使うのがいい。

            * 画像認識の現状

                * データ vs hand engineering

                    データが沢山ある分野の問題だと、でかいネットワークを適当に組んで学習させれば上手く解ける。
                    データがあんまりないと、色々工夫(hand engineering)が必要になってくる。
                    特徴量を選んだり、アーキテクチャを工夫したり。
                    例えば物体検知は画像認識よりかなりデータが少ない。

                * ベンチマークやコンペで上手くやるコツ

                    研究者は、論文を通しやすくするため、ベンチマークやコンペのデータに対して頑張る。
                    ベンチマークに対して上手くやるコツ:

                    * アンサンブル(Ensembling)

                        複数のNNを独立に訓練して、それらの出力の平均を使う。
                        1,2%の性能向上が見込める。
                        けど計算コストが高いので、普通プロダクションでは使わない。

                    * Multi-crop at test time

                        テスト時にテストデータを色んな感じに切り抜いて、それらに対する予測値を平均する。
                        10-crop。
                        アンサンブルに比べ、訓練時の計算コストが少ないし、予測時に1つのモデルを保持すればいいのでメモリ使用量が少ない。
                        若干の性能向上が見込め、プロダクションでも使われることがある。

                * オープンソースコードの利用

                    だれかが考えたアーキテクチャを使え。

                    OSS実装を使え。

                    なんなら訓練済みモデルを使え。

    * プログラミング課題

        * Kerasのチュートリアル

            というほど解説してくれるわけではないけど。

        * Kerasで50層のResNetを実装

* 3週目

    物体認識(Object detection)。

    * 動画

        * 位置特定(Localization)

            画像を与えられて単にラベルを付けるのは分類。
            ラベルの物体の位置を示すのが位置特定。
            分類したあとさらに位置特定したい。

            分類する画像は、普通一つの画像の中に一つの物体が大きく映っている。
            一方、物体認識は、一つの画像の中に複数の物体があったりする、もう少し複雑な問題。

            位置特定するには、ソフトマックス層に、クラス以外に4つの出力をさせる。
            すなわち物体の中心点のx座標、y座標、それと物体を囲む枠の高さ、幅。
            それぞれ0～1の値で、画像全体に対する割合を示す。

            また、物体があるかないかという予測値Pcも出力する。
            この予測値が0のときは、損失関数でそれいがいの出力を計算に入れない。

            より一般的には、物体の位置を示す任意の数のランドマーク(Landmark)の座標を出力させる。

        * 物体認識

            スライディングウィンドウ認識(Sliding windows detection)する。
            すなわち、小さい枠をずらしながら画像の切り抜きをたくさん作って、それぞれ分類する。
            ウィンドウサイズを変えてもやる。
            計算コストがかかる。

            のでCNNでやる。

            まず、全結合層は、数学的に等価な畳み込み層で置き換えられる。
            5×5×16の入力を受け取って、5×5の400個のフィルタで畳み込むと、
            1×1×400の出力が得られ、これは400ノードの全結合層と一緒。
            最後に1×1の4個のフィルタで畳み込むと、4つの出力をするソフトマックス層みたいになる。
            こういう、全部畳み込み層のNNをFCN(Fully Convolutional Networks)という。

            で、入力のサイズ(高さと幅)を広げてやると、中間層と出力もちょっと広がる。
            このCNNは、入力の一部を5×5のウィンドウで切り抜いた部分の分類結果が、出力の1ピクセルに対応するようなものになる。
            なので一回CNNに通せば、一回の計算でスライディングウィンドウできる。

            けどこれは、物体を囲む枠が正確でないという欠点がある。
            実際は長方形であるべきだったりするので。
            これを解決するのがYOLO(You Only Look Once)アルゴリズム。

            YOLOでは、まず入力画像をグリッド状に分割して、それぞれについて分類と位置特定する。
            複数のセルに物体がまたがっている場合は、物体の中心があるセルだけにあるものとする。
            それぞれのセルの出力をスタックして、3次元の出力にする。
            つまり、グリッドが3×3なら、3×3×(もとのyベクトルの次元)とする。
            (普通はもっと細かいグリッドにする。)
            で、CNNをこういう形の出力をするように組む。

            YOLOの論文はかなりむずい。

            位置特定の評価をするのに、IoU(Intersection over Union)という指標がある。
            これは、2つの領域の重なり具合を示すもので、2つの領域が重なった部分の面積を、2つの領域全体の面積で割った値。
            モデルが特定した枠と期待する枠とで、IoUが0.5以上だとよしとすることが多い。

            YOLOを使うと、複数のセルで同じ物体を認識してしまうことが多い。
            これを一つに絞るのがNMS(Non-max suppression)。
            ざっくり言うと、それぞれのセルの確度(Pc)を見て、一番でかいの以外を無効化する。

            詳しく言うとまず、Pcがある閾値(e.g.0.6)以下のものを無効化する。
            で、残ったものの中から、最大のPcを選び、それとおおきくかぶっている枠(IoUが0.5以上など)を無効化する。
            で、また残ったのものの中から最大のPcを選び、同じことを繰り返していく。
            クラスが複数あったら、これをクラスごとにやる。

            一つのセルに複数の物体があったらどうか。
            境界ボックス(Anchor box)を使う。
            事前に複数の形の枠(境界ボックス)を用意しておいて、それぞれについての予測を出力ベクトルに並べる。
            で、一番IoUが高い境界ボックスを採用する。

            境界ボックスは手動で作ったり、k平均法で作ったりする。

            スライディングウィンドウは、明らかに何もない部分の計算もしちゃうのでちょっと無駄。
            なので、そういう部分はスキップしようというのがR-CNN(Regions with CNN)。
            これはRegion proposalsとCNNを組み合わせたもの。
            Region proposalsは、セグメンテーション(Segmentation)アルゴリズムで画像をざっくり区分けして、それっぽい部分を処理対象にするもの。

            R-CNNはすごく遅いので、あまり使われていないし、Andrew先生も好んで使わない。
            Fast R-CNN、Faster R-CNNってのもあるけど、まだ遅い。

    * プログラミング課題

        * KerasでYOLOv2モデルを実装。

            CNN部分は訓練済みのモデルを使って、出力をフィルタリングする部分を作る。

* 4週目

    顔認識(Face recognition)とNeural style transfer。

    * 動画

        * 顔認識

            顔認証(Face authentication)には、顔認識と、生きた人間かの判定(Liveness detection)が要るけど、前者を主に学ぶ。

            顔認識は顔検証(Face verification)の難しい版。
            後者は顔画像と名前を与えて、正しい組み合わせかを判定する。
            前者は顔画像を与えて、DBからその人を探す。

            顔認識は一般的に、One-shot learning問題に対応する必要がある。
            つまり一つの訓練データから学習しないといけない。
            DBに一人のひとについて何個も画像があるというケースは少ない。

            CNNに顔画像を入力して、ソフトマックス層で分類するのは、訓練データが少なすぎるのでうまくいかない。
            代わりに類似関数(Similarity function)を学習する。
            つまり、二つの画像を入力として、異なる度合いを出力するもの。
            で、その出力が閾値以下だったら同一人物と判定する。
            これをDBに入っている画像それぞれについてやる。

            類似関数にはシャム(Siamese)ネットワークをつかう。

            CNNの最後の全結合層の出力ベクトルは、入力画像をエンコードしたものだと考えられる。
            二つの画像を、別々に同じCNNにいれて、二つの出力ベクトルを得たら、それらのユークリッド距離の二乗を差として出力する。
            これがシャムネットワーク。
            二つの画像が同一人物ならユークリッド距離が小さくなるように、違うなら大きくなるように訓練する。

            損失関数にはTriplet loss関数を使う。
            同一人物を比較するとき、Anchor画像とPositive画像の比較、違う人物の比較はAnchor画像とNegative画像の比較と呼ぶ。
            AnchorとPositiveのユークリッド距離がAnchorとNegativeのユークリッド距離以下になってほしい。
            つまり前者マイナス後者がゼロ以下になって欲しい。
            ただこれだと、CNNが全ての画像について同じ出力をするように学習してしまうかもしれないので、`0-α`以下になるように訓練する。
            αはマージンと呼ばれるハイパーパラメータ。

            AnchorとPositiveとNegativeの一組をTripletと呼ぶ。
            Negativeをランダムに選ぶと、全然違う顔の組み合わせが多くなって、類似関数があまり学習しない。
            ので、似てるひとを組み合わせたTripletを多く作ってやると効率よく学習する。

            シャムネットワークの二つの出力ベクトルをロジスティック回帰ユニットに入れて、同一人物か否かの二値分類する方法もある。
            ベクトル間の距離も、ユークリッド距離の他、カイ二乗値(χ square similarity)ってのもある。

            DBには、顔画像そのものよりも、エンコードしたベクトルを入れておくと計算量を省けるし、DBサイズも抑えられる。

        * ニューラル画風変換(NST: Neural style transfer)

            Content画像(C)とStyle画像(S)から、あらたな画像(G)を生成するCNN。
            (CNNは別途訓練済みのものを使うので、転移学習の一種。)

            CNNの可視化ができる。
            画像の一部を入力して、ある層の一つのユニットの出力が最大になるものを選んで集めると、そのユニットがどのような特徴を抽出しているかがわかる。
            深い層ほど広い範囲を見て、複雑なパターンを学ぶ。

            コスト関数`J(G)`を最小化する。
            `J(G)`はコンテントコスト`Jcontent(C, G)×α`とスタイルコスト`Jstyle(S, G)×β`の和。
            前者はCとGの類似関数で、後者はSとGの類似関数。
            αとβはハイパーパラメータ。
            Gをランダムに初期化して、最急降下法でGを調整していく。

            訓練済みのCNN(VGGなど)を使って、中間層lを選ぶ。
            Cを入力してlから出てきた値と、Gを入力してlから出てきた値が似てたら、CとGを似ているとする。
            つまりそれらをベクトルにアンロールしたものの二乗誤差が`Jcontent(C, G)`。
            lが浅ければ浅いほど、CとGは似たものになる。

            スタイルは、ある層lの出力のx座標とy座標の各点について、チャネル間で値の関連性を見る。
            あるチャネルのあるニューロンが縦縞を検出していて、ほかのチャネルのあるニューロンがオレンジ色を検出していたとしたら、画像にオレンジの縦縞がよく現れるなら両者は関連が高く、そうでなければ低い。
            SとGとの間でこの関連性が似てれば、スタイルが似ていると言える。

            スタイル行列(Style matrix)で表す。
            ある層のスタイル行列は`nc×nc`で、チャネル間の関連度を表す。
            行列の一つの値は、二つのチャネルの各アクティベーションの掛け合わせものの合計。
            関連性が強いとこの掛け合わせは大きくなる。
            (対角成分は同じチャネル同士の積になって、そのスタイルがどれだけ全体的に出ているかを示す。)
            この行列は代数学ではグラム行列(Gram matrix)と呼ばれる。

            このスタイル行列をSとGで計算して、それらの二乗誤差をl層のスタイルコストとする。
            で、これにハイパーパラメータλlをかけたものを層ごとに計算して、足し合わせたものを全体のスタイルコストとする。

        * 2D以外の画像の処理

            心電図のデータとかの1Dデータや、CTスキャンみたいな3Dデータでも、それに合わせた次元のフィルタを使えば畳み込める。
            1DデータはRNNでもできるけど、CNNでもできて、それぞれメリットデメリットがある。

    * プログラミング課題

        * TensorFlowでニューラル画風変換を実装

            VGG-19をImageNetのデータで訓練したものを使う。
            ルーブル美術館の写真をContent画像に、モネの絵をStyle画像に使って画像を生成。

        * Kerasで顔認識モデルを実装

            現時点でtriplet_lossの採点にバグがある。
            対策はフォーラム参照。
