// Side-view 8-bit pets, facing right (the app mirrors them when walking left).
// Strip of 5 frames: 0-3 walk cycle (stride, bob, other stride, bob), 4 lying down.
pal({
  k: "#1b1630", e: "#1b1630", p: "#f29bb0",
  o: "#f0a04b", O: "#c46a2b", w: "#f4f0e6", W: "#c9c2b5",
  b: "#a0704a", B: "#6b4630", g: "#9aa0aa", G: "#5f6670", d: "#3a3348", D: "#241f30",
  y: "#ffd84a", Y: "#e8b030", a: "#f08a2b", n: "#2b2738", z: "#7fcf6a", Z: "#4f9a4a",
  v: "#d8f0a0", q: "#f7a8bf", Q: "#d9748f", t: "#d8b48a", T: "#a8845e", l: "#c8e09a",
  S: "#f2c9a0", h: "#3a2a2a", u: "#6aa0e8", U: "#4a78c0", // workers: skin, hair, shirt
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
// 14x14 + outline. Frames: 0-2 front, 3-5 back, 6-8 side (faces right), 9-10 seated typing, 11 cheering
const m = (r) => r + [...r].reverse().join("")
const FRONT = ["....hhh", "..hhhhh", ".hhhhhh", ".hhhSSS", ".hSSeSS", ".hSpSSS", "..SSSSS", "...uuuu", "..uuuuu", ".SuuuUU", "..uuuuu", "...nnnn"].map(m).join("\n")
const BACK = ["....hhh", "..hhhhh", ".hhhhhh", ".hhhhhh", ".hhhhhh", ".hhhhhh", "..hhhhh", "...uuuu", "..uuuuu", ".SuuuUU", "..uuuuu", "...nnnn"].map(m).join("\n")
const SIDE = `
....hhhhh.....
...hhhhhhhh...
..hhhhhhhhhh..
..hhhhhhSSSS..
..hhhhhSSSeS..
..hhhhhSSSSS..
...hhhSSSpS...
....uuuuuu....
...uuuuuuu....
...uuuUuuu....
...uuuSuuu....
....nnnnn.....`
const LEGS = {
  stand: "....nn..nn....\n....DD..DD....", a: "....nn..nn....\n....DD........", b: "....nn..nn....\n........DD....",
  side: ".....nn.......\n.....DD.......", sa: "....n...n.....\n...DD...DD....", sb: "....n..n......\n....D..D......",
}
const pose = (body, legs, extra = []) => frame(grid(0, 0, body), ...(legs ? [grid(0, 12, LEGS[legs])] : []), ...extra)
function worker(name, swap) {
  anim(name, { w: 14, h: 14, outline: "k", swap },
    pose(FRONT, "stand"), pose(FRONT, "a"), pose(FRONT, "b"),
    pose(BACK, "stand"), pose(BACK, "a"), pose(BACK, "b"),
    pose(SIDE, "side"), pose(SIDE, "sa"), pose(SIDE, "sb"),
    // seated at the desk, facing right: thighs forward, hands on the keyboard (one up, one down)
    frame(grid(0, 1, SIDE), grid(0, 13, "....nnnnnn...."), grid(0, 10, ".......uuuSS..")),
    frame(grid(0, 1, SIDE), grid(0, 13, "....nnnnnn...."), grid(0, 10, ".......uuu...."), grid(10, 9, "S")),
    pose(FRONT, "stand", [grid(0, 2, "S............S\nu............u\nu............u"), grid(6, 6, "kk")]),
  )
}
const SKIN = ["#f2c9a0", "#e0ac7e", "#b97a4f", "#8f5a36"]
const HAIR = ["#3a2a2a", "#7a4a2a", "#e8c060", "#c4552e", "#1b1630", "#f29bb0", "#6aa0e8"]
const SHIRT = [["#6aa0e8", "#4a78c0"], ["#7fcf6a", "#4f9a4a"], ["#b48ce0", "#7f5fb0"], ["#9aa0aa", "#5f6670"], ["#f3e3c3", "#c9b28a"], ["#5ad1c0", "#2f9a8c"]]
const PANTS = ["#3a4a7a", "#3a3348", "#6b4630", "#5f6670"]
for (let i = 0; i < 16; i++) {
  worker("worker_" + String(i).padStart(2, "0"), {
    S: SKIN[i % 4], h: HAIR[(i * 3) % 7], u: SHIRT[(i * 5) % 6][0], U: SHIRT[(i * 5) % 6][1], n: PANTS[(i * 7) % 4],
  })
}
scene("crew", { w: 8 * 18, h: 2 * 18, bg: "#e8e4f0" },
  ...Array.from({ length: 16 }, (_, i) => stamp("worker_" + String(i).padStart(2, "0"), (i % 8) * 18 + 1, Math.floor(i / 8) * 18 + 1, { frame: i % 2 ? 11 : 6 })))

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
