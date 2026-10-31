import { maletaOf } from '../data/maletas.js';
import CoinCount from '../components/CoinCount.jsx';
import Hotbar from '../components/Hotbar.jsx';
import { HeartsBar } from '../components/PixelHeart.jsx';
import MaletaSprite from '../components/MaletaPixel.jsx';
import { whereText } from './ladder.js';

/**
 * Patch PvP: a faixa do outro jogador (mapa, loja, mesa reservada): a maleta dele, o nome, os
 * corações e as moedas de verdade, os talismãs que ele comprou e onde ele está agora.
 */
export default function OpponentStrip({ name, maleta, status, press, compact = false }) {
  const hearts = status?.hearts ?? null;
  const max = status?.maxHearts ?? null;
  return (
    <section className={`pvp-opp ${compact ? 'pvp-opp-compact' : ''}`} aria-label={`Oponente: ${name}`}>
      <span className="pvp-opp-case" aria-hidden="true">
        <MaletaSprite id={maleta ?? 'classica'} className="h-full w-full" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="pvp-opp-name">
          {name.toUpperCase()}
          <span className="pvp-opp-maleta"> · {maletaOf(maleta).short}</span>
        </p>
        <p className="pvp-opp-where">{whereText(status)}</p>
      </div>
      <div className="pvp-opp-stats">
        {hearts != null && max != null && <HeartsBar current={hearts} max={max} pixel={1.5} label={`${name}: ${hearts} de ${max} corações`} />}
        <div className="flex items-center justify-end gap-1.5">
          {status && <CoinCount value={status.coins} className="text-[7px]" size={10} />}
          {status?.relics?.length > 0 && <Hotbar relics={status.relics} slots={status.relics.length} size={14} press={press} owner="tioZe" bare label={`Talismãs de ${name}`} />}
        </div>
      </div>
    </section>
  );
}
