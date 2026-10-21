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
    '..kddddddDkPpyppyosssbyoPPOQQKPPKKQQQk..',
    '..khssssdDkKKOppQOyoyoOQPkyPPPPKQQKQQk..',
    '..kdddddDDkQQKypQdkyYkDQkOKPPPPPPPQQQk..',
    '...kQQQQQkPPPPPOydykyODOyQQKPKKPPPKKQk..',
    '...kQPPPQkPPPKKPPOoOOUyPPPPPKQQKPKQQKk..',
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
    '.............kkkuTTTuTuUkkk.............',
    '...........kkuTTTTvvvuvvuuUkk...........',
    '.........kkuTTTvvvvvvvuvvvuuUkk.........',
    '........kuVVvvvvvvvvvvuvvvvvuuUk........',
    '......##uVTvvvvvvvvvvvvuvvvvvVuU##......',
    '......#uVuvTvvvvvvvvvvvvvvvvVvuuU#......',
    '......#uVVuvTvvvvvvvvvvvvvvVvuuuU#......',
    '......#uVVvuuTvvvvvvvvvvvvVvuvuuU#......',
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

// 4. DOUTOR FAUSTO — "O Alquimista"
// Frio e calculista: cabelo preto engomado e repartido, pele pálida, rosto fino, óculos
// redondos com reflexo de cristal ciano, terno ônix e broche de cristal. Humores sutis.
const FAUSTO = makeArt({
  pal: {
    '0': '#d8ccb2', // branco do olho
    '#': '#090a0f', // fundo da silhueta
    k: '#0b0806', // contorno / pupila
    M: '#220b0b', // boca aberta
    t: '#e9e1cc', // dentes
    '!': '#c8261d', // sangue
    H: '#111115', // cabelo engomado
    I: '#2a2a34', // cabelo (luz)
    i: '#6c7488', // brilho frio do cabelo
    h: '#f4e9dc', // pele pálida (luz)
    s: '#dccab6', // pele pálida (base)
    d: '#a89684', // pele (sombra)
    D: '#706254', // pele (oclusão)
    b: '#16161c', // sobrancelha fina
    f: '#b4bac2', // aro dos óculos (luz)
    F: '#5a5e66', // aro dos óculos (sombra)
    c: '#36d6e4', // reflexo de cristal ciano
    C: '#c6fbff', // reflexo ciano (brilho)
    X: '#13707c', // cristal (sombra)
    P: '#24242a', // terno ônix (base)
    p: '#40404c', // terno (luz)
    Q: '#121216', // terno (sombra)
    l: '#56566a', // lapela acetinada
    w: '#e6e1d4', // colarinho branco
    W: '#a6a196', // colarinho (sombra)
    R: '#6a1418', // gravata vinho
    r: '#3e0a0e', // gravata (sombra)
  },
  // base: tudo que não muda com o humor
  base: [
    '........................................',
    '........................................',
    '........................................',
    '...............kkkkkkkkkk...............',
    '......#########HIHHHHHHHH#########......',
    '......#######HIkiiiiiiiHHHH#######......',
    '......######IIIkHIIIIIIIIIHH######......',
    '......#####HIHHkHHHHHHHHHHHHH#####......',
    '......#####HIHHHHHHHHiiiiiiHH#####......',
    '......#####HIHHHHHHiiHHHHHHHH#####......',
    '......#####HIHHHHHHHHHHHHHHHH#####......',
    '......#####HHHhhssHHHHssHHHHH#####......',
    '......#####HHhhssssHHssssdHHH#####......',
    '......#####HHhhssssssssssddHH#####......',
    '......#####HdbbbbssssssbbbbDH#####......',
    '......#####HdffffbssssbffffDH#####......',
    '......#####FfCcDDFfffffCcDDFF#####......',
    '......#####dfckk0Fshssfckk0FD#####......',
    '......#####df0kk0Fshssf0kk0FD#####......',
    '......#####ddFFFFsshsdsFFFFDD#####......',
    '......######dhhsssshsdsssddD######......',
    '......######dhhsssshsdsssddD######......',
    '......#######dhhssshsdssddD#######......',
    '......#######ddhssshsdssDdD#######......',
    '......#######ddhssshsdssDdD#######......',
    '......########ddhsDddDsDdD########......',
    '......########dhhssssssddD########......',
    '......#########dhhssssddD#########......',
    '......#########dhDDDDDDdD#########......',
    '......##########ddhssddD##########......',
    '......###########dhhddd###########......',
    '......#########WwwdddDwWW#########......',
    '......######ppWwwwwRRwwwWWQQ######......',
    '......##ppPPPPpllwRRRrwlQQPPPQQQ##......',
    '......#ppPPPPpllWwwRrwWWlQCPPPQQQ#......',
    '.....kppPPPPPpllPWwRrWWPlcCcPPPQQQk.....',
    '.....kppPPPPpllPPPWRrWPPPXcXPPPQQQk.....',
    '.....kppPPPplPlPPPWRrWPPPlXQQPPQQQk.....',
    '.....kppPPPpllPPPPPRrPPPPPlQQPPQQQk.....',
    '.....kppPPplPlPPPPPRrPPPPPlPQQPQQQk.....',
  ],
  moods: {
    // neutro, boca reta
    idle: null,
    // olhos para cima e de lado, sobrancelha direita sobe um pixel
    thinking: { x: 14, y: 13, rows: [
      '........bbbbb',
      '...b.....ssdd',
      '...s....s....',
      '.............',
      '0.k.......0.k',
      '00........00.',
      '.............',
      '.............',
      '.............',
      '.............',
      '.............',
      '.............',
      '.............',
      '.............',
      '.............',
      '.......sd....',
    ] },
    // pálpebras a meio pau, canto da boca sobe
    smug: { x: 13, y: 14, rows: [
      'hhss......s...',
      '..............',
      '..ss........dd',
      '.DDD.......DDD',
      '..............',
      '..............',
      '..............',
      '..............',
      '..............',
      '..............',
      '..............',
      '..............',
      '..............',
      '.........D....',
      '.........d....',
    ] },
    // olhos fechados de dor, lente trincada, dentes cerrados e fio de sangue
    hurt: { x: 13, y: 13, rows: [
      '..bbb....bbb..',
      '..ss......ss..',
      '....s....s....',
      'hhss.......sdC',
      'khsk......kC.k',
      'k..k......k..k',
      '............k.',
      '..............',
      '..............',
      '..............',
      '..............',
      '..............',
      '..............',
      '..............',
      '....ttkttt....',
      '....MMMMMM....',
      '........!.....',
      '........!.....',
      '........!.....',
    ] },
  },
  // falando: boca pequena e escura
  speak: { x: 16, y: 26, rows: [
    'hssssssd',
    'hhMMMMdd',
    'hhMMMMdd',
    'dddddddD',
  ] },
});

export function FaustoAvatar({ className = 'w-12 h-12', mood = 'idle', isSpeaking = false }) {
  return <Portrait art={FAUSTO} className={className} mood={mood} isSpeaking={isSpeaking} />;
}

// 5. ALEMÃO DO FERRO VELHO — "O Sucateiro"
// Sucateiro enorme: cabeçorra quadrada, loiro raspado e barbona, óculos de solda na
// testa, rosto vermelho, macacão de lona enferrujada com rebites e a chave inglesa no ombro.
const ALEMAO = makeArt({
  pal: {
    '0': '#d8ccb2', // branco do olho
    '#': '#090a0f', // fundo da silhueta
    k: '#0b0806', // contorno / pupila
    '*': '#ffffff', // brilho
    M: '#220b0b', // boca aberta
    t: '#e9e1cc', // dentes
    '!': '#c8261d', // sangue
    '~': '#7cc4f0', // gota de suor
    '^': '#e4f6ff', // brilho do suor
    Y: '#f6e08a', // loiro (luz)
    y: '#d8b450', // loiro (base)
    o: '#a07e2a', // loiro (sombra)
    O: '#664e18', // loiro (oclusão)
    h: '#f4b894', // pele avermelhada (luz)
    s: '#de906c', // pele (base)
    d: '#ac5c44', // pele (sombra)
    D: '#763626', // pele (oclusão)
    R: '#d4564a', // bochecha e nariz vermelhos
    G: '#3a2414', // tira de couro dos óculos
    f: '#8a8e96', // aro de ferro (luz)
    F: '#43474e', // aro de ferro (sombra)
    L: '#121c22', // lente escura de solda
    l: '#5aa8d0', // reflexo da lente
    P: '#7a4426', // macacão de lona (base)
    p: '#a2623a', // macacão (luz)
    Q: '#56301a', // macacão (sombra)
    q: '#361a0c', // macacão (oclusão)
    I: '#9a9ea6', // rebite
    i: '#eef0f2', // rebite (brilho)
    e: '#a4aab2', // chave inglesa (luz)
    E: '#5e626a', // chave inglesa (sombra)
    x: '#a8542a', // ferrugem
  },
  // base: tudo que não muda com o humor
  base: [
    '........................................',
    '........................................',
    '........................................',
    '........................................',
    '......############################......',
    '......#####oYYYYYYYYYyyyyyooO#####......',
    '......####oYYyyyyyyyyyyyyyyooO####......',
    '......###oYYoyyyoyyyoyyyoyyyooO###......',
    '......###oYYffffyyyyyyyyffffooO###......',
    '......###oYfLLLLFyoyyyofLLLLFoO###......',
    '......##GGGfLlLLFFFFFFFfLlLLFGGG##......',
    '......##GGGfLLLLFGGGGGGfLLLLFGGG##..kk..',
    '......###dhhFFFFssssssssFFFFdDD#eekkeek.',
    '......###dhhsssssssssssssssddDDeEekkeEek',
    '......###dhhssssddddddddsssddDDeEekkeEek',
    '......###dhyyyssssssssssssyyyDDexekkxEek',
    '......#DddhoooyyyyssssyyyyoooDDDDEeeEEek',
    '......#DddhhssoooossssoooosddDDDDExEEek.',
    '......#Dddhhs0*k0shssds0*k0ddDDDDeEEek..',
    '......##Ddhhs0kk0shssds0kk0ddDDD##eEek..',
    '......###dhhsddddhssssdddddddDD###eEkk..',
    '......###dhRRRssshRRRRdsssRRRDD###kEeEk.',
    '......###dhRRRsssDRRRRDsssRRRDD###kEeEk.',
    '......###yyysssYYYYYyyyyyssdooo###EeEk..',
    '......###yyyysyyyyyyoooooysoooo###xeEk..',
    '......###oYyyyyyyyyyyyyyyyyyooO###EeEk..',
    '......###oYyyyyyyDDDDDDyyyyyooO##xeEk...',
    '......###oYyoyyyDyyyyyyDyyoyooO##EeEk...',
    '......####oYyyyyyyyyyyyyyyyooO###EeEk...',
    '......####oYyyyyyyyyyyyyyyyooO##EeEk....',
    '.....k###ppoYyyyoyyyyyoyyyooOQQ#xeEk....',
    '...kkQppppppoYyyyyyyyyyyyooOQQQQQQqkk...',
    '..kQppPPpppppoYyyyyoyyyyooOQQQQQPPQQqk..',
    '.kQppPPPPPPqQQQoYyyyyyooOQQQqPPPPPPQQqk.',
    'kQppPPPPPPPqiIPPPoYyooOPPPPiIPPPPPPPQQqk',
    'kQppPiIPPPPqIqPPPPPPPPPPPPPIqPPPPPiIQQqk',
    'kQppPIqPPPPqpPPPPqqqqqqPPPPQqPPPPPIqQQqk',
    'kQppPPPPPPPqpPPPPiIQQQiIPPPQqPPPPPPPQQqk',
    'kQppPPPPPPPqpPPPPIqQQQIqPPPQqPPPPPPPQQqk',
    'kQppPPPPPPPqpPPPPPPPPPPPPPPQqPPPPPPPQQqk',
  ],
  moods: {
    // cara fechada, sobrancelhas franzidas
    idle: null,
    // olha para cima, uma sobrancelha sobe, boca de lado
    thinking: { x: 13, y: 13, rows: [
      '.........yyyyyyy',
      '.........ooooooo',
      '.yyyy........sdd',
      '.oooo....sssssdd',
      '.ssss....ssss...',
      'kk0.......kk0...',
      '.00........00...',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '....yy..........',
      '...y......y.....',
    ] },
    // pálpebras caídas, sorrisão banguela
    smug: { x: 13, y: 14, rows: [
      '............yyyy',
      '.yyyy....yyyoooo',
      '.oooo....ooossdd',
      '.ssss....ssss...',
      'DDDD......DDDD..',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '...MtttMttM.....',
      '...yMMMMMMy.....',
    ] },
    // olhos em X, os óculos de solda escorregam, suor e sangue
    hurt: { x: 11, y: 8, rows: [
      '.yyyy................',
      'Yyyoyy...............',
      'GffffG...............',
      '.....................',
      'fLlLLF.............~.',
      'fLLLLF............^~~',
      '.FFyyyy....yyyy....~.',
      '...oooo....oooo......',
      '...ssss....ssss......',
      '..kssks....skssk.....',
      '..sk.s......sk.s.....',
      '..kssk......kssk.....',
      '.....................',
      '.....................',
      '.....................',
      '.....................',
      '.....................',
      '.....................',
      '.....MttktttM........',
      '.....MMMMMMMM........',
      '.....MMMMMMMM........',
      '............!........',
      '............!........',
      '............!........',
    ] },
  },
  // falando: boca aberta no meio da barba
  speak: { x: 15, y: 25, rows: [
    'yyyyyyyyyy',
    'yyttttttyy',
    'yyMMMMMMyy',
    'yyMMMMMMyy',
  ] },
});

export function AlemaoAvatar({ className = 'w-12 h-12', mood = 'idle', isSpeaking = false }) {
  return <Portrait art={ALEMAO} className={className} mood={mood} isSpeaking={isSpeaking} />;
}

// 6. COMENDADOR MOREIRA — "O Dono do Boteco" (CHEFE FINAL)
// Velho rico e cruel na poltrona de mogno: cabelo e sobrancelhas brancas, monóculo de ouro
// com corrente, charuto aceso, robe de veludo vermelho com lapela preta, a comenda no peito
// e o anel de rubi no copo de conhaque. Brasa do charuto: pixels x 34–35, y 20–22; a fumaça
// sai de (35, 19.5) na grade 40 em idle/thinking/smug (e falando). No hurt o charuto cai.
const COMENDADOR = makeArt({
  pal: {
    '0': '#d8ccb2', // branco do olho
    k: '#0b0806', // contorno / pupila
    '*': '#ffffff', // brilho
    M: '#220b0b', // boca aberta
    t: '#e9e1cc', // dentes
    '!': '#c8261d', // sangue
    '~': '#7cc4f0', // gota de suor
    '^': '#e4f6ff', // brilho do suor
    A: '#6a2a1a', // poltrona de mogno (luz)
    a: '#44160e', // poltrona (base)
    Z: '#1e0806', // poltrona (estofado escuro)
    z: '#2e0e0a', // capitonê
    W: '#f6f1e6', // cabelo branco (luz)
    w: '#d2c9b8', // cabelo branco (base)
    v: '#958c7c', // cabelo branco (sombra)
    h: '#eebc98', // pele (luz)
    s: '#d49e78', // pele (base)
    d: '#a26846', // pele (sombra)
    D: '#683c24', // pele (oclusão)
    Y: '#fff2b4', // ouro (brilho)
    y: '#ffcf4a', // ouro (luz)
    o: '#b8861e', // ouro (base)
    O: '#6e4c10', // ouro (sombra)
    n: '#e8d8c4', // lente do monóculo
    V: '#b8262c', // veludo vermelho (luz)
    r: '#8f1016', // veludo vermelho (base)
    R: '#5c0a0e', // veludo (sombra)
    q: '#340508', // veludo (oclusão)
    P: '#141016', // lapela de cetim preto
    p: '#3e3446', // lapela (brilho)
    u: '#ece6da', // camisa branca
    U: '#aaa294', // camisa (sombra)
    e: '#d41e2c', // rubi / esmalte vermelho
    c: '#7a4422', // charuto (base)
    C: '#a4652f', // charuto (luz)
    x: '#3e2010', // charuto (sombra)
    g: '#8e8a84', // cinza do charuto
    E: '#ea580c', // brasa
    F: '#fef08a', // brasa incandescente
    b: '#c27a24', // conhaque
    B: '#e8a040', // conhaque (luz)
    l: '#9ab0b8', // vidro do copo
  },
  // base: tudo que não muda com o humor
  base: [
    '........................................',
    '........aAaaaaaaaaaaaaaaaaaaaaaZ........',
    '.....aAaayaayaayaayaayaayaayaayaaaZ.....',
    '....aAaaaaaaaaaaaaaaaaaaaaaaaaaaaaaZ....',
    '...AAaZZZZZZZZvWWwwwwwwwvvZZZZZZZZaaZ...',
    '...AAaZZZZZZvWWWWWWWWwwwwwvvZZZZZZaaZ...',
    '...AaaZZzZZvWvvvvvwwvvvvvvvvvZZZzZaaZ...',
    '...AaaZzozvWWwwwwwwwwwwwwwwwvvZzozaaZ...',
    '...AoaZZzZvWWwvvvvvvvvvwwwwwvvZZzZaoZ...',
    '...AaaZZZZvWWwwwwsssssswwwwwvvZZZZaaZ...',
    '...AaaZZZZwwwdhhsssssssddDDvvvZZZZaaZ...',
    '...AaaZZZZwwdhdddddssdddddDDvvZZZZaaZ...',
    '...AoaZZZZwwhhsssssssssssddDvvZZZZaoZ...',
    '...AaaZZZZwwWWWddddddddddWWWvvZZZZaaZ...',
    '...AaaZZZZwdwwwWWWssssWWWwwwDvZZZZaaZ...',
    '...AaaZZZDddhhsswwshdswYyyyDDDDZZZaaZ...',
    '...AoaZZzDddhDDDDsshdsy0*knoDDDZzZaoZ...',
    '...AaaZzoDddh0*k0sshsdy0kknoDDDzozaaZ...',
    '...AaaZZzDddh0kk0sshsdo0kk0OdDDZzZaaZ...',
    '...AaaZZZZDddddddshssdossddODDZZZZaaZ...',
    '...AoaZZZZZdhhsssshsssdoOOODDZZZZgEFZ...',
    '...AaaZZZZZdhhsssshsssdssddDyZZZCgFEZ...',
    '...AaaZZZZZdhDssdshsssdDsdDDDzCCcgEaZ...',
    '...AaaZZZZZdhhssdsDssDDDsddDCCccxxaaZ...',
    '...AoaZZZZZdhhsWWWWWwwwwwdyCccxxZZaoZ...',
    '...AaaZZZZZdhhvwwwwwwwvvCyycxxZZZZaaZ...',
    '...AaaZZzZZZdhhdDDDDDDDCcyexZZZZzZaaZ...',
    '...AaaZzozZZdhhDsddddddcxeDDZyZzozaaZ...',
    '...AoaZZzZZZZddhsssssssxddDZZZZZzZaoZ...',
    '...AaaZZZZZZZZddhsssssdddDZZZZyZZZaaZ...',
    '...AaallllllZZZdhhsssddDDZZZZZZZZZaaZ...',
    '...AalBBBBBBlpPPdhhsddDDPPpRqZyZZZaaZ...',
    '...AolbBbbbblPPPPpPPPPuUPPPprRRRqZaoZ...',
    '...AaRlbbbblPPPrPPuuPPuUrPPPpyrRRRqaZ...',
    '...ARVVllllpPPPrruueyuUrrPPPprrrRRRqZ...',
    '...ARVkhhsskpPPPruuyuuUrPPPprrrrRRRqZ...',
    '...ARkhsyesdkPPPruyYyuUrPPPprrrrRRRqZ...',
    '...ARkdddoddkpPPPyoeoOrPPPprrrrrRRRqZ...',
    '...ARkhssssdkpPPProOOUrPPPprrrrrRRRqZ...',
    '...ARVkddddkrrpPPPuOuUPPPprrrrrrRRRqZ...',
  ],
  moods: {
    // olhar frio por cima do monóculo, charuto aceso
    idle: null,
    // sobrancelha esquerda lá em cima, olhos de lado
    thinking: { x: 11, y: 13, rows: [
      '....WWW.......ddD',
      'W...www....sssddD',
      '.....ss....W....W',
      '..kk00......DDD..',
      '...00.......k.0..',
      '..hsss.......00..',
    ] },
    // pálpebras caídas e o canto da boca sobe com desdém
    smug: { x: 11, y: 13, rows: [
      'W...............',
      '................',
      '................',
      '............DDD.',
      '..dddd..........',
      '............ssdd',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '...........s....',
      '......hhhhhs....',
    ] },
    // o monóculo salta e fica pendurado, o charuto cai, olho espremido e suor
    hurt: { x: 11, y: 10, rows: [
      '.~.......................',
      '^~~......................',
      '.~.......................',
      '.hhsWWW....WWWddD........',
      '.hh.www....www.dD........',
      '.WW..ss....sssdWW........',
      '..kkss.....s.000D........',
      '..hs.k.....s...0D........',
      '..k.ss.....s.00.D........',
      '...........s....d........',
      '............ssdd......Zao',
      '.................D...ZZaa',
      '...................ZZZZa.',
      '.................DZZZZZ..',
      '...............dDDZZZ....',
      '....vvvvvvv..vvdDDZ......',
      '.....MMMMMMMMDdDD........',
      '....sMMMMMMMMdd...Z......',
      '...........!d....yyo.....',
      '...........!....yn.no....',
      '..........!.....o...O....',
      '.................oOO.....',
      '..................y......',
      '..................ry.....',
    ] },
  },
  // falando: boca aberta sob o bigode, o charuto continua no canto
  speak: { x: 15, y: 24, rows: [
    'WWWWWwwwww',
    'wwwwwwwvvC',
    'dsMMMMMMCc',
    'ssMttttMcx',
  ] },
});

export function ComendadorAvatar({ className = 'w-12 h-12', mood = 'idle', isSpeaking = false }) {
  return <Portrait art={COMENDADOR} className={className} mood={mood} isSpeaking={isSpeaking} />;
}
