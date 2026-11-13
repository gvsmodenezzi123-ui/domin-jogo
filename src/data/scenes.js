/**
 * Versão 2.30: os cenários de dia. Cada um junta a sala de trás (art/landRooms.js), o material da
 * mesa (art/tableKinds.js), a luz (o sol, sem a lâmpada pendurada) e a trilha (engine/audioSynth.js).
 *
 *   calcada  A Calçada do Bar: a mesa de plástico branca na pedra portuguesa, pagode de domingo.
 *   praia    O Quiosque da Praia: a mesa de tábua azul no deque, bossa nova de fim de tarde.
 *   praca    A Praça do Coreto: a mesa de concreto pintada de verde, forró pé-de-serra.
 *
 * Na campanha, três rivais do Boteco da Esquina jogam de dia, cada um no seu canto (o Tonho do
 * Gás na calçada do bar, o Zeca Charreteiro no quiosque da praia, a Dona Neide na praça); nas
 * mesas online os três entram como salas (data/tableMaps.js). Só muda o que se vê e se ouve:
 * a partida, o sorteio e a seed continuam os mesmos.
 */
export const SCENES = Object.freeze({
  calcada: Object.freeze({
    id: 'calcada',
    label: 'CALÇADA',
    name: 'Calçada do Bar',
    song: 'Pagode de calçada',
    room: 'landcalcada',
    table: 'plastico',
    light: 'day',
    music: 'calcadaPagode',
  }),
  praia: Object.freeze({
    id: 'praia',
    label: 'PRAIA',
    name: 'Quiosque da Praia',
    song: 'Bossa do quiosque',
    room: 'landpraia',
    table: 'tabua',
    light: 'day',
    music: 'praiaBossa',
  }),
  praca: Object.freeze({
    id: 'praca',
    label: 'PRAÇA',
    name: 'Praça do Coreto',
    song: 'Forró da praça',
    room: 'landpraca',
    table: 'concreto',
    light: 'day',
    music: 'pracaForro',
  }),
});

/** Quem joga de dia na campanha, e onde. */
export const RIVAL_SCENES = Object.freeze({ tonho: 'calcada', zeca: 'praia', neide: 'praca' });

/** O cenário de dia do rival `id` (null: ele joga na sala da região). */
export const sceneOfRival = (id) => SCENES[RIVAL_SCENES[id]] ?? null;
