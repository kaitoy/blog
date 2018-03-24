+++
categories = ["Programing"]
date = "2018-03-04T16:22:46+09:00"
draft = false
eyecatch = "ml.png"
slug = "open-data"
tags = ["machine learning", "deep learning"]
title = "オープンデータメモ"

+++

機械学習の勉強に使えそうなオープンデータのメモ。

{{< google-adsense >}}

* テキスト
    * [WordNet](http://wordnet.princeton.edu/): 英語の語彙データベース。名詞、動詞、形容詞、副詞ごとに階層的にグルーピングされたDBが提供されている。ライセンスは[WordNet License](http://wordnet.princeton.edu/wordnet/license/)で、著作権表示さえしておけば、目的の制限なく、使用、複製、改変、再配布を無料でできる。
    * [日本語ワードネット](http://compling.hss.ntu.edu.sg/wnja/index.ja.html): 日本語版WordNet。ライセンスは[Japanese WordNetライセンス](http://compling.hss.ntu.edu.sg/wnja/license.txt)で、著作権表示さえしておけば、目的の制限なく、使用、複製、改変、再配布を無料でできる。
* 画像
    * [ImageNet](http://image-net.org/index): WordNetの名詞の階層構造に従ってラベル付けされた1400万個以上の画像データ。バウンディングボックスも付いてる。画像はFlickrとかに上がっているもので、そこから自分で無料でダウンロードできる。非商用(研究か教育)目的ならImageNetのサイトから画像をダウンロードできる。
    * [Open Images](https://github.com/openimages/dataset): 900万個の画像に数千クラスのラベルとバウンディングボックスを付けたデータ。ライセンスはCreative Commons BY 4.0。
    * [MNIST](http://yann.lecun.com/exdb/mnist/): 手書き数字のラベル付きデータセット。訓練データとテストデータ合わせて7万個。機械学習のHello Worldに使われる。
* 動画
    * [YouTube-8M](https://research.google.com/youtube8m/): 800万個のYouTube動画を4800クラスでラベル付けしたデータ。ライセンスはCreative Commons BY 4.0。
    * [YouTube-Bounding Boxes](https://research.google.com/youtube-bb/): 24万個のYouTube動画に23クラスのラベルと560万個のバウンディングボックスを付けたデータ。ライセンスはCreative Commons BY 4.0。
    * [Atomic Visual Actions(AVA)](https://research.google.com/ava/): 5.76万個のYouTube動画を、80種の動作についてラベル付けしたデータ。ライセンスはCreative Commons BY 4.0。
* 音声
    * [Speech Commands Datase](http://download.tensorflow.org/data/speech_commands_v0.01.tar.gz): 6.5万個の1秒音声データで、30種の言葉を数千人が発音してる。ライセンスはCreative Commons BY 4.0。
    * [AudioSet](https://research.google.com/audioset/): 200万個の10秒音声データで、527クラスでラベル付けされてる。ライセンスはCreative Commons BY 4.0。
* データカタログサイト
    * [DATA GO JP](http://www.data.go.jp/): 日本政府が公開してる公共データ集。
    * [UCI Machine Learning Repository](http://archive.ics.uci.edu/ml/index.php): 現時点で426のデータセットが配布されている。有名なアヤメのデータセットのソースはここ。
* 単語ベクトル
    * [HR領域の単語ベクトル](https://github.com/bizreach/ai/tree/master/word2vec): 約9.95億個の日本語のHR系の単語からWord2Vecで学習した単語ベクトル。ベクトル長は100か200。
* 学習済みモデル
    * [Detectron Model Zoo](https://github.com/facebookresearch/Detectron/blob/master/MODEL_ZOO.md): Facebookが開発した物体検知モデルの学習済みモデル。Caffe2。
