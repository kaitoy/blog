<!DOCTYPE html>
<html lang="en-us">
  <head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <meta name="google-site-verification" content="9qs7VjxtSrYMqw5OElxCdKv_gnssSRi6acB2iYlZnGA" />

    
    
    <meta property="og:title" content="To Be Decided">
    <meta property="og:url" content="https://www.kaitoy.xyz">
    <link rel="canonical" href="https://www.kaitoy.xyz">
    
    <meta property="og:site_name" content="To Be Decided">

    <title>
      
      impressindex.js | To Be Decided
      
    </title>

    
    <link rel="shortcut icon" href="https://www.kaitoy.xyz/assets/favicon.ico">

    
    <link rel="alternate" type="application/rss+xml" title="RSS" href="https://www.kaitoy.xyz/index.xml">

    <link href="//maxcdn.bootstrapcdn.com/bootstrap/3.3.5/css/bootstrap.min.css" rel="stylesheet">
    <link href="//fonts.googleapis.com/css?family=Marcellus+SC" rel="stylesheet" type="text/css">
    <link href="//fonts.googleapis.com/css?family=PT+Sans" rel="stylesheet" type="text/css">
    <link href="//maxcdn.bootstrapcdn.com/font-awesome/4.2.0/css/font-awesome.min.css" rel="stylesheet">
    <link href="//cdnjs.cloudflare.com/ajax/libs/highlight.js/9.5.0/styles/zenburn.min.css" rel="stylesheet">
    <link href="https://www.kaitoy.xyz/css/styles.css" rel="stylesheet">
    <link href="https://www.kaitoy.xyz/css/custom.css" rel="stylesheet">
    <link href="https://www.kaitoy.xyz/css/table.css" rel="stylesheet">
    <link href="https://www.kaitoy.xyz/css/jquery.bxslider.css" rel="stylesheet" />

    
    <script async src="//pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script>
    <script>
      (adsbygoogle = window.adsbygoogle || []).push({
        google_ad_client: "ca-pub-7852181473528684",
        enable_page_level_ads: true
      });
    </script>

    
  </head>
  <body>

    <header id="site-header">
      <div class="container">
        <h1 class="text-center">
          <a href="https://www.kaitoy.xyz" class="font-logo">To Be Decided</a>
        </h1>
      </div>
    </header>

    <main id="site-body">
      <div class="container">


<div class="row">
  <div class="col-md-9">
    <div id="posts">
      <div class="row">
        
        
        
        <div class="col-sm-6">
          <article>
            <a href="https://www.kaitoy.xyz/2015/12/19/atom-impress/" class="post post-topix">
              <header class="eyecatch text-center">
                <img src="/images/atom_editor_logo.svg.png" alt="eyecatch">
              </header>
              <div class="date text-center">
                <span>Sat, Dec 19, 2015</span>
              </div>
              <h2 class="title">impress.jsでのプレゼン資料作成をサポートするAtomパッケージ - impress</h2>
              <div class="summary">
                Atomのパッケージを作った話。 ついでに、パッケージプロジェクト内で別のプロジェクトを取り込んで使いたい場合に、Gitのサブモジュールを使ってはダメという話。 (adsbygoogle = window.adsbygoogle || []).push({}); impress.js impress.jsというJavaScriptライブラリがある。 HTML5とCSS3とJavaScriptでプレゼン資料を作るためのライブラリで、これを使うと、PowerPointやKeynoteといった従来のツールによるものからは一線を画す斬新な資料を作ることができる。 公式のデモを見ればその魅力を堪能できる。 デモを見ると分かるが、Preziに触発されたライブラリだ。 Preziでも非常に新鮮な資料を作れるが、ほぼ有料で、また作成した資料をPreziのサーバに置かなければいけないので、仕事で使う資料作りには使いにくい。 その点impress.jsは、MIT(とGPLv2)で公開されていて自由に無料で使えるのがよい。 ただし、Preziがスライドという概念から大きく脱却しているのに対して、実のところimpress.jsで作れる資料はあくまでスライドベースだ。 従来のものに比べてスライドの並びに制約がなく、スライド間の遷移がダイナミックというだけだ。 impress.jsでもまあ工夫すればPreziのような資料は作れるが。 独自のオーサリングツール/ビューワに依存するPreziに対し、impress.jsは標準的なHTML/CSS/JavaScriptにだけ依存しているので、jQueryなどのWeb技術を活用してスライドを作れるという副次的なメリットはある。 impress.jsは、2012年に最初のバージョンが公開されてからもう4年近く経つが、未だにそれほど広く使われている様子はない。 PowerPointが幅を利かせているせいもあるだろうが、その使い辛さから利用をためらう人が多いのではないだろうか。 impress.jsはあまりドキュメントが充実しているとは言えない。 GitHubに公開されているREADMEには、使い方はソースを見よ、それで分からないなら使うなとある。 さらにソース中には、impress.jsを使うには、HTMLとCSSのスキルに加えてデザイナーのセンスも必要とある。 かなりハードルを上げている。 このハードルをクリアしていたとしても、実際、impress.jsで資料を作るのはPowerPointに比べて10倍は大変だ。 impress.jsはスライド(impress.js用語ではステップ)間の遷移を制御してくれるだけで、各スライドのコンテンツを作るという部分に関してはなんのサポートも提供しない。 テンプレートもなければ、表やグラフを書く機能もなく、アニメーションも作れない。 そういうことをしたければ、自分で別途ライブラリを探して使うなりしないといけない。 ちょっとした図を書くにも、テキストエディタでちまちまHTMLとCSSを書いて、ブラウザで表示して確認して、思った通りになっていなければディベロッパツールでデバッグして、Web UIでも書いていたんだっけという気になってくる。 impressパッケージ そんな負担を少しでも軽くしたいと思って作ったのがimpressパッケージ。 同じ目的のツール(i.e. オーサリングツール)は実は既にいくつかあった。 なかでも、Hovercraft!というのが高機能で便利そう。 ただ、これらはPowerPointほど自在にスライドを作れるまでには至っておらず、結局は仕上げにHTML/CSSを手でいじる作業が必要になる。(と思う。) また、jQueryのプラグイン使ってかっこいいことしたいとか言う場合にも、手でコードを書かなければいけない。 つまりテキストエディタを開かなければいけない。よってAtomを起動することになる。(私は。) であれば、オーサリングツールもAtomに統合されていた方が便利なんじゃないの? というのがimpressパッケージを作った動機。 まだ機能は少なくて、新規資料プロジェクトの雛形生成、 ステップをリスト表示するビュー表示、 プレビューができるだけ。 ゆくゆくは、GUIでステップの配置や角度を編集する機能、GUIでステップ内の図を作成する機能を作りたい。 あとできればアニメーションを付ける機能とかも。 Hovercraft!みたいにHTML書かなくてもいいよ、というのを目指すつもりはなくて、あくまでもコーダーのための、コーディングを補助するツールを目指す。 パッケージのサブモジュール impressパッケージは、新規資料プロジェクトの雛形生成機能などのため、impress.jsプロジェクト(のフォーク)をサブモジュールとしてとりこんでいる。 最初はGitのサブモジュールコマンド(git submodule)を使って取り込んでいて、上手くいっているように見えたが、パブリッシュ後に次のような問題が発生した。 即ち、試しにimpressパッケージをインストールしてみたら、サブモジュールのフォルダの中身がからっぽだった。 これは、AtomのパッケージマネージャがパッケージをGitHub Releasesからダウンロードしてインストールするからだ。サブモジュールの中身はGitHub Releasesに登録されるアーカイブに含まれない。このGitHub Releasesの挙動は、サブモジュールを含むGitプロジェクトをクローンした場合、デフォルトではサブモジュールはクローンされないというGitサブモジュールの仕様に関係しているのかもしれない。 この問題をきっかけにGitサブモジュールについてちょっと調べてみた。 蝙蝠本によると、Git開発チームはあまりサブモジュールコマンドの開発に熱心ではなく真面目に作らなかったらしい。 また、あるブログによればサブモジュールコマンドは大分まえからオワコンらしい。このブログによれば、今は多くの場合git subtreeを使うのがいいとのこと。git subtreeは蝙蝠本にもPro Gitにも載ってないのだが。 git subtreeでプロジェクトを取り込んだ場合、親プロジェクトのクローン時にサブプロジェクトもデフォルトでクローンされる仕様だ。 (というか正しくは、サブモジュールと違って、子プロジェクトが親プロジェクトにマージされているから、一緒にクローンされるというだけ。) これを使ってimpressパッケージを構成しなおしてみたら件の問題が解決した。 因みにやりかたは、impressパッケージプロジェクトのルートにimpress.jsというフォルダを作った後、以下のコマンドを実行しただけ。 git subtree add --prefix
              </div>
            </a>
          </article>
        </div>
        
        
        
      </div>
    </div>
  </div>
  <div class="col-md-3">
    <aside id="site-sidebar">
      <div class="row">
        <div class="col-md-12 col-sm-6 col-xs-12">
  <div class="text-center custom-partial">
    
  </div>
  <section class="sidebar-bordered">
    
    <div id="profile">
      <div class="text-center">
        <img id="profile-photo" src="/images/nopicture.png" alt="profile">
      </div>
      <div class="data">
        <h4 id="profile-username" class="post-title"></h4>
        
        <span id="profile-birth">DOB: Dec 14, 1983</span>
        
        <div id="social-links">
          
          <a href="https://www.facebook.com/yamada.kaito.90" target="_blank"><i class="fa fa-facebook-square"></i></a>
          
          
          
          <a href="https://github.com/Kaitoy" target="_blank"><i class="fa fa-github-square"></i></a>
          
        </div>
        <div id="profile-description"></div>
        <ul id="profile-urls" class="post-tags"></ul>
      </div>
    </div>
    
  </section>
</div>

<div class="col-md-12 col-sm-6 col-xs-12">
  <section>
    <h3>Tags</h3>
    
    <div id="tag-cloud" class="text-center">
      
      
      
      <a href="https://www.kaitoy.xyz/tags/atom">atom</a>
      
      
      <a href="https://www.kaitoy.xyz/tags/aws">aws</a>
      
      
      <a href="https://www.kaitoy.xyz/tags/aws-ecs">aws-ecs</a>
      
      
      <a href="https://www.kaitoy.xyz/tags/blog">blog</a>
      
      
      <a href="https://www.kaitoy.xyz/tags/bow">bow</a>
      
      
      <a href="https://www.kaitoy.xyz/tags/cdn">cdn</a>
      
      
      <a href="https://www.kaitoy.xyz/tags/ci">ci</a>
      
      
      <a href="https://www.kaitoy.xyz/tags/disturb-me">disturb-me</a>
      
      
      <a href="https://www.kaitoy.xyz/tags/docker">docker</a>
      
      
      <a href="https://www.kaitoy.xyz/tags/elasticsearch">elasticsearch</a>
      
      
      <a href="https://www.kaitoy.xyz/tags/filebeat">filebeat</a>
      
      
      <a href="https://www.kaitoy.xyz/tags/firedrop">firedrop</a>
      
      
      <a href="https://www.kaitoy.xyz/tags/git">git</a>
      
      
      <a href="https://www.kaitoy.xyz/tags/github">github</a>
      
      
      <a href="https://www.kaitoy.xyz/tags/goslings">goslings</a>
      
      
      <a href="https://www.kaitoy.xyz/tags/groovy">groovy</a>
      
      
      <a href="https://www.kaitoy.xyz/tags/headless-browser">headless-browser</a>
      
      
      <a href="https://www.kaitoy.xyz/tags/hibernate">hibernate</a>
      
      
      <a href="https://www.kaitoy.xyz/tags/hugo">hugo</a>
      
      
      <a href="https://www.kaitoy.xyz/tags/impress.js">impress.js</a>
      
      
      <a href="https://www.kaitoy.xyz/tags/japanese-word-selection">japanese-word-selection</a>
      
      
      <a href="https://www.kaitoy.xyz/tags/javascript">javascript</a>
      
      
      <a href="https://www.kaitoy.xyz/tags/jekyll">jekyll</a>
      
      
      <a href="https://www.kaitoy.xyz/tags/jgit">jgit</a>
      
      
      <a href="https://www.kaitoy.xyz/tags/jvm-language">jvm-language</a>
      
      
      <a href="https://www.kaitoy.xyz/tags/kotlin">kotlin</a>
      
      
      <a href="https://www.kaitoy.xyz/tags/logstash">logstash</a>
      
      
      <a href="https://www.kaitoy.xyz/tags/management">management</a>
      
      
      <a href="https://www.kaitoy.xyz/tags/nanoserver">nanoserver</a>
      
      
      <a href="https://www.kaitoy.xyz/tags/oop">oop</a>
      
      
      <a href="https://www.kaitoy.xyz/tags/orm">orm</a>
      
      
      <a href="https://www.kaitoy.xyz/tags/pcap4j">pcap4j</a>
      
      
      <a href="https://www.kaitoy.xyz/tags/react">react</a>
      
      
      <a href="https://www.kaitoy.xyz/tags/runc">runc</a>
      
      
      <a href="https://www.kaitoy.xyz/tags/selenium">selenium</a>
      
      
      <a href="https://www.kaitoy.xyz/tags/seo">seo</a>
      
      
      <a href="https://www.kaitoy.xyz/tags/spring">spring</a>
      
      
      <a href="https://www.kaitoy.xyz/tags/spring-boot">spring-boot</a>
      
      
      <a href="https://www.kaitoy.xyz/tags/subversion">subversion</a>
      
      
      <a href="https://www.kaitoy.xyz/tags/vcs">vcs</a>
      
      
      <a href="https://www.kaitoy.xyz/tags/windows">windows</a>
      
      
      <a href="https://www.kaitoy.xyz/tags/yegor256">yegor256</a>
      
      
      <a href="https://www.kaitoy.xyz/tags/zundoko">zundoko</a>
      
    </div>
    
  </section>
</div>


<script async src="//pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script>
<ins class="adsbygoogle"
     style="display:block"
     data-ad-client="ca-pub-7852181473528684"
     data-ad-slot="3938339651"
     data-ad-format="auto"></ins>
<script>
(adsbygoogle = window.adsbygoogle || []).push({});
</script>

<div class="col-md-12 col-sm-6 col-xs-12">
  <div class="text-center custom-partial">
    
  </div>
</div>

      </div>
    </aside>
  </div>
</div>

        <div class="text-center custom-partial">
          
        </div>
      </div>
    </main>

    <footer id="site-footer" class="text-center font-logo">
      <p>&copy;  2015 -  2017  Kaito Yamada </p>
      <p>Powered by <a href="http://gohugo.io" target="_blank">Hugo</a></p>
      <p>
        Theme: <a target="_blank" href="https://github.com/dim0627/hugo_theme_robust">Robust</a>
        designed by <a target="_blank" href="http://yet.unresolved.xyz">Daisuke Tsuji</a>
      </p>
    </footer>

    <script src="//code.jquery.com/jquery-2.1.3.min.js"></script>
    <script src="https://www.kaitoy.xyz/js/jquery.bxslider.min.js"></script>
    
    <script>
      $(document).ready(function(){
        $('.bxslider').bxSlider({
          speed: 1,
          preloadImages: 'all'
        });
      });
    </script>
    <script src="//cdnjs.cloudflare.com/ajax/libs/highlight.js/8.4/highlight.min.js"></script>
    <script src="https://www.kaitoy.xyz/js/highlight.pack.js"></script>
    <script>hljs.initHighlightingOnLoad();</script>

    
    <script>
    (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
      (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
    m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
    })(window,document,'script','//www.google-analytics.com/analytics.js','ga');

    ga('create', 'UA-65248565-1', 'auto');
    ga('send', 'pageview');

    </script>

    <script>
    $(function() {
      var url = "https://ja.gravatar.com/5fbe47b2a4b3637dd26dfc9a49381895.json?callback=?";
      $.getJSON(url)
        .done(function(data) {
          var entry = data.entry[0];
          $("#profile-photo").attr("src", entry.photos[0].value);
          $("#profile-username").html(entry.name.familyName + " " + entry.name.givenName);
          $("#profile-description").html(entry.aboutMe);
          entry.urls.forEach(function(el){
            $("#profile-urls").append($("<li><a href='" + el.value + "'>" + el.title + "</a></li>"));
          });
          $("#profile").show();
        });
    });
    </script>
  </body>
</html>

