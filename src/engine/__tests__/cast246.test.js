import { readdirSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { NPC_PORTRAITS, PORTRAITS } from '../../components/art/portraitSpecs.js';
import { castFront, castKeyOf, castOf, castSeated, castSpot, faceOf, preloadCast } from '../../components/art/castHD.js';
import { BUST_H, BUST_W, SEATED_H, SEATED_W, paintBust, paintSeatedBust } from '../../components/art/bustPixels.js';
import { paintPortrait } from '../../components/art/portraitPixels.js';
import { GESTURE_FRAMES } from '../../components/art/figGesture.js';

const ALL = { ...PORTRAITS, ...NPC_PORTRAITS };
/** Quantos quadros diferentes cada emote tem (as palmas e o "calma aí" mexem). */
const FRAMES = { joinha: 2, negativo: 2, dedo: 2, aceno: 3, palmas: 3, calma: 4, risada: 2 };
const MOODS = ['blink', 'talk', 'thinking', 'smug', 'hurt'];
const opaque = (b) => {
  let n = 0;
  for (let i = 3; i < b.data.length; i += 4) if (b.data[i]) n += 1;
  return n;
};
const same = (a, b) => a.data.length === b.data.length && a.data.every((v, i) => v === b.data[i]);

describe('Versão 2.46: os personagens em volume', () => {
  it('antes de chegar, vale o desenho antigo', () => {
    expect(castOf(PORTRAITS.tioZe)).toBeNull();
    const old = paintBust(PORTRAITS.tioZe);
    expect([old.w, old.h]).toEqual([BUST_W, BUST_H]);
  });

  it('todos os personagens chegam, com a frente, o corpo sentado, os humores e os 7 emotes', async () => {
    await preloadCast();
    for (const [key, spec] of Object.entries(ALL)) {
      expect(castKeyOf(spec)).toBe(key);
      const d = castOf(spec);
      expect(d, key).toBeTruthy();
      expect([d.front.idle.w, d.front.idle.h]).toEqual([BUST_W * 2, BUST_H * 2]);
      expect([d.side.idle.w, d.side.idle.h]).toEqual([SEATED_W * 2, SEATED_H * 2]);
      expect([d.side.legs.w, d.side.legs.h]).toEqual([SEATED_W * 2, SEATED_H * 2]);
      for (const m of MOODS) {
        expect(d.front[m], `${key} ${m}`).toBeTruthy();
        expect(d.side[m], `${key} ${m}`).toBeTruthy();
      }
      for (const [g, n] of Object.entries(FRAMES)) {
        expect(d.frontG[g], `${key} ${g}`).toHaveLength(n);
        expect(d.sideG[g], `${key} ${g}`).toHaveLength(n);
        // o braço subindo: dois quadros de frente e dois de lado (descendo, os mesmos ao contrário)
        expect(d.frontR[g], `${key} ${g}`).toHaveLength(2);
        expect(d.sideR[g], `${key} ${g}`).toHaveLength(2);
      }
      expect(d.spots.eyes).toHaveLength(2);
    }
    // todo emote mexe, e a ordem dos quadros só usa quadros que existem
    for (const [g, n] of Object.entries(FRAMES)) {
      const anim = GESTURE_FRAMES[g];
      expect(anim, g).toBeTruthy();
      expect(Math.max(...anim.seq)).toBe(n - 1);
    }
    // quem fuma tem a brasa (de frente, na grade de 64, e sentado de lado)
    expect(castSpot(PORTRAITS.tioZe, 'ember')).toMatchObject({ grid: 64 });
    expect(castSpot(PORTRAITS.tioZe, 'sideEmber')).toBeTruthy();
  }, 60000);

  it('o busto em dobro: humores, boca falando, emotes quadro a quadro e a silhueta', async () => {
    await preloadCast();
    const spec = PORTRAITS.tioZe;
    const idle = paintBust(spec);
    expect([idle.w, idle.h, idle.S]).toEqual([BUST_W * 2, BUST_H * 2, 2]);
    expect(opaque(idle)).toBeGreaterThan(9000);
    for (const m of MOODS) expect(same(paintBust(spec, m, m === 'talk'), idle), m).toBe(false);
    expect(same(paintBust(spec, 'idle', true), idle)).toBe(false);
    for (const g of Object.keys(FRAMES)) expect(same(paintBust(spec, 'idle', false, { gesture: g }), idle), g).toBe(false);
    const clap = [0, 1, 2].map((frame) => paintBust(spec, 'smug', false, { gesture: 'palmas', frame }));
    expect(same(clap[0], clap[1]) || same(clap[1], clap[2])).toBe(false);
    for (const g of ['joinha', 'negativo', 'dedo', 'aceno', 'risada']) {
      const a = paintBust(spec, 'idle', false, { gesture: g, frame: 0 });
      expect(same(a, paintBust(spec, 'idle', false, { gesture: g, frame: 1 })), g).toBe(false);
    }
    // o braço subindo: cada quadro da subida é diferente do gesto pronto e do outro
    for (const g of Object.keys(FRAMES)) {
      const up = [0, 1].map((raise) => paintBust(spec, 'idle', false, { gesture: g, raise }));
      expect(same(up[0], up[1]), g).toBe(false);
      expect(same(up[1], paintBust(spec, 'idle', false, { gesture: g, frame: 0 })), g).toBe(false);
      const seat = paintSeatedBust(spec, 'smug', false, { part: 'upper', gesture: g, raise: 0 });
      expect(same(seat, paintSeatedBust(spec, 'smug', false, { part: 'upper', gesture: g, frame: 0 })), g).toBe(false);
    }
    const shade = paintBust(spec, 'idle', false, { silhouette: true });
    expect([shade.w, shade.h]).toEqual([idle.w, idle.h]);
    expect(opaque(shade)).toBe(opaque(idle));
    // de lado (quem senta nas laterais sem a cadeira): o recorte de cima do corpo sentado
    const side = paintBust(spec, 'idle', false, { profile: 'right' });
    const other = paintBust(spec, 'idle', false, { profile: 'left' });
    expect([side.w, side.h]).toEqual([BUST_W * 2, BUST_H * 2]);
    expect(opaque(side)).toBe(opaque(other));
  }, 60000);

  it('sentado de lado: a cadeira, as pernas e o corpo de cima em camadas, espelhado para a esquerda', async () => {
    await preloadCast();
    for (const key of ['tioZe', 'neide', 'sofia', 'corvo']) {
      const spec = ALL[key];
      for (const part of ['chair', 'legs', 'upper', 'all']) {
        const b = paintSeatedBust(spec, 'idle', false, { part, facing: 'right', chair: 'madeira' });
        expect([b.w, b.h], `${key} ${part}`).toEqual([SEATED_W * 2, SEATED_H * 2]);
        expect(opaque(b), `${key} ${part}`).toBeGreaterThan(part === 'chair' ? 1500 : 4000);
      }
      const r = castSeated(castOf(spec), 'idle', false, 'right', 'plastico', 'all');
      const l = castSeated(castOf(spec), 'idle', false, 'left', 'plastico', 'all');
      const W = r.w;
      let mirrored = true;
      for (let y = 0; y < r.h && mirrored; y += 7)
        for (let x = 0; x < W; x += 1) if (r.data[(y * W + x) * 4 + 3] !== l.data[(y * W + (W - 1 - x)) * 4 + 3]) mirrored = false;
      expect(mirrored).toBe(true);
      const g = paintSeatedBust(spec, 'smug', false, { part: 'upper', gesture: 'joinha' });
      expect(same(g, paintSeatedBust(spec, 'smug', false, { part: 'upper' }))).toBe(false);
    }
  }, 60000);

  it('o retrato é o recorte do meio do busto, no dobro, com o fundo de cada um', async () => {
    await preloadCast();
    for (const key of ['tioZe', 'soro', 'valtinho']) {
      const p = paintPortrait(ALL[key]);
      expect([p.w, p.h]).toEqual([128, 128]);
      expect(opaque(p)).toBe(128 * 128);
      const bare = paintPortrait(ALL[key], 'idle', false, true);
      expect(opaque(bare)).toBeLessThan(128 * 128);
    }
  }, 60000);

  it('o rosto de cada humor (falando abre a boca, menos apanhando; desmaiado de olhos fechados)', () => {
    expect(faceOf('idle', true)).toBe('talk');
    expect(faceOf('hurt', true)).toBe('hurt');
    expect(faceOf('out', false)).toBe('blink');
    expect(faceOf('smug', false)).toBe('smug');
    expect(faceOf('lucky', false)).toBe('idle');
  });

  it('cada personagem em dois pedaços: o leve (parado e humores) e os emotes, que chegam depois', () => {
    const dir = new URL('../../components/art/cast/', import.meta.url);
    const files = readdirSync(dir).filter((f) => f.endsWith('.js'));
    expect(files.length).toBe(Object.keys(ALL).length * 2 + 1);
    const size = (f) => statSync(new URL(f, dir)).size;
    const light = files.filter((f) => !f.endsWith('.g.js')).reduce((s, f) => s + size(f), 0);
    const total = files.reduce((s, f) => s + size(f), 0);
    // o que a campanha precisa na abertura é pouco; os emotes (só na roda) são o grosso
    expect(light).toBeLessThan(2.5 * 1024 * 1024);
    expect(total).toBeLessThan(12 * 1024 * 1024);
    // castFront sem emote nem humor é o quadro parado inteiro
    expect(castFront).toBeTypeOf('function');
  });
});
