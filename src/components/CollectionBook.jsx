import { useState } from 'react';
import { ENHANCEMENTS, ENHANCEMENT_IDS } from '../data/enhancedTiles.js';
import { getRarity } from '../data/rarities.js';
import { RELICS, RELIC_IDS } from '../data/relics.js';
import { RIVALS, RIVAL_IDS } from '../data/rivals.js';
import { REGIONS } from '../data/campaign.js';
import DominoTile from './DominoTile.jsx';
import RelicIcon from './RelicIcon.jsx';
import { RetroCard } from './RetroCard.jsx';
import RivalAvatar from './RivalAvatar.jsx';

const TABS = [
  { id: 'relics', label: 'TALISMÃS', ids: RELIC_IDS },
  { id: 'tiles', label: 'PEDRAS', ids: ENHANCEMENT_IDS },
  { id: 'rivals', label: 'RIVAIS', ids: RIVAL_IDS },
];

function Rarity({ id }) {
  const tier = getRarity(id);
  return (
    <span className={`rarity-badge ${tier.id === 'mitico' ? 'rarity-badge-mythic' : ''}`} style={{ '--rarity': tier.color }}>
      {tier.label}
    </span>
  );
}

function Entry({ kind, id, known }) {
  let icon;
  let name;
  let rarity = null;
  let text;
  if (kind === 'relics') {
    const relic = RELICS[id];
    icon = <RelicIcon relic={relic} size={30} />;
    name = relic.name;
    rarity = relic.rarity;
    text = relic.description;
  } else if (kind === 'tiles') {
    const enh = ENHANCEMENTS[id];
    icon = <DominoTile values={[3, 5]} unit={16} depth={2} enhancement={known ? id : null} />;
    name = `Pedra de ${enh.name}`;
    rarity = enh.rarity;
    text = enh.description;
  } else {
    const rival = RIVALS[id];
    icon = <RivalAvatar rival={rival} mood="idle" pixel={2} smoke={known} />;
    name = rival.name;
    text = `${rival.title} · ${REGIONS[rival.region - 1]?.name ?? ''}${rival.boss ? ' · CHEFE' : ''}`;
  }
  return (
    <RetroCard
      as="li"
      rarity={known && rarity ? rarity : 'neutral'}
      className={`book-entry ${known ? '' : 'book-entry-unknown'}`}
      style={rarity && known ? { '--rarity': getRarity(rarity).color } : undefined}
    >
      <span className="book-icon">
        <span className={known ? '' : 'map-silhouette'}>{icon}</span>
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-pixel text-[8px] leading-snug text-bone-50">{known ? name.toUpperCase() : '???'}</p>
        {known && rarity && <Rarity id={rarity} />}
        <p className="mt-0.5 font-term text-[15px] leading-[1.05] text-bone-300">{known ? text : 'Ainda não apareceu na sua mesa.'}</p>
      </div>
    </RetroCard>
  );
}

/**
 * COLEÇÕES — o Livro de Boteco: tudo que já passou pela sua mesa (na loja, na
 * hotbar do rival, no seu baralho). O que falta aparece como silhueta com "?".
 */
export default function CollectionBook({ collection }) {
  const [tab, setTab] = useState('relics');
  const current = TABS.find((t) => t.id === tab);
  const seen = new Set(collection[tab]);
  const found = current.ids.filter((id) => seen.has(id)).length;
  return (
    <div>
      {/* abas de fita marcadora, como num álbum encadernado */}
      <div className="sticky top-0 z-10 grid grid-cols-3 gap-1.5 pb-1" role="tablist" aria-label="Seções do livro">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className="book-ribbon font-pixel"
            data-tab={t.id}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-center font-pixel text-[8px] text-bone-400">
        {found}/{current.ids.length} DESCOBERTOS
      </p>
      <ul className="mt-2 grid gap-1.5" role="tabpanel">
        {current.ids.map((id) => (
          <Entry key={id} kind={tab} id={id} known={seen.has(id)} />
        ))}
      </ul>
    </div>
  );
}
