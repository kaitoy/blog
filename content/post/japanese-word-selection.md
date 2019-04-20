+++
categories = [ "Text Editor" ]
date = "2015-08-21T15:31:41-06:00"
draft = false
cover = "atom_editor_logo.svg.png"
slug = "japanese-word-selection"
tags = [ "atom", "japanese-word-selection" ]
title = "Atomパッケージを作る - ワード境界を日本語対応させるパッケージ: japanese-word-selection"
+++

このブログは[__Atom__](https://atom.io/)というGitHubが開発したテキストエディタを使って書いている。
このエントリは、そのAtomのパッケージを作ってみたというお話。

<br>

{{< google-adsense >}}

# Atomとは
Atomは、2015/6/25にバージョン1.0がリリースされたばかりの新しいテキストエディタで、そのせいもあってか日本語サポートはあまり充実していない。
例えば、テキストを画面の端で折り返す「Soft Wrap」という機能はマルチバイト文字に対応しておらず、日本語で横に長い文を書いたりすると画面からはみ出てしまって不便。

しかしAtomは、パッケージなる、機能を拡張できるプラグインみたいな仕組みを持っていて、例えば上記Soft Wrapの問題は[__japanese-wrap__](https://github.com/raccy/japanese-wrap)というパッケージをインストールすることで解決できる。
パッケージは誰でも作って配布することができる。

# 日本語のワード境界
Atomでブログを書いていて不満を感じたのは、日本語のワード境界をちゃんと判定してくれないところ。

以前は(今もたまに)[__サクラエディタ__](http://sakura-editor.sourceforge.net/)という和製テキストエディタを使っていて、日本語文の中の一語をダブルクリックで選択するという操作をよくやっていた。
例えば、「Atomのパッケージは便利」という文があったら、「パッケージ」の辺りをダブルクリックすると「パッケージ」という単語を選択できる。

Atomでも癖でこの操作をすると、妙に広い範囲が選択されてしまう。
上記例だと「Atomのパッケージは便利」全体が選択されてしまう。不便。

# japanese-word-selection
この問題を解決してくれそうなパッケージを探したけど見つからなかったので、いい機会と思い自分で作ったのが[__japanese-word-selection__](https://atom.io/packages/japanese-word-selection)。ソースは[GitHub](https://github.com/kaitoy/japanese-word-selection)に。

インストールして有効にすると、日本語のワード境界を判定するようになる。実のところ、とりあえずは文字種の境目を見ているだけ。ひらがな、カタカナ、半角カタカナ、漢字に対応。
特殊文字の全角版の処理どうするとか、あまり深く考えて作ってないけど、使ってて変な挙動を見つけたらおいおい直すということで。

とりあえず、__Edit > Text__ の __Delete to Previous Word Boundary__ と __Delete to Next Word Boundary__ がちゃんと動かないのは見つけた。パッケージで上書きした処理を通っていない気がする。けど、デフォルトでキーバインディングもないし、あまり使われなそうな機能なのでほっておく。

# Atomのパッケージの作り方
パッケージの作り方は、[__Atom Flight Manual__](https://atom.io/docs/latest/)の[このあたり](https://atom.io/docs/latest/hacking-atom-package-word-count)を参考に。
Atom Flight ManualにはAtomの使い方からパッケージの作り方まで体系的に纏められているので一度は通して読みたい。

パッケージ開発にあたって、前提として知っておくべきは、Atomは[__Electron__](http://electron.atom.io/)という実行環境の上で動いているということ。
(Atomが先で、そこからElectronがスピンオフした。)

Electronはざっくり[__Node__](https://nodejs.org/)と[__Chromium__](https://www.chromium.org/Home)(Google ChromeのOSS版)でできていて、その上で動くアプリケーションは、HTMLとCSSで書いた画面をChromiumで表示して、それをNodeで動かすJavaScriptで制御する、という形で実装される。AtomはJavaScriptの代わりに、より高級な[__CoffeeScript__](http://coffeescript.org/)を使っているので、パッケージを作る際はCoffeeScriptのコードをがりがり書くことになる。

パッケージは[npm](https://www.npmjs.com/)のパッケージっぽく書く。

Atomは[MVVM](https://ja.wikipedia.org/wiki/Model_View_ViewModel)な感じの設計になっていて、コアのViewModelとかをパッケージからいじることでいろんな機能を実現できる。

以下、備忘録として、japanese-word-selectionを作った時にやったことを書いておく。Atomのバージョンは1.0.7。

1. パッケージテンプレート生成

    Atomを起動して、`Ctrl+Shift+P`でコマンドパレットを開いて、`generate package`と入力してEnter。
    __Package Generator__が起動して、作成するパッケージの名前を聞かれるのでjapanese-word-selectionを入力。(因みに、パッケージ名に__atom-__というプレフィックスを付けているのをたまに見るが、これは推奨されていない。)
    するとパッケージのテンプレートが作成され、それを読み込んだAtomウィンドウが開く(下図)。

    ![project tree](/images/japanese-word-selection/project_tree.jpg)

    パッケージ構成については概ね以下の感じ。

    * keymaps: キーバインディングを定義する[cson](https://github.com/bevry/cson)ファイルをいれる。
    * lib: パッケージの機能を実装するCoffeeスクリプトを入れる。
        * デフォルトで「__パッケージ名.coffee__」がメインスクリプト。
        * Package Generatorが作る「__パッケージ名-view.coffee__」というスクリプトは、Atomの画面に新たなペインを追加したいときとかに書くコードのサンプル。
    * menus: ツールバーとかコンテクストメニューに追加するメニューを定義するcsonファイルを入れる。
    * spec: パッケージのテストを入れる。テストは[Jasmine](http://jasmine.github.io/)を使って書く。
    * styles: パッケージが追加するペインとかに独自のスタイルを指定したいときとかに[Less](http://less-ja.studiomohawk.com/)かCSSを入れる。
    * package.json: パッケージの名前とか依存関係とかを定義するファイル。

    japanese-word-selectionはメニューもコマンドもペインも追加しないので、keymaps、lib/japanese-word-selection-view.coffee、menus、spec/japanese-word-selection-view-spec.coffee、stylesは消す。

    以下、ここで生成したパッケージフォルダを__<パッケージルート>__と書く。

2. メインスクリプト編集 - 概要

    __<パッケージルート>/lib/japanese-word-selection.coffee__を編集して機能を実装する。
    Package Generatorがサンプルコードを書いてくれているので、それを書き変えて行けばよい。

    機能は特定のAPIをもったオブジェクトに実装して、それを __module.exports__ に代入する。
    今回は __JapaneseWordSelection__ がそのオブジェクト。「特定のAPI」というのは以下のメソッド。

    * activate(state): パッケージが有効化されるときに呼ばれる。
    * deactivate(): パッケージが無効化されるときに呼ばれる。無くてもいい。
    * serialize(): Atomウィンドウを閉じるときに、パッケージの状態を保存したいときに実装するメソッド。無くてもいい。

    JapaneseWordSelectionには、activateとdeactivateを実装して、前者の中でワード境界判定処理をいじり、後者の中で元に戻すようにする。つまり、japanese-word-selection.coffeeはだいたい以下のようなコードになる。

    ```coffeescript
    module.exports = JapaneseWordSelection =

      activate: ->
        # ワード境界判定処理を日本語対応させる。

      deactivate: ->
        # ワード境界判定処理を元に戻す。
    ```

3. メインスクリプト編集 - activate

    実際の処理を書く際には、[Atom APIのドキュメント](https://atom.io/docs/api/latest)を参照する。また、[Atomのソース](https://github.com/atom/atom)を見てAtom APIの実装の詳細を見るべきときもある。

    パッケージのスクリプトからは、Atomクラスのインスタンスである __atom__ というグローバル変数が使えて、これを入り口にAtomウィンドウ内の各要素のViewModelオブジェクトをいじることができる。

    イベントを扱うときには、[CompositeDisposable](https://atom.io/docs/api/v1.0.7/CompositeDisposable)が便利。これを使うと、以下のようにして、ViewModelオブジェクトとかに登録したイベントハンドラを後で簡単に削除できる。

    ```coffeescript
    @disposables = new CompositeDisposable
    editor = atom.workspace.getActiveTextEditor()
    @disposables.add editor.onDidChange ->  # editorにイベントハンドラを登録。
    @disposables.add editor.onDidChangePath ->  # editorに別のイベントハンドラを登録。

    (snip)

    @disposables.dispose()  # 全てのイベントハンドラを削除。
    ```

    JapaneseWordSelection#activate()では、[atom.workspace.observeTextEditors(callback)](https://atom.io/docs/api/v1.0.7/Workspace#instance-observeTextEditors)というAPIを利用して[TextEditor](https://atom.io/docs/api/v1.0.7/TextEditor)オブジェクトを取得して、それが持っている[Cursor](https://atom.io/docs/api/v1.0.7/Cursor)オブジェクトの振る舞いを変更する。
    この、observeXXXXというAPIは他にもいろいろあって、実行すると既存の全てのXXXXのインスタンスをcallbackに渡してくれて、さらに、それ以降XXXXのインスタンスが作られるたびにcallbackを呼び出すイベントハンドラを登録してくれる。

    このobserveXXXXとかに上記CompositeDisposableが使えて、observeXXXXの場合、その戻り値をCompositeDisposableにaddしておくと、後でCompositeDisposable#dispose()でイベントハンドラを削除できる。

    まとめると、JapaneseWordSelection#activate()は以下のようになる。

    ```coffeescript
    module.exports = JapaneseWordSelection =

      disposables: null

      activate: ->
        @disposables = new CompositeDisposable
        @disposables.add atom.workspace.observeTextEditors (editor) ->
          JapaneseWordSelection.japanizeWordBoundary(editor, cursor) for cursor in editor.getCursors()

      japanizeWordBoundary: (editor, cursor) ->
        # Cursorオブジェクトの振る舞いを変更する処理
    ```

    (今見ると、Cursorの方もobserveした方がいいか。後で直そう。)

4. メインスクリプト編集 - deactivate

    JapaneseWordSelection#deactivate()は、追加したイベントハンドラを削除して、全てのCursorオブジェクトの振る舞いを元に戻すだけ。

    ```coffeescript
      deactivate: ->
        @disposables.dispose()
        for i, editor of atom.workspace.getTextEditors()
          for j, cursor of editor.getCursors()
            # Cursorオブジェクトの振る舞いを元に戻す処理
    ```

5. package.json編集

    package.jsonは、Package Generatorが以下のようなひな形を作ってくれている。

    ```json
    {
      "name": "japanese-word-selection",
      "main": "./lib/japanese-word-selection",
      "version": "0.0.0",
      "description": "A short description of your package",
      "keywords": [
      ],
      "activationCommands": {
        "atom-workspace": "japanese-word-selection:toggle"
      },
      "repository": "https://github.com/atom/japanese-word-selection",
      "license": "MIT",
      "engines": {
        "atom": ">=1.0.0 <2.0.0"
      },
      "dependencies": {
      }
    }
    ```

    これに以下の編集を加える。

    * __description__ にパッケージの説明を書く。
    * __keywords__ にパッケージリポジトリ内での検索のためのタグを書く。
    * japanese-word-selectionはとりあえずコマンドを作らないので、__activationCommands__ は消す。
    * __repository__ にjapanese-word-selectionのソースを置く(予定の)GitHubリポジトリのアドレスを書く。

    これだけ。以下のようになる。

    ```json
    {
      "name": "japanese-word-selection",
      "main": "./lib/japanese-word-selection",
      "version": "0.0.0",
      "description": "Japanize word boundary.",
      "keywords": [
        "japanese",
        "selection",
        "word"
      ],
      "repository": "https://github.com/kaitoy/japanese-word-selection",
      "license": "MIT",
      "engines": {
        "atom": ">=1.0.0 <2.0.0"
      },
      "dependencies": {
      }
    }
    ```

    __version__ はパッケージリリース(パブリッシュ)時に自動でインクリメントされるので、0.0.0のままほっておく。

    __dependencies__ には依存するnpmパッケージを定義できるが、japanese-word-selectionは一人で動くので何も書かない。
    因みに、dependenciesに何か追加したら、package.jsonがあるフォルダで`apm install`というコマンドを実行すると、そのフォルダの下に__node_modules__というフォルダができて、そこに依存がインストールされる。

    このpackage.jsonは[npmのpackage.json](https://docs.npmjs.com/files/package.json)を拡張したもので、npmのpackage.jsonのプロパティは全部使える。

6. 動作確認

    作成したパッケージは、Package Generatorに生成された時点でAtomから使えるようになっている。
    ソースを変更したら、`Ctrl+Shift+F5`(昔は`Ctrl+Alt+r`だったような…)でウィンドウをリロードして反映して動作確認できる。

    ログを見たい時など、`Ctrl+Shift+i`でディベロッパツールを開いておくと便利。

7. テスト

    上記の通り、パッケージのテストはJasmineを使って書いて、__<パッケージルート>/spec/__に入れる。テストファイル名の拡張子を除いた部分は__-spec__というポストフィックスを付けなければいけない。

    テストの書き方については、[Atomのマニュアル](https://atom.io/docs/latest/hacking-atom-writing-specs)とか、[Atomのテスト](https://github.com/atom/atom/tree/master/spec)とか、Jasmineのマニュアルとかを参照ということで、ここでは割愛する。テスト書くのは必須ではないし。

    テストは`Ctrl+Shift+y`(昔は`Ctrl+Alt+p`だったような…)で実行できる。

8. その他ファイルの編集

    README.md、LICENSE.md、CHANGELOG.mdを修正。詳細は割愛。

9. GitHubへ保存

    GitHubにjapanese-word-selectionという名のリポジトリを作り、そこにソースを保存。詳細は割愛。
    Atomのドキュメントによると、今のところ、GitHubへのソース保存は以下のパブリッシュのために必須な模様。

10. パブリッシュ

    作ったパッケージをリリースすることを、パブリッシュという。
    手順は[Atomのドキュメント](https://atom.io/docs/latest/hacking-atom-package-word-count#publishing)に説明されている。

    パブリッシュするには、__apm__ という、Atomのパッケージを管理するコマンドラインツールが必要。どうもAtom本体と一緒にインストールされるっぽい。

    やることは、<パッケージルート>に`cd`して、`apm publish minor`を実行するだけ。
    このコマンドは以下の処理をする。

    1. (初回のみ)パッケージ名をatom.ioに登録する。
    2. package.jsonのversionをインクリメントしてコミットする。`apm publish`にminorを指定するので、0.1.0になる。代わりにmajorかpatchを指定すると、1.0.0か0.0.1になる。
    3. Gitのタグを作る。
    4. GitHubに変更とタグをpushする。
    5. atom.ioにパッケージを登録する。

    私の場合、初回だったので、コマンド実行中にatom.ioのアカウントを作ってAPIトークンを取得する手順があった。
    以下がコマンドのメッセージ。

    ```shell
    # cd japanese-word-selection
    # apm publish minor
    Welcome to Atom!

    Before you can publish packages, you'll need an API token.

    Visit your account page on Atom.io https://atom.io/account,
    copy the token and paste it below when prompted.

    Press [Enter] to open your account page on Atom.io.
    Token> hogeeeeeeeeeeeeeeeee
    Saving token to Keychain done
    Registering japanese-word-selection done
    Preparing and tagging a new version done
    Pushing v0.1.0 tag done
    Publishing japanese-word-selection@v0.1.0 done
    Congrats on publishing a new package!
    Check it out at https://atom.io/packages/japanese-word-selection
    ```

    https://atom.io/packages/japanese-word-selection に行ったらちゃんとjapanese-word-selectionのページができていた。
    これでパブリッシュまで完了。

    因みに、`apm unpublish パッケージ名@バージョン`で[パブリッシュを取り消す](https://www.kaitoy.xyz/2015/12/02/unpublish-atom-package/)ことができる。

11. パッケージのアップデートの開発

    Package Generatorでパッケージを生成すると、そのフォルダへのリンクが`%userprofile%\.atom\packages\`に生成される。
    このフォルダは`apm link`コマンドでリンクを張るフォルダであり、普通にインストールしたパッケージが入る場所だ。
    ここに入っているパッケージが、AtomのGUIのInstalled Packagesに表示される。

    `apm publish`しても、パブリッシュしたパッケージは`%userprofile%\.atom\packages\`にリンクのまま残る。
    ので、アップデートバージョンも、初バージョンの開発とまったく同じように開発してパブリッシュできる。

    昔はこの↓ような面倒なことが必要だったはずなんだけど。

    ------ 以下昔話 ------

    `apm publish`をすると、パブリッシュしたバージョンがインストールされた状態になる。
    具体的には、`%userprofile%\.atom\packages\`にそのパッケージが入っている状態になる。

    パッケージのアップデートを開発する際は、修正している版のパッケージ(<パッケージルート>に入っている方)を優先してロードして欲しくなるが、そのためには`%userprofile%\.atom\dev\packages\`に修正版(のリンク)をいれて、Atomをdev modeで起動する必要がある。

    この手順は、

    1. <パッケージルート>に`cd`して、`apm link --dev`を実行する。これでそのフォルダへのリンクが`.atom\dev\packages\`に作成される。
    2. Atomのメニューの __View > Developer > Open In Dev Mode__ からdev modeのAtomウィンドウを開く。

    因みに、Package Generatorは、作成したパッケージフォルダへのリンクを`%userprofile%\.atom\packages\`に作成する。リンクの一覧は`apm links`で参照でき、`apm unlink`で削除できる。

    ------ 以上昔話 ------

# 関連エントリ
後日もう一つパッケージを作り、[それに関する記事](https://www.kaitoy.xyz/2015/09/06/disturb-me/)を書いた。
こちらはjapanese-word-selectionでやらなかったコマンドなどの実装をやっている。
