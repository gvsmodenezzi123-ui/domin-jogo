// src/components/art/UiIcons.jsx
// Ícones de interface (40x40) em pixel art vetorial: moeda, coração de vida, alto-falante,
// menu, lâmpada pendente do boteco e o olho violeta do rival.
//
// Cada ícone é um mapa de caracteres 40x40 (um caractere = um pixel da grade; '.' é
// transparente) traduzido para <rect>s uma vez só, no carregamento do módulo. O
// contorno tem 2 pixels e as luzes/sombras vêm em blocos largos para o ícone continuar
// legível de 10px a 160px.
import { PixelSvg } from './PixelSvg.jsx';

/** Converte um mapa de caracteres em <rect>s, juntando pixels iguais em retângulos maiores. */
function mapToRects(rows, palette, prefix) {
  const used = rows.map((row) => Array.from(row, () => false));
  const sameRun = (y, x0, x1, ch) => {
    for (let x = x0; x <= x1; x += 1) if (rows[y][x] !== ch || used[y][x]) return false;
    return true;
  };
  const rects = [];
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x += 1) {
      const ch = row[x];
      if (used[y][x] || !palette[ch]) continue;
      let x1 = x;
      while (x1 + 1 < row.length && row[x1 + 1] === ch && !used[y][x1 + 1]) x1 += 1;
      let y1 = y;
      while (y1 + 1 < rows.length && sameRun(y1 + 1, x, x1, ch)) y1 += 1;
      for (let yy = y; yy <= y1; yy += 1) for (let xx = x; xx <= x1; xx += 1) used[yy][xx] = true;
      const [fill, opacity] = palette[ch].split('@');
      rects.push(
        <rect key={`${prefix}${x}-${y}`} x={x} y={y} width={x1 - x + 1} height={y1 - y + 1} fill={fill} opacity={opacity} />,
      );
    }
  });
  return rects;
}

// Coração: vermelho sangue, luz rosada em cima à esquerda, sombra vinho embaixo.
const HEART_PAL = {
  k: '#140606', // contorno
  w: '#fff1ea', // brilho especular
  R: '#ff8f7f', // luz rosada
  L: '#e5473a', // meia-luz
  r: '#c8261d', // vermelho sangue
  d: '#7f1712', // sombra vinho
  D: '#4f0e0b', // oclusão
};

// Coração partido: os mesmos tons, escurecidos e acinzentados.
const HEART_BROKEN_PAL = {
  k: '#120707', // contorno
  w: '#c4b2ad', // brilho apagado
  R: '#a0807b', // luz acinzentada
  L: '#82605c', // meia-luz
  r: '#674643', // base acinzentada
  d: '#4a2f2d', // sombra
  D: '#321e1c', // oclusão
};

// Coração cheio, gordinho, com brilho no lóbulo esquerdo.
const HEART_FULL_MAP = [
  '........................................',
  '........................................',
  '........................................',
  '..........kkk..............kkk..........',
  '.......kkkkkkkkk........kkkkkkkkk.......',
  '......kkkkLLLkkkkk....kkkkkrrrkkkk......',
  '.....kkLLLLLLLLLkkk..kkkrrrrrrrrrkk.....',
  '....kkLLLRwwRLLLLkk..kkrrrrLLrrrrrkk....',
  '...kkLLLwwRRRRLLLrkkkkrrrrLLLLrrrrdkk...',
  '...kkLLLwwRRRRLLLrrkkrrrrLLLLLrrrrdkk...',
  '..kkLLLLRRRRRRLLLrrrrrrrrLLLLLrrrdddkk..',
  '..kkLLLLRRRRRRLLLrrrrrrrrrLLLrrrrdddkk..',
  '..kkLLrLLRRRRLLLLrrrrrrrrrrrrrrrddddkk..',
  '..kkLLrLLLLLLLLLLrrrrrrrrrrrrrrddddDkk..',
  '..kkLrrrLLLLLLLLrrrrrrrrrrrrrrrddddDkk..',
  '..kkLrrrrLLLLLLrrrrrrrrrrrrrrrddddDDkk..',
  '...kkrrrrrrrrrrrrrrrrrrrrrrrrddddDDkk...',
  '...kkrrrrrrrrrrrrrrrrrrrrrrrdddddDDkk...',
  '....kkrrrrrrrrrrrrrrrrrrrrrdddddDDkk....',
  '.....kkrrrrrrrrrrrrrrrrrrrdddddDDkk.....',
  '.....kkrrrrrrrrrrrrrrrrrrdddddDDDkk.....',
  '......kkrrrrrrrrrrrrrrrrdddddDDDkk......',
  '.......kkrrrrrrrrrrrrrrdddddDDDkk.......',
  '........kkrrrrrrrrrrrrdddddDDDkk........',
  '.........kkrrrrrrrrrrrddddDDDkk.........',
  '..........kkrrrrrrrrrddddDDDkk..........',
  '...........kkrrrrrrrddddDDDkk...........',
  '............kkrrrrrdddddDDkk............',
  '.............kkrrrdddddDDkk.............',
  '..............kkrdddddDDkk..............',
  '..............kkdddddDDDkk..............',
  '...............kkdddDDDkk...............',
  '................kkdDDDkk................',
  '.................kkDDkk.................',
  '..................kkkk..................',
  '...................kk...................',
  '........................................',
  '........................................',
  '........................................',
  '........................................',
];

// Coração rachado ao meio em zigue-zague; a metade direita caiu um pouco.
const HEART_BROKEN_MAP = [
  '........................................',
  '........................................',
  '........................................',
  '.........kkk............................',
  '......kkkkkkkkk.........................',
  '.....kkkkLLLkkkkk...........kkk.........',
  '....kkLLLLLLLLLkkk.......kkkkkkkkk......',
  '...kkLLLRwwRLLLDkk.....kkkkkrrrkkkk.....',
  '..kkLLLwwRRRRLLDkk....kkkrrrrrrrrrkk....',
  '..kkLLLwwRRRRLLDkk....kkLrrrLLrrrrrkk...',
  '.kkLLLLRRRRRRLDkk....kkLrrrLLLLrrrrdkk..',
  '.kkLLLLRRRRRRDkk.....kkLrrLLLLLrrrrdkk..',
  '.kkLLrLLRRRRLDkk....kkLrrrLLLLLrrrdddkk.',
  '.kkLLrLLLLLLLDkk...kkLrrrrrLLLrrrrdddkk.',
  '.kkLrrrLLLLLLLDkk..kkLrrrrrrrrrrrddddkk.',
  '.kkLrrrrLLLLLLrDkk.kkLrrrrrrrrrrddddDkk.',
  '..kkrrrrrrrrrrrrDkk.kkLrrrrrrrrrddddDkk.',
  '..kkrrrrrrrrrrrrrDkk.kkLrrrrrrrddddDDkk.',
  '...kkrrrrrrrrrrrrDkk..kkLrrrrrddddDDkk..',
  '....kkrrrrrrrrrrDkk....kkLrrrdddddDDkk..',
  '....kkrrrrrrrrrrDkk....kkLrrdddddDDkk...',
  '.....kkrrrrrrrrDkk....kkLrrdddddDDkk....',
  '......kkrrrrrrDkk.....kkLrdddddDDDkk....',
  '.......kkrrrrrDkk....kkLrdddddDDDkk.....',
  '........kkrrrrrDkk..kkLrdddddDDDkk......',
  '.........kkrrrrrDkk.kkLdddddDDDkk.......',
  '..........kkrrrrDkk..kkLdddDDDkk........',
  '...........kkrrrrDkk..kkLdDDDkk.........',
  '............kkrrrDkk..kkLDDDkk..........',
  '.............kkrdDkk...kkLDkk...........',
  '.............kkdDkk....kkLkk............',
  '..............kkkk.....kkkk.............',
  '...............kkk....kkLkk.............',
  '................kk...kkLkk..............',
  '.................k...kkkk...............',
  '.....................kkk................',
  '.....................kk.................',
  '.....................k..................',
  '........................................',
  '........................................',
];

const HEART_FULL_RECTS = mapToRects(HEART_FULL_MAP, HEART_PAL, 'hf');
const HEART_BROKEN_RECTS = mapToRects(HEART_BROKEN_MAP, HEART_BROKEN_PAL, 'hb');

/** Coração de vida; `broken` mostra o coração rachado e apagado. */
export function HeartIcon({ className = 'w-6 h-6', broken = false }) {
  return <PixelSvg className={className}>{broken ? HEART_BROKEN_RECTS : HEART_FULL_RECTS}</PixelSvg>;
}

// Moeda: ouro velho do boteco.
const COIN_PAL = {
  k: '#1a1206', // contorno
  w: '#fffbe8', // brilho especular
  Y: '#ffe7a3', // luz
  m: '#f0c869', // meia-luz
  y: '#d4a64a', // ouro base
  d: '#8f6a24', // sombra
  D: '#5e4416', // sombra funda
  e: '#b8892f', // espessura (luz)
  K: '#3d2b0c', // serrilhado no escuro
  E: '#6e4f1a', // serrilhado
};

// Moeda em leve perspectiva: face com aro, $ em relevo e a espessura serrilhada à direita.
const COIN_MAP = [
  '........................................',
  '........................................',
  '........................................',
  '........................................',
  '..............kkkkkkkkkkkk..............',
  '............kkkkkkkkkkkkkkkk............',
  '...........kkkdddddddmmmeekkk...........',
  '..........wwdddyyyyydddmmEEEkk..........',
  '.........kwwdmmmyyyyyyddmDeeekk.........',
  '........wwwwwwmmmmyyyyyyymDeeekk........',
  '.......kwwwwwwmmmmmyyyyyymDEEEkk........',
  '.......kkdwwmmmmmmmyyyyyyymDeeekk.......',
  '......kkddwwmmmmmmmmyyyyyymDeeekk.......',
  '......kkdmmmmmmmmmmmyyyyyyyDDDDkk.......',
  '......kkdmmmmmmmwwmmyyyyyyyyDdddkk......',
  '......kkdmmmmmwwwYYwyyyyyyyyDdddkk......',
  '.....kkddmmmmwwYYYYYYyyyyyyyDDDDkk......',
  '.....kkdmmmmwwYdYYdYYYyyyyYyDdddkk......',
  '.....kkdymmmwYYdwYdmdddyyyYyDdddkk......',
  '.....kkdymmmmYYYwYYmyyyyyyYyDDDDkk......',
  '.....kkdymmmmmYYYYYYwyyyyyYyDdddkk......',
  '.....kkdyymmmmmdYYYYYYyyyyYyDdddkk......',
  '.....kkdyyymmmmmwYdYYYdyyyYdDDDDkk......',
  '.....kkddyyywwwmwYdwYYdyyyYdDdddkk......',
  '......kkdyyyyYYYwYYwYddyyyYdDdddkk......',
  '......kkdyyyyyYYYYYYddyyyYYdDDDDkk......',
  '......kkdyyyyyydYYdddyyyyYdDdddkk.......',
  '......kkyyyyyyyyyddyyyyyyYdDDDDkk.......',
  '.......kkyyyyyyyyyyyyyyyYYdDKKKkk.......',
  '.......kkyyyyyyyyyyyyyyyYdDDDDkk........',
  '........kkyyyyyyyyyyyyyYYdDDDDkk........',
  '.........kkyyyyyyyyyyyYYdDKKKkk.........',
  '..........kkyyYyyyyyYYYddDDDkk..........',
  '...........kkkYYYYYYYdddDDkkk...........',
  '............kkkkkkkkkkkkkkkk............',
  '..............kkkkkkkkkkkk..............',
  '........................................',
  '........................................',
  '........................................',
  '........................................',
];

const COIN_RECTS = mapToRects(COIN_MAP, COIN_PAL, 'c');

/** Moeda de ouro (saldo). */
export function CoinIcon({ className = 'w-6 h-6' }) {
  return <PixelSvg className={className}>{COIN_RECTS}</PixelSvg>;
}

// Osso/creme dos botões (alto-falante e menu), com o X vermelho do mudo.
const BONE_PAL = {
  k: '#0b0705', // contorno
  H: '#fffdf6', // brilho
  W: '#fff6dc', // luz
  b: '#e9dcb4', // osso
  s: '#b5a37a', // sombra
  S: '#7d6c4b', // sombra funda
  R: '#ff8a7a', // X: luz
  r: '#d9473c', // X: vermelho
  q: '#8f231c', // X: sombra
};

// Alto-falante de rádio antigo: ímã com rebite e cone com o aro da boca.
const SPEAKER_MAP = [
  '........................................',
  '........................................',
  '........................................',
  '........................................',
  '........................................',
  '....................k...................',
  '...................kk...................',
  '..................kkk...................',
  '.................kkkk...................',
  '...............kkkHkk...................',
  '..............kkkSHkk...................',
  '.............kkWWSHkk...................',
  '............kkWWWSWkk...................',
  '....kkkkkkkkkWWbbSWkk...................',
  '....kkkkkkkkWWbbbSWkk...................',
  '....kkWWWWWSWsbbbSWkk...................',
  '....kkbbbbbSssbbbSWkk...................',
  '....kkbbbbbSssbbbSWkk...................',
  '....kkbssSbSssbbbSWkk...................',
  '....kkbSSSbSssbbbSWkk...................',
  '....kkbSSWbSssbbbSWkk...................',
  '....kkbbbbbSssbbbSWkk...................',
  '....kkbbbbbSssbbbSWkk...................',
  '....kkbbbbbSssbbbSWkk...................',
  '....kksssssSssbbbSWkk...................',
  '....kkkkkkkkssbbbSWkk...................',
  '....kkkkkkkkkssbbSskk...................',
  '............kksssSskk...................',
  '.............kkssSskk...................',
  '..............kkkSskk...................',
  '...............kkkskk...................',
  '.................kkkk...................',
  '..................kkk...................',
  '...................kk...................',
  '....................k...................',
  '........................................',
  '........................................',
  '........................................',
  '........................................',
  '........................................',
];

// Duas ondas de som saindo do cone.
const SPEAKER_WAVES_MAP = [
  '........................................',
  '........................................',
  '........................................',
  '........................................',
  '........................................',
  '..........................k.............',
  '.........................kHk............',
  '........................kWHHk...........',
  '.......................kWWWHHk..........',
  '........................kWWWHHk.........',
  '......................kk.kWWWHk.........',
  '.....................kHHk.kWWHHk........',
  '....................kWWHk..kWWHk........',
  '....................kWWHHk.kWWHHk.......',
  '.....................kWWHHk.kWWHk.......',
  '......................kWWHk.kWWHk.......',
  '......................kWWHk.kWWHHk......',
  '......................kWWHHkkWWWHk......',
  '.......................kbbbk.kbbbk......',
  '.......................kbbbk.kbbbk......',
  '.......................kbbbk.kbbbk......',
  '.......................kbbbk.kbbbk......',
  '......................kbbbbkkbbbbk......',
  '......................kssSk.kssSSk......',
  '......................kssSk.kssSk.......',
  '.....................kssSSk.kssSk.......',
  '....................kssSSk.kssSSk.......',
  '....................kssSk..kssSk........',
  '.....................kSSk.kssSSk........',
  '......................kk.ksssSk.........',
  '........................ksssSSk.........',
  '.......................ksssSSk..........',
  '........................ksSSk...........',
  '.........................kSk............',
  '..........................k.............',
  '........................................',
  '........................................',
  '........................................',
  '........................................',
  '........................................',
];

// X vermelho do mudo, no lugar das ondas.
const SPEAKER_X_MAP = [
  '........................................',
  '........................................',
  '........................................',
  '........................................',
  '........................................',
  '........................................',
  '........................................',
  '........................................',
  '........................................',
  '........................................',
  '........................................',
  '.....................kkkkk.......kkkkk..',
  '....................kkqqqkk.....kkqqqkk.',
  '....................kqqqqqkk...kkqqqqRk.',
  '....................kqqrrrqkk.kkqqqrRRk.',
  '....................kkrrrrrqkkkqqqrRRkk.',
  '.....................kkrrrrrqkqqqrRRkk..',
  '......................kkrrrrrqqqrRRkk...',
  '.......................kkrrrrrqrRRkk....',
  '........................kkrrrrrrRkk.....',
  '........................kkrrrrrrrkk.....',
  '.......................kkqqrrrrrrrkk....',
  '......................kkqqqrRrrrrrqkk...',
  '.....................kkqqqrRRkrrrrrqkk..',
  '....................kkqqqrRRkkkrrrrrqkk.',
  '....................kqqqrRRkk.kkrrrrrRk.',
  '....................kqqrRRkk...kkrrrRRk.',
  '....................kkRRRkk.....kkRRRkk.',
  '.....................kkkkk.......kkkkk..',
  '........................................',
  '........................................',
  '........................................',
  '........................................',
  '........................................',
  '........................................',
  '........................................',
  '........................................',
  '........................................',
  '........................................',
  '........................................',
];

const SPEAKER_RECTS = mapToRects(SPEAKER_MAP, BONE_PAL, 's');
const SPEAKER_WAVES_RECTS = mapToRects(SPEAKER_WAVES_MAP, BONE_PAL, 'sw');
const SPEAKER_X_RECTS = mapToRects(SPEAKER_X_MAP, BONE_PAL, 'sx');

/** Alto-falante (som ligado); `muted` troca as ondas por um X vermelho. */
export function SpeakerIcon({ className = 'w-6 h-6', muted = false }) {
  return (
    <PixelSvg className={className}>
      {SPEAKER_RECTS}
      {muted ? SPEAKER_X_RECTS : SPEAKER_WAVES_RECTS}
    </PixelSvg>
  );
}

// Menu: três barras de osso em relevo (luz em cima, sombra embaixo).
const MENU_MAP = [
  '........................................',
  '........................................',
  '........................................',
  '........................................',
  '........................................',
  '........................................',
  '.....kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.....',
  '....kkWWWWWWWWWWWWWWWWWWWWWWWWWWWWkk....',
  '....kWWHHWWWWWWWWWWWWWWWWWWWWWWWWWSk....',
  '....kWbbbbbbbbbbbbbbbbbbbbbbbbbbbbSk....',
  '....kWbbbbbbbbbbbbbbbbbbbbbbbbbbbbSk....',
  '....kWssssssssssssssssssssssssssssSk....',
  '....kkSSSSSSSSSSSSSSSSSSSSSSSSSSSSkk....',
  '.....kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.....',
  '........................................',
  '........................................',
  '.....kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.....',
  '....kkWWWWWWWWWWWWWWWWWWWWWWWWWWWWkk....',
  '....kWWHHWWWWWWWWWWWWWWWWWWWWWWWWWSk....',
  '....kWbbbbbbbbbbbbbbbbbbbbbbbbbbbbSk....',
  '....kWbbbbbbbbbbbbbbbbbbbbbbbbbbbbSk....',
  '....kWssssssssssssssssssssssssssssSk....',
  '....kkSSSSSSSSSSSSSSSSSSSSSSSSSSSSkk....',
  '.....kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.....',
  '........................................',
  '........................................',
  '.....kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.....',
  '....kkWWWWWWWWWWWWWWWWWWWWWWWWWWWWkk....',
  '....kWWHHWWWWWWWWWWWWWWWWWWWWWWWWWSk....',
  '....kWbbbbbbbbbbbbbbbbbbbbbbbbbbbbSk....',
  '....kWbbbbbbbbbbbbbbbbbbbbbbbbbbbbSk....',
  '....kWssssssssssssssssssssssssssssSk....',
  '....kkSSSSSSSSSSSSSSSSSSSSSSSSSSSSkk....',
  '.....kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.....',
  '........................................',
  '........................................',
  '........................................',
  '........................................',
  '........................................',
  '........................................',
];

const MENU_RECTS = mapToRects(MENU_MAP, BONE_PAL, 'm');

/** Ícone de menu (hambúrguer). */
export function MenuIcon({ className = 'w-6 h-6' }) {
  return <PixelSvg className={className}>{MENU_RECTS}</PixelSvg>;
}

// Lâmpada: metal verde-escuro, aro iluminado e a lâmpada incandescente com halo.
const LAMP_PAL = {
  k: '#070806', // contorno
  n: '#2a2c24', // fio (reflexo)
  h: '#7a8a5a', // reflexo do metal
  l: '#46523a', // metal (luz)
  L: '#2d3524', // metal verde
  S: '#1f251a', // metal (sombra)
  Z: '#151912', // metal (sombra funda)
  R: '#d8cf96', // aro: luz
  r: '#9aa06a', // aro
  q: '#5c6640', // aro: sombra
  o: '#d9a441', // interior iluminado
  O: '#e8a53c', // lâmpada: borda quente
  y: '#ffd98a', // lâmpada
  w: '#fff3c8', // lâmpada (miolo)
  W: '#ffffff', // incandescência
  a: '#ffd98a@0.14', // halo (borda)
  b: '#ffd98a@0.3', // halo
  A: '#ffe7a8@0.5', // halo (perto da lâmpada)
};

// Lâmpada pendente do boteco: fio, soquete, cúpula cônica, boca iluminada e a lâmpada acesa.
const LAMP_MAP = [
  '...................nk...................',
  '...................nk...................',
  '...................nk...................',
  '...................nk...................',
  '...................nk...................',
  '...................nk...................',
  '................kkkkkkkk................',
  '................khlLLLLk................',
  '................kllLLLLk................',
  '................kllLLLLk................',
  '...............kkkkkkkkkk...............',
  '..............kkkkkkkkkkkk..............',
  '.............kkHhlLLLLSSSkk.............',
  '...........kkkHhllLLLLLSSSkkk...........',
  '..........kkkhHllLLLLLLSSSSkkk..........',
  '.........kkhhHhllLLLLLLSSSSSZkk.........',
  '.......kkkhhHhlllLLLLLLLSSSSSZkkk.......',
  '......kkkhhHhhlllLLLLLLLSSSSSSZkkk......',
  '.....kklhhhHhlllLLLLLLLLSSSSSSSZZkk.....',
  '....kklhhhHhhlllLLLLLLLLLSSSSSSSZZkk....',
  '...kkllhhHhhllllLLLLLLLLLSSSSSSSZZZkk...',
  '...kklhhhhhhllllLLLLLLLLLSSSSSSSSZZkk...',
  '..kkllhhhhhhlllLLLLLLLLLLSSSSSSSSZZZkk..',
  '..kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk..',
  '.kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.',
  '...oooooooyyyyyyyyyyyyyyyyyyyyooooooo...',
  '......ooooooyyyyywWwwyyOyyyyoooooo......',
  '..........aabbAywWWWwwyOOAbbaa..........',
  '..........aabAAywWWWwwyOOAAbaa..........',
  '..........aabAAywwWwwwyOOAAbaa..........',
  '..........aabAAywwwwwwOOOAAbaa..........',
  '..........aabbAyywwwwOOOOAbbaa..........',
  '..........aabbAAyyyyOOOOAAbbaa..........',
  '...........aabbAAOOOOOOAAbbaa...........',
  '...........aaabbAAAAAAAAbbaaa...........',
  '............aabbbAAAAAAbbbaa............',
  '.............aaabbbbbbbbaaa.............',
  '..............aaaabbbbaaaa..............',
  '................aaaaaaaa................',
  '........................................',
];

const LAMP_RECTS = mapToRects(LAMP_MAP, LAMP_PAL, 'l');

/** Lâmpada pendente do teto do boteco (mais larga que alta, centralizada na grade). */
export function LampIcon({ className = 'w-6 h-6' }) {
  return <PixelSvg className={className}>{LAMP_RECTS}</PixelSvg>;
}

// Olho do rival: íris violeta brilhante.
const EYE_PAL = {
  k: '#0b0705', // contorno / pálpebra
  w: '#f4ecd2', // branco do olho
  s: '#b8ab8f', // sombra da pálpebra
  u: '#6a36c2', // íris (borda)
  v: '#b277ff', // íris violeta
  V: '#dcbcff', // íris (luz)
  p: '#1a0b2e', // pupila
  W: '#ffffff', // brilho
};

// Olho do rival: amêndoa com pálpebra pesada, íris violeta e pupila escura.
const EYE_MAP = [
  '........................................',
  '........................................',
  '........................................',
  '........................................',
  '........................................',
  '........................................',
  '........................................',
  '........................................',
  '........................................',
  '........................................',
  '...............kkkkkkkkkk...............',
  '............kkkkkkkkkkkkkkkk............',
  '..........kkkkkkkkkkkkkkkkkkkk..........',
  '.........kkkkkkkuuuuuuuukkkkkkk.........',
  '.......kkkkkkuuuvvvvvvvvuuukkkkkk.......',
  '......kkkkkswuuvWWWvvvvvvuuwskkkkk......',
  '.....kkkkkwwuuvvWWppppvvvvuuwwkkkkk.....',
  '.....kkkswwwuvvvvppppppvvvvuwwwskkk.....',
  '....kkkkwwwwuvvvvppppppvvvvuwwwwkkkk....',
  '...kkswwwwwuuvvvvppppppvvvvuuwwwwwskk...',
  '...kkwwwwwwuuvvvvppppppvvvvuuwwwwwwkk...',
  '....kkwwwwwwuvvvvppppppvvvvuwwwwwwkk....',
  '.....kkwwwwwuvVVVppppppVVVVuwwwwwkk.....',
  '.....kkwwwwwuuvVVVppppVWVVuuwwwwwkk.....',
  '......kkkwwwwuuVVVVVVVWVVVuwwwwkkk......',
  '.......kkkwwwuuuVVVVVVVVVuuwwwkkk.......',
  '.........kkkwwuuuvVVVVVuuuwwkkk.........',
  '..........kkkkkwuuuuuuuuwkkkkk..........',
  '............kkkkkkkkkkkkkkkk............',
  '...............kkkkkkkkkk...............',
  '........................................',
  '........................................',
  '........................................',
  '........................................',
  '........................................',
  '........................................',
  '........................................',
  '........................................',
  '........................................',
  '........................................',
];

const EYE_RECTS = mapToRects(EYE_MAP, EYE_PAL, 'e');

/** Olho violeta do rival: marca as suas pedras que ele está vendo. */
export function EyeIcon({ className = 'w-6 h-6' }) {
  return <PixelSvg className={className}>{EYE_RECTS}</PixelSvg>;
}
