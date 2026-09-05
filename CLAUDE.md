# SHISHA CAFE JAPAN (shisha-cafe.jp)

日本全国のシーシャカフェ・シーシャバーの検索サイト。GitHub Pages で静的ホスティング。

## 重要ルール

- **push前にユーザー確認を取る** — GitHub Pages に自動デプロイされるため、pushは必ずユーザーの承認後に行う
- **`.env` は絶対に上書き(`>`)しない** — 必ず追記(`>>`)で操作。過去にGoogleマップAPIキー消失事故あり
- **APIコストに注意** — Place Details API、Anthropic API は課金あり。全件再処理は避け、必要な分だけ処理する
- **既存UXを壊す変更は避ける** — SEO目的でも中間ページ等の動線悪化は不採用（Tier2エリアページ見送りの前例あり）
- **JS/CSSを変更したら参照側HTMLの `?v=` も必ず更新する** — 漏れると本番の返訪ユーザーだけ古い挙動になる（ローカル初回アクセスでは再現しないため気づけない）。生成ページ（`area/*` `feature/*`）の版はジェネレータ内のテンプレートに書かれているので、HTMLを直接直さずジェネレータを直して再生成する
- **店舗数の表記は「全国1,400店舗以上」で統一** — サイト・Note記事・X・スキルすべて横断。実数（現在約1,432店）に近いキリの良い下限＋「以上」。**手書きのコピー（meta description・OGP・見出し・記事本文）では具体的な件数を出さない**
  - **例外: データから自動生成される表示は実数でよい** — エリアLPの「おすすめ178店」、機能別LPの「全461店」、`search.html` の静的サマリー「全国1,432店舗を掲載」（`gen_top_shops.py:476`）が該当。**再生成のたびにデータへ自動追従するので陳腐化しない**うえ、AI検索・SEOでは具体的で更新日の明示された数字のほうが引用されやすいため。「1,400店舗以上」と矛盾するわけではなく粒度の違い（1,432は1,400以上）
  - 判断基準: **人が書いた文言か、データが生成した文言か**。前者は必ず「1,400店舗以上」

## プロジェクト構成

```
shops.json          — 全店舗データ（約1432店。手書きコピーの表記は「1,400店舗以上」で統一）
top-shops.json      — エリア別ランキング
search.js           — 店舗検索のメインロジック
script.js           — トップページ等の共通スクリプト
styles.css          — 全ページ共通スタイル
index.html          — トップページ
search.html         — 店舗検索ページ
area/               — エリア別LP 18ページ（gen_area_pages.py が生成）
feature/            — 機能・条件別LP（gen_feature_pages.py が生成。現在 non-nicotine の1枚）
shop/               — 店舗個別ページ（gen_shop_pages.py が生成。URLは `/shop/<CID>`）
docs/               — 内部ドキュメント（gitignored）
  roadmap.md        — ロードマップ・タスク管理
  update-flow.md    — 更新フロー仕様（運用手順・フィールドルール・スクリプト一覧）
  seo-plan.md       — SEO施策（エリアLP 第1弾12+第2弾6=18ページ）
  seo-bigword-plan.md — 「シーシャカフェ」検索意図・着地ページ整理（GSC診断）
  analytics-log.md  — GA4+SC 定期計測ログ
  analytics-auto-setup.md — GA4/GSCデータ自動取得のセットアップ手順
  tag-improvement.md — タグ精度向上
scripts/            — 運用スクリプト（gitignored）
.private/           — 機密情報（gitignored）
  notes.md          — ビジネス戦略・収益化メモ
  update_log.md     — 更新実行ログ
  oauth_client.json / analytics_token.json — GA4/GSC自動取得の認証（gitignored）
.venv-analytics/    — 自動取得スクリプト専用venv（gitignored）
```

## 店舗データ更新フロー

詳細は `docs/update-flow.md` を参照。

### 月次フルフロー（既存更新 + 新規追加）
```
# ステップ1: 既存店舗の月次更新
# ※ Place Details は reviews無しの軽量マスク（Enterprise SKU）で取得しコストを抑制。
#   --update-tags を付けると reviews を取得し最上位 E+A SKU になるので月次では付けない（タグは手動）。
python3 scripts/refetch_places.py --dry-run --limit 10     # 差分傾向のサンプル確認（dry-runも課金対象。傾向確認は10件で足りる）
python3 scripts/refetch_places.py --apply                  # 実行（applyも差分表示+バックアップあり）

# ステップ2: 新規店舗の追加
python3 scripts/add_new_shops.py --dry-run                 # 確認
python3 scripts/add_new_shops.py --apply --skip-descriptions  # 追加
python3 scripts/enrich_new_shops.py --apply                # 口コミ+コンテキスト取得
# → 紹介文・AI 5タグ（Wi-Fi/電源/個室/ノンニコチン/シェア台）は Claude が手動作成（Anthropic API 不使用）

# ステップ2.5: ルールタグ導出（新規店の取りこぼし防止・API不要）
python3 scripts/infer_hours_tags.py                        # 24時間営業/深夜営業（argparse無し=即書き込み）
python3 scripts/infer_features_from_text.py --backup       # クレカ可/アルコール/フリードリンク等

# ステップ3: 出力の再生成
python3 scripts/gen_top_shops.py                           # ランキング再生成
python3 scripts/gen_area_pages.py                          # エリアLP18ページ再生成
python3 scripts/gen_feature_pages.py                       # 機能別LP再生成（店舗数・エリア件数が変わるため必須）
python3 scripts/gen_shop_pages.py                          # 店舗個別ページ再生成（口コミ数の変動で対象が増えるため必須）
```

### 注意事項

- **データファイルのキーはCID**（Google Maps URL の `cid=` パラメータ）。位置ベースのインデックスは使わない
- **`add_new_shops.py` は `--skip-descriptions` を付ける** — 付けないと全店舗の紹介文を再生成してしまう
- **紹介文・AIタグ（5種）は Anthropic API を使わず Claude が手動作成** — `generate_descriptions_ai.py` / `enrich_tags_ai.py` は実行しない（API課金回避）。口コミ・`data/description_contexts.json` を読んで執筆・判定し shops.json に直接記入
- **`gen_shop_pages.py` の対象は「口コミ500件以上＋データ充足」+ 需要実証済みの18店** — 閾値を割った店のページは**消さない**（一度公開したURLを消すと404になり順位も失うため）。削除するのは shops.json から消えた店だけ
- **新規店はルールタグを取りこぼす** — `add_new_shops`/`enrich_new_shops` は `infer_*` を呼ばない。新規追加後は `infer_hours_tags.py`（深夜営業等）・`infer_features_from_text.py`（クレカ可等）を必ず実行してから出力再生成する
- **口コミは Place Details API の place_id 経由で取得** — Text Search は誤マッチするため使わない
- **`shops_overrides.json`** で手動修正を保護（officialUrl, area, description）
- **環境変数**: `GOOGLE_MAPS_API_KEY`（Places API）、`ANTHROPIC_API_KEY`（AI判定・紹介文）、`GA4_PROPERTY_ID`/`GSC_SITE_URL`（アクセス解析自動取得）
- **APIキーのフォールバック**: スクリプトは `GOOGLE_PLACES_API_KEY` を優先、未設定なら `GOOGLE_MAPS_API_KEY` を使用。`.env` には `GOOGLE_MAPS_API_KEY` のみ入れておけば両方で動く

## スクリプト一覧（scripts/、gitignored）

| スクリプト | 用途 | API課金 |
|---|---|---|
| `refetch_places.py` | 既存店舗の情報再取得+コンテキスト構築+タグ判定 | Google Places, Anthropic |
| `add_new_shops.py` | 新規店舗の発見・追加 | Google Places, Routes |
| `enrich_new_shops.py` | 新規店舗の口コミ取得+コンテキスト構築 | Google Places |
| `enrich_tags_ai.py` | AIタグ判定（Anthropic・**不使用**／Claudeが手動判定） | Anthropic |
| `generate_descriptions_ai.py` | AI紹介文生成（Anthropic・**不使用**／Claudeが手動作成） | Anthropic |
| `infer_hours_tags.py` | hoursNoteから24時間営業/深夜営業を導出（argparse無し=即書き込み） | なし |
| `infer_features_from_text.py` | 口コミ/公式/paymentからクレカ可/アルコール等を推定 | なし |
| `enrich_station_access.py` | 最寄り駅+徒歩時間 | Google Routes |
| `gen_top_shops.py` | ランキング再生成 + HTML埋め込み | なし |
| `gen_area_pages.py` | エリアLP（18ページ）+ sitemap 再生成 | なし |
| `gen_feature_pages.py` | 機能・条件別LP（`FEATURE_DEFS` に定義）+ sitemap 再生成。`gen_area_pages.py` の関数を import して再利用 | なし |
| `gen_shop_pages.py` | 店舗個別ページ `/shop/<CID>` + sitemap 再生成。`gen_area_pages.py` の関数を import して再利用 | なし |
| `fetch_analytics.py` | GA4+Search Console データ自動取得（手動ZIP不要。専用venv `.venv-analytics/` で実行） | なし（無料API） |

## ランキング事前レンダリング

`gen_top_shops.py` は `top-shops.json` の生成に加え、ランキングHTMLを `ranking.html` / `index.html` に直接埋め込む。これにより:
- クローラーがランキング内容をインデックス可能（SEO改善）
- 「読み込み中…」なしで即時表示
- `script.js` にはタブ切り替えとモーダル表示のイベントハンドラのみ残し、HTMLの二重管理を回避

**pre-commit hook** により、`shops.json` をコミットすると `gen_top_shops.py` が自動実行される。

## 機能・条件別LP（`/feature/`・2026-07-26 新設）

エリアLP（`/area/` = 場所軸）に対し、`/feature/` は **設備・条件軸**の着地ページ。`scripts/gen_feature_pages.py` の `FEATURE_DEFS` にスラッグ・解説文・FAQを定義して生成する。

**構成**: H1＋解説 → 「エリアから探す」（`.area-grid` のリンク5枚。トップページと同一UI）→ よくある質問（FAQPage JSON-LD）→ 関連リンクカード

- **店舗一覧は載せない**。地域での絞り込みは `/search?area=<rid>&feature=<tag>` に受け渡す（全件載せると 462店で約1.3MB になるため）
- 構造化データは `BreadcrumbList` と `FAQPage` のみ。**店舗一覧を出さないので `CollectionPage` は付けない**（可視コンテンツと一致させるGoogleの要件）
- CSSは `area-*` / `guide-*` の既存クラスを流用。追加したのは `.guide-entry--nav`（他ページ誘導の矢印を→にする）だけ

**背景**: GSC分析（2026-07-26）で「シーシャ ニコチンなし」等のノンニコチン系クエリ10変種すべてが**掲載順位1.0でクリック0**と判明。着地が `/area/osaka` で、全国区の情報質問に対する意図ミスマッチを起こしていた。詳細は `docs/seo-plan.md` の Tier 2.5。

**検索ページの `?feature=`**: `search.js` の `getInitialFeatures()` が `FEATURE_CATEGORIES` の許可リストで検証して適用する。`?area=` との併用可。絞り込み条件のURL共有にも使える。
