// Claude Pets for Windows: the same companion as main.swift, in Electron. This process reads the sessions
// and owns the tray, notifications and summaries; index.html draws and animates the pets.
const { app, BrowserWindow, Tray, Menu, Notification, screen, shell, ipcMain } = require('electron')
const fs = require('fs'), path = require('path'), os = require('os'), { spawn } = require('child_process')

const AUMID = 'com.javiermiz.claudepets'
const HOME = os.homedir(), CLAUDE = path.join(HOME, '.claude')
if (!app.requestSingleInstanceLock()) app.exit()

// 1. Settings and language
const settingsFile = () => path.join(app.getPath('userData'), 'settings.json')
let settings = {}
const save = () => fs.writeFileSync(settingsFile(), JSON.stringify(settings))
const { keys, table } = require('./i18n.json')
const languages = [['en', 'English'], ['es', 'Español'], ['pt', 'Português'], ['fr', 'Français'], ['de', 'Deutsch'],
  ['it', 'Italiano'], ['ja', '日本語'], ['zh', '简体中文'], ['ko', '한국어']]
const lang = () => settings.lang || app.getLocale().split('-')[0]
function tr(en, ...args) {
  const i = keys.indexOf(en), s = (i >= 0 && table[lang()]?.[i]) || en
  return s.replace(/%[@d]/g, () => args.shift())
}

// 2. Transcripts: what an agent is doing, from the newest assistant entries
const firstLine = (t) => t.replace(/[*`#>]/g, '').split('\n').map((l) => l.trim()).find(Boolean)?.slice(0, 140)
function describe(tool, i) {
  const str = (k) => (typeof i[k] === 'string' && firstLine(i[k])) || ''
  const file = path.basename(i.file_path || i.notebook_path || '')
  switch (tool) {
    case 'Bash': case 'PowerShell': return '⌨️ ' + (str('description') || str('command'))
    case 'Edit': case 'Write': case 'MultiEdit': case 'NotebookEdit': return '✏️ ' + file
    case 'Read': return '📖 ' + file
    case 'Grep': case 'Glob': return '🔎 ' + str('pattern')
    case 'WebFetch': try { return '🌐 ' + new URL(str('url')).host } catch { return '🌐 web' }
    case 'WebSearch': return '🌐 ' + str('query')
    case 'Agent': case 'Task': return '🤖 ' + str('description')
    case 'TodoWrite': return '📋'
    default: return tool.startsWith('mcp__') ? '🔌 ' + tool.split('_').pop() : '🔧 ' + tool
  }
}
function activity(text) {
  const out = { recent: [] }
  for (const raw of text.split('\n').reverse()) {
    if (out.recent.length >= 8 && out.said && out.prompt) break
    if (!raw || raw.length > 3e6) continue
    let o; try { o = JSON.parse(raw) } catch { continue }
    if (o.type === 'last-prompt') { out.prompt ??= o.lastPrompt?.slice(0, 400); continue }
    if (o.type !== 'assistant' || !Array.isArray(o.message?.content)) continue
    for (const b of [...o.message.content].reverse()) {
      if (b.type === 'tool_use') {
        const d = describe(b.name || '', b.input || {})
        out.doing ??= d
        if (out.recent.length < 8) out.recent.unshift(d)
      }
      const line = b.type === 'text' && typeof b.text === 'string' && firstLine(b.text)
      if (line) {
        if (!out.said) { out.said = '💬 ' + line; out.saidFull = b.text.slice(0, 600) }
        out.doing ??= '💬 ' + line
        if (out.recent.length < 8) out.recent.unshift('💬 ' + line)
      }
    }
  }
  return out
}
function tail(file, from) { // bytes from an offset to the end of a file
  const fd = fs.openSync(file, 'r')
  try {
    const size = fs.fstatSync(fd).size, buf = Buffer.alloc(Math.max(0, size - from))
    fs.readSync(fd, buf, 0, buf.length, from)
    return buf
  } finally { fs.closeSync(fd) }
}

// 3. Summaries: tiny bubble labels by Claude Haiku through the user's own Claude Code CLI
const cacheDir = () => path.join(app.getPath('userData'), 'summaries') // its own sessions land here, so we skip them
const exe = (process.platform === 'win32'
  ? [path.join(HOME, '.local', 'bin', 'claude.exe'), path.join(process.env.APPDATA || '', 'npm', 'claude.cmd')]
  : [path.join(HOME, '.local/bin/claude'), '/opt/homebrew/bin/claude', '/usr/local/bin/claude']).find((f) => fs.existsSync(f))
const summarizer = { status: exe ? 'checking' : 'noCLI', cache: {}, running: false, pausedUntil: 0 }
function label(key, input, every) {
  const c = summarizer.cache[key]
  if (!summarizer.running && exe && Date.now() > summarizer.pausedUntil && (!c || (c.input !== input && Date.now() - c.at > every * 1000))) summarize(key, input)
  return c?.text || undefined
}
function summarize(key, input) {
  summarizer.running = true
  fs.mkdirSync(cacheDir(), { recursive: true })
  const language = new Intl.DisplayNames(['en'], { type: 'language' }).of(lang()) || 'English'
  const prompt = `Write a tiny status label (at most 7 words) in ${language} for a speech bubble over an AI coding agent. ` +
    'If it is working, say what it is doing, starting with a gerund. If it finished its turn, say what it needs ' +
    `from the user or what it delivered. Reply with only the label: no quotes, no emoji, no final period.\n\n${input}`
  // only the model call: no tools, hooks, plugins, MCP servers or project settings; the prompt goes in through stdin
  const cmd = exe.endsWith('.cmd') // npm installs ship a .cmd shim, which only runs through the shell
  const args = ['-p', '--restricted', '--strict-mcp-config', '--tools', cmd ? '""' : '', '--disable-slash-commands',
    '--model', 'haiku', '--no-session-persistence']
  // on macOS, wall off Documents/Desktop/Downloads so the system never asks for them
  const walls = ['Documents', 'Desktop', 'Downloads'].map((d) => `(subpath "${path.join(HOME, d)}")`).join(' ')
  const p = process.platform === 'darwin'
    ? spawn('/usr/bin/sandbox-exec', ['-p', `(version 1)(allow default)(deny file-read* file-write* ${walls})`, exe, ...args], { cwd: cacheDir() })
    : spawn(exe, args, { cwd: cacheDir(), shell: cmd, windowsHide: true })
  let raw = '', err = ''
  p.stdout.on('data', (d) => (raw += d)); p.stderr.on('data', (d) => (err += d))
  p.stdin.end(prompt)
  const done = (code) => {
    if (!summarizer.running) return
    const out = raw.trim().replace(/^["'.]+|["'.]+$/g, '')
    const ok = code === 0 && out && out.length < 120
    if (ok) summarizer.status = 'on'
    else if (/log ?in|authenticat|OAuth/i.test(raw + err)) { summarizer.status = 'needsLogin'; summarizer.pausedUntil = Date.now() + 60e3 }
    else summarizer.pausedUntil = Date.now() + 600e3
    summarizer.cache[key] = { input, text: ok ? out : summarizer.cache[key]?.text || '', at: Date.now() }
    summarizer.running = false
    buildMenu()
  }
  p.on('close', done)
  p.on('error', () => { summarizer.status = 'noCLI'; done(1) })
}

// 4. Store: one JSON per live session in ~/.claude/sessions, polled every 2 s
const alive = (pid) => { try { process.kill(pid, 0); return true } catch (e) { return e.code === 'EPERM' } }
const transcripts = {}, offsets = {}, activities = {}, parentOf = {}
const seenBusy = new Set()
let wasBusy = new Set()
function transcriptOf(s) {
  if (s.sessionId in transcripts) return transcripts[s.sessionId]
  let dirs = []; try { dirs = fs.readdirSync(path.join(CLAUDE, 'projects')) } catch {}
  return (transcripts[s.sessionId] = dirs.map((d) => path.join(CLAUDE, 'projects', d, s.sessionId + '.jsonl')).find((f) => fs.existsSync(f)))
}
// reads only what was appended since the last pass: activity, and sub-session links "(session_id: local_…"
function scan(s) {
  const file = transcriptOf(s)
  if (!file) return
  let buf; try { buf = tail(file, offsets[s.sessionId] || 0) } catch { return }
  const nl = buf.lastIndexOf(10)
  if (nl < 0) return
  offsets[s.sessionId] = (offsets[s.sessionId] || 0) + nl + 1
  const text = buf.subarray(0, nl).toString('utf8'), fresh = activity(text), old = activities[s.sessionId] || { recent: [] }
  activities[s.sessionId] = { doing: fresh.doing ?? old.doing, said: fresh.said ?? old.said, saidFull: fresh.saidFull ?? old.saidFull,
    prompt: fresh.prompt ?? old.prompt, recent: [...old.recent, ...fresh.recent].slice(-8) }
  for (const m of text.matchAll(/\(session_id: (local_[0-9a-f-]{36})/g)) parentOf[m[1]] = s.sessionId
}
// subagents: <transcript>/subagents/agent-*.jsonl, running = written in the last 60 s
function subagents(s) {
  const file = transcriptOf(s)
  if (!file) return []
  const dir = path.join(file.slice(0, -'.jsonl'.length), 'subagents')
  let names = []; try { names = fs.readdirSync(dir).filter((f) => f.endsWith('.jsonl')).sort() } catch {}
  return names.flatMap((n) => {
    const f = path.join(dir, n)
    try {
      const st = fs.statSync(f)
      if (Date.now() - st.mtimeMs > 60e3) return []
      let desc; try { desc = JSON.parse(fs.readFileSync(f.replace(/\.jsonl$/, '.meta.json'))).description } catch {}
      const doing = activity(tail(f, Math.max(0, st.size - 65536)).toString('utf8')).doing
      return [{ id: n, desc: desc || tr('Subagent'), doing }]
    } catch { return [] }
  })
}
function project(cwd) {
  const p = cwd.replace(/\\/g, '/')
  if (p.includes('/scratch-workspaces/')) return tr('Chat (scratch)')
  const repo = p.split('/.claude/worktrees/')
  const name = repo[0].split('/').filter(Boolean).pop() || p
  return repo.length > 1 ? `${name} · worktree` : name
}
const openSession = (id) => id && shell.openExternal(`claude://code/continue?session=${id}`)
const notes = new Set() // a notification's click handler only fires while it's referenced
function notifyReady(s) {
  if (!Notification.isSupported()) return
  const n = new Notification({ title: s.name || s.project, body: tr('Ready for your reply') })
  notes.add(n)
  n.on('click', () => openSession(s.hostSessionId))
  n.on('close', () => notes.delete(n))
  n.show()
}

let sessions = [], all = []
function load() {
  let files = []; try { files = fs.readdirSync(path.join(CLAUDE, 'sessions')).filter((f) => f.endsWith('.json')) } catch {}
  all = files.flatMap((f) => { try { return [JSON.parse(fs.readFileSync(path.join(CLAUDE, 'sessions', f), 'utf8'))] } catch { return [] } })
    .filter((s) => s.sessionId && alive(s.pid) && path.resolve(s.cwd || '') !== path.resolve(cacheDir()))
  for (const s of all) {
    scan(s)
    s.project = project(s.cwd || '')
    s.turn = s.status === 'busy'
    s.subs = subagents(s)
    // ponytail: background shells are not counted here (macOS reads them from the process tree); add when Windows needs it
    s.waiting = s.turn ? 0 : s.subs.length
    s.busy = s.turn || s.waiting > 0
    if (s.busy) seenBusy.add(s.sessionId)
  }
  const live = all.filter((s) => seenBusy.has(s.sessionId))
  for (const s of live) if (!s.busy && wasBusy.has(s.sessionId)) notifyReady(s)
  wasBusy = new Set(live.filter((s) => s.busy).map((s) => s.sessionId))
  for (const s of live) { // labels: per task while working (at most every 90 s), once when the turn ends
    const a = activities[s.sessionId]
    if (!a) continue
    const input = s.busy
      ? `The user asked: ${a.prompt || '?'}\nRecent actions, oldest first:\n${a.recent.join('\n')}`
      : `It finished its turn and told the user:\n${a.saidFull || a.said || ''}`
    s.label = label(s.sessionId + (s.busy ? 'w' : 'd') + lang(), input, s.busy ? 90 : 0)
  }
  const since = (s) => s.statusUpdatedAt || 0
  sessions = live.sort((a, b) => (a.busy ? 0 : 1) - (b.busy ? 0 : 1) || since(b) - since(a))
  send()
}
function send() {
  if (!win) return
  const name = (s) => s.name || s.project
  win.webContents.send('state', {
    style: settings.style || 'pets', lang: lang(), sprites,
    strings: Object.fromEntries(keys.map((k) => [k, (table[lang()] || [])[keys.indexOf(k)] || k])),
    sessions: sessions.map((s) => {
      const a = activities[s.sessionId] || {}, parent = all.find((p) => p.sessionId === parentOf[s.hostSessionId])
      return { id: s.sessionId, name: s.name, project: s.project, busy: s.busy, turn: s.turn, waiting: s.waiting,
        since: s.statusUpdatedAt || 0, subs: s.subs, label: s.label, doing: a.doing, said: a.said,
        parent: parent && name(parent), kids: all.filter((k) => parentOf[k.hostSessionId] === s.sessionId).map((k) => ({ name: name(k), busy: k.busy })) }
    }),
  })
}

// sprite strips from pets.px.js: pets (5 frames), workers (12 frames) and the office furniture
const sprites = Object.fromEntries(['pets', 'workers'].map((d) =>
  [d, fs.readdirSync(path.join(__dirname, 'assets', d)).filter((f) => f.endsWith('.png')).sort().map((f) => f.slice(0, -4))]))

// 5. App: a transparent, click-through strip along the bottom of the screen, and a tray icon
let win, tray
function place() {
  const wa = screen.getPrimaryDisplay().workArea
  win.setBounds({ x: wa.x, y: wa.y + wa.height - 480, width: wa.width, height: 480 }) // tall enough for the hover card
}
function loginCLI() { // a terminal running `claude /login`
  if (!exe) return shell.openExternal('https://claude.com/claude-code')
  if (process.platform === 'win32') spawn('cmd.exe', ['/c', 'start', '"Claude login"', 'cmd', '/k', `"${exe}" /login`], { shell: true, detached: true })
  else { const f = path.join(cacheDir(), 'login.command'); fs.writeFileSync(f, `#!/bin/zsh -l\n'${exe}' /login\n`, { mode: 0o755 }); shell.openPath(f) }
  summarizer.pausedUntil = 0
}
function buildMenu() {
  if (!tray) return
  const set = (k, v) => () => { settings[k] = v; save(); buildMenu(); load() }
  const summary = {
    on: { label: tr('AI summaries on'), type: 'checkbox', checked: true },
    needsLogin: { label: tr('Turn on AI summaries (claude /login)…'), click: loginCLI },
    noCLI: { label: tr('AI summaries need the Claude Code CLI…'), click: () => shell.openExternal('https://claude.com/claude-code') },
    checking: { label: tr('AI summaries: checking…'), enabled: false },
  }[summarizer.status]
  const menu = Menu.buildFromTemplate([
    { label: tr('Pets'), type: 'radio', checked: settings.style !== 'workers', click: set('style', 'pets') },
    { label: tr('Workers'), type: 'radio', checked: settings.style === 'workers', click: set('style', 'workers') },
    { type: 'separator' },
    { label: '🌐 ' + (languages.find(([c]) => c === lang())?.[1] || lang()),
      submenu: languages.map(([c, n]) => ({ label: n, type: 'radio', checked: lang() === c, click: set('lang', c) })) },
    { label: tr('Open at login'), type: 'checkbox', checked: app.getLoginItemSettings().openAtLogin,
      click: (i) => app.setLoginItemSettings({ openAtLogin: i.checked }) },
    { type: 'separator' }, summary, { type: 'separator' },
    { label: tr('Quit'), role: 'quit' },
  ])
  tray.setContextMenu(menu)
  return menu
}

app.whenReady().then(() => {
  try { settings = JSON.parse(fs.readFileSync(settingsFile(), 'utf8')) } catch {}
  app.setAppUserModelId(AUMID)
  if (process.platform === 'win32' && app.isPackaged) { // Windows only shows toasts for apps with a Start Menu shortcut
    const lnk = path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Claude Pets.lnk')
    if (!fs.existsSync(lnk)) shell.writeShortcutLink(lnk, { target: process.execPath, appUserModelId: AUMID, icon: path.join(__dirname, 'icon.ico'), iconIndex: 0 })
  }
  if (process.platform === 'darwin') app.dock.hide()
  win = new BrowserWindow({ transparent: true, frame: false, resizable: false, movable: false, skipTaskbar: true, hasShadow: false,
    focusable: false, alwaysOnTop: true, show: false, webPreferences: { preload: path.join(__dirname, 'preload.js') } })
  win.setAlwaysOnTop(true, 'screen-saver')
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  win.setIgnoreMouseEvents(true, { forward: true }) // transparent pixels let clicks through
  place()
  screen.on('display-metrics-changed', place)
  win.loadFile('index.html')
  win.once('ready-to-show', () => { win.showInactive(); load() })
  tray = new Tray(path.join(__dirname, 'tray.png'))
  tray.setToolTip('Claude Pets')
  buildMenu()
  setInterval(load, 2000)
  ipcMain.on('mouse', (_, inside) => win.setIgnoreMouseEvents(!inside, { forward: true }))
  ipcMain.on('menu', () => buildMenu().popup())
  ipcMain.on('open', (_, id) => {
    const s = sessions.find((x) => x.sessionId === id)
    if (!s) return
    openSession(s.hostSessionId)
    if (!s.busy) { seenBusy.delete(id); load() }
  })
})
app.on('window-all-closed', (e) => e.preventDefault())
