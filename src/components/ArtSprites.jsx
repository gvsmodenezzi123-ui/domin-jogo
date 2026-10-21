// src/components/ArtSprites.jsx
// Toda a arte vetorial do jogo (SVG 40x40, crispEdges), num lugar só:
//   - os 18 rivais da campanha (retratos com 4 humores e boca que fala);
//   - os 15 talismãs (volume 3D, sombra no chão, brilho especular);
//   - os ícones de interface (moeda, coração, som, menu, lâmpada, olho).
// Nenhuma imagem externa: tudo é <rect>/<path> desenhado em código.

// Região 1 — Boteco da Esquina
export { TioZeAvatar } from './HighDensitySprites.jsx';
export { ArlindoAvatar, BaianoAvatar, NeideAvatar, TonhoAvatar, ValdirAvatar } from './art/RivalsRegion1.jsx';
// Região 2 — Clube da Sinuca Clandestino
export { BetoAvatar, CidaAvatar, MarcaoAvatar, PaulinhoAvatar, SerginhoAvatar, TiaoAvatar } from './art/RivalsRegion2.jsx';
// Região 3 — Submundo do Jogo do Bicho
export { AlemaoAvatar, BigodeAvatar, CarlinhosAvatar, ComendadorAvatar, FaustoAvatar, SofiaAvatar } from './art/RivalsRegion3.jsx';

// Talismãs
export { CanecaChoppIcon, DadoViciadoIcon, OlhoVidroIcon } from './HighDensitySprites.jsx';
export { BorrachaIcon, BuchaDeAcoIcon, ChaveDeFendaIcon, CinzeiroIcon, DedalIcon, GizIcon } from './art/RelicsA.jsx';
export { AnelIcon, BarbanteIcon, CarteiraIcon, EspelhoIcon, MaoGrandeIcon, RelogioIcon } from './art/RelicsB.jsx';

// Interface
export { CoinIcon, EyeIcon, HeartIcon, LampIcon, MenuIcon, SpeakerIcon } from './art/UiIcons.jsx';
// Patch 0.6.1: talismãs Necróticos, o Corvo da Madrugada e o Seu Tião das Moedas
export {
  CorvoSprite,
  FalsaPartidaIcon,
  OlhoMorteIcon,
  OssoEnsanguentadoIcon,
  PactoCoveiroIcon,
  TiaoMoedasSprite,
  TrancaCadavericaIcon,
} from './art/NecroticArt.jsx';
