const ROW1 = 0b0000000000000000000011111;
const ROW2 = 0b0000000000000001111100000;
const ROW3 = 0b0000000000111110000000000;
const ROW4 = 0b0000011111000000000000000;
const ROW5 = 0b1111100000000000000000000;
const COL1 = 0b0000100001000010000100001;
const COL2 = 0b0001000010000100001000010;
const COL3 = 0b0010000100001000010000100;
const COL4 = 0b0100001000010000100001000;
const COL5 = 0b1000010000100001000010000;
const DIA1 = 0b1000001000001000001000001;
const DIA2 = 0b0000100010001000100010000;
const BOARD = 0b1111111111111111111111111;

const BINGOPOS = 0b0000000000000000001000000;

const weights = [
  4, 4, 4, 4, 1,
  4, 40, 20, 4, 1,
  4, 20, 14, 4, 1,
  4, 4, 4, 4, 1,
  1, 1, 1, 1, 1,
];
const ROW1m = [...Array(32)].map((_, mask) => weights.slice(0, 5).reduce((sum, w, i) => sum + w * ((mask >> i) & 1), 0));
const ROW2m = [...Array(32)].map((_, mask) => weights.slice(5, 10).reduce((sum, w, i) => sum + w * ((mask >> i) & 1), 0));
const ROW3m = [...Array(32)].map((_, mask) => weights.slice(10, 15).reduce((sum, w, i) => sum + w * ((mask >> i) & 1), 0));
const ROW4m = [...Array(32)].map((_, mask) => weights.slice(15, 20).reduce((sum, w, i) => sum + w * ((mask >> i) & 1), 0));
const ROW5m = [...Array(32)].map((_, mask) => weights.slice(20, 25).reduce((sum, w, i) => sum + w * ((mask >> i) & 1), 0));

function getWeight(mask) {
  return ROW1m[mask & 0x1F] + ROW2m[(mask >> 5) & 0x1F] + ROW3m[(mask >> 10) & 0x1F] + ROW4m[(mask >> 15) & 0x1F] + ROW5m[(mask >> 20) & 0x1F];
}

export function redSkulls(state) {
  let result = 0;
  if ((state & ROW1) === ROW1) result |= ROW1;
  if ((state & ROW2) === ROW2) result |= ROW2;
  if ((state & ROW3) === ROW3) result |= ROW3;
  if ((state & ROW4) === ROW4) result |= ROW4;
  if ((state & ROW5) === ROW5) result |= ROW5;
  if ((state & COL1) === COL1) result |= COL1;
  if ((state & COL2) === COL2) result |= COL2;
  if ((state & COL3) === COL3) result |= COL3;
  if ((state & COL4) === COL4) result |= COL4;
  if ((state & COL5) === COL5) result |= COL5;
  if ((state & DIA1) === DIA1) result |= DIA1;
  if ((state & DIA2) === DIA2) result |= DIA2;
  return result;
}

function npop(num) {
  num = num - ((num >>> 1) & 0x55555555);
  num = (num & 0x33333333) + ((num >>> 2) & 0x33333333);
  num = (num + (num >>> 4)) & 0x0F0F0F0F;
  return (num * 0x01010101) >>> 24;
}

export function getNeighbors(mask) {
  let result = mask;
  result |= (mask & (~COL1)) >> 1;
  result |= (mask & (~COL5)) << 1;
  result |= (mask & (~ROW1)) >> 5;
  result |= (mask & (~ROW5)) << 5;
  return result;
}
function getNeighbors2(mask) {
  let result = mask;
  result |= (result & (~COL1)) >> 1;
  result |= (result & (~COL5)) << 1;
  result |= (result & (~ROW1)) >> 5;
  result |= (result & (~ROW5)) << 5;
  return result;
}

function calcScore(state, hellMask) {
  const red = redSkulls(state);
  let contiguous = BINGOPOS & (~red);
  while (true) {
    const next = getNeighbors(contiguous) & (~red);
    if (next === contiguous) break;
    contiguous = next;
  }
  const skulls = state | hellMask;
  return (
    1e7 * npop(contiguous) +
    5e4 * getWeight(contiguous & (~skulls)) / 2 +
    100 * npop(BOARD & (~red)) +
    getWeight(BOARD & (~skulls)) / 2
  );
}

export function optimizeBingo(state, hellMask, round, useInanna, preferSkull) {
  function calc(state, red, pos, index) {
    const next = (state ^ getNeighbors(pos)) | red;
    if (next & hellMask) return (index >= 3 ? 0 : -1);
    const nextRed = redSkulls(next);
    if (((round + index) % 3) === 2 && !useInanna && nextRed === red) return (index >= 3 ? 0 : -1);
    let result = 0;
    if (!(pos & red)) result += 2e9;
    const skulls = state | hellMask;
    const nbhd = getNeighbors2(pos) & (~pos);
    if (!(skulls & pos) && (nbhd & skulls) !== nbhd) result += 5e5 * preferSkull + 1e4;
    result += calcScore(next, hellMask);
    if (index < 3) {
      let mx = -1;
      for (let npos = 1; npos < BOARD; npos <<= 1) {
        mx = Math.max(mx, calc(next, nextRed, npos, index + 1));
      }
      if (mx < 0) return -1;
      result += mx;
    }
    return result;
  }

  const result = [];
  const red = redSkulls(state);
  for (let pos = 1; pos < BOARD; pos <<= 1) {
    const score = calc(state, red, pos, 0);
    if (score >= 0) result.push({pos, score});
  }
  result.sort((a, b) => b.score - a.score);
  const skulls = state | hellMask;
  const out = result.slice(0, 2).map(r => r.pos);
  if (result.length > 2) {
    if ((out[0] & skulls) && (out[1] & skulls)) {
      const empty = result.find(r => !(r.pos & skulls));
      if (empty) {
        out.push(empty.pos);
      } else {
        out.push(result[2].pos);
      }
    } else {
      out.push(result[2].pos);
    }
  }
  return out;
}

function randomInMask(mask) {
  let index = Math.floor(Math.random() * npop(mask));
  while (index && mask) {
    mask &= mask - 1;
    index -= 1;
  }
  return mask & (~(mask - 1));
}

export function randomBoard(hellMode) {
  const r1 = randomInMask(0b0000001110010100111000000);
  let r2 = 0;
  do {
    r2 = randomInMask(0b1111110001100011000111111);
  } while (getNeighbors(r2) & r1);
  if (hellMode) return [r2, r1];
  else return [r1 | r2, 0];
}
