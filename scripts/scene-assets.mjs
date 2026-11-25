import rooms from "../src/town-interiors.generated.json" with { type: "json" };
const interiors = Object.keys(rooms).map(name => "town-" + name);
const groups = [
  [["room"], "room-interactive window-skies-v12 white-bass-v18 fufu-room-fox fox-tail-rest anniversary-cake gift-v37 xiaoye-note"],
  [["room", "garden", "town", "town-baker"], "cake-slice-v11"],
  [["room", "garden"], "party-props-v11"],
  [["garden"], "anniversary-garden-tree-free apple-basket garden-balloon-guest garden-guest-routines qingtang-picnic xiaoye-plush xiaoye-embrace-v55 suyan"],
  [["garden", "challenge"], "garden-creek-props garden-keepsakes-v12 orchard-v16 garden-bench apple-tree morning-dew-flower"],
  [["garden", "challenge", "town"], "anniversary-visitors rainbow-flowers-v15"],
  [["garden", "town"], "country-wicket-v18"],
  [["challenge"], "courage-garden courage-path-props-v35 courage-tall-flowers gardener-tending gardener-hat"],
  [["challenge", "ruins"], "elder-residents"],
  [["town"], "anniversary-town-v13 anniversary-town-hd-v13 town-quarry town-guests town-playground-animation town-pond-water arcade-blocks-v14 arcade-hop-v14 arcade-flight-v14 arcade-link-v14"],
  [["town", ...interiors], "town-work-poses"],
  [["town", "town-baker"], "town-gestures"],
  [["town", "town-radio"], "yeshenhua"],
  [["garden", "town", ...interiors], "town-npcs"],
  [["town", "ruins"], "arcade-props-v14"],
  [["ruins"], "echo-ruins echo-well echo-mines echo-miner echo-snake astrolabe-mechanisms guardian-moonstone"],
  [["meadow"], "night-meadow-v16 meadow-life-v16 patrick-camp meadow-jelly-bells star-bottle-closeup"],
  [["*"], "nemu-sprites fufu-rest-poses fufu-footwear-v38 fufu-garments-v15 flower-wreath wardrobe-v11 reward-icons strawberry-flats-v38 qingya-bouquet stationery-sealed stationery-desk astrolabe-relics peach-walk"],
  [["*"], "arcade-postcard-v14 meadow-postcard stationery-album"],
];
const byName = new Map(groups.flatMap(([scenes, names]) => names.split(" ").map(name => [name, scenes])));

export function assetScenes(path) {
  const name = path.split("/").at(-1).replace(/\.[^.]+$/, "");
  if (path.startsWith("ref/来信/信笺/") || path.startsWith("ref/相册/previews/")) return ["*"];
  if (path.includes("/bass-v20/")) return ["room"];
  if (path.startsWith("ref/花海星星/")) return ["meadow"];
  if (path.includes("/resident-walk/"))
    return ["decorator", "balloon-friend", "picnic-friend", "suyan"].includes(name) ? ["garden"] :
      ["town", ...Object.keys(rooms).filter(room => rooms[room].plan.resident === name).map(room => "town-" + room)];
  if (path.includes("/town-interiors/"))
    return name === "keepsakes" ? ["*"] : name === "workbench" ? interiors : ["town-" + name];
  if (path.startsWith("src/launch/")) return [];
  if (/\.(?:js|css)$/.test(path)) return ["*"];
  if (name.startsWith("fufu-cursor-")) return ["*"];
  return byName.get(name);
}
