import { useEffect, useState } from 'react';
import { prefersReducedMotion } from './motion.js';
import { TOTAL_NODES } from '../data/campaign.js';
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
  if (result.shielded) return `${rival.name} é imune à primeira tranca. Nada de dano.`;
  if (result.kind === 'nocaute') return KNOCKOUT_CAUSE[result.reason] ?? (playerWon ? `${rival.name} caiu antes da batida.` : 'Você caiu.');
  if (!result.winner) return 'Empate na contagem. Ninguém sangra.';
  if (result.kind === 'tranca') return playerWon ? 'Menor soma é sua.' : `Menor soma é de ${rival.name}.`;
  return playerWon ? 'Você bateu.' : `${rival.name} bateu.`;
}

/** Conta de 0 até `target` em `ms` (as moedas do prêmio caindo no placar). */
function useCountUp(target, ms = 900) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (prefersReducedMotion()) {
      const id = requestAnimationFrame(() => setValue(target));
      return () => cancelAnimationFrame(id);
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / ms);
      setValue(Math.round(target * (1 - (1 - t) ** 2)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return value;
}

/** Retrato do derrotado na lousa: nocauteado, torto, com o carimbo de K.O. */
function KnockedOut({ rival }) {
  return (
    <div className="ko-wrap mx-auto mb-2 w-fit">
      <div className="ko-portrait">
        <RivalAvatar rival={rival} mood="hurt" size={88} smoke={false} />
      </div>
      <span className="ko-stamp font-pixel" aria-hidden="true">
        K.O.
      </span>
    </div>
  );
}

function RunStats({ state }) {
  const { stats } = state;
  return (
    <dl className="mx-auto mt-4 grid max-w-[250px] grid-cols-2 gap-y-1 text-left font-term text-lg">
      <dt className="text-bone-300">Nós vencidos</dt>
      <dd className="text-right text-bone-50">
        {state.run.cleared.length}/{TOTAL_NODES}
      </dd>
      <dt className="text-bone-300">Rodadas vencidas</dt>
      <dd className="text-right text-bone-50">{stats.roundsWon.player}</dd>
      <dt className="text-bone-300">Moedas ganhas</dt>
      <dd className="text-right text-bone-50">${stats.coinsEarned}</dd>
      <dt className="text-bone-300">Pedras de grife</dt>
      <dd className="text-right text-bone-50">{Object.keys(state.decks.player).length}</dd>
    </dl>
  );
}

/**
 * Resultado da rodada, do nó (vitória → loja → mapa), da run vencida (último
 * chefe) ou da run perdida (você zerou).
 */
export default function RoundOverlay({ state, rival, onNext, onShop, autoShop = true, onRestart, onMenu }) {
  const { roundResult: result, phase, hands, hearts, coins } = state;
  const matchWon = phase === 'matchWon';
  const runWon = phase === 'runWon';
  const clearedNode = state.run.cleared.at(-1) ?? 0;

  useEffect(() => {
    if (!matchWon || !autoShop) return undefined;
    const timer = setTimeout(onShop, AUTO_SHOP_MS);
    return () => clearTimeout(timer);
  }, [matchWon, autoShop, onShop]);

  const prizeShown = useCountUp(matchWon || runWon ? (result?.prize ?? 0) : 0, 1000);
  if (!result) return null;
  const runOver = phase === 'gameOver';
  const heal = result.heal ?? 0;
  const playerWon = result.winner === 'player';
  const tie = !result.winner;
  const subtitle = subtitleFor(result, rival);
  const damage = result.damage || 0;
  const boosted = result.baseDamage && damage > result.baseDamage;
  const name = rival.name.toUpperCase();

  return (
    <div className="overlay-backdrop animate-overlay-in fixed inset-0 z-50 flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-labelledby="round-title">
      <div
        className={`${matchWon || runWon ? 'chalkboard' : 'overlay-card'} max-h-[94%] w-full max-w-[360px] overflow-y-auto px-4 py-5 text-center`}
      >
        {matchWon && (
          <>
            <KnockedOut rival={rival} />
            <p className="chalk-dim font-pixel text-[8px]">
              {rival.boss ? 'CHEFE DERROTADO' : `NÓ ${clearedNode + 1}/${TOTAL_NODES} VENCIDO`}
            </p>
            <h2 id="round-title" className="chalk-text mt-2 font-pixel text-[15px] leading-snug">
              VOCÊ QUEBROU {name}
            </h2>
            <p className="chalk-text mt-2 font-term text-xl">
              {KIND_TITLE[result.kind]} {subtitle}
            </p>
            <div className="chalk-line mx-auto mt-3" aria-hidden="true" />
            <div className="mt-2 flex items-center justify-center gap-2 font-pixel text-[10px]">
              <span className="chalk-text">PRÊMIO</span>
              <CoinCount value={`${prizeShown}`} className="chalk-coins text-[14px]" size={18} />
            </div>
            <p className="chalk-dim mt-1 font-term text-base">Saldo: ${coins.player}</p>
            <div className="mt-2 flex items-center justify-center gap-2 font-pixel text-[9px] text-[#ff8c7a]">
              <span>{rival.boss ? 'CURA COMPLETA' : heal > 0 ? `+${heal}` : 'VIDA CHEIA'}</span>
              <HeartsBar current={hearts.player} max={MAX_HEARTS} pixel={2} label={`Seus corações: ${hearts.player}`} />
            </div>
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
            <RunStats state={state} />
            <div className="mt-5 grid gap-2">
              <button type="button" data-tone="brass" className="btn-pixel" onClick={onRestart}>
                NOVO JOGO
              </button>
              <button type="button" className="btn-pixel" onClick={onMenu}>
                MENU
              </button>
            </div>
          </>
        )}

        {runWon && (
          <>
            <KnockedOut rival={rival} />
            <p className="font-pixel text-[8px] text-bone-400">18 MESAS · 3 REGIÕES</p>
            <h2 id="round-title" className="run-won-title mt-2 font-pixel text-[15px] leading-snug text-brass-300 text-shadow-pixel">
              VOCÊ É O NOVO DONO DO BOTECO
            </h2>
            <p className="mt-2 font-term text-xl text-bone-200">
              {KIND_TITLE[result.kind]} O Comendador entrega a chave do boteco.
            </p>
            <div className="mt-3 flex items-center justify-center gap-2 font-pixel text-[10px] text-[#9fe08a]">
              <span>PRÊMIO FINAL</span>
              <CoinCount value={`${prizeShown}`} className="chalk-coins text-[14px]" size={18} />
            </div>
            <RunStats state={state} />
            <div className="mt-5 grid gap-2">
              <button type="button" data-tone="brass" className="btn-pixel" onClick={onRestart}>
                NOVO JOGO
              </button>
              <button type="button" className="btn-pixel" onClick={onMenu}>
                MENU
              </button>
            </div>
          </>
        )}

        {!matchWon && !runOver && !runWon && (
          <>
            <p className="font-pixel text-[9px] text-bone-400">
              NÓ {state.run.node + 1} · RODADA {state.round}
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
