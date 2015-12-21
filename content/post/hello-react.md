+++
categories = [ "Web" ]
date = "2015-12-21T00:07:28-07:00"
draft = false
eyecatch = "react.png"
slug = "hello-react"
tags = [ "react", "atom", "javascript" ]
title = "ReactをAtomパッケージ開発で無理やり使ってみた"
+++

私は今[HPE](https://www.hpe.com/us/en/home.html)の[Fort Collins](https://ja.wikipedia.org/wiki/%E3%83%95%E3%82%A9%E3%83%BC%E3%83%88%E3%83%BB%E3%82%B3%E3%83%AA%E3%83%B3%E3%82%BA_%28%E3%82%B3%E3%83%AD%E3%83%A9%E3%83%89%E5%B7%9E%29)オフィスに居候している。
HPEは最近、[React](https://facebook.github.io/react/)を使ったUXフレームワークである[Grommet](http://www.grommet.io/docs/)を開発していて、私が扱っている製品もそれを使う兆しが見えてきた。
Grommetはいずれ仕事で触ることになりそうなので、まずはReactの勉強をと思い、[とあるAtomパッケージ](http://tbd.kaitoy.xyz/2015/12/19/atom-impress/)の開発に無理やり使ってみた。
このエントリでは、その作業の中で得た知識などについて書く。

(因みにGrommetは[GitHub](https://github.com/grommet/grommet)で公開されているが、ほとんど話題になっておらずスターも現時点で245しかついていない。。。)

## Reactとは
ReactはFacebookが開発しているWeb UIのフレームワークで、[MVC](https://ja.wikipedia.org/wiki/Model_View_Controller)のVだけを実装したもの。
2013年に最初のバージョンが公開され、世界中で流行ってきているらしい。

その特徴(というかほぼ全容)は仮想DOM([Virtual DOM](https://facebook.github.io/react/docs/glossary.html))。
ReactのAPIを使うと、リアルDOMと一対一で対応する仮想DOMのツリーを作ることができ、UIを組み立てられる。
リアルDOMの構築や更新はReactが最適化された方法でやってくれるので、性能がいいUIができるらしい。
因みに、仮想DOM自体はReact特有の技術ではなく、別の実装もある。

もう一つの特徴は[JSX](https://facebook.github.io/jsx/)。
これは、JavaScriptのコードの中で、XMLみたいな構文で仮想DOMを記述するための拡張構文。
これを使うとReactコードが見やすく簡単に書けるけど、当然普通のJavaScript実行環境では動かないので、プリコンパイルなどが必要になる。

FacebookはReactを使った開発に[Flux](http://facebook.github.io/flux/docs/overview.html#content)というアーキテクチャの採用を推奨している。
FluxはMVCアーキテクチャに置き換わるもので、従来の複雑なデータフローに反発し、一方向のシンプルなデータフローを提供する。
Fluxは単なるアーキテクチャで、その全体の実装を支援するフレームワークは現時点では無い。
(多分。[Relay](https://facebook.github.io/relay/)が一部支援してくれるっぽい。)

## Reactを触った感想
Reactは本当にちょっとしか触っていないので、あまりよく分かっていないんだろうけど、なんだか使いにくかった。

Reactは仮想DOMを作るところしか助けてくれないので、他のことは全部自分でやらないといけない。
FacebookはReact用のウィジェットすら提供していない。
昔仕事で全部入りの[Dojo](https://ja.wikipedia.org/wiki/Dojo_Toolkit)を使っていたので、それとのギャップをすごい感じた。

そのうえ、他のフレームワークやライブラリと組み合わせて使おうとすると仮想DOMが壁になってくる。普通のフレームワークはリアルDOMを扱うからだ。
例えば、JavaScriptを書いているとすぐ[jQuery](https://jquery.com/)を使いたくなるが、これでリアルDOMを直接いじってしまってはReactを使う意味がない気がする。

## AtomパッケージでReactを使う
Reactは[npm](https://www.npmjs.com/)でも提供されていて、Atomパッケージの開発に簡単に使える。
パッケージの`package.json`の`dependencies`に[react](https://www.npmjs.com/package/react)と[react-dom](https://www.npmjs.com/package/react-dom)を入れておけば、パッケージコード中で以下の様に仮想DOMを作れるようになる。

```javascript
var React = require('react');
var ReactDOM = require('react-dom');

class MyComponent extends React.Component {
  render() {
    return <div>Hello World</div>;
  }
}

ReactDOM.render(<MyComponent />, node);
```

## BabelによるJSXの手動コンパイル
JSXのコンパイルには[Babel](https://babeljs.io/)を使うのがいい。
手動コンパイルにはBabelのコマンドラインツールが必要で、これはnpmで提供されている。
npmコマンドはAtomに同梱されているので別途インストールは不要。

以下が手順の詳細。

1. Babelのコマンドラインツールのインストール

    任意の場所で、

    ```sh
    npm install -g babel-cli
    ```

    を実行すると、Babelのコマンドラインツールがグローバルにインストールされ、任意の場所で`babel`コマンドが使えるようになる。

2. Babelの定義ファイル作成

    適当なフォルダ(プロジェクトのルートなど)に`.babelrc`というBabelの定義ファイルを作り、以下を書いておく。

    ```json
    {
      "presets": ["react"]
    }
    ```

3. Reactプラグインのインストール

    `.babelrc`に書いた`presets`の値は、コンパイルにReactプラグインを使うという意味。
    なので、以下のコマンドでReactプラグインを(ローカルに)インストールする必要がある。

    ```sh
    cd <.babelrcを置いたフォルダ>
    npm install babel-preset-react
    ```

4. コンパイル

    `babel`コマンドでコンパイルを実行する。例えば以下を実行すると、

    ```sh
    cd <.babelrcを置いたフォルダ>
    babel src -d lib
    ```

    `src/*.jsx`がコンパイルされて、`lib/*.js`に出力される。

## language-babelパッケージによるJSXの自動コンパイル
上記Babelによるコンパイルは、Atomなら[language-babelパッケージ](https://atom.io/packages/language-babel)で自動化できる。

以下、Atomパッケージの開発でlanguage-babelを利用する手順を書く。

1. language-babelのインストール

    language-babelをAtomのSettingsなどからインストールして、language-babelのSettingsで、`Allow Local Override`にチェックを付ける。

2. Babelの定義ファイル作成

    手動のと同じ内容の`.babelrc`をパッケージプロジェクトのルートに置く。

3. package.json編集

    パッケージプロジェクトの`package.json`の`dependencies`の下あたりに以下の定義を追加して、BabelとReactプラグインへの依存を張る。

    ```json
      "devDependencies": {
        "babel-core": "^6.1.2",
        "babel-preset-react": "^6.1.2"
      }
    ```

    上記定義を追加したら、`apm install`を実行して追加した依存をダウンロードする。

    因みに、`devDependencies`は`dependencies`と似てるけど、開発時だけに必要なモジュールを定義するプロパティ。
    `devDependencies`に書いたものは`apm install`したときはダウンロードされるけど、パブリッシュされたものをインストールするときにはダウンロードされない。

4. language-babelの設定ファイル作成

    language-babelの設定は`.languagebabel`というファイルにかく。
    これに以下の様な内容を書いてパッケージプロジェクトのルートに置く。

    ```json
    {
      "babelMapsPath":                   "lib",
      "babelMapsAddUrl":                 false,
      "babelSourcePath":                 "src",
      "babelTranspilePath":              "lib",
      "createMap":                       false,
      "createTargetDirectories":         true,
      "createTranspiledCode":            true,
      "disableWhenNoBabelrcFileInPath":  false,
      "suppressSourcePathMessages":      true,
      "suppressTranspileOnSaveMessages": false,
      "transpileOnSave":                 true
    }
    ```

    これで、`<パッケージプロジェクトのルート>/src/*.jsx`が、Atomで編集して保存したときにコンパイルされ、`<パッケージプロジェクトのルート>/lib/*.js`に出力されるようになった。

## BabelでJSXをコンパイルする場合の制限
手動にしろ自動にしろ、JSXのコンパイルにBabelを使う場合、BabelがCoffeeScriptに対応していないので、CoffeeScript + JSXでは書けない。
JavaScript + JSXで書かないといけない。

## Minified exception
React周りでバグを作りこんでエラーが発生した場合、コンソールに以下のようなエラーメッセージが出ることがある。

```text
Uncaught Error: Minified exception occured; use the non-minified dev environment for the full error message and additional helpful warnings.
```

これではエラーの詳細はわからない。詳細を見たい場合は、AtomをDev Modeで開いておく必要がある。
(e.g. Atomのメニューバーの[View]>[Developer]>[Open In Dev Mode]から開く。)
