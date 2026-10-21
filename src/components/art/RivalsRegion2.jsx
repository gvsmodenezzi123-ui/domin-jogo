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

const MARCAO_PAL = { k: '#0b0806', A: '#f2a24a', o: '#d9741c', O: '#9e4f16', Q: '#5e2c0a', n: '#141210', N: '#3e3833', y: '#ffd24a', Y: '#c8921e', E: '#c4742a', b: '#8f4a12', B: '#5c2e0a', L: '#d8996a', s: '#b97a52', S: '#8a5634', D: '#5e3820', h: '#7a5236', H: '#4e3220', j: '#2a1a10', w: '#efe3c2', p: '#120c08', g: '#fff8e0', m: '#2a0c08', t: '#e9dcc0', T: '#a8977a', r: '#c8261d', d: '#bfe6ff', e: '#6fb6e6', u: '#2d4f7a', U: '#1b3150', i: '#3f6696', v: '#d9a521', W: '#9c7414', X: '#5c4a16', F: '#e0761c', c: '#e4e8ec', C: '#a9b1b8', x: '#5e666e', l: '#d6dade', G: '#8a929a', K: '#3a4048', q: '#46e6ff', Z: '#5fa9ad', R: '#3f8a90' };

const MARCAO = sprite(
  MARCAO_PAL,
  // base: boné com tela e emblema do gancho, barba, colete refletivo, corrente
  [
    1,
    1,
    [
      '..................kk..................',
      '..............kkkkOOkkkk..............',
      '............kkAAAAAAAAAOkk............',
      '...........knoAAoooooooOonk...........',
      '..........knNQAAyyyQyYOOQknq..........',
      '.........knNnQAAyyQyQYOOQnknq.........',
      '........knNnNQAAyyyQyYOOQknknq........',
      '........kNnNnQAAyQyQyYOOQnknkq........',
      '........knNnNQAAYYQYYYOOQknknq........',
      '........kNnNnQAAooooooOOQnknkq........',
      '........kEEEEEEEEEEbbbbbbbbbbq........',
      '.......kbEEEEEEbbbbbbbbbBBBBBBq.......',
      '.......kBBBBBBBBBBBBBBBBBBBBBBq.......',
      '........kkQQQQQQQQQQQQQQQQQQkq........',
      '.........HDDDDDDDDDDDDDDDDDDj.........',
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
      '.lG....kkkhHHhhHHHHHHH.HHjHHkkk.......',
      'lkkGl.lGkksjjHHHHHHHHHHjjjjDWWWk......',
      '.GKkGlkkGlkkFjjjjjjjjjjjjFvCxWWWUUk...',
      '.kkkKkGKkGGGkFiiiiuuuUUUFvvCxWWXXvUqk.',
      'kiuvkvkkkKklGkFiiiuuUUUFvvvCxWWXXvvRqk',
      'kiuccccklkklGkcFiiuUUUFccccCCccccccRqk',
      'kiuCCCCklWklGkCvFiuUUFvCCCCxxCCCCCCRqk',
      'kiuvvvvkGWklGkvvvFiUFvvvvvvCxWWXXvvRqk',
      'kiuvvvvvkKGGKkvvvvFFvvvvvvvCxWWXXvvRqk',
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

// ---------------------------------------------------------------------------
// 2. SERGINHO 22 — "O Ligeirinho" (laranja tijolo)
// Jovem rápido e blefador: boné vermelho virado para trás (aba aparecendo atrás),
// camisa de futebol laranja com o 22 no peito, risquinho na sobrancelha, palito
// de dente no canto da boca e correntinha. Neon ciano à direita.
// ---------------------------------------------------------------------------

const SERGINHO_PAL = { k: '#0b0806', A: '#ec5a44', o: '#c8261d', O: '#8f1610', Q: '#560b07', W: '#f4ecd2', V: '#b8ac90', L: '#ecbd94', s: '#d6a27a', S: '#a06a46', D: '#6e4428', h: '#4a3220', H: '#2a1a10', j: '#140c06', f: '#8a6448', e: '#efe3c2', p: '#120c08', g: '#ffffff', m: '#2e0e0a', t: '#f4ecd2', l: '#b8704e', r: '#c8261d', d: '#bfe6ff', b: '#6fb6e6', P: '#ead9a8', T: '#a8915e', F: '#f39a52', c: '#e07a1f', G: '#a8551a', X: '#6e340c', y: '#f2c95a', Y: '#a87a22', q: '#46e6ff', Z: '#5fb8c4', R: '#3f8a90' };

const SERGINHO = sprite(
  SERGINHO_PAL,
  // base: boné virado com a aba para trás, cabelo degradê, camisa 22, correntinha
  [
    3,
    3,
    [
      '................kk.......kkkkkk...',
      '...........kkkkkOOkkkkk..ooooook..',
      '.........kkAAAAAAAAAoookkOoooooooq',
      '........kAAAAOooooooOooookOQQQQQQq',
      '.......kAAoooOooooooOoooOOR.QQQQq.',
      '......koAAoooOOooooOOoooOOQqkkkk..',
      '......koAAoooQojHHHoQoooOOQq......',
      '......koAAoooQHHHHHHQoooOOQq......',
      '......koAAoooQHHHHHHQoooOOQq......',
      '......koAooooVWkWkWVVoooOOQq......',
      '......kooooooQQQQQQQQOOOOOOq......',
      '........HHHSSSSSSSSSSSSSjj........',
      '........HH.....sssssssss.j........',
      '........HH......ss.......j........',
      '........HH.....ssss......j........',
      '......SSHH....ssssss.....jDS......',
      '......sShf....ssLsss....DhDZq.....',
      '......sDSL....ssLSss....SZDZq.....',
      '......sDSLSSSS.sLSs.SSSSSZDZq.....',
      '......sSSLLsssssLSsssSSSSZDZ......',
      '......sSSLLssssDsSDsssSSSZDS......',
      '........SsLLsssssssss.SsSZ........',
      '........Sssss.........SsSD........',
      '........Sssss.....m....sSD........',
      '.........SSs......................',
      '.........SsSss......sSsSD.........',
      '..........Ssss.ssssssSSD..........',
      '...........Sss.LLLLssSD...........',
      '.......kkkkkWS.SSSSSDVkkkkk.......',
      '......kFFFFFFWsyyYYSVcGGGGGk......',
      '...kFWFFFFFcccWWWWVVccccGGGGVGk...',
      '.kFFWFFcccccccGGGGGGccccccGGGVGqk.',
      'kFFWcckWWkccWWWccWWWccccccGGGXVRqk',
      'kFFWcckyYkccccVccccVccccccGGGXVRqk',
      'kFFWccckkcccWWWccWWWccccccGGGXVRqk',
      'kFFWccccccccWccccWccccccccGGGXVRqk',
      'kFFWccccccccWWVccWWVccccccGGGXVRqk',
    ],
  ],
  {
    // idle: sorriso convencido de canto, palito na boca
    idle: [
      13,
      15,
      [
        'sssss.........j...',
        'HHLHHs..sHHHHHj...',
        'Lssss....sssssH...',
        'DDDD......DDDDj...',
        'eepp......eepp....',
        'Sepp......eepp....',
        '....s....s........',
        '..................',
        '..................',
        '...........s......',
        '...sssssssms......',
        '...smmmm.mPPP.....',
        '..sssllllssDDPPP..',
        '....ssssss.....DTT',
        '....s.............',
        '....s.............',
        '....S.............',
      ],
    ],
    // falando: boca aberta escura, palito no canto
    idleTalk: [
      13,
      15,
      [
        'sssss.........j...',
        'HHLHHs..sHHHHHj...',
        'Lssss....sssssH...',
        'DDDD......DDDDj...',
        'eepp......eepp....',
        'Sepp......eepp....',
        '....s....s........',
        '..................',
        '..................',
        '...........s......',
        '...sttttttss......',
        '...smmmm.mPPP.....',
        '..ssmmmmmmsDDPPP..',
        '....slllls.....DTT',
        '....s.............',
        '....s.............',
        '....S.............',
      ],
    ],
    // pensando: olhos para cima, sobrancelha do risquinho erguida, bico de lado
    thinking: [
      13,
      15,
      [
        'HHLHH.........j...',
        'LssSss..ssssssj...',
        'Lssss....HHHHHj...',
        'gpee......gpeeH...',
        'ppee......ppee....',
        'Seee......eeeS....',
        '....s....s........',
        '..................',
        '..................',
        '...........s......',
        '...sssssssss......',
        '...sssmm.mPPP.....',
        '..ssssslllsDDPPP..',
        '....ssssss.....DTT',
        '....s.............',
        '....s.............',
        '....S.............',
      ],
    ],
    thinkingTalk: [
      13,
      15,
      [
        'HHLHH.........j...',
        'LssSss..ssssssj...',
        'Lssss....HHHHHj...',
        'gpee......gpeeH...',
        'ppee......ppee....',
        'Seee......eeeS....',
        '....s....s........',
        '..................',
        '..................',
        '...........s......',
        '...sttttttss......',
        '...smmmm.mPPP.....',
        '..ssmmmmmmsDDPPP..',
        '....slllls.....DTT',
        '....s.............',
        '....s.............',
        '....S.............',
      ],
    ],
    // debochado: pálpebras caídas, sorrisão torto com dentes
    smug: [
      13,
      15,
      [
        'sssss.........j...',
        'HHLHHs..ssHHHHj...',
        'Lssss....HssssH...',
        'SSSS......SSSSj...',
        'DDDD......DDDD....',
        'Sepp......eepp....',
        '....s....s........',
        '..................',
        '..................',
        '...........m......',
        '...ssttttttm......',
        '...mmmmm.mPPP.....',
        '..ssslllllsDDPPP..',
        '....ssssss.....DTT',
        '....s.............',
        '....s.............',
        '....S.............',
      ],
    ],
    smugTalk: [
      13,
      15,
      [
        'sssss.........j...',
        'HHLHHs..ssHHHHj...',
        'Lssss....HssssH...',
        'SSSS......SSSSj...',
        'DDDD......DDDD....',
        'Sepp......eepp....',
        '....s....s........',
        '..................',
        '..................',
        '...........s......',
        '...sttttttss......',
        '...smmmm.mPPP.....',
        '..ssmmmmmmsDDPPP..',
        '....slllls.....DTT',
        '....s.............',
        '....s.............',
        '....S.............',
      ],
    ],
    // ferido: olhos em X, careta, sangue e suor; o palito cai
    hurt: [
      13,
      15,
      [
        'sssss.........d',
        'LssssS..Ssssssb',
        'HHLHH....HHHHdb',
        'Lpsp......pspsj',
        'Lsps......spss.',
        'Lpsp......psps.',
        '....S....S.....',
        '...............',
        '...............',
        '...........s...',
        '...mmmmmmmms...',
        '...ttmtt.ttsS..',
        '..mmmmmmmmmmSSD',
        '....rSSSSS.....',
        '....r..........',
        '....r..........',
        '....r..........',
      ],
    ],
  },
);

export function SerginhoAvatar({ className = 'w-12 h-12', mood = 'idle', isSpeaking = false }) {
  return <Portrait className={className} art={SERGINHO} mood={mood} isSpeaking={isSpeaking} />;
}

// ---------------------------------------------------------------------------
// 3. CIDA DA MARMITA — "Prato Feito" (roxo beterraba)
// Tia da marmita: cabelo ruivo cacheado preso na touca de rede, bochecha rosada,
// batom, argolas de ouro, avental xadrez sobre a blusa e a concha de feijão na mão.
// Simpática, mas perigosa. Neon rosa à esquerda.
// ---------------------------------------------------------------------------

const CIDA_PAL = { k: '#0b0806', H: '#f39a52', h: '#d9692a', J: '#a04818', N: '#f8dcb4', n: '#d08458', v: '#9aa0a8', L: '#f6cba4', s: '#e8b08a', S: '#b07a52', D: '#7a4e32', B: '#e8806e', b: '#c8605a', e: '#efe3c2', p: '#120c08', g: '#ffffff', E: '#9a5a8a', K: '#2a140a', m: '#c41e32', M: '#7a0e1a', o: '#2e0e0a', t: '#f4ecd2', y: '#f6cf5c', Y: '#a87a22', U: '#7a3068', u: '#5c2448', V: '#3e1430', w: '#efe4d0', W: '#bfb2a0', c: '#c0708e', C: '#7a2e5e', x: '#8a5a74', l: '#e4e8ec', G: '#9aa2aa', X: '#4a5058', f: '#4a2410', F: '#2a1408', O: '#8a4a24', q: '#ff46be', Z: '#c0588e', R: '#b0407e' };

const CIDA = sprite(
  CIDA_PAL,
  // base: cabelo cacheado na touca de rede, argolas, avental xadrez, concha de feijão
  [
    3,
    2,
    [
      '...........kkkkkkkkkkkk.............',
      '........kkkHNhhhhhNhhhJkkk..........',
      '......kkhHHNhNhhhNhNhhhnJnkk........',
      '.....khHNhNHhhNhNhhhNhNhhJnhk.......',
      '....kHHhhNhhhhhNhhhhhNhJhhJnhk......',
      '...kNhhHNhNHhhNhNhhhNhNhhJnJnhk.....',
      '...khNhNHHhNhNhhhNhNhhhnhnJhhnk.....',
      '...kZhNHhhHhNhhhhhNhhhhhnhhJJvk.....',
      '...kZNhNhhhNhNhhhNhNhhJnhnJhJnv..v..',
      '...kZhJhNhNhhJNhNJhhNhNhJhnJnvk.v...',
      '...kZNNNNNNNNNNNNNNNNNNnnnnnnJk.....',
      '...kZhnnnhSSSSSSSSSSSSSSJnnnkkkkkk..',
      '...kZhhJhLLsssssssssssssDJhkfOfOOfk.',
      '....ZHhhhLL...ssssss...sSJkFffOfffFk',
      '...kZhJJhL.....ssss.....SJklqllllGXk',
      '...kZJhhJL.....ssss.....SJklllllGGXk',
      '....ZhHhh.....ssssss.....JHkllGGGXk.',
      '...kZhhJS.....ssssss.....DhJkGGXXk..',
      '...kZhJhSL....ssLsss....SDJJhkkkk...',
      '....ZHyJSL....ssLsss....SDhYhklXk...',
      '...kZyysSLBBssssLSssssbbbDSyyklXk...',
      '...kyZhYSBBBssSSLSSDssbbbDyJJklXk...',
      '....yJHYSsssss......s.ssSDyhJklXk...',
      '...kyhhYSssss........sssSDyJhklXk...',
      '.....YYkSssss........sssSDkYYklXk...',
      '........Ssssss......s.ssSD...klXk...',
      '.........SSsss......sssDD....klXk...',
      '..........SssssssssssssD.....kkkkk..',
      '........kkkSssLLLLLLsSDkkk..kLsssSk.',
      '.......kuukwuSSSSSSSSuWkuuk.ksLssSk.',
      '....qUUUUkwUuuuuuuuuuuuWkVVVksssSDk.',
      '..qUUUUUUkCCCCCCCCCCCCCCkuuVVkSSDk..',
      'qkUUuuuuukcCCccCCccCCxxCkuuVVVVVk...',
      'qRUUuuuuukcCCccCCccCCxxCkuuVVVVVVk..',
      'qRUUuuuuukwccwwccwwccWWxkuuVVVVVVk..',
      'qRUUuuuuukwccwCCCCCCcWWxkuuVVVVVVk..',
      'qRUUuuuuukcCCcCCCccCCxxCkuuVVVVVVk..',
      'qRUUuuuuukcCCcCCCccCCxxCkuuVVVVVVk..',
    ],
  ],
  {
    // idle: sorriso simpático de batom
    idle: [
      12,
      15,
      [
        '..sss......sss..',
        '.LJJJs....sJJJs.',
        '.EsssJ....JsssJ.',
        'KKKKK......KKKKK',
        'Legpe......egpeS',
        '.eppe......eppe.',
        '.SSSS......SSSS.',
        '................',
        '................',
        '.....ssssss.s...',
        '....MsmmmmsM....',
        '....sMMMMMMs....',
        '.....smBBms.s...',
        '.....ssssss.....',
      ],
    ],
    // falando: boca aberta escura com batom em volta
    idleTalk: [
      12,
      15,
      [
        '..sss......sss..',
        '.LJJJs....sJJJs.',
        '.EsssJ....JsssJ.',
        'KKKKK......KKKKK',
        'Legpe......egpeS',
        '.eppe......eppe.',
        '.SSSS......SSSS.',
        '................',
        '................',
        '.....mmmmmm.s...',
        '....mottttom....',
        '....moooooom....',
        '.....oooooo.s...',
        '.....mmmmmm.....',
      ],
    ],
    // pensando: olhos para cima, sobrancelha erguida, biquinho
    thinking: [
      12,
      15,
      [
        '..JJJ......sss..',
        '.JsssJ....sJJJs.',
        '.Lssss....JsssJ.',
        'KKKKK......KKKKK',
        'Lppee......ppeeS',
        '.eeee......eeee.',
        '.SSSS......SSSS.',
        '................',
        '................',
        '.....ssssss.s...',
        '....sssmmmss....',
        '....sssMMMss....',
        '.....sssmss.s...',
        '.....ssssss.....',
      ],
    ],
    thinkingTalk: [
      12,
      15,
      [
        '..JJJ......sss..',
        '.JsssJ....sJJJs.',
        '.Lssss....JsssJ.',
        'KKKKK......KKKKK',
        'Lppee......ppeeS',
        '.eeee......eeee.',
        '.SSSS......SSSS.',
        '................',
        '................',
        '.....mmmmmm.s...',
        '....mottttom....',
        '....moooooom....',
        '.....oooooo.s...',
        '.....mmmmmm.....',
      ],
    ],
    // debochada: pálpebras caídas e sorrisinho de canto (perigosa)
    smug: [
      12,
      15,
      [
        '..sss......JJJ..',
        '.LJJJs....JsssJ.',
        '.JsssJ....sssss.',
        'KSSSS......SSSSK',
        'KEEEE......EEEEK',
        '.eepp......eepp.',
        '.SSSS......SSSS.',
        '................',
        '................',
        '.....ssssss.m...',
        '....ssmmmmsM....',
        '....sMMMMMMs....',
        '.....smmmms.s...',
        '.....ssssss.....',
      ],
    ],
    smugTalk: [
      12,
      15,
      [
        '..sss......JJJ..',
        '.LJJJs....JsssJ.',
        '.JsssJ....sssss.',
        'KSSSS......SSSSK',
        'KEEEE......EEEEK',
        '.eepp......eepp.',
        '.SSSS......SSSS.',
        '................',
        '................',
        '.....mmmmmm.s...',
        '....mottttom....',
        '....moooooom....',
        '.....oooooo.s...',
        '.....mmmmmm.....',
      ],
    ],
    // ferida: olhos espremidos, boca de "ai", suor e batom borrado
    hurt: [
      12,
      15,
      [
        '..sss......sss..',
        '.LsssJ....Jssss.',
        '.JJJJs....sJJJJ.',
        'LEEEE......EEEES',
        'LKKss......ssKKS',
        '.LsKK......KKss.',
        '.KKss......ssKK.',
        '................',
        '................',
        '.....mmmmmm.s...',
        '....mottttos....',
        '....Moooooom....',
        '.....oooooo.m...',
        '.....mmmmmm.....',
      ],
    ],
  },
);

export function CidaAvatar({ className = 'w-12 h-12', mood = 'idle', isSpeaking = false }) {
  return <Portrait className={className} art={CIDA} mood={mood} isSpeaking={isSpeaking} />;
}

// ---------------------------------------------------------------------------
// 4. PAULINHO PENTE FINO — "Olho de Lince" (ciano escuro)
// Vaidoso que vê tudo: topete preto brilhante penteado para trás (reflexo do neon),
// pente fino de ouro atrás da orelha, bigodinho fino, um olho meio fechado de quem
// está mirando, camisa de seda com gola larga e correntinha. Neon rosa à direita.
// ---------------------------------------------------------------------------

const PAULINHO_PAL = { k: '#0b0806', H: '#1c1618', j: '#0c0809', h: '#3a3444', G: '#6a6a84', W: '#d6dcf0', L: '#e0a87e', s: '#c99068', S: '#94603e', D: '#64402a', e: '#efe3c2', p: '#120c08', g: '#ffffff', K: '#1a1414', m: '#2e0e0a', t: '#f4ecd2', l: '#a8684a', r: '#c8261d', d: '#bfe6ff', b: '#6fb6e6', y: '#f2c95a', Y: '#a87a22', O: '#fff0b0', A: '#5ec0bc', c: '#1f6a70', B: '#164446', X: '#0d2d2f', C: '#2f8a8e', q: '#ff46be', Z: '#b8407e', R: '#d86aa0' };

const PAULINHO = sprite(
  PAULINHO_PAL,
  // base: topete com brilho, pente atrás da orelha, camisa de seda de gola larga, corrente
  [
    3,
    0,
    [
      '.......kkHHHHHHHHHkkk..............',
      '......kHHHGWWWGHHHHHjkk............',
      '.....kHHGWWGHHHhhHhhjjZkk..........',
      '.....kHGWGHHHhhHHHHHhhjjZk.........',
      '.....kHGhHHhhGHHHHHHjhjjjqk........',
      '......khHHhGGHHhhHHHjjjjjZqk.......',
      '......kHHhGhHHhhHHHHjjjjjZqk.......',
      '......kHhhHHhhGHHHHHjjjjjZqk.......',
      '......khHHhhGhHHHHHHjjjjjZqk.......',
      '......kHHhhHHHHHHHHHjjjjjZqk.......',
      '......kHHHHHHHHHHHHHjjjjjZqk.......',
      '......kHjjjjjjjjjjjjjjjjjjqkk......',
      '.......kHjhhhhhjjjjjjjjjjjkkOY.....',
      '.......kHHhhhhhhHHHHjjjjjjkkykk....',
      '.......kHsss..ssssssssssSjkkyY.....',
      '.........L....ssssssssssSjkkykk....',
      '...............ssss.....SjkkyY.....',
      '...............ssss......jkkykk....',
      '......SSHL....ssLsss....SjDSyY.....',
      '......sSSL....ssLsss....SZDSykk....',
      '......sDSL....ssLsSs....SZDSyY.....',
      '......sDSLSSSSssLsSsSSSSSZDSyk.....',
      '......sSSLLsssssLsSsssSSSZDSR......',
      '......sSSsssssssLsSsssSSSZDS.......',
      '........SssssssDSSSDssSDSZk........',
      '........SssssKKKKsKKKKssSZk........',
      '........SsssK.........KsSD.........',
      '.........Ssss.mmmm...ssSD..........',
      '..........Ssss......ssSD...........',
      '...........Ssss.....sSD............',
      '............SssLLLL.SD.............',
      '......kkkkkXXSSSSSSSDXXkkkkk.......',
      '.....kCCXXXAAXsyssYSXCCXXXBBk..k...',
      '..kCCCXXAAAAAXssyYSSXCCCCBXXBBBqkk.',
      'kCCCcXAAAAACXcssOySScXCCCBBBXBBBBqk',
      'kCCCXAACCCXXccssyYSSccXXBBBBBXXXZqk',
      'kCCCAXXCCXcccccsssScccccXBBXXBXXZqk',
      'kCCCccAXXcccccccsSccccccAXXBBBXXZqk',
      'kCCCcAcccccccccccccccccccccBBBXXZqk',
      'kCCCcccccccccccccccccccccccBBBXXZqk',
    ],
  ],
  {
    // idle: mira com um olho meio fechado, sorrisinho sob o bigode
    idle: [
      10,
      14,
      [
        '.....ss...........',
        'kH.Lsss...........',
        'kHLKKKKs....sssss.',
        'kHKLsssK....KKKKKS',
        '...DDDD......DDDD.',
        '...eepp......ppee.',
        '...eepp......SSSS.',
        '..................',
        '..................',
        '..................',
        '..................',
        '..................',
        '......sssssssms...',
        '......s....mms....',
        '.......slllls.....',
        '........sssss.....',
        '............s.....',
      ],
    ],
    // falando: boca aberta escura
    idleTalk: [
      10,
      14,
      [
        '.....ss...........',
        'kH.Lsss...........',
        'kHLKKKKs....sssss.',
        'kHKLsssK....KKKKKS',
        '...DDDD......DDDD.',
        '...eepp......ppee.',
        '...eepp......SSSS.',
        '..................',
        '..................',
        '..................',
        '..................',
        '..................',
        '......sttttttss...',
        '......s....mms....',
        '.......mmmmmm.....',
        '........lllls.....',
        '............s.....',
      ],
    ],
    // pensando: olhos para cima, sobrancelha erguida, boca de lado
    thinking: [
      10,
      14,
      [
        '.....ss...........',
        'kH.KKKK...........',
        'kHKLsssK....sKKKK.',
        'kHLLssss....KssssK',
        '...pgee......pgee.',
        '...ppee......ppee.',
        '...eeee......eeee.',
        '..................',
        '..................',
        '..................',
        '..................',
        '..................',
        '......sssssssss...',
        '......s....sss....',
        '.......lllsss.....',
        '........sssss.....',
        '............s.....',
      ],
    ],
    thinkingTalk: [
      10,
      14,
      [
        '.....ss...........',
        'kH.KKKK...........',
        'kHKLsssK....sKKKK.',
        'kHLLssss....KssssK',
        '...pgee......pgee.',
        '...ppee......ppee.',
        '...eeee......eeee.',
        '..................',
        '..................',
        '..................',
        '..................',
        '..................',
        '......sttttttss...',
        '......s....mms....',
        '.......mmmmmm.....',
        '........lllls.....',
        '............s.....',
      ],
    ],
    // debochado: as duas pálpebras caídas, sorriso torto
    smug: [
      10,
      14,
      [
        '.....ss...........',
        'kH.Lsss...........',
        'kHLKKKKs....sKKKK.',
        'kHKLsssK....KssssK',
        '...SSSS......SSSS.',
        '...DDDD......DDDD.',
        '...eppe......ppee.',
        '..................',
        '..................',
        '..................',
        '..................',
        '..................',
        '......sssSSSSSm...',
        '......s....mmm....',
        '.......slllll.....',
        '........sssss.....',
        '............s.....',
      ],
    ],
    smugTalk: [
      10,
      14,
      [
        '.....ss...........',
        'kH.Lsss...........',
        'kHLKKKKs....sKKKK.',
        'kHKLsssK....KssssK',
        '...SSSS......SSSS.',
        '...DDDD......DDDD.',
        '...eppe......ppee.',
        '..................',
        '..................',
        '..................',
        '..................',
        '..................',
        '......sttttttss...',
        '......s....mms....',
        '.......mmmmmm.....',
        '........lllls.....',
        '............s.....',
      ],
    ],
    // ferido: olhos em X, careta, mecha do topete caída e suor
    hurt: [
      11,
      14,
      [
        '....jH...........',
        'd.LssH...........',
        'bLLssjK....Kssss.',
        'bLKKKKs....sKKKKS',
        '..Lpsp......psps.',
        '..Lsps......spss.',
        '..Lpsp......psps.',
        '.................',
        '.................',
        '.................',
        '.................',
        '.................',
        '.....mttmtttms...',
        '.....m....mmm....',
        '......lllllr.....',
        '.......ssssr.....',
        '...........r.....',
      ],
    ],
  },
);

export function PaulinhoAvatar({ className = 'w-12 h-12', mood = 'idle', isSpeaking = false }) {
  return <Portrait className={className} art={PAULINHO} mood={mood} isSpeaking={isSpeaking} />;
}

// ---------------------------------------------------------------------------
// 5. TIÃO NAVALHA — "O Malandro Perigoso" (carmesim)
// Malandro carioca: chapéu panamá branco de aba larga com fita vermelha (a sombra
// da aba cobre os olhos frios), cicatriz costurada na bochecha, dente de ouro,
// camisa listrada aberta no peito e a navalha aberta junto do rosto. Neon ciano à direita.
// ---------------------------------------------------------------------------

const TIAO_PAL = { k: '#0b0806', A: '#f8f0de', a: '#ddd2b6', O: '#aa9e82', Q: '#6a604c', w: '#c8bc9e', R: '#d23a2c', r: '#a3221a', M: '#64120e', L: '#d8a276', s: '#c08a5e', S: '#8a5a38', D: '#5a3820', b: '#9a6a48', H: '#141010', C: '#e89088', c: '#7a3a30', e: '#dcd2b8', p: '#0c0806', m: '#2a0c08', t: '#efe6cc', y: '#f6cc4a', B: '#c8261d', d: '#bfe6ff', i: '#6fb6e6', W: '#f0e6d0', V: '#b4a88c', x: '#8a1a16', X: '#5a0e0c', l: '#f2f6fa', G: '#a9b1b8', K: '#3a3634', P: '#e6dcea', u: '#9a8ea8', q: '#46e6ff', Z: '#5fb0b8' };

const TIAO = sprite(
  TIAO_PAL,
  // base: panamá com fita vermelha, cicatriz, barba por fazer, camisa listrada, navalha
  [
    3,
    2,
    [
      '...........kkkkkkkkkkkk............',
      '..........kAAAAAOOaaaaak...........',
      '.........kAAawaaOwaaawOOk..........',
      '........kaAAaaawOaawaaOOQq.........',
      '........kaAAawaaOwaaawOOQq.........',
      '........kaAAaaawaaawaaOOQq.........',
      '........kaAAawaaawaaawOOQq.........',
      '........kRRrMRRRRRRRRrrrrq.........',
      '...kkkkkkrrMrrrrrrrrrMMMMqkkkkk....',
      '.kkAAAAAAAAAAAAAAAAAAAaaaaaaaaakk..',
      'kaaaaaaaaaaaaaaaaaaaaaaaOOOOOOOOOq.',
      '.kQQQQQQQQQQQQQQQQQQQQQQQQQQQOOOOOq',
      '..kkkkkkDDDDDDDDDDDDDDDDDDkkkkQQQQq',
      '...kkk..H.....ssssSSSSSSSH....kkkk.',
      '..kllGk.H.....Hssss.....SH.........',
      '..kqGGkSH......ssss.....SHDS.......',
      '..klGGkSHL....ssLsss....SZDSq......',
      '..klGGkDSL....ssLSss....SZDSq......',
      '..klGGkDSLSSSSssLSsCSSSSSZDSq......',
      '..klGGkSSLLsssssLScsCcssSZDSq......',
      '..klGGkSSLLsssssLSscsCSSSZDS.......',
      '..klGGk.SLSSSssDSSDscSCcSZ.........',
      '...kGGk.Ssssssssssss.cSCSZ.........',
      '...kGKk.Sssss........scDCZ.........',
      '....kKk..Ssbs..m.....sscD..........',
      '...kPuk..Sssb........ssSD..........',
      '...kPuk...Sss......ssbSD...........',
      '...kPuk....Ss.bsssbssSD............',
      '..kkkkkk....S.sbsssbSD.............',
      '..kLsssSkkkWWSSSSSSSDVVkkkkk.......',
      '..ksLssSkkWWVksssssSkVVVkxxVk......',
      '.kksssSDkrkWksssSsDSSkVkVxxVVxxqk..',
      'krrkSSDkWrrkksbsSsSSSkkWVxxVQXXQQq.',
      'krrWWrrWWrrWkrssSsSSWkrWVxxVQXXQQq.',
      'krrWWrrWWrrWWrrsssSWWrrWVxxVQXXQQq.',
      'krrWWrrWWrrWWrrWsSrWWrrWVxxVQXXQQq.',
      'krrWWrrWWrrWWrrWWrrWWrrWVxxVQXXQQq.',
      'krrWWrrWWrrWWrrWWrrWWrrWVxxVQXXQQq.',
    ],
  ],
  {
    // idle: olhar frio, canto da boca mostrando o dente de ouro
    idle: [
      12,
      15,
      [
        'Sssss..........',
        'sHHHH.....HHHHH',
        'sDDDDH....HDDDD',
        '.SSpS......SpSS',
        '.eepe......epee',
        '...............',
        '...............',
        '...............',
        '...............',
        '...........s...',
        '....sssssyms...',
        '....mm.mmmbs...',
        '....sSSSSSsb...',
        '....bsssbs.....',
        '....s..........',
        '....s..........',
      ],
    ],
    // falando: boca aberta escura com o dente de ouro
    idleTalk: [
      12,
      15,
      [
        'Sssss..........',
        'sHHHH.....HHHHH',
        'sDDDDH....HDDDD',
        '.SSpS......SpSS',
        '.eepe......epee',
        '...............',
        '...............',
        '...............',
        '...............',
        '...........s...',
        '....sttttyts...',
        '....sm.mmmms...',
        '....smmmmmmb...',
        '....bsSSSS.....',
        '....s..........',
        '....s..........',
      ],
    ],
    // pensando: olhos para o lado/cima, sobrancelha erguida, boca fechada
    thinking: [
      12,
      15,
      [
        'SHHHH..........',
        'sssss.....sHHHH',
        'sSSSSs....sDDDD',
        '.eepp......eepp',
        '.eeee......eeee',
        '...............',
        '...............',
        '...............',
        '...............',
        '...........s...',
        '....ssssssss...',
        '....sm.mmmms...',
        '....ssSSSSsb...',
        '....bsssbs.....',
        '....s..........',
        '....s..........',
      ],
    ],
    thinkingTalk: [
      12,
      15,
      [
        'SHHHH..........',
        'sssss.....sHHHH',
        'sSSSSs....sDDDD',
        '.eepp......eepp',
        '.eeee......eeee',
        '...............',
        '...............',
        '...............',
        '...............',
        '...........s...',
        '....sttttyts...',
        '....sm.mmmms...',
        '....smmmmmmb...',
        '....bsSSSS.....',
        '....s..........',
        '....s..........',
      ],
    ],
    // debochado: pálpebras caídas, sorriso torto com o dente de ouro
    smug: [
      12,
      15,
      [
        'Sssss..........',
        'sHHHH.....HHHHH',
        'sDDDDH....HDDDD',
        '.DDDD......DDDD',
        '.eppe......eppe',
        '...............',
        '...............',
        '...............',
        '...............',
        '...........m...',
        '....sssttytm...',
        '....mm.mmmms...',
        '....sSSSSSsb...',
        '....bsssbs.....',
        '....s..........',
        '....s..........',
      ],
    ],
    smugTalk: [
      12,
      15,
      [
        'Sssss..........',
        'sHHHH.....HHHHH',
        'sDDDDH....HDDDD',
        '.DDDD......DDDD',
        '.eppe......eppe',
        '...............',
        '...............',
        '...............',
        '...............',
        '...........s...',
        '....sttttyts...',
        '....sm.mmmms...',
        '....smmmmmmb...',
        '....bsSSSS.....',
        '....s..........',
        '....s..........',
      ],
    ],
    // ferido: olhos em X, dentes cerrados, sangue e suor
    hurt: [
      12,
      15,
      [
        'dssss..........',
        'issss.....Hssss',
        'iHpHps....spHpH',
        '.Lsps......spss',
        '.Lpsp......psps',
        '...............',
        '...............',
        '...............',
        '...............',
        '...........s...',
        '....mmmmmmmm...',
        '....tt.ttytt...',
        '....mmmmmmmm...',
        '....BBssbs.....',
        '....B..........',
        '....B..........',
      ],
    ],
  },
);

export function TiaoAvatar({ className = 'w-12 h-12', mood = 'idle', isSpeaking = false }) {
  return <Portrait className={className} art={TIAO} mood={mood} isSpeaking={isSpeaking} />;
}

// ---------------------------------------------------------------------------
// 6. CHEFE — BETO CIGANO, "O Banqueiro" (azul-meia-noite aveludado, ouro)
// Chapéu de veludo de copa alta com fita dourada e medalhas, cabelo preto comprido,
// olhos verdes, bigode fino e cavanhaque, argola com moedas penduradas, lenço
// vermelho, colar de moedas, colete de veludo e a mão erguida com o Anel do Bicheiro
// (ouro e pedra verde) segurando uma moeda entre os dedos. Neon rosa e ciano.
// ---------------------------------------------------------------------------

const BETO_PAL = { k: '#0b0806', A: '#4c5c9e', a: '#2e3a78', v: '#1f2a5a', V: '#161f45', Q: '#0b1028', O: '#fff2b8', y: '#f2c95a', Y: '#c8962e', T: '#7a5414', H: '#181018', h: '#34305a', j: '#08060a', L: '#c48e62', s: '#a8704a', S: '#7a4a2c', D: '#4e2c16', e: '#efe3c2', G: '#3fbf6a', p: '#0c0806', g: '#ffffff', K: '#120a0a', m: '#2a0c08', t: '#efe6cc', B: '#c8261d', d: '#bfe6ff', i: '#6fb6e6', E: '#e04a5a', R: '#b3182a', r: '#6e0c18', u: '#7a4aa0', U: '#4a2a6a', n: '#8ff0b0', N: '#2fa35a', q: '#ff46be', c: '#46e6ff', Z: '#a8487e', C: '#3f8a9a' };

const BETO = sprite(
  BETO_PAL,
  // base: chapéu de veludo, cabelo comprido, argola de moedas, colar, colete, mão com anel e moeda
  [
    2,
    0,
    [
      '............kkkkkkkkkkkk............',
      '...........kAAAAVVVVvvvvk...........',
      '..........kAavvvvVQvvvVVQk..........',
      '.........kvAaavvvVQvvvVVQQc.........',
      '.........kvAaavvvvQvvvVVQQc.........',
      '.........kvAaavvvvvvvvVVQQc.........',
      '.........kvAaavvkOykvvVVQQc.........',
      '.........kyOOOyykyYkyyYYYYc.........',
      '...kkkkkkkYYYYYYYkkYYYTTTTckkkkkk...',
      '.kkAAAAAAAAaaaaaaaaaaaaaaVVVVVVVVkk.',
      'qaaaaaaavvvvvvvvvvvvvvvvvvvVVVVVVVVc',
      '.qQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQc.',
      '..kkkkhHHHHHHDDDDDDDDDDjjjHjHHkkkk..',
      '.....kHHHhHHSSSSSSSSSSSSj.HHHHk.....',
      '.....kZHhHHsssssssssssssS.HHHck.....',
      '.....kZhHHSL....ssssssssS.HHjck.....',
      '....kZhHHHS......ss.....SDHjHkkkk...',
      '....kqHHHhS......ss......DHHkOyyYk..',
      '....kqHHhsSL....sLss....SDHHkyyYTk..',
      '....kZHhHsSL....sLSs....SDHkkkYTkk..',
      '....kZhHHsSL....sLSs....SDkLkskskSk.',
      '....kZHyysSLSSSSsLSsSSSSSDkLkskskSk.',
      '....kZyHhYSLLssssLssssSSSDkLsksksSk.',
      '....kZyhHYSsSsssDSSDssSSSDkLsssssSk.',
      '....kZhYYHSsssKKKKKKKKssSDkyOyssSDk.',
      '....kZHkHhHSsK........KSDHkTYTsSSDk.',
      '....kqHYYHHSKs..m..m..sKDHkNnNsSDk..',
      '....kZOyyYHHSsss.....sSDHHHkNksSDk..',
      '....kZYTYTHHHSssKhKK.SDHHHHjksSDk...',
      '....kZHHHhHHHHSsshKs.DHHHHHHkSDDk...',
      '...kZHHHhHHkkSSSSKK.SSSkkkHHkVVVk...',
      '..kZHHHhHHkkkEEEEERRRRRkkkkHjHHHCk..',
      '...kkkkaaaaakERkRRRRrrrrVVVVVkkkk...',
      '..kqaaaayYvvkRrkuuuuUUUQvvVyYVVVkk..',
      '.kAAAAvvYYvvQkRkuuuuUUUQvvYYTVVVVVk.',
      'qaaavvvvvvyYQkruuuuUUUQQvyYvVVVVQQQk',
      'qaaavvvvvvYYOyuuuuuUUUyYYYTvVVVVQQQk',
      'qaaavvvvvvvvyYYYuOyYUYYTvvvvVVVVQQQk',
      'qaaavvvvvvvyQQvuYyYTYvQQYvvvVVVVQQQk',
      'qaaavvvvvvvvQQvuuuuUUvQQvvvvVVVVQQQk',
    ],
  ],
  {
    // idle: olhar verde fixo, meio sorriso sob o bigode
    idle: [
      13,
      13,
      [
        '..............j',
        '..............j',
        '.Lsss.........D',
        'LKKKKs..sKKKK..',
        'KLsssK..KssssK.',
        '.KKKK....KKKK..',
        '.egpe....egpe..',
        '.eGGe....eGGe..',
        '...............',
        '...............',
        '...............',
        '...............',
        '...sssssssm....',
        '...sm.mm.ms....',
        '.....SSSSs.....',
        '.........s.....',
        '.........S.....',
        '........S......',
      ],
    ],
    // falando: boca aberta escura
    idleTalk: [
      13,
      13,
      [
        '..............j',
        '..............j',
        '.Lsss.........D',
        'LKKKKs..sKKKK..',
        'KLsssK..KssssK.',
        '.KKKK....KKKK..',
        '.egpe....egpe..',
        '.eGGe....eGGe..',
        '...............',
        '...............',
        '...............',
        '...............',
        '...stttttts....',
        '...sm.mm.ms....',
        '.....mmmms.....',
        '.........s.....',
        '.........S.....',
        '........S......',
      ],
    ],
    // pensando: olhos para cima, sobrancelha erguida, boca fechada
    thinking: [
      13,
      13,
      [
        '..............j',
        '..............j',
        '.KKKK.........D',
        'KLssss..sKKKK..',
        'LLssss..sssssK.',
        '.Ggee....Ggee..',
        '.pGee....pGee..',
        '.eeee....eeee..',
        '...............',
        '...............',
        '...............',
        '...............',
        '...ssssssss....',
        '...ss.mm.ss....',
        '.....sssss.....',
        '.........s.....',
        '.........S.....',
        '........S......',
      ],
    ],
    thinkingTalk: [
      13,
      13,
      [
        '..............j',
        '..............j',
        '.KKKK.........D',
        'KLssss..sKKKK..',
        'LLssss..sssssK.',
        '.Ggee....Ggee..',
        '.pGee....pGee..',
        '.eeee....eeee..',
        '...............',
        '...............',
        '...............',
        '...............',
        '...stttttts....',
        '...sm.mm.ms....',
        '.....mmmms.....',
        '.........s.....',
        '.........S.....',
        '........S......',
      ],
    ],
    // debochado: pálpebras caídas, sorriso torto com dente de ouro
    smug: [
      13,
      13,
      [
        '..............j',
        '..............j',
        '.Lsss.........D',
        'LKKKKs..sKKKK..',
        'KLsssK..KssssK.',
        '.SSSS....SSSS..',
        '.KKKK....KKKK..',
        '.eGpe....eGpe..',
        '...............',
        '...............',
        '...............',
        '...............',
        '...sssttytm....',
        '...sm.mm.ms....',
        '.....sssss.....',
        '.........s.....',
        '.........S.....',
        '........S......',
      ],
    ],
    smugTalk: [
      13,
      13,
      [
        '..............j',
        '..............j',
        '.Lsss.........D',
        'LKKKKs..sKKKK..',
        'KLsssK..KssssK.',
        '.SSSS....SSSS..',
        '.KKKK....KKKK..',
        '.eGpe....eGpe..',
        '...............',
        '...............',
        '...............',
        '...............',
        '...stttttts....',
        '...sm.mm.ms....',
        '.....mmmms.....',
        '.........s.....',
        '.........S.....',
        '........S......',
      ],
    ],
    // ferido: olhos espremidos, careta, sangue no cavanhaque e suor
    hurt: [
      13,
      13,
      [
        '..............d',
        '..............i',
        '.Lsss.........i',
        'LLsssK..Kssss..',
        'LKKKKs..sKKKKS.',
        '.KKss....ssKK..',
        '.LsKK....KKss..',
        '.KKss....ssKK..',
        '...............',
        '...............',
        '...............',
        '...............',
        '...mmmmmmmm....',
        '...tt.tt.tt....',
        '.....ssssB.....',
        '.........B.....',
        '.........B.....',
        '........B......',
      ],
    ],
  },
);

export function BetoAvatar({ className = 'w-12 h-12', mood = 'idle', isSpeaking = false }) {
  return <Portrait className={className} art={BETO} mood={mood} isSpeaking={isSpeaking} />;
}
