import { useState } from 'react';
import { RARITIES, RELIC_SLOTS, getRelic } from '../data/relics.js';
import PixelSprite from './PixelSprite.jsx';

/**
 * Faixa logo abaixo do painel do Tio Zé com os 4 slots de talismã.
 * Tocar num talismã abre o tooltip (nome, raridade e efeito); tocar fora fecha.
 *
 * relics:  ids equipados, na ordem dos slots
 * flashes: { [id]: seq } — o slot pisca quando o talismã dispara
 * spent:   ids já usados nesta rodada (Borracha, Relógio)
 * canUndo: o Relógio Quebrado pode desfazer a jogada do Tio Zé agora
 */
export default function RelicBar({ relics, flashes = {}, spent = [], canUndo = false, onUndo, devUnlocked = false, onOpenDev }) {
  const [openSlot, setOpenSlot] = useState(null);
  const openId = openSlot === null ? null : (relics[openSlot] ?? null);
  const open = openSlot === null ? null : openId ? getRelic(openId) : 'empty';
  const rarity = open && open !== 'empty' ? RARITIES[open.rarity] : null;

  return (
    <div className="relic-bar relative z-[35] flex h-[38px] shrink-0 items-center gap-1.5 px-3" aria-label="Talismãs">
      {Array.from({ length: RELIC_SLOTS }, (_, i) => {
        const relic = getRelic(relics[i]);
        if (!relic) {
          return (
            <button
              key={`empty-${i}`}
              type="button"
              className={`relic-slot relic-slot-empty ${openSlot === i ? 'relic-slot-open' : ''}`}
              aria-label="Slot de talismã vazio"
              onClick={() => setOpenSlot(openSlot === i ? null : i)}
            />
          );
        }
        const color = RARITIES[relic.rarity].color;
        const ready = relic.ability === 'undo' && canUndo;
        return (
          <button
            key={relic.id}
            type="button"
            className={`relic-slot ${openSlot === i ? 'relic-slot-open' : ''} ${spent.includes(relic.id) ? 'relic-slot-spent' : ''} ${ready ? 'relic-slot-ready' : ''}`}
            style={{ '--rarity': color }}
            aria-label={`${relic.name}: ${relic.description}`}
            aria-expanded={openSlot === i}
            onClick={() => setOpenSlot(openSlot === i ? null : i)}
          >
            <span key={flashes[relic.id] ?? 0} className={`block ${flashes[relic.id] ? 'animate-relic-proc' : ''}`}>
              <PixelSprite rows={relic.icon} palette={relic.palette} pixel={2} />
            </span>
          </button>
        );
      })}

      <div className="relative z-10 ml-auto flex items-center gap-2">
        {canUndo && (
          <button type="button" data-tone="brass" className="btn-pixel btn-mini" onClick={onUndo}>
            DESFAZER
          </button>
        )}
        {devUnlocked && (
          <button type="button" className="dev-chip" onClick={onOpenDev} aria-label="Abrir painel de testes">
            DEV
          </button>
        )}
      </div>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-0 cursor-default"
            aria-label="Fechar detalhes do talismã"
            onClick={() => setOpenSlot(null)}
          />
          <div
            className="relic-tooltip absolute inset-x-3 top-full z-20 mt-1 px-3 py-2.5"
            style={{ '--rarity': rarity?.color }}
            role="tooltip"
          >
            {open === 'empty' ? (
              <p className="font-term text-[17px] leading-tight text-bone-200">
                Slot vazio. Vença rodadas para achar talismãs (até {RELIC_SLOTS}).
              </p>
            ) : (
              <div className="flex gap-3">
                <span className="shrink-0 pt-0.5">
                  <PixelSprite rows={open.icon} palette={open.palette} pixel={3} />
                </span>
                <div className="min-w-0">
                  <p className="font-pixel text-[9px] leading-snug text-bone-50">{open.name.toUpperCase()}</p>
                  <p className="mt-1 font-pixel text-[7px]" style={{ color: rarity.color }}>
                    {rarity.label}
                    {spent.includes(open.id) && <span className="text-bone-400"> · USADO NESTA RODADA</span>}
                  </p>
                  <p className="mt-1.5 font-term text-[17px] leading-tight text-bone-200">{open.description}</p>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
