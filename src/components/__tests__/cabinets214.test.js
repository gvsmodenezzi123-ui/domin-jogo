import { describe, expect, it } from 'vitest';
import { CAB_W, cabBox, leftCabinet, rightCabinet } from '../landCabinets.js';
import { paintCabinet } from '../art/cabinetPixels.js';
import { paintNiche } from '../art/shopPixels.js';
import { bonusFloat } from '../../engine/gameFeedback.js';

const sum = (img) => {
  let h = 0;
  for (let i = 0; i < img.data.length; i += 5) h = (h * 31 + img.data[i]) >>> 0;
  return h;
};
const inside = (plan) => plan.holes.every((h) => h.x >= 8 && h.y >= 8 && h.x + h.w <= plan.w - 8 && h.y + h.h <= plan.h - 8);

describe('versão 2.14: os armarinhos da mesa deitada', () => {
  it('o da esquerda não cresce com a 5ª e a 6ª vaga de talismã', () => {
    const four = leftCabinet({ slots: 4 });
    const five = leftCabinet({ slots: 5 });
    const six = leftCabinet({ slots: 6 });
    expect(five.h).toBe(four.h);
    expect(six.h).toBe(four.h);
    for (const [plan, n] of [
      [four, 4],
      [five, 5],
      [six, 6],
    ]) {
      expect(plan.w).toBe(CAB_W);
      expect(plan.holes.filter((h) => h.kind === 'niche')).toHaveLength(n);
      expect(inside(plan)).toBe(true);
    }
    // 4 vagas: 2 + 2; 5: 3 + 2 (a de baixo centrada); 6: 3 + 3
    expect(four.boxes.niches.cols).toBe(2);
    expect(five.boxes.niches.cols).toBe(3);
    const row2 = five.holes.filter((h) => h.kind === 'niche').slice(3);
    const mid = (row2[0].x + row2[1].x + row2[1].w) / 2;
    expect(Math.abs(mid - CAB_W / 2)).toBeLessThanOrEqual(1);
  });

  it('o MENU divide a última fileira com o dinheiro; sem dinheiro (roda) a tecla é larga', () => {
    const solo = leftCabinet({ slots: 4, coins: true });
    expect(solo.boxes.coins).toBeTruthy();
    expect(solo.boxes.menu.y).toBe(Math.round(solo.boxes.menu.y));
    expect(solo.boxes.coins.x).toBeGreaterThan(solo.boxes.menu.x + solo.boxes.menu.w);
    const roda = leftCabinet({ slots: 0, hearts: 5, coins: false });
    expect(roda.boxes.niches).toBeUndefined();
    expect(roda.boxes.coins).toBeUndefined();
    expect(roda.boxes.menu.w).toBeGreaterThan(solo.boxes.menu.w);
    expect(roda.h).toBeLessThan(solo.h);
  });

  it('mais de 5 corações abre a 2ª fileira no veludo', () => {
    expect(leftCabinet({ hearts: 5 }).boxes.hearts.rows).toBe(1);
    expect(leftCabinet({ hearts: 9 }).boxes.hearts.rows).toBe(2);
    expect(leftCabinet({ hearts: 9 }).h).toBeGreaterThan(leftCabinet({ hearts: 5 }).h);
  });

  it('o da direita: a lousa (com o risco das pontas) e as duas teclas', () => {
    const r = rightCabinet({ dorme: true });
    expect(r.boxes.slate.split).toBeGreaterThan(r.boxes.slate.h / 2);
    expect(r.boxes.pass.y).toBeGreaterThan(r.boxes.draw.y + r.boxes.draw.h);
    expect(inside(r)).toBe(true);
    const noDorme = rightCabinet({ dorme: false });
    expect(noDorme.boxes.slate).toBeUndefined();
    expect(noDorme.h).toBeLessThan(r.h);
    expect(cabBox(r.boxes.draw, 1)).toEqual({ left: r.boxes.draw.x + 1, top: r.boxes.draw.y + 1, width: r.boxes.draw.w - 2, height: r.boxes.draw.h - 2 });
  });

  it('a pintura tem o tamanho da planta (mais a sombra) e é sempre a mesma', () => {
    for (const plan of [leftCabinet({ slots: 5 }), rightCabinet()]) {
      const a = paintCabinet(plan.w, plan.h, { holes: plan.holes, light: 'right', seed: 7 });
      const b = paintCabinet(plan.w, plan.h, { holes: plan.holes, light: 'right', seed: 7 });
      expect([a.w, a.h]).toEqual([plan.w, plan.h + 3]);
      expect(sum(a)).toBe(sum(b));
      // o miolo é opaco (madeira) e o canto chanfrado de cima fica vazio
      expect(a.data[((20 * a.w + 20) << 2) + 3]).toBe(255);
      expect(a.data[3]).toBe(0);
    }
  });

  it('o nicho da hotbar continua 26×24 e cresce para as teclas', () => {
    expect([paintNiche().w, paintNiche().h]).toEqual([26, 24]);
    const key = paintNiche(92, 32);
    expect([key.w, key.h]).toEqual([92, 32]);
  });

  it('os pontos do múltiplo de 5 seguem com o texto de sempre (o +$ vai no número)', () => {
    expect(bonusFloat({ type: 'bonus5', by: 'player', amount: 3, sum: 15 })).toEqual({ text: '+$3 Σ15', tone: 'player', to: 'player' });
  });
});
