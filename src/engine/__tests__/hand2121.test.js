import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { arrangeHand, dropIndex, spreadOffset } from '../../components/handFan.js';

const tile = (id) => ({ id });

describe('Versão 2.12.1: o leque vivo e a mão arrumada no arraste', () => {
  it('a mão segue a ordem arrumada; as compradas entram no fim; sem arrumação é a do jogo', () => {
    const hand = ['a', 'b', 'c', 'd'].map(tile);
    expect(arrangeHand(hand, null)).toBe(hand);
    expect(arrangeHand(hand, ['c', 'a', 'd', 'b']).map((t) => t.id)).toEqual(['c', 'a', 'd', 'b']);
    // jogou a "a" e comprou a "e"
    const next = ['b', 'c', 'd', 'e'].map(tile);
    expect(arrangeHand(next, ['c', 'a', 'd', 'b']).map((t) => t.id)).toEqual(['c', 'd', 'b', 'e']);
  });

  it('a pedra arrastada cai na vaga mais perto; as vizinhas abrem espaço só por perto', () => {
    const xs = [-90, -45, 0, 45, 90];
    expect(dropIndex(xs, -200)).toBe(0);
    expect(dropIndex(xs, 30)).toBe(3);
    expect(dropIndex(xs, 300)).toBe(4);
    expect(spreadOffset(2, 2, 40)).toBe(0);
    expect(spreadOffset(3, 2, 40)).toBeGreaterThan(0);
    expect(spreadOffset(1, 2, 40)).toBeLessThan(0);
    expect(Math.abs(spreadOffset(4, 2, 40))).toBeLessThan(Math.abs(spreadOffset(3, 2, 40)));
    expect(spreadOffset(6, 2, 40)).toBe(0);
  });

  it('arrastar só arruma a tela: o jogo não recebe ação nenhuma', () => {
    const rack = readFileSync(new URL('../../components/PlayerRack.jsx', import.meta.url), 'utf8');
    const hook = rack.slice(rack.indexOf('function useHandArrange'), rack.indexOf('/** O leque da sua mão.'));
    expect(hook).not.toContain('onAction');
    expect(hook).not.toContain('dispatch');
  });

  it('a Rubi Sanguinária não tem mais as bolinhas subindo; as pedras ficaram em pixel art', () => {
    const css = readFileSync(new URL('../../index.css', import.meta.url), 'utf8');
    expect(css).not.toMatch(/ember-rise|rubyHeartbeat|emberRiseY/);
    expect(css).not.toMatch(/\.tile-enh-rubi[^{]*\{[^}]*ember/);
    const rubi = css.slice(css.indexOf('.tile-enh-rubi {'), css.indexOf('.tile-enh-rubi {') + 2000);
    expect(rubi).not.toContain('radial-gradient');
    expect(css).toContain('.tile-grain {');
    const tile = readFileSync(new URL('../../components/DominoTile.jsx', import.meta.url), 'utf8');
    expect(tile).toContain('className="tile-grain"');
  });
});
