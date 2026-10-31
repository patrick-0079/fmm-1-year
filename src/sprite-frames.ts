// Actual opaque character bounds, in row-major order. The generated poses cross
// the nominal 362px grid, so equal-cell slicing leaks neighbouring feet/hair.
// Keep every frame on one scale and align the bottom to the player's foot point.
export const spriteFrames = [
  { x: 88, y: 35, w: 234, h: 329 },
  { x: 437, y: 35, w: 232, h: 329 },
  { x: 769, y: 35, w: 234, h: 329 },
  { x: 100, y: 382, w: 222, h: 328 },
  { x: 442, y: 382, w: 227, h: 326 },
  { x: 790, y: 381, w: 226, h: 327 },
  { x: 80, y: 732, w: 228, h: 326 },
  { x: 427, y: 732, w: 229, h: 321 },
  { x: 769, y: 732, w: 233, h: 325 },
  { x: 88, y: 1074, w: 230, h: 326 },
  { x: 433, y: 1074, w: 231, h: 330 },
  { x: 770, y: 1074, w: 231, h: 330 },
] as const;
