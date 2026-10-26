import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BOSS_INTRO_IDS, BOSS_TRACKS, FINAL_BOSSES, REGIONS } from '../../data/campaign.js';
import { ENHANCEMENTS } from '../../data/enhancedTiles.js';
import { RARITIES } from '../../data/rarities.js';
import { LOCKED_RELIC_IDS, PVP_BANNED_RELICS, RELICS, isRelicOffered } from '../../data/relics.js';
import { AI_TIERS, HARD_RIVALS, INFERNO_RIVALS, RIVALS, tierOf } from '../../data/rivals.js';
import { ACHIEVEMENTS, ACHIEVEMENT_BY_RELIC, isAchievementUnlocked, resetAchievements, trackAchievements } from '../achievements.js';
import { MAP_VERSION, generateCampaign, runCast } from '../campaignMap.js';
import { FULL_SET, createEmptyBoard, getOpenEnds, makeTile, placeTile } from '../dominoLogic.js';
import { createInitialState, gameReducer } from '../gameReducer.js';
import {
  canUseGrampo,
  drawAvailabilityFor,
  hasRelic,
  passAvailabilityFor,
  passFeeFor,
  relicsOf,
  rivalNumberCounts,
  rulesFor,
  spentRelicsOf,
  trancaSumOffsets,
  trancaTileValues,
} from '../powers.js';
import { isValidSave, snapshotRun } from '../save.js';
import { buildShop } from '../shop.js';

const t = (a, b) => makeTile(a, b);
const act = (s, type, extra = {}) => gameReducer(s, { type, ...extra });
const play = (s, tileId, side, actor = 'player') => act(s, 'PLAY', { actor, tileId, side });
const procs = (s, id) => s.events.filter((e) => e.type === 'proc' && e.id === id);
const lastOf = (s, type) => [...s.events].reverse().find((e) => e.type === type);

/** Mesa montada (pontas 3 e 4 por padrão), contra o rival `rivalId`. */
function table({ player, tioZe = [t(1, 1), t(2, 2)], board, boneyard = [], relics = [], rivalRelics = [], coins, hearts, turn = 'player', seed = 1, rivalId = 'tioZe' }) {
  const s = act(createInitialState(), 'START_DUEL', { deck: FULL_SET.slice(), seed, rivalId });
  return {
    ...s,
    hands: { player, tioZe },
    board: board ?? placeTile(createEmptyBoard(), t(3, 4), 'root'),
    boneyard,
    turn,
    openingTileId: null,
    relics: { player: relics, tioZe: rivalRelics },
    decks: { player: {}, tioZe: {} },
    coins: { ...s.coins, ...coins },
    hearts: { ...s.hearts, ...hearts },
    roundStartHearts: { player: 5, tioZe: 3 },
  };
}

const boardOf = (root, left = [], right = []) => {
  let b = placeTile(createEmptyBoard(), root, 'root');
  for (const x of left) b = placeTile(b, x, 'left');
  for (const x of right) b = placeTile(b, x, 'right');
  return b;
};

const NEW_RELICS = [
  'pires', 'gilete', 'bicarbonato', 'cofrinho', 'prego', 'peCoelho',
  'grampo', 'espatula', 'taco', 'oleo', 'pacoteTremoco', 'cadeado',
  'chapaFogao', 'lupa', 'canetaLoterica', 'trena',
  'ampulheta', 'velaPreta',
];
const NEW_RIVALS = ['juvenal', 'zeca', 'marquinhos', 'nelsinho', 'geraldo', 'genesio', 'soro', 'brandao', 'odete', 'valtinhoRenegado'];
const PRICE_RANGE = { comum: [4, 6], raro: [7, 10], lendario: [12, 16], mitico: [18, 25], necrotico: [18, 26] };

describe('Versão 1.4: catálogo', () => {
  it('18 talismãs novos, todos trancados por uma conquista própria, com preço na faixa da raridade', () => {
    const rarity = { comum: 6, raro: 6, lendario: 4, mitico: 1, necrotico: 1 };
    for (const [r, n] of Object.entries(rarity)) expect(NEW_RELICS.filter((id) => RELICS[id].rarity === r), r).toHaveLength(n);
    for (const id of NEW_RELICS) {
      const relic = RELICS[id];
      expect(relic.art, id).toBe(id);
      expect(relic.description.length, id).toBeGreaterThan(30);
      const [lo, hi] = PRICE_RANGE[relic.rarity];
      expect(relic.price, id).toBeGreaterThanOrEqual(lo);
      expect(relic.price, id).toBeLessThanOrEqual(hi);
      expect(LOCKED_RELIC_IDS).toContain(id);
      expect(ACHIEVEMENT_BY_RELIC[id]?.id, id).toBe(relic.lockedBy);
      expect(ACHIEVEMENTS[relic.lockedBy].goal.length, id).toBeGreaterThan(20);
    }
    // os que quebravam o jogo ficaram de fora (Ferradura, Mão de Glória, Mercúrio)
    expect(RELICS.ferradura).toBeUndefined();
    expect(RELICS.maoGloria).toBeUndefined();
    expect(ENHANCEMENTS.mercurio).toBeUndefined();
    expect(Object.keys(RARITIES)).toContain('necrotico');
  });

  it('2 pedras de grife novas (Âmbar e Obsidiana)', () => {
    expect(ENHANCEMENTS.ambar).toMatchObject({ rarity: 'raro', price: 7 });
    expect(ENHANCEMENTS.obsidiana).toMatchObject({ rarity: 'raro', price: 9, trancaValue: -5 });
  });

  it('no online ficam de fora o Taco, a Lupa, a Ampulheta e o Pé de Coelho', () => {
    for (const id of ['taco', 'lupa', 'ampulheta', 'peCoelho']) {
      expect(PVP_BANNED_RELICS).toContain(id);
      expect(isRelicOffered(id, { pvp: { run: true }, unlocks: [id] })).toBe(false);
      expect(isRelicOffered(id, { unlocks: [id] })).toBe(true);
    }
  });

  it('10 rivais novos respeitam o nível da IA e têm corações, falas, trilha e entrada (os chefes)', () => {
    for (const id of NEW_RIVALS) {
      const rival = RIVALS[id];
      const tier = AI_TIERS[tierOf(rival)];
      expect(Object.keys(rival.deck).length, id).toBeLessThanOrEqual(tier.maxEnhanced);
      expect(rival.relics.length, id).toBeLessThanOrEqual(tier.maxRelics);
      expect(rival.lines.intro.length, id).toBeGreaterThan(0);
      expect(HARD_RIVALS[id].hearts, id).toBeGreaterThanOrEqual(rival.hearts);
      expect(INFERNO_RIVALS[id], id).toBeTruthy();
      if (rival.boss) {
        expect(BOSS_TRACKS[id], id).toBeTruthy();
        expect(BOSS_INTRO_IDS).toContain(id);
      }
    }
    expect(RIVALS.odete.hearts).toBe(8);
    expect(RIVALS.valtinhoRenegado.hearts).toBe(7);
    // sem a Carteira na mão dos chefes finais novos (ela virava bola de neve)
    expect(RIVALS.odete.relics).not.toContain('carteira');
    expect(RIVALS.valtinhoRenegado.relics).not.toContain('carteira');
  });
});

describe('Versão 1.4: teia v3 (rivais novos e chefes sorteados)', () => {
  it('cada região sorteia o chefe entre os dela; os comuns saem dos candidatos novos', () => {
    const bosses = [new Set(), new Set(), new Set()];
    const seen = new Set();
    for (let seed = 1; seed <= 300; seed += 1) {
      const campaign = generateCampaign(seed, 3);
      campaign.regions.forEach((region, i) => {
        expect(REGIONS[i].bosses).toContain(region.cast.boss);
        bosses[i].add(region.cast.boss);
        for (const id of [region.cast.intro, ...region.cast.commons]) {
          expect(REGIONS[i].pool).toContain(id);
          seen.add(id);
        }
      });
    }
    bosses.forEach((set, i) => expect([...set].sort()).toEqual([...REGIONS[i].bosses].sort()));
    for (const id of ['juvenal', 'zeca', 'marquinhos', 'nelsinho', 'geraldo']) expect(seen.has(id), id).toBe(true);
    expect([...bosses[2]].sort()).toEqual([...FINAL_BOSSES].sort());
  });

  it('runs novas nascem na teia 3; a teia 2 continua igual (mesmos nós, mesmo elenco de antes)', () => {
    expect(MAP_VERSION).toBe(3);
    const s = act(createInitialState(), 'NEW_RUN', { seed: 77 });
    expect(s.run.map).toBe(3);
    const v2 = generateCampaign(77, 2);
    const v3 = generateCampaign(77, 3);
    expect(v3.regions.map((r) => r.nodes.map((n) => n.type))).toEqual(v2.regions.map((r) => r.nodes.map((n) => n.type)));
    for (const r of v2.regions) expect(r.cast.boss).toBe(REGIONS[r.id - 1].nodes.at(-1));
    expect(runCast(77, 1)).toEqual(runCast(77, 1, 2));
  });

  it('save da teia 2 volta na teia 2; save novo guarda a 3 e os reembaralhares grátis', () => {
    const s = { ...act(createInitialState(), 'NEW_RUN', { seed: 9 }), run: { ...act(createInitialState(), 'NEW_RUN', { seed: 9 }).run, freeRerolls: 2 } };
    const save = JSON.parse(JSON.stringify(snapshotRun(s, 'map')));
    expect(save).toMatchObject({ v: 6, map: 3, freeRerolls: 2 });
    expect(isValidSave(save)).toBe(true);
    const loaded = act(createInitialState(), 'LOAD_RUN', { save });
    expect(loaded.run.map).toBe(3);
    expect(loaded.run.freeRerolls).toBe(2);
    const old = act(createInitialState(), 'LOAD_RUN', { save: { ...save, v: 5, map: 2, freeRerolls: undefined } });
    expect(old.run.map).toBe(2);
    expect(old.run.freeRerolls).toBe(0);
    expect(isValidSave({ ...save, map: 4 })).toBe(false);
    expect(isValidSave({ ...save, freeRerolls: 9 })).toBe(false);
  });

  it('qualquer chefe final encerra a run; com 3 Necróticos o Dono da Noite aparece depois dele', () => {
    for (const boss of FINAL_BOSSES) {
      const seed = [...Array(400).keys()].map((i) => i + 1).find((n) => generateCampaign(n, 3).regions[2].cast.boss === boss);
      let s = act(createInitialState(), 'NEW_RUN', { seed });
      s = act(s, 'DEV', { op: 'setRival', rivalId: boss, deck: FULL_SET.slice() });
      expect(s.rivalId).toBe(boss);
      const won = act(s, 'DEV', { op: 'winMatch' });
      expect(won.phase, boss).toBe('runWon');
      const necro = { ...s, relics: { ...s.relics, player: ['pactoCoveiro', 'olhoMorte', 'caliceGalo'] } };
      expect(act(necro, 'DEV', { op: 'winMatch' }).phase, boss).toBe('secretReveal');
    }
  });
});

describe('Versão 1.4: talismãs comuns', () => {
  it('Pires de Aperitivo: 2 pedras leves na mão dão +$2 no começo da rodada', () => {
    const light = [t(0, 0), t(1, 2), t(4, 6), t(5, 6), t(3, 5), t(2, 6), t(4, 5)];
    const deck = [...light, ...FULL_SET.filter((x) => !light.some((y) => y.id === x.id))];
    const s = act(createInitialState(), 'START_DUEL', { deck, relics: ['pires'] });
    expect(procs(s, 'pires')).toHaveLength(1);
    expect(s.coins.player).toBe(5 + 2);
  });

  it('Gilete: bucha ímpar numa ponta dá +$3; par ou abrindo a mesa, nada', () => {
    const s = table({ player: [t(3, 3), t(4, 4), t(0, 1)], relics: ['gilete'], coins: { player: 0 } });
    const odd = play(s, '3-3', 'left');
    expect(odd.coins.player).toBe(3);
    const even = play(s, '4-4', 'right');
    expect(even.coins.player).toBe(0);
  });

  it('Bicarbonato: a 1ª compra paga da partida sai de graça (até sem dinheiro), e só uma vez', () => {
    let s = table({ player: [t(0, 0)], boneyard: [t(0, 1), t(0, 2), t(5, 5), t(6, 6)], relics: ['bicarbonato'], coins: { player: 0 } });
    s = act(s, 'DRAW', { actor: 'player' }); // grátis normal
    expect(drawAvailabilityFor(s, 'player').cost).toMatchObject({ type: 'free', relic: 'bicarbonato' });
    s = act(s, 'DRAW', { actor: 'player' });
    expect(s.matchFx.bicarbUsed.player).toBe(true);
    expect(procs(s, 'bicarbonato')).toHaveLength(1);
    expect(s.hands.player).toHaveLength(3);
    // a próxima compra paga volta a custar (coração na 3ª)
    expect(drawAvailabilityFor(s, 'player').cost.type).toBe('heart');
  });

  it('Cofrinho de Barro: múltiplo de 5 do rival paga metade (para cima) para você', () => {
    const s = table({ player: [t(0, 0)], tioZe: [t(4, 2), t(6, 6)], relics: ['cofrinho'], coins: { player: 0 }, turn: 'tioZe' });
    const after = play(s, '2-4', 'right', 'tioZe'); // pontas 3 e 2 = 5
    expect(after.coins.player).toBe(2);
    expect(procs(after, 'cofrinho')).toHaveLength(1);
  });

  it('Prego Enferrujado: a 1ª pedra com 0 mostra 1 pedra do rival ([0|0]: 2)', () => {
    const s = table({ player: [t(0, 3), t(0, 4), t(5, 5)], tioZe: [t(1, 1), t(2, 2), t(6, 6)], relics: ['prego'] });
    const once = play(s, '0-3', 'left');
    expect(once.fx.revealed).toHaveLength(1);
    const again = play({ ...once, turn: 'player' }, '0-4', 'right');
    expect(again.fx.revealed).toHaveLength(1);
    const zero = table({ player: [t(0, 0), t(5, 5)], tioZe: [t(1, 1), t(2, 2), t(6, 6)], relics: ['prego'], board: boardOf(t(0, 4)) });
    expect(play(zero, '0-0', 'left').fx.revealed).toHaveLength(2);
  });

  it('Pé de Coelho: batida tomada vira reembaralhar grátis na próxima loja (até 3)', () => {
    let s = table({ player: [t(5, 5), t(6, 6)], tioZe: [t(4, 1)], relics: ['peCoelho'], turn: 'tioZe' });
    s = play(s, '1-4', 'right', 'tioZe');
    expect(s.roundResult.winner).toBe('tioZe');
    expect(s.run.freeRerolls).toBe(1);
    const shop = { ...s, phase: 'shop', shop: buildShop(s, 0), coins: { ...s.coins, player: 0 } };
    expect(shop.shop.rerollCost).toBe(0);
    const rolled = act(shop, 'SHOP_REROLL');
    expect(rolled.run.freeRerolls).toBe(0);
    expect(rolled.shop.rerollCost).toBeGreaterThan(0);
    const full = { ...s, run: { ...s.run, freeRerolls: 3 }, phase: 'playing', roundResult: null, hands: { player: [t(5, 5), t(6, 6)], tioZe: [t(4, 1)] }, turn: 'tioZe' };
    expect(play(full, '1-4', 'right', 'tioZe').run.freeRerolls).toBe(3);
  });
});

describe('Versão 1.4: talismãs raros', () => {
  it('Grampo de Cabelo: esconde uma bucha no fundo do dorme, a vez passa sem contar passe (1x por rodada)', () => {
    const s = table({ player: [t(6, 6), t(0, 1), t(2, 2)], tioZe: [t(5, 5), t(1, 2)], boneyard: [t(0, 5)], relics: ['grampo'] });
    expect(canUseGrampo(s)).toBe(true);
    const open = act(s, 'USE_GRAMPO');
    expect(open.pending).toEqual({ type: 'grampo' });
    expect(act(open, 'GRAMPO_PICK', { tileId: '0-1' })).toBe(open); // não é bucha
    const done = act(open, 'GRAMPO_PICK', { tileId: '6-6' });
    expect(done.hands.player.map((x) => x.id)).toEqual(['0-1', '2-2']);
    expect(done.boneyard.at(-1).id).toBe('6-6');
    expect(done.turn).toBe('tioZe');
    expect(done.consecutivePasses).toBe(0);
    expect(done.events.some((e) => e.type === 'pass')).toBe(false);
    expect(canUseGrampo({ ...done, turn: 'player' })).toBe(false); // já usou na rodada
    expect(act(open, 'CANCEL_GRAMPO').pending).toBe(null);
    expect(canUseGrampo({ ...s, hands: { ...s.hands, player: [t(6, 6)] } })).toBe(false); // última pedra não
  });

  it('Espátula: cada pedra comprada na rodada tira 3 da sua soma na tranca', () => {
    let s = table({ player: [t(6, 6)], boneyard: [t(5, 6), t(6, 6 - 1 + 0)], relics: ['espatula'] });
    s = act(s, 'DRAW', { actor: 'player' });
    expect(s.fx.bought.player).toBe(1);
    expect(trancaSumOffsets(s).player).toBe(-3);
  });

  it('Taco: pontas iguais depois da sua jogada = o rival não joga bucha na vez dele', () => {
    const s = table({ player: [t(3, 4), t(0, 1)], tioZe: [t(4, 4), t(1, 4)], board: boardOf(t(3, 4)), relics: ['taco'] });
    const after = play(s, '3-4', 'left'); // pontas 4 e 4
    expect(getOpenEnds(after.board)).toEqual({ left: 4, right: 4 });
    expect(rulesFor(after, 'tioZe').noDoubles).toBe(true);
    expect(act(after, 'PLAY', { actor: 'tioZe', tileId: '4-4', side: 'left' })).toBe(after);
    const played = play(after, '1-4', 'left', 'tioZe');
    expect(played.fx.noDoubles.tioZe).toBe(false);
  });

  it('Óleo de Máquina: a 2ª compra do turno sai de graça', () => {
    let s = table({ player: [t(0, 0)], boneyard: [t(0, 1), t(0, 2), t(5, 5)], relics: ['oleo'], coins: { player: 0 } });
    s = act(s, 'DRAW', { actor: 'player' });
    expect(drawAvailabilityFor(s, 'player').cost).toMatchObject({ type: 'free', relic: 'oleo' });
    s = act(s, 'DRAW', { actor: 'player' });
    expect(s.coins.player).toBe(0);
    expect(drawAvailabilityFor(s, 'player').cost.type).toBe('heart');
  });

  it('Pacote de Tremoço: mais de 45 pontos na mão dão +$4', () => {
    const heavy = [t(6, 6), t(5, 6), t(5, 5), t(4, 6), t(4, 5), t(3, 6), t(4, 4)];
    const deck = [...heavy, ...FULL_SET.filter((x) => !heavy.some((y) => y.id === x.id))];
    const s = act(createInitialState(), 'START_DUEL', { deck, relics: ['pacoteTremoco'] });
    expect(s.coins.player).toBe(5 + 4);
  });

  it('Cadeado Enferrujado: a tranca que você vence tira 1 coração a mais', () => {
    const s = table({ player: [t(0, 1)], tioZe: [t(6, 6)], relics: ['cadeado'], hearts: { tioZe: 3 } });
    const after = act(s, 'DEV', { op: 'forceTranca' });
    expect(after.roundResult).toMatchObject({ kind: 'tranca', winner: 'player', damage: 2, glass: 'player' });
    expect(after.hearts.tioZe).toBe(1);
  });
});

describe('Versão 1.4: lendários, mítico e necrótico', () => {
  it('Chapa de Fogão: depois da sua bucha, o rival que compra ou passa toma 1 de dano (1x por rodada)', () => {
    let s = table({ player: [t(4, 4), t(0, 1)], tioZe: [t(6, 6)], boneyard: [t(5, 5), t(2, 2)], relics: ['chapaFogao'], hearts: { tioZe: 3 } });
    s = play(s, '4-4', 'right');
    expect(s.fx.chapa.tioZe).toBe(true);
    s = act(s, 'DRAW', { actor: 'tioZe' });
    expect(s.hearts.tioZe).toBe(2);
    expect(procs(s, 'chapaFogao').some((e) => e.text.includes('−1♥'))).toBe(true);
    expect(s.fx.used.player).toContain('chapaFogao');
  });

  it('Lupa de Joalheiro: quantas pedras de cada número o rival tem', () => {
    const s = table({ player: [t(0, 1)], tioZe: [t(1, 1), t(1, 6), t(3, 6)], relics: ['lupa'] });
    expect(rivalNumberCounts(s)).toEqual([0, 2, 0, 1, 0, 0, 2]);
    expect(rivalNumberCounts({ ...s, relics: { player: [], tioZe: [] } })).toBe(null);
  });

  it('Caneta de Lotérica: pontas somando 10 ou 12 tiram $4 do rival', () => {
    const s = table({ player: [t(4, 6), t(0, 1)], board: boardOf(t(4, 6)), relics: ['canetaLoterica'], coins: { player: 0, tioZe: 9 } });
    const after = play(s, '4-6', 'left'); // pontas 6 e 6 = 12
    expect(after.coins.player).toBe(4);
    expect(after.coins.tioZe).toBe(5);
  });

  it('Trena de Pedreiro: tranca decidida por até 5 pontos (empate incluso) é sua e tira 2', () => {
    const tie = table({ player: [t(1, 2)], tioZe: [t(0, 3)], relics: ['trena'] });
    expect(act(tie, 'DEV', { op: 'forceTranca' }).roundResult).toMatchObject({ winner: 'player', damage: 2, razor: 'player' });
    const close = table({ player: [t(4, 4)], tioZe: [t(1, 2)], relics: ['trena'] });
    expect(act(close, 'DEV', { op: 'forceTranca' }).roundResult).toMatchObject({ winner: 'player', damage: 2 });
    const far = table({ player: [t(6, 6)], tioZe: [t(0, 1)], relics: ['trena'] });
    expect(act(far, 'DEV', { op: 'forceTranca' }).roundResult.winner).toBe('tioZe');
  });

  it('Ampulheta Rachada: a batida do rival volta, ele compra 2 e a vez é sua (1x por partida)', () => {
    const s = table({ player: [t(5, 5), t(6, 6)], tioZe: [t(4, 1)], boneyard: [t(0, 0), t(0, 2), t(2, 2)], relics: ['ampulheta'], turn: 'tioZe' });
    const after = play(s, '1-4', 'right', 'tioZe');
    expect(after.phase).toBe('playing');
    expect(after.turn).toBe('player');
    expect(after.hands.tioZe.map((x) => x.id)).toEqual(['1-4', '0-0', '0-2']);
    expect(after.board).toBe(s.board);
    expect(after.matchFx.cucoUsed.player).toBe(true);
    const twice = play({ ...after, turn: 'tioZe', hands: { ...after.hands, tioZe: [t(1, 4)] } }, '1-4', 'right', 'tioZe');
    expect(twice.roundResult?.winner).toBe('tioZe');
  });

  it('Vela Preta: batida com [0|0] ou [6|6] dá 4; você senta com, no máximo, o máximo −1', () => {
    const s = table({ player: [t(6, 6)], board: boardOf(t(4, 6)), relics: ['velaPreta'], hearts: { tioZe: 5 } });
    expect(play(s, '6-6', 'right').roundResult.damage).toBe(4);
    const calice = table({ player: [t(6, 6)], board: boardOf(t(4, 6)), relics: ['velaPreta', 'caliceGalo'], hearts: { tioZe: 9 } });
    expect(play(calice, '6-6', 'right').roundResult.damage).toBe(5); // não soma
    const run = act(createInitialState(), 'START_DUEL', { deck: FULL_SET.slice(), relics: ['velaPreta'] });
    expect(run.hearts.player).toBe(run.maxHearts.player - 1);
  });
});

describe('Versão 1.4: pedras de grife', () => {
  it('Âmbar: trava a ponta para o rival na vez dele e para você na sua seguinte', () => {
    const s = table({ player: [t(4, 5), t(0, 1)], tioZe: [t(5, 6), t(0, 3), t(2, 3)], boneyard: [t(6, 6)] });
    const amber = { ...s, hands: { ...s.hands, player: [{ id: '4-5', a: 4, b: 5, enhancement: 'ambar' }, t(0, 1)] } };
    let after = play(amber, '4-5', 'right'); // pontas 3 e 5
    expect(after.fx.frozen.tioZe).toContain('right');
    expect(after.fx.frozen.player).toEqual([]);
    expect(act(after, 'PLAY', { actor: 'tioZe', tileId: '5-6', side: 'right' })).toBe(after);
    after = play(after, '2-3', 'left', 'tioZe'); // a vez dele acaba: agora trava para você
    expect(after.fx.frozen.player).toContain('right');
    expect(after.fx.frozen.tioZe).toEqual([]);
    expect(rulesFor(after, 'player').frozenSides).toContain('right');
  });

  it('Obsidiana: vale −5 na tranca (na mão, ou na mesa se foi você quem jogou)', () => {
    const stone = { id: '6-6', a: 6, b: 6, enhancement: 'obsidiana' };
    const s = table({ player: [stone, t(0, 1)], tioZe: [t(2, 3)] });
    expect(trancaTileValues(s).player(stone)).toBe(-5);
    expect(act(s, 'DEV', { op: 'forceTranca' }).roundResult).toMatchObject({ winner: 'player' });
    const onBoard = { ...s, hands: { ...s.hands, player: [t(1, 2)] }, board: placeTile(createEmptyBoard(), stone, 'root', {}, { by: 'player' }) };
    expect(trancaSumOffsets(onBoard).player).toBe(-5);
  });
});

describe('Versão 1.4: regras dos rivais novos', () => {
  it('Juvenal Cobrador: com mais de $15, o passe voluntário custa $2 a mais', () => {
    const s = table({ player: [t(3, 5)], boneyard: [t(0, 0)], rivalId: 'juvenal', coins: { player: 16 } });
    expect(passFeeFor(s)).toBe(5);
    expect(passFeeFor({ ...s, coins: { ...s.coins, player: 15 } })).toBe(3);
  });

  it('Zeca Charreteiro: abre toda rodada com a bucha mais alta dele', () => {
    const mine = [t(6, 6), t(0, 1), t(0, 2), t(0, 3), t(0, 4), t(0, 5), t(0, 6)];
    const his = [t(3, 3), t(1, 1), t(1, 2), t(1, 3), t(1, 4), t(1, 5), t(1, 6)];
    const deck = [...mine, ...his, ...FULL_SET.filter((x) => ![...mine, ...his].some((y) => y.id === x.id))];
    const s = act(createInitialState(), 'START_DUEL', { deck, rivalId: 'zeca' });
    expect(s.turn).toBe('tioZe');
    expect(s.openingTileId).toBe('3-3');
  });

  it('Marquinhos da Van: o seu múltiplo de 5 paga $1 a menos', () => {
    const s = table({ player: [t(1, 3), t(0, 0)], rivalId: 'marquinhos', coins: { player: 0 } });
    expect(play(s, '1-3', 'left').coins.player).toBe(2); // pontas 1 e 4
    expect(play({ ...s, rivalId: 'tioZe' }, '1-3', 'left').coins.player).toBe(3);
  });

  it('Nelsinho 71: as buchas dele valem 1 a menos na tranca', () => {
    const s = table({ player: [t(0, 1)], tioZe: [t(5, 5)], rivalId: 'nelsinho' });
    expect(trancaTileValues(s).tioZe(t(5, 5))).toBe(9);
    expect(trancaTileValues(s).tioZe(t(2, 5))).toBe(7);
  });

  it('Genésio da Rifa: o número da rodada cobra $1 por pedra sua com ele, até $3', () => {
    const start = act(createInitialState(), 'START_DUEL', { deck: FULL_SET.slice(), rivalId: 'genesio', seed: 5 });
    expect(start.fx.raffle.number).toBeGreaterThanOrEqual(0);
    expect(start.fx.raffle.number).toBeLessThanOrEqual(6);
    expect(lastOf(start, 'raffle').number).toBe(start.fx.raffle.number);
    let s = table({ player: [t(3, 5), t(3, 6), t(0, 0)], board: boardOf(t(3, 3)), rivalId: 'genesio', coins: { player: 10 } });
    s = { ...s, fx: { ...s.fx, raffle: { number: 3, taken: 0 } } };
    s = { ...play(s, '3-5', 'left'), turn: 'player' }; // pontas 5 e 3
    expect(s.coins.player).toBe(9);
    s = { ...play(s, '3-6', 'right'), turn: 'player' }; // pontas 5 e 6
    expect(s.coins.player).toBe(8);
    const capped = table({ player: [t(3, 5), t(0, 0)], board: boardOf(t(3, 3)), rivalId: 'genesio', coins: { player: 10 } });
    expect(play({ ...capped, fx: { ...capped.fx, raffle: { number: 3, taken: 3 } } }, '3-5', 'left').coins.player).toBe(10);
    expect(play({ ...capped, fx: { ...capped.fx, raffle: { number: 1, taken: 0 } } }, '3-5', 'left').coins.player).toBe(10);
  });

  it('Dama Soró: pedra comum custa $1 (até $4), bucha e grife são grátis, com $0 sai de graça', () => {
    const s = table({ player: [t(0, 3), t(4, 4), t(0, 5)], rivalId: 'soro', coins: { player: 5 } });
    expect(play(s, '0-3', 'left').coins.player).toBe(4);
    expect(play(s, '4-4', 'right').coins.player).toBe(5);
    expect(play({ ...s, coins: { ...s.coins, player: 0 } }, '0-3', 'left').coins.player).toBe(0);
    const gold = { ...s, hands: { ...s.hands, player: [{ id: '0-3', a: 0, b: 3, enhancement: 'ouro' }, t(4, 4)] } };
    expect(play(gold, '0-3', 'left').coins.player).toBe(5 + 4); // grife não paga (e o Ouro rende)
    expect(play({ ...s, fx: { ...s.fx, luxury: 4 } }, '0-3', 'left').coins.player).toBe(5);
  });

  it('Sargento Brandão: com pedra que encaixa, não dá para passar', () => {
    const s = table({ player: [t(3, 5)], boneyard: [t(0, 0)], rivalId: 'brandao', coins: { player: 9 } });
    expect(passAvailabilityFor(s)).toMatchObject({ allowed: false, reason: 'mustPlay' });
    const stuck = { ...s, hands: { ...s.hands, player: [t(0, 0)] }, drawsThisTurn: 1 };
    expect(passAvailabilityFor(stuck).allowed).toBe(true);
  });

  it('Valtinho Renegado: desliga 1 talismã seu a partida inteira', () => {
    const s = act(createInitialState(), 'START_DUEL', { deck: FULL_SET.slice(), rivalId: 'valtinhoRenegado', relics: ['caneca', 'cinzeiro', 'giz'] });
    const stolen = s.matchFx.stolen.player;
    expect(['caneca', 'cinzeiro', 'giz']).toContain(stolen);
    expect(hasRelic(s, 'player', stolen)).toBe(false);
    expect(relicsOf(s, 'player')).toHaveLength(2);
    expect(spentRelicsOf(s, 'player')).toContain(stolen);
    expect(s.relics.player).toHaveLength(3); // continua na hotbar
  });

  it('Dona Odete: a cada 4 vezes suas sem múltiplo de 5, ela leva $3; sem dinheiro, 1♥ (nunca o último)', () => {
    let s = table({ player: [t(0, 1), t(1, 2), t(2, 3), t(3, 5), t(4, 4)], tioZe: [t(6, 6)], board: boardOf(t(0, 6)), boneyard: [t(5, 5)], rivalId: 'odete', coins: { player: 10 } });
    s = { ...s, fx: { ...s.fx, interest: { turns: 0, scored: false, bled: false } } };
    // pontas somando 7, 8, 9 e 11: nenhum múltiplo de 5
    for (const id of ['0-1', '1-2', '2-3']) s = { ...play(s, id, 'left'), turn: 'player' };
    expect(s.coins.player).toBe(10);
    s = { ...play(s, '3-5', 'left'), turn: 'player' };
    expect(s.coins.player).toBe(7);
    expect(s.fx.interest.turns).toBe(0);
    let broke = { ...s, coins: { ...s.coins, player: 0 }, hearts: { ...s.hearts, player: 3 }, fx: { ...s.fx, interest: { turns: 3, scored: false, bled: false } }, hands: { ...s.hands, player: [t(0, 0), t(1, 1)] }, board: boardOf(t(0, 6)) };
    broke = play(broke, '0-0', 'left');
    expect(broke.hearts.player).toBe(2);
    const last = { ...broke, turn: 'player', hearts: { ...broke.hearts, player: 1 }, fx: { ...broke.fx, interest: { turns: 3, scored: false, bled: false } }, hands: { ...broke.hands, player: [t(0, 3), t(1, 1)] } };
    expect(play(last, '0-3', 'left').hearts.player).toBe(1);
  });
});

describe('Versão 1.4: conquistas', () => {
  let saved;
  beforeEach(() => {
    saved = globalThis.localStorage;
    const store = new Map();
    globalThis.localStorage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
    };
    resetAchievements();
  });
  afterEach(() => {
    globalThis.localStorage = saved;
  });

  const state = { seed: 1, relics: { player: [] }, stats: { coinsEarned: 0 } };
  const ev = (type, extra = {}) => ({ type, ...extra });

  it('Por um Fio: empate de tranca libera a Trena de Pedreiro', () => {
    trackAchievements([ev('duelStart'), ev('roundStart'), ev('roundEnd', { result: { kind: 'tranca', winner: null, sums: { player: 7, tioZe: 7 } }, hearts: { player: 5 } })], state);
    expect(isAchievementUnlocked('por_um_fio')).toBe(true);
  });

  it('Mão Pesada soma as rodadas pesadas; Calor da Fornalha conta os passes do rival na partida', () => {
    trackAchievements([ev('duelStart'), ev('roundStart', { handSum: 46 }), ev('roundStart', { handSum: 30 }), ev('roundStart', { handSum: 50 })], state);
    expect(isAchievementUnlocked('mao_pesada')).toBe(false);
    trackAchievements([ev('roundStart', { handSum: 48 })], state);
    expect(isAchievementUnlocked('mao_pesada')).toBe(true);
    trackAchievements([ev('pass', { by: 'tioZe' }), ev('pass', { by: 'tioZe' }), ev('pass', { by: 'tioZe' })], state);
    expect(isAchievementUnlocked('calor_fornalha')).toBe(false);
    trackAchievements([ev('pass', { by: 'tioZe' })], state);
    expect(isAchievementUnlocked('calor_fornalha')).toBe(true);
  });

  it('Tétano de Mesa e Petisco de Balcão saem na batida certa', () => {
    trackAchievements([ev('duelStart'), ev('roundStart'), ev('tilePlaced', { by: 'player', tileId: '1-2' }), ev('roundEnd', { result: { kind: 'normal', winner: 'player', reason: 'batida', lastTileId: '0-0' }, hearts: { player: 5 } })], state);
    expect(isAchievementUnlocked('tetano_mesa')).toBe(true);
    expect(isAchievementUnlocked('petisco_balcao')).toBe(true);
  });

  it('Hora Morta: partida da Região 3 vencida sem perder coração (a Vela Preta não conta)', () => {
    trackAchievements([ev('duelStart'), ev('heartLost', { who: 'player', reason: 'velaPreta' }), ev('duelEnd', { winner: 'player', region: 3, mode: 'normal' })], state);
    expect(isAchievementUnlocked('hora_morta')).toBe(true);
  });
});
