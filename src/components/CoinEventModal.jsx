import { useEffect, useState } from 'react';
import { sound } from '../engine/audioSynth.js';
import { regionOfState } from '../engine/campaignMap.js';
import { haptic } from '../engine/progress.js';
import CoinCount from './CoinCount.jsx';
import { prefersReducedMotion } from './motion.js';
import RivalSpeech from './RivalSpeech.jsx';
import { CoinGlyph } from './UiGlyphs.jsx';
import { TiaoMoedasSprite } from './art/NecroticArt.jsx';
import { useFitScale } from './useFitScale.js';

/** Espera a cena clarear, voo de cada moeda e intervalo entre elas (ms). */
const START_MS = 650;
const FLIGHT_MS = 620;
const GAP_MS = 130;

const LINES = ['Ô, moleque! Toma aqui pra próxima rodada.', 'Gorjeta do velho. Não gasta tudo no Corvo, hein.', 'Achei no fundo do engradado. É seu.'];
const LOW = 'É o que sobrou... mas é de coração.';
const HIGH = 'Hoje o bicho deu! Leva tudo, leva!';

function lineFor(reward, seq) {
  if (reward <= 2) return LOW;
  if (reward >= 10) return HIGH;
  return LINES[seq % LINES.length];
}

/**
 * Seu Tião das Moedas (Patch 0.6.1): o velho no engradado de cerveja sorteia uma gorjeta
 * de $1 a $12 (já somada pelo reducer, fixa pela semente). Cada dólar é uma moeda que voa
 * da mão dele para o seu contador, com um "tim" metálico que sobe um semitom por moeda;
 * a última fecha com o tilintar do caixa. O botão de saída volta para o mapa a qualquer hora.
 */
export default function CoinEventModal({ state, onLeave }) {
  // Patch 0.9.3: sem scroll; se ainda passar da tela, a cena encolhe para caber
  const fit = useFitScale();
  const reward = state.coinEvent?.reward ?? 0;
  const after = state.coins.player;
  const before = after - reward;
  const [landed, setLanded] = useState(0);
  const [line] = useState(() => lineFor(reward, state.seq));
  const region = regionOfState(state);
  const done = landed >= reward;

  useEffect(() => {
    const timers = [];
    if (prefersReducedMotion()) {
      timers.push(
        setTimeout(() => {
          setLanded(reward);
          sound.playCoinJingle();
        }, 200),
      );
      return () => timers.forEach(clearTimeout);
    }
    for (let i = 0; i < reward; i += 1) {
      timers.push(
        setTimeout(() => {
          setLanded(i + 1);
          sound.playCoinTing(i);
          haptic(8);
        }, START_MS + i * GAP_MS + FLIGHT_MS),
      );
    }
    timers.push(setTimeout(() => sound.playCoinJingle(), START_MS + reward * GAP_MS + FLIGHT_MS + 120));
    return () => timers.forEach(clearTimeout);
  }, [reward]);

  return (
    <div className={`tiao-scene map-atmo-${region.atmosphere} fixed inset-0 z-[55]`} role="dialog" aria-modal="true" aria-labelledby="tiao-title">
      <div ref={fit.outerRef} className="tiao-scroll">
        <div ref={fit.innerRef} className="scene-fit" style={fit.style}>
        <header className="tiao-head">
          <h1 id="tiao-title" className="tiao-sign">
            SEU TIÃO DAS MOEDAS
            <span className="tiao-sign-sub">{region.name}</span>
          </h1>
        </header>

        <section className="tiao-stage" aria-label="Gorjeta do Seu Tião">
          {/* contador de moedas, onde as moedas pousam */}
          <div className={`tiao-counter ${done ? 'is-full' : ''}`} aria-live="polite">
            <span className="tiao-counter-label">SEU BOLSO</span>
            <CoinCount value={before + Math.min(landed, reward)} className="text-[16px]" size={18} />
          </div>

          <div className="tiao-npc-wrap">
            <RivalSpeech text={line} voice="seuTiao" tail="down" tailX="40%" linger={false} className="tiao-speech" />
            <TiaoMoedasSprite className="tiao-sprite" />
          </div>
          <span className="tiao-crate-shadow" aria-hidden="true" />

          {/* as moedas voando da mão dele para o contador (uma por dólar) */}
          <div className="tiao-lane" aria-hidden="true">
            {Array.from({ length: reward }, (_, i) => (
              <span
                key={i}
                className={`tiao-coin-x ${i < landed ? 'is-landed' : ''}`}
                style={{ animationDelay: `${START_MS + i * GAP_MS}ms`, animationDuration: `${FLIGHT_MS}ms` }}
              >
                <span className="tiao-coin-y" style={{ animationDelay: `${START_MS + i * GAP_MS}ms`, animationDuration: `${FLIGHT_MS}ms` }}>
                  <CoinGlyph size={16} />
                </span>
              </span>
            ))}
          </div>

          {done && (
            <p className="tiao-stamp font-pixel" role="status">
              +${reward}
            </p>
          )}
        </section>

        <footer className="tiao-controls">
          <p className="tiao-note">
            Gorjeta sorteada de $1 a $12. {done ? `Você levou $${reward}.` : 'Contando...'}
          </p>
          <button type="button" data-tone="play" className="btn-pixel w-full text-[11px]" onClick={onLeave}>
            VOLTAR AO MAPA
          </button>
        </footer>
        </div>
      </div>
    </div>
  );
}
