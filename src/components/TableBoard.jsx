import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { BASE_UNIT_PX, WORLD_COLS, computeBoardLayout, computeCamera, computeWorldSize } from '../engine/boardLayout.js';
import { boardTilesInOrder } from '../engine/dominoLogic.js';
import DominoTile from './DominoTile.jsx';
import BoardZoom from './BoardZoom.jsx';
import LampRig from './LampRig.jsx';
import TableCandles from './TableCandles.jsx';
import FxLayer from './FxLayer.jsx';
import NoMovesBanner from './NoMovesBanner.jsx';
import { tableModifierOf } from '../data/tableModifiers.js';
import { TableModIcon } from './art/TableModArt.jsx';
import { startTileLighting } from './tileLighting.js';
import BotecoBackdrop from './BotecoBackdrop.jsx';
import { BoneyardPile, EndsSum } from './BoneyardPile.jsx';
import PixelCanvas from './PixelCanvas.jsx';
import { LupaGlyph } from './UiGlyphs.jsx';
import { LAND, landSpanFor, landTable } from './seatGeometry.js';
import {
  APRON_H,
  LOCK_SIZE,
  RAIL_WOOD_W,
  TABLE_PX,
  paintApron,
  paintLock,
  paintTablePlane,
} from './art/tablePixels.js';

/**
 * Margem interna do feltro: a madeira do aro pintado (Versão 2.0, art/tablePixels.js) e uma
 * folga; as pedras da ponta podem encostar na tabela de feltro, como numa mesa de verdade.
 */
const BOARD_PADDING = Math.round(RAIL_WOOD_W * TABLE_PX) + 2;
/** O tamanho da pintura da mesa anda de 8 em 8 pixels (a barra do Safari não repinta a mesa). */
const PLANE_STEP = 8;
const planePixels = (px) => Math.max(PLANE_STEP * 4, Math.round(px / TABLE_PX / PLANE_STEP) * PLANE_STEP);
/** A frente da mesa (a saia de madeira embaixo do aro de perto), em px de CSS. */
const APRON_PX = APRON_H * TABLE_PX;
/**
 * Versão 2.0: a mesa em perspectiva. O plano do feltro tomba TILT graus para trás a partir da
 * beirada de baixo. Versão 2.6.1: perspectiva fixa de 800 px e só 8° de tombo (antes 36°, com a
 * perspectiva crescendo com a tela): o trapézio de "pista de boliche" esticava o fundo e
 * encolhia as pedras de lá. Agora o feltro fica quase de frente, as pedras do fundo quase do
 * tamanho das de perto, e a moldura de madeira aparece dos dois lados.
 * Para o fundo do feltro chegar no alto da tela, o plano é mais alto que a área (planeHeight).
 */
const TILT = 8;
const PERSPECTIVE_PX = 800;
/**
 * A mesa na beirada de perto tem WIDEN × a largura da tela: embaixo (atrás da sua mão) o aro
 * fica para fora e só o feltro aparece; lá no fundo, onde a mesa afina, a moldura de madeira
 * entra na tela dos dois lados.
 */
const WIDEN = 1.12;
/**
 * Faixa de cima da tela (px) que é do dorme, da soma e dos selos: as pedras ficam abaixo dela
 * (versão 2.6.1: o dorme num bloco só, mais baixo, devolve 14 px para as pedras).
 */
const HUD_TOP_PX = 110;
/** Quanto da mesa passa do pé da tela (a beirada de perto fica para fora, como quem está sentado nela). */
const NEAR_HIDE = 44;
/** Versão 2.6.1: o respiro entre o bloco do dorme e a moldura de madeira, à direita (px). */
const DORME_GAP = 12;
/** A altura (px, do alto do feltro) onde o bloco do dorme encosta na moldura. */
const DORME_Y = 40;
const SIN = Math.sin((TILT * Math.PI) / 180);
const COS = Math.cos((TILT * Math.PI) / 180);
/**
 * Quanto do plano (a partir da beirada de perto) fica embaixo de `screen` px da tela: a conta
 * da perspectiva, d = S·P / (P·cos − S·sen). Também dá a altura do plano que cobre a tela.
 */
const planeSpanFor = (screen) => Math.max(0, Math.round((screen * PERSPECTIVE_PX) / (PERSPECTIVE_PX * COS - screen * SIN)));
const planeHeightFor = planeSpanFor;
/** Quanto encolhe (na tela) o que está a `d` px da beirada de perto, no plano. */
const depthScale = (d) => PERSPECTIVE_PX / (PERSPECTIVE_PX + d * SIN);
/**
 * Versão 2.9, a mesa deitada (16:9), como no desenho de referência: a sala inteira na tela e a
 * mesa no meio (seatGeometry.js: LAND), vista de cima e de frente, com a beirada de lá mais
 * estreita, a saia de madeira e os pés aparecendo embaixo. O rival senta atrás da beirada de lá.
 */

/** O tampo da mesa deitada: o plano, a faixa das pedras e o quanto a sua mão cobre da beirada de perto. */
function landGeometry(room, handZone) {
  const t = landTable(room.width, room.height);
  const planeHeight = landSpanFor(t.yNear - t.yFar);
  // a sua mão cobre o meio da beirada de perto: as pedras da mesa param acima do alto das pedras
  // do leque (a dica a giz, por cima dele, pode ficar no feltro)
  const overlap = Math.max(0, t.yNear - (room.height - handZone + 26));
  // versão 2.18: a corrente começa no meio do tampo: só uma faixa fina fica reservada para a mão
  const reserve = Math.min(Math.round(planeHeight * 0.1), landSpanFor(overlap));
  return {
    ...t,
    planeWidth: t.width,
    planeHeight,
    areaSide: BOARD_PADDING,
    areaBottom: BOARD_PADDING + reserve,
    style: {
      left: Math.round((room.width - t.width) / 2),
      width: t.width,
      bottom: room.height - t.yNear,
      height: planeHeight,
      transform: `perspective(${LAND.persp}px) rotateX(${LAND.tilt}deg)`,
    },
  };
}

/** Folga visual entre pedras vizinhas, em px do mundo (antes da câmera). */
const TILE_INSET = 1.5;
const B = BASE_UNIT_PX;

/**
 * Versão 1.4: selo da regra do rival (engine/rivalInfo.js: rivalRuleBadge), um lacre vermelho
 * ao lado do selo da regra de mesa: o número da rifa, quantas vezes faltam para os juros, quanto
 * a Mesa de Luxo já cobrou... Tocar abre o lembrete (some sozinho em 5 s).
 */
const RivalRuleSeal = memo(function RivalRuleSeal({ rule, shifted = false }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return undefined;
    const timer = setTimeout(() => setOpen(false), 5000);
    return () => clearTimeout(timer);
  }, [open]);
  if (!rule) return null;
  return (
    <div className={`rival-rule absolute z-[8] ${shifted ? 'is-shifted' : ''}`}>
      <button
        type="button"
        data-rival-rule={rule.id}
        className={`rival-rule-seal font-pixel ${open ? 'is-open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`Regra do rival: ${rule.label}. Toque para ler`}
      >
        <span key={String(rule.value)} className="rival-rule-value">
          {rule.value}
        </span>
      </button>
      {open && (
        <div className="table-mod-tip rival-rule-tip" role="status">
          <p className="table-mod-tip-name">REGRA DO RIVAL · {rule.label}</p>
          <p className="table-mod-tip-rule">{rule.text}</p>
        </div>
      )}
    </div>
  );
});

/**
 * Selo da Regra de Mesa (Patch 0.9.4) no canto de cima, à esquerda, do feltro: o ícone num
 * lacre de cera âmbar. Tocar abre um lembrete curto da regra (some sozinho em 5 s).
 */
const TableModSeal = memo(function TableModSeal({ id }) {
  const mod = tableModifierOf(id);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return undefined;
    const timer = setTimeout(() => setOpen(false), 5000);
    return () => clearTimeout(timer);
  }, [open]);
  if (!mod) return null;
  return (
    <div className="table-mod absolute z-[8]">
      <button
        type="button"
        data-table-mod={mod.id}
        className={`table-mod-seal ${open ? 'is-open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`Regra da mesa: ${mod.name}. Toque para ler`}
      >
        <TableModIcon icon={mod.icon} className="h-5 w-5" />
      </button>
      {open && (
        <div className="table-mod-tip" role="status">
          <p className="table-mod-tip-name">REGRA DA MESA · {mod.name.toUpperCase()}</p>
          <p className="table-mod-tip-rule">{mod.rule}</p>
        </div>
      )}
    </div>
  );
});

function useElementSize() {
  const ref = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, size];
}

const SIDE_LABEL = { left: 'esquerda', right: 'direita', root: 'centro' };

/** Marca da ponta: congelada pelo seu Chumbo, travada pelo Chumbo do rival ou curinga do Cristal. */
const MARK_CLASS = { frozen: 'end-badge-frozen', blocked: 'end-badge-blocked', wild: 'end-badge-wild', both: 'end-badge-wild', drunk: 'end-badge-drunk' };
const MARK_LABEL = {
  frozen: ' (congelada para o rival)',
  blocked: ' (travada nesta vez)',
  wild: ' (curinga na sua jogada)',
  both: ' (curinga na sua jogada)',
  drunk: ' (número trocado pela Mesa Bêbada)',
};

/** Caixa (px do mundo) de uma pedra de `unit` px centrada no retângulo r (em unidades). */
function tileBox(r, orientation, unit) {
  const w = orientation === 'horizontal' ? unit * 2 : unit;
  const h = orientation === 'horizontal' ? unit : unit * 2;
  return { left: r.x * B + (r.w * B - w) / 2, top: r.y * B + (r.h * B - h) / 2, width: w, height: h };
}

/**
 * Mesa em feltro verde-musgo. As pedras ficam num "mundo" em unidades
 * (engine/boardLayout.js), com posição fixa desde que são jogadas, e uma
 * câmera automática enquadra a jogada: bem perto no começo da rodada,
 * afastando conforme a trilha cresce.
 *
 * Patch 0.5.4 (Safari iOS): React.memo (moedas, dica e falas não redesenham a mesa),
 * `contain: layout paint` no feltro (.felt-table) e só as duas pontas abertas animam
 * reflexo/material; o miolo da mesa fica em gradiente estático.
 */
function TableBoard({
  board,
  roundKey,
  playableSides = [],
  onPlaySide,
  dimmed = false,
  previewDouble = false,
  frameRef,
  endMarks = {},
  felt,
  decor = [],
  atmosphere = 'boteco',
  incoming = null,
  noMoves = false,
  boneyardCount = null,
  tableMod = null,
  boneyardHidden = false,
  rivalRule = null,
  // Versão 2.0: a mesa vai até o pé da tela; a sua mão fica deitada nela, na faixa de baixo
  handZone = 0,
  endsSum = null,
  canDraw = false,
  drawUrge = false,
  onDraw,
  drawsUsed = 0,
  drawCost = null,
  // versão 2.6: a hora da batida: a última pedra brilha na cor de quem venceu
  finaleId = null,
  finaleTone = 'player',
  // versão 2.9: a mesa deitada, com o rival sentado do outro lado (RivalSeat)
  landscape = false,
  // versão 2.13: 'lamp' (a lâmpada pendurada) ou 'candles' (as 4 velas do Dono da Noite)
  lighting = 'lamp',
  // versão 2.13: a sala em volta da mesa (o cenário da região)
  room: roomScene = null,
  // versão 2.14: o dorme e as pontas vão para a lousa do armarinho da direita (PlayerRack)
  dormeInHud = false,
}) {
  const candles = lighting === 'candles';
  const [zoomed, setZoomed] = useState(false);
  const closeZoom = useCallback(() => setZoomed(false), []);
  const [areaRef, size] = useElementSize();
  // Versão 2.0: o tamanho da área da mesa decide a altura do plano inclinado
  const [roomRef, room] = useElementSize();
  // com a mão em cima da mesa (handZone), a mesa desce até o pé da tela e a saia não aparece
  const toBottom = handZone > 0;
  // a mesa toda (com a mão em cima) passa NEAR_HIDE px do pé da tela; sem a mão, termina na saia
  const apron = toBottom ? -NEAR_HIDE : APRON_PX;
  const span = room.height - apron; // altura da tela que o plano cobre, da beirada de perto ao fundo
  // versão 2.9: deitada, a mesa é a do desenho de referência (no meio da sala, landGeometry)
  const land = landscape && room.height > 0 && room.width > 0 ? landGeometry(room, handZone) : null;
  const planeHeight = land ? land.planeHeight : span > 0 && room.height > 0 ? planeHeightFor(span) : 0;
  const reserve = toBottom && room.height > 0 ? planeSpanFor(Math.min(handZone, room.height * 0.6) + NEAR_HIDE) : 0;
  // a mesa é mais larga que a tela; a área das pedras fica só na parte que aparece: a largura
  // visível na altura da beirada de cima da sua mão (onde a perspectiva aumenta mais)
  const planeWidth = land ? land.planeWidth : Math.round(room.width * WIDEN);
  const nearScale = depthScale(reserve);
  // versão 2.6.1: com a mesa quase de frente, a faixa das pedras para 12 px antes das bordas da tela
  const areaWidth = Math.max(120, Math.min(planeWidth - BOARD_PADDING * 2, Math.round((room.width - 24) / nearScale)));
  const areaSide = land ? land.areaSide : Math.round((planeWidth - areaWidth) / 2);
  // o dorme e a soma ocupam o alto da tela: no plano, isso é a faixa a partir do fundo da mesa
  const hudTop = !land && span > HUD_TOP_PX ? Math.max(0, planeHeight - planeSpanFor(span - HUD_TOP_PX)) : 0;
  // Versão 2.6.1: as pedras ficam presas abaixo da faixa do HUD (nunca sobem na lâmpada, no
  // balão nem no dorme): a moldura das pedras corta tudo o que passar do alto dela
  const clipTop = Math.max(0, hudTop - 4);
  // a faixa das pedras começa logo abaixo do HUD (antes começava BOARD_PADDING abaixo dele) e,
  // com a mão em cima da mesa, desce até a mão (a beirada de madeira de perto fica embaixo dela):
  // nos celulares baixos isso devolve ~30% de altura para as pedras
  const camTop = Math.max(0, hudTop - BOARD_PADDING);
  const areaBottom = land ? land.areaBottom : toBottom ? reserve + 6 : BOARD_PADDING + reserve;
  // a moldura de madeira, à direita, na altura do dorme (no fundo a mesa afina um pouco)
  const railPx = RAIL_WOOD_W * TABLE_PX;
  const dormeRight =
    planeHeight > 0 ? Math.max(0, Math.round(room.width / 2 - (planeWidth / 2 - railPx) * depthScale(planeSpanFor(Math.max(0, span - DORME_Y))))) + DORME_GAP : DORME_GAP;
  // a lâmpada ilumina as pedras (mesa e mão) enquanto a mesa estiver na tela
  const feltRef = useRef(null);
  useEffect(() => startTileLighting(feltRef.current), []);
  const setFelt = useCallback(
    (el) => {
      feltRef.current = el;
      if (frameRef) frameRef.current = el;
    },
    [frameRef],
  );
  // O tamanho do mundo é congelado no começo da rodada: se a mesa mudar de
  // altura no meio (dica em duas linhas, barra do Safari), só a câmera ajusta;
  // nenhuma pedra muda de lugar.
  // (versão 2.9: girar a tela troca o mundo: a serpente deitada tem outro formato)
  const [world, setWorld] = useState({ round: null, landscape: false, cols: WORLD_COLS, rows: 13 });
  if (size.width > 0 && (world.round !== roundKey || world.landscape !== landscape)) {
    setWorld({ round: roundKey, landscape, ...computeWorldSize(size.width, size.height, WORLD_COLS, { landscape }) });
  }
  const { cols, rows } = world;
  const lay = world.landscape;

  // A câmera usa o layout sem prévia, para não mexer quando o jogador seleciona uma pedra.
  const baseLayout = useMemo(() => computeBoardLayout(board, cols, rows, { landscape: lay }), [board, cols, rows, lay]);
  const layout = useMemo(
    () => (previewDouble ? computeBoardLayout(board, cols, rows, { previewDouble: true, landscape: lay }) : baseLayout),
    [board, cols, rows, previewDouble, baseLayout, lay],
  );
  // Versão 1.5: a faixa de cima do feltro é do dorme e dos selos; a câmera enquadra abaixo dela.
  // Versão 2.9: deitada, a câmera é FIXA: o mundo inteiro (o tampo) cabe no feltro, as pedras têm
  // sempre o mesmo tamanho e nenhuma sai do lugar quando outra é jogada (a bucha de quina pode
  // passar meia casa do mundo: a margem de meia casa em volta já conta com ela)
  const camera = useMemo(() => {
    if (lay) {
      const unitPx = Math.max(4, Math.min(size.width / (cols + 1), size.height / (rows + 1)));
      return { unitPx, scale: unitPx / B, x: (size.width - cols * unitPx) / 2, y: (size.height - rows * unitPx) / 2, focus: 'all' };
    }
    const view = { width: size.width, height: Math.max(0, size.height - camTop) };
    const cam = computeCamera(baseLayout, view);
    return { ...cam, y: cam.y + camTop };
  }, [baseLayout, size.width, size.height, camTop, lay, cols, rows]);
  const unit = B - TILE_INSET * 2;
  const enhancementOf = useMemo(
    () => new Map(boardTilesInOrder(board).filter((t) => t.enhancement).map((t) => [t.id, t.enhancement])),
    [board],
  );
  const feltVars = felt ? { '--felt-light': felt.light, '--felt-mid': felt.mid, '--felt-dark': felt.dark } : undefined;
  // Versão 2.0: a mesa inteira pintada em pixel art (aro de madeira com volume, tabela e feltro gasto)
  const mahogany = decor.includes('mahogany');
  const planeW = room.width > 0 ? planePixels(planeWidth) : 0;
  const planeH = planeHeight > 0 ? planePixels(planeHeight) : 0;
  const planeKey = `mesa-${planeW}x${planeH}-${felt ? `${felt.light}${felt.mid}${felt.dark}` : 'padrao'}-${mahogany ? 'mogno' : 'pinho'}${candles ? '-velas' : ''}`;

  return (
    <section
      ref={setFelt}
      className={`felt-table felt-25d tableboard-viewport felt-atmo-${atmosphere} relative min-h-0 w-full flex-1 overflow-hidden ${mahogany ? 'felt-mahogany' : ''} ${
        landscape ? 'is-landscape' : ''
      } ${candles ? 'is-candles' : ''}`}
      style={land ? { ...feltVars, '--rail-px': `${land.yFar}px`, '--near-px': `${land.yNear}px`, '--table-w': `${land.width}px` } : feltVars}
      aria-label="Mesa"
    >
      {/* versão 2.16: ver a mesa de cima, com as pedras grandes */}
      {layout.tiles.length > 0 && (
        <button type="button" className="board-view-btn" onClick={() => setZoomed(true)} aria-label="Ver a mesa de cima">
          <LupaGlyph size={18} />
        </button>
      )}
      {zoomed && <BoardZoom tiles={layout.tiles} enhancementOf={enhancementOf} onClose={closeZoom} />}
      {/* Versão 2.0: a sala em volta da mesa (aparece nos cantos do fundo, onde a mesa afina) */}
      <div ref={roomRef} aria-hidden="true" className="table-room pointer-events-none absolute inset-0">
        <BotecoBackdrop scene={landscape ? (roomScene ?? 'landroom') : 'tableroom'} className="absolute inset-0" />
      </div>

      {/* o plano da mesa, inclinado: feltro, aro de madeira e as pedras, tudo em perspectiva */}
      <div
        className="table-plane absolute"
        style={
          land
            ? land.style
            : planeHeight
            ? {
                left: Math.round((room.width - planeWidth) / 2),
                width: planeWidth,
                bottom: apron,
                height: planeHeight,
                transform: `perspective(${PERSPECTIVE_PX}px) rotateX(${TILT}deg)`,
              }
            : { top: 0, bottom: 0, left: 0, right: 0 }
        }
      >
        {planeW > 0 && (
          <PixelCanvas
            cacheKey={planeKey}
            paint={() => paintTablePlane({ w: planeW, h: planeH, ...(felt ?? {}), mahogany, candles })}
            w={planeW}
            h={planeH}
            className="table-surface-px absolute inset-0"
            style={{ width: '100%', height: '100%' }}
          />
        )}
        {decor.map((d) => (
          <div key={d} aria-hidden="true" className={`felt-decor felt-decor-${d} pointer-events-none absolute inset-0`} />
        ))}
        <div className={`atmo-layer atmo-${atmosphere} pointer-events-none absolute inset-0`} />
        <div className="felt-vignette pointer-events-none absolute inset-0" />

      <div className="board-clip absolute inset-x-0 bottom-0" style={{ top: clipTop, zIndex: 3 }}>
      <div ref={areaRef} className="absolute" style={{ top: BOARD_PADDING - clipTop, left: areaSide, right: areaSide, bottom: areaBottom }}>
        {size.width > 0 && (
          <div
            className={`board-world absolute left-0 top-0 ${lay ? 'is-pan' : ''}`}
            style={{
              width: cols * B,
              height: rows * B,
              transform: lay
                ? `translate3d(${camera.x}px, ${camera.y}px, 0) scale(${camera.scale})`
                : `translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})`,
            }}
          >
            {layout.tiles.map((tile) => {
              const box = tileBox(tile, tile.orientation, unit);
              const arriving = incoming?.tileId === tile.id;
              const flying = arriving && incoming.stage === 'flight';
              const spot = arriving && incoming.stage === 'spot';
              const landed = arriving && incoming.stage === 'landed';
              const entry = arriving ? '' : tile.isDouble ? 'animate-tile-slam' : 'animate-tile-drop';
              const fin = finaleId === tile.id;
              return (
                <div
                  key={tile.id}
                  data-tile-id={tile.id}
                  className={`board-tile absolute ${spot || fin ? 'z-20' : tile.isOpenEnd ? 'z-10 scale-110' : 'z-0'}`}
                  // voando: a pedra real espera escondida; a cópia (tileFlight.js) chega aqui
                  style={flying ? { ...box, visibility: 'hidden' } : box}
                >
                  <div className={`relative ${entry} ${spot ? 'ai-spotlight' : ''}`}>
                    <DominoTile
                      values={tile.values}
                      orientation={tile.lineAxis}
                      onBoard
                      unit={unit}
                      enhancement={enhancementOf.get(tile.id)}
                      openEnd={tile.isOpenEnd}
                      shimmer={tile.isOpenEnd}
                      still={!tile.isOpenEnd}
                      depth={tile.isDouble ? 7 : 6}
                    />
                    {tile.isDouble && (!arriving || landed) && <span aria-hidden="true" className="impact-ring pointer-events-none absolute" />}
                    {spot && <span aria-hidden="true" className="ai-spot-ring pointer-events-none absolute" />}
                    {fin && <span aria-hidden="true" className={`finale-ring is-${finaleTone} pointer-events-none absolute`} />}
                  </div>
                </div>
              );
            })}

            {Object.entries(layout.slots).map(([side, slot]) => {
              const active = playableSides.includes(side);
              const box = tileBox(slot, slot.orientation, unit);
              // badge com tamanho fixo NA TELA (contraescala da câmera): número sempre legível
              // (2.9: na mesa deitada, a plaquinha acompanha o tamanho fixo das pedras)
              const badgeScreen = lay ? Math.min(28, Math.max(15, camera.unitPx * 1.05)) : Math.min(40, Math.max(22, camera.unitPx * 0.82));
              const badgeSize = badgeScreen / camera.scale;
              return (
                <div key={side}>
                  {active && (
                    <button
                      type="button"
                      data-tut-side={side}
                      onClick={() => onPlaySide?.(side)}
                      aria-label={`Jogar na ponta ${SIDE_LABEL[side]}`}
                      className="slot-ghost absolute z-20"
                      style={box}
                    />
                  )}
                  {!active && side === 'root' && <div className="slot-empty pointer-events-none absolute" style={box} />}
                  {slot.badge && (
                    <button
                      type="button"
                      tabIndex={active ? 0 : -1}
                      disabled={!active}
                      onClick={() => onPlaySide?.(side)}
                      aria-label={`Ponta ${SIDE_LABEL[side]} livre: ${slot.value}${MARK_LABEL[endMarks[side]] ?? ''}`}
                      className={`end-badge absolute z-30 ${active ? 'end-badge-active' : ''} ${MARK_CLASS[endMarks[side]] ?? ''}`}
                      style={{
                        left: slot.badge.x * B,
                        top: slot.badge.y * B,
                        width: badgeSize,
                        height: badgeSize,
                        fontSize: (badgeScreen * 0.46) / camera.scale,
                        borderWidth: 3 / camera.scale,
                      }}
                    >
                      {slot.value}
                      {/* Versão 1.5: ponta travada (Chumbo, Âmbar): correntes cruzadas e o cadeado */}
                      {(endMarks[side] === 'frozen' || endMarks[side] === 'blocked') && (
                        <span aria-hidden="true" className={`end-lock end-lock-${endMarks[side]}`}>
                          <PixelCanvas cacheKey="cadeado" paint={paintLock} w={LOCK_SIZE.w} h={LOCK_SIZE.h} scale={1} className="end-lock-px" />
                        </span>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      </div>

      </div>

      {/* o que ficou em cima da beirada, de pé (fora do plano): tampinhas, cinzeiro com o
          cigarro soltando fumaça e o copo americano. Ficam nos cantos de perto, fora do jogo. */}
      {/* a frente da mesa: a saia de madeira, com as cantoneiras de latão */}
      {planeW > 0 && !toBottom && (
        <PixelCanvas
          cacheKey={`saia-${planeW}-${mahogany ? 'mogno' : 'pinho'}${candles ? '-velas' : ''}`}
          paint={() => paintApron(planeW, { mahogany, candles })}
          w={planeW}
          h={APRON_H}
          className="table-apron pointer-events-none absolute inset-x-0 bottom-0"
          style={{ width: '100%', height: APRON_PX }}
        />
      )}
      {/* Versão 2.1: sem copo, cinzeiro e tampinhas em cima da mesa: ela fica só com o jogo */}
      {/* versão 2.9: deitada, a frente da mesa aparece: a saia de madeira e os dois pés */}
      {land && planeW > 0 && (
        <div aria-hidden="true" className="land-table-front pointer-events-none absolute" style={{ left: land.style.left, width: land.width, top: land.yNear }}>
          <PixelCanvas
            cacheKey={`saia-${planeW}-${mahogany ? 'mogno' : 'pinho'}${candles ? '-velas' : ''}`}
            paint={() => paintApron(planeW, { mahogany, candles })}
            w={planeW}
            h={APRON_H}
            className="land-apron"
            style={{ width: '100%', height: APRON_PX }}
          />
          <span className="land-leg is-left" />
          <span className="land-leg is-right" />
        </div>
      )}

      {/* lâmpada pendurada: balança como pêndulo e o facho varre a mesa, clareando
          as pedras por onde passa; quando ela falha, o facho tremula de leve */}
      {!candles && <LampRig part="light" lamp={landscape ? 40 : 64} cord={2} beamWidth={landscape ? 300 : 300} />}
      {/* versão 2.6.1: sem a película preta das falhas (.room-flicker): a mesa piscava preta */}

      {/* deitada, o corpo da lâmpada fica na camada do rival (RivalSeat): ela pende NA FRENTE dele */}
      {!landscape && !candles && <LampRig part="body" lamp={64} cord={2} beamWidth={300} className="z-[6]" />}
      {/* versão 2.13: o Dono da Noite joga à luz de quatro velas, uma em cada canto do tampo */}
      {candles && <TableCandles room={room} landscape={landscape} />}
      {/* versão 2.13: a luz viva da sala, das pedras aprimoradas e dos clarões, num shader */}
      {landscape && <FxLayer scene={roomScene ?? 'landroom'} candles={candles} rootRef={feltRef} />}

      {/* versão 2.14: deitada, o dorme e a soma das pontas moram na lousa do armarinho (PlayerRack) */}
      {boneyardCount !== null && !dormeInHud && (
        <BoneyardPile
          count={boneyardCount}
          hidden={tableMod === 'fumacaDensa' ? 'smoke' : boneyardHidden ? 'cova' : null}
          canDraw={canDraw}
          urge={drawUrge}
          onDraw={onDraw}
          drawsUsed={drawsUsed}
          cost={drawCost}
          right={landscape ? null : dormeRight}
        />
      )}
      {!dormeInHud && <EndsSum sum={endsSum} right={landscape ? null : dormeRight} />}
      <TableModSeal id={tableMod} />
      <RivalRuleSeal rule={rivalRule} shifted={Boolean(tableModifierOf(tableMod))} />

      {dimmed && <div className="pointer-events-none absolute inset-0 bg-black/45" />}

      {noMoves && <NoMovesBanner />}
    </section>
  );
}

export default memo(TableBoard);
