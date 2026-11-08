import { describe, expect, it } from 'vitest';
import { LAND_ROOMS, LAND_ROOM_IDS, paintLandRoom, roomFx } from '../art/landRooms.js';
import { CANDLE_SIZE, FLAME_FRAMES, FLAME_SIZE, candleWick, paintCandle, paintFlameStrip } from '../art/candleArt.js';
import { landCandleSpots, landCorners } from '../seatGeometry.js';
import { candleCorners, paintApron, paintTablePlane } from '../art/tablePixels.js';
import { DEFAULT_MAP, MAP_IDS, TABLE_MAPS, mapOf, mapTable, mapUnlocked } from '../../data/tableMaps.js';
import { REGIONS } from '../../data/campaign.js';
import { sanitizeTableConfig } from '../../table/tableProtocol.js';

const filled = (img) => {
  let n = 0;
  for (let i = 3; i < img.data.length; i += 4) if (img.data[i] === 255) n += 1;
  return n / (img.w * img.h);
};

describe('versão 2.13: a sala de cada região', () => {
  it('cada região tem a sua sala, e todas pintam a tela inteira, sempre igual', () => {
    for (const region of REGIONS) expect(LAND_ROOM_IDS).toContain(LAND_ROOMS[region.atmosphere]);
    expect(LAND_ROOM_IDS).toContain('landnoite');
    for (const id of LAND_ROOM_IDS) {
      for (const [w, h] of [
        [422, 195],
        [466, 215],
        [334, 188],
      ]) {
        const a = paintLandRoom(id, w, h);
        expect([a.w, a.h]).toEqual([w, h]);
        expect(filled(a)).toBe(1);
        expect(paintLandRoom(id, w, h).data).toEqual(a.data);
      }
    }
  });

  it('as salas são diferentes entre si', () => {
    const sums = LAND_ROOM_IDS.map((id) => paintLandRoom(id, 200, 100).data.reduce((s, v, i) => (i % 4 === 3 ? s : s + v), 0));
    expect(new Set(sums).size).toBe(LAND_ROOM_IDS.length);
  });

  it('o shader de cada sala acende fontes dentro da tela (as velas só na mesa das velas)', () => {
    for (const id of LAND_ROOM_IDS) {
      for (const candles of [false, true]) {
        const fx = roomFx(id, 422, 195, { candles });
        expect(fx.lights.length).toBeGreaterThan(0);
        expect(fx.lights.length).toBeLessThanOrEqual(10);
        for (const L of fx.lights) {
          expect(L.x).toBeGreaterThan(-20);
          expect(L.x).toBeLessThan(442);
          expect(L.y).toBeGreaterThan(-20);
          expect(L.y).toBeLessThan(215);
          expect(L.r).toBeGreaterThan(0);
        }
        expect(fx.lights.filter((L) => L.kind === 2).length).toBe(candles ? 4 : 0);
      }
    }
    expect(roomFx('landnoite', 422, 195).moon).toBeTruthy();
    expect(roomFx('landbicho', 422, 195).stripe).toBeTruthy();
  });
});

describe('versão 2.13: as velas no canto do aro', () => {
  it('cada castiçal crava no meio do canto do aro, dentro do tampo, as de lá menores', () => {
    for (const [w, h] of [
      [844, 390],
      [932, 430],
      [667, 375],
    ]) {
      const c = landCorners(w, h);
      const spots = landCandleSpots(w, h);
      expect(spots).toHaveLength(4);
      const [fl, fr, nl, nr] = spots;
      // dentro do tampo, a menos de um aro da quina
      expect(fl.x).toBeGreaterThan(c.farL);
      expect(fl.x - c.farL).toBeLessThan(16);
      expect(c.farR - fr.x).toBeGreaterThan(0);
      expect(c.farR - fr.x).toBeLessThan(16);
      expect(nl.x - c.nearL).toBeGreaterThan(0);
      expect(nl.x - c.nearL).toBeLessThan(16);
      expect(fl.y).toBeGreaterThan(c.yFar);
      expect(fl.y - c.yFar).toBeLessThan(16);
      expect(nl.y).toBeLessThan(c.yNear);
      expect(c.yNear - nl.y).toBeLessThan(16);
      // simétricas e as de lá menores
      expect(fl.x + fr.x).toBeCloseTo(w, 3);
      expect(nl.x + nr.x).toBeCloseTo(w, 3);
      expect(fl.s).toBeLessThan(nl.s);
      expect(fl.far && fr.far && !nl.far && !nr.far).toBe(true);
    }
  });

  it('o castiçal, a chama e a cera pintada no aro', () => {
    const v = paintCandle(1);
    expect([v.w, v.h]).toEqual([CANDLE_SIZE.w, CANDLE_SIZE.h]);
    expect(candleWick(1)).toBeGreaterThan(0);
    const f = paintFlameStrip();
    expect([f.w, f.h]).toEqual([FLAME_SIZE.w * FLAME_FRAMES, FLAME_SIZE.h]);
    const plain = paintTablePlane({ w: 160, h: 80 });
    const lit = paintTablePlane({ w: 160, h: 80, candles: true });
    expect(lit.data).not.toEqual(plain.data);
    expect(candleCorners(160, 80)).toHaveLength(4);
    expect(paintApron(160, { candles: true }).data).not.toEqual(paintApron(160).data);
  });
});

describe('versão 2.13: a sala das mesas online', () => {
  it('quatro salas, cada uma com a sua trilha; a do Dono da Noite é secreta e acende as velas', () => {
    expect(MAP_IDS).toEqual(['boteco', 'sinuca', 'bicho', 'noite']);
    expect(DEFAULT_MAP).toBe('boteco');
    expect(new Set(TABLE_MAPS.map((m) => m.music)).size).toBe(4);
    expect(mapOf('nada').id).toBe('boteco');
    const noite = mapOf('noite');
    expect(noite.light).toBe('candles');
    expect(mapUnlocked(noite, { rivals: [] })).toBe(false);
    expect(mapUnlocked(noite, { rivals: ['donoDaNoite'] })).toBe(true);
    expect(mapUnlocked(mapOf('sinuca'), { rivals: [] })).toBe(true);
    const felt = { light: '#111111', mid: '#222222', dark: '#333333' };
    expect(mapTable('sinuca', felt)).toMatchObject({ room: 'landsinuca', lighting: 'lamp', atmosphere: 'neon', felt });
    expect(mapTable('noite', felt).felt).not.toBe(felt);
    for (const m of TABLE_MAPS) expect(LAND_ROOM_IDS).toContain(m.room);
  });

  it('a roda guarda a sala na configuração (e o que não existe volta para o boteco)', () => {
    expect(sanitizeTableConfig({}).map).toBe('boteco');
    expect(sanitizeTableConfig({ map: 'bicho' }).map).toBe('bicho');
    expect(sanitizeTableConfig({ map: 'marte' }).map).toBe('boteco');
  });
});
