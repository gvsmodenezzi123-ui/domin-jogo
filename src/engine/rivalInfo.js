/**
 * O que o mapa conta sobre cada rival: só o jeito de jogar dele, em uma linha
 * (desde o 0.8.0 sem nível de IA, talismãs nem pedras de grife).
 */

import { getRelic } from '../data/relics.js';
import { rivalOf } from '../data/rivals.js';

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
  // versão 1.4
  juvenal: 'Cobrador: com o bolso cheio, o seu passe sai mais caro.',
  zeca: 'Abre toda rodada com a bucha mais alta dele.',
  genesio: 'A rifa da rodada: pedra sua com o número dele custa caro.',
  marquinhos: 'Nunca tem troco: o seu múltiplo de 5 paga menos.',
  nelsinho: 'Mestre do ponto: as buchas dele pesam menos na tranca.',
  soro: 'Mesa de luxo: cada pedra comum sua paga a entrada.',
  brandao: 'Toque de recolher: com pedra que encaixa, é jogar.',
  geraldo: 'Silencioso: o dorme fica enterrado, sem contagem.',
  odete: 'Agiota: deixar de fechar múltiplo de 5 rende juros a ela.',
  valtinhoRenegado: 'Rouba do seu estoque: desliga 1 talismã a partida inteira.',
};

export const rivalBlurb = (id) => BLURB[id] ?? '';

/**
 * Versão 1.4: o selo da regra do rival no canto do feltro (ou null). `value` vai dentro do
 * selo (curto); `label` e `text` aparecem ao tocar.
 */
export function rivalRuleBadge(state) {
  if (!state || state.pvp || state.tutorial || state.phase === 'title') return null;
  const rival = rivalOf(state);
  const mech = rival.mechanics ?? {};
  const fx = state.fx ?? {};
  if (mech.raffle) {
    const number = fx.raffle?.number;
    const paid = fx.raffle?.taken ?? 0;
    return {
      id: 'raffle',
      label: 'APOSTA CASADA',
      value: number ?? '?',
      text: `Cada pedra sua com o ${number ?? 'número da rodada'} custa $${mech.raffle.fee} (até $${mech.raffle.cap} na rodada). Já pagou $${paid}.`,
    };
  }
  if (mech.interest) {
    const left = mech.interest.every - (fx.interest?.turns ?? 0);
    return {
      id: 'interest',
      label: 'JUROS COM SANGUE',
      value: left,
      text: `Em ${left} vez${left === 1 ? '' : 'es'} sua${left === 1 ? '' : 's'}, ela leva $${mech.interest.fee} se você não fechar múltiplo de 5 antes. Sem dinheiro, 1 coração (nunca o último, 1 por rodada).`,
    };
  }
  if (mech.luxuryFee) {
    const paid = fx.luxury ?? 0;
    return {
      id: 'luxury',
      label: 'MESA DE LUXO',
      value: `$${paid}`,
      text: `Cada pedra comum sua custa $${mech.luxuryFee.fee} (até $${mech.luxuryFee.cap} na rodada). Bucha e pedra de grife são grátis; sem dinheiro, também. Já pagou $${paid}.`,
    };
  }
  if (mech.stolenStock) {
    const stolen = state.matchFx?.stolen?.player;
    return {
      id: 'stolen',
      label: 'ESTOQUE ROUBADO',
      value: '!',
      text: stolen ? `Ele desligou o seu ${getRelic(stolen)?.name ?? stolen} nesta partida.` : 'Ele desliga 1 talismã seu, sorteado, a partida inteira.',
    };
  }
  const STATIC = {
    mustPlay: ['TOQUE DE RECOLHER', 'Com pedra que encaixa, você é obrigado a jogar: passar, só sem jogada.'],
    passTax: ['COBRANÇA', mech.passTax ? `Com mais de $${mech.passTax.above} no bolso, o seu passe voluntário custa $${mech.passTax.extra} a mais.` : ''],
    opensWithBucha: ['CHICOTE', 'Ele abre toda rodada com a bucha mais alta dele, se tiver uma.'],
    fiveTax: ['SEM TROCO', mech.fiveTax ? `O seu múltiplo de 5 paga $${mech.fiveTax} a menos.` : ''],
    doubleDiscount: ['MESTRE DO PONTO', mech.doubleDiscount ? `As buchas dele valem ${mech.doubleDiscount} ponto a menos na contagem da tranca.` : ''],
    hideBoneyard: ['COVA FUNDA', 'O dorme fica enterrado: você não vê quantas pedras restam.'],
  };
  const found = Object.keys(STATIC).find((key) => mech[key]);
  if (!found) return null;
  const [label, text] = STATIC[found];
  return { id: found, label, value: '!', text };
}

/**
 * Versão 2.0: o nome do rival que cabe na polaroide sem corte. Até 11 letras vai inteiro;
 * mais que isso, o primeiro nome e a inicial do último ("JUVENAL COBRADOR" → "JUVENAL C.").
 * Artigo na frente ("O Dono da Noite") não conta como primeiro nome.
 */
export function shortRivalName(name) {
  const full = String(name ?? '').toUpperCase().trim();
  if (full.length <= 11) return full;
  const words = full.split(/\s+/).filter((w) => !['O', 'A', 'DA', 'DE', 'DO', 'DOS', 'DAS'].includes(w));
  if (words.length < 2) return full;
  const short = `${words[0]} ${words[words.length - 1][0]}.`;
  // primeiro nome comprido ("COMENDADOR M."): fica só ele, que cabe inteiro na lousinha
  return short.length > 12 ? words[0] : short;
}
