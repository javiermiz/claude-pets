# Claude Pets

[English](README.md) · [Español](README.es.md) · [Português](README.pt.md) · [Français](README.fr.md) · **Deutsch** · [Italiano](README.it.md) · [日本語](README.ja.md) · [简体中文](README.zh.md) · [한국어](README.ko.md)

Deine [Claude Code](https://claude.com/claude-code)-Sitzungen als 8-Bit-Haustiere, die am unteren Rand deines Mac-Bildschirms herumlaufen.

![Claude Pets](docs/zoo.png)

![Workers](docs/workers.png)

- **Jede arbeitende Sitzung auf diesem Mac ist ein Haustier.** Eine Sitzung bekommt immer dasselbe Tier (es gibt 23), mit ihrem Namen darüber.
- **Zwei Stile**, wählbar im 🐾-Menü: Haustiere, die herumlaufen, oder **Büroangestellte**, die an ihrem Schreibtisch tippen, ein **Team-Meeting** um einen Tisch abhalten, wenn ihre Sitzung Subagenten hat, und vor Freude springen, wenn sie fertig sind.
- **Sprechblasen** zeigen, was jeder Agent gerade macht (⌨️ der Befehl, ✏️ die Datei, die er bearbeitet…) oder, wenn du dran bist, was er dir gesagt hat.
- **Mini-Zusammenfassungen** (optional): Ist die `claude`-CLI angemeldet, schreibt Claude Haiku für jede Blase einen Satz mit 7 Wörtern – über dein Abo.
- **Eine Benachrichtigung** (mit Ton), wenn eine Sitzung vom Arbeiten zum Warten auf deine Antwort wechselt. Ein Klick öffnet die Sitzung.
- **Arbeitende** Tiere laufen herum. **Fertige** legen sich mit einem grünen ✓ hin und warten auf deinen Klick.
- **Klicke** auf ein Tier, um zu seiner Sitzung in der Claude-Desktop-App zu springen.
- **Fahre mit der Maus darüber** für eine Karte: Projekt, Status, seit wann, Untersitzungen und laufende Subagenten.
- **Subagenten** folgen ihrer Sitzung als kleine Tiere in einer Reihe. **Untersitzungen**, die aus einer anderen Sitzung gestartet wurden, zeigen ein `↳`.
- **Hintergrundarbeit zählt:** Eine Sitzung, die auf Hintergrundbefehle oder Subagenten wartet, zeigt ⏳, bis diese fertig sind. Befehle, die länger als 10 Minuten laufen (Wächter, Server), zählen nicht.
- **Klicks gehen durch** den leeren Bereich hindurch, der Streifen stört also nie.
- **Spricht deine Sprache:** English, Español, Português, Français, Deutsch, Italiano, 日本語, 简体中文, 한국어 (die des Macs oder die unter 🌐 im Menü gewählte).

![Walk cycle](docs/cat-walk.png)

## Installation

Benötigt macOS 14 oder neuer und die Xcode Command Line Tools (`xcode-select --install`).

```sh
curl -fsSL https://raw.githubusercontent.com/javiermiz/claude-pets/main/install.sh | sh
```

Das Installationsskript baut die App aus dem Quellcode auf deinem Mac und legt sie unter `~/Applications/ClaudePets.app` ab. Danach kannst du sie über Spotlight öffnen („Claude Pets“).

Oder aus einem Klon:

```sh
git clone https://github.com/javiermiz/claude-pets && cd claude-pets && ./build.sh
```

**Oder lade die fertige App herunter:** Hol dir `ClaudePets.zip` unter [Releases](https://github.com/javiermiz/claude-pets/releases/latest), entpacke sie und verschiebe `ClaudePets.app` in den Programme-Ordner. Sie ist nicht von Apple notarisiert, daher blockiert macOS sie beim ersten Start: Öffne **Systemeinstellungen → Datenschutz & Sicherheit** und klicke auf **Dennoch öffnen**, oder führe `xattr -dr com.apple.quarantine /Applications/ClaudePets.app` aus.

Die 🐾 in der Menüleiste bietet **Bei Anmeldung öffnen** und **Beenden**. Ein Rechtsklick auf ein Tier beendet die App ebenfalls.

Zum Aktualisieren führe den Installationsbefehl erneut aus. Zum Deinstallieren beende die App und lösche `~/Applications/ClaudePets.app`.

## So funktioniert es

Alles ist lokal und nur lesend. Das Einzige, was deinen Mac verlässt, sind die optionalen Zusammenfassungen (siehe Grenzen).

| Was | Quelle |
| -- | -- |
| Sitzungen, Name, arbeitet/inaktiv | `~/.claude/sessions/<pid>.json` |
| Subagenten (aktiv = in den letzten 60 s geschrieben; Beschreibung aus `*.meta.json`) | `~/.claude/projects/<project>/<session>/subagents/agent-*.jsonl` |
| Untersitzungen (aus dem Transkript der Eltern-Sitzung) | `start_session` → `session_id: local_…` |
| Hintergrundbefehle (Kindprozesse) | `zsh`/`bash` ⟵ `claude` |
| Sitzung öffnen (Deep Link der Desktop-App) | `claude://code/continue?session=<id>` |
| Blasen (letzte Aktion, letzte Nachricht) | `assistant` → `tool_use` / `text` |
| Mini-Zusammenfassungen (optional) | `claude -p --model haiku` |

Grenzen:

- Nur Sitzungen auf diesem Mac erscheinen. Cloud-Sitzungen schreiben nicht nach `~/.claude`.
- Es erscheinen nur Sitzungen, die seit dem Start der App beim Arbeiten gesehen wurden.
- Die Zusammenfassungen schicken kurze Ausschnitte dessen, was deine Sitzungen tun (die letzte Anfrage, letzte Aktionen oder die letzte Nachricht), über deinen eigenen Claude-Code-Login an Anthropic. Ohne angemeldete CLI wird nichts gesendet.

## Die Grafiken ändern

Die Sprites sind als Code in [`pets.px.js`](pets.px.js) mit pxl geschrieben, einer Sprache für Pixel-Art. Jedes Tier ist ein 16×9-Körper plus ein Beinstil; Laufzyklus, Umriss und Liegepose werden daraus erzeugt. Die fertigen Sprites liegen in `assets/`, daher braucht der Build der App kein pxl. Nach dem Bearbeiten die Grafiken neu erzeugen und neu bauen:

```sh
./sprites.sh && ./build.sh
```
