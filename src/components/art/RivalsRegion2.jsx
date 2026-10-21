// Retratos 40x40 dos rivais da Região 2 — Clube da Sinuca Clandestino.
// Luz quente de lâmpada vindo de cima/esquerda e um recorte de neon (rosa ou
// ciano) do outro lado. Cada retrato é desenhado como mapa de pixels: uma letra
// por pixel, cor na paleta do personagem ('.' é transparente). A camada base é
// o que não muda; por cima vem a camada do humor (idle, thinking, smug, hurt)
// e da boca falando. Enquadramento igual ao do Tio Zé (HighDensitySprites.jsx).
import { PixelSvg } from './PixelSvg.jsx';

/** Converte as linhas do mapa em retângulos (junta pixels iguais na linha e entre linhas). */
function bake(pal, [x0, y0, rows]) {
  const out = [];
  let open = new Map();
  rows.forEach((row, j) => {
    const next = new Map();
    for (let i = 0; i < row.length; ) {
      const ch = row[i];
      let n = 1;
      while (row[i + n] === ch) n += 1;
      if (ch !== '.') {
        const key = `${i}:${n}:${ch}`;
        const prev = open.get(key);
        if (prev) {
          prev.h += 1;
          next.set(key, prev);
        } else {
          const r = { x: x0 + i, y: y0 + j, w: n, h: 1, fill: pal[ch] };
          out.push(r);
          next.set(key, r);
        }
      }
      i += n;
    }
    open = next;
  });
  return out;
}

/** Retrato pronto: base + uma camada por humor (as "Talk" têm a boca aberta). */
function sprite(pal, base, moods) {
  const layers = {};
  for (const key of Object.keys(moods)) layers[key] = bake(pal, moods[key]);
  return { base: bake(pal, base), moods: layers };
}

function Layer({ rects }) {
  return rects.map((r) => <rect key={`${r.x}.${r.y}`} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.fill} />);
}

/** Camada do humor; falando abre a boca (menos no "hurt", que tem a careta própria). */
function moodLayer(moods, mood, isSpeaking) {
  if (mood === 'hurt') return moods.hurt;
  const key = mood === 'thinking' || mood === 'smug' ? mood : 'idle';
  return moods[isSpeaking ? `${key}Talk` : key];
}

function Portrait({ className, art, mood, isSpeaking }) {
  return (
    <PixelSvg className={className} viewBox="0 0 40 40">
      <rect x="6" y="4" width="28" height="34" fill="#090a0f" /> {/* Fundo de sombra da silhueta */}
      <Layer rects={art.base} />
      <Layer rects={moodLayer(art.moods, mood, isSpeaking)} />
    </PixelSvg>
  );
}


// ---------------------------------------------------------------------------
// 1. MARCÃO DO GUINCHO — "O Rebocador" (amarelo queimado)
// Boné de caminhoneiro com tela, barba cheia, pescoço de touro, colete refletivo
// com faixa prateada e a corrente do guincho com gancho no ombro. Neon ciano à direita.
// ---------------------------------------------------------------------------

const MARCAO_PAL = { k: '#0b0806', A: '#f2a24a', o: '#d9741c', O: '#9e4f16', Q: '#5e2c0a', n: '#141210', N: '#3e3833', y: '#ffd24a', Y: '#c8921e', E: '#c4742a', b: '#8f4a12', B: '#5c2e0a', L: '#d8996a', s: '#b97a52', S: '#8a5634', D: '#5e3820', h: '#7a5236', H: '#4e3220', j: '#2a1a10', w: '#efe3c2', p: '#120c08', g: '#fff8e0', m: '#2a0c08', t: '#e9dcc0', T: '#a8977a', r: '#c8261d', d: '#bfe6ff', e: '#6fb6e6', u: '#2d4f7a', U: '#1b3150', i: '#3f6696', V: '#f5cf4a', v: '#d9a521', W: '#9c7414', X: '#5c4a16', F: '#e0761c', c: '#e4e8ec', C: '#a9b1b8', x: '#5e666e', l: '#d6dade', G: '#8a929a', K: '#3a4048', q: '#46e6ff', Z: '#5fa9ad', R: '#3f8a90' };

const MARCAO = sprite(
  MARCAO_PAL,
  // base: boné com tela e emblema do gancho, barba, colete refletivo, corrente
  [
    1,
    2,
    [
      '..................kk..................',
      '............kkkkkOOOOkkkkk............',
      '...........kooooooooooooook...........',
      '.........kNnAAAAAAAAAAAAAOnkk.........',
      '........kNnNAAooooooooooOOknkk........',
      '.......kNnNnAAoyyyyQQyYoOOnknkk.......',
      '.......knNnNAAoyyyyyQyYoOOknknq.......',
      '.......kNnNnAAoyyQyyQyYoOOnknkq.......',
      '.......knNnNAAoYYYQQYYYoOOknknq.......',
      '.......kNnNnoOOOOOOOOOOOOOnknkq.......',
      '......kbEEEEEEEEEEEEbbbbbbbbbbbk......',
      '.....kbEEEEEEEbbbbbbbbbbbBBBBBBbq.....',
      '......kBBBBBBBBBBBBBBBBBBBBBBBBq......',
      '........kkDDDDDDDDDDDDDDDDDDkk........',
      '.........HS.....ss.Ss......Sj.........',
      '.........HL...HH.s..s......Sj.........',
      '.......SSHLL....ssLsss.....SjDS.......',
      '.......sSHLL....ssLsSs....SSjDZ.......',
      '.......sDHLLSSSSssLsSsSSSSSSjDZq......',
      '.......sDHLLLLssssLsSsssSSSSjDZq......',
      '.......sSHLLssssSLssSDsssSSSjDZ.......',
      '.......SShHHHshhhhhHHHHHsHHHRDS.......',
      '.........hHHHhhhhHHHHjjjjHHHR.........',
      '.........hhHHh...........jjHR.........',
      '.........hHHhh..........jHHjR.........',
      '.........hHhHH..........HHjHR.........',
      '.........hhHHh..........HjHHR.........',
      '.........hHHhHHHHHhHH..HjHHjR.........',
      '.........HHhHHhHhHHHHH.jHHjjj.........',
      '.......kkkhHHhhHHHHHHH.HHjHHkkk.......',
      '.KlGlGlVVVsjjHHHHHHHHHHjjjjDWWWk......',
      '.GKlKlKGVcCVFjjjjjjjjjjjjFvCxWWWUUk...',
      '.kiVVVVllcCvvFiiiiuuuUUUFvvCxWWXXvUqk.',
      'kiuvvvvvKGCvvvFiiiuuUUUFvvvCxWWXXvvRqk',
      'kiucccccclklGccFiiuUUUFccccCCccccccRqk',
      'kiuCCCCCCCklGklkFiuUUFvCCCCxxCCCCCCRqk',
      'kiuvvvvvvkllGkGkvFiUFvvvvvvCxWWXXvvRqk',
      'kiuvvvvvvklkvklkvvFFvvvvvvvCxWWXXvvRqk',
    ],
  ],
  {
    // idle: cara fechada, sobrancelha em V
    idle: [
      12,
      16,
      [
        'hhHHH..s..sHHHHj',
        'SSS..H.Ss.HHHsSS',
        '.wwgp......gpwwS',
        '.wwpp......ppww.',
        '................',
        '................',
        '................',
        '................',
        '................',
        '...HhHHHHHHHHH..',
        '...HmmmmmmmmH...',
        '...mHDDDDDDjm...',
        '...HHHHHHjHHH...',
        '..........HH....',
        '...........H....',
        '...........H....',
      ],
    ],
    // falando: boca aberta escura
    idleTalk: [
      12,
      16,
      [
        'hhHHH..s..sHHHHj',
        'SSS..H.Ss.HHHsSS',
        '.wwgp......gpwwS',
        '.wwpp......ppww.',
        '................',
        '................',
        '................',
        '................',
        '................',
        '...HmttttttmHH..',
        '...HmmmmmmmmH...',
        '...hmmmmmmmmj...',
        '...HmDDDDDDmH...',
        '..........HH....',
        '...........H....',
        '...........H....',
      ],
    ],
    // pensando: olha para cima, uma sobrancelha erguida, boca de lado
    thinking: [
      12,
      16,
      [
        'hhhhh..s..HHssSS',
        'HHH..H.Ss.ssssSS',
        '.wwpp......wwppS',
        '.wwww......wwww.',
        '................',
        '................',
        '................',
        '................',
        '................',
        '...HhHHHHHHHHH..',
        '...HHHmmmmmHH...',
        '...hHHHDDDHjj...',
        '...HHHHHHjHHH...',
        '..........HH....',
        '...........H....',
        '...........H....',
      ],
    ],
    thinkingTalk: [
      12,
      16,
      [
        'hhhhh..s..HHssSS',
        'HHH..H.Ss.ssssSS',
        '.wwpp......wwppS',
        '.wwww......wwww.',
        '................',
        '................',
        '................',
        '................',
        '................',
        '...HmttttttmHH..',
        '...HmmmmmmmmH...',
        '...hmmmmmmmmj...',
        '...HmDDDDDDmH...',
        '..........HH....',
        '...........H....',
        '...........H....',
      ],
    ],
    // debochado: pálpebras caídas, sorriso torto mostrando os dentes
    smug: [
      12,
      16,
      [
        'hhHHH..s..sHHHHj',
        'HHH..H.Ss.HHHHHH',
        '.SSSS......SSSSS',
        '.wwpp......ppww.',
        '................',
        '................',
        '................',
        '................',
        '................',
        '...HhHHHHHHHmm..',
        '...HHtttttttt...',
        '...hmmmmmmmmm...',
        '...HHHDDDDDDH...',
        '..........HH....',
        '...........H....',
        '...........H....',
      ],
    ],
    smugTalk: [
      12,
      16,
      [
        'hhHHH..s..sHHHHj',
        'HHH..H.Ss.HHHHHH',
        '.SSSS......SSSSS',
        '.wwpp......ppww.',
        '................',
        '................',
        '................',
        '................',
        '................',
        '...HmttttttmHH..',
        '...HmmmmmmmmH...',
        '...hmmmmmmmmj...',
        '...HmDDDDDDmH...',
        '..........HH....',
        '...........H....',
        '...........H....',
      ],
    ],
    // ferido: olhos espremidos, dentes cerrados, sangue na barba e suor
    hurt: [
      12,
      16,
      [
        'sssss..S..ssssSd',
        'HHH..s.DD.sHHHHe',
        '.ppss......sspde',
        '.sspp......ppsS.',
        '................',
        '................',
        '................',
        '................',
        '................',
        '...mmmmmmmmmmH..',
        '...ttTtTtTtTt...',
        '...TTTTTTTTTT...',
        '...mmmmmmmmmm...',
        '..........rr....',
        '...........r....',
        '...........r....',
      ],
    ],
  },
);

export function MarcaoAvatar({ className = 'w-12 h-12', mood = 'idle', isSpeaking = false }) {
  return <Portrait className={className} art={MARCAO} mood={mood} isSpeaking={isSpeaking} />;
}
