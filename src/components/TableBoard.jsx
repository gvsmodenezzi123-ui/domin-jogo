import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { BASE_UNIT_PX, WORLD_COLS, computeBoardLayout, computeCamera, computeWorldSize } from '../engine/boardLayout.js';
import { boardTilesInOrder } from '../engine/dominoLogic.js';
import DominoTile from './DominoTile.jsx';
import LampRig from './LampRig.jsx';
import NoMovesBanner from './NoMovesBanner.jsx';
import { tableModifierOf } from '../data/tableModifiers.js';
import { TableModIcon } from './art/TableModArt.jsx';
import { startTileLighting } from './tileLighting.js';

/** Margem interna do feltro (a mesa usa quase toda a largura da tela). */
const BOARD_PADDING = 8;
/** Folga visual entre pedras vizinhas, em px do mundo (antes da câmera). */
const TILE_INSET = 1.5;
const B = BASE_UNIT_PX;

/**
 * Dorme no canto da mesa (Patch 0.7.0): a pilha de pedras viradas e quantas ainda
 * restam, grande, no alto à direita do feltro (o balão do rival fala à esquerda e a
 * lâmpada fica no meio). Com 3 ou menos o número fica âmbar; vazio, vermelho. Cada
 * compra dá um pulinho no número.
 */
const BoneyardPile = memo(function BoneyardPile({ count, hidden = false }) {
  // Fumaça Densa (Patch 0.9.4): o dorme some na fumaça (nem a pilha nem o número aparecem)
  const tone = hidden ? 'is-smoke' : count === 0 ? 'is-empty' : count <= 3 ? 'is-low' : '';
  if (hidden) {
    return (
      <div className={`boneyard-pile pointer-events-none absolute z-[7] ${tone}`} role="status" aria-label="Dorme escondido pela fumaça">
        <span className="boneyard-smoke" aria-hidden="true">
          <TableModIcon icon="smoke" className="h-9 w-9" />
        </span>
        <span className="boneyard-info" aria-hidden="true">
          <span className="boneyard-count font-pixel text-shadow-pixel">?</span>
          <span className="boneyard-label font-pixel">FUMAÇA</span>
        </span>
      </div>
    );
  }
  return (
    <div
      className={`boneyard-pile pointer-events-none absolute z-[7] ${tone}`}
      role="status"
      aria-label={count === 0 ? 'Dorme vazio' : `Dorme: ${count} ${count === 1 ? 'pedra restante' : 'pedras restantes'}`}
    >
      <span className="boneyard-stack" aria-hidden="true">
        {count > 2 && <DominoTile faceDown unit={10} depth={2} className="boneyard-tile boneyard-tile-3" />}
        {count > 1 && <DominoTile faceDown unit={10} depth={2} className="boneyard-tile boneyard-tile-2" />}
        {count > 0 ? <DominoTile faceDown unit={10} depth={2} className="boneyard-tile boneyard-tile-1" /> : <span className="boneyard-hole" />}
      </span>
      <span className="boneyard-info" aria-hidden="true">
        <span key={count} className="boneyard-count font-pixel text-shadow-pixel">
          {count}
        </span>
        <span className="boneyard-label font-pixel">{count === 0 ? 'VAZIO' : 'DORME'}</span>
      </span>
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
}) {
  const [areaRef, size] = useElementSize();
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
  const [world, setWorld] = useState({ round: null, cols: WORLD_COLS, rows: 13 });
  if (size.width > 0 && world.round !== roundKey) {
    setWorld({ round: roundKey, ...computeWorldSize(size.width, size.height) });
  }
  const { cols, rows } = world;

  // A câmera usa o layout sem prévia, para não mexer quando o jogador seleciona uma pedra.
  const baseLayout = useMemo(() => computeBoardLayout(board, cols, rows), [board, cols, rows]);
  const layout = useMemo(
    () => (previewDouble ? computeBoardLayout(board, cols, rows, { previewDouble: true }) : baseLayout),
    [board, cols, rows, previewDouble, baseLayout],
  );
  const camera = computeCamera(baseLayout, size);
  const unit = B - TILE_INSET * 2;
  const enhancementOf = useMemo(
    () => new Map(boardTilesInOrder(board).filter((t) => t.enhancement).map((t) => [t.id, t.enhancement])),
    [board],
  );
  const feltVars = felt ? { '--felt-light': felt.light, '--felt-mid': felt.mid, '--felt-dark': felt.dark } : undefined;

  return (
    <section
      ref={setFelt}
      className={`felt-table felt-atmo-${atmosphere} relative min-h-0 w-full flex-1 overflow-hidden ${decor.includes('mahogany') ? 'felt-mahogany' : ''}`}
      style={feltVars}
      aria-label="Mesa"
    >
      {decor.map((d) => (
        <div key={d} aria-hidden="true" className={`felt-decor felt-decor-${d} pointer-events-none absolute inset-0`} />
      ))}
      <div className={`atmo-layer atmo-${atmosphere} pointer-events-none absolute inset-0`} />
      <div className="felt-vignette pointer-events-none absolute inset-0" />

      <div ref={areaRef} className="absolute" style={{ inset: BOARD_PADDING }}>
        {size.width > 0 && (
          <div
            className="board-world absolute left-0 top-0"
            style={{
              width: cols * B,
              height: rows * B,
              transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})`,
            }}
          >
            {layout.tiles.map((tile) => {
              const box = tileBox(tile, tile.orientation, unit);
              const arriving = incoming?.tileId === tile.id;
              const flying = arriving && incoming.stage === 'flight';
              const spot = arriving && incoming.stage === 'spot';
              const landed = arriving && incoming.stage === 'landed';
              const entry = arriving ? '' : tile.isDouble ? 'animate-tile-slam' : 'animate-tile-drop';
              return (
                <div
                  key={tile.id}
                  data-tile-id={tile.id}
                  className={`board-tile absolute ${spot ? 'z-20' : tile.isOpenEnd ? 'z-10 scale-110' : 'z-0'}`}
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
                      depth={tile.isDouble ? 5 : 4}
                    />
                    {tile.isDouble && (!arriving || landed) && <span aria-hidden="true" className="impact-ring pointer-events-none absolute" />}
                    {spot && <span aria-hidden="true" className="ai-spot-ring pointer-events-none absolute" />}
                  </div>
                </div>
              );
            })}

            {Object.entries(layout.slots).map(([side, slot]) => {
              const active = playableSides.includes(side);
              const box = tileBox(slot, slot.orientation, unit);
              // badge com tamanho fixo NA TELA (contraescala da câmera): número sempre legível
              const badgeScreen = Math.min(40, Math.max(22, camera.unitPx * 0.82));
              const badgeSize = badgeScreen / camera.scale;
              return (
                <div key={side}>
                  {active && (
                    <button
                      type="button"
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
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* lâmpada pendurada: balança como pêndulo e o facho varre a mesa, clareando
          as pedras por onde passa; quando ela falha, a mesa inteira escurece */}
      <LampRig part="light" lamp={64} cord={2} beamWidth={300} />
      <div aria-hidden="true" className="room-flicker pointer-events-none absolute inset-0" />

      {/* moldura chanfrada da mesa: aro escuro, quina iluminada em cima, sombra embaixo */}
      <div aria-hidden="true" className="felt-bevel pointer-events-none absolute inset-0" />
      <LampRig part="body" lamp={64} cord={2} beamWidth={300} className="z-[6]" />

      {boneyardCount !== null && <BoneyardPile count={boneyardCount} hidden={tableMod === 'fumacaDensa'} />}
      <TableModSeal id={tableMod} />

      {dimmed && <div className="pointer-events-none absolute inset-0 bg-black/45" />}

      {noMoves && <NoMovesBanner />}
    </section>
  );
}

export default memo(TableBoard);
