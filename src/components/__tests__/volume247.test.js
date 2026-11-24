import { describe, expect, it } from 'vitest';
import { LAND_ROOM_IDS } from '../art/landRooms.js';
import { HD_H, HD_ROOM_IDS, HD_W, hasRoomHD, loadRoomHD, roomCrop, roomHD } from '../art/roomHD.js';
import { HUD_PX, heartSprite, nicheSprite } from '../art/hudVolume.js';
import landroom from '../art/rooms/landroom.js';
import landsinuca from '../art/rooms/landsinuca.js';
import landbicho from '../art/rooms/landbicho.js';
import landnoite from '../art/rooms/landnoite.js';
import landcalcada from '../art/rooms/landcalcada.js';
import landpraia from '../art/rooms/landpraia.js';
import landpraca from '../art/rooms/landpraca.js';

const ROOMS = { landroom, landsinuca, landbicho, landnoite, landcalcada, landpraia, landpraca };
const DAY = ['landcalcada', 'landpraia', 'landpraca'];

/** O cabeçalho de um PNG em data URL (largura, altura, tipo de cor) e os nomes dos pedaços dele. */
function pngInfo(url) {
  const PREFIX = 'data:image/png;base64,';
  expect(url.startsWith(PREFIX)).toBe(true);
  const bin = atob(url.slice(PREFIX.length));
  const u32 = (i) => ((bin.charCodeAt(i) << 24) | (bin.charCodeAt(i + 1) << 16) | (bin.charCodeAt(i + 2) << 8) | bin.charCodeAt(i + 3)) >>> 0;
  expect(bin.slice(12, 16)).toBe('IHDR');
  const chunks = [];
  for (let i = 8; i + 8 <= bin.length; i += 12 + u32(i)) chunks.push(bin.slice(i + 4, i + 8));
  return { w: u32(16), h: u32(20), color: bin.charCodeAt(25), chunks };
}

describe('Versão 2.47: as salas em volume (art/roomHD.js)', () => {
  it('toda sala da mesa deitada tem a sua versão em volume', () => {
    expect([...HD_ROOM_IDS].sort()).toEqual([...LAND_ROOM_IDS].sort());
    for (const id of LAND_ROOM_IDS) expect(hasRoomHD(id)).toBe(true);
    expect(hasRoomHD('tableroom')).toBe(false);
  });

  it('cada sala é um PNG largo de 1040 × 414; as de dia têm buraco (transparente) para o céu e o mar', () => {
    for (const [id, url] of Object.entries(ROOMS)) {
      const png = pngInfo(url);
      expect([png.w, png.h]).toEqual([HD_W, HD_H]);
      expect(png.chunks.at(-1)).toBe('IEND');
      // 256 cores (paleta) quando cabe; sem perda (RGB / RGBA) se a paleta errasse demais
      const holes = png.color === 6 || (png.color === 3 && png.chunks.includes('tRNS'));
      expect([2, 3, 6]).toContain(png.color);
      expect(holes).toBe(DAY.includes(id));
    }
  });

  it('o peso cabe: cada sala menos de 250 KB e todas juntas menos de 1,2 MB', () => {
    let total = 0;
    for (const url of Object.values(ROOMS)) {
      expect(url.length).toBeLessThan(250 * 1024);
      total += url.length;
    }
    expect(total).toBeLessThan(1.2 * 1024 * 1024);
  });

  it('o recorte de cada tela: a altura inteira, o meio no meio', () => {
    expect(roomCrop(896, 414)).toEqual([72, 896]);
    expect(roomCrop(844, 390)).toEqual([72, 896]);
    expect(roomCrop(667, 375)).toEqual([152, 736]);
    expect(roomCrop(932, 430)).toEqual([72, 897]);
    expect(roomCrop(3000, 414)).toEqual([0, HD_W]);
    expect(roomCrop(10, 0)[1]).toBeGreaterThan(0);
  });

  it('fora do navegador (sem Image) a sala não chega e nada quebra: fica a pintura de sempre', async () => {
    expect(await loadRoomHD('landroom')).toBe(null);
    expect(await loadRoomHD('nao-existe')).toBe(null);
    expect(roomHD('landroom')).toBe(null);
  });
});

describe('Versão 2.47: o HUD em volume (art/hudVolume.js)', () => {
  it('as peças são PNG do tamanho declarado', () => {
    const names = Object.keys(HUD_PX);
    for (const n of ['case', 'tray-red', 'tray-green', 'slate', 'key-gold-on', 'key-gold-off', 'key-dark-off', 'key-red-on', 'key-gold-down', 'plank']) expect(names).toContain(n);
    for (const [, s] of Object.entries(HUD_PX)) {
      const png = pngInfo(s.url);
      expect([png.w, png.h]).toEqual([s.w, s.h]);
    }
  });

  it('o coração mais perto de cada tamanho que o jogo usa, cheio e apagado', () => {
    for (const px of [7, 8, 9, 11, 12, 13, 13.5, 16, 18, 27]) {
      const full = heartSprite(px);
      const broken = heartSprite(px, true);
      expect(full).toBeTruthy();
      expect(broken).toBeTruthy();
      expect(full.url).not.toBe(broken.url);
      expect(Math.abs(full.w - px)).toBeLessThanOrEqual(2);
    }
    expect(heartSprite(18).w).toBe(18);
  });

  it('o nicho dos talismãs acompanha a largura pedida', () => {
    expect(nicheSprite(26)).toBe(HUD_PX['niche-26']);
    expect(nicheSprite(30).w).toBe(30);
    expect(nicheSprite(20).w).toBe(24);
  });
});
