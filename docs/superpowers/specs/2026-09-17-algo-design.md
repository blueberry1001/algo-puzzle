# algo 連動サイト設計

依頼範囲はチャット・SNSの新規制作とGitHub Pages公開まで。サーバー不要の静的HTML/CSS/ES modulesを採用する。Reactや別バックエンドを増やす必要のない2画面構成。

ルートがTALK、sns/がmurmur。初期→りんご→みかんの3状態。先行みかん・再送・無関係な語では遷移しない。前後空白のみ許容。LocalStorageに状態と会話を保存し、同一オリジンのタブへ反映。保存失敗を表示。専用キーのみリセット。利用者の文字列はtextContentで表示。

生成コンセプト: C:/Users/kubar/.codex/generated_images/01a0ae11-b210-7440-b93e-81f864712cc9/exec-4f9b45ed-0a61-4a76-b39d-c30fa14238d7.png

TALK: navy #25354d header、blue #adc7df canvas、white received bubbles、green #8bdba1 sent bubbles。固定composer、スクロール会話、控えめなreset。murmur: white background、mint #b9dcd1 cover、navy letter avatar、teal #209e99 underline、thin separated posts。Japanese system sans、本文14〜16px。写真を使わず文字と余白で整える。モバイル全幅、PC最大520/620px。

生成案に追加された無関係なメディア・検索・ホーム操作は省略し、投稿だけを表示。投稿ごとのいいねは動作する。日付は保存時刻から表示。段階解放後の文章とSNS投稿数を追加する。会話の日付誤表示を避け、区切りは「ハルとのトーク」とする。
