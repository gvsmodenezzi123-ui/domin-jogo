/**
 * Versão 2.13: o shader da luz da mesa (WebGL 1). Uma camada só, por cima da sala, da mesa e das
 * pedras, somada à tela (mix-blend-mode: screen; o preto não muda nada), na grade de pixels da
 * cena (1 px = 2 px de CSS) e com a saída em degraus pontilhados (Bayer), como a pintura.
 *
 * O que ele desenha:
 *   - a luz viva de cada fonte da sala: o neon que pisca, a vela que tremula, a lâmpada que
 *     zumbe, o facho da luminária com a poeira dançando dentro, o coração que bate;
 *   - a fumaça (ruído fractal andando devagar) que só aparece onde a luz bate nela;
 *   - os fachos de luar da janela (o Dono da Noite) e a luz da rua piscando na persiana (o Bicho);
 *   - a aura de cada pedra aprimorada (ouro com as faíscas, rubi batendo, cristal com o arco-íris
 *     na borda, chumbo pesado, fantasma soltando fiapos, âmbar morno, obsidiana roxa);
 *   - o clarão quando uma pedra cai na mesa (a bucha mais forte, na cor da pedra).
 */

export const MAX_LIGHTS = 10;
export const MAX_TILES = 12;
export const MAX_BURSTS = 6;

const VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 u_res;
uniform float u_time;
uniform float u_unit;
uniform float u_motion;
uniform vec4 u_light[${MAX_LIGHTS}];
uniform vec4 u_lcol[${MAX_LIGHTS}];
uniform int u_nl;
uniform vec4 u_tA[${MAX_TILES}];
uniform vec4 u_tB[${MAX_TILES}];
uniform float u_tkind[${MAX_TILES}];
uniform int u_nt;
uniform vec4 u_burst[${MAX_BURSTS}];
uniform vec3 u_bcol[${MAX_BURSTS}];
uniform vec4 u_haze;
uniform vec2 u_hazeBand;
uniform vec4 u_moon;
uniform vec4 u_stripe;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) { v += a * noise(p); p = p * 2.03 + vec2(17.0, 9.0); a *= 0.5; }
  return v;
}
float bayer2(vec2 a) { a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }

/* quanto a fonte acende agora: 0 firme, 1 neon, 2 vela, 3 lâmpada, 4 facho, 5 coração */
float flick(float kind, float i, float t) {
  if (kind < 0.5) return 1.0 + 0.05 * sin(t * 1.3 + i * 2.0);
  if (kind < 1.5) {
    float s = floor(t * 9.0 + i * 7.0);
    float dip = step(0.94, hash(vec2(s, i))) * 0.7 + step(0.985, hash(vec2(floor(t * 2.0), i))) * 0.3;
    return 1.0 - dip + 0.04 * sin(t * 60.0 + i);
  }
  if (kind < 2.5) return 0.8 + 0.2 * noise(vec2(t * 7.0 + i * 13.0, i)) + 0.06 * sin(t * 19.0 + i * 3.0);
  if (kind < 3.5) return 0.95 + 0.05 * noise(vec2(t * 4.0, i * 5.0));
  if (kind < 4.5) return 1.0;
  float beat = fract(t * 0.9 + i * 0.13);
  return 0.55 + 0.6 * (exp(-beat * 18.0) + 0.6 * exp(-max(0.0, beat - 0.18) * 18.0) * step(0.18, beat));
}

float sdSeg(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 0.0001), 0.0, 1.0);
  return length(pa - ba * h);
}
float crossz(vec2 a, vec2 b) { return a.x * b.y - a.y * b.x; }
/* a distância até a pedra de verdade: o quadrilátero dos quatro cantos dela na tela (girada no
   leque, deitada em perspectiva na mesa); negativa dentro */
float sdQuad(vec2 p, vec2 a, vec2 b, vec2 c, vec2 d) {
  float dist = min(min(sdSeg(p, a, b), sdSeg(p, b, c)), min(sdSeg(p, c, d), sdSeg(p, d, a)));
  float s1 = crossz(b - a, p - a);
  float s2 = crossz(c - b, p - b);
  float s3 = crossz(d - c, p - c);
  float s4 = crossz(a - d, p - d);
  bool inside = (s1 >= 0.0 && s2 >= 0.0 && s3 >= 0.0 && s4 >= 0.0) || (s1 <= 0.0 && s2 <= 0.0 && s3 <= 0.0 && s4 <= 0.0);
  return inside ? -dist : dist;
}

vec3 hue(float h) { return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); }

void main() {
  vec2 p = vec2(gl_FragCoord.x, u_res.y - gl_FragCoord.y);
  float t = u_time;
  float u = u_unit;
  vec3 col = vec3(0.0);
  vec3 lit = vec3(0.0);
  float dust = 0.0;

  // --- as fontes de luz da sala
  for (int i = 0; i < ${MAX_LIGHTS}; i++) {
    if (i >= u_nl) break;
    vec4 L = u_light[i];
    vec4 C = u_lcol[i];
    vec2 d = p - L.xy;
    float dist = length(d);
    float fi = float(i);
    float fl = mix(1.0, flick(C.a, fi, t), u_motion);
    float f = max(0.0, 1.0 - dist / L.z);
    f *= f;
    if (C.a > 3.5 && C.a < 4.5) {
      // o facho para baixo: a luz só dentro do cone, a poeira dançando nele
      float ang = abs(atan(d.x, max(d.y, 0.001)));
      float cone = smoothstep(0.62, 0.38, ang) * step(0.0, d.y);
      f *= cone;
      vec2 cell = floor(p / (5.0 * u));
      vec2 rnd = vec2(hash(cell), hash(cell + 3.7));
      vec2 mote = (cell + 0.5 + 0.38 * vec2(sin(t * 0.6 + rnd.x * 6.3), sin(t * 0.45 + rnd.y * 6.3))) * 5.0 * u;
      float m = step(length(p - mote), 0.75 * u) * step(0.82, rnd.x) * (0.5 + 0.5 * sin(t * 2.0 + rnd.y * 9.0));
      dust += m * f * 3.0;
    }
    vec3 c = C.rgb * L.w * fl;
    // o clarão em volta da fonte (o "bloom")
    float core = exp(-dist * dist / max(1.0, L.z * L.z * 0.012));
    col += c * core * (C.a > 3.5 && C.a < 4.5 ? 0.15 : 0.5);
    lit += c * f;
  }

  // --- a fumaça: só aparece onde a luz bate
  float hz = 0.0;
  if (u_haze.a > 0.0) {
    vec2 q = p / (34.0 * u) * vec2(1.0, 1.8) + vec2(t * 0.05 * u_motion, -t * 0.022 * u_motion);
    float n = fbm(q);
    float band = u_hazeBand.y > u_hazeBand.x ? smoothstep(u_hazeBand.x, u_hazeBand.x + 10.0 * u, p.y) * (1.0 - smoothstep(u_hazeBand.y - 6.0 * u, u_hazeBand.y, p.y)) : 1.0;
    hz = smoothstep(0.42, 0.82, n) * u_haze.a * band;
    col += lit * u_haze.rgb * 0.9 * hz;
  }
  col += lit * 0.04 + vec3(1.0, 0.92, 0.75) * dust * lit;

  // --- o luar entrando pela janela em fachos
  if (u_moon.a > 0.0) {
    vec2 d = p - u_moon.xy;
    float r = length(d);
    float ang = atan(d.x, d.y);
    float rays = pow(max(0.0, sin(ang * 9.0 + sin(t * 0.3) * 0.4 * u_motion) * 0.5 + 0.5), 3.0) * (0.6 + 0.4 * noise(vec2(ang * 6.0, t * 0.4 * u_motion)));
    float fall = smoothstep(u_moon.z, u_moon.z * 1.6, r) * exp(-r / (110.0 * u));
    col += vec3(0.55, 0.62, 1.0) * rays * fall * u_moon.a;
    col += vec3(0.7, 0.75, 1.0) * exp(-max(0.0, r - u_moon.z) / (10.0 * u)) * u_moon.a * 0.35;
  }

  // --- a luz vermelha da rua pela persiana (o letreiro lá fora pisca)
  if (u_stripe.a > 0.0 && p.x > u_stripe.x && p.x < u_stripe.z) {
    float yy = p.y - (p.x - u_stripe.x) * 0.42;
    float s = step(mod(yy - u_stripe.y, 6.0 * u), 3.4 * u) * step(u_stripe.y, yy);
    float fade = 1.0 - (p.x - u_stripe.x) / (u_stripe.z - u_stripe.x);
    float blink = mix(1.0, step(0.25, fract(t * 0.37)) * (0.75 + 0.25 * step(0.5, fract(t * 4.0))), u_motion);
    col += vec3(1.0, 0.22, 0.16) * s * fade * blink * u_stripe.a * (0.6 + 0.4 * hz);
  }

  // --- a aura das pedras aprimoradas
  for (int i = 0; i < ${MAX_TILES}; i++) {
    if (i >= u_nt) break;
    vec2 qa = u_tA[i].xy;
    vec2 qb = u_tA[i].zw;
    vec2 qc = u_tB[i].xy;
    vec2 qd = u_tB[i].zw;
    float k = u_tkind[i];
    vec2 c = (qa + qb + qc + qd) * 0.25;
    float tw2 = length(qb - qa);
    float th2 = length(qd - qa);
    float sd = sdQuad(p, qa, qb, qc, qd);
    float fi = float(i);
    // a aura começa rente à pedra e cai rápido (só por fora; a cara da pedra fica limpa)
    float aura = exp(-max(sd, 0.0) / (3.2 * u)) * step(0.35 * u, sd);
    float edge = exp(-max(sd, 0.0) / (1.2 * u)) * step(0.35 * u, sd);
    vec3 tint;
    float amt;
    if (k < 1.5) {
      // ouro: o brilho morno e as faíscas em volta
      tint = vec3(1.0, 0.76, 0.28);
      amt = 0.55 + 0.15 * sin(t * 2.0 + fi);
      // as faíscas: uma cruzinha que acende e apaga em volta da pedra
      vec2 cell = floor(p / (5.0 * u));
      float h = hash(cell + fi * 7.0);
      vec2 sp = (cell + 0.5) * 5.0 * u;
      vec2 dd = abs(p - sp);
      float cross = step(min(dd.x, dd.y), 0.5) * step(max(dd.x, dd.y), 1.6 * u);
      float tw = step(0.9, h) * pow(max(0.0, sin(t * 2.4 * u_motion + h * 40.0)), 10.0);
      float sds = sdQuad(sp, qa, qb, qc, qd);
      col += vec3(1.0, 0.95, 0.7) * tw * cross * step(sds, 6.0 * u) * step(1.5 * u, sds) * (1.0 - 0.5 * step(0.6, max(dd.x, dd.y)));
    } else if (k < 2.5) {
      // rubi: bate como um coração
      tint = vec3(1.0, 0.1, 0.16);
      float beat = fract(t * 1.1 * u_motion + fi * 0.2);
      amt = 0.35 + 0.7 * (exp(-beat * 14.0) + 0.5 * exp(-max(0.0, beat - 0.2) * 14.0) * step(0.2, beat));
    } else if (k < 3.5) {
      // cristal: o arco-íris correndo na borda e o brilho frio
      float a = atan(p.y - c.y, p.x - c.x);
      tint = mix(vec3(0.45, 0.9, 1.0), hue(fract(a / 6.2832 + t * 0.15 * u_motion)), 0.55);
      amt = 0.55 + 0.25 * noise(vec2(a * 3.0, t * 2.0));
      col += tint * edge * 0.45;
    } else if (k < 4.5) {
      // chumbo: pesado, cinza azulado, quase sem luz
      tint = vec3(0.5, 0.52, 0.68);
      amt = 0.28;
    } else if (k < 5.5) {
      // fantasma: os fiapos subindo
      tint = vec3(0.6, 1.0, 0.86);
      vec2 q = (p - c) / (6.0 * u) + vec2(0.0, t * 0.9 * u_motion);
      float w = smoothstep(0.55, 0.85, fbm(q + fi));
      float reach = th2 * 0.5 + 12.0 * u;
      float above = smoothstep(reach, 0.0, c.y - p.y) * step(c.y - p.y, reach) * step(0.35 * u, sd);
      col += tint * w * above * exp(-abs(p.x - c.x) / max(1.0, tw2 * 0.6)) * 0.6;
      amt = 0.4 + 0.15 * sin(t * 1.7 + fi);
    } else if (k < 6.5) {
      // âmbar: o mel morno respirando
      tint = vec3(1.0, 0.58, 0.16);
      amt = 0.45 + 0.15 * sin(t * 1.2 + fi);
    } else {
      // obsidiana: o roxo escuro brilhando na quina
      tint = vec3(0.62, 0.3, 1.0);
      amt = 0.35 + 0.2 * pow(max(0.0, sin(t * 0.9 + fi)), 6.0);
      col += tint * edge * 0.35;
    }
    col += tint * aura * amt;
  }

  // --- o clarão da pedra que caiu: o anel abrindo e o lampejo no meio
  for (int i = 0; i < ${MAX_BURSTS}; i++) {
    vec4 B = u_burst[i];
    if (B.w <= 0.0) continue;
    float age = B.z;
    float r = length(p - B.xy);
    float rad = (8.0 + age * 90.0) * u * B.w;
    float ring = exp(-abs(r - rad) / (2.2 * u)) * (1.0 - smoothstep(0.0, 0.55, age));
    float flash = exp(-r / (14.0 * u * B.w)) * exp(-age * 7.0);
    col += u_bcol[i] * (ring * 0.9 + flash * 1.3) * B.w;
  }

  // a saída em degraus pontilhados, como a pintura
  // (o que é muito fraco some: senão o pontilhado vira chuvisco no escuro)
  float steps = 12.0;
  col = max(col - 0.035, 0.0) * 1.04;
  col = floor(col * steps + bayer4(gl_FragCoord.xy)) / steps;
  gl_FragColor = vec4(min(col, vec3(1.0)), 1.0);
}
`;

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error(`shader: ${log}`);
  }
  return sh;
}

/**
 * Liga o shader no `canvas`. Devolve { draw(frame), dispose() } ou null (sem WebGL).
 * frame: { w, h, time, unit, motion, lights, tiles: [{ q: [8 números: os 4 cantos], kind }], bursts, haze, hazeBand, moon, stripe }
 */
export function createFx(canvas) {
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'low-power' });
  if (!gl) return null;
  let prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? 'link');
  } catch (error) {
    console.warn('fx', error);
    return null;
  }
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'a_pos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  const loc = (name) => gl.getUniformLocation(prog, name);
  const U = {
    res: loc('u_res'),
    time: loc('u_time'),
    unit: loc('u_unit'),
    motion: loc('u_motion'),
    light: loc('u_light'),
    lcol: loc('u_lcol'),
    nl: loc('u_nl'),
    tA: loc('u_tA'),
    tB: loc('u_tB'),
    tkind: loc('u_tkind'),
    nt: loc('u_nt'),
    burst: loc('u_burst'),
    bcol: loc('u_bcol'),
    haze: loc('u_haze'),
    hazeBand: loc('u_hazeBand'),
    moon: loc('u_moon'),
    stripe: loc('u_stripe'),
  };
  const lightBuf = new Float32Array(MAX_LIGHTS * 4);
  const lcolBuf = new Float32Array(MAX_LIGHTS * 4);
  const tileA = new Float32Array(MAX_TILES * 4);
  const tileB = new Float32Array(MAX_TILES * 4);
  const kindBuf = new Float32Array(MAX_TILES);
  const burstBuf = new Float32Array(MAX_BURSTS * 4);
  const bcolBuf = new Float32Array(MAX_BURSTS * 3);

  return {
    draw(f) {
      if (gl.isContextLost()) return;
      gl.viewport(0, 0, f.w, f.h);
      gl.uniform2f(U.res, f.w, f.h);
      gl.uniform1f(U.time, f.time % 1000);
      gl.uniform1f(U.unit, f.unit);
      gl.uniform1f(U.motion, f.motion);
      const nl = Math.min(MAX_LIGHTS, f.lights.length);
      lightBuf.fill(0);
      lcolBuf.fill(0);
      for (let i = 0; i < nl; i += 1) {
        const L = f.lights[i];
        lightBuf.set([L.x, L.y, L.r, L.k], i * 4);
        lcolBuf.set([L.c[0], L.c[1], L.c[2], L.kind ?? 0], i * 4);
      }
      gl.uniform4fv(U.light, lightBuf);
      gl.uniform4fv(U.lcol, lcolBuf);
      gl.uniform1i(U.nl, nl);
      const nt = Math.min(MAX_TILES, f.tiles.length);
      tileA.fill(0);
      tileB.fill(0);
      kindBuf.fill(0);
      for (let i = 0; i < nt; i += 1) {
        // os quatro cantos, na ordem: em cima à esquerda, em cima à direita, embaixo à direita, embaixo à esquerda
        const q = f.tiles[i].q;
        tileA.set([q[0], q[1], q[2], q[3]], i * 4);
        tileB.set([q[4], q[5], q[6], q[7]], i * 4);
        kindBuf[i] = f.tiles[i].kind;
      }
      gl.uniform4fv(U.tA, tileA);
      gl.uniform4fv(U.tB, tileB);
      gl.uniform1fv(U.tkind, kindBuf);
      gl.uniform1i(U.nt, nt);
      burstBuf.fill(0);
      bcolBuf.fill(0);
      f.bursts.slice(0, MAX_BURSTS).forEach((B, i) => {
        burstBuf.set([B.x, B.y, B.age, B.k], i * 4);
        bcolBuf.set(B.c, i * 3);
      });
      gl.uniform4fv(U.burst, burstBuf);
      gl.uniform3fv(U.bcol, bcolBuf);
      const hz = f.haze ?? { c: [0, 0, 0], a: 0 };
      gl.uniform4f(U.haze, hz.c[0], hz.c[1], hz.c[2], hz.a);
      gl.uniform2f(U.hazeBand, f.hazeBand?.[0] ?? 0, f.hazeBand?.[1] ?? 0);
      const m = f.moon ?? { x: 0, y: 0, r: 0, a: 0 };
      gl.uniform4f(U.moon, m.x, m.y, m.r, m.a);
      const s = f.stripe ?? { x0: 0, y0: 0, x1: 0, a: 0 };
      gl.uniform4f(U.stripe, s.x0, s.y0, s.x1, s.a);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    lost: () => gl.isContextLost(),
    dispose() {
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}
