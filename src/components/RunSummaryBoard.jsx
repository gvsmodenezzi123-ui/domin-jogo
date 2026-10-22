import { useSyncExternalStore } from 'react';
import { REGIONS } from '../data/campaign.js';
import { modeOf } from '../data/difficulty.js';
import { maletaOf } from '../data/maletas.js';
import { sound } from '../engine/audioSynth.js';
import { currentNode } from '../engine/campaignMap.js';
import { loadRunStats, subscribeRunStats } from '../engine/runStats.js';
import { biggestRivalNameOf, outcomeTitleOf, runSummaryText } from '../engine/runSummary.js';
import { seedLabelOf } from '../engine/seedEngine.js';
import SeedChip from './SeedChip.jsx';
import { BottleCapIcon } from './art/MetaArt.jsx';
import { useCopyFeedback } from './useCopyFeedback.js';

/** Versão que vai no resumo copiado. */
const VERSION = '0.9.3';

/** Uma casa do placar a giz: o rótulo miúdo em cima, o número grande embaixo. */
function Cell({ label, children, wide = false }) {
  return (
    <li className={`slate-cell ${wide ? 'is-wide' : ''}`}>
      <span className="slate-label">{label}</span>
      <span className="slate-value">{children}</span>
    </li>
  );
}

/**
 * A lousa do fim da tentativa (Patch 0.9.2): quadro-negro de bar em moldura de madeira, com
 * o desfecho escrito a giz ("TENTATIVA CONCLUÍDA" / "NOCAUTEADO POR ..."), a semente com o
 * botão de copiar, os números da run (engine/runStats.js), uma ficha curta (mesas, região,
 * modo e maleta) e o COPIAR RESUMO. Embaixo, a canaleta com os tocos de giz e o apagador.
 * GameOverModal e VictoryModal põem esta lousa no fim da run; a Conta do Boteco vem depois.
 */
export default function RunSummaryBoard({ state, won, rivalName, titleId = 'slate-title' }) {
  const stats = useSyncExternalStore(subscribeRunStats, loadRunStats, loadRunStats);
  const [status, copy] = useCopyFeedback();
  const algoz = biggestRivalNameOf(stats);
  const region = currentNode(state)?.region ?? 1;
  const copyLabel = status === 'ok' ? 'RESUMO COPIADO!' : status === 'fail' ? 'NÃO DEU PARA COPIAR' : 'COPIAR RESUMO';

  return (
    <section className="run-slate" aria-labelledby={titleId}>
      <div className="run-slate-board">
        <span aria-hidden="true" className="slate-doodle slate-doodle-tally" />
        <span aria-hidden="true" className="slate-doodle slate-doodle-tile" />
        <p className="slate-kicker">{won ? 'A CONTA FECHOU' : 'FIM DA TENTATIVA'}</p>
        <h3 id={titleId} className={`slate-title ${won ? 'is-won' : 'is-lost'}`}>
          {outcomeTitleOf(won, rivalName)}
        </h3>
        <SeedChip code={seedLabelOf(state)} className="slate-seed" />

        <ul className="slate-grid">
          <Cell label="BUCHAS JOGADAS">{stats.doublePlays}</Cell>
          <Cell label="MÚLTIPLOS DE 5 FECHADOS">
            {stats.mugginsHit} <span className="slate-gain">(+${stats.mugginsGoldEarned} ganhos)</span>
          </Cell>
          <Cell label="DESEMPENHO EM TRANCAS" wide>
            Vitórias: {stats.trancaWins} | Derrotas: {stats.trancaLosses}
          </Cell>
          <Cell label="MAIOR ALGOZ">{algoz ?? 'ninguém'}</Cell>
          <Cell label="TAMPINHAS DE BOTECO CONQUISTADAS">
            <span className="slate-caps">
              +{stats.tampinhasCollected} {stats.tampinhasCollected === 1 ? 'Tampinha' : 'Tampinhas'} <BottleCapIcon className="h-4 w-4" />
            </span>
          </Cell>
        </ul>

        <p className="slate-sheet">
          {state.stats.matchesWon} {state.stats.matchesWon === 1 ? 'mesa vencida' : 'mesas vencidas'} · Região {region}/{REGIONS.length} · {modeOf(state.mode).name} ·{' '}
          {maletaOf(state.maleta).short}
        </p>

        <button
          type="button"
          className={`slate-copy ${status === 'ok' ? 'is-ok' : status === 'fail' ? 'is-fail' : ''}`}
          onClick={() => {
            sound.playClick();
            copy(runSummaryText({ state, stats, won, rivalName, version: VERSION }));
          }}
        >
          {copyLabel}
        </button>
        <span className="sr-only" role="status" aria-live="polite">
          {status === 'ok' ? 'Resumo copiado' : status === 'fail' ? 'Não foi possível copiar' : ''}
        </span>
      </div>
      <div aria-hidden="true" className="run-slate-tray">
        <span className="slate-chalk" />
        <span className="slate-chalk is-short" />
        <span className="slate-eraser" />
      </div>
    </section>
  );
}
