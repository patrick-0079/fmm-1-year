import sharp from "sharp";

const sheets = [
  ["landscapes", ["snake", "flight", "hop", "miner"]],
  ["workshops", ["blocks", "link", "mines", "postcard"]],
];
for (const [sheet, games] of sheets) {
  const source = "src/assets/arcade-" + sheet + "-v14.png";
  const { width, height } = await sharp(source).metadata();
  for (const [i, game] of games.entries()) {
    const w = width / 2, h = height / 2;
    const pixels = await sharp(source)
      .extract({left: (i % 2) * w, top: Math.floor(i / 2) * h, width: w, height: h})
      .resize(240, 160)
      .png({palette: true, colours: 128, dither: .17}).toBuffer();
    await sharp(pixels).webp({lossless:true, effort:6}).toFile("src/assets/arcade-" + game + "-v14.webp");
  }
}

// The source contains different silhouettes and margins. Trim using alpha
// before packing normalized cells. The renderer supplies each prop's aspect.
const props = "src/assets/arcade-props-v14.png", layers = [], size = 96;
for (let i = 0; i < 8; i++) {
  const width = 384, height = 512;
  const raw = await sharp(props).extract({left:(i%4)*width,top:Math.floor(i/4)*height,width,height})
    .ensureAlpha().raw().toBuffer();
  let left = width, top = height, right = 0, bottom = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const alpha = (y*width+x)*4+3;
    if (raw[alpha] < 48) { raw[alpha] = 0; continue; }
    left = Math.min(left,x); right = Math.max(right,x);
    top = Math.min(top,y); bottom = Math.max(bottom,y);
  }
  const input = await sharp(raw,{raw:{width,height,channels:4}})
    .extract({left,top,width:right-left+1,height:bottom-top+1})
    .resize(size,size,{fit:"fill"}).png().toBuffer();
  layers.push({input,left:(i%4)*size,top:Math.floor(i/4)*size});
}
await sharp({create:{width:4*size,height:2*size,channels:4,background:"#0000"}})
  .composite(layers).webp({lossless:true}).toFile("src/assets/arcade-props-v14.webp");
