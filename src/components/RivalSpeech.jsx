import { useEffect, useState } from 'react';
import { SILENT_CHARS, sound } from '../engine/audioSynth.js';

/** Depois de terminar de falar, o balão fica isto na tela antes de sumir (ms). */
const LINGER_MS = 1600;
/** Tempo mínimo do balão na tela, mesmo para fala curta (ms). */
const MIN_VISIBLE_MS = 2500;

/**
 * Fala do rival: o texto aparece letra a letra com a voz dele ("animalese":
 * cada personagem tem tom, onda e ritmo próprios em audioSynth.js). Ao
 * terminar, o balão espera um pouco e some. Uma fala nova (key nova) corta a anterior.
 * `onMouth(aberta)` avisa o retrato para mexer a boca a cada letra.
 */
export default function RivalSpeech({ text, voice, onMouth }) {
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
    if (!done) return undefined;
    const wait = Math.max(LINGER_MS, MIN_VISIBLE_MS - (performance.now() - bornAt));
    const timer = setTimeout(() => setLeaving(true), wait);
    return () => clearTimeout(timer);
  }, [done, bornAt]);

  return (
    <div className={`speech-compact pointer-events-none absolute left-0 top-0 z-40 ${leaving ? 'speech-leaving' : ''}`} role="status" aria-label={text}>
      <span aria-hidden="true">
        {shown}
        {/* o resto reserva espaço: o balão não cresce enquanto ele fala */}
        <span className="invisible">{text.slice(shown.length)}</span>
      </span>
    </div>
  );
}
