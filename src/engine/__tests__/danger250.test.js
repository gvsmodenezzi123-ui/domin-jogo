import { describe, expect, it } from 'vitest';
import { HEARTBEAT_BPM, sound } from '../audioSynth.js';
import { dangerBanner, dangerOf } from '../danger.js';

const one = (count, name = 'Tio Zé') => [{ id: 'tioZe', name, count }];

describe('encurralado (versão 2.5)', () => {
  it('rival por uma pedra: nível 2; com você em até 2 corações, nível 3', () => {
    expect(dangerOf({ myHearts: 5, rivals: one(1) })).toMatchObject({ level: 2, reason: 'last', who: 'tioZe' });
    expect(dangerOf({ myHearts: 2, rivals: one(1) }).level).toBe(3);
    expect(dangerOf({ myHearts: 1, rivals: one(1) }).level).toBe(3);
  });

  it('rival com 2 pedras: pressão (nível 1), ou 2 com você no último coração', () => {
    expect(dangerOf({ myHearts: 4, rivals: one(2) })).toMatchObject({ level: 1, reason: 'two' });
    expect(dangerOf({ myHearts: 1, rivals: one(2) }).level).toBe(2);
  });

  it('último coração sem ameaça na mesa: nível 1; folga: calmo', () => {
    expect(dangerOf({ myHearts: 1, rivals: one(5) })).toMatchObject({ level: 1, reason: 'heart' });
    expect(dangerOf({ myHearts: 3, rivals: one(5) })).toMatchObject({ level: 0, reason: null });
  });

  it('na roda vale o rival mais perto de bater (quem já saiu ou bateu não conta)', () => {
    const rivals = [
      { id: 's1', name: 'Neide', count: 4 },
      { id: 's2', name: 'Baiano', count: 1 },
      { id: 's3', name: 'Sofia', count: 0 },
    ];
    expect(dangerOf({ myHearts: 5, rivals })).toMatchObject({ level: 2, who: 's2', name: 'Baiano' });
  });

  it('o aviso diz quem está por uma pedra e o que acontece se ele bater', () => {
    expect(dangerBanner(dangerOf({ myHearts: 5, rivals: one(1, 'Neide') }), 5)).toEqual({ title: 'ÚLTIMA PEDRA!', line: 'Neide pode bater na próxima.' });
    expect(dangerBanner(dangerOf({ myHearts: 1, rivals: one(1, 'Neide') }), 1).line).toBe('Se Neide bater, você cai.');
    expect(dangerBanner(dangerOf({ myHearts: 2, rivals: one(1, 'Neide') }), 2).title).toBe('ENCURRALADO!');
    expect(dangerBanner(dangerOf({ myHearts: 1, rivals: one(2, 'Neide') }), 1).title).toBe('ÚLTIMO CORAÇÃO!');
    expect(dangerBanner(dangerOf({ myHearts: 4, rivals: one(2) }), 4)).toBe(null);
  });

  it('o coração acelera a cada nível e a trilha abaixa por baixo dele', () => {
    expect(HEARTBEAT_BPM[1]).toBeLessThan(HEARTBEAT_BPM[2]);
    expect(HEARTBEAT_BPM[2]).toBeLessThan(HEARTBEAT_BPM[3]);
    const before = sound.dangerDuck;
    sound.setHeartbeat(3);
    expect(sound.heartLevel).toBe(3);
    expect(sound.dangerDuck).toBeLessThan(before);
    sound.setHeartbeat(0);
    expect(sound.heartLevel).toBe(0);
    expect(sound.dangerDuck).toBe(1);
    expect(sound.heartTimer).toBe(null);
  });
});
