/**
 * フレーバー相談 - 対話形式でフレーバー組み合わせを提案
 * ルナ：シーシャフレーバーの知識を網羅するコンシェルジュ
 */
(function () {
  var messagesEl = document.getElementById("sommelier-messages");
  var choicesEl = document.getElementById("sommelier-choices");
  var resultNavEl = document.getElementById("sommelier-result-nav");
  var restartWrap = document.getElementById("sommelier-restart-wrap");
  var restartBtn = document.getElementById("sommelier-restart");

  var state = { step: 0, answers: {} };

  /* ─── 質問ステップ ─── */
  var steps = [
    {
      id: "taste",
      bot: "いらっしゃいませ。フレーバーコンシェルジュのルナです。\nお好みに合うフレーバーを、具体的な銘柄でご提案させていただきます。\n\nまず、甘さの好みをお聞かせください。",
      choices: [
        { id: "sweet", label: "甘めが好き" },
        { id: "fresh", label: "さっぱり系が好き" },
        { id: "both", label: "どちらも好き" }
      ]
    },
    {
      id: "category",
      bot: "ありがとうございます。お好みのフレーバー系統はいかがでしょうか。",
      choices: [
        { id: "fruit", label: "フルーツ系" },
        { id: "mint", label: "ミント・ハーブ系" },
        { id: "dessert", label: "デザート・スイーツ系" },
        { id: "citrus", label: "シトラス・フローラル系" },
        { id: "spice", label: "スパイス・ウッド系" },
        { id: "drink", label: "ドリンク系（コーラ・紅茶など）" }
      ]
    },
    {
      id: "mint_level",
      bot: "ミントの効き加減はいかがいたしましょうか。",
      choices: [
        { id: "none", label: "ミントなし" },
        { id: "light", label: "少しアクセントに" },
        { id: "strong", label: "しっかり効かせたい" }
      ]
    },
    {
      id: "experience",
      bot: "シーシャはよく吸われますか。",
      choices: [
        { id: "beginner", label: "初めて・数回程度" },
        { id: "sometimes", label: "月に数回" },
        { id: "regular", label: "週1以上" },
        { id: "expert", label: "かなりのヘビーユーザー" }
      ]
    },
    {
      id: "dark_leaf",
      bot: "ダークリーフのお好みをお伺いします。\nダークリーフはタバコ感・ニコチン感が強く、深みのある喫味が特徴です。",
      choices: [
        { id: "dark_main", label: "ダークリーフメインで組みたい" },
        { id: "dark_accent", label: "ダークリーフを少しアクセントに" },
        { id: "blonde_only", label: "ブロンドリーフのみで" },
        { id: "either", label: "おまかせ" }
      ]
    },
    {
      id: "mood",
      bot: "本日はどのような気分でしょうか。",
      choices: [
        { id: "relax", label: "ゆったりリラックスしたい" },
        { id: "refresh", label: "リフレッシュ・爽快感" },
        { id: "adventure", label: "新しい味に挑戦したい" },
        { id: "classic", label: "王道・定番を楽しみたい" }
      ]
    }
  ];

  /* ─── フレーバーデータベース ─── */
  var recipes = [
    // ── フルーツ × ミント（初心者〜中級者向け） ──
    {
      name: "ストロベリーミント",
      items: [
        { flavor: "ストロベリージャム", brand: "Fumari", leaf: "blonde", ratio: 60 },
        { flavor: "スーパーミント", brand: "Darkside", leaf: "dark", ratio: 40 }
      ],
      desc: "Fumariの濃厚なイチゴジャムの甘さに、Darksideの強清涼ミントが鮮烈に効く。甘さと爽快感のバランスが秀逸で、シーシャ初体験でも満足度が高い鉄板レシピ。",
      tags: { taste: ["sweet"], category: ["fruit"], mint: ["light", "strong"], exp: ["beginner", "sometimes"], dark: ["dark_accent", "either"], mood: ["relax", "classic"] }
    },
    {
      name: "トロピカルパラダイス",
      items: [
        { flavor: "アロハマンゴー", brand: "Fumari", leaf: "blonde", ratio: 50 },
        { flavor: "ダークパッション", brand: "Darkside", leaf: "dark", ratio: 30 },
        { flavor: "スウィートミント", brand: "Fumari", leaf: "blonde", ratio: 20 }
      ],
      desc: "Fumariのジューシーなマンゴーと、Darksideのダークパッションフルーツがトロピカル感を演出。ミントで後味をすっきりまとめた南国ブレンド。ダーク初心者にもアクセスしやすい配合。",
      tags: { taste: ["sweet", "both"], category: ["fruit"], mint: ["light"], exp: ["beginner", "sometimes"], dark: ["dark_accent", "either"], mood: ["relax", "adventure"] }
    },
    {
      name: "ピーチアイスティー",
      items: [
        { flavor: "ピーチアイスドティー", brand: "Tangiers Birquq", leaf: "dark", ratio: 70 },
        { flavor: "スウィートミント", brand: "Al Fakher", leaf: "blonde", ratio: 30 }
      ],
      desc: "Tangiersの看板フレーバーの一つ。桃の甘みとアイスティーのほろ苦い渋みが絶妙に重なり、アルファーヘルのスウィートミントで喉越しを軽やかに。Birquqラインなのでダークリーフ入門としても最適。",
      tags: { taste: ["sweet", "both"], category: ["fruit", "drink"], mint: ["light"], exp: ["sometimes", "regular"], dark: ["dark_main", "dark_accent", "either"], mood: ["relax", "classic"] }
    },
    {
      name: "ベリーミックスフロスト",
      items: [
        { flavor: "ワイルドベリー", brand: "Darkside", leaf: "dark", ratio: 40 },
        { flavor: "ブルーベリー", brand: "Al Fakher", leaf: "blonde", ratio: 40 },
        { flavor: "バミューダミント", brand: "Azure", leaf: "blonde", ratio: 20 }
      ],
      desc: "Darksideのワイルドベリーの深みのある果実感と、アルファーヘルのブルーベリーの親しみやすい甘み。Azureのバミューダミント（ペパーミント＋スペアミント）が清涼感を加え、重層的なベリー体験に仕上がる。",
      tags: { taste: ["sweet", "both"], category: ["fruit"], mint: ["light", "strong"], exp: ["sometimes", "regular"], dark: ["dark_accent", "either"], mood: ["relax", "refresh"] }
    },
    {
      name: "ウォーターメロンチル",
      items: [
        { flavor: "ウォーターメロン", brand: "Fumari", leaf: "blonde", ratio: 50 },
        { flavor: "トゥワイスザアイス", brand: "Trifecta", leaf: "blonde", ratio: 30 },
        { flavor: "ウォーターメロンホールズ", brand: "Element Water", leaf: "dark", ratio: 20 }
      ],
      desc: "Fumariの瑞々しいスイカに、Trifectaの純粋な氷冷感で涼を取る。Element Waterのウォーターメロンホールズがメンソール感のある隠し味になり、夏場に最高の清涼ブレンド。",
      tags: { taste: ["fresh", "both"], category: ["fruit"], mint: ["strong"], exp: ["beginner", "sometimes", "regular"], dark: ["dark_accent", "either", "blonde_only"], mood: ["refresh"] }
    },
    {
      name: "グレープソムリエ",
      items: [
        { flavor: "グレープコア", brand: "Darkside", leaf: "dark", ratio: 50 },
        { flavor: "グレープ", brand: "Al Fakher", leaf: "blonde", ratio: 30 },
        { flavor: "スーパーミント", brand: "Darkside", leaf: "dark", ratio: 20 }
      ],
      desc: "Darksideのグレープコアは深みのある巨峰のような甘みが特徴。アルファーヘルのグレープで果汁感を足し、スーパーミントの清涼感で口当たりを引き締める。ダークリーフの入門にも推奨。",
      tags: { taste: ["sweet"], category: ["fruit"], mint: ["light", "strong"], exp: ["sometimes", "regular"], dark: ["dark_main", "dark_accent", "either"], mood: ["classic", "relax"] }
    },
    {
      name: "マンゴーラッシー",
      items: [
        { flavor: "マンゴーラッシー", brand: "Darkside", leaf: "dark", ratio: 60 },
        { flavor: "キラーミルク", brand: "Darkside", leaf: "dark", ratio: 20 },
        { flavor: "ケインミント", brand: "Tangiers Noir", leaf: "dark", ratio: 20 }
      ],
      desc: "Darksideの名作マンゴーラッシーに、同ブランドのキラーミルク（練乳）でクリーミーさを増強。Tangiers Noirのケインミントで清涼感を添えた、濃厚トロピカルデザートブレンド。ダークリーフ100%の本格仕様。",
      tags: { taste: ["sweet"], category: ["fruit", "dessert"], mint: ["light"], exp: ["regular", "expert"], dark: ["dark_main"], mood: ["relax", "adventure"] }
    },

    // ── シトラス・フローラル ──
    {
      name: "シトラスブリーズ",
      items: [
        { flavor: "レモンライム", brand: "Tangiers Birquq", leaf: "dark", ratio: 40 },
        { flavor: "カリーグレープフルーツ", brand: "Darkside", leaf: "dark", ratio: 30 },
        { flavor: "シトラスミント", brand: "Fumari", leaf: "blonde", ratio: 30 }
      ],
      desc: "Tangiersのレモンライムの鮮烈な柑橘感に、Darksideのカリーグレープフルーツのほろ苦さ。Fumariのシトラスミントで爽やかにまとめた、食後にぴったりのリフレッシュブレンド。",
      tags: { taste: ["fresh", "both"], category: ["citrus"], mint: ["light", "strong"], exp: ["sometimes", "regular"], dark: ["dark_main", "dark_accent", "either"], mood: ["refresh"] }
    },
    {
      name: "ライチローズ",
      items: [
        { flavor: "スペースライチ", brand: "Darkside", leaf: "dark", ratio: 50 },
        { flavor: "ウィンターローズ", brand: "Azure", leaf: "blonde", ratio: 30 },
        { flavor: "ミント", brand: "Al Fakher", leaf: "blonde", ratio: 20 }
      ],
      desc: "Darksideのスペースライチは繊細で上品なライチの香り。Azureのウィンターローズのフローラル感が華やかさを加え、アルファーヘルミントで清涼感を添えた、エレガントな一杯。",
      tags: { taste: ["sweet", "both"], category: ["citrus"], mint: ["light"], exp: ["sometimes", "regular"], dark: ["dark_accent", "either"], mood: ["relax", "adventure"] }
    },
    {
      name: "グレフルジンジャー",
      items: [
        { flavor: "グレープフルーツ＆ポメロ", brand: "Element Earth", leaf: "dark", ratio: 50 },
        { flavor: "スパイスドチャイ", brand: "Fumari", leaf: "blonde", ratio: 30 },
        { flavor: "エレミント", brand: "Element Earth", leaf: "dark", ratio: 20 }
      ],
      desc: "Elementアースラインのグレープフルーツ＆ポメロの苦味とジューシーさに、Fumariのスパイスドチャイでジンジャーの温かみを重ねた。エレミントで後味をクリアに。上級者が唸る変化球レシピ。",
      tags: { taste: ["fresh"], category: ["citrus", "spice"], mint: ["light"], exp: ["regular", "expert"], dark: ["dark_main", "dark_accent"], mood: ["adventure"] }
    },

    // ── デザート・スイーツ ──
    {
      name: "バニラチョコムース",
      items: [
        { flavor: "ミントチョコレートチル", brand: "Fumari", leaf: "blonde", ratio: 40 },
        { flavor: "ポーラークリーム", brand: "Darkside", leaf: "dark", ratio: 30 },
        { flavor: "ソルティキャラメル", brand: "Element Water", leaf: "dark", ratio: 30 }
      ],
      desc: "Fumariのミントチョコレートチルの清涼チョコに、Darksideのポーラークリームのバニラアイス感。Element Waterのソルティキャラメルで甘さに深みを。リラックスタイムの贅沢な一杯。",
      tags: { taste: ["sweet"], category: ["dessert"], mint: ["light"], exp: ["sometimes", "regular"], dark: ["dark_accent", "either"], mood: ["relax"] }
    },
    {
      name: "チーズケーキベリー",
      items: [
        { flavor: "ブルーベリーマフィン", brand: "Fumari", leaf: "blonde", ratio: 40 },
        { flavor: "ガーネットヨーグルト", brand: "Element Earth", leaf: "dark", ratio: 30 },
        { flavor: "ジェネリスラズベリー", brand: "Darkside", leaf: "dark", ratio: 30 }
      ],
      desc: "Fumariのブルーベリーマフィンの焼き菓子感に、ElementのガーネットヨーグルトとDarksideのラズベリーを合わせた。まるでベリーチーズケーキのような甘酸っぱいデザートブレンド。",
      tags: { taste: ["sweet"], category: ["dessert", "fruit"], mint: ["none"], exp: ["sometimes", "regular"], dark: ["dark_accent", "either"], mood: ["relax", "adventure"] }
    },
    {
      name: "アールグレイミルク",
      items: [
        { flavor: "レッドティー", brand: "Darkside", leaf: "dark", ratio: 40 },
        { flavor: "キラーミルク", brand: "Darkside", leaf: "dark", ratio: 25 },
        { flavor: "ハニーダスト", brand: "Darkside", leaf: "dark", ratio: 20 },
        { flavor: "ニードルズ", brand: "Darkside", leaf: "dark", ratio: 15 }
      ],
      desc: "Darksideのレッドティーをベースに、キラーミルクの練乳感とハニーダストの蜂蜜の甘さを重ね、ニードルズ（モミの木）のウッディなアクセントで奥行きを出した。オールダーク構成のロイヤルミルクティー。",
      tags: { taste: ["sweet", "both"], category: ["dessert", "drink"], mint: ["none"], exp: ["regular", "expert"], dark: ["dark_main"], mood: ["relax", "classic"] }
    },
    {
      name: "キャラメルナッツ",
      items: [
        { flavor: "ソルティキャラメル", brand: "Element Water", leaf: "dark", ratio: 40 },
        { flavor: "シナモンクッキー", brand: "Azure", leaf: "blonde", ratio: 30 },
        { flavor: "アイリッシュクリーム", brand: "Element Earth", leaf: "dark", ratio: 30 }
      ],
      desc: "Element Waterのソルティキャラメルの甘じょっぱさに、Azureのシナモンクッキーの香ばしさ、Elementアイリッシュクリームの洋酒のような深みを重ねた。秋冬にぴったりの温かみあるブレンド。",
      tags: { taste: ["sweet"], category: ["dessert", "spice"], mint: ["none"], exp: ["sometimes", "regular"], dark: ["dark_accent", "dark_main"], mood: ["relax"] }
    },
    {
      name: "ワッフルアラモード",
      items: [
        { flavor: "ワッフルシャッフル", brand: "Darkside", leaf: "dark", ratio: 40 },
        { flavor: "ダークアイスクリーム", brand: "Darkside", leaf: "dark", ratio: 30 },
        { flavor: "ヴァージンピーチ", brand: "Darkside", leaf: "dark", ratio: 30 }
      ],
      desc: "Darksideのワッフルシャッフルの焼きたてワッフル感に、ダークアイスクリームのバニラ、ヴァージンピーチのフレッシュな甘さ。まるでカフェのワッフルアラモードを再現した、オールDarksideの贅沢構成。",
      tags: { taste: ["sweet"], category: ["dessert", "fruit"], mint: ["none"], exp: ["regular", "expert"], dark: ["dark_main"], mood: ["relax", "adventure"] }
    },

    // ── ミント・ハーブ ──
    {
      name: "アルティメットミント",
      items: [
        { flavor: "ケインミント", brand: "Tangiers Noir", leaf: "dark", ratio: 40 },
        { flavor: "スーパーミント", brand: "Darkside", leaf: "dark", ratio: 30 },
        { flavor: "トゥワイスザアイス", brand: "Trifecta", leaf: "blonde", ratio: 30 }
      ],
      desc: "シーシャ界最強と名高いTangiers Noirのケインミントに、Darksideのスーパーミント、Trifectaのトゥワイスザアイスを重ねた極冷ブレンド。頭が冴えるほどの清涼感。ミント好きの終着点。",
      tags: { taste: ["fresh"], category: ["mint"], mint: ["strong"], exp: ["regular", "expert"], dark: ["dark_main", "dark_accent"], mood: ["refresh"] }
    },
    {
      name: "ハーバルフォレスト",
      items: [
        { flavor: "ファー", brand: "COBRA Virgin", leaf: "blonde", ratio: 40 },
        { flavor: "ニードルズ", brand: "Darkside", leaf: "dark", ratio: 30 },
        { flavor: "バジルブラスト", brand: "Darkside", leaf: "dark", ratio: 30 }
      ],
      desc: "COBRAのファー（モミの木）とDarksideのニードルズで森林浴のようなウッディ感を出し、バジルブラストのハーブ感で奥行きを持たせた。フルーツ系に飽きた上級者に刺さる、森の中のようなブレンド。",
      tags: { taste: ["fresh"], category: ["mint", "spice"], mint: ["light", "strong"], exp: ["regular", "expert"], dark: ["dark_accent", "dark_main"], mood: ["refresh", "adventure"] }
    },
    {
      name: "ミントレモネード",
      items: [
        { flavor: "レモンミント", brand: "Al Fakher", leaf: "blonde", ratio: 40 },
        { flavor: "レモンブラスト", brand: "Darkside", leaf: "dark", ratio: 30 },
        { flavor: "スーパーミント", brand: "Darkside", leaf: "dark", ratio: 30 }
      ],
      desc: "アルファーヘルの定番レモンミントをベースに、Darksideのレモンブラストでレモンの鮮烈さを増強。スーパーミントで清涼感をガツンと効かせた、夏場のドライブのお供にしたいブレンド。",
      tags: { taste: ["fresh"], category: ["mint", "citrus"], mint: ["strong"], exp: ["beginner", "sometimes", "regular"], dark: ["dark_accent", "either"], mood: ["refresh", "classic"] }
    },

    // ── ドリンク系 ──
    {
      name: "コーラフロート",
      items: [
        { flavor: "ダークサイドコーラ", brand: "Darkside", leaf: "dark", ratio: 40 },
        { flavor: "ポーラークリーム", brand: "Darkside", leaf: "dark", ratio: 25 },
        { flavor: "スーパーミント", brand: "Darkside", leaf: "dark", ratio: 20 },
        { flavor: "クリームソーダ", brand: "Darkside", leaf: "dark", ratio: 15 }
      ],
      desc: "Darksideコーラのキャラメル感のある本格コーラ味に、ポーラークリームとクリームソーダでバニラフロート感を演出。スーパーミントの清涼感で喉越し爽やか。ダーク100%の満足感ある一杯。",
      tags: { taste: ["sweet", "both"], category: ["drink"], mint: ["light"], exp: ["regular", "expert"], dark: ["dark_main"], mood: ["classic", "relax"] }
    },
    {
      name: "クラフトコーラ",
      items: [
        { flavor: "コーラ", brand: "Element Earth", leaf: "dark", ratio: 50 },
        { flavor: "オレンジ", brand: "Al Fakher", leaf: "blonde", ratio: 30 },
        { flavor: "スパイスドチャイ", brand: "Fumari", leaf: "blonde", ratio: 20 }
      ],
      desc: "Element Earthのコーラはスパイシーで本格的。アルファーヘルのオレンジでフレッシュな柑橘感を、Fumariのスパイスドチャイでシナモンの温かみを足した。手作りクラフトコーラのようなブレンド。",
      tags: { taste: ["sweet", "both"], category: ["drink", "spice"], mint: ["none", "light"], exp: ["sometimes", "regular"], dark: ["dark_accent", "either"], mood: ["adventure", "classic"] }
    },
    {
      name: "アイスティーブリーズ",
      items: [
        { flavor: "グリッチアイスティー", brand: "Darkside", leaf: "dark", ratio: 50 },
        { flavor: "キャロライナピーチ", brand: "Azure", leaf: "blonde", ratio: 30 },
        { flavor: "バミューダミント", brand: "Azure", leaf: "blonde", ratio: 20 }
      ],
      desc: "Darksideのグリッチアイスティーの茶葉の渋みに、Azureのキャロライナピーチで桃の甘さを乗せ、バミューダミントですっきりと。本格的なピーチアイスティーを再現した爽快ブレンド。",
      tags: { taste: ["fresh", "both"], category: ["drink", "fruit"], mint: ["light"], exp: ["sometimes", "regular"], dark: ["dark_accent", "either"], mood: ["refresh", "relax"] }
    },

    // ── 定番・クラシック ──
    {
      name: "ロイヤルダブルアップル",
      items: [
        { flavor: "ツーアップル", brand: "Al Fakher", leaf: "blonde", ratio: 50 },
        { flavor: "ダブルアップル", brand: "Fumari", leaf: "blonde", ratio: 30 },
        { flavor: "ミント", brand: "Al Fakher", leaf: "blonde", ratio: 20 }
      ],
      desc: "アルファーヘルの王道ダブルアップルに、Fumariのダブルアップルで果実の甘みを増強。ミントで後味をすっきりまとめた、シーシャ初体験にも最推奨の定番中の定番。迷ったらまずこれ。",
      tags: { taste: ["both", "fresh"], category: ["fruit", "drink"], mint: ["light"], exp: ["beginner", "sometimes"], dark: ["blonde_only", "either"], mood: ["classic"] }
    },
    {
      name: "ダブルアップル × ダーク",
      items: [
        { flavor: "ツーアップル", brand: "Al Fakher", leaf: "blonde", ratio: 40 },
        { flavor: "フォーリングスター", brand: "Darkside", leaf: "dark", ratio: 40 },
        { flavor: "スーパーミント", brand: "Darkside", leaf: "dark", ratio: 20 }
      ],
      desc: "アルファーヘルのダブルアップルのアニス感に、Darksideのフォーリングスター（スターアニス系）でダークリーフの深みとスパイス感を重ねた。中東クラシックを現代ダークリーフで昇華させた一品。",
      tags: { taste: ["both", "fresh"], category: ["fruit", "spice"], mint: ["light", "strong"], exp: ["regular", "expert"], dark: ["dark_main", "dark_accent"], mood: ["classic"] }
    },
    {
      name: "パンラズ クラシック",
      items: [
        { flavor: "パンラズ", brand: "AFZAL", leaf: "blonde", ratio: 60 },
        { flavor: "ミント", brand: "Al Fakher", leaf: "blonde", ratio: 25 },
        { flavor: "オレンジ", brand: "Al Fakher", leaf: "blonde", ratio: 15 }
      ],
      desc: "AFZALのパンラズナはインドのパーン（ベテルリーフ）を再現した独特のスパイス感と甘み。ミントとオレンジで爽やかさをプラス。日本のシーシャバーでも根強い人気を誇る定番レシピ。",
      tags: { taste: ["both", "sweet"], category: ["spice"], mint: ["light"], exp: ["beginner", "sometimes", "regular"], dark: ["blonde_only", "either"], mood: ["classic", "relax"] }
    },

    // ── スパイス・ウッド ──
    {
      name: "オリエンタルスパイス",
      items: [
        { flavor: "スパイスドチャイ", brand: "Fumari", leaf: "blonde", ratio: 30 },
        { flavor: "ハニーダスト", brand: "Darkside", leaf: "dark", ratio: 30 },
        { flavor: "フォーリングスター", brand: "Darkside", leaf: "dark", ratio: 25 },
        { flavor: "ニードルズ", brand: "Darkside", leaf: "dark", ratio: 15 }
      ],
      desc: "Fumariのスパイスドチャイのシナモン・カルダモンに、Darksideのハニーダストの蜂蜜の甘みとフォーリングスターのアニス感を重ねた。ニードルズのモミの木がウッディな深みを添える、中東の夜を思わせるブレンド。",
      tags: { taste: ["both", "sweet"], category: ["spice", "dessert"], mint: ["none"], exp: ["regular", "expert"], dark: ["dark_main", "dark_accent"], mood: ["relax", "adventure"] }
    },
    {
      name: "フォレストウッド",
      items: [
        { flavor: "ファー", brand: "COBRA Virgin", leaf: "blonde", ratio: 35 },
        { flavor: "ニードルズ", brand: "Darkside", leaf: "dark", ratio: 35 },
        { flavor: "チェリーロックス", brand: "Darkside", leaf: "dark", ratio: 30 }
      ],
      desc: "COBRA Virginのファー（モミの木）とDarksideのニードルズで二重の森林系ウッドを構築し、チェリーロックスの甘酸っぱさで果実のアクセントを添えた。森のなかで木の実を摘むような独創的なブレンド。",
      tags: { taste: ["fresh", "both"], category: ["spice"], mint: ["none", "light"], exp: ["regular", "expert"], dark: ["dark_main", "dark_accent"], mood: ["adventure"] }
    },

    // ── ダークリーフ本格派 ──
    {
      name: "トリプルダークナイト",
      items: [
        { flavor: "スーパーノヴァ", brand: "Darkside", leaf: "dark", ratio: 30 },
        { flavor: "レッドアラート", brand: "Darkside", leaf: "dark", ratio: 30 },
        { flavor: "トーピード", brand: "Darkside", leaf: "dark", ratio: 25 },
        { flavor: "スーパーミント", brand: "Darkside", leaf: "dark", ratio: 15 }
      ],
      desc: "Darksideのスーパーノヴァ（強烈メンソール）、レッドアラート（柘榴の甘酸っぱさ）、トーピード（濃厚なスイカ）の三銃士にスーパーミントを添えた。全ダーク構成でニコチン感もしっかり、玄人が唸る本格派ブレンド。",
      tags: { taste: ["both", "fresh"], category: ["fruit", "mint"], mint: ["strong"], exp: ["expert", "regular"], dark: ["dark_main"], mood: ["adventure", "refresh"] }
    },
    {
      name: "ダークサイド スモーキーベリー",
      items: [
        { flavor: "ジェネリスラズベリー", brand: "Darkside", leaf: "dark", ratio: 35 },
        { flavor: "ワイルドフォレスト", brand: "Darkside", leaf: "dark", ratio: 35 },
        { flavor: "スーパーノヴァ", brand: "Darkside", leaf: "dark", ratio: 30 }
      ],
      desc: "Darksideのジェネリスラズベリーのジューシーさと、ワイルドフォレストのベリーの複雑な酸味。スーパーノヴァのメンソールで清涼感を効かせた、ダークリーフのベリーの真髄を味わうレシピ。",
      tags: { taste: ["both", "fresh"], category: ["fruit"], mint: ["light", "strong"], exp: ["regular", "expert"], dark: ["dark_main"], mood: ["adventure", "refresh"] }
    },
    {
      name: "Tangiers クラシックセッション",
      items: [
        { flavor: "ケインミント", brand: "Tangiers Noir", leaf: "dark", ratio: 30 },
        { flavor: "オレンジソーダ", brand: "Tangiers Noir", leaf: "dark", ratio: 35 },
        { flavor: "オロリキ", brand: "Tangiers Noir", leaf: "dark", ratio: 35 }
      ],
      desc: "Tangiers Noirの真髄を体感するレシピ。ケインミントの極冷、オレンジソーダの柑橘の鮮烈さ、オロリキのフローラルライムのスパイシーさ。ニコチン最強クラスのNoirライン3種による至高のセッション。",
      tags: { taste: ["fresh"], category: ["citrus", "mint"], mint: ["strong"], exp: ["expert"], dark: ["dark_main"], mood: ["adventure"] }
    },
    {
      name: "Element アースセッション",
      items: [
        { flavor: "マンゴー", brand: "Element Earth", leaf: "dark", ratio: 30 },
        { flavor: "パイナップル", brand: "Element Earth", leaf: "dark", ratio: 30 },
        { flavor: "エレミント", brand: "Element Earth", leaf: "dark", ratio: 20 },
        { flavor: "レモングラス", brand: "Element Earth", leaf: "dark", ratio: 20 }
      ],
      desc: "Element Earthラインのマンゴーとパイナップルでトロピカルの土台を作り、エレミント（清涼ミント）とレモングラスのハーブ感で引き締めた。ダークリーフながらフルーティーで親しみやすい、Element入門にも最適な構成。",
      tags: { taste: ["sweet", "both"], category: ["fruit", "mint"], mint: ["light"], exp: ["regular", "expert"], dark: ["dark_main"], mood: ["relax", "adventure"] }
    },
    {
      name: "SEBERO ダークベリー",
      items: [
        { flavor: "ビルベリー", brand: "SEBERO Black", leaf: "dark", ratio: 40 },
        { flavor: "フェイベリー", brand: "SEBERO Black", leaf: "dark", ratio: 30 },
        { flavor: "キウイ", brand: "SEBERO Black", leaf: "dark", ratio: 30 }
      ],
      desc: "SEBERO Blackのビルベリー（北欧産ブルーベリー）の深い果実味に、フェイベリーのフェイジョア＋ベリーの複雑さ、キウイの酸味を重ねた。日本で入手しやすいセベロで組むダークリーフレシピ。",
      tags: { taste: ["sweet", "both"], category: ["fruit"], mint: ["none", "light"], exp: ["regular", "expert"], dark: ["dark_main"], mood: ["classic", "adventure"] }
    },

    // ── アダリヤ系（入門〜中級） ──
    {
      name: "Love 66 トロピカル",
      items: [
        { flavor: "ラブ66", brand: "Adalya", leaf: "blonde", ratio: 50 },
        { flavor: "アロハマンゴー", brand: "Fumari", leaf: "blonde", ratio: 30 },
        { flavor: "スウィートミント", brand: "Fumari", leaf: "blonde", ratio: 20 }
      ],
      desc: "Adalyaの大人気フレーバーLove 66（パッションフルーツ・スイカ・メロン・ミント）に、Fumariのマンゴーで甘みを足してスウィートミントで整えた。甘くてフルーティー、初心者にも大人気のブレンド。",
      tags: { taste: ["sweet"], category: ["fruit"], mint: ["light"], exp: ["beginner", "sometimes"], dark: ["blonde_only", "either"], mood: ["relax", "classic"] }
    },
    {
      name: "レディーキラー",
      items: [
        { flavor: "レディーキラー", brand: "Adalya", leaf: "blonde", ratio: 50 },
        { flavor: "ストロベリーグアバ", brand: "Azure", leaf: "blonde", ratio: 30 },
        { flavor: "バミューダミント", brand: "Azure", leaf: "blonde", ratio: 20 }
      ],
      desc: "Adalyaのレディーキラー（メロン＋ベリー＋ミント）をベースに、Azureのストロベリーグアバでトロピカルな果実感を増強。バミューダミントで後味をキリッと。フルーティー好きの方に刺さる華やかブレンド。",
      tags: { taste: ["sweet", "both"], category: ["fruit"], mint: ["light"], exp: ["beginner", "sometimes"], dark: ["blonde_only", "either"], mood: ["relax", "refresh"] }
    },

    // ── ブロンドリーフのみ構成 ──
    {
      name: "Fumari オレンジクリーム",
      items: [
        { flavor: "オレンジクリーム", brand: "Fumari", leaf: "blonde", ratio: 50 },
        { flavor: "ホワイトグミベア", brand: "Fumari", leaf: "blonde", ratio: 30 },
        { flavor: "スウィートミント", brand: "Fumari", leaf: "blonde", ratio: 20 }
      ],
      desc: "Fumariのオレンジクリームのクリーミーな柑橘感と、ホワイトグミベアのフルーティーなキャンディ感を合わせた。スウィートミントで軽快に仕上げた、軽やかで甘いブロンドのみ構成。",
      tags: { taste: ["sweet"], category: ["citrus", "dessert"], mint: ["light"], exp: ["beginner", "sometimes"], dark: ["blonde_only", "either"], mood: ["relax", "classic"] }
    },
    {
      name: "Azure モスクワナイト",
      items: [
        { flavor: "モスクワネバースリープス", brand: "Azure", leaf: "blonde", ratio: 40 },
        { flavor: "コスモス", brand: "Azure", leaf: "blonde", ratio: 30 },
        { flavor: "アラスカンアイス", brand: "Azure", leaf: "blonde", ratio: 30 }
      ],
      desc: "Azureのモスクワネバースリープス（フルーツ＋ミント）に、コスモス（グレフル＋ラズベリー）のほろ苦いベリー感と、アラスカンアイスのメンソール。夜更けに吸いたくなるスタイリッシュなブレンド。",
      tags: { taste: ["fresh", "both"], category: ["fruit", "mint"], mint: ["strong"], exp: ["sometimes", "regular"], dark: ["blonde_only", "either"], mood: ["refresh", "adventure"] }
    }
  ];

  /* ─── UI ─── */

  function createLunaMsgAvatar() {
    var wrap = document.createElement("div");
    wrap.className = "sommelier-msg-avatar";
    wrap.setAttribute("aria-hidden", "true");
    var img = document.createElement("img");
    img.className = "sommelier-msg-avatar-img";
    img.src = "images/sommelier-avatar-sm.png";
    img.alt = "";
    img.width = 40;
    img.height = 40;
    img.decoding = "async";
    img.onerror = function () {
      img.style.display = "none";
      wrap.classList.add("sommelier-msg-avatar--fallback");
    };
    wrap.appendChild(img);
    return wrap;
  }

  /** ルナの提案ブロック（結果イントロ・レシピカード等）をアイコン付き行で包む */
  function wrapLunaContent(contentEl) {
    var row = document.createElement("div");
    row.className = "sommelier-luna-row sommelier-fade-enter";
    row.appendChild(createLunaMsgAvatar());
    var body = document.createElement("div");
    body.className = "sommelier-luna-row-body";
    body.appendChild(contentEl);
    row.appendChild(body);
    return row;
  }

  function addMessage(isBot, text, cb) {
    var div = document.createElement("div");
    div.className = "sommelier-msg sommelier-msg--enter " + (isBot ? "sommelier-msg--bot" : "sommelier-msg--user");
    if (isBot) {
      div.appendChild(createLunaMsgAvatar());
    }
    var inner = document.createElement("div");
    inner.className = "sommelier-msg-inner";
    inner.textContent = text;
    div.appendChild(inner);
    messagesEl.appendChild(div);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        div.classList.remove("sommelier-msg--enter");
        div.classList.add("sommelier-msg--visible");
        messagesEl.scrollTo({ top: messagesEl.scrollHeight, behavior: "smooth" });
        if (cb) cb();
      });
    });
  }

  function showChoices(items) {
    choicesEl.innerHTML = "";
    choicesEl.classList.remove("sommelier-choices--visible");
    items.forEach(function (c) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "sommelier-choice-btn";
      btn.textContent = c.label;
      btn.dataset.choiceId = c.id;
      choicesEl.appendChild(btn);
    });
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        choicesEl.classList.add("sommelier-choices--visible");
        /* scrollIntoView は document 全体がスクロールしフッターまで動くため使わない。タップしやすさは CSS の余白で確保 */
      });
    });
  }

  function hideChoices() {
    choicesEl.classList.remove("sommelier-choices--visible");
    choicesEl.innerHTML = "";
  }

  function showTyping() {
    var div = document.createElement("div");
    div.className = "sommelier-msg sommelier-msg--bot sommelier-msg--visible";
    div.id = "sommelier-typing";
    div.appendChild(createLunaMsgAvatar());
    var inner = document.createElement("div");
    inner.className = "sommelier-msg-inner sommelier-typing-dots";
    inner.innerHTML = '<span></span><span></span><span></span>';
    div.appendChild(inner);
    messagesEl.appendChild(div);
    messagesEl.scrollTo({ top: messagesEl.scrollHeight, behavior: "smooth" });
  }

  function removeTyping() {
    var el = document.getElementById("sommelier-typing");
    if (el) el.remove();
  }

  /* ─── マッチングエンジン ─── */

  function scoreRecipe(recipe) {
    var a = state.answers;
    var t = recipe.tags;
    var score = 0;

    if (a.taste && t.taste && t.taste.indexOf(a.taste) !== -1) score += 3;
    if (a.category && t.category && t.category.indexOf(a.category) !== -1) score += 4;
    if (a.mint_level && t.mint) {
      if (t.mint.indexOf(a.mint_level) !== -1) score += 2;
      else if (a.mint_level === "none" && t.mint.indexOf("none") === -1) score -= 3;
    }
    if (a.experience && t.exp && t.exp.indexOf(a.experience) !== -1) score += 2;
    if (a.dark_leaf && t.dark) {
      if (t.dark.indexOf(a.dark_leaf) !== -1) score += 3;
      else score -= 4;
    }
    if (a.mood && t.mood && t.mood.indexOf(a.mood) !== -1) score += 2;

    return score;
  }

  function getRecommendations() {
    var scored = recipes.map(function (r) {
      return { recipe: r, score: scoreRecipe(r) };
    });
    scored.sort(function (a, b) { return b.score - a.score; });
    var top = scored.filter(function (s) { return s.score > 0; }).slice(0, 3);
    if (top.length < 3) top = scored.slice(0, 3);
    return top.map(function (s) { return s.recipe; });
  }

  function buildRecipeCard(r, idx) {
    var card = document.createElement("div");
    card.className = "sommelier-recipe-card";

    var header = document.createElement("div");
    header.className = "sommelier-recipe-header";
    header.id = "sommelier-recipe-" + (idx + 1);
    header.textContent = "【" + (idx + 1) + "】 " + r.name;
    card.appendChild(header);

    var itemsWrap = document.createElement("div");
    itemsWrap.className = "sommelier-recipe-items";
    r.items.forEach(function (item) {
      var row = document.createElement("div");
      row.className = "sommelier-recipe-row";
      var leafCls = item.leaf === "dark" ? "sommelier-leaf-dark" : "sommelier-leaf-blonde";
      row.innerHTML = '<span class="sommelier-recipe-flavor">' + item.flavor + '</span>' +
        '<span class="sommelier-recipe-brand">（' + item.brand + '）</span>' +
        '<span class="sommelier-recipe-leaf ' + leafCls + '">' + (item.leaf === "dark" ? "ダーク" : "ブロンド") + '</span>' +
        '<span class="sommelier-recipe-ratio">' + item.ratio + '%</span>';
      itemsWrap.appendChild(row);
    });
    card.appendChild(itemsWrap);

    var note = document.createElement("div");
    note.className = "sommelier-recipe-note";
    note.textContent = r.desc;
    card.appendChild(note);

    return card;
  }

  /** スクロール中身の「上端」（ボーダー内・padding 下）の viewport Y。モバイル WebKit でのズレ対策 */
  function messagesScrollportTopY() {
    var root = messagesEl;
    var r = root.getBoundingClientRect();
    var cs = window.getComputedStyle(root);
    var padTop = parseFloat(cs.paddingTop) || 0;
    return r.top + root.clientTop + padTop;
  }

  /** 固定ヘッダー下端（viewport Y）。レシピジャンプの基準に使う */
  function fixedHeaderBottomY() {
    var hdr = document.querySelector(".header");
    return hdr ? hdr.getBoundingClientRect().bottom : 0;
  }

  /**
   * レシピタイトル等を揃える「目標」の viewport Y。
   * メッセージ枠の上端＋余白 と ヘッダー下端＋余白 のいずれか下側（見えている方）に合わせ、ヘッダーと被らないようにする。
   * extraDown … タイトル上の余白・横アイコンが切れないよう、目標ラインを viewport 下方向へずらす分（px）
   */
  function visibleAlignmentTargetY(msgPad, extraDown) {
    msgPad = typeof msgPad === "number" ? msgPad : 6;
    extraDown = typeof extraDown === "number" ? extraDown : 0;
    var belowMsgs = messagesScrollportTopY() + msgPad;
    var hdrGap = 8;
    var belowHdr = fixedHeaderBottomY() + hdrGap;
    return Math.max(belowMsgs, belowHdr) + extraDown;
  }

  /**
   * el 上端を visibleAlignmentTargetY(pad) に合わせるよう scrollTop を補正（固定ヘッダー考慮）。
   */
  function alignElementTopInMessages(el, pad) {
    if (!messagesEl || !el) return;
    var targetY = visibleAlignmentTargetY(pad);
    var er = el.getBoundingClientRect();
    var delta = er.top - targetY;
    if (Math.abs(delta) >= 0.5) {
      messagesEl.scrollTop += Math.round(delta);
    }
  }

  /**
   * 提案ナビ【1】【2】【3】用。document は触らず #sommelier-messages のみ。
   * ルナ行の上端で揃えるとタイトルに適度な余白ができ、アイコンも切れにくい。
   */
  function jumpToRecipeInMessages(anchorEl, pad) {
    if (!messagesEl || !anchorEl || !messagesEl.contains(anchorEl)) return;
    pad = typeof pad === "number" ? pad : 4;
    /* タイトル上にほんの少し余白（下がり気味のときは数 px 下げる） */
    var extraBreathing = 6;

    var row = anchorEl.closest && anchorEl.closest(".sommelier-luna-row");
    var alignEl = row && messagesEl.contains(row) ? row : anchorEl;

    var targetY0 = visibleAlignmentTargetY(pad, extraBreathing);
    var eRect = alignEl.getBoundingClientRect();
    messagesEl.scrollTop = Math.max(0, Math.round(messagesEl.scrollTop + (eRect.top - targetY0)));

    var i;
    for (i = 0; i < 32; i++) {
      var targetY = visibleAlignmentTargetY(pad, extraBreathing);
      var er = alignEl.getBoundingClientRect();
      var delta = er.top - targetY;
      if (Math.abs(delta) < 1) break;
      messagesEl.scrollTop += Math.round(delta);
    }
  }

  /** メッセージ欄内で el の上端が見える位置へスクロール（新着バブル用） */
  function scrollToElTop(el, opts) {
    if (!messagesEl || !el || !messagesEl.contains(el)) return;
    opts = opts || {};
    var behavior = opts.behavior !== undefined ? opts.behavior : "smooth";
    var pad = typeof opts.pad === "number" ? opts.pad : 10;

    function topWithinMessages() {
      var root = messagesEl;
      var eRect = el.getBoundingClientRect();
      var targetY = visibleAlignmentTargetY(pad);
      var top = root.scrollTop + (eRect.top - targetY);
      return Math.max(0, Math.round(top));
    }

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        messagesEl.scrollTo({ top: topWithinMessages(), behavior: behavior });
        if (behavior === "auto") {
          requestAnimationFrame(function () {
            alignElementTopInMessages(el, pad);
            requestAnimationFrame(function () {
              alignElementTopInMessages(el, pad);
            });
          });
        }
      });
    });
  }

  function hideResultNav() {
    if (!resultNavEl) return;
    resultNavEl.innerHTML = "";
    resultNavEl.setAttribute("hidden", "");
  }

  function showResultNav(recs) {
    if (!resultNavEl || !recs || !recs.length) return;
    resultNavEl.innerHTML = "";
    var head = document.createElement("div");
    head.className = "sommelier-result-nav-head";
    var title = document.createElement("p");
    title.className = "sommelier-result-nav-title";
    title.textContent = "提案を確認する";
    head.appendChild(title);
    var list = document.createElement("div");
    list.className = "sommelier-result-nav-links";
    recs.forEach(function (r, i) {
      var n = i + 1;
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "sommelier-result-nav-link";
      btn.textContent = "【" + n + "】";
      btn.setAttribute("title", r.name);
      btn.setAttribute("aria-label", "提案「" + r.name + "」の位置へスクロール");
      btn.addEventListener("click", function () {
        var target = messagesEl.querySelector("#sommelier-recipe-" + n);
        if (target) jumpToRecipeInMessages(target, 6);
      });
      list.appendChild(btn);
    });
    head.appendChild(list);
    resultNavEl.appendChild(head);
    resultNavEl.removeAttribute("hidden");
  }

  function addResultEl(el, cb) {
    messagesEl.appendChild(el);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        el.classList.remove("sommelier-fade-enter");
        el.classList.add("sommelier-fade-visible");
        scrollToElTop(el);
        if (cb) setTimeout(cb, 600);
      });
    });
  }

  function getAnswerLabel(stepId, answerId) {
    for (var i = 0; i < steps.length; i++) {
      if (steps[i].id === stepId) {
        for (var j = 0; j < steps[i].choices.length; j++) {
          if (steps[i].choices[j].id === answerId) return steps[i].choices[j].label;
        }
      }
    }
    return answerId;
  }

  function buildAnswerSummary() {
    var wrap = document.createElement("div");
    wrap.className = "sommelier-answer-summary sommelier-fade-enter";
    var title = document.createElement("div");
    title.className = "sommelier-answer-title";
    title.textContent = "あなたの回答";
    wrap.appendChild(title);

    var labels = {
      taste: "甘さ",
      category: "系統",
      mint_level: "ミント",
      experience: "経験",
      dark_leaf: "ダークリーフ",
      mood: "気分"
    };
    var items = document.createElement("div");
    items.className = "sommelier-answer-items";
    var answered = ["taste", "category", "mint_level", "experience", "dark_leaf", "mood"];
    answered.forEach(function (key) {
      if (!state.answers[key]) return;
      var tag = document.createElement("span");
      tag.className = "sommelier-answer-tag";
      tag.textContent = labels[key] + "：" + getAnswerLabel(key, state.answers[key]);
      items.appendChild(tag);
    });
    wrap.appendChild(items);
    return wrap;
  }

  function showResult() {
    var recs = getRecommendations();
    hideChoices();

    var sep = document.createElement("div");
    sep.className = "sommelier-result-sep";
    messagesEl.appendChild(sep);

    var summary = buildAnswerSummary();
    addResultEl(summary);

    showTyping();
    setTimeout(function () {
      removeTyping();

      var intro = document.createElement("div");
      intro.className = "sommelier-result-intro";
      intro.textContent = "お答えありがとうございます。お好みに合わせて、具体的な銘柄とブレンド比率でご提案いたします。";
      addResultEl(wrapLunaContent(intro), function () {
        showRecipeSequence(recs, 0);
      });
    }, 700);
  }

  function showRecipeSequence(recs, idx) {
    if (idx >= recs.length) {
      showTyping();
      setTimeout(function () {
        removeTyping();
        addMessage(true, "以上の3つが、本日のルナのおすすめでございます。\n気になるレシピがございましたら、ぜひお店でお試しくださいませ。", function () {
          showTyping();
          setTimeout(function () {
            removeTyping();
            addMessage(true, "オーダーの際は「〇〇（ブランド名）の△△を何%くらいで」とスタッフさんにお伝えいただくと、スムーズかと思います。\nブランドや銘柄の取り扱いは店舗さんによって異なりますので、もし在庫がない場合は「この系統で」とご相談いただければ、近いフレーバーで対応していただけるはずです。\n\nごゆっくりお楽しみくださいませ。");
            showResultNav(recs);
            if (restartWrap) restartWrap.style.display = "block";
          }, 700);
        });
      }, 600);
      return;
    }

    showTyping();
    setTimeout(function () {
      removeTyping();
      var card = buildRecipeCard(recs[idx], idx);
      var row = wrapLunaContent(card);
      addResultEl(row, function () {
        showRecipeSequence(recs, idx + 1);
      });
    }, 700);
  }

  /* ─── フロー制御 ─── */

  function runStep(stepIndex) {
    var s = steps[stepIndex];
    if (!s) {
      showTyping();
      setTimeout(function () { removeTyping(); showResult(); }, 600);
      return;
    }
    showTyping();
    setTimeout(function () {
      removeTyping();
      addMessage(true, s.bot, function () {
        showChoices(s.choices);
      });
    }, 500);
  }

  function onChoice(choiceId) {
    var step = steps[state.step];
    if (!step) return;
    state.answers[step.id] = choiceId;
    var chosen = step.choices.filter(function (c) {
      return c.id === choiceId;
    })[0];
    hideChoices();
    if (chosen) addMessage(false, chosen.label);

    if (step.id === "experience" && choiceId === "beginner") {
      state.answers.dark_leaf = "blonde_only";
      state.answers.mood = "classic";
      showTyping();
      setTimeout(function () { removeTyping(); showResult(); }, 600);
      return;
    }

    state.step += 1;
    if (state.step >= steps.length) {
      showTyping();
      setTimeout(function () { removeTyping(); showResult(); }, 600);
      return;
    }
    runStep(state.step);
  }

  function init() {
    messagesEl.innerHTML = "";
    hideResultNav();
    if (restartWrap) restartWrap.style.display = "none";
    state.step = 0;
    state.answers = {};
    runStep(0);
  }

  choicesEl.addEventListener("click", function (e) {
    var btn = e.target.closest(".sommelier-choice-btn");
    if (!btn) return;
    if (typeof btn.blur === "function") btn.blur();
    onChoice(btn.dataset.choiceId);
  });

  if (restartBtn) {
    restartBtn.addEventListener("click", function () {
      init();
    });
  }

  init();
})();
