import { describe, expect, it } from 'vitest';
import { DAY_ROOMS, WAVE_LAYERS, paintDayLayers, paintLandRoom } from '../art/landRooms.js';

/** As camadas compostas (a faixa de nuvens deslocada `off` px), como o navegador mostra. */
function compose(L, W, H, off = 0) {
  const img = new Float32Array(W * H * 4);
  const over = (src, sx, sy) => {
    for (let y = 0; y < H; y += 1) {
      for (let x = 0; x < W; x += 1) {
        const X = x + sx;
        const Y = y - sy;
        if (X < 0 || Y < 0 || X >= src.w || Y >= src.h) continue;
        const i = (Y * src.w + X) * 4;
        const o = (y * W + x) * 4;
        const a = src.data[i + 3] / 255;
        for (let c = 0; c < 3; c += 1) img[o + c] = src.data[i + c] * a + img[o + c] * (1 - a);
      }
    }
  };
  over(L.back, 0, 0);
  over(L.clouds, off, 0);
  for (const wv of L.waves) over(wv, off % wv.period, wv.y);
  over(L.shade, 0, 0);
  over(L.front, 0, 0);
  return img;
}

describe('versão 2.31: o céu e o mar das salas de dia andam', () => {
  it('as camadas paradas no começo dão a mesma sala da pintura inteira (a calçada e a praça)', () => {
    for (const name of ['landcalcada', 'landpraca']) {
      const W = 300;
      const H = 140;
      const still = paintLandRoom(name, W, H);
      const img = compose(paintDayLayers(name, W, H), W, H);
      let diff = 0;
      for (let p = 0; p < W * H; p += 1) for (let c = 0; c < 3; c += 1) if (Math.abs(img[p * 4 + c] - still.data[p * 4 + c]) > 3) diff += 1;
      expect(diff).toBeLessThan(W * H * 0.002);
    }
  }, 30000);

  it('a frente tem buraco só no céu (e no mar da praia), e as nuvens dão a volta sem emenda', () => {
    for (const name of DAY_ROOMS) {
      const W = 300;
      const H = 140;
      const L = paintDayLayers(name, W, H);
      let holes = 0;
      let lowest = 0;
      for (let p = 0; p < W * H; p += 1) {
        if (L.front.data[p * 4 + 3] === 0) {
          holes += 1;
          lowest = Math.max(lowest, Math.floor(p / W));
        }
      }
      expect(holes).toBeGreaterThan(W * 4);
      // nada de buraco no chão (o chão começa em 47% da altura)
      expect(lowest).toBeLessThan(Math.round(H * 0.47));
      const c = L.clouds;
      expect(c.period).toBe(W);
      expect(c.w).toBe(c.period + W);
      for (let y = 0; y < c.h; y += 1) {
        for (let x = 0; x < W; x += 1) {
          const a = (y * c.w + x) * 4;
          const b = (y * c.w + x + c.period) * 4;
          expect(c.data.slice(a, a + 4)).toEqual(c.data.slice(b, b + 4));
        }
      }
      expect(L.waves).toHaveLength(name === 'landpraia' ? WAVE_LAYERS.length : 0);
      for (const wv of L.waves) {
        expect(wv.w).toBe(wv.period + W);
        expect(wv.y).toBeGreaterThan(0);
        expect(wv.speed).toBeGreaterThan(0);
      }
    }
  }, 30000);

  it('sempre igual (a mesma semente pinta as mesmas camadas)', () => {
    const a = paintDayLayers('landpraia', 200, 100);
    const b = paintDayLayers('landpraia', 200, 100);
    expect(a.front.data).toEqual(b.front.data);
    expect(a.clouds.data).toEqual(b.clouds.data);
    expect(a.waves[0].data).toEqual(b.waves[0].data);
  });
});
