+++
categories = ["Programing"]
date = "2018-01-05T15:20:23+09:00"
draft = false
cover = "deeplearning.ai.png"
slug = "coursera-deep-learning-neural-networks-and-deep-learning"
tags = ["coursera", "machine learning", "deep learning", "neural network"]
title = "CourseraのDeep Learning SpecializationのNeural Networks and Deep Learningコースを修了した"
+++

[CourseraのMachine Learningコース](https://www.kaitoy.xyz/2017/12/22/coursera-machine-learning/)に続いて、同じくAndrew先生による[Deep Learning Specialization](https://www.coursera.org/specializations/deep-learning)を受講中。

これは深層学習の基本を学べるもので、以下の5つのコースからなる。

1. Neural Networks and Deep Learning
2. Improving Deep Neural Networks: Hyperparameter tuning, Regularization and Optimization
3. Structuring Machine Learning Projects
4. Convolutional Neural Networks
5. Sequence Models

この内、最初のNeural Networks and Deep Learningを修了したので、記念にブログしておく。

<!--more-->

{{< google-adsense >}}

# Deep Learning Specializationとは
Deep Learning Specializationは[Coursera Specialization](https://learner.coursera.help/hc/en-us/articles/208280296)のひとつ。
Coursera Specializationはサブスクリプションモデルで、つまりあるSpecializationのサブスクリプションを購入すると、受講完了するまで毎月定額の料金を支払うことになる。

Deep Learning Specializationは月$49で、5コース合わせて16週分の内容。
最初の7日間はトライアルで無料なので、この間に全部終わらせられればタダ。
無理だけど。

Deep Learning Specializationでは、PythonとTensorFlowでディープニューラルネットワーク、CNN、RNN、LSTM、Adam、Dropout、バッチ正規化、Xavier/He initializationなどを学べる。
Machine Learningコースと同じく、5分～15分くらいの動画による講義と、小テストと、プログラミング課題から構成されている。

プログラミング課題は、coursera hubという、ホステッドJupyter Notebookで解いて提出できるので楽。

# Neural Networks and Deep Learningコースとは
ディープニューラルネットワークの仕組みを学んで実装する4週間のコース。
また、深層学習の偉い人へのインタビューを見れる。
Machine Learningコースと被っている内容が少なくなく、かなり楽だったが、結構ペースが速いので、Machine Learningコースをやっていなかったら辛かったと思う。

動画は大抵日本語字幕が付いている。
日本語字幕が付いていない奴は、英語字幕が機械生成したっぽいもので見辛い。

2018/1/1に始めて、1/5に完了。
5日間かかった。
修了したら[Certifacate](https://www.coursera.org/account/accomplishments/certificate/G77XMU9TNEKX)もらえた。

以下、4週分の内容をキーワードレベルで書いておく。

* 1週目
    * 深層学習(Deep Learning)概要

        AIは次世代の電気。産業革命を起こす。
        AIで今一番熱い分野が深層学習。

        * ニューラルネットワーク(Neural Network)。
        * 畳み込みニューラルネットワーク(CNN: Convolutional Neural Network)。
        * 再帰型ニューラルネットワーク(RNN: Recurrent Neural Network)。
        * 深層学習の適用分野・例。
        * 深層学習が実用化した背景。
        * シグモイド関数(Sigmoid function) vs ReLU(Rectified Linear Unit)関数。

    * 深層学習のゴッドファーザー、Geoffrey Hintonへのインタビュー。

        ニューラルネットワークの黎明期を支え、ReLU関数の有効性を証明したりボルツマンマシンを発明したりした人。
        自身が歩んできた深層学習の歴史や今取り組んでいる・注目している理論について、
        高尚な話をしていたようだったが、高尚すぎてよくわからなかった。

        今日成果を出しているのは教師あり学習だけど、教師無し学習のほうが重要と考えているとのこと。

        これから機械学習に取り組む人へ、以下のアドバイスをしていた。

        * 文献を読みすぎるな。
        * 文献を読んで、間違っていると感じるところをみつけて、それに取り組め。
        * 人から何を言われても気にせず、自分の信念に従って研究しろ。
        * 誰かに無意味なことをしていると指摘されたら、むしろ価値のあることをしていると思え。

* 2週目
    * ニューラルネットワークプログラミングの基礎

        ロジスティック回帰は小さい(1層1ノード)ニューラルネットワーク。
        ロジスティック回帰の微分を逆伝播で計算する。

        * 二値分類(Binary classification)、ロジスティック回帰(Logistic regression)。
        * 損失関数(Loss function)、交差エントロピー(Cross entropy)、目的関数(Cost function)。
        * 最急降下法(Gradient descent)。
        * 微分(Derivatives)。
        * 逆伝播(Backpropagation)、計算グラフ(Computation graph)、連鎖律(Chain rule)。

    * Pythonとベクトル化(Vectorization)
        * forループ vs ベクトル化。
        * Jupyter Notebook、NumPy、ブロードキャスト(Broadcasting)。
        * ロジスティック回帰のベクトル化。

    * プログラミング課題
        * ロジスティック回帰で猫の画像の判別。
        * NumPy、h5py、Matplotlib、PIL、SciPy。

    * 深層学習とロボットの研究者、Pieter Abbeelへのインタビュー

        深層強化学習の有名な研究者。DQN。

        かつて、機械学習で成果を出すためには、取り組んでいる課題特有の分野の知識が必要だったが、2012年にGeoffreyが発表したAlexNetがそれを覆した。
        Pieterはそのアイデアを深層強化学習に適用し発展させた。

        強化学習は、どこからデータ収集するのか、報酬の分配はどうするかといったところに課題がある。
        また、安全性にも課題。学習の過程で失敗を繰り返すので、自動運転などをどう学習させるか、またどう学び続けさせるか。
        ネガティブデータを集めるのがむずい。

        短時間の実験でうまくいっても、長時間の稼働でうまくいくとも限らない。

        強化学習は複雑すぎるので、アルゴリズム自体を学習できるようにしたい。
        プログラムを自動で変更しながら学習するなど。

        強化学習は、アルゴリズムを変更しなくても様々なことを学べる。
        けど、ゼロから学ぶと時間がかかるので、以前学んだことを活かして次の課題に取り組めるようにするのが最先端の研究。

        まずは教師あり学習で人の代わりができるようになり、その後目的を与えて、強化学習で改善していく、っていう感じのことができるとうれしい。

        これから機械学習に取り組む人へ、以下のアドバイスをしていた。

        * 需要が高まっているので、AIを始めるにはよい時期。
        * オンライン講座がたくさんあるので、学びやすい。自分で試したり再現したりしてみることが重要。
        * TensorFlow、Chainer、Theano、PyTorchなど、手軽に試せるツールが色々ある。
        * 専門的な教育を受けなくても、自己学習でトップクラスになれる。
        * 機械学習を学ぶのに、大学で研究すべきか大企業で仕事を得るべきかについては、どれくらいの指導を受けれるかによる。



* 3週目
    * 浅いニューラルネットワーク
        * ロジスティック回帰を多重にして2層のニューラルネットワーク化。
        * ニューラルネットワークアルゴリズムのベクトル化。
        * 活性化関数(Activation function)の選択: シグモイド vs tanh vs ReLU vs Leaky ReLU vs 線形活性化関数(Linear activation function)。
        * 順伝播(Forward propagation)、逆伝播(Backpropagation)。
        * ランダム初期化(Random initialization)。

    * プログラミング課題
        * 二値分類するニューラルネットワークを実装。
        * scikit-learn。

    * GAN(Generative Adversarial Network)の発明者、Ian Goodfellowへのインタビュー

        GANは生成モデル(学習したデータに似たデータを生成するモデル)。
        バーで飲んでいるときに思いつき、一晩で実装した。

        GANは今は繊細過ぎるのが課題で、安定性の向上に今取り組んでいる。

        機械学習のセキュリティにも興味がある。モデルをだまして想定外の動作をさせるような攻撃への対策など。

        これから機械学習に取り組む人へ、以下のアドバイスをしていた。

        * 機械学習のアルゴリズムよりも、線形代数や確率といった数学の基礎を習得することが重要。
        * AIの道を進むのに、近年では博士号は必ずしも要らない。コードを書いてGitHubに上げろ。自身も実際に、オープンソース活動をしているひとの貢献を見て興味をもって採用したことがある。
        * 論文を公開するとよりいいけど、コードのほうが楽。


* 4週目
    * 深いニューラルネットワーク

        3層以上のニューラルネットワーク。その実装方法と有効性について。
        ハイパーパラメータ(Hyperparameters): 学習率(Learning rate)、学習回数、レイヤ数、ノード数、活性化関数、等。

    * プログラミング課題
        * ディープニューラルネットワークの実装。
        * 再度猫画像の判別。
