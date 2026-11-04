export const gardenGuests = [
  {
    id: "decorator",
    name: "霉霉",
    role: "庆典布置员",
    x: 300,
    y: 410,
    approach: {x:328,y:416},
    sprite: 5,
  },
  {
    id: "balloon-friend",
    name: "星星",
    role: "气球客",
    x: 265,
    y: 310,
    approach: {x:304,y:318},
    sprite: 9,
  },
  {
    id: "picnic-friend",
    name: "晴糖",
    role: "野餐帮手",
    x: 620,
    y: 385,
    approach: {x:652,y:391},
    sprite: 3,
  },
] as const;
export type GardenGuest = typeof gardenGuests[number];
export const peachSpot = {x:gardenGuests[1].x+33,y:gardenGuests[1].y-5};
