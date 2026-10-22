import { describe, expect, it } from 'vitest';
import { sameTileProps } from '../tileMemo.js';
import { lightingFor } from '../tileLighting.js';

describe('Patch 0.9.4: pedras que não mudam não redesenham', () => {
  it('compara values e style por conteúdo; o resto por referência', () => {
    const click = () => {};
    const base = { values: [3, 5], unit: 30, enhancement: 'ouro', style: { left: 4, top: 8 }, onClick: click };
    expect(sameTileProps(base, { ...base, values: [3, 5], style: { left: 4, top: 8 } })).toBe(true);
    expect(sameTileProps(base, { ...base, values: [5, 3] })).toBe(false);
    expect(sameTileProps(base, { ...base, enhancement: 'rubi' })).toBe(false);
    expect(sameTileProps(base, { ...base, style: { left: 5, top: 8 } })).toBe(false);
    expect(sameTileProps(base, { ...base, onClick: () => {} })).toBe(false);
    expect(sameTileProps(base, { ...base, selected: true })).toBe(false);
    const noStyle = { values: [1, 2], unit: 30 };
    expect(sameTileProps(noStyle, { ...noStyle })).toBe(true);
  });

  it('luz parada: o lado virado para a lâmpada brilha, longe dela escurece', () => {
    const light = { x: 200, y: 300 };
    const right = lightingFor(320, 300, light, false);
    expect(right.lx).toBe(1);
    expect(right.ly).toBe(0);
    const under = lightingFor(200, 300, light, false);
    expect(under.lit).toBe(1);
    const far = lightingFor(200, 900, light, false);
    expect(far.lit).toBe(0.35);
    // a mão nunca some no escuro
    expect(lightingFor(200, 900, light, true).lit).toBe(0.55);
  });
});
