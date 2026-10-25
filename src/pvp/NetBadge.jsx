/**
 * Patch PvP: o indicador de conexão no canto da tela. Verde = sincronizado (com o ping em ms),
 * âmbar = conectando / esperando, vermelho = conexão perdida.
 */
export default function NetBadge({ link, ping = null, place = 'top-right' }) {
  const tone = link === 'open' ? 'ok' : link === 'lost' || link === 'closed' ? 'down' : 'wait';
  const text =
    link === 'open'
      ? `SINCRONIZADO${ping != null ? ` · ${ping} MS` : ''}`
      : link === 'lost'
        ? 'CONEXÃO PERDIDA'
        : link === 'closed'
          ? 'SEM CONEXÃO'
          : link === 'waiting'
            ? 'MESA ABERTA'
            : 'CONECTANDO...';
  return (
    <div className={`net-badge net-${tone} net-${place}`} role="status" aria-live="polite" aria-label={`Conexão: ${text.toLowerCase()}`}>
      <span className="net-dot" aria-hidden="true" />
      <span className="net-text">{text}</span>
    </div>
  );
}
