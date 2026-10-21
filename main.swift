import SwiftUI
import AppKit
import ServiceManagement

// 1. Data — one JSON per live Claude Code session in ~/.claude/sessions
struct Session: Identifiable, Decodable {
    let pid: Int32
    let sessionId: String
    let cwd: String
    let name: String?
    let status: String?
    let statusUpdatedAt: Double?
    let hostSessionId: String? // desktop-app id, for the claude:// deep link
    var id: String { sessionId }
    var waiting: Int?                          // background shells + subagents still running (filled by Store)
    var turn: Bool { status == "busy" }        // mid-turn
    var busy: Bool { turn || (waiting ?? 0) > 0 } // not finished until its background work is done too
    var project: String {
        if cwd.contains("/scratch-workspaces/") { return tr("Chat (scratch)") }
        let repo = cwd.components(separatedBy: "/.claude/worktrees/") // worktree -> its repo
        let name = (repo[0] as NSString).lastPathComponent
        return repo.count > 1 ? "\(name) · worktree" : name
    }
    var since: Date { Date(timeIntervalSince1970: (statusUpdatedAt ?? 0) / 1000) }
}

struct Subagent: Identifiable { let id: String; let desc: String }

final class Store: ObservableObject {
    @Published var sessions: [Session] = []
    var all: [Session] = []                  // every live session, for parent/child names
    var parentOf: [String: String] = [:]     // child hostSessionId -> parent sessionId
    var subagents: [String: [Subagent]] = [:] // sessionId -> running Agent-tool subagents
    private var seenBusy: Set<String> = []   // finished but not yet clicked = "done"
    private var transcript: [String: URL] = [:]
    private var offset: [String: UInt64] = [:]
    private let home = FileManager.default.homeDirectoryForCurrentUser
    private var dir: URL { home.appendingPathComponent(".claude/sessions") }

    init() {
        load()
        Timer.scheduledTimer(withTimeInterval: 2, repeats: true) { [weak self] _ in self?.load() }
    }

    func load() {
        let files = (try? FileManager.default.contentsOfDirectory(at: dir, includingPropertiesForKeys: nil)) ?? []
        all = files.filter { $0.pathExtension == "json" }
            .compactMap { try? JSONDecoder().decode(Session.self, from: Data(contentsOf: $0)) }
            .filter { kill($0.pid, 0) == 0 } // stale files from dead processes
        all.forEach(scanLinks)
        for i in all.indices {
            subagents[all[i].id] = runningSubagents(all[i])
            if !all[i].turn { all[i].waiting = shells(all[i].pid) + subagents[all[i].id]!.count }
        }
        let live = all.filter { s in
                if s.busy { seenBusy.insert(s.id) }
                return seenBusy.contains(s.id)
            }
        sessions = live.sorted { ($0.busy ? 0 : 1, -$0.since.timeIntervalSince1970) < ($1.busy ? 0 : 1, -$1.since.timeIntervalSince1970) }
    }

    func children(of s: Session) -> [Session] { all.filter { parentOf[$0.hostSessionId ?? ""] == s.id } }
    func parent(of s: Session) -> Session? { all.first { $0.id == parentOf[s.hostSessionId ?? ""] } }

    private func transcriptURL(_ s: Session) -> URL? {
        if let u = transcript[s.id] { return u }
        let projects = home.appendingPathComponent(".claude/projects")
        let dirs = (try? FileManager.default.contentsOfDirectory(at: projects, includingPropertiesForKeys: nil)) ?? []
        let u = dirs.map { $0.appendingPathComponent(s.sessionId + ".jsonl") }.first { FileManager.default.fileExists(atPath: $0.path) }
        transcript[s.id] = u
        return u
    }

    // Sub-sessions: the parent's transcript holds start_session results "(session_id: local_…".
    // Reads only the bytes appended since the last pass.
    private func scanLinks(_ s: Session) {
        guard let url = transcriptURL(s), let h = try? FileHandle(forReadingFrom: url) else { return }
        defer { try? h.close() }
        try? h.seek(toOffset: offset[s.id] ?? 0)
        guard let data = try? h.readToEnd(), let nl = data.lastIndex(of: 10) else { return }
        offset[s.id] = (offset[s.id] ?? 0) + UInt64(nl + 1)
        guard data.range(of: Data("(session_id: local_".utf8)) != nil else { return }
        let text = String(decoding: data[...nl], as: UTF8.self)
        for m in text.matches(of: try! Regex(#"\(session_id: (local_[0-9a-f-]{36})"#)) { parentOf[String(text[m.output[1].range!])] = s.id }
    }

    // Background Bash tasks: each runs as a `zsh -c` child of the claude process
    private func shells(_ pid: Int32) -> Int {
        var kids = [pid_t](repeating: 0, count: 64)
        let n = Int(proc_listchildpids(pid, &kids, Int32(kids.count * MemoryLayout<pid_t>.size)))
        return kids.prefix(max(0, n)).filter { kid in
            var name = [CChar](repeating: 0, count: 64)
            proc_name(kid, &name, UInt32(name.count))
            return ["zsh", "bash", "sh"].contains(String(cString: name))
        }.count
    }

    // Subagents: <transcript>/subagents/agent-*.jsonl, running = written in the last 60 s
    private func runningSubagents(_ s: Session) -> [Subagent] {
        guard let base = transcriptURL(s)?.deletingPathExtension() else { return [] }
        let dir = base.appendingPathComponent("subagents")
        let files = (try? FileManager.default.contentsOfDirectory(at: dir, includingPropertiesForKeys: [.contentModificationDateKey])) ?? []
        return files.filter { $0.pathExtension == "jsonl" }
            .filter { (try? $0.resourceValues(forKeys: [.contentModificationDateKey]).contentModificationDate)
                .map { -$0.timeIntervalSinceNow < 60 } ?? false }
            .map { f in
                let meta = f.deletingPathExtension().appendingPathExtension("meta.json")
                let desc = (try? JSONSerialization.jsonObject(with: Data(contentsOf: meta)) as? [String: Any])?["description"] as? String
                return Subagent(id: f.lastPathComponent, desc: desc ?? tr("Subagent"))
            }
            .sorted { $0.id < $1.id }
    }

    func open(_ s: Session) {
        if let id = s.hostSessionId, let url = URL(string: "claude://code/continue?session=\(id)") {
            NSWorkspace.shared.open(url)
        }
        if !s.busy { seenBusy.remove(s.id); load() }
    }
}

// 2. World — a 30 fps tick moves busy pets along the floor; idle ones nap in place
final class World: ObservableObject {
    @Published var hovered: String?
    let store = Store()
    var width: CGFloat = NSScreen.main?.visibleFrame.width ?? 1000
    var t: Double = 0
    private var x: [String: CGFloat] = [:]
    private var vx: [String: CGFloat] = [:]
    private(set) var sub: [String: (x: CGFloat, right: Bool, moving: Bool)] = [:] // subagent ducklings

    init() {
        Timer.scheduledTimer(withTimeInterval: 1 / 30, repeats: true) { [weak self] _ in self?.tick() }
    }

    func pos(_ s: Session) -> CGFloat {
        if let p = x[s.id] { return p }
        let p = CGFloat.random(in: 40...max(41, width - 40))
        x[s.id] = p
        return p
    }

    func facingRight(_ s: Session) -> Bool { (vx[s.id] ?? -1) > 0 }

    func tick() {
        let dt = 1.0 / 30
        t += dt
        for s in store.sessions where s.busy && s.id != hovered {
            var v = vx[s.id] ?? (Bool.random() ? 1 : -1) * .random(in: 60...140)
            if Double.random(in: 0..<1) < 0.004 { v = -v } // wander
            var p = pos(s) + v * dt
            if p < 30 || p > width - 30 { v = -v; p = min(max(p, 30), width - 30) }
            x[s.id] = p
            vx[s.id] = v
        }
        // ducklings: each follows the one ahead at its own pace, so a U-turn snakes instead of jumping
        for s in store.sessions {
            var leader = pos(s)
            for (k, a) in (store.subagents[s.id] ?? []).enumerated() {
                let key = s.id + a.id
                var d = sub[key] ?? (leader, facingRight(s), false)
                let gap: CGFloat = k == 0 ? 44 : 34
                let dist = leader - d.x
                d.moving = abs(dist) > gap + 1
                if d.moving {
                    d.x += (dist > 0 ? 1 : -1) * min(abs(dist) - gap, 180 * dt)
                    d.right = dist > 0
                }
                sub[key] = d
                leader = d.x
            }
        }
        objectWillChange.send()
    }
}

// Pixel-art pets from pets.px.js (out/anims/*.png: 5 frames side by side, 0-3 walk, 4 lying down)
let sprites: [[CGImage]] = {
    let urls = Bundle.main.urls(forResourcesWithExtension: "png", subdirectory: "pets") ?? []
    return urls.sorted { $0.lastPathComponent < $1.lastPathComponent }.compactMap { url in
        guard let src = CGImageSourceCreateWithURL(url as CFURL, nil),
              let img = CGImageSourceCreateImageAtIndex(src, 0, nil) else { return nil }
        let w = img.width / 5
        return (0..<5).compactMap { img.cropping(to: CGRect(x: $0 * w, y: 0, width: w, height: img.height)) }
    }
}()
func seed(_ key: String) -> UInt32 { key.utf8.reduce(UInt32(0)) { $0 &* 31 &+ UInt32($1) } }
func seed(_ s: Session) -> UInt32 { seed(s.sessionId) }
func frames(_ key: String) -> [CGImage] { sprites[Int((seed(key) >> 13) % UInt32(sprites.count))] } // low bits barely vary across uuids
func frames(for s: Session) -> [CGImage] { frames(s.sessionId) }

func ago(_ d: Date) -> String { RelativeDateTimeFormatter().localizedString(for: d, relativeTo: Date()) }

// UI strings follow the system language; anything missing falls back to English
let keys = ["Untitled", "Working · %@", "Waiting on %d in background", "Finished %@", "Started by %@", "Sub-sessions",
            "Subagents working", "Click to open", "Finished · click to see it", "Open at login", "Quit", "Subagent", "Chat (scratch)"]
let table: [String: [String]] = [
    "es": ["Sin nombre", "Trabajando · %@", "Esperando %d en segundo plano", "Terminó %@", "Lanzada por %@", "Sub-sesiones",
           "Subagentes trabajando", "Clic para abrir", "Terminó · clic para verlo", "Abrir al iniciar sesión", "Salir", "Subagente", "Chat (scratch)"],
    "pt": ["Sem nome", "Trabalhando · %@", "Aguardando %d em segundo plano", "Terminou %@", "Iniciada por %@", "Subsessões",
           "Subagentes trabalhando", "Clique para abrir", "Terminou · clique para ver", "Abrir ao iniciar sessão", "Sair", "Subagente", "Chat (scratch)"],
    "fr": ["Sans nom", "Au travail · %@", "En attente de %d en arrière-plan", "Terminé %@", "Lancée par %@", "Sous-sessions",
           "Sous-agents au travail", "Cliquer pour ouvrir", "Terminé · cliquer pour voir", "Ouvrir à la connexion", "Quitter", "Sous-agent", "Chat (scratch)"],
    "de": ["Ohne Namen", "Arbeitet · %@", "Wartet auf %d im Hintergrund", "Fertig %@", "Gestartet von %@", "Untersitzungen",
           "Arbeitende Subagenten", "Zum Öffnen klicken", "Fertig · zum Ansehen klicken", "Bei Anmeldung öffnen", "Beenden", "Subagent", "Chat (scratch)"],
    "it": ["Senza nome", "Al lavoro · %@", "In attesa di %d in background", "Finito %@", "Avviata da %@", "Sottosessioni",
           "Subagenti al lavoro", "Clicca per aprire", "Finito · clicca per vederlo", "Apri al login", "Esci", "Subagente", "Chat (scratch)"],
    "ja": ["無題", "作業中 · %@", "バックグラウンドで%d件待機中", "完了 %@", "起動元: %@", "サブセッション",
           "作業中のサブエージェント", "クリックで開く", "完了 · クリックで表示", "ログイン時に開く", "終了", "サブエージェント", "チャット (scratch)"],
    "zh": ["未命名", "工作中 · %@", "正在等待 %d 个后台任务", "已完成 %@", "由 %@ 启动", "子会话",
           "工作中的子代理", "点击打开", "已完成 · 点击查看", "登录时打开", "退出", "子代理", "聊天 (scratch)"],
    "ko": ["이름 없음", "작업 중 · %@", "백그라운드 작업 %d개 대기 중", "완료 %@", "시작한 세션: %@", "하위 세션",
           "작업 중인 서브에이전트", "클릭하여 열기", "완료 · 클릭하여 보기", "로그인 시 열기", "종료", "서브에이전트", "채팅 (scratch)"],
]
let lang = Locale.preferredLanguages.first?.components(separatedBy: "-").first ?? "en"
func tr(_ en: String, _ args: CVarArg...) -> String {
    let s = keys.firstIndex(of: en).flatMap { table[lang]?[$0] } ?? en
    return String(format: s, arguments: args)
}

// 3. Views
struct PetView: View {
    let s: Session
    @ObservedObject var world: World

    var body: some View {
        let hovered = world.hovered == s.id
        let f = frames(for: s)
        // working: walk cycle; done: lies down and waits for a click
        let i = !s.busy ? 4 : hovered ? 1 : (Int(world.t * 8) + Int(seed(s) % 4)) % 4
        let name = s.name ?? s.project
        Image(decorative: f[i], scale: 1)
            .interpolation(.none)
            .resizable()
            .frame(width: CGFloat(f[i].width) * 3, height: CGFloat(f[i].height) * 3)
            .scaleEffect(x: world.facingRight(s) ? 1 : -1) // sprites face right
            .scaleEffect(hovered ? 1.2 : 1, anchor: .bottom)
            .overlay(alignment: .top) {
                HStack(spacing: 4) {
                    Image(systemName: !s.busy ? "checkmark.circle.fill" : s.turn ? "gearshape.fill" : "hourglass")
                        .rotationEffect(.degrees(s.turn ? world.t * 120 : 0))
                    if world.store.parent(of: s) != nil { Text("↳") }
                    Text(name.count > 24 ? name.prefix(23) + "…" : name)
                    let n = world.store.subagents[s.id]?.count ?? 0
                    if n > 0 { Text("· \(n) \(Image(systemName: "pawprint.fill"))").foregroundStyle(.yellow) }
                }
                .font(.system(size: 10, weight: .semibold, design: .rounded))
                .foregroundStyle(.white)
                .padding(.horizontal, 7).padding(.vertical, 3)
                .background(s.busy ? Color.black.opacity(0.6) : Color.green, in: Capsule())
                .fixedSize()
                .offset(y: -20 - (s.busy ? 0 : abs(sin(world.t * 4)) * 5)) // done: bounce for attention
            }
            .contentShape(Rectangle())
            .onTapGesture { world.store.open(s) }
            .onHover { inside in
                if inside { world.hovered = s.id } else if world.hovered == s.id { world.hovered = nil }
            }
            .contextMenu { Button(tr("Quit")) { NSApp.terminate(nil) } }
    }
}

struct Card: View {
    let s: Session
    let store: Store
    var body: some View {
        let subs = store.subagents[s.id] ?? []
        let kids = store.children(of: s)
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Image(decorative: frames(for: s)[0], scale: 1).interpolation(.none).resizable().frame(width: 36, height: 26)
                Text(s.name ?? tr("Untitled")).font(.headline).lineLimit(2)
            }
            Label(s.project, systemImage: "folder").font(.caption)
            Label(s.turn ? tr("Working · %@", ago(s.since))
                  : s.busy ? tr("Waiting on %d in background", s.waiting ?? 0) : tr("Finished %@", ago(s.since)),
                  systemImage: s.turn ? "bolt.fill" : s.busy ? "hourglass" : "checkmark.circle.fill")
                .font(.caption).foregroundStyle(s.busy ? .green : .secondary)
            if let p = store.parent(of: s) {
                Label(tr("Started by %@", p.name ?? p.project), systemImage: "arrow.turn.down.right").font(.caption)
            }
            if !kids.isEmpty {
                Text(tr("Sub-sessions")).font(.caption.bold()).padding(.top, 4)
                ForEach(kids) { k in
                    Label(k.name ?? k.project, systemImage: k.busy ? "gearshape.fill" : "moon.zzz.fill")
                        .font(.caption).foregroundStyle(k.busy ? .primary : .secondary).lineLimit(1)
                }
            }
            if !subs.isEmpty {
                Text(tr("Subagents working")).font(.caption.bold()).padding(.top, 4)
                ForEach(subs) { a in Label(a.desc, systemImage: "pawprint.fill").font(.caption).lineLimit(1) }
            }
            Text(s.busy ? tr("Click to open") : tr("Finished · click to see it")).font(.caption2).foregroundStyle(.tertiary).padding(.top, 2)
        }
        .padding(12)
        .frame(width: 300, alignment: .leading)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 14))
    }
}

struct ContentView: View {
    @StateObject var world = World()
    @ObservedObject var store: Store

    init() {
        let w = World()
        _world = StateObject(wrappedValue: w)
        store = w.store
    }

    var body: some View {
        GeometryReader { geo in
            let floor = geo.size.height - 22
            ZStack(alignment: .topLeading) {
                ForEach(store.sessions) { s in // subagents trail behind their parent, small
                    ForEach(Array((store.subagents[s.id] ?? []).enumerated()), id: \.element.id) { k, a in
                        let f = frames(a.id)
                        let d = world.sub[s.id + a.id] ?? (world.pos(s), true, false)
                        Image(decorative: f[d.moving ? (Int(world.t * 10) + k) % 4 : 1], scale: 1)
                            .interpolation(.none).resizable()
                            .frame(width: CGFloat(f[0].width) * 2, height: CGFloat(f[0].height) * 2)
                            .scaleEffect(x: d.right ? 1 : -1)
                            .position(x: d.x, y: floor + 6)
                            .allowsHitTesting(false)
                    }
                }
                ForEach(store.sessions) { s in // working + finished-but-unclicked
                    PetView(s: s, world: world)
                        .position(x: world.pos(s), y: floor)
                        .zIndex(world.hovered == s.id ? 2 : (s.busy ? 0 : 1))
                }
                if let s = store.sessions.first(where: { $0.id == world.hovered }) {
                    Card(s: s, store: store)
                        .position(x: min(max(world.pos(s), 160), geo.size.width - 160), y: floor - 60)
                        .frame(maxHeight: .infinity, alignment: .bottom)
                        .allowsHitTesting(false)
                        .zIndex(3)
                }
            }
            .onAppear { world.width = geo.size.width }
            .onChange(of: geo.size.width) { _, w in world.width = w }
        }
    }
}

// 4. App — floating, borderless, on every Space, no Dock icon
final class AppDelegate: NSObject, NSApplicationDelegate {
    var panel: NSPanel!
    var status: NSStatusItem!

    func applicationDidFinishLaunching(_ n: Notification) {
        // menu bar paw: launch at login + quit
        status = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)
        status.button?.image = NSImage(systemSymbolName: "pawprint.fill", accessibilityDescription: "Claude Pets")
        let menu = NSMenu()
        menu.delegate = self
        menu.addItem(NSMenuItem(title: tr("Open at login"), action: #selector(toggleLogin), keyEquivalent: ""))
        menu.addItem(.separator())
        menu.addItem(NSMenuItem(title: tr("Quit"), action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q"))
        status.menu = menu

        let screen = NSScreen.main!.visibleFrame
        // full-width strip along the bottom; transparent pixels let clicks through
        panel = NSPanel(contentRect: NSRect(x: screen.minX, y: screen.minY, width: screen.width, height: 220),
                        styleMask: [.borderless, .nonactivatingPanel], backing: .buffered, defer: false)
        panel.level = .floating
        panel.backgroundColor = .clear
        panel.isOpaque = false
        panel.hasShadow = false
        panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
        panel.contentView = NSHostingView(rootView: ContentView())
        panel.orderFrontRegardless()
    }

    @objc func toggleLogin() {
        let app = SMAppService.mainApp
        try? app.status == .enabled ? app.unregister() : app.register()
    }
}

extension AppDelegate: NSMenuDelegate {
    func menuNeedsUpdate(_ menu: NSMenu) {
        menu.items.first?.state = SMAppService.mainApp.status == .enabled ? .on : .off
    }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.accessory)
app.run()
