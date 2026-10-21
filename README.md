# Claude Pets

Your [Claude Code](https://claude.com/claude-code) sessions, as 8-bit pets walking along the bottom of your Mac screen.

![All the pets](docs/zoo.png)

- **Every session working on this Mac is a pet.** Each session always gets the same animal (23 of them), with its name floating above it.
- **Working** pets walk around. **Finished** ones lie down with a green ✓ and wait until you click them.
- **Click** a pet to jump to that session in the Claude desktop app.
- **Hover** for a card: project, status, how long ago, sub-sessions and running subagents.
- **Subagents** follow their parent as small pets in a line. **Sub-sessions** started from another session show a `↳`.
- **Background work counts:** a session waiting on background shells or subagents shows ⏳ and keeps walking until that work ends.
- **Clicks pass through** the empty space, so the strip never gets in your way.

![Walk cycle](docs/cat-walk.png)

## Install

Requires macOS 14+ and the Xcode Command Line Tools (`xcode-select --install`).

```sh
curl -fsSL https://raw.githubusercontent.com/javiermiz/claude-pets/main/install.sh | sh
```

The installer builds the app from source on your Mac and puts it in `~/Applications/ClaudePets.app`. After that you can open it from Spotlight ("Claude Pets").

Or install from a clone:

```sh
git clone https://github.com/javiermiz/claude-pets && cd claude-pets && ./build.sh
```

The 🐾 in the menu bar has two options: **Open at login** (Abrir al iniciar sesión) and **Quit**. Right-clicking a pet also quits.

To update, run the install command again. To uninstall, quit the app and delete `~/Applications/ClaudePets.app`.

## How it works

Everything is read-only and local. Nothing leaves your Mac.

| What | Source |
| -- | -- |
| Sessions, name, working/idle | `~/.claude/sessions/<pid>.json`, written by Claude Code for every live session |
| Subagents | `~/.claude/projects/<project>/<session>/subagents/agent-*.jsonl`, running if written in the last 60 s; the description comes from `*.meta.json` |
| Sub-sessions | `start_session` results in the parent's transcript (`session_id: local_…`) |
| Background shells | `zsh`/`bash` child processes of the session's `claude` process |
| Open a session | `claude://code/continue?session=<id>` deep link of the Claude desktop app |

Limits:

- Only sessions on this Mac show up. Cloud sessions don't write to `~/.claude`.
- Only sessions seen working since the app started appear.
- A long-running background server (a dev server, `rojo serve`…) keeps its pet walking until you stop it.
- The UI text is in Spanish.

## Changing the art

The sprites are written as code in [`pets.px.js`](pets.px.js) with pxl, a pixel-art DSL. Each animal is a 16×9 body plus a leg style. The walk cycle, outline and lying-down pose are generated from it. Built sprites live in `assets/`, so building the app doesn't need pxl.

After editing `pets.px.js`, regenerate the art and rebuild:

```sh
./sprites.sh && ./build.sh
```
