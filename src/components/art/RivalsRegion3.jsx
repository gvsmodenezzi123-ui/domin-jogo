// src/components/art/RivalsRegion3.jsx
// Retratos 40x40 da Região 3 — "Submundo do Jogo do Bicho": alta tensão, apostas
// pesadas, luz quente de lâmpada por cima e um respingo de luz vermelha pela direita.
//
// Cada retrato é desenhado em texto (1 caractere = 1 pixel da grade 40x40) com a
// paleta ao lado; na carga do módulo o texto vira <rect>s inteiros (pixels iguais
// vizinhos são agrupados). O desenho fica em camadas:
//   base   → tudo que é igual em todos os humores (fundo, roupa, cabelo...);
//   moods  → remendo de cada humor (idle, thinking, smug, hurt) por cima da base;
//   speak  → boca aberta, sobrescreve a zona da boca enquanto fala (menos no hurt).
// Nos remendos, '.' é "não mexe". Enquadramento igual ao Tio Zé: fundo escuro
// x 6–33 / y 4–37, cabeça em y 4–32 e ombros nas linhas 32–40.
import { PixelSvg } from './PixelSvg.jsx';

/** Converte linhas de texto em retângulos: junta pixels iguais na linha e empilha linhas iguais. */
function toRects(patch, pal) {
  if (!patch) return [];
  const { x: ox = 0, y: oy = 0, rows } = patch;
  const done = [];
  let open = new Map();
  rows.forEach((row, y) => {
    const next = new Map();
    for (let x = 0; x < row.length; ) {
      const c = row[x];
      let end = x + 1;
      while (row[end] === c) end += 1;
      if (c !== '.') {
        const id = `${x}:${end}:${c}`;
        let r = open.get(id);
        if (!r) {
          r = { x: ox + x, y: oy + y, w: end - x, h: 0, fill: pal[c] ?? '#ff00ff' };
          done.push(r);
        }
        r.h += 1;
        next.set(id, r);
      }
      x = end;
    }
    open = next;
  });
  return done;
}

/** Pré-calcula os retângulos de um retrato (uma vez só, na carga do módulo). */
function makeArt({ pal, base, moods, speak }) {
  return {
    base: toRects({ rows: base }, pal),
    moods: Object.fromEntries(Object.entries(moods).map(([m, p]) => [m, toRects(p, pal)])),
    speak: toRects(speak, pal),
  };
}

function Rects({ list }) {
  return list.map((r) => <rect key={`${r.x}-${r.y}`} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.fill} />);
}

/** Retrato: base + humor (+ boca aberta falando; ferido não fala). */
function Portrait({ art, className, mood, isSpeaking }) {
  const face = art.moods[mood] ?? art.moods.idle;
  return (
    <PixelSvg className={className} viewBox="0 0 40 40">
      <Rects list={art.base} />
      <Rects list={face} />
      {isSpeaking && mood !== 'hurt' && <Rects list={art.speak} />}
    </PixelSvg>
  );
}

// 1. CARLINHOS MÃO LEVE — "O Batedor de Carteira"
// Rosto magro e anguloso, gorro verde esmeralda enterrado até a sobrancelha, olhar
// de lado, gola alta com cachecol verde tóxico e a carteira roubada na luva sem dedo.
const CARLINHOS = makeArt({
  pal: {
    '0': '#d8ccb2', // branco do olho
    '#': '#090a0f', // fundo da silhueta
    k: '#0b0806', // contorno / pupila
    '*': '#ffffff', // brilho
    M: '#220b0b', // boca aberta
    t: '#e9e1cc', // dentes
    '!': '#c8261d', // sangue
    G: '#4fae72', // gorro (luz)
    g: '#1f7a4a', // gorro (base, verde esmeralda)
    v: '#165c37', // gorro (sombra)
    V: '#0d3d24', // gorro (oclusão)
    h: '#dcae84', // pele (luz)
    s: '#c08a5e', // pele (base)
    d: '#8e5c3a', // pele (sombra)
    D: '#5a3820', // pele (oclusão)
    j: '#a07050', // barba por fazer
    J: '#bb8a62', // barba por fazer (luz)
    b: '#2e1c10', // sobrancelha / barbicha
    c: '#4e5650', // casaco (luz)
    C: '#2c312e', // casaco (base)
    x: '#181b19', // casaco (sombra)
    E: '#3fe07a', // cachecol verde tóxico
    F: '#a4f7c0', // cachecol (luz)
    e: '#1d9a50', // cachecol (sombra)
    o: '#5c544d', // luva sem dedo (luz)
    O: '#36302b', // luva (sombra)
    u: '#b67e42', // carteira (luz)
    U: '#7e4c24', // carteira (base)
    y: '#4a2a12', // carteira (sombra)
    n: '#d8deb0', // nota de dinheiro
    N: '#8ea070', // nota (sombra)
    z: '#ffcf4a', // fecho de ouro
  },
  // base: tudo que não muda com o humor
  base: [
    '........................................',
    '........................................',
    '...............kkkkkkkkkk...............',
    '.............kkGGGGGggvvVkk.............',
    '......#######GGGGgggvgggvvV#######......',
    '......######gGGGgggggvgggvvV######......',
    '......#####gGGggggggggvgggvvV#####......',
    '......#####gGGgggggggggvggvvV#####......',
    '......#####gGGggggggggggvgvvV#####......',
    '......####GGGGGGGGGGGGGGGGGGvv####......',
    '......####gvgvgvgvgvgvgvgvgvgV####......',
    '......####gvgvgvgvgvgvgvgvgvgV####......',
    '......####gvgvgvgvgvgvgvgvgvgV####......',
    '......####VVVVVVVVVVVVVVVVVVVV####......',
    '......######dddddddddddddddd######......',
    '......#####ddhhsssssssssbbbDD#####......',
    '......#####ddbbbbbssssbbddDDD#####......',
    '......#####ddhDDDDshssDDDDDDD#####......',
    '......#####ddhk*00shsdk*00DDD#####......',
    '......######dhkk00shsdkk00DD##nnNn......',
    '......######dhddddshsdDDDDDD#knNnn......',
    '......######dhhhhsshsdssDdDDkuuuuy......',
    '......#######dddssshsdsDDDD#kuUUUyU.....',
    '......#######dhddsshsssDdDD#kuUzUyUU....',
    '......########dJjjDddDDDDD##kUUUUyUy....',
    '......######x#DJJjjjjjDDDD#xksyyyyyyk...',
    '......#####ccx#DJDDDDDDDD#xkssksksyk....',
    '......#####ccx#DJJJJJJDDD#xkoooooooOk...',
    '......####ccCCx#DJJbbDDD#xCkooooooOOk...',
    '......####ccCCCx#DJbbDD#xCCkOOOOOOOO....',
    '......###ccCCCCCx#DDDD#xCCCCkOOOOOOk....',
    '......###ccCCCCCxeeeeeexCCCCCxcCCCxxk...',
    '......##ccCCCCCCFFEEEEEECCCCCxcCCCCxxk..',
    '......#cccCCCCCEEEEEEEEeeCCCCxcCCCCCxxk.',
    '.....kccccCCCCxCEEEEEeeeexCCCxcCCCCCxxk.',
    '.....kccCCCCCCCCFEeCxCCCCCCCCxcCCCCCxxk.',
    '.....kccCCCCCCCCFEeCxcCCCCCCCxcCCCCCxxk.',
    '.....kccCCCCCCCCFEeCxCCCCCCCCxcCCCCCxxk.',
    '.....kccCCCCCCCCCFeCxCCCCCCCCxcCCCCCxxk.',
    '.....kccCCCCCCCCCFeCxcCCCCCCCxcCCCCCxxk.',
  ],
  moods: {
    // olhar esperto de lado, sorrisinho de canto
    idle: { x: 34, y: 18, rows: [
      'k..',
      'nk.',
      'Nk.',
      'uuk',
      '.Uk',
      '..k',
      '..k',
      '...',
      '...',
      '...',
      '...',
      '..k',
    ] },
    // olha para cima, sobrancelha direita erguida, boca de lado
    thinking: { x: 14, y: 14, rows: [
      '........bbbbb..........',
      '.......b..ddD..........',
      '........ss.............',
      '00*k....00*k...........',
      '00kk....00kk........k..',
      '00......00..........nk.',
      '....................Nk.',
      '....................uuk',
      '.....................Uk',
      '......................k',
      '......................k',
      '.....D.................',
      '...Jjj.................',
      '....jjjD...............',
      '.......................',
      '......................k',
    ] },
    // pálpebras caídas, sorriso torto
    smug: { x: 14, y: 18, rows: [
      'dddd....DDDD........k..',
      '0.k.....0.k.........nk.',
      '....................Nk.',
      '....................uuk',
      '.....................Uk',
      '......................k',
      '......................k',
      '.......................',
      '..D....................',
      '.......................',
      '.......................',
      '......................k',
    ] },
    // olhos espremidos, careta com sangue e a carteira cai da mão
    hurt: { x: 14, y: 15, rows: [
      '.bbb....bb.dD..........',
      '.sss....ss.bb..........',
      'kkss....sskk...........',
      'hskk.....kdd...........',
      '..ss....sskk....####...',
      '...............#####...',
      '..............######...',
      '..............##k#k#k..',
      '..............#ksksksk.',
      '..............#ksksksk.',
      '..MttMMttM....#koooooo.',
      '..MMMMMMMM...xxkoooooOk',
      '..MMMMMMMM...xxk....O..',
      '........!....CxkOOOO...',
      '........!....Cxxk....k.',
      '........!.....Cxx###k..',
    ] },
  },
  // falando: boca aberta escura
  speak: { x: 15, y: 24, rows: [
    'JjjDddDDDD',
    'JJMttttMDD',
    'DJMMMMMMDD',
    'DJMMMMMMDD',
    '#DJJbbDDD#',
  ] },
});

export function CarlinhosAvatar({ className = 'w-12 h-12', mood = 'idle', isSpeaking = false }) {
  return <Portrait art={CARLINHOS} className={className} mood={mood} isSpeaking={isSpeaking} />;
}

// 2. BIGODE DE OURO — "O Banqueiro do Bicho"
// Bicheiro gordo e satisfeito: bigodão pintado de ouro (o destaque), papada, óculos
// escuros na testa, cordões grossos, camisa de oncinha aberta e anel de ouro.
const BIGODE = makeArt({
  pal: {
    '0': '#d8ccb2', // branco do olho
    '#': '#090a0f', // fundo da silhueta
    k: '#0b0806', // contorno / pupila
    '*': '#ffffff', // brilho
    M: '#220b0b', // boca aberta
    '~': '#7cc4f0', // gota de suor
    '^': '#e4f6ff', // brilho do suor
    H: '#141012', // cabelo engomado
    I: '#2e2a30', // cabelo (luz)
    i: '#5e5a68', // brilho da brilhantina
    h: '#ecbc92', // pele (luz)
    s: '#d39a70', // pele (base)
    d: '#9c6644', // pele (sombra)
    D: '#6a3e26', // pele (oclusão)
    R: '#d8786a', // bochecha corada
    b: '#2a1c12', // sobrancelha / pelo do peito
    Y: '#fff2b0', // ouro (brilho)
    y: '#ffcf4a', // ouro (luz)
    o: '#d9a23a', // ouro (base)
    O: '#9a6a1c', // ouro (sombra)
    U: '#5e3f0e', // ouro (oclusão)
    L: '#141820', // lente dos óculos escuros
    l: '#56657a', // reflexo da lente
    P: '#6e5a1c', // camisa (base, ouro escuro)
    p: '#8f7a30', // camisa (luz)
    Q: '#463810', // camisa (sombra)
    K: '#1e1808', // estampa de oncinha
    c: '#c9b26a', // estampa (miolo claro)
  },
  // base: tudo que não muda com o humor
  base: [
    '........................................',
    '........................................',
    '...............kkkkkkkkkk...............',
    '.............kkHIHHHHHHHHkk.............',
    '......#######HIiiiiiiHHHHHH#######......',
    '......#####HIIIIIIiiiiiiiHHHH#####......',
    '......####HIHHHHHHHHHHHHHHHHHH####......',
    '......####HIIIIIHHHHHIIIIIIIHH####......',
    '......###HIHHHHHHHHHHHHHHHHHHHH###......',
    '......###HIHooooooHHHHooooooHHH###......',
    '......###HIoLLLLLLooooLLLLLLoHH###......',
    '......###HkoLlLLLLokkoLlLLLLokH###......',
    '......###HdkoLLLLoksskoLLLLokDH###......',
    '......###HdhkooooksssskooookDDH###......',
    '.....k###HhbbkkkksssssskkkkbbDH###k.....',
    '....kDd##HhhDDDDsshhddssDDDDdDH##DDk....',
    '....kDd##dhh0*k0sshhddss0*k0dDD##DDk....',
    '....kDd##dhh0kk0sshhddss0kk0dDD##DDk....',
    '....kDkk#dhhddddshhssddsdddddDD#kkDk....',
    '.....kyYkhhhssssshhssddssssdddDkyok.....',
    '......yykhRRRsssshhRRddssssRRRDkoo......',
    '......oykkRRRskkkkkkkkkkkksRRRkkoo......',
    '......OoyykkkkyyYYYyoyyyookkkkoooO......',
    '......kOooyyyyyYYYYyoyyyyoooooooOk......',
    '......#kOOooooyyyyyoooooooooooOOk#......',
    '......#dkkUOOooooooooooooooOOUkkD#......',
    '......#dhhkkkUOOOooooooOOOUkkkdDD#......',
    '......#dhhhsskkkUOOOOOOUkkksdddDD#......',
    '.....kkkhhhssssskkkkkkkkssssdddDD#......',
    '....khhdkhhhssssssssssssdssdddDD##......',
    '....khsdkdhDDsshhhhhssssdddDDDD###......',
    '...kkhsdkkdhhDDDDDDDDDDDDDDdDD####......',
    '..khhhsssdkpdhhhhhhssssddddDPkQ###k.....',
    '..kddyYdddkpypyOddddddddOoPOkQPPQQQk....',
    '..khsoOssdkpOppoOsssssbOyPPyQPPPPQQQk...',
    '..kddddddDkPpyppyosssbyoPPOQcKPPKKQQQk..',
    '..khssssdDkKKOppQOyoyoOQPkyPPPPKccKQQk..',
    '..kdddddDDkccKypQdkyYkDQkOKPPPPPPPQQQk..',
    '...kQQQQQkPPPPPOydykyODOyccKPKKPPPKKQk..',
    '...kQPPPQkPPPKKPPOoOOUyPPPPPKccKPKccKk..',
  ],
  moods: {
    // olhinhos apertados pela bochecha, sorriso de dono da banca
    idle: { x: 4, y: 20, rows: [
      'ko............................ok',
      'kO............................Ok',
      '.k............................k.',
    ] },
    // olha para cima, sobrancelha direita erguida, boca fechada
    thinking: { x: 4, y: 13, rows: [
      '...................bbbb.b.......',
      '..................bsssddd.......',
      '........hsss........ssdd........',
      '........kk0.........kk0.........',
      '.........00..........00.........',
      '................................',
      '................................',
      'ko............................ok',
      'kO............................Ok',
      '.k............................k.',
    ] },
    // olhos fechados de satisfação, sorrisão com dentes de ouro
    smug: { x: 4, y: 15, rows: [
      '........hsss........ssdd........',
      '........hk.s........sk.d........',
      '........kssk........ksdk........',
      '........hsss........ss..........',
      '................................',
      'ko............................ok',
      'kO............................Ok',
      '.k............................k.',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '...........MyYyOOyYyM...........',
      '............MMMMMMMM............',
    ] },
    // olhos em X, bigode murcha, óculos tortos e suor na testa
    hurt: { x: 4, y: 9, rows: [
      '.......o.....H.............~....',
      '......oL.....o............^~~...',
      '......oLlL...ok.........Lo~~~...',
      '......koL...oks.koL....Lok......',
      '.......ko.kbks...kokkkLok.......',
      '........k.sss.....kooo.k........',
      '........kssk.......kkkdk........',
      '........hk.s........sk.d........',
      '........h..s........s..d........',
      '..d#....kssk........ks.k....#D..',
      '..D#d......................D#D..',
      '..##d......................D##..',
      '..##d.k..................k.D##..',
      '..#kk.y..................o.kk#..',
      '...oyy......................o...',
      '.kOoo......................ooOk.',
      'kOoOU......................UOoOk',
      'kOOkk......................kkOOk',
      'kUk..........................kUk',
      '...........MyyOyyOyyM.........k.',
      '...........MMMMMMMMMM...........',
    ] },
  },
  // falando: boca aberta com os dentes de ouro
  speak: { x: 14, y: 27, rows: [
    'kkUOOOOOOUkk',
    'skyYOyyOyyks',
    'ssMMMMMMMMds',
    'shMMMMMMMMdd',
  ] },
});

export function BigodeAvatar({ className = 'w-12 h-12', mood = 'idle', isSpeaking = false }) {
  return <Portrait art={BIGODE} className={className} mood={mood} isSpeaking={isSpeaking} />;
}

// 3. MADAMA SOFIA — "A Vidente"
// Cartomante mística: turbante violeta com joia, olhos de kohl com íris violeta que
// brilha, argolas de ouro, colares de contas e a bola de cristal lilás entre as mãos.
const SOFIA = makeArt({
  pal: {
    '0': '#d8ccb2', // branco do olho
    '#': '#090a0f', // fundo da silhueta
    k: '#0b0806', // contorno / pupila
    '*': '#ffffff', // brilho
    M: '#220b0b', // boca aberta
    t: '#e9e1cc', // dentes
    T: '#b48ae6', // turbante (brilho)
    V: '#8656c0', // turbante (luz)
    v: '#5e2c90', // turbante (base, violeta)
    u: '#3e1c64', // turbante (sombra)
    U: '#24103b', // turbante (oclusão)
    J: '#3fe0a0', // joia
    j: '#178a5e', // joia (sombra)
    Y: '#fff0b0', // ouro (brilho)
    y: '#e8b84a', // ouro (base)
    o: '#9a6a1c', // ouro (sombra)
    h: '#e4b08a', // pele (luz)
    s: '#c99068', // pele (base)
    d: '#94603e', // pele (sombra)
    D: '#64381e', // pele (oclusão)
    l: '#cf9cc4', // pele com luz lilás da bola
    H: '#1c0f22', // cabelo
    I: '#3e2648', // cabelo (luz)
    e: '#d6a8ff', // íris violeta que brilha
    E: '#8a52e0', // íris (sombra)
    m: '#a01e4a', // batom magenta
    n: '#d4507e', // batom (luz)
    P: '#4a2a7a', // xale (base)
    p: '#6c44a4', // xale (luz)
    Q: '#331b56', // xale (sombra)
    q: '#1e0f33', // xale (oclusão)
    r: '#c4203e', // conta vermelha / unha
    b: '#3a2a78', // bola de cristal (sombra)
    c: '#7e62d0', // bola de cristal (base)
    C: '#bba2ff', // bola de cristal (luz)
    W: '#f2eaff', // bola de cristal (brilho)
    x: '#2a1e40', // rachadura / bola apagada
  },
  // base: tudo que não muda com o humor
  base: [
    '...............kkkkkkkkkk...............',
    '............kkkTTTTTTTuuUkkk............',
    '..........kkTTTTTvvvvvvvvuuUkk..........',
    '.........kuVVvvvvvvvvvvvvvvuuUk.........',
    '......###uTVvvvvvvvvvvvvvvvvuVU###......',
    '......##uuVTvvvvvvvvvvvvvvvvVuuU##......',
    '......##uVuvTvvvvvvvvvvvvvvVvuuU##......',
    '......##uVVuuTvvvvvvvvvvvvVvuuuU##......',
    '......##uVVvvuTTvvyYyvvvvVvuvuuU##......',
    '......##uuVVvvuvTyJJjovvVuuvvuUU##......',
    '......##uVuuVvvuuyJ*jovVuvvvvUuU##......',
    '......##uVVvuVVvvyjjjoVuvvvUUuuU##......',
    '......##uVVvvuuVvvooovuvvvUvvuuU##......',
    '......###uuuuuuuuuuuuuuuuuuuuuU###......',
    '......###HUUUUUUUUUUUUUUUUUUUUH###......',
    '......###HIHHHHHHssssssHHHHHHHH###......',
    '......###HIkhhssssssssssssddkHH###......',
    '......###HIHkkkkksssssskkkkkHHH###......',
    '......###HIdh0e*0ssssss0e*0dDHH###......',
    '......###HIdh0EE0sshsss0EE0dDHH###......',
    '......###HIdhhssssshdsssssddDHH###......',
    '......##YyydhhhhssshdsssssddDYoo##......',
    '......#y###odhhsssshdssssddDo###o#......',
    '......#y###odhhsssDssDsssddDo###o#......',
    '......#y###odhhsmssssssmkddDo###o#......',
    '......#o###o#dhhsmnnmmmsddD#o###o#......',
    '......##ooo###dhhsmmmmsddD###ooo##......',
    '......#########dlhssssdlD#########......',
    '......##########dlhssdlD##########......',
    '......###########dlbbbD###########......',
    '......######QppydccccccboQQq######......',
    '......###QppPPPycCWCCcccbPPPQQq###......',
    '......#QppPkkkPPcWWCCCccbPykkkQQq#......',
    '.....kQppPkhhsskcCCCCCccbksssdkQQqk.....',
    '....kQppPPkhsssrcCCCCcccbrsssdkPQQqk....',
    '....kQppPPkdsssrccccccccbrssddkPQQqk....',
    '....kQppPPkddsdkccccccccbkdddDkPQQqk....',
    '....kQppPPPkddkPbccccccbbPkDDkPPQQqk....',
    '....kQppPPPPPPPyyyyyyyyyoPPPPPPPQQqk....',
    '....kQppPPPPPPyYyyyyyyyoooPPPPPPQQqk....',
  ],
  moods: {
    // olhar sereno de vidente, íris violeta brilhando
    idle: null,
    // olhos revirados para cima e uma runa acende na bola
    thinking: { x: 14, y: 14, rows: [
      '.........HHHHH',
      '........Hsssdd',
      '..............',
      '..............',
      '.e.........e..',
      '00........00..',
      '..............',
      '..............',
      '..............',
      '..............',
      '..s......s....',
      '...smm..s.....',
      '.....n........',
      '..............',
      '..............',
      '..............',
      '..............',
      '..............',
      '.......W......',
      '.......WW.....',
      '.......W.W....',
      '.......WW.....',
      '.......W......',
      '.......W......',
    ] },
    // pálpebras caídas, sorriso de canto de quem já sabia
    smug: { x: 12, y: 15, rows: [
      'hhsss..........',
      'HHHHH..........',
      '...............',
      '.kkkk......kkkk',
      '..ee........ee.',
      '...............',
      '...............',
      '...............',
      '............m..',
      '....s..........',
      '....D.mm.......',
      '......nn.......',
    ] },
    // olhos espremidos, rímel escorrendo e a bola racha e apaga
    hurt: { x: 11, y: 15, rows: [
      '.hhs..H....H..sdd.',
      'H.HH..........HH.H',
      '.h..ss......ss..d.',
      '..hskk......kksd..',
      '..kkss......sskk..',
      '...k..........k...',
      '...k..........k...',
      '...k..........k...',
      '...k..........D...',
      '...D..mmmmmm......',
      '.....MttttttM.....',
      '.....MMMMMMMM.....',
      '.....MMMMMMMM.....',
      '.....mmmmmmmm.....',
      '........xxx.......',
      '......bbbbxbx.....',
      '.....bcCcxbbbx....',
      '.....bCCcxxbbx....',
      '.....bcccccxbx....',
      '.....bccccxbbx....',
      '.....bbbbxbbbx....',
      '.....bbbbxbbbx....',
      '.....xbbbbbbxx....',
    ] },
  },
  // falando: lábios magenta abertos
  speak: { x: 15, y: 23, rows: [
    'sssDssDsss',
    'ssnnnnnnsk',
    'hmMttttMmd',
    'hmMMMMMMmd',
    'dlmmmmmmlD',
  ] },
});

export function SofiaAvatar({ className = 'w-12 h-12', mood = 'idle', isSpeaking = false }) {
  return <Portrait art={SOFIA} className={className} mood={mood} isSpeaking={isSpeaking} />;
}
