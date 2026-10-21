# Claude Pets

[English](README.md) · [Español](README.es.md) · [Português](README.pt.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Italiano](README.it.md) · **日本語** · [简体中文](README.zh.md) · [한국어](README.ko.md)

[Claude Code](https://claude.com/claude-code) のセッションが、8ビットのペットになって Mac の画面下を歩き回ります。

![Claude Pets](docs/zoo.png)

![Workers](docs/workers.png)

- **この Mac で作業中のセッションがそれぞれペットになります。** 各セッションにはいつも同じ動物（全23種）が割り当てられ、頭上に名前が表示されます。
- **2つのスタイル**を 🐾 メニューから選べます：歩き回るペット、または机でタイピングするオフィスの**ワーカー**。セッションにサブエージェントがいるとテーブルを囲んで**チームミーティング**をし、終わると飛び跳ねて喜びます。
- **吹き出し**に各エージェントが今していること（⌨️ コマンド、✏️ 編集中のファイル…）や、あなたの番のときは最後に言ったことが表示されます。
- **ミニ要約**（任意）：`claude` CLI にログインしていれば、Claude Haiku が各吹き出しに 7 語の要約を書きます（あなたのサブスクリプションを使用）。
- セッションが作業中からあなたの返信待ちに変わると、**通知**（サウンド付き）が届きます。クリックするとそのセッションが開きます。
- **作業中**のペットは歩き回り、**完了**したペットは緑の ✓ を出して寝転び、クリックされるのを待ちます。
- ペットを**クリック**すると、Claude デスクトップアプリでそのセッションを開きます。
- **マウスを重ねる**と、プロジェクト・状態・経過時間・サブセッション・実行中のサブエージェントを表示します。
- **サブエージェント**は小さなペットになって親の後ろに一列でついて歩きます。別のセッションから起動された**サブセッション**には `↳` が付きます。
- **バックグラウンド作業も数えます：** バックグラウンドのコマンドやサブエージェントを待っているセッションは、終わるまで ⏳ を表示します。10 分以上動いているコマンド（監視、サーバー）は数えません。
- 空いている部分は**クリックが通り抜ける**ので、作業の邪魔になりません。
- **多言語対応：** English, Español, Português, Français, Deutsch, Italiano, 日本語, 简体中文, 한국어（Mac の言語、またはメニューの 🌐 で選んだ言語）。

![Walk cycle](docs/cat-walk.png)

## インストール

macOS 14 以降と Xcode Command Line Tools（`xcode-select --install`）が必要です。

```sh
curl -fsSL https://raw.githubusercontent.com/javiermiz/claude-pets/main/install.sh | sh
```

インストーラーはお使いの Mac でソースからアプリをビルドし、`~/Applications/ClaudePets.app` に置きます。以降は Spotlight（「Claude Pets」）から開けます。

クローンからインストールする場合：

```sh
git clone https://github.com/javiermiz/claude-pets && cd claude-pets && ./build.sh
```

**ビルド済みのアプリをダウンロードすることもできます：** [Releases](https://github.com/javiermiz/claude-pets/releases/latest) から `ClaudePets.zip` を入手して展開し、`ClaudePets.app` をアプリケーションフォルダに移動します。Apple の公証を受けていないため、初回は macOS にブロックされます。**システム設定 → プライバシーとセキュリティ** を開いて**このまま開く**をクリックするか、`xattr -dr com.apple.quarantine /Applications/ClaudePets.app` を実行してください。

メニューバーの 🐾 から**ログイン時に開く**と**終了**を選べます。ペットを右クリックしても終了できます。

アップデートするには、インストールコマンドをもう一度実行します。アンインストールするには、アプリを終了して `~/Applications/ClaudePets.app` を削除します。

## 仕組み

すべてローカルで読み取り専用です。Mac の外に出るのは任意の要約だけです（制限を参照）。

| 内容 | 読み取り元 |
| -- | -- |
| セッション、名前、作業中/待機中 | `~/.claude/sessions/<pid>.json` |
| サブエージェント（直近60秒以内に書き込みがあれば実行中。説明は `*.meta.json` から） | `~/.claude/projects/<project>/<session>/subagents/agent-*.jsonl` |
| サブセッション（親セッションのトランスクリプトから） | `start_session` → `session_id: local_…` |
| バックグラウンドのコマンド（子プロセス） | `zsh`/`bash` ⟵ `claude` |
| セッションを開く（デスクトップアプリのディープリンク） | `claude://code/continue?session=<id>` |
| 吹き出し（最新の操作、最後のメッセージ） | `assistant` → `tool_use` / `text` |
| ミニ要約（任意） | `claude -p --model haiku` |

制限：

- 表示されるのはこの Mac のセッションだけです。クラウドのセッションは `~/.claude` に書き込みません。
- アプリ起動後に作業中だったセッションだけが表示されます。
- 要約は、セッションの作業の短い断片（最後の依頼、最近の操作、最後のメッセージ）を、あなた自身の Claude Code ログインを通じて Anthropic に送ります。CLI にログインしていなければ何も送られません。

## ドット絵を変更する

スプライトはドット絵用の言語 pxl を使って [`pets.px.js`](pets.px.js) にコードとして書かれています。各動物は 16×9 の体と脚のスタイルで構成され、歩行サイクル・輪郭・寝転んだポーズはそこから生成されます。生成済みのスプライトは `assets/` にあるので、アプリのビルドに pxl は不要です。編集したら、ドット絵を再生成してビルドし直します：

```sh
./sprites.sh && ./build.sh
```
