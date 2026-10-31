import { useState } from 'react';
import { ENHANCEMENTS, ENHANCEMENT_IDS } from '../data/enhancedTiles.js';
import { getRarity } from '../data/rarities.js';
import { RELICS, RELIC_IDS } from '../data/relics.js';
import { RIVALS, RIVAL_IDS } from '../data/rivals.js';
import { REGIONS } from '../data/campaign.js';
import { ACHIEVEMENT_BY_RELIC, ACHIEVEMENT_IDS, loadAchievementProgress, loadUnlockedAchievements } from '../engine/achievements.js';
import DominoTile from './DominoTile.jsx';
import RelicIcon from './RelicIcon.jsx';
import RivalAvatar from './RivalAvatar.jsx';
import { ArrowGlyph } from './UiGlyphs.jsx';
import { sound } from '../engine/audioSynth.js';

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

/** Versão 1.5: cada página do álbum tem 3 colunas × 4 prateleiras. */
const PER_PAGE = 12;

/** O que o álbum mostra de cada item: ícone do nicho, ícone grande da ficha, nome, raridade e texto. */
function entryOf(kind, id, { known, unlocked, achievement, progress }) {
  if (kind === 'relics') {
    const relic = RELICS[id];
    const locked = unlocked === false;
    return {
      icon: <RelicIcon relic={relic} size={40} />,
      big: <RelicIcon relic={relic} size={48} />,
      name: locked ? 'BLOQUEADO' : known ? relic.name : '???',
      rarity: known && !locked ? relic.rarity : null,
      text: locked ? null : known ? relic.description : 'Ainda não apareceu na sua mesa.',
      goal: locked ? achievement.goal : null,
      extra: locked ? progressText(achievement.id, progress) : null,
      badge: unlocked ? achievement.title : null,
      locked,
      known: known && !locked,
    };
  }
  if (kind === 'tiles') {
    const enh = ENHANCEMENTS[id];
    return {
      icon: <DominoTile values={[3, 5]} unit={15} depth={2} enhancement={known ? id : null} />,
      big: <DominoTile values={[3, 5]} unit={20} depth={3} enhancement={known ? id : null} />,
      name: known ? `Pedra de ${enh.name}` : '???',
      rarity: known ? enh.rarity : null,
      text: known ? enh.description : 'Ainda não apareceu na sua mesa.',
      known,
    };
  }
  const rival = RIVALS[id];
  return {
    icon: <RivalAvatar rival={rival} mood="idle" size={40} smoke={false} />,
    big: <RivalAvatar rival={rival} mood="idle" size={52} smoke={known} />,
    name: known ? rival.name : '???',
    rarity: null,
    text: known ? `${rival.title} · ${REGIONS[rival.region - 1]?.name ?? ''}${rival.boss ? ' · CHEFE' : ''}` : 'Ainda não apareceu na sua mesa.',
    known,
  };
}

/** Um nicho da prateleira: o item (ou o "?" de giz), com a cor da raridade na moldura. */
function Niche({ entry, selected, onPick }) {
  const tier = entry.rarity ? getRarity(entry.rarity) : null;
  return (
    <button
      type="button"
      role="listitem"
      className={`album-niche ${entry.known ? 'is-known' : 'is-locked'} ${selected ? 'is-selected' : ''} ${tier?.id === 'mitico' ? 'is-mythic' : ''}`}
      style={tier ? { '--rarity': tier.color } : undefined}
      onClick={onPick}
      aria-pressed={selected}
      aria-label={entry.known ? entry.name : entry.locked ? `Bloqueado: ${entry.goal}` : 'Ainda não descoberto'}
    >
      <span className={`album-niche-art ${entry.known ? '' : 'map-silhouette'}`} aria-hidden="true">
        {entry.icon}
      </span>
      {!entry.known && (
        <span className="album-chalk font-pixel" aria-hidden="true">
          ?
        </span>
      )}
    </button>
  );
}

/** A ficha que sobe do rodapé com o item tocado. */
function DetailSheet({ entry, onClose }) {
  return (
    <div className="album-sheet" role="dialog" aria-label={entry.name}>
      <span className={`album-sheet-art ${entry.known ? '' : 'map-silhouette'}`} aria-hidden="true">
        {entry.big}
      </span>
      <div className="min-w-0 flex-1">
        <p className="album-sheet-name font-pixel">{entry.name.toUpperCase()}</p>
        {entry.rarity && <Rarity id={entry.rarity} />}
        {entry.locked ? (
          <div className="book-unlock-goal mt-1">
            <p className="font-pixel text-[7px] leading-snug text-amber-300">[?] COMO DESBLOQUEAR:</p>
            <p className="mt-0.5 font-term text-[15px] leading-[1.05] text-amber-100">{entry.goal}</p>
            {entry.extra && <p className="mt-0.5 font-pixel text-[7px] leading-snug text-amber-400/80">{entry.extra}</p>}
          </div>
        ) : (
          <p className="album-sheet-text font-term">{entry.text}</p>
        )}
        {entry.badge && (
          <p className="book-unlocked-badge mt-1 font-pixel" title={`Conquista: ${entry.badge}`}>
            DESBLOQUEADO <span className="text-bone-300">· {entry.badge.toUpperCase()}</span>
          </p>
        )}
      </div>
      <button type="button" className="album-sheet-close font-pixel" onClick={onClose} aria-label="Fechar a ficha">
        ✕
      </button>
    </div>
  );
}

/**
 * COLEÇÕES — o Livro de Boteco: tudo que já passou pela sua mesa (na loja, na
 * hotbar do rival, no seu baralho). O que falta aparece como silhueta com "?".
 * Patch 0.7.0: os talismãs de conquista mostram a meta enquanto estão trancados
 * e, liberados, aparecem inteiros com o selo DESBLOQUEADO.
 * Versão 1.5: álbum de figurinhas. Cada página é uma prateleira de 3 × 4 nichos; tocar num
 * nicho sobe a ficha do item no rodapé (nome, raridade, efeito ou a meta). As setas, ou
 * arrastar para o lado, viram a página. Sem scroll.
 */
export default function CollectionBook({ collection }) {
  const [tab, setTab] = useState('relics');
  const [page, setPage] = useState(0);
  const [picked, setPicked] = useState(null);
  const [swipe, setSwipe] = useState(null);
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
  const pages = Math.max(1, Math.ceil(current.ids.length / PER_PAGE));
  const shownPage = Math.min(page, pages - 1);
  const ids = current.ids.slice(shownPage * PER_PAGE, shownPage * PER_PAGE + PER_PAGE);
  const entry = (id) =>
    entryOf(tab, id, { known: isKnown(id), unlocked: tab === 'relics' ? unlockedRelic(id) : null, achievement: ACHIEVEMENT_BY_RELIC[id], progress: achievements.progress });
  const turn = (step) => {
    const next = Math.max(0, Math.min(pages - 1, shownPage + step));
    if (next === shownPage) return;
    sound.playPageTurn();
    setPage(next);
    setPicked(null);
  };
  const pick = (id) => {
    sound.playTileSlam(false);
    setPicked((cur) => (cur === id ? null : id));
  };
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
            onClick={() => {
              setTab(t.id);
              setPage(0);
              setPicked(null);
            }}
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
      <div
        className="album relative mt-2 min-h-0 flex-1"
        onPointerDown={(e) => setSwipe({ x: e.clientX, id: e.pointerId })}
        onPointerUp={(e) => {
          if (!swipe || e.pointerId !== swipe.id) return;
          const dx = e.clientX - swipe.x;
          setSwipe(null);
          if (Math.abs(dx) > 50) turn(dx < 0 ? 1 : -1);
        }}
        onPointerCancel={() => setSwipe(null)}
      >
        <div key={`${tab}-${shownPage}`} className="album-shelves" role="list" aria-label={`${current.label}: página ${shownPage + 1} de ${pages}`}>
          {ids.map((id) => (
            <Niche key={id} entry={entry(id)} selected={picked === id} onPick={() => pick(id)} />
          ))}
          {Array.from({ length: PER_PAGE - ids.length }, (_, i) => (
            <span key={`vazio-${i}`} className="album-niche is-empty" aria-hidden="true" />
          ))}
        </div>
        {picked && ids.includes(picked) && <DetailSheet entry={entry(picked)} onClose={() => setPicked(null)} />}
      </div>
      <div className="album-pager mt-2 flex shrink-0 items-center justify-between">
        <button type="button" className="case-nav" onClick={() => turn(-1)} disabled={shownPage === 0} aria-label="Página anterior">
          <ArrowGlyph dir="prev" size={12} />
        </button>
        <span className="font-pixel text-[9px] text-bone-300">
          {shownPage + 1}/{pages}
        </span>
        <button type="button" className="case-nav" onClick={() => turn(1)} disabled={shownPage === pages - 1} aria-label="Próxima página">
          <ArrowGlyph dir="next" size={12} />
        </button>
      </div>
    </div>
  );
}
