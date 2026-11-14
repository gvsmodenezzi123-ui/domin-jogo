import { memo, useEffect, useState } from 'react';
import { EmoteIcon, GestureHand } from '../components/art/EmoteArt.jsx';
import { EMOTES, EMOTE_COOLDOWN_MS } from './emotes.js';

/**
 * Versão 2.33: o botão dos emotes (ao lado da lupa, no alto): abre uma fileira com os seis gestos e
 * fecha ao escolher (ou tocando fora). Depois de mandar, descansa um instante (apagado).
 */
function EmoteBar({ onEmote }) {
  const [open, setOpen] = useState(false);
  const [cool, setCool] = useState(false);
  useEffect(() => {
    if (!cool) return undefined;
    const id = setTimeout(() => setCool(false), EMOTE_COOLDOWN_MS);
    return () => clearTimeout(id);
  }, [cool]);
  const pick = (id) => {
    setOpen(false);
    if (cool) return;
    setCool(true);
    onEmote(id);
  };
  return (
    <>
      <button type="button" className={`emote-btn ${cool ? 'is-cool' : ''} ${open ? 'is-open' : ''}`} onClick={() => setOpen((o) => !o)} aria-label="Emotes" aria-expanded={open}>
        <EmoteIcon id="joinha" size={20} />
      </button>
      {open && (
        <>
          <button type="button" className="emote-shade" aria-label="Fechar os emotes" onClick={() => setOpen(false)} />
          <div className="emote-pick" role="menu" aria-label="Mandar um emote">
            {EMOTES.map((e) => (
              <button key={e.id} type="button" role="menuitem" className="emote-key" disabled={cool} onClick={() => pick(e.id)} aria-label={e.label}>
                <EmoteIcon id={e.id} size={26} />
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}

export default memo(EmoteBar);

/**
 * Versão 2.41: o gesto na cadeira: a mão do personagem (na pele e com a manga dele) sobe, faz o
 * gesto e desce; nas palmas são as duas mãos; na risada sobem os "HA". A `key` troca a cada um.
 * `flip`: a mão fica do lado direito do corpo (espelha, para o braço vir do corpo).
 */
export const SeatGesture = memo(function SeatGesture({ emote, skin, sleeve, flip = false, className = '', style }) {
  if (!emote) return null;
  const label = EMOTES.find((e) => e.id === emote.id)?.label ?? 'emote';
  const hand = (extra, f, size = 36) => <GestureHand id={emote.id} skin={skin} sleeve={sleeve} size={size} flip={f} className={extra} />;
  return (
    <span key={emote.key} className={`seat-emote seat-gesture is-${emote.id} ${flip ? 'is-flip' : ''} ${className}`} style={style} role="img" aria-label={label}>
      {emote.id === 'risada' ? (
        <span className="gesture-ha" aria-hidden="true">
          <b>HA</b>
          <b>HA</b>
          <b>HA</b>
        </span>
      ) : emote.id === 'palmas' ? (
        <span className="gesture-clap">
          <span className="gesture-clap-a">{hand('', false, 28)}</span>
          <span className="gesture-clap-b">{hand('', true, 28)}</span>
          <i />
        </span>
      ) : (
        <span className="gesture-move">{hand('', flip)}</span>
      )}
    </span>
  );
});
