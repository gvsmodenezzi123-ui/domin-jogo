import { useEffect, useState } from 'react';
import { BLACK_LOCKED_TEXT, MODES } from '../data/difficulty.js';
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

/**
 * Uma maleta no balcão. Trancada: fechada, com corrente e cadeado. Liberada: aberta, o
 * forro de veludo à mostra; na primeira vez que aparece liberada, o cadeado abre e as
 * correntes caem (`fresh`).
 */
function CaseSlot({ id, unlocked, fresh, selected, disabled, shakeKey, onPick }) {
  const stage = useUnlockSequence(fresh, unlocked ? 'open' : 'locked');
  const maleta = MALETAS[id];
  const open = stage === 'open';
  return (
    <button
      type="button"
      className={`scene-tap counter-case ${selected ? 'is-selected' : ''} ${unlocked ? '' : 'is-locked'} ${disabled ? 'is-disabled' : ''}`}
      onClick={() => onPick(id)}
      aria-pressed={selected}
      aria-label={unlocked ? `${maleta.name}: ${maleta.buff}` : `${maleta.name}: trancada. ${maleta.goal}`}
    >
      <span className="case-art counter-art">
        <span key={`${open}-${shakeKey}`} className={`case-body ${open && fresh ? 'case-open-pop' : ''} ${shakeKey ? 'case-shake' : ''}`}>
          <MaletaSprite id={id} open={open} className="case-sprite" />
        </span>
        {!open && (
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

/** As duas dificuldades: Peças Brancas (normal) e Peças Pretas (difícil, com cadeado até zerar). */
function DifficultyPick({ mode, blackUnlocked, onChange }) {
  return (
    <div className="diff-pick" role="radiogroup" aria-label="Dificuldade">
      {['normal', 'hard'].map((id) => {
        const locked = id === 'hard' && !blackUnlocked;
        const on = mode === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={on}
            aria-disabled={locked}
            className={`scene-tap diff-option ${on ? 'is-on' : ''} ${locked ? 'is-locked' : ''}`}
            onClick={() => onChange(id)}
          >
            <span className="diff-box" aria-hidden="true">
              {on ? '■' : ''}
            </span>
            <TileSkinContext.Provider value={id === 'hard' ? 'onyx' : 'bone'}>
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
 * cadeado; tocar mostra a meta. Liberada: aberta no veludo; tocar seleciona e abre logo
 * abaixo a escolha das peças (Brancas = normal, Pretas = difícil) e o INICIAR RUN.
 * Em desafio (`challenge`), o título mostra a regra; o Só no Osso só aceita a Clássica.
 */
export default function CaseCounter({ unlocked, seen, blackUnlocked, progress = {}, challenge = null, onStart, onBack }) {
  const rule = challengeOf(challenge);
  const allowed = (id) => !rule?.maleta || rule.maleta === id;
  const [selected, setSelected] = useState(() => MALETA_IDS.find((id) => unlocked.includes(id) && allowed(id)) ?? 'classica');
  const [info, setInfo] = useState(null); // maleta trancada tocada (mostra a meta)
  const [shake, setShake] = useState({ id: null, n: 0 });
  const [mode, setMode] = useState('normal');
  const [warnBlack, setWarnBlack] = useState(0);
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
    setSelected(id);
    sound.playPowerSelect();
  };

  const chooseMode = (id) => {
    if (id === 'hard' && !blackUnlocked) {
      setWarnBlack((n) => n + 1);
      sound.playChainRattle();
      haptic([30, 40, 30]);
      return;
    }
    setMode(id);
    sound.playClick();
  };

  const maleta = MALETAS[selected];
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

        <div className="counter-top">
          {MALETA_IDS.map((id) => (
            <CaseSlot
              key={id}
              id={id}
              unlocked={unlocked.includes(id)}
              fresh={fresh.includes(id)}
              selected={id === selected && !info}
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
        ) : (
          <div className="counter-card" role="group" aria-label={maleta.name}>
            <p className="counter-card-title">{maleta.name.toUpperCase()}</p>
            <p className="counter-card-sub">{maleta.title}</p>
            <p className="counter-buff">+ {maleta.buff}</p>
            {maleta.debuff && <p className="counter-debuff">− {maleta.debuff}</p>}
            <DifficultyPick mode={mode} blackUnlocked={blackUnlocked} onChange={chooseMode} />
            {warnBlack > 0 && !blackUnlocked && (
              <p key={warnBlack} className="case-warn animate-shop-alert" role="alert">
                {BLACK_LOCKED_TEXT}
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
