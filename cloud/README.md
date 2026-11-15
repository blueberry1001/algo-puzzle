# STUDIO共通保存先（取り外し可能）

## 編集する人の操作

1. STUDIOで「共有・公開」を開き、管理者から受け取った編集キーで接続します。
2. 「共有下書きを開く」で最新の内容を読み込みます。
3. いつものSTUDIO画面で文章・投稿・返信ルールを編集します。
4. 「共有下書きに保存」でチームに渡します。公開内容は変わりません。
5. 確認できたら「全員に公開」を押します。

GitHubアカウント、Cloudflareアカウント、JSONの操作は不要です。編集キーはそのタブを閉じるまで保持します。全員で使う共通キーなので、編集を任せる人だけに渡してください。画面を再読み込みした場合は共有下書きを開き直してから保存します。

同時編集はリアルタイム同期ではありません。先に誰かが保存すると、後からの保存は止まります。手元の編集はそのまま残るので、必要ならJSONを書き出して保管し、共有下書きを開き直して変更を合わせてください。

「公開履歴」から過去の内容を下書きに戻せます。戻しただけでは公開されません。直近20回分を残します。公開した内容はプレイヤーが次にページを開くと反映されます。STUDIOでローカル設定を反映済みのブラウザはそのプレビューが優先されます。

## 実装範囲

既存STUDIOが扱うシナリオ（会話・SNS・記事等）の保存・公開です。商品ページや施設ページなどコードに直接書かれた内容の編集機能は増やしていません。大きな画像や音声ファイルのアップロードも今回の範囲外です。従来のJSON書き出しは残します。

2026年11月16日に本番接続しました。保存先は `https://algo-studio-content.kubarun317.workers.dev` です。編集キーは管理者端末の `cloud/editor-secret.txt` に保存しています。このファイルはGit対象外です。

## 管理者による初回設定（再構築時）

無料プランのWorkers + D1を使用します。有料契約やR2は不要です。利用量が無料枠を超えた場合は読み書きが制限されるため、利用状況はCloudflareで確認してください。

以下は担当者向けです。編集メンバーが実行する必要はありません。

1. `npx wrangler login`
2. `npx wrangler d1 create algo-studio-content`
3. 作成結果のdatabase_idをcloud/wrangler.tomlに入れる。
4. `npx wrangler d1 migrations apply algo-studio-content --remote --config cloud/wrangler.toml`
5. パスワードマネージャー等で32文字以上のランダムな編集キーを生成する。
6. `npx wrangler secret put EDITOR_KEY --config cloud/wrangler.toml` に入力する。キーをソース・JSON・チャットに書かない。
7. `npx wrangler deploy --config cloud/wrangler.toml`
8. 発行されたHTTPSのURLをcontent/cloud.jsonのendpointに設定してGitHub Pagesに反映する。
9. STUDIOで接続→共有下書きを開く→現在の内容を共有保存→全員に公開。

wrangler.tomlのALLOWED_ORIGINSは許可するサイトのoriginをカンマ区切りで指定します。ドメイン移行時はここも変更します。本番で不要ならlocalhostの許可を削除してください。編集キーの変更はsecret putを再実行します。

## ローカルテスト

cloud/.dev.varsにテスト専用キーを設定し、以下を実行します。このファイルはGit対象外です。本番では使いません。

```
EDITOR_KEY="local-test-key-not-for-production-123456789"
```

```
npx wrangler d1 migrations apply algo-studio-content --local --config cloud/wrangler.toml
npx wrangler dev --local --port 8787 --config cloud/wrangler.toml
node tests/cloud.integration.mjs
```

ローカルでブラウザテストをする場合は、content/cloud.jsonの応答をローカルWorkerのURLへ差し替えてください。cloud/.dev.varsのALLOWED_ORIGINSにローカルサイトのoriginを指定してください。本番設定は変更しません。

## 取り外し方

1. 共有下書きまたは必要な公開履歴をSTUDIOで開き、JSONを書き出す。
2. その内容をcontent/scenario.jsonに反映する。
3. content/cloud.jsonのendpointを空にして公開する。この時点でクラウドなしの運用に戻る。
4. 完全撤去する場合：assets/runtime.jsのpublicContentのimportと呼び出しを外し、従来のresponse.json()読込へ戻す。assets/pages/studio.jsのcloudActions/bindCloudのimportと呼び出しを外す。
5. assets/cloud/、cloud/、content/cloud.json、tests/cloud.integration.mjsを削除し、wranglerの開発依存を外す。
6. 内容の退避を確認してからCloudflare側のWorkerとD1を削除する。

プレイヤーの進捗はこれまでどおり端末のLocalStorageです。クラウドにはシナリオだけを保存します。認証なしで読めるのは公開済みシナリオだけです。接続失敗時は最後に取得できた公開内容を使用します。初回から接続できなければエラー表示になります。
