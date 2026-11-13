import { memo, useEffect, useState } from 'react';
import { EmoteIcon } from '../components/art/EmoteArt.jsx';
import { EMOTES, EMOTE_COOLDOWN_MS } from './emotes.js';

/**
 * Versão 2.33: o botão dos emotes (ao lado da lupa, no alto): abre uma fileira com os seis e
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
        <EmoteIcon id="risada" size={18} />
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

/** O emote que acabou de chegar numa cadeira: sobe, fica um pouco e some (a `key` troca a cada um). */
export const SeatEmote = memo(function SeatEmote({ emote, className = '', style }) {
  if (!emote) return null;
  return (
    <span key={emote.key} className={`seat-emote ${className}`} style={style} role="img" aria-label={EMOTES.find((e) => e.id === emote.id)?.label ?? 'emote'}>
      <EmoteIcon id={emote.id} size={30} />
    </span>
  );
});
