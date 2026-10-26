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
  // Patch 0.8.0: nó 19 secreto (48x48)
  donoDaNoite: Art.DonoDaNoiteAvatar,
  // Patch 0.9.5: o professor da partida de treino
  voJuca: Art.VoJucaAvatar,
  // versão 1.4
  juvenal: Art.JuvenalAvatar,
  zeca: Art.ZecaAvatar,
  genesio: Art.GenesioAvatar,
  marquinhos: Art.MarquinhosAvatar,
  nelsinho: Art.NelsinhoAvatar,
  soro: Art.SoroAvatar,
  brandao: Art.BrandaoAvatar,
  geraldo: Art.GeraldoAvatar,
  odete: Art.OdeteAvatar,
  valtinhoRenegado: Art.ValtinhoRenegadoAvatar,
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
  // versão 1.4: a Lanterna do Vigia e o Papel Carbono no lugar do 2º cinzeiro e do 2º espelho
  cinzeiroBitucas: Art.LanternaVigiaIcon,
  notaTres: Art.NotaTresIcon,
  fitaCrepe: Art.FitaCrepeIcon,
  espelhoBanheiro: Art.PapelCarbonoIcon,
  balancaAcougue: Art.BalancaAcougueIcon,
  relogioParede: Art.RelogioParedeIcon,
  caliceGalo: Art.CaliceGaloIcon,
  dedoCadaver: Art.DedoCadaverIcon,
  testamento: Art.TestamentoIcon,
  dadoOsso: Art.DadoOssoIcon,
  // versão 1.4
  pires: Art.PiresIcon,
  gilete: Art.GileteIcon,
  bicarbonato: Art.BicarbonatoIcon,
  cofrinho: Art.CofrinhoIcon,
  prego: Art.PregoIcon,
  peCoelho: Art.PeCoelhoIcon,
  grampo: Art.GrampoIcon,
  espatula: Art.EspatulaIcon,
  taco: Art.TacoIcon,
  oleo: Art.OleoIcon,
  pacoteTremoco: Art.PacoteTremocoIcon,
  cadeado: Art.CadeadoIcon,
  chapaFogao: Art.ChapaFogaoIcon,
  lupa: Art.LupaIcon,
  canetaLoterica: Art.CanetaLotericaIcon,
  trena: Art.TrenaIcon,
  ampulheta: Art.AmpulhetaIcon,
  velaPreta: Art.VelaPretaIcon,
});

/** Ponta acesa do cigarro do Tio Zé, na grade de 40: a fumaça sobe daqui (não sai quando ele está ferido). */
const TIO_ZE_EMBER = Object.freeze({ x: 35.5, y: 26.5, grid: 40, moods: ['idle', 'thinking', 'smug'] });

/** Ponta do charuto do Comendador (no "ferido" o charuto cai). */
const COMENDADOR_EMBER = Object.freeze({ x: 35, y: 19.5, grid: 40, moods: ['idle', 'thinking', 'smug'] });

/** Brasa de cada retrato que fuma (de onde a fumaça sobe). */
export const ART_EMBER = Object.freeze({ tioZe: TIO_ZE_EMBER, comendador: COMENDADOR_EMBER });
