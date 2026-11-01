/**
 * Versão 2.5: o quanto você está encurralado na mesa (0 a 3). Vale para o solo, o duelo 1×1 e a
 * roda de 2 a 4; quem chama diz quantos corações você tem e quantas pedras cada rival vivo
 * ainda segura na mão (as pedras dele você não vê, mas a contagem é pública).
 *
 *   3 · ENCURRALADO   um rival com 1 pedra e você com até 2 corações (uma batida pode te derrubar)
 *   2 · ÚLTIMA PEDRA  um rival com 1 pedra; ou com 2 pedras e você no último coração
 *   1 · PRESSÃO       um rival com 2 pedras; ou você no último coração
 *   0 · calmo
 *
 * O nível escolhe o ritmo do coração de fundo (HEARTBEAT_BPM, no audioSynth) e a força da
 * silhueta vermelha na borda da tela (DangerFx.jsx).
 */

/**
 * `rivals`: [{ id, name, count }] (só os vivos); `myHearts`: os seus corações agora.
 * Devolve { level, reason: 'last' | 'two' | 'heart' | null, who, name }.
 */
export function dangerOf({ myHearts, rivals }) {
  const holding = (rivals ?? []).filter((r) => r && r.count > 0);
  const closest = holding.reduce((best, r) => (!best || r.count < best.count ? r : best), null);
  const count = closest?.count ?? Infinity;
  const who = closest?.id ?? null;
  const name = closest?.name ?? null;
  if (count === 1) return { level: myHearts <= 2 ? 3 : 2, reason: 'last', who, name };
  if (count === 2) return { level: myHearts <= 1 ? 2 : 1, reason: 'two', who, name };
  if (myHearts <= 1) return { level: 1, reason: 'heart', who: null, name: null };
  return { level: 0, reason: null, who: null, name: null };
}

/** O aviso que entra quando o perigo sobe (nível 2 e 3): título grande e uma linha embaixo. */
export function dangerBanner(danger, myHearts) {
  if (!danger || danger.level < 2) return null;
  const who = danger.name ?? 'O rival';
  if (danger.reason === 'last') {
    if (danger.level >= 3) {
      return { title: 'ENCURRALADO!', line: myHearts <= 1 ? `Se ${who} bater, você cai.` : `Uma batida de bucha de ${who} te derruba.` };
    }
    return { title: 'ÚLTIMA PEDRA!', line: `${who} pode bater na próxima.` };
  }
  return { title: 'ÚLTIMO CORAÇÃO!', line: `${who} está com 2 pedras.` };
}
