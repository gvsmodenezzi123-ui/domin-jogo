import { describe, expect, it } from 'vitest';
import { buildTioZeView, decideTioZeAction } from '../../ai/tioZeAI.js';
import { ENCOUNTER_IDS } from '../../data/encounters.js';
import { TABLE_MODIFIER_IDS } from '../../data/tableModifiers.js';
import { playerMaxHearts } from '../../data/difficulty.js';
import { MAP_VERSION, availableNodes, campaignOf, generateCampaign } from '../campaignMap.js';
import { FULL_SET, createSeededRng, getPlacement, shuffle } from '../dominoLogic.js';
import { encounterOptionBlock, encounterRoll } from '../encounters.js';
import { createInitialState, gameReducer } from '../gameReducer.js';
import { drawAvailabilityFor, passFeeFor, rulesFor } from '../powers.js';
import { isValidSave, snapshotRun } from '../save.js';

const act = (state, type, extra = {}) => gameReducer(state, { type, ...extra });
const tile = (a, b, extra = {}) => ({ id: `${Math.min(a, b)}-${Math.max(a, b)}`, a, b, ...extra });

/** Mesa com uma pedra na raiz [left|right] e nada nos ramos. */
const rootBoard = (left, right) => ({ root: { id: `${Math.min(left, right)}-${Math.max(left, right)}`, a: left, b: right, left, right, seq: 0 }, left: [], right: [] });

/** Uma partida de verdade (IA dos dois lados) até alguém vencer o nó: não pode travar. */
function playDuel(seed, tableMod, rivalId = 'tioZe') {
  const rng = createSeededRng(seed);
  let s = act(createInitialState(), 'START_DUEL', { seed, deck: shuffle(FULL_SET, rng), tableMod, rivalId });
  for (let step = 0; step < 4000; step += 1) {
    if (s.phase === 'matchWon' || s.phase === 'gameOver' || s.phase === 'runWon') return { state: s, step };
    let next;
    if (s.phase === 'roundOver') next = act(s, 'NEXT_ROUND', { deck: shuffle(FULL_SET, rng) });
    else if (s.pending?.type === 'drawChoice') next = act(s, 'DRAW_PICK', { tileId: s.pending.options[0].id });
    else if (s.pending?.type === 'discard') next = act(s, 'SKIP_DISCARD');
    // a tela mostra "sem jogadas" e manda o passe forçado
    else if (s.pending?.type === 'forcedPass') next = act(s, 'PASS', { actor: 'player' });
    else if (s.turn === 'tioZe') next = act(s, 'TIO_ZE_ACT');
    else next = gameReducer(s, decideTioZeAction(buildTioZeView(s, 'player')));
    if (next === s) throw new Error(`travou: ${tableMod} semente ${seed} passo ${step} fase ${s.phase} vez ${s.turn} pendente ${s.pending?.type}`);
    s = next;
    if (s.phase === 'playing') {
      const ids = [
        ...s.hands.player,
        ...s.hands.tioZe,
        ...s.boneyard,
        ...(s.board.root ? [s.board.root, ...s.board.left, ...s.board.right] : []),
        ...(s.pending?.options ?? []),
      ].map((t) => t.id.split('#')[0]);
      expect(new Set(ids).size).toBe(28);
    }
  }
  throw new Error(`a partida não acabou: ${tableMod} semente ${seed}`);
}

describe('Patch 0.9.4: teia v2 (eventos [?] e regras de mesa)', () => {
  it('runs novas usam a teia v2; a v1 continua igual para os saves antigos', () => {
    const run = act(createInitialState(), 'NEW_RUN', { seed: 42 });
    expect(run.run.map).toBe(MAP_VERSION);
    expect(campaignOf(run).version).toBe(MAP_VERSION);
    const old = act(createInitialState(), 'NEW_RUN', { seed: 42, map: 1 });
    expect(campaignOf(old).version).toBe(1);
    expect([...campaignOf(old).byId.values()].some((n) => n.type === 'event' || n.mod)).toBe(false);
  });

  it('cada região tem 1 ou 2 eventos nos andares 2–5, e loja, beco e Seu Tião uma vez cada', () => {
    let twos = 0;
    for (let seed = 1; seed <= 150; seed += 1) {
      const campaign = generateCampaign(seed, MAP_VERSION);
      expect(JSON.stringify(campaign.regions)).toBe(JSON.stringify(generateCampaign(seed, MAP_VERSION).regions));
      for (const region of campaign.regions) {
        const middle = region.nodes.filter((n) => n.floor >= 2 && n.floor <= 5);
        const events = middle.filter((n) => n.type === 'event');
        expect(events.length >= 1 && events.length <= 2).toBe(true);
        if (events.length === 2) twos += 1;
        if (region.id === 1) expect(events.length).toBe(1);
        for (const n of events) expect(ENCOUNTER_IDS).toContain(n.encounter);
        for (const kind of ['shop', 'black', 'coins']) expect(middle.filter((n) => n.type === kind)).toHaveLength(1);
        expect(middle.filter((n) => n.type === 'combat')).toHaveLength(3);
        expect(region.nodes.filter((n) => n.type === 'event' && (n.floor < 2 || n.floor > 5))).toHaveLength(0);
      }
    }
    expect(twos).toBeGreaterThan(60);
  });

  it('regras de mesa só em mesas comuns (nunca na 1ª da run nem em chefe), ~40% delas', () => {
    let eligible = 0;
    let withMod = 0;
    const seen = new Set();
    for (let seed = 1; seed <= 200; seed += 1) {
      for (const node of generateCampaign(seed, MAP_VERSION).byId.values()) {
        if (node.mod) {
          expect(node.type).toBe('combat');
          expect(TABLE_MODIFIER_IDS).toContain(node.mod);
          seen.add(node.mod);
        }
        if (node.region === 1 && node.floor === 1) expect(node.mod).toBe(undefined);
        if (node.type === 'combat' && !(node.region === 1 && node.floor === 1)) {
          eligible += 1;
          if (node.mod) withMod += 1;
        }
      }
    }
    expect(seen.size).toBe(5);
    expect(withMod / eligible).toBeGreaterThan(0.33);
    expect(withMod / eligible).toBeLessThan(0.47);
  });

  it('save v5 guarda a teia e as cicatrizes; save v4 (sem `map`) volta na teia de antes', () => {
    const s = act(createInitialState(), 'NEW_RUN', { seed: 9 });
    const save = snapshotRun({ ...s, run: { ...s.run, scars: 1 } }, 'map', 1);
    expect(save).toMatchObject({ v: 5, map: MAP_VERSION, scars: 1 });
    expect(isValidSave(save)).toBe(true);
    const loaded = act(createInitialState(), 'LOAD_RUN', { save });
    expect(loaded.run.map).toBe(MAP_VERSION);
    expect(loaded.run.scars).toBe(1);
    expect(playerMaxHearts(loaded)).toBe(4);
    expect(loaded.maxHearts.player).toBe(4);
    const old = { ...snapshotRun(act(createInitialState(), 'NEW_RUN', { seed: 9, map: 1 }), 'map', 1), v: 4 };
    delete old.map;
    delete old.scars;
    expect(isValidSave(old)).toBe(true);
    expect(campaignOf(act(createInitialState(), 'LOAD_RUN', { save: old })).version).toBe(1);
    expect(isValidSave({ ...save, map: 7 })).toBe(false);
    expect(isValidSave({ ...save, scars: -1 })).toBe(false);
  });
});

describe('Patch 0.9.4: regras de mesa no motor', () => {
  const duel = (tableMod, seed = 3) => act(createInitialState(), 'START_DUEL', { seed, deck: shuffle(FULL_SET, createSeededRng(seed)), tableMod });

  it('a regra entra na partida e é anunciada; o mapa limpa a regra', () => {
    const s = duel('fumacaDensa');
    expect(s.tableMod).toBe('fumacaDensa');
    expect(s.events.some((e) => e.type === 'proc' && e.source === 'table' && /FUMAÇA DENSA/.test(e.text))).toBe(true);
    expect(duel(null).tableMod).toBe(null);
  });

  it('Fumaça Densa: a compra paga em moedas custa $4', () => {
    const s = { ...duel('fumacaDensa'), drawsThisTurn: 1, coins: { player: 10, tioZe: 10 } };
    expect(drawAvailabilityFor(s, 'player').cost).toEqual({ type: 'coins', amount: 4 });
    expect(drawAvailabilityFor({ ...s, tableMod: null }, 'player').cost).toEqual({ type: 'coins', amount: 3 });
    expect(drawAvailabilityFor({ ...s, coins: { player: 3, tioZe: 0 } }, 'player')).toMatchObject({ allowed: false, reason: 'coins' });
  });

  it('Aposta Alta: passe voluntário $5 e a 1ª batida da partida em dobro (só a 1ª)', () => {
    const s = duel('apostaAlta');
    expect(passFeeFor(s, 'player')).toBe(5);
    expect(passFeeFor({ ...s, tableMod: null }, 'player')).toBe(3);
    // batida simples com a última pedra: 1 → 2
    const win = (state) => {
      const ready = {
        ...state,
        phase: 'playing',
        turn: 'player',
        pending: null,
        board: rootBoard(3, 4),
        hands: { player: [tile(4, 6)], tioZe: [tile(0, 1), tile(2, 2)] },
        hearts: { player: 5, tioZe: 5 },
      };
      return act(ready, 'PLAY', { actor: 'player', tileId: '4-6', side: 'right' });
    };
    const first = win(s);
    expect(first.roundResult).toMatchObject({ kind: 'normal', damage: 2, baseDamage: 2 });
    expect(first.matchFx.stakesUsed).toBe(true);
    const second = win({ ...first, phase: 'playing' });
    expect(second.roundResult.damage).toBe(1);
    expect(win({ ...s, tableMod: null }).roundResult.damage).toBe(1);
  });

  it('Rádio Ligado: múltiplo de 5 paga $5 e a batida de bucha vale como simples', () => {
    const s = duel('radioLigado');
    const ready = { ...s, phase: 'playing', turn: 'player', pending: null, board: rootBoard(3, 4), hands: { player: [tile(4, 6), tile(1, 1)], tioZe: [tile(0, 2)] }, coins: { player: 0, tioZe: 0 } };
    // 3 + 6 = 9: nada; 4|1 na esquerda? usa [4|6] na direita e depois a soma 3+6
    const played = act({ ...ready, board: rootBoard(4, 1) }, 'PLAY', { actor: 'player', tileId: '4-6', side: 'left' });
    // pontas: 6 (esquerda) e 1? não: a raiz [4|1] tem esquerda 4; [4|6] entra pela esquerda → ponta 6; 6 + 1 = 7
    expect(played.coins.player).toBe(0);
    const five = act({ ...ready, board: rootBoard(4, 4) }, 'PLAY', { actor: 'player', tileId: '4-6', side: 'left' });
    // 6 + 4 = 10 → múltiplo de 5 com o rádio: $5
    expect(five.events.filter((e) => e.type === 'bonus5').at(-1)).toMatchObject({ amount: 5 });
    expect(five.coins.player).toBe(5);
    // batida de bucha: 2 → 1
    const bucha = act({ ...ready, board: rootBoard(1, 5), hands: { player: [tile(1, 1)], tioZe: [tile(0, 2)] } }, 'PLAY', { actor: 'player', tileId: '1-1', side: 'left' });
    expect(bucha.roundResult).toMatchObject({ kind: 'bucha', damage: 1, baseDamage: 1 });
  });

  it('Mesa Úmida: a 1ª pedra sua da rodada soma +1 no múltiplo de 5 (só a 1ª, só a sua)', () => {
    const s = duel('mesaUmida');
    const ready = { ...s, phase: 'playing', turn: 'player', pending: null, fx: { ...s.fx, wetUsed: false }, coins: { player: 0, tioZe: 0 } };
    // raiz [2|3]: [3|6] na direita deixa 2 + 6 = 8; com +1 = 9 (nada). [2|6] na esquerda: 6 + 3 = 9 → +1 = 10!
    const wet = act({ ...ready, board: rootBoard(2, 3), hands: { player: [tile(2, 6), tile(0, 0)], tioZe: [tile(1, 1)] } }, 'PLAY', { actor: 'player', tileId: '2-6', side: 'left' });
    expect(wet.events.filter((e) => e.type === 'bonus5').at(-1)).toMatchObject({ by: 'player', wet: true, sum: 10, amount: 3 });
    expect(wet.coins.player).toBe(3);
    expect(wet.fx.wetUsed).toBe(true);
    // 2ª pedra da rodada: sem o +1
    const again = act({ ...wet, turn: 'player', board: rootBoard(2, 3), hands: { player: [tile(2, 6), tile(0, 0)], tioZe: [tile(1, 1)] } }, 'PLAY', { actor: 'player', tileId: '2-6', side: 'left' });
    expect(again.coins.player).toBe(3);
    // múltiplo de verdade continua valendo na 1ª pedra (o +1 nunca atrapalha)
    const plain = act({ ...ready, board: rootBoard(4, 3), hands: { player: [tile(3, 6), tile(0, 0)], tioZe: [tile(1, 1)] } }, 'PLAY', { actor: 'player', tileId: '3-6', side: 'right' });
    expect(plain.coins.player).toBe(3);
    expect(plain.events.filter((e) => e.type === 'bonus5').at(-1).wet).toBe(false);
  });

  it('Mesa Desnivelada: 1ª pedra da esquerda deixa par, da direita ímpar; depois, normal', () => {
    const rules = rulesFor({ ...duel('mesaDesnivelada') }, 'player');
    expect(rules.tilted).toBe(true);
    const board = rootBoard(3, 3);
    // [3|4] deixa 4 (par): esquerda sim, direita não
    expect(getPlacement(tile(3, 4), board, 'left', rules)).toMatchObject({ outer: 4 });
    expect(getPlacement(tile(3, 4), board, 'right', rules)).toBe(null);
    // [3|5] deixa 5 (ímpar): direita sim, esquerda não
    expect(getPlacement(tile(3, 5), board, 'right', rules)).toMatchObject({ outer: 5 });
    expect(getPlacement(tile(3, 5), board, 'left', rules)).toBe(null);
    // com a ponta já aberta, vale tudo
    const opened = { ...board, left: [{ id: '3-4', a: 3, b: 4, inner: 3, outer: 4, seq: 1 }] };
    expect(getPlacement(tile(4, 1), opened, 'left', rules)).toMatchObject({ outer: 1 });
    // curinga escolhe o giro que respeita a paridade
    const wild = { ...rules, wildSides: ['left'] };
    expect(getPlacement(tile(1, 2), board, 'left', wild)).toMatchObject({ outer: 2, via: 'wild' });
    expect(getPlacement(tile(1, 3), board, 'left', wild)).toBe(null);
  });

  it('com cada regra, 40 partidas IA x IA terminam sem travar nem perder pedra', () => {
    for (const mod of TABLE_MODIFIER_IDS) {
      let rounds = 0;
      for (let seed = 1; seed <= 40; seed += 1) {
        const { state } = playDuel(seed * 7 + mod.length, mod, seed % 3 === 0 ? 'neide' : 'tioZe');
        rounds += state.round;
      }
      expect(rounds).toBeGreaterThan(40);
    }
  });
});

describe('Patch 0.9.4: eventos de dilema', () => {
  /** Run v2 parada no nó de evento (`encounter` força o dilema). */
  function atEvent(encounter, extra = {}) {
    let seed = 1;
    let campaign = generateCampaign(seed, MAP_VERSION);
    while (![...campaign.byId.values()].some((n) => n.type === 'event' && n.region === 1)) {
      seed += 1;
      campaign = generateCampaign(seed, MAP_VERSION);
    }
    const s = { ...act(createInitialState(), 'NEW_RUN', { seed, relics: ['caneca', 'giz'] }), ...extra };
    return gameReducer(s, { type: 'DEV', op: 'openStop', kind: 'event', encounter });
  }

  it('abre o modal do dilema, escolher marca o nó feito e sair volta ao mapa', () => {
    const s = atEvent('esquina');
    expect(s.phase).toBe('encounter');
    expect(s.encounter).toMatchObject({ id: 'esquina', choice: null });
    expect(act(s, 'LEAVE_ENCOUNTER')).toBe(s); // sem escolher, não sai
    const chosen = act(s, 'ENCOUNTER_CHOOSE', { choice: 'b' });
    expect(chosen.encounter.choice).toBe('b');
    expect(chosen.run.cleared).toContain(s.encounter.node);
    expect(act(chosen, 'ENCOUNTER_CHOOSE', { choice: 'a' })).toBe(chosen); // não escolhe de novo
    const map = act(chosen, 'LEAVE_ENCOUNTER');
    expect(map.phase).toBe('map');
    expect(map.encounter).toBe(null);
    expect(availableNodes(map)).not.toContain(s.encounter.node);
  });

  it('Bêbado: a bucha [6|6] de Rubi entra no baralho e custa 1 coração máximo (até o fim da run)', () => {
    const s = atEvent('bebado');
    const max = playerMaxHearts(s);
    const after = act(s, 'ENCOUNTER_CHOOSE', { choice: 'a' });
    expect(after.decks.player['6-6']).toBe('rubi');
    expect(after.run.scars).toBe(1);
    expect(playerMaxHearts(after)).toBe(max - 1);
    expect(after.hearts.player).toBeLessThanOrEqual(max - 1);
    // Tudo ou Nada (1 coração): não tem sangue para dar
    const allIn = atEvent('bebado', { challenge: 'tudoOuNada', hearts: { player: 1, tioZe: 1 } });
    expect(encounterOptionBlock(allIn, 'bebado', 'a')).toBeTruthy();
    expect(act(allIn, 'ENCOUNTER_CHOOSE', { choice: 'a' })).toBe(allIn);
  });

  it('Batida Policial: propina de $5 (sem saldo, bloqueada) ou 40% de perder um talismã', () => {
    const rich = atEvent('policia', { coins: { player: 9, tioZe: 0 } });
    const paid = act(rich, 'ENCOUNTER_CHOOSE', { choice: 'a' });
    expect(paid.coins.player).toBe(4);
    expect(paid.relics.player).toEqual(rich.relics.player);
    const broke = atEvent('policia', { coins: { player: 2, tioZe: 0 } });
    expect(act(broke, 'ENCOUNTER_CHOOSE', { choice: 'a' })).toBe(broke);
    const hid = act(rich, 'ENCOUNTER_CHOOSE', { choice: 'b' });
    const caught = encounterRoll(rich, rich.encounter.node, 'b') < 0.4;
    expect(hid.relics.player.length).toBe(rich.relics.player.length - (caught ? 1 : 0));
    expect(hid.encounter.outcome.tone).toBe(caught ? 'bad' : 'good');
  });

  it('Aposta de Esquina: aposta $3; ganhando volta $7 (sorteio fixo pela semente)', () => {
    const s = atEvent('esquina', { coins: { player: 10, tioZe: 0 } });
    const a = act(s, 'ENCOUNTER_CHOOSE', { choice: 'a' });
    const won = encounterRoll(s, s.encounter.node, 'a') < 0.5;
    expect(a.coins.player).toBe(won ? 14 : 7);
    expect(act(s, 'ENCOUNTER_CHOOSE', { choice: 'a' }).coins.player).toBe(a.coins.player);
    expect(act(s, 'ENCOUNTER_CHOOSE', { choice: 'b' }).coins.player).toBe(10);
  });

  it('Engradado: +$4 e 30% de corte (1 coração, nunca o último)', () => {
    const s = atEvent('engradado', { coins: { player: 0, tioZe: 0 } });
    const a = act(s, 'ENCOUNTER_CHOOSE', { choice: 'a' });
    expect(a.coins.player).toBe(4);
    const cut = encounterRoll(s, s.encounter.node, 'a') < 0.3;
    expect(a.hearts.player).toBe(s.hearts.player - (cut ? 1 : 0));
    const last = atEvent('engradado', { hearts: { player: 1, tioZe: 1 } });
    expect(act(last, 'ENCOUNTER_CHOOSE', { choice: 'a' }).hearts.player).toBe(1);
  });

  it('as chances batem com o anunciado (2000 sorteios por evento)', () => {
    const s = atEvent('esquina');
    const rate = (enc, opt, cut) => {
      let hits = 0;
      for (let i = 0; i < 2000; i += 1) if (encounterRoll({ ...s, seed: i * 7919 }, `r1-f2-l${i % 3}`, opt) < cut) hits += 1;
      return hits / 2000;
    };
    expect(Math.abs(rate('policia', 'b', 0.4) - 0.4)).toBeLessThan(0.05);
    expect(Math.abs(rate('esquina', 'a', 0.5) - 0.5)).toBeLessThan(0.05);
    expect(Math.abs(rate('engradado', 'a', 0.3) - 0.3)).toBeLessThan(0.05);
  });

  it('save no meio do evento: antes de escolher, o CONTINUAR reabre o mesmo dilema', () => {
    const s = atEvent('policia');
    const save = snapshotRun(s, 'map', 1);
    expect(isValidSave(save)).toBe(true);
    const loaded = act(createInitialState(), 'LOAD_RUN', { save });
    expect(availableNodes(loaded)).toEqual([s.encounter.node]);
    const chosen = snapshotRun(act(s, 'ENCOUNTER_CHOOSE', { choice: 'b' }), 'map', 1);
    expect(chosen.cleared).toContain(s.encounter.node);
  });
});
