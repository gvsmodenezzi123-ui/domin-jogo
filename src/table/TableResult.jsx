import DominoTile from '../components/DominoTile.jsx';
import { HeartsBar } from '../components/PixelHeart.jsx';
import RivalAvatar from '../components/RivalAvatar.jsx';
import { TentoCap } from '../components/TentoCap.jsx';
import { colorOf, ordinal, plateName, seatsFrom } from './seats.js';

const KIND_TITLE = { normal: 'BATIDA!', bucha: 'BATIDA DE BUCHA!', duasPontas: 'NAS DUAS PONTAS!', cruzada: 'CRUZADA!' };
const TRANCA_REASON = {
  fechada: 'Mesa fechada: as sete pedras do número estão na mesa.',
  passes: 'Todo mundo passou seguido.',
  bloqueio: 'Ninguém encaixa e o dorme secou.',
};

function subtitle(result, names) {
  if (result.kind === 'batida') return result.by === 'me' ? 'Você bateu.' : `${names[result.by]} bateu.`;
  if (!Object.keys(result.damage).length) return 'Empate na contagem. Ninguém sangra.';
  const low = result.spared.map((id) => names[id]);
  return low.length === 1 ? `Menor soma: ${low[0]}.` : `Menor soma: ${low.join(' e ')}.`;
}

/** As pedras que sobraram na mão de alguém (pequenas, só para conferir a conta). */
function MiniTiles({ tiles }) {
  if (!tiles?.length) return <span className="table-res-none font-term">bateu</span>;
  return (
    <span className="table-res-tiles">
      {tiles.slice(0, 7).map((t) => (
        <DominoTile key={t.id} values={[t.a, t.b]} unit={7} depth={1} />
      ))}
    </span>
  );
}

/** Versão 2.7: os tentos de quem está no pódio (na roda por tentos). */
function TentosTag({ value }) {
  return (
    <span className="table-step-tentos font-pixel">
      <TentoCap size={10} />
      {value}
    </span>
  );
}

/** Versão 2.7: o pódio das duplas: a dupla vencedora no degrau de cima, as duas fotos juntas. */
function TeamSteps({ view, me, tentos }) {
  const byTeam = ['A', 'B'].map((team) => view.seats.filter((s) => s.team === team));
  const ordered = byTeam.sort((x, y) => (x[0]?.place ?? 9) - (y[0]?.place ?? 9));
  return (
    <div className="table-podium-row table-podium-duo">
      {ordered.map((duo, k) => (
        <div key={duo[0]?.team ?? k} className={`table-step table-step-duo ${k === 0 ? 'is-1st' : 'is-2nd'} ${duo.some((s) => s.id === me) ? 'is-me' : ''}`} style={{ '--seat': k === 0 ? 'var(--team-win, #f0b64a)' : '#8a7a5a' }}>
          <span className="table-duo-photos">
            {duo.map((s) => (
              <span key={s.id} className="table-step-photo avatar-frame">
                <RivalAvatar rival={{ art: s.face ?? 'tioZe', name: s.name }} mood={k === 0 ? 'smug' : 'idle'} size={k === 0 ? 46 : 38} smoke={false} />
              </span>
            ))}
          </span>
          <span className="table-step-name font-pixel">{duo.map((s) => (s.id === me ? 'VOCÊ' : plateName(s.name))).join(' + ')}</span>
          {tentos && <TentosTag value={duo[0]?.tentos ?? 0} />}
          <span className="table-step-block font-pixel">{k === 0 ? '1º' : '2º'}</span>
        </div>
      ))}
    </div>
  );
}

function Podium({ view, me, names, onRematch, onLeave, canRematch }) {
  const ranked = view.seats.slice().sort((a, b) => (a.place ?? 9) - (b.place ?? 9));
  // versão 2.7: nas duplas, a partida tem dois vencedores
  const winners = view.winners?.length ? view.winners : view.winner ? [view.winner] : [];
  const won = winners.includes(me);
  const teams = Boolean(view.rules?.teams);
  const tentos = view.rules?.scoring === 'tentos';
  const step = { 1: 'is-1st', 2: 'is-2nd', 3: 'is-3rd', 4: 'is-4th' };
  // 2º à esquerda, 1º no meio (mais alto), 3º à direita; o 4º embaixo
  const top = [ranked[1], ranked[0], ranked[2]].filter(Boolean);
  // versão 2.33: na roda de 5, o 4º e o 5º embaixo
  const rest = ranked.slice(3);
  const headline = teams
    ? won
      ? 'A SUA DUPLA LEVOU A MESA!'
      : `${winners.map((id) => String(names[id]).toUpperCase()).join(' E ')} LEVARAM A MESA`
    : won
      ? 'A MESA É SUA!'
      : `${String(names[view.winner]).toUpperCase()} LEVOU A MESA`;
  const kicker = `MESA DE ${view.seats.length}${teams ? ' · DUPLAS' : ''} · ${view.round} RODADAS${tentos ? ` · ${view.target} TENTOS` : ''}`;
  return (
    <div className="overlay-backdrop animate-overlay-in fixed inset-0 z-50 flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-labelledby="table-podium-title">
      <div className={`${won ? 'chalkboard' : 'overlay-card'} round-card table-podium w-full max-w-[360px] overflow-hidden px-4 py-5 text-center`}>
        <p className={`font-pixel text-[9px] ${won ? 'chalk-dim' : 'text-bone-400'}`}>{kicker}</p>
        <h2 id="table-podium-title" className={`mt-2 font-pixel text-[16px] leading-snug text-shadow-pixel ${won ? 'chalk-text' : 'text-bone-100'}`}>
          {headline}
        </h2>
        {teams ? (
          <TeamSteps view={view} me={me} tentos={tentos} />
        ) : (
          <div className="table-podium-row">
            {top.map((s) => (
              <div key={s.id} className={`table-step ${step[s.place] ?? ''} ${s.id === me ? 'is-me' : ''}`} style={{ '--seat': colorOf(view, s.id) }}>
                <span className="table-step-photo avatar-frame">
                  <RivalAvatar rival={{ art: s.face ?? 'tioZe', name: s.name }} mood={s.place === 1 ? 'smug' : 'idle'} size={s.place === 1 ? 56 : 44} smoke={false} />
                </span>
                <span className="table-step-name font-pixel">{s.id === me ? 'VOCÊ' : plateName(s.name)}</span>
                {tentos && <TentosTag value={s.tentos ?? 0} />}
                <span className="table-step-block font-pixel">{ordinal(s.place)}</span>
              </div>
            ))}
          </div>
        )}
        {!teams &&
          rest.map((r) => (
            <p key={r.id} className="table-podium-4th font-pixel" style={{ '--seat': colorOf(view, r.id) }}>
              {ordinal(r.place)} · {r.id === me ? 'VOCÊ' : plateName(r.name)}
              {tentos ? ` · ${r.tentos ?? 0} TENTOS` : ''}
            </p>
          ))}
        <div className="mt-4 flex gap-2">
          {onLeave && (
            <button type="button" className="btn-pixel flex-1" onClick={onLeave}>
              SAIR
            </button>
          )}
          {canRematch ? (
            <button type="button" data-tone="play" className="btn-pixel flex-[2]" onClick={onRematch}>
              REVANCHE
            </button>
          ) : (
            <p className="table-wait font-term flex-[2]">O anfitrião decide a revanche.</p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Versão 2.4: o fim de cada rodada da mesa de 2 a 4 (quem bateu ou como trancou, o que sobrou
 * na mão de cada um, o dano e os corações) e, no fim da partida, o pódio do 1º ao 4º.
 */
export default function TableResult({ view, me, ready = null, canRematch = true, onNextRound, onRematch, onLeave }) {
  const names = Object.fromEntries(view.seats.map((s) => [s.id, s.id === me ? 'Você' : s.name]));
  if (view.phase === 'matchOver') return <Podium view={view} me={me} names={names} onRematch={onRematch} onLeave={onLeave} canRematch={canRematch} />;
  const r = view.result;
  if (!r) return null;
  const mine = r.kind === 'batida' ? r.by === me : r.spared.includes(me) && Object.keys(r.damage).length > 0;
  const rows = seatsFrom(view.seats, me);
  const sub = subtitle({ ...r, by: r.by === me ? 'me' : r.by }, names);
  // online: você já tocou em PRÓXIMA RODADA? e quem falta (as pessoas vivas; bots não esperam)
  const sent = Boolean(ready?.includes(me));
  const waiting = ready ? view.seats.filter((s) => s.alive && !s.bot && s.id !== me && !ready.includes(s.id)) : [];
  return (
    <div className="overlay-backdrop animate-overlay-in fixed inset-0 z-50 flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-labelledby="table-round-title">
      <div className={`${mine ? 'chalkboard' : 'overlay-card'} round-card table-round w-full max-w-[360px] overflow-hidden px-4 py-5 text-center`}>
        <p className={`font-pixel text-[9px] ${mine ? 'chalk-dim' : 'text-bone-400'}`}>{`MESA DE ${view.seats.length} · RODADA ${view.round}`}</p>
        <h2 id="table-round-title" className={`mt-2 font-pixel text-[18px] leading-snug text-shadow-pixel ${mine ? 'chalk-text' : 'text-bone-100'}`}>
          {r.kind === 'batida' ? KIND_TITLE[r.batida] : 'TRANCA!'}
        </h2>
        <p className={`mt-1 font-term text-xl ${mine ? 'chalk-text' : 'text-bone-100'}`}>{sub}</p>
        {r.kind === 'tranca' && <p className="font-term text-base text-bone-300">{TRANCA_REASON[r.reason]}</p>}

        <ul className="table-res-list">
          {rows.map((s) => {
            const dmg = r.damage[s.id] ?? 0;
            const sum = r.sums[s.id];
            return (
              <li key={s.id} className={`table-res-row ${s.alive ? '' : 'is-out'} ${s.id === me ? 'is-me' : ''}`} style={{ '--seat': colorOf(view, s.id) }}>
                <span className="table-res-face">
                  <RivalAvatar rival={{ art: s.face ?? 'tioZe', name: s.name }} mood={dmg ? 'hurt' : r.by === s.id ? 'smug' : 'idle'} size={28} smoke={false} />
                </span>
                <span className="table-res-who">
                  <b className="font-pixel">{s.id === me ? 'VOCÊ' : plateName(s.name)}</b>
                  {sum != null ? <MiniTiles tiles={view.hands[s.id]} /> : <span className="table-res-none font-term">fora</span>}
                </span>
                <span className="table-res-pts font-pixel">{sum != null ? `${sum}` : ''}</span>
                <span className={`table-res-dmg font-pixel ${dmg ? 'is-hit' : ''}`}>{dmg ? `−${dmg}♥` : s.alive ? '—' : ''}</span>
                <span className="table-res-hearts">
                  {s.alive ? <HeartsBar current={s.hearts} max={view.maxHearts} size={7} label={`${names[s.id]}: ${s.hearts} corações`} /> : <span className="font-pixel table-res-place">{ordinal(s.place)}</span>}
                </span>
              </li>
            );
          })}
        </ul>

        <button type="button" data-tone="play" className="btn-pixel mt-4 w-full" onClick={onNextRound} disabled={sent}>
          {sent ? `ESPERANDO ${waiting.length ? waiting.map((s) => plateName(s.name)).join(', ') : 'A MESA'}` : 'PRÓXIMA RODADA'}
        </button>
        <p className="mt-2 font-term text-sm text-bone-400">{ready ? 'Começa quando todos tocarem (ou sozinha em 25 s).' : 'A mesa acaba quando sobrar um.'}</p>
      </div>
    </div>
  );
}
