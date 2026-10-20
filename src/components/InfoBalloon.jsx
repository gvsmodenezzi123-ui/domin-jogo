import { getRarity } from '../data/rarities.js';

const WIDTH = 236;
const GAP = 10;

/**
 * Balão de pixel art que aparece no toque longo, ao lado do item tocado:
 * nome, raridade (com a cor dela) e o efeito. Fica acima do item quando há
 * espaço, senão abaixo, e nunca sai da tela.
 */
export default function InfoBalloon({ info }) {
  if (!info) return null;
  const { title, rarity, description, extra, rect } = info;
  const tier = getRarity(rarity);
  const vw = window.innerWidth;
  const left = Math.max(8, Math.min(vw - WIDTH - 8, rect.left + rect.width / 2 - WIDTH / 2));
  const above = rect.top > 170;
  const arrow = Math.max(14, Math.min(WIDTH - 14, rect.left + rect.width / 2 - left));
  const place = above ? { bottom: window.innerHeight - rect.top + GAP } : { top: rect.top + rect.height + GAP };
  return (
    <div
      className={`info-balloon animate-balloon pointer-events-none fixed z-[95] px-3 py-2.5 ${above ? 'info-balloon-above' : 'info-balloon-below'}`}
      style={{ ...place, left, width: WIDTH, '--rarity': tier.color, '--arrow': `${arrow}px` }}
      role="tooltip"
    >
      <p className="font-pixel text-[9px] leading-snug text-bone-50">{title}</p>
      <p className="mt-1">
        <span className={`rarity-badge ${tier.id === 'mitico' ? 'rarity-badge-mythic' : ''}`}>{tier.label}</span>
      </p>
      <p className="mt-1.5 font-term text-[17px] leading-tight text-bone-200">{description}</p>
      {extra && <p className="mt-1 font-pixel text-[7px] leading-snug text-brass-300">{extra}</p>}
    </div>
  );
}
