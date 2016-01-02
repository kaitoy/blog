+++
categories = [ "Text Editor" ]
date = "2015-09-06T20:18:14-06:00"
draft = false
eyecatch = "atom_editor_logo.svg.png"
slug = "disturb-me"
tags = ["atom", "disturb-me"]
title = "Atomウィンドウ内で画像を動かすパッケージ - disturb-me"
+++

[__Atom__](https://atom.io/)のパッケージを見ていて、便利なパッケージが沢山あるなぁと思いつつ、真面目なパッケージばかりでもつまらないので、たまには不真面目で役に立たないパッケージがあってもいいかと思って作ったパッケージの話。

## disturb-me
作ったのは[__disturb-me__](https://atom.io/packages/disturb-me)というパッケージ。
`Ctrl+Alt`を押しながら`d`と`m`を押すとAtomウィンドウ内に画像が表示され、その画像がランダムに動き回り作業の邪魔をするというもの。

画像はパッケージの設定から指定できる。デフォルトではAtomのロゴ。

最初は__pac-m●n__というパッケージ名にして、ゲーム界のミッキーことパ●クマンが動き回るパッケージにしようと思ってたけど、バンダイナムコからダメだと言われてしまった。
この構想はいつか[カタログIPオープン化プロジェクト](https://open.channel.or.jp/user.php)を利用して実現しようと思う。

## disturb-meの作り方
以前[別のエントリ](http://tbd.kaitoy.xyz/2015/08/21/japanese-word-selection/)でAtomパッケージの作り方の基本について書いたので、ここではそこで書かなかったことを書く。

#### 1. メインスクリプト - コマンド
今回はコマンドを追加するので[__CommandRegistry__](https://atom.io/docs/api/latest/CommandRegistry)を使う。
CommandRegistryのインスタンスには__atom.commands__でアクセスでき、その__add__メソッドでコマンドを追加できる。

addメソッドの引数は、第一引数から順に、

1. target: コマンドを有効にするDOM要素か、それを示すCSSセレクタ。
2. commandName: コマンドパレットに表示するコマンド名。全部小文字で、単語をハイフンでつないで、パッケージ名を先頭につけるのがルール。
3. callback(event): コマンドを実行したときに呼ばれるメソッド。

<br>

disturb-meのコマンドはAtomウィンドウ内のどこでも有効にしたいので、第一引数にはAtomウィンドウを表すカスタムタグである__atom-workspace__を指定する。
コードは以下の感じ。

```coffeescript
  activate: (state) ->
    @subscriptions = new CompositeDisposable
    @subscriptions.add atom.commands.add 'atom-workspace', 'disturb-me:toggle': => @toggle()

  toggle: ->
    # 画像を挿入したり削除したりするコード。
```

<br>

__toggle__の中では画像を挿入したり削除したりするわけだけど、この処理は、その画像を表す別のクラスにまかせることにする。
のでtoggleは以下のように書く。

```coffeescript
  @disturber: null

  toggle: ->
    if @disturber?
      @disturber.stop()
      @disturber = null
    else
      @disturber = new Disturber()
      document.body.appendChild(@disturber.getElement())
      @disturber.start()
```

__Disturber__が画像を表すクラス。別のファイル(__lib/disturber.coffee__)の中で定義して、スクリプトの先頭辺りで`Disturber = require './disturber'`のようにインポートする。

__document.body.appendChild__しているところは、何かAtomのAPI([__ViewRegistry__](https://atom.io/docs/api/latest/ViewRegistry)とか)を使うべきなのかも。

#### 2. Disturber
Disturberは以下のように書く。

```coffeescript
module.exports =
class Disturber

  element: null

  constructor: ->
    # <img>を作って@elementに入れる。

  destroy: ->
    # @elementをDOMツリーから削除する。

  getElement: ->
    # @element返す。

  start: ->
    # @elementのsrcを設定して、ランダムに動かし始める。

  stop: ->
    # @elementを止める。
```

あまり取り立てて書くことないな…。

因みに画像を動かすのには[__Velocity__](https://www.npmjs.com/package/velocity-animate)を使い、DOMの操作とかにちょっと[__jQuery__](https://www.npmjs.com/package/jquery)を使う。

#### 3. パッケージ設定
動かす画像や動かす速度はユーザが設定できるようにする。
設定はメインスクリプトで定義でき、その値には[__Config__](https://atom.io/docs/api/latest/Config)クラスでアクセスできる。

メインスクリプトでの定義は以下のように書く。

```coffeescript
module.exports = DisturbMe =
  disturber: null
  subscriptions: null

  config:
    bornImage:
      title: 'Born-Image'
      type: 'string'
      default: 'atom://disturb-me/assets/atom/white/atom_born.gif'
    bornDuration:
      title: 'Born-Duration'
      type: 'integer'
      default: 2000
```

するとパッケージ設定画面が以下のようになる。

![settings](/images/disturb-me/settings.jpg)

<br>

各設定の定義に最低限必要な属性は__type__と__default__。オプショナルなものに__title__、__description__などがある。
typeには、__string__、__integer__、__number__、__boolean__、__array__、__object__、__color__を指定できる。
詳しくは[__Config__](https://atom.io/docs/api/latest/Config)クラスの説明に載ってる。

Configクラスのインスタンスには__atom.config__でアクセスでき、上で定義した設定を以下のように操作できる。

```coffeescript
imagePath = atom.config.get('disturb-me.bornImage')
atom.config.set('disturb-me.bornDuration', '1000')
```

#### 4. キーバインディング
メインスクリプト内でコマンドパレットに表示するコマンドを定義したが、これにキーボードショートカット(キーバインディング)を設定する。

キーバインディングは__keymaps__フォルダの中の__cson__ファイルで以下のように定義する。

```cson
'atom-workspace':
  'ctrl-alt-d ctrl-alt-m': 'disturb-me:toggle'
```

これ見ればだいたい書き方はわかるはず。(詳細は[Atom Flight Manual](https://atom.io/docs/latest/behind-atom-keymaps-in-depth)に。)

特殊キーは__cmd__、__ctrl__、__alt__、__shift__、__enter__、__escape__、__backspace__、__delete__、__tab__、__home__、__end__、__pageup__、__pagedown__、__left__、__right__、__up__、__down__が使える。

同時に押すキーはハイフンでつなぎ、連続して押すキーはスペースで区切るので、上記`ctrl-alt-d ctrl-alt-m`は、`Ctrl+Alt`を押しながら`d`と`m`を連続して押す、という意味。
#### 5. package.json
[前回](http://tbd.kaitoy.xyz/2015/08/21/japanese-word-selection/#5-package-json%E7%B7%A8%E9%9B%86)と同様の編集に加えて、今回は二つのnpmパッケージに依存するので、__dependencies__を以下のように書く。

```json
  "dependencies": {
    "velocity-animate": ">=1.2.0",
    "jquery": ">=2.0.0"
  }
```

これを書いて、プロジェクトルートフォルダで`apm install`すると、ルート直下の__node_modules__フォルダに依存モジュールがインストールされる。

node_modulesは__Package Generator__が生成する__.gitignore__に入っているので、リポジトリには入らない。

#### 6. リリースなど
[前回](http://tbd.kaitoy.xyz/2015/08/21/japanese-word-selection/)と同様にリリースする。
めんどいのでテストは書かない。

リリース後、ループしないgifアニメーション画像をdisturb-meに使った場合、そのアニメーションが再生されない場合があるバグに気付いた。
これについては[別のエントリ](http://tbd.kaitoy.xyz/2015/09/07/caching-gifs-on-atom/)で書いた。
