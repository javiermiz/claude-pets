# Claude Pets

[English](README.md) · [Español](README.es.md) · [Português](README.pt.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · **Italiano** · [日本語](README.ja.md) · [简体中文](README.zh.md) · [한국어](README.ko.md)

Le tue sessioni di [Claude Code](https://claude.com/claude-code) come animaletti 8-bit che passeggiano in fondo allo schermo del tuo Mac.

![Claude Pets](docs/zoo.png)

- **Ogni sessione al lavoro su questo Mac è un animaletto.** Una sessione ha sempre lo stesso animale (sono 23), con il suo nome sopra.
- Quelli **al lavoro** camminano. Quelli che hanno **finito** si sdraiano con una ✓ verde e aspettano il tuo clic.
- **Clicca** un animaletto per passare a quella sessione nell'app desktop di Claude.
- **Passaci sopra** con il mouse per una scheda: progetto, stato, da quanto, sottosessioni e subagenti attivi.
- I **subagenti** seguono la loro sessione in fila, più piccoli. Le **sottosessioni** avviate da un'altra sessione mostrano una `↳`.
- **Il lavoro in background conta:** una sessione che aspetta comandi o subagenti in background mostra ⏳ e continua a camminare finché non finiscono.
- **I clic attraversano** lo spazio vuoto, quindi la striscia non dà mai fastidio.
- **Parla la tua lingua:** English, Español, Português, Français, Deutsch, Italiano, 日本語, 简体中文, 한국어 (segue la lingua del sistema).

![Walk cycle](docs/cat-walk.png)

## Installazione

Richiede macOS 14 o successivo e i Command Line Tools di Xcode (`xcode-select --install`).

```sh
curl -fsSL https://raw.githubusercontent.com/javiermiz/claude-pets/main/install.sh | sh
```

L'installer compila l'app dai sorgenti sul tuo Mac e la mette in `~/Applications/ClaudePets.app`. Poi puoi aprirla da Spotlight ("Claude Pets").

Oppure da un clone:

```sh
git clone https://github.com/javiermiz/claude-pets && cd claude-pets && ./build.sh
```

La 🐾 nella barra dei menu ha **Apri al login** ed **Esci**. Anche il clic destro su un animaletto chiude l'app.

Per aggiornare, esegui di nuovo il comando di installazione. Per disinstallare, chiudi l'app ed elimina `~/Applications/ClaudePets.app`.

## Come funziona

Tutto è locale e in sola lettura. Niente lascia il tuo Mac.

| Cosa | Origine |
| -- | -- |
| Sessioni, nome, al lavoro/inattiva | `~/.claude/sessions/<pid>.json` |
| Subagenti (attivo = scritto negli ultimi 60 s; descrizione da `*.meta.json`) | `~/.claude/projects/<project>/<session>/subagents/agent-*.jsonl` |
| Sottosessioni (dal transcript della sessione madre) | `start_session` → `session_id: local_…` |
| Comandi in background (processi figli) | `zsh`/`bash` ⟵ `claude` |
| Aprire una sessione (deep link dell'app desktop) | `claude://code/continue?session=<id>` |

Limiti:

- Compaiono solo le sessioni di questo Mac. Le sessioni nel cloud non scrivono in `~/.claude`.
- Compaiono solo le sessioni viste al lavoro da quando l'app è stata aperta.
- Un server sempre attivo in background (un dev server…) fa camminare il suo animaletto finché non lo fermi.

## Modificare la grafica

Gli sprite sono scritti come codice in [`pets.px.js`](pets.px.js) con pxl, un linguaggio per pixel art. Ogni animale è un corpo 16×9 più uno stile di zampe; ciclo di camminata, contorno e posa sdraiata vengono generati da lì. Gli sprite già pronti sono in `assets/`, quindi compilare l'app non richiede pxl. Dopo le modifiche, rigenera la grafica e ricompila:

```sh
./sprites.sh && ./build.sh
```
