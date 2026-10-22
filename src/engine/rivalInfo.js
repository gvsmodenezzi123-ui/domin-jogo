/**
 * O que o mapa conta sobre cada rival: só o jeito de jogar dele, em uma linha
 * (desde o 0.8.0 sem nível de IA, talismãs nem pedras de grife).
 */

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

export const rivalBlurb = (id) => BLURB[id] ?? '';
