// Ink, shadow, body, light, paper, and a small accent. Each silhouette is
// recognizable without color (especially the eight matching-game tokens).
const sprites = {
  bell: [".....xx....","....xppx...","...xppipx..","...xppipx..","..xbppippx.",".xpppppppx.",".xxxxxxxxx.","....xax....",".....x....."],
  star: ["....xx.....","....xpx....","...xppx....","xxxbppbxxxx",".xbppppbbx.","..xbpppbx..","..xbbaabx..","..xpbxbbx..",".xbxx..xbx.","..x.....x.."],
  moon: [".....xxx...","...xxppx...","..xippx....",".xippbx....","xipppbx....","xppppbbx...","xbppppbbxxx","xbpppppppbx",".xbbppbbbx.","..xxbbbxx..","....xxx...."],
  berry: ["...x..x....","...xaaaax..","..xaaaxxx..",".xxbbpbbxx.","xpbibpbbpbx","xppppbippbx","xbibppppbbx",".xbppbibbx.","..xbbppbbx.","...xbbbbx..",".....xx...."],
  cake: [".....a.....","....apa....",".....x.....",".....i.....","...xxixx...","..xippipx..",".xiiipiiix.","xippipipbix","xbppbppbpbx","xibibibibix","xbbbbbbbbbx",".xxxxxxxxx."],
  letter: ["...xx......","..xppx..xx.",".xxbpxxxbpx","xiiiiiiiiix","xbipiiipibx","xibppppbiix","xiibaabiiix","xipbaaabpix","xipibbbipix","xiiiiiiiiix",".xxxxxxxxx."],
  gift: ["..xx...xx..",".xppx.xppx.",".xbppxbbbx.","xxiiiaiiixx","xppiiaipppx","xxbbbabbbxx",".xppiaippx.",".xppiaippx.",".xbbiaibbx.",".xxxxxxxxx."],
  mic: ["....xxx....","...xppix...","..xbipipx..","..xpiipbx..","..xbipipx..",".xxbbpbbxx.","xixxbbxxix.","xbxxbbxxbx.","..xxabxx...","....ax.....","...xaax....","..xxxxxx..."],
  bunny: ["..xx...xx..","..xix.xix..","..xipxpix..","..xipxpix..","...xiixx...","..xiiiiix..",".xiiiiiiax.","xiixiiixiix","xipipbpipix",".xiiipiiix.","..xxiibxx..","...xxxxx..."],
  sprout: ["........x..","......xppx.","..xx.xpipx.",".xipxbppx..","..xbpxbx...","...xxbx....",".....ax....",".....ax....","...xxaaxx.."],
  thorns: ["...x...x...","...bx.xb...","..xppxppx..","xxpbpppbxxx",".xppbpbppx.","..xpbppbx..",".xbbxbxbx..","..xx...xx.."],
  flag: ["..xxxx.....","..xppbxxx..","..xpipppbx.","..xppbbbx..","..xibxx....","..xix......","..xix......","..xix......",".xbibx.....",".xxxxx....."],
  gem: ["...xxxxx...","..xpipbpx..",".xippippbx.","xiipipbppbx","xbppippbbbx",".xbbppabbx.","..xbbpabx..","...xbbbx...","....xbx....",".....x....."],
  bird: ["....aa.........","...appa........","..xppppxxx.....",".xippippppx....","xippipppbbpx...","xpppppixiixxx..",".xpbppiiixiabx.","xxibbpippiiix..","xiiibppiipix...","xibibppbbbx....",".xbbbbbbxx.....","...xxaaxx......"],
  hopper: ["...xx....xx....","...xix..xix....","...xipx.xipx...","...xipx.xipx...","...xiixxiix....","...xiiiiiix....","..xiiiiiiiix...","..xiixiiixix...","..xipibipipx...","...xiiiibix....",".xiiibaaabx....",".xiiibabapx....","..xbbibbbix....","...xxiixiix....","...xxxxxxxx...."],
} as const;
export type PixelMotif = keyof typeof sprites;
const outlines = "#624859";
const colors: Record<PixelMotif, readonly string[]> = {
  bell: [outlines,"#a27858","#dbad6c","#fff1b3","#c5885f"],
  star: [outlines,"#d99a50","#f8cf73","#fff2b6","#eea26b"],
  moon: ["#705c84","#cc9654","#f4ce83","#fff0ba","#a494c3"],
  berry: ["#764653","#b95675","#ee8f9d","#ffe1ba","#769c62"],
  cake: [outlines,"#c57784","#e99fab","#fff2d6","#efb354"],
  letter: ["#73545e","#ba917d","#e6c5a2","#fff0cf","#ca6784"],
  gift: ["#704759","#bd677f","#eaa1ad","#ffe2be","#e9b254"],
  mic: ["#54516a","#837895","#a6b7cf","#e1f2e5","#e7b974"],
  bunny: [outlines,"#bfa1ad","#eda6b5","#fff1d9","#bb87af"],
  sprout: ["#506a53","#678a64","#96af75","#bdd596","#aa845e"],
  thorns: ["#71485c","#95536d","#bf7e93","#e6bba2","#90a076"],
  flag: ["#705469","#bd6d82","#df96a8","#ffe6bc","#e7bf7a"],
  gem: ["#634b77","#967aa6","#c7a4d0","#f5dfeb","#b084bd"],
  bird: ["#684a69","#bd7899","#eda0b4","#ffe3c5","#eebd69"],
  hopper: ["#6a536a","#bfa4ad","#e9a6b9","#fff1db","#85b7ba"],
};
const cache = new Map<PixelMotif, HTMLCanvasElement>();
export function motif(c: CanvasRenderingContext2D, name: PixelMotif, x: number, y: number, width: number, height = width) {
  let stamp = cache.get(name);
  if (!stamp) {
    const pattern = sprites[name];
    stamp = document.createElement("canvas");
    stamp.width = Math.max(...pattern.map(row => row.length));
    stamp.height = pattern.length;
    const ink = stamp.getContext("2d")!;
    pattern.forEach((row, j) => [...row].forEach((letter, i) => {
      const index = "xbpia".indexOf(letter);
      if (index >= 0) {
        ink.fillStyle = colors[name][index];
        ink.fillRect(i, j, 1, 1);
      }
    }));
    cache.set(name, stamp);
  }
  c.drawImage(stamp, Math.round(x - width / 2), Math.round(y - height / 2), width, height);
}
export const wishTokens: readonly PixelMotif[] = ["star", "moon", "berry", "cake", "letter", "gift", "mic", "bunny"];
export interface Backdrop { background: HTMLImageElement; props: HTMLImageElement }
const propCells = { flyer: 0, hare: 1, roseCake: 2, mintCake: 3, sweet: 4, snakeHead: 5, winder: 6, gold: 7 };
export function illustrated(c: CanvasRenderingContext2D, art: Backdrop | undefined, name: keyof typeof propCells, x: number, y: number, w: number, h: number) {
  if (!art?.props.complete || !art.props.naturalWidth) return false;
  const cell = propCells[name];
  c.drawImage(art.props, (cell % 4) * 96, Math.floor(cell / 4) * 96, 96, 96, Math.round(x), Math.round(y), w, h);
  return true;
}
export function scenery(c: CanvasRenderingContext2D, art: Backdrop | undefined, base: string) {
  c.fillStyle = base;
  c.fillRect(0, 0, 240, 160);
  if (art?.background.complete && art.background.naturalWidth) c.drawImage(art.background, 0, 0, 240, 160);
}
/** A stepped outline, inset light and lower lip in the game's logical pixels. */
export function panel(c: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, fill: string, edge: string, light = "#fff1c8") {
  c.fillStyle = edge;
  c.fillRect(x + 2, y, width - 4, height);
  c.fillRect(x, y + 2, width, height - 4);
  c.fillStyle = fill;
  c.fillRect(x + 2, y + 2, width - 4, height - 5);
  c.fillStyle = light;
  c.fillRect(x + 3, y + 2, width - 6, 1);
  c.fillRect(x + 2, y + 3, 1, height - 7);
}
