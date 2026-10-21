import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { NODES, REGIONS, TOTAL_NODES, regionOf } from '../data/campaign.js';
import { getRival } from '../data/rivals.js';
import { MAX_HEARTS } from '../engine/dominoLogic.js';
import { rivalBlurb, rivalRules } from '../engine/rivalInfo.js';
import CoinCount from './CoinCount.jsx';
import Hotbar from './Hotbar.jsx';
import { HeartsBar } from './PixelHeart.jsx';
import RivalAvatar from './RivalAvatar.jsx';
import { MenuGlyph } from './UiGlyphs.jsx';

/** Altura de cada degrau da trilha (px) e do cabeçalho de cada região. */
const STEP = 96;
const REGION_HEAD = 64;
/** Zigue-zague da trilha (posição horizontal de cada nó dentro da região, em %). */
const ZIGZAG = [50, 28, 70, 34, 66, 50];

/** Posições na trilha: o nó 1 embaixo, o chefe final no topo. */
function useTrail() {
  return useMemo(() => {
    const perRegion = REGION_HEAD + STEP * 6;
    const bottomPad = 40;
    const height = perRegion * REGIONS.length + bottomPad;
    const points = NODES.map((node) => {
      const r = node.region - 1;
      const fromBottom = r * perRegion + (node.slot - 1) * STEP + 64;
      return { ...node, x: ZIGZAG[node.slot - 1], y: height - fromBottom };
    });
    // as regiões cobrem a trilha inteira (a primeira desce até o fim)
    const regions = REGIONS.map((region, r) => ({
      ...region,
      top: height - bottomPad - (r + 1) * perRegion,
      height: perRegion + (r === 0 ? bottomPad : 0),
    }));
    return { height, points, regions };
  }, []);
}

/** Estado de cada nó: vencido, atual ou trancado. */
function nodeStatus(index, run) {
  if (run.cleared.includes(index)) return 'cleared';
  if (index === run.node) return 'current';
  return 'locked';
}

/** Marcas no feltro de cada região (posição em %, tamanho em px): fundo de copo e cinzas. */
const REGION_MARKS = [
  { rings: [[14, 22, 46], [82, 58, 54], [24, 86, 40]], ash: [[70, 18], [12, 64], [88, 88]] },
  { rings: [[78, 26, 50], [18, 52, 44], [66, 84, 58]], ash: [[30, 14], [86, 70], [10, 92]] },
  { rings: [[20, 30, 56], [84, 44, 42], [44, 80, 50]], ash: [[64, 12], [8, 70], [90, 92]] },
];

/** Polaroid inclina um pouco, alternando, como foto jogada na mesa. */
const TILT = [-4, 3, -2, 4, -3, 2];

function MapNode({ point, status, selected, onSelect }) {
  const rival = getRival(point.rivalId);
  const known = status !== 'locked';
  const photo = point.boss ? 64 : 50;
  return (
    <button
      type="button"
      className={`map-node map-polaroid map-node-${status} ${point.boss ? 'map-node-boss' : ''} ${selected ? 'map-node-selected' : ''}`}
      style={{ left: `${point.x}%`, top: point.y, rotate: `${TILT[point.slot - 1]}deg` }}
      onClick={() => onSelect(point.index)}
      aria-label={
        known
          ? `${point.index + 1}º nó: ${rival.name}${status === 'cleared' ? ' (vencido)' : ' (próximo)'}`
          : `${point.index + 1}º nó: trancado${point.boss ? ' (chefe)' : ''}`
      }
      aria-pressed={selected}
    >
      <span aria-hidden="true" className="polaroid-tape" />
      <span className="polaroid-photo" style={{ width: photo, height: photo }}>
        <span className={`block ${known ? '' : 'map-silhouette'}`}>
          <RivalAvatar rival={rival} mood={status === 'cleared' ? 'hurt' : 'idle'} size={photo} smoke={known} />
        </span>
        {!known && <span className="map-node-lock font-pixel">?</span>}
        {status === 'cleared' && <span aria-hidden="true" className="chalk-x" />}
      </span>
      <span className="polaroid-caption font-pixel">{known ? rival.name.toUpperCase() : '???'}</span>
      {point.boss && <span className="map-boss-tag font-pixel">CHEFE</span>}
    </button>
  );
}

/**
 * Mapa da campanha: trilha vertical de 18 nós (3 regiões × 6), de baixo para
 * cima. Os vencidos ganham um X de giz; o próximo pulsa. Tocar num nó mostra o
 * rival embaixo; SENTAR À MESA entra no próximo nó.
 */
export default function CampaignMap({ state, onEnter, onMenu, press }) {
  const { run } = state;
  const { height, points, regions } = useTrail();
  const [selected, setSelected] = useState(run.node);
  const scrollRef = useRef(null);
  const region = regionOf(run.node);

  // abre centrado no próximo nó
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const point = points[run.node];
    el.scrollTop = Math.max(0, point.y - el.clientHeight / 2);
  }, [points, run.node]);

  const point = points[selected] ?? points[run.node];
  const status = nodeStatus(point.index, run);
  const known = status !== 'locked';
  const rival = getRival(point.rivalId);
  const rules = known ? rivalRules(rival.id) : [];
  const path = points.map((p) => `${p.x},${p.y}`).join(' ');
  const donePath = points
    .filter((p) => p.index <= run.node)
    .map((p) => `${p.x},${p.y}`)
    .join(' ');

  return (
    <div className={`map-screen map-atmo-${region.atmosphere} fixed inset-0 z-[55] flex flex-col`} role="main" aria-label="Mapa da campanha">
      <header className="map-header relative z-10 shrink-0 px-3 pb-2" style={{ paddingTop: 'max(env(safe-area-inset-top), 10px)' }}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-pixel text-[7px] text-bone-400">
              NÓ {Math.min(run.node + 1, TOTAL_NODES)}/{TOTAL_NODES} · REGIÃO {region.id}
            </p>
            <h1 className="mt-1 truncate font-pixel text-[11px] leading-snug text-bone-50 text-shadow-pixel">{region.name}</h1>
          </div>
          <button type="button" onClick={onMenu} className="icon-btn shrink-0" aria-label="Voltar ao menu">
            <MenuGlyph size={20} />
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <HeartsBar current={state.hearts.player} max={MAX_HEARTS} pixel={2} label={`Você: ${state.hearts.player} de ${MAX_HEARTS} corações`} />
          <CoinCount value={state.coins.player} />
          <Hotbar relics={state.relics.player} size={24} press={press} label="Seus talismãs" />
        </div>
      </header>

      <div ref={scrollRef} className="map-scroll relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <div className="relative mx-auto w-full max-w-[460px]" style={{ height }}>
          {regions.map((r) => (
            <section
              key={r.id}
              className={`map-region map-region-${r.atmosphere} absolute inset-x-0`}
              style={{ top: r.top, height: r.height }}
              aria-label={r.name}
            >
              {REGION_MARKS[r.id - 1].rings.map(([x, y, d]) => (
                <span key={`ring-${x}-${y}`} aria-hidden="true" className="map-ring pointer-events-none absolute" style={{ left: `${x}%`, top: `${y}%`, width: d, height: d }} />
              ))}
              {REGION_MARKS[r.id - 1].ash.map(([x, y]) => (
                <span key={`ash-${x}-${y}`} aria-hidden="true" className="map-ash pointer-events-none absolute" style={{ left: `${x}%`, top: `${y}%` }} />
              ))}
              <div className="map-region-head absolute inset-x-3 top-2 text-center">
                <p className="font-pixel text-[9px] leading-snug text-bone-50 text-shadow-pixel">{r.name}</p>
                <p className="font-term text-[15px] leading-none text-bone-300">{r.subtitle}</p>
              </div>
            </section>
          ))}

          {/* trilha riscada a giz de sinuca (o filtro deixa o traço áspero) */}
          <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <filter id="chalk-rough" x="-5%" y="-1%" width="110%" height="102%">
                <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="grain" />
                <feDisplacementMap in="SourceGraphic" in2="grain" scale="0.8" />
              </filter>
            </defs>
            <g filter="url(#chalk-rough)">
              <polyline points={path} className="map-path" vectorEffect="non-scaling-stroke" />
              <polyline points={path} className="map-path map-path-echo" vectorEffect="non-scaling-stroke" transform="translate(0.4 1.5)" />
              <polyline points={donePath} className="map-path-done" vectorEffect="non-scaling-stroke" />
            </g>
          </svg>

          {points.map((p) => (
            <MapNode key={p.index} point={p} status={nodeStatus(p.index, run)} selected={p.index === selected} onSelect={setSelected} />
          ))}
        </div>
      </div>

      <footer className="map-footer relative z-10 shrink-0 px-3 pt-2.5" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}>
        <div className="flex gap-3">
          <div className={`avatar-frame shrink-0 self-start ${known ? '' : 'map-silhouette'}`}>
            <RivalAvatar rival={rival} mood={status === 'cleared' ? 'hurt' : 'smug'} size={48} smoke={known} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-pixel text-[7px] text-bone-400">
              {point.boss ? 'CHEFE DA REGIÃO' : `${point.slot}º DA REGIÃO`} · {status === 'cleared' ? 'VENCIDO' : status === 'current' ? 'PRÓXIMO' : 'TRANCADO'}
            </p>
            <p className="mt-1 truncate font-pixel text-[10px] text-bone-50">{known ? rival.name.toUpperCase() : '???'}</p>
            <p className="truncate font-term text-[16px] leading-none text-bone-300">
              {known ? `${rival.title} · ${rival.hearts}♥` : 'Ainda não chegou lá.'}
            </p>
          </div>
        </div>
        {known && (
          <ul className="mt-1.5 grid gap-0.5 font-term text-[16px] leading-[1.05] text-bone-200">
            <li>{rivalBlurb(rival.id)}</li>
            {rules.map((line) => (
              <li key={line} className="text-brass-300">
                • {line}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-1.5 font-pixel text-[7px] leading-relaxed text-bone-400">VENCER: +2♥ · CHEFE: CURA TUDO</p>
        <button type="button" data-tone="play" className="btn-pixel mt-2 w-full text-[11px]" onClick={onEnter}>
          SENTAR À MESA · {getRival(points[run.node].rivalId).name.toUpperCase()}
        </button>
      </footer>
    </div>
  );
}
