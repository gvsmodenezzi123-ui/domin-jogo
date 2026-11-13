/**
 * Versão 2.13: as salas das mesas online (o duelo 1×1 e a roda de 2 a 4). Quem abre a mesa
 * escolhe onde se joga e a sala vem com a trilha dela: o Boteco da Esquina (o jazz de boteco), o
 * Clube da Sinuca (o funk da sinuca), o Submundo do Bicho (o noir) e a Sala do Dono da Noite
 * (o ritual, à luz das quatro velas) — essa só para quem já sentou com ele na campanha.
 * A sala vale para todos na mesa (vai na configuração que o anfitrião manda).
 * Versão 2.30: e os três cenários de dia (data/scenes.js), com a mesa de cada um.
 */
import { BOSS_TRACKS, REGIONS } from './campaign.js';
import { RIVALS, SECRET_BOSS } from './rivals.js';
import { SCENES } from './scenes.js';

export const TABLE_MAPS = Object.freeze([
  Object.freeze({ id: 'boteco', label: 'BOTECO', name: 'Boteco da Esquina', song: 'Jazz de boteco', atmosphere: 'boteco', room: 'landroom', music: REGIONS[0].music, light: 'lamp', felt: null, decor: [] }),
  Object.freeze({ id: 'sinuca', label: 'SINUCA', name: 'Clube da Sinuca', song: 'Funk da sinuca', atmosphere: 'neon', room: 'landsinuca', music: REGIONS[1].music, light: 'lamp', felt: null, decor: [] }),
  Object.freeze({ id: 'bicho', label: 'BICHO', name: 'Submundo do Bicho', song: 'Noir do submundo', atmosphere: 'bicho', room: 'landbicho', music: REGIONS[2].music, light: 'lamp', felt: null, decor: [] }),
  Object.freeze({
    id: 'noite',
    label: 'NOITE',
    name: 'Sala do Dono da Noite',
    song: 'O ritual do Dono',
    atmosphere: 'bicho',
    room: RIVALS[SECRET_BOSS].room,
    music: BOSS_TRACKS[SECRET_BOSS],
    light: 'candles',
    felt: RIVALS[SECRET_BOSS].felt,
    decor: RIVALS[SECRET_BOSS].decor,
    secret: true,
  }),
  // versão 2.30: os três cenários de dia, cada um com a mesa e a trilha dele
  ...Object.values(SCENES).map((c) =>
    Object.freeze({ id: c.id, label: c.label, name: c.name, song: c.song, atmosphere: 'boteco', room: c.room, music: c.music, light: c.light, table: c.table, felt: null, decor: [] }),
  ),
]);

export const MAP_IDS = Object.freeze(TABLE_MAPS.map((m) => m.id));
export const DEFAULT_MAP = 'boteco';

/** A sala `id` (a do boteco se não existir). */
export const mapOf = (id) => TABLE_MAPS.find((m) => m.id === id) ?? TABLE_MAPS[0];

/** A sala secreta abre para quem já viu o Dono da Noite (ele está no Livro de Boteco). */
export const mapUnlocked = (map, collection) => !map.secret || Boolean(collection?.rivals?.includes(SECRET_BOSS));

/**
 * Versão 2.30: a sala seguinte (dir = 1) ou a anterior (-1) entre as liberadas, dando a volta:
 * com os cenários de dia são sete salas e elas não cabem lado a lado, então a escolha é ◀ SALA ▶.
 */
export function stepMap(id, dir, collection) {
  const open = TABLE_MAPS.filter((m) => mapUnlocked(m, collection));
  const i = Math.max(0, open.findIndex((m) => m.id === id));
  return open[(i + dir + open.length) % open.length].id;
}

/**
 * O que a mesa (TableBoard) e o rival sentado precisam para montar a sala: o cenário, a luz
 * (lâmpada, velas ou o sol), o clima, o feltro (`felt`: o da mesa, se a sala não tiver um próprio)
 * e o material do tampo (`material`: o plástico, a tábua ou o concreto dos cenários de dia).
 */
export function mapTable(id, felt) {
  const m = mapOf(id);
  return { room: m.room, lighting: m.light, atmosphere: m.atmosphere, felt: m.felt ?? felt, decor: m.decor, material: m.table ?? null };
}
