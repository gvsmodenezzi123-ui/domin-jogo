import DominoTile from '../components/DominoTile.jsx';
import { HeartsBar, PixelHeart } from '../components/PixelHeart.jsx';
import { getRelic } from '../data/relics.js';
import { DAMAGE, handSum } from '../engine/dominoLogic.js';

const KIND_TITLE = {
  normal: 'BATIDA!',
  bucha: 'BATIDA DE BUCHA!',
  duasPontas: 'NAS DUAS PONTAS!',
  cruzada: 'CRUZADA!',
  tranca: 'TRANCA!',
  nocaute: 'NOCAUTE!',
  testamento: 'TESTAMENTO RASGADO!',
};

const TRANCA_REASON = {
  fechada: 'Mesa fechada: as sete pedras do número estão na mesa.',
  passes: 'Os dois passaram seguido.',
  bloqueio: 'Ninguém encaixa e o dorme secou.',
};

function subtitleFor(result, oppName) {
  const mine = result.winner === 'player';
  if (result.kind === 'testamento') {
    const lost = (result.burned ?? []).map((id) => getRelic(id)?.name).filter(Boolean).join(' e ');
    return result.owner === 'player' ? `O golpe fatal não pegou: a rodada volta do zero. Queimou: ${lost}.` : `${oppName} rasgou o testamento: a rodada volta do zero.`;
  }
  if (result.kind === 'nocaute') return mine ? `${oppName} caiu antes da batida.` : 'Você caiu antes da batida.';
  if (!result.winner) return 'Empate na contagem. Ninguém sangra.';
  if (result.kind === 'tranca') return mine ? 'Menor soma é sua.' : `Menor soma é de ${oppName}.`;
  return mine ? 'Você bateu.' : `${oppName} bateu.`;
}

function MiniHand({ tiles, label, points }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="font-pixel text-[8px] text-bone-300">{label}</span>
      <div className="flex max-w-[150px] flex-wrap justify-center gap-1">
        {tiles.length === 0 && <span className="font-term text-base text-bone-400">—</span>}
        {tiles.map((t) => (
          <DominoTile key={t.id} values={[t.a, t.b]} unit={11} depth={1} enhancement={t.enhancement} />
        ))}
      </div>
      <span className="font-pixel text-[9px] text-bone-100">{points ?? handSum(tiles)} pts</span>
    </div>
  );
}

/**
 * Patch PvP: o fim de uma rodada do duelo online. Mostra quem bateu (ou levou a tranca), o
 * dano nos corações de verdade e as duas mãos. O duelo vale até alguém zerar: PRÓXIMA RODADA
 * (os dois precisam tocar); na última, FIM DA NOITE.
 */
export default function PvpRoundResult({ view, result, nextSent, opp, onNextRound, onFinish }) {
  const rr = view.roundResult ?? {};
  const won = rr.winner === 'player';
  const tie = !rr.winner;
  const damage = rr.damage || 0;
  const name = opp.name.toUpperCase();

  return (
    <div className="overlay-backdrop animate-overlay-in fixed inset-0 z-50 flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-labelledby="pvp-round-title">
      <div className={`${won ? 'chalkboard' : 'overlay-card'} round-card pvp-round-card max-h-[94%] w-full max-w-[360px] overflow-hidden px-4 py-5 text-center`}>
        <p className={`font-pixel text-[9px] ${won ? 'chalk-dim' : 'text-bone-400'}`}>
          {`DUELO · RODADA ${view.round}`}
        </p>
        <h2 id="pvp-round-title" className={`mt-2 font-pixel text-[18px] leading-snug text-shadow-pixel ${won ? 'chalk-text' : tie ? 'text-bone-100' : 'text-blood-400'}`}>
          {KIND_TITLE[rr.kind] ?? 'FIM DA RODADA'}
        </h2>
        <p className={`mt-2 font-term text-xl ${won ? 'chalk-text' : 'text-bone-100'}`}>{subtitleFor(rr, opp.name)}</p>
        {rr.kind === 'tranca' && rr.reason && <p className="mt-1 font-term text-base text-bone-300">{TRANCA_REASON[rr.reason]}</p>}

        {damage > 0 && (
          <div className="mt-3 flex items-center justify-center gap-2 font-pixel text-[11px] text-blood-400">
            <span>−{damage}</span>
            <PixelHeart broken pixel={2} />
            <span className={won ? 'chalk-text' : 'text-bone-200'}>{won ? `EM ${name}` : 'EM VOCÊ'}</span>
          </div>
        )}

        <div className="mt-3 flex items-start justify-center gap-5">
          <MiniHand tiles={view.hands.player} label="SUA MÃO" points={rr.sums?.player} />
          <MiniHand tiles={view.hands.tioZe} label={`MÃO DE ${name}`} points={rr.sums?.tioZe} />
        </div>

        <div className="mt-3 flex items-center justify-center gap-4">
          <HeartsBar current={view.hearts.player} max={view.maxHearts.player} pixel={2} label="Seus corações" />
          <span className="font-pixel text-[8px] text-bone-400">×</span>
          <HeartsBar current={view.hearts.tioZe} max={view.maxHearts.tioZe} pixel={2} label={`Corações de ${opp.name}`} />
        </div>

        {result.matchOver ? (
          <button type="button" data-tone="play" className="btn-pixel mt-4 w-full" onClick={onFinish}>
            FIM DA NOITE →
          </button>
        ) : (
          <>
            <button type="button" data-tone="play" className="btn-pixel mt-4 w-full" onClick={onNextRound} disabled={nextSent}>
              {nextSent ? `ESPERANDO ${name}...` : 'PRÓXIMA RODADA'}
            </button>
            <p className="mt-2 font-term text-sm text-bone-400">O duelo só acaba quando alguém zerar.</p>
          </>
        )}
        <p className="mt-2 font-term text-sm text-bone-400">
          Dano: batida {DAMAGE.normal} · bucha {DAMAGE.bucha} · duas pontas {DAMAGE.duasPontas} · cruzada {DAMAGE.cruzada} · tranca {DAMAGE.tranca}
        </p>
      </div>
    </div>
  );
}
