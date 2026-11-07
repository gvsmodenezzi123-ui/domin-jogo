import { memo } from 'react';
import { getRarity } from '../data/rarities.js';
import { RELIC_SLOTS, getRelic } from '../data/relics.js';
import RelicIcon from './RelicIcon.jsx';
import { ShopSprite } from './ShopArt.jsx';

/**
 * Slots de talismã (4; a Maleta do Trapaceiro e o Bolso Fundo dão mais). A mesma barra serve para você (acima do leque), para o
 * rival (abaixo do retrato dele, 2x2) e para a loja (modo venda).
 *
 * relics:  ids equipados, na ordem dos slots
 * slots:   quantas vagas mostrar (padrão 4)
 * flashes: { [id]: seq } — o slot pisca quando o talismã dispara
 * spent:   ids já usados nesta rodada (Borracha, Relógio): ficam apagados
 * ready:   ids prontos para usar (Relógio): brilham
 * press:   gera os handlers do toque longo (balão explicativo)
 * onTap:   toque rápido num talismã (na loja: vender)
 * bare:    na mesa (Patch 0.5.5): sem moldura nem caixas; os talismãs flutuam soltos
 *          sobre o feltro, só o desenho e a sombra de cada um. Vaga vazia não aparece.
 * niche:   versão 2.11, na mesa deitada: cada vaga é o nicho de madeira da bolsa da loja (a
 *          vazia também aparece), com o talismã dentro. `vertical` empilha numa coluna.
 */
function Hotbar({
  relics,
  slots = RELIC_SLOTS,
  size = 30,
  cols = slots,
  flashes = {},
  spent = [],
  ready = [],
  press,
  onTap,
  label = 'Talismãs',
  owner = 'player',
  bare = false,
  niche = false,
  className = '',
}) {
  const pixel = size >= 38 ? 3 : size >= 28 ? 2 : 1.5;
  if (niche) {
    const scale = size / 26;
    const h = Math.round(24 * scale);
    return (
      <div className={`hotbar-niches ${className}`} style={{ gridTemplateColumns: `repeat(${cols}, ${size}px)` }} role="group" aria-label={label}>
        {Array.from({ length: Math.max(slots, relics.length) }, (_, i) => {
          const relic = getRelic(relics[i]);
          if (!relic) {
            return (
              <span key={`empty-${i}`} aria-hidden="true" className="relic-niche is-empty" style={{ width: size, height: h }}>
                <ShopSprite name="nicho" scale={scale} className="relic-niche-px" />
              </span>
            );
          }
          const tier = getRarity(relic.rarity);
          return (
            <button
              key={relic.id}
              type="button"
              className={`relic-niche ${tier.id === 'mitico' ? 'relic-slot-mythic' : ''} ${spent.includes(relic.id) ? 'relic-slot-spent' : ''} ${ready.includes(relic.id) ? 'relic-slot-ready' : ''} ${
                owner === 'tioZe' ? 'relic-slot-rival' : ''
              }`}
              style={{ width: size, height: h, '--rarity': tier.color }}
              data-relic-slot={`${owner}:${relic.id}`}
              aria-label={`${relic.name} (${tier.label.toLowerCase()}): ${relic.description}`}
              onClick={onTap ? () => onTap(relic.id) : undefined}
              {...(press ? press({ kind: 'relic', id: relic.id, owner }) : {})}
            >
              <ShopSprite name="nicho" scale={scale} className="relic-niche-px" />
              <span key={flashes[relic.id] ?? 0} className={`relic-niche-icon ${flashes[relic.id] ? 'animate-relic-proc' : ''}`}>
                <RelicIcon relic={relic} size={Math.round(size * 0.66)} />
              </span>
            </button>
          );
        })}
      </div>
    );
  }
  return (
    <div
      className={`grid gap-1 ${className}`}
      style={{ gridTemplateColumns: `repeat(${cols}, ${size}px)` }}
      role="group"
      aria-label={label}
    >
      {Array.from({ length: Math.max(slots, relics.length) }, (_, i) => {
        const relic = getRelic(relics[i]);
        if (!relic) {
          return (
            <span
              key={`empty-${i}`}
              aria-hidden="true"
              className={bare ? 'relic-bare-empty' : 'relic-slot relic-slot-empty'}
              style={{ width: size, height: size }}
            />
          );
        }
        const tier = getRarity(relic.rarity);
        return (
          <button
            key={relic.id}
            type="button"
            className={`${bare ? 'relic-bare' : 'relic-slot'} ${tier.id === 'mitico' ? 'relic-slot-mythic' : ''} ${
              spent.includes(relic.id) ? 'relic-slot-spent' : ''
            } ${ready.includes(relic.id) ? 'relic-slot-ready' : ''} ${owner === 'tioZe' ? 'relic-slot-rival' : ''}`}
            style={{ width: size, height: size, '--rarity': tier.color, '--float-delay': `${-i * 0.7}s` }}
            data-relic-slot={`${owner}:${relic.id}`}
            aria-label={`${relic.name} (${tier.label.toLowerCase()}): ${relic.description}`}
            onClick={onTap ? () => onTap(relic.id) : undefined}
            {...(press ? press({ kind: 'relic', id: relic.id, owner }) : {})}
          >
            <span key={flashes[relic.id] ?? 0} className={`block ${flashes[relic.id] ? 'animate-relic-proc' : ''}`}>
              <RelicIcon relic={relic} size={bare ? size : pixel * 12} />
            </span>
          </button>
        );
      })}
    </div>
  );
}

// Patch 0.5.4: só redesenha quando as props mudam (não a cada moeda/dica/fala da mesa)
export default memo(Hotbar);
