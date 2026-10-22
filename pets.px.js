// Side-view 8-bit pets, facing right (the app mirrors them when walking left).
// Strip of 5 frames: 0-3 walk cycle (stride, bob, other stride, bob), 4 lying down.
pal({
  k: "#1b1630", e: "#1b1630", p: "#f29bb0",
  o: "#f0a04b", O: "#c46a2b", w: "#f4f0e6", W: "#c9c2b5",
  b: "#a0704a", B: "#6b4630", g: "#9aa0aa", G: "#5f6670", d: "#3a3348", D: "#241f30",
  y: "#ffd84a", Y: "#e8b030", a: "#f08a2b", n: "#2b2738", z: "#7fcf6a", Z: "#4f9a4a",
  v: "#d8f0a0", q: "#f7a8bf", Q: "#d9748f", t: "#d8b48a", T: "#a8845e", l: "#c8e09a",
  S: "#f2c9a0", E: "#d8a882", h: "#3a2a2a", u: "#6aa0e8", U: "#4a78c0", // workers: skin, ear, hair, shirt
  c: "#e2585f", C: "#a63a4d", P: "#4a78c1", // cap, cap brim, headphones (unique values: swaps match by color)
})

// Leg rows per frame: strides draw rows 9-10, bob frames only row 10 (body sits 1px lower).
const QUAD = ["....x.x...x.x...\n...x...x.x...x..", "....xx....xx....", "....x.x...x.x...\n....x..x..x..x..", ".....xx....xx..."]
const BIRD = (o) => [".x..x.\nxx..xx", "xx.xx.", ".x..x.\n.xx..xx", ".xx.xx"].map((g) => g.replace(/^|\n/g, (m) => m + ".".repeat(o)))

// Body is 9 rows; legs fill rows 9-10.
function walker(name, leg, body, swap, legs = QUAD) {
  const L = (s) => s.replace(/x/g, leg)
  anim(name, { w: 16, h: 11, fps: 8, outline: "k", swap },
    ...legs.map((g, i) => frame(grid(0, i % 2, body), grid(0, 9 + (i % 2), L(g)))),
    frame(grid(0, 2, body)), // lying down: legs tucked under
  )
}

const CAT = `
..........o..o..
..........oooo..
.o........ooooo.
.o........oeoeo.
..o.......oooopo
..o.oooooooooo..
...ooOooOooooo..
...oooOooOoww...
...wwwwwwwwww...`
walker("cat", "o", CAT)
walker("cat_gray", "o", CAT, { o: "g", O: "G" })
walker("cat_black", "o", CAT, { o: "d", O: "D", e: "#9be36b" })

walker("fox", "O", `
..........o..o..
..........oooo..
ooo.......ooooo.
oooo......oeoooo
wwooo.....oowwwk
.wwoooooooooww..
....oooooooooo..
....oooooooww...
....wwwwwwww....`)

const DOG = `
................
..........bbbb..
.b.......Bbbbbb.
.b.......Bbebbb.
..b......Bbbbbk.
..bbbbbbbbbbbb..
..bbbbbbbbbbbb..
..bbBBbbbbbbb...
..bbbbbbbbbbb...`
walker("dog", "b", DOG)
walker("dog_gray", "b", DOG, { b: "g", B: "G" })

const BUNNY = `
.........w.w....
.........wpw....
.........wpw....
.........wwww...
........wwewww..
...wwwwwwwwwpw..
..wwwwwwwwwww...
.wwwwwwwwwww....
...wwWwwwWww....`
walker("bunny", "w", BUNNY)
walker("bunny_brown", "w", BUNNY, { w: "b", W: "B" })

walker("red_panda", "O", `
..........o..o..
..........oooo..
ooo.......ooooo.
oOoo......oeoooo
wwooo.....oowwwk
.wwoooooooooww..
....oooooooooo..
....oooooooww...
....wwwwwwww....`, { o: "#c4552e", O: "#3a2a2a", w: "#f4e6d6" })

const BEAR = `
................
..........b..b..
..........bbbb..
.........bbebbb.
.........bbbttk.
...bbbbbbbbbbb..
..bbbbbbbbbbbb..
..bbbbbbbbbbb...
..BBBBBBBBBBB...`
walker("bear", "b", BEAR)
walker("polar_bear", "b", BEAR, { b: "w", B: "W", t: "W" })

walker("panda", "n", `
................
..........n..n..
..........wwww..
..........nwwn..
..........wwwwk.
...wwwwwnnnwww..
..wwwwwwnnnwww..
..wwwwwwwwwww...
..WWWWWWWWWWW...`)

const PIG = `
................
..........Q..Q..
..........qqqq..
..........qeqeq.
.Q........qqqqQQ
..Q.qqqqqqqqqqp.
...qqqqqqqqqqq..
...qqqqqqqqqqq..
...QQQQQQQQQQ...`
walker("pig", "q", PIG)

walker("frog", "z", `
................
................
................
.........zzz.zzz
.........zezzzez
....zzzzzzzzzzzz
...zzZzzZzzzzzp.
...zzzzzzzzzzzz.
....vvvvvvvvvv..`)

walker("hamster", "t", `
................
................
................
..........t.t...
.........ttttt..
......ttttttett.
.....ttttttwwwpk
.....ttttttwwww.
......wwwwwwww..`)

walker("mouse", "g", `
................
................
.........gg.....
.........gpg....
..........gggg..
pp........ggegg.
..ppggggggggggp.
....gggggggggg..
.....wwwwwwww...`)

walker("hedgehog", "t", `
................
................
................
....B.B.B.B.....
...BBBBBBBBBt...
..BBbBBbBBBttt..
..BBBBbBBBBtett.
..BBBBBBBBBtttk.
...tttttttttt...`)

walker("koala", "G", `
................
.........gg..gg.
.........gwggwg.
..........gggg..
..........gegDD.
...ggggggggggg..
..gggggggggggg..
..ggggggggwww...
..gggggggggg....`)

walker("sheep", "d", `
................
................
....w.w.w.w.....
...wwwwwwwwwdd..
..wwWwwWwwwdddd.
..wwwwwwwwwdwdd.
..wWwwWwwWwwddp.
...wwwwwwwwww...
....wWwwWwww....`)

walker("turtle", "l", `
................
................
................
................
.....ZZZZZ......
....ZzZzZzZ.lll.
...ZzzZzzZzZllel
..lZZZZZZZZZlll.
....lllllllll...`)

walker("penguin", "a", `
..........ddd...
.........ddddd..
.........ddwed..
.........dwwwdaa
........ddwwwd..
.......dddwwwd..
.......dddwwwd..
........ddwwd...
.........dddd...`, {}, BIRD(8))

walker("chick", "a", `
................
................
..........yy....
.........yyyy...
........yyyeyaa.
.....yyyyyyyy...
....yyYYyyyyy...
.....yyyyyyy....
......yyyyy.....`, {}, BIRD(6))

walker("duck", "a", `
................
..........www...
.........wwwww..
.........wwewwaa
..........www...
.w.......wwww...
.wwwwwwwwwwww...
..wwwWWWwwwww...
...wwwwwwwww....`, {}, BIRD(5))

// One frame of every pet side by side, for review
const ALL = ["cat", "cat_gray", "cat_black", "fox", "red_panda", "dog", "dog_gray", "bunny", "bunny_brown", "bear", "polar_bear",
  "panda", "pig", "frog", "hamster", "mouse", "hedgehog", "koala", "sheep", "turtle", "penguin", "chick", "duck"]
scene("zoo", { w: 6 * 20, h: 4 * 15, bg: "#e8e4f0" }, ...ALL.map((n, i) => stamp(n, (i % 6) * 20 + 1, Math.floor(i / 6) * 15 + 1, { frame: 0 })))

// App icon: the cat on a soft square (build.sh upscales it into AppIcon.icns)
scene("icon", { w: 24, h: 24, bg: "#e8e4f0" }, stamp("cat", 1, 5, { frame: 0 }))

// =============== workers: the alternative style (menu bar 🐾 → Workers)
// 14x14 + outline. Frames: 0-2 front, 3-5 back, 6-8 side (faces right), 9-10 seated typing, 11 cheering,
// 12 held up by the cursor (arms up, legs dangling). Body, hair and accessory are separate layers, so every
// worker mixes a haircut, an accessory and its colors.
const m = (r) => r + [...r].reverse().join("")
const M = (rows) => rows.map(m).join("\n")
const BODY = {
  front: M(["...SSSS", "..SSSSS", ".SSSSSS", ".SSSSSS", ".SSeSSS", ".SpSSSS", "..SSSSS", "..uuuuS", ".Uuuuuu", ".Uuuuuu", ".Suuuuu", "..nnnnn"]),
  back: M(["...SSSS", "..SSSSS", ".SSSSSS", ".SSSSSS", ".SSSSSS", ".SSSSSS", "..SSSSS", "..uuuuu", ".Uuuuuu", ".Uuuuuu", ".Suuuuu", "..nnnnn"]),
  side: `
....SSSSS.....
...SSSSSSS....
..SSSSSSSSS...
..SSSSSSSSSS..
..SSSESSSeSS..
..SSSSSSSpS...
...SSSSSSS....
.....uuuu.....
....uuuuuu....
....uuUuuu....
....uuSuuu....
....nnnnnn....`,
}
// hair per view; "back" covers the whole head
const HAIRCUTS = {
  short: { front: M(["...hhhh", "..hhhhh", ".hhhhhh", ".hh....", ".h....."]),
    side: "....hhhhh.....\n...hhhhhhhh...\n..hhhhhhhhhh..\n..hhh.....h...\n..hh..........\n..h..........." },
  long: { front: M(["...hhhh", "..hhhhh", ".hhhhhh", "hhh....", "hh.....", "hh.....", "hh.....", "hh....."]),
    side: "....hhhhh.....\n...hhhhhhhh...\n..hhhhhhhhhh..\n.hhhh.....h...\n.hhh..........\n.hhh..........\n.hhh..........\n..hh..........\n..h..........." },
  spiky: { front: M(["...h..h", "..hhhhh", ".hhhhhh", ".h.h...", "......."]),
    side: ".....h.h.h....\n...hhhhhhhh...\n..hhhhhhhhhh..\n..hhh....h.h..\n..hh..........\n.............." },
  buzz: { front: M(["...hhhh", "..hhhhh", ".h.....", ".h....."]),
    side: "....hhhhh.....\n...hhhhhhh....\n..hhh.........\n..hh.........." },
  cap: { front: M(["...cccc", "..ccccc", ".CCCCCC", ".h.....", ".h....."]),
    side: "....ccccc.....\n...ccccccc....\n..cccccCCCCCCC\n..hhh.........\n..hh.........." },
  ponytail: { front: M(["...hhhh", "..hhhhh", ".hhhhhh", ".hh....", ".h....."]),
    side: "....hhhhh.....\n...hhhhhhhh...\n.hhhhhhhhhhh..\nhhhhh.....h...\nhh.hh.........\nh............." },
}
const ACCESSORIES = { // y: the row it starts on (pxl trims leading empty rows)
  none: { y: 0, front: "", side: "" },
  glasses: { y: 4, front: M([".kwekkk"]), side: ".....kkkwek" },
  headphones: { y: 0, front: M(["...gggg", "..g....", ".g.....", "PP.....", "PP.....", "PP....."]),
    side: ".....g\n.....g\n.....g\n....PPP\n....PPP\n....PPP" },
  beard: { y: 5, front: M([".h.....", "..hhhhh", "....hhS"]), side: "...hhhhhh\n....hhhhh" },
}
const LEGS = {
  stand: "....nn..nn....\n....DD..DD....", a: "....nn..nn....\n....DD........", b: "....nn..nn....\n........DD....",
  side: ".....nn.......\n.....DD.......", sa: "....n...n.....\n...DD...DD....", sb: "....n..n......\n....D..D......",
  dangle: "...nn....nn...\n...D......D...",
}
// both arms raised from the shoulders, hands over the head (cheering, or held up by the cursor)
const ARMS_UP = [grid(0, 9, "._.........._.\n._.........._."), grid(0, 1, "S............S\nU............U\nU............U\nU............U\nU............U\nU............U\n.U..........U.")]
function worker(name, swap, cut, acc) {
  const head = (view, dy = 0) => view === "back" ? [grid(0, dy, M(["...hhhh", "..hhhhh", ".hhhhhh", ".hhhhhh", ".hhhhhh", ".hhhhhh"]))]
    : [grid(0, dy, HAIRCUTS[cut][view]), grid(0, dy + ACCESSORIES[acc].y, ACCESSORIES[acc][view])]
  const pose = (view, legs, extra = []) => frame(grid(0, 0, BODY[view]), ...head(view), grid(0, 12, LEGS[legs]), ...extra)
  const seated = (arm) => frame(grid(0, 1, BODY.side), ...head("side", 1), grid(0, 13, "....nnnnnn...."),
    grid(6, 11, "u"), ...arm) // the hanging hand becomes sleeve: the arm reaches for the keyboard
  anim(name, { w: 14, h: 14, outline: "k", swap },
    pose("front", "stand"), pose("front", "a"), pose("front", "b"),
    pose("back", "stand"), pose("back", "a"), pose("back", "b"),
    pose("side", "side"), pose("side", "sa"), pose("side", "sb"),
    seated([grid(0, 10, ".......uUuSS..")]),
    seated([grid(0, 10, ".......uUu...."), grid(10, 9, "SS")]),
    pose("front", "stand", [...ARMS_UP, grid(6, 6, "kk")]),
    pose("front", "dangle", [...ARMS_UP, grid(6, 6, "kk")]),
  )
}
const SKIN = ["#f2c9a0", "#e0ac7e", "#b97a4f", "#8f5a36"]
const HAIR = ["#3a2a2a", "#7a4a2a", "#e8c060", "#c4552e", "#1b1630", "#f29bb0", "#6aa0e8", "#c9ccd6"]
const SHIRT = [["#6aa0e8", "#4a78c0"], ["#7fcf6a", "#4f9a4a"], ["#b48ce0", "#7f5fb0"], ["#9aa0aa", "#5f6670"], ["#f3e3c3", "#c9b28a"], ["#5ad1c0", "#2f9a8c"], ["#f08a5d", "#c4552e"], ["#f2c94c", "#c99a2e"]]
const PANTS = ["#3a4a7a", "#3a3348", "#6b4630", "#5f6670"]
const CAPS = [["#e2585e", "#a63a4c"], ["#4a78c0", "#2f4f8a"], ["#4f9a4a", "#2f6a3a"], ["#f2c94c", "#c99a2e"]]
const CUTS = Object.keys(HAIRCUTS)
const ACCS = ["none", "glasses", "headphones", "none", "beard", "glasses", "none", "headphones"]
const WORKERS = 24
// each worker picks its looks from its own little random sequence, so no two neighbors match
const pick = (i, k, list) => list[Math.floor(Math.abs(Math.sin(i * 12.9898 + k * 78.233) * 43758.5453) % list.length)]
for (let i = 0; i < WORKERS; i++) {
  const cut = CUTS[i % CUTS.length], acc = ACCS[(i * 3 + Math.floor(i / 6)) % ACCS.length], skin = pick(i, 1, [0, 1, 2, 3]), shirt = pick(i, 2, SHIRT)
  const cap = pick(i, 4, CAPS)
  worker("worker_" + String(i).padStart(2, "0"), {
    S: SKIN[skin], E: ["#d8a882", "#c48c60", "#9a6038", "#6f4226"][skin], h: pick(i, 3, HAIR),
    u: shirt[0], U: shirt[1], n: pick(i, 5, PANTS), c: cap[0], C: cap[1], P: pick(i, 6, CAPS)[1],
  }, cut, cut === "long" && acc === "headphones" ? "glasses" : acc)
}
scene("crew", { w: 8 * 18, h: 3 * 18, bg: "#e8e4f0" },
  ...Array.from({ length: WORKERS }, (_, i) => stamp("worker_" + String(i).padStart(2, "0"), (i % 8) * 18 + 1, Math.floor(i / 8) * 18 + 1, { frame: 0 })))
scene("poses", { w: 13 * 17, h: 18, bg: "#e8e4f0" },
  ...Array.from({ length: 13 }, (_, f) => stamp("worker_00", f * 17 + 1, 1, { frame: f })))

// workstation and meeting table for the workers style (side view, worker sits on the left facing right)
anim("desk_side", { w: 22, h: 14, outline: "k" },
  rect(0, 6, 22, 2, "#d09a68"), rect(0, 8, 22, 1, "#a8744a"), rect(1, 9, 2, 5, "#7a4e30"), rect(19, 9, 2, 5, "#7a4e30"),
  rect(12, 9, 6, 4, "#7a4e30"), hline(13, 11, 4, "#a8744a"),
  rect(9, 0, 11, 6, "#3a3348"), rect(13, 6, 3, 1, "#7a7f8f"),
  frame(rect(10, 1, 9, 4, "#2a2438"), hline(11, 2, 4, "#7fcf6a"), hline(12, 3, 5, "#8fd3ff")),
  frame(rect(10, 1, 9, 4, "#2a2438"), hline(12, 2, 5, "#8fd3ff"), hline(11, 3, 3, "#ffd84a")),
  frame(rect(10, 1, 9, 4, "#1e1a2a")))
sprite("chair_side", { w: 9, h: 12, outline: "k" },
  rect(0, 0, 3, 7, "#3a3348"), rect(0, 6, 9, 2, "#3a3348"), rect(4, 8, 2, 2, "#7a7f8f"), hline(1, 10, 7, "#7a7f8f"), px(1, 11, "#7a7f8f"), px(7, 11, "#7a7f8f"))
sprite("meeting_table", { w: 30, h: 14, outline: "k" },
  rect(0, 4, 30, 3, "#d09a68"), rect(1, 7, 28, 1, "#a8744a"), rect(13, 8, 4, 4, "#7a4e30"), rect(9, 12, 12, 2, "#7a4e30"),
  rect(5, 1, 3, 3, "#f4f0e6"), px(6, 1, "#5a3a2a"), rect(21, 1, 3, 3, "#f4f0e6"), px(22, 1, "#5a3a2a"), rect(12, 2, 6, 2, "#f4f0e6"))
scene("office_preview", { w: 150, h: 22, bg: "#e8e4f0" },
  stamp("chair_side", 2, 9), stamp("worker_00", 3, 6, { frame: 9 }), stamp("desk_side", 14, 7),
  stamp("worker_03", 44, 6, { frame: 6 }), stamp("worker_05", 58, 6, { frame: 6 }), stamp("meeting_table", 72, 7),
  stamp("worker_07", 104, 6, { frame: 6, flip: "x" }), stamp("worker_09", 118, 6, { frame: 11 }))
