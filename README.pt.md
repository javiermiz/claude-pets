# Claude Pets

[English](README.md) · [Español](README.es.md) · **Português** · [Français](README.fr.md) · [Deutsch](README.de.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [简体中文](README.zh.md) · [한국어](README.ko.md)

Suas sessões do [Claude Code](https://claude.com/claude-code) como bichinhos 8-bit passeando pela parte de baixo da tela do seu Mac.

![Claude Pets](docs/zoo.png)

- **Cada sessão trabalhando neste Mac é um bichinho.** Cada sessão sempre recebe o mesmo animal (são 23), com o nome dela flutuando acima.
- Os que estão **trabalhando** andam. Os que **terminaram** deitam com um ✓ verde e esperam até você clicar.
- **Clique** em um bichinho para ir até aquela sessão no app de desktop do Claude.
- **Passe o mouse** para ver um cartão: projeto, status, há quanto tempo, subsessões e subagentes ativos.
- Os **subagentes** seguem a sessão como bichinhos pequenos em fila. **Subsessões** iniciadas a partir de outra sessão mostram um `↳`.
- **Trabalho em segundo plano conta:** uma sessão esperando comandos ou subagentes em segundo plano mostra ⏳ e continua andando até eles terminarem.
- **Os cliques atravessam** o espaço vazio, então a faixa nunca atrapalha.
- **Fala o seu idioma:** English, Español, Português, Français, Deutsch, Italiano, 日本語, 简体中文, 한국어 (segue o idioma do sistema).

![Walk cycle](docs/cat-walk.png)

## Instalação

Requer macOS 14 ou superior e as Command Line Tools do Xcode (`xcode-select --install`).

```sh
curl -fsSL https://raw.githubusercontent.com/javiermiz/claude-pets/main/install.sh | sh
```

O instalador compila o app a partir do código no seu Mac e o coloca em `~/Applications/ClaudePets.app`. Depois disso você pode abri-lo pelo Spotlight ("Claude Pets").

Ou a partir de um clone:

```sh
git clone https://github.com/javiermiz/claude-pets && cd claude-pets && ./build.sh
```

**Ou baixe o app já compilado:** pegue o `ClaudePets.zip` em [Releases](https://github.com/javiermiz/claude-pets/releases/latest), descompacte e mova o `ClaudePets.app` para Aplicativos. Ele não é notarizado pela Apple, então o macOS o bloqueia na primeira vez: abra **Ajustes do Sistema → Privacidade e Segurança** e clique em **Abrir Mesmo Assim**, ou rode `xattr -dr com.apple.quarantine /Applications/ClaudePets.app`.

A 🐾 na barra de menus tem **Abrir ao iniciar sessão** e **Sair**. Clicar com o botão direito em um bichinho também fecha o app.

Para atualizar, rode o comando de instalação de novo. Para desinstalar, feche o app e apague `~/Applications/ClaudePets.app`.

## Como funciona

Tudo é local e somente leitura. Nada sai do seu Mac.

| O quê | De onde |
| -- | -- |
| Sessões, nome, trabalhando/ociosa | `~/.claude/sessions/<pid>.json` |
| Subagentes (ativo = escreveu nos últimos 60 s; descrição de `*.meta.json`) | `~/.claude/projects/<project>/<session>/subagents/agent-*.jsonl` |
| Subsessões (do transcript da sessão principal) | `start_session` → `session_id: local_…` |
| Comandos em segundo plano (processos filhos) | `zsh`/`bash` ⟵ `claude` |
| Abrir uma sessão (deep link do app de desktop) | `claude://code/continue?session=<id>` |

Limites:

- Só aparecem as sessões deste Mac. Sessões na nuvem não escrevem em `~/.claude`.
- Só aparecem as sessões vistas trabalhando desde que o app foi aberto.
- Um servidor rodando em segundo plano (um dev server…) mantém o bichinho andando até você pará-lo.

## Mudando a arte

Os sprites são escritos como código em [`pets.px.js`](pets.px.js) com pxl, uma linguagem para pixel art. Cada animal é um corpo de 16×9 mais um estilo de patas; o ciclo de caminhada, o contorno e a pose deitada são gerados a partir disso. Os sprites prontos ficam em `assets/`, então compilar o app não precisa do pxl. Depois de editar, gere a arte de novo e recompile:

```sh
./sprites.sh && ./build.sh
```
