# EventSnap

Web ページ上のイベント日時テキストを選択し、右クリックから Google Calendar に予定を登録できる Chrome 拡張機能です。

**バージョン:** `manifest.json` の `version` を参照してください。

## できること

- テキスト選択＋右クリックで予定作成用のポップアップを開く
- 選択テキストから日時を自動解析（日本語・英語の表記に対応）
- Google アカウントでログインし、カレンダーへイベントを追加
- ツールバーから拡張を開いて予定フォームを表示、または **拡張機能のオプション**（`options_page`）からデフォルトカレンダーや通知などを設定

## 動作環境

- Google Chrome（Manifest V3 対応版）
- Google アカウント（Calendar API 利用のための認証）

## インストール（開発用・未パッケージ）

1. このリポジトリをクローンまたは ZIP でダウンロードし、フォルダを展開する。
2. Chrome で `chrome://extensions/` を開く。
3. 右上の「デベロッパーモード」をオンにする。
4. 「パッケージ化されていない拡張機能を読み込む」で、このプロジェクトのルートフォルダ（`manifest.json` がある階層）を指定する。
5. 初回利用時、拡張機能のアイコンまたはコンテキストメニュー経由で Google へのログインを求められたら許可する。

**設定画面:** `chrome://extensions` で EventSnap の **「拡張機能のオプション」**（または拡張カードの **「詳細」→「拡張機能のオプション」**）を開くと、`options/options.html` に基づく設定ページが表示されます。

## 開発者向け（OAuth 設定）

認証情報は `manifest.json` の `oauth2.client_id` と、拡張 ID を固定するための `key` で構成されています。

`OAuth2 request failed: bad client id` が出る場合は、ほぼ確実に OAuth クライアント設定不整合です。以下を確認してください。

1. Google Cloud の OAuth クライアント種別が **Chrome 拡張機能**
2. OAuth クライアントの **アイテム ID** が、`chrome://extensions` に表示されている**現在の**拡張 ID と一致（別拡張・旧 ID のままだと `bad client id` になりやすい）
3. 該当 OAuth クライアントが削除・無効化されていない
4. `manifest.json` の `oauth2.client_id` が最新値

実行中の拡張が要求するリダイレクト URL は、実行時に表示されるエラーメッセージに出力されます（`chrome.identity.getRedirectURL()`）。
また、設定画面（`EventSnap 設定`）にも以下を表示しています。

- 拡張 ID
- Redirect URL
- `manifest.json` の `oauth2.client_id`

詳細手順は `requirements.md` の「付録 A：Google Cloud Platform セットアップ手順」を参照してください。

**補足：** コンソールの **「Google Auth Platform」→「概要」** に、プロジェクト診断で「安全な OAuth フロー」などの警告が出ることがあります。Chrome 拡張では `chrome.identity` と **Chrome 拡張機能用 OAuth クライアント**の組み合わせが標準です。警告の意味は画面の「詳細」を確認しつつ、まずは上記のクライアント種別・アイテム ID・`oauth2.client_id` の一致を優先してください（`requirements.md` の付録 A.0 も参照）。

## 変更履歴（抜粋）

- **1.0.1** — OAuth エラー案内の改善、設定画面での OAuth 照合情報表示、`options_page` を `options/options.html` に修正（拡張のオプションから正しく設定 UI を開けるようにした）、ドキュメント整備。
- **1.0.0** — 初版。

## フォルダ構成（概要）

| パス | 説明 |
|------|------|
| `manifest.json` | 拡張の定義・権限・OAuth 設定 |
| `background.js` | コンテキストメニューと予定フォーム用ポップアップウィンドウの起動 |
| `popup/` | ツールバーから開くポップアップ UI・予定フォーム |
| `options/` | 拡張のオプション画面（`manifest.json` の `options_page`） |
| `utils/` | 認証、Calendar API、日時パース |
| `icons/` | 拡張アイコン |
| `requirements.md` | 要件定義書 |
| `design/` | 配色モック（参考用、`nordic-palette-mock.html`） |

## ライセンス

未設定の場合は、リポジトリに `LICENSE` ファイルを追加して利用条件を明示することを推奨します。
