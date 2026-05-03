/**
 * フレーバー相談 - 対話形式でフレーバー組み合わせを提案
 * ルナ：シーシャフレーバーの知識を網羅する相談AI
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
      bot: "フレーバー相談AIのルナです。\nお好みに合うフレーバーを、具体的な銘柄でご提案させていただきます。\n\nまず、甘さの好みをお聞かせください。",
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
        { id: "mint", label: "ミント・ハーブ" },
        { id: "dessert", label: "デザート系" },
        { id: "citrus", label: "シトラス系" },
        { id: "spice", label: "スパイス・ウッド" },
        { id: "drink", label: "ドリンク系" }
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
        { id: "beginner", label: "初めて・数回" },
        { id: "sometimes", label: "月に数回" },
        { id: "regular", label: "週1以上" },
        { id: "expert", label: "ヘビーユーザー" }
      ]
    },
    {
      id: "leaf_type",
      bot: function (answers) {
        if (answers.experience === "beginner") {
          return "ノンニコチンのシーシャをご希望ですか。\n（ノンニコチンは、タバコ葉を使わないハーブ系のフレーバーです）";
        }
        return "お使いになる葉のタイプのご希望はございますか。\nダークリーフはタバコ感・ニコチン感が強く、深みのある喫味が特徴です。";
      },
      choices: function (answers) {
        if (answers.experience === "beginner") {
          return [
            { id: "non_nicotine", label: "ノンニコチンを希望" },
            { id: "either", label: "おまかせ" }
          ];
        }
        return [
          { id: "dark_main", label: "ダーク メイン" },
          { id: "dark_accent", label: "ダーク 少しだけ" },
          { id: "blonde_only", label: "ブロンドのみ" },
          { id: "non_nicotine", label: "ノンニコチン希望" },
          { id: "either", label: "おまかせ" }
        ];
      }
    },
    {
      id: "mood",
      bot: "本日はどのような気分でしょうか。",
      choices: [
        { id: "relax", label: "ゆったりリラックス" },
        { id: "refresh", label: "リフレッシュ" },
        { id: "adventure", label: "新しい味に挑戦" },
        { id: "classic", label: "王道・定番" }
      ]
    }
  ];

  /** ステップ定義の bot / choices が関数形式でも静的でも扱えるようにする */
  function resolveStepBot(step) {
    return typeof step.bot === "function" ? step.bot(state.answers) : step.bot;
  }
  function resolveStepChoices(step) {
    return typeof step.choices === "function" ? step.choices(state.answers) : step.choices;
  }

  /* ─── フレーバーデータベース ─── */
  var recipes = [
    // ── フルーツ × ミント（初心者〜中級者向け） ──
    {
      name: "ストロベリーミント",
      simple: [
        { flavor: "ストロベリー", ratio: 60 },
        { flavor: "ミント", ratio: 40 }
      ],
      items: [
        { flavor: "ストロベリージャム", brand: "Fumari", leaf: "blonde", ratio: 60 },
        { flavor: "スーパーミント", brand: "Darkside", leaf: "dark", ratio: 40 }
      ],
      desc: "Fumariの濃厚なイチゴジャムの甘さに、Darksideの強清涼ミントが鮮烈に効く。甘さと爽快感のバランスが秀逸で、シーシャ初体験でも満足度が高い鉄板レシピ。",
      tags: { taste: ["sweet"], category: ["fruit"], mint: ["light", "strong"], exp: ["beginner", "sometimes"], dark: ["dark_accent", "either"], mood: ["relax", "classic"] }
    },
    {
      name: "トロピカルパラダイス",
      simple: [
        { flavor: "マンゴー", ratio: 50 },
        { flavor: "パッションフルーツ", ratio: 30 },
        { flavor: "ミント", ratio: 20 }
      ],
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
      simple: [
        { flavor: "ピーチ", ratio: 40 },
        { flavor: "アールグレイ（紅茶）", ratio: 30 },
        { flavor: "ミント", ratio: 30 }
      ],
      items: [
        { flavor: "ピーチアイスドティー", brand: "Tangiers Birquq", leaf: "dark", ratio: 70 },
        { flavor: "スウィートミント", brand: "Al Fakher", leaf: "blonde", ratio: 30 }
      ],
      desc: "Tangiersの看板フレーバーの一つ。桃の甘みとアイスティーのほろ苦い渋みが絶妙に重なり、アルファーヘルのスウィートミントで喉越しを軽やかに。Birquqラインなのでダークリーフ入門としても最適。",
      tags: { taste: ["sweet", "both"], category: ["fruit", "drink"], mint: ["light"], exp: ["sometimes", "regular"], dark: ["dark_main", "dark_accent", "either"], mood: ["relax", "classic"] }
    },
    {
      name: "ベリーミックスフロスト",
      simple: [
        { flavor: "ミックスベリー", ratio: 50 },
        { flavor: "ブルーベリー", ratio: 30 },
        { flavor: "ミント", ratio: 20 }
      ],
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
      simple: [
        { flavor: "スイカ", ratio: 60 },
        { flavor: "ミント", ratio: 40 }
      ],
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
      simple: [
        { flavor: "グレープ", ratio: 70 },
        { flavor: "ミント", ratio: 30 }
      ],
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
      simple: [
        { flavor: "マンゴー", ratio: 60 },
        { flavor: "ミルク（練乳）", ratio: 20 },
        { flavor: "ミント", ratio: 20 }
      ],
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
      simple: [
        { flavor: "レモン", ratio: 40 },
        { flavor: "グレープフルーツ", ratio: 30 },
        { flavor: "ミント", ratio: 30 }
      ],
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
      simple: [
        { flavor: "ライチ", ratio: 60 },
        { flavor: "ローズ", ratio: 20 },
        { flavor: "ミント", ratio: 20 }
      ],
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
      simple: [
        { flavor: "グレープフルーツ", ratio: 50 },
        { flavor: "ジンジャー", ratio: 30 },
        { flavor: "ミント", ratio: 20 }
      ],
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
      simple: [
        { flavor: "チョコミント", ratio: 40 },
        { flavor: "バニラ", ratio: 30 },
        { flavor: "キャラメル", ratio: 30 }
      ],
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
      simple: [
        { flavor: "ブルーベリー", ratio: 40 },
        { flavor: "ヨーグルト", ratio: 30 },
        { flavor: "ラズベリー", ratio: 30 }
      ],
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
      simple: [
        { flavor: "アールグレイ", ratio: 50 },
        { flavor: "ミルク（練乳）", ratio: 30 },
        { flavor: "ハニー", ratio: 20 }
      ],
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
      simple: [
        { flavor: "キャラメル", ratio: 40 },
        { flavor: "シナモン", ratio: 30 },
        { flavor: "バニラ", ratio: 30 }
      ],
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
      simple: [
        { flavor: "バニラ", ratio: 40 },
        { flavor: "ピーチ", ratio: 30 },
        { flavor: "キャラメル", ratio: 30 }
      ],
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
      simple: [
        { flavor: "ミント", ratio: 60 },
        { flavor: "ペパーミント", ratio: 40 }
      ],
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
      simple: [
        { flavor: "モミの木", ratio: 40 },
        { flavor: "シダー（針葉樹）", ratio: 30 },
        { flavor: "バジル", ratio: 30 }
      ],
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
      simple: [
        { flavor: "レモン", ratio: 60 },
        { flavor: "ミント", ratio: 40 }
      ],
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
      simple: [
        { flavor: "コーラ", ratio: 60 },
        { flavor: "バニラ", ratio: 20 },
        { flavor: "ミント", ratio: 20 }
      ],
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
      simple: [
        { flavor: "コーラ", ratio: 50 },
        { flavor: "オレンジ", ratio: 30 },
        { flavor: "シナモン", ratio: 20 }
      ],
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
      simple: [
        { flavor: "アールグレイ（紅茶）", ratio: 50 },
        { flavor: "ピーチ", ratio: 30 },
        { flavor: "ミント", ratio: 20 }
      ],
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
      simple: [
        { flavor: "ダブルアップル", ratio: 80 },
        { flavor: "ミント", ratio: 20 }
      ],
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
      simple: [
        { flavor: "ダブルアップル", ratio: 70 },
        { flavor: "ミント", ratio: 30 }
      ],
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
      simple: [
        { flavor: "パンラズ", ratio: 60 },
        { flavor: "ミント", ratio: 25 },
        { flavor: "オレンジ", ratio: 15 }
      ],
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
      simple: [
        { flavor: "チャイ（シナモン・カルダモン）", ratio: 35 },
        { flavor: "ハニー", ratio: 30 },
        { flavor: "アニス", ratio: 25 },
        { flavor: "ウッディ系", ratio: 10 }
      ],
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
      simple: [
        { flavor: "モミの木", ratio: 35 },
        { flavor: "シダー（針葉樹）", ratio: 35 },
        { flavor: "チェリー", ratio: 30 }
      ],
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
      simple: [
        { flavor: "ザクロ", ratio: 35 },
        { flavor: "スイカ", ratio: 30 },
        { flavor: "ミント", ratio: 35 }
      ],
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
      simple: [
        { flavor: "ラズベリー", ratio: 35 },
        { flavor: "ブルーベリー", ratio: 35 },
        { flavor: "ミント", ratio: 30 }
      ],
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
      simple: [
        { flavor: "オレンジ", ratio: 35 },
        { flavor: "ライム", ratio: 35 },
        { flavor: "ミント", ratio: 30 }
      ],
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
      simple: [
        { flavor: "マンゴー", ratio: 30 },
        { flavor: "パイナップル", ratio: 30 },
        { flavor: "ミント", ratio: 20 },
        { flavor: "レモングラス", ratio: 20 }
      ],
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
      simple: [
        { flavor: "ブルーベリー", ratio: 40 },
        { flavor: "ラズベリー", ratio: 30 },
        { flavor: "キウイ", ratio: 30 }
      ],
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
      simple: [
        { flavor: "パッションフルーツ", ratio: 30 },
        { flavor: "メロン", ratio: 25 },
        { flavor: "マンゴー", ratio: 25 },
        { flavor: "ミント", ratio: 20 }
      ],
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
      simple: [
        { flavor: "メロン", ratio: 50 },
        { flavor: "ストロベリー", ratio: 30 },
        { flavor: "ミント", ratio: 20 }
      ],
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
      simple: [
        { flavor: "オレンジ", ratio: 50 },
        { flavor: "バニラ", ratio: 30 },
        { flavor: "ミント", ratio: 20 }
      ],
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
      simple: [
        { flavor: "グレープフルーツ", ratio: 40 },
        { flavor: "ラズベリー", ratio: 30 },
        { flavor: "ミント", ratio: 30 }
      ],
      items: [
        { flavor: "モスクワネバースリープス", brand: "Azure", leaf: "blonde", ratio: 40 },
        { flavor: "コスモス", brand: "Azure", leaf: "blonde", ratio: 30 },
        { flavor: "アラスカンアイス", brand: "Azure", leaf: "blonde", ratio: 30 }
      ],
      desc: "Azureのモスクワネバースリープス（フルーツ＋ミント）に、コスモス（グレフル＋ラズベリー）のほろ苦いベリー感と、アラスカンアイスのメンソール。夜更けに吸いたくなるスタイリッシュなブレンド。",
      tags: { taste: ["fresh", "both"], category: ["fruit", "mint"], mint: ["strong"], exp: ["sometimes", "regular"], dark: ["blonde_only", "either"], mood: ["refresh", "adventure"] }
    },

    // ── 玄人向けセッション（ダーク系・レイヤード技法） ──
    {
      name: "レイヤードグレープフルーツ",
      items: [
        { flavor: "グレープフルーツ", brand: "Al Fakher", leaf: "blonde", ratio: 60 },
        { flavor: "グレープフルーツ＆ポメロ", brand: "Element Earth", leaf: "dark", ratio: 25 },
        { flavor: "ミント", brand: "Al Fakher", leaf: "blonde", ratio: 15 }
      ],
      simple: [
        { flavor: "グレープフルーツ", ratio: 60 },
        { flavor: "グレープフルーツ（ダークリーフ）", ratio: 25 },
        { flavor: "ミント", ratio: 15 }
      ],
      desc: "ブロンドのグレープフルーツをベースに、ダークリーフのグレープフルーツを少量重ねる“レイヤード”技法。同じ柑橘でも葉の種類で表情が変わり、ほろ苦さと厚みが加わって奥行きのある一服に。玄人ならではの楽しみ方。",
      tags: { taste: ["fresh", "both"], category: ["citrus", "fruit"], mint: ["light"], exp: ["expert"], dark: ["dark_accent"], mood: ["adventure", "relax"] }
    },
    {
      name: "ダークチョコレートセッション",
      items: [
        { flavor: "ダークチョコレート", brand: "Darkside", leaf: "dark", ratio: 45 },
        { flavor: "ソルティキャラメル", brand: "Element Water", leaf: "dark", ratio: 30 },
        { flavor: "ケインミント", brand: "Tangiers Noir", leaf: "dark", ratio: 25 }
      ],
      simple: [
        { flavor: "ダークチョコレート", ratio: 45 },
        { flavor: "ソルティキャラメル", ratio: 30 },
        { flavor: "ミント", ratio: 25 }
      ],
      desc: "Darksideのビターなダークチョコレートを軸に、Elementの塩キャラメルで甘じょっぱさを足し、Tangiers Noirのケインミントで引き締める。濃厚なのに後味はクリア、じっくり長く楽しめる玄人向けの深夜セッション。",
      tags: { taste: ["sweet", "both"], category: ["dessert"], mint: ["light"], exp: ["expert"], dark: ["dark_main"], mood: ["relax", "adventure"] }
    },
    {
      name: "ダークコーヒーブリュレ",
      items: [
        { flavor: "コーヒー", brand: "Element Earth", leaf: "dark", ratio: 45 },
        { flavor: "ソルティキャラメル", brand: "Element Water", leaf: "dark", ratio: 30 },
        { flavor: "キラーミルク", brand: "Darkside", leaf: "dark", ratio: 25 }
      ],
      simple: [
        { flavor: "コーヒー", ratio: 45 },
        { flavor: "塩キャラメル", ratio: 30 },
        { flavor: "ミルク", ratio: 25 }
      ],
      desc: "Element Earthのコーヒーに塩キャラメルとDarksideのミルクを重ねた、濃厚ダークのクレームブリュレ風。香ばしいコーヒーの苦味とミルクの厚みが層になって広がる、ヘビーユーザー向けのデザートセッション。",
      tags: { taste: ["sweet", "both"], category: ["dessert", "drink"], mint: ["none"], exp: ["expert"], dark: ["dark_main"], mood: ["relax"] }
    },
    {
      name: "レイヤードピーチ",
      items: [
        { flavor: "ピーチ", brand: "Al Fakher", leaf: "blonde", ratio: 55 },
        { flavor: "ピーチアイスドティー", brand: "Tangiers Birquq", leaf: "dark", ratio: 30 },
        { flavor: "ケインミント", brand: "Tangiers Noir", leaf: "dark", ratio: 15 }
      ],
      simple: [
        { flavor: "ピーチ", ratio: 55 },
        { flavor: "ピーチティー（ダークリーフ）", ratio: 30 },
        { flavor: "ミント", ratio: 15 }
      ],
      desc: "ブロンドのジューシーなピーチを主役にして、Tangiersのピーチアイスドティーで紅茶のタンニンと凝縮感をレイヤー。同じ果実を葉違いで重ねる玄人技法で、果汁感と余韻の長さを両立させた一服。",
      tags: { taste: ["sweet", "fresh"], category: ["fruit"], mint: ["light"], exp: ["expert"], dark: ["dark_accent"], mood: ["relax", "adventure"] }
    },
    {
      name: "Noir カシミールセッション",
      items: [
        { flavor: "カシミールピーチ", brand: "Tangiers Noir", leaf: "dark", ratio: 45 },
        { flavor: "ココアジャヴァ", brand: "Tangiers Noir", leaf: "dark", ratio: 30 },
        { flavor: "ケインミント", brand: "Tangiers Noir", leaf: "dark", ratio: 25 }
      ],
      simple: [
        { flavor: "カシミールピーチ", ratio: 45 },
        { flavor: "ココアコーヒー", ratio: 30 },
        { flavor: "ミント", ratio: 25 }
      ],
      desc: "Tangiers Noirのみで組む重厚セッション。カシミールのスパイシーなピーチに、ココアジャヴァの香ばしさ、ケインミントの清涼感を重ねた、熱管理とセットアップにこだわりたい玄人向けの一服。",
      tags: { taste: ["both"], category: ["spice", "fruit", "dessert"], mint: ["light"], exp: ["expert"], dark: ["dark_main"], mood: ["adventure", "classic"] }
    },
    {
      name: "ディープベリー（レイヤード）",
      items: [
        { flavor: "ワイルドベリー", brand: "Darkside", leaf: "dark", ratio: 40 },
        { flavor: "ブルーベリー", brand: "Al Fakher", leaf: "blonde", ratio: 35 },
        { flavor: "ジェネリスラズベリー", brand: "Darkside", leaf: "dark", ratio: 25 }
      ],
      simple: [
        { flavor: "ワイルドベリー（ダークリーフ）", ratio: 40 },
        { flavor: "ブルーベリー", ratio: 35 },
        { flavor: "ラズベリー（ダークリーフ）", ratio: 25 }
      ],
      desc: "Darksideのワイルドベリーとラズベリーのダーク感に、Al Fakherのブルーベリーで果汁感を補強。濃厚でジャミーなベリーをダーク主体でじっくり味わう、玄人向けのリッチなベリーセッション。",
      tags: { taste: ["sweet"], category: ["fruit"], mint: ["none"], exp: ["expert"], dark: ["dark_main"], mood: ["relax"] }
    },
    {
      name: "シトラスブラスト ダーク",
      items: [
        { flavor: "カリーグレープフルーツ", brand: "Darkside", leaf: "dark", ratio: 40 },
        { flavor: "オレンジソーダ", brand: "Tangiers Noir", leaf: "dark", ratio: 30 },
        { flavor: "ケインミント", brand: "Tangiers Noir", leaf: "dark", ratio: 30 }
      ],
      simple: [
        { flavor: "グレープフルーツ（ダークリーフ）", ratio: 40 },
        { flavor: "オレンジソーダ（ダークリーフ）", ratio: 30 },
        { flavor: "ミント", ratio: 30 }
      ],
      desc: "Darksideのカリーグレープフルーツのほろ苦い柑橘に、Tangiers Noirのオレンジソーダで弾けるようなシトラス感を重ね、ケインミントで締める。ダーク主体でも爽快に攻めたい玄人向けのシトラスセッション。",
      tags: { taste: ["fresh"], category: ["citrus"], mint: ["strong"], exp: ["expert"], dark: ["dark_main"], mood: ["refresh", "adventure"] }
    },

    // ── 定番フレーバーの組み合わせ（フルーツ・スイーツ・ドリンク系） ──
    {
      name: "キウイストロベリー",
      items: [
        { flavor: "キウイ", brand: "Al Fakher", leaf: "blonde", ratio: 50 },
        { flavor: "ストロベリー", brand: "Al Fakher", leaf: "blonde", ratio: 30 },
        { flavor: "ミント", brand: "Al Fakher", leaf: "blonde", ratio: 20 }
      ],
      simple: [
        { flavor: "キウイ", ratio: 50 },
        { flavor: "ストロベリー", ratio: 30 },
        { flavor: "ミント", ratio: 20 }
      ],
      desc: "キウイの爽やかな酸味とストロベリーの甘さを合わせ、ミントで後味を整えたフレッシュなフルーツミックス。Al Fakherの定番3種だけで組めるので、初めてのお店でも頼みやすい構成です。",
      tags: { taste: ["sweet", "both", "fresh"], category: ["fruit"], mint: ["light"], exp: ["beginner", "sometimes"], dark: ["blonde_only", "either"], mood: ["refresh", "classic"] }
    },
    {
      name: "ピニャコラーダ",
      items: [
        { flavor: "パイナップル", brand: "Al Fakher", leaf: "blonde", ratio: 50 },
        { flavor: "ココナッツ", brand: "Adalya", leaf: "blonde", ratio: 30 },
        { flavor: "バニラ", brand: "Al Fakher", leaf: "blonde", ratio: 20 }
      ],
      simple: [
        { flavor: "パイナップル", ratio: 50 },
        { flavor: "ココナッツ", ratio: 30 },
        { flavor: "バニラ", ratio: 20 }
      ],
      desc: "パイナップルとココナッツにバニラのまろやかさを重ねた、有名なトロピカルカクテル「ピニャコラーダ」を再現したブレンド。リゾート気分を味わいたい時や、夏の夜の一服におすすめ。",
      tags: { taste: ["sweet"], category: ["fruit", "dessert"], mint: ["none"], exp: ["sometimes", "regular"], dark: ["blonde_only", "either"], mood: ["relax", "adventure"] }
    },
    {
      name: "アサイーボウル",
      items: [
        { flavor: "アサイー", brand: "Adalya", leaf: "blonde", ratio: 45 },
        { flavor: "ブルーベリー", brand: "Al Fakher", leaf: "blonde", ratio: 30 },
        { flavor: "ヨーグルト", brand: "Adalya", leaf: "blonde", ratio: 25 }
      ],
      simple: [
        { flavor: "アサイー", ratio: 45 },
        { flavor: "ブルーベリー", ratio: 30 },
        { flavor: "ヨーグルト", ratio: 25 }
      ],
      desc: "アサイーとブルーベリーのほろ酸っぱさにヨーグルトのまろやかさを重ねた、ハワイ発のヘルシーデザート「アサイーボウル」をイメージしたブレンド。朝のシーシャやデート向きの上品な甘さ。",
      tags: { taste: ["sweet", "both"], category: ["fruit", "dessert"], mint: ["none"], exp: ["sometimes", "regular"], dark: ["blonde_only", "either"], mood: ["relax", "adventure"] }
    },
    {
      name: "洋梨のタルト",
      items: [
        { flavor: "洋梨", brand: "Adalya", leaf: "blonde", ratio: 50 },
        { flavor: "バニラ", brand: "Al Fakher", leaf: "blonde", ratio: 30 },
        { flavor: "シナモン", brand: "Al Fakher", leaf: "blonde", ratio: 20 }
      ],
      simple: [
        { flavor: "洋梨", ratio: 50 },
        { flavor: "バニラ", ratio: 30 },
        { flavor: "シナモン", ratio: 20 }
      ],
      desc: "洋梨のジューシーな甘さにバニラのクリーミーさとシナモンの温かみを合わせた、焼き立ての洋梨タルトのようなデザートブレンド。秋冬の夜長やゆったりした午後にぴったりの上品な一杯。",
      tags: { taste: ["sweet"], category: ["fruit", "dessert", "spice"], mint: ["none"], exp: ["sometimes", "regular"], dark: ["blonde_only", "either"], mood: ["relax", "classic"] }
    },
    {
      name: "ブルーヘブンソーダ",
      items: [
        { flavor: "ブルーヘブン", brand: "Adalya", leaf: "blonde", ratio: 50 },
        { flavor: "ライム", brand: "Al Fakher", leaf: "blonde", ratio: 30 },
        { flavor: "ミント", brand: "Al Fakher", leaf: "blonde", ratio: 20 }
      ],
      simple: [
        { flavor: "ブルーヘブン", ratio: 50 },
        { flavor: "ライム", ratio: 30 },
        { flavor: "ミント", ratio: 20 }
      ],
      desc: "Adalyaの人気フレーバー「ブルーヘブン」のシトラス＆ベリー感に、ライムの酸味とミントの清涼感を加えた青空のような爽快ブレンド。SNS映えする色味も魅力で、女性人気の高い一杯。",
      tags: { taste: ["fresh", "both"], category: ["fruit", "citrus"], mint: ["light", "strong"], exp: ["sometimes", "regular"], dark: ["blonde_only", "either"], mood: ["refresh", "adventure"] }
    },
    {
      name: "グァバライムフィズ",
      items: [
        { flavor: "グァバ", brand: "Starbuzz", leaf: "blonde", ratio: 50 },
        { flavor: "ライム", brand: "Al Fakher", leaf: "blonde", ratio: 30 },
        { flavor: "ミント", brand: "Al Fakher", leaf: "blonde", ratio: 20 }
      ],
      simple: [
        { flavor: "グァバ", ratio: 50 },
        { flavor: "ライム", ratio: 30 },
        { flavor: "ミント", ratio: 20 }
      ],
      desc: "Starbuzzの南国フルーツ「グァバ」の甘酸っぱさに、ライムとミントを合わせたフレッシュフィズ。リフレッシュしたい昼下がりや、暑い季節にぴったりのトロピカルな爽快ブレンド。",
      tags: { taste: ["fresh", "both"], category: ["fruit", "citrus"], mint: ["light"], exp: ["sometimes", "regular"], dark: ["blonde_only", "either"], mood: ["refresh"] }
    },
    {
      name: "カシスオレンジ",
      items: [
        { flavor: "カシス", brand: "Adalya", leaf: "blonde", ratio: 50 },
        { flavor: "オレンジ", brand: "Al Fakher", leaf: "blonde", ratio: 30 },
        { flavor: "ライム", brand: "Al Fakher", leaf: "blonde", ratio: 20 }
      ],
      simple: [
        { flavor: "カシス", ratio: 50 },
        { flavor: "オレンジ", ratio: 30 },
        { flavor: "ライム", ratio: 20 }
      ],
      desc: "カシスの濃厚な甘酸っぱさとオレンジのジューシーさ、ライムの酸味でキリッと締めた、カクテル「カシスオレンジ」のようなブレンド。お酒を飲まない夜の代わりにも、女性人気の高い一杯。",
      tags: { taste: ["sweet", "both"], category: ["fruit", "citrus"], mint: ["none"], exp: ["sometimes", "regular"], dark: ["blonde_only", "either"], mood: ["relax", "refresh"] }
    },
    {
      name: "グリーンアップルクーラー",
      items: [
        { flavor: "グリーンアップル", brand: "Adalya", leaf: "blonde", ratio: 50 },
        { flavor: "ライム", brand: "Al Fakher", leaf: "blonde", ratio: 25 },
        { flavor: "ミント", brand: "Al Fakher", leaf: "blonde", ratio: 25 }
      ],
      simple: [
        { flavor: "グリーンアップル", ratio: 50 },
        { flavor: "ライム", ratio: 25 },
        { flavor: "ミント", ratio: 25 }
      ],
      desc: "青リンゴのシャキッとした酸味とライムの柑橘感、ミントの清涼感を組み合わせた緑系の爽快ブレンド。ダブルアップルの甘さが苦手な方や、さっぱり系を求める方におすすめ。",
      tags: { taste: ["fresh", "both"], category: ["fruit"], mint: ["light", "strong"], exp: ["beginner", "sometimes"], dark: ["blonde_only", "either"], mood: ["refresh", "classic"] }
    },
    {
      name: "ピーチヨーグルト",
      items: [
        { flavor: "ピーチ", brand: "Al Fakher", leaf: "blonde", ratio: 50 },
        { flavor: "ヨーグルト", brand: "Adalya", leaf: "blonde", ratio: 30 },
        { flavor: "ハニー", brand: "Al Fakher", leaf: "blonde", ratio: 20 }
      ],
      simple: [
        { flavor: "ピーチ", ratio: 50 },
        { flavor: "ヨーグルト", ratio: 30 },
        { flavor: "ハニー", ratio: 20 }
      ],
      desc: "桃のジューシーな甘さにヨーグルトのまろやかな酸味とハニーの自然な甘さを重ねた、まるで朝食のフルーツヨーグルトのような優しいブレンド。シーシャ初心者にもおすすめのデザート系。",
      tags: { taste: ["sweet"], category: ["fruit", "dessert"], mint: ["none"], exp: ["beginner", "sometimes", "regular"], dark: ["blonde_only", "either"], mood: ["relax", "classic"] }
    },
    {
      name: "ベルガモットアップル",
      items: [
        { flavor: "アップル", brand: "Al Fakher", leaf: "blonde", ratio: 50 },
        { flavor: "ベルガモット", brand: "Adalya", leaf: "blonde", ratio: 30 },
        { flavor: "シナモン", brand: "Al Fakher", leaf: "blonde", ratio: 20 }
      ],
      simple: [
        { flavor: "アップル", ratio: 50 },
        { flavor: "ベルガモット", ratio: 30 },
        { flavor: "シナモン", ratio: 20 }
      ],
      desc: "りんごの甘酸っぱさとベルガモットの華やかなアールグレイ的香り、シナモンの温かみを合わせた、アップルパイとアールグレイを同時に楽しむような上品なブレンド。",
      tags: { taste: ["sweet", "both"], category: ["fruit", "drink", "spice"], mint: ["none"], exp: ["sometimes", "regular"], dark: ["blonde_only", "either"], mood: ["relax", "classic"] }
    },
    {
      name: "ロイヤルミルクティー",
      items: [
        { flavor: "ロイヤルティー", brand: "Adalya", leaf: "blonde", ratio: 50 },
        { flavor: "ミルク", brand: "Adalya", leaf: "blonde", ratio: 30 },
        { flavor: "バニラ", brand: "Al Fakher", leaf: "blonde", ratio: 20 }
      ],
      simple: [
        { flavor: "ロイヤルティー", ratio: 50 },
        { flavor: "ミルク", ratio: 30 },
        { flavor: "バニラ", ratio: 20 }
      ],
      desc: "ロイヤルティーの華やかな紅茶感にミルクのコクとバニラの甘さを重ねた、英国式ロイヤルミルクティーをそのまま再現したブレンド。読書やゆったりした午後にぴったりの定番ドリンク系。",
      tags: { taste: ["sweet"], category: ["drink", "dessert"], mint: ["none"], exp: ["sometimes", "regular"], dark: ["blonde_only", "either"], mood: ["relax", "classic"] }
    },
    {
      name: "ジャスミンライチ",
      items: [
        { flavor: "ジャスミン", brand: "Adalya", leaf: "blonde", ratio: 45 },
        { flavor: "ライチ", brand: "Adalya", leaf: "blonde", ratio: 35 },
        { flavor: "ローズ", brand: "Azure", leaf: "blonde", ratio: 20 }
      ],
      simple: [
        { flavor: "ジャスミン", ratio: 45 },
        { flavor: "ライチ", ratio: 35 },
        { flavor: "ローズ", ratio: 20 }
      ],
      desc: "ジャスミンとローズのフローラルな香りに、ライチの繊細な甘みを合わせた、中華料理店のジャスミン茶を思わせる華やかなブレンド。エレガントな雰囲気を楽しみたい時にぴったり。",
      tags: { taste: ["sweet", "both"], category: ["citrus", "drink"], mint: ["none"], exp: ["sometimes", "regular"], dark: ["blonde_only", "either"], mood: ["relax", "adventure"] }
    },
    {
      name: "ティラミスマキアート",
      items: [
        { flavor: "ティラミス", brand: "Adalya", leaf: "blonde", ratio: 50 },
        { flavor: "チョコレート", brand: "Adalya", leaf: "blonde", ratio: 30 },
        { flavor: "ミルク", brand: "Adalya", leaf: "blonde", ratio: 20 }
      ],
      simple: [
        { flavor: "ティラミス", ratio: 50 },
        { flavor: "チョコレート", ratio: 30 },
        { flavor: "ミルク", ratio: 20 }
      ],
      desc: "Adalyaの濃厚なティラミスにチョコレートのビターさとミルクのまろやかさを重ねた、イタリアンカフェのようなデザートブレンド。甘いもの好きや、食後のシーシャにぴったりの一杯。",
      tags: { taste: ["sweet"], category: ["dessert", "drink"], mint: ["none"], exp: ["sometimes", "regular"], dark: ["blonde_only", "either"], mood: ["relax", "classic"] }
    },
    {
      name: "チョコキャラメル",
      items: [
        { flavor: "チョコレート", brand: "Adalya", leaf: "blonde", ratio: 45 },
        { flavor: "キャラメル", brand: "Fumari", leaf: "blonde", ratio: 30 },
        { flavor: "バニラ", brand: "Al Fakher", leaf: "blonde", ratio: 25 }
      ],
      simple: [
        { flavor: "チョコレート", ratio: 45 },
        { flavor: "キャラメル", ratio: 30 },
        { flavor: "バニラ", ratio: 25 }
      ],
      desc: "濃厚チョコレートに塩キャラメルの甘さとバニラのまろやかさを重ねた、王道のスイーツ系ブレンド。デザートシーシャの定番として、甘いもの好きの方や寒い夜のリラックスタイムにおすすめ。",
      tags: { taste: ["sweet"], category: ["dessert"], mint: ["none"], exp: ["sometimes", "regular"], dark: ["blonde_only", "either"], mood: ["relax", "classic"] }
    },

    {
      name: "クレームブリュレ",
      items: [
        { flavor: "キャラメル", brand: "Fumari", leaf: "blonde", ratio: 45 },
        { flavor: "バニラ", brand: "Adalya", leaf: "blonde", ratio: 30 },
        { flavor: "ミルク", brand: "Adalya", leaf: "blonde", ratio: 25 }
      ],
      simple: [
        { flavor: "キャラメル", ratio: 45 },
        { flavor: "バニラ", ratio: 30 },
        { flavor: "ミルク", ratio: 25 }
      ],
      desc: "焦がしキャラメルの香ばしい甘さに、バニラとミルクのまろやかさを重ねた、フレンチデザート「クレームブリュレ」のような濃厚スイーツブレンド。食後のシーシャや、甘いもの好きの方にぴったり。",
      tags: { taste: ["sweet"], category: ["dessert"], mint: ["none"], exp: ["sometimes", "regular"], dark: ["blonde_only", "either"], mood: ["relax", "classic"] }
    },

    // ── 初心者向けベーシックレシピ（定番ブランド構成・簡易版でも注文可） ──
    {
      name: "ピーチミント",
      items: [
        { flavor: "ピーチ", brand: "Al Fakher", leaf: "blonde", ratio: 70 },
        { flavor: "ミント", brand: "Al Fakher", leaf: "blonde", ratio: 30 }
      ],
      simple: [
        { flavor: "ピーチ", ratio: 70 },
        { flavor: "ミント", ratio: 30 }
      ],
      desc: "桃の優しい甘さとミントの爽やかさだけを組み合わせた、シーシャ初体験の方でもクセなく楽しめる親しみやすい一杯。Al Fakherの定番2種で構成されているので、ほとんどのお店で頼めます。銘柄指定なしでもシンプルに注文できます。",
      tags: { taste: ["sweet", "both"], category: ["fruit"], mint: ["light"], exp: ["beginner", "sometimes"], dark: ["blonde_only", "either"], mood: ["relax", "classic"] }
    },
    {
      name: "レモンスカッシュ",
      items: [
        { flavor: "レモン", brand: "Al Fakher", leaf: "blonde", ratio: 50 },
        { flavor: "ライム", brand: "Al Fakher", leaf: "blonde", ratio: 30 },
        { flavor: "ミント", brand: "Al Fakher", leaf: "blonde", ratio: 20 }
      ],
      simple: [
        { flavor: "レモン", ratio: 50 },
        { flavor: "ライム", ratio: 30 },
        { flavor: "ミント", ratio: 20 }
      ],
      desc: "レモンとライムの酸味にミントを少しだけ効かせた、レモンスカッシュのような爽やかブレンド。柑橘の鮮やかさを楽しみたい方や、リフレッシュしたい気分の日にぴったり。Al Fakherの定番フレーバーだけで組めるので、初めてのお店でも注文しやすい構成です。",
      tags: { taste: ["fresh"], category: ["citrus"], mint: ["light", "strong"], exp: ["beginner", "sometimes"], dark: ["blonde_only", "either"], mood: ["refresh"] }
    },
    {
      name: "メロンクリームソーダ",
      items: [
        { flavor: "メロン", brand: "Al Fakher", leaf: "blonde", ratio: 60 },
        { flavor: "バニラ", brand: "Al Fakher", leaf: "blonde", ratio: 25 },
        { flavor: "ミント", brand: "Al Fakher", leaf: "blonde", ratio: 15 }
      ],
      simple: [
        { flavor: "メロン", ratio: 60 },
        { flavor: "バニラ", ratio: 25 },
        { flavor: "ミント", ratio: 15 }
      ],
      desc: "甘いメロンにバニラのクリーミーさを重ね、ミントで軽やかに仕上げた、まるでメロンクリームソーダのようなデザートブレンド。甘いものが好きな方や女性に特に人気の組み合わせ。Al Fakherの定番3種で再現でき、店員さんにも伝えやすい構成です。",
      tags: { taste: ["sweet"], category: ["fruit", "dessert"], mint: ["none", "light"], exp: ["beginner", "sometimes"], dark: ["blonde_only", "either"], mood: ["relax", "classic"] }
    },
    {
      name: "グレープティー",
      items: [
        { flavor: "グレープ", brand: "Al Fakher", leaf: "blonde", ratio: 50 },
        { flavor: "アールグレイ", brand: "Fumari", leaf: "blonde", ratio: 35 },
        { flavor: "ミント", brand: "Al Fakher", leaf: "blonde", ratio: 15 }
      ],
      simple: [
        { flavor: "グレープ", ratio: 50 },
        { flavor: "アールグレイ（紅茶）", ratio: 35 },
        { flavor: "ミント", ratio: 15 }
      ],
      desc: "葡萄の甘酸っぱさと紅茶の華やかな香りを合わせた、上品なドリンク系ブレンド。読書やゆったりした会話を楽しみたいリラックスタイムにおすすめ。定番のAl FakherとFumariの紅茶フレーバーで組める飲みやすい一杯。",
      tags: { taste: ["sweet", "both"], category: ["fruit", "drink"], mint: ["none", "light"], exp: ["beginner", "sometimes"], dark: ["blonde_only", "either"], mood: ["relax", "classic"] }
    },
    {
      name: "ハニーアップル",
      items: [
        { flavor: "アップル", brand: "Al Fakher", leaf: "blonde", ratio: 60 },
        { flavor: "ハニー", brand: "Al Fakher", leaf: "blonde", ratio: 25 },
        { flavor: "シナモン", brand: "Al Fakher", leaf: "blonde", ratio: 15 }
      ],
      simple: [
        { flavor: "アップル", ratio: 60 },
        { flavor: "ハニー", ratio: 25 },
        { flavor: "シナモン", ratio: 15 }
      ],
      desc: "りんごの甘酸っぱさにハニーの濃厚な甘さとシナモンの温かみを足した、アップルパイを思わせる温かみのあるブレンド。秋冬や、ゆったりと甘さを楽しみたい時間にぴったり。Al Fakherの定番3種だけで組めるシンプル構成です。",
      tags: { taste: ["sweet"], category: ["fruit", "spice", "dessert"], mint: ["none"], exp: ["beginner", "sometimes"], dark: ["blonde_only", "either"], mood: ["relax", "classic"] }
    },
    {
      name: "南国ミックスジュース",
      items: [
        { flavor: "マンゴー", brand: "Al Fakher", leaf: "blonde", ratio: 40 },
        { flavor: "パイナップル", brand: "Al Fakher", leaf: "blonde", ratio: 30 },
        { flavor: "オレンジ", brand: "Al Fakher", leaf: "blonde", ratio: 20 },
        { flavor: "ミント", brand: "Al Fakher", leaf: "blonde", ratio: 10 }
      ],
      simple: [
        { flavor: "マンゴー", ratio: 40 },
        { flavor: "パイナップル", ratio: 30 },
        { flavor: "オレンジ", ratio: 20 },
        { flavor: "ミント", ratio: 10 }
      ],
      desc: "南国フルーツのマンゴー・パイナップル・オレンジを集めて、ミントを少しだけ加えたフレッシュジュースのようなブレンド。トロピカルで甘い味が好きな方におすすめ。Al Fakherの定番フルーツ4種だけで組めます。",
      tags: { taste: ["sweet", "both"], category: ["fruit", "citrus"], mint: ["none", "light"], exp: ["beginner", "sometimes"], dark: ["blonde_only", "either"], mood: ["relax", "refresh"] }
    },

    // ── 和テイスト（日本のカフェ・スイーツをイメージした和ブレンド） ──
    {
      name: "抹茶ラテ",
      items: [
        { flavor: "抹茶", brand: "Chabacco", leaf: "blonde", ratio: 50 },
        { flavor: "ミルク", brand: "Adalya", leaf: "blonde", ratio: 30 },
        { flavor: "バニラ", brand: "Al Fakher", leaf: "blonde", ratio: 20 }
      ],
      simple: [
        { flavor: "抹茶", ratio: 50 },
        { flavor: "ミルク", ratio: 30 },
        { flavor: "バニラ", ratio: 20 }
      ],
      desc: "ほろ苦い抹茶にまろやかなミルクとバニラの甘さを重ねた、和カフェの抹茶ラテをそのまま再現した一杯。Chabaccoの本格的な抹茶感が魅力で、和スイーツ好きの方やデートにもぴったり。",
      tags: { taste: ["sweet", "both"], category: ["drink", "dessert"], mint: ["none"], exp: ["sometimes", "regular"], dark: ["blonde_only", "either"], mood: ["relax", "classic"] }
    },
    {
      name: "ゆず煎茶",
      items: [
        { flavor: "ゆず", brand: "Chabacco", leaf: "blonde", ratio: 50 },
        { flavor: "緑茶", brand: "Chabacco", leaf: "blonde", ratio: 30 },
        { flavor: "ハニー", brand: "Al Fakher", leaf: "blonde", ratio: 20 }
      ],
      simple: [
        { flavor: "ゆず", ratio: 50 },
        { flavor: "緑茶", ratio: 30 },
        { flavor: "ハニー", ratio: 20 }
      ],
      desc: "ゆずの爽やかな酸味と緑茶の渋み、ハニーの優しい甘さを合わせた、お茶屋さんの一服のような上品な和ブレンド。冬の柚子湯やお茶の時間を思い起こさせる、落ち着いた大人向けの一杯。",
      tags: { taste: ["fresh", "both"], category: ["citrus", "drink"], mint: ["none"], exp: ["sometimes", "regular"], dark: ["blonde_only", "either"], mood: ["relax", "classic"] }
    },
    {
      name: "桜ミルクティー",
      items: [
        { flavor: "桜", brand: "Chabacco", leaf: "blonde", ratio: 45 },
        { flavor: "ロイヤルティー", brand: "Adalya", leaf: "blonde", ratio: 35 },
        { flavor: "ミルク", brand: "Adalya", leaf: "blonde", ratio: 20 }
      ],
      simple: [
        { flavor: "桜", ratio: 45 },
        { flavor: "ロイヤルティー", ratio: 35 },
        { flavor: "ミルク", ratio: 20 }
      ],
      desc: "桜のほんのり華やかな香りとロイヤルティーの紅茶感、ミルクのまろやかさが合わさった、春を感じる和スイーツのような一杯。お花見気分や春のデートシーズンに特におすすめ。",
      tags: { taste: ["sweet"], category: ["dessert", "drink"], mint: ["none"], exp: ["sometimes", "regular"], dark: ["blonde_only", "either"], mood: ["relax", "classic"] }
    },
    {
      name: "ほうじ茶キャラメル",
      items: [
        { flavor: "ほうじ茶", brand: "Chabacco", leaf: "blonde", ratio: 50 },
        { flavor: "キャラメル", brand: "Fumari", leaf: "blonde", ratio: 30 },
        { flavor: "ミルク", brand: "Adalya", leaf: "blonde", ratio: 20 }
      ],
      simple: [
        { flavor: "ほうじ茶", ratio: 50 },
        { flavor: "キャラメル", ratio: 30 },
        { flavor: "ミルク", ratio: 20 }
      ],
      desc: "ほうじ茶の香ばしさにキャラメルの濃厚な甘さとミルクのコクを合わせた、秋冬にぴったりの温かみのある和ブレンド。和カフェのほうじ茶ラテのようなくつろぎ感が魅力。",
      tags: { taste: ["sweet"], category: ["dessert", "drink"], mint: ["none"], exp: ["sometimes", "regular"], dark: ["blonde_only", "either"], mood: ["relax", "classic"] }
    },
    {
      name: "梅ジャスミン",
      items: [
        { flavor: "梅", brand: "Chabacco", leaf: "blonde", ratio: 45 },
        { flavor: "ジャスミン", brand: "Adalya", leaf: "blonde", ratio: 35 },
        { flavor: "ハニー", brand: "Al Fakher", leaf: "blonde", ratio: 20 }
      ],
      simple: [
        { flavor: "梅", ratio: 45 },
        { flavor: "ジャスミン", ratio: 35 },
        { flavor: "ハニー", ratio: 20 }
      ],
      desc: "梅の甘酸っぱさとジャスミンの華やかな香り、ハニーの自然な甘さを合わせた、和カフェやお茶屋さんの一服のような上品なブレンド。さっぱりしながらも深みのある、大人向けの和テイスト。",
      tags: { taste: ["fresh", "both"], category: ["fruit", "drink"], mint: ["none"], exp: ["sometimes", "regular"], dark: ["blonde_only", "either"], mood: ["relax", "classic"] }
    },
    {
      name: "黒糖ミルク",
      items: [
        { flavor: "黒糖", brand: "Chabacco", leaf: "blonde", ratio: 45 },
        { flavor: "ミルク", brand: "Adalya", leaf: "blonde", ratio: 35 },
        { flavor: "シナモン", brand: "Al Fakher", leaf: "blonde", ratio: 20 }
      ],
      simple: [
        { flavor: "黒糖", ratio: 45 },
        { flavor: "ミルク", ratio: 35 },
        { flavor: "シナモン", ratio: 20 }
      ],
      desc: "沖縄の黒糖を思わせる深い甘さに、ミルクのコクとシナモンのスパイシーさを足した、温かみのある和スイーツ系ブレンド。寒い夜や、コーヒーブレイクの代わりに楽しみたい一杯。",
      tags: { taste: ["sweet"], category: ["dessert", "spice"], mint: ["none"], exp: ["sometimes", "regular"], dark: ["blonde_only", "either"], mood: ["relax", "classic"] }
    },
    {
      name: "和栗モンブラン",
      items: [
        { flavor: "栗", brand: "Chabacco", leaf: "blonde", ratio: 45 },
        { flavor: "バニラ", brand: "Al Fakher", leaf: "blonde", ratio: 30 },
        { flavor: "ミルク", brand: "Adalya", leaf: "blonde", ratio: 25 }
      ],
      simple: [
        { flavor: "栗", ratio: 45 },
        { flavor: "バニラ", ratio: 30 },
        { flavor: "ミルク", ratio: 25 }
      ],
      desc: "栗の素朴な甘さにバニラとミルクのクリーミーさを重ねた、和栗モンブランをそのままシーシャにしたようなデザートブレンド。秋の味覚を楽しみたい方や、女性に特に喜ばれる一杯。",
      tags: { taste: ["sweet"], category: ["dessert"], mint: ["none"], exp: ["sometimes", "regular"], dark: ["blonde_only", "either"], mood: ["relax", "classic"] }
    },
    {
      name: "ラムネソーダ",
      items: [
        { flavor: "ラムネ", brand: "Chabacco", leaf: "blonde", ratio: 50 },
        { flavor: "ライム", brand: "Al Fakher", leaf: "blonde", ratio: 25 },
        { flavor: "ミント", brand: "Al Fakher", leaf: "blonde", ratio: 25 }
      ],
      simple: [
        { flavor: "ラムネ", ratio: 50 },
        { flavor: "ライム", ratio: 25 },
        { flavor: "ミント", ratio: 25 }
      ],
      desc: "夏祭りのラムネ瓶を思わせる懐かしい炭酸感に、ライムの爽やかさとミントの清涼感を合わせた、夏の縁側のような爽快ブレンド。爽やか系が好きな方や、夏のリフレッシュにおすすめ。",
      tags: { taste: ["fresh", "both"], category: ["fruit", "drink"], mint: ["light", "strong"], exp: ["beginner", "sometimes"], dark: ["blonde_only", "either"], mood: ["refresh", "classic"] }
    },

    {
      name: "いちごミルク",
      items: [
        { flavor: "ストロベリー", brand: "Al Fakher", leaf: "blonde", ratio: 60 },
        { flavor: "ミルク", brand: "Adalya", leaf: "blonde", ratio: 25 },
        { flavor: "バニラ", brand: "Al Fakher", leaf: "blonde", ratio: 15 }
      ],
      simple: [
        { flavor: "ストロベリー", ratio: 60 },
        { flavor: "ミルク", ratio: 25 },
        { flavor: "バニラ", ratio: 15 }
      ],
      desc: "いちごとミルクの黄金コンビにバニラの甘い香りを重ねた、和カフェの定番ドリンク「いちごミルク」をそのまま再現したブレンド。甘党や女性、初心者にも特に人気の親しみやすい一杯。",
      tags: { taste: ["sweet"], category: ["dessert", "fruit"], mint: ["none"], exp: ["beginner", "sometimes"], dark: ["blonde_only", "either"], mood: ["relax", "classic"] }
    },
    {
      name: "抹茶あずき",
      items: [
        { flavor: "抹茶", brand: "Chabacco", leaf: "blonde", ratio: 50 },
        { flavor: "あずき", brand: "Chabacco", leaf: "blonde", ratio: 30 },
        { flavor: "ミルク", brand: "Adalya", leaf: "blonde", ratio: 20 }
      ],
      simple: [
        { flavor: "抹茶", ratio: 50 },
        { flavor: "あずき", ratio: 30 },
        { flavor: "ミルク", ratio: 20 }
      ],
      desc: "ほろ苦い抹茶にあずきの素朴な甘さ、ミルクのまろやかさを重ねた、和カフェの抹茶あずきパフェのような濃厚な和スイーツブレンド。和菓子好きの方や、落ち着いた時間に特におすすめ。",
      tags: { taste: ["sweet"], category: ["dessert", "drink"], mint: ["none"], exp: ["sometimes", "regular"], dark: ["blonde_only", "either"], mood: ["relax", "classic"] }
    },
    {
      name: "カルピスフィズ",
      items: [
        { flavor: "ヨーグルト", brand: "Adalya", leaf: "blonde", ratio: 50 },
        { flavor: "ライム", brand: "Al Fakher", leaf: "blonde", ratio: 30 },
        { flavor: "ハニー", brand: "Al Fakher", leaf: "blonde", ratio: 20 }
      ],
      simple: [
        { flavor: "ヨーグルト", ratio: 50 },
        { flavor: "ライム", ratio: 30 },
        { flavor: "ハニー", ratio: 20 }
      ],
      desc: "ヨーグルトのまろやかな酸味とライムの爽やかさ、ハニーの優しい甘さを合わせた、日本の乳酸菌飲料「カルピスソーダ」を思わせる爽やか系ブレンド。夏の暑い日や、甘さ控えめを求める方にぴったり。",
      tags: { taste: ["sweet", "fresh", "both"], category: ["drink", "fruit"], mint: ["none"], exp: ["beginner", "sometimes"], dark: ["blonde_only", "either"], mood: ["refresh", "classic"] }
    },
    {
      name: "きな粉黒蜜",
      items: [
        { flavor: "きな粉", brand: "Chabacco", leaf: "blonde", ratio: 45 },
        { flavor: "黒糖", brand: "Chabacco", leaf: "blonde", ratio: 30 },
        { flavor: "バニラ", brand: "Al Fakher", leaf: "blonde", ratio: 25 }
      ],
      simple: [
        { flavor: "きな粉", ratio: 45 },
        { flavor: "黒糖", ratio: 30 },
        { flavor: "バニラ", ratio: 25 }
      ],
      desc: "きな粉の香ばしさに黒蜜の濃い甘さ、バニラのやさしさを重ねた、和パフェやわらび餅のような和スイーツブレンド。日本らしい素朴な甘さを楽しみたい時や、和菓子好きの方におすすめの一杯。",
      tags: { taste: ["sweet"], category: ["dessert"], mint: ["none"], exp: ["sometimes", "regular"], dark: ["blonde_only", "either"], mood: ["relax", "classic"] }
    },
    {
      name: "みたらし団子",
      items: [
        { flavor: "キャラメル", brand: "Fumari", leaf: "blonde", ratio: 40 },
        { flavor: "黒糖", brand: "Chabacco", leaf: "blonde", ratio: 35 },
        { flavor: "ミルク", brand: "Adalya", leaf: "blonde", ratio: 25 }
      ],
      simple: [
        { flavor: "キャラメル", ratio: 40 },
        { flavor: "黒糖", ratio: 35 },
        { flavor: "ミルク", ratio: 25 }
      ],
      desc: "キャラメルの香ばしさと黒糖のコクある甘さ、ミルクのまろやかさが醤油ダレを思わせる、和菓子「みたらし団子」をイメージしたブレンド。お団子屋さんの縁側で食べるような懐かしい味わい。",
      tags: { taste: ["sweet"], category: ["dessert"], mint: ["none"], exp: ["sometimes", "regular"], dark: ["blonde_only", "either"], mood: ["relax", "classic"] }
    },
    {
      name: "抹茶チョコパフェ",
      items: [
        { flavor: "抹茶", brand: "Chabacco", leaf: "blonde", ratio: 45 },
        { flavor: "チョコレート", brand: "Adalya", leaf: "blonde", ratio: 35 },
        { flavor: "ミルク", brand: "Adalya", leaf: "blonde", ratio: 20 }
      ],
      simple: [
        { flavor: "抹茶", ratio: 45 },
        { flavor: "チョコレート", ratio: 35 },
        { flavor: "ミルク", ratio: 20 }
      ],
      desc: "抹茶のほろ苦さに濃厚チョコレートとミルクのまろやかさを重ねた、和カフェの「抹茶チョコパフェ」のような濃厚デザートブレンド。抹茶スイーツ好きにはたまらない、贅沢な一杯。",
      tags: { taste: ["sweet"], category: ["dessert", "drink"], mint: ["none"], exp: ["sometimes", "regular"], dark: ["blonde_only", "either"], mood: ["relax", "classic"] }
    },

    // ── ノンニコチン ──
    {
      name: "ノンニコチン フルーツミックス",
      nonNicotine: true,
      items: [
        { flavor: "ミックスベリー", leaf: "herbal", ratio: 50 },
        { flavor: "ピーチ", leaf: "herbal", ratio: 30 },
        { flavor: "ミント", leaf: "herbal", ratio: 20 }
      ],
      desc: "ノンニコチンのハーブベースで、ベリーの甘酸っぱさと桃のジューシーさをミントで爽やかにまとめた定番ブレンド。ニコチンが苦手な方でも安心して楽しめ、お酒やお茶と合わせてゆったりしたいシーンにぴったりです。",
      tags: { taste: ["sweet", "both"], category: ["fruit"], mint: ["light"], exp: ["beginner", "sometimes", "regular"], mood: ["relax", "classic"] }
    },
    {
      name: "ノンニコチン シトラスクール",
      nonNicotine: true,
      items: [
        { flavor: "レモン", leaf: "herbal", ratio: 40 },
        { flavor: "グレープフルーツ", leaf: "herbal", ratio: 30 },
        { flavor: "ペパーミント", leaf: "herbal", ratio: 30 }
      ],
      desc: "ノンニコチンで楽しむキリッとした柑橘系ブレンド。レモンとグレープフルーツの酸味にペパーミントの清涼感を重ね、食後のリフレッシュや気分転換にぴったり。ニコチン感なしでもしっかり爽快。",
      tags: { taste: ["fresh"], category: ["citrus", "mint"], mint: ["strong"], exp: ["beginner", "sometimes", "regular"], mood: ["refresh"] }
    },
    {
      name: "ノンニコチン ピーチティー",
      nonNicotine: true,
      items: [
        { flavor: "ピーチ", leaf: "herbal", ratio: 60 },
        { flavor: "アールグレイ", leaf: "herbal", ratio: 30 },
        { flavor: "ミント", leaf: "herbal", ratio: 10 }
      ],
      desc: "桃と紅茶の優しい甘さにミントをほんの少し効かせた、ノンニコチンの紅茶系ブレンド。甘さ控えめでまろやかな味わい、読書やおしゃべりを楽しむリラックスタイムにおすすめの一杯。",
      tags: { taste: ["sweet", "both"], category: ["fruit", "drink"], mint: ["none", "light"], exp: ["beginner", "sometimes", "regular"], mood: ["relax", "classic"] }
    },
    {
      name: "ノンニコチン トロピカルクール",
      nonNicotine: true,
      items: [
        { flavor: "マンゴー", leaf: "herbal", ratio: 45 },
        { flavor: "パッションフルーツ", leaf: "herbal", ratio: 30 },
        { flavor: "ミント", leaf: "herbal", ratio: 25 }
      ],
      desc: "ノンニコチンで楽しむ南国フルーツブレンド。マンゴーの濃厚な甘さとパッションフルーツの爽やかな酸味をミントで引き締めた、夏場やリフレッシュしたい気分の日にぴったりの一杯。",
      tags: { taste: ["sweet", "both"], category: ["fruit"], mint: ["light", "strong"], exp: ["beginner", "sometimes", "regular"], mood: ["refresh", "relax"] }
    },
    {
      name: "ノンニコチン アップルミント",
      nonNicotine: true,
      items: [
        { flavor: "アップル", leaf: "herbal", ratio: 60 },
        { flavor: "ミント", leaf: "herbal", ratio: 40 }
      ],
      desc: "ノンニコチンで楽しむ定番のダブルアップル風ブレンド。りんごの甘酸っぱさとミントの爽やかさのシンプルな組み合わせで、シーシャ初体験の方やノンニコチン入門にもおすすめ。",
      tags: { taste: ["both", "fresh"], category: ["fruit"], mint: ["light", "strong"], exp: ["beginner", "sometimes"], mood: ["classic", "refresh"] }
    },
    {
      name: "ノンニコチン グレープライム",
      nonNicotine: true,
      items: [
        { flavor: "グレープ", leaf: "herbal", ratio: 50 },
        { flavor: "ライム", leaf: "herbal", ratio: 30 },
        { flavor: "ミント", leaf: "herbal", ratio: 20 }
      ],
      desc: "ノンニコチンで楽しむ葡萄とライムの爽やかフルーツブレンド。グレープの甘さにライムの酸味とミントの清涼感を添えた、夏場やリフレッシュしたい日に嬉しい軽やかな一杯。",
      tags: { taste: ["fresh", "both"], category: ["fruit", "citrus"], mint: ["light"], exp: ["beginner", "sometimes", "regular"], mood: ["refresh", "classic"] }
    },
    {
      name: "ノンニコチン ベリーヨーグルト",
      nonNicotine: true,
      items: [
        { flavor: "ブルーベリー", leaf: "herbal", ratio: 50 },
        { flavor: "ヨーグルト", leaf: "herbal", ratio: 30 },
        { flavor: "ハニー", leaf: "herbal", ratio: 20 }
      ],
      desc: "ノンニコチンで楽しむブルーベリーとヨーグルトの優しい組み合わせにハニーの甘さを添えた、朝食にも似合うヘルシーなデザートブレンド。甘さ控えめでまろやかな味わい。",
      tags: { taste: ["sweet"], category: ["fruit", "dessert"], mint: ["none"], exp: ["beginner", "sometimes", "regular"], mood: ["relax", "classic"] }
    },
    {
      name: "ノンニコチン アップルシナモン",
      nonNicotine: true,
      items: [
        { flavor: "アップル", leaf: "herbal", ratio: 60 },
        { flavor: "シナモン", leaf: "herbal", ratio: 25 },
        { flavor: "ハニー", leaf: "herbal", ratio: 15 }
      ],
      desc: "ノンニコチンで楽しむアップルパイ風ブレンド。りんごの甘酸っぱさとシナモンの温かみ、ハニーの自然な甘さが調和した、秋冬やゆったりしたリラックスタイムにぴったりの一杯。",
      tags: { taste: ["sweet"], category: ["fruit", "spice", "dessert"], mint: ["none"], exp: ["beginner", "sometimes", "regular"], mood: ["relax", "classic"] }
    }
  ];

  /* ─── UI ─── */

  function createLunaMsgAvatar() {
    var wrap = document.createElement("div");
    wrap.className = "sommelier-msg-avatar";
    wrap.setAttribute("aria-hidden", "true");
    var img = document.createElement("img");
    img.className = "sommelier-msg-avatar-img";
    img.src = "images/sommelier-avatar-sm.webp";
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
    /* 選択肢の数に応じてPC側の列数を切り替える（2x2, 1x3, 2x3 などきれいに揃うように）
       2 → 2列, 3 → 3列, 4 → 2列(2x2), 5/6 → 3列。モバイルは別途2列固定 */
    var n = items.length;
    var cols;
    if (n <= 2) cols = 2;
    else if (n === 3) cols = 3;
    else if (n === 4) cols = 2;
    else cols = 3;
    choicesEl.style.setProperty("--sommelier-choice-cols", String(cols));
    items.forEach(function (c) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "sommelier-choice-btn";
      btn.textContent = c.label;
      btn.dataset.choiceId = c.id;
      choicesEl.appendChild(btn);
    });
    /* 選択肢ボタン追加で .sommelier-chat 内の Flex レイアウトが再計算され、
       .sommelier-messages の clientHeight が縮む。直前の addMessage の scrollTo
       は古い maxScroll を基準にしていたため、最新の bot 質問が下に隠れる。
       ここで再度末尾へスクロールして最新メッセージを表示領域内に押し込む */
    if (messagesEl) {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        choicesEl.classList.add("sommelier-choices--visible");
        /* scrollIntoView は document 全体がスクロールしフッターまで動くため使わない。タップしやすさは CSS の余白で確保 */
        /* 二重保険：opacity transition 後もスクロール位置を末尾に揃える */
        if (messagesEl) {
          messagesEl.scrollTop = messagesEl.scrollHeight;
        }
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

    /* リーフタイプ／ノンニコチンの絞り込み */
    if (a.leaf_type === "non_nicotine") {
      if (!recipe.nonNicotine) return -100; /* ノンニコチン希望時はタバコ葉レシピを除外 */
      score += 10;
    } else if (a.leaf_type && a.leaf_type !== "either") {
      if (recipe.nonNicotine) return -100; /* 特定リーフ指定時はノンニコチンを除外 */
      if (t.dark) {
        if (t.dark.indexOf(a.leaf_type) !== -1) score += 3;
        else score -= 4;
      }
    } else if (a.experience === "beginner" && (a.leaf_type === "either" || !a.leaf_type)) {
      /* 初心者がおまかせを選んだ場合、ダークリーフを含むレシピは提案から除外 */
      if (recipe.nonNicotine) return -100; /* ノンニコチンも除外（明示的に希望していないため） */
      var hasDarkLeaf = recipe.items && recipe.items.some(function (it) { return it.leaf === "dark"; });
      if (hasDarkLeaf) return -100;
    }
    /* "either" / 未選択 はリーフでのフィルタをかけない（初心者以外） */

    if (a.taste && t.taste && t.taste.indexOf(a.taste) !== -1) score += 3;
    if (a.category && t.category && t.category.indexOf(a.category) !== -1) score += 4;
    if (a.mint_level && t.mint) {
      if (t.mint.indexOf(a.mint_level) !== -1) score += 2;
      else if (a.mint_level === "none" && t.mint.indexOf("none") === -1) score -= 3;
    }
    if (a.experience && t.exp && t.exp.indexOf(a.experience) !== -1) score += 2;
    if (a.mood && t.mood && t.mood.indexOf(a.mood) !== -1) score += 2;

    return score;
  }

  function getRecommendations() {
    var scored = recipes.map(function (r) {
      return { recipe: r, score: scoreRecipe(r) };
    });
    scored.sort(function (a, b) { return b.score - a.score; });
    /* ハード除外されたもの（score <= -50）を取り除いてから上位3件を選ぶ */
    var eligible = scored.filter(function (s) { return s.score > -50; });
    var top = eligible.filter(function (s) { return s.score > 0; }).slice(0, 3);
    if (top.length < 3) top = eligible.slice(0, 3);
    return top.map(function (s) { return s.recipe; });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }

  function leafBadgeInfo(leaf) {
    if (leaf === "dark") return { cls: "sommelier-leaf-dark", label: "ダーク" };
    if (leaf === "herbal") return { cls: "sommelier-leaf-herbal", label: "ノンニコチン" };
    return { cls: "sommelier-leaf-blonde", label: "ブロンド" };
  }

  function buildRecipeCard(r, idx) {
    var card = document.createElement("div");
    card.className = "sommelier-recipe-card";

    var header = document.createElement("div");
    header.className = "sommelier-recipe-header";
    header.id = "sommelier-recipe-" + (idx + 1);
    header.textContent = "【" + (idx + 1) + "】 " + r.name;
    card.appendChild(header);

    /* メイン表示：銘柄入りのレシピ詳細（タイトル・説明と整合） */
    var hasBrand = r.items.some(function (it) { return !!it.brand; });
    /* 銘柄なし＆全ブロンドの「純粋シンプル」レシピは leaf badge も省略してクリーンに表示 */
    var hideLeafBadges = !hasBrand && r.items.every(function (it) { return it.leaf === "blonde"; });

    var itemsWrap = document.createElement("div");
    itemsWrap.className = "sommelier-recipe-items";
    r.items.forEach(function (item) {
      var row = document.createElement("div");
      row.className = "sommelier-recipe-row";
      var leafInfo = leafBadgeInfo(item.leaf);
      var brandHtml = item.brand ? '<span class="sommelier-recipe-brand">（' + escapeHtml(item.brand) + '）</span>' : '';
      var leafHtml = hideLeafBadges ? '' : '<span class="sommelier-recipe-leaf ' + leafInfo.cls + '">' + leafInfo.label + '</span>';
      row.innerHTML = '<span class="sommelier-recipe-flavor">' + escapeHtml(item.flavor) + '</span>' +
        brandHtml +
        leafHtml +
        '<span class="sommelier-recipe-ratio">' + item.ratio + '%</span>';
      itemsWrap.appendChild(row);
    });
    card.appendChild(itemsWrap);

    /* 簡易版（折りたたみ）：銘柄を指定しない場合の代替フレーバー */
    var hasSimple = Array.isArray(r.simple) && r.simple.length > 0;
    if (hasBrand && hasSimple) {
      var details = document.createElement("details");
      details.className = "sommelier-recipe-details";
      var summary = document.createElement("summary");
      summary.className = "sommelier-recipe-details-summary";
      summary.textContent = "店員さんに伝えやすい簡易版";
      details.appendChild(summary);

      var simpleItems = document.createElement("div");
      simpleItems.className = "sommelier-recipe-simple-items";
      r.simple.forEach(function (item) {
        var row = document.createElement("div");
        row.className = "sommelier-recipe-simple-row";
        row.innerHTML = '<span class="sommelier-recipe-flavor">' + escapeHtml(item.flavor) + '</span>' +
          '<span class="sommelier-recipe-ratio">' + item.ratio + '%</span>';
        simpleItems.appendChild(row);
      });
      details.appendChild(simpleItems);
      card.appendChild(details);
    }

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
    pad = typeof pad === "number" ? pad : 0;
    /* 前の枠（前レシピのカード下端）が見えないよう、ターゲット行をできる限り上に寄せる。
       行の margin-top は無いため、pad=0 で previous row の margin-bottom が上方向にちょうど消える。 */
    var extraBreathing = 0;

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
        if (target) jumpToRecipeInMessages(target, 0);
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
        var choices = resolveStepChoices(steps[i]);
        for (var j = 0; j < choices.length; j++) {
          if (choices[j].id === answerId) return choices[j].label;
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
      leaf_type: "リーフ",
      mood: "気分"
    };
    var items = document.createElement("div");
    items.className = "sommelier-answer-items";
    var answered = ["taste", "category", "mint_level", "experience", "leaf_type", "mood"];
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
      addMessage(true, resolveStepBot(s), function () {
        showChoices(resolveStepChoices(s));
      });
    }, 500);
  }

  function onChoice(choiceId) {
    var step = steps[state.step];
    if (!step) return;
    state.answers[step.id] = choiceId;
    var choices = resolveStepChoices(step);
    var chosen = choices.filter(function (c) {
      return c.id === choiceId;
    })[0];
    hideChoices();
    if (chosen) addMessage(false, chosen.label);

    /* 初心者はリーフタイプ回答後、気分を自動セットして結果へ */
    if (step.id === "leaf_type" && state.answers.experience === "beginner") {
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
