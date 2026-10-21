// Side-view 8-bit pets, facing right (the app mirrors them when walking left).
// Strip of 5 frames: 0-3 walk cycle (stride, bob, other stride, bob), 4 lying down.
pal({
  k: "#1b1630", e: "#1b1630", p: "#f29bb0",
  o: "#f0a04b", O: "#c46a2b", w: "#f4f0e6", W: "#c9c2b5",
  b: "#a0704a", B: "#6b4630", g: "#9aa0aa", G: "#5f6670", d: "#3a3348", D: "#241f30",
  y: "#ffd84a", Y: "#e8b030", a: "#f08a2b", n: "#2b2738", z: "#7fcf6a", Z: "#4f9a4a",
  v: "#d8f0a0", q: "#f7a8bf", Q: "#d9748f", t: "#d8b48a", T: "#a8845e", l: "#c8e09a",
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
