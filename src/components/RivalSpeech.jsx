import { useEffect, useState } from 'react';
import { SILENT_CHARS, sound } from '../engine/audioSynth.js';

/** Depois de terminar de falar, o balão fica isto na tela antes de sumir (ms). */
const LINGER_MS = 1600;
/** Tempo mínimo do balão na tela, mesmo para fala curta (ms). */
const MIN_VISIBLE_MS = 2400;

/**
 * Balão de fala (rivais na mesa e o Valtinho na Loja). Patch 0.5.5:
 * - nada de truncar: o balão se ajusta à frase, com quebra de linha automática;
 * - o tamanho final é reservado desde o início (a frase inteira fica invisível por
 *   baixo), então o balão não pula enquanto o texto é digitado;
 * - o texto aparece letra a letra junto com a voz ("animalese" de audioSynth.js);
 * - veludo escuro, borda de 1,5 px cor de osso/âmbar, vinheta por dentro e a cauda
 *   apontando para a boca de quem fala (`tail`: 'up' quando a boca está acima do
 *   balão, 'down' quando está abaixo; `tailX`: onde a cauda sai, em px da esquerda ou
 *   qualquer medida CSS, como '50%').
 *
 * `onMouth(aberta)` avisa o retrato para mexer a boca a cada letra. Uma fala nova
 * (key nova no pai) corta a anterior. `linger: false` deixa o balão na tela até a próxima fala.
 * `hush` (Patch 0.6.3): some na hora, sem esperar (na mesa, quando você escolhe uma pedra,
 * para o balão não cobrir as pontas onde ela pode entrar).
 */
export default function RivalSpeech({ text, voice, onMouth, tail = 'up', tailX = 24, linger = true, hush = false, className = '', style }) {
  const [shown, setShown] = useState('');
  const [leaving, setLeaving] = useState(false);
  const [bornAt] = useState(() => performance.now());
  const done = shown.length >= text.length;

  useEffect(() => {
    const stop = sound.speakPhrase(text, voice, (typed) => {
      setShown(typed);
      // boca: abre numa letra, fecha na seguinte; pontuação e espaço fecham
      const last = typed[typed.length - 1];
      onMouth?.(typed.length < text.length && !SILENT_CHARS.has(last) && typed.length % 2 === 1);
    });
    return () => {
      stop();
      onMouth?.(false);
    };
  }, [text, voice, onMouth]);

  useEffect(() => {
    if (!done || !linger) return undefined;
    const wait = Math.max(LINGER_MS, MIN_VISIBLE_MS - (performance.now() - bornAt));
    const timer = setTimeout(() => setLeaving(true), wait);
    return () => clearTimeout(timer);
  }, [done, linger, bornAt]);

  return (
    <div
      className={`speech-balloon speech-tail-${tail} pointer-events-none ${leaving || hush ? 'speech-leaving' : ''} ${className}`}
      style={{ ...style, '--tail-x': typeof tailX === 'number' ? `${tailX}px` : tailX }}
      role="status"
      aria-label={text}
    >
      {/* a frase inteira reserva o tamanho; a digitada fica por cima */}
      <span className="speech-measure" aria-hidden="true">
        {text}
      </span>
      <span className="speech-typed" aria-hidden="true">
        {shown}
      </span>
    </div>
  );
}
