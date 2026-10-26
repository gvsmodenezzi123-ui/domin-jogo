/**
 * Conquistas (Patch 0.7.0): 10 metas, cada uma libera um talismã para a Loja e o Mercado
 * Negro. Fica fora do reducer de propósito: a UI passa os eventos novos para
 * `trackAchievements(events, state)` e este módulo acompanha os contadores, grava no
 * aparelho e avisa com o evento global `buxaria-achievement`.
 *
 * O que fica no localStorage (sem o prefixo "buxaria:" nas chaves pedidas no patch):
 *   achievement_<id> = 'true'          a conquista saiu
 *   relic_unlocked_<relicId> = 'true'  o talismã dela já pode sair na loja/no beco
 *   buxaria:ach_tio_ze      vitórias sobre o Tio Zé (somando todas as runs)
 *   buxaria:ach_clears      campanhas vencidas nas Peças Brancas
 *   buxaria:ach_commons     talismãs comuns básicos que você já equipou
 *   buxaria:ach_shops       lojas onde você comprou nesta run ({ seed, nodes })
 * "Apagar tudo" não mexe nisso, igual às Peças Pretas. Sem storage, vale só na sessão.
 *
 * Patch 0.8.0: o mesmo acompanhamento libera as maletas do Balcão e os desafios
 * (engine/meta.js guarda): Bicheiro ($60 numa run), Borracharia (3 trancas vencidas),
 * Trapaceiro (4 talismãs numa run), Seca (chefe sem comprar do dorme); Só no Osso,
 * Mesa Bêbada e Tudo ou Nada ao zerar com a Clássica, o Bicheiro e as Peças Pretas.
 *
 * Versão 1.4: mais 18 conquistas, uma para cada talismã novo. As que somam guardam:
 *   buxaria:ach_heavy       rodadas começadas com mais de 45 pontos na mão (somando as runs)
 *   buxaria:ach_dark        partidas vencidas nas Peças Pretas ou Prateadas (somando as runs)
 *   buxaria:ach_run         contadores da run ({ seed, triple, survived }): turnos com 3 compras
 *                           e batidas do rival que deixaram você com 1 coração
 * O resto é de uma partida (ou rodada) só, acompanhado na sessão. As metas que falavam do Seu
 * Arlindo e do Beto Cigano valem para qualquer chefe das Regiões 1 e 2 (os chefes são sorteados).
 */

import { BASIC_COMMON_IDS, RELICS } from '../data/relics.js';
import {
  addGoldCaps,
  addRunRelic,
  addTrancaWin,
  completeChallenge,
  isBlackTilesUnlocked,
  resetRunRelics,
  unlockChallenge,
  unlockMaleta,
} from './meta.js';
import { ACHIEVEMENT_EVENT, announce, readJson, readRaw, writeJson, writeRaw } from './storage.js';

export { ACHIEVEMENT_EVENT };

// ---------------------------------------------------------------------------
// As 10 conquistas
// ---------------------------------------------------------------------------

const list = [
  {
    id: 'fregues_ze',
    title: 'Freguês do Zé',
    relic: 'moedaFurada',
    goal: 'Derrote o Tio Zé 2 vezes na campanha.',
    check: (ctx) => (ctx.tio_ze_defeats ?? 0) >= 2,
  },
  {
    id: 'boca_balcao',
    title: 'Boca de Balcão',
    relic: 'tampaGarrafa',
    goal: 'Compre ao menos 1 item na Loja em 3 nós diferentes na mesma run.',
    check: (ctx) => (ctx.unique_shops_visited_in_run ?? 0) >= 3,
  },
  {
    id: 'limite_sangue',
    title: 'No Limite do Sangue',
    relic: 'fosforo',
    goal: 'Compre a 3ª pedra do dorme (pagando vida) e jogue-a na mesa no mesmo turno.',
    check: (ctx) => ctx.bought_third_tile_and_played === true,
  },
  {
    id: 'malandragem_truco',
    title: 'Malandragem de Truco',
    relic: 'trucoMarcado',
    goal: 'Feche pontas em Múltiplo de 5 três vezes em uma única partida.',
    check: (ctx) => (ctx.muggins_in_single_match ?? 0) >= 3,
  },
  {
    id: 'cirurgia_tranca',
    title: 'Cirurgia de Tranca',
    relic: 'abridorLata',
    goal: 'Vença por Tranca (jogo fechado) tendo apenas 1 pedra na mão.',
    check: (ctx) => ctx.locked_win_with_one_tile === true,
  },
  {
    id: 'colecionador',
    title: 'Colecionador de Esquina',
    relic: 'notaTres',
    goal: 'Equipe 6 Talismãs Comuns básicos diferentes ao longo das suas runs.',
    check: (ctx) => sizeOf(ctx.used_common_relics_set) >= 6,
  },
  {
    id: 'milagre_boteco',
    title: 'Milagre de Boteco',
    relic: 'fitaCrepe',
    goal: 'Bata a rodada com uma Carroça/Bucha estando com apenas 1 Coração de Vida.',
    check: (ctx) => ctx.double_win_with_one_life === true,
  },
  {
    id: 'rei_sinuca',
    title: 'Rei da Sinuca Branca',
    relic: 'balancaAcougue',
    goal: 'Vença a campanha no Modo Normal 2 vezes.',
    check: (ctx) => (ctx.normal_mode_clears ?? 0) >= 2,
  },
  {
    id: 'mesa_limpa',
    title: 'Mesa Limpa',
    relic: 'caliceGalo',
    goal: 'Derrote o Chefe da Região 1 ou 2 sem sofrer nenhum dano na partida.',
    check: (ctx) => ctx.flawless_boss_win === true,
  },
  {
    id: 'mao_fechada',
    title: 'Mão Fechada',
    relic: 'dadoOsso',
    goal: 'Vença uma partida inteira sem comprar nenhuma pedra do monte (dorme).',
    check: (ctx) => ctx.won_match_with_zero_draws === true,
  },
  // ---------------------------------------------------------------------------
  // Versão 1.4
  // ---------------------------------------------------------------------------
  {
    id: 'petisco_balcao',
    title: 'Petisco de Balcão',
    relic: 'pires',
    goal: 'Bata uma rodada sem ter jogado nenhuma pedra com 6 nela.',
    check: (ctx) => ctx.batida_without_six === true,
  },
  {
    id: 'corte_fino',
    title: 'Corte Fino',
    relic: 'gilete',
    goal: 'Jogue 3 buchas em pontas ímpares ([1|1], [3|3] ou [5|5]) na mesma partida.',
    check: (ctx) => (ctx.odd_doubles_in_match ?? 0) >= 3,
  },
  {
    id: 'azia_beco',
    title: 'Azia de Beco',
    relic: 'bicarbonato',
    goal: 'Compre 3 pedras do dorme no mesmo turno, em 3 turnos da mesma run.',
    check: (ctx) => (ctx.triple_draw_turns_in_run ?? 0) >= 3,
  },
  {
    id: 'pano_furado',
    title: 'Pano Furado',
    relic: 'cofrinho',
    goal: 'Sofra 2 múltiplos de 5 do rival na mesma rodada e vença a partida.',
    check: (ctx) => ctx.won_after_two_rival_fives === true,
  },
  {
    id: 'tetano_mesa',
    title: 'Tétano de Mesa',
    relic: 'prego',
    goal: 'Bata a rodada com o [0|0] como última pedra.',
    check: (ctx) => ctx.batida_with_zero_double === true,
  },
  {
    id: 'gazuada',
    title: 'Gazuada',
    relic: 'grampo',
    goal: 'Passe a vez de propósito (podendo jogar) 3 vezes na mesma partida e vença.',
    check: (ctx) => (ctx.strategic_passes_in_won_match ?? 0) >= 3,
  },
  {
    id: 'fritura_pesada',
    title: 'Fritura Pesada',
    relic: 'espatula',
    goal: 'Vença uma tranca por exatamente 1 ponto de diferença.',
    check: (ctx) => ctx.tranca_margin === 1,
  },
  {
    id: 'tacada_torta',
    title: 'Tacada Torta',
    relic: 'taco',
    goal: 'Deixe as duas pontas com o mesmo número 4 vezes na mesma partida.',
    check: (ctx) => (ctx.equal_ends_in_match ?? 0) >= 4,
  },
  {
    id: 'engrenagem_cega',
    title: 'Engrenagem Cega',
    relic: 'oleo',
    goal: 'Compre uma bucha do dorme, jogue-a no mesmo turno e vença a rodada.',
    check: (ctx) => ctx.won_round_with_drawn_double === true,
  },
  {
    id: 'mao_pesada',
    title: 'Mão Pesada',
    relic: 'pacoteTremoco',
    goal: 'Comece 3 rodadas com mais de 45 pontos na mão (somando as runs).',
    check: (ctx) => (ctx.heavy_hands ?? 0) >= 3,
  },
  {
    id: 'azar_compartilhado',
    title: 'Azar Compartilhado',
    relic: 'peCoelho',
    goal: 'Sobreviva a 3 batidas do rival ficando com 1 coração, na mesma run.',
    check: (ctx) => (ctx.survived_at_one_in_run ?? 0) >= 3,
  },
  {
    id: 'acertei_quina',
    title: 'Acertei na Quina',
    relic: 'canetaLoterica',
    goal: 'Feche as pontas somando exatamente 10 três vezes na mesma partida.',
    check: (ctx) => (ctx.tens_in_match ?? 0) >= 3,
  },
  {
    id: 'olho_clinico',
    title: 'Olho Clínico',
    relic: 'lupa',
    goal: 'Vença 5 partidas nas Peças Pretas ou Prateadas (somando as runs).',
    check: (ctx) => (ctx.dark_mode_wins ?? 0) >= 5,
  },
  {
    id: 'por_um_fio',
    title: 'Por um Fio',
    relic: 'trena',
    goal: 'Empate uma tranca (as duas somas iguais).',
    check: (ctx) => ctx.tranca_tie === true,
  },
  {
    id: 'calor_fornalha',
    title: 'Calor da Fornalha',
    relic: 'chapaFogao',
    goal: 'Faça o rival passar a vez 4 vezes na mesma partida.',
    check: (ctx) => (ctx.rival_passes_in_match ?? 0) >= 4,
  },
  {
    id: 'porteira_fechada',
    title: 'Porteira Fechada',
    relic: 'cadeado',
    goal: 'Derrube um chefe com uma tranca (a rodada que zera ele termina trancada).',
    check: (ctx) => ctx.boss_finished_by_tranca === true,
  },
  {
    id: 'hora_morta',
    title: 'Hora Morta',
    relic: 'ampulheta',
    goal: 'Vença uma partida da Região 3 sem perder nenhum coração.',
    check: (ctx) => ctx.flawless_region3_win === true,
  },
  {
    id: 'despacho_meia_noite',
    title: 'Despacho da Meia-Noite',
    relic: 'velaPreta',
    goal: 'Derrube um rival batendo com [0|0] ou [6|6] estando com 1 coração.',
    check: (ctx) => ctx.finished_with_zero_or_six_double_at_one === true,
  },
];

function sizeOf(set) {
  if (!set) return 0;
  return set instanceof Set ? set.size : set.length;
}

export const ACHIEVEMENTS = Object.freeze(Object.fromEntries(list.map((a) => [a.id, Object.freeze(a)])));
export const ACHIEVEMENT_IDS = Object.freeze(list.map((a) => a.id));
/** Conquista que libera cada talismã: { moedaFurada: ACHIEVEMENTS.fregues_ze, ... } */
export const ACHIEVEMENT_BY_RELIC = Object.freeze(Object.fromEntries(list.map((a) => [a.relic, ACHIEVEMENTS[a.id]])));
/** Chefes de região que contam para a Mesa Limpa (versão 1.4: os sorteados das Regiões 1 e 2 também). */
const REGION_BOSSES = ['arlindo', 'beto', 'genesio', 'soro', 'brandao'];

const KEYS = {
  achievement: (id) => `achievement_${id}`,
  relic: (relicId) => `relic_unlocked_${relicId}`,
  tioZe: 'buxaria:ach_tio_ze',
  clears: 'buxaria:ach_clears',
  commons: 'buxaria:ach_commons',
  shops: 'buxaria:ach_shops',
  // versão 1.4
  heavy: 'buxaria:ach_heavy',
  dark: 'buxaria:ach_dark',
  run: 'buxaria:ach_run',
};

export const isAchievementUnlocked = (id) => readRaw(KEYS.achievement(id)) === 'true';

/** Ids das conquistas já feitas, na ordem do livro. */
export const loadUnlockedAchievements = () => ACHIEVEMENT_IDS.filter(isAchievementUnlocked);

/** Talismãs liberados por conquista (vão para `state.unlocks`). */
export const loadUnlockedRelics = () =>
  ACHIEVEMENT_IDS.map((id) => ACHIEVEMENTS[id].relic).filter((relicId) => readRaw(KEYS.relic(relicId)) === 'true');

/** Contadores para o livro (progresso das metas que somam). */
export function loadAchievementProgress() {
  return {
    tio_ze_defeats: readJson(KEYS.tioZe, 0),
    normal_mode_clears: normalClears(),
    used_common_relics: readJson(KEYS.commons, []),
    // versão 1.4
    heavy_hands: readJson(KEYS.heavy, 0),
    dark_mode_wins: readJson(KEYS.dark, 0),
  };
}

function normalClears() {
  const stored = readJson(KEYS.clears, null);
  if (Number.isFinite(stored)) return stored;
  // quem já zerou a campanha normal antes do 0.7.0 tem as Peças Pretas abertas: conta 1
  return isBlackTilesUnlocked() ? 1 : 0;
}

// ---------------------------------------------------------------------------
// Desbloqueio
// ---------------------------------------------------------------------------

function announceAchievement(achievement) {
  const relic = RELICS[achievement.relic];
  return announce({ id: achievement.id, kind: 'achievement', title: achievement.title, relicId: achievement.relic, relicName: relic?.name ?? achievement.relic, icon: relic?.art ?? achievement.relic });
}

/** Libera na marra (DEV ou quando a meta já foi conferida): grava, avisa e devolve o aviso. */
export function unlockAchievement(id) {
  const achievement = ACHIEVEMENTS[id];
  if (!achievement || isAchievementUnlocked(id)) return null;
  writeRaw(KEYS.achievement(id), 'true');
  writeRaw(KEYS.relic(achievement.relic), 'true');
  return announceAchievement(achievement);
}

/**
 * Confere uma meta com o contexto dado. Se ainda não saiu e o critério bate, grava
 * `achievement_<id>` e `relic_unlocked_<relicId>`, dispara `buxaria-achievement` e
 * devolve true. O talismã entra no sorteio da loja/beco pelo `UNLOCK_RELICS` do App.
 */
export function checkAchievement(achievementId, context = {}) {
  const achievement = ACHIEVEMENTS[achievementId];
  if (!achievement || isAchievementUnlocked(achievementId)) return false;
  if (!achievement.check(context)) return false;
  return unlockAchievement(achievementId) !== null;
}

/** DEV: apaga as conquistas, os talismãs liberados e os contadores. */
export function resetAchievements() {
  for (const id of ACHIEVEMENT_IDS) {
    writeRaw(KEYS.achievement(id), null);
    writeRaw(KEYS.relic(ACHIEVEMENTS[id].relic), null);
  }
  for (const key of [KEYS.tioZe, KEYS.clears, KEYS.commons, KEYS.shops, KEYS.heavy, KEYS.dark, KEYS.run]) writeRaw(key, null);
  session = freshSession();
}

// ---------------------------------------------------------------------------
// Acompanhamento pelos eventos do reducer
// ---------------------------------------------------------------------------

/** O que vale só para a partida em andamento (zera no duelStart). */
const freshMatch = () => ({ muggins: 0, draws: 0, hurt: false, oddDoubles: 0, strategic: 0, equalEnds: 0, tens: 0, rivalPasses: 0, rivalFivesTwice: false });

/** O que vale só para a rodada (zera no roundStart). */
const freshRound = () => ({ six: false, rivalFives: 0, drawnDouble: null, grease: false });

const freshSession = () => ({ match: null, heartTile: null, lastDouble: false, round: freshRound(), lastRound: null });

/** Os números de uma pedra pelo id ('3-6', '6-6#c1'). */
function pipsOf(tileId) {
  const [a, b] = String(tileId ?? '').split('#')[0].split('-').map(Number);
  return Number.isInteger(a) && Number.isInteger(b) ? { a, b } : null;
}

/** Versão 1.4: soma 1 num contador da run (zera quando a semente muda) e devolve o total. */
function bumpRunCounter(state, key) {
  const seed = state?.seed ?? null;
  const saved = readJson(KEYS.run, null);
  const counters = saved && saved.seed === seed ? saved : { seed };
  const total = (counters[key] ?? 0) + 1;
  writeJson(KEYS.run, { ...counters, seed, [key]: total });
  return total;
}

/** Soma 1 num contador do aparelho (somando as runs) e devolve o total. */
function bumpCounter(key) {
  const total = readJson(key, 0) + 1;
  writeJson(key, total);
  return total;
}

const check = (won, id, ctx) => {
  if (checkAchievement(id, ctx)) won.push(id);
};

let session = freshSession();

const seatOf = (ev) => ev.by ?? ev.who ?? null;

function trackCommons(state) {
  const owned = (state?.relics?.player ?? []).filter((id) => BASIC_COMMON_IDS.includes(id));
  if (!owned.length) return [];
  const used = readJson(KEYS.commons, []);
  const merged = [...new Set([...used, ...owned])];
  if (merged.length !== used.length) writeJson(KEYS.commons, merged);
  return checkAchievement('colecionador', { used_common_relics_set: new Set(merged) }) ? ['colecionador'] : [];
}

function trackShop(state) {
  const seed = state?.seed ?? null;
  const saved = readJson(KEYS.shops, null);
  const nodes = saved && saved.seed === seed ? saved.nodes : [];
  const node = state?.run?.node ?? 'avulsa';
  const next = nodes.includes(node) ? nodes : [...nodes, node];
  if (next !== nodes || !saved || saved.seed !== seed) writeJson(KEYS.shops, { seed, nodes: next });
  return checkAchievement('boca_balcao', { unique_shops_visited_in_run: next.length });
}

function onDuelEnd(ev, state) {
  const won = [];
  const match = session.match;
  session.match = null;
  if (ev.winner !== 'player') return won;
  // Tampinhas Douradas: vão para o aparelho na hora (nunca se perdem ao morrer)
  if (ev.caps > 0) addGoldCaps(ev.caps);
  // versão 1.4, Olho Clínico: partidas vencidas nas Peças Pretas ou Prateadas
  const winMode = ev.mode ?? state?.mode;
  if (winMode === 'hard' || winMode === 'inferno') check(won, 'olho_clinico', { dark_mode_wins: bumpCounter(KEYS.dark) });
  const rivalId = state?.rivalId ?? null;
  if (rivalId === 'tioZe') {
    const defeats = readJson(KEYS.tioZe, 0) + 1;
    writeJson(KEYS.tioZe, defeats);
    if (checkAchievement('fregues_ze', { tio_ze_defeats: defeats })) won.push('fregues_ze');
  }
  // zerar = derrotar o Comendador (com o boss secreto, o final convencional fica para depois)
  if (ev.finalBoss) {
    const mode = ev.mode ?? state?.mode;
    if (mode !== 'hard' && mode !== 'inferno') {
      const clears = normalClears() + 1;
      writeJson(KEYS.clears, clears);
      if (checkAchievement('rei_sinuca', { normal_mode_clears: clears })) won.push('rei_sinuca');
    }
    const maleta = state?.maleta ?? 'classica';
    if (maleta === 'classica') unlockChallenge('soNoOsso');
    if (maleta === 'bicheiro') unlockChallenge('mesaBebada');
    if (mode === 'hard' || mode === 'inferno') unlockChallenge('tudoOuNada');
    if (state?.challenge) completeChallenge(state.challenge);
  }
  if (!match) return won;
  if (ev.boss && REGION_BOSSES.includes(rivalId) && checkAchievement('mesa_limpa', { flawless_boss_win: !match.hurt })) won.push('mesa_limpa');
  if (checkAchievement('mao_fechada', { won_match_with_zero_draws: match.draws === 0 })) won.push('mao_fechada');
  // Maleta Seca: chefe vencido sem nenhuma compra do dorme
  if (ev.boss && match.draws === 0) unlockMaleta('seca');
  // versão 1.4
  const last = session.lastRound;
  if (match.rivalFivesTwice) check(won, 'pano_furado', { won_after_two_rival_fives: true });
  check(won, 'gazuada', { strategic_passes_in_won_match: match.strategic });
  if (ev.boss && last?.kind === 'tranca') check(won, 'porteira_fechada', { boss_finished_by_tranca: true });
  if ((ev.region ?? null) === 3) check(won, 'hora_morta', { flawless_region3_win: !match.hurt });
  if (last?.reason === 'batida' && last.heartsPlayer === 1) {
    const tile = pipsOf(last.lastTileId);
    if (tile && tile.a === tile.b && (tile.a === 0 || tile.a === 6)) check(won, 'despacho_meia_noite', { finished_with_zero_or_six_double_at_one: true });
  }
  return won;
}

function onRoundEnd(ev, state) {
  const won = [];
  const result = ev.result ?? {};
  const round = session.round;
  if (result.winner === 'player') {
    const handCount = ev.handCounts?.player;
    // Maleta da Borracharia: 3 rodadas vencidas por tranca, somando as runs
    if (result.kind === 'tranca' && addTrancaWin() >= 3) unlockMaleta('borracharia');
    if (result.kind === 'tranca' && checkAchievement('cirurgia_tranca', { locked_win_with_one_tile: handCount === 1 })) won.push('cirurgia_tranca');
    if (result.reason === 'batida' && session.lastDouble && checkAchievement('milagre_boteco', { double_win_with_one_life: ev.hearts?.player === 1 })) won.push('milagre_boteco');
    // versão 1.4
    if (result.reason === 'batida' && !round.six) check(won, 'petisco_balcao', { batida_without_six: true });
    if (result.reason === 'batida' && String(result.lastTileId ?? '').split('#')[0] === '0-0') check(won, 'tetano_mesa', { batida_with_zero_double: true });
    if (result.kind === 'tranca' && result.sums) check(won, 'fritura_pesada', { tranca_margin: result.sums.tioZe - result.sums.player });
    if (round.grease) check(won, 'engrenagem_cega', { won_round_with_drawn_double: true });
  }
  if (result.kind === 'tranca' && !result.winner && result.sums && result.sums.player === result.sums.tioZe) check(won, 'por_um_fio', { tranca_tie: true });
  // Azar Compartilhado: a batida do rival deixou você com exatamente 1 coração
  if (result.winner === 'tioZe' && result.reason === 'batida' && Number.isInteger(ev.hearts?.player) && ev.hearts.player - (result.damage ?? 0) === 1) {
    check(won, 'azar_compartilhado', { survived_at_one_in_run: bumpRunCounter(state, 'survived') });
  }
  if (result.kind) session.lastRound = { kind: result.kind, reason: result.reason ?? null, lastTileId: result.lastTileId ?? null, heartsPlayer: ev.hearts?.player ?? null };
  session.heartTile = null;
  session.lastDouble = false;
  return won;
}

/**
 * Passa os eventos novos (em ordem) e o estado depois deles. Devolve os ids das
 * conquistas que saíram agora (cada uma já foi gravada e anunciada).
 */
export function trackAchievements(events, state) {
  const won = [];
  for (const ev of events) {
    const seat = seatOf(ev);
    switch (ev.type) {
      case 'runStart':
        writeJson(KEYS.shops, { seed: state?.seed ?? null, nodes: [] });
        resetRunRelics(state?.seed ?? null);
        session = freshSession();
        break;
      case 'duelStart':
        session.match = freshMatch();
        session.heartTile = null;
        session.lastDouble = false;
        session.round = freshRound();
        session.lastRound = null;
        break;
      case 'roundStart':
        session.heartTile = null;
        session.lastDouble = false;
        session.round = freshRound();
        // versão 1.4, Mão Pesada: rodada começada com mais de 45 pontos na mão
        if ((ev.handSum ?? 0) > 45) check(won, 'mao_pesada', { heavy_hands: bumpCounter(KEYS.heavy) });
        break;
      case 'bonus5':
        if (seat === 'player' && session.match) {
          session.match.muggins += 1;
          if (checkAchievement('malandragem_truco', { muggins_in_single_match: session.match.muggins })) won.push('malandragem_truco');
          if (ev.sum === 10) {
            session.match.tens += 1;
            check(won, 'acertei_quina', { tens_in_match: session.match.tens });
          }
        }
        if (seat === 'tioZe') {
          session.round.rivalFives += 1;
          if (session.match && session.round.rivalFives >= 2) session.match.rivalFivesTwice = true;
        }
        break;
      case 'drawPeek':
      case 'drawTile':
        if (seat === 'player') {
          // a escolha do Barbante (picked) já contou no drawPeek; compra forçada não é compra
          if (session.match && !ev.forced && !ev.picked) session.match.draws += 1;
          // a compra paga com coração (a 3ª do turno): guarda a pedra para ver se ela vai à mesa
          if (ev.cost?.type === 'heart') session.heartTile = ev.tileId ?? null;
          // versão 1.4, Azia de Beco: a 3ª compra do mesmo turno
          if (ev.n === 3 && !ev.forced && !ev.picked) check(won, 'azia_beco', { triple_draw_turns_in_run: bumpRunCounter(state, 'triple') });
          // Engrenagem Cega: a bucha que saiu do dorme
          const drawn = ev.type === 'drawTile' ? pipsOf(ev.tileId) : null;
          if (drawn && drawn.a === drawn.b) session.round.drawnDouble = ev.tileId;
        } else {
          session.heartTile = null;
          session.round.drawnDouble = null;
        }
        break;
      case 'tilePlaced':
        if (seat === 'player') {
          session.lastDouble = Boolean(ev.double);
          if (session.heartTile && ev.tileId === session.heartTile && checkAchievement('limite_sangue', { bought_third_tile_and_played: true })) won.push('limite_sangue');
          session.heartTile = null;
          // versão 1.4
          const tile = pipsOf(ev.tileId);
          if (tile && (tile.a === 6 || tile.b === 6)) session.round.six = true;
          if (session.round.drawnDouble && ev.tileId === session.round.drawnDouble) session.round.grease = true;
          if (session.match && ev.double && ev.side !== 'root' && tile && tile.a % 2 === 1) {
            session.match.oddDoubles += 1;
            check(won, 'corte_fino', { odd_doubles_in_match: session.match.oddDoubles });
          }
          if (session.match && ev.ends && ev.ends.left === ev.ends.right) {
            session.match.equalEnds += 1;
            check(won, 'tacada_torta', { equal_ends_in_match: session.match.equalEnds });
          }
        } else {
          session.heartTile = null;
          session.lastDouble = false;
          session.round.drawnDouble = null;
        }
        break;
      case 'pass':
        if (seat !== 'player') {
          session.heartTile = null;
          session.round.drawnDouble = null;
          // versão 1.4, Calor da Fornalha
          if (session.match) {
            session.match.rivalPasses += 1;
            check(won, 'calor_fornalha', { rival_passes_in_match: session.match.rivalPasses });
          }
        } else if (ev.strategic && session.match) {
          session.match.strategic += 1;
        }
        break;
      case 'heartLost':
        // pagar a 3ª compra com coração é escolha sua, não dano (nem o coração que a Vela Preta apaga)
        if (seat === 'player' && ev.reason !== 'draw' && ev.reason !== 'velaPreta' && session.match) session.match.hurt = true;
        break;
      case 'roundEnd':
        won.push(...onRoundEnd(ev, state));
        break;
      case 'duelEnd':
        won.push(...onDuelEnd(ev, state));
        break;
      case 'shopBuy':
        if (trackShop(state)) won.push('boca_balcao');
        // Maleta do Trapaceiro: 4 talismãs diferentes comprados na mesma run
        if (ev.kind === 'relic' && addRunRelic(state?.seed ?? null, ev.id) >= 4) unlockMaleta('trapaceiro');
        break;
      case 'marketBuy':
        if (addRunRelic(state?.seed ?? null, ev.id) >= 4) unlockMaleta('trapaceiro');
        break;
      default:
        break;
    }
  }
  won.push(...trackCommons(state));
  // Maleta do Bicheiro: $60 ganhos (somando tudo) na mesma run
  if ((state?.stats?.coinsEarned ?? 0) >= 60) unlockMaleta('bicheiro');
  return won;
}
