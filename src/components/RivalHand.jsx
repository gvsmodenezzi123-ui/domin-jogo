import { useEffect, useState } from 'react';
import DominoTile from './DominoTile.jsx';

/** Tamanho das pedras viradas do rival (px de cada metade) e passo entre vagas. */
const UNIT = 18;
const GAP = 4;
/** Quanto tempo a pedra que saiu continua na vaga (some enquanto a cópia voa até a mesa). */
const LEAVE_MS = 420;
/** Largura disponível para a fileira (px): acima disso as vagas se aproximam. */
const ROOM = 200;

/**
 * Distribui as pedras em vagas FIXAS (contadas da direita): cada pedra fica na
 * sua vaga até sair da mão, então jogar uma pedra não mexe nas outras. Pedra
 * nova (compra) pega a primeira vaga livre. Rodada nova: vagas do zero.
 */
function reconcile(prev, tiles, roundKey) {
  const ids = tiles.map((t) => t.id).join(',');
  if (prev && prev.roundKey === roundKey && prev.ids === ids) return prev;
  const fresh = !prev || prev.roundKey !== roundKey;
  const slots = fresh ? {} : { ...prev.slots };
  const leaving = fresh ? {} : { ...prev.leaving };
  const byId = fresh ? {} : { ...prev.byId };
  if (!fresh) {
    for (const id of Object.keys(slots)) {
      if (!tiles.some((t) => t.id === id)) {
        leaving[id] = { tile: byId[id], slot: slots[id] };
        delete slots[id];
      }
    }
  }
  const taken = new Set([...Object.values(slots), ...Object.values(leaving).map((l) => l.slot)]);
  for (const tile of tiles) {
    byId[tile.id] = tile;
    if (slots[tile.id] !== undefined) continue;
    delete leaving[tile.id]; // voltou para a mão (Relógio Quebrado)
    let slot = 0;
    while (taken.has(slot)) slot += 1;
    slots[tile.id] = slot;
    taken.add(slot);
  }
  return { roundKey, ids, slots, leaving, byId };
}

/**
 * Mão do rival: fileira de pedras viradas presa à direita do cabeçalho. Só a
 * pedra que sai anima (a cópia dela voa até a mesa); as outras não andam.
 * Pedras reveladas (Olho de Vidro, Espelho) aparecem de frente.
 */
export default function RivalHand({ tiles, revealedIds, foreseenId = null, roundKey, containerRef, className = '' }) {
  const [book, setBook] = useState(() => reconcile(null, tiles, roundKey));
  const next = reconcile(book, tiles, roundKey);
  if (next !== book) setBook(next);
  const view = next;

  const leavingIds = Object.keys(view.leaving);
  const leavingKey = leavingIds.join(',');
  useEffect(() => {
    if (!leavingKey) return undefined;
    const gone = leavingKey.split(',');
    const timer = setTimeout(
      () =>
        setBook((cur) => {
          const leaving = { ...cur.leaving };
          for (const id of gone) delete leaving[id];
          return { ...cur, leaving };
        }),
      LEAVE_MS,
    );
    return () => clearTimeout(timer);
  }, [leavingKey]);

  const used = [...Object.values(view.slots), ...Object.values(view.leaving).map((l) => l.slot)];
  const maxSlot = used.length ? Math.max(...used) : 0;
  const step = Math.min(UNIT + GAP, ROOM / (maxSlot + 1));

  const render = (tile, slot, leavingTile) => {
    const revealed = !leavingTile && revealedIds.has(tile.id);
    return (
      <div
        key={tile.id}
        data-rival-tile={tile.id}
        className={`rival-slot absolute ${leavingTile ? 'rival-slot-leaving' : ''}`}
        style={{ right: slot * step, top: '50%', marginTop: -UNIT, rotate: `${slot % 2 ? -2 : 2}deg` }}
      >
        {revealed ? (
          <DominoTile
            values={[tile.a, tile.b]}
            unit={UNIT}
            depth={2}
            enhancement={tile.enhancement}
            className={`rival-revealed ${tile.id === foreseenId ? 'rival-foreseen' : ''}`}
          />
        ) : (
          <DominoTile faceDown unit={UNIT} depth={2} />
        )}
      </div>
    );
  };

  return (
    <div ref={containerRef} className={`pointer-events-none ${className}`} role="img" aria-label={`Mão do rival: ${tiles.length} pedras`}>
      {tiles.map((tile) => render(tile, view.slots[tile.id] ?? 0, false))}
      {leavingIds.map((id) => render(view.leaving[id].tile, view.leaving[id].slot, true))}
    </div>
  );
}
