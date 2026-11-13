import { describe, expect, it } from 'vitest';
import { DAY_ROOMS, LAND_ROOM_IDS, paintLandRoom, roomFx } from '../art/landRooms.js';
import { TABLE_KINDS } from '../art/tableKinds.js';
import { paintApron, paintTablePlane } from '../art/tablePixels.js';
import { RIVAL_SCENES, SCENES, sceneOfRival } from '../../data/scenes.js';
import { TABLE_MAPS, mapTable, stepMap } from '../../data/tableMaps.js';
import { REGIONS } from '../../data/campaign.js';
import { RIVALS } from '../../data/rivals.js';
import { TRACKS } from '../../engine/audioSynth.js';

const opaque = (img) => {
  for (let i = 3; i < img.data.length; i += 4) if (img.data[i] !== 255) return false;
  return true;
};

describe('versão 2.30: os cenários de dia', () => {
  it('cada cenário tem a sua sala, a sua mesa e a sua trilha, todas diferentes', () => {
    const list = Object.values(SCENES);
    expect(list).toHaveLength(3);
    for (const c of list) {
      expect(LAND_ROOM_IDS).toContain(c.room);
      expect(DAY_ROOMS).toContain(c.room);
      expect(TABLE_KINDS).toContain(c.table);
      expect(TRACKS[c.music]).toBeTruthy();
      expect(c.light).toBe('day');
    }
    expect(new Set(list.map((c) => c.table)).size).toBe(3);
    expect(new Set(list.map((c) => c.music)).size).toBe(3);
    for (const r of REGIONS) expect(list.map((c) => c.music)).not.toContain(r.music);
  });

  it('na campanha, três rivais do Boteco da Esquina jogam de dia (nenhum chefe)', () => {
    const ids = Object.keys(RIVAL_SCENES);
    expect(ids).toHaveLength(3);
    for (const id of ids) {
      expect(RIVALS[id]).toBeTruthy();
      expect(RIVALS[id].boss).toBeFalsy();
      expect(REGIONS[0].pool).toContain(id);
      expect(sceneOfRival(id)).toBe(SCENES[RIVAL_SCENES[id]]);
    }
    expect(new Set(Object.values(RIVAL_SCENES)).size).toBe(3);
    expect(sceneOfRival('tioZe')).toBeNull();
    expect(sceneOfRival('arlindo')).toBeNull();
  });

  it('nas mesas online, cada cenário é uma sala com a mesa dele e a luz do dia', () => {
    for (const c of Object.values(SCENES)) {
      const m = TABLE_MAPS.find((x) => x.id === c.id);
      expect(m).toBeTruthy();
      expect(m.secret).toBeFalsy();
      expect(mapTable(c.id, null)).toMatchObject({ room: c.room, lighting: 'day', material: c.table });
    }
    expect(mapTable('boteco', null).material).toBeNull();
  });

  it('a escolha da sala (◀ SALA ▶) dá a volta e pula a sala secreta que não abriu', () => {
    const none = { rivals: [] };
    expect(stepMap('boteco', 1, none)).toBe('sinuca');
    expect(stepMap('bicho', 1, none)).toBe('calcada');
    expect(stepMap('calcada', -1, none)).toBe('bicho');
    expect(stepMap('praca', 1, none)).toBe('boteco');
    expect(stepMap('boteco', -1, none)).toBe('praca');
    expect(stepMap('bicho', 1, { rivals: ['donoDaNoite'] })).toBe('noite');
    expect(stepMap('nada', 1, none)).toBe('sinuca');
  });

  it('de dia não tem lâmpada nem velas: o sol, o brilho do mar e a sombra das folhas', () => {
    for (const id of DAY_ROOMS) {
      for (const candles of [false, true]) {
        const fx = roomFx(id, 422, 195, { candles });
        expect(fx.lights.filter((L) => L.kind === 4 || L.kind === 2)).toHaveLength(0);
        expect(fx.sun).toBeTruthy();
        expect(fx.sun.x).toBeGreaterThan(0);
        expect(fx.sun.x).toBeLessThan(422);
      }
    }
    expect(roomFx('landpraia', 422, 195).glint).toBeTruthy();
    expect(roomFx('landpraca', 422, 195).dapple).toBeTruthy();
    expect(roomFx('landroom', 422, 195).sun).toBeFalsy();
  });

  it('as salas de dia pintam a tela inteira, sempre igual', () => {
    for (const id of DAY_ROOMS) {
      for (const [w, h] of [
        [422, 195],
        [334, 188],
      ]) {
        const a = paintLandRoom(id, w, h);
        expect(opaque(a)).toBe(true);
        expect(paintLandRoom(id, w, h).data).toEqual(a.data);
      }
    }
  }, 30000);

  it('as três mesas (plástico, concreto, tábua) e as saias pintam inteiras e diferentes', () => {
    const planes = TABLE_KINDS.map((k) => paintTablePlane({ w: 160, h: 80, material: k }));
    const plain = paintTablePlane({ w: 160, h: 80 });
    for (const p of planes) {
      expect([p.w, p.h]).toEqual([160, 80]);
      expect(p.data).not.toEqual(plain.data);
    }
    expect(planes[0].data).not.toEqual(planes[1].data);
    expect(planes[1].data).not.toEqual(planes[2].data);
    for (const k of TABLE_KINDS) {
      const a = paintApron(160, { material: k });
      expect(a.w).toBe(160);
      expect(paintApron(160, { material: k }).data).toEqual(a.data);
    }
  });
});
