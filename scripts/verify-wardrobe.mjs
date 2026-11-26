import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { writeFile } from "node:fs/promises";
import { createServer } from "vite";
import { cellWidth, cellHeight, outfits } from "../src/costume-frames.ts";
import { ITEMS, starterItems, INVENTORY_KEY } from "../src/items.ts";
import { SAVE_KEY } from "../src/core.ts";
import { townInteriorKeys } from "../src/town-interior-id.ts";
import { rainbowIds } from "../src/rainbow-flowers.ts";

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || "playwright-core");
process.env.VITE_WARDROBE_DEBUG = "true";
const server = await createServer({server:{host:"127.0.0.1",port:0,hmr:false,watch:null},logLevel:"error"});
let browser;
try {
  await server.listen();
  const base=server.resolvedUrls.local[0]+"tests/";
  browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL ?? (process.platform==="win32" ? "msedge" : undefined)});
  const desktop={viewport:{width:1366,height:850}, reducedMotion:"reduce"};
  const page=await browser.newPage(desktop);
  await page.goto(base+"equipment-fixture.html");
  await page.locator('body[data-ready=true]').waitFor();
  const shapes=await page.evaluate(()=>{
    const rows=[...document.querySelectorAll("#outfits tbody tr")];
    return rows.map(row=>[...row.querySelectorAll("td canvas")].map(canvas=>{
      const rgba=canvas.getContext("2d").getImageData(0,0,canvas.width,canvas.height).data;
      if (!rgba.some((a,i)=>i%4===3 && a>0)) throw Error("Empty pose: "+canvas.ariaLabel);
      return canvas.toDataURL();
    }));
  });
  assert.equal(shapes.length,outfits.length);
  for (let pose=0;pose<15;pose++) assert.equal(new Set(shapes.map(row=>row[pose])).size,outfits.length);
  for (const row of shapes) assert.equal(new Set(row).size,15);
  const wornViews=await page.evaluate(async ()=>(await import("/tests/equipment-fixture.ts")).verifyWornViews());
  assert.equal(wornViews,outfits.length*15);
  console.log(`${wornViews} 个角色姿势逐像素核对了发夹、胸针和尖帽的佩戴与摘下画面。`);
  const fits = await page.evaluate(async () => (await import("/tests/bag-fitting-cases.ts")).verifyBagFits());
  const bagCount = Object.values(ITEMS).filter(item => item.slot === "backpack").length;
  assert.deepEqual(fits, {frames:bagCount*outfits.length*15, angles:bagCount*outfits.length*4});
  console.log(`${fits.angles} 个背包、衣服与朝向组合，含坐卧共 ${fits.frames} 帧，包身位置、肩带、袖口和长发遮挡通过。`);
  if (process.env.WARDROBE_PREVIEW) {
    const preview=await page.evaluate(()=>{
      const rows=[...document.querySelectorAll("#outfits tbody tr")];
      const sheet=document.createElement("canvas"); sheet.width=728; sheet.height=95+rows.length*85;
      const c=sheet.getContext("2d"); c.fillStyle="#faf4eb"; c.fillRect(0,0,sheet.width,sheet.height);
      c.fillStyle="#654957"; c.font="bold 24px Microsoft YaHei"; c.fillText("芙芙的衣橱",22,42);
      const positions=[190,286,382,478,604], labels=["正面","迈步","花海","长椅","小床"];
      c.textAlign="center"; c.font="14px Microsoft YaHei"; labels.forEach((l,i)=>c.fillText(l,positions[i],75));
      rows.forEach((row,i)=>{
        const top=84+i*85; c.fillStyle=i%2 ? "#fcf8f2" : "#f2e7dc"; c.fillRect(12,top,704,82);
        c.fillStyle="#654957"; c.font="15px Microsoft YaHei"; c.textAlign="left";
        c.fillText(row.querySelector("th").textContent,24,top+47);
        const sampleRow = row.dataset.outfit === "witchDress" ? document.querySelector("#witch-set") : row;
        const samples=sampleRow.querySelectorAll("td canvas");
        [0,4,12,13,14].forEach((frame,j)=>{const tile=samples[frame],w=tile.width*.78;
          c.drawImage(tile,positions[j]-w/2,top,w,tile.height*.78);});
      });
      return sheet.toDataURL().split(",")[1];
    });
    await writeFile(process.env.WARDROBE_PREVIEW,Buffer.from(preview,"base64"));
  }
  await page.close();
  console.log(`${shapes.length} 套角色的 ${shapes.length * 15} 个方向与姿势帧均已绘制。`);

  for (const options of [desktop,{...desktop,viewport:{width:390,height:844},isMobile:true,hasTouch:true}]) {
    const page=await browser.newPage(options);
    await page.route(/^https:\/\//,route=>route.abort());
    await page.goto(base+"exploration-fixture.html");
    await page.waitForFunction(()=>window.contentQA?.ready());
    await page.locator("#check-wardrobe").click();
    await page.waitForFunction(()=>/失败|全部通过/.test(document.querySelector("#report").textContent),undefined,{timeout:90000});
    assert.equal(await page.locator("#report").innerText(),"全部通过");
    console.log(await page.locator("#evidence li").first().innerText());
    await page.close();
  }
  const actual=await browser.newPage(desktop);
  await actual.route(/^https:\/\//,route=>route.abort());
  await actual.addInitScript(({save,flowers})=>{
    const key="fufu-only-exploration-fixture/"+save;
    if (!sessionStorage.getItem(key)) sessionStorage.setItem(key,JSON.stringify({rainbowFlowers:flowers}));
    const draw=CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage=function(image,...args) {
      if (this.canvas.id==="world" && image instanceof HTMLImageElement && image.src.includes("fufu-garments"))
        window.qaDressedFrame=args.slice(0,4);
      return draw.call(this,image,...args);
    };
  },{save:SAVE_KEY,flowers:rainbowIds});
  const start=async()=>{
    await actual.waitForFunction(()=>window.contentQA?.ready());
    await actual.locator(".enter-button").click();
    await actual.locator(".intro-screen.dismissed").waitFor({state:"attached"});
  };
  const snapshot=()=>actual.evaluate(()=>window.contentQA.snapshot());
  const equip=async(id)=>{
    await actual.locator(".bag-toggle").click();
    await actual.locator(`[data-category="${ITEMS[id].slot}"]`).click();
    await actual.locator(`[data-select="${id}"]`).click();
    await actual.locator(`[data-equip="${id}"]`).click();
    await actual.locator(".bag-close").click();
  };
  await actual.goto(base+"exploration-fixture.html");
  await start();
  assert.equal((await snapshot()).equipment.hair,"heartClip");
  await equip("heartClip");
  await actual.reload(); await start();
  assert.equal((await snapshot()).equipment.hair,null);
  const checkRestPoses = async (id, hair) => {
    for (const [scene,spot,kind,col] of [["room","bed","lying",14],["challenge","rest","sitting",13],["meadow","meadow-camp","sitting",12]]) {
      await actual.evaluate(async ([s,p])=>window.contentQA.visit(s,p),[scene,spot]);
      await actual.locator("#world").press("e");
      await actual.waitForFunction(([scene,kind,sx,row,height])=>{
        const state=window.contentQA.snapshot();
        return state.scene===scene && state.rest?.kind===kind && window.qaDressedFrame?.[0]===sx &&
          Math.floor(window.qaDressedFrame[1]/height)===row;
      },[scene,kind,col*cellWidth,outfits.indexOf(id),cellHeight],{timeout:10000});
      assert.equal((await snapshot()).equipment.hair,hair);
      if (scene==="room") await actual.getByRole("button",{name:"起床继续冒险",exact:true}).click();
      if (scene==="challenge") await actual.getByRole("button",{name:"起身继续走",exact:true}).click();
      if (scene==="meadow") await actual.locator("#world").press("d",{delay:120});
    }
    console.log(ITEMS[id].name+"与"+ITEMS[hair].name+"通过床、长椅和花海的实景绘制检查。");
  };
  const starterClothes=starterItems.filter(id=>ITEMS[id].slot==="clothes");
  const clips=["fishClip","starClip","heartClip"];
  for (const [i,id] of starterClothes.entries()) {
    await equip(id);
    if (id === "witchDress") await equip("witchHat");
    const hair=clips[i % clips.length];
    await equip(hair);
    await checkRestPoses(id,hair);
  }
  await actual.reload(); await start();
  const initialWitch=(await snapshot()).equipment;
  assert.deepEqual([initialWitch.clothes,initialWitch.head,initialWitch.hair],["witchDress","witchHat","starClip"]);
  await actual.evaluate(({key})=>localStorage.setItem(key,JSON.stringify({
    owned:["wreath","starWings","mintCape","moonBag"],equipped:{head:"starWings",clothes:"mintCape",body:"moonBag"},
  })),{key:INVENTORY_KEY});
  await actual.reload(); await start();
  let gear=(await snapshot()).equipment;
  assert.deepEqual([gear.head,gear.hair,gear.clothes,gear.backpack],[null,"starWings","mintCape","moonBag"]);
  await equip("wreath"); await equip("starClip"); await equip("cloudPajamas");
  await actual.reload(); await start();
  gear=(await snapshot()).equipment;
  assert.deepEqual([gear.head,gear.hair,gear.clothes,gear.backpack],["wreath","starClip","cloudPajamas","moonBag"]);
  const bag=await actual.evaluate(key=>JSON.parse(localStorage.getItem(key)),INVENTORY_KEY);
  assert.ok(starterItems.every(id=>bag.owned.includes(id)));
  console.log("新档、旧发饰与背包迁移、摘下发夹及叠穿后刷新均已验证。");

  const setKeepsakes=async(items)=>{
    await actual.evaluate(({key,items})=>{
      const progress=window.contentQA.snapshot().progress;
      progress.townKeepsakes={items};
      localStorage.setItem(key,JSON.stringify(progress));
    },{key:SAVE_KEY,items});
    await actual.reload(); await start();
  };
  const talk=async(scene)=>{
    await actual.evaluate(s=>window.contentQA.visit(s,"npc-photo-visitor"),scene);
    await actual.locator("#world").press("e");
    await actual.locator(".activity-hud:not([hidden])").waitFor();
  };
  const reward=actual.getByRole("button",{name:"收下巫女服",exact:true});
  const stamp=async()=> (await snapshot()).progress.achievements.earned.includes("town-miko");
  const inventory=()=>actual.evaluate(key=>JSON.parse(localStorage.getItem(key)),INVENTORY_KEY);
  await setKeepsakes(townInteriorKeys.slice(0,6));
  await talk("town-hall"); assert.equal(await reward.count(),0); assert.equal(await stamp(),false);
  await actual.locator(".activity-close").click();

  await setKeepsakes(townInteriorKeys);
  const trial=actual.locator('[data-debug="wardrobe"]');
  const toggleTrial=async()=>{
    await actual.locator(".debug-trigger").click();
    await trial.evaluate(button=>button.click());
    await actual.locator(".debug-close").click();
  };
  await toggleTrial(); await equip("mikoOutfit");
  assert.equal((await snapshot()).equipment.clothes,"mikoOutfit");
  assert.ok(!(await inventory()).owned.includes("mikoOutfit")); assert.equal(await stamp(),false);
  await toggleTrial(); assert.equal((await snapshot()).equipment.clothes,"cloudPajamas");
  await talk("town"); assert.equal(await reward.count(),0);
  await actual.locator(".activity-close").click();
  await talk("town-hall"); await actual.getByRole("button",{name:"先聊聊拍照"}).click();
  assert.equal(await stamp(),false); assert.ok(!(await inventory()).owned.includes("mikoOutfit"));
  await actual.locator(".activity-close").click();
  await talk("town-hall"); await reward.click();
  assert.equal(await stamp(),true);
  const claimed=await inventory();
  assert.equal(claimed.owned.filter(item=>item==="mikoOutfit").length,1);
  assert.equal(claimed.equipped.clothes,"cloudPajamas");
  await actual.getByRole("button",{name:"打开衣橱",exact:true}).click();
  await actual.locator(".bag-close").click();
  await equip("mikoOutfit"); await equip("witchHat");
  await actual.reload(); await start();
  const dressed=(await snapshot()).equipment;
  assert.deepEqual([dressed.clothes,dressed.head,dressed.hair],["mikoOutfit","witchHat","starClip"]);
  await talk("town-hall"); assert.equal(await reward.count(),0);
  assert.equal((await snapshot()).progress.achievements.earned.filter(id=>id==="town-miko").length,1);
  await actual.locator(".activity-close").click();
  await checkRestPoses("mikoOutfit","starClip");
  console.log("集齐七件后从暖栗手中领取巫女服并获得一枚绯袴留影徽章。还差一件、街头交谈、暂缓领取、试穿、刷新和再次对话均通过。");
} finally {
  await browser?.close();
  await server.close();
}
