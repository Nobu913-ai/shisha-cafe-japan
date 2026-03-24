# SHISHA CAFE JAPAN

日本のシーシャカフェ情報サイト（サンプル）です。

## 構成

- `index.html` - メインのHTML
- `styles.css` - スタイル
- `script.js` - メニュー開閉・店舗データの読み込み表示
- `shops.json` - 店舗データ（実在のシーシャカフェ・ラウンジの参考一覧）

## 見方

ブラウザで `index.html` を開くか、ローカルサーバーで表示してください。

```bash
# Python 3（localhost と 127.0.0.1 の両方で開ける）
python3 scripts/serve.py

# または従来どおり（127.0.0.1 のみの場合あり）
python3 -m http.server 8000

# または npx
npx serve .
```

その後、ブラウザで **http://localhost:8000** または **http://127.0.0.1:8000** を開きます。

- **localhost で表示できない場合**: `python3 scripts/serve.py` を使うと IPv4 と IPv6 の両方で待ち受けるため、localhost で開けるようになることがあります。それでも開けない場合は **http://127.0.0.1:8000** を使ってください。
- **ブラウザが開かない場合**: 手動で Chrome や Safari を起動し、アドレスバーに上記 URL を入力してください。

店舗一覧は `shops.json` を読み込んで表示するため、**ローカルサーバー経由で開く**と正しく表示されます（ファイルを直接開くと読み込めない場合があります）。

## 店舗データを増やす（東京・大阪を充実させる）

店舗情報は CSV で編集し、`shops.json` に反映できます。東京・大阪を「全店舗」に近づけたい場合に便利です。

1. **現在のデータを CSV に書き出す**  
   `python3 scripts/shops_to_csv.py`  
   → `data/shops.csv` ができるので、Excel や Google スプレッドシートで開く（UTF-8 で保存すること）。

2. **Google マップで「シーシャ 東京」「シーシャ 大阪」などと検索**し、ヒットした店を CSV に 1 行ずつ追加。列の意味は `docs/店舗データの追加方法.md` を参照。

3. **CSV を JSON に取り込む**  
   `python3 scripts/csv_to_shops.py data/shops.csv`  
   → `shops.json` が更新されます。

くわしい手順・列の説明は **`docs/店舗データの追加方法.md`** を参照してください。

### 店舗の重複チェック

```bash
python3 scripts/find_duplicate_shops.py
```

表記が違う同一店舗（例: `maya` と `シーシャ maya cafe&Bar`）は、公式URLのドメイン一致などで検出されます。詳細は `docs/店舗データの追加方法.md` の「店舗の重複チェック」を参照してください。
