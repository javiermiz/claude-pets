import React from "react";
import { AbsoluteFill, Easing, Sequence, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as loadPixelify } from "@remotion/google-fonts/PixelifySans";
import { loadFont as loadPressStart } from "@remotion/google-fonts/PressStart2P";

// Fully scripted: the app's own sprites and UI pieces, rebuilt here, so every frame is crisp and in any language.
// Two pixel fonts: Pixelify Sans for headlines and UI copy, Press Start 2P for labels.
const { fontFamily: DISPLAY } = loadPixelify("normal", { weights: ["400", "500", "600", "700"] });
const { fontFamily: PIXEL } = loadPressStart();

const INK = "#120d24", PURPLE = "#2b1d4e", ORANGE = "#f08a2b", PINK = "#f29bb0", MINT = "#7fcf6a", CREAM = "#f7f3ea", YELLOW = "#ffd84a", SKY = "#8fd3ff", GREEN = "#34c759";

type Lang = "en" | "es";
// es: neutral Spanish (no regionalisms)
const T = {
  en: {
    tagline: "A companion for Claude Code.", sub: "See what your agents are doing — and when it's your turn.",
    plates: ["Fix checkout bug", "Add dark mode", "Write API docs"],
    openBubbles: ["Fixing the cart total", "Splitting the work", "Documenting auth"],
    bubblesK: "LIVE BUBBLES", bubbles: "See what they're doing", live: "LIVE SUMMARIES",
    steps: ["Reproducing the checkout crash", "Fixing the empty cart total", "Running the payment tests"],
    turnK: "NOTIFICATIONS", turn: "Know when it's your turn", ready: "Ready for your reply", now: "now",
    doneLabel: "Fixed the crash, asks to merge",
    meetingK: "SUBAGENTS", meeting: "Subagents? Team meeting.", subagents: "SUBAGENTS",
    meetingLines: ["Splitting the work with the team", "Auditing the color tokens", "Updating the settings screen", "Checking contrast ratios"],
    charsK: "CHARACTERS", chars: "Pick your crew", pets: "PETS", workers: "WORKERS",
    hoverK: "HOVER", hover: "Hover for the full story",
    card: { status: "Finished 1 minute ago", said: "Fixed: the cart total is no longer empty. All 42 payment tests pass. Merge it?", footer: "Finished · click to see it" },
    tags: ["WORKS WITH CLAUDE CODE", "FREE & OPEN SOURCE", "MACOS 14+"],
  },
  es: {
    tagline: "Un compañero para Claude Code.", sub: "Mira qué hacen tus agentes y cuándo te toca.",
    plates: ["Arreglar el checkout", "Modo oscuro", "Documentar la API"],
    openBubbles: ["Arreglando el carrito", "Repartiendo el trabajo", "Documentando el login"],
    bubblesK: "BURBUJAS EN VIVO", bubbles: "Mira qué están haciendo", live: "RESÚMENES EN VIVO",
    steps: ["Reproduciendo el error del checkout", "Arreglando el total vacío del carrito", "Ejecutando las pruebas de pagos"],
    turnK: "AVISOS", turn: "Sabrás cuándo te toca", ready: "Listo para tu respuesta", now: "ahora",
    doneLabel: "Listo, pregunta si hace merge",
    meetingK: "SUBAGENTES", meeting: "¿Subagentes? Reunión de equipo.", subagents: "SUBAGENTES",
    meetingLines: ["Repartiendo el trabajo en equipo", "Revisando los tokens de color", "Actualizando la pantalla de ajustes", "Revisando el contraste"],
    charsK: "PERSONAJES", chars: "Elige a tu equipo", pets: "MASCOTAS", workers: "OFICINA",
    hoverK: "HOVER", hover: "Pasa el cursor: lo ves todo",
    card: { status: "Terminó hace 1 minuto", said: "Listo: el total del carrito ya no sale vacío. Pasan las 42 pruebas de pagos. ¿Hago el merge?", footer: "Terminó · clic para verlo" },
    tags: ["FUNCIONA CON CLAUDE CODE", "GRATIS Y OPEN SOURCE", "MACOS 14+"],
  },
};
type Copy = typeof T.en;

const S = { open: 0, bubbles: 120, turn: 255, meeting: 405, chars: 525, hover: 645, outro: 765 };
export const DURATION = 915;
const IMPACTS = [16, S.turn + 24, S.meeting + 40, S.chars + 8, S.outro + 10];

// ---------- helpers
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = (f: number, a: number, b: number, from = 0, to = 1, e = Easing.bezier(0.16, 1, 0.3, 1)) => interpolate(f, [a, b], [from, to], { ...clamp, easing: e });
const useSpr = (delay = 0, config: { damping?: number; stiffness?: number; mass?: number } = { damping: 13, stiffness: 160, mass: 0.8 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config });
};

// sprite sheets from the app: name -> [frames, w, h] (outline included)
const SPRITES: Record<string, [number, number, number]> = { chair_side: [1, 11, 14], desk_side: [3, 24, 16], meeting_table: [1, 32, 16] };
["cat", "fox", "bunny", "dog", "panda", "frog", "penguin", "duck", "pig", "koala", "hamster", "red_panda"].forEach((p) => (SPRITES[p] = [5, 18, 13]));
for (let i = 0; i < 16; i++) SPRITES["worker_" + String(i).padStart(2, "0")] = [12, 16, 16];
const Sprite: React.FC<{ name: string; frame: number; scale: number; flip?: boolean; style?: React.CSSProperties }> = ({ name, frame, scale, flip, style }) => {
  const [n, w, h] = SPRITES[name];
  return <div style={{ width: w * scale, height: h * scale, imageRendering: "pixelated", backgroundImage: `url(${staticFile(`sprites/${name}.png`)})`, backgroundSize: `${n * w * scale}px ${h * scale}px`, backgroundPosition: `${-(((frame % n) + n) % n) * w * scale}px 0`, transform: flip ? "scaleX(-1)" : undefined, ...style }} />;
};
const walk = (name: string, f: number) => (SPRITES[name][0] === 5 ? f % 4 : 6 + [0, 1, 0, 2][f % 4]);

// ---------- the app's UI pieces
const Icon: React.FC<{ kind: "gear" | "check" | "hourglass" | "people" | "folder"; size: number; spin?: number; color?: string }> = ({ kind, size, spin = 0, color = "#fff" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ flexShrink: 0, transform: `rotate(${spin}deg)` }}>
    {kind === "gear" && <g fill={color}>{Array.from({ length: 8 }, (_, i) => <rect key={i} x="10" y="1" width="4" height="6" rx="1" transform={`rotate(${i * 45} 12 12)`} />)}<circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="3" fill="rgba(0,0,0,0.55)" /></g>}
    {kind === "check" && <g><circle cx="12" cy="12" r="11" fill={color} /><path d="M6.5 12.5l3.5 3.5 7.5-8" stroke={GREEN} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" /></g>}
    {kind === "hourglass" && <path d="M6 2h12v4l-4 6 4 6v4H6v-4l4-6-4-6z" fill={color} />}
    {kind === "people" && <g fill={color}><circle cx="8" cy="8" r="4" /><circle cx="17" cy="9" r="3" /><path d="M1 21c0-5 3-8 7-8s7 3 7 8z" /><path d="M14 21c0-3 1-6 3-7 3 0 6 2 6 7z" /></g>}
    {kind === "folder" && <path d="M2 6h7l2 2h11v12H2z" fill="none" stroke={color} strokeWidth="2" />}
  </svg>
);

type State = "working" | "waiting" | "done";
const Plate: React.FC<{ name: string; state: State; K: number; t: number; count?: number }> = ({ name, state, K, t, count }) => (
  <div style={{ display: "inline-flex", alignItems: "center", gap: 1.4 * K, padding: `${1 * K}px ${2.6 * K}px`, borderRadius: 99, background: state === "done" ? GREEN : "rgba(0,0,0,0.65)", color: "#fff", fontFamily: DISPLAY, fontWeight: 600, fontSize: 3.8 * K, whiteSpace: "nowrap", lineHeight: 1.2 }}>
    <Icon kind={state === "done" ? "check" : state === "working" ? "gear" : "hourglass"} size={3.8 * K} spin={state === "working" ? t * 6 : 0} />
    {name}
    {count ? <span style={{ color: YELLOW, display: "inline-flex", alignItems: "center", gap: 0.8 * K }}>· {count}<Icon kind="people" size={3.8 * K} color={YELLOW} /></span> : null}
  </div>
);
const Bubble: React.FC<{ text: string; K: number; typed?: number }> = ({ text, K, typed }) => (
  <div style={{ padding: `${1.2 * K}px ${2.4 * K}px`, borderRadius: 2 * K, background: "#fff", border: `${0.5 * K}px solid #000`, color: "#000", fontFamily: DISPLAY, fontWeight: 500, fontSize: 3.8 * K, whiteSpace: "nowrap", lineHeight: 1.2 }}>
    {typed === undefined ? text : text.slice(0, typed)}{typed !== undefined && typed < text.length ? "▌" : ""}
  </div>
);
// bubble + name tag stacked over a station, like the app
const Labeled: React.FC<{ K: number; bubble?: React.ReactNode; plate: React.ReactNode; children: React.ReactNode; lift?: number }> = ({ K, bubble, plate, children, lift = 0 }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1.4 * K }}>
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1.4 * K, transform: `translateY(${-lift}px)` }}>{bubble}{plate}</div>
    {children}
  </div>
);

// a worker at their desk: typing, waiting (still, screen off) or done (up and cheering)
const Desk: React.FC<{ K: number; t: number; worker: string; state: State }> = ({ K, t, worker, state }) => {
  const cheer = Math.floor(t / 5) % 2 === 0;
  return (
    <div style={{ position: "relative", width: 36 * K, height: 22 * K }}>
      <Sprite name="chair_side" frame={0} scale={K} style={{ position: "absolute", left: 0, bottom: 0 }} />
      {state === "done"
        ? <Sprite name={worker} frame={cheer ? 11 : 0} scale={K} style={{ position: "absolute", left: -1 * K, bottom: (cheer ? 3 : 0) * K }} />
        : <Sprite name={worker} frame={state === "working" ? 9 + (Math.floor(t / 3) % 2) : 9} scale={K} style={{ position: "absolute", left: 1 * K, bottom: 1 * K }} />}
      <Sprite name="desk_side" frame={state === "working" ? Math.floor(t / 12) % 2 : 2} scale={K} style={{ position: "absolute", left: 12 * K, bottom: 0 }} />
    </div>
  );
};
// a session with subagents: everyone around the table, the speaker bobs
const MeetingTable: React.FC<{ K: number; t: number; members: string[]; speaker: number }> = ({ K, t, members, speaker }) => {
  const left = Math.ceil(members.length / 2);
  const w = left * 14 + 34 + (members.length - left) * 14;
  return (
    <div style={{ position: "relative", width: w * K, height: 22 * K }}>
      <Sprite name="meeting_table" frame={0} scale={K} style={{ position: "absolute", left: (left * 14 + 2) * K, bottom: 0 }} />
      {members.map((m, i) => {
        const x = i < left ? i * 14 : left * 14 + 34 + (i - left) * 14;
        return <Sprite key={i} name={m} frame={6} scale={K} flip={i >= left} style={{ position: "absolute", left: x * K, bottom: (i === speaker && Math.floor(t / 4) % 2 ? 1 : 0) * K }} />;
      })}
    </div>
  );
};

// ---------- shared look
const Background: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: `radial-gradient(120% 90% at 50% 40%, ${PURPLE} 0%, ${INK} 72%)` }}>
      <AbsoluteFill style={{ opacity: 0.07, backgroundImage: `linear-gradient(${CREAM} 2px, transparent 2px), linear-gradient(90deg, ${CREAM} 2px, transparent 2px)`, backgroundSize: "60px 60px", backgroundPosition: `${frame * 0.8}px ${frame * 0.4}px` }} />
      {Array.from({ length: 30 }, (_, i) => {
        const x = random(`mx${i}`) * 1920, speed = 0.5 + random(`ms${i}`) * 1.4, size = 6 + Math.round(random(`mz${i}`) * 3) * 4;
        const y = (((random(`my${i}`) * 1200 - frame * speed) % 1200) + 1200) % 1200 - 60;
        return <div key={i} style={{ position: "absolute", left: x, top: y, width: size, height: size, background: [ORANGE, PINK, MINT, YELLOW, CREAM][i % 5], opacity: 0.14 + random(`mo${i}`) * 0.2 }} />;
      })}
      <AbsoluteFill style={{ background: "radial-gradient(80% 80% at 50% 50%, transparent 55%, rgba(0,0,0,0.6) 100%)" }} />
    </AbsoluteFill>
  );
};
const useShake = () => {
  const frame = useCurrentFrame();
  const hit = IMPACTS.find((f) => frame >= f && frame < f + 10);
  if (hit === undefined) return { x: 0, y: 0 };
  const k = 1 - (frame - hit) / 10;
  return { x: (random(`sx${frame}`) - 0.5) * 24 * k, y: (random(`sy${frame}`) - 0.5) * 24 * k };
};
const Flash: React.FC = () => {
  const frame = useCurrentFrame();
  const o = Math.max(0, ...IMPACTS.map((f) => interpolate(frame - f, [0, 1, 5], [0, 0.3, 0], clamp)));
  return <AbsoluteFill style={{ background: CREAM, opacity: o, pointerEvents: "none" }} />;
};
const Slam: React.FC<{ text: string; delay: number; size: number; color?: string; style?: React.CSSProperties }> = ({ text, delay, size, color = CREAM, style }) => {
  const s = useSpr(delay, { damping: 10, stiffness: 220, mass: 0.7 });
  return <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: size, lineHeight: 1.05, color, textAlign: "center", whiteSpace: "nowrap", transform: `scale(${2.4 - 1.4 * s})`, opacity: Math.min(1, s * 1.6), filter: `blur(${Math.max(0, 1 - s) * 14}px)`, textShadow: "0 8px 0 rgba(0,0,0,0.35)", ...style }}>{text}</div>;
};
const Headline: React.FC<{ kicker: string; title: string; color: string }> = ({ kicker, title, color }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 50, textAlign: "center" }}>
      <div style={{ fontFamily: PIXEL, fontSize: 26, color, letterSpacing: 3, opacity: ease(frame, 0, 8), marginBottom: 20 }}>{kicker}</div>
      <div style={{ display: "flex", justifyContent: "center", gap: "0 28px", flexWrap: "wrap", padding: "0 80px" }}>
        {title.split(" ").map((w, i) => {
          const s = spring({ frame: frame - 3 - i * 3, fps, config: { damping: 11, stiffness: 200 } });
          return <span key={i} style={{ display: "inline-block", fontFamily: DISPLAY, fontWeight: 700, fontSize: 100, lineHeight: 1.05, color: CREAM, transform: `translateY(${(1 - s) * 70}px) scale(${0.6 + 0.4 * s})`, opacity: s, textShadow: "0 6px 0 rgba(0,0,0,0.35)" }}>{w}</span>;
        })}
      </div>
    </div>
  );
};
const Tag: React.FC<{ children: React.ReactNode; bg: string; size?: number; color?: string }> = ({ children, bg, size = 30, color = INK }) => (
  <div style={{ display: "inline-block", padding: `${size * 0.7}px ${size}px`, background: bg, color, fontFamily: PIXEL, fontSize: size, lineHeight: 1, borderRadius: 6, whiteSpace: "nowrap", boxShadow: "0 8px 0 rgba(0,0,0,0.3)" }}>{children}</div>
);
// the "stage" where the app lives in close-ups: a soft desktop wallpaper panel
const Stage: React.FC<{ top: number; height: number; children: React.ReactNode }> = ({ top, height, children }) => {
  const s = useSpr(0, { damping: 15, stiffness: 110, mass: 1 });
  return (
    <div style={{ position: "absolute", left: 100, right: 100, top, height, borderRadius: 26, overflow: "hidden", background: "linear-gradient(180deg, #6fb8e6 0%, #3d9cc4 45%, #1f7f8f 100%)", boxShadow: "0 40px 100px rgba(0,0,0,0.55), 0 0 0 4px rgba(255,255,255,0.12)", transform: `translateY(${(1 - s) * 220}px) scale(${0.9 + 0.1 * s})`, opacity: s }}>
      <AbsoluteFill style={{ opacity: 0.18, backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0.5) 0 2px, transparent 2px 22px)" }} />
      {children}
    </div>
  );
};
const Confetti: React.FC<{ x: number; y: number; delay: number; count?: number }> = ({ x, y, delay, count = 70 }) => {
  const frame = useCurrentFrame();
  const t = frame - delay;
  if (t < 0) return null;
  return <>{Array.from({ length: count }, (_, i) => {
    const a = random(`ca${i}`) * Math.PI * 2, v = 10 + random(`cv${i}`) * 20;
    const size = 12 + Math.round(random(`cs${i}`) * 2) * 8;
    return <div key={i} style={{ position: "absolute", left: x + Math.cos(a) * v * t, top: y + Math.sin(a) * v * t - 8 * t + 0.7 * t * t, width: size, height: size, background: [ORANGE, PINK, MINT, YELLOW, SKY][i % 5], transform: `rotate(${t * 14 * (i % 2 ? 1 : -1)}deg)`, opacity: interpolate(t, [30, 55], [1, 0], clamp) }} />;
  })}</>;
};
const PAW = ["..XX..XX..", "..XX..XX..", "XX......XX", "XX.XXXX.XX", "...XXXXXX.", "..XXXXXXXX", "..XXXXXXXX", "...XXXXXX."];
const Paw: React.FC<{ cell: number; delay?: number; color?: [string, string] }> = ({ cell, delay = 0, color = [PINK, ORANGE] }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ position: "relative", width: cell * 10, height: cell * 8, flexShrink: 0 }}>
      {PAW.flatMap((row, r) => [...row].map((ch, c) => {
        if (ch !== "X") return null;
        const s = spring({ frame: frame - delay - Math.hypot(c - 4.5, r - 4) * 2, fps, config: { damping: 10, stiffness: 200 } });
        return <div key={`${r}-${c}`} style={{ position: "absolute", left: c * cell, top: r * cell, width: cell - Math.max(1, cell / 10), height: cell - Math.max(1, cell / 10), background: r < 4 ? color[0] : color[1], transform: `scale(${s}) rotate(${(1 - s) * 90}deg)` }} />;
      }))}
    </div>
  );
};
const Parade: React.FC<{ names: string[]; y: number; scale: number; speed: number; gap: number; offset?: number }> = ({ names, y, scale, speed, gap, offset = 0 }) => {
  const frame = useCurrentFrame();
  return <>{names.map((n, i) => <Sprite key={i} name={n} frame={walk(n, Math.floor(frame / 4) + i)} scale={scale} style={{ position: "absolute", left: -260 + offset + frame * speed - i * gap, top: y - SPRITES[n][2] * scale }} />)}</>;
};

// ---------- 1. opening: a Mac desktop with the strip at work, logo on top, from frame 0
const Open: React.FC<{ t: Copy }> = ({ t }) => {
  const f = useCurrentFrame();
  const K = 8;
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 0, right: 0, top: 36, display: "flex", justifyContent: "center", alignItems: "center", gap: 36 }}>
        <Paw cell={16} delay={-40} />
        <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 130, color: CREAM, textShadow: "0 8px 0 rgba(0,0,0,0.35)" }}>Claude Pets</div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 200 }}><Slam text={t.tagline} delay={10} size={72} color={ORANGE} /></div>
      {/* the Mac screen */}
      <div style={{ position: "absolute", left: 90, right: 90, top: 300, bottom: 40, borderRadius: 26, overflow: "hidden", background: "linear-gradient(180deg, #6fb8e6 0%, #3d9cc4 50%, #1f7f8f 100%)", boxShadow: "0 40px 100px rgba(0,0,0,0.55), 0 0 0 6px #2a2438", transform: `scale(${1 + ease(f, 0, 120, 0, 0.03, Easing.linear)})` }}>
        <div style={{ height: 34, background: "rgba(20,16,36,0.55)", display: "flex", alignItems: "center", padding: "0 22px", gap: 22 }}>
          {[34, 26, 30, 40].map((w, i) => <div key={i} style={{ width: w, height: 8, borderRadius: 4, background: "rgba(255,255,255,0.55)" }} />)}
          <div style={{ flex: 1 }} />
          <Paw cell={2.6} delay={-60} color={[CREAM, CREAM]} />
          {[22, 22, 50].map((w, i) => <div key={i} style={{ width: w, height: 8, borderRadius: 4, background: "rgba(255,255,255,0.55)" }} />)}
        </div>
        <div style={{ position: "absolute", left: 50, right: 50, top: 150, opacity: ease(f, 30, 44), fontFamily: DISPLAY, fontWeight: 500, fontSize: 44, color: "#fff", textAlign: "center", textShadow: "0 4px 0 rgba(0,0,0,0.25)" }}>{t.sub}</div>
        <div style={{ position: "absolute", left: 50, right: 50, bottom: 22, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <Labeled K={K} bubble={<Bubble K={K} text={t.openBubbles[0]} />} plate={<Plate K={K} t={f} name={t.plates[0]} state="working" />}><Desk K={K} t={f} worker="worker_00" state="working" /></Labeled>
          <Labeled K={K} bubble={<Bubble K={K} text={t.openBubbles[1]} />} plate={<Plate K={K} t={f} name={t.plates[1]} state="working" count={3} />}>
            <MeetingTable K={K} t={f} members={["worker_05", "worker_09", "worker_03", "worker_12"]} speaker={Math.floor(f / 20) % 4} />
          </Labeled>
          <Labeled K={K} bubble={<Bubble K={K} text={t.openBubbles[2]} />} plate={<Plate K={K} t={f} name={t.plates[2]} state="working" />}><Desk K={K} t={f + 7} worker="worker_07" state="working" /></Labeled>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------- 2. bubbles: a close-up whose bubble keeps updating
const Bubbles: React.FC<{ t: Copy }> = ({ t }) => {
  const f = useCurrentFrame();
  const K = 14;
  const step = Math.min(2, Math.floor(f / 42));
  const typed = Math.floor((f - step * 42) * 1.6);
  const p = ease(f, 20, 36);
  return (
    <AbsoluteFill>
      <Headline kicker={t.bubblesK} title={t.bubbles} color={SKY} />
      <Stage top={280} height={760}>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 40, display: "flex", justifyContent: "center" }}>
          <Labeled K={K} bubble={<Bubble K={K} text={t.steps[step]} typed={typed} />} plate={<Plate K={K} t={f} name={t.plates[0]} state="working" />}>
            <Desk K={K} t={f} worker="worker_00" state="working" />
          </Labeled>
        </div>
      </Stage>
      <div style={{ position: "absolute", right: 140, top: 310, opacity: p, transform: `scale(${0.6 + 0.4 * p}) rotate(${(1 - p) * -8}deg)`, transformOrigin: "right top" }}>
        <Tag bg={YELLOW} size={30}>{t.live}</Tag>
      </div>
    </AbsoluteFill>
  );
};

// ---------- 3. your turn: it finishes, cheers, the tag turns green and the notification lands
const Notification: React.FC<{ t: Copy; delay: number }> = ({ t, delay }) => {
  const n = useSpr(delay, { damping: 11, stiffness: 160 });
  return (
    <div style={{ position: "absolute", right: 70, top: 300, width: 760, transform: `translateX(${(1 - n) * 950}px) rotate(${(1 - n) * 6}deg)`, borderRadius: 28, padding: 30, background: "rgba(246,243,250,0.97)", boxShadow: "0 40px 90px rgba(0,0,0,0.5)", display: "flex", gap: 26, alignItems: "center" }}>
      <div style={{ width: 120, height: 120, borderRadius: 24, background: "#e8e4f0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Paw cell={8.5} delay={-60} />
      </div>
      <div style={{ flex: 1, fontFamily: DISPLAY }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: 44, fontWeight: 700, color: INK }}>{t.plates[0]}<span style={{ fontWeight: 400, color: "#8a84a0", fontSize: 30 }}>{t.now}</span></div>
        <div style={{ fontSize: 40, color: "#3a3348", marginTop: 6 }}>{t.ready}</div>
      </div>
    </div>
  );
};
const YourTurn: React.FC<{ t: Copy }> = ({ t }) => {
  const f = useCurrentFrame();
  const K = 11;
  const done = f >= 22;
  const bob = done ? Math.abs(Math.sin(f * 0.25)) * 16 : 0;
  return (
    <AbsoluteFill>
      <Headline kicker={t.turnK} title={t.turn} color={MINT} />
      <Stage top={280} height={760}>
        <div style={{ position: "absolute", left: 140, bottom: 40 }}>
          <Labeled K={K} lift={bob} bubble={<Bubble K={K} text={done ? "💬 " + t.doneLabel : t.steps[2]} />} plate={<Plate K={K} t={f} name={t.plates[0]} state={done ? "done" : "working"} />}>
            <Desk K={K} t={f} worker="worker_00" state={done ? "done" : "working"} />
          </Labeled>
        </div>
      </Stage>
      <Confetti x={360} y={880} delay={24} />
      <Notification t={t} delay={26} />
    </AbsoluteFill>
  );
};

// ---------- 4. meeting
const Meeting: React.FC<{ t: Copy }> = ({ t }) => {
  const f = useCurrentFrame();
  const K = 10;
  const speaker = Math.floor(f / 26) % 4;
  const badge = useSpr(40, { damping: 8, stiffness: 200, mass: 0.7 });
  return (
    <AbsoluteFill>
      <Headline kicker={t.meetingK} title={t.meeting} color={PINK} />
      <Stage top={280} height={760}>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 40, display: "flex", justifyContent: "center", paddingLeft: 260 }}>
          <Labeled K={K} bubble={<Bubble K={K} text={t.meetingLines[speaker]} />} plate={<Plate K={K} t={f} name={t.plates[1]} state="working" count={3} />}>
            <MeetingTable K={K} t={f} members={["worker_05", "worker_09", "worker_03", "worker_12"]} speaker={speaker} />
          </Labeled>
        </div>
      </Stage>
      <div style={{ position: "absolute", left: 110, top: 560, transform: `scale(${badge}) rotate(${(1 - badge) * -40}deg)` }}>
        <div style={{ width: 330, height: 330, borderRadius: 165, background: PINK, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: `0 0 0 10px ${INK}, 0 0 90px ${PINK}88` }}>
          <div style={{ fontFamily: PIXEL, fontSize: 110, color: INK, lineHeight: 1 }}>+3</div>
          <div style={{ fontFamily: PIXEL, fontSize: 22, color: INK, marginTop: 22 }}>{t.subagents}</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------- 5. characters
const Characters: React.FC<{ t: Copy }> = ({ t }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cast = ["cat", "worker_00", "fox", "worker_05", "panda", "worker_09", "bunny", "worker_03", "penguin", "worker_12", "frog", "worker_07"];
  const toggle = ease(frame, 60, 72);
  return (
    <AbsoluteFill>
      <Headline kicker={t.charsK} title={t.chars} color={ORANGE} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 300, display: "flex", justifyContent: "center" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 240px)", gap: 30 }}>
          {cast.map((n, i) => {
            const s = spring({ frame: frame - 8 - i * 2, fps, config: { damping: 9, stiffness: 170 } });
            const pet = SPRITES[n][0] === 5, on = pet ? 1 - toggle : toggle;
            const f = Math.floor(frame / 4) + i;
            return (
              <div key={n} style={{ height: 240, borderRadius: 14, background: on > 0.5 ? "rgba(240,138,43,0.18)" : "rgba(255,255,255,0.05)", border: `4px solid ${on > 0.5 ? ORANGE : "rgba(255,255,255,0.08)"}`, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${s * (0.86 + 0.14 * on)}) translateY(${(1 - s) * 120}px)`, opacity: s * (0.35 + 0.65 * on) }}>
                <Sprite name={n} frame={pet ? f % 4 : frame > 80 && i % 4 === 1 ? (Math.floor(frame / 6) % 2 ? 11 : 0) : walk(n, f)} scale={11} />
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 870, display: "flex", justifyContent: "center", opacity: ease(frame, 20, 32) }}>
        <div style={{ position: "relative", display: "flex", background: "#2a2438", borderRadius: 10, padding: 10, boxShadow: "0 8px 0 rgba(0,0,0,0.3)" }}>
          <div style={{ position: "absolute", top: 10, bottom: 10, left: 10 + toggle * 330, width: 330, borderRadius: 6, background: ORANGE }} />
          {[t.pets, t.workers].map((label, i) => <div key={label} style={{ position: "relative", width: 330, textAlign: "center", padding: "24px 0", fontFamily: PIXEL, fontSize: 30, color: (i === 1) === toggle > 0.5 ? INK : CREAM }}>{label}</div>)}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------- 6. hover: the cursor comes in and the card opens
const Cursor: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <svg width="56" height="80" viewBox="0 0 14 20" style={{ position: "absolute", left: x, top: y, filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.4))" }}>
    <path d="M1 1v16l4-4 3 6 3-1-3-6h6z" fill="#000" stroke="#fff" strokeWidth="1.3" strokeLinejoin="round" />
  </svg>
);
const Hover: React.FC<{ t: Copy }> = ({ t }) => {
  const f = useCurrentFrame();
  const K = 8;
  const c = ease(f, 8, 34, 0, 1, Easing.inOut(Easing.cubic));
  const card = useSpr(34, { damping: 13, stiffness: 170 });
  return (
    <AbsoluteFill>
      <Headline kicker={t.hoverK} title={t.hover} color={YELLOW} />
      <Stage top={280} height={760}>
        <div style={{ position: "absolute", left: 140, bottom: 40 }}>
          <Labeled K={K} bubble={<Bubble K={K} text={"💬 " + t.doneLabel} />} plate={<Plate K={K} t={f} name={t.plates[0]} state="done" />}>
            <Desk K={K} t={f} worker="worker_00" state="done" />
          </Labeled>
        </div>
        {/* the hover card, like the app's */}
        <div style={{ position: "absolute", left: 760, top: 60, width: 900, borderRadius: 34, padding: 40, background: "rgba(24,72,78,0.96)", color: "#fff", fontFamily: DISPLAY, boxShadow: "0 30px 80px rgba(0,0,0,0.45)", transform: `scale(${0.7 + 0.3 * card})`, transformOrigin: "left bottom", opacity: card }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <Sprite name="worker_00" frame={0} scale={5} />
            <div style={{ fontSize: 56, fontWeight: 700 }}>{t.plates[0]}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 36, marginTop: 18, color: "#d8e6e8" }}><Icon kind="folder" size={34} color="#d8e6e8" />shop-web</div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 36, marginTop: 10, color: "#d8e6e8" }}><Icon kind="check" size={34} color="#9fd6c0" />{t.card.status}</div>
          <div style={{ fontSize: 44, fontWeight: 700, marginTop: 20 }}>{t.doneLabel}</div>
          <div style={{ fontSize: 34, marginTop: 10, color: "#c7dadc", lineHeight: 1.3 }}>💬 {t.card.said}</div>
          <div style={{ fontSize: 28, marginTop: 18, color: "#8fb0b4" }}>{t.card.footer}</div>
        </div>
      </Stage>
      <Cursor x={1500 - c * 1110} y={980 - c * 150} />
    </AbsoluteFill>
  );
};

// ---------- 7. outro
const Outro: React.FC<{ t: Copy }> = ({ t }) => {
  const frame = useCurrentFrame();
  const url = "github.com/javiermiz/claude-pets";
  const typed = Math.floor(ease(frame, 44, 84, 0, url.length, Easing.linear));
  return (
    <AbsoluteFill style={{ alignItems: "center" }}>
      <div style={{ marginTop: 130, display: "flex", alignItems: "center", gap: 48 }}>
        <Paw cell={24} delay={0} />
        <Slam text="Claude Pets" delay={8} size={190} color={ORANGE} />
      </div>
      <div style={{ display: "flex", gap: 24, marginTop: 50 }}>
        {t.tags.map((tag, i) => (
          <div key={tag} style={{ opacity: ease(frame, 22 + i * 5, 32 + i * 5), transform: `translateY(${ease(frame, 22 + i * 5, 32 + i * 5, 40, 0)}px)` }}>
            <Tag bg={[ORANGE, PINK, MINT][i]} size={26}>{tag}</Tag>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 64, fontFamily: PIXEL, fontSize: 46, color: CREAM, opacity: ease(frame, 40, 46), textShadow: "0 6px 0 rgba(0,0,0,0.35)" }}>
        {url.slice(0, typed)}<span style={{ opacity: Math.floor(frame / 8) % 2 ? 1 : 0, color: ORANGE }}>_</span>
      </div>
      <Confetti x={960} y={260} delay={12} count={90} />
      <Parade names={["cat", "worker_00", "fox", "worker_05", "bunny", "worker_09", "panda", "worker_03", "penguin", "worker_12", "frog", "worker_07", "duck", "koala"]} y={1050} scale={7} speed={13} gap={150} offset={300} />
    </AbsoluteFill>
  );
};

// ---------- transitions: diagonal wave of pixel blocks
const PixelWipe: React.FC<{ at: number; color: string }> = ({ at, color }) => {
  const frame = useCurrentFrame();
  const t = frame - at + 12;
  if (t < 0 || t > 30) return null;
  return (
    <AbsoluteFill>
      {Array.from({ length: 16 * 9 }, (_, i) => {
        const c = i % 16, r = Math.floor(i / 16);
        const s = interpolate(t - (c + r) * 0.7, [0, 6, 12, 18], [0, 1, 1, 0], clamp);
        return <div key={i} style={{ position: "absolute", left: c * 120, top: r * 120, width: 120, height: 120, background: (c + r) % 3 === 0 ? PINK : color, transform: `scale(${s * 1.02})` }} />;
      })}
    </AbsoluteFill>
  );
};

export const Promo: React.FC<{ lang: Lang }> = ({ lang }) => {
  const t = T[lang];
  const shake = useShake();
  const seq = (from: number, to: number, el: React.ReactNode) => <Sequence from={from} durationInFrames={to - from}>{el}</Sequence>;
  return (
    <AbsoluteFill style={{ backgroundColor: INK }}>
      <Background />
      <AbsoluteFill style={{ transform: `translate(${shake.x}px, ${shake.y}px)` }}>
        {seq(S.open, S.bubbles, <Open t={t} />)}
        {seq(S.bubbles, S.turn, <Bubbles t={t} />)}
        {seq(S.turn, S.meeting, <YourTurn t={t} />)}
        {seq(S.meeting, S.chars, <Meeting t={t} />)}
        {seq(S.chars, S.hover, <Characters t={t} />)}
        {seq(S.hover, S.outro, <Hover t={t} />)}
        {seq(S.outro, DURATION, <Outro t={t} />)}
      </AbsoluteFill>
      <Flash />
      {[S.bubbles, S.turn, S.meeting, S.chars, S.hover, S.outro].map((at, i) => <PixelWipe key={at} at={at} color={[SKY, MINT, PINK, ORANGE, YELLOW, ORANGE][i]} />)}
    </AbsoluteFill>
  );
};
