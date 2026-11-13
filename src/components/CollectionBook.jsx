import { useEffect, useState, useSyncExternalStore } from 'react';
import { favoriteTileOf, loadAccountStats, subscribeAccountStats, tileNameOf, winRateOf } from '../engine/accountStats.js';
import { NovoLamp, NovoLogo, NovoStage, SaloonBack } from './novo/NovoKit.jsx';
import { TileSkinContext } from './tileSkin.js';
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
import DominoKey from './DominoKey.jsx';
import LandStage from './LandStage.jsx';
import { useLandscape } from './useLandscape.js';
import { BOOK_PAD, paintAlbumSpread } from './art/landBook.js';
import { sound } from '../engine/audioSynth.js';
import { rivalBlurb } from '../engine/rivalInfo.js';

const TABS = [
  { id: 'relics', label: 'TALISMÃS', one: 'TALISMÃ', ids: RELIC_IDS },
  { id: 'tiles', label: 'PEDRAS', one: 'PEDRA', ids: ENHANCEMENT_IDS },
  { id: 'rivals', label: 'RIVAIS', one: 'RIVAL', ids: RIVAL_IDS },
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

/** Os tamanhos dos desenhos: em pé (nicho e ficha) e deitado (figurinha e figurinha grande). */
const SIZES = {
  stand: { relic: [40, 48], tile: [15, 20], rival: [40, 52] },
  land: { relic: [46, 96], tile: [14, 26], rival: [56, 112] },
};

/** O que o álbum mostra de cada item: ícone do nicho, ícone grande da ficha, nome, raridade e texto. */
function entryOf(kind, id, { known, unlocked, achievement, progress }, sizes = SIZES.stand) {
  if (kind === 'relics') {
    const relic = RELICS[id];
    const locked = unlocked === false;
    return {
      icon: <RelicIcon relic={relic} size={sizes.relic[0]} />,
      big: <RelicIcon relic={relic} size={sizes.relic[1]} />,
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
      icon: <DominoTile values={[3, 5]} unit={sizes.tile[0]} depth={2} enhancement={known ? id : null} />,
      big: <DominoTile values={[3, 5]} unit={sizes.tile[1]} depth={3} enhancement={known ? id : null} />,
      name: known ? `Pedra de ${enh.name}` : '???',
      rarity: known ? enh.rarity : null,
      text: known ? enh.description : 'Ainda não apareceu na sua mesa.',
      known,
    };
  }
  const rival = RIVALS[id];
  return {
    icon: <RivalAvatar rival={rival} mood="idle" size={sizes.rival[0]} smoke={false} bare={!known} />,
    big: <RivalAvatar rival={rival} mood="idle" size={sizes.rival[1]} smoke={known} bare={!known} />,
    name: known ? rival.name : '???',
    rarity: null,
    text: known ? `${rival.title} · ${REGIONS[rival.region - 1]?.name ?? ''}${rival.boss ? ' · CHEFE' : ''}` : 'Ainda não apareceu na sua mesa.',
    blurb: known ? rivalBlurb(id) : null,
    quote: known ? (rival.lines?.intro?.[0] ?? null) : null,
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

/** O estado do álbum (aba, página, item tocado, conquistas), o mesmo em pé e deitado. */
function useAlbum(collection, sizes, perPage = PER_PAGE) {
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
  const pages = Math.max(1, Math.ceil(current.ids.length / perPage));
  const shownPage = Math.min(page, pages - 1);
  const ids = current.ids.slice(shownPage * perPage, shownPage * perPage + perPage);
  const entry = (id) =>
    entryOf(tab, id, { known: isKnown(id), unlocked: tab === 'relics' ? unlockedRelic(id) : null, achievement: ACHIEVEMENT_BY_RELIC[id], progress: achievements.progress }, sizes);
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
  const openTab = (id) => {
    setTab(id);
    setPage(0);
    setPicked(null);
  };
  return { tab, openTab, current, found, pages, shownPage, ids, entry, turn, pick, picked, setPicked, swipe, setSwipe, achievements };
}

/**
 * COLEÇÕES — o Livro de Boteco: tudo que já passou pela sua mesa (na loja, na
 * hotbar do rival, no seu baralho). O que falta aparece como silhueta com "?".
 * Patch 0.7.0: os talismãs de conquista mostram a meta enquanto estão trancados
 * e, liberados, aparecem inteiros com o selo DESBLOQUEADO.
 * Versão 1.5: álbum de figurinhas. Cada página é uma prateleira de 3 × 4 nichos; tocar num
 * nicho sobe a ficha do item no rodapé (nome, raridade, efeito ou a meta). As setas, ou
 * arrastar para o lado, viram a página. Sem scroll.
 * Versão 2.11: deitado, o livro abre inteiro na mesa (AlbumLand, com o próprio FECHAR).
 */
export default function CollectionBook({ collection, onClose, onStats }) {
  const landscape = useLandscape();
  if (landscape && onClose) return <AlbumLand collection={collection} onClose={onClose} onStats={onStats} />;
  return <AlbumStand collection={collection} />;
}

function AlbumStand({ collection }) {
  const { tab, openTab, current, found, pages, shownPage, ids, entry, turn, pick, picked, setPicked, swipe, setSwipe, achievements } = useAlbum(collection, SIZES.stand);
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
            onClick={() => openTab(t.id)}
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

/** Versão 2.11: uma figurinha da página (deitado). A que falta é só o quadrinho impresso, com o número. */
function Sticker({ entry, number, tilt, selected, onPick }) {
  const tier = entry.rarity ? getRarity(entry.rarity) : null;
  const state = entry.known ? 'is-known' : entry.locked ? 'is-locked' : 'is-missing';
  return (
    <button
      type="button"
      role="listitem"
      className={`lb-sticker ${state} ${selected ? 'is-selected' : ''} ${tier?.id === 'mitico' ? 'is-mythic' : ''}`}
      style={{ '--tilt': `${tilt}deg`, ...(tier ? { '--rarity': tier.color } : {}) }}
      onClick={onPick}
      aria-pressed={selected}
      aria-label={entry.known ? entry.name : entry.locked ? `Bloqueado: ${entry.goal}` : 'Ainda não descoberto'}
    >
      <span className="lb-sticker-num" aria-hidden="true">
        {number}
      </span>
      <span className={`lb-sticker-art ${entry.known ? '' : 'map-silhouette'}`} aria-hidden="true">
        {entry.icon}
      </span>
      {!entry.known && (
        <span className="lb-sticker-q" aria-hidden="true">
          ?
        </span>
      )}
    </button>
  );
}

/** A ficha da página da direita: a figurinha grande, o nome, a raridade e o que ela faz (ou a meta). */
function Ficha({ entry, kind, label }) {
  const tier = entry.rarity ? getRarity(entry.rarity) : null;
  return (
    <div className="lb-ficha" aria-live="polite">
      <p className="lb-kicker">{label}</p>
      <div className="lb-ficha-top">
        <div className={`lb-big ${entry.known ? 'is-known' : 'is-missing'} ${tier?.id === 'mitico' ? 'is-mythic' : ''}`} style={tier ? { '--rarity': tier.color } : undefined}>
          <span className={`lb-big-art ${entry.known ? '' : 'map-silhouette'}`} aria-hidden="true">
            {entry.big}
          </span>
          {!entry.known && (
            <span className="lb-big-q" aria-hidden="true">
              ?
            </span>
          )}
        </div>
        <div className="lb-ficha-id">
          <h3 className="lb-name">{entry.name.toUpperCase()}</h3>
          {entry.rarity && <Rarity id={entry.rarity} />}
          {kind === 'rivals' && entry.known && <p className="lb-sub">{entry.text}</p>}
          {entry.badge && <p className="lb-badge">✓ CONQUISTA · {entry.badge.toUpperCase()}</p>}
        </div>
      </div>
      <div className="lb-ficha-body">
        {entry.locked ? (
          <>
            <p className="lb-how">COMO DESBLOQUEAR</p>
            <p className="lb-text">{entry.goal}</p>
            {entry.extra && <p className="lb-progress">{entry.extra}</p>}
          </>
        ) : kind === 'rivals' && entry.known ? (
          <>
            {entry.blurb && <p className="lb-text">{entry.blurb}</p>}
            {entry.quote && <p className="lb-quote">“{entry.quote}”</p>}
          </>
        ) : (
          <p className={`lb-text ${entry.known ? '' : 'is-missing'}`}>{entry.text}</p>
        )}
      </div>
      <span aria-hidden="true" className={`lb-stamp ${entry.known ? 'is-known' : entry.locked ? 'is-locked' : 'is-missing'}`}>
        {entry.known ? 'COLADA' : entry.locked ? 'TRANCADA' : 'FALTA'}
      </span>
    </div>
  );
}

/**
 * Versão 2.11: o Livro de Boteco deitado. O álbum de couro aberto na mesa: as abas de couro em
 * cima; na página da esquerda as 12 figurinhas da folha (4 × 3), com as setas (ou arrastar) para
 * virar; na da direita, sempre aberta, a ficha da figurinha tocada (a primeira da folha, de saída).
 */
function AlbumLand({ collection, onClose, onStats }) {
  const { tab, openTab, current, found, pages, shownPage, ids, entry, turn, picked, setPicked, swipe, setSwipe, achievements } = useAlbum(collection, SIZES.land);
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const shown = picked && ids.includes(picked) ? picked : ids[0];
  const numberOf = (id) => String(current.ids.indexOf(id) + 1).padStart(2, '0');
  const choose = (id) => {
    if (id === shown) return;
    sound.playTileSlam(false);
    setPicked(id);
  };
  return (
    <LandStage paint={() => paintAlbumSpread()} cacheKey="land-livro" pad={BOOK_PAD} bleed="#0d0805" className="book-land land-fade-in" label="Livro de Boteco" role="dialog">
      <div className="lb-tabs" role="tablist" aria-label="Seções do livro">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className="lb-tab" data-tab={t.id} onClick={() => tab !== t.id && openTab(t.id)}>
            {t.label}
          </button>
        ))}
        {/* versão 2.20: no visual novo o Caderno de Fiado mora aqui, na COLEÇÃO */}
        {onStats && (
          <button type="button" className="lb-tab" data-tab="career" onClick={onStats}>
            CARREIRA
          </button>
        )}
      </div>
      <DominoKey label="FECHAR" pips={0} w={156} h={40} className="lb-close" onClick={onClose} />

      <section
        className="lb-left"
        aria-labelledby="book-title"
        onPointerDown={(e) => setSwipe({ x: e.clientX, id: e.pointerId })}
        onPointerUp={(e) => {
          if (!swipe || e.pointerId !== swipe.id) return;
          const dx = e.clientX - swipe.x;
          setSwipe(null);
          if (Math.abs(dx) > 50) turn(dx < 0 ? 1 : -1);
        }}
        onPointerCancel={() => setSwipe(null)}
      >
        <header className="lb-head">
          <p className="lb-book">LIVRO DE BOTECO</p>
          <h2 id="book-title" className="lb-title">
            {current.label}
          </h2>
          <p className="lb-count">
            {found}/{current.ids.length} DESCOBERTOS
            {tab === 'relics' && (
              <span className="lb-count-gold">
                {' '}
                · CONQUISTAS {achievements.done.size}/{ACHIEVEMENT_IDS.length}
              </span>
            )}
          </p>
        </header>
        <div key={`${tab}-${shownPage}`} className="lb-grid" role="list" aria-label={`${current.label}: página ${shownPage + 1} de ${pages}`}>
          {ids.map((id, i) => (
            <Sticker key={id} entry={entry(id)} number={numberOf(id)} tilt={((i * 7 + shownPage * 3) % 5) - 2} selected={shown === id} onPick={() => choose(id)} />
          ))}
          {Array.from({ length: PER_PAGE - ids.length }, (_, i) => (
            <span key={`vazio-${i}`} className="lb-sticker is-blank" aria-hidden="true" />
          ))}
        </div>
        <div className="lb-pager">
          <button type="button" className="lb-turn" onClick={() => turn(-1)} disabled={shownPage === 0} aria-label="Página anterior">
            <ArrowGlyph dir="prev" size={12} />
          </button>
          <span className="lb-folio">
            FOLHA {shownPage + 1} DE {pages}
          </span>
          <button type="button" className="lb-turn" onClick={() => turn(1)} disabled={shownPage === pages - 1} aria-label="Próxima página">
            <ArrowGlyph dir="next" size={12} />
          </button>
        </div>
      </section>

      <section className="lb-right">{shown && <Ficha entry={entry(shown)} kind={tab} label={`${current.one} Nº ${numberOf(shown)}`} />}</section>
    </LandStage>
  );
}


const SIZES_NOVO = { relic: [34, 70], tile: [10, 20], rival: [42, 84] };
/** Versão 2.29: a folha da Coleção nova cheia: 6 × 4 figurinhas (antes 2 fileiras e o resto vazio). */
const PER_PAGE_NOVO = 24;
const money = (n) => `$${n.toLocaleString('pt-BR')}`;

/** A aba CARREIRA da Coleção nova: o Caderno de Fiado em duas páginas. */
function CareerPages() {
  const stats = useSyncExternalStore(subscribeAccountStats, loadAccountStats, loadAccountStats);
  const rate = Math.round(winRateOf(stats) * 100);
  const favorite = favoriteTileOf(stats);
  const beaten = RIVAL_IDS.map((id) => [id, stats.rivalsDefeated?.[id] ?? 0])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);
  return (
    <>
      <div className="q-page q-l">
        <h3>RESUMO DA CARREIRA</h3>
        <div className="q-stat">
          <span>Runs zeradas / aproveitamento</span>
          <b>
            {stats.runsWon} · {rate}%
          </b>
        </div>
        <div className="q-stat">
          <span>Runs perdidas pelo caminho</span>
          <b>{stats.runsLost}</b>
        </div>
        <div className="q-stat">
          <span>Dinheiro gasto na vida</span>
          <b>{money(stats.totalGoldSpent)}</b>
        </div>
        <div className="q-stat">
          <span>Tampinhas de boteco</span>
          <b>{stats.totalCapsEarned}</b>
        </div>
        <h3 style={{ marginTop: 12 }}>PEÇA MAIS JOGADA</h3>
        <div className="q-mark">
          {favorite ? (
            <>
              <TileSkinContext.Provider value="bone">
                <DominoTile values={[favorite.b, favorite.a]} unit={22} depth={3} />
              </TileSkinContext.Provider>
              <p>
                A sua marca registrada: {tileNameOf(favorite.a, favorite.b)}
                <br />
                <b>
                  [{favorite.b}|{favorite.a}] · {favorite.count.toLocaleString('pt-BR')} {favorite.count === 1 ? 'vez' : 'vezes'}
                </b>
              </p>
            </>
          ) : (
            <p>Nenhuma pedra jogada ainda. A primeira fica anotada aqui.</p>
          )}
        </div>
      </div>
      <div className="q-page q-r">
        <h3>ANÁLISE DE DOMINÓ</h3>
        <div className="q-stat">
          <span>Especialista em múltiplos de 5</span>
          <b>{stats.totalMugginsClosed}</b>
        </div>
        <div className="q-stat">
          <span>Trancas vencidas na raça</span>
          <b>{stats.totalTrancasWon}</b>
        </div>
        <div className="q-stat">
          <span>Total de buchas batidas</span>
          <b>{stats.totalBuchasPlayed}</b>
        </div>
        <h3 style={{ marginTop: 12 }}>
          DOSSIÊ DE RIVAIS <small>vitórias</small>
        </h3>
        <div className="q-riv">
          {beaten.map(([id, count]) => (
            <div key={id} className="q-ph" title={RIVALS[id].name}>
              <RivalAvatar rival={RIVALS[id]} mood="idle" size={44} smoke={false} bare />
              <span>{count}×</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/**
 * Versão 2.25, visual novo: a COLEÇÃO (o Livro de Boteco e o Caderno de Fiado juntos) no livro
 * vermelho: as abas em cima, a folha das figurinhas à esquerda, a ficha da escolhida à direita,
 * e a aba CARREIRA com as contas da vida.
 */
export function CollectionNovo({ collection, onClose }) {
  const { tab, openTab, current, found, pages, shownPage, ids, entry, turn, picked, setPicked } = useAlbum(collection, SIZES_NOVO, PER_PAGE_NOVO);
  const [career, setCareer] = useState(false);
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const shown = picked && ids.includes(picked) ? picked : ids[0];
  const sel = shown ? entry(shown) : null;
  const tier = sel?.rarity ? getRarity(sel.rarity) : null;
  return (
    <NovoStage kind="collection" bleed="#0d0805" label="Coleção" className="nvs-over">
      <SaloonBack size={896} x={0} y={-46} filter="brightness(1.32) saturate(1.45) contrast(1.06) sepia(0.16)" />
      <div className="q-dim" />
      <NovoLamp left={425} top={0} />
      <div className="q-topbar">
        <NovoLogo />
      </div>
      <div className="q-tabs" style={{ left: 250, top: 28 }} role="tablist" aria-label="Seções da coleção">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={!career && tab === t.id}
            className={`q-tab ${!career && tab === t.id ? 'q-on' : ''}`}
            onClick={() => {
              setCareer(false);
              if (tab !== t.id) openTab(t.id);
            }}
          >
            {t.label}
          </button>
        ))}
        <button type="button" role="tab" aria-selected={career} className={`q-tab ${career ? 'q-on' : ''}`} onClick={() => setCareer(true)}>
          CARREIRA
        </button>
      </div>
      <div className="q-bookc" id={career ? 'career' : undefined}>
        {career ? (
          <CareerPages />
        ) : (
          <>
            <div className="q-page q-l">
              <h3>
                {current.label}{' '}
                <small>
                  {found}/{current.ids.length}
                </small>
              </h3>
              <div className="q-bar">
                <i style={{ width: `${Math.round((found / current.ids.length) * 100)}%` }} />
              </div>
              <div key={`${tab}-${shownPage}`} className="q-grid" role="list">
                {ids.map((id) => {
                  const e = entry(id);
                  const t = e.rarity ? getRarity(e.rarity) : null;
                  return (
                    <button
                      key={id}
                      type="button"
                      role="listitem"
                      className={`q-slot ${e.known ? '' : 'q-unk'} ${shown === id ? 'q-sel' : ''}`}
                      style={{ '--rc': t?.color ?? '#8a6a3a' }}
                      aria-pressed={shown === id}
                      aria-label={e.known ? e.name : e.locked ? `Bloqueado: ${e.goal}` : 'Ainda não descoberto'}
                      onClick={() => {
                        if (id === shown) return;
                        sound.playTileSlam(false);
                        setPicked(id);
                      }}
                    >
                      <span className={e.known ? '' : 'map-silhouette'}>{e.icon}</span>
                      {!e.known && <b>?</b>}
                    </button>
                  );
                })}
                {Array.from({ length: PER_PAGE_NOVO - ids.length }, (_, i) => (
                  <span key={`vazio-${i}`} className="q-slot q-empty" aria-hidden="true" />
                ))}
              </div>
              <div className="q-pager">
                <button type="button" onClick={() => turn(-1)} disabled={shownPage === 0} aria-label="Folha anterior">
                  ◀
                </button>
                <span>
                  FOLHA {shownPage + 1} DE {pages}
                </span>
                <button type="button" onClick={() => turn(1)} disabled={shownPage === pages - 1} aria-label="Próxima folha">
                  ▶
                </button>
              </div>
            </div>
            <div className="q-page q-r" aria-live="polite">
              {sel && (
                <>
                  <h3>{sel.name.toUpperCase()}</h3>
                  <div className="q-det">
                    <div className="q-big">
                      <span className={sel.known ? '' : 'map-silhouette'}>{sel.big}</span>
                    </div>
                    <div>
                      {tier && (
                        <span className="q-tagr" style={{ background: tier.color }}>
                          {tier.label}
                        </span>
                      )}
                      {sel.locked ? <p>{sel.goal}</p> : <p>{tab === 'rivals' && sel.known ? (sel.blurb ?? sel.text) : sel.text}</p>}
                      {sel.quote && <p className="q-q">“{sel.quote}”</p>}
                    </div>
                  </div>
                  {(sel.locked || sel.badge || (tab === 'rivals' && sel.known)) && (
                    <div className="q-how">
                      <b>{sel.locked ? 'COMO DESBLOQUEAR' : sel.badge ? 'CONQUISTA' : 'QUEM É'}</b>
                      {sel.locked ? (sel.extra ?? sel.goal) : sel.badge ? sel.badge : sel.text}
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
      <div className="q-ribbonm" />
      <button type="button" className="q-wood q-btn q-backbtn" onClick={onClose}>
        ◀ VOLTAR
      </button>
      <p className="q-ver">COLEÇÃO · o Livro de Boteco e o Caderno de Fiado juntos</p>
    </NovoStage>
  );
}
