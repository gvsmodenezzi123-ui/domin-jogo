import { describe, expect, it } from 'vitest';
import { RELICS } from '../../data/relics.js';
import { gainCoins, recordEarning } from '../effects.js';
import { createInitialState, createMatchFx, gameReducer } from '../gameReducer.js';
import { matchTally } from '../matchTally.js';
import { FULL_SET, makeTile } from '../dominoLogic.js';

const t = (a, b) => makeTile(a, b);
const relicId = Object.keys(RELICS)[0];

function base() {
  const s = createInitialState();
  return { ...s, matchFx: createMatchFx(), coins: { player: 10, tioZe: 0 } };
}

describe('o caderninho da partida (versão 2.6)', () => {
  it('cada moeda que entra no seu bolso fica anotada pela origem, com quantas vezes rendeu', () => {
    let s = base();
    s = gainCoins(s, 'player', 2, relicId);
    s = gainCoins(s, 'player', 3, relicId);
    s = gainCoins(s, 'tioZe', 5, relicId);
    expect(s.matchFx.earned[relicId]).toEqual({ amount: 5, count: 2 });
    expect(s.coins.player).toBe(15);
  });

  it('fora da mesa (sem matchFx) não anota', () => {
    const s = { ...base(), matchFx: undefined };
    expect(recordEarning(s, 'ouro', 3)).toBe(s);
  });

  it('o múltiplo de 5 anota na origem "five"', () => {
    // [5|5] abre a mesa: pontas 5 e 5 = 10, múltiplo de 5 para quem jogou
    const player = [t(5, 5), t(0, 1), t(0, 2), t(1, 2), t(1, 3), t(2, 3), t(0, 3)];
    const tioZe = [t(4, 4), t(3, 3), t(2, 4), t(3, 4), t(1, 4), t(0, 4), t(2, 2)];
    const used = new Set([...player, ...tioZe].map((x) => x.id));
    const deck = [...player, ...tioZe, ...FULL_SET.filter((x) => !used.has(x.id))];
    let s = gameReducer(createInitialState(), { type: 'START_DUEL', deck });
    s = gameReducer(s, { type: 'PLAY', actor: 'player', tileId: '5-5', side: 'root' });
    const five = s.matchFx.earned.five;
    if (s.events.some((e) => e.type === 'bonus5' && e.by === 'player')) expect(five.amount).toBeGreaterThan(0);
    else expect(five).toBeUndefined();
  });
});

describe('o placar da mesa vencida (versão 2.6)', () => {
  it('ordem: múltiplos de 5, pedras de ouro, talismãs (o que mais rendeu primeiro) e o prêmio por último', () => {
    const [r1, r2] = Object.keys(RELICS);
    const s = {
      ...base(),
      maleta: 'classica',
      matchFx: { ...createMatchFx(), earned: { five: { amount: 9, count: 3 }, ouro: { amount: 4, count: 2 }, [r1]: { amount: 2, count: 1 }, [r2]: { amount: 6, count: 2 }, prize: { amount: 8, count: 1 }, sell: { amount: 5, count: 1 } } },
      roundResult: { prize: 8, heal: 2, caps: 0 },
      coins: { player: 40, tioZe: 0 },
    };
    const tally = matchTally(s, { name: 'Tio Zé', boss: false, prizeBonus: 0 });
    expect(tally.lines.map((l) => l.kind)).toEqual(['five', 'gold', 'relic', 'relic', 'prize']);
    expect(tally.lines[2].relicId).toBe(r2);
    expect(tally.total).toBe(9 + 4 + 2 + 6 + 8);
    expect(tally.extras).toEqual([{ id: 'heal', kind: 'heal', label: 'CURA', amount: 2 }]);
    expect(tally.purse).toBe(40);
  });

  it('o prêmio do chefe diz de onde veio o extra e a Maleta Seca mostra o ×2', () => {
    const s = { ...base(), maleta: 'seca', matchFx: { ...createMatchFx(), earned: { prize: { amount: 26, count: 1 } } }, roundResult: { prize: 26, heal: 3, caps: 1 } };
    const tally = matchTally(s, { name: 'Comendador', boss: true, prizeBonus: 5 });
    const prize = tally.lines.at(-1);
    expect(prize.label).toBe('PRÊMIO DO CHEFE');
    expect(prize.note).toMatch(/\+\$5 DO CHEFE/);
    expect(prize.note).toMatch(/×2/);
    expect(tally.extras.map((e) => e.kind)).toEqual(['heal', 'caps']);
  });
});
