/**
 * Versão 2.33: os emotes da roda. Cada um aparece por pouco tempo na cadeira de quem mandou (atrás
 * de quem senta do lado, do lado de quem senta lá na frente, em cima da sua vida) e some. Para não
 * poluir: só um por cadeira de cada vez (o novo troca o anterior), um intervalo mínimo entre dois
 * de quem manda, e os bots só reagem no fim da rodada, de vez em quando.
 */

export const EMOTES = Object.freeze([
  Object.freeze({ id: 'risada', label: 'Kkkk' }),
  Object.freeze({ id: 'joinha', label: 'Joinha' }),
  Object.freeze({ id: 'pensa', label: 'Hmm…' }),
  Object.freeze({ id: 'bravo', label: 'Bravo' }),
  Object.freeze({ id: 'choro', label: 'Chorando' }),
  Object.freeze({ id: 'fogo', label: 'Pegando fogo' }),
]);

export const EMOTE_IDS = Object.freeze(EMOTES.map((e) => e.id));

/** Quanto tempo o emote fica na tela (o CSS usa o mesmo) e o intervalo mínimo entre dois. */
export const EMOTE_MS = 2200;
export const EMOTE_COOLDOWN_MS = 2500;

export const isEmote = (id) => EMOTE_IDS.includes(id);

/** O emote novo de `seat` (troca o anterior dela). `feed`: { [cadeira]: { id, key } }. */
export function pushEmote(feed, seat, id, key) {
  if (!isEmote(id) || typeof seat !== 'string') return feed;
  return { ...feed, [seat]: { id, key } };
}

/** Já pode mandar outro? (`last`: quando mandou o anterior) */
export const emoteReady = (last, now) => last == null || now - last >= EMOTE_COOLDOWN_MS;

/**
 * Os bots reagem ao fim da rodada (no máximo dois, e nem sempre): quem venceu ri ou faz joinha,
 * quem tomou dano fica bravo ou chora. `result`: o resultado da rodada (tableEngine).
 */
export function botReactions(result, seats, random = Math.random) {
  if (!result) return [];
  const bots = new Set(seats.filter((s) => s.bot).map((s) => s.id));
  const out = [];
  for (const id of result.winners ?? []) if (bots.has(id) && random() < 0.5) out.push({ seat: id, emote: random() < 0.5 ? 'risada' : 'joinha' });
  for (const id of Object.keys(result.damage ?? {})) if (bots.has(id) && random() < 0.3) out.push({ seat: id, emote: random() < 0.5 ? 'bravo' : 'choro' });
  return out.slice(0, 2);
}
