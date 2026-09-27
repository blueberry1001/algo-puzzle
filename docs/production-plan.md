# AFTERGLOW — 制作仕様

原典: https://docs.google.com/document/d/1mjiJXpA6lxqRASAgboG7LFhlkldP-utOxjWk2bdIyJg/edit

2026-09-27版。架空のソロアーティスト「星宮 澪 / MIO HOSHIMIYA」を中心にした独立ブランド群。設定・本文は仮の完成サンプル。実在の顧客情報・決済・送信サービスは扱わない。

## ルートとビジュアル

- `/` TALK: navy/powder-blue/green、3連絡先、段階返信、画像、招待リンク、予約返信。
- `/sns/` murmur: white/teal、複数NPC、投稿・返信・DM・検索、相対日時、公式通知。
- `/board/` AFTER HOURS: ink/cream/coral、月別スレッド、安定した匿名ID、閲覧専用。
- `/club/` AFTERGLOW: peach/ivory/serif、写真主体。ブログ、ニュース、会員限定日記・活動・写真・チケット・履歴・マイページ、問い合わせ。
- `/management/` MEMBERS DESK: navy/slate、パスワード→会員番号+氏名→管理記録。
- `/recorder/` ECHO: near-black/acid green/monospace、製造番号+パスワード、ローカル音声、商品説明。
- `/venue/` komorebi: olive/ivory、建築写真、ハンバーガー、フロアマップ、月送り予約カレンダー。
- `/studio/` 制作スタジオ:全サイトリンク、設定フォーム/JSON、下書き反映・検証、書出し/読込み、時計早送り、進捗の移行。

Figma: https://www.figma.com/design/0567hLHUyQcKvHBZJKZ4EL

## データと移行

ES modules、静的配信、相対URL。シナリオは `content/scenario.json`、ゲーム状態は `algo-puzzle:world:v2`。旧v1の進捗を取り込む。制作中設定は専用キーに保存。プレイヤーの書き込みはそのブラウザ内だけ。会員パスワードはsalt付きPBKDF2。これは謎解きの疑似認証であり、実在情報を保護するサーバー認証ではない。

時間は保存された初回起動/解放時刻を基準にする。ランダム更新は初期化時に時刻を選び保存し、リロードで再抽選しない。固定時刻は日本時間19時。閉じている間の更新は次回復帰で追いつく。ブラウザ通知は許可制、閉じている間のプッシュ配信はサーバー導入が必要。

ドメイン移行:ソースはそのまま設置可。進捗JSONを旧ドメインで書き出し新ドメインで読み込む。別ドメイン間のLocalStorage共有は不可。連動サイト群は同一オリジンで運用する。

## 検証

順番違い、二重送信、招待の段階条件、時間境界19:00、遅延復帰、ランダム一回性、旧版移行、不正設定、相対日時、登録/ログイン/ログアウト、SNS含むキーワード返信、読み取り専用掲示板、会員検索不一致、音声再生、月移動、予約、設定反映/復元、書出し/読込みを検証する。
