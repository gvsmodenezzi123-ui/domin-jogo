import { useEffect } from 'react';
import { DAMAGE, MAX_HEARTS, handSum } from '../engine/dominoLogic.js';
import CoinCount from './CoinCount.jsx';
import DominoTile from './DominoTile.jsx';
import { HeartsBar, PixelHeart } from './PixelHeart.jsx';
import RivalAvatar from './RivalAvatar.jsx';

const KIND_TITLE = {
  normal: 'BATIDA!',
  bucha: 'BATIDA DE BUCHA!',
  cruzada: 'CRUZADA!',
  tranca: 'TRANCA!',
  nocaute: 'NOCAUTE!',
};

const KNOCKOUT_CAUSE = {
  rubi: 'O Rubi arrancou o último coração.',
  dedal: 'O Dedal de Chumbo cobrou a conta.',
  anel: 'O Anel do Bicheiro cobrou em sangue.',
  dev: 'Painel DEV.',
};

const TRANCA_REASON = {
  fechada: 'Mesa fechada: as sete pedras do número estão na mesa.',
  passes: 'Os dois passaram seguido.',
  bloqueio: 'Ninguém encaixa e o dorme secou.',
  forcada: 'Forçada pelo painel DEV.',
};

/** Depois de vencer a partida a loja abre sozinha (ou no botão). */
const AUTO_SHOP_MS = 4200;

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

function subtitleFor(result, rival) {
  const playerWon = result.winner === 'player';
  if (result.kind === 'nocaute') return KNOCKOUT_CAUSE[result.reason] ?? (playerWon ? `${rival.name} caiu antes da batida.` : 'Você caiu.');
  if (!result.winner) return 'Empate na contagem. Ninguém sangra.';
  if (result.kind === 'tranca') return playerWon ? 'Menor soma é sua.' : `Menor soma é de ${rival.name}.`;
  return playerWon ? 'Você bateu.' : `${rival.name} bateu.`;
}

/**
 * Resultado da rodada, da partida (vitória → loja) ou da run (você zerou).
 */
export default function RoundOverlay({ state, rival, onNext, onShop, autoShop = true, onRestart, onMenu }) {
  const { roundResult: result, phase, hands, hearts, coins, stats } = state;
  const matchWon = phase === 'matchWon';

  useEffect(() => {
    if (!matchWon || !autoShop) return undefined;
    const timer = setTimeout(onShop, AUTO_SHOP_MS);
    return () => clearTimeout(timer);
  }, [matchWon, autoShop, onShop]);

  if (!result) return null;
  const runOver = phase === 'gameOver';
  const playerWon = result.winner === 'player';
  const tie = !result.winner;
  const subtitle = subtitleFor(result, rival);
  const damage = result.damage || 0;
  const boosted = result.baseDamage && damage > result.baseDamage;
  const name = rival.name.toUpperCase();

  return (
    <div className="overlay-backdrop animate-overlay-in fixed inset-0 z-50 flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-labelledby="round-title">
      <div className="overlay-card max-h-[94%] w-full max-w-[360px] overflow-y-auto px-4 py-5 text-center">
        {matchWon && (
          <>
            <div className="mx-auto mb-3 w-fit">
              <RivalAvatar rival={rival} mood="hurt" pixel={5} />
            </div>
            <p className="font-pixel text-[8px] text-bone-400">PARTIDA {state.run.match} VENCIDA</p>
            <h2 id="round-title" className="mt-2 font-pixel text-[16px] leading-snug text-brass-300 text-shadow-pixel">
              VOCÊ QUEBROU {name}
            </h2>
            <p className="mt-2 font-term text-xl text-bone-200">
              {KIND_TITLE[result.kind]} {subtitle}
            </p>
            <div className="mt-3 flex items-center justify-center gap-2 font-pixel text-[10px] text-[#9fe08a]">
              <span>PRÊMIO</span>
              <CoinCount value={`${result.prize ?? 0}`} className="text-[12px]" />
            </div>
            <p className="mt-1 font-term text-base text-bone-300">Saldo: ${coins.player}</p>
            <button type="button" data-tone="brass" className="btn-pixel mt-5 w-full" onClick={onShop}>
              ENTRAR NA LOJA CLANDESTINA
            </button>
            <div className="loading-bar mt-2" style={{ animationDuration: `${AUTO_SHOP_MS}ms` }} aria-hidden="true" />
          </>
        )}

        {runOver && (
          <>
            <div className="mx-auto mb-3 w-fit">
              <RivalAvatar rival={rival} mood="smug" pixel={5} />
            </div>
            <p className="font-pixel text-[8px] text-bone-400">FIM DA RUN</p>
            <h2 id="round-title" className="mt-2 font-pixel text-[16px] leading-snug text-blood-400 text-shadow-pixel">
              {name} TE QUEBROU
            </h2>
            <p className="mt-2 font-term text-xl text-bone-200">
              {KIND_TITLE[result.kind]} {subtitle}
            </p>
            <dl className="mx-auto mt-4 grid max-w-[250px] grid-cols-2 gap-y-1 text-left font-term text-lg">
              <dt className="text-bone-300">Partidas vencidas</dt>
              <dd className="text-right text-bone-50">{stats.matchesWon}</dd>
              <dt className="text-bone-300">Rodadas vencidas</dt>
              <dd className="text-right text-bone-50">{stats.roundsWon.player}</dd>
              <dt className="text-bone-300">Moedas ganhas</dt>
              <dd className="text-right text-bone-50">${stats.coinsEarned}</dd>
              <dt className="text-bone-300">Pedras de grife</dt>
              <dd className="text-right text-bone-50">{Object.keys(state.decks.player).length}</dd>
            </dl>
            <div className="mt-5 grid gap-2">
              <button type="button" data-tone="brass" className="btn-pixel" onClick={onRestart}>
                NOVA RUN
              </button>
              <button type="button" className="btn-pixel" onClick={onMenu}>
                MENU
              </button>
            </div>
          </>
        )}

        {!matchWon && !runOver && (
          <>
            <p className="font-pixel text-[9px] text-bone-400">
              PARTIDA {state.run.match} · RODADA {state.round}
            </p>
            <h2 id="round-title" className={`mt-2 font-pixel text-[20px] leading-snug text-shadow-pixel ${tie ? 'text-bone-100' : playerWon ? 'text-brass-300' : 'text-blood-400'}`}>
              {KIND_TITLE[result.kind]}
            </h2>
            <p className="mt-2 font-term text-xl text-bone-100">{subtitle}</p>
            {result.kind === 'tranca' && result.reason && (
              <p className="mt-1 font-term text-base text-bone-300">{TRANCA_REASON[result.reason]}</p>
            )}

            {damage > 0 && (
              <div className="mt-3 flex items-center justify-center gap-2 font-pixel text-[11px] text-blood-400">
                <span>−{damage}</span>
                <PixelHeart broken pixel={2} />
                <span className="text-bone-200">{playerWon ? `EM ${name}` : 'EM VOCÊ'}</span>
              </div>
            )}
            {boosted && (
              <p className="mt-1 font-pixel text-[7px] text-brass-300">
                BATIDA {result.baseDamage} + TALISMÃS = {damage}
              </p>
            )}

            <div className="mt-4 flex items-start justify-center gap-5">
              <MiniHand tiles={hands.player} label="SUA MÃO" points={result.sums?.player} />
              <MiniHand tiles={hands.tioZe} label={`MÃO DE ${name}`} points={result.sums?.tioZe} />
            </div>

            <div className="mt-4 flex items-center justify-center gap-4">
              <HeartsBar current={hearts.player} max={MAX_HEARTS} pixel={2} label="Seus corações" />
              <span className="font-pixel text-[8px] text-bone-400">×</span>
              <HeartsBar current={hearts.tioZe} max={state.maxHearts.tioZe} pixel={2} label={`Corações de ${rival.name}`} />
            </div>
            <p className="mt-2">
              <CoinCount value={coins.player} />
            </p>

            <p className="mt-3 font-term text-sm text-bone-400">
              Dano: batida {DAMAGE.normal} · bucha {DAMAGE.bucha} · cruzada {DAMAGE.cruzada} · tranca {DAMAGE.tranca}
            </p>

            <button type="button" data-tone="brass" className="btn-pixel mt-4 w-full" onClick={onNext}>
              PRÓXIMA RODADA
            </button>
          </>
        )}
      </div>
    </div>
  );
}
