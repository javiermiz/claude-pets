# Claude Pets

**English** · [Español](README.es.md) · [Português](README.pt.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [简体中文](README.zh.md) · [한국어](README.ko.md)

Your [Claude Code](https://claude.com/claude-code) sessions, as 8-bit pets walking along the bottom of your Mac screen.

[![Claude Pets promo](docs/promo/poster-en.png)](https://github.com/javiermiz/claude-pets/releases/download/v1.2.0/claude-pets-promo-en.mp4)

![Claude Pets](docs/zoo.png)

![Workers](docs/workers.png)

- **Every session working on this Mac is a pet.** Each session always gets the same animal (23 of them), with its name floating above it.
- **Two styles**, picked from the 🐾 menu: pets that walk around, or office **workers** who sit at their desks typing, hold a **team meeting** around a table when their session has subagents, and jump for joy when they finish.
- **Speech bubbles** say what each agent is doing right now (⌨️ the command, ✏️ the file it edits…) or, when it's your turn, what it told you.
- **Tiny summaries** (optional): if the `claude` CLI is logged in, Claude Haiku writes a 7-word label for each bubble, using your subscription. The 🐾 menu shows if they're on and opens `claude /login` for you.
- **A notification** (with sound) when a session goes from working to waiting for your reply. Click it to open the session.
- **Working** pets walk around. **Finished** ones lie down with a green ✓ and wait until you click them.
- **Click** a pet to jump to that session in the Claude desktop app.
- **Hover** for a card: project, status, how long ago, sub-sessions and running subagents.
- **Subagents** follow their parent as small pets in a line. **Sub-sessions** started from another session show a `↳`.
- **Background work counts:** a session waiting on background shells or subagents shows ⏳ until that work ends. Commands running for more than 10 minutes (watchers, servers) don't count.
- **Clicks pass through** the empty space, so the strip never gets in your way.
- **Speaks your language:** English, Español, Português, Français, Deutsch, Italiano, 日本語, 简体中文, 한국어 (the Mac's, or the one you pick under 🌐 in the menu).

![Walk cycle](docs/cat-walk.png)

## Install

Requires macOS 14+ and the Xcode Command Line Tools (`xcode-select --install`).

```sh
curl -fsSL https://raw.githubusercontent.com/javiermiz/claude-pets/main/install.sh | sh
```

The installer builds the app from source on your Mac and puts it in `~/Applications/ClaudePets.app`. After that you can open it from Spotlight ("Claude Pets").

Or from a clone:

```sh
git clone https://github.com/javiermiz/claude-pets && cd claude-pets && ./build.sh
```

**Or download the app already built:** get `ClaudePets.zip` from [Releases](https://github.com/javiermiz/claude-pets/releases/latest), unzip it and move `ClaudePets.app` to Applications. It isn't notarized by Apple, so macOS blocks it the first time: open **System Settings → Privacy & Security** and click **Open Anyway**, or run `xattr -dr com.apple.quarantine /Applications/ClaudePets.app`.

The 🐾 in the menu bar has **Open at login** and **Quit**. Right-clicking a pet also quits.

To update, run the install command again. To uninstall, quit the app and delete `~/Applications/ClaudePets.app`.

## How it works

Everything is read-only and local. The only thing that leaves your Mac is the optional summaries (see Limits).

| What | Source |
| -- | -- |
| Sessions, name, working/idle | `~/.claude/sessions/<pid>.json` |
| Subagents (running = written in the last 60 s; description from `*.meta.json`) | `~/.claude/projects/<project>/<session>/subagents/agent-*.jsonl` |
| Sub-sessions (from the parent's transcript) | `start_session` → `session_id: local_…` |
| Background shells (child processes) | `zsh`/`bash` ⟵ `claude` |
| Open a session (Claude desktop app deep link) | `claude://code/continue?session=<id>` |
| Bubbles (latest action, last message) | `assistant` → `tool_use` / `text` |
| Tiny summaries (optional) | `claude -p --model haiku` |

Limits:

- Only sessions on this Mac show up. Cloud sessions don't write to `~/.claude`.
- Only sessions seen working since the app started appear.
- Summaries send short snippets of what your sessions do (the last request, recent actions or the last message) to Anthropic through your own Claude Code login. Without a logged-in CLI nothing is sent.

## Changing the art

The sprites are written as code in [`pets.px.js`](pets.px.js) with pxl, a pixel-art DSL. Each animal is a 16×9 body plus a leg style. The walk cycle, outline and lying-down pose are generated from it. Built sprites live in `assets/`, so building the app doesn't need pxl. After editing, regenerate the art and rebuild:

```sh
./sprites.sh && ./build.sh
```
