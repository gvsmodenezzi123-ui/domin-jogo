/**
 * Versão 2.44: a entrada dos chefes, toda em WAAPI (transform e opacity, como a morte em
 * ScreenBreak.jsx). Uma cena em três tempos, igual para todos, e o número de cada um no começo:
 *  1. O número (0 – 1,1 s): a navalha corta a tela três vezes e o breu se parte (Arlindo); a
 *     chapa de ferro despenca, levanta poeira e faísca e tomba (Beto); a cortina de veludo abre
 *     no holofote e chovem moedas (Comendador); o globo da rifa gira e cospe a bolinha
 *     (Genésio); dois leques de plumas se abrem no paetê (Dama Soró); a sirene pisca e o
 *     holofote da ronda caça o rival na mira (Brandão); o relógio da dívida gira para trás e as
 *     notas caem (Dona Odete); a porta de aço desce com estrondo e sobe (Valtinho).
 *  2. O chefe (1 – 2,4 s): as faixas de cinema fecham, a faixa na cor dele cruza a tela com
 *     riscos de velocidade, o retrato entra como silhueta e acende num clarão com tranco; o
 *     nome bate letra por letra, a etiqueta (CHEFE DA REGIÃO…) corre, o título e os corações.
 *  3. A fala (2,6 s – fim): a fala de entrada se escreve no balão, letra por letra; no fim tudo
 *     varre para a esquerda e a mesa volta.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Cada chefe: cor, etiqueta, o som do número (e quando), a vibração. */
export const BOSS_THEMES = {
  arlindo: { id: 'navalha', accent: '#ff4fa3', deep: '#3a0a22', ink: '#1a0410', kicker: 'CHEFE DA REGIÃO 1', sfx: 'playRazorSlash', sfxAt: 120, buzz: [12, 30, 40, 200, 30] },
  beto: { id: 'ferro', accent: '#e07a2e', deep: '#3a1606', ink: '#1a0a02', kicker: 'CHEFE DA REGIÃO 2', sfx: 'playIronSlam', sfxAt: 0, buzz: [0, 400, 120, 60, 50] },
  comendador: { id: 'ouro', accent: '#f2b84b', deep: '#3a2606', ink: '#1a1002', kicker: 'CHEFE FINAL', sfx: 'playGrandEntrance', sfxAt: 380, buzz: [20, 400, 30, 200, 60] },
  genesio: { id: 'rifa', accent: '#7bd36a', deep: '#0e3010', ink: '#061404', kicker: 'CHEFE DA REGIÃO 1', sfx: 'playRaffleSpin', sfxAt: 0, buzz: [10, 40, 10, 40, 10, 40, 10, 400, 40] },
  soro: { id: 'chic', accent: '#ff7ad9', deep: '#3a0a34', ink: '#1a0418', kicker: 'CHEFE DA REGIÃO 2', sfx: 'playSilkFan', sfxAt: 60, buzz: [15, 60, 25] },
  brandao: { id: 'ronda', accent: '#4a8cff', deep: '#0a1a3a', ink: '#04081a', kicker: 'CHEFE DA REGIÃO 2', sfx: 'playPatrolWhistle', sfxAt: 0, buzz: [60, 80, 60, 80, 120] },
  odete: { id: 'agiota', accent: '#5fc48c', deep: '#0a2a18', ink: '#04140a', kicker: 'CHEFE FINAL', sfx: 'playDebtStamp', sfxArgs: [2.46], sfxAt: 0, buzz: [8, 242, 8, 242, 8, 242, 8, 1702, 90] },
  valtinhoRenegado: { id: 'contrabando', accent: '#f0a020', deep: '#2a2016', ink: '#140e06', kicker: 'CHEFE FINAL', sfx: 'playShutterSlam', sfxAt: 0, buzz: [0, 390, 120, 80, 40] },
};

/** Os tempos da parte comum (ms). */
export const T = { bars: 0, band: 980, portrait: 1060, flash: 1560, kicker: 1640, name: 1720, stamp: 2320 };
const LETTER_MS = 42;
const CHAR_MS = 20;
const OUT_MS = 440;

/** Onde vai cada coisa: deitado, retrato à esquerda e o texto ao lado; em pé, um embaixo do outro. */
export function bossLayout(W, H) {
  const land = W >= H * 1.15;
  const P = Math.round(land ? Math.min(H * 0.54, 230) : Math.min(W * 0.5, 200));
  const cx = land ? Math.round(Math.max(P / 2 + 36, W * 0.3)) : Math.round(W / 2);
  const cy = land ? Math.round(H * 0.5) : Math.round(Math.max(P / 2 + 70, H * 0.3));
  const textLeft = land ? cx + P / 2 + 30 : 20;
  const textW = land ? Math.min(W - textLeft - 28, 440) : W - 40;
  const textTop = land ? null : cy + P / 2 + 22;
  return { land, P, cx, cy, textLeft, textW, textTop, bandH: Math.round(P * 1.16) };
}

/** Quanto dura a cena inteira para essa fala. */
export function bossTotal(name, quote) {
  const nameEnd = T.name + name.length * LETTER_MS + 260;
  const quoteAt = Math.max(2560, nameEnd + 420);
  return Math.max(4300, quoteAt + (quote ? quote.length * CHAR_MS : 0) + 1150);
}

const el = (tag, cls, parent, style) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (style) for (const [k, v] of Object.entries(style)) k.startsWith('--') ? n.style.setProperty(k, v) : (n.style[k] = v);
  parent?.appendChild(n);
  return n;
};
const svgEl = (tag, attrs, parent) => {
  const n = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
  parent?.appendChild(n);
  return n;
};

/** Um aleatório com semente (o mesmo desenho toda vez). */
function rngOf(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** O coração de pixel (7×6). */
const HEART = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];
function heartSvg(parent, size) {
  const svg = svgEl('svg', { viewBox: '0 0 7 6', width: size, height: Math.round((size * 6) / 7), 'shape-rendering': 'crispEdges', class: 'bi2-heart' }, parent);
  HEART.forEach((row, y) =>
    [...row].forEach((c, x) => {
      if (c === 'X') svgEl('rect', { x, y, width: 1, height: 1, fill: x === 1 && y === 1 ? '#ffb3a8' : y >= 3 ? '#a3121b' : '#e8392b' }, svg);
    }),
  );
  return svg;
}

/**
 * Monta a cena dentro de `host` (o React já pôs lá o retrato em `.bi2-portrait`). Devolve as
 * animações (para pular, pausar e filmar) e a duração.
 */
export function buildBossIntro(host, { rivalId, name, title, quote, hearts, ball, W, H }) {
  const theme = BOSS_THEMES[rivalId];
  const L = bossLayout(W, H);
  const anims = [];
  const run = (node, frames, opts) => {
    if (typeof node.animate !== 'function') return null;
    const a = node.animate(frames, { fill: 'both', ...opts });
    anims.push(a);
    return a;
  };
  const total = bossTotal(name, quote);
  host.style.setProperty('--bi-accent', theme.accent);
  host.style.setProperty('--bi-deep', theme.deep);
  host.style.setProperty('--bi-ink', theme.ink);

  // ---- o fundo, as faixas de cinema e as camadas
  const stage = host.querySelector('.bi2-stage'); // faixa, retrato, texto (o React pôs o retrato)
  const back = el('div', 'bi2-back');
  host.insertBefore(back, stage);
  run(back, [{ opacity: 0 }, { opacity: 1 }], { duration: 320, easing: 'ease-out' });
  run(back, [{ opacity: 1 }, { opacity: 0 }], { duration: OUT_MS, delay: total - OUT_MS, fill: 'forwards', easing: 'ease-in' });
  const piece = el('div', 'bi2-piece'); // o número do chefe (embaixo da faixa)
  host.insertBefore(piece, stage);
  const over = el('div', 'bi2-over', host); // o que cobre a cena no número (cortina, chapa…)
  const barH = Math.round(H * 0.1);
  const barT = el('div', 'bi2-bar is-top', host, { height: `${barH}px` });
  const barB = el('div', 'bi2-bar is-bottom', host, { height: `${barH}px` });
  run(barT, [{ transform: 'translateY(-100%)' }, { transform: 'translateY(0)' }], { duration: 420, delay: T.bars, easing: 'cubic-bezier(.2,.8,.2,1)' });
  run(barB, [{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }], { duration: 420, delay: T.bars, easing: 'cubic-bezier(.2,.8,.2,1)' });
  run(barT, [{ transform: 'translateY(0)' }, { transform: 'translateY(-100%)' }], { duration: OUT_MS, delay: total - OUT_MS, fill: 'forwards', easing: 'ease-in' });
  run(barB, [{ transform: 'translateY(0)' }, { transform: 'translateY(100%)' }], { duration: OUT_MS, delay: total - OUT_MS, fill: 'forwards', easing: 'ease-in' });

  // ---- a faixa na cor do chefe, com riscos de velocidade correndo
  const band = el('div', 'bi2-band', null, { top: `${L.cy - L.bandH / 2}px`, height: `${L.bandH}px` });
  stage.insertBefore(band, stage.firstChild);
  const streaks = el('div', 'bi2-streaks', band);
  const rnd = rngOf(rivalId.length * 977 + 13);
  for (let i = 0; i < 16; i += 1) {
    const s = el('i', '', streaks, { top: `${Math.round(rnd() * 96)}%`, width: `${Math.round(60 + rnd() * 220)}px`, opacity: (0.18 + rnd() * 0.4).toFixed(2) });
    run(s, [{ transform: `translateX(${W + 260}px)` }, { transform: 'translateX(-320px)' }], { duration: 520 + rnd() * 520, delay: T.band + rnd() * 600, iterations: Infinity, easing: 'linear', fill: 'none' });
  }
  run(band, [{ transform: 'translateX(105%) skewY(-4deg)' }, { transform: 'translateX(0) skewY(-4deg)' }], { duration: 300, delay: T.band, easing: 'cubic-bezier(.15,.9,.25,1)' });
  run(band, [{ transform: 'translateX(0) skewY(-4deg)' }, { transform: 'translateX(-108%) skewY(-4deg)' }], { duration: OUT_MS, delay: total - OUT_MS, fill: 'forwards', easing: 'cubic-bezier(.6,0,.9,.4)' });

  // ---- o retrato: silhueta que acende no clarão
  const port = stage.querySelector('.bi2-portrait');
  const lit = port?.querySelector('.bi2-lit');
  const sil = port?.querySelector('.bi2-sil');
  if (port) {
    Object.assign(port.style, { left: `${L.cx - L.P / 2}px`, top: `${L.cy - L.P / 2}px`, width: `${L.P}px`, height: `${L.P}px` });
    const rays = el('div', 'bi2-rays', stage, { left: `${L.cx}px`, top: `${L.cy}px` });
    stage.insertBefore(rays, port);
    run(rays, [{ opacity: 0, transform: 'translate(-50%,-50%) scale(.4) rotate(0deg)' }, { opacity: 1, transform: 'translate(-50%,-50%) scale(1.1) rotate(25deg)', offset: 0.12 }, { opacity: 0.55, transform: 'translate(-50%,-50%) scale(1) rotate(80deg)' }], { duration: total - T.flash, delay: T.flash, easing: 'ease-out' });
    run(port, [{ transform: `translateX(${W * 0.55}px) scale(.92)`, opacity: 0 }, { opacity: 1, offset: 0.2 }, { transform: 'translateX(-10px) scale(1)', offset: 0.75 }, { transform: 'translateX(0) scale(1)', opacity: 1 }], { duration: 420, delay: T.portrait, easing: 'cubic-bezier(.2,.9,.3,1)' });
    run(port, [{ transform: 'scale(1)' }, { transform: 'scale(1.08)', offset: 0.25 }, { transform: 'scale(1)' }], { duration: 360, delay: T.flash, easing: 'ease-out', fill: 'none' });
    run(port, [{ opacity: 1, transform: 'translateX(0)' }, { opacity: 0, transform: `translateX(${-W * 0.35}px)` }], { duration: OUT_MS, delay: total - OUT_MS, fill: 'forwards', easing: 'ease-in' });
    if (sil) run(sil, [{ opacity: 1 }, { opacity: 0 }], { duration: 160, delay: T.flash });
    if (lit) run(lit, [{ opacity: 0, filter: 'brightness(3)' }, { opacity: 1, filter: 'brightness(2)', offset: 0.2 }, { opacity: 1, filter: 'brightness(1)' }], { duration: 520, delay: T.flash });
    const frame = el('div', 'bi2-frame', port);
    run(frame, [{ opacity: 0 }, { opacity: 1 }], { duration: 200, delay: T.flash });
  }

  // ---- o clarão e o tranco
  const flash = el('div', 'bi2-flash', host);
  run(flash, [{ opacity: 0 }, { opacity: 0.85, offset: 0.08 }, { opacity: 0 }], { duration: 340, delay: T.flash - 30, easing: 'ease-out' });
  run(stage, [
    { transform: 'translate(0,0)' },
    { transform: 'translate(-9px,6px)', offset: 0.15 },
    { transform: 'translate(8px,-5px)', offset: 0.3 },
    { transform: 'translate(-5px,3px)', offset: 0.5 },
    { transform: 'translate(3px,-2px)', offset: 0.7 },
    { transform: 'translate(0,0)' },
  ], { duration: 380, delay: T.flash, fill: 'none' });

  // ---- o texto
  const text = el('div', `bi2-text ${L.land ? '' : 'is-tall'}`, stage, L.land ? { left: `${L.textLeft}px`, width: `${L.textW}px`, top: `${L.cy}px` } : { left: `${L.textLeft}px`, width: `${L.textW}px`, top: `${L.textTop}px` });
  const kick = el('div', 'bi2-kicker font-pixel', text);
  kick.textContent = theme.kicker;
  run(kick, [{ transform: 'translateX(-30px)', opacity: 0 }, { transform: 'translateX(0)', opacity: 1 }], { duration: 300, delay: T.kicker, easing: 'cubic-bezier(.2,.9,.3,1)' });
  const nameFont = Math.max(14, Math.min(L.land ? 26 : 22, Math.floor((L.textW / Math.max(8, name.length)) * 1.0)));
  const nameEl = el('h2', 'bi2-name font-pixel', text, { fontSize: `${nameFont}px` });
  nameEl.id = 'boss-intro-name';
  [...name.toUpperCase()].forEach((ch, i) => {
    const s = el('span', ch === ' ' ? 'is-space' : '', nameEl);
    s.textContent = ch === ' ' ? ' ' : ch;
    run(s, [
      { opacity: 0, transform: 'translateY(-14px) scale(2.6)' },
      { opacity: 1, transform: 'translateY(2px) scale(.92)', offset: 0.7 },
      { opacity: 1, transform: 'translateY(0) scale(1)' },
    ], { duration: 230, delay: T.name + i * LETTER_MS, easing: 'cubic-bezier(.3,0,.4,1)' });
  });
  const nameEnd = T.name + name.length * LETTER_MS + 230;
  // o nome treme quando a última letra assenta
  run(nameEl, [{ transform: 'translateX(0)' }, { transform: 'translateX(-3px)', offset: 0.25 }, { transform: 'translateX(3px)', offset: 0.5 }, { transform: 'translateX(0)' }], { duration: 200, delay: nameEnd - 40, fill: 'none' });
  const titleEl = el('p', 'bi2-title font-term', text);
  titleEl.textContent = title;
  run(titleEl, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 260, delay: nameEnd - 60, easing: 'ease-out' });
  const heartsRow = el('div', 'bi2-hearts', text);
  for (let i = 0; i < hearts; i += 1) {
    const h = heartSvg(heartsRow, L.land ? 15 : 13);
    run(h, [{ opacity: 0, transform: 'scale(0)' }, { opacity: 1, transform: 'scale(1.5)', offset: 0.6 }, { opacity: 1, transform: 'scale(1)' }], { duration: 220, delay: nameEnd + 60 + i * 60, easing: 'ease-out' });
  }
  const quoteAt = Math.max(2560, nameEnd + 420);
  if (quote) {
    const box = el('p', 'bi2-quote font-term', text);
    run(box, [{ opacity: 0, transform: 'translateY(6px) scale(.96)' }, { opacity: 1, transform: 'translateY(0) scale(1)' }], { duration: 220, delay: quoteAt - 120, easing: 'ease-out' });
    const chars = `“${quote}”`;
    [...chars].forEach((ch, i) => {
      const s = el('span', '', box);
      s.textContent = ch;
      run(s, [{ opacity: 0 }, { opacity: 1 }], { duration: 1, delay: quoteAt + i * CHAR_MS });
    });
  }
  if (L.land) text.style.transform = 'translateY(-50%)';
  run(text, [{ opacity: 1 }, { opacity: 0 }], { duration: OUT_MS * 0.8, delay: total - OUT_MS, fill: 'forwards', easing: 'ease-in' });

  // ---- o número de cada chefe
  const ctx = { W, H, L, run, piece, over, stage, host, theme, total, rnd: rngOf(rivalId.length * 131 + 7), ball, nameEl, nameEnd, port };
  (PIECES[theme.id] ?? (() => {}))(ctx);

  const skip = el('p', 'bi2-skip font-pixel', host);
  skip.textContent = 'TOQUE PARA PULAR';
  run(skip, [{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: 600 });
  return { anims, total };
}

/* ---------------------------------------------------------------- os números */

/** Um risco de luz cruzando a tela no ângulo `deg`, passando por (x, y), com o brilho da lâmina. */
function slashLine({ run, W }, parent, x, y, deg, at, color) {
  const wrap = el('div', 'bi2-slash-wrap', parent, { left: `${x}px`, top: `${y}px`, transform: `rotate(${deg}deg)` });
  const line = el('div', 'bi2-slash', wrap, { width: `${W * 1.5}px`, left: `${-W * 0.75}px`, '--c': color });
  run(line, [{ transform: 'scaleX(0)', opacity: 1 }, { transform: 'scaleX(1)', opacity: 1, offset: 0.3 }, { transform: 'scaleX(1)', opacity: 0.45, offset: 0.55 }, { transform: 'scaleX(1)', opacity: 0.3 }], { duration: 760, delay: at, easing: 'ease-out' });
  const glint = el('i', 'bi2-glint', wrap);
  run(glint, [{ transform: `translateX(${-W * 0.75}px) rotate(45deg) scale(.6)`, opacity: 1 }, { transform: `translateX(${W * 0.75}px) rotate(45deg) scale(1.3)`, opacity: 0 }], { duration: 260, delay: at, easing: 'ease-in' });
  run(wrap, [{ opacity: 1 }, { opacity: 0 }], { duration: 260, delay: 1000, fill: 'forwards' });
  return wrap;
}

/** Faíscas saindo de (x, y): pontinhos quentes em parábola. */
function sparks({ run, rnd }, parent, x, y, count, at, spread = 1, up = 1) {
  for (let i = 0; i < count; i += 1) {
    const s = el('i', 'bi2-spark', parent, { left: `${x}px`, top: `${y}px` });
    const dx = (rnd() - 0.5) * 360 * spread;
    const dy = -(60 + rnd() * 140) * up;
    const d = 420 + rnd() * 420;
    run(s, [
      { transform: 'translate(0,0) scale(1)', opacity: 1 },
      { transform: `translate(${dx * 0.6}px,${dy}px) scale(.9)`, opacity: 1, offset: 0.5 },
      { transform: `translate(${dx}px,${dy * 0.2 + 90}px) scale(.4)`, opacity: 0 },
    ], { duration: d, delay: at + rnd() * 80, easing: 'cubic-bezier(.2,.6,.4,1)' });
  }
}

const PIECES = {
  /** Seu Arlindo: três cortes de navalha no breu; no último o breu se parte e as metades caem. */
  navalha(c) {
    const { W, H, run, over } = c;
    const tilt = (-Math.atan2(H * 0.24, W) * 180) / Math.PI;
    const a = el('div', 'bi2-cover', over, { clipPath: 'polygon(0 0,100% 0,100% 38%,0 62%)' });
    const b = el('div', 'bi2-cover', over, { clipPath: 'polygon(0 62%,100% 38%,100% 100%,0 100%)' });
    slashLine(c, over, W * 0.5, H * 0.42, 24, 140, '#ff4fa3');
    slashLine(c, over, W * 0.46, H * 0.56, -31, 400, '#ff8cc6');
    slashLine(c, over, W * 0.5, H * 0.5, tilt, 700, '#ffffff');
    run(a, [{ transform: 'translate(0,0) rotate(0)' }, { transform: `translate(${-W * 0.06}px,${-H * 0.75}px) rotate(-4deg)`, opacity: 0.2 }], { duration: 420, delay: 930, easing: 'cubic-bezier(.5,0,.9,.6)' });
    run(b, [{ transform: 'translate(0,0) rotate(0)' }, { transform: `translate(${W * 0.06}px,${H * 0.75}px) rotate(4deg)`, opacity: 0.2 }], { duration: 420, delay: 930, easing: 'cubic-bezier(.5,0,.9,.6)' });
    // o nome acende como letreiro de neon: duas falhas e fica
    run(c.nameEl, [{ opacity: 1 }, { opacity: 0.25, offset: 0.2, easing: 'steps(1,end)' }, { opacity: 1, offset: 0.35, easing: 'steps(1,end)' }, { opacity: 0.35, offset: 0.55, easing: 'steps(1,end)' }, { opacity: 1, offset: 0.7 }, { opacity: 1 }], { duration: 520, delay: c.nameEnd, fill: 'none' });
    c.nameEl.classList.add('is-neon');
  },

  /** Beto Cigano: a chapa enferrujada despenca, bate (poeira e faísca) e tomba para a frente. */
  ferro(c) {
    const { W, H, run, over, host } = c;
    const plate = el('div', 'bi2-plate', over, { left: `${W * 0.08}px`, top: `${H * 0.06}px`, width: `${W * 0.84}px`, height: `${H * 0.88}px` });
    el('span', 'bi2-plate-text font-pixel', plate).textContent = 'PERIGO';
    run(plate, [
      { transform: `translateY(${-H * 1.05}px)`, easing: 'cubic-bezier(.55,0,1,.45)' },
      { transform: 'translateY(0)', offset: 0.78, easing: 'ease-out' },
      { transform: `translateY(${-H * 0.03}px)`, offset: 0.88, easing: 'ease-in' },
      { transform: 'translateY(0)' },
    ], { duration: 420, delay: 0 });
    run(plate, [{ transform: 'translateY(0) rotate(0)' }, { transform: `translateY(${H * 1.2}px) rotate(7deg)` }], { duration: 360, delay: 940, easing: 'cubic-bezier(.6,0,1,.6)', fill: 'forwards' });
    run(host, [{ transform: 'translate(0,0)' }, { transform: 'translate(0,9px)', offset: 0.15 }, { transform: 'translate(-6px,-4px)', offset: 0.35 }, { transform: 'translate(4px,3px)', offset: 0.6 }, { transform: 'translate(0,0)' }], { duration: 380, delay: 330, fill: 'none' });
    for (let i = 0; i < 9; i += 1) {
      const p = el('i', 'bi2-dust', over, { left: `${W * (0.1 + i * 0.1)}px`, top: `${H * 0.92}px` });
      run(p, [{ transform: 'translate(-50%,-50%) scale(.3)', opacity: 0.85 }, { transform: `translate(${(i - 4) * 14 - 50}%,-90%) scale(2.4)`, opacity: 0 }], { duration: 900, delay: 330 + i * 18, easing: 'ease-out' });
    }
    sparks(c, over, W * 0.12, H * 0.93, 12, 330, 0.8);
    sparks(c, over, W * 0.88, H * 0.93, 12, 340, 0.8);
    sparks(c, c.stage, c.L.cx, c.L.cy + c.L.P / 2, 14, T.flash, 1.2);
  },

  /** Comendador: a cortina de veludo abre no holofote dourado e chovem moedas. */
  ouro(c) {
    const { H, run, over, piece, rnd } = c;
    const spot = el('div', 'bi2-goldspot', piece);
    run(spot, [{ opacity: 0 }, { opacity: 1 }], { duration: 500, delay: 250 });
    const left = el('div', 'bi2-curtain is-left', over);
    const right = el('div', 'bi2-curtain is-right', over);
    const sway = (dir) => [
      { transform: 'translateX(0) skewX(0deg)' },
      { transform: `translateX(${dir * 4}%) skewX(${dir * -2}deg)`, offset: 0.25 },
      { transform: `translateX(${dir * 104}%) skewX(${dir * 4}deg)` },
    ];
    run(left, sway(-1), { duration: 820, delay: 420, easing: 'cubic-bezier(.5,0,.3,1)' });
    run(right, sway(1), { duration: 820, delay: 420, easing: 'cubic-bezier(.5,0,.3,1)' });
    const valance = el('div', 'bi2-valance', over);
    run(valance, [{ transform: 'translateY(0)' }, { transform: 'translateY(-110%)' }], { duration: 500, delay: 1100, easing: 'ease-in' });
    for (let i = 0; i < 26; i += 1) {
      const coin = el('i', 'bi2-coin', piece, { left: `${4 + rnd() * 92}%` });
      const inner = el('b', '', coin);
      const d = 1100 + rnd() * 600;
      run(coin, [{ transform: `translateY(-30px) rotate(${rnd() * 40 - 20}deg)` }, { transform: `translateY(${H + 40}px) rotate(${rnd() * 80 - 40}deg)` }], { duration: d, delay: 700 + rnd() * 2200, easing: 'cubic-bezier(.45,0,.9,.7)' });
      run(inner, [{ transform: 'scaleX(1)' }, { transform: 'scaleX(.15)' }, { transform: 'scaleX(1)' }], { duration: 300 + rnd() * 200, iterations: Infinity, fill: 'none' });
    }
    // o brilho dourado correndo no nome
    const shine = el('i', 'bi2-shine', c.nameEl);
    run(shine, [{ transform: 'translateX(-120%) skewX(-20deg)', opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 1, offset: 0.8 }, { transform: 'translateX(520%) skewX(-20deg)', opacity: 0 }], { duration: 700, delay: c.nameEnd + 100, easing: 'ease-in-out' });
    c.nameEl.classList.add('is-gold');
  },

  /** Genésio: o globo da rifa gira com as bolinhas, cospe uma e os bilhetes chovem. */
  rifa(c) {
    const { W, H, run, over, piece, rnd, L } = c;
    const G = Math.round(H * 0.52);
    const globe = el('div', 'bi2-globe', over, { left: `${W / 2 - G / 2}px`, top: `${H * 0.46 - G / 2}px`, width: `${G}px`, height: `${G}px` });
    const cage = el('div', 'bi2-cage', globe);
    [1, 0.7, 0.36].forEach((k) => el('i', '', cage, { width: `${k * 100}%`, left: `${(1 - k) * 50}%` }));
    el('i', 'is-ring', cage);
    run(cage, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(900deg)' }], { duration: 1050, easing: 'cubic-bezier(.2,.6,.4,1)' });
    const colors = ['#ffd24a', '#e8392b', '#7bd36a', '#4a8cff', '#f4ecd2', '#ff7ad9', '#f0a020'];
    for (let i = 0; i < 11; i += 1) {
      const b = el('i', 'bi2-rball', globe, { left: `${30 + rnd() * 40}%`, top: `${40 + rnd() * 34}%`, background: colors[i % colors.length] });
      const k = () => `translate(${(rnd() - 0.5) * G * 0.5}px,${(rnd() - 0.6) * G * 0.45}px)`;
      run(b, [{ transform: k() }, { transform: k() }, { transform: k() }, { transform: k() }], { duration: 480, iterations: 2, direction: 'alternate', easing: 'ease-in-out' });
    }
    el('div', 'bi2-globe-stand', globe);
    run(globe, [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(.5) translateY(30%)', opacity: 0 }], { duration: 300, delay: 980, easing: 'ease-in' });
    // a bolinha sorteada salta do globo e para no canto do retrato
    const pick = el('span', 'bi2-pick font-pixel', c.stage);
    pick.textContent = c.ball ?? '?';
    const tx = L.cx + L.P / 2 - 8;
    const ty = L.cy - L.P / 2 + 8;
    const sx = W / 2;
    const sy = H * 0.46 - G / 2;
    run(pick, [
      { transform: `translate(${sx}px,${sy}px) translate(-50%,-50%) scale(.6)`, opacity: 1 },
      { transform: `translate(${(sx + tx) / 2}px,${Math.min(sy, ty) - H * 0.22}px) translate(-50%,-50%) scale(1.3)`, opacity: 1, offset: 0.5 },
      { transform: `translate(${tx}px,${ty}px) translate(-50%,-50%) scale(1)`, opacity: 1 },
    ], { duration: 900, delay: 860, easing: 'cubic-bezier(.3,.1,.4,1)' });
    run(pick, [{ transform: `translate(${tx}px,${ty}px) translate(-50%,-50%) scale(1)` }, { transform: `translate(${tx}px,${ty}px) translate(-50%,-50%) scale(1.35)`, offset: 0.4 }, { transform: `translate(${tx}px,${ty}px) translate(-50%,-50%) scale(1)` }], { duration: 300, delay: T.flash + 40, fill: 'none' });
    for (let i = 0; i < 16; i += 1) {
      const t = el('i', 'bi2-ticket', piece, { left: `${rnd() * 96}%` });
      el('b', 'font-pixel', t).textContent = String(Math.floor(rnd() * 90) + 10);
      const turn = rnd() * 60 - 30;
      run(t, [{ transform: `translateY(-40px) rotate(${turn}deg)` }, { transform: `translate(${(rnd() - 0.5) * 80}px,${H * 0.5}px) rotate(${-turn}deg)` }, { transform: `translate(${(rnd() - 0.5) * 80}px,${H + 40}px) rotate(${turn * 1.5}deg)` }], { duration: 1800 + rnd() * 900, delay: 300 + rnd() * 2000, easing: 'linear' });
    }
  },

  /** Dama Soró: dois leques de plumas se abrem nos cantos, o paetê pisca no holofote rosa. */
  chic(c) {
    const { W, H, run, over, piece, rnd } = c;
    const spot = el('div', 'bi2-pinkspot', piece);
    run(spot, [{ opacity: 0 }, { opacity: 1 }], { duration: 600, delay: 100 });
    [-1, 1].forEach((side) => {
      const fan = el('div', 'bi2-fan', over, side < 0 ? { left: `${W * 0.18}px`, top: `${H * 1.02}px` } : { left: `${W * 0.82}px`, top: `${H * 1.02}px` });
      const n = 9;
      for (let i = 0; i < n; i += 1) {
        const plume = el('i', '', fan, { height: `${H * 0.92}px`, width: `${Math.round(H * 0.17)}px` });
        const ang = side * (-62 + (i * 124) / (n - 1));
        run(plume, [{ transform: 'translateX(-50%) rotate(0deg)' }, { transform: `translateX(-50%) rotate(${ang}deg)` }], { duration: 640, delay: 80 + i * 26, easing: 'cubic-bezier(.2,.9,.3,1.15)' });
      }
      run(fan, [{ transform: 'translateY(0) scale(1)' }, { transform: `translate(${side * W * 0.25}px,${H * 0.6}px) scale(.8)` }], { duration: 380, delay: 960, easing: 'ease-in' });
    });
    for (let i = 0; i < 30; i += 1) {
      const s = el('i', 'bi2-sequin', piece, { left: `${rnd() * 100}%`, top: `${rnd() * 100}%` });
      run(s, [{ transform: 'scale(0) rotate(0deg)', opacity: 0 }, { transform: 'scale(1.2) rotate(45deg)', opacity: 1, offset: 0.5 }, { transform: 'scale(0) rotate(90deg)', opacity: 0 }], { duration: 600 + rnd() * 500, delay: 200 + rnd() * 1200, iterations: 3, easing: 'ease-in-out' });
    }
  },

  /** Sargento Brandão: a sirene pisca vermelho e azul e o holofote da ronda acha o rival na mira. */
  ronda(c) {
    const { W, H, run, piece, over, L, total } = c;
    const red = el('div', 'bi2-siren is-red', piece);
    const blue = el('div', 'bi2-siren is-blue', piece);
    const strobe = (node, phase) => {
      const frames = [];
      for (let i = 0; i <= 10; i += 1) frames.push({ opacity: (i + phase) % 2 ? 0 : 0.85, offset: i / 10, easing: 'steps(1,end)' });
      run(node, frames, { duration: 1300, fill: 'none' });
      run(node, [{ opacity: 0.22, easing: 'steps(1,end)' }, { opacity: 0, offset: 0.5, easing: 'steps(1,end)' }, { opacity: 0 }], { duration: 700, delay: 1300 + phase * 350, iterations: Math.ceil((total - 1300) / 700), fill: 'none' });
    };
    strobe(red, 0);
    strobe(blue, 1);
    // o facho do holofote varrendo e a roda de luz caçando
    const beam = el('div', 'bi2-beam', over, { left: `${W / 2}px`, top: `${H + 10 - H * 1.3}px`, height: `${H * 1.3}px`, width: `${H * 0.9}px` });
    run(beam, [{ transform: 'translateX(-50%) rotate(-38deg)' }, { transform: 'translateX(-50%) rotate(30deg)', offset: 0.45 }, { transform: 'translateX(-50%) rotate(-12deg)', offset: 0.75 }, { transform: `translateX(-50%) rotate(${(Math.atan2(L.cx - W / 2, H + 10 - L.cy) * 180) / Math.PI}deg)` }], { duration: 1150, easing: 'ease-in-out' });
    run(beam, [{ opacity: 1 }, { opacity: 0 }], { duration: 300, delay: T.flash });
    const reticle = svgEl('svg', { viewBox: '-50 -50 100 100', class: 'bi2-reticle' }, c.stage);
    svgEl('circle', { r: 38, fill: 'none', stroke: '#ff3b30', 'stroke-width': 3 }, reticle);
    svgEl('circle', { r: 26, fill: 'none', stroke: '#ff3b30', 'stroke-width': 1.5, 'stroke-dasharray': '6 6' }, reticle);
    ['M0 -48 L0 -28', 'M0 48 L0 28', 'M-48 0 L-28 0', 'M48 0 L28 0'].forEach((d) => svgEl('path', { d, stroke: '#ff3b30', 'stroke-width': 3 }, reticle));
    Object.assign(reticle.style, { left: `${L.cx}px`, top: `${L.cy}px`, width: `${L.P * 1.2}px`, height: `${L.P * 1.2}px` });
    run(reticle, [
      { transform: 'translate(-50%,-50%) scale(2.2) rotate(90deg)', opacity: 0 },
      { transform: 'translate(-50%,-50%) scale(1) rotate(0deg)', opacity: 1, offset: 0.5 },
      { transform: 'translate(-50%,-50%) scale(1) rotate(0deg)', opacity: 0.3, offset: 0.62 },
      { transform: 'translate(-50%,-50%) scale(1) rotate(0deg)', opacity: 1, offset: 0.74 },
      { transform: 'translate(-50%,-50%) scale(1.05) rotate(0deg)', opacity: 0.9 },
    ], { duration: 900, delay: 1060, easing: 'ease-out' });
    run(reticle, [{ opacity: 0.9 }, { opacity: 0 }], { duration: 500, delay: T.flash + 400, fill: 'forwards' });
  },

  /** Dona Odete: o relógio da dívida gira para trás, as notas caem e o carimbo COBRADO bate. */
  agiota(c) {
    const { W, H, run, over, piece, rnd, L } = c;
    const S = Math.round(H * 0.62);
    const clock = el('div', 'bi2-clock', over, { left: `${W / 2 - S / 2}px`, top: `${H * 0.48 - S / 2}px`, width: `${S}px`, height: `${S}px` });
    for (let i = 0; i < 12; i += 1) el('i', 'bi2-tick', clock, { transform: `rotate(${i * 30}deg)` });
    const hourH = el('b', 'bi2-hand is-hour', clock);
    const minH = el('b', 'bi2-hand is-min', clock);
    el('span', 'bi2-clock-pin', clock);
    run(minH, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-1440deg)' }], { duration: 1000, easing: 'cubic-bezier(.5,0,.5,1)' });
    run(hourH, [{ transform: 'rotate(90deg)' }, { transform: 'rotate(-30deg)' }], { duration: 1000, easing: 'cubic-bezier(.5,0,.5,1)' });
    run(clock, [{ transform: 'scale(.7)', opacity: 0 }, { transform: 'scale(1)', opacity: 1, offset: 0.15 }, { transform: 'scale(1)', opacity: 1, offset: 0.8 }, { transform: 'scale(2.6)', opacity: 0 }], { duration: 1250, easing: 'ease-in' });
    for (let i = 0; i < 16; i += 1) {
      const n = el('i', 'bi2-note', piece, { left: `${rnd() * 96}%` });
      el('b', 'font-pixel', n).textContent = '$';
      const turn = rnd() * 70 - 35;
      run(n, [{ transform: `translateY(-40px) rotate(${turn}deg) rotateX(0deg)` }, { transform: `translate(${(rnd() - 0.5) * 120}px,${H * 0.5}px) rotate(${-turn}deg) rotateX(180deg)` }, { transform: `translate(${(rnd() - 0.5) * 120}px,${H + 40}px) rotate(${turn}deg) rotateX(360deg)` }], { duration: 2000 + rnd() * 900, delay: 250 + rnd() * 2100, easing: 'linear' });
    }
    // o carimbo na foto
    const stamp = el('span', 'bi2-stamp font-pixel', c.stage, { left: `${L.cx}px`, top: `${L.cy + L.P * 0.28}px` });
    stamp.textContent = 'COBRADO';
    run(stamp, [{ transform: 'translate(-50%,-50%) rotate(-24deg) scale(3)', opacity: 0 }, { transform: 'translate(-50%,-50%) rotate(-12deg) scale(.92)', opacity: 1, offset: 0.7 }, { transform: 'translate(-50%,-50%) rotate(-12deg) scale(1)', opacity: 1 }], { duration: 200, delay: T.stamp, easing: 'ease-in' });
    run(c.port, [{ transform: 'translate(0,0)' }, { transform: 'translate(3px,4px)', offset: 0.3 }, { transform: 'translate(-2px,-1px)', offset: 0.6 }, { transform: 'translate(0,0)' }], { duration: 220, delay: T.stamp + 140, fill: 'none', composite: 'add' });
  },

  /** Valtinho Renegado: a porta de aço da loja despenca com estrondo e sobe de novo. */
  contrabando(c) {
    const { W, H, run, over, host } = c;
    const door = el('div', 'bi2-shutter', over);
    el('span', 'bi2-shutter-text font-pixel', door).textContent = 'FECHADO';
    run(door, [
      { transform: 'translateY(-102%)', easing: 'cubic-bezier(.6,0,1,.6)' },
      { transform: 'translateY(0)', offset: 0.36, easing: 'ease-out' },
      { transform: 'translateY(-3%)', offset: 0.42, easing: 'ease-in' },
      { transform: 'translateY(0)', offset: 0.48 },
      { transform: 'translateY(0)', offset: 0.78, easing: 'cubic-bezier(.5,0,.6,1)' },
      { transform: 'translateY(-104%)' },
    ], { duration: 1080 });
    run(host, [{ transform: 'translate(0,0)' }, { transform: 'translate(0,8px)', offset: 0.15 }, { transform: 'translate(-5px,-3px)', offset: 0.4 }, { transform: 'translate(3px,2px)', offset: 0.65 }, { transform: 'translate(0,0)' }], { duration: 360, delay: 400, fill: 'none' });
    sparks(c, over, W * 0.2, H * 0.98, 10, 420, 0.7);
    sparks(c, over, W * 0.8, H * 0.98, 10, 430, 0.7);
    // a luz giratória âmbar nos dois cantos
    [0.06, 0.94].forEach((x, i) => {
      const lamp = el('i', 'bi2-beacon', c.piece, { left: `${W * x}px`, top: `${H * 0.14}px` });
      run(lamp, [{ transform: 'translate(-50%,-50%) rotate(0deg)' }, { transform: 'translate(-50%,-50%) rotate(360deg)' }], { duration: 900, delay: i * 120, iterations: Infinity, fill: 'none', easing: 'linear' });
    });
  },
};
