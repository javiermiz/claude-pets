# Claude Pets

[English](README.md) · **Español** · [Português](README.pt.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [简体中文](README.zh.md) · [한국어](README.ko.md)

Tus sesiones de [Claude Code](https://claude.com/claude-code) como mascotas 8-bit que pasean por la parte de abajo de tu pantalla, en macOS y Windows.

![Claude Pets](docs/zoo.png)

![Workers](docs/workers.png)

- **Cada sesión que trabaja en este Mac es una mascota.** A cada sesión le toca siempre el mismo animal (hay 23) y lleva su nombre encima.
- **Dos estilos**, a elegir en el menú 🐾: mascotas que pasean, o **trabajadores** de oficina que teclean en su escritorio, hacen una **reunión de equipo** alrededor de una mesa cuando su sesión tiene subagentes y saltan de alegría al terminar.
- **Burbujas** que dicen qué hace cada agente en ese momento (⌨️ el comando, ✏️ el archivo que edita…) o, cuando te toca, qué te dijo.
- **Resúmenes cortitos** (opcional): si el CLI `claude` tiene sesión iniciada, Claude Haiku escribe una frase de 7 palabras para cada burbuja, con tu suscripción. El menú 🐾 te dice si están activos y abre `claude /login` por ti.
- **Una notificación** (con sonido) cuando una sesión pasa de trabajar a esperar tu respuesta. Al pulsarla se abre la sesión.
- Las que **trabajan** caminan. Las que **terminaron** se tumban con un ✓ verde y esperan a que les hagas clic.
- **Clic** en una mascota para ir a esa sesión en la app de escritorio de Claude.
- **Pasa el cursor** por encima para ver una tarjeta: proyecto, estado, desde cuándo, sub-sesiones y subagentes activos.
- Los **subagentes** siguen a su sesión como mascotas pequeñas en fila. Las **sub-sesiones** lanzadas desde otra sesión llevan una `↳`.
- **El trabajo en segundo plano cuenta:** una sesión que espera comandos o subagentes en segundo plano muestra ⏳ hasta que terminan. Los comandos que llevan más de 10 minutos (vigilantes, servidores) no cuentan.
- **Los clics atraviesan** el espacio vacío, así que la franja nunca estorba.
- **Habla tu idioma:** English, Español, Português, Français, Deutsch, Italiano, 日本語, 简体中文, 한국어 (el del Mac, o el que elijas en 🌐 del menú).

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

**O descarga la app ya compilada:** baja `ClaudePets.zip` desde [Releases](https://github.com/javiermiz/claude-pets/releases/latest), descomprímelo y mueve `ClaudePets.app` a Aplicaciones. No está notarizada por Apple, así que la primera vez macOS la bloquea: abre **Ajustes del Sistema → Privacidad y seguridad** y pulsa **Abrir igualmente**, o ejecuta `xattr -dr com.apple.quarantine /Applications/ClaudePets.app`.

La 🐾 de la barra de menú tiene **Abrir al iniciar sesión** y **Salir**. El clic derecho sobre una mascota también cierra la app.

Para actualizar, vuelve a ejecutar el comando de instalación. Para desinstalar, cierra la app y borra `~/Applications/ClaudePets.app`.

## Windows

Requiere Windows 10 u 11 (x64). En PowerShell:

```powershell
irm https://raw.githubusercontent.com/javiermiz/claude-pets/main/install.ps1 | iex
```

Esto descarga el último instalador desde [Releases](https://github.com/javiermiz/claude-pets/releases/latest), instala Claude Pets para tu usuario (sin permisos de administrador) y la abre. También puedes descargar `ClaudePets-Setup.exe` desde Releases y abrirlo con doble clic, o bajar el portable `ClaudePets-windows-x64.zip`, descomprimirlo donde quieras y ejecutar `ClaudePets.exe`. No están firmados, así que la primera vez SmartScreen puede avisarte: **Más información → Ejecutar de todas formas**.

La 🐾 vive en el área de notificaciones (bandeja del sistema): haz clic derecho para ver el mismo menú que en Mac. Los resúmenes con IA usan el CLI `claude` instalado de forma nativa (`%USERPROFILE%\.local\bin\claude.exe`) o con npm.

La versión de Windows está hecha con Electron (la carpeta `windows/`), así que pesa más (instalador de ~80 MB). Todavía no cuenta las shells en segundo plano: una sesión que solo espera una shell en segundo plano aparece como terminada. Para desinstalarla: **Configuración → Aplicaciones → Claude Pets**. Para compilarla tú (en cualquier sistema, con Node.js):

```sh
cd windows && npm install && npm run dist
```

## Cómo funciona

Todo es local y de solo lectura. Lo único que sale de tu Mac son los resúmenes opcionales (ver Límites).

| Qué | De dónde |
| -- | -- |
| Sesiones, nombre, trabajando/inactiva | `~/.claude/sessions/<pid>.json` |
| Subagentes (activo = escribió en los últimos 60 s; descripción de `*.meta.json`) | `~/.claude/projects/<project>/<session>/subagents/agent-*.jsonl` |
| Sub-sesiones (del transcript de la sesión madre) | `start_session` → `session_id: local_…` |
| Comandos en segundo plano (procesos hijos) | `zsh`/`bash` ⟵ `claude` |
| Abrir una sesión (deep link de la app de escritorio) | `claude://code/continue?session=<id>` |
| Burbujas (última acción, último mensaje) | `assistant` → `tool_use` / `text` |
| Resúmenes cortitos (opcional) | `claude -p --model haiku` |

Límites:

- Solo aparecen las sesiones de este Mac. Las sesiones en la nube no escriben en `~/.claude`.
- Solo aparecen las sesiones que se vieron trabajando desde que se abrió la app.
- Los resúmenes envían a Anthropic fragmentos cortos de lo que hacen tus sesiones (la última petición, acciones recientes o el último mensaje) a través de tu propio login de Claude Code. Sin el CLI con sesión iniciada no se envía nada.

## Cambiar el arte

Los sprites están escritos como código en [`pets.px.js`](pets.px.js) con pxl, un lenguaje para pixel art. Cada animal es un cuerpo de 16×9 más un estilo de patas; el ciclo de caminar, el contorno y la pose tumbada salen de ahí. Los sprites ya generados están en `assets/`, así que compilar la app no necesita pxl. Después de editar, regenera el arte y recompila:

```sh
./sprites.sh && ./build.sh
```
