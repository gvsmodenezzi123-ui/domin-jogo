import { afterEach, describe, expect, it } from 'vitest';
import { generateCampaign, mixSeed as mapMix } from '../campaignMap.js';
import { FULL_SET, createSeededRng } from '../dominoLogic.js';
import { createInitialState, gameReducer } from '../gameReducer.js';
import { isValidSave, snapshotRun } from '../save.js';
import {
  SEED_ALPHABET,
  activeSeed,
  clearPRNG,
  generateRandomSeed,
  initPRNG,
  mixSeed,
  mulberry32,
  normalizeSeed,
  random,
  randomInt,
  randomRange,
  rngFor,
  seedLabelOf,
  seedNumberOf,
  shuffle,
} from '../seedEngine.js';

afterEach(() => clearPRNG());

const draws = (n) => Array.from({ length: n }, () => random());

describe('Patch 0.9.2: motor de sementes (Mulberry32)', () => {
  it('semente sorteada: 6 caracteres maiúsculos em dois grupos, sem 0/O/1/I', () => {
    for (let i = 0; i < 200; i += 1) {
      const code = generateRandomSeed();
      expect(/^[A-Z0-9]{3}-[A-Z0-9]{3}$/.test(code)).toBe(true);
      for (const ch of code.replace('-', '')) expect(SEED_ALPHABET).toContain(ch);
    }
  });

  it('a semente digitada vira a forma canônica; com ou sem hífen é a mesma', () => {
    expect(normalizeSeed('  bux9k2 ')).toBe('BUX-9K2');
    expect(normalizeSeed('bux-9k2')).toBe('BUX-9K2');
    expect(normalizeSeed('')).toBe(null);
    expect(normalizeSeed('   ')).toBe(null);
    expect(normalizeSeed('meu boteco')).toBe('MEUBOTECO');
    expect(normalizeSeed('#123')).toBe('#123');
    expect(seedNumberOf('BUX-9K2')).toBe(seedNumberOf('bux9k2'));
    expect(seedNumberOf('BUX-9K2')).not.toBe(seedNumberOf('BUX-9K3'));
    expect(seedNumberOf('#123456')).toBe(123456);
    expect(seedNumberOf(77)).toBe(77);
  });

  it('initPRNG + random: a mesma semente dá a mesma sequência, outra semente dá outra', () => {
    initPRNG('BUX-9K2');
    const a = draws(8);
    initPRNG('TRK-777');
    const b = draws(8);
    clearPRNG();
    initPRNG('bux9k2');
    expect(draws(8)).toEqual(a);
    expect(a).not.toEqual(b);
    for (const n of a) expect(n >= 0 && n < 1).toBe(true);
    expect(activeSeed()).toEqual({ code: 'BUX-9K2', number: seedNumberOf('BUX-9K2') });
  });

  it('randomRange e randomInt ficam no intervalo', () => {
    initPRNG('ABC-123');
    for (let i = 0; i < 500; i += 1) {
      const x = randomRange(2, 5);
      expect(x >= 2 && x < 5).toBe(true);
      const k = randomInt(1, 6);
      expect(Number.isInteger(k) && k >= 1 && k <= 6).toBe(true);
    }
  });

  it('shuffle das 28 pedras: com chave, repete igual e não depende do que veio antes', () => {
    initPRNG('PED-RAS');
    const first = shuffle(FULL_SET, 'r1-f1-l1:tonho:1');
    draws(50); // gastar a sequência principal não mexe na da chave
    const again = shuffle(FULL_SET, 'r1-f1-l1:tonho:1');
    expect(again.map((t) => t.id)).toEqual(first.map((t) => t.id));
    expect(new Set(first.map((t) => t.id)).size).toBe(28);
    const round2 = shuffle(FULL_SET, 'r1-f1-l1:tonho:2');
    expect(round2.map((t) => t.id)).not.toEqual(first.map((t) => t.id));
    expect(FULL_SET.map((t) => t.id)).toEqual(FULL_SET.map((t) => t.id)); // original intacto
  });

  it('é o mesmo Mulberry32 e o mesmo mixSeed de antes: runs e saves antigos não mudam', () => {
    const a = mulberry32(42);
    const b = createSeededRng(42);
    for (let i = 0; i < 20; i += 1) expect(a()).toBe(b());
    expect(mapMix).toBe(mixSeed);
    // o mesmo valor que o Mulberry32 de referência dá para a semente 1
    expect(mulberry32(1)()).toBeCloseTo(0.6270739405881613, 12);
    expect(rngFor('x', 9)()).toBe(mulberry32(mixSeed(9, 'x'))());
  });

  it('a mesma semente monta a mesma teia, a mesma loja e o mesmo Mercado Negro', () => {
    const start = (code) => gameReducer(createInitialState(), { type: 'NEW_RUN', seed: seedNumberOf(code), seedCode: code, mode: 'normal' });
    const a = start('BUX-9K2');
    const b = start('BUX-9K2');
    const c = start('OUT-R44');
    expect(a.seed).toBe(b.seed);
    expect(a.seedCode).toBe('BUX-9K2');
    const shape = (s) => [...generateCampaign(s.seed).byId.values()].map((n) => `${n.id}:${n.type}:${n.rivalId ?? ''}`).join('|');
    expect(shape(a)).toBe(shape(b));
    expect(shape(a)).not.toBe(shape(c));
    const toStop = (s, kind) => gameReducer(s, { type: 'DEV', op: 'openStop', kind });
    expect(toStop(a, 'shop').shop).toEqual(toStop(b, 'shop').shop);
    expect(toStop(a, 'black').market).toEqual(toStop(b, 'black').market);
  });

  it('NEW_RUN só com o texto calcula o número; o save guarda e devolve a semente', () => {
    const s = gameReducer(createInitialState(), { type: 'NEW_RUN', seedCode: 'bux9k2' });
    expect(s.seed).toBe(seedNumberOf('BUX-9K2'));
    expect(seedLabelOf(s)).toBe('BUX-9K2');
    const save = snapshotRun(s, 'map', 1);
    expect(save.seedCode).toBe('BUX-9K2');
    expect(isValidSave(save)).toBe(true);
    const loaded = gameReducer(createInitialState(), { type: 'LOAD_RUN', save });
    expect(loaded).toMatchObject({ seed: s.seed, seedCode: 'BUX-9K2' });
    // save antigo, só com o número: aparece como #número
    const legacy = gameReducer(createInitialState(), { type: 'LOAD_RUN', save: { ...save, seedCode: undefined } });
    expect(seedLabelOf(legacy)).toBe(`#${s.seed}`);
    expect(isValidSave({ ...save, seedCode: 'X'.repeat(40) })).toBe(false);
  });
});
