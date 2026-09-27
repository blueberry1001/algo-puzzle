# algo — AFTERGLOW

謎解き用の7サイト＋制作スタジオ。GitHub Pagesで動く、ビルド不要の静的アプリです。

**[サイト一覧・制作スタジオ](https://blueberry1001.github.io/algo-puzzle/studio/)** · **[Figma](https://www.figma.com/design/0567hLHUyQcKvHBZJKZ4EL)** · **[制作・運用ガイド](docs/authoring.md)**

| サイト | 内容 |
|---|---|
| [TALK](https://blueberry1001.github.io/algo-puzzle/) | 3連絡先・段階返信・招待・画像・予約返信 |
| [murmur](https://blueberry1001.github.io/algo-puzzle/sns/) | NPC投稿・検索・返信・DM・通知 |
| [AFTER HOURS](https://blueberry1001.github.io/algo-puzzle/board/) | 月別のファン掲示板 |
| [AFTERGLOW](https://blueberry1001.github.io/algo-puzzle/club/) | ブログ・ニュース・会員登録・会員コンテンツ |
| [MEMBERS DESK](https://blueberry1001.github.io/algo-puzzle/management/) | 会員情報検索 |
| [ECHO](https://blueberry1001.github.io/algo-puzzle/recorder/) | 認証付き音声アーカイブ |
| [komorebi](https://blueberry1001.github.io/algo-puzzle/venue/) | 施設・マップ・予約カレンダー |

## 試す

ハルへ「りんご」→「みかん」。招待から追加したアオイへ「写真」、マネージャーへ「星座」。先に「みかん」を送っても進みません。制作スタジオで時間の早送り・本文編集・進捗リセット・JSON移行ができます。

進捗はLocalStorageに保存し、同じブラウザのタブ間で同期します。本文・画像・音声は仮の完成サンプルです。実際の送信・決済・施設予約は行いません。ブラウザ終了中の更新は次回起動時に反映し、閉じたままのプッシュ通知には対応しません。

## 開発・公開

Node.js 22以降。`npm start`でローカル起動、`npm test`でテスト。mainブランチのルートをGitHub Pagesで配信します。

設定は `content/scenario.json`。独自ドメインへはファイルをそのまま移設でき、進捗はスタジオからJSONで引き継げます。連動サイト群は同一オリジンで運用してください。詳しくは[運用ガイド](docs/authoring.md)をご覧ください。
