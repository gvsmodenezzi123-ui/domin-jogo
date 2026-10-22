// Liga o campo `art` de data/rivals.js e data/relics.js aos desenhos de
// ArtSprites.jsx. Fica separado dos componentes para o recarregamento rápido
// do Vite continuar funcionando.

import * as Art from './ArtSprites.jsx';

const pick = (map) => Object.freeze(Object.fromEntries(Object.entries(map).filter(([, component]) => component)));

/** `art` dos rivais → retrato 40x40 (um por rival, na ordem da campanha). */
export const RIVAL_ART = pick({
  tioZe: Art.TioZeAvatar,
  tonho: Art.TonhoAvatar,
  baiano: Art.BaianoAvatar,
  valdir: Art.ValdirAvatar,
  neide: Art.NeideAvatar,
  arlindo: Art.ArlindoAvatar,
  marcao: Art.MarcaoAvatar,
  serginho: Art.SerginhoAvatar,
  cida: Art.CidaAvatar,
  paulinho: Art.PaulinhoAvatar,
  tiao: Art.TiaoAvatar,
  beto: Art.BetoAvatar,
  carlinhos: Art.CarlinhosAvatar,
  bigode: Art.BigodeAvatar,
  sofia: Art.SofiaAvatar,
  fausto: Art.FaustoAvatar,
  alemao: Art.AlemaoAvatar,
  comendador: Art.ComendadorAvatar,
});

/** `art` dos talismãs → ícone 40x40. */
export const RELIC_ART = pick({
  canecaChopp: Art.CanecaChoppIcon,
  borracha: Art.BorrachaIcon,
  cinzeiro: Art.CinzeiroIcon,
  giz: Art.GizIcon,
  olhoVidro: Art.OlhoVidroIcon,
  dadoViciado: Art.DadoViciadoIcon,
  chaveDeFenda: Art.ChaveDeFendaIcon,
  buchaDeAco: Art.BuchaDeAcoIcon,
  dedal: Art.DedalIcon,
  espelho: Art.EspelhoIcon,
  carteira: Art.CarteiraIcon,
  anel: Art.AnelIcon,
  maoGrande: Art.MaoGrandeIcon,
  relogio: Art.RelogioIcon,
  barbante: Art.BarbanteIcon,
  pactoCoveiro: Art.PactoCoveiroIcon,
  ossoEnsanguentado: Art.OssoEnsanguentadoIcon,
  olhoMorte: Art.OlhoMorteIcon,
  trancaCadaverica: Art.TrancaCadavericaIcon,
  falsaPartida: Art.FalsaPartidaIcon,
  // Patch 0.7.0
  palitoDente: Art.PalitoDenteIcon,
  moedaFurada: Art.MoedaFuradaIcon,
  panoChao: Art.PanoChaoIcon,
  tampaGarrafa: Art.TampaGarrafaIcon,
  radioPilha: Art.RadioPilhaIcon,
  fosforo: Art.FosforoIcon,
  oculosFundo: Art.OculosFundoIcon,
  canivete: Art.CaniveteIcon,
  trucoMarcado: Art.TrucoMarcadoIcon,
  abridorLata: Art.AbridorLataIcon,
  cinzeiroBitucas: Art.CinzeiroBitucasIcon,
  notaTres: Art.NotaTresIcon,
  fitaCrepe: Art.FitaCrepeIcon,
  espelhoBanheiro: Art.EspelhoBanheiroIcon,
  balancaAcougue: Art.BalancaAcougueIcon,
  relogioParede: Art.RelogioParedeIcon,
  caliceGalo: Art.CaliceGaloIcon,
  dedoCadaver: Art.DedoCadaverIcon,
  testamento: Art.TestamentoIcon,
  dadoOsso: Art.DadoOssoIcon,
});

/** Ponta acesa do cigarro do Tio Zé, na grade de 40: a fumaça sobe daqui (não sai quando ele está ferido). */
const TIO_ZE_EMBER = Object.freeze({ x: 35.5, y: 26.5, grid: 40, moods: ['idle', 'thinking', 'smug'] });

/** Ponta do charuto do Comendador (no "ferido" o charuto cai). */
const COMENDADOR_EMBER = Object.freeze({ x: 35, y: 19.5, grid: 40, moods: ['idle', 'thinking', 'smug'] });

/** Brasa de cada retrato que fuma (de onde a fumaça sobe). */
export const ART_EMBER = Object.freeze({ tioZe: TIO_ZE_EMBER, comendador: COMENDADOR_EMBER });
