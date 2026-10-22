# Claude Pets

[English](README.md) · [Español](README.es.md) · [Português](README.pt.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · **Italiano** · [日本語](README.ja.md) · [简体中文](README.zh.md) · [한국어](README.ko.md)

Le tue sessioni di [Claude Code](https://claude.com/claude-code) come animaletti 8-bit che passeggiano in fondo allo schermo del tuo Mac.

[![Claude Pets promo](docs/promo/poster-en.png)](https://github.com/javiermiz/claude-pets/releases/download/v1.2.0/claude-pets-promo-en.mp4)

![Claude Pets](docs/zoo.png)

![Workers](docs/workers.png)

- **Ogni sessione al lavoro su questo Mac è un animaletto.** Una sessione ha sempre lo stesso animale (sono 23), con il suo nome sopra.
- **Due stili**, da scegliere nel menu 🐾: animaletti che passeggiano, oppure **impiegati** che scrivono alla scrivania, fanno una **riunione di team** attorno a un tavolo quando la sessione ha dei subagenti e saltano di gioia quando finiscono.
- **Fumetti** che dicono cosa sta facendo ogni agente in questo momento (⌨️ il comando, ✏️ il file che modifica…) o, quando tocca a te, cosa ti ha detto.
- **Mini-riassunti** (opzionale): se la CLI `claude` ha fatto l'accesso, Claude Haiku scrive una frase di 7 parole per ogni fumetto, con il tuo abbonamento. Il menu 🐾 mostra se sono attivi e apre `claude /login` per te.
- **Una notifica** (con suono) quando una sessione passa dal lavorare all'aspettare la tua risposta. Cliccala per aprire la sessione.
- Quelli **al lavoro** camminano. Quelli che hanno **finito** si sdraiano con una ✓ verde e aspettano il tuo clic.
- **Clicca** un animaletto per passare a quella sessione nell'app desktop di Claude.
- **Passaci sopra** con il mouse per una scheda: progetto, stato, da quanto, sottosessioni e subagenti attivi.
- I **subagenti** seguono la loro sessione in fila, più piccoli. Le **sottosessioni** avviate da un'altra sessione mostrano una `↳`.
- **Il lavoro in background conta:** una sessione che aspetta comandi o subagenti in background mostra ⏳ finché non finiscono. I comandi attivi da più di 10 minuti (watcher, server) non contano.
- **I clic attraversano** lo spazio vuoto, quindi la striscia non dà mai fastidio.
- **Parla la tua lingua:** English, Español, Português, Français, Deutsch, Italiano, 日本語, 简体中文, 한국어 (quella del Mac, o quella scelta in 🌐 nel menu).

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

**Oppure scarica l'app già compilata:** prendi `ClaudePets.zip` dalle [Release](https://github.com/javiermiz/claude-pets/releases/latest), decomprimilo e sposta `ClaudePets.app` in Applicazioni. Non è notarizzata da Apple, quindi la prima volta macOS la blocca: apri **Impostazioni di Sistema → Privacy e sicurezza** e fai clic su **Apri comunque**, oppure esegui `xattr -dr com.apple.quarantine /Applications/ClaudePets.app`.

La 🐾 nella barra dei menu ha **Apri al login** ed **Esci**. Anche il clic destro su un animaletto chiude l'app.

Per aggiornare, esegui di nuovo il comando di installazione. Per disinstallare, chiudi l'app ed elimina `~/Applications/ClaudePets.app`.

## Come funziona

Tutto è locale e in sola lettura. L'unica cosa che esce dal tuo Mac sono i riassunti opzionali (vedi Limiti).

| Cosa | Origine |
| -- | -- |
| Sessioni, nome, al lavoro/inattiva | `~/.claude/sessions/<pid>.json` |
| Subagenti (attivo = scritto negli ultimi 60 s; descrizione da `*.meta.json`) | `~/.claude/projects/<project>/<session>/subagents/agent-*.jsonl` |
| Sottosessioni (dal transcript della sessione madre) | `start_session` → `session_id: local_…` |
| Comandi in background (processi figli) | `zsh`/`bash` ⟵ `claude` |
| Aprire una sessione (deep link dell'app desktop) | `claude://code/continue?session=<id>` |
| Fumetti (ultima azione, ultimo messaggio) | `assistant` → `tool_use` / `text` |
| Mini-riassunti (opzionale) | `claude -p --model haiku` |

Limiti:

- Compaiono solo le sessioni di questo Mac. Le sessioni nel cloud non scrivono in `~/.claude`.
- Compaiono solo le sessioni viste al lavoro da quando l'app è stata aperta.
- I riassunti inviano ad Anthropic brevi frammenti di ciò che fanno le tue sessioni (l'ultima richiesta, le azioni recenti o l'ultimo messaggio) tramite il tuo accesso a Claude Code. Senza la CLI connessa non viene inviato nulla.

## Modificare la grafica

Gli sprite sono scritti come codice in [`pets.px.js`](pets.px.js) con pxl, un linguaggio per pixel art. Ogni animale è un corpo 16×9 più uno stile di zampe; ciclo di camminata, contorno e posa sdraiata vengono generati da lì. Gli sprite già pronti sono in `assets/`, quindi compilare l'app non richiede pxl. Dopo le modifiche, rigenera la grafica e ricompila:

```sh
./sprites.sh && ./build.sh
```
