/**
 * Versão 2.35: a respiração de quem tomou dano, sintetizada amostra por amostra (uma vez só, e
 * guardada): o fôlego fundo pela boca enquanto o olho fecha, o ar preso, e o ofegar quando abre,
 * se acalmando até sumir.
 *
 * Não são "sopros" soltos colados um depois do outro: é UM fluxo de ar contínuo (a curva do
 * pulmão: para fora positivo, para dentro negativo) que vira som. Cada meia-volta tem a sua
 * duração, a sua força e o seu jeito (mais rápida no começo, arrastada no fim) e emenda na
 * seguinte no ponto em que o ar inverte, como numa respiração de verdade. Do fluxo sai tudo:
 * - o volume (o ar mais rápido faz mais barulho, e quase some na virada);
 * - o timbre: soltando, a boca aberta de um "hah" (formantes de /a/ sem voz); puxando, mais
 *   fechada e chiada; a passagem entre os dois acompanha a virada do ar; a boca abre mais com o
 *   ar mais forte, e as ressonâncias derivam devagar o tempo todo (nunca duas iguais);
 * - o chiado nos dentes, que cresce com a força do ar;
 * - a voz soprosa (pulsos da glote, com o próprio ar pulsando junto) só nas expirações fortes
 *   do começo, quando o fôlego ainda está curto.
 * Um ruído rosado só, um banco de filtros só (sem cortes nem estalos) e um quarto pequeno em
 * volta. Determinístico (gerador próprio com semente): não mexe no aleatório do jogo.
 */

/** Quanto dura o som inteiro (segundos). */
export const BREATH_SECONDS = 5.2;

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const lerp = (a, b, k) => a + (b - a) * k;
const clamp01 = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : k);
const smooth = (k) => {
  const c = clamp01(k);
  return c * c * (3 - 2 * c);
};

/** Ruído gaussiano (soma de uniformes) → rosado (filtro de Paul Kellet, versão econômica). */
function pinkNoise(n, rand) {
  const out = new Float32Array(n);
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  for (let i = 0; i < n; i += 1) {
    const w = (rand() + rand() + rand() + rand() - 2) * 0.87;
    b0 = 0.99765 * b0 + w * 0.099046;
    b1 = 0.963 * b1 + w * 0.2965164;
    b2 = 0.57 * b2 + w * 1.0526913;
    out[i] = (b0 + b1 + b2 + w * 0.1848) * 0.25;
  }
  return out;
}

/** Ruído lento (≈ -1..1) para derivas e tremores: passa-baixa de 2 polos num ruído branco. */
function slowNoise(n, rate, hz, rand) {
  const out = new Float32Array(n);
  const k = 1 - Math.exp((-2 * Math.PI * hz) / rate);
  let y = 0;
  let z = 0;
  for (let i = 0; i < n; i += 1) {
    y += k * (rand() * 2 - 1 - y);
    z += k * (y - z);
    out[i] = z * Math.sqrt(rate / hz) * 0.35;
  }
  return out;
}

/** Um passa-faixa (ganho 1 no pico) que deixa trocar a frequência no meio sem estalar. */
class Band {
  constructor(rate) {
    this.rate = rate;
    this.x1 = 0;
    this.x2 = 0;
    this.y1 = 0;
    this.y2 = 0;
    this.set(1000, 200);
  }

  set(freq, bw) {
    const w = (2 * Math.PI * Math.min(freq, this.rate * 0.45)) / this.rate;
    const q = Math.max(0.3, freq / bw);
    const alpha = Math.sin(w) / (2 * q);
    const a0 = 1 + alpha;
    this.b0 = alpha / a0;
    this.b2 = -alpha / a0;
    this.a1 = (-2 * Math.cos(w)) / a0;
    this.a2 = (1 - alpha) / a0;
  }

  run(x) {
    const y = this.b0 * x + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1;
    this.x1 = x;
    this.y2 = this.y1;
    this.y1 = y;
    return y;
  }
}

// soltando pela boca aberta ("hah"): [freq, largura, ganho] de F1..F4
const OUT_MOUTH = [
  [720, 180, 1.0],
  [1220, 220, 0.75],
  [2520, 300, 0.32],
  [3450, 420, 0.14],
];
// puxando pela boca: mais fechada, mais aguda
const IN_MOUTH = [
  [520, 200, 0.85],
  [1650, 260, 0.7],
  [2780, 340, 0.4],
  [4050, 600, 0.18],
];

/**
 * A curva do ar, meia-volta por meia-volta: [início, duração, pico (+ solta, - puxa), viés].
 * `viés` < 1: o ar chega ao pico cedo e se arrasta no fim (o "hah" que estoura e esvazia).
 */
function airPlan(rand) {
  const j = (amt) => 1 + (rand() - 0.5) * 2 * amt;
  const plan = [];
  // o susto: puxa fundo pela boca, enchendo devagar, e trava (a garganta fecha de uma vez)
  plan.push({ at: 0, dur: 0.64, peak: -0.95, bias: 1.35, cut: true });
  // o ar preso (0,64 a 0,98 s): nada. Depois solta e fica ofegante, se acalmando até sumir.
  let at = 0.98;
  let depth = 1;
  let k = 0;
  while (depth > 0.02 && at < BREATH_SECONDS - 0.4) {
    const calm = clamp01(k / 9);
    // soltar: o primeiro é o maior (o ar que estava preso); depois cada um do seu tamanho
    const outDur = lerp(0.24, 0.5, calm) * j(0.14) * (k === 0 ? 1.25 : 1);
    plan.push({ at, dur: outDur, peak: depth * (k === 0 ? 1.15 : 1) * j(0.12), bias: lerp(0.45, 0.8, calm) * j(0.15) });
    at += outDur;
    // puxar: mais curto e mais fraco que o soltar, às vezes um quase nada
    const innDur = lerp(0.17, 0.42, calm) * j(0.18);
    plan.push({ at, dur: innDur, peak: -depth * lerp(0.55, 0.8, rand()), bias: lerp(0.9, 1.3, rand()) });
    at += innDur;
    // às vezes o ar para um instante antes de soltar de novo (mais quando já está calmo)
    if (rand() < lerp(0.1, 0.6, calm)) at += lerp(0.02, 0.18, calm) * rand();
    depth *= lerp(0.74, 0.86, rand());
    k += 1;
  }
  return plan;
}

/** O fluxo de ar em cada amostra (contínuo: cada meia-volta começa e termina em zero). */
function airFlow(plan, n, rate) {
  const flow = new Float32Array(n);
  for (const p of plan) {
    const a = Math.round(p.at * rate);
    const len = Math.round(p.dur * rate);
    for (let i = 0; i < len && a + i < n; i += 1) {
      const u = i / len;
      // sobe e desce, com o pico deslocado pelo viés (u^bias) e uma ponta mais redonda
      let s = Math.sin(Math.PI * Math.pow(u, p.bias));
      s = Math.sign(s) * Math.pow(Math.abs(s), 0.8);
      // a trava do fôlego: corta nos últimos 4% (rápido, mas sem estalo)
      if (p.cut) s = Math.max(s, smooth(u / 0.18) * 0.7) * (1 - smooth((u - 0.94) / 0.06));
      flow[a + i] += p.peak * s;
    }
  }
  return flow;
}

/** Um quarto pequeno: 4 pentes amortecidos em paralelo + 2 passa-tudo (Schroeder/Freeverb). */
function room(dry, rate, wet = 0.1) {
  const combs = [0.0297, 0.0371, 0.0411, 0.0437].map((s) => ({ buf: new Float32Array(Math.round(s * rate)), i: 0, fb: 0.62, damp: 0.4, last: 0 }));
  const alls = [0.005, 0.0017].map((s) => ({ buf: new Float32Array(Math.round(s * rate)), i: 0 }));
  const out = new Float32Array(dry.length);
  for (let n = 0; n < dry.length; n += 1) {
    const x = dry[n];
    let s = 0;
    for (const c of combs) {
      const y = c.buf[c.i];
      c.last = y * (1 - c.damp) + c.last * c.damp;
      c.buf[c.i] = x + c.last * c.fb;
      c.i = (c.i + 1) % c.buf.length;
      s += y;
    }
    s *= 0.25;
    for (const a of alls) {
      const b = a.buf[a.i];
      const v = s + b * 0.6;
      a.buf[a.i] = v;
      a.i = (a.i + 1) % a.buf.length;
      s = b - v * 0.6;
    }
    out[n] = x * (1 - wet) + s * wet * 2.2;
  }
  return out;
}

/** Corta o grave de vento do microfone (abaixo de ~90 Hz). */
function highpass(buf, rate, hz) {
  const k = Math.exp((-2 * Math.PI * hz) / rate);
  let x1 = 0;
  let y1 = 0;
  for (let i = 0; i < buf.length; i += 1) {
    const x = buf[i];
    const y = k * (y1 + x - x1);
    x1 = x;
    y1 = y;
    buf[i] = y;
  }
  return buf;
}

/**
 * As amostras (mono, -1..1) da respiração inteira, na taxa `rate`.
 * 0–0,64 s: o fôlego fundo (enquanto o olho fecha); até 0,98 s: o ar preso; depois o ofegar,
 * cada fôlego emendado no outro, se acalmando até sumir.
 */
export function breathSamples(rate = 44100, seed = 2035) {
  const rand = rng(seed);
  const n = Math.round(BREATH_SECONDS * rate);
  const flow = airFlow(airPlan(rand), n, rate);
  let maxFlow = 0;
  for (let i = 0; i < n; i += 1) maxFlow = Math.max(maxFlow, Math.abs(flow[i]));
  const air = pinkNoise(n, rand);
  const hissNoise = pinkNoise(n, rand);
  const drift = [0, 1, 2, 3].map(() => slowNoise(n, rate, 0.7, rand)); // a boca muda devagar
  const flutter = slowNoise(n, rate, 11, rand); // a turbulência treme
  const jitter = slowNoise(n, rate, 30, rand); // a voz não é afinada
  const outBank = OUT_MOUTH.map(() => new Band(rate));
  const inBank = IN_MOUTH.map(() => new Band(rate));
  const hiss = new Band(rate);
  hiss.set(3700, 1700);
  const out = new Float32Array(n);
  let dir = 0; // 1: soltando, 0: puxando (suavizado: a troca acompanha a virada do ar)
  const dirK = 1 - Math.exp(-1 / (0.025 * rate));
  const vUp = 1 - Math.exp(-1 / (0.04 * rate));
  const vDown = 1 - Math.exp(-1 / (0.12 * rate));
  let voice = 0; // quanto de voz tem agora (sobe no começo dos "hah" fortes e cai)
  let phase = 0;
  let glottal = 0;
  let prevFlow = 0;
  for (let i = 0; i < n; i += 1) {
    const f = flow[i] / maxFlow;
    const mag = Math.abs(f);
    dir += dirK * ((f > 0 ? 1 : f < 0 ? 0 : dir) - dir);
    // o ar mais forte abre mais a boca: F1 sobe; e cada formante deriva por conta própria
    if ((i & 31) === 0) {
      const open = 0.88 + 0.24 * mag;
      outBank.forEach((b, k) => b.set(OUT_MOUTH[k][0] * (k === 0 ? open : 1) * (1 + 0.07 * drift[k][i]), OUT_MOUTH[k][1]));
      inBank.forEach((b, k) => b.set(IN_MOUTH[k][0] * (k === 0 ? open : 1) * (1 + 0.07 * drift[(k + 1) & 3][i]), IN_MOUTH[k][1]));
    }
    // a voz soprosa: só soltando forte, no começo da golfada (o ar subindo), e some com a calma
    const rising = f > 0 && f > prevFlow;
    const want = rising && mag > 0.35 ? (mag - 0.35) * 1.4 : 0;
    voice += (want - voice) * (want > voice ? vUp : vDown);
    prevFlow = f;
    let src = air[i];
    if (voice > 0.002) {
      phase += (lerp(118, 158, mag) * (1 + 0.025 * jitter[i])) / rate;
      if (phase >= 1) phase -= 1;
      const open = 0.68;
      const prevG = glottal;
      glottal = phase < open ? 0.5 * (1 - Math.cos((Math.PI * phase) / open)) * (phase < open * 0.75 ? 1 : 1 - (phase - open * 0.75) / (open * 0.25)) : 0;
      const pulse = (glottal - prevG) * rate * 0.002;
      const v = Math.min(1, voice);
      src = src * (1 - v * 0.45 + v * 0.7 * glottal) + 0.3 * v * pulse;
    }
    let yo = 0;
    let yi = 0;
    for (let k = 0; k < 4; k += 1) {
      yo += outBank[k].run(src) * OUT_MOUTH[k][2];
      yi += inBank[k].run(air[i]) * IN_MOUTH[k][2];
    }
    // o volume segue a força do ar (|fluxo|^1,5: quase some na virada) e treme um pouco
    const loud = Math.pow(mag, 1.5) * (1 + 0.22 * flutter[i]);
    const h = hiss.run(hissNoise[i]) * (0.04 + 0.16 * mag * mag) * lerp(1.4, 0.6, dir);
    out[i] = (yo * dir + yi * (1 - dir) * 0.85 + h) * loud;
  }
  const wet = highpass(room(out, rate), rate, 90);
  let peak = 0;
  for (let i = 0; i < wet.length; i += 1) peak = Math.max(peak, Math.abs(wet[i]));
  const g = peak > 0 ? 0.9 / peak : 1;
  for (let i = 0; i < wet.length; i += 1) wet[i] *= g;
  return wet;
}
