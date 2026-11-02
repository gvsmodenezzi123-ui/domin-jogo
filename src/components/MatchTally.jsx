import { useEffect, useRef, useState } from 'react';
import { getRelic } from '../data/relics.js';
import { modeOf } from '../data/difficulty.js';
import { sound } from '../engine/audioSynth.js';
import { currentNode } from '../engine/campaignMap.js';
import { matchTally } from '../engine/matchTally.js';
import { haptic } from '../engine/progress.js';
import CoinCount from './CoinCount.jsx';
import DominoTile from './DominoTile.jsx';
import { coinBurst } from './juice.js';
import { prefersReducedMotion } from './motion.js';
import { HeartsBar } from './PixelHeart.jsx';
import RelicIcon from './RelicIcon.jsx';
import RivalAvatar from './RivalAvatar.jsx';
import { CoinGlyph } from './UiGlyphs.jsx';

/** O ritmo do placar (ms): a lousa entra, cada linha, o total e o carimbo. */
const FIRST_LINE_MS = 700;
const LINE_MS = 560;
const TOTAL_GAP_MS = 260;
const STAMP_GAP_MS = 700;
const DONE_GAP_MS = 520;
/** Depois do carimbo, o mapa abre sozinho (ou no botão). */
export const TALLY_AUTO_MS = 5200;
/** Até quantos talismãs ganham linha própria (o resto vira "OUTROS TALISMÃS"). */
const MAX_RELIC_LINES = 4;

/** O ícone de cada linha: o 5 dourado, a pedra de ouro, o talismã, a moeda do prêmio. */
function LineIcon({ line }) {
  if (line.kind === 'relic') {
    const relic = getRelic(line.relicId);
    return relic ? <RelicIcon relic={relic} size={20} /> : <CoinGlyph size={16} />;
  }
  if (line.kind === 'gold') return <DominoTile values={[5, 5]} unit={6} depth={1} enhancement="ouro" />;
  if (line.kind === 'five') return <span className="tally-five font-pixel">5</span>;
  if (line.kind === 'others') return <span className="tally-five font-pixel">+</span>;
  return <CoinGlyph size={18} />;
}

/** Junta os talismãs que passam do limite numa linha só (o placar cabe na tela). */
function compact(lines) {
  const relics = lines.filter((l) => l.kind === 'relic');
  if (relics.length <= MAX_RELIC_LINES) return lines;
  const keep = new Set(relics.slice(0, MAX_RELIC_LINES - 1).map((l) => l.id));
  const rest = relics.filter((l) => !keep.has(l.id));
  const others = { id: 'others', kind: 'others', label: `OUTROS ${rest.length} TALISMÃS`, count: rest.reduce((n, l) => n + l.count, 0), amount: rest.reduce((n, l) => n + l.amount, 0) };
  const out = [];
  for (const l of lines) {
    if (l.kind === 'relic' && !keep.has(l.id)) {
      if (!out.includes(others)) out.push(others);
    } else out.push(l);
  }
  return out;
}

/** O número subindo até `target` (o total da mesa enchendo a cada linha). */
function useRolling(target, ms = 420) {
  const [value, setValue] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const start = from.current;
    if (start === target || prefersReducedMotion()) {
      from.current = target;
      const id = requestAnimationFrame(() => setValue(target));
      return () => cancelAnimationFrame(id);
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now) => {
      const k = Math.min(1, (now - t0) / ms);
      const v = Math.round(start + (target - start) * (1 - (1 - k) ** 3));
      setValue(v);
      if (k < 1) raf = requestAnimationFrame(tick);
      else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return value;
}

/**
 * Versão 2.6: a mesa vencida vira um placar de verdade. Na lousa, a polaroide do rival; embaixo,
 * cada bônus que rendeu moeda nesta partida entra um por um (múltiplos de 5, pedras de ouro,
 * cada talismã, o prêmio da mesa), com o tim subindo e o total enchendo; depois a cura, a
 * tampinha e o saldo. Por fim o carimbo VENCIDO bate na foto do rival (som seco, tremida e
 * vibração) e o botão sobe. Tocar na lousa pula direto para o fim.
 */
export default function MatchTally({ state, rival, kindTitle, subtitle, onContinue, autoContinue = true }) {
  // o placar é a foto do momento da vitória (o estado pode seguir mudando por baixo)
  const [tally] = useState(() => {
    const t = matchTally(state, rival);
    return { ...t, lines: compact(t.lines) };
  });
  const lines = tally.lines;
  const totalAt = FIRST_LINE_MS + lines.length * LINE_MS + TOTAL_GAP_MS;
  const stampAt = totalAt + STAMP_GAP_MS;
  const doneAt = stampAt + DONE_GAP_MS;
  const [shown, setShown] = useState(0);
  const [stage, setStage] = useState('lines'); // lines · total · stamp · done
  const cardRef = useRef(null);
  const totalRef = useRef(null);
  const timers = useRef([]);

  const node = currentNode(state);
  const boss = Boolean(rival.boss);

  const slam = () => {
    sound.playStampSlam();
    haptic([60, 30, 110]);
    const card = cardRef.current;
    if (card?.animate && !prefersReducedMotion()) {
      card.animate(
        [{ transform: 'translate(0, 0)' }, { transform: 'translate(-4px, 3px)' }, { transform: 'translate(3px, -2px)' }, { transform: 'translate(-2px, 1px)' }, { transform: 'translate(0, 0)' }],
        { duration: 260, easing: 'steps(5, end)' },
      );
    }
  };
  const burst = () => {
    sound.playCoinBurst();
    const box = totalRef.current?.getBoundingClientRect();
    if (box) coinBurst({ x: box.left + box.width / 2, y: box.top + box.height / 2 }, { count: Math.min(30, 12 + Math.round(tally.total / 2)) });
  };

  useEffect(() => {
    const at = (fn, ms) => timers.current.push(setTimeout(fn, ms));
    lines.forEach((line, i) => {
      at(() => {
        setShown(i + 1);
        if (line.kind === 'prize') sound.playCoinJingle();
        else sound.playTallyLine(i);
        haptic(8);
      }, FIRST_LINE_MS + i * LINE_MS);
    });
    at(() => {
      setStage('total');
      burst();
    }, totalAt);
    at(() => {
      setStage('stamp');
      slam();
    }, stampAt);
    at(() => setStage('done'), doneAt);
    const list = timers.current;
    return () => list.forEach(clearTimeout);
    // o placar roda uma vez, na entrada
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // depois do carimbo, o mapa abre sozinho
  useEffect(() => {
    if (stage !== 'done' || !autoContinue) return undefined;
    const id = setTimeout(onContinue, TALLY_AUTO_MS);
    return () => clearTimeout(id);
  }, [stage, autoContinue, onContinue]);

  /** Toque na lousa: pula para o fim (tudo aparece e o carimbo bate na hora). */
  const skip = () => {
    if (stage === 'done' || stage === 'stamp') return;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setShown(lines.length);
    setStage('stamp');
    slam();
    timers.current.push(setTimeout(() => setStage('done'), DONE_GAP_MS));
  };

  const running = lines.slice(0, shown).reduce((sum, l) => sum + l.amount, 0);
  const rolling = useRolling(running);
  const totalOn = stage !== 'lines';
  const stamped = stage === 'stamp' || stage === 'done';
  const done = stage === 'done';
  const fullHeal = boss && !modeOf(state.mode).healPerTable;

  return (
    <div ref={cardRef} className="tally" onClick={skip} role="presentation">
      <p className="chalk-dim font-pixel text-[8px]">{boss ? `CHEFE DA REGIÃO ${node?.region ?? ''} DERROTADO` : node ? `REGIÃO ${node.region} · ANDAR ${node.floor} VENCIDO` : 'MESA VENCIDA'}</p>

      <div className="tally-head">
        <div className={`tally-photo ${stamped ? 'is-stamped' : ''}`}>
          <RivalAvatar rival={rival} mood={stamped ? 'hurt' : 'idle'} size={84} smoke={!stamped} />
          {stamped && (
            <span className="tally-stamp font-pixel" aria-hidden="true">
              VENCIDO
            </span>
          )}
        </div>
        <div className="tally-title">
          <h2 id="round-title" className="chalk-text font-pixel text-[13px] leading-snug">
            VOCÊ QUEBROU {rival.name.toUpperCase()}
          </h2>
          <p className="chalk-text font-term text-lg leading-tight">
            {kindTitle} {subtitle}
          </p>
        </div>
      </div>

      <ul className="tally-lines" aria-label="O que você ganhou nesta mesa">
        {lines.map((line, i) => (
          <li key={line.id} className={`tally-line ${i < shown ? 'is-on' : ''} ${line.kind === 'prize' ? 'is-prize' : ''}`}>
            <span className="tally-icon">
              <LineIcon line={line} />
            </span>
            <span className="tally-label">
              <b className="font-pixel">{line.label}</b>
              {line.note ? <i className="font-term">{line.note}</i> : line.count > 1 ? <i className="font-term">×{line.count}</i> : null}
            </span>
            <span className="tally-amount font-pixel">+${line.amount}</span>
          </li>
        ))}
        {lines.length === 0 && <li className="tally-line is-on tally-empty font-term">Nenhuma moeda nesta mesa.</li>}
      </ul>

      <div className={`tally-total ${totalOn ? 'is-on' : ''}`}>
        <span className="chalk-text font-pixel text-[9px]">NESTA MESA</span>
        <span ref={totalRef} className="tally-sum font-pixel">
          +${rolling}
        </span>
      </div>

      <div className={`tally-extras ${totalOn ? 'is-on' : ''}`}>
        <span className="tally-heal font-pixel">
          {fullHeal ? 'CURA COMPLETA' : tally.extras.find((e) => e.kind === 'heal') ? `CURA +${tally.extras.find((e) => e.kind === 'heal').amount}` : 'VIDA CHEIA'}
          <HeartsBar current={state.hearts.player} max={state.maxHearts.player} pixel={1.5} label={`Seus corações: ${state.hearts.player}`} />
        </span>
        {tally.extras.some((e) => e.kind === 'caps') && <span className="tally-caps font-pixel">+1 TAMPINHA DOURADA</span>}
        <span className="chalk-dim font-term text-base">
          Saldo: <CoinCount value={tally.purse} className="chalk-coins" size={12} />
        </span>
      </div>

      {done ? (
        <>
          <button
            type="button"
            data-tone="play"
            className="btn-pixel tally-go w-full"
            onClick={(e) => {
              e.stopPropagation();
              onContinue();
            }}
          >
            {boss ? 'SUBIR PARA A PRÓXIMA REGIÃO' : 'VOLTAR AO MAPA'}
          </button>
          {autoContinue && <div className="loading-bar mt-2" style={{ animationDuration: `${TALLY_AUTO_MS}ms` }} aria-hidden="true" />}
        </>
      ) : (
        <p className="tally-skip chalk-dim font-term">toque para pular</p>
      )}
    </div>
  );
}
