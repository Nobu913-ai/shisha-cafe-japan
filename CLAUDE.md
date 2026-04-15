# SHISHA CAFE JAPAN (shisha-cafe.jp)

日本全国のシーシャカフェ・シーシャバーの検索サイト。GitHub Pages で静的ホスティング。

## 重要ルール

- **push前にユーザー確認を取る** — GitHub Pages に自動デプロイされるため、pushは必ずユーザーの承認後に行う
- **`.env` は絶対に上書き(`>`)しない** — 必ず追記(`>>`)で操作。過去にGoogleマップAPIキー消失事故あり
- **APIコストに注意** — Place Details API、Anthropic API は課金あり。全件再処理は避け、必要な分だけ処理する
- **既存UXを壊す変更は避ける** — SEO目的でも中間ページ等の動線悪化は不採用（Tier2エリアページ見送りの前例あり）

## プロジェクト構成

```
shops.json          — 全店舗データ（約1450店）
top-shops.json      — エリア別ランキング
search.js           — 店舗検索のメインロジック
script.js           — トップページ等の共通スクリプト
styles.css          — 全ページ共通スタイル
index.html          — トップページ
search.html         — 店舗検索ページ
docs/               — 内部ドキュメント（gitignored）
  roadmap.md        — ロードマップ・タスク管理
  update-flow.md    — 更新フロー仕様（運用手順・フィールドルール・スクリプト一覧）
  seo-plan.md       — SEO施策
  tag-improvement.md — タグ精度向上
scripts/            — 運用スクリプト（gitignored）
.private/           — 機密情報（gitignored）
  notes.md          — ビジネス戦略・収益化メモ
  update_log.md     — 更新実行ログ
```

## 店舗データ更新フロー

詳細は `docs/update-flow.md` を参照。

### 月次更新（既存店舗）
```
python3 scripts/refetch_places.py --dry-run          # 確認
python3 scripts/refetch_places.py --apply --update-tags  # 実行
python3 scripts/gen_top_shops.py                     # ランキング再生成
```

### 新規店舗追加
```
python3 scripts/add_new_shops.py --dry-run                   # 確認
python3 scripts/add_new_shops.py --apply --skip-descriptions  # 追加
python3 scripts/enrich_new_shops.py --apply                   # 口コミ+タグ
python3 scripts/generate_descriptions_ai.py --empty-only      # 紹介文
python3 scripts/gen_top_shops.py                              # ランキング再生成
```

### 注意事項

- **データファイルのキーはCID**（Google Maps URL の `cid=` パラメータ）。位置ベースのインデックスは使わない
- **`add_new_shops.py` は `--skip-descriptions` を付ける** — 付けないと全店舗の紹介文を再生成してしまう
- **紹介文生成エラーは再実行で解決** — `generate_descriptions_ai.py --empty-only` を繰り返す
- **口コミは Place Details API の place_id 経由で取得** — Text Search は誤マッチするため使わない
- **`shops_overrides.json`** で手動修正を保護（officialUrl, area, description）
- **環境変数**: `GOOGLE_MAPS_API_KEY`（Places API）、`ANTHROPIC_API_KEY`（AI判定・紹介文）

## スクリプト一覧（scripts/、gitignored）

| スクリプト | 用途 | API課金 |
|---|---|---|
| `refetch_places.py` | 既存店舗の情報再取得+コンテキスト構築+タグ判定 | Google Places, Anthropic |
| `add_new_shops.py` | 新規店舗の発見・追加 | Google Places, Routes |
| `enrich_new_shops.py` | 新規店舗の口コミ取得+タグ判定 | Google Places, Anthropic |
| `enrich_tags_ai.py` | AIタグ判定（未判定分のみ） | Anthropic |
| `generate_descriptions_ai.py` | AI紹介文生成 | Anthropic |
| `enrich_station_access.py` | 最寄り駅+徒歩時間 | Google Routes |
| `gen_top_shops.py` | ランキング再生成 + HTML埋め込み | なし |

## ランキング事前レンダリング

`gen_top_shops.py` は `top-shops.json` の生成に加え、ランキングHTMLを `ranking.html` / `index.html` に直接埋め込む。これにより:
- クローラーがランキング内容をインデックス可能（SEO改善）
- 「読み込み中…」なしで即時表示
- `script.js` にはタブ切り替えとモーダル表示のイベントハンドラのみ残し、HTMLの二重管理を回避

**pre-commit hook** により、`shops.json` をコミットすると `gen_top_shops.py` が自動実行される。
