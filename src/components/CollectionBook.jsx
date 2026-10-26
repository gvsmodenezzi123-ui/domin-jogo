import { useState } from 'react';
import { ENHANCEMENTS, ENHANCEMENT_IDS } from '../data/enhancedTiles.js';
import { getRarity } from '../data/rarities.js';
import { RELICS, RELIC_IDS } from '../data/relics.js';
import { RIVALS, RIVAL_IDS } from '../data/rivals.js';
import { REGIONS } from '../data/campaign.js';
import { ACHIEVEMENT_BY_RELIC, ACHIEVEMENT_IDS, loadAchievementProgress, loadUnlockedAchievements } from '../engine/achievements.js';
import DominoTile from './DominoTile.jsx';
import RelicIcon from './RelicIcon.jsx';
import { RetroCard } from './RetroCard.jsx';
import RivalAvatar from './RivalAvatar.jsx';
import PagedBlocks from './PagedBlocks.jsx';

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

/** Progresso das metas que somam (as outras são de uma jogada só). */
function progressText(achievementId, progress) {
  if (achievementId === 'fregues_ze') return `Tio Zé derrotado: ${Math.min(progress.tio_ze_defeats, 2)}/2`;
  if (achievementId === 'colecionador') return `Comuns básicos equipados: ${Math.min(progress.used_common_relics.length, 6)}/6`;
  if (achievementId === 'rei_sinuca') return `Campanhas no Normal: ${Math.min(progress.normal_mode_clears, 2)}/2`;
  // versão 1.4
  if (achievementId === 'mao_pesada') return `Rodadas com mais de 45 pontos: ${Math.min(progress.heavy_hands ?? 0, 3)}/3`;
  if (achievementId === 'olho_clinico') return `Vitórias nas Pretas ou Prateadas: ${Math.min(progress.dark_mode_wins ?? 0, 5)}/5`;
  return null;
}

/**
 * Talismã trancado por conquista (Patch 0.7.0): silhueta escura com um "?" de pixel,
 * BLOQUEADO no nome e, no lugar do efeito, a meta numa caixa pontilhada âmbar.
 */
function LockedRelic({ relic, achievement, progress }) {
  const extra = progressText(achievement.id, progress);
  return (
    <RetroCard as="div" role="listitem" rarity="neutral" className="book-entry book-entry-locked">
      <span className="book-icon book-icon-lg">
        <span className="book-lock-silhouette" aria-hidden="true">
          <RelicIcon relic={relic} size={40} />
        </span>
        <span className="book-lock-mark font-pixel" aria-hidden="true">
          ?
        </span>
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-pixel text-[8px] leading-snug text-bone-400">BLOQUEADO</p>
        <div className="book-unlock-goal mt-1">
          <p className="font-pixel text-[7px] leading-snug text-amber-300">[?] COMO DESBLOQUEAR:</p>
          <p className="mt-0.5 font-term text-[15px] leading-[1.05] text-amber-100">{achievement.goal}</p>
          {extra && <p className="mt-0.5 font-pixel text-[7px] leading-snug text-amber-400/80">{extra}</p>}
        </div>
      </div>
    </RetroCard>
  );
}

function Entry({ kind, id, known, badge = null }) {
  let icon;
  let name;
  let rarity = null;
  let text;
  if (kind === 'relics') {
    const relic = RELICS[id];
    icon = <RelicIcon relic={relic} size={40} />;
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
      as="div"
      role="listitem"
      rarity={known && rarity ? rarity : 'neutral'}
      className={`book-entry ${known ? '' : 'book-entry-unknown'}`}
      style={rarity && known ? { '--rarity': getRarity(rarity).color } : undefined}
    >
      <span className={`book-icon ${kind === 'relics' ? 'book-icon-lg' : ''}`}>
        <span className={known ? '' : 'map-silhouette'}>{icon}</span>
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-pixel text-[8px] leading-snug text-bone-50">{known ? name.toUpperCase() : '???'}</p>
        {known && rarity && <Rarity id={rarity} />}
        <p className="mt-0.5 font-term text-[15px] leading-[1.05] text-bone-300">{known ? text : 'Ainda não apareceu na sua mesa.'}</p>
        {badge && (
          <p className="book-unlocked-badge mt-1 font-pixel" title={`Conquista: ${badge}`}>
            DESBLOQUEADO <span className="text-bone-300">· {badge.toUpperCase()}</span>
          </p>
        )}
      </div>
    </RetroCard>
  );
}

/**
 * COLEÇÕES — o Livro de Boteco: tudo que já passou pela sua mesa (na loja, na
 * hotbar do rival, no seu baralho). O que falta aparece como silhueta com "?".
 * Patch 0.7.0: os 10 talismãs de conquista mostram a meta enquanto estão trancados
 * e, liberados, aparecem inteiros com o selo DESBLOQUEADO.
 * Patch 0.9.3: sem scroll. Cada seção vira páginas de livro (PagedBlocks): as setas embaixo,
 * ou arrastar para o lado, viram a folha. Trocar de fita volta para a primeira página.
 */
export default function CollectionBook({ collection }) {
  const [tab, setTab] = useState('relics');
  // lido uma vez ao abrir o livro (as conquistas moram no storage, fora do estado da run)
  const [achievements] = useState(() => ({ done: new Set(loadUnlockedAchievements()), progress: loadAchievementProgress() }));
  const current = TABS.find((t) => t.id === tab);
  const seen = new Set(collection[tab]);
  const unlockedRelic = (id) => {
    const achievement = ACHIEVEMENT_BY_RELIC[id];
    return achievement ? achievements.done.has(achievement.id) : null;
  };
  // talismã de conquista liberado conta como visto (ele aparece inteiro no livro)
  const isKnown = (id) => seen.has(id) || (tab === 'relics' && unlockedRelic(id) === true);
  const found = current.ids.filter(isKnown).length;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* abas de fita marcadora, como num álbum encadernado */}
      <div className="grid shrink-0 grid-cols-3 gap-1.5 pb-1" role="tablist" aria-label="Seções do livro">
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
      <p className="mt-2 shrink-0 text-center font-pixel text-[8px] text-bone-400">
        {found}/{current.ids.length} DESCOBERTOS
        {tab === 'relics' && (
          <span className="text-amber-300">
            {' '}
            · CONQUISTAS {achievements.done.size}/{ACHIEVEMENT_IDS.length}
          </span>
        )}
      </p>
      <PagedBlocks key={tab} className="book-pages mt-2 min-h-0 flex-1" gap={6} theme="book" role="list" label={`Páginas de ${current.label.toLowerCase()}`}>
        {current.ids.map((id) => {
          const unlocked = tab === 'relics' ? unlockedRelic(id) : null;
          if (unlocked === false) return <LockedRelic key={id} relic={RELICS[id]} achievement={ACHIEVEMENT_BY_RELIC[id]} progress={achievements.progress} />;
          return <Entry key={id} kind={tab} id={id} known={isKnown(id)} badge={unlocked ? ACHIEVEMENT_BY_RELIC[id].title : null} />;
        })}
      </PagedBlocks>
    </div>
  );
}
