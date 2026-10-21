import { LampGlyph } from './UiGlyphs.jsx';

/**
 * Lâmpada pendurada no teto: BALANÇA como pêndulo (pivô no fio, lá em cima)
 * e PISCA como luz de bar velho (falha, apaga por instantes e volta).
 * O facho e a mancha de luz ficam presos no mesmo pêndulo, então a luz varre
 * a mesa de um lado para o outro junto com a lâmpada.
 *
 * part="body"  fio + lâmpada + brilho do bulbo
 * part="light" facho + mancha de luz, em modo "screen" por cima de tudo
 *              (clareia o pano e as pedras por onde passa)
 * As duas partes usam as mesmas animações e montam no mesmo quadro, então
 * balançam e piscam em sincronia. Ficam separadas porque o modo "screen" da
 * luz não pode valer para o corpo escuro da lâmpada.
 */
export default function LampRig({ part = 'body', lamp = 64, cord = 6, beamWidth = 300, className = '' }) {
  const body = part === 'body';
  const light = part === 'light';
  // centro do bulbo (de onde sai o facho)
  const bulbY = cord + lamp * 0.7;
  const rig = light ? 'lamp-rig dynamic-light-cone' : 'lamp-rig swinging-lamp';
  return (
    <div aria-hidden="true" className={`${rig} pointer-events-none ${className}`} style={{ width: beamWidth }}>
      <div className="lamp-kick">
        {light && (
          <>
            <span className="lamp-beam" style={{ top: bulbY }} />
            <span className="lamp-pool" style={{ width: beamWidth * 1.1, height: beamWidth * 0.62 }} />
          </>
        )}
        {body && (
          <>
            <span className="lamp-cord" style={{ height: cord + 4 }} />
            <span
              className="lamp-bulb-glow lamp-flicker-glow"
              style={{ top: bulbY - lamp * 0.9, width: lamp * 2.2, height: lamp * 1.8 }}
            />
            <span className="lamp-body" style={{ top: cord }}>
              <LampGlyph size={lamp} className="lamp-sprite lamp-flicker-sprite" />
            </span>
          </>
        )}
      </div>
    </div>
  );
}
