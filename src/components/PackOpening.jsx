import { useEffect, useRef, useState } from 'react';
import { ENHANCEMENTS } from '../data/enhancedTiles.js';
import { PACKS } from '../data/packs.js';
import { getRarity } from '../data/rarities.js';
import { getRelic } from '../data/relics.js';
import { sound } from '../engine/audioSynth.js';
import { haptic } from '../engine/progress.js';
import DominoTile from './DominoTile.jsx';
import { prefersReducedMotion } from './motion.js';
import RelicIcon from './RelicIcon.jsx';
import { PackArt } from './ShopArt.jsx';

/** Tempo de cada ato (ms): tremer, rasgar (com o clarão), e o item voando para a bolsa. */
const SHAKE_MS = 400;
const BURST_MS = 520;
const TAKE_MS = 680;

/** A aura de cada raridade (azul raro, dourado lendário, roxo mítico; o comum, um brilho de vela). */
const AURA = { comum: '#e8dcb0', raro: '#4a8aff', lendario: '#ffc83a', mitico: '#b45aff', necrotico: '#8a3ad0' };
const RANK = { comum: 0, raro: 1, lendario: 2, mitico: 3 };

/** As lascas que voam no rasgo: papel pardo e celofane (maço, saco) ou farpa de madeira (engradado). */
const BITS = Array.from({ length: 18 }, (_, i) => {
  const a = (i / 18) * Math.PI * 2 + (i % 3) * 0.3;
  const d = 70 + ((i * 37) % 60);
  return { x: Math.cos(a) * d, y: Math.sin(a) * d * 0.8 - 30, r: ((i * 53) % 360) - 180, s: 0.6 + ((i * 7) % 5) * 0.15, delay: (i % 4) * 18 };
});

const tileLabel = (tileId) => {
  const [a, b] = tileId.split('-');
  return `[${a}|${b}]`;
};

/** Para onde vai o escolhido: o próximo nicho vazio da Bolsa (talismã) ou o seu baralho (pedra). */
function targetFor(option) {
  const el =
    (option.kind === 'relic' ? document.querySelector('.shop-niche-empty') : document.querySelector('.shop-deck')) ??
    document.querySelector('.shop-pouch-label') ??
    null;
  if (!el) return { x: window.innerWidth / 2, y: window.innerHeight - 140 };
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/**
 * Versão 2.2: a abertura do pacote como cena de cinema. A câmera fecha no pacote no meio da
 * tela (vinheta escura), ele treme 400 ms com o papel/madeira rangendo, rasga ao meio num
 * clarão com as lascas voando e as 3 opções sobem flutuando, cada uma na aura da raridade.
 * Tocar escolhe (e mostra o efeito); tocar de novo, ou FICAR COM ESTE, fecha a tranca de
 * latão: o escolhido desce em arco até a Bolsa e os outros dois viram cinza.
 * O sorteio continua o mesmo de antes (engine/shop.js: rollPack, pela semente da run).
 */
export default function PackOpening({ opening, onPick, press }) {
  const pack = PACKS[opening.packId];
  const kind = opening.packId === 'engradadoJumbo' ? 'wood' : 'paper';
  const reduced = prefersReducedMotion();
  const [phase, setPhase] = useState(reduced ? 'reveal' : 'shake');
  const [picked, setPicked] = useState(null);
  const [taking, setTaking] = useState(null);
  const artRefs = useRef([]);

  const options = opening.options.map((option) => {
    const relic = option.kind === 'relic' ? getRelic(option.id) : null;
    const enh = option.kind === 'tile' ? ENHANCEMENTS[option.enhancement] : null;
    const tier = getRarity(relic ? relic.rarity : enh.rarity);
    return { option, relic, enh, tier };
  });
  const best = options.reduce((top, o) => (RANK[o.tier.id] > RANK[top] ? o.tier.id : top), 'comum');

  useEffect(() => {
    if (reduced) {
      sound.playPackReveal(best);
      return undefined;
    }
    sound.playPackShake(kind);
    haptic([12, 30, 12, 30, 12]);
    const t1 = setTimeout(() => {
      setPhase('burst');
      sound.playPackBurst(kind);
      haptic(40);
    }, SHAKE_MS);
    const t2 = setTimeout(() => {
      setPhase('reveal');
      sound.playPackReveal(best);
    }, SHAKE_MS + BURST_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // a cena roda uma vez por pacote aberto
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const take = (index) => {
    if (taking !== null || phase !== 'reveal') return;
    setTaking(index);
    sound.playLatch();
    haptic(25);
    setTimeout(() => sound.playAsh(), 140);
    const el = artRefs.current[index];
    if (el?.animate && !reduced) {
      // arco: sobe um pouco e desce até o nicho (pontos de uma curva de Bézier)
      const a = el.getBoundingClientRect();
      const to = targetFor(opening.options[index]);
      const dx = to.x - (a.left + a.width / 2);
      const dy = to.y - (a.top + a.height / 2);
      const cx = dx * 0.45;
      const cy = Math.min(dy, 0) - 120;
      const frames = [0, 0.2, 0.4, 0.6, 0.8, 1].map((t) => {
        const x = 2 * (1 - t) * t * cx + t * t * dx;
        const y = 2 * (1 - t) * t * cy + t * t * dy;
        return { transform: `translate(${x}px, ${y}px) scale(${1 - t * 0.45}) rotate(${t * 20}deg)`, opacity: t > 0.9 ? 0.6 : 1 };
      });
      el.animate(frames, { duration: TAKE_MS - 40, easing: 'cubic-bezier(.4,0,.6,1)', fill: 'forwards' });
    }
    setTimeout(() => onPick?.(index), reduced ? 0 : TAKE_MS);
  };

  const tap = (index) => {
    if (taking !== null || phase !== 'reveal') return;
    if (picked === index) {
      take(index);
      return;
    }
    sound.playClick();
    setPicked(index);
  };

  const chosen = picked !== null ? options[picked] : null;

  return (
    <div
      className={`pack-cine fixed inset-0 z-[72] flex flex-col items-center justify-center px-3 is-${phase} ${taking !== null ? 'is-taking' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pack-title"
    >
      <span className="pack-vignette" aria-hidden="true" />
      <p id="pack-title" className="pack-cine-title font-pixel">
        {pack.name.toUpperCase()}
      </p>

      {/* o pacote no meio da tela: treme, e no rasgo as duas metades voam com as lascas */}
      {phase !== 'reveal' && (
        <div className={`pack-hero pack-hero-${kind}`} aria-hidden="true">
          {phase === 'shake' && (
            <span className="pack-hero-shake">
              <PackArt id={pack.id} size={176} />
            </span>
          )}
          {phase === 'burst' && (
            <>
              <span className="pack-half pack-half-l">
                <PackArt id={pack.id} size={176} />
              </span>
              <span className="pack-half pack-half-r">
                <PackArt id={pack.id} size={176} />
              </span>
              {BITS.map((bit, i) => (
                <span
                  key={i}
                  className="pack-bit"
                  style={{ '--bx': `${bit.x}px`, '--by': `${bit.y}px`, '--br': `${bit.r}deg`, '--bs': bit.s, animationDelay: `${bit.delay}ms` }}
                />
              ))}
              <span className="pack-flash" />
            </>
          )}
        </div>
      )}

      {phase === 'reveal' && (
        <>
          <p className="pack-cine-hint font-term">{taking !== null ? 'Fechado. Pro seu bolso.' : 'Escolha um. Os outros viram cinza.'}</p>
          <div className="pack-options" role="radiogroup" aria-label="Opções do pacote">
            {options.map(({ option, relic, enh, tier }, index) => {
              const [a, b] = option.kind === 'tile' ? option.tileId.split('-').map(Number) : [0, 0];
              const state = taking === null ? (picked === index ? 'is-on' : '') : taking === index ? 'is-taken' : 'is-ash';
              return (
                <button
                  key={`${option.id ?? option.tileId}-${index}`}
                  type="button"
                  role="radio"
                  aria-checked={picked === index}
                  className={`pack-option ${state} ${tier.id === 'mitico' ? 'is-mythic' : ''}`}
                  style={{ '--aura': AURA[tier.id] ?? AURA.comum, '--rarity': tier.color, '--i': index }}
                  onClick={() => tap(index)}
                  aria-label={`${relic ? relic.name : `${enh.name} ${tileLabel(option.tileId)}`} (${tier.label.toLowerCase()})`}
                  {...(relic ? press({ kind: 'relic', id: relic.id, owner: 'shop' }) : press({ kind: 'offerTile', tileId: option.tileId, enhancement: option.enhancement }))}
                >
                  <span className="pack-option-float">
                    <span className="pack-aura" aria-hidden="true" />
                    <span
                      className="pack-option-art"
                      ref={(el) => {
                        artRefs.current[index] = el;
                      }}
                    >
                      {relic ? <RelicIcon relic={relic} size={56} /> : <DominoTile values={[a, b]} unit={20} depth={5} enhancement={option.enhancement} shimmer />}
                    </span>
                    {taking !== null && taking !== index && (
                      <span className="pack-ash" aria-hidden="true">
                        {Array.from({ length: 8 }, (_, k) => (
                          <i key={k} style={{ '--k': k }} />
                        ))}
                      </span>
                    )}
                  </span>
                  <span className={`rarity-badge ${tier.id === 'mitico' ? 'rarity-badge-mythic' : ''}`}>{tier.label}</span>
                  <span className="pack-option-name">{relic ? relic.short : enh.name.toUpperCase()}</span>
                </button>
              );
            })}
          </div>
          {/* o efeito do escolhido num bilhete de papel pardo */}
          <div className="pack-note" aria-live="polite">
            {chosen ? (
              <>
                <span className="pack-note-name">{chosen.relic ? chosen.relic.name : `${chosen.enh.name} ${tileLabel(chosen.option.tileId)}`}</span>
                <span className="pack-note-text">
                  {chosen.relic ? chosen.relic.description : `Substitui o seu ${tileLabel(chosen.option.tileId)} comum. ${chosen.enh.description}`}
                </span>
              </>
            ) : (
              <span className="pack-note-text">Toque num deles para ler. Toque de novo para ficar.</span>
            )}
          </div>
          <button type="button" data-tone="play" className="btn-pixel pack-take w-full max-w-[360px]" disabled={picked === null || taking !== null} onClick={() => take(picked)}>
            {picked === null ? 'TOQUE NUMA OPÇÃO' : 'FICAR COM ESTE'}
          </button>
        </>
      )}
    </div>
  );
}
