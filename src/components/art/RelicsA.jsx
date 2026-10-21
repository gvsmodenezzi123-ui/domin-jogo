// src/components/art/RelicsA.jsx
// Talismãs 40x40 (lote A): Borracha, Cinzeiro, Giz, Chave de Fenda, Bucha de Aço e Dedal.
// Tudo é rasterizado na grade 40x40 (retângulos inteiros), com luz quente vinda de
// cima/esquerda, três tons por face, contorno escuro e sombra no chão.
import { PixelSvg } from './PixelSvg.jsx';

/* ---------- Pincéis de grade (não exportados) ---------- */

/** Vários retângulos de uma cor: r = [[x, y, w, h], ...] (w e h valem 1 se omitidos). */
function Px({ fill, r, opacity }) {
  return r.map(([x, y, w = 1, h = 1], i) => <rect key={i} x={x} y={y} width={w} height={h} fill={fill} opacity={opacity} />);
}

/** Polígono cheio na grade: entra o pixel cujo centro cai dentro (linha de varredura). */
function Poly({ pts, fill, opacity }) {
  const ys = pts.map((p) => p[1]);
  const rows = [];
  for (let y = Math.floor(Math.min(...ys)); y < Math.ceil(Math.max(...ys)); y += 1) {
    const cy = y + 0.5;
    const xs = [];
    pts.forEach(([x1, y1], i) => {
      const [x2, y2] = pts[(i + 1) % pts.length];
      if ((y1 <= cy && y2 > cy) || (y2 <= cy && y1 > cy)) xs.push(x1 + ((cy - y1) / (y2 - y1)) * (x2 - x1));
    });
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const xl = Math.ceil(xs[k] - 0.5);
      const xr = Math.ceil(xs[k + 1] - 0.5);
      if (xr > xl) rows.push(<rect key={`${y}-${k}`} x={xl} y={y} width={xr - xl} height={1} fill={fill} opacity={opacity} />);
    }
  }
  return rows;
}

/** Elipse cheia na grade, linha por linha. */
function Oval({ cx, cy, rx, ry, fill, opacity }) {
  const rows = [];
  for (let y = Math.floor(cy - ry); y < Math.ceil(cy + ry); y += 1) {
    const t = (y + 0.5 - cy) / ry;
    if (Math.abs(t) >= 1) continue;
    const hw = rx * Math.sqrt(1 - t * t);
    const xl = Math.ceil(cx - hw - 0.5);
    const xr = Math.ceil(cx + hw - 0.5);
    if (xr > xl) rows.push(<rect key={y} x={xl} y={y} width={xr - xl} height={1} fill={fill} opacity={opacity} />);
  }
  return rows;
}

/**
 * Faixa a 45° (subindo para a direita): entra o pixel com p0 ≤ x+y < p1 e s0 ≤ x−y < s1,
 * dentro da caixa [x0, x1) × [y0, y1). Serve para hastes, tacos e reflexos diagonais.
 */
function Diag({ p, s = [-99, 99], box = [0, 0, 40, 40], fill, opacity }) {
  const [p0, p1] = p;
  const [s0, s1] = s;
  const [x0, y0, x1, y1] = box;
  const rows = [];
  for (let y = y0; y < y1; y += 1) {
    const xl = Math.max(x0, p0 - y, s0 + y);
    const xr = Math.min(x1, p1 - y, s1 + y);
    if (xr > xl) rows.push(<rect key={y} x={xl} y={y} width={xr - xl} height={1} fill={fill} opacity={opacity} />);
  }
  return rows;
}

/**
 * Lateral de cilindro/cone em pé, sombreada em faixas verticais. Vai de y0 a y1 (raio r0 → r1)
 * e fecha embaixo com meia elipse de altura ry. `tones` vai da esquerda (luz) à direita (sombra);
 * `cuts` são os limites entre faixas, de −1 a 1.
 */
function Drum({ cx, y0, y1, r0, r1 = r0, ry = 0, tones, cuts = [] }) {
  const rows = [];
  const span = (y, R, hw) => {
    const el = Math.ceil(cx - hw - 0.5);
    const er = Math.ceil(cx + hw - 0.5);
    tones.forEach((fill, j) => {
      const xl = Math.max(el, j === 0 ? el : Math.ceil(cx + cuts[j - 1] * R - 0.5));
      const xr = Math.min(er, j === tones.length - 1 ? er : Math.ceil(cx + cuts[j] * R - 0.5));
      if (xr > xl) rows.push(<rect key={`${y}-${j}`} x={xl} y={y} width={xr - xl} height={1} fill={fill} />);
    });
  };
  for (let y = y0; y < y1; y += 1) {
    const R = r0 + ((r1 - r0) * (y + 0.5 - y0)) / (y1 - y0);
    span(y, R, R);
  }
  for (let y = y1; y < y1 + ry; y += 1) {
    const t = (y + 0.5 - y1) / ry;
    if (t < 1) span(y, r1, r1 * Math.sqrt(1 - t * t));
  }
  return rows;
}

/** Linha isométrica 2:1 em degraus de 2x1 (dy = −1 sobe, dy = 1 desce para a direita). */
function Iso({ x, y, n, dy = -1, h = 1, fill, opacity }) {
  return Array.from({ length: n }, (_, i) => (
    <rect key={i} x={x + 2 * i} y={y + dy * i} width={2} height={h} fill={fill} opacity={opacity} />
  ));
}

/* ---------- 1. BORRACHA ESCOLAR (comum) ---------- */
export function BorrachaIcon({ className = 'w-10 h-10' }) {
  return (
    <PixelSvg className={className} viewBox="0 0 40 40">
      {/* Folha de caderno no chão (com espessura na frente) */}
      <Poly pts={[[0, 27], [18, 18], [38, 28], [20, 37]]} fill="#5a4e3b" />
      <Poly pts={[[0, 26], [18, 17], [38, 27], [20, 36]]} fill="#d3c7a6" />
      <Poly pts={[[10, 31], [28, 22], [38, 27], [20, 36]]} fill="#c2b593" />
      {/* Pauta azul gasta */}
      <Iso x={20} y={34} n={8} fill="#8796ad" opacity="0.7" />

      {/* Risco de lápis: firme à direita, meio apagado onde a borracha passou */}
      <Iso x={22} y={29} n={5} fill="#34343d" />
      <Iso x={22} y={30} n={5} fill="#5d5d68" opacity="0.6" />
      <Px fill="#7d7a76" opacity="0.55" r={[[16, 32, 2], [19, 31], [21, 30]]} />

      {/* Farelinhos de borracha */}
      <Px fill="#e6a2ad" r={[[13, 32, 2], [17, 34], [20, 33, 2], [11, 30], [24, 33]]} />
      <Px fill="#874653" r={[[13, 33, 2], [17, 35], [20, 34, 2], [11, 31], [24, 34]]} />

      {/* Sombra da borracha sobre o papel */}
      <Poly pts={[[6, 25], [9, 27], [17, 31], [37, 21], [34, 19], [14, 29]]} fill="#000" opacity="0.4" />

      {/* Contorno da borracha */}
      <Poly pts={[[5, 21], [8, 17], [26, 8], [35, 12.5], [35, 19.5], [14, 30], [5, 25.5]]} fill="#1c1917" />

      {/* Ponta rosa: face da ponta, quina gasta e topo */}
      <Poly pts={[[6, 21], [14, 25], [14, 29], [6, 25]]} fill="#d27484" />
      <Poly pts={[[8, 18], [16, 22], [14, 25], [6, 21]]} fill="#e894a0" />
      <Poly pts={[[8, 18], [16, 14], [24, 18], [16, 22]]} fill="#f4abb6" />
      <Poly pts={[[16, 22], [24, 18], [24, 24], [14, 29], [14, 25]]} fill="#a54d5d" />
      {/* Metade azul: topo e lateral */}
      <Poly pts={[[16, 14], [26, 9], [34, 13], [24, 18]]} fill="#88a8e8" />
      <Poly pts={[[24, 18], [34, 13], [34, 19], [24, 24]]} fill="#3a60ad" />

      {/* Luz nas arestas de cima */}
      <Iso x={9} y={17} n={4} fill="#ffd3da" />
      <Iso x={17} y={13} n={5} fill="#c2d4f7" />
      <Iso x={17} y={20} n={4} fill="#f9c4cc" />
      <Iso x={25} y={16} n={5} fill="#a9c1f1" />
      {/* Sombra na base da lateral */}
      <Iso x={14} y={28} n={5} fill="#6c2b38" />
      <Iso x={24} y={23} n={5} fill="#22396e" />
      <Px fill="#9c4c5a" r={[[6, 24, 2], [8, 25, 2], [10, 26, 2], [12, 27, 2]]} />

      {/* Grafite encardido na quina gasta */}
      <Px fill="#8a6670" r={[[8, 20, 2], [11, 21], [7, 22], [10, 23, 2]]} />
      <Px fill="#5e4b52" r={[[9, 21], [12, 22]]} />
    </PixelSvg>
  );
}

/* ---------- 2. CINZEIRO DE BAR (comum) ---------- */
export function CinzeiroIcon({ className = 'w-10 h-10' }) {
  const glass = ['#a9bec4', '#7f9aa2', '#5e777f', '#415860', '#2c3d43'];
  return (
    <PixelSvg className={className} viewBox="0 0 40 40">
      {/* Sombra no chão */}
      <Oval cx={21} cy={32} rx={18} ry={4.5} fill="#000" opacity="0.5" />

      {/* Vidro grosso: contorno, parede lateral e aro */}
      <Drum cx={20} y0={22} y1={26} r0={17} ry={7.5} tones={['#090a0f']} />
      <Oval cx={20} cy={22} rx={17} ry={7.5} fill="#090a0f" />
      <Drum cx={20} y0={22} y1={26} r0={16} ry={6.5} tones={glass} cuts={[-0.78, -0.45, 0.25, 0.7]} />
      <Px fill="#d7e3e6" r={[[7, 27, 1, 3], [10, 29, 1, 2]]} />
      <Oval cx={20} cy={22} rx={16} ry={6.5} fill="#b5c4c8" />
      <Oval cx={19} cy={21.5} rx={14} ry={5.5} fill="#cad6d9" />

      {/* Bojo por dentro: parede do fundo e cinzas */}
      <Oval cx={20} cy={22.5} rx={11.5} ry={4.5} fill="#4a6067" />
      <Oval cx={20} cy={23.6} rx={10} ry={3.4} fill="#77726a" />
      <Px fill="#5a564f" r={[[13, 23, 3], [23, 24, 2], [18, 26, 3], [27, 23], [11, 24]]} />
      <Px fill="#9b968b" r={[[16, 22, 2], [21, 25, 2], [25, 22, 2], [12, 25]]} />

      {/* Moedinha no meio das cinzas */}
      <Oval cx={14.5} cy={24} rx={3} ry={1.6} fill="#7a4e12" />
      <Oval cx={14.5} cy={23.4} rx={3} ry={1.5} fill="#dcaa45" />
      <Px fill="#f8dc8a" r={[[13, 23, 2]]} />

      {/* Bitucas amassadas */}
      <Px fill="#c98a4a" r={[[18, 24, 2]]} />
      <Px fill="#ebe3cf" r={[[20, 24, 2]]} />
      <Px fill="#2a2622" r={[[22, 24]]} />
      <Px fill="#8d5a2c" r={[[18, 25, 2]]} />
      <Px fill="#b1a68f" r={[[20, 25, 2]]} />

      {/* Cigarro apoiado no aro: cinza, brasa, papel e filtro */}
      <Oval cx={24.5} cy={20.5} rx={2.5} ry={2} fill="#ff7a1a" opacity="0.3" />
      <Iso x={23} y={21} n={8} h={2} fill="#090a0f" />
      <Px fill="#a29d93" r={[[23, 21, 2]]} />
      <Px fill="#5f5b55" r={[[23, 22, 2]]} />
      <Px fill="#ff8a2a" r={[[25, 20, 2]]} />
      <Px fill="#c2410c" r={[[25, 21, 2]]} />
      <Px fill="#fef08a" r={[[25, 20]]} />
      <Iso x={27} y={19} n={3} fill="#f1eadb" />
      <Iso x={27} y={20} n={3} fill="#b3a892" />
      <Iso x={33} y={16} n={3} fill="#dca05a" />
      <Iso x={33} y={17} n={3} fill="#9e6430" />

      {/* Fio de fumaça subindo da brasa */}
      <Px fill="#a8a29e" opacity="0.85" r={[[24, 18], [23, 17], [23, 16], [24, 15], [25, 14]]} />
      <Px fill="#a8a29e" opacity="0.6" r={[[25, 13], [24, 12], [23, 11], [23, 10], [24, 9]]} />
      <Px fill="#a8a29e" opacity="0.35" r={[[25, 8], [25, 7], [24, 6], [23, 5]]} />
    </PixelSvg>
  );
}

/* ---------- 3. GIZ DE SINUCA (comum) ---------- */
export function GizIcon({ className = 'w-10 h-10' }) {
  return (
    <PixelSvg className={className} viewBox="0 0 40 40">
      {/* Sombra e pó azul espalhado no chão */}
      <Oval cx={20} cy={31} rx={15} ry={4} fill="#000" opacity="0.5" />
      <Oval cx={19} cy={31} rx={13} ry={3} fill="#2f6fb8" opacity="0.3" />
      <Px fill="#7fc4ff" opacity="0.8" r={[[4, 30], [6, 32], [33, 29], [31, 33], [9, 34], [27, 35]]} />
      <Px fill="#3a78b8" r={[[5, 31, 2], [32, 31, 2], [14, 35, 2], [23, 35]]} />

      {/* Contorno do cubo */}
      <Poly pts={[[19, 6.5], [32.5, 13.5], [32.5, 26.5], [19, 33.5], [5.5, 26.5], [5.5, 13.5]]} fill="#090a0f" />
      {/* Faces: esquerda (meia-luz), direita (sombra), topo (luz) */}
      <Poly pts={[[7, 14], [19, 20], [19, 32], [7, 26]]} fill="#3483d4" />
      <Poly pts={[[19, 20], [31, 14], [31, 26], [19, 32]]} fill="#1f5899" />
      <Poly pts={[[19, 8], [31, 14], [19, 20], [7, 14]]} fill="#7fc4ff" />
      {/* Tons das laterais */}
      <Poly pts={[[7, 14], [19, 20], [19, 22], [7, 16]]} fill="#58a2e8" />
      <Poly pts={[[7, 24], [19, 30], [19, 32], [7, 26]]} fill="#2768b3" />
      <Poly pts={[[19, 20], [31, 14], [31, 16], [19, 22]]} fill="#2d6cb2" />
      <Poly pts={[[19, 30], [31, 24], [31, 26], [19, 32]]} fill="#153f72" />
      {/* Pintinhas de giz nas laterais */}
      <Px fill="#7cbaf2" r={[[10, 20], [14, 24], [9, 23], [16, 27]]} />
      <Px fill="#3f7fc4" r={[[23, 23], [27, 20], [25, 27], [29, 24]]} />
      {/* Luz nas arestas do topo */}
      <Iso x={8} y={13} n={6} fill="#b9e1ff" />
      <Iso x={20} y={8} n={6} dy={1} fill="#b9e1ff" />

      {/* Cavidade côncava do taco: sombra em cima/esquerda, luz embaixo/direita */}
      <Oval cx={19} cy={14} rx={6} ry={3} fill="#1d4f8a" />
      <Oval cx={19.8} cy={14.5} rx={5} ry={2.3} fill="#7ab9f0" />
      <Oval cx={18.6} cy={13.7} rx={4.6} ry={2} fill="#2a63a6" />
      <Px fill="#a8d8ff" r={[[20, 16, 3]]} />

      {/* Taco encostando: sola de couro azulada, anel de marfim e madeira */}
      <Diag p={[33, 40]} s={[11, 80]} fill="#090a0f" />
      <Diag p={[34, 39]} s={[12, 15]} fill="#2f6fb8" />
      <Diag p={[34, 36]} s={[12, 15]} fill="#5d9fe0" />
      <Diag p={[34, 39]} s={[15, 21]} fill="#e6dec6" />
      <Diag p={[34, 35]} s={[15, 21]} fill="#fffaf0" />
      <Diag p={[37, 39]} s={[15, 21]} fill="#a99e84" />
      <Diag p={[34, 39]} s={[21, 80]} fill="#c99a5a" />
      <Diag p={[34, 35]} s={[21, 80]} fill="#f0d39a" />
      <Diag p={[37, 38]} s={[21, 80]} fill="#9c7440" />
      <Diag p={[38, 39]} s={[21, 80]} fill="#6b4c26" />

      {/* Nuvenzinha de pó na batida */}
      <Px fill="#a8d8ff" opacity="0.7" r={[[22, 10], [26, 9], [21, 8], [27, 12], [24, 7]]} />
    </PixelSvg>
  );
}

/* ---------- 4. CHAVE DE FENDA (raro) ---------- */
export function ChaveDeFendaIcon({ className = 'w-10 h-10' }) {
  return (
    <PixelSvg className={className} viewBox="0 0 40 40">
      {/* Sombra no chão (a silhueta deslocada para baixo/direita) */}
      <Diag p={[38, 50]} s={[-32, -6]} fill="#000" opacity="0.4" />
      <Diag p={[41, 47]} s={[-7, 28]} fill="#000" opacity="0.4" />

      {/* Contorno: cabo, colar, haste e lâmina */}
      <Diag p={[34, 46]} s={[-32, -6]} fill="#1c1006" />
      <Diag p={[37, 43]} s={[-7, 21]} fill="#090a0f" />
      <Diag p={[36, 44]} s={[20, 28]} fill="#090a0f" />

      {/* Cabo de acrílico âmbar (a borda de baixo brilha com a luz que atravessa) */}
      <Diag p={[35, 45]} s={[-31, -8]} fill="#e39a22" />
      <Diag p={[35, 37]} s={[-31, -8]} fill="#f7c75a" />
      <Diag p={[41, 43]} s={[-31, -8]} fill="#b86a10" />
      <Diag p={[43, 44]} s={[-31, -8]} fill="#7e4209" />
      <Diag p={[44, 45]} s={[-31, -8]} fill="#d98a1c" />
      {/* Espiga de aço vista através do acrílico */}
      <Diag p={[39, 41]} s={[-28, -8]} fill="#6e4512" />
      <Diag p={[39, 40]} s={[-28, -8]} fill="#b58a45" />
      {/* Reflexo especular no acrílico */}
      <Diag p={[37, 38]} s={[-29, -21]} fill="#fff1bf" />
      <Diag p={[37, 38]} s={[-18, -13]} fill="#fff1bf" />
      {/* Anéis de pegada */}
      <Diag p={[35, 45]} s={[-25, -24]} fill="#9a560c" opacity="0.6" />
      <Diag p={[35, 45]} s={[-19, -18]} fill="#9a560c" opacity="0.6" />

      {/* Colar cromado */}
      <Diag p={[36, 44]} s={[-9, -6]} fill="#8d969f" />
      <Diag p={[36, 38]} s={[-9, -6]} fill="#e6ebef" />
      <Diag p={[41, 44]} s={[-9, -6]} fill="#4f575f" />

      {/* Haste de aço cromado com brilho especular */}
      <Diag p={[38, 42]} s={[-6, 20]} fill="#808a93" />
      <Diag p={[38, 39]} s={[-6, 20]} fill="#f4f7f9" />
      <Diag p={[39, 40]} s={[-6, 20]} fill="#b9c1c9" />
      <Diag p={[41, 42]} s={[-6, 20]} fill="#4c545c" />
      <Diag p={[38, 40]} s={[2, 5]} fill="#ffffff" />
      <Diag p={[38, 40]} s={[12, 13]} fill="#ffffff" />

      {/* Lâmina da fenda */}
      <Diag p={[37, 43]} s={[20, 27]} fill="#5f6872" />
      <Diag p={[37, 40]} s={[20, 27]} fill="#dfe5ea" />
      <Diag p={[37, 43]} s={[26, 27]} fill="#2f353b" />
    </PixelSvg>
  );
}

/* ---------- 5. BUCHA DE AÇO (raro) ---------- */
export function BuchaDeAcoIcon({ className = 'w-10 h-10' }) {
  const rivet = (x, y) => (
    <g key={`${x}-${y}`}>
      <rect x={x} y={y} width={3} height={3} fill="#3a4046" />
      <rect x={x} y={y} width={2} height={2} fill="#c9d0d6" />
      <rect x={x} y={y} width={1} height={1} fill="#ffffff" />
    </g>
  );
  return (
    <PixelSvg className={className} viewBox="0 0 40 40">
      {/* Sombra no chão */}
      <Oval cx={21} cy={37} rx={12} ry={2.5} fill="#000" opacity="0.5" />

      {/* Contorno, topo e lateral (espessura da pedra) */}
      <Poly pts={[[9, 6.5], [14, 4], [31, 4], [31, 34.5], [26, 37], [9, 37]]} fill="#0b0806" />
      <Poly pts={[[10, 7], [14, 5], [30, 5], [26, 7]]} fill="#d9dfe4" />
      <Px fill="#f4f7f9" r={[[14, 5, 16]]} />
      <Poly pts={[[26, 7], [30, 5], [30, 34], [26, 36]]} fill="#4f5860" />
      <Px fill="#78828b" r={[[28, 8, 1, 24]]} />

      {/* Frente: chanfro grosso (luz em cima/esquerda, sombra embaixo/direita) */}
      <Poly pts={[[10, 7], [26, 7], [24, 9], [12, 9]]} fill="#e3e8ec" />
      <Poly pts={[[10, 7], [12, 9], [12, 34], [10, 36]]} fill="#c2cad1" />
      <Poly pts={[[10, 36], [12, 34], [24, 34], [26, 36]]} fill="#4a525a" />
      <Poly pts={[[26, 7], [26, 36], [24, 34], [24, 9]]} fill="#737c85" />
      {/* Miolo de aço escovado */}
      <rect x="12" y="9" width="12" height="25" fill="#98a2ab" />
      {Array.from({ length: 12 }, (_, i) => (
        <rect key={i} x={12 + (i % 3)} y={9 + 2 * i} width={10 - (i % 2) * 3} height={1} fill="#a9b2ba" opacity="0.7" />
      ))}
      {/* Reflexo cromado: faixa clara em cima, faixa escura embaixo */}
      <Diag p={[25, 30]} box={[12, 9, 24, 34]} fill="#f4f8fa" opacity="0.85" />
      <Diag p={[32, 33]} box={[12, 9, 24, 34]} fill="#ffffff" opacity="0.6" />
      <Diag p={[44, 50]} box={[12, 9, 24, 34]} fill="#4e575f" opacity="0.55" />

      {/* Vinco do meio [0|0] e pino central */}
      <rect x="12" y="21" width="12" height="1" fill="#2b3036" />
      <rect x="12" y="22" width="12" height="1" fill="#dfe5ea" />
      <Oval cx={18} cy={21.5} rx={2} ry={2} fill="#2b3036" />
      <Oval cx={18} cy={21.5} rx={1.4} ry={1.4} fill="#b8c0c8" />
      <rect x="17" y="20" width="1" height="1" fill="#ffffff" />

      {/* Rebites nos cantos */}
      {[rivet(13, 10), rivet(20, 10), rivet(13, 30), rivet(20, 30)]}

      {/* Brilho curinga (estrela de 4 pontas) */}
      <Px fill="#ffd76a" r={[[29, 0, 1, 11], [24, 5, 11, 1]]} />
      <Px fill="#ffffff" r={[[29, 2, 1, 7], [26, 5, 7, 1], [28, 4, 3, 3]]} />
    </PixelSvg>
  );
}

/* ---------- 6. DEDAL DE CHUMBO (lendário) ---------- */
export function DedalIcon({ className = 'w-10 h-10' }) {
  const lead = ['#7f8a96', '#aab4be', '#8b96a1', '#6b7682', '#4a535d', '#353c44'];
  // Furinhos: linhas de ângulos no cilindro (comprimem nas bordas para dar volume)
  const dimples = [];
  [14, 17, 20, 23].forEach((y, row) => {
    const R = 7.5 + (2 * (y - 12)) / 16;
    for (let a = -3; a <= 3; a += 1) {
      const th = ((a + (row % 2) * 0.5) * Math.PI) / 8;
      if (Math.abs(th) > 1.25) continue;
      dimples.push([Math.round(18 + R * Math.sin(th) - 0.5), y]);
    }
  });
  return (
    <PixelSvg className={className} viewBox="0 0 40 40">
      {/* Aura roxa de raridade lendária */}
      <Oval cx={18} cy={20} rx={17} ry={17} fill="#b277ff" opacity="0.07" />
      <Oval cx={18} cy={20} rx={14} ry={14} fill="#b277ff" opacity="0.09" />
      <Oval cx={18} cy={21} rx={11.5} ry={12} fill="#b277ff" opacity="0.12" />

      {/* Sombra no chão */}
      <Oval cx={19} cy={33} rx={12} ry={3} fill="#000" opacity="0.55" />

      {/* Contorno */}
      <Drum cx={18} y0={12} y1={29} r0={8.5} r1={11.5} ry={3.5} tones={['#0b0806']} />
      <Oval cx={18} cy={12.5} rx={8.5} ry={6.5} fill="#0b0806" />

      {/* Cúpula do dedal */}
      <Oval cx={18} cy={12.5} rx={7.5} ry={5.5} fill="#56606b" />
      <Oval cx={17} cy={12.5} rx={6.5} ry={5} fill="#8b96a1" />
      <Oval cx={16} cy={11.5} rx={4.5} ry={3.4} fill="#a6b0ba" />
      <Oval cx={15.5} cy={10.5} rx={2} ry={1.2} fill="#c3ccd5" />

      {/* Corpo de chumbo (cilindro levemente cônico) */}
      <Drum cx={18} y0={13} y1={28} r0={7.5} r1={9.5} tones={lead} cuts={[-0.82, -0.42, -0.02, 0.4, 0.75]} />

      {/* Furinhos da textura (sombra em cima, luz embaixo) */}
      <Px fill="#2b3137" opacity="0.85" r={dimples} />
      <Px fill="#ffffff" opacity="0.28" r={dimples.map(([x, y]) => [x, y + 1])} />
      <Px fill="#2b3137" opacity="0.7" r={[[14, 9], [17, 8], [20, 9], [12, 11], [16, 11], [19, 11], [22, 11]]} />

      {/* Amassado: sombra em cima/esquerda, luz embaixo/direita */}
      <Px fill="#2b3137" r={[[21, 15, 3], [20, 16], [20, 17]]} />
      <Px fill="#5d6772" r={[[21, 16, 3, 2]]} />
      <Px fill="#a7b1bc" r={[[24, 16, 1, 2], [21, 18, 3]]} />

      {/* Aro de baixo, mais grosso */}
      <Drum cx={18} y0={27} y1={29} r0={10.2} r1={10.5} ry={2.5} tones={['#9aa5b0', '#bcc6cf', '#939ea9', '#707b86', '#4e5761', '#383f47']} cuts={[-0.82, -0.42, -0.02, 0.4, 0.75]} />
      <Px fill="#d3dbe2" r={[[11, 27, 9]]} />

      {/* Coração rachado do rival */}
      <Px fill="#0b0806" r={[[29, 4, 4, 2], [34, 4, 4, 2], [28, 5, 11, 5], [29, 10, 9, 1], [30, 11, 7, 1], [31, 12, 5, 1], [32, 13, 3, 1]]} />
      <Px fill="#c8261d" r={[[30, 5, 2], [35, 5, 2], [29, 6, 4], [34, 6, 4], [29, 7, 9, 2], [30, 9, 7], [31, 10, 5], [32, 11, 3], [33, 12]]} />
      <Px fill="#ff6b5c" r={[[30, 6, 2], [29, 7, 2], [35, 6]]} />
      <Px fill="#ffd0c8" r={[[30, 6]]} />
      <Px fill="#741510" r={[[36, 7, 1, 2], [34, 10, 2], [33, 11, 2]]} />
      <Px fill="#0b0806" r={[[33, 6], [33, 7], [32, 8], [33, 9], [34, 10], [33, 11]]} />

      {/* Faíscas roxas */}
      <Px fill="#d6b8ff" r={[[4, 9, 1, 3], [3, 10, 3, 1], [32, 22, 1, 3], [31, 23, 3, 1]]} />
    </PixelSvg>
  );
}
