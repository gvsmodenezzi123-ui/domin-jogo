/**
 * Campanha: 3 regiões, 6 personagens cada (18 no total). Desde o Patch 0.6.1 o caminho
 * não é mais uma fila fixa: cada run sorteia uma teia de nós por região (ver
 * engine/campaignMap.js). Em `nodes`, os 5 primeiros são os candidatos da região e o
 * último é o chefe. Desde o 0.6.2 cada run escala 15: o chefe e 4 dos 5 candidatos
 * de cada região (o de menos corações abre a região, os outros 3 vão para os caminhos).
 *
 * Também mora aqui o que muda conforme a região: a chance de cada raridade na
 * Loja Clandestina, o clima da mesa (`atmosphere`) e a faixa de música
 * (`music`, ver engine/audioSynth.js). Desde o Patch 0.9.0 cada chefe tem a sua faixa
 * (`BOSS_TRACKS`).
 *
 * Versão 1.4 (teia v3, runs novas): `nodes` fica como era (teias v1 e v2, saves antigos) e
 * cada região ganha `pool` (os candidatos, agora 6 ou 7) e `bosses` (o chefe é sorteado pela
 * semente entre eles: 1 em 2 na Região 1, 1 em 3 nas outras). Na Região 3 o chefe final pode
 * ser o Comendador, a Dona Odete ou o Valtinho Renegado.
 */

export const REGIONS = Object.freeze([
  Object.freeze({
    id: 1,
    name: 'BOTECO DA ESQUINA',
    subtitle: 'Feltro tradicional, cerveja quente',
    atmosphere: 'boteco',
    music: 'botecoJazz',
    // chance (%) de cada raridade na loja
    rarity: Object.freeze({ comum: 60, raro: 35, lendario: 5, mitico: 0 }),
    nodes: Object.freeze(['tioZe', 'tonho', 'baiano', 'valdir', 'neide', 'arlindo']),
    // versão 1.4 (teia v3): os candidatos e os chefes sorteados da região
    pool: Object.freeze(['tioZe', 'tonho', 'baiano', 'valdir', 'neide', 'juvenal', 'zeca']),
    bosses: Object.freeze(['arlindo', 'genesio']),
  }),
  Object.freeze({
    id: 2,
    name: 'CLUBE DA SINUCA CLANDESTINO',
    subtitle: 'Neon, fumaça e taco quebrado',
    atmosphere: 'neon',
    music: 'sinucaFunk',
    rarity: Object.freeze({ comum: 45, raro: 35, lendario: 15, mitico: 5 }),
    nodes: Object.freeze(['marcao', 'serginho', 'cida', 'paulinho', 'tiao', 'beto']),
    pool: Object.freeze(['marcao', 'serginho', 'cida', 'paulinho', 'tiao', 'marquinhos', 'nelsinho']),
    bosses: Object.freeze(['beto', 'soro', 'brandao']),
  }),
  Object.freeze({
    id: 3,
    name: 'SUBMUNDO DO JOGO DO BICHO',
    subtitle: 'Alta tensão, apostas pesadas',
    atmosphere: 'bicho',
    music: 'submundoNoir',
    rarity: Object.freeze({ comum: 30, raro: 30, lendario: 25, mitico: 15 }),
    nodes: Object.freeze(['carlinhos', 'bigode', 'sofia', 'fausto', 'alemao', 'comendador']),
    pool: Object.freeze(['carlinhos', 'bigode', 'sofia', 'fausto', 'alemao', 'geraldo']),
    bosses: Object.freeze(['comendador', 'odete', 'valtinhoRenegado']),
  }),
]);

/** Faixa de chefe para quem não tiver uma própria em BOSS_TRACKS. */
export const BOSS_MUSIC = 'bossFight';

/**
 * Patch 0.9.0: cada chefe com a sua trilha. Seu Arlindo: samba-rock da navalha. Beto Cigano:
 * industrial do ferro-velho. Comendador: a elétrica do 0.8.2. O Dono da Noite: ritual.
 */
export const BOSS_TRACKS = Object.freeze({
  arlindo: 'bossArlindo',
  beto: 'bossBeto',
  comendador: 'bossFight',
  donoDaNoite: 'bossNoite',
  // versão 1.4
  genesio: 'bossGenesio',
  soro: 'bossSoro',
  brandao: 'bossBrandao',
  odete: 'bossOdete',
  valtinhoRenegado: 'bossValtinho',
});

/** A faixa da mesa do chefe `id`. */
export const bossMusicOf = (id) => BOSS_TRACKS[id] ?? BOSS_MUSIC;

/** Chefes com entrada própria ao sentar na mesa (components/BossIntro.jsx; o Dono tem a dele). */
export const BOSS_INTRO_IDS = Object.freeze(['arlindo', 'beto', 'comendador', 'genesio', 'soro', 'brandao', 'odete', 'valtinhoRenegado']);

/** Chefe final clássico (teias v1 e v2): vencer ele encerra a run. */
export const FINAL_BOSS = 'comendador';
/** Versão 1.4: os chefes finais que a teia v3 sorteia (qualquer um encerra a run). */
export const FINAL_BOSSES = Object.freeze(['comendador', 'odete', 'valtinhoRenegado']);

/** Reembaralhar a loja fica mais caro a cada uso na mesma visita: $3, $5, $8, depois $12. */
export const REROLL_COSTS = Object.freeze([3, 5, 8, 12]);
export const rerollCost = (rerolls) => REROLL_COSTS[Math.min(rerolls, REROLL_COSTS.length - 1)];

/** Corações que você recupera ao vencer um nó (chefe: cura tudo). */
export const HEAL_AFTER_NODE = 2;
