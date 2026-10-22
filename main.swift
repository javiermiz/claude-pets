import SwiftUI
import AppKit
import ServiceManagement
import UserNotifications

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

struct Subagent: Identifiable { let id: String; let desc: String; var doing: String? = nil }

// What an agent is up to, from the newest assistant entry of its transcript: its latest action
// ("⌨️ Run the tests", "✏️ main.swift"…) and the latest thing it said ("💬 …").
struct Activity {
    var doing: String?, said: String?
    var recent: [String] = []   // last actions, oldest first (input for the summary)
    var saidFull: String?       // the last message, longer (input for the summary)
    var prompt: String?         // what the user last asked
}
func activity(in data: Data) -> Activity {
    var out = Activity()
    for raw in data.split(separator: 10).reversed() where out.recent.count < 8 || out.said == nil || out.prompt == nil {
        guard raw.count < 3_000_000, let o = try? JSONSerialization.jsonObject(with: raw) as? [String: Any] else { continue }
        if o["type"] as? String == "last-prompt" { out.prompt = out.prompt ?? (o["lastPrompt"] as? String).map { String($0.prefix(400)) }; continue }
        guard raw.range(of: Data("\"assistant\"".utf8)) != nil, o["type"] as? String == "assistant",
              let blocks = (o["message"] as? [String: Any])?["content"] as? [[String: Any]] else { continue }
        for b in blocks.reversed() {
            if b["type"] as? String == "tool_use" {
                let d = describe(tool: b["name"] as? String ?? "", b["input"] as? [String: Any] ?? [:])
                out.doing = out.doing ?? d
                if out.recent.count < 8 { out.recent.insert(d, at: 0) }
            }
            if b["type"] as? String == "text", let t = b["text"] as? String, let line = firstLine(t) {
                if out.said == nil { out.said = "💬 " + line; out.saidFull = String(t.prefix(600)) }
                out.doing = out.doing ?? "💬 " + line
                if out.recent.count < 8 { out.recent.insert("💬 " + line, at: 0) }
            }
        }
    }
    return out
}
// cut at a word boundary instead of mid-word
func short(_ t: String, _ n: Int = 70) -> String {
    guard t.count > n else { return t }
    let cut = t.prefix(n)
    return (cut.lastIndex(of: " ").map { String(cut[..<$0]) } ?? String(cut)) + "…"
}

// Tiny labels for the bubbles, written by Claude Haiku through the user's own Claude Code CLI
// (`claude -p`, their subscription, no API key). One call at a time; if the CLI is missing or
// not logged in it backs off for 10 minutes and the bubbles fall back to the raw activity.
final class Summarizer {
    static let shared = Summarizer()
    static let dir = FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent("Library/Caches/claude-pets")
    enum Status { case checking, on, needsLogin, noCLI }
    private(set) var status = Status.checking
    private var cache: [String: (input: String, text: String, at: Date)] = [:]
    private var running = false, pausedUntil = Date.distantPast
    let exe: URL? = ["~/.local/bin/claude", "/opt/homebrew/bin/claude", "/usr/local/bin/claude"]
        .map { URL(fileURLWithPath: ($0 as NSString).expandingTildeInPath) }.first { FileManager.default.isExecutableFile(atPath: $0.path) }

    init() { if exe == nil { status = .noCLI } }
    func retrySoon() { pausedUntil = .distantPast } // after the user logs in

    func label(_ key: String, input: String, every: TimeInterval) -> String? {
        let c = cache[key]
        if !running, let exe, Date() > pausedUntil, c == nil || (c!.input != input && -c!.at.timeIntervalSinceNow > every) {
            run(exe, key, input)
        }
        return c.flatMap { $0.text.isEmpty ? nil : $0.text }
    }

    private func run(_ exe: URL, _ key: String, _ input: String) {
        running = true
        try? FileManager.default.createDirectory(at: Summarizer.dir, withIntermediateDirectories: true)
        let language = Locale(identifier: "en").localizedString(forLanguageCode: lang) ?? "English"
        let prompt = """
        Write a tiny status label (at most 7 words) in \(language) for a speech bubble over an AI coding agent. \
        If it is working, say what it is doing, starting with a gerund. If it finished its turn, say what it needs \
        from the user or what it delivered. Reply with only the label: no quotes, no emoji, no final period.

        \(input)
        """
        let p = Process()
        // only the model call: no tools, hooks, plugins, MCP servers or project settings. And inside a sandbox that
        // walls off Documents, Desktop and Downloads, so macOS never asks the user to let Claude Pets into them.
        let home = FileManager.default.homeDirectoryForCurrentUser.path
        let walls = ["Documents", "Desktop", "Downloads"].map { "(subpath \"\(home)/\($0)\")" }.joined(separator: " ")
        p.executableURL = URL(fileURLWithPath: "/usr/bin/sandbox-exec")
        p.arguments = ["-p", "(version 1)(allow default)(deny file-read* file-write* \(walls))", exe.path,
                       "-p", "--restricted", "--strict-mcp-config", "--tools", "", "--disable-slash-commands",
                       "--model", "haiku", "--no-session-persistence", prompt]
        p.standardInput = FileHandle.nullDevice
        p.currentDirectoryURL = Summarizer.dir // its own session file lands here, so the app can skip it
        let pipe = Pipe(), errPipe = Pipe()
        p.standardOutput = pipe
        p.standardError = errPipe
        p.terminationHandler = { [weak self] proc in
            let raw = String(decoding: pipe.fileHandleForReading.readDataToEndOfFile(), as: UTF8.self)
            let err = String(decoding: errPipe.fileHandleForReading.readDataToEndOfFile(), as: UTF8.self)
            let out = raw.trimmingCharacters(in: .whitespacesAndNewlines).trimmingCharacters(in: CharacterSet(charactersIn: "\"'."))
            DispatchQueue.main.async {
                guard let self else { return }
                let ok = proc.terminationStatus == 0 && !out.isEmpty && out.count < 120
                let loggedOut = (raw + err).range(of: #"log ?in|authenticat|OAuth"#, options: [.regularExpression, .caseInsensitive]) != nil
                if ok { self.status = .on }
                else if loggedOut { self.status = .needsLogin; self.pausedUntil = Date().addingTimeInterval(60) }
                else { self.pausedUntil = Date().addingTimeInterval(600) }
                self.cache[key] = (input, ok ? out : self.cache[key]?.text ?? "", Date())
                self.running = false
            }
        }
        do { try p.run() } catch { running = false; status = .noCLI; pausedUntil = Date().addingTimeInterval(600) }
    }
}
func firstLine(_ t: String) -> String? {
    t.replacingOccurrences(of: #"[*`#>]"#, with: "", options: .regularExpression)
        .split(separator: "\n").map { $0.trimmingCharacters(in: .whitespaces) }.first { !$0.isEmpty }.map { String($0.prefix(140)) }
}
func describe(tool: String, _ i: [String: Any]) -> String {
    func str(_ k: String) -> String { (i[k] as? String).flatMap(firstLine) ?? "" }
    let file = ((i["file_path"] as? String ?? i["notebook_path"] as? String ?? "") as NSString).lastPathComponent
    switch tool {
    case "Bash": return "⌨️ " + (str("description").isEmpty ? str("command") : str("description"))
    case "Edit", "Write", "MultiEdit", "NotebookEdit": return "✏️ " + file
    case "Read": return "📖 " + file
    case "Grep", "Glob": return "🔎 " + str("pattern")
    case "WebFetch": return "🌐 " + (URL(string: str("url"))?.host ?? "web")
    case "WebSearch": return "🌐 " + str("query")
    case "Agent", "Task": return "🤖 " + str("description")
    case "TodoWrite": return "📋"
    default:
        if tool.hasPrefix("mcp__") { return "🔌 " + (tool.split(separator: "_").last.map(String.init) ?? tool) }
        return "🔧 " + tool
    }
}

final class Store: ObservableObject {
    @Published var sessions: [Session] = []
    var all: [Session] = []                  // every live session, for parent/child names
    var parentOf: [String: String] = [:]     // child hostSessionId -> parent sessionId
    var subagents: [String: [Subagent]] = [:] // sessionId -> running Agent-tool subagents
    var activities: [String: Activity] = [:]  // sessionId -> what it's doing / last said
    var labels: [String: String] = [:]        // sessionId -> tiny summary for the bubble
    private var seenBusy: Set<String> = []    // finished but not yet clicked = "done"
    private var wasBusy: Set<String> = []
    private var transcript: [String: URL] = [:]
    private var offset: [String: UInt64] = [:]
    private let home = FileManager.default.homeDirectoryForCurrentUser
    private var dir: URL { home.appendingPathComponent(".claude/sessions") }

    init() {
        load()
        Timer.scheduledTimer(withTimeInterval: demo ? 0.5 : 2, repeats: true) { [weak self] _ in self?.load() }
    }

    func load() {
        if demo { return demoLoad() }
        let files = (try? FileManager.default.contentsOfDirectory(at: dir, includingPropertiesForKeys: nil)) ?? []
        all = files.filter { $0.pathExtension == "json" }
            .compactMap { try? JSONDecoder().decode(Session.self, from: Data(contentsOf: $0)) }
            .filter { kill($0.pid, 0) == 0 } // stale files from dead processes
            .filter { $0.cwd != Summarizer.dir.path } // the bubble summarizer's own `claude -p` runs
        all.forEach(scanLinks)
        for i in all.indices {
            subagents[all[i].id] = runningSubagents(all[i])
            if !all[i].turn { all[i].waiting = shells(all[i].pid) + subagents[all[i].id]!.count }
        }
        let live = all.filter { s in
                if s.busy { seenBusy.insert(s.id) }
                return seenBusy.contains(s.id)
            }
        // a session that just went from working to waiting for you: tell the user
        for s in live where !s.busy && wasBusy.contains(s.id) { notifyReady(s) }
        wasBusy = Set(live.filter(\.busy).map(\.id))
        for s in live { // labels: per task while working (at most every 90 s), once when the turn ends
            guard let a = activities[s.id] else { continue }
            let input = s.busy
                ? "The user asked: \(a.prompt ?? "?")\nRecent actions, oldest first:\n" + a.recent.joined(separator: "\n")
                : "It finished its turn and told the user:\n" + (a.saidFull ?? a.said ?? "")
            labels[s.id] = Summarizer.shared.label(s.id + (s.busy ? "w" : "d") + lang, input: input, every: s.busy ? 90 : 0)
        }
        sessions = live.sorted { ($0.busy ? 0 : 1, -$0.since.timeIntervalSince1970) < ($1.busy ? 0 : 1, -$1.since.timeIntervalSince1970) }
    }

    func notifyReady(_ s: Session) {
        let c = UNMutableNotificationContent()
        c.title = s.name ?? s.project
        c.body = tr("Ready for your reply")
        c.sound = .default
        c.userInfo = ["session": s.hostSessionId ?? ""]
        UNUserNotificationCenter.current().add(UNNotificationRequest(identifier: s.id + "\(Date().timeIntervalSince1970)", content: c, trigger: nil))
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
        let fresh = activity(in: data[...nl]), old = activities[s.id] // keep the older values for whatever this chunk lacks
        activities[s.id] = Activity(doing: fresh.doing ?? old?.doing, said: fresh.said ?? old?.said,
                                    recent: Array(((old?.recent ?? []) + fresh.recent).suffix(8)),
                                    saidFull: fresh.saidFull ?? old?.saidFull, prompt: fresh.prompt ?? old?.prompt)
        guard data.range(of: Data("(session_id: local_".utf8)) != nil else { return }
        let text = String(decoding: data[...nl], as: UTF8.self)
        for m in text.matches(of: try! Regex(#"\(session_id: (local_[0-9a-f-]{36})"#)) { parentOf[String(text[m.output[1].range!])] = s.id }
    }

    // Background Bash tasks: each runs as a `zsh -c` child of the claude process. One running for over
    // 10 minutes is a watcher or a server, not work you're waiting on: it doesn't count.
    private func shells(_ pid: Int32) -> Int {
        var kids = [pid_t](repeating: 0, count: 64)
        let n = Int(proc_listchildpids(pid, &kids, Int32(kids.count * MemoryLayout<pid_t>.size)))
        return kids.prefix(max(0, n)).filter { kid in
            var name = [CChar](repeating: 0, count: 64)
            proc_name(kid, &name, UInt32(name.count))
            var info = proc_bsdinfo()
            let ok = proc_pidinfo(kid, PROC_PIDTBSDINFO, 0, &info, Int32(MemoryLayout<proc_bsdinfo>.size)) > 0
            let age = ok ? Date().timeIntervalSince1970 - Double(info.pbi_start_tvsec) : 0
            return ["zsh", "bash", "sh"].contains(String(cString: name)) && age < 600
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
                // its latest action, from the last 64 KB of its own transcript
                let h = try? FileHandle(forReadingFrom: f)
                let size = (try? h?.seekToEnd()) ?? 0
                try? h?.seek(toOffset: size > 65_536 ? size - 65_536 : 0)
                let doing = (try? h?.readToEnd()).flatMap { $0 }.map { activity(in: $0).doing } ?? nil
                try? h?.close()
                return Subagent(id: f.lastPathComponent, desc: desc ?? tr("Subagent"), doing: doing)
            }
            .sorted { $0.id < $1.id }
    }

    func open(_ s: Session) {
        if demo { return }
        if let id = s.hostSessionId, let url = URL(string: "claude://code/continue?session=\(id)") {
            NSWorkspace.shared.open(url)
        }
        if !s.busy { seenBusy.remove(s.id); load() }
    }
}

// Demo mode (`--demo`, for screen recordings): a scripted ~60 s story with example sessions instead of
// the real ones. Nothing is read from ~/.claude and clicks open nothing.
let demo = CommandLine.arguments.contains("--demo")
let demoStart = Date()
var demoPets = false
var demoHover: String?

extension Store {
    func demoLoad() {
        let t = Date().timeIntervalSince(demoStart).truncatingRemainder(dividingBy: 60)
        func at(_ sec: Double) -> Double { (demoStart.timeIntervalSince1970 + sec - 60) * 1000 }
        func session(_ key: String, _ name: String, _ dir: String, busy: Bool, since: Double, waiting: Int? = nil) -> Session {
            Session(pid: 0, sessionId: key, cwd: "/Users/demo/" + dir, name: name, status: busy ? "busy" : "idle",
                    statusUpdatedAt: at(since), hostSessionId: nil, waiting: waiting)
        }
        func pick(_ steps: [(Double, String)]) -> String { steps.last { t >= $0.0 }?.1 ?? steps[0].1 }
        let es = lang == "es"
        func L(_ en: String, _ esText: String) -> String { es ? esText : en }

        var list = [session("0b9e3c2a-5d41-4f7e-9a10-demo00000001", L("Fix checkout bug", "Arreglar el checkout"), "shop-web", busy: t < 20, since: t < 20 ? 0 : 20)]
        list.append(session("7c1f9d84-2e6b-4a33-b5c2-demo00000002", L("Add dark mode", "Modo oscuro"), "mobile-app", busy: true, since: 0))
        if t >= 4 { list.append(session("e4a7b015-9c3d-4d28-8f61-demo00000003", L("Write API docs", "Documentar la API"), "api", busy: t < 26, since: t < 26 ? 4 : 26, waiting: t >= 26 ? 1 : nil)) }

        labels = [
            "0b9e3c2a-5d41-4f7e-9a10-demo00000001": t < 20 ? pick([(0, L("Reproducing the checkout crash", "Reproduciendo el error del checkout")), (7, L("Fixing the empty cart total", "Arreglando el total vacío del carrito")), (14, L("Running the payment tests", "Ejecutando las pruebas de pagos"))])
                        : L("Fixed the crash, asks to merge", "Listo, pregunta si hace merge"),
            "7c1f9d84-2e6b-4a33-b5c2-demo00000002": pick([(0, L("Mapping colors to theme tokens", "Pasando colores a tokens del tema")), (8, L("Splitting the work with two helpers", "Repartiendo el trabajo en equipo")), (30, L("Polishing the toggle animation", "Puliendo la animación del interruptor"))]),
            "e4a7b015-9c3d-4d28-8f61-demo00000003": pick([(4, L("Documenting the auth endpoints", "Documentando los endpoints de login")), (14, L("Adding request examples", "Agregando ejemplos de solicitudes")), (26, L("Waiting for the docs build", "Esperando el build de la documentación"))]),
        ]
        activities = [
            "0b9e3c2a-5d41-4f7e-9a10-demo00000001": Activity(doing: t < 20 ? pick([(0, "⌨️ Run the checkout flow"), (7, "✏️ cart.ts"), (14, "⌨️ npm test payments")]) : nil,
                          said: t < 20 ? nil : L("💬 Fixed: the cart total is no longer empty. All 42 payment tests pass. Merge it?", "💬 Listo: el total del carrito ya no sale vacío. Pasan las 42 pruebas de pagos. ¿Hago el merge?")),
            "7c1f9d84-2e6b-4a33-b5c2-demo00000002": Activity(doing: pick([(0, "🔎 #1b1630"), (8, "🤖 " + L("Audit color tokens", "Auditar tokens de color")), (30, "✏️ ThemeToggle.swift")]), said: nil),
            "e4a7b015-9c3d-4d28-8f61-demo00000003": Activity(doing: pick([(4, "📖 routes/auth.ts"), (14, "✏️ docs/auth.md"), (26, "⌨️ npm run docs:build")]), said: nil),
        ]
        subagents = ["7c1f9d84-2e6b-4a33-b5c2-demo00000002": t >= 8 && t < 30 ? [
            Subagent(id: "a91c4e70-1b2f-4c8d-9e35-demo0000b001", desc: L("Audit color tokens", "Auditar tokens de color"), doing: "🔎 hex colors"),
            Subagent(id: "3d58f2c6-7a90-4e14-b6d8-demo0000b002", desc: L("Update the settings screen", "Actualizar la pantalla de ajustes"), doing: "✏️ SettingsView.swift"),
            Subagent(id: "c2e7a913-4f6b-48d0-a1c5-demo0000b003", desc: L("Check contrast ratios", "Revisar el contraste"), doing: "⌨️ contrast-check"),
        ] : []]
        demoHover = t >= 36 && t < 46 ? "0b9e3c2a-5d41-4f7e-9a10-demo00000001" : nil
        demoPets = t >= 46
        // the real notification, once per loop, when L("Fix checkout bug", "Arreglar el checkout") finishes
        if t >= 20 && t < 20.6 && !demoNotified { demoNotified = true; notifyReady(list[0]) }
        if t < 1 { demoNotified = false }
        all = list
        sessions = list
    }
}
var demoNotified = false

// 2. World — a 60 fps tick moves busy pets along the floor; idle ones nap in place
final class World: ObservableObject {
    @Published var hovered: String?
    let store = Store()
    var width: CGFloat = NSScreen.main?.visibleFrame.width ?? 1000
    var t: Double = 0
    private var x: [String: CGFloat] = [:]
    private var vx: [String: CGFloat] = [:]
    private(set) var sub: [String: (x: CGFloat, right: Bool, moving: Bool)] = [:] // subagent ducklings

    init() {
        Timer.scheduledTimer(withTimeInterval: 1 / 60, repeats: true) { [weak self] _ in self?.tick() }
    }

    // workers: stations side by side from the right edge, where windows keep the least (sidebars and
    // the left half of the screen stay clear), in the order sessions first appeared
    private var stationOrder: [String] = []
    var placed: [String: CGFloat] = [:]   // stations the user dragged somewhere: they stay there
    var dragFrom: CGFloat?
    var held: String?                     // the station being dragged right now
    var dropped: [String: Double] = [:]   // when each station last landed, for the squash and the dust
    private var frame = 0
    private var shown: [String: CGFloat] = [:], lift: [String: CGFloat] = [:], lag: [String: CGFloat] = [:]

    // Where a station is drawn: it eases toward its slot (so drags and new arrivals glide), floats up while held,
    // swings like a pendulum from the cursor while moving, and squashes when it lands.
    func look(_ id: String, _ slot: CGFloat) -> (x: CGFloat, lift: CGFloat, tilt: Double, sx: CGFloat, sy: CGFloat) {
        let since = t - (dropped[id] ?? -9)
        let squash = since < 0.6 ? CGFloat(sin(since * 16) * exp(-since * 7)) * 0.22 : 0
        let tilt = held == id ? Double(max(-22, min(22, (lag[id] ?? 0) * 0.4))) : 0
        return (shown[id] ?? slot, lift[id] ?? 0, tilt, 1 + squash * 0.6, 1 - squash)
    }
    func stations() -> [(s: Session, center: CGFloat)] {
        let ids = store.sessions.map(\.id)
        stationOrder = stationOrder.filter { ids.contains($0) } + ids.filter { !stationOrder.contains($0) }
        var x: CGFloat = width - 40, out: [(Session, CGFloat)] = []
        for id in stationOrder {
            guard let s = store.sessions.first(where: { $0.id == id }) else { continue }
            let w = Station.width(1 + min(5, store.subagents[id]?.count ?? 0)) * K
            out.append((s, placed[id] ?? x - max(w, 200) / 2)); if placed[id] == nil { x -= max(w, 200) + 30 } // room for the name tag; ponytail: no wrapping; past the screen edge they just run off
        }
        return out
    }
    func anchor(_ s: Session) -> CGFloat { workers ? stations().first { $0.s.id == s.id }.map { look(s.id, $0.center).x } ?? pos(s) : pos(s) }

    func pos(_ s: Session) -> CGFloat {
        if let p = x[s.id] { return p }
        let p = CGFloat.random(in: 40...max(41, width - 40))
        x[s.id] = p
        return p
    }

    func facingRight(_ s: Session) -> Bool { (vx[s.id] ?? -1) > 0 }

    func tick() {
        if demo { hovered = demoHover }
        let dt = 1.0 / 60
        t += dt
        if workers {
            for st in stations() {
                let id = st.s.id, x = shown[id] ?? st.center
                let nx = x + (st.center - x) * min(1, dt * (held == id ? 20 : 9))
                shown[id] = nx
                lag[id] = st.center - nx
                let up: CGFloat = held == id ? 18 : hovered == id ? 4 : 0 // hover: it perks up; held: it's lifted off the floor
                lift[id] = (lift[id] ?? 0) + (up - (lift[id] ?? 0)) * min(1, dt * 16)
            }
        }
        for s in store.sessions where s.busy && s.id != hovered {
            var v = vx[s.id] ?? (Bool.random() ? 1 : -1) * .random(in: 60...140)
            if Double.random(in: 0..<1) < 0.002 { v = -v } // wander
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
        // 60 fps only while a station is held or still gliding/landing; 30 the rest of the time, to spare the battery
        frame += 1
        let gliding = held != nil || lag.values.contains { abs($0) > 0.5 } || dropped.values.contains { t - $0 < 0.6 }
        if gliding || frame % 2 == 0 { objectWillChange.send() }
    }
}

// Pixel art from pets.px.js, one strip per character. Two styles, picked in the menu bar:
// pets (5 frames: 0-3 walk, 4 lying down) and workers (12 frames: 6-8 side walk, 11 cheering)
func strips(_ dir: String, _ n: Int, prefix: String = "") -> [[CGImage]] {
    let urls = (Bundle.main.urls(forResourcesWithExtension: "png", subdirectory: dir) ?? []).filter { $0.lastPathComponent.hasPrefix(prefix) }
    return urls.sorted { $0.lastPathComponent < $1.lastPathComponent }.compactMap { url in
        guard let src = CGImageSourceCreateWithURL(url as CFURL, nil),
              let img = CGImageSourceCreateImageAtIndex(src, 0, nil) else { return nil }
        let w = img.width / n
        return (0..<n).compactMap { img.cropping(to: CGRect(x: $0 * w, y: 0, width: w, height: img.height)) }
    }
}
let petSprites = strips("pets", 5)
let workerSprites = strips("workers", 12, prefix: "worker_")
let office: [String: [CGImage]] = { // desk (3 frames: code, code, off), chair, meeting table — live next to the workers
    var out: [String: [CGImage]] = [:]
    for (name, n) in [("desk_side", 3), ("chair_side", 1), ("meeting_table", 1)] {
        guard let url = Bundle.main.url(forResource: name, withExtension: "png", subdirectory: "workers"),
              let src = CGImageSourceCreateWithURL(url as CFURL, nil), let img = CGImageSourceCreateImageAtIndex(src, 0, nil) else { continue }
        let w = img.width / n
        out[name] = (0..<n).compactMap { img.cropping(to: CGRect(x: $0 * w, y: 0, width: w, height: img.height)) }
    }
    return out
}()
var workers: Bool { (demo ? !demoPets : UserDefaults.standard.string(forKey: "style") == "workers") && !workerSprites.isEmpty }
func walkFrame(_ step: Int) -> Int { workers ? [6, 7, 6, 8][step % 4] : step % 4 }
var standFrame: Int { workers ? 6 : 1 }
func doneFrame(_ t: Double) -> Int { workers ? (Int(t * 3) % 2 == 0 ? 11 : 0) : 4 } // workers jump for joy, pets lie down
func seed(_ key: String) -> UInt32 { key.utf8.reduce(UInt32(0)) { $0 &* 31 &+ UInt32($1) } }
func seed(_ s: Session) -> UInt32 { seed(s.sessionId) }
func frames(_ key: String) -> [CGImage] { // low bits barely vary across uuids
    let set = workers ? workerSprites : petSprites
    return set[Int((seed(key) >> 13) % UInt32(set.count))]
}
func frames(for s: Session) -> [CGImage] { frames(s.sessionId) }
func workerFrames(_ key: String) -> [CGImage] { workerSprites[Int((seed(key) >> 13) % UInt32(max(1, workerSprites.count)))] }
// views can still be drawn once with the other style's sprites while the style changes: never index past the end
extension Array { subscript(safe i: Int) -> Element { self[Swift.min(Swift.max(i, 0), count - 1)] } }

func ago(_ d: Date) -> String { // in the app's language, not the Mac's
    let f = RelativeDateTimeFormatter()
    f.locale = Locale(identifier: lang)
    return f.localizedString(for: d, relativeTo: Date())
}

// UI strings follow the system language; anything missing falls back to English
let keys = ["Untitled", "Working · %@", "Waiting on %d in background", "Finished %@", "Started by %@", "Sub-sessions",
            "Subagents working", "Click to open", "Finished · click to see it", "Open at login", "Quit", "Subagent", "Chat (scratch)", "Pets", "Workers", "Ready for your reply",
            "AI summaries on", "Turn on AI summaries (claude /login)…", "AI summaries need the Claude Code CLI…", "AI summaries: checking…"]
let table: [String: [String]] = [
    "es": ["Sin nombre", "Trabajando · %@", "Esperando %d en segundo plano", "Terminó %@", "Lanzada por %@", "Sub-sesiones",
           "Subagentes trabajando", "Clic para abrir", "Terminó · clic para verlo", "Abrir al iniciar sesión", "Salir", "Subagente", "Chat (scratch)", "Mascotas", "Trabajadores", "Listo para tu respuesta",
           "Resúmenes con IA activos", "Activar resúmenes con IA (claude /login)…", "Los resúmenes con IA necesitan el CLI de Claude Code…", "Resúmenes con IA: comprobando…"],
    "pt": ["Sem nome", "Trabalhando · %@", "Aguardando %d em segundo plano", "Terminou %@", "Iniciada por %@", "Subsessões",
           "Subagentes trabalhando", "Clique para abrir", "Terminou · clique para ver", "Abrir ao iniciar sessão", "Sair", "Subagente", "Chat (scratch)", "Mascotes", "Trabalhadores", "Pronto para sua resposta",
           "Resumos com IA ativos", "Ativar resumos com IA (claude /login)…", "Os resumos com IA precisam do CLI do Claude Code…", "Resumos com IA: verificando…"],
    "fr": ["Sans nom", "Au travail · %@", "En attente de %d en arrière-plan", "Terminé %@", "Lancée par %@", "Sous-sessions",
           "Sous-agents au travail", "Cliquer pour ouvrir", "Terminé · cliquer pour voir", "Ouvrir à la connexion", "Quitter", "Sous-agent", "Chat (scratch)", "Animaux", "Employés", "Prêt pour ta réponse",
           "Résumés IA activés", "Activer les résumés IA (claude /login)…", "Les résumés IA nécessitent le CLI Claude Code…", "Résumés IA : vérification…"],
    "de": ["Ohne Namen", "Arbeitet · %@", "Wartet auf %d im Hintergrund", "Fertig %@", "Gestartet von %@", "Untersitzungen",
           "Arbeitende Subagenten", "Zum Öffnen klicken", "Fertig · zum Ansehen klicken", "Bei Anmeldung öffnen", "Beenden", "Subagent", "Chat (scratch)", "Haustiere", "Mitarbeiter", "Bereit für deine Antwort",
           "KI-Zusammenfassungen an", "KI-Zusammenfassungen aktivieren (claude /login)…", "KI-Zusammenfassungen brauchen die Claude-Code-CLI…", "KI-Zusammenfassungen: wird geprüft…"],
    "it": ["Senza nome", "Al lavoro · %@", "In attesa di %d in background", "Finito %@", "Avviata da %@", "Sottosessioni",
           "Subagenti al lavoro", "Clicca per aprire", "Finito · clicca per vederlo", "Apri al login", "Esci", "Subagente", "Chat (scratch)", "Animaletti", "Impiegati", "Pronto per la tua risposta",
           "Riassunti IA attivi", "Attiva i riassunti IA (claude /login)…", "I riassunti IA richiedono la CLI di Claude Code…", "Riassunti IA: verifica…"],
    "ja": ["無題", "作業中 · %@", "バックグラウンドで%d件待機中", "完了 %@", "起動元: %@", "サブセッション",
           "作業中のサブエージェント", "クリックで開く", "完了 · クリックで表示", "ログイン時に開く", "終了", "サブエージェント", "チャット (scratch)", "ペット", "ワーカー", "あなたの返信待ちです",
           "AI 要約: オン", "AI 要約をオンにする (claude /login)…", "AI 要約には Claude Code CLI が必要です…", "AI 要約: 確認中…"],
    "zh": ["未命名", "工作中 · %@", "正在等待 %d 个后台任务", "已完成 %@", "由 %@ 启动", "子会话",
           "工作中的子代理", "点击打开", "已完成 · 点击查看", "登录时打开", "退出", "子代理", "聊天 (scratch)", "宠物", "打工人", "等你回复",
           "AI 摘要已开启", "开启 AI 摘要 (claude /login)…", "AI 摘要需要 Claude Code CLI…", "AI 摘要：检查中…"],
    "ko": ["이름 없음", "작업 중 · %@", "백그라운드 작업 %d개 대기 중", "완료 %@", "시작한 세션: %@", "하위 세션",
           "작업 중인 서브에이전트", "클릭하여 열기", "완료 · 클릭하여 보기", "로그인 시 열기", "종료", "서브에이전트", "채팅 (scratch)", "펫", "직원", "답장을 기다리고 있어요",
           "AI 요약 켜짐", "AI 요약 켜기 (claude /login)…", "AI 요약에는 Claude Code CLI가 필요해요…", "AI 요약: 확인 중…"],
]
// the app's language: picked in the menu bar, or the Mac's own
var lang: String { UserDefaults.standard.string(forKey: "lang") ?? Locale.preferredLanguages.first?.components(separatedBy: "-").first ?? "en" }
let languages = [("en", "English"), ("es", "Español"), ("pt", "Português"), ("fr", "Français"), ("de", "Deutsch"),
                 ("it", "Italiano"), ("ja", "日本語"), ("zh", "简体中文"), ("ko", "한국어")]
func tr(_ en: String, _ args: CVarArg...) -> String {
    let s = keys.firstIndex(of: en).flatMap { table[lang]?[$0] } ?? en
    return String(format: s, arguments: args)
}

// 3. Views
// Speech bubble with what an agent is doing or said
struct Bubble: View {
    let text: String
    var width: CGFloat = 210
    var body: some View {
        Text(text).font(.system(size: 10, weight: .medium, design: .rounded)).foregroundStyle(.black)
            .lineLimit(2).multilineTextAlignment(.leading)
            .padding(.horizontal, 7).padding(.vertical, 4)
            .frame(maxWidth: width, alignment: .leading)
            .background(.white, in: RoundedRectangle(cornerRadius: 6))
            .overlay(RoundedRectangle(cornerRadius: 6).strokeBorder(.black, lineWidth: 1.5))
            .fixedSize(horizontal: false, vertical: true)
    }
}

// Name tag over a pet or a workstation
func plate(_ s: Session, _ world: World) -> some View {
    let name = s.name ?? s.project
    let n = world.store.subagents[s.id]?.count ?? 0
    return HStack(spacing: 4) {
        Image(systemName: !s.busy ? "checkmark.circle.fill" : s.turn ? "gearshape.fill" : "hourglass")
            .rotationEffect(.degrees(s.turn ? world.t * 120 : 0))
        if world.store.parent(of: s) != nil { Text("↳") }
        Text(name.count > 24 ? name.prefix(23) + "…" : name)
        if n > 0 { Text("· \(n) \(Image(systemName: workers ? "person.2.fill" : "pawprint.fill"))").foregroundStyle(.yellow) }
    }
    .font(.system(size: 10, weight: .semibold, design: .rounded))
    .foregroundStyle(.white)
    .padding(.horizontal, 7).padding(.vertical, 3)
    .background(s.busy ? Color.black.opacity(0.6) : Color.green, in: Capsule())
    .fixedSize()
}

struct PetView: View {
    let s: Session
    @ObservedObject var world: World

    var body: some View {
        let hovered = world.hovered == s.id
        let f = frames(for: s)
        // working: walk cycle; done: lies down (pets) or cheers (workers) and waits for a click
        let i = !s.busy ? doneFrame(world.t) : hovered ? standFrame : walkFrame(Int(world.t * 8) + Int(seed(s) % 4))
        Image(decorative: f[safe: i], scale: 1)
            .interpolation(.none)
            .resizable()
            .frame(width: CGFloat(f[safe: i].width) * 3, height: CGFloat(f[safe: i].height) * 3)
            .scaleEffect(x: world.facingRight(s) ? 1 : -1) // sprites face right
            .scaleEffect(hovered ? 1.2 : 1, anchor: .bottom)
            .offset(y: i == 11 ? -6 : 0) // the cheer is a little jump
            .overlay(alignment: .top) {
                plate(s, world).offset(y: -20 - (s.busy ? 0 : abs(sin(world.t * 4)) * 5)) // done: bounce for attention
            }
            .contentShape(Rectangle())
            .onTapGesture { world.store.open(s) }
            .onHover { inside in
                if inside { world.hovered = s.id } else if world.hovered == s.id { world.hovered = nil }
            }
            .contextMenu { Button(tr("Quit")) { NSApp.terminate(nil) } }
    }
}

// Workers style: nobody walks. A session works at its desk; with subagents the team meets around a table.
let K: CGFloat = 3 // screen points per art pixel
struct Station: View {
    let s: Session
    @ObservedObject var world: World

    static func width(_ team: Int) -> CGFloat { team <= 1 ? 36 : CGFloat((team + 1) / 2 * 14 + 34 + team / 2 * 14) }

    func px(_ img: CGImage?, x: CGFloat, up: CGFloat = 0, flip: Bool = false) -> some View {
        Group {
            if let img {
                Image(decorative: img, scale: 1).interpolation(.none).resizable()
                    .frame(width: CGFloat(img.width) * K, height: CGFloat(img.height) * K)
                    .scaleEffect(x: flip ? -1 : 1)
                    .offset(x: x * K, y: -up * K)
            }
        }
    }

    func bubbleLine(_ subs: [Subagent], _ t: Double) -> String? {
        let a = world.store.activities[s.id], label = world.store.labels[s.id]
        guard s.busy else { return label.map { "💬 " + $0 } ?? a?.said.map { short($0) } }
        let mine = label ?? a?.doing.map { short($0) }
        guard !subs.isEmpty else { return mine }
        let speaker = Int(t / 2.5) % (subs.count + 1)
        return speaker == 0 ? mine : "🤖 " + short(subs[speaker - 1].desc, 50) // a subagent's task is already its summary
    }

    var body: some View {
        let t = world.t
        let subs = Array((world.store.subagents[s.id] ?? []).prefix(5))
        let me = workerFrames(s.sessionId)
        let cheer = workers ? doneFrame(t) : 11
        ZStack(alignment: .bottomLeading) {
            if subs.isEmpty { // at the desk
                px(office["chair_side"]?.first, x: 0)
                if world.held == s.id { px(me[safe: Int(t * 8) % 2 == 0 ? 11 : 6], x: 1, up: 2) } // picked up: arms up, kicking
                else if s.busy { px(me[safe: s.turn ? 9 + Int(t * 5) % 2 : 9], x: 1, up: 1) }
                else { px(me[safe: cheer], x: -1, up: cheer == 11 ? 3 : 0) } // done: up and cheering
                px(office["desk_side"]?[s.turn ? Int(t * 2) % 2 : 2], x: 12)
            } else {          // team meeting: half on each side of the table, the speaker takes turns
                let team = [me] + subs.map { workerFrames($0.id) }
                let left = (team.count + 1) / 2
                let speaker = Int(t / 2.5) % team.count
                ForEach(0..<team.count, id: \.self) { i in
                    let x = i < left ? CGFloat(i * 14) : CGFloat(left * 14 + 34 + (i - left) * 14)
                    let talking = i == speaker && s.busy
                    let f = world.held == s.id ? (Int(t * 8 + Double(i)) % 2 == 0 ? 11 : 6) : i == 0 && !s.busy ? cheer : 6
                    px(team[i][safe: f], x: x, up: (talking && Int(t * 4) % 2 == 0 ? 1 : 0) + (f == 11 ? 3 : 0), flip: i >= left)
                }
                px(office["meeting_table"]?.first, x: CGFloat(left * 14 + 2))
            }
        }
        .frame(width: Station.width(1 + subs.count) * K, height: 22 * K, alignment: .bottomLeading)
        .overlay(alignment: .top) {
            VStack(spacing: 4) {
                // at the desk: what it's doing; in a meeting: whoever has the floor; done: the start of what it told you
                if let line = bubbleLine(subs, t) { Bubble(text: line) }
                plate(s, world)
            }
            .fixedSize(horizontal: true, vertical: true)
            .alignmentGuide(.top) { $0[.bottom] + 4 + (s.busy ? 0 : abs(sin(t * 4)) * 5) } // sits on top of the station
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
                Image(decorative: frames(for: s)[0], scale: 1).interpolation(.none).resizable().aspectRatio(contentMode: .fit).frame(width: 36, height: 28)
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
                ForEach(subs) { a in Label(a.doing.map { "\(a.desc) — \($0)" } ?? a.desc, systemImage: "pawprint.fill").font(.caption).lineLimit(1) }
            }
            if let label = store.labels[s.id] { Text(label).font(.callout.bold()).lineLimit(2) }
            if let a = store.activities[s.id] {
                if s.busy, let d = a.doing { Text(d).font(.caption).lineLimit(2) }
                if let said = a.said { Text(said).font(.caption).foregroundStyle(.secondary).lineLimit(4) }
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
                if workers {
                    ForEach(world.stations(), id: \.s.id) { st in
                        let l = world.look(st.s.id, st.center), since = world.t - (world.dropped[st.s.id] ?? -9)
                        let w = Station.width(1 + min(5, store.subagents[st.s.id]?.count ?? 0)) * K
                        Ellipse().fill(.black.opacity(0.28 - Double(l.lift) * 0.008)) // shadow: shrinks as it rises
                            .frame(width: w * (1 - l.lift / 60), height: 8)
                            .position(x: l.x, y: geo.size.height - 4)
                            .opacity(l.lift > 1 ? 1 : 0)
                        if since < 0.35 { // landing dust
                            ForEach([-1.0, 1.0], id: \.self) { side in
                                Circle().fill(.white.opacity(0.7 * (1 - since / 0.35)))
                                    .frame(width: 6 + since * 20, height: 6 + since * 20)
                                    .position(x: l.x + CGFloat(side) * (w / 2 + since * 70), y: geo.size.height - 8 - since * 14)
                            }
                        }
                        Station(s: st.s, world: world)
                            .scaleEffect(x: l.sx, y: l.sy, anchor: .bottom)
                            .rotationEffect(.degrees(l.tilt), anchor: .top) // hangs from the cursor
                            .offset(y: -l.lift)
                            .gesture(DragGesture(minimumDistance: 4, coordinateSpace: .global).onChanged { v in // drag it anywhere along the floor
                                let from = world.dragFrom ?? st.center
                                world.dragFrom = from
                                world.held = st.s.id
                                world.placed[st.s.id] = min(max(from + v.translation.width, 60), geo.size.width - 60)
                            }.onEnded { _ in
                                world.dragFrom = nil
                                world.held = nil
                                world.dropped[st.s.id] = world.t
                            })
                            .position(x: l.x, y: geo.size.height - 4 - 11 * K)
                            .zIndex(world.held == st.s.id ? 3 : world.hovered == st.s.id ? 2 : 1)
                    }
                } else {
                ForEach(store.sessions) { s in // subagents trail behind their parent, small
                    ForEach(Array((store.subagents[s.id] ?? []).enumerated()), id: \.element.id) { k, a in
                        let f = frames(a.id)
                        let d = world.sub[s.id + a.id] ?? (world.pos(s), true, false)
                        Image(decorative: f[safe: d.moving ? walkFrame(Int(world.t * 10) + k) : standFrame], scale: 1)
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
                }
                if let s = store.sessions.first(where: { $0.id == world.hovered }) {
                    // bottom-anchored just above the bubbles and name tags; grows upward with its content
                    VStack(spacing: 0) {
                        Spacer(minLength: 0)
                        Card(s: s, store: store)
                        Color.clear.frame(height: workers ? 150 : 110)
                    }
                    .frame(width: 300, height: geo.size.height)
                    .position(x: min(max(world.anchor(s), 160), geo.size.width - 160), y: geo.size.height / 2)
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
        UNUserNotificationCenter.current().delegate = self
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound]) { _, _ in }
        // menu bar paw: launch at login + quit
        status = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)
        status.button?.image = NSImage(systemSymbolName: "pawprint.fill", accessibilityDescription: "Claude Pets")
        let menu = NSMenu()
        menu.delegate = self
        status.menu = menu

        let screen = NSScreen.main!.visibleFrame
        // full-width strip along the bottom; transparent pixels let clicks through
        panel = NSPanel(contentRect: NSRect(x: screen.minX, y: screen.minY, width: screen.width, height: 480), // tall enough for the hover card
                        styleMask: [.borderless, .nonactivatingPanel], backing: .buffered, defer: false)
        panel.level = .floating
        panel.backgroundColor = .clear
        panel.isOpaque = false
        panel.hasShadow = false
        panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
        panel.contentView = NSHostingView(rootView: ContentView())
        panel.orderFrontRegardless()
        if demo { showDemoBackdrop(screen: NSScreen.main!) }
    }

    @objc func pickPets() { UserDefaults.standard.set("pets", forKey: "style") }
    @objc func pickWorkers() { UserDefaults.standard.set("workers", forKey: "style") }

    // Demo recordings: the user's own wallpaper over every window (so nothing private shows), the strip
    // on top, and this app in the menu bar instead of whatever was in front.
    var backdrop: NSWindow?
    func showDemoBackdrop(screen: NSScreen) {
        let w = NSWindow(contentRect: screen.frame, styleMask: .borderless, backing: .buffered, defer: false)
        w.level = NSWindow.Level(rawValue: NSWindow.Level.floating.rawValue - 1)
        w.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
        w.ignoresMouseEvents = true
        let v = NSView(frame: screen.frame)
        v.wantsLayer = true
        v.layer?.backgroundColor = NSColor(red: 0.16, green: 0.12, blue: 0.3, alpha: 1).cgColor
        if let url = NSWorkspace.shared.desktopImageURL(for: screen), let img = NSImage(contentsOf: url) {
            v.layer?.contents = img
            v.layer?.contentsGravity = .resizeAspectFill
        }
        w.contentView = v
        w.orderFrontRegardless()
        backdrop = w
        NSApp.setActivationPolicy(.regular)
        NSApp.activate()
    }

    @objc func toggleLogin() {
        let app = SMAppService.mainApp
        try? app.status == .enabled ? app.unregister() : app.register()
    }
}

extension AppDelegate: UNUserNotificationCenterDelegate {
    // clicking "Ready for your reply" opens that session
    func userNotificationCenter(_ c: UNUserNotificationCenter, didReceive r: UNNotificationResponse, withCompletionHandler done: @escaping () -> Void) {
        if let id = r.notification.request.content.userInfo["session"] as? String, !id.isEmpty,
           let url = URL(string: "claude://code/continue?session=\(id)") { NSWorkspace.shared.open(url) }
        done()
    }
    func userNotificationCenter(_ c: UNUserNotificationCenter, willPresent n: UNNotification, withCompletionHandler done: @escaping (UNNotificationPresentationOptions) -> Void) {
        done([.banner, .sound])
    }
}

extension AppDelegate: NSMenuDelegate {
    func menuNeedsUpdate(_ menu: NSMenu) {
        func item(_ title: String, _ action: Selector, on: Bool = false, key: String = "") -> NSMenuItem {
            let i = NSMenuItem(title: title, action: action, keyEquivalent: key)
            i.state = on ? .on : .off
            return i
        }
        menu.removeAllItems()
        menu.addItem(item(tr("Pets"), #selector(pickPets), on: !workers))
        menu.addItem(item(tr("Workers"), #selector(pickWorkers), on: workers))
        menu.addItem(.separator())
        let langs = NSMenu()
        for (code, name) in languages {
            let i = item(name, #selector(pickLanguage(_:)), on: lang == code)
            i.representedObject = code
            langs.addItem(i)
        }
        let langItem = NSMenuItem(title: "🌐 " + (languages.first { $0.0 == lang }?.1 ?? lang), action: nil, keyEquivalent: "")
        langItem.submenu = langs
        menu.addItem(langItem)
        menu.addItem(item(tr("Open at login"), #selector(toggleLogin), on: SMAppService.mainApp.status == .enabled))
        menu.addItem(.separator())
        switch Summarizer.shared.status { // the AI summaries: what's their state, and how to turn them on
        case .on: menu.addItem(item(tr("AI summaries on"), #selector(noop), on: true))
        case .needsLogin: menu.addItem(item(tr("Turn on AI summaries (claude /login)…"), #selector(loginCLI)))
        case .noCLI: menu.addItem(item(tr("AI summaries need the Claude Code CLI…"), #selector(installCLI)))
        case .checking: let i = item(tr("AI summaries: checking…"), #selector(noop)); i.isEnabled = false; menu.addItem(i)
        }
        menu.addItem(.separator())
        menu.addItem(item(tr("Quit"), #selector(NSApplication.terminate(_:)), key: "q"))
    }
    @objc func noop() {}
    // opens Terminal running `claude /login` (a .command file needs no automation permission)
    @objc func loginCLI() {
        guard let exe = Summarizer.shared.exe else { return installCLI() }
        let script = Summarizer.dir.appendingPathComponent("login.command")
        try? FileManager.default.createDirectory(at: Summarizer.dir, withIntermediateDirectories: true)
        try? "#!/bin/zsh -l\n'\(exe.path)' /login\n".write(to: script, atomically: true, encoding: .utf8)
        try? FileManager.default.setAttributes([.posixPermissions: 0o755], ofItemAtPath: script.path)
        NSWorkspace.shared.open(script)
        Summarizer.shared.retrySoon()
    }
    @objc func installCLI() { NSWorkspace.shared.open(URL(string: "https://claude.com/claude-code")!) }
    @objc func pickLanguage(_ sender: NSMenuItem) { UserDefaults.standard.set(sender.representedObject as? String, forKey: "lang") }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.accessory)
app.run()
