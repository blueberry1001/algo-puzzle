# STUDIO共通保存先（取り外し可能）

## 編集する人の操作

1. いつものSTUDIO画面で文章・投稿・返信ルールを編集します。入力途中の内容もこのブラウザに自動保存されます。
2. 左メニュー下の「変更を反映する」を開き、「全員に公開」を押します。共有下書きの読み込み・保存は不要です。
3. 変更名を入力し、確認画面で「公開する」を押すと手元の内容が直接公開されます。キャンセルした場合は公開しません。

GitHub・Cloudflareのアカウントは不要です。現在はSTUDIOのURLを知っている人なら公開・履歴の閲覧ができます。確認画面は誤操作防止で、アクセス制限ではありません。

公開画面を開いたあとに他の人が更新した場合、公開を止めます。手元の編集は残ります。JSONを書き出して保管し、公開履歴で変更を確認して合わせてください。

「ローカル履歴」には、公開履歴の読み込み・JSON取り込み・公開設定へのリセット・ローカル履歴の復元前の編集を最大5件（容量に応じて減少）保存します。入力途中の欄も復元できます。保存に失敗した場合は置き換えを中止します。同じブラウザ・同じドメインでのみ利用でき、ブラウザのデータを削除すると消えます。大事な版はJSONでも保管してください。自動保存は同じブラウザのSTUDIOで共有されるため、編集は1タブで行ってください。

「公開履歴」から過去の内容を下書きに戻せます。戻しただけでは公開されません。直近20回分を残します。公開前の確認画面で変更名（任意・80文字以内）を付けられます。履歴には変更名・日本時間の公開日時・現在公開中の印を表示します。名前なしの履歴は版番号で表示します。公開した内容はプレイヤーが次にページを開くと反映されます。STUDIOでローカル設定を反映済みのブラウザはそのプレビューが優先されます。

## 実装範囲

既存STUDIOが扱うシナリオ（会話・SNS・記事等）の保存・公開です。商品ページや施設ページなどコードに直接書かれた内容の編集機能は増やしていません。大きな画像や音声ファイルのアップロードも今回の範囲外です。従来のJSON書き出しは残します。

2026年11月16日に本番接続しました。保存先は `https://algo-studio-content.kubarun317.workers.dev` です。現在は `PUBLIC_EDITING = "true"` でキー不要の更新を有効にしています。

## 管理者による初回設定（再構築時）

無料プランのWorkers + D1を使用します。有料契約やR2は不要です。利用量が無料枠を超えた場合は読み書きが制限されるため、利用状況はCloudflareで確認してください。

以下は担当者向けです。編集メンバーが実行する必要はありません。

1. `npx wrangler login`
2. `npx wrangler d1 create algo-studio-content`
3. 作成結果のdatabase_idをcloud/wrangler.tomlに入れる。
4. `npx wrangler d1 migrations apply algo-studio-content --remote --config cloud/wrangler.toml`
5. `npx wrangler deploy --config cloud/wrangler.toml`
6. 発行されたHTTPSのURLをcontent/cloud.jsonのendpointに設定してGitHub Pagesに反映する。
7. STUDIOで現在の内容を確認→変更を反映する→全員に公開。

wrangler.tomlのALLOWED_ORIGINSは許可するサイトのoriginをカンマ区切りで指定します。ドメイン移行時はここも変更します。本番で不要ならlocalhostの許可を削除してください。キー必須へ戻す場合はPUBLIC_EDITINGをfalseにし、EDITOR_KEYをCloudflare Secretに登録して再デプロイします。画面にもキー入力が戻ります。以前の編集キーはGit対象外のcloud/editor-secret.txtに保存されています。

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

1. 必要な公開履歴をSTUDIOで開き、JSONを書き出す。
2. その内容をcontent/scenario.jsonに反映する。
3. content/cloud.jsonのendpointを空にして公開する。この時点でクラウドなしの運用に戻る。
4. 完全撤去する場合：assets/runtime.jsのpublicContentのimportと呼び出しを外し、従来のresponse.json()読込へ戻す。assets/pages/studio.jsのcloudActions/bindCloudのimportと呼び出しを外す。
5. assets/cloud/、cloud/、content/cloud.json、tests/cloud.integration.mjsを削除し、wranglerの開発依存を外す。
6. 内容の退避を確認してからCloudflare側のWorkerとD1を削除する。

プレイヤーの進捗はこれまでどおり端末のLocalStorageです。クラウドにはシナリオだけを保存します。現在は公開履歴も認証なしで閲覧できます。接続失敗時は最後に取得できた公開内容を使用します。初回から接続できなければエラー表示になります。

## 更新時の注意

新しい画面は `GET /publication` と設定本文付きの `POST /publish` を使用します。先にWorkerをデプロイし、その後サイトを更新してください。DBの追加マイグレーションは不要です。旧クライアントとの互換性と既存データ保全のため、旧 `/draft` APIとDBのdraft列は残していますが、新しい画面からは使用しません。
