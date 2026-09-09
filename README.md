# 日本の祝日 REST API + MCP

内閣府が公開している [国民の祝日 CSV](https://www8.cao.go.jp/chosei/shukujitsu/syukujitsu.csv) をデータ源に、日付判定・名称検索・営業日判定を REST と MCP で提供します。

タイムゾーンは常に `Asia/Tokyo` です。会社独自の年末年始などは含みません。`kind`（国民の祝日 / 振替休日 / 国民の休日 / 祝日扱い / 皇室行事）は CSV 名称と前後の日から推定しています。

## 起動

```bash
npm ci
npm test
npm run dev
```

`HOLIDAYS_SKIP_FETCH=1` を付けると公式 CSV を取りに行かず、`data/syukujitsu.csv` だけを使います。

## Swagger

- UI: [http://localhost:3000/docs](http://localhost:3000/docs)（`/swagger` も同じ）
- OpenAPI 3.1: [http://localhost:3000/openapi.json](http://localhost:3000/openapi.json)
- 静的ファイル: [`docs/swagger.html`](docs/swagger.html) / [`docs/openapi.json`](docs/openapi.json)（`npm run generate-swagger` で再生成）

## REST

| エンドポイント | 説明 |
|---|---|
| `GET /health` | 件数・ソース・収録期間 |
| `GET /v1/lookup?year=2026&month=1&day=1` | 単日判定 |
| `GET /v1/today` | 東京の今日 |
| `GET /v1/next?from=2026-09-09&count=1` | 次の祝日（`count` は 1〜20） |
| `GET /v1/business-day?year=2026&month=9&day=9` | 営業日（月〜金かつ非祝日） |
| `GET /v1/holidays?year=2026&month=1` | 一覧 |
| `GET /v1/holidays?from=2026-01-01&to=2026-03-31` | 期間 |
| `GET /v1/holidays?q=成人` | 部分一致・曖昧検索 |

収録期間内の非祝日は `holiday: false`。期間外の正しい日付は 200 で `available: false` です。暦として存在しない日は 400 です。

```json
{
  "date": "2026-01-01",
  "holiday": true,
  "name": "元日",
  "kind": "国民の祝日",
  "weekday": "木",
  "businessDay": false,
  "available": true
}
```

## MCP

`ALL /mcp`（Streamable HTTP）。Cursor の設定例:

```json
{
  "mcpServers": {
    "japan-holidays": {
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

ツール: `lookup_holiday`, `lookup_today`, `next_holidays`, `is_business_day`, `search_holidays`, `list_holidays`

## Docker / GHCR

```bash
docker build -t japan-national-holidays-api .
docker run -p 3000:3000 japan-national-holidays-api
```

`main` への push と `v*` タグで `ghcr.io/<owner>/<repo>` に push します。認証は `GITHUB_TOKEN` です。追加の Secrets は不要です。パッケージの公開範囲はリポジトリの Packages 設定で変更できます（デフォルトは private）。

## バンドル CSV の更新

毎月 1 日と手動実行で公式 CSV を取り、差分があれば `chore/update-holidays-csv` から PR を作ります。ヘッダー・行数・重複日付を検証し、壊れたファイルは PR しません。

```bash
npm run update-csv
```
