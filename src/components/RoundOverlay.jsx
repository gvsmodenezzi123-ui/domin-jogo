import { RARITIES, getRelic } from '../data/relics.js';
import { DAMAGE, MAX_HEARTS, handSum } from '../engine/dominoLogic.js';
import DominoTile from './DominoTile.jsx';
import { CoinCount, TioZeAvatar } from './OpponentHeader.jsx';
import { HeartsBar, PixelHeart } from './PixelHeart.jsx';
import PixelSprite from './PixelSprite.jsx';

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

/** Talismã que caiu do bolso do Tio Zé depois da rodada. */
function RewardCard({ id }) {
  const relic = getRelic(id);
  if (!relic) return null;
  const rarity = RARITIES[relic.rarity];
  return (
    <div className="reward-card mt-3 flex gap-3 px-3 py-2.5 text-left" style={{ '--rarity': rarity.color }}>
      <span className="shrink-0 pt-0.5">
        <PixelSprite rows={relic.icon} palette={relic.palette} pixel={3} />
      </span>
      <div className="min-w-0">
        <p className="font-pixel text-[7px] text-bone-300">TALISMÃ ACHADO</p>
        <p className="mt-1 font-pixel text-[9px] leading-snug text-bone-50">{relic.name.toUpperCase()}</p>
        <p className="mt-1 font-pixel text-[7px]" style={{ color: rarity.color }}>
          {rarity.label}
        </p>
        <p className="mt-1 font-term text-base leading-tight text-bone-200">{relic.description}</p>
      </div>
    </div>
  );
}

/** Resultado da rodada (ou do duelo, quando alguém zerou os corações). */
export default function RoundOverlay({ state, onNext, onRestart, onMenu }) {
  const { roundResult: result, phase, hands, hearts, coins, stats } = state;
  if (!result) return null;
  const gameOver = phase === 'gameOver';
  const playerWon = result.winner === 'player';
  const tie = !result.winner;

  let subtitle;
  if (result.kind === 'nocaute') subtitle = KNOCKOUT_CAUSE[result.reason] ?? (playerWon ? 'O Tio Zé caiu antes da batida.' : 'Você caiu.');
  else if (tie) subtitle = 'Empate na contagem. Ninguém sangra.';
  else if (result.kind === 'tranca') subtitle = playerWon ? 'Menor soma é sua.' : 'Menor soma é do Tio Zé.';
  else subtitle = playerWon ? 'Você bateu.' : 'O Tio Zé bateu.';

  const damage = result.damage || 0;
  const boosted = result.baseDamage && damage > result.baseDamage;

  return (
    <div className="overlay-backdrop animate-overlay-in fixed inset-0 z-50 flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-labelledby="round-title">
      <div className="overlay-card max-h-[94%] w-full max-w-[360px] overflow-y-auto px-4 py-5 text-center">
        {gameOver ? (
          <>
            <div className="mx-auto mb-3 w-fit">
              <TioZeAvatar mood={state.duelWinner === 'player' ? 'hurt' : 'smug'} pixel={5} />
            </div>
            <h2 id="round-title" className={`font-pixel text-[18px] leading-snug text-shadow-pixel ${state.duelWinner === 'player' ? 'text-brass-300' : 'text-blood-400'}`}>
              {state.duelWinner === 'player' ? 'VOCÊ QUEBROU O TIO ZÉ' : 'O TIO ZÉ TE QUEBROU'}
            </h2>
            <p className="mt-2 font-term text-xl text-bone-200">
              {KIND_TITLE[result.kind]} {subtitle}
            </p>
            <dl className="mx-auto mt-4 grid max-w-[240px] grid-cols-2 gap-y-1 text-left font-term text-lg">
              <dt className="text-bone-300">Rodadas</dt>
              <dd className="text-right text-bone-50">{state.round}</dd>
              <dt className="text-bone-300">Vencidas</dt>
              <dd className="text-right text-bone-50">{stats.roundsWon.player}</dd>
              <dt className="text-bone-300">Moedas ganhas</dt>
              <dd className="text-right text-bone-50">${stats.coinsEarned}</dd>
            </dl>
            <div className="mt-5 grid gap-2">
              <button type="button" data-tone="brass" className="btn-pixel" onClick={onRestart}>
                NOVO DUELO
              </button>
              <button type="button" className="btn-pixel" onClick={onMenu}>
                MENU
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="font-pixel text-[9px] text-bone-400">RODADA {state.round}</p>
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
                <span className="text-bone-200">{playerWon ? 'NO TIO ZÉ' : 'EM VOCÊ'}</span>
              </div>
            )}
            {boosted && (
              <p className="mt-1 font-pixel text-[7px] text-brass-300">
                BATIDA {result.baseDamage} + TALISMÃS = {damage}
              </p>
            )}

            {result.reward && <RewardCard id={result.reward} />}

            <div className="mt-4 flex items-start justify-center gap-5">
              <MiniHand tiles={hands.player} label="SUA MÃO" points={result.sums?.player} />
              <MiniHand tiles={hands.tioZe} label="MÃO DO TIO ZÉ" points={result.sums?.tioZe} />
            </div>

            <div className="mt-4 flex items-center justify-center gap-4">
              <HeartsBar current={hearts.player} max={MAX_HEARTS} pixel={2} label="Seus corações" />
              <CoinCount value={coins.player} />
            </div>

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
