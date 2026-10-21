# Claude Pets

[English](README.md) · **Español** · [Português](README.pt.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [简体中文](README.zh.md) · [한국어](README.ko.md)

Tus sesiones de [Claude Code](https://claude.com/claude-code) como mascotas 8-bit que pasean por la parte de abajo de la pantalla de tu Mac.

![Claude Pets](docs/zoo.png)

- **Cada sesión que trabaja en este Mac es una mascota.** A cada sesión le toca siempre el mismo animal (hay 23) y lleva su nombre encima.
- Las que **trabajan** caminan. Las que **terminaron** se tumban con un ✓ verde y esperan a que les hagas clic.
- **Clic** en una mascota para ir a esa sesión en la app de escritorio de Claude.
- **Pasa el ratón** por encima para ver una tarjeta: proyecto, estado, desde cuándo, sub-sesiones y subagentes activos.
- Los **subagentes** siguen a su sesión como mascotas pequeñas en fila. Las **sub-sesiones** lanzadas desde otra sesión llevan una `↳`.
- **El trabajo en segundo plano cuenta:** una sesión que espera comandos o subagentes en segundo plano muestra ⏳ y sigue caminando hasta que terminan.
- **Los clics atraviesan** el espacio vacío, así que la franja nunca estorba.
- **Habla tu idioma:** English, Español, Português, Français, Deutsch, Italiano, 日本語, 简体中文, 한국어 (sigue el idioma del sistema).

![Walk cycle](docs/cat-walk.png)

## Instalación

Requiere macOS 14 o superior y las Command Line Tools de Xcode (`xcode-select --install`).

```sh
curl -fsSL https://raw.githubusercontent.com/javiermiz/claude-pets/main/install.sh | sh
```

El instalador compila la app desde el código en tu Mac y la deja en `~/Applications/ClaudePets.app`. Después puedes abrirla desde Spotlight ("Claude Pets").

O desde un clon:

```sh
git clone https://github.com/javiermiz/claude-pets && cd claude-pets && ./build.sh
```

La 🐾 de la barra de menú tiene **Abrir al iniciar sesión** y **Salir**. El clic derecho sobre una mascota también cierra la app.

Para actualizar, vuelve a ejecutar el comando de instalación. Para desinstalar, cierra la app y borra `~/Applications/ClaudePets.app`.

## Cómo funciona

Todo es local y de solo lectura. Nada sale de tu Mac.

| Qué | De dónde |
| -- | -- |
| Sesiones, nombre, trabajando/inactiva | `~/.claude/sessions/<pid>.json` |
| Subagentes (activo = escribió en los últimos 60 s; descripción de `*.meta.json`) | `~/.claude/projects/<project>/<session>/subagents/agent-*.jsonl` |
| Sub-sesiones (del transcript de la sesión madre) | `start_session` → `session_id: local_…` |
| Comandos en segundo plano (procesos hijos) | `zsh`/`bash` ⟵ `claude` |
| Abrir una sesión (deep link de la app de escritorio) | `claude://code/continue?session=<id>` |

Límites:

- Solo aparecen las sesiones de este Mac. Las sesiones en la nube no escriben en `~/.claude`.
- Solo aparecen las sesiones que se vieron trabajando desde que se abrió la app.
- Un servidor que corre en segundo plano (un dev server…) mantiene su mascota caminando hasta que lo pares.

## Cambiar el arte

Los sprites están escritos como código en [`pets.px.js`](pets.px.js) con pxl, un lenguaje para pixel art. Cada animal es un cuerpo de 16×9 más un estilo de patas; el ciclo de caminar, el contorno y la pose tumbada salen de ahí. Los sprites ya generados están en `assets/`, así que compilar la app no necesita pxl. Después de editar, regenera el arte y recompila:

```sh
./sprites.sh && ./build.sh
```
