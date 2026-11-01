import { useEffect, useState } from 'react';
import { HEARTBEAT_BPM, sound } from '../engine/audioSynth.js';
import { dangerBanner } from '../engine/danger.js';
import { haptic } from '../engine/progress.js';

/**
 * Versão 2.5: encurralado. Quando um rival está por uma pedra (ou você no último coração), o
 * coração bate de fundo (sound.setHeartbeat) e a borda da tela pulsa em vermelho no mesmo
 * ritmo, mais rápida e mais forte a cada nível (engine/danger.js). Ao subir para o nível 2 ou 3
 * entra um aviso ("ÚLTIMA PEDRA!", "ENCURRALADO!") e o celular vibra uma vez.
 * Só opacidade anima (leve no iPhone); com animação reduzida, a silhueta fica parada.
 * `active` desliga tudo (menu aberto, fim da rodada, aula do Vô Juca).
 */
export default function DangerFx({ danger, myHearts, active = true }) {
  const level = active && danger ? danger.level : 0;

  useEffect(() => {
    sound.setHeartbeat(level);
  }, [level]);
  // saiu da mesa: o coração para
  useEffect(() => () => sound.setHeartbeat(0), []);

  // o aviso entra só quando o perigo SOBE para 2 ou 3 (guardado do render anterior)
  const [seen, setSeen] = useState({ level: 0, key: 0, banner: null });
  if (level !== seen.level) {
    const rose = level > seen.level && level >= 2;
    setSeen({ level, key: rose ? seen.key + 1 : seen.key, banner: rose ? dangerBanner(danger, myHearts) : level >= 2 ? seen.banner : null });
  }
  useEffect(() => {
    if (seen.key > 0) haptic([30, 70, 30]);
  }, [seen.key]);

  if (!level) return null;
  const beat = `${Math.round(60000 / HEARTBEAT_BPM[level])}ms`;
  return (
    <>
      <div className={`danger-fx danger-l${level}`} style={{ '--beat': beat }} aria-hidden="true">
        <span key={`v${level}`} className="danger-vignette" />
        <span key={`e${level}`} className="danger-edge" />
      </div>
      {seen.banner && (
        <p key={seen.key} className={`danger-banner danger-banner-l${level}`} role="status">
          <b className="font-pixel">{seen.banner.title}</b>
          <span className="font-term">{seen.banner.line}</span>
        </p>
      )}
    </>
  );
}
