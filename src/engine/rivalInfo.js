/**
 * O que o mapa e a mesa contam sobre cada rival: o jeito de jogar dele e as
 * regras próprias (mecânicas, talismãs e pedras de grife do baralho dele).
 */

import { getEnhancement } from '../data/enhancedTiles.js';
import { getRelic } from '../data/relics.js';
import { getRival } from '../data/rivals.js';

/** Jeito de jogar, em uma linha. */
const BLURB = {
  tioZe: 'O dono da mesa. Joga no clássico.',
  tonho: 'Rápido no gatilho: solta as pedras baixas primeiro.',
  baiano: 'Caça múltiplos de 5 o tempo todo.',
  valdir: 'Pesado e teimoso: descarrega os pontos e aperta as pontas.',
  neide: 'Tranca defensiva: conta menos que você.',
  arlindo: 'Solta bucha cedo e cobra caro por cada uma.',
  marcao: 'Agressivo: fecha as pontas que você não tem e te força a comprar.',
  serginho: 'Ligeiro e blefador.',
  cida: 'Paciente. Cada passe seu enche o prato dela.',
  paulinho: 'Olho de lince: nunca perde a sua pedra mais pesada de vista.',
  tiao: 'Cortes rápidos e cinco corações.',
  beto: 'O banqueiro cobra pedágio no dorme.',
  carlinhos: 'Mão leve: cruzou as pontas, sumiu dinheiro.',
  bigode: 'Bolso cheio, ouro na mesa e um Rubi guardado.',
  sofia: 'Lê as suas buchas antes de você jogar.',
  fausto: 'Frio e calculista: Cristal para enganar, Rubi para ferir.',
  alemao: 'Ferro velho: as pedras dele pesam o dobro na tranca.',
  comendador: 'O dono do boteco. Dois talismãs lendários.',
};

const MECHANIC_TEXT = {
  doubleBuchaDamage: () => 'Batida de bucha dele dá dano em dobro.',
  drawFee: (n) => `Cada compra sua do dorme paga $${n} pra ele.`,
  healOnPlayerPass: () => 'Você passou a vez: ela recupera 1♥.',
  exposeHeaviest: () => 'Enxerga a sua pedra mais pesada.',
  predictDoubles: () => 'Enxerga as suas buchas.',
  stealOnCross: (n) => `Jogada dele que casa as duas pontas rouba $${n} seu.`,
  trancaWeight: (n) => `As pedras dele valem ${n}× na contagem da tranca.`,
  trancaShield: () => 'Imune ao primeiro dano de tranca da partida.',
};

export const rivalBlurb = (id) => BLURB[id] ?? '';

/** Regras da mesa desse rival, uma por linha. */
export function rivalRules(id) {
  const rival = getRival(id);
  const lines = [];
  for (const [key, value] of Object.entries(rival.mechanics ?? {})) {
    if (value && MECHANIC_TEXT[key]) lines.push(MECHANIC_TEXT[key](value));
  }
  const relics = rival.relics.map(getRelic).filter(Boolean);
  if (relics.length) lines.push(`Talismã${relics.length > 1 ? 's' : ''}: ${relics.map((r) => r.name).join(' e ')}.`);
  const counts = {};
  for (const enh of Object.values(rival.deck ?? {})) counts[enh] = (counts[enh] ?? 0) + 1;
  const parts = Object.entries(counts)
    .map(([enh, n]) => {
      const e = getEnhancement(enh);
      return e ? `${n} de ${e.name}` : null;
    })
    .filter(Boolean);
  if (parts.length === 1 && counts[Object.keys(counts)[0]] === 1) lines.push(`1 pedra de ${getEnhancement(Object.keys(counts)[0]).name} no baralho dele.`);
  else if (parts.length) lines.push(`Pedras de grife no baralho: ${parts.join(', ')}.`);
  return lines;
}
