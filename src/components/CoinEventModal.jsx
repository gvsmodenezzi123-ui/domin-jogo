import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { sound } from '../engine/audioSynth.js';
import { regionOfState } from '../engine/campaignMap.js';
import { haptic } from '../engine/progress.js';
import { paintCellar, paintRoughPlank } from './art/shopPixels.js';
import { NPC_SPOTS } from './art/portraitSpecs.js';
import CoinCount from './CoinCount.jsx';
import { prefersReducedMotion } from './motion.js';
import PaintedBox from './PaintedBox.jsx';
import RivalSpeech from './RivalSpeech.jsx';
import { NpcPortrait, ShopSprite } from './ShopArt.jsx';
import { useFitScale } from './useFitScale.js';

/** Espera a cena clarear, voo de cada moeda e intervalo entre elas (ms). */
const START_MS = 1350; // depois da entrada (a luz acende, o caixote cai, o Seu Tião sobe)
const FLIGHT_MS = 650;
const GAP_MS = 130;
/** O tamanho do Seu Tião na tela (o retrato de 64 ampliado). */
const TIAO_PX = 192;

const LINES = ['Ô, moleque! Toma aqui pra próxima rodada.', 'Gorjeta do velho. Não gasta tudo no Corvo, hein.', 'Achei no fundo do caixote, ó!'];
const LOW = 'É o que sobrou... mas é de coração.';
const HIGH = 'Hoje o bicho deu! Leva tudo, leva!';

function lineFor(reward, seq) {
  if (reward <= 2) return LOW;
  if (reward >= 10) return HIGH;
  return LINES[seq % LINES.length];
}

/**
 * Seu Tião das Moedas. Versão 2.2: o porão clandestino pintado (tijolo velho, canos
 * enferrujados, teias, o foco de luz do teto na névoa que sobe do chão), o Seu Tião em 64×64
 * (barba branca, chapéu de feltro, lenço vermelho, casaco rasgado e a moeda de ouro na mão)
 * atrás do caixote de feira com as ferramentas, e a fala num bilhete em cima do caixote.
 *
 * A gorjeta ($1 a $12, já somada pelo reducer e fixa pela semente) sai moeda por moeda da
 * mão dele, num arco até o SEU BOLSO lá em cima: cada uma que chega dá o "tim" um semitom
 * acima e o número pula (1,25 → 1). Tudo em transform: leve no iPhone.
 */
export default function CoinEventModal({ state, onLeave }) {
  // Patch 0.9.3: sem scroll; se ainda passar da tela, a cena encolhe para caber
  const [fitOuter, fitInner, fitStyle] = useFitScale();
  const reward = state.coinEvent?.reward ?? 0;
  const after = state.coins.player;
  const before = after - reward;
  const [landed, setLanded] = useState(0);
  const [talking, setTalking] = useState(false);
  const [line] = useState(() => lineFor(reward, state.seq));
  const [path, setPath] = useState(null);
  const region = regionOfState(state);
  const done = landed >= reward;
  const stageRef = useRef(null);
  const tiaoRef = useRef(null);
  const pocketRef = useRef(null);
  const countRef = useRef(null);

  // de onde a moeda sai (a mão dele) e onde chega (o bolso), em px de layout do palco
  useLayoutEffect(() => {
    const stage = stageRef.current;
    const tiao = tiaoRef.current;
    const pocket = pocketRef.current;
    if (!stage || !tiao || !pocket) return;
    const measure = () => {
      const s = stage.getBoundingClientRect();
      const scale = s.width / Math.max(1, stage.offsetWidth) || 1;
      const t = tiao.getBoundingClientRect();
      const p = pocket.getBoundingClientRect();
      const hx = (t.left - s.left + (NPC_SPOTS.tiaoCoin.x / 64) * t.width) / scale;
      const hy = (t.top - s.top + (NPC_SPOTS.tiaoCoin.y / 64) * t.height) / scale;
      const px = (p.left - s.left + p.width * 0.3) / scale;
      const py = (p.top - s.top + p.height * 0.6) / scale;
      setPath({ x: hx, y: hy, dx: px - hx, dy: py - hy });
    };
    measure();
  }, []);

  useEffect(() => {
    sound.playLightOn();
  }, []);

  useEffect(() => {
    const timers = [];
    const bump = () => countRef.current?.animate?.([{ transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 200, easing: 'cubic-bezier(.2,1.4,.4,1)' });
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
          bump();
          haptic(8);
        }, START_MS + i * GAP_MS + FLIGHT_MS),
      );
    }
    timers.push(setTimeout(() => sound.playCoinJingle(), START_MS + reward * GAP_MS + FLIGHT_MS + 120));
    return () => timers.forEach(clearTimeout);
  }, [reward]);

  return (
    <div className={`tiao-scene tiao-v22 map-atmo-${region.atmosphere} fixed inset-0 z-[55]`} role="dialog" aria-modal="true" aria-labelledby="tiao-title">
      <div ref={fitOuter} className="tiao-scroll">
        <div ref={fitInner} className="scene-fit" style={fitStyle}>
          <section ref={stageRef} className="tiao-stage" aria-label="Gorjeta do Seu Tião">
            <PaintedBox name="porao" painter={paintCellar} className="tiao-cellar" />
            <span className="tiao-beam" aria-hidden="true" />
            <span className="tiao-fog tiao-fog-a" aria-hidden="true" />
            <span className="tiao-fog tiao-fog-b" aria-hidden="true" />

            <header className="tiao-head">
              <h1 id="tiao-title" className="tiao-sign">
                SEU TIÃO DAS MOEDAS
                <span className="tiao-sign-sub">{region.name}</span>
              </h1>
            </header>

            {/* o bolso, onde as moedas pousam */}
            <div ref={pocketRef} className={`tiao-counter ${done ? 'is-full' : ''}`} aria-live="polite">
              <span className="tiao-counter-label">SEU BOLSO</span>
              <span ref={countRef} className="tiao-count">
                <CoinCount value={before + Math.min(landed, reward)} className="text-[16px]" size={18} />
              </span>
            </div>

            {/* o Seu Tião atrás do caixote, com o bilhete da fala em cima */}
            <div className="tiao-npc-wrap">
              <div ref={tiaoRef} className="tiao-npc" aria-hidden="true">
                <NpcPortrait who="seuTiao" size={TIAO_PX} speaking={talking} />
                <span className="tiao-coin-glint" />
              </div>
              <div className="tiao-crate">
                <ShopSprite name="caixote" scale={3} className="tiao-crate-px" />
                <RivalSpeech text={line} voice="seuTiao" tail="up" tailX="30%" linger={false} onMouth={setTalking} className="tiao-note-speech" />
              </div>
            </div>

            {/* as moedas voando da mão dele para o bolso (uma por dólar), em arco */}
            {path && (
              <div className="tiao-lane" aria-hidden="true" style={{ left: path.x, top: path.y, '--dx': `${path.dx}px`, '--dy': `${path.dy}px` }}>
                {Array.from({ length: reward }, (_, i) => (
                  <span
                    key={i}
                    className={`tiao-coin-x ${i < landed ? 'is-landed' : ''}`}
                    style={{ animationDelay: `${START_MS + i * GAP_MS}ms`, animationDuration: `${FLIGHT_MS}ms` }}
                  >
                    <span className="tiao-coin-y" style={{ animationDelay: `${START_MS + i * GAP_MS}ms`, animationDuration: `${FLIGHT_MS}ms` }}>
                      <ShopSprite name="moeda" scale={1.5} className="tiao-coin-px" />
                    </span>
                  </span>
                ))}
              </div>
            )}

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
            <button type="button" className="scene-tap shop-plank tiao-plank" onClick={onLeave}>
              <PaintedBox name="placa-tiao" painter={paintRoughPlank} seed={83} className="shop-plank-canvas" />
              <span className="shop-plank-title">VOLTAR AO MAPA</span>
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
}
