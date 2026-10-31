import { memo, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { HEAL_AFTER_NODE, REGIONS } from '../data/campaign.js';
import { modeBadge, modeOf } from '../data/difficulty.js';
import { getRival, rivalFor } from '../data/rivals.js';
import {
  COIN_EVENT_MAX,
  COIN_EVENT_MIN,
  FLOORS,
  NODE_LABEL,
  availableNodes,
  campaignOf,
  mapRegionId,
  mixSeed,
} from '../engine/campaignMap.js';
import { rivalBlurb, shortRivalName } from '../engine/rivalInfo.js';
import { relicSlotsFor } from '../engine/loadout.js';
import { maletaOf } from '../data/maletas.js';
import { challengeOf } from '../data/meta.js';
import BotecoBackdrop from './BotecoBackdrop.jsx';
import CoinCount from './CoinCount.jsx';
import Hotbar from './Hotbar.jsx';
import { HeartsBar } from './PixelHeart.jsx';
import RivalAvatar from './RivalAvatar.jsx';
import { MenuGlyph } from './UiGlyphs.jsx';
import { CorvoSprite, TiaoMoedasSprite } from './art/NecroticArt.jsx';
import { ValtinhoSprite } from './art/SceneArt.jsx';
import { EventPlaqueIcon, TableModIcon } from './art/TableModArt.jsx';
import { tableModifierOf } from '../data/tableModifiers.js';
import PixelCanvas from './PixelCanvas.jsx';
import {
  ALLEY_SIZE,
  CAP_SIZE,
  COINS_SIZE,
  CRATE_SIZE,
  DOOR_SIZE,
  STAPLE_SIZE,
  paintAlley,
  paintBlackDoor,
  paintBottleCap,
  paintCoinStack,
  paintCrate,
  paintStaple,
} from './art/mapPixels.js';

/**
 * Versão 2.0: os nós viram objetos em pixel art no caderno de fiado (art/mapPixels.js): o
 * engradado da loja (treme), o beco do [?] (chuva e neblina por cima), a pilha de moedas do
 * Seu Tião e a porta do beco; as mesas comuns são tampinhas amassadas com o rival no miolo.
 */
const OBJ_PX = 1.5;
const STOP_OBJ = {
  shop: () => <PixelCanvas cacheKey="mapa-engradado" paint={paintCrate} w={CRATE_SIZE.w} h={CRATE_SIZE.h} scale={OBJ_PX} />,
  event: () => (
    <>
      <PixelCanvas cacheKey="mapa-beco" paint={paintAlley} w={ALLEY_SIZE.w} h={ALLEY_SIZE.h} scale={OBJ_PX} />
      <span aria-hidden="true" className="web-obj-rain" />
      <span aria-hidden="true" className="web-obj-fog" />
    </>
  ),
  coins: () => <PixelCanvas cacheKey="mapa-moedas" paint={paintCoinStack} w={COINS_SIZE.w} h={COINS_SIZE.h} scale={OBJ_PX} />,
  black: () => <PixelCanvas cacheKey="mapa-porta" paint={paintBlackDoor} w={DOOR_SIZE.w} h={DOOR_SIZE.h} scale={OBJ_PX} />,
};

/** O grampo enferrujado da polaroide do chefe. */
const Staple = ({ side }) => (
  <PixelCanvas cacheKey="mapa-grampo" paint={paintStaple} w={STAPLE_SIZE.w} h={STAPLE_SIZE.h} scale={OBJ_PX} className={`polaroid-staple polaroid-staple-${side}`} />
);

/** Altura de cada andar (px), cabeçalho de cada região e folga embaixo. */
const STEP = 98;
const HEAD = 66;
const BOTTOM = 26;
const PER_REGION = HEAD + STEP * FLOORS;
/** Esquerda, centro e direita (em % da largura). */
const LANE_X = [19, 50, 81];

/** Posição de cada nó (o andar 1 da região 1 embaixo, o Comendador no topo) e as ligações. */
function layoutOf(campaign) {
  const height = BOTTOM + PER_REGION * campaign.regions.length;
  const points = new Map();
  for (const region of campaign.regions) {
    const r = region.id - 1;
    for (const node of region.nodes) {
      // nos andares do meio cada nó sai um pouco do trilho (a teia fica orgânica, fixa pela semente)
      const middle = node.floor > 1 && node.floor < FLOORS;
      const h = mixSeed(campaign.seed, node.id);
      const jx = middle ? (h % 9) - 4 : 0;
      const jy = middle ? ((h >>> 8) % 15) - 7 : 0;
      // a placa da região fica embaixo (é por onde você entra), os andares sobem a partir dela
      const fromBottom = BOTTOM + r * PER_REGION + HEAD + STEP * (node.floor - 0.5);
      points.set(node.id, { node, x: LANE_X[node.lane] + jx, y: Math.round(height - fromBottom + jy) });
    }
  }
  const regions = campaign.regions.map((region, r) => ({
    ...REGIONS[region.id - 1],
    top: height - BOTTOM - (r + 1) * PER_REGION,
    height: PER_REGION + (r === 0 ? BOTTOM : 0),
  }));
  const edges = [];
  for (const region of campaign.regions) {
    for (const node of region.nodes) for (const to of node.next) edges.push([node.id, to]);
    // do chefe derrotado sobe para a entrada da próxima região
    if (region.id < campaign.regions.length) edges.push([region.boss, campaign.regions[region.id].entry]);
  }
  return { height, points, regions, edges };
}

/** Para onde a teia ainda leva a partir dos nós abertos. */
function reachableFrom(campaign, open) {
  const seen = new Set();
  const stack = [...open];
  while (stack.length) {
    const id = stack.pop();
    if (seen.has(id)) continue;
    seen.add(id);
    const node = campaign.byId.get(id);
    if (node.boss && node.region < campaign.regions.length) stack.push(campaign.regions[node.region].entry);
    else stack.push(...node.next);
  }
  return seen;
}

/** open = dá para entrar agora · done = já passou · ahead = mais adiante · gone = ficou fora do caminho. */
function statusesOf(state, campaign) {
  const open = availableNodes(state);
  const done = new Set(state.run.cleared);
  const ahead = reachableFrom(campaign, open);
  const openSet = new Set(open);
  const status = new Map();
  for (const id of campaign.byId.keys()) {
    if (done.has(id)) status.set(id, 'done');
    else if (openSet.has(id)) status.set(id, 'open');
    else if (ahead.has(id)) status.set(id, 'ahead');
    else status.set(id, 'gone');
  }
  return { status, open };
}

const STOP_ART = {
  shop: (cls) => <ValtinhoSprite className={cls} />,
  black: (cls) => <CorvoSprite className={cls} />,
  coins: (cls) => <TiaoMoedasSprite className={cls} />,
  event: (cls) => <EventPlaqueIcon className={cls} />,
};
const STOP_CAPTION = { shop: 'LOJA', black: 'BECO', coins: 'SEU TIÃO', event: '???' };
const STATUS_LABEL = { open: 'ABERTO', done: 'JÁ PASSOU', ahead: 'MAIS ADIANTE', gone: 'FORA DO CAMINHO' };

/**
 * Quem senta numa mesa só aparece quando o caminho até ela abre (ou depois de vencida).
 * Até lá a polaroid mostra "?" (o chefe, só a silhueta), também na região em que você está.
 */
const revealed = (status) => status === 'open' || status === 'done';

/** Um nó da teia: polaroid do rival (mesa) ou ficha com o NPC (loja, beco, Seu Tião). */
const WebNode = memo(function WebNode({ point, status, known, selected, tilt, onSelect }) {
  const { node } = point;
  const fight = node.type === 'combat' || node.type === 'boss';
  const rival = fight ? getRival(node.rivalId) : null;
  const mod = tableModifierOf(node.mod);
  const label = fight
    ? `${node.boss ? 'Chefe' : 'Mesa'}: ${known ? rival.name : 'rival desconhecido'}${mod ? `, regra da mesa: ${mod.name}` : ''}`
    : NODE_LABEL[node.type];
  const cls = `web-node web-${status} ${selected ? 'web-selected' : ''}`;
  if (fight && !node.boss) {
    // Versão 2.0: mesa comum: a tampinha amassada, com o rival no miolo
    const variant = [...node.id].reduce((a, ch) => a + ch.charCodeAt(0), 0) % 5;
    return (
      <button
        type="button"
        className={`${cls} web-cap`}
        style={{ left: `${point.x}%`, top: point.y, rotate: `${tilt * 2}deg` }}
        onClick={() => onSelect(node.id)}
        aria-label={`${label}, andar ${node.floor} (${STATUS_LABEL[status].toLowerCase()})`}
        aria-pressed={selected}
      >
        <span className="web-cap-art">
          <PixelCanvas cacheKey={`mapa-tampinha-${variant}`} paint={() => paintBottleCap(variant)} w={CAP_SIZE.w} h={CAP_SIZE.h} scale={OBJ_PX} />
          <span className="web-cap-face" style={{ rotate: `${-tilt * 2}deg` }}>
            {known ? <RivalAvatar rival={rival} mood={status === 'done' ? 'hurt' : 'idle'} size={30} smoke={false} /> : <span className="map-node-lock font-pixel">?</span>}
          </span>
          {status === 'done' && <span aria-hidden="true" className="chalk-x" />}
        </span>
        <span className="web-cap-caption font-pixel">{known ? shortRivalName(rival.name) : '???'}</span>
        {mod && (
          <span aria-hidden="true" className="map-mod-badge">
            <TableModIcon icon={mod.icon} className="h-full w-full" />
          </span>
        )}
      </button>
    );
  }
  if (fight) {
    const photo = node.boss ? 56 : 40;
    return (
      <button
        type="button"
        className={`${cls} map-polaroid web-fight ${node.boss ? 'map-node-boss' : ''}`}
        style={{ left: `${point.x}%`, top: point.y, rotate: `${tilt}deg` }}
        onClick={() => onSelect(node.id)}
        aria-label={`${label}, andar ${node.floor} (${STATUS_LABEL[status].toLowerCase()})`}
        aria-pressed={selected}
      >
        <span aria-hidden="true" className="polaroid-tape" />
        <Staple side="l" />
        <Staple side="r" />
        <span className="polaroid-photo" style={{ width: photo, height: photo }}>
          {known ? (
            <RivalAvatar rival={rival} mood={status === 'done' ? 'hurt' : 'idle'} size={photo} smoke={false} />
          ) : node.boss ? (
            <span className="block map-silhouette">
              <RivalAvatar rival={rival} mood="idle" size={photo} smoke={false} />
            </span>
          ) : (
            <span className="map-node-lock font-pixel">?</span>
          )}
          {status === 'done' && <span aria-hidden="true" className="chalk-x" />}
        </span>
        <span className="polaroid-caption font-pixel">{known ? rival.name.toUpperCase() : '???'}</span>
        {node.boss && <span className="map-boss-tag font-pixel">CHEFE</span>}
        {/* Patch 0.9.4: selo da regra de mesa gravado no canto da polaroid */}
        {mod && (
          <span aria-hidden="true" className="map-mod-badge">
            <TableModIcon icon={mod.icon} className="h-full w-full" />
          </span>
        )}
      </button>
    );
  }
  return (
    <button
      type="button"
      className={`${cls} web-stop web-stop-${node.type} web-stop-obj`}
      style={{ left: `${point.x}%`, top: point.y }}
      onClick={() => onSelect(node.id)}
      aria-label={`${label}, andar ${node.floor} (${STATUS_LABEL[status].toLowerCase()})`}
      aria-pressed={selected}
    >
      {/* Versão 2.0: a etiqueta de papel em cima e o objeto em pixel art */}
      <span className="web-tag font-pixel">{STOP_CAPTION[node.type]}</span>
      <span className="web-obj">{STOP_OBJ[node.type]?.() ?? STOP_ART[node.type]('web-stop-art')}</span>
      {status === 'done' && <span aria-hidden="true" className="chalk-x" />}
    </button>
  );
});

/** Texto e botão do rodapé para o nó escolhido. */
function NodeDetail({ node, status, known, farRegion, mode, closed = false, onEnter }) {
  const unknownLine = farRegion ? 'Ainda não chegou nessa região.' : 'Só aparece quando o caminho até aqui abrir.';
  const fight = node.type === 'combat' || node.type === 'boss';
  // nas Peças Pretas o rodapé mostra o baralho, os talismãs e os corações do modo difícil
  const rival = fight ? rivalFor(node.rivalId, mode) : null;
  const open = status === 'open';
  let art;
  let title;
  let line;
  let notes;
  let action;
  let kind = NODE_LABEL[node.type];
  if (fight) {
    if (known) kind = node.boss ? 'CHEFE' : 'MESA';
    art = (
      <div className={`avatar-frame shrink-0 self-start ${known ? '' : 'map-silhouette'}`}>
        <RivalAvatar rival={rival} mood={status === 'done' ? 'hurt' : 'smug'} size={46} smoke={known} />
      </div>
    );
    title = known ? rival.name.toUpperCase() : '???';
    line = known ? `${rival.title} · ${rival.hearts}♥` : unknownLine;
    // só o jeito de jogar dele (sem nível de IA nem pedras de grife)
    notes = known ? [rivalBlurb(rival.id)] : [];
    action = `SENTAR À MESA · ${rival.name.toUpperCase()}`;
  } else if (node.type === 'shop') {
    art = <ValtinhoSprite className="h-12 w-12 shrink-0" />;
    title = 'LOJA DO VALTINHO';
    line = 'Talismãs e pedras de grife. Desvio sem luta.';
    notes = closed ? ['Só no Osso: a loja está de portas fechadas. Você passa reto.'] : ['O balcão de sempre: compre, venda a 50% e reembaralhe a vitrine.'];
    action = closed ? 'PASSAR RETO (FECHADA)' : 'ENTRAR NA LOJA';
  } else if (node.type === 'black') {
    art = <CorvoSprite className="h-12 w-12 shrink-0" />;
    title = 'MERCADO NEGRO';
    line = 'O Corvo da Madrugada, no beco escuro.';
    notes = closed ? ['Só no Osso: o beco está vazio esta noite. Você passa reto.'] : ['Só talismãs Necróticos, de $18 a $26. Fortes, e cobram o preço deles.'];
    action = closed ? 'PASSAR RETO (FECHADO)' : 'ENTRAR NO BECO';
  } else if (node.type === 'event') {
    art = <EventPlaqueIcon className="h-12 w-12 shrink-0" />;
    title = 'IMPREVISTO DA NOITE [?]';
    line = 'Um imprevisto da noite.';
    notes = ['Duas escolhas: arriscar ou ficar na sua. O que é, só se descobre entrando.'];
    action = 'ENCARAR O IMPREVISTO';
  } else {
    art = <TiaoMoedasSprite className="h-12 w-12 shrink-0" />;
    title = 'SEU TIÃO DAS MOEDAS';
    line = 'Um velho no engradado de cerveja.';
    notes = [`Gorjeta na hora: de $${COIN_EVENT_MIN} a $${COIN_EVENT_MAX}. Sem mesa, sem risco.`];
    action = 'SENTAR COM O SEU TIÃO';
  }
  return (
    <>
      <div className="flex gap-3">
        {art}
        <div className="min-w-0 flex-1">
          <p className="font-pixel text-[7px] text-bone-400">
            ANDAR {node.floor}/{FLOORS} · {kind} · {STATUS_LABEL[status]}
          </p>
          <p className="mt-1 truncate font-pixel text-[10px] text-bone-50">{title}</p>
          <p className="truncate font-term text-[16px] leading-none text-bone-300">{line}</p>
        </div>
      </div>
      {/* Patch 0.9.4: a regra de mesa do confronto, em âmbar */}
      {fight && tableModifierOf(node.mod) && (
        <div className="map-mod-banner mt-1.5" role="note">
          <TableModIcon icon={tableModifierOf(node.mod).icon} className="map-mod-banner-icon" />
          <div className="min-w-0">
            <p className="map-mod-banner-name">REGRA DA MESA: {tableModifierOf(node.mod).name.toUpperCase()}</p>
            <p className="map-mod-banner-rule">{tableModifierOf(node.mod).rule}</p>
          </div>
        </div>
      )}
      {notes.length > 0 && !(fight && node.mod) && (
        <ul className="web-notes mt-1.5 grid gap-0.5 font-term text-[15px] leading-[1.05] text-bone-200">
          {notes.map((n, i) => (
            <li key={n} className={i > 0 && fight ? 'text-brass-300' : ''}>
              {n}
            </li>
          ))}
        </ul>
      )}
      {open ? (
        <button type="button" data-tone="play" className="btn-pixel mt-2 w-full text-[11px]" onClick={() => onEnter(node.id)}>
          {action}
        </button>
      ) : (
        <p className="web-hint mt-2 font-pixel text-[8px] leading-relaxed">TOQUE NUM CAMINHO ACESO PARA SEGUIR</p>
      )}
    </>
  );
}

/**
 * Mapa da campanha em teia (Patch 0.6.1): as 3 regiões empilhadas, do Boteco (embaixo)
 * ao Submundo (no topo). Cada região sobe 6 andares: entrada, 4 andares de bifurcações
 * (mesas, Loja do Valtinho, Mercado Negro, Seu Tião) e o chefe. Os caminhos abertos
 * pulsam; o que você já percorreu fica riscado a giz; o que ficou para trás apaga. O rival
 * de cada mesa só aparece quando o caminho até ela abre (antes disso, "?").
 * Tocar num nó mostra o que tem nele; o botão do rodapé entra no nó escolhido.
 */
export default function CampaignMap({ state, onEnter, onMenu, press }) {
  const campaign = campaignOf(state);
  const { height, points, regions, edges } = useMemo(() => layoutOf(campaign), [campaign]);
  const { status, open } = useMemo(() => statusesOf(state, campaign), [state, campaign]);
  const [picked, setPicked] = useState(null);
  const scrollRef = useRef(null);
  const regionId = mapRegionId(state);
  const region = REGIONS[regionId - 1];
  const selectedId = picked && points.has(picked) ? picked : (open[0] ?? state.run.node ?? campaign.regions[0].entry);
  const selected = points.get(selectedId).node;
  const focusY = open.length ? Math.round(open.reduce((sum, id) => sum + points.get(id).y, 0) / open.length) : 0;
  const floorNow = open.length ? points.get(open[0]).node.floor : FLOORS;

  // abre com os próximos caminhos no meio da tela
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = Math.max(0, focusY - el.clientHeight * 0.55);
  }, [focusY]);

  const path = state.run.path;
  const stepOf = new Map(path.map((id, i) => [id, i]));
  const edgeClass = ([a, b]) => {
    if (stepOf.has(a) && stepOf.get(b) === stepOf.get(a) + 1) return 'web-edge-done';
    if (a === state.run.node && status.get(b) === 'open') return 'web-edge-open';
    if (status.get(a) === 'gone' || status.get(b) === 'gone') return 'web-edge-gone';
    return 'web-edge';
  };
  const curve = ([a, b]) => {
    const p = points.get(a);
    const q = points.get(b);
    const bend = ((mixSeed(campaign.seed, `${a}>${b}`) % 7) - 3) * 0.8;
    return `M${p.x} ${p.y} Q${(p.x + q.x) / 2 + bend} ${(p.y + q.y) / 2} ${q.x} ${q.y}`;
  };

  return (
    <div className={`map-screen map-atmo-${region.atmosphere} fixed inset-0 z-[55] flex flex-col`} role="main" aria-label="Mapa da campanha">
      <header className="map-header relative z-10 shrink-0 px-3 pb-2" style={{ paddingTop: 'max(env(safe-area-inset-top), 10px)' }}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-pixel text-[7px] text-bone-400">
              {state.maleta && state.maleta !== 'classica' && <span className="map-maleta-badge">{maletaOf(state.maleta).short} · </span>}
              {modeBadge(state.mode) && <span className={state.mode === 'inferno' ? 'map-inferno-badge' : 'map-hard-badge'}>{modeBadge(state.mode)}</span>}
              {state.challenge && <span className="map-challenge-badge">{challengeOf(state.challenge).name.toUpperCase()} · </span>}
              REGIÃO {regionId}/{REGIONS.length} · ANDAR {floorNow}/{FLOORS}
              {open.length > 1 ? ` · ${open.length} CAMINHOS` : ''}
            </p>
            <h1 className="mt-1 truncate font-pixel text-[11px] leading-snug text-bone-50 text-shadow-pixel">{region.name}</h1>
          </div>
          <button type="button" onClick={onMenu} className="icon-btn shrink-0" aria-label="Voltar ao menu">
            <MenuGlyph size={20} />
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <HeartsBar current={state.hearts.player} max={state.maxHearts.player} pixel={2} label={`Você: ${state.hearts.player} de ${state.maxHearts.player} corações`} />
          <CoinCount value={state.coins.player} />
          <Hotbar relics={state.relics.player} slots={relicSlotsFor(state)} size={24} press={press} label="Seus talismãs" />
        </div>
      </header>

      <div ref={scrollRef} className="map-scroll relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <div className="map-paper relative mx-auto w-full max-w-[460px]" style={{ height }}>
          {/* Versão 1.5: a teia desenhada numa folha de papel de pão (manchas de copo, dobras) */}
          <BotecoBackdrop scene="map" seed={campaign.seed % 997} className="absolute inset-0" />
          {regions.map((r) => (
            <section
              key={r.id}
              className={`map-region map-region-${r.atmosphere} absolute inset-x-0 ${r.id === regionId ? '' : 'web-region-far'}`}
              style={{ top: r.top, height: r.height }}
              aria-label={r.name}
            />
          ))}

          {/* caminhos riscados a caneta esferográfica azul (o filtro deixa o traço falhado) */}
          <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <filter id="chalk-rough" x="-5%" y="-1%" width="110%" height="102%">
                <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="grain" />
                <feDisplacementMap in="SourceGraphic" in2="grain" scale="0.8" />
              </filter>
            </defs>
            <g filter="url(#chalk-rough)">
              {edges.map((edge) => (
                <path key={`${edge[0]}>${edge[1]}`} d={curve(edge)} className={edgeClass(edge)} vectorEffect="non-scaling-stroke" />
              ))}
            </g>
          </svg>

          {regions.map((r) => (
            <div key={`head-${r.id}`} className="map-region-head web-region-head absolute inset-x-3 text-center" style={{ top: r.top + PER_REGION - HEAD + 8 }}>
              <p className="font-pixel text-[9px] leading-snug text-bone-50 text-shadow-pixel">{r.name}</p>
              <p className="font-term text-[15px] leading-none text-bone-300">{r.subtitle}</p>
            </div>
          ))}

          {[...points.values()].map((p) => (
            <WebNode
              key={p.node.id}
              point={p}
              status={status.get(p.node.id)}
              known={revealed(status.get(p.node.id))}
              selected={p.node.id === selectedId}
              tilt={(mixSeed(campaign.seed, `tilt-${p.node.id}`) % 7) - 3}
              onSelect={setPicked}
            />
          ))}
        </div>
      </div>

      <footer className="map-footer relative z-10 shrink-0 px-3 pt-2.5" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}>
        <NodeDetail
          node={selected}
          status={status.get(selected.id)}
          known={revealed(status.get(selected.id))}
          farRegion={selected.region > regionId}
          mode={state.mode}
          closed={state.challenge === 'soNoOsso' && (selected.type === 'shop' || selected.type === 'black')}
          onEnter={onEnter}
        />
        <p className="mt-1.5 font-pixel text-[7px] leading-relaxed text-bone-400">
          {modeOf(state.mode).healPerTable
            ? `VENCER MESA: +${modeOf(state.mode).healPerTable}♥ (CHEFE TAMBÉM) · LOJA E BECO SÃO OPCIONAIS`
            : `VENCER MESA: +${HEAL_AFTER_NODE}♥ · CHEFE: CURA TUDO · LOJA E BECO SÃO OPCIONAIS`}
        </p>
      </footer>
    </div>
  );
}
