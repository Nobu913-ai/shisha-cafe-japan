# SHISHA CAFE JAPAN

日本全国のシーシャカフェ・シーシャバーの検索サイト（[shisha-cafe.jp](https://shisha-cafe.jp/)）。GitHub Pages で静的ホスティング。

## 主な機能

- 全国約1450店舗の検索（エリア・設備・駅・現在地）
- エリア別ランキング（TOP5×4エリア、多様性考慮）
- シーシャガイド・フレーバー相談（sommelier）

## 構成

| ファイル | 役割 |
|---|---|
| `index.html` | トップページ |
| `search.html` / `search.js` | 店舗検索 |
| `ranking.html` | エリア別ランキング |
| `guide.html` | シーシャガイド |
| `sommelier.html` / `sommelier.js` | フレーバー相談 |
| `shops.json` | 店舗データ（キーはCID） |
| `top-shops.json` | ランキングデータ |
| `styles.css` / `script.js` | 共通スタイル・スクリプト |

## ローカル起動

```bash
# IPv4 / IPv6 両方で待ち受け（推奨）
python3 scripts/serve.py

# または
python3 -m http.server 8000
```

ブラウザで <http://localhost:8000> または <http://127.0.0.1:8000> を開く。
`shops.json` を読み込むため、ファイル直開きではなく必ずローカルサーバー経由で。

## 店舗データの更新

Place Details API ベースの自動パイプラインで運用しています。詳細は [`docs/update-flow.md`](docs/update-flow.md)（非公開）を参照。

### 月次更新（既存店舗）

```bash
python3 scripts/refetch_places.py --dry-run              # 差分確認
python3 scripts/refetch_places.py --apply --update-tags  # 適用
python3 scripts/gen_top_shops.py                         # ランキング再生成
```

### 新規店舗追加

```bash
python3 scripts/add_new_shops.py --dry-run
python3 scripts/add_new_shops.py --apply --skip-descriptions
python3 scripts/enrich_new_shops.py --apply
python3 scripts/generate_descriptions_ai.py --empty-only
python3 scripts/gen_top_shops.py
```

## 環境変数

`.env` に以下を設定（`>>` で追記すること。`>` 上書きは API キー消失事故の元）。

- `GOOGLE_MAPS_API_KEY` — Places / Routes API
- `ANTHROPIC_API_KEY` — AI タグ判定・紹介文生成

## リポジトリ運用

- `shops.json` コミット時に pre-commit hook で `gen_top_shops.py` が自動実行され、ランキング HTML が再生成されます
- `main` への push は GitHub Pages に自動デプロイされます
- `scripts/` `docs/` `.private/` は gitignored（運用ツールと内部資料）

## 関連ドキュメント

- `CLAUDE.md` — Claude Code 向けプロジェクトガイド
- `docs/update-flow.md` — 店舗更新フロー仕様（非公開）
- `docs/roadmap.md` — ロードマップ・タスク管理（非公開）
