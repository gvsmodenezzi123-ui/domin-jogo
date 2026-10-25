import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { markOpeningSeen, openingSeen } from '../progress.js';
import { DARK_AT, EYES_AT, REVEAL_AT, STROBE_AT, createSecretRenderer } from '../../components/secretPixel.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const read = (file) => readFileSync(join(root, file), 'utf8');

/** Um canvas de mentira do tamanho da tela (o renderer só usa createImageData e putImageData). */
function fakeCanvas(clientWidth, clientHeight) {
  const canvas = { clientWidth, clientHeight, width: 0, height: 0, frames: 0, last: null };
  canvas.getContext = () => ({
    createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
    putImageData: (img) => {
      canvas.frames += 1;
      canvas.last = img;
    },
  });
  return canvas;
}
const lit = (img) => new Uint32Array(img.data.buffer).reduce((n, c) => n + (c ? 1 : 0), 0);

describe('Patch 1.1: abertura no jogo', () => {
  let saved;
  beforeEach(() => {
    saved = globalThis.localStorage;
    const store = new Map();
    globalThis.localStorage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
    };
  });
  afterEach(() => {
    globalThis.localStorage = saved;
  });

  it('a 1ª abertura é inteira; depois de vista, o PULAR aparece', () => {
    expect(openingSeen()).toBe(false);
    markOpeningSeen();
    expect(openingSeen()).toBe(true);
    expect(globalThis.localStorage.getItem('buxaria:opening')).toBe('true');
  });

  it('a trilha do menu espera a abertura (entra na batida do logo, não embaixo da rua)', () => {
    const app = read('src/App.jsx');
    expect(app).toContain("const openingSound = opening.on && state.phase === 'title';");
    expect(app).toContain('if (sound.ctx && !openingSound && !onlineOn) sound.playTrack(musicTrack);');
    // abrindo direto numa mesa online (link ?mesa= ou mesa guardada), a abertura não entra
    expect(app).toContain('on: !startsOnline()');
    // as animações reduzidas valem antes da abertura montar
    expect(read('src/main.jsx')).toContain('applyReducedMotion(loadSettings().reducedMotion);');
  });
});

describe('Patch 1.1: a entrada do Dono da Noite em pixel art', () => {
  it('as fases na ordem: luz falhando, breu, estrobo com o círculo, olhos, revelação', () => {
    expect(DARK_AT).toBeLessThan(STROBE_AT);
    expect(STROBE_AT).toBeLessThan(EYES_AT);
    expect(EYES_AT).toBeLessThan(REVEAL_AT);
  });

  it('no celular em pé: 180 px de largura, a altura pela proporção da tela', () => {
    const canvas = fakeCanvas(390, 844);
    const r = createSecretRenderer(canvas);
    r.render(EYES_AT + 800);
    expect(canvas.width).toBe(180);
    expect(canvas.height).toBe(Math.round((844 * 180) / 390));
    expect(lit(canvas.last)).toBeGreaterThan(0);
  });

  it('deitado (PC): o pixel continua quadrado e a altura é a do desenho, sem esticar o círculo', () => {
    const canvas = fakeCanvas(1280, 720);
    createSecretRenderer(canvas).render(EYES_AT + 800);
    expect(canvas.height).toBe(320);
    expect(Math.abs(canvas.width / canvas.height - 1280 / 720)).toBeLessThan(0.01);
  });

  it('desenha todas as fases (e o modo de animações reduzidas) sem erro', () => {
    const canvas = fakeCanvas(412, 915);
    const r = createSecretRenderer(canvas);
    for (const ms of [0, 200, 700, 1200, DARK_AT + 100, STROBE_AT + 50, STROBE_AT + 300, EYES_AT + 100, EYES_AT + 1300, REVEAL_AT + 100, REVEAL_AT + 5000]) r.render(ms);
    r.render(0, { reduced: true });
    expect(canvas.frames).toBe(12);
    expect(lit(canvas.last)).toBeGreaterThan(0);
  });
});
