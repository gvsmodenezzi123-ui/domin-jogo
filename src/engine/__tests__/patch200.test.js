import { describe, expect, it } from 'vitest';
import {
  APRON_H,
  ASHTRAY_SIZE,
  BONEYARD_SIZE,
  COIN_SIZE,
  GLASS_SIZE,
  LOCK_SIZE,
  RAIL,
  RAIL_WOOD_W,
  SPARK_SIZE,
  TABLE_PX,
  paintApron,
  paintBoneyard,
  paintCoin,
  paintCopoAmericano,
  paintLock,
  paintSpark,
  paintTablePlane,
  paintTinAshtray,
} from '../../components/art/tablePixels.js';
import {
  CASE_PX,
  HINGE_Y,
  TOKEN_SIZE,
  paintCaseChains,
  paintCaseClosed,
  paintCaseLid,
  paintCaseLock,
  paintCaseTray,
  paintDifficultyToken,
} from '../../components/art/casePixels.js';
import {
  ALLEY_SIZE,
  CAP_SIZE,
  COINS_SIZE,
  CRATE_SIZE,
  DOOR_SIZE,
  STAPLE_SIZE,
  paintAlley,
  paintBlackDoor,
  paintBottleCap,
  paintCoinStack,
  paintCrate,
  paintStaple,
} from '../../components/art/mapPixels.js';
import {
  TRAY_SIZE,
  paintBrassTag,
  paintCaseLid as paintPlayCaseLid,
  paintDominoPlate,
  paintDust,
  paintIronPlate,
  paintNiche,
  paintNicheLock,
  paintPlank,
  paintSlate,
  paintTileBack,
  paintTray,
} from '../../components/art/uiPixels.js';
import { BONE_TEX, paintBoneGrain } from '../../components/art/boneTexture.js';
import { paintScene } from '../../components/art/botecoScene.js';
import { MALETA_IDS } from '../../data/maletas.js';
import { RIVALS } from '../../data/rivals.js';
import { shortRivalName } from '../rivalInfo.js';

const alphaAt = (b, x, y) => b.data[(y * b.w + x) * 4 + 3];
const opaque = (b) => {
  let n = 0;
  for (let i = 3; i < b.data.length; i += 4) if (b.data[i] === 255) n += 1;
  return n;
};
const fullyPainted = (b) => {
  for (let i = 3; i < b.data.length; i += 4) if (b.data[i] < 255) return false;
  return true;
};

describe('Versão 2.0: a mesa inteira pintada (art/tablePixels.js)', () => {
  it('o plano da mesa pinta tudo (aro, tabela e feltro), do tamanho pedido, e a mesma semente sai igual', () => {
    const a = paintTablePlane({ w: 120, h: 200 });
    expect([a.w, a.h, a.data.length]).toEqual([120, 200, 120 * 200 * 4]);
    expect(fullyPainted(a)).toBe(true);
    expect(paintTablePlane({ w: 120, h: 200 }).data).toEqual(a.data);
    // outra cor de feltro e o mogno mudam a pintura
    expect(paintTablePlane({ w: 120, h: 200, light: '#4a2a5a', mid: '#2e1a3c', dark: '#1a0f24' }).data).not.toEqual(a.data);
    expect(paintTablePlane({ w: 120, h: 200, mahogany: true }).data).not.toEqual(a.data);
    expect(RAIL).toBeGreaterThan(RAIL_WOOD_W);
    expect(TABLE_PX).toBe(1.5);
  });

  it('o aro é madeira (quente) e o miolo é o feltro (da cor da mesa)', () => {
    const b = paintTablePlane({ w: 100, h: 160 });
    const px = (x, y) => Array.from(b.data.slice((y * b.w + x) * 4, (y * b.w + x) * 4 + 3));
    const [rr, , bb] = px(36, 5); // no aro de cima (longe dos losangos)
    expect(rr).toBeGreaterThan(bb);
    const [fr, fg] = px(50, 96); // feltro verde padrão
    expect(fg).toBeGreaterThanOrEqual(fr);
  });

  it('a pilha do dorme baixa a cada compra e some quando acaba', () => {
    let last = Infinity;
    for (const n of [14, 10, 6, 3, 1]) {
      const b = paintBoneyard(n);
      expect({ w: b.w, h: b.h }).toEqual({ ...BONEYARD_SIZE });
      const now = opaque(b);
      expect(now).toBeLessThan(last);
      last = now;
    }
    expect(opaque(paintBoneyard(0))).toBe(0);
    // mais de 14 desenha 14 (a pilha não estoura o desenho)
    expect(paintBoneyard(20).data).toEqual(paintBoneyard(14).data);
  });

  it('cadeado, moeda, faísca, saia, cinzeiro e copo têm o tamanho declarado e fundo transparente', () => {
    for (const [b, size] of [
      [paintLock(), LOCK_SIZE],
      [paintCoin(), COIN_SIZE],
      [paintSpark(), SPARK_SIZE],
      [paintTinAshtray(), ASHTRAY_SIZE],
      [paintCopoAmericano(), GLASS_SIZE],
    ]) {
      expect({ w: b.w, h: b.h }).toEqual({ ...size });
      expect(alphaAt(b, 0, 0)).toBe(0);
      expect(opaque(b)).toBeGreaterThan(10);
    }
    const apron = paintApron(80);
    expect([apron.w, apron.h]).toEqual([80, APRON_H]);
  });
});

describe('Versão 2.0: as maletas em 128x128 (art/casePixels.js)', () => {
  it('cada maleta tem fechada, tampa e bandeja, todas diferentes entre si', () => {
    const closed = MALETA_IDS.map((id) => paintCaseClosed(id));
    for (const b of closed) {
      expect([b.w, b.h]).toEqual([CASE_PX, CASE_PX]);
      expect(alphaAt(b, 0, 0)).toBe(0);
      expect(opaque(b)).toBeGreaterThan(4000);
    }
    for (let i = 1; i < closed.length; i += 1) expect(closed[i].data).not.toEqual(closed[0].data);
    for (const id of MALETA_IDS) {
      const lid = paintCaseLid(id);
      expect([lid.w, lid.h]).toEqual([CASE_PX, HINGE_Y + 2]);
      expect(opaque(lid)).toBeGreaterThan(3000);
      const tray = paintCaseTray(id);
      expect([tray.w, tray.h]).toEqual([CASE_PX, CASE_PX]);
      // a bandeja aberta não ocupa a faixa da tampa (ali fica a tampa de pé)
      expect(alphaAt(tray, 64, 10)).toBe(0);
    }
  });

  it('a mesma maleta sai sempre igual (cache por chave no PixelCanvas)', () => {
    expect(paintCaseClosed('bicheiro').data).toEqual(paintCaseClosed('bicheiro').data);
    expect(paintCaseTray('seca').data).toEqual(paintCaseTray('seca').data);
  });

  it('corrente, cadeado (fechado e aberto) e as fichas de dificuldade', () => {
    expect(opaque(paintCaseChains())).toBeGreaterThan(300);
    expect(paintCaseLock(true).data).not.toEqual(paintCaseLock(false).data);
    for (const mode of ['normal', 'hard', 'inferno']) {
      const t = paintDifficultyToken(mode);
      expect([t.w, t.h]).toEqual([TOKEN_SIZE.w, TOKEN_SIZE.h]);
      expect(paintDifficultyToken(mode, { on: true }).data).not.toEqual(t.data);
      expect(paintDifficultyToken(mode, { locked: true }).data).not.toEqual(t.data);
    }
  });
});

describe('Versão 2.0: o mapa no caderno de fiado (art/mapPixels.js e a cena do mapa)', () => {
  it('os objetos dos nós têm o tamanho declarado e fundo transparente (o beco é uma placa cheia)', () => {
    for (const [b, size] of [
      [paintBottleCap(0), CAP_SIZE],
      [paintBottleCap(3), CAP_SIZE],
      [paintCrate(), CRATE_SIZE],
      [paintCoinStack(), COINS_SIZE],
      [paintBlackDoor(), DOOR_SIZE],
      [paintStaple(), STAPLE_SIZE],
    ]) {
      expect({ w: b.w, h: b.h }).toEqual({ ...size });
      expect(alphaAt(b, 0, 0)).toBe(0);
    }
    const alley = paintAlley();
    expect({ w: alley.w, h: alley.h }).toEqual({ ...ALLEY_SIZE });
    expect(opaque(alley)).toBeGreaterThan(ALLEY_SIZE.w * ALLEY_SIZE.h * 0.9);
    // as cores das tampinhas variam
    expect(paintBottleCap(1).data).not.toEqual(paintBottleCap(2).data);
  });

  it('a folha do caderno pinta a página inteira, pautada e com a margem vermelha', () => {
    const page = paintScene('map', 100, 300, 9);
    let blank = 0;
    for (let i = 3; i < page.data.length; i += 4) if (page.data[i] < 255) blank += 1;
    expect(blank).toBe(0);
    // a margem: um pixel avermelhado perto de 8,5% da largura
    const mx = Math.round(100 * 0.085);
    const i = (150 * 100 + mx) * 4;
    expect(page.data[i]).toBeGreaterThan(page.data[i + 2]);
  });
});

describe('Versão 2.0: o HUD em pixel art (art/uiPixels.js) e o osso das pedras', () => {
  it('as texturas de 9 fatias e a bandeja têm os tamanhos que o CSS espera', () => {
    for (const kind of ['pinho', 'play', 'blood', 'brass', 'off']) expect([paintPlank(kind).w, paintPlank(kind).h]).toEqual([48, 26]);
    expect([paintIronPlate().w, paintIronPlate().h]).toEqual([16, 16]);
    expect([paintSlate().w, paintSlate().h]).toEqual([24, 24]);
    expect([paintBrassTag().w, paintBrassTag().h]).toEqual([20, 14]);
    expect([paintTileBack().w, paintTileBack().h]).toEqual([14, 24]);
    expect([paintPlayCaseLid().w, paintPlayCaseLid().h]).toEqual([48, 32]);
    expect([paintDominoPlate('gold').w, paintDominoPlate('gold').h]).toEqual([40, 20]);
    expect([paintNiche().w, paintNiche().h]).toEqual([24, 24]);
    expect([paintNicheLock().w, paintDust().w]).toEqual([16, 32]);
    const tray = paintTray();
    expect([tray.w, tray.h]).toEqual([TRAY_SIZE.w, TRAY_SIZE.h]);
    expect(fullyPainted(tray)).toBe(true);
  });

  it('a bandeja repete sem emenda: a primeira e a última coluna combinam (mesma tábua)', () => {
    const tray = paintTray();
    for (const y of [5, 21, 37]) {
      const a = tray.data.slice((y * tray.w) * 4, (y * tray.w) * 4 + 3);
      const b = tray.data.slice((y * tray.w + tray.w - 1) * 4, (y * tray.w + tray.w - 1) * 4 + 3);
      for (let c = 0; c < 3; c += 1) expect(Math.abs(a[c] - b[c])).toBeLessThan(48);
    }
  });

  it('a textura de osso é transparente por cima (só veio, poro e rachadura)', () => {
    const grain = paintBoneGrain();
    expect([grain.w, grain.h]).toEqual([BONE_TEX, BONE_TEX]);
    let marked = 0;
    for (let i = 3; i < grain.data.length; i += 4) if (grain.data[i] > 0) marked += 1;
    expect(marked).toBeGreaterThan(50);
    expect(marked).toBeLessThan(BONE_TEX * BONE_TEX * 0.6);
  });
});

describe('Versão 2.0: o nome do rival na polaroide sai inteiro', () => {
  it('curto fica como está; longo vira o primeiro nome e a inicial do último ("JUVENAL C.")', () => {
    expect(shortRivalName('Tio Zé')).toBe('TIO ZÉ');
    expect(shortRivalName('Juvenal Cachaceiro')).toBe('JUVENAL C.');
    for (const rival of Object.values(RIVALS)) {
      const short = shortRivalName(rival.name);
      expect(short.length, rival.name).toBeLessThanOrEqual(12);
      expect(short.includes('…')).toBe(false);
    }
  });
});
