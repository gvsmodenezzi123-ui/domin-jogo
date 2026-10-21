import { memo } from 'react';
import { getRarity } from '../data/rarities.js';
import { RELIC_SLOTS, getRelic } from '../data/relics.js';
import RelicIcon from './RelicIcon.jsx';

/**
 * 4 slots de talismã. A mesma barra serve para você (acima do leque), para o
 * rival (abaixo do retrato dele, 2x2) e para a loja (modo venda).
 *
 * relics:  ids equipados, na ordem dos slots
 * flashes: { [id]: seq } — o slot pisca quando o talismã dispara
 * spent:   ids já usados nesta rodada (Borracha, Relógio): ficam apagados
 * ready:   ids prontos para usar (Relógio): brilham
 * press:   gera os handlers do toque longo (balão explicativo)
 * onTap:   toque rápido num talismã (na loja: vender)
 */
function Hotbar({
  relics,
  size = 30,
  cols = RELIC_SLOTS,
  flashes = {},
  spent = [],
  ready = [],
  press,
  onTap,
  label = 'Talismãs',
  owner = 'player',
  className = '',
}) {
  const pixel = size >= 38 ? 3 : size >= 28 ? 2 : 1.5;
  return (
    <div
      className={`grid gap-1 ${className}`}
      style={{ gridTemplateColumns: `repeat(${cols}, ${size}px)` }}
      role="group"
      aria-label={label}
    >
      {Array.from({ length: RELIC_SLOTS }, (_, i) => {
        const relic = getRelic(relics[i]);
        if (!relic) {
          return <span key={`empty-${i}`} aria-hidden="true" className="relic-slot relic-slot-empty" style={{ width: size, height: size }} />;
        }
        const tier = getRarity(relic.rarity);
        return (
          <button
            key={relic.id}
            type="button"
            className={`relic-slot ${tier.id === 'mitico' ? 'relic-slot-mythic' : ''} ${spent.includes(relic.id) ? 'relic-slot-spent' : ''} ${
              ready.includes(relic.id) ? 'relic-slot-ready' : ''
            } ${owner === 'tioZe' ? 'relic-slot-rival' : ''}`}
            style={{ width: size, height: size, '--rarity': tier.color }}
            data-relic-slot={`${owner}:${relic.id}`}
            aria-label={`${relic.name} (${tier.label.toLowerCase()}): ${relic.description}`}
            onClick={onTap ? () => onTap(relic.id) : undefined}
            {...(press ? press({ kind: 'relic', id: relic.id, owner }) : {})}
          >
            <span key={flashes[relic.id] ?? 0} className={`block ${flashes[relic.id] ? 'animate-relic-proc' : ''}`}>
              <RelicIcon relic={relic} size={pixel * 12} />
            </span>
          </button>
        );
      })}
    </div>
  );
}

// Patch 0.5.4: só redesenha quando as props mudam (não a cada moeda/dica/fala da mesa)
export default memo(Hotbar);
