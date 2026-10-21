// src/components/art/RelicsB.jsx
// Talismãs 40x40, lote B: Espelho Retrovisor, Carteira Recheada e Anel do Bicheiro (lendários,
// halo roxo) e Mão Grande, Relógio Quebrado e Barbante Mágico (míticos, halo dourado-sangue).
//
// Cada ícone é um mapa de pixels 40x40 (uma string por linha, '.' = transparente) com a sua
// paleta. Ao carregar o módulo, o mapa vira um <path> por cor feito só de retângulos inteiros
// (o mesmo que vários <rect>, com bem menos nós no DOM). Luz quente de cima/esquerda: cada
// volume tem luz, tom base, sombra e contorno escuro; sombra no chão e halos usam opacidade.
import { PixelSvg } from './PixelSvg.jsx';

/** Mapa + paleta → camadas { key, d, fill, opacity } (um path por cor, corridas por linha). */
function pixelArt(palette, rows) {
  const runs = {};
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; ) {
      const ch = row[x];
      let end = x + 1;
      while (row[end] === ch) end += 1;
      if (palette[ch]) (runs[ch] ??= []).push(`M${x} ${y}h${end - x}v1h${x - end}z`);
      x = end;
    }
  });
  return Object.keys(runs).map((ch) => {
    const [fill, opacity] = [].concat(palette[ch]);
    return { key: ch, d: runs[ch].join(''), fill, opacity };
  });
}

function PixelIcon({ className, layers }) {
  return (
    <PixelSvg className={className} viewBox="0 0 40 40">
      {layers.map(({ key, d, fill, opacity }) => (
        <path key={key} d={d} fill={fill} opacity={opacity} />
      ))}
    </PixelSvg>
  );
}

// 1. ESPELHO RETROVISOR (lendário)
// k contorno · z sombra no chão · D d n c C W cromado · q Q a A H vidro · I i j J v p pedra refletida · u U P V brilho lendário
const ESPELHO = pixelArt(
  {
    k: '#0b0806',
    z: ['#000000', 0.45],
    D: '#1b2024',
    d: '#343d44',
    n: '#5d6b73',
    c: '#93a5ad',
    C: '#cfdde3',
    W: '#ffffff',
    q: '#1d3440',
    Q: '#2b4a58',
    a: '#3f6676',
    A: '#5f8c9e',
    H: '#a8cbd8',
    I: '#fbf6e4',
    i: '#e6dbb9',
    j: '#bcae88',
    J: '#8a7c5b',
    v: '#5b4d35',
    p: '#1c1917',
    u: ['#b277ff', 0.42],
    U: ['#b277ff', 0.18],
    P: '#e2c9ff',
    V: '#b277ff',
  },
  [
    '.............UukkkkkkkkkkuU.............',
    '............UukCCCCCCCCCCkuU............',
    '............UuknnnnnnnnnnkuU.......V....',
    '.......UUUUUUUukkkCWcnkkkuUUUUU....P....',
    '.....UUuuuuuuuuuukWWCckuuuuuuuuUUVPWPV..',
    '....UuukkkkkkkkkkkWWCckkkkkkkkkuuU.P....',
    '...UukkWWWWWWWWWWWWWWWWWWWWWWWCkkuUV....',
    '..UukWWCCCCCCCCCCCCCCCCCCCCCCCCCckuU....',
    '.UukWWcdddddddddddddddddddddddnCCckuU...',
    '.UukWcdDqqqqqqqqqqqqqqqqqqqqqqdcCcDkuU..',
    'UukWCnDAaAaAaAHWHAaHakkkkkkkkkQcCcndkuU.',
    'UukWCdqAAAAAAHWHAaHaAkpIIIpkJkAaCCddkuU.',
    'UukCCdqAaAaAHWHAaHaaakIiiijkJkQaCCdddkuU',
    'UukCCdqaAaAHWHAaHaAaAkIipijkJkaQCCdddkuU',
    'UukCCdqAaAHWHaQHQaQaQkIiiijkJkQaCCdddkuU',
    'UukCCdqaAHWHAaHaaaaQakpjjjpkJkaQCCdddkuU',
    'UukCCdqaHWHaQHQaQaQaQkvvvvvkJkqQCCdddkuU',
    'UukCCdqHWHaQHQaQaQaQakIIIIpkJkQqCCdddkuU',
    'UukCCdqWHaQHQaQQQQqQqkIiiijkJkqQCCdddkuU',
    'UukCCdqHaQHQaQaQaQaQQkIiiijkJkQqCCdddkuU',
    'UukCCdqQqHqQqQqQqQqQqkIiiijkJkqqCCdddkuU',
    'UukCCdqQHQaQQQQqQqQqQkpjjjjkJkQqCCdddkuU',
    'UukCCdqHqQqQqQqQqQqqqkkkkkkkJkqqCCdddkuU',
    'UukCCnqqQqQqQqQqQqQqQkJJJJJJJkqqWCdddkuU',
    'UukCCcnQqQqqqqqqqqqqqkkkkkkkkkqWWcDddkuU',
    '.UukCCccQqQqQqQqqqqqqqqqqqqqqqWWCnDddkuU',
    '.UukccCCWWWWWWWWWWWWWWWWWWWWWWWCnDDddkuU',
    '..UuknccCCCCCCCCCCCCCCCCCCCCCCcnDDDdkuU.',
    '...UukDdddddddddddddddddddddddDDDDDdkuU.',
    '....UukDDDDDDDDDDDDDDDDDDDDDDDDDDDDkuU..',
    '.....UukkDDDDDDDDDDDDDDDDDDDDDDDDkkuU...',
    '......UuukkkkkkkkkkkkkkkkkkkkkkkkuuU....',
    '...V...UUuuuuuuuuuuuuuuuuuuuuuuuuUU.....',
    '..VPV....UUUUUUUzzzzzzzzUUUUUUUUU.......',
    '...V.....zzzzzzzzzzzzzzzzzzzzzz.........',
    '.......zzzzzzzzzzzzzzzzzzzzzzzzzz.......',
    '.........zzzzzzzzzzzzzzzzzzzzzz.........',
    '................zzzzzzzz................',
    '........................................',
    '........................................',
  ],
);

/** Retrovisor antigo de moldura cromada pendurado na haste; no vidro, o reflexo diagonal e a pedra que o rival acabou de comprar. */
export function EspelhoIcon({ className = 'w-10 h-10' }) {
  return <PixelIcon className={className} layers={ESPELHO} />;
}

// 2. CARTEIRA RECHEADA (lendário)
// k contorno · z sombra · D d b B L H couro · t costura · x forro · m n g G M notas · o O y Y w ouro · r R força · u P V brilho lendário
const CARTEIRA = pixelArt(
  {
    k: '#0b0806',
    z: ['#000000', 0.45],
    D: '#2b1507',
    d: '#4b2811',
    b: '#6e3e1d',
    B: '#8f572b',
    L: '#b0743d',
    H: '#cf975a',
    t: '#e6c58c',
    x: '#160a03',
    m: '#173d1d',
    n: '#2f6630',
    g: '#4b9443',
    G: '#78bf5f',
    M: '#b2e893',
    o: '#5a3a0b',
    O: '#94651a',
    y: '#d39f36',
    Y: '#ffcf4a',
    w: '#fff3c4',
    r: ['#e0301f', 0.5],
    R: '#ff6b5c',
    u: ['#b277ff', 0.38],
    P: '#e2c9ff',
    V: '#b277ff',
    W: '#ffffff',
  },
  [
    '...........u..............uRu...........',
    '..........uRurrr.....r.....u.....rrr....',
    '...........urkkkrrrrrkrrrrrr....rkkkr...',
    '...........rkmmmkkkkkmkkkkkkr..rkkkkkr..',
    '...........rkmMMmmmmmmmmmmmmkrrkkwYOkkr.',
    '......u..rrkkmMgMMMMMMMMMMMmkrrkkwYOkkr.',
    '.....uRrrkkmmmMggggggGGgggMmmkkkkwYOkkr.',
    '.....rkkkmmmMmMgggggGGnGggMmmmmkkwYOkkr.',
    '....rkmmmMMMmMggggggGnnGGMmgMMMmkwYOkkr.',
    '...rkmmMMgggmMnnnnnnnGGGgMmGGgMMMkkkkr..',
    '...rkmmMggggmMnnnnnnnnnnnMmGnGGggMmkr...',
    '...VrkmMggggmMnnnnnnnnnnnMmGnGGgMmkr....',
    '..VPVkmMggggnnnnnnnnnnnnnMmGGGGgMmkr....',
    '...V.rkmMnnnnnnnnnbbbbnnnnnnnngMmbkr....',
    '.....rkmMnnnnnnnxxxxxxxxnnnnnnnMmdkr....',
    '....rkxmMMnnnxxxxxxxxxxxxxxnnnMdbdkr....',
    '...rkxxxmHLHLHLHBHBLBLbLxxxxxnDdDdkr....',
    '..rkHHHHHHHHHLHLHLHLHBHBLbLbBdddddkr....',
    '..rkLHHHLHLtLtBtBtBtbtbBbBdBddDdDdkr....',
    '..rkHHHtHtHLHLHLHLHBBBBBBBBBBddDdDkr.V..',
    '..rkLHLHLHLHBHBHBLBLdtbtbtbtbdDDDDkr.P..',
    '..rkHLtLHLHLHLHLHBHBdbbbkkbbbddDdDkVPWPV',
    '..rkLHBHBHBHBLBLbLbBdbbkwykbbdDDDDkr.P..',
    '..rkHLtLHLHLHBHBLBLbdbbkyOkbbdDDDDkr.V..',
    '..rkBHBLBLBLBLbLbBbBdbbbkkbbbdDDDDkr....',
    '..rkHLtLHBHBHBLBLbLbdbbbbbbbbdDDDDkr....',
    '..rkBLBLbbbLbBbBdBdbDDDDDDDDDdDDDDkr....',
    '..rkHBtBLBbBLbLbBbBdBdbdbDkkkkkkkkkkr...',
    '..rkbLbBbBbddBdBdbdbDbDdDkkwYYYYyYkkkr..',
    '..rkLBtbLbLbBbBdBdBdbDbDdkwYYOOOyyOkkr..',
    '..rkbBdBdBdbdbdbDbDdDdDdDkyYyyyyyOokkr..',
    '..rkLkkkkkkkBtBtbtbtbtdtdkyyyOoOoOokkkr.',
    '..rkkwwYYYYYkbDdDdDdDDDDDkkyyOoOoOkOOkkr',
    '.rkkwwYOOOyOOkbDbDdDdDdDdkykkkkkkkOOokkr',
    '.rkkyYYyyyOOokkkkkkkkkkkkkyyyOoOoOoOokkr',
    '..rkkyyOoOoOkkzzzzzzzzzzzkkyyOoOoOoOkkr.',
    '..rkkkkOoOkkkkzzzzzzzzzzzzkkkkkOkkkkkr..',
    '...rkkkkkkkkkzzzzzzzzzzzzzzkkkkkkkkkr...',
    '....rrrkkkrrr..............rrrrkrrrr....',
    '.......rrr.....................r........',
  ],
);

/** Carteira de couro gasta e estufada, com costura, aba de pressão, notas saindo e moedas de ouro; o brilho vermelho em volta do dinheiro é a força da batida. */
export function CarteiraIcon({ className = 'w-10 h-10' }) {
  return <PixelIcon className={className} layers={CARTEIRA} />;
}

// 3. ANEL DO BICHEIRO (lendário)
// k contorno · z sombra · D d o g y Y W ouro · a b r e f h rubi · u U P V brilho lendário
const ANEL = pixelArt(
  {
    k: '#0b0806',
    z: ['#000000', 0.45],
    W: '#ffffff',
    Y: '#fff0b0',
    y: '#ffd25e',
    g: '#e0a93a',
    o: '#b07c22',
    d: '#7a5216',
    D: '#45300c',
    h: '#ffc2b8',
    f: '#ff6a52',
    e: '#e0362a',
    r: '#b01f18',
    b: '#7a120d',
    a: '#430806',
    u: ['#b277ff', 0.42],
    U: ['#b277ff', 0.18],
    P: '#e2c9ff',
    V: '#b277ff',
  },
  [
    '................UuuuuuuuuU.f............',
    '...............UukkkkkkkkuUh............',
    '.............UUukaarrrrbbfhWhf..........',
    '............UuukaaeeeeebbbkhU...........',
    '...........UukkbaeWheeeebbrfuU..........',
    '..........UukkbbbeheeeefrrrkkuU.........',
    '..........UukybbbbeeeefrrrrgkuU.........',
    '..........UukgkbrrrreeffffrokuU.........',
    '.....V....UukkkkrrreeeefffkkkuU.........',
    '....VPV....UukkWWrreeeeffggkuU..........',
    '.....V......UukWWWWWYYyygggkuU..........',
    '...........UukkWWWWWYYyyggkkuU..........',
    '..........UukWWWWWWWYYyyggYYkuU.........',
    '.........UukWWWWWWWWYYyygYYyykuU........',
    '........UukWWWWYYYYYYYYWYYYyyykuU.......',
    '.......UukWWWWYyggggyYYYYYyyyygkuU......',
    '.......UukWWWYyoDDDdkgyYYYyyygggkuU.....',
    '......UukWWWYydDDDDkukyYYYYyggggkuU.....',
    '......UukWWWYoDDDDkuUukyYYYygggookuU....',
    '.....UukYWWYyDDDDDkuUukyYYYyoooookuU....',
    '.....UukYWWYgDDDDkuU.UukYYYygooookuU....',
    '.....UukYWYYgDDDDkuU.UukYYYyoooookuU....',
    '.....UukYYYYgddddkuU.UukYYYyoddddkuU....',
    '.....UukYYYYyddookuU.UukWYygoddddkuU....',
    '.....UukYYYYyooogkuU.UukWYygdddddkuU....',
    '.....UukyYYYYgggyYkuUukWWYygdDdddkuU....',
    '......UukYYYYYgyyYkuUukWYygoDDDDdkuU....',
    '......UukyYYYYYyYYWkukWWYygdDDDDkuU.V...',
    '.......UukyyYYYWYYWWkWWYygoDDDDDkuUVPV..',
    '.......UukyyyYYoWoWoWoYygoDDDDDkuU..V...',
    '........UukgyyyoyYyYyoygodDDDDkuU.......',
    '.........UukggyoDyoyDogodDDDDkuU........',
    '..........UukoggoyDyoodDDDDDkuU.........',
    '...........UukkooooodDddDDkkuU..........',
    '...........zzzzkkkkkkkkkkkzzzzz.........',
    '.........zzzzzzzzzzzzzzzzzzzzzzzz.......',
    '..........zzzzzzzzzzzzzzzzzzzzzz........',
    '................zzzzzzzzzz..............',
    '........................................',
    '........................................',
  ],
);

/** Anelão de ouro em 3/4 (aro com volume de toro), rubi facetado no engaste com garras e cabeça de leão gravada embaixo do aro. */
export function AnelIcon({ className = 'w-10 h-10' }) {
  return <PixelIcon className={className} layers={ANEL} />;
}

// 4. MÃO GRANDE (mítico)
// k contorno · z sombra · D d S s l L pele · N n x unhas · o y Y r R joias · e E c C punho · w v velocidade · u U brilho mítico
const MAO_GRANDE = pixelArt(
  {
    k: '#0b0806',
    z: ['#000000', 0.45],
    D: '#3a2113',
    d: '#683e25',
    S: '#955e39',
    s: '#c3865a',
    l: '#e0a878',
    L: '#f5cfa0',
    N: '#efe3c4',
    n: '#c2b088',
    x: '#2e2116',
    o: '#7a5216',
    y: '#d6a13a',
    Y: '#ffe08a',
    r: '#c8261d',
    R: '#ff6b5c',
    e: '#857d6c',
    E: '#bdb49c',
    c: '#e2dac4',
    C: '#fbf6e8',
    w: ['#fff1c9', 0.85],
    v: ['#ffcf4a', 0.75],
    u: ['#ffcf4a', 0.45],
    U: ['#c8261d', 0.32],
    W: '#ffffff',
  },
  [
    '.....Y.UUuUU.UukLlkuUUuuuuU.............',
    '.....YUuukuuUukxxxxkuukkkkuU........R...',
    '.....UukklkkuklNNnnDkkLxxxkuU.......Y...',
    '.Y..UukLxxxdkklNNnnDkkLNxxDkuU....RYWYR.',
    '..Y.UukLxnndkklNNnnDkkLNnnDkuUU.....Y...',
    '....UuklNnnSkukNNnnDklNNnnDkuUuU....R...',
    '....UuksNnnSkukllsSDklNnndkuUukuU.......',
    '.....UuklNnndkkllsSDkLLnndkuukLkuUUUUU..',
    '.....UuklNlsdkklsSdDkLllSdkukxxxkuuuuuU.',
    '.....UuklllsSkkllsSDkLsSdDkkLNnnDvvwwwuU',
    'YY...UukslSSSkkllsSdkLlsSDkkLNnnkuuuuuU.',
    '......UukllsSdkllsSdkLlsSDkLNnnDkuUUUU..',
    '......UuklllsdkllsSDYYrryokLLnnDkuUUUUU.',
    '...UUUUuklYYyyklllSDYYRRokkLsddkuUuuuuuU',
    '..UuuuUukYYYySkllsSDlllsdkLLlSDkuuvvwwwu',
    '.UukkkuUukllsSDllsSDllsSDkYYsdkuUUuuuuuU',
    'UukLxlkuuksssSDllsSDllsSDlLYyokuU.UUUUU.',
    'ukLxxnskuksssSDllsSDllsdDllsSDkuU.......',
    'ukxxnnnskksssSdLlsslslslSllSDkuU.UUUUUU.',
    'uksNNnnnskLlslLlLlLlLslsllsdDkuUUuuuuuuU',
    'UukSNNnlsslLlLlLslslslSsSssddkuUuvvwwwwu',
    '.UukSNsSSsslLlLlLlLslslSsSsdSkuUUuuuuuuU',
    '..UukSsSllssslslslSsSsSsdSdSDdkuUUUUUUU.',
    '...UukSssllssslslslslSsSsdSdSkuU..UUUU..',
    '....UukSssllsSSsSsSsdSdSdSDdDkuU.UuuuuU.',
    '.Y...UukSsssssSslSsSsdSdSdSDdkuUUuvvwwuU',
    'Y.....UukSSsssssdSdSdSDdDdDdkuU..UuuuuU.',
    '.......UukSSsssSsSsdSdSDdDdkuU....UUUU..',
    '........UukSSSdSdSDdDdDdDDkuU...........',
    '.........UukkkoYoYoYoYoYoYkuU...........',
    '..........UukkyoyoyoyoyoyokkuU..........',
    '.........UukCCCClSlSsdsdCCCCkuU.........',
    '.........UukccccccccccccccEEkuU.........',
    '.........UukccccccccccccYyEEkuU.........',
    '.........UukccccccccccccyoEEkuU.........',
    '.........UukccccccccccccccEEkuU.........',
    '.........zzkeeeeeeeeeeeeeeeekzz.........',
    '.........zzzkkkkkkkkkkkkkkkkzzz.........',
    '...........UuuzzzzzzzzzzzzuuU...........',
    '............UUUUUUUUUUUUUUUU............',
  ],
);

/** Mão de malandro no meio do tapa: unhas sujas, anelão de pedra, aliança, pulseira de ouro, linhas de velocidade e marcas de impacto. */
export function MaoGrandeIcon({ className = 'w-10 h-10' }) {
  return <PixelIcon className={className} layers={MAO_GRANDE} />;
}

// 5. RELÓGIO QUEBRADO (mítico)
// k contorno · z sombra · D d o g y Y W ouro · C c b B mostrador · T h marcas e ponteiros · r R m seta · u U brilho mítico
const RELOGIO = pixelArt(
  {
    k: '#0b0806',
    z: ['#000000', 0.45],
    W: '#ffffff',
    Y: '#fff0b0',
    y: '#ffd25e',
    g: '#e0a93a',
    o: '#b07c22',
    d: '#7a5216',
    D: '#45300c',
    C: '#fbf3dc',
    c: '#eadcb6',
    b: '#cbb98d',
    B: '#9c8a62',
    T: '#3a2a1a',
    h: '#1c1917',
    r: '#c8261d',
    R: '#ff6b5c',
    u: ['#ffcf4a', 0.42],
    U: ['#c8261d', 0.3],
  },
  [
    '.................UukkkkkkuUUUUU.........',
    '................UukWWWYygkuuuuuUU.......',
    '...............UukWWYYyggokkkkkuuUU.....',
    '......r........UukWYkkkkodkYoYokkuuU....',
    '......Y........UukYykkkkdDogdgdYokkuU...',
    '....rYWYr......UukyggoddDDdkkkkgdYgkuU..',
    '......Y.........UukgodDDDkkuuuukkgokuU..',
    '......r.......UUUukyoyoyokuUUUUuukYgkuU.',
    '............UUuuuukyoyoyokuU...UukgokuU.',
    '...........UuukkkkkyoyoyokuU....UukYgkuU',
    '..........UukkRRrrkkygookuU.....UukodkuU',
    '.........UukRRrrrrkkygookuUU.....UukYgku',
    '........UukRrrrrkkukkkkkkuuuU.U..Uukodku',
    '.......UukRrrrkkkkkWWWWWYkkkuUuU.UukYgku',
    '......UukRrrkkukWWYyggggyYYykukuUuukodku',
    '.....UukRrrkuukWYgdDWWbbdoyYykWkukkkkkuU',
    '....UukRRrkuukWydDbbbCWWWbogyWkukgyyyoku',
    '....UukRrrkukWyDbbCCCCCcCWWcWYykukkokkuU',
    '...UukRRrkukWYdhhhCTcCTCTcbWbyYgkuukuuU.',
    '...UukRrrkukWgDbCChhCcCcCcWbWyYykuUuUU..',
    '...UukRrkukWYdbCCTcChCccbWTcWbyyokuU....',
    '..UukRRrkukWyDbCCCCchcCcWbcbcWyYokuU....',
    '..UukRRrkukWgbbCcCcCcyocbcbbBWBYodkuU...',
    '..UukRRrkukYgbbCTTCcCodbcbTTbWbYodkuU...',
    '..UukRRrkukYybbCcCcchhbcbbBbBbWYodkuU...',
    '..UukRRrkukYyobcCchhhbcbcbbBbBWYddkuU...',
    '...UukRRkukyYobCcThcbcbbBbTbBBWyDdkuU...',
    '...UukRRrkukYygbCccbcbcbbBbBbWWoddkuU...',
    '...UukRRRkukyYgcbcbTbbTbTbBBBWyDdkuU....',
    '....UukRRrkukyYycbcbcbbBbBbBWYdddkuU....',
    '....UukRRRkkkDyYyybbBbBbBBWWYdDDDkuU....',
    '.....UukRRRRRRDgyYYYbBbBWWWydDDDkuU.....',
    '......UukRRRRRRRogyYYWWWYyoDDDDkuU......',
    '.......UukrrrrrkDDDdoooddDDDDDkuU.......',
    '........UukrrrrkkkDDDDDDDDDDkkuU........',
    '........UzkrrrkzzzkkDDDDDDkkzzzzz.......',
    '........zzzkrrkzzzzzkkkkkkzzzzzzzz......',
    '..........Uzkkzzzzzzzzzzzzzzzzz.........',
    '...........UuuU.....UUUUUU..............',
    '............UU..........................',
  ],
);

/** Relógio de bolso de ouro com corrente, vidro trincado, ponteiros tortos e a seta de voltar (desfaz a última jogada do rival). */
export function RelogioIcon({ className = 'w-10 h-10' }) {
  return <PixelIcon className={className} layers={RELOGIO} />;
}

// 6. BARBANTE MÁGICO (mítico)
// k contorno · z sombra · D d s S l L barbante · I i j J v p pedras · r R fio · Y W y faíscas · u U brilho mítico
const BARBANTE = pixelArt(
  {
    k: '#0b0806',
    z: ['#000000', 0.45],
    D: '#4a3420',
    d: '#76573a',
    s: '#a3815a',
    S: '#cba878',
    l: '#e8cc9c',
    L: '#f7e6c2',
    I: '#fbf6e4',
    i: '#e9dfbf',
    j: '#c3b48c',
    J: '#8f8160',
    v: '#5b4d35',
    p: '#1c1917',
    r: '#c8261d',
    Y: '#ffcf4a',
    W: '#ffffff',
    y: '#fff0b0',
    u: ['#ffcf4a', 0.42],
    U: ['#c8261d', 0.3],
  },
  [
    '....................UukkkkkkkkkuU.......',
    '..............UUUUUUukkkkkkkkkkkuUUUUUU.',
    '.............UuuuuuuukkpIIIpkJkkuuuuuruU',
    '............UukkkkkkkkkIiiijkJkkkkkkkYku',
    '...........UukkkkkkkkkkpiiipkJkkkkkrYWYr',
    '...........UukkIIIIpkJkIiiijkJkpIIIpkYkk',
    '...........UukkIiiijkJkpjjjpkJkIiiijkrkk',
    '...........UukkIiiijkJkvvvvvkJkIiiijkJkk',
    '........r..UukkIiiijkJkpIIIpkJkIiiijkJkk',
    '........Y..UukkpjjjjkJkIiiijkJkpjjjpkJkk',
    '......rYWYrUukkvvvvvkJkpiiipkJkvvvvvkJkk',
    '........Y..UukkpIIIpkJkIiiijkJkIIIIIkJkk',
    '........r..UukkIiiijkJkpjjjpkJkIiiijkJkr',
    '...........UukkIipijkJkkkkkkkJkIipijkJrk',
    '..........UUukkIiiijkJkJJJJJJrrriiijrrkk',
    '........UUuuukkpjjjpkJkkkkkrrrkrrrrrrJkk',
    '......UUuukkkkkkkkkkkJkkkkrrkkkkkkkkkJkk',
    '.....UuukkLLSSsJJJJJJJkkkrYUukkJJJJJJJkk',
    '....UukkLLLSLLlsSkkkkkkkrYyYukkkkkkkkkkk',
    '...UukSLlLLSLlSlSSskkkkrr.Y.Uukkkkkkkkku',
    '..UukLLLlLLSLlSlSSrrrrrU.....UuuuuuuuuuU',
    '..UukSLLLLLSLlslSddskuU.......UUUUUUUUU.',
    '.UukLSLLSLLSLlslSddsDkuU................',
    '.UukLSLLSLLSlLsSlSssDkuU................',
    '.UukLSLLSLLSslSsSsSsDkuU................',
    '.UukllSLSSLlsSlSddDDdkuU................',
    '.UukslSllsllSsSSsssddkuU................',
    '.UukslllllsSlSdssssdDkuU................',
    '.UuklSlsSSsdSSsDDDdDDkuU................',
    '.UukddSSdSSddsssddDDDkuU................',
    '..UukSdSSdsssDdddddDkuU.................',
    '..UukssdSsDssdDDDDDDkuU.................',
    '...UukDsDsdDdddDDDDkuU..................',
    '....UukkdDddDDDDDkkuU...................',
    '.....zzzkkDDDDDkkzzzzzzzz...............',
    '...zzzzzzzkkkkkzzzzzzzzzzzz.............',
    '....zzzzzzzzzzzzzzzzzzzzzz..............',
    '..........Uzzzzzzzz.....................',
    '........................................',
    '........................................',
  ],
);

/** Novelo de barbante cujo fio encantado amarra 3 pedras (você vê 3 e escolhe uma), com faíscas mágicas. */
export function BarbanteIcon({ className = 'w-10 h-10' }) {
  return <PixelIcon className={className} layers={BARBANTE} />;
}
