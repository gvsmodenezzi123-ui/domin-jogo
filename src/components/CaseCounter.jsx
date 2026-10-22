import { useEffect, useState } from 'react';
import { BLACK_LOCKED_TEXT, MODES, SILVER_LOCKED_TEXT } from '../data/difficulty.js';
import { MALETAS, MALETA_IDS } from '../data/maletas.js';
import { challengeOf } from '../data/meta.js';
import { sound } from '../engine/audioSynth.js';
import { markMaletasSeen } from '../engine/meta.js';
import { haptic } from '../engine/progress.js';
import DominoTile from './DominoTile.jsx';
import LampRig from './LampRig.jsx';
import { TileSkinContext } from './tileSkin.js';
import { useUnlockSequence } from './useUnlockSequence.js';
import { CadeadoSprite, CorrentesSprite, MaletaSprite } from './art/CaseArt.jsx';

/** Progresso das metas que somam (Borracharia: trancas vencidas). */
function progressOf(id, progress) {
  if (id === 'borracharia') return `Trancas vencidas: ${Math.min(progress.trancaWins ?? 0, 3)}/3`;
  return null;
}

/** Faíscas que sobem da maleta quando ela abre (posição e atraso de cada uma). */
const SPARKS = [
  [22, 0],
  [38, 60],
  [52, 20],
  [64, 90],
  [78, 40],
  [46, 130],
];

/**
 * Uma maleta no balcão (Patch 0.8.2: todas começam fechadas). Trancada: corrente e cadeado.
 * Liberada: fechada também, até você tocar; aí os fechos estalam, a tampa sobe mostrando o
 * forro de veludo, sai um brilho e umas faíscas. Abrir outra fecha a anterior (`closing`).
 * Na primeira vez que aparece liberada, o cadeado abre e as correntes caem (`fresh`).
 */
function CaseSlot({ id, unlocked, fresh, open, closing, disabled, shakeKey, onPick }) {
  const stage = useUnlockSequence(fresh, unlocked ? 'open' : 'locked');
  const maleta = MALETAS[id];
  const free = stage === 'open'; // sem corrente: dá para abrir
  const shown = free && open;
  const motion = shown ? 'case-opening' : closing ? 'case-closing' : fresh && free ? 'case-freed' : '';
  return (
    <button
      type="button"
      className={`scene-tap counter-case ${shown ? 'is-selected is-open' : ''} ${unlocked ? '' : 'is-locked'} ${disabled ? 'is-disabled' : ''}`}
      onClick={() => onPick(id)}
      aria-pressed={shown}
      aria-label={unlocked ? `${maleta.name}: ${shown ? maleta.buff : 'fechada, toque para abrir'}` : `${maleta.name}: trancada. ${maleta.goal}`}
    >
      <span className="case-art counter-art">
        {shown && <span aria-hidden="true" className="case-glow" />}
        <span key={`${shown}-${shakeKey}`} className={`case-body ${motion} ${shakeKey ? 'case-shake' : ''}`}>
          {shown ? (
            <>
              {/* a fechada estala os fechos e some; a aberta sobe no lugar */}
              <span className="case-layer case-layer-closed">
                <MaletaSprite id={id} className="case-sprite" />
              </span>
              <span className="case-layer case-layer-open">
                <MaletaSprite id={id} open className="case-sprite" />
              </span>
            </>
          ) : (
            <MaletaSprite id={id} className="case-sprite" />
          )}
        </span>
        {shown && (
          <span aria-hidden="true" className="case-sparks">
            {SPARKS.map(([x, delay]) => (
              <i key={x} style={{ left: `${x}%`, animationDelay: `${380 + delay}ms` }} />
            ))}
          </span>
        )}
        {!free && (
          <>
            <span aria-hidden="true" className={`case-chains ${stage === 'unlocking' ? 'is-falling' : ''}`}>
              <CorrentesSprite className="case-sprite" />
            </span>
            <span aria-hidden="true" className={`case-lock ${stage === 'unlocking' ? 'is-open' : ''}`}>
              <CadeadoSprite open={stage === 'unlocking'} className="case-sprite" />
            </span>
          </>
        )}
      </span>
      <span className="counter-name">{maleta.short}</span>
    </button>
  );
}

/**
 * As dificuldades: Peças Brancas (normal), Peças Pretas (difícil, com cadeado até zerar o
 * normal) e Peças Prateadas (Modo Inferno, Patch 0.9.0, com cadeado até zerar o difícil).
 */
const SKIN_OF = { normal: 'bone', hard: 'onyx', inferno: 'silver' };

function DifficultyPick({ mode, unlocked, onChange }) {
  return (
    <div className="diff-pick" role="radiogroup" aria-label="Dificuldade">
      {['normal', 'hard', 'inferno'].map((id) => {
        const locked = !unlocked[id];
        const on = mode === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={on}
            aria-disabled={locked}
            className={`scene-tap diff-option diff-${id} ${on ? 'is-on' : ''} ${locked ? 'is-locked' : ''}`}
            onClick={() => onChange(id)}
          >
            <span className="diff-box" aria-hidden="true">
              {on ? '■' : ''}
            </span>
            <TileSkinContext.Provider value={SKIN_OF[id]}>
              <DominoTile values={[5, 3]} unit={11} depth={2} className="diff-tile" />
            </TileSkinContext.Provider>
            <span className="diff-text">
              <span className="diff-name">{MODES[id].name}</span>
              <span className="diff-tag">{locked ? 'TRANCADO' : MODES[id].tag}</span>
            </span>
            {locked && <CadeadoSprite className="diff-lock" />}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Balcão de Maletas (Patch 0.8.0), depois do NOVO JOGO: uma bancada de madeira vista de
 * cima, sob a lâmpada, com as 5 maletas de partida (data/maletas.js). Trancada: corrente e
 * cadeado; tocar mostra a meta. Liberada: fechada até você tocar (Patch 0.8.2); tocar abre
 * a maleta e mostra logo abaixo o que ela muda, a escolha das peças (Brancas = normal,
 * Pretas = difícil, Prateadas = inferno) e o INICIAR. Uma aberta por vez.
 * Em desafio (`challenge`), o título mostra a regra; o Só no Osso só aceita a Clássica.
 */
export default function CaseCounter({ unlocked, seen, blackUnlocked, silverUnlocked = false, progress = {}, challenge = null, onStart, onBack }) {
  const rule = challengeOf(challenge);
  const allowed = (id) => !rule?.maleta || rule.maleta === id;
  const [selected, setSelected] = useState(null); // a maleta aberta (nenhuma até o primeiro toque)
  const [closing, setClosing] = useState(null); // a que acabou de fechar (anima a tampa descendo)
  const [info, setInfo] = useState(null); // maleta trancada tocada (mostra a meta)
  const [shake, setShake] = useState({ id: null, n: 0 });
  const [mode, setMode] = useState('normal');
  const [warn, setWarn] = useState({ n: 0, text: '' });
  const modesOpen = { normal: true, hard: blackUnlocked, inferno: silverUnlocked };
  // na primeira vez que uma maleta aparece liberada, as correntes caem
  const [fresh] = useState(() => unlocked.filter((id) => id !== 'classica' && !seen.includes(id)));

  useEffect(() => {
    if (fresh.length) markMaletasSeen(fresh);
  }, [fresh]);

  const pick = (id) => {
    if (!unlocked.includes(id)) {
      setInfo(id);
      setShake((s) => ({ id, n: s.n + 1 }));
      sound.playChainRattle();
      haptic([30, 40, 30]);
      return;
    }
    if (!allowed(id)) {
      setInfo(id);
      setShake((s) => ({ id, n: s.n + 1 }));
      return;
    }
    setInfo(null);
    if (id === selected) return;
    if (selected) sound.playCaseClose();
    setClosing(selected);
    setSelected(id);
    sound.playCaseOpen();
    haptic([12, 50, 12]);
  };

  const chooseMode = (id) => {
    if (!modesOpen[id]) {
      setWarn((w) => ({ n: w.n + 1, text: id === 'inferno' ? SILVER_LOCKED_TEXT : BLACK_LOCKED_TEXT }));
      sound.playChainRattle();
      haptic([30, 40, 30]);
      return;
    }
    setMode(id);
    sound.playClick();
  };

  const maleta = selected ? MALETAS[selected] : null;
  const lockedInfo = info ? MALETAS[info] : null;

  return (
    <div className="case-scene counter-scene fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-labelledby="counter-title">
      <div className="case-lamp" aria-hidden="true">
        <LampRig part="light" lamp={52} cord={24} beamWidth={420} />
        <LampRig part="body" lamp={52} cord={24} beamWidth={420} className="z-[6]" />
      </div>
      <div className="case-scroll">
        <h1 id="counter-title" className="case-title">
          {rule ? `DESAFIO: ${rule.name.toUpperCase()}` : 'BALCÃO DE MALETAS'}
          <span>{rule ? rule.rule : 'Cada maleta muda o começo e uma regra da run'}</span>
        </h1>

        <div className={`counter-top ${selected || info ? '' : 'is-waiting'}`}>
          {MALETA_IDS.map((id) => (
            <CaseSlot
              key={id}
              id={id}
              unlocked={unlocked.includes(id)}
              fresh={fresh.includes(id)}
              open={id === selected}
              closing={id === closing}
              disabled={!allowed(id)}
              shakeKey={shake.id === id ? shake.n : 0}
              onPick={pick}
            />
          ))}
        </div>

        {lockedInfo ? (
          <div key={`info-${info}-${shake.n}`} className="counter-card counter-card-locked animate-shop-alert" role="status">
            <p className="counter-card-title">{lockedInfo.name.toUpperCase()}</p>
            {!unlocked.includes(info) ? (
              <div className="book-unlock-goal mt-1.5">
                <p className="font-pixel text-[7px] leading-snug text-amber-300">[?] COMO DESBLOQUEAR:</p>
                <p className="mt-0.5 font-term text-[16px] leading-[1.05] text-amber-100">{lockedInfo.goal}</p>
                {progressOf(info, progress) && <p className="mt-0.5 font-pixel text-[7px] text-amber-400/80">{progressOf(info, progress)}</p>}
              </div>
            ) : (
              <p className="mt-1 font-term text-[17px] leading-tight text-bone-200">{rule?.name}: só a {MALETAS[rule?.maleta]?.name}.</p>
            )}
          </div>
        ) : !maleta ? (
          <div className="counter-card counter-card-hint" role="status">
            <p className="counter-hint-title">TOQUE NUMA MALETA PARA ABRIR</p>
            <p className="counter-hint-text">Cada uma traz um começo diferente e uma regra da casa.</p>
          </div>
        ) : (
          <div key={selected} className="counter-card counter-card-open" role="group" aria-label={maleta.name}>
            <p className="counter-card-title">{maleta.name.toUpperCase()}</p>
            <p className="counter-card-sub">{maleta.title}</p>
            <p className="counter-buff">+ {maleta.buff}</p>
            {maleta.debuff && <p className="counter-debuff">− {maleta.debuff}</p>}
            <DifficultyPick mode={mode} unlocked={modesOpen} onChange={chooseMode} />
            {warn.n > 0 && (
              <p key={warn.n} className="case-warn animate-shop-alert" role="alert">
                {warn.text}
              </p>
            )}
            <button type="button" data-tone="play" className="btn-pixel counter-start" onClick={() => onStart({ maleta: selected, mode, challenge })}>
              INICIAR
            </button>
          </div>
        )}

        <button type="button" className="text-action case-back" onClick={onBack}>
          VOLTAR
        </button>
      </div>
    </div>
  );
}
