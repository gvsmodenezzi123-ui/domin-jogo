import { useEffect, useSyncExternalStore } from 'react';
import { getRival } from '../data/rivals.js';
import {
  biggestNemesisOf,
  biggestVictimOf,
  favoriteTileOf,
  loadAccountStats,
  subscribeAccountStats,
  tileNameOf,
  winRateOf,
} from '../engine/accountStats.js';
import DominoKey from './DominoKey.jsx';
import DominoTile from './DominoTile.jsx';
import LandStage from './LandStage.jsx';
import PagedBlocks from './PagedBlocks.jsx';
import RivalAvatar from './RivalAvatar.jsx';
import { BottleCapIcon } from './art/MetaArt.jsx';
import { TileSkinContext } from './tileSkin.js';
import { useLandscape } from './useLandscape.js';
import { BOOK_PAD, paintNotebookSpread } from './art/landBook.js';

const money = (n) => `$${n.toLocaleString('pt-BR')}`;
const times = (n) => `${n.toLocaleString('pt-BR')} ${n === 1 ? 'vez' : 'vezes'}`;

/**
 * Uma linha da conta: rótulo à esquerda, valor à direita, pontinhos no meio. `stacked`: o
 * valor comprido vai na linha de baixo, em destaque.
 */
function Entry({ label, children, stacked = false }) {
  return (
    <div className={`ledger-entry ${stacked ? 'is-stacked' : ''}`}>
      <span className="ledger-label">{label}</span>
      <span className="ledger-dots" aria-hidden="true" />
      <span className="ledger-value">{children}</span>
    </div>
  );
}

/** Ficha de um rival no dossiê (retrato, nome e o número). */
function RivalCard({ kicker, entry, verb, empty }) {
  const rival = entry ? getRival(entry.id) : null;
  return (
    <div className="ledger-rival">
      <p className="ledger-kicker">{kicker}</p>
      {rival ? (
        <div className="ledger-rival-body">
          <span className="ledger-rival-portrait">
            <RivalAvatar rival={rival} mood={verb === 'derrotado' ? 'hurt' : 'smug'} size={44} smoke={false} />
          </span>
          <span className="min-w-0">
            <span className="ledger-rival-name">{rival.name}</span>
            <span className="ledger-rival-count">
              {verb === 'derrotado' ? `derrotado ${times(entry.count)}` : `te eliminou ${times(entry.count)}`}
            </span>
          </span>
        </div>
      ) : (
        <p className="ledger-empty">{empty}</p>
      )}
    </div>
  );
}

/**
 * O Caderno de Fiado (Patch 0.9.1): as estatísticas da conta, a carreira inteira do jogador
 * (engine/accountStats.js). Caderno de papel pardo gasto com cantoneiras de lata, linhas
 * pautadas e margem vermelha, letra de máquina. Três páginas: Resumo da Carreira, Análise de
 * Dominó e Dossiê de Rivais. Abre pelo ícone do caderno no alto da tela inicial; VOLTAR AO
 * MENU (ou Esc) fecha.
 * Patch 0.9.3: sem scroll. As linhas do caderno se repartem em folhas (PagedBlocks), com as
 * setas a lápis embaixo; o título de cada parte nunca fica sozinho no pé da folha.
 */
export default function AccountStatsModal({ onClose }) {
  const stats = useSyncExternalStore(subscribeAccountStats, loadAccountStats, loadAccountStats);
  const landscape = useLandscape();
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const rate = Math.round(winRateOf(stats) * 100);
  const favorite = favoriteTileOf(stats);
  const victim = biggestVictimOf(stats);
  const nemesis = biggestNemesisOf(stats);

  if (landscape) return <LedgerLand stats={stats} rate={rate} favorite={favorite} victim={victim} nemesis={nemesis} onClose={onClose} />;

  return (
    <div className="overlay-backdrop fixed inset-0 z-[75] flex items-center justify-center px-3" role="dialog" aria-modal="true" aria-labelledby="ledger-title">
      <div className="ledger-book animate-modal-in flex max-h-[92%] w-full max-w-[420px] flex-col">
        <span aria-hidden="true" className="ledger-corner ledger-corner-tl" />
        <span aria-hidden="true" className="ledger-corner ledger-corner-tr" />
        <span aria-hidden="true" className="ledger-corner ledger-corner-bl" />
        <span aria-hidden="true" className="ledger-corner ledger-corner-br" />
        <div aria-hidden="true" className="ledger-spiral" />

        <header className="ledger-head">
          <div className="min-w-0">
            <h2 id="ledger-title" className="ledger-title">
              CADERNO DE FIADO
            </h2>
            <p className="ledger-sub">A sua carreira no boteco, anotada a lápis</p>
          </div>
          <button type="button" className="btn-pixel btn-mini ledger-back" onClick={onClose}>
            VOLTAR AO MENU
          </button>
        </header>

        <div className="ledger-page flex min-h-0 flex-1 flex-col overflow-hidden">
          <PagedBlocks className="min-h-0 flex-1" gap={0} theme="ledger" label="Folhas do caderno">
            <h3 id="ledger-career" className="ledger-section" data-keep>
              RESUMO DA CARREIRA
            </h3>
            <Entry label="Runs zeradas / taxa de vitória" stacked>
              {stats.runsWon} {stats.runsWon === 1 ? 'vitória' : 'vitórias'} / {stats.runsStarted} {stats.runsStarted === 1 ? 'iniciada' : 'iniciadas'} ({rate}% de aproveitamento)
            </Entry>
            <Entry label="Runs perdidas pelo caminho">{stats.runsLost}</Entry>
            <Entry label="Total de dinheiro gasto na vida">{money(stats.totalGoldSpent)}</Entry>
            <Entry label="Tampinhas de boteco coletadas">
              <span className="ledger-caps">
                <BottleCapIcon className="h-4 w-4" />
                {stats.totalCapsEarned}
              </span>
            </Entry>

            <h3 id="ledger-domino" className="ledger-section" data-keep>
              ANÁLISE DE DOMINÓ
            </h3>
            <div className="ledger-favorite">
              <p className="ledger-kicker">PEÇA MAIS JOGADA (SUA MARCA REGISTRADA)</p>
              {favorite ? (
                <div className="ledger-favorite-body">
                  <TileSkinContext.Provider value="bone">
                    <DominoTile values={[favorite.b, favorite.a]} unit={20} depth={3} orientation="horizontal" className="ledger-favorite-tile" />
                  </TileSkinContext.Provider>
                  <span>
                    <span className="ledger-favorite-name">
                      {tileNameOf(favorite.a, favorite.b)} [{favorite.b}|{favorite.a}]
                    </span>
                    <span className="ledger-favorite-count">entrou na mesa {times(favorite.count)}</span>
                  </span>
                </div>
              ) : (
                <p className="ledger-empty">Nenhuma pedra jogada ainda. A primeira fica anotada aqui.</p>
              )}
            </div>
            <Entry label="Especialista em múltiplos de 5" stacked>
              {times(stats.totalMugginsClosed)} fechadas, gerando {money(stats.totalMugginsEarnings)} no bolso
            </Entry>
            <Entry label="Trancas vencidas na raça">
              {stats.totalTrancasWon} {stats.totalTrancasWon === 1 ? 'tranca' : 'trancas'}
            </Entry>
            <Entry label="Total de buchas batidas">
              {stats.totalBuchasPlayed} {stats.totalBuchasPlayed === 1 ? 'bucha' : 'buchas'}
            </Entry>

            <h3 id="ledger-rivals" className="ledger-section" data-keep>
              DOSSIÊ DE RIVAIS
            </h3>
            <RivalCard kicker="MAIOR VÍTIMA" entry={victim} verb="derrotado" empty="Ninguém derrubado ainda." />
            <RivalCard kicker="MAIOR ALGOZ / PEDRA NO SAPATO" entry={nemesis} verb="algoz" empty="Ninguém te eliminou. Ainda." />
            <p className="ledger-foot">Conta corrente desde o Patch 0.9.1. "Apagar tudo" não rasga este caderno.</p>
          </PagedBlocks>
        </div>
      </div>
    </div>
  );
}

/** Um número grande a lápis, com o rótulo miúdo embaixo (o resumo da carreira, deitado). */
function Tally({ label, children, tone = '' }) {
  return (
    <div className={`fl-tally ${tone}`}>
      <span className="fl-tally-num">{children}</span>
      <span className="fl-tally-label">{label}</span>
    </div>
  );
}

/** Uma linha do caderno deitado: rótulo, pontinhos e valor, sentada na pauta. */
function Line({ label, children, stacked = false }) {
  return stacked ? (
    <div className="fl-line is-stacked">
      <span className="fl-label">{label}</span>
      <span className="fl-value">{children}</span>
    </div>
  ) : (
    <div className="fl-line">
      <span className="fl-label">{label}</span>
      <span className="fl-dots" aria-hidden="true" />
      <span className="fl-value">{children}</span>
    </div>
  );
}

/** A ficha de um rival no dossiê deitado (as duas lado a lado). */
function RivalNote({ kicker, entry, verb, empty }) {
  const rival = entry ? getRival(entry.id) : null;
  return (
    <div className="fl-rival">
      <p className="fl-kicker">{kicker}</p>
      {rival ? (
        <div className="fl-rival-body">
          <span className="fl-rival-photo">
            <RivalAvatar rival={rival} mood={verb === 'derrotado' ? 'hurt' : 'smug'} size={50} smoke={false} />
          </span>
          <span className="min-w-0">
            <span className="fl-rival-name">{rival.name}</span>
            <span className="fl-rival-count">{verb === 'derrotado' ? `derrotado ${times(entry.count)}` : `te eliminou ${times(entry.count)}`}</span>
          </span>
        </div>
      ) : (
        <p className="fl-empty">{empty}</p>
      )}
    </div>
  );
}

/**
 * Versão 2.11: o Caderno de Fiado deitado. O caderno de espiral aberto na mesa, as duas folhas
 * de uma vez (sem virar página): na da esquerda o resumo da carreira, com os números grandes a
 * lápis, e a sua pedra mais jogada; na da direita a análise de dominó e o dossiê dos rivais.
 * Tudo sentado na pauta.
 */
function LedgerLand({ stats, rate, favorite, victim, nemesis, onClose }) {
  return (
    <LandStage paint={() => paintNotebookSpread()} cacheKey="land-caderno" pad={BOOK_PAD} bleed="#0d0805" className="ledger-land land-fade-in" label="Caderno de Fiado" role="dialog">
      <DominoKey label="VOLTAR" pips={1} w={156} h={40} className="fl-close" onClick={onClose} />
      <section className="fl-page is-left" aria-labelledby="ledger-title">
        <h2 id="ledger-title" className="fl-title">
          CADERNO DE FIADO
        </h2>
        <p className="fl-sub">A sua carreira no boteco, anotada a lápis</p>
        <h3 className="fl-section">RESUMO DA CARREIRA</h3>
        <div className="fl-tallies">
          <Tally label={stats.runsWon === 1 ? 'VITÓRIA' : 'VITÓRIAS'} tone="is-win">
            {stats.runsWon}
          </Tally>
          <Tally label={stats.runsStarted === 1 ? 'RUN INICIADA' : 'RUNS INICIADAS'}>{stats.runsStarted}</Tally>
          <Tally label="APROVEITAMENTO" tone="is-rate">
            {rate}%
          </Tally>
        </div>
        <Line label="Runs perdidas pelo caminho">{stats.runsLost}</Line>
        <Line label="Dinheiro gasto na vida">{money(stats.totalGoldSpent)}</Line>
        <Line label="Tampinhas de boteco">
          <span className="fl-caps">
            <BottleCapIcon className="h-4 w-4" />
            {stats.totalCapsEarned}
          </span>
        </Line>
        <h3 className="fl-section">PEÇA MAIS JOGADA</h3>
        <p className="fl-kicker">A SUA MARCA REGISTRADA</p>
        {favorite ? (
          <div className="fl-favorite">
            <TileSkinContext.Provider value="bone">
              <DominoTile values={[favorite.b, favorite.a]} unit={20} depth={3} orientation="horizontal" className="fl-favorite-tile" />
            </TileSkinContext.Provider>
            <span className="min-w-0">
              <span className="fl-favorite-name">
                {tileNameOf(favorite.a, favorite.b)} [{favorite.b}|{favorite.a}]
              </span>
              <span className="fl-favorite-count">entrou na mesa {times(favorite.count)}</span>
            </span>
          </div>
        ) : (
          <p className="fl-empty is-tall">Nenhuma pedra jogada ainda. A primeira fica anotada aqui.</p>
        )}
      </section>

      <section className="fl-page is-right" aria-label="Análise de dominó e dossiê de rivais">
        <h3 className="fl-section">ANÁLISE DE DOMINÓ</h3>
        <Line label="Especialista em múltiplos de 5" stacked>
          {times(stats.totalMugginsClosed)} fechadas, gerando {money(stats.totalMugginsEarnings)} no bolso
        </Line>
        <Line label="Trancas vencidas na raça">
          {stats.totalTrancasWon} {stats.totalTrancasWon === 1 ? 'tranca' : 'trancas'}
        </Line>
        <Line label="Total de buchas batidas">
          {stats.totalBuchasPlayed} {stats.totalBuchasPlayed === 1 ? 'bucha' : 'buchas'}
        </Line>
        <h3 className="fl-section">DOSSIÊ DE RIVAIS</h3>
        <div className="fl-rivals">
          <RivalNote kicker="MAIOR VÍTIMA" entry={victim} verb="derrotado" empty="Ninguém derrubado ainda." />
          <RivalNote kicker="PEDRA NO SAPATO" entry={nemesis} verb="algoz" empty="Ninguém te eliminou. Ainda." />
        </div>
        <span aria-hidden="true" className="fl-doodle" />
        <p className="fl-foot">Conta corrente desde o Patch 0.9.1. &quot;Apagar tudo&quot; não rasga este caderno.</p>
      </section>
    </LandStage>
  );
}
